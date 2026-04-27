import React, { useEffect, useState } from "react";

/**
 * ScannerRing — OLED-style score badge with rotating scanner arc + glow pulse.
 *
 * Layers, bottom to top:
 *   1. Pulsing glow halo (separate underlay, animates opacity 0.55 → 1)
 *   2. Track ring (full circle stroke at 8% alpha of band color)
 *   3. Progress arc (animates from 0 to score% via stroke-dashoffset, 1.2s ease-out)
 *   4. Scanner sweep (conic-gradient ring rotating 360° per 4s with bright leading edge)
 *   5. Center number + custom label
 *
 * Color bands (per spec):
 *   >= 85 → #10b981 emerald
 *   60-84 → #f59e0b amber
 *   <  60 → #ef4444 red
 *
 * prefers-reduced-motion: scanner stops rotating, glow stops pulsing,
 * progress fills instantly. Static ring still renders in band colour.
 *
 * Sister component to src/components/landing/OLEDScoreRing.jsx — that
 * one is used on the landing-page how-it-works section and has slightly
 * different thresholds and no track ring. Don't merge them; the visual
 * languages diverge intentionally.
 */

const DEFAULT_SIZE = 220;
const STROKE = 14;

export function getBand(score) {
  if (score == null || Number.isNaN(score)) {
    return { hex: "#ef4444", label: "Needs work" };
  }
  if (score >= 85) return { hex: "#10b981", label: "Market ready" };
  if (score >= 60) return { hex: "#f59e0b", label: "On track" };
  return { hex: "#ef4444", label: "Needs work" };
}

export function withAlpha(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function ScannerRing({
  score = 0,
  size = DEFAULT_SIZE,
  showLabel = true,
  topLabel = "HEALTH",
  duration = 1200,
  reveal = true,
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!reveal) {
      setDisplay(score);
      return;
    }
    let cancelled = false;
    let raf;
    let start = null;
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const step = (now) => {
      if (cancelled) return;
      if (start == null) start = now;
      const t = Math.min(1, (now - start) / duration);
      setDisplay(Math.round(ease(t) * score));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [score, reveal, duration]);

  const band = getBand(display);
  const fontSize = size * 0.32;
  const labelSize = Math.max(10, size * 0.05);
  const verdictSize = Math.max(11, size * 0.058);
  const radius = (size - STROKE) / 2;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (display / 100) * circumference;
  const trackColor = withAlpha(band.hex, 0.08);
  const glowAlpha = 0.45;
  const dropShadow = `drop-shadow(0 0 12px ${withAlpha(band.hex, glowAlpha)})`;

  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        display: "inline-block",
      }}
      role="img"
      aria-label={`${topLabel} score ${score} out of 100, ${band.label.toLowerCase()}`}
    >
      <style>{`
        @property --scanner-angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        @keyframes cvp-scanner-spin { to { --scanner-angle: 360deg; } }
        @keyframes cvp-scanner-glow {
          0%, 100% { opacity: 0.55; }
          50%      { opacity: 1; }
        }
        .cvp-scanner-arc { animation: cvp-scanner-spin 4s linear infinite; }
        .cvp-scanner-glow { animation: cvp-scanner-glow 2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .cvp-scanner-arc, .cvp-scanner-glow { animation: none !important; }
          .cvp-scanner-glow { opacity: 1 !important; }
          .cvp-scanner-progress { transition: none !important; }
        }
      `}</style>

      {/* (1) Pulsing glow halo — separate from the ring so opacity animation
              doesn't dim the inner content. Sits underneath everything. */}
      <div
        className="cvp-scanner-glow"
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          boxShadow: `0 0 28px 4px ${withAlpha(band.hex, 0.55)}`,
          pointerEvents: "none",
        }}
      />

      {/* (2) + (3) Track ring + animated progress arc — SVG */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          filter: dropShadow,
        }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={STROKE}
        />
        <circle
          className="cvp-scanner-progress"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={band.hex}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={progressOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: "stroke-dashoffset 60ms linear, stroke 200ms ease" }}
        />
      </svg>

      {/* (4) Rotating scanner arc — 360° per 4s with bright leading edge.
              Uses the same conic-gradient + ring-mask trick as the rest of
              the app, sitting on top of the SVG so it sweeps over the
              progress fill. The arc width is ~36° (transparent 70% → band
              90% → transparent 100%) which reads as a 90°-ish glowing tail
              once the leading-edge bloom is factored in. */}
      <div
        className="cvp-scanner-arc"
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          padding: STROKE - 2,
          background: `conic-gradient(from var(--scanner-angle, 0deg), transparent 70%, ${withAlpha(band.hex, 0.6)} 88%, ${band.hex} 100%)`,
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          pointerEvents: "none",
          filter: `drop-shadow(0 0 8px ${withAlpha(band.hex, 0.7)})`,
        }}
      />

      {/* (5) Centre number + label */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            fontFamily: "'Inter', 'DM Sans', sans-serif",
            fontSize,
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: -fontSize * 0.04,
            color: band.hex,
            fontVariantNumeric: "tabular-nums",
            textShadow: `0 0 16px ${withAlpha(band.hex, 0.4)}`,
            transition: "color 200ms ease",
          }}
        >
          {display}
        </div>
        {showLabel && (
          <>
            <div
              style={{
                fontSize: labelSize,
                color: "#A0A0A0",
                marginTop: size * 0.022,
                letterSpacing: labelSize * 0.27,
                textTransform: "uppercase",
                fontWeight: 700,
              }}
            >
              {topLabel}
            </div>
            <div
              style={{
                fontSize: verdictSize,
                color: band.hex,
                marginTop: 3,
                fontWeight: 700,
                transition: "color 200ms ease",
              }}
            >
              {band.label}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
