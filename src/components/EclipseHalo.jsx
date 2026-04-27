import React from "react";

/**
 * EclipseHalo — solid black disc with a uniform glowing corona around the
 * entire circumference. NO progress arc, NO start/end caps, NO rotation.
 * Like a solar eclipse: the disc occults a band of light.
 *
 * Replaces the earlier ScannerRing (which had a visible 0%→score% fill,
 * called out as a regression). Pulse animates the OUTER glow only — the
 * disc and ring stay solid so the score number never dims.
 *
 * Layers, bottom to top:
 *   1. Outer pulsing glow — 3 layers of CSS box-shadow at 20px / 40px /
 *      80px blur, decreasing alpha. Animates opacity 0.7 → 1 → 0.7 over
 *      3 s ease-in-out infinite.
 *   2. SVG circle stroke + feGaussianBlur — adds a soft halo that
 *      extends ~6 px outward from the ring edge. Bridges the gap between
 *      the sharp ring and the box-shadow corona.
 *   3. Solid black disc with a 3 px ring border in band color, plus an
 *      inset shadow for depth. Score + SCORE label + status sit inside.
 *
 * 4 color bands per spec:
 *   >= 85 → emerald  #10b981 → "Market Ready"
 *   70-84 → amber    #f59e0b → "Solid Foundation"
 *   60-69 → orange   #f97316 → "Almost There"
 *   <  60 → red      #ef4444 → "Needs Work"
 *
 * prefers-reduced-motion: outer glow stops pulsing, otherwise unchanged.
 */

const BANDS = [
  { min: 85, hex: "#10b981", name: "emerald", status: "Market Ready",     headline: "Your CV is Market Ready" },
  { min: 70, hex: "#f59e0b", name: "amber",   status: "Solid Foundation", headline: "Your Foundation is Solid" },
  { min: 60, hex: "#f97316", name: "orange",  status: "Almost There",     headline: "Your Foundation is Forming" },
  { min: 0,  hex: "#ef4444", name: "red",     status: "Needs Work",       headline: "Your CV Needs Work" },
];

export function getBand(score) {
  for (const b of BANDS) {
    if (score >= b.min) return b;
  }
  return BANDS[BANDS.length - 1];
}

/**
 * Points to the next band ceiling — what the user can climb toward.
 *   score 50 → +10 (to 60)
 *   score 65 → +5  (to 70)
 *   score 70 → +15 (to 85)
 *   score 90 → +10 (to 100, ceiling)
 */
export function pointsToNextBand(score) {
  if (score < 60) return 60 - score;
  if (score < 70) return 70 - score;
  if (score < 85) return 85 - score;
  return Math.max(0, 100 - score);
}

export function withAlpha(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function EclipseHalo({ score = 0, size = 260 }) {
  const safeScore = Math.max(0, Math.min(100, Math.round(score)));
  const band = getBand(safeScore);
  const ringWidth = 3;
  const numSize = size * 0.32;
  const labelSize = Math.max(10, size * 0.046);
  const statusSize = Math.max(11, size * 0.057);
  const filterId = `cvp-eclipse-blur-${band.name}`;

  return (
    <div
      role="img"
      aria-label={`Score ${safeScore} out of 100, ${band.status.toLowerCase()}`}
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "inline-block",
        flexShrink: 0,
      }}
    >
      <style>{`
        @keyframes cvp-eclipse-pulse {
          0%, 100% { opacity: 0.7; }
          50%      { opacity: 1; }
        }
        .cvp-eclipse-glow { animation: cvp-eclipse-pulse 3s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .cvp-eclipse-glow { animation: none !important; opacity: 0.85 !important; }
        }
      `}</style>

      {/* (1) Outer pulsing glow — three CSS box-shadow layers at 20/40/80 px */}
      <div
        className="cvp-eclipse-glow"
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          boxShadow: `
            0 0 20px ${withAlpha(band.hex, 0.7)},
            0 0 40px ${withAlpha(band.hex, 0.45)},
            0 0 80px ${withAlpha(band.hex, 0.22)}
          `,
          pointerEvents: "none",
        }}
      />

      {/* (2) SVG soft-glow ring via feGaussianBlur — bridges sharp ring → corona */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
        style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
      >
        <defs>
          <filter id={filterId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
          </filter>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={(size - ringWidth) / 2}
          fill="none"
          stroke={band.hex}
          strokeWidth={ringWidth + 2}
          filter={`url(#${filterId})`}
          opacity="0.55"
        />
      </svg>

      {/* (3) Solid black disc with a 3 px ring border at the edge */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          background: "#000000",
          border: `${ringWidth}px solid ${band.hex}`,
          boxShadow: `
            0 0 14px ${withAlpha(band.hex, 0.55)},
            inset 0 0 24px ${withAlpha(band.hex, 0.18)}
          `,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            fontFamily: "'Inter', 'DM Sans', sans-serif",
            fontSize: numSize,
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: -numSize * 0.04,
            color: band.hex,
            fontVariantNumeric: "tabular-nums",
            textShadow: `0 0 16px ${withAlpha(band.hex, 0.55)}`,
          }}
        >
          {safeScore}
        </div>
        <div
          style={{
            fontSize: labelSize,
            color: "#A0A0A0",
            marginTop: size * 0.025,
            letterSpacing: labelSize * 0.27,
            textTransform: "uppercase",
            fontWeight: 700,
          }}
        >
          SCORE
        </div>
        <div
          style={{
            fontSize: statusSize,
            color: band.hex,
            marginTop: 4,
            fontWeight: 700,
          }}
        >
          {band.status}
        </div>
      </div>
    </div>
  );
}
