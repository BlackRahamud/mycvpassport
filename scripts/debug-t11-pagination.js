/**
 * Local instrumented harness for the T11 LANGUAGES-orphan bug.
 *
 * Renders a hand-crafted Hammad fixture mirroring Template11TechITPro.js's
 * inline styles, wraps it the way downloadResumeFromPreview.js does, then
 * runs the same Puppeteer flow as api/generate-pdf.js with extra per-section
 * trace logging.
 *
 * Usage:
 *   node scripts/debug-t11-pagination.js          # Tier B (1 job)
 *   node scripts/debug-t11-pagination.js tier-c   # Tier C (3 jobs)
 *   node scripts/debug-t11-pagination.js tier-b after   # post-fix variant
 *   node scripts/debug-t11-pagination.js tier-c after
 *
 * Outputs to ./out/:
 *   t11-{tier}-{phase}.pdf
 *   t11-{tier}-{phase}-trace.txt
 */

const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");

const LOCAL_CHROME =
  process.env.CHROME_PATH ||
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

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

const HAMMAD_TIER_B = { ...HAMMAD_BASE, experience: [ETIHAD_JOB] };
const HAMMAD_TIER_C = {
  ...HAMMAD_BASE,
  experience: [ETIHAD_JOB, CRONYSOFT_JOB, SUPERNET_JOB],
};

// ─── HTML fixture: faithful translation of Template11TechITPro.js JSX ─────────

const NAVY = "#1E2D45";
const ACCENT = "#4A90D9";
const BODY = "#475569";
const DATE = "#94A3B8";
const FONT =
  'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

function esc(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function bulletItems(points) {
  if (points == null) return [];
  if (Array.isArray(points)) {
    return points.flatMap((p) =>
      bulletItems(typeof p === "string" ? p : p == null ? "" : String(p)),
    );
  }
  const raw = String(points).trim();
  if (!raw) return [];
  const byNl = raw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  if (byNl.length > 1) {
    return byNl.flatMap((line) =>
      line.includes("•")
        ? line.split("•").map((s) => s.trim()).filter(Boolean)
        : [line],
    );
  }
  const one = byNl[0] ?? raw;
  if (one.includes("•")) {
    return one.split("•").map((s) => s.trim()).filter(Boolean);
  }
  return [one];
}

/** Mirror of Template11TechITPro.js PreviewTechITPro JSX → static HTML. */
function renderT11FixtureHtml(cv) {
  const skillCore = cv.skills
    ? cv.skills.split(",").map((x) => x.trim()).filter(Boolean)
    : [];
  const langList = cv.languages
    ? cv.languages.split(",").map((l) => l.trim()).filter(Boolean)
    : [];

  const contactBits = [];
  if (cv.email)
    contactBits.push(
      `<a href="mailto:${esc(cv.email)}" style="color:${ACCENT};text-decoration:none">${esc(cv.email)}</a>`,
    );
  if (cv.phone)
    contactBits.push(
      `<a href="tel:${esc(cv.phone.replace(/\s/g, ""))}" style="color:${ACCENT};text-decoration:none">${esc(cv.phone)}</a>`,
    );
  if (cv.location)
    contactBits.push(`<span style="color:${BODY}">${esc(cv.location)}</span>`);

  const contactHtml = contactBits
    .map((c, i) =>
      i === 0
        ? `<span style="display:inline-flex;align-items:center;gap:6px">${c}</span>`
        : `<span style="display:inline-flex;align-items:center;gap:6px"><span style="color:${DATE}" aria-hidden>·</span>${c}</span>`,
    )
    .join("");

  const sectionTitle = (label, first) => `
    <div style="
      font-size:14pt;font-weight:700;color:${NAVY};text-transform:uppercase;
      letter-spacing:0.04em;font-family:${FONT};
      margin-top:${first ? 0 : "8mm"};margin-bottom:8mm;padding-bottom:2px;
      border-bottom:2px solid ${ACCENT};
      break-after:avoid;page-break-after:avoid;-webkit-column-break-after:avoid;
    ">${esc(label)}</div>`;

  const entryWrap = (inner) => `
    <div style="display:block">
      <div style="
        display:block;
        break-inside:avoid-page;page-break-inside:avoid;
        -webkit-column-break-inside:avoid;
        margin-bottom:6mm;
      ">${inner}</div>
    </div>`;

  let body = "";

  // Header
  body += `
    <header style="margin-bottom:8mm">
      <h1 style="font-size:24pt;font-weight:800;color:${NAVY};margin:0;line-height:1.15;font-family:${FONT}">${esc(cv.name)}</h1>
      <p style="font-size:12pt;font-weight:600;color:${ACCENT};margin:4px 0 10px;line-height:1.4;font-family:${FONT}">${esc(cv.title)}</p>
      <div style="font-size:10pt;line-height:1.5;display:flex;flex-wrap:wrap;gap:6px 12px;align-items:center">
        ${contactHtml}
      </div>
    </header>`;

  // Summary
  if (cv.summary) {
    body += `
      <section data-section="summary">
        ${sectionTitle("Professional Summary", true)}
        <div style="position:relative">
          <p style="font-size:10pt;line-height:1.5;color:${BODY};margin:0;margin-top:-4mm;margin-bottom:0">${esc(cv.summary)}</p>
        </div>
      </section>`;
  }

  // Skills
  if (skillCore.length > 0) {
    body += `
      <section data-section="competencies">
        ${sectionTitle("Skills", !cv.summary)}
        <div style="margin-top:-4mm">
          ${entryWrap(`
            <div style="position:relative">
              <p style="font-size:10pt;line-height:1.5;margin:0;color:${BODY}">${esc(skillCore.join(" · "))}</p>
            </div>
          `)}
        </div>
      </section>`;
  }

  // Experience
  const hasExp = Array.isArray(cv.experience) && cv.experience.some((e) => e.company);
  if (hasExp) {
    let entries = "";
    cv.experience.filter((e) => e.company).forEach((e) => {
      const bullets = bulletItems(e.points)
        .map(
          (line) => `
            <div class="cvp-preview-exp-t11-line" style="
              display:block;margin-bottom:4px;padding-left:12px;text-indent:-12px;
              line-height:1.5;font-size:10pt;color:${BODY};
            ">• ${esc(line)}</div>`,
        )
        .join("");
      entries += entryWrap(`
        <div style="position:relative">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
            <span style="font-size:10pt;font-weight:700;color:${NAVY}">${esc(e.role)}</span>
            <span style="font-size:10pt;color:${DATE};flex-shrink:0;text-align:right">${esc(e.period)}</span>
          </div>
          <div style="font-size:10pt;font-style:italic;color:${BODY};margin:2px 0 6px">
            ${esc(e.company)}${e.location ? ` — ${esc(e.location)}` : ""}
          </div>
        </div>
        ${bullets ? `<div class="cvp-preview-exp-t11-wrap">${bullets}</div>` : ""}
      `);
    });
    body += `
      <section data-section="experience">
        ${sectionTitle("Professional Experience", !cv.summary && skillCore.length === 0)}
        <div style="margin-top:-4mm">${entries}</div>
      </section>`;
  }

  // Education
  const hasEdu = Array.isArray(cv.education) && cv.education.some((e) => e.school);
  if (hasEdu) {
    let entries = "";
    cv.education.filter((e) => e.school).forEach((e) => {
      entries += entryWrap(`
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
          <div>
            <div style="font-size:10pt;font-weight:700;color:${NAVY}">${esc(e.degree)}</div>
            <div style="font-size:10pt;font-style:italic;color:${BODY}">${esc(e.school)}</div>
          </div>
          <span style="font-size:10pt;color:${DATE};flex-shrink:0">${esc(e.year)}</span>
        </div>
      `);
    });
    body += `
      <section data-section="education">
        ${sectionTitle("Education", !cv.summary && skillCore.length === 0 && !hasExp)}
        <div style="margin-top:-4mm">${entries}</div>
      </section>`;
  }

  // Languages
  if (langList.length > 0) {
    body += `
      <section data-section="languages">
        ${sectionTitle("Languages", false)}
        <div style="margin-top:-4mm">
          ${entryWrap(`<p style="font-size:10pt;line-height:1.5;margin:0;color:${BODY}">${esc(langList.join(" · "))}</p>`)}
        </div>
      </section>`;
  }

  return `
    <div class="cvp-builder-a4-fit" style="
      background:#ffffff;width:794px;min-height:unset;height:auto;
      padding:32px;border-radius:8px;box-shadow:none;box-sizing:border-box;
    ">
      <div style="
        width:210mm;max-width:100%;min-height:297mm;height:auto;background:#FFFFFF;
        position:relative;
        background-image:linear-gradient(to right, #4A90D9 2px, transparent 2px);
        background-size:100% 100%;background-position:20mm 0;background-repeat:no-repeat;
        padding-left:30mm;padding-right:15mm;padding-top:15mm;padding-bottom:15mm;
        -webkit-print-color-adjust:exact;print-color-adjust:exact;
        box-sizing:border-box;font-family:${FONT};color:${BODY};overflow:visible;
        text-rendering:optimizeLegibility;-webkit-font-smoothing:antialiased;
      ">
        ${body}
      </div>
    </div>`;
}

// ─── Wrapper HTML doc — mirrors downloadResumeFromPreview.buildCvPdfHtmlDocument ──

function buildWrapperHtml(cvFragmentHtml, opts) {
  const phase = opts.phase || "before";
  const templateId = opts.templateId || null;

  // The "after" phase: T11-only overrides + @page 15mm CSS.
  // Mirrors the production fix that will land in downloadResumeFromPreview.js.
  // NOTE: applied UNCONDITIONALLY (not inside @media print). The wrapper HTML
  // only runs in the download path — it never touches the live builder preview
  // — so a screen-time override here is safe and avoids the @media print +
  // page.emulateMediaType('screen') interaction that was masking the fix.
  const afterT11Css =
    phase === "after" && templateId === 11
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
    ${afterT11Css}
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap"/>
<style>${style}</style>
</head>
<body${templateId ? ` data-template-id="${templateId}"` : ""}>
${cvFragmentHtml}
</body>
</html>`;
}

// ─── Main: mirrors api/generate-pdf.js Puppeteer flow + adds trace ────────────

async function main() {
  const tier = (process.argv[2] || "tier-b").toLowerCase();
  const phase = (process.argv[3] || "before").toLowerCase();
  if (!["tier-b", "tier-c"].includes(tier)) {
    console.error(`Bad tier: ${tier} (expected tier-b or tier-c)`);
    process.exit(2);
  }
  if (!["before", "after"].includes(phase)) {
    console.error(`Bad phase: ${phase} (expected before or after)`);
    process.exit(2);
  }

  const cv = tier === "tier-c" ? HAMMAD_TIER_C : HAMMAD_TIER_B;
  const fragmentHtml = renderT11FixtureHtml(cv);
  const docHtml = buildWrapperHtml(fragmentHtml, { phase, templateId: 11 });

  const outDir = path.join(__dirname, "..", "out");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: LOCAL_CHROME,
    headless: true,
    args: ["--no-sandbox", "--disable-gpu"],
  });

  const page = await browser.newPage();
  // Match api/generate-pdf.js viewport.
  await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
  await page.setContent(docHtml, { waitUntil: "networkidle0" });
  await Promise.race([
    page.evaluate(() => document.fonts.ready),
    new Promise((r) => setTimeout(r, 2000)),
  ]);
  await page.emulateMediaType("screen");

  // Mirror api/generate-pdf.js:99-112 injected @media print rules.
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

  // Mirror api/generate-pdf.js:114-297 layout pass + EXTRA per-section trace.
  const trace = await page.evaluate(({ phase, tier }) => {
    const out = { phase, tier };
    const wrapper = document.querySelector(".cvp-builder-a4-fit");
    const root = wrapper && wrapper.firstElementChild;
    out.wrapperRect = wrapper ? wrapper.getBoundingClientRect().toJSON() : null;
    out.rootRect = root ? root.getBoundingClientRect().toJSON() : null;
    out.documentHeight = document.documentElement.scrollHeight;

    // Puppeteer page math.
    // Before fix: margin top 10mm = 37.8px, bottom 15mm = 56.7px.
    // After fix (T11): margin 0, preferCSSPageSize true → @page margin 15mm = 56.7px each.
    const PX_PER_MM = 96 / 25.4;
    const A4_HEIGHT_PX = 297 * PX_PER_MM;
    const margins =
      phase === "after"
        ? { top: 15 * PX_PER_MM, bottom: 15 * PX_PER_MM }
        : { top: 10 * PX_PER_MM, bottom: 15 * PX_PER_MM };
    const usablePerPage = A4_HEIGHT_PX - margins.top - margins.bottom;
    out.A4_HEIGHT_PX = Math.round(A4_HEIGHT_PX);
    out.margins = {
      topPx: Math.round(margins.top),
      bottomPx: Math.round(margins.bottom),
    };
    out.usablePerPagePx = Math.round(usablePerPage);

    // Per-section trace.
    const sections = Array.from(document.querySelectorAll("[data-section]"));
    out.sections = sections.map((el) => {
      const r = el.getBoundingClientRect();
      const name = el.getAttribute("data-section");
      const top = Math.round(r.top);
      const bottom = Math.round(r.bottom);
      const height = Math.round(r.height);
      // Which Puppeteer page would this section's TOP land on?
      const pageOfTop = Math.floor(top / usablePerPage) + 1;
      const pageOfBottom = Math.floor(bottom / usablePerPage) + 1;
      return {
        name,
        topPx: top,
        bottomPx: bottom,
        heightPx: height,
        pageOfTop,
        pageOfBottom,
        straddles: pageOfTop !== pageOfBottom,
      };
    });

    // Per-job trace (inside experience).
    const jobs = Array.from(document.querySelectorAll('[data-section="experience"] > div > div > div'));
    out.firstExperienceEntries = jobs.slice(0, 3).map((el) => {
      const r = el.getBoundingClientRect();
      return {
        topPx: Math.round(r.top),
        bottomPx: Math.round(r.bottom),
        heightPx: Math.round(r.height),
      };
    });

    // Diagnose the orphan: which section is the LAST and where does it land?
    const last = out.sections[out.sections.length - 1];
    if (last) {
      out.diagnosis = {
        lastSectionName: last.name,
        lastSectionTopPx: last.topPx,
        lastSectionPage: last.pageOfTop,
        wouldFitOnPreviousPage:
          last.pageOfTop > 1 &&
          last.heightPx <
            usablePerPage - (last.topPx % usablePerPage),
        // How much earlier would it need to start to fit on page (last.pageOfTop - 1)?
        // The previous page ends at: (last.pageOfTop - 1) * usablePerPage
        previousPageEndPx: Math.round((last.pageOfTop - 1) * usablePerPage),
        gapBeforeOrphan: last.topPx - Math.round((last.pageOfTop - 1) * usablePerPage),
      };
    }

    return out;
  }, { phase, tier });

  // Run page.pdf with the appropriate config (mirrors api/generate-pdf.js).
  const pdfOpts =
    phase === "after"
      ? {
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
        }
      : {
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
        };

  const pdfBuffer = await page.pdf(pdfOpts);

  const pdfPath = path.join(outDir, `t11-${tier}-${phase}.pdf`);
  fs.writeFileSync(pdfPath, pdfBuffer);

  // Try to count pages using pdf-lib if available.
  let pageCount = null;
  try {
    const { PDFDocument } = require("pdf-lib");
    const loaded = await PDFDocument.load(pdfBuffer);
    pageCount = loaded.getPageCount();
  } catch (_) {
    // ignore
  }

  const lines = [];
  lines.push(`# T11 pagination trace — tier=${tier} phase=${phase}`);
  lines.push("");
  lines.push(`Hand-crafted Hammad fixture rendered through a faithful clone of`);
  lines.push(`the api/generate-pdf.js Puppeteer pipeline (viewport, addStyleTag,`);
  lines.push(`smart-pagination JS pass, page.pdf options).`);
  lines.push("");
  lines.push(`PDF written:        ${pdfPath}`);
  lines.push(`PDF page count:     ${pageCount == null ? "(pdf-lib not installed)" : pageCount}`);
  lines.push(`PDF size on disk:   ${fs.statSync(pdfPath).size} bytes`);
  lines.push("");
  lines.push(`Phase config:`);
  lines.push(`  Puppeteer margins (px): ${JSON.stringify(trace.margins)}`);
  lines.push(`  A4 page height (px):    ${trace.A4_HEIGHT_PX}`);
  lines.push(`  Usable area per page:   ${trace.usablePerPagePx} px`);
  lines.push("");
  lines.push(`Document measurements:`);
  lines.push(`  Wrapper rect:           ${JSON.stringify(trace.wrapperRect)}`);
  lines.push(`  T11 root rect:          ${JSON.stringify(trace.rootRect)}`);
  lines.push(`  Total document height:  ${trace.documentHeight} px`);
  lines.push("");
  lines.push(`Section-by-section (top-px, bottom-px, height-px, page-of-top, straddles?):`);
  for (const s of trace.sections) {
    lines.push(
      `  [${s.name.padEnd(13)}] top=${String(s.topPx).padStart(5)} bottom=${String(s.bottomPx).padStart(5)} height=${String(s.heightPx).padStart(4)}  page=${s.pageOfTop}${s.straddles ? "  STRADDLES BOUNDARY" : ""}`,
    );
  }
  if (trace.firstExperienceEntries && trace.firstExperienceEntries.length) {
    lines.push("");
    lines.push(`First experience entries (top, bottom, height in px):`);
    trace.firstExperienceEntries.forEach((e, i) => {
      lines.push(`  Entry ${i + 1}: top=${e.topPx} bottom=${e.bottomPx} height=${e.heightPx}`);
    });
  }
  lines.push("");
  lines.push(`Diagnosis:`);
  if (trace.diagnosis) {
    lines.push(`  Last section: ${trace.diagnosis.lastSectionName}`);
    lines.push(`  Lands on page: ${trace.diagnosis.lastSectionPage}`);
    lines.push(`  Top y in document: ${trace.diagnosis.lastSectionTopPx} px`);
    lines.push(`  Previous page ended at: ${trace.diagnosis.previousPageEndPx} px`);
    lines.push(`  Gap before orphan: ${trace.diagnosis.gapBeforeOrphan} px`);
  }
  lines.push("");

  const tracePath = path.join(outDir, `t11-${tier}-${phase}-trace.txt`);
  fs.writeFileSync(tracePath, lines.join("\n"));
  console.log(lines.join("\n"));
  console.log(`\nWrote: ${pdfPath}`);
  console.log(`Wrote: ${tracePath}`);

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
