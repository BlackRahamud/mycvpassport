/**
 * cvDocEngine — the ONE pdf.js / docx render path for original CV files.
 *
 * Extracted from CvViewerOverlay so the review mode's Original CV tab and
 * the overlay share a single engine: one lazy pdfjs chunk, one worker
 * wiring, one stale-deploy detector, one docx converter. Never fork this —
 * "View CV works here, not there" bugs come from second render paths.
 *
 * The worker is served from public/pdf.worker.min.js
 * (scripts/copy-pdf-worker.mjs keeps it in lockstep with pdfjs-dist).
 */
import { blobToArrayBuffer } from "./cvFile";

/* Lazy pdf.js: loaded only when a PDF actually opens. */
export async function getPdfjs() {
  const pdfjs = await import(/* webpackChunkName: "pdfjs" */ "pdfjs-dist");
  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = `${process.env.PUBLIC_URL || ""}/pdf.worker.min.js`;
  }
  return pdfjs;
}

/* A tab left open across a deploy asks for lazy chunks (pdfjs, mammoth) or a
   worker that no longer exist on the server. That is not "preview not
   supported", it is a stale page: detect it so the UI can say refresh. */
export function isStaleAsset(e) {
  if (e?.name === "ChunkLoadError") return true;
  const m = String(e?.message || e || "");
  return /loading chunk|chunkloaderror/i.test(m)
    || /failed to fetch dynamically imported module/i.test(m)
    || /does not match the worker version/i.test(m)
    || /fake worker failed/i.test(m)
    || /importscripts/i.test(m)
    || /unexpected token '?</i.test(m) // HTML served where JS was expected
    || /networkerror|failed to fetch/i.test(m);
}

/* One immediate retry for transient fetch blips; webpack 5 re-requests a
   failed chunk on the next import(). A dead deployment fails both attempts. */
export async function withRetry(fn) {
  try { return await fn(); } catch (e) {
    if (!isStaleAsset(e)) throw e;
    return fn();
  }
}

/* blob → live pdf.js document (caller owns destroy()). */
export async function openPdfFromBlob(blob) {
  return withRetry(async () => {
    const pdfjs = await getPdfjs();
    const bytes = await blobToArrayBuffer(blob);
    return pdfjs.getDocument({ data: bytes }).promise;
  });
}

/* docx blob → sanitised structural HTML (mammoth, lazy chunk). */
export async function docxToHtml(blob) {
  return withRetry(async () => {
    const mammoth = await import(/* webpackChunkName: "mammoth" */ "mammoth/mammoth.browser");
    const bytes = await blobToArrayBuffer(blob);
    return (await mammoth.convertToHtml({ arrayBuffer: bytes })).value;
  });
}
