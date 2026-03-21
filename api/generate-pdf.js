/**
 * Vercel serverless: CV → PDF via Puppeteer + @sparticuz/chromium.
 * POST { templateId, cv } — supported: 1–8.
 */

const chromium = require("@sparticuz/chromium");
const puppeteer = require("puppeteer-core");
const { buildBannerTemplate1Html } = require("./lib/bannerTemplate1Html");
const { buildTwocolTemplate2Html } = require("./lib/twocolTemplate2Html");
const { buildSidebarTemplate3Html } = require("./lib/sidebarTemplate3Html");
const { buildTimelineTemplate4Html } = require("./lib/timelineTemplate4Html");
const { buildGulfExecTemplate5Html } = require("./lib/gulfExecTemplate5Html");
const { buildBankingTemplate6Html } = require("./lib/bankingTemplate6Html");
const { buildCompactProTemplate7Html } = require("./lib/compactProTemplate7Html");
const { buildCreativeSidebarTemplate8Html } = require("./lib/creativeSidebarTemplate8Html");
const { drawT8SidebarStripeOnPdf } = require("./lib/pdfDrawT8SidebarStripe");

function safeFilename(name) {
  const s = String(name || "Resume")
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 80);
  return s || "Resume";
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).send("Method Not Allowed");
  }

  let body = req.body;
  if (body == null) {
    return res.status(400).json({ error: "Missing body" });
  }
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: "Invalid JSON" });
    }
  }

  const templateId = body.templateId;
  const cv = body.cv;

  if (!cv || typeof cv !== "object") {
    return res.status(400).json({ error: "Missing cv object" });
  }

  const supported = [1, 2, 3, 4, 5, 6, 7, 8];
  if (!supported.includes(Number(templateId))) {
    return res.status(400).json({ error: `Unsupported templateId (supported: ${supported.join(", ")})` });
  }

  let browser;
  try {
    const tid = Number(templateId);
    const html =
      tid === 2
        ? buildTwocolTemplate2Html(cv)
        : tid === 3
          ? buildSidebarTemplate3Html(cv)
          : tid === 4
            ? buildTimelineTemplate4Html(cv)
            : tid === 5
              ? buildGulfExecTemplate5Html(cv)
              : tid === 6
                ? buildBankingTemplate6Html(cv)
                : tid === 7
                  ? buildCompactProTemplate7Html(cv)
                  : tid === 8
                    ? buildCreativeSidebarTemplate8Html(cv)
                    : buildBannerTemplate1Html(cv);

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    let pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
      /* T8: avoid default white page fill covering pdf-lib sidebar stripe (see pdfDrawT8SidebarStripe). */
      ...(tid === 8 ? { omitBackground: true } : {}),
    });

    await browser.close();
    browser = null;

    if (tid === 8) {
      pdfBuffer = await drawT8SidebarStripeOnPdf(pdfBuffer);
    }

    const name = safeFilename(cv.name);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${name}_CVPassport.pdf"`);
    return res.status(200).send(Buffer.from(pdfBuffer));
  } catch (err) {
    console.error("generate-pdf error", err);
    if (browser) {
      try {
        await browser.close();
      } catch {
        /* ignore */
      }
    }
    return res.status(500).json({ error: err.message || "PDF generation failed" });
  }
};
