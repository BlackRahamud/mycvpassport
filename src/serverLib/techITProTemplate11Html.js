/**
 * Template 11 — Tech & IT Pro. Mirrors PreviewTechITPro in src/Template11TechITPro.js
 * Sidebar column uses transparent background; body gradient provides #1E2D45 (Puppeteer PDF).
 */

const {
  escapeHtml,
  stripEmojiPictographs,
  splitExperiencePointsForPreview,
  cvWithTemplateCertifications,
} = require("./pdfCommon");

const ACCENT = "#4A90D9";
const SLATE = "#1E2D45";
const OFFWHITE = "#F7F9FC";
const WHITE = "#FFFFFF";
const DARK = "#1A1A2E";
const MID = "#3D3D5C";
const SUBTLE = "#7A7A9A";
const SIDE_TEXT = "#B0BEC5";
const SIDE_SKILL = "#CFD8DC";

function sideLabel(text) {
  return `<div class="t11-sidelabel">${escapeHtml(text)}</div>`;
}

function mainTitle(text) {
  return `<div class="t11-main-title">${escapeHtml(text)}</div>`;
}

function buildTechITProTemplate11Html(rawCv) {
  const cv = cvWithTemplateCertifications(rawCv || {});

  const skillList = cv.skills ? cv.skills.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const techList = cv.technicalSkills
    ? cv.technicalSkills.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  const certList = cv.certifications ? cv.certifications.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const experience = Array.isArray(cv.experience) ? cv.experience : [];
  const education = Array.isArray(cv.education) ? cv.education : [];

  let sidebar = `<aside class="cvp-sidebar t11-side" data-fixed="sidebar"><div class="t11-side-inner">
    <h1 class="t11-side-name">${escapeHtml(cv.name || "Your Name")}</h1>
    <div class="t11-accent-bar" aria-hidden="true"></div>
    <p class="t11-side-title">${escapeHtml(cv.title || "IT Professional")}</p>
    ${sideLabel("Contact")}
    <div class="t11-side-text">
      ${cv.email ? `<div class="t11-break">${escapeHtml(stripEmojiPictographs(cv.email))}</div>` : ""}
      ${cv.phone ? `<div>${escapeHtml(stripEmojiPictographs(cv.phone))}</div>` : ""}
      ${cv.location ? `<div>${escapeHtml(stripEmojiPictographs(cv.location))}</div>` : ""}
    </div>`;

  if (cv.nationality || cv.visaStatus || cv.dob || cv.gender || cv.maritalStatus) {
    let pers = "";
    if (cv.nationality) {
      pers += `<div><span class="t11-lang-chev">›</span> ${escapeHtml(stripEmojiPictographs(cv.nationality))}</div>`;
    }
    if (cv.visaStatus) {
      pers += `<div><span class="t11-lang-chev">›</span> ${escapeHtml(stripEmojiPictographs(cv.visaStatus))}</div>`;
    }
    if (cv.dob) {
      const d = stripEmojiPictographs(cv.dob);
      if (d) pers += `<div><span class="t11-lang-chev">›</span> ${escapeHtml(d)}</div>`;
    }
    if (cv.gender) {
      pers += `<div><span class="t11-lang-chev">›</span> ${escapeHtml(stripEmojiPictographs(cv.gender))}</div>`;
    }
    if (cv.maritalStatus) {
      pers += `<div><span class="t11-lang-chev">›</span> ${escapeHtml(stripEmojiPictographs(cv.maritalStatus))}</div>`;
    }
    sidebar += `${sideLabel("Personal Info")}<div class="t11-side-text">${pers}</div>`;
  }

  if (skillList.length > 0 || techList.length > 0) {
    sidebar += `<div class="t11-skill-sections" data-block="skills">`;
    if (skillList.length > 0) {
      let sk = "";
      skillList.forEach((s) => {
        sk += `<div class="t11-skill-row">
        <span class="t11-skill-dot" aria-hidden="true"></span>
        <span class="t11-skill-txt">${escapeHtml(s)}</span>
      </div>`;
      });
      sidebar += `${sideLabel("Core Skills")}${sk}`;
    }

    if (techList.length > 0) {
      let tx = "";
      techList.forEach((s) => {
        tx += `<div class="t11-tech-row">
        <span class="t11-tech-dash">—</span>
        <span class="t11-tech-txt">${escapeHtml(s)}</span>
      </div>`;
      });
      sidebar += `${sideLabel("Tech Stack")}${tx}`;
    }
    sidebar += `</div>`;
  }

  if (cv.languages) {
    let lang = "";
    cv.languages.split(",").forEach((l) => {
      const x = stripEmojiPictographs(l.trim());
      if (x) {
        lang += `<div class="t11-lang-row">
          <span class="t11-lang-chev">›</span>
          <span>${escapeHtml(x)}</span>
        </div>`;
      }
    });
    if (lang) sidebar += `<div class="t11-lang-section" data-block="languages">${sideLabel("Languages")}${lang}</div>`;
  }

  if (certList.length > 0) {
    let cert = "";
    certList.forEach((c) => {
      cert += `<div class="t11-cert-row">
        <span class="t11-cert-star">✦</span>
        <span class="t11-cert-txt">${escapeHtml(stripEmojiPictographs(c))}</span>
      </div>`;
    });
    sidebar += `<div class="t11-cert-section" data-block="certifications">${sideLabel("Certifications")}${cert}</div>`;
  }

  if (cv.availability || cv.drivingLicense || cv.willingToRelocate) {
    let add = "";
    if (cv.availability) {
      const tx = escapeHtml(stripEmojiPictographs(cv.availability));
      if (tx) add += `<div><span class="t11-lang-chev">›</span> ${tx}</div>`;
    }
    if (cv.drivingLicense) {
      const tx = escapeHtml(stripEmojiPictographs(cv.drivingLicense));
      if (tx) add += `<div><span class="t11-lang-chev">›</span> ${tx}</div>`;
    }
    if (cv.willingToRelocate) {
      const tx = escapeHtml(stripEmojiPictographs(cv.willingToRelocate));
      if (tx) add += `<div><span class="t11-lang-chev">›</span> Relocate: ${tx}</div>`;
    }
    if (add) sidebar += `${sideLabel("Additional")}<div class="t11-side-text">${add}</div>`;
  }

  sidebar += `</div></aside>`;

  let main = `<main class="cvp-main t11-main" style="background:${OFFWHITE}">`;

  if (cv.summary) {
    main += `<section class="section" data-block="section">
      <h2 class="section-title">${mainTitle("Professional Summary")}</h2>
      <div class="section-body" data-block="text"><p class="t11-sum">${escapeHtml(cv.summary)}</p></div>
    </section>`;
  }

  if (experience.some((e) => e && e.company)) {
    let exp = `<section class="section" data-block="experience"><h2 class="section-title">${mainTitle("Professional Experience")}</h2><div class="section-body">`;
    experience
      .filter((e) => e && e.company)
      .forEach((e) => {
        const lines = e.points ? splitExperiencePointsForPreview(e.points) : [];
        const pts = lines
          .map((line) => `<li>${escapeHtml(line)}</li>`)
          .join("");

        exp += `<div class="break-guard"><div class="job-entry" data-block="job">
          <div class="job-header">
            <div class="t11-exp-head">
              <span class="t11-exp-role">${escapeHtml(e.role || "")}</span>
              <span class="t11-exp-period">${escapeHtml(e.period || "")}</span>
            </div>
            <div class="t11-exp-co">${escapeHtml(e.company || "")}${e.location ? ` — ${escapeHtml(e.location)}` : ""}</div>
          </div>
          ${pts ? `<div class="job-body"><ul class="job-points" data-block="list">${pts}</ul></div>` : ""}
        </div></div>`;
      });
    exp += `</div></section>`;
    main += exp;
  }

  if (education.some((e) => e && e.school)) {
    let edu = "";
    education
      .filter((e) => e && e.school)
      .forEach((e) => {
        edu += `<div class="break-guard"><div class="t11-edu-row" data-block="edu">
          <div>
            <div class="t11-edu-deg">${escapeHtml(e.degree || "")}</div>
            <div class="t11-edu-sch">${escapeHtml(e.school || "")}</div>
          </div>
          <span class="t11-edu-year">${escapeHtml(e.year || "")}</span>
        </div></div>`;
      });
    main += `<section class="section" data-block="education"><h2 class="section-title">${mainTitle("Education")}</h2><div class="section-body">${edu}</div></section>`;
  }

  if (cv.references) {
    main += `<p class="t11-refs">${escapeHtml(cv.references)}</p>`;
  }

  main += `</main>`;

  const inner = `<div class="cvp-root t11-root">${sidebar}${main}</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <style>
    * { box-sizing: border-box; }
    @page { size: A4; margin: 0; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 10px;
      color: ${MID};
      margin: 0;
      padding: 0;
      background: linear-gradient(90deg, #1E2D45 65mm, #F7F9FC 65mm);
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .cvp-root {
      display: grid;
      grid-template-columns: 65mm 1fr;
      width: 210mm;
      min-height: 297mm;
      background: transparent;
      align-items: stretch;
    }
    .break-guard {
      display: block;
      width: 100%;
      break-inside: avoid-page;
      page-break-inside: avoid;
      -webkit-column-break-inside: avoid;
    }
    .cvp-new-page-start {
      margin-top: 10mm !important;
      padding-top: 5mm !important;
    }
    .t11-root {
      margin: 0 auto;
      max-width: 100%;
      border-radius: 0;
      overflow: visible;
    }
    .t11-side {
      background: transparent;
      padding: 24px 14px 24px 16px;
      min-width: 0;
    }
    /* (print pagination) avoid forcing full-height sidebar in print */
    .t11-side-name {
      font-size: 17px;
      font-weight: 900;
      color: ${WHITE};
      margin: 0 0 4px;
      line-height: 1.2;
    }
    .t11-accent-bar {
      width: 36px;
      height: 3px;
      background: ${ACCENT};
      border-radius: 2px;
      margin-bottom: 6px;
    }
    .t11-side-title {
      font-size: 9.5px;
      color: ${ACCENT};
      font-weight: 600;
      margin: 0 0 14px;
      line-height: 1.4;
    }
    .t11-sidelabel {
      font-size: 6px;
      font-weight: 800;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: ${ACCENT};
      margin-top: 16px;
      margin-bottom: 5px;
      padding-bottom: 3px;
      border-bottom: 1px solid ${ACCENT}44;
    }
    .t11-side-text {
      font-size: 8.5px;
      color: ${SIDE_TEXT};
      line-height: 2;
    }
    .t11-break { word-break: break-all; }
    .t11-skill-row {
      display: flex;
      align-items: flex-start;
      gap: 5px;
      margin-bottom: 5px;
      line-height: 1.4;
    }
    .t11-skill-dot {
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: ${ACCENT};
      flex-shrink: 0;
      margin-top: 3px;
    }
    .t11-skill-txt { font-size: 8.5px; color: ${SIDE_SKILL}; }
    .t11-tech-row {
      display: flex;
      align-items: flex-start;
      gap: 5px;
      margin-bottom: 4px;
      line-height: 1.4;
    }
    .t11-tech-dash { color: ${ACCENT}; font-size: 10px; line-height: 1; flex-shrink: 0; }
    .t11-tech-txt { font-size: 8px; color: ${SIDE_TEXT}; }
    .t11-lang-row {
      display: flex;
      align-items: center;
      gap: 5px;
      margin-bottom: 4px;
      font-size: 8.5px;
      color: ${SIDE_TEXT};
    }
    .t11-lang-chev { color: ${ACCENT}; }
    .t11-cert-row {
      display: flex;
      align-items: flex-start;
      gap: 5px;
      margin-bottom: 5px;
      line-height: 1.5;
    }
    .t11-cert-star { color: ${ACCENT}; flex-shrink: 0; font-size: 8px; }
    .t11-cert-txt { font-size: 8px; color: ${SIDE_TEXT}; }
    .t11-main {
      background: ${OFFWHITE};
      padding: 24px 20px;
      min-width: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .t11-main-title {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: ${SLATE};
      margin: 16px 0 4px;
      padding-bottom: 3px;
      border-bottom: 2px solid ${ACCENT};
      display: inline-block;
    }
    .t11-main-title:first-child { margin-top: 0; }
    .t11-sum {
      font-size: 10px;
      line-height: 1.8;
      color: ${MID};
      margin: 8px 0 0;
    }
    .section { margin-top: 12px; }
    .section-title { display: block; }
    .section-body { display: block; }
    .job-entry { margin-top: 12px; }
    .t11-exp-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 10px;
    }
    .t11-exp-role {
      font-size: 11px;
      font-weight: 800;
      color: ${DARK};
    }
    .t11-exp-period {
      font-size: 10px;
      color: #888888;
      flex-shrink: 0;
      margin-left: auto;
      text-align: right;
      font-weight: 400;
    }
    .t11-exp-co {
      font-size: 9.5px;
      color: ${MID};
      font-style: italic;
      font-weight: 500;
      margin: 2px 0 5px;
    }
    .job-points {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .job-points li {
      position: relative;
      padding-left: 12px;
      margin: 0 0 4px;
      font-size: 9.5px;
      color: ${MID};
      line-height: 1.6;
      word-break: normal;
      overflow-wrap: break-word;
    }
    .job-points li::before {
      content: "•";
      position: absolute;
      left: 0;
      top: 0;
      color: ${MID};
    }
    .t11-edu-row {
      margin-top: 10px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 10px;
    }
    .t11-edu-deg { font-size: 10.5px; font-weight: 700; color: ${DARK}; }
    .t11-edu-sch { font-size: 9.5px; color: ${SUBTLE}; font-style: italic; }
    .t11-edu-year {
      font-size: 8px;
      color: ${ACCENT};
      font-weight: 700;
      flex-shrink: 0;
      margin-left: 10px;
    }
    .t11-refs {
      font-size: 9px;
      font-style: italic;
      color: ${SUBTLE};
      margin: 16px 0 0;
      padding-top: 10px;
      border-top: 1px solid ${ACCENT}33;
    }

    @media print {
      html, body { margin: 0; padding: 0; }

      body {
        background: linear-gradient(90deg, #1E2D45 65mm, #F7F9FC 65mm) !important;
      }

      .cvp-root {
        display: block !important;
        width: 210mm;
        min-height: auto !important;
        height: auto !important;
        background: transparent;
      }
      .cvp-sidebar {
        float: left !important;
        width: 65mm !important;
        position: static !important;
      }
      .cvp-main {
        margin-left: 65mm !important;
        width: 145mm !important;
        display: block !important;
      }

      .break-guard {
        break-inside: auto !important;
        page-break-inside: auto !important;
      }
      .job-header {
        break-inside: avoid;
        page-break-inside: avoid;
        break-after: avoid;
        page-break-after: avoid;
      }
      .job-body,
      .job-points,
      .job-points li {
        break-inside: auto !important;
        page-break-inside: auto !important;
      }
      .section,
      .t11-edu-row {
        break-inside: auto !important;
        page-break-inside: auto !important;
      }
      .job-entry { margin-bottom: 14px; }

      .section-title,
      .t11-main-title,
      h2, h3 {
        break-after: avoid !important;
        page-break-after: avoid !important;
      }

      p, li { orphans: 2; widows: 2; }
    }
  </style>
</head>
<body>
${inner}
</body>
</html>`;
}

module.exports = { buildTechITProTemplate11Html };
