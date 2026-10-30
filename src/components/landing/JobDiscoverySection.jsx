import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, BriefcaseBusiness, CalendarDays, Check, CheckCircle2, ChevronDown, Globe2, MapPin, Search, ShieldCheck, FileText } from "lucide-react";
import { supabase } from "../../appSupabaseClient";
import { salaryText, postedText, jobTypeLabel } from "../../lib/jobs/jobFormat";
import { logEvent } from "../../lib/analytics/logEvent";
import "./jobDiscoverySection.css";

function marketLabel(job) {
  return job.market === "india" ? "India" : "UAE & Gulf";
}


function MarketDropdown({ value, onChange, className, ariaLabel }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const options = [
    { value: "", label: "UAE / India / Gulf" },
    { value: "gulf", label: "UAE & Gulf" },
    { value: "india", label: "India" },
  ];
  const selected = options.find((option) => option.value === value) || options[0];

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div className={`cvp-market-select ${className || ""}`} ref={rootRef}>
      <button
        type="button"
        className="cvp-market-select__trigger"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Globe2 size={17} aria-hidden="true" />
        <span>{selected.label}</span>
        <ChevronDown className={open ? "is-open" : ""} size={17} aria-hidden="true" />
      </button>
      {open && (
        <div className="cvp-market-select__menu" role="listbox" aria-label={ariaLabel}>
          {options.map((option) => (
            <button
              key={option.value || "all"}
              type="button"
              role="option"
              aria-selected={value === option.value}
              className={`cvp-market-select__option${value === option.value ? " is-selected" : ""}`}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              <span>{option.label}</span>
              {value === option.value && <Check size={16} aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function JobDiscoverySection() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [market, setMarket] = useState("");

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("jobs")
          .select("id,title,company,location,market,job_type,currency,salary_min,salary_max,posted_at,created_at,visa_sponsored,status,source")
          .eq("source", "hr_portal")
          .in("status", ["active", "published"])
          .order("posted_at", { ascending: false })
          .limit(3);
        if (error) throw error;
        if (live) setJobs(data || []);
      } catch {
        if (live) setJobs([]);
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
  }, []);

  const searchJobs = (event) => {
    event.preventDefault();
    const params = new URLSearchParams();
    if (keyword.trim()) params.set("search", keyword.trim());
    if (market) params.set("market", market);
    logEvent("job_discovery_search", { source: "homepage_job_section", market: market || "all" });
    navigate(`/jobs${params.toString() ? `?${params.toString()}` : ""}`);
  };

  return (
    <section className="cvp-jobs-discovery" aria-labelledby="cvp-jobs-discovery-title">
      <div className="cvp-jobs-discovery__inner">
        <div className="cvp-jobs-discovery__hero">
          <div className="cvp-jobs-discovery__copy">
            <span className="cvp-jobs-discovery__eyebrow"><BriefcaseBusiness size={14} /> JOBS · UAE, GULF & INDIA</span>
            <h2 id="cvp-jobs-discovery-title">Your next opportunity is closer than you think.</h2>
            <p>Discover real jobs across the UAE, Gulf and India. Build a stronger CV and apply with confidence.</p>
            <div className="cvp-jobs-discovery__trustline"><ShieldCheck size={16} /> Explore active listings with clear job details.</div>
          </div>
          <div className="cvp-jobs-discovery__visual" aria-label="Explore opportunities across the Gulf and India">
            <div className="cvp-jobs-discovery__orbit" />
            <div className="cvp-jobs-discovery__region cvp-jobs-discovery__region--gulf">
              <span className="cvp-jobs-discovery__region-icon">✦</span>
              <span className="cvp-jobs-discovery__region-title">UAE & Gulf</span>
              <span className="cvp-jobs-discovery__region-sub">New paths. New possibilities.</span>
              <span className="cvp-jobs-discovery__skyline cvp-jobs-discovery__skyline--gulf" aria-hidden="true"><i /><i /><i /><i /><i /></span>
            </div>
            <div className="cvp-jobs-discovery__region cvp-jobs-discovery__region--india">
              <span className="cvp-jobs-discovery__region-icon">◈</span>
              <span className="cvp-jobs-discovery__region-title">India</span>
              <span className="cvp-jobs-discovery__region-sub">Find your next chapter closer to home.</span>
              <span className="cvp-jobs-discovery__skyline cvp-jobs-discovery__skyline--india" aria-hidden="true"><i /><i /><i /><i /></span>
            </div>
            <div className="cvp-jobs-discovery__floating-note"><FileText size={18} /><span><b>One place to move forward</b><small>Find a role. Prepare your CV. Apply.</small></span></div>
          </div>
          <form className="cvp-jobs-discovery__search" onSubmit={searchJobs}>
            <label className="cvp-jobs-discovery__keyword"><Search size={18} /><input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Job title, skill or company" aria-label="Job title, skill or company" /></label>
            <MarketDropdown className="cvp-jobs-discovery__market" value={market} onChange={setMarket} ariaLabel="Choose job market" />
            <button type="submit" className="cvp-jobs-discovery__search-btn">Search jobs <ArrowRight size={16} /></button>
          </form>
          <div className="cvp-jobs-discovery__quicklinks">
            <span>Explore roles:</span>
            {["IT Support", "Finance", "Customer Service", "Sales"].map((role) => <button key={role} type="button" onClick={() => { setKeyword(role); navigate(`/jobs?search=${encodeURIComponent(role)}`); }}>{role}</button>)}
          </div>
        </div>

        <div className="cvp-jobs-discovery__list-head">
          <div><span className="cvp-jobs-discovery__section-kicker">OPPORTUNITIES WORTH EXPLORING</span><h3>Featured opportunities</h3><p>Latest active roles across the UAE, Gulf and India.</p></div>
          <Link to="/jobs" className="cvp-jobs-discovery__browse" onClick={() => logEvent("job_discovery_browse_all", { source: "homepage_job_section" })}>Browse all jobs <ArrowRight size={16} /></Link>
        </div>

        {loading ? (
          <div className="cvp-jobs-discovery__cards" aria-busy="true"><div className="cvp-jobs-discovery__skeleton" /><div className="cvp-jobs-discovery__skeleton" /><div className="cvp-jobs-discovery__skeleton" /></div>
        ) : jobs.length ? (
          <div className="cvp-jobs-discovery__cards">
            {jobs.map((job) => {
              const salary = salaryText(job);
              return <article className="cvp-jobs-discovery__job" key={job.id}>
                <div className="cvp-jobs-discovery__job-top"><span className="cvp-jobs-discovery__company-mark">{String(job.company || job.title || "J").split(/\s+/).filter(Boolean).slice(0,2).map((x) => x[0]).join("").toUpperCase()}</span><span className="cvp-jobs-discovery__market-pill">{marketLabel(job)}</span></div>
                <h4>{job.title}</h4><p className="cvp-jobs-discovery__company">{job.company || "Employer"}</p>
                <div className="cvp-jobs-discovery__facts"><span><MapPin size={14} />{job.location || marketLabel(job)}</span>{jobTypeLabel(job) && <span><BriefcaseBusiness size={14} />{jobTypeLabel(job)}</span>}{(job.posted_at || job.created_at) && <span><CalendarDays size={14} />{postedText(job.posted_at || job.created_at)}</span>}</div>
                {salary && <p className="cvp-jobs-discovery__salary">{salary}</p>}
                {job.visa_sponsored && <span className="cvp-jobs-discovery__visa"><CheckCircle2 size={13} />Visa sponsorship listed</span>}
                <Link className="cvp-jobs-discovery__view" to={`/jobs/${job.id}`} onClick={() => logEvent("job_discovery_job_open", { source: "homepage_job_section", market: job.market || "gulf" })}>View role <ArrowRight size={15} /></Link>
              </article>;
            })}
          </div>
        ) : (
          <div className="cvp-jobs-discovery__empty"><div className="cvp-jobs-discovery__empty-icon"><BriefcaseBusiness size={21} /></div><div><b>Explore opportunities across India and the Gulf</b><p>Browse the job board to see current listings and filter by location, field and experience.</p></div><Link to="/jobs">Browse all jobs <ArrowRight size={15} /></Link></div>
        )}

        <div className="cvp-jobs-discovery__bottom">
          <div><span className="cvp-jobs-discovery__bottom-icon"><Search size={19} /></span><span><b>Explore real listings</b><small>Search roles across two markets.</small></span></div>
          <div><span className="cvp-jobs-discovery__bottom-icon"><FileText size={19} /></span><span><b>Prepare for the role</b><small>Build an ATS-friendly CV for your target job.</small></span></div>
          <Link to="/builder" onClick={() => logEvent("homepage_cta_clicked", { cta_text: "Build CV from job discovery", cta_section: "job_discovery" })}>Build my CV free <ArrowRight size={16} /></Link>
        </div>
      </div>
    </section>
  );
}
