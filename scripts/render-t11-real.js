/**
 * Render T11 PDFs through the REAL Template11TechITPro React component
 * (not the hand-crafted fixture). Used to produce production-equivalent
 * after-PDFs that match what the live builder + downloadResumeFromPreview
 * + api/generate-pdf would emit when the post-fix code paths run together.
 *
 * Usage:
 *   node scripts/render-t11-real.js tier-b   # 1 job
 *   node scripts/render-t11-real.js tier-c   # 3 jobs
 *   node scripts/render-t11-real.js tier-d   # 5 jobs (forces a real page 2)
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

// Make `.jsx` resolvable from bare `import './foo'` style requires.
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

// React SSR — load AFTER the require hook is installed.
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const { PreviewTechITPro } = require(path.join(SRC_DIR, "Template11TechITPro.js"));

// Mirror the post-fix downloadResumeFromPreview wrapper.
function buildCvPdfHtmlDocument(cvFragmentHtml, templateId) {
  const t11Css =
    Number(templateId) === 11
      ? `
    @page { size: A4; margin: 15mm; }
    .cvp-builder-a4-fit { padding: 0 !important; }
    .cvp-builder-a4-fit > div {
      padding-top: 0 !important;
      padding-bottom: 0 !important;
      min-height: 0 !important;
    }
  `
      : "";
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
    ${t11Css}
  `;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600&display=swap"/>
<style>${style}</style>
</head>
<body data-template-id="${Number(templateId)}">
<div class="cvp-builder-a4-fit">${cvFragmentHtml}</div>
</body>
</html>`;
}

// ─── Hammad fixtures ──────────────────────────────────────────────────────────

const HAMMAD_BASE = {
  name: "Hammad Hassan",
  title: "System Administrator L2",
  email: "Hamm00366@gmail.com",
  phone: "+971 508097037",
  location: "Abu Dhabi, UAE",
  summary:
    "Experienced System Administrator with 5+ years of hands-on expertise in managing and maintaining complex IT infrastructures. Skilled in Active Directory, Windows Server administration, virtualization, networking, and enterprise-level support. Currently working with Etihad Airways, supporting critical aviation systems and ensuring high availability and performance. Strong problem-solving abilities with a proven track record of delivering efficient IT solutions and maintaining system reliability.",
  skills:
    "Active directory, Windows Server, Network Troubleshooting, Microsoft 365, Hyper - V, ITIL v4, Manage Engine",
  languages: "English, Urdu",
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
    "Key Achievements:",
    "Improved incident resolution efficiency by handling high-volume tickets with consistent SLA",
    "compliance.",
    "Minimized system downtime through proactive troubleshooting and maintenance.",
  ].join("\n"),
};

const CRONYSOFT_JOB = {
  company: "Cronysoft Solutions",
  role: "IT Support Specialist",
  location: "Karachi",
  period: "06/2021 – 08/2023",
  points: [
    "Provided L1/L2 support to 200+ enterprise users across hybrid Windows/Linux environments.",
    "Maintained Active Directory and group policy across two domain forests.",
    "Owned the on-call rotation for production incidents, averaging 12-min response time.",
    "Built PowerShell automation that reduced new-hire provisioning from 4 hours to 25 minutes.",
    "Coordinated with vendors on hardware refreshes for 80 endpoints.",
  ].join("\n"),
};

const SUPERNET_JOB = {
  company: "Supernet (Pvt) Ltd",
  role: "Network Operations Engineer",
  location: "Karachi",
  period: "09/2019 – 05/2021",
  points: [
    "Monitored MPLS and WAN links across 40 branch sites; maintained 99.92% uptime.",
    "Configured Cisco routers/switches and Fortinet firewalls per change-control standards.",
    "Resolved L2/L3 connectivity escalations within SLA, primary on-call for night shift.",
    "Authored runbooks for common failure modes adopted across the NOC team.",
  ].join("\n"),
};

const NEXTGEN_JOB = {
  company: "NextGen Telecom",
  role: "Service Desk Lead",
  location: "Lahore",
  period: "06/2017 – 08/2019",
  points: [
    "Led a 6-person service desk delivering 24/7 L1 support to 1,400 internal users.",
    "Drove ticket-deflection efforts via knowledge base, cutting inbound volume by 22%.",
    "Owned vendor relationships for Microsoft, Cisco, and Symantec service contracts.",
    "Mentored 4 graduate hires through the organisation's IT operations rotation.",
  ].join("\n"),
};

const HORIZON_JOB = {
  company: "Horizon Systems",
  role: "Junior IT Administrator",
  location: "Karachi",
  period: "08/2015 – 05/2017",
  points: [
    "Administered ~120 Windows endpoints and ~30 Linux servers across two offices.",
    "Built nightly backup verification scripts that caught 3 silent failures in year 1.",
    "Supported the migration from on-prem Exchange to Microsoft 365 for 200 mailboxes.",
  ].join("\n"),
};

const FIXTURES = {
  "tier-b": { ...HAMMAD_BASE, experience: [ETIHAD_JOB] },
  "tier-c": { ...HAMMAD_BASE, experience: [ETIHAD_JOB, CRONYSOFT_JOB, SUPERNET_JOB] },
  "tier-d": {
    ...HAMMAD_BASE,
    experience: [ETIHAD_JOB, CRONYSOFT_JOB, SUPERNET_JOB, NEXTGEN_JOB, HORIZON_JOB],
  },
};

const LOCAL_CHROME =
  process.env.CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

async function main() {
  const tier = (process.argv[2] || "tier-b").toLowerCase();
  const cv = FIXTURES[tier];
  if (!cv) {
    console.error(`Bad tier: ${tier} (expected tier-b, tier-c, or tier-d)`);
    process.exit(2);
  }

  const fragment = ReactDOMServer.renderToStaticMarkup(
    React.createElement(PreviewTechITPro, { cv, mobileMode: false }),
  );
  const docHtml = buildCvPdfHtmlDocument(fragment, 11);

  const outDir = path.join(projectRoot, "out");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

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

  // Mirror the post-fix injected @media print rules from api/generate-pdf.js.
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

  // Post-fix Puppeteer config for T11.
  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    displayHeaderFooter: true,
    headerTemplate: "<div></div>",
    footerTemplate: `
      <div style="font-family: 'Inter', sans-serif; font-size: 9px; color: #94A3B8; width: 100%; text-align: center; margin-bottom: 5mm;">
        Page <span class="pageNumber"></span> of <span class="totalPages"></span>
      </div>`,
  });

  const outName = tier === "tier-d" ? "t11-tier-d-stress.pdf" : `t11-${tier}-after.pdf`;
  const pdfPath = path.join(outDir, outName);
  fs.writeFileSync(pdfPath, pdfBuffer);

  let pageCount = null;
  try {
    const { PDFDocument } = require("pdf-lib");
    const loaded = await PDFDocument.load(pdfBuffer);
    pageCount = loaded.getPageCount();
  } catch (_) {}

  console.log(`Wrote ${pdfPath}  pages=${pageCount}  bytes=${pdfBuffer.length}`);
  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
