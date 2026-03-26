function pdfModernEmerald(cv) {
  const skillList = cv.skills ? cv.skills.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const techList = cv.technicalSkills ? cv.technicalSkills.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const experience = Array.isArray(cv.experience) ? cv.experience : [];
  const education = Array.isArray(cv.education) ? cv.education : [];

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        @page { size: A4; margin: 0; }
        body {
          margin: 0;
          padding: 15mm 15mm 40px 25mm;
          font-family: Arial, sans-serif; /* Fallback for Chromium */
          color: #1F2937;
          background: #FFFFFF;
          -webkit-print-color-adjust: exact;
        }
        header { text-align: center; margin-bottom: 8mm; }
        .name { font-size: 26pt; font-weight: 900; color: #064E3B; margin: 0; letter-spacing: -0.02em; }
        .job-title { font-size: 11pt; font-weight: 600; color: #B45309; text-transform: uppercase; letter-spacing: 0.2em; margin: 5px 0 10px; }
        .contact { font-size: 9pt; color: #6B7280; margin-bottom: 5mm; }
        
        .section-header {
          display: flex;
          align-items: center;
          margin-top: 8mm;
          margin-bottom: 4mm;
          page-break-after: avoid;
        }
        .section-label {
          font-size: 11pt;
          font-weight: 800;
          color: #064E3B;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          padding-right: 10px;
        }
        .section-line {
          flex-grow: 1;
          height: 1px;
          background: #E5E7EB;
        }

        .entry { margin-bottom: 5mm; page-break-inside: avoid; }
        .entry-top { display: flex; justify-content: space-between; align-items: baseline; }
        .role { font-size: 11pt; font-weight: 700; color: #064E3B; }
        .period { font-size: 9pt; font-weight: 600; color: #B45309; }
        .company { font-size: 10pt; font-weight: 600; color: #6B7280; margin-bottom: 2mm; }
        
        .bullet { 
          font-size: 9.5pt; 
          line-height: 1.4; 
          margin: 0 0 1.5mm 0; 
          padding-left: 15px; 
          position: relative; 
        }
        .bullet:before {
          content: "•";
          position: absolute;
          left: 0;
          color: #B45309;
        }

        .skill-container { display: flex; flex-wrap: wrap; gap: 6px; }
        .skill-pill {
          font-size: 8.5pt;
          padding: 1pt 6pt;
          background: #F0FDF4;
          border: 1px solid #DCFCE7;
          color: #064E3B;
          border-radius: 3px;
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      <header>
        <div class="name">${(cv.name || "YOUR NAME").toUpperCase()}</div>
        <div class="job-title">${(cv.title || "PROFESSIONAL TITLE").toUpperCase()}</div>
        <div class="contact">
          ${[cv.email, cv.phone, cv.location].filter(Boolean).join(" &nbsp; | &nbsp; ")}
        </div>
      </header>

      ${cv.summary ? `
        <div class="section-header" style="margin-top:0;">
          <div class="section-label">Profile</div>
          <div class="section-line"></div>
        </div>
        <p style="font-size: 9.5pt; line-height: 1.5; margin: 0;">${cv.summary}</p>
      ` : ""}

      ${skillList.length > 0 ? `
        <div class="section-header">
          <div class="section-label">Expertise</div>
          <div class="section-line"></div>
        </div>
        <div class="skill-container">
          ${[...skillList, ...techList].map((s) => `<span class="skill-pill">${s}</span>`).join("")}
        </div>
      ` : ""}

      <div class="section-header">
        <div class="section-label">Experience</div>
        <div class="section-line"></div>
      </div>
      ${experience.filter((e) => e.company).map((e) => `
        <div class="entry">
          <div class="entry-top">
            <span class="role">${e.role}</span>
            <span class="period">${e.period}</span>
          </div>
          <div class="company">${e.company} ${e.location ? `| ${e.location}` : ""}</div>
          ${(e.points || "").split("\n").filter(Boolean).map((p) => `
            <div class="bullet">${p.replace(/^•\\s*/, "")}</div>
          `).join("")}
        </div>
      `).join("")}

      ${education.length > 0 ? `
        <div class="section-header">
          <div class="section-label">Education</div>
          <div class="section-line"></div>
        </div>
        ${education.map((edu) => `
          <div class="entry">
            <div class="entry-top">
              <span style="font-weight:700; font-size: 10pt;">${edu.degree}</span>
              <span class="period">${edu.year}</span>
            </div>
            <div style="font-size: 9pt; color: #6B7280;">${edu.school}</div>
          </div>
        `).join("")}
      ` : ""}
    </body>
    </html>
  `;
}

module.exports = { pdfModernEmerald };
