// =============================================================
// src/pages/hr/Interview/InterviewCompanionPage.jsx
//
// The page that hosts the live companion beside her own video window.
// Route: /employer/interview/:id — inside RequireRecruiter but OUTSIDE
// HrShell (same rationale as review mode: the companion carries its own
// pinned bottom bar, which would collide with the shell's mobile tab
// bar, and she narrows this window to a third of the screen).
//
// The page only loads (interview → application → job) and sizes the
// column; ALL interview behaviour lives in the self-contained
// <InterviewCompanion>, which the floating always-on-top phase will
// reuse unchanged.
// =============================================================

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../../../appSupabaseClient";
import InterviewCompanion from "../../../components/hr/InterviewCompanion";
import { loadInterviewById } from "../../../lib/hr/interviewKit";
import "../PostJob/postJob.css"; // :root tokens (--pj-*)
import "../Jobs/jobPipeline.css"; // jpp-modal shell for the reschedule form
import "./interviewCompanion.css";

export default function InterviewCompanionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  // ?float=1: this page IS the float fallback popup (no Document PiP on
  // this browser) — no back bar, full-bleed companion, no Float button.
  const isFloatWindow = typeof window !== "undefined"
    && new URLSearchParams(window.location.search).has("float");
  const [user, setUser] = useState(null);
  const [interview, setInterview] = useState(null);
  const [application, setApplication] = useState(null);
  const [job, setJob] = useState(null);
  const [state, setState] = useState("loading"); // loading | ready | missing

  useEffect(() => {
    let live = true;
    (async () => {
      const { data: { user: u } = {} } = await supabase.auth.getUser();
      if (!live) return;
      setUser(u || null);
      if (!u || !id) { setState("missing"); return; }

      const iv = await loadInterviewById(id);
      if (!live) return;
      if (!iv) { setState("missing"); return; }
      setInterview(iv);

      const [{ data: app }, { data: jrow }] = await Promise.all([
        iv.application_id
          ? supabase
            .from("applications")
            .select("id, job_id, candidate_id, candidate_name, candidate_email, candidate_phone, cv_snapshot, ats_score, ai_verdict, score_source, source, status")
            .eq("id", iv.application_id)
            .maybeSingle()
          : Promise.resolve({ data: null }),
        iv.job_id
          ? supabase
            .from("jobs")
            .select("id, title, location, market, description, skills, requirements")
            .eq("id", iv.job_id)
            .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      if (!live) return;
      setApplication(app || null);
      setJob(jrow || null);
      setState("ready");
    })();
    return () => { live = false; };
  }, [id]);

  return (
    <div className={`icp-root${isFloatWindow ? " icp-root--float" : ""}`}>
      {!isFloatWindow && (
        <div className="icp-top">
          <button type="button" className="icp-back" onClick={() => navigate("/employer/jobs")}>
            ← Today's board
          </button>
        </div>
      )}
      <div className="icp-stage">
        {state === "loading" && (
          <div className="icp-note" role="status">Opening the interview…</div>
        )}
        {state === "missing" && (
          <div className="icp-note">
            This interview could not be found. It may belong to another account.
            <button type="button" className="icp-note__link" onClick={() => navigate("/employer/jobs")}>Back to your jobs</button>
          </div>
        )}
        {state === "ready" && (
          <div className="icp-frame">
            <InterviewCompanion
              interview={interview}
              application={application}
              job={job}
              hrId={user?.id}
              hrEmail={user?.email}
              floatWindow={isFloatWindow}
              onExit={() => (isFloatWindow ? window.close() : navigate("/employer/jobs"))}
            />
          </div>
        )}
      </div>
    </div>
  );
}
