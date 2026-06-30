// =============================================================
// CvDrawer
//
// In-context CV viewer for the recruiter. Clicking View CV opens the full CV
// in a right-hand slide-over (not a new tab, not a screen split). Reuses the
// shared ResumePdfViewer and mints a short-lived signed URL client-side (the
// recruiter is authenticated; RLS confirms they own the application pointing
// at the file). Download sits behind a quiet icon at the top of the viewer.
//
// Dismisses on close button, Esc, and click-outside. Full-screen on mobile.
// Motion: panel slides translateX 100->0 (0.28s), backdrop fades (0.2s);
// reduced motion falls back to a plain opacity fade.
// =============================================================
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { supabase } from "../../appSupabaseClient";
import ResumePdfViewer from "../ResumePdfViewer";

const EASE = [0.2, 0.9, 0.3, 1];
const SIGNED_URL_TTL = 300; // 5 minutes

function CloseIc() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
}
function DownloadIc() {
  return <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>;
}

export default function CvDrawer({ open, path, fileName, onClose }) {
  const reduce = useReducedMotion();
  const [state, setState] = useState({ loading: true, inlineUrl: null, downloadUrl: null, error: null });

  // Mint signed URLs when the drawer opens. An inline URL for the embed and a
  // download-disposition URL so the download saves directly (no new tab).
  useEffect(() => {
    if (!open || !path) return undefined;
    let live = true;
    setState({ loading: true, inlineUrl: null, downloadUrl: null, error: null });
    (async () => {
      try {
        const store = supabase.storage.from("applicant-cvs");
        const [inline, dl] = await Promise.all([
          store.createSignedUrl(path, SIGNED_URL_TTL),
          store.createSignedUrl(path, SIGNED_URL_TTL, { download: fileName || true }),
        ]);
        if (!live) return;
        if (inline.error || !inline.data?.signedUrl) throw inline.error || new Error("No signed URL");
        setState({
          loading: false,
          inlineUrl: inline.data.signedUrl,
          downloadUrl: dl.data?.signedUrl || inline.data.signedUrl,
          error: null,
        });
      } catch (e) {
        console.error("CV drawer load failed:", e);
        if (live) setState({ loading: false, inlineUrl: null, downloadUrl: null, error: "Could not load this CV. Please try again." });
      }
    })();
    return () => { live = false; };
  }, [open, path, fileName]);

  // Esc to close.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

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
                {state.downloadUrl && (
                  <a className="cvd-iconbtn" href={state.downloadUrl} aria-label="Download CV" title="Download CV">
                    <DownloadIc />
                  </a>
                )}
                <button type="button" className="cvd-iconbtn" onClick={onClose} aria-label="Close">
                  <CloseIc />
                </button>
              </div>
            </header>
            <div className="cvd-body">
              {state.loading ? (
                <div className="cvd-status">Loading CV…</div>
              ) : state.error ? (
                <div className="cvd-status cvd-status--error">{state.error}</div>
              ) : (
                <ResumePdfViewer src={state.inlineUrl} height="100%" />
              )}
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
