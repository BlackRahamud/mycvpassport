import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { supabase } from "../../../appSupabaseClient";
import "./hrInsights.css";

/* ───────── Stat-card icons (feather-style, monotone — matches the portal) ───────── */
const S = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true };
const IcBriefcase = () => (<svg {...S}><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>);
const IcUsers = () => (<svg {...S}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>);
const IcUserCheck = () => (<svg {...S}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><polyline points="16 11 18 13 22 9" /></svg>);
const IcChat = () => (<svg {...S}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>);
const IcAward = () => (<svg {...S}><circle cx="12" cy="8" r="6" /><path d="M8.21 13.89 7 23l5-3 5 3-1.21-9.12" /></svg>);
const IcCalendar = () => (<svg {...S}><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>);
const IcCheckCircle = () => (<svg {...S}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>);
const IcUserX = () => (<svg {...S}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="17" y1="8" x2="22" y2="13" /><line x1="22" y1="8" x2="17" y2="13" /></svg>);

/* ───────── Stage model ─────────
   Mirrors STAGES / STAGE_BY_DB in JobPipelinePage.jsx. Rank lets us
   build a monotonic funnel from each application's CURRENT status:
   a candidate at "hired" necessarily passed through the earlier
   linear stages, so "reached stage X" = rank >= X. "rejected" dropped
   out (rank -1) and counts only toward total applicants. */
const STATUS_RANK = {
  new: 0, submitted: 0, viewed: 0,
  shortlisted: 1,
  ready: 2,
  interviewing: 3, interviewed: 3,
  offered: 4,
  hired: 5,
  rejected: -1,
};
function rankOf(status) {
  const r = STATUS_RANK[status];
  return r == null ? 0 : r;
}

const RANGE_OPTIONS = [
  { key: "30", label: "30d", days: 30 },
  { key: "90", label: "90d", days: 90 },
  { key: "365", label: "12mo", days: 365 },
  { key: "all", label: "All", days: null },
];
const MARKET_OPTIONS = [
  { key: "all", label: "All markets" },
  { key: "gulf", label: "Gulf" },
  { key: "india", label: "India" },
];

const DAY_MS = 86400000;

function median(nums) {
  if (!nums.length) return null;
  const s = [...nums].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

const EASE = [0.4, 0, 0.2, 1];

/* Uniform overview card: tinted icon square, uppercase muted label, big
   bold number. Every card is the same width and height in the grid. */
function StatCard({ label, value, suffix = "", icon = null, tint = "blue" }) {
  const display = value == null ? "—" : `${value.toLocaleString()}${suffix}`;
  return (
    <div className="hin-ov-card">
      <span className={`hin-ov-card__icon hin-ov-card__icon--${tint}`} aria-hidden>{icon}</span>
      <div className="hin-ov-card__label">{label}</div>
      <div className="hin-ov-card__value">{display}</div>
    </div>
  );
}

export default function HrInsightsPanel({ user, onGoToJobs }) {
  const reduce = useReducedMotion();
  const navigate = useNavigate();

  const [jobs, setJobs] = useState(null);   // null = loading
  const [apps, setApps] = useState(null);
  const [hiredEvents, setHiredEvents] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [error, setError] = useState(null);

  const [market, setMarket] = useState("all");
  const [range, setRange] = useState("90");
  const [sortKey, setSortKey] = useState("applicants"); // applicants | hires | ttf
  const [sortDir, setSortDir] = useState("desc");

  /* Load — scoped to the signed-in HR (RLS enforces this server-side
     too; the explicit hr_id filter keeps payloads small). */
  useEffect(() => {
    const uid = user?.id;
    if (!uid) return undefined;
    let live = true;
    (async () => {
      try {
        const [jobsRes, appsRes, evtRes, ivRes] = await Promise.all([
          supabase
            .from("jobs")
            .select("id, title, market, status, posted_at, created_at")
            .eq("hr_id", uid)
            .eq("source", "hr_portal")
            .eq("kind", "active") // pools never count as active mandates in any metric
            .limit(500),
          supabase
            .from("applications")
            .select("id, job_id, status, ats_score, candidate_id, applied_at, updated_at")
            .eq("hr_id", uid)
            .limit(5000),
          supabase
            .from("candidate_events")
            .select("job_id, candidate_id, created_at")
            .eq("hr_id", uid)
            .eq("event_type", "hired")
            .limit(5000),
          supabase
            .from("interviews")
            .select("id, job_id, status, scheduled_at, created_at")
            .eq("hr_id", uid)
            .limit(5000),
        ]);
        if (!live) return;
        if (jobsRes.error) throw jobsRes.error;
        setJobs(jobsRes.data || []);
        setApps(appsRes.error ? [] : (appsRes.data || []));
        setHiredEvents(evtRes.error ? [] : (evtRes.data || []));
        setInterviews(ivRes.error ? [] : (ivRes.data || []));
      } catch (e) {
        if (!live) return;
        setJobs([]);
        setApps([]);
        setError(e.message || "Couldn't load insights");
      }
    })();
    return () => { live = false; };
  }, [user?.id]);

  const jobMap = useMemo(() => {
    const m = new Map();
    (jobs || []).forEach((j) => m.set(j.id, j));
    return m;
  }, [jobs]);

  /* Earliest "hired" event per candidate+job, for time-to-fill. */
  const hiredAtMap = useMemo(() => {
    const m = new Map();
    hiredEvents.forEach((e) => {
      const k = `${e.candidate_id}:${e.job_id}`;
      const t = new Date(e.created_at).getTime();
      if (!Number.isNaN(t) && (!m.has(k) || t < m.get(k))) m.set(k, t);
    });
    return m;
  }, [hiredEvents]);

  const loading = jobs === null || apps === null;
  const hasAnyApplicants = (apps || []).length > 0;

  /* Apply market + date filters (client-side). Active-jobs count uses
     market only — a date window shouldn't hide a currently-open role. */
  const model = useMemo(() => {
    const all = apps || [];
    const cutoff = (() => {
      const opt = RANGE_OPTIONS.find((r) => r.key === range);
      return opt && opt.days ? Date.now() - opt.days * DAY_MS : null;
    })();

    const inMarket = (jobId) => {
      if (market === "all") return true;
      const j = jobMap.get(jobId);
      return (j?.market || "gulf") === market;
    };

    const fApps = all.filter((a) => {
      // jobMap holds only active jobs (the fetch excludes kind='pool'), so this
      // drops pool applications from the funnel and the job-effectiveness table.
      if (!jobMap.has(a.job_id)) return false;
      if (!inMarket(a.job_id)) return false;
      if (cutoff) {
        const t = new Date(a.applied_at).getTime();
        if (Number.isNaN(t) || t < cutoff) return false;
      }
      return true;
    });

    const activeJobs = (jobs || []).filter(
      (j) => (j.status === "active" || j.status === "published") &&
             (market === "all" || (j.market || "gulf") === market)
    ).length;

    // New is its own entry stage since the evaluation redesign, so the
    // funnel is purely rank-driven and monotonic: "reached stage X" =
    // rank >= X. Rejected (rank -1) counts only toward total applicants.
    const funnel = {
      applicants: fApps.length,
      shortlisted: fApps.filter((a) => rankOf(a.status) >= 1).length,
      ready: fApps.filter((a) => rankOf(a.status) >= 2).length,
      interviewed: fApps.filter((a) => rankOf(a.status) >= 3).length,
      offered: fApps.filter((a) => rankOf(a.status) >= 4).length,
      hired: fApps.filter((a) => rankOf(a.status) >= 5).length,
    };

    // Per-job rollup
    const perJob = new Map();
    const ttfAll = [];
    fApps.forEach((a) => {
      const j = jobMap.get(a.job_id);
      const row = perJob.get(a.job_id) || {
        id: a.job_id,
        title: j?.title || "Untitled role",
        market: j?.market || "gulf",
        applicants: 0,
        hires: 0,
        ttfDays: [],
      };
      row.applicants += 1;
      if (a.status === "hired") {
        row.hires += 1;
        const appliedAt = new Date(a.applied_at).getTime();
        const hiredAt = hiredAtMap.get(`${a.candidate_id}:${a.job_id}`)
          || new Date(a.updated_at).getTime();
        if (!Number.isNaN(appliedAt) && !Number.isNaN(hiredAt) && hiredAt >= appliedAt) {
          const d = Math.round((hiredAt - appliedAt) / DAY_MS);
          row.ttfDays.push(d);
          ttfAll.push(d);
        }
      }
      perJob.set(a.job_id, row);
    });

    const perJobRows = [...perJob.values()].map((r) => ({
      ...r,
      ttf: median(r.ttfDays),
    }));
    const maxApplicants = perJobRows.reduce((mx, r) => Math.max(mx, r.applicants), 0);

    return {
      activeJobs,
      funnel,
      perJobRows,
      maxApplicants,
      medianTtf: median(ttfAll),
      hiresBasis: ttfAll.length,
    };
  }, [apps, jobs, jobMap, hiredAtMap, market, range]);

  /* Interview metrics — same market + date (created_at) filters. */
  const interviewMetrics = useMemo(() => {
    const opt = RANGE_OPTIONS.find((r) => r.key === range);
    const cutoff = opt && opt.days ? Date.now() - opt.days * DAY_MS : null;
    const inMarket = (jobId) => {
      if (market === "all") return true;
      const j = jobMap.get(jobId);
      return (j?.market || "gulf") === market;
    };
    const f = (interviews || []).filter((iv) => {
      if (!inMarket(iv.job_id)) return false;
      if (cutoff) {
        const t = new Date(iv.created_at).getTime();
        if (Number.isNaN(t) || t < cutoff) return false;
      }
      return true;
    });
    const completed = f.filter((iv) => iv.status === "completed").length;
    const noShow = f.filter((iv) => iv.status === "no_show").length;
    const outcomes = completed + noShow;
    return {
      scheduled: f.length,
      completed,
      noShowRate: outcomes > 0 ? Math.round((noShow / outcomes) * 100) : null,
    };
  }, [interviews, jobMap, market, range]);

  const sortedRows = useMemo(() => {
    const rows = [...model.perJobRows];
    const dir = sortDir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      const av = a[sortKey] == null ? -1 : a[sortKey];
      const bv = b[sortKey] == null ? -1 : b[sortKey];
      if (av === bv) return a.title.localeCompare(b.title);
      return (av - bv) * dir;
    });
    return rows;
  }, [model.perJobRows, sortKey, sortDir]);

  const setSort = (key) => {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  };

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="hin-root">
        <div className="hin-loading" aria-busy="true" aria-label="Loading insights">
          <div className="hin-loading__tile" />
          <div className="hin-loading__tile" />
          <div className="hin-loading__tile" />
          <div className="hin-loading__tile" />
        </div>
      </div>
    );
  }

  /* ── Empty (no applicants anywhere) — designed, not a skeleton ── */
  if (!hasAnyApplicants) {
    const noJobs = (jobs || []).length === 0;
    return (
      <div className="hin-root">
        <div className="hjl-empty">
          <p className="hjl-empty__title">
            {noJobs ? "No insights yet" : "No applicants yet"}
          </p>
          <p className="hjl-empty__body">
            {noJobs
              ? "Post your first role and this dashboard will fill with applicant, pipeline, and time-to-fill data as candidates come in."
              : "Share your job link to start collecting CVs — your funnel, time-to-fill, and per-job effectiveness will appear here automatically."}
            {error && (
              <span style={{ display: "block", marginTop: 8, fontSize: 12, color: "var(--pj-muted)" }}>
                ({error})
              </span>
            )}
          </p>
          <button
            type="button"
            className="hjl-cta"
            onClick={() => (noJobs ? navigate("/employer/post") : (onGoToJobs ? onGoToJobs() : navigate("/employer/jobs")))}
          >
            {noJobs ? "Request Talent" : "View your jobs"}
          </button>
        </div>
      </div>
    );
  }

  const f = model.funnel;
  // Stage set + tints match the 21st funnel; values are real and monotonic
  // (reached stage X or beyond), so bars decrease down the list.
  const funnelRows = [
    { key: "new", label: "New", value: f.applicants, color: "blue" },
    { key: "shortlisted", label: "Shortlisted", value: f.shortlisted, color: "indigo" },
    { key: "ready", label: "To interview", value: f.ready, color: "purple" },
    { key: "interviewed", label: "Interviewed", value: f.interviewed, color: "emerald" },
    { key: "offered", label: "Offer", value: f.offered, color: "teal" },
    { key: "hired", label: "Hired", value: f.hired, color: "green" },
  ];
  const funnelBase = Math.max(f.applicants, 1);

  const SortArrow = ({ col }) =>
    sortKey === col ? <span className="hin-th__arrow">{sortDir === "asc" ? "▲" : "▼"}</span> : null;

  return (
    <div className="hin-root">
      {/* Filter bar */}
      <div className="hin-filters">
        <span className="hin-filters__label">Market</span>
        <div className="hjl-toggle" role="radiogroup" aria-label="Market">
          {MARKET_OPTIONS.map((o) => (
            <button
              key={o.key}
              type="button"
              role="radio"
              aria-checked={market === o.key}
              className={`hjl-toggle__btn${market === o.key ? " hjl-toggle__btn--active" : ""}`}
              onClick={() => setMarket(o.key)}
            >{o.label}</button>
          ))}
        </div>
        <span className="hin-filters__spacer" />
        <span className="hin-filters__label">Period</span>
        <div className="hjl-toggle" role="radiogroup" aria-label="Date range">
          {RANGE_OPTIONS.map((o) => (
            <button
              key={o.key}
              type="button"
              role="radio"
              aria-checked={range === o.key}
              className={`hjl-toggle__btn${range === o.key ? " hjl-toggle__btn--active" : ""}`}
              onClick={() => setRange(o.key)}
            >{o.label}</button>
          ))}
        </div>
      </div>

      {/* Overview — eight live metrics in one uniform grid */}
      <section className="hin-overview">
        <h2 className="hin-overview__title">Overview</h2>
        <motion.div
          className="hin-ov-grid"
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: EASE }}
        >
          <StatCard label="Active jobs" value={model.activeJobs} icon={<IcBriefcase />} tint="blue" />
          <StatCard label="Applicants" value={f.applicants} icon={<IcUsers />} tint="purple" />
          <StatCard label="Shortlisted" value={f.shortlisted} icon={<IcUserCheck />} tint="indigo" />
          <StatCard label="Interviewed" value={f.interviewed} icon={<IcChat />} tint="emerald" />
          <StatCard label="Hires" value={f.hired} icon={<IcAward />} tint="green" />
          <StatCard label="Interviews scheduled" value={interviewMetrics.scheduled} icon={<IcCalendar />} tint="amber" />
          <StatCard label="Completed" value={interviewMetrics.completed} icon={<IcCheckCircle />} tint="teal" />
          <StatCard label="No-show rate" value={interviewMetrics.noShowRate} suffix={interviewMetrics.noShowRate == null ? "" : "%"} icon={<IcUserX />} tint="red" />
        </motion.div>
      </section>

      <div className="hin-grid">
        {/* Funnel */}
        <motion.div
          className="hin-card"
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.34, ease: EASE, delay: 0.04 }}
        >
          <div className="hin-card__head">
            <h3 className="hin-card__title">Pipeline funnel</h3>
            <p className="hin-card__sub">
              {model.medianTtf == null
                ? "No completed hires in range"
                : `Median time to fill · ${model.medianTtf} ${model.medianTtf === 1 ? "day" : "days"} (${model.hiresBasis} ${model.hiresBasis === 1 ? "hire" : "hires"})`}
            </p>
          </div>
          <div className="hin-funnel">
            {funnelRows.map((r) => {
              const width = funnelBase ? Math.max((r.value / funnelBase) * 100, r.value > 0 ? 3 : 0) : 0;
              return (
                <div className="hin-funnel__row" key={r.key}>
                  <span className="hin-funnel__label">{r.label}</span>
                  <div className="hin-funnel__track">
                    <motion.div
                      className={`hin-funnel__bar hin-funnel__bar--${r.color}`}
                      initial={reduce ? false : { scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.5, ease: EASE }}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                  <span className="hin-funnel__count">{r.value.toLocaleString()}</span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Per-job effectiveness */}
        <motion.div
          className="hin-card"
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.34, ease: EASE, delay: 0.08 }}
        >
          <div className="hin-card__head">
            <h3 className="hin-card__title">Job effectiveness</h3>
            <p className="hin-card__sub">{sortedRows.length} {sortedRows.length === 1 ? "job" : "jobs"} in range</p>
          </div>

          {sortedRows.length === 0 ? (
            <p className="hin-cell-muted" style={{ padding: "8px 6px" }}>
              No applicants match these filters. Widen the period or market.
            </p>
          ) : (
            <div className="hin-table">
              <div className="hin-table__head">
                <span>Job</span>
                <button type="button" className={`hin-th${sortKey === "applicants" ? " hin-th--active" : ""}`} onClick={() => setSort("applicants")}>
                  Applicants <SortArrow col="applicants" />
                </button>
                <button type="button" className={`hin-th${sortKey === "hires" ? " hin-th--active" : ""}`} onClick={() => setSort("hires")}>
                  Hires <SortArrow col="hires" />
                </button>
                <button type="button" className={`hin-th hin-table__col--ttf${sortKey === "ttf" ? " hin-th--active" : ""}`} onClick={() => setSort("ttf")}>
                  Fill <SortArrow col="ttf" />
                </button>
              </div>
              {sortedRows.map((r) => {
                const appW = model.maxApplicants ? Math.max((r.applicants / model.maxApplicants) * 100, 6) : 0;
                const hireW = r.applicants ? Math.max((r.hires / r.applicants) * 100, r.hires > 0 ? 8 : 0) : 0;
                return (
                  <div className="hin-table__row" key={r.id}>
                    <div className="hin-table__job">
                      <p className="hin-table__job-title">{r.title}</p>
                      <span className={`hin-market hin-market--${r.market === "india" ? "india" : "gulf"}`}>
                        {r.market === "india" ? "India" : "Gulf"}
                      </span>
                    </div>
                    <div className="hin-cellbar">
                      <div className="hin-cellbar__track"><div className="hin-cellbar__fill hin-cellbar__fill--app" style={{ width: `${appW}%` }} /></div>
                      <span className="hin-cellbar__num">{r.applicants}</span>
                    </div>
                    <div className="hin-cellbar">
                      <div className="hin-cellbar__track"><div className="hin-cellbar__fill hin-cellbar__fill--hire" style={{ width: `${hireW}%` }} /></div>
                      <span className="hin-cellbar__num">{r.hires}</span>
                    </div>
                    <span className="hin-cell-muted hin-table__col--ttf">
                      {r.ttf == null ? "—" : `${r.ttf}d`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
