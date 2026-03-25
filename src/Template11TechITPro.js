// ─────────────────────────────────────────────────────────────────
//  TEMPLATE 11 — Tech & IT Pro
//  Dark slate sidebar · clean white right · professional tech feel
//  Target: IT, Software, Engineering, Tech Management in Gulf/GCC
//  Design: Our own take — slate blue sidebar (not teal), accent
//          underline headers, dot-prefixed skills, date badge on
//          right, bold role + muted company treatment
// ─────────────────────────────────────────────────────────────────

import { renderPdfExperiencePoints } from "./experiencePointsPdf";
import { splitExperiencePointsForPreview } from "./experiencePointsPreview";
import {
  PDF_CONTENT_BOTTOM_Y,
  PDF_NEW_PAGE_TOP_Y,
  drawNewPage,
  pdfEnsureY,
  pdfDrawWrappedText,
  pdfSplitText,
} from "./pdfA4Layout";
import { resumePageRootBoxStyle } from "./resumePageRootBoxStyle";

export function PreviewTechITPro({ cv, t, mobileMode = false }) {
  const skillList = cv.skills
    ? cv.skills.split(",").map(s => s.trim()).filter(Boolean)
    : [];
  const techList = cv.technicalSkills
    ? cv.technicalSkills.split(",").map(s => s.trim()).filter(Boolean)
    : [];
  const certList = cv.certifications
    ? cv.certifications.split(",").map(s => s.trim()).filter(Boolean)
    : [];

  const slate   = "#1E2D45";   // dark slate blue — our color, not teal
  const accent  = "#4A90D9";   // steel blue accent
  const white   = "#FFFFFF";
  const offwhite= "#F7F9FC";
  const dark    = "#1A1A2E";
  const mid     = "#3D3D5C";
  const subtle  = "#7A7A9A";

  const SideSection = ({ children }) => (
    <div style={{
      fontSize: "8px", fontWeight: "800", letterSpacing: "2px",
      color: accent, textTransform: "uppercase",
      fontFamily: "Arial, sans-serif", marginTop: "16px", marginBottom: "5px",
      paddingBottom: "3px",
      borderBottom: `1px solid ${accent}44`,
    }}>{children}</div>
  );

  const MainSection = ({ children }) => (
    <div style={{
      fontSize: "10px", fontWeight: "800", color: slate,
      textTransform: "uppercase", letterSpacing: "1.5px",
      fontFamily: "Arial, sans-serif",
      margin: "16px 0 4px",
      paddingBottom: "3px",
      borderBottom: `2px solid ${accent}`,
      display: "inline-block",
    }}>{children}</div>
  );

  return (
    <div style={{
      ...resumePageRootBoxStyle(mobileMode),
      background: white,
      fontFamily: "Arial, sans-serif", display: "grid",
      gridTemplateColumns: mobileMode ? "1fr" : "75mm 1fr",
      alignItems: "stretch",
      minHeight: mobileMode ? "100%" : undefined,
      position: "relative",
      textRendering: "optimizeLegibility",
      WebkitFontSmoothing: "antialiased",
    }}>

      {!mobileMode && (
        <div style={{
          position: "absolute",
          top: 0, left: 0,
          width: "75mm",
          height: "100%",
          background: "#1E2D45",
          zIndex: 0,
        }} />
      )}

      {/* ── Left Sidebar (stretches to full row height) ── */}
      <div style={{
        background: slate,
        padding: "24px 14px 24px 16px",
        display: "flex", flexDirection: "column",
        minHeight: "100%",
        alignSelf: "stretch",
        position: "relative",
        zIndex: 1,
      }}>

        {/* Name block */}
        <h1 style={{
          fontSize: "17px", fontWeight: "900", color: white,
          margin: "0 0 4px", lineHeight: "1.2",
          fontFamily: "Arial, sans-serif",
        }}>{cv.name || "Your Name"}</h1>

        {/* Accent underline */}
        <div style={{ width: "36px", height: "3px", background: accent, borderRadius: "2px", marginBottom: "6px" }} />

        <p style={{
          fontSize: "9.5px", color: accent, fontWeight: "600",
          margin: "0 0 14px", lineHeight: "1.4",
        }}>{cv.title || "IT Professional"}</p>

        {/* Contact */}
        <SideSection>Contact</SideSection>
        <div style={{ fontSize: "8.5px", color: "#B0BEC5", lineHeight: "2" }}>
          {cv.email    && <div style={{ wordBreak: "break-all" }}>{cv.email}</div>}
          {cv.phone    && <div>{cv.phone}</div>}
          {cv.location && <div>{cv.location}</div>}
        </div>

        {/* Personal */}
        {(cv.nationality || cv.visaStatus || cv.dob || cv.gender || cv.maritalStatus) && (
          <>
            <SideSection>Personal Info</SideSection>
            <div style={{ fontSize: "8.5px", color: "#B0BEC5", lineHeight: "2" }}>
              {cv.nationality   && <div><span style={{ color: accent }}>›</span> {cv.nationality}</div>}
              {cv.visaStatus    && <div><span style={{ color: accent }}>›</span> {cv.visaStatus}</div>}
              {cv.dob           && <div><span style={{ color: accent }}>›</span> {cv.dob}</div>}
              {cv.gender        && <div><span style={{ color: accent }}>›</span> {cv.gender}</div>}
              {cv.maritalStatus && <div><span style={{ color: accent }}>›</span> {cv.maritalStatus}</div>}
            </div>
          </>
        )}

        {/* Skills */}
        {skillList.length > 0 && (
          <div style={{ pageBreakInside: "avoid", breakInside: "avoid-page" }}>
            <SideSection>Core Skills</SideSection>
            {skillList.map((s, i) => (
              <div key={i} style={{
                fontSize: "8.5px", color: "#CFD8DC",
                marginBottom: "5px", lineHeight: "1.4",
                display: "flex", alignItems: "flex-start", gap: "5px",
              }}>
                <span style={{
                  width: "5px", height: "5px", borderRadius: "50%",
                  background: accent, flexShrink: 0, marginTop: "3px",
                }} />
                {s}
              </div>
            ))}
          </div>
        )}

        {/* Technical Skills */}
        {techList.length > 0 && (
          <div style={{ pageBreakInside: "avoid", breakInside: "avoid-page" }}>
            <SideSection>Tech Stack</SideSection>
            {techList.map((s, i) => (
              <div key={i} style={{
                fontSize: "8px", color: "#B0BEC5",
                marginBottom: "4px", lineHeight: "1.4",
                display: "flex", alignItems: "flex-start", gap: "5px",
              }}>
                <span style={{ color: accent, fontSize: "10px", lineHeight: "1" }}>—</span>
                {s}
              </div>
            ))}
          </div>
        )}

        {/* Languages */}
        {cv.languages && (
          <>
            <SideSection>Languages</SideSection>
            {cv.languages.split(",").map((l, i) => (
              <div key={i} style={{
                fontSize: "8.5px", color: "#B0BEC5",
                marginBottom: "4px", display: "flex", alignItems: "center", gap: "5px",
              }}>
                <span style={{ color: accent }}>›</span> {l.trim()}
              </div>
            ))}
          </>
        )}

        {/* Certifications */}
        {certList.length > 0 && (
          <>
            <SideSection>Certifications</SideSection>
            {certList.map((c, i) => (
              <div key={i} style={{
                fontSize: "8px", color: "#B0BEC5",
                marginBottom: "5px", lineHeight: "1.5",
                display: "flex", alignItems: "flex-start", gap: "5px",
              }}>
                <span style={{ color: accent, flexShrink: 0 }}>✦</span>
                {c}
              </div>
            ))}
          </>
        )}

        {/* Additional */}
        {(cv.availability || cv.drivingLicense || cv.willingToRelocate) && (
          <>
            <SideSection>Additional</SideSection>
            <div style={{ fontSize: "8.5px", color: "#B0BEC5", lineHeight: "2" }}>
              {cv.availability      && <div><span style={{ color: accent }}>›</span> {cv.availability}</div>}
              {cv.drivingLicense    && <div><span style={{ color: accent }}>›</span> {cv.drivingLicense}</div>}
              {cv.willingToRelocate && <div><span style={{ color: accent }}>›</span> Relocate: {cv.willingToRelocate}</div>}
            </div>
          </>
        )}
      </div>

      {/* ── Right Main Panel ── */}
      <div
        className="cvp-preview-right-col"
        style={{
          padding: "24px 20px", background: offwhite, minHeight: "100%",
          position: "relative", zIndex: 1,
        }}
      >

        {/* Summary */}
        {cv.summary && (
          <>
            <MainSection>Professional Summary</MainSection>
            <p style={{
              fontSize: "10px", lineHeight: "1.8", color: mid,
              margin: "8px 0 0",
            }}>{cv.summary}</p>
          </>
        )}

        {/* Experience */}
        {cv.experience.some(e => e.company) && (
          <>
            <MainSection>Professional Experience</MainSection>
            {cv.experience.filter(e => e.company).map((e, i) => (
              <div key={i} style={{
                marginTop: "12px",
                pageBreakInside: "avoid",
                breakInside: "avoid-page",
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                  <span style={{ fontSize: "11px", fontWeight: "800", color: dark }}>{e.role}</span>
                  <span style={{
                    fontSize: "10px", color: "#888888",
                    flexShrink: 0, marginLeft: "auto", textAlign: "right",
                    fontWeight: "400",
                  }}>{e.period}</span>
                </div>
                <div style={{
                  fontSize: "9.5px", color: mid, fontWeight: "500",
                  fontStyle: "italic", margin: "2px 0 5px",
                }}>
                  {e.company}{e.location ? ` — ${e.location}` : ""}
                </div>
                {e.points && (
                  <div className="cvp-preview-exp-t11-wrap">
                    {splitExperiencePointsForPreview(e.points).map((line, j) => (
                      <p key={j} className="cvp-preview-exp-t11-line" style={{ color: mid }}>• {line}</p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {/* Education */}
        {cv.education.some(e => e.school) && (
          <>
            <MainSection>Education</MainSection>
            {cv.education.filter(e => e.school).map((e, i) => (
              <div key={i} style={{
                marginTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                pageBreakInside: "avoid",
                breakInside: "avoid-page",
              }}>
                <div>
                  <div style={{ fontSize: "10.5px", fontWeight: "700", color: dark }}>{e.degree}</div>
                  <div style={{ fontSize: "9.5px", color: subtle, fontStyle: "italic" }}>{e.school}</div>
                </div>
                <span style={{
                  fontSize: "8px", color: accent, fontWeight: "700",
                  flexShrink: 0, marginLeft: "10px",
                }}>{e.year}</span>
              </div>
            ))}
          </>
        )}

        {/* References */}
        {cv.references && (
          <p style={{
            fontSize: "9px", color: subtle, fontStyle: "italic",
            margin: "16px 0 0", paddingTop: "10px",
            borderTop: `1px solid ${accent}33`,
          }}>{cv.references}</p>
        )}
      </div>
    </div>
  );
}

// ─── PDF: Tech & IT Pro ───────────────────────────────────────────
export function pdfTechITPro(doc, cv, W, M) {
  const pdfBottomY = PDF_CONTENT_BOTTOM_Y;
  const pdfTopY = PDF_NEW_PAGE_TOP_Y;
  const slate  = [30,  45,  69];
  const accent = [74,  144, 217];
  const dark   = [26,  26,  46];
  const mid    = [61,  61,  92];
  const subtle = [122, 122, 154];
 // const white  = [255, 255, 255];

  const [sr, sg, sb] = slate;
  const [ar, ag, ab] = accent;

  const sideW = 65;
  const newPageOpts = {
    sidebarWidth: sideW,
    sidebarColor: [sr, sg, sb],
    accentColor: [ar, ag, ab],
  };
  /** Sidebar: text from x=6 to column edge at sideW-5 */
  const sideTextW = sideW - 6 - 5;
  /** Bullet lines with body text starting at x=11 */
  const sideSkillW = sideW - 5 - 11;

  const redrawSidebar = () => {
    doc.setFillColor(sr, sg, sb);
    doc.rect(0, 0, sideW, 297, "F");
    doc.setFillColor(ar, ag, ab);
    doc.rect(0, 0, sideW, 3, "F");
  };
  redrawSidebar();

  const ensureSy = (sy, lh) => {
    if (sy + lh > pdfBottomY) {
      drawNewPage(doc, newPageOpts);
      return pdfTopY;
    }
    return sy;
  };
  const drawSideWrapped = (lines, x, sy, lh) => {
    let yy = sy;
    lines.forEach((line) => {
      yy = ensureSy(yy, lh);
      doc.text(line, x, yy);
      yy += lh;
    });
    return yy;
  };

  // Name
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFont("helvetica", "normal");
  const nameLines = pdfSplitText(doc, cv.name || "Your Name", sideTextW, 13);
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold");
  let sy = drawSideWrapped(nameLines, 6, 12, 5.5);

  // Accent underline
  doc.setFillColor(ar, ag, ab);
  doc.rect(6, sy + 2, 22, 2, "F");

  // Title
  doc.setTextColor(ar, ag, ab);
  doc.setFont("helvetica", "normal");
  const titleLines = pdfSplitText(doc, cv.title || "IT Professional", sideTextW, 7.5);
  doc.setTextColor(ar, ag, ab); doc.setFont("helvetica", "normal");
  sy = drawSideWrapped(titleLines, 6, sy + 6, 4.5);

  sy += 10;

  const sideSection = (label) => {
    sy = ensureSy(sy, 4);
    doc.setTextColor(ar, ag, ab);
    doc.setFontSize(6.5); doc.setFont("helvetica", "bold");
    doc.text(label.toUpperCase(), 6, sy);
    sy += 1.5;
    doc.setDrawColor(ar, ag, ab); doc.setLineWidth(0.2);
    doc.line(6, sy, sideW - 5, sy);
    sy += 4;
    doc.setTextColor(180, 190, 200);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
  };

  sideSection("Contact");
  if (cv.email) { doc.setFont("helvetica", "normal"); const l = pdfSplitText(doc, cv.email, sideTextW, 7.5); sy = drawSideWrapped(l, 6, sy, 3.5); sy += 2; }
  if (cv.phone) { sy = ensureSy(sy, 5); doc.text(cv.phone, 6, sy); sy += 5; }
  if (cv.location) { sy = ensureSy(sy, 6); doc.text(cv.location, 6, sy); sy += 6; }

  if (cv.nationality || cv.visaStatus || cv.dob || cv.gender || cv.maritalStatus) {
    sideSection("Personal Info");
    const fields = [cv.nationality, cv.visaStatus, cv.dob, cv.gender, cv.maritalStatus].filter(Boolean);
    fields.forEach(f => {
      sy = ensureSy(sy, 4.5);
      doc.setTextColor(ar, ag, ab); doc.text("›", 6, sy);
      doc.setTextColor(180, 190, 200); doc.text(f, 10, sy);
      sy += 4.5;
    });
    sy += 2;
  }

  if (cv.skills) {
    sideSection("Core Skills");
    cv.skills.split(",").forEach(s => {
      if (!s.trim()) return;
      sy = ensureSy(sy, 5);
      doc.setFillColor(ar, ag, ab);
      doc.circle(7.5, sy - 1, 1.2, "F");
      doc.setTextColor(207, 216, 220); doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      const sl = pdfSplitText(doc, s.trim(), sideSkillW, 7.5);
      sy = drawSideWrapped(sl, 11, sy, 3.5); sy += 1.5;
    });
    sy += 2;
  }

  if (cv.technicalSkills) {
    sideSection("Tech Stack");
    cv.technicalSkills.split(",").forEach(s => {
      if (!s.trim()) return;
      sy = ensureSy(sy, 5);
      doc.setTextColor(ar, ag, ab); doc.text("—", 6, sy);
      doc.setTextColor(176, 190, 197);
      doc.setFont("helvetica", "normal");
      const sl = pdfSplitText(doc, s.trim(), sideSkillW, 7.5);
      sy = drawSideWrapped(sl, 11, sy, 3.5); sy += 1.5;
    });
    sy += 2;
  }

  if (cv.languages) {
    sideSection("Languages");
    cv.languages.split(",").forEach(l => {
      sy = ensureSy(sy, 4.5);
      doc.setTextColor(ar, ag, ab); doc.text("›", 6, sy);
      doc.setTextColor(176, 190, 197); doc.text(l.trim(), 10, sy);
      sy += 4.5;
    });
    sy += 2;
  }

  if (cv.certifications) {
    sideSection("Certifications");
    cv.certifications.split(",").forEach(c => {
      if (!c.trim()) return;
      sy = ensureSy(sy, 5);
      doc.setTextColor(ar, ag, ab); doc.text("✦", 6, sy);
      doc.setTextColor(176, 190, 197);
      doc.setFont("helvetica", "normal");
      const sl = pdfSplitText(doc, c.trim(), sideSkillW, 7.5);
      sy = drawSideWrapped(sl, 11, sy, 3.5); sy += 2;
    });
    sy += 2;
  }

  if (cv.availability || cv.drivingLicense || cv.willingToRelocate) {
    sideSection("Additional");
    if (cv.availability)      { sy = ensureSy(sy, 4.5); doc.setTextColor(ar,ag,ab); doc.text("›",6,sy); doc.setTextColor(176,190,197); doc.text(cv.availability,10,sy); sy+=4.5; }
    if (cv.drivingLicense)    { sy = ensureSy(sy, 4.5); doc.setTextColor(ar,ag,ab); doc.text("›",6,sy); doc.setTextColor(176,190,197); doc.text(cv.drivingLicense,10,sy); sy+=4.5; }
    if (cv.willingToRelocate) { sy = ensureSy(sy, 4.5); doc.setTextColor(ar,ag,ab); doc.text("›",6,sy); doc.setTextColor(176,190,197); doc.text("Relocate: "+cv.willingToRelocate,10,sy); sy+=4.5; }
  }

  // Right panel
  let y = 10;
  const rx = sideW + 8;
  const rw = W - M - rx;

  const mainSection = (title) => {
    y = pdfEnsureY(doc, y, 8, pdfBottomY, pdfTopY, newPageOpts);
    doc.setTextColor(sr, sg, sb);
    doc.setFontSize(8); doc.setFont("helvetica", "bold");
    doc.text(title.toUpperCase(), rx, y);
    y += 1.5;
    doc.setDrawColor(ar, ag, ab); doc.setLineWidth(0.8);
    doc.line(rx, y, rx + rw, y);
    y += 6;
    doc.setFont("helvetica", "normal"); doc.setTextColor(...mid);
  };

  if (cv.summary) {
    mainSection("Professional Summary");
    doc.setFontSize(8.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...mid);
    doc.setFont("helvetica", "normal");
    y = pdfDrawWrappedText(doc, cv.summary, rw, 8.5, rx, y, 4.5, pdfBottomY, pdfTopY, undefined, newPageOpts);
    y += 8;
  }

  if (cv.experience.some(e => e.company)) {
    mainSection("Professional Experience");
    cv.experience.filter(e => e.company).forEach(e => {
      y = pdfEnsureY(doc, y, 5, pdfBottomY, pdfTopY, newPageOpts);
      // Role
      doc.setFont("helvetica", "bold"); doc.setFontSize(10);
      doc.setTextColor(...dark);
      doc.text(e.role || "", rx, y);

      // Period — plain text, right-aligned (no pill)
      doc.setFont("helvetica", "normal"); doc.setFontSize(7);
      doc.setTextColor(136, 136, 136);
      doc.text(e.period || "", W - M, y, { align: "right" });
      y += 5;

      // Company — plain body colour (no accent/link styling)
      y = pdfEnsureY(doc, y, 5, pdfBottomY, pdfTopY, newPageOpts);
      doc.setFont("helvetica", "italic"); doc.setFontSize(8.5);
      doc.setTextColor(...mid);
      const compStr = (e.company || "") + (e.location ? ` — ${e.location}` : "");
      doc.text(compStr, rx, y); y += 5;

      // Points
      if (e.points) {
        doc.setFont("helvetica", "normal"); doc.setFontSize(8);
        doc.setTextColor(...mid);
        y = renderPdfExperiencePoints(doc, e.points, rx, y, rw, 4, pdfBottomY, pdfTopY, 8) + 2;
      }
      y += 5;
    });
  }

  if (cv.education.some(e => e.school)) {
    mainSection("Education");
    cv.education.filter(e => e.school).forEach(e => {
      y = pdfEnsureY(doc, y, 5, pdfBottomY, pdfTopY, newPageOpts);
      doc.setFont("helvetica", "bold"); doc.setFontSize(10);
      doc.setTextColor(...dark);
      doc.text(e.degree || "", rx, y);
      doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
      doc.setTextColor(ar, ag, ab);
      doc.text(e.year || "", W - M, y, { align: "right" });
      y += 4.5;
      y = pdfEnsureY(doc, y, 5, pdfBottomY, pdfTopY, newPageOpts);
      doc.setFont("helvetica", "italic"); doc.setFontSize(8.5);
      doc.setTextColor(...subtle);
      doc.text(e.school || "", rx, y); y += 9;
    });
  }

  if (cv.references) {
    y = pdfEnsureY(doc, y, 8, pdfBottomY, pdfTopY, newPageOpts);
    doc.setDrawColor(ar, ag, ab); doc.setLineWidth(0.2);
    doc.line(rx, y, rx + rw, y); y += 5;
    y = pdfEnsureY(doc, y, 5, pdfBottomY, pdfTopY, newPageOpts);
    doc.setFont("helvetica", "italic"); doc.setFontSize(8);
    doc.setTextColor(...subtle);
    doc.text(cv.references, rx, y);
  }
}