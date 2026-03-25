/**
 * Post-process Puppeteer PDF for Template 11:
 * - paint the left sidebar background (#1E2D45) per page
 * - on page 2+, apply a small top offset to create a clear page-boundary cue
 * - accent bar only on page 1 (optional)
 *
 * Same approach as pdfDrawT8SidebarStripe — draw shapes then embedded page on top.
 */

const { PDFDocument, rgb } = require("pdf-lib");

const SIDEBAR_RATIO = 0.34;
const SIDEBAR = rgb(0x1e / 255, 0x2d / 255, 0x45 / 255);
const ACCENT = rgb(0x4a / 255, 0x90 / 255, 0xd9 / 255);
const WHITE = rgb(1, 1, 1);

/**
 * @typedef {object} T11StripeOptions
 * @property {number} [page2TopOffset] Offset (PDF units) for pages 2+
 * @property {number} [accentHeight] Accent bar height (PDF units) on page 1
 * @property {boolean} [drawSeparator] Draw a thin separator line at the offset edge
 */

/**
 * @param {Buffer|Uint8Array} pdfBuffer
 * @param {T11StripeOptions} [opts]
 * @returns {Promise<Buffer>}
 */
async function drawT11SidebarStripeOnPdf(pdfBuffer, opts = {}) {
  const page2TopOffset = Number.isFinite(opts.page2TopOffset) ? opts.page2TopOffset : 6;
  const accentHeight = Number.isFinite(opts.accentHeight) ? opts.accentHeight : 3;
  const drawSeparator = opts.drawSeparator !== false;

  const buffer = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);
  const sourcePdf = await PDFDocument.load(buffer);
  const newPdf = await PDFDocument.create();
  const pageCount = sourcePdf.getPageCount();

  for (let i = 0; i < pageCount; i++) {
    const [embeddedPage] = await newPdf.embedPdf(buffer, [i]);
    const w = embeddedPage.width;
    const h = embeddedPage.height;
    const page = newPdf.addPage([w, h]);

    const sideW = w * SIDEBAR_RATIO;
    const isNewPage = i > 0;
    const topOffset = isNewPage ? page2TopOffset : 0;

    // Sidebar background (page 2+ starts slightly lower to avoid “infinite strip” illusion)
    page.drawRectangle({
      x: 0,
      y: topOffset,
      width: sideW,
      height: h - topOffset,
      color: SIDEBAR,
      borderWidth: 0,
    });

    // Accent top bar only on the first page
    if (!isNewPage && accentHeight > 0) {
      page.drawRectangle({
        x: 0,
        y: 0,
        width: sideW,
        height: accentHeight,
        color: ACCENT,
        borderWidth: 0,
      });
    }

    // Optional separator line at the new-page offset edge
    if (isNewPage && drawSeparator && topOffset > 0) {
      page.drawLine({
        start: { x: 0, y: topOffset },
        end: { x: sideW, y: topOffset },
        thickness: 0.3,
        color: WHITE,
        opacity: 0.6,
      });
    }

    page.drawPage(embeddedPage, {
      x: 0,
      y: 0,
      width: w,
      height: h,
    });
  }

  const outBytes = await newPdf.save();
  return Buffer.from(outBytes);
}

module.exports = { drawT11SidebarStripeOnPdf };
