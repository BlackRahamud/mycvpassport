/* ═══════════════════════════════════════════════════════════════════════════
   src/pages/ToolsPage.jsx
   CVPassport · /tools — Career Engineering Suite

   Adapted from TestimonialsGrid's "Lounge" pattern: 3D perspective stage,
   auto-rotation, orbit → stage transitions, rail nav with progress fill.
   Three live tools in the carousel; three "coming soon" cards in a static
   greyed grid underneath.
   ═══════════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";

const T = {
  text: "#FFFFFF",
  muted: "#A0A0A0",
  mutedDim: "#6A6A6A",
  font: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace",
  ease: "cubic-bezier(0.4,0,0.2,1)",
  easeOut: "cubic-bezier(0.16,1,0.3,1)",
};

const TOOLS = [
  {
    id: "gulf-career",
    number: "01",
    name: "Gulf Career Intelligence",
    tagline: "Discover what your CV is actually worth in the Gulf.",
    long: "Live UAE and Saudi salary bands, keyword density and recruiter signals, mapped to your role and years of experience. Know where you sit before you apply.",
    route: "/gulf-career",
    cta: "Open Career Intelligence",
    ring: "#D97706",
    bleedRGB: "217,119,6",
    glyph: "GCI",
    tag: "FLAGSHIP",
    flagship: true,
    sample: "Senior Analyst \u00B7 DXB \u2192 AED 28\u201342K",
  },
  {
    id: "salary",
    number: "02",
    name: "Salary Switcher",
    tagline: "See your offer reframed across UAE, Saudi and India.",
    long: "Pick your role, pick your experience, see the real multiplier between a pre-tax INR salary and a tax-free AED package. Share a brag card in one tap.",
    route: "/salary-switcher",
    cta: "Open Salary Switcher",
    ring: "#378ADD",
    bleedRGB: "55,138,221",
    glyph: "\u20B9/AED",
    tag: "LIVE",
    flagship: false,
    sample: "\u20B98 LPA \u2192 AED 38,000",
  },
  {
    id: "ats",
    number: "03",
    name: "ATS Score Checker",
    tagline: "See exactly how recruiters screen your CV.",
    long: "Upload your CV and see exactly where the bots will reject you — missing keywords, bad formatting, weak headlines. Built on real GCC job description data.",
    route: "/ats",
    cta: "Run ATS Check",
    ring: "#1D9E75",
    bleedRGB: "29,158,117",
    glyph: "ATS",
    tag: "LIVE",
    flagship: false,
    sample: "Sales Manager \u2192 72/100",
  },
  {
    id: "linkedin",
    number: "04",
    name: "LinkedIn Optimizer",
    tagline: "Optimise your LinkedIn profile for Gulf recruiter searches.",
    long: "AI-rewritten headline and About section, tuned for how UAE and GCC recruiters search. Free to try; no signup required to see the first draft.",
    route: "/linkedin-optimizer",
    cta: "Optimise LinkedIn",
    ring: "#06B6D4",
    bleedRGB: "6,182,212",
    glyph: "in",
    tag: "LIVE",
    flagship: false,
    sample: "Profile Strength \u00b7 DXB visibility \u2192 Top 10%",
  },
];

const COMING_SOON = [
  {
    id: "cv-sim",
    number: "04",
    name: "CV Score Simulator",
    tagline: "Preview how a recruiter scores your CV — before you hit send.",
    glyph: "%",
  },
  {
    id: "kw",
    number: "05",
    name: "GCC Keyword Checker",
    tagline: "Match your CV against the exact phrases Gulf recruiters search for.",
    glyph: "\u2315",
  },
  {
    id: "iq",
    number: "06",
    name: "Interview Q Generator",
    tagline: "Role-specific interview questions drilled down to Gulf-hiring style.",
    glyph: "?",
  },
];

const Mono = ({ children, className, style }) => (
  <span className={className} style={{ fontFamily: T.mono, letterSpacing: "0.14em", ...style }}>
    {children}
  </span>
);

function ToolGlyph({ data, size = 64 }) {
  return (
    <span
      className="tp-glyph-wrap"
      style={{
        "--tp-ring": data.ring,
        "--tp-bleed": data.bleedRGB,
        width: size,
        height: size,
      }}
    >
      <span aria-hidden className="tp-glyph-ring" />
      <span className="tp-glyph" aria-hidden>
        <span className="tp-glyph-text" style={{ fontSize: Math.round(size * 0.28) }}>
          {data.glyph}
        </span>
      </span>
    </span>
  );
}

/* ── Desktop: The Stage ───────────────────────────────────────── */
function DesktopStage({ activeIdx, setActiveIdx, onOpen }) {
  const active = TOOLS[activeIdx];
  const orbits = TOOLS.map((c, i) => ({ ...c, i, isActive: i === activeIdx }));
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return undefined;
    const id = setInterval(() => {
      setActiveIdx((p) => (p + 1) % TOOLS.length);
    }, 7200);
    return () => clearInterval(id);
  }, [paused, setActiveIdx]);

  const orderedSlots = useMemo(() => {
    // 3 symmetric orbit slots (1 active + 3 orbit = 4 total tools)
    const slots = [
      { x: -300, z: -140, scale: 0.74, rotY: 16 },  // near-left
      { x: 300,  z: -140, scale: 0.74, rotY: -16 }, // near-right
      { x: 0,    z: -380, scale: 0.5,  rotY: 0 },   // back-center
    ];
    const others = orbits.filter((c) => !c.isActive);
    const assigned = {};
    others.forEach((c, idx) => {
      assigned[c.id] = slots[idx];
    });
    return assigned;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx]);

  return (
    <div
      className="tp-stage"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        aria-hidden
        className="tp-stage-halo"
        style={{
          background: `radial-gradient(ellipse 60% 50% at 50% 45%, rgba(${active.bleedRGB},0.14) 0%, transparent 60%)`,
        }}
      />
      <div aria-hidden className="tp-stage-floor" />

      <div className="tp-stage-3d">
        {orbits.map((c) => {
          const pos = c.isActive ? { x: 0, z: 0, scale: 1, rotY: 0 } : orderedSlots[c.id];
          return (
            <button
              key={c.id}
              className={`tp-card ${c.isActive ? "is-active" : "is-orbit"}${c.flagship ? " is-flagship" : ""}`}
              style={{
                "--tp-ring": c.ring,
                "--tp-bleed": c.bleedRGB,
                transform: `translate3d(${pos.x}px, 0, ${pos.z}px) scale(${pos.scale}) rotateY(${pos.rotY}deg)`,
                zIndex: c.isActive ? 10 : 5,
              }}
              onClick={() => {
                if (!c.isActive) setActiveIdx(c.i);
              }}
              aria-label={c.isActive ? `${c.name} — currently on stage` : `Bring ${c.name} to stage`}
            >
              <span aria-hidden className="tp-card-ring" />
              <span aria-hidden className="tp-card-warm" />
              {c.isActive ? (
                <ActiveCardContent data={c} onOpen={onOpen} />
              ) : (
                <OrbitCardContent data={c} />
              )}
            </button>
          );
        })}
      </div>

      <div className="tp-rail">
        {TOOLS.map((c, i) => (
          <button
            key={c.id}
            onClick={() => setActiveIdx(i)}
            className={`tp-rail-node ${i === activeIdx ? "is-on" : ""}`}
            style={{ "--tp-ring": c.ring, "--tp-bleed": c.bleedRGB }}
            aria-label={`Show ${c.name}`}
          >
            <span className="tp-rail-num">
              <Mono>{c.number}</Mono>
            </span>
            <span className="tp-rail-name">{c.name}</span>
            <span aria-hidden className="tp-rail-bar" />
            {i === activeIdx && !paused && (
              <span aria-hidden className="tp-rail-fill" key={`${activeIdx}-${paused}`} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function ActiveCardContent({ data, onOpen }) {
  return (
    <div className="tp-active-grid">
      <aside className="tp-active-side">
        <ToolGlyph data={data} size={88} />
        <div className="tp-active-meta">
          <Mono className="tp-active-num">TOOL {data.number}</Mono>
          <div className="tp-active-name">{data.name}</div>
          <div className="tp-active-tagline">{data.tagline}</div>
        </div>
        <div className="tp-active-tags">
          <Mono className="tp-chip">{data.tag}</Mono>
          <Mono className="tp-chip tp-chip-time">FREE</Mono>
        </div>
      </aside>

      <div className="tp-active-main">
        <div className="tp-quote-mark" aria-hidden>
          &lsaquo;/&rsaquo;
        </div>
        <p className="tp-active-long">{data.long}</p>
        {data.sample && (
          <span className="tp-sample-chip" aria-label={`Live sample: ${data.sample}`}>
            <span aria-hidden className="tp-sample-dot" />
            <Mono className="tp-sample-label">SAMPLE</Mono>
            <span className="tp-sample-text">{data.sample}</span>
            <span aria-hidden className="tp-sample-beam" />
          </span>
        )}
        <div className="tp-active-foot">
          <button
            type="button"
            className="tp-open-btn"
            onClick={(e) => {
              e.stopPropagation();
              onOpen(data.route);
            }}
          >
            <span aria-hidden className="tp-metric-beam" />
            <Mono>{data.cta}</Mono>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </button>
          <div className="tp-verified">
            <span aria-hidden className="tp-verified-dot" />
            <Mono className="tp-verified-text">NO SIGNUP</Mono>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrbitCardContent({ data }) {
  return (
    <div className="tp-orbit-inner">
      <ToolGlyph data={data} size={56} />
      <div className="tp-orbit-name">{data.name}</div>
      <Mono className="tp-orbit-meta">{data.tag}</Mono>
      <div className="tp-orbit-short">{data.tagline}</div>
      <div className="tp-orbit-cta">
        <Mono>TAP TO OPEN →</Mono>
      </div>
    </div>
  );
}

/* ── Mobile: Vertical Feed ────────────────────────────────────── */
function MobileFeed({ activeIdx, setActiveIdx, onOpen }) {
  const refs = useRef([]);

  useEffect(() => {
    const observers = refs.current.map((el, i) => {
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveIdx(i);
        },
        { threshold: 0.55 }
      );
      obs.observe(el);
      return obs;
    });
    return () => observers.forEach((o) => o && o.disconnect());
  }, [setActiveIdx]);

  return (
    <div className="tp-feed">
      <div className="tp-feed-nav">
        <Mono className="tp-feed-nav-label">
          TOOLS · {String(activeIdx + 1).padStart(2, "0")}/{String(TOOLS.length).padStart(2, "0")}
        </Mono>
        <div className="tp-feed-orbits">
          {TOOLS.map((c, i) => (
            <button
              key={c.id}
              onClick={() =>
                refs.current[i]?.scrollIntoView({ behavior: "smooth", block: "center" })
              }
              className={`tp-feed-orb ${i === activeIdx ? "is-on" : ""}`}
              style={{ "--tp-ring": c.ring, "--tp-bleed": c.bleedRGB }}
              aria-label={`Jump to ${c.name}`}
            >
              <ToolGlyph data={c} size={36} />
            </button>
          ))}
        </div>
      </div>

      <div className="tp-feed-stream">
        {TOOLS.map((c, i) => (
          <article
            key={c.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            className={`tp-feed-card ${i === activeIdx ? "is-on" : ""}${c.flagship ? " is-flagship" : ""}`}
            style={{ "--tp-ring": c.ring, "--tp-bleed": c.bleedRGB }}
          >
            <span aria-hidden className="tp-feed-card-ring" />
            <span aria-hidden className="tp-feed-card-warm" />

            <header className="tp-feed-head">
              <ToolGlyph data={c} size={56} />
              <div className="tp-feed-meta">
                <div className="tp-feed-name">{c.name}</div>
                <div className="tp-feed-role">{c.tagline}</div>
              </div>
              <div className="tp-feed-tag">
                <Mono className="tp-feed-num">{c.number}</Mono>
                <Mono className="tp-feed-time">{c.tag}</Mono>
              </div>
            </header>

            <p className="tp-feed-long">{c.long}</p>

            {c.sample && (
              <span className="tp-sample-chip" aria-label={`Live sample: ${c.sample}`}>
                <span aria-hidden className="tp-sample-dot" />
                <Mono className="tp-sample-label">SAMPLE</Mono>
                <span className="tp-sample-text">{c.sample}</span>
                <span aria-hidden className="tp-sample-beam" />
              </span>
            )}

            <footer className="tp-feed-foot">
              <button
                type="button"
                className="tp-open-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpen(c.route);
                }}
              >
                <span aria-hidden className="tp-metric-beam" />
                <Mono>{c.cta}</Mono>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <path d="M5 12h14M13 5l7 7-7 7" />
                </svg>
              </button>
              <div className="tp-verified">
                <span aria-hidden className="tp-verified-dot" />
                <Mono className="tp-verified-text">FREE</Mono>
              </div>
            </footer>
          </article>
        ))}
      </div>
    </div>
  );
}

/* ── Coming Soon Grid ─────────────────────────────────────────── */
function ComingSoon() {
  return (
    <section className="tp-cs-wrap" aria-label="Tools coming soon">
      <header className="tp-cs-head">
        <span aria-hidden className="tp-cs-marker" />
        <Mono className="tp-cs-eyebrow">COMING SOON · IN BUILD</Mono>
        <span aria-hidden className="tp-cs-marker" />
      </header>
      <div className="tp-cs-grid">
        {COMING_SOON.map((c) => (
          <div key={c.id} className="tp-cs-card" aria-disabled="true">
            <div className="tp-cs-glyph" aria-hidden>
              {c.glyph}
            </div>
            <div className="tp-cs-body">
              <Mono className="tp-cs-num">TOOL {c.number}</Mono>
              <div className="tp-cs-name">{c.name}</div>
              <div className="tp-cs-tagline">{c.tagline}</div>
            </div>
            <Mono className="tp-cs-badge">SOON</Mono>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ── Root ─────────────────────────────────────────────────────── */
export default function ToolsPage() {
  const navigate = useNavigate();
  const [activeIdx, setActiveIdx] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.matchMedia("(max-width: 820px)").matches);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const onOpen = (route) => navigate(route);

  return (
    <>
      <Helmet>
        <title>Free Career Tools for UAE &amp; GCC Job Seekers | CVPassport</title>
        <meta name="description" content="Free tools built for Indian expats and Gulf job seekers. Compare Dubai vs India salaries, check your ATS score, optimize your LinkedIn — all free to start." />
        <meta name="keywords" content="CV builder UAE, ATS CV Dubai, resume builder GCC, CV maker India, ATS optimised CV, job seeker Dubai, expat CV builder, CV templates UAE" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://mycvpassport.com/tools" />
        <meta property="og:title" content="Free Career Tools for UAE &amp; GCC Job Seekers | CVPassport" />
        <meta property="og:description" content="Free tools built for Indian expats and Gulf job seekers. Compare Dubai vs India salaries, check your ATS score, optimize your LinkedIn — all free to start." />
        <meta property="og:url" content="https://mycvpassport.com/tools" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="en_AE" />
      </Helmet>

      <section className="tp-section" aria-label="Career Engineering Suite">
        <style>{CSS_TEXT}</style>
        <div aria-hidden className="tp-bg-grid" />
        <div aria-hidden className="tp-bg-vignette" />

        <div className="tp-wrap">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="tp-back"
            aria-label="Back to home"
          >
            ← Back
          </button>

          <header className="tp-header">
            <div className="tp-header-line">
              <span aria-hidden className="tp-header-marker" />
              <Mono className="tp-eyebrow">CAREER ENGINEERING SUITE · FREE</Mono>
              <span aria-hidden className="tp-header-marker" />
            </div>
            <h1 className="tp-title">
              <span className="tp-title-strong">Career Engineering Suite</span>
            </h1>
            <p className="tp-subtitle">
              Free tools built for Gulf job seekers — ATS-engineered for UAE, Saudi &amp; India hiring.
            </p>
            <div className="tp-statsbar">
              <Mono>
                <span className="tp-stat-num">03</span> LIVE
              </Mono>
              <span aria-hidden className="tp-stat-sep" />
              <Mono>
                <span className="tp-stat-num">03</span> INCOMING
              </Mono>
              <span aria-hidden className="tp-stat-sep" />
              <Mono>
                <span className="tp-stat-num">NO</span> SIGNUP TO TRY
              </Mono>
            </div>
          </header>

          {isMobile ? (
            <MobileFeed activeIdx={activeIdx} setActiveIdx={setActiveIdx} onOpen={onOpen} />
          ) : (
            <DesktopStage activeIdx={activeIdx} setActiveIdx={setActiveIdx} onOpen={onOpen} />
          )}

          <ComingSoon />
        </div>
      </section>
    </>
  );
}

const CSS_TEXT = `
@property --tp-angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
@keyframes tp-spin { to { --tp-angle: 360deg; } }
@keyframes tp-beam { 0% { transform: translateX(-120%);} 100% { transform: translateX(260%);} }
@keyframes tp-fill { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes tp-rise { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }
@keyframes tp-pulse-ambient { 0%,100% { opacity: 0.55; } 50% { opacity: 1; } }
@keyframes tp-bg-drift { 0% { background-position: 0 0; } 100% { background-position: 60px 60px; } }
@keyframes tp-flagship-pulse { 0%,100% { filter: drop-shadow(0 0 14px rgba(217,119,6,0.5)); } 50% { filter: drop-shadow(0 0 28px rgba(217,119,6,0.85)); } }

.tp-section { position: relative; background: #070707; color: #fff; font-family: ${T.font}; -webkit-font-smoothing: antialiased; padding: 70px 40px 80px; min-height: 100vh; width: 100%; overflow: hidden; isolation: isolate; }
.tp-section *, .tp-section *::before, .tp-section *::after { box-sizing: border-box; -webkit-font-smoothing: antialiased; }

.tp-bg-grid { position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image: linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
  background-size: 60px 60px;
  mask-image: radial-gradient(ellipse 80% 70% at 50% 50%, #000 30%, transparent 80%);
  animation: tp-bg-drift 60s linear infinite;
}
.tp-bg-vignette { position: absolute; inset: 0; pointer-events: none; background: radial-gradient(ellipse 60% 50% at 50% 50%, transparent 40%, rgba(0,0,0,0.7) 100%); }

.tp-wrap { position: relative; max-width: 1280px; margin: 0 auto; }

.tp-back { position: relative; background: none; border: none; padding: 8px 0; color: ${T.muted}; font-size: 13px; font-weight: 500; cursor: pointer; font-family: inherit; transition: color 150ms ${T.ease}; margin-bottom: 20px; }
.tp-back:hover { color: #fff; }

/* Header */
.tp-header { text-align: center; margin: 0 auto 56px; max-width: 820px; }
.tp-header-line { display: inline-flex; align-items: center; gap: 14px; margin-bottom: 24px; }
.tp-header-marker { width: 36px; height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent); }
.tp-eyebrow { font-size: 10.5px; font-weight: 600; color: #fff; letter-spacing: 0.22em; }

.tp-title { font-size: clamp(32px, 4.6vw, 56px); font-weight: 800; letter-spacing: -0.035em; line-height: 1.08; margin: 0 0 18px; }
.tp-title-strong { color: #fff; font-weight: 900; }
.tp-subtitle { color: ${T.muted}; font-size: clamp(14px, 1.4vw, 16.5px); line-height: 1.5; margin: 0 auto 26px; max-width: 640px; }

.tp-statsbar { display: inline-flex; align-items: center; gap: 18px; padding: 12px 22px; border-radius: 999px; background: rgba(255,255,255,0.03); border: 1px solid #232323; font-size: 10px; color: ${T.muted}; flex-wrap: wrap; justify-content: center; }
.tp-stat-num { color: #fff; font-weight: 700; margin-right: 6px; }
.tp-stat-sep { width: 4px; height: 4px; border-radius: 50%; background: #2A2A2A; }

/* ───────── DESKTOP STAGE ───────── */
.tp-stage { position: relative; min-height: 620px; perspective: 1600px; perspective-origin: 50% 40%; padding: 48px 0 90px; }
.tp-stage-halo { position: absolute; inset: 0; pointer-events: none; transition: background 1200ms ${T.easeOut}; animation: tp-pulse-ambient 5s ease-in-out infinite; z-index: 0; }
.tp-stage-floor { position: absolute; left: 50%; bottom: 60px; width: 720px; height: 60px; transform: translateX(-50%); pointer-events: none; background: radial-gradient(ellipse 50% 60% at 50% 50%, rgba(255,255,255,0.08) 0%, transparent 70%); filter: blur(8px); }

.tp-stage-3d { position: relative; height: 460px; transform-style: preserve-3d; }

.tp-card { position: absolute; left: 50%; top: 50%; cursor: pointer; background: none; border: none; padding: 0; color: inherit; text-align: left;
  transition: transform 900ms ${T.easeOut}, opacity 600ms ${T.ease};
  transform-style: preserve-3d;
  will-change: transform;
  margin-left: -340px;
  margin-top: -230px;
  width: 680px;
  height: 460px;
}
.tp-card.is-orbit { width: 280px; height: 320px; margin-left: -140px; margin-top: -160px; }
.tp-card.is-active { cursor: default; }

.tp-card::after {
  content: ""; position: absolute; inset: 0; border-radius: 22px;
  background:
    radial-gradient(circle at 18% 22%, rgba(var(--tp-bleed),0.05) 0%, transparent 55%),
    linear-gradient(155deg, #1B1B1B 0%, #0E0E0E 100%);
  border-top: 1px solid #2A2A2A;
  border-left: 1px solid #232323;
  border-right: 1px solid #181818;
  border-bottom: 1px solid #161616;
  box-shadow: 0 30px 80px -30px rgba(0,0,0,0.7), 0 12px 28px -10px rgba(var(--tp-bleed),0.18);
  z-index: 0;
}

.tp-card-ring {
  position: absolute; inset: -1px; border-radius: 22px; padding: 1.5px;
  background: conic-gradient(from var(--tp-angle,0deg), transparent 60%, var(--tp-ring) 84%, transparent 100%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;
  pointer-events: none;
  animation: tp-spin 5.4s linear infinite;
  filter: drop-shadow(0 0 10px rgba(var(--tp-bleed),0.45));
  z-index: 1;
}
.tp-card.is-flagship .tp-card-ring {
  padding: 2.5px;
  background: conic-gradient(from var(--tp-angle,0deg), transparent 42%, #FFB74D 58%, #D97706 72%, #FFC775 86%, transparent 100%);
  animation: tp-spin 3.6s linear infinite, tp-flagship-pulse 2.8s ease-in-out infinite;
}
.tp-card-warm { position: absolute; inset: 0; border-radius: 22px; pointer-events: none; background: radial-gradient(circle at 20% 20%, rgba(var(--tp-bleed),0.06) 0%, transparent 55%); z-index: 0; }

/* Active card content */
.tp-active-grid { position: relative; z-index: 2; display: grid; grid-template-columns: 220px 1fr; gap: 32px; padding: 40px 44px; height: 100%; }
.tp-active-side { display: grid; gap: 18px; align-content: start; }
.tp-active-meta { display: grid; gap: 4px; }
.tp-active-num { font-size: 9.5px; font-weight: 600; color: ${T.mutedDim}; letter-spacing: 0.2em; margin-bottom: 4px; }
.tp-active-name { font-size: 22px; font-weight: 800; letter-spacing: -0.02em; color: #fff; line-height: 1.1; }
.tp-active-tagline { font-size: 13px; font-weight: 500; color: ${T.muted}; line-height: 1.4; margin-top: 4px; }

.tp-active-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.tp-chip { font-size: 10px; font-weight: 700; color: ${T.muted}; padding: 4px 9px; border-radius: 999px; border: 1px solid #2A2A2A; background: rgba(255,255,255,0.03); }
.tp-chip-time { color: ${T.mutedDim}; }

.tp-active-main { position: relative; display: flex; flex-direction: column; gap: 22px; }
.tp-quote-mark { position: absolute; top: -14px; left: -4px; font-size: 54px; line-height: 1; color: var(--tp-ring); opacity: 0.22; font-family: ${T.mono}; font-weight: 900; pointer-events: none; letter-spacing: -0.05em; }
.tp-active-long { margin: 0; font-size: 18px; line-height: 1.55; color: #fff; font-weight: 500; letter-spacing: -0.005em; text-wrap: pretty; flex: 1; animation: tp-rise 700ms ${T.easeOut}; padding-top: 24px; }

.tp-active-foot { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding-top: 18px; border-top: 1px solid rgba(255,255,255,0.06); flex-wrap: wrap; }

.tp-open-btn { position: relative; display: inline-flex; align-items: center; gap: 10px; padding: 12px 18px; border-radius: 999px; border: 1px solid var(--tp-ring); background: rgba(var(--tp-bleed),0.12); color: #fff; font-family: inherit; cursor: pointer; overflow: hidden; transition: background-color 180ms ${T.ease}, transform 120ms ${T.ease}; }
.tp-open-btn:hover { background: rgba(var(--tp-bleed),0.22); }
.tp-open-btn:active { transform: scale(0.97); }
.tp-open-btn .tp-metric-beam { position: absolute; top: 0; left: 0; right: 0; height: 1px; overflow: hidden; }
.tp-open-btn .tp-metric-beam::before { content: ""; position: absolute; inset: 0; width: 50%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent); animation: tp-beam 3.2s ${T.ease} infinite; will-change: transform; }
.tp-open-btn span { font-size: 11px; font-weight: 700; color: #fff; letter-spacing: 0.1em; }

/* Orbit card content */
.tp-orbit-inner { position: relative; z-index: 2; padding: 24px; height: 100%; display: grid; grid-template-rows: auto auto auto 1fr auto; gap: 12px; align-content: start; }
.tp-orbit-name { font-size: 16px; font-weight: 800; color: #fff; letter-spacing: -0.02em; margin-top: 4px; }
.tp-orbit-meta { font-size: 9.5px; font-weight: 700; color: ${T.muted}; }
.tp-orbit-short { font-size: 13px; line-height: 1.45; color: #fff; font-weight: 500; opacity: 0.92; }
.tp-orbit-cta { font-size: 9.5px; font-weight: 600; color: var(--tp-ring); letter-spacing: 0.2em; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.06); }

/* Glyph */
.tp-glyph-wrap { position: relative; display: inline-flex; border-radius: 18px; flex-shrink: 0;
  filter: drop-shadow(0 0 14px rgba(var(--tp-bleed),0.35)) drop-shadow(0 0 3px rgba(var(--tp-bleed),0.3));
}
.tp-glyph-ring {
  position: absolute; inset: -3px; border-radius: 18px; padding: 2px;
  background: conic-gradient(from var(--tp-angle,0deg), transparent 55%, var(--tp-ring) 82%, transparent 100%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;
  pointer-events: none;
  animation: tp-spin 3.2s linear infinite;
}
.tp-glyph { position: relative; width: 100%; height: 100%; border-radius: 18px; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.04); background: radial-gradient(circle at 30% 30%, #1a1a1a 0%, #0a0a0a 100%); }
.tp-glyph-text { font-family: ${T.mono}; font-weight: 700; letter-spacing: -0.02em; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.4); }

/* Verified */
.tp-verified { display: inline-flex; align-items: center; gap: 8px; }
.tp-verified-dot { width: 6px; height: 6px; border-radius: 50%; background: #46C99A; box-shadow: 0 0 6px rgba(70,201,154,0.65); flex-shrink: 0; }
.tp-verified-text { font-size: 9.5px; color: ${T.mutedDim}; font-weight: 600; letter-spacing: 0.18em; }

/* Live sample chip */
.tp-sample-chip { position: relative; display: inline-flex; align-items: center; gap: 10px; align-self: flex-start; padding: 9px 14px; border-radius: 999px; border: 1px solid rgba(var(--tp-bleed),0.4); background: rgba(var(--tp-bleed),0.08); overflow: hidden; max-width: 100%; }
.tp-sample-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--tp-ring); box-shadow: 0 0 8px rgba(var(--tp-bleed),0.85); flex-shrink: 0; animation: tp-pulse-ambient 1.6s ease-in-out infinite; }
.tp-sample-label { font-size: 9px; font-weight: 700; color: rgba(255,255,255,0.55); letter-spacing: 0.22em; flex-shrink: 0; }
.tp-sample-text { font-size: 12.5px; font-weight: 700; color: #fff; letter-spacing: -0.005em; font-family: ${T.mono}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.tp-sample-beam { position: absolute; top: 0; left: 0; right: 0; height: 1px; pointer-events: none; overflow: hidden; }
.tp-sample-beam::before { content: ""; position: absolute; inset: 0; width: 50%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent); animation: tp-beam 3.2s ${T.ease} infinite; will-change: transform; }

/* Rail */
.tp-rail { position: relative; display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; max-width: 880px; margin: 30px auto 0; padding: 16px 0 0; border-top: 1px solid rgba(255,255,255,0.06); }
.tp-rail-node { position: relative; background: none; border: none; padding: 14px 10px 12px; cursor: pointer; color: ${T.muted}; text-align: left; display: grid; grid-template-columns: auto 1fr; gap: 6px 12px; align-items: center; transition: color 240ms ${T.ease}; font-family: inherit; }
.tp-rail-node:hover { color: #fff; }
.tp-rail-node.is-on { color: #fff; }
.tp-rail-num { font-size: 9.5px; font-weight: 700; color: ${T.mutedDim}; letter-spacing: 0.2em; grid-row: span 2; align-self: start; padding-top: 2px; }
.tp-rail-node.is-on .tp-rail-num { color: var(--tp-ring); }
.tp-rail-name { font-size: 14px; font-weight: 700; letter-spacing: -0.01em; }
.tp-rail-bar { position: absolute; left: 10px; right: 10px; bottom: 0; height: 2px; background: rgba(255,255,255,0.06); border-radius: 2px; overflow: hidden; }
.tp-rail-fill { position: absolute; left: 10px; right: 10px; bottom: 0; height: 2px; background: var(--tp-ring); transform-origin: left center; animation: tp-fill 7.2s linear forwards; box-shadow: 0 0 8px rgba(var(--tp-bleed),0.6); border-radius: 2px; }

/* ───────── MOBILE FEED ───────── */
.tp-feed { position: relative; display: grid; gap: 0; }
.tp-feed-nav { position: sticky; top: 8px; z-index: 20; display: grid; gap: 10px; padding: 12px 14px; margin: 0 0 18px;
  background: rgba(10,10,10,0.78);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid #232323;
  border-radius: 18px;
}
.tp-feed-nav-label { font-size: 9.5px; color: ${T.muted}; font-weight: 600; letter-spacing: 0.2em; text-align: center; }
.tp-feed-orbits { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; place-items: center; }
.tp-feed-orb { background: none; border: none; padding: 4px; cursor: pointer; opacity: 0.45; transition: opacity 240ms ${T.ease}, transform 240ms ${T.ease}; }
.tp-feed-orb.is-on { opacity: 1; transform: scale(1.08); }

.tp-feed-stream { display: grid; gap: 18px; }
.tp-feed-card {
  position: relative;
  border-radius: 22px; padding: 24px; overflow: hidden;
  background:
    radial-gradient(circle at 18% 22%, rgba(var(--tp-bleed),0.05) 0%, transparent 55%),
    linear-gradient(155deg, #1B1B1B 0%, #0E0E0E 100%);
  border-top: 1px solid #2A2A2A;
  border-left: 1px solid #232323;
  border-right: 1px solid #181818;
  border-bottom: 1px solid #161616;
  box-shadow: 0 20px 50px -20px rgba(0,0,0,0.6);
  display: grid; gap: 18px;
  transition: transform 500ms ${T.easeOut}, box-shadow 500ms ${T.easeOut}, opacity 500ms ${T.ease};
  opacity: 0.55;
  transform: scale(0.98);
}
.tp-feed-card.is-on { opacity: 1; transform: scale(1); box-shadow: 0 24px 60px -20px rgba(var(--tp-bleed),0.32), 0 20px 50px -20px rgba(0,0,0,0.6); }

.tp-feed-card-ring {
  position: absolute; inset: -1px; border-radius: 22px; padding: 1.5px;
  background: conic-gradient(from var(--tp-angle,0deg), transparent 60%, var(--tp-ring) 84%, transparent 100%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;
  pointer-events: none;
  animation: tp-spin 5.4s linear infinite;
  filter: drop-shadow(0 0 8px rgba(var(--tp-bleed),0.4));
}
.tp-feed-card.is-flagship .tp-feed-card-ring {
  padding: 2.5px;
  background: conic-gradient(from var(--tp-angle,0deg), transparent 42%, #FFB74D 58%, #D97706 72%, #FFC775 86%, transparent 100%);
  animation: tp-spin 3.6s linear infinite, tp-flagship-pulse 2.8s ease-in-out infinite;
}
.tp-feed-card-warm { position: absolute; inset: 0; border-radius: 22px; pointer-events: none; background: radial-gradient(circle at 20% 20%, rgba(var(--tp-bleed),0.05) 0%, transparent 55%); }

.tp-feed-head { position: relative; z-index: 2; display: grid; grid-template-columns: auto 1fr auto; gap: 14px; align-items: start; }
.tp-feed-meta { display: grid; gap: 2px; min-width: 0; }
.tp-feed-name { font-size: 16px; font-weight: 800; color: #fff; letter-spacing: -0.01em; }
.tp-feed-role { font-size: 12.5px; color: ${T.muted}; font-weight: 500; line-height: 1.4; }
.tp-feed-tag { display: grid; gap: 4px; justify-items: end; flex-shrink: 0; }
.tp-feed-num { font-size: 9.5px; font-weight: 700; color: var(--tp-ring); letter-spacing: 0.18em; }
.tp-feed-time { font-size: 9px; color: ${T.mutedDim}; font-weight: 600; letter-spacing: 0.16em; }

.tp-feed-long { position: relative; z-index: 2; margin: 0; font-size: 14.5px; line-height: 1.55; color: #fff; font-weight: 500; letter-spacing: -0.005em; text-wrap: pretty; opacity: 0.92; }
.tp-feed-foot { position: relative; z-index: 2; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.06); flex-wrap: wrap; }

/* ───────── COMING SOON ───────── */
.tp-cs-wrap { margin-top: 80px; padding-top: 40px; border-top: 1px dashed rgba(255,255,255,0.08); }
.tp-cs-head { display: flex; justify-content: center; align-items: center; gap: 14px; margin-bottom: 28px; }
.tp-cs-marker { width: 36px; height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent); }
.tp-cs-eyebrow { font-size: 10px; font-weight: 600; color: ${T.mutedDim}; letter-spacing: 0.22em; }

.tp-cs-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; max-width: 1000px; margin: 0 auto; }
.tp-cs-card { position: relative; display: grid; grid-template-columns: auto 1fr auto; gap: 16px; align-items: center; padding: 18px 20px; border-radius: 18px; background: rgba(255,255,255,0.015); border: 1px solid rgba(255,255,255,0.05); opacity: 0.55; cursor: not-allowed; transition: opacity 240ms ${T.ease}; }
.tp-cs-card:hover { opacity: 0.72; }
.tp-cs-glyph { width: 44px; height: 44px; border-radius: 11px; display: grid; place-items: center; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.05); color: ${T.mutedDim}; font-family: ${T.mono}; font-weight: 700; font-size: 16px; flex-shrink: 0; }
.tp-cs-body { display: grid; gap: 3px; min-width: 0; }
.tp-cs-num { font-size: 9.5px; color: ${T.mutedDim}; font-weight: 700; letter-spacing: 0.2em; }
.tp-cs-name { font-size: 14px; font-weight: 700; color: #fff; letter-spacing: -0.01em; }
.tp-cs-tagline { font-size: 12px; color: ${T.muted}; line-height: 1.4; }
.tp-cs-badge { font-size: 9px; color: ${T.mutedDim}; font-weight: 700; letter-spacing: 0.2em; padding: 4px 8px; border-radius: 999px; border: 1px dashed rgba(255,255,255,0.12); background: rgba(255,255,255,0.02); flex-shrink: 0; }

/* Responsive trim */
@media (max-width: 820px) {
  .tp-section { padding: 50px 18px 60px; }
  .tp-header { margin-bottom: 32px; }
  .tp-title { font-size: 32px; }
  .tp-statsbar { font-size: 9px; gap: 12px; padding: 10px 16px; }
  .tp-cs-grid { grid-template-columns: 1fr; gap: 12px; }
  .tp-cs-wrap { margin-top: 48px; padding-top: 28px; }
}

@media (max-width: 1180px) and (min-width: 821px) {
  .tp-stage { min-height: 560px; }
  .tp-cs-grid { grid-template-columns: repeat(2, 1fr); }
}
`;
