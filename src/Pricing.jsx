import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function StatusIcon({ ok }) {
  if (ok) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: "20px",
          height: "20px",
          borderRadius: "50%",
          background: "rgba(34,197,94,0.15)",
          marginRight: "10px",
          flexShrink: 0,
        }}
      >
        <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
          <path d="M2 5.5L4.5 8L9 3" stroke="#22C55E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "20px",
        height: "20px",
        borderRadius: "50%",
        background: "rgba(160,160,160,0.16)",
        marginRight: "10px",
        flexShrink: 0,
      }}
    >
      <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
        <path d="M3 3L8 8M8 3L3 8" stroke="#A0A0A0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}

function PlanCard({ plan, isActive, isLight, onNavigate }) {
  const cardBg = isLight ? (isActive ? "#EFF6FF" : "#FFFFFF") : (isActive ? "#1C1C1C" : "#141414");
  const cardBorder = isLight ? (isActive ? "1px solid #3B82F6" : "1px solid #E5E7EB") : (isActive ? "2px solid #FFFFFF" : "1px solid #2A2A2A");
  const textPrimary = isLight ? "#111111" : "#FFFFFF";
  const textSecondary = "#A0A0A0";

  return (
    <div
      style={{
        position: "relative",
        background: cardBg,
        border: cardBorder,
        borderRadius: 16,
        padding: 20,
        display: "grid",
        gap: 8,
      }}
    >
      {plan.popular ? (
        <div
          style={{
            position: "absolute",
            top: -14,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#FFFFFF",
            color: "#000000",
            borderRadius: 999,
            padding: "5px 10px",
            fontSize: 11,
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            whiteSpace: "nowrap",
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 3.5l2.7 5.47 6.03.88-4.36 4.25 1.03 6.01L12 17.26l-5.4 2.85 1.03-6.01L3.27 9.85l6.03-.88L12 3.5z" stroke="#111111" strokeWidth="1.6" fill="none" />
          </svg>
          Most Popular
        </div>
      ) : null}

      <div style={{ color: textPrimary, fontSize: 19, fontWeight: 700, marginTop: plan.popular ? 8 : 0 }}>{plan.name}</div>
      <div style={{ color: textPrimary, fontSize: 32, fontWeight: 700, lineHeight: 1.1 }}>{plan.price}</div>
      {plan.priceSubtext ? (
        <div style={{ color: textSecondary, fontSize: 13, marginTop: 2, marginBottom: 0 }}>{plan.priceSubtext}</div>
      ) : null}
      <div style={{ color: textSecondary, fontSize: 13, marginBottom: 6, marginTop: plan.priceSubtext ? 4 : 0 }}>{plan.tagline}</div>

      <div style={{ display: "grid", gap: 8, marginTop: 4 }}>
        {plan.features.map((f) => (
          <div key={f.label} style={{ display: "flex", alignItems: "center", color: textPrimary, fontSize: 14, fontWeight: 500, lineHeight: 1.45 }}>
            <StatusIcon ok={f.ok} />
            {f.label}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onNavigate(plan.href)}
        style={{
          marginTop: 10,
          width: "100%",
          textAlign: "center",
          background: "#FFFFFF",
          color: "#000000",
          fontWeight: 700,
          fontSize: 14,
          borderRadius: 12,
          padding: "12px 14px",
          boxSizing: "border-box",
          display: "block",
          border: "none",
          cursor: "pointer",
        }}
      >
        {plan.cta}
      </button>
    </div>
  );
}

const PLANS_AE = [
  {
    name: "Explorer",
    price: "Free",
    tagline: "Best for first-time users",
    cta: "Get Started Free",
    href: "/register",
    features: [
      { ok: true, label: "1 template" },
      { ok: true, label: "1 CV" },
      { ok: true, label: "1 ATS scan" },
      { ok: true, label: "1 download" },
      { ok: false, label: "Job Match keywords" },
      { ok: false, label: "Cover Letter" },
      { ok: false, label: "Clean PDF" },
    ],
  },
  {
    name: "Express Pass",
    price: "AED 49 one-time",
    tagline: "For one-time job seekers.",
    cta: "Get Express Pass",
    href: "/checkout",
    features: [
      { ok: true, label: "All premium templates" },
      { ok: true, label: "3 CVs" },
      { ok: true, label: "3 ATS scans" },
      { ok: true, label: "3 Job Match keywords" },
      { ok: true, label: "3 Cover Letters" },
      { ok: true, label: "Clean PDF" },
    ],
  },
  {
    name: "Active Hunter",
    price: "AED 29/month",
    tagline: "Most value for active job seekers",
    cta: "Start Hunting",
    href: "/checkout",
    popular: true,
    features: [
      { ok: true, label: "All premium templates" },
      { ok: true, label: "Unlimited CVs" },
      { ok: true, label: "Unlimited ATS scans" },
      { ok: true, label: "Unlimited Job Match keywords" },
      { ok: true, label: "Unlimited Cover Letters" },
      { ok: true, label: "Walk-In CV mode" },
      { ok: true, label: "Clean PDF" },
    ],
  },
  {
    name: "Career Pro",
    price: "AED 199/year",
    tagline: "Save 43% vs monthly",
    cta: "Go Pro",
    href: "/checkout",
    features: [
      { ok: true, label: "Everything in Active Hunter" },
      { ok: true, label: "Save 43% vs monthly" },
      { ok: true, label: "Cancel anytime" },
    ],
  },
];

const PLANS_IN = [
  {
    name: "Explorer",
    price: "Free",
    tagline: "Best for first-time users",
    cta: "Get Started Free",
    href: "/register",
    features: [
      { ok: true, label: "1 template" },
      { ok: true, label: "1 CV" },
      { ok: true, label: "1 ATS scan" },
      { ok: true, label: "1 download" },
      { ok: false, label: "Job Match keywords" },
      { ok: false, label: "Cover Letter" },
      { ok: false, label: "Clean PDF" },
    ],
  },
  {
    name: "Express Pass",
    price: "₹399 one-time",
    tagline: "For one-time job seekers.",
    cta: "Get Express Pass",
    href: "/checkout",
    features: [
      { ok: true, label: "All premium templates" },
      { ok: true, label: "3 CVs" },
      { ok: true, label: "3 ATS scans" },
      { ok: true, label: "3 Job Match keywords" },
      { ok: true, label: "3 Cover Letters" },
      { ok: true, label: "Clean PDF" },
    ],
  },
  {
    name: "Active Hunter",
    price: "₹199/month",
    tagline: "It's not the burger at stake. It's your career.",
    cta: "Start Hunting",
    href: "/checkout",
    popular: true,
    features: [
      { ok: true, label: "All premium templates" },
      { ok: true, label: "Unlimited CVs" },
      { ok: true, label: "Unlimited ATS scans" },
      { ok: true, label: "Unlimited Job Match keywords" },
      { ok: true, label: "Unlimited Cover Letters" },
      { ok: true, label: "Walk-In CV mode" },
      { ok: true, label: "Clean PDF" },
    ],
  },
  {
    name: "Career Pro",
    price: "₹599/year",
    priceSubtext: "Save 66% vs monthly",
    tagline: "Invest in yourself.",
    cta: "Go Pro",
    href: "/checkout",
    features: [
      { ok: true, label: "Everything in Active Hunter" },
      { ok: true, label: "Save 66% vs monthly" },
      { ok: true, label: "Cancel anytime" },
    ],
  },
];

export default function Pricing({ isLight = false }) {
  const navigate = useNavigate();
  const [currency, setCurrency] = useState(() => {
    try {
      return typeof window !== "undefined" && localStorage.getItem("cvp_pricing_currency") === "IN" ? "IN" : "AE";
    } catch {
      return "AE";
    }
  });
  const pageBg = isLight ? "#F8FAFC" : "#0A0A0A";
  const textPrimary = isLight ? "#111111" : "#FFFFFF";
  const textSecondary = "#A0A0A0";

  const plans = currency === "IN" ? PLANS_IN : PLANS_AE;

  useEffect(() => {
    try {
      localStorage.setItem("cvp_pricing_currency", currency);
    } catch {
      /* ignore */
    }
  }, [currency]);

  useEffect(() => {
    fetch("https://ipapi.co/json/")
      .then((r) => r.json())
      .then((data) => {
        if (data.country_code === "IN") setCurrency("IN");
      })
      .catch(() => {});
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: pageBg, color: textPrimary, fontFamily: "'DM Sans', system-ui, -apple-system, Segoe UI, sans-serif" }}>
      <div style={{ borderBottom: isLight ? "1px solid #E5E7EB" : "1px solid #2A2A2A", background: isLight ? "#FFFFFF" : "#0A0A0A" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto", padding: "14px 20px", display: "flex", alignItems: "center", gap: 14 }}>
          <Link
            to="/"
            style={{ border: "none", background: "transparent", color: textSecondary, fontSize: 14, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none" }}
          >
            <span aria-hidden="true">←</span> Back
          </Link>
          <div style={{ color: textPrimary, fontSize: 18, fontWeight: 700 }}>CVPassport</div>
        </div>
      </div>

      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "34px 20px 30px" }}>
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 42, fontWeight: 800, color: textPrimary, lineHeight: 1.15 }}>Land the job. Not just the interview.</div>
          <div style={{ marginTop: 10, fontSize: 17, color: textSecondary }}>
            {currency === "IN" ? (
              <>You spend ₹249 on a burger. Your resume gets you ₹40,000 a month. Do the math.</>
            ) : (
              <>Built for job seekers across UAE, GCC & India. Pay only for what you need.</>
            )}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 320,
              height: 48,
              background: isLight ? "#F1F5F9" : "#141414",
              border: isLight ? "1px solid #E5E7EB" : "1px solid #2A2A2A",
              borderRadius: 12,
              display: "flex",
              zIndex: 1,
              margin: 0,
            }}
          >
            <button
              type="button"
              onClick={() => setCurrency("AE")}
              style={{
                flex: 1,
                border: "none",
                cursor: "pointer",
                fontSize: 14,
                transition: "background-color 150ms cubic-bezier(0.4, 0, 0.2, 1), color 150ms cubic-bezier(0.4, 0, 0.2, 1)",
                background: currency === "AE" ? (isLight ? "#FFFFFF" : "#FFFFFF") : "transparent",
                color: currency === "AE" ? "#000000" : isLight ? "#64748B" : "#A0A0A0",
                borderRadius: currency === "AE" ? 10 : 0,
                fontWeight: currency === "AE" ? 600 : 500,
              }}
            >
              UAE
            </button>
            <button
              type="button"
              onClick={() => setCurrency("IN")}
              style={{
                flex: 1,
                border: "none",
                cursor: "pointer",
                fontSize: 14,
                transition: "background-color 150ms cubic-bezier(0.4, 0, 0.2, 1), color 150ms cubic-bezier(0.4, 0, 0.2, 1)",
                background: currency === "IN" ? (isLight ? "#FFFFFF" : "#FFFFFF") : "transparent",
                color: currency === "IN" ? "#000000" : isLight ? "#64748B" : "#A0A0A0",
                borderRadius: currency === "IN" ? 10 : 0,
                fontWeight: currency === "IN" ? 600 : 500,
              }}
            >
              India
            </button>
          </div>
        </div>

        <style>{`
          .cvp-pricing-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 14px;
          }
          @media (max-width: 980px) {
            .cvp-pricing-grid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>

        <div className="cvp-pricing-grid">
          {plans.map((plan) => (
            <PlanCard key={plan.name} plan={plan} isActive={plan.name === "Active Hunter"} isLight={isLight} onNavigate={navigate} />
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 24, color: textSecondary, fontSize: 13 }}>
          No hidden fees · Cancel anytime · Trusted by job seekers across UAE, GCC & India
        </div>
      </div>
    </div>
  );
}
