import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FAB } from "../components/FAB";
import { writeFabMemory } from "../components/FAB/FABLogic";
import CVPassportLogo from "../components/CVPassportLogo";
import NewCvLobby from "../components/NewCvLobby";
import { TEMPLATES, getStrength } from "../cvShared";
import { supabase } from "../appSupabaseClient";
import { loadUserResumes } from "../resumeDb";
import NoIndex from "../components/seo/NoIndex";
import AccountSheet from "../components/account/AccountSheet";
import AccountMenu from "../components/account/AccountMenu";
import "./DashboardPage.css";

const EASE = "cubic-bezier(0.4,0,0.2,1)";

/* ─── Theme palettes (Candidate Dashboard v2). Applied as CSS custom
   properties on the root, so children read var(--token) and the whole
   surface repaints on toggle. Day is default; night is one tap. ─── */
const DAY = {
  "--bg": "#F6F3EE", "--card": "#FFFFFF", "--card-2": "#FBF8F3", "--sidebar": "#FFFFFF", "--bezel": "#1A1622",
  "--text": "#17151F", "--soft": "#57535F", "--muted": "#928C99", "--border": "#EAE4DA", "--border-strong": "#D8D2C6",
  "--track": "#EFEAE1", "--skel": "#E7E1D6",
  "--hero": "linear-gradient(155deg,#241E38,#141019)",
  "--gold": "#C8892B", "--gold-strong": "#B0761E", "--gold-soft": "#F4E7D2", "--gold-card": "#F6EAD5", "--gold-border": "#EAD6B4", "--gold-ink": "#8A5A12",
  "--emerald": "#17845A", "--emerald-soft": "#DDEFE7", "--emerald-card": "#E7F3EC", "--emerald-border": "#CFE7DA", "--emerald-ink": "#0F5C3F",
  "--jobmatch": "linear-gradient(135deg,#B0761E,#C8892B)", "--navbar": "rgba(255,255,255,0.9)",
  "--ink-btn": "#17151F", "--ink-btn-fg": "#FFFFFF",
  "--card-shadow": "0 10px 24px -18px rgba(23,21,31,0.3)",
  "--shadow": "0 2px 4px rgba(23,21,31,0.04), 0 14px 34px -20px rgba(23,21,31,0.18)",
  "--danger": "#C2410C", "--overlay": "rgba(23,21,31,0.45)", "--hover": "#F1ECE4",
};
const NIGHT = {
  "--bg": "#0C0B10", "--card": "#17141E", "--card-2": "#1C1826", "--sidebar": "#100E16", "--bezel": "#000000",
  "--text": "#F4F2F7", "--soft": "#B9B4C2", "--muted": "#7C7686", "--border": "#241F2E", "--border-strong": "#322B3E",
  "--track": "#241F2E", "--skel": "#2A2434",
  "--hero": "linear-gradient(155deg,#2A2340,#151019)",
  "--gold": "#E0A458", "--gold-strong": "#E0A458", "--gold-soft": "rgba(224,164,88,0.16)", "--gold-card": "rgba(224,164,88,0.10)", "--gold-border": "rgba(224,164,88,0.24)", "--gold-ink": "#E0A458",
  "--emerald": "#2DBB86", "--emerald-soft": "rgba(45,187,134,0.16)", "--emerald-card": "rgba(45,187,134,0.10)", "--emerald-border": "rgba(45,187,134,0.24)", "--emerald-ink": "#2DBB86",
  "--jobmatch": "linear-gradient(135deg,#B0761E,#E0A458)", "--navbar": "rgba(20,18,26,0.85)",
  "--ink-btn": "#FFFFFF", "--ink-btn-fg": "#0C0B10",
  "--card-shadow": "0 12px 28px -18px rgba(0,0,0,0.7)",
  "--shadow": "0 2px 4px rgba(0,0,0,0.4), 0 16px 38px -22px rgba(0,0,0,0.7)",
  "--danger": "#F97362", "--overlay": "rgba(0,0,0,0.6)", "--hover": "#211C2B",
};

/* Token references — constant strings that resolve against whichever theme
   the root sets, so every surface (including the modals) stays in sync. */
const t = {
  bg: "var(--bg)", card: "var(--card)", card2: "var(--card-2)",
  border: "var(--border)", borderStrong: "var(--border-strong)",
  text: "var(--text)", soft: "var(--soft)", muted: "var(--muted)", track: "var(--track)",
  gold: "var(--gold-strong)", goldSoft: "var(--gold-soft)", goldInk: "var(--gold-ink)", goldBorder: "var(--gold-border)",
  emerald: "var(--emerald)", emeraldSoft: "var(--emerald-soft)", emeraldInk: "var(--emerald-ink)",
  danger: "var(--danger)", overlay: "var(--overlay)", hover: "var(--hover)",
  inkBtn: "var(--ink-btn)", inkBtnFg: "var(--ink-btn-fg)",
  cardShadow: "var(--card-shadow)", shadow: "var(--shadow)",
};

/* CV row accent tints, cycled by index (matches the design's varied look). */
const TINTS = ["var(--emerald)", "var(--gold-strong)", "#1A3A5C"];

/* ─── Icons ─── */
function IconArrowRight({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>;
}
function IconX({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6L6 18" /><path d="M6 6l12 12" /></svg>;
}
function IconGrid({ size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>;
}
function IconTarget({ size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1" /></svg>;
}
function IconCompass({ size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><polygon points="16 8 10.5 10.5 8 16 13.5 13.5 16 8" /></svg>;
}
function IconLinkedIn({ size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="3" /><line x1="7" y1="10" x2="7" y2="17" /><circle cx="7" cy="6.5" r="1.1" fill="currentColor" stroke="none" /><path d="M11 17v-4a2.5 2.5 0 0 1 5 0v4" /></svg>;
}
function IconEnvelope({ size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>;
}
function IconBolt({ size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 2L4.5 13H11l-1 9 8.5-11.5H12z" /></svg>;
}
function IconTable({ size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="9" y1="9" x2="9" y2="20" /></svg>;
}
function IconUser({ size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="7" r="4" /></svg>;
}
function IconSpark({ size = 17 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.5l1.9 5.1a3 3 0 0 0 1.8 1.8L20.8 11l-5.1 1.9a3 3 0 0 0-1.8 1.8L12 19.8l-1.9-5.1a3 3 0 0 0-1.8-1.8L3.2 11l5.1-1.9a3 3 0 0 0 1.8-1.8z" /></svg>;
}
function IconPlus({ size = 16 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
}
function IconSun({ size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4.5" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>;
}
function IconMoon({ size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>;
}
function IconSmile({ size = 20 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></svg>;
}
function IconMeh({ size = 20 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><line x1="8" y1="15" x2="16" y2="15" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></svg>;
}
function IconFrown({ size = 20 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M16 16s-1.5-2-4-2-4 2-4 2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></svg>;
}

/* ─── Helpers ─── */
function timeAgo(iso) {
  if (!iso) return "edited recently";
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.max(1, Math.floor(ms / 60000));
  if (m < 60) return `edited ${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `edited ${h}h ago`;
  const d = Math.floor(h / 24);
  return `edited ${d}d ago`;
}
/* Greeting derived from the device's local time only — no stored timezone. */
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
function getFirstName(name) {
  return String(name || "").trim().split(/\s+/)[0] || "there";
}
function getDisplayName(u) {
  let raw = u?.name;
  if (!raw && u?.email) raw = u.email.split("@")[0];
  raw = String(raw || "User").trim();
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

/* Small day/night toggle — sun in day (tap for night), moon in night. */
function ThemeToggle({ mode, onToggle, size = 42 }) {
  return (
    <button
      type="button"
      aria-label={mode === "day" ? "Switch to night mode" : "Switch to day mode"}
      onClick={onToggle}
      style={{
        width: size, height: size, flexShrink: 0, borderRadius: 13,
        background: t.card, border: `1px solid ${t.border}`, color: t.soft,
        display: "grid", placeItems: "center", cursor: "pointer",
        transition: `background 350ms ease, border-color 350ms ease, color 150ms ${EASE}`,
      }}
    >
      {mode === "day" ? <IconSun size={18} /> : <IconMoon size={18} />}
    </button>
  );
}

/* Dark ATS hero with the conic score ring. `big` = the mobile hero (ring
   centered under the label); otherwise the compact desktop hero. */
function AtsHero({ score, scored, big }) {
  const v = Math.max(0, Math.min(100, Number(score) || 0));
  const pct = scored ? v : 0;
  const display = scored && v > 0 ? v : "—";
  const ring = (outer, inner, num, sub) => (
    <div style={{ position: "relative", width: outer, height: outer, flexShrink: 0, borderRadius: "50%", background: `conic-gradient(#2DBB86 0% ${pct}%, rgba(255,255,255,0.10) ${pct}% 100%)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: inner, height: inner, borderRadius: "50%", background: "#17131F", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: num, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1 }}>{display}</span>
        <span style={{ marginTop: 3, fontSize: sub, color: "rgba(255,255,255,0.5)" }}>out of 100</span>
      </div>
    </div>
  );
  if (big) {
    return (
      <div style={{ position: "relative", borderRadius: 24, overflow: "hidden", background: "var(--hero)", padding: "24px 24px 26px", marginBottom: 14, boxShadow: "0 24px 44px -26px rgba(20,16,30,0.7)", transition: "background 350ms ease" }}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 90% at 100% 0%, rgba(224,164,88,0.28), transparent 58%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.62)" }}>ATS SCORE</p>
            <p style={{ margin: "5px 0 0", fontSize: 12.5, color: "rgba(255,255,255,0.4)" }}>{scored ? "Target 85+" : "Build a CV first"}</p>
          </div>
        </div>
        <div style={{ position: "relative", display: "flex", justifyContent: "center", paddingTop: 16 }}>{ring(186, 142, 52, 12.5)}</div>
      </div>
    );
  }
  return (
    <div style={{ position: "relative", borderRadius: 20, overflow: "hidden", background: "var(--hero)", padding: "20px 22px", boxShadow: "0 24px 44px -28px rgba(20,16,30,0.7)", transition: "background 350ms ease" }}>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(120% 90% at 100% 0%, rgba(224,164,88,0.28), transparent 58%)", pointerEvents: "none" }} />
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 20 }}>
        {ring(118, 90, 34, 10)}
        <div>
          <p style={{ margin: 0, fontSize: 11.5, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.6)" }}>ATS SCORE</p>
          <p style={{ margin: "6px 0 0", fontSize: 12, color: "rgba(255,255,255,0.42)" }}>{scored ? "Target 85+" : "Build a CV first"}</p>
        </div>
      </div>
    </div>
  );
}

/* Job match banner (gold gradient) — shared, wired to the real job match. */
function JobMatchBanner({ onClick, desktop }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: desktop ? 16 : 14, borderRadius: desktop ? 16 : 18, padding: desktop ? "16px 20px" : "16px 18px", marginBottom: desktop ? 22 : 24, background: "var(--jobmatch)", boxShadow: "0 16px 30px -18px rgba(176,118,30,0.7)", transition: "background 350ms ease" }}>
      <span style={{ width: 42, height: 42, flexShrink: 0, borderRadius: 12, background: "rgba(255,255,255,0.18)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}><IconBolt size={20} /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: desktop ? 15 : 14.5, fontWeight: 700, color: "#fff" }}>{desktop ? "Run job match on my resume" : "Run job match"}</p>
        <p style={{ margin: "3px 0 0", fontSize: desktop ? 12.5 : 12, color: "rgba(255,255,255,0.82)", lineHeight: 1.4 }}>{desktop ? "see how your CV matches specific job descriptions" : "see how your CV fits a role"}</p>
      </div>
      {desktop ? (
        <button type="button" onClick={onClick} style={{ height: 42, padding: "0 20px", border: 0, borderRadius: 11, background: "#fff", color: t.gold, fontFamily: "inherit", fontSize: 13.5, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>Job Match <IconArrowRight size={16} /></button>
      ) : (
        <button type="button" onClick={onClick} aria-label="Run job match" style={{ width: 36, height: 36, flexShrink: 0, border: 0, borderRadius: "50%", background: "#fff", color: t.gold, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><IconArrowRight size={17} /></button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   DASHBOARD PAGE v2
   ═══════════════════════════════════════════════════════════════════ */
export default function DashboardPage({
  user,
  isPro = false,
  profile,
  resumeList: resumeListProp = [],
  onBuildResume = () => {},
  onEditResume = () => {},
  onRunATS = () => {},
  onWalkIn = () => {},
  onTemplates = () => {},
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const [resumeList, setResumeList] = useState(resumeListProp);

  /* Theme — day default, persisted. Migrates old light/dark values. */
  const [mode, setMode] = useState(() => {
    try { const v = localStorage.getItem("cvp-dash-theme"); return (v === "night" || v === "dark") ? "night" : "day"; } catch { return "day"; }
  });
  useEffect(() => { try { localStorage.setItem("cvp-dash-theme", mode); } catch { /* storage unavailable */ } }, [mode]);
  const toggleTheme = () => setMode((m) => (m === "day" ? "night" : "day"));
  const themeVars = mode === "night" ? NIGHT : DAY;

  useEffect(() => { setResumeList(resumeListProp); }, [resumeListProp]);

  // user_type gates the "Switch to Employer" item in the account popover.
  const [dashUserType, setDashUserType] = useState(null);
  useEffect(() => {
    if (!supabase || !user?.id) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.from("profiles").select("user_type").eq("id", user.id).maybeSingle();
        if (!cancelled) setDashUserType(data?.user_type || null);
      } catch { /* switcher stays hidden */ }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  // Keep the CV list fresh (initial load + on tab focus).
  useEffect(() => {
    if (!user?.id) return undefined;
    let cancelled = false;
    const refetch = async () => {
      try { const data = await loadUserResumes(user.id); if (!cancelled) setResumeList(data || []); }
      catch (err) { console.error("[Dashboard] refetch failed", err); }
    };
    refetch();
    const onVis = () => { if (document.visibilityState === "visible") refetch(); };
    document.addEventListener("visibilitychange", onVis);
    return () => { cancelled = true; document.removeEventListener("visibilitychange", onVis); };
  }, [user?.id]);

  // Glovebox interceptor — bounce to a pending journey (e.g. LinkedIn unlock).
  useEffect(() => {
    let saved;
    try { saved = sessionStorage.getItem("cvp_pending_journey"); } catch { saved = null; }
    if (!saved) return;
    try {
      const journey = JSON.parse(saved);
      if (journey?.path === "/linkedin-optimizer") {
        sessionStorage.removeItem("cvp_pending_journey");
        navigate("/linkedin-optimizer", { replace: true });
      }
    } catch { /* corrupt payload */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [active, setActive] = useState("mycvs");
  const [mobileTab, setMobileTab] = useState("mycvs");
  const [lobbyOpen, setLobbyOpen] = useState(false);
  /* Account surfaces — Claude Design "Account Sheet" (Turn 1). The old
     "Your plan" modal is replaced by the mobile bottom sheet (1a/1c);
     cancelStep is UNCHANGED and now drives the same two-step cancel flow
     inside the sheet's Account & plan screen for paid users. */
  const [accountSheetOpen, setAccountSheetOpen] = useState(false);
  const [cancelStep, setCancelStep] = useState(0);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSentiment, setFeedbackSentiment] = useState(null);
  const [feedbackContext, setFeedbackContext] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackError, setFeedbackError] = useState(null);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [userPopoverOpen, setUserPopoverOpen] = useState(false);
  const userCardRef = useRef(null);
  const userPopoverRef = useRef(null);

  useEffect(() => { writeFabMemory({ lastTabVisited: active }); }, [active]);
  useEffect(() => { if (accountSheetOpen) setCancelStep(0); }, [accountSheetOpen]);

  // Outside-click + Escape close for the desktop user popover.
  useEffect(() => {
    if (!userPopoverOpen) return undefined;
    function onDoc(e) {
      if (userPopoverRef.current?.contains(e.target)) return;
      if (userCardRef.current?.contains(e.target)) return;
      setUserPopoverOpen(false);
    }
    function onKey(e) { if (e.key === "Escape") setUserPopoverOpen(false); }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [userPopoverOpen]);

  useEffect(() => {
    if (!feedbackOpen) return undefined;
    function onKey(e) { if (e.key === "Escape") setFeedbackOpen(false); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [feedbackOpen]);

  // Honor ?tab=ats from post-auth redirects.
  const atsDeeplinkHandledRef = useRef(false);
  useEffect(() => {
    if (atsDeeplinkHandledRef.current) return;
    const params = new URLSearchParams(location.search);
    if (params.get("tab") === "ats") { atsDeeplinkHandledRef.current = true; onRunATS(); }
  }, [location.search, onRunATS]);

  /* + New CV — first-CV users see the lobby; returning users go to a blank builder. */
  const handleStartNewCv = () => {
    if (resumeList.length === 0) setLobbyOpen(true);
    else onBuildResume();
  };
  const openAccount = () => setAccountSheetOpen(true);
  const runJobMatch = () => navigate("/builder?tab=jobmatch");

  const planLabel = isPro ? "Pro" : "Free";
  const isPaid = isPro;
  const initials = useMemo(() => {
    const parts = String(user?.name || "").trim().split(/\s+/).filter(Boolean);
    return ((parts[0]?.[0] || "U") + (parts[1]?.[0] || "")).toUpperCase();
  }, [user?.name]);

  const lastResume = resumeList[0];
  const lastTitle = lastResume?.title || lastResume?.cv_data?.personalInfo?.fullName || lastResume?.cv_data?.name || lastResume?.name || null;
  const firstCv = lastResume?.cv_data || null;
  const firstStrength = firstCv ? getStrength(firstCv) : 0;
  const scored = resumeList.length > 0 && firstStrength > 0;

  /* CV rows (real, clickable to open/edit). */
  const cvRows = resumeList.slice(0, 3).map((r, idx) => {
    const raw = r?.title || r?.cv_data?.personalInfo?.fullName || r?.cv_data?.name || r?.name || "My CV";
    return { r, id: r?.id ?? idx, name: raw, edited: timeAgo(r?.updated_at), score: getStrength(r?.cv_data || r), tint: TINTS[idx % TINTS.length] };
  });

  /* CV health, derived from the active CV's fields + stored job match. */
  const healthBars = useMemo(() => {
    if (!firstCv) return null;
    const cv = firstCv;
    const kw = [cv.skills, cv.summary].filter(Boolean).length;
    const fmt = [cv.name, cv.title, cv.email, cv.phone, cv.location].filter(Boolean).length;
    const ach = [
      Array.isArray(cv.experience) && cv.experience.some((e) => e?.company || e?.role),
      Array.isArray(cv.education) && cv.education.some((e) => e?.school || e?.degree),
    ].filter(Boolean).length;
    return {
      keywords: Math.min(100, Math.round((kw / 2) * 100)),
      format: Math.min(100, Math.round((fmt / 5) * 100)),
      achievements: Math.min(100, Math.round((ach / 2) * 100)),
    };
  }, [firstCv]);

  const healthRows = healthBars ? [
    { label: "Keywords", value: healthBars.keywords },
    { label: "Format", value: healthBars.format },
    { label: "Achievements", value: healthBars.achievements },
    { label: "Job Match", value: lastResume?.job_match_score ?? null },
  ] : [];

  const tplItems = TEMPLATES.slice(0, 3);

  const greeting = getGreeting();
  const firstName = getFirstName(user?.name);
  const displayName = getDisplayName(user);
  const desktopSub = resumeList.length > 0
    ? `${displayName.toUpperCase()}${lastTitle ? ` — ${lastTitle}` : ""} · ${timeAgo(lastResume?.updated_at)}`
    : `${displayName.toUpperCase()} · welcome`;

  /* Nav definitions. */
  const sideNav = [
    { id: "mycvs", label: "My CVs", Icon: IconGrid, go: () => setActive("mycvs") },
    { id: "ats", label: "ATS Check", Icon: IconTarget, go: () => { setActive("ats"); onRunATS(); } },
    { id: "scout", label: "Scout", Icon: IconCompass, go: () => { setActive("scout"); navigate("/scout"); } },
    { id: "linkedin", label: "LinkedIn", Icon: IconLinkedIn, go: () => { setActive("linkedin"); navigate("/linkedin-optimizer"); } },
    { id: "cover", label: "Cover Letter", Icon: IconEnvelope, go: () => { setActive("cover"); navigate("/cover-letter"); } },
    { id: "walkin", label: "Walk-In Mode", Icon: IconBolt, go: () => { setActive("walkin"); onWalkIn(); } },
    { id: "templates", label: "Templates", Icon: IconTable, go: () => { setActive("templates"); onTemplates(); } },
  ];
  const bottomNav = [
    { id: "mycvs", label: "My CVs", Icon: IconGrid, go: () => { setMobileTab("mycvs"); window.scrollTo({ top: 0, behavior: "smooth" }); } },
    { id: "ats", label: "ATS", Icon: IconTarget, go: () => { setMobileTab("ats"); onRunATS(); } },
    { id: "scout", label: "Scout", Icon: IconCompass, go: () => { setMobileTab("scout"); navigate("/scout"); } },
    { id: "cover", label: "Cover", Icon: IconEnvelope, go: () => { setMobileTab("cover"); navigate("/cover-letter"); } },
    { id: "account", label: "Account", Icon: IconUser, go: () => { setMobileTab("account"); openAccount(); } },
  ];

  /* ── Shared card blocks ── */
  const CvCard = ({ variant }) => {
    const desktop = variant === "desktop";
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, letterSpacing: "-0.01em", color: t.text }}>My CVs</h3>
          <span role="button" tabIndex={0} onClick={handleStartNewCv} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleStartNewCv(); }} style={{ fontSize: 13, fontWeight: 700, color: t.gold, cursor: "pointer" }}>New</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: desktop ? 10 : 11 }}>
          {cvRows.length === 0 ? (
            <div style={{ fontSize: 13, color: t.muted, padding: "14px 0" }}>No CVs yet. Tap New to build your first.</div>
          ) : cvRows.map((cv) => (
            <div
              key={cv.id}
              role="button"
              tabIndex={0}
              onClick={() => onEditResume(cv.r)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onEditResume(cv.r); }}
              style={{ display: "flex", alignItems: "center", gap: 13, padding: desktop ? "13px 14px" : 14, borderRadius: desktop ? 14 : 16, background: t.card, border: `1px solid ${t.border}`, boxShadow: desktop ? "none" : t.cardShadow, cursor: "pointer" }}
            >
              <span style={{ width: desktop ? 34 : 40, height: desktop ? 42 : 48, flexShrink: 0, borderRadius: desktop ? 7 : 8, background: t.card2, border: `1px solid ${t.border}`, position: "relative", overflow: "hidden" }}>
                <span style={{ position: "absolute", top: 0, left: 0, right: 0, height: desktop ? 10 : 11, background: cv.tint }} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: t.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cv.name}</p>
                <p style={{ margin: `${desktop ? 3 : 4}px 0 0`, fontSize: 11.5, color: t.muted }}>{cv.edited}</p>
              </div>
              <span style={{ width: desktop ? 38 : 40, height: desktop ? 38 : 40, flexShrink: 0, borderRadius: desktop ? 10 : 11, background: t.emeraldSoft, color: t.emerald, fontSize: desktop ? 13.5 : 14, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>{cv.score > 0 ? cv.score : "—"}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const HealthCard = ({ variant }) => {
    const desktop = variant === "desktop";
    return (
      <div style={{ borderRadius: 18, padding: desktop ? "18px 20px 6px" : "18px 18px 6px", background: t.card, border: `1px solid ${t.border}`, boxShadow: desktop ? "none" : t.cardShadow, alignSelf: "start" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, letterSpacing: "-0.01em", color: t.text }}>CV Health</h3>
          <span role="button" tabIndex={0} onClick={() => onRunATS()} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onRunATS(); }} style={{ fontSize: 12.5, fontWeight: 700, color: t.gold, cursor: "pointer" }}>Full report →</span>
        </div>
        {healthRows.length === 0 ? (
          <div style={{ fontSize: 13, color: t.muted, padding: "16px 0" }}>Build a CV to see health data.</div>
        ) : healthRows.map((h, i) => {
          const present = h.value != null;
          const pct = present ? `${Math.max(0, Math.min(100, h.value))}%` : "0%";
          return (
            <div key={h.label} style={{ display: "flex", alignItems: "center", gap: 12, padding: `${desktop ? 14 : 13}px 0`, borderBottom: i === healthRows.length - 1 ? "none" : `1px solid ${t.border}` }}>
              <span style={{ flex: 1, fontSize: desktop ? 14 : 13.5, color: t.soft, fontWeight: 500 }}>{h.label}</span>
              <div style={{ width: desktop ? 90 : 74, height: 6, borderRadius: 999, background: t.track, overflow: "hidden" }}>
                <div style={{ width: pct, height: "100%", borderRadius: 999, background: present ? t.emerald : "transparent" }} />
              </div>
              <span style={{ minWidth: desktop ? 36 : 34, textAlign: "right", fontSize: desktop ? 15 : 14, fontWeight: 800, color: present ? t.text : t.muted }}>{present ? h.value : "—"}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const StatTile = ({ kind }) => {
    if (kind === "cvs") {
      return (
        <div style={{ borderRadius: 20, padding: 18, background: "var(--emerald-card)", border: "1px solid var(--emerald-border)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ margin: 0, fontSize: 11.5, fontWeight: 700, letterSpacing: "0.06em", color: t.emerald }}>CVS BUILT</p>
            <IconGrid size={17} />
          </div>
          <p style={{ margin: "16px 0 0", fontSize: 40, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 0.9, color: t.emeraldInk }}>{resumeList.length}</p>
          <p style={{ margin: "9px 0 0", fontSize: 11.5, color: t.emerald, opacity: 0.85 }}>{lastResume ? timeAgo(lastResume?.updated_at) : "start below"}</p>
        </div>
      );
    }
    return (
      <div style={{ borderRadius: 20, padding: 18, background: "var(--gold-card)", border: "1px solid var(--gold-border)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ margin: 0, fontSize: 11.5, fontWeight: 700, letterSpacing: "0.06em", color: t.gold }}>PLAN</p>
          <IconSpark size={17} />
        </div>
        <p style={{ margin: "12px 0 0", fontSize: 34, fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1, color: t.goldInk }}>{planLabel}</p>
        {isPaid ? (
          <span style={{ display: "inline-flex", alignItems: "center", marginTop: 12, fontSize: 11, fontWeight: 700, color: t.emerald, background: t.emeraldSoft, borderRadius: 7, padding: "4px 10px" }}>Active</span>
        ) : (
          <span role="button" tabIndex={0} onClick={() => navigate("/pricing")} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") navigate("/pricing"); }} style={{ display: "inline-flex", alignItems: "center", marginTop: 12, fontSize: 12, fontWeight: 700, color: t.gold, cursor: "pointer" }}>Upgrade →</span>
        )}
      </div>
    );
  };

  const TemplatesStrip = () => (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, letterSpacing: "-0.01em", color: t.text }}>Templates</h3>
        <span role="button" tabIndex={0} onClick={() => navigate("/templates")} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") navigate("/templates"); }} style={{ fontSize: 13, fontWeight: 700, color: t.gold, cursor: "pointer" }}>View all →</span>
      </div>
      <div className="noscroll dashv2-tpl-row">
        {tplItems.map((tpl, i) => (
          <button
            key={tpl.id}
            type="button"
            onClick={() => navigate("/builder", { state: { cvpInitialTemplateId: tpl.id } })}
            style={{ flex: "0 0 148px", textAlign: "left", padding: 0, borderRadius: 16, overflow: "hidden", background: t.card, border: `1px solid ${t.border}`, boxShadow: t.cardShadow, cursor: "pointer", fontFamily: "inherit" }}
          >
            <div style={{ height: 104, background: t.card2, padding: 16, borderBottom: `1px solid ${t.border}`, boxSizing: "border-box" }}>
              <div style={{ height: 5, width: "56%", borderRadius: 3, background: TINTS[i % TINTS.length], marginBottom: 11 }} />
              <div style={{ height: 3.5, width: "90%", borderRadius: 2, background: "var(--skel)", marginBottom: 7 }} />
              <div style={{ height: 3.5, width: "74%", borderRadius: 2, background: "var(--skel)", marginBottom: 7 }} />
              <div style={{ height: 3.5, width: "82%", borderRadius: 2, background: "var(--skel)" }} />
            </div>
            <div style={{ padding: "12px 14px 14px" }}>
              <p style={{ margin: "0 0 8px", fontSize: 13, fontWeight: 700, color: t.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tpl.name}</p>
              <span style={{ display: "inline-flex", fontSize: 10.5, fontWeight: 700, color: t.emerald, background: t.emeraldSoft, borderRadius: 6, padding: "3px 8px" }}>ATS-ready</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const resetFeedback = () => { setFeedbackText(""); setFeedbackContext(""); setFeedbackSentiment(null); setFeedbackError(null); };
  const handleFeedbackSend = async () => {
    const message = feedbackText.trim();
    if (!message || feedbackSending) return;
    setFeedbackSending(true);
    setFeedbackError(null);
    try {
      if (!supabase) throw new Error("offline");
      const { error } = await supabase.from("candidate_feedback").insert({
        message: message.slice(0, 4000), sentiment: feedbackSentiment,
        context: feedbackContext.trim().slice(0, 500) || null, page: "/dashboard",
      });
      if (error) throw error;
      setFeedbackSent(true);
      setTimeout(() => { setFeedbackSent(false); setFeedbackOpen(false); resetFeedback(); }, 1600);
    } catch { setFeedbackError("Could not send just yet. Please try again in a moment."); }
    finally { setFeedbackSending(false); }
  };
  const handleSignOut = async () => { if (supabase) await supabase.auth.signOut(); navigate("/"); };

  return (
    <div className="dashv2-root" data-theme={mode} style={themeVars}>
      <NoIndex />

      {/* ═══════════════ DESKTOP VIEW ═══════════════ */}
      <div className="dashv2-desktop-view">
        <div className="dashv2-shell">
          {/* Sidebar */}
          <aside className="dashv2-sidebar">
            <Link to="/" style={{ display: "flex", alignItems: "center", gap: 9, padding: "2px 8px 20px", color: t.text, textDecoration: "none" }}>
              <CVPassportLogo height={20} color="currentColor" />
            </Link>
            <nav style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {sideNav.map((s) => {
                const on = active === s.id;
                return (
                  <button key={s.id} type="button" onClick={s.go} className="dashv2-side-item"
                    style={{ background: on ? t.goldSoft : "transparent", color: on ? t.goldInk : t.muted, fontWeight: on ? 700 : 500 }}
                    onMouseEnter={(e) => { if (!on) { e.currentTarget.style.background = t.hover; e.currentTarget.style.color = t.text; } }}
                    onMouseLeave={(e) => { if (!on) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = t.muted; } }}
                  >
                    <span style={{ display: "flex", width: 18 }}><s.Icon size={17} /></span>
                    <span>{s.label}</span>
                  </button>
                );
              })}
            </nav>
            {/* User card + popover */}
            <div style={{ marginTop: "auto", position: "relative" }}>
              {/* 1b — desktop account popover. Opens upward from the user
                  row; Esc / outside-click / a second click close it. */}
              <AccountMenu
                open={userPopoverOpen}
                onClose={() => setUserPopoverOpen(false)}
                user={user}
                planLabel={planLabel}
                initials={initials}
                onSignOut={handleSignOut}
                anchorRef={userCardRef}
                popoverRef={userPopoverRef}
                /* Dual-role accounts keep their existing doorway into the
                   employer portal — a different audience's route, not one of
                   the account rows the design specifies. */
                extraRow={
                  dashUserType === "both" || dashUserType === "recruiter"
                    ? { label: "Switch to employer", to: "/employer/jobs" }
                    : null
                }
              />
              <button ref={userCardRef} type="button" aria-haspopup="menu" aria-expanded={userPopoverOpen} onClick={() => setUserPopoverOpen((v) => !v)}
                style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", padding: "11px 12px", border: `1px solid ${t.border}`, borderRadius: 14, background: t.card, cursor: "pointer", fontFamily: "inherit", textAlign: "left", color: t.text }}>
                <span style={{ width: 34, height: 34, borderRadius: "50%", background: t.goldSoft, color: t.gold, fontSize: 12.5, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{initials}</span>
                <div style={{ minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{displayName}</p>
                  <span style={{ display: "inline-block", marginTop: 3, fontSize: 10, fontWeight: 700, color: t.gold, background: t.goldSoft, borderRadius: 6, padding: "1px 7px" }}>{planLabel}</span>
                </div>
              </button>
            </div>
          </aside>

          {/* Main */}
          <main className="dashv2-main noscroll">
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 22 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em", color: t.text }}>{greeting}, {firstName}.</h2>
                <p style={{ margin: "6px 0 0", fontSize: 13, color: t.muted }}>{desktopSub}</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <ThemeToggle mode={mode} onToggle={toggleTheme} />
                <button type="button" onClick={handleStartNewCv} style={{ height: 42, padding: "0 18px", border: 0, borderRadius: 12, background: t.inkBtn, color: t.inkBtnFg, fontFamily: "inherit", fontSize: 13.5, fontWeight: 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <IconPlus size={16} /> New CV
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
              <AtsHero score={firstStrength} scored={scored} big={false} />
              <StatTile kind="cvs" />
              <StatTile kind="plan" />
            </div>

            <JobMatchBanner onClick={runJobMatch} desktop />

            <div style={{ display: "grid", gridTemplateColumns: "1.1fr 1fr", gap: 18 }}>
              <CvCard variant="desktop" />
              <HealthCard variant="desktop" />
            </div>
          </main>
        </div>
      </div>

      {/* ═══════════════ MOBILE VIEW ═══════════════ */}
      <div className="dashv2-mobile-view">
        <div className="dashv2-mv-scroll">
          <div className="dashv2-mv-inner">
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <button type="button" onClick={openAccount} aria-label="Account and plan" style={{ width: 44, height: 44, flexShrink: 0, borderRadius: "50%", background: t.goldSoft, color: t.gold, fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: 0, cursor: "pointer", fontFamily: "inherit" }}>{initials}</button>
              {/* The NAME is a trigger too, not just the avatar — the design
                  routes "name tap / Account tab → the account sheet". */}
              <button
                type="button"
                onClick={openAccount}
                aria-label="Account and plan"
                style={{ flex: 1, minWidth: 0, background: "none", border: 0, padding: 0, textAlign: "left", cursor: "pointer", fontFamily: "inherit" }}
              >
                <p style={{ margin: 0, fontSize: 13, color: t.muted }}>{greeting}</p>
                <p style={{ margin: "2px 0 0", fontSize: 19, fontWeight: 800, letterSpacing: "-0.02em", color: t.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayName}</p>
              </button>
              <ThemeToggle mode={mode} onToggle={toggleTheme} />
            </div>

            <AtsHero score={firstStrength} scored={scored} big />

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
              <StatTile kind="cvs" />
              <StatTile kind="plan" />
            </div>

            <JobMatchBanner onClick={runJobMatch} />

            <div style={{ marginBottom: 24 }}><CvCard variant="mobile" /></div>

            <div style={{ marginBottom: 24 }}><HealthCard variant="mobile" /></div>

            <TemplatesStrip />
          </div>
        </div>

        {/* Bottom nav — fades out behind the account sheet and returns on
            close, per the design's mobile build spec. */}
        <nav
          className="dashv2-bottomnav"
          style={{
            opacity: accountSheetOpen ? 0 : 1,
            pointerEvents: accountSheetOpen ? "none" : "auto",
            transition: `opacity 200ms ${EASE}`,
          }}
        >
          {bottomNav.map((b) => {
            const on = mobileTab === b.id;
            const color = on ? t.gold : t.muted;
            return (
              <button key={b.id} type="button" onClick={b.go} className="dashv2-tab" style={{ color }}>
                <b.Icon size={21} />
                <span className="dashv2-tab__label">{b.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* ═══ NEW CV LOBBY ═══ */}
      {lobbyOpen && (
        <NewCvLobby
          onGuided={() => { setLobbyOpen(false); onBuildResume({ openFabGuide: true }); }}
          onBuildMyself={() => { setLobbyOpen(false); onBuildResume(); }}
          onClose={() => setLobbyOpen(false)}
        />
      )}

      {/* ═══ ACCOUNT SHEET (1a) + ACCOUNT & PLAN (1c) ═══
           Replaces the old "Your plan" modal as the destination of the
           name/avatar tap and the Account tab. The two-step cancel flow the
           modal owned now renders inside the sheet for paid users only —
           same steps, same copy, same mailto, logic untouched. ═══ */}
      <AccountSheet
        open={accountSheetOpen}
        onClose={() => setAccountSheetOpen(false)}
        user={user}
        isPaid={isPaid}
        planLabel={planLabel}
        initials={initials}
        onSignOut={handleSignOut}
        cancelStep={cancelStep}
        onCancelStart={() => setCancelStep(1)}
        onCancelKeep={() => setCancelStep(0)}
      />

      {/* ═══ FEEDBACK MODAL ═══ */}
      {feedbackOpen && (
        <>
          <div role="presentation" style={{ position: "fixed", inset: 0, zIndex: 500, background: t.overlay, backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }} onClick={() => setFeedbackOpen(false)} />
          <div role="dialog" aria-modal="true" aria-label="Send feedback" style={{ position: "fixed", left: "50%", top: "50%", transform: "translate(-50%, -50%)", zIndex: 501, width: "calc(100% - 32px)", maxWidth: 440, maxHeight: "calc(100vh - 40px)", overflowY: "auto", background: t.card, border: `1px solid ${t.borderStrong}`, borderRadius: 16, padding: 20, boxSizing: "border-box" }}>
            <button type="button" onClick={() => setFeedbackOpen(false)} aria-label="Close" style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", color: t.muted, cursor: "pointer", padding: 4 }}><IconX /></button>
            {!feedbackSent ? (
              <>
                <div style={{ fontSize: 17, fontWeight: 700, color: t.text }}>Your feedback shapes CVPassport</div>
                <div style={{ fontSize: 12.5, color: t.soft, marginTop: 6, lineHeight: 1.5 }}>Every bit helps us improve this for you. Tell us what is working and what is not.</div>
                <div style={{ marginTop: 18 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: t.text, marginBottom: 8 }}>How do you feel about CVPassport?</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {[{ key: "positive", label: "Good", Icon: IconSmile, color: t.emerald }, { key: "neutral", label: "Okay", Icon: IconMeh, color: t.gold }, { key: "negative", label: "Not great", Icon: IconFrown, color: t.danger }].map(({ key, label, Icon, color }) => {
                      const sel = feedbackSentiment === key;
                      return (
                        <button key={key} type="button" onClick={() => setFeedbackSentiment(sel ? null : key)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, padding: "12px 6px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit", background: sel ? "var(--gold-soft)" : "transparent", border: `1.5px solid ${sel ? color : t.borderStrong}`, color: sel ? color : t.soft }}>
                          <Icon size={20} /><span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: t.text, marginBottom: 6 }}>What would make this better for you?</div>
                  <textarea value={feedbackText} onChange={(e) => setFeedbackText(e.target.value)} maxLength={4000} placeholder="Share your thoughts, ideas, or issues" style={{ width: "100%", minHeight: 100, resize: "vertical", background: t.bg, border: `1px solid ${t.borderStrong}`, borderRadius: 8, padding: "10px 12px", color: t.text, fontSize: 13, fontFamily: "inherit", lineHeight: 1.5, outline: "none", boxSizing: "border-box" }} />
                </div>
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: t.text, marginBottom: 6 }}>What were you trying to do? (optional)</div>
                  <input value={feedbackContext} onChange={(e) => setFeedbackContext(e.target.value)} maxLength={500} placeholder="E.g. create a new CV, check ATS score" style={{ width: "100%", height: 40, background: t.bg, border: `1px solid ${t.borderStrong}`, borderRadius: 8, padding: "0 12px", color: t.text, fontSize: 13, fontFamily: "inherit", outline: "none", boxSizing: "border-box" }} />
                </div>
                {feedbackError && <div role="status" style={{ fontSize: 12, color: t.danger, marginTop: 10 }}>{feedbackError}</div>}
                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginTop: 18, gap: 8 }}>
                  <button type="button" onClick={() => setFeedbackOpen(false)} style={{ padding: "9px 16px", borderRadius: 8, background: "transparent", border: `1px solid ${t.borderStrong}`, color: t.soft, fontSize: 12.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit" }}>Cancel</button>
                  <button type="button" onClick={handleFeedbackSend} disabled={!feedbackText.trim() || feedbackSending} style={{ padding: "9px 18px", borderRadius: 8, background: t.gold, border: "none", color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: feedbackText.trim() && !feedbackSending ? 1 : 0.5 }}>{feedbackSending ? "Sending…" : "Send feedback"}</button>
                </div>
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "20px 8px" }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: t.emeraldSoft, display: "grid", placeItems: "center", marginBottom: 14, color: t.emerald }}><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg></div>
                <div style={{ fontSize: 17, fontWeight: 700, color: t.text, marginBottom: 6 }}>Thank you</div>
                <div style={{ fontSize: 13, color: t.soft, lineHeight: 1.5, maxWidth: 280 }}>We read every message and use your feedback to make CVPassport better.</div>
              </div>
            )}
          </div>
        </>
      )}

      <FAB tabKey={active === "account" ? "account" : "mycvs"} cvsCount={resumeList.length} />
    </div>
  );
}
