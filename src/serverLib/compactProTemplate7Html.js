const { cvWithTemplateCertifications, buildPersonalDetailsEntries } = require("./pdfCommon");

function pdfCompactPro(cv) {
  const NAVY = "#1E3A5F";
  const ACCENT_BG = "#DBEAFE"; // Soft blue-grey band
  const BODY_TEXT = "#3D3D3D";
  const GREY_TEXT = "#6B7280";

  const isPlaceholder = !cv.name || String(cv.name).trim() === "";
  const textColor = isPlaceholder ? "#D1D5DB" : BODY_TEXT;
  const navyColor = isPlaceholder ? "#D1D5DB" : NAVY;
  const greyColor = isPlaceholder ? "#D1D5DB" : GREY_TEXT;
  const headerBg = isPlaceholder ? "#F3F4F6" : ACCENT_BG;

  const experience = Array.isArray(cv.experience) ? cv.experience : [];
  const education = Array.isArray(cv.education) ? cv.education : [];
  const skills = cv.skills ? String(cv.skills).split(",").map((s) => s.trim()).filter(Boolean) : [];
  const languages = cv.languages ? String(cv.languages).split(",").map((l) => l.trim()).filter(Boolean) : [];

  const contactGrid = [
    cv.email ? `<div>${cv.email}</div>` : "<div></div>",
    cv.phone ? `<div>${cv.phone}</div>` : "<div></div>",
    cv.location ? `<div>${cv.location}</div>` : "<div></div>",
    cv.linkedin || cv.linkedIn ? `<div>LinkedIn Profile</div>` : "<div></div>",
  ].join("");

  const personalDetails = buildPersonalDetailsEntries(cv);
  const personalDetailsHtml = personalDetails.length
    ? `<div style="margin-top: 4px; font-size: 9pt; color: ${greyColor}; font-weight: bold;">${personalDetails
        .map((d) => `${d.label}: ${d.value}`)
        .join(" • ")}</div>`
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
            color: ${textColor};
            background: #fff;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            line-height: 1.5;
          }
          .wrap { width: 794px; max-width: 100%; margin: 0 auto; background: #fff; }
          .header {
            background: ${headerBg};
            padding: 10mm 15mm 8mm;
            margin-bottom: 6mm;
          }
          .head-top { display: flex; align-items: baseline; gap: 12px; margin-bottom: 3mm; }
          .name { font-size: 24pt; font-weight: bold; margin: 0; color: ${navyColor}; }
          .title { font-size: 14pt; font-weight: 300; color: ${navyColor}; opacity: 0.8; }
          .contact {
            display: grid;
            grid-template-columns: 1fr 1.5fr;
            gap: 4px 20px;
            font-size: 9pt;
            color: ${greyColor};
            font-weight: bold;
          }

          .content { padding: 0 15mm; }

          .sect { display: flex; align-items: center; gap: 8px; margin-top: 8mm; margin-bottom: 4mm; page-break-after: avoid; }
          .sect .sq { color: ${navyColor}; font-size: 10pt; }
          .sect h2 { font-size: 11pt; font-weight: bold; text-transform: uppercase; color: ${navyColor}; margin: 0; letter-spacing: 0.5px; }

          .exp-item { margin-bottom: 6mm; page-break-inside: avoid; }
          .exp-head { display: flex; justify-content: space-between; align-items: baseline; }
          .exp-role { font-size: 11pt; font-weight: bold; color: ${navyColor}; }
          .exp-period { font-size: 9.5pt; font-weight: bold; color: ${greyColor}; }
          .exp-loc { font-size: 9pt; color: ${greyColor}; margin-bottom: 2mm; font-style: italic; }
          .bullet { font-size: 10pt; display: flex; gap: 8px; margin-bottom: 1mm; color: ${BODY_TEXT}; }
          .bullet .dot { color: ${navyColor}; }

          .cols { display: flex; gap: 15mm; margin-top: 4mm; page-break-inside: avoid; }
          .col { flex: 1; }
          .list { font-size: 10pt; color: ${BODY_TEXT}; }
          .list div { margin-bottom: 1mm; }

          .edu-item { margin-bottom: 4mm; page-break-inside: avoid; }
          .edu-head { display: flex; justify-content: space-between; align-items: baseline; }
          .edu-degree { font-size: 11pt; font-weight: bold; }
          .edu-year { font-size: 9.5pt; font-weight: bold; color: ${greyColor}; }
          .edu-school { font-size: 10pt; color: ${navyColor}; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="header">
            <div class="head-top">
              <h1 class="name">${cv.name || "Full Name"}</h1>
              <div class="title">${cv.title || "Job Title"}</div>
            </div>
            <div class="contact">${contactGrid}</div>
            ${personalDetailsHtml}
          </div>

          <div class="content">
            ${
              cv.summary
                ? `
              <div class="sect"><span class="sq">■</span><h2>Professional Profile</h2></div>
              <p style="font-size:10pt;margin:0;text-align:justify;color:${BODY_TEXT};">${cv.summary}</p>
            `
                : ""
            }

            ${
              experience.length > 0 || isPlaceholder
                ? `
              <div class="sect"><span class="sq">■</span><h2>Experience</h2></div>
              ${(experience || []).map((exp) => `
                <div class="exp-item">
                  <div class="exp-head">
                    <span class="exp-role">${exp.role || ""} <span style="color:#000;font-weight:bold;">— ${exp.company || ""}</span></span>
                    <span class="exp-period">${exp.period || ""}</span>
                  </div>
                  <div class="exp-loc">${exp.location || ""}</div>
                  ${(exp.points || "").split("\\n").filter(Boolean).map((p) => `
                    <div class="bullet"><span class="dot">•</span><span>${String(p).replace(/^•\\s*/, "")}</span></div>
                  `).join("")}
                </div>
              `).join("")}
            `
                : ""
            }

            <div class="cols">
              ${
                skills.length > 0
                  ? `
                <div class="col">
                  <div class="sect"><span class="sq">■</span><h2>Skills</h2></div>
                  <div class="list">
                    ${skills.map((s) => `<div>• ${s}</div>`).join("")}
                  </div>
                </div>
              `
                  : ""
              }
              ${
                languages.length > 0
                  ? `
                <div class="col">
                  <div class="sect"><span class="sq">■</span><h2>Languages</h2></div>
                  <div class="list">
                    ${languages.map((l) => `<div>• ${l}</div>`).join("")}
                  </div>
                </div>
              `
                  : ""
              }
            </div>

            ${
              education.length > 0
                ? `
              <div class="sect"><span class="sq">■</span><h2>Education</h2></div>
              ${education.map((edu) => `
                <div class="edu-item">
                  <div class="edu-head">
                    <span class="edu-degree">${edu.degree || ""}</span>
                    <span class="edu-year">${edu.year || ""}</span>
                  </div>
                  <div class="edu-school">${edu.school || ""}</div>
                </div>
              `).join("")}
            `
                : ""
            }
          </div>
        </div>
      </body>
    </html>
  `;
}

function buildCompactProTemplate7Html(rawCv) {
  const cv = cvWithTemplateCertifications(rawCv || {});
  return pdfCompactPro(cv);
}

module.exports = { buildCompactProTemplate7Html };
