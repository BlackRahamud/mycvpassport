/**
 * Template 13 — Finance. Dense single column, Arial, black/white. Mirrors PreviewFinance.
 */

const {
  escapeHtml,
  stripEmojiPictographs,
  splitExperiencePointsForPreview,
  cvWithTemplateCertifications,
} = require("./pdfCommon");

const BLACK = "#000000";
const MID = "#333333";

function sectionTitleT13(label) {
  return `<div class="t13-sec-wrap">
    <div class="t13-sec-title">${escapeHtml(label)}</div>
  </div>`;
}

function buildFinanceTemplate13Html(rawCv) {
  const cv = cvWithTemplateCertifications(rawCv || {});
  const skills = cv.skills ? cv.skills.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const certs = cv.certifications ? cv.certifications.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const techList = cv.technicalSkills ? cv.technicalSkills.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const experience = Array.isArray(cv.experience) ? cv.experience : [];
  const education = Array.isArray(cv.education) ? cv.education : [];

  const contactRow = [cv.email, cv.phone, cv.location, cv.nationality, cv.visaStatus].filter(Boolean).map((x) => escapeHtml(stripEmojiPictographs(x)));
  const extraRow = [];
  if (cv.dob) extraRow.push(`DOB: ${escapeHtml(stripEmojiPictographs(cv.dob))}`);
  if (cv.drivingLicense) extraRow.push(`Driving License: ${escapeHtml(stripEmojiPictographs(cv.drivingLicense))}`);

  let inner = `<div class="t13-root">
    <div class="t13-header">
      <div class="t13-name-wrap">
        <h1 class="t13-name">${escapeHtml(cv.name || "Your Name")}</h1>
      </div>
      <p class="t13-title">${escapeHtml(cv.title || "Professional Title")}</p>
      ${contactRow.length ? `<div class="t13-contact">${contactRow.join(" | ")}</div>` : ""}
      ${extraRow.length ? `<div class="t13-contact t13-extra">${extraRow.join(" | ")}</div>` : ""}
    </div>`;

  if (cv.summary) {
    inner += `${sectionTitleT13("Professional Summary")}<p class="t13-sum">${escapeHtml(cv.summary)}</p>`;
  }

  if (experience.some((e) => e && e.company)) {
    let exp = "";
    experience
      .filter((e) => e && e.company)
      .forEach((e) => {
        const lines = e.points ? splitExperiencePointsForPreview(e.points) : [];
        let bullets = "";
        lines.forEach((line) => {
          bullets += `<div class="t13-bull"><span class="t13-bull-dot">•</span> ${escapeHtml(line)}</div>`;
        });
        exp += `<div class="t13-exp">
          <div class="t13-exp-top">
            <span class="t13-co">${escapeHtml(e.company || "")}${e.location ? ` — ${escapeHtml(e.location)}` : ""}</span>
            <span class="t13-period">${escapeHtml(e.period || "")}</span>
          </div>
          <div class="t13-role">${escapeHtml(e.role || "")}</div>
          ${bullets}
        </div>`;
      });
    inner += `${sectionTitleT13("Professional Experience")}${exp}`;
  }

  if (education.some((e) => e && e.school)) {
    let edu = "";
    education
      .filter((e) => e && e.school)
      .forEach((e) => {
        edu += `<div class="t13-edu">
          <div>
            <div class="t13-school">${escapeHtml(e.school || "")}</div>
            <div class="t13-degree">${escapeHtml(e.degree || "")}</div>
          </div>
          <span class="t13-year">${escapeHtml(e.year || "")}</span>
        </div>`;
      });
    inner += `${sectionTitleT13("Education")}${edu}`;
  }

  if (skills.length > 0) {
    let grid = "";
    skills.forEach((s) => {
      grid += `<div class="t13-skill-cell">${escapeHtml(s)}</div>`;
    });
    inner += `${sectionTitleT13("Skills")}<div class="t13-skill-grid">${grid}</div>`;
  }

  if (techList.length > 0) {
    inner += `${sectionTitleT13("Technical Skills")}<p class="t13-body">${techList.map((s) => escapeHtml(s)).join(" | ")}</p>`;
  }

  if (certs.length > 0) {
    let certHtml = "";
    certs.forEach((c) => {
      certHtml += `<div class="t13-bull"><span class="t13-bull-dot">•</span> ${escapeHtml(c)}</div>`;
    });
    inner += `${sectionTitleT13("Certifications & Training")}${certHtml}`;
  }

  if (cv.languages) {
    inner += `${sectionTitleT13("Languages")}<p class="t13-body">${escapeHtml(cv.languages)}</p>`;
  }

  if (cv.availability || cv.willingToRelocate) {
    let add = "";
    if (cv.availability) add += `<div>${escapeHtml(stripEmojiPictographs(cv.availability))}</div>`;
    if (cv.willingToRelocate) add += `<div>Willing to relocate: ${escapeHtml(stripEmojiPictographs(cv.willingToRelocate))}</div>`;
    if (add) inner += `${sectionTitleT13("Additional Information")}<div class="t13-body">${add}</div>`;
  }

  if (cv.references) {
    inner += `${sectionTitleT13("References")}<p class="t13-refs">${escapeHtml(cv.references)}</p>`;
  }

  inner += `</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 13px;
      color: ${BLACK};
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .t13-root {
      width: 794px;
      max-width: 100%;
      margin: 0 auto;
      padding: 40px 48px;
      background: #fff;
    }
    .t13-header { margin-bottom: 14px; }
    .t13-name-wrap { padding-bottom: 8px; border-bottom: 2px solid ${BLACK}; margin-bottom: 10px; }
    .t13-name { font-size: 28px; font-weight: 700; color: ${BLACK}; margin: 0; }
    .t13-title { font-size: 14px; color: ${MID}; margin: 0 0 10px; }
    .t13-contact { font-size: 12px; color: #555; line-height: 1.6; }
    .t13-extra { margin-top: 4px; }
    .t13-sec-wrap { margin-top: 18px; margin-bottom: 10px; }
    .t13-sec-title {
      font-size: 12px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: ${BLACK};
      padding-bottom: 6px; border-bottom: 1px solid ${BLACK};
    }
    .t13-sum { font-size: 13px; line-height: 1.5; color: ${BLACK}; margin: 0; }
    .t13-body { font-size: 13px; color: ${BLACK}; margin: 0; line-height: 1.45; }
    .t13-exp { margin-bottom: 14px; }
    .t13-exp-top { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
    .t13-co { font-size: 13px; font-weight: 700; color: ${BLACK}; }
    .t13-period { font-size: 12px; color: ${BLACK}; flex-shrink: 0; }
    .t13-role { font-size: 13px; font-style: italic; color: ${BLACK}; margin-bottom: 6px; }
    .t13-bull { font-size: 13px; color: ${BLACK}; margin-left: 12px; text-indent: -12px; line-height: 1.45; margin-bottom: 4px; }
    .t13-bull-dot { margin-right: 6px; }
    .t13-edu { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; margin-bottom: 10px; }
    .t13-school { font-size: 13px; font-weight: 700; color: ${BLACK}; }
    .t13-degree { font-size: 13px; color: ${BLACK}; }
    .t13-year { font-size: 12px; color: ${BLACK}; flex-shrink: 0; }
    .t13-skill-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px 16px; font-size: 13px; line-height: 1.45; }
    .t13-skill-cell { color: ${BLACK}; }
    .t13-refs { font-size: 12px; color: ${BLACK}; font-style: italic; margin: 0; }
  </style>
</head>
<body>
${inner}
</body>
</html>`;
}

module.exports = { buildFinanceTemplate13Html };
