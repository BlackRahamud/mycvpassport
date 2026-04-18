import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import ATSChecker from "../ATSChecker";
import { detectRole } from "../utils/detectRole";
import { getFabMemory } from "../components/FAB/FABLogic";

const EASE = "cubic-bezier(0.4,0,0.2,1)";

export default function ATSPage({ onBack }) {
  const navigate = useNavigate();
  const enteredAtRef = useRef(typeof Date !== "undefined" ? Date.now() : 0);
  const [showCoverLetterJourney, setShowCoverLetterJourney] = useState(false);

  const handleResultsVisible = useCallback(() => {}, []);

  useEffect(() => {
    const t0 = enteredAtRef.current;
    const tick = () => {
      const m = getFabMemory();
      if (m.lastAction !== "ats_checked" || !m.lastActionAt) return;
      const ts = Date.parse(m.lastActionAt);
      if (Number.isFinite(ts) && ts >= t0 - 2000) setShowCoverLetterJourney(true);
    };
    tick();
    const id = window.setInterval(tick, 400);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div style={{ position: "relative", background: "#0A0A0A", minHeight: "100vh" }}>
      <button
        type="button"
        onClick={onBack}
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          zIndex: 10,
          background: "none",
          border: "none",
          padding: "6px 8px",
          color: "#A0A0A0",
          fontSize: 13,
          fontWeight: 500,
          cursor: "pointer",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          transition: `color 150ms ${EASE}`,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "#A0A0A0"; }}
      >
        ← Back
      </button>
      <ATSChecker onBack={onBack} detectRole={detectRole} onResultsVisible={handleResultsVisible} />

      {showCoverLetterJourney ? (
        <div
          style={{
            maxWidth: 850,
            margin: "0 auto",
            padding: "0 20px 48px",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              padding: 16,
              borderRadius: 12,
              border: "1px solid #2A2A2A",
              background: "#141414",
              display: "grid",
              gap: 10,
            }}
          >
            <p style={{ margin: 0, fontSize: 15, color: "#E5E5E5", lineHeight: 1.45, fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>
              ATS done. Stand out with a Cover Letter. Pro includes tailored letters — or open the builder to use Job Match.
            </p>
            <button
              type="button"
              onClick={() => navigate("/builder", { state: { cvpBuilderTab: "jobmatch" } })}
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: 8,
                border: "none",
                background: "#FFFFFF",
                color: "#000000",
                fontWeight: 600,
                fontSize: 15,
                cursor: "pointer",
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                transition: `opacity 150ms ${EASE}`,
              }}
              onMouseEnter={(ev) => {
                ev.currentTarget.style.opacity = "0.92";
              }}
              onMouseLeave={(ev) => {
                ev.currentTarget.style.opacity = "1";
              }}
            >
              Create Cover Letter →
            </button>
            <button
              type="button"
              onClick={() => navigate("/pricing")}
              style={{
                background: "none",
                border: "none",
                color: "#888888",
                fontSize: 13,
                textDecoration: "underline",
                cursor: "pointer",
                padding: 4,
                fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
              }}
            >
              Upgrade to Pro for full Cover Letter
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
