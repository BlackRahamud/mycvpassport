// SynthesisOverlay — the "Verifying your CV" clearance screen, ported from
// the design project's `Clearance Scan.dc.html` (light passport system).
//
// The visual language is a travel document being cleared: guilloché paper,
// a holder line, an ATS gauge that COUNTS UP to the real score, a ledger of
// entries that clear one by one under a scanning beam, a rubber stamp, and
// an MRZ strip at the foot.
//
// Everything is real data. The one rule that must never bend: a field the
// visitor has NOT filled in (0 skills, no education, no roles) shows a soft
// amber "add to boost" — never a green CLEARED on empty data.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { splitCommaItems } from "../cvShared";
import { isPrerender } from "../lib/prerender";
import "./clearanceScan.css";

const STEP = 240;      // ms between ledger entries
const ARC = 226.2;     // dash length of the 270° gauge arc at r=48
const COUNT_MS = 880;  // score count-up duration

function clampScore(n) {
  return Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
}

// MRZ (machine readable zone) lines — decorative, but built from the real
// document so it never reads as lorem.
function mrzLines(name, score, skills, roles, template) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  const surname = (parts[parts.length - 1] || "HOLDER").toUpperCase().replace(/[^A-Z]/g, "");
  const given = parts.slice(0, -1).join("<").toUpperCase().replace(/[^A-Z<]/g, "");
  const tpl = (template || "NOTPL").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 8);
  return [
    `P<UAECV<${surname}<<${given}`.padEnd(44, "<").slice(0, 44),
    `CVP${String(score).padStart(3, "0")}<<ATS<${skills}SK<${roles}RL<${tpl}`.padEnd(44, "<").slice(0, 44),
  ];
}

export default function SynthesisOverlay({
  resume,
  selectedTemplateName,
  atsScore,
  onComplete,
  isExiting = false,
  // Explicit overrides — the screen is data-driven; when these are absent
  // the same values are derived from `resume` (how the builder calls it).
  name: nameProp,
  roles: rolesProp,
  education: educationProp,
  skills: skillsProp,
  template: templateProp,
}) {
  const reduced = useRef(
    typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  const [tick, setTick] = useState(0);
  const [score, setScore] = useState(0);
  const [settled, setSettled] = useState(false);
  const [ready, setReady] = useState(false);
  const [sweepHeight, setSweepHeight] = useState(300);

  const ledgerRef = useRef(null);
  const timersRef = useRef([]);
  const counterRef = useRef(0);
  const onCompleteRef = useRef(onComplete);
  useEffect(() => { onCompleteRef.current = onComplete; }, [onComplete]);

  /* ── the real document ─────────────────────────────────────────────── */
  const name = String(nameProp ?? resume?.name ?? "").trim();
  const roles = Math.max(0, Math.round(Number(rolesProp ?? resume?.experience?.length ?? 0) || 0));
  const education = useMemo(() => {
    if (educationProp !== undefined) return String(educationProp || "").trim();
    const edu = resume?.education?.[0];
    if (!edu?.school) return "";
    const year = edu.endDate?.slice(-4) || edu.year || "";
    return year ? `${edu.school}, ${year}` : edu.school;
  }, [educationProp, resume]);
  const skills = Math.max(
    0,
    Math.round(Number(skillsProp ?? splitCommaItems(resume?.skills || "").length) || 0),
  );
  const template = String(templateProp ?? selectedTemplateName ?? "").trim();
  const target = clampScore(atsScore);

  /* ── the scan ──────────────────────────────────────────────────────── */
  const stopTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    clearInterval(counterRef.current);
  }, []);

  useEffect(() => {
    // Never run the ceremony during the prerender pass — it would freeze a
    // half-scanned document into the static HTML.
    if (isPrerender()) return undefined;

    if (reduced.current) {
      setTick(6);
      setScore(target);
      setSettled(true);
      setReady(true);
      const t = setTimeout(() => onCompleteRef.current?.(), 320);
      return () => clearTimeout(t);
    }

    const timers = [];
    for (let i = 1; i <= 6; i += 1) {
      timers.push(setTimeout(() => {
        setTick(i);
        if (i === 5) {
          // Count the gauge up to the real score.
          const t0 = Date.now();
          clearInterval(counterRef.current);
          counterRef.current = setInterval(() => {
            const p = Math.min(1, (Date.now() - t0) / COUNT_MS);
            setScore(Math.round((1 - Math.pow(1 - p, 3)) * target));
            if (p >= 1) {
              clearInterval(counterRef.current);
              setScore(target);
              setSettled(true);
            }
          }, 32);
        }
      }, i * STEP));
    }
    timers.push(setTimeout(() => setReady(true), 6 * STEP + 560));
    // Hand off to the real download once the document reads "Preparing…".
    timers.push(setTimeout(() => onCompleteRef.current?.(), 6 * STEP + 900));
    timersRef.current = timers;
    return stopTimers;
  }, [target, stopTimers]);

  // The scanning beam travels the height of the ledger.
  useEffect(() => {
    const el = ledgerRef.current;
    if (!el || typeof ResizeObserver !== "function") return undefined;
    const measure = () => {
      const h = Math.round(el.getBoundingClientRect().height);
      if (h) setSweepHeight((prev) => (prev === h ? prev : h));
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, []);

  /* ── derived view state ────────────────────────────────────────────── */
  const scoreShown = tick >= 5;
  const done = tick >= 6;
  const scoreSettled = scoreShown && settled;

  const tier = target >= 70 ? "ok" : target >= 50 ? "warn" : "danger";
  const tierInk = tier === "ok" ? "var(--accent)" : tier === "warn" ? "var(--warn)" : "var(--danger)";

  const entries = [
    { step: 1, label: name || "Name", sub: "Identity", empty: !name, emptySub: "Add your name" },
    {
      step: 2,
      label: roles > 0 ? `${roles} role${roles === 1 ? "" : "s"}` : "Work history",
      sub: "Employment record",
      empty: roles <= 0,
      emptySub: "Add a role to boost",
    },
    { step: 3, label: education || "Education", sub: "Qualifications", empty: !education, emptySub: "Add to boost" },
    {
      step: 4,
      label: skills > 0 ? `${skills} skills matched` : "Skills",
      sub: "Keyword signals",
      empty: skills <= 0,
      emptySub: "Add skills to boost",
    },
    { step: 6, label: template || "Template", sub: "Document design", empty: !template, emptySub: "Pick one to finish" },
  ];

  const anyEmpty = entries.some((e) => e.empty);
  const cleared = done && target >= 50 && !anyEmpty;
  const scanning = !done && !reduced.current;

  const verdictTitle = scoreSettled
    ? (target >= 70 ? "Cleared for boarding" : target >= 50 ? "Cleared with notes" : "Held for review")
    : "Assessing your document";
  const verdictNote = scoreSettled
    ? (target >= 70
      ? "Top tier. This clears the screening filters most Gulf employers run."
      : target >= 50
        ? "You will pass most filters, but a few gaps are costing you points."
        : "Below the usual cut off. Fix the flagged entries and run the check again.")
    : "Weighing keywords, structure and formatting flags against live job signals.";

  const [mrz1, mrz2] = mrzLines(name, target, skills, roles, template);
  const ticks = Array.from({ length: 19 }, (_, i) => {
    const frac = i / 18;
    return { deg: -135 + frac * 270, on: scoreShown && frac <= score / 100 };
  });

  const chipLabel = !done ? "SCANNING" : cleared ? "CLEARED" : "ACTION NEEDED";
  const chipClass = !done ? "csc-chip csc-chip--live" : cleared ? "csc-chip csc-chip--ok" : "csc-chip csc-chip--flag";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Clearance check on your CV"
      className={`csc-root${isExiting ? " csc-exiting" : ""}`}
    >
      <div className="csc-card">
        <div className="csc-guilloche" aria-hidden="true" />

        <div className="csc-head">
          <div className="csc-brand">
            <Chevrons />
            <b>CVPassport</b>
            <span className="csc-rule" aria-hidden="true" />
            <span className="csc-eyebrow">Clearance check</span>
          </div>
          <div className={chipClass}>
            <i aria-hidden="true" />
            <span>{chipLabel}</span>
          </div>
        </div>

        <div className="csc-idrow">
          <div style={{ minWidth: 0 }}>
            <p className="csc-label">Holder</p>
            <h2 className="csc-holder">{name || "Add your name"}</h2>
          </div>
          <div style={{ flexShrink: 0, textAlign: "right" }}>
            <p className="csc-label">Doc no</p>
            <p className="csc-docno csc-mono">{`CVP-${String(target).padStart(2, "0")}-2026`}</p>
          </div>
        </div>

        <div className="csc-gauge">
          <div className="csc-dial">
            <svg width="100%" height="100%" viewBox="0 0 120 120" aria-hidden="true">
              <g transform="rotate(-225 60 60)">
                <circle
                  cx="60" cy="60" r="48" fill="none"
                  stroke="var(--border)" strokeWidth="9" strokeLinecap="round"
                  strokeDasharray={`${ARC} 400`}
                />
                <circle
                  cx="60" cy="60" r="48" fill="none"
                  stroke={tierInk} strokeWidth="9" strokeLinecap="round"
                  strokeDasharray={`${(ARC * (scoreShown ? score / 100 : 0)).toFixed(1)} 400`}
                  style={{ transition: "stroke 320ms cubic-bezier(0.4,0,0.2,1)" }}
                />
              </g>
              {ticks.map((t, i) => (
                <line
                  key={i}
                  x1="60" y1="7" x2="60" y2="12"
                  stroke={t.on ? "var(--accent)" : "var(--border)"}
                  strokeWidth="1.6" strokeLinecap="round"
                  transform={`rotate(${t.deg} 60 60)`}
                />
              ))}
            </svg>
            <div className="csc-dial-mid">
              <span
                className="csc-score"
                style={{ color: scoreShown ? (scoreSettled ? tierInk : "var(--text-primary)") : "var(--border-strong)" }}
              >
                {scoreShown ? score : "—"}
              </span>
              <span className="csc-score-cap">ATS SCORE</span>
            </div>
          </div>

          <div className="csc-verdict">
            <div className="csc-verdict-top">
              <p
                className="csc-verdict-title"
                style={{ color: scoreSettled ? "var(--text-primary)" : "var(--text-secondary)" }}
              >
                {verdictTitle}
              </p>
              {scoreSettled ? (
                <div
                  role="img"
                  aria-label={`Stamped ${target >= 50 && !anyEmpty ? "cleared" : "review"}, ATS score ${target}`}
                  className="csc-stamp"
                  style={{ color: tierInk, background: "var(--amber-wash)" }}
                >
                  <b>{anyEmpty ? "REVIEW" : target >= 70 ? "CLEARED" : target >= 50 ? "CLEARED*" : "REVIEW"}</b>
                  <span>{`ATS ${target}`}</span>
                </div>
              ) : null}
            </div>
            <p className="csc-verdict-note">{verdictNote}</p>
          </div>
        </div>

        <div className="csc-ledger" ref={ledgerRef}>
          <div
            className={`csc-sweep${scanning ? " csc-sweep--on" : ""}`}
            aria-hidden="true"
            style={{ opacity: scanning ? 1 : 0, "--sweep-h": `${sweepHeight}px` }}
          />
          <p className="csc-ledger-cap">Entries checked</p>

          {entries.map((d, i) => {
            const rowCleared = tick >= d.step;
            const visible = tick >= d.step - 1;
            const isEmpty = rowCleared && d.empty;
            const showTick = rowCleared && !d.empty;
            return (
              <div
                key={d.sub}
                className="csc-row"
                style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(5px)" }}
              >
                <span
                  className="csc-row-idx"
                  style={{ color: rowCleared ? "var(--text-muted)" : "var(--border-strong)" }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className={`csc-glyph${showTick ? " csc-glyph--ok" : isEmpty ? " csc-glyph--add" : ""}`}>
                  {showTick ? (
                    <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <path
                        d="M2.5 7.2L5.4 10L11.5 4"
                        stroke="var(--success-text)" strokeWidth="2.2"
                        strokeLinecap="round" strokeLinejoin="round"
                        strokeDasharray="16" strokeDashoffset="0"
                        style={{ transition: "stroke-dashoffset 280ms cubic-bezier(0.2,0.8,0.3,1)" }}
                      />
                    </svg>
                  ) : isEmpty ? (
                    <b>+</b>
                  ) : (
                    <i aria-hidden="true" />
                  )}
                </div>
                <div className="csc-row-body">
                  <p
                    className="csc-row-title"
                    style={{ color: rowCleared ? "var(--text-primary)" : "var(--border-strong)" }}
                  >
                    {d.label}
                  </p>
                  <p
                    className="csc-row-sub"
                    style={{ color: !rowCleared ? "var(--border-strong)" : isEmpty ? "var(--warn)" : "var(--text-muted)" }}
                  >
                    {isEmpty ? d.emptySub : d.sub}
                  </p>
                </div>
                <span
                  className="csc-row-status"
                  style={{ color: isEmpty ? "var(--warn)" : "var(--success-text)" }}
                >
                  {!rowCleared ? "" : isEmpty ? "Add" : "Cleared"}
                </span>
              </div>
            );
          })}
        </div>

        <div className="csc-foot">
          <div className="csc-foot-left">
            <i aria-hidden="true" style={{ background: ready ? "var(--accent)" : "var(--border-strong)" }} />
            <p>{ready ? "Preparing your download…" : "Running clearance checks…"}</p>
          </div>
          <span className="csc-counter">{`${Math.min(tick, 6)} / 6`}</span>
        </div>

        <div className="csc-mrz" aria-hidden="true">
          <p>{mrz1}</p>
          <p>{mrz2}</p>
          {scanning ? <span className="csc-mrz-beam" /> : null}
        </div>
      </div>
    </div>
  );
}

function Chevrons() {
  return (
    <svg width="27" height="18" viewBox="0 0 34 40" fill="none" aria-hidden="true">
      <path d="M 4 28 L 12 20 L 4 12" stroke="var(--text-primary)" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 12 28 L 20 20 L 12 12" stroke="var(--accent)" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 20 28 L 28 20 L 20 12" stroke="var(--accent)" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
    </svg>
  );
}
