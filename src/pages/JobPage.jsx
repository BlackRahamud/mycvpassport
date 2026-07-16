import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../appSupabaseClient";
import { saveApplyIntent, consumeApplyIntent } from "../lib/auth/applyIntent";
import { scoreApplicationStopgap } from "../lib/ats/stopgapScorer";
import { applyToJob } from "../lib/jobs/applyToJob";
import UserMenu from "../components/UserMenu/UserMenu";
import TopLoadingBar from "../components/ui/TopLoadingBar";
import VisaSelect from "../components/ui/VisaSelect";
import {
  monogram, monoIndex, salaryText, experienceText, postedText, jobStatus,
  jobTypeLabel, roleNeedsVisa, matchTone,
} from "../lib/jobs/jobFormat";
import "./hr/PostJob/postJob.css"; // --pj-* light tokens
import "./jobs/jobBoard.css"; // .jb-root tokens + dark + shared classes
import "./jobs/jobPage.css";

const RETURN_PATH_KEY = "cvp_return_path";

/* ───────── Inline icons ───────── */
const IcBack = () => (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>);
const IcPin = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 6-9 12-9 12s-9-6-9-12a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>);
const IcBriefcase = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>);
const IcCheck = (p) => (<svg width={p.s || 14} height={p.s || 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p.w || 2.3} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>);
const IcBolt = (p) => (<svg width={p.s || 17} height={p.s || 17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9z" /></svg>);
const IcUpload = () => (<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M17 8l-5-5-5 5" /><path d="M12 3v12" /></svg>);
const IcFile = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>);
const IcVerified = () => (<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 1.8 3-.2 1.3 2.7 2.7 1.3-.2 3L23 12l-1.8 2.4.2 3-2.7 1.3-1.3 2.7-3-.2L12 23l-2.4-1.8-3 .2-1.3-2.7L2.6 17l.2-3L1 12l1.8-2.4-.2-3 2.7-1.3L6.6 2.6l3 .2z" /></svg>);

function daysAgoText(date) {
  if (!date) return "";
  const d = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (d <= 0) return "today";
  if (d === 1) return "1 day ago";
  if (d < 7) return `${d} days ago`;
  if (d < 14) return "1 week ago";
  return `${Math.floor(d / 7)} weeks ago`;
}

export default function JobPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const origin = location.state?.origin || "50% 40%";

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [cvBlob, setCvBlob] = useState(null);
  const [verified, setVerified] = useState(false);
  const [companyName, setCompanyName] = useState(null);
  const [openRoles, setOpenRoles] = useState(null);
  const [existingApp, setExistingApp] = useState(null);
  const [cooldownDays, setCooldownDays] = useState(0);
  const [replayIntent] = useState(() => consumeApplyIntent(jobId));

  // apply: decide | easyConfirm | manual | sent
  const [phase, setPhase] = useState("decide");
  const [forceReapply, setForceReapply] = useState(false);
  const [visaStatus, setVisaStatus] = useState("");
  const [cvFile, setCvFile] = useState(null);
  const [cvFilename, setCvFilename] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(null);
  const [sentScore, setSentScore] = useState(null);

  const [isMobile, setIsMobile] = useState(false);
  const replayedRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 860px)");
    const on = () => setIsMobile(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setUser(data?.session?.user || null));
  }, []);

  useEffect(() => {
    if (!user?.id) return undefined;
    let live = true;
    (async () => {
      // A PostgREST builder is a thenable, not a real Promise, so wrap it
      // (Promise.resolve adopts it) before adding a rejection handler.
      const safe = (q) => Promise.resolve(q).then((r) => r, () => ({ data: null }));
      const [{ data: prof }, { data: cvRow }] = await Promise.all([
        safe(supabase.from("profiles").select("plan, full_name, visa_status, phone").eq("id", user.id).maybeSingle()),
        safe(supabase.from("cvs").select("cv_data").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(1).maybeSingle()),
      ]);
      if (!live) return;
      setProfile(prof || null);
      setCvBlob(cvRow?.cv_data || null);
      if (prof?.visa_status) setVisaStatus(prof.visa_status);
    })();
    return () => { live = false; };
  }, [user?.id]);

  // Job + the two computable, truthful employer signals.
  useEffect(() => {
    if (!supabase || !jobId) return undefined;
    let live = true;
    (async () => {
      try {
        const { data: rows } = await supabase
          .from("jobs").select("*").eq("id", jobId).in("status", ["active", "published"]).limit(1);
        const data = Array.isArray(rows) ? rows[0] : rows;
        if (!live) return;
        if (!data) { setNotFound(true); setLoading(false); return; }
        setJob(data);
        setLoading(false);
        // analytics only, never rendered — builder is a thenable, so guard with Promise.resolve
        Promise.resolve(supabase.rpc("increment_job_views", { p_job_id: jobId })).then(() => {}, () => {});

        // Verified + authoritative name from the public view (only exposes
        // user_id/verified/company_name). "Roles open now" from the public
        // jobs table. Both truthful; anything unreadable simply hides.
        try {
          const { data: hp } = await supabase.from("hr_public_profiles").select("verified, company_name").eq("user_id", data.hr_id).maybeSingle();
          if (live && hp) { setVerified(!!hp.verified); setCompanyName(hp.company_name || null); }
        } catch { /* pre-migration: no badge, safe default */ }
        try {
          const { count } = await supabase.from("jobs").select("id", { count: "exact", head: true }).eq("hr_id", data.hr_id).eq("source", "hr_portal").in("status", ["active", "published"]);
          if (live) setOpenRoles(count ?? null);
        } catch { /* omit rather than fake */ }
      } catch {
        if (live) { setNotFound(true); setLoading(false); }
      }
    })();
    return () => { live = false; };
  }, [jobId]);

  // Already applied? (+ cooldown)
  useEffect(() => {
    if (!supabase || !user?.id || !job?.id) return undefined;
    let live = true;
    (async () => {
      const { data } = await supabase.from("applications").select("id, cooldown_expires_at, applied_at").eq("candidate_id", user.id).eq("job_id", job.id).maybeSingle();
      if (!live || !data) return;
      setExistingApp(data);
      if (data.cooldown_expires_at && new Date(data.cooldown_expires_at) > new Date()) {
        setCooldownDays(Math.ceil((new Date(data.cooldown_expires_at).getTime() - Date.now()) / 86400000));
      }
    })();
    return () => { live = false; };
  }, [user?.id, job?.id]);

  const hasCv = !!cvBlob;
  const needsVisa = job ? roleNeedsVisa(job) : false;
  const company = companyName || job?.company || "the employer";

  const easyMatch = useMemo(() => {
    if (!job || !cvBlob) return null;
    try { return scoreApplicationStopgap({ jobRequirements: job.requirements, candidateCv: cvBlob })?.score ?? null; } catch { return null; }
  }, [job, cvBlob]);

  const send = async (isEasyApply) => {
    if (sending) return;
    setSending(true);
    setSendError(null);
    const res = await applyToJob(supabase, {
      user, job,
      visaStatus: needsVisa ? visaStatus : "",
      cvFile: isEasyApply ? null : cvFile,
      cvFilename: isEasyApply ? "" : cvFilename,
      existingApp: existingApp && cooldownDays === 0 ? existingApp : null,
      isEasyApply,
    });
    setSending(false);
    // Honest failure, but never leak an internal error string onto a candidate screen. Keep the sheet + every value.
    if (!res.ok) { setSendError("We could not send that just now. Please try again."); return; }
    setSentScore(res.score ?? easyMatch);
    setPhase("sent");
  };

  // Post-auth replay: came back from /auth with an intent for this job →
  // send with the saved CV (Easy Apply). Single shot. The uploaded File
  // cannot survive sessionStorage, so a replayed manual carries no file
  // (known limitation) — Easy Apply covers the common case.
  useEffect(() => {
    if (replayedRef.current) return;
    if (!replayIntent || !user?.id || !job?.id) return;
    if (existingApp && cooldownDays > 0) return;
    if (!hasCv) return; // nothing to auto-send; leave them on the no-CV path
    replayedRef.current = true;
    Promise.resolve().then(() => send(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replayIntent, user?.id, job?.id, hasCv, existingApp, cooldownDays]);

  const goBack = () => { navigate("/jobs"); };

  const signInToApply = () => {
    try {
      saveApplyIntent({ jobId, form: {} });
      window.sessionStorage?.setItem(RETURN_PATH_KEY, `/jobs/${jobId}`);
    } catch { /* private mode */ }
    navigate("/auth");
  };

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (f) { setCvFile(f); setCvFilename(f.name); }
  };

  /* ── Loading / not found ── */
  if (loading) {
    return (
      <div className="jb-root">
        <TopLoadingBar active />
        <Nav user={user} profile={profile} navigate={navigate} />
        <div className="jp-center" aria-busy="true"><p>Loading the role…</p></div>
      </div>
    );
  }
  if (notFound || !job) {
    return (
      <div className="jb-root">
        <Nav user={user} profile={profile} navigate={navigate} />
        <div className="jp-center">
          <p>We could not find this role. It may have been filled or taken down.</p>
          <button type="button" className="jb-showall" onClick={goBack}>Back to all roles</button>
        </div>
      </div>
    );
  }

  const st = jobStatus(job);
  const salary = salaryText(job);
  const exp = experienceText(job);
  const requirements = Array.isArray(job.requirements) ? job.requirements : [];
  const perks = Array.isArray(job.perks) ? job.perks : [];
  const applied = !!existingApp && !forceReapply;
  const richDesc = job.description && /<[a-z][\s\S]*>/i.test(job.description);
  const candName = profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || (user?.email ? user.email.split("@")[0] : "You");

  const visaField = (
    <div className="jp-field">
      <span className="jp-fieldlabel">Your visa status</span>
      <VisaSelect value={visaStatus} onChange={setVisaStatus} isMobile={isMobile} />
    </div>
  );

  return (
    <div className="jb-root">
      <TopLoadingBar active={false} />
      <Nav user={user} profile={profile} navigate={navigate} />

      <div className="jp-page">
        <button type="button" className="jp-back" onClick={goBack}><IcBack />All roles</button>

        <div className="jp-enter" style={{ transformOrigin: origin }}>
          <div className="jp-grid">
            {/* LEFT: the role */}
            <div>
              <div className="jp-company">
                <div className="jp-company__head">
                  <span className={`jp-company__mono jb-mono--${monoIndex(company)}`}>{monogram(company)}</span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="jp-company__name-row">
                      <span className="jp-company__name">{company}</span>
                      {verified && <span className="jp-verified-badge"><IcVerified />Verified</span>}
                    </div>
                    {job.location && <div className="jp-company__addr"><IcPin />{job.location}</div>}
                  </div>
                </div>
                {openRoles != null && openRoles > 0 && (
                  <div className="jp-company__stats">
                    <span className="jp-stat"><IcBriefcase />Hiring for <b>{openRoles} {openRoles === 1 ? "role" : "roles"}</b> now</span>
                  </div>
                )}
              </div>

              <h1 className="jp-title">{job.title}</h1>
              <div className="jp-chips">
                {job.visa_sponsored && <span className="jp-chip jp-chip--visa"><IcCheck s={14} w={2.3} />Visa sponsored</span>}
                {salary && <span className="jp-chip jp-chip--salary">{salary}</span>}
                {exp && <span className="jp-chip">{exp}</span>}
                {jobTypeLabel(job) && <span className="jp-chip">{jobTypeLabel(job)}</span>}
              </div>
              <div className="jp-statusline">
                <span className={`jp-statusline__status jb-status--${st.tone}`}><span className={`jb-dot jb-dot--${st.tone}`} />{st.label}</span>
                <span className="jp-statusline__posted">{postedText(job.posted_at || job.created_at)}</span>
              </div>

              <div className="jp-divider" />
              {job.description && (
                <>
                  <h3 className="jp-h3">About the role</h3>
                  {richDesc
                    ? <div className="jp-about" dangerouslySetInnerHTML={{ __html: job.description }} />
                    : <p className="jp-about">{job.description}</p>}
                </>
              )}
              {requirements.length > 0 && (
                <>
                  <h3 className="jp-h3">What you will need</h3>
                  <ul className="jp-reqs">
                    {requirements.map((r, i) => (<li key={i} className="jp-req"><IcCheck s={16} w={2.2} />{r}</li>))}
                  </ul>
                </>
              )}
              {perks.length > 0 && (
                <>
                  <h3 className="jp-h3">What they offer</h3>
                  <div className="jp-perks">{perks.map((p, i) => (<span key={i} className="jp-perk">{p}</span>))}</div>
                </>
              )}
            </div>

            {/* RIGHT: sticky apply */}
            <aside className="jp-aside">
              <div className="jp-panel">
                {applied ? (
                  <div className="jp-applied">
                    <div className="jp-applied__ic"><IcCheck s={23} w={2.5} /></div>
                    <h3 className="jp-applied__title">You already applied</h3>
                    <p className="jp-applied__line">Applied {daysAgoText(existingApp.applied_at)}. {company} has your CV, there is nothing more to do.</p>
                    <div className="jp-applied__note">
                      {cooldownDays > 0 ? `You can reapply in ${cooldownDays} ${cooldownDays === 1 ? "day" : "days"} if your CV changes` : "You can reapply if your CV changes"}
                    </div>
                    {cooldownDays === 0 && <button type="button" className="jp-applied__reapply" onClick={() => { setForceReapply(true); setPhase("decide"); }}>Reapply now</button>}
                  </div>
                ) : phase === "sent" ? (
                  <div className="jp-sent">
                    <div className="jp-sent__ic"><IcCheck s={26} w={2.6} /></div>
                    <h3 className="jp-sent__title">You are in the pipeline</h3>
                    <p className="jp-sent__line">{company}&apos;s hiring team will see your application and reply by WhatsApp or email within 3 working days.</p>
                    <p className="jp-sent__wa">We will WhatsApp you the moment they respond.</p>
                    {sentScore != null && (
                      <div className="jp-conv">
                        <p>Your CV scored <b>{sentScore}%</b> against this role. See what to fix to rank higher.</p>
                        <button type="button" onClick={() => navigate(user ? "/dashboard" : "/auth")}>View my ATS score</button>
                      </div>
                    )}
                  </div>
                ) : phase === "easyConfirm" ? (
                  <div className="jp-panel__inner">
                    <h3 className="jp-panel__title">Send to {company}</h3>
                    <p className="jp-panel__lede">{needsVisa ? "Confirm and send. We already have everything except your visa status." : "Confirm and send. We already have everything we need."}</p>
                    <div className="jp-idcard">
                      <div className="jp-idrow">
                        <span className="jp-avatar">{monogram(candName)}</span>
                        <div style={{ minWidth: 0 }}>
                          <div className="jp-idrow__name">{candName}</div>
                          <div className="jp-idrow__sub">{user?.email}</div>
                        </div>
                      </div>
                      <div className="jp-idrow jp-idrow--file">
                        <div className="jp-idrow__file">
                          <IcFile />
                          <div style={{ minWidth: 0 }}>
                            <div className="jp-idrow__name">Your CVPassport CV</div>
                            <div className="jp-idrow__sub">Sends as is</div>
                          </div>
                        </div>
                        {easyMatch != null && <span className={`jb-matchchip jb-matchchip--${matchTone(easyMatch)}`}>{easyMatch}% match</span>}
                      </div>
                    </div>
                    {needsVisa ? visaField : <div className="jp-novisa">Nothing else needed for this role. Your details are ready to send.</div>}
                    {sendError && <p className="jp-err">{sendError}</p>}
                    <button type="button" className="jp-primary" disabled={sending || (needsVisa && !visaStatus)} onClick={() => send(true)}>{sending ? "Sending…" : sendError ? "Try again" : "Send application"}</button>
                    <button type="button" className="jp-back-mini" onClick={() => { setPhase("decide"); setSendError(null); }}>Back</button>
                  </div>
                ) : phase === "manual" ? (
                  <div className="jp-panel__inner">
                    <h3 className="jp-panel__title">Apply to {company}</h3>
                    <p className="jp-panel__lede">{user ? <>Applying as <b>{candName}</b>. {needsVisa ? "We only need your CV and visa status." : "We only need your CV."}</> : <>{needsVisa ? "We need your CV and visa status." : "We need your CV."}</>}</p>
                    <label className={`jp-dropzone${cvFilename ? " jp-dropzone--has" : ""}`}>
                      <input type="file" accept=".pdf,.doc,.docx" style={{ display: "none" }} onChange={onFile} />
                      {cvFilename ? <span className="jp-dropzone__file">{cvFilename}</span> : (<><IcUpload /><span className="jp-dropzone__hint">Click to upload CV, PDF or DOC</span></>)}
                    </label>
                    {needsVisa ? visaField : <div className="jp-novisa">Nothing else needed for this role. Your details are ready to send.</div>}
                    {sendError && <p className="jp-err">{sendError}</p>}
                    <button type="button" className="jp-primary" disabled={sending || !cvFile || (needsVisa && !visaStatus)} onClick={() => send(false)}>{sending ? "Sending…" : sendError ? "Try again" : "Send application"}</button>
                    <button type="button" className="jp-back-mini" onClick={() => { setPhase("decide"); setSendError(null); }}>Back</button>
                  </div>
                ) : (
                  // decide
                  <div className="jp-panel__inner">
                    <div className="jp-promise">
                      <IcBolt s={17} />
                      <p>Upload your CV, we will check your ATS match before the recruiter even opens your application.</p>
                    </div>
                    {!user ? (
                      <>
                        <button type="button" className="jp-primary" onClick={signInToApply}>Sign in to apply in one tap</button>
                        <p className="jp-hint">Sign in and your saved CV and details send automatically. We keep your place on this role.</p>
                        <div className="jp-or"><span>or</span></div>
                        <button type="button" className="jp-secondary" onClick={() => setPhase("manual")}>Apply with a CV upload</button>
                      </>
                    ) : hasCv ? (
                      <>
                        <button type="button" className="jp-primary" onClick={() => setPhase("easyConfirm")}><IcBolt s={17} />Apply with your CVPassport CV</button>
                        <p className="jp-hint">One tap. Your saved CV, name and email are ready, nothing to retype.</p>
                        <div className="jp-or"><span>or</span></div>
                        <button type="button" className="jp-secondary" onClick={() => setPhase("manual")}>Upload a different CV</button>
                      </>
                    ) : (
                      <>
                        <button type="button" className="jp-primary" onClick={() => setPhase("manual")}><IcUpload />Upload your CV to apply</button>
                        <p className="jp-hint">No CV on file yet. Upload once and future roles are one tap.</p>
                      </>
                    )}
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}

function Nav({ user, profile, navigate }) {
  const greetingName = profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || (user?.email ? user.email.split("@")[0] : "");
  return (
    <header className="jb-nav">
      <a href="/" className="jb-wordmark" aria-label="CVPassport home">
        <img className="jb-wordmark__mark" src="/assets/brand/logo512.png" alt="" aria-hidden="true" />
        <span className="jb-wordmark__text">CV<span>Passport</span></span>
      </a>
      <div className="jb-nav__center" />
      <div className="jb-nav__right">
        {user ? (
          <UserMenu email={user.email || ""} name={greetingName} plan={profile?.plan} switchTo={{ label: "Switch to HR", path: "/employer/jobs" }} settingsPath="/account" theme="light" />
        ) : (
          <button type="button" className="jb-signin" onClick={() => navigate("/auth")}>Sign in</button>
        )}
      </div>
    </header>
  );
}
