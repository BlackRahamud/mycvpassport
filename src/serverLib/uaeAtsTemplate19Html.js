// =============================================================
// src/serverLib/uaeAtsTemplate19Html.js
//
// Server-side HTML twin of src/components/templates/UAEATSTemplate.jsx.
// Consumed by api/generate-pdf.js via BUILDERS[19] for the transform
// success download path. Output structure mirrors the React preview
// so screen and PDF are visually consistent.
//
// Single column, black on white, ATS-clean. No emoji, no progress
// bars, no decorative shapes. Page-break rules per research doc
// section 13. CSS variable design tokens per section 17.
// =============================================================

const { escapeHtml, splitExperiencePointsForPreview, buildPersonalDetailsEntries } = require("./pdfCommon");

const SECTION_TITLES = {
  summary: "Summary",
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  technicalSkills: "Technical Skills",
  languages: "Languages",
  certifications: "Certifications",
  projects: "Projects",
  publications: "Publications",
  volunteerWork: "Volunteer Work",
  references: "References",
};

const REGIONAL_LABEL_FALLBACK = {
  visa_status: "Visa Status",
  notice_period: "Notice Period",
  driving_license: "Driving License",
  nafis_registered: "Nafis Registered",
};

function trimStr(v) {
  return typeof v === "string" ? v.trim() : "";
}

function buildContactRow(cv) {
  return [trimStr(cv.phone), trimStr(cv.email), trimStr(cv.linkedin), trimStr(cv.location)].filter(Boolean);
}

function buildStatusEntries(cv) {
  const entries = [];
  if (Array.isArray(cv.customFields) && cv.customFields.length > 0) {
    for (const f of cv.customFields) {
      if (!f || typeof f !== "object") continue;
      const value = trimStr(f.value);
      if (!value) continue;
      const id = trimStr(f.id);
      const name = trimStr(f.name) || REGIONAL_LABEL_FALLBACK[id] || "";
      if (!name) continue;
      entries.push({ name, value });
    }
  }
  if (entries.length === 0) {
    for (const e of buildPersonalDetailsEntries(cv)) {
      entries.push({ name: e.label, value: e.value });
    }
    if (cv.availability) entries.push({ name: "Availability", value: trimStr(cv.availability) });
  }
  return entries;
}

function normalizeExperienceArray(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (e) => e && typeof e === "object"
      && (trimStr(e.company) || trimStr(e.role) || trimStr(e.points)),
  );
}

function normalizeEducationArray(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (e) => e && typeof e === "object"
      && (trimStr(e.school) || trimStr(e.degree) || trimStr(e.fieldOfStudy)),
  );
}

function normalizeCertificationsForRender(raw) {
  if (Array.isArray(raw)) {
    return raw
      .map((c) => {
        if (!c) return null;
        if (typeof c === "string") {
          const n = c.trim();
          return n ? { name: n, issuer: "", year: "" } : null;
        }
        if (typeof c === "object") {
          const name = trimStr(c.name);
          if (!name) return null;
          return { name, issuer: trimStr(c.issuer), year: trimStr(c.year) };
        }
        return null;
      })
      .filter(Boolean);
  }
  if (typeof raw === "string" && raw.trim()) {
    return raw.split(",").map((s) => s.trim()).filter(Boolean)
      .map((name) => ({ name, issuer: "", year: "" }));
  }
  return [];
}

function renderHeader(cv) {
  const name = trimStr(cv.name) || "Your Name";
  const title = trimStr(cv.title);
  const contactEntries = buildContactRow(cv);
  const statusEntries = buildStatusEntries(cv);

  const contactHtml = contactEntries.length > 0
    ? `<div class="uae-ats-contact-row">${contactEntries
        .map((c) => `<span>${escapeHtml(c)}</span>`)
        .join('<span class="uae-ats-pipe" aria-hidden="true">|</span>')}</div>`
    : "";

  const statusHtml = statusEntries.length > 0
    ? `<div class="uae-ats-status-row">${statusEntries
        .map((s) =>
          `<span><strong>${escapeHtml(s.name)}:</strong> ${escapeHtml(s.value)}</span>`,
        )
        .join('<span class="uae-ats-pipe" aria-hidden="true">|</span>')}</div>`
    : "";

  return `
    <header class="uae-ats-header-block">
      <h1>${escapeHtml(name)}</h1>
      ${title ? `<div class="uae-ats-target-title">${escapeHtml(title)}</div>` : ""}
      ${contactHtml}
      ${statusHtml}
    </header>
  `;
}

function renderExperienceItem(item) {
  const role = trimStr(item.role);
  const company = trimStr(item.company);
  const location = trimStr(item.location);
  const period = trimStr(item.period);
  const points = trimStr(item.points);
  const bullets = points ? splitExperiencePointsForPreview(points) : [];
  const leading = location ? `${role || ""} (${location})`.trim() : role;

  const bulletsHtml = bullets.length > 0
    ? `<ul>${bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>`
    : "";

  return `
    <div class="uae-ats-section-item">
      <div class="uae-ats-inline-header">
        <span class="uae-ats-inline-leading">${escapeHtml(leading)}</span>
        <span class="uae-ats-inline-middle">${escapeHtml(company)}</span>
        <span class="uae-ats-inline-trailing">${escapeHtml(period)}</span>
      </div>
      ${bulletsHtml}
    </div>
  `;
}

function renderEducationItem(item) {
  const degree = trimStr(item.degree);
  const fieldOfStudy = trimStr(item.fieldOfStudy);
  const school = trimStr(item.school);
  const location = trimStr(item.location);
  const year = trimStr(item.year);
  const degreeAndField = [degree, fieldOfStudy].filter(Boolean).join(", ");
  const schoolAndLocation = [school, location].filter(Boolean).join(", ");
  const leading = degreeAndField || school;
  const middle = degreeAndField ? schoolAndLocation : location;

  return `
    <div class="uae-ats-section-item">
      <div class="uae-ats-inline-header">
        <span class="uae-ats-inline-leading">${escapeHtml(leading)}</span>
        <span class="uae-ats-inline-middle">${escapeHtml(middle)}</span>
        <span class="uae-ats-inline-trailing">${escapeHtml(year)}</span>
      </div>
    </div>
  `;
}

function renderCertifications(certifications) {
  return `
    <ul class="uae-ats-section-item">
      ${certifications
        .map((c) => {
          const parts = [c.name, c.issuer, c.year].filter(Boolean).map(escapeHtml);
          return `<li>${parts.join(" - ")}</li>`;
        })
        .join("")}
    </ul>
  `;
}

function renderTechnicalSkills(raw) {
  const lines = String(raw || "").split("|").map((s) => s.trim()).filter(Boolean);
  if (lines.length === 0) return "";
  return `
    <div class="uae-ats-section-item">
      ${lines
        .map((line) => `<p class="uae-ats-skills-line">${escapeHtml(line)}</p>`)
        .join("")}
    </div>
  `;
}

function renderMultilineText(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (lines.length === 0) return "";
  return lines
    .map((line) => `<p class="uae-ats-section-item">${escapeHtml(line.replace(/^[-*•]\s+/, ""))}</p>`)
    .join("");
}

function renderSection(type, body) {
  return `
    <section class="uae-ats-section">
      <h3 class="uae-ats-section-heading">${escapeHtml(SECTION_TITLES[type])}</h3>
      ${body}
    </section>
  `;
}

function buildUaeAtsTemplate19Html(rawCv) {
  const cv = rawCv && typeof rawCv === "object" ? rawCv : {};

  const summary = trimStr(cv.summary);
  const experience = normalizeExperienceArray(cv.experience);
  const education = normalizeEducationArray(cv.education);
  const skills = trimStr(cv.skills);
  const technicalSkills = trimStr(cv.technicalSkills);
  const languages = trimStr(cv.languages);
  const certifications = normalizeCertificationsForRender(cv.certifications);
  const projects = trimStr(cv.projects);
  const publications = trimStr(cv.publications);
  const volunteerWork = trimStr(cv.volunteerWork);
  const references = trimStr(cv.references);

  const sectionsHtml = [
    summary
      ? renderSection("summary", `<p class="uae-ats-section-item">${escapeHtml(summary)}</p>`)
      : "",
    experience.length > 0
      ? renderSection("experience", experience.map(renderExperienceItem).join(""))
      : "",
    education.length > 0
      ? renderSection("education", education.map(renderEducationItem).join(""))
      : "",
    skills
      ? renderSection("skills", `<p class="uae-ats-section-item">${escapeHtml(skills)}</p>`)
      : "",
    technicalSkills
      ? renderSection("technicalSkills", renderTechnicalSkills(technicalSkills))
      : "",
    languages
      ? renderSection("languages", `<p class="uae-ats-section-item">${escapeHtml(languages)}</p>`)
      : "",
    certifications.length > 0
      ? renderSection("certifications", renderCertifications(certifications))
      : "",
    projects
      ? renderSection("projects", renderMultilineText(projects))
      : "",
    publications
      ? renderSection("publications", renderMultilineText(publications))
      : "",
    volunteerWork
      ? renderSection("volunteerWork", renderMultilineText(volunteerWork))
      : "",
    references
      ? renderSection("references", `<p class="uae-ats-section-item">${escapeHtml(references)}</p>`)
      : "",
  ].join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(trimStr(cv.name) || "CV")} - CVPassport</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" />
<style>
  @page { size: A4; margin: 0; }
  html, body {
    margin: 0;
    padding: 0;
    background: #ffffff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .uae-ats-page {
    --page-body-font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
    --page-body-font-size: 11;
    --page-body-line-height: 1.4;
    --page-heading-font-size: 14;
    --page-text-color: rgba(26,26,26,1);
    --page-primary-color: rgba(0,0,0,1);
    --page-background-color: rgba(255,255,255,1);
    --page-margin-x: 14pt;
    --page-margin-y: 12pt;
    --page-gap-y: 6pt;
    --page-section-gap: 9pt;

    width: 210mm;
    min-height: 297mm;
    font-family: var(--page-body-font-family);
    font-size: calc(var(--page-body-font-size) * 1pt);
    line-height: var(--page-body-line-height);
    color: var(--page-text-color);
    background: var(--page-background-color);
    padding: var(--page-margin-y) var(--page-margin-x);
    box-sizing: border-box;
  }
  .uae-ats-page * { box-sizing: border-box; }
  .uae-ats-page h1,
  .uae-ats-page h2,
  .uae-ats-page h3 {
    margin: 0;
    color: var(--page-primary-color);
    font-weight: 700;
  }
  .uae-ats-page h1 { font-size: calc(var(--page-heading-font-size) * 1.6pt); letter-spacing: 0.2pt; }
  .uae-ats-page h2 { font-size: calc(var(--page-heading-font-size) * 1.05pt); font-weight: 500; }
  .uae-ats-page h3 { font-size: calc(var(--page-heading-font-size) * 0.95pt); }
  .uae-ats-page p { margin: 0; }
  .uae-ats-page strong { font-weight: 700; }
  .uae-ats-page ul {
    margin: 3pt 0 0;
    padding: 0 0 0 14pt;
    list-style: disc outside;
  }
  .uae-ats-page li {
    margin: 1.5pt 0;
    line-height: var(--page-body-line-height);
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .uae-ats-header-block {
    border-bottom: 1px solid var(--page-primary-color);
    padding-bottom: var(--page-gap-y);
    margin-bottom: var(--page-gap-y);
  }
  .uae-ats-target-title {
    font-size: calc(var(--page-heading-font-size) * 1pt);
    font-weight: 500;
    margin-top: 1pt;
  }
  .uae-ats-contact-row,
  .uae-ats-status-row {
    margin-top: 4pt;
    font-size: calc(var(--page-body-font-size) * 0.95pt);
  }
  .uae-ats-status-row { margin-top: 2pt; }
  .uae-ats-pipe { padding: 0 6pt; opacity: 0.55; }

  .uae-ats-section { margin-top: var(--page-section-gap); }
  .uae-ats-section-heading {
    text-transform: uppercase;
    font-size: calc(var(--page-heading-font-size) * 0.92pt);
    font-weight: 700;
    letter-spacing: 0.6pt;
    border-bottom: 1px solid var(--page-primary-color);
    padding-bottom: 1.5pt;
    margin-bottom: 5pt;
    break-after: avoid;
    page-break-after: avoid;
  }
  .uae-ats-section-item {
    margin-bottom: 6pt;
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .uae-ats-section-item:last-child { margin-bottom: 0; }

  .uae-ats-inline-header {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) auto;
    gap: 0 12pt;
    align-items: baseline;
    margin-bottom: 1pt;
  }
  .uae-ats-inline-leading { font-weight: 700; }
  .uae-ats-inline-middle { font-weight: 500; }
  .uae-ats-inline-trailing {
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
    text-align: right;
  }
  .uae-ats-skills-line { margin: 1pt 0; }

  .uae-ats-page p[dir="rtl"],
  .uae-ats-page li[dir="rtl"] {
    direction: rtl;
    word-wrap: break-word;
  }
</style>
</head>
<body>
<div class="uae-ats-page">
  ${renderHeader(cv)}
  ${sectionsHtml}
</div>
</body>
</html>`;
}

module.exports = { buildUaeAtsTemplate19Html };
