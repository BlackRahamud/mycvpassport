const {
  buildPersonalDetailsEntries,
  splitExperiencePointsForPreview,
  cvWithTemplateCertifications,
} = require("./pdfCommon");

function multilineLines(raw) {
  return String(raw || "")
    .split(/\r?\n/)
    .map((s) => s.trim().replace(/^[-*•]\s+/, "").trim())
    .filter(Boolean);
}

function technicalSkillsGroupsForTemplate(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((g) => g.chips?.length > 0);
  // Legacy string: pipe-separated
  const chips = raw.split("|").map((s) => s.trim()).filter(Boolean);
  if (!chips.length) return [];
  return [{ category: 'Technical Skills', chips }];
}

function buildTemplate14Html(cv) {
  const safeCv = cv || {};
  const ACCENT_BLUE = "#1E40AF";
  const ACCENT_ORANGE = "#EA580C";

  const expHtml = (safeCv.experience || [])
    .map(
      (exp) => `
    <div data-block="job" style="margin-bottom: 25px; position: relative;">
      <div style="position: absolute; left: -37px; top: 6px; width: 12px; height: 12px; background: ${ACCENT_ORANGE};"></div>
      <div style="position: absolute; left: -170px; width: 130px; text-align: right; top: 5px;">
        <div style="font-size: 9pt; font-weight: bold;">${exp.period || ""}</div>
        <div style="font-size: 8.5pt; color: #6B7280;">${exp.location || ""}</div>
      </div>
      <div style="font-size: 12pt; font-weight: bold;">${exp.role || ""}</div>
      <div style="font-size: 11pt; font-weight: bold; color: ${ACCENT_ORANGE}; margin: 2px 0 8px 0;">${exp.company || ""}</div>
      ${splitExperiencePointsForPreview(exp.points)
        .map(
          (p) => `
        <div data-block="list" style="font-size: 10pt; display: flex; gap: 8px; margin-bottom: 4px; line-height: 1.5;">
          <span style="color: ${ACCENT_ORANGE};">•</span><span>${p}</span>
        </div>
      `,
        )
        .join("")}
    </div>
  `,
    )
    .join("");

  const hasSkills =
    Array.isArray(safeCv.skills)
      ? safeCv.skills.length > 0
      : String(safeCv.skills || "")
          .split(",")
          .some((s) => s.trim());
  const skillsDisplay = Array.isArray(safeCv.skills)
    ? safeCv.skills.join(", ")
    : safeCv.skills || "";
  const techGroups = technicalSkillsGroupsForTemplate(safeCv.technicalSkills);
  const languages = safeCv.languages
    ? String(safeCv.languages)
        .split(",")
        .map((l) => l.trim())
        .filter(Boolean)
    : [];
  const technicalSkillsInner = techGroups
    .map(
      (g) =>
        `<p data-block="text" style="font-size: 10pt; line-height: 1.4; margin: 2px 0;"><strong>${g.category}:</strong> ${g.chips.join(", ")}</p>`,
    )
    .join("");

  const hasExperience = Array.isArray(safeCv.experience) && safeCv.experience.length > 0;
  const education = Array.isArray(safeCv.education) ? safeCv.education : [];
  const certifications = String(cvWithTemplateCertifications(safeCv).certifications || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const contactParts = [safeCv.phone, safeCv.email, safeCv.linkedin, safeCv.location].filter(Boolean);

  const eduColHtml = `${
    education.length
      ? `<div class="section-label" data-block="section">Education</div>
             ${education
               .map(
                 (edu) => `<div data-block="edu" style="margin-bottom: 10px;">
                <div style="font-size: 10pt; font-weight: bold;">${[edu.degree, edu.fieldOfStudy].filter(Boolean).join(", ")}</div>
                <div style="font-size: 9pt; color: ${ACCENT_ORANGE};">${[edu.school, edu.location].filter(Boolean).join(", ")}</div>
                ${edu.year ? `<div style="font-size: 8.5pt; color: #6B7280;">${edu.year}</div>` : ""}
             </div>`,
               )
               .join("")}`
      : ""
  }${
    certifications.length
      ? `<div class="section-label" data-block="section" style="margin-top: ${education.length ? "24px" : "0"};">Certifications</div>
             ${certifications
               .map(
                 (c) =>
                   `<div data-block="text" style="font-size: 10pt; line-height: 1.6; margin-bottom: 4px;">${c}</div>`,
               )
               .join("")}`
      : ""
  }`;

  const multilineSectionsHtml = [
    ["Projects", "projects", multilineLines(safeCv.projects)],
    ["Publications", "publications", multilineLines(safeCv.publications)],
    ["Volunteer Work", "volunteerWork", multilineLines(safeCv.volunteerWork)],
  ]
    .map(([label, section, lines]) =>
      lines.length
        ? `
        <div data-section="${section}" style="margin-top: 30px;">
          <div class="section-label" data-block="section">${label}</div>
          ${lines.map((l) => `<p data-block="text" style="font-size: 10pt; line-height: 1.6; margin: 0 0 6px 0;">${l}</p>`).join("")}
        </div>`
        : "",
    )
    .join("");

  const skillsColHtml = `${hasSkills ? `<div class="section-label" data-block="section">Skills</div>
             <div data-block="text" style="font-size: 10pt; line-height: 1.6;">${skillsDisplay}</div>` : ""}${
    techGroups.length
      ? `<div class="section-label" data-block="section" style="margin-top: ${hasSkills ? "24px" : "0"};">Technical Skills</div>
             <div style="font-size: 10pt; line-height: 1.6; margin: 0;">${technicalSkillsInner}</div>`
      : ""
  }${
    languages.length
      ? `<div class="section-label" data-block="section" style="margin-top: 24px;">Languages</div>
             <div data-block="text" style="font-size: 10pt; line-height: 1.6;">${languages.join(", ")}</div>`
      : ""
  }`;

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        background: linear-gradient(
          to bottom,
          #F9FAFB 0%, #F9FAFB 35%,
          #FFFFFF 35%, #FFFFFF 100%
        );
        background-size: 100% 1027px;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        font-family: 'Helvetica', sans-serif;
      }
      .page { width: 210mm; background: white; margin: 0 auto; min-height: 297mm; }
      header { padding: 40px 50px; border-bottom: 5px solid ${ACCENT_BLUE}; }
      .timeline-box { position: relative; border-left: 2px solid ${ACCENT_BLUE}; margin-left: 140px; padding-left: 30px; margin-top: 20px; }
      .section-label { font-size: 12pt; color: ${ACCENT_BLUE}; font-weight: bold; text-transform: uppercase; margin-bottom: 15px; }
      .grid { display: flex; gap: 40px; margin-top: 30px; }
      .col { flex: 1; }
    </style>
  </head>
  <body>
    <div class="page">
      <header>
        <h1 style="font-size: 32pt; color: ${ACCENT_BLUE}; text-transform: uppercase;">${safeCv.name || ""}</h1>
        <div style="font-size: 14pt; font-weight: bold; margin-top: 5px;">${safeCv.title || ""}</div>
        ${
          contactParts.length
            ? `<div style="font-size: 10pt; color: #6B7280; margin-top: 10px;">
          ${contactParts.join(" | ")}
        </div>`
            : ""
        }
        ${
          (() => {
            const personal = buildPersonalDetailsEntries(safeCv);
            if (!personal.length) return "";
            return `<div style="font-size: 10pt; color: #6B7280; margin-top: 6px;">
          ${personal.map((e) => `${e.label}: ${e.value}`).join(" | ")}
        </div>`;
          })()
        }
      </header>
      <div style="padding: 40px 50px;">
        ${
          safeCv.summary
            ? `<div class="section-label" data-block="section">Summary</div>
        <p data-block="text" style="font-size: 10.5pt; line-height: 1.6; margin-bottom: 30px;">${safeCv.summary}</p>`
            : ""
        }
        ${
          hasExperience
            ? `<div class="section-label" data-block="section">Experience</div>
        <div class="timeline-box">${expHtml}</div>`
            : ""
        }
        <div class="grid">
          <div class="col">
             ${eduColHtml}
          </div>
          <div class="col">
             ${skillsColHtml}
          </div>
        </div>
        ${multilineSectionsHtml}
      </div>
    </div>
  </body>
  </html>`;
}

module.exports = { buildTemplate14Html };

