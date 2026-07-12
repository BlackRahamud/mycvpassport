import { useEffect, useRef, useState } from "react";

/**
 * usePdfPageCanvas — the single canvas render effect for one PDF page.
 * Shared by CvViewerOverlay's sheets and the review mode's Original CV tab
 * so both surfaces draw through the exact same pdf.js path (dpr capping,
 * render-task cancel, cancelled-render silencing).
 */
export default function usePdfPageCanvas({ pdfDoc, pageNo, scale }) {
  const canvasRef = useRef(null);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    let live = true;
    let task = null;
    (async () => {
      try {
        const page = await pdfDoc.getPage(pageNo);
        if (!live || !canvasRef.current) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = page.getViewport({ scale: scale * dpr });
        const canvas = canvasRef.current;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width / dpr}px`;
        canvas.style.height = `${viewport.height / dpr}px`;
        task = page.render({ canvasContext: canvas.getContext("2d"), viewport });
        await task.promise;
        if (live) setDrawn(true);
      } catch (e) {
        if (e?.name !== "RenderingCancelledException") {
          console.error(`CV render: page ${pageNo} failed:`, e?.message || e); // eslint-disable-line no-console
        }
      }
    })();
    return () => { live = false; task?.cancel?.(); };
  }, [pdfDoc, pageNo, scale]);

  return { canvasRef, drawn };
}
