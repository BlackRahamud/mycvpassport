/* Field-coverage harness: does every builder field the user fills actually
   appear in (a) the live preview and (b) the exported PDF, per template?

   Seeds the builder with an all-fields fixture whose every value is a
   distinct marker token, then for each template runs TWO passes:

   Pass 1 — everything prints:
     1. loads /builder with the draft, reads the canonical capture node's
        innerText  → preview coverage
     2. exports a real PDF the production way (captured HTML → print
        wrapper → shared printLayoutPass → Chromium page.pdf), extracts
        its text → PDF coverage
     3. asserts every expected marker appears in BOTH.

   Pass 2 — "Show on CV" toggles (hiddenPersonalDetails):
     re-renders with visa status / nationality / DOB switched off and
     asserts those three are gone from preview AND PDF, while the rest of
     the CV is untouched. A hide that takes neighbouring fields with it
     fails just as loudly as one that does nothing.

   Documented intentional omissions are excluded per template (see
   EXPECTED_ABSENT below) so the harness fails only on silent drops.

   Usage: node scripts/verify-field-coverage.mjs <outDir> [ids...]        */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { join, extname } from "node:path";
import { createRequire } from "node:module";
import { chromium } from "@playwright/test";
import { extractText, getDocumentProxy } from "unpdf";

const require = createRequire(import.meta.url);
const { printLayoutPass } = require("../src/serverLib/printLayoutPass.js");

const OUT = process.argv[2] || "scripts/.screenshots/field-coverage";
mkdirSync(OUT, { recursive: true });
const ONLY = process.argv.slice(3).map(Number).filter(Boolean);
const TEMPLATE_IDS = ONLY.length ? ONLY : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];

let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? "  ✓" : "  ✗ FAIL"} ${label}`);
  if (!ok) failures += 1;
};

/* ── all-fields fixture: every value is a distinct marker ─────── */
const FIXTURE_CV = {
  name: "Zubina Qadirova",
  email: "zubina.q@example.com",
  phone: "+971 50 111 2233",
  linkedin: "linkedin.com/in/zubinaq",
  location: "Ajman, UAE",
  title: "Marine Logistics Architect",
  summary: "Summarytoken: orchestrating cross-border freight programs across the Gulf corridor.",
  nationality: "Uzbekistani",
  visaStatus: "Golden Visa",
  dob: "07 Jul 1991",
  gender: "Female",
  maritalStatus: "Widowed",
  drivingLicense: "GCC Heavy Vehicle",
  availability: "Joining in 45 days",
  willingToRelocate: "Yes, anywhere GCC",
  skills: "Fleetopsx, Chartering, Tonnage Planning",
  technicalSkills: "Navtools: MarineERP, PortlinkPro",
  languages: "English, Uzbek, Russian",
  experience: [
    {
      company: "Lagoon Freight DMCC", role: "Senior Marine Planner", location: "Jebel Ali",
      period: "2020 – Present", startDate: "2020", endDate: "", present: true,
      points: "Bulletalpha reduced demurrage by a third across four terminals\nBulletbeta automated stowage planning for twelve vessels",
    },
  ],
  education: [
    {
      school: "Samarqand Maritime Institute", degree: "BSc Nautical Science",
      fieldOfStudy: "Hydrography", year: "2014", location: "Tashkent",
      startDate: "2010", endDate: "2014",
    },
  ],
  certifications: [{ name: "STCW Advanced", issuer: "TransportAuthorityX", year: "2019" }],
  projects: "Projectgamma: port digital twin rollout for two carriers",
  publications: "Publicationdelta: journal of gulf logistics, annual review",
  volunteerWork: "Volunteerepsilon: beach cleanup program lead",
  customFields: [{ id: "nafis_registered", name: "Nafis Registered", value: "Nafistoken" }],
  builderExtraSectionIds: ["personalDetails", "certifications", "projects", "volunteer", "publications"],
  references: "Available on request from Capt Omarion",
};

/* marker → templates where its absence is DOCUMENTED-INTENTIONAL.
   "all-but" entries invert. Everything else must appear in all 19.   */
const MARKERS = {
  name: "Zubina Qadirova",
  title: "Marine Logistics Architect",
  email: "zubina.q@example.com",
  phone: "50 111 2233",
  linkedin: "zubinaq",
  location: "Ajman",
  summary: "Summarytoken",
  nationality: "Uzbekistani",
  visaStatus: "Golden Visa",
  dob: "Jul 1991",
  gender: "Female",
  maritalStatus: "Widowed",
  drivingLicense: "GCC Heavy Vehicle",
  availability: "45 days",
  willingToRelocate: "anywhere GCC",
  skills: "Fleetopsx",
  techCategory: "Navtools",
  techChip1: "MarineERP",
  techChip2: "PortlinkPro",
  languages: "Uzbek",
  expCompany: "Lagoon Freight",
  expRole: "Senior Marine Planner",
  expLocation: "Jebel Ali",
  expPeriod: "2020",
  expPoint1: "Bulletalpha",
  expPoint2: "Bulletbeta",
  eduSchool: "Samarqand Maritime",
  eduDegree: "BSc Nautical Science",
  eduField: "Hydrography",
  eduYear: "2014",
  eduLocation: "Tashkent",
  certName: "STCW Advanced",
  certIssuer: "TransportAuthorityX",
  certYear: "2019",
  projects: "Projectgamma",
  publications: "Publicationdelta",
  volunteerWork: "Volunteerepsilon",
  customField: "Nafistoken",
  references: "Omarion",
};

/* Documented intentional omissions (flagged to founder, not bugs):
   - references renders only on T10, T11, T19 (no builder input; default string).
   - T11 header shows personal VALUES without labels — values still checked.
   customFields used to be excluded on all but T10 + T19; they now render on
   all 19 (imported fields must never silently vanish), so the exclusion is
   gone and `customField` is asserted everywhere. */
const EXPECTED_ABSENT = {
  references: TEMPLATE_IDS.filter((id) => id !== 10 && id !== 11 && id !== 19),
};

/* Pass 2 — "Show on CV" toggles. Same fixture with the three toggleable
   fields switched off: each must vanish from preview AND PDF on every
   template, while everything else still prints (a hide that takes the rest
   of the block with it is just as broken as one that does nothing). */
const HIDDEN_KEYS = ["visaStatus", "nationality", "dob"];
const HIDDEN_MARKERS = { visaStatus: MARKERS.visaStatus, nationality: MARKERS.nationality, dob: MARKERS.dob };
const STILL_VISIBLE_MARKERS = {
  maritalStatus: MARKERS.maritalStatus,
  gender: MARKERS.gender,
  drivingLicense: MARKERS.drivingLicense,
  availability: MARKERS.availability,
  willingToRelocate: MARKERS.willingToRelocate,
  customField: MARKERS.customField,
  name: MARKERS.name,
  expCompany: MARKERS.expCompany,
};

const expectedMarkersFor = (id) =>
  Object.entries(MARKERS).filter(([key]) => !(EXPECTED_ABSENT[key] || []).includes(id));

/* ── static server: serve build/ ──────────────────────────────── */
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
const server = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = join("./build", p);
  if (!existsSync(file) || statSync(file).isDirectory()) file = join("./build", "spa.html");
  try { res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" }); res.end(readFileSync(file)); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(4193, r));

/* ── print wrapper — mirrors src/downloadResumeFromPreview.js ──── */
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
const tight = (s) => s.replace(/ /g, "");
const contains = (hay, needle) => {
  const h = norm(hay);
  const n = norm(needle);
  return h.includes(n) || tight(h).includes(tight(n));
};

const browser = await chromium.launch();
const matrix = [];

/* One render of one template with one CV: seed the draft, read the canonical
   capture node for preview text, then print that same node to a real PDF the
   production way. Returns null if the preview never settles. */
async function renderTemplate(id, cv, pdfName) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 950 } });
  await ctx.addInitScript(({ cvData, tid }) => {
    localStorage.setItem(
      "cvp_cv_draft:new:default",
      JSON.stringify({ version: 2, cv: cvData, templateId: tid, resumeId: null, ownerId: null, updatedAt: Date.now() }),
    );
  }, { cvData: cv, tid: id });
  const app = await ctx.newPage();
  app.on("pageerror", (e) => console.log("  [pageerror]", e.message));
  await app.goto("http://localhost:4193/builder", { waitUntil: "networkidle" });
  try {
    await app.waitForFunction(
      (tid) => window.__cvpPreviewParity && window.__cvpPreviewParity.templateId === tid
        && document.querySelector(".dp-measure .cvp-builder-a4-fit"),
      id,
      { timeout: 20000 },
    );
  } catch {
    await ctx.close();
    return null;
  }
  await app.waitForTimeout(600);

  const previewText = await app.evaluate(() => {
    const el = document.querySelector(".dp-measure .cvp-builder-a4-fit");
    return el ? el.innerText : "";
  });
  const captured = await app.evaluate(() => {
    const el = document.querySelector(".dp-measure .cvp-builder-a4-fit");
    return el ? el.outerHTML : null;
  });
  await ctx.close();
  if (!captured) return null;

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
    footerTemplate: `<div style="font-size:9px;color:#94A3B8;width:100%;text-align:center;margin-bottom:5mm;">Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>`,
  };
  const pdfBuf = await printPage.pdf(
    Number(id) === 11
      ? { ...sharedPdfOpts, preferCSSPageSize: true, margin: { top: 0, right: 0, bottom: 0, left: 0 } }
      : { ...sharedPdfOpts, preferCSSPageSize: false, margin: { top: "10mm", bottom: "15mm", left: "0mm", right: "0mm" } },
  );
  await printCtx.close();
  writeFileSync(join(OUT, pdfName), pdfBuf);

  const proxy = await getDocumentProxy(new Uint8Array(pdfBuf));
  const { text: pdfText } = await extractText(proxy, { mergePages: true });
  return { previewText, pdfText };
}

for (const id of TEMPLATE_IDS) {
  console.log(`\n── Template ${id} ──`);

  /* ── pass 1: every field the user filled must print ── */
  const full = await renderTemplate(id, FIXTURE_CV, `t${id}.pdf`);
  if (!full) { check(false, `T${id}: preview never settled`); continue; }

  const row = { id, missingPreview: [], missingPdf: [], leaked: [], collateral: [] };
  for (const [key, marker] of expectedMarkersFor(id)) {
    const inPreview = contains(full.previewText, marker);
    const inPdf = contains(full.pdfText, marker);
    if (!inPreview) row.missingPreview.push(key);
    if (!inPdf) row.missingPdf.push(key);
    check(inPreview && inPdf, `T${id} ${key} ("${marker}") — preview:${inPreview ? "ok" : "MISSING"} pdf:${inPdf ? "ok" : "MISSING"}`);
  }

  /* ── pass 2: the three toggled-off fields must vanish, nothing else ── */
  const hidden = await renderTemplate(id, { ...FIXTURE_CV, hiddenPersonalDetails: HIDDEN_KEYS }, `t${id}-hidden.pdf`);
  if (!hidden) { check(false, `T${id}: hidden-pass preview never settled`); matrix.push(row); continue; }

  for (const [key, marker] of Object.entries(HIDDEN_MARKERS)) {
    const inPreview = contains(hidden.previewText, marker);
    const inPdf = contains(hidden.pdfText, marker);
    if (inPreview || inPdf) row.leaked.push(key);
    check(!inPreview && !inPdf, `T${id} hide:${key} ("${marker}") — preview:${inPreview ? "STILL PRINTS" : "gone"} pdf:${inPdf ? "STILL PRINTS" : "gone"}`);
  }
  for (const [key, marker] of Object.entries(STILL_VISIBLE_MARKERS)) {
    if ((EXPECTED_ABSENT[key] || []).includes(id)) continue;
    const inPreview = contains(hidden.previewText, marker);
    const inPdf = contains(hidden.pdfText, marker);
    if (!inPreview || !inPdf) row.collateral.push(key);
    check(inPreview && inPdf, `T${id} kept:${key} ("${marker}") — preview:${inPreview ? "ok" : "LOST"} pdf:${inPdf ? "ok" : "LOST"}`);
  }
  matrix.push(row);
}

await browser.close();
server.close();

/* ── serverLib pass: the OTHER render path ─────────────────────
   api/generate-pdf.js builds HTML from src/serverLib/*, not from the preview
   capture, so a field can be correct in the browser and still be dropped
   there. Same two assertions, no browser needed. Templates without a
   serverLib builder (15–18) fall back to T10 in generate-pdf.        */
const SERVERLIB_BUILDERS = {
  1: ["bannerTemplate1Html", "pdfModernEmerald"],
  2: ["twocolTemplate2Html", "buildTwocolTemplate2Html"],
  3: ["sidebarTemplate3Html", "buildSidebarTemplate3Html"],
  4: ["timelineTemplate4Html", "buildTimelineTemplate4Html"],
  5: ["gulfExecTemplate5Html", "buildGulfExecTemplate5Html"],
  6: ["bankingTemplate6Html", "buildBankingTemplate6Html"],
  7: ["compactProTemplate7Html", "buildCompactProTemplate7Html"],
  8: ["creativeSidebarTemplate8Html", "buildCreativeSidebarTemplate8Html"],
  9: ["hospitalityTemplate9Html", "buildHospitalityTemplate9Html"],
  10: ["atsInternationalTemplate10Html", "buildATSInternationalTemplate10Html"],
  11: ["techITProTemplate11Html", "buildTechITProTemplate11Html"],
  12: ["template12Builder", "buildTemplate12Html"],
  13: ["financeTemplate13Html", "buildFinanceTemplate13Html"],
  14: ["template14Builder", "buildTemplate14Html"],
  19: ["uaeAtsTemplate19Html", "buildUaeAtsTemplate19Html"],
};
const deTag = (html) => String(html || "").replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ");

console.log("\n── serverLib HTML path (api/generate-pdf) ──");
for (const id of TEMPLATE_IDS) {
  const entry = SERVERLIB_BUILDERS[id];
  if (!entry) { console.log(`  – T${id}: no serverLib builder (generate-pdf falls back to T10)`); continue; }
  const [mod, fn] = entry;
  let build;
  try {
    build = require(`../src/serverLib/${mod}.js`)[fn];
  } catch (e) {
    check(false, `T${id} serverLib: ${mod} failed to load — ${e.message}`);
    continue;
  }
  if (typeof build !== "function") { check(false, `T${id} serverLib: ${fn} is not a function`); continue; }
  let fullText = "";
  let hiddenText = "";
  try {
    fullText = deTag(build(FIXTURE_CV));
    hiddenText = deTag(build({ ...FIXTURE_CV, hiddenPersonalDetails: HIDDEN_KEYS }));
  } catch (e) {
    check(false, `T${id} serverLib: threw — ${e.message}`);
    continue;
  }
  check(contains(fullText, MARKERS.customField), `T${id} serverLib customField ("${MARKERS.customField}")`);
  for (const [key, marker] of Object.entries(HIDDEN_MARKERS)) {
    check(!contains(hiddenText, marker), `T${id} serverLib hide:${key} ("${marker}")`);
  }
  check(contains(hiddenText, MARKERS.maritalStatus), `T${id} serverLib kept:maritalStatus`);
  check(contains(hiddenText, MARKERS.customField), `T${id} serverLib kept:customField`);
}

console.log("\n── Field × template matrix (problems only) ──");
for (const r of matrix) {
  const problems = [];
  if (r.missingPreview.length) problems.push(`preview missing [${r.missingPreview.join(", ")}]`);
  if (r.missingPdf.length) problems.push(`pdf missing [${r.missingPdf.join(", ")}]`);
  if (r.leaked.length) problems.push(`hidden but still printing [${r.leaked.join(", ")}]`);
  if (r.collateral.length) problems.push(`lost to the hide [${r.collateral.join(", ")}]`);
  console.log(`T${r.id}: ${problems.length === 0 ? "COMPLETE" : problems.join(" · ")}`);
}
console.log(failures === 0 ? "\nALL FIELD-COVERAGE CHECKS PASSED" : `\n${failures} FIELD-COVERAGE CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
