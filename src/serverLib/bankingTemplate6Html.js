/**
 * Template 6 — Banking & Finance. Mirrors PreviewBankingFinance in src/Template6BankingFinance.js
 */

const {
  escapeHtml,
  stripEmojiPictographs,
  splitExperiencePointsForPreview,
  cvWithTemplateCertifications,
} = require("./pdfCommon");

const BLACK = "#0A0A0A";
const DARK = "#1A1A1A";
const MID = "#444444";
const SUBTLE = "#777777";
const RULE = "#CCCCCC";

function sectionTitle(text) {
  return `<div class="t6-sect">
    <div class="t6-sect-label">${escapeHtml(text)}</div>
    <div class="t6-sect-hr" style="background:${BLACK}"></div>
  </div>`;
}

function buildBankingTemplate6Html(rawCv) {
  const cv = cvWithTemplateCertifications(rawCv || {});

  const skillList = cv.skills ? cv.skills.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const techList = cv.technicalSkills ? cv.technicalSkills.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const certList = cv.certifications ? cv.certifications.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const experience = Array.isArray(cv.experience) ? cv.experience : [];
  const education = Array.isArray(cv.education) ? cv.education : [];
  const expFiltered = experience.filter((e) => e && e.company);

  let contact = [];
  if (cv.email) contact.push(`<span>${escapeHtml(stripEmojiPictographs(cv.email))}</span>`);
  if (cv.phone) contact.push(`<span>${escapeHtml(stripEmojiPictographs(cv.phone))}</span>`);
  if (cv.location) contact.push(`<span>${escapeHtml(stripEmojiPictographs(cv.location))}</span>`);
  const contactLine = contact.length
    ? `<div class="t6-contact">${contact.map((s, i) => (i > 0 ? `<span class="t6-pipe">|</span>${s}` : s)).join("")}</div>`
    : "";

  let gulf = [];
  if (cv.nationality) gulf.push(`<span>Nationality: ${escapeHtml(stripEmojiPictographs(cv.nationality))}</span>`);
  if (cv.visaStatus) gulf.push(`<span>Visa: ${escapeHtml(stripEmojiPictographs(cv.visaStatus))}</span>`);
  if (cv.dob) {
    const d = stripEmojiPictographs(cv.dob);
    if (d) gulf.push(`<span>DOB: ${escapeHtml(d)}</span>`);
  }
  if (cv.gender) gulf.push(`<span>${escapeHtml(stripEmojiPictographs(cv.gender))}</span>`);
  if (cv.maritalStatus) gulf.push(`<span>${escapeHtml(stripEmojiPictographs(cv.maritalStatus))}</span>`);
  const gulfLine = gulf.length
    ? `<div class="t6-gulf">${gulf.map((s, i) => (i > 0 ? `<span class="t6-pipe">|</span>${s}` : s)).join("")}</div>`
    : "";

  const header = `<header class="t6-header" style="border-bottom:3px double ${BLACK}">
    <h1 class="t6-h1" style="color:${BLACK}">${escapeHtml(cv.name || "YOUR NAME")}</h1>
    <p class="t6-title" style="color:${MID}">${escapeHtml(cv.title || "Banking Professional")}</p>
    ${contactLine}
    ${gulfLine}
  </header>`;

  let body = `<div class="t6-body" style="color:${DARK}">`;

  if (cv.summary) {
    body += `${sectionTitle("Professional Summary")}
      <p class="t6-sum">${escapeHtml(cv.summary)}</p>`;
  }

  if (skillList.length > 0) {
    const line = skillList.map((s) => escapeHtml(s)).join("   ·   ");
    body += `${sectionTitle("Core Skills")}<p class="t6-inline t6-sans">${line}</p>`;
  }

  if (expFiltered.length > 0) {
    let exp = "";
    expFiltered.forEach((e, i) => {
      const lines = e.points ? splitExperiencePointsForPreview(e.points) : [];
      let pts = "";
      lines.forEach((line, j) => {
        const text = j === 0 ? escapeHtml(line) : `• ${escapeHtml(line)}`;
        pts += `<p class="t6-exp-line">${text}</p>`;
      });
      exp += `<div class="t6-exp-block">
        <div class="t6-exp-head">
          <span class="t6-exp-role" style="color:${BLACK}">${escapeHtml(e.role || "")}</span>
          <span class="t6-exp-period">${escapeHtml(e.period || "")}</span>
        </div>
        <div class="t6-exp-co">${escapeHtml(e.company || "")}${e.location ? ` — ${escapeHtml(e.location)}` : ""}</div>
        ${pts ? `<div class="t6-exp-points">${pts}</div>` : ""}
      </div>`;
      if (i < expFiltered.length - 1) {
        exp += `<div class="t6-exp-sep" style="background:${RULE}"></div>`;
      }
    });
    body += `${sectionTitle("Professional Experience")}${exp}`;
  }

  if (education.some((e) => e && e.school)) {
    let edu = "";
    education
      .filter((e) => e && e.school)
      .forEach((e) => {
        edu += `<div class="t6-edu-row">
          <div>
            <span class="t6-edu-deg" style="color:${BLACK}">${escapeHtml(e.degree || "")}</span>
            <span class="t6-edu-sch" style="color:${MID}"> — ${escapeHtml(e.school || "")}</span>
          </div>
          <span class="t6-edu-yr">${escapeHtml(e.year || "")}</span>
        </div>`;
      });
    body += `${sectionTitle("Education")}${edu}`;
  }

  if (certList.length > 0) {
    const line = certList.map((c) => escapeHtml(stripEmojiPictographs(c))).join("   ·   ");
    body += `${sectionTitle("Certifications")}<p class="t6-inline t6-sans">${line}</p>`;
  }

  if (techList.length > 0) {
    const line = techList.map((s) => escapeHtml(s)).join("   ·   ");
    body += `${sectionTitle("Technical Skills")}<p class="t6-inline t6-sans">${line}</p>`;
  }

  if (cv.languages) {
    body += `${sectionTitle("Languages")}<p class="t6-lang">${escapeHtml(cv.languages)}</p>`;
  }

  if (cv.availability || cv.drivingLicense || cv.willingToRelocate) {
    const add = [];
    if (cv.availability) {
      const tx = stripEmojiPictographs(cv.availability);
      if (tx) add.push(`<span>Availability: ${escapeHtml(tx)}</span>`);
    }
    if (cv.drivingLicense) {
      const tx = stripEmojiPictographs(cv.drivingLicense);
      if (tx) add.push(`<span>Driving License: ${escapeHtml(tx)}</span>`);
    }
    if (cv.willingToRelocate) {
      const tx = stripEmojiPictographs(cv.willingToRelocate);
      if (tx) add.push(`<span>Willing to Relocate: ${escapeHtml(tx)}</span>`);
    }
    if (add.length > 0) {
      body += `${sectionTitle("Additional Information")}<div class="t6-add">${add.join("")}</div>`;
    }
  }

  if (cv.references) {
    body += `${sectionTitle("References")}<p class="t6-refs">${escapeHtml(cv.references)}</p>`;
  }

  body += `</div>`;

  const inner = `<div class="t6-root">${header}${body}</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 11px;
      color: ${DARK};
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .t6-root {
      width: 794px;
      max-width: 100%;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 10px;
      overflow: hidden;
    }
    .t6-header {
      padding: 28px 32px 16px;
      text-align: center;
    }
    .t6-h1 {
      font-size: 24px;
      font-weight: 900;
      margin: 0 0 4px;
      letter-spacing: 3px;
      text-transform: uppercase;
      font-family: Arial, Helvetica, sans-serif;
    }
    .t6-title {
      font-size: 11px;
      margin: 0 0 10px;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      font-family: Arial, Helvetica, sans-serif;
      font-weight: 600;
    }
    .t6-contact, .t6-gulf {
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 0 16px;
      font-size: 9.5px;
      color: ${MID};
      font-family: Arial, Helvetica, sans-serif;
    }
    .t6-gulf {
      font-size: 9px;
      color: ${SUBTLE};
      margin-top: 5px;
      gap: 0 12px;
    }
    .t6-pipe { margin: 0 4px; color: ${MID}; }
    .t6-body { padding: 14px 32px 24px; line-height: 1.5; }
    .t6-sect { margin-bottom: 10px; margin-top: 14px; }
    .t6-sect:first-child { margin-top: 0; }
    .t6-sect-label {
      font-size: 9.5px;
      font-weight: 900;
      letter-spacing: 1.5px;
      color: ${BLACK};
      text-transform: uppercase;
      font-family: Arial, Helvetica, sans-serif;
      margin-bottom: 4px;
    }
    .t6-sect-hr { height: 1px; margin: 0 0 8px; }
    .t6-sum {
      font-size: 10.5px;
      line-height: 1.5;
      color: ${DARK};
      margin: 0 0 10px;
      text-align: justify;
    }
    .t6-inline {
      font-size: 10px;
      color: ${DARK};
      margin: 0 0 10px;
      line-height: 1.5;
    }
    .t6-sans { font-family: Arial, Helvetica, sans-serif; }
    .t6-exp-block { margin-bottom: 6px; }
    .t6-exp-head {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 12px;
    }
    .t6-exp-role {
      font-size: 11px;
      font-weight: 700;
      font-family: Arial, Helvetica, sans-serif;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .t6-exp-period {
      font-size: 9.5px;
      color: #666666;
      font-family: Arial, Helvetica, sans-serif;
      text-align: right;
      flex-shrink: 0;
    }
    .t6-exp-co {
      font-size: 10.5px;
      color: ${MID};
      font-style: italic;
      margin-bottom: 4px;
    }
    .t6-exp-line {
      font-size: 10px;
      color: #1a1a1a;
      margin: 0;
      line-height: 1.5;
      word-break: normal;
      overflow-wrap: break-word;
    }
    .t6-exp-sep { height: 1px; margin-top: 6px; }
    .t6-edu-row {
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
    .t6-edu-deg { font-size: 11px; font-weight: 700; font-family: Arial, Helvetica, sans-serif; }
    .t6-edu-sch { font-size: 10px; font-style: italic; }
    .t6-edu-yr {
      font-size: 9.5px;
      color: #666666;
      font-family: Arial, Helvetica, sans-serif;
    }
    .t6-lang { font-size: 10.5px; margin: 0 0 10px; color: ${DARK}; line-height: 1.5; }
    .t6-add {
      display: flex;
      gap: 20px;
      flex-wrap: wrap;
      font-size: 10px;
      color: ${DARK};
      font-family: Arial, Helvetica, sans-serif;
    }
    .t6-refs { font-size: 9.5px; color: ${SUBTLE}; font-style: italic; margin: 0; }
  </style>
</head>
<body>
${inner}
</body>
</html>`;
}

module.exports = { buildBankingTemplate6Html };
