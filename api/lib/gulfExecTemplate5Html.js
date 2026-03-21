/**
 * Template 5 — Gulf Executive. Mirrors PreviewGulfExecutive in src/Template5GulfExecutive.js
 */

const {
  escapeHtml,
  stripEmojiPictographs,
  splitExperiencePointsForPreview,
  cvWithTemplateCertifications,
} = require("./pdfCommon");

const GOLD = "#C9A84C";
const NAVY = "#0D1B2A";
const SLATE = "#1C2E40";
const LIGHT = "#F5F0E8";
const BODY = "#2C2C2C";
const SUBTLE = "#666666";

function sectionTitle(gold, text) {
  return `<div class="t5-sectitle">
    <div class="t5-sectitle-dash" style="background:${gold}"></div>
    <span class="t5-sectitle-text" style="color:${gold}">${escapeHtml(text)}</span>
    <div class="t5-sectitle-line" style="background:${gold}33"></div>
  </div>`;
}

function buildGulfExecTemplate5Html(rawCv) {
  const cv = cvWithTemplateCertifications(rawCv || {});
  const g = GOLD;
  const n = NAVY;
  const sl = SLATE;

  const skillList = cv.skills ? cv.skills.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const techList = cv.technicalSkills ? cv.technicalSkills.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const certList = cv.certifications ? cv.certifications.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const experience = Array.isArray(cv.experience) ? cv.experience : [];
  const education = Array.isArray(cv.education) ? cv.education : [];

  const S = {
    mail: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#AABBCC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;display:inline-block" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="m22 6-10 7L2 6"/></svg>`,
    phone: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#AABBCC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;display:inline-block" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
    map: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#AABBCC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;display:inline-block" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
    globe: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;display:inline-block" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10"/></svg>`,
    id: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;display:inline-block" aria-hidden="true"><rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/></svg>`,
    cal: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#666666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;display:inline-block" aria-hidden="true"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`,
    car: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#666666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;display:inline-block" aria-hidden="true"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-.4-2.2-.6c-.3-.1-.7-.1-1.1-.1h-5.8c-.4 0-.8 0-1.1.1-.9.2-2.2.6-2.2.6s-2.7.6-3.5 1.5C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>`,
    plane: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#666666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;display:inline-block" aria-hidden="true"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>`,
  };

  let contact = "";
  if (cv.email) contact += `<span class="t5-contact-item">${S.mail}${escapeHtml(stripEmojiPictographs(cv.email))}</span>`;
  if (cv.phone) contact += `<span class="t5-contact-item">${S.phone}${escapeHtml(stripEmojiPictographs(cv.phone))}</span>`;
  if (cv.location) contact += `<span class="t5-contact-item">${S.map}${escapeHtml(stripEmojiPictographs(cv.location))}</span>`;

  let gulf = "";
  if (cv.nationality) gulf += `<span class="t5-gulf-item">${S.globe}${escapeHtml(stripEmojiPictographs(cv.nationality))}</span>`;
  if (cv.visaStatus) gulf += `<span class="t5-gulf-item">${S.id}${escapeHtml(stripEmojiPictographs(cv.visaStatus))}</span>`;
  if (cv.dob) {
    const d = stripEmojiPictographs(cv.dob);
    if (d) gulf += `<span class="t5-gulf-item">DOB: ${escapeHtml(d)}</span>`;
  }
  if (cv.gender) gulf += `<span class="t5-gulf-item">${escapeHtml(stripEmojiPictographs(cv.gender))}</span>`;
  if (cv.maritalStatus) gulf += `<span class="t5-gulf-item">${escapeHtml(stripEmojiPictographs(cv.maritalStatus))}</span>`;

  const header = `<header class="t5-header" style="background:${n}">
    <div class="t5-dec t5-dec-tr" style="border-color:${g}22"></div>
    <div class="t5-dec t5-dec-bl" style="border-color:${g}22"></div>
    <h1 class="t5-h1">${escapeHtml(cv.name || "Your Name")}</h1>
    <p class="t5-sub" style="color:${g}">${escapeHtml(cv.title || "Senior Executive")}</p>
    ${contact ? `<div class="t5-contact-row">${contact}</div>` : ""}
    ${gulf ? `<div class="t5-gulf-row" style="color:${g}bb">${gulf}</div>` : ""}
    <div class="t5-gold-rule" style="background:linear-gradient(90deg, ${g}, ${g}00)"></div>
  </header>`;

  let body = `<div class="t5-body" style="background:${LIGHT}">`;

  if (cv.summary) {
    body += `${sectionTitle(g, "Executive Summary")}
      <p class="t5-summary" style="color:${BODY};border-left:3px solid ${g}">${escapeHtml(cv.summary)}</p>`;
  }

  if (skillList.length > 0) {
    const chips = skillList
      .map(
        (s) =>
          `<span class="t5-skill-tag" style="background:${n};color:${g}">${escapeHtml(s)}</span>`,
      )
      .join("");
    body += `${sectionTitle(g, "Core Competencies")}<div class="t5-skill-wrap">${chips}</div>`;
  }

  if (experience.some((e) => e && e.company)) {
    let exp = "";
    experience
      .filter((e) => e && e.company)
      .forEach((e) => {
        const lines = e.points ? splitExperiencePointsForPreview(e.points) : [];
        let pts = "";
        lines.forEach((line, j) => {
          const text = j === 0 ? escapeHtml(line) : `• ${escapeHtml(line)}`;
          pts += `<p class="t5-exp-line">${text}</p>`;
        });
        exp += `<div class="t5-exp-entry" style="border-left:2px solid ${g}55">
          <div class="t5-exp-head">
            <div>
              <div class="t5-exp-role" style="color:${n}">${escapeHtml(e.role || "")}</div>
              <div class="t5-exp-co" style="color:${g}">${escapeHtml(e.company || "")}${e.location ? ` · ${escapeHtml(e.location)}` : ""}</div>
            </div>
            <span class="t5-exp-pill" style="background:${sl}">${escapeHtml(e.period || "")}</span>
          </div>
          ${pts ? `<div class="t5-exp-points">${pts}</div>` : ""}
        </div>`;
      });
    body += `${sectionTitle(g, "Professional Experience")}${exp}`;
  }

  if (education.some((e) => e && e.school)) {
    let edu = "";
    education
      .filter((e) => e && e.school)
      .forEach((e) => {
        edu += `<div class="t5-edu-row">
          <div>
            <div class="t5-edu-deg" style="color:${n}">${escapeHtml(e.degree || "")}</div>
            <div class="t5-edu-sch">${escapeHtml(e.school || "")}</div>
          </div>
          <span class="t5-edu-yr" style="color:${g}">${escapeHtml(e.year || "")}</span>
        </div>`;
      });
    body += `${sectionTitle(g, "Education")}${edu}`;
  }

  if (certList.length > 0) {
    const chips = certList
      .map(
        (c) =>
          `<span class="t5-cert-chip" style="background:${g}18;border:1px solid ${g}55;color:${BODY}">${escapeHtml(c)}</span>`,
      )
      .join("");
    body += `${sectionTitle(g, "Certifications")}<div class="t5-cert-wrap">${chips}</div>`;
  }

  if (techList.length > 0) {
    const chips = techList.map((s) => `<span class="t5-tech-chip">${escapeHtml(s)}</span>`).join("");
    body += `${sectionTitle(g, "Technical Skills")}<div class="t5-tech-wrap">${chips}</div>`;
  }

  if (cv.languages) {
    body += `${sectionTitle(g, "Languages")}<p class="t5-lang" style="color:${BODY}">${escapeHtml(cv.languages)}</p>`;
  }

  if (cv.availability || cv.drivingLicense || cv.willingToRelocate) {
    const add = [];
    if (cv.availability) {
      const tx = escapeHtml(stripEmojiPictographs(cv.availability));
      if (tx) add.push(`<span class="t5-add">${S.cal}${tx}</span>`);
    }
    if (cv.drivingLicense) {
      const tx = escapeHtml(stripEmojiPictographs(cv.drivingLicense));
      if (tx) add.push(`<span class="t5-add">${S.car}License: ${tx}</span>`);
    }
    if (cv.willingToRelocate) {
      const tx = escapeHtml(stripEmojiPictographs(cv.willingToRelocate));
      if (tx) add.push(`<span class="t5-add">${S.plane}Relocate: ${tx}</span>`);
    }
    if (add.length > 0) {
      body += `${sectionTitle(g, "Additional Information")}<div class="t5-add-wrap">${add.join("")}</div>`;
    }
  }

  if (cv.references) {
    body += `${sectionTitle(g, "References")}<p class="t5-refs">${escapeHtml(cv.references)}</p>`;
  }

  body += `</div>`;

  const inner = `<div class="t5-root">${header}${body}</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,400;0,700;0,900;1,400&display=swap');
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: Merriweather, Georgia, serif;
      font-size: 11px;
      color: ${BODY};
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .t5-root {
      width: 794px;
      max-width: 100%;
      margin: 0 auto;
      background: #fff;
      border-radius: 10px;
      overflow: hidden;
    }
    .t5-header {
      padding: 26px 28px 20px;
      position: relative;
      overflow: hidden;
    }
    .t5-dec { position: absolute; pointer-events: none; }
    .t5-dec-tr {
      top: 0;
      right: 0;
      width: 80px;
      height: 80px;
      border-bottom-width: 1px;
      border-bottom-style: solid;
      border-left-width: 1px;
      border-left-style: solid;
      border-top: none;
      border-right: none;
    }
    .t5-dec-bl {
      bottom: 0;
      left: 0;
      width: 50px;
      height: 50px;
      border-top-width: 1px;
      border-top-style: solid;
      border-right-width: 1px;
      border-right-style: solid;
      border-bottom: none;
      border-left: none;
    }
    .t5-h1 {
      font-size: 26px;
      font-weight: 900;
      color: #ffffff;
      margin: 0 0 3px;
      letter-spacing: 1px;
    }
    .t5-sub {
      font-weight: 600;
      font-size: 12px;
      margin: 0 0 12px;
      letter-spacing: 0.5px;
    }
    .t5-contact-row {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      font-size: 9.5px;
      color: #aabbcc;
    }
    .t5-contact-item { display: inline-flex; align-items: center; }
    .t5-gulf-row {
      display: flex;
      gap: 14px;
      flex-wrap: wrap;
      font-size: 9px;
      margin-top: 6px;
    }
    .t5-gulf-item { display: inline-flex; align-items: center; }
    .t5-gold-rule { margin-top: 16px; height: 1px; }
    .t5-body { padding: 16px 28px 20px; }
    .t5-sectitle {
      margin: 14px 0 8px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .t5-sectitle-dash { width: 28px; height: 2px; flex-shrink: 0; }
    .t5-sectitle-text {
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 2.5px;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .t5-sectitle-line { flex: 1; height: 1px; }
    .t5-summary {
      font-size: 10.5px;
      line-height: 1.75;
      margin: 0;
      font-style: italic;
      padding-left: 10px;
    }
    .t5-skill-wrap { display: flex; flex-wrap: wrap; gap: 5px; }
    .t5-skill-tag {
      padding: 3px 10px;
      font-size: 9.5px;
      font-weight: 600;
      border-radius: 3px;
      letter-spacing: 0.3px;
    }
    .t5-exp-entry {
      margin-bottom: 13px;
      padding-left: 14px;
    }
    .t5-exp-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .t5-exp-role { font-size: 12px; font-weight: 700; }
    .t5-exp-co { font-size: 10px; font-weight: 600; margin-top: 1px; }
    .t5-exp-pill {
      font-size: 9px;
      color: #ffffff;
      padding: 2px 7px;
      border-radius: 3px;
      white-space: nowrap;
      margin-left: 8px;
      flex-shrink: 0;
    }
    .t5-exp-line {
      font-size: 10px;
      color: ${BODY};
      margin: 0;
      line-height: 1.65;
      word-break: normal;
      overflow-wrap: break-word;
    }
    .t5-edu-row {
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
    }
    .t5-edu-deg { font-size: 11px; font-weight: 700; }
    .t5-edu-sch { font-size: 10px; color: ${SUBTLE}; }
    .t5-edu-yr { font-size: 9px; font-weight: 600; }
    .t5-cert-wrap { display: flex; flex-wrap: wrap; gap: 5px; }
    .t5-cert-chip {
      padding: 2px 9px;
      border-radius: 3px;
      font-size: 9.5px;
    }
    .t5-tech-wrap { display: flex; flex-wrap: wrap; gap: 5px; }
    .t5-tech-chip {
      padding: 2px 8px;
      background: #e8e8e8;
      border-radius: 3px;
      font-size: 9.5px;
      color: ${BODY};
    }
    .t5-lang { font-size: 10.5px; margin: 0; }
    .t5-add-wrap { display: flex; gap: 18px; flex-wrap: wrap; font-size: 10px; color: ${SUBTLE}; }
    .t5-add { display: inline-flex; align-items: center; }
    .t5-refs { font-size: 9.5px; color: ${SUBTLE}; font-style: italic; margin: 0; }
  </style>
</head>
<body>
${inner}
</body>
</html>`;
}

module.exports = { buildGulfExecTemplate5Html };
