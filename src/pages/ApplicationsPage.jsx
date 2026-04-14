import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../appSupabaseClient";
import CVPassportLogo from "../components/CVPassportLogo";

// ─── DESIGN TOKENS (Candidate side — no purple) ─────────────────
const T = {
  bg: "#0A0A0A",
  surface: "#141414",
  elevated: "#1C1C1C",
  border: "#2A2A2A",
  accent: "#635bff",
  text: "#FFFFFF",
  muted: "#A0A0A0",
  green: "#1D9E75",
  amber: "#D97706",
  red: "#EF4444",
  font: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
};

const SIDEBAR_W = 220;
const RIGHT_W = 240;

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

function daysAgo(date) {
  if (!date) return "";
  const d = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (d === 0) return "Today";
  if (d === 1) return "1 day ago";
  return `${d} days ago`;
}

function matchColor(pct) {
  if (pct >= 85) return T.green;
  if (pct >= 60) return T.amber;
  return T.muted;
}

function initialsAvatar(name, size = 36, hue = 260) {
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
        borderRadius: 10,
        background: `hsl(${hue}, 50%, 35%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.36,
        fontWeight: 700,
        color: "#fff",
        flexShrink: 0,
        fontFamily: T.font,
      }}
    >
      {initials}
    </div>
  );
}

const STATUS_DISPLAY = {
  submitted: "Submitted",
  viewed: "Viewed",
  shortlisted: "Shortlisted",
  interviewing: "Interviewing",
  offered: "Offered",
  hired: "Hired",
  rejected: "Not selected",
};

const statusColors = {
  submitted: { bg: "rgba(99,91,255,0.12)", color: T.accent },
  viewed: { bg: "rgba(55,138,221,0.12)", color: "#378ADD" },
  shortlisted: { bg: "rgba(29,158,117,0.12)", color: T.green },
  interviewing: { bg: "rgba(99,91,255,0.12)", color: T.accent },
  offered: { bg: "rgba(29,158,117,0.12)", color: T.green },
  hired: { bg: "rgba(29,158,117,0.12)", color: T.green },
  rejected: { bg: "rgba(239,68,68,0.12)", color: T.red },
};

function StatusBadge({ status }) {
  const c = statusColors[status] || statusColors.submitted;
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 600,
        padding: "3px 8px",
        borderRadius: 4,
        background: c.bg,
        color: c.color,
        fontFamily: T.font,
      }}
    >
      {STATUS_DISPLAY[status] || status || "Submitted"}
    </span>
  );
}

// ─── TIMELINE ────────────────────────────────────────────────────
function Timeline({ events, application }) {
  // Build timeline from candidate_events + application data
  const steps = [
    {
      label: "Applied",
      date: application.applied_at,
      detail: null,
      done: true,
    },
    {
      label: "Viewed by recruiter",
      date: application.viewed_at,
      detail: null,
      done: !!application.viewed_at,
    },
    {
      label: "Shortlisted",
      date: events.find((e) => e.event_type === "shortlisted")?.created_at,
      detail: application.ats_score ? `Score: ${application.ats_score}%` : null,
      done: ["shortlisted", "interviewing", "offered", "hired"].includes(application.status),
    },
    {
      label: "Interview scheduled",
      date: events.find((e) => e.event_type === "interviewing")?.created_at,
      detail: null,
      done: ["interviewing", "offered", "hired"].includes(application.status),
    },
    {
      label: application.status === "hired" ? "Hired" : application.status === "rejected" ? "Not selected" : "Offer",
      date: events.find((e) => ["hired", "rejected", "offered"].includes(e.event_type))?.created_at,
      detail: null,
      done: ["offered", "hired", "rejected"].includes(application.status),
    },
  ];

  const currentIdx = steps.findIndex((s) => !s.done);

  return (
    <div style={{ padding: "12px 16px 16px 28px", background: T.bg, borderRadius: "0 0 12px 12px" }}>
      {steps.map((step, i) => {
        const isCurrent = i === currentIdx;
        const isDone = step.done;
        const isPending = !isDone && !isCurrent;
        return (
          <div key={i} style={{ display: "flex", gap: 12, position: "relative", paddingBottom: i < steps.length - 1 ? 16 : 0 }}>
            {i < steps.length - 1 && (
              <div
                style={{
                  position: "absolute",
                  left: 7,
                  top: 16,
                  bottom: 0,
                  width: 1,
                  borderLeft: `1px dashed ${isDone ? T.green : T.border}`,
                }}
              />
            )}
            <div style={{ flexShrink: 0, marginTop: 2 }}>
              {isDone ? (
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: T.green }} />
              ) : isCurrent ? (
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: T.accent, boxShadow: "0 0 0 4px rgba(99,91,255,0.25)" }} />
              ) : (
                <div style={{ width: 14, height: 14, borderRadius: "50%", border: `1.5px solid ${T.border}`, background: "transparent" }} />
              )}
            </div>
            <div>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: isPending ? T.muted : T.text,
                  margin: 0,
                  fontFamily: T.font,
                  opacity: isPending ? 0.5 : 1,
                }}
              >
                {step.label}
              </p>
              {step.date && (
                <p style={{ fontSize: 10, color: T.muted, margin: "2px 0 0", fontFamily: T.font }}>
                  {new Date(step.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              )}
              {step.detail && (
                <p style={{ fontSize: 10, color: T.muted, margin: "1px 0 0", fontFamily: T.font }}>{step.detail}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── MAIN APPLICATIONS PAGE ──────────────────────────────────────
export default function ApplicationsPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState([]);
  const [events, setEvents] = useState([]);
  const [market, setMarket] = useState("gulf");
  const [expandedId, setExpandedId] = useState(null);
  const [sidebarNav, setSidebarNav] = useState("applications");

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session?.user) { navigate("/auth"); return; }
      // Load applications with job data
      const { data: apps } = await supabase
        .from("applications")
        .select(`
          *,
          jobs (
            id, title, company, location, market,
            hiring_status, posted_at, status, hr_id
          )
        `)
        .eq("candidate_id", session.user.id)
        .order("applied_at", { ascending: false });
      if (!cancelled && apps) setApplications(apps);

      // Load all candidate events
      const { data: evts } = await supabase
        .from("candidate_events")
        .select("*")
        .eq("candidate_id", session.user.id)
        .order("created_at", { ascending: true });
      if (!cancelled && evts) setEvents(evts);

      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  const filtered = useMemo(() => {
    return applications.filter((a) => {
      const jobMarket = a.jobs?.market || "gulf";
      return jobMarket === market;
    });
  }, [applications, market]);

  const gulfCount = applications.filter((a) => (a.jobs?.market || "gulf") === "gulf").length;
  const indiaCount = applications.filter((a) => a.jobs?.market === "india").length;

  // Stats
  const totalApplied = applications.length;
  const viewed = applications.filter((a) => a.status !== "submitted").length;
  const shortlisted = applications.filter((a) =>
    ["shortlisted", "interviewing", "offered", "hired"].includes(a.status)
  ).length;

  // Cooldown: use cooldown_expires_at from DB
  const getCooldownDays = (app) => {
    if (!app.cooldown_expires_at) return null;
    const remaining = new Date(app.cooldown_expires_at).getTime() - Date.now();
    if (remaining <= 0) return null;
    return Math.ceil(remaining / 86400000);
  };

  const getEventsForJob = (jobId) => {
    return events.filter((e) => e.job_id === jobId);
  };

  if (loading) {
    return (
      <div style={{ background: T.bg, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: T.muted, fontFamily: T.font }}>Loading...</p>
      </div>
    );
  }

  const sidebarItems = [
    { key: "dashboard", label: "Dashboard", path: "/dashboard" },
    { key: "applications", label: "Applications", path: "/dashboard/applications" },
    { key: "builder", label: "CV Builder", path: "/builder" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: T.bg, fontFamily: T.font }}>
      {/* ─── LEFT SIDEBAR ─────────────────────────── */}
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
        <div style={{ marginBottom: 28, padding: "0 4px" }}>
          <CVPassportLogo height={22} />
        </div>
        <nav style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
          {sidebarItems.map(({ key, label, path }) => {
            const active = key === sidebarNav;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setSidebarNav(key);
                  navigate(path);
                }}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "none",
                  background: active ? T.elevated : "transparent",
                  color: active ? T.text : T.muted,
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  cursor: "pointer",
                  fontFamily: T.font,
                  transition: "background-color 150ms cubic-bezier(0.4,0,0.2,1), color 150ms cubic-bezier(0.4,0,0.2,1)",
                }}
              >
                {label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ─── MAIN CONTENT ─────────────────────────── */}
      <main style={{ flex: 1, minWidth: 0, padding: 24, overflowY: "auto" }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, color: T.text, margin: "0 0 20px", fontFamily: T.font }}>My Applications</h1>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
          {[
            { label: "Applied", value: totalApplied, color: T.accent },
            { label: "Viewed", value: viewed, color: "#378ADD" },
            { label: "Shortlisted", value: shortlisted, color: T.green },
            { label: "Top %", value: totalApplied > 0 ? `${Math.min(95, Math.max(5, 100 - Math.round((shortlisted / Math.max(totalApplied, 1)) * 100)))}%` : "—", color: T.amber },
          ].map(({ label, value, color }) => (
            <div
              key={label}
              style={{
                background: T.surface,
                border: `1px solid ${T.border}`,
                borderRadius: 12,
                padding: "16px",
                textAlign: "center",
              }}
            >
              <p style={{ fontSize: 24, fontWeight: 700, color, margin: "0 0 4px", fontFamily: T.font }}>{value}</p>
              <p style={{ fontSize: 11, color: T.muted, margin: 0, fontFamily: T.font }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Market tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <button
            type="button"
            onClick={() => setMarket("gulf")}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: `1px solid ${market === "gulf" ? T.accent : T.border}`,
              background: market === "gulf" ? "rgba(99,91,255,0.1)" : "transparent",
              color: market === "gulf" ? T.accent : T.muted,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: T.font,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            Gulf / UAE
            <span style={{ fontSize: 10, background: T.elevated, padding: "1px 5px", borderRadius: 6 }}>{gulfCount}</span>
          </button>
          <button
            type="button"
            onClick={() => setMarket("india")}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: `1px solid ${market === "india" ? T.accent : T.border}`,
              background: market === "india" ? "rgba(99,91,255,0.1)" : "transparent",
              color: market === "india" ? T.accent : T.muted,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: T.font,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            India
            <span style={{ fontSize: 10, background: T.elevated, padding: "1px 5px", borderRadius: 6 }}>{indiaCount}</span>
          </button>
        </div>

        {/* Application cards */}
        {filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <p style={{ color: T.muted, fontSize: 13, fontFamily: T.font }}>No applications in this market yet</p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map((app) => {
            const job = app.jobs || {};
            const hiring = getHiringStatus(job.posted_at, job.hiring_status);
            const expanded = expandedId === app.id;
            const nameHash = (job.company || "A").charCodeAt(0) * 7;

            return (
              <div key={app.id}>
                <div
                  onClick={() => setExpandedId(expanded ? null : app.id)}
                  style={{
                    background: T.surface,
                    border: `1px solid ${T.border}`,
                    borderRadius: expanded ? "12px 12px 0 0" : 12,
                    padding: "14px 16px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    transition: "border-radius 150ms cubic-bezier(0.4,0,0.2,1)",
                  }}
                >
                  {initialsAvatar(job.company || "?", 36, nameHash % 360)}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                      <span style={{ fontSize: 14, fontWeight: 500, color: T.text, fontFamily: T.font }}>{job.title || "Role"}</span>
                      <StatusBadge status={app.status} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 12, color: T.muted, fontFamily: T.font }}>{job.company || "Company"}</span>
                      {job.location && (
                        <>
                          <span style={{ fontSize: 12, color: T.border }}>·</span>
                          <span style={{ fontSize: 12, color: T.muted, fontFamily: T.font }}>{job.location}</span>
                        </>
                      )}
                      <span style={{ fontSize: 12, color: T.border }}>·</span>
                      <span style={{ fontSize: 12, color: T.muted, fontFamily: T.font }}>{daysAgo(app.applied_at)}</span>
                    </div>
                  </div>
                  {app.ats_score != null && app.ats_score > 0 && (
                    <span style={{ fontSize: 14, fontWeight: 600, color: matchColor(app.ats_score), fontFamily: T.font }}>
                      {app.ats_score}%
                    </span>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: hiring.color }} />
                    <span style={{ fontSize: 10, color: T.muted }}>{hiring.label}</span>
                  </div>
                  <span
                    style={{
                      color: T.muted,
                      fontSize: 12,
                      transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 150ms cubic-bezier(0.4,0,0.2,1)",
                    }}
                  >
                    ▼
                  </span>
                </div>

                {expanded && <Timeline events={getEventsForJob(app.job_id)} application={app} />}

                {/* Position filled */}
                {job.status === "closed" && (
                  <div
                    style={{
                      background: T.surface,
                      border: `1px dashed ${T.border}`,
                      borderRadius: 8,
                      padding: "10px 14px",
                      marginTop: 4,
                    }}
                  >
                    <p style={{ fontSize: 12, color: T.muted, margin: 0, fontFamily: T.font }}>
                      Your profile saved for future openings at {job.company || "this company"}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* ─── RIGHT SIDEBAR ────────────────────────── */}
      <aside
        style={{
          width: RIGHT_W,
          background: T.surface,
          borderLeft: `1px solid ${T.border}`,
          padding: "24px 16px",
          flexShrink: 0,
          overflowY: "auto",
        }}
      >
        {/* Ready to re-engage */}
        <h3 style={{ fontSize: 12, fontWeight: 600, color: T.text, margin: "0 0 12px", fontFamily: T.font }}>Ready to re-engage</h3>
        {applications.length === 0 && (
          <p style={{ fontSize: 11, color: T.muted, fontFamily: T.font }}>No applications yet</p>
        )}
        {applications.map((app) => {
          const cooldown = getCooldownDays(app);
          if (!cooldown) {
            if (!app.cooldown_expires_at) return null;
            return (
              <div
                key={`cd-${app.id}`}
                style={{
                  background: T.elevated,
                  borderRadius: 8,
                  padding: "10px 12px",
                  marginBottom: 8,
                }}
              >
                <p style={{ fontSize: 11, color: T.text, margin: "0 0 4px", fontFamily: T.font }}>
                  {app.jobs?.title || "Role"}
                </p>
                <div style={{ height: 3, borderRadius: 2, background: T.green, marginBottom: 4 }} />
                <p style={{ fontSize: 10, color: T.green, margin: 0, fontFamily: T.font }}>Reapply now</p>
              </div>
            );
          }
          const totalDays = 7;
          const progress = ((totalDays - cooldown) / totalDays) * 100;
          return (
            <div
              key={`cd-${app.id}`}
              style={{
                background: T.elevated,
                borderRadius: 8,
                padding: "10px 12px",
                marginBottom: 8,
              }}
            >
              <p style={{ fontSize: 11, color: T.text, margin: "0 0 4px", fontFamily: T.font }}>
                {app.jobs?.title || "Role"}
              </p>
              <div style={{ height: 3, borderRadius: 2, background: T.border, marginBottom: 4 }}>
                <div style={{ height: 3, borderRadius: 2, background: T.accent, width: `${progress}%` }} />
              </div>
              <p style={{ fontSize: 10, color: T.muted, margin: 0, fontFamily: T.font }}>{cooldown} days left</p>
            </div>
          );
        })}

        {/* Market insights */}
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 12, fontWeight: 600, color: T.text, margin: "0 0 12px", fontFamily: T.font }}>Market insights</h3>
          {shortlisted > 0 && (
            <div
              style={{
                background: "rgba(99,91,255,0.08)",
                borderRadius: 8,
                padding: "10px 12px",
                marginBottom: 8,
              }}
            >
              <p style={{ fontSize: 11, color: T.accent, margin: 0, fontWeight: 600, fontFamily: T.font }}>
                You&apos;re in the top {Math.max(5, 100 - Math.round((shortlisted / Math.max(totalApplied, 1)) * 100))}% of applicants
              </p>
            </div>
          )}
          <div style={{ background: T.elevated, borderRadius: 8, padding: "10px 12px", marginBottom: 8 }}>
            <p style={{ fontSize: 11, color: T.muted, margin: 0, fontFamily: T.font }}>
              New roles matching your profile this week
            </p>
          </div>

          {/* Interview reminder */}
          {applications.some((a) => a.status === "interviewing") && (
            <div
              style={{
                background: "rgba(29,158,117,0.1)",
                border: "1px solid rgba(29,158,117,0.2)",
                borderRadius: 8,
                padding: "10px 12px",
              }}
            >
              <p style={{ fontSize: 11, color: T.green, margin: 0, fontWeight: 600, fontFamily: T.font }}>
                Interview stage
              </p>
              {applications
                .filter((a) => a.status === "interviewing")
                .map((a) => (
                  <p key={a.id} style={{ fontSize: 10, color: T.muted, margin: "4px 0 0", fontFamily: T.font }}>
                    {a.jobs?.title} at {a.jobs?.company}
                  </p>
                ))}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
