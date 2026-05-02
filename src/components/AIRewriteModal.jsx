// =============================================================
// src/components/AIRewriteModal.jsx
//
// In-builder AI bullet rewrite (Session C, Option B).
//
// Flow:
//   1. opened with the current bullets parsed from a role's `points`
//   2. picker phase: user chooses which bullet to rewrite (auto-skipped
//      when only one bullet exists)
//   3. loading phase: POST /api/ai?action=tailor with section=experience_bullet
//   4. alternatives phase: 3 distinct rewrites shown as radio cards
//   5. confirm: parent gets the chosen index + new line + remaining credits
//   6. close: nothing changes
//
// Credit gate matches Session B - free-tier 402 fires onAIExhausted();
// Pro / Express skip the gate. AbortController is intentionally omitted
// so the server-side audit row + refund logic remain authoritative
// (matches Session B's pattern). A close-during-loading guard prevents
// stale setState via cancelledRef.
//
// Visual: dark OLED palette per CLAUDE.md - #141414 surface, #2A2A2A
// border, amber #D97706 selection accents. Centered modal on >600px,
// bottom sheet on smaller screens. No emojis in the actual rendered
// surface (Sparkles icon only).
// =============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles, Loader2, X, AlertTriangle } from "lucide-react";
import { supabase } from "../appSupabaseClient";

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
  padding: 11px 13px 11px 14px;
  cursor: pointer;
  display: flex;
  gap: 10px;
  align-items: flex-start;
  text-align: left;
  color: #E5E5EA;
  font: inherit;
  font-size: 13px;
  line-height: 1.5;
  width: 100%;
  box-sizing: border-box;
  position: relative;
  transition: border-color 0.16s cubic-bezier(0.4,0,0.2,1), background-color 0.16s cubic-bezier(0.4,0,0.2,1);
}
.cvp-airw-card:hover:not(.is-selected) {
  border-color: #3A3A3A;
  background: #1F1F1F;
}
.cvp-airw-card.is-selected {
  border-color: #D97706;
  background: rgba(217,119,6,0.08);
}
.cvp-airw-card.is-selected::before {
  content: "";
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 3px;
  border-radius: 2px;
  background: #D97706;
}
.cvp-airw-radio {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  border: 1.5px solid #555;
  flex-shrink: 0;
  margin-top: 2.5px;
  display: grid;
  place-items: center;
  transition: border-color 0.16s cubic-bezier(0.4,0,0.2,1);
}
.cvp-airw-card.is-selected .cvp-airw-radio {
  border-color: #D97706;
}
.cvp-airw-radio-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #D97706;
}
.cvp-airw-footer {
  padding: 12px 18px 18px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-top: 1px solid #2A2A2A;
  flex-shrink: 0;
}
.cvp-airw-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  border: none;
  border-radius: 10px;
  padding: 12px 14px;
  background: #D97706;
  color: #0A0A0A;
  font-size: 13.5px;
  font-weight: 700;
  cursor: pointer;
  transition: background-color 0.16s cubic-bezier(0.4,0,0.2,1), opacity 0.16s cubic-bezier(0.4,0,0.2,1);
}
.cvp-airw-cta:hover:not(:disabled) { background: #B86405; }
.cvp-airw-cta:disabled { opacity: 0.4; cursor: not-allowed; }
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
.cvp-airw-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 32px 14px;
  text-align: center;
}
.cvp-airw-spin {
  animation: cvp-airw-spin 0.8s linear infinite;
  color: #D97706;
}
@keyframes cvp-airw-spin { to { transform: rotate(360deg); } }
.cvp-airw-status-text {
  color: #C0C0C5;
  font-size: 13.5px;
  font-weight: 500;
}
.cvp-airw-error-icon {
  color: #F87171;
}
.cvp-airw-error-text {
  color: #C0C0C5;
  font-size: 13px;
  line-height: 1.45;
  margin: 0;
}

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

function PickerPhase({ bullets, selectedIdx, onSelect, onContinue, onCancel, creditsRemaining }) {
  return (
    <>
      <div className="cvp-airw-body">
        <p className="cvp-airw-subhead">
          Which bullet should we rewrite? You'll see 3 alternatives next.
          {creditsRemaining !== null && creditsRemaining <= 1 && (
            <> Uses 1 credit.</>
          )}
        </p>
        <div className="cvp-airw-list">
          {bullets.map((b, i) => {
            const selected = selectedIdx === i;
            return (
              <button
                key={i}
                type="button"
                className={"cvp-airw-card" + (selected ? " is-selected" : "")}
                onClick={() => onSelect(i)}
                aria-pressed={selected}
              >
                <span className="cvp-airw-radio" aria-hidden="true">
                  {selected && <span className="cvp-airw-radio-dot" />}
                </span>
                <span>{b}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="cvp-airw-footer">
        <button
          type="button"
          className="cvp-airw-cta"
          disabled={selectedIdx == null}
          onClick={onContinue}
        >
          Continue
        </button>
        <button type="button" className="cvp-airw-link" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </>
  );
}

function LoadingPhase({ onCancel }) {
  return (
    <>
      <div className="cvp-airw-body">
        <div className="cvp-airw-status">
          <Loader2 size={28} strokeWidth={2.2} className="cvp-airw-spin" aria-hidden="true" />
          <div className="cvp-airw-status-text">Rewriting your bullet...</div>
        </div>
      </div>
      <div className="cvp-airw-footer">
        <button type="button" className="cvp-airw-link" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </>
  );
}

function AlternativesPhase({
  originalText,
  alternatives,
  selectedIdx,
  onSelect,
  onConfirm,
  onCancel,
}) {
  return (
    <>
      <div className="cvp-airw-body">
        <div className="cvp-airw-original">
          <div className="cvp-airw-original-label">Your original bullet</div>
          <div className="cvp-airw-original-text">{originalText}</div>
        </div>
        <p className="cvp-airw-subhead">Pick one to replace your bullet. The other two are discarded.</p>
        <div className="cvp-airw-list">
          {alternatives.map((alt, i) => {
            const selected = selectedIdx === i;
            return (
              <button
                key={i}
                type="button"
                className={"cvp-airw-card" + (selected ? " is-selected" : "")}
                onClick={() => onSelect(i)}
                aria-pressed={selected}
              >
                <span className="cvp-airw-radio" aria-hidden="true">
                  {selected && <span className="cvp-airw-radio-dot" />}
                </span>
                <span>{alt}</span>
              </button>
            );
          })}
        </div>
      </div>
      <div className="cvp-airw-footer">
        <button
          type="button"
          className="cvp-airw-cta"
          disabled={selectedIdx == null}
          onClick={onConfirm}
        >
          Use this rewrite
        </button>
        <button type="button" className="cvp-airw-link" onClick={onCancel}>
          Keep original
        </button>
      </div>
    </>
  );
}

function ErrorPhase({ message, onRetry, onCancel }) {
  return (
    <>
      <div className="cvp-airw-body">
        <div className="cvp-airw-status">
          <AlertTriangle size={28} strokeWidth={2.2} className="cvp-airw-error-icon" aria-hidden="true" />
          <p className="cvp-airw-error-text">{message || "AI is busy, please try again."}</p>
        </div>
      </div>
      <div className="cvp-airw-footer">
        <button type="button" className="cvp-airw-cta" onClick={onRetry}>
          Try again
        </button>
        <button type="button" className="cvp-airw-link" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </>
  );
}

export default function AIRewriteModal({
  isOpen,
  onClose,
  bullets,
  roleContext,            // { role, company, target_role }
  creditsRemaining,       // number | null
  onConfirm,              // (bulletIdx, newText) => void
  onAIRewriteSuccess,     // (creditsRemaining) => void
  onAIExhausted,          // () => void
}) {
  const [phase, setPhase] = useState("picker"); // picker | loading | alternatives | error
  const [selectedBulletIdx, setSelectedBulletIdx] = useState(null);
  const [alternatives, setAlternatives] = useState([]);
  const [selectedAltIdx, setSelectedAltIdx] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  // Guards stale setState from a fetch that resolves after the modal
  // has been closed. Set true on close, reset on open.
  const cancelledRef = useRef(false);

  const callAPI = useCallback(async (bulletIdx) => {
    if (bulletIdx == null || !bullets[bulletIdx]) return;
    setPhase("loading");
    setAlternatives([]);
    setSelectedAltIdx(null);
    setErrorMsg("");

    try {
      const { data: { session } = {} } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        if (cancelledRef.current) return;
        setErrorMsg("Please sign in again.");
        setPhase("error");
        return;
      }

      const res = await fetch("/api/ai?action=tailor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          section: "experience_bullet",
          input: {
            bullet: String(bullets[bulletIdx] || ""),
            role: String(roleContext?.role || ""),
            company: String(roleContext?.company || ""),
            target_role: String(roleContext?.target_role || ""),
          },
        }),
      });

      let data = {};
      try { data = await res.json(); } catch { /* leave empty */ }

      if (cancelledRef.current) return;

      if (res.status === 402) {
        // Free tier exhausted: close this modal, hand off to upgrade.
        if (onAIRewriteSuccess) onAIRewriteSuccess(0);
        if (onAIExhausted) onAIExhausted();
        onClose();
        return;
      }

      if (!res.ok || !data.ok || !Array.isArray(data.alternatives) || data.alternatives.length < 3) {
        setErrorMsg(data?.error || "AI is busy, please try again.");
        setPhase("error");
        return;
      }

      setAlternatives(data.alternatives.slice(0, 3));
      if (onAIRewriteSuccess) onAIRewriteSuccess(data.credits_remaining);
      setPhase("alternatives");
    } catch (e) {
      if (cancelledRef.current) return;
      setErrorMsg("AI is busy, please try again.");
      setPhase("error");
    }
  }, [bullets, roleContext, onAIRewriteSuccess, onAIExhausted, onClose]);

  // Open / close lifecycle. Resets state on open. If only one bullet,
  // auto-skip the picker.
  useEffect(() => {
    if (!isOpen) {
      cancelledRef.current = true;
      return;
    }
    cancelledRef.current = false;
    setSelectedBulletIdx(null);
    setAlternatives([]);
    setSelectedAltIdx(null);
    setErrorMsg("");
    if (Array.isArray(bullets) && bullets.length === 1) {
      setSelectedBulletIdx(0);
      callAPI(0);
    } else {
      setPhase("picker");
    }
  }, [isOpen, bullets, callAPI]);

  // Escape key closes when not loading.
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape" && phase !== "loading") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, phase, onClose]);

  if (!isOpen) return null;

  const titleByPhase =
    phase === "picker"       ? "Pick a bullet to rewrite"
    : phase === "loading"      ? "Rewriting"
    : phase === "alternatives" ? "Choose a rewrite"
    : phase === "error"        ? "Couldn't rewrite"
    : "";

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: AI_REWRITE_MODAL_CSS }} />
      <div
        className="cvp-airw-overlay"
        role="dialog"
        aria-modal="true"
        aria-label={titleByPhase}
        onClick={() => { if (phase !== "loading") onClose(); }}
      >
        <div className="cvp-airw-shell" onClick={(e) => e.stopPropagation()}>
          <div className="cvp-airw-header">
            <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
              <Sparkles size={15} strokeWidth={2.2} color="#D97706" aria-hidden="true" />
              <span className="cvp-airw-title">{titleByPhase}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {creditsRemaining !== null && (phase === "picker" || phase === "alternatives") && (
                <span className="cvp-airw-credits">{creditsRemaining} left</span>
              )}
              <button
                type="button"
                className="cvp-airw-close"
                onClick={onClose}
                disabled={phase === "loading"}
                aria-label="Close"
              >
                <X size={14} strokeWidth={2.2} />
              </button>
            </div>
          </div>

          {phase === "picker" && (
            <PickerPhase
              bullets={bullets}
              selectedIdx={selectedBulletIdx}
              onSelect={setSelectedBulletIdx}
              onContinue={() => callAPI(selectedBulletIdx)}
              onCancel={onClose}
              creditsRemaining={creditsRemaining}
            />
          )}

          {phase === "loading" && (
            <LoadingPhase onCancel={onClose} />
          )}

          {phase === "alternatives" && (
            <AlternativesPhase
              originalText={bullets[selectedBulletIdx] || ""}
              alternatives={alternatives}
              selectedIdx={selectedAltIdx}
              onSelect={setSelectedAltIdx}
              onConfirm={() => {
                if (selectedAltIdx == null) return;
                onConfirm(selectedBulletIdx, alternatives[selectedAltIdx]);
              }}
              onCancel={onClose}
            />
          )}

          {phase === "error" && (
            <ErrorPhase
              message={errorMsg}
              onRetry={() => {
                if (selectedBulletIdx != null) callAPI(selectedBulletIdx);
              }}
              onCancel={onClose}
            />
          )}
        </div>
      </div>
    </>
  );
}
