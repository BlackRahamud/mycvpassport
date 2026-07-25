const {
  cvWithTemplateCertifications,
  buildPersonalDetailsEntries,
  technicalSkillsGroups,
  splitExperiencePointsForPreview,
} = require("./pdfCommon");

function pdfExecutiveModern(cv) {
  const isEmpty = !cv.name || cv.name.trim() === "";
  const PRIMARY = "#1F2937";
  const ACCENT = "#475569";
  const BORDER = "#E5E7EB";
  const expRows = (Array.isArray(cv.experience) ? cv.experience : []).filter((e) => e && e.company);
  const eduRows = (Array.isArray(cv.education) ? cv.education : []).filter((edu) => edu && edu.school);
  const skillsCells = (cv.skills || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const techGroups = technicalSkillsGroups(cv.technicalSkills);
  const certList = cv.certifications
    ? String(cv.certifications).split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  const projectLines = splitExperiencePointsForPreview(cv.projects);
  const publicationLines = splitExperiencePointsForPreview(cv.publications);
  const volunteerLines = splitExperiencePointsForPreview(cv.volunteerWork);
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
            padding: 15mm 20mm 40px 20mm;
            font-family: Arial, sans-serif;
            color: #374151;
            background: #fff;
            -webkit-print-color-adjust: exact;
          }
          header {
            margin-bottom: 8mm;
            border-left: 4px solid ${isEmpty ? "#D1D5DB" : PRIMARY};
            padding-left: 15px;
          }
          .name { font-size: 26pt; font-weight: 900; color: ${isEmpty ? "#D1D5DB" : PRIMARY}; margin-bottom: 4px; letter-spacing: -0.5px; text-transform: none; }
          .title { font-size: 13pt; color: ${isEmpty ? "#D1D5DB" : ACCENT}; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
          .contact { font-size: 9.5pt; color: #374151; margin-top: 10px; }

          .section-head { border-bottom: 1.5px solid ${isEmpty ? "#D1D5DB" : PRIMARY}; padding-bottom: 4px; text-align: center; margin: 25px 0 15px 0; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; font-size: 12pt; color: ${isEmpty ? "#D1D5DB" : PRIMARY}; }

          .exp-item { margin-bottom: 20px; page-break-inside: avoid; }
          .exp-header { display: flex; justify-content: space-between; align-items: baseline; }
          .company { font-weight: bold; font-size: 11pt; color: ${PRIMARY}; }
          .period { font-size: 9pt; color: ${ACCENT}; font-weight: bold; }
          .role { font-style: italic; font-size: 10pt; }
          .location { font-size: 9pt; }

          .bullet { font-size: 9.5pt; line-height: 1.4; margin-bottom: 4px; display: flex; }
          .bullet-point { color: ${ACCENT}; margin-right: 8px; }

          .skills-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px 20px; font-size: 9.5pt; text-align: center; }
          .skill-item { border-bottom: 1px solid ${BORDER}; padding-bottom: 2px; }

          .skeleton-box { background: #D1D5DB; margin-bottom: 5px; }
        </style>
      </head>
      <body>
        <header>
          <div class="name">${cv.name || "BRIAN T. WAYNE"}</div>
          <div class="title">${cv.title || "Business Development Consultant"}</div>
          <div class="contact">
            ${
              isEmpty
                ? "email@address.com &nbsp; • &nbsp; +00 000 000 &nbsp; • &nbsp; Location &nbsp; • &nbsp; LinkedIn"
                : [cv.email, cv.phone, cv.location, cv.linkedin].filter(Boolean).join(" &nbsp; • &nbsp; ")
            }
          </div>
          ${personalDetailsHtml}
        </header>

        ${(cv.summary || isEmpty) ? `
        <div class="section-head">Professional Profile</div>
        <p style="text-align: center; font-size: 10pt; line-height: 1.6; margin: 0; color: ${isEmpty ? "#D1D5DB" : "inherit"};">${
          cv.summary || "Strategically-minded professional with an MBA and extensive experience in strategy and relationship building..."
        }</p>
        ` : ""}

        ${(expRows.length > 0 || isEmpty) ? `
        <div class="section-head">Work Experience</div>
        ${
          isEmpty
            ? '<div class="skeleton-box" style="height:40px; width:100%"></div>'
            : expRows
                .map(
                  (e) => `
          <div class="exp-item">
            <div class="exp-header">
              <span class="company">${e.company}</span>
              <span class="period">${e.period}</span>
            </div>
            <div class="exp-header">
              <span class="role">${e.role}</span>
              <span class="location">${e.location}</span>
            </div>
            <div style="margin-top: 5px;">
              ${splitExperiencePointsForPreview(e.points)
                .map(
                  (p) => `
                <div class="bullet">
                  <span class="bullet-point">•</span>
                  <span>${p}</span>
                </div>
              `,
                )
                .join("")}
            </div>
          </div>
        `,
                )
                .join("")
        }
        ` : ""}

        ${eduRows.length > 0 ? `
        <div class="section-head">Education</div>
        ${eduRows
          .map((edu) => `
          <div class="exp-item">
            <div class="exp-header">
              <span class="company" style="font-size: 10.5pt;">${[edu.degree, edu.fieldOfStudy].map((v) => String(v || "").trim()).filter(Boolean).join(", ")}</span>
              <span class="period">${edu.year}</span>
            </div>
            <div style="font-size: 10pt;">${[edu.school, edu.location].map((v) => String(v || "").trim()).filter(Boolean).join(", ")}</div>
          </div>
        `,
          )
          .join("")}
        ` : ""}

        ${certList.length > 0 ? `
        <div class="section-head">Certifications</div>
        ${certList.map((c) => `
          <p style="font-size: 10pt; line-height: 1.5; margin: 0 0 1.5mm 0;">${c}</p>
        `).join("")}
        ` : ""}

        ${projectLines.length > 0 ? `
        <div class="section-head">Projects</div>
        ${projectLines.map((p) => `
          <div class="bullet">
            <span class="bullet-point">•</span>
            <span>${p}</span>
          </div>
        `).join("")}
        ` : ""}

        ${publicationLines.length > 0 ? `
        <div class="section-head">Publications</div>
        ${publicationLines.map((p) => `
          <div class="bullet">
            <span class="bullet-point">•</span>
            <span>${p}</span>
          </div>
        `).join("")}
        ` : ""}

        ${volunteerLines.length > 0 ? `
        <div class="section-head">Volunteer Work</div>
        ${volunteerLines.map((p) => `
          <div class="bullet">
            <span class="bullet-point">•</span>
            <span>${p}</span>
          </div>
        `).join("")}
        ` : ""}

        ${(skillsCells.length > 0 || isEmpty) ? `
        <div class="section-head">Core Competencies</div>
        <div class="skills-grid">
          ${
            isEmpty
              ? Array.from({ length: 6 })
                  .map(() => `<div class="skeleton-box" style="height:12px; border-radius:2px;"></div>`)
                  .join("")
              : skillsCells
                  .map(
                    (s) => `
            <div class="skill-item">${s}</div>
          `,
                  )
                  .join("")
          }
        </div>
        ` : ""}

        ${techGroups.length > 0 ? `
        <div class="section-head">Technical Skills</div>
        <div style="font-size: 9.5pt; text-align: center; margin: 0; line-height: 1.6;">
          ${techGroups.map((g) => `
            <p style="margin: 2px 0; line-height: 1.4;"><strong>${g.category}:</strong> ${g.chips.join(", ")}</p>
          `).join("")}
        </div>
        ` : ""}

        ${
          cv.languages && String(cv.languages).trim()
            ? `
        <div class="section-head">Languages</div>
        <p style="text-align: center; font-size: 10pt; line-height: 1.6; margin: 0;">
          ${String(cv.languages)
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean)
            .join(" · ")}
        </p>
        `
            : ""
        }
      </body>
    </html>
  `;
}

function buildSidebarTemplate3Html(rawCv) {
  const cv = cvWithTemplateCertifications(rawCv || {});
  return pdfExecutiveModern(cv);
}

module.exports = { buildSidebarTemplate3Html };
