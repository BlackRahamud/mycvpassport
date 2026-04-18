/* ═══════════════════════════════════════════════════════════════════════════
   src/components/marketing/TestimonialsGrid.jsx
   CVPassport · Landing — Testimonials · Layout 2 · "The Lounge"

   Desktop: perspective stage with one card on, three orbiting.
     - Auto-rotate every 7.2s (hover to pause)
     - Click any peripheral card to bring it to stage
     - Stage halo recolours to active card's bleed
     - Rail nav at the bottom with progress-bar fill

   Mobile (<=820px): "Transmission Feed"
     - Sticky orbit nav at the top (4 avatars + counter)
     - Vertical stream of full cards
     - IntersectionObserver activates whichever card is centered
     - Tapping an orb smooth-scrolls to that card

   Shared: 4 cards · warm surface · OLED conic rings · flag badges.
   ═══════════════════════════════════════════════════════════════════════════ */

import React, { useEffect, useMemo, useRef, useState } from "react";

const T = {
  text: "#FFFFFF",
  muted: "#A0A0A0",
  mutedDim: "#6A6A6A",
  font: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace",
  ease: "cubic-bezier(0.4,0,0.2,1)",
  easeOut: "cubic-bezier(0.16,1,0.3,1)",
};

const CARDS = [
  {
    id: "obaid", initials: "OK", name: "Obaid Khan", first: "Obaid",
    role: "Senior Finance Analyst", company: "DIFC, Dubai",
    market: "GCC", flag: "🇦🇪",
    quote: "I had 8 years of GCC experience and was getting zero callbacks. CVPassport rebuilt my headline in 60 seconds. Three weeks later I had two DIFC interviews booked. The ATS score alone told me everything my old CV was doing wrong.",
    metric: "× 4.8 recruiter views",
    short: "Two DIFC interviews booked in three weeks.",
    avatarBg: "radial-gradient(circle at 30% 30%, #1a1a2e 0%, #16213e 100%)",
    ring: "#E5B24D", bleedRGB: "217,117,6", number: "01", timeAgo: "3w",
  },
  {
    id: "sharik", initials: "SN", name: "Sharik Nasir", first: "Sharik",
    role: "IT Infrastructure Specialist", company: "Etihad Aviation, Abu Dhabi",
    market: "UAE", flag: "🇦🇪",
    quote: "I was applying to Etihad for months with no response. Ran my CV through CVPassport, fixed the ATS gaps it flagged, resubmitted — got a call in 11 days. I genuinely didn't change anything else.",
    metric: "Hired in 11 days",
    short: "Etihad call back in 11 days. Nothing else changed.",
    avatarBg: "radial-gradient(circle at 30% 30%, #1a1a1a 0%, #2d1b69 100%)",
    ring: "#6FA8FF", bleedRGB: "59,130,246", number: "02", timeAgo: "6w",
  },
  {
    id: "rahul", initials: "RS", name: "Rahul Sengupta", first: "Rahul",
    role: "Digital Marketing Manager", company: "Bengaluru",
    market: "India", flag: "🇮🇳",
    quote: "Most CV tools are built for the West. CVPassport actually understands what a Bengaluru recruiter wants to see — the keywords, the structure, even the tone. Got 3 interview calls in my first week after optimizing.",
    metric: "3 interviews · Week 1",
    short: "3 interviews in week one. Built for the market.",
    avatarBg: "radial-gradient(circle at 30% 30%, #1a0a0a 0%, #2d1410 100%)",
    ring: "#E0604A", bleedRGB: "220,38,38", number: "03", timeAgo: "2w",
  },
  {
    id: "hrithik", initials: "HB", name: "Hrithik Bhakat", first: "Hrithik",
    role: "F&B Operations Supervisor", company: "Mumbai",
    market: "India", flag: "🇮🇳",
    quote: "Hospitality CVs are always generic. CVPassport gave me a version that actually showed my numbers — covers managed, team size, revenue. Dubai recruiters finally started responding. First GCC offer came 3 weeks after.",
    metric: "First GCC offer · 3 weeks",
    short: "Mumbai → Dubai. First GCC offer in 3 weeks.",
    avatarBg: "radial-gradient(circle at 30% 30%, #0a1a0a 0%, #102d14 100%)",
    ring: "#46C99A", bleedRGB: "16,185,129", number: "04", timeAgo: "5w",
  },
];

const Mono = ({ children, className, style }) => (
  <span
    className={className}
    style={{ fontFamily: T.mono, letterSpacing: "0.14em", ...style }}
  >
    {children}
  </span>
);

/* ── Avatar (shared) ───────────────────────────────────────────── */
function Avatar({ data, size = 64, delay = "0s", showFlag = true }) {
  return (
    <span
      className="tl-avatar-wrap"
      style={{
        "--tl-ring": data.ring,
        "--tl-bleed": data.bleedRGB,
        "--tl-delay": delay,
        width: size,
        height: size,
      }}
    >
      <span aria-hidden className="tl-avatar-ring" />
      <span className="tl-avatar" aria-hidden style={{ background: data.avatarBg }}>
        <span
          className="tl-avatar-initials"
          style={{ fontSize: Math.round(size * 0.34) }}
        >
          {data.initials}
        </span>
      </span>
      {showFlag && (
        <span
          className="tl-avatar-flag"
          aria-hidden
          style={{
            width: Math.round(size * 0.4),
            height: Math.round(size * 0.4),
            fontSize: Math.round(size * 0.2),
          }}
        >
          {data.flag}
        </span>
      )}
    </span>
  );
}

/* ── Desktop: The Lounge ──────────────────────────────────────── */
function DesktopLounge({ activeIdx, setActiveIdx }) {
  const active = CARDS[activeIdx];
  const orbits = CARDS.map((c, i) => ({ ...c, i, isActive: i === activeIdx }));
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return undefined;
    const id = setInterval(() => {
      setActiveIdx((p) => (p + 1) % CARDS.length);
    }, 7200);
    return () => clearInterval(id);
  }, [paused, setActiveIdx]);

  const orderedSlots = useMemo(() => {
    const slots = [
      { x: -480, z: -260, scale: 0.62, rotY: 28 },   // far-left
      { x: -260, z: -120, scale: 0.78, rotY: 16 },   // near-left
      { x: 260,  z: -120, scale: 0.78, rotY: -16 },  // near-right
      { x: 480,  z: -260, scale: 0.62, rotY: -28 },  // far-right
    ];
    const others = orbits.filter((c) => !c.isActive);
    const assigned = {};
    others.forEach((c, idx) => { assigned[c.id] = slots[idx]; });
    return assigned;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIdx]);

  return (
    <div
      className="tl-stage"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        aria-hidden
        className="tl-stage-halo"
        style={{
          background: `radial-gradient(ellipse 60% 50% at 50% 45%, rgba(${active.bleedRGB},0.12) 0%, transparent 60%)`,
        }}
      />
      <div aria-hidden className="tl-stage-floor" />

      <div className="tl-stage-3d">
        {orbits.map((c) => {
          const pos = c.isActive
            ? { x: 0, z: 0, scale: 1, rotY: 0 }
            : orderedSlots[c.id];
          return (
            <button
              key={c.id}
              className={`tl-card ${c.isActive ? "is-active" : "is-orbit"}`}
              style={{
                "--tl-ring": c.ring,
                "--tl-bleed": c.bleedRGB,
                transform: `translate3d(${pos.x}px, 0, ${pos.z}px) scale(${pos.scale}) rotateY(${pos.rotY}deg)`,
                zIndex: c.isActive ? 10 : 5,
              }}
              onClick={() => { if (!c.isActive) setActiveIdx(c.i); }}
              aria-label={c.isActive ? `${c.name} — currently on stage` : `Bring ${c.name} to stage`}
            >
              <span aria-hidden className="tl-card-ring" />
              <span aria-hidden className="tl-card-warm" />
              {c.isActive
                ? <ActiveCardContent data={c} />
                : <OrbitCardContent data={c} />}
            </button>
          );
        })}
      </div>

      <div className="tl-rail">
        {CARDS.map((c, i) => (
          <button
            key={c.id}
            onClick={() => setActiveIdx(i)}
            className={`tl-rail-node ${i === activeIdx ? "is-on" : ""}`}
            style={{ "--tl-ring": c.ring, "--tl-bleed": c.bleedRGB }}
            aria-label={`Show ${c.name}`}
          >
            <span className="tl-rail-num"><Mono>{c.number}</Mono></span>
            <span className="tl-rail-name">{c.first}</span>
            <span aria-hidden className="tl-rail-bar" />
            {i === activeIdx && !paused && (
              <span
                aria-hidden
                className="tl-rail-fill"
                key={`${activeIdx}-${paused}`}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function ActiveCardContent({ data }) {
  return (
    <div className="tl-active-grid">
      <aside className="tl-active-side">
        <Avatar data={data} size={88} delay="0s" />
        <div className="tl-active-meta">
          <Mono className="tl-active-num">CASE {data.number}</Mono>
          <div className="tl-active-name">{data.name}</div>
          <div className="tl-active-role">{data.role}</div>
          <div className="tl-active-company">{data.company}</div>
        </div>
        <div className="tl-active-tags">
          <Mono className="tl-chip">{data.market}</Mono>
          <Mono className="tl-chip tl-chip-time">{data.timeAgo} AGO</Mono>
        </div>
      </aside>

      <div className="tl-active-main">
        <div className="tl-quote-mark" aria-hidden>&ldquo;</div>
        <blockquote className="tl-active-quote">{data.quote}</blockquote>
        <div className="tl-active-foot">
          <span className="tl-metric-wrap">
            <span aria-hidden className="tl-metric-beam" />
            <Mono className="tl-metric">{data.metric}</Mono>
          </span>
          <div className="tl-verified">
            <span aria-hidden className="tl-verified-dot" />
            <Mono className="tl-verified-text">VERIFIED USER</Mono>
          </div>
        </div>
      </div>
    </div>
  );
}

function OrbitCardContent({ data }) {
  return (
    <div className="tl-orbit-inner">
      <Avatar data={data} size={56} showFlag />
      <div className="tl-orbit-name">{data.first}</div>
      <Mono className="tl-orbit-meta">{data.market}</Mono>
      <div className="tl-orbit-short">{data.short}</div>
      <div className="tl-orbit-cta">
        <Mono>TAP TO READ →</Mono>
      </div>
    </div>
  );
}

/* ── Mobile: Transmission Feed ──────────────────────────────── */
function MobileFeed({ activeIdx, setActiveIdx }) {
  const refs = useRef([]);

  useEffect(() => {
    const observers = refs.current.map((el, i) => {
      if (!el) return null;
      const obs = new IntersectionObserver(
        ([entry]) => { if (entry.isIntersecting) setActiveIdx(i); },
        { threshold: 0.55 },
      );
      obs.observe(el);
      return obs;
    });
    return () => observers.forEach((o) => o && o.disconnect());
  }, [setActiveIdx]);

  return (
    <div className="tl-feed">
      <div className="tl-feed-nav">
        <Mono className="tl-feed-nav-label">
          TRANSMISSIONS · {String(activeIdx + 1).padStart(2, "0")}/04
        </Mono>
        <div className="tl-feed-orbits">
          {CARDS.map((c, i) => (
            <button
              key={c.id}
              onClick={() => refs.current[i]?.scrollIntoView({ behavior: "smooth", block: "center" })}
              className={`tl-feed-orb ${i === activeIdx ? "is-on" : ""}`}
              style={{ "--tl-ring": c.ring, "--tl-bleed": c.bleedRGB }}
              aria-label={`Jump to ${c.first}`}
            >
              <Avatar data={c} size={36} showFlag={false} />
            </button>
          ))}
        </div>
      </div>

      <div className="tl-feed-stream">
        {CARDS.map((c, i) => (
          <article
            key={c.id}
            ref={(el) => { refs.current[i] = el; }}
            className={`tl-feed-card ${i === activeIdx ? "is-on" : ""}`}
            style={{ "--tl-ring": c.ring, "--tl-bleed": c.bleedRGB }}
          >
            <span aria-hidden className="tl-feed-card-ring" />
            <span aria-hidden className="tl-feed-card-warm" />

            <header className="tl-feed-head">
              <Avatar data={c} size={56} />
              <div className="tl-feed-meta">
                <div className="tl-feed-name">{c.name}</div>
                <div className="tl-feed-role">{c.role}</div>
                <div className="tl-feed-company">{c.company}</div>
              </div>
              <div className="tl-feed-tag">
                <Mono className="tl-feed-num">{c.number}</Mono>
                <Mono className="tl-feed-time">{c.timeAgo} AGO</Mono>
              </div>
            </header>

            <div className="tl-feed-quote-mark" aria-hidden>&ldquo;</div>
            <blockquote className="tl-feed-quote">{c.quote}</blockquote>

            <footer className="tl-feed-foot">
              <span className="tl-metric-wrap">
                <span aria-hidden className="tl-metric-beam" />
                <Mono className="tl-metric">{c.metric}</Mono>
              </span>
              <div className="tl-verified">
                <span aria-hidden className="tl-verified-dot" />
                <Mono className="tl-verified-text">VERIFIED</Mono>
              </div>
            </footer>
          </article>
        ))}
      </div>
    </div>
  );
}

/* ── Root ─────────────────────────────────────────────────────── */
export default function TestimonialsGrid() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.matchMedia("(max-width: 820px)").matches);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return (
    <section className="tl-section" aria-label="Testimonials">
      <style>{CSS_TEXT}</style>
      <div aria-hidden className="tl-bg-grid" />
      <div aria-hidden className="tl-bg-vignette" />

      <div className="tl-wrap">
        <header className="tl-header">
          <div className="tl-header-line">
            <span aria-hidden className="tl-header-marker" />
            <Mono className="tl-eyebrow">THE LOUNGE · LIVE TRANSMISSIONS</Mono>
            <span aria-hidden className="tl-header-marker" />
          </div>
          <h2 className="tl-title">
            <span className="tl-title-mute">Four people.</span>
            <span className="tl-title-strong">Two markets.</span>
            <span className="tl-title-mute">One CV that finally worked.</span>
          </h2>
          <div className="tl-statsbar">
            <Mono><span className="tl-stat-num">04</span> VERIFIED</Mono>
            <span aria-hidden className="tl-stat-sep" />
            <Mono><span className="tl-stat-num">02</span> MARKETS</Mono>
            <span aria-hidden className="tl-stat-sep" />
            <Mono><span className="tl-stat-num">AED 28–42K</span> AVG UNLOCKED</Mono>
          </div>
        </header>

        {isMobile
          ? <MobileFeed activeIdx={activeIdx} setActiveIdx={setActiveIdx} />
          : <DesktopLounge activeIdx={activeIdx} setActiveIdx={setActiveIdx} />}
      </div>
    </section>
  );
}

const CSS_TEXT = `
@property --tl-angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
@keyframes tl-spin { to { --tl-angle: 360deg; } }
@keyframes tl-beam { 0% { transform: translateX(-120%);} 100% { transform: translateX(260%);} }
@keyframes tl-fill { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes tl-rise { from { opacity: 0; transform: translateY(28px); } to { opacity: 1; transform: translateY(0); } }
@keyframes tl-pulse-ambient { 0%,100% { opacity: 0.55; } 50% { opacity: 1; } }
@keyframes tl-bg-drift { 0% { background-position: 0 0; } 100% { background-position: 60px 60px; } }

.tl-section { position: relative; background: #070707; color: #fff; font-family: ${T.font}; -webkit-font-smoothing: antialiased; padding: 100px 40px 80px; width: 100%; overflow: hidden; isolation: isolate; }
.tl-section *, .tl-section *::before, .tl-section *::after { box-sizing: border-box; -webkit-font-smoothing: antialiased; }

.tl-bg-grid {
  position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
  background-image:
    linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
  background-size: 60px 60px;
  mask-image: radial-gradient(ellipse 80% 70% at 50% 50%, #000 30%, transparent 80%);
  animation: tl-bg-drift 60s linear infinite;
}
.tl-bg-vignette {
  position: absolute; inset: 0; pointer-events: none;
  background: radial-gradient(ellipse 60% 50% at 50% 50%, transparent 40%, rgba(0,0,0,0.7) 100%);
}

.tl-wrap { position: relative; max-width: 1280px; margin: 0 auto; }

/* Header */
.tl-header { text-align: center; margin: 0 auto 64px; max-width: 820px; }
.tl-header-line { display: inline-flex; align-items: center; gap: 14px; margin-bottom: 28px; }
.tl-header-marker { width: 36px; height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent); }
.tl-eyebrow { font-size: 10.5px; font-weight: 600; color: #fff; letter-spacing: 0.22em; }

.tl-title { font-size: clamp(32px, 4.6vw, 56px); font-weight: 800; letter-spacing: -0.035em; line-height: 1.08; margin: 0 0 32px; display: grid; gap: 4px; }
.tl-title-mute { color: ${T.muted}; font-weight: 600; }
.tl-title-strong { color: #fff; font-weight: 900; }

.tl-statsbar { display: inline-flex; align-items: center; gap: 18px; padding: 12px 22px; border-radius: 999px; background: rgba(255,255,255,0.03); border: 1px solid #232323; font-size: 10px; color: ${T.muted}; flex-wrap: wrap; justify-content: center; }
.tl-stat-num { color: #fff; font-weight: 700; margin-right: 6px; }
.tl-stat-sep { width: 4px; height: 4px; border-radius: 50%; background: #2A2A2A; }

/* ───────── DESKTOP STAGE ───────── */
.tl-stage { position: relative; min-height: 640px; perspective: 1600px; perspective-origin: 50% 40%; padding: 60px 0 100px; }

.tl-stage-halo { position: absolute; inset: 0; pointer-events: none; transition: background 1200ms ${T.easeOut}; animation: tl-pulse-ambient 5s ease-in-out infinite; z-index: 0; }
.tl-stage-floor { position: absolute; left: 50%; bottom: 60px; width: 720px; height: 60px; transform: translateX(-50%); pointer-events: none;
  background: radial-gradient(ellipse 50% 60% at 50% 50%, rgba(255,255,255,0.08) 0%, transparent 70%);
  filter: blur(8px);
}

.tl-stage-3d { position: relative; height: 460px; transform-style: preserve-3d; }

.tl-card { position: absolute; left: 50%; top: 50%; cursor: pointer; background: none; border: none; padding: 0; color: inherit; text-align: left;
  transition: transform 900ms ${T.easeOut}, opacity 600ms ${T.ease};
  transform-style: preserve-3d;
  will-change: transform;
  margin-left: -340px;
  margin-top: -230px;
  width: 680px;
  height: 460px;
}
.tl-card.is-orbit {
  width: 280px; height: 320px;
  margin-left: -140px; margin-top: -160px;
}
.tl-card.is-active { cursor: default; }

/* Card surface (shared shape) */
.tl-card::after {
  content: ""; position: absolute; inset: 0; border-radius: 22px;
  background:
    radial-gradient(circle at 18% 22%, rgba(var(--tl-bleed),0.05) 0%, transparent 55%),
    linear-gradient(155deg, #1B1B1B 0%, #0E0E0E 100%);
  border-top: 1px solid #2A2A2A;
  border-left: 1px solid #232323;
  border-right: 1px solid #181818;
  border-bottom: 1px solid #161616;
  box-shadow: 0 30px 80px -30px rgba(0,0,0,0.7), 0 12px 28px -10px rgba(var(--tl-bleed),0.18);
  z-index: 0;
}

.tl-card-ring {
  position: absolute; inset: -1px; border-radius: 22px; padding: 1.5px;
  background: conic-gradient(from var(--tl-angle,0deg), transparent 60%, var(--tl-ring) 84%, transparent 100%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;
  pointer-events: none;
  animation: tl-spin 5.4s linear infinite;
  filter: drop-shadow(0 0 10px rgba(var(--tl-bleed),0.45));
  z-index: 1;
}
.tl-card-warm {
  position: absolute; inset: 0; border-radius: 22px; pointer-events: none;
  background: radial-gradient(circle at 20% 20%, rgba(var(--tl-bleed),0.06) 0%, transparent 55%);
  z-index: 0;
}

/* Active card content */
.tl-active-grid { position: relative; z-index: 2; display: grid; grid-template-columns: 220px 1fr; gap: 32px; padding: 40px 44px; height: 100%; }
.tl-active-side { display: grid; gap: 18px; align-content: start; }
.tl-active-meta { display: grid; gap: 4px; }
.tl-active-num { font-size: 9.5px; font-weight: 600; color: ${T.mutedDim}; letter-spacing: 0.2em; margin-bottom: 4px; }
.tl-active-name { font-size: 18px; font-weight: 800; letter-spacing: -0.02em; color: #fff; }
.tl-active-role { font-size: 12.5px; font-weight: 600; color: #fff; line-height: 1.4; }
.tl-active-company { font-size: 12.5px; color: ${T.muted}; line-height: 1.4; }

.tl-active-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.tl-chip { font-size: 10px; font-weight: 700; color: ${T.muted}; padding: 4px 9px; border-radius: 999px; border: 1px solid #2A2A2A; background: rgba(255,255,255,0.03); }
.tl-chip-time { color: ${T.mutedDim}; }

.tl-active-main { position: relative; display: flex; flex-direction: column; gap: 22px; }
.tl-quote-mark { position: absolute; top: -22px; left: -8px; font-size: 100px; line-height: 1; color: var(--tl-ring); opacity: 0.18; font-family: ${T.font}; font-weight: 900; pointer-events: none; }
.tl-active-quote { margin: 0; font-size: 19px; line-height: 1.5; color: #fff; font-weight: 500; letter-spacing: -0.005em; text-wrap: pretty; flex: 1; animation: tl-rise 700ms ${T.easeOut}; }

.tl-active-foot { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding-top: 18px; border-top: 1px solid rgba(255,255,255,0.06); flex-wrap: wrap; }

/* Orbit card content */
.tl-orbit-inner { position: relative; z-index: 2; padding: 24px; height: 100%; display: grid; grid-template-rows: auto auto auto 1fr auto; gap: 12px; align-content: start; }
.tl-orbit-name { font-size: 16px; font-weight: 800; color: #fff; letter-spacing: -0.02em; margin-top: 4px; }
.tl-orbit-meta { font-size: 9.5px; font-weight: 700; color: ${T.muted}; }
.tl-orbit-short { font-size: 13px; line-height: 1.45; color: #fff; font-weight: 500; opacity: 0.92; }
.tl-orbit-cta { font-size: 9.5px; font-weight: 600; color: var(--tl-ring); letter-spacing: 0.2em; padding-top: 12px; border-top: 1px solid rgba(255,255,255,0.06); }

/* Avatar */
.tl-avatar-wrap { position: relative; display: inline-flex; border-radius: 50%; flex-shrink: 0;
  filter: drop-shadow(0 0 14px rgba(var(--tl-bleed),0.35)) drop-shadow(0 0 3px rgba(var(--tl-bleed),0.3));
}
.tl-avatar-ring {
  position: absolute; inset: -3px; border-radius: 50%; padding: 2px;
  background: conic-gradient(from var(--tl-angle,0deg), transparent 55%, var(--tl-ring) 82%, transparent 100%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;
  pointer-events: none;
  animation: tl-spin 3.2s linear infinite;
  animation-delay: var(--tl-delay, 0s);
}
.tl-avatar { position: relative; width: 100%; height: 100%; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.04); }
.tl-avatar-initials { font-family: ${T.font}; font-weight: 700; letter-spacing: -0.5px; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.4); }
.tl-avatar-flag {
  position: absolute; right: -4px; bottom: -4px; border-radius: 50%;
  background: #0F0F0F; border: 2px solid #141414;
  display: inline-flex; align-items: center; justify-content: center; line-height: 1;
  box-shadow: 0 4px 12px rgba(0,0,0,0.55); z-index: 3;
}

/* Metric chip */
.tl-metric-wrap { position: relative; display: inline-flex; align-items: center; padding: 9px 14px; border-radius: 999px; border: 1px solid #2A2A2A; background: rgba(255,255,255,0.03); overflow: hidden; flex-shrink: 0; }
.tl-metric { position: relative; font-size: 10.5px; font-weight: 700; color: #fff; letter-spacing: 0.1em; white-space: nowrap; }
.tl-metric-beam { position: absolute; top: 0; left: 0; right: 0; height: 1px; overflow: hidden; }
.tl-metric-beam::before { content: ""; position: absolute; inset: 0; width: 50%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent); animation: tl-beam 3.2s ${T.ease} infinite; will-change: transform; }

.tl-verified { display: inline-flex; align-items: center; gap: 8px; }
.tl-verified-dot { width: 6px; height: 6px; border-radius: 50%; background: #46C99A; box-shadow: 0 0 6px rgba(70,201,154,0.65); flex-shrink: 0; }
.tl-verified-text { font-size: 9.5px; color: ${T.mutedDim}; font-weight: 600; letter-spacing: 0.18em; }

/* Rail */
.tl-rail { position: relative; display: grid; grid-template-columns: repeat(4, 1fr); gap: 0; max-width: 880px; margin: 30px auto 0; padding: 16px 0 0; border-top: 1px solid rgba(255,255,255,0.06); }
.tl-rail-node { position: relative; background: none; border: none; padding: 14px 10px 12px; cursor: pointer; color: ${T.muted}; text-align: left; display: grid; grid-template-columns: auto 1fr; gap: 6px 12px; align-items: center;
  transition: color 240ms ${T.ease};
}
.tl-rail-node:hover { color: #fff; }
.tl-rail-node.is-on { color: #fff; }
.tl-rail-num { font-size: 9.5px; font-weight: 700; color: ${T.mutedDim}; letter-spacing: 0.2em; grid-row: span 2; align-self: start; padding-top: 2px; }
.tl-rail-node.is-on .tl-rail-num { color: var(--tl-ring); }
.tl-rail-name { font-size: 14px; font-weight: 700; letter-spacing: -0.01em; }
.tl-rail-bar { position: absolute; left: 10px; right: 10px; bottom: 0; height: 2px; background: rgba(255,255,255,0.06); border-radius: 2px; overflow: hidden; }
.tl-rail-fill { position: absolute; left: 10px; right: 10px; bottom: 0; height: 2px; background: var(--tl-ring); transform-origin: left center; animation: tl-fill 7.2s linear forwards; box-shadow: 0 0 8px rgba(var(--tl-bleed),0.6); border-radius: 2px; }

/* ───────── MOBILE FEED ───────── */
.tl-feed { position: relative; display: grid; gap: 0; }

.tl-feed-nav { position: sticky; top: 8px; z-index: 20; display: grid; gap: 10px; padding: 12px 14px; margin: 0 0 18px;
  background: rgba(10,10,10,0.78);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid #232323;
  border-radius: 18px;
}
.tl-feed-nav-label { font-size: 9.5px; color: ${T.muted}; font-weight: 600; letter-spacing: 0.2em; text-align: center; }
.tl-feed-orbits { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; place-items: center; }
.tl-feed-orb { background: none; border: none; padding: 4px; cursor: pointer; opacity: 0.45; transition: opacity 240ms ${T.ease}, transform 240ms ${T.ease}; }
.tl-feed-orb.is-on { opacity: 1; transform: scale(1.08); }

.tl-feed-stream { display: grid; gap: 18px; }
.tl-feed-card {
  position: relative;
  border-radius: 22px; padding: 24px; overflow: hidden;
  background:
    radial-gradient(circle at 18% 22%, rgba(var(--tl-bleed),0.05) 0%, transparent 55%),
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
.tl-feed-card.is-on { opacity: 1; transform: scale(1); box-shadow: 0 24px 60px -20px rgba(var(--tl-bleed),0.32), 0 20px 50px -20px rgba(0,0,0,0.6); }

.tl-feed-card-ring {
  position: absolute; inset: -1px; border-radius: 22px; padding: 1.5px;
  background: conic-gradient(from var(--tl-angle,0deg), transparent 60%, var(--tl-ring) 84%, transparent 100%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;
  pointer-events: none;
  animation: tl-spin 5.4s linear infinite;
  filter: drop-shadow(0 0 8px rgba(var(--tl-bleed),0.4));
}
.tl-feed-card-warm {
  position: absolute; inset: 0; border-radius: 22px; pointer-events: none;
  background: radial-gradient(circle at 20% 20%, rgba(var(--tl-bleed),0.05) 0%, transparent 55%);
}

.tl-feed-head { position: relative; z-index: 2; display: grid; grid-template-columns: auto 1fr auto; gap: 14px; align-items: start; }
.tl-feed-meta { display: grid; gap: 2px; min-width: 0; }
.tl-feed-name { font-size: 15px; font-weight: 800; color: #fff; letter-spacing: -0.01em; }
.tl-feed-role { font-size: 11.5px; color: #fff; font-weight: 600; line-height: 1.35; }
.tl-feed-company { font-size: 11.5px; color: ${T.muted}; line-height: 1.35; }
.tl-feed-tag { display: grid; gap: 4px; justify-items: end; flex-shrink: 0; }
.tl-feed-num { font-size: 9.5px; font-weight: 700; color: var(--tl-ring); letter-spacing: 0.18em; }
.tl-feed-time { font-size: 9px; color: ${T.mutedDim}; font-weight: 600; letter-spacing: 0.16em; }

.tl-feed-quote-mark { position: relative; z-index: 2; font-size: 60px; line-height: 0.6; color: var(--tl-ring); opacity: 0.22; font-weight: 900; margin: 6px 0 -8px; pointer-events: none; }
.tl-feed-quote { position: relative; z-index: 2; margin: 0; font-size: 15.5px; line-height: 1.5; color: #fff; font-weight: 500; letter-spacing: -0.005em; text-wrap: pretty; }

.tl-feed-foot { position: relative; z-index: 2; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.06); flex-wrap: wrap; }

/* Responsive trim */
@media (max-width: 820px) {
  .tl-section { padding: 70px 18px 60px; }
  .tl-header { margin-bottom: 32px; }
  .tl-title { font-size: 30px; }
  .tl-statsbar { font-size: 9px; gap: 12px; padding: 10px 16px; }
}

@media (max-width: 1180px) and (min-width: 821px) {
  .tl-stage { min-height: 580px; }
}
`;
