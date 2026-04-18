/* ═════════════════════════════════════════════════════════════════
   src/components/marketing/RejectionReel.jsx
   CVPassport · Landing — The Rejection Reel (live ATS feed)

   DROP-IN (src/LandingPage.jsx):
     import RejectionReel from './components/marketing/RejectionReel';

     <HowItWorks />
     <RejectionReel />   ← here
     <ATSPreview />

   Converted verbatim from the Claude Design handoff
   (Rejection Reel.html). No logic rebuilt.
   ═════════════════════════════════════════════════════════════════ */

import React, { useEffect, useRef, useState } from "react";

const T = {
  ease: "cubic-bezier(0.4,0,0.2,1)",
  easeOut: "cubic-bezier(0.16,1,0.3,1)",
  font: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace",
};

/* ── Data pool — realistic GCC/India applicants ─────────────────── */
const CANDIDATES = [
  { id:"c01", initials:"AM", first:"Ahmed",   role:"Senior Finance Analyst",   company:"Emirates NBD",     city:"Dubai",      flag:"🇦🇪", market:"UAE",    reason:"NO_KEYWORD_MATCH",     reasonLong:"Missing 14 of 18 required keywords",         score:34, fileKB:187 },
  { id:"c02", initials:"PR", first:"Priya",   role:"Digital Marketing Manager",company:"Swiggy",           city:"Bengaluru",  flag:"🇮🇳", market:"IN",     reason:"FORMAT_UNPARSEABLE",   reasonLong:"Two-column layout broke the parser",          score:21, fileKB:312 },
  { id:"c03", initials:"RK", first:"Rajesh",  role:"IT Infrastructure Lead",   company:"Etihad Aviation",  city:"Abu Dhabi",  flag:"🇦🇪", market:"UAE",    reason:"NO_ACHIEVEMENTS",      reasonLong:"Job duties listed, zero quantified results",  score:41, fileKB:256 },
  { id:"c04", initials:"FH", first:"Fatima",  role:"Brand Strategist",         company:"Careem",           city:"Dubai",      flag:"🇦🇪", market:"UAE",    reason:"HEADER_IN_IMAGE",      reasonLong:"Name and contact stored as graphic, not text",score:18, fileKB:428 },
  { id:"c05", initials:"VS", first:"Vikram",  role:"Backend Engineer",         company:"Razorpay",         city:"Bengaluru",  flag:"🇮🇳", market:"IN",     reason:"GENERIC_SUMMARY",      reasonLong:"Summary matches 83% of applicant pool",       score:29, fileKB:198 },
  { id:"c06", initials:"NK", first:"Noura",   role:"HR Business Partner",      company:"ADNOC",            city:"Abu Dhabi",  flag:"🇦🇪", market:"UAE",    reason:"WRONG_SECTION_ORDER",  reasonLong:"Skills buried on page 3 — parser stopped",    score:38, fileKB:221 },
  { id:"c07", initials:"AS", first:"Arjun",   role:"Product Manager",          company:"Paytm",            city:"Noida",      flag:"🇮🇳", market:"IN",     reason:"DATE_GAP_UNEXPLAINED", reasonLong:"18-month gap flagged, no context given",      score:43, fileKB:174 },
  { id:"c08", initials:"MA", first:"Maryam",  role:"Supply Chain Analyst",     company:"Aramex",           city:"Dubai",      flag:"🇦🇪", market:"UAE",    reason:"NO_KEYWORD_MATCH",     reasonLong:"Missing 11 of 15 required keywords",         score:31, fileKB:209 },
  { id:"c09", initials:"SI", first:"Sanjay",  role:"Data Scientist",           company:"Flipkart",         city:"Bengaluru",  flag:"🇮🇳", market:"IN",     reason:"PDF_SCAN_ONLY",        reasonLong:"File was scanned, not text-based PDF",         score:12, fileKB:892 },
  { id:"c10", initials:"OK", first:"Omar",    role:"Relationship Manager",     company:"Mashreq Bank",     city:"Dubai",      flag:"🇦🇪", market:"UAE",    reason:"NO_ACHIEVEMENTS",      reasonLong:"Responsibilities only — no measurable impact",score:37, fileKB:244 },
  { id:"c11", initials:"DH", first:"Deepak",  role:"DevOps Engineer",          company:"Zomato",           city:"Gurgaon",    flag:"🇮🇳", market:"IN",     reason:"FORMAT_UNPARSEABLE",   reasonLong:"Tables caused column data to merge",          score:24, fileKB:301 },
  { id:"c12", initials:"LK", first:"Layla",   role:"Marketing Director",       company:"Majid Al Futtaim", city:"Dubai",      flag:"🇦🇪", market:"UAE",    reason:"TITLE_MISMATCH",       reasonLong:"Applied for Director — CV says Manager",      score:45, fileKB:267 },
  { id:"c13", initials:"KN", first:"Kavya",   role:"UX Designer",              company:"Byju's",           city:"Bengaluru",  flag:"🇮🇳", market:"IN",     reason:"NO_PORTFOLIO",         reasonLong:"Portfolio URL missing — auto-rejected",       score:48, fileKB:201 },
  { id:"c14", initials:"HB", first:"Hassan",  role:"Operations Supervisor",    company:"Jumeirah Group",   city:"Dubai",      flag:"🇦🇪", market:"UAE",    reason:"GENERIC_SUMMARY",      reasonLong:"Summary too broad — no role match",           score:33, fileKB:192 },
  { id:"c15", initials:"MP", first:"Meera",   role:"Investment Analyst",       company:"HDFC Bank",        city:"Mumbai",     flag:"🇮🇳", market:"IN",     reason:"FONT_EMBEDDED",        reasonLong:"Decorative font couldn't be read by ATS",     score:27, fileKB:234 },
  { id:"c16", initials:"YK", first:"Yousef",  role:"Commercial Manager",       company:"Al-Futtaim",       city:"Dubai",      flag:"🇦🇪", market:"UAE",    reason:"NO_KEYWORD_MATCH",     reasonLong:"Missing 9 of 12 domain keywords",            score:39, fileKB:215 },
];

/* ── Mini avatar ─────────────────────────────────────────────────── */
function TinyAvatar({ c, size = 32 }) {
  return (
    <span className="rr-av" style={{ width: size, height: size }}>
      <span className="rr-av-core" aria-hidden>{c.initials}</span>
      <span className="rr-av-flag" aria-hidden>{c.flag}</span>
    </span>
  );
}

/* ── Feed row ─────────────────────────────────────────────────────── */
function FeedRow({ c, state, age }) {
  // state: 'scanning' | 'rejected'
  const stateLabel = state === "scanning" ? "ANALYZING…" : "REJECTED";
  return (
    <div className={`rr-row rr-row--${state}`} style={{ "--rr-age": age }}>
      <span aria-hidden className="rr-row-slash" />
      <div className="rr-row-id">
        <span className="rr-row-time">{c.timestamp}</span>
        <span className="rr-row-tick">#{c.ticket}</span>
      </div>
      <TinyAvatar c={c} />
      <div className="rr-row-person">
        <div className="rr-row-name">{c.first} <span className="rr-row-initials">{c.initials.charAt(1)}.</span></div>
        <div className="rr-row-role">{c.role} <span className="rr-row-sep">·</span> {c.company} <span className="rr-row-sep">·</span> {c.city}</div>
      </div>
      <div className="rr-row-file">
        <span className="rr-row-filename">{c.first.toLowerCase()}_cv.pdf</span>
        <span className="rr-row-filesize">{c.fileKB}KB</span>
      </div>
      <div className="rr-row-score">
        <div className="rr-score-bar" aria-label={`Score ${c.score} of 100`}>
          <span className="rr-score-fill" style={{ width: `${c.score}%` }} />
        </div>
        <span className="rr-score-num">{c.score}</span>
      </div>
      <div className="rr-row-reason">
        <span className="rr-reason-tag"><span className="rr-mono">{c.reason}</span></span>
        <span className="rr-reason-long">{c.reasonLong}</span>
      </div>
      <div className="rr-row-state">
        {state === "scanning" ? (
          <>
            <span className="rr-scan-pulse" aria-hidden />
            <span className="rr-mono rr-state-txt rr-state-scan">{stateLabel}</span>
          </>
        ) : (
          <>
            <span className="rr-x" aria-hidden>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3 L11 11 M11 3 L3 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            </span>
            <span className="rr-mono rr-state-txt rr-state-rej">{stateLabel}</span>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Counter that ticks up over time ─────────────────────────────── */
function LiveCounter({ base, perSec }) {
  const [val, setVal] = useState(base);
  useEffect(() => {
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const elapsed = (now - start) / 1000;
      setVal(base + Math.floor(elapsed * perSec));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [base, perSec]);
  return <span className="rr-counter-num rr-tabnums">{val.toLocaleString("en-US")}</span>;
}

/* ── Main ─────────────────────────────────────────────────────────── */
export default function RejectionReel() {
  const poolRef = useRef(null);
  const [rows, setRows] = useState([]); // [{c, state, id, age}]
  const [tickCount, setTickCount] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Seed with 7 rows — newest at top, oldest at bottom
  useEffect(() => {
    const seed = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const c = { ...CANDIDATES[i], timestamp: fmtTime(new Date(now.getTime() - i * 2400)), ticket: `DX${String(48217 + i).padStart(5,"0")}` };
      seed.push({ c, state: i === 0 ? "scanning" : "rejected", id: `seed-${i}`, age: i });
    }
    setRows(seed);
  }, []);

  // Reel tick: every 2.4s advance — top scanning becomes rejected, new scanning row appears, oldest drops off
  useEffect(() => {
    if (isPaused) return undefined;
    const iv = setInterval(() => {
      setTickCount((t) => t + 1);
      setRows((prev) => {
        // Mark top row as rejected
        const aged = prev.map((r, i) => i === 0 ? { ...r, state: "rejected" } : r);
        // Pick next candidate (stable round-robin through CANDIDATES, skipping any currently visible)
        const visibleIds = new Set(aged.map((r) => r.c.id));
        const next = CANDIDATES.find((x) => !visibleIds.has(x.id)) || CANDIDATES[(tickCount + 9) % CANDIDATES.length];
        const now = new Date();
        const newRow = {
          c: { ...next, timestamp: fmtTime(now), ticket: `DX${String(48224 + tickCount).padStart(5,"0")}` },
          state: "scanning",
          id: `row-${tickCount}-${next.id}`,
          age: 0,
        };
        // Shift ages, drop last, prepend
        const shifted = aged.map((r) => ({ ...r, age: r.age + 1 })).slice(0, 6);
        return [newRow, ...shifted];
      });
    }, 2400);
    return () => clearInterval(iv);
  }, [isPaused, tickCount]);

  // Stats
  const rejectedIn7 = rows.filter((r) => r.state === "rejected").length;

  return (
    <section className="rr-section" aria-label="The silent CV rejection reel">
      <style>{CSS_TEXT}</style>

      {/* Ambient */}
      <div aria-hidden className="rr-bg-grid" />
      <div aria-hidden className="rr-bg-vignette" />
      <div aria-hidden className="rr-bg-scanline" />

      <div className="rr-wrap">
        {/* ── Header ───────────────────────────────────────────── */}
        <header className="rr-header">
          <div className="rr-tag-line">
            <span className="rr-tag-pulse" aria-hidden />
            <span className="rr-mono rr-tag-live">LIVE · DUBAI / MUMBAI / BENGALURU FEED</span>
          </div>
          <h2 className="rr-title">
            <span className="rr-title-strong">Right now,</span>
            <span className="rr-title-main">a CV is being rejected</span>
            <span className="rr-title-main"><span className="rr-underline">before anyone reads it.</span></span>
          </h2>
          <p className="rr-subtitle">
            Every minute, hundreds of applications across the GCC and India get filtered out by ATS software. No rejection email. No feedback. <span className="rr-sub-strong">Just silence.</span>
          </p>
        </header>

        {/* ── Stat bar ─────────────────────────────────────────── */}
        <div className="rr-statbar">
          <div className="rr-stat">
            <span className="rr-mono rr-stat-label rr-stat-label-primary">REJECTED TODAY · GCC + IN</span>
            <div className="rr-stat-num-row">
              <LiveCounter base={214673} perSec={2.3} />
              <span className="rr-stat-trend">▲ 4.8% WoW</span>
            </div>
          </div>
          <div className="rr-stat-sep" />
          <div className="rr-stat rr-stat-mid">
            <span className="rr-mono rr-stat-label">NEVER REACH A HUMAN</span>
            <div className="rr-stat-num-row">
              <span className="rr-counter-num">75<span className="rr-pct">%</span></span>
              <span className="rr-stat-note">of all applications</span>
            </div>
          </div>
          <div className="rr-stat-sep" />
          <div className="rr-stat">
            <span className="rr-mono rr-stat-label">AVG SECONDS TO REJECT</span>
            <div className="rr-stat-num-row">
              <span className="rr-counter-num">7.4<span className="rr-pct">s</span></span>
              <span className="rr-stat-note">automated scan</span>
            </div>
          </div>
        </div>

        {/* ── The Reel ─────────────────────────────────────────── */}
        <div
          className="rr-reel"
          ref={poolRef}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Reel chrome */}
          <div className="rr-reel-chrome">
            <div className="rr-reel-chrome-left">
              <div className="rr-lights">
                <span className="rr-light rr-light-r" />
                <span className="rr-light rr-light-y" />
                <span className="rr-light rr-light-g" />
              </div>
              <span className="rr-mono rr-reel-title">ATS_SCREENING_BUFFER · REGION_MENA_IN</span>
            </div>
            <div className="rr-reel-chrome-right">
              <span className="rr-mono rr-reel-status">
                <span className="rr-live-dot" />
                STREAMING · {isPaused ? "PAUSED" : "LIVE"}
              </span>
              <span className="rr-mono rr-reel-count">{rejectedIn7}/7 REJECTED</span>
            </div>
          </div>

          {/* Column headers */}
          <div className="rr-reel-headers">
            <span className="rr-hdr rr-hdr-id">TS · TICKET</span>
            <span className="rr-hdr rr-hdr-av"></span>
            <span className="rr-hdr rr-hdr-person">APPLICANT · ROLE</span>
            <span className="rr-hdr rr-hdr-file">FILE</span>
            <span className="rr-hdr rr-hdr-score">ATS SCORE</span>
            <span className="rr-hdr rr-hdr-reason">FAILURE REASON</span>
            <span className="rr-hdr rr-hdr-state">STATUS</span>
          </div>

          {/* Rows */}
          <div className="rr-rows">
            {rows.map((r) => (
              <FeedRow key={r.id} c={r.c} state={r.state} age={r.age} />
            ))}
          </div>

          {/* Bottom chrome — disclosure */}
          <div className="rr-reel-foot">
            <span className="rr-mono rr-foot-note">
              <span className="rr-foot-dot" /> Sample data — based on public ATS rejection studies for GCC &amp; Indian job markets (2024–25).
            </span>
            <span className="rr-mono rr-foot-ver">v2.14.0 · REEL-STREAM</span>
          </div>
        </div>

        {/* ── Emotional bridge ─────────────────────────────────── */}
        <div className="rr-bridge">
          <div className="rr-bridge-line" aria-hidden />
          <div className="rr-bridge-body">
            <span className="rr-mono rr-bridge-eyebrow">THE QUIET TRUTH</span>
            <p className="rr-bridge-copy">
              If you've applied to <span className="rr-bridge-n">20+</span> jobs this month and heard <span className="rr-bridge-n">nothing</span> back,<br/>
              <span className="rr-bridge-em">your CV is probably already on this reel.</span>
            </p>
          </div>
          <div className="rr-bridge-line" aria-hidden />
        </div>

        {/* ── The fix — inline CTA ─────────────────────────────── */}
        <div className="rr-fix">
          <div className="rr-fix-left">
            <span className="rr-mono rr-fix-eyebrow">THE FIX · 60 SECONDS</span>
            <h3 className="rr-fix-title">Find out <em>before</em> you apply.</h3>
            <p className="rr-fix-desc">
              Upload your CV. We'll scan it through the same filters <span className="rr-fix-strong">Emirates NBD, Etihad, Careem, Swiggy and Razorpay</span> use — and show you exactly what breaks before a recruiter ever sees silence.
            </p>
            <div className="rr-fix-ctas">
              <button className="rr-btn rr-btn-primary" type="button">
                <span className="rr-btn-beam" aria-hidden />
                <span>Scan My CV — Free</span>
                <span className="rr-btn-arrow" aria-hidden>→</span>
              </button>
              <button className="rr-btn rr-btn-ghost" type="button">See a sample report</button>
            </div>
            <div className="rr-fix-trust">
              <span className="rr-trust-item"><span className="rr-trust-check" aria-hidden /> No sign-up to scan</span>
              <span className="rr-trust-sep" />
              <span className="rr-trust-item"><span className="rr-trust-check" aria-hidden /> Report in 60 seconds</span>
              <span className="rr-trust-sep" />
              <span className="rr-trust-item"><span className="rr-trust-check" aria-hidden /> No data stored</span>
            </div>
          </div>

          <aside className="rr-fix-right">
            <div className="rr-cardlet">
              <div className="rr-cardlet-head">
                <span className="rr-mono">PREVIEW · YOUR REPORT</span>
                <span className="rr-cardlet-score">
                  <span className="rr-cardlet-score-num">—</span>
                  <span className="rr-cardlet-score-of">/100</span>
                </span>
              </div>
              <div className="rr-cardlet-rows">
                {[
                  { k:"Keyword match",    v:"——",  state:"idle" },
                  { k:"Format integrity", v:"——",  state:"idle" },
                  { k:"Achievements",     v:"——",  state:"idle" },
                  { k:"Section order",    v:"——",  state:"idle" },
                ].map((r) => (
                  <div key={r.k} className="rr-cardlet-row">
                    <span className="rr-cardlet-k">{r.k}</span>
                    <span className="rr-cardlet-dash" />
                    <span className="rr-mono rr-cardlet-v">{r.v}</span>
                  </div>
                ))}
              </div>
              <div className="rr-cardlet-foot">
                <span className="rr-mono">AWAITING UPLOAD</span>
                <span className="rr-cardlet-dot" />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function fmtTime(d) {
  const h = String(d.getHours()).padStart(2,"0");
  const m = String(d.getMinutes()).padStart(2,"0");
  const s = String(d.getSeconds()).padStart(2,"0");
  return `${h}:${m}:${s}`;
}

const CSS_TEXT = `
@keyframes rr-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }
@keyframes rr-pulse-strong { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.18); opacity: 0.5; } }
@keyframes rr-beam { 0% { transform: translateX(-100%); } 100% { transform: translateX(280%); } }
@keyframes rr-scanline-drift { 0% { transform: translateY(0); } 100% { transform: translateY(12px); } }
@keyframes rr-row-enter {
  0%   { opacity: 0; transform: translateY(-12px); background-color: rgba(255,255,255,0.035); }
  60%  { opacity: 1; }
  100% { opacity: 1; transform: translateY(0); background-color: transparent; }
}
@keyframes rr-reject-flash {
  0%   { background-color: rgba(224,96,74,0.10); }
  100% { background-color: rgba(224,96,74,0.00); }
}
@keyframes rr-scan-pulse {
  0%,100% { box-shadow: 0 0 0 0 rgba(229,178,77,0.55); }
  50%     { box-shadow: 0 0 0 6px rgba(229,178,77,0); }
}
@keyframes rr-underline {
  0%   { transform: scaleX(0); }
  100% { transform: scaleX(1); }
}
@keyframes rr-counter-tick {
  0% { transform: translateY(6px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}

.rr-section { position: relative; background: #0A0A0A; color: #fff; font-family: ${T.font}; -webkit-font-smoothing: antialiased; padding: 120px 40px 120px; overflow: hidden; isolation: isolate; border-top: 1px solid rgba(255,255,255,0.06); }
.rr-section *, .rr-section *::before, .rr-section *::after { box-sizing: border-box; -webkit-font-smoothing: antialiased; }

.rr-mono { font-family: ${T.mono}; letter-spacing: 0.14em; }
.rr-tabnums { font-variant-numeric: tabular-nums; }

/* Ambient */
.rr-bg-grid {
  position: absolute; inset: 0; pointer-events: none; opacity: 0.35;
  background-image:
    linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, #000 30%, transparent 85%);
}
.rr-bg-vignette {
  position: absolute; inset: 0; pointer-events: none;
  background:
    radial-gradient(ellipse 50% 40% at 50% 30%, rgba(224,96,74,0.06) 0%, transparent 60%),
    radial-gradient(ellipse 60% 50% at 50% 50%, transparent 40%, rgba(0,0,0,0.6) 100%);
}
.rr-bg-scanline {
  position: absolute; inset: 0; pointer-events: none; opacity: 0.3;
  background: repeating-linear-gradient(to bottom, rgba(255,255,255,0.015) 0 1px, transparent 1px 4px);
  animation: rr-scanline-drift 0.8s linear infinite;
}

.rr-wrap { position: relative; max-width: 1200px; margin: 0 auto; }

/* ─ Header ─ */
.rr-header { text-align: center; max-width: 860px; margin: 0 auto 48px; }
.rr-tag-line { display: inline-flex; align-items: center; gap: 10px; padding: 8px 14px; border-radius: 999px; background: rgba(224,96,74,0.08); border: 1px solid rgba(224,96,74,0.25); margin-bottom: 28px; }
.rr-tag-pulse { width: 8px; height: 8px; border-radius: 50%; background: #E0604A; box-shadow: 0 0 12px rgba(224,96,74,0.8); animation: rr-pulse-strong 1.5s ease-in-out infinite; }
.rr-tag-live { font-size: 10px; font-weight: 700; color: #E0604A; }

.rr-title { font-size: clamp(34px, 5vw, 64px); font-weight: 800; letter-spacing: -0.035em; line-height: 1.06; margin: 0 0 22px; display: grid; gap: 2px; text-wrap: balance; }
.rr-title-strong { color: #E0604A; font-weight: 900; font-size: 0.62em; letter-spacing: 0.18em; text-transform: uppercase; line-height: 1; margin-bottom: 14px; }
.rr-title-main { color: #fff; font-weight: 800; }
.rr-underline { display: inline-block; position: relative; padding-bottom: 4px; }
.rr-underline::after { content: ""; position: absolute; left: 0; right: 0; bottom: 0; height: 3px; background: #E0604A; border-radius: 2px; transform-origin: left center; animation: rr-underline 1200ms ${T.easeOut} 300ms forwards; transform: scaleX(0); box-shadow: 0 0 14px rgba(224,96,74,0.7); }

.rr-subtitle { font-size: clamp(15px, 1.6vw, 18px); line-height: 1.55; color: #A0A0A0; margin: 0 auto; max-width: 680px; text-wrap: pretty; }
.rr-sub-strong { color: #fff; font-weight: 700; }

/* ─ Stat bar ─ */
.rr-statbar { display: grid; grid-template-columns: 1fr auto 1fr auto 1fr; align-items: center; gap: 28px; padding: 24px 32px; margin: 0 auto 36px; max-width: 960px; border-radius: 18px; background: linear-gradient(145deg, #141414, #0C0C0C); border-top: 1px solid #262626; border-left: 1px solid #222; border-right: 1px solid #1A1A1A; border-bottom: 1px solid #1A1A1A; box-shadow: 0 10px 30px -10px rgba(0,0,0,0.5); }
.rr-stat { display: grid; gap: 10px; min-width: 0; }
.rr-stat-mid { text-align: center; }
.rr-stat-label { font-size: 11px; color: #E0604A; font-weight: 700; letter-spacing: 0.2em; text-shadow: 0 0 12px rgba(224,96,74,0.35); }
.rr-stat-label-primary { color: #E0604A; display: inline-flex; align-items: center; gap: 8px; padding: 4px 10px; border-radius: 4px; background: rgba(224,96,74,0.08); border-left: 2px solid #E0604A; }
.rr-stat-label-primary::before { content: ""; width: 6px; height: 6px; border-radius: 50%; background: #E0604A; box-shadow: 0 0 10px rgba(224,96,74,0.9); animation: rr-pulse-strong 1.4s ease-in-out infinite; }
.rr-stat-num-row { display: flex; align-items: baseline; gap: 10px; justify-content: flex-start; flex-wrap: wrap; }
.rr-stat-mid .rr-stat-num-row { justify-content: center; }
.rr-counter-num { font-family: ${T.font}; font-size: 32px; font-weight: 800; color: #fff; letter-spacing: -0.04em; line-height: 1; font-variant-numeric: tabular-nums; }
.rr-pct { font-size: 0.6em; color: #A0A0A0; font-weight: 700; margin-left: 2px; }
.rr-stat-trend { font-size: 10px; color: #E0604A; font-weight: 700; letter-spacing: 0.1em; font-family: ${T.mono}; }
.rr-stat-note { font-size: 11px; color: #A0A0A0; }
.rr-stat-sep { width: 1px; height: 36px; background: linear-gradient(to bottom, transparent, #2A2A2A, transparent); }

/* ─ Reel ─ */
.rr-reel { position: relative; border-radius: 20px; overflow: hidden; background: linear-gradient(180deg, #0E0E0E 0%, #0A0A0A 100%); border-top: 1px solid #2A2A2A; border-left: 1px solid #222; border-right: 1px solid #1A1A1A; border-bottom: 1px solid #1A1A1A; box-shadow: 0 30px 80px -30px rgba(0,0,0,0.7), inset 0 0 0 1px rgba(255,255,255,0.02); }

.rr-reel-chrome { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 14px 20px; background: linear-gradient(180deg, #121212, #0C0C0C); border-bottom: 1px solid #1E1E1E; flex-wrap: wrap; }
.rr-reel-chrome-left, .rr-reel-chrome-right { display: flex; align-items: center; gap: 14px; }
.rr-lights { display: flex; gap: 6px; }
.rr-light { width: 10px; height: 10px; border-radius: 50%; }
.rr-light-r { background: #E0604A; }
.rr-light-y { background: #E5B24D; }
.rr-light-g { background: #46C99A; box-shadow: 0 0 6px rgba(70,201,154,0.6); }
.rr-reel-title { font-size: 10px; color: #A0A0A0; font-weight: 600; }
.rr-reel-status { font-size: 10px; color: #46C99A; font-weight: 700; display: inline-flex; align-items: center; gap: 8px; }
.rr-live-dot { width: 7px; height: 7px; border-radius: 50%; background: #46C99A; box-shadow: 0 0 8px rgba(70,201,154,0.8); animation: rr-pulse-strong 1.4s ease-in-out infinite; }
.rr-reel-count { font-size: 10px; color: #E0604A; font-weight: 700; padding: 4px 8px; border-radius: 6px; background: rgba(224,96,74,0.1); border: 1px solid rgba(224,96,74,0.25); }

/* Column headers */
.rr-reel-headers {
  display: grid;
  grid-template-columns: 120px 36px minmax(0,1.4fr) 110px 130px minmax(0,1.6fr) 130px;
  gap: 14px;
  padding: 10px 20px;
  background: #0A0A0A;
  border-bottom: 1px solid #1A1A1A;
}
.rr-hdr { font-family: ${T.mono}; font-size: 9px; color: #555; letter-spacing: 0.18em; font-weight: 600; }

/* Rows */
.rr-rows { display: flex; flex-direction: column; }
.rr-row {
  position: relative;
  display: grid;
  grid-template-columns: 120px 36px minmax(0,1.4fr) 110px 130px minmax(0,1.6fr) 130px;
  gap: 14px;
  padding: 14px 20px;
  align-items: center;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  transition: background-color 320ms ${T.ease}, opacity 320ms ${T.ease};
  opacity: calc(1 - (var(--rr-age, 0) * 0.07));
}
.rr-row:last-child { border-bottom: none; }
.rr-row-slash { position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: transparent; transition: background-color 320ms ${T.ease}, box-shadow 320ms ${T.ease}; }
.rr-row--scanning { animation: rr-row-enter 500ms ${T.easeOut} both; }
.rr-row--scanning .rr-row-slash { background: #E5B24D; box-shadow: 0 0 12px rgba(229,178,77,0.55); }
.rr-row--rejected .rr-row-slash { background: #E0604A; box-shadow: 0 0 10px rgba(224,96,74,0.45); }
.rr-row--rejected { animation: rr-reject-flash 800ms ${T.ease} both; }

.rr-row-id { display: grid; gap: 2px; min-width: 0; }
.rr-row-time { font-family: ${T.mono}; font-size: 11px; color: #fff; font-weight: 600; font-variant-numeric: tabular-nums; letter-spacing: 0.02em; }
.rr-row-tick { font-family: ${T.mono}; font-size: 9.5px; color: #6A6A6A; letter-spacing: 0.1em; }

/* Avatar */
.rr-av { position: relative; display: inline-flex; flex-shrink: 0; border-radius: 50%; }
.rr-av-core { width: 100%; height: 100%; border-radius: 50%; background: linear-gradient(135deg, #1C1C1C, #0F0F0F); border: 1px solid #2A2A2A; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: #fff; letter-spacing: -0.3px; }
.rr-av-flag { position: absolute; right: -3px; bottom: -3px; width: 14px; height: 14px; border-radius: 50%; background: #0A0A0A; border: 2px solid #0A0A0A; display: inline-flex; align-items: center; justify-content: center; font-size: 8px; line-height: 1; box-shadow: 0 2px 6px rgba(0,0,0,0.5); }

.rr-row-person { display: grid; gap: 3px; min-width: 0; }
.rr-row-name { font-family: ${T.font}; font-size: 13.5px; font-weight: 700; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: -0.01em; }
.rr-row-initials { font-family: ${T.font}; color: #A0A0A0; font-weight: 500; margin-left: 2px; letter-spacing: 0; }
.rr-row-role { font-family: ${T.font}; font-size: 12px; color: #A0A0A0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; letter-spacing: 0; font-weight: 500; }
.rr-row-sep { color: #3A3A3A; margin: 0 6px; font-family: ${T.font}; }
.rr-row-file { display: grid; gap: 2px; min-width: 0; }
.rr-row-filename { font-family: ${T.mono}; font-size: 11px; color: #A0A0A0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rr-row-filesize { font-family: ${T.mono}; font-size: 9.5px; color: #555; letter-spacing: 0.1em; }

.rr-row-score { display: flex; align-items: center; gap: 8px; }
.rr-score-bar { position: relative; width: 70px; height: 6px; border-radius: 999px; background: #1A1A1A; border: 1px solid #222; overflow: hidden; flex-shrink: 0; }
.rr-score-fill { position: absolute; left: 0; top: 0; bottom: 0; background: linear-gradient(90deg, #E0604A, #E5B24D); border-radius: 999px; box-shadow: 0 0 8px rgba(224,96,74,0.45); transition: width 600ms ${T.easeOut}; }
.rr-score-num { font-family: ${T.mono}; font-size: 12px; font-weight: 700; color: #E0604A; font-variant-numeric: tabular-nums; min-width: 24px; }

.rr-row-reason { display: grid; gap: 3px; min-width: 0; }
.rr-reason-tag { display: inline-flex; width: max-content; padding: 3px 8px; border-radius: 4px; background: rgba(224,96,74,0.1); border: 1px solid rgba(224,96,74,0.25); font-size: 9.5px; font-weight: 700; color: #E0604A; letter-spacing: 0.14em; }
.rr-reason-long { font-size: 11px; color: #A0A0A0; line-height: 1.4; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.rr-row-state { display: inline-flex; align-items: center; gap: 8px; justify-content: flex-end; white-space: nowrap; }
.rr-scan-pulse { width: 8px; height: 8px; border-radius: 50%; background: #E5B24D; animation: rr-scan-pulse 1.4s ease-in-out infinite; flex-shrink: 0; }
.rr-x { width: 20px; height: 20px; border-radius: 50%; background: rgba(224,96,74,0.12); border: 1px solid rgba(224,96,74,0.4); display: inline-flex; align-items: center; justify-content: center; color: #E0604A; flex-shrink: 0; }
.rr-state-txt { font-size: 10px; font-weight: 700; letter-spacing: 0.18em; }
.rr-state-scan { color: #E5B24D; }
.rr-state-rej { color: #E0604A; }

/* Reel foot */
.rr-reel-foot { display: flex; justify-content: space-between; align-items: center; gap: 14px; padding: 12px 20px; background: #070707; border-top: 1px solid #1A1A1A; flex-wrap: wrap; }
.rr-foot-note { font-family: ${T.font} !important; font-size: 11px; color: #A0A0A0; font-weight: 500; display: inline-flex; align-items: center; gap: 8px; letter-spacing: 0; line-height: 1.4; }
.rr-foot-dot { width: 5px; height: 5px; border-radius: 50%; background: #6A6A6A; }
.rr-foot-ver { font-size: 9.5px; color: #3A3A3A; font-weight: 600; }

/* ─ Bridge ─ */
.rr-bridge { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 28px; margin: 64px auto 48px; max-width: 820px; }
.rr-bridge-line { height: 1px; background: linear-gradient(to right, transparent, rgba(255,255,255,0.15), transparent); }
.rr-bridge-body { text-align: center; }
.rr-bridge-eyebrow { font-size: 10px; font-weight: 600; color: #E0604A; margin-bottom: 14px; display: inline-block; }
.rr-bridge-copy { font-size: clamp(18px, 2.2vw, 24px); font-weight: 600; color: #A0A0A0; margin: 0; line-height: 1.45; letter-spacing: -0.015em; text-wrap: balance; }
.rr-bridge-n { color: #fff; font-weight: 800; }
.rr-bridge-em { color: #fff; font-weight: 700; }

/* ─ Fix / CTA block ─ */
.rr-fix { display: grid; grid-template-columns: 1.5fr 1fr; gap: 40px; align-items: center; padding: 44px; border-radius: 22px; background: radial-gradient(circle at 20% 0%, rgba(70,201,154,0.04) 0%, transparent 55%), linear-gradient(145deg, #141414 0%, #0C0C0C 100%); border-top: 1px solid #2A2A2A; border-left: 1px solid #222; border-right: 1px solid #1A1A1A; border-bottom: 1px solid #1A1A1A; box-shadow: 0 30px 80px -30px rgba(0,0,0,0.6); }

.rr-fix-left { display: grid; gap: 18px; }
.rr-fix-eyebrow { font-size: 10px; font-weight: 700; color: #46C99A; }
.rr-fix-title { font-size: clamp(26px, 3.4vw, 40px); font-weight: 800; letter-spacing: -0.03em; line-height: 1.1; margin: 0; color: #fff; }
.rr-fix-title em { font-style: italic; font-weight: 800; color: #46C99A; }
.rr-fix-desc { font-size: 15px; line-height: 1.6; color: #A0A0A0; margin: 0; max-width: 540px; text-wrap: pretty; }
.rr-fix-strong { color: #fff; font-weight: 600; }

.rr-fix-ctas { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 6px; }

.rr-btn { position: relative; display: inline-flex; align-items: center; gap: 10px; padding: 14px 22px; border-radius: 10px; font-family: ${T.font}; font-size: 14px; font-weight: 700; cursor: pointer; border: none; overflow: hidden; transition: transform 200ms ${T.ease}, box-shadow 200ms ${T.ease}, opacity 200ms ${T.ease}; }
.rr-btn:hover { transform: translateY(-1px); }
.rr-btn-primary { background: #fff; color: #000; box-shadow: 0 10px 24px rgba(255,255,255,0.15), 0 0 0 1px rgba(255,255,255,0.1); }
.rr-btn-primary:hover { box-shadow: 0 12px 30px rgba(255,255,255,0.25), 0 0 0 1px rgba(255,255,255,0.15); }
.rr-btn-beam { position: absolute; top: 0; left: 0; bottom: 0; width: 40%; background: linear-gradient(90deg, transparent, rgba(0,0,0,0.1), transparent); animation: rr-beam 3s ${T.ease} infinite; pointer-events: none; }
.rr-btn-arrow { transition: transform 240ms ${T.ease}; }
.rr-btn-primary:hover .rr-btn-arrow { transform: translateX(3px); }
.rr-btn-ghost { background: transparent; color: #fff; border: 1px solid #2A2A2A; }
.rr-btn-ghost:hover { border-color: #3A3A3A; background: rgba(255,255,255,0.03); }

.rr-fix-trust { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-top: 10px; }
.rr-trust-item { font-size: 11.5px; color: #A0A0A0; display: inline-flex; align-items: center; gap: 6px; }
.rr-trust-check { width: 14px; height: 14px; border-radius: 50%; background: rgba(70,201,154,0.12); border: 1px solid rgba(70,201,154,0.5); position: relative; flex-shrink: 0; }
.rr-trust-check::after { content: ""; position: absolute; left: 3px; top: 5px; width: 4px; height: 2px; border-left: 1.5px solid #46C99A; border-bottom: 1.5px solid #46C99A; transform: rotate(-45deg); }
.rr-trust-sep { width: 3px; height: 3px; border-radius: 50%; background: #2A2A2A; }

/* Cardlet preview */
.rr-fix-right { display: flex; justify-content: center; }
.rr-cardlet { width: 100%; max-width: 320px; border-radius: 14px; padding: 18px; background: #0A0A0A; border-top: 1px solid #2A2A2A; border-left: 1px solid #222; border-right: 1px solid #1A1A1A; border-bottom: 1px solid #1A1A1A; display: grid; gap: 14px; box-shadow: 0 20px 50px -20px rgba(0,0,0,0.6); }
.rr-cardlet-head { display: flex; justify-content: space-between; align-items: center; font-size: 9.5px; color: #6A6A6A; font-weight: 600; }
.rr-cardlet-score { display: inline-flex; align-items: baseline; gap: 2px; }
.rr-cardlet-score-num { font-family: ${T.font}; font-size: 28px; font-weight: 800; color: #3A3A3A; letter-spacing: -0.05em; line-height: 1; }
.rr-cardlet-score-of { font-family: ${T.mono}; font-size: 11px; color: #3A3A3A; }
.rr-cardlet-rows { display: grid; gap: 8px; }
.rr-cardlet-row { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 10px; }
.rr-cardlet-k { font-size: 11.5px; color: #A0A0A0; }
.rr-cardlet-dash { height: 1px; background: linear-gradient(to right, transparent, #1E1E1E); }
.rr-cardlet-v { font-size: 10.5px; color: #3A3A3A; font-weight: 600; letter-spacing: 0.14em; }
.rr-cardlet-foot { display: flex; justify-content: space-between; align-items: center; padding-top: 12px; border-top: 1px solid #141414; font-size: 9.5px; color: #6A6A6A; font-weight: 600; }
.rr-cardlet-dot { width: 6px; height: 6px; border-radius: 50%; background: #E5B24D; box-shadow: 0 0 8px rgba(229,178,77,0.6); animation: rr-pulse 1.6s ease-in-out infinite; }

/* ─ Responsive ─ */
@media (max-width: 980px) {
  .rr-statbar { grid-template-columns: 1fr; gap: 16px; text-align: center; padding: 20px 24px; }
  .rr-stat { justify-items: center; }
  .rr-stat-mid { text-align: center; }
  .rr-stat-sep { display: none; }
  .rr-stat-num-row { justify-content: center; }

  .rr-reel-headers { display: none; }
  .rr-row {
    grid-template-columns: auto 1fr auto;
    grid-template-rows: auto auto auto;
    gap: 4px 12px;
    padding: 14px 18px 14px 20px;
    align-items: center;
  }
  .rr-row-id { grid-column: 1; grid-row: 1; }
  .rr-av { grid-column: 1; grid-row: 2 / span 2; align-self: start; margin-top: 2px; }
  .rr-row-person { grid-column: 2; grid-row: 2; }
  .rr-row-state { grid-column: 3; grid-row: 1; }
  .rr-row-file { grid-column: 2 / span 2; grid-row: 3; display: flex; gap: 10px; align-items: center; }
  .rr-row-score { grid-column: 3; grid-row: 2; }
  .rr-row-reason { grid-column: 2 / span 2; grid-row: 4; margin-top: 4px; }
  .rr-row-role { white-space: normal; }
  .rr-reason-long { white-space: normal; }

  .rr-fix { grid-template-columns: 1fr; padding: 28px; gap: 28px; }
  .rr-fix-right { order: -1; }
}

@media (max-width: 640px) {
  .rr-section { padding: 70px 18px 70px; }
  .rr-title-strong { font-size: 10px; letter-spacing: 0.22em; margin-bottom: 10px; }
  .rr-title { font-size: 30px; }
  .rr-subtitle { font-size: 14px; }
  .rr-counter-num { font-size: 26px; }
  .rr-reel-chrome { padding: 12px 14px; gap: 10px; }
  .rr-reel-title { font-size: 9px; }
  .rr-row { padding: 12px 14px 12px 16px; }
  .rr-bridge { grid-template-columns: 1fr; gap: 16px; margin: 44px auto 36px; }
  .rr-bridge-line { display: none; }
  .rr-bridge-copy { font-size: 17px; }
  .rr-btn { width: 100%; justify-content: center; }
}
`;
