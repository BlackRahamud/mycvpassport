import { useState, useEffect, useRef } from "react";

// Lat/long to viewBox coords (100x100 circle, center 50,50, r~48)
function project(lat, lon) {
  const x = 50 + ((lon - 55) / 360) * 96;
  const y = 50 - (lat / 180) * 96;
  return { x, y };
}

const CITIES = [
  { name: "Dubai", lat: 25.2, lon: 55.3 },
  { name: "Mumbai", lat: 19.0, lon: 72.8 },
  { name: "Delhi", lat: 28.6, lon: 77.2 },
  { name: "Doha", lat: 25.3, lon: 51.5 },
  { name: "Muscat", lat: 23.6, lon: 58.6 },
];

const CITY_COORDS = CITIES.map((c) => ({ ...c, ...project(c.lat, c.lon) }));

// Simplified continent outline path (single path, rough world) at 15% opacity
const CONTINENT_PATH =
  "M 20 35 L 25 32 L 30 35 L 35 30 L 45 32 L 55 28 L 65 30 L 75 35 L 78 42 L 72 50 L 65 55 L 55 58 L 45 55 L 38 60 L 30 58 L 22 52 L 18 45 Z M 15 50 L 22 55 L 28 62 L 25 72 L 18 78 L 12 70 L 10 58 Z M 75 45 L 82 52 L 88 48 L 92 55 L 90 65 L 82 72 L 75 68 L 72 58 Z";

// Arc paths between city pairs (quadratic curves) - Dubai-Mumbai, Dubai-Riyadh, Dubai-Doha, Dubai-Muscat, Mumbai-Riyadh, etc.
function getArcPath(x1, y1, x2, y2) {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const perpX = -dy * 0.3;
  const perpY = dx * 0.3;
  const cx = mx + perpX;
  const cy = my + perpY;
  return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
}

const ARCS = [
  [0, 1], // Dubai → Mumbai
  [0, 2], // Dubai → Delhi
  [0, 3], // Dubai → Doha
  [0, 4], // Dubai → Muscat
  [1, 2], // Mumbai → Delhi
];

export default function LandingGlobe({ isMobile }) {
  const svgRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const noAnimations = isMobile || !mounted;

  return (
    <div
      className="landing-globe-wrap"
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 420,
        aspectRatio: "1",
        margin: "0 auto",
      }}
    >
      <svg
        ref={svgRef}
        viewBox="0 0 100 100"
        className={noAnimations ? "landing-globe-static" : "landing-globe-rotate"}
        style={{
          width: "100%",
          height: "100%",
          overflow: "visible",
          filter: noAnimations ? "none" : "none",
        }}
      >
        <defs>
          <radialGradient id="globeGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#1a1a1a" />
            <stop offset="70%" stopColor="#0d0d0d" />
            <stop offset="100%" stopColor="#050505" />
          </radialGradient>
          <clipPath id="globeClip">
            <circle cx="50" cy="50" r="48" />
          </clipPath>
        </defs>
        <circle
          cx="50"
          cy="50"
          r="48"
          fill="url(#globeGrad)"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="0.5"
        />
        <g clipPath="url(#globeClip)">
          <path
            d={CONTINENT_PATH}
            fill="none"
            stroke="rgba(255,255,255,0.15)"
            strokeWidth="0.4"
            strokeLinejoin="round"
          />
          {ARCS.map(([i, j], idx) => {
            const a = CITY_COORDS[i];
            const b = CITY_COORDS[j];
            const d = getArcPath(a.x, a.y, b.x, b.y);
            return (
              <g key={idx}>
                <path
                  d={d}
                  fill="none"
                  stroke="rgba(255,255,255,0.35)"
                  strokeWidth="0.35"
                  strokeDasharray="2 1.5"
                  strokeLinecap="round"
                />
                {!noAnimations && (
                  <circle r="1.2" fill="rgba(255,255,255,0.95)">
                    <animateMotion
                      dur="4s"
                      repeatCount="indefinite"
                      path={d}
                      key={idx}
                    />
                  </circle>
                )}
              </g>
            );
          })}
          {CITY_COORDS.map((city) => (
            <g key={city.name}>
              {city.name === "Dubai" ? (
                <>
                  <circle cx={city.x} cy={city.y} r="3.5" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
                  <circle cx={city.x} cy={city.y} r="2.5" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />
                  <circle cx={city.x} cy={city.y} r="1.2" fill="rgba(255,255,255,1)" />
                </>
              ) : (
                <>
                  <circle cx={city.x} cy={city.y} r="2.5" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="0.4" />
                  <circle cx={city.x} cy={city.y} r="0.9" fill="rgba(255,255,255,0.9)" />
                </>
              )}
              <text
                x={city.x + 3}
                y={city.y + 0.5}
                fontSize="3.2"
                fill="rgba(255,255,255,0.6)"
                fontFamily="system-ui, sans-serif"
                dominantBaseline="middle"
                textAnchor="start"
              >
                {city.name}
              </text>
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
