// =============================================================
// src/serverLib/atsInternationalTemplate10Html.js
//
// Template 10 - ATS International (redesign 2026-05-03).
// Server-side HTML builder for Puppeteer PDF generation.
//
// Replaces the prior decorative two-column with hardcoded
// "Key Achievements / Courses / Interests" filler sections. The new
// layout is purpose-built for the transform pipeline output: clean
// two-column white surface, sky-blue accents (#0EA5E9, #0284C7),
// strict null-guarded sections (no placeholder filler), inline
// header pattern (role + dates on one line), and customFields[]
// support on the status row with flat-field fallback.
//
// Twin: src/Template10ATSInternational.js renders the same shape
// in React for the builder preview. Keep them visually consistent.
//
// Page-break safety per research doc section 13: every section item
// (.section, .exp-item, .edu-item, .skill-item, .lang-item, .summary,
// .tech-line) carries page-break-inside: avoid; section titles carry
// page-break-after: avoid.
// =============================================================

const { escapeHtml, splitExperiencePointsForPreview } = require("./pdfCommon");

// Read a regional field from customFields[] first (Session 2's
// escape hatch), falling back to a flat field on the cv root for
// pre-customFields data. Returns '' when no value is found.
function readCustomField(cv, ids, fallbackFlatField) {
  if (cv && Array.isArray(cv.customFields)) {
    for (const f of cv.customFields) {
      if (!f || typeof f !== "object") continue;
      const id = String(f.id || "").trim();
      const value = String(f.value || "").trim();
      if (ids.includes(id) && value) return value;
    }
  }
  if (fallbackFlatField && cv && cv[fallbackFlatField]) {
    return String(cv[fallbackFlatField]).trim();
  }
  return "";
}

function technicalSkillsGroupsForTemplate(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .filter((g) => g && Array.isArray(g.chips) && g.chips.length > 0)
      .map((g) => ({
        category: String(g.category || "").trim(),
        chips: g.chips.map((c) => String(c).trim()).filter(Boolean),
      }));
  }
  // Pipe-separated category format used by current cvShared:
  //   "Frontend: React, Vue, Tailwind | Backend: Node, Python"
  return String(raw)
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((line) => {
      const colonIdx = line.indexOf(":");
      if (colonIdx === -1) {
        return { category: "", chips: [line] };
      }
      const category = line.slice(0, colonIdx).trim();
      const chips = line
        .slice(colonIdx + 1)
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
      return { category, chips };
    })
    .filter((g) => g.category || g.chips.length > 0);
}

function buildContactPipes(cv) {
  return [cv.phone, cv.email, cv.location]
    .map((x) => String(x || "").trim())
    .filter(Boolean);
}

function buildStatusItems(cv) {
  const visa = readCustomField(cv, ["visa_status"], "visaStatus");
  const notice = readCustomField(cv, ["notice_period"], null);
  const license = readCustomField(cv, ["driving_license"], "drivingLicense");
  const items = [];
  if (visa) items.push({ label: "Visa", value: visa });
  if (notice) items.push({ label: "Notice", value: notice });
  if (license) items.push({ label: "License", value: license });
  return items;
}

function normalizeExperienceArray(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (e) =>
      e &&
      typeof e === "object" &&
      (String(e.role || "").trim() ||
        String(e.company || "").trim() ||
        String(e.points || "").trim()),
  );
}

function normalizeEducationArray(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (e) =>
      e &&
      typeof e === "object" &&
      (String(e.school || "").trim() ||
        String(e.degree || "").trim() ||
        String(e.fieldOfStudy || "").trim()),
  );
}

function normalizeCertsArray(raw) {
  if (Array.isArray(raw)) {
    return raw
      .map((c) => {
        if (!c) return null;
        if (typeof c === "string") {
          const n = c.trim();
          return n ? { name: n, issuer: "", year: "" } : null;
        }
        if (typeof c === "object") {
          const name = String(c.name || "").trim();
          if (!name) return null;
          return {
            name,
            issuer: String(c.issuer || "").trim(),
            year: String(c.year || "").trim(),
          };
        }
        return null;
      })
      .filter(Boolean);
  }
  if (typeof raw === "string" && raw.trim()) {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name) => ({ name, issuer: "", year: "" }));
  }
  return [];
}

function renderExperience(experience) {
  if (experience.length === 0) return "";
  return `
    <section class="section">
      <h2 class="section-title">Professional Experience</h2>
      ${experience
        .map((exp) => {
          const role = escapeHtml(String(exp.role || "").trim());
          const period = escapeHtml(String(exp.period || "").trim());
          const companyParts = [exp.company, exp.location]
            .map((x) => String(x || "").trim())
            .filter(Boolean)
            .map(escapeHtml)
            .join(" &middot; ");
          const bullets = String(exp.points || "").trim()
            ? splitExperiencePointsForPreview(exp.points)
            : [];
          const bulletsHtml = bullets
            .map(
              (b) =>
                `<div class="bullet"><span class="dot">&middot;</span><span>${escapeHtml(b)}</span></div>`,
            )
            .join("");
          return `
        <div class="exp-item">
          <div class="row-between">
            <div class="exp-role">${role}</div>
            ${period ? `<div class="meta">${period}</div>` : ""}
          </div>
          ${companyParts ? `<div class="exp-company">${companyParts}</div>` : ""}
          ${bulletsHtml}
        </div>`;
        })
        .join("")}
    </section>`;
}

function renderEducation(education) {
  if (education.length === 0) return "";
  return `
    <section class="section">
      <h2 class="section-title">Education</h2>
      ${education
        .map((edu) => {
          const degreeAndField = [edu.degree, edu.fieldOfStudy]
            .map((x) => String(x || "").trim())
            .filter(Boolean)
            .map(escapeHtml)
            .join(", ");
          const schoolAndLocation = [edu.school, edu.location]
            .map((x) => String(x || "").trim())
            .filter(Boolean)
            .map(escapeHtml)
            .join(" &middot; ");
          const year = escapeHtml(String(edu.year || "").trim());
          const leading = degreeAndField || escapeHtml(String(edu.school || "").trim());
          const middle = degreeAndField ? schoolAndLocation : escapeHtml(String(edu.location || "").trim());
          return `
        <div class="edu-item">
          <div class="row-between">
            <div class="edu-degree">${leading}</div>
            ${year ? `<div class="meta">${year}</div>` : ""}
          </div>
          ${middle ? `<div class="edu-school">${middle}</div>` : ""}
        </div>`;
        })
        .join("")}
    </section>`;
}

function renderSummary(summary) {
  if (!summary) return "";
  return `
    <section class="section">
      <h2 class="section-title">Profile</h2>
      <p class="summary">${escapeHtml(summary)}</p>
    </section>`;
}

function renderSkills(skills) {
  // Flat comma-separated string today; render as bordered list rows
  // (no pills, no progress bars - matches design diff "+ Skills:
  // bordered list rows").
  if (!skills) return "";
  const items = String(skills)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (items.length === 0) return "";
  return `
    <section class="section">
      <h2 class="section-title">Core Skills</h2>
      <ul class="skill-list">
        ${items
          .map((s, i) => {
            const last = i === items.length - 1 ? " last" : "";
            return `<li class="skill-item${last}">${escapeHtml(s)}</li>`;
          })
          .join("")}
      </ul>
    </section>`;
}

function renderTechnicalSkills(technicalSkills) {
  const groups = technicalSkillsGroupsForTemplate(technicalSkills);
  if (groups.length === 0) return "";
  return `
    <section class="section">
      <h2 class="section-title">Technical Skills</h2>
      <div>
        ${groups
          .map((g) => {
            const cat = g.category ? `<strong>${escapeHtml(g.category)}:</strong> ` : "";
            const chips = g.chips.map(escapeHtml).join(", ");
            return `<p class="tech-line">${cat}${chips}</p>`;
          })
          .join("")}
      </div>
    </section>`;
}

function renderLanguages(languages) {
  if (!languages) return "";
  const items = String(languages)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (items.length === 0) return "";
  return `
    <section class="section">
      <h2 class="section-title">Languages</h2>
      <div>
        ${items
          .map((l) => `<div class="lang-item">${escapeHtml(l)}</div>`)
          .join("")}
      </div>
    </section>`;
}

function renderCertifications(certs) {
  if (certs.length === 0) return "";
  return `
    <section class="section">
      <h2 class="section-title">Certifications</h2>
      <ul class="skill-list">
        ${certs
          .map((c, i) => {
            const last = i === certs.length - 1 ? " last" : "";
            const parts = [c.name, c.issuer, c.year].filter(Boolean).map(escapeHtml);
            return `<li class="skill-item${last}">${parts.join(" &mdash; ")}</li>`;
          })
          .join("")}
      </ul>
    </section>`;
}

function renderMultilineSection(title, raw) {
  const text = String(raw || "").trim();
  if (!text) return "";
  const lines = text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (lines.length === 0) return "";
  return `
    <section class="section">
      <h2 class="section-title">${escapeHtml(title)}</h2>
      <div>
        ${lines
          .map(
            (l) =>
              `<p class="tech-line">${escapeHtml(l.replace(/^[-*•]\s+/, ""))}</p>`,
          )
          .join("")}
      </div>
    </section>`;
}

function pdfATSInternational(rawCv) {
  const cv = rawCv && typeof rawCv === "object" ? rawCv : {};

  const name = escapeHtml(String(cv.name || "").trim());
  const role = escapeHtml(String(cv.title || "").trim());
  const contactItems = buildContactPipes(cv);
  const statusItems = buildStatusItems(cv);

  const summary = String(cv.summary || "").trim();
  const experience = normalizeExperienceArray(cv.experience);
  const education = normalizeEducationArray(cv.education);
  const skills = String(cv.skills || "").trim();
  const technicalSkills = cv.technicalSkills;
  const languages = String(cv.languages || "").trim();
  const certifications = normalizeCertsArray(cv.certifications);
  const projects = String(cv.projects || "").trim();
  const publications = String(cv.publications || "").trim();
  const volunteerWork = String(cv.volunteerWork || "").trim();
  const references = String(cv.references || "").trim();

  const contactHtml =
    contactItems.length > 0
      ? `<div class="contact">${contactItems
          .map((c) => `<span>${escapeHtml(c)}</span>`)
          .join('<span class="sep">|</span>')}</div>`
      : "";

  const statusHtml =
    statusItems.length > 0
      ? `<div class="status">${statusItems
          .map(
            (s) =>
              `<span>${escapeHtml(s.label)}: ${escapeHtml(s.value)}</span>`,
          )
          .join('<span class="sep">|</span>')}</div>`
      : "";

  const leftColumnHtml = [
    renderExperience(experience),
    renderEducation(education),
    projects ? renderMultilineSection("Projects", projects) : "",
    publications ? renderMultilineSection("Publications", publications) : "",
    volunteerWork ? renderMultilineSection("Volunteer Work", volunteerWork) : "",
  ].join("");

  const rightColumnHtml = [
    renderSummary(summary),
    renderSkills(skills),
    renderTechnicalSkills(technicalSkills),
    renderLanguages(languages),
    renderCertifications(certifications),
    references
      ? `<section class="section"><h2 class="section-title">References</h2><p class="summary">${escapeHtml(references)}</p></section>`
      : "",
  ].join("");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>${name || "CV"} - CVPassport</title>
<style>
  @page { size: A4; margin: 0; }
  html, body {
    margin: 0; padding: 0;
    background: #ffffff;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  body {
    font-family: Helvetica, Arial, sans-serif;
    color: #334155;
  }
  .page {
    background: #ffffff;
    width: 210mm;
    min-height: auto;
    box-sizing: border-box;
  }
  .accent-bar {
    height: 4px;
    width: 100%;
    background: #0EA5E9;
  }
  .header {
    padding: 32px 40px 22px 40px;
    border-bottom: 1px solid #E2E8F0;
    background: #ffffff;
  }
  .name {
    font-size: 30px;
    font-weight: 700;
    color: #0F172A;
    margin: 0;
    letter-spacing: 0.02em;
    line-height: 1.1;
    text-transform: uppercase;
  }
  .role {
    font-size: 14px;
    color: #0284C7;
    margin: 6px 0 0 0;
    font-weight: 500;
    letter-spacing: 0.02em;
  }
  .contact {
    margin-top: 14px;
    font-size: 11.5px;
    color: #64748B;
    line-height: 1.5;
  }
  .contact .sep { color: #94A3B8; margin: 0 10px; }
  .status {
    margin-top: 8px;
    font-size: 11.5px;
    color: #0F172A;
    line-height: 1.5;
    font-weight: 500;
  }
  .status .sep { color: #0EA5E9; margin: 0 10px; font-weight: 700; }
  .body {
    display: flex;
    flex-direction: row;
    gap: 36px;
    padding: 26px 40px 32px 40px;
  }
  .col-left { flex: 0 0 62%; min-width: 0; }
  .col-right { flex: 1; min-width: 0; }
  .section {
    margin-bottom: 22px;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .section:last-child { margin-bottom: 0; }
  .section-title {
    font-size: 10.5px;
    font-weight: 700;
    color: #0284C7;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    margin: 0 0 10px 0;
    padding-bottom: 6px;
    border-bottom: 1px solid #E2E8F0;
    page-break-after: avoid;
    break-after: avoid;
  }
  .row-between {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
  }
  .meta {
    color: #64748B;
    font-size: 11.5px;
    font-weight: 500;
    white-space: nowrap;
  }
  .exp-item {
    margin-bottom: 18px;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .exp-item:last-child { margin-bottom: 0; }
  .exp-role { font-weight: 700; color: #0F172A; font-size: 13.5px; }
  .exp-company {
    color: #0284C7;
    font-size: 12px;
    font-weight: 500;
    margin: 2px 0 8px 0;
  }
  .bullet {
    font-size: 12.5px;
    color: #334155;
    margin-bottom: 4px;
    display: flex;
    line-height: 1.55;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .bullet .dot { margin-right: 10px; color: #0EA5E9; font-weight: 700; }
  .edu-item {
    margin-bottom: 12px;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .edu-item:last-child { margin-bottom: 0; }
  .edu-degree { font-weight: 700; color: #0F172A; font-size: 13px; }
  .edu-school {
    color: #0284C7;
    font-size: 12px;
    font-weight: 500;
    margin-top: 2px;
  }
  .summary {
    font-size: 12.5px;
    color: #334155;
    line-height: 1.55;
    margin: 0;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .skill-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .skill-item {
    font-size: 12.5px;
    color: #334155;
    line-height: 1.5;
    padding: 4px 0;
    border-bottom: 1px solid #E2E8F0;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .skill-item.last { border-bottom: none; }
  .tech-line {
    margin: 0 0 6px 0;
    font-size: 12.5px;
    color: #334155;
    line-height: 1.55;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .tech-line:last-child { margin-bottom: 0; }
  .tech-line strong { color: #0F172A; }
  .lang-item {
    font-size: 12.5px;
    color: #334155;
    line-height: 1.5;
    padding: 3px 0;
    page-break-inside: avoid;
    break-inside: avoid;
  }
</style>
</head>
<body>
<div class="page">
  <div class="accent-bar"></div>
  <header class="header">
    <h1 class="name">${name || "Your Name"}</h1>
    ${role ? `<p class="role">${role}</p>` : ""}
    ${contactHtml}
    ${statusHtml}
  </header>
  <div class="body">
    <div class="col-left">${leftColumnHtml}</div>
    <div class="col-right">${rightColumnHtml}</div>
  </div>
</div>
</body>
</html>`;
}

function buildATSInternationalTemplate10Html(rawCv) {
  return pdfATSInternational(rawCv || {});
}

module.exports = { buildATSInternationalTemplate10Html };
