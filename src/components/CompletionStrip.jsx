import React, { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
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
};

const NUDGE_LABEL = {
  fullName:   "Add your name",
  email:      "Add an email",
  phone:      "Add a phone",
  summary:    "Add a summary",
  experience: "Add experience",
  education:  "Add education",
  skills:     "Add 3 skills",
};

function pickTopMissing(resume) {
  const missing = CV_PROGRESS_SECTIONS
    .filter((s) => !s.isComplete(resume))
    .sort((a, b) => b.weight - a.weight);
  return missing[0] ?? null;
}

const EASE = [0.4, 0, 0.2, 1];

export default function CompletionStrip({ progress, resume, onDownload, onOpenSection }) {
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

  // Breakdown disclosure (replaces the deleted 42px ring tooltip)
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const wrapRef = useRef(null);
  useEffect(() => {
    if (!breakdownOpen) return;
    const onClickOutside = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setBreakdownOpen(false);
      }
    };
    const t = window.setTimeout(() => document.addEventListener("mousedown", onClickOutside), 10);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", onClickOutside);
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
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }, delay);
  };

  return (
    <div
      ref={wrapRef}
      style={{
        position: "relative",
        background: "#0F0F0F",
        border: "1px solid #1A1A1A",
        borderRadius: 12,
        padding: "12px 14px",
        marginBottom: 14,
        display: "flex",
        alignItems: "center",
        gap: 14,
        flexWrap: "wrap",
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

      {/* Percent + label */}
      <div style={{ display: "flex", flexDirection: "column", minWidth: 110, flexShrink: 0 }}>
        <span
          style={{
            fontSize: 22,
            fontWeight: 700,
            lineHeight: 1,
            color: isComplete ? "#4ADE80" : "#FFFFFF",
            letterSpacing: "-0.5px",
            fontFamily: "inherit",
          }}
        >
          {Math.round(percent)}%
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 500,
            color: "#A0A0A0",
            marginTop: 4,
            letterSpacing: "0.02em",
            fontFamily: "inherit",
          }}
        >
          {label}
        </span>
      </div>

      {/* Fill bar — reuses the ATSChecker gradient so the visual language
          stays consistent across product (red → amber → green). */}
      <div style={{ flex: 1, minWidth: 80 }}>
        <div
          style={{
            height: 6,
            borderRadius: 999,
            background: "#1A1A1A",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <motion.div
            initial={false}
            animate={{ width: `${Math.max(0, Math.min(100, percent))}%` }}
            transition={reduce ? { duration: 0 } : { duration: 0.45, ease: EASE }}
            style={{
              height: "100%",
              borderRadius: 999,
              background: "linear-gradient(90deg, #EF4444 0%, #F59E0B 45%, #22C55E 100%)",
              boxShadow: isComplete
                ? "0 0 12px rgba(34,197,94,0.45)"
                : "0 0 8px rgba(59,130,246,0.18)",
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
            color: "#60A5FA",
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
            background: "#D97706",
            border: "none",
            color: "#0A0A0A",
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
          color: "#666",
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
      {breakdownOpen && (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduce ? { duration: 0 } : { duration: 0.18, ease: EASE }}
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            left: 0,
            background: "#1C1C1C",
            border: "1px solid #2A2A2A",
            borderRadius: 12,
            padding: 12,
            zIndex: 120,
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "#60A5FA",
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
                    color: "#A0A0A0",
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
                      color: ok ? "#4ADE80" : "#3B82F6",
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
    </div>
  );
}
