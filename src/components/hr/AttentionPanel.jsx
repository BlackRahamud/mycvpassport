// =============================================================
// src/components/hr/AttentionPanel.jsx
//
// "Needs your attention" — action-first section at the top of the HR
// Jobs landing. Clickable count cards (head:true counts) + an upcoming
// interviews list with inline status-flip actions. Reads existing tables
// only (applications, interviews, jobs). Ink accent, light theme.
// =============================================================

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { supabase } from "../../appSupabaseClient";
import { InterviewStatusActions } from "./ScheduleInterviewModal";
import "./attentionPanel.css";

const EASE = [0.4, 0, 0.2, 1];
const NEW_STATUSES = ["submitted", "viewed", "new"];

const ArrowIc = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" /></svg>);
const CalIc = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>);

function fmtWhen(s) {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

function AttCard({ label, sub, value, onClick, disabled }) {
  const display = value == null ? "—" : value.toLocaleString();
  return (
    <button type="button" className="att-card" onClick={onClick} disabled={disabled || !onClick}>
      <span className="att-card__top">
        <span className="att-card__label">{label}</span>
        <span className="att-card__arrow"><ArrowIc /></span>
      </span>
      <span className="att-card__value">{display}</span>
      {sub && <span className="att-card__sub">{sub}</span>}
    </button>
  );
}

export default function AttentionPanel({ user }) {
  const reduce = useReducedMotion();
  const navigate = useNavigate();

  const [data, setData] = useState(null); // null = loading
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const uid = user?.id;
    if (!uid) return undefined;
    let live = true;
    (async () => {
      const nowIso = new Date().toISOString();
      try {
        const [newCnt, shortCnt, upCnt, latestNew, latestShort, upRes] = await Promise.all([
          supabase.from("applications").select("id", { count: "exact", head: true }).eq("hr_id", uid).in("status", NEW_STATUSES),
          supabase.from("applications").select("id", { count: "exact", head: true }).eq("hr_id", uid).eq("status", "shortlisted"),
          supabase.from("interviews").select("id", { count: "exact", head: true }).eq("hr_id", uid).eq("status", "scheduled").gte("scheduled_at", nowIso),
          supabase.from("applications").select("job_id").eq("hr_id", uid).in("status", NEW_STATUSES).order("applied_at", { ascending: false }).limit(1).maybeSingle(),
          supabase.from("applications").select("job_id").eq("hr_id", uid).eq("status", "shortlisted").order("applied_at", { ascending: false }).limit(1).maybeSingle(),
          supabase.from("interviews").select("id, application_id, job_id, candidate_id, scheduled_at, duration_min, meeting_link, status").eq("hr_id", uid).eq("status", "scheduled").gte("scheduled_at", nowIso).order("scheduled_at", { ascending: true }).limit(6),
        ]);
        if (!live) return;

        const upcoming = upRes.data || [];
        // Enrich upcoming rows with candidate name + job title.
        const appIds = [...new Set(upcoming.map((u) => u.application_id).filter(Boolean))];
        const jobIds = [...new Set(upcoming.map((u) => u.job_id).filter(Boolean))];
        const [appsRows, jobsRows] = await Promise.all([
          appIds.length ? supabase.from("applications").select("id, candidate_name").in("id", appIds) : Promise.resolve({ data: [] }),
          jobIds.length ? supabase.from("jobs").select("id, title").in("id", jobIds) : Promise.resolve({ data: [] }),
        ]);
        if (!live) return;
        const nameById = new Map((appsRows.data || []).map((a) => [a.id, a.candidate_name]));
        const titleById = new Map((jobsRows.data || []).map((j) => [j.id, j.title]));

        setData({
          newCount: newCnt.count ?? 0,
          shortlistCount: shortCnt.count ?? 0,
          upcomingCount: upCnt.count ?? 0,
          newJobId: latestNew.data?.job_id || null,
          shortlistJobId: latestShort.data?.job_id || null,
          upcoming: upcoming.map((u) => ({
            ...u,
            candidate_name: nameById.get(u.application_id) || "Candidate",
            job_title: titleById.get(u.job_id) || "Role",
          })),
        });
      } catch (_e) {
        if (live) setData({ newCount: null, shortlistCount: null, upcomingCount: null, newJobId: null, shortlistJobId: null, upcoming: [] });
      }
    })();
    return () => { live = false; };
  }, [user?.id, tick]);

  const goJob = (jobId) => { if (jobId) navigate(`/hr/jobs/${jobId}`); };

  return (
    <motion.section
      className="att-root"
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: EASE }}
      aria-label="Needs your attention"
    >
      <h2 className="att-title">Needs your attention</h2>

      <div className="att-cards">
        <AttCard
          label="New applicants to review"
          value={data ? data.newCount : null}
          onClick={data?.newJobId ? () => goJob(data.newJobId) : undefined}
        />
        <AttCard
          label="Awaiting action"
          sub="Shortlisted"
          value={data ? data.shortlistCount : null}
          onClick={data?.shortlistJobId ? () => goJob(data.shortlistJobId) : undefined}
        />
        <AttCard
          label="Upcoming interviews"
          value={data ? data.upcomingCount : null}
          onClick={data?.upcoming?.[0]?.job_id ? () => goJob(data.upcoming[0].job_id) : undefined}
        />
      </div>

      {data && data.upcoming.length > 0 && (
        <div className="att-upcoming">
          <div className="att-upcoming__head"><CalIc /> Upcoming interviews</div>
          {data.upcoming.map((iv) => (
            <div key={iv.id} className="att-iv">
              <button type="button" className="att-iv__main" onClick={() => goJob(iv.job_id)}>
                <span className="att-iv__name">{iv.candidate_name}</span>
                <span className="att-iv__meta">{iv.job_title} · {fmtWhen(iv.scheduled_at)}{iv.duration_min ? ` · ${iv.duration_min} min` : ""}</span>
                {iv.meeting_link && <span className="att-iv__link">{iv.meeting_link}</span>}
              </button>
              <div className="att-iv__actions">
                <InterviewStatusActions interview={iv} hrId={user?.id} onChanged={() => setTick((t) => t + 1)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.section>
  );
}
