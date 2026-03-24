export default function UpgradeModal({ isOpen, onClose }) {
  if (!isOpen) return null;

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
          maxWidth: 480,
          background: "#141414",
          border: "1px solid #2A2A2A",
          borderRadius: 16,
          padding: 20,
          boxSizing: "border-box",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ color: "#FFF", fontSize: 28, fontWeight: 800, lineHeight: 1.2 }}>
          You're one step away from more interviews
        </div>
        <div style={{ color: "#A0A0A0", fontSize: 14, marginTop: 10, lineHeight: 1.55 }}>
          Job seekers using AI-matched CVs get 3x more callbacks. Unlock Job Match and Cover Letter Generator with CVPassport Pro.
        </div>

        <div style={{ marginTop: 16, display: "grid", gap: 8, color: "#FFF", fontSize: 14 }}>
          <div><span style={{ color: "#22C55E" }}>✅</span> Match your CV to any job description instantly</div>
          <div><span style={{ color: "#22C55E" }}>✅</span> Generate a professional cover letter in seconds</div>
          <div><span style={{ color: "#22C55E" }}>✅</span> All 11 premium templates, unlimited CVs</div>
        </div>

        <a
          href="/pricing"
          style={{
            marginTop: 18,
            display: "block",
            width: "100%",
            textAlign: "center",
            textDecoration: "none",
            border: "none",
            borderRadius: 10,
            padding: "12px 14px",
            background: "#FFFFFF",
            color: "#000000",
            fontWeight: 700,
            fontSize: 14,
            boxSizing: "border-box",
          }}
        >
          Upgrade to Pro — AED 29/month
        </a>

        <button
          type="button"
          onClick={onClose}
          style={{
            marginTop: 10,
            width: "100%",
            borderRadius: 10,
            padding: "11px 14px",
            background: "transparent",
            border: "1px solid #2A2A2A",
            color: "#A0A0A0",
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          Maybe Later
        </button>
      </div>
    </div>
  );
}
