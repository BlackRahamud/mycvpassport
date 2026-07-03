/* Preview ↔ PDF parity harness.
   For every template: seed the builder with the same 2-page fixture, read
   the live preview's pagination (page count + first text of each page via
   window.__cvpPreviewParity), then export a real PDF the exact way
   production does (captured preview HTML → print wrapper → shared
   printLayoutPass → Chromium page.pdf) and compare:
     - page count preview === PDF
     - each preview page-start snippet appears in that PDF page's text
   Also saves side-by-side PNGs (preview sheets vs pdf.js renders of the
   real PDF) under <outDir>.
   Usage: node scripts/verify-preview-parity.mjs <outDir> [ids...]        */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { join, extname } from "node:path";
import { createRequire } from "node:module";
import { chromium } from "@playwright/test";
import { extractText, getDocumentProxy } from "unpdf";

const require = createRequire(import.meta.url);
const { printLayoutPass } = require("../src/serverLib/printLayoutPass.js");

const OUT = process.argv[2] || "scripts/.screenshots/preview-parity";
mkdirSync(OUT, { recursive: true });
const ONLY = process.argv.slice(3).map(Number).filter(Boolean);
const TEMPLATE_IDS = ONLY.length ? ONLY : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? "  ✓" : "  ✗ FAIL"} ${label}`);
  if (!ok) failures += 1;
};

/* ── 2-page fixture (deliberately rich) ───────────────────────── */
const FIXTURE_CV = {
  name: "Priya Ramachandran Nair",
  email: "priya.nair@example.com",
  phone: "+971 55 123 9876",
  linkedin: "linkedin.com/in/priyanair",
  location: "Abu Dhabi, UAE",
  title: "Senior Accountant",
  summary:
    "Chartered accountant with 9 years across UAE audit, statutory reporting and consolidation. Led IFRS 16 transition for a 14-entity group, owns month-end close to day 4, and has cleared four consecutive external audits with zero material findings. Comfortable pairing controllership with hands-on SAP FICO configuration.",
  nationality: "Indian",
  visaStatus: "Employment visa",
  dob: "12 Mar 1992",
  gender: "Female",
  maritalStatus: "Married",
  drivingLicense: "UAE light vehicle",
  skills: "IFRS, Consolidation, Statutory audit, SAP FICO, VAT, Cash-flow forecasting, Month-end close, Intercompany, Fixed assets, Treasury",
  technicalSkills: "SAP FICO | Oracle Fusion | Power BI | Advanced Excel | Tally",
  languages: "English, Malayalam, Hindi, Arabic (basic)",
  experience: [
    {
      company: "Falcon Audit Group", role: "Senior Accountant", period: "2021 – Present",
      startDate: "2021", endDate: "", present: true,
      points: "Closed monthly consolidation for 12 entities across UAE and KSA\nCut close cycle from 9 to 4 working days by automating intercompany matching\nLed IFRS 16 adoption covering 60+ leases, coordinating with external auditors\nOwn VAT filing for three TRN groups with zero penalties since 2021",
    },
    {
      company: "Gulf Retail Holdings", role: "Financial Accountant", period: "2018 – 2021",
      startDate: "2018", endDate: "2021", present: false,
      points: "Managed fixed-asset register of AED 240M across 38 stores\nRebuilt cash-flow forecast model adopted group-wide\nSupported SAP FICO rollout as finance workstream lead",
    },
    {
      company: "TransIndia Logistics", role: "Accounts Executive", period: "2016 – 2018",
      startDate: "2016", endDate: "2018", present: false,
      points: "Processed 300+ supplier invoices monthly with 3-way matching\nReconciled 14 bank accounts weekly\nPrepared statutory schedules for year-end audit",
    },
    {
      company: "Kerala Audit Associates", role: "Audit Trainee", period: "2014 – 2016",
      startDate: "2014", endDate: "2016", present: false,
      points: "Executed fieldwork for 20+ statutory audits\nDrafted audit working papers and TDS filings",
    },
  ],
  education: [
    { school: "Institute of Chartered Accountants of India", degree: "CA", year: "2016" },
    { school: "University of Kerala", degree: "B.Com (Hons)", year: "2013" },
  ],
  certifications: [
    { name: "IFRS Diploma (ACCA)", year: "2019" },
    { name: "UAE VAT Compliance Certificate", year: "2018" },
  ],
  projects: "", volunteerWork: "", publications: "",
  builderExtraSectionIds: ["personalDetails"],
  customFields: [],
  availability: "30 days notice",
  willingToRelocate: "Yes — GCC wide",
  references: "References available upon request",
};

/* ── static server: build/ + pdf.js UMD for the render page ───── */
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
const PDFJS_UMD = readFileSync("./node_modules/pdfjs-dist/build/pdf.min.js");
const PDFVIEW_HTML = `<!doctype html><meta charset="utf-8"><title>pdfview</title>
<body style="margin:0;background:#fff">
<script src="/__pdfjs.js"></script>
<script>
window.renderPdf = async (b64) => {
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.js";
  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
  for (let i = 1; i <= pdf.numPages; i += 1) {
    const page = await pdf.getPage(i);
    const vp = page.getViewport({ scale: 1.2 });
    const c = document.createElement("canvas");
    c.width = vp.width; c.height = vp.height; c.setAttribute("data-pdf-page", i);
    c.style.display = "block"; c.style.margin = "0 0 8px";
    document.body.appendChild(c);
    await page.render({ canvasContext: c.getContext("2d"), viewport: vp }).promise;
  }
  return pdf.numPages;
};
</script></body>`;
const server = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p === "/__pdfjs.js") { res.writeHead(200, { "content-type": "text/javascript" }); return res.end(PDFJS_UMD); }
  if (p === "/__pdfview") { res.writeHead(200, { "content-type": "text/html" }); return res.end(PDFVIEW_HTML); }
  let file = join("./build", p);
  if (!existsSync(file) || statSync(file).isDirectory()) file = join("./build", "spa.html");
  try { res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" }); res.end(readFileSync(file)); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(4191, r));

/* ── print wrapper — MUST mirror src/downloadResumeFromPreview.js
      buildCvPdfHtmlDocument (drift here = the harness lies) ─────── */
function buildCvPdfHtmlDocument(cvFragmentHtml, templateId) {
  const t11Css = Number(templateId) === 11 ? `
    @page { size: A4; margin: 15mm; }
    .cvp-builder-a4-fit { padding: 0 !important; }
    .cvp-builder-a4-fit > div {
      padding-top: 0 !important;
      padding-bottom: 0 !important;
      min-height: 0 !important;
    }
  ` : "";
  const style = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { background: #ffffff; }
    body { font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .cvp-ph { opacity: 0.55; }
    .cvp-builder-a4-fit {
      background: #ffffff;
      width: 794px;
      min-height: unset;
      height: auto;
      padding: 32px;
      border-radius: 8px;
      box-shadow: none;
      box-sizing: border-box;
    }
    ${t11Css}
  `;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Inter:wght@400;500;600;700;800&display=swap"/>
<style>${style}</style>
</head>
<body${templateId ? ` data-template-id="${Number(templateId)}"` : ""}>
${cvFragmentHtml}
</body>
</html>`;
}

/* @media print block — verbatim from api/generate-pdf.js */
const PRINT_STYLE_TAG = `
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
`;

const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();

const browser = await chromium.launch();
const summary = [];

for (const id of TEMPLATE_IDS) {
  console.log(`\n── Template ${id} ──`);
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  await ctx.addInitScript(({ cv, tid }) => {
    localStorage.setItem(
      "cvp_cv_draft:new:default",
      JSON.stringify({ version: 2, cv, templateId: tid, resumeId: null, ownerId: null, updatedAt: Date.now() }),
    );
  }, { cv: FIXTURE_CV, tid: id });
  const app = await ctx.newPage();
  app.on("pageerror", (e) => console.log("  [pageerror]", e.message));
  await app.goto("http://localhost:4191/builder", { waitUntil: "networkidle" });
  try {
    await app.waitForFunction(
      (tid) => window.__cvpPreviewParity && window.__cvpPreviewParity.templateId === tid
        && document.querySelectorAll(".dp-sheetbox").length === window.__cvpPreviewParity.pageCount,
      id,
      { timeout: 20000 },
    );
  } catch {
    check(false, `T${id}: preview never settled (no parity hook / sheets)`);
    await ctx.close();
    continue;
  }
  await app.waitForTimeout(600);

  const parity = await app.evaluate(() => window.__cvpPreviewParity);
  const captured = await app.evaluate(() => {
    const el = document.querySelector(".dp-measure .cvp-builder-a4-fit");
    return el ? el.outerHTML : null;
  });
  check(!!captured, `T${id}: canonical capture node present`);

  // preview sheet screenshots
  const sheets = app.locator(".dp-sheetbox");
  const sheetCount = await sheets.count();
  for (let k = 0; k < sheetCount; k += 1) {
    await sheets.nth(k).screenshot({ path: join(OUT, `t${id}-preview-p${k + 1}.png`) }).catch(() => {});
  }
  await ctx.close();
  if (!captured) continue;

  /* real PDF, the production way */
  const printCtx = await browser.newContext({ viewport: { width: 794, height: 1123, deviceScaleFactor: 2 } });
  const printPage = await printCtx.newPage();
  await printPage.setContent(buildCvPdfHtmlDocument(captured, id), { waitUntil: "networkidle" });
  await Promise.race([
    printPage.evaluate(() => document.fonts.ready),
    new Promise((r) => setTimeout(r, 2500)),
  ]);
  await printPage.emulateMedia({ media: "screen" });
  await printPage.addStyleTag({ content: PRINT_STYLE_TAG });
  await printPage.evaluate(printLayoutPass, { ats: false, templateId: id });

  const sharedPdfOpts = {
    format: "A4",
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: "<div></div>",
    footerTemplate: `
    <div style="font-family: 'Inter', sans-serif; font-size: 9px; color: #94A3B8; width: 100%; text-align: center; margin-bottom: 5mm;">
      Page <span class="pageNumber"></span> of <span class="totalPages"></span>
    </div>`,
  };
  const pdfBuf = await printPage.pdf(
    Number(id) === 11
      ? { ...sharedPdfOpts, preferCSSPageSize: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } }
      : { ...sharedPdfOpts, preferCSSPageSize: false, margin: { top: "10mm", bottom: "15mm", left: "0mm", right: "0mm" } },
  );
  await printCtx.close();
  writeFileSync(join(OUT, `t${id}.pdf`), pdfBuf);

  /* extract per-page text */
  const proxy = await getDocumentProxy(new Uint8Array(pdfBuf));
  const { text: pageTexts } = await extractText(proxy, { mergePages: false });
  const pdfPages = proxy.numPages;

  check(
    pdfPages === parity.pageCount,
    `T${id}: page count — preview ${parity.pageCount} vs PDF ${pdfPages}`,
  );

  const pagesToCheck = Math.min(parity.pageCount, pdfPages);
  for (let k = 0; k < pagesToCheck; k += 1) {
    const snippet = norm(parity.pageStarts[k]).slice(0, 24).trim();
    if (!snippet) continue;
    // Letter-spaced headings extract as "L A N G U A G E S" — compare a
    // space-free variant too.
    const hay = norm(pageTexts[k]);
    const inPage = hay.includes(snippet) || hay.replace(/ /g, "").includes(snippet.replace(/ /g, ""));
    check(inPage, `T${id}: page ${k + 1} starts with "${(parity.pageStarts[k] || "").slice(0, 32)}"`);
  }

  /* pdf page images for side-by-side review */
  const viewCtx = await browser.newContext({ viewport: { width: 1000, height: 1400 } });
  const view = await viewCtx.newPage();
  await view.goto("http://localhost:4191/__pdfview", { waitUntil: "load" });
  await view.evaluate((b64) => window.renderPdf(b64), pdfBuf.toString("base64"));
  const canvases = view.locator("canvas[data-pdf-page]");
  const cCount = await canvases.count();
  for (let k = 0; k < cCount; k += 1) {
    await canvases.nth(k).screenshot({ path: join(OUT, `t${id}-pdf-p${k + 1}.png`) }).catch(() => {});
  }
  await viewCtx.close();

  summary.push({ id, previewPages: parity.pageCount, pdfPages });
}

await browser.close();
server.close();

console.log("\n── Summary ──");
summary.forEach((s) => console.log(`T${s.id}: preview ${s.previewPages}p / pdf ${s.pdfPages}p ${s.previewPages === s.pdfPages ? "✓" : "✗"}`));
console.log(failures === 0 ? "\nALL PARITY CHECKS PASSED" : `\n${failures} PARITY CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
