import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { supabase } from "../supabaseClient";
import { getPaymentLink } from "../utils/paywall";
import PaymentTrustBar from "../components/PaymentTrustBar";
import CheckoutAuthSheet from "../components/CheckoutAuthSheet";
import RazorpayPayment from "../components/RazorpayPayment";

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

function CheckIcon({ size = 12, color = "#4ADE80" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

const PLAN_MAP = {
  explorer: "FREE",
  express: "EXPRESS_PASS",
  hunter: "ACTIVE_HUNTER",
  pro: "CAREER_PRO",
};

const RAZORPAY_PLANS = {
  express: { plan: "express_pass", amount: 39900 },
  hunter: { plan: "active_hunter", amount: 19900 },
  pro: { plan: "career_pro", amount: 99900 },
};

export default function PricingPage() {
  const navigate = useNavigate();

  const [currency, setCurrency] = useState("AED");
  const [billing, setBilling] = useState("monthly");
  const [userPlan, setUserPlan] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [authUser, setAuthUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [checkoutSheet, setCheckoutSheet] = useState({ open: false, planId: null, priceLabel: "" });
  const [checkoutError, setCheckoutError] = useState(null);
  const [allPlansOpen, setAllPlansOpen] = useState(false);
  const [razorpayCheckout, setRazorpayCheckout] = useState(null);
  const reduce = useReducedMotion();

  // GA4: view_pricing_plan
  useEffect(() => {
    if (typeof window.gtag === "function") {
      window.gtag("event", "view_pricing_plan", {
        page_title: "Pricing",
      });
    }
  }, []);

  // Geo detection
  useEffect(() => {
    fetch("https://ipapi.co/json/")
      .then((r) => r.json())
      .then((d) => { if (d.country === "IN") setCurrency("INR"); })
      .catch(() => setCurrency("AED"));
  }, []);

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
      priceAED: { monthly: 0, annual: 0 },
      priceINR: { monthly: 0, annual: 0 },
      description: "Get started for free",
      cta: "Get Started Free",
      ctaAction: "free",
      features: [
        { text: "3 CV templates", included: true },
        { text: "ATS Checker (basic)", included: true },
        { text: "3 PDF downloads", included: true },
        { text: "Walk-In Mode", included: true },
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
      name: "Express Pass",
      badge: null,
      priceAED: { monthly: 49, annual: 29 },
      priceINR: { monthly: 399, annual: 239 },
      description: "One-time payment, lifetime access",
      cta: "Buy Now",
      ctaAction: "express",
      features: [
        { text: "All templates", included: true },
        { text: "ATS Checker (full)", included: true },
        { text: "Unlimited CV Downloads", included: true },
        { text: "Walk-In Mode", included: true },
        { text: "Cover Letter Generator", included: true },
        { text: "Job Match Keywords", included: true },
        { text: "1 CV Import", included: true },
        { text: "Premium templates", included: true },
        { text: "GhostChip ATS injection", included: true },
        { text: "Priority support", included: false },
      ],
    },
    {
      id: "hunter",
      name: "Active Hunter",
      badge: "Most Popular",
      priceAED: { monthly: 29, annual: 17 },
      priceINR: { monthly: 199, annual: 119 },
      description: "Best for active job seekers",
      cta: "Start Hunting",
      ctaAction: "hunter",
      features: [
        { text: "All templates", included: true },
        { text: "ATS Checker Pro (AI powered)", included: true },
        { text: "Unlimited CV Downloads", included: true },
        { text: "Walk-In Mode", included: true },
        { text: "Cover Letter Generator", included: true },
        { text: "Job Match Keywords", included: true },
        { text: "3 CV Imports per week", included: true },
        { text: "Premium templates", included: true },
        { text: "GhostChip ATS injection", included: true },
        { text: "Priority support", included: true },
      ],
    },
    {
      id: "pro",
      name: "Career Pro",
      badge: "Best Value",
      priceAED: { monthly: null, annual: 199 },
      priceINR: { monthly: null, annual: 999 },
      description: "Full year, maximum results",
      cta: "Go Annual",
      ctaAction: "pro",
      features: [
        { text: "All templates", included: true },
        { text: "ATS Checker Pro (AI powered)", included: true },
        { text: "Unlimited CV Downloads", included: true },
        { text: "Walk-In Mode", included: true },
        { text: "Cover Letter Generator", included: true },
        { text: "Job Match Keywords", included: true },
        { text: "3 CV Imports per week", included: true },
        { text: "Premium templates", included: true },
        { text: "GhostChip ATS injection", included: true },
        { text: "Priority support", included: true },
      ],
    },
  ];

  const priceLabelFor = useCallback((plan) => {
    if (plan.id === "explorer") return "Free";
    if (plan.id === "pro") return currency === "AED" ? "AED 199/yr" : "₹999/yr";
    const prices = currency === "AED" ? plan.priceAED : plan.priceINR;
    const price = billing === "monthly" ? prices.monthly : prices.annual;
    return currency === "AED" ? `AED ${price}/mo` : `₹${price}/mo`;
  }, [currency, billing]);

  const handleRazorpaySuccess = useCallback(() => {
    setRazorpayCheckout(null);
    setShowSuccess(true);
    window.history.replaceState({}, "", "/pricing?payment=success");
  }, []);

  const handleRazorpayFailure = useCallback((msg) => {
    setRazorpayCheckout(null);
    if (msg !== "Payment cancelled") {
      setCheckoutError(msg || "Couldn't complete payment. Please try again.");
    }
  }, []);

  const firePayment = useCallback(async (planAction) => {
    if (currency === "INR") {
      const cfg = RAZORPAY_PLANS[planAction];
      if (!cfg) return;
      setCheckoutError(null);
      setRazorpayCheckout(cfg);
      return;
    }
    const featureMap = { express: "expressPass", hunter: "activeHunter", pro: "careerPro" };
    const feature = featureMap[planAction];
    if (!feature) return;
    setCheckoutError(null);
    const url = await getPaymentLink(feature);
    if (url) {
      window.location.href = url;
    } else {
      setCheckoutError("Couldn't start checkout. Please try again in a moment.");
    }
  }, [currency]);

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
  if (showSuccess) {
    return (
      <>
        <style>{`
          @keyframes pulse-ring {
            0% { transform: scale(1); opacity: 0.6; }
            100% { transform: scale(1.6); opacity: 0; }
          }
        `}</style>
        <div style={{
          position: "fixed", inset: 0, backgroundColor: "#0A0A0A",
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", zIndex: 9999, fontFamily: "Inter, -apple-system, system-ui, sans-serif",
        }}>
          <div style={{ fontSize: "24px", fontWeight: "700", color: "#FFFFFF", marginBottom: "40px" }}>
            CVPassport
          </div>
          <div style={{ position: "relative", marginBottom: "32px" }}>
            {/* Pulse ring */}
            <div style={{
              position: "absolute", inset: 0, borderRadius: "50%",
              backgroundColor: "#16A34A", opacity: 0.3,
              animation: "pulse-ring 1.5s ease-out infinite",
            }} />
            <div style={{
              width: "80px", height: "80px", borderRadius: "50%",
              backgroundColor: "#16A34A", display: "flex",
              alignItems: "center", justifyContent: "center",
              position: "relative", zIndex: 1,
            }}>
              <span style={{ fontSize: "48px", color: "#FFFFFF", lineHeight: 1 }}>✓</span>
            </div>
          </div>
          <div style={{ fontSize: "28px", fontWeight: "700", color: "#FFFFFF", marginBottom: "12px" }}>
            Payment Successful
          </div>
          <div style={{ fontSize: "15px", color: "#A0A0A0", marginBottom: "40px", textAlign: "center", maxWidth: "360px" }}>
            Your plan has been activated. Welcome to CVPassport.
          </div>
          <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: "12px" }}>
            <button
              onClick={() => navigate("/dashboard")}
              style={{
                backgroundColor: "#FFFFFF", color: "#000000",
                border: "none", borderRadius: "12px", padding: "14px 28px",
                fontSize: "14px", fontWeight: "600", cursor: "pointer",
              }}
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => navigate("/builder")}
              style={{
                backgroundColor: "transparent", color: "#FFFFFF",
                border: "1px solid #FFFFFF", borderRadius: "12px", padding: "14px 28px",
                fontSize: "14px", fontWeight: "600", cursor: "pointer",
              }}
            >
              Build My CV Now
            </button>
          </div>
        </div>
      </>
    );
  }

  // ====== COMPARISON TABLE DATA ======
  const compRows = [
    { feature: "CV Templates", vals: ["3 templates", "All", "All", "All"] },
    { feature: "ATS Checker", vals: ["Basic", "Full", "AI Powered", "AI Powered"] },
    { feature: "PDF Downloads", vals: ["3 downloads", "Unlimited", "Unlimited", "Unlimited"] },
    { feature: "Cover Letter", vals: [false, true, true, true] },
    { feature: "Job Match Keywords", vals: [false, true, true, true] },
    { feature: "CV Import", vals: [false, "1 import", "3/week", "3/week"] },
    { feature: "GhostChip ATS", vals: [false, true, true, true] },
    { feature: "Priority Support", vals: [false, false, true, true] },
  ];

  const renderCell = (val) => {
    if (val === true) return <span style={{ color: "#16A34A", fontSize: "16px" }}>✓</span>;
    if (val === false) return <span style={{ color: "#4A4A4A", fontSize: "16px" }}>×</span>;
    return <span style={{ color: "#A0A0A0", fontSize: "13px" }}>{val}</span>;
  };

  return (
    <>
      <Helmet>
        <title>CVPassport Pricing — CV Builder Plans for UAE, GCC &amp; India</title>
        <meta name="description" content="Plans from AED 49 or ₹399. ATS CV builder for UAE, GCC & India job seekers. Free to start — no credit card required." />
        <meta name="keywords" content="CV builder UAE, ATS CV Dubai, resume builder GCC, CV maker India, ATS optimised CV, job seeker Dubai, expat CV builder, CV templates UAE" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://mycvpassport.com/pricing" />
        <meta property="og:title" content="CVPassport Pricing — CV Builder Plans for UAE, GCC &amp; India" />
        <meta property="og:description" content="Plans from AED 49 or ₹399. ATS CV builder for UAE, GCC & India job seekers. Free to start — no credit card required." />
        <meta property="og:url" content="https://mycvpassport.com/pricing" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="en_AE" />
      </Helmet>
    <div style={{
      minHeight: "100vh", backgroundColor: "#0A0A0A",
      fontFamily: "Inter, -apple-system, system-ui, sans-serif",
      color: "#FFFFFF",
    }}>

      {/* PAGE HEADER */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: isMobile ? "16px" : "20px 48px",
        borderBottom: "1px solid #2A2A2A",
      }}>
        <div
          style={{ fontSize: "18px", fontWeight: "700", cursor: "pointer" }}
          onClick={() => navigate("/")}
        >
          CVPassport
        </div>
        <div
          style={{ fontSize: "13px", color: "#A0A0A0", cursor: "pointer" }}
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
            color: "#FFFFFF", margin: "0 0 10px",
          }}>
            Simple, Transparent Pricing
          </h1>
          <p style={{ fontSize: isMobile ? "14px" : "16px", color: "#A0A0A0", margin: 0 }}>
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
              color: "#FCA5A5",
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
                color: "#FCA5A5",
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
                  backgroundColor: "#141414",
                  border: "1px solid #2A2A2A",
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
                    color: "#A0A0A0",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginBottom: 14,
                  }}
                >
                  Start free
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
                  <span style={{ fontSize: 36, fontWeight: 700, color: "#FFFFFF", lineHeight: 1, letterSpacing: "-0.02em" }}>
                    {currency === "AED" ? "AED 0" : "₹0"}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: "#A0A0A0", marginBottom: 24 }}>
                  No card. No catch.
                </div>
                <div style={{ flex: 1, marginBottom: 24, display: "flex", flexDirection: "column", gap: 10 }}>
                  {[
                    "Build 3 CVs free",
                    "Score your CV against any job",
                    "Pick from starter templates",
                  ].map((line) => (
                    <div
                      key={line}
                      style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#E5E5E5" }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 14, flexShrink: 0 }}>
                        <CheckIcon size={12} color="#4ADE80" />
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
                      backgroundColor: "transparent", color: "#A0A0A0",
                      border: "1px solid #2A2A2A", fontSize: 14,
                      fontWeight: 600, cursor: "not-allowed",
                      fontFamily: "inherit",
                    }}
                  >
                    Current Plan
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => explorerPlan && handleCTA(explorerPlan)}
                    style={{
                      width: "100%", height: 44, borderRadius: 12,
                      backgroundColor: "transparent", color: "#FFFFFF",
                      border: "1px solid rgba(255,255,255,0.5)",
                      fontSize: 14, fontWeight: 600, cursor: "pointer",
                      fontFamily: "inherit",
                      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
                      transition: "border-color 160ms cubic-bezier(0.4,0,0.2,1), background-color 160ms cubic-bezier(0.4,0,0.2,1)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "#FFFFFF";
                      e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "rgba(255,255,255,0.5)";
                      e.currentTarget.style.backgroundColor = "transparent";
                    }}
                  >
                    <span>Build your first CV</span>
                    <ArrowRightIcon size={14} color="#FFFFFF" />
                  </button>
                )}
              </motion.div>
            );
          })()}

          {/* ACTIVE HUNTER — dominant, the inevitable choice */}
          {(() => {
            const hunterPlan = plans.find((p) => p.id === "hunter");
            const isCurrent = !!hunterPlan && isCurrentPlan(hunterPlan);
            const cancelLine = currency === "AED" ? "Cancel anytime · AED 29/mo" : "Cancel anytime · ₹199/mo";
            return (
              <motion.div
                variants={{
                  hidden: { opacity: 0, y: 8 },
                  show: { opacity: 1, y: 0, transition: { duration: 0.36, ease: EASE } },
                }}
                style={{
                  position: "relative",
                  background: "linear-gradient(180deg, #181818 0%, #121212 100%)",
                  border: "1px solid rgba(217,119,6,0.32)",
                  borderRadius: 18,
                  padding: isMobile ? "26px 20px 24px" : "32px 28px 28px",
                  display: "flex",
                  flexDirection: "column",
                  // Faint amber glow edge + top-edge highlight + grounded drop
                  // + wide outward amber spill — same depth language as the
                  // AtsGapsActionCard so the two surfaces feel related.
                  boxShadow: [
                    "0 0 0 1px rgba(217,119,6,0.08)",
                    "inset 0 1px 0 rgba(255,255,255,0.05)",
                    "0 24px 56px -14px rgba(0,0,0,0.6)",
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
                      color: "#D97706",
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
                  <span style={{ fontSize: 18, fontWeight: 700, color: "#FFFFFF", letterSpacing: "-0.005em" }}>
                    {currency === "AED" ? "AED " : "₹"}
                  </span>
                  <span style={{ fontSize: 44, fontWeight: 700, color: "#FFFFFF", lineHeight: 1, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
                    {currency === "AED" ? "29" : "199"}
                  </span>
                  <span style={{ fontSize: 14, color: "#A0A0A0", marginLeft: 4 }}>/mo</span>
                </div>

                <div style={{ fontSize: 13, color: "#D97706", marginBottom: 24, fontWeight: 500 }}>
                  Less than a coffee. More than a recruiter.
                </div>

                <div style={{ flex: 1, marginBottom: 28, display: "flex", flexDirection: "column", gap: 12 }}>
                  {[
                    "Unlimited CVs, any template",
                    "AI rewrites your bullets to beat ATS filters",
                    "Cover letter in 20 seconds",
                    "Scout — search 10,000+ Gulf & India jobs",
                    "Download-ready in minutes",
                  ].map((line) => (
                    <div
                      key={line}
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                        fontSize: 14,
                        color: "#FFFFFF",
                        lineHeight: 1.45,
                      }}
                    >
                      <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 16, height: 20, flexShrink: 0 }}>
                        <CheckIcon size={13} color="#4ADE80" />
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
                      backgroundColor: "transparent", color: "#A0A0A0",
                      border: "1px solid #2A2A2A", fontSize: 14,
                      fontWeight: 600, cursor: "not-allowed",
                      fontFamily: "inherit",
                    }}
                  >
                    Current Plan
                  </button>
                ) : (
                  <motion.button
                    type="button"
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
                      color: "#FFFFFF", border: "none",
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
                    <ArrowRightIcon size={14} color="#FFFFFF" />
                  </motion.button>
                )}

                <div style={{ fontSize: 12, color: "#A0A0A0", textAlign: "center", marginTop: 12 }}>
                  {cancelLine}
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
              color: "#A0A0A0",
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
                background: "none",
                border: "none",
                padding: "8px 12px",
                color: "#A0A0A0",
                fontSize: 13,
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                transition: "color 160ms cubic-bezier(0.4,0,0.2,1)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#A0A0A0"; }}
            >
              <span>
                {allPlansOpen
                  ? "Hide other plans"
                  : "See all plans including one-time and annual options"}
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
                  {/* Billing toggle — relevant only for the annual options inside */}
                  <div style={{ textAlign: "center", marginBottom: 24 }}>
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0,
                        backgroundColor: "#141414",
                        border: "1px solid #2A2A2A",
                        borderRadius: 100,
                        padding: 4,
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setBilling("monthly")}
                        style={{
                          padding: "8px 20px", borderRadius: 100, border: "none",
                          backgroundColor: billing === "monthly" ? "#FFFFFF" : "transparent",
                          color: billing === "monthly" ? "#000000" : "#A0A0A0",
                          fontSize: 13, fontWeight: 600, cursor: "pointer",
                          transition: "all 0.2s", fontFamily: "inherit",
                        }}
                      >
                        Monthly
                      </button>
                      <button
                        type="button"
                        onClick={() => setBilling("annual")}
                        style={{
                          padding: "8px 20px", borderRadius: 100, border: "none",
                          backgroundColor: billing === "annual" ? "#FFFFFF" : "transparent",
                          color: billing === "annual" ? "#000000" : "#A0A0A0",
                          fontSize: 13, fontWeight: 600, cursor: "pointer",
                          transition: "all 0.2s", fontFamily: "inherit",
                          display: "flex", alignItems: "center", gap: 6,
                        }}
                      >
                        Annual
                        <span
                          style={{
                            backgroundColor: "rgba(217,119,6,0.15)",
                            color: "#D97706",
                            border: "1px solid rgba(217,119,6,0.3)",
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: 100,
                          }}
                        >
                          Save 40%
                        </span>
                      </button>
                    </div>
                  </div>

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
                        let priceLarge = null;
                        let priceSuffix = "";
                        if (plan.id === "pro") {
                          priceLarge = currency === "AED" ? "199" : "999";
                          priceSuffix = "/yr";
                        } else {
                          const prices = currency === "AED" ? plan.priceAED : plan.priceINR;
                          const price = billing === "monthly" ? prices.monthly : prices.annual;
                          priceLarge = String(price);
                          priceSuffix = "/mo";
                        }
                        return (
                          <div
                            key={plan.id}
                            style={{
                              backgroundColor: "#141414",
                              border: "1px solid #2A2A2A",
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
                                    border: "1px solid #FFFFFF",
                                    color: "#FFFFFF",
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
                            <div style={{ fontSize: 16, fontWeight: 700, color: "#FFFFFF", marginBottom: 16 }}>
                              {plan.name}
                            </div>
                            <div style={{ marginBottom: 6, display: "flex", alignItems: "baseline", gap: 2 }}>
                              {plan.id !== "pro" && (
                                <span style={{ fontSize: 20, fontWeight: 700, color: "#FFFFFF" }}>
                                  {currency === "AED" ? "AED " : "₹"}
                                </span>
                              )}
                              <span style={{ fontSize: 40, fontWeight: 700, color: "#FFFFFF", lineHeight: 1 }}>
                                {plan.id === "pro" ? (currency === "AED" ? "AED 199" : "₹999") : priceLarge}
                              </span>
                              <span style={{ fontSize: 13, color: "#A0A0A0", marginLeft: 2 }}>{priceSuffix}</span>
                            </div>
                            <div style={{ fontSize: 13, color: "#A0A0A0", marginBottom: 24 }}>
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
                                    color: f.included ? "#FFFFFF" : "#4A4A4A",
                                  }}
                                >
                                  <span
                                    style={{
                                      color: f.included ? "#16A34A" : "#4A4A4A",
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
                                  color: "#A0A0A0",
                                  border: "1px solid #2A2A2A",
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
                                onClick={() => handleCTA(plan)}
                                style={{
                                  width: "100%",
                                  height: 44,
                                  borderRadius: 12,
                                  backgroundColor: "#FFFFFF",
                                  color: "#000000",
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
                          backgroundColor: "#141414",
                          border: "1px solid #2A2A2A",
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
                                color: "#A0A0A0",
                                borderBottom: "1px solid #2A2A2A",
                              }}
                            >
                              Feature
                            </th>
                            {["Explorer", "Express Pass", "Active Hunter", "Career Pro"].map((col, i) => (
                              <th
                                key={col}
                                style={{
                                  padding: "16px 20px",
                                  fontSize: 13,
                                  fontWeight: 600,
                                  color: i === 2 ? "#D97706" : "#FFFFFF",
                                  backgroundColor: i === 2 ? "rgba(217,119,6,0.1)" : "transparent",
                                  borderBottom: "1px solid #2A2A2A",
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
                            <tr key={row.feature} style={{ backgroundColor: ri % 2 === 0 ? "#141414" : "#1C1C1C" }}>
                              <td
                                style={{
                                  padding: "14px 20px",
                                  fontSize: 13,
                                  color: "#FFFFFF",
                                  borderBottom: "1px solid #2A2A2A",
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
                                    borderBottom: "1px solid #2A2A2A",
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
          borderTop: "1px solid #2A2A2A",
          borderBottom: "1px solid #2A2A2A",
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
            <span style={{ fontSize: "13px", color: "#A0A0A0", textAlign: "center", display: "inline-flex", alignItems: "center", gap: 6 }}>
              Secured by {currency === "INR" ? "Razorpay" : "Ziina"} <LockIcon />
            </span>
            <span style={{ fontSize: "13px", color: "#A0A0A0", textAlign: "center" }}>
              Cancel Anytime ↩
            </span>
            <span style={{ fontSize: "13px", color: "#A0A0A0", textAlign: "center" }}>
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
      />
    ) : null}
    </>
  );
}
