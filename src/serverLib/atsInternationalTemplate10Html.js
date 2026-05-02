const { cvWithTemplateCertifications } = require("./pdfCommon");

function pdfSaaSModern(cv) {
  const NAVY = "#1E2D45";
  const ACCENT_BLUE = "#4A90E2";
  const BODY_GREY = "#475569";
  const LIGHT_GREY = "#94A3B8";
  const PILL_BG = "#EBF4FF";
  const PROGRESS_TRACK = "#E2E8F0";
  const CARD_BG_GRADIENT = "linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)";
  const OUTER_BG = "linear-gradient(135deg, #4F5B66 0%, #2D3748 100%)";
  const SKELETON = "#D1D5DB";

  const isPlaceholder = !cv.name || String(cv.name).trim() === "";
  const experience = Array.isArray(cv.experience) ? cv.experience : [];
  const education = Array.isArray(cv.education) ? cv.education : [];
  const skills = cv.skills ? String(cv.skills).split(",").map((s) => s.trim()).filter(Boolean) : [];
  const languages = cv.languages ? String(cv.languages).split(",").map((l) => l.trim()).filter(Boolean) : [];

  const safeName = cv.name || "Isabella Adams";
  const initials = safeName.trim() ? safeName.trim()[0].toUpperCase() : "I";
  const contact = [cv.phone, cv.email, cv.location].filter(Boolean).join(" &nbsp; | &nbsp; ");

  return `
    <html>
      <head>
        <style>
          @page { size: A4; margin: 0; }
          body {
            margin: 0;
            padding: 0;
            font-family: Arial, sans-serif;
            color: ${BODY_GREY};
            background: ${OUTER_BG};
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .outer {
            min-height: 297mm;
            padding: 60px 20px;
            box-sizing: border-box;
            display: flex;
            justify-content: center;
            align-items: flex-start;
          }
          .card {
            width: 950px;
            max-width: 100%;
            min-height: 600px;
            background-color: #FFFFFF;
            background-image: ${CARD_BG_GRADIENT};
            border-radius: 20px;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
            padding: 32px;
            box-sizing: border-box;
            position: relative;
            overflow: hidden;
          }
          .overlay {
            position: absolute;
            inset: 0;
            opacity: 0.03;
            pointer-events: none;
            background: radial-gradient(circle at 2px 2px, #000 1px, transparent 0);
            background-size: 24px 24px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 32px;
            border-bottom: 1px solid ${PROGRESS_TRACK};
            padding-bottom: 24px;
            position: relative;
            z-index: 1;
          }
          .name { font-size: 28px; font-weight: bold; color: ${isPlaceholder ? SKELETON : NAVY}; margin: 0; }
          .title { font-size: 14px; color: ${isPlaceholder ? SKELETON : ACCENT_BLUE}; margin-top: 4px; font-weight: 500; }
          .contact { display: flex; gap: 12px; margin-top: 12px; color: ${isPlaceholder ? SKELETON : LIGHT_GREY}; font-size: 11px; flex-wrap: wrap; }
          .avatar {
            width: 70px; height: 70px; border-radius: 50%;
            background-color: ${isPlaceholder ? SKELETON : PROGRESS_TRACK};
            border: 3px solid #FFF;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            display: flex; align-items: center; justify-content: center;
            overflow: hidden;
            font-size: 24px; font-weight: bold; color: #FFF;
          }
          .body { display: flex; gap: 40px; position: relative; z-index: 1; }
          .left { flex: 0 0 62%; }
          .right { flex: 1; }
          .section-title {
            font-size: 11px;
            font-weight: bold;
            color: ${isPlaceholder ? SKELETON : ACCENT_BLUE};
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 12px;
            margin-top: 20px;
            page-break-after: avoid;
            break-after: avoid;
          }
          .skills, .lang-item, .summary, .left > div, .right > div {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .exp-item { margin-bottom: 20px; page-break-inside: avoid; break-inside: avoid; }
          .exp-role { font-weight: bold; color: ${isPlaceholder ? SKELETON : NAVY}; font-size: 15px; }
          .exp-meta { color: ${isPlaceholder ? SKELETON : LIGHT_GREY}; font-size: 12px; margin-bottom: 8px; }
          .bullet { font-size: 12.5px; color: ${isPlaceholder ? SKELETON : BODY_GREY}; margin-bottom: 4px; display: flex; }
          .bullet span:first-child { margin-right: 8px; }
          .edu-item { margin-bottom: 12px; page-break-inside: avoid; break-inside: avoid; }
          .edu-degree { font-weight: bold; color: ${isPlaceholder ? SKELETON : NAVY}; font-size: 14px; }
          .edu-meta { color: ${isPlaceholder ? SKELETON : BODY_GREY}; font-size: 12px; }
          .summary { font-size: 12px; color: ${isPlaceholder ? SKELETON : BODY_GREY}; line-height: 1.5; margin: 0; }
          .skills { display: flex; flex-wrap: wrap; gap: 8px; }
          .skill-pill {
            padding: 4px 10px; background-color: ${isPlaceholder ? "#F3F4F6" : PILL_BG};
            color: ${isPlaceholder ? SKELETON : ACCENT_BLUE}; border-radius: 12px;
            font-size: 11px; font-weight: 500;
          }
          .lang-item { margin-bottom: 10px; }
          .lang-name { font-size: 12px; color: ${isPlaceholder ? SKELETON : NAVY}; margin-bottom: 4px; }
          .lang-track { height: 6px; width: 100%; background: ${isPlaceholder ? "#E5E7EB" : PROGRESS_TRACK}; border-radius: 3px; }
          .lang-fill { height: 100%; width: 80%; background: ${isPlaceholder ? SKELETON : ACCENT_BLUE}; border-radius: 3px; }
          .footer-pad { height: 40px; }
        </style>
      </head>
      <body>
        <div class="outer">
          <div class="card">
            <div class="overlay"></div>
            <div class="header">
              <div>
                <h1 class="name">${safeName}</h1>
                <div class="title">${cv.title || "Professional Title"}</div>
                <div class="contact">${contact || (isPlaceholder ? "Phone | Email | Location" : "")}</div>
              </div>
              <div class="avatar">${initials}</div>
            </div>

            <div class="body">
              <div class="left">
                ${
                  (experience.length || isPlaceholder)
                    ? `
                <div class="section-title">Experience</div>
                ${
                  experience.length
                    ? experience
                        .map(
                          (exp) => `
                    <div class="exp-item">
                      <div class="exp-role">${exp.role || ""}</div>
                      <div class="exp-meta">${exp.company || ""} | ${exp.period || ""}</div>
                      ${(exp.points || "")
                        .split("\\n")
                        .filter(Boolean)
                        .map((p) => `<div class="bullet"><span>•</span><span>${String(p).replace(/^•\\s*/, "")}</span></div>`)
                        .join("")}
                    </div>`,
                        )
                        .join("")
                    : `<div class="exp-item"><div class="exp-role">Role Title</div><div class="exp-meta">Company | Period</div><div class="bullet"><span>•</span><span>Achievement placeholder</span></div></div>`
                }`
                    : ""
                }

                ${
                  (education.length || isPlaceholder)
                    ? `
                <div class="section-title">Education</div>
                ${
                  education.length
                    ? education
                        .map(
                          (edu) => `
                    <div class="edu-item">
                      <div class="edu-degree">${edu.degree || ""}</div>
                      <div class="edu-meta">${edu.school || ""} • ${edu.year || ""}</div>
                    </div>`,
                        )
                        .join("")
                    : `<div class="edu-item"><div class="edu-degree">Degree Title</div><div class="edu-meta">University • Year</div></div>`
                }`
                    : ""
                }
              </div>

              <div class="right">
                ${
                  (cv.summary || isPlaceholder)
                    ? `
                <div class="section-title">Summary</div>
                <p class="summary">${cv.summary || "Professional summary placeholder text..."}</p>`
                    : ""
                }

                ${
                  (skills.length || isPlaceholder)
                    ? `
                <div class="section-title">Skills</div>
                <div class="skills">
                  ${
                    skills.length
                      ? skills.map((skill) => `<span class="skill-pill">${skill}</span>`).join("")
                      : `<span class="skill-pill">Skill</span><span class="skill-pill">Skill</span><span class="skill-pill">Skill</span>`
                  }
                </div>`
                    : ""
                }

                ${
                  (languages.length || isPlaceholder)
                    ? `
                <div class="section-title">Languages</div>
                ${
                  languages.length
                    ? languages
                        .map(
                          (lang) => `
                    <div class="lang-item">
                      <div class="lang-name">${lang}</div>
                      <div class="lang-track"><div class="lang-fill"></div></div>
                    </div>`,
                        )
                        .join("")
                    : `<div class="lang-item"><div class="lang-name">Language</div><div class="lang-track"><div class="lang-fill"></div></div></div>`
                }`
                    : ""
                }
              </div>
            </div>
            <div class="footer-pad"></div>
          </div>
        </div>
      </body>
    </html>
  `;
}

function buildATSInternationalTemplate10Html(rawCv) {
  const cv = cvWithTemplateCertifications(rawCv || {});
  return pdfSaaSModern(cv);
}

module.exports = { buildATSInternationalTemplate10Html };
