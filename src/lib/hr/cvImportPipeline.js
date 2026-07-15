// =============================================================
// src/lib/hr/cvImportPipeline.js
//
// The bulk-CV import pipeline, factored out of BulkCvImport so the
// rail-level /employer/import page can drive the SAME real backend
// without re-implementing any parsing or scoring:
//
//   readCv    → extract (unpdf / mammoth / tesseract OCR fallback)
//                + upload to the private applicant-cvs bucket
//                + structure via /api/ai?action=import_structure
//   scoreCv   → fit score via /api/ai?action=candidate_verdict
//   commitBatch → the import_candidates_batch RPC (all-or-nothing insert)
//
// This is UI-over-the-existing-pipeline: every network call, storage
// path convention, and RPC signature here matches BulkCvImport exactly.
// The ONLY sequencing difference the new page introduces is honest, not
// mechanical: reading (extract/upload/structure) happens BEFORE a
// destination is chosen, so the fit score cannot exist yet. scoreCv
// runs on add, once the recruiter has picked the job — never a
// fabricated number during reading.
// =============================================================

import { supabase } from "../../appSupabaseClient";
import safeFetch from "../net/safeFetch";
import { extractCvText, CvExtractionError } from "../../services/cvExtraction";

export const MAX_BATCH = 20;
export const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15 MB per file
export const ACCEPT =
  ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

/* A pipeline step that failed with an HR-readable reason. `step` names
   where it died (extract / upload / structure) so the caller can show an
   honest badge and offer a per-file retry — never a silent drop. */
export class PipelineError extends Error {
  constructor(message, step) {
    super(message);
    this.name = "PipelineError";
    this.step = step;
  }
}

export function isSupportedFile(file) {
  const name = String(file?.name || "").toLowerCase();
  return (
    file?.type === "application/pdf" ||
    name.endsWith(".pdf") ||
    file?.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  );
}

export function fileExt(file) {
  const name = String(file?.name || "").toLowerCase();
  const ext = (name.split(".").pop() || "").replace(/[^a-z0-9]/g, "");
  if (ext === "pdf" || ext === "docx") return ext;
  return file?.type === "application/pdf" ? "pdf" : "docx";
}

// A clean display name from a file when the parser can't find one.
export function nameFromFile(file) {
  const base = String(file?.name || "").replace(/\.[^.]+$/, "").trim();
  const cleaned = base.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  return cleaned || "Imported candidate";
}

function extractionHint(err) {
  if (err instanceof CvExtractionError) return err.hint || err.message;
  return "Couldn't process this file, try again.";
}

async function authToken() {
  const { data: { session } = {} } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error("auth");
  return token;
}

/* ── Beat 2: read one CV (job-independent). extract → upload → structure.
      No score — the destination job isn't chosen yet, so there is nothing
      honest to fit against. onStage(key) drives the per-file progress UI:
      "reading" → "uploading" → "structuring". ── */
export async function readCv(file, { hrId, onStage } = {}) {
  onStage && onStage("reading");
  let extracted;
  try {
    extracted = await extractCvText(file, { ocrFallback: true });
  } catch (err) {
    throw new PipelineError(extractionHint(err), "extract");
  }

  onStage && onStage("uploading");
  let path = null;
  try {
    const ext = fileExt(file);
    const rand = Math.random().toString(36).slice(2, 8);
    // Keyed on hrId only (the storage-RLS folder), so it works before a
    // brand-new pool's job id exists — identical to BulkCvImport.
    path = `${hrId}/${Date.now()}-${rand}.${ext}`;
    const { error } = await supabase.storage
      .from("applicant-cvs")
      .upload(path, file, { upsert: true, contentType: file.type || undefined });
    if (error) throw error;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[cv-import] upload failed:", err?.message || err);
    throw new PipelineError("Upload failed, try again.", "upload");
  }

  onStage && onStage("structuring");
  let snapshot = null;
  try {
    const token = await authToken();
    const res = await safeFetch("/api/ai?action=import_structure", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ text: extracted.text }),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok || !out.snapshot) throw new Error(out.error || "structure failed");
    snapshot = out.snapshot;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[cv-import] structure failed:", err?.message || err);
    throw new PipelineError("Couldn't read this CV, try again.", "structure");
  }

  return { snapshot, path, ocr: extracted.ocr, text: extracted.text };
}

/* ── Beat 4 (on add): score one already-read candidate against the chosen
      job. Best effort — a transient API blip must never drop a parsed
      candidate, so a failure returns { score: null } and the candidate
      still imports as import_pending for the retro re-scan to pick up. A
      talent pool has no JD to match against, so pool imports skip this
      entirely (honest: no score rather than a meaningless one). ── */
export async function scoreCv(snapshot, job) {
  try {
    const token = await authToken();
    const res = await safeFetch("/api/ai?action=candidate_verdict", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        cvSnapshot: snapshot,
        job: {
          title: job?.title || "",
          description: job?.description || "",
          skills: job?.skills || [],
          requirements: job?.requirements || [],
        },
      }),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok || typeof out.score !== "number") throw new Error(out.error || "verdict failed");
    return { score: out.score, verdict: out.verdict, verdictFull: out };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[cv-import] scoring failed:", err?.message || err);
    return { score: null, verdict: null, verdictFull: null };
  }
}

/* Shape one ready candidate into the record the batch RPC expects.
   Mirrors BulkCvImport.buildRecord: the full verdict rides along so
   applications.ai_verdict is persisted once (036) and no later surface
   re-runs the score. score_source 'import_verdict' when scored, else
   'import_pending' so the retro re-scan owns it. */
export function buildRecord(it) {
  const scored = typeof it.score === "number";
  return {
    candidate_name: it.candidateName || it.snapshot?.name || nameFromFile(it.file),
    candidate_email: it.snapshot?.email || null,
    candidate_phone: it.snapshot?.phone || null,
    visa_status: it.snapshot?.visa_status || null,
    cv_snapshot: it.snapshot || {},
    cv_file_path: it.path || null,
    ats_score: scored ? it.score : 0,
    score_source: scored ? "import_verdict" : "import_pending",
    ai_verdict: scored && it.verdictFull ? it.verdictFull : null,
  };
}

/* Commit the whole batch in one transactional RPC (creates the pool row
   too, when p_pool_name is set). Returns { inserted, skipped,
   skipped_indices }. Throws on RLS / missing-migration errors so the
   caller can surface an honest rollback message. */
export async function commitBatch({ jobId, poolName, market, records }) {
  const { data, error } = await supabase.rpc("import_candidates_batch", {
    p_job_id: poolName ? null : jobId,
    p_pool_name: poolName ? poolName.trim() : null,
    p_market: market || null,
    p_records: records,
  });
  if (error) throw error;
  return data || {};
}
