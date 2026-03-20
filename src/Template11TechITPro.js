// ─────────────────────────────────────────────────────────────────
//  TEMPLATE 11 — Tech & IT Pro
//  Dark slate sidebar · clean white right · professional tech feel
//  Target: IT, Software, Engineering, Tech Management in Gulf/GCC
//  Design: Our own take — slate blue sidebar (not teal), accent
//          underline headers, dot-prefixed skills, date badge on
//          right, bold role + muted company treatment
// ─────────────────────────────────────────────────────────────────

export function PreviewTechITPro({ cv, t }) {
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
  const sideW   = "34%";

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
      background: white, borderRadius: "10px", overflow: "hidden",
      fontFamily: "Arial, sans-serif", display: "grid",
      gridTemplateColumns: `${sideW} minmax(0, 1fr)`,
      alignItems: "stretch",
      minHeight: "100%",
    }}>

      {/* ── Left Sidebar (stretches to full row height) ── */}
      <div style={{
        background: slate,
        padding: "24px 14px 24px 16px",
        display: "flex", flexDirection: "column",
        minHeight: "100%",
        alignSelf: "stretch",
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
          <>
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
          </>
        )}

        {/* Technical Skills */}
        {techList.length > 0 && (
          <>
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
          </>
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
      <div style={{ padding: "24px 20px", background: offwhite, minHeight: "100%" }}>

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
              <div key={i} style={{ marginTop: "12px" }}>
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
                  <p style={{ fontSize: "9.5px", color: mid, margin: 0, lineHeight: "1.7" }}>
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
            <MainSection>Education</MainSection>
            {cv.education.filter(e => e.school).map((e, i) => (
              <div key={i} style={{ marginTop: "10px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
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
  const slate  = [30,  45,  69];
  const accent = [74,  144, 217];
  const dark   = [26,  26,  46];
  const mid    = [61,  61,  92];
  const subtle = [122, 122, 154];
 // const white  = [255, 255, 255];

  const [sr, sg, sb] = slate;
  const [ar, ag, ab] = accent;

  const sideW = 65;

  // Sidebar
  doc.setFillColor(sr, sg, sb);
  doc.rect(0, 0, sideW, 297, "F");

  // Accent top bar
  doc.setFillColor(ar, ag, ab);
  doc.rect(0, 0, sideW, 3, "F");

  // Name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13); doc.setFont("helvetica", "bold");
  const nameLines = doc.splitTextToSize(cv.name || "Your Name", sideW - 10);
  doc.text(nameLines, 6, 12);

  // Accent underline
  doc.setFillColor(ar, ag, ab);
  doc.rect(6, 12 + nameLines.length * 5.5, 22, 2, "F");

  // Title
  doc.setTextColor(ar, ag, ab);
  doc.setFontSize(7.5); doc.setFont("helvetica", "normal");
  const titleLines = doc.splitTextToSize(cv.title || "IT Professional", sideW - 10);
  doc.text(titleLines, 6, 12 + nameLines.length * 5.5 + 6);

  let sy = 12 + nameLines.length * 5.5 + titleLines.length * 4.5 + 10;

  const sideSection = (label) => {
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
  if (cv.email) { const l = doc.splitTextToSize(cv.email, sideW - 12); doc.text(l, 6, sy); sy += l.length * 3.5 + 2; }
  if (cv.phone) { doc.text(cv.phone, 6, sy); sy += 5; }
  if (cv.location) { doc.text(cv.location, 6, sy); sy += 6; }

  if (cv.nationality || cv.visaStatus || cv.dob || cv.gender || cv.maritalStatus) {
    sideSection("Personal Info");
    const fields = [cv.nationality, cv.visaStatus, cv.dob, cv.gender, cv.maritalStatus].filter(Boolean);
    fields.forEach(f => {
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
      doc.setFillColor(ar, ag, ab);
      doc.circle(7.5, sy - 1, 1.2, "F");
      doc.setTextColor(207, 216, 220); doc.setFontSize(7.5);
      const sl = doc.splitTextToSize(s.trim(), sideW - 16);
      doc.text(sl, 11, sy); sy += sl.length * 3.5 + 1.5;
    });
    sy += 2;
  }

  if (cv.technicalSkills) {
    sideSection("Tech Stack");
    cv.technicalSkills.split(",").forEach(s => {
      if (!s.trim()) return;
      doc.setTextColor(ar, ag, ab); doc.text("—", 6, sy);
      doc.setTextColor(176, 190, 197);
      const sl = doc.splitTextToSize(s.trim(), sideW - 14);
      doc.text(sl, 11, sy); sy += sl.length * 3.5 + 1.5;
    });
    sy += 2;
  }

  if (cv.languages) {
    sideSection("Languages");
    cv.languages.split(",").forEach(l => {
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
      doc.setTextColor(ar, ag, ab); doc.text("✦", 6, sy);
      doc.setTextColor(176, 190, 197);
      const sl = doc.splitTextToSize(c.trim(), sideW - 14);
      doc.text(sl, 11, sy); sy += sl.length * 3.5 + 2;
    });
    sy += 2;
  }

  if (cv.availability || cv.drivingLicense || cv.willingToRelocate) {
    sideSection("Additional");
    if (cv.availability)      { doc.setTextColor(ar,ag,ab); doc.text("›",6,sy); doc.setTextColor(176,190,197); doc.text(cv.availability,10,sy); sy+=4.5; }
    if (cv.drivingLicense)    { doc.setTextColor(ar,ag,ab); doc.text("›",6,sy); doc.setTextColor(176,190,197); doc.text(cv.drivingLicense,10,sy); sy+=4.5; }
    if (cv.willingToRelocate) { doc.setTextColor(ar,ag,ab); doc.text("›",6,sy); doc.setTextColor(176,190,197); doc.text("Relocate: "+cv.willingToRelocate,10,sy); sy+=4.5; }
  }

  // Right panel
  let y = 10;
  const rx = sideW + 8;
  const rw = W - sideW - 14;

  const mainSection = (title) => {
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
    const sl = doc.splitTextToSize(cv.summary, rw);
    doc.text(sl, rx, y); y += sl.length * 4.5 + 8;
  }

  if (cv.experience.some(e => e.company)) {
    mainSection("Professional Experience");
    cv.experience.filter(e => e.company).forEach(e => {
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
      doc.setFont("helvetica", "italic"); doc.setFontSize(8.5);
      doc.setTextColor(...mid);
      const compStr = (e.company || "") + (e.location ? ` — ${e.location}` : "");
      doc.text(compStr, rx, y); y += 5;

      // Points
      if (e.points) {
        doc.setFont("helvetica", "normal"); doc.setFontSize(8);
        doc.setTextColor(...mid);
        const pl = doc.splitTextToSize(e.points, rw);
        doc.text(pl, rx, y); y += pl.length * 4 + 2;
      }
      y += 5;
    });
  }

  if (cv.education.some(e => e.school)) {
    mainSection("Education");
    cv.education.filter(e => e.school).forEach(e => {
      doc.setFont("helvetica", "bold"); doc.setFontSize(10);
      doc.setTextColor(...dark);
      doc.text(e.degree || "", rx, y);
      doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
      doc.setTextColor(ar, ag, ab);
      doc.text(e.year || "", W - M, y, { align: "right" });
      y += 4.5;
      doc.setFont("helvetica", "italic"); doc.setFontSize(8.5);
      doc.setTextColor(...subtle);
      doc.text(e.school || "", rx, y); y += 9;
    });
  }

  if (cv.references) {
    doc.setDrawColor(ar, ag, ab); doc.setLineWidth(0.2);
    doc.line(rx, y, rx + rw, y); y += 5;
    doc.setFont("helvetica", "italic"); doc.setFontSize(8);
    doc.setTextColor(...subtle);
    doc.text(cv.references, rx, y);
  }
}