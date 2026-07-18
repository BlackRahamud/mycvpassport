import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useReducedMotion } from "framer-motion";
import { SECTIONS as CV_PROGRESS_SECTIONS } from "../hooks/useCvProgress";
import { splitCommaItems } from "../cvShared";

// useCvProgress section id → ( setOpenSection target , DOM selector to scroll to )
// Personal-info-card sub-fields (fullName/email/phone) don't toggle an
// accordion; they just scroll to the always-visible card at the top.
const NUDGE_TARGETS = {
  fullName:   { open: null,           dom: ".cvp-builder-personal-card" },
  email:      { open: null,           dom: ".cvp-builder-personal-card" },
  phone:      { open: null,           dom: ".cvp-builder-personal-card" },
  summary:    { open: "summary",      dom: '[data-cvp-accordion="summary"]' },
  experience: { open: "experience",   dom: '[data-cvp-accordion="experience"]' },
  education:  { open: "education",    dom: '[data-cvp-accordion="education"]' },
  skills:     { open: "competencies", dom: '[data-cvp-accordion="competencies"]' },
  extras:     { open: "languages",    dom: '[data-cvp-accordion="languages"]' },
};

const NUDGE_LABEL = {
  fullName:   "Add your name",
  email:      "Add an email",
  phone:      "Add a phone",
  summary:    "Add a summary",
  experience: "Add experience",
  education:  "Add education",
  skills:     "Add 3 skills",
  extras:     "Add languages",
};

function pickTopMissing(resume) {
  const missing = CV_PROGRESS_SECTIONS
    .filter((s) => !s.isComplete(resume))
    .sort((a, b) => b.weight - a.weight);
  return missing[0] ?? null;
}

const EASE = [0.4, 0, 0.2, 1];

/* Percentage that counts up/down to its new value instead of snapping.
   Reduced motion sets the number directly. */
function CountUpPercent({ value, reduce, color }) {
  const [display, setDisplay] = useState(Math.round(value));
  const prevRef = useRef(value);
  useEffect(() => {
    if (reduce) { setDisplay(Math.round(value)); prevRef.current = value; return undefined; }
    const controls = animate(prevRef.current, value, {
      duration: 0.35,
      ease: EASE,
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    prevRef.current = value;
    return () => controls.stop();
  }, [value, reduce]);
  return (
    <span
      style={{
        fontSize: 21,
        fontWeight: 700,
        lineHeight: 1,
        color,
        letterSpacing: "-0.5px",
        fontFamily: "inherit",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {display}%
    </span>
  );
}

export default function CompletionStrip({
  progress,
  resume,
  onDownload,
  onOpenSection,
  onNudgeAction,
  saveState = null,   // "saving" | "saved" | null
  savedLabel = "",    // "Saved just now" / "Saved 2m ago"
  stickyTop = 0,
}) {
  const reduce = useReducedMotion();
  const { percent, label, completedSections } = progress;
  const isComplete = percent >= 100;
  const topMissing = pickTopMissing(resume);

  // Section-flip detection — pulse only when a section transitions from
  // incomplete → complete (not on every keystroke). Tracks the size of
  // the completedSections array; bumping pulseKey re-mounts the motion
  // ring so its initial animation re-runs.
  const prevCompletedCountRef = useRef(completedSections.length);
  const [pulseKey, setPulseKey] = useState(0);
  useEffect(() => {
    if (completedSections.length > prevCompletedCountRef.current) {
      setPulseKey((k) => k + 1);
    }
    prevCompletedCountRef.current = completedSections.length;
  }, [completedSections.length]);

  // Breakdown disclosure (replaces the deleted 42px ring tooltip).
  // Dismissal must work on TOUCH: iOS Safari only synthesizes mousedown on
  // interactive elements, so a tap on the plain form never closed the
  // panel — pointerdown fires universally. Esc closes too.
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const wrapRef = useRef(null);
  useEffect(() => {
    if (!breakdownOpen) return undefined;
    const onPointerOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setBreakdownOpen(false);
      }
    };
    const onKey = (e) => { if (e.key === "Escape") setBreakdownOpen(false); };
    const t = window.setTimeout(() => {
      document.addEventListener("pointerdown", onPointerOutside);
      document.addEventListener("keydown", onKey);
    }, 10);
    return () => {
      clearTimeout(t);
      document.removeEventListener("pointerdown", onPointerOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [breakdownOpen]);

  const handleNudgeClick = () => {
    if (!topMissing) return;
    const target = NUDGE_TARGETS[topMissing.id];
    if (!target) return;
    if (target.open && typeof onOpenSection === "function") onOpenSection(target.open);
    const delay = target.open ? 100 : 0;
    window.setTimeout(() => {
      const el = document.querySelector(target.dom);
      if (!el) return;
      // Account for the sticky topbar (stickyTop) + this sticky strip
      // (~70px). Without scroll-margin, the target lands behind both.
      el.style.scrollMarginTop = `${stickyTop + 70}px`;
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      // Brief highlight so the eye lands where the click took you.
      el.classList.add("cvp-section-pulse");
      window.setTimeout(() => el.classList.remove("cvp-section-pulse"), 1100);
    }, delay);
    // One click = the whole action: for entry sections the caller also
    // opens the new-entry editor (a scroll alone reads as a dead click).
    if (typeof onNudgeAction === "function") {
      window.setTimeout(() => onNudgeAction(topMissing.id), delay + 260);
    }
  };

  return (
    <div
      ref={wrapRef}
      style={{
        position: "sticky",
        top: stickyTop,
        zIndex: 50,
        // FULLY OPAQUE token surface. The old rgba(…,0.94)+blur let the
        // section titles scrolling underneath ghost through on iOS
        // (backdrop-filter is unreliable there) — the "Add experience →
        // over Professional Experience" garble from the walkthrough.
        background: "var(--bg-elevated, #1C1C1C)",
        border: "1px solid var(--border-default, #2A2A2A)",
        borderRadius: 14,
        padding: "10px 14px",
        marginBottom: 14,
        display: "flex",
        alignItems: "center",
        gap: 13,
        flexWrap: "wrap",
        // Fixed row height while docked — content changes (label text, CTA
        // swap) must not make the card jump under the cursor mid-scroll.
        minHeight: 58,
        boxSizing: "border-box",
        boxShadow: "0 1px 0 rgba(255,255,255,0.04) inset, 0 12px 32px -18px rgba(0,0,0,0.8)",
      }}
    >
      {/* Section-flip pulse — re-mounted on each pulseKey bump */}
      {pulseKey > 0 && !reduce && (
        <motion.div
          key={`cvp-strip-pulse-${pulseKey}`}
          initial={{ opacity: 0.55, scale: 0.985 }}
          animate={{ opacity: 0, scale: 1.025 }}
          transition={{ duration: 0.8, ease: EASE }}
          style={{
            position: "absolute",
            inset: -1,
            borderRadius: 12,
            border: `1px solid ${isComplete ? "rgba(34,197,94,0.45)" : "rgba(59,130,246,0.45)"}`,
            pointerEvents: "none",
          }}
          aria-hidden
        />
      )}

      {/* Percent (counts up/down) + label + autosave state */}
      <div style={{ display: "flex", flexDirection: "column", minWidth: 104, flexShrink: 0 }}>
        <CountUpPercent value={percent} reduce={reduce} color={isComplete ? "var(--success)" : "var(--text-primary, #FFFFFF)"} />
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 500,
            color: "var(--text-secondary, #A0A0A0)",
            marginTop: 3,
            letterSpacing: "0.02em",
            fontFamily: "inherit",
            whiteSpace: "nowrap",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {label}
          {/* Autosave — the work IS persisted; show it, don't make them wonder. */}
          {(saveState || savedLabel) && (
            <span
              aria-live="polite"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                color: "var(--text-muted, #7A7A82)",
                whiteSpace: "nowrap",
              }}
            >
              <span aria-hidden="true" style={{ color: "var(--border-default, #2A2A2A)" }}>·</span>
              <span
                aria-hidden="true"
                className={saveState === "saving" && !reduce ? "cvp-savedot cvp-savedot--busy" : "cvp-savedot"}
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: saveState === "saving" ? "var(--color-accent, #D97706)" : "var(--success)",
                  flexShrink: 0,
                }}
              />
              {saveState === "saving" ? "Saving…" : savedLabel || "Saved"}
            </span>
          )}
        </span>
      </div>

      {/* Fill bar — brand amber gradient, flipping to green at 100%. */}
      <div style={{ flex: 1, minWidth: 80 }}>
        <div
          style={{
            height: 5,
            borderRadius: 999,
            background: "rgba(255,255,255,0.07)",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <motion.div
            initial={false}
            animate={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
            transition={reduce ? { duration: 0 } : { duration: 0.35, ease: EASE }}
            style={{
              height: "100%",
              borderRadius: 999,
              background: isComplete
                ? "linear-gradient(90deg, #16A34A 0%, #4ADE80 100%)"
                : "linear-gradient(90deg, #B45309 0%, #D97706 55%, #F59E0B 100%)",
              boxShadow: isComplete
                ? "0 0 12px rgba(34,197,94,0.4)"
                : "0 0 10px rgba(217,119,6,0.28)",
            }}
          />
        </div>
      </div>

      {/* Right action: nudge below 100%, Download at 100% */}
      {!isComplete && topMissing ? (
        <button
          type="button"
          onClick={handleNudgeClick}
          style={{
            background: "rgba(59,130,246,0.10)",
            border: "1px solid rgba(59,130,246,0.30)",
            color: "var(--info)",
            fontSize: 12,
            fontWeight: 600,
            padding: "7px 12px",
            borderRadius: 999,
            cursor: "pointer",
            fontFamily: "inherit",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            flexShrink: 0,
            transition:
              "background-color 160ms cubic-bezier(0.4,0,0.2,1), border-color 160ms cubic-bezier(0.4,0,0.2,1)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(59,130,246,0.18)";
            e.currentTarget.style.borderColor = "rgba(59,130,246,0.45)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(59,130,246,0.10)";
            e.currentTarget.style.borderColor = "rgba(59,130,246,0.30)";
          }}
        >
          <span>{NUDGE_LABEL[topMissing.id] ?? "Continue"}</span>
          <span aria-hidden="true">→</span>
        </button>
      ) : isComplete ? (
        <button
          type="button"
          onClick={onDownload}
          style={{
            background: "var(--accent)",
            border: "none",
            color: "var(--bg)",
            fontSize: 12,
            fontWeight: 700,
            padding: "8px 14px",
            borderRadius: 999,
            cursor: "pointer",
            fontFamily: "inherit",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            flexShrink: 0,
            boxShadow: "0 0 14px rgba(217,119,6,0.35)",
            transition: "filter 160ms cubic-bezier(0.4,0,0.2,1)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.filter = "brightness(0.94)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.filter = "none"; }}
        >
          <span>Download CV</span>
          <span aria-hidden="true">→</span>
        </button>
      ) : null}

      {/* Breakdown disclosure trigger */}
      <button
        type="button"
        aria-label="CV completion breakdown"
        aria-expanded={breakdownOpen}
        onClick={() => setBreakdownOpen((v) => !v)}
        style={{
          background: "transparent",
          border: "none",
          color: "var(--text-muted)",
          cursor: "pointer",
          padding: 4,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          fontFamily: "inherit",
        }}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            transform: breakdownOpen ? "rotate(180deg)" : "none",
            transition: "transform 160ms cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Breakdown panel — same checklist the deleted 42px ring tooltip
          showed, just full-width below the strip instead of a 200px popover */}
      <AnimatePresence>
      {breakdownOpen && (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0, transition: { duration: 0.1 } } : { opacity: 0, y: -4, transition: { duration: 0.14, ease: EASE } }}
          transition={reduce ? { duration: 0 } : { duration: 0.18, ease: EASE }}
          style={{
            // IN FLOW, not an overlay: a full-width child of the wrapping
            // strip sits below every row — the old absolute panel covered
            // the strip's own CTA/chevron on narrow phones (undismissable).
            flexBasis: "100%",
            width: "100%",
            background: "var(--bg-elevated, #1C1C1C)",
            border: "1px solid var(--border-default, #2A2A2A)",
            borderRadius: 12,
            padding: 12,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--info)",
              marginBottom: 8,
              letterSpacing: "0.02em",
            }}
          >
            CV Completion Breakdown
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", columnGap: 12 }}>
            {CV_PROGRESS_SECTIONS.map((sec) => {
              const ok = sec.isComplete(resume);
              const skillCount = splitCommaItems(resume.skills).length;
              const needSkills = Math.max(0, 3 - skillCount);
              const warnContent =
                !ok && sec.id === "skills" && needSkills > 0
                  ? String(needSkills)
                  : !ok
                  ? "!"
                  : "✓";
              return (
                <div
                  key={sec.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    fontSize: 11,
                    color: "var(--text-secondary)",
                    padding: "3px 0",
                  }}
                >
                  <span
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 8,
                      flexShrink: 0,
                      background: ok ? "rgba(74,222,128,0.15)" : "rgba(59,130,246,0.12)",
                      color: ok ? "var(--success)" : "var(--info)",
                    }}
                  >
                    {ok ? "✓" : warnContent}
                  </span>
                  {sec.completedLabel}
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
