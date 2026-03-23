/**
 * Template 2 — Dubai Modern (two-column). Mirrors PreviewTwoCol in src/App.js.
 * No emoji — inline SVG only, stroke hex (no currentColor).
 */

const {
  escapeHtml,
  stripEmojiPictographs,
  splitExperiencePointsForPreview,
  cvWithTemplateCertifications,
} = require("./pdfCommon");

/** TEMPLATES[1] */
const T2 = {
  color: "#0f3460",
  accent: "#00b4d8",
};

const S = {
  mail: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#CCCCCC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;display:inline-block" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="m22 6-10 7L2 6"/></svg>`,
  phone: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#CCCCCC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;display:inline-block" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
  map: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#CCCCCC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;display:inline-block" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
  globe: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#CCCCCC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;display:inline-block" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`,
  id: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#CCCCCC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;display:inline-block" aria-hidden="true"><rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/></svg>`,
  cal: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#CCCCCC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;display:inline-block" aria-hidden="true"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`,
  user: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#CCCCCC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;display:inline-block" aria-hidden="true"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></svg>`,
  ring: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#CCCCCC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;display:inline-block" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`,
  lang: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#CCCCCC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;display:inline-block" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10"/></svg>`,
  medal: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#CCCCCC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;display:inline-block" aria-hidden="true"><path d="M12 2l2.4 7.4h7.6l-6 4.6 2.3 7-6-4.5-6 4.5 2.3-7-6-4.6h7.6z"/></svg>`,
  car: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#CCCCCC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;display:inline-block" aria-hidden="true"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-.4-2.2-.6c-.3-.1-.7-.1-1.1-.1h-5.8c-.4 0-.8 0-1.1.1-.9.2-2.2.6-2.2.6s-2.7.6-3.5 1.5C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>`,
  plane: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#CCCCCC" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;margin-right:5px;display:inline-block" aria-hidden="true"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>`,
};

function colLabel(accent, text) {
  return `<div class="t2-collabel" style="color:${accent}">${escapeHtml(text)}</div>`;
}

function colItem(inner) {
  return `<div class="t2-colitem">${inner}</div>`;
}

function rightLabel(accent, text) {
  return `<div class="t2-rightlabel">
    <span class="t2-rightlabel-text" style="color:${accent}">${escapeHtml(text)}</span>
    <div class="t2-rightlabel-line" style="background:${accent}33"></div>
  </div>`;
}

function buildTwocolTemplate2Html(rawCv) {
  const cv = cvWithTemplateCertifications(rawCv || {});
  const t = T2;
  const a = t.accent;
  const c = t.color;
  const borderTop = `border-top:1px solid ${a}44`;

  const skillList = cv.skills ? cv.skills.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const certList = cv.certifications ? cv.certifications.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const experience = Array.isArray(cv.experience) ? cv.experience : [];
  const education = Array.isArray(cv.education) ? cv.education : [];

  let sidebar = "";

  sidebar += `<div class="t2-side-inner">
    <div class="t2-nameblock">
      <h1 class="t2-name">${escapeHtml(cv.name || "Your Name")}</h1>
      <p class="t2-jobtitle" style="color:${a}">${escapeHtml(cv.title || "Job Title")}</p>
    </div>`;

  sidebar += `<div class="t2-side-sect" style="${borderTop};padding-top:12px">
    ${colLabel(a, "Contact")}
    ${cv.email ? colItem(`${S.mail}${escapeHtml(stripEmojiPictographs(cv.email))}`) : ""}
    ${cv.phone ? colItem(`${S.phone}${escapeHtml(stripEmojiPictographs(cv.phone))}`) : ""}
    ${cv.location ? colItem(`${S.map}${escapeHtml(stripEmojiPictographs(cv.location))}`) : ""}
  </div>`;

  if (cv.nationality || cv.visaStatus || cv.dob || cv.gender || cv.maritalStatus) {
    let pers = "";
    if (cv.nationality) pers += colItem(`${S.globe}${escapeHtml(stripEmojiPictographs(cv.nationality))}`);
    if (cv.visaStatus) pers += colItem(`${S.id}${escapeHtml(stripEmojiPictographs(cv.visaStatus))}`);
    if (cv.dob) pers += colItem(`${S.cal}DOB: ${escapeHtml(stripEmojiPictographs(cv.dob))}`);
    if (cv.gender) pers += colItem(`${S.user}${escapeHtml(stripEmojiPictographs(cv.gender))}`);
    if (cv.maritalStatus) pers += colItem(`${S.ring}${escapeHtml(stripEmojiPictographs(cv.maritalStatus))}`);
    sidebar += `<div class="t2-side-sect" style="${borderTop};padding-top:12px">
      ${colLabel(a, "Personal Info")}
      ${pers}
    </div>`;
  }

  if (skillList.length > 0) {
    let sk = "";
    skillList.forEach((s) => {
      sk += `<div class="t2-skillrow">
        <span class="t2-skilldot" style="background:${a}"></span>
        <span class="t2-skilltext">${escapeHtml(s)}</span>
      </div>`;
    });
    sidebar += `<div class="t2-side-sect" style="${borderTop};padding-top:12px">
      ${colLabel(a, "Core Skills")}
      ${sk}
    </div>`;
  }

  if (cv.languages) {
    let lang = "";
    cv.languages.split(",").forEach((l) => {
      const x = stripEmojiPictographs(l.trim());
      if (x) lang += colItem(`${S.lang}${escapeHtml(x)}`);
    });
    if (lang) {
      sidebar += `<div class="t2-side-sect" style="${borderTop};padding-top:12px">
        ${colLabel(a, "Languages")}
        ${lang}
      </div>`;
    }
  }

  if (certList.length > 0) {
    let cert = "";
    certList.forEach((certLine) => {
      cert += colItem(`${S.medal}${escapeHtml(stripEmojiPictographs(certLine))}`);
    });
    sidebar += `<div class="t2-side-sect" style="${borderTop};padding-top:12px">
      ${colLabel(a, "Certifications")}
      ${cert}
    </div>`;
  }

  if (education.some((e) => e && e.school)) {
    let edu = "";
    education
      .filter((e) => e && e.school)
      .forEach((e) => {
        edu += `<div class="t2-edu-side">
          <div class="t2-edu-year" style="color:${a}">${escapeHtml(e.year || "")}</div>
          <div class="t2-edu-deg">${escapeHtml(e.degree || "")}</div>
          <div class="t2-edu-sch">${escapeHtml(e.school || "")}</div>
        </div>`;
      });
    sidebar += `<div class="t2-side-sect" style="${borderTop};padding-top:12px">
      ${colLabel(a, "Education")}
      ${edu}
    </div>`;
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
    if (add.length > 0) {
      sidebar += `<div class="t2-side-sect" style="${borderTop};padding-top:12px">
        ${colLabel(a, "Additional")}
        ${add.join("")}
      </div>`;
    }
  }

  sidebar += `</div>`;

  let main = "";

  if (cv.summary) {
    main += `<div class="t2-main-block">
      ${rightLabel(a, "Professional Summary")}
      <p class="t2-summary">${escapeHtml(cv.summary)}</p>
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
          pts += `<p class="t2-exp-line">${text}</p>`;
        });
        exp += `<div class="t2-exp-wrap" style="border-left:3px solid ${a}">
          <div class="t2-exp-head">
            <strong class="t2-exp-role">${escapeHtml(e.role || "")}</strong>
            <span class="t2-exp-period">${escapeHtml(e.period || "")}</span>
          </div>
          <div class="t2-exp-co" style="color:${a}">${escapeHtml(e.company || "")}${e.location ? ` · ${escapeHtml(e.location)}` : ""}</div>
          ${pts ? `<div class="t2-exp-points">${pts}</div>` : ""}
        </div>`;
      });
    main += `<div class="t2-main-block">
      ${rightLabel(a, "Work Experience")}
      ${exp}
    </div>`;
  }

  if (cv.technicalSkills) {
    const techs = cv.technicalSkills
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (techs.length > 0) {
      const chips = techs
        .map(
          (s) =>
            `<span class="t2-tech-chip">${escapeHtml(s)}</span>`,
        )
        .join("");
      main += `<div class="t2-main-block">
        ${rightLabel(a, "Technical Skills")}
        <div class="t2-tech-wrap">${chips}</div>
      </div>`;
    }
  }

  if (cv.references) {
    main += `<div class="t2-refs-wrap">
      <p class="t2-refs">${escapeHtml(cv.references)}</p>
    </div>`;
  }

  const inner = `<div class="t2-root">
    <aside class="t2-sidebar" style="background:${c}">${sidebar}</aside>
    <div class="t2-main">${main}</div>
  </div>`;

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
      font-size: 11px;
      color: #222;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .t2-root {
      width: 794px;
      max-width: 100%;
      margin: 0 auto;
      background: #fff;
      border-radius: 10px;
      overflow: hidden;
      display: flex;
      align-items: flex-start;
    }
    .t2-sidebar {
      width: 34%;
      flex-shrink: 0;
      padding: 24px 16px;
      display: flex;
      flex-direction: column;
      gap: 0;
    }
    .t2-side-inner { display: flex; flex-direction: column; gap: 0; width: 100%; }
    .t2-nameblock { margin-bottom: 0; }
    .t2-name { font-size: 16px; font-weight: 800; color: #fff; margin: 0 0 3px; }
    .t2-jobtitle { font-weight: 700; font-size: 10px; margin: 0; }
    .t2-side-sect { margin-bottom: 0; }
    .t2-collabel {
      font-size: 9px;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-bottom: 6px;
    }
    .t2-colitem {
      font-size: 10px;
      color: #ccc;
      margin-bottom: 5px;
      line-height: 1.4;
      word-break: break-all;
    }
    .t2-skillrow { display: flex; align-items: center; gap: 5px; margin-bottom: 5px; }
    .t2-skilldot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
    .t2-skilltext { font-size: 10px; color: #ddd; }
    .t2-edu-side { margin-bottom: 8px; }
    .t2-edu-year { font-size: 9px; font-weight: 700; }
    .t2-edu-deg { font-size: 10px; color: #fff; font-weight: 700; }
    .t2-edu-sch { font-size: 9px; color: #aaa; }
    .t2-main { flex: 1; padding: 24px 20px; min-width: 0; }
    .t2-main-block { margin-bottom: 16px; page-break-inside: avoid; }
    .t2-rightlabel { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
    .t2-rightlabel-text {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
    }
    .t2-rightlabel-line { flex: 1; height: 1px; }
    .t2-summary { font-size: 10px; line-height: 1.7; margin: 0; color: #444; }
    .t2-exp-wrap { margin-bottom: 12px; padding-left: 10px; }
    .t2-exp-head { display: flex; justify-content: space-between; align-items: flex-start; }
    .t2-exp-role { font-size: 11px; }
    .t2-exp-period { font-size: 9px; color: #888; }
    .t2-exp-co { font-size: 10px; font-weight: 700; margin-bottom: 3px; }
    .t2-exp-line {
      font-size: 10px;
      color: #555;
      margin: 0;
      line-height: 1.5;
      word-break: normal;
      overflow-wrap: break-word;
    }
    .t2-tech-wrap { display: flex; flex-wrap: wrap; gap: 4px; }
    .t2-tech-chip {
      padding: 2px 8px;
      background: #f0f0f0;
      border-radius: 4px;
      font-size: 10px;
      color: #333;
    }
    .t2-refs-wrap { margin-top: 14px; padding-top: 10px; border-top: 1px solid #eee; }
    .t2-refs { font-size: 10px; color: #999; font-style: italic; margin: 0; }
  </style>
</head>
<body>
${inner}
</body>
</html>`;
}

module.exports = { buildTwocolTemplate2Html };
