// ─────────────────────────────────────────────────────────────────
//  TEMPLATE 9 — Hospitality & Service
//  Warm · structured · elegant serif header · soft tones
//  Target: Hotels, F&B, Retail, Customer Service, Tourism in Gulf
//  Design: Warm beige/brown palette, elegant centered header,
//          clean structured sections, welcoming professional feel
// ─────────────────────────────────────────────────────────────────

import { renderPdfExperiencePoints } from "./experiencePointsPdf";
import { splitExperiencePointsForPreview } from "./experiencePointsPreview";
import {
  PDF_CONTENT_BOTTOM_Y,
  PDF_NEW_PAGE_TOP_Y,
  pdfEnsureY,
  pdfDrawWrappedLines,
  pdfSplitText,
} from "./pdfA4Layout";

export function PreviewHospitality({ cv, t, mobileMode = false }) {
  const skillList = cv.skills
    ? cv.skills.split(",").map(s => s.trim()).filter(Boolean)
    : [];
  const techList = cv.technicalSkills
    ? cv.technicalSkills.split(",").map(s => s.trim()).filter(Boolean)
    : [];
  const certList = cv.certifications
    ? cv.certifications.split(",").map(s => s.trim()).filter(Boolean)
    : [];

  const brown  = "#6B4C3B";
  const warm   = "#C4956A";
  const dark   = "#2C1810";
  const mid    = "#4A3728";
  const subtle = "#9E8070";
  const cream  = "#FDF8F3";
  const beige  = "#F5EDE0";
  const white  = "#FFFFFF";

  const SectionTitle = ({ children }) => (
    <div style={{ margin: "14px 0 8px", textAlign: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ flex: 1, height: "1px", background: `${warm}55` }} />
        <span style={{
          fontSize: "9px", fontWeight: "700", letterSpacing: "2.5px",
          color: brown, textTransform: "uppercase",
          fontFamily: "'Georgia', serif", padding: "0 4px",
        }}>{children}</span>
        <div style={{ flex: 1, height: "1px", background: `${warm}55` }} />
      </div>
    </div>
  );

  return (
    <div style={{
      background: cream, borderRadius: "10px", overflow: "hidden",
      fontFamily: "'Georgia', serif", color: mid, fontSize: "11px",
      width: mobileMode ? "100%" : undefined,
    }}>
      {/* ── Elegant Header ── */}
      <div style={{
        background: `linear-gradient(135deg, ${brown}, ${dark})`,
        padding: "26px 32px 20px", textAlign: "center",
        position: "relative",
      }}>
        <div style={{ height: "1px", background: `${warm}66`, marginBottom: "16px" }} />

        <h1 style={{
          fontSize: "24px", fontWeight: "900", color: white,
          margin: "0 0 4px", letterSpacing: "2px",
          fontFamily: "'Georgia', serif",
        }}>{cv.name || "Your Name"}</h1>

        <p style={{
          color: warm, fontWeight: "600", fontSize: "11px",
          margin: "0 0 12px", letterSpacing: "1px",
          fontFamily: "Arial, sans-serif",
        }}>{cv.title || "Hospitality Professional"}</p>

        <div style={{
          display: "flex", justifyContent: "center", gap: "16px",
          flexWrap: "wrap", fontSize: "9px", color: "#ddd",
          fontFamily: "Arial, sans-serif",
        }}>
          {cv.email    && <span>✉ {cv.email}</span>}
          {cv.phone    && <span>📞 {cv.phone}</span>}
          {cv.location && <span>📍 {cv.location}</span>}
        </div>

        {(cv.nationality || cv.visaStatus || cv.dob || cv.gender || cv.maritalStatus) && (
          <div style={{
            display: "flex", justifyContent: "center", gap: "12px",
            flexWrap: "wrap", fontSize: "8.5px", color: `${warm}cc`,
            fontFamily: "Arial, sans-serif", marginTop: "6px",
          }}>
            {cv.nationality   && <span>🌍 {cv.nationality}</span>}
            {cv.visaStatus    && <span>🪪 {cv.visaStatus}</span>}
            {cv.dob           && <span>DOB: {cv.dob}</span>}
            {cv.gender        && <span>{cv.gender}</span>}
            {cv.maritalStatus && <span>{cv.maritalStatus}</span>}
          </div>
        )}

        <div style={{ height: "1px", background: `${warm}66`, marginTop: "16px" }} />
      </div>

      {/* ── Body ── */}
      <div style={{ padding: "16px 28px 24px" }}>

        {cv.summary && (
          <>
            <SectionTitle>Professional Profile</SectionTitle>
            <p style={{
              fontSize: "10.5px", lineHeight: "1.8", color: mid,
              margin: "0", textAlign: "center", fontStyle: "italic",
              padding: "0 16px",
            }}>{cv.summary}</p>
          </>
        )}

        {skillList.length > 0 && (
          <>
            <SectionTitle>Core Skills</SectionTitle>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center" }}>
              {skillList.map((s, i) => (
                <span key={i} style={{
                  padding: "3px 12px", background: beige,
                  border: `1px solid ${warm}55`, borderRadius: "20px",
                  fontSize: "9.5px", color: brown, fontFamily: "Arial, sans-serif",
                }}>{s}</span>
              ))}
            </div>
          </>
        )}

        {cv.experience.some(e => e.company) && (
          <>
            <SectionTitle>Work Experience</SectionTitle>
            {cv.experience.filter(e => e.company).map((e, i) => (
              <div key={i} style={{
                marginBottom: "14px", padding: "12px 14px",
                background: white, borderRadius: "8px",
                border: `1px solid ${warm}33`,
                borderLeft: `3px solid ${warm}`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <div style={{ fontSize: "11px", fontWeight: "700", color: dark }}>{e.role}</div>
                    <div style={{ fontSize: "10px", color: warm, fontWeight: "600", marginTop: "1px" }}>
                      {e.company}{e.location ? ` · ${e.location}` : ""}
                    </div>
                  </div>
                  <span style={{
                    fontSize: "9px", color: white, background: brown,
                    padding: "2px 8px", borderRadius: "10px",
                    flexShrink: 0, marginLeft: "8px",
                  }}>{e.period}</span>
                </div>
                {e.points && (
                  <div className="cvp-preview-exp-t9-wrap">
                    {splitExperiencePointsForPreview(e.points).map((line, j) => (
                      <p key={j} className="cvp-preview-exp-t9-line">{j === 0 ? line : `• ${line}`}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {cv.education.some(e => e.school) && (
          <>
            <SectionTitle>Education</SectionTitle>
            {cv.education.filter(e => e.school).map((e, i) => (
              <div key={i} style={{
                marginBottom: "8px", display: "flex",
                justifyContent: "space-between", alignItems: "center",
                padding: "8px 12px", background: beige, borderRadius: "6px",
              }}>
                <div>
                  <div style={{ fontSize: "10.5px", fontWeight: "700", color: dark }}>{e.degree}</div>
                  <div style={{ fontSize: "9.5px", color: subtle }}>{e.school}</div>
                </div>
                <span style={{ fontSize: "9px", color: warm, fontWeight: "700" }}>{e.year}</span>
              </div>
            ))}
          </>
        )}

        {certList.length > 0 && (
          <>
            <SectionTitle>Certifications</SectionTitle>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center" }}>
              {certList.map((c, i) => (
                <span key={i} style={{
                  padding: "3px 10px", background: white,
                  border: `1px solid ${warm}55`, borderRadius: "4px",
                  fontSize: "9.5px", color: mid,
                }}>🏅 {c}</span>
              ))}
            </div>
          </>
        )}

        {techList.length > 0 && (
          <>
            <SectionTitle>Technical Skills</SectionTitle>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px", justifyContent: "center" }}>
              {techList.map((s, i) => (
                <span key={i} style={{
                  padding: "2px 9px", background: beige,
                  borderRadius: "4px", fontSize: "9.5px", color: mid,
                }}>{s}</span>
              ))}
            </div>
          </>
        )}

        {cv.languages && (
          <>
            <SectionTitle>Languages</SectionTitle>
            <p style={{ fontSize: "10.5px", margin: 0, color: mid, textAlign: "center" }}>{cv.languages}</p>
          </>
        )}

        {(cv.availability || cv.drivingLicense || cv.willingToRelocate) && (
          <>
            <SectionTitle>Additional Information</SectionTitle>
            <div style={{ display: "flex", justifyContent: "center", gap: "20px", flexWrap: "wrap", fontSize: "10px", color: mid }}>
              {cv.availability      && <span>📅 {cv.availability}</span>}
              {cv.drivingLicense    && <span>🚗 {cv.drivingLicense}</span>}
              {cv.willingToRelocate && <span>✈️ Relocate: {cv.willingToRelocate}</span>}
            </div>
          </>
        )}

        {cv.references && (
          <>
            <SectionTitle>References</SectionTitle>
            <p style={{ fontSize: "9.5px", color: subtle, fontStyle: "italic", margin: 0, textAlign: "center" }}>{cv.references}</p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── PDF: Hospitality & Service ───────────────────────────────────
export function pdfHospitality(doc, cv, W, M) {
  const fullTextW = W - M * 2;
  const pdfBottomY = PDF_CONTENT_BOTTOM_Y;
  const pdfTopY = PDF_NEW_PAGE_TOP_Y;
  const newPageOpts = {};
  const brown  = [107, 76,  59];
  const warm   = [196, 149, 106];
  const dark   = [44,  24,  16];
  const mid    = [74,  55,  40];
  const subtle = [158, 128, 112];
  // const white  = [255, 255, 255];

  const [br, bg, bb] = brown;
  const [wr, wg, wb] = warm;

  const headerH = 40;
  doc.setFillColor(br, bg, bb);
  doc.rect(0, 0, W, headerH, "F");

  doc.setFillColor(wr, wg, wb);
  doc.rect(0, 0, W, 1.5, "F");
  doc.setFillColor(wr, wg, wb);
  doc.rect(0, headerH - 1, W, 1.5, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20); doc.setFont("helvetica", "bold");
  doc.text(cv.name || "Your Name", W / 2, 13, { align: "center" });

  doc.setTextColor(wr, wg, wb);
  doc.setFontSize(9.5); doc.setFont("helvetica", "normal");
  doc.text((cv.title || "Hospitality Professional").toUpperCase(), W / 2, 19, { align: "center" });

  doc.setFontSize(7.5); doc.setTextColor(220, 220, 220);
  doc.text([cv.email, cv.phone, cv.location].filter(Boolean).join("   |   "), W / 2, 26, { align: "center" });

  const gparts = [];
  if (cv.nationality)   gparts.push(`Nationality: ${cv.nationality}`);
  if (cv.visaStatus)    gparts.push(`Visa: ${cv.visaStatus}`);
  if (cv.dob)           gparts.push(`DOB: ${cv.dob}`);
  if (cv.gender)        gparts.push(cv.gender);
  if (cv.maritalStatus) gparts.push(cv.maritalStatus);
  if (gparts.length) {
    doc.setTextColor(wr, wg, wb); doc.setFontSize(7);
    doc.text(gparts.join("   •   "), W / 2, 33, { align: "center" });
  }

  let y = headerH + 5;

  const sectionTitle = (title) => {
    y = pdfEnsureY(doc, y, 10, pdfBottomY, pdfTopY, newPageOpts);
    doc.setDrawColor(wr, wg, wb); doc.setLineWidth(0.3);
    const titleW = doc.getTextWidth(title.toUpperCase()) + 10;
    const lineStart = (W - titleW) / 2 - 20;
    doc.line(M, y + 1.5, lineStart, y + 1.5);
    doc.line(W - M - (lineStart - M), y + 1.5, W - M, y + 1.5);
    doc.setTextColor(br, bg, bb);
    doc.setFontSize(8); doc.setFont("helvetica", "bold");
    doc.text(title.toUpperCase(), W / 2, y + 2, { align: "center" });
    y += 8;
    doc.setFont("helvetica", "normal"); doc.setTextColor(...mid);
  };

  if (cv.summary) {
    sectionTitle("Professional Profile");
    doc.setFontSize(8.5); doc.setFont("helvetica", "italic"); doc.setTextColor(...mid);
    const lines = pdfSplitText(doc, cv.summary, fullTextW, 8.5);
    y = pdfDrawWrappedLines(doc, lines, W / 2, y, 4.5, pdfBottomY, pdfTopY, { align: "center" }, newPageOpts);
    y += 7;
  }

  if (cv.skills) {
    sectionTitle("Core Skills");
    doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(...mid);
    doc.setFont("helvetica", "normal");
    const lines = pdfSplitText(doc, cv.skills, fullTextW, 8);
    y = pdfDrawWrappedLines(doc, lines, W / 2, y, 4, pdfBottomY, pdfTopY, { align: "center" }, newPageOpts);
    y += 6;
  }

  if (cv.experience.some(e => e.company)) {
    sectionTitle("Work Experience");
    cv.experience.filter(e => e.company).forEach(e => {
      doc.setFillColor(253, 248, 243);
      doc.roundedRect(M, y - 2, W - M * 2, 18, 2, 2, "F");
      doc.setFillColor(wr, wg, wb);
      doc.rect(M, y - 2, 2.5, 18, "F");

      y = pdfEnsureY(doc, y, 18, pdfBottomY, pdfTopY, newPageOpts);
      doc.setFont("helvetica", "bold"); doc.setFontSize(9.5);
      doc.setTextColor(...dark);
      doc.text(e.role || "", M + 6, y + 3);

      doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.setFillColor(br, bg, bb);
      const pw = doc.getTextWidth(e.period || "") + 6;
      doc.roundedRect(W - M - pw, y - 1, pw, 5, 2, 2, "F");
      doc.text(e.period || "", W - M - pw / 2, y + 2.5, { align: "center" });

      y += 7;
      y = pdfEnsureY(doc, y, 5, pdfBottomY, pdfTopY, newPageOpts);
      doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
      doc.setTextColor(wr, wg, wb);
      const compStr = (e.company || "") + (e.location ? ` · ${e.location}` : "");
      doc.text(compStr, M + 6, y); y += 5;

      if (e.points) {
        doc.setFont("helvetica", "normal"); doc.setFontSize(8);
        doc.setTextColor(...mid);
        y = renderPdfExperiencePoints(doc, e.points, M + 6, y, fullTextW - 6, 4, pdfBottomY, pdfTopY, 8, newPageOpts) + 2;
      }
      y += 6;
    });
  }

  if (cv.education.some(e => e.school)) {
    sectionTitle("Education");
    cv.education.filter(e => e.school).forEach(e => {
      y = pdfEnsureY(doc, y, 14, pdfBottomY, pdfTopY, newPageOpts);
      doc.setFillColor(245, 237, 224);
      doc.roundedRect(M, y - 2, W - M * 2, 13, 2, 2, "F");
      doc.setFont("helvetica", "bold"); doc.setFontSize(9.5); doc.setTextColor(...dark);
      doc.text(e.degree || "", M + 6, y + 3);
      doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(wr, wg, wb);
      doc.text(e.year || "", W - M - 4, y + 3, { align: "right" });
      y += 6;
      y = pdfEnsureY(doc, y, 5, pdfBottomY, pdfTopY, newPageOpts);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...subtle);
      doc.text(e.school || "", M + 6, y); y += 9;
    });
  }

  if (cv.certifications) {
    sectionTitle("Certifications");
    doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(...mid);
    const lines = pdfSplitText(doc, cv.certifications, fullTextW, 8);
    y = pdfDrawWrappedLines(doc, lines, W / 2, y, 4, pdfBottomY, pdfTopY, { align: "center" }, newPageOpts);
    y += 5;
  }

  if (cv.technicalSkills) {
    sectionTitle("Technical Skills");
    doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(...mid);
    doc.setFont("helvetica", "normal");
    const lines = pdfSplitText(doc, cv.technicalSkills, fullTextW, 8);
    y = pdfDrawWrappedLines(doc, lines, W / 2, y, 4, pdfBottomY, pdfTopY, { align: "center" }, newPageOpts);
    y += 5;
  }

  if (cv.languages) {
    sectionTitle("Languages");
    doc.setFontSize(8.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...mid);
    y = pdfEnsureY(doc, y, 5, pdfBottomY, pdfTopY, newPageOpts);
    doc.text(cv.languages, W / 2, y, { align: "center" }); y += 8;
  }

  if (cv.availability || cv.drivingLicense || cv.willingToRelocate) {
    sectionTitle("Additional Information");
    const adds = [];
    if (cv.availability)      adds.push(cv.availability);
    if (cv.drivingLicense)    adds.push("License: " + cv.drivingLicense);
    if (cv.willingToRelocate) adds.push("Relocate: " + cv.willingToRelocate);
    doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(...mid);
    doc.setFont("helvetica", "normal");
    const lines = pdfSplitText(doc, adds.join("   •   "), fullTextW, 8);
    y = pdfDrawWrappedLines(doc, lines, W / 2, y, 4, pdfBottomY, pdfTopY, { align: "center" }, newPageOpts);
    y += 8;
  }

  if (cv.references) {
    sectionTitle("References");
    doc.setFont("helvetica", "italic"); doc.setFontSize(8);
    doc.setTextColor(...subtle);
    y = pdfEnsureY(doc, y, 5, pdfBottomY, pdfTopY, newPageOpts);
    doc.text(cv.references, W / 2, y, { align: "center" });
  }
}
