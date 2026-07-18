import React from "react";
import { motion, useReducedMotion } from "framer-motion";

// =============================================================
// CompletionStrip — the builder's progress rail, design pass 2.
//
// The design's rail: one quiet line (label left, amber percent right)
// over a 6px amber bar. No blue, no nudge pill, no breakdown popover,
// no count-up scoreboard — those were the old card and are deliberately
// gone. Export lives in the bottom action bar; the rail only tells her
// where she is. Amber fill flips green at 100%.
//
// Props kept API-compatible with the old strip (onDownload /
// onOpenSection / onNudgeAction are accepted and unused) so BuilderPage
// call sites did not need to move.
// =============================================================

const EASE = [0.4, 0, 0.2, 1];

export default function CompletionStrip({
  progress,
  resume: _resume,
  onDownload: _onDownload,
  onOpenSection: _onOpenSection,
  onNudgeAction: _onNudgeAction,
  saveState = null,   // "saving" | "saved" | null
  savedLabel = "",    // "Saved just now" / "Saved 2m ago"
  stickyTop = 0,
}) {
  const reduce = useReducedMotion();
  const { percent, label } = progress;
  const isComplete = percent >= 100;
  const railLabel = isComplete ? "Ready to send" : label;

  return (
    <div
      style={{
        position: "sticky",
        top: stickyTop,
        zIndex: 50,
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: 13,
        padding: "11px 15px 12px",
        marginBottom: 14,
        boxSizing: "border-box",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-primary)", display: "inline-flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          {railLabel}
          {/* Autosave — the work IS persisted; show it, don't make them wonder. */}
          {(saveState || savedLabel) && (
            <span
              aria-live="polite"
              style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 500, color: "var(--text-muted)", whiteSpace: "nowrap" }}
            >
              <span aria-hidden="true" style={{ color: "var(--border)" }}>·</span>
              <span
                aria-hidden="true"
                className={saveState === "saving" && !reduce ? "cvp-savedot cvp-savedot--busy" : "cvp-savedot"}
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: saveState === "saving" ? "var(--accent)" : "var(--success)",
                  flexShrink: 0,
                }}
              />
              {saveState === "saving" ? "Saving" : savedLabel || "Saved"}
            </span>
          )}
        </span>
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: isComplete ? "var(--success-text)" : "var(--accent-text)",
            fontVariantNumeric: "tabular-nums",
            flexShrink: 0,
          }}
        >
          {Math.max(0, Math.min(100, Math.round(percent)))}%
        </span>
      </div>
      <div style={{ position: "relative", height: 6, borderRadius: 999, background: "var(--builder-fill)", overflow: "hidden" }}>
        <motion.div
          initial={false}
          animate={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
          transition={reduce ? { duration: 0 } : { duration: 0.62, ease: EASE }}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            bottom: 0,
            borderRadius: 999,
            background: isComplete ? "var(--success)" : "var(--accent)",
          }}
        />
      </div>
    </div>
  );
}
