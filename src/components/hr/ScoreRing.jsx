import { useEffect, useState } from "react";
import { scoreBand, BAND_COLORS } from "../../lib/ats/scoreBand";

/**
 * ScoreRing — circular ATS-match indicator.
 *
 * Lifted from `pages/HRPortal.jsx` during the HR portal unification so
 * both the legacy dark portal (during its sunset window) and the new
 * `/hr/jobs/:id` pipeline render identical visuals. Token-agnostic:
 * every colour is a prop with a light-theme default, so the dark
 * portal opts in by passing its own tokens.
 *
 * Animation: stroke-dashoffset interpolates from 0 to the final
 * percentage over `duration` ms using requestAnimationFrame. No CSS
 * keyframes, no Framer Motion — keeps the bundle slim and the ring
 * usable in any surface.
 *
 * Source attribution: if `source` is null/empty the ring renders the
 * 'none' band (dashed grey) and shows "—" instead of a number, so HR
 * can distinguish "scored 0" from "never scored".
 */
export default function ScoreRing({
  score = 0,
  source = "stopgap_keyword",
  size = 76,
  strokeWidth = 4,
  duration = 800,
  trackColor = "#E7E7EE",
  strokeColor,
  textColor = "#14131F",
  labelColor = "#8A8A9B",
  font = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
}) {
  const [animScore, setAnimScore] = useState(0);
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const band = scoreBand(score, source);
  const stroke = strokeColor || BAND_COLORS[band];
  const isNone = band === "none";

  useEffect(() => {
    if (isNone) { setAnimScore(0); return; }
    let frame;
    const start = performance.now();
    const animate = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      setAnimScore(Math.round(progress * (Number(score) || 0)));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [score, duration, isNone]);

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
          strokeDasharray={isNone ? "4 4" : undefined}
        />
        {!isNone && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={circumference - (circumference * animScore) / 100}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 50ms linear" }}
          />
        )}
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: font,
        }}
      >
        <span style={{ fontSize: Math.round(size * 0.24), fontWeight: 700, color: isNone ? labelColor : textColor }}>
          {isNone ? "—" : `${animScore}%`}
        </span>
        <span style={{ fontSize: Math.round(size * 0.12), color: labelColor }}>
          {isNone ? "no score" : "match"}
        </span>
      </div>
    </div>
  );
}
