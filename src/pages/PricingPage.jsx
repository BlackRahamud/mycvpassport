import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { supabase } from "../supabaseClient";
import { getPaymentLink } from "../utils/paywall";
import { logEvent } from "../lib/analytics/logEvent";
import safeFetch from "../lib/net/safeFetch";
import { getTheme } from "../lib/theme";
import PaymentTrustBar from "../components/PaymentTrustBar";
import CheckoutAuthSheet from "../components/CheckoutAuthSheet";
import RazorpayPayment from "../components/RazorpayPayment";
import PostPaymentOverlay from "../invoices/PostPaymentOverlay";
import {
  TIERS,
  TIER_TO_PROFILE_PLAN,
  UI_SLUG_TO_TIER,
  getDisplayPrice,
  getServerAmount,
} from "../config/tierConfig";

const EASE = [0.4, 0, 0.2, 1];

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ verticalAlign: "-2px" }}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

// Inline SVGs drawn for this page — no glyph fonts, no emoji.
function StarIcon({ size = 12, color = "#FBBF24" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M12 2l2.39 6.95H22l-6.18 4.49L18.18 22 12 17.27 5.82 22l2.36-8.56L2 8.95h7.61L12 2z" />
    </svg>
  );
}

function ChevronDownIcon({ size = 14, open = false }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{
        transform: open ? "rotate(180deg)" : "none",
        transition: "transform 200ms cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function ArrowRightIcon({ size = 14, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function CheckIcon({ size = 12, color = "var(--success)" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// UI short slug ('express') -> profiles.plan enum ('EXPRESS_PASS'). Derived
// from tierConfig so a new tier doesn't drift between display + storage.
const PLAN_MAP = Object.entries(UI_SLUG_TO_TIER).reduce((acc, [uiSlug, tierSlug]) => {
  acc[uiSlug] = TIER_TO_PROFILE_PLAN[tierSlug];
  return acc;
}, {});

function razorpayConfigFor(uiSlug) {
  const tierSlug = UI_SLUG_TO_TIER[uiSlug];
  if (!tierSlug) return null;
  const amount = getServerAmount(tierSlug, "INR");
  if (amount == null) return null;
  return { plan: tierSlug, amount };
}

export default function PricingPage({ refreshProfile } = {}) {
  const navigate = useNavigate();

  // Default to INR — the cheaper currency. If the server's geo resolve
  // (Vercel x-vercel-ip-country) identifies a GCC country, this flips
  // to AED. Default-AED was the source of multiple India users being
  // routed to Ziina at AED 45 instead of Razorpay at ₹349 when the
  // pre-payment geo lookup failed or was slow.
  const [currency, setCurrency] = useState("INR");
  const [userPlan, setUserPlan] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [authUser, setAuthUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [checkoutSheet, setCheckoutSheet] = useState({ open: false, planId: null, priceLabel: "" });
  const [checkoutError, setCheckoutError] = useState(null);
  const [allPlansOpen, setAllPlansOpen] = useState(false);
  const [razorpayCheckout, setRazorpayCheckout] = useState(null);
  // Captured at handleRazorpaySuccess time so PostPaymentOverlay can render
  // the plan's display name. razorpayCheckout itself is cleared before the
  // overlay mounts; this preserves the tier slug across that transition.
  const [lastPaidTier, setLastPaidTier] = useState(null);
  // Conversion-moment "we're working on it" overlay. Set the moment a CTA
  // is clicked; cleared by every terminal Razorpay outcome (modal open /
  // success / failure / dismiss) and by every Ziina path exit (redirect
  // requires no clear since the page is unloading; error clears + surfaces
  // the inline error). launchingRef is a hard re-entry guard for clicks
  // faster than React's render commit.
  const [paymentLaunching, setPaymentLaunching] = useState({
    active: false, planAction: null, kind: null,
  });
  const launchingRef = useRef(false);
  const clearLaunching = useCallback(() => {
    launchingRef.current = false;
    setPaymentLaunching({ active: false, planAction: null, kind: null });
  }, []);
  const planDisplayName = (planAction) => {
    const tierSlug = UI_SLUG_TO_TIER[planAction];
    return tierSlug ? TIERS[tierSlug]?.displayName : "your plan";
  };
  const reduce = useReducedMotion();

  // GA4: view_pricing_plan
  useEffect(() => {
    if (typeof window.gtag === "function") {
      window.gtag("event", "view_pricing_plan", {
        page_title: "Pricing",
      });
    }
  }, []);

  // pricing_viewed fires once per page load, AFTER the geo resolve settles
  // so the currency property reflects what the visitor was actually shown.
  // Anchors the monetization funnel: pricing_viewed → upgrade_clicked →
  // checkout_started → purchase_completed.
  const pricingViewedRef = useRef(false);
  const firePricingViewed = useCallback((resolvedCurrency) => {
    if (pricingViewedRef.current) return;
    pricingViewedRef.current = true;
    let source = "direct";
    try {
      if (document.referrer) {
        const ref = new URL(document.referrer);
        source = ref.origin === window.location.origin ? ref.pathname : ref.hostname;
      }
    } catch { /* keep "direct" */ }
    logEvent("pricing_viewed", {
      source,
      currency: resolvedCurrency,
      plans_shown: ["express_pass", "active_hunter", "career_pro"],
    });
  }, []);

  // Geo detection via Vercel's edge-injected country header. Same-origin
  // call, no third-party rate limit, far more reliable than ipapi.co.
  // On any failure we stay on INR (cheaper default).
  useEffect(() => {
    let cancelled = false;
    safeFetch("/api/razorpay?action=geo")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        if (d?.currency === "AED") setCurrency("AED");
        firePricingViewed(d?.currency === "AED" ? "AED" : "INR");
      })
      .catch(() => {
        /* stay on INR — cheaper default */
        if (!cancelled) firePricingViewed("INR");
      });
    return () => { cancelled = true; };
  }, [firePricingViewed]);

  // Auth state + current plan detection
  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      const u = data?.session?.user || null;
      setAuthUser(u);
      setAuthReady(true);
      if (u) {
        supabase.from("profiles").select("plan").eq("id", u.id).single()
          .then(({ data: p }) => { if (!cancelled && p) setUserPlan(p.plan); });
      }
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (cancelled) return;
      setAuthUser(session?.user || null);
    });
    return () => {
      cancelled = true;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  // Success screen
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") setShowSuccess(true);
  }, []);

  // Responsive
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  const plans = [
    {
      id: "explorer",
      name: "Explorer",
      badge: null,
      priceAED: 0,
      priceINR: 0,
      description: "Get started for free",
      cta: "Get Started Free",
      ctaAction: "free",
      features: [
        { text: "All templates (build free)", included: true },
        { text: "ATS Checker (basic)", included: true },
        { text: "1 free PDF download", included: true },
        { text: "3 AI rewrites / month", included: true },
        { text: "Cover Letter Generator", included: false },
        { text: "Job Match Keywords", included: false },
        { text: "CV Import", included: false },
        { text: "Premium templates", included: false },
        { text: "GhostChip ATS injection", included: false },
        { text: "Priority support", included: false },
      ],
    },
    {
      id: "express",
      // Consumer-facing rename — one clear one-time option. The canonical
      // tier slug / displayName ('Express Pass') is unchanged in tierConfig
      // so webhook routing, invoices and stored plan enums stay stable.
      name: "Single-CV Unlock",
      badge: null,
      priceAED: TIERS.express_pass.prices.AED,
      priceINR: TIERS.express_pass.prices.INR,
      description: "One-time — 3 premium PDF downloads",
      cta: "Unlock my CV",
      ctaAction: "express",
      features: [
        { text: "3 premium PDF downloads", included: true },
        { text: "ATS Checker (full)", included: true },
        { text: "Premium templates", included: true },
        { text: "Cover Letter Generator", included: true },
        { text: "Job Match Keywords", included: true },
        { text: "1 CV Import", included: true },
        { text: "30 AI rewrites / month", included: true },
        { text: "GhostChip ATS injection", included: true },
        { text: "Priority support", included: false },
      ],
    },
    {
      id: "hunter",
      name: TIERS.active_hunter.displayName,
      badge: "Most Popular",
      priceAED: TIERS.active_hunter.prices.AED,
      priceINR: TIERS.active_hunter.prices.INR,
      description: "30-day access pass",
      cta: "Get 30-day pass",
      ctaAction: "hunter",
      features: [
        { text: "Unlimited downloads (all CVs)", included: true },
        { text: "ATS Checker Pro (AI powered)", included: true },
        { text: "60 AI rewrites / month", included: true },
        { text: "All + premium templates", included: true },
        { text: "Cover Letter Generator", included: true },
        { text: "Job Match Keywords", included: true },
        { text: "3 CV Imports per week", included: true },
        { text: "GhostChip ATS injection", included: true },
        { text: "Priority support", included: true },
      ],
    },
    {
      id: "pro",
      name: TIERS.career_pro.displayName,
      badge: "Best Value",
      priceAED: TIERS.career_pro.prices.AED,
      priceINR: TIERS.career_pro.prices.INR,
      description: "1-year access pass",
      cta: "Get 1-year pass",
      ctaAction: "pro",
      features: [
        { text: "Everything unlimited", included: true },
        { text: "ATS Checker Pro (AI powered)", included: true },
        { text: "Unlimited AI rewrites", included: true },
        { text: "All + premium templates", included: true },
        { text: "Cover Letter Generator", included: true },
        { text: "Job Match Keywords", included: true },
        { text: "3 CV Imports per week", included: true },
        { text: "GhostChip ATS injection", included: true },
        { text: "Priority support", included: true },
      ],
    },
  ];

  const priceLabelFor = useCallback((plan) => {
    if (plan.id === "explorer") return "Free";
    const price = currency === "AED" ? plan.priceAED : plan.priceINR;
    return currency === "AED" ? `AED ${price}` : `₹${price}`;
  }, [currency]);

  const handleRazorpaySuccess = useCallback(() => {
    // Snapshot the tier slug before clearing razorpayCheckout — the overlay
    // needs it for the "Welcome to <plan>" line. Access is NOT granted here;
    // PostPaymentOverlay polls the invoices table until the webhook chain
    // has confirmed activation before exposing nav CTAs.
    setLastPaidTier((prev) => razorpayCheckout?.plan || prev);
    setRazorpayCheckout(null);
    clearLaunching();
    setShowSuccess(true);
    window.history.replaceState({}, "", "/pricing?payment=success");
  }, [razorpayCheckout, clearLaunching]);

  const handleRazorpayFailure = useCallback((msg) => {
    setRazorpayCheckout(null);
    clearLaunching();
    if (msg !== "Payment cancelled") {
      setCheckoutError(msg || "Couldn't complete payment. Please try again.");
    }
  }, [clearLaunching]);

  // Fires the instant Razorpay calls rzp.open() — the checkout iframe is
  // about to paint, so the launching overlay has done its job. The Razorpay
  // modal renders on top with its own backdrop.
  const handleRazorpayModalOpen = useCallback(() => {
    clearLaunching();
  }, [clearLaunching]);

  const firePayment = useCallback(async (planAction) => {
    // Hard re-entry guard — protects against a second click landing
    // before React commits the disabled-button render.
    if (launchingRef.current) return;
    launchingRef.current = true;
    setCheckoutError(null);

    if (currency === "INR") {
      const cfg = razorpayConfigFor(planAction);
      if (!cfg) { launchingRef.current = false; return; }
      setPaymentLaunching({ active: true, planAction, kind: "razorpay" });
      setRazorpayCheckout(cfg);
      // Overlay clears on onModalOpen / onSuccess / onFailure / dismiss.
      return;
    }
    const featureMap = { express: "expressPass", hunter: "activeHunter", pro: "careerPro" };
    const feature = featureMap[planAction];
    if (!feature) { launchingRef.current = false; return; }

    setPaymentLaunching({ active: true, planAction, kind: "ziina" });
    try {
      const url = await getPaymentLink(feature);
      if (url) {
        // Keep the overlay up until navigation fires.
        window.location.href = url;
        return;
      }
      clearLaunching();
      setCheckoutError("Couldn't start checkout — please try again.");
    } catch {
      clearLaunching();
      setCheckoutError("Couldn't start checkout — please try again.");
    }
  }, [currency, clearLaunching]);

  const handleCTA = async (plan) => {
    if (typeof window.gtag === "function") {
      window.gtag("event", "begin_checkout", {
        plan_name: plan.name,
      });
    }
    if (plan.ctaAction === "free") {
      navigate("/dashboard");
      return;
    }
    if (!authUser) {
      setCheckoutSheet({
        open: true,
        planId: plan.ctaAction,
        priceLabel: priceLabelFor(plan),
      });
      return;
    }
    await firePayment(plan.ctaAction);
  };

  // Resume checkout after OAuth return: /pricing?resume=<plan>
  useEffect(() => {
    if (!authReady || !authUser) return;
    const params = new URLSearchParams(window.location.search);
    const resume = params.get("resume");
    if (!resume) return;
    params.delete("resume");
    const qs = params.toString();
    window.history.replaceState({}, "", window.location.pathname + (qs ? `?${qs}` : ""));
    firePayment(resume);
  }, [authReady, authUser, firePayment]);

  const isCurrentPlan = (plan) => userPlan && userPlan === PLAN_MAP[plan.id];

  const pad = isMobile ? "20px 16px" : "32px 48px";
  const cardPad = isMobile ? "20px" : "28px";

  // ====== SUCCESS OVERLAY ======
  // PostPaymentOverlay polls the invoices table until the webhook chain
  // (applyPaidTier + recordPayment + issueDocument) has completed, then
  // surfaces the nav CTAs. CTAs are hidden during the activating window
  // so a buyer never clicks into a Free experience before the access flip
  // has landed. The lastPaidTier snapshot drives the "Welcome to X" line.
  if (showSuccess) {
    const planLabel = lastPaidTier ? TIERS[lastPaidTier]?.displayName : null;
    return (
      <PostPaymentOverlay
        gateway="razorpay"
        planLabel={planLabel}
        onActivated={() => { if (refreshProfile) refreshProfile(); }}
        onGoToDashboard={() => navigate("/dashboard")}
        onBuildCv={() => navigate("/builder")}
        isMobile={isMobile}
      />
    );
  }

  // ====== COMPARISON TABLE DATA ======
  const compRows = [
    { feature: "CV Templates", vals: ["All (build free)", "All", "All", "All"] },
    { feature: "ATS Checker", vals: ["Basic", "Full", "AI Powered", "AI Powered"] },
    { feature: "PDF Downloads", vals: ["1 download", "3 downloads", "Unlimited", "Unlimited"] },
    { feature: "AI rewrites", vals: ["3 / month", "30 / month", "60 / month", "Unlimited"] },
    { feature: "Cover Letter", vals: [false, true, true, true] },
    { feature: "Job Match Keywords", vals: [false, true, true, true] },
    { feature: "CV Import", vals: [false, "1 import", "3/week", "3/week"] },
    { feature: "GhostChip ATS", vals: [false, true, true, true] },
    { feature: "Priority Support", vals: [false, false, true, true] },
  ];

  const renderCell = (val) => {
    if (val === true) return <span style={{ color: "var(--success-text)", fontSize: "16px" }}>✓</span>;
    if (val === false) return <span style={{ color: "var(--text-muted)", fontSize: "16px" }}>×</span>;
    return <span style={{ color: "var(--text-secondary)", fontSize: "13px" }}>{val}</span>;
  };

  return (
    <>
      <Helmet>
        <title>CVPassport Pricing — CV Builder Plans for UAE, GCC &amp; India</title>
        <meta name="description" content="Plans from AED 19 or ₹149. ATS CV builder for UAE, GCC & India job seekers. Free to start — no credit card required." />
        <meta name="keywords" content="CV builder UAE, ATS CV Dubai, resume builder GCC, CV maker India, ATS optimised CV, job seeker Dubai, expat CV builder, CV templates UAE" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://www.mycvpassport.com/pricing" />
        <meta property="og:title" content="CVPassport Pricing — CV Builder Plans for UAE, GCC &amp; India" />
        <meta property="og:description" content="Plans from AED 19 or ₹149. ATS CV builder for UAE, GCC & India job seekers. Free to start — no credit card required." />
        <meta property="og:url" content="https://www.mycvpassport.com/pricing" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="en_AE" />
      </Helmet>
    <div data-theme={getTheme()} style={{
      minHeight: "100vh", backgroundColor: "var(--bg)",
      fontFamily: "Inter, -apple-system, system-ui, sans-serif",
      color: "var(--text-primary)",
    }}>

      {/* PAGE HEADER */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: isMobile ? "16px" : "20px 48px",
        borderBottom: "1px solid var(--border)",
      }}>
        <div
          style={{ fontSize: "18px", fontWeight: "700", cursor: "pointer" }}
          onClick={() => navigate("/")}
        >
          CVPassport
        </div>
        <div
          style={{ fontSize: "13px", color: "var(--text-secondary)", cursor: "pointer" }}
          onClick={() => navigate("/dashboard")}
        >
          ← Back to Dashboard
        </div>
      </div>

      <div style={{ padding: pad, maxWidth: "1280px", margin: "0 auto" }}>

        {/* TITLE */}
        <div style={{ textAlign: "center", marginBottom: isMobile ? "28px" : "40px" }}>
          <h1 style={{
            fontSize: isMobile ? "24px" : "32px", fontWeight: "700",
            color: "var(--text-primary)", margin: "0 0 10px",
          }}>
            Simple, Transparent Pricing
          </h1>
          <p style={{ fontSize: isMobile ? "14px" : "16px", color: "var(--text-secondary)", margin: 0 }}>
            Built for UAE and India job seekers. No surprises.
          </p>
        </div>

        {/* CHECKOUT ERROR BANNER */}
        {checkoutError ? (
          <div
            role="alert"
            style={{
              maxWidth: 520,
              margin: "0 auto 24px",
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.3)",
              borderRadius: 12,
              padding: "12px 16px",
              fontSize: 13,
              color: "var(--danger)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              lineHeight: 1.5,
            }}
          >
            <span>{checkoutError}</span>
            <button
              type="button"
              onClick={() => setCheckoutError(null)}
              aria-label="Dismiss"
              style={{
                background: "none",
                border: "none",
                color: "var(--danger)",
                fontSize: 16,
                lineHeight: 1,
                cursor: "pointer",
                padding: "0 4px",
              }}
            >
              ×
            </button>
          </div>
        ) : null}

        {/* HERO — two-card anchor: Free (subdued) + Active Hunter (dominant) */}
        <motion.div
          initial={reduce ? false : "hidden"}
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12 } } }}
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1.05fr",
            gap: isMobile ? 16 : 20,
            marginBottom: 32,
            alignItems: "stretch",
          }}
        >
          {/* FREE — anchors the price */}
          {(() => {
            const explorerPlan = plans.find((p) => p.id === "explorer");
            const isCurrent = !!explorerPlan && isCurrentPlan(explorerPlan);
            return (
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 8 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE } },
                }}
                style={{
                  backgroundColor: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 16,
                  padding: isMobile ? "24px 20px" : "28px 24px",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginBottom: 14,
                  }}
                >
                  Start free
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
                  <span style={{ fontSize: 36, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1, letterSpacing: "-0.02em" }}>
                    {currency === "AED" ? "AED 0" : "₹0"}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 24 }}>
                  No card. No catch.
                </div>
                <div style={{ flex: 1, marginBottom: 24, display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    "Every template — build for free",
                    "1 free PDF download",
                    "Basic ATS score + 3 AI rewrites / month",
                  ].map((line) => (
                    <div
                      key={line}
                      style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "var(--text-primary)" }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 14, flexShrink: 0 }}>
                        <CheckIcon size={12} color="var(--success)" />
                      </span>
                      {line}
                    </div>
                  ))}
                </div>
                {isCurrent ? (
                  <button
                    disabled
                    style={{
                      width: "100%", height: 44, borderRadius: 12,
                      backgroundColor: "transparent", color: "var(--text-secondary)",
                      border: "1px solid var(--border)", fontSize: 14,
                      fontWeight: 600, cursor: "not-allowed",
                      fontFamily: "inherit",
                    }}
                  >
                    Current Plan
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={paymentLaunching.active}
                    onClick={() => explorerPlan && handleCTA(explorerPlan)}
                    style={{
                      width: "100%", height: 44, borderRadius: 12,
                      backgroundColor: "transparent", color: "var(--text-primary)",
                      border: "1px solid var(--border-strong)",
                      fontSize: 14, fontWeight: 600, cursor: "pointer",
                      fontFamily: "inherit",
                      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
                      transition: "border-color 160ms cubic-bezier(0.4,0,0.2,1), background-color 160ms cubic-bezier(0.4,0,0.2,1)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--text-primary)";
                      e.currentTarget.style.backgroundColor = "var(--hover-wash)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--border-strong)";
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <span>Build your first CV</span>
                    <ArrowRightIcon size={14} color="var(--text-primary)" />
                  </button>
                )}
              </motion.div>
            );
          })()}

          {/* ACTIVE HUNTER — dominant, the inevitable choice */}
          {(() => {
            const hunterPlan = plans.find((p) => p.id === "hunter");
            const isCurrent = !!hunterPlan && isCurrentPlan(hunterPlan);
            const hunterPrice = getDisplayPrice("active_hunter", currency);
            return (
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 8 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.36, ease: EASE } },
                }}
                style={{
                  position: "relative",
                  background: "var(--bg-elevated)",
                  border: "1px solid rgba(217,119,6,0.32)",
                  borderRadius: 18,
                  padding: isMobile ? "26px 20px 24px" : "32px 28px 28px",
                  display: "flex",
                  flexDirection: "column",
                  // Faint amber glow edge + grounded drop + wide outward amber
                  // spill — same depth language as the AtsGapsActionCard so the
                  // two surfaces feel related. Amber alphas read on both themes.
                  boxShadow: [
                    "0 0 0 1px rgba(217,119,6,0.08)",
                    "0 24px 56px -14px rgba(20,19,16,0.28)",
                    "0 0 80px -28px rgba(217,119,6,0.30)",
                  ].join(", "),
                }}
              >
                <div style={{ marginBottom: 14 }}>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 10,
                      fontWeight: 700,
                      color: "var(--accent-text)",
                      padding: "4px 10px",
                      borderRadius: 9999,
                      border: "1px solid rgba(217,119,6,0.32)",
                      background: "rgba(217,119,6,0.08)",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    Most chosen · Gulf job seekers
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.005em" }}>
                    {currency === "AED" ? "AED " : "₹"}
                  </span>
                  <span style={{ fontSize: 44, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
                    {hunterPrice}
                  </span>
                  <span style={{ fontSize: 14, color: "var(--text-secondary)", marginLeft: 6 }}>· 30-day pass</span>
                </div>

                <div style={{ fontSize: 13, color: "var(--accent-text)", marginBottom: 24, fontWeight: 500 }}>
                  Less than a coffee. More than a recruiter.
                </div>

                <div style={{ flex: 1, marginBottom: 28, display: "flex", flexDirection: "column", gap: 12 }}>
                  {[
                    "Unlimited downloads, every CV",
                    "AI-powered ATS scoring",
                    "60 AI rewrites a month",
                    "3 CV imports a week",
                    "Cover letter + Job Match, priority support",
                  ].map((line) => (
                    <div
                      key={line}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        fontSize: 14,
                        color: "var(--text-primary)",
                        lineHeight: 1.45,
                      }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 16, height: 20, flexShrink: 0 }}>
                        <CheckIcon size={13} color="var(--success)" />
                      </span>
                      <span>{line}</span>
                    </div>
                  ))}
                </div>

                {isCurrent ? (
                  <button
                    disabled
                    style={{
                      width: "100%", height: 48, borderRadius: 9999,
                      backgroundColor: "transparent", color: "var(--text-secondary)",
                      border: "1px solid var(--border)", fontSize: 14,
                      fontWeight: 600, cursor: "not-allowed",
                      fontFamily: "inherit",
                    }}
                  >
                    Current Plan
                  </button>
                ) : (
                  <motion.button
                    type="button"
                    disabled={paymentLaunching.active}
                    onClick={() => hunterPlan && handleCTA(hunterPlan)}
                    initial={reduce ? false : { boxShadow: "0 0 0 1px rgba(217,119,6,0.45), 0 0 18px rgba(217,119,6,0.30)" }}
                    animate={reduce ? undefined : {
                      boxShadow: [
                        "0 0 0 1px rgba(217,119,6,0.45), 0 0 18px rgba(217,119,6,0.30), 0 0 48px -8px rgba(217,119,6,0.40), 0 6px 18px rgba(217,119,6,0.24)",
                        "0 0 0 1px rgba(217,119,6,0.55), 0 0 32px rgba(217,119,6,0.55), 0 0 72px -8px rgba(217,119,6,0.65), 0 6px 22px rgba(217,119,6,0.34)",
                        "0 0 0 1px rgba(217,119,6,0.45), 0 0 18px rgba(217,119,6,0.30), 0 0 48px -8px rgba(217,119,6,0.40), 0 6px 18px rgba(217,119,6,0.24)",
                      ],
                    }}
                    transition={reduce ? undefined : { duration: 1.6, times: [0, 0.5, 1], delay: 0.5, ease: EASE }}
                    style={{
                      width: "100%", height: 48, borderRadius: 9999,
                      background: "linear-gradient(180deg, #E08810 0%, #B25E03 100%)",
                      /* Fixed white on the amber gradient — label sits on the
                         fill, not the page, so it must NOT flip with theme. */
                      color: "#FFFFFF", border: "none", // theme-fixed
                      fontSize: 15, fontWeight: 700, cursor: "pointer",
                      fontFamily: "inherit",
                      letterSpacing: "-0.005em",
                      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
                      transition: "filter 160ms cubic-bezier(0.4,0,0.2,1), transform 160ms cubic-bezier(0.4,0,0.2,1)",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(1.05)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.filter = "none"; }}
                    onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.985)"; }}
                    onMouseUp={(e) => { e.currentTarget.style.transform = "none"; }}
                  >
                    <span>Start your hunt</span>
                    <ArrowRightIcon size={14} color={"#FFFFFF" /* theme-fixed */} />
                  </motion.button>
                )}

                <div style={{ fontSize: 12, color: "var(--text-secondary)", textAlign: "center", marginTop: 12 }}>
                  One-time payment · access for 30 days
                </div>
              </motion.div>
            );
          })()}
        </motion.div>

        {/* SOCIAL PROOF — directly under the cards, the decision moment */}
        <div style={{ textAlign: "center", marginBottom: isMobile ? 32 : 44, padding: "0 16px" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              fontSize: 13,
              color: "var(--text-secondary)",
              marginBottom: 8,
              flexWrap: "wrap",
              justifyContent: "center",
            }}
          >
            <span style={{ display: "inline-flex", gap: 2 }}>
              {[0, 1, 2, 3, 4].map((i) => (
                <StarIcon key={i} size={13} color="#FBBF24" />
              ))}
            </span>
            <span>2,400+ job seekers across UAE and India</span>
          </div>
          <div style={{ fontSize: 13, color: "#666", maxWidth: 560, margin: "0 auto", lineHeight: 1.55 }}>
            Built for the Gulf hiring market — ATS-engineered for systems Dubai recruiters use.
          </div>
        </div>

        {/* DISCLOSURE — Express Pass + Career Pro + comparison table */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ textAlign: "center" }}>
            <button
              type="button"
              onClick={() => setAllPlansOpen((v) => !v)}
              aria-expanded={allPlansOpen}
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                borderRadius: 9999,
                padding: "10px 18px",
                color: "var(--text-primary)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                transition: "color 160ms cubic-bezier(0.4,0,0.2,1), border-color 160ms cubic-bezier(0.4,0,0.2,1)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.borderColor = "var(--text-secondary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-primary)"; e.currentTarget.style.borderColor = "var(--border)"; }}
            >
              <span>
                {allPlansOpen
                  ? "Hide other passes"
                  : "See all passes — single-CV unlock and 1-year pass"}
              </span>
              <ChevronDownIcon size={14} open={allPlansOpen} />
            </button>
          </div>

          <AnimatePresence initial={false}>
            {allPlansOpen && (
              <motion.div
                key="all-plans-disclosure"
                initial={reduce ? { opacity: 1, height: "auto" } : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={reduce ? { opacity: 0, height: 0 } : { opacity: 0, height: 0 }}
                transition={reduce ? { duration: 0 } : { duration: 0.32, ease: EASE }}
                style={{ overflow: "hidden" }}
              >
                <div style={{ paddingTop: 28 }}>
                  {/* Express Pass + Career Pro — preserve existing card markup */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
                      gap: 20,
                      marginBottom: 36,
                    }}
                  >
                    {plans
                      .filter((p) => p.id === "express" || p.id === "pro")
                      .map((plan) => {
                        const isCurrent = isCurrentPlan(plan);
                        const price = currency === "AED" ? plan.priceAED : plan.priceINR;
                        const priceLarge = String(price);
                        // Pass duration drives the suffix — Express Pass is
                        // permanent (single-CV unlock); Career Pro is the
                        // 1-year pass.
                        const priceSuffix = plan.id === "pro" ? "· 1-year pass" : "· one-time";
                        return (
                          <div
                            key={plan.id}
                            style={{
                              backgroundColor: "var(--bg-surface)",
                              border: "1px solid var(--border)",
                              borderRadius: 16,
                              padding: cardPad,
                              display: "flex",
                              flexDirection: "column",
                              position: "relative",
                            }}
                          >
                            {plan.badge ? (
                              <div style={{ marginBottom: 12 }}>
                                <span
                                  style={{
                                    border: "1px solid var(--text-primary)",
                                    color: "var(--text-primary)",
                                    fontSize: 10,
                                    fontWeight: 700,
                                    padding: "3px 10px",
                                    borderRadius: 100,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                  }}
                                >
                                  {plan.badge}
                                </span>
                              </div>
                            ) : (
                              <div style={{ height: 26 }} />
                            )}
                            <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 16 }}>
                              {plan.name}
                            </div>
                            <div style={{ marginBottom: 6, display: "flex", alignItems: "baseline", gap: 2 }}>
                              <span style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)" }}>
                                {currency === "AED" ? "AED " : "₹"}
                              </span>
                              <span style={{ fontSize: 40, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>
                                {priceLarge}
                              </span>
                              <span style={{ fontSize: 13, color: "var(--text-secondary)", marginLeft: 6 }}>{priceSuffix}</span>
                            </div>
                            <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 24 }}>
                              {plan.description}
                            </div>
                            <div style={{ flex: 1, marginBottom: 28 }}>
                              {plan.features.map((f, i) => (
                                <div
                                  key={i}
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 10,
                                    marginBottom: 10,
                                    fontSize: 13,
                                    color: f.included ? "var(--text-primary)" : "var(--text-muted)",
                                  }}
                                >
                                  <span
                                    style={{
                                      color: f.included ? "var(--success-text)" : "var(--text-muted)",
                                      fontWeight: 700,
                                      fontSize: 14,
                                      flexShrink: 0,
                                    }}
                                  >
                                    {f.included ? "✓" : "×"}
                                  </span>
                                  {f.text}
                                </div>
                              ))}
                            </div>
                            {isCurrent ? (
                              <button
                                disabled
                                style={{
                                  width: "100%",
                                  height: 44,
                                  borderRadius: 12,
                                  backgroundColor: "transparent",
                                  color: "var(--text-secondary)",
                                  border: "1px solid var(--border)",
                                  fontSize: 14,
                                  fontWeight: 600,
                                  cursor: "not-allowed",
                                  fontFamily: "inherit",
                                }}
                              >
                                Current Plan
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={paymentLaunching.active}
                                onClick={() => handleCTA(plan)}
                                style={{
                                  width: "100%",
                                  height: 44,
                                  borderRadius: 12,
                                  backgroundColor: "var(--text-primary)",
                                  color: "var(--bg)",
                                  border: "none",
                                  fontSize: 14,
                                  fontWeight: 600,
                                  cursor: "pointer",
                                  fontFamily: "inherit",
                                }}
                              >
                                {plan.cta}
                              </button>
                            )}
                          </div>
                        );
                      })}
                  </div>

                  {/* Comparison table — desktop only, preserved verbatim */}
                  {!isMobile && (
                    <div style={{ marginBottom: 0 }}>
                      <table
                        style={{
                          width: "100%",
                          borderCollapse: "collapse",
                          backgroundColor: "var(--bg-surface)",
                          border: "1px solid var(--border)",
                          borderRadius: 12,
                          overflow: "hidden",
                        }}
                      >
                        <thead>
                          <tr>
                            <th
                              style={{
                                textAlign: "left",
                                padding: "16px 20px",
                                fontSize: 13,
                                fontWeight: 600,
                                color: "var(--text-secondary)",
                                borderBottom: "1px solid var(--border)",
                              }}
                            >
                              Feature
                            </th>
                            {["Explorer", "Single-CV Unlock", "Active Hunter", "Career Pro"].map((col, i) => (
                              <th
                                key={col}
                                style={{
                                  padding: "16px 20px",
                                  fontSize: 13,
                                  fontWeight: 600,
                                  color: i === 2 ? "#D97706" : "var(--text-primary)",
                                  backgroundColor: i === 2 ? "rgba(217,119,6,0.1)" : "transparent",
                                  borderBottom: "1px solid var(--border)",
                                  textAlign: "center",
                                }}
                              >
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {compRows.map((row, ri) => (
                            <tr key={row.feature} style={{ backgroundColor: ri % 2 === 0 ? "var(--bg-surface)" : "var(--bg-elevated)" }}>
                              <td
                                style={{
                                  padding: "14px 20px",
                                  fontSize: 13,
                                  color: "var(--text-primary)",
                                  borderBottom: "1px solid var(--border)",
                                }}
                              >
                                {row.feature}
                              </td>
                              {row.vals.map((val, vi) => (
                                <td
                                  key={vi}
                                  style={{
                                    padding: "14px 20px",
                                    textAlign: "center",
                                    borderBottom: "1px solid var(--border)",
                                    backgroundColor: vi === 2 ? "rgba(217,119,6,0.05)" : "transparent",
                                  }}
                                >
                                  {renderCell(val)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* TRUST SIGNALS */}
        <div style={{
          borderTop: "1px solid var(--border)",
          borderBottom: "1px solid var(--border)",
          padding: isMobile ? "24px 0" : "32px 0",
          marginBottom: "40px",
        }}>
          <div style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "center",
            alignItems: "center",
            gap: isMobile ? "16px" : "48px",
            marginBottom: "20px",
          }}>
            <span style={{ fontSize: "13px", color: "var(--text-secondary)", textAlign: "center", display: "inline-flex", alignItems: "center", gap: 6 }}>
              Secured by {currency === "INR" ? "Razorpay" : "Ziina"} <LockIcon />
            </span>
            <span style={{ fontSize: "13px", color: "var(--text-secondary)", textAlign: "center" }}>
              One-time payment ✓
            </span>
            <span style={{ fontSize: "13px", color: "var(--text-secondary)", textAlign: "center" }}>
              No Hidden Fees ✓
            </span>
          </div>
          <PaymentTrustBar style={{ marginTop: 20, marginBottom: 0 }} />
        </div>

      </div>
    </div>

    <CheckoutAuthSheet
      open={checkoutSheet.open}
      onClose={() => setCheckoutSheet((s) => ({ ...s, open: false }))}
      planId={checkoutSheet.planId}
      priceLabel={checkoutSheet.priceLabel}
      isMobile={isMobile}
      currency={currency}
      onRazorpayCheckout={(planAction) => {
        setCheckoutSheet((s) => ({ ...s, open: false }));
        firePayment(planAction);
      }}
    />

    {razorpayCheckout ? (
      <RazorpayPayment
        plan={razorpayCheckout.plan}
        amountINR={razorpayCheckout.amount}
        onSuccess={handleRazorpaySuccess}
        onFailure={handleRazorpayFailure}
        onModalOpen={handleRazorpayModalOpen}
      />
    ) : null}

    {paymentLaunching.active ? (
      <LaunchingOverlay
        message={paymentLaunching.kind === "ziina"
          ? "Redirecting to secure checkout…"
          : `Setting up your ${planDisplayName(paymentLaunching.planAction)} checkout…`}
      />
    ) : null}
    </>
  );
}

// Conversion-moment processing indicator. Reuses the conic-gradient ring
// pattern from OLEDScoreRing — same @property + spin keyframes, amber
// token (#D97706, the accent in CLAUDE.md), OLED-dark surface. Smaller
// than the score ring (88px vs 220px) because this is a transient
// "we're working" beat, not a reveal.
function LaunchingOverlay({ message }) {
  return (
    <>
      <style>{`
        @property --cvp-launching-angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
        @keyframes cvp-launching-spin { to { --cvp-launching-angle: 360deg; } }
      `}</style>
      <div
        role="alert"
        aria-live="polite"
        style={{
          position: "fixed", inset: 0, zIndex: 9998,
          background: "rgba(10,10,10,0.92)",
          backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 24,
          fontFamily: "'Inter', -apple-system, system-ui, sans-serif",
        }}
      >
        <div style={{ position: "relative", width: 88, height: 88 }}>
          <div aria-hidden="true" style={{
            position: "absolute", inset: 0, borderRadius: "50%", padding: 2,
            background: "conic-gradient(from var(--cvp-launching-angle, 0deg), transparent 60%, #D97706 80%, transparent 100%)",
            WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
            pointerEvents: "none",
            animation: "cvp-launching-spin 2.4s linear infinite",
          }} />
          <div style={{
            position: "absolute", inset: 2, borderRadius: "50%",
            background: "var(--bg)",
          }} />
        </div>
        <div style={{
          fontSize: 15, color: "var(--text-primary)", fontWeight: 500, textAlign: "center",
          maxWidth: 320, padding: "0 24px", letterSpacing: "-0.005em",
          lineHeight: 1.5,
        }}>{message}</div>
      </div>
    </>
  );
}
