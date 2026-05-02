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
const { buildUaeAtsTemplate19Html } = require("../src/serverLib/uaeAtsTemplate19Html");
const { drawT11SidebarStripeOnPdf } = require("../src/serverLib/pdfDrawT11SidebarStripe");
const { normalizeCvForPdf } = require("../src/serverLib/pdfCommon");

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
  19: buildUaeAtsTemplate19Html,
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

  const { html, templateId, cv, atsMode, maxPages } = body;

  const rawCvForLog = body.cv != null ? body.cv : cv;
  if (rawCvForLog && typeof rawCvForLog === "object") {
    console.log(
      "[generate-pdf] CV data for Puppeteer (normalized)",
      JSON.stringify(normalizeCvForPdf(rawCvForLog)),
    );
  }

  // Determine which HTML to render
  let finalHtml = html;
  if (!finalHtml && templateId && cv) {
    const builder = BUILDERS[templateId];
    if (builder) {
      finalHtml = builder(normalizeCvForPdf(cv));
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

    const layoutTrace = await page.evaluate(({ ats, templateId }) => {
      // Only run if templates implement semantic layout markers
      const main = document.querySelector(".cvp-main");
      const trace = {
        sawCvpMain: !!main,
        initialRootHeight: 0,
        initialBlockCount: 0,
        breaksInserted: 0,
        finalRootHeight: 0,
      };
      const rootEl = document.querySelector(".cvp-builder-a4-fit") || document.body;
      trace.initialRootHeight = Math.round(rootEl.getBoundingClientRect().height);
      trace.initialBlockCount = document.querySelectorAll("[data-block]").length;

      // Relaxation pass — runs for ALL templates (client-rendered HTML has
      // no .cvp-main so the pagination logic below is a no-op). Every
      // template wraps entries in EntryWrap with inline
      // `break-inside: avoid`, which Chromium respects during page.pdf()
      // even with screen media emulation. When an entry would straddle a
      // page boundary, Chromium pushes the whole entry to the next page —
      // leaving whitespace behind and inflating the page count. Strip the
      // constraint from any element large enough that keeping it intact
      // would blow a full page of whitespace; small entries keep the
      // constraint so single-job blocks still stay together.
      const PAGE_USABLE_PX = 1028; // A4 @ 96dpi minus 10mm top + 15mm bottom margins
      const SPLIT_THRESHOLD = PAGE_USABLE_PX * 0.35;
      let relaxedCount = 0;
      document
        .querySelectorAll('[style*="break-inside"], [style*="page-break-inside"]')
        .forEach((el) => {
          const h = el.getBoundingClientRect().height;
          if (h > SPLIT_THRESHOLD) {
            el.style.removeProperty("break-inside");
            el.style.removeProperty("page-break-inside");
            el.style.removeProperty("-webkit-column-break-inside");
            relaxedCount += 1;
          }
        });
      trace.breakInsideRelaxed = relaxedCount;

      // ─── T11 ROUND 2 FIX: text-stream reorder workaround ──────────────────
      // When Chromium has to defer an element with break-inside: avoid that
      // would straddle a page boundary, it emits subsequent siblings first
      // in the PDF content stream and emits the deferred element LAST.
      // The visual layout is correct (positions are computed once and
      // honored), but the text stream reads:
      //   bullets → EDUCATION → LANGUAGES → header
      // ATS readers parse text in stream order and see orphaned bullets
      // followed by a header at the end — destroying job-context for that
      // entry. Sidestep the deferral entirely by inserting an explicit
      // .cvp-page-break before any [data-block="job"] that would straddle.
      // The injected @media print rule (lines 102-103) turns
      // .cvp-page-break into break-before: page, forcing a clean page
      // start. T11-only because (a) only T11 has captured DOM with
      // [data-block="job"] but no .cvp-main wrapper to drive the existing
      // runSmartPagination, and (b) other templates either go through
      // runSmartPagination already (T12/T14) or have no [data-block="job"].
      let t11BreaksInserted = 0;
      if (Number(templateId) === 11) {
        // After the T11 staged-rollout fix (commit 18df25a) the page is
        // rendered with @page margin: 15mm + preferCSSPageSize, so usable
        // per page = 297mm - 30mm = 267mm = ~1009px @ 96dpi.
        const T11_PAGE_USABLE_PX = Math.round((267 * 96) / 25.4);
        const jobs = Array.from(
          document.querySelectorAll('[data-block="job"]'),
        );
        jobs.forEach((el) => {
          const r = el.getBoundingClientRect();
          // Subtract 1 from bottom to handle exact-boundary equality.
          const pageOfTop = Math.floor(r.top / T11_PAGE_USABLE_PX);
          const pageOfBottom = Math.floor((r.bottom - 1) / T11_PAGE_USABLE_PX);
          if (pageOfTop !== pageOfBottom && el.parentNode) {
            const brk = document.createElement("div");
            brk.className = "cvp-page-break";
            el.parentNode.insertBefore(brk, el);
            t11BreaksInserted += 1;
          }
        });
      }
      trace.t11BreaksInserted = t11BreaksInserted;

      if (!main) {
        trace.finalRootHeight = Math.round(rootEl.getBoundingClientRect().height);
        return trace;
      }

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
      const breaksBefore = document.querySelectorAll(".cvp-page-break").length;
      runSmartPagination();
      trace.breaksInserted = document.querySelectorAll(".cvp-page-break").length - breaksBefore;
      markPageStarts();
      autoScaleTypography();
      trace.finalRootHeight = Math.round(rootEl.getBoundingClientRect().height);
      return trace;
    }, { ats: Boolean(atsMode), templateId });
    console.log("[cvp-pdf-trace] server layout", {
      ...layoutTrace,
      maxPagesRequested: maxPages,
    });

    const maxPagesN = Number(maxPages);

    // ─── T11 STAGED ROLLOUT ─────────────────────────────────────────────────
    // Template 11 (Tech & IT Pro) is the only template currently routed
    // through a CSS-driven page-margin model. The captured T11 DOM applies
    // padding-top/bottom: 15mm and min-height: 297mm on its root; stacked on
    // top of the global Puppeteer margin: { top: 10mm, bottom: 15mm }, the
    // doubled top padding eats ~95px of page-1 usable area and the min-height
    // forces the document past the page boundary even for short CVs — which
    // orphans the LANGUAGES section onto a near-empty page 2.
    //
    // Fix: when templateId === 11, set Puppeteer margin to 0 and let the
    // wrapper-injected `@page { size: A4; margin: 15mm }` (see
    // src/downloadResumeFromPreview.js#buildCvPdfHtmlDocument) own the
    // page margin. Combined with the wrapper's strip of T11 root padding +
    // min-height, this collapses the duplicated whitespace and the orphan
    // disappears for light CVs.
    //
    // Templates 1-10 and 12-18 keep the existing config byte-for-byte.
    const isT11 = Number(templateId) === 11;

    const sharedPdfOpts = {
      format: "A4",
      printBackground: true,
      displayHeaderFooter: true,
      headerTemplate: "<div></div>",
      footerTemplate: `
    <div style="font-family: 'Inter', sans-serif; font-size: 9px; color: #94A3B8; width: 100%; text-align: center; margin-bottom: 5mm;">
      Page <span class="pageNumber"></span> of <span class="totalPages"></span>
    </div>`,
      ...(maxPagesN === 1 ? { pageRanges: "1" } : {}),
    };

    let pdfBuffer = await page.pdf(
      isT11
        ? {
            ...sharedPdfOpts,
            preferCSSPageSize: true,
            margin: { top: 0, right: 0, bottom: 0, left: 0 },
          }
        : {
            ...sharedPdfOpts,
            preferCSSPageSize: false,
            margin: {
              top: "10mm",
              bottom: "15mm",
              left: "0mm",
              right: "0mm",
            },
          },
    );

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
