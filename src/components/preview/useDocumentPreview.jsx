import { useEffect, useMemo, useRef, useState } from "react";
import { ResumePreview, ResumePreviewBoundary } from "../../ResumePreview";
import { buildPaginatedDocument, changedFieldGroup } from "../../lib/preview/printSim";

/**
 * useDocumentPreview — owns the canonical 794px template render (the ONE
 * node the PDF export captures) and turns it into paginated document HTML
 * via the shared print simulation.
 *
 * Returns:
 *  - measureNode: mount once, anywhere — offscreen but laid out
 *  - doc: { html, pageCount, geo, sectionRects, tick } | null
 *  - pulse: { group, tick } | null — which section the last edit landed in
 *
 * Debounce: 150ms on fine pointers, 400ms on touch devices (typing on a
 * mid-range phone must never wait on pagination); template switches and
 * the first build render immediately.
 */
export default function useDocumentPreview({ cv, template, captureRef }) {
  const fitRef = useRef(null);
  const [doc, setDoc] = useState(null);
  const [pulse, setPulse] = useState(null);
  const prevCvRef = useRef(undefined);
  const prevTemplateIdRef = useRef(undefined);
  const timerRef = useRef(null);
  const builtOnceRef = useRef(false);

  const debounceMs = useMemo(
    () =>
      typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches
        ? 400
        : 150,
    [],
  );

  useEffect(() => {
    const group = changedFieldGroup(prevCvRef.current, cv);
    const templateChanged = prevTemplateIdRef.current !== template?.id;
    prevCvRef.current = cv;
    prevTemplateIdRef.current = template?.id;

    const run = () => {
      const el = fitRef.current;
      if (!el) return;
      try {
        const built = buildPaginatedDocument(el, template?.id);
        setDoc({ ...built, tick: Date.now() });
        if (group && builtOnceRef.current) setPulse({ group, tick: Date.now() });
        builtOnceRef.current = true;
        // Parity hook — scripts/verify-preview-parity.mjs reads this to
        // compare the live preview's pagination against the exported PDF.
        window.__cvpPreviewParity = {
          templateId: template?.id ?? null,
          pageCount: built.pageCount,
          pageStarts: built.pageStarts,
        };
      } catch (e) {
        // Preview pagination must never take the builder down — the
        // measuring render itself is still live for PDF capture.
        // eslint-disable-next-line no-console
        console.warn("[doc-preview] pagination failed:", e?.message || e);
      }
    };

    if (!builtOnceRef.current || templateChanged) {
      clearTimeout(timerRef.current);
      run();
      return undefined;
    }
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(run, debounceMs);
    return () => clearTimeout(timerRef.current);
  }, [cv, template, debounceMs]);

  // Webfonts settling after the first build change line wraps — rebuild once.
  useEffect(() => {
    let live = true;
    if (typeof document !== "undefined" && document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (!live || !fitRef.current) return;
        try {
          setDoc({ ...buildPaginatedDocument(fitRef.current, prevTemplateIdRef.current), tick: Date.now() });
        } catch {
          /* first build already covers rendering */
        }
      });
    }
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setFit = (el) => {
    fitRef.current = el;
    if (captureRef) captureRef.current = el;
  };

  const measureNode = (
    <div
      className="dp-measure"
      aria-hidden="true"
      style={{
        position: "fixed",
        left: -12000,
        top: 0,
        width: 794,
        pointerEvents: "none",
        zIndex: -1,
      }}
    >
      {/* min-height/radius/shadow neutralised so measurement matches the
          print wrapper, not the on-screen card styling. */}
      <div
        className="cvp-builder-a4-fit"
        ref={setFit}
        style={{ minHeight: "unset", height: "auto", borderRadius: 0, boxShadow: "none" }}
      >
        <ResumePreviewBoundary resetKey={template?.id}>
          <ResumePreview cv={cv} template={template} />
        </ResumePreviewBoundary>
      </div>
    </div>
  );

  return { measureNode, doc, pulse };
}
