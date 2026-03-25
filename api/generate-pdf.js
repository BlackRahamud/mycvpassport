const chromium = require("@sparticuz/chromium-min");
const puppeteer = require("puppeteer-core");

const { buildBannerTemplate1Html } = require("../src/serverLib/bannerTemplate1Html");
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
const { buildFinanceTemplate13Html } = require("../src/serverLib/financeTemplate13Html");

const BUILDERS = {
  1: buildBannerTemplate1Html,
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
  12: buildClassicTemplate12Html,
  13: buildFinanceTemplate13Html,
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

  const { html, templateId, cv } = body;

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
    await page.setContent(finalHtml, { waitUntil: "networkidle0" });

    const heightPx = await page.evaluate(() => {
      const el = document.querySelector(".cvp-root");
      return el ? el.scrollHeight : document.body.scrollHeight;
    });

    const pdfBuffer = await page.pdf({
      width: "794px",
      height: `${heightPx}px`,
      printBackground: true,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
    });

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
