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
// Class B (subjective) gaps the user has ticked off. Persisted across reloads so
// a "Looks good" doesn't reappear next visit. Array of gap ids in localStorage.
const REVIEWED_KEY = "cvp_ats_reviewed";

function loadReviewed() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(REVIEWED_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

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
  const [reviewedIds, setReviewedIds] = useState(loadReviewed);

  const reviewedSet = useMemo(() => new Set(reviewedIds), [reviewedIds]);

  const persistReviewed = (next) => {
    setReviewedIds(next);
    try {
      window.localStorage.setItem(REVIEWED_KEY, JSON.stringify(next));
    } catch {
      /* private mode — hold in state for this session only */
    }
  };
  const markReviewed = (id) => {
    if (reviewedSet.has(id)) return;
    persistReviewed([...reviewedIds, id]);
  };
  const undoReviewed = (id) => {
    persistReviewed(reviewedIds.filter((x) => x !== id));
  };

  const { fixed, todo } = useMemo(
    () => partitionGapsByResolution(structural, resume, { templateIsAtsSafe, atsRecommendation, reviewedIds: reviewedSet }),
    [structural, resume, templateIsAtsSafe, atsRecommendation, reviewedSet],
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
          {/* No AnimatePresence exit here, ON PURPOSE. When a Class-A fix
              resolves mid-edit, the heavy resume re-render (modal close +
              refocus) interrupts Framer's exit before it starts, leaving the
              resolved row frozen on screen at full opacity — the count reads
              "fixed" while the row still shows, the exact "fixes don't clear"
              bug. Letting React unmount the row immediately guarantees it
              disappears the instant it's resolved. Rows still animate IN via
              motion's mount transition; only the (unreliable) exit is dropped. */}
          {todo.map(({ gap, ev }) => (
              <motion.div
                key={gap.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: T.elevated,
                  border: "1px solid rgba(255,255,255,0.06)",
                  overflow: "hidden",
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
                  // Class B is a subjective critique code can't verify — pair the
                  // deep-link with an explicit "Looks good" so the USER clears it.
                  const isReview = ev.cls === "B";
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0, alignItems: "stretch" }}>
                      <button
                        type="button"
                        onClick={() => handleAction(ev)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
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
                      {isReview && (
                        <button
                          type="button"
                          onClick={() => markReviewed(gap.id)}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 5,
                            padding: "5px 11px",
                            borderRadius: 999,
                            border: "1px solid rgba(29,158,117,0.4)",
                            background: "transparent",
                            color: T.greenBright,
                            fontSize: 11,
                            fontWeight: 600,
                            cursor: "pointer",
                            fontFamily: "inherit",
                            whiteSpace: "nowrap",
                          }}
                        >
                          <Check size={12} aria-hidden />
                          Looks good
                        </button>
                      )}
                    </div>
                  );
                })()}
              </motion.div>
            ))}
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
                {fixed.map(({ gap, ev }) => {
                  // Two ways to be "fixed": the template genuinely resolved it
                  // (ev.status resolved) OR the user judged this subjective one
                  // good (reviewed). Reviewed items show an honest note + Undo —
                  // never the stale "open this and fix it" review reason.
                  const isReviewed = ev.status !== "resolved" && reviewedSet.has(gap.id);
                  return (
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
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ color: "var(--text-secondary)", textDecoration: "line-through", textDecorationColor: "rgba(255,255,255,0.2)" }}>
                          {gap.label}
                        </span>
                        {isReviewed ? (
                          <span style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                            You marked this as reviewed ·{" "}
                            <button
                              type="button"
                              onClick={() => undoReviewed(gap.id)}
                              style={{
                                background: "transparent",
                                border: "none",
                                padding: 0,
                                margin: 0,
                                color: T.amber,
                                fontSize: 11,
                                fontWeight: 600,
                                cursor: "pointer",
                                fontFamily: "inherit",
                                textDecoration: "underline",
                              }}
                            >
                              Undo
                            </button>
                          </span>
                        ) : (
                          ev.reason && <span style={{ display: "block", fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{ev.reason}</span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}
