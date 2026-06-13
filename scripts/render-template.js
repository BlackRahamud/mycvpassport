/**
 * Generic SSR render harness for any T1-T18 template, used during the
 * Phase 1 GhostChip-fix verification. Loads ResumePreview from the actual
 * source and renders with a fixed Hammad fixture so before/after PDFs are
 * directly comparable when src/components/GhostChip.jsx changes.
 *
 * Usage:
 *   node scripts/render-template.js <templateId> <out-name.pdf>
 *
 * Examples:
 *   node scripts/render-template.js 1  out/phase1-t1-before.pdf
 *   node scripts/render-template.js 8  out/phase1-t8-before.pdf
 *   node scripts/render-template.js 18 out/phase1-t18-after.pdf
 *
 * Requires devDependencies: @babel/core, @babel/preset-env, @babel/preset-react,
 * puppeteer-core, pdf-parse (the last one for the regression text-stream check).
 *
 * Defaults: chrome at C:\Program Files\Google\Chrome\Application\chrome.exe
 * (override via CHROME_PATH env var). Output PDFs go to <out-name.pdf> exactly
 * as passed; companion text-stream extract goes to <out-name>-stream.txt.
 */

const fs = require("fs");
const path = require("path");
const Module = require("module");
const babel = require("@babel/core");
const puppeteer = require("puppeteer-core");

// ─── In-memory JSX transform via custom require hook ──────────────────────────

const projectRoot = path.resolve(__dirname, "..");
const SRC_DIR = path.join(projectRoot, "src");

function transpileLoader(mod, filename) {
  const source = fs.readFileSync(filename, "utf8");
  const result = babel.transformSync(source, {
    filename,
    babelrc: false,
    configFile: false,
    presets: [
      [require.resolve("@babel/preset-env"), { targets: { node: "current" } }],
      [require.resolve("@babel/preset-react"), { runtime: "automatic" }],
    ],
    sourceMaps: "inline",
  });
  mod._compile(result.code, filename);
}

const origJsLoader = Module._extensions[".js"];
Module._extensions[".js"] = function (mod, filename) {
  if (!filename.startsWith(SRC_DIR)) {
    return origJsLoader(mod, filename);
  }
  transpileLoader(mod, filename);
};
Module._extensions[".jsx"] = transpileLoader;

const origResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  try {
    return origResolve.call(this, request, parent, ...rest);
  } catch (err) {
    if (err && err.code === "MODULE_NOT_FOUND" && parent && parent.filename) {
      const tryExt = path.resolve(path.dirname(parent.filename), request + ".jsx");
      if (fs.existsSync(tryExt)) return tryExt;
      const tryIdx = path.resolve(path.dirname(parent.filename), request, "index.jsx");
      if (fs.existsSync(tryIdx)) return tryIdx;
    }
    throw err;
  }
};

const React = require("react");
const ReactDOMServer = require("react-dom/server");
const { ResumePreview } = require(path.join(SRC_DIR, "ResumePreview.jsx"));
const { TEMPLATES } = require(path.join(SRC_DIR, "cvShared.js"));

// ─── Wrapper HTML doc — mirrors the production wrapper for non-T11 paths ─────

function buildCvPdfHtmlDocument(cvFragmentHtml) {
  const style = `
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { background: #ffffff; }
    body { font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
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
  `;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600&display=swap"/>
<style>${style}</style>
</head>
<body>
<div class="cvp-builder-a4-fit">${cvFragmentHtml}</div>
</body>
</html>`;
}

// ─── Hammad fixture (same as render-t11-real.js) ──────────────────────────────

const ETIHAD_JOB = {
  company: "Etihad Engineering",
  role: "System Administrator L2",
  location: "Abu Dhabi",
  period: "09/2023 – Present",
  points: [
    "Manage user accounts, permissions, and access control ensuring security compliance.",
    "Handle IT incidents via ticketing systems and ensure timely resolution.",
    "Supporting aviation-specific applications: CMRO, EDoc, AirNav, Boeing MFT, and Stream.",
    "Diagnose and resolve hardware, software, and network issues for end users.",
    "Configure and support Citrix-hosted applications enterprise users.",
    "Implement and maintain backup procedures to safeguard critical company data.",
    "Perform Windows Server maintenance for system performance and integrity.",
    "Install, test, and evaluate desktop software applications.",
  ].join("\n"),
};

const CRONYSOFT_JOB = {
  company: "Cronysoft",
  role: "Technical Support Engineer",
  location: "Karachi, Pakistan",
  period: "01/2023 – 06/2023",
  points: [
    "Provided technical support for POS systems, printers, scanners, and connectivity",
    "Diagnosed and resolved software, database, and hardware issues",
    "Delivered remote support to UK, Canada, and USA clients",
    "Managed SQL Server installation, database restoration, and user access control",
    "Installed and configured POS printers from Dymo, Epson, and Rongta",
    "Handled L1 and L2 support via calls, emails, and ticketing systems",
  ].join("\n"),
};

const HAMMAD = {
  name: "Hammad Hassan",
  title: "System Administrator L2",
  email: "Hamm00366@gmail.com",
  phone: "+971 508097037",
  location: "Abu Dhabi, UAE",
  summary:
    "Experienced System Administrator with 5+ years of hands-on expertise in managing and maintaining complex IT infrastructures. Skilled in Active Directory, Windows Server administration, virtualization, networking, and enterprise-level support.",
  skills:
    "Active directory, Windows Server, Network Troubleshooting, Microsoft 365, Hyper - V, ITIL v4, Manage Engine",
  languages: "English, Urdu",
  experience: [ETIHAD_JOB, CRONYSOFT_JOB],
  education: [
    {
      school: "University of Karachi",
      degree: "Master of Computer Science",
      year: "01/2019 – 12/2020",
    },
  ],
  certifications: [],
  technicalSkills: "",
};

// ─── Main ────────────────────────────────────────────────────────────────────

const LOCAL_CHROME =
  process.env.CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function main() {
  const templateId = Number(process.argv[2]);
  const outArg = process.argv[3];
  if (!templateId || !outArg) {
    console.error("Usage: node scripts/render-template.js <templateId> <out-name.pdf>");
    process.exit(2);
  }
  const template = TEMPLATES.find((t) => t.id === templateId);
  if (!template) {
    console.error(`No template with id=${templateId}`);
    process.exit(2);
  }

  const outPath = path.isAbsolute(outArg)
    ? outArg
    : path.join(projectRoot, outArg);
  const outDir = path.dirname(outPath);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const fragment = ReactDOMServer.renderToStaticMarkup(
    React.createElement(ResumePreview, { cv: HAMMAD, template, mobileMode: false }),
  );
  const docHtml = buildCvPdfHtmlDocument(fragment);

  const browser = await puppeteer.launch({
    executablePath: LOCAL_CHROME,
    headless: true,
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
  await page.setContent(docHtml, { waitUntil: "networkidle0" });
  await Promise.race([
    page.evaluate(() => document.fonts.ready),
    new Promise((r) => setTimeout(r, 3000)),
  ]);
  await page.emulateMediaType("screen");

  // Mirror the @media print rules injected by api/generate-pdf.js for ALL
  // templates — keeps the harness behaviorally close to production.
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

  // Use the production global Puppeteer config (NOT the T11-only config).
  // This script renders T1-T18 and we want the non-T11 path.
  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    preferCSSPageSize: false,
    margin: { top: "10mm", bottom: "15mm", left: "0mm", right: "0mm" },
    displayHeaderFooter: true,
    headerTemplate: "<div></div>",
    footerTemplate: `
      <div style="font-family: 'Inter', sans-serif; font-size: 9px; color: #94A3B8; width: 100%; text-align: center; margin-bottom: 5mm;">
        Page <span class="pageNumber"></span> of <span class="totalPages"></span>
      </div>`,
  });

  fs.writeFileSync(outPath, pdfBuffer);

  // Page count + size summary.
  let pageCount = null;
  try {
    const { PDFDocument } = require("pdf-lib");
    const loaded = await PDFDocument.load(pdfBuffer);
    pageCount = loaded.getPageCount();
  } catch (_) {}

  // Text-stream extract via pdf-parse (devDependency since commit d4b29f0).
  let streamText = null;
  try {
    const { PDFParse } = require("pdf-parse");
    const parser = new PDFParse({ data: pdfBuffer });
    const result = await parser.getText();
    streamText = result.text || "";
  } catch (e) {
    streamText = `[pdf-parse failed: ${e.message}]`;
  }

  const streamPath = outPath.replace(/\.pdf$/i, "-stream.txt");
  fs.writeFileSync(
    streamPath,
    `# T${templateId} (${template.name}) — PDF text-stream extract\n` +
      `# pages=${pageCount}  bytes=${pdfBuffer.length}\n` +
      `# (text below = direct stream order from pdf-parse, NOT visual order)\n\n` +
      streamText,
  );

  console.log(
    `Wrote ${outPath}  pages=${pageCount}  bytes=${pdfBuffer.length}  stream=${path.basename(streamPath)}`,
  );

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
