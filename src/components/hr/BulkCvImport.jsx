// =============================================================
// src/components/hr/BulkCvImport.jsx
//
// HR bulk CV import on a job pipeline. The HR drops a batch of existing
// CV files (PDF / DOCX); the portal reads each one IN THE BROWSER
// (services/cvExtraction — unpdf, mammoth, tesseract.js OCR fallback),
// uploads it to the private applicant-cvs bucket, structures it into a
// candidate, scores it against the job, and creates a pipeline row
// ranked best-fit first.
//
// HARD CAP: 20 files per batch.
//
// Pipeline per file (sequential — gentle on rate limits + the single
// tesseract worker, and gives clean per-file progress):
//   extract → upload → structure → insert → score
//
// Chunk C wires extract + upload (terminal state "ready"). Structuring +
// insert (D) and scoring (E) extend processOne in place.
//
// Rendered INSIDE .jpp-root so the pipeline's --hjl-* accent tokens
// cascade. No portal.
// =============================================================

import { useCallback, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { supabase } from "../../appSupabaseClient";
import { extractCvText, CvExtractionError } from "../../services/cvExtraction";
import "./bulkCvImport.css";

const MAX_BATCH = 20;
const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 MB per file
const EASE = [0.4, 0, 0.2, 1];

const ACCEPT = ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/* ───────── icons ───────── */
const UploadIc = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);
const FileIc = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
  </svg>
);
const CloseIc = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const CheckIc = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const AlertIc = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

/* ───────── helpers ───────── */
let _seq = 0;
function nextId() { _seq += 1; return `f${_seq}`; }

function sizeLabel(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileExt(file) {
  const name = String(file?.name || "").toLowerCase();
  const ext = (name.split(".").pop() || "").replace(/[^a-z0-9]/g, "");
  if (ext === "pdf" || ext === "docx") return ext;
  return file?.type === "application/pdf" ? "pdf" : "docx";
}

function isSupported(file) {
  const name = String(file?.name || "").toLowerCase();
  return (
    file?.type === "application/pdf" ||
    name.endsWith(".pdf") ||
    file?.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  );
}

// A short, HR-readable line for a failed file. CvExtractionError carries a
// user-facing hint; everything else gets a generic retryable message.
function errorHint(err) {
  if (err instanceof CvExtractionError) return err.hint || err.message;
  return "Couldn't process this file — try again.";
}

const STATUS_META = {
  queued:       { label: "Queued",          tone: "idle" },
  working:      { label: "Working",         tone: "work" },
  ready:        { label: "Read",            tone: "ready" },
  error:        { label: "Failed",          tone: "error" },
};

export default function BulkCvImport({ open, jobId, job, hrId, onClose, onImported }) {
  const reduce = useReducedMotion();
  const inputRef = useRef(null);
  const [items, setItems] = useState([]); // { id, file, name, size, status, stage, error, text, path, ocr }
  const [dragging, setDragging] = useState(false);
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState(null);

  const update = useCallback((id, patch) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }, []);

  const remaining = MAX_BATCH - items.length;

  const addFiles = useCallback((fileList) => {
    setNotice(null);
    const incoming = Array.from(fileList || []);
    if (!incoming.length) return;

    const accepted = [];
    const rejected = [];
    for (const file of incoming) {
      if (!isSupported(file)) { rejected.push(`${file.name} — not a PDF or DOCX`); continue; }
      if (file.size > MAX_FILE_BYTES) { rejected.push(`${file.name} — over 15 MB`); continue; }
      accepted.push(file);
    }

    setItems((prev) => {
      const slots = MAX_BATCH - prev.length;
      const take = accepted.slice(0, Math.max(0, slots));
      const overflow = accepted.length - take.length;
      const notes = [...rejected];
      if (overflow > 0) notes.push(`${overflow} file${overflow === 1 ? "" : "s"} skipped — ${MAX_BATCH}-CV batch limit`);
      if (notes.length) setNotice(notes.join(" · "));
      const mapped = take.map((file) => ({
        id: nextId(),
        file,
        name: file.name,
        size: file.size,
        status: "queued",
        stage: null,
        error: null,
        text: null,
        path: null,
        ocr: false,
      }));
      return [...prev, ...mapped];
    });
  }, []);

  const removeItem = useCallback((id) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
  }, []);

  /* ── drag-drop ── */
  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    if (running) return;
    addFiles(e.dataTransfer?.files);
  }, [addFiles, running]);

  /* ── per-file pipeline (sequential). Chunk C: extract → upload → ready.
        Structuring + insert (D) and scoring (E) extend this in place. ── */
  const processOne = useCallback(async (item) => {
    // 1. Extract text in the browser (OCR fallback on for image-only PDFs).
    update(item.id, { status: "working", stage: "Reading the CV…", error: null });
    let extracted;
    try {
      extracted = await extractCvText(item.file, { ocrFallback: true });
    } catch (err) {
      update(item.id, { status: "error", stage: null, error: errorHint(err) });
      return;
    }

    // 2. Keep the original file — private applicant-cvs bucket, HR's own uid
    //    folder (021 policies cover this; the row's cv_file_path points here).
    update(item.id, { stage: "Uploading…" });
    let path = null;
    try {
      const ext = fileExt(item.file);
      const rand = Math.random().toString(36).slice(2, 8);
      path = `${hrId}/${jobId}-${Date.now()}-${rand}.${ext}`;
      const { error } = await supabase.storage
        .from("applicant-cvs")
        .upload(path, item.file, { upsert: true, contentType: item.file.type || undefined });
      if (error) throw error;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[bulk-import] upload failed:", err?.message || err);
      update(item.id, { status: "error", stage: null, error: "Upload failed — retry." });
      return;
    }

    update(item.id, { status: "ready", stage: null, text: extracted.text, path, ocr: extracted.ocr });
  }, [hrId, jobId, update]);

  const pendingItems = useMemo(
    () => items.filter((it) => it.status === "queued" || it.status === "error"),
    [items]
  );

  const runImport = useCallback(async () => {
    if (running) return;
    const queue = items.filter((it) => it.status === "queued" || it.status === "error");
    if (!queue.length) return;
    setRunning(true);
    setNotice(null);
    for (const item of queue) {
      // re-read latest file ref by id (status may have changed); the File
      // object itself is stable on the item.
      // eslint-disable-next-line no-await-in-loop
      await processOne(item);
    }
    setRunning(false);
  }, [items, running, processOne]);

  const readyCount = items.filter((it) => it.status === "ready").length;
  const errorCount = items.filter((it) => it.status === "error").length;
  const doneAll = items.length > 0 && pendingItems.length === 0 && !running;

  const handleClose = useCallback(() => {
    if (running) return; // don't tear down mid-batch
    if (readyCount > 0 && onImported) onImported();
    setItems([]);
    setNotice(null);
    onClose && onClose();
  }, [running, readyCount, onImported, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="bci-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bci-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18, ease: EASE }}
          onClick={handleClose}
        >
          <motion.div
            className="bci-panel"
            onClick={(e) => e.stopPropagation()}
            initial={reduce ? false : { opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.26, ease: EASE }}
          >
            <button type="button" className="bci-close" onClick={handleClose} disabled={running} aria-label="Close">
              <CloseIc />
            </button>

            <header className="bci-head">
              <h3 id="bci-title" className="bci-title">Import existing CVs</h3>
              <p className="bci-sub">
                Drop up to {MAX_BATCH} PDF or DOCX files{job?.title ? <> for <strong>{job.title}</strong></> : null}.
                We read each one, then add it to this pipeline.
              </p>
            </header>

            {/* Drop zone */}
            <label
              className={`bci-drop${dragging ? " bci-drop--active" : ""}${remaining <= 0 ? " bci-drop--full" : ""}`}
              onDragOver={(e) => { e.preventDefault(); if (!running && remaining > 0) setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
            >
              <input
                ref={inputRef}
                type="file"
                className="bci-input"
                accept={ACCEPT}
                multiple
                disabled={running || remaining <= 0}
                onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
              />
              <span className="bci-drop__icon" aria-hidden="true"><UploadIc /></span>
              <span className="bci-drop__title">
                {remaining <= 0 ? "Batch full" : dragging ? "Drop to add" : "Drag CVs here or browse"}
              </span>
              <span className="bci-drop__hint">
                {remaining <= 0
                  ? `${MAX_BATCH}-CV limit reached`
                  : `PDF or DOCX · up to 15 MB each · ${remaining} slot${remaining === 1 ? "" : "s"} left`}
              </span>
            </label>

            <AnimatePresence>
              {notice && (
                <motion.p
                  className="bci-notice"
                  initial={reduce ? false : { opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: EASE }}
                >
                  <AlertIc /> {notice}
                </motion.p>
              )}
            </AnimatePresence>

            {/* File list */}
            {items.length > 0 && (
              <div className="bci-list" role="list">
                <AnimatePresence initial={false}>
                  {items.map((it) => {
                    const meta = STATUS_META[it.status] || STATUS_META.queued;
                    return (
                      <motion.div
                        key={it.id}
                        role="listitem"
                        className={`bci-row bci-row--${meta.tone}`}
                        layout={!reduce}
                        initial={reduce ? false : { opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={reduce ? { opacity: 0 } : { opacity: 0, x: -8 }}
                        transition={{ duration: 0.2, ease: EASE }}
                      >
                        <span className="bci-row__file"><FileIc /></span>
                        <span className="bci-row__body">
                          <span className="bci-row__name" title={it.name}>{it.name}</span>
                          <span className="bci-row__meta">
                            {it.status === "error"
                              ? <span className="bci-row__err">{it.error}</span>
                              : it.stage
                                ? <span className="bci-row__stage">{it.stage}</span>
                                : `${sizeLabel(it.size)}${it.ocr ? " · OCR" : ""}`}
                          </span>
                        </span>
                        <span className={`bci-pill bci-pill--${meta.tone}`}>
                          {it.status === "working" && <span className="bci-pill__spin" aria-hidden="true" />}
                          {it.status === "ready" && <CheckIc />}
                          {it.status === "error" && <AlertIc />}
                          {it.status === "ready" ? meta.label : it.status === "working" ? "Reading" : meta.label}
                        </span>
                        {!running && it.status !== "working" && (
                          <button
                            type="button"
                            className="bci-row__remove"
                            onClick={() => removeItem(it.id)}
                            aria-label={`Remove ${it.name}`}
                          >
                            <CloseIc />
                          </button>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}

            {/* Footer */}
            <div className="bci-foot">
              <span className="bci-foot__count">
                {items.length > 0
                  ? `${items.length} file${items.length === 1 ? "" : "s"}${readyCount ? ` · ${readyCount} read` : ""}${errorCount ? ` · ${errorCount} failed` : ""}`
                  : "No files yet"}
              </span>
              <div className="bci-foot__actions">
                {doneAll ? (
                  <button type="button" className="bci-btn bci-btn--solid" onClick={handleClose}>
                    Done
                  </button>
                ) : (
                  <button
                    type="button"
                    className="bci-btn bci-btn--solid"
                    onClick={runImport}
                    disabled={running || pendingItems.length === 0}
                  >
                    {running
                      ? "Reading…"
                      : `Read ${pendingItems.length || ""} CV${pendingItems.length === 1 ? "" : "s"}`.replace("  ", " ")}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
