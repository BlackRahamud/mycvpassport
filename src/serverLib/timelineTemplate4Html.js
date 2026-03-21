/**
 * Template 4 — Executive Gold (timeline). Mirrors PreviewTimeline in src/App.js.
 * Colors: #1a0a00 / #d4a017. Georgia + Merriweather for PDF.
 */

const {
  escapeHtml,
  stripEmojiPictographs,
  splitExperiencePointsForPreview,
  cvWithTemplateCertifications,
} = require("./pdfCommon");

const T4 = {
  color: "#1a0a00",
  accent: "#d4a017",
};

function rightLabel(accent, text) {
  return `<div class="t4-rightlabel">
    <span class="t4-rightlabel-text" style="color:${accent}">${escapeHtml(text)}</span>
    <div class="t4-rightlabel-line" style="background:${accent}33"></div>
  </div>`;
}

function buildTimelineTemplate4Html(rawCv) {
  const cv = cvWithTemplateCertifications(rawCv || {});
  const c = T4.color;
  const a = T4.accent;

  const skillList = cv.skills ? cv.skills.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const certList = cv.certifications ? cv.certifications.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const experience = Array.isArray(cv.experience) ? cv.experience : [];
  const education = Array.isArray(cv.education) ? cv.education : [];

  const S = {
    globe: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#666666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;display:inline-block" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10"/></svg>`,
    id: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#666666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;display:inline-block" aria-hidden="true"><rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/></svg>`,
    mail: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#666666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;display:inline-block" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="m22 6-10 7L2 6"/></svg>`,
    phone: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#666666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;display:inline-block" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
    map: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#666666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;display:inline-block" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
    medal: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#444444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;display:inline-block" aria-hidden="true"><path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6-4.5-6 4.5 2.3-7-6-4.6h7.6z"/></svg>`,
    cal: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#555555" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;display:inline-block" aria-hidden="true"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`,
    car: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#555555" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;display:inline-block" aria-hidden="true"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-.4-2.2-.6c-.3-.1-.7-.1-1.1-.1h-5.8c-.4 0-.8 0-1.1.1-.9.2-2.2.6-2.2.6s-2.7.6-3.5 1.5C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>`,
    plane: `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#555555" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:4px;display:inline-block" aria-hidden="true"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>`,
  };

  let meta = "";
  if (cv.nationality) meta += `<span class="t4-meta-item">${S.globe}${escapeHtml(stripEmojiPictographs(cv.nationality))}</span>`;
  if (cv.visaStatus) meta += `<span class="t4-meta-item">${S.id}${escapeHtml(stripEmojiPictographs(cv.visaStatus))}</span>`;
  if (cv.dob) {
    const d = stripEmojiPictographs(cv.dob);
    if (d) meta += `<span class="t4-meta-item">DOB: ${escapeHtml(d)}</span>`;
  }
  if (cv.gender) meta += `<span class="t4-meta-item">${escapeHtml(stripEmojiPictographs(cv.gender))}</span>`;
  if (cv.maritalStatus) meta += `<span class="t4-meta-item">${escapeHtml(stripEmojiPictographs(cv.maritalStatus))}</span>`;

  let contactRight = "";
  if (cv.email) contactRight += `<div>${S.mail}${escapeHtml(stripEmojiPictographs(cv.email))}</div>`;
  if (cv.phone) contactRight += `<div>${S.phone}${escapeHtml(stripEmojiPictographs(cv.phone))}</div>`;
  if (cv.location) contactRight += `<div>${S.map}${escapeHtml(stripEmojiPictographs(cv.location))}</div>`;

  const header = `<header class="t4-header" style="border-bottom:3px solid ${a}">
    <div class="t4-header-row">
      <div>
        <h1 class="t4-h1" style="color:${c}">${escapeHtml(cv.name || "Your Name")}</h1>
        <p class="t4-title" style="color:${a}">${escapeHtml(cv.title || "Job Title")}</p>
        ${meta ? `<div class="t4-meta">${meta}</div>` : ""}
      </div>
      ${contactRight ? `<div class="t4-contact-right">${contactRight}</div>` : ""}
    </div>
  </header>`;

  let body = `<div class="t4-body">`;

  if (cv.summary) {
    body += `<div class="t4-summary-box" style="background:${a}0d;border-left:3px solid ${a}">
      <p class="t4-summary">${escapeHtml(cv.summary)}</p>
    </div>`;
  }

  if (skillList.length > 0) {
    const chips = skillList
      .map(
        (s) =>
          `<span class="t4-skill-chip" style="background:${a}15;border:1px solid ${a}44">${escapeHtml(s)}</span>`,
      )
      .join("");
    body += `<div class="t4-block">${rightLabel(a, "Core Skills")}<div class="t4-chips">${chips}</div></div>`;
  }

  if (experience.some((e) => e && e.company)) {
    let items = "";
    experience
      .filter((e) => e && e.company)
      .forEach((e) => {
        const lines = e.points ? splitExperiencePointsForPreview(e.points) : [];
        let pts = "";
        lines.forEach((line, j) => {
          const text = j === 0 ? escapeHtml(line) : `• ${escapeHtml(line)}`;
          pts += `<p class="t4-exp-line">${text}</p>`;
        });
        items += `<div class="t4-tl-item">
          <div class="t4-tl-dot" style="background:${a};box-shadow:0 0 0 2px ${a}"></div>
          <div class="t4-tl-head">
            <strong class="t4-exp-role" style="color:${c}">${escapeHtml(e.role || "")}</strong>
            <span class="t4-exp-period">${escapeHtml(e.period || "")}</span>
          </div>
          <div class="t4-exp-co" style="color:${a}">${escapeHtml(e.company || "")}${e.location ? ` · ${escapeHtml(e.location)}` : ""}</div>
          ${pts ? `<div class="t4-exp-points">${pts}</div>` : ""}
        </div>`;
      });
    body += `<div class="t4-block">${rightLabel(a, "Work Experience")}
      <div class="t4-tl-outer">
        <div class="t4-tl-line" style="background:${a}33"></div>
        <div class="t4-tl-items">${items}</div>
      </div>
    </div>`;
  }

  let colLeft = "";
  let colRight = "";

  if (education.some((e) => e && e.school)) {
    let edu = "";
    education
      .filter((e) => e && e.school)
      .forEach((e) => {
        edu += `<div class="t4-edu-block">
          <strong class="t4-edu-deg">${escapeHtml(e.degree || "")}</strong>
          <div class="t4-edu-sch">${escapeHtml(e.school || "")}</div>
          <div class="t4-edu-yr" style="color:${a}">${escapeHtml(e.year || "")}</div>
        </div>`;
      });
    colLeft += `<div class="t4-grid-block">${rightLabel(a, "Education")}${edu}</div>`;
  }

  if (certList.length > 0) {
    let certs = "";
    certList.forEach((line) => {
      certs += `<div class="t4-cert-line">${S.medal}${escapeHtml(stripEmojiPictographs(line))}</div>`;
    });
    colLeft += `<div class="t4-grid-block">${rightLabel(a, "Certifications")}${certs}</div>`;
  }

  if (cv.technicalSkills) {
    const techs = cv.technicalSkills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (techs.length > 0) {
      const chips = techs.map((s) => `<span class="t4-tech-chip">${escapeHtml(s)}</span>`).join("");
      colRight += `<div class="t4-grid-block">${rightLabel(a, "Technical Skills")}<div class="t4-tech-wrap">${chips}</div></div>`;
    }
  }

  if (cv.languages) {
    colRight += `<div class="t4-grid-block">${rightLabel(a, "Languages")}<p class="t4-lang">${escapeHtml(cv.languages)}</p></div>`;
  }

  if (cv.availability || cv.drivingLicense || cv.willingToRelocate) {
    let add = "";
    if (cv.availability) {
      const tx = escapeHtml(stripEmojiPictographs(cv.availability));
      if (tx) add += `<div class="t4-add-line">${S.cal}${tx}</div>`;
    }
    if (cv.drivingLicense) {
      const tx = escapeHtml(stripEmojiPictographs(cv.drivingLicense));
      if (tx) add += `<div class="t4-add-line">${S.car}License: ${tx}</div>`;
    }
    if (cv.willingToRelocate) {
      const tx = escapeHtml(stripEmojiPictographs(cv.willingToRelocate));
      if (tx) add += `<div class="t4-add-line">${S.plane}Relocate: ${tx}</div>`;
    }
    if (add) colRight += `<div class="t4-grid-block">${rightLabel(a, "Additional Info")}${add}</div>`;
  }

  if (colLeft || colRight) {
    body += `<div class="t4-grid">
      <div class="t4-grid-col">${colLeft}</div>
      <div class="t4-grid-col">${colRight}</div>
    </div>`;
  }

  if (cv.references) {
    body += `<p class="t4-refs">${escapeHtml(cv.references)}</p>`;
  }

  body += `</div>`;

  const inner = `<div class="t4-root">${header}${body}</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Merriweather:ital,wght@0,400;0,700;0,900;1,400&family=Source+Sans+3:wght@400;600;700;800&display=swap');
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: Merriweather, Georgia, serif;
      font-size: 11px;
      color: #222;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .t4-root {
      width: 794px;
      max-width: 100%;
      margin: 0 auto;
      background: #fff;
      border-radius: 10px;
      overflow: hidden;
    }
    .t4-header { padding: 24px 28px 16px; }
    .t4-header-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .t4-h1 { font-size: 24px; font-weight: 900; margin: 0 0 3px; }
    .t4-title { font-weight: 700; font-size: 11px; margin: 0 0 6px; }
    .t4-meta {
      display: flex;
      gap: 14px;
      flex-wrap: wrap;
      font-size: 9px;
      color: #666;
    }
    .t4-meta-item { display: inline-flex; align-items: center; }
    .t4-contact-right {
      text-align: right;
      font-size: 9px;
      color: #666;
      line-height: 1.8;
    }
    .t4-body { padding: 18px 28px; }
    .t4-summary-box {
      margin-bottom: 16px;
      padding: 12px 14px;
      border-radius: 0 6px 6px 0;
    }
    .t4-summary {
      font-size: 10px;
      line-height: 1.7;
      margin: 0;
      color: #444;
      font-style: italic;
    }
    .t4-block { margin-bottom: 14px; page-break-inside: avoid; }
    .t4-rightlabel { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .t4-rightlabel-text {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      font-family: 'Source Sans 3', sans-serif;
    }
    .t4-rightlabel-line { flex: 1; height: 1px; }
    .t4-chips { display: flex; flex-wrap: wrap; gap: 5px; }
    .t4-skill-chip {
      padding: 2px 9px;
      border-radius: 10px;
      font-size: 9px;
      color: #333;
    }
    .t4-tl-outer { position: relative; padding-left: 20px; }
    .t4-tl-line {
      position: absolute;
      left: 5px;
      top: 4px;
      bottom: 4px;
      width: 2px;
    }
    .t4-tl-items { position: relative; }
    .t4-tl-item { position: relative; margin-bottom: 14px; }
    .t4-tl-dot {
      position: absolute;
      left: -17px;
      top: 3px;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      border: 2px solid #ffffff;
    }
    .t4-tl-head { display: flex; justify-content: space-between; align-items: flex-start; }
    .t4-exp-role { font-size: 11px; }
    .t4-exp-period { font-size: 9px; color: #888; }
    .t4-exp-co { font-size: 10px; font-weight: 700; margin-bottom: 3px; }
    .t4-exp-line {
      font-size: 10px;
      color: #555;
      margin: 0;
      line-height: 1.6;
      word-break: normal;
      overflow-wrap: break-word;
    }
    .t4-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .t4-grid-block { margin-bottom: 12px; }
    .t4-edu-block { margin-bottom: 8px; }
    .t4-edu-deg { font-size: 11px; }
    .t4-edu-sch { font-size: 9px; color: #666; }
    .t4-edu-yr { font-size: 9px; }
    .t4-cert-line { font-size: 10px; color: #444; margin-bottom: 3px; display: flex; align-items: center; }
    .t4-tech-wrap { display: flex; flex-wrap: wrap; gap: 4px; }
    .t4-tech-chip {
      padding: 2px 7px;
      background: #f5f5f5;
      border-radius: 4px;
      font-size: 9px;
      color: #333;
    }
    .t4-lang { font-size: 10px; margin: 0; color: #444; }
    .t4-add-line { font-size: 9px; color: #555; margin-bottom: 3px; display: flex; align-items: center; }
    .t4-refs {
      font-size: 9px;
      color: #999;
      font-style: italic;
      margin: 12px 0 0;
      padding-top: 8px;
      border-top: 1px solid #eee;
    }
  </style>
</head>
<body>
${inner}
</body>
</html>`;
}

module.exports = { buildTimelineTemplate4Html };
