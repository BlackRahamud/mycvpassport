/**
 * Template 3 — Arabia Pro (sidebar + main). Mirrors PreviewSidebar in src/App.js.
 * Colors: #1a1a2e / #1B3A6B. Trebuchet MS → PT Sans + fallbacks.
 */

const {
  escapeHtml,
  stripEmojiPictographs,
  splitExperiencePointsForPreview,
  cvWithTemplateCertifications,
} = require("./pdfCommon");

const T3 = {
  color: "#1a1a2e",
  accent: "#1B3A6B",
};

const S = {
  mail: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#CCCCCC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;display:inline-block" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="m22 6-10 7L2 6"/></svg>`,
  phone: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#CCCCCC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;display:inline-block" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
  map: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#CCCCCC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;display:inline-block" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  globe: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#CCCCCC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;display:inline-block" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  id: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#CCCCCC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;display:inline-block" aria-hidden="true"><rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/></svg>`,
  lang: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#CCCCCC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;display:inline-block" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10"/></svg>`,
  medal: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#CCCCCC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;display:inline-block" aria-hidden="true"><path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6-4.5-6 4.5 2.3-7-6-4.6h7.6z"/></svg>`,
  cal: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#CCCCCC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;display:inline-block" aria-hidden="true"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`,
  car: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#CCCCCC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;display:inline-block" aria-hidden="true"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-.4-2.2-.6c-.3-.1-.7-.1-1.1-.1h-5.8c-.4 0-.8 0-1.1.1-.9.2-2.2.6-2.2.6s-2.7.6-3.5 1.5C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>`,
  plane: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#CCCCCC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;display:inline-block" aria-hidden="true"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>`,
};

function colLabel(accent, text) {
  return `<div class="t3-collabel" style="color:${accent}">${escapeHtml(text)}</div>`;
}

function colItem(inner) {
  return `<div class="t3-colitem">${inner}</div>`;
}

function rightLabel(accent, text) {
  return `<div class="t3-rightlabel">
    <span class="t3-rightlabel-text" style="color:${accent}">${escapeHtml(text)}</span>
    <div class="t3-rightlabel-line" style="background:${accent}33"></div>
  </div>`;
}

function buildSidebarTemplate3Html(rawCv) {
  const cv = cvWithTemplateCertifications(rawCv || {});
  const t = T3;
  const c = t.color;
  const a = t.accent;

  const skillList = cv.skills ? cv.skills.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const certList = cv.certifications ? cv.certifications.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const experience = Array.isArray(cv.experience) ? cv.experience : [];
  const education = Array.isArray(cv.education) ? cv.education : [];

  const initial = escapeHtml((cv.name || "?").charAt(0).toUpperCase());

  let sidebar = `<aside class="t3-sidebar" style="background:${c}">
    <div class="t3-avatar" style="background:${a};color:${c}">${initial}</div>
    ${colLabel(a, "Contact")}
    ${cv.email ? colItem(`${S.mail}${escapeHtml(stripEmojiPictographs(cv.email))}`) : ""}
    ${cv.phone ? colItem(`${S.phone}${escapeHtml(stripEmojiPictographs(cv.phone))}`) : ""}
    ${cv.location ? colItem(`${S.map}${escapeHtml(stripEmojiPictographs(cv.location))}`) : ""}`;

  if (cv.nationality || cv.visaStatus || cv.dob || cv.gender || cv.maritalStatus) {
    let pers = "";
    if (cv.nationality) pers += colItem(`${S.globe}${escapeHtml(stripEmojiPictographs(cv.nationality))}`);
    if (cv.visaStatus) pers += colItem(`${S.id}${escapeHtml(stripEmojiPictographs(cv.visaStatus))}`);
    if (cv.dob) {
      const d = stripEmojiPictographs(cv.dob);
      if (d) pers += colItem(`DOB: ${escapeHtml(d)}`);
    }
    if (cv.gender) pers += colItem(`${escapeHtml(stripEmojiPictographs(cv.gender))}`);
    if (cv.maritalStatus) pers += colItem(`${escapeHtml(stripEmojiPictographs(cv.maritalStatus))}`);
    sidebar += `<div class="t3-side-block">${colLabel(a, "Personal")}${pers}</div>`;
  }

  if (skillList.length > 0) {
    let sk = "";
    skillList.forEach((s, i) => {
      const w = 65 + (i % 4) * 9;
      sk += `<div class="t3-skill-block">
        <div class="t3-skill-name">${escapeHtml(s)}</div>
        <div class="t3-skill-track"><div class="t3-skill-fill" style="width:${w}%;background:${a}"></div></div>
      </div>`;
    });
    sidebar += `<div class="t3-side-block">${colLabel(a, "Core Skills")}${sk}</div>`;
  }

  if (cv.languages) {
    let lang = "";
    cv.languages.split(",").forEach((l) => {
      const x = stripEmojiPictographs(l.trim());
      if (x) lang += colItem(`${S.lang}${escapeHtml(x)}`);
    });
    if (lang) sidebar += `<div class="t3-side-block">${colLabel(a, "Languages")}${lang}</div>`;
  }

  if (certList.length > 0) {
    let cert = "";
    certList.forEach((line) => {
      cert += colItem(`${S.medal}${escapeHtml(stripEmojiPictographs(line))}`);
    });
    sidebar += `<div class="t3-side-block">${colLabel(a, "Certifications")}${cert}</div>`;
  }

  if (cv.availability || cv.drivingLicense || cv.willingToRelocate) {
    const add = [];
    if (cv.availability) {
      const tx = escapeHtml(stripEmojiPictographs(cv.availability));
      if (tx) add.push(colItem(`${S.cal}${tx}`));
    }
    if (cv.drivingLicense) {
      const tx = escapeHtml(stripEmojiPictographs(cv.drivingLicense));
      if (tx) add.push(colItem(`${S.car}${tx}`));
    }
    if (cv.willingToRelocate) {
      const tx = escapeHtml(stripEmojiPictographs(cv.willingToRelocate));
      if (tx) add.push(colItem(`${S.plane}Relocate: ${tx}`));
    }
    if (add.length > 0) sidebar += `<div class="t3-side-block">${colLabel(a, "Additional")}${add.join("")}</div>`;
  }

  sidebar += `</aside>`;

  let main = `<div class="t3-main">
    <div class="t3-header-main">
      <h1 class="t3-h1" style="color:${c}">${escapeHtml(cv.name || "Your Name")}</h1>
      <p class="t3-sub" style="color:${a}">${escapeHtml(cv.title || "Job Title")}</p>
    </div>`;

  if (cv.summary) {
    main += `<div class="t3-main-block">
      ${rightLabel(a, "Professional Summary")}
      <p class="t3-summary">${escapeHtml(cv.summary)}</p>
    </div>`;
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
          pts += `<p class="t3-exp-line">${text}</p>`;
        });
        exp += `<div class="t3-exp-item">
          <div class="t3-exp-head">
            <strong class="t3-exp-role" style="color:${c}">${escapeHtml(e.role || "")}</strong>
            <span class="t3-exp-pill" style="background:${a}18;color:#888">${escapeHtml(e.period || "")}</span>
          </div>
          <div class="t3-exp-co" style="color:${a}">${escapeHtml(e.company || "")}${e.location ? ` · ${escapeHtml(e.location)}` : ""}</div>
          ${pts ? `<div class="t3-exp-points">${pts}</div>` : ""}
        </div>`;
      });
    main += `<div class="t3-main-block">${rightLabel(a, "Work Experience")}${exp}</div>`;
  }

  if (cv.technicalSkills) {
    const techs = cv.technicalSkills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (techs.length > 0) {
      const chips = techs.map((s) => `<span class="t3-tech-chip">${escapeHtml(s)}</span>`).join("");
      main += `<div class="t3-main-block">${rightLabel(a, "Technical Skills")}<div class="t3-tech-wrap">${chips}</div></div>`;
    }
  }

  if (education.some((e) => e && e.school)) {
    let edu = "";
    education
      .filter((e) => e && e.school)
      .forEach((e) => {
        edu += `<div class="t3-edu-row">
          <div>
            <strong class="t3-edu-deg">${escapeHtml(e.degree || "")}</strong>
            <div class="t3-edu-sch">${escapeHtml(e.school || "")}</div>
          </div>
          <span class="t3-edu-yr">${escapeHtml(e.year || "")}</span>
        </div>`;
      });
    main += `<div class="t3-main-block">${rightLabel(a, "Education")}${edu}</div>`;
  }

  if (cv.references) {
    main += `<p class="t3-refs">${escapeHtml(cv.references)}</p>`;
  }

  main += `</div>`;

  const inner = `<div class="t3-root">${sidebar}${main}</div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=PT+Sans:ital,wght@0,400;0,700;1,400&display=swap');
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: 'PT Sans', 'Trebuchet MS', Helvetica, sans-serif;
      font-size: 11px;
      color: #222;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .t3-root {
      width: 794px;
      max-width: 100%;
      margin: 0 auto;
      background: #fff;
      border-radius: 10px;
      overflow: hidden;
      display: flex;
      align-items: stretch;
    }
    .t3-sidebar {
      width: 28%;
      flex-shrink: 0;
      padding: 22px 14px;
    }
    .t3-avatar {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      font-weight: 900;
      margin-bottom: 12px;
    }
    .t3-collabel {
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .t3-colitem {
      font-size: 10px;
      color: #ccc;
      margin-bottom: 5px;
      line-height: 1.4;
      word-break: break-all;
    }
    .t3-side-block { margin-top: 14px; }
    .t3-skill-block { font-size: 9px; color: #ddd; margin-bottom: 6px; }
    .t3-skill-name { margin-bottom: 2px; }
    .t3-skill-track {
      height: 3px;
      background: #ffffff22;
      border-radius: 2px;
      overflow: hidden;
    }
    .t3-skill-fill { height: 3px; border-radius: 2px; }
    .t3-main { flex: 1; padding: 22px 18px; min-width: 0; }
    .t3-header-main { margin-bottom: 16px; }
    .t3-h1 { font-size: 18px; font-weight: 900; margin: 0 0 2px; }
    .t3-sub { font-weight: 700; font-size: 11px; margin: 0; }
    .t3-main-block { margin-bottom: 14px; page-break-inside: avoid; }
    .t3-rightlabel { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .t3-rightlabel-text {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
    }
    .t3-rightlabel-line { flex: 1; height: 1px; }
    .t3-summary { font-size: 10px; line-height: 1.7; margin: 0; color: #444; }
    .t3-exp-item { margin-bottom: 12px; }
    .t3-exp-head { display: flex; justify-content: space-between; align-items: flex-start; }
    .t3-exp-role { font-size: 11px; }
    .t3-exp-pill { font-size: 9px; padding: 1px 6px; border-radius: 8px; }
    .t3-exp-co { font-size: 10px; margin-bottom: 3px; }
    .t3-exp-line {
      font-size: 10px;
      color: #555;
      margin: 0;
      line-height: 1.5;
      word-break: normal;
      overflow-wrap: break-word;
    }
    .t3-tech-wrap { display: flex; flex-wrap: wrap; gap: 4px; }
    .t3-tech-chip {
      padding: 2px 7px;
      background: #f0f0f0;
      border-radius: 4px;
      font-size: 9px;
      color: #333;
    }
    .t3-edu-row {
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
    }
    .t3-edu-deg { font-size: 11px; }
    .t3-edu-sch { font-size: 10px; color: #666; }
    .t3-edu-yr { font-size: 9px; color: #888; }
    .t3-refs {
      font-size: 9px;
      color: #999;
      font-style: italic;
      margin: 10px 0 0;
      padding-top: 8px;
      border-top: 1px solid #eee;
    }

    @media print {
      html, body { margin: 0; padding: 0; }

      /* Apply break rules only to the MAIN content column */
      .t3-main { width: 100%; }

      /* ATOMIC — never split a job or education entry */
      .t3-main .t3-exp-item,
      .t3-main .t3-edu-row {
        break-inside: avoid;
        page-break-inside: avoid;
        margin-bottom: 14px;
      }

      /* SECTION HEADERS — keep with first item below */
      .t3-main .t3-rightlabel-text,
      .t3-main h2,
      .t3-main h3 {
        break-after: avoid;
        page-break-after: avoid;
      }

      .t3-main p, .t3-main li { orphans: 3; widows: 3; }
    }
  </style>
</head>
<body>
${inner}
</body>
</html>`;
}

module.exports = { buildSidebarTemplate3Html };
