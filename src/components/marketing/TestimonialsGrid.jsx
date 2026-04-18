/* ═══════════════════════════════════════════════════════════════════════════
   src/components/marketing/TestimonialsGrid.jsx
   CVPassport · Landing — Testimonials Grid (v2 · warm-lounge)

   DROP-IN (LandingPage.jsx):
     import TestimonialsGrid from "./components/marketing/TestimonialsGrid";
     <ATSPreview />
     <TestimonialsGrid />
     <LinkedInOptimizerSection />

   v2 design moves:
     - Warm surface: radial phantom-warmth + 145deg surface gradient
     - Etched border: 4 sides different tones (top > left > right ≈ bottom)
     - Color-bleed per card (gold/blue/red/emerald) via drop-shadow
     - OLED conic ring on the CARD itself (not just avatar)
     - Card + avatar ring share colour, staggered 0s / 0.4s / 0.8s / 1.2s
     - Avatar gets a nationality flag badge (only emoji in section)
   ═══════════════════════════════════════════════════════════════════════════ */

import React from "react";

const T = {
  bg: "#0A0A0A",
  text: "#FFFFFF", muted: "#A0A0A0", mutedDim: "#6A6A6A",
  radLg: 16,
  font: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace",
  ease: "cubic-bezier(0.4,0,0.2,1)",
};

const CARDS = [
  {
    id: "obaid", initials: "OK", name: "Obaid Khan",
    role: "Senior Finance Analyst · DIFC, Dubai", market: "GCC", flag: "🇦🇪",
    quote: "I had 8 years of GCC experience and was getting zero callbacks. CVPassport rebuilt my headline in 60 seconds. Three weeks later I had two DIFC interviews booked. The ATS score alone told me everything my old CV was doing wrong.",
    metric: "× 4.8 recruiter views", source: "Verified User",
    avatarBg: "radial-gradient(circle at 30% 30%, #1a1a2e 0%, #16213e 100%)",
    ring: "#E5B24D", bleedRGB: "217,117,6", delay: "0s",
  },
  {
    id: "sharik", initials: "SN", name: "Sharik Nasir",
    role: "IT Infrastructure Specialist · Etihad Aviation, Abu Dhabi", market: "UAE", flag: "🇦🇪",
    quote: "I was applying to Etihad for months with no response. Ran my CV through CVPassport, fixed the ATS gaps it flagged, resubmitted — got a call in 11 days. I genuinely didn't change anything else.",
    metric: "Hired in 11 days", source: "Verified User",
    avatarBg: "radial-gradient(circle at 30% 30%, #1a1a1a 0%, #2d1b69 100%)",
    ring: "#6FA8FF", bleedRGB: "59,130,246", delay: "-0.4s",
  },
  {
    id: "rahul", initials: "RS", name: "Rahul Sengupta",
    role: "Digital Marketing Manager · Bengaluru", market: "India", flag: "🇮🇳",
    quote: "Most CV tools are built for the West. CVPassport actually understands what a Bengaluru recruiter wants to see — the keywords, the structure, even the tone. Got 3 interview calls in my first week after optimizing.",
    metric: "3 interviews · Week 1", source: "Verified User",
    avatarBg: "radial-gradient(circle at 30% 30%, #1a0a0a 0%, #2d1410 100%)",
    ring: "#E0604A", bleedRGB: "220,38,38", delay: "-0.8s",
  },
  {
    id: "hrithik", initials: "HB", name: "Hrithik Bhakat",
    role: "F&B Operations Supervisor · Mumbai", market: "India", flag: "🇮🇳",
    quote: "Hospitality CVs are always generic. CVPassport gave me a version that actually showed my numbers — covers managed, team size, revenue. Dubai recruiters finally started responding. First GCC offer came 3 weeks after.",
    metric: "First GCC offer · 3 weeks", source: "Verified User",
    avatarBg: "radial-gradient(circle at 30% 30%, #0a1a0a 0%, #102d14 100%)",
    ring: "#46C99A", bleedRGB: "16,185,129", delay: "-1.2s",
  },
];

const Mono = ({ children, className, style }) => (
  <span className={className} style={{ fontFamily: T.mono, letterSpacing: "0.14em", ...style }}>{children}</span>
);

function Card({ data }) {
  return (
    <div
      className="tg-card-bleed"
      style={{ filter: `drop-shadow(0 0 20px rgba(${data.bleedRGB},0.06))` }}
    >
      <article
        className="tg-card"
        style={{
          "--tg-ring": data.ring,
          "--tg-bleed": data.bleedRGB,
          "--tg-delay": data.delay,
        }}
        aria-label={`Testimonial from ${data.name}`}
      >
        <span aria-hidden className="tg-card-ring" />
        <span aria-hidden className="tg-card-inner-warm" />

        <header className="tg-card-head">
          <span className="tg-avatar-wrap" style={{ "--tg-delay": data.delay }}>
            <span aria-hidden className="tg-avatar-ring" />
            <span className="tg-avatar" aria-hidden style={{ background: data.avatarBg }}>
              <span className="tg-avatar-initials">{data.initials}</span>
            </span>
            <span className="tg-avatar-flag" aria-hidden>{data.flag}</span>
          </span>
          <Mono className="tg-market-chip">{data.market}</Mono>
        </header>

        <blockquote className="tg-quote">"{data.quote}"</blockquote>

        <footer className="tg-foot">
          <div className="tg-person">
            <div className="tg-name">{data.name}</div>
            <div className="tg-role">{data.role}</div>
          </div>
          <span className="tg-metric-wrap">
            <span aria-hidden className="tg-metric-beam" />
            <Mono className="tg-metric">{data.metric}</Mono>
          </span>
        </footer>

        <div className="tg-source">
          <span aria-hidden className="tg-verified-dot" />
          <Mono className="tg-source-label">{data.source.toUpperCase()}</Mono>
        </div>
      </article>
    </div>
  );
}

export default function TestimonialsGrid() {
  return (
    <section className="tg-section" aria-label="Testimonials">
      <style>{CSS_TEXT}</style>
      <div className="tg-wrap">
        <header className="tg-header">
          <Mono className="tg-eyebrow">TRUSTED BY REAL JOB SEEKERS</Mono>
          <h2 className="tg-title">
            They came for the CV.<br/>
            <span className="tg-title-dim">They stayed for the offers.</span>
          </h2>
          <p className="tg-sub">From DIFC to Etihad. From Bengaluru to Dubai. Real people, real markets, real results.</p>
          <div className="tg-statsbar">
            <span aria-hidden className="tg-statsbar-beam" />
            <Mono className="tg-statsbar-text">4 VERIFIED USERS · 2 MARKETS · AED 28–42K AVERAGE SALARY UNLOCKED</Mono>
          </div>
        </header>
        <div className="tg-grid">
          {CARDS.map((c) => <Card key={c.id} data={c} />)}
        </div>
      </div>
    </section>
  );
}

const CSS_TEXT = `
@property --tg-angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
@keyframes tg-spin { to { --tg-angle: 360deg; } }
@keyframes tg-beam-sweep { 0% { transform: translateX(-120%);} 100% { transform: translateX(260%);} }

.tg-section { position: relative; background: #0A0A0A; color: #fff; font-family: ${T.font}; -webkit-font-smoothing: antialiased; padding: 80px 60px; width: 100%; box-sizing: border-box; overflow: hidden; border-top: 1px solid rgba(255,255,255,0.06); }
.tg-section *, .tg-section *::before, .tg-section *::after { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
.tg-wrap { max-width: 1120px; margin: 0 auto; width: 100%; }

.tg-header { text-align: center; margin: 0 auto 48px; max-width: 720px; }
.tg-eyebrow { display: inline-block; font-size: 10.5px; font-weight: 600; color: ${T.muted}; padding: 6px 12px; border: 1px solid #2A2A2A; border-radius: 999px; background: rgba(255,255,255,0.03); margin-bottom: 20px; }
.tg-title { font-size: clamp(32px, 5vw, 56px); font-weight: 800; letter-spacing: -0.035em; line-height: 1.04; margin: 0 0 18px; color: #fff; }
.tg-title-dim { color: ${T.muted}; font-weight: 700; }
.tg-sub { font-size: 16px; line-height: 1.55; color: ${T.muted}; margin: 0 0 28px; }

.tg-statsbar { position: relative; display: inline-flex; padding: 10px 18px; border-radius: 999px; background: rgba(255,255,255,0.03); border: 1px solid #2A2A2A; overflow: hidden; }
.tg-statsbar-text { font-size: 10.5px; color: #fff; font-weight: 600; letter-spacing: 0.14em; }
.tg-statsbar-beam { position: absolute; left: 0; bottom: 0; width: 40%; height: 1px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent); animation: tg-beam-sweep 3.6s ${T.ease} infinite; will-change: transform; }

.tg-grid { display: grid; grid-template-columns: 1fr; gap: 22px; align-items: stretch; }

/* Color-bleed outer wrap — drop-shadow reaches outside the card edge */
.tg-card-bleed { transition: filter 400ms ${T.ease}, transform 400ms ${T.ease}; will-change: filter, transform; }
.tg-card-bleed:hover { transform: translateY(-4px); }
.tg-card-bleed:hover > .tg-card { border-top-color: #2E2E2E; }

/* Card — warm surface + etched 4-side border */
.tg-card {
  position: relative;
  background:
    radial-gradient(circle at 20% 20%, rgba(217,117,6,0.03) 0%, transparent 50%),
    linear-gradient(145deg, #1A1A1A, #111111);
  border-top: 1px solid #262626;
  border-left: 1px solid #222222;
  border-right: 1px solid #1A1A1A;
  border-bottom: 1px solid #1A1A1A;
  border-radius: ${T.radLg}px;
  padding: 28px;
  display: grid;
  grid-template-rows: auto 1fr auto auto;
  gap: 20px;
  overflow: hidden;
  box-shadow: 0 10px 30px -10px rgba(0,0,0,0.5);
  transition: border-top-color 400ms ${T.ease}, box-shadow 400ms ${T.ease};
}
.tg-card-bleed:hover > .tg-card {
  box-shadow:
    0 10px 30px -10px rgba(0,0,0,0.5),
    0 24px 60px -20px rgba(var(--tg-bleed), 0.18);
}

/* Card-level OLED ring — always on, unique colour, staggered */
.tg-card-ring {
  position: absolute;
  inset: -1px;
  border-radius: ${T.radLg}px;
  padding: 1.5px;
  background: conic-gradient(
    from var(--tg-angle, 0deg),
    transparent 62%,
    var(--tg-ring) 84%,
    transparent 100%
  );
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
          mask-composite: exclude;
  pointer-events: none;
  animation: tg-spin 5.2s linear infinite;
  animation-delay: var(--tg-delay, 0s);
  will-change: transform;
  filter: drop-shadow(0 0 8px rgba(var(--tg-bleed), 0.3));
  z-index: 1;
}

/* Inner warm halo (second warmth layer, ring-colour tinted) */
.tg-card-inner-warm {
  position: absolute; inset: 0;
  pointer-events: none;
  background: radial-gradient(
    circle at 20% 20%,
    rgba(var(--tg-bleed), 0.04) 0%,
    transparent 55%
  );
  z-index: 0;
}

/* Ensure content sits above the halo */
.tg-card > header,
.tg-card > blockquote,
.tg-card > footer,
.tg-card > .tg-source { position: relative; z-index: 2; }

.tg-card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }

/* Avatar */
.tg-avatar-wrap {
  position: relative;
  display: inline-flex;
  width: 64px; height: 64px;
  border-radius: 50%;
  flex-shrink: 0;
  filter: drop-shadow(0 0 14px rgba(var(--tg-bleed),0.35)) drop-shadow(0 0 3px rgba(var(--tg-bleed),0.3));
}
.tg-avatar-ring {
  position: absolute; inset: -3px;
  border-radius: 50%;
  padding: 2px;
  background: conic-gradient(from var(--tg-angle, 0deg), transparent 55%, var(--tg-ring) 82%, transparent 100%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
          mask-composite: exclude;
  pointer-events: none;
  animation: tg-spin 3.2s linear infinite;
  animation-delay: var(--tg-delay, 0s);
  will-change: transform;
}
.tg-avatar { position: relative; width: 100%; height: 100%; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.04); }
.tg-avatar-initials { font-family: ${T.font}; font-size: 22px; font-weight: 700; letter-spacing: -0.5px; color: #fff; text-shadow: 0 1px 2px rgba(0,0,0,0.4); }

/* Flag badge — only emoji in the section */
.tg-avatar-flag {
  position: absolute;
  right: -4px; bottom: -4px;
  width: 26px; height: 26px;
  border-radius: 50%;
  background: #0F0F0F;
  border: 2px solid #141414;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 13px;
  line-height: 1;
  box-shadow: 0 4px 12px rgba(0,0,0,0.55);
  z-index: 3;
}

.tg-market-chip { font-size: 10px; font-weight: 700; color: ${T.muted}; padding: 5px 10px; border-radius: 999px; border: 1px solid #2A2A2A; background: rgba(255,255,255,0.03); letter-spacing: 0.16em; }

.tg-quote { margin: 0; font-size: 16px; line-height: 1.55; color: #fff; font-weight: 500; letter-spacing: -0.1px; text-wrap: pretty; }

.tg-foot { display: flex; align-items: center; justify-content: space-between; gap: 14px; flex-wrap: wrap; padding-top: 16px; border-top: 1px solid rgba(255,255,255,0.06); }
.tg-person { display: grid; gap: 3px; min-width: 0; }
.tg-name { font-size: 14px; font-weight: 700; color: #fff; letter-spacing: -0.1px; }
.tg-role { font-size: 11.5px; color: ${T.muted}; line-height: 1.45; }

.tg-metric-wrap { position: relative; display: inline-flex; align-items: center; padding: 8px 12px; border-radius: 999px; border: 1px solid #2A2A2A; background: rgba(255,255,255,0.03); overflow: hidden; flex-shrink: 0; }
.tg-metric { position: relative; font-size: 10.5px; font-weight: 700; color: #fff; letter-spacing: 0.1em; white-space: nowrap; }
.tg-metric-beam { position: absolute; top: 0; left: 0; right: 0; height: 1px; overflow: hidden; }
.tg-metric-beam::before { content: ""; position: absolute; inset: 0; width: 50%; height: 100%; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.45), transparent); animation: tg-beam-sweep 3.2s ${T.ease} infinite; will-change: transform; }

.tg-source { display: inline-flex; align-items: center; gap: 8px; }
.tg-verified-dot { width: 6px; height: 6px; border-radius: 50%; background: #46C99A; box-shadow: 0 0 6px rgba(70,201,154,0.65); flex-shrink: 0; }
.tg-source-label { font-size: 9.5px; color: ${T.mutedDim}; font-weight: 600; }

@media (min-width: 768px) { .tg-grid { grid-template-columns: 1fr 1fr; gap: 26px; } }

@media (max-width: 640px) {
  .tg-section { padding: 60px 20px; }
  .tg-header { margin-bottom: 36px; }
  .tg-title { font-size: 32px; }
  .tg-sub { font-size: 15px; margin-bottom: 22px; }
  .tg-statsbar { padding: 9px 14px; }
  .tg-statsbar-text { font-size: 9.5px; letter-spacing: 0.12em; }
  .tg-card { padding: 22px; gap: 18px; }
  .tg-avatar-wrap { width: 56px; height: 56px; }
  .tg-avatar-initials { font-size: 18px; }
  .tg-avatar-flag { width: 22px; height: 22px; font-size: 11px; }
  .tg-quote { font-size: 15px; }
  .tg-foot { flex-direction: column; align-items: flex-start; gap: 12px; }
}
`;
