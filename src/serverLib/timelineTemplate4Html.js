const { cvWithTemplateCertifications, buildPersonalDetailsEntries } = require("./pdfCommon");

function pdfSlateMinimalist(cv) {
  const BAND_BG = "#F3F4F6";
  const TEXT_PRIMARY = "#1F2937";
  const TEXT_SECONDARY = "#4B5563";
  const BORDER = "#D1D5DB";
  const education = Array.isArray(cv.education) ? cv.education : [];
  const languages = cv.languages
    ? String(cv.languages)
        .split(",")
        .map((l) => l.trim())
        .filter(Boolean)
    : [];
  const personalDetails = buildPersonalDetailsEntries(cv);
  const personalDetailsHtml = personalDetails.length
    ? `<div class="contact-line" style="margin-top: 4px;">${personalDetails
        .map((d) => `${d.label}: ${d.value}`)
        .join(" &nbsp; | &nbsp; ")}</div>`
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
          header { background: ${BAND_BG}; padding: 12mm 15mm; text-align: center; border-bottom: 1px solid ${BORDER}; }
          .header-name { font-size: 28pt; font-weight: 900; color: ${TEXT_PRIMARY}; margin: 0; letter-spacing: -0.5px; text-align: center; }
          .header-title { font-size: 13pt; color: ${TEXT_SECONDARY}; letter-spacing: 3px; text-transform: uppercase; margin-top: 4px; text-align: center; }
          .contact-line { margin-top: 12px; font-size: 9.5pt; font-weight: 500; color: ${TEXT_PRIMARY}; text-align: center; }

          .section-band { background: ${BAND_BG}; padding: 4px 0; text-align: center; margin: 25px 0 15px 0; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; font-size: 11pt; color: ${TEXT_PRIMARY}; }
          .content-pad { padding: 0 15mm; }

          .exp-item { margin-bottom: 22px; page-break-inside: avoid; }
          .exp-grid { display: flex; justify-content: space-between; align-items: flex-start; }
          .exp-left { width: 30%; font-size: 9pt; font-weight: 700; }
          .exp-right { width: 70%; text-align: right; }
          .role { font-weight: 800; font-size: 11pt; color: ${TEXT_PRIMARY}; }
          .company { font-style: italic; font-size: 10pt; }

          .bullet { font-size: 9.5pt; line-height: 1.5; margin-bottom: 4px; display: flex; }
          .bullet-point { color: ${BORDER}; margin-right: 10px; }

          .skills-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px 20px; font-size: 9.5pt; color: ${TEXT_PRIMARY}; }
        </style>
      </head>
      <body>
        <header>
          <div class="header-name">${cv.name}</div>
          <div class="header-title">${cv.title}</div>
          <div class="contact-line">
            ${[cv.email, cv.phone, cv.linkedin, cv.location].filter(Boolean).join(" &nbsp; | &nbsp; ")}
          </div>
          ${personalDetailsHtml}
        </header>

        <div class="content-pad">
          <div class="section-band">Professional Profile</div>
          <p style="text-align: center; font-size: 10pt; line-height: 1.6; margin: 0;">${cv.summary}</p>
          
          <div class="section-band">Work History</div>
          ${(cv.experience || []).map((e) => `
            <div class="exp-item">
              <div class="exp-grid">
                <div class="exp-left">${e.period}<br><span style="font-weight:400; font-size:8.5pt;">${e.location}</span></div>
                <div class="exp-right">
                  <div class="role">${e.role}</div>
                  <div class="company">${e.company}</div>
                </div>
              </div>
              <div style="margin-top: 8px;">
                ${(e.points || "").split('\\n').filter(Boolean).map((p) => `
                  <div class="bullet">
                    <span class="bullet-point">•</span>
                    <span>${p.replace(/^•\\s*/, "")}</span>
                  </div>
                `).join("")}
              </div>
            </div>
          `).join("")}

          <div class="section-band">Core Competencies</div>
          <div class="skills-grid">
            ${(cv.skills || "").split(",").map((s) => `
              <div style="display:flex; align-items:center;">
                <span style="color:${BORDER}; margin-right:8px;">•</span> ${s.trim()}
              </div>
            `).join("")}
          </div>

          ${
            education.some((e) => e && (e.school || e.degree))
              ? `
          <div class="section-band">Education</div>
          ${education
            .filter((e) => e && (e.school || e.degree))
            .map(
              (edu) => `
            <div class="exp-item">
              <div class="exp-grid">
                <div class="exp-left">${edu.year || ""}<br><span style="font-weight:400; font-size:8.5pt;">${edu.school || ""}</span></div>
                <div class="exp-right">
                  <div class="role">${edu.degree || ""}</div>
                </div>
              </div>
            </div>
          `,
            )
            .join("")}
          `
              : ""
          }

          ${
            languages.length
              ? `
          <div class="section-band">Languages</div>
          <p style="text-align: center; font-size: 10pt; line-height: 1.6; margin: 0; color: ${TEXT_PRIMARY};">${languages.join(" · ")}</p>
          `
              : ""
          }
        </div>
      </body>
    </html>
  `;
}

function buildTimelineTemplate4Html(rawCv) {
  const cv = cvWithTemplateCertifications(rawCv || {});
  return pdfSlateMinimalist(cv);
}

module.exports = { buildTimelineTemplate4Html };
