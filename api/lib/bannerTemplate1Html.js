/**
 * Server-side HTML for Template 1 (Gulf Classic / banner layout).
 * Mirrors PreviewBanner in src/App.js — same structure, typography, and colors.
 * Fonts: Google Fonts @import (Merriweather + Source Sans 3) to match Georgia + sans-serif metrics in headless Chromium.
 */

function escapeHtml(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Same logic as src/experiencePointsPreview.js — keep bullet/line merging identical. */
function stripLeadingBulletToken(str) {
  return String(str ?? "")
    .replace(/^\s*[-•*]\s*/, "")
    .trim();
}

function isNewBulletLine(line) {
  return /^\s*[-•*]/.test(line);
}

function mergeContinuationLines(lines) {
  if (lines.length === 0) return [];
  const blocks = [];
  let cur = stripLeadingBulletToken(lines[0]);

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (isNewBulletLine(line)) {
      blocks.push(cur);
      cur = stripLeadingBulletToken(line);
    } else {
      cur = `${cur} ${stripLeadingBulletToken(line)}`.trim();
    }
  }
  blocks.push(cur);
  return blocks;
}

function splitInlineBulletSegments(block) {
  const t = String(block ?? "").trim();
  if (!t) return [];
  return t
    .split(/\s*•\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function splitExperiencePointsForPreview(text) {
  if (text == null || text === "") return [];

  const rawLines = String(text)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (rawLines.length === 0) return [];

  const mergedBlocks = mergeContinuationLines(rawLines);
  const out = [];
  for (const block of mergedBlocks) {
    out.push(...splitInlineBulletSegments(block));
  }

  return out.map((s) => s.replace(/^•\s*/, "").trim()).filter(Boolean);
}

function normalizeCertificationsArray(raw) {
  if (Array.isArray(raw)) {
    return raw
      .map((c) => {
        if (c == null) return null;
        if (typeof c === "string") {
          const n = c.trim();
          return n ? { name: n, issuer: "", year: "" } : null;
        }
        return {
          name: String(c.name || "").trim(),
          issuer: String(c.issuer || "").trim(),
          year: String(c.year || "").trim(),
        };
      })
      .filter((c) => c && c.name);
  }
  if (typeof raw === "string" && raw.trim()) {
    return raw.split(",").map((s) => ({ name: s.trim(), issuer: "", year: "" })).filter((c) => c.name);
  }
  return [];
}

function formatCertificationLine(c) {
  if (!c || !c.name) return "";
  const n = c.name.replace(/,/g, " ");
  let s = n;
  if (c.issuer) s += ` — ${String(c.issuer).replace(/,/g, " ")}`;
  if (c.year) s += ` (${c.year})`;
  return s;
}

function certificationsToCommaString(arr) {
  return normalizeCertificationsArray(arr).map(formatCertificationLine).filter(Boolean).join(", ");
}

function cvWithTemplateCertifications(cv) {
  if (!cv || typeof cv !== "object") return cv;
  return {
    ...cv,
    certifications: certificationsToCommaString(cv.certifications),
  };
}

/** TEMPLATES[0] — Gulf Classic */
const TEMPLATE_1 = {
  id: 1,
  color: "#1a1a2e",
  accent: "#e94560",
};

const ICON_EMAIL = `<svg class="cvp-pdf-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="m22 6-10 7L2 6"/></svg>`;
const ICON_PHONE = `<svg class="cvp-pdf-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`;
const ICON_MAP = `<svg class="cvp-pdf-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`;
const ICON_GLOBE = `<svg class="cvp-pdf-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;
const ICON_ID = `<svg class="cvp-pdf-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/></svg>`;
const ICON_CAL = `<svg class="cvp-pdf-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`;
const ICON_CAR = `<svg class="cvp-pdf-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-.4-2.2-.6c-.3-.1-.7-.1-1.1-.1h-5.8c-.4 0-.8 0-1.1.1-.9.2-2.2.6-2.2.6s-2.7.6-3.5 1.5C2.7 11.3 2 12.1 2 13v3c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>`;
const ICON_PLANE = `<svg class="cvp-pdf-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>`;

function sectionHtml(title, accent, inner) {
  return `
  <div class="cvp-section">
    <div class="cvp-section-head">
      <span class="cvp-section-title" style="color:${accent}">${escapeHtml(title)}</span>
      <div class="cvp-section-line" style="background:${accent}44"></div>
    </div>
    ${inner}
  </div>`;
}

/**
 * @param {object} rawCv — same shape as builder preview (certifications array or string ok)
 * @returns {string} full HTML document
 */
function buildBannerTemplate1Html(rawCv) {
  const cv = cvWithTemplateCertifications(rawCv || {});
  const t = TEMPLATE_1;
  const skillList = cv.skills ? cv.skills.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const techList = cv.technicalSkills ? cv.technicalSkills.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const certList = cv.certifications ? cv.certifications.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const experience = Array.isArray(cv.experience) ? cv.experience : [];
  const education = Array.isArray(cv.education) ? cv.education : [];

  const contactParts = [];
  if (cv.email) contactParts.push(`<span class="cvp-contact-item">${ICON_EMAIL} ${escapeHtml(cv.email)}</span>`);
  if (cv.phone) contactParts.push(`<span class="cvp-contact-item">${ICON_PHONE} ${escapeHtml(cv.phone)}</span>`);
  if (cv.location) contactParts.push(`<span class="cvp-contact-item">${ICON_MAP} ${escapeHtml(cv.location)}</span>`);
  if (cv.nationality) contactParts.push(`<span class="cvp-contact-item">${ICON_GLOBE} ${escapeHtml(cv.nationality)}</span>`);
  if (cv.visaStatus) contactParts.push(`<span class="cvp-contact-item">${ICON_ID} ${escapeHtml(cv.visaStatus)}</span>`);

  const gulfParts = [];
  if (cv.dob) gulfParts.push(`<span>DOB: ${escapeHtml(cv.dob)}</span>`);
  if (cv.gender) gulfParts.push(`<span>Gender: ${escapeHtml(cv.gender)}</span>`);
  if (cv.maritalStatus) gulfParts.push(`<span>Status: ${escapeHtml(cv.maritalStatus)}</span>`);

  let bodyInner = "";

  bodyInner += `
  <div class="cvp-root">
    <div class="cvp-header" style="background:${t.color};border-bottom:5px solid ${t.accent}">
      <h1 class="cvp-name">${escapeHtml(cv.name || "Your Name")}</h1>
      <p class="cvp-title" style="color:${t.accent}">${escapeHtml(cv.title || "Job Title")}</p>
      <div class="cvp-contact-row">${contactParts.join("")}</div>
      ${gulfParts.length ? `<div class="cvp-gulf-row">${gulfParts.join("")}</div>` : ""}
    </div>
    <div class="cvp-body">`;

  if (cv.summary) {
    bodyInner += sectionHtml(
      "Professional Summary",
      t.accent,
      `<p class="cvp-summary">${escapeHtml(cv.summary)}</p>`,
    );
  }

  if (skillList.length > 0) {
    const chips = skillList
      .map(
        (s) =>
          `<span class="cvp-chip" style="background:${t.accent}18;border:1px solid ${t.accent}44">${escapeHtml(s)}</span>`,
      )
      .join("");
    bodyInner += sectionHtml("Core Skills", t.accent, `<div class="cvp-chips">${chips}</div>`);
  }

  if (experience.some((e) => e && e.company)) {
    let expHtml = "";
    experience
      .filter((e) => e && e.company)
      .forEach((e) => {
        const lines = e.points ? splitExperiencePointsForPreview(e.points) : [];
        let pointsHtml = "";
        lines.forEach((line, j) => {
          const text = j === 0 ? escapeHtml(line) : `• ${escapeHtml(line)}`;
          pointsHtml += `<p class="cvp-exp-line">${text}</p>`;
        });
        expHtml += `
        <div class="cvp-exp-block">
          <div class="cvp-exp-row">
            <strong class="cvp-exp-role">${escapeHtml(e.role || "")}</strong>
            <span class="cvp-exp-period">${escapeHtml(e.period || "")}</span>
          </div>
          <div class="cvp-exp-company" style="color:${t.accent}">${escapeHtml(e.company)}${e.location ? ` · ${escapeHtml(e.location)}` : ""}</div>
          ${pointsHtml ? `<div class="cvp-exp-points">${pointsHtml}</div>` : ""}
        </div>`;
      });
    bodyInner += sectionHtml("Work Experience", t.accent, expHtml);
  }

  if (education.some((e) => e && e.school)) {
    let eduHtml = "";
    education
      .filter((e) => e && e.school)
      .forEach((e) => {
        eduHtml += `
        <div class="cvp-edu-row">
          <div>
            <strong class="cvp-edu-degree">${escapeHtml(e.degree || "")}</strong>
            <div class="cvp-edu-school">${escapeHtml(e.school || "")}</div>
          </div>
          <span class="cvp-edu-year">${escapeHtml(e.year || "")}</span>
        </div>`;
      });
    bodyInner += sectionHtml("Education", t.accent, eduHtml);
  }

  if (certList.length > 0) {
    const chips = certList
      .map(
        (c) =>
          `<span class="cvp-cert-chip" style="background:${t.accent}12;border:1px solid ${t.accent}33">${escapeHtml(c)}</span>`,
      )
      .join("");
    bodyInner += sectionHtml("Certifications", t.accent, `<div class="cvp-chips">${chips}</div>`);
  }

  if (techList.length > 0) {
    const chips = techList
      .map((s) => `<span class="cvp-tech-chip">${escapeHtml(s)}</span>`)
      .join("");
    bodyInner += sectionHtml("Technical Skills", t.accent, `<div class="cvp-chips">${chips}</div>`);
  }

  if (cv.languages) {
    bodyInner += sectionHtml("Languages", t.accent, `<p class="cvp-lang">${escapeHtml(cv.languages)}</p>`);
  }

  if (cv.availability || cv.drivingLicense || cv.willingToRelocate) {
    const bits = [];
    if (cv.availability) bits.push(`<span>${ICON_CAL} ${escapeHtml(cv.availability)}</span>`);
    if (cv.drivingLicense) bits.push(`<span>${ICON_CAR} License: ${escapeHtml(cv.drivingLicense)}</span>`);
    if (cv.willingToRelocate) bits.push(`<span>${ICON_PLANE} Relocate: ${escapeHtml(cv.willingToRelocate)}</span>`);
    bodyInner += sectionHtml("Additional Information", t.accent, `<div class="cvp-extra-row">${bits.join("")}</div>`);
  }

  if (cv.references) {
    bodyInner += sectionHtml(
      "References",
      t.accent,
      `<p class="cvp-refs">${escapeHtml(cv.references)}</p>`,
    );
  }

  bodyInner += `</div></div>`;

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
      font-size: 12px;
      color: #222;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .cvp-pdf-icon {
      width: 11px;
      height: 11px;
      vertical-align: -2px;
      margin-right: 4px;
      display: inline-block;
      color: inherit;
    }
    .cvp-root {
      width: 794px;
      max-width: 100%;
      margin: 0 auto;
      background: #fff;
      border-radius: 10px;
      overflow: hidden;
    }
    .cvp-header {
      padding: 24px 28px 18px;
    }
    .cvp-name {
      font-size: 22px;
      font-weight: 900;
      color: #fff;
      margin: 0 0 3px;
      font-family: Merriweather, Georgia, serif;
    }
    .cvp-title {
      font-weight: 700;
      font-size: 12px;
      margin: 0 0 8px;
      font-family: 'Source Sans 3', sans-serif;
    }
    .cvp-contact-row, .cvp-gulf-row {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      font-size: 10px;
      color: #ccc;
      font-family: 'Source Sans 3', sans-serif;
    }
    .cvp-gulf-row { color: #aaa; margin-top: 5px; }
    .cvp-contact-item { display: inline-flex; align-items: center; }
    .cvp-body { padding: 20px 28px; }
    .cvp-section { margin-bottom: 16px; page-break-inside: avoid; }
    .cvp-section-head {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .cvp-section-title {
      font-size: 10px;
      font-weight: 800;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      font-family: 'Source Sans 3', sans-serif;
    }
    .cvp-section-line { flex: 1; height: 1px; }
    .cvp-summary {
      font-size: 11px;
      line-height: 1.7;
      margin: 0;
      color: #444;
    }
    .cvp-chips { display: flex; flex-wrap: wrap; gap: 5px; }
    .cvp-chip {
      padding: 3px 10px;
      border-radius: 20px;
      font-size: 10px;
      color: #333;
      font-family: Merriweather, Georgia, serif;
    }
    .cvp-cert-chip {
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      color: #333;
      font-family: Merriweather, Georgia, serif;
    }
    .cvp-tech-chip {
      padding: 2px 8px;
      background: #f5f5f5;
      border-radius: 4px;
      font-size: 10px;
      color: #333;
      font-family: Merriweather, Georgia, serif;
    }
    .cvp-exp-block { margin-bottom: 12px; }
    .cvp-exp-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .cvp-exp-role { font-size: 12px; }
    .cvp-exp-period {
      font-size: 10px;
      color: #888;
      white-space: nowrap;
      margin-left: 8px;
      font-family: Merriweather, Georgia, serif;
    }
    .cvp-exp-company {
      font-size: 11px;
      font-weight: 700;
      margin-bottom: 3px;
      font-family: Merriweather, Georgia, serif;
    }
    .cvp-exp-line {
      font-size: 10px;
      color: #555;
      margin: 0;
      line-height: 1.6;
      word-break: normal;
      overflow-wrap: break-word;
      font-family: Merriweather, Georgia, serif;
    }
    .cvp-edu-row {
      margin-bottom: 6px;
      display: flex;
      justify-content: space-between;
    }
    .cvp-edu-degree { font-size: 11px; }
    .cvp-edu-school { font-size: 10px; color: #666; }
    .cvp-edu-year { font-size: 10px; color: #888; font-family: Merriweather, Georgia, serif; }
    .cvp-lang { font-size: 11px; margin: 0; color: #444; }
    .cvp-extra-row {
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
      font-size: 10px;
      color: #555;
      font-family: Merriweather, Georgia, serif;
    }
    .cvp-refs { font-size: 10px; margin: 0; color: #888; font-style: italic; }
  </style>
</head>
<body>
${bodyInner}
</body>
</html>`;
}

module.exports = { buildBannerTemplate1Html };
