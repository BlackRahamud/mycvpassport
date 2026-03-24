import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();
  if (!isOpen) return null;

  const isAts = feature === "ats";
  const heading = isAts
    ? "Your free ATS scan is used up"
    : "You're one step away from more interviews";
  const subtext = isAts
    ? "Most jobs in UAE get 200+ applicants. Only ATS-optimised CVs make it to the hiring manager. Don't leave it to chance."
    : "Job seekers using AI-matched CVs get 3x more callbacks. Unlock Job Match and Cover Letter Generator with CVPassport Pro.";
  const features = isAts
    ? [
        "Unlimited ATS scans",
        "Match your CV to any job description",
        "Cover letter generator in seconds",
        "All premium templates, unlimited CVs",
      ]
    : [
        "Match your CV to any job description instantly",
        "Generate a professional cover letter in seconds",
        "All premium templates, unlimited CVs",
      ];
  const ctaLabel = isAts ? "Unlock Pro — AED 29/month" : "Upgrade to Pro — AED 29/month";

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
      <div
        style={{
          width: "100%",
          maxWidth: 440,
          background: "#141414",
          border: "1px solid #2A2A2A",
          borderRadius: 20,
          padding: 32,
          boxShadow: "0 24px 60px rgba(0,0,0,0.6)",
          boxSizing: "border-box",
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

        <button
          type="button"
          onClick={() => {
            onClose && onClose();
            navigate("/pricing");
          }}
          style={{
            marginTop: 22,
            display: "block",
            width: "100%",
            textAlign: "center",
            border: "none",
            borderRadius: 12,
            padding: "14px",
            background: "#FFFFFF",
            color: "#000000",
            fontWeight: 700,
            fontSize: 15,
            boxSizing: "border-box",
            cursor: "pointer",
          }}
        >
          {ctaLabel}
        </button>

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
  );
}
