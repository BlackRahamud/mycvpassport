import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../appSupabaseClient";

// ─── White-light HR design tokens ───────────────────────────────
const T = {
  bg: "#FFFFFF",
  sidebar: "#F7F8FA",
  card: "#FFFFFF",
  border: "#E5E7EB",
  borderStrong: "#D1D5DB",
  text: "#111827",
  muted: "#6B7280",
  muted2: "#9CA3AF",
  hover: "#F3F4F6",
  panel: "#FAFBFC",
  accent: "#111827",
  accentHover: "#1F2937",
  success: "#10B981",
  successBg: "#ECFDF5",
  successFg: "#047857",
  warning: "#F59E0B",
  warningBg: "#FFFBEB",
  warningFg: "#B45309",
  danger: "#EF4444",
  dangerBg: "#FEF2F2",
  dangerFg: "#B91C1C",
  info: "#3B82F6",
  infoBg: "#EFF6FF",
  infoFg: "#1D4ED8",
  radius: 8,
  font: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const PANEL_W = 380;
const MOBILE_BP = 768;

// Map DB status → display label
const STATUS_DISPLAY = {
  submitted: "New",
  viewed: "Reviewing",
  shortlisted: "Shortlisted",
  interviewing: "Interviewing",
  offered: "Offered",
  hired: "Hired",
  rejected: "Rejected",
};

const STATUS_DB = {
  New: "submitted",
  Reviewing: "viewed",
  Shortlisted: "shortlisted",
  Interviewing: "interviewing",
  Offered: "offered",
  Hired: "hired",
  Rejected: "rejected",
};

// ─── Icons ───────────────────────────────────────────────────────
const Ic = {
  Briefcase: (p) => <svg {...p} width={p?.width || 18} height={p?.height || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>,
  Users: (p) => <svg {...p} width={p?.width || 18} height={p?.height || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Bell: (p) => <svg {...p} width={p?.width || 18} height={p?.height || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  Settings: (p) => <svg {...p} width={p?.width || 18} height={p?.height || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  MapPin: (p) => <svg {...p} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>,
  Dollar: (p) => <svg {...p} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>,
  Plus: (p) => <svg {...p} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  Menu: (p) => <svg {...p} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  Close: (p) => <svg {...p} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  Search: (p) => <svg {...p} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  Check: (p) => <svg {...p} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
  TrendUp: (p) => <svg {...p} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>,
  Clock: (p) => <svg {...p} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  Star: (p) => <svg {...p} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  ArrowLeft: (p) => <svg {...p} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>,
  Logo: () => (
    <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="7" fill="#111827"/>
      <path d="M9 10h14v3H9zM9 15h10v3H9zM9 20h14v3H9z" fill="#fff"/>
      <circle cx="23.5" cy="9" r="2.5" fill="#10B981" stroke="#fff" strokeWidth="1.5"/>
    </svg>
  ),
};

// ─── Helpers ─────────────────────────────────────────────────────
const initials = (name) =>
  String(name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const AVATAR_PALETTE = [
  { bg: "#DBEAFE", fg: "#1E40AF" },
  { bg: "#FCE7F3", fg: "#9D174D" },
  { bg: "#DCFCE7", fg: "#166534" },
  { bg: "#FEF3C7", fg: "#92400E" },
  { bg: "#E0E7FF", fg: "#3730A3" },
  { bg: "#FEE2E2", fg: "#991B1B" },
];
function avatarColor(name) {
  const s = String(name || "");
  let sum = 0;
  for (let i = 0; i < s.length; i++) sum += s.charCodeAt(i);
  return AVATAR_PALETTE[sum % AVATAR_PALETTE.length];
}

function statusColor(s) {
  switch (s) {
    case "Active":
    case "Shortlisted":
    case "Hired":
      return { bg: T.successBg, fg: T.successFg, dot: T.success };
    case "Reviewing":
    case "Interviewing":
    case "Offered":
      return { bg: T.warningBg, fg: T.warningFg, dot: T.warning };
    case "New":
      return { bg: T.infoBg, fg: T.infoFg, dot: T.info };
    case "Rejected":
      return { bg: T.dangerBg, fg: T.dangerFg, dot: T.danger };
    case "Closed":
    default:
      return { bg: T.hover, fg: "#4B5563", dot: T.muted2 };
  }
}

function atsColor(score) {
  if (score >= 80) return T.success;
  if (score >= 65) return T.warning;
  return T.muted2;
}

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

function postedAgoLabel(postedAt) {
  if (!postedAt) return "";
  const days = Math.floor((Date.now() - new Date(postedAt).getTime()) / 86400000);
  if (days === 0) return "Posted today";
  if (days === 1) return "Posted yesterday";
  return `Posted ${days} days ago`;
}

function jobStatusLabel(job) {
  if (!job) return "Active";
  if (job.hiring_status === "closed") return "Closed";
  return "Active";
}

function salaryRange(job) {
  const min = job?.salary_min;
  const max = job?.salary_max;
  if (!min && !max) return "Salary not disclosed";
  const fmt = (n) => Number(n).toLocaleString();
  if (min && max) return `AED ${fmt(min)} – ${fmt(max)}`;
  if (min) return `AED ${fmt(min)}+`;
  return `Up to AED ${fmt(max)}`;
}

// ─── Avatar / pills / shared bits ────────────────────────────────
function Avatar({ name, size = 36 }) {
  const c = avatarColor(name);
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: c.bg, color: c.fg,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 600, flexShrink: 0, letterSpacing: 0.3,
      fontFamily: T.font,
    }}>{initials(name)}</div>
  );
}

function StatusPill({ status }) {
  const c = statusColor(status);
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      background: c.bg, color: c.fg,
      padding: "3px 10px", borderRadius: 999,
      fontSize: 12, fontWeight: 500, letterSpacing: 0.1,
      whiteSpace: "nowrap", fontFamily: T.font,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot }} />
      {status}
    </span>
  );
}

function StatusDropdown({ status, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const display = STATUS_DISPLAY[status] || "New";
  const opts = ["New", "Reviewing", "Shortlisted", "Interviewing", "Rejected"];

  useEffect(() => {
    if (!open) return undefined;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: statusColor(display).bg,
          color: statusColor(display).fg,
          border: "none", borderRadius: 999,
          padding: "3px 10px", fontSize: 12, fontWeight: 500,
          cursor: "pointer", fontFamily: T.font,
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor(display).dot }} />
        {display}
      </button>
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 4px)", left: 0,
          background: "#fff", border: `1px solid ${T.border}`,
          borderRadius: T.radius, padding: 4,
          boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
          zIndex: 100, minWidth: 140,
        }}>
          {opts.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => { onChange(STATUS_DB[o] || "submitted"); setOpen(false); }}
              style={{
                display: "block", width: "100%", textAlign: "left",
                background: o === display ? T.hover : "transparent",
                border: "none", color: T.text,
                padding: "6px 10px", fontSize: 12, fontWeight: 500,
                borderRadius: 4, cursor: "pointer", fontFamily: T.font,
              }}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, delta, accent, loading }) {
  return (
    <div style={{
      background: T.card, border: `1px solid ${T.border}`,
      borderRadius: T.radius, padding: "16px 18px",
      minWidth: 0, fontFamily: T.font,
    }}>
      <div style={{ fontSize: 12, color: T.muted, marginBottom: 6, fontWeight: 500 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        {loading ? (
          <div className="hr-skeleton" style={{ width: 56, height: 26, borderRadius: 6 }} aria-hidden />
        ) : (
          <div style={{ fontSize: 26, fontWeight: 600, color: accent || T.text, letterSpacing: -0.5, lineHeight: 1 }}>{value}</div>
        )}
        {delta && !loading && (
          <div style={{ fontSize: 11, color: T.success, fontWeight: 500, display: "flex", alignItems: "center", gap: 2 }}>
            <Ic.TrendUp /> {delta}
          </div>
        )}
      </div>
    </div>
  );
}

// Shimmer placeholder card matching the JobCard footprint, shown while
// jobs are loading from Supabase.
function JobCardSkeleton() {
  return (
    <div
      aria-hidden
      style={{
        background: T.card,
        border: `1px solid ${T.border}`,
        borderRadius: T.radius,
        padding: 20,
        fontFamily: T.font,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <div className="hr-skeleton" style={{ width: 200, height: 18, borderRadius: 6 }} />
            <div className="hr-skeleton" style={{ width: 70, height: 18, borderRadius: 999 }} />
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <div className="hr-skeleton" style={{ width: 120, height: 13, borderRadius: 4 }} />
            <div className="hr-skeleton" style={{ width: 90,  height: 13, borderRadius: 4 }} />
            <div className="hr-skeleton" style={{ width: 80,  height: 13, borderRadius: 4 }} />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div className="hr-skeleton" style={{ width: 36, height: 28, borderRadius: 6 }} />
          <div className="hr-skeleton" style={{ width: 130, height: 32, borderRadius: T.radius }} />
        </div>
      </div>
    </div>
  );
}

// Light-theme toast: bottom-centred pill, auto-dismissed by parent.
// kind: 'success' (green) | 'warning' (amber) | 'error' (red).
function Toast({ text, kind = "success" }) {
  const palette = {
    success: { bg: T.successBg, fg: T.successFg, border: "#A7F3D0" },
    warning: { bg: T.warningBg, fg: T.warningFg, border: "#FCD34D" },
    error:   { bg: T.dangerBg,  fg: T.dangerFg,  border: "#FCA5A5" },
  }[kind] || { bg: "#FFFFFF", fg: T.text, border: T.border };
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: "fixed", bottom: 24, left: "50%",
        transform: "translateX(-50%)",
        background: palette.bg, color: palette.fg,
        border: `1px solid ${palette.border}`,
        padding: "10px 18px", borderRadius: 999,
        fontSize: 13, fontWeight: 500, fontFamily: T.font,
        boxShadow: "0 8px 24px rgba(17,24,39,0.08)",
        zIndex: 2000, maxWidth: "calc(100vw - 32px)",
      }}
    >
      {text}
    </div>
  );
}

// Format a note timestamp as a short relative string ("just now", "5m ago",
// "3h ago"), falling back to a short absolute date for older notes.
function formatNoteTime(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  if (isNaN(d.getTime())) return "";
  const diffMs = Date.now() - d.getTime();
  if (diffMs < 0) return "just now";
  const mins = Math.round(diffMs / 60000);
  if (mins < 1)   return "just now";
  if (mins < 60)  return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function Toggle({ value, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      style={{
        width: 38, height: 22, borderRadius: 999,
        background: value ? T.text : T.borderStrong,
        border: "none", cursor: "pointer", position: "relative",
        transition: "background 150ms cubic-bezier(0.4,0,0.2,1)", flexShrink: 0,
      }}
    >
      <div style={{
        width: 16, height: 16, borderRadius: "50%", background: "#fff",
        position: "absolute", top: 3, left: value ? 19 : 3,
        transition: "left 150ms cubic-bezier(0.4,0,0.2,1)",
        boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
      }} />
    </button>
  );
}

function ScoreRing({ score, size = 76 }) {
  const [animScore, setAnimScore] = useState(0);
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const stroke = atsColor(score);

  useEffect(() => {
    let frame;
    const start = performance.now();
    const duration = 800;
    const animate = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      setAnimScore(Math.round(progress * score));
      if (progress < 1) frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={T.border} strokeWidth={4} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={stroke} strokeWidth={4}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (circumference * animScore) / 100}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 50ms linear" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: T.text, fontFamily: T.font }}>{animScore}%</span>
        <span style={{ fontSize: 9, color: T.muted, fontFamily: T.font }}>match</span>
      </div>
    </div>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────
function Sidebar({ active, onNav, unread, onPostJob, openOnMobile, onCloseMobile, hrProfile, onSwitchCandidate, onSignOut }) {
  const items = [
    { key: "jobs", label: "Jobs", Icon: Ic.Briefcase },
    { key: "candidates", label: "Candidates", Icon: Ic.Users },
    { key: "notifications", label: "Notifications", Icon: Ic.Bell, badge: unread },
    { key: "settings", label: "Settings", Icon: Ic.Settings },
  ];
  return (
    <>
      {openOnMobile && (
        <div
          onClick={onCloseMobile}
          className="hr-sb-backdrop"
          style={{ position: "fixed", inset: 0, background: "rgba(17,24,39,0.4)", zIndex: 40 }}
        />
      )}
      <aside
        className={`hr-sb${openOnMobile ? " hr-sb-open" : ""}`}
        style={{
          width: 220, background: T.sidebar,
          borderRight: `1px solid ${T.border}`,
          display: "flex", flexDirection: "column",
          padding: "20px 14px", flexShrink: 0,
          position: "relative", zIndex: 50,
          fontFamily: T.font,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 24, padding: "0 4px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Ic.Logo />
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: T.text }}>CVPassport</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: T.muted, letterSpacing: 0.8, textTransform: "uppercase" }}>HR Portal</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onCloseMobile}
            className="hr-sb-close"
            aria-label="Close menu"
            style={{ display: "none", background: "none", border: "none", color: T.muted, cursor: "pointer", padding: 4 }}
          >
            <Ic.Close />
          </button>
        </div>

        <button
          type="button"
          onClick={onPostJob}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            background: T.accent, color: "#fff",
            border: "none", borderRadius: T.radius,
            padding: "10px 14px", fontSize: 13, fontWeight: 500,
            cursor: "pointer", marginBottom: 20, fontFamily: T.font,
            transition: "background 150ms cubic-bezier(0.4,0,0.2,1)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = T.accentHover; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = T.accent; }}
        >
          <Ic.Plus /> Post a Job
        </button>

        <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {items.map(({ key, label, Icon, badge }) => {
            const isActive = active === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => { onNav(key); onCloseMobile?.(); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "8px 10px", borderRadius: 6,
                  border: "none", cursor: "pointer",
                  background: isActive ? "#fff" : "transparent",
                  color: isActive ? T.text : T.muted,
                  fontSize: 13, fontWeight: isActive ? 500 : 400,
                  textAlign: "left", fontFamily: T.font,
                  boxShadow: isActive ? "0 1px 2px rgba(0,0,0,0.04)" : "none",
                  transition: "background 120ms cubic-bezier(0.4,0,0.2,1), color 120ms cubic-bezier(0.4,0,0.2,1)",
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = "rgba(17,24,39,0.04)"; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
              >
                <Icon style={{ color: isActive ? T.text : T.muted }} />
                <span style={{ flex: 1 }}>{label}</span>
                {badge > 0 && (
                  <span style={{
                    background: T.danger, color: "#fff",
                    fontSize: 10, fontWeight: 600,
                    padding: "1px 6px", borderRadius: 8, minWidth: 18, textAlign: "center",
                  }}>{badge}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div style={{ marginTop: "auto", paddingTop: 16, borderTop: `1px solid ${T.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 6px", marginBottom: 6 }}>
            <Avatar name={hrProfile?.company_name || "HR"} size={32} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {hrProfile?.company_name || "Your Company"}
              </div>
              <div style={{ fontSize: 11, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {hrProfile?.work_email || hrProfile?.email || ""}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onSwitchCandidate}
            style={{
              display: "block", width: "100%", textAlign: "left",
              fontSize: 12, color: T.muted, padding: "4px 6px",
              background: "none", border: "none", cursor: "pointer", fontFamily: T.font,
            }}
          >
            Switch to Candidate
          </button>
          <button
            type="button"
            onClick={onSignOut}
            style={{
              display: "block", width: "100%", textAlign: "left",
              fontSize: 12, color: T.muted2, padding: "4px 6px",
              background: "none", border: "none", cursor: "pointer", fontFamily: T.font,
            }}
          >
            Sign out
          </button>
        </div>
      </aside>
    </>
  );
}

// ─── Jobs page ───────────────────────────────────────────────────
function JobsPage({ jobs, onPostJob, onViewApplicants, onEditJob, isLoading }) {
  const totalJobs = jobs.length;
  const active = jobs.filter((j) => j.hiring_status !== "closed").length;
  const applicants = jobs.reduce((sum, j) => sum + (j.applications?.[0]?.count || 0), 0);

  return (
    <div style={{ fontFamily: T.font }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, marginBottom: 20, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: T.text, margin: "0 0 4px", letterSpacing: -0.3 }}>Jobs</h1>
          <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>Manage your open roles and track applicants.</p>
        </div>
        <button
          type="button"
          onClick={onPostJob}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            background: T.accent, color: "#fff",
            border: "none", borderRadius: T.radius,
            padding: "9px 14px", fontSize: 13, fontWeight: 500,
            cursor: "pointer", fontFamily: T.font,
            transition: "background 150ms cubic-bezier(0.4,0,0.2,1)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = T.accentHover; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = T.accent; }}
        >
          <Ic.Plus /> Post a Job
        </button>
      </div>

      {/* Stats */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 12, marginBottom: 24,
      }}>
        <Stat label="Total Jobs" value={totalJobs} loading={isLoading} />
        <Stat label="Active" value={active} loading={isLoading} />
        <Stat label="Total Applicants" value={applicants} loading={isLoading} />
        <Stat label="Avg Match" value={jobs.length ? "—" : 0} accent={T.success} loading={isLoading} />
      </div>

      {/* Jobs list */}
      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <JobCardSkeleton />
          <JobCardSkeleton />
          <JobCardSkeleton />
        </div>
      ) : jobs.length === 0 ? (
        <div style={{
          background: T.card, border: `1px solid ${T.border}`,
          borderRadius: T.radius, padding: "60px 20px", textAlign: "center",
        }}>
          <div style={{ fontSize: 14, color: T.text, fontWeight: 500, marginBottom: 6 }}>
            No jobs posted yet
          </div>
          <p style={{ fontSize: 13, color: T.muted, margin: "0 0 16px" }}>
            Post your first job to start receiving applicants.
          </p>
          <button
            type="button"
            onClick={onPostJob}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              background: T.accent, color: "#fff",
              border: "none", borderRadius: T.radius,
              padding: "9px 16px", fontSize: 13, fontWeight: 500,
              cursor: "pointer", fontFamily: T.font,
            }}
          >
            <Ic.Plus /> Post a Job
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {jobs.map((j) => (
            <JobCard
              key={j.id}
              job={j}
              onView={() => onViewApplicants(j.id)}
              onEdit={() => onEditJob(j)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function JobCard({ job, onView, onEdit }) {
  const [hover, setHover] = useState(false);
  const status = jobStatusLabel(job);
  const applicants = job.applications?.[0]?.count ?? 0;
  const onCardKey = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onEdit && onEdit();
    }
  };
  return (
    <div
      role={onEdit ? "button" : undefined}
      tabIndex={onEdit ? 0 : undefined}
      onClick={() => onEdit && onEdit()}
      onKeyDown={onEdit ? onCardKey : undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={onEdit ? `Edit job: ${job.title}` : undefined}
      style={{
        background: T.card,
        border: `1px solid ${hover ? T.borderStrong : T.border}`,
        borderRadius: T.radius,
        padding: 20,
        boxShadow: hover ? "0 1px 3px rgba(0,0,0,0.04)" : "none",
        transition: "border-color 150ms cubic-bezier(0.4,0,0.2,1), box-shadow 150ms cubic-bezier(0.4,0,0.2,1)",
        fontFamily: T.font,
        cursor: onEdit ? "pointer" : "default",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: T.text, margin: 0 }}>{job.title}</h3>
            <StatusPill status={status} />
          </div>
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", color: T.muted, fontSize: 13 }}>
            {job.location && <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Ic.MapPin /> {job.location}</span>}
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Ic.Dollar /> {salaryRange(job)}</span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><Ic.Clock /> {postedAgoLabel(job.posted_at)}</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div className="hr-job-metrics" style={{ display: "flex", gap: 20 }}>
            <Metric label="Applicants" value={applicants} />
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onView(); }}
            style={{
              background: "#fff", color: T.text,
              border: `1px solid ${T.border}`, borderRadius: T.radius,
              padding: "8px 14px", fontSize: 13, fontWeight: 500,
              cursor: "pointer", whiteSpace: "nowrap", fontFamily: T.font,
              transition: "background 120ms cubic-bezier(0.4,0,0.2,1)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = T.hover; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }}
          >
            View Applicants →
          </button>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, accent }) {
  return (
    <div style={{ textAlign: "left", fontFamily: T.font }}>
      <div style={{ fontSize: 18, fontWeight: 600, color: accent || T.text, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 11, color: T.muted, marginTop: 3 }}>{label}</div>
    </div>
  );
}

// ─── Candidates page ─────────────────────────────────────────────
function CandidatesPage({
  candidates, jobs, selectedJobIdx, onSelectJob,
  tab, onTab, onOpenCandidate, onStatusChange, isLoading, highlightId,
}) {
  const [search, setSearch] = useState("");
  const tabs = ["All", "Shortlisted", "Reviewing", "Rejected"];
  const tabFilterMap = useMemo(
    () => ({ All: null, Shortlisted: "shortlisted", Reviewing: "viewed", Rejected: "rejected" }),
    []
  );
  const counts = useMemo(() => ({
    All: candidates.length,
    Shortlisted: candidates.filter((c) => c.status === "shortlisted").length,
    Reviewing: candidates.filter((c) => c.status === "viewed").length,
    Rejected: candidates.filter((c) => c.status === "rejected").length,
  }), [candidates]);

  const filtered = useMemo(() => {
    const byTab = tab === "All" ? candidates : candidates.filter((c) => c.status === tabFilterMap[tab]);
    if (!search.trim()) return byTab;
    const q = search.trim().toLowerCase();
    return byTab.filter((c) =>
      String(c.candidate_name || "").toLowerCase().includes(q) ||
      String(c.candidate_email || "").toLowerCase().includes(q)
    );
  }, [candidates, tab, search, tabFilterMap]);

  const selectedJob = jobs[selectedJobIdx] || null;

  return (
    <div style={{ fontFamily: T.font }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: T.text, margin: "0 0 4px", letterSpacing: -0.3 }}>Candidates</h1>
        <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>
          Review applicants{selectedJob ? ` for ${selectedJob.title}` : " across all your open roles"}.
        </p>
      </div>

      {/* Job selector */}
      {jobs.length > 1 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          {jobs.map((j, i) => {
            const sel = i === selectedJobIdx;
            return (
              <button
                key={j.id}
                type="button"
                onClick={() => onSelectJob(i)}
                style={{
                  padding: "6px 12px", borderRadius: 999,
                  border: `1px solid ${sel ? T.text : T.border}`,
                  background: sel ? T.text : "#fff",
                  color: sel ? "#fff" : T.muted,
                  fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: T.font,
                  transition: "all 120ms cubic-bezier(0.4,0,0.2,1)",
                }}
              >
                {j.title}
              </button>
            );
          })}
        </div>
      )}

      {/* Filter tabs + search */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        gap: 12, marginBottom: 16, flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {tabs.map((t) => {
            const isActive = t === tab;
            return (
              <button
                key={t}
                type="button"
                onClick={() => onTab(t)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "7px 12px", borderRadius: 999,
                  border: `1px solid ${isActive ? T.text : T.border}`,
                  background: isActive ? T.text : "#fff",
                  color: isActive ? "#fff" : T.muted,
                  fontSize: 12, fontWeight: 500, cursor: "pointer", fontFamily: T.font,
                  transition: "all 120ms cubic-bezier(0.4,0,0.2,1)",
                }}
              >
                {t}
                <span style={{
                  background: isActive ? "rgba(255,255,255,0.2)" : T.hover,
                  color: isActive ? "#fff" : T.muted,
                  fontSize: 10, fontWeight: 600,
                  padding: "1px 6px", borderRadius: 999, minWidth: 16, textAlign: "center",
                }}>
                  {counts[t] || 0}
                </span>
              </button>
            );
          })}
        </div>

        <div className="hr-search" style={{
          display: "flex", alignItems: "center", gap: 8,
          background: "#fff", border: `1px solid ${T.border}`,
          borderRadius: T.radius, padding: "7px 12px",
          minWidth: 220, color: T.muted,
        }}>
          <Ic.Search />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candidates"
            style={{
              border: "none", outline: "none", background: "transparent",
              fontSize: 13, flex: 1, color: T.text, fontFamily: T.font, minWidth: 0,
            }}
          />
        </div>
      </div>

      {/* Table */}
      <div style={{
        background: T.card, border: `1px solid ${T.border}`,
        borderRadius: T.radius, overflow: "hidden",
      }}>
        <div className="hr-cand-head" style={{
          display: "grid",
          gridTemplateColumns: "minmax(220px, 2.2fr) 1.4fr 200px 130px 120px",
          gap: 16, padding: "12px 20px",
          background: T.panel, borderBottom: `1px solid ${T.border}`,
          fontSize: 11, fontWeight: 600, color: T.muted,
          textTransform: "uppercase", letterSpacing: 0.5,
        }}>
          <span>Candidate</span>
          <span>Role</span>
          <span>ATS Match</span>
          <span>Status</span>
          <span />
        </div>
        {isLoading && (
          <div style={{ padding: "60px 20px", textAlign: "center", color: T.muted, fontSize: 13 }}>
            Loading…
          </div>
        )}
        {!isLoading && filtered.length === 0 && (
          <div style={{ padding: "60px 20px", textAlign: "center", color: T.muted, fontSize: 13 }}>
            {selectedJob ? "No candidates in this view yet." : "Post a job to start receiving applicants."}
          </div>
        )}
        {!isLoading && filtered.map((c, i) => (
          <CandidateRow
            key={c.id}
            c={c}
            last={i === filtered.length - 1}
            highlighted={c.id === highlightId}
            roleLabel={selectedJob?.title || ""}
            onView={() => onOpenCandidate(c, i)}
            onStatusChange={(s) => onStatusChange(c.id, s)}
          />
        ))}
      </div>
    </div>
  );
}

function CandidateRow({ c, last, roleLabel, onView, onStatusChange, highlighted }) {
  const [hover, setHover] = useState(false);
  const score = c.ats_score || 0;
  const color = atsColor(score);
  return (
    <div
      className="hr-cand-row"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(220px, 2.2fr) 1.4fr 200px 130px 120px",
        gap: 16, padding: "14px 20px",
        borderBottom: last ? "none" : `1px solid ${T.border}`,
        background: highlighted ? T.infoBg : (hover ? T.panel : "#fff"),
        alignItems: "center",
        transition: "background 100ms cubic-bezier(0.4,0,0.2,1)",
        fontFamily: T.font,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <Avatar name={c.candidate_name || "?"} size={36} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 500, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {c.candidate_name || "—"}
          </div>
          <div style={{ fontSize: 12, color: T.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {c.candidate_email || ""}{c.created_at ? ` · Applied ${timeAgo(c.created_at)}` : ""}
          </div>
        </div>
      </div>
      <div style={{ fontSize: 13, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {roleLabel || "—"}
      </div>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            flex: 1, height: 6, background: T.hover,
            borderRadius: 999, overflow: "hidden", maxWidth: 110,
          }}>
            <div style={{
              width: `${Math.max(0, Math.min(100, score))}%`,
              height: "100%", background: color, borderRadius: 999,
              transition: "width 400ms ease",
            }} />
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text, minWidth: 42 }}>
            {score}<span style={{ color: T.muted, fontWeight: 400 }}>/100</span>
          </div>
        </div>
      </div>
      <div>
        <StatusDropdown status={c.status || "submitted"} onChange={onStatusChange} />
      </div>
      <div style={{ textAlign: "right" }}>
        <button
          type="button"
          onClick={onView}
          style={{
            background: "#fff", color: T.text,
            border: `1px solid ${T.border}`, borderRadius: 6,
            padding: "6px 12px", fontSize: 12, fontWeight: 500,
            cursor: "pointer", whiteSpace: "nowrap", fontFamily: T.font,
            transition: "background 120ms cubic-bezier(0.4,0,0.2,1)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = T.hover; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }}
        >
          View CV
        </button>
      </div>
    </div>
  );
}

// ─── Notifications page ──────────────────────────────────────────
function NotificationsPage({ notifications, onMarkAllRead, onClickNotification }) {
  const unread = notifications.filter((n) => !n.read).length;
  const iconFor = (n) => {
    const t = (n.type || "").toLowerCase();
    if (t.includes("apply") || n.application_id) return { Comp: Ic.Users, bg: T.infoBg, fg: T.infoFg };
    if (t.includes("match") || t.includes("ats")) return { Comp: Ic.Star, bg: T.successBg, fg: T.successFg };
    if (t.includes("expir") || t.includes("close")) return { Comp: Ic.Clock, bg: T.warningBg, fg: T.warningFg };
    return { Comp: Ic.Bell, bg: T.hover, fg: "#4B5563" };
  };
  return (
    <div style={{ fontFamily: T.font }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 600, color: T.text, margin: "0 0 4px", letterSpacing: -0.3 }}>Notifications</h1>
          <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>
            {unread > 0 ? `${unread} unread` : "You're all caught up."}
          </p>
        </div>
        {unread > 0 && (
          <button
            type="button"
            onClick={onMarkAllRead}
            style={{
              background: "#fff", color: T.text,
              border: `1px solid ${T.border}`, borderRadius: T.radius,
              padding: "8px 14px", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: T.font,
              transition: "background 120ms cubic-bezier(0.4,0,0.2,1)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = T.hover; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }}
          >
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div style={{
          background: "#fff", border: `1px solid ${T.border}`,
          borderRadius: T.radius, padding: "60px 20px", textAlign: "center",
          color: T.muted, fontSize: 13,
        }}>
          No notifications yet.
        </div>
      ) : (
        <div style={{ background: "#fff", border: `1px solid ${T.border}`, borderRadius: T.radius, overflow: "hidden" }}>
          {notifications.map((n, i) => {
            const { Comp, bg, fg } = iconFor(n);
            return (
              <div
                key={n.id}
                onClick={() => onClickNotification(n)}
                style={{
                  display: "flex", gap: 14, padding: "16px 20px",
                  borderBottom: i === notifications.length - 1 ? "none" : `1px solid ${T.border}`,
                  background: !n.read ? T.panel : "#fff",
                  position: "relative", cursor: "pointer",
                  transition: "background 120ms cubic-bezier(0.4,0,0.2,1)",
                }}
              >
                {!n.read && (
                  <div style={{
                    position: "absolute", left: 8, top: "50%",
                    transform: "translateY(-50%)",
                    width: 6, height: 6, borderRadius: "50%", background: T.info,
                  }} />
                )}
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: bg, color: fg,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <Comp width={16} height={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
                    <div style={{ fontSize: 14, fontWeight: !n.read ? 600 : 500, color: T.text }}>{n.title}</div>
                    <div style={{ fontSize: 12, color: T.muted, flexShrink: 0 }}>{timeAgo(n.created_at)}</div>
                  </div>
                  {n.body && <div style={{ fontSize: 13, color: T.muted, marginTop: 3 }}>{n.body}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Settings page ───────────────────────────────────────────────
function SettingsPage({ profile, onSave, onSwitchCandidate, onSignOut }) {
  const [form, setForm] = useState({
    company_name: profile?.company_name || "",
    work_email: profile?.work_email || profile?.email || "",
    notify_new_applicant: true,
    notify_top_match: true,
    notify_whatsapp: true,
    notify_weekly: false,
  });
  const [saved, setSaved] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    onSave({ company_name: form.company_name, work_email: form.work_email });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const labelStyle = {
    display: "block", fontSize: 13, fontWeight: 500,
    color: T.text, marginBottom: 6, fontFamily: T.font,
  };
  const inputStyle = {
    width: "100%", padding: "10px 12px",
    border: `1px solid ${T.border}`, borderRadius: T.radius,
    fontSize: 14, color: T.text, background: "#fff",
    outline: "none", fontFamily: T.font, boxSizing: "border-box",
  };
  const sectionStyle = {
    background: "#fff", border: `1px solid ${T.border}`,
    borderRadius: T.radius, padding: 24, marginBottom: 16,
    fontFamily: T.font,
  };

  return (
    <div style={{ maxWidth: 720, fontFamily: T.font }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, color: T.text, margin: "0 0 4px", letterSpacing: -0.3 }}>Settings</h1>
        <p style={{ fontSize: 13, color: T.muted, margin: 0 }}>Manage your company profile and preferences.</p>
      </div>

      <section style={sectionStyle}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: T.text, margin: "0 0 4px" }}>Company</h2>
        <p style={{ fontSize: 13, color: T.muted, margin: "0 0 20px" }}>This appears on all your job postings.</p>
        <div className="hr-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <label style={labelStyle}>Company name</label>
            <input style={inputStyle} value={form.company_name} onChange={(e) => set("company_name", e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Work email</label>
            <input style={inputStyle} type="email" value={form.work_email} onChange={(e) => set("work_email", e.target.value)} />
          </div>
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: T.text, margin: "0 0 4px" }}>Notifications</h2>
        <p style={{ fontSize: 13, color: T.muted, margin: "0 0 20px" }}>Decide how you want to be alerted.</p>
        {[
          { key: "notify_new_applicant", label: "New applicant emails", desc: "Get notified the moment someone applies to your job." },
          { key: "notify_top_match", label: "High-match alerts", desc: "Alert me when a candidate scores 85+ on the ATS." },
          { key: "notify_whatsapp", label: "WhatsApp updates", desc: "Receive urgent hiring updates on WhatsApp." },
          { key: "notify_weekly", label: "Weekly summary", desc: "Every Monday, get a digest of the past week." },
        ].map((row, idx, arr) => (
          <div key={row.key} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "14px 0", gap: 16,
            borderBottom: idx === arr.length - 1 ? "none" : `1px solid ${T.border}`,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: T.text }}>{row.label}</div>
              <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{row.desc}</div>
            </div>
            <Toggle value={form[row.key]} onChange={(v) => set(row.key, v)} />
          </div>
        ))}
      </section>

      <section style={sectionStyle}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: T.text, margin: "0 0 4px" }}>Plan</h2>
        <p style={{ fontSize: 13, color: T.muted, margin: "0 0 20px" }}>You&apos;re on the Free plan.</p>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          background: T.panel, border: `1px solid ${T.border}`,
          borderRadius: T.radius, padding: "18px 20px", gap: 16, flexWrap: "wrap",
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: T.text }}>Free Plan</div>
              <span style={{
                fontSize: 11, fontWeight: 600, color: T.muted,
                background: T.hover, padding: "2px 8px", borderRadius: 999,
                letterSpacing: 0.3,
              }}>CURRENT</span>
            </div>
            <div style={{ fontSize: 13, color: T.muted }}>
              1 active job · 25 applicants / month · basic ATS
            </div>
          </div>
          <button
            type="button"
            style={{
              background: T.accent, color: "#fff", border: "none",
              borderRadius: T.radius, padding: "10px 18px",
              fontSize: 13, fontWeight: 500, cursor: "pointer", whiteSpace: "nowrap", fontFamily: T.font,
              transition: "background 150ms cubic-bezier(0.4,0,0.2,1)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = T.accentHover; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = T.accent; }}
          >
            Upgrade to Pro
          </button>
        </div>
      </section>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginBottom: 24 }}>
        {saved && (
          <span style={{ fontSize: 13, color: T.success, alignSelf: "center", display: "inline-flex", alignItems: "center", gap: 4 }}>
            <Ic.Check /> Saved
          </span>
        )}
        <button
          type="button"
          onClick={save}
          style={{
            background: T.accent, color: "#fff", border: "none",
            borderRadius: T.radius, padding: "10px 20px",
            fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: T.font,
            transition: "background 150ms cubic-bezier(0.4,0,0.2,1)",
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = T.accentHover; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = T.accent; }}
        >
          Save changes
        </button>
      </div>

      <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 16, display: "flex", flexDirection: "column", gap: 6 }}>
        <button
          type="button"
          onClick={onSwitchCandidate}
          style={{ fontSize: 13, color: T.muted, cursor: "pointer", fontFamily: T.font, background: "none", border: "none", textAlign: "left", padding: 0 }}
        >
          Switch to Candidate
        </button>
        <button
          type="button"
          onClick={onSignOut}
          style={{ fontSize: 13, color: T.muted2, cursor: "pointer", fontFamily: T.font, background: "none", border: "none", textAlign: "left", padding: 0 }}
        >
          Sign out
        </button>
      </div>
    </div>
  );
}

// ─── Post Job modal (handles both create and edit) ───────────────
// AI parse-JD removed Apr 25 2026 — field was UI-only with no backing
// API; client paste was silently discarded on submit. Real parse path is
// a Q2 task (new edge function + JD-shaped JSON output schema).
function buildJobForm(job) {
  if (!job) {
    return {
      title: "",
      department: "",
      location: "",
      job_type: "full-time",
      market: "gulf",
      visa_sponsored: true,
      salary_min: "",
      salary_max: "",
      description: "",
      requirements: "",
      hiring_status: "active",
    };
  }
  return {
    title: job.title || "",
    department: job.department || "",
    location: job.location || "",
    job_type: job.job_type || "full-time",
    market: job.market || "gulf",
    visa_sponsored: !!job.visa_sponsored,
    salary_min: job.salary_min != null ? String(job.salary_min) : "",
    salary_max: job.salary_max != null ? String(job.salary_max) : "",
    description: job.description || "",
    requirements: Array.isArray(job.requirements) ? job.requirements.join("\n") : "",
    hiring_status: job.hiring_status || "active",
  };
}

function PostJobModal({ open, onClose, onSubmit, job }) {
  const isEdit = !!job;
  const [form, setForm] = useState(() => buildJobForm(job));
  // Reset form whenever the modal switches between jobs (or between create/edit).
  useEffect(() => { setForm(buildJobForm(job)); }, [job?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (!open) return undefined;
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const labelStyle = {
    display: "block", fontSize: 12, fontWeight: 500,
    color: T.text, marginBottom: 6, fontFamily: T.font,
  };
  const inputStyle = {
    width: "100%", padding: "9px 12px",
    border: `1px solid ${T.border}`, borderRadius: T.radius,
    fontSize: 13, color: T.text, background: "#fff",
    outline: "none", fontFamily: T.font, boxSizing: "border-box",
  };
  const segBtn = (active) => ({
    flex: 1, padding: "9px 10px",
    border: `1px solid ${active ? T.text : T.border}`,
    background: active ? T.text : "#fff",
    color: active ? "#fff" : T.text,
    borderRadius: T.radius, fontSize: 12, fontWeight: 500,
    cursor: "pointer", fontFamily: T.font,
    transition: "all 120ms cubic-bezier(0.4,0,0.2,1)",
  });

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(17,24,39,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 16, overflowY: "auto", fontFamily: T.font,
      }}
    >
      <div style={{
        background: "#fff", borderRadius: 12,
        width: "100%", maxWidth: 600, maxHeight: "90vh",
        display: "flex", flexDirection: "column",
        overflow: "hidden", boxShadow: "0 20px 40px rgba(0,0,0,0.15)",
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "18px 24px", borderBottom: `1px solid ${T.border}`,
        }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 600, color: T.text, margin: 0 }}>
              {isEdit ? "Edit Job" : "Post a Job"}
            </h2>
            <p style={{ fontSize: 12, color: T.muted, margin: "3px 0 0" }}>
              {isEdit
                ? "Update any field below. Changes save back to the live posting."
                : "Fill in the details below. You can edit after publishing."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{ background: "transparent", border: "none", color: T.muted, cursor: "pointer", padding: 4, borderRadius: 6 }}
          >
            <Ic.Close />
          </button>
        </div>

        <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>
          <div className="hr-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Job title *</label>
              <input style={inputStyle} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="Senior Accountant" />
            </div>
            <div>
              <label style={labelStyle}>Department</label>
              <input style={inputStyle} value={form.department} onChange={(e) => set("department", e.target.value)} placeholder="Finance" />
            </div>
          </div>

          <div className="hr-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Location *</label>
              <input style={inputStyle} value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Dubai, UAE" />
            </div>
            <div>
              <label style={labelStyle}>Job type</label>
              <select style={inputStyle} value={form.job_type} onChange={(e) => set("job_type", e.target.value)}>
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
                <option value="internship">Internship</option>
              </select>
            </div>
          </div>

          <div className="hr-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Market</label>
              <div style={{ display: "flex", gap: 6 }}>
                {[{ v: "gulf", l: "Gulf / UAE" }, { v: "india", l: "India" }].map((o) => (
                  <button key={o.v} type="button" onClick={() => set("market", o.v)} style={segBtn(form.market === o.v)}>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Visa sponsorship</label>
              <div style={{ display: "flex", gap: 6 }}>
                {[{ v: true, l: "Yes" }, { v: false, l: "No" }].map((o) => (
                  <button key={String(o.v)} type="button" onClick={() => set("visa_sponsored", o.v)} style={segBtn(form.visa_sponsored === o.v)}>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="hr-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Salary min (AED)</label>
              <input style={inputStyle} type="number" value={form.salary_min} onChange={(e) => set("salary_min", e.target.value)} placeholder="8,000" />
            </div>
            <div>
              <label style={labelStyle}>Salary max (AED)</label>
              <input style={inputStyle} type="number" value={form.salary_max} onChange={(e) => set("salary_max", e.target.value)} placeholder="15,000" />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Job description</label>
            <textarea
              style={{ ...inputStyle, minHeight: 90, resize: "vertical", lineHeight: 1.5 }}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Describe the role, responsibilities, and what success looks like…"
            />
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>
              Requirements <span style={{ color: T.muted, fontWeight: 400 }}>(one per line)</span>
            </label>
            <textarea
              style={{ ...inputStyle, minHeight: 70, resize: "vertical", lineHeight: 1.5 }}
              value={form.requirements}
              onChange={(e) => set("requirements", e.target.value)}
              placeholder={"3+ years experience\nCPA certification\nAdvanced Excel"}
            />
          </div>

          <div>
            <label style={labelStyle}>Hiring status</label>
            <select style={inputStyle} value={form.hiring_status} onChange={(e) => set("hiring_status", e.target.value)}>
              <option value="active">Actively hiring</option>
              <option value="urgent">Urgently hiring</option>
              <option value="slow">Slow hiring</option>
            </select>
          </div>
        </div>

        <div style={{
          display: "flex", justifyContent: "flex-end", gap: 10,
          padding: "14px 24px", borderTop: `1px solid ${T.border}`,
          background: T.panel,
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "#fff", color: T.text,
              border: `1px solid ${T.border}`, borderRadius: T.radius,
              padding: "9px 18px", fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: T.font,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onSubmit(form)}
            style={{
              background: T.accent, color: "#fff", border: "none",
              borderRadius: T.radius, padding: "9px 18px",
              fontSize: 13, fontWeight: 500, cursor: "pointer", fontFamily: T.font,
              transition: "background 150ms cubic-bezier(0.4,0,0.2,1)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = T.accentHover; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = T.accent; }}
          >
            {isEdit ? "Save Changes" : "Post Job"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CV side panel (white restyle) ───────────────────────────────
function CVPanel({ candidate, hrCompany, jobTitle, onClose, onStatusChange, onSaveNote, onPrev, onNext, currentIndex, totalCount }) {
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  useEffect(() => {
    if (!candidate) return undefined;
    const handler = (e) => {
      if (e.key === "j") onNext?.();
      if (e.key === "k") onPrev?.();
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [candidate, onClose, onNext, onPrev]);

  if (!candidate) return null;

  const matchedKw = candidate.match_keywords || [];
  const missingKw = candidate.missing_keywords || [];
  const cvData = candidate.cv_snapshot || {};
  const workHistory = cvData.experience || [];
  const firstName = (candidate.candidate_name || "").split(" ")[0];
  const waMsg = encodeURIComponent(
    `Hi ${firstName}, I'm reaching out${hrCompany ? ` from ${hrCompany}` : ""} regarding your application${jobTitle ? ` for ${jobTitle}` : ""}. Are you available for a quick call?`
  );
  // wa.me requires bare digits (no +, dashes, spaces). Demo data ships
  // with formatted phones like "+971-50-555-1101" → strip everything that
  // isn't a digit before building the URL.
  const waDigits = String(candidate.candidate_phone || "").replace(/\D/g, "");
  const waHref = waDigits ? `https://wa.me/${waDigits}?text=${waMsg}` : null;
  // mailto: subject + body — encoded so spaces and the explicit %0D%0A
  // line breaks survive into the user's mail client.
  const emailSubject = encodeURIComponent(`Re: Your application for ${jobTitle || "this role"}`);
  const emailBody = encodeURIComponent(
    `Hi ${firstName || "there"},\r\n\r\nWe reviewed your application for ${jobTitle || "this role"}${hrCompany ? ` at ${hrCompany}` : ""} and would like to...`
  );
  const emailHref = candidate.candidate_email
    ? `mailto:${candidate.candidate_email}?subject=${emailSubject}&body=${emailBody}`
    : null;
  // Status select — only the three options the demo wires (Shortlisted,
  // Reviewing, Rejected). If the candidate's current status is anything
  // else (New, Interviewing, etc.) we still surface it as a disabled
  // first option so the select shows truth.
  const PANEL_STATUS_OPTIONS = [
    { value: "shortlisted", label: "Shortlisted" },
    { value: "viewed",      label: "Reviewing" },
    { value: "rejected",    label: "Rejected" },
  ];
  const currentStatus = candidate.status || "submitted";
  const knownStatusValues = PANEL_STATUS_OPTIONS.map((o) => o.value);
  const showFallbackStatusOption = !knownStatusValues.includes(currentStatus);

  return (
    <div
      style={{
        position: "fixed", top: 0, right: 0,
        width: PANEL_W, maxWidth: "100vw",
        height: "100vh",
        background: "#fff", borderLeft: `1px solid ${T.border}`,
        zIndex: 600, display: "flex", flexDirection: "column",
        fontFamily: T.font, overflowY: "auto",
        boxShadow: "-12px 0 36px rgba(17,24,39,0.08)",
      }}
    >
      <div style={{
        padding: "14px 20px", borderBottom: `1px solid ${T.border}`,
        display: "flex", justifyContent: "space-between", alignItems: "center",
      }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: "none", border: "none", color: T.muted,
            fontSize: 13, cursor: "pointer", fontFamily: T.font,
            display: "inline-flex", alignItems: "center", gap: 6,
          }}
        >
          <Ic.ArrowLeft /> Back
        </button>
        <span style={{ fontSize: 13, fontWeight: 500, color: T.text }}>{candidate.candidate_name}</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{ background: "none", border: "none", color: T.muted, cursor: "pointer", padding: 4 }}
        >
          <Ic.Close />
        </button>
      </div>

      <div style={{ padding: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div style={{ minWidth: 0 }}>
          <h3 style={{ fontSize: 17, fontWeight: 600, color: T.text, margin: "0 0 4px", fontFamily: T.font }}>
            {candidate.candidate_name}
          </h3>
          <p style={{ fontSize: 12, color: T.muted, margin: "0 0 12px" }}>
            {[cvData.role, cvData.experience_years && `${cvData.experience_years}yr`, cvData.location].filter(Boolean).join(" · ")}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {cvData.location && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Ic.MapPin /> <span style={{ fontSize: 12, color: T.muted }}>{cvData.location}</span>
              </div>
            )}
            {cvData.notice_period && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Ic.Clock /> <span style={{ fontSize: 12, color: T.muted }}>{cvData.notice_period}</span>
              </div>
            )}
            {candidate.visa_status && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{
                  fontSize: 11, padding: "2px 8px", borderRadius: 999,
                  background: candidate.visa_status === "Sponsored" ? T.successBg : T.hover,
                  color: candidate.visa_status === "Sponsored" ? T.successFg : T.muted,
                  fontWeight: 500,
                }}>
                  {candidate.visa_status}
                </span>
              </div>
            )}
          </div>
        </div>
        <ScoreRing score={candidate.ats_score || 0} />
      </div>

      <div style={{ padding: "0 20px 20px" }}>
        <h4 style={{ fontSize: 12, fontWeight: 600, color: T.text, margin: "0 0 10px", textTransform: "uppercase", letterSpacing: 0.3 }}>
          ATS Keyword Match
        </h4>
        {matchedKw.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
            {matchedKw.map((s) => (
              <span key={s} style={{ background: T.successBg, color: T.successFg, fontSize: 11, padding: "3px 8px", borderRadius: 4, fontWeight: 500 }}>
                {s}
              </span>
            ))}
          </div>
        )}
        {missingKw.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {missingKw.map((s) => (
              <span key={s} style={{ background: T.hover, color: T.muted, fontSize: 11, padding: "3px 8px", borderRadius: 4, textDecoration: "line-through" }}>
                {s}
              </span>
            ))}
          </div>
        )}
        {matchedKw.length === 0 && missingKw.length === 0 && (
          <p style={{ fontSize: 12, color: T.muted, margin: 0 }}>No keyword data available</p>
        )}
      </div>

      <div style={{ padding: "0 20px 20px" }}>
        <h4 style={{ fontSize: 12, fontWeight: 600, color: T.text, margin: "0 0 10px", textTransform: "uppercase", letterSpacing: 0.3 }}>
          Work history
        </h4>
        {workHistory.length === 0 && (
          <p style={{ fontSize: 12, color: T.muted, margin: 0 }}>No work history available</p>
        )}
        {workHistory.map((w, i) => (
          <div key={i} style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 13, color: T.text, margin: 0, fontWeight: 500 }}>{w.title || w.role}</p>
            <p style={{ fontSize: 12, color: T.muted, margin: "2px 0 0" }}>
              {w.company}{w.period ? ` · ${w.period}` : ""}
            </p>
          </div>
        ))}
      </div>

      {/* ── Recruiter notes ─────────────────────────────────────── */}
      <div style={{ padding: "0 20px 100px" }}>
        <h4 style={{ fontSize: 12, fontWeight: 600, color: T.text, margin: "0 0 10px", textTransform: "uppercase", letterSpacing: 0.3 }}>
          Recruiter Notes
        </h4>
        {(() => {
          const raw = Array.isArray(candidate.recruiter_notes) ? candidate.recruiter_notes : [];
          const notes = [...raw].sort(
            (a, b) => new Date(b?.ts || 0).getTime() - new Date(a?.ts || 0).getTime()
          );
          if (notes.length === 0) {
            return (
              <p style={{ fontSize: 12, color: T.muted, margin: "0 0 12px" }}>
                No notes yet. Add one below to track decisions.
              </p>
            );
          }
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
              {notes.map((n, i) => (
                <div
                  // eslint-disable-next-line react/no-array-index-key
                  key={`${n?.ts || "note"}-${i}`}
                  style={{
                    background: T.panel,
                    border: `1px solid ${T.border}`,
                    borderRadius: T.radius,
                    padding: "10px 12px",
                  }}
                >
                  <p style={{ margin: 0, fontSize: 13, color: T.text, lineHeight: 1.45, whiteSpace: "pre-wrap" }}>
                    {n?.text || ""}
                  </p>
                  <div style={{ marginTop: 6, fontSize: 11, color: T.muted, fontFamily: T.font }}>
                    {n?.author || "HR"} · {formatNoteTime(n?.ts)}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

        <textarea
          rows={3}
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.target.value)}
          placeholder="Add a note…"
          disabled={savingNote}
          style={{
            width: "100%", padding: "10px 12px",
            border: `1px solid ${T.border}`, borderRadius: T.radius,
            fontSize: 13, color: T.text, background: "#fff",
            fontFamily: T.font, resize: "vertical", lineHeight: 1.4,
            outline: "none", boxSizing: "border-box",
            marginBottom: 8,
          }}
        />
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={async () => {
              const trimmed = noteDraft.trim();
              if (!trimmed || savingNote) return;
              setSavingNote(true);
              const result = await onSaveNote(candidate.id, trimmed);
              setSavingNote(false);
              if (result?.ok) setNoteDraft("");
            }}
            disabled={!noteDraft.trim() || savingNote}
            style={{
              background: T.accent, color: "#fff",
              border: "none", borderRadius: T.radius,
              padding: "8px 16px", fontSize: 13, fontWeight: 500,
              cursor: noteDraft.trim() && !savingNote ? "pointer" : "not-allowed",
              opacity: noteDraft.trim() && !savingNote ? 1 : 0.5,
              fontFamily: T.font,
              transition: "background 150ms cubic-bezier(0.4,0,0.2,1)",
            }}
            onMouseEnter={(e) => { if (!savingNote && noteDraft.trim()) e.currentTarget.style.background = T.accentHover; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = T.accent; }}
          >
            {savingNote ? "Saving…" : "Save Note"}
          </button>
        </div>
      </div>

      <div style={{
        position: "sticky", bottom: 0,
        background: "#fff", borderTop: `1px solid ${T.border}`,
        padding: "12px 20px",
        display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
      }}>
        <a
          href={waHref || undefined}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={!waHref}
          onClick={(e) => { if (!waHref) e.preventDefault(); }}
          style={{
            background: T.success, color: "#fff",
            border: "none", borderRadius: T.radius,
            padding: "8px 14px", fontSize: 12, fontWeight: 500,
            cursor: waHref ? "pointer" : "not-allowed",
            opacity: waHref ? 1 : 0.5,
            textDecoration: "none", fontFamily: T.font,
          }}
        >
          Message {firstName || "candidate"}
        </a>
        <a
          href={emailHref || undefined}
          aria-disabled={!emailHref}
          onClick={(e) => { if (!emailHref) e.preventDefault(); }}
          style={{
            background: "#fff", color: T.text,
            border: `1px solid ${T.border}`, borderRadius: T.radius,
            padding: "7px 14px", fontSize: 12, fontWeight: 500,
            cursor: emailHref ? "pointer" : "not-allowed",
            opacity: emailHref ? 1 : 0.5,
            textDecoration: "none", fontFamily: T.font,
            display: "inline-flex", alignItems: "center", gap: 6,
          }}
          onMouseEnter={(e) => { if (emailHref) e.currentTarget.style.background = T.hover; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "#fff"; }}
        >
          Email {firstName || "candidate"}
        </a>
        <label style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          fontSize: 11, color: T.muted, fontFamily: T.font,
          letterSpacing: 0.2, textTransform: "uppercase", fontWeight: 500,
        }}>
          Status
          <select
            value={currentStatus}
            onChange={(e) => onStatusChange(candidate.id, e.target.value)}
            style={{
              background: statusColor(STATUS_DISPLAY[currentStatus] || "New").bg,
              color: statusColor(STATUS_DISPLAY[currentStatus] || "New").fg,
              border: `1px solid ${T.border}`, borderRadius: 999,
              padding: "5px 10px", fontSize: 12, fontWeight: 500,
              cursor: "pointer", fontFamily: T.font,
              appearance: "auto",
            }}
          >
            {showFallbackStatusOption && (
              <option value={currentStatus} disabled>
                {STATUS_DISPLAY[currentStatus] || "New"}
              </option>
            )}
            {PANEL_STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <button
            type="button"
            onClick={onPrev}
            aria-label="Previous"
            style={{ background: "#fff", border: `1px solid ${T.border}`, color: T.muted, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, fontFamily: T.font }}
          >
            ←
          </button>
          <span style={{ fontSize: 11, color: T.muted, fontFamily: T.font }}>
            {currentIndex + 1} of {totalCount}
          </span>
          <button
            type="button"
            onClick={onNext}
            aria-label="Next"
            style={{ background: "#fff", border: `1px solid ${T.border}`, color: T.muted, borderRadius: 6, padding: "4px 10px", cursor: "pointer", fontSize: 12, fontFamily: T.font }}
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main HRPortal ───────────────────────────────────────────────
export default function HRPortal() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [hrProfile, setHrProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeNav, setActiveNav] = useState("jobs");
  const [activeTab, setActiveTab] = useState("All");
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);
  const [selectedJobIdx, setSelectedJobIdx] = useState(0);
  const [candidates, setCandidates] = useState([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [panelCandidate, setPanelCandidate] = useState(null);
  const [panelIdx, setPanelIdx] = useState(-1);
  const [showPostJob, setShowPostJob] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [toast, setToast] = useState(null);
  const toastTimerRef = useRef(null);

  const showToast = useCallback((text, kind = "success") => {
    setToast({ text, kind });
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToast(null), 3500);
  }, []);

  useEffect(() => () => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
  }, []);
  const [notifications, setNotifications] = useState([]);
  const [highlightId, setHighlightId] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // ─── Auth check ─────────────────────────────────
  useEffect(() => {
    if (!supabase) return undefined;
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session?.user) { navigate("/auth"); return; }
      const { data: prof } = await supabase
        .from("profiles")
        .select("user_type, company_name, work_email, email")
        .eq("id", session.user.id)
        .single();
      if (cancelled) return;
      if (!prof || !["recruiter", "both"].includes(prof.user_type)) {
        navigate("/dashboard");
        return;
      }
      setUser(session.user);
      setHrProfile(prof);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  // ─── Load jobs ──────────────────────────────────
  useEffect(() => {
    if (!supabase || !user?.id) return;
    setJobsLoading(true);
    (async () => {
      const { data } = await supabase
        .from("jobs")
        .select("*, applications(count)")
        .eq("hr_id", user.id)
        .eq("status", "published")
        .order("posted_at", { ascending: false });
      if (data) setJobs(data);
      setJobsLoading(false);
    })();
  }, [user?.id]);

  // ─── Load candidates for selected job ───────────
  const selectedJob = jobs[selectedJobIdx] || null;

  useEffect(() => {
    if (!supabase || !selectedJob?.id) {
      setCandidates([]);
      return;
    }
    setCandidatesLoading(true);
    (async () => {
      const { data } = await supabase
        .from("applications")
        .select("*")
        .eq("job_id", selectedJob.id)
        .eq("is_visible_to_hr", true)
        .order("ats_score", { ascending: false });
      if (data) setCandidates(data);
      setCandidatesLoading(false);
    })();
  }, [selectedJob?.id]);

  // ─── Load notifications ─────────────────────────
  useEffect(() => {
    if (!supabase || !user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("hr_notifications")
        .select("*")
        .eq("hr_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (data) setNotifications(data);
    })();
  }, [user?.id]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // ─── Handlers ───────────────────────────────────
  const handleStatusChange = useCallback(async (applicationId, newStatus) => {
    const app = candidates.find((c) => c.id === applicationId);
    const oldStatus = app?.status || "submitted";
    setCandidates((prev) => prev.map((c) => (c.id === applicationId ? { ...c, status: newStatus } : c)));
    if (panelCandidate?.id === applicationId) {
      setPanelCandidate((prev) => (prev ? { ...prev, status: newStatus } : prev));
    }
    if (!supabase || !user?.id) return;
    await supabase
      .from("applications")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", applicationId);
    if (app) {
      await supabase.from("candidate_events").insert({
        candidate_id: app.candidate_id,
        job_id: app.job_id,
        hr_id: user.id,
        event_type: newStatus,
        metadata: { changed_by: user.id, previous_status: oldStatus },
      });
    }

    // Side effect: shortlist email via Resend. Best-effort — never blocks
    // the status update. Failures surface as a yellow toast.
    if (newStatus === "shortlisted" && app?.candidate_email) {
      const jobTitle = jobs.find((j) => j.id === app.job_id)?.title || "your application";
      try {
        const r = await fetch("/api/notify-candidate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            applicationId,
            candidateEmail: app.candidate_email,
            candidateName: app.candidate_name,
            jobTitle,
          }),
        });
        const json = await r.json().catch(() => ({}));
        if (r.ok && json.ok) {
          showToast(`Shortlist email sent to ${app.candidate_email}`, "success");
        } else {
          // eslint-disable-next-line no-console
          console.warn("[shortlist-email] failed:", json?.error || r.status);
          showToast("Status saved, but email failed to send", "warning");
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("[shortlist-email] threw:", e);
        showToast("Status saved, but email failed to send", "warning");
      }
    }
  }, [candidates, panelCandidate, user?.id, jobs, showToast]);

  const handleSaveNote = useCallback(async (applicationId, noteText) => {
    const trimmed = String(noteText || "").trim();
    if (!trimmed || !supabase) return { ok: false };
    const { data: newNotes, error } = await supabase.rpc("append_recruiter_note", {
      p_app_id: applicationId,
      p_text: trimmed,
    });
    if (error) {
      // eslint-disable-next-line no-console
      console.warn("[append_recruiter_note]", error.message);
      showToast(error.message || "Failed to save note", "error");
      return { ok: false };
    }
    setCandidates((prev) =>
      prev.map((c) => (c.id === applicationId ? { ...c, recruiter_notes: newNotes } : c))
    );
    if (panelCandidate?.id === applicationId) {
      setPanelCandidate((prev) => (prev ? { ...prev, recruiter_notes: newNotes } : prev));
    }
    showToast("Note saved", "success");
    return { ok: true };
  }, [panelCandidate?.id, showToast]);

  const openPanel = useCallback(async (candidate, idx) => {
    setPanelCandidate(candidate);
    setPanelIdx(idx);
    if (supabase && user?.id && candidate.status === "submitted") {
      const now = new Date().toISOString();
      await supabase
        .from("applications")
        .update({ status: "viewed", viewed_at: now, updated_at: now })
        .eq("id", candidate.id)
        .eq("status", "submitted");
      await supabase.from("candidate_events").insert({
        candidate_id: candidate.candidate_id,
        job_id: candidate.job_id,
        hr_id: user.id,
        event_type: "viewed",
        metadata: { viewed_at: now },
      });
      setCandidates((prev) =>
        prev.map((c) => (c.id === candidate.id && c.status === "submitted" ? { ...c, status: "viewed", viewed_at: now } : c))
      );
      setPanelCandidate((prev) =>
        prev && prev.id === candidate.id && prev.status === "submitted" ? { ...prev, status: "viewed", viewed_at: now } : prev
      );
    }
  }, [user?.id]);

  const handlePostJob = useCallback(async (form) => {
    if (!supabase || !user?.id || !hrProfile) return;
    const reqLines = (form.requirements || "").split("\n").map((l) => l.trim()).filter(Boolean);
    const { data } = await supabase.from("jobs").insert({
      hr_id: user.id,
      title: form.title,
      company: hrProfile.company_name || "",
      department: form.department,
      location: form.location,
      market: form.market,
      job_type: form.job_type,
      salary_min: form.salary_min ? Number(form.salary_min) : null,
      salary_max: form.salary_max ? Number(form.salary_max) : null,
      visa_sponsored: form.visa_sponsored,
      description: form.description,
      requirements: reqLines,
      keywords: [],
      hiring_status: form.hiring_status,
      status: "published",
      posted_at: new Date().toISOString(),
    }).select("*, applications(count)").single();
    if (data) {
      setJobs((prev) => [data, ...prev]);
      setSelectedJobIdx(0);
    }
    setShowPostJob(false);
  }, [user?.id, hrProfile]);

  const handleEditJob = useCallback(async (form) => {
    if (!supabase || !editingJob?.id) return;
    const reqLines = (form.requirements || "").split("\n").map((l) => l.trim()).filter(Boolean);
    const { data } = await supabase.from("jobs").update({
      title: form.title,
      department: form.department,
      location: form.location,
      market: form.market,
      job_type: form.job_type,
      salary_min: form.salary_min ? Number(form.salary_min) : null,
      salary_max: form.salary_max ? Number(form.salary_max) : null,
      visa_sponsored: form.visa_sponsored,
      description: form.description,
      requirements: reqLines,
      hiring_status: form.hiring_status,
    }).eq("id", editingJob.id).select("*, applications(count)").single();
    if (data) {
      setJobs((prev) => prev.map((j) => (j.id === data.id ? data : j)));
    }
    setEditingJob(null);
  }, [editingJob]);

  const handleMarkAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    if (supabase && user?.id) {
      await supabase
        .from("hr_notifications")
        .update({ read: true })
        .eq("hr_id", user.id)
        .eq("read", false);
    }
  }, [user?.id]);

  const handleClickNotification = useCallback((n) => {
    setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    if (supabase) supabase.from("hr_notifications").update({ read: true }).eq("id", n.id);
    setActiveNav("candidates");
    if (n.application_id) {
      setHighlightId(n.application_id);
      setTimeout(() => setHighlightId(null), 2000);
    }
  }, []);

  const handleSaveSettings = useCallback(async (form) => {
    if (!supabase || !user?.id) return;
    await supabase.from("profiles").update({
      company_name: form.company_name,
      work_email: form.work_email,
    }).eq("id", user.id);
    setHrProfile((prev) => ({ ...prev, company_name: form.company_name, work_email: form.work_email }));
  }, [user?.id]);

  const handleSignOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut();
    navigate("/");
  }, [navigate]);

  const handleSwitchCandidate = useCallback(() => navigate("/dashboard"), [navigate]);

  const handleViewApplicants = useCallback((jobId) => {
    const idx = jobs.findIndex((j) => j.id === jobId);
    if (idx >= 0) setSelectedJobIdx(idx);
    setActiveNav("candidates");
    setMobileNavOpen(false);
  }, [jobs]);

  // Filtered candidate list for panel navigation
  const tabFilterMap = { All: null, Shortlisted: "shortlisted", Reviewing: "viewed", Rejected: "rejected" };
  const tabFiltered = useMemo(() =>
    activeTab === "All" ? candidates : candidates.filter((c) => c.status === tabFilterMap[activeTab]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [candidates, activeTab]
  );

  if (loading) {
    return (
      <div style={{ background: T.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: T.font }}>
        <p style={{ color: T.muted }}>Loading…</p>
      </div>
    );
  }

  const pageTitle = { jobs: "Jobs", candidates: "Candidates", notifications: "Notifications", settings: "Settings" }[activeNav];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: T.bg, fontFamily: T.font }}>
      <Sidebar
        active={activeNav}
        onNav={(k) => { setActiveNav(k); }}
        unread={unreadCount}
        onPostJob={() => { setShowPostJob(true); setMobileNavOpen(false); }}
        openOnMobile={mobileNavOpen}
        onCloseMobile={() => setMobileNavOpen(false)}
        hrProfile={hrProfile}
        onSwitchCandidate={handleSwitchCandidate}
        onSignOut={handleSignOut}
      />

      <main className="hr-main" style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div className="hr-mobile-topbar" style={{
          display: "none",
          alignItems: "center", justifyContent: "space-between",
          padding: "12px 16px", borderBottom: `1px solid ${T.border}`,
          background: "#fff", position: "sticky", top: 0, zIndex: 30,
        }}>
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open menu"
            style={{ background: "transparent", border: "none", padding: 6, cursor: "pointer", color: T.text }}
          >
            <Ic.Menu />
          </button>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{pageTitle}</div>
          <button
            type="button"
            onClick={() => setShowPostJob(true)}
            aria-label="Post a job"
            style={{
              background: T.accent, color: "#fff",
              border: "none", borderRadius: 6,
              padding: "6px 10px", fontSize: 12, fontWeight: 500, cursor: "pointer",
              display: "inline-flex", alignItems: "center", gap: 4, fontFamily: T.font,
            }}
          >
            <Ic.Plus />
          </button>
        </div>

        <div className="hr-page-inner" style={{ flex: 1, padding: "32px 36px", maxWidth: 1200, width: "100%" }}>
          {activeNav === "jobs" && (
            <JobsPage
              jobs={jobs}
              isLoading={jobsLoading}
              onPostJob={() => setShowPostJob(true)}
              onViewApplicants={handleViewApplicants}
              onEditJob={(job) => setEditingJob(job)}
            />
          )}
          {activeNav === "candidates" && (
            <CandidatesPage
              candidates={candidates}
              jobs={jobs}
              selectedJobIdx={selectedJobIdx}
              onSelectJob={(i) => setSelectedJobIdx(i)}
              tab={activeTab}
              onTab={setActiveTab}
              onOpenCandidate={openPanel}
              onStatusChange={handleStatusChange}
              isLoading={candidatesLoading}
              highlightId={highlightId}
            />
          )}
          {activeNav === "notifications" && (
            <NotificationsPage
              notifications={notifications}
              onMarkAllRead={handleMarkAllRead}
              onClickNotification={handleClickNotification}
            />
          )}
          {activeNav === "settings" && (
            <SettingsPage
              profile={hrProfile}
              onSave={handleSaveSettings}
              onSwitchCandidate={handleSwitchCandidate}
              onSignOut={handleSignOut}
            />
          )}
        </div>
      </main>

      {panelCandidate && (
        <CVPanel
          candidate={panelCandidate}
          hrCompany={hrProfile?.company_name}
          jobTitle={selectedJob?.title}
          onClose={() => setPanelCandidate(null)}
          onStatusChange={handleStatusChange}
          onSaveNote={handleSaveNote}
          currentIndex={panelIdx}
          totalCount={tabFiltered.length || 1}
          onPrev={() => {
            if (!tabFiltered.length) return;
            const prev = panelIdx > 0 ? panelIdx - 1 : tabFiltered.length - 1;
            setPanelIdx(prev);
            setPanelCandidate(tabFiltered[prev]);
          }}
          onNext={() => {
            if (!tabFiltered.length) return;
            const next = panelIdx < tabFiltered.length - 1 ? panelIdx + 1 : 0;
            setPanelIdx(next);
            setPanelCandidate(tabFiltered[next]);
          }}
        />
      )}

      <PostJobModal
        key={editingJob?.id || "new"}
        open={showPostJob || !!editingJob}
        job={editingJob}
        onClose={() => { setShowPostJob(false); setEditingJob(null); }}
        onSubmit={editingJob ? handleEditJob : handlePostJob}
      />

      {toast && <Toast text={toast.text} kind={toast.kind} />}

      <style>{`
        @keyframes hr-shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .hr-skeleton {
          background: linear-gradient(90deg, #f1f3f6 0%, #e3e6ec 50%, #f1f3f6 100%);
          background-size: 200% 100%;
          animation: hr-shimmer 1.4s linear infinite;
          flex-shrink: 0;
        }
        @media (prefers-reduced-motion: reduce) {
          .hr-skeleton { animation: none; background: #eceef2; }
        }
        @media (max-width: ${MOBILE_BP}px) {
          .hr-sb {
            position: fixed !important;
            top: 0; left: 0; bottom: 0;
            transform: translateX(-100%);
            transition: transform 220ms cubic-bezier(0.4,0,0.2,1);
          }
          .hr-sb-open { transform: translateX(0); }
          .hr-sb-close { display: inline-flex !important; }
          .hr-mobile-topbar { display: flex !important; }
          .hr-page-inner { padding: 20px !important; }
          .hr-job-metrics { display: none !important; }
          .hr-cand-head {
            grid-template-columns: 1fr 110px 110px !important;
          }
          .hr-cand-head > span:nth-child(2),
          .hr-cand-head > span:nth-child(5) { display: none; }
          .hr-cand-row {
            grid-template-columns: 1fr 110px 110px !important;
          }
          .hr-cand-row > div:nth-child(2),
          .hr-cand-row > div:nth-child(5) { display: none; }
          .hr-grid-2 { grid-template-columns: 1fr !important; }
          .hr-search { min-width: 100% !important; }
        }
      `}</style>
    </div>
  );
}
