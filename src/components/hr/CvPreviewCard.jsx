// =============================================================
// CvPreviewCard
//
// Compact CV affordance for the candidate detail. The full CV no longer
// sits open on the profile; this small card is the attention content and
// opens the CV on demand (a slide-over drawer in stage two; in stage one
// it opens the signed CV via the parent's onView handler).
//
// Page count is a nicety, not a blocker. It is fetched lazily and OFF the
// scan path: the pipeline query never loads the file. We mint a short
// signed URL, read the PDF bytes, and count pages with pdf-lib (dynamically
// imported so it stays out of the main bundle). Results are cached per
// path, so re-selecting a candidate never refetches. Any failure is
// swallowed — the card still renders, just without the count.
// =============================================================
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { supabase } from "../../appSupabaseClient";

const EASE = [0.2, 0.9, 0.3, 1];
const pageCache = new Map(); // path -> page count

function fileExt(path) {
  const base = (path || "").split("/").pop() || "";
  const dot = base.lastIndexOf(".");
  return dot > -1 ? base.slice(dot + 1).toLowerCase() : "";
}

function DocIc() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="13" y2="17" />
    </svg>
  );
}
function EyeIc() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>;
}

export default function CvPreviewCard({ path, name, onView }) {
  const reduce = useReducedMotion();
  const ext = fileExt(path);
  const isPdf = ext === "pdf";
  const [pages, setPages] = useState(() => (path && pageCache.has(path) ? pageCache.get(path) : null));

  useEffect(() => {
    if (!path || !isPdf || pages != null) return undefined;
    let live = true;
    (async () => {
      try {
        const { data, error } = await supabase.storage.from("applicant-cvs").createSignedUrl(path, 120);
        if (error || !data?.signedUrl) return;
        const res = await fetch(data.signedUrl);
        const buf = await res.arrayBuffer();
        const { PDFDocument } = await import("pdf-lib");
        const doc = await PDFDocument.load(buf, { updateMetadata: false });
        const count = doc.getPageCount();
        pageCache.set(path, count);
        if (live) setPages(count);
      } catch {
        /* page count is a nicety; never block the card on it */
      }
    })();
    return () => { live = false; };
  }, [path, isPdf, pages]);

  if (!path) return null;

  const typeLabel = ext ? ext.toUpperCase() : "Document";
  const meta = [typeLabel, isPdf && pages ? `${pages} ${pages === 1 ? "page" : "pages"}` : null].filter(Boolean).join(" · ");
  const title = name ? `${name}'s CV` : "Candidate CV";

  return (
    <section className="jpp-section">
      <motion.button
        type="button"
        className="jpp-cvcard"
        onClick={onView}
        whileTap={reduce ? undefined : { scale: 0.99 }}
        transition={{ duration: 0.12, ease: EASE }}
      >
        <span className="jpp-cvcard__thumb" aria-hidden="true"><DocIc /></span>
        <span className="jpp-cvcard__body">
          <span className="jpp-cvcard__title">{title}</span>
          <span className="jpp-cvcard__meta">{meta}</span>
        </span>
        <span className="jpp-cvcard__cta"><EyeIc /> View CV</span>
      </motion.button>
    </section>
  );
}
