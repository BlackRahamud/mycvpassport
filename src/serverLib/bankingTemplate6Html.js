const { cvWithTemplateCertifications, buildPersonalDetailsEntries } = require("./pdfCommon");

function pdfBankingFinance(cv) {
  const ACCENT = "#0369A1"; // Rich Teal-Blue
  const TEXT_DARK = "#1a1a2e";
  const GREY = "#6b7280";
  const BODY_TEXT = "#333333";

  const isPlaceholder = !cv.name || String(cv.name).trim() === "";
  const textColor = isPlaceholder ? "#D1D5DB" : TEXT_DARK;
  const subTextColor = isPlaceholder ? "#D1D5DB" : GREY;
  const accentColor = isPlaceholder ? "#D1D5DB" : ACCENT;

  const experience = Array.isArray(cv.experience) ? cv.experience : [];
  const education = Array.isArray(cv.education) ? cv.education : [];
  const skills = cv.skills ? cv.skills.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const languages = cv.languages
    ? String(cv.languages)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  const contactParts = [];
  if (cv.email) contactParts.push(cv.email);
  if (cv.phone) contactParts.push(cv.phone);
  if (cv.location) contactParts.push(cv.location);
  if (cv.linkedin || cv.linkedIn) contactParts.push("LinkedIn");

  const personalDetails = buildPersonalDetailsEntries(cv);
  const personalDetailsHtml = personalDetails.length
    ? `<div class="contact" style="margin-top: 1.5mm;">${personalDetails
        .map((d) => `${d.label}: ${d.value}`)
        .join("  •  ")}</div>`
    : "";

  return `
    <html>
      <head>
        <style>
          @page { size: A4; margin: 0; }
          body {
            margin: 0;
            padding: 15mm 18mm 40px 18mm;
            font-family: Arial, sans-serif;
            color: ${textColor};
            background: #ffffff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            line-height: 1.4;
          }

          .header { margin-bottom: 10mm; }
          .name { font-size: 24pt; font-weight: bold; margin: 0; color: ${textColor}; }
          .title { font-size: 12pt; font-weight: bold; margin-top: 1mm; color: ${textColor}; }
          .contact { font-size: 9pt; color: ${subTextColor}; margin-top: 3mm; }

          .section-title {
            margin-top: 8mm;
            margin-bottom: 5mm;
            page-break-after: avoid;
          }
          .section-title span {
            font-size: 11pt;
            font-weight: bold;
            text-transform: uppercase;
            color: ${textColor};
            display: inline-block;
            border-bottom: 2.5px solid ${accentColor};
            padding-bottom: 2px;
            letter-spacing: 0.5px;
          }

          .exp-row {
            display: flex;
            gap: 10mm;
            margin-bottom: 6mm;
            page-break-inside: avoid;
          }
          .exp-left {
            width: 35mm;
            flex-shrink: 0;
            font-size: 9pt;
            color: ${subTextColor};
            text-align: left;
          }
          .exp-right { flex: 1; }
          .exp-company { font-size: 11pt; font-weight: bold; color: ${accentColor}; }
          .exp-role { font-size: 10pt; font-style: italic; margin-bottom: 2mm; color: ${textColor}; }
          .bullet { font-size: 10pt; display: flex; gap: 6px; margin-bottom: 1mm; color: ${BODY_TEXT}; }

          .skills { font-size: 10pt; color: ${BODY_TEXT}; margin: 0; }
          .edu-row {
            display: flex;
            gap: 10mm;
            margin-bottom: 4mm;
            page-break-inside: avoid;
          }
          .edu-left { width: 35mm; flex-shrink: 0; font-size: 9pt; color: ${subTextColor}; }
          .edu-right { flex: 1; }
          .edu-school { font-size: 11pt; font-weight: bold; color: ${textColor}; }
          .edu-degree { font-size: 10pt; color: ${BODY_TEXT}; }

          .skeleton-box { background: #D1D5DB; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="name">${cv.name || "Full Name"}</h1>
          <div class="title">${cv.title || "Banking & Finance Professional"}</div>
          <div class="contact">
            ${isPlaceholder ? "email@address.com  •  +00 000 000  •  Location" : contactParts.join("  •  ")}
          </div>
          ${personalDetailsHtml}
        </div>

        ${
          cv.summary || isPlaceholder
            ? `
          <div class="section-title"><span>Professional Profile</span></div>
          <p style="font-size: 10pt; margin: 0; text-align: justify; color: ${isPlaceholder ? "#D1D5DB" : BODY_TEXT};">${
            cv.summary || "Strategically-minded professional with 10+ years of experience..."
          }</p>
        `
            : ""
        }

        ${
          experience.length > 0 || isPlaceholder
            ? `
          <div class="section-title"><span>Professional Experience</span></div>
          ${
            isPlaceholder
              ? `
            <div class="exp-row">
              <div class="exp-left">
                <div class="skeleton-box" style="height:12px; width:70%; margin-bottom:6px;"></div>
                <div class="skeleton-box" style="height:10px; width:55%;"></div>
              </div>
              <div class="exp-right">
                <div class="skeleton-box" style="height:12px; width:60%; margin-bottom:6px;"></div>
                <div class="skeleton-box" style="height:10px; width:45%; margin-bottom:10px;"></div>
                <div class="skeleton-box" style="height:10px; width:90%; margin-bottom:5px;"></div>
                <div class="skeleton-box" style="height:10px; width:85%;"></div>
              </div>
            </div>
          `
              : experience
                  .map(
                    (exp) => `
            <div class="exp-row">
              <div class="exp-left">
                <div style="font-weight:bold;">${exp.period || ""}</div>
                <div>${exp.location || ""}</div>
              </div>
              <div class="exp-right">
                <div class="exp-company">${exp.company || ""}</div>
                <div class="exp-role">${exp.role || ""}</div>
                ${
                  exp.points
                    ? String(exp.points)
                        .split("\\n")
                        .filter(Boolean)
                        .map(
                          (p) => `
                  <div class="bullet"><span>•</span><span>${String(p).replace(/^•\\s*/, "")}</span></div>
                `,
                        )
                        .join("")
                    : ""
                }
              </div>
            </div>
          `,
                  )
                  .join("")
          }
        `
            : ""
        }

        ${
          skills.length > 0 || isPlaceholder
            ? `
          <div class="section-title"><span>Expertise & Skills</span></div>
          <p class="skills" style="color: ${isPlaceholder ? "#D1D5DB" : BODY_TEXT};">${
            isPlaceholder ? "Skill One • Skill Two • Skill Three" : skills.join(" • ")
          }</p>
        `
            : ""
        }

        ${
          education.length > 0 || isPlaceholder
            ? `
          <div class="section-title"><span>Education</span></div>
          ${
            isPlaceholder
              ? `
            <div class="edu-row">
              <div class="edu-left"><div class="skeleton-box" style="height:10px; width:55%;"></div></div>
              <div class="edu-right">
                <div class="skeleton-box" style="height:12px; width:60%; margin-bottom:6px;"></div>
                <div class="skeleton-box" style="height:10px; width:75%;"></div>
              </div>
            </div>
          `
              : education
                  .map(
                    (edu) => `
            <div class="edu-row">
              <div class="edu-left"><div style="font-weight:bold;">${edu.year || ""}</div></div>
              <div class="edu-right">
                <div class="edu-school">${edu.school || ""}</div>
                <div class="edu-degree">${edu.degree || ""}</div>
              </div>
            </div>
          `,
                  )
                  .join("")
          }
        `
            : ""
        }

        ${
          languages.length > 0 || isPlaceholder
            ? `
          <div class="section-title"><span>Languages</span></div>
          <p class="skills" style="color: ${isPlaceholder ? "#D1D5DB" : BODY_TEXT};">${
            isPlaceholder ? "English • Hindi" : languages.join(" • ")
          }</p>
        `
            : ""
        }
      </body>
    </html>
  `;
}

function buildBankingTemplate6Html(rawCv) {
  const cv = cvWithTemplateCertifications(rawCv || {});
  return pdfBankingFinance(cv);
}

module.exports = { buildBankingTemplate6Html };
