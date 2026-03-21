/**
 * Template 9 — Hospitality & Service. Mirrors PreviewHospitality in src/Template9Hospitality.js
 * Pattern aligned with api/lib/bankingTemplate6Html.js (header + body, sections).
 */

const {
  escapeHtml,
  stripEmojiPictographs,
  splitExperiencePointsForPreview,
  cvWithTemplateCertifications,
} = require("./pdfCommon");

const BROWN = "#6B4C3B";
const WARM = "#C4956A";
const DARK = "#2C1810";
const MID = "#4A3728";
const SUBTLE = "#9E8070";
const CREAM = "#FDF8F3";
const BEIGE = "#F5EDE0";
const WHITE = "#FFFFFF";

function sectionTitle(label) {
  return `<div class="t9-st-wrap">
    <div class="t9-st-line"></div>
    <span class="t9-st-text">${escapeHtml(label)}</span>
    <div class="t9-st-line"></div>
  </div>`;
}

function buildHospitalityTemplate9Html(rawCv) {
  const cv = cvWithTemplateCertifications(rawCv || {});
  const skillList = cv.skills ? cv.skills.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const techList = cv.technicalSkills ? cv.technicalSkills.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const certList = cv.certifications ? cv.certifications.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const experience = Array.isArray(cv.experience) ? cv.experience : [];
  const education = Array.isArray(cv.education) ? cv.education : [];

  const contactBits = [];
  if (cv.email) contactBits.push(escapeHtml(stripEmojiPictographs(cv.email)));
  if (cv.phone) contactBits.push(escapeHtml(stripEmojiPictographs(cv.phone)));
  if (cv.location) contactBits.push(escapeHtml(stripEmojiPictographs(cv.location)));
  const contactRow = contactBits.length
    ? `<div class="t9-contact">${contactBits.map((s) => `<span>${s}</span>`).join(" ")}</div>`
    : "";

  const gulfBits = [];
  if (cv.nationality) gulfBits.push(escapeHtml(stripEmojiPictographs(cv.nationality)));
  if (cv.visaStatus) gulfBits.push(escapeHtml(stripEmojiPictographs(cv.visaStatus)));
  if (cv.dob) {
    const d = stripEmojiPictographs(cv.dob);
    if (d) gulfBits.push(`DOB: ${escapeHtml(d)}`);
  }
  if (cv.gender) gulfBits.push(escapeHtml(stripEmojiPictographs(cv.gender)));
  if (cv.maritalStatus) gulfBits.push(escapeHtml(stripEmojiPictographs(cv.maritalStatus)));
  const gulfRow = gulfBits.length
    ? `<div class="t9-gulf">${gulfBits.map((s) => `<span>${s}</span>`).join(" ")}</div>`
    : "";

  const header = `<header class="t9-header">
    <div class="t9-hr-top"></div>
    <h1 class="t9-name">${escapeHtml(cv.name || "Your Name")}</h1>
    <p class="t9-title">${escapeHtml(cv.title || "Hospitality Professional")}</p>
    ${contactRow}
    ${gulfRow}
    <div class="t9-hr-bot"></div>
  </header>`;

  let body = `<div class="t9-body">`;

  if (cv.summary) {
    body += `${sectionTitle("Professional Profile")}
      <p class="t9-sum">${escapeHtml(cv.summary)}</p>`;
  }

  if (skillList.length > 0) {
    const chips = skillList
      .map((s) => `<span class="t9-chip-skill">${escapeHtml(s)}</span>`)
      .join("");
    body += `${sectionTitle("Core Skills")}<div class="t9-chips">${chips}</div>`;
  }

  const expFiltered = experience.filter((e) => e && e.company);
  if (expFiltered.length > 0) {
    let exp = "";
    expFiltered.forEach((e) => {
      const lines = e.points ? splitExperiencePointsForPreview(e.points) : [];
      let pts = "";
      lines.forEach((line, j) => {
        const text = j === 0 ? escapeHtml(line) : `• ${escapeHtml(line)}`;
        pts += `<p class="t9-exp-line">${text}</p>`;
      });
      exp += `<div class="t9-exp-block">
        <div class="t9-exp-top">
          <div>
            <div class="t9-exp-role">${escapeHtml(e.role || "")}</div>
            <div class="t9-exp-co">${escapeHtml(e.company || "")}${e.location ? ` · ${escapeHtml(e.location)}` : ""}</div>
          </div>
          <span class="t9-exp-badge">${escapeHtml(e.period || "")}</span>
        </div>
        ${pts ? `<div class="t9-exp-points">${pts}</div>` : ""}
      </div>`;
    });
    body += `${sectionTitle("Work Experience")}${exp}`;
  }

  if (education.some((e) => e && e.school)) {
    let edu = "";
    education
      .filter((e) => e && e.school)
      .forEach((e) => {
        edu += `<div class="t9-edu-row">
          <div>
            <div class="t9-edu-deg">${escapeHtml(e.degree || "")}</div>
            <div class="t9-edu-school">${escapeHtml(e.school || "")}</div>
          </div>
          <span class="t9-edu-year">${escapeHtml(e.year || "")}</span>
        </div>`;
      });
    body += `${sectionTitle("Education")}${edu}`;
  }

  if (certList.length > 0) {
    const chips = certList
      .map((c) => `<span class="t9-chip-cert">${escapeHtml(stripEmojiPictographs(c))}</span>`)
      .join("");
    body += `${sectionTitle("Certifications")}<div class="t9-chips">${chips}</div>`;
  }

  if (techList.length > 0) {
    const chips = techList.map((s) => `<span class="t9-chip-tech">${escapeHtml(s)}</span>`).join("");
    body += `${sectionTitle("Technical Skills")}<div class="t9-chips-tech">${chips}</div>`;
  }

  if (cv.languages) {
    body += `${sectionTitle("Languages")}<p class="t9-lang">${escapeHtml(cv.languages)}</p>`;
  }

  if (cv.availability || cv.drivingLicense || cv.willingToRelocate) {
    const bits = [];
    if (cv.availability) {
      const tx = escapeHtml(stripEmojiPictographs(cv.availability));
      if (tx) bits.push(`<span>${tx}</span>`);
    }
    if (cv.drivingLicense) {
      const tx = escapeHtml(stripEmojiPictographs(cv.drivingLicense));
      if (tx) bits.push(`<span>${tx}</span>`);
    }
    if (cv.willingToRelocate) {
      const tx = escapeHtml(stripEmojiPictographs(cv.willingToRelocate));
      if (tx) bits.push(`<span>Relocate: ${tx}</span>`);
    }
    if (bits.length > 0) {
      body += `${sectionTitle("Additional Information")}<div class="t9-add">${bits.join("")}</div>`;
    }
  }

  if (cv.references) {
    body += `${sectionTitle("References")}<p class="t9-refs">${escapeHtml(cv.references)}</p>`;
  }

  body += `</div>`;

  const inner = `<div class="t9-root">${header}${body}</div>`;

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
      font-size: 11px;
      color: ${MID};
      background: ${CREAM};
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .t9-root {
      width: 794px;
      max-width: 100%;
      margin: 0 auto;
      background: ${CREAM};
      border-radius: 10px;
      overflow: hidden;
    }
    .t9-header {
      background: linear-gradient(135deg, ${BROWN}, ${DARK});
      padding: 26px 32px 20px;
      text-align: center;
    }
    .t9-hr-top { height: 1px; background: ${WARM}66; margin-bottom: 16px; }
    .t9-hr-bot { height: 1px; background: ${WARM}66; margin-top: 16px; }
    .t9-name {
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 24px;
      font-weight: 900;
      color: ${WHITE};
      margin: 0 0 4px;
      letter-spacing: 2px;
    }
    .t9-title {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      font-weight: 600;
      color: ${WARM};
      margin: 0 0 12px;
      letter-spacing: 1px;
    }
    .t9-contact {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 16px;
      font-size: 9px;
      color: #dddddd;
      font-family: Arial, Helvetica, sans-serif;
    }
    .t9-gulf {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 12px;
      font-size: 8.5px;
      color: ${WARM}cc;
      font-family: Arial, Helvetica, sans-serif;
      margin-top: 6px;
    }
    .t9-body {
      padding: 16px 28px 24px;
      font-family: Arial, Helvetica, sans-serif;
    }
    .t9-st-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 14px 0 8px;
      text-align: center;
    }
    .t9-st-line { flex: 1; height: 1px; background: ${WARM}55; }
    .t9-st-text {
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 2.5px;
      color: ${BROWN};
      text-transform: uppercase;
      padding: 0 4px;
      white-space: nowrap;
    }
    .t9-sum {
      font-size: 10.5px;
      line-height: 1.8;
      color: ${MID};
      margin: 0;
      text-align: center;
      font-style: italic;
      padding: 0 16px;
    }
    .t9-chips, .t9-chips-tech {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      justify-content: center;
    }
    .t9-chips-tech { gap: 5px; }
    .t9-chip-skill {
      padding: 3px 12px;
      background: ${BEIGE};
      border: 1px solid ${WARM}55;
      border-radius: 20px;
      font-size: 9.5px;
      color: ${BROWN};
      font-family: Arial, Helvetica, sans-serif;
    }
    .t9-chip-cert {
      padding: 3px 10px;
      background: ${WHITE};
      border: 1px solid ${WARM}55;
      border-radius: 4px;
      font-size: 9.5px;
      color: ${MID};
      font-family: Arial, Helvetica, sans-serif;
    }
    .t9-chip-tech {
      padding: 2px 9px;
      background: ${BEIGE};
      border-radius: 4px;
      font-size: 9.5px;
      color: ${MID};
      font-family: Arial, Helvetica, sans-serif;
    }
    .t9-exp-block {
      margin-bottom: 14px;
      padding: 12px 14px;
      background: ${WHITE};
      border: 1px solid ${WARM}33;
      border-left: 3px solid ${WARM};
      border-radius: 8px;
    }
    .t9-exp-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 8px;
    }
    .t9-exp-role {
      font-size: 11px;
      font-weight: 700;
      color: ${DARK};
      font-family: Arial, Helvetica, sans-serif;
    }
    .t9-exp-co {
      font-size: 10px;
      font-weight: 600;
      color: ${WARM};
      margin-top: 1px;
      font-family: Arial, Helvetica, sans-serif;
    }
    .t9-exp-badge {
      font-size: 9px;
      color: ${WHITE};
      background: ${BROWN};
      padding: 2px 8px;
      border-radius: 10px;
      flex-shrink: 0;
      font-family: Arial, Helvetica, sans-serif;
      font-weight: 600;
    }
    .t9-exp-line {
      font-size: 10px;
      color: ${MID};
      margin: 4px 0 0;
      line-height: 1.6;
    }
    .t9-edu-row {
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      background: ${BEIGE};
      border-radius: 6px;
    }
    .t9-edu-deg {
      font-size: 10.5px;
      font-weight: 700;
      color: ${DARK};
      font-family: Arial, Helvetica, sans-serif;
    }
    .t9-edu-school {
      font-size: 9.5px;
      color: ${SUBTLE};
      margin-top: 2px;
    }
    .t9-edu-year {
      font-size: 9px;
      font-weight: 700;
      color: ${WARM};
      flex-shrink: 0;
      font-family: Arial, Helvetica, sans-serif;
    }
    .t9-lang {
      font-size: 10.5px;
      margin: 0;
      color: ${MID};
      text-align: center;
    }
    .t9-add {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 20px;
      font-size: 10px;
      color: ${MID};
      text-align: center;
    }
    .t9-refs {
      font-size: 9.5px;
      color: ${SUBTLE};
      font-style: italic;
      margin: 0;
      text-align: center;
    }
  </style>
</head>
<body>
${inner}
</body>
</html>`;
}

module.exports = { buildHospitalityTemplate9Html };
