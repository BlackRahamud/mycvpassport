import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

/**
 * GulfBillboardCard
 * --------------------------------------------------------------------------
 * Lands between <HeroSection /> and <ShowSection /> on the marketing page.
 * This is a BILLBOARD, not a UI card — it's the "stop the scroll" moment that
 * funnels traffic from /home → /gulf-career.
 *
 * Visual: night-mode Dubai skyline (CSS-drawn, no asset deps), with the
 * Burj Khalifa silhouette anchoring a hero number that scrubs the AED salary
 * band on mount. Sample-output chip ticks through three live values to imply
 * a working tool, not a static promise.
 *
 * Motion budget — all paths respect prefers-reduced-motion.
 *
 * Direct port of the design export at design hash 572veQFwjwNc06k2YCu8Fg.
 * Only adaptations:
 *   - destructured React imports instead of `const { useState } = React`
 *   - `framer-motion` ESM imports instead of `window.Motion`
 *   - real `useNavigate` from react-router-dom instead of the preview stub
 */

const TARGET_HREF = '/gulf-career';
const HEADLINE_PRE = 'There is a salary in the Gulf';
const HEADLINE_HOOK = 'with your name on it.';
const SUBLINE =
  "Most CVs get filtered out before a human reads them. CVPassport tells you what you're worth in Dubai, Riyadh & Doha — and what's blocking you from it.";

// Real numbers from gulfData — Senior Analyst, Finance, Dubai Marina band
const HOOK_LOW = 28;
const HOOK_HIGH = 42;
const HOOK_UNIT = 'K AED / mo';

const SAMPLE_CHIPS = [
  { role: 'IT Manager',      city: 'DXB', range: 'AED 22–35K' },
  { role: 'Senior Analyst',  city: 'DXB', range: 'AED 28–42K' },
  { role: 'Healthcare Lead', city: 'DOH', range: 'AED 26–44K' },
  { role: 'Finance Manager', city: 'AUH', range: 'AED 32–48K' },
];

const TRUST_PILLS = [
  '30 seconds',
  '7 questions',
  'No signup',
  'Paste-ready negotiation script',
];

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

function useCounter(target, { duration = 1400, start = false, reduce = false }) {
  const [v, setV] = useState(reduce ? target : 0);
  useEffect(() => {
    if (!start) return undefined;
    if (reduce) { setV(target); return undefined; }
    let raf;
    let t0;
    const tick = (t) => {
      if (!t0) t0 = t;
      const k = Math.min(1, (t - t0) / duration);
      setV(Math.round(easeOutCubic(k) * target));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, start, reduce]);
  return v;
}

function GulfSkyline({ reduce }) {
  const beacons = useMemo(() => ([
    { cx: 502, cy: 62,  r: 2.2, delay: 0    },
    { cx: 502, cy: 110, r: 1.4, delay: 0.4  },
    { cx: 320, cy: 168, r: 1.6, delay: 1.1  },
    { cx: 720, cy: 188, r: 1.6, delay: 0.8  },
    { cx: 158, cy: 220, r: 1.4, delay: 1.5  },
    { cx: 860, cy: 232, r: 1.4, delay: 0.6  },
  ]), []);

  return (
    <svg
      className="cvp-gbb-skyline"
      viewBox="0 0 1000 360"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="cvp-gbb-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0"   stopColor="#0a0d18" />
          <stop offset="0.4" stopColor="#0e1a2c" />
          <stop offset="0.7" stopColor="#1a3754" />
          <stop offset="0.9" stopColor="#3d6285" />
          <stop offset="1"   stopColor="#d97706" stopOpacity="0.55" />
        </linearGradient>
        <radialGradient id="cvp-gbb-glow" cx="0.5" cy="1" r="0.7">
          <stop offset="0"   stopColor="#f59e0b" stopOpacity="0.45" />
          <stop offset="0.4" stopColor="#d97706" stopOpacity="0.18" />
          <stop offset="1"   stopColor="#0a0d18" stopOpacity="0" />
        </radialGradient>
        <pattern id="cvp-gbb-windows" width="6" height="9" patternUnits="userSpaceOnUse">
          <rect width="6" height="9" fill="#06080d" />
          <rect x="1" y="1" width="2" height="2" fill="#fde68a" opacity="0.55" />
          <rect x="4" y="5" width="1.4" height="1.6" fill="#fcd34d" opacity="0.4" />
        </pattern>
        <pattern id="cvp-gbb-windows-dim" width="5" height="8" patternUnits="userSpaceOnUse">
          <rect width="5" height="8" fill="#080a12" />
          <rect x="1" y="1" width="1.4" height="1.6" fill="#fde68a" opacity="0.32" />
          <rect x="3" y="4" width="1" height="1.2" fill="#facc15" opacity="0.22" />
        </pattern>
        <filter id="cvp-gbb-soft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.6" />
        </filter>
      </defs>

      <rect x="0" y="0" width="1000" height="360" fill="url(#cvp-gbb-sky)" />
      <rect x="0" y="160" width="1000" height="200" fill="url(#cvp-gbb-glow)" />

      <g opacity="0.5">
        {Array.from({ length: 24 }).map((_, i) => (
          <circle
            // eslint-disable-next-line react/no-array-index-key
            key={`star-${i}`}
            cx={(37 * (i + 1)) % 1000}
            cy={20 + (i * 13) % 120}
            r={0.6 + (i % 3) * 0.3}
            fill="#fef3c7"
            opacity={0.3 + (i % 4) * 0.15}
          />
        ))}
      </g>

      <g opacity="0.65" filter="url(#cvp-gbb-soft)">
        <path
          d="M 0 280 L 0 240 L 30 240 L 30 220 L 60 220 L 60 230 L 90 230 L 90 200 L 120 200 L 120 215 L 150 215 L 150 195 L 175 195 L 175 210 L 200 210 L 200 220 L 235 220 L 235 200 L 270 200 L 270 215 L 300 215 L 300 230 L 340 230 L 340 210 L 365 210 L 365 225 L 400 225 L 400 200 L 430 200 L 430 215 L 460 215 L 460 220 L 485 220 L 485 90 L 502 60 L 519 90 L 519 220 L 540 220 L 540 210 L 570 210 L 570 225 L 600 225 L 600 200 L 630 200 L 630 215 L 660 215 L 660 230 L 690 230 L 690 215 L 720 215 L 720 195 L 750 195 L 750 220 L 780 220 L 780 210 L 810 210 L 810 225 L 840 225 L 840 215 L 870 215 L 870 230 L 900 230 L 900 220 L 930 220 L 930 240 L 970 240 L 970 230 L 1000 230 L 1000 360 L 0 360 Z"
          fill="url(#cvp-gbb-windows-dim)"
        />
      </g>

      <g>
        <line x1="502" y1="36" x2="502" y2="62" stroke="#0a0d18" strokeWidth="1.2" />
        <path
          d="M 488 360 L 488 230 L 491 195 L 494 160 L 497 128 L 500 95 L 502 62 L 504 95 L 507 128 L 510 160 L 513 195 L 516 230 L 516 360 Z"
          fill="#040608"
        />
        <path
          d="M 489 230 L 489 210 L 515 210 L 515 230 Z M 491 209 L 491 175 L 513 175 L 513 209 Z M 494 174 L 494 140 L 510 140 L 510 174 Z"
          fill="url(#cvp-gbb-windows)"
          opacity="0.7"
        />
        <path d="M 478 360 L 478 240 L 526 240 L 526 360 Z" fill="#06090f" />
        <rect x="478" y="240" width="48" height="2" fill="#1f2937" />
      </g>

      <g>
        <path d="M 305 360 L 305 168 L 335 175 L 335 360 Z" fill="#05070b" />
        <rect x="307" y="180" width="26" height="170" fill="url(#cvp-gbb-windows)" opacity="0.55" />
        <path d="M 700 360 L 700 188 L 738 195 L 738 360 Z" fill="#05070b" />
        <rect x="702" y="200" width="34" height="155" fill="url(#cvp-gbb-windows)" opacity="0.55" />
        <path d="M 748 360 L 748 220 L 778 224 L 778 360 Z" fill="#06080d" />
        <rect x="750" y="232" width="26" height="125" fill="url(#cvp-gbb-windows-dim)" opacity="0.5" />
      </g>

      <line x1="0" y1="360" x2="1000" y2="360" stroke="rgba(245,158,11,0.18)" strokeWidth="2" />

      {beacons.map((b, i) => (
        <circle
          // eslint-disable-next-line react/no-array-index-key
          key={`beacon-${i}`}
          cx={b.cx}
          cy={b.cy}
          r={b.r}
          fill="#fca5a5"
          className="cvp-gbb-beacon"
          style={reduce ? undefined : { animationDelay: `${b.delay}s` }}
        />
      ))}
    </svg>
  );
}

export default function GulfBillboardCard() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const ref = useRef(null);

  const [inView, setInView] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setInView(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const skylineY = useTransform(scrollYProgress, [0, 1], [0, reduce ? 0 : -32]);
  const skylineScale = useTransform(scrollYProgress, [0, 1], [1.04, 1.08]);

  const lowVal = useCounter(HOOK_LOW, { duration: 1100, start: inView, reduce });
  const highVal = useCounter(HOOK_HIGH, { duration: 1500, start: inView, reduce });

  const [chipIdx, setChipIdx] = useState(0);
  useEffect(() => {
    if (reduce) return undefined;
    const id = setInterval(() => setChipIdx((i) => (i + 1) % SAMPLE_CHIPS.length), 3000);
    return () => clearInterval(id);
  }, [reduce]);

  const onCTA = useCallback(() => navigate(TARGET_HREF), [navigate]);
  const onHookLink = useCallback(
    (e) => { e.preventDefault(); navigate(TARGET_HREF); },
    [navigate]
  );

  return (
    <section ref={ref} className="cvp-gbb" aria-labelledby="cvp-gbb-h" data-testid="gulf-billboard">
      <style>{`
        .cvp-gbb {
          position: relative;
          max-width: 1200px;
          margin: 24px auto;
          padding: 0 24px;
          color: var(--color-text-primary, #ffffff);
          font-family: inherit;
          box-sizing: border-box;
        }
        @media (max-width: 720px) {
          .cvp-gbb { padding: 0 16px; margin: 8px auto; }
        }

        .cvp-gbb-frame {
          position: relative;
          border-radius: clamp(20px, 2.4vw, 28px);
          overflow: hidden;
          isolation: isolate;
          background: #06080d;
          border: 1px solid rgba(255,255,255,0.07);
          box-shadow:
            0 1px 0 rgba(255,255,255,0.06) inset,
            0 30px 80px -20px rgba(0,0,0,0.55),
            0 8px 24px -8px rgba(217,119,6,0.12);
          min-height: clamp(420px, 60vw, 540px);
          display: grid;
          grid-template-columns: 1.05fr 1fr;
          align-items: stretch;
        }
        @media (max-width: 880px) {
          .cvp-gbb-frame {
            grid-template-columns: 1fr;
            min-height: 0;
          }
        }

        .cvp-gbb-plate {
          position: relative;
          overflow: hidden;
          min-height: clamp(220px, 38vw, 320px);
        }
        @media (min-width: 881px) {
          .cvp-gbb-plate { min-height: auto; }
        }
        .cvp-gbb-skyline-wrap {
          position: absolute; inset: 0;
          will-change: transform;
        }
        .cvp-gbb-skyline {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          display: block;
          transform-origin: 50% 100%;
        }
        .cvp-gbb-beacon {
          animation: cvp-gbb-blink 2.4s ease-in-out infinite;
          transform-origin: center;
        }
        @keyframes cvp-gbb-blink {
          0%, 60%, 100% { opacity: 1; }
          30%, 50%      { opacity: 0.15; }
        }

        .cvp-gbb-plate::before {
          content: "";
          position: absolute; inset: 0;
          background:
            linear-gradient(180deg, rgba(6,8,13,0) 50%, rgba(6,8,13,0.55) 100%),
            radial-gradient(120% 80% at 30% 110%, rgba(217,119,6,0.18), transparent 60%);
          pointer-events: none;
          z-index: 2;
        }
        @media (max-width: 880px) {
          .cvp-gbb-plate::before {
            background:
              linear-gradient(180deg, rgba(6,8,13,0) 35%, rgba(6,8,13,0.92) 100%),
              radial-gradient(140% 70% at 50% 110%, rgba(217,119,6,0.22), transparent 60%);
          }
        }

        .cvp-gbb-ticker {
          position: absolute;
          left: clamp(20px, 3vw, 32px);
          top: clamp(20px, 3vw, 28px);
          z-index: 3;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 7px 12px 7px 10px;
          background: rgba(8,10,16,0.62);
          border: 1px solid rgba(255,255,255,0.10);
          backdrop-filter: blur(14px) saturate(130%);
          -webkit-backdrop-filter: blur(14px) saturate(130%);
          border-radius: 999px;
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 11px;
          letter-spacing: 0.14em;
          color: rgba(255,255,255,0.78);
          text-transform: uppercase;
        }
        .cvp-gbb-ticker-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #34d399;
          box-shadow: 0 0 10px rgba(52,211,153,0.7);
          animation: cvp-gbb-pulse 1.6s ease-in-out infinite;
        }
        @keyframes cvp-gbb-pulse {
          0%,100% { opacity: 1; transform: scale(1); }
          50%     { opacity: 0.4; transform: scale(0.6); }
        }
        .cvp-gbb-ticker b { color: #fff; font-weight: 700; }

        .cvp-gbb-plate-caption {
          position: absolute;
          left: clamp(20px, 3vw, 32px);
          right: clamp(20px, 3vw, 32px);
          bottom: clamp(20px, 3vw, 32px);
          z-index: 3;
          font-size: clamp(11px, 1.3vw, 13px);
          letter-spacing: 0.2em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.65);
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .cvp-gbb-plate-caption::before {
          content: "";
          width: 26px; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(245,158,11,0.85));
        }
        @media (max-width: 880px) {
          .cvp-gbb-plate-caption {
            position: static;
            margin: 16px clamp(20px, 5vw, 28px) 0;
            color: rgba(255,255,255,0.7);
          }
        }

        .cvp-gbb-body {
          position: relative;
          z-index: 4;
          padding: clamp(28px, 4vw, 56px) clamp(24px, 4vw, 48px);
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 24px;
          background: linear-gradient(180deg, rgba(6,8,13,0.0) 0%, rgba(6,8,13,0.55) 100%);
        }
        @media (max-width: 880px) {
          .cvp-gbb-body {
            padding: 24px clamp(20px, 5vw, 28px) 28px;
            gap: 20px;
            background: linear-gradient(180deg, rgba(6,8,13,0.92) 0%, #06080d 30%);
          }
        }

        .cvp-gbb-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 11px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: var(--color-accent, #d97706);
          font-weight: 600;
          align-self: flex-start;
        }
        .cvp-gbb-eyebrow::before {
          content: "";
          width: 18px; height: 1px;
          background: var(--color-accent, #d97706);
        }

        .cvp-gbb-h {
          font-size: clamp(28px, 4.4vw, 52px);
          line-height: 1.02;
          letter-spacing: -0.028em;
          font-weight: 510;
          margin: 0;
          color: var(--color-text-primary, #ffffff);
          text-wrap: balance;
        }
        .cvp-gbb-h em {
          font-style: normal;
          /* Fallback: solid amber-lit when background-clip:text is
             unavailable — the gradient lives inside the guard below. */
          color: #fde68a;
        }
        @supports (-webkit-background-clip: text) or (background-clip: text) {
          .cvp-gbb-h em {
            background: linear-gradient(90deg, #ffffff 0%, #fde68a 35%, #d97706 70%, #f59e0b 100%);
            background-size: 220% auto;
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: cvp-gbb-shimmer 6s linear infinite;
          }
          @media (prefers-reduced-motion: reduce) {
            /* Freeze the shimmer only — resetting the background shorthand
               here would drop background-clip and paint a box over the text. */
            .cvp-gbb-h em { animation: none; }
          }
        }
        @keyframes cvp-gbb-shimmer {
          0%   { background-position: 0% center; }
          100% { background-position: 220% center; }
        }

        .cvp-gbb-sub {
          font-size: clamp(14px, 1.4vw, 16px);
          line-height: 1.5;
          color: var(--color-text-secondary, rgba(255,255,255,0.65));
          margin: 0;
          max-width: 48ch;
        }

        .cvp-gbb-hook {
          display: flex;
          flex-direction: column;
          gap: 4px;
          padding: 18px 20px;
          border-radius: clamp(14px, 1.6vw, 18px);
          background:
            linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01) 60%),
            rgba(217,119,6,0.04);
          border: 1px solid rgba(217,119,6,0.22);
          position: relative;
          overflow: hidden;
        }
        .cvp-gbb-hook::before {
          content: "";
          position: absolute; inset: 0;
          background: radial-gradient(120% 100% at 100% 0%, rgba(245,158,11,0.18), transparent 55%);
          pointer-events: none;
        }
        .cvp-gbb-hook-l {
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 10.5px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.5);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .cvp-gbb-hook-l b { color: #fff; font-weight: 600; }
        .cvp-gbb-hook-num {
          font-size: clamp(36px, 6vw, 64px);
          line-height: 1;
          font-weight: 700;
          letter-spacing: -0.04em;
          font-variant-numeric: tabular-nums;
          color: #ffffff;
          display: flex;
          align-items: baseline;
          gap: 10px;
          flex-wrap: wrap;
          row-gap: 2px;
        }
        @supports (-webkit-background-clip: text) or (background-clip: text) {
          .cvp-gbb-hook-num {
            background: linear-gradient(180deg, #ffffff 0%, #fde68a 100%);
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
          }
          .cvp-gbb-hook-num small {
            -webkit-text-fill-color: rgba(255,255,255,0.5);
          }
        }
        .cvp-gbb-hook-num small {
          font-size: clamp(13px, 1.4vw, 15px);
          font-weight: 500;
          letter-spacing: 0.02em;
          color: rgba(255,255,255,0.5);
          font-variant-numeric: normal;
        }
        .cvp-gbb-hook-foot {
          font-size: 12px;
          color: rgba(255,255,255,0.55);
          margin-top: 4px;
          line-height: 1.4;
        }
        .cvp-gbb-hook-link {
          color: #fde68a;
          font-weight: 600;
          text-decoration: none;
          border-bottom: 1px dashed rgba(253,230,138,0.45);
          padding-bottom: 1px;
          cursor: pointer;
          transition: color 160ms cubic-bezier(0.25, 0.46, 0.45, 0.94),
                      border-color 160ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        .cvp-gbb-hook-link:hover {
          color: #fef3c7;
          border-bottom-color: #fef3c7;
          border-bottom-style: solid;
        }
        .cvp-gbb-hook-link:focus-visible {
          outline: 2px solid var(--color-accent, #d97706);
          outline-offset: 3px;
          border-radius: 3px;
        }

        .cvp-gbb-chip-stack {
          align-self: flex-start;
          max-width: 100%;
          display: grid;
          grid-template-columns: minmax(0, max-content);
        }
        .cvp-gbb-chip-stack > .cvp-gbb-chip {
          grid-column: 1;
          grid-row: 1;
        }

        .cvp-gbb-chip {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 9px 14px 9px 11px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.10);
          border-radius: var(--radius-pill, 999px);
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
          font-size: 12.5px;
          color: rgba(255,255,255,0.85);
          max-width: 100%;
          white-space: nowrap;
          overflow: hidden;
          opacity: 0;
          transform: translateY(4px);
          transition: opacity 380ms cubic-bezier(0.25, 0.46, 0.45, 0.94),
                      transform 380ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
          pointer-events: none;
        }
        .cvp-gbb-chip.is-on {
          opacity: 1;
          transform: translateY(0);
          pointer-events: auto;
        }
        @media (prefers-reduced-motion: reduce) {
          .cvp-gbb-chip { transition: none; transform: none; }
        }
        .cvp-gbb-chip-tag {
          font-size: 9.5px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          padding: 3px 7px;
          border-radius: 5px;
          background: rgba(217,119,6,0.18);
          color: #fcd34d;
          font-weight: 700;
          flex-shrink: 0;
        }
        .cvp-gbb-chip-content {
          display: inline-flex; align-items: center; gap: 8px;
          min-width: 0;
        }
        .cvp-gbb-chip-role { color: #fff; font-weight: 600; letter-spacing: 0; }
        .cvp-gbb-chip-arrow { color: rgba(255,255,255,0.35); }
        .cvp-gbb-chip-range {
          color: #fde68a; font-weight: 700;
          font-variant-numeric: tabular-nums;
        }

        .cvp-gbb-cta-row {
          display: flex;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
        }
        .cvp-gbb-cta {
          position: relative;
          background: var(--color-accent, #d97706);
          color: var(--color-surface-00, #0a0a0a);
          border: 0;
          padding: 16px 26px 16px 24px;
          border-radius: var(--radius-pill, 999px);
          font-family: inherit;
          font-size: 15px;
          font-weight: 600;
          letter-spacing: -0.005em;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          transition: transform 160ms cubic-bezier(0.25, 0.46, 0.45, 0.94),
                      filter 160ms cubic-bezier(0.25, 0.46, 0.45, 0.94),
                      box-shadow 220ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
          box-shadow:
            0 0 0 1px rgba(245,158,11,0.4),
            0 8px 24px -6px rgba(217,119,6,0.55);
          will-change: transform;
        }
        .cvp-gbb-cta::after {
          content: "";
          position: absolute;
          inset: -4px;
          border-radius: 999px;
          border: 1px solid rgba(245,158,11,0.4);
          opacity: 0;
          animation: cvp-gbb-halo 2.6s ease-out infinite;
          pointer-events: none;
        }
        @keyframes cvp-gbb-halo {
          0%   { opacity: 0; transform: scale(0.92); }
          40%  { opacity: 0.6; }
          100% { opacity: 0; transform: scale(1.18); }
        }
        .cvp-gbb-cta:hover {
          filter: brightness(0.95);
          box-shadow:
            0 0 0 1px rgba(245,158,11,0.55),
            0 14px 36px -6px rgba(217,119,6,0.7);
        }
        .cvp-gbb-cta:active { transform: scale(0.98) translateZ(0); }
        .cvp-gbb-cta:focus-visible {
          outline: 2px solid var(--color-accent, #d97706);
          outline-offset: 3px;
        }
        .cvp-gbb-cta-arrow {
          font-size: 18px;
          line-height: 1;
          transition: transform 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        .cvp-gbb-cta:hover .cvp-gbb-cta-arrow { transform: translateX(3px); }

        @media (prefers-reduced-motion: reduce) {
          .cvp-gbb-cta::after,
          .cvp-gbb-ticker-dot,
          .cvp-gbb-beacon { animation: none; }
          .cvp-gbb-cta { transition: none; }
        }

        .cvp-gbb-trust {
          display: flex;
          flex-wrap: wrap;
          gap: 6px 14px;
          align-items: center;
          font-size: 12px;
          color: rgba(255,255,255,0.55);
          line-height: 1.4;
        }
        .cvp-gbb-trust-item {
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .cvp-gbb-trust-item::before {
          content: "✓";
          color: #34d399;
          font-weight: 700;
          font-size: 11px;
        }
        .cvp-gbb-trust-sep {
          width: 3px; height: 3px; border-radius: 50%;
          background: rgba(255,255,255,0.18);
          flex-shrink: 0;
        }
        @media (max-width: 720px) {
          .cvp-gbb-trust { font-size: 11.5px; gap: 4px 10px; }
          .cvp-gbb-trust-sep { display: none; }
        }

        .cvp-gbb-legal {
          font-size: 10.5px;
          color: rgba(255,255,255,0.32);
          letter-spacing: 0.04em;
          margin-top: -4px;
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
        }
      `}</style>

      <div className="cvp-gbb-frame">
        <div className="cvp-gbb-plate">
          <motion.div
            className="cvp-gbb-skyline-wrap"
            style={reduce ? undefined : { y: skylineY, scale: skylineScale }}
          >
            <GulfSkyline reduce={reduce} />
          </motion.div>

          <motion.div
            className="cvp-gbb-ticker"
            initial={reduce ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <span className="cvp-gbb-ticker-dot" aria-hidden="true" />
            <span>BOM&nbsp;&rarr;&nbsp;<b>DXB</b>&nbsp;&middot;&nbsp;LIVE&nbsp;MARKET</span>
          </motion.div>

          <motion.div
            className="cvp-gbb-plate-caption"
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            DUBAI &middot; RIYADH &middot; DOHA &middot; ABU DHABI
          </motion.div>
        </div>

        <div className="cvp-gbb-body">
          <span className="cvp-gbb-eyebrow">Gulf Career Intelligence &middot; Free</span>

          <h2 id="cvp-gbb-h" className="cvp-gbb-h">
            {HEADLINE_PRE}{' '}
            <em>{HEADLINE_HOOK}</em>
          </h2>

          <p className="cvp-gbb-sub">{SUBLINE}</p>

          <div className="cvp-gbb-hook" role="group" aria-label="Estimated Gulf salary band">
            <div className="cvp-gbb-hook-l">
              <span>YOUR NUMBER &middot; </span>
              <b>What&rsquo;s mine?</b>
            </div>
            <div className="cvp-gbb-hook-num" aria-live="polite">
              <span>AED&nbsp;{lowVal}&ndash;{highVal}</span>
              <small>{HOOK_UNIT}</small>
            </div>
            <div className="cvp-gbb-hook-foot">
              Median band for a senior analyst in Dubai.{' '}
              <a className="cvp-gbb-hook-link" href={TARGET_HREF} onClick={onHookLink}>
                Yours could be higher &rarr;
              </a>
            </div>
          </div>

          <div className="cvp-gbb-chip-stack" aria-live="polite">
            {SAMPLE_CHIPS.map((c, i) => (
              <div
                key={c.role}
                className={`cvp-gbb-chip ${i === chipIdx ? 'is-on' : ''}`}
                aria-hidden={i !== chipIdx}
                aria-label={i === chipIdx ? `Sample output: ${c.role}, ${c.city}, ${c.range}` : undefined}
              >
                <span className="cvp-gbb-chip-tag">SAMPLE</span>
                <span className="cvp-gbb-chip-content">
                  <span className="cvp-gbb-chip-role">{c.role}</span>
                  <span className="cvp-gbb-chip-arrow">&middot;</span>
                  <span>{c.city}</span>
                  <span className="cvp-gbb-chip-arrow">&rarr;</span>
                  <span className="cvp-gbb-chip-range">{c.range}</span>
                </span>
              </div>
            ))}
          </div>

          <div className="cvp-gbb-cta-row">
            <button
              type="button"
              className="cvp-gbb-cta"
              onClick={onCTA}
              aria-describedby="cvp-gbb-trust"
            >
              <span>Get My Gulf Intelligence Report &mdash; Free</span>
              <span className="cvp-gbb-cta-arrow" aria-hidden="true">&rarr;</span>
            </button>
          </div>

          <div id="cvp-gbb-trust" className="cvp-gbb-trust" role="list">
            {TRUST_PILLS.map((p, i) => (
              <React.Fragment key={p}>
                <span className="cvp-gbb-trust-item" role="listitem">{p}</span>
                {i < TRUST_PILLS.length - 1 && (
                  <span className="cvp-gbb-trust-sep" aria-hidden="true" />
                )}
              </React.Fragment>
            ))}
          </div>

          <p className="cvp-gbb-legal">
            Peer-benchmarked estimates. Not financial advice.
          </p>
        </div>
      </div>
    </section>
  );
}
