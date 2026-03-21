// ─────────────────────────────────────────────────────────────────
//  TEMPLATE 5 — Gulf Executive
//  Dark navy header · gold rule accents · single column · senior roles
//  Inspired by "Polished" / "Henry Jackson" dark style from reference images
//  ATS-friendly: clean reading order, no tables, no columns in main body
// ─────────────────────────────────────────────────────────────────

import { renderPdfExperiencePoints } from "./experiencePointsPdf";
import {
  PDF_CONTENT_BOTTOM_Y,
  PDF_NEW_PAGE_TOP_Y,
  pdfEnsureY,
  pdfSplitText,
  pdfDrawWrappedLines,
  pdfDrawWrappedText,
} from "./pdfA4Layout";

export function PreviewGulfExecutive({ cv, t }) {
  const skillList = cv.skills
    ? cv.skills.split(",").map(s => s.trim()).filter(Boolean)
    : [];
  const techList = cv.technicalSkills
    ? cv.technicalSkills.split(",").map(s => s.trim()).filter(Boolean)
    : [];
  const certList = cv.certifications
    ? cv.certifications.split(",").map(s => s.trim()).filter(Boolean)
    : [];

  const gold   = "#C9A84C";
  const navy   = "#0D1B2A";
  const slate  = "#1C2E40";
  const light  = "#F5F0E8";
  const body   = "#2C2C2C";
  const subtle = "#666666";

  const SectionTitle = ({ children }) => (
    <div style={{ margin: "14px 0 8px" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "10px",
      }}>
        <div style={{ width: "28px", height: "2px", background: gold }} />
        <span style={{
          fontSize: "9px", fontWeight: "800", letterSpacing: "2.5px",
          color: gold, textTransform: "uppercase", fontFamily: "Georgia, serif",
        }}>{children}</span>
        <div style={{ flex: 1, height: "1px", background: `${gold}33` }} />
      </div>
    </div>
  );

  const ExpEntry = ({ e }) => (
    <div style={{ marginBottom: "13px", paddingLeft: "14px", borderLeft: `2px solid ${gold}55` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: "12px", fontWeight: "700", color: navy, fontFamily: "Georgia, serif" }}>{e.role}</div>
          <div style={{ fontSize: "10px", color: gold, fontWeight: "600", marginTop: "1px" }}>
            {e.company}{e.location ? ` · ${e.location}` : ""}
          </div>
        </div>
        <span style={{
          fontSize: "9px", color: "#fff", background: slate,
          padding: "2px 7px", borderRadius: "3px", whiteSpace: "nowrap",
          marginLeft: "8px", flexShrink: 0,
        }}>{e.period}</span>
      </div>
      {e.points && (
        <div className="cvp-preview-exp-t5-wrap">
          {!/[•\n]/.test(String(e.points)) ? (
            <p className="cvp-preview-exp-t5-line">{String(e.points).trim()}</p>
          ) : (
            String(e.points).split(/\n|•/).map((l) => l.trim()).filter(Boolean).map((line, j) => (
              <p key={j} className="cvp-preview-exp-t5-line">{j === 0 ? line : `• ${line}`}</p>
            ))
          )}
        </div>
      )}
    </div>
  );

  return (
    <div style={{
      background: "#fff", borderRadius: "10px", overflow: "hidden",
      fontFamily: "'Georgia', serif", color: body, fontSize: "11px",
    }}>
      {/* ── Header ── */}
      <div style={{ background: navy, padding: "26px 28px 20px", position: "relative", overflow: "hidden" }}>
        {/* decorative corner lines */}
        <div style={{ position: "absolute", top: 0, right: 0, width: "80px", height: "80px", borderBottom: `1px solid ${gold}22`, borderLeft: `1px solid ${gold}22` }} />
        <div style={{ position: "absolute", bottom: 0, left: 0, width: "50px", height: "50px", borderTop: `1px solid ${gold}22`, borderRight: `1px solid ${gold}22` }} />

        <h1 style={{
          fontSize: "26px", fontWeight: "900", color: "#fff",
          margin: "0 0 3px", letterSpacing: "1px", fontFamily: "Georgia, serif",
        }}>{cv.name || "Your Name"}</h1>

        <p style={{
          color: gold, fontWeight: "600", fontSize: "12px",
          margin: "0 0 12px", letterSpacing: "0.5px",
        }}>{cv.title || "Senior Executive"}</p>

        {/* Contact row */}
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "9.5px", color: "#aab" }}>
          {cv.email    && <span>✉ {cv.email}</span>}
          {cv.phone    && <span>📞 {cv.phone}</span>}
          {cv.location && <span>📍 {cv.location}</span>}
        </div>

        {/* Gulf info row */}
        {(cv.nationality || cv.visaStatus || cv.dob || cv.gender || cv.maritalStatus) && (
          <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", fontSize: "9px", color: `${gold}bb`, marginTop: "6px" }}>
            {cv.nationality   && <span>🌍 {cv.nationality}</span>}
            {cv.visaStatus    && <span>🪪 {cv.visaStatus}</span>}
            {cv.dob           && <span>DOB: {cv.dob}</span>}
            {cv.gender        && <span>{cv.gender}</span>}
            {cv.maritalStatus && <span>{cv.maritalStatus}</span>}
          </div>
        )}

        {/* Gold rule */}
        <div style={{ marginTop: "16px", height: "1px", background: `linear-gradient(90deg, ${gold}, ${gold}00)` }} />
      </div>

      {/* ── Body ── */}
      <div style={{ padding: "16px 28px 20px", background: light }}>

        {/* Summary */}
        {cv.summary && (
          <>
            <SectionTitle>Executive Summary</SectionTitle>
            <p style={{
              fontSize: "10.5px", lineHeight: "1.75", color: body,
              margin: 0, fontStyle: "italic",
              borderLeft: `3px solid ${gold}`, paddingLeft: "10px",
            }}>{cv.summary}</p>
          </>
        )}

        {/* Core Skills — tag cloud */}
        {skillList.length > 0 && (
          <>
            <SectionTitle>Core Competencies</SectionTitle>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
              {skillList.map((s, i) => (
                <span key={i} style={{
                  padding: "3px 10px", background: navy,
                  color: gold, fontSize: "9.5px", fontWeight: "600",
                  borderRadius: "3px", letterSpacing: "0.3px",
                }}>{s}</span>
              ))}
            </div>
          </>
        )}

        {/* Experience */}
        {cv.experience.some(e => e.company) && (
          <>
            <SectionTitle>Professional Experience</SectionTitle>
            {cv.experience.filter(e => e.company).map((e, i) => (
              <ExpEntry key={i} e={e} />
            ))}
          </>
        )}

        {/* Education */}
        {cv.education.some(e => e.school) && (
          <>
            <SectionTitle>Education</SectionTitle>
            {cv.education.filter(e => e.school).map((e, i) => (
              <div key={i} style={{ marginBottom: "8px", display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: "11px", fontWeight: "700", color: navy }}>{e.degree}</div>
                  <div style={{ fontSize: "10px", color: subtle }}>{e.school}</div>
                </div>
                <span style={{ fontSize: "9px", color: gold, fontWeight: "600" }}>{e.year}</span>
              </div>
            ))}
          </>
        )}

        {/* Certifications */}
        {certList.length > 0 && (
          <>
            <SectionTitle>Certifications</SectionTitle>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
              {certList.map((c, i) => (
                <span key={i} style={{
                  padding: "2px 9px", background: `${gold}18`,
                  border: `1px solid ${gold}55`, borderRadius: "3px",
                  fontSize: "9.5px", color: body,
                }}>{c}</span>
              ))}
            </div>
          </>
        )}

        {/* Technical Skills */}
        {techList.length > 0 && (
          <>
            <SectionTitle>Technical Skills</SectionTitle>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
              {techList.map((s, i) => (
                <span key={i} style={{
                  padding: "2px 8px", background: "#e8e8e8",
                  borderRadius: "3px", fontSize: "9.5px", color: body,
                }}>{s}</span>
              ))}
            </div>
          </>
        )}

        {/* Languages */}
        {cv.languages && (
          <>
            <SectionTitle>Languages</SectionTitle>
            <p style={{ fontSize: "10.5px", margin: 0, color: body }}>{cv.languages}</p>
          </>
        )}

        {/* Additional Info */}
        {(cv.availability || cv.drivingLicense || cv.willingToRelocate) && (
          <>
            <SectionTitle>Additional Information</SectionTitle>
            <div style={{ display: "flex", gap: "18px", flexWrap: "wrap", fontSize: "10px", color: subtle }}>
              {cv.availability      && <span>📅 {cv.availability}</span>}
              {cv.drivingLicense    && <span>🚗 License: {cv.drivingLicense}</span>}
              {cv.willingToRelocate && <span>✈️ Relocate: {cv.willingToRelocate}</span>}
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

// ─── PDF: Gulf Executive ──────────────────────────────────────────
export function pdfGulfExecutive(doc, cv, W, M) {
  const fullTextW = W - M * 2;
  const pdfBottomY = PDF_CONTENT_BOTTOM_Y;
  const pdfTopY = PDF_NEW_PAGE_TOP_Y;
  const newPageOpts = {};
  const gold  = [201, 168, 76];
  const navy  = [13,  27,  42];
  const body  = [44,  44,  44];
  const subtle= [102, 102, 102];

  const [gr, gg, gb] = gold;
  const [nr, ng, nb] = navy;

  // Header block (≥35mm, full width from y=0)
  const headerH = 42;
  doc.setFillColor(nr, ng, nb);
  doc.rect(0, 0, W, headerH, "F");

  // Gold bottom rule on header
  doc.setFillColor(gr, gg, gb);
  doc.rect(0, 41, W, 1, "F");

  // Name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20); doc.setFont("helvetica", "bold");
  doc.text(cv.name || "Your Name", M, 13);

  // Title
  doc.setTextColor(gr, gg, gb);
  doc.setFontSize(10); doc.setFont("helvetica", "bolditalic");
  doc.text(cv.title || "Senior Executive", M, 20);

  // Contact
  doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
  doc.setTextColor(170, 170, 187);
  doc.text([cv.email, cv.phone, cv.location].filter(Boolean).join("   |   "), M, 27);

  // Gulf info
  const gparts = [];
  if (cv.nationality)   gparts.push(`Nationality: ${cv.nationality}`);
  if (cv.visaStatus)    gparts.push(`Visa: ${cv.visaStatus}`);
  if (cv.dob)           gparts.push(`DOB: ${cv.dob}`);
  if (cv.gender)        gparts.push(cv.gender);
  if (cv.maritalStatus) gparts.push(cv.maritalStatus);
  if (gparts.length) {
    doc.setTextColor(gr, gg, gb);
    doc.setFontSize(7);
    doc.text(gparts.join("   •   "), M, 34);
  }

  let y = headerH + 5;

  const sectionTitle = (title) => {
    y = pdfEnsureY(doc, y, 10, pdfBottomY, pdfTopY, newPageOpts);
    // gold dash + label + faint rule
    doc.setFillColor(gr, gg, gb);
    doc.rect(M, y, 8, 1.2, "F");
    doc.setTextColor(gr, gg, gb);
    doc.setFontSize(7.5); doc.setFont("helvetica", "bold");
    doc.text(title.toUpperCase(), M + 11, y + 1);
    doc.setDrawColor(gr, gg, gb); doc.setLineWidth(0.2);
    const textW = doc.getTextWidth(title.toUpperCase());
    doc.line(M + 11 + textW + 3, y + 0.5, W - M, y + 0.5);
    y += 6;
    doc.setFont("helvetica", "normal"); doc.setTextColor(...body);
  };

  if (cv.summary) {
    sectionTitle("Executive Summary");
    doc.setFontSize(8.5); doc.setFont("helvetica", "italic");
    doc.setTextColor(...body);
    const sumLines = pdfSplitText(doc, cv.summary, fullTextW - 4, 8.5);
    const sumLineH = 4.5;
    y = pdfEnsureY(doc, y, sumLineH, pdfBottomY, pdfTopY, newPageOpts);
    doc.setDrawColor(gr, gg, gb); doc.setLineWidth(0.8);
    doc.line(M, y, M, y + Math.max(12, sumLines.length * sumLineH));
    y = pdfDrawWrappedLines(doc, sumLines, M + 4, y, sumLineH, pdfBottomY, pdfTopY, undefined, newPageOpts);
    y += 7;
  }

  if (cv.skills) {
    sectionTitle("Core Competencies");
    doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(...body);
    doc.setFont("helvetica", "normal");
    y = pdfDrawWrappedText(doc, cv.skills, fullTextW, 8, M, y, 4, pdfBottomY, pdfTopY, undefined, newPageOpts);
    y += 6;
  }

  if (cv.experience.some(e => e.company)) {
    sectionTitle("Professional Experience");
    cv.experience.filter(e => e.company).forEach(e => {
      y = pdfEnsureY(doc, y, 16, pdfBottomY, pdfTopY, newPageOpts);
      // left accent bar
      doc.setFillColor(gr, gg, gb);
      doc.rect(M, y - 1, 1.5, 14, "F");

      doc.setFont("helvetica", "bold"); doc.setFontSize(9.5);
      doc.setTextColor(...navy);
      const roleBase = pdfEnsureY(doc, y + 2, 4.5, pdfBottomY, pdfTopY, newPageOpts);
      doc.text(e.role || "", M + 5, roleBase);

      doc.setFont("helvetica", "italic"); doc.setFontSize(7.5);
      doc.setTextColor(...subtle);
      doc.text(e.period || "", W - M, roleBase, { align: "right" });

      y += 5;
      doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
      doc.setTextColor(gr, gg, gb);
      const compStr = (e.company || "") + (e.location ? ` · ${e.location}` : "");
      const compBase = pdfEnsureY(doc, y, 5, pdfBottomY, pdfTopY, newPageOpts);
      doc.text(compStr, M + 5, compBase);
      y = compBase + 5;

      if (e.points) {
        doc.setFont("helvetica", "normal"); doc.setFontSize(8);
        doc.setTextColor(...body);
        y = renderPdfExperiencePoints(doc, e.points, M + 5, y, fullTextW - 5, 4, pdfBottomY, pdfTopY, 8, newPageOpts) + 2;
      }
      y += 4;
    });
  }

  if (cv.education.some(e => e.school)) {
    sectionTitle("Education");
    cv.education.filter(e => e.school).forEach(e => {
      y = pdfEnsureY(doc, y, 9, pdfBottomY, pdfTopY, newPageOpts);
      doc.setFont("helvetica", "bold"); doc.setFontSize(9.5);
      doc.setTextColor(...navy);
      doc.text(e.degree || "", M, y);
      doc.setFont("helvetica", "italic"); doc.setFontSize(7.5);
      doc.setTextColor(...subtle);
      doc.text(e.year || "", W - M, y, { align: "right" });
      y += 5;
      y = pdfEnsureY(doc, y, 5, pdfBottomY, pdfTopY, newPageOpts);
      doc.setFont("helvetica", "normal"); doc.setFontSize(8);
      doc.text(e.school || "", M, y);
      y += 8;
    });
  }

  if (cv.certifications) {
    sectionTitle("Certifications");
    doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(...body);
    doc.setFont("helvetica", "normal");
    y = pdfDrawWrappedText(doc, cv.certifications, fullTextW, 8, M, y, 4, pdfBottomY, pdfTopY, undefined, newPageOpts);
    y += 5;
  }

  if (cv.technicalSkills) {
    sectionTitle("Technical Skills");
    doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(...body);
    doc.setFont("helvetica", "normal");
    y = pdfDrawWrappedText(doc, cv.technicalSkills, fullTextW, 8, M, y, 4, pdfBottomY, pdfTopY, undefined, newPageOpts);
    y += 5;
  }

  if (cv.languages) {
    sectionTitle("Languages");
    doc.setFontSize(8.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...body);
    y = pdfEnsureY(doc, y, 5, pdfBottomY, pdfTopY, newPageOpts);
    doc.text(cv.languages, M, y);
    y += 8;
  }

  if (cv.availability || cv.drivingLicense || cv.willingToRelocate) {
    sectionTitle("Additional Information");
    const adds = [];
    if (cv.availability)      adds.push(cv.availability);
    if (cv.drivingLicense)    adds.push("Driving License: " + cv.drivingLicense);
    if (cv.willingToRelocate) adds.push("Willing to Relocate: " + cv.willingToRelocate);
    doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(...body);
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