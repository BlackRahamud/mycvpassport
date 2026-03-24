import { useState, useEffect, useRef } from 'react';
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { ReactComponent as FalconLogo } from './logo.svg';
import CVPlayCard from './components/CVPlayCard';

// ── Globe helpers — kept identical to LandingGlobe.jsx ─────────────
function project(lat, lon) {
  const x = 50 + ((lon - 65) / 360) * 280;
  const y = 50 - ((lat - 20) / 180) * 280;
  return { x, y };
}

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
  [74.240,37.116],[75.758,36.798],[76.871,36.177],[77.837,35.494],
];

const UAE_SAUDI = [
  [51.579,24.245],[51.757,24.294],[51.794,24.019],[52.577,24.177],[53.404,24.151],
  [54.008,24.121],[54.693,24.797],[55.439,25.439],[56.070,26.055],[56.362,24.924],
  [56.485,24.242],[55.665,22.000],[55.208,22.708],[55.025,22.033],[52.000,23.001],
  [51.617,24.077],[51.579,24.245],
  [36.500,28.500],[37.480,28.000],[38.000,27.000],[39.000,26.000],[40.000,25.000],
  [41.000,24.000],[42.000,23.500],[43.000,22.500],[44.000,22.000],[45.000,21.500],
  [46.000,21.000],[47.000,20.500],[48.000,20.000],[49.000,19.500],[50.000,19.000],
  [51.000,19.500],[52.000,20.000],[55.000,22.000],[55.208,22.708],[55.025,22.033],
  [52.000,23.001],[51.617,24.077],[51.000,24.500],[50.000,25.500],[49.000,26.000],
  [48.500,27.000],[47.500,28.000],[47.000,29.000],[46.500,29.500],[45.500,30.000],
  [44.500,30.500],[43.500,31.000],[42.500,31.000],[41.500,31.000],[40.500,31.500],
  [39.500,32.000],[38.500,32.000],[37.500,31.500],[37.000,30.500],[36.500,29.500],
  [36.500,28.500],
];

const OMAN = [
  [56.362,24.924],[56.485,24.242],[57.000,23.500],[58.000,22.500],[59.000,22.000],
  [59.500,21.500],[59.800,21.000],[59.400,20.500],[58.800,20.000],[58.000,19.500],
  [57.000,19.000],[56.000,18.500],[55.000,18.000],[54.000,18.000],[53.000,17.500],
  [52.000,17.500],[51.000,18.000],[52.500,20.000],[55.000,22.000],[55.208,22.708],
  [56.070,26.055],[56.362,24.924],
];

const QATAR = [
  [50.800,24.754],[51.148,24.343],[51.579,24.245],[51.617,24.077],[51.000,24.500],
  [50.800,24.754],
];

const KUWAIT = [
  [47.000,29.000],[47.500,28.000],[48.500,27.000],[49.000,26.000],[48.416,28.552],
  [47.708,28.526],[47.000,29.000],
];

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
  [44.000,33.000],[43.500,33.500],[43.000,34.000],[42.000,37.000],[44.500,39.000],
];

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
  [63.551,29.469],[62.549,29.318],[60.874,29.829],[61.027,31.354],
];

function toSVGPath(coords) {
  if (!coords || coords.length < 3) return '';
  const pts = coords.map(([lat, lon]) => {
    const { x, y } = project(lat, lon);
    const svgX = (x / 100) * 380;
    const svgY = (y / 100) * 380;
    return `${svgX},${svgY}`;
  });
  return 'M ' + pts.join(' L ') + ' Z';
}

const CITIES = [
  { name: 'Dubai',  lat: 25.2,  lon: 55.27, rings: 3, bright: true },
  { name: 'Mumbai', lat: 19.07, lon: 72.87,  rings: 2 },
  { name: 'Delhi',  lat: 28.61, lon: 77.20,  rings: 2 },
  { name: 'Doha',   lat: 25.29, lon: 51.53,  rings: 1 },
  { name: 'Muscat', lat: 23.59, lon: 58.39,  rings: 1 },
];

const ARC_ROUTES = [
  { from: { lat: 19.07, lon: 72.87 }, to: { lat: 25.2,  lon: 55.27 } },
  { from: { lat: 28.61, lon: 77.20 }, to: { lat: 25.2,  lon: 55.27 } },
  { from: { lat: 25.2,  lon: 55.27 }, to: { lat: 25.29, lon: 51.53 } },
  { from: { lat: 25.2,  lon: 55.27 }, to: { lat: 23.59, lon: 58.39 } },
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
      style={{ transform: `rotate(${angle}deg)`, transition: 'transform 0.05s linear' }}
    >
      <defs>
        <radialGradient id="lp-globeBg" cx="38%" cy="35%" r="65%">
          <stop offset="0%"   stopColor="#1c1c1c" />
          <stop offset="60%"  stopColor="#0a0a0a" />
          <stop offset="100%" stopColor="#030303" />
        </radialGradient>
        <clipPath id="lp-globeClip">
          <circle cx="190" cy="190" r="168" />
        </clipPath>
        <radialGradient id="lp-glowGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="rgba(255,255,255,0.15)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </radialGradient>
      </defs>
      <circle cx="190" cy="190" r="168" fill="url(#lp-globeBg)" />
      <circle cx="190" cy="190" r="168" fill="url(#lp-glowGrad)" clipPath="url(#lp-globeClip)" />
      <g clipPath="url(#lp-globeClip)" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.35)" strokeWidth="0.6" strokeLinejoin="round">
        {countries.map((country, i) => (
          <path key={i} d={toSVGPath(country)} />
        ))}
      </g>
      <g clipPath="url(#lp-globeClip)">
        {ARC_ROUTES.map((route, i) => {
          const from = project(route.from.lat, route.from.lon);
          const to   = project(route.to.lat,   route.to.lon);
          const fx = (from.x / 100) * 380;
          const fy = (from.y / 100) * 380;
          const tx = (to.x   / 100) * 380;
          const ty = (to.y   / 100) * 380;
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
              style={{ animation: `lp-arcflow ${2 + i * 0.3}s linear infinite` }}
            />
          );
        })}
      </g>
      <g clipPath="url(#lp-globeClip)">
        {CITIES.map((city, i) => {
          const { x, y } = project(city.lat, city.lon);
          const cx  = (x / 100) * 380;
          const cy2 = (y / 100) * 380;
          return (
            <g key={i}>
              {city.rings >= 3 && <circle cx={cx} cy={cy2} r="12" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />}
              {city.rings >= 2 && <circle cx={cx} cy={cy2} r="7"  fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />}
              <circle cx={cx} cy={cy2} r={city.bright ? 4 : 2.5} fill={city.bright ? '#ffffff' : 'rgba(255,255,255,0.8)'} />
              <text x={cx + 7} y={cy2 + 4} fontSize="9" fill="rgba(255,255,255,0.7)" fontFamily="sans-serif" fontWeight="500">
                {city.name}
              </text>
            </g>
          );
        })}
      </g>
      <circle cx="190" cy="190" r="168" fill="none" stroke="#252525" strokeWidth="1.5" />
      <circle cx="190" cy="190" r="166" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
    </svg>
  );
}

// ── SVG Icons (line style, 20×20 viewBox unless noted) ─────────────
function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1"  x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22"  y1="4.22"  x2="5.64"  y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1"  y1="12" x2="3"  y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22"  y1="19.78" x2="5.64"  y2="18.36"/>
      <line x1="18.36" y1="5.64"  x2="19.78" y2="4.22"/>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}

function HamburgerIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6"  x2="21" y2="6"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  );
}

function XCloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6"  x2="6"  y2="18"/>
      <line x1="6"  y1="6"  x2="18" y2="18"/>
    </svg>
  );
}

function XCircleIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="15" y1="9"  x2="9"  y2="15"/>
      <line x1="9"  y1="9"  x2="15" y2="15"/>
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/>
      <rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/>
    </svg>
  );
}

function StarAchieveIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  );
}

function DocumentArrowIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="12" y1="18" x2="12" y2="12"/>
      <polyline points="9 15 12 18 15 15"/>
    </svg>
  );
}

function PlusCircleIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="16"/>
      <line x1="8"  y1="12" x2="16" y2="12"/>
    </svg>
  );
}

function TemplateIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <line x1="3"  y1="9"  x2="21" y2="9"/>
      <line x1="9"  y1="9"  x2="9"  y2="21"/>
    </svg>
  );
}

function DownloadArrowIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

function WhatsAppIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
    </svg>
  );
}

function StarSmallIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  );
}

// ── Static data ─────────────────────────────────────────────────────
const PROBLEM_CARDS = [
  { icon: <XCircleIcon />,       title: 'Missing keywords',  desc: 'Your CV doesn\'t match the job description. ATS rejects it before a human ever sees it.' },
  { icon: <GridIcon />,          title: 'Poor formatting',   desc: 'Tables, columns, and graphics confuse ATS systems and lose your data entirely.' },
  { icon: <StarAchieveIcon />,   title: 'Weak achievements', desc: 'Generic job duties instead of quantified results. You look identical to every other applicant.' },
  { icon: <DocumentArrowIcon />, title: 'Wrong template',    desc: 'Using a template not built for Gulf employers kills your chances before the interview.' },
];

const STEPS = [
  { icon: <PlusCircleIcon />,   title: 'Add your details',   desc: 'Fill in your name, experience, skills, and Gulf-specific fields like visa status and nationality.' },
  { icon: <TemplateIcon />,     title: 'Pick a template',    desc: 'Choose from 11 ATS-optimised templates built for UAE banks, hospitality, tech, and more.' },
  { icon: <DownloadArrowIcon />,title: 'Download & apply',   desc: 'Export a perfect PDF in seconds. Share on WhatsApp or email it directly to recruiters.' },
];

function scrollToLandingSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Main component ──────────────────────────────────────────────────
export default function LandingPage({ onLogin, onSignup, onWalkIn, setPage }) {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('cvp-theme') || 'dark'; } catch { return 'dark'; }
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isDark = theme === 'dark';

  const T = isDark ? {
    bgPage:       '#0A0A0A',
    bgSurface:    '#141414',
    bgElevated:   '#1C1C1C',
    textPrimary:  '#FFFFFF',
    textSecondary:'#A0A0A0',
    border:       '#2A2A2A',
    navBg:        'rgba(10,10,10,0.92)',
    navBorder:    '#1E1E1E',
    btnPrimary:   '#FFFFFF',
    btnPrimaryTxt:'#000000',
    btnGhostBorder:'#333333',
    btnGhostTxt:  '#FFFFFF',
    walkInBg:     '#141414',
    accentCheck:  '#4ADE80',
  } : {
    bgPage:       '#F5F5F0',
    bgSurface:    '#FFFFFF',
    bgElevated:   '#F0F0EC',
    textPrimary:  '#111111',
    textSecondary:'#555555',
    border:       '#E5E5E5',
    navBg:        'rgba(245,245,240,0.92)',
    navBorder:    '#E5E5E5',
    btnPrimary:   '#111111',
    btnPrimaryTxt:'#FFFFFF',
    btnGhostBorder:'#CCCCCC',
    btnGhostTxt:  '#111111',
    walkInBg:     '#F0F0EC',
    accentCheck:  '#16A34A',
  };

  useEffect(() => {
    try { localStorage.setItem('cvp-theme', theme); } catch {}
    document.documentElement.className = theme;
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  const closeMobileMenu = () => setMobileMenuOpen(false);

  /** Nav items: Templates / Pricing = in-page anchors (no templates/pricing routes in App). ATS → page "ats". */
  const handleLandingNav = (item) => {
    if (item === 'Templates') scrollToLandingSection('lp-templates');
    else if (item === 'ATS Check') setPage && setPage('ats');
    else if (item === 'Pricing') scrollToLandingSection('lp-pricing');
  };

  return (
    <>
      <Helmet>
        <title>CVPassport — Build ATS-Friendly Resumes for UAE &amp; Gulf Jobs</title>
        <meta name="description" content="Build ATS-optimised resumes for UAE, Saudi Arabia and GCC job markets. Free templates, ATS score checker, and Walk-In CV builder for Gulf job seekers." />
        <meta name="keywords" content="resume builder UAE, CV builder Dubai, ATS resume Gulf, Gulf job CV, Saudi Arabia resume, GCC job seeker, Indian expat CV Dubai" />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="CVPassport" />
        <link rel="canonical" href="https://mycvpassport.com" />
        <meta property="og:title" content="CVPassport — ATS-Friendly Resume Builder for Gulf Jobs" />
        <meta property="og:description" content="Free resume builder for UAE, Saudi &amp; GCC job markets. ATS score checker, 11 professional templates, Walk-In CV mode." />
        <meta property="og:url" content="https://mycvpassport.com" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://mycvpassport.com/images/falcon-icon.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="CVPassport — Resume Builder for Gulf Jobs" />
        <meta name="twitter:description" content="ATS-optimised CVs for UAE, Saudi &amp; GCC. Free to build, free to download." />
        <meta name="twitter:image" content="https://mycvpassport.com/images/falcon-icon.png" />
      </Helmet>

      <style>{`
        @keyframes lp-arcflow { to { stroke-dashoffset: -20; } }
        path[stroke="rgba(255,255,255,0.5)"] { stroke-dashoffset: 0; }
        @keyframes lp-cvLineIn {
          from { opacity: 0; transform: translateX(-12px); }
          to   { opacity: 1; transform: translateX(0); }
        }

        .lp-nav        { padding: 0 60px; }
        .lp-sec        { padding: 80px 60px; }
        .lp-hero       { padding: 80px 60px 32px; }
        .lp-hero + .lp-sec { padding-top: 48px; }
        .lp-walkin-sec { padding: 80px 60px; }

        /* Hover states */
        .lp-btn:hover      { opacity: 0.85; transform: translateY(-1px); }
        .lp-ghost-btn:hover{ opacity: 0.75; }
        .lp-nav-link:hover { color: #fff !important; }
        .lp-card:hover     { border-color: ${isDark ? 'rgba(255,255,255,0.14)' : '#BBBBBB'} !important; transform: translateY(-2px); }
        .lp-step-card:hover{ border-color: ${isDark ? 'rgba(255,255,255,0.14)' : '#BBBBBB'} !important; }
        .lp-theme-btn:hover{ opacity: 0.8; }

        /* Transitions */
        .lp-btn       { transition: opacity 0.2s cubic-bezier(0.4,0,0.2,1), transform 0.2s cubic-bezier(0.4,0,0.2,1); }
        .lp-ghost-btn { transition: opacity 0.2s cubic-bezier(0.4,0,0.2,1), transform 0.2s cubic-bezier(0.4,0,0.2,1); }
        .lp-nav-link  { transition: color 0.2s cubic-bezier(0.4,0,0.2,1); }
        .lp-card      { transition: border-color 0.2s cubic-bezier(0.4,0,0.2,1), transform 0.2s cubic-bezier(0.4,0,0.2,1); }
        .lp-step-card { transition: border-color 0.2s cubic-bezier(0.4,0,0.2,1); }
        .lp-theme-btn { transition: opacity 0.2s cubic-bezier(0.4,0,0.2,1); }
        .lp-wrapper   { transition: background-color 0.25s cubic-bezier(0.4,0,0.2,1), color 0.25s cubic-bezier(0.4,0,0.2,1); }

        /* Mobile — 390px first */
        @media (max-width: 768px) {
          .lp-nav          { padding: 0 20px; }
          .lp-sec          { padding: 60px 20px; }
          .lp-hero         { padding: 52px 20px 48px; }
          .lp-walkin-sec   { padding: 60px 20px; }
          .lp-nav-center   { display: none !important; }
          .lp-nav-desktop  { display: none !important; }
          .lp-hamburger    { display: flex !important; }
          .lp-hero-right   { display: none !important; }
          .lp-hero-content { max-width: 100% !important; }
          .lp-problem-grid { grid-template-columns: 1fr !important; }
          .lp-steps-grid   { grid-template-columns: 1fr !important; }
          .lp-walkin-right { display: none !important; }
          .lp-walkin-inner { flex-direction: column !important; gap: 32px !important; }
          .lp-trust-bar    { flex-direction: column; align-items: flex-start !important; gap: 8px !important; }
          .lp-trust-sep    { display: none !important; }
          .lp-hero-ctas    { flex-direction: column !important; }
          .lp-hero-ctas button { width: 100% !important; }
        }
        @media (min-width: 769px) {
          .lp-hamburger    { display: none !important; }
          .lp-mobile-menu  { display: none !important; }
        }
      `}</style>

      <div
        className="lp-wrapper"
        style={{
          background:  T.bgPage,
          color:       T.textPrimary,
          fontFamily:  "'DM Sans', sans-serif",
          minHeight:   '100vh',
        }}
      >
        {/* ── NAV ─────────────────────────────────────────────────── */}
        <nav
          className="lp-nav"
          style={{
            position:       'sticky',
            top:            0,
            zIndex:         100,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            height:         '64px',
            background:     T.navBg,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom:   `1px solid ${T.navBorder}`,
          }}
        >
          {/* Logo */}
          <div
            onClick={() => setPage && setPage('landing')}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && setPage && setPage('landing')}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <FalconLogo
              width={28}
              height={28}
              aria-hidden="true"
              style={{
                display: 'block',
                flexShrink: 0,
                color: T.textPrimary,
                background: 'none',
                border: 'none',
                boxShadow: 'none',
              }}
            />
            <span style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '-0.5px', color: T.textPrimary }}>CVPassport</span>
          </div>

          {/* Center nav — desktop only */}
          <div
            className="lp-nav-center"
            style={{
              display:        'flex',
              alignItems:     'center',
              gap:            '2px',
              background:     isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
              border:         `1px solid ${T.border}`,
              borderRadius:   '100px',
              padding:        '5px 10px',
            }}
          >
            {['Templates', 'ATS Check', 'Pricing'].map(item => (
              <button
                key={item}
                type="button"
                className="lp-nav-link"
                onClick={() => handleLandingNav(item)}
                style={{
                  background:   'none',
                  border:       'none',
                  color:        T.textSecondary,
                  fontSize:     '13px',
                  fontWeight:   '500',
                  padding:      '6px 14px',
                  borderRadius: '100px',
                  cursor:       'pointer',
                  fontFamily:   'inherit',
                }}
              >
                {item}
              </button>
            ))}
          </div>

          {/* Right actions — desktop only */}
          <div className="lp-nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              className="lp-theme-btn"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              style={{
                background:   'none',
                border:       `1px solid ${T.border}`,
                color:        T.textPrimary,
                borderRadius: '8px',
                padding:      '7px 9px',
                cursor:       'pointer',
                display:      'flex',
                alignItems:   'center',
              }}
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
            <button
              type="button"
              className="lp-ghost-btn"
              onClick={() => onLogin && onLogin()}
              style={{
                background:   'transparent',
                border:       `1px solid ${T.btnGhostBorder}`,
                color:        T.btnGhostTxt,
                borderRadius: '8px',
                padding:      '8px 18px',
                fontSize:     '13px',
                fontWeight:   '600',
                cursor:       'pointer',
                fontFamily:   'inherit',
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              className="lp-btn"
              onClick={() => onSignup && onSignup()}
              style={{
                background:   T.btnPrimary,
                border:       'none',
                color:        T.btnPrimaryTxt,
                borderRadius: '8px',
                padding:      '8px 18px',
                fontSize:     '13px',
                fontWeight:   '700',
                cursor:       'pointer',
                fontFamily:   'inherit',
              }}
            >
              Get Started
            </button>
          </div>

          {/* Hamburger — mobile only */}
          <div className="lp-hamburger" style={{ display: 'none', alignItems: 'center', gap: '8px' }}>
            <button
              className="lp-theme-btn"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              style={{ background: 'none', border: `1px solid ${T.border}`, color: T.textPrimary, borderRadius: '8px', padding: '7px', cursor: 'pointer', display: 'flex' }}
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(o => !o)}
              aria-label="Open menu"
              style={{ background: 'none', border: 'none', color: T.textPrimary, cursor: 'pointer', padding: '4px', display: 'flex' }}
            >
              {mobileMenuOpen ? <XCloseIcon /> : <HamburgerIcon />}
            </button>
          </div>
        </nav>

        {/* ── MOBILE MENU ─────────────────────────────────────────── */}
        {mobileMenuOpen && (
          <div
            className="lp-mobile-menu"
            style={{
              position:   'fixed',
              top:        '64px',
              left:       0,
              right:      0,
              zIndex:     99,
              background: T.bgSurface,
              borderBottom: `1px solid ${T.border}`,
              padding:    '16px 20px',
              display:    'flex',
              flexDirection: 'column',
              gap:        '4px',
            }}
          >
            {['Templates', 'ATS Check', 'Pricing'].map(item => (
              <button
                key={item}
                type="button"
                onClick={() => { closeMobileMenu(); handleLandingNav(item); }}
                style={{ background: 'none', border: 'none', color: T.textSecondary, fontSize: '15px', padding: '12px 0', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
              >
                {item}
              </button>
            ))}
            <div style={{ height: '1px', background: T.border, margin: '8px 0' }} />
            <button
              onClick={() => { closeMobileMenu(); onLogin && onLogin(); }}
              style={{ background: 'none', border: `1px solid ${T.border}`, color: T.textPrimary, borderRadius: '10px', padding: '13px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Sign In
            </button>
            <button
              onClick={() => { closeMobileMenu(); onSignup && onSignup(); }}
              style={{ background: T.btnPrimary, border: 'none', color: T.btnPrimaryTxt, borderRadius: '10px', padding: '13px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', marginTop: '6px', fontFamily: 'inherit' }}
            >
              Get Started
            </button>
          </div>
        )}

        {/* ── HERO ────────────────────────────────────────────────── */}
        <section
          className="lp-hero"
          style={{ maxWidth: '1300px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '60px', overflow: 'visible' }}
        >
          {/* Left */}
          <div className="lp-hero-content" style={{ flex: 1, maxWidth: '560px' }}>
            {/* Badge pill */}
            <div style={{
              display:      'inline-flex',
              alignItems:   'center',
              gap:          '8px',
              background:   isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              border:       `1px solid ${T.border}`,
              borderRadius: '100px',
              padding:      '6px 16px',
              marginBottom: '28px',
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: T.textPrimary, flexShrink: 0 }} />
              <span style={{ fontSize: '12px', fontWeight: '600', color: T.textPrimary, letterSpacing: '0.3px' }}>
                Built for Gulf Job Seekers
              </span>
            </div>

            {/* H1 */}
            <h1 style={{
              fontSize:     'clamp(34px, 5vw, 58px)',
              fontWeight:   '800',
              lineHeight:   1.05,
              letterSpacing:'-2px',
              marginBottom: '20px',
              color:        T.textPrimary,
              fontFamily:   "'DM Sans', sans-serif",
            }}>
              Your Resume is your{' '}
              <span style={{ borderBottom: `3px solid ${T.textPrimary}`, paddingBottom: '2px' }}>passport</span>
              {' '}to the Gulf
            </h1>

            {/* Subtext */}
            <p style={{ fontSize: '17px', color: T.textSecondary, marginBottom: '36px', lineHeight: 1.7 }}>
              ATS-optimised resumes built for UAE, Saudi &amp; GCC markets.{' '}
              Free to build, free to download.
            </p>

            {/* CTAs */}
            <div className="lp-hero-ctas" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '40px' }}>
              <button
                type="button"
                className="lp-btn"
                onClick={() => onSignup && onSignup()}
                style={{
                  background:   T.btnPrimary,
                  color:        T.btnPrimaryTxt,
                  border:       'none',
                  borderRadius: '10px',
                  padding:      '14px 28px',
                  fontSize:     '15px',
                  fontWeight:   '700',
                  cursor:       'pointer',
                  fontFamily:   'inherit',
                  whiteSpace:   'nowrap',
                }}
              >
                Build my CV free →
              </button>
              <button
                type="button"
                className="lp-ghost-btn"
                onClick={() => scrollToLandingSection('lp-templates')}
                style={{
                  background:   'transparent',
                  color:        T.textPrimary,
                  border:       `1px solid ${T.btnGhostBorder}`,
                  borderRadius: '10px',
                  padding:      '14px 28px',
                  fontSize:     '15px',
                  fontWeight:   '600',
                  cursor:       'pointer',
                  fontFamily:   'inherit',
                  whiteSpace:   'nowrap',
                }}
              >
                Browse templates
              </button>
            </div>

            {/* Trust bar */}
            <div className="lp-trust-bar" style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '13px', color: T.textSecondary }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#F59E0B' }}>
                <StarSmallIcon />
                <span style={{ color: T.textSecondary }}>4.8 / 5</span>
              </span>
              <span className="lp-trust-sep" style={{ color: T.border }}>|</span>
              <span>Used by <strong style={{ color: T.textPrimary }}>2,400+</strong> Gulf job seekers</span>
              <span className="lp-trust-sep" style={{ color: T.border }}>|</span>
              <span>ATS-tested for <strong style={{ color: T.textPrimary }}>UAE banks</strong></span>
            </div>
          </div>

          {/* Right — CV card left of globe, side-by-side with gap (no overlap) */}
          <div
            className="lp-hero-right"
            style={{
              flex:           '0 0 auto',
              display:        'flex',
              justifyContent: 'flex-end',
              alignItems:     'center',
              position:       'relative',
              overflow:       'visible',
              paddingRight:   '24px',
              boxSizing:      'border-box',
            }}
          >
            <div
              style={{
                display:        'flex',
                flexDirection:  'row',
                alignItems:     'center',
                justifyContent: 'flex-end',
                gap:            '48px',
                flexWrap:       'nowrap',
              }}
            >
              <div className="hidden md:block" style={{ flexShrink: 0, pointerEvents: 'none' }}>
                <CVPlayCard />
              </div>
              <div style={{ position: 'relative', display: 'inline-block', overflow: 'visible', flexShrink: 0 }}>
                {/* Glow halo */}
                <div style={{
                  position:     'absolute',
                  width:        '400px',
                  height:       '400px',
                  borderRadius: '50%',
                  background:   'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
                  pointerEvents:'none',
                }} />
                <GlobeComponent />
              </div>
            </div>
          </div>
        </section>

        {/* ── PROBLEM SECTION ─────────────────────────────────────── */}
        <section className="lp-sec" style={{ maxWidth: '1100px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: '11px', letterSpacing: '3px', color: T.textSecondary, fontWeight: '700', textTransform: 'uppercase', marginBottom: '12px' }}>
            The problem
          </p>
          <h2 style={{
            fontSize:     'clamp(26px, 4vw, 44px)',
            fontWeight:   '800',
            letterSpacing:'-1px',
            marginBottom: '16px',
            color:        T.textPrimary,
            fontFamily:   "'DM Sans', sans-serif",
          }}>
            Why most CVs get rejected
          </h2>
          <p style={{ fontSize: '17px', color: T.textSecondary, marginBottom: '52px', maxWidth: '560px', margin: '0 auto 52px' }}>
            80% of resumes never make it past ATS screening. Here&apos;s why.
          </p>
          <div
            className="lp-problem-grid"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', maxWidth: '860px', margin: '0 auto' }}
          >
            {PROBLEM_CARDS.map((card, i) => (
              <div
                key={i}
                className="lp-card"
                style={{
                  background:   T.bgSurface,
                  border:       `1px solid ${T.border}`,
                  borderRadius: '16px',
                  padding:      '32px',
                  textAlign:    'left',
                }}
              >
                <div style={{ color: T.textPrimary, marginBottom: '16px' }}>{card.icon}</div>
                <h3 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '10px', color: T.textPrimary, fontFamily: "'DM Sans', sans-serif" }}>{card.title}</h3>
                <p  style={{ color: T.textSecondary, fontSize: '14px', lineHeight: 1.65 }}>{card.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS (templates step — anchor for Browse templates / nav) ── */}
        <section id="lp-templates" className="lp-sec" style={{ maxWidth: '1100px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: '11px', letterSpacing: '3px', color: T.textSecondary, fontWeight: '700', textTransform: 'uppercase', marginBottom: '12px' }}>
            How it works
          </p>
          <h2 style={{
            fontSize:     'clamp(26px, 4vw, 44px)',
            fontWeight:   '800',
            letterSpacing:'-1px',
            marginBottom: '52px',
            color:        T.textPrimary,
            fontFamily:   "'DM Sans', sans-serif",
          }}>
            Three steps to your Gulf CV
          </h2>
          <div
            className="lp-steps-grid"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}
          >
            {STEPS.map((step, i) => (
              <div
                key={i}
                className="lp-step-card"
                style={{
                  background:   T.bgSurface,
                  border:       `1px solid ${T.border}`,
                  borderRadius: '16px',
                  padding:      '32px 28px',
                  textAlign:    'left',
                }}
              >
                <div style={{
                  width:          '44px',
                  height:         '44px',
                  background:     T.bgElevated,
                  borderRadius:   '10px',
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  marginBottom:   '20px',
                  color:          T.textPrimary,
                  flexShrink:     0,
                }}>
                  {step.icon}
                </div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: T.textSecondary, marginBottom: '8px', letterSpacing: '0.5px' }}>
                  Step {i + 1}
                </div>
                <h3 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '10px', color: T.textPrimary, fontFamily: "'DM Sans', sans-serif" }}>{step.title}</h3>
                <p  style={{ color: T.textSecondary, fontSize: '14px', lineHeight: 1.65 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── WALK-IN BAND ────────────────────────────────────────── */}
        <section
          id="lp-walkin"
          className="lp-walkin-sec"
          style={{
            background:   T.walkInBg,
            borderTop:    `1px solid ${T.border}`,
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <div
            className="lp-walkin-inner"
            style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', gap: '60px', alignItems: 'center' }}
          >
            {/* Left — text + CTA */}
            <div style={{ flex: 1 }}>
              {/* Urgency badge */}
              <div style={{
                display:      'inline-flex',
                alignItems:   'center',
                gap:          '8px',
                background:   'rgba(255,165,0,0.1)',
                border:       '1px solid rgba(255,165,0,0.3)',
                borderRadius: '100px',
                padding:      '6px 16px',
                marginBottom: '24px',
              }}>
                <span style={{ color: '#FFA500' }}><ClockIcon /></span>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#FFA500', letterSpacing: '0.3px' }}>Walk-In Mode</span>
              </div>

              <h2 style={{
                fontSize:     'clamp(26px, 4vw, 40px)',
                fontWeight:   '800',
                letterSpacing:'-1px',
                marginBottom: '16px',
                color:        T.textPrimary,
                fontFamily:   "'DM Sans', sans-serif",
              }}>
                Got a walk-in tomorrow?
              </h2>
              <p style={{ fontSize: '16px', color: T.textSecondary, marginBottom: '28px', lineHeight: 1.7, maxWidth: '460px' }}>
                Build a complete Gulf-ready CV in 60 seconds. No account needed.
                Share it instantly on WhatsApp.
              </p>

              {/* Checkmarks */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                {[
                  'ATS-optimised in one click',
                  'Includes all Gulf CV fields',
                  'Share via WhatsApp instantly',
                ].map((feat, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: T.textPrimary }}>
                    <span style={{ color: T.accentCheck, flexShrink: 0 }}><CheckIcon /></span>
                    {feat}
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="lp-btn"
                onClick={() => onWalkIn && onWalkIn()}
                style={{
                  background:   T.btnPrimary,
                  color:        T.btnPrimaryTxt,
                  border:       'none',
                  borderRadius: '10px',
                  padding:      '14px 28px',
                  fontSize:     '15px',
                  fontWeight:   '700',
                  cursor:       'pointer',
                  display:      'inline-block',
                  marginBottom: '12px',
                  fontFamily:   'inherit',
                }}
              >
                Build walk-in CV →
              </button>
              <p style={{ fontSize: '12px', color: T.textSecondary }}>No signup needed</p>
            </div>

            {/* Right — form mockup card (hidden on mobile) */}
            <div className="lp-walkin-right" style={{ flex: '0 0 340px' }}>
              <div style={{
                background:   T.bgSurface,
                border:       `1px solid ${T.border}`,
                borderRadius: '16px',
                padding:      '28px',
              }}>
                <p style={{ fontSize: '11px', color: T.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '20px' }}>
                  Walk-In CV Builder
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                  {['Full name', 'Job title', 'Top 3 skills', 'Years experience', 'Location', 'Phone (WhatsApp)'].map((field, i) => (
                    <div
                      key={i}
                      style={{
                        background:   T.bgElevated,
                        border:       `1px solid ${T.border}`,
                        borderRadius: '8px',
                        padding:      '10px 14px',
                        fontSize:     '13px',
                        color:        T.textSecondary,
                      }}
                    >
                      {field}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    style={{
                      flex:         1,
                      background:   T.btnPrimary,
                      color:        T.btnPrimaryTxt,
                      border:       'none',
                      borderRadius: '8px',
                      padding:      '11px 8px',
                      fontSize:     '13px',
                      fontWeight:   '700',
                      cursor:       'pointer',
                      fontFamily:   'inherit',
                    }}
                  >
                    Download PDF
                  </button>
                  <button
                    style={{
                      flex:         1,
                      background:   '#25D366',
                      color:        '#fff',
                      border:       'none',
                      borderRadius: '8px',
                      padding:      '11px 8px',
                      fontSize:     '13px',
                      fontWeight:   '700',
                      cursor:       'pointer',
                      display:      'flex',
                      alignItems:   'center',
                      justifyContent:'center',
                      gap:          '6px',
                      fontFamily:   'inherit',
                    }}
                  >
                    <WhatsAppIcon size={15} /> Share
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FINAL CTA (pricing / signup anchor) ─────────────────── */}
        <section id="lp-pricing" className="lp-sec" style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{
            fontSize:     'clamp(26px, 4vw, 44px)',
            fontWeight:   '800',
            letterSpacing:'-1px',
            marginBottom: '16px',
            color:        T.textPrimary,
            fontFamily:   "'DM Sans', sans-serif",
          }}>
            Start building your Gulf CV today
          </h2>
          <p style={{ fontSize: '17px', color: T.textSecondary, marginBottom: '36px', lineHeight: 1.7 }}>
            Join 2,400+ Gulf job seekers who built their CV with CVPassport.
          </p>
          <button
            type="button"
            className="lp-btn"
            onClick={() => onSignup && onSignup()}
            style={{
              background:   T.btnPrimary,
              color:        T.btnPrimaryTxt,
              border:       'none',
              borderRadius: '12px',
              padding:      '16px 44px',
              fontSize:     '16px',
              fontWeight:   '700',
              cursor:       'pointer',
              display:      'inline-block',
              marginBottom: '16px',
              fontFamily:   'inherit',
            }}
          >
            Build my CV free →
          </button>
          <p style={{ fontSize: '13px', color: T.textSecondary }}>
            Free forever. No credit card. No hidden fees.
          </p>
        </section>
      </div>
    </>
  );
}
