/**
 * Experience description → PDF: split on newlines / bullets, wrap via pdfSplitText (normal metrics + pdfBufW).
 */
import {
  PDF_CONTENT_BOTTOM_Y,
  PDF_NEW_PAGE_TOP_Y,
  pdfEnsureY,
  pdfSplitText,
} from "./pdfA4Layout";

export function renderPdfExperiencePoints(
  doc,
  rawText,
  x,
  startY,
  maxWidth,
  lineHeight,
  bottomY = PDF_CONTENT_BOTTOM_Y,
  topYOnNewPage = PDF_NEW_PAGE_TOP_Y,
  fontSize = 7.5,
  newPageOptions = null
) {
  const text = String(rawText ?? "");
  if (!text.trim()) return startY;

  let y = startY;

  const drawLines = (lines) => {
    lines.forEach((line) => {
      y = pdfEnsureY(doc, y, lineHeight, bottomY, topYOnNewPage, newPageOptions);
      doc.text(line, x, y);
      y += lineHeight;
    });
  };

  const parts = text.split(/[\n•]+/).map((s) => s.trim()).filter(Boolean);
  if (parts.length === 0) return startY;

  parts.forEach((part, i) => {
    const display = i === 0 ? part : `• ${part}`;
    doc.setFont("helvetica", "normal");
    const wrapped = pdfSplitText(doc, display, maxWidth, fontSize);
    drawLines(wrapped);
  });
  return y;
}
