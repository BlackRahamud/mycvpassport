// =============================================================
// CvViewerOverlay — the recruiter's money screen.
//
// Full-height overlay: the ORIGINAL uploaded CV on the LEFT (~58%) rendered
// as clean white sheets, our candidate intelligence on the RIGHT (~42%) —
// score ring, AI verdict, skills match, applied-to jobs, outreach actions.
// Both sides scroll independently; Esc, backdrop click and the close button
// dismiss. Narrow screens stack: CV first, intelligence collapsible below.
//
// Rendering chain (never a dead panel):
//   pdf   → pdf.js canvases (lazy chunk; white sheets, our own zoom/page
//           controls — no native browser PDF chrome)
//   docx  → mammoth HTML on a white sheet (lazy; mammoth already a dep)
//   image → <img> sheet
//   anything else, or any renderer failure
//         → explicit file card with Download / open-in-new-tab anchors
//
// File bytes arrive via lib/hr/cvFile (authenticated download, re-typed
// blob) — the Part 1 verified open path. No window.open anywhere; anchors
// carry the gesture.
//
// Motion (all gated by useReducedMotion): backdrop fades + blurs, shell
// rises on a spring, sheets fade+rise with a short stagger as they render,
// intelligence blocks cascade, score ring animates once (ScoreRing rAF).
// Zoom animates via a transform pulse on re-render. Exit reverses ~0.2s.
// =============================================================
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { loadCvFile } from "../../lib/hr/cvFile";
// One pdf.js / docx render path, shared with the review mode's Original CV
// tab (src/lib/hr/cvDocEngine.js). Never re-inline a second copy here.
import { isStaleAsset, openPdfFromBlob, docxToHtml } from "../../lib/hr/cvDocEngine";
import usePdfPageCanvas from "./usePdfPageCanvas";
import ScoreRing from "./ScoreRing";
import { scoreBand } from "../../lib/ats/scoreBand";
import { trackHr } from "../../lib/analytics/hrEvents";
import "./cvViewerOverlay.css";

// Back-compat re-export: isStaleAsset used to live in this file.
export { isStaleAsset } from "../../lib/hr/cvDocEngine";

const EASE = [0.2, 0.9, 0.3, 1];
const SPRING = { type: "spring", stiffness: 380, damping: 34, mass: 0.9 };
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.6;
const ZOOM_STEP = 0.15;

/* ── icons ────────────────────────────────────────────────────── */
const Ic = {
  close: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>,
  download: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>,
  newTab: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>,
  zoomIn: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="11" y1="8" x2="11" y2="14" /><line x1="8" y1="11" x2="14" y2="11" /></svg>,
  zoomOut: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /><line x1="8" y1="11" x2="14" y2="11" /></svg>,
  fit: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" /><path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" /></svg>,
  doc: <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>,
  wa: <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.5 14.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.61.14-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.68-1.62-.93-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.5 0 1.47 1.07 2.9 1.22 3.1.15.2 2.1 3.2 5.1 4.49.71.3 1.27.49 1.7.63.72.23 1.37.2 1.88.12.58-.09 1.76-.72 2-1.42.25-.7.25-1.29.18-1.42-.08-.13-.28-.2-.58-.35z" /><path d="M12 2a10 10 0 0 0-8.66 15L2 22l5.14-1.35A10 10 0 1 0 12 2zm0 18.3a8.3 8.3 0 0 1-4.23-1.16l-.3-.18-3.05.8.81-2.97-.2-.31A8.32 8.32 0 1 1 12 20.3z" /></svg>,
  mail: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 6L2 7" /></svg>,
  chev: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9" /></svg>,
};

/* ── page canvas ──────────────────────────────────────────────── */
function PdfPage({ pdfDoc, pageNo, scale, reduce, onVisible }) {
  const { canvasRef, drawn } = usePdfPageCanvas({ pdfDoc, pageNo, scale });

  return (
    <motion.div
      className="cvv-page"
      data-page={pageNo}
      ref={onVisible}
      initial={reduce ? false : { opacity: 0, y: 14 }}
      animate={drawn ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.32, ease: EASE, delay: reduce ? 0 : Math.min(pageNo - 1, 5) * 0.06 }}
    >
      <canvas ref={canvasRef} aria-label={`CV page ${pageNo}`} />
    </motion.div>
  );
}

/* Page-shaped loading skeleton with a shimmer sweep. */
function SkeletonSheets({ reduce }) {
  return (
    <div className="cvv-skels" aria-hidden="true">
      {[0, 1].map((i) => (
        <div key={i} className={`cvv-page cvv-skel${reduce ? " cvv-skel--still" : ""}`} style={{ animationDelay: `${i * 0.12}s` }}>
          <div className="cvv-skel__bar cvv-skel__bar--title" />
          {Array.from({ length: 7 }, (_, j) => <div key={j} className="cvv-skel__bar" style={{ width: `${88 - (j % 3) * 14}%` }} />)}
        </div>
      ))}
    </div>
  );
}

/* Explicit end of the fallback chain — never a dead panel. */
function FileCard({ name, ext, downloadUrl, tabUrl, note }) {
  return (
    <div className="cvv-filecard">
      <span className="cvv-filecard__ic" aria-hidden="true">{Ic.doc}</span>
      <div className="cvv-filecard__body">
        <div className="cvv-filecard__name">{name}</div>
        <div className="cvv-filecard__meta">{note || `${(ext || "file").toUpperCase()} preview is not supported in the browser`}</div>
      </div>
      <div className="cvv-filecard__actions">
        {downloadUrl && <a className="cvv-btn cvv-btn--primary" href={downloadUrl} download={name}>{Ic.download} Download</a>}
        {tabUrl && <a className="cvv-btn" href={tabUrl} target="_blank" rel="noreferrer noopener">{Ic.newTab} Open in new tab</a>}
      </div>
    </div>
  );
}

/* ── intelligence rail blocks ─────────────────────────────────── */
function IntelBlock({ title, children, index, reduce }) {
  return (
    <motion.section
      className="cvv-block"
      initial={reduce ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: EASE, delay: reduce ? 0 : 0.08 + index * 0.05 }}
    >
      {title && <h3 className="cvv-block__title">{title}</h3>}
      {children}
    </motion.section>
  );
}

function IntelRail({ intel, verdict, reduce }) {
  const {
    name, role, location, visa, notice,
    score, scoreSource,
    matchedKeywords = [], missingKeywords = [], skills = [],
    appliedTo = [], email, onWhatsApp, downloadUrl, fileName,
  } = intel || {};
  const band = scoreBand(score, scoreSource);
  const hasScore = band !== "none";
  const initials = (name || "?").split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase() || "?";
  let i = 0;

  return (
    <div className="cvv-intel__inner">
      <IntelBlock index={i++} reduce={reduce}>
        <div className="cvv-id">
          <div className="cvv-id__avatar" aria-hidden="true">{initials}</div>
          <div className="cvv-id__meta">
            <div className="cvv-id__name">{name || "Unnamed candidate"}</div>
            {role && <div className="cvv-id__role">{role}</div>}
            <div className="cvv-id__badges">
              {location && <span className="cvv-badge">{location}</span>}
              {visa && <span className="cvv-badge">{visa}</span>}
              {notice && <span className="cvv-badge">{notice}</span>}
            </div>
          </div>
          {hasScore && (
            <ScoreRing
              score={score}
              source={scoreSource}
              size={68}
              strokeWidth={4}
              trackColor="var(--pj-border)"
              textColor="var(--pj-text)"
              labelColor="var(--pj-muted)"
              font="var(--pj-font)"
            />
          )}
        </div>
      </IntelBlock>

      {verdict && <IntelBlock index={i++} reduce={reduce}>{verdict}</IntelBlock>}

      {(matchedKeywords.length > 0 || missingKeywords.length > 0) && (
        <IntelBlock title="Skills match" index={i++} reduce={reduce}>
          {matchedKeywords.length > 0 && (
            <div className="cvv-kw">
              <span className="cvv-kw__label">Matched</span>
              <div className="cvv-kw__chips">
                {matchedKeywords.slice(0, 10).map((k, n) => <span key={`m-${n}`} className="cvv-chip cvv-chip--hit">{k}</span>)}
              </div>
            </div>
          )}
          {missingKeywords.length > 0 && (
            <div className="cvv-kw">
              <span className="cvv-kw__label">Missing</span>
              <div className="cvv-kw__chips">
                {missingKeywords.slice(0, 10).map((k, n) => <span key={`x-${n}`} className="cvv-chip cvv-chip--miss">{k}</span>)}
              </div>
            </div>
          )}
        </IntelBlock>
      )}

      {skills.length > 0 && (
        <IntelBlock title="Skills" index={i++} reduce={reduce}>
          <div className="cvv-kw__chips">
            {skills.slice(0, 14).map((s, n) => <span key={n} className="cvv-chip">{s}</span>)}
          </div>
        </IntelBlock>
      )}

      {appliedTo.length > 0 && (
        <IntelBlock title={`Applied to · ${appliedTo.length}`} index={i++} reduce={reduce}>
          <ul className="cvv-applied">
            {appliedTo.slice(0, 6).map((jobItem, n) => (
              <li key={n}>
                <span className="cvv-applied__title">{jobItem.title}</span>
                {jobItem.when && <span className="cvv-applied__when">{jobItem.when}</span>}
              </li>
            ))}
          </ul>
        </IntelBlock>
      )}

      <IntelBlock index={i++} reduce={reduce}>
        <div className="cvv-actions">
          {onWhatsApp && (
            <button type="button" className="cvv-btn cvv-btn--wa" onClick={onWhatsApp}>{Ic.wa} WhatsApp</button>
          )}
          {email && (
            <a className="cvv-btn" href={`mailto:${email}${role ? `?subject=${encodeURIComponent(`Re: ${role}`)}` : ""}`}>{Ic.mail} Email</a>
          )}
          {downloadUrl && (
            <a className="cvv-btn" href={downloadUrl} download={fileName}>{Ic.download} Download CV</a>
          )}
        </div>
      </IntelBlock>
    </div>
  );
}

/* ── main overlay ─────────────────────────────────────────────── */
export default function CvViewerOverlay({ open, onClose, path, fileName, intel, verdict }) {
  const reduce = useReducedMotion();
  const [file, setFile] = useState({ status: "idle" }); // idle|loading|ready|error|missing
  const [doc, setDoc] = useState(null);                 // { kind: 'pdf', pdf } | { kind:'html', html } | { kind:'img' } | { kind:'card' }
  const [attempt, setAttempt] = useState(0);
  const [scale, setScale] = useState(null);             // null until fit computed
  const [pageInView, setPageInView] = useState(1);
  const [intelOpen, setIntelOpen] = useState(false);    // narrow-screen collapse
  const stageRef = useRef(null);
  const blobUrlRef = useRef(null);
  const observerRef = useRef(null);

  const dlName = fileName || (path || "").split("/").pop() || "cv";

  // This overlay always shows the ORIGINAL uploaded document (parsed data
  // lives in the right rail / ReviewMode tabs). One event per open answers
  // "does she trust our parse or go back to the original CV?".
  useEffect(() => { if (open) trackHr("hr_cv_viewed", { variant: "original" }); }, [open]);

  /* Load bytes on open (the Part 1 verified path), then pick a renderer. */
  useEffect(() => {
    if (!open) return undefined;
    if (!path) { setFile({ status: "missing" }); return undefined; }
    let live = true;
    setFile({ status: "loading" });
    setDoc(null);
    setScale(null);
    setPageInView(1);
    (async () => {
      try {
        const loaded = await loadCvFile(path);
        if (!live) return;
        const blobUrl = URL.createObjectURL(loaded.blob);
        blobUrlRef.current = blobUrl;
        const base = {
          status: "ready",
          ext: loaded.ext,
          blobUrl,
          tabUrl: loaded.tabUrl || blobUrl,
          downloadUrl: loaded.downloadUrl || blobUrl,
        };
        setFile(base);

        if (loaded.ext === "pdf") {
          try {
            const pdf = await openPdfFromBlob(loaded.blob);
            if (live) setDoc({ kind: "pdf", pdf });
          } catch (e) {
            console.error(`CV viewer: pdf.js failed for "${path}":`, e?.message || e);
            // fallback chain, not a dead panel; a stale tab gets the truth
            if (live) setDoc(isStaleAsset(e) ? { kind: "stale" } : { kind: "card", note: "This PDF could not be rendered. Download it to view." });
          }
        } else if (loaded.ext === "docx") {
          try {
            const value = await docxToHtml(loaded.blob);
            if (live) setDoc(value ? { kind: "html", html: value } : { kind: "card" });
          } catch (e) {
            console.error(`CV viewer: docx convert failed for "${path}":`, e?.message || e);
            if (live) setDoc(isStaleAsset(e) ? { kind: "stale" } : { kind: "card", note: "This document could not be rendered. Download it to view." });
          }
        } else if (["png", "jpg", "jpeg", "webp"].includes(loaded.ext)) {
          setDoc({ kind: "img" });
        } else {
          setDoc({ kind: "card" });
        }
      } catch (e) {
        console.error(`CV viewer failed to load "${path}":`, e?.message || e, e);
        if (live) setFile({ status: "error" });
      }
    })();
    return () => {
      live = false;
      if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
    };
  }, [open, path, attempt]);

  /* Destroy the pdf.js doc when it changes / on close. */
  useEffect(() => () => { doc?.pdf?.destroy?.(); }, [doc]);

  /* Fit-width once the pdf and the stage both exist. */
  useEffect(() => {
    if (doc?.kind !== "pdf" || scale != null) return undefined;
    let live = true;
    (async () => {
      try {
        const page = await doc.pdf.getPage(1);
        if (!live || !stageRef.current) return;
        const stageW = stageRef.current.clientWidth - 48; // stage padding
        const naturalW = page.getViewport({ scale: 1 }).width;
        setScale(Math.min(Math.max(stageW / naturalW, ZOOM_MIN), 1.6));
      } catch { if (live) setScale(1); }
    })();
    return () => { live = false; };
  }, [doc, scale]);

  const fitToWidth = useCallback(() => setScale(null), []); // re-triggers the fit effect

  /* Track which page is in view for the page indicator. */
  const observePage = useCallback((el) => {
    if (!el) return;
    if (!observerRef.current && typeof IntersectionObserver !== "undefined" && stageRef.current) {
      observerRef.current = new IntersectionObserver((entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible) setPageInView(Number(visible.target.dataset.page) || 1);
      }, { root: stageRef.current, threshold: [0.25, 0.5] });
    }
    observerRef.current?.observe(el);
  }, []);
  useEffect(() => () => { observerRef.current?.disconnect(); observerRef.current = null; }, [open]);

  /* Esc closes; body scroll locks while open. */
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const numPages = doc?.kind === "pdf" ? doc.pdf.numPages : 0;
  const zoomPct = scale ? Math.round(scale * 100) : 100;

  const railIntel = useMemo(
    () => ({ ...intel, downloadUrl: file.downloadUrl, fileName: dlName }),
    [intel, file.downloadUrl, dlName],
  );

  const stageBody = () => {
    if (file.status === "loading" || file.status === "idle") return <SkeletonSheets reduce={reduce} />;
    if (file.status === "missing") {
      return <div className="cvv-status">This candidate has no uploaded CV file, only the parsed profile.</div>;
    }
    if (file.status === "error") {
      return (
        <div className="cvv-status cvv-status--error">
          <p>Couldn&rsquo;t load this CV. It may have been removed, or your connection dropped.</p>
          <button type="button" className="cvv-btn" onClick={() => setAttempt((a) => a + 1)}>Try again</button>
        </div>
      );
    }
    if (doc?.kind === "pdf" && scale != null) {
      return (
        <motion.div
          key={`zoom-${zoomPct}`}
          className="cvv-pages"
          initial={reduce ? false : { scale: 0.985, opacity: 0.92 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2, ease: EASE }}
        >
          {Array.from({ length: numPages }, (_, n) => (
            <PdfPage key={`${n + 1}@${zoomPct}`} pdfDoc={doc.pdf} pageNo={n + 1} scale={scale} reduce={reduce} onVisible={observePage} />
          ))}
        </motion.div>
      );
    }
    if (doc?.kind === "pdf") return <SkeletonSheets reduce={reduce} />; // fit pending
    if (doc?.kind === "html") {
      return (
        <motion.div
          className="cvv-page cvv-sheet"
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: EASE }}
          // mammoth output: whitelisted structural HTML from the docx, no scripts.
          dangerouslySetInnerHTML={{ __html: doc.html }}
        />
      );
    }
    if (doc?.kind === "img") {
      return (
        <motion.div className="cvv-page cvv-sheet cvv-sheet--img" initial={reduce ? false : { opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32, ease: EASE }}>
          <img src={file.blobUrl} alt={dlName} />
        </motion.div>
      );
    }
    if (doc?.kind === "stale") {
      return (
        <div className="cvv-status cvv-status--error">
          <p>CVPassport was updated since this page loaded. Refresh to open the new viewer.</p>
          <button type="button" className="cvv-btn cvv-btn--primary" onClick={() => window.location.reload()}>Refresh page</button>
        </div>
      );
    }
    if (doc?.kind === "card") {
      return <FileCard name={dlName} ext={file.ext} downloadUrl={file.downloadUrl} tabUrl={file.tabUrl} note={doc.note} />;
    }
    return <SkeletonSheets reduce={reduce} />;
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="cvv-backdrop"
          className="cvv-backdrop"
          onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: EASE }}
        >
          <motion.div
            key="cvv-shell"
            className="cvv-shell"
            role="dialog"
            aria-modal="true"
            aria-label={`${intel?.name || "Candidate"} CV`}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 26 }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 14 }}
            transition={reduce ? { duration: 0.2 } : { ...SPRING, opacity: { duration: 0.22, ease: EASE } }}
          >
            {/* document side */}
            <section className="cvv-doc">
              <div className="cvv-toolbar">
                <div className="cvv-toolbar__meta">
                  <span className="cvv-toolbar__name">{dlName}</span>
                  {numPages > 0 && <span className="cvv-toolbar__pages">Page {pageInView} / {numPages}</span>}
                </div>
                {doc?.kind === "pdf" && (
                  <div className="cvv-toolbar__zoom" role="group" aria-label="Zoom">
                    <button type="button" className="cvv-tool" onClick={() => setScale((s) => Math.max((s || 1) - ZOOM_STEP, ZOOM_MIN))} aria-label="Zoom out">{Ic.zoomOut}</button>
                    <span className="cvv-toolbar__pct">{zoomPct}%</span>
                    <button type="button" className="cvv-tool" onClick={() => setScale((s) => Math.min((s || 1) + ZOOM_STEP, ZOOM_MAX))} aria-label="Zoom in">{Ic.zoomIn}</button>
                    <button type="button" className="cvv-tool" onClick={fitToWidth} aria-label="Fit to width" title="Fit to width">{Ic.fit}</button>
                  </div>
                )}
                <div className="cvv-toolbar__acts">
                  {file.status === "ready" && (
                    <>
                      <a className="cvv-tool" href={file.downloadUrl} download={dlName} aria-label="Download CV" title="Download">{Ic.download}</a>
                      <a className="cvv-tool" href={file.tabUrl} target="_blank" rel="noreferrer noopener" aria-label="Open in new tab" title="Open in new tab">{Ic.newTab}</a>
                    </>
                  )}
                  <button type="button" className="cvv-tool cvv-tool--close cvv-tool--close-doc" onClick={onClose} aria-label="Close viewer">{Ic.close}</button>
                </div>
              </div>
              <div className="cvv-stage" ref={stageRef}>
                {stageBody()}
              </div>
            </section>

            {/* intelligence side */}
            <aside className="cvv-intel">
              <div className="cvv-intel__head">
                <button
                  type="button"
                  className="cvv-intel__toggle"
                  onClick={() => setIntelOpen((v) => !v)}
                  aria-expanded={intelOpen}
                >
                  <span>Candidate intelligence</span>
                  <span className={`cvv-intel__chev${intelOpen ? " is-open" : ""}`} aria-hidden="true">{Ic.chev}</span>
                </button>
                <span className="cvv-intel__title" aria-hidden="true">Candidate intelligence</span>
                <button type="button" className="cvv-tool cvv-tool--close" onClick={onClose} aria-label="Close viewer">{Ic.close}</button>
              </div>
              <div className={`cvv-intel__scroll${intelOpen ? " is-open" : ""}`}>
                <IntelRail intel={railIntel} verdict={verdict} reduce={reduce} />
              </div>
            </aside>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
