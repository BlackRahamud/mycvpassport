import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, AlertTriangle, ChevronDown, X, ArrowRight, Layers, Trash2 } from "lucide-react";
import { partitionGapsByResolution } from "../../lib/ats/atsGaps";

// Tiered ATS-fixes panel — replaces the old display-only gaps ribbon.
//
// Phase A renders STRUCTURAL gaps in two live groups:
//   • "Fixed by your template" — gaps the parsed cv_data genuinely satisfies
//     (status: resolved). Auto-✓, collapsible. The honesty rule lives in
//     evaluateStructuralGap; this panel only renders what it returns.
//   • "Quick fixes" — gaps still needing a mechanical action (merge skills,
//     add contact, switch template) or human review. Each routes to ITS field.
//
// Re-evaluation is live: the parent passes `resume`, so as the user (or the
// merge action) edits, chips move from Quick fixes to Fixed on the next render.
//
// type:'content' gaps (Phase B) are ignored here.

const T = {
  surface: "var(--bg-surface)",
  elevated: "var(--bg-elevated)",
  border: "var(--border)",
  text: "var(--text-primary)",
  muted: "var(--text-secondary)",
  amber: "var(--accent)",
  green: "var(--success)",
  greenBright: "var(--success)",
};

const SECTION_LABEL = {
  contact: "Contact",
  summary: "Summary",
  experience: "Work History",
  education: "Education",
  skills: "Skills",
  technicalSkills: "Technical Skills",
  languages: "Languages",
};

const DISMISS_KEY = "cvp_ats_fixes_dismissed";

function actionLabel(act) {
  if (!act) return "Review";
  if (act.kind === "merge_skills") return "Merge skills";
  if (act.kind === "goto_template") return "Choose ATS template";
  if (act.kind === "goto_field") return `Go to ${SECTION_LABEL[act.field] || "section"}`;
  return "Review";
}

export default function AtsFixesPanel({
  gaps,
  resume,
  templateIsAtsSafe,
  atsRecommendation,
  onGoto,
  onMergeSkills,
}) {
  const structural = useMemo(
    () => (Array.isArray(gaps) ? gaps.filter((g) => g.type === "structural") : []),
    [gaps],
  );

  // Stable signature so a dismiss sticks for THIS gap set only.
  const signature = useMemo(() => structural.map((g) => g.id).join("|"), [structural]);
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.sessionStorage.getItem(DISMISS_KEY) === signature && signature.length > 0;
    } catch {
      return false;
    }
  });
  const [fixedOpen, setFixedOpen] = useState(false);

  const { fixed, todo } = useMemo(
    () => partitionGapsByResolution(structural, resume, { templateIsAtsSafe, atsRecommendation }),
    [structural, resume, templateIsAtsSafe, atsRecommendation],
  );

  if (!structural.length || dismissed) return null;

  const handleDismiss = () => {
    try {
      window.sessionStorage.setItem(DISMISS_KEY, signature);
    } catch {
      /* private mode — dismiss for this render only */
    }
    setDismissed(true);
  };

  const handleAction = (ev) => {
    const act = ev?.action;
    if (!act) return;
    if (act.kind === "merge_skills") {
      onMergeSkills?.();
      return;
    }
    onGoto?.(act);
  };

  const ctaStyle = (kind) => {
    if (kind === "merge_skills") return { border: "rgba(29,158,117,0.45)", bg: "rgba(29,158,117,0.12)", fg: T.greenBright, Icon: Layers };
    if (kind === "remove_element") return { border: "rgba(248,113,113,0.45)", bg: "rgba(248,113,113,0.12)", fg: "var(--danger)", Icon: Trash2 };
    return { border: "rgba(217,119,6,0.45)", bg: "rgba(217,119,6,0.12)", fg: T.amber, Icon: ArrowRight };
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
      role="region"
      aria-label="ATS fixes from your scan"
      data-cvp-ats-fixes="1"
      style={{
        background: "linear-gradient(180deg, rgba(217,119,6,0.06) 0%, rgba(217,119,6,0.02) 100%)",
        border: "1px solid rgba(217,119,6,0.22)",
        borderRadius: 14,
        padding: "12px 14px",
        marginBottom: 12,
        fontFamily: "inherit",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: todo.length ? 10 : 4 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: T.text, letterSpacing: "0.01em" }}>
            ATS fixes from your scan
          </div>
          <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>
            {todo.length} to fix · {fixed.length} fixed by your template
          </div>
        </div>
        <button
          type="button"
          aria-label="Dismiss"
          onClick={handleDismiss}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--text-muted)",
            padding: 4,
            cursor: "pointer",
            display: "inline-flex",
            flexShrink: 0,
          }}
        >
          <X size={14} />
        </button>
      </div>

      {/* Quick fixes — actionable */}
      {todo.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <AnimatePresence initial={false}>
            {todo.map(({ gap, ev }) => (
              <motion.div
                key={gap.id}
                layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: T.elevated,
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <AlertTriangle
                  size={15}
                  color={gap.weight === "high" ? "var(--danger)" : T.amber}
                  aria-hidden
                  style={{ flexShrink: 0, marginTop: 1 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: T.text, lineHeight: 1.4 }}>{gap.label}</div>
                  {ev.reason && (
                    <div style={{ fontSize: 11.5, color: T.muted, marginTop: 2, lineHeight: 1.4 }}>
                      {ev.reason}
                    </div>
                  )}
                </div>
                {(() => {
                  const s = ctaStyle(ev.action?.kind);
                  return (
                    <button
                      type="button"
                      onClick={() => handleAction(ev)}
                      style={{
                        flexShrink: 0,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "6px 11px",
                        borderRadius: 999,
                        border: `1px solid ${s.border}`,
                        background: s.bg,
                        color: s.fg,
                        fontSize: 11.5,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <s.Icon size={12} aria-hidden />
                      {ev.cta || actionLabel(ev.action)}
                    </button>
                  );
                })()}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Fixed by your template — resolved, collapsible */}
      {fixed.length > 0 && (
        <div style={{ marginTop: todo.length ? 12 : 0 }}>
          <button
            type="button"
            onClick={() => setFixedOpen((v) => !v)}
            aria-expanded={fixedOpen}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 2px",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit",
              color: T.greenBright,
            }}
          >
            <Check size={14} aria-hidden />
            <span style={{ fontSize: 12, fontWeight: 600 }}>
              Fixed by your template ({fixed.length})
            </span>
            <ChevronDown
              size={14}
              aria-hidden
              style={{
                marginLeft: "auto",
                transform: fixedOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 200ms cubic-bezier(0.4,0,0.2,1)",
                color: T.muted,
              }}
            />
          </button>
          <AnimatePresence initial={false}>
            {fixedOpen && (
              <motion.ul
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                style={{ listStyle: "none", margin: "4px 0 0", padding: 0, overflow: "hidden" }}
              >
                {fixed.map(({ gap, ev }) => (
                  <li
                    key={gap.id}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 9,
                      padding: "6px 4px",
                      fontSize: 12.5,
                      color: T.muted,
                      lineHeight: 1.4,
                    }}
                  >
                    <Check size={13} color={T.green} aria-hidden style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>
                      <span style={{ color: "var(--text-secondary)", textDecoration: "line-through", textDecorationColor: "rgba(255,255,255,0.2)" }}>
                        {gap.label}
                      </span>
                      {ev.reason && <span style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{ev.reason}</span>}
                    </span>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
