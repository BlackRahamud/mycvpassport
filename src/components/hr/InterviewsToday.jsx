// =============================================================
// src/components/hr/InterviewsToday.jsx
//
// Interviews today — the flight board on the Jobs landing (interview
// kit frames 1e / 1f / 1r). Five columns and nothing else: Time,
// Candidate, Job, Status, Start. Start opens the live companion with
// that interview's kit loaded, one click from landing to live; if the
// kit is not made yet Start still works and the companion opens on the
// calm generating state. Finished rows dim and flip to Notes.
//
// Empty is an invitation, never a blank table: with people waiting at
// To interview it shows the real count and a button to them; with
// nothing to show at all it renders nothing.
// =============================================================

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { supabase } from "../../appSupabaseClient";
import { formatTimeIn } from "../../lib/hr/interviewTz";
import "./interviewsToday.css";

const EASE = [0.4, 0, 0.2, 1];

const RATING_WORD = { strong_yes: "Strong yes", yes: "Yes", mixed: "Mixed", no: "No" };

function dayBounds(now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getTime() + 24 * 3600 * 1000);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

function kitReady(iv) {
  const qs = iv?.kit?.questions;
  return Array.isArray(qs) && qs.length > 0;
}

export default function InterviewsToday({ user }) {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const [rows, setRows] = useState(null); // null = loading
  const [readyCount, setReadyCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return undefined;
    let live = true;
    (async () => {
      const { startIso, endIso } = dayBounds();
      let { data, error } = await supabase
        .from("interviews")
        .select("id, scheduled_at, duration_min, status, kit, rating, application_id, job_id, applications(candidate_name), jobs(title)")
        .eq("hr_id", user.id)
        .gte("scheduled_at", startIso)
        .lt("scheduled_at", endIso)
        .order("scheduled_at", { ascending: true });
      if (error) {
        // Pre-039 database: same board without the kit columns.
        ({ data } = await supabase
          .from("interviews")
          .select("id, scheduled_at, duration_min, status, application_id, job_id, applications(candidate_name), jobs(title)")
          .eq("hr_id", user.id)
          .gte("scheduled_at", startIso)
          .lt("scheduled_at", endIso)
          .order("scheduled_at", { ascending: true }));
      }
      if (!live) return;
      const list = data || [];
      setRows(list);
      if (list.length === 0) {
        const { count } = await supabase
          .from("applications")
          .select("id", { count: "exact", head: true })
          .eq("status", "ready");
        if (live) setReadyCount(count || 0);
      }
    })();
    return () => { live = false; };
  }, [user?.id]);

  const dateLine = useMemo(() => {
    const now = new Date();
    return `${now.toLocaleDateString("en-GB", { weekday: "long" })} ${now.getDate()} ${now.toLocaleDateString("en-GB", { month: "long" })}`;
  }, []);

  // Nothing scheduled and nobody waiting: stay quiet, never a blank table.
  if (!user?.id || rows === null) return null;
  if (rows.length === 0 && readyCount === 0) return null;

  return (
    <motion.section
      className="itb-card"
      aria-label="Interviews today"
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: EASE, delay: 0.04 }}
    >
      {rows.length === 0 ? (
        <div className="itb-empty">
          <span className="itb-empty__icon" aria-hidden="true">{"\u{1F5D3}\u{FE0F}"}</span>
          <div className="itb-empty__title">No interviews today</div>
          <p className="itb-empty__sub">
            You have {readyCount} {readyCount === 1 ? "person" : "people"} waiting at To interview.
            Pick a time with them and the board fills itself.
          </p>
          <button type="button" className="itb-empty__cta" onClick={() => navigate("/employer/candidates")}>
            See who is ready to interview
          </button>
        </div>
      ) : (
        <>
          <div className="itb-head">
            <span className="itb-head__title">Interviews today</span>
            <span className="itb-head__date">{dateLine}</span>
          </div>
          <div className="itb-cols" aria-hidden="true">
            <span>Time</span><span>Candidate</span><span>Job</span><span>Status</span><span />
          </div>
          <div className="itb-rows">
            {rows.map((iv, i) => {
              const finished = iv.status !== "scheduled";
              const candidate = iv.applications?.candidate_name || "Candidate";
              const jobTitle = iv.jobs?.title || "";
              const time = formatTimeIn(new Date(iv.scheduled_at), undefined);
              let status;
              if (iv.status === "completed") {
                status = (
                  <span className="itb-status itb-status--done">
                    ✓ Done{iv.rating && RATING_WORD[iv.rating] ? `, rated ${RATING_WORD[iv.rating]}` : ""}
                  </span>
                );
              } else if (iv.status === "no_show") {
                status = <span className="itb-status itb-status--done">Did not join</span>;
              } else if (iv.status === "cancelled") {
                status = <span className="itb-status itb-status--done">Cancelled</span>;
              } else if (kitReady(iv)) {
                status = <span className="itb-status itb-status--ready"><span className="itb-dot itb-dot--green" aria-hidden="true" /> Kit ready</span>;
              } else {
                status = <span className="itb-status itb-status--pending"><span className="itb-dot itb-dot--amber" aria-hidden="true" /> Kit not made yet</span>;
              }
              return (
                <motion.div
                  key={iv.id}
                  className={`itb-row${finished ? " itb-row--done" : ""}`}
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.28, ease: EASE, delay: reduce ? 0 : 0.06 + Math.min(i * 0.04, 0.28) }}
                >
                  <span className="itb-row__time">{time}</span>
                  <span className="itb-row__who">{candidate}</span>
                  <span className="itb-row__job">{jobTitle}</span>
                  <span className="itb-row__status">{status}</span>
                  <button
                    type="button"
                    className={finished ? "itb-notes" : "itb-start"}
                    onClick={() => navigate(`/employer/interview/${iv.id}`)}
                  >
                    {finished ? "Notes" : "Start"}
                  </button>
                  {/* Mobile composition of the same row */}
                  <span className="itb-row__m">
                    <span className="itb-row__mtop">{time} · {candidate}</span>
                    <span className="itb-row__msub">{jobTitle ? `${jobTitle} · ` : ""}{status}</span>
                  </span>
                </motion.div>
              );
            })}
          </div>
        </>
      )}
    </motion.section>
  );
}
