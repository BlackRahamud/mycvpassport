import { getPaymentLink } from "./utils/paywall";
import { getDisplayPrice, A_LA_CARTE } from "./config/tierConfig";

function FeatureItem({ text }) {
  return (
    <div style={{ display: "flex", alignItems: "center", color: "#FFFFFF", fontSize: 15, fontWeight: 500, lineHeight: 1.5 }}>
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
      {text}
    </div>
  );
}

export default function UpgradeModal({ isOpen, onClose, feature }) {
  if (!isOpen) return null;

  const isAts = feature === "ats";
  const isBuilderAi = feature === "builder_ai";

  // Virtual feature keys (builder_ai, ats, jobMatch, templates) now
  // resolve inside getPaymentLink itself, so this component passes the
  // feature through untouched and there is one mapping, not two.
  const paymentFeature = feature;

  const heading = isAts
    ? "Your free ATS scan is used up"
    : isBuilderAi
      ? "You've hit your AI rewrites limit this month"
      : "You're one step away from more interviews";

  const subtext = isAts
    ? "Most jobs in UAE get 200+ applicants. Only ATS-optimised CVs make it to the hiring manager. Don't leave it to chance."
    : isBuilderAi
      ? "Upgrade your plan for a higher monthly limit on AI rewrites — tailor every section without counting credits."
      : "Job seekers using AI-matched CVs get 3x more callbacks. Unlock Job Match and Cover Letter Generator with CVPassport Pro.";

  const features = isAts
    ? [
        "Unlimited ATS scans",
        "Match your CV to any job description",
        "Cover letter generator in seconds",
        "All premium templates, unlimited CVs",
      ]
    : isBuilderAi
      ? [
          "Unlimited AI summary rewrites",
          "Unlimited AI bullet rewrites",
          "Match your CV to any job description",
          "All premium templates, unlimited CVs",
        ]
      : [
          "Match your CV to any job description instantly",
          "Generate a professional cover letter in seconds",
          "All premium templates, unlimited CVs",
        ];

  // Prices are read from the config that the server actually charges
  // from, never typed inline. The old labels said "AED 29/month" while
  // the charge came from a different table, so the button could promise
  // one number and take another. They also implied a recurring
  // subscription; Active Hunter is a one time 30 day pass, so the copy
  // now says what it is.
  const hunterPrice = getDisplayPrice("active_hunter", "AED");
  const coverLetterPrice = A_LA_CARTE.coverLetter?.prices?.AED;

  const ctaLabel = feature === "coverLetter"
    ? `Get one cover letter, AED ${coverLetterPrice}`
    : `Unlock pro for 30 days, AED ${hunterPrice}`;

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.75)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <style dangerouslySetInnerHTML={{ __html: "@property --ats-angle{syntax:'<angle>';initial-value:0deg;inherits:false}@keyframes ats-spin-border{to{--ats-angle:360deg}}" }} />
      <div style={{ position: "relative", width: "100%", maxWidth: 440, borderRadius: 20 }}>
        <div aria-hidden style={{
          position: "absolute", inset: 0, borderRadius: 20, padding: 1,
          background: "conic-gradient(from var(--ats-angle, 0deg), transparent 60%, rgba(255,255,255,0.5) 80%, transparent 100%)",
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          pointerEvents: "none",
          animation: "ats-spin-border 3s linear infinite",
        }} />
        <div
          style={{
            background: "#0A0A0A",
            borderRadius: 20,
            padding: 32,
            boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
            boxSizing: "border-box",
            position: "relative",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ color: "#FFF", fontSize: 24, fontWeight: 700, letterSpacing: "-0.5px", lineHeight: 1.25 }}>{heading}</div>
          <div style={{ color: "#A0A0A0", fontSize: 15, marginTop: 12, lineHeight: 1.6 }}>{subtext}</div>

          <div style={{ marginTop: 18, display: "grid", gap: 10 }}>
            {features.map((item) => (
              <FeatureItem key={item} text={item} />
            ))}
          </div>

          <div style={{ position: "relative", borderRadius: 12, marginTop: 22 }}>
            <div aria-hidden style={{
              position: "absolute", inset: 0, borderRadius: 12, padding: 1.5,
              background: "conic-gradient(from var(--ats-angle, 0deg), transparent 60%, rgba(255,255,255,0.6) 80%, transparent 100%)",
              WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
              pointerEvents: "none",
              animation: "ats-spin-border 2s linear infinite",
            }} />
            <button
              type="button"
              onClick={async () => {
                const url = await getPaymentLink(paymentFeature);
                if (url) window.location.href = url;
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "center",
                border: "none",
                borderRadius: 12,
                padding: "14px",
                background: "#0A0A0A",
                color: "#fff",
                fontWeight: 700,
                fontSize: 15,
                boxSizing: "border-box",
                cursor: "pointer",
                position: "relative",
              }}
            >
              {ctaLabel}
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              marginTop: 12,
              width: "100%",
              borderRadius: 10,
              padding: "8px 14px",
              background: "transparent",
              border: "none",
              color: "#A0A0A0",
              fontSize: 14,
              cursor: "pointer",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#A0A0A0"; }}
          >
            Maybe Later
          </button>
        </div>
      </div>
    </div>
  );
}
