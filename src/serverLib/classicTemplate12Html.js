/**
 * Template 12 — Classic. Single column, Arial, black/white. Mirrors PreviewClassic.
 */

const {
  escapeHtml,
  stripEmojiPictographs,
  splitExperiencePointsForPreview,
  cvWithTemplateCertifications,
} = require("./pdfCommon");

const BLACK = "#000000";
const MID = "#333333";
const MUTED = "#444444";
const SUBTLE = "#666666";

function sectionTitleT12(label) {
  return `<div class="t12-sec-wrap">
    <div class="t12-sec-title">${escapeHtml(label)}</div>
    <div class="t12-sec-rule"></div>
  </div>`;
}

function buildClassicTemplate12Html(rawCv) {
  const cv = cvWithTemplateCertifications(rawCv || {});
  const skills = cv.skills ? cv.skills.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const certs = cv.certifications ? cv.certifications.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const techList = cv.technicalSkills ? cv.technicalSkills.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const experience = Array.isArray(cv.experience) ? cv.experience : [];
  const education = Array.isArray(cv.education) ? cv.education : [];

  const contactParts = [cv.email, cv.phone, cv.linkedin, cv.location, cv.nationality].filter(Boolean).map((x) => escapeHtml(stripEmojiPictographs(x)));
  const row2 = [];
  if (cv.visaStatus) row2.push(escapeHtml(stripEmojiPictographs(cv.visaStatus)));
  if (cv.dob) row2.push(`DOB: ${escapeHtml(stripEmojiPictographs(cv.dob))}`);
  if (cv.maritalStatus) row2.push(`Marital Status: ${escapeHtml(stripEmojiPictographs(cv.maritalStatus))}`);
  if (cv.drivingLicense) row2.push(`Driving License: ${escapeHtml(stripEmojiPictographs(cv.drivingLicense))}`);
  if (cv.gender) row2.push(`Gender: ${escapeHtml(stripEmojiPictographs(cv.gender))}`);

  let inner = `<div class="t12-root">
    <div class="t12-header">
      <h1 class="t12-name">${escapeHtml(cv.name || "Your Name")}</h1>
      <p class="t12-title">${escapeHtml(cv.title || "Professional Title")}</p>
      ${contactParts.length ? `<div class="t12-contact">${contactParts.join(" | ")}</div>` : ""}
      ${row2.length ? `<div class="t12-contact t12-contact2">${row2.join(" | ")}</div>` : ""}
    </div>
    <div class="t12-hr"></div>`;

  if (cv.summary) {
    inner += `${sectionTitleT12("Professional Summary")}<p class="t12-sum">${escapeHtml(cv.summary)}</p>`;
  }

  if (experience.some((e) => e && e.company)) {
    let exp = "";
    experience
      .filter((e) => e && e.company)
      .forEach((e) => {
        const lines = e.points ? splitExperiencePointsForPreview(e.points) : [];
        let bullets = "";
        lines.forEach((line) => {
          bullets += `<div class="t12-bull"><span class="t12-bull-dot">•</span> ${escapeHtml(line)}</div>`;
        });
        exp += `<div class="t12-exp">
          <div class="t12-exp-top">
            <span class="t12-co">${escapeHtml(e.company || "")}${e.location ? ` — ${escapeHtml(e.location)}` : ""}</span>
            <span class="t12-period">${escapeHtml(e.period || "")}</span>
          </div>
          <div class="t12-role">${escapeHtml(e.role || "")}</div>
          ${bullets}
        </div>`;
      });
    inner += `${sectionTitleT12("Professional Experience")}${exp}`;
  }

  if (education.some((e) => e && e.school)) {
    let edu = "";
    education
      .filter((e) => e && e.school)
      .forEach((e) => {
        edu += `<div class="t12-edu">
          <div>
            <div class="t12-school">${escapeHtml(e.school || "")}</div>
            <div class="t12-degree">${escapeHtml(e.degree || "")}</div>
          </div>
          <span class="t12-year">${escapeHtml(e.year || "")}</span>
        </div>`;
      });
    inner += `${sectionTitleT12("Education")}${edu}`;
  }

  if (skills.length > 0) {
    inner += `${sectionTitleT12("Skills")}<p class="t12-body">${skills.map((s) => escapeHtml(s)).join(", ")}</p>`;
  }

  if (techList.length > 0) {
    inner += `${sectionTitleT12("Technical Skills")}<p class="t12-body">${techList.map((s) => escapeHtml(s)).join(", ")}</p>`;
  }

  if (cv.languages) {
    inner += `${sectionTitleT12("Languages")}<p class="t12-body">${escapeHtml(cv.languages)}</p>`;
  }

  if (certs.length > 0) {
    let certHtml = "";
    certs.forEach((c) => {
      certHtml += `<div class="t12-bull"><span class="t12-bull-dot">•</span> ${escapeHtml(c)}</div>`;
    });
    inner += `${sectionTitleT12("Certifications")}${certHtml}`;
  }

  if (cv.availability || cv.willingToRelocate) {
    let add = "";
    if (cv.availability) add += `<div>${escapeHtml(stripEmojiPictographs(cv.availability))}</div>`;
    if (cv.willingToRelocate) add += `<div>Willing to relocate: ${escapeHtml(stripEmojiPictographs(cv.willingToRelocate))}</div>`;
    if (add) inner += `${sectionTitleT12("Additional Information")}<div class="t12-body">${add}</div>`;
  }

  if (cv.references) {
    inner += `${sectionTitleT12("References")}<p class="t12-refs">${escapeHtml(cv.references)}</p>`;
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
    .t12-root {
      width: 794px;
      max-width: 100%;
      margin: 0 auto;
      padding: 40px 48px;
      background: #fff;
    }
    .t12-header { margin-bottom: 12px; }
    .t12-name { font-size: 26px; font-weight: 700; color: ${BLACK}; margin: 0 0 6px; }
    .t12-title { font-size: 14px; color: ${MUTED}; margin: 0 0 10px; }
    .t12-contact { font-size: 12px; color: #555; line-height: 1.6; }
    .t12-contact2 { margin-top: 4px; }
    .t12-hr { height: 1px; background: ${BLACK}; margin-bottom: 4px; }
    .t12-sec-wrap { margin-top: 20px; margin-bottom: 10px; }
    .t12-sec-title {
      font-size: 11px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: ${BLACK}; margin-bottom: 6px;
    }
    .t12-sec-rule { height: 1px; background: #ccc; width: 100%; }
    .t12-sum { font-size: 13px; line-height: 1.55; color: ${MID}; margin: 0 0 4px; }
    .t12-body { font-size: 13px; color: ${MID}; margin: 0; line-height: 1.6; }
    .t12-exp { margin-bottom: 16px; }
    .t12-exp-top { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
    .t12-co { font-size: 13px; font-weight: 700; color: ${BLACK}; }
    .t12-period { font-size: 12px; color: ${SUBTLE}; flex-shrink: 0; }
    .t12-role { font-size: 13px; font-style: italic; color: ${MUTED}; margin-bottom: 6px; }
    .t12-bull { font-size: 13px; color: ${MID}; margin-left: 12px; text-indent: -12px; line-height: 1.5; margin-bottom: 4px; }
    .t12-bull-dot { margin-right: 6px; }
    .t12-edu { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 10px; }
    .t12-school { font-size: 13px; font-weight: 700; color: ${BLACK}; }
    .t12-degree { font-size: 13px; color: ${MID}; }
    .t12-year { font-size: 12px; color: ${SUBTLE}; flex-shrink: 0; }
    .t12-refs { font-size: 12px; color: ${SUBTLE}; font-style: italic; margin: 0; }
    @media print {
      html, body { margin: 0; padding: 0; }

      .t12-exp,
      .t12-edu {
        break-inside: avoid;
        page-break-inside: avoid;
        margin-bottom: 14px;
      }

      .t12-sec-title,
      h2, h3 {
        break-after: avoid;
        page-break-after: avoid;
      }

      p, li { orphans: 3; widows: 3; }
    }
  </style>
</head>
<body>
${inner}
</body>
</html>`;
}

module.exports = { buildClassicTemplate12Html };
