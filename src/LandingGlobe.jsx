import { useState, useEffect, useRef } from "react";
import { Warp } from "@paper-design/shaders-react";
import { Helmet } from 'react-helmet-async';
import React from 'react';

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

function AnimatedCVCard() {
  const [visibleLines, setVisibleLines] = React.useState(0);

  React.useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      current += 1;
      setVisibleLines(current);
      if (current >= 12) {
        setTimeout(() => {
          setVisibleLines(0);
          current = 0;
        }, 2500);
      }
    }, 180);
    return () => clearInterval(interval);
  }, []);

  const lines = [
    { w: '70%', opacity: 1, dark: true },
    { w: '45%', opacity: 0.6, dark: false },
    { w: '30%', opacity: 0.4, dark: false },
    { w: '100%', opacity: 0, dark: false, divider: true },
    { w: '40%', opacity: 0.5, dark: true },
    { w: '90%', opacity: 0.3, dark: false },
    { w: '75%', opacity: 0.3, dark: false },
    { w: '60%', opacity: 0.3, dark: false },
    { w: '100%', opacity: 0, dark: false, divider: true },
    { w: '40%', opacity: 0.5, dark: true },
    { w: '80%', opacity: 0.3, dark: false },
    { w: '55%', opacity: 0.3, dark: false },
  ];

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '16px',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '20px',
        paddingBottom: '16px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{
          width: '42px',
          height: '42px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #ea580c, #c2410c)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          fontWeight: '700',
          color: '#fff',
          flexShrink: 0,
        }}>A</div>
        <div>
          <div style={{
            fontSize: '14px',
            fontWeight: '600',
            opacity: visibleLines >= 1 ? 1 : 0,
            transition: 'opacity 0.4s ease',
          }}>Ahmed Al Mansouri</div>
          <div style={{
            fontSize: '12px',
            opacity: visibleLines >= 2 ? 0.5 : 0,
            transition: 'opacity 0.4s ease',
            marginTop: '2px',
          }}>Sales Executive · Dubai, UAE</div>
        </div>
      </div>

      {lines.map((line, i) => (
        line.divider ? (
          <div key={i} style={{
            height: '1px',
            background: 'rgba(255,255,255,0.06)',
            margin: '12px 0',
            opacity: visibleLines > i ? 1 : 0,
            transition: 'opacity 0.3s ease',
          }} />
        ) : (
          <div key={i} style={{
            height: '8px',
            borderRadius: '4px',
            background: line.dark ? 'rgba(234,88,12,0.4)' : 'rgba(255,255,255,0.08)',
            width: line.w,
            marginBottom: '8px',
            opacity: visibleLines > i ? (line.opacity || 0.3) : 0,
            transition: 'opacity 0.4s ease',
          }} />
        )
      ))}

      {visibleLines >= 12 && (
        <div style={{
          marginTop: '16px',
          padding: '10px 16px',
          background: 'rgba(37,211,102,0.1)',
          border: '1px solid rgba(37,211,102,0.25)',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '12px',
          color: '#25d366',
          animation: 'cvLineIn 0.4s ease forwards',
        }}>
          <span style={{ fontSize: '16px' }}>📲</span>
          Share on WhatsApp — ready in 60 sec
        </div>
      )}

      {visibleLines < 12 && (
        <div style={{
          position: 'absolute',
          bottom: '16px',
          right: '16px',
          fontSize: '11px',
          opacity: 0.4,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <div style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: '#ea580c',
          }} />
          Building...
        </div>
      )}
    </div>
  );
}

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
          <stop offset="0%" stopColor="rgba(255,255,255,0.15)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
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
              stroke="rgba(255,255,255,0.5)"
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
                <circle cx={cx} cy={cy2} r="12" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
              )}
              {city.rings >= 2 && (
                <circle cx={cx} cy={cy2} r="7" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
              )}
              <circle cx={cx} cy={cy2} r={city.bright ? 4 : 2.5} fill={city.bright ? "#ffffff" : "rgba(255,255,255,0.8)"} />
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
        path[stroke="rgba(255,255,255,0.5)"] { stroke-dashoffset: 0; }
      `}</style>
    </svg>
  );
}

export default function LandingGlobe({ isMobile, onLogin, onSignup, setPage, onWalkIn }) {
  return (
    <div style={{ background: "#0a0a0a", minHeight: "100vh", color: "#ffffff", fontFamily: "'Inter', sans-serif", overflowX: "hidden" }}>
      <Helmet>
        <title>CVPassport — Build ATS-Friendly Resumes for UAE & Gulf Jobs</title>
        <meta name="description" content="Build ATS-optimised resumes for UAE, Saudi Arabia and GCC job markets. Free templates, ATS score checker, and Walk-In CV builder for Gulf job seekers." />
        <meta name="keywords" content="resume builder UAE, CV builder Dubai, ATS resume Gulf, Gulf job CV, Saudi Arabia resume, GCC job seeker, Indian expat CV Dubai" />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="CVPassport" />
        <link rel="canonical" href="https://mycvpassport.com" />
        <meta property="og:title" content="CVPassport — ATS-Friendly Resume Builder for Gulf Jobs" />
        <meta property="og:description" content="Free resume builder for UAE, Saudi & GCC job markets. ATS score checker, 11 professional templates, Walk-In CV mode." />
        <meta property="og:url" content="https://mycvpassport.com" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://mycvpassport.com/images/falcon-icon.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="CVPassport — Resume Builder for Gulf Jobs" />
        <meta name="twitter:description" content="ATS-optimised CVs for UAE, Saudi & GCC. Free to build, free to download." />
        <meta name="twitter:image" content="https://mycvpassport.com/images/falcon-icon.png" />
      </Helmet>
      
      {/* FIXED NAVIGATION BAR */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 60px", height: "64px",
        background: "rgba(10,10,10,0.9)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid #222222",
      }}>
        {/* Logo */}
        <div onClick={() => setPage && setPage("landing")} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
          <img src="/images/falcon-icon.png" alt="CVPassport" style={{ height: "32px", width: "auto" }} />
          <span style={{
            fontSize: "18px", fontWeight: "800", letterSpacing: "-0.5px",
            background: "linear-gradient(135deg, #ffffff, #ffffff)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>CVPassport</span>
        </div>

        {/* Center nav links */}
        <div style={{
          display: "flex", alignItems: "center", gap: "8px",
          background: "rgba(255,255,255,0.05)", border: "1px solid #222222",
          borderRadius: "100px", padding: "6px 16px", backdropFilter: "blur(12px)"
        }}>
          {["Templates", "ATS Check", "Pricing"].map(item => (
            <button key={item} style={{
              background: "none", border: "none", color: "#888888",
              fontSize: "13px", fontWeight: "500", padding: "6px 14px",
              borderRadius: "100px", cursor: "pointer",
              transition: "all 0.2s",
            }}>{item}</button>
          ))}
        </div>

        {/* Right actions */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button onClick={onLogin} style={{
            background: "transparent", border: "1px solid #333333",
            color: "#ffffff", borderRadius: "8px", padding: "8px 18px",
            fontSize: "13px", fontWeight: "600", cursor: "pointer",
          }}>Sign In</button>
          <button onClick={onSignup} style={{
            background: "#ffffff",
            border: "none", color: "#000", borderRadius: "8px",
            padding: "8px 18px", fontSize: "13px", fontWeight: "700",
            cursor: "pointer", boxShadow: "0 4px 20px rgba(255,255,255,0.3)",
          }}>Get Started</button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section style={{
        minHeight: "auto", display: "flex", alignItems: "center",
        paddingTop: "64px", padding: "80px 60px 40px",
        maxWidth: "1300px", margin: "0 auto", gap: "60px",
      }}>
        {/* Left side */}
        <div style={{ flex: 1, maxWidth: "560px" }}>
          {/* Badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: "100px", padding: "6px 16px", marginBottom: "28px",
          }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#ffffff", display: "inline-block" }} />
            <span style={{ fontSize: "12px", fontWeight: "600", color: "#ffffff", letterSpacing: "0.5px" }}>
              🇦🇪 Built for Gulf Job Seekers
            </span>
          </div>

          {/* Headline */}
          <h1 style={{
            fontSize: isMobile ? "36px" : "58px", fontWeight: "900",
            lineHeight: "1.05", letterSpacing: "-2px", marginBottom: "20px",
          }}>
            Your Resume is your{" "}
            <span style={{
              background: "linear-gradient(135deg, #ffffff 0%, #f59e0b 50%, #ffffff 100%)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              backgroundSize: "200% auto",
              animation: "shimmer 3s linear infinite",
            }}>passport</span>
            {" "}to the Gulf
          </h1>

          {/* Subtext */}
          <p style={{
            fontSize: "17px", color: "#888888", lineHeight: "1.7",
            marginBottom: "36px", maxWidth: "440px",
          }}>
            ATS-optimised resumes built for UAE, Saudi & GCC job markets. Free to build. Free to download.
          </p>

          {/* CTA pills */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '12px', marginTop: '32px' }}>
            <button
              onClick={() => setPage && setPage('walkin')}
              style={{
                background: '#fff',
                color: '#000',
                border: 'none',
                borderRadius: '12px',
                padding: '14px 36px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(255,255,255,0.2)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              Build My CV Free →
            </button>
            <button
              onClick={() => setPage && setPage('ats')}
              style={{
                background: 'transparent',
                color: 'rgba(255,255,255,0.6)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '12px',
                padding: '12px 36px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'; e.currentTarget.style.color = '#fff'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)'; }}
            >
              Check My ATS Score →
            </button>
          </div>

          {/* Trust bar */}
          <div style={{ display: "flex", alignItems: "center", gap: "20px", fontSize: "12px", color: "#888888" }}>
            <span>⭐ 4.8 / 5</span>
            <span style={{ color: "#333333" }}>|</span>
            <span>Used by <strong style={{ color: "#ffffff" }}>2,400+</strong> Gulf job seekers</span>
            <span style={{ color: "#333333" }}>|</span>
            <span>ATS-tested for <strong style={{ color: "#ffffff" }}>UAE banks</strong></span>
          </div>
        </div>

        {/* Right side - Globe */}
        <div style={{ flex: "0 0 auto", display: "flex", justifyContent: "center", alignItems: "center", position: "relative" }}>
          <div style={{
            position: "absolute", width: "400px", height: "400px",
            borderRadius: "50%", background: "radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />
          <GlobeComponent />
        </div>
      </section>

      {/* PROBLEM SECTION */}
      <section style={{ background: "#0a0a0a", padding: "80px 60px", maxWidth: "1100px", margin: "0 auto", textAlign: "center" }}>
        <p style={{ fontSize: "11px", letterSpacing: "3px", color: "#ffffff", fontWeight: "700", textTransform: "uppercase", marginBottom: "16px" }}>
          THE PROBLEM
        </p>
        <h2 style={{ fontSize: "44px", fontWeight: "800", letterSpacing: "-1px", marginBottom: "16px" }}>
          Why Most Resumes Fail
        </h2>
        <p style={{ fontSize: "17px", color: "#888888", marginBottom: "60px" }}>
          80% of resumes never make it past ATS screening. Here's why.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "20px" }}>
          {[
            { icon: "✗", title: "Missing Keywords", desc: "Your resume doesn't match the job description. ATS rejects it before a human sees it." },
            { icon: "⚠️", title: "Poor Formatting", desc: "Tables, columns, and graphics confuse ATS systems and lose your data." },
            { icon: "📊", title: "Weak Achievements", desc: "Generic job duties instead of quantified results. You look like everyone else." },
            { icon: "📄", title: "Wrong Template", desc: "Using a template not designed for Gulf employers kills your chances instantly." },
          ].map((item, i) => (
            <div key={i} style={{
              background: "#141414", border: "1px solid #222222",
              borderRadius: "16px", padding: "32px", textAlign: "center",
            }}>
              <div style={{ fontSize: "32px", marginBottom: "16px" }}>{item.icon}</div>
              <h3 style={{ fontSize: "18px", fontWeight: "700", marginBottom: "10px" }}>{item.title}</h3>
              <p style={{ color: "#888888", fontSize: "14px", lineHeight: "1.6" }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

{/* ============ WALK-IN CV MODE SECTION ============ */}
<section style={{ padding: '80px 24px', position: 'relative', overflow: 'hidden' }}>

  <style>{`
    @keyframes cvLineIn {
      from { opacity: 0; transform: translateX(-12px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    @keyframes shimmerSweep {
      from { transform: translateX(-100%); }
      to   { transform: translateX(100%); }
    }
    @keyframes stepPulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(234,88,12,0); }
      50%       { box-shadow: 0 0 0 6px rgba(234,88,12,0.15); }
    }
    .walkin-step-card {
      position: relative;
      overflow: hidden;
      display: flex;
      align-items: center;
      gap: 14px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 14px;
      padding: 16px 20px;
      transition: border-color 0.25s ease, background 0.25s ease;
      flex: 1;
      min-width: 160px;
    }
    .walkin-step-card:hover {
      border-color: rgba(234,88,12,0.4);
      background: rgba(234,88,12,0.05);
      animation: stepPulse 1.5s ease infinite;
    }
    .walkin-step-card .shimmer {
      position: absolute;
      top: 0; left: 0;
      width: 60%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(234,88,12,0.12), transparent);
      transform: translateX(-100%);
      pointer-events: none;
    }
    .walkin-step-card:hover .shimmer {
      animation: shimmerSweep 0.7s ease forwards;
    }
    .walkin-cta-btn {
      background: #ea580c;
      color: #fff;
      border: none;
      border-radius: 12px;
      padding: 16px 44px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      letter-spacing: 0.01em;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .walkin-cta-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 10px 28px rgba(234,88,12,0.4);
    }
    .walkin-cta-btn:active {
      transform: translateY(0) scale(0.98);
    }
  `}</style>

  <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
    <div style={{ display: 'flex', gap: '60px', alignItems: 'center', flexWrap: 'wrap' }}>

      {/* LEFT */}
      <div style={{ flex: '1', minWidth: '280px' }}>

        <div style={{
          display: 'inline-block',
          background: 'rgba(234,88,12,0.1)',
          color: '#ea580c',
          fontSize: '11px',
          fontWeight: '600',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          padding: '4px 14px',
          borderRadius: '20px',
          marginBottom: '20px',
          border: '1px solid rgba(234,88,12,0.25)',
        }}>
          Walk-In Interview Mode
        </div>

        <h2 style={{
          fontSize: 'clamp(26px, 4vw, 44px)',
          fontWeight: '700',
          lineHeight: '1.15',
          marginBottom: '12px',
          letterSpacing: '-0.02em',
        }}>
          Need a job fast?
        </h2>

        <p style={{ fontSize: '18px', opacity: '0.65', marginBottom: '6px', lineHeight: '1.5' }}>
          Fix your CV in 60 seconds — no signup required
        </p>

        <p style={{ fontSize: '13px', opacity: '0.4', marginBottom: '36px', letterSpacing: '0.03em' }}>
          Made for UAE walk-in interviews
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '36px' }}>
          {[
            { num: '1', text: 'Fill 6 quick fields' },
            { num: '2', text: 'Your CV builds instantly' },
            { num: '3', text: 'Download & share on WhatsApp' },
          ].map((step) => (
            <div key={step.num} className="walkin-step-card">
              <div className="shimmer" />
              <span style={{
                width: '28px', height: '28px', borderRadius: '50%',
                background: 'rgba(234,88,12,0.15)', color: '#ea580c',
                fontSize: '13px', fontWeight: '700',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, border: '1px solid rgba(234,88,12,0.3)',
              }}>{step.num}</span>
              <span style={{ opacity: 0.8, fontSize: '14px' }}>{step.text}</span>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: '14px' }}>
          <button
            className="walkin-cta-btn"
            onClick={() => onWalkIn && onWalkIn()}
          >
            Start Now — It's Free ⚡
          </button>
        </div>

        <p style={{ fontSize: '12px', opacity: '0.35', letterSpacing: '0.05em' }}>
          No login. No waiting. Instant results.
        </p>

      </div>

      {/* RIGHT — Animated CV Card */}
      <div style={{ flex: '1', minWidth: '260px', maxWidth: '340px' }}>
        <AnimatedCVCard />
      </div>

    </div>
  </div>

</section>
{/* ============ END WALK-IN SECTION ============ */}

      {/* SOLUTION SECTION */}
      <section style={{ background: "#0a0a0a", padding: "80px 60px", maxWidth: "1100px", margin: "0 auto", textAlign: "center" }}>
        <p style={{ fontSize: "11px", letterSpacing: "3px", color: "#ffffff", fontWeight: "700", textTransform: "uppercase", marginBottom: "16px" }}>
          HOW IT WORKS
        </p>
        <h2 style={{ fontSize: "44px", fontWeight: "800", letterSpacing: "-1px", marginBottom: "16px" }}>
          Your Gulf-Ready CV in 4 Steps
        </h2>
        <p style={{ fontSize: "17px", color: "#888888", marginBottom: "60px" }}>
          From upload to interview-ready in minutes.
        </p>
        <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", justifyContent: "center" }}>
          {[
            { step: "01", icon: "⬆️", title: "Upload Resume", desc: "Drop your existing CV or start from scratch." },
            { step: "02", icon: "🎯", title: "Get ATS Score", desc: "See exactly how recruiters' systems read your resume." },
            { step: "03", icon: "✏️", title: "Improve & Optimise", desc: "Fix keywords, formatting, and achievements instantly." },
            { step: "04", icon: "⬇️", title: "Download & Apply", desc: "PDF download. WhatsApp-ready. Walk-in interview ready." },
          ].map((item, i) => (
            <div key={i} style={{
              background: "#141414", border: "1px solid #222222",
              borderRadius: "16px", padding: "32px", width: "220px", textAlign: "center",
            }}>
              <p style={{ fontSize: "11px", letterSpacing: "2px", color: "#ffffff", fontWeight: "700", marginBottom: "8px" }}>
                STEP {item.step}
              </p>
              <div style={{ fontSize: "32px", marginBottom: "12px" }}>{item.icon}</div>
              <h4 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "8px" }}>{item.title}</h4>
              <p style={{ color: "#888888", fontSize: "13px", lineHeight: "1.6" }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES SECTION WITH WARP SHADER CARDS */}
      <section style={{ background: "#0a0a0a", padding: "80px 60px", maxWidth: "1200px", margin: "0 auto" }}>
        <p style={{ fontSize: "11px", letterSpacing: "3px", color: "#ffffff", fontWeight: "700", textTransform: "uppercase", marginBottom: "16px", textAlign: "center" }}>
          FEATURES
        </p>
        <h2 style={{ fontSize: "44px", fontWeight: "800", textAlign: "center", marginBottom: "16px" }}>
          Everything You Need to Get Hired
        </h2>
        <p style={{ fontSize: "17px", color: "#888888", textAlign: "center", marginBottom: "60px" }}>
          Built specifically for Indian and South Asian professionals targeting Gulf jobs.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "24px" }}>
          {[
            {
              icon: "🎯",
              title: "ATS Score Checker",
              desc: "Upload your CV and get an instant ATS score. See exactly which keywords are missing.",
              badge: "Free",
              colors: ["hsl(270,100%,25%)", "hsl(280,100%,55%)", "hsl(260,90%,35%)", "hsl(290,100%,65%)"],
              shape: "checks"
            },
            {
              icon: "✨",
              title: "Resume Optimisation",
              desc: "AI-powered suggestions to fix keywords, formatting, and achievements for Gulf roles.",
              badge: "Pro",
              colors: ["hsl(35,100%,25%)", "hsl(45,100%,55%)", "hsl(40,90%,30%)", "hsl(50,100%,65%)"],
              shape: "dots"
            },
            {
              icon: "📄",
              title: "11 Gulf Templates",
              desc: "ATS-tested designs built for UAE, Saudi, and GCC employers. Free and Pro options.",
              badge: "Free + Pro",
              colors: ["hsl(250,100%,25%)", "hsl(270,100%,55%)", "hsl(255,90%,30%)", "hsl(265,100%,65%)"],
              shape: "checks"
            },
            {
              icon: "⚡",
              title: "Walk-In CV Builder",
              desc: "6 fields. 60 seconds. Share on WhatsApp. Built for Gulf walk-in interview culture.",
              badge: "Free",
              colors: ["hsl(220,100%,25%)", "hsl(240,100%,55%)", "hsl(230,90%,30%)", "hsl(245,100%,65%)"],
              shape: "dots"
            },
          ].map((feature, i) => (
            <div key={i} style={{ position: "relative", height: "280px", borderRadius: "24px", overflow: "hidden" }}>
              <Warp
                colors={feature.colors}
                shape={feature.shape}
                proportion={0.4}
                softness={1.0}
                distortion={0.18}
                swirl={0.8}
                swirlIterations={10}
                shapeScale={0.1}
                speed={0.8}
              />
              <div style={{
                position: "relative", zIndex: 10, padding: "32px",
                height: "100%", display: "flex", flexDirection: "column",
                background: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "24px",
              }}>
                <div style={{
                  position: "absolute", top: "16px", right: "16px",
                  fontSize: "11px", padding: "4px 10px", borderRadius: "100px",
                  background: feature.badge === "Pro" ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.15)",
                  color: feature.badge === "Pro" ? "#ffffff" : "#ffffff",
                }}>
                  {feature.badge}
                </div>
                <div style={{ fontSize: "32px", marginBottom: "12px" }}>{feature.icon}</div>
                <h3 style={{ fontSize: "20px", fontWeight: "700", color: "#ffffff", marginBottom: "10px" }}>
                  {feature.title}
                </h3>
                <p style={{ color: "rgba(255,255,255,0.75)", fontSize: "14px", lineHeight: "1.6", flexGrow: 1 }}>
                  {feature.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* TEMPLATES SHOWCASE WITH WARP SHADER CARDS */}
      <section style={{ background: "#0a0a0a", padding: "80px 60px", maxWidth: "1200px", margin: "0 auto" }}>
        <p style={{ fontSize: "11px", letterSpacing: "3px", color: "#ffffff", fontWeight: "700", textTransform: "uppercase", marginBottom: "16px", textAlign: "center" }}>
          TEMPLATES
        </p>
        <h2 style={{ fontSize: "44px", fontWeight: "800", textAlign: "center", marginBottom: "16px" }}>
          Professional Templates Built for Gulf Jobs
        </h2>
        <p style={{ fontSize: "17px", color: "#888888", textAlign: "center", marginBottom: "60px" }}>
          ATS-optimised designs for UAE, Saudi & GCC employers. 3 free, 8 pro.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "24px", marginBottom: "40px" }}>
          {[
            {
              name: "Gulf Classic",
              tier: "Free",
              desc: "Clean single-column layout trusted by UAE employers.",
              colors: ["hsl(270,100%,25%)", "hsl(280,100%,55%)", "hsl(260,90%,35%)", "hsl(290,100%,65%)"],
              shape: "checks"
            },
            {
              name: "Dubai Modern",
              tier: "Free",
              desc: "Contemporary two-column for Dubai's fast-paced market.",
              colors: ["hsl(250,100%,20%)", "hsl(270,100%,50%)", "hsl(240,90%,30%)", "hsl(260,100%,60%)"],
              shape: "dots"
            },
            {
              name: "Arabia Pro",
              tier: "Free",
              desc: "Dark sidebar with gold accents for Saudi Gulf roles.",
              colors: ["hsl(280,100%,22%)", "hsl(300,100%,52%)", "hsl(270,90%,32%)", "hsl(285,100%,62%)"],
              shape: "checks"
            },
            {
              name: "Executive Gold",
              tier: "Pro",
              desc: "Premium executive template with Gulf-specific sections.",
              colors: ["hsl(35,100%,30%)", "hsl(45,100%,55%)", "hsl(40,90%,35%)", "hsl(50,100%,65%)"],
              shape: "dots"
            },
            {
              name: "Gulf Executive",
              tier: "Pro",
              desc: "Sophisticated layout for GCC leadership positions.",
              colors: ["hsl(260,100%,25%)", "hsl(280,100%,55%)", "hsl(265,90%,30%)", "hsl(275,100%,65%)"],
              shape: "checks"
            },
            {
              name: "Banking & Finance",
              tier: "Pro",
              desc: "Compliance-ready with KYC/AML sections for UAE banking.",
              colors: ["hsl(220,100%,25%)", "hsl(240,100%,55%)", "hsl(230,90%,30%)", "hsl(245,100%,65%)"],
              shape: "dots"
            },
          ].map((template, i) => (
            <div key={i} style={{ position: "relative", height: "320px", borderRadius: "24px", overflow: "hidden" }}>
              <Warp
                colors={template.colors}
                shape={template.shape}
                proportion={0.4}
                softness={1.0}
                distortion={0.18}
                swirl={0.8}
                swirlIterations={10}
                shapeScale={0.1}
                speed={0.8}
              />
              <div style={{
                position: "relative", zIndex: 10, padding: "24px",
                height: "100%", display: "flex", flexDirection: "column",
                justifyContent: "flex-end",
                background: "rgba(0,0,0,0.75)", border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "24px",
              }}>
                <div style={{
                  position: "absolute", top: "12px", right: "12px",
                  fontSize: "11px", padding: "4px 10px", borderRadius: "100px",
                  background: template.tier === "Pro" ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)",
                  color: template.tier === "Pro" ? "#ffffff" : "#888888",
                }}>
                  {template.tier}
                </div>
                <h3 style={{ fontSize: "16px", fontWeight: "700", color: "#ffffff", marginBottom: "8px" }}>
                  {template.name}
                </h3>
                <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.75)", marginBottom: "16px" }}>
                  {template.desc}
                </p>
                <button onClick={onSignup} style={{
                  background: "transparent", border: "1px solid rgba(255,255,255,0.3)",
                  color: "#ffffff", borderRadius: "8px", padding: "8px 16px",
                  fontSize: "13px", cursor: "pointer",
                }}>
                  Use Template →
                </button>
              </div>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center" }}>
          <button onClick={onSignup} style={{
            background: "transparent", border: "1px solid #444444",
            color: "#ffffff", borderRadius: "8px", padding: "12px 32px",
            fontSize: "14px", cursor: "pointer", marginTop: "40px",
          }}>
            Explore All 11 Templates →
          </button>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section style={{ background: "#0a0a0a", padding: "80px 60px", maxWidth: "900px", margin: "0 auto", textAlign: "center" }}>
        <p style={{ fontSize: "11px", letterSpacing: "3px", color: "#ffffff", fontWeight: "700", textTransform: "uppercase", marginBottom: "16px" }}>
          PRICING
        </p>
        <h2 style={{ fontSize: "44px", fontWeight: "800", marginBottom: "16px" }}>
          Simple, Honest Pricing
        </h2>
        <p style={{ fontSize: "17px", color: "#888888", marginBottom: "60px" }}>
          Start free. Upgrade when you're ready.
        </p>
        <div style={{ display: "flex", gap: "24px", justifyContent: "center", flexWrap: "wrap" }}>
          {/* Free Card */}
          <div style={{
            background: "#141414", border: "1px solid #222222",
            borderRadius: "20px", padding: "40px", width: "360px", textAlign: "left",
          }}>
            <div style={{ background: "rgba(255,255,255,0.15)", color: "#ffffff", fontSize: "11px", padding: "4px 10px", borderRadius: "100px", width: "fit-content", marginBottom: "24px" }}>
              Free
            </div>
            <div style={{ fontSize: "48px", fontWeight: "900", marginBottom: "4px" }}>
              AED 0
            </div>
            <div style={{ color: "#888888", fontSize: "14px", marginBottom: "32px" }}>
              /forever
            </div>
            <ul style={{ listStyle: "none", padding: 0, marginBottom: "32px" }}>
              {["3 free templates", "ATS score checker", "3 watermark-free downloads", "Walk-In CV Builder"].map((item, i) => (
                <li key={i} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", marginBottom: "12px", color: "#ffffff" }}>
                  <span style={{ color: "#ffffff" }}>✓</span> {item}
                </li>
              ))}
            </ul>
            <button onClick={onSignup} style={{
              border: "1px solid #333333", background: "transparent",
              color: "#ffffff", borderRadius: "10px", padding: "14px",
              width: "100%", fontSize: "15px", fontWeight: "700", cursor: "pointer",
            }}>
              Get Started Free
            </button>
          </div>

          {/* Pro Card */}
          <div style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.15) rgba(255,255,255,0.05))",
            border: "1px solid rgba(255,255,255,0.4)",
            borderRadius: "20px", padding: "40px", width: "360px", textAlign: "left", position: "relative",
          }}>
            <div style={{
              position: "absolute", top: "-12px", right: "20px",
              background: "#ea580c", color: "#ffffff", fontSize: "11px",
              padding: "4px 12px", borderRadius: "100px",
            }}>
              Most Popular
            </div>
            <div style={{ background: "rgba(255,255,255,0.3)", color: "#ffffff", fontSize: "11px", padding: "4px 10px", borderRadius: "100px", width: "fit-content", marginBottom: "24px", marginTop: "12px" }}>
              Pro
            </div>
            <div style={{ fontSize: "48px", fontWeight: "900", color: "#ffffff", marginBottom: "4px" }}>
              AED 29
            </div>
            <div style={{ color: "#888888", fontSize: "14px", marginBottom: "8px" }}>
              /month
            </div>
            <div style={{ color: "#888888", fontSize: "13px", marginBottom: "32px" }}>
              or AED 199/year · AED 299 lifetime
            </div>
            <ul style={{ listStyle: "none", padding: 0, marginBottom: "32px" }}>
              {["All 11 templates", "Unlimited downloads", "No watermarks", "ATS keyword matching", "Unlimited saved CVs", "Priority support"].map((item, i) => (
                <li key={i} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", marginBottom: "12px", color: "#ffffff" }}>
                  <span style={{ color: "#ffffff" }}>✓</span> {item}
                </li>
              ))}
            </ul>
            <button onClick={onSignup} style={{
              background: "#ffffff",
              border: "none", color: "#000000", borderRadius: "10px", padding: "14px",
              width: "100%", fontSize: "15px", fontWeight: "700", cursor: "pointer",
              boxShadow: "0 4px 20px rgba(255,255,255,0.35)",
            }}>
              Upgrade to Pro
            </button>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS SECTION */}
      <section style={{ background: "#0a0a0a", padding: "80px 60px", maxWidth: "1100px", margin: "0 auto", textAlign: "center" }}>
        <p style={{ fontSize: "11px", letterSpacing: "3px", color: "#ffffff", fontWeight: "700", textTransform: "uppercase", marginBottom: "16px" }}>
          TESTIMONIALS
        </p>
        <h2 style={{ fontSize: "44px", fontWeight: "800", marginBottom: "60px" }}>
          Loved by Gulf Job Seekers
        </h2>
        <div style={{ display: "flex", gap: "24px", justifyContent: "center", flexWrap: "wrap" }}>
          {[
            { quote: "Got called for an interview at Emirates NBD within a week of using CVPassport. The ATS score feature showed me exactly what was missing.", name: "Rahul M.", role: "Banking Professional, Dubai", initials: "RM" },
            { quote: "I had a walk-in interview the next morning. Built my CV in 60 seconds and got the job. Unbelievable.", name: "Priya K.", role: "Customer Service, Abu Dhabi", initials: "PK" },
            { quote: "The Gulf Executive template is exactly what Saudi recruiters want to see. Professional and ATS-ready.", name: "Mohammed A.", role: "Sales Manager, Riyadh", initials: "MA" },
          ].map((testimonial, i) => (
            <div key={i} style={{
              background: "#141414", border: "1px solid #222222",
              borderRadius: "16px", padding: "32px", width: "320px", textAlign: "left",
            }}>
              <div style={{ fontSize: "14px", marginBottom: "16px" }}>⭐⭐⭐⭐⭐</div>
              <p style={{ fontSize: "14px", lineHeight: "1.6", marginBottom: "20px", color: "#ffffff" }}>
                "{testimonial.quote}"
              </p>
              <div style={{
                width: "40px", height: "40px", borderRadius: "50%",
                background: "#333333", display: "flex", alignItems: "center",
                justifyContent: "center", fontSize: "14px", fontWeight: "700",
                color: "#ffffff", marginBottom: "12px",
              }}>
                {testimonial.initials}
              </div>
              <h4 style={{ fontSize: "14px", fontWeight: "700", color: "#ffffff", marginBottom: "2px" }}>
                {testimonial.name}
              </h4>
              <p style={{ fontSize: "12px", color: "#888888" }}>
                {testimonial.role}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* FINAL CTA SECTION */}
      <section style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.15) #0a0a0a)",
        padding: "100px 60px", textAlign: "center",
        borderTop: "1px solid #222222",
      }}>
        <h2 style={{ fontSize: "48px", fontWeight: "900", letterSpacing: "-1px", marginBottom: "20px" }}>
          Start Building Your Gulf CV Today
        </h2>
        <p style={{ fontSize: "18px", color: "#888888", marginBottom: "40px" }}>
          Free to start. No credit card needed. Download your first CV in minutes.
        </p>
        <div style={{ display: "flex", gap: "16px", justifyContent: "center" }}>
          <button onClick={onSignup} style={{
            background: "#ffffff",
            border: "none", color: "#000000", borderRadius: "12px",
            padding: "16px 36px", fontSize: "16px", fontWeight: "700",
            cursor: "pointer", boxShadow: "0 4px 24px rgba(255,255,255,0.35)",
          }}>
            Build My CV Free →
          </button>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        background: "#0a0a0a", borderTop: "1px solid #222222",
        padding: "40px 60px", display: "flex", alignItems: "center",
        justifyContent: "space-between", maxWidth: "1300px", margin: "0 auto",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <img src="/images/falcon-icon.png" alt="CVPassport" style={{ height: "24px", width: "auto" }} />
          <span style={{
            fontSize: "14px", fontWeight: "700",
            background: "linear-gradient(135deg, #ffffff, #ffffff)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>CVPassport</span>
        </div>
        <span style={{ fontSize: "13px", color: "#888888" }}>
          © 2026 CVPassport. Built for Gulf job seekers.
        </span>
        <div style={{ display: "flex", gap: "24px" }}>
          {["Privacy", "Terms", "Contact", "support@mycvpassport.com"].map((item, i) => (
            <span key={i} style={{ fontSize: "13px", color: "#888888", cursor: "pointer" }}>
              {item}
            </span>
          ))}
        </div>
      </footer>

      <style>{`
        @keyframes shimmer { 
          0% { background-position: 0% center; } 
          100% { background-position: 200% center; } 
        }
        @keyframes arcflow { to { stroke-dashoffset: -20; } }
      `}</style>
    </div>
  );
}