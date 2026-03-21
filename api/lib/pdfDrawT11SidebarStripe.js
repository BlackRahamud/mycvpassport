/**
 * Post-process Puppeteer PDF for Template 11: paint full-height sidebar strip (#1E2D45) on every page.
 * Same approach as pdfDrawT8SidebarStripe — draw rectangle then embedded page on top.
 */

const { PDFDocument, rgb } = require("pdf-lib");

const SIDEBAR_RATIO = 0.34;
const SIDEBAR = rgb(0x1e / 255, 0x2d / 255, 0x45 / 255);

/**
 * @param {Buffer|Uint8Array} pdfBuffer
 * @returns {Promise<Buffer>}
 */
async function drawT11SidebarStripeOnPdf(pdfBuffer) {
  const buffer = Buffer.isBuffer(pdfBuffer) ? pdfBuffer : Buffer.from(pdfBuffer);
  const sourcePdf = await PDFDocument.load(buffer);
  const newPdf = await PDFDocument.create();
  const pageCount = sourcePdf.getPageCount();

  for (let i = 0; i < pageCount; i++) {
    const [embeddedPage] = await newPdf.embedPdf(buffer, [i]);
    const w = embeddedPage.width;
    const h = embeddedPage.height;
    const page = newPdf.addPage([w, h]);

    page.drawRectangle({
      x: 0,
      y: 0,
      width: w * SIDEBAR_RATIO,
      height: h,
      color: SIDEBAR,
      borderWidth: 0,
    });

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
