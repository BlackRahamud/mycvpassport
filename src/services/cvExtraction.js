/**
 * Client-side CV text extraction.
 *
 * Supported:
 *   .pdf  → unpdf (pdfjs under the hood) — text-based PDFs first; image-only
 *           PDFs fall back to tesseract.js OCR when the caller opts in
 *           (`{ ocrFallback: true }`).
 *   .docx → mammoth
 *
 * Hard-failures (clear error to the user, do NOT silently score garbage):
 *   - encrypted PDF
 *   - image-only / scanned PDF with NO opt-in OCR (or OCR still yields nothing)
 *   - unsupported file types
 *
 * The legacy upload path sent fileBase64 to the Edge Function, which only
 * looked at the first 500 chars of base64 (Phase 0 smoking gun). This
 * service replaces that flow: extract here, send TEXT to the Edge
 * Function.
 *
 * OCR is OFF by default so the in-builder scan keeps its current behaviour
 * (a clean "scanned PDF" error). The HR bulk-CV import passes
 * `{ ocrFallback: true }` to opt into the tesseract.js path — both the OCR
 * worker and tesseract.js itself are lazy-loaded so the main bundle stays
 * slim and only the import flow pays the weight.
 */

export class CvExtractionError extends Error {
  constructor(code, message, hint) {
    super(message);
    this.name = "CvExtractionError";
    this.code = code;
    this.hint = hint;
  }
}

const MIN_TEXT_LENGTH = 200;

const HINT_ENCRYPTED =
  "This PDF is password-protected. Save an unprotected copy or export to DOCX, then re-upload.";
const HINT_IMAGE_PDF =
  "This looks like a scanned-image PDF — there's no extractable text. We're adding OCR support shortly. For now, please paste the text manually or upload a text-based PDF or DOCX.";
const HINT_UNSUPPORTED = "Only PDF and DOCX files are supported right now.";

// OCR caps. Scanned CVs are 1-3 pages; the cap is an abuse/cost guard for a
// pathological 200-page scan. Render at 2x so small print stays legible to
// tesseract without ballooning canvas memory.
const OCR_MAX_PAGES = 8;
const OCR_RENDER_SCALE = 2;

/**
 * Image-only-PDF OCR fallback. Renders each page of an already-loaded pdfjs
 * document proxy to a canvas and runs tesseract.js over it. Lazy-loads
 * tesseract.js (worker + wasm + eng traineddata fetched from CDN at runtime,
 * so nothing heavy ships in the main bundle). Returns merged page text, or
 * "" if OCR is unavailable / yields nothing — the caller decides whether ""
 * becomes a hard image_pdf error.
 *
 * @param {object} doc  pdfjs PDFDocumentProxy (from unpdf getDocumentProxy)
 */
async function ocrPdfDoc(doc) {
  if (typeof document === "undefined") return ""; // browser-only path
  const numPages = Number(doc?.numPages) || 0;
  if (!numPages) return "";

  const Tesseract = (await import(/* webpackChunkName: "tesseract" */ "tesseract.js")).default;
  const worker = await Tesseract.createWorker("eng");
  try {
    const pages = Math.min(numPages, OCR_MAX_PAGES);
    let out = "";
    for (let i = 1; i <= pages; i++) {
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: OCR_RENDER_SCALE });
      const canvas = document.createElement("canvas");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      const ctx = canvas.getContext("2d");
      await page.render({ canvasContext: ctx, viewport }).promise;
      const { data } = await worker.recognize(canvas);
      out += `${(data?.text || "").trim()}\n\n`;
      // Release the canvas backing store between pages.
      canvas.width = 0;
      canvas.height = 0;
    }
    return out.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").trim();
  } finally {
    await worker.terminate();
  }
}

async function extractPdf(buffer, { ocrFallback = false } = {}) {
  // Lazy-load unpdf so the parser only ships when a user actually scans.
  const { extractText, getDocumentProxy } = await import("unpdf");
  let doc;
  try {
    doc = await getDocumentProxy(new Uint8Array(buffer));
  } catch (err) {
    const m = String(err && err.message ? err.message : err).toLowerCase();
    if (m.includes("password") || m.includes("encrypted")) {
      throw new CvExtractionError(
        "encrypted_pdf",
        "Encrypted PDF rejected",
        HINT_ENCRYPTED,
      );
    }
    throw new CvExtractionError(
      "pdf_load_failed",
      `PDF could not be loaded: ${err && err.message ? err.message : err}`,
      "Try re-saving or exporting from a different tool.",
    );
  }
  const result = await extractText(doc, { mergePages: true });
  const raw =
    typeof result === "string"
      ? result
      : Array.isArray(result?.text)
        ? result.text.join("\n\n")
        : String(result?.text ?? "");
  const text = raw.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").trim();
  if (text.length >= MIN_TEXT_LENGTH) {
    return { text, ocr: false };
  }

  // Native extraction came up short → image-only / scanned PDF. OCR only when
  // the caller opted in (HR bulk import); otherwise keep the honest error.
  if (ocrFallback) {
    let ocrText = "";
    try {
      ocrText = await ocrPdfDoc(doc);
    } catch (err) {
      // OCR failure (worker/CDN/render) is non-fatal — fall through to the
      // clean image_pdf error rather than scoring garbage.
      // eslint-disable-next-line no-console
      console.warn("[cvExtraction] OCR fallback failed:", err && err.message ? err.message : err);
    }
    if (ocrText.length >= MIN_TEXT_LENGTH) {
      return { text: ocrText, ocr: true };
    }
  }

  throw new CvExtractionError(
    "image_pdf",
    "PDF has no extractable text",
    HINT_IMAGE_PDF,
  );
}

async function extractDocx(buffer) {
  try {
    const mammoth = (await import(/* webpackChunkName: "mammoth" */ "mammoth")).default;
    const { value } = await mammoth.extractRawText({ arrayBuffer: buffer });
    const text = (value ?? "").trim();
    if (text.length < MIN_TEXT_LENGTH) {
      throw new CvExtractionError(
        "docx_too_short",
        "DOCX produced very little text",
        "Confirm the file isn't blank or corrupted.",
      );
    }
    return text;
  } catch (err) {
    if (err instanceof CvExtractionError) throw err;
    throw new CvExtractionError(
      "docx_load_failed",
      `DOCX could not be parsed: ${err && err.message ? err.message : err}`,
      "Re-save as DOCX from Word or Google Docs.",
    );
  }
}

/**
 * Extract plain text from a user-uploaded CV file.
 *
 * @param {File} file
 * @param {{ ocrFallback?: boolean }} [opts]  ocrFallback: OCR image-only PDFs
 *        via tesseract.js (default false — the in-builder scan keeps its clean
 *        "scanned PDF" error; HR bulk import opts in).
 * @returns {Promise<{ text: string, kind: "pdf" | "docx", chars: number, ocr: boolean }>}
 * @throws {CvExtractionError}
 */
export async function extractCvText(file, { ocrFallback = false } = {}) {
  if (!file) {
    throw new CvExtractionError(
      "no_file",
      "No file provided",
      "Pick a PDF or DOCX to upload.",
    );
  }
  const name = String(file.name ?? "").toLowerCase();
  const isPdf = file.type === "application/pdf" || name.endsWith(".pdf");
  const isDocx =
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx");

  if (!isPdf && !isDocx) {
    throw new CvExtractionError(
      "unsupported_type",
      "Unsupported file type",
      HINT_UNSUPPORTED,
    );
  }

  let buffer;
  try {
    buffer = await file.arrayBuffer();
  } catch (err) {
    throw new CvExtractionError(
      "file_read_failed",
      `Could not read file: ${err && err.message ? err.message : err}`,
      "Try re-selecting the file.",
    );
  }

  if (isPdf) {
    const { text, ocr } = await extractPdf(buffer, { ocrFallback });
    return { text, kind: "pdf", chars: text.length, ocr };
  }
  const text = await extractDocx(buffer);
  return { text, kind: "docx", chars: text.length, ocr: false };
}
