import { useState, useEffect, useRef } from "react";

// Project lon/lat → SVG viewBox coords
// Center: lon=65 (Gulf centered), lat offset=20 (vertical center), scale=280
function project(lat, lon) {
  const x = 50 + ((lon - 65) / 360) * 280;
  const y = 50 - ((lat - 20) / 180) * 280;
  return { x, y };
}

// Real Natural Earth coordinates — India
const INDIA = [
  [77.837,35.494],[78.912,34.322],[78.811,33.506],[79.209,32.994],[79.176,32.484],
  [78.458,32.618],[78.739,31.516],[79.721,30.883],[81.111,30.183],[80.477,29.730],
  [80.088,28.794],[81.057,28.416],[82.000,27.925],[83.304,27.365],[84.675,27.235],
  [85.252,26.726],[86.024,26.631],[87.227,26.398],[88.060,26.415],[88.175,26.810],
  [88.043,27.446],[88.120,27.877],[88.730,28.087],[88.814,27.299],[88.836,27.099],
  [89.745,26.719],[90.373,26.876],[91.218,26.809],[92.033,26.838],[92.104,27.453],
  [91.697,27.772],[92.503,27.897],[93.413,28.641],[94.566,29.277],[95.405,29.032],
  [96.118,29.453],[96.587,28.831],[96.249,28.411],[97.327,28.262],[97.403,27.883],
  [97.052,27.699],[97.134,27.084],[96.419,27.265],[95.125,26.574],[95.155,26.001],
  [94.603,25.162],[94.553,24.675],[94.107,23.851],[93.325,24.079],[93.286,23.044],
  [93.060,22.703],[93.166,22.278],[92.673,22.041],[92.146,23.627],[91.870,23.624],
  [91.706,22.985],[91.159,23.504],[91.468,24.073],[91.915,24.130],[92.376,24.977],
  [91.800,25.147],[90.872,25.133],[89.921,25.270],[89.832,25.965],[89.355,26.014],
  [88.563,26.447],[88.210,25.768],[88.932,25.239],[88.306,24.866],[88.084,24.502],
  [88.700,24.234],[88.530,23.631],[88.876,22.879],[89.032,22.056],[88.889,21.691],
  [88.208,21.703],[86.976,21.496],[87.033,20.743],[86.499,20.152],[85.060,19.479],
  [83.941,18.302],[83.189,17.671],[82.193,17.017],[82.191,16.557],[81.693,16.310],
  [80.792,15.952],[80.325,15.899],[80.025,15.136],[80.233,13.836],[80.286,13.006],
  [79.863,12.056],[79.858,10.357],[79.341,10.309],[78.885,9.546],[79.190,9.217],
  [78.278,8.933],[77.941,8.253],[77.540,7.966],[76.593,8.899],[76.130,10.300],
  [75.747,11.308],[75.396,11.781],[74.865,12.742],[74.616,13.992],[74.443,14.617],
  [73.534,15.991],[73.120,17.929],[72.820,19.208],[72.824,20.419],[72.630,21.356],
  [71.175,20.757],[70.470,20.877],[69.164,22.089],[70.528,22.777],[71.021,22.778],
  [70.219,23.023],[68.968,23.692],[68.177,23.857],[67.443,23.944],[67.145,24.663],
  [66.373,25.425],[64.530,25.674],[62.905,26.225],[61.813,26.830],[61.744,27.447],
  [62.755,27.378],[63.233,27.217],[63.317,27.640],[62.020,28.256],[61.656,28.778],
  [60.874,29.829],[62.549,29.318],[63.551,29.469],[64.148,29.340],[64.350,29.560],
  [65.046,29.472],[66.347,29.887],[66.381,30.738],[66.938,31.305],[67.683,31.303],
  [67.793,31.583],[68.556,31.713],[68.926,31.620],[71.117,34.733],[71.615,34.689],
  [71.498,34.348],[71.263,34.404],[70.883,33.989],[71.157,34.348],[71.115,34.733],
  [74.240,37.116],[75.758,36.798],[76.871,36.177],[77.837,35.494]
];

// UAE + Saudi Arabia + Gulf region
const UAE_SAUDI = [
  [51.579,24.245],[51.757,24.294],[51.794,24.019],[52.577,24.177],[53.404,24.151],
  [54.008,24.121],[54.693,24.797],[55.439,25.439],[56.070,26.055],[56.362,24.924],
  [56.485,24.242],[55.665,22.000],[55.208,22.708],[55.025,22.033],[52.000,23.001],
  [51.617,24.077],[51.579,24.245],
  // Saudi Arabia simplified
  [36.500,28.500],[37.480,28.000],[38.000,27.000],[39.000,26.000],[40.000,25.000],
  [41.000,24.000],[42.000,23.500],[43.000,22.500],[44.000,22.000],[45.000,21.500],
  [46.000,21.000],[47.000,20.500],[48.000,20.000],[49.000,19.500],[50.000,19.000],
  [51.000,19.500],[52.000,20.000],[55.000,22.000],[55.208,22.708],[55.025,22.033],
  [52.000,23.001],[51.617,24.077],[51.000,24.500],[50.000,25.500],[49.000,26.000],
  [48.500,27.000],[47.500,28.000],[47.000,29.000],[46.500,29.500],[45.500,30.000],
  [44.500,30.500],[43.500,31.000],[42.500,31.000],[41.500,31.000],[40.500,31.500],
  [39.500,32.000],[38.500,32.000],[37.500,31.500],[37.000,30.500],[36.500,29.500],
  [36.500,28.500]
];

// Oman simplified
const OMAN = [
  [56.362,24.924],[56.485,24.242],[57.000,23.500],[58.000,22.500],[59.000,22.000],
  [59.500,21.500],[59.800,21.000],[59.400,20.500],[58.800,20.000],[58.000,19.500],
  [57.000,19.000],[56.000,18.500],[55.000,18.000],[54.000,18.000],[53.000,17.500],
  [52.000,17.500],[51.000,18.000],[52.500,20.000],[55.000,22.000],[55.208,22.708],
  [56.070,26.055],[56.362,24.924]
];

// Qatar
const QATAR = [
  [50.800,24.754],[51.148,24.343],[51.579,24.245],[51.617,24.077],[51.000,24.500],
  [50.800,24.754]
];

// Kuwait
const KUWAIT = [
  [47.000,29.000],[47.500,28.000],[48.500,27.000],[49.000,26.000],[48.416,28.552],
  [47.708,28.526],[47.000,29.000]
];

// Iran simplified
const IRAN = [
  [44.500,39.000],[45.000,38.500],[46.000,38.000],[47.000,38.500],[48.000,38.000],
  [48.584,37.669],[49.396,37.748],[50.147,37.374],[50.843,36.872],[51.602,36.631],
  [52.191,36.700],[53.354,37.000],[54.008,37.000],[54.800,37.500],[55.512,37.964],
  [56.180,37.935],[57.330,38.029],[58.436,37.522],[59.234,37.412],[60.377,36.527],
  [61.123,36.491],[61.210,35.650],[60.803,34.404],[60.521,33.676],[60.866,32.983],
  [60.536,32.981],[60.563,31.550],[61.027,31.354],[61.778,30.928],[62.725,29.857],
  [63.000,29.500],[62.020,28.256],[63.317,27.640],[63.233,27.217],[62.755,27.378],
  [61.656,28.778],[60.874,29.829],[58.500,29.500],[57.000,29.500],[55.500,28.500],
  [54.500,27.500],[53.500,26.500],[52.500,26.000],[51.579,24.245],[51.000,24.500],
  [50.000,25.500],[49.000,26.000],[48.500,27.000],[47.500,28.000],[47.000,29.000],
  [46.500,29.500],[45.500,30.000],[44.500,30.500],[44.500,31.000],[44.500,32.500],
  [44.000,33.000],[43.500,33.500],[43.000,34.000],[42.000,37.000],[44.500,39.000]
];

// Pakistan simplified
const PAKISTAN = [
  [61.027,31.354],[60.803,34.404],[61.210,35.650],[61.123,36.491],[60.377,36.527],
  [59.234,37.412],[58.436,37.522],[57.330,38.029],[56.180,37.935],[55.512,37.964],
  [54.800,37.500],[54.008,37.000],[53.354,37.000],[52.191,36.700],[51.602,36.631],
  [50.843,36.872],[50.147,37.374],[49.396,37.748],[48.584,37.669],[48.000,38.000],
  [47.000,38.500],[46.000,38.000],[45.000,38.500],[44.500,39.000],[44.500,40.000],
  [46.000,41.000],[47.000,42.000],[66.501,37.362],[67.830,37.144],[68.136,37.023],
  [68.859,37.344],[71.260,36.074],[71.498,34.348],[71.615,34.689],[71.117,34.733],
  [68.926,31.620],[68.556,31.713],[67.793,31.583],[67.683,31.303],[66.938,31.305],
  [66.381,30.738],[66.347,29.887],[65.046,29.472],[64.350,29.560],[64.148,29.340],
  [63.551,29.469],[62.549,29.318],[60.874,29.829],[61.027,31.354]
];

// Afghanistan simplified
const AFGHANISTAN = [
  [61.027,31.354],[60.803,34.404],[61.210,35.650],[61.123,36.491],[62.230,35.270],
  [63.000,35.000],[64.000,36.000],[65.000,37.000],[66.501,37.362],[68.859,37.344],
  [68.136,37.023],[67.830,37.144],[66.501,37.362],[65.000,37.000],[64.000,36.000],
  [63.000,35.000],[62.230,35.270],[61.123,36.491],[60.377,36.527],[59.234,37.412],
  [58.436,37.522],[57.330,38.029],[56.180,37.935],[55.512,37.964],[54.800,37.500],
  [62.549,29.318],[61.027,31.354]
];

function toSVGPath(coords) {
  if (!coords || coords.length < 3) return "";
  const pts = coords.map(([lat, lon]) => {
    const { x, y } = project(lat, lon);
    const svgX = (x / 100) * 380;
    const svgY = (y / 100) * 380;
    return `${svgX},${svgY}`;
  });
  return "M " + pts.join(" L ") + " Z";
}

const CITIES = [
  { name: "Dubai", lat: 25.2, lon: 55.27, rings: 3, bright: true },
  { name: "Mumbai", lat: 19.07, lon: 72.87, rings: 2 },
  { name: "Delhi", lat: 28.61, lon: 77.20, rings: 2 },
  { name: "Doha", lat: 25.29, lon: 51.53, rings: 1 },
  { name: "Muscat", lat: 23.59, lon: 58.39, rings: 1 },
];

const ARC_ROUTES = [
  { from: { lat: 19.07, lon: 72.87 }, to: { lat: 25.2, lon: 55.27 } },
  { from: { lat: 28.61, lon: 77.20 }, to: { lat: 25.2, lon: 55.27 } },
  { from: { lat: 25.2, lon: 55.27 }, to: { lat: 25.29, lon: 51.53 } },
  { from: { lat: 25.2, lon: 55.27 }, to: { lat: 23.59, lon: 58.39 } },
];

function GlobeComponent() {
  const [angle, setAngle] = useState(0);
  const rafRef = useRef(null);

  useEffect(() => {
    let start = null;
    const animate = (ts) => {
      if (!start) start = ts;
      const elapsed = ts - start;
      setAngle(Math.sin(elapsed / 4000) * 12);
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const countries = [INDIA, UAE_SAUDI, OMAN, IRAN, PAKISTAN, QATAR, KUWAIT];

  return (
    <svg
      width="340"
      height="340"
      viewBox="0 0 380 380"
      xmlns="http://www.w3.org/2000/svg"
      style={{ transform: `rotate(${angle}deg)`, transition: "transform 0.05s linear" }}
    >
      <defs>
        <radialGradient id="globeBg" cx="38%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#1c1c1c" />
          <stop offset="60%" stopColor="#0a0a0a" />
          <stop offset="100%" stopColor="#030303" />
        </radialGradient>
        <clipPath id="globeClip">
          <circle cx="190" cy="190" r="168" />
        </clipPath>
        <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(139,92,246,0.15)" />
          <stop offset="100%" stopColor="rgba(139,92,246,0)" />
        </radialGradient>
      </defs>

      {/* Globe background */}
      <circle cx="190" cy="190" r="168" fill="url(#globeBg)" />

      {/* Ambient glow */}
      <circle cx="190" cy="190" r="168" fill="url(#glowGrad)" clipPath="url(#globeClip)" />

      {/* Countries */}
      <g clipPath="url(#globeClip)" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.35)" strokeWidth="0.6" strokeLinejoin="round">
        {countries.map((country, i) => (
          <path key={i} d={toSVGPath(country)} />
        ))}
      </g>

      {/* Arc routes */}
      <g clipPath="url(#globeClip)">
        {ARC_ROUTES.map((route, i) => {
          const from = project(route.from.lat, route.from.lon);
          const to = project(route.to.lat, route.to.lon);
          const fx = (from.x / 100) * 380;
          const fy = (from.y / 100) * 380;
          const tx = (to.x / 100) * 380;
          const ty = (to.y / 100) * 380;
          const mx = (fx + tx) / 2;
          const my = Math.min(fy, ty) - 25;
          return (
            <path
              key={i}
              d={`M ${fx},${fy} Q ${mx},${my} ${tx},${ty}`}
              fill="none"
              stroke="rgba(139,92,246,0.5)"
              strokeWidth="1"
              strokeDasharray="3 4"
              style={{
                animation: `arcflow ${2 + i * 0.3}s linear infinite`,
              }}
            />
          );
        })}
      </g>

      {/* City dots */}
      <g clipPath="url(#globeClip)">
        {CITIES.map((city, i) => {
          const { x, y } = project(city.lat, city.lon);
          const cx = (x / 100) * 380;
          const cy2 = (y / 100) * 380;
          return (
            <g key={i}>
              {city.rings >= 3 && (
                <circle cx={cx} cy={cy2} r="12" fill="none" stroke="rgba(139,92,246,0.2)" strokeWidth="1" />
              )}
              {city.rings >= 2 && (
                <circle cx={cx} cy={cy2} r="7" fill="none" stroke="rgba(139,92,246,0.4)" strokeWidth="1" />
              )}
              <circle cx={cx} cy={cy2} r={city.bright ? 4 : 2.5} fill={city.bright ? "#a78bfa" : "rgba(255,255,255,0.8)"} />
              <text
                x={cx + 7}
                y={cy2 + 4}
                fontSize="9"
                fill="rgba(255,255,255,0.7)"
                fontFamily="sans-serif"
                fontWeight="500"
              >
                {city.name}
              </text>
            </g>
          );
        })}
      </g>

      {/* Globe border */}
      <circle cx="190" cy="190" r="168" fill="none" stroke="#252525" strokeWidth="1.5" />
      <circle cx="190" cy="190" r="166" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />

      <style>{`
        @keyframes arcflow { to { stroke-dashoffset: -20; } }
        path[stroke="rgba(139,92,246,0.5)"] { stroke-dashoffset: 0; }
      `}</style>
    </svg>
  );
}

export default function LandingGlobe({ isMobile, onLogin, onSignup, setPage }) {
  const [theme, setTheme] = useState("dark");

  const isDark = theme === "dark";

  const bg = isDark ? "#0a0a0a" : "#f8f8f8";
  const text = isDark ? "#ffffff" : "#0a0a0a";
  const muted = isDark ? "#888" : "#666";
  const cardBg = isDark ? "#141414" : "#ffffff";
  const border = isDark ? "#222" : "#e5e5e5";
  const navBg = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)";
  const navBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";

  return (
    <div style={{ background: bg, minHeight: "100vh", color: text, fontFamily: "'Inter', sans-serif", overflowX: "hidden" }}>

      {/* TUBELIGHT NAV */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 40px", height: "64px",
        background: isDark ? "rgba(10,10,10,0.8)" : "rgba(248,248,248,0.8)",
        backdropFilter: "blur(20px)",
        borderBottom: `1px solid ${navBorder}`,
      }}>
        {/* Logo */}
        <div
          onClick={() => setPage && setPage("landing")}
          style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
        >
          <img src="/images/falcon-icon.png" alt="CVPassport" style={{ height: "32px", width: "auto" }} />
          <span style={{
            fontSize: "18px", fontWeight: "800", letterSpacing: "-0.5px",
            background: "linear-gradient(135deg, #a78bfa, #7c3aed)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>CVPassport</span>
        </div>

        {/* Nav links */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px",
          background: navBg, border: `1px solid ${navBorder}`,
          borderRadius: "100px", padding: "6px 16px", backdropFilter: "blur(12px)" }}>
          {["Templates", "ATS Check", "Pricing"].map(item => (
            <button key={item} style={{
              background: "none", border: "none", color: muted,
              fontSize: "13px", fontWeight: "500", padding: "6px 14px",
              borderRadius: "100px", cursor: "pointer",
              transition: "all 0.2s",
            }}>{item}</button>
          ))}
        </div>

        {/* Right actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Theme toggle */}
          <button onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} style={{
            background: navBg, border: `1px solid ${navBorder}`,
            borderRadius: "50%", width: "36px", height: "36px",
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", fontSize: "16px",
          }}>
            {isDark ? "☀️" : "🌙"}
          </button>
          <button onClick={onLogin} style={{
            background: "transparent", border: `1px solid ${border}`,
            color: text, borderRadius: "8px", padding: "8px 18px",
            fontSize: "13px", fontWeight: "600", cursor: "pointer",
          }}>Sign In</button>
          <button onClick={onSignup} style={{
            background: "linear-gradient(135deg, #7c3aed, #a78bfa)",
            border: "none", color: "#fff", borderRadius: "8px",
            padding: "8px 18px", fontSize: "13px", fontWeight: "700",
            cursor: "pointer", boxShadow: "0 4px 20px rgba(124,58,237,0.3)",
          }}>Get Started</button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section style={{
        minHeight: "100vh", display: "flex", alignItems: "center",
        padding: "80px 80px 60px", gap: "60px",
        maxWidth: "1300px", margin: "0 auto",
      }}>
        {/* Left — headline + CTAs */}
        <div style={{ flex: 1, maxWidth: "560px" }}>
          {/* Badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.3)",
            borderRadius: "100px", padding: "6px 16px", marginBottom: "28px",
          }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#a78bfa", display: "inline-block" }}></span>
            <span style={{ fontSize: "12px", fontWeight: "600", color: "#a78bfa", letterSpacing: "0.5px" }}>
              AE Built for Gulf Job Seekers
            </span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: isMobile ? "36px" : "58px", fontWeight: "900",
            lineHeight: "1.05", letterSpacing: "-2px", marginBottom: "20px",
          }}>
            Your Resume is your{" "}
            <span style={{
              background: "linear-gradient(135deg, #a78bfa 0%, #f59e0b 50%, #a78bfa 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              backgroundSize: "200% auto",
              animation: "shimmer 3s linear infinite",
            }}>passport</span>
            {" "}to the Gulf
          </h1>

          {/* Subheadline */}
          <p style={{
            fontSize: "17px", color: muted, lineHeight: "1.7",
            marginBottom: "36px", maxWidth: "440px",
          }}>
            ATS-optimised resumes built for UAE, Saudi & GCC job markets.
            Free to build. Free to download.
          </p>

          {/* Gradient pills */}
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "36px" }}>
            {[
              { label: "Build my CV →", gradient: "linear-gradient(135deg, #7c3aed, #a78bfa)", color: "#fff" },
              { label: "Browse templates", gradient: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", color: muted, border: `1px solid ${border}` },
              { label: "Upload my CV ↑", gradient: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", color: muted, border: `1px solid ${border}` },
            ].map((pill, i) => (
              <button
                key={i}
                onClick={i === 0 ? onSignup : undefined}
                style={{
                  background: pill.gradient,
                  border: pill.border || "none",
                  color: pill.color,
                  borderRadius: "100px",
                  padding: "12px 24px",
                  fontSize: "14px",
                  fontWeight: "700",
                  cursor: "pointer",
                  boxShadow: i === 0 ? "0 4px 24px rgba(124,58,237,0.35)" : "none",
                  transition: "all 0.2s",
                }}
              >
                {pill.label}
              </button>
            ))}
          </div>

          {/* Trust bar */}
          <div style={{ display: "flex", alignItems: "center", gap: "20px", fontSize: "12px", color: muted }}>
            <span>⭐ 4.8 / 5</span>
            <span style={{ color: border }}>|</span>
            <span>Used by <strong style={{ color: text }}>2,400+</strong> Gulf job seekers</span>
            <span style={{ color: border }}>|</span>
            <span>ATS-tested for <strong style={{ color: text }}>UAE banks</strong></span>
          </div>
        </div>

        {/* Right — Globe */}
        <div style={{ flex: "0 0 auto", display: "flex", justifyContent: "center", alignItems: "center", position: "relative" }}>
          {/* Glow behind globe */}
          <div style={{
            position: "absolute", width: "400px", height: "400px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />
          <GlobeComponent />
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: "80px 80px", maxWidth: "1300px", margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: "60px" }}>
          <p style={{ fontSize: "12px", fontWeight: "700", letterSpacing: "2px", color: "#a78bfa", marginBottom: "12px", textTransform: "uppercase" }}>
            HOW IT WORKS
          </p>
          <h2 style={{ fontSize: "40px", fontWeight: "800", letterSpacing: "-1px" }}>
            Your Gulf-ready CV in 3 steps
          </h2>
          <p style={{ color: muted, fontSize: "16px", marginTop: "12px" }}>
            No design skills needed. Built for UAE, Saudi, and India job markets.
          </p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px" }}>
          {[
            { step: "01", icon: "📝", title: "Fill your details", desc: "Name, experience, skills, education. Takes 5 minutes." },
            { step: "02", icon: "🎨", title: "Choose your template", desc: "11 templates designed for Gulf employers and ATS systems." },
            { step: "03", icon: "⬇️", title: "Download & apply", desc: "PDF download. ATS-optimised. WhatsApp-ready." },
          ].map((item) => (
            <div key={item.step} style={{
              background: cardBg, border: `1px solid ${border}`,
              borderRadius: "16px", padding: "32px", textAlign: "center",
            }}>
              <div style={{
                width: "56px", height: "56px", borderRadius: "16px",
                background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: "24px", margin: "0 auto 16px",
              }}>{item.icon}</div>
              <p style={{ fontSize: "11px", fontWeight: "700", letterSpacing: "1px", color: "#a78bfa", marginBottom: "8px" }}>STEP {item.step}</p>
              <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "10px" }}>{item.title}</h3>
              <p style={{ color: muted, fontSize: "14px", lineHeight: "1.6" }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        borderTop: `1px solid ${border}`, padding: "40px 80px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        maxWidth: "1300px", margin: "0 auto",
      }}>
        <span style={{ fontSize: "14px", color: muted }}>© 2026 CVPassport. Built for Gulf job seekers.</span>
        <div style={{ display: "flex", gap: "24px" }}>
          {["Privacy", "Terms", "Contact"].map(item => (
            <span key={item} style={{ fontSize: "13px", color: muted, cursor: "pointer" }}>{item}</span>
          ))}
        </div>
      </footer>

      <style>{`
        @keyframes shimmer { 0% { background-position: 0% center; } 100% { background-position: 200% center; } }
        @keyframes arcflow { to { stroke-dashoffset: -20; } }
      `}</style>
    </div>
  );
}