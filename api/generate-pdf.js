/**
 * Vercel serverless: CV → PDF via Puppeteer + @sparticuz/chromium.
 * Template 1 (Gulf Classic / banner) only — POST { templateId: 1, cv: <same shape as preview> }
 */

const chromium = require("@sparticuz/chromium");
const puppeteer = require("puppeteer-core");
const { buildBannerTemplate1Html } = require("./lib/bannerTemplate1Html");

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

  if (templateId !== 1) {
    return res.status(400).json({ error: "Only templateId 1 is supported" });
  }

  let browser;
  try {
    const html = buildBannerTemplate1Html(cv);

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });

    await browser.close();
    browser = null;

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
