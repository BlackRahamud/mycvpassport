/** A4 PDF layout constants (mm) — content area for page breaks */
export const PDF_PAGE_HEIGHT_MM = 297;
export const PDF_BOTTOM_MARGIN_MM = 15;
export const PDF_TOP_NEW_PAGE_MM = 15;

export const PDF_CONTENT_BOTTOM_Y = PDF_PAGE_HEIGHT_MM - PDF_BOTTOM_MARGIN_MM;
export const PDF_NEW_PAGE_TOP_Y = PDF_TOP_NEW_PAGE_MM;

/** Subtract 10mm from any splitTextToSize width (wrapping buffer) */
export const PDF_WRAP_WIDTH_BUFFER_MM = 10;

/** Page footer number color #888888 */
export const PDF_PAGE_NUM_COLOR = [136, 136, 136];

/**
 * @typedef {Object} PdfNewPageOptions
 * @property {number|null} [sidebarWidth] — mm; omit or null if no sidebar
 * @property {[number,number,number]|null} [sidebarColor] — RGB fill for sidebar (same as page 1)
 * @property {boolean} [hasHeader] — reserved for continuation headers
 * @property {[number,number,number]|null} [accentColor] — optional top strip (e.g. T8/T11 sidebar accent bar)
 */

/**
 * New page: optional sidebar background only (no repeated text). Returns content top Y.
 */
export function drawNewPage(doc, options = {}) {
  const { sidebarWidth, sidebarColor, accentColor } = options;
  doc.addPage();
  if (sidebarWidth != null && sidebarColor != null && Array.isArray(sidebarColor) && sidebarColor.length >= 3) {
    const [r, g, b] = sidebarColor;
    doc.setFillColor(r, g, b);
    doc.rect(0, 0, sidebarWidth, PDF_PAGE_HEIGHT_MM, "F");
    if (accentColor != null && Array.isArray(accentColor) && accentColor.length >= 3) {
      const [ar, ag, ab] = accentColor;
      doc.setFillColor(ar, ag, ab);
      doc.rect(0, 0, sidebarWidth, 3, "F");
    }
  }
  return PDF_NEW_PAGE_TOP_Y;
}

export function pdfBufW(maxWidthMm) {
  const w = Number(maxWidthMm);
  if (Number.isNaN(w)) return PDF_WRAP_WIDTH_BUFFER_MM;
  return Math.max(PDF_WRAP_WIDTH_BUFFER_MM, w - PDF_WRAP_WIDTH_BUFFER_MM);
}

/**
 * Before placing a line at baseline `y`, ensure room; otherwise drawNewPage with template options.
 */
export function pdfEnsureY(
  doc,
  y,
  lineHeightMm,
  bottomY = PDF_CONTENT_BOTTOM_Y,
  topY = PDF_NEW_PAGE_TOP_Y,
  newPageOptions = null
) {
  if (y + lineHeightMm > bottomY) {
    drawNewPage(doc, newPageOptions == null ? {} : newPageOptions);
    return topY;
  }
  return y;
}

/**
 * Measure wrapped lines using normal weight (splitTextToSize uses current font metrics),
 * then restore previous font + size so rendering stays correct (bold/italic unchanged).
 * setFont must precede setFontSize so measurement uses normal metrics.
 */
export function pdfSplitText(doc, text, maxWidthMm, fontSize) {
  const prev =
    typeof doc.getFont === "function"
      ? doc.getFont()
      : { fontName: "helvetica", fontStyle: "normal" };
  doc.setFont("helvetica", "normal");
  doc.setFontSize(fontSize);
  const lines = doc.splitTextToSize(String(text ?? ""), pdfBufW(maxWidthMm));
  doc.setFont(prev.fontName, prev.fontStyle);
  doc.setFontSize(fontSize);
  return lines;
}

/**
 * Draw each wrapped line with page breaks; returns y after last line.
 */
export function pdfDrawWrappedLines(
  doc,
  lines,
  x,
  y,
  lineHeightMm,
  bottomY,
  topY,
  textArgs,
  newPageOptions
) {
  let yy = y;
  lines.forEach((line) => {
    yy = pdfEnsureY(doc, yy, lineHeightMm, bottomY, topY, newPageOptions);
    if (textArgs) doc.text(line, x, yy, textArgs);
    else doc.text(line, x, yy);
    yy += lineHeightMm;
  });
  return yy;
}

/**
 * Split (with font size) + draw wrapped lines.
 * Measurement uses normal weight only; restores caller font for drawing (italic/bold preserved).
 */
export function pdfDrawWrappedText(
  doc,
  text,
  maxWidthMm,
  fontSize,
  x,
  y,
  lineHeightMm,
  bottomY,
  topY,
  textArgs,
  newPageOptions
) {
  const prevForDraw =
    typeof doc.getFont === "function"
      ? doc.getFont()
      : { fontName: "helvetica", fontStyle: "normal" };
  doc.setFont("helvetica", "normal");
  doc.setFontSize(fontSize);
  const lines = doc.splitTextToSize(String(text ?? ""), pdfBufW(maxWidthMm));
  doc.setFont(prevForDraw.fontName, prevForDraw.fontStyle);
  doc.setFontSize(fontSize);
  return pdfDrawWrappedLines(doc, lines, x, y, lineHeightMm, bottomY, topY, textArgs, newPageOptions);
}

/**
 * Single-line doc.text with overflow check (baseline y)
 */
export function pdfTextOneLine(doc, text, x, y, lineHeightMm, bottomY, topY, textArgs, newPageOptions) {
  let yy = pdfEnsureY(doc, y, lineHeightMm, bottomY, topY, newPageOptions);
  if (textArgs) doc.text(text, x, yy, textArgs);
  else doc.text(text, x, yy);
  return yy + lineHeightMm;
}

/**
 * Footer page numbers on every page (1…n), centered at x=105, y=291, font 8, #888888
 */
export function pdfFinalizePageNumbers(doc) {
  const n = typeof doc.internal.getNumberOfPages === "function" ? doc.internal.getNumberOfPages() : 1;
  for (let p = 1; p <= n; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...PDF_PAGE_NUM_COLOR);
    doc.text(String(p), 105, 291, { align: "center" });
  }
}
