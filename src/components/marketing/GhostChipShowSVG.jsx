import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

// ghostchip-show-animation — W18 Round 3a.
//
// Source of truth: /2-LIBRARY/Motion_Atoms/ghostchip-show-animation/motion.json
// Adapted to JSX from the atom's reference code.tsx per the paste-gated
// spec in /5-HANDOFF/[READY]_ghostchip_svg_show_block.json.
//
// Constitutional notes:
//   - Silver/white "Luxury Glass" scanner is scoped to THIS atom only.
//     Amber remains the singular brand accent everywhere else per
//     STYLE_GUIDE § 2.4.
//   - drop-shadow glow on amber dots is permitted here — marketing
//     surface exception per STYLE_GUIDE § 5.1. Do not copy the glow
//     into product UI.
//   - No raw hex in runtime fills; hex values appear only as default
//     fallbacks inside var(--token, #hex).
//   - No `transition: all`. Framer Motion animates named properties.
//   - prefers-reduced-motion path renders the final state statically,
//     no loop, no scanner. Double-gated via useReducedMotion() hook
//     and a CSS @media rule for SSR/noscript environments.

const LOOP_MS = 7000;

const T = {
  cvRender: 0,
  scannerEnter: 300,
  keyword1: 900,
  keyword2: 1700,
  keyword3: 2800,
  keyword4: 3700,
  keyword5: 4600,
  scannerExit: 5000,
  checkDrawIn: 5200,
  holdFinal: 5600,
  fadeRestart: 6000,
};

const EASE_PREMIUM = [0.4, 0, 0.6, 1];

const KEYWORDS = [
  { id: 1, label: 'Digital Marketing Strategy',   zone: 'summary',    t: T.keyword1 },
  { id: 2, label: 'Performance Marketing',        zone: 'summary',    t: T.keyword2 },
  { id: 3, label: 'SEO & Google Analytics (GA4)', zone: 'experience', t: T.keyword3 },
  { id: 4, label: 'Stakeholder Management',       zone: 'experience', t: T.keyword4 },
  { id: 5, label: 'Team Leadership',              zone: 'skills',     t: T.keyword5 },
];

// SVG coordinate system — 360 × 480, preserveAspectRatio xMidYMid meet.
const CV_W = 360;
const CV_H = 480;

// Dot positions in SVG user units — placed immediately to the right of
// each keyword's text run-end.
const DOT_POSITIONS = {
  1: { x: 298, y: 126 },
  2: { x: 242, y: 144 },
  3: { x: 316, y: 252 },
  4: { x: 238, y: 276 },
  5: { x: 208, y: 396 },
};

// Scanner band — 48px tall, travels from -5% to 105% of CV height.
const SCANNER_BAND_H = 48;
const SCANNER_FROM_Y = -CV_H * 0.05;             // -24
const SCANNER_TO_Y   = CV_H * 1.05 - SCANNER_BAND_H; // 456

function CvDocument() {
  return (
    <g data-role="cv-document">
      {/* Paper */}
      <rect
        x={0}
        y={0}
        width={CV_W}
        height={CV_H}
        fill="var(--light-surface-00, #FBFBFD)"
      />

      {/* Name + role header */}
      <text
        x={24}
        y={48}
        fontFamily="Inter, system-ui, sans-serif"
        fontSize={18}
        fontWeight={600}
        fill="var(--light-ink-90, #111113)"
      >
        Layla Al-Hashimi
      </text>
      <text
        x={24}
        y={68}
        fontFamily="Inter, system-ui, sans-serif"
        fontSize={11}
        fill="var(--light-ink-60, #5B5B66)"
      >
        Senior Marketing Manager  ·  Dubai, UAE
      </text>

      {/* Divider */}
      <line
        x1={24}
        y1={82}
        x2={CV_W - 24}
        y2={82}
        stroke="var(--light-ink-20, #D9D9DE)"
        strokeWidth={0.75}
      />

      {/* Summary section */}
      <text x={24} y={104} fontFamily="Inter, system-ui, sans-serif" fontSize={10} fontWeight={600} letterSpacing={1.2} fill="var(--light-ink-80, #26262C)">
        SUMMARY
      </text>
      <text x={24} y={124} fontFamily="Inter, system-ui, sans-serif" fontSize={10} fill="var(--light-ink-70, #3D3D46)">
        8 years leading <tspan fontWeight={600}>Digital Marketing Strategy</tspan> across MENA.
      </text>
      <text x={24} y={142} fontFamily="Inter, system-ui, sans-serif" fontSize={10} fill="var(--light-ink-70, #3D3D46)">
        Specialist in <tspan fontWeight={600}>Performance Marketing</tspan>, brand growth, ROI.
      </text>

      {/* Experience section */}
      <text x={24} y={178} fontFamily="Inter, system-ui, sans-serif" fontSize={10} fontWeight={600} letterSpacing={1.2} fill="var(--light-ink-80, #26262C)">
        EXPERIENCE
      </text>
      <text x={24} y={198} fontFamily="Inter, system-ui, sans-serif" fontSize={10} fontWeight={600} fill="var(--light-ink-80, #26262C)">
        Head of Marketing  ·  Emirates Digital Group
      </text>
      <text x={24} y={214} fontFamily="Inter, system-ui, sans-serif" fontSize={9} fill="var(--light-ink-60, #5B5B66)">
        Dubai, UAE  ·  2022 – Present
      </text>
      <text x={24} y={234} fontFamily="Inter, system-ui, sans-serif" fontSize={10} fill="var(--light-ink-70, #3D3D46)">
        • Drove 340% organic growth via <tspan fontWeight={600}>SEO</tspan> &amp; full-funnel
      </text>
      <text x={24} y={250} fontFamily="Inter, system-ui, sans-serif" fontSize={10} fill="var(--light-ink-70, #3D3D46)">
        {'   '}<tspan fontWeight={600}>Google Analytics (GA4)</tspan> attribution work.
      </text>
      <text x={24} y={274} fontFamily="Inter, system-ui, sans-serif" fontSize={10} fill="var(--light-ink-70, #3D3D46)">
        • <tspan fontWeight={600}>Stakeholder Management</tspan> across C-suite, agency,
      </text>
      <text x={24} y={290} fontFamily="Inter, system-ui, sans-serif" fontSize={10} fill="var(--light-ink-70, #3D3D46)">
        {'   '}and regional GMs. Quarterly board reporting.
      </text>

      <text x={24} y={322} fontFamily="Inter, system-ui, sans-serif" fontSize={10} fontWeight={600} fill="var(--light-ink-80, #26262C)">
        Marketing Manager  ·  Al Tayer Group
      </text>
      <text x={24} y={338} fontFamily="Inter, system-ui, sans-serif" fontSize={9} fill="var(--light-ink-60, #5B5B66)">
        Dubai, UAE  ·  2018 – 2022
      </text>
      <text x={24} y={358} fontFamily="Inter, system-ui, sans-serif" fontSize={10} fill="var(--light-ink-70, #3D3D46)">
        • Brand &amp; demand-gen across 6 luxury retail lines.
      </text>

      {/* Skills section */}
      <text x={24} y={392} fontFamily="Inter, system-ui, sans-serif" fontSize={10} fontWeight={600} letterSpacing={1.2} fill="var(--light-ink-80, #26262C)">
        CORE COMPETENCIES
      </text>
      <text x={24} y={410} fontFamily="Inter, system-ui, sans-serif" fontSize={10} fill="var(--light-ink-70, #3D3D46)">
        <tspan fontWeight={600}>Team Leadership</tspan> · P&amp;L · Martech Stack · Arabic/English
      </text>

      {/* Footer meta */}
      <text x={24} y={456} fontFamily="Inter, system-ui, sans-serif" fontSize={8} fill="var(--light-ink-40, #9A9AA3)">
        layla.alhashimi@example.ae  ·  linkedin.com/in/laylaalhashimi
      </text>

      {/* Success-check badge frame (top-right). The ✓ path itself is
          drawn by <SuccessCheck /> so its pathLength can be animated. */}
      <rect
        x={CV_W - 44}
        y={28}
        width={28}
        height={28}
        rx={6}
        fill="var(--light-surface-10, #F2F2F5)"
        stroke="var(--light-ink-20, #D9D9DE)"
        strokeWidth={0.75}
      />
    </g>
  );
}

function ScannerBand({ reducedMotion }) {
  if (reducedMotion) return null;
  return (
    <motion.g
      data-role="scanner-band"
      style={{
        mixBlendMode: 'screen',
        filter: 'blur(2px)',
        willChange: 'transform',
        transform: 'translateZ(0)',
      }}
      initial={{ y: SCANNER_FROM_Y, opacity: 0 }}
      animate={{
        y: [SCANNER_FROM_Y, SCANNER_FROM_Y, SCANNER_TO_Y, SCANNER_TO_Y],
        opacity: [0, 1, 1, 0],
      }}
      transition={{
        duration: LOOP_MS / 1000,
        times: [
          0,
          T.scannerEnter / LOOP_MS,
          T.scannerExit / LOOP_MS,
          (T.scannerExit + 200) / LOOP_MS,
        ],
        ease: EASE_PREMIUM,
        repeat: Infinity,
      }}
    >
      <defs>
        <linearGradient id="ghostchipScannerGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="rgba(255,255,255,0)" />
          <stop offset="30%"  stopColor="rgba(255,255,255,0.2)" />
          <stop offset="50%"  stopColor="rgba(245,245,247,0.85)" />
          <stop offset="70%"  stopColor="rgba(255,255,255,0.2)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      <rect
        x={0}
        y={0}
        width={CV_W}
        height={SCANNER_BAND_H}
        fill="url(#ghostchipScannerGradient)"
      />
    </motion.g>
  );
}

function KeywordDot({ x, y, triggerAtMs, reducedMotion }) {
  if (reducedMotion) {
    return (
      <g transform={`translate(${x} ${y})`}>
        <circle
          r={3.5}
          fill="var(--accent-amber, #D97706)"
          style={{
            filter: 'drop-shadow(0 0 6px var(--accent-amber-subtle, rgba(217,119,6,0.45)))',
          }}
        />
      </g>
    );
  }

  const start     = triggerAtMs / LOOP_MS;
  const peak      = (triggerAtMs + 180) / LOOP_MS;
  const settle    = (triggerAtMs + 320) / LOOP_MS;
  const fadeStart = T.fadeRestart / LOOP_MS;

  return (
    <motion.g
      transform={`translate(${x} ${y})`}
      style={{
        willChange: 'transform, opacity',
        transform: 'translateZ(0)',
      }}
      initial={{ opacity: 0, scale: 0 }}
      animate={{
        opacity: [0, 0, 1, 1, 1, 0],
        scale:   [0, 0, 1.15, 1, 1, 0.8],
      }}
      transition={{
        duration: LOOP_MS / 1000,
        times: [0, start, peak, settle, fadeStart, 1],
        ease: EASE_PREMIUM,
        repeat: Infinity,
      }}
    >
      <circle
        r={3.5}
        fill="var(--accent-amber, #D97706)"
        style={{
          filter: 'drop-shadow(0 0 6px var(--accent-amber-subtle, rgba(217,119,6,0.45)))',
        }}
      />
    </motion.g>
  );
}

function SuccessCheck({ reducedMotion }) {
  // Badge centre is top-right of CV. The 16-unit path is rendered at 14px.
  const cx = CV_W - 38;
  const cy = 34;
  const pathD = 'M3 8 L7 12 L13 4';

  if (reducedMotion) {
    return (
      <g transform={`translate(${cx} ${cy})`}>
        <path
          d={pathD}
          fill="none"
          stroke="var(--status-success, #16A34A)"
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    );
  }

  const drawStart = T.checkDrawIn / LOOP_MS;
  const drawEnd   = (T.checkDrawIn + 320) / LOOP_MS;
  const fadeStart = T.fadeRestart / LOOP_MS;

  return (
    <g transform={`translate(${cx} ${cy})`}>
      <motion.path
        d={pathD}
        fill="none"
        stroke="var(--status-success, #16A34A)"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{
          pathLength: [0, 0, 1, 1, 0],
          opacity:    [0, 0, 1, 1, 0],
        }}
        transition={{
          duration: LOOP_MS / 1000,
          times: [0, drawStart, drawEnd, fadeStart, 1],
          ease: EASE_PREMIUM,
          repeat: Infinity,
        }}
      />
    </g>
  );
}

const DEFAULT_ARIA_LABEL =
  "Animated demonstration: an ATS scanner reads Layla Al-Hashimi's CV and highlights five key marketing competencies before confirming a successful scan.";

export default function GhostChipShowSVG({
  ariaLabel = DEFAULT_ARIA_LABEL,
  paused = false,
}) {
  const shouldReduceMotion = useReducedMotion() ?? false;
  const reducedMotion = shouldReduceMotion || paused;

  return (
    <figure
      role="img"
      aria-label={ariaLabel}
      className="cvp-gc-show"
    >
      <style>{`
        .cvp-gc-show {
          width: 100%;
          max-width: 720px;
          margin: 0 auto;
          padding: 24px;
          background: var(--surface-00, #0A0A0A);
          border-radius: 16px;
          box-sizing: border-box;
          -webkit-font-smoothing: antialiased;
        }
        .cvp-gc-show-svg {
          display: block;
          width: 100%;
          height: auto;
          border-radius: 8px;
          overflow: hidden;
        }
        @media (prefers-reduced-motion: reduce) {
          .cvp-gc-show [data-role="scanner-band"] { display: none; }
        }
      `}</style>
      <svg
        className="cvp-gc-show-svg"
        viewBox={`0 0 ${CV_W} ${CV_H}`}
        preserveAspectRatio="xMidYMid meet"
        width="100%"
        height="auto"
        aria-hidden="true"
      >
        <CvDocument />
        <ScannerBand reducedMotion={reducedMotion} />

        {KEYWORDS.map((k) => {
          const pos = DOT_POSITIONS[k.id];
          return (
            <KeywordDot
              key={k.id}
              x={pos.x}
              y={pos.y}
              triggerAtMs={k.t}
              reducedMotion={reducedMotion}
            />
          );
        })}

        <SuccessCheck reducedMotion={reducedMotion} />
      </svg>
    </figure>
  );
}
