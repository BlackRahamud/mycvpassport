function buildCoverLetterHtml({
  clFullName,
  clCurrentJobTitle,
  clTargetRole,
  clCompanyName,
  fullLetterDisplay,
  resumeForApi,
  ghostKeywords,
}) {
  const esc = (s) =>
    String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

  const fullName = esc(clFullName || resumeForApi?.name || "Candidate Name");
  const jobTitle = esc(clCurrentJobTitle || "");
  const email = esc(resumeForApi?.email || "");
  const phone = esc(resumeForApi?.phone || "");
  const location = esc(resumeForApi?.location || "");
  const company = esc(clCompanyName || "");
  const targetRole = esc(clTargetRole || "");
  const bodyEscaped = esc(fullLetterDisplay);

  const contactParts = [email, phone, location].filter(Boolean).join(" &middot; ");

  const today = new Date().toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const ghostHtml =
    Array.isArray(ghostKeywords) && ghostKeywords.length
      ? `<div style="color:transparent;font-size:0px;position:absolute;pointer-events:none;overflow:hidden;width:0;height:0;">${ghostKeywords.map(esc).join(" ")}</div>`
      : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    @page { size: A4; margin: 0; }
    html, body { margin: 0; padding: 0; background: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; }
    .cl-page { width: 210mm; min-height: 297mm; padding: 20mm; box-sizing: border-box; position: relative; }
    .cl-header { border-bottom: 2px solid #1a1a1a; padding-bottom: 4mm; margin-bottom: 8mm; }
    .cl-name { font-size: 22px; font-weight: 700; line-height: 1.3; color: #1a1a1a; }
    .cl-title { font-size: 14px; color: #555; margin-top: 1mm; }
    .cl-contact { font-size: 12px; color: #777; margin-top: 1.5mm; }
    .cl-date-block { font-size: 11pt; line-height: 1.75; margin-bottom: 6mm; color: #1a1a1a; }
    .cl-date-block div { margin-bottom: 0.5mm; }
    .cl-subject { font-weight: 700; font-size: 11pt; margin-bottom: 4mm; color: #1a1a1a; }
    .cl-body { white-space: pre-wrap; line-height: 1.6; color: #1f2937; font-size: 11pt; }
  </style>
</head>
<body>
  <div class="cl-page">
    ${ghostHtml}
    <div class="cl-header">
      <div class="cl-name">${fullName}</div>
      ${jobTitle ? `<div class="cl-title">${jobTitle}</div>` : ""}
      ${contactParts ? `<div class="cl-contact">${contactParts}</div>` : ""}
    </div>
    <div class="cl-date-block">
      <div>${today}</div>
      <div>Hiring Manager</div>
      ${company ? `<div>${company}</div>` : ""}
    </div>
    ${targetRole ? `<div class="cl-subject">Re: Application for ${targetRole} Position</div>` : ""}
    <div class="cl-body">${bodyEscaped}</div>
  </div>
</body>
</html>`;
}

module.exports = { buildCoverLetterHtml };
