// =============================================================
// ReviewMode — the candidate evaluation view (redesign, Option A).
//
// /employer/jobs/:id/review — a focused, full-screen queue over the job's
// NEW applicants. Candidate on the LEFT (identity, deployment readiness,
// screening knockout, AI verdict, document tabs), the JOB DESCRIPTION on
// the RIGHT — always open on desktop, one tap away on mobile. A fixed
// decision bar carries Reject / Shortlist; a decision auto loads the next
// new candidate ("Candidate N of M"), and the last action is always
// undoable (banner on the candidate + toast, both with Undo).
//
// Deliberately OUTSIDE HrShell: the decision bar is fixed to the bottom
// and would collide with the shell's mobile tab bar.
//
// Persistence goes through the SAME buildStageMoveWrites path as the
// pipeline (status + candidate_events), plus the 037 reject columns
// (reject_reason / rejected_at / reject_notify_at) with a graceful
// status-only fallback on databases that have not run 037 yet.
//
// Standing rules honored here: no dashes in copy, tokens + existing
// components reused (VerdictCard is THE verdict, cvDocEngine is THE pdf
// path), motion gated by useReducedMotion, readiness degrades to
// "Not stated" with a Request details action, the verdict generating
// state keeps readiness + CV usable and the decision buttons enabled.
// =============================================================
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { supabase } from "../../../appSupabaseClient";
// Shared-component import order mirrors JobPipelinePage (WhatsAppComposer →
// VerdictCard → NoteText → CvViewerOverlay → JobDescriptionPanel) so
// mini-css-extract never sees conflicting css order between the two chunks.
import WhatsAppComposer, { logWhatsappEvent } from "../../../components/hr/WhatsAppComposer";
import VerdictCard from "../../../components/hr/VerdictCard";
import NoteText from "../../../components/hr/NoteText";
import CvViewerOverlay from "../../../components/hr/CvViewerOverlay";
import JobDescriptionPanel from "../../../components/hr/JobDescriptionPanel";
import RejectModal from "../../../components/hr/RejectModal";
import givenName from "../../../lib/hr/givenName";
import dedupeSkills from "../../../lib/hr/dedupeSkills";
import { NEW_STATUSES } from "../../../lib/hr/stages";
import { buildStageMoveWrites } from "../../../lib/hr/stageMove";
import { trackHr } from "../../../lib/analytics/hrEvents";
import { buildReadiness, evaluateScreening, knockoutSynthesis, missingGaps, humanJoin } from "../../../lib/hr/readiness";
import { REJECT_REASONS } from "../../../lib/hr/rejectReasons";
import { loadCvFile } from "../../../lib/hr/cvFile";
import { isStaleAsset, openPdfFromBlob, docxToHtml } from "../../../lib/hr/cvDocEngine";
import usePdfPageCanvas from "../../../components/hr/usePdfPageCanvas";
import PortalFeedback from "../../../components/hr/PortalFeedback";
import "../PostJob/postJob.css"; // :root tokens (--pj-*)
import "./reviewMode.css";

const EASE = [0.4, 0, 0.2, 1];

/* ── helpers ── */
function getCv(c) { return c?.cv_snapshot || c?.cv_data || {}; }

function timeAgo(s) {
  if (!s) return "";
  const t = new Date(s).getTime();
  if (!t) return "";
  const mins = Math.floor((Date.now() - t) / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

/* The snapshot parsed to nothing usable → the Original CV tab opens by
   default with a calm notice (frame 1j). */
function cvParseFailed(cv) {
  return !(
    (cv?.summary && String(cv.summary).trim()) ||
    (Array.isArray(cv?.experience) && cv.experience.length > 0) ||
    (Array.isArray(cv?.skills) && cv.skills.length > 0)
  );
}

/* Column-graceful UPDATE: try the full payload, and when the database has
   not run migration 037 yet (unknown column), retry with the base fields
   so the decision itself never fails on a schema gap. */
async function updateApplication(appId, fullPayload, basePayload) {
  const { error } = await supabase.from("applications").update(fullPayload).eq("id", appId);
  if (!error) return { ok: true, degraded: false };
  if (/column|schema cache/i.test(error.message || "")) {
    const { error: e2 } = await supabase.from("applications").update(basePayload).eq("id", appId);
    if (!e2) return { ok: true, degraded: true };
    return { ok: false, error: e2 };
  }
  return { ok: false, error };
}

/* ── icons ── */
const Ic = {
  back: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>,
  prev: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>,
  next: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>,
  x: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12" /></svg>,
  check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>,
  warn: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
  info: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><line x1="12" y1="8" x2="12" y2="12.5" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>,
  clock: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>,
  chev: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>,
  doc: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>,
  download: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>,
  newTab: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>,
  done: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>,
};

/* ── Original CV tab — the SAME pdf.js path as CvViewerOverlay via
      cvDocEngine + usePdfPageCanvas. One render path, different chrome. ── */
function RvmPdfPage({ pdfDoc, pageNo, scale, reduce }) {
  const { canvasRef, drawn } = usePdfPageCanvas({ pdfDoc, pageNo, scale });
  return (
    <motion.div
      className="rvm-sheet"
      initial={reduce ? false : { opacity: 0, y: 12 }}
      animate={drawn ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.3, ease: EASE, delay: reduce ? 0 : Math.min(pageNo - 1, 4) * 0.05 }}
    >
      <canvas ref={canvasRef} aria-label={`CV page ${pageNo}`} />
    </motion.div>
  );
}

function OriginalCvPanel({ path, fileName, parseFailed, onOpenViewer, reduce }) {
  const [file, setFile] = useState({ status: "idle" });
  const [doc, setDoc] = useState(null);
  const [scale, setScale] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const stageRef = useRef(null);
  const blobUrlRef = useRef(null);

  useEffect(() => {
    if (!path) { setFile({ status: "missing" }); setDoc(null); return undefined; }
    let live = true;
    setFile({ status: "loading" });
    setDoc(null);
    setScale(null);
    (async () => {
      try {
        const loaded = await loadCvFile(path);
        if (!live) return;
        const blobUrl = URL.createObjectURL(loaded.blob);
        blobUrlRef.current = blobUrl;
        setFile({
          status: "ready",
          ext: loaded.ext,
          blobUrl,
          tabUrl: loaded.tabUrl || blobUrl,
          downloadUrl: loaded.downloadUrl || blobUrl,
        });
        if (loaded.ext === "pdf") {
          try {
            const pdf = await openPdfFromBlob(loaded.blob);
            if (live) setDoc({ kind: "pdf", pdf });
          } catch (e) {
            console.error(`Review mode: pdf.js failed for "${path}":`, e?.message || e); // eslint-disable-line no-console
            if (live) setDoc(isStaleAsset(e) ? { kind: "stale" } : { kind: "card", note: "This PDF could not be rendered. Download it to view." });
          }
        } else if (loaded.ext === "docx") {
          try {
            const html = await docxToHtml(loaded.blob);
            if (live) setDoc(html ? { kind: "html", html } : { kind: "card" });
          } catch (e) {
            console.error(`Review mode: docx convert failed for "${path}":`, e?.message || e); // eslint-disable-line no-console
            if (live) setDoc(isStaleAsset(e) ? { kind: "stale" } : { kind: "card", note: "This document could not be rendered. Download it to view." });
          }
        } else if (["png", "jpg", "jpeg", "webp"].includes(loaded.ext)) {
          setDoc({ kind: "img" });
        } else {
          setDoc({ kind: "card" });
        }
      } catch (e) {
        console.error(`Review mode: CV load failed for "${path}":`, e?.message || e); // eslint-disable-line no-console
        if (live) setFile({ status: "error" });
      }
    })();
    return () => {
      live = false;
      if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
    };
  }, [path, attempt]);

  useEffect(() => () => { doc?.pdf?.destroy?.(); }, [doc]);

  /* Fit to the tab's width once (no zoom chrome here; the deep-dive zoom
     lives in CvViewerOverlay). */
  useEffect(() => {
    if (doc?.kind !== "pdf" || scale != null) return undefined;
    let live = true;
    (async () => {
      try {
        const page = await doc.pdf.getPage(1);
        if (!live || !stageRef.current) return;
        const stageW = stageRef.current.clientWidth - 20;
        const naturalW = page.getViewport({ scale: 1 }).width;
        setScale(Math.min(Math.max(stageW / naturalW, 0.4), 1.6));
      } catch { if (live) setScale(1); }
    })();
    return () => { live = false; };
  }, [doc, scale]);

  const body = () => {
    if (file.status === "missing") {
      return (
        <div className="rvm-filecard">
          <span className="rvm-filecard__ic" aria-hidden="true">{Ic.doc}</span>
          <div>
            <div className="rvm-filecard__name">No uploaded CV file</div>
            <div className="rvm-filecard__meta">This candidate has only the parsed profile. Imports and easy applies can arrive without a document.</div>
          </div>
        </div>
      );
    }
    if (file.status === "loading" || file.status === "idle") {
      return (
        <div className="rvm-sheet rvm-skel" aria-hidden="true">
          <span className="rvm-skel__bar rvm-skel__bar--title" />
          {Array.from({ length: 7 }, (_, j) => (
            <span key={j} className="rvm-skel__bar" style={{ width: `${88 - (j % 3) * 14}%` }} />
          ))}
        </div>
      );
    }
    if (file.status === "error") {
      return (
        <div className="rvm-cvstatus" role="alert">
          <p>Couldn&rsquo;t load this CV. It may have been removed, or your connection dropped.</p>
          <button type="button" className="rvm-btn" onClick={() => setAttempt((a) => a + 1)}>Try again</button>
        </div>
      );
    }
    if (doc?.kind === "pdf" && scale != null) {
      return Array.from({ length: doc.pdf.numPages }, (_, n) => (
        <RvmPdfPage key={n + 1} pdfDoc={doc.pdf} pageNo={n + 1} scale={scale} reduce={reduce} />
      ));
    }
    if (doc?.kind === "pdf") return <div className="rvm-sheet rvm-skel" aria-hidden="true"><span className="rvm-skel__bar rvm-skel__bar--title" /></div>;
    if (doc?.kind === "html") {
      return (
        <motion.div
          className="rvm-sheet rvm-sheet--doc"
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: EASE }}
          // mammoth output: whitelisted structural HTML from the docx, no scripts.
          dangerouslySetInnerHTML={{ __html: doc.html }}
        />
      );
    }
    if (doc?.kind === "img") {
      return (
        <motion.div className="rvm-sheet rvm-sheet--img" initial={reduce ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, ease: EASE }}>
          <img src={file.blobUrl} alt={fileName} />
        </motion.div>
      );
    }
    if (doc?.kind === "stale") {
      return (
        <div className="rvm-cvstatus" role="alert">
          <p>CVPassport was updated since this page loaded. Refresh to open the new viewer.</p>
          <button type="button" className="rvm-btn rvm-btn--primary" onClick={() => window.location.reload()}>Refresh page</button>
        </div>
      );
    }
    if (doc?.kind === "card") {
      return (
        <div className="rvm-filecard">
          <span className="rvm-filecard__ic" aria-hidden="true">{Ic.doc}</span>
          <div>
            <div className="rvm-filecard__name">{fileName}</div>
            <div className="rvm-filecard__meta">{doc.note || `${(file.ext || "file").toUpperCase()} preview is not supported in the browser`}</div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rvm-original">
      {parseFailed && file.status !== "missing" && (
        <div className="rvm-parsenote" role="note">
          <span aria-hidden="true">{Ic.info}</span>
          <span>This CV could not be parsed, it may be a scanned image. Showing the original document.</span>
        </div>
      )}
      {file.status === "ready" && (
        <div className="rvm-original__acts">
          {onOpenViewer && (
            <button type="button" className="rvm-btn rvm-btn--primary" onClick={onOpenViewer}>
              Open CV viewer
            </button>
          )}
          {file.downloadUrl && <a className="rvm-btn" href={file.downloadUrl} download={fileName}>{Ic.download} Download</a>}
          {file.tabUrl && <a className="rvm-btn" href={file.tabUrl} target="_blank" rel="noreferrer noopener">{Ic.newTab} Open in new tab</a>}
        </div>
      )}
      <div className="rvm-original__stage" ref={stageRef}>{body()}</div>
      <p className="rvm-original__hint">The document as the candidate sent it. The CV viewer opens it full screen next to the verdict.</p>
    </div>
  );
}

const WaGlyph = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
  </svg>
);

/* "today" · "yesterday" · "on 12 Jul" — for the quiet asked line. */
function fmtAskedWhen(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const day = 86400000;
  const at0 = (x) => { const y = new Date(x); y.setHours(0, 0, 0, 0); return y.getTime(); };
  const diff = Math.round((at0(new Date()) - at0(d)) / day);
  if (diff <= 0) return "today";
  if (diff === 1) return "yesterday";
  return `on ${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;
}

/* ── Deployment readiness card (frames 1a, 1b, 1c) ──
   Rows scale with what we KNOW: a stated field earns a plain row. What the
   CV does not mention earns ONE line and ONE action, however many things
   are absent — not a chore per field. After she asks, the line goes quiet
   and reports that she asked, and when. */
function ReadinessCard({ readiness, onAsk, askedAt, firstName, reduce }) {
  const { rows, flagCount } = readiness;
  const known = rows.filter((r) => r.tone !== "missing");
  const gaps = missingGaps(readiness);
  const hasGaps = gaps.length > 0;
  const who = firstName ? `${firstName}'s CV` : "This CV";
  const askedWhen = askedAt ? fmtAskedWhen(askedAt) : null;
  return (
    <motion.section
      className={`rvm-card rvm-readiness${flagCount > 0 ? " rvm-readiness--flagged" : ""}`}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: EASE, delay: reduce ? 0 : 0.04 }}
      aria-label="Deployment readiness"
    >
      <div className="rvm-readiness__head">
        <span className={`rvm-card__eyebrow${flagCount > 0 ? " rvm-card__eyebrow--danger" : ""}`}>
          Deployment readiness{flagCount > 0 ? ` · ${flagCount} ${flagCount === 1 ? "flag" : "flags"}` : ""}
        </span>
      </div>

      {known.map((r) => (
        <div className="rvm-readiness__row" key={r.key}>
          <span className="rvm-readiness__label">{r.label}</span>
          <span className="rvm-readiness__val">
            <span className={`rvm-readiness__value rvm-readiness__value--${r.tone}`}>
              <span className={`rvm-dot rvm-dot--${r.tone}`} aria-hidden="true" />
              {r.value}
            </span>
            {r.note && <span className={`rvm-readiness__note rvm-readiness__note--${r.tone}`}>{r.note}</span>}
          </span>
        </div>
      ))}

      {hasGaps && !askedWhen && (
        <div className="rvm-readiness__gaps">
          <p className="rvm-readiness__gapline">{who} does not mention {humanJoin(gaps)}.</p>
          <div className="rvm-readiness__gaprow">
            <button type="button" className="rvm-gapbtn" onClick={onAsk}>
              <WaGlyph /> Ask on WhatsApp
            </button>
            <span className="rvm-readiness__gaphint">The message is already written, asking for exactly these.</span>
          </div>
        </div>
      )}

      {hasGaps && askedWhen && (
        <p className="rvm-readiness__asked">
          You asked {firstName || "the candidate"} {askedWhen}.{" "}
          <button type="button" className="rvm-linkbtn" onClick={onAsk}>Ask again</button>
        </p>
      )}
    </motion.section>
  );
}

/* ── Screening tab content ── */
function ScreeningList({ screening }) {
  if (!screening.items.length) {
    return (
      <div className="rvm-tabempty">
        <span className="rvm-tabempty__title">No screening questions on this job</span>
        <span className="rvm-tabempty__body">Add screening questions when posting to catch knockouts before you read a single CV.</span>
      </div>
    );
  }
  const toneOf = (s) => (s === "pass" ? "pass" : s === "fail" ? "fail" : "neutral");
  const chipLabel = (s) => (s === "pass" ? "Pass" : s === "fail" ? "Knockout" : s === "unanswered" ? "Not answered" : "Neutral");
  return (
    <div className="rvm-screening">
      {screening.items.map((q, i) => (
        <div className={`rvm-screen rvm-screen--${toneOf(q.status)}`} key={i}>
          <div className="rvm-screen__head">
            <span className="rvm-screen__q">{q.question}</span>
            <span className={`rvm-screen__chip rvm-screen__chip--${toneOf(q.status)}`}>{chipLabel(q.status)}</span>
          </div>
          {q.answer
            ? <p className="rvm-screen__a">&ldquo;{q.answer}&rdquo;</p>
            : <p className="rvm-screen__a rvm-screen__a--none">The candidate did not answer this question. Ask it on the first call.</p>}
          {q.note && <p className="rvm-screen__note">{q.note}</p>}
        </div>
      ))}
    </div>
  );
}

/* ── Notes tab — reuses the pipeline's append_recruiter_note RPC ── */
function NotesTab({ app, onNotesSaved }) {
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const notes = Array.isArray(app.recruiter_notes) ? app.recruiter_notes : [];

  const add = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.rpc("append_recruiter_note", { p_app_id: app.id, p_text: trimmed });
      if (error) throw error;
      onNotesSaved(app.id, data);
      setDraft("");
    } catch (e) {
      console.warn("[review] note save failed:", e?.message || e); // eslint-disable-line no-console
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rvm-notes">
      <div className="rvm-notes__row">
        <input
          type="text"
          className="rvm-notes__input"
          placeholder="Add a private note about this candidate…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && draft.trim()) add(); }}
          maxLength={400}
        />
        <button type="button" className="rvm-btn rvm-btn--primary" onClick={add} disabled={saving || !draft.trim()}>
          {saving ? "Saving…" : "Add"}
        </button>
      </div>
      {notes.length === 0 ? (
        <div className="rvm-tabempty">
          <span className="rvm-tabempty__title">No notes yet</span>
          <span className="rvm-tabempty__body">Notes stay with the candidate through the pipeline.</span>
        </div>
      ) : (
        <ul className="rvm-notes__list">
          {notes.slice(-6).reverse().map((n, i) => (
            <li key={i} className="rvm-notes__item">
              <NoteText text={typeof n === "string" ? n : (n?.text || n?.note || "")} />
              {typeof n === "object" && n?.at && <span className="rvm-notes__time">{timeAgo(n.at)}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ═════════════════ main page ═════════════════ */
export default function ReviewModePage() {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const { id: jobId } = useParams();

  const [user, setUser] = useState(null);
  const [job, setJob] = useState(null);
  const [jobError, setJobError] = useState(null);
  const [apps, setApps] = useState(null); // null = loading
  const [queueIds, setQueueIds] = useState(null); // snapshot of NEW apps on load
  const [idx, setIdx] = useState(0);
  const [tab, setTab] = useState("cv");
  const [decisions, setDecisions] = useState({}); // appId -> { kind, reasonCode, reasonLabel, prevStatus, prevUpdatedAt }
  const [lastActionId, setLastActionId] = useState(null);
  const [done, setDone] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState(null);
  const [cvOpen, setCvOpen] = useState(false); // full CvViewerOverlay

  const [toast, setToast] = useState(null);
  const [moveError, setMoveError] = useState(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerMessage, setComposerMessage] = useState(null);
  const [askedAt, setAskedAt] = useState(null); // when the gaps were last asked for the current candidate
  const [mobile, setMobile] = useState(() =>
    typeof window !== "undefined" && typeof window.matchMedia === "function"
      ? !window.matchMedia("(min-width: 900px)").matches
      : false,
  );
  const toastTimer = useRef(null);
  const advanceTimer = useRef(null);
  /* advance() runs from a 750ms timer; a closure over `decisions` would be
     one decision stale (the one that scheduled it), so the LAST candidate
     would never reach "All caught up". The ref always holds the truth. */
  const decisionsRef = useRef(decisions);
  useEffect(() => { decisionsRef.current = decisions; }, [decisions]);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return undefined;
    const mq = window.matchMedia("(min-width: 900px)");
    const onChange = (e) => setMobile(!e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => () => {
    clearTimeout(toastTimer.current);
    clearTimeout(advanceTimer.current);
  }, []);

  useEffect(() => {
    let live = true;
    supabase.auth.getUser().then(({ data }) => { if (live) setUser(data?.user || null); });
    return () => { live = false; };
  }, []);

  /* Job */
  useEffect(() => {
    if (!jobId) return undefined;
    let live = true;
    (async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, title, status, posted_at, created_at, location, position, market, job_type, salary_min, salary_max, currency, hr_id, company, department, skills, requirements, description, screening_questions")
        .eq("id", jobId)
        .maybeSingle();
      if (!live) return;
      if (error) { setJobError(error.message); return; }
      setJob(data || null);
      if (!data) setJobError("Job not found");
    })();
    return () => { live = false; };
  }, [jobId]);

  /* Applications — 037 columns first, base columns as the graceful
     fallback for a database that has not run the migration yet. */
  useEffect(() => {
    if (!jobId) return undefined;
    let live = true;
    const BASE = "id, job_id, candidate_id, candidate_name, candidate_email, candidate_phone, cv_snapshot, cv_file_path, ats_score, match_keywords, missing_keywords, ai_verdict, score_source, source, status, recruiter_notes, visa_status, applied_at, viewed_at, updated_at, is_visible_to_hr";
    (async () => {
      let { data, error } = await supabase
        .from("applications")
        .select(`${BASE}, screening_answers, reject_reason`)
        .eq("job_id", jobId)
        .order("ats_score", { ascending: false });
      if (error && /column|schema cache/i.test(error.message || "")) {
        ({ data, error } = await supabase
          .from("applications")
          .select(BASE)
          .eq("job_id", jobId)
          .order("ats_score", { ascending: false }));
      }
      if (!live) return;
      if (error) { setApps([]); setQueueIds([]); return; }
      const rows = data || [];
      setApps(rows);
      /* Snapshot the queue once: best match first, ties by oldest apply.
         Decisions keep their card in the queue (banner + undo) instead of
         yanking it out from under the recruiter. */
      const fresh = rows
        .filter((a) => NEW_STATUSES.has(a.status) && a.is_visible_to_hr !== false)
        .sort((a, b) => (Number(b.ats_score) || 0) - (Number(a.ats_score) || 0) || new Date(a.applied_at || 0) - new Date(b.applied_at || 0))
        .map((a) => a.id);
      setQueueIds(fresh);
    })();
    return () => { live = false; };
  }, [jobId]);

  const queue = useMemo(
    () => (queueIds || []).map((id) => (apps || []).find((a) => a.id === id)).filter(Boolean),
    [queueIds, apps],
  );
  const current = queue[idx] || null;
  const decision = current ? decisions[current.id] || null : null;

  const cv = useMemo(() => getCv(current), [current]);
  const personal = cv.personal || cv.basics || {};
  const parseFailed = useMemo(() => cvParseFailed(cv), [cv]);

  const readiness = useMemo(
    () => buildReadiness({ cv, application: current || {}, job: job || {} }),
    [cv, current, job],
  );
  const screening = useMemo(() => {
    const answers = Array.isArray(cv.screening_answers) ? cv.screening_answers : current?.screening_answers;
    return evaluateScreening(job?.screening_questions, answers);
  }, [cv, current, job]);
  const synthesis = useMemo(
    () => knockoutSynthesis({ readiness, screening }),
    [readiness, screening],
  );
  const knockoutActive = Boolean(synthesis);

  /* Asked state: reconcile from candidate_events on each candidate so the
     gap line goes quiet after she has asked, and survives a reload. Keyed
     by candidate_id (imported apps without one stay session only). */
  useEffect(() => {
    const cid = current?.candidate_id;
    if (!cid || !user?.id) { setAskedAt(null); return undefined; }
    let live = true;
    setAskedAt(null);
    (async () => {
      const { data } = await supabase
        .from("candidate_events")
        .select("created_at")
        .eq("hr_id", user.id)
        .eq("candidate_id", cid)
        .eq("event_type", "readiness_asked")
        .order("created_at", { ascending: false })
        .limit(1);
      if (live && data && data[0]) setAskedAt(data[0].created_at);
    })();
    return () => { live = false; };
  }, [current?.candidate_id, user?.id]);

  /* Default tab per candidate: Parsed CV, or Original CV when parsing
     failed and there is a document to show (frame 1j). */
  useEffect(() => {
    if (!current) return;
    setTab(cvParseFailed(getCv(current)) && current.cv_file_path ? "original" : "cv");
    setCvOpen(false); // never carry the full viewer across candidates
  }, [current?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── queue mechanics ── */
  const goTo = useCallback((i) => {
    if (i < 0 || i >= queue.length) return;
    setIdx(i);
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }, [queue.length, reduce]);

  const advance = useCallback(() => {
    const decided = decisionsRef.current;
    setIdx((cur) => {
      const after = queue.findIndex((c, i) => i > cur && !decided[c.id]);
      if (after >= 0) return after;
      const any = queue.findIndex((c) => !decided[c.id]);
      if (any >= 0) return any;
      setDone(true);
      return cur;
    });
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }, [queue, reduce]);

  const showToast = useCallback((text) => {
    clearTimeout(toastTimer.current);
    setToast(text);
    toastTimer.current = setTimeout(() => setToast(null), 4200);
  }, []);

  /* ── decisions ── */
  const decide = useCallback(async (app, kind, reasonCode) => {
    if (!app || decisions[app.id]) return;
    const reasonLabel = REJECT_REASONS.find((r) => r.code === reasonCode)?.label || null;
    const newStatus = kind === "shortlist" ? "shortlisted" : "rejected";
    const writes = buildStageMoveWrites({ app, newStatus, hrId: user?.id });
    const iso = writes.statusUpdate.updated_at;

    /* optimistic */
    setDecisions((d) => ({
      ...d,
      [app.id]: { kind, reasonCode, reasonLabel, prevStatus: app.status, prevUpdatedAt: app.updated_at },
    }));
    setLastActionId(app.id);
    setApps((prev) => (prev || []).map((a) => (a.id === app.id ? { ...a, status: newStatus, updated_at: iso } : a)));
    showToast(kind === "shortlist"
      ? `${app.candidate_name || "Candidate"} shortlisted`
      : `${app.candidate_name || "Candidate"} rejected${reasonLabel ? `: ${reasonLabel}` : ""}`);
    clearTimeout(advanceTimer.current);
    advanceTimer.current = setTimeout(advance, 750);

    /* persist — 037 reject fields with a status-only fallback */
    const base = writes.statusUpdate;
    const full = kind === "reject"
      ? {
          ...base,
          reject_reason: reasonCode,
          rejected_at: iso,
          reject_notify_at: new Date(new Date(iso).getTime() + 24 * 3600 * 1000).toISOString(),
        }
      : base;
    const res = await updateApplication(app.id, full, base);
    if (!res.ok) {
      /* honest failure: revert everything, keep the recruiter on the card */
      clearTimeout(advanceTimer.current);
      setDecisions((d) => { const n = { ...d }; delete n[app.id]; return n; });
      setLastActionId(null);
      setToast(null);
      setApps((prev) => (prev || []).map((a) => (a.id === app.id ? { ...a, status: app.status, updated_at: app.updated_at } : a)));
      setMoveError(`Couldn't save the decision on ${app.candidate_name || "this candidate"}. Check your connection and try again.`);
      return;
    }
    if (writes.event) {
      supabase.from("candidate_events").insert(writes.event).then(
        () => {},
        (e) => console.warn("[review] event insert failed:", e?.message || e), // eslint-disable-line no-console
      );
    }
    // Swipe-review writes its own path (not stageApi), so fire here too.
    trackHr("hr_candidate_stage_changed", { from_stage: app.status || null, to_stage: newStatus });
  }, [decisions, user?.id, advance, showToast]);

  const undo = useCallback(async () => {
    const id = lastActionId;
    if (!id) return;
    const d = decisions[id];
    const app = (apps || []).find((a) => a.id === id);
    if (!d || !app) return;
    clearTimeout(advanceTimer.current);
    const writes = buildStageMoveWrites({ app, newStatus: d.prevStatus, hrId: user?.id });
    setDecisions((prev) => { const n = { ...prev }; delete n[id]; return n; });
    setLastActionId(null);
    setToast(null);
    setDone(false);
    setApps((prev) => (prev || []).map((a) => (a.id === id ? { ...a, status: d.prevStatus, updated_at: writes.statusUpdate.updated_at } : a)));
    const at = queue.findIndex((c) => c.id === id);
    if (at >= 0) setIdx(at);

    const base = writes.statusUpdate;
    const full = d.kind === "reject"
      ? { ...base, reject_reason: null, rejected_at: null, reject_notify_at: null }
      : base;
    const res = await updateApplication(id, full, base);
    if (!res.ok) {
      setMoveError("Couldn't undo the last decision. Check your connection and try again.");
      return;
    }
    if (writes.event) {
      supabase.from("candidate_events").insert(writes.event).then(
        () => {},
        (e) => console.warn("[review] event insert failed:", e?.message || e), // eslint-disable-line no-console
      );
    }
  }, [lastActionId, decisions, apps, queue, user?.id]);

  const confirmReject = useCallback(() => {
    if (!current || !rejectReason) return;
    setRejectOpen(false);
    decide(current, "reject", rejectReason);
    setRejectReason(null);
  }, [current, rejectReason, decide]);

  /* Move-failure toast auto-dismisses. */
  useEffect(() => {
    if (!moveError) return undefined;
    const t = setTimeout(() => setMoveError(null), 6000);
    return () => clearTimeout(t);
  }, [moveError]);

  /* ── keyboard shortcuts (v1.5): right = shortlist, left = reject ── */
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || e.target?.isContentEditable) return;
      if (rejectOpen) {
        if (e.key === "Escape") { setRejectOpen(false); setRejectReason(null); }
        if (e.key === "Enter") confirmReject();
        return;
      }
      if (cvOpen) return; // the CV viewer owns the keyboard while open
      if (done || !current || decisions[current.id]) return;
      if (e.key === "ArrowRight") { e.preventDefault(); decide(current, "shortlist"); }
      if (e.key === "ArrowLeft") { e.preventDefault(); setRejectOpen(true); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [rejectOpen, cvOpen, done, current, decisions, decide, confirmReject]);

  /* Ask on WhatsApp → the EXISTING composer (region aware, regenerate),
     prefilled with a message that asks for exactly the gaps, in one
     message not five. Also records that she asked (candidate_events,
     reused via logWhatsappEvent) so the line can go quiet next time — the
     message body is never logged. */
  const requestDetails = useCallback(() => {
    const gaps = missingGaps(readiness);
    const list = humanJoin(gaps) || "a few details";
    setComposerMessage(
      `Hi ${givenName(current?.candidate_name, "there")}, quick question about your application for ${job?.title || "the role"}, could you confirm your ${list}? It helps us plan next steps.`,
    );
    setComposerOpen(true);
    const cid = current?.candidate_id;
    if (cid && user?.id) {
      logWhatsappEvent({
        candidateId: cid, jobId: job?.id, hrId: user.id,
        eventType: "readiness_asked", metadata: { gaps },
      }).catch(() => {});
    }
    setAskedAt(new Date().toISOString()); // optimistic; reconciled on reload
  }, [readiness, current, job, user]);

  const patchVerdict = useCallback((appId, v) => {
    if (!appId || !v || typeof v.score !== "number") return;
    setApps((prev) => (prev || []).map((a) => (
      a.id === appId ? { ...a, ai_verdict: v, ats_score: v.score, score_source: "sonnet_verdict" } : a
    )));
  }, []);

  const onNotesSaved = useCallback((appId, notes) => {
    setApps((prev) => (prev || []).map((a) => (a.id === appId ? { ...a, recruiter_notes: notes } : a)));
  }, []);

  /* ── derived render bits ── */
  const total = queue.length;
  const decidedCount = Object.keys(decisions).length;
  const shortCount = Object.values(decisions).filter((d) => d.kind === "shortlist").length;
  const rejCount = decidedCount - shortCount;
  const loading = apps === null || (!job && !jobError);
  const showDecisionBar = !done && !loading && total > 0 && current && !decision;

  const tabs = [
    { key: "original", label: "Original CV" },
    { key: "cv", label: "Parsed CV" },
    { key: "screening", label: "Screening", flag: Boolean(screening.failedMustHave) },
    { key: "notes", label: "Notes" },
  ];

  const skills = useMemo(() => {
    const list = cv.skills || cv.skill_list || cv.tools || [];
    return Array.isArray(list)
      ? dedupeSkills(list.map((s) => (typeof s === "string" ? s : s?.name || s?.label))).slice(0, 12)
      : [];
  }, [cv]);

  const desiredJob = cv.desired_job || cv.target_role || personal.headline || "";
  const cvExt = (current?.cv_file_path || "").split(".").pop() || "pdf";
  const cvFileName = `${current?.candidate_name || "candidate"} CV.${cvExt}`;

  /* ═════════ render ═════════ */
  return (
    <div className="rvm-root">
      <Helmet><title>{job?.title ? `Review · ${job.title} · CVPassport` : "Review · CVPassport"}</title></Helmet>

      {/* ── top bar ── */}
      <header className="rvm-topbar">
        <div className="rvm-topbar__left">
          <button type="button" className="rvm-iconbtn" onClick={() => navigate(`/employer/jobs/${jobId}`)} aria-label="Back to job">
            {Ic.back}
          </button>
          <div className="rvm-topbar__titles">
            <span className="rvm-topbar__job">{job?.title || (jobError ? "Job not found" : "Loading…")}</span>
            <span className="rvm-topbar__sub">Reviewing new applicants</span>
          </div>
        </div>
        {!done && total > 0 && (
          <div className="rvm-topbar__nav">
            <span className="rvm-topbar__counter">Candidate {Math.min(idx + 1, total)} of {total}</span>
            <span className="rvm-topbar__pager">
              <button type="button" className="rvm-iconbtn rvm-iconbtn--sm" onClick={() => goTo(idx - 1)} disabled={idx === 0} aria-label="Previous candidate">{Ic.prev}</button>
              <button type="button" className="rvm-iconbtn rvm-iconbtn--sm" onClick={() => goTo(idx + 1)} disabled={idx >= total - 1} aria-label="Next candidate">{Ic.next}</button>
            </span>
          </div>
        )}
      </header>

      <AnimatePresence>
        {moveError && (
          <motion.div
            className="rvm-moveerr"
            role="alert"
            initial={reduce ? false : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: EASE }}
          >
            <span>{moveError}</span>
            <button type="button" aria-label="Dismiss" onClick={() => setMoveError(null)}>{Ic.x}</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── loading ── */}
      {loading && !jobError && (
        <div className="rvm-body rvm-body--center" aria-hidden="true">
          <div className="rvm-card rvm-skelcard">
            <span className="rvm-skel__bar rvm-skel__bar--title" />
            <span className="rvm-skel__bar" style={{ width: "72%" }} />
            <span className="rvm-skel__bar" style={{ width: "58%" }} />
          </div>
        </div>
      )}

      {jobError && (
        <div className="rvm-body rvm-body--center">
          <div className="rvm-done">
            <div className="rvm-done__title">This job could not be loaded</div>
            <p className="rvm-done__body">It may have been removed, or the link is wrong.</p>
            <div className="rvm-done__acts">
              <button type="button" className="rvm-btn rvm-btn--primary" onClick={() => navigate("/employer/jobs")}>Back to jobs</button>
            </div>
          </div>
        </div>
      )}

      {/* ── empty queue: nothing to review (frame 1g) ── */}
      {!loading && !jobError && total === 0 && (
        <div className="rvm-body rvm-body--center">
          <motion.div
            className="rvm-done"
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            <span className="rvm-done__ic" aria-hidden="true">{Ic.done}</span>
            <div className="rvm-done__title">Nothing to review</div>
            <p className="rvm-done__body">
              New applicants land here first.{" "}
              {(apps || []).length > 0
                ? `Everyone in this pipeline has been reviewed: ${(apps || []).filter((a) => a.status !== "rejected").length} active, ${(apps || []).filter((a) => a.status === "rejected").length} rejected.`
                : "Share the job link or import CVs to get started."}
            </p>
            <div className="rvm-done__acts">
              <button type="button" className="rvm-btn" onClick={() => navigate("/employer/import")}>Import CVs</button>
              <button type="button" className="rvm-btn rvm-btn--primary" onClick={() => navigate(`/employer/jobs/${jobId}`)}>View pipeline</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── done: all caught up ── */}
      {!loading && !jobError && total > 0 && done && (
        <div className="rvm-body rvm-body--center">
          <motion.div
            className="rvm-done"
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            <span className="rvm-done__ic" aria-hidden="true">{Ic.done}</span>
            <div className="rvm-done__title">All caught up</div>
            <p className="rvm-done__body">
              You reviewed {total} new {total === 1 ? "applicant" : "applicants"}: {shortCount} shortlisted, {rejCount} rejected.
              Shortlisted candidates are waiting on the board.
            </p>
            <div className="rvm-done__acts">
              {lastActionId && <button type="button" className="rvm-btn" onClick={undo}>Undo last decision</button>}
              <button type="button" className="rvm-btn rvm-btn--primary" onClick={() => navigate(`/employer/jobs/${jobId}`)}>View pipeline</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ── the evaluation view ── */}
      {!loading && !jobError && !done && current && (
        <main className="rvm-body">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={current.id}
              className="rvm-grid"
              initial={reduce ? false : { opacity: 0, x: 14 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: -14 }}
              transition={{ duration: 0.24, ease: EASE }}
            >
              {/* left: the candidate */}
              <div className="rvm-left">
                <AnimatePresence initial={false}>
                  {decision && (
                    <motion.div
                      key="decided"
                      className={`rvm-banner rvm-banner--${decision.kind}`}
                      initial={reduce ? false : { opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2, ease: EASE }}
                    >
                      <span>
                        {decision.kind === "shortlist"
                          ? "Shortlisted. Moved to the Shortlist stage."
                          : `Rejected${decision.reasonLabel ? `: ${decision.reasonLabel}` : ""}. The candidate is not notified right away.`}
                      </span>
                      {lastActionId === current.id && (
                        <button type="button" className="rvm-btn rvm-btn--sm" onClick={undo}>Undo</button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* identity */}
                <section className="rvm-card rvm-id">
                  <div className="rvm-id__row">
                    <span className="rvm-id__name">{current.candidate_name || "Unnamed candidate"}</span>
                    <span className="rvm-id__chip">New</span>
                    {current.source === "imported" && <span className="rvm-id__chip rvm-id__chip--imported">Imported</span>}
                  </div>
                  <div className="rvm-id__sub">
                    {[desiredJob, current.applied_at ? `Applied ${timeAgo(current.applied_at)}` : ""].filter(Boolean).join(" · ")}
                  </div>
                </section>

                <ReadinessCard
                  readiness={readiness}
                  onAsk={requestDetails}
                  askedAt={askedAt}
                  firstName={givenName(current?.candidate_name, "")}
                  reduce={reduce}
                />

                {/* screening knockout surfaced next to the verdict (frame 1b) */}
                {screening.failedMustHave && (
                  <motion.div
                    className="rvm-kocard"
                    role="note"
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.28, ease: EASE, delay: reduce ? 0 : 0.07 }}
                  >
                    <span className="rvm-kocard__ic" aria-hidden="true">{Ic.warn}</span>
                    <span className="rvm-kocard__body">
                      <span className="rvm-kocard__title">Screening knockout</span>
                      <span className="rvm-kocard__text">
                        {screening.failedMustHave.note}.
                        {screening.failedMustHave.answer ? ` Answered: “${screening.failedMustHave.answer}”` : ""}
                      </span>
                      <button type="button" className="rvm-linkbtn" onClick={() => setTab("screening")}>View screening answer</button>
                    </span>
                  </motion.div>
                )}

                {/* THE verdict — shared card, shared loader, knockout override */}
                <VerdictCard
                  hideHeader
                  cacheKey={`${current.candidate_id || current.id}:${job?.id || ""}`}
                  cvSnapshot={cv}
                  job={job}
                  applicationId={current.id}
                  storedVerdict={current.ai_verdict}
                  onVerdictPersisted={(v) => patchVerdict(current.id, v)}
                  matchedKeywords={Array.isArray(current.match_keywords) ? current.match_keywords : []}
                  missingKeywords={Array.isArray(current.missing_keywords) ? current.missing_keywords : []}
                  knockout={knockoutActive ? { synthesis } : null}
                  onReachOut={(template) => { setComposerMessage(template || null); setComposerOpen(true); }}
                />

                {/* tabs: Original CV / Parsed CV / Screening / Notes */}
                <section className="rvm-card rvm-tabscard">
                  <div className="rvm-tabs" role="tablist" aria-label="Candidate documents">
                    {tabs.map((t) => (
                      <button
                        key={t.key}
                        type="button"
                        role="tab"
                        aria-selected={tab === t.key}
                        className={`rvm-tab${tab === t.key ? " rvm-tab--active" : ""}`}
                        onClick={() => { if (t.key === "original" || t.key === "cv") trackHr("hr_cv_viewed", { variant: t.key === "original" ? "original" : "parsed" }); setTab(t.key); }}
                      >
                        {t.label}
                        {t.flag && <span className="rvm-tab__flag" aria-label="Contains a knockout" />}
                      </button>
                    ))}
                  </div>
                  <div className="rvm-tabbody">
                    {tab === "original" && (
                      <OriginalCvPanel
                        path={current.cv_file_path}
                        fileName={cvFileName}
                        parseFailed={parseFailed}
                        onOpenViewer={current.cv_file_path ? () => setCvOpen(true) : null}
                        reduce={reduce}
                      />
                    )}
                    {tab === "cv" && (
                      <div className="rvm-parsed">
                        {parseFailed ? (
                          <div className="rvm-tabempty">
                            <span className="rvm-tabempty__title">Nothing could be parsed from this application</span>
                            <span className="rvm-tabempty__body">
                              {current.cv_file_path
                                ? "The original document is in the Original CV tab."
                                : "No document was uploaded and no profile fields were captured."}
                            </span>
                          </div>
                        ) : (
                          <>
                            {cv.summary && <p className="rvm-parsed__summary">{cv.summary}</p>}
                            {Array.isArray(cv.experience) && cv.experience.length > 0 && (
                              <div className="rvm-parsed__block">
                                <span className="rvm-card__eyebrow">Experience</span>
                                {cv.experience.slice(0, 6).map((e, i) => (
                                  <div className="rvm-parsed__exp" key={i}>
                                    <span className="rvm-parsed__exp-title">
                                      {[e.title, e.company].filter(Boolean).join(", ") || "Role"}
                                    </span>
                                    <span className="rvm-parsed__exp-meta">
                                      {[e.location, [e.start_date, e.end_date].filter(Boolean).join(" to ")].filter(Boolean).join(" · ")}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {skills.length > 0 && (
                              <div className="rvm-parsed__block">
                                <span className="rvm-card__eyebrow">Skills</span>
                                <div className="rvm-parsed__chips">
                                  {skills.map((s, i) => <span className="rvm-chip" key={i}>{s}</span>)}
                                </div>
                              </div>
                            )}
                            {current.cv_file_path && (
                              <button type="button" className="rvm-btn rvm-btn--sm" onClick={() => setTab("original")}>
                                View original CV
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                    {tab === "screening" && <ScreeningList screening={screening} />}
                    {tab === "notes" && <NotesTab app={current} onNotesSaved={onNotesSaved} />}
                  </div>
                </section>
              </div>

              {/* right: the job, for grounding. Always open on desktop,
                  one tap away on mobile (locked decision 4). */}
              <div className="rvm-right">
                <JobDescriptionPanel
                  key={mobile ? "jd-mobile" : "jd-desktop"}
                  job={job}
                  collapsible={mobile}
                  defaultOpen={false}
                  groundNote="The verdict already compares this candidate to the role. This panel grounds the verdict, it is not for manual comparison."
                  onDescriptionSaved={(text) => setJob((j) => (j ? { ...j, description: text } : j))}
                  reduce={reduce}
                />
              </div>
            </motion.div>
          </AnimatePresence>
        </main>
      )}

      {/* ── decision bar ── */}
      <AnimatePresence>
        {showDecisionBar && (
          <motion.div
            className="rvm-bar"
            initial={reduce ? false : { y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { y: 24, opacity: 0 }}
            transition={{ duration: 0.24, ease: EASE }}
          >
            <div className="rvm-bar__inner">
              <button type="button" className="rvm-decide rvm-decide--reject" onClick={() => setRejectOpen(true)}>
                {Ic.x} Reject
                {!mobile && <span className="rvm-key" aria-hidden="true">←</span>}
              </button>
              <span className="rvm-bar__hint">{mobile ? "" : "Decide, then the next new applicant loads"}</span>
              <button type="button" className="rvm-decide rvm-decide--shortlist" onClick={() => decide(current, "shortlist")}>
                {Ic.check} Shortlist
                {!mobile && <span className="rvm-key rvm-key--onsolid" aria-hidden="true">→</span>}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── reject modal (shared portal-wide) ── */}
      <RejectModal
        open={rejectOpen && !!current}
        title={`Reject ${current?.candidate_name || "candidate"}`}
        reason={rejectReason}
        onPick={setRejectReason}
        onCancel={() => { setRejectOpen(false); setRejectReason(null); }}
        onConfirm={confirmReject}
        mobile={mobile}
        reduce={reduce}
      />

      {/* ── toast ── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            className="rvm-toast"
            role="status"
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE }}
          >
            <span>{toast}</span>
            <button type="button" onClick={undo}>Undo</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-screen CV viewer — the same money screen as the pipeline's
          View CV, opened from the Original CV tab. */}
      {current && (
        <CvViewerOverlay
          open={cvOpen}
          onClose={() => setCvOpen(false)}
          path={current.cv_file_path}
          fileName={cvFileName}
          intel={{
            name: current.candidate_name || "Unnamed candidate",
            role: desiredJob || job?.title || "Candidate",
            location: personal.location || cv.location || "",
            visa: current.visa_status || cv.visa_status || "",
            notice: cv.notice_period || cv.availability || personal.notice_period || "",
            score: current.ats_score,
            scoreSource: current.score_source,
            matchedKeywords: Array.isArray(current.match_keywords) ? current.match_keywords : [],
            missingKeywords: Array.isArray(current.missing_keywords) ? current.missing_keywords : [],
            skills,
            appliedTo: job?.title
              ? [{
                  title: job.title,
                  when: current.applied_at
                    ? new Date(current.applied_at).toLocaleDateString(undefined, { day: "numeric", month: "short" })
                    : "",
                }]
              : [],
            email: current.candidate_email || "",
            // The composer is its own portal — close the viewer first so the
            // two full-screen layers never stack.
            onWhatsApp: () => { setCvOpen(false); setComposerMessage(null); setComposerOpen(true); },
          }}
          verdict={
            <VerdictCard
              hideHeader
              cacheKey={`${current.candidate_id || current.id}:${job?.id || ""}`}
              cvSnapshot={cv}
              job={job}
              applicationId={current.id}
              storedVerdict={current.ai_verdict}
              onVerdictPersisted={(v) => patchVerdict(current.id, v)}
              knockout={knockoutActive ? { synthesis } : null}
              onReachOut={(template) => { setCvOpen(false); setComposerMessage(template || null); setComposerOpen(true); }}
            />
          }
        />
      )}

      <WhatsAppComposer
        open={composerOpen && !!current}
        onClose={() => setComposerOpen(false)}
        initialMessage={composerMessage}
        candidate={current ? {
          id: current.candidate_id,
          name: current.candidate_name,
          phone: current.candidate_phone,
          cvSnapshot: cv,
        } : null}
        job={job ? { id: job.id, title: job.title, company: job.company } : null}
        hrId={user?.id}
        onLogged={() => {}}
      />

      {/* Review mode is the one full-screen portal screen outside HrShell,
          so the feedback affordance is mounted here too — reachable from
          every portal screen, not just the shell. */}
      <PortalFeedback />
    </div>
  );
}
