import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FAB } from "../components/FAB";
import { writeFabMemory } from "../components/FAB/FABLogic";
import { getPaymentLink } from "../utils/paywall";
import CVPassportLogo from "../components/CVPassportLogo";
import { TEMPLATES, getStrength } from "../cvShared";
import { supabase } from "../appSupabaseClient";

const EASE = "cubic-bezier(0.4,0,0.2,1)";

/* ─── Icons ─── */
function IconPlus({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14" /><path d="M5 12h14" />
    </svg>
  );
}
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

/* ─── Keyframes ─── */
const KF_ID = "cvp-dash2-kf";
function ensureKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById(KF_ID)) return;
  const s = document.createElement("style");
  s.id = KF_ID;
  s.textContent = `
@keyframes cvp-pulse-new2 {
  0%{box-shadow:0 0 0 0 rgba(255,179,0,0.25);border-color:#FFB300;}
  70%{box-shadow:0 0 0 6px rgba(255,179,0,0);border-color:#1a1a1a;}
  100%{box-shadow:0 0 0 0 rgba(255,179,0,0);border-color:#1a1a1a;}
}`;
  document.head.appendChild(s);
}

/* ═══════════════════════════════════════════════════════════════════
   DASHBOARD PAGE — redesigned
   ═══════════════════════════════════════════════════════════════════ */
export default function DashboardPage({
  user,
  isPro = false,
  profile,
  resumeList = [],
  onBuildResume = () => {},
  onEditResume = () => {},
  onDelete = null,
  onRunATS = () => {},
  onWalkIn = () => {},
  onTemplates = () => {},
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const fabRouteTab = location.state?.fabGuideTab === "account" ? "account" : "mycvs";

  const [active, setActive] = useState("mycvs");
  const [newCvChoiceOpen, setNewCvChoiceOpen] = useState(false);
  const [showTease, setShowTease] = useState(false);
  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [cancelStep, setCancelStep] = useState(0);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [mobileTab, setMobileTab] = useState("mycvs");

  useEffect(() => { ensureKeyframes(); }, []);
  useEffect(() => { if (newCvChoiceOpen) setShowTease(false); }, [newCvChoiceOpen]);
  useEffect(() => { writeFabMemory({ lastTabVisited: active }); }, [active]);
  useEffect(() => { if (planModalOpen) setCancelStep(0); }, [planModalOpen]);

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

  const handleFeedbackSend = () => {
    if (!feedbackText.trim()) return;
    setFeedbackText("");
    setFeedbackSent(true);
    setTimeout(() => setFeedbackSent(false), 2000);
  };

  /* ─── Nav items ─── */
  const navItems = [
    { id: "mycvs", label: "My CVs", icon: IconGrid, iconColor: "#ffffff", action: () => setActive("mycvs") },
    { id: "ats", label: "ATS Check", icon: IconTarget, iconColor: "#1D9E75", action: () => { setActive("ats"); onRunATS(); } },
    { id: "coverletter", label: "Cover Letter", icon: IconEnvelope, iconColor: "#D97706", action: () => { setActive("coverletter"); navigate("/cover-letter"); } },
    { id: "walkin", label: "Walk-In Mode", icon: IconBolt, iconColor: "#D85A30", action: () => { setActive("walkin"); onWalkIn(); } },
    { id: "templates", label: "Templates", icon: IconTable, iconColor: "#378ADD", action: () => { setActive("templates"); onTemplates(); } },
  ];

  /* ─── Mobile tabs ─── */
  const mobileTabs = [
    { id: "mycvs", label: "My CVs", icon: IconGrid, action: () => setMobileTab("mycvs") },
    { id: "ats", label: "ATS Check", icon: IconTarget, action: () => { setMobileTab("ats"); onRunATS(); } },
    { id: "coverletter", label: "Cover Letter", icon: IconEnvelope, action: () => { setMobileTab("coverletter"); navigate("/cover-letter"); } },
    { id: "walkin", label: "Walk-In", icon: IconBolt, action: () => { setMobileTab("walkin"); onWalkIn(); } },
    { id: "templates", label: "Templates", icon: IconTable, action: () => { setMobileTab("templates"); onTemplates(); } },
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

  /* ─── Inline responsive styles ─── */
  const responsiveCSS = `
    .cvp2-sidebar { display: flex; }
    .cvp2-mobile-topbar { display: none; }
    .cvp2-mobile-tabs { display: none; }
    .cvp2-two-col { grid-template-columns: 1fr 1fr; }
    .cvp2-tpl-row { grid-template-columns: repeat(3, 1fr); }
    @media (max-width: 1023px) {
      .cvp2-sidebar { display: none !important; }
      .cvp2-mobile-topbar { display: flex !important; }
      .cvp2-mobile-tabs { display: flex !important; }
      .cvp2-main { margin-left: 0 !important; padding: 16px 16px 80px !important; }
      .cvp2-two-col { grid-template-columns: 1fr !important; }
      .cvp2-tpl-row { grid-template-columns: repeat(3, 1fr) !important; }
      .cvp2-greeting { font-size: 22px !important; }
      .cvp2-stats-card { padding: 12px 14px !important; min-height: auto !important; }
      .cvp2-stats-val { font-size: 18px !important; }
      .cvp2-hero-heading { font-size: 26px !important; }
      .cvp2-hero-sub { font-size: 14px !important; }
      .cvp2-start-btn { padding: 16px 20px !important; }
      .cvp2-start-btn-label { font-size: 13px !important; }
      .cvp2-card { padding: 16px !important; }
      .cvp2-cv-item { padding: 10px 0 !important; }
      .cvp2-tab-icon { width: 20px !important; height: 20px !important; }
      .cvp2-tab-label { font-size: 10px !important; }
    }
  `;

  return (
    <div style={{ "--sb-width": "196px", background: "#0A0A0A", color: "#fff", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif", minHeight: "100vh" }}>
      <style>{responsiveCSS}</style>

        {/* ═══ SIDEBAR ═══ */}
        <aside
          className="cvp2-sidebar"
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
          {/* Section 1 — Logo */}
          <div style={{ flexShrink: 0, padding: 16 }}>
            <Link
              to="/"
              style={{ display: "flex", alignItems: "center", padding: "4px 0 0", color: "#fff", textDecoration: "none" }}
            >
              <CVPassportLogo height={20} />
            </Link>
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

          {/* Section 3 — Bottom (feedback + user + signout) */}
          <div style={{ flexShrink: 0, padding: 12 }}>
            {/* Feedback panel */}
            <div style={{ background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 10, padding: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: "#666", letterSpacing: "0.02em", marginBottom: 2 }}>Help us improve</div>
              <div style={{ fontSize: 10, fontWeight: 400, color: "#333", marginBottom: 8 }}>What would make CVPassport better?</div>
              <textarea
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                placeholder="Your thoughts..."
                style={{
                  width: "100%", background: "#0e0e0e", border: "1px solid #222",
                  borderRadius: 6, padding: "7px 9px", fontSize: 10, color: "#aaa",
                  fontFamily: "inherit", resize: "none", height: 52, boxSizing: "border-box", outline: "none",
                }}
              />
              <button
                type="button"
                onClick={handleFeedbackSend}
                style={{
                  width: "100%", background: "#ffffff", border: "none", color: "#000000",
                  borderRadius: 6, padding: 8, fontSize: 11, fontWeight: 600,
                  cursor: "pointer", marginTop: 6, fontFamily: "inherit",
                  transition: `background 150ms ${EASE}`,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "#f0f0f0"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "#ffffff"; }}
              >
                {feedbackSent ? "Sent ✓" : "Send feedback"}
              </button>
              <div style={{ textAlign: "center", marginTop: 8 }}>
                <a
                  href="mailto:support@mycvpassport.com"
                  style={{ fontSize: 10, color: "#333", textDecoration: "none", transition: `color 150ms ${EASE}` }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#888"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "#333"; }}
                >
                  support@mycvpassport.com
                </a>
              </div>
            </div>

            {/* User row */}
            <div style={{ marginTop: 12 }}>
              <div
                style={{
                  display: "flex", alignItems: "center", gap: 8, padding: "8px 10px",
                  background: "#111", borderRadius: 8, border: "0.5px solid #1a1a1a",
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
                  <span style={{
                    display: "inline-block", fontSize: 9, color: "#FFB300",
                    background: "rgba(255,179,0,0.08)", border: "0.5px solid rgba(255,179,0,0.2)",
                    borderRadius: 4, padding: "1px 5px", marginTop: 2,
                  }}>
                    {planLabel}
                  </span>
                </div>
              </div>
              <button
                type="button"
              onClick={async () => { if (supabase) await supabase.auth.signOut(); navigate("/"); }}
              style={{
                display: "block", fontSize: 10, color: "#252525", cursor: "pointer",
                padding: "5px 2px 0", background: "none", border: "none",
                fontFamily: "inherit", textAlign: "left",
                transition: `color 150ms ${EASE}`,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "rgba(255,179,0,0.7)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#252525"; }}
            >
              Sign out
            </button>
            </div>
          </div>
        </aside>

        {/* ═══ MAIN CONTENT ═══ */}
        <main className="cvp2-main" style={{ marginLeft: "var(--sb-width)", minHeight: "100vh", boxSizing: "border-box", padding: "24px 28px", background: "#0A0A0A", display: "flex", flexDirection: "column" }}>

          {/* Mobile top bar */}
          <div
            className="cvp2-mobile-topbar"
            style={{
              justifyContent: "space-between", alignItems: "center",
              height: 52, padding: "0 16px",
              borderBottom: "1px solid #0e0e0e", margin: "-24px -28px 16px",
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
            <button
              type="button"
              onClick={() => setNewCvChoiceOpen(true)}
              style={{
                background: "#fff", color: "#000", border: "none", borderRadius: 10,
                padding: "10px 20px", fontSize: 13, fontWeight: 700,
                display: "flex", alignItems: "center", gap: 6,
                cursor: "pointer", fontFamily: "inherit", flexShrink: 0,
                transition: `opacity 150ms ${EASE}, transform 150ms ${EASE}`,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
              onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.98)"; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
            >
              <IconPlus size={14} /> New CV
            </button>
          </div>

          {/* ═══ STATS STRIP ═══ */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 8, marginBottom: 16, marginTop: 16 }}>
            {/* Card 1 — ATS Score */}
            <div className="cvp2-stats-card" style={{
              background: "#111", border: "0.5px solid #1a1a1a",
              borderRadius: "2px 2px 10px 10px", borderTop: "1.5px solid #FFB300",
              padding: "16px 20px", minHeight: 90,
            }}>
              <div style={{ fontSize: 10, color: "#2e2e2e", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 6 }}>ATS SCORE</div>
              <div className="cvp2-stats-val" style={{ fontSize: 22, fontWeight: 500, color: "#FFB300", letterSpacing: "-0.5px" }}>
                {resumeList.length > 0 ? firstStrength : "—"}
              </div>
              <div style={{ fontSize: 11, color: "#252525", marginTop: 4 }}>
                {firstStrength > 0 ? "Target: 85+" : "Build a CV first"}
              </div>
            </div>
            {/* Card 2 — CVs Built */}
            <div className="cvp2-stats-card" style={{
              background: "#111", border: "0.5px solid #1a1a1a",
              borderRadius: "2px 2px 10px 10px",
              padding: "16px 20px", minHeight: 90,
            }}>
              <div style={{ fontSize: 10, color: "#2e2e2e", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 6 }}>CVS BUILT</div>
              <div className="cvp2-stats-val" style={{ fontSize: 22, fontWeight: 500, color: "#ddd", letterSpacing: "-0.5px" }}>{resumeList.length}</div>
              <div style={{ fontSize: 11, color: "#252525", marginTop: 4 }}>
                {resumeList.length > 0 ? "Last edited today" : "Start below"}
              </div>
            </div>
            {/* Card 3 — Plan */}
            <div className="cvp2-stats-card" style={{
              background: "#111", border: "0.5px solid #1a1a1a",
              borderRadius: "2px 2px 10px 10px",
              padding: "16px 20px", minHeight: 90,
            }}>
              <div style={{ fontSize: 10, color: "#2e2e2e", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 6 }}>PLAN</div>
              <div className="cvp2-stats-val" style={{ fontSize: 22, fontWeight: 500, color: "#FFB300", letterSpacing: "-0.5px" }}>{planLabel}</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>
                {isPaid ? (
                  <span style={{ color: "#1D9E75" }}>Active</span>
                ) : (
                  <span
                    role="button"
                    tabIndex={0}
                    style={{ color: "#FFB300", opacity: 0.5, cursor: "pointer" }}
                    onClick={() => navigate("/pricing")}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") navigate("/pricing"); }}
                  >
                    Upgrade →
                  </span>
                )}
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
              <div className="cvp2-two-col" style={{ display: "grid", gap: 10, marginBottom: 18 }}>

                {/* LEFT — MY CVS */}
                <div className="cvp2-card" style={{ background: "#111", border: "0.5px solid #1a1a1a", borderRadius: 10, padding: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div style={{ fontSize: 11, color: "#333", textTransform: "uppercase", letterSpacing: "0.07em" }}>MY CVS</div>
                    <span
                      role="button"
                      tabIndex={0}
                      style={{ fontSize: 10, color: "#FFB300", cursor: "pointer", fontWeight: 500 }}
                      onClick={() => setNewCvChoiceOpen(true)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setNewCvChoiceOpen(true); }}
                    >
                      + New
                    </span>
                  </div>
                  {resumeList.slice(0, 3).map((r, idx) => {
                    const title = r?.title || r?.cv_data?.personalInfo?.fullName || r?.cv_data?.name || r?.name || "My CV";
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
                          <div style={{ fontSize: 13, fontWeight: 500, color: "#bbb", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{title}</div>
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
                        <div key={bar.label}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                            <span style={{ fontSize: 12, color: "#444" }}>{bar.label}</span>
                            <span style={{ fontSize: 12, color: "#555" }}>{bar.value != null ? bar.value : "—"}</span>
                          </div>
                          <div style={{ height: 5, background: "#141414", borderRadius: 3 }}>
                            {bar.value != null && (
                              <div style={{
                                height: "100%", borderRadius: 2,
                                width: `${Math.min(100, bar.value)}%`,
                                background: bar.color,
                                transition: `width 300ms ${EASE}`,
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
                <div className="cvp2-hero-heading" style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 12 }}>
                  Your Gulf CV starts here.
                </div>
                <div className="cvp2-hero-sub" style={{ fontSize: 15, color: "#444", lineHeight: 1.7, marginBottom: 32, maxWidth: 440, marginLeft: "auto", marginRight: "auto" }}>
                  The guide walks you through everything — no blank page, no confusion.
                </div>
                <button
                  type="button"
                  className="cvp2-start-btn"
                  onClick={() => setNewCvChoiceOpen(true)}
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
          <div className="cvp2-mobile-topbar" style={{ display: "none", justifyContent: "center", fontSize: 10, color: "#1a1a1a", padding: 12, marginTop: 24 }}>
            feedback · <a href="mailto:support@mycvpassport.com" style={{ color: "inherit", textDecoration: "none", marginLeft: 4 }}>support@mycvpassport.com</a>
          </div>

          <FAB tabKey={fabRouteTab} />
        </main>

      {/* ═══ MOBILE BOTTOM TAB BAR ═══ */}
      <div
        className="cvp2-mobile-tabs"
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          height: 58, background: "#0e0e0e", borderTop: "0.5px solid #1a1a1a",
          display: "flex", alignItems: "center", justifyContent: "space-around",
          zIndex: 100, boxSizing: "border-box",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        {mobileTabs.map((t) => {
          const isAct = mobileTab === t.id;
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={t.action}
              style={{
                background: "transparent", border: "none",
                minHeight: 44, minWidth: 44,
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 3, cursor: "pointer", fontFamily: "inherit",
              }}
            >
              <span className="cvp2-tab-icon" style={{ display: "flex", color: isAct ? "#FFB300" : "#333", width: 20, height: 20 }}>
                <Icon size={20} />
              </span>
              <span className="cvp2-tab-label" style={{ fontSize: 10, color: isAct ? "#FFB300" : "#333", fontWeight: 600, lineHeight: 1 }}>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ═══ NEW CV CHOICE MODAL ═══ */}
      {newCvChoiceOpen && (
        <>
          <div
            role="presentation"
            style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)" }}
            onClick={() => setNewCvChoiceOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-cv-choice-title"
            style={{
              position: "fixed", left: "50%", top: "50%", transform: "translate(-50%, -50%)",
              zIndex: 401, width: "calc(100% - 32px)", maxWidth: 400,
              background: "#141414", border: "1px solid #2A2A2A", borderRadius: 24, padding: 24,
              boxSizing: "border-box",
            }}
          >
            <div id="new-cv-choice-title" style={{ fontSize: 18, fontWeight: 600, color: "#fff" }}>Start a new CV</div>
            <p style={{ margin: "0 0 20px", fontSize: 13, color: "#A0A0A0", lineHeight: 1.45 }}>Choose how you want to begin.</p>
            <button
              type="button"
              onClick={() => { setNewCvChoiceOpen(false); onBuildResume({ openFabGuide: true }); }}
              style={{
                width: "100%", background: "#F59E0B", color: "#000", border: "none",
                borderRadius: 14, padding: 16, fontSize: 15, fontWeight: 600,
                marginBottom: 10, cursor: "pointer", fontFamily: "inherit",
                display: "block", textAlign: "center",
                transition: `opacity 150ms ${EASE}, transform 150ms ${EASE}`,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
              onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.98)"; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
            >
              <span style={{ display: "block" }}>Guide me through it</span>
              <span style={{ display: "block", fontSize: 11, opacity: 0.7, fontWeight: 600, marginTop: 4 }}>Step-by-step · Recommended for new users</span>
            </button>
            <button
              type="button"
              onClick={() => setShowTease(true)}
              style={{
                width: "100%", background: "#1C1C1C", border: "1px solid #2A2A2A",
                borderRadius: 14, padding: 16, cursor: "pointer", fontFamily: "inherit",
                textAlign: "left", boxSizing: "border-box",
                transition: `opacity 150ms ${EASE}, transform 150ms ${EASE}`,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
              onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.98)"; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 0 }}>
                <span style={{ color: "#fff", fontSize: 15, fontWeight: 600 }}>Co-pilot mode</span>
                <span style={{ fontSize: 9, background: "rgba(245,158,11,0.15)", color: "#F59E0B", borderRadius: 4, padding: "2px 6px", marginLeft: 8, fontWeight: 600 }}>SOON</span>
              </span>
              <div style={{ color: "#606060", fontSize: 11, marginTop: 4, fontWeight: 400 }}>AI assistant · Coming soon</div>
            </button>
            {showTease && (
              <p style={{ fontSize: 12, color: "#A0A0A0", textAlign: "center", marginTop: 12 }}>
                Co-pilot is in production. Your support helps us ship it faster — try Guide mode meanwhile.
              </p>
            )}
          </div>
        </>
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
                    <a
                      href={getPaymentLink("activeHunter")}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "block", width: "100%", background: "#fff", color: "#000",
                        borderRadius: 10, padding: "12px 14px", fontSize: 13, fontWeight: 700,
                        textAlign: "center", textDecoration: "none", marginBottom: 8,
                        boxSizing: "border-box",
                        transition: `opacity 150ms ${EASE}, transform 150ms ${EASE}`,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                    >
                      Upgrade to Active Hunter — AED 29/mo →
                    </a>
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
                    <a
                      href={getPaymentLink("careerPro")}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "block", width: "100%", background: "#fff", color: "#000",
                        borderRadius: 10, padding: "12px 14px", fontSize: 13, fontWeight: 700,
                        textAlign: "center", textDecoration: "none", marginBottom: 12,
                        boxSizing: "border-box",
                        transition: `opacity 150ms ${EASE}, transform 150ms ${EASE}`,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
                    >
                      Upgrade to Career Pro — AED 199/yr →
                    </a>
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
          </div>
        </>
      )}
    </div>
  );
}
