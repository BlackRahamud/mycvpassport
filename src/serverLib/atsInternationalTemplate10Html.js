/**
 * Template 10 — ATS International. Single column, Arial, black/white. Mirrors PreviewATSInternational.
 */

const {
  escapeHtml,
  stripEmojiPictographs,
  splitExperiencePointsForPreview,
  cvWithTemplateCertifications,
} = require("./pdfCommon");

const BLACK = "#000000";
const MID = "#333333";
const SUBTLE = "#666666";

function sectionTitleT10(label) {
  return `<div class="t10-sec-wrap">
    <div class="t10-sec-title">${escapeHtml(label)}</div>
    <div class="t10-sec-rule"></div>
  </div>`;
}

function buildATSInternationalTemplate10Html(rawCv) {
  const cv = cvWithTemplateCertifications(rawCv || {});
  const skillList = cv.skills ? cv.skills.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const techList = cv.technicalSkills ? cv.technicalSkills.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const certList = cv.certifications ? cv.certifications.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const experience = Array.isArray(cv.experience) ? cv.experience : [];
  const education = Array.isArray(cv.education) ? cv.education : [];

  const contactLine = [cv.email, cv.phone, cv.location].filter(Boolean).map((x) => escapeHtml(stripEmojiPictographs(x))).join("   |   ");

  const gulfBits = [];
  if (cv.nationality) gulfBits.push(`Nationality: ${escapeHtml(stripEmojiPictographs(cv.nationality))}`);
  if (cv.visaStatus) gulfBits.push(`Visa Status: ${escapeHtml(stripEmojiPictographs(cv.visaStatus))}`);
  if (cv.dob) gulfBits.push(`Date of Birth: ${escapeHtml(stripEmojiPictographs(cv.dob))}`);
  if (cv.gender) gulfBits.push(`Gender: ${escapeHtml(stripEmojiPictographs(cv.gender))}`);
  if (cv.maritalStatus) gulfBits.push(`Marital Status: ${escapeHtml(stripEmojiPictographs(cv.maritalStatus))}`);
  const gulfLine = gulfBits.join("   |   ");

  let inner = `<div class="t10-root">
    <div class="t10-header">
      <h1 class="t10-name">${escapeHtml(cv.name || "Your Name")}</h1>
      <p class="t10-title">${escapeHtml(cv.title || "Professional Title")}</p>
      ${contactLine ? `<div class="t10-contact">${contactLine}</div>` : ""}
      ${gulfLine ? `<div class="t10-gulf">${gulfLine}</div>` : ""}
    </div>
    <div class="t10-hr-thick"></div>`;

  if (cv.summary) {
    inner += `${sectionTitleT10("Professional Summary")}<p class="t10-body">${escapeHtml(cv.summary)}</p>`;
  }

  if (skillList.length > 0) {
    inner += `${sectionTitleT10("Core Skills")}<p class="t10-body">${skillList.map((s) => escapeHtml(s)).join(" | ")}</p>`;
  }

  if (experience.some((e) => e && e.company)) {
    let exp = "";
    experience
      .filter((e) => e && e.company)
      .forEach((e) => {
        const lines = e.points ? splitExperiencePointsForPreview(e.points) : [];
        let bullets = "";
        lines.forEach((line) => {
          bullets += `<p class="t10-bullet">• ${escapeHtml(line)}</p>`;
        });
        exp += `<div class="t10-exp">
          <div class="t10-exp-row">
            <span class="t10-exp-role">${escapeHtml(e.role || "")}</span>
            <span class="t10-exp-period">${escapeHtml(e.period || "")}</span>
          </div>
          <div class="t10-exp-co">${escapeHtml(e.company || "")}${e.location ? ` | ${escapeHtml(e.location)}` : ""}</div>
          ${bullets}
        </div>`;
      });
    inner += `${sectionTitleT10("Professional Experience")}${exp}`;
  }

  if (education.some((e) => e && e.school)) {
    let edu = "";
    education
      .filter((e) => e && e.school)
      .forEach((e) => {
        edu += `<div class="t10-edu-row">
          <div><span class="t10-edu-deg">${escapeHtml(e.degree || "")}</span><span class="t10-edu-school"> | ${escapeHtml(e.school || "")}</span></div>
          <span class="t10-edu-year">${escapeHtml(e.year || "")}</span>
        </div>`;
      });
    inner += `${sectionTitleT10("Education")}${edu}`;
  }

  if (certList.length > 0) {
    inner += `${sectionTitleT10("Certifications")}<p class="t10-body">${certList.map((c) => escapeHtml(c)).join(" | ")}</p>`;
  }

  if (techList.length > 0) {
    inner += `${sectionTitleT10("Technical Skills")}<p class="t10-body">${techList.map((s) => escapeHtml(s)).join(" | ")}</p>`;
  }

  if (cv.languages) {
    inner += `${sectionTitleT10("Languages")}<p class="t10-body">${escapeHtml(cv.languages)}</p>`;
  }

  if (cv.availability || cv.drivingLicense || cv.willingToRelocate) {
    let add = "";
    if (cv.availability) add += `<div>Availability: ${escapeHtml(stripEmojiPictographs(cv.availability))}</div>`;
    if (cv.drivingLicense) add += `<div>Driving License: ${escapeHtml(stripEmojiPictographs(cv.drivingLicense))}</div>`;
    if (cv.willingToRelocate) add += `<div>Willing to Relocate: ${escapeHtml(stripEmojiPictographs(cv.willingToRelocate))}</div>`;
    if (add) inner += `${sectionTitleT10("Additional Information")}<div class="t10-body">${add}</div>`;
  }

  if (cv.references) {
    inner += `${sectionTitleT10("References")}<p class="t10-refs">${escapeHtml(cv.references)}</p>`;
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
      font-size: 10.5px;
      color: ${MID};
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .t10-root {
      width: 794px;
      max-width: 100%;
      margin: 0 auto;
      padding: 28px 32px;
      background: #fff;
    }
    .t10-header { margin-bottom: 14px; }
    .t10-name { font-size: 22px; font-weight: 900; color: ${BLACK}; margin: 0 0 3px; letter-spacing: 0.5px; }
    .t10-title { font-size: 11px; font-weight: 700; color: ${MID}; margin: 0 0 8px; }
    .t10-contact { font-size: 9.5px; color: ${MID}; line-height: 1.8; }
    .t10-gulf { font-size: 9px; color: ${SUBTLE}; line-height: 1.8; margin-top: 2px; }
    .t10-hr-thick { height: 2px; background: ${BLACK}; margin: 6px 0 8px; }
    .t10-sec-wrap { margin: 14px 0 6px; }
    .t10-sec-title {
      font-size: 10px; font-weight: 900; color: ${BLACK}; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 3px;
    }
    .t10-sec-rule { height: 2px; background: ${BLACK}; }
    .t10-body { font-size: 10px; line-height: 1.75; color: ${MID}; margin: 0 0 4px; }
    .t10-bullet { font-size: 10px; line-height: 1.7; color: ${MID}; margin: 0 0 4px; }
    .t10-exp { margin-bottom: 13px; }
    .t10-exp-row { display: flex; justify-content: space-between; align-items: baseline; }
    .t10-exp-role { font-size: 11px; font-weight: 700; color: ${BLACK}; }
    .t10-exp-period { font-size: 9.5px; color: ${SUBTLE}; }
    .t10-exp-co { font-size: 10px; font-weight: 600; color: ${MID}; margin-bottom: 4px; }
    .t10-edu-row { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 8px; }
    .t10-edu-deg { font-size: 10.5px; font-weight: 700; color: ${BLACK}; }
    .t10-edu-school { font-size: 10px; color: ${MID}; }
    .t10-edu-year { font-size: 9.5px; color: ${SUBTLE}; }
    .t10-refs { font-size: 9.5px; color: ${SUBTLE}; margin: 0; }
    @media print {
      html, body { margin: 0; padding: 0; }

      .t10-exp,
      .t10-edu-row {
        break-inside: avoid;
        page-break-inside: avoid;
        margin-bottom: 14px;
      }

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

module.exports = { buildATSInternationalTemplate10Html };
