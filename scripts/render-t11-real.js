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
 *
 * Requires devDependency `pdf-parse` for PDF text-stream inspection used by
 * the Round 2 regression check (verifies stream order matches visual order).
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

// Real Hammad data extracted verbatim from
// Hammad_Hassan_CVPassport (4).pdf — the Round 2 failing case.
// 6 bullets each (was 5 + 4 in the synthetic Round 1 fixture, which
// was light enough that all 3 jobs fit on page 1 → bug couldn't repro).
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

const SUPERNET_JOB = {
  company: "Supernet Limited",
  role: "Network Support Engineer",
  location: "Karachi, Pakistan",
  period: "09/2022 – 01/2023",
  points: [
    "Installed and configured network equipment and infrastructure for enterprise clients",
    "Diagnosed and resolved client technical issues efficiently using structured methodologies",
    "Provided remote technical support via calls and remote desktop tools",
    "Maintained client communication and escalated critical incidents to senior engineers",
    "Coordinated with vendors for hardware procurement and warranty claims",
    "Documented network configurations and maintained inventory records",
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
  // Optional flags: "trace" enables full DOM-order + visual-rect dump.
  // "out=<filename>" overrides the output PDF filename.
  const flags = process.argv.slice(3).reduce((acc, a) => {
    if (a === "trace") acc.trace = true;
    else if (a.startsWith("out=")) acc.outName = a.slice(4);
    return acc;
  }, {});
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

  // ─── Mirror api/generate-pdf.js smart-pagination JS pass ──────────────────
  // (relaxation pass + T11 page-break insertion + markPageStarts)
  // PLUS extra trace dump that captures DOM order + visual rects BEFORE and
  // AFTER the pass, so we can prove whether smart-pagination is mutating
  // sibling order or whether Chromium itself is paginating out of order.
  const trace = await page.evaluate(() => {
    const PX_PER_MM = 96 / 25.4;

    function describeNode(el) {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const text = (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80);
      const ds = el.getAttribute("data-section");
      const db = el.getAttribute("data-block");
      const tag = el.tagName.toLowerCase();
      return {
        tag,
        dataSection: ds,
        dataBlock: db,
        topPx: Math.round(r.top),
        bottomPx: Math.round(r.bottom),
        heightPx: Math.round(r.height),
        snippet: text,
      };
    }

    function takeOrderedSnapshot(label) {
      // T11's React render places experience entries inside
      // <section data-section="experience"> > <div style="margin-top:-4mm">
      // > many EntryWrap divs. Each EntryWrap is the outer "atomic" entry.
      const rootSections = Array.from(
        document.querySelectorAll("section[data-section]"),
      );
      const sectionOrder = rootSections.map((s) => ({
        ...describeNode(s),
        children: Array.from(s.children).map(describeNode),
      }));

      // Drill into the experience section and list each entry.
      const expSection = document.querySelector(
        'section[data-section="experience"]',
      );
      const expEntries = [];
      if (expSection) {
        // Walk to the entries — they're inside the wrapper div.
        const entryWrappers = expSection.querySelectorAll(
          'div[style*="break-inside"]',
        );
        entryWrappers.forEach((entry, i) => {
          const desc = describeNode(entry);
          // For each entry, capture the role span + bullets count.
          const role = entry.querySelector("span");
          const bullets = entry.querySelectorAll(".cvp-preview-exp-t11-line");
          desc.indexInExperience = i;
          desc.role = role ? role.textContent.trim() : null;
          desc.bulletCount = bullets.length;
          desc.firstBulletTopPx = bullets[0]
            ? Math.round(bullets[0].getBoundingClientRect().top)
            : null;
          desc.lastBulletBottomPx = bullets[bullets.length - 1]
            ? Math.round(
                bullets[bullets.length - 1].getBoundingClientRect().bottom,
              )
            : null;
          expEntries.push(desc);
        });
      }

      return { label, sectionOrder, expEntries };
    }

    const before = takeOrderedSnapshot("BEFORE smart-pagination pass");

    // ─── Smart-pagination pass — verbatim from api/generate-pdf.js ────────
    // (relaxation + T11 page-break insertion + markPageStarts)
    const PAGE_USABLE_PX = 1028;
    const SPLIT_THRESHOLD = PAGE_USABLE_PX * 0.35;
    const relaxedNodes = [];
    document
      .querySelectorAll('[style*="break-inside"], [style*="page-break-inside"]')
      .forEach((el) => {
        const h = el.getBoundingClientRect().height;
        if (h > SPLIT_THRESHOLD) {
          el.style.removeProperty("break-inside");
          el.style.removeProperty("page-break-inside");
          el.style.removeProperty("-webkit-column-break-inside");
          relaxedNodes.push({
            heightPx: Math.round(h),
            snippet: (el.textContent || "")
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, 60),
          });
        }
      });

    // T11 Round 2 fix: insert .cvp-page-break before any [data-block="job"]
    // that would straddle a page boundary, to sidestep Chromium's
    // text-stream reorder bug when an element with break-inside: avoid is
    // deferred to the next page. Mirrors the production fix in
    // api/generate-pdf.js (templateId === 11 branch).
    const T11_PAGE_USABLE_PX_FOR_BREAKS = Math.round((267 * 96) / 25.4);
    const t11BreakInserts = [];
    Array.from(document.querySelectorAll('[data-block="job"]')).forEach(
      (el) => {
        const r = el.getBoundingClientRect();
        const pageOfTop = Math.floor(r.top / T11_PAGE_USABLE_PX_FOR_BREAKS);
        const pageOfBottom = Math.floor(
          (r.bottom - 1) / T11_PAGE_USABLE_PX_FOR_BREAKS,
        );
        if (pageOfTop !== pageOfBottom && el.parentNode) {
          const brk = document.createElement("div");
          brk.className = "cvp-page-break";
          el.parentNode.insertBefore(brk, el);
          t11BreakInserts.push({
            topPx: Math.round(r.top),
            bottomPx: Math.round(r.bottom),
            heightPx: Math.round(r.height),
            snippet: (el.textContent || "")
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, 60),
          });
        }
      },
    );

    // markPageStarts (mirrors generate-pdf.js:255-269)
    const markedAsPageStart = [];
    const PAGE_HEIGHT_FOR_STARTS = 1027;
    document.querySelectorAll("[data-block]").forEach((el) => {
      const rect = el.getBoundingClientRect();
      const pageIndex = Math.floor(rect.top / PAGE_HEIGHT_FOR_STARTS);
      if (pageIndex > 0) {
        const distanceIntoPage = rect.top % PAGE_HEIGHT_FOR_STARTS;
        if (distanceIntoPage < 20) {
          el.classList.add("cvp-new-page-start");
          markedAsPageStart.push({
            dataBlock: el.getAttribute("data-block"),
            topPx: Math.round(rect.top),
            snippet: (el.textContent || "")
              .replace(/\s+/g, " ")
              .trim()
              .slice(0, 60),
          });
        }
      }
    });

    const after = takeOrderedSnapshot("AFTER smart-pagination pass");

    // T11 specific: enumerate Supernet header + bullets + EDU + LANG order.
    const supernet = after.expEntries.find(
      (e) => (e.role || "").toLowerCase().includes("network support engineer"),
    );
    const eduSection = document.querySelector(
      'section[data-section="education"]',
    );
    const langSection = document.querySelector(
      'section[data-section="languages"]',
    );

    const orderingProof = {
      supernet: supernet
        ? {
            entryTopPx: supernet.topPx,
            firstBulletTopPx: supernet.firstBulletTopPx,
            lastBulletBottomPx: supernet.lastBulletBottomPx,
            bulletCount: supernet.bulletCount,
          }
        : null,
      education: eduSection
        ? {
            topPx: Math.round(eduSection.getBoundingClientRect().top),
            heightPx: Math.round(eduSection.getBoundingClientRect().height),
          }
        : null,
      languages: langSection
        ? {
            topPx: Math.round(langSection.getBoundingClientRect().top),
            heightPx: Math.round(langSection.getBoundingClientRect().height),
          }
        : null,
    };

    return {
      docHeightPx: document.documentElement.scrollHeight,
      pageBoundary1Px: Math.round(15 * PX_PER_MM + (297 - 30) * PX_PER_MM), // 15mm + 267mm
      pageUsablePerPagePx: Math.round((297 - 30) * PX_PER_MM),
      relaxedNodes,
      t11BreakInserts,
      markedAsPageStart,
      before,
      after,
      orderingProof,
    };
  });

  // ─── Render PDF ────────────────────────────────────────────────────────────
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

  const defaultOutName =
    tier === "tier-d" ? "t11-tier-d-stress.pdf" : `t11-${tier}-after.pdf`;
  const outName = flags.outName || defaultOutName;
  const pdfPath = path.join(outDir, outName);
  fs.writeFileSync(pdfPath, pdfBuffer);

  let pageCount = null;
  try {
    const { PDFDocument } = require("pdf-lib");
    const loaded = await PDFDocument.load(pdfBuffer);
    pageCount = loaded.getPageCount();
  } catch (_) {}

  console.log(`Wrote ${pdfPath}  pages=${pageCount}  bytes=${pdfBuffer.length}`);

  if (flags.trace) {
    const traceLines = [];
    traceLines.push(
      `# T11 ${tier} reorder trace — render-t11-real.js (real React SSR)`,
    );
    traceLines.push("");
    traceLines.push(`PDF written:        ${pdfPath}`);
    traceLines.push(`PDF page count:     ${pageCount}`);
    traceLines.push(`PDF size:           ${pdfBuffer.length} bytes`);
    traceLines.push(`Document height:    ${trace.docHeightPx} px`);
    traceLines.push(
      `Page-1 boundary:    ${trace.pageBoundary1Px} px (after 15mm top + 267mm usable)`,
    );
    traceLines.push(
      `Usable per page:    ${trace.pageUsablePerPagePx} px (= 297mm - 30mm margins)`,
    );
    traceLines.push("");
    traceLines.push(
      `Relaxation pass — nodes that had break-inside stripped (height > ${Math.round(
        1028 * 0.35,
      )} px):`,
    );
    if (trace.relaxedNodes.length === 0) {
      traceLines.push("  (none)");
    } else {
      trace.relaxedNodes.forEach((n) =>
        traceLines.push(`  height=${n.heightPx} px  "${n.snippet}"`),
      );
    }
    traceLines.push("");
    traceLines.push(
      `T11 page-break inserts — [data-block="job"] entries that straddle a page boundary:`,
    );
    if (trace.t11BreakInserts.length === 0) {
      traceLines.push("  (none — no insertion needed)");
    } else {
      trace.t11BreakInserts.forEach((n) =>
        traceLines.push(
          `  inserted .cvp-page-break before entry  top=${n.topPx} bottom=${n.bottomPx} height=${n.heightPx}  "${n.snippet}"`,
        ),
      );
    }
    traceLines.push("");
    traceLines.push(
      `markPageStarts — nodes tagged .cvp-new-page-start (top within 20px of page boundary):`,
    );
    if (trace.markedAsPageStart.length === 0) {
      traceLines.push("  (none)");
    } else {
      trace.markedAsPageStart.forEach((n) =>
        traceLines.push(
          `  data-block="${n.dataBlock}" top=${n.topPx} "${n.snippet}"`,
        ),
      );
    }
    traceLines.push("");
    traceLines.push(`Section-by-section order (AFTER pagination pass):`);
    trace.after.sectionOrder.forEach((s) => {
      traceLines.push(
        `  <section data-section="${s.dataSection}"> top=${s.topPx} bottom=${s.bottomPx} height=${s.heightPx}`,
      );
    });
    traceLines.push("");
    traceLines.push(
      `Experience entries (AFTER pass) — DOM sibling order, visual rects:`,
    );
    trace.after.expEntries.forEach((e, i) => {
      traceLines.push(
        `  Entry #${i} role="${e.role}"  outer top=${e.topPx} bottom=${e.bottomPx} height=${e.heightPx}  bulletCount=${e.bulletCount}  firstBulletTop=${e.firstBulletTopPx}  lastBulletBottom=${e.lastBulletBottomPx}`,
      );
    });
    traceLines.push("");
    traceLines.push(`Ordering-proof (the four elements in question):`);
    if (trace.orderingProof.supernet) {
      const s = trace.orderingProof.supernet;
      traceLines.push(
        `  Supernet entry:    outer top=${s.entryTopPx}  firstBullet top=${s.firstBulletTopPx}  lastBullet bottom=${s.lastBulletBottomPx}`,
      );
    } else {
      traceLines.push(`  Supernet entry: NOT FOUND`);
    }
    if (trace.orderingProof.education) {
      const e = trace.orderingProof.education;
      traceLines.push(
        `  EDUCATION section: top=${e.topPx} height=${e.heightPx}`,
      );
    }
    if (trace.orderingProof.languages) {
      const l = trace.orderingProof.languages;
      traceLines.push(
        `  LANGUAGES section: top=${l.topPx} height=${l.heightPx}`,
      );
    }
    traceLines.push("");
    traceLines.push(`Diagnosis hint:`);
    if (
      trace.orderingProof.supernet &&
      trace.orderingProof.education &&
      trace.orderingProof.supernet.entryTopPx <
        trace.orderingProof.education.topPx
    ) {
      traceLines.push(
        `  DOM is in correct order (Supernet entry top=${trace.orderingProof.supernet.entryTopPx}`,
      );
      traceLines.push(
        `  < EDU top=${trace.orderingProof.education.topPx}). If the rendered PDF`,
      );
      traceLines.push(
        `  shows them out of order, this is a Chromium PAGINATION bug, not a DOM bug.`,
      );
    } else if (trace.orderingProof.supernet && trace.orderingProof.education) {
      traceLines.push(
        `  DOM IS OUT OF ORDER: Supernet entry top=${trace.orderingProof.supernet.entryTopPx}`,
      );
      traceLines.push(
        `  >= EDU top=${trace.orderingProof.education.topPx}. The smart-pagination pass`,
      );
      traceLines.push(`  is mutating sibling order — find the offending operation.`);
    }

    const tracePath = path.join(
      outDir,
      `${path.basename(outName, ".pdf")}-trace.txt`,
    );
    fs.writeFileSync(tracePath, traceLines.join("\n"));
    console.log(`Wrote ${tracePath}`);
  }

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
