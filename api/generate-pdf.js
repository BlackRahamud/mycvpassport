const chromium = require("@sparticuz/chromium-min");
const puppeteer = require("puppeteer-core");

const { pdfModernEmerald } = require("../src/serverLib/bannerTemplate1Html");
const { buildTwocolTemplate2Html } = require("../src/serverLib/twocolTemplate2Html");
const { buildSidebarTemplate3Html } = require("../src/serverLib/sidebarTemplate3Html");
const { buildTimelineTemplate4Html } = require("../src/serverLib/timelineTemplate4Html");
const { buildGulfExecTemplate5Html } = require("../src/serverLib/gulfExecTemplate5Html");
const { buildBankingTemplate6Html } = require("../src/serverLib/bankingTemplate6Html");
const { buildCompactProTemplate7Html } = require("../src/serverLib/compactProTemplate7Html");
const { buildCreativeSidebarTemplate8Html } = require("../src/serverLib/creativeSidebarTemplate8Html");
const { buildHospitalityTemplate9Html } = require("../src/serverLib/hospitalityTemplate9Html");
const { buildATSInternationalTemplate10Html } = require("../src/serverLib/atsInternationalTemplate10Html");
const { buildTechITProTemplate11Html } = require("../src/serverLib/techITProTemplate11Html");
const { buildClassicTemplate12Html } = require("../src/serverLib/classicTemplate12Html");
const { buildTemplate12Html } = require("../src/serverLib/template12Builder");
const { markPageStarts } = require("../src/serverLib/markPageStarts");
const { buildFinanceTemplate13Html } = require("../src/serverLib/financeTemplate13Html");
const { buildTemplate14Html } = require("../src/serverLib/template14Builder");
const { drawT11SidebarStripeOnPdf } = require("../src/serverLib/pdfDrawT11SidebarStripe");

const BUILDERS = {
  1: pdfModernEmerald,
  2: buildTwocolTemplate2Html,
  3: buildSidebarTemplate3Html,
  4: buildTimelineTemplate4Html,
  5: buildGulfExecTemplate5Html,
  6: buildBankingTemplate6Html,
  7: buildCompactProTemplate7Html,
  8: buildCreativeSidebarTemplate8Html,
  9: buildHospitalityTemplate9Html,
  10: buildATSInternationalTemplate10Html,
  11: buildTechITProTemplate11Html,
  12: (cv) => markPageStarts(buildTemplate12Html(cv), { PAGE_HEIGHT: 1027 }),
  13: buildFinanceTemplate13Html,
  14: (cv) => markPageStarts(buildTemplate14Html(cv), { PAGE_HEIGHT: 1027 }),
};

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).send("Method Not Allowed");
  }

  let body = req.body;
  if (body == null) return res.status(400).json({ error: "Missing body" });
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { return res.status(400).json({ error: "Invalid JSON" }); }
  }

  const { html, templateId, cv, atsMode } = body;

  // Determine which HTML to render
  let finalHtml = html;
  if (!finalHtml && templateId && cv) {
    const builder = BUILDERS[templateId];
    if (builder) {
      finalHtml = builder(cv);
    }
  }

  if (!finalHtml || typeof finalHtml !== "string") {
    return res.status(400).json({ error: "Missing html or templateId+cv" });
  }

  let browser = null;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(
        "https://github.com/Sparticuz/chromium/releases/download/v133.0.0/chromium-v133.0.0-pack.tar"
      ),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setViewport({
      width: 794,
      height: 1123,
      deviceScaleFactor: 2,
    });
    await page.setContent(finalHtml, { waitUntil: "networkidle0" });
    await Promise.race([
      page.evaluate(() => document.fonts.ready),
      new Promise((resolve) => setTimeout(resolve, 2000)),
    ]);
    await page.emulateMediaType("screen");

    await page.addStyleTag({
      content: `
        @media print {
          .cvp-page-break { break-before: page; page-break-before: always; }
          .cvp-new-page-start { margin-top: 10mm !important; padding-top: 5mm !important; }
          .cvp-main { padding-top: 4mm; }
          [data-block="job"], [data-block="list"] { break-inside: avoid !important; page-break-inside: avoid !important; }
          [data-block="section"] { break-inside: avoid; page-break-inside: avoid; }
          .section-title { break-after: avoid; page-break-after: avoid; }
          .section-title + * { break-before: avoid; page-break-before: avoid; }
          p, li { orphans: 3; widows: 3; }
        }
      `,
    });

    await page.evaluate((ats) => {
      // Only run if templates implement semantic layout markers
      const main = document.querySelector(".cvp-main");
      if (!main) return;

      const PAGE_HEIGHT = 1122; // ~A4 @ 96dpi (794x1123)
      const SAFE_MARGIN = 40;

      function applyATSMode() {
        if (!ats) return;
        const root = document.querySelector(".cvp-root");
        const sidebar = document.querySelector(".cvp-sidebar");
        const mainEl = document.querySelector(".cvp-main");
        if (root) root.style.display = "block";
        if (sidebar) {
          sidebar.style.position = "static";
          sidebar.style.width = "100%";
          sidebar.style.height = "auto";
        }
        if (mainEl) {
          mainEl.style.marginLeft = "0";
          mainEl.style.display = "block";
        }
      }

      function optimizeSpacing() {
        const sections = document.querySelectorAll(
          '[data-block="section"], [data-block="experience"], [data-block="education"]',
        );
        sections.forEach((section) => {
          const body = section.querySelector(".section-body");
          if (!body) return;
          const h = section.getBoundingClientRect().height;
          if (h > 600) {
            body.style.rowGap = "4px";
            body.style.marginTop = "4px";
            body.querySelectorAll("[data-block]").forEach((el) => {
              el.style.marginBottom = "4px";
            });
          }
        });
      }

      function runSmartPagination() {
        const blocks = Array.from(main.querySelectorAll("[data-block]"));
        if (!blocks.length) return;

        let cursorY = 0;
        const breaks = [];

        blocks.forEach((el, index) => {
          const h = el.getBoundingClientRect().height;
          const type = el.dataset.block;

          const next = blocks[index + 1];
          const nextH = next ? next.getBoundingClientRect().height : 0;

          let SAFE_MARGIN = 40;
          if (cursorY > PAGE_HEIGHT * 0.7) SAFE_MARGIN = 80;

          const projected = cursorY + h + nextH * 0.6;

          if (type === "job" || type === "list") {
            if (projected > PAGE_HEIGHT - SAFE_MARGIN) {
              breaks.push(el);
              cursorY = 0;
            }
            cursorY += h;
            return;
          }

          if (
            type === "section" ||
            type === "experience" ||
            type === "education"
          ) {
            const isLargeSection = h > PAGE_HEIGHT * 0.5;

            if (projected > PAGE_HEIGHT - SAFE_MARGIN) {
              if (isLargeSection) {
                cursorY += h;
              } else {
                breaks.push(el);
                cursorY = h;
              }
            } else {
              cursorY += h;
            }
            return;
          }

          cursorY += h;
        });

        breaks.forEach((el) => {
          const b = document.createElement("div");
          b.className = "cvp-page-break";
          el.parentNode && el.parentNode.insertBefore(b, el);
        });
      }

      function markPageStarts() {
        const PAGE_HEIGHT = 1027;
        const blocks = document.querySelectorAll("[data-block]");

        blocks.forEach((el) => {
          const rect = el.getBoundingClientRect();
          const pageIndex = Math.floor(rect.top / PAGE_HEIGHT);
          if (pageIndex > 0) {
            const distanceIntoPage = rect.top % PAGE_HEIGHT;
            if (distanceIntoPage < 20) {
              el.classList.add("cvp-new-page-start");
            }
          }
        });
      }

      function autoScaleTypography() {
        const root = document.querySelector(".cvp-root");
        if (!root) return;
        let scale = 1;

        const max = PAGE_HEIGHT;
        const height = () => root.getBoundingClientRect().height;

        // Only gently scale down if the first page is badly overflowing.
        while (height() > max && scale > 0.92) {
          scale -= 0.02;
          root.style.transform = `scale(${scale})`;
          root.style.transformOrigin = "top left";
          root.style.width = `${100 / scale}%`;
        }
      }

      applyATSMode();
      optimizeSpacing();
      runSmartPagination();
      markPageStarts();
      autoScaleTypography();
    }, Boolean(atsMode));

    let pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: false,
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate: `
    <div style="font-family: 'Inter', sans-serif; font-size: 9px; color: #94A3B8; width: 100%; text-align: center; margin-bottom: 5mm;">
      Page <span class="pageNumber"></span> of <span class="totalPages"></span>
    </div>`,
      margin: {
        top: "10mm",
        bottom: "15mm",
        left: "0mm",
        right: "0mm",
      },
    });

    // Template 11: repaint sidebar with a subtle per-page visual reset.
    // if (Number(templateId) === 11) {
    //   pdfBuffer = await drawT11SidebarStripeOnPdf(pdfBuffer, {
    //     page2TopOffset: 6,
    //     accentHeight: 3,
    //     drawSeparator: true,
    //   });
    // }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="cv.pdf"');
    return res.status(200).send(pdfBuffer);

  } catch (err) {
    console.error("generate-pdf error", err);
    return res.status(500).json({ error: err.message || String(err) });
  } finally {
    if (browser) await browser.close();
  }
};
