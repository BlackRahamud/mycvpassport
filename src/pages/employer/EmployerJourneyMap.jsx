import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

/**
 * EmployerJourneyMap — the marketing-mode "hiring journey" animation,
 * ported from the Claude Design file "Hiring Journey Modes.dc.html"
 * (project 6eb9217e), marketing mode only (the navy showcase; the violet
 * guidance mode is the in-portal companion and is NOT part of the public
 * page). Replaces the old "From job post to hire in four steps" band.
 *
 * The motion is NOT re-authored: the design's autoplay state machine
 * (dwell 3000ms per beat, 4600ms on the weighted "Scored" beat, loop %6,
 * a 170ms card cross-fade dip on each change) and its node geometry
 * (760x400 coordinate space, the two-ways-in fork merging at "Scored")
 * are reused verbatim. Colours are mapped to our real --empl-* tokens;
 * the floating feature card uses the real --surface-glass-* tokens.
 *
 * Responsive: desktop shows the horizontal path (>=900px), mobile shows
 * the vertical stepper (both driven by the same state). Reduced motion
 * stops autoplay and holds a still on the first beat.
 */

// Six nodes; the first two ("Post" / "Import") are the two ways in that
// merge at "Scored". Beats loop 0..5.
const LABELS = ["Post", "Import", "Scored", "Pipeline", "WhatsApp", "Insights"];
const SUBS = ["", "", "", "board and kit", "", "all plans"];
const ACCENTS = ["amber", "amber", "amber", "amber", "green", "amber"];

// Node coordinates in the design's 760x400 stage (verbatim).
const COORD = [
  [72, 214], // Post (top entry)
  [72, 316], // Import (bottom entry — the fork)
  [248, 265], // Scored (merge + weighted beat)
  [418, 265], // Pipeline
  [560, 265], // WhatsApp
  [700, 265], // Insights
];

// Card copy per beat — verbatim from the design's mSteps().
const STEPS = [
  { title: "Post your role", tag: "Post a job", feature: "Post a complete job in minutes with a guided wizard, no blank page.", ai: false, cue: "" },
  { title: "Or import your CVs", tag: "Import", feature: "Already have a pile? Drop in a batch of PDFs or Word files and score them.", ai: false, cue: "" },
  { title: "Applicants arrive scored", tag: "The difference", feature: "Every applicant is scored against your job description, strongest first.", ai: true, cue: "Full AI evaluation on Foundation, a keyword score on the free plan." },
  { title: "Run your pipeline", tag: "One board", feature: "Move candidates from new to hired on one board. Shortlist, schedule interviews with a ready made kit and scorecard, and share profiles for team feedback.", ai: false, cue: "" },
  { title: "Reach them on WhatsApp", tag: "Reach out", feature: "Open WhatsApp with a ready message and reach candidates on the app they already use.", ai: false, cue: "" },
  { title: "See what is working", tag: "Insights", feature: "Track applicants, shortlists, interviews, and time to fill for every role.", ai: false, cue: "" },
];

const DWELL_MS = 3000;
const DWELL_WEIGHTED_MS = 4600; // the "Scored" beat holds longer
const WEIGHTED = 2;

// Accent families, mapped to our real tokens (solid) with literal alpha
// washes for the ring/glow (design values, matching --empl-amber-600 /
// --empl-green-600).
function accentSet(name) {
  if (name === "green") {
    return { solid: "var(--empl-green-600)", soft: "rgba(22,163,74,0.12)", ring: "rgba(22,163,74,0.2)", glow: "rgba(22,163,74,0.45)" };
  }
  return { solid: "var(--empl-amber-600)", soft: "rgba(217,119,6,0.12)", ring: "rgba(217,119,6,0.2)", glow: "rgba(217,119,6,0.45)" };
}

// Dot style per state — ported from the design's dot() helper.
function dotStyle(kind, big, acc, vertical) {
  const size = vertical ? (big ? 22 : 16) : (big ? 24 : 16);
  const s = { width: size + "px", height: size + "px" };
  if (kind === "done") {
    s.background = acc.solid; s.border = "0"; s.boxShadow = "none"; s.transform = "scale(1)";
  } else if (kind === "current") {
    s.background = acc.solid; s.border = "0"; s.boxShadow = `0 0 0 6px ${acc.ring}, 0 0 22px ${acc.glow}`;
    s.transform = vertical ? "scale(1)" : "scale(1.14)";
  } else {
    s.background = "#fff"; s.border = "2px solid var(--empl-slate-300)";
    s.boxShadow = big ? `0 0 0 4px ${acc.ring}` : "none"; s.transform = "scale(1)";
  }
  return s;
}

function labelColor(kind, acc) {
  if (kind === "done") return "var(--empl-ink)";
  if (kind === "current") return acc.solid;
  return "var(--empl-slate-500)";
}
function labelWeight(kind) {
  return kind === "done" ? 600 : kind === "current" ? 700 : 500;
}

function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
function PlayIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 5l12 7-12 7z" /></svg>;
}
function PauseIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>;
}

function JourneyCard({ step, acc }) {
  return (
    <div className="empl-jcard">
      <div className="empl-jcard-top">
        <span className="empl-jcard-tag" style={{ color: acc.solid, background: acc.soft }}>{step.tag}</span>
        {step.ai && (
          <span className="empl-jcard-score"><b>92</b><span>match</span></span>
        )}
      </div>
      <h4 className="empl-jcard-title">{step.title}</h4>
      <p className="empl-jcard-feature">{step.feature}</p>
      {step.ai && step.cue && (
        <div className="empl-jcard-cue">
          <span className="empl-jcard-cue-dot" style={{ background: acc.solid }} aria-hidden="true" />
          <span>{step.cue}</span>
        </div>
      )}
    </div>
  );
}

export default function EmployerJourneyMap() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const [reveal, setReveal] = useState(true);
  const [playing, setPlaying] = useState(true);
  const [inView, setInView] = useState(false);
  const rootRef = useRef(null);
  const revealTimer = useRef(null);
  const dwellTimer = useRef(null);

  // Advance to a beat: dip the card (reveal=false) then rise it back in.
  const go = useCallback((i) => {
    clearTimeout(revealTimer.current);
    setActive(i);
    setReveal(false);
    revealTimer.current = setTimeout(() => setReveal(true), 170);
  }, []);

  // Pause autoplay when the section is not on screen (no wasted work).
  useEffect(() => {
    const el = rootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") { setInView(true); return undefined; }
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Autoplay loop — reschedules on each beat. Verbatim dwell timings.
  useEffect(() => {
    if (reduce || !playing || !inView) { clearTimeout(dwellTimer.current); return undefined; }
    const dwell = active === WEIGHTED ? DWELL_WEIGHTED_MS : DWELL_MS;
    dwellTimer.current = setTimeout(() => go((active + 1) % 6), dwell);
    return () => clearTimeout(dwellTimer.current);
  }, [active, playing, inView, reduce, go]);

  useEffect(() => () => { clearTimeout(revealTimer.current); clearTimeout(dwellTimer.current); }, []);

  const togglePlay = () => { if (!reduce) setPlaying((p) => !p); };

  const seg = (cond, hex) => (cond ? hex : "var(--empl-slate-200)");
  const entry = seg(active >= 2, "var(--empl-amber-600)");
  const seg1 = seg(active >= 3, "var(--empl-amber-600)");
  const seg2 = seg(active >= 4, "var(--empl-amber-600)");
  const seg3 = seg(active >= 5, "var(--empl-green-600)");
  const kindOf = (i) => (i < active ? "done" : i === active ? "current" : "todo");

  return (
    <div className="empl-jmap-card" ref={rootRef} data-rm={reduce ? "on" : "off"}>
      <div className="empl-jmap-aside">
        <span className="empl-jmap-badge">the hiring journey</span>
        <h2>From posted to hired, without the pile</h2>
        <p>Post or import, let the scoring rank them, run one board to hire, and reach people on WhatsApp.</p>
        {!reduce && (
          <button type="button" className="empl-jmap-play" onClick={togglePlay} aria-label={playing ? "Pause the hiring journey animation" : "Play the hiring journey animation"}>
            {playing ? <PauseIcon /> : <PlayIcon />}
            <span>{playing ? "Playing" : "Play"}</span>
          </button>
        )}
      </div>

      {/* Desktop horizontal path */}
      <div className="empl-jmap-canvas" aria-hidden="true">
        <span className="empl-jmap-corner empl-jmap-corner--tl">Two ways in</span>
        <span className="empl-jmap-corner empl-jmap-corner--br">Strongest first</span>
        <div className="empl-jmap-stagefit">
          <div className="empl-jmap-stage">
            <svg className="empl-jmap-svg" viewBox="0 0 760 400" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
              <path d="M72,214 C150,214 170,265 248,265" className="empl-jmap-seg" style={{ stroke: entry }} />
              <path d="M72,316 C150,316 170,265 248,265" className="empl-jmap-seg" strokeDasharray="1 12" style={{ stroke: entry }} />
              <path d="M248,265 L418,265" className="empl-jmap-seg empl-jmap-seg--thick" style={{ stroke: seg1 }} />
              <path d="M418,265 L560,265" className="empl-jmap-seg empl-jmap-seg--thick" style={{ stroke: seg2 }} />
              <path d="M560,265 L700,265" className="empl-jmap-seg empl-jmap-seg--thick" style={{ stroke: seg3 }} />
            </svg>

            {COORD.map((c, i) => {
              const kind = kindOf(i);
              const acc = accentSet(ACCENTS[i]);
              const big = i === WEIGHTED;
              return (
                <div key={i} className="empl-jmap-node" style={{ left: `${(c[0] / 760) * 100}%`, top: `${(c[1] / 400) * 100}%` }}>
                  {kind === "current" && (
                    <span className="empl-jmap-halo" style={{ background: `radial-gradient(circle, ${acc.glow}, transparent 70%)` }} />
                  )}
                  <div className="empl-jmap-dot" style={dotStyle(kind, big, acc, false)}>
                    {kind === "done" && <CheckIcon />}
                  </div>
                  <span className="empl-jmap-label" style={{ color: labelColor(kind, acc), fontWeight: labelWeight(kind) }}>
                    {LABELS[i]}
                    {SUBS[i] && <span className="empl-jmap-sub">{SUBS[i]}</span>}
                  </span>
                </div>
              );
            })}

            <div className="empl-jmap-cardfloat" style={{ opacity: reveal ? 1 : 0, transform: `translateX(-50%) translateY(${reveal ? "0" : "16px"})` }}>
              <JourneyCard step={STEPS[active]} acc={accentSet(ACCENTS[active])} />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile vertical stepper */}
      <div className="empl-jmap-vert" aria-hidden="true">
        <div className="empl-jmap-vinner">
          <span className="empl-jmap-vrail" />
          <span className="empl-jmap-vfill" style={{ height: `calc((100% - 44px) * ${active / 5})` }} />
          {LABELS.map((l, i) => {
            const kind = kindOf(i);
            const acc = accentSet(ACCENTS[i]);
            const big = i === WEIGHTED;
            return (
              <div key={i} className="empl-jmap-vrow">
                <div className="empl-jmap-vdotcol">
                  <span className="empl-jmap-dot" style={dotStyle(kind, big, acc, true)}>
                    {kind === "done" && <CheckIcon />}
                  </span>
                </div>
                <div className="empl-jmap-vcontent">
                  <p className="empl-jmap-vlabel" style={{ color: labelColor(kind, acc), fontWeight: labelWeight(kind) }}>
                    {l}
                    {SUBS[i] && <span className="empl-jmap-vsub">{SUBS[i]}</span>}
                  </p>
                  {i === active && (
                    <div className="empl-jmap-vcard" key={`vc-${active}`}>
                      <JourneyCard step={STEPS[active]} acc={acc} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
