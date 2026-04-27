/**
 * Client-side CV text extraction.
 *
 * Supported:
 *   .pdf  → unpdf (pdfjs under the hood) — text-based PDFs only
 *   .docx → mammoth
 *
 * Hard-failures (clear error to the user, do NOT silently score garbage):
 *   - encrypted PDF
 *   - image-only / scanned PDF (no extractable text)
 *   - unsupported file types
 *
 * The legacy upload path sent fileBase64 to the Edge Function, which only
 * looked at the first 500 chars of base64 (Phase 0 smoking gun). This
 * service replaces that flow: extract here, send TEXT to the Edge
 * Function.
 *
 * TODO (Day 3): tesseract.js fallback for image-only PDFs. Will lazy-load
 * the worker so the bundle stays slim — tracked under sprint #1
 * follow-up.
 */

import mammoth from "mammoth";

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

async function extractPdf(buffer) {
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
  if (text.length < MIN_TEXT_LENGTH) {
    throw new CvExtractionError(
      "image_pdf",
      "PDF has no extractable text",
      HINT_IMAGE_PDF,
    );
  }
  return text;
}

async function extractDocx(buffer) {
  try {
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
 * @returns {Promise<{ text: string, kind: "pdf" | "docx", chars: number }>}
 * @throws {CvExtractionError}
 */
export async function extractCvText(file) {
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
    const text = await extractPdf(buffer);
    return { text, kind: "pdf", chars: text.length };
  }
  const text = await extractDocx(buffer);
  return { text, kind: "docx", chars: text.length };
}
