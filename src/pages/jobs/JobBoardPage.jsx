import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { supabase } from "../../appSupabaseClient";
import "../hr/PostJob/postJob.css"; // reuse :root tokens
import "./jobBoard.css";

/* ───────── Filter taxonomies (visual only for now — wire to query later) ───────── */
const EMPLOYEE_TYPES = ["Full-time", "Freelance", "Contract", "Intern"];
const JOB_CATEGORIES = ["Engineering", "Admin & Customer Support", "Marketing & Creative", "Design", "Legal", "Finance & Accounting"];
const EXPERIENCE_BUCKETS = ["Less than 1 Years", "1 - 2 Years", "3 - 5 Years", "5 Years +"];
const LAST_UPDATED = ["Recently", "24 Hours", "1 Week", "Anytime"];

/* ───────── Mock data — only used when ?mock=1 is present.
   Production renders from Supabase `jobs` table; empty state otherwise. ───────── */
const MOCK_JOBS = Array.from({ length: 5 }).map((_, i) => ({
  id: `mock-${i + 1}`,
  title: "Data analytics business analyst",
  category: "Engineering",
  job_type: "Contract",
  remote: true,
  location: "Ithaca, New York",
  experience_label: "5 Years +",
  salary_label: "$65 per hour",
  posted_label: "12 Hours ago",
}));

/* ───────── Map a Supabase job row → card-friendly shape ───────── */
function adaptRow(row) {
  return {
    id: row.id,
    title: row.title,
    category: row.category || row.department || "Engineering",
    job_type: row.job_type || "Full-time",
    remote: !!row.remote,
    location: row.location || "Remote",
    experience_label: row.experience_label || (row.years_experience_min ? `${row.years_experience_min}+ Years` : "Any"),
    salary_label:
      row.salary_min && row.salary_max
        ? `$${row.salary_min} – $${row.salary_max}`
        : row.salary_min
          ? `$${row.salary_min}+`
          : "—",
    posted_label: relativeTime(row.posted_at || row.created_at),
  };
}

function relativeTime(dateStr) {
  if (!dateStr) return "Recently";
  const t = new Date(dateStr).getTime();
  const diffH = Math.max(0, Math.floor((Date.now() - t) / 3600000));
  if (diffH < 1) return "Just now";
  if (diffH < 24) return `${diffH} Hours ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "1 day ago";
  if (diffD < 14) return `${diffD} days ago`;
  return new Date(t).toLocaleDateString();
}

/* ───────── Inline icons ───────── */
const SearchIc = () => (
  <svg className="jb-search__icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const PinIc = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);
const BellIc = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>
);
const ChevDown = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);
const ChevRight = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);
const ChevLeft = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);
const ExperienceIc = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
);
const TypeIc = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
  </svg>
);
const SalaryIc = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
);

function FilterGroup({ title, options }) {
  return (
    <div className="jb-filter-group">
      <p className="jb-filter-group__title">{title}</p>
      <div className="jb-filter-group__list">
        {options.map((o) => (
          <label key={o} className="jb-check">
            <span style={{ position: "relative", display: "inline-flex" }}>
              <input type="checkbox" />
              <span className="pj-checkbox__box" aria-hidden />
            </span>
            <span>{o}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

function JobCard({ job, onApply, index }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="jb-card"
      initial={reduce ? false : { opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.36, ease: [0.4, 0, 0.2, 1], delay: Math.min(index * 0.04, 0.2) }}
    >
      <div className="jb-card__head">
        <div>
          <h3 className="jb-card__title">{job.title}</h3>
          <p className="jb-card__sub">{job.category} <span className="jb-chip__sep">·</span> {job.remote ? "Remote" : "Onsite"}</p>
        </div>
        <div className="jb-card__meta">
          <span className="jb-card__loc"><PinIc />{job.location}</span>
          <span>{job.posted_label}</span>
        </div>
      </div>
      <div className="jb-card__foot">
        <div className="jb-card__chips">
          <span className="jb-chip"><ExperienceIc />{job.experience_label}</span>
          <span className="jb-chip"><TypeIc />{job.job_type}</span>
          <span className="jb-chip"><SalaryIc />{job.salary_label}</span>
        </div>
        <motion.button
          type="button"
          className="jb-apply"
          onClick={() => onApply(job)}
          whileTap={reduce ? undefined : { scale: 0.97 }}
          transition={{ duration: 0.14, ease: [0.4, 0, 0.2, 1] }}
        >
          1 Click Apply
        </motion.button>
      </div>
    </motion.div>
  );
}

export default function JobBoardPage() {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const useMock = searchParams.get("mock") === "1";

  const [user, setUser] = useState(null);
  const [jobs, setJobs] = useState(useMock ? MOCK_JOBS : null); // null = loading
  const [error, setError] = useState(null);

  useEffect(() => {
    let live = true;
    supabase.auth.getUser().then(({ data }) => { if (live) setUser(data?.user || null); });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (useMock) return;
    let live = true;
    (async () => {
      try {
        const { data, error: e } = await supabase
          .from("jobs")
          .select("*")
          .eq("source", "hr_portal")  // only HR-posted; never Scout
          .order("posted_at", { ascending: false })
          .limit(50);
        if (!live) return;
        if (e) throw e;
        setJobs((data || []).map(adaptRow));
      } catch (e) {
        if (!live) return;
        // Fall back to empty list if the column/table isn't set up yet — never crash the route.
        setJobs([]);
        setError(e.message || "Couldn't load jobs");
      }
    })();
    return () => { live = false; };
  }, [useMock]);

  const greetingName = useMemo(() => {
    const meta = user?.user_metadata || {};
    return meta.full_name || meta.name || user?.email?.split("@")[0] || null;
  }, [user]);

  const handleApply = (job) => {
    if (!user) { navigate("/auth"); return; }
    navigate(`/jobs/${job.id}`);
  };

  const total = jobs?.length || 0;

  return (
    <div className="jb-root">
      <header className="jb-topbar">
        <div className="jb-topbar__brand">
          <span className="jb-topbar__logo">M</span>
        </div>
        <div className="jb-topbar__center">
          <button type="button" className="jb-browse-cta">
            <PinIc />
            Browse Opportunities
          </button>
        </div>
        <div className="jb-topbar__right">
          <button type="button" className="jb-icon-btn" aria-label="Notifications"><BellIc /></button>
          <button type="button" className="jb-user-pill">
            <span className="jb-avatar">{(greetingName?.[0] || "?").toUpperCase()}</span>
            <span>{greetingName || "Sign in"}</span>
            <ChevDown />
          </button>
        </div>
      </header>

      <motion.section
        className="jb-hero"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className="jb-hero__inner">
          <div>
            <p className="jb-hero__greeting">{greetingName ? `Hi, ${greetingName} !` : "Welcome —"}</p>
            <h1 className="jb-hero__title">Your Next Job Opportunity</h1>
          </div>
          <div className="jb-hero__contact">
            <span className="jb-avatar jb-avatar--lg" style={{ background: "#F5D6E0", color: "#8B1F47" }}>AM</span>
            <div className="jb-hero__contact-text">
              <span className="jb-hero__contact-label">Contact Your Account Manager</span>
              <span className="jb-hero__contact-info">amy_gabriel@cvpassport.xyz</span>
              <span className="jb-hero__contact-info">(800) 219-0481</span>
            </div>
          </div>
        </div>
      </motion.section>

      <main className="jb-main">
        <aside className="jb-sidebar">
          <div className="jb-search">
            <input placeholder="Search Jobs" />
            <SearchIc />
          </div>
          <select className="jb-loc-select" defaultValue="">
            <option value="" disabled>All Location</option>
            <option>Remote</option>
            <option>India</option>
            <option>UAE / Gulf</option>
          </select>
          <FilterGroup title="Employee Type" options={EMPLOYEE_TYPES} />
          <FilterGroup title="Job Category"  options={JOB_CATEGORIES} />
          <FilterGroup title="Experience"    options={EXPERIENCE_BUCKETS} />
          <FilterGroup title="Last Updated"  options={LAST_UPDATED} />
        </aside>

        <section>
          {jobs === null && (
            <div className="jb-loading">
              <p className="jb-empty__title">Loading jobs…</p>
            </div>
          )}

          {jobs && jobs.length === 0 && (
            <div className="jb-empty">
              <p className="jb-empty__title">No jobs posted yet</p>
              <p className="jb-empty__body">
                Be the first to know — we&rsquo;ll show new HR-posted roles here as they&rsquo;re published.
                {error && <> <span style={{ display: "block", marginTop: 8, fontSize: 12, color: "var(--pj-muted)" }}>({error})</span></>}
              </p>
            </div>
          )}

          {jobs && jobs.length > 0 && (
            <div className="jb-list">
              {jobs.map((j, i) => <JobCard key={j.id} job={j} onApply={handleApply} index={i} />)}
            </div>
          )}

          {jobs && jobs.length > 0 && (
            <div className="jb-pagination">
              <span>
                Showing&nbsp;
                <select className="jb-pag__select" defaultValue="5"><option>5</option><option>10</option><option>20</option></select>
                &nbsp;of {total} results
              </span>
              <div className="jb-pag__pages">
                <button type="button" className="jb-pag__btn"><ChevLeft /> Prev</button>
                <button type="button" className="jb-pag__num jb-pag__num--active">1</button>
                <button type="button" className="jb-pag__num">2</button>
                <button type="button" className="jb-pag__btn">Next <ChevRight /></button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
