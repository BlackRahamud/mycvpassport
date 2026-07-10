// =============================================================
// src/pages/hr/Import/ImportPage.jsx
//
// /employer/import — the rail-level entry point for bulk CV import.
// One question ("Where should these candidates go?"), answered by the
// shared ImportTargetPicker; the existing BulkCvImport modal then does
// everything else. The per-job import on the pipeline and the
// Candidates page "Add candidate" flow are unchanged — this page only
// adds a global way in.
//
// After a successful import the recruiter lands where the candidates
// now live: the job's pipeline, or Candidates for a talent pool.
// =============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, useReducedMotion } from "framer-motion";
import { supabase } from "../../../appSupabaseClient";
import BulkCvImport from "../../../components/hr/BulkCvImport";
import ImportTargetPicker from "../../../components/hr/ImportTargetPicker";
import "../PostJob/postJob.css";   // :root --pj-* tokens
import "../Jobs/jobPipeline.css";  // .jpp-root --hjl-* ink tokens (BulkCvImport styles cascade from these)
import "./importPage.css";

const EASE = [0.4, 0, 0.2, 1];

export default function ImportPage() {
  const reduce = useReducedMotion();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [jobs, setJobs] = useState(null); // null = loading
  const [error, setError] = useState(null);
  // Where the batch goes: a job row, or { isPool, title, market } for a new pool.
  const [target, setTarget] = useState(null);
  const importedRef = useRef(false);

  useEffect(() => {
    let live = true;
    supabase.auth.getUser().then(({ data }) => { if (live) setUser(data?.user || null); });
    return () => { live = false; };
  }, []);

  const loadJobs = useCallback(async (uid) => {
    setError(null);
    try {
      // Same shape the Candidates page fetches: description/skills/requirements
      // ride along because BulkCvImport scores each CV against them.
      const { data, error: err } = await supabase
        .from("jobs")
        .select("id, title, market, status, kind, description, skills, requirements")
        .eq("hr_id", uid)
        .eq("source", "hr_portal")
        .order("created_at", { ascending: false })
        .limit(500);
      if (err) throw err;
      setJobs((data || []).filter((j) => j.status !== "closed"));
    } catch (e) {
      setJobs([]);
      setError("Couldn't load your jobs — check your connection and try again.");
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    setJobs(null);
    loadJobs(user.id);
  }, [user?.id, loadJobs]);

  // BulkCvImport fires onImported (batch committed) before onClose, so the
  // flag is set by the time we decide where to send the recruiter.
  const handleImporterClose = useCallback(() => {
    const t = target;
    setTarget(null);
    if (importedRef.current && t) {
      importedRef.current = false;
      navigate(t.isPool ? "/employer/candidates" : `/employer/jobs/${t.id}`);
    }
  }, [target, navigate]);

  return (
    <div className="jpp-root imp-root">
      <Helmet><title>Import CVs · CVPassport</title></Helmet>
      <main className="imp-page">
        <motion.header
          className="imp-head"
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: EASE }}
        >
          <h1 className="imp-head__title">Import CVs</h1>
          <p className="imp-head__sub">
            Upload the CVs you already have — we read each one and add the candidates for you.
          </p>
        </motion.header>

        <motion.section
          className="imp-card"
          aria-label="Choose where the candidates go"
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: EASE, delay: reduce ? 0 : 0.06 }}
        >
          <h2 className="imp-card__q">Where should these candidates go?</h2>
          {jobs === null ? (
            <p className="imp-status" role="status">Loading your jobs…</p>
          ) : error ? (
            <p className="imp-status imp-status--err">
              {error}{" "}
              <button type="button" className="imp-retry" onClick={() => { setJobs(null); loadJobs(user.id); }}>
                Retry
              </button>
            </p>
          ) : (
            <ImportTargetPicker
              jobs={jobs}
              onPickJob={(j) => setTarget(j)}
              onCreatePool={(name, mkt) => setTarget({ isPool: true, id: null, title: name, market: mkt })}
            />
          )}
        </motion.section>
      </main>

      <BulkCvImport
        open={!!target && !!user?.id}
        jobId={target?.isPool ? null : target?.id}
        job={target?.isPool ? null : target}
        poolName={target?.isPool ? target.title : null}
        market={target?.isPool ? target.market : (target?.market || null)}
        hrId={user?.id}
        onClose={handleImporterClose}
        onImported={() => { importedRef.current = true; }}
      />
    </div>
  );
}
