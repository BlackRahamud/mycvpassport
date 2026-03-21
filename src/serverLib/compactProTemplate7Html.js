/**
 * Template 7 — Compact Pro. Mirrors PreviewCompactPro in src/Template7CompactPro.js
 */

const {
  escapeHtml,
  stripEmojiPictographs,
  splitExperiencePointsForPreview,
  cvWithTemplateCertifications,
} = require("./pdfCommon");

const TEAL = "#0D7377";
const DARK = "#14213D";
const MID = "#3D3D3D";
const SUBTLE = "#888888";
const LIGHT = "#F0F7F7";
const WHITE = "#FFFFFF";

function sectionTitle(text) {
  return `<div class="t7-sect">
    <div class="t7-sect-bar" style="background:${TEAL}"></div>
    <span class="t7-sect-label" style="color:${DARK}">${escapeHtml(text)}</span>
    <div class="t7-sect-line" style="background:${TEAL}33"></div>
  </div>`;
}

function buildCompactProTemplate7Html(rawCv) {
  const cv = cvWithTemplateCertifications(rawCv || {});

  const skillList = cv.skills ? cv.skills.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const techList = cv.technicalSkills ? cv.technicalSkills.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const certList = cv.certifications ? cv.certifications.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const experience = Array.isArray(cv.experience) ? cv.experience : [];
  const education = Array.isArray(cv.education) ? cv.education : [];

  const S = {
    globe: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#AABBCC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;display:inline-block" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10"/></svg>`,
    id: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#AABBCC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;display:inline-block" aria-hidden="true"><rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/></svg>`,
    mail: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#BBCCEE" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;display:inline-block" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="m22 6-10 7L2 6"/></svg>`,
    phone: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#BBCCEE" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;display:inline-block" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
    map: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#BBCCEE" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;display:inline-block" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
    cal: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#3D3D3D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;display:inline-block" aria-hidden="true"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`,
    car: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#3D3D3D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;display:inline-block" aria-hidden="true"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-.4-2.2-.6c-.3-.1-.7-.1-1.1-.1h-5.8c-.4 0-.8 0-1.1.1-.9.2-2.2.6-2.2.6s-2.7.6-3.5 1.5C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>`,
    plane: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#3D3D3D" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;display:inline-block" aria-hidden="true"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>`,
  };

  let gulf = "";
  if (cv.nationality || cv.visaStatus || cv.dob) {
    const parts = [];
    if (cv.nationality) parts.push(`<span class="t7-gulf-item">${S.globe}${escapeHtml(stripEmojiPictographs(cv.nationality))}</span>`);
    if (cv.visaStatus) parts.push(`<span class="t7-gulf-item">${S.id}${escapeHtml(stripEmojiPictographs(cv.visaStatus))}</span>`);
    if (cv.dob) {
      const d = stripEmojiPictographs(cv.dob);
      if (d) parts.push(`<span class="t7-gulf-item">DOB: ${escapeHtml(d)}</span>`);
    }
    if (cv.gender) parts.push(`<span class="t7-gulf-item">${escapeHtml(stripEmojiPictographs(cv.gender))}</span>`);
    if (cv.maritalStatus) parts.push(`<span class="t7-gulf-item">${escapeHtml(stripEmojiPictographs(cv.maritalStatus))}</span>`);
    if (parts.length) gulf = `<div class="t7-gulf">${parts.join("")}</div>`;
  }

  let contact = "";
  if (cv.email) contact += `<div class="t7-contact-line">${S.mail}${escapeHtml(stripEmojiPictographs(cv.email))}</div>`;
  if (cv.phone) contact += `<div class="t7-contact-line">${S.phone}${escapeHtml(stripEmojiPictographs(cv.phone))}</div>`;
  if (cv.location) contact += `<div class="t7-contact-line">${S.map}${escapeHtml(stripEmojiPictographs(cv.location))}</div>`;

  const header = `<header class="t7-header" style="background:${DARK}">
    <div class="t7-head-row">
      <div>
        <h1 class="t7-h1" style="color:${WHITE}">${escapeHtml(cv.name || "Your Name")}</h1>
        <p class="t7-sub" style="color:${TEAL}">${escapeHtml(cv.title || "Job Title")}</p>
        ${gulf}
      </div>
      ${contact ? `<div class="t7-contact">${contact}</div>` : ""}
    </div>
    <div class="t7-head-rule" style="background:linear-gradient(90deg, ${TEAL}, ${TEAL}00)"></div>
  </header>`;

  let skillsBar = "";
  if (skillList.length > 0) {
    const chips = skillList
      .map(
        (s) =>
          `<span class="t7-skill-chip" style="border:1px solid ${TEAL}44;color:${DARK}">${escapeHtml(s)}</span>`,
      )
      .join("");
    skillsBar = `<div class="t7-skills-bar" style="background:${LIGHT};border-bottom:1px solid ${TEAL}22">
      <div class="t7-skills-inner">
        <span class="t7-skills-label" style="color:${TEAL}">Core Skills</span>
        <div class="t7-skills-vdiv" style="background:${TEAL}44"></div>
        ${chips}
      </div>
    </div>`;
  }

  let body = `<div class="t7-body">`;

  if (cv.summary) {
    body += `${sectionTitle("Professional Summary")}<p class="t7-sum" style="color:${MID}">${escapeHtml(cv.summary)}</p>`;
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
          pts += `<p class="t7-exp-line">${text}</p>`;
        });
        exp += `<div class="t7-exp-block">
          <div class="t7-exp-head">
            <div class="t7-exp-role-wrap">
              <span class="t7-exp-dot" style="background:${TEAL}"></span>
              <span class="t7-exp-role" style="color:${DARK}">${escapeHtml(e.role || "")}</span>
            </div>
            <span class="t7-exp-pill" style="background:${TEAL};color:${WHITE}">${escapeHtml(e.period || "")}</span>
          </div>
          <div class="t7-exp-co" style="color:${TEAL}">${escapeHtml(e.company || "")}${e.location ? ` · ${escapeHtml(e.location)}` : ""}</div>
          ${pts ? `<div class="t7-exp-points">${pts}</div>` : ""}
        </div>`;
      });
    body += `${sectionTitle("Work Experience")}${exp}`;
  }

  if (education.some((e) => e && e.school)) {
    let edu = "";
    education
      .filter((e) => e && e.school)
      .forEach((e) => {
        edu += `<div class="t7-edu-row">
          <div>
            <span class="t7-edu-deg" style="color:${DARK}">${escapeHtml(e.degree || "")}</span>
            <span class="t7-edu-sch" style="color:${SUBTLE}"> · ${escapeHtml(e.school || "")}</span>
          </div>
          <span class="t7-edu-yr" style="color:${TEAL}">${escapeHtml(e.year || "")}</span>
        </div>`;
      });
    body += `${sectionTitle("Education")}${edu}`;
  }

  if (certList.length > 0) {
    const chips = certList
      .map(
        (c) =>
          `<span class="t7-cert-chip" style="background:${LIGHT};border:1px solid ${TEAL}55;color:${DARK}">${escapeHtml(stripEmojiPictographs(c))}</span>`,
      )
      .join("");
    body += `${sectionTitle("Certifications")}<div class="t7-chip-wrap">${chips}</div>`;
  }

  if (techList.length > 0) {
    const chips = techList.map((s) => `<span class="t7-tech-chip">${escapeHtml(s)}</span>`).join("");
    body += `${sectionTitle("Technical Skills")}<div class="t7-chip-wrap">${chips}</div>`;
  }

  let gridLeft = "";
  let gridRight = "";
  if (cv.languages) {
    gridLeft += `${sectionTitle("Languages")}<p class="t7-lang" style="color:${MID}">${escapeHtml(cv.languages)}</p>`;
  }
  if (cv.availability || cv.drivingLicense || cv.willingToRelocate) {
    let add = "";
    if (cv.availability) {
      const tx = escapeHtml(stripEmojiPictographs(cv.availability));
      if (tx) add += `<div class="t7-add-line">${S.cal}${tx}</div>`;
    }
    if (cv.drivingLicense) {
      const tx = escapeHtml(stripEmojiPictographs(cv.drivingLicense));
      if (tx) add += `<div class="t7-add-line">${S.car}${tx}</div>`;
    }
    if (cv.willingToRelocate) {
      const tx = escapeHtml(stripEmojiPictographs(cv.willingToRelocate));
      if (tx) add += `<div class="t7-add-line">${S.plane}Relocate: ${tx}</div>`;
    }
    if (add) gridRight += `${sectionTitle("Additional Info")}<div class="t7-add">${add}</div>`;
  }

  if (gridLeft || gridRight) {
    body += `<div class="t7-grid">
      <div>${gridLeft}</div>
      <div>${gridRight}</div>
    </div>`;
  }

  if (cv.references) {
    body += `<p class="t7-refs" style="color:${SUBTLE};border-top:1px solid ${TEAL}22">${escapeHtml(cv.references)}</p>`;
  }

  body += `</div>`;

  const inner = `<div class="t7-root">${header}${skillsBar}${body}</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: Inter, Arial, Helvetica, sans-serif;
      font-size: 10px;
      color: ${MID};
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .t7-root {
      width: 794px;
      max-width: 100%;
      margin: 0 auto;
      background: ${WHITE};
      border-radius: 10px;
      overflow: hidden;
    }
    .t7-header { padding: 20px 24px 16px; }
    .t7-head-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
    }
    .t7-h1 { font-size: 22px; font-weight: 900; margin: 0 0 3px; letter-spacing: 0.5px; }
    .t7-sub { font-weight: 700; font-size: 11px; margin: 0 0 8px; }
    .t7-gulf { display: flex; gap: 10px; flex-wrap: wrap; font-size: 8.5px; color: #aabbcc; }
    .t7-gulf-item { display: inline-flex; align-items: center; }
    .t7-contact { text-align: right; font-size: 8.5px; color: #bbccee; line-height: 1.9; flex-shrink: 0; }
    .t7-contact-line { display: flex; align-items: center; justify-content: flex-end; }
    .t7-head-rule { margin-top: 14px; height: 2px; }
    .t7-skills-bar { padding: 10px 24px; }
    .t7-skills-inner { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .t7-skills-label {
      font-size: 8px;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      flex-shrink: 0;
    }
    .t7-skills-vdiv { width: 1px; height: 12px; flex-shrink: 0; }
    .t7-skill-chip {
      font-size: 9px;
      font-weight: 600;
      padding: 2px 8px;
      background: #ffffff;
      border-radius: 3px;
    }
    .t7-body { padding: 4px 24px 20px; }
    .t7-sect {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 12px 0 7px;
    }
    .t7-sect-bar { width: 3px; height: 14px; border-radius: 2px; flex-shrink: 0; }
    .t7-sect-label {
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 1.8px;
      text-transform: uppercase;
      white-space: nowrap;
    }
    .t7-sect-line { flex: 1; height: 1px; }
    .t7-sum { font-size: 10px; line-height: 1.7; margin: 0; }
    .t7-exp-block { margin-bottom: 11px; }
    .t7-exp-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .t7-exp-role-wrap { display: flex; align-items: center; gap: 6px; }
    .t7-exp-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
    .t7-exp-role { font-size: 11px; font-weight: 700; }
    .t7-exp-pill {
      font-size: 8.5px;
      padding: 1px 7px;
      border-radius: 10px;
      flex-shrink: 0;
    }
    .t7-exp-co { font-size: 9.5px; font-weight: 600; margin: 2px 0 2px 11px; }
    .t7-exp-line {
      font-size: 9.5px;
      color: ${MID};
      margin: 0;
      line-height: 1.6;
      word-break: normal;
      overflow-wrap: break-word;
    }
    .t7-exp-points { margin-left: 11px; }
    .t7-edu-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 6px;
    }
    .t7-edu-deg { font-size: 10.5px; font-weight: 700; }
    .t7-edu-sch { font-size: 9.5px; }
    .t7-edu-yr { font-size: 8.5px; font-weight: 700; flex-shrink: 0; margin-left: 8px; }
    .t7-chip-wrap { display: flex; flex-wrap: wrap; gap: 5px; }
    .t7-cert-chip { padding: 2px 9px; border-radius: 3px; font-size: 9px; }
    .t7-tech-chip {
      padding: 2px 8px;
      background: #f0f0f0;
      border-radius: 3px;
      font-size: 9px;
      color: ${MID};
    }
    .t7-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-top: 4px;
    }
    .t7-lang { font-size: 10px; margin: 0; }
    .t7-add { font-size: 9.5px; color: ${MID}; line-height: 1.8; }
    .t7-add-line { display: flex; align-items: center; }
    .t7-refs {
      font-size: 9px;
      font-style: italic;
      margin: 12px 0 0;
      padding-top: 8px;
    }
  </style>
</head>
<body>
${inner}
</body>
</html>`;
}

module.exports = { buildCompactProTemplate7Html };
