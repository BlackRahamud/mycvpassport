// =============================================================
// src/pages/hr/Import/ImportPage.jsx
//
// /employer/import — the rail-level bulk CV import, rebuilt as a
// drop-first three-beat flow (Import CVs Canvas 1a–1f):
//
//   1. Drop zone is the hero. Drop your CVs here, or browse.
//   2. Reading. Each CV is read for real (extract → upload →
//      structure) and streams in as a candidate card.
//   3. Where should these go. Job cards (searchable) or a talent pool.
//      Picking scores every candidate against that job on add, then
//      commits the whole batch, and the confirmation opens from the
//      tapped card into the pipeline.
//
// Honest-scoring note: the design shows a fit score during reading, but
// a fit score cannot exist before a job is chosen. So this build reads
// (identity only) in beat 2 and scores on add in the scoring pass — the
// score rings fill with the real candidate_verdict number the pipeline
// then persists (036). No fabricated number is ever shown. This is the
// same backend BulkCvImport uses, driven through src/lib/hr/
// cvImportPipeline.js — nothing about parsing or scoring is rebuilt.
//
// Glass (surfaceGlass tokens) on exactly three floating surfaces: the
// sticky header, the drag-over overlay, and the progress toast. Every
// card is solid. Both themes via [data-theme] scoped --imp-* tokens.
// =============================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { supabase } from "../../../appSupabaseClient";
import ScoreRing from "../../../components/hr/ScoreRing";
import { trackHr } from "../../../lib/analytics/hrEvents";
import { bandLabel } from "../../../lib/ats/scoreBand";
import {
  MAX_BATCH, MAX_FILE_BYTES, ACCEPT,
  isSupportedFile, nameFromFile,
  readCv, scoreCv, buildRecord, commitBatch,
} from "../../../lib/hr/cvImportPipeline";
import "../../../components/hr/surfaceGlass.css";
import "../PostJob/postJob.css"; // :root --pj-* tokens (accent + font)
import "./importPage.css";

const EASE = [0.4, 0, 0.2, 1];
const FLIP_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";

/* ── icons ── */
const IcUpload = ({ s = 34 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5-5 5 5M12 5v12" />
  </svg>
);
const IcFile = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
  </svg>
);
const IcSearch = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" />
  </svg>
);
const IcBriefcase = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
  </svg>
);
const IcUsers = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" />
  </svg>
);
const IcArrow = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
const IcCheck = ({ s = 20 }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const IcAlert = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);
const IcX = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

/* ── helpers ── */
let _seq = 0;
const nextId = () => { _seq += 1; return `f${_seq}`; };

const STAGE_TEXT = {
  reading: "Reading the CV",
  uploading: "Keeping the file",
  structuring: "Building the profile",
  scoring: "Scoring the fit",
};

/* status → left-slot kind + sub line, shared by the reading and scoring
   beats so a card keeps its identity across the whole flow. */
function isWorking(status) {
  return status === "queued" || status === "reading" || status === "uploading" || status === "structuring" || status === "scoring";
}

export default function ImportPage() {
  const reduce = useReducedMotion();
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [jobs, setJobs] = useState(null); // null = loading, [] = none
  const [loadError, setLoadError] = useState(null);

  const [stage, setStage] = useState("drop"); // drop | reading | pick | scoring | done
  const [items, setItems] = useState([]);
  const [dragOver, setDragOver] = useState(false);
  const [query, setQuery] = useState("");
  const [dest, setDest] = useState(null); // { id, title, market, isPool, description, skills, requirements }
  const [result, setResult] = useState(null); // { inserted, dupes, destName, isPool, id }
  const [notice, setNotice] = useState(null);
  const [creatingPool, setCreatingPool] = useState(false);
  const [poolName, setPoolName] = useState("");
  const [poolMarket, setPoolMarket] = useState("gulf");

  const itemsRef = useRef(items);
  useEffect(() => { itemsRef.current = items; }, [items]);
  const update = useCallback((id, patch) => {
    itemsRef.current = itemsRef.current.map((it) => (it.id === id ? { ...it, ...patch } : it));
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }, []);

  const fileInputRef = useRef(null);
  const originRect = useRef(null);
  const confirmElRef = useRef(null);
  const flowStarted = useRef(false);
  const userRef = useRef(null);
  const importT0 = useRef(0);

  /* ── auth + jobs ── */
  useEffect(() => {
    let live = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!live) return;
      userRef.current = data?.user || null;
      setUser(data?.user || null);
    });
    return () => { live = false; };
  }, []);

  const loadJobs = useCallback(async (uid) => {
    setLoadError(null);
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, title, market, status, kind, description, skills, requirements")
        .eq("hr_id", uid)
        .eq("source", "hr_portal")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      setJobs((data || []).filter((j) => j.status !== "closed"));
    } catch (e) {
      setJobs([]);
      setLoadError("Couldn't load your jobs. Check your connection and try again.");
    }
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    setJobs(null);
    loadJobs(user.id);
  }, [user?.id, loadJobs]);

  // ?job=<id> deep link (from "Import candidates for this job"): the
  // destination is already known, so after reading we skip the picker and
  // add straight to that job.
  const [searchParams] = useSearchParams();
  const lockedJobId = searchParams.get("job");
  const lockedDest = useMemo(() => {
    if (!lockedJobId || !Array.isArray(jobs)) return null;
    const j = jobs.find((x) => x.id === lockedJobId);
    return j ? { ...j, isPool: j.kind === "pool" } : null;
  }, [lockedJobId, jobs]);

  /* ── file intake ── */
  // Read one CV for real: extract → upload → structure. hrId comes from a
  // ref so a batch dropped before/at first paint still lands in the right
  // storage folder.
  const readOne = useCallback(async (it) => {
    try {
      const { snapshot, path, ocr } = await readCv(it.file, {
        hrId: userRef.current?.id,
        onStage: (key) => update(it.id, { status: key }),
      });
      update(it.id, {
        status: "ready", snapshot, path, ocr, error: null,
        candidateName: snapshot?.name || nameFromFile(it.file),
      });
    } catch (err) {
      update(it.id, { status: "error", error: err?.message || "Couldn't read this file, try again.", step: err?.step || null });
    }
  }, [update]);

  const addFiles = useCallback((fileList) => {
    setNotice(null);
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;

    const accepted = [];
    const rejected = [];
    for (const file of incoming) {
      if (!isSupportedFile(file)) { rejected.push(`${file.name} is not a PDF or Word file`); continue; }
      if (file.size > MAX_FILE_BYTES) { rejected.push(`${file.name} is over 15 MB`); continue; }
      accepted.push(file);
    }
    const take = accepted.slice(0, Math.max(0, MAX_BATCH));
    const overflow = accepted.length - take.length;
    const notes = [...rejected];
    if (overflow > 0) notes.push(`${overflow} file${overflow === 1 ? "" : "s"} skipped, up to ${MAX_BATCH} CVs at a time`);
    if (notes.length) setNotice(notes.join(" · "));
    if (!take.length) return;

    const mapped = take.map((file) => ({
      id: nextId(), file, name: file.name, size: file.size,
      status: "queued", snapshot: null, path: null, ocr: false,
      score: null, verdict: null, verdictFull: null, error: null, candidateName: null,
    }));
    itemsRef.current = mapped;
    setItems(mapped);
    setStage("reading");
    // Import attempt begins (drop-zone origin). duration_ms on completion is
    // measured from here — the whole wait she sits through.
    importT0.current = (typeof performance !== "undefined" ? performance.now() : Date.now());
    trackHr("hr_import_started", { source: "drop" });
    // read sequentially — gentle on the single OCR worker and rate limits.
    (async () => {
      for (const it of mapped) {
        // eslint-disable-next-line no-await-in-loop
        await readOne(it);
      }
    })();
  }, [readOne]);

  const retryOne = useCallback((it) => { readOne({ ...it, status: "queued" }); }, [readOne]);
  const removeOne = useCallback((id) => {
    itemsRef.current = itemsRef.current.filter((it) => it.id !== id);
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  /* ── beat derivations ── */
  const readingActive = items.some((it) => isWorking(it.status));
  const readyItems = useMemo(() => items.filter((it) => it.status === "ready"), [items]);
  const errorItems = useMemo(() => items.filter((it) => it.status === "error"), [items]);
  const readCount = items.filter((it) => it.status !== "queued" && isWorking(it.status) === false).length;

  /* ── beat 3 → 4: pick a destination, score on add, commit ── */
  const commit = useCallback(async (destObj) => {
    setNotice(null);
    const ready = itemsRef.current.filter((it) => it.status === "scored" || it.status === "unscored");
    if (!ready.length) { setNotice("Nothing to add yet."); return; }
    try {
      const data = await commitBatch({
        jobId: destObj.isPool ? null : destObj.id,
        poolName: destObj.isPool ? destObj.title : null,
        market: destObj.isPool ? destObj.market : (destObj.market || null),
        records: ready.map(buildRecord),
      });
      const skipped = new Set(Array.isArray(data?.skipped_indices) ? data.skipped_indices : []);
      ready.forEach((it, i) => update(it.id, { status: skipped.has(i) ? "duplicate" : "imported" }));
      setResult({
        inserted: data?.inserted || 0,
        dupes: data?.skipped || 0,
        destName: destObj.isPool ? destObj.title : (destObj.title || "your job"),
        isPool: !!destObj.isPool,
        id: destObj.id,
      });
      const end = (typeof performance !== "undefined" ? performance.now() : Date.now());
      trackHr("hr_import_completed", {
        parsed_count: ready.length,
        failed_count: itemsRef.current.filter((it) => it.status === "error").length,
        duration_ms: Math.round(end - (importT0.current || end)),
      });
      setStage("done");
    } catch (e) {
      const msg = /row-level security|policy|function .* does not exist/i.test(String(e?.message || ""))
        ? "permissions or migrations are missing"
        : (e?.message || "please try again");
      trackHr("hr_import_failed", { reason: /row-level security|policy/i.test(String(e?.message || "")) ? "rls_or_permissions" : /function .* does not exist/i.test(String(e?.message || "")) ? "missing_migration" : "batch_rollback" });
      setNotice(`Nothing was added, the whole batch rolled back (${msg}). Nothing was charged, you can try again.`);
    }
  }, [update]);

  const runScoreAndCommit = useCallback(async (destObj) => {
    const ready = itemsRef.current.filter((it) => it.status === "ready");
    if (destObj.isPool) {
      // A talent pool has no JD to match against — honest: no score, not a
      // meaningless one. They import as pending for a later job match.
      ready.forEach((it) => update(it.id, { status: "unscored" }));
    } else {
      for (const it of ready) {
        update(it.id, { status: "scoring" });
        // eslint-disable-next-line no-await-in-loop
        const r = await scoreCv(it.snapshot, destObj);
        update(it.id, {
          status: r.score != null ? "scored" : "unscored",
          score: r.score, verdict: r.verdict, verdictFull: r.verdictFull,
        });
      }
    }
    await commit(destObj);
  }, [update, commit]);

  const pickDest = useCallback((d, e) => {
    originRect.current = e?.currentTarget ? e.currentTarget.getBoundingClientRect() : null;
    flowStarted.current = false;
    setDest(d);
    setStage("scoring");
  }, []);

  // Run the scoring+commit pass once, when the scoring beat opens.
  useEffect(() => {
    if (stage !== "scoring" || !dest || flowStarted.current) return;
    flowStarted.current = true;
    runScoreAndCommit(dest);
  }, [stage, dest, runScoreAndCommit]);

  const toPick = useCallback((e) => {
    if (lockedDest) { pickDest(lockedDest, e); return; }
    setStage("pick");
  }, [lockedDest, pickDest]);

  /* ── finish: open-from-origin ── */
  const setConfirmEl = useCallback((el) => {
    confirmElRef.current = el;
    if (!el || el.dataset.omOpened || !el.animate) return;
    el.dataset.omOpened = "1";
    if (reduce) { el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150, easing: "ease-out" }); return; }
    const o = originRect.current;
    const r = el.getBoundingClientRect();
    if (o && r.width > 0 && r.height > 0) {
      const dx = (o.left + o.width / 2) - (r.left + r.width / 2);
      const dy = (o.top + o.height / 2) - (r.top + r.height / 2);
      const sx = Math.max(o.width / r.width, 0.05);
      const sy = Math.max(o.height / r.height, 0.05);
      el.animate([
        { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, opacity: 0.3 },
        { transform: "none", opacity: 1 },
      ], { duration: 350, easing: FLIP_EASE });
    } else {
      el.animate([{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], { duration: 350, easing: "ease-out" });
    }
  }, [reduce]);

  const closeConfirm = useCallback((after) => {
    const el = confirmElRef.current;
    let called = false;
    const done = () => {
      if (called) return; called = true;
      if (el) { delete el.dataset.omOpened; if (el.getAnimations) el.getAnimations().forEach((a) => a.cancel()); }
      if (after) after();
    };
    const o = originRect.current;
    if (!el || !el.animate || reduce || !o) {
      if (el && el.animate) el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, easing: "ease-out", fill: "forwards" });
      setTimeout(done, reduce ? 10 : 150);
      return;
    }
    const r = el.getBoundingClientRect();
    const dx = (o.left + o.width / 2) - (r.left + r.width / 2);
    const dy = (o.top + o.height / 2) - (r.top + r.height / 2);
    const sx = Math.max(o.width / r.width, 0.05);
    const sy = Math.max(o.height / r.height, 0.05);
    const anim = el.animate([
      { transform: "none", opacity: 1 },
      { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, opacity: 0.2 },
    ], { duration: 350, easing: FLIP_EASE, fill: "forwards" });
    if (el.parentElement && el.parentElement.animate) el.parentElement.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, easing: "ease-out", fill: "forwards" });
    anim.onfinish = done; anim.oncancel = done;
    setTimeout(done, 420);
  }, [reduce]);

  const openDestination = useCallback(() => {
    const r = result;
    closeConfirm(() => navigate(r?.isPool ? "/employer/candidates" : `/employer/jobs/${r?.id}`));
  }, [result, closeConfirm, navigate]);

  const importMore = useCallback(() => {
    closeConfirm(() => {
      setItems([]); itemsRef.current = [];
      setStage("drop"); setDest(null); setResult(null); setQuery(""); setNotice(null);
      setCreatingPool(false); setPoolName("");
      flowStarted.current = false; originRect.current = null;
    });
  }, [closeConfirm]);

  /* ── pick beat: searchable jobs ── */
  const q = query.trim().toLowerCase();
  const filteredJobs = useMemo(() => {
    const list = Array.isArray(jobs) ? jobs : [];
    if (!q) return list;
    return list.filter((j) => (j.title || "").toLowerCase().includes(q) || (j.market || "").toLowerCase().includes(q));
  }, [jobs, q]);
  const manyJobs = (Array.isArray(jobs) ? jobs.length : 0) > 6;

  const total = items.length;
  const scoringActive = stage === "scoring" && items.some((it) => it.status === "scoring");
  const scoredCount = items.filter((it) => it.status === "scored" || it.status === "unscored" || it.status === "imported" || it.status === "duplicate").length;
  const nReady = readyItems.length || total;
  const contextSub = {
    drop: "Upload the CVs you already have and we read each one for you.",
    reading: "We read each one and add the candidate for you.",
    pick: nReady === 1 ? "Choose where this candidate goes." : `Choose where these ${nReady} candidates go.`,
    scoring: dest ? `Adding to ${dest.title}.` : "Adding your candidates.",
    done: "All added.",
  }[stage];

  /* ── card renderer, shared across reading + scoring ── */
  const renderCard = (it, i) => {
    const showRing = it.status === "scored" || it.status === "unscored" || it.status === "imported" || it.status === "duplicate";
    const scored = it.status === "scored" || (it.status === "imported" && typeof it.score === "number");
    const sub =
      it.status === "error" ? it.error
      : it.status === "ready" ? "Profile ready"
      : it.status === "unscored" ? "Added, will match to a job later"
      : it.status === "duplicate" ? "Already in this list"
      : scored ? bandLabel(it.score, "import_verdict")
      : (STAGE_TEXT[it.status] ? `${STAGE_TEXT[it.status]}…` : "Waiting…");
    return (
      <motion.div
        key={it.id}
        layout={!reduce}
        className={`imp-cand imp-cand--${it.status === "error" ? "error" : "ok"}`}
        initial={reduce ? false : { opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduce ? { opacity: 0 } : { opacity: 0, x: -8 }}
        transition={{ duration: 0.3, ease: EASE, delay: reduce ? 0 : Math.min(i, 8) * 0.04 }}
      >
        <span className="imp-cand__slot">
          {showRing ? (
            <ScoreRing
              score={typeof it.score === "number" ? it.score : 0}
              source={scored ? "import_verdict" : null}
              size={40}
              strokeWidth={4}
              duration={reduce ? 0 : 800}
              trackColor="var(--imp-ring-track)"
              textColor="var(--imp-text)"
              labelColor="var(--imp-muted)"
            />
          ) : it.status === "error" ? (
            <span className="imp-cand__badge imp-cand__badge--err"><IcAlert /></span>
          ) : it.status === "ready" ? (
            <span className="imp-cand__badge imp-cand__badge--ok"><IcCheck s={16} /></span>
          ) : (
            <span className="imp-cand__spin" aria-hidden="true" />
          )}
        </span>
        <span className="imp-cand__body">
          <span className="imp-cand__name" title={it.candidateName || it.name}>{it.candidateName || nameFromFile(it.file)}</span>
          <span className={`imp-cand__sub${it.status === "error" ? " imp-cand__sub--err" : ""}`}>{sub}{it.ocr && it.status === "ready" ? " · read with OCR" : ""}</span>
        </span>
        {it.status === "error" && (
          <span className="imp-cand__actions">
            <button type="button" className="imp-cand__retry" onClick={() => retryOne(it)}>Retry</button>
            <button type="button" className="imp-cand__remove" onClick={() => removeOne(it.id)} aria-label={`Remove ${it.name}`}><IcX /></button>
          </span>
        )}
      </motion.div>
    );
  };

  const beatTransition = { duration: reduce ? 0 : 0.28, ease: EASE };

  return (
    <div className="imp-root">
      <Helmet><title>Import CVs · CVPassport</title></Helmet>

      {/* Sticky glass header (floating surface 1 of 3) */}
      <header className="imp-head">
        <div className="imp-head__row">
          <h1 className="imp-head__title">Import CVs</h1>
          {total > 0 && stage !== "done" && (
            <span className="imp-head__count">{readyItems.length}/{total} ready</span>
          )}
        </div>
        <p className="imp-head__sub">{contextSub}</p>
      </header>

      <main className="imp-main">
        <input
          ref={fileInputRef}
          type="file"
          className="imp-file"
          accept={ACCEPT}
          multiple
          onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
        />

        <AnimatePresence mode="wait" initial={false}>
          {/* ═══════ Beat 1 · Drop zone hero ═══════ */}
          {stage === "drop" && (
            <motion.section
              key="drop"
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={beatTransition}
            >
              {lockedDest && (
                <p className="imp-locked">Adding to <strong>{lockedDest.title}</strong></p>
              )}
              <div
                className={`imp-drop${dragOver ? " imp-drop--over" : ""}`}
                onDragEnter={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={(e) => { e.preventDefault(); setDragOver(false); }}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); addFiles(e.dataTransfer?.files); }}
              >
                <span className="imp-drop__icon"><IcUpload /></span>
                <div className="imp-drop__text">
                  <div className="imp-drop__title">Drop your CVs here</div>
                  <div className="imp-drop__hint">PDF or Word files, up to {MAX_BATCH} at a time</div>
                </div>
                <div className="imp-drop__row">
                  <button type="button" className="imp-btn imp-btn--primary" onClick={() => fileInputRef.current?.click()}>Browse files</button>
                  <span className="imp-drop__or">or drag them onto this area</span>
                </div>
                {/* glass drag-over overlay (floating surface 2 of 3) */}
                {dragOver && (
                  <div className="imp-drop__over" aria-hidden="true">
                    <span className="imp-drop__over-icon"><IcUpload s={28} /></span>
                    <div className="imp-drop__over-title">Release to add your CVs</div>
                  </div>
                )}
              </div>
              {notice && <p className="imp-notice"><IcAlert /> {notice}</p>}
            </motion.section>
          )}

          {/* ═══════ Beat 2 · Reading ═══════ */}
          {stage === "reading" && (
            <motion.section
              key="reading"
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={beatTransition}
            >
              <div className="imp-panel">
                <div className="imp-panel__head">
                  <div className="imp-panel__lead">
                    <span className="imp-panel__badge">{readingActive ? <IcFile /> : <IcCheck s={18} />}</span>
                    <div>
                      <div className="imp-panel__title">{readingActive ? "Reading your CVs, building profiles" : `All ${total} read`}</div>
                      <div className="imp-panel__sub">{readingActive ? "We read each one and add the candidate for you." : "Each CV is now a candidate. Choose where they go."}</div>
                    </div>
                  </div>
                  <div className="imp-panel__count">{readCount} of {total} read</div>
                </div>
                <div className="imp-bar"><span className="imp-bar__fill" style={{ width: `${total ? Math.round((readCount / total) * 100) : 0}%` }} /></div>

                <div className="imp-cand-grid">
                  <AnimatePresence initial={false}>
                    {items.map((it, i) => renderCard(it, i))}
                  </AnimatePresence>
                </div>

                {notice && <p className="imp-notice"><IcAlert /> {notice}</p>}
                {errorItems.length > 0 && !readingActive && (
                  <p className="imp-panel__note">{errorItems.length} file{errorItems.length === 1 ? "" : "s"} couldn’t be read. Retry or remove {errorItems.length === 1 ? "it" : "them"}. The rest are ready.</p>
                )}

                {!readingActive && (
                  <div className="imp-panel__foot">
                    <button
                      type="button"
                      className="imp-btn imp-btn--primary"
                      disabled={readyItems.length === 0}
                      onClick={toPick}
                    >
                      {lockedDest ? `Add to ${lockedDest.title}` : "Choose where they go"}<IcArrow />
                    </button>
                  </div>
                )}
              </div>
            </motion.section>
          )}

          {/* ═══════ Beat 3 · Where should these go ═══════ */}
          {stage === "pick" && (
            <motion.section
              key="pick"
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={beatTransition}
            >
              <div className="imp-pick__head">
                <h2 className="imp-pick__title">{readyItems.length === 1 ? "Where should this candidate go?" : `Where should these ${readyItems.length} go?`}</h2>
                {manyJobs && (
                  <div className="imp-search">
                    <span className="imp-search__icon"><IcSearch /></span>
                    <input
                      type="text"
                      className="imp-search__input"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search jobs"
                      aria-label="Search jobs"
                    />
                  </div>
                )}
              </div>

              {Array.isArray(jobs) && jobs.length > 0 ? (
                <div className="imp-jobs">
                  {filteredJobs.map((j) => (
                    <button key={j.id} type="button" className="imp-job" onClick={(e) => pickDest({ ...j, isPool: j.kind === "pool" }, e)}>
                      <span className="imp-job__icon">{j.kind === "pool" ? <IcUsers /> : <IcBriefcase />}</span>
                      <span className="imp-job__body">
                        <span className="imp-job__title">{j.title || "Untitled role"}</span>
                        <span className="imp-job__ctx">{j.kind === "pool" ? "Talent pool" : (j.market === "india" ? "India" : "Gulf")}</span>
                      </span>
                    </button>
                  ))}
                  {filteredJobs.length === 0 && <p className="imp-pick__empty">No jobs match “{query}”.</p>}
                </div>
              ) : (
                <p className="imp-pick__empty">No jobs posted yet. Keep these candidates in a talent pool, you can move them onto a job later.</p>
              )}

              {creatingPool ? (
                <div className="imp-poolform">
                  <input
                    autoFocus
                    type="text"
                    className="imp-poolform__input"
                    value={poolName}
                    maxLength={80}
                    onChange={(e) => setPoolName(e.target.value)}
                    placeholder='Name the pool, e.g. "Sales candidates"'
                    aria-label="Pool name"
                  />
                  <div className="imp-poolform__market" role="radiogroup" aria-label="Where are you hiring">
                    <span className="imp-poolform__marketlabel">Where are you hiring?</span>
                    <div className="imp-toggle">
                      {[["gulf", "Gulf"], ["india", "India"]].map(([k, l]) => (
                        <button
                          key={k}
                          type="button"
                          role="radio"
                          aria-checked={poolMarket === k}
                          className={`imp-toggle__btn${poolMarket === k ? " imp-toggle__btn--on" : ""}`}
                          onClick={() => setPoolMarket(k)}
                        >{l}</button>
                      ))}
                    </div>
                  </div>
                  <div className="imp-poolform__row">
                    <button type="button" className="imp-btn imp-btn--ghost" onClick={() => setCreatingPool(false)}>Cancel</button>
                    <button
                      type="button"
                      className="imp-btn imp-btn--primary"
                      disabled={!poolName.trim()}
                      onClick={(e) => pickDest({ isPool: true, id: null, title: poolName.trim(), market: poolMarket }, e)}
                    >Create and add CVs</button>
                  </div>
                </div>
              ) : (
                <button type="button" className="imp-pool" onClick={() => setCreatingPool(true)}>
                  <span className="imp-pool__icon"><IcUsers /></span>
                  <span className="imp-pool__body">
                    <span className="imp-pool__title">Add to a talent pool</span>
                    <span className="imp-pool__sub">For CVs not tied to a job yet. Keep them ready for later.</span>
                  </span>
                </button>
              )}
            </motion.section>
          )}

          {/* ═══════ Beat 4 · Scoring on add ═══════ */}
          {stage === "scoring" && (
            <motion.section
              key="scoring"
              initial={reduce ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={beatTransition}
            >
              <div className="imp-panel">
                <div className="imp-panel__head">
                  <div className="imp-panel__lead">
                    <span className="imp-panel__badge"><IcBriefcase /></span>
                    <div>
                      <div className="imp-panel__title">{dest?.isPool ? "Adding to your talent pool" : `Scoring the fit for ${dest?.title || "your job"}`}</div>
                      <div className="imp-panel__sub">{dest?.isPool ? "Pooled candidates keep their profile, ready to match to a job." : "We match each candidate to this job as we add them."}</div>
                    </div>
                  </div>
                  {!dest?.isPool && <div className="imp-panel__count">{scoredCount} of {total} scored</div>}
                </div>
                {!dest?.isPool && <div className="imp-bar"><span className="imp-bar__fill" style={{ width: `${total ? Math.round((scoredCount / total) * 100) : 0}%` }} /></div>}

                <div className="imp-cand-grid">
                  {items.map((it, i) => renderCard(it, i))}
                </div>

                {notice && (
                  <div className="imp-panel__foot imp-panel__foot--split">
                    <p className="imp-notice imp-notice--inline"><IcAlert /> {notice}</p>
                    <button type="button" className="imp-btn imp-btn--primary" onClick={() => dest && commit(dest)}>Try again</button>
                  </div>
                )}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>

      {/* Progress toast (floating surface 3 of 3) */}
      <AnimatePresence>
        {(readingActive || scoringActive) && (
          <motion.div
            key="toast"
            className="imp-toast"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.25, ease: EASE }}
          >
            <span className="imp-toast__spin" aria-hidden="true" />
            {readingActive
              ? `Reading ${readCount} of ${total}`
              : `Scoring ${scoredCount} of ${total} against ${dest?.title || "your job"}`}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Finish — opens from the tapped card into the pipeline */}
      <AnimatePresence>
        {stage === "done" && result && (
          <motion.div
            key="confirm"
            className="imp-confirm-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2, ease: EASE }}
          >
            <div ref={setConfirmEl} className="imp-confirm" role="dialog" aria-modal="true" aria-labelledby="imp-confirm-title">
              <span className="imp-confirm__icon"><IcCheck s={26} /></span>
              <h3 id="imp-confirm-title" className="imp-confirm__title">
                {result.inserted} candidate{result.inserted === 1 ? "" : "s"} added to {result.destName}
              </h3>
              <p className="imp-confirm__sub">
                We read each one and added the candidate for you. They are ready in {result.isPool ? "your talent pool" : "the pipeline"}.
                {result.dupes > 0 ? ` ${result.dupes} were already there.` : ""}
              </p>
              <div className="imp-confirm__actions">
                <button type="button" className="imp-btn imp-btn--primary imp-btn--wide" onClick={openDestination}>
                  {result.isPool ? "Open the talent pool" : "Open the pipeline"}
                </button>
                <button type="button" className="imp-btn imp-btn--ghost imp-btn--wide" onClick={importMore}>Import more CVs</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loadError && stage === "pick" && (
        <p className="imp-notice imp-notice--float"><IcAlert /> {loadError}{" "}
          <button type="button" className="imp-cand__retry" onClick={() => { setJobs(null); loadJobs(user.id); }}>Retry</button>
        </p>
      )}
    </div>
  );
}
