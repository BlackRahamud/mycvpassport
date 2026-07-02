const { cvWithTemplateCertifications, buildPersonalDetailsEntries } = require("./pdfCommon");

function pdfMinimalistPurple(cv) {
  const DEEP_PURPLE = "#3730A3";
  const LIGHT_PURPLE = "#EEF2FF";
  const MAIN_TEXT = "#111827";
  const GREY = "#6B7280";

  const isPlaceholder = !cv.name || String(cv.name).trim() === "";
  const textColor = isPlaceholder ? "#D1D5DB" : MAIN_TEXT;
  const accentColor = isPlaceholder ? "#D1D5DB" : DEEP_PURPLE;
  const greyColor = isPlaceholder ? "#E5E7EB" : GREY;
  const barBg = isPlaceholder ? "#F9FAFB" : LIGHT_PURPLE;

  const experience = Array.isArray(cv.experience) ? cv.experience : [];
  const education = Array.isArray(cv.education) ? cv.education : [];
  const skills = cv.skills ? String(cv.skills).split(",").map((s) => s.trim()).filter(Boolean) : [];
  const languages = cv.languages ? String(cv.languages).split(",").map((l) => l.trim()).filter(Boolean) : [];

  const contactParts = [cv.email, cv.phone, cv.linkedin, cv.location].filter(Boolean);

  const personalDetails = buildPersonalDetailsEntries(cv);
  const personalDetailsHtml = personalDetails.length
    ? `<div class="contact" style="margin-top: 4px;">${personalDetails
        .map((d) => `${d.label}: ${d.value}`)
        .join(" | ")}</div>`
    : "";

  return `
    <html>
      <head>
        <style>
          @page { size: A4; margin: 0; }
          body {
            margin: 0;
            padding: 15mm 15mm 40px 15mm;
            font-family: Arial, sans-serif;
            color: ${textColor};
            background: #fff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            line-height: 1.5;
          }

          .header { margin-bottom: 6mm; }
          .head-top { display: flex; align-items: baseline; gap: 12px; margin-bottom: 6px; }
          .name { font-size: 24pt; font-weight: bold; margin: 0; color: ${textColor}; }
          .title { font-size: 14pt; font-style: italic; color: ${greyColor}; }
          .contact { display: flex; flex-wrap: wrap; column-gap: 12px; font-size: 9.5pt; color: ${greyColor}; }

          .sect-title {
            background: ${barBg};
            width: 100%;
            padding: 8px 0;
            text-align: center;
            margin-top: 8mm;
            margin-bottom: 5mm;
            page-break-after: avoid;
          }
          .sect-title h2 {
            font-size: 10pt;
            font-weight: bold;
            text-transform: uppercase;
            color: ${accentColor};
            margin: 0;
            letter-spacing: 1.5px;
          }

          .exp-item { margin-bottom: 6mm; page-break-inside: avoid; }
          .exp-head { display: flex; justify-content: space-between; align-items: baseline; }
          .exp-main { font-size: 11pt; }
          .exp-main .role { font-weight: bold; }
          .exp-main .company { font-style: italic; color: ${greyColor}; }
          .exp-period { font-size: 9.5pt; font-weight: bold; color: ${textColor}; }
          .exp-loc { text-align: right; font-size: 9pt; color: ${greyColor}; margin-bottom: 2mm; }
          .bullet { font-size: 10pt; display: flex; gap: 10px; padding-left: 5mm; margin-bottom: 1mm; color: ${textColor}; }

          .skills { font-size: 10pt; color: ${textColor}; line-height: 1.8; }
          .lang-grid { display: grid; grid-template-columns: 1fr 1fr; column-gap: 20mm; row-gap: 2mm; font-size: 10pt; }
          .edu-item { margin-bottom: 4mm; page-break-inside: avoid; }
          .edu-head { display: flex; justify-content: space-between; align-items: baseline; }
          .edu-degree { font-size: 11pt; font-weight: bold; }
          .edu-year { font-size: 9.5pt; font-weight: bold; }
          .edu-school { font-size: 10pt; font-style: italic; color: ${greyColor}; }
        </style>
      </head>
      <body>
        <header class="header">
          <div class="head-top">
            <h1 class="name">${cv.name || "YOUR NAME"}</h1>
            <span class="title">${cv.title || "Professional Title"}</span>
          </div>
          <div class="contact">${contactParts.join(" | ")}</div>
          ${personalDetailsHtml}
        </header>

        ${
          cv.summary || isPlaceholder
            ? `
          <section style="page-break-inside: avoid;">
            <div class="sect-title"><h2>Profile</h2></div>
            <p style="font-size:10.5pt;margin:0;text-align:justify;color:${textColor};">
              ${cv.summary || "Enter your professional summary here..."}
            </p>
          </section>
        `
            : ""
        }

        ${
          experience.length > 0 || isPlaceholder
            ? `
          <section>
            <div class="sect-title"><h2>Experience</h2></div>
            ${experience
              .map(
                (exp) => `
              <div class="exp-item">
                <div class="exp-head">
                  <div class="exp-main">
                    <span class="role">${exp.role || "Role"}</span>
                    <span class="company"> — ${exp.company || "Company"}</span>
                  </div>
                  <span class="exp-period">${exp.period || ""}</span>
                </div>
                <div class="exp-loc">${exp.location || ""}</div>
                ${(exp.points || "")
                  .split("\\n")
                  .filter(Boolean)
                  .map(
                    (p) => `
                  <div class="bullet"><span>•</span><span>${String(p).replace(/^•\\s*/, "")}</span></div>
                `,
                  )
                  .join("")}
              </div>
            `,
              )
              .join("")}
          </section>
        `
            : ""
        }

        ${
          skills.length > 0 || isPlaceholder
            ? `
          <section style="page-break-inside: avoid;">
            <div class="sect-title"><h2>Skills</h2></div>
            <div class="skills">${skills.join("  •  ")}</div>
          </section>
        `
            : ""
        }

        ${
          languages.length > 0
            ? `
          <section style="page-break-inside: avoid;">
            <div class="sect-title"><h2>Languages</h2></div>
            <div class="lang-grid">
              ${languages
                .map((l) => {
                  const [name, level] = l.split("-");
                  return `<div><span style="font-weight:bold;">${(name || "").trim()}</span>${
                    level ? `<span style="color:${greyColor};"> — ${level.trim()}</span>` : ""
                  }</div>`;
                })
                .join("")}
            </div>
          </section>
        `
            : ""
        }

        ${
          education.length > 0
            ? `
          <section>
            <div class="sect-title"><h2>Education</h2></div>
            ${education
              .map(
                (edu) => `
              <div class="edu-item">
                <div class="edu-head">
                  <span class="edu-degree">${edu.degree || ""}</span>
                  <span class="edu-year">${edu.year || ""}</span>
                </div>
                <div class="edu-school">${edu.school || ""}</div>
              </div>
            `,
              )
              .join("")}
          </section>
        `
            : ""
        }
      </body>
    </html>
  `;
}

function buildHospitalityTemplate9Html(rawCv) {
  const cv = cvWithTemplateCertifications(rawCv || {});
  return pdfMinimalistPurple(cv);
}

module.exports = { buildHospitalityTemplate9Html };
