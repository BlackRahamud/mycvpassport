import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { FileText, Check, AlertCircle, Upload, LogIn, Sparkles } from "lucide-react";

/*
 * The upload "magic" — the ~10 seconds the AI spends reading a CV is exactly
 * when a candidate abandons, and it's the moment the whole product promise is
 * being delivered. So we show the work: a single considered motion — an amber
 * scan reading down a stylised document, its sections lighting up as they are
 * parsed — climbing toward the 0→85% progress jump the real builder lands on.
 *
 * HONESTY (this is a rebuilt-scan codebase; fake AI theatre is the original
 * sin here):
 *   - Progress is stage-driven, not a fake timer. Each real pipeline stage
 *     (reading → uploading → parsing) eases the bar to its own ceiling; the
 *     long parse stage holds asymptotically below 85 and NEVER completes on
 *     its own. Only the real onImported success — which unmounts this and
 *     lands the builder's progress card at 85 — is the completion.
 *   - On failure it resolves to an honest failed state: motion stops, the bar
 *     goes neutral-red, the reason shows, and a retry is offered. It never
 *     spins forever and never falsely completes.
 *   - Reduced motion is first class: no sweep, no shimmer — the bar eases to
 *     each stage ceiling and the sections fill as stages land. Calm and true.
 */

const SECTIONS = [
  { key: "contact", label: "Contact", bars: ["62%", "40%"], at: 16 },
  { key: "summary", label: "Summary", bars: ["92%", "78%"], at: 30 },
  { key: "experience", label: "Experience", bars: ["88%", "70%", "80%"], at: 46 },
  { key: "education", label: "Education", bars: ["66%", "48%"], at: 64 },
  { key: "skills", label: "Skills", bars: ["84%"], at: 78 },
];

const STAGE_CEILING = { reading: 24, uploading: 48, parsing: 82 };
const STAGE_LABEL = {
  reading: "Reading your file",
  uploading: "Sending to the AI",
  parsing: "Extracting your details",
  error: "Couldn't finish reading",
};

export default function CvExtractionCeremony({ stage, filename, errorMsg, errorHint, onRetry, needsAuth, onSignIn, needsUpgrade, onUpgrade }) {
  const reduce = useReducedMotion();
  const isError = stage === "error";
  // "Soft" errors (sign-in needed, or import allowance used) are not file
  // failures — they render amber like a prompt, not red like a broken file.
  const softError = needsAuth || needsUpgrade;
  const [pct, setPct] = useState(0);
  const pctRef = useRef(0);
  const rafRef = useRef(0);

  // Drive the number/bar. Non-reduced motion eases frame-by-frame toward the
  // active stage ceiling (asymptotic near the top = a living "still working"
  // creep that caps below 85). Reduced motion jumps to the ceiling and lets
  // the CSS width transition carry it — progress, no theatre.
  useEffect(() => {
    if (isError) {
      cancelAnimationFrame(rafRef.current);
      return undefined;
    }
    const ceiling = STAGE_CEILING[stage] ?? pctRef.current;
    if (reduce) {
      pctRef.current = ceiling;
      setPct(ceiling);
      return undefined;
    }
    const tick = () => {
      const cur = pctRef.current;
      const next = cur + (ceiling - cur) * 0.06;
      pctRef.current = Math.abs(ceiling - next) < 0.25 ? ceiling : next;
      setPct(pctRef.current);
      if (pctRef.current !== ceiling) rafRef.current = requestAnimationFrame(tick);
    };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [stage, reduce, isError]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const shownPct = Math.round(pct);
  const barColor = isError ? "var(--danger)" : "var(--accent)";

  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: 16,
        background: "var(--bg-surface)",
        padding: 22,
        boxShadow: "var(--shadow-card)",
        boxSizing: "border-box",
      }}
    >
      {/* Header — icon, live stage label, and the climbing number. */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <span
          style={{
            width: 40,
            height: 40,
            borderRadius: 11,
            flexShrink: 0,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: (isError && !softError) ? "rgba(239,68,68,0.12)" : "var(--color-accent-soft)",
            color: (isError && !softError) ? "var(--danger)" : "var(--accent-text)",
          }}
        >
          {needsAuth ? <LogIn size={18} strokeWidth={1.9} aria-hidden /> : needsUpgrade ? <Sparkles size={18} strokeWidth={1.9} aria-hidden /> : isError ? <AlertCircle size={19} strokeWidth={1.9} aria-hidden /> : <FileText size={18} strokeWidth={1.8} aria-hidden />}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {filename || "Your CV"}
          </p>
          <p style={{ margin: "2px 0 0", fontSize: 12, fontWeight: 600, color: (isError && !softError) ? "var(--danger)" : "var(--accent-text)" }}>
            {needsAuth ? "One step to import" : needsUpgrade ? "Import limit reached" : (STAGE_LABEL[isError ? "error" : stage] || "Working")}
            {!isError ? <span aria-hidden> · reading through the document</span> : null}
          </p>
        </div>
        {!isError ? (
          <span style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }} aria-live="polite">
            {shownPct}%
          </span>
        ) : null}
      </div>

      {/* Progress bar. */}
      <div style={{ height: 6, borderRadius: 999, background: "var(--builder-fill)", overflow: "hidden", marginBottom: 18 }}>
        <div
          style={{
            height: "100%",
            width: `${isError ? Math.max(shownPct, 8) : shownPct}%`,
            borderRadius: 999,
            background: barColor,
            opacity: isError ? 0.55 : 1,
            transition: "width 420ms cubic-bezier(0.4,0,0.2,1), background-color 300ms cubic-bezier(0.4,0,0.2,1)",
          }}
        />
      </div>

      {/* The stylised document being read. */}
      <div style={{ position: "relative", display: "grid", gap: 12, overflow: "hidden", borderRadius: 10 }}>
        {/* One considered motion: the amber scan line reading down the page.
            Hidden under reduced motion and on failure. */}
        {!reduce && !isError ? (
          <motion.div
            aria-hidden
            initial={{ top: "-6%" }}
            animate={{ top: ["-6%", "102%"] }}
            transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position: "absolute",
              left: -4,
              right: -4,
              height: 2,
              borderRadius: 999,
              background: "linear-gradient(90deg, transparent, var(--accent), transparent)",
              boxShadow: "0 0 12px 1px rgba(217,119,6,0.45)",
              zIndex: 2,
              pointerEvents: "none",
            }}
          />
        ) : null}

        {SECTIONS.map((sec) => {
          const filled = !isError && pct >= sec.at;
          return (
            <div key={sec.key} style={{ display: "flex", gap: 11, alignItems: "flex-start" }}>
              <span
                style={{
                  marginTop: 1,
                  width: 16,
                  height: 16,
                  flexShrink: 0,
                  borderRadius: 5,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: filled ? "var(--color-accent-soft)" : "var(--builder-fill)",
                  color: "var(--accent-text)",
                  transition: "background-color 320ms cubic-bezier(0.4,0,0.2,1)",
                }}
              >
                {filled ? <Check size={11} strokeWidth={2.6} aria-hidden /> : null}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    margin: "0 0 6px",
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    color: filled ? "var(--text-primary)" : "var(--text-muted)",
                    transition: "color 320ms cubic-bezier(0.4,0,0.2,1)",
                  }}
                >
                  {sec.label}
                </p>
                <div style={{ display: "grid", gap: 6 }}>
                  {sec.bars.map((w, bi) => (
                    <div
                      key={bi}
                      style={{
                        height: 8,
                        width: w,
                        borderRadius: 5,
                        background: filled ? "rgba(217,119,6,0.26)" : "var(--builder-fill)",
                        transition: "background-color 340ms cubic-bezier(0.4,0,0.2,1)",
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Honest resolution — a failure (red) or a sign-in prompt (amber). */}
      {isError ? (
        <div style={{ marginTop: 16, padding: 12, borderRadius: 10, background: softError ? "var(--color-accent-soft)" : "rgba(239,68,68,0.08)", border: softError ? "1px solid var(--color-accent-line)" : "1px solid rgba(239,68,68,0.35)" }}>
          <p style={{ margin: 0, fontSize: 13, color: softError ? "var(--text-primary)" : "var(--danger)", fontWeight: 600 }}>{errorMsg || "We couldn't read that file."}</p>
          {errorHint ? <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{errorHint}</p> : null}
          {needsUpgrade && onUpgrade ? (
            <button
              type="button"
              onClick={onUpgrade}
              style={{
                marginTop: 14,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                height: 44,
                width: "100%",
                padding: "0 18px",
                borderRadius: 11,
                border: "none",
                background: "var(--accent)",
                color: "var(--accent-contrast)",
                fontSize: 14.5,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <Sparkles size={16} strokeWidth={2.1} aria-hidden />
              Upgrade to import more
            </button>
          ) : needsAuth && onSignIn ? (
            <button
              type="button"
              onClick={onSignIn}
              style={{
                marginTop: 14,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                height: 44,
                width: "100%",
                padding: "0 18px",
                borderRadius: 11,
                border: "none",
                background: "var(--accent)",
                color: "var(--accent-contrast)",
                fontSize: 14.5,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <LogIn size={16} strokeWidth={2.1} aria-hidden />
              Sign in to import
            </button>
          ) : onRetry ? (
            <button
              type="button"
              onClick={onRetry}
              style={{
                marginTop: 12,
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                height: 40,
                padding: "0 18px",
                borderRadius: 10,
                border: "none",
                background: "var(--accent)",
                color: "var(--accent-contrast)",
                fontSize: 13.5,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              <Upload size={15} strokeWidth={2.1} aria-hidden />
              Try another file
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
