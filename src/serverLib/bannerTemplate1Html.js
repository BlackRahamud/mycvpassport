function pdfModernEmerald(cv) {
  const isEmpty = !cv.name || cv.name.trim() === "";
  const skillList = cv.skills ? cv.skills.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const techList = cv.technicalSkills ? cv.technicalSkills.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const allSkills = [...skillList, ...techList];

  return `
    <html>
      <head>
        <style>
          @page { size: A4; margin: 0; }
          body {
            margin: 0;
            padding: 15mm 15mm 40px 15mm;
            font-family: Arial, Helvetica, sans-serif;
            color: #374151;
            background: #FFFFFF;
            -webkit-print-color-adjust: exact;
          }
          header { text-align: left; margin-bottom: 10mm; }
          .name { font-size: 26pt; font-weight: bold; color: ${isEmpty ? "#D1D5DB" : "#1E3A5F"}; margin: 0; }
          .title { font-size: 13pt; font-weight: bold; color: ${isEmpty ? "#D1D5DB" : "#C8A96E"}; margin: 6px 0 10px; }
          .contact { font-size: 10pt; color: #6B7280; }
          
          .section-title {
            margin-top: 10mm;
            margin-bottom: 5mm;
            border-left: 4px solid ${isEmpty ? "#D1D5DB" : "#C8A96E"};
            padding-left: 10px;
            page-break-after: avoid;
          }
          .section-label {
            font-size: 13pt;
            font-weight: bold;
            color: ${isEmpty ? "#D1D5DB" : "#1E3A5F"};
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }

          .entry { margin-bottom: 6mm; page-break-inside: avoid; }
          .entry-header { display: flex; justify-content: space-between; align-items: baseline; }
          .role { font-size: 11pt; font-weight: bold; color: #1E3A5F; }
          .period { font-size: 10pt; font-weight: bold; color: #C8A96E; }
          .sub-header { font-size: 10.5pt; font-weight: bold; color: #6B7280; margin-bottom: 2mm; }
          
          .bullet { font-size: 10pt; line-height: 1.45; margin: 0 0 1.5mm 0; }
          .skeleton-text { color: #D1D5DB; }
        </style>
      </head>
      <body>
        <header>
          <div class="name">${cv.name || "Your Name"}</div>
          <div class="title">${cv.title || "Your Professional Title"}</div>
          <div class="contact">
            ${[cv.email, cv.phone, cv.location].filter(Boolean).join(" &nbsp; • &nbsp; ")}
          </div>
        </header>

        ${(cv.summary || isEmpty) ? `
          <div class="section-title">
            <span class="section-label">Professional Summary</span>
          </div>
          <p style="font-size: 10.5pt; line-height: 1.6; margin: 0;">
            ${cv.summary || "Write a brief overview of your professional background..."}
          </p>
        ` : ""}

        ${(allSkills.length > 0 || isEmpty) ? `
          <div class="section-title">
            <span class="section-label">Technical Expertise</span>
          </div>
          <div style="font-size: 10.5pt;">
            <strong style="color: #1E3A5F">Core Competencies:</strong> 
            ${isEmpty ? '<span class="skeleton-text">Skill One, Skill Two, Skill Three</span>' : allSkills.join(", ")}
          </div>
        ` : ""}

        <div class="section-title">
          <span class="section-label">Professional Experience</span>
        </div>
        ${isEmpty ? `
          <div class="entry skeleton-text">
            <div class="entry-header"><strong>Job Role Position</strong> <strong>2020 — Present</strong></div>
            <div class="sub-header">Company Name | Location</div>
            <div class="bullet">• Accomplishment placeholder line</div>
          </div>
        ` : (cv.experience || []).map((e) => `
          <div class="entry">
            <div class="entry-header">
              <span class="role">${e.role}</span>
              <span class="period">${e.period}</span>
            </div>
            <div class="sub-header">${e.company} ${e.location ? `| ${e.location}` : ""}</div>
            ${(e.points || "").split("\\n").filter(Boolean).map((p) => `
              <div class="bullet">• ${p.trim().replace(/^•\\s*/, "")}</div>
            `).join("")}
          </div>
        `).join("")}

        ${(cv.education?.length > 0 || isEmpty) ? `
          <div class="section-title">
            <span class="section-label">Education</span>
          </div>
          ${isEmpty ? `
            <div class="skeleton-text">
              <strong>Degree Name</strong><br>University Name | 2018
            </div>
          ` : (cv.education || []).map((edu) => `
            <div class="entry">
              <div class="entry-header">
                <span class="role" style="font-size: 10.5pt;">${edu.degree}</span>
                <span style="color: #6B7280; font-size: 10pt;">${edu.year}</span>
              </div>
              <div style="font-size: 10pt; color: #6B7280;">${edu.school}</div>
            </div>
          `).join("")}
        ` : ""}
      </body>
    </html>
  `;
}

module.exports = { pdfModernEmerald };
