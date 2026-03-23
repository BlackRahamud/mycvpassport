/**
 * Vercel serverless: CV → PDF via Puppeteer + @sparticuz/chromium.
 * POST { templateId, cv } — supported: 1–10, 11, 12, 13.
 */

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
const { drawT8SidebarStripeOnPdf } = require("../src/serverLib/pdfDrawT8SidebarStripe");
const { drawT11SidebarStripeOnPdf } = require("../src/serverLib/pdfDrawT11SidebarStripe");

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

  const supported = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
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
                    : tid === 9
                      ? buildHospitalityTemplate9Html(cv)
                      : tid === 10
                        ? buildATSInternationalTemplate10Html(cv)
                        : tid === 11
                          ? buildTechITProTemplate11Html(cv)
                          : tid === 12
                            ? buildClassicTemplate12Html(cv)
                            : tid === 13
                              ? buildFinanceTemplate13Html(cv)
                              : buildBannerTemplate1Html(cv);

    const executablePath = await chromium.executablePath(
      "https://github.com/Sparticuz/chromium/releases/download/v133.0.0/chromium-v133.0.0-pack.tar"
    );
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfOptions =
      tid === 1
        ? {
            width: "794px",
            height: `${Math.ceil(
              await page.evaluate(() => {
                const root = document.querySelector(".cvp-root");
                const h = root ? root.scrollHeight : document.body.scrollHeight;
                return h;
              }),
            )}px`,
            printBackground: true,
            margin: { top: "0", right: "0", bottom: "0", left: "0" },
          }
        : {
            format: "A4",
            printBackground: true,
            preferCSSPageSize: true,
            margin: { top: "0", right: "0", bottom: "0", left: "0" },
            /* T8/T11: avoid default white page fill covering pdf-lib sidebar stripe. */
            ...(tid === 8 || tid === 11 ? { omitBackground: true } : {}),
          };

    let pdfBuffer = await page.pdf(pdfOptions);

    await browser.close();
    browser = null;

    if (tid === 8) {
      pdfBuffer = await drawT8SidebarStripeOnPdf(pdfBuffer);
    }
    if (tid === 11) {
      pdfBuffer = await drawT11SidebarStripeOnPdf(pdfBuffer);
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
