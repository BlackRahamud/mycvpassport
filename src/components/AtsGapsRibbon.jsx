import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { splitCommaItems } from "../cvShared";

// Inline SVG — drawn for this ribbon, not imported.
function CloseIcon({ size = 14, color = "currentColor" }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

const DISMISSED_STORAGE_KEY = "cvp_ats_gaps_dismissed";

function makeGapsKey(gaps) {
  return gaps.join("|").toLowerCase();
}

function readDismissed() {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage.getItem(DISMISSED_STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeDismissed(key) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(DISMISSED_STORAGE_KEY, key);
  } catch {
    // sessionStorage may be unavailable — fail silently, ribbon stays for the session.
  }
}

export default function AtsGapsRibbon({ gaps, resume, onChipClick }) {
  const [dismissedKey, setDismissedKey] = useState(readDismissed);

  const gapsKey = useMemo(() => makeGapsKey(gaps), [gaps]);

  // Auto-hide once every gap appears (case-insensitive substring) inside
  // the user's skills list — derived from existing builder state, no new
  // state machinery.
  const skillsLower = useMemo(() => {
    return splitCommaItems(resume?.skills).map((s) => String(s).toLowerCase());
  }, [resume?.skills]);

  const allAddressed = useMemo(() => {
    if (!gaps.length) return false;
    return gaps.every((g) => {
      const gl = String(g).toLowerCase();
      return skillsLower.some((s) => s.includes(gl));
    });
  }, [gaps, skillsLower]);

  if (!gaps.length) return null;
  if (allAddressed) return null;
  if (dismissedKey === gapsKey) return null;

  const handleDismiss = () => {
    writeDismissed(gapsKey);
    setDismissedKey(gapsKey);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      role="status"
      aria-label={`Fixing ${gaps.length} ${gaps.length === 1 ? "gap" : "gaps"} from your ATS scan`}
      style={{
        background:
          "linear-gradient(180deg, rgba(217,119,6,0.07) 0%, rgba(217,119,6,0.02) 100%)",
        border: "1px solid rgba(217,119,6,0.22)",
        borderRadius: 12,
        padding: "10px 12px",
        marginBottom: 12,
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontFamily: "inherit",
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#FFFFFF",
            letterSpacing: "0.01em",
            lineHeight: 1.4,
          }}
        >
          Fixing {gaps.length} {gaps.length === 1 ? "gap" : "gaps"} from your ATS scan
        </div>
        <div
          style={{
            marginTop: 6,
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            alignItems: "center",
          }}
        >
          {gaps.map((g) => {
            const addressed = skillsLower.some((s) =>
              s.includes(String(g).toLowerCase()),
            );
            return (
              <button
                key={g}
                type="button"
                onClick={() => onChipClick?.(g)}
                style={{
                  background: addressed
                    ? "rgba(74,222,128,0.10)"
                    : "rgba(255,255,255,0.04)",
                  border: addressed
                    ? "1px solid rgba(74,222,128,0.28)"
                    : "1px solid rgba(255,255,255,0.10)",
                  color: addressed ? "#4ADE80" : "#E5E5E5",
                  fontSize: 11,
                  fontWeight: 500,
                  padding: "3px 9px",
                  borderRadius: 9999,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  textDecoration: addressed ? "line-through" : "none",
                  opacity: addressed ? 0.75 : 1,
                  transition:
                    "background-color 160ms cubic-bezier(0.4,0,0.2,1), border-color 160ms cubic-bezier(0.4,0,0.2,1), color 160ms cubic-bezier(0.4,0,0.2,1)",
                }}
                onMouseEnter={(e) => {
                  if (addressed) return;
                  e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.18)";
                }}
                onMouseLeave={(e) => {
                  if (addressed) return;
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.10)";
                }}
              >
                {g}
              </button>
            );
          })}
        </div>
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={handleDismiss}
        style={{
          background: "transparent",
          border: "none",
          color: "#666",
          padding: 4,
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          fontFamily: "inherit",
          transition: "color 160ms cubic-bezier(0.4,0,0.2,1)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = "#FFFFFF";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = "#666";
        }}
      >
        <CloseIcon size={14} />
      </button>
    </motion.div>
  );
}
