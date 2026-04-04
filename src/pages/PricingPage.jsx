import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";

const PLAN_MAP = {
  explorer: "FREE",
  express: "EXPRESS_PASS",
  hunter: "ACTIVE_HUNTER",
  pro: "CAREER_PRO",
};

export default function PricingPage() {
  const navigate = useNavigate();

  const [currency, setCurrency] = useState("AED");
  const [billing, setBilling] = useState("monthly");
  const [userPlan, setUserPlan] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Geo detection
  useEffect(() => {
    fetch("https://ipapi.co/json/")
      .then((r) => r.json())
      .then((d) => { if (d.country === "IN") setCurrency("INR"); })
      .catch(() => setCurrency("AED"));
  }, []);

  // Current plan detection
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        supabase.from("profiles").select("plan").eq("id", data.user.id).single()
          .then(({ data: p }) => { if (p) setUserPlan(p.plan); });
      }
    });
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
        { text: "Job Match", included: false },
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
      envKey: "REACT_APP_LS_EXPRESS_PASS_URL",
      features: [
        { text: "All 14 CV templates", included: true },
        { text: "ATS Checker (full)", included: true },
        { text: "Unlimited PDF downloads", included: true },
        { text: "Walk-In Mode", included: true },
        { text: "Cover Letter Generator", included: true },
        { text: "Job Match", included: true },
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
      envKey: "REACT_APP_LS_ACTIVE_HUNTER_URL",
      features: [
        { text: "All 14 CV templates", included: true },
        { text: "ATS Checker Pro (AI powered)", included: true },
        { text: "Unlimited PDF downloads", included: true },
        { text: "Walk-In Mode", included: true },
        { text: "Cover Letter Generator", included: true },
        { text: "Job Match", included: true },
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
      envKey: "REACT_APP_LS_CAREER_PRO_URL",
      features: [
        { text: "All 14 CV templates", included: true },
        { text: "ATS Checker Pro (AI powered)", included: true },
        { text: "Unlimited PDF downloads", included: true },
        { text: "Walk-In Mode", included: true },
        { text: "Cover Letter Generator", included: true },
        { text: "Job Match", included: true },
        { text: "3 CV Imports per week", included: true },
        { text: "Premium templates", included: true },
        { text: "GhostChip ATS injection", included: true },
        { text: "Priority support", included: true },
      ],
    },
  ];

  const getPrice = (plan) => {
    if (plan.id === "explorer") return "Free";
    if (plan.id === "pro") return currency === "AED" ? "AED 199/yr" : "₹999/yr";
    const prices = currency === "AED" ? plan.priceAED : plan.priceINR;
    const price = billing === "monthly" ? prices.monthly : prices.annual;
    const symbol = currency === "AED" ? "AED" : "₹";
    return `${symbol} ${price}`;
  };

  const handleCTA = (plan) => {
    if (plan.ctaAction === "free") {
      navigate("/dashboard");
      return;
    }
    const urls = {
      express: process.env.REACT_APP_LS_EXPRESS_PASS_URL,
      hunter: process.env.REACT_APP_LS_ACTIVE_HUNTER_URL,
      pro: process.env.REACT_APP_LS_CAREER_PRO_URL,
    };
    const url = urls[plan.ctaAction];
    if (url) {
      window.open(url, "_blank");
    } else {
      alert("Payment coming soon. Check back shortly.");
    }
  };

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
    { feature: "CV Templates", vals: ["3 templates", "All 14", "All 14", "All 14"] },
    { feature: "ATS Checker", vals: ["Basic", "Full", "AI Powered", "AI Powered"] },
    { feature: "PDF Downloads", vals: ["3 downloads", "Unlimited", "Unlimited", "Unlimited"] },
    { feature: "Cover Letter", vals: [false, true, true, true] },
    { feature: "Job Match", vals: [false, true, true, true] },
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
          <p style={{ fontSize: isMobile ? "14px" : "16px", color: "#A0A0A0", margin: "0 0 28px" }}>
            Built for UAE and India job seekers. No surprises.
          </p>

          {/* BILLING TOGGLE */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "0",
            backgroundColor: "#141414", border: "1px solid #2A2A2A",
            borderRadius: "100px", padding: "4px",
          }}>
            <button
              onClick={() => setBilling("monthly")}
              style={{
                padding: "8px 20px", borderRadius: "100px", border: "none",
                backgroundColor: billing === "monthly" ? "#FFFFFF" : "transparent",
                color: billing === "monthly" ? "#000000" : "#A0A0A0",
                fontSize: "13px", fontWeight: "600", cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling("annual")}
              style={{
                padding: "8px 20px", borderRadius: "100px", border: "none",
                backgroundColor: billing === "annual" ? "#FFFFFF" : "transparent",
                color: billing === "annual" ? "#000000" : "#A0A0A0",
                fontSize: "13px", fontWeight: "600", cursor: "pointer",
                transition: "all 0.2s",
                display: "flex", alignItems: "center", gap: "6px",
              }}
            >
              Annual
              <span style={{
                backgroundColor: "rgba(217,119,6,0.15)", color: "#D97706",
                border: "1px solid rgba(217,119,6,0.3)",
                fontSize: "10px", fontWeight: "700", padding: "2px 6px",
                borderRadius: "100px",
              }}>
                Save 40%
              </span>
            </button>
          </div>
        </div>

        {/* PLAN CARDS */}
        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "repeat(4, 1fr)",
          gap: "20px",
          marginBottom: isMobile ? "40px" : "60px",
        }}>
          {plans.map((plan) => {
            const isHunter = plan.id === "hunter";
            const isPro = plan.id === "pro";
            const isCurrent = isCurrentPlan(plan);
            const priceStr = getPrice(plan);

            // Parse price for large display
            let priceLarge = null;
            let priceSuffix = "";
            if (plan.id === "explorer") {
              priceLarge = "Free";
            } else if (plan.id === "pro") {
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
                  border: isHunter ? "1px solid #D97706" : "1px solid #2A2A2A",
                  borderTop: isHunter ? "2px solid #D97706" : undefined,
                  borderRadius: "16px",
                  padding: isHunter ? (isMobile ? "24px 20px" : "36px 28px") : cardPad,
                  display: "flex",
                  flexDirection: "column",
                  boxShadow: isHunter ? "0 0 24px rgba(217,119,6,0.15)" : "none",
                  position: "relative",
                }}
              >
                {/* Badge */}
                {plan.badge && (
                  <div style={{ marginBottom: "12px" }}>
                    <span style={{
                      border: `1px solid ${isHunter ? "#D97706" : "#FFFFFF"}`,
                      color: isHunter ? "#D97706" : "#FFFFFF",
                      fontSize: "10px", fontWeight: "700",
                      padding: "3px 10px", borderRadius: "100px",
                      textTransform: "uppercase", letterSpacing: "0.05em",
                    }}>
                      {plan.badge}
                    </span>
                  </div>
                )}
                {!plan.badge && <div style={{ height: "26px" }} />}

                {/* Plan name */}
                <div style={{ fontSize: "16px", fontWeight: "700", color: "#FFFFFF", marginBottom: "16px" }}>
                  {plan.name}
                </div>

                {/* Price */}
                <div style={{ marginBottom: "6px", display: "flex", alignItems: "baseline", gap: "2px" }}>
                  {plan.id !== "explorer" && plan.id !== "pro" && (
                    <span style={{ fontSize: "20px", fontWeight: "700", color: "#FFFFFF" }}>
                      {currency === "AED" ? "AED " : "₹"}
                    </span>
                  )}
                  <span style={{ fontSize: "40px", fontWeight: "700", color: "#FFFFFF", lineHeight: 1 }}>
                    {plan.id === "explorer" ? "Free" : plan.id === "pro" ? (currency === "AED" ? "AED 199" : "₹999") : priceLarge}
                  </span>
                  {plan.id !== "explorer" && (
                    <span style={{ fontSize: "13px", color: "#A0A0A0", marginLeft: "2px" }}>{priceSuffix}</span>
                  )}
                </div>

                {/* Description */}
                <div style={{ fontSize: "13px", color: "#A0A0A0", marginBottom: "24px" }}>
                  {plan.description}
                </div>

                {/* Features */}
                <div style={{ flex: 1, marginBottom: "28px" }}>
                  {plan.features.map((f, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: "10px",
                      marginBottom: "10px", fontSize: "13px",
                      color: f.included ? "#FFFFFF" : "#4A4A4A",
                    }}>
                      <span style={{
                        color: f.included ? "#16A34A" : "#4A4A4A",
                        fontWeight: "700", fontSize: "14px", flexShrink: 0,
                      }}>
                        {f.included ? "✓" : "×"}
                      </span>
                      {f.text}
                    </div>
                  ))}
                </div>

                {/* CTA */}
                {isCurrent ? (
                  <button
                    disabled
                    style={{
                      width: "100%", height: "44px", borderRadius: "12px",
                      backgroundColor: "transparent", color: "#A0A0A0",
                      border: "1px solid #2A2A2A", fontSize: "14px",
                      fontWeight: "600", cursor: "not-allowed",
                    }}
                  >
                    Current Plan
                  </button>
                ) : plan.id === "explorer" ? (
                  <button
                    onClick={() => handleCTA(plan)}
                    style={{
                      width: "100%", height: "44px", borderRadius: "12px",
                      backgroundColor: "transparent", color: "#FFFFFF",
                      border: "1px solid #FFFFFF", fontSize: "14px",
                      fontWeight: "600", cursor: "pointer",
                    }}
                  >
                    {plan.cta}
                  </button>
                ) : (
                  <button
                    onClick={() => handleCTA(plan)}
                    style={{
                      width: "100%", height: "44px", borderRadius: "12px",
                      backgroundColor: "#FFFFFF", color: "#000000",
                      border: "none", fontSize: "14px",
                      fontWeight: "600", cursor: "pointer",
                    }}
                  >
                    {plan.cta}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* COMPARISON TABLE — desktop only */}
        {!isMobile && (
          <div style={{ marginBottom: "60px" }}>
            <table style={{
              width: "100%", borderCollapse: "collapse",
              backgroundColor: "#141414", border: "1px solid #2A2A2A",
              borderRadius: "12px", overflow: "hidden",
            }}>
              <thead>
                <tr>
                  <th style={{
                    textAlign: "left", padding: "16px 20px",
                    fontSize: "13px", fontWeight: "600", color: "#A0A0A0",
                    borderBottom: "1px solid #2A2A2A",
                  }}>
                    Feature
                  </th>
                  {["Explorer", "Express Pass", "Active Hunter", "Career Pro"].map((col, i) => (
                    <th key={col} style={{
                      padding: "16px 20px", fontSize: "13px", fontWeight: "600",
                      color: i === 2 ? "#D97706" : "#FFFFFF",
                      backgroundColor: i === 2 ? "rgba(217,119,6,0.1)" : "transparent",
                      borderBottom: "1px solid #2A2A2A", textAlign: "center",
                    }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compRows.map((row, ri) => (
                  <tr key={row.feature} style={{ backgroundColor: ri % 2 === 0 ? "#141414" : "#1C1C1C" }}>
                    <td style={{
                      padding: "14px 20px", fontSize: "13px", color: "#FFFFFF",
                      borderBottom: "1px solid #2A2A2A",
                    }}>
                      {row.feature}
                    </td>
                    {row.vals.map((val, vi) => (
                      <td key={vi} style={{
                        padding: "14px 20px", textAlign: "center",
                        borderBottom: "1px solid #2A2A2A",
                        backgroundColor: vi === 2 ? "rgba(217,119,6,0.05)" : "transparent",
                      }}>
                        {renderCell(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

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
            {[
              "Secured by LemonSqueezy 🔒",
              "Cancel Anytime ↩",
              "No Hidden Fees ✓",
            ].map((item) => (
              <span key={item} style={{ fontSize: "13px", color: "#A0A0A0", textAlign: "center" }}>
                {item}
              </span>
            ))}
          </div>
          <div style={{ textAlign: "center", fontSize: "13px", color: "#A0A0A0" }}>
            Join 2,400+ job seekers across UAE and India
          </div>
        </div>

      </div>
    </div>
  );
}
