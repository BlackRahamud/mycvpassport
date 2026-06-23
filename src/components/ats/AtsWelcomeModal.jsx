import React from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Check, AlertTriangle, ArrowRight, X, Sparkles } from "lucide-react";

// One-time welcome shown on CV import (from=ats). Pure presentation over the
// Phase A resolution engine: the parent passes the ALREADY-evaluated partition
// ({fixed, todo} entries from partitionGapsByResolution), so every number and
// every line here is real. This component never computes or pads counts.
//
// HONESTY: the "fixed" list shows only genuinely-resolved gaps; if nothing was
// auto-fixed, that section is hidden. If nothing is left to do, the CTA flips to
// "Start editing" rather than inventing work.

const T = {
  bg: "#0A0A0A",
  surface: "#141414",
  elevated: "#1C1C1C",
  border: "#2A2A2A",
  text: "#FFFFFF",
  muted: "#A0A0A0",
  amber: "#D97706",
  green: "#1D9E75",
  greenBright: "#4ADE80",
};

const MAX_FIXED_SHOWN = 8;

export default function AtsWelcomeModal({ open, fixed = [], todo = [], onReview, onClose }) {
  const reduce = useReducedMotion();
  const fixedCount = fixed.length;
  const todoCount = todo.length;
  const hasTodo = todoCount > 0;
  const shownFixed = fixed.slice(0, MAX_FIXED_SHOWN);
  const extraFixed = fixedCount - shownFixed.length;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-label="CV import summary"
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            background: "rgba(0,0,0,0.66)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.26, ease: [0.4, 0, 0.2, 1] }}
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 460,
              maxHeight: "88vh",
              overflowY: "auto",
              background: T.surface,
              border: `1px solid ${T.border}`,
              borderRadius: 18,
              padding: "24px 22px 20px",
              position: "relative",
              boxShadow: "0 24px 60px -16px rgba(0,0,0,0.7)",
            }}
          >
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              style={{
                position: "absolute",
                top: 14,
                right: 14,
                width: 30,
                height: 30,
                borderRadius: 999,
                border: `1px solid ${T.border}`,
                background: T.elevated,
                color: T.muted,
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
              }}
            >
              <X size={14} />
            </button>

            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 11px", background: "rgba(29,158,117,0.12)", border: "1px solid rgba(29,158,117,0.35)", borderRadius: 999, marginBottom: 14, fontSize: 11, fontWeight: 700, letterSpacing: 0.8, textTransform: "uppercase", color: T.greenBright }}>
              <Sparkles size={12} aria-hidden /> CV imported
            </div>

            <h2 style={{ fontSize: 21, fontWeight: 800, color: T.text, margin: "0 0 8px", letterSpacing: "-0.02em", lineHeight: 1.25 }}>
              We rebuilt your CV in a clean ATS format.
            </h2>
            <p style={{ fontSize: 14, color: T.muted, margin: "0 0 20px", lineHeight: 1.5 }}>
              <strong style={{ color: T.greenBright }}>{fixedCount} fixed automatically</strong>
              {hasTodo ? (
                <>
                  {" "}·{" "}
                  <strong style={{ color: T.amber }}>{todoCount} to improve</strong>
                </>
              ) : (
                " · nothing left — your CV is ATS-clean."
              )}
            </p>

            {/* FIXED AUTOMATICALLY — only genuine ✓ */}
            {fixedCount > 0 && (
              <section style={{ marginBottom: hasTodo ? 18 : 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                  <Check size={14} color={T.green} aria-hidden />
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: T.greenBright }}>
                    Fixed automatically
                  </span>
                </div>
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 7 }}>
                  {shownFixed.map(({ gap, ev }) => (
                    <li key={gap.id} style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 13, color: "#C8C8C8", lineHeight: 1.4 }}>
                      <Check size={13} color={T.green} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
                      <span>
                        {gap.label}
                        {ev?.reason && <span style={{ display: "block", fontSize: 11, color: "#6B6B6B", marginTop: 1 }}>{ev.reason}</span>}
                      </span>
                    </li>
                  ))}
                  {extraFixed > 0 && (
                    <li style={{ fontSize: 12, color: T.muted, paddingLeft: 22 }}>+{extraFixed} more</li>
                  )}
                </ul>
              </section>
            )}

            {/* STILL NEEDS YOUR ATTENTION — real unresolved gaps */}
            {hasTodo && (
              <section style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
                  <AlertTriangle size={14} color={T.amber} aria-hidden />
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", color: T.amber }}>
                    Still needs your attention
                  </span>
                </div>
                <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 7 }}>
                  {todo.map(({ gap, ev }) => (
                    <li key={gap.id} style={{ display: "flex", alignItems: "flex-start", gap: 9, fontSize: 13, color: T.text, lineHeight: 1.4 }}>
                      <span aria-hidden style={{ flexShrink: 0, marginTop: 6, width: 5, height: 5, borderRadius: "50%", background: gap.weight === "high" ? "#F87171" : T.amber }} />
                      <span>
                        {ev?.reason || gap.label}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <button
              type="button"
              onClick={hasTodo ? onReview : onClose}
              style={{
                width: "100%",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                background: T.amber,
                color: "#fff",
                border: "none",
                borderRadius: 12,
                padding: "14px 18px",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "inherit",
                letterSpacing: "-0.01em",
                boxShadow: "0 0 0 1px rgba(217,119,6,0.4) inset, 0 0 24px rgba(217,119,6,0.18)",
              }}
            >
              {hasTodo ? "Review what's left" : "Start editing"}
              <ArrowRight size={16} aria-hidden />
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
