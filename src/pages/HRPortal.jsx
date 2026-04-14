import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../appSupabaseClient";
import CVPassportLogo from "../components/CVPassportLogo";

// ─── DESIGN TOKENS (HR Portal — purple accent) ──────────────────
const T = {
  bg: "#0A0A0A",
  surface: "#141414",
  elevated: "#1C1C1C",
  border: "#2A2A2A",
  accent: "#635bff",
  accentHover: "#7c75ff",
  text: "#FFFFFF",
  muted: "#A0A0A0",
  green: "#1D9E75",
  amber: "#D97706",
  red: "#EF4444",
  font: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const SIDEBAR_W = 196;
const PANEL_W = 360;

// Map DB status values to display labels
const STATUS_DISPLAY = {
  submitted: "New",
  viewed: "Reviewing",
  shortlisted: "Shortlisted",
  interviewing: "Interviewing",
  offered: "Offered",
  hired: "Hired",
  rejected: "Rejected",
};

// Map display labels back to DB values
const STATUS_DB = {
  New: "submitted",
  Reviewing: "viewed",
  Shortlisted: "shortlisted",
  Interviewing: "interviewing",
  Offered: "offered",
  Hired: "hired",
  Rejected: "rejected",
};

// ─── HELPERS ─────────────────────────────────────────────────────
function initialsAvatar(name, size = 32, bg = T.accent) {
  const initials = (name || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.38,
        fontWeight: 600,
        color: "#fff",
        flexShrink: 0,
        fontFamily: T.font,
      }}
    >
      {initials}
    </div>
  );
}

function matchColor(pct) {
  if (pct >= 85) return T.green;
  if (pct >= 60) return T.amber;
  return T.muted;
}

function getHiringStatus(postedAt, hiringStatus) {
  if (hiringStatus === "closed")
    return { color: T.muted, label: "Applications closed" };
  if (!postedAt) return { color: T.muted, label: "Unknown" };
  const days = Math.floor(
    (Date.now() - new Date(postedAt).getTime()) / 86400000
  );
  if (days <= 7) return { color: T.green, label: "Actively hiring" };
  if (days <= 21) return { color: T.amber, label: "Few spots left" };
  return { color: T.muted, label: "Applications closing" };
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

function StatusPill({ status, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const displayOptions = ["New", "Reviewing", "Shortlisted", "Interviewing", "Rejected"];
  const displayStatus = STATUS_DISPLAY[status] || "New";
  const colors = {
    New: { bg: "rgba(99,91,255,0.15)", color: T.accent },
    Reviewing: { bg: "rgba(217,119,6,0.15)", color: T.amber },
    Shortlisted: { bg: "rgba(29,158,117,0.15)", color: T.green },
    Interviewing: { bg: "rgba(99,91,255,0.15)", color: T.accent },
    Rejected: { bg: "rgba(239,68,68,0.15)", color: T.red },
  };
  const c = colors[displayStatus] || colors.New;

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        style={{
          background: c.bg,
          color: c.color,
          border: "none",
          borderRadius: 6,
          padding: "4px 10px",
          fontSize: 11,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: T.font,
        }}
      >
        {displayStatus}
      </button>
      {open && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            marginTop: 4,
            background: T.elevated,
            border: `1px solid ${T.border}`,
            borderRadius: 8,
            padding: 4,
            zIndex: 100,
            minWidth: 120,
          }}
        >
          {displayOptions.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onChange(STATUS_DB[opt] || "submitted");
                setOpen(false);
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                background: opt === displayStatus ? "rgba(99,91,255,0.1)" : "transparent",
                border: "none",
                color: T.text,
                padding: "6px 10px",
                fontSize: 12,
                borderRadius: 4,
                cursor: "pointer",
                fontFamily: T.font,
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SCORE RING SVG ──────────────────────────────────────────────
function ScoreRing({ score, size = 76 }) {
  const [animScore, setAnimScore] = useState(0);
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeColor = score >= 85 ? T.accent : score >= 60 ? T.amber : T.red;

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
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={4}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (circumference * animScore) / 100}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 50ms linear" }}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontSize: 18, fontWeight: 700, color: T.text, fontFamily: T.font }}>{animScore}%</span>
        <span style={{ fontSize: 9, color: T.muted, fontFamily: T.font }}>match</span>
      </div>
    </div>
  );
}

// ─── POST A JOB MODAL ────────────────────────────────────────────
function PostJobModal({ open, onClose, onSubmit }) {
  const [form, setForm] = useState({
    paste_jd: "",
    title: "",
    department: "",
    location: "",
    job_type: "full-time",
    market: "gulf",
    salary_min: "",
    salary_max: "",
    visa_sponsored: true,
    description: "",
    requirements: "",
    hiring_status: "active",
  });

  if (!open) return null;

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const fieldStyle = {
    width: "100%",
    padding: "10px 12px",
    background: T.bg,
    border: `1px solid ${T.border}`,
    borderRadius: 8,
    color: T.text,
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: T.font,
  };

  const labelStyle = {
    display: "block",
    fontSize: 11,
    fontWeight: 600,
    color: T.muted,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    marginBottom: 6,
    fontFamily: T.font,
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.6)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: 16,
          width: "100%",
          maxWidth: 560,
          maxHeight: "85vh",
          overflow: "auto",
          padding: 28,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: T.text, margin: 0, fontFamily: T.font }}>Post a job</h2>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", color: T.muted, fontSize: 18, cursor: "pointer" }}
          >
            ✕
          </button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Paste job description — we&apos;ll parse it</label>
          <textarea
            style={{ ...fieldStyle, minHeight: 80, resize: "vertical" }}
            value={form.paste_jd}
            onChange={(e) => set("paste_jd", e.target.value)}
            placeholder="Paste full JD here..."
          />
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Job title</label>
            <input style={fieldStyle} value={form.title} onChange={(e) => set("title", e.target.value)} placeholder="e.g. Senior Accountant" />
          </div>
          <div>
            <label style={labelStyle}>Department</label>
            <input style={fieldStyle} value={form.department} onChange={(e) => set("department", e.target.value)} placeholder="e.g. Finance" />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Location</label>
            <input style={fieldStyle} value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="e.g. Dubai, UAE" />
          </div>
          <div>
            <label style={labelStyle}>Job type</label>
            <select style={fieldStyle} value={form.job_type} onChange={(e) => set("job_type", e.target.value)}>
              <option value="full-time">Full-time</option>
              <option value="part-time">Part-time</option>
              <option value="contract">Contract</option>
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Market</label>
            <div style={{ display: "flex", gap: 8 }}>
              {["gulf", "india"].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => set("market", m)}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    borderRadius: 8,
                    border: `1px solid ${form.market === m ? T.accent : T.border}`,
                    background: form.market === m ? "rgba(99,91,255,0.12)" : "transparent",
                    color: form.market === m ? T.accent : T.muted,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: T.font,
                  }}
                >
                  {m === "gulf" ? "Gulf / UAE" : "India"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={labelStyle}>Visa sponsor</label>
            <div style={{ display: "flex", gap: 8 }}>
              {[true, false].map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  onClick={() => set("visa_sponsored", v)}
                  style={{
                    flex: 1,
                    padding: "8px 0",
                    borderRadius: 8,
                    border: `1px solid ${form.visa_sponsored === v ? T.accent : T.border}`,
                    background: form.visa_sponsored === v ? "rgba(99,91,255,0.12)" : "transparent",
                    color: form.visa_sponsored === v ? T.accent : T.muted,
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: T.font,
                  }}
                >
                  {v ? "Yes" : "No"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <div>
            <label style={labelStyle}>Salary min</label>
            <input style={fieldStyle} type="number" value={form.salary_min} onChange={(e) => set("salary_min", e.target.value)} placeholder="e.g. 8000" />
          </div>
          <div>
            <label style={labelStyle}>Salary max</label>
            <input style={fieldStyle} type="number" value={form.salary_max} onChange={(e) => set("salary_max", e.target.value)} placeholder="e.g. 15000" />
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Job description</label>
          <textarea
            style={{ ...fieldStyle, minHeight: 80, resize: "vertical" }}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Describe the role..."
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={labelStyle}>Requirements (one per line)</label>
          <textarea
            style={{ ...fieldStyle, minHeight: 60, resize: "vertical" }}
            value={form.requirements}
            onChange={(e) => set("requirements", e.target.value)}
            placeholder="3+ years experience&#10;CPA certification&#10;..."
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label style={labelStyle}>Hiring status</label>
          <select style={fieldStyle} value={form.hiring_status} onChange={(e) => set("hiring_status", e.target.value)}>
            <option value="active">Actively hiring</option>
            <option value="urgent">Urgently hiring</option>
            <option value="slow">Slow hiring</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => onSubmit(form)}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: 10,
            border: "none",
            background: T.accent,
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: T.font,
          }}
        >
          Post job
        </button>
      </div>
    </div>
  );
}

// ─── CV SIDE PANEL ───────────────────────────────────────────────
function CVPanel({ candidate, onClose, onStatusChange, onPrev, onNext, currentIndex, totalCount }) {
  useEffect(() => {
    if (!candidate) return;
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
    `Hi ${firstName}, I'm reaching out from CVPassport regarding your application. Are you available for a quick call?`
  );

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        right: 0,
        width: PANEL_W,
        height: "100vh",
        background: T.surface,
        borderLeft: `1px solid ${T.border}`,
        zIndex: 500,
        display: "flex",
        flexDirection: "column",
        fontFamily: T.font,
        overflowY: "auto",
      }}
    >
      {/* Header */}
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${T.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <button
          type="button"
          onClick={onClose}
          style={{ background: "none", border: "none", color: T.muted, fontSize: 13, cursor: "pointer", fontFamily: T.font }}
        >
          ← Back
        </button>
        <span style={{ fontSize: 14, fontWeight: 500, color: T.text }}>{candidate.candidate_name}</span>
        <button
          type="button"
          style={{
            background: "none",
            border: `1px solid ${T.border}`,
            color: T.muted,
            fontSize: 11,
            padding: "4px 10px",
            borderRadius: 6,
            cursor: "pointer",
            fontFamily: T.font,
          }}
        >
          Share candidate
        </button>
      </div>

      {/* Zone 1 — Hero */}
      <div style={{ padding: "20px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h3 style={{ fontSize: 17, fontWeight: 500, color: T.text, margin: "0 0 4px", fontFamily: T.font }}>{candidate.candidate_name}</h3>
          <p style={{ fontSize: 12, color: T.muted, margin: "0 0 12px", fontFamily: T.font }}>
            {cvData.role || ""} {cvData.experience_years ? `· ${cvData.experience_years}yr` : ""} {cvData.location ? `· ${cvData.location}` : ""}
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {cvData.location && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span style={{ fontSize: 11, color: T.muted }}>{cvData.location}</span>
              </div>
            )}
            {cvData.notice_period && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                <span style={{ fontSize: 11, color: T.muted }}>{cvData.notice_period}</span>
              </div>
            )}
            {candidate.visa_status && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <path d="M2 10h20" />
                </svg>
                <span style={{ fontSize: 11, color: T.muted }}>{candidate.visa_status}</span>
              </div>
            )}
          </div>
        </div>
        <ScoreRing score={candidate.ats_score || 0} />
      </div>

      {/* Zone 2 — ATS Keywords */}
      <div style={{ padding: "0 20px 20px" }}>
        <h4 style={{ fontSize: 12, fontWeight: 600, color: T.text, margin: "0 0 10px", fontFamily: T.font }}>ATS keyword match</h4>
        {matchedKw.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
            {matchedKw.map((s) => (
              <span key={s} style={{ background: "rgba(29,158,117,0.15)", color: T.green, fontSize: 10, padding: "3px 8px", borderRadius: 4, fontWeight: 500 }}>
                {s}
              </span>
            ))}
          </div>
        )}
        {missingKw.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {missingKw.map((s) => (
              <span
                key={s}
                style={{ background: "rgba(160,160,160,0.1)", color: T.muted, fontSize: 10, padding: "3px 8px", borderRadius: 4, textDecoration: "line-through" }}
                title="Found in similar successful hires"
              >
                {s}
              </span>
            ))}
          </div>
        )}
        {matchedKw.length === 0 && missingKw.length === 0 && (
          <p style={{ fontSize: 11, color: T.muted }}>No keyword data available</p>
        )}
      </div>

      {/* Zone 3 — Work history */}
      <div style={{ padding: "0 20px 100px" }}>
        <h4 style={{ fontSize: 12, fontWeight: 600, color: T.text, margin: "0 0 10px", fontFamily: T.font }}>Work history</h4>
        {workHistory.map((w, i) => (
          <div key={i} style={{ marginBottom: 10 }}>
            <p style={{ fontSize: 13, color: T.text, margin: 0, fontWeight: 500, fontFamily: T.font }}>{w.title || w.role}</p>
            <p style={{ fontSize: 11, color: T.muted, margin: "2px 0 0", fontFamily: T.font }}>
              {w.company} {w.period ? `· ${w.period}` : ""}
            </p>
          </div>
        ))}
        {workHistory.length === 0 && <p style={{ fontSize: 12, color: T.muted, fontFamily: T.font }}>No work history available</p>}
      </div>

      {/* Sticky footer */}
      <div
        style={{
          position: "sticky",
          bottom: 0,
          background: T.surface,
          borderTop: `1px solid ${T.border}`,
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <a
          href={`https://wa.me/${candidate.candidate_phone || ""}?text=${waMsg}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            background: T.green,
            color: "#fff",
            border: "none",
            borderRadius: 8,
            padding: "8px 14px",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            textDecoration: "none",
            fontFamily: T.font,
          }}
        >
          Message {firstName}
        </a>
        <StatusPill status={candidate.status} onChange={(s) => onStatusChange(candidate.id, s)} />
        <button
          type="button"
          style={{
            background: "none",
            border: `1px solid ${T.border}`,
            color: T.muted,
            fontSize: 11,
            padding: "6px 10px",
            borderRadius: 6,
            cursor: "pointer",
            fontFamily: T.font,
          }}
        >
          PDF
        </button>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
          <button
            type="button"
            onClick={onPrev}
            style={{ background: "none", border: `1px solid ${T.border}`, color: T.muted, borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 12 }}
          >
            ←
          </button>
          <span style={{ fontSize: 11, color: T.muted, fontFamily: T.font }}>
            {currentIndex + 1} of {totalCount}
          </span>
          <button
            type="button"
            onClick={onNext}
            style={{ background: "none", border: `1px solid ${T.border}`, color: T.muted, borderRadius: 6, padding: "4px 8px", cursor: "pointer", fontSize: 12 }}
          >
            →
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── NOTIFICATIONS VIEW ──────────────────────────────────────────
function NotificationsView({ notifications, onMarkAllRead, onClickNotification }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 600, color: T.text, margin: 0, fontFamily: T.font }}>Notifications</h2>
        <button
          type="button"
          onClick={onMarkAllRead}
          style={{
            background: "none",
            border: `1px solid ${T.border}`,
            color: T.muted,
            fontSize: 11,
            padding: "6px 12px",
            borderRadius: 6,
            cursor: "pointer",
            fontFamily: T.font,
          }}
        >
          Mark all read
        </button>
      </div>
      {notifications.length === 0 && <p style={{ color: T.muted, fontSize: 13, fontFamily: T.font }}>No notifications yet</p>}
      {notifications.map((n) => (
        <div
          key={n.id}
          onClick={() => onClickNotification(n)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 16px",
            background: n.read ? "transparent" : "rgba(99,91,255,0.05)",
            borderRadius: 8,
            marginBottom: 4,
            cursor: "pointer",
            transition: "background-color 150ms cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          {!n.read && (
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: T.accent, flexShrink: 0 }} />
          )}
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, color: T.text, margin: 0, fontFamily: T.font }}>{n.title}</p>
            {n.body && <p style={{ fontSize: 11, color: T.muted, margin: "2px 0 0", fontFamily: T.font }}>{n.body}</p>}
            <p style={{ fontSize: 10, color: T.muted, margin: "2px 0 0", fontFamily: T.font }}>{timeAgo(n.created_at)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── SETTINGS VIEW ───────────────────────────────────────────────
function SettingsView({ profile, onSave }) {
  const [form, setForm] = useState({
    company_name: profile?.company_name || "",
    work_email: profile?.work_email || profile?.email || "",
    notify_new_applicant: true,
    notify_whatsapp: true,
    notify_weekly: true,
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const fieldStyle = {
    width: "100%",
    padding: "10px 12px",
    background: T.bg,
    border: `1px solid ${T.border}`,
    borderRadius: 8,
    color: T.text,
    fontSize: 13,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: T.font,
  };

  const labelStyle = {
    display: "block",
    fontSize: 11,
    fontWeight: 600,
    color: T.muted,
    textTransform: "uppercase",
    letterSpacing: "0.04em",
    marginBottom: 6,
    fontFamily: T.font,
  };

  return (
    <div style={{ maxWidth: 480 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: T.text, margin: "0 0 20px", fontFamily: T.font }}>Settings</h2>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Company name</label>
        <input style={fieldStyle} value={form.company_name} onChange={(e) => set("company_name", e.target.value)} />
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Work email</label>
        <input style={fieldStyle} value={form.work_email} onChange={(e) => set("work_email", e.target.value)} />
      </div>

      <h3 style={{ fontSize: 13, fontWeight: 600, color: T.text, margin: "0 0 12px", fontFamily: T.font }}>Notifications</h3>
      {[
        { key: "notify_new_applicant", label: "New applicant email" },
        { key: "notify_whatsapp", label: "WhatsApp alerts" },
        { key: "notify_weekly", label: "Weekly summary" },
      ].map(({ key, label }) => (
        <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontSize: 13, color: T.text, fontFamily: T.font }}>{label}</span>
          <button
            type="button"
            onClick={() => set(key, !form[key])}
            style={{
              width: 40,
              height: 22,
              borderRadius: 11,
              border: "none",
              background: form[key] ? T.accent : T.border,
              cursor: "pointer",
              position: "relative",
              transition: "background-color 200ms cubic-bezier(0.4,0,0.2,1)",
            }}
          >
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: "#fff",
                position: "absolute",
                top: 3,
                left: form[key] ? 21 : 3,
                transition: "left 200ms cubic-bezier(0.4,0,0.2,1)",
              }}
            />
          </button>
        </div>
      ))}

      <div style={{ marginTop: 20, padding: "12px 16px", background: T.elevated, borderRadius: 8, border: `1px solid ${T.border}` }}>
        <span style={{ fontSize: 11, color: T.muted, fontFamily: T.font }}>Plan: </span>
        <span style={{ fontSize: 11, color: T.accent, fontWeight: 600, fontFamily: T.font }}>Free</span>
      </div>

      <button
        type="button"
        onClick={() => onSave(form)}
        style={{
          marginTop: 16,
          padding: "10px 20px",
          borderRadius: 8,
          border: "none",
          background: T.accent,
          color: "#fff",
          fontSize: 13,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: T.font,
        }}
      >
        Save changes
      </button>

      <div style={{ marginTop: 24, borderTop: `1px solid ${T.border}`, paddingTop: 16 }}>
        <a href="/dashboard" style={{ fontSize: 12, color: T.muted, textDecoration: "none", fontFamily: T.font }}>
          Looking for a job? Switch account
        </a>
      </div>
    </div>
  );
}

// ─── MAIN HR PORTAL ──────────────────────────────────────────────
export default function HRPortal() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [hrProfile, setHrProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeNav, setActiveNav] = useState("jobs");
  const [activeTab, setActiveTab] = useState("All");
  const [jobs, setJobs] = useState([]);
  const [selectedJobIdx, setSelectedJobIdx] = useState(0);
  const [candidates, setCandidates] = useState([]);
  const [panelCandidate, setPanelCandidate] = useState(null);
  const [panelIdx, setPanelIdx] = useState(-1);
  const [showPostJob, setShowPostJob] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [lowMatchOpen, setLowMatchOpen] = useState(false);
  const [highlightId, setHighlightId] = useState(null);

  // ─── Auth check ─────────────────────────────────
  useEffect(() => {
    if (!supabase) return;
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

  // ─── Load jobs with application count ───────────
  useEffect(() => {
    if (!supabase || !user?.id) return;
    (async () => {
      const { data } = await supabase
        .from("jobs")
        .select("*, applications(count)")
        .eq("hr_id", user.id)
        .eq("status", "published")
        .order("posted_at", { ascending: false });
      if (data) setJobs(data);
    })();
  }, [user?.id]);

  // ─── Load candidates for selected job ───────────
  const selectedJob = jobs[selectedJobIdx] || null;

  useEffect(() => {
    if (!supabase || !selectedJob?.id) { setCandidates([]); return; }
    (async () => {
      const { data } = await supabase
        .from("applications")
        .select("*")
        .eq("job_id", selectedJob.id)
        .eq("is_visible_to_hr", true)
        .order("ats_score", { ascending: false });
      if (data) setCandidates(data);
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

  const appCount = selectedJob?.applications?.[0]?.count || candidates.length;

  // ─── Handlers ───────────────────────────────────
  const handleStatusChange = useCallback(async (applicationId, newStatus) => {
    const app = candidates.find((c) => c.id === applicationId);
    const oldStatus = app?.status || "submitted";
    // Optimistic update
    setCandidates((prev) => prev.map((c) => (c.id === applicationId ? { ...c, status: newStatus } : c)));
    if (panelCandidate?.id === applicationId) {
      setPanelCandidate((prev) => prev ? { ...prev, status: newStatus } : prev);
    }
    if (!supabase || !user?.id) return;
    await supabase
      .from("applications")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", applicationId);
    // Insert event
    if (app) {
      await supabase.from("candidate_events").insert({
        candidate_id: app.candidate_id,
        job_id: app.job_id,
        hr_id: user.id,
        event_type: newStatus,
        metadata: { changed_by: user.id, previous_status: oldStatus },
      });
    }
  }, [candidates, panelCandidate, user?.id]);

  // ─── Open CV panel + mark viewed ────────────────
  const openPanel = useCallback(async (candidate, idx) => {
    setPanelCandidate(candidate);
    setPanelIdx(idx);
    // Mark as viewed if still submitted
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
    const reqLines = form.requirements
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
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
    setActiveNav("jobs");
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

  // ─── Filtered candidates ────────────────────────
  const tabFilterMap = { All: null, Shortlisted: "shortlisted", Reviewing: "viewed", Rejected: "rejected" };
  const tabFiltered = activeTab === "All" ? candidates : candidates.filter((c) => c.status === tabFilterMap[activeTab]);
  const mainCandidates = tabFiltered.filter((c) => (c.ats_score || 0) >= 40);
  const lowMatchCandidates = tabFiltered.filter((c) => (c.ats_score || 0) < 40);

  if (loading) {
    return (
      <div style={{ background: T.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: T.muted, fontFamily: T.font }}>Loading...</p>
      </div>
    );
  }

  // ─── NAV ITEMS ──────────────────────────────────
  const navItems = [
    { key: "jobs", label: "Jobs", icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></svg>
    )},
    { key: "candidates", label: "Candidates", icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
    )},
    { key: "notifications", label: "Notifications", icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
    ), badge: unreadCount },
    { key: "settings", label: "Settings", icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
    )},
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: T.bg, fontFamily: T.font }}>
      {/* ─── SIDEBAR ──────────────────────────────── */}
      <aside
        style={{
          width: SIDEBAR_W,
          background: T.surface,
          borderRight: `1px solid ${T.border}`,
          display: "flex",
          flexDirection: "column",
          padding: "20px 12px",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 28, padding: "0 4px" }}>
          <CVPassportLogo height={22} />
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              color: T.muted,
              background: T.elevated,
              padding: "2px 6px",
              borderRadius: 4,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            HR
          </span>
        </div>

        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          {navItems.map(({ key, label, icon, badge }) => {
            const active = activeNav === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setActiveNav(key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "none",
                  background: active ? T.accent : "transparent",
                  color: active ? "#fff" : T.muted,
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  cursor: "pointer",
                  fontFamily: T.font,
                  textAlign: "left",
                  position: "relative",
                  transition: "background-color 150ms cubic-bezier(0.4,0,0.2,1), color 150ms cubic-bezier(0.4,0,0.2,1)",
                }}
              >
                {icon}
                {label}
                {badge > 0 && (
                  <span
                    style={{
                      marginLeft: "auto",
                      background: T.red,
                      color: "#fff",
                      fontSize: 9,
                      fontWeight: 700,
                      padding: "1px 5px",
                      borderRadius: 8,
                      minWidth: 16,
                      textAlign: "center",
                    }}
                  >
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 12, marginTop: 12 }}>
          <p style={{ fontSize: 12, fontWeight: 500, color: T.text, margin: "0 0 2px", padding: "0 4px", fontFamily: T.font }}>
            {hrProfile?.company_name || user?.user_metadata?.name || ""}
          </p>
          <p style={{ fontSize: 11, color: T.muted, margin: 0, padding: "0 4px", fontFamily: T.font }}>
            {hrProfile?.work_email || user?.email || ""}
          </p>
        </div>
        <a
          href="/dashboard"
          style={{ fontSize: 10, color: T.muted, textDecoration: "none", marginTop: 10, padding: "0 4px", fontFamily: T.font }}
        >
          Looking for a job? Switch account
        </a>
      </aside>

      {/* ─── MAIN CONTENT ─────────────────────────── */}
      <main style={{ flex: 1, minWidth: 0, padding: 24 }}>
        {activeNav === "jobs" && (
          <>
            {/* Topbar */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <h1 style={{ fontSize: 18, fontWeight: 600, color: T.text, margin: 0, fontFamily: T.font }}>
                  {selectedJob?.title || "No jobs posted"}
                </h1>
                {selectedJob && (
                  <span style={{ fontSize: 12, color: T.muted, fontFamily: T.font }}>
                    {appCount} applicant{appCount !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowPostJob(true)}
                style={{
                  background: T.accent,
                  color: "#fff",
                  border: "none",
                  borderRadius: 8,
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: T.font,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                + Post a job
              </button>
            </div>

            {/* Job selector (if multiple) */}
            {jobs.length > 1 && (
              <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                {jobs.map((j, i) => (
                  <button
                    key={j.id}
                    type="button"
                    onClick={() => setSelectedJobIdx(i)}
                    style={{
                      padding: "5px 12px",
                      borderRadius: 6,
                      border: `1px solid ${i === selectedJobIdx ? T.accent : T.border}`,
                      background: i === selectedJobIdx ? "rgba(99,91,255,0.12)" : "transparent",
                      color: i === selectedJobIdx ? T.accent : T.muted,
                      fontSize: 12,
                      cursor: "pointer",
                      fontFamily: T.font,
                    }}
                  >
                    {j.title}
                  </button>
                ))}
              </div>
            )}

            {/* Tab filters */}
            <div style={{ display: "flex", gap: 0, borderBottom: `1px solid ${T.border}`, marginBottom: 16 }}>
              {["All", "Shortlisted", "Reviewing", "Rejected"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  style={{
                    padding: "8px 16px",
                    border: "none",
                    background: "transparent",
                    color: activeTab === tab ? T.accent : T.muted,
                    fontSize: 12,
                    fontWeight: activeTab === tab ? 600 : 400,
                    cursor: "pointer",
                    fontFamily: T.font,
                    borderBottom: activeTab === tab ? `2px solid ${T.accent}` : "2px solid transparent",
                    transition: "color 150ms cubic-bezier(0.4,0,0.2,1), border-color 150ms cubic-bezier(0.4,0,0.2,1)",
                  }}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Candidate table */}
            {mainCandidates.length === 0 && lowMatchCandidates.length === 0 && (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <p style={{ color: T.muted, fontSize: 14, fontFamily: T.font }}>
                  {jobs.length === 0 ? "Post your first job to start receiving applicants" : "No applicants yet for this role"}
                </p>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {/* Header row */}
              {mainCandidates.length > 0 && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 80px 100px 120px 100px 70px 70px",
                    gap: 8,
                    padding: "8px 16px",
                    fontSize: 10,
                    fontWeight: 600,
                    color: T.muted,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    fontFamily: T.font,
                  }}
                >
                  <span>Candidate</span>
                  <span>Match</span>
                  <span>Visa</span>
                  <span>Hiring</span>
                  <span>Status</span>
                  <span>CV</span>
                  <span>Chat</span>
                </div>
              )}

              {mainCandidates.map((c, i) => {
                const hiring = getHiringStatus(selectedJob?.posted_at, selectedJob?.hiring_status);
                const isHighlighted = c.id === highlightId;
                return (
                  <div
                    key={c.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 80px 100px 120px 100px 70px 70px",
                      gap: 8,
                      padding: "10px 16px",
                      alignItems: "center",
                      background: isHighlighted ? "rgba(99,91,255,0.12)" : T.elevated,
                      borderRadius: 8,
                      transition: "background-color 300ms cubic-bezier(0.4,0,0.2,1)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {initialsAvatar(c.candidate_name, 32)}
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 500, color: T.text, margin: 0, fontFamily: T.font }}>
                          {c.candidate_name || "—"}
                        </p>
                        <p style={{ fontSize: 11, color: T.muted, margin: 0, fontFamily: T.font }}>
                          {c.candidate_email || ""}
                        </p>
                      </div>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: matchColor(c.ats_score || 0), fontFamily: T.font }}>
                      {c.ats_score || 0}%
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "3px 8px",
                        borderRadius: 4,
                        background: c.visa_status === "Sponsored" ? "rgba(29,158,117,0.15)" : "rgba(160,160,160,0.1)",
                        color: c.visa_status === "Sponsored" ? T.green : T.muted,
                        fontWeight: 500,
                        fontFamily: T.font,
                        display: "inline-block",
                        width: "fit-content",
                      }}
                    >
                      {c.visa_status || "—"}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: hiring.color, flexShrink: 0 }} />
                      <span style={{ fontSize: 11, color: T.muted, fontFamily: T.font }}>{hiring.label}</span>
                    </div>
                    <StatusPill status={c.status || "submitted"} onChange={(s) => handleStatusChange(c.id, s)} />
                    <button
                      type="button"
                      onClick={() => openPanel(c, i)}
                      style={{
                        background: "none",
                        border: `1px solid ${T.border}`,
                        color: T.muted,
                        fontSize: 11,
                        padding: "4px 8px",
                        borderRadius: 6,
                        cursor: "pointer",
                        fontFamily: T.font,
                      }}
                    >
                      View
                    </button>
                    <a
                      href={`https://wa.me/${c.candidate_phone || ""}?text=${encodeURIComponent(
                        `Hi ${(c.candidate_name || "").split(" ")[0]}, I'm ${hrProfile?.company_name ? `from ${hrProfile.company_name}` : "a recruiter"}. I reviewed your CV on CVPassport for the ${selectedJob?.title || "open"} position. Are you available for a quick call?`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        background: T.green,
                        color: "#fff",
                        border: "none",
                        borderRadius: 6,
                        padding: "4px 8px",
                        fontSize: 11,
                        fontWeight: 600,
                        textDecoration: "none",
                        textAlign: "center",
                        fontFamily: T.font,
                      }}
                    >
                      Chat
                    </a>
                  </div>
                );
              })}
            </div>

            {/* Low match folder */}
            {lowMatchCandidates.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <button
                  type="button"
                  onClick={() => setLowMatchOpen((p) => !p)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: "none",
                    border: "none",
                    color: T.muted,
                    fontSize: 12,
                    cursor: "pointer",
                    fontFamily: T.font,
                    padding: "8px 0",
                  }}
                >
                  <span style={{ transform: lowMatchOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 150ms cubic-bezier(0.4,0,0.2,1)", display: "inline-block" }}>
                    ▶
                  </span>
                  Low match — below 40%
                  <span
                    style={{
                      background: T.elevated,
                      color: T.muted,
                      fontSize: 10,
                      padding: "2px 6px",
                      borderRadius: 8,
                      fontWeight: 600,
                    }}
                  >
                    {lowMatchCandidates.length}
                  </span>
                </button>
                {lowMatchOpen &&
                  lowMatchCandidates.map((c, i) => {
                    const hiring = getHiringStatus(selectedJob?.posted_at, selectedJob?.hiring_status);
                    return (
                      <div
                        key={c.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "2fr 80px 100px 120px 100px 70px 70px",
                          gap: 8,
                          padding: "10px 16px",
                          alignItems: "center",
                          background: T.elevated,
                          borderRadius: 8,
                          marginBottom: 2,
                          opacity: 0.7,
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          {initialsAvatar(c.candidate_name, 32, T.muted)}
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 500, color: T.text, margin: 0, fontFamily: T.font }}>
                              {c.candidate_name || "—"}
                            </p>
                            <p style={{ fontSize: 11, color: T.muted, margin: 0, fontFamily: T.font }}>
                              {c.candidate_email || ""}
                            </p>
                          </div>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: T.muted, fontFamily: T.font }}>{c.ats_score || 0}%</span>
                        <span style={{ fontSize: 11, color: T.muted, fontFamily: T.font }}>{c.visa_status || "—"}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <div style={{ width: 6, height: 6, borderRadius: "50%", background: hiring.color }} />
                          <span style={{ fontSize: 11, color: T.muted, fontFamily: T.font }}>{hiring.label}</span>
                        </div>
                        <StatusPill status={c.status || "submitted"} onChange={(s) => handleStatusChange(c.id, s)} />
                        <button
                          type="button"
                          onClick={() => openPanel(c, mainCandidates.length + i)}
                          style={{
                            background: "none",
                            border: `1px solid ${T.border}`,
                            color: T.muted,
                            fontSize: 11,
                            padding: "4px 8px",
                            borderRadius: 6,
                            cursor: "pointer",
                            fontFamily: T.font,
                          }}
                        >
                          View
                        </button>
                        <span style={{ fontSize: 11, color: T.muted }}>—</span>
                      </div>
                    );
                  })}
              </div>
            )}
          </>
        )}

        {activeNav === "candidates" && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: T.text, margin: "0 0 16px", fontFamily: T.font }}>All Candidates</h2>
            <p style={{ color: T.muted, fontSize: 13, fontFamily: T.font }}>
              View all candidates across your posted jobs. Select a job from the Jobs tab to filter.
            </p>
          </div>
        )}

        {activeNav === "notifications" && (
          <NotificationsView
            notifications={notifications}
            onMarkAllRead={handleMarkAllRead}
            onClickNotification={handleClickNotification}
          />
        )}

        {activeNav === "settings" && (
          <SettingsView profile={hrProfile} onSave={handleSaveSettings} />
        )}
      </main>

      {/* ─── CV SIDE PANEL ────────────────────────── */}
      {panelCandidate && (
        <CVPanel
          candidate={panelCandidate}
          onClose={() => setPanelCandidate(null)}
          onStatusChange={handleStatusChange}
          currentIndex={panelIdx}
          totalCount={tabFiltered.length}
          onPrev={() => {
            const prev = panelIdx > 0 ? panelIdx - 1 : tabFiltered.length - 1;
            setPanelIdx(prev);
            setPanelCandidate(tabFiltered[prev]);
          }}
          onNext={() => {
            const next = panelIdx < tabFiltered.length - 1 ? panelIdx + 1 : 0;
            setPanelIdx(next);
            setPanelCandidate(tabFiltered[next]);
          }}
        />
      )}

      <PostJobModal open={showPostJob} onClose={() => setShowPostJob(false)} onSubmit={handlePostJob} />
    </div>
  );
}
