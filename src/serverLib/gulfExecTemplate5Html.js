const { cvWithTemplateCertifications, buildPersonalDetailsEntries } = require("./pdfCommon");

function pdfEditorialDark(cv) {
  const NAVY_DARK = "#0F172A";
  const TEXT_PRIMARY = "#1F2937";
  const TEXT_SECONDARY = "#4B5563";
  const ACCENT = "#334155";
  const BORDER = "#D1D5DB";
  const personalDetails = buildPersonalDetailsEntries(cv);
  const personalDetailsHtml = personalDetails.length
    ? `<div class="contact-row" style="margin-top: 6px;">${personalDetails
        .map((d) => `<span>${d.label}: ${d.value}</span>`)
        .join("")}</div>`
    : "";

  return `
    <html>
      <head>
        <style>
          @page { size: A4; margin: 0; }
          body { 
            margin: 0; 
            padding: 0 0 40px 0; 
            font-family: Arial, sans-serif; 
            color: ${TEXT_SECONDARY}; 
            background: #fff; 
            -webkit-print-color-adjust: exact; 
          }
          header { 
            background: ${NAVY_DARK}; 
            padding: 12mm 15mm; 
            color: #ffffff;
          }
          .header-name { font-size: 26pt; font-weight: 900; margin: 0; letter-spacing: -0.5px; color: #ffffff; }
          .header-title { font-size: 12pt; color: #94A3B8; letter-spacing: 2px; text-transform: uppercase; margin-top: 2px; }
          .contact-row { margin-top: 15px; font-size: 9pt; display: flex; gap: 20px; opacity: 0.9; }

          .section-title { font-size: 13pt; font-weight: 800; color: ${NAVY_DARK}; text-transform: uppercase; letter-spacing: 1px; margin-top: 30px; }
          .section-underline { width: 35px; height: 4px; background-color: ${NAVY_DARK}; margin-top: 4px; margin-bottom: 15px; }
          
          .content-pad { padding: 0 15mm; }

          .exp-item { margin-bottom: 20px; page-break-inside: avoid; }
          .exp-header { display: flex; justify-content: space-between; align-items: baseline; }
          .company { font-weight: 800; font-size: 11pt; color: ${NAVY_DARK}; }
          .period { font-size: 9pt; font-weight: 600; color: ${TEXT_SECONDARY}; }
          .role { font-style: italic; font-size: 10pt; color: ${ACCENT}; margin-top: 1px; }
          
          .bullet { font-size: 9.5pt; line-height: 1.5; margin-bottom: 4px; display: flex; color: ${TEXT_PRIMARY}; }
          .bullet-point { color: ${BORDER}; margin-right: 8px; }
          
          .skills-container { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 5px; }
          .skill-pill { 
            background: ${NAVY_DARK}; 
            color: #ffffff; 
            font-size: 8.5pt; 
            padding: 3px 10px; 
            border-radius: 4px; 
            font-weight: 600; 
            white-space: nowrap;
          }

          .edu-item { margin-bottom: 15px; page-break-inside: avoid; }
        </style>
      </head>
      <body>
        <header>
          <div class="header-name">${cv.name || "JONATHAN DOE"}</div>
          <div class="header-title">${cv.title || "PROFESSIONAL"}</div>
          <div class="contact-row">
            ${cv.email ? `<span>${cv.email}</span>` : ""}
            ${cv.phone ? `<span>${cv.phone}</span>` : ""}
            ${cv.linkedin ? `<span>${cv.linkedin}</span>` : ""}
            ${cv.location ? `<span>${cv.location}</span>` : ""}
          </div>
          ${personalDetailsHtml}
        </header>

        <div class="content-pad">
          ${
            cv.summary
              ? `
            <div class="section-title">Profile</div>
            <div class="section-underline"></div>
            <p style="font-size: 10pt; line-height: 1.6; margin: 0; color: ${TEXT_PRIMARY};">${cv.summary}</p>
          `
              : ""
          }
          
          <div class="section-title">Experience</div>
          <div class="section-underline"></div>
          ${(cv.experience || [])
            .filter((e) => e && e.company)
            .map(
              (e) => `
            <div class="exp-item">
              <div class="exp-header">
                <div class="company">${e.company}</div>
                <div class="period">${e.period || ""}</div>
              </div>
              <div class="role">${e.role || ""}</div>
              <div style="margin-top: 8px;">
                ${
                  e.points
                    ? String(e.points)
                        .split("\\n")
                        .filter(Boolean)
                        .map(
                          (p) => `
                  <div class="bullet">
                    <span class="bullet-point">•</span>
                    <span>${String(p).replace(/^•\\s*/, "")}</span>
                  </div>
                `,
                        )
                        .join("")
                    : ""
                }
              </div>
            </div>
          `,
            )
            .join("")}

          <div class="section-title">Expertise</div>
          <div class="section-underline"></div>
          <div class="skills-container">
            ${(cv.skills || "")
              .split(",")
              .map(
                (s) => `
              <div class="skill-pill">${String(s).trim()}</div>
            `,
              )
              .join("")}
          </div>

          ${
            cv.education && cv.education.length > 0
              ? `
            <div class="section-title">Education</div>
            <div class="section-underline"></div>
            ${(cv.education || [])
              .filter((edu) => edu && edu.school)
              .map(
                (edu) => `
              <div class="edu-item">
                <div class="exp-header">
                  <div style="font-weight: 700; color: ${NAVY_DARK}; font-size: 10pt;">${edu.school}</div>
                  <div style="font-size: 9pt;">${edu.year || ""}</div>
                </div>
                <div style="font-size: 9.5pt;">${edu.degree || ""}</div>
              </div>
            `,
              )
              .join("")}
          `
              : ""
          }
          ${
            cv.languages && String(cv.languages).trim()
              ? `
            <div class="section-title">Languages</div>
            <div class="section-underline"></div>
            <p style="font-size: 10pt; line-height: 1.6; margin: 0; color: ${TEXT_PRIMARY};">
              ${String(cv.languages)
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
                .join(" · ")}
            </p>
          `
              : ""
          }
        </div>
      </body>
    </html>
  `;
}

function buildGulfExecTemplate5Html(rawCv) {
  const cv = cvWithTemplateCertifications(rawCv || {});
  return pdfEditorialDark(cv);
}

module.exports = { buildGulfExecTemplate5Html };
