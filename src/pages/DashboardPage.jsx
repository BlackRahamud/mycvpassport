import { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FAB } from "../components/FAB";
import { writeFabMemory } from "../components/FAB/FABLogic";
import { getPaymentLink } from "../utils/paywall";
import CVPassportLogo from "../components/CVPassportLogo";
import NewCvLobby from "../components/NewCvLobby";
import { TEMPLATES, getStrength } from "../cvShared";
import { supabase } from "../appSupabaseClient";
import { loadUserResumes } from "../resumeDb";
import "./DashboardPage.css";

const EASE = "cubic-bezier(0.4,0,0.2,1)";

/* ─── Icons ─── */
function IconArrowRight({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
    </svg>
  );
}
function IconX({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6L6 18" /><path d="M6 6l12 12" />
    </svg>
  );
}
/* Sidebar icons */
function IconGrid({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}
function IconTarget({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  );
}
function IconEnvelope({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 7l-10 7L2 7" />
    </svg>
  );
}
function IconBolt({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" />
    </svg>
  );
}
function IconTable({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M3 15h18" /><path d="M9 3v18" />
    </svg>
  );
}
function IconLinkedIn({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="8" cy="9" r="0.6" fill="currentColor" />
      <path d="M8 11.5v5.5" />
      <path d="M12 11.5v5.5" />
      <path d="M12 14a2.5 2.5 0 0 1 5 0v3" />
    </svg>
  );
}
function IconCompass({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}
function IconMore({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="6" cy="12" r="1.2" fill="currentColor" />
      <circle cx="12" cy="12" r="1.2" fill="currentColor" />
      <circle cx="18" cy="12" r="1.2" fill="currentColor" />
    </svg>
  );
}
function IconHelp({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 115 0c0 1.5-2.5 2-2.5 4" />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" />
    </svg>
  );
}
function IconGear({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9 1.65 1.65 0 004.27 7.18l-.06-.06A2 2 0 117.04 4.29l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
    </svg>
  );
}
function IconSpark({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2l1.9 5.8L20 10l-6.1 2.2L12 18l-1.9-5.8L4 10l6.1-2.2L12 2z" />
    </svg>
  );
}
function IconSignOut({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
function IconChat({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    </svg>
  );
}
function IconSmile({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  );
}
function IconMeh({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" /><line x1="8" y1="15" x2="16" y2="15" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  );
}
function IconFrown({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" /><path d="M16 16s-1.5-2-4-2-4 2-4 2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  );
}

/* ATS score ring gauge — the hero metric. Colour comes from the existing
   scoreColor logic (green >= 80, amber >= 60, red below), passed in. */
function AtsRing({ score, color }) {
  const size = 132, stroke = 11, r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, Number(score) || 0));
  const off = circ - (pct / 100) * circ;
  return (
    <div style={{ position: "relative", width: size, height: size, margin: "4px auto 0" }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#1a1a1a" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
          style={{ transition: `stroke-dashoffset 900ms ${EASE}` }}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 34, fontWeight: 700, color, letterSpacing: "-1px", lineHeight: 1 }}>{score > 0 ? score : "—"}</div>
        <div style={{ fontSize: 10, color: "#3a3a3a", marginTop: 4 }}>out of 100</div>
      </div>
    </div>
  );
}

/* ─── Helpers ─── */
function timeAgo(iso) {
  if (!iso) return "edited —";
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.max(1, Math.floor(ms / 60000));
  if (m < 60) return `edited ${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `edited ${h}h ago`;
  const d = Math.floor(h / 24);
  return `edited ${d}d ago`;
}
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
  raw = raw.charAt(0).toUpperCase() + raw.slice(1);
  if (raw.length > 16) return raw.slice(0, 16) + "…";
  return raw;
}
function scoreColor(s) {
  if (s >= 80) return "#1D9E75";
  if (s >= 60) return "#FFB300";
  return "#D85A30";
}

/* Smart Nudge */
function getNudge(resumeList) {
  if (!resumeList || resumeList.length === 0) return null;
  const first = resumeList[0];
  const title = first?.title || first?.cv_data?.name || first?.name || "My CV";
  const strength = getStrength(first?.cv_data || first);
  if (strength === 0 || strength === undefined)
    return { text: `Run ATS on "${title}"`, actionLabel: "Run ATS →", action: "ats" };
  if (!first?.job_match_score)
    return { text: `Run Job Match on "${title}"`, actionLabel: "Job Match →", action: "jobmatch" };
  if (!first?.has_cover_letter)
    return { text: `Write a cover letter for "${title}"`, actionLabel: "Cover Letter →", action: "coverletter" };
  return null;
}

/* ═══════════════════════════════════════════════════════════════════
   DASHBOARD PAGE — redesigned
   ═══════════════════════════════════════════════════════════════════ */
export default function DashboardPage({
  user,
  isPro = false,
  profile,
  resumeList: resumeListProp = [],
  onBuildResume = () => {},
  onEditResume = () => {},
  onDelete = null,
  onRunATS = () => {},
  onWalkIn = () => {},
  onTemplates = () => {},
}) {
  const [resumeList, setResumeList] = useState(resumeListProp);

  useEffect(() => { setResumeList(resumeListProp); }, [resumeListProp]);

  useEffect(() => {
    if (!user?.id) return undefined;
    let cancelled = false;
    const refetch = async () => {
      try {
        const data = await loadUserResumes(user.id);
        if (!cancelled) setResumeList(data || []);
      } catch (err) {
        console.error("[Dashboard] refetch failed", err);
      }
    };
    refetch();
    const onVis = () => { if (document.visibilityState === "visible") refetch(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [user?.id]);
  const navigate = useNavigate();
  const location = useLocation();
  const fabRouteTab = location.state?.fabGuideTab === "account" ? "account" : "mycvs";

  // Glovebox interceptor — if the user landed on /dashboard because the
  // useCvpAuth allow-list defaulted here, but they actually had a pending
  // journey (e.g. LinkedIn unlock), bounce them to the correct lane before
  // the dashboard paints. Does not clear sessionStorage — the destination
  // component owns consumption so its layout-effect can restore state.
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
    } catch { /* corrupt payload — let the destination clean it up */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [active, setActive] = useState("mycvs");
  const [lobbyOpen, setLobbyOpen] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [cancelStep, setCancelStep] = useState(0);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSentiment, setFeedbackSentiment] = useState(null); // 'positive' | 'neutral' | 'negative'
  const [feedbackContext, setFeedbackContext] = useState("");
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackError, setFeedbackError] = useState(null);
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [userPopoverOpen, setUserPopoverOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState("mycvs");
  const [moreOpen, setMoreOpen] = useState(false);
  const userCardRef = useRef(null);
  const userPopoverRef = useRef(null);

  // Outside-click + Escape close for the user popover
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
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [userPopoverOpen]);

  // Escape closes the feedback modal
  useEffect(() => {
    if (!feedbackOpen) return undefined;
    function onKey(e) { if (e.key === "Escape") setFeedbackOpen(false); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [feedbackOpen]);

  useEffect(() => { writeFabMemory({ lastTabVisited: active }); }, [active]);
  useEffect(() => { if (planModalOpen) setCancelStep(0); }, [planModalOpen]);

  // Honor ?tab=ats from post-auth redirects (e.g. ATSPreview CTA on landing)
  const atsDeeplinkHandledRef = useRef(false);
  useEffect(() => {
    if (atsDeeplinkHandledRef.current) return;
    const params = new URLSearchParams(location.search);
    if (params.get("tab") === "ats") {
      atsDeeplinkHandledRef.current = true;
      onRunATS();
    }
  }, [location.search, onRunATS]);

  /* + New CV click — first-CV users see the lobby; returning users jump straight to a blank builder */
  const handleStartNewCv = () => {
    if (resumeList.length === 0) {
      setLobbyOpen(true);
    } else {
      onBuildResume();
    }
  };

  const planLabel = isPro ? "Pro" : "Free";
  const isPaid = isPro;

  const initials = useMemo(() => {
    const parts = String(user?.name || "").trim().split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] || "U";
    const b = parts[1]?.[0] || "";
    return (a + b).toUpperCase();
  }, [user?.name]);

  const nudge = useMemo(() => getNudge(resumeList), [resumeList]);

  const handleNudgeAction = (action) => {
    if (action === "ats") onRunATS();
    else if (action === "jobmatch") navigate("/builder?tab=jobmatch");
    else if (action === "coverletter") navigate("/cover-letter");
  };

  const resetFeedback = () => {
    setFeedbackText("");
    setFeedbackContext("");
    setFeedbackSentiment(null);
    setFeedbackError(null);
  };

  // Persists to the `candidate_feedback` table (pending sign-off — see PR note).
  // Insert-own only under RLS; user_id defaults to auth.uid() server-side.
  // Validates length client-side; the panel stays open with an honest error
  // if the insert fails so nothing is silently lost.
  const handleFeedbackSend = async () => {
    const message = feedbackText.trim();
    if (!message || feedbackSending) return;
    setFeedbackSending(true);
    setFeedbackError(null);
    try {
      if (!supabase) throw new Error("offline");
      const { error } = await supabase.from("candidate_feedback").insert({
        message: message.slice(0, 4000),
        sentiment: feedbackSentiment,
        context: feedbackContext.trim().slice(0, 500) || null,
        page: "/dashboard",
      });
      if (error) throw error;
      setFeedbackSent(true);
      setTimeout(() => {
        setFeedbackSent(false);
        setFeedbackOpen(false);
        resetFeedback();
      }, 1600);
    } catch (e) {
      setFeedbackError("Could not send just yet. Please try again in a moment.");
    } finally {
      setFeedbackSending(false);
    }
  };

  const handleSignOut = async () => {
    if (supabase) await supabase.auth.signOut();
    navigate("/");
  };

  /* ─── Nav items ─── */
  const navItems = [
    { id: "mycvs", label: "My CVs", icon: IconGrid, iconColor: "#ffffff", action: () => setActive("mycvs") },
    { id: "ats", label: "ATS Check", icon: IconTarget, iconColor: "#1D9E75", action: () => { setActive("ats"); onRunATS(); } },
    { id: "scout", label: "Scout", icon: IconCompass, iconColor: "#0A66C2", action: () => { setActive("scout"); navigate("/scout"); } },
    { id: "linkedin", label: "LinkedIn", icon: IconLinkedIn, iconColor: "#ffffff", action: () => { setActive("linkedin"); navigate("/linkedin-optimizer"); } },
    { id: "coverletter", label: "Cover Letter", icon: IconEnvelope, iconColor: "#D97706", action: () => { setActive("coverletter"); navigate("/cover-letter"); } },
    { id: "walkin", label: "Walk-In Mode", icon: IconBolt, iconColor: "#D85A30", action: () => { setActive("walkin"); onWalkIn(); } },
    { id: "templates", label: "Templates", icon: IconTable, iconColor: "#378ADD", action: () => { setActive("templates"); onTemplates(); } },
  ];

  /* ─── Mobile tabs ─── */
  /* LinkedIn lives at center (position 3). Templates moved into the More
     overflow menu; tapping the More tab opens an upward popover. */
  const mobileTabs = [
    { id: "mycvs", label: "My CVs", icon: IconGrid, action: () => setMobileTab("mycvs") },
    { id: "ats", label: "ATS Check", icon: IconTarget, action: () => { setMobileTab("ats"); onRunATS(); } },
    { id: "linkedin", label: "LinkedIn", icon: IconLinkedIn, activeColor: "#ffffff", action: () => { setMobileTab("linkedin"); navigate("/linkedin-optimizer"); } },
    { id: "coverletter", label: "Cover Letter", icon: IconEnvelope, action: () => { setMobileTab("coverletter"); navigate("/cover-letter"); } },
    { id: "walkin", label: "Walk-In", icon: IconBolt, action: () => { setMobileTab("walkin"); onWalkIn(); } },
    { id: "more", label: "More", icon: IconMore, isMore: true, action: () => setMoreOpen((v) => !v) },
  ];

  const moreItems = [
    { id: "scout", label: "Scout", icon: IconCompass, action: () => { setMoreOpen(false); setMobileTab("scout"); navigate("/scout"); } },
    { id: "templates", label: "Templates", icon: IconTable, action: () => { setMoreOpen(false); setMobileTab("templates"); onTemplates(); } },
  ];

  const lastResume = resumeList[0];
  const lastTitle = lastResume?.title || lastResume?.cv_data?.name || lastResume?.name || null;
  const subLine = lastTitle ? `${lastTitle} · ${timeAgo(lastResume?.updated_at)}` : "Welcome — let's build your first CV.";

  /* ─── Strength data for first CV ─── */
  const firstCv = lastResume?.cv_data || null;
  const firstStrength = firstCv ? getStrength(firstCv) : 0;

  /* Derive health breakdown from cv fields */
  const healthBars = useMemo(() => {
    if (!firstCv) return null;
    const cv = firstCv;
    // Keywords: skills + summary
    const kw = [cv.skills, cv.summary].filter(Boolean).length;
    const keywords = Math.min(100, Math.round((kw / 2) * 100));
    // Format: name, title, email, phone, location
    const fmt = [cv.name, cv.title, cv.email, cv.phone, cv.location].filter(Boolean).length;
    const format = Math.min(100, Math.round((fmt / 5) * 100));
    // Achievements: experience + education
    const ach = [
      Array.isArray(cv.experience) && cv.experience.some((e) => e?.company || e?.role),
      Array.isArray(cv.education) && cv.education.some((e) => e?.school || e?.degree),
    ].filter(Boolean).length;
    const achievements = Math.min(100, Math.round((ach / 2) * 100));
    return { keywords, format, achievements };
  }, [firstCv]);

  return (
    <div className="dashboard-root" style={{ "--sb-width": "196px", background: "#0A0A0A", color: "#fff", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif", minHeight: "100vh", overflowX: "hidden" }}>
        {/* ═══ SIDEBAR ═══ */}
        <aside
          className="cvp2-sidebar cvp-sidebar"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "var(--sb-width)",
            height: "100vh",
            background: "#060606",
            borderRight: "1px solid #0e0e0e",
            flexDirection: "column",
            boxSizing: "border-box",
            overflow: "hidden",
            zIndex: 100,
          }}
        >
          {/* Section 1 — Logo + Help */}
          <div style={{ flexShrink: 0, padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <Link
              to="/"
              style={{ display: "flex", alignItems: "center", padding: "4px 0 0", color: "#fff", textDecoration: "none" }}
            >
              <CVPassportLogo height={20} />
            </Link>
            <button
              type="button"
              onClick={() => setFeedbackOpen(true)}
              aria-label="Help & feedback"
              style={{
                width: 24, height: 24, borderRadius: 6,
                background: "transparent", border: "1px solid transparent",
                color: "#3a3a3a", cursor: "pointer",
                display: "grid", placeItems: "center",
                transition: `background 150ms ${EASE}, color 150ms ${EASE}, border-color 150ms ${EASE}`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "#0e0e0e";
                e.currentTarget.style.borderColor = "#1a1a1a";
                e.currentTarget.style.color = "#bbb";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.borderColor = "transparent";
                e.currentTarget.style.color = "#3a3a3a";
              }}
            >
              <IconHelp size={13} />
            </button>
          </div>

          {/* Section 2 — Nav container */}
          <nav style={{ flex: 1, overflowY: "auto", padding: 8 }}>
            {/* Section label */}
            <div style={{ fontSize: 9, color: "#2a2a2a", letterSpacing: "0.1em", textTransform: "uppercase", padding: "0 12px", marginBottom: 6 }}>MENU</div>

            <div style={{ display: "grid", gap: 2 }}>
              {navItems.map((it) => {
                const isActive = active === it.id;
                const Icon = it.icon;
                return (
                  <button
                    key={it.id}
                    type="button"
                    onClick={it.action}
                    style={{
                      minHeight: 44, padding: "0 12px", borderRadius: 10,
                      fontSize: 13, fontWeight: 500, border: "none",
                      background: isActive ? "#111" : "transparent",
                      color: isActive ? "#fff" : "#3a3a3a",
                      display: "flex", alignItems: "center", gap: 10,
                      cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                      boxSizing: "border-box",
                      transition: `background 150ms ${EASE}, color 150ms ${EASE}`,
                    }}
                    onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = "#0a0a0a"; e.currentTarget.style.color = "#888"; } }}
                    onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#3a3a3a"; } }}
                  >
                    <span style={{ display: "flex", color: it.iconColor, opacity: isActive ? 1 : 0.4, transition: `opacity 150ms ${EASE}` }}>
                      <Icon size={13} />
                    </span>
                    <span>{it.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Feedback — opens the sentiment panel */}
          <div style={{ flexShrink: 0, padding: "0 8px 4px" }}>
            <button
              type="button"
              onClick={() => setFeedbackOpen(true)}
              style={{
                width: "100%", minHeight: 44, padding: "0 12px", borderRadius: 10,
                fontSize: 13, fontWeight: 500, border: "none", background: "transparent",
                color: "#3a3a3a", display: "flex", alignItems: "center", gap: 10,
                cursor: "pointer", textAlign: "left", fontFamily: "inherit", boxSizing: "border-box",
                transition: `background 150ms ${EASE}, color 150ms ${EASE}`,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#0a0a0a"; e.currentTarget.style.color = "#888"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#3a3a3a"; }}
            >
              <span style={{ display: "flex", color: "#D97706", opacity: 0.5 }}><IconChat size={13} /></span>
              <span>Feedback</span>
            </button>
          </div>

          {/* Section 3 — Bottom (user card + popover) */}
          <div style={{ flexShrink: 0, padding: 12, position: "relative" }}>
            {/* Popover (above the card) */}
            {userPopoverOpen && (
              <div
                ref={userPopoverRef}
                role="menu"
                style={{
                  position: "absolute",
                  left: 12, right: 12,
                  bottom: "calc(100% - 4px)",
                  background: "#141414",
                  border: "1px solid #2A2A2A",
                  borderRadius: 10,
                  padding: 6,
                  boxShadow: "0 16px 40px rgba(0,0,0,0.6), 0 4px 12px rgba(0,0,0,0.4)",
                  zIndex: 50,
                }}
              >
                {/* Identity header */}
                <div style={{
                  padding: "10px 10px 12px",
                  borderBottom: "1px solid #1a1a1a",
                  marginBottom: 4,
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: 999, flexShrink: 0,
                    background: "#1e1e1e", border: "1px solid rgba(255,179,0,0.25)",
                    display: "grid", placeItems: "center",
                    fontSize: 10, fontWeight: 700, color: "#FFB300",
                  }}>
                    {initials}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {getDisplayName(user)}
                    </div>
                    {user?.email && (
                      <div style={{ fontSize: 10, color: "#666", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {user.email}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { setUserPopoverOpen(false); setPlanModalOpen(true); }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 10px", background: "transparent",
                    border: "none", borderRadius: 6,
                    color: "#fff", fontSize: 12, fontWeight: 500,
                    cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                    transition: `background 120ms ${EASE}`,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#1C1C1C"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <span style={{ width: 18, display: "grid", placeItems: "center", color: "#FFB300" }}>
                    <IconSpark size={13} />
                  </span>
                  <span>Upgrade Plan</span>
                </button>

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { setUserPopoverOpen(false); navigate("/account"); }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 10px", background: "transparent",
                    border: "none", borderRadius: 6,
                    color: "#fff", fontSize: 12, fontWeight: 500,
                    cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                    transition: `background 120ms ${EASE}`,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#1C1C1C"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <span style={{ width: 18, display: "grid", placeItems: "center", color: "#888" }}>
                    <IconGear size={13} />
                  </span>
                  <span>Account Settings</span>
                </button>

                <div style={{ height: 1, background: "#1a1a1a", margin: "4px 6px" }} />

                <button
                  type="button"
                  role="menuitem"
                  onClick={() => { setUserPopoverOpen(false); handleSignOut(); }}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 10,
                    padding: "8px 10px", background: "transparent",
                    border: "none", borderRadius: 6,
                    color: "#D85A30", fontSize: 12, fontWeight: 500,
                    cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                    transition: `background 120ms ${EASE}`,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(216,90,48,0.08)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <span style={{ width: 18, display: "grid", placeItems: "center", color: "#D85A30" }}>
                    <IconSignOut size={13} />
                  </span>
                  <span>Sign Out</span>
                </button>
              </div>
            )}

            {/* User card (clickable) */}
            <button
              ref={userCardRef}
              type="button"
              aria-haspopup="menu"
              aria-expanded={userPopoverOpen}
              onClick={() => setUserPopoverOpen((v) => !v)}
              style={{
                width: "100%",
                display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                background: "#111", borderRadius: 8,
                border: "0.5px solid " + (userPopoverOpen ? "#2A2A2A" : "#1a1a1a"),
                cursor: "pointer", fontFamily: "inherit", textAlign: "left",
                color: "#fff",
                transition: `border-color 150ms ${EASE}`,
              }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: 999, flexShrink: 0,
                background: "#1e1e1e", border: "1px solid rgba(255,179,0,0.25)",
                display: "grid", placeItems: "center",
                fontSize: 10, fontWeight: 700, color: "#FFB300",
              }}>
                {initials}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 11, fontWeight: 500, color: "#ccc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {getDisplayName(user)}
                </div>
                <span
                  role="button"
                  tabIndex={0}
                  aria-label="Open plan options"
                  onClick={(e) => { e.stopPropagation(); setPlanModalOpen(true); }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.stopPropagation();
                      e.preventDefault();
                      setPlanModalOpen(true);
                    }
                  }}
                  style={{
                    display: "inline-block", fontSize: 9, color: "#FFB300",
                    background: "rgba(255,179,0,0.08)", border: "0.5px solid rgba(255,179,0,0.2)",
                    borderRadius: 4, padding: "1px 5px", marginTop: 2, cursor: "pointer",
                  }}
                >
                  {planLabel}
                </span>
              </div>
            </button>
          </div>
        </aside>

        {/* ═══ MAIN CONTENT ═══ */}
        <main className="cvp2-main cvp-main" style={{ marginLeft: "var(--sb-width)", minHeight: "100vh", boxSizing: "border-box", padding: "24px 28px", background: "#0A0A0A", display: "flex", flexDirection: "column" }}>

          {/* Mobile top bar */}
          <div
            className="cvp2-mobile-topbar"
            style={{
              justifyContent: "space-between", alignItems: "center",
              height: 52, padding: "0 16px",
              borderBottom: "1px solid #0e0e0e", margin: "0 0 16px",
            }}
          >
            <Link to="/" style={{ display: "flex", alignItems: "center", textDecoration: "none", color: "#fff" }}>
              <CVPassportLogo height={20} />
            </Link>
            <button
              type="button"
              onClick={() => setPlanModalOpen(true)}
              style={{
                width: 28, height: 28, borderRadius: 999,
                background: "#1e1e1e", border: "1px solid rgba(255,179,0,0.25)",
                color: "#FFB300", display: "grid", placeItems: "center",
                fontSize: 10, fontWeight: 700, cursor: "pointer",
              }}
            >
              {initials}
            </button>
          </div>

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6, flexWrap: "wrap", gap: 12 }}>
            <div>
              <div className="cvp2-greeting" style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.5px" }}>
                {getGreeting()}, {getFirstName(user?.name)}.
              </div>
              <div style={{ fontSize: 12, color: "#2a2a2a", marginTop: 4 }}>{subLine}</div>
            </div>
            <div
              style={{
                display: "inline-block",
                padding: "1.5px",
                borderRadius: 12,
                background: "conic-gradient(from var(--ats-angle, 0deg), transparent 70%, rgba(255,255,255,0.22) 85%, transparent 100%)",
                animation: "ats-spin-border 4s linear infinite",
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                onClick={handleStartNewCv}
                style={{
                  background: "#0A0A0A", color: "#fff", border: "none", borderRadius: 11,
                  padding: "0 20px", height: 44, fontSize: 14, fontWeight: 600,
                  display: "flex", alignItems: "center", gap: 8,
                  cursor: "pointer", fontFamily: "inherit",
                  transition: `opacity 150ms ${EASE}, transform 150ms ${EASE}`,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.98)"; }}
                onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M12 5v14" /><path d="M5 12h14" />
                </svg>
                New CV
              </button>
            </div>
          </div>

          {/* ═══ STATS STRIP ═══ */}
          <div className="cvp-stats-strip" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 12, marginBottom: 18, marginTop: 16 }}>
            {/* Card 1 — ATS Score (ring gauge, real active-CV strength) */}
            <div className="cvp2-stats-card" style={{
              background: "#111", border: "0.5px solid #1a1a1a", borderRadius: 14,
              padding: 20, minHeight: 210, display: "flex", flexDirection: "column",
              WebkitFontSmoothing: "antialiased", MozOsxFontSmoothing: "grayscale",
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 10.5, color: "#666", letterSpacing: "0.07em", textTransform: "uppercase", fontWeight: 600 }}>ATS score</div>
                  <div style={{ fontSize: 11, color: "#333", marginTop: 3 }}>{firstStrength > 0 ? "Target 85+" : "Build a CV first"}</div>
                </div>
                <span style={{ color: "#FFB300", opacity: 0.85, display: "flex" }}><IconTarget size={16} /></span>
              </div>
              <AtsRing score={resumeList.length > 0 ? firstStrength : 0} color={scoreColor(firstStrength)} />
            </div>
            {/* Card 2 — CVs Built (real count) */}
            <div className="cvp2-stats-card" style={{
              background: "#111", border: "0.5px solid #1a1a1a", borderRadius: 14,
              padding: 20, minHeight: 210, display: "flex", flexDirection: "column",
              WebkitFontSmoothing: "antialiased", MozOsxFontSmoothing: "grayscale",
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div style={{ fontSize: 10.5, color: "#666", letterSpacing: "0.07em", textTransform: "uppercase", fontWeight: 600 }}>CVs built</div>
                <span style={{ color: "#444", display: "flex" }}><IconGrid size={16} /></span>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontSize: 46, fontWeight: 700, color: "#eee", letterSpacing: "-1.5px", lineHeight: 1 }}>{resumeList.length}</div>
                <div style={{ fontSize: 12, color: "#444", marginTop: 8 }}>{resumeList.length > 0 ? `Last edited ${timeAgo(lastResume?.updated_at).replace("edited ", "")}` : "Start below"}</div>
              </div>
            </div>
            {/* Card 3 — Plan (real plan + active status) */}
            <div className="cvp2-stats-card" style={{
              background: "#111", border: "0.5px solid #1a1a1a", borderRadius: 14,
              padding: 20, minHeight: 210, display: "flex", flexDirection: "column",
              WebkitFontSmoothing: "antialiased", MozOsxFontSmoothing: "grayscale",
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div style={{ fontSize: 10.5, color: "#666", letterSpacing: "0.07em", textTransform: "uppercase", fontWeight: 600 }}>Plan</div>
                <span style={{ color: "#444", display: "flex" }}><IconSpark size={16} /></span>
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontSize: 40, fontWeight: 700, color: "#FFB300", letterSpacing: "-1px", lineHeight: 1 }}>{planLabel}</div>
                <div style={{ marginTop: 12 }}>
                  {isPaid ? (
                    <span style={{ fontSize: 12, fontWeight: 600, color: "#1D9E75", background: "rgba(29,158,117,0.12)", padding: "3px 10px", borderRadius: 999 }}>Active</span>
                  ) : (
                    <span
                      role="button"
                      tabIndex={0}
                      style={{ fontSize: 12.5, color: "#FFB300", cursor: "pointer", fontWeight: 600 }}
                      onClick={() => navigate("/pricing")}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") navigate("/pricing"); }}
                    >
                      Upgrade →
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ═══ NUDGE BAR ═══ */}
          {nudge && (
            <div style={{
              background: "#111", borderLeft: "2px solid #FFB300",
              borderRadius: "0 8px 8px 0", padding: "14px 18px",
              display: "flex", alignItems: "center", gap: 10, marginBottom: 18,
            }}>
              <div style={{ width: 5, height: 5, borderRadius: 999, background: "#FFB300", flexShrink: 0 }} />
              <div style={{ fontSize: 13, color: "#555", lineHeight: 1.5, flex: 1 }}>{nudge.text}</div>
              <button
                type="button"
                onClick={() => handleNudgeAction(nudge.action)}
                style={{
                  fontSize: 13, color: "#FFB300", fontWeight: 600,
                  background: "none", border: "none", cursor: "pointer",
                  fontFamily: "inherit", whiteSpace: "nowrap", padding: 0,
                  transition: `opacity 150ms ${EASE}`,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.7"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
              >
                {nudge.actionLabel}
              </button>
            </div>
          )}

          {/* ═══ RETURNING USER — two-col + templates ═══ */}
          {resumeList.length > 0 ? (
            <>
              <div className="cvp2-two-col cvp-two-col" style={{ display: "grid", gap: 10, marginBottom: 18 }}>

                {/* LEFT — MY CVS */}
                <div className="cvp2-card" style={{ background: "#111", border: "0.5px solid #1a1a1a", borderRadius: 10, padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div style={{ fontSize: 11, color: "#333", textTransform: "uppercase", letterSpacing: "0.07em" }}>MY CVS</div>
                    <span
                      role="button"
                      tabIndex={0}
                      style={{ fontSize: 10, color: "#FFB300", cursor: "pointer", fontWeight: 500 }}
                      onClick={handleStartNewCv}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") handleStartNewCv(); }}
                    >
                      + New
                    </span>
                  </div>
                  {resumeList.slice(0, 3).map((r, idx) => {
                    const rawTitle = r?.title || r?.cv_data?.personalInfo?.fullName || r?.cv_data?.name || r?.name || "My CV";
                    const title = rawTitle.length > 20 ? `${rawTitle.slice(0, 20)}…` : rawTitle;
                    const strength = getStrength(r?.cv_data || r);
                    const isLast = idx === Math.min(2, resumeList.length - 1);
                    return (
                      <div
                        key={r?.id ?? idx}
                        role="button"
                        tabIndex={0}
                        onClick={() => onEditResume(r)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onEditResume(r); }}
                        className="cvp2-cv-item"
                        style={{
                          display: "flex", alignItems: "center", gap: 12,
                          padding: "12px 0",
                          borderBottom: isLast ? "none" : "0.5px solid #141414",
                          cursor: "pointer",
                        }}
                      >
                        {/* Thumbnail */}
                        <div style={{
                          width: 38, height: 48, background: "#141414",
                          border: "0.5px solid #1e1e1e", borderRadius: 4,
                          padding: "6px 5px", boxSizing: "border-box", flexShrink: 0,
                        }}>
                          <div style={{ height: 2, background: "#2a2a2a", borderRadius: 1, marginBottom: 4, width: "80%" }} />
                          <div style={{ height: 2, background: "#2a2a2a", borderRadius: 1, marginBottom: 4, width: "60%" }} />
                          <div style={{ height: 2, background: "#FFB300", borderRadius: 1, marginBottom: 4, width: "55%" }} />
                          <div style={{ height: 2, background: "#2a2a2a", borderRadius: 1, width: "70%" }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: "#bbb", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 160 }}>{title}</div>
                          <div style={{ fontSize: 11, color: "#2a2a2a", marginTop: 2 }}>{timeAgo(r?.updated_at)}</div>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: scoreColor(strength), flexShrink: 0 }}>
                          {strength > 0 ? strength : "—"}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* RIGHT — CV HEALTH */}
                <div className="cvp2-card" style={{ background: "#111", border: "0.5px solid #1a1a1a", borderRadius: 10, padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div style={{ fontSize: 11, color: "#333", textTransform: "uppercase", letterSpacing: "0.07em" }}>CV HEALTH</div>
                    <span
                      role="button"
                      tabIndex={0}
                      style={{ fontSize: 10, color: "#FFB300", cursor: "pointer", fontWeight: 500 }}
                      onClick={() => onRunATS()}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onRunATS(); }}
                    >
                      Full report →
                    </span>
                  </div>
                  {healthBars ? (
                    <div style={{ display: "grid", gap: 14 }}>
                      {[
                        { label: "Keywords", value: healthBars.keywords, color: scoreColor(healthBars.keywords) },
                        { label: "Format", value: healthBars.format, color: scoreColor(healthBars.format) },
                        { label: "Achievements", value: healthBars.achievements, color: scoreColor(healthBars.achievements) },
                        { label: "Job Match", value: lastResume?.job_match_score ?? null, color: "#378ADD" },
                      ].map((bar) => (
                        <div key={bar.label} style={{ minHeight: "auto", overflow: "visible" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, overflow: "visible" }}>
                            <span style={{ fontSize: 12, color: "#444", lineHeight: 1.5 }}>{bar.label}</span>
                            <span style={{ fontSize: 12, color: "#555", lineHeight: 1.5 }}>{bar.value != null ? bar.value : "—"}</span>
                          </div>
                          <div style={{ height: 5, background: "#141414", borderRadius: 3, overflow: "hidden" }}>
                            {bar.value != null && (
                              <div style={{
                                height: "100%", borderRadius: 2,
                                width: `${Math.min(100, bar.value)}%`,
                                background: bar.color,
                                transition: `width 300ms ${EASE}`,
                                transform: "translate3d(0,0,0)",
                                WebkitBackfaceVisibility: "hidden",
                                backfaceVisibility: "hidden",
                                willChange: "width",
                              }} />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 11, color: "#252525", textAlign: "center", padding: "20px 0" }}>
                      Build a CV to see health data
                    </div>
                  )}
                </div>
              </div>

              {/* ─── Templates strip ─── */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontSize: 10, color: "#2a2a2a", textTransform: "uppercase", letterSpacing: "0.07em" }}>TEMPLATES</div>
                  <span
                    role="button"
                    tabIndex={0}
                    style={{ fontSize: 10, color: "#FFB300", cursor: "pointer", fontWeight: 500 }}
                    onClick={() => navigate("/templates")}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") navigate("/templates"); }}
                  >
                    View all →
                  </span>
                </div>
                <div className="cvp2-tpl-row" style={{ display: "grid", gap: 8 }}>
                  {TEMPLATES.slice(0, 3).map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => navigate("/builder", { state: { cvpInitialTemplateId: tpl.id } })}
                      style={{
                        background: "#111", border: "0.5px solid #1a1a1a", borderRadius: 10,
                        padding: 0, cursor: "pointer", overflow: "hidden",
                        transition: `border-color 150ms ${EASE}, transform 150ms ${EASE}`,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#2a2a2a"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#1a1a1a"; e.currentTarget.style.transform = "translateY(0)"; }}
                    >
                      <div style={{ height: 72, background: "#0e0e0e", position: "relative", padding: "14px 16px", boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 6, justifyContent: "center" }}>
                        <div style={{ height: 2, background: "#FFB300", borderRadius: 1, width: "40%" }} />
                        <div style={{ height: 2, background: "#1e1e1e", borderRadius: 1, width: "80%" }} />
                        <div style={{ height: 2, background: "#1e1e1e", borderRadius: 1, width: "65%" }} />
                        <div style={{ height: 2, background: "#1e1e1e", borderRadius: 1, width: "75%" }} />
                      </div>
                      <div style={{ padding: "10px 16px" }}>
                        <div style={{ fontSize: 12, color: "#888", fontWeight: 500 }}>{tpl.name}</div>
                        <div style={{ fontSize: 10, color: "#333", marginTop: 2 }}>ATS-ready</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* ═══ NEW USER STATE ═══ */
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", paddingBottom: 60, textAlign: "center" }}>
              <div style={{ maxWidth: 480, width: "100%" }}>
                <div style={{ fontSize: 11, color: "#333", marginBottom: 8 }}>Welcome to CVPassport</div>
                <div className="cvp2-hero-heading cvp-welcome-heading" style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 12 }}>
                  Your Gulf CV starts here.
                </div>
                <div className="cvp2-hero-sub" style={{ fontSize: 15, color: "#444", lineHeight: 1.7, marginBottom: 32, maxWidth: 440, marginLeft: "auto", marginRight: "auto" }}>
                  The guide walks you through everything — no blank page, no confusion.
                </div>
                <button
                  type="button"
                  className="cvp2-start-btn cvp-start-btn"
                  onClick={handleStartNewCv}
                  style={{
                    maxWidth: 480, width: "100%", background: "#fff", color: "#000", border: "none",
                    borderRadius: 14, padding: "18px 24px",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    cursor: "pointer", fontFamily: "inherit",
                    transition: `opacity 150ms ${EASE}, transform 150ms ${EASE}`,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                  onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.98)"; }}
                  onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                >
                  <div style={{ textAlign: "left" }}>
                    <div className="cvp2-start-btn-label" style={{ fontSize: 14, fontWeight: 700 }}>Start guided experience</div>
                    <div style={{ fontSize: 11, color: "#666", marginTop: 3 }}>Recommended · 5 minutes</div>
                  </div>
                  <div style={{
                    width: 32, height: 32, borderRadius: 999,
                    background: "#000", color: "#fff",
                    display: "grid", placeItems: "center",
                  }}>
                    <IconArrowRight size={14} />
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/builder?tab=templates")}
                  style={{
                    maxWidth: 480, width: "100%", background: "transparent", color: "#fff",
                    border: "1px solid #1a1a1a", borderRadius: 14, padding: "14px 24px",
                    fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                    marginTop: 10,
                    transition: `background 150ms ${EASE}, transform 150ms ${EASE}`,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#0e0e0e"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.98)"; }}
                  onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                >
                  Browse templates instead
                </button>
                <div style={{ marginTop: 32, display: "grid", gap: 10, textAlign: "left" }}>
                  {[
                    "Answer questions — your CV fills itself",
                    "ATS scan — instant Gulf market score",
                    "Download — PDF ready to send",
                  ].map((text, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: 999, background: "#0e0e0e",
                        display: "grid", placeItems: "center",
                        fontSize: 10, fontWeight: 700, color: "#555", flexShrink: 0,
                      }}>
                        {i + 1}
                      </div>
                      <span style={{ fontSize: 13, color: "#333" }}>{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Mobile feedback */}
          <div className="cvp2-mobile-topbar" style={{ display: "none", justifyContent: "center", fontSize: 11, color: "#555555", padding: 12, marginTop: 24 }}>
            feedback ·{" "}
            <a
              href="mailto:support@mycvpassport.com"
              style={{ color: "#555555", textDecoration: "underline", marginLeft: 4, padding: "4px 0" }}
            >
              support@mycvpassport.com
            </a>
          </div>

          <FAB tabKey={fabRouteTab} cvsCount={resumeList.length} />
        </main>

      {/* ═══ MOBILE BOTTOM TAB BAR ═══ */}
      <div
        className="cvp-tab-bar"
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          height: 58, background: "#0e0e0e",
          borderTop: "0.5px solid #1a1a1a",
          alignItems: "center", justifyContent: "space-around",
          zIndex: 200, boxSizing: "border-box",
        }}
      >
        {mobileTabs.map((t) => {
          const isAct = t.isMore ? moreOpen : mobileTab === t.id;
          const Icon = t.icon;
          const activeColor = t.activeColor || "#FFB300";
          return (
            <button
              key={t.id}
              type="button"
              onClick={t.action}
              aria-expanded={t.isMore ? moreOpen : undefined}
              aria-haspopup={t.isMore ? "menu" : undefined}
              style={{
                background: "transparent", border: "none",
                minHeight: 48, minWidth: 48,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 3, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <span style={{ display: "flex", color: isAct ? activeColor : "#333", width: 20, height: 20 }}>
                <Icon size={20} />
              </span>
              <span style={{ fontSize: 10, color: isAct ? activeColor : "#333", fontWeight: 600, lineHeight: 1 }}>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ═══ MOBILE MORE OVERFLOW ═══ */}
      {moreOpen && (
        <>
          <div
            role="presentation"
            onClick={() => setMoreOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 199, background: "transparent" }}
          />
          <div
            role="menu"
            className="cvp-tab-bar"
            style={{
              position: "fixed", right: 8, bottom: 66,
              zIndex: 201, minWidth: 176,
              background: "#1C1C1C", border: "1px solid #2A2A2A",
              borderRadius: 14, padding: 6,
              boxShadow: "0 12px 32px rgba(0,0,0,0.55)",
              display: "flex", flexDirection: "column", gap: 2,
            }}
          >
            {moreItems.map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="menuitem"
                  onClick={m.action}
                  style={{
                    display: "flex", alignItems: "center", gap: 12,
                    background: "transparent", border: "none",
                    color: "#FFFFFF", fontFamily: "inherit",
                    fontSize: 13, fontWeight: 600,
                    padding: "12px 14px", minHeight: 48,
                    borderRadius: 10, cursor: "pointer",
                    transition: `background-color 150ms ${EASE}`,
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                >
                  <span style={{ display: "flex", width: 18, height: 18, color: "#A0A0A0" }}>
                    <Icon size={18} />
                  </span>
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* ═══ NEW CV LOBBY — first-CV users only ═══ */}
      {lobbyOpen && (
        <NewCvLobby
          onGuided={() => { setLobbyOpen(false); onBuildResume({ openFabGuide: true }); }}
          onBuildMyself={() => { setLobbyOpen(false); onBuildResume(); }}
          onClose={() => setLobbyOpen(false)}
        />
      )}

      {/* ═══ PLAN MANAGEMENT MODAL ═══ */}
      {planModalOpen && (
        <>
          <div
            role="presentation"
            style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
            onClick={() => setPlanModalOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: "fixed", left: "50%", top: "50%", transform: "translate(-50%, -50%)",
              zIndex: 401, width: "calc(100% - 32px)", maxWidth: 360,
              background: "#0e0e0e", border: "1px solid #1a1a1a", borderRadius: 20, padding: 24,
              boxSizing: "border-box",
            }}
          >
            <button
              type="button"
              onClick={() => setPlanModalOpen(false)}
              style={{
                position: "absolute", top: 14, right: 14,
                background: "none", border: "none", color: "#444",
                cursor: "pointer", padding: 4,
                transition: `color 150ms ${EASE}`,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#444"; }}
              aria-label="Close"
            >
              <IconX />
            </button>

            <div style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Your Plan</div>
            <div style={{ fontSize: 12, color: "#444", marginBottom: 16 }}>Manage your CVPassport subscription.</div>

            <div style={{
              background: "#141414",
              border: `1px solid ${isPaid ? "#1D9E75" : "rgba(217,119,6,0.4)"}`,
              borderRadius: 10, padding: "12px 14px", marginBottom: 12,
              ...(!isPaid ? { boxShadow: "0 0 12px rgba(217,119,6,0.08)" } : {}),
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: isPaid ? "#fff" : "#D97706" }}>{profile?.plan || "Explorer"}</div>
              <div style={{ fontSize: 11, color: isPaid ? "#1D9E75" : "#555", marginTop: 4 }}>
                {isPaid
                  ? "Unlimited everything"
                  : "Limited features · Upgrade to unlock all"
                }
              </div>
            </div>

            {cancelStep === 0 ? (
              <>
                {!isPaid ? (
                  <>
                    <button
                      type="button"
                      onClick={async () => {
                        const url = await getPaymentLink("activeHunter");
                        if (url) window.location.href = url;
                      }}
                      style={{
                        display: "block", width: "100%", background: "#fff", color: "#000",
                        borderRadius: 10, padding: "12px 14px", fontSize: 13, fontWeight: 700,
                        textAlign: "center", textDecoration: "none", marginBottom: 8,
                        boxSizing: "border-box", border: "none", cursor: "pointer", fontFamily: "inherit",
                        transition: `opacity 150ms ${EASE}, transform 150ms ${EASE}`,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                    >
                      Upgrade to Active Hunter — AED 29/mo →
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPlanModalOpen(false); navigate("/pricing"); }}
                      style={{
                        width: "100%", background: "transparent", color: "#fff",
                        border: "1px solid #1a1a1a", borderRadius: 10, padding: "10px 14px",
                        fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                        transition: `background 150ms ${EASE}, transform 150ms ${EASE}`,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "#141414"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.98)"; }}
                      onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                    >
                      View all plans →
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={async () => {
                        const url = await getPaymentLink("careerPro");
                        if (url) window.location.href = url;
                      }}
                      style={{
                        display: "block", width: "100%", background: "#fff", color: "#000",
                        borderRadius: 10, padding: "12px 14px", fontSize: 13, fontWeight: 700,
                        textAlign: "center", textDecoration: "none", marginBottom: 12,
                        boxSizing: "border-box", border: "none", cursor: "pointer", fontFamily: "inherit",
                        transition: `opacity 150ms ${EASE}, transform 150ms ${EASE}`,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                    >
                      Upgrade to Career Pro — AED 199/yr →
                    </button>
                    <div style={{ height: 1, background: "#1a1a1a", margin: "4px 0 8px" }} />
                    <button
                      type="button"
                      onClick={() => setCancelStep(1)}
                      style={{
                        background: "none", border: "none", color: "#2a2a2a",
                        fontSize: 12, cursor: "pointer", fontFamily: "inherit", padding: 0,
                        transition: `color 150ms ${EASE}`,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = "#666"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = "#2a2a2a"; }}
                    >
                      Cancel subscription
                    </button>
                  </>
                )}
              </>
            ) : (
              <div>
                <div style={{ fontSize: 13, color: "#888", lineHeight: 1.5, marginBottom: 14 }}>
                  Are you sure? Your plan continues until end of billing period. After that your account reverts to Free.
                </div>
                <button
                  type="button"
                  onClick={() => setCancelStep(0)}
                  style={{
                    width: "100%", background: "#fff", color: "#000", border: "none",
                    borderRadius: 10, padding: "10px 14px", fontSize: 13, fontWeight: 700,
                    cursor: "pointer", fontFamily: "inherit", marginBottom: 8,
                    transition: `opacity 150ms ${EASE}, transform 150ms ${EASE}`,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                  onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.98)"; }}
                  onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                >
                  Keep my plan
                </button>
                <a
                  href="mailto:support@mycvpassport.com?subject=Cancel Subscription"
                  style={{
                    display: "block", textAlign: "center",
                    fontSize: 12, color: "#444", textDecoration: "none", padding: "8px 0",
                    transition: `color 150ms ${EASE}`,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#888"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "#444"; }}
                >
                  Yes, cancel
                </a>
                <div style={{ fontSize: 10, color: "#1a1a1a", marginTop: 8, lineHeight: 1.4 }}>
                  Cancellation takes effect at end of billing period. Your CVs are kept for 30 days.
                </div>
              </div>
            )}

            {/* Sign out — bottom of modal */}
            <div style={{ height: 1, background: "#1a1a1a", margin: "16px 0 4px" }} />
            <button
              type="button"
              onClick={async () => { if (supabase) await supabase.auth.signOut(); navigate("/"); }}
              style={{
                width: "100%", background: "none", border: "none",
                color: "#555", fontSize: 13,
                cursor: "pointer", fontFamily: "inherit",
                padding: "8px 0", textAlign: "center",
                transition: `color 150ms ${EASE}`,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#A0A0A0"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#555"; }}
            >
              Sign out
            </button>
          </div>
        </>
      )}

      {/* ═══ FEEDBACK MODAL ═══ */}
      {feedbackOpen && (
        <>
          <div
            role="presentation"
            style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
            onClick={() => setFeedbackOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Send feedback"
            style={{
              position: "fixed", left: "50%", top: "50%", transform: "translate(-50%, -50%)",
              zIndex: 501, width: "calc(100% - 32px)", maxWidth: 440,
              maxHeight: "calc(100vh - 40px)", overflowY: "auto",
              background: "#141414", border: "1px solid #2A2A2A", borderRadius: 16, padding: 20,
              boxSizing: "border-box",
            }}
          >
            <button
              type="button"
              onClick={() => setFeedbackOpen(false)}
              aria-label="Close"
              style={{
                position: "absolute", top: 12, right: 12,
                background: "none", border: "none", color: "#666",
                cursor: "pointer", padding: 4,
                transition: `color 150ms ${EASE}`,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#666"; }}
            >
              <IconX />
            </button>

            {!feedbackSent ? (
              <>
                <div style={{ fontSize: 17, fontWeight: 700, color: "#fff" }}>Your feedback shapes CVPassport</div>
                <div style={{ fontSize: 12.5, color: "#A0A0A0", marginTop: 6, lineHeight: 1.5 }}>
                  Every bit helps us improve this for you. Tell us what is working and what is not.
                </div>

                {/* Sentiment */}
                <div style={{ marginTop: 18 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#ccc", marginBottom: 8 }}>How do you feel about CVPassport?</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {[
                      { key: "positive", label: "Good", Icon: IconSmile, color: "#1D9E75" },
                      { key: "neutral", label: "Okay", Icon: IconMeh, color: "#FFB300" },
                      { key: "negative", label: "Not great", Icon: IconFrown, color: "#D85A30" },
                    ].map(({ key, label, Icon, color }) => {
                      const on = feedbackSentiment === key;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setFeedbackSentiment(on ? null : key)}
                          style={{
                            flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                            padding: "12px 6px", borderRadius: 10, cursor: "pointer", fontFamily: "inherit",
                            background: on ? `${color}1a` : "transparent",
                            border: `1.5px solid ${on ? color : "#2A2A2A"}`,
                            color: on ? color : "#777",
                            transition: `border-color 150ms ${EASE}, color 150ms ${EASE}, background 150ms ${EASE}`,
                          }}
                        >
                          <Icon size={20} />
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Message */}
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#ccc", marginBottom: 6 }}>What would make this better for you?</div>
                  <textarea
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    maxLength={4000}
                    placeholder="Share your thoughts, ideas, or issues..."
                    style={{
                      width: "100%", minHeight: 100, resize: "vertical",
                      background: "#0A0A0A", border: "1px solid #2A2A2A", borderRadius: 8,
                      padding: "10px 12px", color: "#fff", fontSize: 13, fontFamily: "inherit",
                      lineHeight: 1.5, outline: "none", boxSizing: "border-box",
                    }}
                  />
                </div>

                {/* Context */}
                <div style={{ marginTop: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#ccc", marginBottom: 6 }}>What were you trying to do? (optional)</div>
                  <input
                    value={feedbackContext}
                    onChange={(e) => setFeedbackContext(e.target.value)}
                    maxLength={500}
                    placeholder="E.g. create a new CV, check ATS score..."
                    style={{
                      width: "100%", height: 40, background: "#0A0A0A", border: "1px solid #2A2A2A",
                      borderRadius: 8, padding: "0 12px", color: "#fff", fontSize: 13,
                      fontFamily: "inherit", outline: "none", boxSizing: "border-box",
                    }}
                  />
                </div>

                {feedbackError && (
                  <div role="status" style={{ fontSize: 12, color: "#D85A30", marginTop: 10 }}>{feedbackError}</div>
                )}

                <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginTop: 18, gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setFeedbackOpen(false)}
                    style={{
                      padding: "9px 16px", borderRadius: 8, background: "transparent",
                      border: "1px solid #2A2A2A", color: "#A0A0A0", fontSize: 12.5, fontWeight: 500,
                      cursor: "pointer", fontFamily: "inherit",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleFeedbackSend}
                    disabled={!feedbackText.trim() || feedbackSending}
                    style={{
                      padding: "9px 18px", borderRadius: 8, background: "#FFB300", border: "none",
                      color: "#0A0A0A", fontSize: 12.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
                      opacity: feedbackText.trim() && !feedbackSending ? 1 : 0.5,
                    }}
                  >
                    {feedbackSending ? "Sending…" : "Send feedback"}
                  </button>
                </div>
              </>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "20px 8px" }}>
                <div style={{ width: 56, height: 56, borderRadius: 999, background: "rgba(29,158,117,0.14)", display: "grid", placeItems: "center", marginBottom: 14, color: "#1D9E75" }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
                </div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "#fff", marginBottom: 6 }}>Thank you</div>
                <div style={{ fontSize: 13, color: "#A0A0A0", lineHeight: 1.5, maxWidth: 280 }}>We read every message and use your feedback to make CVPassport better.</div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
