import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";

const ROLES = [
  { id: "se", icon: "\u2699", name: "Software Engineer", jr: [60000, 8000],  mid: [180000, 18000], sr: [350000, 35000] },
  { id: "it", icon: "\u2318", name: "IT Support",        jr: [30000, 5000],  mid: [70000, 10000],  sr: [130000, 18000] },
  { id: "bk", icon: "\u20BF", name: "Banking",           jr: [45000, 7000],  mid: [110000, 15000], sr: [250000, 30000] },
  { id: "sl", icon: "\u2197", name: "Sales",             jr: [35000, 6000],  mid: [90000, 14000],  sr: [200000, 25000] },
  { id: "hr", icon: "\u25C9", name: "HR",                jr: [35000, 6000],  mid: [85000, 12000],  sr: [180000, 22000] },
  { id: "ac", icon: "\u2211", name: "Accountant",        jr: [30000, 5000],  mid: [75000, 11000],  sr: [160000, 20000] },
  { id: "hp", icon: "\u2726", name: "Hospitality",       jr: [25000, 3500],  mid: [55000, 8000],   sr: [110000, 15000] },
  { id: "mk", icon: "\u25C8", name: "Marketing",         jr: [40000, 7000],  mid: [100000, 16000], sr: [220000, 28000] },
];

const LEVELS = { jr: "Junior", mid: "Mid-level", sr: "Senior" };
const AED_TO_INR = 22.99;
const INDIAN_TAX = 0.15;

const CSS_TEXT = `
.ss-root { --ss-bg: #F5F5F7; --ss-surface: #FFFFFF; --ss-elev: #EBEBED; --ss-border: #D8D8DC; --ss-text: #0A0A0A; --ss-muted: #6B6B70; --ss-green: #1D9E75; --ss-blue: #378ADD; color-scheme: light; background: var(--ss-bg); color: var(--ss-text); font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro", system-ui, sans-serif; -webkit-font-smoothing: antialiased; min-height: 100vh; min-height: 100dvh; }
.ss-root *, .ss-overlay * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
.ss-stage { min-height: 100vh; min-height: 100dvh; display: flex; justify-content: center; }
.ss-app { width: 100%; max-width: 390px; padding: 20px 20px 40px; position: relative; }
@media (min-width: 760px) {
  .ss-stage { background: #E8E8EA; padding: 40px 0; align-items: flex-start; }
  .ss-app { background: var(--ss-bg); border: 1px solid #D0D0D4; border-radius: 44px; box-shadow: 0 40px 120px rgba(0,0,0,0.15), 0 0 0 8px #F0F0F2, 0 0 0 9px #D8D8DC; min-height: 820px; overflow: hidden; padding: 24px 20px 40px; }
}
.ss-topbar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
.ss-logo { display: flex; align-items: center; gap: 8px; font-size: 13px; letter-spacing: 0.04em; font-weight: 600; cursor: pointer; background: none; border: 0; padding: 0; color: inherit; font-family: inherit; }
.ss-logo .ss-dot { width: 22px; height: 22px; border-radius: 7px; background: #0A0A0A; display: grid; place-items: center; font-size: 12px; font-weight: 800; color: #FFFFFF; }
.ss-beta { font-size: 10px; color: var(--ss-muted); border: 1px solid var(--ss-border); padding: 3px 7px; border-radius: 999px; letter-spacing: 0.1em; }
.ss-hero h1 { font-size: 30px; line-height: 1.08; letter-spacing: -0.025em; font-weight: 700; margin: 6px 0 10px; }
.ss-hero h1 .ss-gold { color: #1D9E75; }
.ss-hero p { color: var(--ss-muted); font-size: 14px; line-height: 1.5; margin: 0; }
.ss-eyebrow { font-size: 10px; color: #378ADD; letter-spacing: 0.22em; text-transform: uppercase; font-weight: 600; display: inline-flex; align-items: center; gap: 6px; margin-bottom: 10px; }
.ss-eyebrow::before { content:""; width:5px; height:5px; border-radius:50%; background: #378ADD; box-shadow: 0 0 10px rgba(55,138,221,0.4); }
.ss-card { background: var(--ss-surface); border: 1px solid var(--ss-border); border-radius: 18px; padding: 18px; margin-top: 18px; }
.ss-card h3 { font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--ss-muted); margin: 0 0 12px; font-weight: 600; }
.ss-role-btn { width: 100%; background: var(--ss-elev); border: 1px solid var(--ss-border); border-radius: 12px; padding: 14px; color: var(--ss-text); font-size: 15px; font-family: inherit; text-align: left; display: flex; align-items: center; justify-content: space-between; gap: 10px; cursor: pointer; transition: border-color .18s cubic-bezier(.4,0,.2,1); }
.ss-role-btn:hover { border-color: #B0B0B8; }
.ss-role-btn .ss-kbd { font-family: ui-monospace, "SF Mono", monospace; font-size: 11px; color: var(--ss-muted); border: 1px solid var(--ss-border); border-radius: 5px; padding: 2px 6px; }
.ss-role-icon { width: 28px; height: 28px; border-radius: 7px; background: #E8E8EC; display:grid; place-items:center; font-size: 15px; }
.ss-role-label { display:flex; align-items:center; gap:10px; }
.ss-role-label .ss-ph { color: var(--ss-muted); }
.ss-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); z-index: 100; display: none; align-items: flex-start; justify-content: center; padding: 80px 16px 16px; }
.ss-overlay.ss-open { display: flex; }
.ss-palette { width: 100%; max-width: 420px; background: #FFFFFF; border: 1px solid #D8D8DC; border-radius: 14px; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.15); animation: ss-pop .18s cubic-bezier(.4,0,.2,1); font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro", system-ui, sans-serif; color: #0A0A0A; }
@keyframes ss-pop { from { transform: translateY(-6px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
.ss-palette input { width: 100%; background: transparent; border: 0; outline: 0; color: #0A0A0A; padding: 16px 18px; font-size: 15px; font-family: inherit; border-bottom: 1px solid #D8D8DC; }
.ss-palette input::placeholder { color: #555; }
.ss-palette ul { list-style: none; margin: 0; padding: 6px; max-height: 360px; overflow-y: auto; }
.ss-palette li { padding: 11px 12px; border-radius: 9px; cursor: pointer; display: flex; align-items: center; gap: 12px; font-size: 14px; }
.ss-palette li .ss-ri { width: 28px; height: 28px; background: #F0F0F2; border-radius: 7px; display:grid; place-items:center; font-size:14px; }
.ss-palette li.ss-sel, .ss-palette li:hover { background: #F5F5F7; }
.ss-palette li .ss-range { margin-left: auto; font-size: 11px; color: #6B6B70; font-family: ui-monospace, monospace; }
.ss-palette .ss-hint { padding: 10px 14px; border-top: 1px solid #D8D8DC; font-size: 11px; color: #6B6B70; display:flex; justify-content: space-between; }
.ss-slider-wrap { margin-top: 6px; }
.ss-snaps { display: grid; grid-template-columns: 1fr 1fr 1fr; position: relative; height: 52px; background: var(--ss-elev); border: 1px solid var(--ss-border); border-radius: 12px; overflow: hidden; }
.ss-snap { display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 500; color: #6B6B70; cursor: pointer; z-index: 2; transition: color .18s cubic-bezier(.4,0,.2,1); background: none; border: 0; font-family: inherit; padding: 0; }
.ss-snap.ss-active { color: #FFFFFF; }
.ss-snap small { display: block; font-size: 10px; font-weight: 400; opacity: 0.7; }
.ss-snap-inner { display: flex; flex-direction: column; align-items: center; gap: 2px; }
.ss-glider { position: absolute; top: 4px; left: 4px; bottom: 4px; width: calc(33.333% - 4px); background: #0A0A0A; border: 1px solid rgba(0,0,0,0.3); border-radius: 9px; transition: transform .28s cubic-bezier(.4,0,.2,1); z-index: 1; box-shadow: 0 2px 10px rgba(0,0,0,0.2); }
.ss-cta-wrap { position: relative; margin-top: 20px; padding: 2px; border-radius: 14px; overflow: hidden; }
.ss-cta-wrap::before { content: ""; position: absolute; inset: -50%; background: conic-gradient(from 0deg, #0A0A0A, #888888, #0A0A0A, #cccccc, #0A0A0A); animation: ss-spin 3.5s linear infinite; }
.ss-cta-wrap::after { content: ""; position: absolute; inset: 2px; border-radius: 12px; background: var(--ss-bg); }
.ss-cta { position: relative; z-index: 2; width: 100%; padding: 16px; background: #0A0A0A; border: 0; border-radius: 11px; color: #FFFFFF; font-weight: 700; font-size: 16px; letter-spacing: -0.005em; font-family: inherit; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: transform .12s cubic-bezier(.4,0,.2,1); }
.ss-cta:active { transform: scale(0.98); }
.ss-cta:disabled { opacity: 0.5; cursor: not-allowed; }
@keyframes ss-spin { to { transform: rotate(360deg); } }
.ss-shimmer { height: 220px; border-radius: 18px; background: linear-gradient(90deg, #EBEBED, #F5F5F7, #EBEBED); background-size: 200% 100%; animation: ss-shimmerMove 1.4s infinite; margin-top: 18px; display: grid; place-items: center; color: var(--ss-muted); font-size: 12px; letter-spacing: 0.15em; text-transform: uppercase; }
@keyframes ss-shimmerMove { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
.ss-verdict { margin-top: 18px; animation: ss-fadeUp .5s cubic-bezier(.4,0,.2,1); }
@keyframes ss-fadeUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: none; } }
.ss-compare { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.ss-col { background: var(--ss-surface); border: 1px solid var(--ss-border); border-radius: 14px; padding: 14px 12px; }
.ss-col .ss-flag { font-size: 18px; }
.ss-col h4 { margin: 4px 0 2px; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ss-muted); font-weight: 600; }
.ss-col .ss-amt { font-size: 22px; font-weight: 700; letter-spacing: -0.02em; margin: 6px 0 2px; font-variant-numeric: tabular-nums; }
.ss-col .ss-per { font-size: 11px; color: var(--ss-muted); margin: 0 0 10px; }
.ss-badge { display: inline-block; font-size: 10px; padding: 3px 7px; border-radius: 5px; font-weight: 600; letter-spacing: 0.04em; }
.ss-badge.ss-tax { background: rgba(29,158,117,0.14); color: var(--ss-green); border: 1px solid rgba(29,158,117,0.3); }
.ss-badge.ss-pre { background: rgba(55,138,221,0.14); color: var(--ss-blue); border: 1px solid rgba(55,138,221,0.3); }
.ss-col.ss-uae { background: linear-gradient(180deg, #f0faf6, #FFFFFF); border-color: rgba(29,158,117,0.3); }
.ss-verdict-line { background: var(--ss-surface); border: 1px solid var(--ss-border); border-radius: 14px; padding: 16px; margin-top: 10px; text-align: center; }
.ss-verdict-line .ss-big { font-size: 32px; font-weight: 800; color: #1D9E75; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; line-height: 1; }
.ss-verdict-line .ss-big .ss-x { font-size: 20px; vertical-align: top; margin-left: 2px; }
.ss-verdict-line .ss-sub { margin-top: 8px; font-size: 14px; line-height: 1.4; color: #0A0A0A; }
.ss-verdict-line .ss-sub b { color: #0A0A0A; font-weight: 700; }
.ss-verdict-line .ss-foot { margin-top: 6px; font-size: 11px; color: var(--ss-muted); }
.ss-share { margin-top: 14px; width: 100%; padding: 14px; background: var(--ss-elev); border: 1px solid var(--ss-border); border-radius: 12px; color: var(--ss-text); font-weight: 600; font-size: 14px; font-family: inherit; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: border-color .18s cubic-bezier(.4,0,.2,1); }
.ss-share:hover { border-color: #1D9E75; }
.ss-share svg { width: 16px; height: 16px; }
.ss-bridge { margin-top: 26px; background: var(--ss-surface); border: 1px solid var(--ss-border); border-radius: 18px; padding: 18px; position: relative; overflow: hidden; }
.ss-bridge::before { content: ""; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, #378ADD, transparent); }
.ss-bridge h3 { font-size: 18px; font-weight: 700; letter-spacing: -0.01em; margin: 0 0 6px; }
.ss-bridge h3 em { font-style: normal; color: #378ADD; }
.ss-bridge p { color: var(--ss-muted); font-size: 13px; line-height: 1.5; margin: 0 0 14px; }
.ss-bridge .ss-ctab { width: 100%; padding: 14px; background: #0A0A0A; border: 0; border-radius: 11px; color: #FFFFFF; font-weight: 700; font-size: 14.5px; font-family: inherit; cursor: pointer; transition: background-color .18s cubic-bezier(.4,0,.2,1); }
.ss-bridge .ss-ctab:hover { background: #2a2a2a; }
.ss-ats { margin-top: 16px; }
.ss-ats-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.ss-ats-head span:first-child { font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--ss-muted); font-weight: 600; }
.ss-ats-head span:last-child { font-size: 13px; font-weight: 700; color: var(--ss-text); font-variant-numeric: tabular-nums; }
.ss-ats-bar { height: 6px; background: var(--ss-elev); border-radius: 999px; overflow: hidden; position: relative; }
.ss-ats-fill { height: 100%; background: linear-gradient(90deg, #E63946, #FF6B6B); border-radius: 999px; transition: width .6s cubic-bezier(.4,0,.2,1); position: relative; }
.ss-ats-fill::after { content: ""; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent); background-size: 200% 100%; animation: ss-shimmerMove 2s infinite; }
.ss-ats-note { font-size: 11px; color: var(--ss-muted); margin-top: 8px; }
.ss-ats-note b { color: #D97706; }
.ss-disclaimer { margin-top: 24px; font-size: 10.5px; line-height: 1.5; color: #666; letter-spacing: 0.01em; text-align: center; }
.ss-toast { position: fixed; bottom: 20px; left: 50%; transform: translateX(-50%) translateY(20px); background: #0A0A0A; border: 1px solid #222; color: #fff; padding: 12px 18px; border-radius: 999px; font-size: 13px; opacity: 0; pointer-events: none; transition: opacity .25s cubic-bezier(.4,0,.2,1), transform .25s cubic-bezier(.4,0,.2,1); z-index: 200; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro", system-ui, sans-serif; }
.ss-toast.ss-show { opacity: 1; transform: translateX(-50%) translateY(0); }
.ss-toast b { color: #1D9E75; }
`;

function formatRange(data) {
  return `AED ${(data[1] / 1000).toFixed(data[1] < 10000 ? 1 : 0)}k \u00B7 \u20B9${(data[0] / 1000).toFixed(0)}k`;
}

export default function SalarySwitcher() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState(null);
  const [selectedLevel, setSelectedLevel] = useState("mid");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [toastMsg, setToastMsg] = useState("");
  const [toastVisible, setToastVisible] = useState(false);
  const [atsPct, setAtsPct] = useState(30);

  const canvasRef = useRef(null);
  const searchInputRef = useRef(null);
  const toastTimerRef = useRef(null);
  const atsIntervalRef = useRef(null);

  const filtered = useMemo(
    () => ROLES.filter((r) => r.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [searchQuery]
  );

  const safeCursor = Math.min(cursor, Math.max(0, filtered.length - 1));

  const closePalette = useCallback(() => {
    setPaletteOpen(false);
    setSearchQuery("");
    setCursor(0);
  }, []);

  const openPalette = useCallback(() => {
    setPaletteOpen(true);
    setSearchQuery("");
    setCursor(0);
    setTimeout(() => {
      if (searchInputRef.current) searchInputRef.current.focus();
    }, 30);
  }, []);

  const pickRole = useCallback(
    (id) => {
      const r = ROLES.find((x) => x.id === id);
      if (!r) return;
      setSelectedRole(r);
      closePalette();
    },
    [closePalette]
  );

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openPalette();
      }
      if (e.key === "Escape") closePalette();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [openPalette, closePalette]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
      if (atsIntervalRef.current) window.clearInterval(atsIntervalRef.current);
    };
  }, []);

  const showToast = useCallback((msg) => {
    setToastMsg(msg);
    setToastVisible(true);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastVisible(false), 2400);
  }, []);

  const onSearchKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter") {
      const item = filtered[safeCursor];
      if (item) pickRole(item.id);
    }
  };

  const levelIdx = selectedLevel === "jr" ? 0 : selectedLevel === "mid" ? 1 : 2;

  const handleCalculate = () => {
    if (!selectedRole) return;
    setLoading(true);
    setResult(null);
    window.setTimeout(() => {
      const [inr, aed] = selectedRole[selectedLevel];
      const inrAfterTax = inr * (1 - INDIAN_TAX);
      const aedInInr = aed * AED_TO_INR;
      const multiplier = aedInInr / inrAfterTax;
      const pct = Math.round((multiplier - 1) * 100);
      setResult({ role: selectedRole.name, level: selectedLevel, inr, aed, multiplier, pct });
      setLoading(false);
    }, 1500);
  };

  const exportBrag = () => {
    if (!result) return;
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    const W = 1080;
    const H = 1920;

    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, "#1a1305");
    g.addColorStop(0.5, "#0a0a0a");
    g.addColorStop(1, "#000");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const glow = ctx.createRadialGradient(W / 2, 820, 20, W / 2, 820, 700);
    glow.addColorStop(0, "rgba(217,119,6,0.35)");
    glow.addColorStop(1, "rgba(217,119,6,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = "#FFFFFF";
    ctx.beginPath();
    ctx.roundRect(80, 90, 56, 56, 14);
    ctx.fill();
    ctx.fillStyle = "#0a0a0a";
    ctx.font = '700 34px -apple-system, system-ui, sans-serif';
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";
    ctx.fillText("C", 108, 119);
    ctx.fillStyle = "#fff";
    ctx.font = '500 28px -apple-system, system-ui, sans-serif';
    ctx.textAlign = "left";
    ctx.fillText("CVPassport \u00B7 Salary Switcher", 156, 119);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = '600 26px -apple-system, system-ui, sans-serif';
    ctx.textAlign = "center";
    ctx.fillText(`${LEVELS[result.level].toUpperCase()} \u00B7 ${result.role.toUpperCase()}`, W / 2, 420);

    ctx.fillStyle = "#fff";
    ctx.font = '500 52px -apple-system, system-ui, sans-serif';
    ctx.fillText("I'm worth", W / 2, 520);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = '900 360px -apple-system, system-ui, sans-serif';
    ctx.fillText(`${result.multiplier.toFixed(1)}\u00D7`, W / 2, 820);

    ctx.fillStyle = "#fff";
    ctx.font = '600 68px -apple-system, system-ui, sans-serif';
    ctx.fillText("more in Dubai.", W / 2, 1000);

    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.strokeStyle = "rgba(217,119,6,0.3)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(80, 1120, W - 160, 320, 32);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#A0A0A0";
    ctx.font = '500 26px -apple-system, system-ui, sans-serif';
    ctx.textAlign = "left";
    ctx.fillText("DUBAI \u00B7 TAX-FREE", 130, 1200);
    ctx.textAlign = "right";
    ctx.fillText("INDIA \u00B7 PRE-TAX", W - 130, 1200);

    ctx.fillStyle = "#fff";
    ctx.font = '700 78px -apple-system, system-ui, sans-serif';
    ctx.textAlign = "left";
    const aedFmt = new Intl.NumberFormat("en-US").format(result.aed);
    ctx.fillText(`AED ${aedFmt}`, 130, 1300);
    ctx.textAlign = "right";
    const inrFmt = new Intl.NumberFormat("en-IN").format(result.inr);
    ctx.fillText(`\u20B9${inrFmt}`, W - 130, 1300);

    ctx.fillStyle = "#666";
    ctx.font = '500 24px -apple-system, system-ui, sans-serif';
    ctx.textAlign = "left";
    ctx.fillText("per month", 130, 1360);
    ctx.textAlign = "right";
    ctx.fillText("per month", W - 130, 1360);

    ctx.strokeStyle = "rgba(217,119,6,0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(W / 2, 1200);
    ctx.lineTo(W / 2, 1400);
    ctx.stroke();
    ctx.fillStyle = "#FFFFFF";
    ctx.font = '700 22px -apple-system, system-ui, sans-serif';
    ctx.textAlign = "center";
    ctx.fillText("VS", W / 2, 1310);

    ctx.fillStyle = "#A0A0A0";
    ctx.font = '500 30px -apple-system, system-ui, sans-serif';
    ctx.textAlign = "center";
    ctx.fillText("Check yours at", W / 2, 1620);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = '700 44px -apple-system, system-ui, sans-serif';
    ctx.fillText("mycvpassport.com", W / 2, 1680);

    ctx.fillStyle = "#444";
    ctx.font = '500 20px -apple-system, system-ui, sans-serif';
    ctx.fillText("Based on 2026 UAE/GCC & India market data", W / 2, 1800);

    c.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cvpassport-salary-${result.role.toLowerCase().replace(/\s+/g, "-")}-${result.level}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast(`Saved \u00B7 <b>${result.multiplier.toFixed(1)}\u00D7</b> brag card ready`);
    }, "image/png");
  };

  const handleBuildCta = () => {
    if (atsIntervalRef.current) window.clearInterval(atsIntervalRef.current);
    setAtsPct(30);
    let v = 30;
    atsIntervalRef.current = window.setInterval(() => {
      v += 4;
      if (v >= 92) {
        v = 92;
        window.clearInterval(atsIntervalRef.current);
        atsIntervalRef.current = null;
      }
      setAtsPct(v);
    }, 24);
    showToast("Heading to the builder\u2026");
    window.setTimeout(() => navigate("/builder"), 700);
  };

  const inrFmt = new Intl.NumberFormat("en-IN");
  const aedFmt = new Intl.NumberFormat("en-US");

  return (
    <>
      <Helmet>
        <title>Salary Switcher — See Your Worth in Dubai &amp; the Gulf | CVPassport</title>
        <meta name="description" content="Free tool: compare your Indian salary vs tax-free Dubai pay for your role. See the real multiplier in seconds — and share a brag card." />
        <meta name="keywords" content="CV builder UAE, ATS CV Dubai, resume builder GCC, CV maker India, ATS optimised CV, job seeker Dubai, expat CV builder, CV templates UAE" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://mycvpassport.com/salary-switcher" />
        <meta property="og:title" content="Salary Switcher — See Your Worth in Dubai &amp; the Gulf | CVPassport" />
        <meta property="og:description" content="Free tool: compare your Indian salary vs tax-free Dubai pay for your role. See the real multiplier in seconds — and share a brag card." />
        <meta property="og:url" content="https://mycvpassport.com/salary-switcher" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="en_AE" />
      </Helmet>
      <style>{CSS_TEXT}</style>
      <div className="ss-root">
        <div className="ss-stage">
          <div className="ss-app">
            <div className="ss-topbar">
              <button type="button" className="ss-logo" onClick={() => navigate("/")}>
                <div className="ss-dot">C</div> CVPassport
              </button>
              <div className="ss-beta">BETA</div>
            </div>

            <section className="ss-hero">
              <div className="ss-eyebrow">Salary Switcher · Free</div>
              <h1>
                See what you're worth <span className="ss-gold">in the Gulf.</span>
              </h1>
              <p>
                Pick your role and experience. We'll show the real spread — tax-free AED vs pre-tax INR — and how many times your money multiplies.
              </p>
            </section>

            <div className="ss-card">
              <h3>01 · Your role</h3>
              <button className="ss-role-btn" onClick={openPalette} aria-label="Pick your role">
                <span className="ss-role-label">
                  <span className="ss-role-icon">{selectedRole ? selectedRole.icon : "\u2315"}</span>
                  <span className={selectedRole ? "" : "ss-ph"}>
                    {selectedRole ? selectedRole.name : "Search roles\u2026"}
                  </span>
                </span>
                <span className="ss-kbd">⌘K</span>
              </button>

              <div style={{ height: 16 }} />
              <h3>02 · Experience</h3>
              <div className="ss-slider-wrap">
                <div className="ss-snaps">
                  <div
                    className="ss-glider"
                    style={{ transform: `translateX(${levelIdx * 100}%)` }}
                  />
                  {[
                    { key: "jr", label: "Junior", range: "0\u20132y" },
                    { key: "mid", label: "Mid", range: "3\u20137y" },
                    { key: "sr", label: "Senior", range: "8y+" },
                  ].map((lv) => (
                    <button
                      key={lv.key}
                      type="button"
                      className={`ss-snap${selectedLevel === lv.key ? " ss-active" : ""}`}
                      onClick={() => setSelectedLevel(lv.key)}
                    >
                      <div className="ss-snap-inner">
                        <span>{lv.label}</span>
                        <small>{lv.range}</small>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="ss-cta-wrap">
                <button className="ss-cta" onClick={handleCalculate} disabled={!selectedRole}>
                  Calculate my switch
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {loading && <div className="ss-shimmer">Running the numbers…</div>}

            {result && !loading && (
              <div className="ss-verdict">
                <div className="ss-compare">
                  <div className="ss-col ss-uae">
                    <div className="ss-flag">🇦🇪</div>
                    <h4>Dubai / Gulf</h4>
                    <div className="ss-amt">AED {aedFmt.format(result.aed)}</div>
                    <div className="ss-per">per month</div>
                    <span className="ss-badge ss-tax">Tax-Free</span>
                  </div>
                  <div className="ss-col">
                    <div className="ss-flag">🇮🇳</div>
                    <h4>India</h4>
                    <div className="ss-amt">₹{inrFmt.format(result.inr)}</div>
                    <div className="ss-per">per month</div>
                    <span className="ss-badge ss-pre">Pre-Tax</span>
                  </div>
                </div>
                <div className="ss-verdict-line">
                  <div className="ss-big">
                    {result.multiplier.toFixed(1)}
                    <span className="ss-x">×</span>
                  </div>
                  <div className="ss-sub">
                    In Dubai, your purchasing power <b>increases by {result.pct}%</b> as a {LEVELS[result.level]} {result.role}.
                  </div>
                  <div className="ss-foot">Take-home basis · AED @ ₹22.99 · after India's ~15% effective tax</div>
                </div>
                <button className="ss-share" onClick={exportBrag}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" />
                    <path d="M16 6l-4-4-4 4" />
                    <path d="M12 2v14" />
                  </svg>
                  Share your worth
                </button>
              </div>
            )}

            <div className="ss-bridge">
              <h3>
                You know what you're worth. <em>Does your CV?</em>
              </h3>
              <p>
                Most people applying to Gulf roles never hear back — not because they're unqualified, but because their CV never made it past the first filter. We've seen it hundreds of times.
              </p>
              <div className="ss-ats">
                <div className="ss-ats-head">
                  <span>ATS Readiness</span>
                  <span>{atsPct}%</span>
                </div>
                <div className="ss-ats-bar">
                  <div className="ss-ats-fill" style={{ width: `${atsPct}%` }} />
                </div>
                <div className="ss-ats-note">
                  Your CV might be the only thing standing between you and that call. <b>Let's fix it.</b>
                </div>
              </div>
              <div style={{ height: 14 }} />
              <button className="ss-ctab" onClick={handleBuildCta}>
                Build your Gulf-ready CV →
              </button>
            </div>

            <p className="ss-disclaimer">
              All salary figures provided are estimates based on 2026 Gulf and Indian market trends and are intended for informational purposes only. While Indian Rupee (INR) values are calculated pre-tax and UAE Dirham (AED) values are tax-free, we take no responsibility for the accuracy of these benchmarks or any subsequent financial or career decisions made using this data. Use of this free tool does not constitute professional financial advice and is provided without liability.
            </p>
          </div>
        </div>
      </div>

      <div
        className={`ss-overlay${paletteOpen ? " ss-open" : ""}`}
        onClick={(e) => {
          if (e.target === e.currentTarget) closePalette();
        }}
      >
        <div className="ss-palette" role="dialog" aria-modal="true">
          <input
            ref={searchInputRef}
            value={searchQuery}
            placeholder="Search roles — e.g. Software Engineer"
            autoComplete="off"
            onChange={(e) => { setSearchQuery(e.target.value); setCursor(0); }}
            onKeyDown={onSearchKeyDown}
          />
          <ul>
            {filtered.length === 0 ? (
              <li style={{ color: "#666" }}>No match.</li>
            ) : (
              filtered.map((r, i) => {
                const data = r[selectedLevel];
                return (
                  <li
                    key={r.id}
                    className={i === safeCursor ? "ss-sel" : ""}
                    onClick={() => pickRole(r.id)}
                    onMouseEnter={() => setCursor(i)}
                  >
                    <span className="ss-ri">{r.icon}</span>
                    <span>{r.name}</span>
                    <span className="ss-range">{formatRange(data)}</span>
                  </li>
                );
              })
            )}
          </ul>
          <div className="ss-hint">
            <span>↑↓ navigate · ↵ select</span>
            <span>esc to close</span>
          </div>
        </div>
      </div>

      <div
        className={`ss-toast${toastVisible ? " ss-show" : ""}`}
        dangerouslySetInnerHTML={{ __html: toastMsg }}
      />

      <canvas ref={canvasRef} width="1080" height="1920" style={{ display: "none" }} />
    </>
  );
}
