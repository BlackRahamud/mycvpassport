/** A4 PDF layout constants (mm) — content area for page breaks */
export const PDF_PAGE_HEIGHT_MM = 297;
export const PDF_BOTTOM_MARGIN_MM = 15;
export const PDF_TOP_NEW_PAGE_MM = 15;

export const PDF_CONTENT_BOTTOM_Y = PDF_PAGE_HEIGHT_MM - PDF_BOTTOM_MARGIN_MM;
export const PDF_NEW_PAGE_TOP_Y = PDF_TOP_NEW_PAGE_MM;

/** Subtract 4mm from any splitTextToSize width (wrapping buffer) */
export const PDF_WRAP_WIDTH_BUFFER_MM = 4;

export function pdfBufW(maxWidthMm) {
  const w = Number(maxWidthMm);
  if (Number.isNaN(w)) return PDF_WRAP_WIDTH_BUFFER_MM;
  return Math.max(PDF_WRAP_WIDTH_BUFFER_MM, w - PDF_WRAP_WIDTH_BUFFER_MM);
}

/**
 * Before placing a line of text at baseline `y`, ensure room for that line (same rule as user spec).
 * @returns adjusted baseline y (same or top of new page)
 */
export function pdfEnsureY(doc, y, lineHeightMm, bottomY = PDF_CONTENT_BOTTOM_Y, topY = PDF_NEW_PAGE_TOP_Y) {
  if (y + lineHeightMm > bottomY) {
    doc.addPage();
    return topY;
  }
  return y;
}

/**
 * setFontSize then splitTextToSize with buffered width
 */
export function pdfSplitText(doc, text, maxWidthMm, fontSize) {
  doc.setFontSize(fontSize);
  return doc.splitTextToSize(String(text ?? ""), pdfBufW(maxWidthMm));
}

/**
 * Draw each wrapped line with page breaks; returns y after last line.
 * Optional textArgs (e.g. { align: "center" }) passed to doc.text.
 */
export function pdfDrawWrappedLines(doc, lines, x, y, lineHeightMm, bottomY, topY, textArgs) {
  let yy = y;
  lines.forEach((line) => {
    yy = pdfEnsureY(doc, yy, lineHeightMm, bottomY, topY);
    if (textArgs) doc.text(line, x, yy, textArgs);
    else doc.text(line, x, yy);
    yy += lineHeightMm;
  });
  return yy;
}

/**
 * Split (with font size) + draw wrapped lines
 */
export function pdfDrawWrappedText(doc, text, maxWidthMm, fontSize, x, y, lineHeightMm, bottomY, topY, textArgs) {
  const lines = pdfSplitText(doc, text, maxWidthMm, fontSize);
  return pdfDrawWrappedLines(doc, lines, x, y, lineHeightMm, bottomY, topY, textArgs);
}

/**
 * Single-line doc.text with overflow check (baseline y)
 */
export function pdfTextOneLine(doc, text, x, y, lineHeightMm, bottomY, topY, textArgs) {
  let yy = pdfEnsureY(doc, y, lineHeightMm, bottomY, topY);
  if (textArgs) doc.text(text, x, yy, textArgs);
  else doc.text(text, x, yy);
  return yy + lineHeightMm;
}
