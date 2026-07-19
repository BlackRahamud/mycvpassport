import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, useReducedMotion } from "framer-motion";
import { supabase } from "../supabaseClient";
import { getPaymentLink } from "../utils/paywall";
import { logEvent } from "../lib/analytics/logEvent";
import safeFetch from "../lib/net/safeFetch";
import { getTheme, setTheme } from "../lib/theme";
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
import { PLAN_META, PLAN_ORDER } from "../config/planPreview";

const EASE = [0.4, 0, 0.2, 1];

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ verticalAlign: "-2px" }}>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
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

function SunIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

const THEME_TOGGLE_STYLE = {
  width: 36, height: 36, borderRadius: 10,
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  background: "transparent", border: "1px solid var(--border)",
  color: "var(--text-secondary)", cursor: "pointer",
  transition: "border-color 160ms cubic-bezier(0.4,0,0.2,1), color 160ms cubic-bezier(0.4,0,0.2,1)",
};

// ── CTA system — every button on the amber ladder, never black. One accent
// per view: the hero owns the gradient; the rest step down in weight.
const CTA_BASE = {
  width: "100%", height: 46, borderRadius: 12, fontSize: 14, fontWeight: 700,
  cursor: "pointer", fontFamily: "inherit",
  display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
  transition: "filter 150ms cubic-bezier(0.4,0,0.2,1), background-color 150ms cubic-bezier(0.4,0,0.2,1)",
};
const ANCHOR_CTA = { ...CTA_BASE, background: "rgba(217,119,6,0.14)", color: "var(--accent-text)", border: "1px solid rgba(217,119,6,0.42)" };
const ENTRY_CTA = { ...CTA_BASE, background: "transparent", color: "var(--accent-text)", border: "1px solid rgba(217,119,6,0.55)" };
const FLOOR_CTA = { ...CTA_BASE, background: "transparent", color: "var(--text-primary)", border: "1px solid var(--border-strong)", fontWeight: 600 };
const CURRENT_PLAN_BTN = { ...CTA_BASE, background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border)", cursor: "not-allowed", fontWeight: 600 };
const HERO_BADGE = {
  display: "inline-flex", alignItems: "center", gap: 6, fontSize: 10, fontWeight: 700,
  color: "var(--accent-text)", padding: "4px 10px", borderRadius: 9999,
  border: "1px solid rgba(217,119,6,0.42)", background: "rgba(217,119,6,0.10)",
  letterSpacing: "0.06em", textTransform: "uppercase",
};
const ANCHOR_BADGE = {
  display: "inline-flex", alignItems: "center", fontSize: 10, fontWeight: 700,
  color: "var(--text-secondary)", padding: "4px 10px", borderRadius: 9999,
  border: "1px solid var(--border-strong)", background: "transparent",
  letterSpacing: "0.06em", textTransform: "uppercase",
};

// Hero CTA — resting amber glow, hover brightens + deepens the glow, press
// scales to 0.98. Reduced motion collapses to a plain solid amber fill with a
// focus ring: no gradient, no glow, no scale.
function HeroCTA({ reduce, disabled, onClick, label }) {
  const REST = "0 0 0 1px rgba(217,119,6,0.45), 0 0 18px rgba(217,119,6,0.30), 0 6px 18px rgba(217,119,6,0.24)";
  const LIFT = "0 0 0 1px rgba(217,119,6,0.55), 0 0 32px rgba(217,119,6,0.55), 0 8px 22px rgba(217,119,6,0.34)";
  if (reduce) {
    return (
      <button
        type="button" disabled={disabled} onClick={onClick}
        style={{
          width: "100%", height: 48, borderRadius: 9999,
          background: "#B25E03", color: "#FFFFFF", border: "none",
          fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
          display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}
      >
        <span>{label}</span>
        <ArrowRightIcon size={14} color="#FFFFFF" />
      </button>
    );
  }
  return (
    <button
      type="button" disabled={disabled} onClick={onClick}
      style={{
        width: "100%", height: 48, borderRadius: 9999,
        background: "linear-gradient(180deg, #E08810 0%, #B25E03 100%)",
        color: "#FFFFFF", border: "none",
        fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
        letterSpacing: "-0.005em",
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
        boxShadow: REST,
        transition: "filter 160ms cubic-bezier(0.4,0,0.2,1), transform 100ms cubic-bezier(0.4,0,0.2,1), box-shadow 160ms cubic-bezier(0.4,0,0.2,1)",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(1.06)"; e.currentTarget.style.boxShadow = LIFT; }}
      onMouseLeave={(e) => { e.currentTarget.style.filter = "none"; e.currentTarget.style.boxShadow = REST; }}
      onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.98)"; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = "none"; }}
    >
      <span>{label}</span>
      <ArrowRightIcon size={14} color="#FFFFFF" />
    </button>
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
  const [razorpayCheckout, setRazorpayCheckout] = useState(null);
  // Theme is REACTIVE — the page follows the global <html data-theme> and
  // re-renders on toggle. The old snapshot (data-theme={getTheme()} read once)
  // pinned a stale theme onto the page root, so a card could render its dark
  // surface while price text used a light-surface token — the invisible-price
  // bug. Observing the attribute keeps every token resolving against the card
  // it actually sits on, day and night.
  const [theme, setThemeState] = useState(() => getTheme());
  const toggleTheme = useCallback(() => {
    setThemeState((t) => setTheme(t === "dark" ? "light" : "dark"));
  }, []);
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

  // Keep local theme in lock-step with the global <html data-theme> so a
  // toggle anywhere (this page's switch, or the shared one on other pages)
  // re-resolves every token here.
  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const el = document.documentElement;
    const sync = () => setThemeState(getTheme());
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(el, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
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
    <div data-theme={theme} style={{
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
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 16 }}>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            style={THEME_TOGGLE_STYLE}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border-strong)"; e.currentTarget.style.color = "var(--text-primary)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-secondary)"; }}
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
          <button
            type="button"
            style={{ fontSize: "13px", color: "var(--text-secondary)", cursor: "pointer", background: "none", border: "none", fontFamily: "inherit" }}
            onClick={() => navigate("/dashboard")}
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>

      <div style={{ padding: pad, maxWidth: "1280px", margin: "0 auto" }}>

        {/* TITLE */}
        <div style={{ textAlign: "center", marginBottom: isMobile ? "24px" : "36px" }}>
          <h1 style={{
            fontSize: isMobile ? "26px" : "36px", fontWeight: "700",
            color: "var(--text-primary)", margin: "0 0 12px", letterSpacing: "-0.02em",
          }}>
            Simple, transparent pricing
          </h1>
          <p style={{ fontSize: isMobile ? "14px" : "16px", color: "var(--text-secondary)", margin: "0 auto", maxWidth: 640, lineHeight: 1.55 }}>
            Built for the Gulf hiring market, ATS engineered for the systems Dubai recruiters use.
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

        {/* FOUR RANKED PLANS — all visible, ranked by surface + CTA weight,
            never four equal. Desktop L→R Explorer, Single-CV Unlock, Active
            Hunter (hero), Career Pro (anchor); mobile stacks hero first. */}
        {(() => {
          const currencyPrefix = currency === "AED" ? "AED " : "₹";
          const priceOf = (slug) => getDisplayPrice(slug, currency);
          const CARDS = {
            explorer: {
              role: "floor", id: "explorer", name: PLAN_META.explorer.name,
              price: "Free", suffix: PLAN_META.explorer.period, tagline: PLAN_META.explorer.tagline,
              highlights: [
                "Every template, build for free",
                "1 free PDF download",
                "Basic ATS score, 3 AI rewrites a month",
              ],
              cta: "Build your first CV",
            },
            express: {
              role: "entry", id: "express", name: PLAN_META.express_pass.name,
              price: `${currencyPrefix}${priceOf("express_pass")}`, suffix: PLAN_META.express_pass.period,
              tagline: PLAN_META.express_pass.tagline,
              highlights: [
                "3 premium PDF downloads",
                "Full ATS Checker",
                "Premium templates and cover letter",
                "Job Match keywords",
                "1 CV import, 30 AI rewrites a month",
              ],
              cta: "Unlock my CV",
            },
            hunter: {
              role: "hero", id: "hunter", name: PLAN_META.active_hunter.name,
              price: `${currencyPrefix}${priceOf("active_hunter")}`, suffix: PLAN_META.active_hunter.period,
              tagline: PLAN_META.active_hunter.tagline,
              badge: "Most chosen, Gulf job seekers",
              highlights: [
                "Unlimited downloads, every CV",
                "AI powered ATS scoring",
                "60 AI rewrites a month",
                "3 CV imports a week",
                "Cover letter, Job Match, priority support",
              ],
              cta: "Start your hunt",
              footnote: "One time payment, access for 30 days",
            },
            pro: {
              role: "anchor", id: "pro", name: PLAN_META.career_pro.name,
              price: `${currencyPrefix}${priceOf("career_pro")}`, suffix: PLAN_META.career_pro.period,
              tagline: PLAN_META.career_pro.tagline,
              badge: "Best value",
              highlights: [
                "Everything unlimited for a year",
                "Unlimited AI rewrites",
                "AI powered ATS scoring",
                "All premium templates",
                "Priority support",
              ],
              cta: "Get the 1 year pass",
            },
          };
          const order = isMobile
            ? [CARDS.hunter, CARDS.pro, CARDS.express, CARDS.explorer]
            : [CARDS.explorer, CARDS.express, CARDS.hunter, CARDS.pro];
          return (
            <motion.div
              initial={reduce ? false : "hidden"}
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1.16fr 1.06fr",
                gap: isMobile ? 14 : 18,
                alignItems: "stretch",
                marginBottom: isMobile ? 40 : 52,
              }}
            >
              {order.map((c) => {
                const planForCta = plans.find((p) => p.id === c.id);
                const current = !!planForCta && isCurrentPlan(planForCta);
                const isHero = c.role === "hero";
                const isAnchor = c.role === "anchor";
                return (
                  <motion.div
                    key={c.id}
                    variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.34, ease: EASE } } }}
                    style={{
                      position: "relative",
                      background: isHero ? "var(--bg-elevated)" : "var(--bg-surface)",
                      border: isHero ? "1px solid rgba(217,119,6,0.42)" : "1px solid var(--border)",
                      borderRadius: isHero ? 18 : 16,
                      padding: isMobile ? "24px 20px" : (isHero ? "30px 26px 26px" : "26px 22px"),
                      display: "flex",
                      flexDirection: "column",
                      transform: (!isMobile && isHero) ? "translateY(-8px)" : "none",
                      boxShadow: isHero
                        ? "0 0 0 1px rgba(217,119,6,0.10), 0 24px 56px -14px rgba(20,19,16,0.28), 0 0 80px -30px rgba(217,119,6,0.34)"
                        : (isAnchor ? "0 12px 32px -18px rgba(20,19,16,0.22)" : "none"),
                      transition: "transform 150ms cubic-bezier(0.4,0,0.2,1), box-shadow 150ms cubic-bezier(0.4,0,0.2,1)",
                    }}
                    onMouseEnter={(e) => { if (!isMobile) e.currentTarget.style.transform = isHero ? "translateY(-12px)" : "translateY(-4px)"; }}
                    onMouseLeave={(e) => { if (!isMobile) e.currentTarget.style.transform = isHero ? "translateY(-8px)" : "none"; }}
                  >
                    {c.badge ? (
                      <div style={{ marginBottom: 14 }}>
                        <span style={isHero ? HERO_BADGE : ANCHOR_BADGE}>{c.badge}</span>
                      </div>
                    ) : (
                      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>
                        {c.role === "floor" ? "Start free" : "One off"}
                      </div>
                    )}
                    <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>{c.name}</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: isHero ? 42 : 34, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
                        {c.price}
                      </span>
                      {c.suffix ? <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>· {c.suffix}</span> : null}
                    </div>
                    <div style={{ fontSize: 13, color: isHero ? "var(--accent-text)" : "var(--text-secondary)", fontWeight: isHero ? 500 : 400, marginBottom: 22, lineHeight: 1.45 }}>
                      {c.tagline}
                    </div>
                    <div style={{ flex: 1, marginBottom: 24, display: "flex", flexDirection: "column", gap: 11 }}>
                      {c.highlights.map((line) => (
                        <div key={line} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13.5, color: "var(--text-primary)", lineHeight: 1.4 }}>
                          <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 16, height: 19, flexShrink: 0 }}>
                            <CheckIcon size={12} color="var(--success)" />
                          </span>
                          <span>{line}</span>
                        </div>
                      ))}
                    </div>
                    {current ? (
                      <button disabled style={CURRENT_PLAN_BTN}>Current plan</button>
                    ) : isHero ? (
                      <HeroCTA reduce={reduce} disabled={paymentLaunching.active} onClick={() => planForCta && handleCTA(planForCta)} label={c.cta} />
                    ) : (
                      <button
                        type="button"
                        disabled={paymentLaunching.active}
                        onClick={() => planForCta && handleCTA(planForCta)}
                        style={c.role === "anchor" ? ANCHOR_CTA : c.role === "entry" ? ENTRY_CTA : FLOOR_CTA}
                        onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(0.97)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.filter = "none"; }}
                      >
                        {c.cta}
                      </button>
                    )}
                    {isHero && c.footnote ? (
                      <div style={{ fontSize: 12, color: "var(--text-secondary)", textAlign: "center", marginTop: 12 }}>{c.footnote}</div>
                    ) : null}
                  </motion.div>
                );
              })}
            </motion.div>
          );
        })()}

        {/* COMPARISON TABLE — the detail layer, always visible, scrolls on narrow */}
        <div style={{ marginBottom: isMobile ? 36 : 48 }}>
          <h2 style={{ fontSize: isMobile ? 18 : 22, fontWeight: 700, color: "var(--text-primary)", textAlign: "center", margin: "0 0 20px", letterSpacing: "-0.01em" }}>
            Compare every plan
          </h2>
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch", borderRadius: 12, border: "1px solid var(--border)" }}>
            <table style={{ width: "100%", minWidth: 640, borderCollapse: "collapse", backgroundColor: "var(--bg-surface)" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "16px 20px", fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>
                    Feature
                  </th>
                  {PLAN_ORDER.map((s) => PLAN_META[s].name).map((col, i) => (
                    <th
                      key={col}
                      style={{
                        padding: "16px 16px",
                        fontSize: 13,
                        fontWeight: 700,
                        color: i === 2 ? "var(--accent-text)" : "var(--text-primary)",
                        backgroundColor: i === 2 ? "rgba(217,119,6,0.10)" : "transparent",
                        borderBottom: "1px solid var(--border)",
                        textAlign: "center",
                        whiteSpace: "nowrap",
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
                    <td style={{ padding: "14px 20px", fontSize: 13, color: "var(--text-primary)", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>
                      {row.feature}
                    </td>
                    {row.vals.map((val, vi) => (
                      <td
                        key={vi}
                        style={{
                          padding: "14px 16px",
                          textAlign: "center",
                          borderBottom: "1px solid var(--border)",
                          backgroundColor: vi === 2 ? "rgba(217,119,6,0.06)" : "transparent",
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
        </div>

        {/* TRUST + PAYMENT STRIP */}
        <div style={{ borderTop: "1px solid var(--border)", paddingTop: isMobile ? 28 : 36, marginBottom: 40 }}>
          <div style={{
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "center",
            alignItems: "center",
            gap: isMobile ? 12 : 40,
            marginBottom: 24,
          }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)", display: "inline-flex", alignItems: "center", gap: 6 }}>
              Secured by {currency === "INR" ? "Razorpay" : "Ziina"} <LockIcon />
            </span>
            <span style={{ fontSize: 13, color: "var(--text-secondary)", display: "inline-flex", alignItems: "center", gap: 6 }}>
              One time payment <CheckIcon size={12} color="var(--success)" />
            </span>
            <span style={{ fontSize: 13, color: "var(--text-secondary)", display: "inline-flex", alignItems: "center", gap: 6 }}>
              No hidden fees <CheckIcon size={12} color="var(--success)" />
            </span>
          </div>
          <PaymentTrustBar style={{ marginTop: 8 }} />
          <p style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", maxWidth: 540, margin: "18px auto 0", lineHeight: 1.5 }}>
            Brand names referenced are property of their respective owners. No affiliation or endorsement implied.
          </p>
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
