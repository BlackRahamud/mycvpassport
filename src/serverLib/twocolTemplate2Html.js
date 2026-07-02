const { cvWithTemplateCertifications, buildPersonalDetailsEntries } = require("./pdfCommon");

function pdfSandstoneExecutive(cv) {
  const isEmpty = !cv.name || cv.name.trim() === "";
  const skills = cv.skills ? cv.skills.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const personalDetails = buildPersonalDetailsEntries(cv);
  const personalDetailsHtml = personalDetails.length
    ? `<div class="contact" style="margin-top: 4px;">${personalDetails
        .map((d) => `${d.label}: ${d.value}`)
        .join(" &nbsp; • &nbsp; ")}</div>`
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
            color: #374151;
            background: #FDFBF7;
            -webkit-print-color-adjust: exact;
          }
          header { 
            margin-bottom: 8mm; 
            border-left: 4px solid ${isEmpty ? "#D1D5DB" : "#064E3B"}; 
            padding-left: 15px; 
          }
          .name { font-size: 26pt; font-weight: 900; color: ${isEmpty ? "#D1D5DB" : "#064E3B"}; margin: 0; line-height: 1; }
          .title { font-size: 13pt; font-weight: bold; color: ${isEmpty ? "#D1D5DB" : "#B45309"}; margin-top: 4px; text-transform: uppercase; }
          .contact { font-size: 9pt; color: #374151; margin-top: 8px; }

          .section-title-row {
            display: flex;
            align-items: center;
            margin-top: 8mm;
            margin-bottom: 4mm;
            page-break-after: avoid;
          }
          .section-label {
            font-size: 13pt;
            font-weight: bold;
            color: ${isEmpty ? "#D1D5DB" : "#064E3B"};
            text-transform: uppercase;
            letter-spacing: 0.05em;
            white-space: nowrap;
            margin-right: 10px;
          }
          .gold-line { flex: 1; height: 1.5px; background-color: ${isEmpty ? "#D1D5DB" : "#B45309"}; opacity: 0.6; }

          .entry { margin-bottom: 5mm; page-break-inside: avoid; }
          .entry-top { display: flex; justify-content: space-between; align-items: baseline; }
          .role { font-size: 11pt; font-weight: bold; color: #064E3B; }
          .period { font-size: 9.5pt; font-weight: bold; color: #B45309; }
          .company { font-size: 10pt; font-weight: bold; font-style: italic; margin-bottom: 2mm; }
          .bullet { font-size: 9.5pt; line-height: 1.4; margin: 0 0 1.5mm 0; padding-left: 4mm; }
          
          .skeleton-box { background: #D1D5DB; margin-bottom: 5px; }
        </style>
      </head>
      <body>
        <header>
          <div class="name">${cv.name || "JORDAN A. BLAKE"}</div>
          <div class="title">${cv.title || "SENIOR PROJECT MANAGER"}</div>
          <div class="contact">
            ${isEmpty ? 'jordan.b@email.com • +01 123 456 789 • Los Angeles' : [cv.email, cv.phone, cv.linkedin, cv.location].filter(Boolean).join(" &nbsp; • &nbsp; ")}
          </div>
          ${personalDetailsHtml}
        </header>

        <div class="section-title-row">
          <span class="section-label">Executive Summary</span><div class="gold-line"></div>
        </div>
        <div style="font-size: 10pt; line-height: 1.5; color: ${isEmpty ? "#D1D5DB" : "inherit"}">
          ${cv.summary || "Summary placeholder..."}
        </div>

        <div class="section-title-row">
          <span class="section-label">Work History</span><div class="gold-line"></div>
        </div>
        ${
          isEmpty
            ? '<div class="skeleton-box" style="height:40px; width:100%"></div>'
            : (cv.experience || [])
                .filter((e) => e.company)
                .map(
                  (e) => `
          <div class="entry">
            <div class="entry-top">
              <span class="role">${e.role}</span>
              <span class="period">${e.period}</span>
            </div>
            <div class="company">${e.company} ${e.location ? `| ${e.location}` : ""}</div>
            ${(e.points || "").split("\n").filter(Boolean).map((p) => `
              <div class="bullet">• ${p.trim().replace(/^•\\s*/, "")}</div>
            `).join("")}
          </div>
        `,
                )
                .join("")
        }

        <div class="section-title-row">
          <span class="section-label">Expertise</span><div class="gold-line"></div>
        </div>
        <div style="font-size: 10pt; font-weight: bold; color: ${isEmpty ? "#D1D5DB" : "inherit"}">
          Core Competencies: ${skills.length > 0 ? skills.join(" • ") : "..."}
        </div>

        <div class="section-title-row">
          <span class="section-label">Academic Background</span><div class="gold-line"></div>
        </div>
        ${(cv.education || [])
          .filter((edu) => edu.school)
          .map(
            (edu) => `
          <div class="entry">
            <div class="entry-top">
              <span class="role">${edu.degree}</span>
              <span class="period">${edu.year}</span>
            </div>
            <div style="font-size: 10pt;">${edu.school}</div>
          </div>
        `,
          )
          .join("")}

        ${
          cv.languages && String(cv.languages).trim()
            ? `
        <div class="section-title-row">
          <span class="section-label">Languages</span><div class="gold-line"></div>
        </div>
        <div style="font-size: 10pt; line-height: 1.5; color: ${isEmpty ? "#D1D5DB" : "inherit"}">
          ${String(cv.languages)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .join(" · ")}
        </div>
        `
            : ""
        }
      </body>
    </html>
  `;
}

function buildTwocolTemplate2Html(rawCv) {
  const cv = cvWithTemplateCertifications(rawCv || {});
  return pdfSandstoneExecutive(cv);
}

module.exports = { buildTwocolTemplate2Html };
