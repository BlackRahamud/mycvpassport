/**
 * Template 8 — Creative Sidebar. Mirrors PreviewCreativeSidebar in src/Template8CreativeSidebar.js
 */

const {
  escapeHtml,
  stripEmojiPictographs,
  splitExperiencePointsForPreview,
  cvWithTemplateCertifications,
} = require("./pdfCommon");

const CORAL = "#E8533F";
const DARK = "#2B2B2B";
const CHARCO = "#3D3D3D";
const SUBTLE = "#888888";
const LIGHT = "#FFF8F7";
const WHITE = "#FFFFFF";

function sideLabel(text) {
  return `<div class="t8-sidelabel" style="color:${CORAL};border-bottom:1px solid ${CORAL}44">${escapeHtml(text)}</div>`;
}

function mainTitle(text) {
  return `<div class="t8-maintitle" style="color:${CORAL}">
    <span>${escapeHtml(text)}</span>
    <div class="t8-maintitle-line" style="background:${CORAL}33"></div>
  </div>`;
}

function buildCreativeSidebarTemplate8Html(rawCv) {
  const cv = cvWithTemplateCertifications(rawCv || {});

  const skillList = cv.skills ? cv.skills.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const techList = cv.technicalSkills ? cv.technicalSkills.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const certList = cv.certifications ? cv.certifications.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const experience = Array.isArray(cv.experience) ? cv.experience : [];
  const education = Array.isArray(cv.education) ? cv.education : [];

  const initial = escapeHtml((cv.name || "?").charAt(0).toUpperCase());

  const S = {
    mail: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#CCCCCC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;display:inline-block" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="m22 6-10 7L2 6"/></svg>`,
    phone: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#CCCCCC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;display:inline-block" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
    map: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#CCCCCC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;display:inline-block" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
    globe: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#CCCCCC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;display:inline-block" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10"/></svg>`,
    id: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#CCCCCC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;display:inline-block" aria-hidden="true"><rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/></svg>`,
    cal: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#CCCCCC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;display:inline-block" aria-hidden="true"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`,
    user: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#CCCCCC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;display:inline-block" aria-hidden="true"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></svg>`,
    heart: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#CCCCCC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;display:inline-block" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
    lang: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#CCCCCC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;display:inline-block" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10"/></svg>`,
    medal: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#CCCCCC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;display:inline-block" aria-hidden="true"><path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6-4.5-6 4.5 2.3-7-6-4.6h7.6z"/></svg>`,
    car: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#CCCCCC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;display:inline-block" aria-hidden="true"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-.4-2.2-.6c-.3-.1-.7-.1-1.1-.1h-5.8c-.4 0-.8 0-1.1.1-.9.2-2.2.6-2.2.6s-2.7.6-3.5 1.5C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>`,
    plane: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#CCCCCC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;display:inline-block" aria-hidden="true"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>`,
  };

  let sidebar = `<aside class="t8-side"><div class="t8-side-inner">
    <div class="t8-avatar" style="background:${CORAL};border:3px solid ${CORAL}44;color:${WHITE}">${initial}</div>
    <h1 class="t8-side-name" style="color:${WHITE}">${escapeHtml(cv.name || "Your Name")}</h1>
    <p class="t8-side-title" style="color:${CORAL}">${escapeHtml(cv.title || "Job Title")}</p>
    <div class="t8-coral-bar" style="background:${CORAL}"></div>
    ${sideLabel("Contact")}
    <div class="t8-side-text">
      ${cv.email ? `<div class="t8-break">${S.mail}${escapeHtml(stripEmojiPictographs(cv.email))}</div>` : ""}
      ${cv.phone ? `<div>${S.phone}${escapeHtml(stripEmojiPictographs(cv.phone))}</div>` : ""}
      ${cv.location ? `<div>${S.map}${escapeHtml(stripEmojiPictographs(cv.location))}</div>` : ""}
    </div>`;

  if (cv.nationality || cv.visaStatus || cv.dob || cv.gender || cv.maritalStatus) {
    let pers = "";
    if (cv.nationality) pers += `<div>${S.globe}${escapeHtml(stripEmojiPictographs(cv.nationality))}</div>`;
    if (cv.visaStatus) pers += `<div>${S.id}${escapeHtml(stripEmojiPictographs(cv.visaStatus))}</div>`;
    if (cv.dob) {
      const d = stripEmojiPictographs(cv.dob);
      if (d) pers += `<div>${S.cal}${escapeHtml(d)}</div>`;
    }
    if (cv.gender) pers += `<div>${S.user}${escapeHtml(stripEmojiPictographs(cv.gender))}</div>`;
    if (cv.maritalStatus) pers += `<div>${S.heart}${escapeHtml(stripEmojiPictographs(cv.maritalStatus))}</div>`;
    sidebar += `${sideLabel("Personal")}<div class="t8-side-text">${pers}</div>`;
  }

  const skillsSlice = skillList.slice(0, 8);
  if (skillsSlice.length > 0) {
    let sk = "";
    skillsSlice.forEach((s, i) => {
      const w = 60 + (i % 5) * 8;
      sk += `<div class="t8-skill-row">
        <div class="t8-skill-name">${escapeHtml(s)}</div>
        <div class="t8-skill-track"><div class="t8-skill-fill" style="width:${w}%;background:${CORAL}"></div></div>
      </div>`;
    });
    sidebar += `${sideLabel("Core Skills")}${sk}`;
  }

  if (cv.languages) {
    let lang = "";
    cv.languages.split(",").forEach((l) => {
      const x = stripEmojiPictographs(l.trim());
      if (x) lang += `<div class="t8-lang-line">${S.lang}${escapeHtml(x)}</div>`;
    });
    if (lang) sidebar += `${sideLabel("Languages")}<div class="t8-side-text">${lang}</div>`;
  }

  if (certList.length > 0) {
    let cert = "";
    certList.forEach((c) => {
      cert += `<div class="t8-cert-line">${S.medal}${escapeHtml(stripEmojiPictographs(c))}</div>`;
    });
    sidebar += `${sideLabel("Certifications")}<div class="t8-cert-block">${cert}</div>`;
  }

  if (cv.availability || cv.drivingLicense || cv.willingToRelocate) {
    let add = "";
    if (cv.availability) {
      const tx = escapeHtml(stripEmojiPictographs(cv.availability));
      if (tx) add += `<div>${S.cal}${tx}</div>`;
    }
    if (cv.drivingLicense) {
      const tx = escapeHtml(stripEmojiPictographs(cv.drivingLicense));
      if (tx) add += `<div>${S.car}${tx}</div>`;
    }
    if (cv.willingToRelocate) {
      const tx = escapeHtml(stripEmojiPictographs(cv.willingToRelocate));
      if (tx) add += `<div>${S.plane}Relocate: ${tx}</div>`;
    }
    if (add) sidebar += `${sideLabel("Additional")}<div class="t8-side-text">${add}</div>`;
  }

  sidebar += `<div class="t8-side-spacer" aria-hidden="true"></div>
    <div class="t8-side-footer" aria-hidden="true">
      <div class="t8-side-footer-line"></div>
      <div class="t8-side-footer-dots"></div>
    </div>
  </div></aside>`;

  let main = `<div class="t8-main" style="background:${LIGHT};margin-left:32%">`;

  if (cv.summary) {
    main += `${mainTitle("About Me")}<p class="t8-sum" style="color:${CHARCO}">${escapeHtml(cv.summary)}</p>`;
  }

  if (experience.some((e) => e && e.company)) {
    let exp = "";
    experience
      .filter((e) => e && e.company)
      .forEach((e) => {
        const lines = e.points ? splitExperiencePointsForPreview(e.points) : [];
        let pts = "";
        lines.forEach((line) => {
          pts += `<p class="t8-exp-line">• ${escapeHtml(line)}</p>`;
        });
        exp += `<div class="t8-exp-block" style="border-left:3px solid ${CORAL}">
          <div class="t8-exp-head">
            <span class="t8-exp-role" style="color:${DARK}">${escapeHtml(e.role || "")}</span>
            <span class="t8-exp-period" style="color:${CORAL}">${escapeHtml(e.period || "")}</span>
          </div>
          <div class="t8-exp-co" style="color:${CORAL}">${escapeHtml(e.company || "")}${e.location ? ` · ${escapeHtml(e.location)}` : ""}</div>
          ${pts ? `<div class="t8-exp-points">${pts}</div>` : ""}
        </div>`;
      });
    main += `${mainTitle("Work Experience")}${exp}`;
  }

  if (education.some((e) => e && e.school)) {
    let edu = "";
    education
      .filter((e) => e && e.school)
      .forEach((e) => {
        edu += `<div class="t8-edu-row">
          <div>
            <div class="t8-edu-deg" style="color:${DARK}">${escapeHtml(e.degree || "")}</div>
            <div class="t8-edu-sch" style="color:${SUBTLE}">${escapeHtml(e.school || "")}</div>
          </div>
          <span class="t8-edu-pill" style="background:${CORAL};color:${WHITE}">${escapeHtml(e.year || "")}</span>
        </div>`;
      });
    main += `${mainTitle("Education")}${edu}`;
  }

  if (techList.length > 0) {
    const chips = techList
      .map(
        (s) =>
          `<span class="t8-tech-chip" style="border:1px solid ${CORAL}55;background:${WHITE};color:${CHARCO}">${escapeHtml(s)}</span>`,
      )
      .join("");
    main += `${mainTitle("Technical Skills")}<div class="t8-tech-wrap">${chips}</div>`;
  }

  if (cv.references) {
    main += `<p class="t8-refs" style="color:${SUBTLE};border-top:1px solid ${CORAL}22">${escapeHtml(cv.references)}</p>`;
  }

  main += `</div>`;

  /* Equal-height columns via display:table (reliable in print/Puppeteer). */
  const inner = `<div class="t8-root">${sidebar}${main}</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    /* No body/sidebar fill — pdf-lib draws the dark strip after Puppeteer (generate-pdf.js). */
    body {
      font-family: Inter, Arial, Helvetica, sans-serif;
      font-size: 10px;
      color: ${CHARCO};
      background: transparent;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .t8-root {
      display: table;
      width: 100%;
      max-width: 794px;
      margin: 0 auto;
      border-collapse: collapse;
      border-spacing: 0;
      table-layout: fixed;
      border-radius: 10px;
      overflow: hidden;
      background: transparent;
      min-height: 297mm;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .t8-side {
      display: table-cell;
      width: 32%;
      vertical-align: top;
      border-radius: 10px 0 0 10px;
      padding: 0;
      box-sizing: border-box;
      overflow: visible;
    }
    .t8-side-inner {
      display: flex;
      flex-direction: column;
      min-height: 100%;
      height: 100%;
      padding: 24px 16px;
      box-sizing: border-box;
    }
    .t8-side-spacer {
      flex: 1 1 auto;
      min-height: 12px;
    }
    .t8-side-footer {
      flex-shrink: 0;
      padding-top: 8px;
    }
    .t8-side-footer-line {
      height: 2px;
      background: linear-gradient(90deg, ${CORAL}55 0%, ${CORAL}18 45%, transparent 100%);
      border-radius: 1px;
      margin-bottom: 6px;
    }
    .t8-side-footer-dots {
      height: 8px;
      opacity: 0.4;
      background-image: radial-gradient(${CORAL}55 0.8px, transparent 0.8px);
      background-size: 6px 6px;
      background-position: 0 2px;
    }
    .t8-avatar {
      width: 70px;
      height: 70px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 14px;
      font-size: 24px;
      font-weight: 900;
    }
    .t8-side-name { font-size: 16px; font-weight: 900; margin: 0 0 2px; line-height: 1.2; }
    .t8-side-title { font-weight: 700; font-size: 9.5px; margin: 0 0 14px; line-height: 1.4; }
    .t8-coral-bar { height: 2px; margin-bottom: 14px; width: 40px; }
    .t8-sidelabel {
      font-size: 8px;
      font-weight: 900;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-bottom: 6px;
      margin-top: 14px;
      padding-bottom: 3px;
    }
    .t8-side-text { font-size: 9px; color: #ccc; line-height: 1.9; }
    .t8-break { word-break: break-all; }
    .t8-skill-row { margin-bottom: 7px; }
    .t8-skill-name { font-size: 9px; color: #ddd; margin-bottom: 2px; }
    .t8-skill-track {
      height: 3px;
      background: #ffffff18;
      border-radius: 2px;
      overflow: hidden;
    }
    .t8-skill-fill { height: 3px; border-radius: 2px; }
    .t8-lang-line { font-size: 9px; color: #ccc; margin-bottom: 4px; display: flex; align-items: center; }
    .t8-cert-block { font-size: 8.5px; color: #ccc; line-height: 1.4; }
    .t8-cert-line { margin-bottom: 4px; display: flex; align-items: flex-start; }
    .t8-main {
      display: table-cell;
      width: 68%;
      vertical-align: top;
      min-width: 0;
      box-sizing: border-box;
      padding: 24px 20px;
    }
    .t8-maintitle {
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 1.8px;
      text-transform: uppercase;
      margin: 14px 0 6px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .t8-maintitle-line { flex: 1; height: 1px; }
    .t8-sum { font-size: 10px; line-height: 1.75; margin: 0; }
    .t8-exp-block {
      margin-bottom: 13px;
      padding-left: 12px;
      border-radius: 0 2px 2px 0;
    }
    .t8-exp-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .t8-exp-role { font-size: 11px; font-weight: 700; }
    .t8-exp-period { font-size: 8.5px; font-weight: 700; flex-shrink: 0; margin-left: 8px; }
    .t8-exp-co { font-size: 9.5px; margin-bottom: 3px; }
    .t8-exp-line {
      font-size: 9.5px;
      color: ${CHARCO};
      margin: 0;
      line-height: 1.6;
      word-break: normal;
      overflow-wrap: break-word;
    }
    .t8-edu-row {
      margin-bottom: 9px;
      display: flex;
      justify-content: space-between;
    }
    .t8-edu-deg { font-size: 10.5px; font-weight: 700; }
    .t8-edu-sch { font-size: 9.5px; }
    .t8-edu-pill {
      font-size: 8.5px;
      padding: 2px 7px;
      border-radius: 10px;
      height: fit-content;
      font-weight: 700;
      flex-shrink: 0;
      margin-left: 8px;
    }
    .t8-tech-wrap { display: flex; flex-wrap: wrap; gap: 5px; }
    .t8-tech-chip { padding: 2px 9px; border-radius: 4px; font-size: 9px; }
    .t8-refs {
      font-size: 9px;
      font-style: italic;
      margin: 14px 0 0;
      padding-top: 10px;
    }

    @media print {
      html, body { margin: 0; padding: 0; }

      /* Apply break rules only to the MAIN content column */
      .t8-main { width: 100%; }

      /* ATOMIC — never split a job or education entry */
      .t8-main .t8-exp-block,
      .t8-main .t8-edu-row,
      .t8-main .t8-cert-line {
        break-inside: avoid;
        page-break-inside: avoid;
        margin-bottom: 14px;
      }

      /* SECTION HEADERS — keep with first item below */
      .t8-main .t8-main-title,
      .t8-main h2,
      .t8-main h3 {
        break-after: avoid;
        page-break-after: avoid;
      }

      .t8-main p, .t8-main li { orphans: 3; widows: 3; }
    }
  </style>
</head>
<body>
${inner}
</body>
</html>`;
}

module.exports = { buildCreativeSidebarTemplate8Html };
