/**
 * Experience description → PDF: split on newlines and •, wrap with splitTextToSize.
 * Width uses pdfBufW(maxWidth) — always call setFontSize immediately before splitTextToSize.
 */
import {
  PDF_CONTENT_BOTTOM_Y,
  PDF_NEW_PAGE_TOP_Y,
  pdfBufW,
  pdfEnsureY,
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
  fontSize = 7.5
) {
  const text = String(rawText ?? "");
  if (!text.trim()) return startY;

  let y = startY;

  const drawLines = (lines) => {
    lines.forEach((line) => {
      y = pdfEnsureY(doc, y, lineHeight, bottomY, topYOnNewPage);
      doc.text(line, x, y);
      y += lineHeight;
    });
  };

  if (!/[•\n]/.test(text)) {
    doc.setFontSize(fontSize);
    const wrapped = doc.splitTextToSize(text.trim(), pdfBufW(maxWidth));
    drawLines(wrapped);
    return y;
  }

  const parts = text.split(/\n|•/).map((l) => l.trim()).filter(Boolean);
  if (parts.length === 0) return y;
  parts.forEach((part, i) => {
    const display = i === 0 ? part : `• ${part}`;
    doc.setFontSize(fontSize);
    const wrapped = doc.splitTextToSize(display, pdfBufW(maxWidth));
    drawLines(wrapped);
  });
  return y;
}
