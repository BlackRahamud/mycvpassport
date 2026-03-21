// ─────────────────────────────────────────────────────────────────
//  TEMPLATE 10 — ATS International
//  Pure single column · maximum ATS score · zero design risk
//  Target: International applications, tech companies, MNCs,
//          any role where ATS parsing is critical
//  Design: No colours, no columns, no tables, no graphics.
//          Clean typographic hierarchy only. Highest possible
//          ATS compatibility of all 10 templates.
// ─────────────────────────────────────────────────────────────────

import { renderPdfExperiencePoints } from "./experiencePointsPdf";
import {
  PDF_CONTENT_BOTTOM_Y,
  PDF_NEW_PAGE_TOP_Y,
  pdfEnsureY,
  pdfDrawWrappedText,
} from "./pdfA4Layout";

export function PreviewATSInternational({ cv, t }) {
  const skillList = cv.skills
    ? cv.skills.split(",").map(s => s.trim()).filter(Boolean)
    : [];
  const techList = cv.technicalSkills
    ? cv.technicalSkills.split(",").map(s => s.trim()).filter(Boolean)
    : [];
  const certList = cv.certifications
    ? cv.certifications.split(",").map(s => s.trim()).filter(Boolean)
    : [];

  const black  = "#000000";
  const dark   = "#111111";
  const mid    = "#333333";
  const subtle = "#666666";
  const rule   = "#000000";

  const HR = ({ thick = false }) => (
    <div style={{
      height: thick ? "2px" : "1px",
      background: rule,
      margin: thick ? "6px 0 8px" : "4px 0 8px",
    }} />
  );

  const SectionTitle = ({ children }) => (
    <div style={{ margin: "14px 0 6px" }}>
      <div style={{
        fontSize: "10px", fontWeight: "900", color: black,
        textTransform: "uppercase", letterSpacing: "1px",
        fontFamily: "Arial, sans-serif", marginBottom: "3px",
      }}>{children}</div>
      <HR thick />
    </div>
  );

  return (
    <div style={{
      background: "#ffffff", borderRadius: "10px", overflow: "hidden",
      fontFamily: "Arial, sans-serif", color: dark, fontSize: "10.5px",
      padding: "28px 32px",
    }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: "14px" }}>
        <h1 style={{
          fontSize: "22px", fontWeight: "900", color: black,
          margin: "0 0 3px", letterSpacing: "0.5px",
          fontFamily: "Arial, sans-serif",
        }}>{cv.name || "Your Name"}</h1>

        <p style={{
          fontSize: "11px", fontWeight: "700", color: mid,
          margin: "0 0 8px", fontFamily: "Arial, sans-serif",
        }}>{cv.title || "Professional Title"}</p>

        {/* Contact — plain text, no icons */}
        <div style={{
          fontSize: "9.5px", color: mid, fontFamily: "Arial, sans-serif",
          lineHeight: "1.8",
        }}>
          {[cv.email, cv.phone, cv.location].filter(Boolean).join("   |   ")}
        </div>

        {/* Gulf info — plain text */}
        {(cv.nationality || cv.visaStatus || cv.dob || cv.gender || cv.maritalStatus) && (
          <div style={{
            fontSize: "9px", color: subtle, fontFamily: "Arial, sans-serif",
            lineHeight: "1.8", marginTop: "2px",
          }}>
            {[
              cv.nationality   ? `Nationality: ${cv.nationality}`   : null,
              cv.visaStatus    ? `Visa Status: ${cv.visaStatus}`    : null,
              cv.dob           ? `Date of Birth: ${cv.dob}`         : null,
              cv.gender        ? `Gender: ${cv.gender}`             : null,
              cv.maritalStatus ? `Marital Status: ${cv.maritalStatus}` : null,
            ].filter(Boolean).join("   |   ")}
          </div>
        )}
      </div>

      <HR thick />

      {/* Summary */}
      {cv.summary && (
        <>
          <SectionTitle>Professional Summary</SectionTitle>
          <p style={{
            fontSize: "10px", lineHeight: "1.75", color: mid, margin: "0 0 4px",
          }}>{cv.summary}</p>
        </>
      )}

      {/* Core Skills */}
      {skillList.length > 0 && (
        <>
          <SectionTitle>Core Skills</SectionTitle>
          <p style={{
            fontSize: "10px", color: mid, margin: 0, lineHeight: "1.8",
          }}>
            {skillList.join(" | ")}
          </p>
        </>
      )}

      {/* Experience */}
      {cv.experience.some(e => e.company) && (
        <>
          <SectionTitle>Professional Experience</SectionTitle>
          {cv.experience.filter(e => e.company).map((e, i) => (
            <div key={i} style={{ marginBottom: "13px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{
                  fontSize: "11px", fontWeight: "700", color: black,
                }}>{e.role}</span>
                <span style={{ fontSize: "9.5px", color: subtle }}>{e.period}</span>
              </div>
              <div style={{
                fontSize: "10px", fontWeight: "600", color: mid,
                marginBottom: "4px",
              }}>
                {e.company}{e.location ? ` | ${e.location}` : ""}
              </div>
              {e.points && (
                <p style={{ fontSize: "10px", color: mid, margin: 0, lineHeight: "1.7" }}>
                  {e.points}
                </p>
              )}
            </div>
          ))}
        </>
      )}

      {/* Education */}
      {cv.education.some(e => e.school) && (
        <>
          <SectionTitle>Education</SectionTitle>
          {cv.education.filter(e => e.school).map((e, i) => (
            <div key={i} style={{ marginBottom: "8px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <div>
                <span style={{ fontSize: "10.5px", fontWeight: "700", color: black }}>{e.degree}</span>
                <span style={{ fontSize: "10px", color: mid }}> | {e.school}</span>
              </div>
              <span style={{ fontSize: "9.5px", color: subtle }}>{e.year}</span>
            </div>
          ))}
        </>
      )}

      {/* Certifications */}
      {certList.length > 0 && (
        <>
          <SectionTitle>Certifications</SectionTitle>
          <p style={{ fontSize: "10px", color: mid, margin: 0, lineHeight: "1.8" }}>
            {certList.join(" | ")}
          </p>
        </>
      )}

      {/* Technical Skills */}
      {techList.length > 0 && (
        <>
          <SectionTitle>Technical Skills</SectionTitle>
          <p style={{ fontSize: "10px", color: mid, margin: 0, lineHeight: "1.8" }}>
            {techList.join(" | ")}
          </p>
        </>
      )}

      {/* Languages */}
      {cv.languages && (
        <>
          <SectionTitle>Languages</SectionTitle>
          <p style={{ fontSize: "10px", margin: 0, color: mid }}>{cv.languages}</p>
        </>
      )}

      {/* Additional Information */}
      {(cv.availability || cv.drivingLicense || cv.willingToRelocate) && (
        <>
          <SectionTitle>Additional Information</SectionTitle>
          <div style={{ fontSize: "10px", color: mid, lineHeight: "1.8" }}>
            {cv.availability      && <div>Availability: {cv.availability}</div>}
            {cv.drivingLicense    && <div>Driving License: {cv.drivingLicense}</div>}
            {cv.willingToRelocate && <div>Willing to Relocate: {cv.willingToRelocate}</div>}
          </div>
        </>
      )}

      {/* References */}
      {cv.references && (
        <>
          <SectionTitle>References</SectionTitle>
          <p style={{ fontSize: "9.5px", color: subtle, margin: 0 }}>{cv.references}</p>
        </>
      )}
    </div>
  );
}

// ─── PDF: ATS International ───────────────────────────────────────
export function pdfATSInternational(doc, cv, W, M) {
  const fullTextW = W - M * 2;
  const pdfBottomY = PDF_CONTENT_BOTTOM_Y;
  const pdfTopY = PDF_NEW_PAGE_TOP_Y;
  const newPageOpts = {};
  const black  = [0,   0,   0  ];
 // const dark   = [17,  17,  17 ];
  const mid    = [51,  51,  51 ];
  const subtle = [102, 102, 102];

  // Name
  doc.setTextColor(...black);
  doc.setFontSize(20); doc.setFont("helvetica", "bold");
  doc.text(cv.name || "Your Name", M, 14);

  // Title
  doc.setFontSize(10); doc.setFont("helvetica", "normal");
  doc.setTextColor(...mid);
  doc.text(cv.title || "Professional Title", M, 21);

  // Contact
  doc.setFontSize(7.5); doc.setTextColor(...mid);
  const contactStr = [cv.email, cv.phone, cv.location].filter(Boolean).join("   |   ");
  doc.text(contactStr, M, 27);

  // Gulf info
  const gparts = [];
  if (cv.nationality)   gparts.push(`Nationality: ${cv.nationality}`);
  if (cv.visaStatus)    gparts.push(`Visa Status: ${cv.visaStatus}`);
  if (cv.dob)           gparts.push(`DOB: ${cv.dob}`);
  if (cv.gender)        gparts.push(`Gender: ${cv.gender}`);
  if (cv.maritalStatus) gparts.push(`Marital Status: ${cv.maritalStatus}`);
  if (gparts.length) {
    doc.setFontSize(7); doc.setTextColor(...subtle);
    doc.text(gparts.join("   |   "), M, 32);
  }

  // Thick rule under header
  const ruleY = gparts.length ? 36 : 31;
  doc.setDrawColor(...black); doc.setLineWidth(1);
  doc.line(M, ruleY, W - M, ruleY);

  let y = ruleY + 8;

  const sectionTitle = (title) => {
    y = pdfEnsureY(doc, y, 10, pdfBottomY, pdfTopY, newPageOpts);
    doc.setFontSize(9); doc.setFont("helvetica", "bold");
    doc.setTextColor(...black);
    doc.text(title.toUpperCase(), M, y);
    y += 2.5;
    doc.setDrawColor(...black); doc.setLineWidth(0.6);
    doc.line(M, y, W - M, y);
    y += 5;
    doc.setFont("helvetica", "normal"); doc.setTextColor(...mid);
  };

  if (cv.summary) {
    sectionTitle("Professional Summary");
    doc.setFontSize(8.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...mid);
    y = pdfDrawWrappedText(doc, cv.summary, fullTextW, 8.5, M, y, 4.5, pdfBottomY, pdfTopY, undefined, newPageOpts);
    y += 7;
  }

  if (cv.skills) {
    sectionTitle("Core Skills");
    doc.setFontSize(8.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...mid);
    const skillStr = cv.skills.split(",").map(s => s.trim()).filter(Boolean).join(" | ");
    y = pdfDrawWrappedText(doc, skillStr, fullTextW, 8.5, M, y, 4.5, pdfBottomY, pdfTopY, undefined, newPageOpts);
    y += 6;
  }

  if (cv.experience.some(e => e.company)) {
    sectionTitle("Professional Experience");
    cv.experience.filter(e => e.company).forEach(e => {
      y = pdfEnsureY(doc, y, 5, pdfBottomY, pdfTopY, newPageOpts);
      doc.setFont("helvetica", "bold"); doc.setFontSize(10);
      doc.setTextColor(...black);
      doc.text(e.role || "", M, y);
      doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
      doc.setTextColor(...subtle);
      doc.text(e.period || "", W - M, y, { align: "right" });
      y += 5;
      y = pdfEnsureY(doc, y, 5, pdfBottomY, pdfTopY, newPageOpts);
      doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
      doc.setTextColor(...mid);
      const compStr = (e.company || "") + (e.location ? ` | ${e.location}` : "");
      doc.text(compStr, M, y); y += 5;
      if (e.points) {
        doc.setFont("helvetica", "normal"); doc.setFontSize(8);
        doc.setTextColor(...mid);
        y = renderPdfExperiencePoints(doc, e.points, M, y, fullTextW, 4, pdfBottomY, pdfTopY, 8, newPageOpts) + 2;
      }
      y += 4;
    });
  }

  if (cv.education.some(e => e.school)) {
    sectionTitle("Education");
    cv.education.filter(e => e.school).forEach(e => {
      y = pdfEnsureY(doc, y, 5, pdfBottomY, pdfTopY, newPageOpts);
      doc.setFont("helvetica", "bold"); doc.setFontSize(10);
      doc.setTextColor(...black);
      doc.text(e.degree || "", M, y);
      doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
      doc.setTextColor(...subtle);
      doc.text(e.year || "", W - M, y, { align: "right" });
      y += 4.5;
      y = pdfEnsureY(doc, y, 5, pdfBottomY, pdfTopY, newPageOpts);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
      doc.setTextColor(...mid);
      doc.text(e.school || "", M, y); y += 8;
    });
  }

  if (cv.certifications) {
    sectionTitle("Certifications");
    doc.setFontSize(8.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...mid);
    const certStr = cv.certifications.split(",").map(s => s.trim()).filter(Boolean).join(" | ");
    y = pdfDrawWrappedText(doc, certStr, fullTextW, 8.5, M, y, 4, pdfBottomY, pdfTopY, undefined, newPageOpts);
    y += 5;
  }

  if (cv.technicalSkills) {
    sectionTitle("Technical Skills");
    doc.setFontSize(8.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...mid);
    const techStr = cv.technicalSkills.split(",").map(s => s.trim()).filter(Boolean).join(" | ");
    y = pdfDrawWrappedText(doc, techStr, fullTextW, 8.5, M, y, 4, pdfBottomY, pdfTopY, undefined, newPageOpts);
    y += 5;
  }

  if (cv.languages) {
    sectionTitle("Languages");
    doc.setFontSize(8.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...mid);
    y = pdfEnsureY(doc, y, 5, pdfBottomY, pdfTopY, newPageOpts);
    doc.text(cv.languages, M, y); y += 8;
  }

  if (cv.availability || cv.drivingLicense || cv.willingToRelocate) {
    sectionTitle("Additional Information");
    doc.setFontSize(8.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...mid);
    if (cv.availability)      { y = pdfEnsureY(doc, y, 5, pdfBottomY, pdfTopY, newPageOpts); doc.text(`Availability: ${cv.availability}`, M, y); y += 5; }
    if (cv.drivingLicense)    { y = pdfEnsureY(doc, y, 5, pdfBottomY, pdfTopY, newPageOpts); doc.text(`Driving License: ${cv.drivingLicense}`, M, y); y += 5; }
    if (cv.willingToRelocate) { y = pdfEnsureY(doc, y, 5, pdfBottomY, pdfTopY, newPageOpts); doc.text(`Willing to Relocate: ${cv.willingToRelocate}`, M, y); y += 5; }
    y += 3;
  }

  if (cv.references) {
    sectionTitle("References");
    doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
    doc.setTextColor(...subtle);
    y = pdfEnsureY(doc, y, 5, pdfBottomY, pdfTopY, newPageOpts);
    doc.text(cv.references, M, y);
  }
}