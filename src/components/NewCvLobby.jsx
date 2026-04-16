import { useEffect } from "react";

const EASE = "cubic-bezier(0.4,0,0.2,1)";

/* ─── Icons ─── */
function IconLayers({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}

function IconArrowRight({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
    </svg>
  );
}

function IconX({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6L6 18" /><path d="M6 6l12 12" />
    </svg>
  );
}

const STEPS = [
  "Personal details + job title",
  "Experience + key achievements",
  "Skills + ATS optimization",
];

export default function NewCvLobby({ onGuided, onBuildMyself, onClose }) {
  /* Lock body scroll while lobby is visible */
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-cv-lobby-title"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 500,
        background: "#000000",
        color: "#FFFFFF",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <style>{`
        @property --ncl-angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        @keyframes ats-spin-border { to { --ncl-angle: 360deg; } }
      `}</style>

      {/* Close button */}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            width: 36,
            height: 36,
            borderRadius: 999,
            background: "#0A0A0A",
            border: "1px solid #1A1A1A",
            color: "#888",
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
            fontFamily: "inherit",
            padding: 0,
            zIndex: 2,
            transition: `color 150ms ${EASE}, border-color 150ms ${EASE}`,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "#2A2A2A"; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = "#888"; e.currentTarget.style.borderColor = "#1A1A1A"; }}
        >
          <IconX />
        </button>
      )}

      {/* Centered column */}
      <div
        style={{
          minHeight: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "56px 20px 40px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ width: "100%", maxWidth: 400, display: "flex", flexDirection: "column" }}>

          {/* Title */}
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div id="new-cv-lobby-title" style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.4px", color: "#FFFFFF" }}>
              Let&apos;s build your CV
            </div>
            <div style={{ fontSize: 13, color: "#888888", marginTop: 6, lineHeight: 1.5 }}>
              Pick how you want to start.
            </div>
          </div>

          {/* ─── GUIDED MODE — Hero card with spinning conic border ─── */}
          <div style={{ position: "relative", borderRadius: 18, marginBottom: 18 }}>
            {/* Spinning conic ring */}
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: 18,
                padding: 1.5,
                background: "conic-gradient(from var(--ncl-angle, 0deg), transparent 60%, rgba(255,255,255,0.55) 80%, transparent 100%)",
                WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
                WebkitMaskComposite: "xor",
                maskComposite: "exclude",
                pointerEvents: "none",
                animation: "ats-spin-border 4s linear infinite",
              }}
            />

            {/* Card surface */}
            <div
              style={{
                position: "relative",
                background: "#0A0A0A",
                border: "1px solid #1A1A1A",
                borderRadius: 18,
                padding: 22,
                overflow: "hidden",
              }}
            >
              {/* Recommended badge */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  color: "#FFB800",
                  background: "rgba(255,184,0,0.1)",
                  border: "1px solid rgba(255,184,0,0.25)",
                  borderRadius: 999,
                  padding: "4px 9px",
                  marginBottom: 16,
                }}
              >
                <span style={{ width: 4, height: 4, borderRadius: 999, background: "#FFB800" }} />
                RECOMMENDED
              </div>

              {/* Icon */}
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: "#141414",
                  border: "1px solid #1F1F1F",
                  display: "grid",
                  placeItems: "center",
                  color: "#FFFFFF",
                  marginBottom: 14,
                }}
              >
                <IconLayers size={22} />
              </div>

              {/* Title */}
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.4px", color: "#FFFFFF", marginBottom: 8 }}>
                Guided Mode
              </div>

              {/* Sub */}
              <div style={{ fontSize: 13, color: "#888888", lineHeight: 1.55, marginBottom: 20 }}>
                Answer a few questions — we build a recruiter-ready CV for GCC in under 5 minutes.
              </div>

              {/* Numbered steps */}
              <div style={{ display: "grid", gap: 10, marginBottom: 22 }}>
                {STEPS.map((text, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 999,
                        background: "#141414",
                        border: "1px solid #1F1F1F",
                        display: "grid",
                        placeItems: "center",
                        fontSize: 11,
                        fontWeight: 700,
                        color: "#FFFFFF",
                        flexShrink: 0,
                      }}
                    >
                      {i + 1}
                    </div>
                    <span style={{ fontSize: 13, color: "#BBBBBB", lineHeight: 1.5 }}>{text}</span>
                  </div>
                ))}
              </div>

              {/* White CTA */}
              <button
                type="button"
                onClick={onGuided}
                style={{
                  width: "100%",
                  background: "#FFFFFF",
                  color: "#000000",
                  border: "none",
                  borderRadius: 12,
                  padding: "14px 18px",
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: "-0.1px",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: `opacity 150ms ${EASE}, transform 150ms ${EASE}`,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.98)"; }}
                onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
              >
                Start Guided Build <IconArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* "or" divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "4px 0 14px" }}>
            <div style={{ flex: 1, height: 1, background: "#1A1A1A" }} />
            <div style={{ fontSize: 11, color: "#555", letterSpacing: "0.08em", textTransform: "uppercase" }}>or</div>
            <div style={{ flex: 1, height: 1, background: "#1A1A1A" }} />
          </div>

          {/* ─── BUILD IT MYSELF — Dark shimmer ─── */}
          <div
            style={{
              borderRadius: 12,
              padding: "1.5px",
              background: "linear-gradient(90deg, #0A0A0A 0%, #0A0A0A 20%, rgba(255,255,255,0.18) 50%, #0A0A0A 80%, #0A0A0A 100%)",
              backgroundSize: "300% 100%",
              animation: "cvp-dl-shimmer 3s linear infinite",
              display: "block",
            }}
          >
            <button
              type="button"
              onClick={onBuildMyself}
              style={{
                width: "100%",
                background: "#0A0A0A",
                color: "#888888",
                border: "none",
                borderRadius: 11,
                padding: "14px 18px",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                display: "block",
                transition: `color 150ms ${EASE}, opacity 150ms ${EASE}`,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#DDDDDD"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#888888"; }}
            >
              Build it myself
            </button>
          </div>

          {/* Fine print */}
          <div
            style={{
              textAlign: "center",
              fontSize: 11,
              color: "#555555",
              lineHeight: 1.5,
              marginTop: 14,
            }}
          >
            Turn guided mode on/off anytime via the FAB button
          </div>
        </div>
      </div>
    </div>
  );
}
