import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { FAB } from "./components/FAB";
import { writeFabMemory } from "./components/FAB/FABLogic";
import { getPaymentLink } from "./utils/paywall";
import CVPassportLogo from "./components/CVPassportLogo";

const EASE = "cubic-bezier(0.4,0,0.2,1)";

/* ─── Icons ─── */
function IconPlus({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  );
}

function IconDots({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
      <circle cx="5" cy="12" r="1.5" />
    </svg>
  );
}

function IconGrid({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}

function IconTarget({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function IconEnvelope({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M22 7l-10 7L2 7" />
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
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M3 9h18" />
      <path d="M3 15h18" />
      <path d="M9 3v18" />
    </svg>
  );
}

function IconArrowRight({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="M12 5l7 7-7 7" />
    </svg>
  );
}

function IconX({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6L6 18" />
      <path d="M6 6l12 12" />
    </svg>
  );
}

/* Mobile bottom tab icons (16px) */
function MobIconCvs({ active }) {
  const c = active ? "#fff" : "#2a2a2a";
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
  );
}
function MobIconAts({ active }) {
  const c = active ? "#fff" : "#2a2a2a";
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>
  );
}
function MobIconCover({ active }) {
  const c = active ? "#fff" : "#2a2a2a";
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 7l-10 7L2 7" /></svg>
  );
}
function MobIconWalkin({ active }) {
  const c = active ? "#fff" : "#2a2a2a";
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" /></svg>
  );
}
function MobIconAccount({ active }) {
  const c = active ? "#fff" : "#2a2a2a";
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="7" r="4" /></svg>
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

function getDisplayName(user) {
  let raw = user?.name;
  if (!raw && user?.email) {
    raw = user.email.split("@")[0];
  }
  raw = String(raw || "User").trim();
  // Capitalize first letter
  raw = raw.charAt(0).toUpperCase() + raw.slice(1);
  // Truncate at 16 chars
  if (raw.length > 16) return raw.slice(0, 16) + "…";
  return raw;
}

function getScoreColor(score) {
  if (score >= 75) return "#1D9E75";
  if (score >= 50) return "#D97706";
  return "#E24B4A";
}

/* ─── Keyframes (injected once) ─── */
const KEYFRAMES_ID = "cvp-dash-kf";
function ensureKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById(KEYFRAMES_ID)) return;
  const style = document.createElement("style");
  style.id = KEYFRAMES_ID;
  style.textContent = `
@keyframes cvp-pulse-new {
  0% { box-shadow: 0 0 0 0 rgba(217,119,6,0.35); border-color: #D97706; }
  70% { box-shadow: 0 0 0 8px rgba(217,119,6,0); border-color: #1a1a1a; }
  100% { box-shadow: 0 0 0 0 rgba(217,119,6,0); border-color: #1a1a1a; }
}
@keyframes cvp-pulse-manage {
  0% { box-shadow: 0 0 0 0 rgba(255,255,255,0.1); }
  70% { box-shadow: 0 0 0 4px rgba(255,255,255,0); }
  100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); }
}
@keyframes cvp-beam-manage {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
@keyframes cvp-pulse-feedback {
  0% { box-shadow: 0 0 0 0 rgba(255,255,255,0.08); }
  70% { box-shadow: 0 0 0 5px rgba(255,255,255,0); }
  100% { box-shadow: 0 0 0 0 rgba(255,255,255,0); }
}`;
  document.head.appendChild(style);
}

/* ─── Smart Nudge logic ─── */
function getNudge(resumeList, getStrength) {
  if (!resumeList || resumeList.length === 0) return null;
  const first = resumeList[0];
  const title = first?.title || first?.cv_data?.name || first?.name || "My CV";
  const strength = getStrength(first?.cv_data || first);

  if (strength === 0 || strength === undefined) {
    return { text: `Run ATS on "${title}"`, actionLabel: "Run ATS →", action: "ats" };
  }
  if (!first?.job_match_score) {
    return { text: `Run Job Match on "${title}"`, actionLabel: "Job Match →", action: "jobmatch" };
  }
  if (!first?.has_cover_letter) {
    return { text: `Write a cover letter for "${title}"`, actionLabel: "Cover Letter →", action: "coverletter" };
  }
  return null;
}

/* ═══════════════════════════════════════════════════════════════════
   DASHBOARD
   ═══════════════════════════════════════════════════════════════════ */
export default function Dashboard({
  theme = "dark",
  user = { name: "User", plan: "Free" },
  resumeList = [],
  getStrength = () => 0,
  renderThumb = null,
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
  const [menuOpenId, setMenuOpenId] = useState(null);
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

  const isPaid = user?.plan && user.plan !== "Free" && user.plan !== "Explorer";

  const initials = useMemo(() => {
    const parts = String(user?.name || "").trim().split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] || "U";
    const b = parts[1]?.[0] || "";
    return (a + b).toUpperCase();
  }, [user?.name]);

  const nudge = useMemo(() => getNudge(resumeList, getStrength), [resumeList, getStrength]);

  const handleNudgeAction = (action) => {
    if (action === "ats") onRunATS();
    else if (action === "jobmatch") navigate("/builder?tab=jobmatch");
    else if (action === "coverletter") navigate("/cover-letter");
  };

  const handleFeedbackSend = () => {
    if (!feedbackText.trim()) return;
    console.log("[CVPassport Feedback]", feedbackText);
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
    // { id: 'jobs', label: 'CVPassport Jobs', icon: IconBriefcase, action: () => navigate('/jobs'), badge: 'Soon' }
    // Uncomment when /jobs route is built
  ];

  /* ─── Mobile tabs ─── */
  const mobileTabs = [
    { id: "mycvs", label: "My CVs", Icon: MobIconCvs, action: () => setMobileTab("mycvs") },
    { id: "ats", label: "ATS", Icon: MobIconAts, action: () => { setMobileTab("ats"); onRunATS(); } },
    { id: "coverletter", label: "Cover Letter", Icon: MobIconCover, action: () => { setMobileTab("coverletter"); navigate("/cover-letter"); } },
    { id: "walkin", label: "Walk-In", Icon: MobIconWalkin, action: () => { setMobileTab("walkin"); onWalkIn(); } },
    { id: "account", label: "Account", Icon: MobIconAccount, action: () => { setMobileTab("account"); setPlanModalOpen(true); } },
    // { id: 'jobs', label: 'Jobs', Icon: MobIconBriefcase }
    // Add when CVPassport Jobs is live
  ];

  const lastResume = resumeList[0];
  const lastTitle = lastResume?.title || lastResume?.cv_data?.name || lastResume?.name || null;
  const subLine = lastTitle
    ? `${lastTitle} · ${timeAgo(lastResume?.updated_at)}`
    : "Welcome — let's build your first CV.";

  return (
    <div style={{ height: "100vh", background: "#0A0A0A", color: "#fff", fontFamily: "'DM Sans', system-ui, -apple-system, Segoe UI, sans-serif" }}>
      <div className="cvp-dashboard-wrapper" style={{ display: "grid", gridTemplateColumns: "210px 1fr", height: "100%" }}>

        {/* ═══ SIDEBAR (desktop only — hidden on mobile via CSS) ═══ */}
        <aside
          className="cvp-dashboard-sidebar"
          style={{
            width: 210,
            background: "#060606",
            borderRight: "1px solid #0e0e0e",
            padding: "18px 12px",
            display: "flex",
            flexDirection: "column",
            boxSizing: "border-box",
          }}
        >
          {/* Logo */}
          <Link
            to="/"
            style={{
              display: "flex", alignItems: "center",
              padding: "4px 10px 16px",
              borderBottom: "1px solid #0e0e0e",
              marginBottom: 14,
              color: "#fff", textDecoration: "none",
            }}
          >
            <CVPassportLogo height={20} />
          </Link>

          {/* Section label */}
          <div style={{ fontSize: 9, color: "#2a2a2a", letterSpacing: "0.1em", textTransform: "uppercase", padding: "0 10px", marginBottom: 6 }}>
            MENU
          </div>

          {/* Nav */}
          <nav style={{ display: "grid", gap: 2 }}>
            {navItems.map((it) => {
              const isActive = active === it.id;
              const Icon = it.icon;
              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={it.action}
                  style={{
                    height: 36, padding: "0 10px", borderRadius: 8,
                    fontSize: 12, fontWeight: 500,
                    border: "none",
                    background: isActive ? "#111" : "transparent",
                    color: isActive ? "#fff" : "#3a3a3a",
                    display: "flex", alignItems: "center", gap: 8,
                    cursor: "pointer", textAlign: "left",
                    fontFamily: "inherit",
                    transition: `background 150ms ${EASE}, color 150ms ${EASE}`,
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "#0a0a0a";
                      e.currentTarget.style.color = "#888";
                      const iconEl = e.currentTarget.querySelector("[data-nav-icon]");
                      if (iconEl) iconEl.style.opacity = "1";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "#3a3a3a";
                      const iconEl = e.currentTarget.querySelector("[data-nav-icon]");
                      if (iconEl) iconEl.style.opacity = "0.4";
                    }
                  }}
                  onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.98)"; }}
                  onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                >
                  <span data-nav-icon style={{ display: "flex", color: it.iconColor, opacity: isActive ? 1 : 0.4, transition: `opacity 150ms ${EASE}` }}>
                    <Icon size={13} />
                  </span>
                  <span>{it.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Feedback panel */}
          <div style={{
            marginTop: 24,
            background: "#0a0a0a", border: "1px solid #1a1a1a", borderRadius: 10, padding: 12,
          }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: "#666", letterSpacing: "0.02em", marginBottom: 2 }}>Help us improve</div>
            <div style={{ fontSize: 10, fontWeight: 400, color: "#333", marginBottom: 8 }}>What would make CVPassport better?</div>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="Your thoughts..."
              style={{
                width: "100%", background: "#0e0e0e", border: "1px solid #222",
                borderRadius: 6, padding: "7px 9px", fontSize: 10, color: "#aaa",
                fontFamily: "inherit", resize: "none", height: 52,
                boxSizing: "border-box", outline: "none",
              }}
            />
            <button
              type="button"
              onClick={handleFeedbackSend}
              style={{
                width: "100%", background: "#ffffff", border: "none",
                color: "#000000", borderRadius: 6, padding: 8, fontSize: 11, fontWeight: 600,
                cursor: "pointer", marginTop: 6, fontFamily: "inherit",
                transition: `background 150ms ${EASE}`,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#f0f0f0"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#ffffff"; }}
              onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.98)"; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
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

          {/* Plan section (pushed to bottom) */}
          <div style={{ marginTop: "auto", borderTop: "1px solid #0e0e0e", paddingTop: 12 }}>
            {/* Plan row: name left, Manage → right */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 10px 8px",
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: "#666" }}>{user?.plan || "Free"}</div>
              <span
                role="button"
                tabIndex={0}
                onClick={() => setPlanModalOpen(true)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setPlanModalOpen(true); }}
                style={{
                  fontSize: 10, color: "#444", cursor: "pointer",
                  transition: `color 150ms ${EASE}`,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.textDecoration = "underline"; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = "#444"; e.currentTarget.style.textDecoration = "none"; }}
              >
                Manage →
              </span>
            </div>

            {/* User row */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px 8px", borderTop: "1px solid #0e0e0e" }}>
              <div style={{
                width: 26, height: 26, borderRadius: 999, flexShrink: 0,
                background: isPaid ? "#0a2a1e" : "#1a1a1a",
                color: isPaid ? "#1D9E75" : "#666",
                display: "grid", placeItems: "center",
                fontSize: 10, fontWeight: 700,
              }}>
                {initials}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{
                  fontSize: 11, fontWeight: 600, color: "#fff",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{getDisplayName(user)}</div>
                <span style={{
                  display: "inline-block", fontSize: 9, fontWeight: 700, borderRadius: 20, padding: "1px 7px", marginTop: 3,
                  ...(user?.plan === "Career Pro"
                    ? { background: "rgba(55,138,221,0.15)", color: "#378ADD", border: "1px solid rgba(55,138,221,0.3)" }
                    : user?.plan === "Active Hunter"
                      ? { background: "rgba(29,158,117,0.15)", color: "#1D9E75", border: "1px solid rgba(29,158,117,0.3)" }
                      : { background: "rgba(217,119,6,0.15)", color: "#D97706", border: "1px solid rgba(217,119,6,0.3)" }),
                }}>{user?.plan || "Free"}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* ═══ MAIN CONTENT ═══ */}
        <main style={{ background: "#0A0A0A", padding: 28, overflow: "auto" }}>

          {/* Mobile top bar */}
          <div className="cvp-dashboard-mobile-topbar">
            <Link to="/" style={{ display: "flex", alignItems: "center", textDecoration: "none", color: "#fff" }}>
              <CVPassportLogo height={20} />
            </Link>
            <button
              type="button"
              onClick={() => setPlanModalOpen(true)}
              style={{
                width: 28, height: 28, borderRadius: 999,
                background: isPaid ? "#0a2a1e" : "#1a1a1a",
                color: isPaid ? "#1D9E75" : "#666",
                border: "none", display: "grid", placeItems: "center",
                fontSize: 10, fontWeight: 700, cursor: "pointer",
              }}
            >
              {initials}
            </button>
          </div>

          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6, flexWrap: "wrap", gap: 12 }}>
            <div>
              <div className="cvp-dash-greeting" style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-0.03em" }}>
                {getGreeting()}, {getFirstName(user?.name)}.
              </div>
              <div style={{ fontSize: 12, color: "#2a2a2a", marginTop: 4 }}>{subLine}</div>
            </div>
            <button
              type="button"
              onClick={() => setNewCvChoiceOpen(true)}
              style={{
                background: "#fff", color: "#000", border: "none", borderRadius: 20,
                padding: "8px 16px", fontSize: 12, fontWeight: 700,
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

          {/* Smart Nudge */}
          {nudge && (
            <div style={{
              background: "#080808", border: "1px solid #111", borderLeft: "2px solid #D97706",
              borderRadius: 10, padding: "11px 14px", marginBottom: 24,
              display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
            }}>
              <div style={{ fontSize: 12, color: "#888" }}>{nudge.text}</div>
              <button
                type="button"
                onClick={() => handleNudgeAction(nudge.action)}
                style={{
                  fontSize: 11, color: "#D97706", fontWeight: 600,
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

          {/* ─── NEW USER STATE ─── */}
          {resumeList.length === 0 ? (
            <div style={{ maxWidth: 380, margin: "60px auto 0", textAlign: "center" }}>
              <div style={{ fontSize: 11, color: "#333", marginBottom: 6 }}>Welcome to CVPassport</div>
              <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 10 }}>
                Your Gulf CV starts here.
              </div>
              <div style={{ fontSize: 14, color: "#444", lineHeight: 1.6, marginBottom: 28 }}>
                The guide walks you through everything — no blank page, no confusion.
              </div>

              {/* Primary CTA */}
              <button
                type="button"
                onClick={() => {
                  setNewCvChoiceOpen(true);
                }}
                style={{
                  width: "100%", background: "#fff", color: "#000", border: "none",
                  borderRadius: 12, padding: "14px 20px",
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
                  <div style={{ fontSize: 14, fontWeight: 700 }}>Start guided experience</div>
                  <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>Recommended · 5 minutes</div>
                </div>
                <div style={{
                  width: 28, height: 28, borderRadius: 999,
                  background: "#000", color: "#fff",
                  display: "grid", placeItems: "center",
                }}>
                  <IconArrowRight size={14} />
                </div>
              </button>

              {/* Secondary */}
              <button
                type="button"
                onClick={() => navigate("/builder?tab=templates")}
                style={{
                  width: "100%", background: "transparent", color: "#fff",
                  border: "1px solid #1a1a1a", borderRadius: 12, padding: "12px 20px",
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

              {/* Steps */}
              <div style={{ marginTop: 28, display: "grid", gap: 12, textAlign: "left" }}>
                {[
                  "Answer questions — your CV fills itself",
                  "ATS scan — instant Gulf market score",
                  "Download — PDF ready to send",
                ].map((text, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: 999, background: "#0e0e0e",
                      display: "grid", placeItems: "center",
                      fontSize: 10, fontWeight: 700, color: "#555", flexShrink: 0,
                    }}>
                      {i + 1}
                    </div>
                    <span style={{ fontSize: 12, color: "#333" }}>{text}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* ─── CV GRID (existing users) ─── */
            <>
              <div style={{ fontSize: 10, color: "#2a2a2a", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12, marginTop: 16 }}>
                YOUR CVS
              </div>
              <div className="cvp-cv-grid">
                {/* New CV card */}
                <button
                  type="button"
                  onClick={() => setNewCvChoiceOpen(true)}
                  className="cvp-new-cv-card"
                  style={{
                    border: "2px dashed #1a1a1a", background: "transparent",
                    borderRadius: 12, minHeight: 160,
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", fontFamily: "inherit",
                    animation: "cvp-pulse-new 2.5s ease-in-out infinite",
                    transition: `border-color 150ms ${EASE}, background 150ms ${EASE}`,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#D97706"; e.currentTarget.style.borderStyle = "solid"; e.currentTarget.style.background = "rgba(217,119,6,0.03)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#1a1a1a"; e.currentTarget.style.borderStyle = "dashed"; e.currentTarget.style.background = "transparent"; }}
                >
                  <div style={{
                    width: 30, height: 30, borderRadius: 999,
                    border: "1px solid #D97706", display: "grid", placeItems: "center",
                    color: "#D97706", marginBottom: 8,
                  }}>
                    <IconPlus size={14} />
                  </div>
                  <div style={{ fontSize: 11, color: "#444", fontWeight: 600 }}>New CV</div>
                  <div style={{ fontSize: 10, color: "#222", marginTop: 2 }}>Start guided →</div>
                </button>

                {/* Existing CV cards */}
                {resumeList.map((r) => {
                  const strength = getStrength(r?.cv_data || r);
                  const title = r?.title || r?.cv_data?.name || r?.name || "My CV";
                  const isMenuOpen = menuOpenId === (r?.id ?? title);
                  const scoreColor = getScoreColor(strength);
                  const hasScore = strength > 0;

                  return (
                    <div
                      key={r?.id ?? title}
                      className="cvp-cv-card"
                      role="button"
                      tabIndex={0}
                      onClick={() => onEditResume(r)}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onEditResume(r); }}
                      style={{
                        background: "#080808", border: "1px solid #0e0e0e", borderRadius: 12,
                        overflow: "hidden", cursor: "pointer",
                        transition: `transform 150ms ${EASE}, border-color 150ms ${EASE}`,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.borderColor = "#1a1a1a"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "#0e0e0e"; setMenuOpenId(null); }}
                    >
                      {/* Thumbnail */}
                      <div style={{ position: "relative" }}>
                        <div
                          className="cvp-thumb-container"
                          style={{
                            width: "100%", height: 100, background: "#fff",
                            overflow: "hidden", position: "relative",
                          }}
                        >
                          {/* Header strip */}
                          <div style={{ height: 22, background: r?.template_color || "#1A3A5C", width: "100%" }} />
                          {/* Simulated content lines */}
                          {renderThumb ? renderThumb(r) : (
                            <div style={{ padding: "8px 12px" }}>
                              {[60, 80, 50, 70].map((w, i) => (
                                <div key={i} style={{ height: 3, background: "#e0e0e0", borderRadius: 1, marginBottom: 4, width: `${w}%` }} />
                              ))}
                            </div>
                          )}
                        </div>
                        {/* Three-dot menu */}
                        <div style={{ position: "absolute", top: 6, right: 6 }}>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setMenuOpenId(isMenuOpen ? null : (r?.id ?? title)); }}
                            style={{
                              background: "rgba(0,0,0,0.5)", border: "none", borderRadius: 4,
                              padding: 4, cursor: "pointer", color: "#fff",
                              transition: `opacity 150ms ${EASE}`,
                            }}
                            aria-label="Options"
                          >
                            <IconDots size={14} />
                          </button>
                          {isMenuOpen && (
                            <div style={{
                              position: "absolute", top: 28, right: 0,
                              background: "#141414", border: "1px solid #1a1a1a",
                              borderRadius: 8, overflow: "hidden",
                              boxShadow: "0 8px 24px rgba(0,0,0,0.5)", zIndex: 10,
                              minWidth: 100,
                            }}>
                              <button type="button" onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); onEditResume(r); }} style={{ display: "block", width: "100%", padding: "8px 12px", textAlign: "left", background: "none", border: "none", color: "#fff", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Edit</button>
                              {onDelete && (
                                <button type="button" onClick={(e) => { e.stopPropagation(); setMenuOpenId(null); if (window.confirm("Delete this resume?")) onDelete(r?.id); }} style={{ display: "block", width: "100%", padding: "8px 12px", textAlign: "left", background: "none", border: "none", color: "#E24B4A", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Delete</button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Info area */}
                      <div style={{ padding: "10px 14px" }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {title}
                        </div>
                        <div style={{ fontSize: 10, color: "#222", marginBottom: 7 }}>{timeAgo(r?.updated_at)}</div>
                        {hasScore ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: scoreColor }}>{strength}</span>
                            <div style={{ flex: 1, height: 2, background: "#1a1a1a", borderRadius: 1 }}>
                              <div style={{ width: `${Math.min(100, strength)}%`, height: "100%", background: scoreColor, borderRadius: 1, transition: `width 200ms ${EASE}` }} />
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: 10, color: "#222" }}>No ATS scan yet</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* Mobile feedback link */}
          <div className="cvp-dashboard-mobile-feedback">
            feedback · <a href="mailto:support@mycvpassport.com" style={{ color: "inherit", textDecoration: "none" }}>support@mycvpassport.com</a>
          </div>

          <FAB tabKey={fabRouteTab} />
        </main>
      </div>

      {/* ═══ MOBILE BOTTOM TAB BAR ═══ */}
      <div className="cvp-dashboard-bottom-tabs">
        {mobileTabs.map((t) => {
          const isAct = mobileTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={t.action}
              style={{
                background: "transparent", border: "none",
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: 4, padding: "10px 6px", cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              <t.Icon active={isAct} />
              <span style={{ fontSize: 9, color: isAct ? "#fff" : "#2a2a2a", fontWeight: 600, lineHeight: 1 }}>{t.label}</span>
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
              <p style={{ fontSize: 12, color: "#A0A0A0", textAlign: "center", marginTop: 12, animation: "fabFadeIn 0.3s ease" }}>
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
            {/* Close X */}
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

            {/* Current plan card */}
            <div style={{
              background: "#141414",
              border: `1px solid ${isPaid ? "#1D9E75" : "rgba(217,119,6,0.4)"}`,
              borderRadius: 10, padding: "12px 14px", marginBottom: 12,
              ...(!isPaid ? { boxShadow: "0 0 12px rgba(217,119,6,0.08)" } : {}),
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: isPaid ? "#fff" : "#D97706" }}>{user?.plan || "Explorer"}</div>
              <div style={{ fontSize: 11, color: isPaid ? "#1D9E75" : "#555", marginTop: 4 }}>
                {isPaid
                  ? `AED 29/mo · Renews ${user?.renewDate || "—"} · Unlimited everything`
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
              /* Cancel confirmation step */
              <div>
                <div style={{ fontSize: 13, color: "#888", lineHeight: 1.5, marginBottom: 14 }}>
                  Are you sure? Your plan continues until {user?.renewDate || "end of billing period"}. After that your account reverts to Free.
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
                    fontSize: 12, color: "#444", textDecoration: "none",
                    padding: "8px 0",
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
