/**
 * Generates the HTML string for Template 12 — Flat Split
 * Designed for Puppeteer on Vercel with strict flat aesthetics.
 */
function buildTemplate12Html(cv) {
  const safeCv = cv || {};
  const HEADER_BG = safeCv.name ? "#D6D3D1" : "#D1D5DB";
  const SIDEBAR_BG = "#F3F4F6";

  const experienceHtml = (safeCv.experience || [])
    .map((exp) => {
      const points = exp.points
        ? String(exp.points)
            .split("\n")
            .filter((p) => p.trim())
            .map(
              (p) => `
              <div data-block="list" style="display: flex; margin-bottom: 4px; font-size: 10pt; line-height: 1.5;">
                <span style="margin-right: 10px;">•</span>
                <span>${String(p).replace(/^•\s*/, "")}</span>
              </div>`,
            )
            .join("")
        : "";

      return `
      <div data-block="job" style="margin-bottom: 25px; page-break-inside: avoid;">
        <div style="display: flex; justify-content: space-between; align-items: baseline;">
          <span style="font-family: Georgia, serif; font-size: 14pt; font-weight: bold;">${exp.company || ""}</span>
          <span style="font-size: 9pt; font-weight: bold;">${exp.period || ""}</span>
        </div>
        <div style="font-style: italic; font-size: 11pt; color: #4B5563; margin: 4px 0 10px 0;">${exp.role || ""}</div>
        ${points}
      </div>`;
    })
    .join("");

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        background: linear-gradient(
          to bottom,
          #F3F4F6 0%, #F3F4F6 35%,
          #FFFFFF 35%, #FFFFFF 100%
        );
        background-size: 100% 1027px;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        font-family: Arial, Helvetica, sans-serif;
      }
      .page-wrap {
        width: 210mm;
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        padding-bottom: 40px; /* Space for Puppeteer margin constraints */
      }
      .header {
        background-color: ${HEADER_BG};
        padding: 40px 50px;
        width: 100%;
      }
      .header h1 {
        font-family: Georgia, serif;
        font-size: 32pt;
        font-weight: normal;
        text-transform: uppercase;
        line-height: 1;
      }
      .body-split {
        display: flex;
        flex: 1;
      }
      .sidebar {
        width: 35%;
        background-color: ${SIDEBAR_BG};
        padding: 40px 30px;
      }
      .main-content {
        width: 65%;
        padding: 40px 40px;
      }
      .section-label {
        font-size: 11pt;
        font-weight: bold;
        text-transform: uppercase;
        margin-bottom: 15px;
      }
      .sidebar-label {
        border-bottom: 1.5px solid #000000;
        padding-bottom: 5px;
      }
    </style>
  </head>
  <body>
    <div class="page-wrap">
      <div class="header">
        <h1>${safeCv.name || "NAME"}</h1>
        <div style="margin-top: 8px; font-weight: bold; color: #4B5563; text-transform: uppercase; letter-spacing: 2px; font-size: 13pt;">
          ${safeCv.title || ""}
        </div>
        <div style="margin-top: 15px; font-size: 10pt; display: flex; gap: 20px;">
          ${safeCv.email ? `<span>${safeCv.email}</span>` : ""}
          ${safeCv.phone ? `<span>${safeCv.phone}</span>` : ""}
          ${safeCv.location ? `<span>${safeCv.location}</span>` : ""}
        </div>
      </div>

      <div class="body-split">
        <div class="sidebar">
          <div class="section-label sidebar-label" data-block="section">Summary</div>
          <div style="font-size: 10pt; line-height: 1.6;" data-block="text">${safeCv.summary || ""}</div>
          
          ${
            safeCv.skills
              ? `
            <div class="section-label sidebar-label" style="margin-top: 40px;" data-block="section">Skills</div>
            <div style="font-size: 10pt; line-height: 1.6;" data-block="text">${safeCv.skills}</div>
          `
              : ""
          }
          ${
            safeCv.technicalSkills && String(safeCv.technicalSkills).trim()
              ? `
            <div class="section-label sidebar-label" style="margin-top: 40px;" data-block="section">Technical Skills</div>
            <div style="font-size: 10pt; line-height: 1.6;" data-block="text">${safeCv.technicalSkills}</div>
          `
              : ""
          }
        </div>

        <div class="main-content">
          <div class="section-label" data-block="section">Experience</div>
          ${experienceHtml}
        </div>
      </div>
    </div>
  </body>
  </html>
  `;
}

module.exports = { buildTemplate12Html };

