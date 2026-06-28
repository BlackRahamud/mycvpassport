import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { supabase } from "../../../appSupabaseClient";
import "./hrInsights.css";

/* ───────── Stage model ─────────
   Mirrors STAGES / STAGE_BY_DB in JobPipelinePage.jsx. Rank lets us
   build a monotonic funnel from each application's CURRENT status:
   a candidate at "hired" necessarily passed through the earlier
   linear stages, so "reached stage X" = rank >= X. "rejected" dropped
   out (rank -1) and counts only toward total applicants. */
const STATUS_RANK = {
  new: 0, submitted: 0, viewed: 0, shortlisted: 0,
  ready: 1,
  interviewing: 2, interviewed: 2,
  offered: 3,
  hired: 4,
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

/* Reuse the hjl-stat card body so the cards read as the same product. */
function StatCard({ label, value, suffix = "", goal = false }) {
  const display = value == null ? "—" : `${value.toLocaleString()}${suffix}`;
  return (
    <div className={`hjl-stat${goal ? " hin-stat--goal" : ""}`}>
      <div className="hjl-stat__label">{label}</div>
      <div className="hjl-stat__value">{display}</div>
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

    // "Shortlisted" = explicitly shortlisted OR advanced past it. new/submitted/
    // viewed share rank 0 with "shortlisted" (all sit in the Shortlist stage), so
    // rank alone can't gate this — without the status check it would count every
    // non-rejected applicant and read identical to "Applicants". Match the
    // "shortlisted" status explicitly, then add everyone at rank >= 1
    // (ready/interviewing/interviewed/offered/hired).
    const funnel = {
      applicants: fApps.length,
      shortlisted: fApps.filter((a) => a.status === "shortlisted" || rankOf(a.status) >= 1).length,
      interviewed: fApps.filter((a) => rankOf(a.status) >= 2).length,
      offered: fApps.filter((a) => rankOf(a.status) >= 3).length,
      hired: fApps.filter((a) => rankOf(a.status) >= 4).length,
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
            onClick={() => (noJobs ? navigate("/hr/post") : (onGoToJobs ? onGoToJobs() : navigate("/hr/jobs")))}
          >
            {noJobs ? "Request Talent" : "View your jobs"}
          </button>
        </div>
      </div>
    );
  }

  const f = model.funnel;
  const funnelRows = [
    { key: "applicants", label: "Applicants", value: f.applicants, variant: "top" },
    { key: "shortlisted", label: "Shortlisted", value: f.shortlisted },
    { key: "interviewed", label: "Interviewed", value: f.interviewed },
    { key: "offered", label: "Offered", value: f.offered },
    { key: "hired", label: "Hired", value: f.hired, variant: "goal" },
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

      {/* Stat cards */}
      <motion.div
        className="hin-stats"
        initial={reduce ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: EASE }}
      >
        <StatCard label="Active Jobs" value={model.activeJobs} />
        <StatCard label="Applicants" value={f.applicants} />
        <StatCard label="Shortlisted" value={f.shortlisted} />
        <StatCard label="Interviewed" value={f.interviewed} />
        <StatCard label="Hires" value={f.hired} goal />
      </motion.div>

      {/* Interview outcomes (from the interviews table) */}
      <motion.div
        className="hin-stats"
        style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}
        initial={reduce ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: EASE, delay: 0.02 }}
        aria-label="Interview outcomes"
      >
        <StatCard label="Interviews scheduled" value={interviewMetrics.scheduled} />
        <StatCard label="Completed" value={interviewMetrics.completed} />
        <StatCard label="No-show rate" value={interviewMetrics.noShowRate} suffix={interviewMetrics.noShowRate == null ? "" : "%"} />
      </motion.div>

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
              const pct = funnelBase ? Math.round((r.value / funnelBase) * 100) : 0;
              const width = funnelBase ? Math.max((r.value / funnelBase) * 100, r.value > 0 ? 4 : 0) : 0;
              return (
                <div className="hin-funnel__row" key={r.key}>
                  <span className="hin-funnel__label">{r.label}</span>
                  <div className="hin-funnel__track">
                    <motion.div
                      className={`hin-funnel__bar${r.variant === "top" ? " hin-funnel__bar--top" : ""}${r.variant === "goal" ? " hin-funnel__bar--goal" : ""}`}
                      initial={reduce ? false : { scaleX: 0 }}
                      animate={{ scaleX: 1 }}
                      transition={{ duration: 0.5, ease: EASE }}
                      style={{ width: `${width}%` }}
                    />
                    <span className="hin-funnel__meta">
                      {r.value.toLocaleString()}
                      {r.key !== "applicants" && <span className="hin-funnel__pct">{pct}%</span>}
                    </span>
                  </div>
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
