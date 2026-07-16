import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useReducedMotion } from "framer-motion";
import { supabase } from "../../appSupabaseClient";
import UserMenu from "../../components/UserMenu/UserMenu";
import TopLoadingBar from "../../components/ui/TopLoadingBar";
import VisaSelect from "../../components/ui/VisaSelect";
import { applyToJob } from "../../lib/jobs/applyToJob";
import { scoreApplicationStopgap } from "../../lib/ats/stopgapScorer";
import {
  monogram, monoIndex, salaryText, experienceBand, experienceText, EXP_BANDS,
  postedText, jobStatus, JOB_TYPE_OPTIONS, MARKET_OPTIONS, roleNeedsVisa, matchTone,
} from "../../lib/jobs/jobFormat";
import { saveApplyIntent } from "../../lib/auth/applyIntent";
import "../hr/PostJob/postJob.css"; // --pj-* light tokens
import "../../components/hr/surfaceGlass.css"; // glass tokens for the floating surfaces
import "./jobBoard.css";

const RETURN_PATH_KEY = "cvp_return_path";

/* ───────── Inline icons ───────── */
const IcSearch = (p) => (<svg width={p.s || 15} height={p.s || 15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.3-4.3" /></svg>);
const IcBell = () =>(<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></svg>);
const IcCheck = (p) => (<svg width={p.s || 11} height={p.s || 11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p.w || 3} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>);
const IcShield = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 3v6c0 4.2-2.9 7.6-7 9-4.1-1.4-7-4.8-7-9V6z" /></svg>);
const IcVerified = () => (<svg className="jb-verified" width="14" height="14" viewBox="0 0 24 24" fill="var(--jb-green)"><path d="M12 2l2.4 1.8 3-.2 1.3 2.7 2.7 1.3-.2 3L23 12l-1.8 2.4.2 3-2.7 1.3-1.3 2.7-3-.2L12 23l-2.4-1.8-3 .2-1.3-2.7L2.6 17l.2-3L1 12l1.8-2.4-.2-3 2.7-1.3L6.6 2.6l3 .2z" /><path d="M9.3 12.3l1.9 1.9 3.6-4" fill="none" stroke="var(--pj-surface)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>);
const IcFile = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>);
const IcFilter = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 6h16M7 12h10M10 18h4" /></svg>);
const IcX = () => (<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>);

function Checkbox({ on, label, count, onClick }) {
  return (
    <button type="button" className={`jb-check${on ? " jb-check--on" : ""}`} onClick={onClick} aria-pressed={on}>
      <span className="jb-check__box" aria-hidden>{on && <IcCheck s={11} w={3} />}</span>
      <span className="jb-check__label">{label}</span>
      {count != null && <span className="jb-check__count">{count}</span>}
    </button>
  );
}

export default function JobBoardPage() {
  const reduce = useReducedMotion();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [cvBlob, setCvBlob] = useState(null); // the saved CV, for one-tap + match scoring
  const [jobs, setJobs] = useState(null); // null = loading
  const [verifiedMap, setVerifiedMap] = useState({}); // hr_id → true
  const [appliedMap, setAppliedMap] = useState({}); // job_id → { cooldownDays }
  const [barActive, setBarActive] = useState(false);

  // Filters
  const [markets, setMarkets] = useState([]);
  const [fields, setFields] = useState([]);
  const [types, setTypes] = useState([]);
  const [exps, setExps] = useState([]);
  const [visaOnly, setVisaOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [mFiltersOpen, setMFiltersOpen] = useState(false);

  // Row apply
  const [rowApplyId, setRowApplyId] = useState(null);
  const [rowSending, setRowSending] = useState(false);
  const [rowSentId, setRowSentId] = useState(null);
  const [rowError, setRowError] = useState(null);
  const [rowVisa, setRowVisa] = useState("");
  const [rowMatch, setRowMatch] = useState(null);

  const [isMobile, setIsMobile] = useState(false);
  const collapseRef = useRef(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 860px)");
    const on = () => setIsMobile(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    let live = true;
    supabase.auth.getUser().then(({ data }) => { if (live) setUser(data?.user || null); });
    return () => { live = false; };
  }, []);

  // Profile (name/plan + persisted visa for a genuine one tap) and the saved CV.
  useEffect(() => {
    if (!user?.id) return undefined;
    let live = true;
    (async () => {
      const [{ data: prof }, { data: cvRow }] = await Promise.all([
        supabase.from("profiles").select("plan, full_name, visa_status, phone").eq("id", user.id).maybeSingle().then((r) => r).catch(() => ({ data: null })),
        supabase.from("cvs").select("cv_data").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(1).maybeSingle().then((r) => r).catch(() => ({ data: null })),
      ]);
      if (!live) return;
      setProfile(prof || null);
      setCvBlob(cvRow?.cv_data || null);
      if (prof?.visa_status) setRowVisa(prof.visa_status);
    })();
    return () => { live = false; };
  }, [user?.id]);

  // Jobs + which of the candidate's roles are already applied to.
  useEffect(() => {
    let live = true;
    setBarActive(true);
    (async () => {
      try {
        const { data, error } = await supabase
          .from("jobs")
          .select("*")
          .eq("source", "hr_portal")
          .in("status", ["active", "published"])
          .order("posted_at", { ascending: false })
          .limit(60);
        if (!live) return;
        if (error) throw error;
        const rows = data || [];
        setJobs(rows);

        // Verified badge: truthful only. hr_public_profiles is a view that
        // exposes ONLY (user_id, verified, company_name) — never work_email.
        // Anything unreadable (e.g. before migration 041) defaults to not
        // verified, so the tick simply stays hidden, which is the safe default.
        const hrIds = [...new Set(rows.map((r) => r.hr_id).filter(Boolean))];
        if (hrIds.length) {
          try {
            const { data: hrs } = await supabase.from("hr_public_profiles").select("user_id, verified").in("user_id", hrIds);
            if (live && hrs) {
              const m = {};
              hrs.forEach((h) => { if (h.verified) m[h.user_id] = true; });
              setVerifiedMap(m);
            }
          } catch { /* badge stays hidden — correct default */ }
        }
      } catch {
        if (live) setJobs([]);
      } finally {
        if (live) setBarActive(false);
      }
    })();
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (!user?.id || !jobs?.length) return undefined;
    let live = true;
    (async () => {
      const ids = jobs.map((j) => j.id);
      const { data } = await supabase
        .from("applications")
        .select("job_id, cooldown_expires_at")
        .eq("candidate_id", user.id)
        .in("job_id", ids);
      if (!live || !data) return;
      const m = {};
      data.forEach((a) => {
        const cd = a.cooldown_expires_at && new Date(a.cooldown_expires_at) > new Date()
          ? Math.ceil((new Date(a.cooldown_expires_at).getTime() - Date.now()) / 86400000)
          : 0;
        m[a.job_id] = { cooldownDays: cd };
      });
      setAppliedMap(m);
    })();
    return () => { live = false; };
  }, [user?.id, jobs]);

  const hasCv = !!cvBlob;

  // Derived filter option lists (real data, not decorative).
  const fieldOptions = useMemo(() => {
    const counts = {};
    (jobs || []).forEach((j) => { const d = (j.department || "").trim(); if (d) counts[d] = (counts[d] || 0) + 1; });
    return Object.keys(counts).sort().map((d) => ({ val: d, label: d, count: counts[d] }));
  }, [jobs]);

  const countBy = (predicate) => (jobs || []).filter(predicate).length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (jobs || []).filter((j) => {
      if (markets.length && !markets.includes(j.market || "gulf")) return false;
      if (fields.length && !fields.includes((j.department || "").trim())) return false;
      if (types.length && !types.includes(j.job_type)) return false;
      if (exps.length && !exps.includes(experienceBand(j))) return false;
      if (visaOnly && !j.visa_sponsored) return false;
      if (q && !`${j.title} ${j.company} ${j.location}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [jobs, markets, fields, types, exps, visaOnly, search]);

  const total = jobs?.length || 0;
  const visaDisabled = markets.length === 1 && markets[0] === "india";
  const filterCount = markets.length + fields.length + types.length + exps.length + (visaOnly ? 1 : 0);
  const anyFilter = filterCount > 0 || !!search.trim();

  const toggle = (setter, val) => setter((cur) => (cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val]));
  const clearAll = () => { setMarkets([]); setFields([]); setTypes([]); setExps([]); setVisaOnly(false); setSearch(""); };

  const greetingName = profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || (user?.email ? user.email.split("@")[0] : "");

  const openDetail = (job, e) => {
    let origin = "50% 40%";
    try {
      const el = e.currentTarget.closest(".jb-row");
      const rootEl = e.currentTarget.closest(".jb-root");
      if (el && rootEl) {
        const r = el.getBoundingClientRect();
        const root = rootEl.getBoundingClientRect();
        origin = `${(((r.left + r.width / 2) - root.left) / root.width * 100).toFixed(1)}% ${(((r.top + r.height / 2) - root.top) / root.height * 100).toFixed(1)}%`;
      }
    } catch { /* origin stays centred */ }
    setBarActive(true);
    navigate(`/jobs/${job.id}`, { state: { origin, from: "board" } });
  };

  const startRowApply = (job, e) => {
    e.stopPropagation();
    // Only a signed-in candidate with a CV confirms in place. Everyone else
    // goes to the detail, where their real state (sign in / upload) lives.
    if (!user) {
      try { saveApplyIntent({ jobId: job.id, form: {} }); window.sessionStorage?.setItem(RETURN_PATH_KEY, `/jobs/${job.id}`); } catch { /* private mode */ }
      openDetail(job, e);
      return;
    }
    if (!hasCv) { openDetail(job, e); return; }
    setRowError(null);
    setRowSentId(null);
    setRowVisa(profile?.visa_status || "");
    setRowApplyId(job.id);
    let match = null;
    try { match = scoreApplicationStopgap({ jobRequirements: job.requirements, candidateCv: cvBlob })?.score ?? null; } catch { match = null; }
    setRowMatch(match);
  };

  const closeRowApply = () => { setRowApplyId(null); setRowError(null); clearTimeout(collapseRef.current); };

  const sendRow = async (job) => {
    if (rowSending) return;
    setRowSending(true);
    setRowError(null);
    const existing = appliedMap[job.id] ? { id: undefined } : null; // fresh apply on the board
    const res = await applyToJob(supabase, {
      user, job, visaStatus: roleNeedsVisa(job) ? rowVisa : "", isEasyApply: true, existingApp: existing?.id ? existing : null,
    });
    setRowSending(false);
    if (!res.ok) { setRowError(res.error || "Could not send, try again"); return; }
    setRowSentId(job.id);
    setAppliedMap((m) => ({ ...m, [job.id]: { cooldownDays: 7 } }));
    collapseRef.current = setTimeout(() => setRowApplyId((id) => (id === job.id ? null : id)), 2200);
  };

  useEffect(() => () => clearTimeout(collapseRef.current), []);

  const activeChips = useMemo(() => {
    const chips = [];
    const mLabel = (v) => (MARKET_OPTIONS.find((o) => o.val === v)?.label || v);
    markets.forEach((v) => chips.push({ group: "markets", val: v, label: mLabel(v) }));
    fields.forEach((v) => chips.push({ group: "fields", val: v, label: v }));
    types.forEach((v) => chips.push({ group: "types", val: v, label: JOB_TYPE_OPTIONS.find((o) => o.val === v)?.label || v }));
    exps.forEach((v) => chips.push({ group: "exps", val: v, label: EXP_BANDS.find((o) => o.val === v)?.label || v }));
    if (visaOnly) chips.push({ group: "visa", val: "", label: "Visa sponsored" });
    if (search.trim()) chips.push({ group: "search", val: "", label: `"${search.trim()}"` });
    return chips;
  }, [markets, fields, types, exps, visaOnly, search]);

  const removeChip = (c) => {
    if (c.group === "search") return setSearch("");
    if (c.group === "visa") return setVisaOnly(false);
    if (c.group === "markets") return setMarkets((x) => x.filter((v) => v !== c.val));
    if (c.group === "fields") return setFields((x) => x.filter((v) => v !== c.val));
    if (c.group === "types") return setTypes((x) => x.filter((v) => v !== c.val));
    if (c.group === "exps") return setExps((x) => x.filter((v) => v !== c.val));
    return undefined;
  };

  const rail = (
    <aside className={`jb-rail${mFiltersOpen ? " jb-rail--open" : ""}`}>
      <div className="jb-rail__search jb-only-desktop">
        <IcSearch s={15} />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search" aria-label="Search jobs" />
      </div>

      <div className="jb-grouplabel">Location</div>
      <div className="jb-group">
        {MARKET_OPTIONS.map((o) => (
          <Checkbox key={o.val} on={markets.includes(o.val)} label={o.label} count={countBy((j) => (j.market || "gulf") === o.val)} onClick={() => toggle(setMarkets, o.val)} />
        ))}
      </div>

      {fieldOptions.length > 0 && (
        <>
          <div className="jb-grouplabel">Field</div>
          <div className="jb-group">
            {fieldOptions.map((o) => (
              <Checkbox key={o.val} on={fields.includes(o.val)} label={o.label} count={o.count} onClick={() => toggle(setFields, o.val)} />
            ))}
          </div>
        </>
      )}

      {/* Employee type + Experience render at all times, regardless of role
          volume (founder's call). Counts are shown only where they exist —
          a zero-match option carries no badge rather than a bare "0". */}
      <div className="jb-grouplabel">Employee type</div>
      <div className="jb-group">
        {JOB_TYPE_OPTIONS.map((o) => (
          <Checkbox key={o.val} on={types.includes(o.val)} label={o.label} count={countBy((j) => j.job_type === o.val) || undefined} onClick={() => toggle(setTypes, o.val)} />
        ))}
      </div>
      <div className="jb-grouplabel">Experience</div>
      <div className="jb-group">
        {EXP_BANDS.map((o) => (
          <Checkbox key={o.val} on={exps.includes(o.val)} label={o.label} count={countBy((j) => experienceBand(j) === o.val) || undefined} onClick={() => toggle(setExps, o.val)} />
        ))}
      </div>

      <button
        type="button"
        className={`jb-visa-toggle${visaOnly && !visaDisabled ? " jb-visa-toggle--on" : ""}${visaDisabled ? " jb-visa-toggle--disabled" : ""}`}
        onClick={() => { if (!visaDisabled) setVisaOnly((v) => !v); }}
        aria-pressed={visaOnly && !visaDisabled}
        disabled={visaDisabled}
      >
        <span className="jb-visa-toggle__label"><IcShield />Visa sponsored only</span>
        <span className="jb-switch"><span className="jb-switch__knob" /></span>
      </button>
      {visaDisabled && <p className="jb-visa-hint">Applies to Gulf roles</p>}

      {anyFilter && <button type="button" className="jb-clear" onClick={clearAll}>Clear all filters</button>}
    </aside>
  );

  return (
    <div className="jb-root">
      <TopLoadingBar active={barActive} />

      <header className="jb-nav">
        <a href="/" className="jb-wordmark" aria-label="CVPassport home">
          <img className="jb-wordmark__mark" src="/assets/brand/logo512.png" alt="" aria-hidden="true" />
          <span className="jb-wordmark__text">CV<span>Passport</span></span>
        </a>
        <div className="jb-nav__center">
          <span className="jb-here" aria-current="page">
            <IcSearch s={15} />
            <span className="jb-only-desktop">Browse opportunities</span>
          </span>
        </div>
        <div className="jb-nav__right">
          <button type="button" className="jb-iconbtn" aria-label="Notifications"><IcBell /></button>
          {user ? (
            <UserMenu
              email={user.email || ""}
              name={greetingName}
              plan={profile?.plan}
              switchTo={{ label: "Switch to HR", path: "/employer/jobs" }}
              settingsPath="/account"
              theme="light"
            />
          ) : (
            <button type="button" className="jb-signin" onClick={() => navigate("/auth")}>Sign in</button>
          )}
        </div>
      </header>

      <div className="jb-scroll">
        <div className="jb-head">
          <span className="jb-trust">
            <IcCheck s={13} w={2.4} />
            <span>Verified employers · Real salaries in local currency · Visa sponsored Gulf roles</span>
          </span>
          <h1 className="jb-head__title">
            {jobs === null ? "Roles hiring now" : `${total} ${total === 1 ? "role" : "roles"} hiring now`}
          </h1>
          <p className="jb-head__sub">Real salaries in local currency, per month, as posted. Verified employers carry a tick.</p>
        </div>

        {/* Mobile filter bar (glass) */}
        <div className="jb-mfilter">
          <div className="jb-mfilter__search">
            <IcSearch s={15} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, company, city" aria-label="Search jobs" />
          </div>
          <button type="button" className="jb-mfilter__toggle" onClick={() => setMFiltersOpen((v) => !v)}>
            <IcFilter />Filters
            {filterCount > 0 && <span className="jb-mfilter__count">{filterCount}</span>}
          </button>
        </div>

        <div className="jb-body">
          {rail}

          <div className="jb-results">
            {jobs === null && (
              <div className="jb-loading" aria-busy="true" aria-label="Loading roles">
                <div className="jb-skel" /><div className="jb-skel" /><div className="jb-skel" />
              </div>
            )}

            {jobs && jobs.length === 0 && (
              <div className="jb-empty">
                <div className="jb-empty__icon"><IcSearch s={26} /></div>
                <h2 className="jb-empty__title">No verified roles are live right now</h2>
                <p className="jb-empty__body">New verified roles are posted here every week. Check back soon, or switch to the HR portal to post one.</p>
              </div>
            )}

            {jobs && jobs.length > 0 && filtered.length === 0 && (
              <div className="jb-empty">
                <div className="jb-empty__icon"><IcSearch s={26} /></div>
                <h2 className="jb-empty__title">No roles match these filters yet</h2>
                <p className="jb-empty__body">New verified roles are posted here every week. Try widening your search, or clear a filter to see more.</p>
                {activeChips.length > 0 && (
                  <div className="jb-chips">
                    {activeChips.map((c) => (
                      <button key={`${c.group}-${c.val}`} type="button" className="jb-chip" onClick={() => removeChip(c)}>
                        {c.label}<span className="jb-chip__x"><IcX /></span>
                      </button>
                    ))}
                  </div>
                )}
                <button type="button" className="jb-showall" onClick={clearAll}>Show all {total} open {total === 1 ? "role" : "roles"}</button>
              </div>
            )}

            {jobs && filtered.length > 0 && (
              <>
                <div className="jb-resultline jb-only-desktop">
                  {filtered.length === total ? `${total} open ${total === 1 ? "role" : "roles"}` : `${filtered.length} of ${total} roles`}
                </div>
                {filtered.map((job, i) => {
                  const st = jobStatus(job);
                  const applied = !!appliedMap[job.id];
                  const cd = appliedMap[job.id]?.cooldownDays || 0;
                  const verified = !!verifiedMap[job.hr_id];
                  const salary = salaryText(job);
                  const exp = experienceText(job);
                  const confirmOpen = rowApplyId === job.id;
                  const sent = rowSentId === job.id;
                  const needsVisa = roleNeedsVisa(job);
                  return (
                    <div
                      key={job.id}
                      className={`jb-row${confirmOpen ? " jb-row--open" : ""}${reduce ? "" : " jb-rise"}`}
                      style={reduce ? undefined : { animationDelay: `${Math.min(i * 40, 240)}ms` }}
                    >
                      <div className="jb-row__body" role="button" tabIndex={0} onClick={(e) => openDetail(job, e)} onKeyDown={(e) => { if (e.key === "Enter") openDetail(job, e); }}>
                        <div className="jb-row__top">
                          <span className={`jb-mono jb-mono--${monoIndex(job.company || job.title)}`}>{monogram(job.company || job.title)}</span>
                          <span className="jb-row__company">
                            <span className="jb-row__company-name">{job.company || "Company"}</span>
                            {verified && <IcVerified />}
                          </span>
                          <span className="jb-row__status">
                            <span className={`jb-dot jb-dot--${st.tone}`} />
                            <span className={`jb-row__status-label jb-status--${st.tone} jb-only-desktop`}>{st.label}</span>
                          </span>
                        </div>
                        <h3 className="jb-row__title">{job.title}</h3>
                        <div className="jb-row__facts">
                          {job.visa_sponsored && <span className="jb-pill-visa"><IcCheck s={12} w={2.4} />Visa sponsored</span>}
                          {salary && <span className="jb-salary">{salary}</span>}
                          {job.location && <span className="jb-meta">{job.location}</span>}
                          {exp && <span className="jb-meta jb-only-desktop">· {exp}</span>}
                          <span className="jb-meta jb-meta--posted">{postedText(job.posted_at || job.created_at)}</span>
                        </div>
                      </div>

                      <div className="jb-applycell">
                        {applied && !confirmOpen ? (
                          <div className="jb-appliedchip">
                            <span className="jb-appliedchip__badge"><IcCheck s={14} w={2.4} />Applied</span>
                            {cd > 0 && <span className="jb-appliedchip__note">Reapply in {cd} {cd === 1 ? "day" : "days"}</span>}
                          </div>
                        ) : !confirmOpen ? (
                          <button type="button" className="jb-apply" onClick={(e) => startRowApply(job, e)}>Apply</button>
                        ) : null}
                      </div>

                      {confirmOpen && (
                        <div className={`jb-confirm${reduce ? "" : " jb-menu-in"}`} onClick={(e) => e.stopPropagation()}>
                          {sent ? (
                            <div className="jb-confirm__sent">
                              <span className="jb-confirm__sent-ic"><IcCheck s={15} w={2.6} /></span>
                              <span className="jb-confirm__sent-text"><b>Sent to {job.company}.</b> Their hiring team will reply by WhatsApp or email within 3 working days.</span>
                            </div>
                          ) : (
                            <div className="jb-confirm__body">
                              <div className="jb-confirm__file">
                                <IcFile />
                                <div style={{ minWidth: 0 }}>
                                  <div className="jb-confirm__file-name">Your CVPassport CV</div>
                                  <div className="jb-confirm__file-sub">Sends as is</div>
                                </div>
                                {rowMatch != null && <span className={`jb-matchchip jb-matchchip--${matchTone(rowMatch)}`}>{rowMatch}% match</span>}
                              </div>
                              <div className="jb-confirm__controls">
                                {needsVisa ? (
                                  <div className="jb-confirm__visa">
                                    <div className="jb-confirm__visa-label">Visa status</div>
                                    <VisaSelect value={rowVisa} onChange={setRowVisa} isMobile={isMobile} size="sm" />
                                  </div>
                                ) : (
                                  <div className="jb-confirm__novisa">Nothing else needed. Your CV and details are ready to send.</div>
                                )}
                                {rowError && <div className="jb-confirm__err">{rowError}</div>}
                                <button type="button" className="jb-btn-ghost" onClick={closeRowApply}>Cancel</button>
                                <button
                                  type="button"
                                  className="jb-btn-send"
                                  disabled={rowSending || (needsVisa && !rowVisa)}
                                  onClick={() => sendRow(job)}
                                >
                                  {rowSending ? "Sending…" : rowError ? "Try again" : "Send application"}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
