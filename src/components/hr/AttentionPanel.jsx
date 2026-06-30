// =============================================================
// src/components/hr/AttentionPanel.jsx
//
// "Needs your attention" — four action-first triage cards at the top of the
// HR Jobs landing. Every card is wired to real data and navigates to the
// real set:
//   1. Client verdicts ready   (share_feedback on this HR's shares) - anchor
//   2. New high-match applicants (applications.ats_score >= 80)
//   3. Interviews today          (interviews.scheduled_at within today)
//   4. Pending outreach          (applicants with no whatsapp_outreach event)
//
// Reads only existing tables. Ink accent; purple is reserved for the single
// anchor card (client verdicts). A card with a zero count is non-clickable.
// =============================================================

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { supabase } from "../../appSupabaseClient";
import "./attentionPanel.css";

const EASE = [0.4, 0, 0.2, 1];

const ArrowIc = () => (<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h13M13 6l6 6-6 6" /></svg>);
const VerdictIc = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M8.5 12.5l2.5 2.5 4.5-5" /></svg>);
const TrendIc = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="3 17 9 11 13 15 21 7" /><polyline points="15 7 21 7 21 13" /></svg>);
const CalIc = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>);
const ChatIc = () => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" /></svg>);

function AttCard({ icon, label, sub, value, anchor, onClick, delay, reduce }) {
  const display = value == null ? "—" : value.toLocaleString();
  return (
    <motion.button
      type="button"
      className={`att-card${anchor ? " att-card--anchor" : ""}`}
      onClick={onClick}
      disabled={!onClick}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE, delay }}
      whileHover={reduce || !onClick ? undefined : { y: -3 }}
      whileTap={reduce || !onClick ? undefined : { scale: 0.98 }}
    >
      <span className="att-card__head">
        <span className="att-card__icon" aria-hidden="true">{icon}</span>
        {onClick && <span className="att-card__arrow"><ArrowIc /></span>}
      </span>
      <span className="att-card__value">{display}</span>
      <span className="att-card__label">{label}</span>
      <span className="att-card__sub">{sub}</span>
    </motion.button>
  );
}

function todayBounds() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

export default function AttentionPanel({ user }) {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const [data, setData] = useState(null); // null = loading

  useEffect(() => {
    const uid = user?.id;
    if (!uid) return undefined;
    let live = true;
    (async () => {
      const { start, end } = todayBounds();
      try {
        const [verdictRes, highCntRes, highLatestRes, ivTodayRes, appsRes, outreachRes] = await Promise.all([
          // 1. Client verdicts — RLS scopes share_feedback to this HR's own shares.
          supabase.from("share_feedback")
            .select("id, created_at, candidate_shares!inner(application_id)")
            .order("created_at", { ascending: false }).limit(200),
          // 2. High-match count (80+)
          supabase.from("applications").select("id", { count: "exact", head: true })
            .eq("hr_id", uid).gte("ats_score", 80),
          // 2b. Latest high-match, for the navigation target
          supabase.from("applications").select("job_id")
            .eq("hr_id", uid).gte("ats_score", 80).order("applied_at", { ascending: false }).limit(1).maybeSingle(),
          // 3. Interviews today
          supabase.from("interviews").select("id, job_id")
            .eq("hr_id", uid).eq("status", "scheduled").gte("scheduled_at", start).lt("scheduled_at", end)
            .order("scheduled_at", { ascending: true }),
          // 5. Applications (for pending-outreach + verdict job lookup)
          supabase.from("applications").select("id, job_id, candidate_id, applied_at")
            .eq("hr_id", uid).order("applied_at", { ascending: false }).limit(2000),
          // 6. Outreached candidate ids
          supabase.from("candidate_events").select("candidate_id")
            .eq("hr_id", uid).eq("event_type", "whatsapp_outreach").limit(5000),
        ]);
        if (!live) return;

        const apps = appsRes.data || [];
        const appJob = new Map(apps.map((a) => [a.id, a.job_id]));

        // Verdicts: distinct applications with feedback. Target = the most
        // recent verdict's job (look it up if it's outside the apps page).
        const verdictRows = verdictRes.data || [];
        const verdictAppIds = [...new Set(verdictRows.map((r) => r.candidate_shares?.application_id).filter(Boolean))];
        const latestVerdictApp = verdictRows[0]?.candidate_shares?.application_id || null;
        let verdictJobId = latestVerdictApp ? appJob.get(latestVerdictApp) : null;
        if (latestVerdictApp && !verdictJobId) {
          const { data: vApp } = await supabase.from("applications").select("job_id").eq("id", latestVerdictApp).maybeSingle();
          if (!live) return;
          verdictJobId = vApp?.job_id || null;
        }

        // Pending outreach: applicants whose candidate has no outreach event.
        const outreached = new Set((outreachRes.data || []).map((e) => e.candidate_id).filter(Boolean));
        const pending = apps.filter((a) => a.candidate_id && !outreached.has(a.candidate_id));

        const ivToday = ivTodayRes.data || [];

        setData({
          verdictCount: verdictAppIds.length,
          verdictJobId,
          highCount: highCntRes.count ?? 0,
          highJobId: highLatestRes.data?.job_id || null,
          ivTodayCount: ivToday.length,
          ivTodayJobId: ivToday[0]?.job_id || null,
          pendingCount: pending.length,
          pendingJobId: pending[0]?.job_id || null,
        });
      } catch (_e) {
        if (live) setData({ verdictCount: null, verdictJobId: null, highCount: null, highJobId: null, ivTodayCount: null, ivTodayJobId: null, pendingCount: null, pendingJobId: null });
      }
    })();
    return () => { live = false; };
  }, [user?.id]);

  const go = (jobId) => () => { if (jobId) navigate(`/hr/jobs/${jobId}`); };
  const clickable = (count, jobId) => (count && jobId ? go(jobId) : undefined);

  const cards = [
    { key: "verdicts", anchor: true, icon: <VerdictIc />, label: "Client verdicts ready", sub: "clients reviewed your candidates", value: data ? data.verdictCount : null, onClick: data ? clickable(data.verdictCount, data.verdictJobId) : undefined },
    { key: "highmatch", icon: <TrendIc />, label: "New high-match applicants", sub: "80+ matches to review", value: data ? data.highCount : null, onClick: data ? clickable(data.highCount, data.highJobId) : undefined },
    { key: "interviews", icon: <CalIc />, label: "Interviews today", sub: "scheduled for today", value: data ? data.ivTodayCount : null, onClick: data ? clickable(data.ivTodayCount, data.ivTodayJobId) : undefined },
    { key: "outreach", icon: <ChatIc />, label: "Pending outreach", sub: "applicants with no message yet", value: data ? data.pendingCount : null, onClick: data ? clickable(data.pendingCount, data.pendingJobId) : undefined },
  ];

  return (
    <section className="att-root" aria-label="Needs your attention">
      <h2 className="att-title">Needs your attention</h2>
      <div className="att-cards">
        {cards.map((c, i) => (
          <AttCard key={c.key} {...c} delay={0.04 + i * 0.05} reduce={reduce} />
        ))}
      </div>
    </section>
  );
}
