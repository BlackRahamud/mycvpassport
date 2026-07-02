// =============================================================
// CvDrawer
//
// In-context CV viewer for the recruiter. Clicking View CV opens the full CV
// in a right-hand slide-over (not a new tab, not a screen split).
//
// Reliability contract (the "works on my machine" class of bug lives here):
// - The file bytes are fetched through the authenticated Storage API
//   (`download()`), not by pointing an iframe at a signed URL. RLS confirms
//   this recruiter owns the application pointing at the file. The blob is
//   re-typed to application/pdf for .pdf paths so legacy uploads stored as
//   application/octet-stream render inline instead of triggering a download.
// - Non-PDF files (doc/docx/images) are NEVER iframed — browsers respond to
//   an un-renderable iframe source by downloading it on every open. They get
//   an explicit file card with Download / open-in-new-tab anchors instead.
// - Every failure renders an honest error with a Retry button and logs the
//   reason; a missing path renders an honest empty state. No dead panels.
// - No window.open anywhere: download and new-tab are plain anchors, so they
//   run inside the user's click gesture and are never popup-blocked.
//
// Dismisses on close button, Esc, and click-outside. Full-screen on mobile.
// Motion: panel slides translateX 100->0 (0.28s), backdrop fades (0.2s);
// reduced motion falls back to a plain opacity fade.
// =============================================================
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { supabase } from "../../appSupabaseClient";

const EASE = [0.2, 0.9, 0.3, 1];
const SIGNED_URL_TTL = 300; // 5 minutes — download / new-tab links

const MIME_BY_EXT = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};

export function fileExt(path) {
  const base = (path || "").split("/").pop() || "";
  const dot = base.lastIndexOf(".");
  return dot > -1 ? base.slice(dot + 1).toLowerCase() : "";
}

function CloseIc() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
}
function DownloadIc() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>;
}
function DocIc() {
  return <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>;
}

/* Fetch the file as an authenticated blob + mint signed URLs for the
   download / new-tab anchors. Exported for tests. */
export async function loadCvFile(path) {
  const store = supabase.storage.from("applicant-cvs");
  const ext = fileExt(path);

  const [file, inline, dl] = await Promise.all([
    store.download(path),
    store.createSignedUrl(path, SIGNED_URL_TTL),
    store.createSignedUrl(path, SIGNED_URL_TTL, { download: true }),
  ]);
  if (file.error || !file.data) throw file.error || new Error("Storage download returned no data");

  // Re-type the blob from the path extension: legacy uploads saved as
  // application/octet-stream would otherwise download instead of render.
  const mime = MIME_BY_EXT[ext] || file.data.type || "application/octet-stream";
  const blob = file.data.type === mime ? file.data : new Blob([file.data], { type: mime });

  return {
    blob,
    ext,
    // Signed URLs are a nicety for the anchors; if minting failed we fall
    // back to the blob URL so download/new-tab still work.
    tabUrl: inline.data?.signedUrl || null,
    downloadUrl: dl.data?.signedUrl || null,
  };
}

export default function CvDrawer({ open, path, fileName, onClose }) {
  const reduce = useReducedMotion();
  const [state, setState] = useState({ status: "idle", blobUrl: null, ext: "", tabUrl: null, downloadUrl: null });
  const [attempt, setAttempt] = useState(0); // bump to retry
  const blobUrlRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    if (!path) {
      // Honest empty state — never a spinner that spins forever.
      setState({ status: "missing", blobUrl: null, ext: "", tabUrl: null, downloadUrl: null });
      return undefined;
    }
    let live = true;
    setState((s) => ({ ...s, status: "loading" }));
    (async () => {
      try {
        const { blob, ext, tabUrl, downloadUrl } = await loadCvFile(path);
        if (!live) return;
        const blobUrl = URL.createObjectURL(blob);
        blobUrlRef.current = blobUrl;
        setState({ status: "ready", blobUrl, ext, tabUrl: tabUrl || blobUrl, downloadUrl: downloadUrl || blobUrl });
      } catch (e) {
        // Log the concrete reason — "dead click" debugging starts here.
        console.error(`CV drawer failed to load "${path}":`, e?.message || e, e);
        if (live) setState({ status: "error", blobUrl: null, ext: "", tabUrl: null, downloadUrl: null });
      }
    })();
    return () => {
      live = false;
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [open, path, attempt]);

  // Esc to close.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const isPdf = state.ext === "pdf";
  const dlName = fileName || (path || "").split("/").pop() || "cv";

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="cvd-overlay"
          className="cvd-overlay"
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: EASE }}
        >
          <motion.aside
            key="cvd-panel"
            className="cvd-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Candidate CV"
            initial={reduce ? { opacity: 0 } : { x: "100%" }}
            animate={reduce ? { opacity: 1 } : { x: 0 }}
            exit={reduce ? { opacity: 0 } : { x: "100%" }}
            transition={{ duration: 0.28, ease: EASE }}
          >
            <header className="cvd-head">
              <div className="cvd-head__title">{fileName || "Candidate CV"}</div>
              <div className="cvd-head__tools">
                {state.status === "ready" && (
                  <a className="cvd-iconbtn" href={state.downloadUrl} download={dlName} aria-label="Download CV" title="Download CV">
                    <DownloadIc />
                  </a>
                )}
                <button type="button" className="cvd-iconbtn" onClick={onClose} aria-label="Close">
                  <CloseIc />
                </button>
              </div>
            </header>
            <div className="cvd-body">
              {state.status === "loading" || state.status === "idle" ? (
                <div className="cvd-status">Loading CV…</div>
              ) : state.status === "missing" ? (
                <div className="cvd-status">This candidate has no uploaded CV file — only the parsed profile.</div>
              ) : state.status === "error" ? (
                <div className="cvd-status cvd-status--error">
                  <p>Couldn&rsquo;t load this CV. It may have been removed, or your connection dropped.</p>
                  <button type="button" className="cvd-retry" onClick={() => setAttempt((a) => a + 1)}>
                    Try again
                  </button>
                </div>
              ) : isPdf ? (
                <>
                  <iframe
                    title="Resume preview"
                    src={state.blobUrl}
                    className="cvd-frame"
                  />
                  <div className="cvd-foot">
                    Cannot see the CV here?{" "}
                    <a href={state.tabUrl} target="_blank" rel="noreferrer noopener">Open it in a new tab</a>.
                  </div>
                </>
              ) : (
                /* Non-PDF: browsers can't render these inline — an iframe
                   would trigger a download on every open. Explicit card. */
                <div className="cvd-filecard">
                  <span className="cvd-filecard__ic" aria-hidden="true"><DocIc /></span>
                  <div className="cvd-filecard__body">
                    <div className="cvd-filecard__name">{dlName}</div>
                    <div className="cvd-filecard__meta">{(state.ext || "file").toUpperCase()} — preview not supported in the browser</div>
                  </div>
                  <div className="cvd-filecard__actions">
                    <a className="cvd-btn cvd-btn--primary" href={state.downloadUrl} download={dlName}>
                      <DownloadIc /> Download
                    </a>
                    <a className="cvd-btn" href={state.tabUrl} target="_blank" rel="noreferrer noopener">
                      Open in new tab
                    </a>
                  </div>
                </div>
              )}
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
