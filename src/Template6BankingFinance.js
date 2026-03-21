// ─────────────────────────────────────────────────────────────────
//  TEMPLATE 6 — Banking & Finance
//  Ultra clean · black & white · single column · ATS maximum score
//  Target: UAE banks, financial institutions, corporate finance roles
//  Design: Refined minimalism — sharp typography, ruled sections,
//          no colour distractions, pure professionalism
// ─────────────────────────────────────────────────────────────────

import { renderPdfExperiencePoints } from "./experiencePointsPdf";
import {
  PDF_CONTENT_BOTTOM_Y,
  PDF_NEW_PAGE_TOP_Y,
  pdfEnsureY,
  pdfDrawWrappedText,
} from "./pdfA4Layout";

export function PreviewBankingFinance({ cv, t }) {
  const skillList = cv.skills
    ? cv.skills.split(",").map(s => s.trim()).filter(Boolean)
    : [];
  const techList = cv.technicalSkills
    ? cv.technicalSkills.split(",").map(s => s.trim()).filter(Boolean)
    : [];
  const certList = cv.certifications
    ? cv.certifications.split(",").map(s => s.trim()).filter(Boolean)
    : [];

  const black  = "#0A0A0A";
  const dark   = "#1A1A1A";
  const mid    = "#444444";
  const subtle = "#777777";
  const rule   = "#CCCCCC";
  const bg     = "#FFFFFF";
 // const tint = "#F7F7F7";

  const HR = () => (
    <div style={{ height: "1px", background: black, margin: "0 0 8px" }} />
  );

  const SectionTitle = ({ children }) => (
    <div style={{ marginBottom: "10px", marginTop: "14px" }}>
      <div style={{ fontSize: "9.5px", fontWeight: "900", letterSpacing: "1.5px", color: black, textTransform: "uppercase", fontFamily: "Arial, sans-serif", marginBottom: "4px" }}>
        {children}
      </div>
      <HR />
    </div>
  );

  return (
    <div style={{
      background: bg, borderRadius: "10px", overflow: "hidden",
      fontFamily: "'Times New Roman', serif", color: dark, fontSize: "11px",
    }}>
      {/* ── Header — centered, formal ── */}
      <div style={{ padding: "28px 32px 16px", textAlign: "center", borderBottom: `3px double ${black}` }}>
        <h1 style={{
          fontSize: "24px", fontWeight: "900", color: black,
          margin: "0 0 4px", letterSpacing: "3px", textTransform: "uppercase",
          fontFamily: "Arial, sans-serif",
        }}>{cv.name || "YOUR NAME"}</h1>

        <p style={{
          fontSize: "11px", color: mid, margin: "0 0 10px",
          letterSpacing: "1.5px", textTransform: "uppercase",
          fontFamily: "Arial, sans-serif", fontWeight: "600",
        }}>{cv.title || "Banking Professional"}</p>

        {/* Contact line */}
        <div style={{
          display: "flex", justifyContent: "center", gap: "16px",
          flexWrap: "wrap", fontSize: "9.5px", color: mid,
          fontFamily: "Arial, sans-serif",
        }}>
          {cv.email    && <span>{cv.email}</span>}
          {cv.phone    && <span>|</span>}
          {cv.phone    && <span>{cv.phone}</span>}
          {cv.location && <span>|</span>}
          {cv.location && <span>{cv.location}</span>}
        </div>

        {/* Gulf info line */}
        {(cv.nationality || cv.visaStatus || cv.dob || cv.gender || cv.maritalStatus) && (
          <div style={{
            display: "flex", justifyContent: "center", gap: "12px",
            flexWrap: "wrap", fontSize: "9px", color: subtle,
            fontFamily: "Arial, sans-serif", marginTop: "5px",
          }}>
            {cv.nationality   && <span>Nationality: {cv.nationality}</span>}
            {cv.visaStatus    && <span>|</span>}
            {cv.visaStatus    && <span>Visa: {cv.visaStatus}</span>}
            {cv.dob           && <span>|</span>}
            {cv.dob           && <span>DOB: {cv.dob}</span>}
            {cv.gender        && <span>|</span>}
            {cv.gender        && <span>{cv.gender}</span>}
            {cv.maritalStatus && <span>|</span>}
            {cv.maritalStatus && <span>{cv.maritalStatus}</span>}
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div style={{ padding: "14px 32px 24px", lineHeight: 1.5 }}>

        {/* Professional Summary */}
        {cv.summary && (
          <>
            <SectionTitle>Professional Summary</SectionTitle>
            <p style={{
              fontSize: "10.5px", lineHeight: 1.5, color: dark,
              margin: "0 0 10px", textAlign: "justify",
            }}>{cv.summary}</p>
          </>
        )}

        {/* Core Skills — inline pipe separated */}
        {skillList.length > 0 && (
          <>
            <SectionTitle>Core Skills</SectionTitle>
            <p style={{
              fontSize: "10px", color: dark, margin: "0 0 10px",
              lineHeight: 1.5, fontFamily: "Arial, sans-serif",
            }}>
              {skillList.join("   ·   ")}
            </p>
          </>
        )}

        {/* Work Experience */}
        {cv.experience.some(e => e.company) && (
          <>
            <SectionTitle>Professional Experience</SectionTitle>
            {cv.experience.filter(e => e.company).map((e, i) => (
              <div key={i} style={{ marginBottom: "6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "12px" }}>
                  <span style={{
                    fontSize: "11px", fontWeight: "700", color: black,
                    fontFamily: "Arial, sans-serif", textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}>{e.role}</span>
                  <span style={{ fontSize: "9.5px", color: "#666666", fontFamily: "Arial, sans-serif", textAlign: "right", flexShrink: 0 }}>{e.period}</span>
                </div>
                <div style={{
                  fontSize: "10.5px", color: "#444444", fontStyle: "italic",
                  marginBottom: "4px",
                }}>
                  {e.company}{e.location ? ` — ${e.location}` : ""}
                </div>
                {e.points && (
                  <div className="cvp-preview-exp-t6-wrap">
                    {!/[•\n]/.test(String(e.points)) ? (
                      <p className="cvp-preview-exp-t6-line">{String(e.points).trim()}</p>
                    ) : (
                      String(e.points).split(/\n|•/).map((l) => l.trim()).filter(Boolean).map((line, j) => (
                        <p key={j} className="cvp-preview-exp-t6-line">{j === 0 ? line : `• ${line}`}</p>
                      ))
                    )}
                  </div>
                )}
                {i < cv.experience.filter(e => e.company).length - 1 && (
                  <div style={{ height: "1px", background: rule, marginTop: "6px" }} />
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
                  <span style={{ fontSize: "11px", fontWeight: "700", color: black, fontFamily: "Arial, sans-serif" }}>{e.degree}</span>
                  <span style={{ fontSize: "10px", color: mid, fontStyle: "italic" }}> — {e.school}</span>
                </div>
                <span style={{ fontSize: "9.5px", color: "#666666", fontFamily: "Arial, sans-serif" }}>{e.year}</span>
              </div>
            ))}
          </>
        )}

        {/* Certifications */}
        {certList.length > 0 && (
          <>
            <SectionTitle>Certifications</SectionTitle>
            <p style={{ fontSize: "10px", color: dark, margin: "0 0 10px", lineHeight: 1.5, fontFamily: "Arial, sans-serif" }}>
              {certList.join("   ·   ")}
            </p>
          </>
        )}

        {/* Technical Skills */}
        {techList.length > 0 && (
          <>
            <SectionTitle>Technical Skills</SectionTitle>
            <p style={{ fontSize: "10px", color: dark, margin: "0 0 10px", lineHeight: 1.5, fontFamily: "Arial, sans-serif" }}>
              {techList.join("   ·   ")}
            </p>
          </>
        )}

        {/* Languages */}
        {cv.languages && (
          <>
            <SectionTitle>Languages</SectionTitle>
            <p style={{ fontSize: "10.5px", margin: "0 0 10px", color: dark, lineHeight: 1.5 }}>{cv.languages}</p>
          </>
        )}

        {/* Additional Information */}
        {(cv.availability || cv.drivingLicense || cv.willingToRelocate) && (
          <>
            <SectionTitle>Additional Information</SectionTitle>
            <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", fontSize: "10px", color: dark, fontFamily: "Arial, sans-serif" }}>
              {cv.availability      && <span>Availability: {cv.availability}</span>}
              {cv.drivingLicense    && <span>Driving License: {cv.drivingLicense}</span>}
              {cv.willingToRelocate && <span>Willing to Relocate: {cv.willingToRelocate}</span>}
            </div>
          </>
        )}

        {/* References */}
        {cv.references && (
          <>
            <SectionTitle>References</SectionTitle>
            <p style={{ fontSize: "9.5px", color: subtle, fontStyle: "italic", margin: 0 }}>{cv.references}</p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── PDF: Banking & Finance ───────────────────────────────────────
export function pdfBankingFinance(doc, cv, W, M) {
  const fullTextW = W - M * 2;
  const pdfBottomY = PDF_CONTENT_BOTTOM_Y;
  const pdfTopY = PDF_NEW_PAGE_TOP_Y;
  const newPageOpts = {};
  const black  = [10,  10,  10];
  const dark   = [26,  26,  26];
  const mid    = [68,  68,  68];
  const subtle = [119, 119, 119];

  // Centered header
  doc.setFontSize(18); doc.setFont("helvetica", "bold");
  doc.setTextColor(...black);
  doc.text((cv.name || "YOUR NAME").toUpperCase(), W / 2, 14, { align: "center" });

  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.setTextColor(...mid);
  doc.text((cv.title || "Banking Professional").toUpperCase(), W / 2, 20, { align: "center" });

  // Contact line centered
  doc.setFontSize(7.5);
  const contactStr = [cv.email, cv.phone, cv.location].filter(Boolean).join("   |   ");
  doc.text(contactStr, W / 2, 26, { align: "center" });

  // Gulf info centered
  const gparts = [];
  if (cv.nationality)   gparts.push(`Nationality: ${cv.nationality}`);
  if (cv.visaStatus)    gparts.push(`Visa: ${cv.visaStatus}`);
  if (cv.dob)           gparts.push(`DOB: ${cv.dob}`);
  if (cv.gender)        gparts.push(cv.gender);
  if (cv.maritalStatus) gparts.push(cv.maritalStatus);
  if (gparts.length) {
    doc.setTextColor(...subtle);
    doc.setFontSize(7);
    doc.text(gparts.join("   |   "), W / 2, 31, { align: "center" });
  }

  // Double rule under header
  const ruleY = gparts.length ? 35 : 30;
  doc.setDrawColor(...black); doc.setLineWidth(0.8);
  doc.line(M, ruleY, W - M, ruleY);
  doc.setLineWidth(0.3);
  doc.line(M, ruleY + 1.5, W - M, ruleY + 1.5);

  let y = ruleY + 10;

  const sectionTitle = (title) => {
    y = pdfEnsureY(doc, y, 10, pdfBottomY, pdfTopY, newPageOpts);
    doc.setFontSize(9); doc.setFont("helvetica", "bold");
    doc.setTextColor(...black);
    doc.text(title.toUpperCase(), M, y);
    y += 2;
    doc.setDrawColor(...black); doc.setLineWidth(0.5);
    doc.line(M, y, W - M, y);
    y += 6;
    doc.setFont("helvetica", "normal"); doc.setTextColor(...dark);
  };

  if (cv.summary) {
    sectionTitle("Professional Summary");
    doc.setFontSize(8.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...dark);
    doc.setFont("helvetica", "normal");
    y = pdfDrawWrappedText(doc, cv.summary, fullTextW, 8.5, M, y, 6.75, pdfBottomY, pdfTopY, undefined, newPageOpts);
    y += 10;
  }

  if (cv.skills) {
    sectionTitle("Core Skills");
    doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(...dark);
    doc.setFont("helvetica", "normal");
    y = pdfDrawWrappedText(doc, cv.skills, fullTextW, 8, M, y, 4, pdfBottomY, pdfTopY, undefined, newPageOpts);
    y += 6;
  }

  if (cv.experience.some(e => e.company)) {
    sectionTitle("Professional Experience");
    cv.experience.filter(e => e.company).forEach((e, i, arr) => {
      y = pdfEnsureY(doc, y, 5, pdfBottomY, pdfTopY, newPageOpts);
      doc.setFont("helvetica", "bold"); doc.setFontSize(9.5);
      doc.setTextColor(...black);
      doc.text((e.role || "").toUpperCase(), M, y);
      doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
      doc.setTextColor(102, 102, 102);
      doc.text(e.period || "", W - M, y, { align: "right" });
      y += 5;
      y = pdfEnsureY(doc, y, 5, pdfBottomY, pdfTopY, newPageOpts);
      doc.setFont("helvetica", "italic"); doc.setFontSize(8.5);
      doc.setTextColor(...mid);
      const compStr = (e.company || "") + (e.location ? ` — ${e.location}` : "");
      doc.text(compStr, M, y);
      y += 5;
      if (e.points) {
        doc.setFont("helvetica", "normal"); doc.setFontSize(8);
        doc.setTextColor(...dark);
        y = renderPdfExperiencePoints(doc, e.points, M, y, fullTextW, 6, pdfBottomY, pdfTopY, 8, newPageOpts) + 2;
      }
      if (i < arr.length - 1) {
        y = pdfEnsureY(doc, y, 5, pdfBottomY, pdfTopY, newPageOpts);
        doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.2);
        doc.line(M, y + 2, W - M, y + 2); y += 3;
      }
      y += 3;
    });
  }

  if (cv.education.some(e => e.school)) {
    sectionTitle("Education");
    cv.education.filter(e => e.school).forEach(e => {
      y = pdfEnsureY(doc, y, 5, pdfBottomY, pdfTopY, newPageOpts);
      doc.setFont("helvetica", "bold"); doc.setFontSize(9.5);
      doc.setTextColor(...black);
      doc.text(e.degree || "", M, y);
      doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
      doc.setTextColor(102, 102, 102);
      doc.text(e.year || "", W - M, y, { align: "right" });
      y += 4.5;
      y = pdfEnsureY(doc, y, 5, pdfBottomY, pdfTopY, newPageOpts);
      doc.setFont("helvetica", "italic"); doc.setFontSize(8);
      doc.setTextColor(...mid);
      doc.text(e.school || "", M, y);
      y += 8;
    });
  }

  if (cv.certifications) {
    sectionTitle("Certifications");
    doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(...dark);
    doc.setFont("helvetica", "normal");
    y = pdfDrawWrappedText(doc, cv.certifications, fullTextW, 8, M, y, 4, pdfBottomY, pdfTopY, undefined, newPageOpts);
    y += 5;
  }

  if (cv.technicalSkills) {
    sectionTitle("Technical Skills");
    doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(...dark);
    doc.setFont("helvetica", "normal");
    y = pdfDrawWrappedText(doc, cv.technicalSkills, fullTextW, 8, M, y, 4, pdfBottomY, pdfTopY, undefined, newPageOpts);
    y += 5;
  }

  if (cv.languages) {
    sectionTitle("Languages");
    doc.setFontSize(8.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...dark);
    y = pdfEnsureY(doc, y, 5, pdfBottomY, pdfTopY, newPageOpts);
    doc.text(cv.languages, M, y);
    y += 8;
  }

  if (cv.availability || cv.drivingLicense || cv.willingToRelocate) {
    sectionTitle("Additional Information");
    const adds = [];
    if (cv.availability)      adds.push(`Availability: ${cv.availability}`);
    if (cv.drivingLicense)    adds.push(`Driving License: ${cv.drivingLicense}`);
    if (cv.willingToRelocate) adds.push(`Willing to Relocate: ${cv.willingToRelocate}`);
    doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(...dark);
    doc.setFont("helvetica", "normal");
    y = pdfDrawWrappedText(doc, adds.join("   •   "), fullTextW, 8, M, y, 4, pdfBottomY, pdfTopY, undefined, newPageOpts);
    y += 5;
  }

  if (cv.references) {
    sectionTitle("References");
    doc.setFont("helvetica", "italic"); doc.setFontSize(8);
    doc.setTextColor(...subtle);
    y = pdfEnsureY(doc, y, 5, pdfBottomY, pdfTopY, newPageOpts);
    doc.text(cv.references, M, y);
  }
}