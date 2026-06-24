// =============================================================
// src/components/AIRewriteModal.jsx
//
// Slim, results-only "choose a rewrite" panel for the direct
// Improve-with-AI flow. The over-stepped pick-a-bullet -> Continue ->
// spinner -> choose -> confirm flow is gone: generation now happens on
// the field itself (AIWorkingGlow ring) before this panel ever mounts,
// and selection is COMMITTED ON CLICK — clicking a card applies that
// rewrite to the whole description and closes the panel immediately.
//
// This component is purely presentational. It owns no API call and no
// loading phase (useAiImprove drives generation). It opens only once the
// three full alternatives have returned.
//
// Behaviour:
//   - Each alternative is a click-to-commit card. One click = onPick(text).
//     There is no hover-selection and no separate confirm button, so a
//     choice can never be lost by moving the cursor.
//   - "Keep original" is a secondary text link (onKeepOriginal).
//   - Escape / overlay click closes (onClose) without changing anything.
//
// Visual: OLED palette per CLAUDE.md — #141414 surface, #2A2A2A border —
// with the v1.2 amber accent (#EF9F27) on the active/hover card edge.
// Centered modal >600px, bottom sheet below.
// =============================================================

import { useEffect } from "react";
import { Sparkles, X } from "lucide-react";

const AMBER = "#EF9F27";

const AI_REWRITE_MODAL_CSS = `
.cvp-airw-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.cvp-airw-shell {
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  background: #141414;
  border: 1px solid #2A2A2A;
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(0,0,0,0.6);
}
.cvp-airw-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px 12px;
  border-bottom: 1px solid #2A2A2A;
}
.cvp-airw-title {
  color: #FFFFFF;
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.2px;
}
.cvp-airw-credits {
  color: #A0A0A0;
  font-size: 11.5px;
  font-weight: 500;
}
.cvp-airw-close {
  border: 1px solid #2A2A2A;
  background: #1C1C1C;
  color: #A0A0A0;
  border-radius: 8px;
  width: 30px;
  height: 30px;
  cursor: pointer;
  display: grid;
  place-items: center;
  flex-shrink: 0;
  transition: color 0.16s cubic-bezier(0.4,0,0.2,1), border-color 0.16s cubic-bezier(0.4,0,0.2,1);
}
.cvp-airw-close:hover { color: #FFFFFF; border-color: #3A3A3A; }
.cvp-airw-body {
  padding: 14px 18px 0;
  overflow-y: auto;
  flex: 1;
}
.cvp-airw-subhead {
  color: #A0A0A0;
  font-size: 12.5px;
  margin: 0 0 12px;
  line-height: 1.45;
}
.cvp-airw-original {
  background: #1C1C1C;
  border: 1px solid #2A2A2A;
  border-radius: 10px;
  padding: 10px 12px;
  margin-bottom: 12px;
}
.cvp-airw-original-label {
  color: #6E6E73;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  margin-bottom: 4px;
}
.cvp-airw-original-text {
  color: #C0C0C5;
  font-size: 12.5px;
  line-height: 1.5;
  white-space: pre-wrap;
}
.cvp-airw-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0 0 12px;
}
.cvp-airw-card {
  background: #1C1C1C;
  border: 1px solid #2A2A2A;
  border-radius: 12px;
  padding: 12px 14px;
  cursor: pointer;
  display: block;
  text-align: left;
  color: #E5E5EA;
  font: inherit;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  width: 100%;
  box-sizing: border-box;
  position: relative;
  transition: border-color 0.16s cubic-bezier(0.4,0,0.2,1), background-color 0.16s cubic-bezier(0.4,0,0.2,1), transform 0.12s cubic-bezier(0.4,0,0.2,1);
}
.cvp-airw-card:hover {
  border-color: ${AMBER};
  background: rgba(239,159,39,0.08);
}
.cvp-airw-card:active { transform: scale(0.992); }
.cvp-airw-card-num {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #6E6E73;
  font-size: 10.5px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: 6px;
}
.cvp-airw-card:hover .cvp-airw-card-num { color: ${AMBER}; }
.cvp-airw-card-apply {
  margin-left: auto;
  color: ${AMBER};
  opacity: 0;
  transition: opacity 0.16s cubic-bezier(0.4,0,0.2,1);
}
.cvp-airw-card:hover .cvp-airw-card-apply { opacity: 1; }
.cvp-airw-footer {
  padding: 12px 18px 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-top: 1px solid #2A2A2A;
  flex-shrink: 0;
}
.cvp-airw-link {
  background: transparent;
  border: none;
  color: #A0A0A0;
  font-size: 12.5px;
  cursor: pointer;
  padding: 6px;
  text-align: center;
  transition: color 0.16s cubic-bezier(0.4,0,0.2,1);
}
.cvp-airw-link:hover { color: #FFFFFF; }

@media (max-width: 600px) {
  .cvp-airw-overlay { padding: 0; align-items: flex-end; }
  .cvp-airw-shell {
    max-width: 100%;
    max-height: 90vh;
    border-radius: 16px 16px 0 0;
    border-bottom: none;
  }
}
`;

export default function AIRewriteModal({
  isOpen,
  onClose,
  original = "",
  options = [],          // string[3] — full rewritten descriptions
  creditsRemaining,      // number | null
  onPick,                // (newText) => void — commit on click
  onKeepOriginal,        // () => void — secondary text link
}) {
  // Escape closes. Listed unconditionally; the hook bails when closed.
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const list = Array.isArray(options) ? options.slice(0, 3) : [];

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: AI_REWRITE_MODAL_CSS }} />
      <div
        className="cvp-airw-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="Choose a rewrite"
        onClick={onClose}
      >
        <div className="cvp-airw-shell" onClick={(e) => e.stopPropagation()}>
          <div className="cvp-airw-header">
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <Sparkles size={15} strokeWidth={2.2} color={AMBER} aria-hidden="true" />
              <span className="cvp-airw-title">Choose a rewrite</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {creditsRemaining != null && (
                <span className="cvp-airw-credits">{creditsRemaining} left</span>
              )}
              <button type="button" className="cvp-airw-close" onClick={onClose} aria-label="Close">
                <X size={14} strokeWidth={2.2} />
              </button>
            </div>
          </div>

          <div className="cvp-airw-body">
            {original ? (
              <div className="cvp-airw-original">
                <div className="cvp-airw-original-label">Your current version</div>
                <div className="cvp-airw-original-text">{original}</div>
              </div>
            ) : null}
            <p className="cvp-airw-subhead">Tap a version to apply it. This replaces your description.</p>
            <div className="cvp-airw-list">
              {list.map((alt, i) => (
                <button
                  key={i}
                  type="button"
                  className="cvp-airw-card"
                  onClick={() => onPick(alt)}
                >
                  <span className="cvp-airw-card-num">
                    Option {i + 1}
                    <span className="cvp-airw-card-apply">Apply →</span>
                  </span>
                  {alt}
                </button>
              ))}
            </div>
          </div>

          <div className="cvp-airw-footer">
            <button
              type="button"
              className="cvp-airw-link"
              onClick={onKeepOriginal || onClose}
            >
              Keep original
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
