/**
 * Template 13 — Finance. Dense single column, Arial-based.
 * Mirrors PreviewFinance in src/Template13Finance.js
 */

const {
  escapeHtml,
  stripEmojiPictographs,
  splitExperiencePointsForPreview,
  cvWithTemplateCertifications,
} = require("./pdfCommon");

const ACCENT = "#5c6ac4";
const TEXT_PRIMARY = "#1f2933";
const TEXT_SECONDARY = "#6b7280";
const DIVIDER = "#e5e7eb";
const SKELETON_BG = "#D1D5DB";

function sectionTitle(label) {
  return `
    <div class="t13-section-title">
      <h2>${escapeHtml(label)}</h2>
      <div class="t13-section-divider"></div>
    </div>
  `;
}

function buildFinanceTemplate13Html(rawCv) {
  const cv = cvWithTemplateCertifications(rawCv || {});
  const isPlaceholder = !cv.name || String(cv.name).trim() === "";

  if (isPlaceholder) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <style>
    @page { size: A4; margin: 0; }
    body {
      margin: 0;
      width: 794px;
      height: 1123px;
      max-width: 100%;
      background: ${SKELETON_BG};
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: Arial, sans-serif;
      color: ${TEXT_SECONDARY};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .ph { font-size: 14px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="ph">Loading Template 13...</div>
</body>
</html>`;
  }

  const experience = Array.isArray(cv.experience) ? cv.experience : [];
  const education = Array.isArray(cv.education) ? cv.education : [];
  const languages = cv.languages ? String(cv.languages).split(",").map((l) => l.trim()).filter(Boolean) : [];
  const skills = cv.skills ? String(cv.skills).split(",").map((s) => s.trim()).filter(Boolean) : [];
  const certifications = cv.certifications ? String(cv.certifications).split(",").map((c) => c.trim()).filter(Boolean) : [];

  const contactParts = [];
  if (cv.phone) contactParts.push(escapeHtml(stripEmojiPictographs(cv.phone)));
  if (cv.email) {
    if (contactParts.length) contactParts.push("•");
    contactParts.push(escapeHtml(stripEmojiPictographs(cv.email)));
  }
  if (cv.location) {
    if (contactParts.length) contactParts.push("•");
    contactParts.push(escapeHtml(stripEmojiPictographs(cv.location)));
  }
  // Preview contact row order: phone • email • location, omitting missing parts.
  const contactRow = contactParts.length ? `<div class="t13-contact">${contactParts.join(" ")}</div>` : "";

  let left = "";
  if (experience.length) {
    let expHtml = "";
    experience.forEach((exp) => {
      let pointsHtml = "";
      if (exp.points) {
        const points = splitExperiencePointsForPreview(exp.points);
        pointsHtml = points
          .map(
            (p) => `
              <div class="t13-point">
                <span class="t13-dot">•</span>
                <span>${escapeHtml(p)}</span>
              </div>
            `,
          )
          .join("");
      }
      expHtml += `
        <div class="t13-item">
          <div class="t13-exp-role">${escapeHtml(exp.role || "")}</div>
          <div class="t13-exp-meta">${escapeHtml(exp.company || "")} • ${escapeHtml(exp.period || "")}</div>
          ${pointsHtml}
        </div>
      `;
    });

    left += `${sectionTitle("Experience")}${expHtml}`;
  }

  if (education.length) {
    let eduHtml = education
      .map(
        (edu) => `
        <div class="t13-item">
          <div class="t13-edu-degree">${escapeHtml(edu.degree || "")}</div>
          <div class="t13-edu-meta">${escapeHtml(edu.school || "")} • ${escapeHtml(edu.year || "")}</div>
        </div>
      `,
      )
      .join("");
    left += `${sectionTitle("Education")}${eduHtml}`;
  }

  if (skills.length) {
    left += `${sectionTitle("Skills")}<div class="t13-skills">${skills.map((s) => `<span class="t13-skill">${escapeHtml(s)}</span>`).join("")}</div>`;
  }

  let right = "";
  right += `${sectionTitle("Professional Summary")}<p class="t13-summary">${escapeHtml(cv.summary || "")}</p>`;

  right += `
    ${sectionTitle("Key Metrics")}
    <div class="t13-metrics">
      <div class="t13-metric"><span class="t13-metric-label">Portfolio:</span> $2.5M+</div>
      <div class="t13-metric"><span class="t13-metric-label">Cost Reduction:</span> 15%</div>
    </div>
  `;

  const certHtml =
    certifications.length
      ? certifications.map((c) => `<div class="t13-bullet">• ${escapeHtml(c)}</div>`).join("")
      : `<div class="t13-bullet">• CFA Level 1</div>`;

  right += `${sectionTitle("Certifications")}<div class="t13-certs">${certHtml}</div>`;

  const langsHtml = languages.length ? languages.map((l) => `<div class="t13-lang">${escapeHtml(l)} — Fluent</div>`).join("") : "";
  right += `${sectionTitle("Languages")}<div class="t13-langs">${langsHtml}</div>`;

  right += `
    ${sectionTitle("Courses")}
    <div class="t13-course">
      <div class="t13-course-title">Advanced System Design</div>
      <div class="t13-course-desc">Focus on scalability and fault tolerance.</div>
    </div>
    ${sectionTitle("Interests")}
    <div class="t13-course">
      <div class="t13-course-title">UI/UX Research</div>
      <div class="t13-course-desc">Passionate about accessible design patterns.</div>
    </div>
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: Arial, sans-serif;
      width: 794px;
      max-width: 100%;
      background: #fff;
      color: ${TEXT_PRIMARY};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .t13-root {
      width: 794px;
      max-width: 100%;
      margin: 0 auto;
      background: #fff;
    }
    .t13-topbar { height: 6px; background: ${ACCENT}; width: 100%; }

    .t13-header { padding: 32px 32px 20px 32px; }
    .t13-name { font-size: 28px; font-weight: 700; margin: 0; letter-spacing: -0.5px; text-transform: uppercase; color: ${TEXT_PRIMARY}; }
    .t13-title { font-size: 14px; color: ${TEXT_SECONDARY}; margin: 4px 0 12px 0; }
    .t13-contact { display: flex; flex-wrap: wrap; gap: 10px; font-size: 12px; color: ${TEXT_SECONDARY}; }

    .t13-content {
      display: flex;
      flex-direction: row;
      gap: 40px;
      padding: 0 32px 32px 32px;
    }

    .t13-left { flex: 0 0 62%; }
    .t13-right { flex: 1; }

    .t13-section-title { margin-bottom: 12px; }
    .t13-section-title h2 {
      font-size: 12px;
      font-weight: 700;
      color: ${TEXT_SECONDARY};
      text-transform: uppercase;
      letter-spacing: 1px;
      margin: 0 0 8px 0;
    }
    .t13-section-divider { height: 1px; background: ${DIVIDER}; width: 100%; }

    .t13-item { margin-bottom: 20px; break-inside: avoid; page-break-inside: avoid; }

    .t13-exp-role { font-weight: 700; color: ${TEXT_PRIMARY}; font-size: 14px; margin-bottom: 0; }
    .t13-exp-meta { color: ${TEXT_SECONDARY}; font-size: 12px; margin-bottom: 6px; }

    .t13-point { font-size: 12.5px; color: ${TEXT_PRIMARY}; margin-bottom: 4px; display: flex; line-height: 1.5; }
    .t13-dot { margin-right: 8px; color: ${ACCENT}; }

    .t13-edu-degree { font-weight: 700; color: ${TEXT_PRIMARY}; font-size: 13px; }
    .t13-edu-meta { color: ${TEXT_SECONDARY}; font-size: 12px; margin-top: 0; }

    .t13-skills { display: flex; flex-wrap: wrap; gap: 8px; }
    .t13-skill { padding: 5px 12px; background: #e6eef7; color: ${TEXT_PRIMARY}; border-radius: 6px; font-size: 12px; }

    .t13-summary { font-size: 12.5px; color: ${TEXT_PRIMARY}; line-height: 1.5; margin: 0 0 24px 0; }

    .t13-metrics { display: flex; flex-direction: column; gap: 8px; margin-bottom: 24px; }
    .t13-metric { font-size: 12px; }
    .t13-metric-label { color: ${ACCENT}; font-weight: 700; }

    .t13-certs { font-size: 12px; color: ${TEXT_PRIMARY}; line-height: 1.8; margin-bottom: 24px; }
    .t13-bullet { margin: 0; }

    .t13-langs { font-size: 12px; color: ${TEXT_PRIMARY}; }
    .t13-lang { margin: 0 0 2px 0; }

    .t13-course { margin-bottom: 16px; }
    .t13-course-title { font-weight: 700; font-size: 12px; color: ${TEXT_PRIMARY}; }
    .t13-course-desc { font-size: 11px; color: ${TEXT_SECONDARY}; margin-top: 2px; }

    @media print {
      html, body { margin: 0; padding: 0; }
      .t13-item { break-inside: avoid; page-break-inside: avoid; }
      p { orphans: 3; widows: 3; }
      .t13-section-title, .t13-item { break-after: avoid; page-break-after: avoid; }
    }
  </style>
</head>
<body>
  <div class="t13-root">
    <div class="t13-topbar"></div>
    <header class="t13-header">
      <h1 class="t13-name">${escapeHtml(cv.name || "").toUpperCase()}</h1>
      <div class="t13-title">${escapeHtml(cv.title || "Finance Professional")}</div>
      ${contactRow}
    </header>
    <div class="t13-content">
      <div class="t13-left">${left}</div>
      <div class="t13-right">${right}</div>
    </div>
  </div>
</body>
</html>`;
}

module.exports = { buildFinanceTemplate13Html };

