/* ═══════════════════════════════════════════════════════════════════════════
   src/components/MiniToolCard.jsx
   Compact bento variant of the /tools ToolCard — inherits borders, glows,
   conic ring animation and warm bleed from ToolsPage. No modal, no overlay,
   entire card is a <Link>.
   ═══════════════════════════════════════════════════════════════════════════ */

import React from "react";
import { Link } from "react-router-dom";

const FONT = "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace";
const EASE = "cubic-bezier(0.4,0,0.2,1)";

function Glyph({ text, ring, bleedRGB }) {
  return (
    <span
      className="mtc-glyph-wrap"
      style={{ "--mtc-ring": ring, "--mtc-bleed": bleedRGB }}
    >
      <span aria-hidden className="mtc-glyph-ring" />
      <span className="mtc-glyph" aria-hidden>
        <span className="mtc-glyph-text">{text}</span>
      </span>
    </span>
  );
}

function MetricText({ value }) {
  return (
    <div className="mtc-metric mtc-metric-text">
      <span className="mtc-metric-text-value">{value}</span>
    </div>
  );
}

function MetricRing({ percent, ring }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - percent / 100);
  return (
    <div className="mtc-metric mtc-metric-ring">
      <svg width="58" height="58" viewBox="0 0 58 58" aria-hidden>
        <circle
          cx="29"
          cy="29"
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="4"
        />
        <circle
          cx="29"
          cy="29"
          r={r}
          fill="none"
          stroke={ring}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform="rotate(-90 29 29)"
          style={{ filter: `drop-shadow(0 0 6px ${ring})` }}
        />
        <text
          x="29"
          y="33"
          textAnchor="middle"
          fontFamily={MONO}
          fontSize="13"
          fontWeight="700"
          fill="#fff"
        >
          {percent}%
        </text>
      </svg>
      <span className="mtc-metric-ring-label">ATS READY</span>
    </div>
  );
}

function MetricPills({ items, ring }) {
  return (
    <div className="mtc-metric mtc-metric-pills">
      {items.map((p) => (
        <span
          key={p}
          className="mtc-pill"
          style={{ "--mtc-ring": ring }}
        >
          {p}
        </span>
      ))}
    </div>
  );
}

export default function MiniToolCard({
  to,
  glyph,
  title,
  snippet,
  ring,
  bleedRGB,
  metric,
  isMini = true,
}) {
  return (
    <Link
      to={to}
      className={`mtc-card${isMini ? " is-mini" : ""}`}
      style={{ "--mtc-ring": ring, "--mtc-bleed": bleedRGB }}
      aria-label={`${title} — ${snippet}`}
    >
      <span aria-hidden className="mtc-ring" />
      <span aria-hidden className="mtc-warm" />

      <div className="mtc-inner">
        <div className="mtc-head">
          <Glyph text={glyph} ring={ring} bleedRGB={bleedRGB} />
          <div className="mtc-head-text">
            <div className="mtc-title">{title}</div>
            <div className="mtc-snippet">{snippet}</div>
          </div>
        </div>

        {metric?.type === "text" && <MetricText value={metric.value} />}
        {metric?.type === "ring" && (
          <MetricRing percent={metric.percent} ring={ring} />
        )}
        {metric?.type === "pills" && (
          <MetricPills items={metric.items} ring={ring} />
        )}

        <div className="mtc-foot">
          <span className="mtc-cta">OPEN TOOL</span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            aria-hidden
          >
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </Link>
  );
}

export const MINI_TOOL_CSS = `
@property --mtc-angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
@keyframes mtc-spin { to { --mtc-angle: 360deg; } }

.mtc-card {
  position: relative;
  display: block;
  width: 100%;
  max-width: 350px;
  padding: 0;
  border-radius: 22px;
  text-decoration: none;
  color: inherit;
  font-family: ${FONT};
  -webkit-font-smoothing: antialiased;
  isolation: isolate;
  cursor: pointer;
  transition: transform 200ms ease, box-shadow 200ms ease, filter 200ms ease;
  background:
    radial-gradient(circle at 18% 22%, rgba(var(--mtc-bleed),0.05) 0%, transparent 55%),
    linear-gradient(155deg, #1B1B1B 0%, #0E0E0E 100%);
  border-top: 1px solid #2A2A2A;
  border-left: 1px solid #232323;
  border-right: 1px solid #181818;
  border-bottom: 1px solid #161616;
  box-shadow: 0 20px 50px -20px rgba(0,0,0,0.7), 0 10px 24px -12px rgba(var(--mtc-bleed),0.18);
  overflow: hidden;
}
.mtc-card *, .mtc-card *::before, .mtc-card *::after { box-sizing: border-box; }

.mtc-card:hover {
  transform: scale(1.02);
  box-shadow: 0 28px 68px -22px rgba(0,0,0,0.75), 0 18px 40px -14px rgba(var(--mtc-bleed),0.40);
  filter: drop-shadow(0 0 18px rgba(var(--mtc-bleed),0.22));
}
.mtc-card:focus-visible { outline: 2px solid var(--mtc-ring); outline-offset: 3px; }

.mtc-ring {
  position: absolute; inset: -1px; border-radius: 22px; padding: 1.5px;
  background: conic-gradient(from var(--mtc-angle,0deg), transparent 60%, var(--mtc-ring) 84%, transparent 100%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;
  pointer-events: none;
  animation: mtc-spin 5.4s linear infinite;
  filter: drop-shadow(0 0 8px rgba(var(--mtc-bleed),0.45));
  z-index: 1;
}
.mtc-warm {
  position: absolute; inset: 0; border-radius: 22px; pointer-events: none; z-index: 0;
  background: radial-gradient(circle at 20% 20%, rgba(var(--mtc-bleed),0.06) 0%, transparent 55%);
}

.mtc-inner {
  position: relative; z-index: 2;
  display: grid; gap: 18px;
  padding: 22px 22px 18px;
}

.mtc-head { display: grid; grid-template-columns: 56px 1fr; gap: 14px; align-items: start; }
.mtc-head-text { display: grid; gap: 4px; min-width: 0; }
.mtc-title { font-size: 17px; font-weight: 800; letter-spacing: -0.02em; color: #fff; line-height: 1.2; }
.mtc-snippet { font-size: 13px; color: #A0A0A0; font-weight: 500; line-height: 1.45; }

/* Glyph */
.mtc-glyph-wrap { position: relative; display: inline-flex; width: 56px; height: 56px; border-radius: 16px; flex-shrink: 0;
  filter: drop-shadow(0 0 10px rgba(var(--mtc-bleed),0.30)) drop-shadow(0 0 3px rgba(var(--mtc-bleed),0.25));
}
.mtc-glyph-ring {
  position: absolute; inset: -3px; border-radius: 16px; padding: 2px;
  background: conic-gradient(from var(--mtc-angle,0deg), transparent 55%, var(--mtc-ring) 82%, transparent 100%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude;
  pointer-events: none;
  animation: mtc-spin 3.2s linear infinite;
}
.mtc-glyph { position: relative; width: 100%; height: 100%; border-radius: 16px; display: flex; align-items: center; justify-content: center;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.04);
  background: radial-gradient(circle at 30% 30%, #1a1a1a 0%, #0a0a0a 100%);
}
.mtc-glyph-text { font-family: ${MONO}; font-weight: 700; letter-spacing: -0.02em; color: #fff; font-size: 15px; text-shadow: 0 1px 2px rgba(0,0,0,0.4); }

/* Metric */
.mtc-metric { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; min-height: 44px; }
.mtc-metric-text-value { font-family: ${MONO}; font-size: 14px; font-weight: 700; color: #fff; letter-spacing: 0.02em;
  padding: 8px 14px; border-radius: 10px;
  background: rgba(var(--mtc-bleed),0.08);
  border: 1px solid rgba(var(--mtc-bleed),0.28);
}
.mtc-metric-ring { gap: 12px; }
.mtc-metric-ring-label { font-family: ${MONO}; font-size: 10px; font-weight: 700; color: #A0A0A0; letter-spacing: 0.18em; }
.mtc-metric-pills { gap: 6px; }
.mtc-pill { font-family: ${MONO}; font-size: 10px; font-weight: 700; color: #fff; letter-spacing: 0.1em; text-transform: uppercase;
  padding: 5px 10px; border-radius: 999px;
  background: rgba(var(--mtc-bleed),0.10);
  border: 1px solid rgba(var(--mtc-bleed),0.32);
}

/* Foot */
.mtc-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.06); color: var(--mtc-ring); }
.mtc-cta { font-family: ${MONO}; font-size: 10.5px; font-weight: 700; letter-spacing: 0.2em; }
.mtc-foot svg { transition: transform 200ms ${EASE}; }
.mtc-card:hover .mtc-foot svg { transform: translateX(3px); }
`;
