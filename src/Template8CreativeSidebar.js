// ─────────────────────────────────────────────────────────────────
//  TEMPLATE 8 — Creative Sidebar
//  Bold coral/charcoal · wide left sidebar · modern asymmetric
//  Target: Marketing, Sales, Real Estate, Creative roles in Gulf
//  Design: Strong typographic hierarchy, photo placeholder,
//          bold name treatment, skills with progress bars
// ─────────────────────────────────────────────────────────────────

export function PreviewCreativeSidebar({ cv, t }) {
  const skillList = cv.skills
    ? cv.skills.split(",").map(s => s.trim()).filter(Boolean)
    : [];
  const techList = cv.technicalSkills
    ? cv.technicalSkills.split(",").map(s => s.trim()).filter(Boolean)
    : [];
  const certList = cv.certifications
    ? cv.certifications.split(",").map(s => s.trim()).filter(Boolean)
    : [];

  const coral  = "#E8533F";
  const dark   = "#2B2B2B";
  const charco = "#3D3D3D";
  const subtle = "#888888";
  const light  = "#FFF8F7";
  const white  = "#FFFFFF";
  const sideW  = "32%";

  const SideLabel = ({ children }) => (
    <div style={{
      fontSize: "8px", fontWeight: "900", letterSpacing: "2px",
      color: coral, textTransform: "uppercase", fontFamily: "Arial, sans-serif",
      marginBottom: "6px", marginTop: "14px",
      paddingBottom: "3px", borderBottom: `1px solid ${coral}44`,
    }}>{children}</div>
  );

  const MainTitle = ({ children }) => (
    <div style={{
      fontSize: "9px", fontWeight: "800", letterSpacing: "1.8px",
      color: coral, textTransform: "uppercase", fontFamily: "Arial, sans-serif",
      margin: "14px 0 6px", display: "flex", alignItems: "center", gap: "8px",
    }}>
      {children}
      <div style={{ flex: 1, height: "1px", background: `${coral}33` }} />
    </div>
  );

  return (
    <div style={{
      background: white, borderRadius: "10px", overflow: "hidden",
      fontFamily: "Arial, sans-serif", color: charco,
      fontSize: "10px", display: "flex", minHeight: "500px",
    }}>
      {/* ── Left Sidebar ── */}
      <div style={{
        width: sideW, background: dark, padding: "24px 16px",
        display: "flex", flexDirection: "column",
      }}>
        {/* Photo placeholder */}
        <div style={{
          width: "70px", height: "70px", borderRadius: "50%",
          background: coral, display: "flex", alignItems: "center",
          justifyContent: "center", marginBottom: "14px",
          fontSize: "24px", fontWeight: "900", color: white,
          border: `3px solid ${coral}44`,
        }}>
          {(cv.name || "?")[0].toUpperCase()}
        </div>

        {/* Name in sidebar */}
        <h1 style={{
          fontSize: "16px", fontWeight: "900", color: white,
          margin: "0 0 2px", lineHeight: "1.2",
        }}>{cv.name || "Your Name"}</h1>
        <p style={{
          color: coral, fontWeight: "700", fontSize: "9.5px",
          margin: "0 0 14px", lineHeight: "1.4",
        }}>{cv.title || "Job Title"}</p>

        {/* Coral divider */}
        <div style={{ height: "2px", background: coral, marginBottom: "14px", width: "40px" }} />

        {/* Contact */}
        <SideLabel>Contact</SideLabel>
        <div style={{ fontSize: "9px", color: "#ccc", lineHeight: "1.9" }}>
          {cv.email    && <div style={{ wordBreak: "break-all" }}>✉ {cv.email}</div>}
          {cv.phone    && <div>📞 {cv.phone}</div>}
          {cv.location && <div>📍 {cv.location}</div>}
        </div>

        {/* Personal Info */}
        {(cv.nationality || cv.visaStatus || cv.dob || cv.gender || cv.maritalStatus) && (
          <>
            <SideLabel>Personal</SideLabel>
            <div style={{ fontSize: "9px", color: "#ccc", lineHeight: "1.9" }}>
              {cv.nationality   && <div>🌍 {cv.nationality}</div>}
              {cv.visaStatus    && <div>🪪 {cv.visaStatus}</div>}
              {cv.dob           && <div>📅 {cv.dob}</div>}
              {cv.gender        && <div>👤 {cv.gender}</div>}
              {cv.maritalStatus && <div>💍 {cv.maritalStatus}</div>}
            </div>
          </>
        )}

        {/* Skills with bars */}
        {skillList.length > 0 && (
          <>
            <SideLabel>Core Skills</SideLabel>
            {skillList.slice(0, 8).map((s, i) => (
              <div key={i} style={{ marginBottom: "7px" }}>
                <div style={{ fontSize: "9px", color: "#ddd", marginBottom: "2px" }}>{s}</div>
                <div style={{ height: "3px", background: "#ffffff18", borderRadius: "2px" }}>
                  <div style={{
                    height: "3px", borderRadius: "2px", background: coral,
                    width: `${60 + (i % 5) * 8}%`,
                  }} />
                </div>
              </div>
            ))}
          </>
        )}

        {/* Languages */}
        {cv.languages && (
          <>
            <SideLabel>Languages</SideLabel>
            {cv.languages.split(",").map((l, i) => (
              <div key={i} style={{ fontSize: "9px", color: "#ccc", marginBottom: "4px" }}>
                🌐 {l.trim()}
              </div>
            ))}
          </>
        )}

        {/* Certifications */}
        {certList.length > 0 && (
          <>
            <SideLabel>Certifications</SideLabel>
            {certList.map((c, i) => (
              <div key={i} style={{ fontSize: "8.5px", color: "#ccc", marginBottom: "4px", lineHeight: "1.4" }}>
                🏅 {c}
              </div>
            ))}
          </>
        )}

        {/* Additional */}
        {(cv.availability || cv.drivingLicense || cv.willingToRelocate) && (
          <>
            <SideLabel>Additional</SideLabel>
            <div style={{ fontSize: "9px", color: "#ccc", lineHeight: "1.9" }}>
              {cv.availability      && <div>📅 {cv.availability}</div>}
              {cv.drivingLicense    && <div>🚗 {cv.drivingLicense}</div>}
              {cv.willingToRelocate && <div>✈️ Relocate: {cv.willingToRelocate}</div>}
            </div>
          </>
        )}
      </div>

      {/* ── Right Main Content ── */}
      <div style={{ flex: 1, padding: "24px 20px", background: light }}>

        {/* Summary */}
        {cv.summary && (
          <>
            <MainTitle>About Me</MainTitle>
            <p style={{ fontSize: "10px", lineHeight: "1.75", color: charco, margin: 0 }}>
              {cv.summary}
            </p>
          </>
        )}

        {/* Experience */}
        {cv.experience.some(e => e.company) && (
          <>
            <MainTitle>Work Experience</MainTitle>
            {cv.experience.filter(e => e.company).map((e, i) => (
              <div key={i} style={{ marginBottom: "13px", position: "relative", paddingLeft: "12px" }}>
                {/* coral left border */}
                <div style={{
                  position: "absolute", left: 0, top: "2px",
                  width: "3px", height: "calc(100% - 4px)",
                  background: coral, borderRadius: "2px",
                }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: dark }}>{e.role}</span>
                  <span style={{
                    fontSize: "8.5px", color: coral, fontWeight: "700",
                    flexShrink: 0, marginLeft: "8px",
                  }}>{e.period}</span>
                </div>
                <div style={{ fontSize: "9.5px", color: coral, marginBottom: "3px" }}>
                  {e.company}{e.location ? ` · ${e.location}` : ""}
                </div>
                {e.points && (
                  <p style={{ fontSize: "9.5px", color: charco, margin: 0, lineHeight: "1.6" }}>
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
            <MainTitle>Education</MainTitle>
            {cv.education.filter(e => e.school).map((e, i) => (
              <div key={i} style={{ marginBottom: "9px", display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: "10.5px", fontWeight: "700", color: dark }}>{e.degree}</div>
                  <div style={{ fontSize: "9.5px", color: subtle }}>{e.school}</div>
                </div>
                <span style={{
                  fontSize: "8.5px", background: coral, color: white,
                  padding: "2px 7px", borderRadius: "10px", height: "fit-content",
                  fontWeight: "700", flexShrink: 0, marginLeft: "8px",
                }}>{e.year}</span>
              </div>
            ))}
          </>
        )}

        {/* Technical Skills */}
        {techList.length > 0 && (
          <>
            <MainTitle>Technical Skills</MainTitle>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
              {techList.map((s, i) => (
                <span key={i} style={{
                  padding: "2px 9px", background: white,
                  border: `1px solid ${coral}55`, borderRadius: "4px",
                  fontSize: "9px", color: charco,
                }}>{s}</span>
              ))}
            </div>
          </>
        )}

        {/* References */}
        {cv.references && (
          <p style={{
            fontSize: "9px", color: subtle, fontStyle: "italic",
            margin: "14px 0 0", paddingTop: "10px",
            borderTop: `1px solid ${coral}22`,
          }}>{cv.references}</p>
        )}
      </div>
    </div>
  );
}

// ─── PDF: Creative Sidebar ────────────────────────────────────────
export function pdfCreativeSidebar(doc, cv, W, M) {
  const coral  = [232, 83,  63];
  const dark   = [43,  43,  43];
  const charco = [61,  61,  61];
  const subtle = [136, 136, 136];
  // const white  = [255, 255, 255];

  const [cr, cg, cb] = coral;
  const [dr, dg, db] = dark;

  const sideW = 62;

  // Sidebar background
  doc.setFillColor(dr, dg, db);
  doc.rect(0, 0, sideW, 297, "F");

  // Coral accent bar at top of sidebar
  doc.setFillColor(cr, cg, cb);
  doc.rect(0, 0, sideW, 3, "F");

  // Initial circle
  doc.setFillColor(cr, cg, cb);
  doc.circle(sideW / 2, 16, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12); doc.setFont("helvetica", "bold");
  const initial = (cv.name || "?")[0].toUpperCase();
  doc.text(initial, sideW / 2, 19, { align: "center" });

  // Name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11); doc.setFont("helvetica", "bold");
  const nameLines = doc.splitTextToSize(cv.name || "Your Name", sideW - 10);
  doc.text(nameLines, 5, 32);

  // Title
  doc.setTextColor(cr, cg, cb);
  doc.setFontSize(8); doc.setFont("helvetica", "normal");
  const titleLines = doc.splitTextToSize(cv.title || "Job Title", sideW - 10);
  doc.text(titleLines, 5, 32 + nameLines.length * 5.5);

  // Coral divider
  doc.setFillColor(cr, cg, cb);
  doc.rect(5, 32 + nameLines.length * 5.5 + titleLines.length * 4 + 2, 20, 1.5, "F");

  let sy = 32 + nameLines.length * 5.5 + titleLines.length * 4 + 8;

  const sideSection = (label) => {
    doc.setTextColor(cr, cg, cb);
    doc.setFontSize(7); doc.setFont("helvetica", "bold");
    doc.text(label.toUpperCase(), 5, sy);
    sy += 2;
    doc.setDrawColor(cr, cg, cb); doc.setLineWidth(0.2);
    doc.line(5, sy, sideW - 5, sy);
    sy += 4;
    doc.setTextColor(200, 200, 200);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
  };

  sideSection("Contact");
  if (cv.email) { const l = doc.splitTextToSize(cv.email, sideW - 12); doc.text(l, 5, sy); sy += l.length * 3.5 + 2; }
  if (cv.phone) { doc.text(cv.phone, 5, sy); sy += 5; }
  if (cv.location) { doc.text(cv.location, 5, sy); sy += 7; }

  if (cv.nationality || cv.visaStatus || cv.dob || cv.gender || cv.maritalStatus) {
    sideSection("Personal");
    if (cv.nationality)   { doc.text(cv.nationality, 5, sy); sy += 4.5; }
    if (cv.visaStatus)    { const l = doc.splitTextToSize(cv.visaStatus, sideW - 12); doc.text(l, 5, sy); sy += l.length * 3.5 + 1; }
    if (cv.dob)           { doc.text(`DOB: ${cv.dob}`, 5, sy); sy += 4.5; }
    if (cv.gender)        { doc.text(cv.gender, 5, sy); sy += 4.5; }
    if (cv.maritalStatus) { doc.text(cv.maritalStatus, 5, sy); sy += 6; }
  }

  if (cv.skills) {
    sideSection("Core Skills");
    cv.skills.split(",").forEach((s, i) => {
      if (!s.trim()) return;
      doc.text(s.trim(), 5, sy); sy += 3.5;
      doc.setFillColor(60, 60, 60);
      doc.rect(5, sy, sideW - 12, 2.5, "F");
      doc.setFillColor(cr, cg, cb);
      doc.rect(5, sy, (sideW - 12) * (0.6 + (i % 5) * 0.08), 2.5, "F");
      sy += 5;
    });
    sy += 2;
  }

  if (cv.languages) {
    sideSection("Languages");
    cv.languages.split(",").forEach(l => { doc.text("• " + l.trim(), 5, sy); sy += 4.5; });
    sy += 2;
  }

  if (cv.certifications) {
    sideSection("Certifications");
    cv.certifications.split(",").forEach(c => {
      if (!c.trim()) return;
      const l = doc.splitTextToSize("• " + c.trim(), sideW - 12);
      doc.text(l, 5, sy); sy += l.length * 3.5 + 1.5;
    });
    sy += 2;
  }

  if (cv.availability || cv.drivingLicense || cv.willingToRelocate) {
    sideSection("Additional");
    if (cv.availability)      { doc.text(cv.availability, 5, sy); sy += 4.5; }
    if (cv.drivingLicense)    { doc.text(cv.drivingLicense, 5, sy); sy += 4.5; }
    if (cv.willingToRelocate) { doc.text("Relocate: " + cv.willingToRelocate, 5, sy); sy += 4.5; }
  }

  // Right main content
  let y = 12;
  const rx = sideW + 8;
  const rw = W - sideW - 14;

  const mainTitle = (title) => {
    doc.setTextColor(cr, cg, cb);
    doc.setFontSize(8); doc.setFont("helvetica", "bold");
    doc.text(title.toUpperCase(), rx, y);
    const tw = doc.getTextWidth(title.toUpperCase());
    doc.setDrawColor(cr, cg, cb); doc.setLineWidth(0.2);
    doc.line(rx + tw + 3, y - 0.5, rx + rw, y - 0.5);
    y += 6;
    doc.setFont("helvetica", "normal"); doc.setTextColor(...charco);
  };

  if (cv.summary) {
    mainTitle("About Me");
    doc.setFontSize(8.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...charco);
    const sl = doc.splitTextToSize(cv.summary, rw);
    doc.text(sl, rx, y); y += sl.length * 4.5 + 7;
  }

  if (cv.experience.some(e => e.company)) {
    mainTitle("Work Experience");
    cv.experience.filter(e => e.company).forEach(e => {
      doc.setFillColor(cr, cg, cb);
      doc.rect(rx, y - 1, 2, 12, "F");

      doc.setFont("helvetica", "bold"); doc.setFontSize(9.5);
      doc.setTextColor(...dark);
      doc.text(e.role || "", rx + 5, y + 2);

      doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
      doc.setTextColor(cr, cg, cb);
      doc.text(e.period || "", rx + rw, y + 2, { align: "right" });
      y += 5;

      doc.setFont("helvetica", "normal"); doc.setFontSize(8.5);
      doc.setTextColor(cr, cg, cb);
      const compStr = (e.company || "") + (e.location ? ` · ${e.location}` : "");
      doc.text(compStr, rx + 5, y); y += 5;

      if (e.points) {
        doc.setFont("helvetica", "normal"); doc.setFontSize(8);
        doc.setTextColor(...charco);
        const pl = doc.splitTextToSize(e.points, rw - 7);
        doc.text(pl, rx + 5, y); y += pl.length * 4 + 2;
      }
      y += 4;
    });
  }

  if (cv.education.some(e => e.school)) {
    mainTitle("Education");
    cv.education.filter(e => e.school).forEach(e => {
      doc.setFont("helvetica", "bold"); doc.setFontSize(9.5);
      doc.setTextColor(...dark);
      doc.text(e.degree || "", rx, y);

      doc.setFillColor(cr, cg, cb);
      const yw = doc.getTextWidth(e.year || "") + 6;
      doc.roundedRect(rx + rw - yw, y - 3, yw, 5, 2, 2, "F");
      doc.setTextColor(255, 255, 255); doc.setFontSize(7);
      doc.text(e.year || "", rx + rw - yw / 2, y + 0.5, { align: "center" });
      y += 5;

      doc.setFont("helvetica", "normal"); doc.setFontSize(8);
      doc.setTextColor(...subtle);
      doc.text(e.school || "", rx, y); y += 8;
    });
  }

  if (cv.technicalSkills) {
    mainTitle("Technical Skills");
    doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(...charco);
    const sl = doc.splitTextToSize(cv.technicalSkills, rw);
    doc.text(sl, rx, y); y += sl.length * 4 + 5;
  }

  if (cv.references) {
    doc.setDrawColor(cr, cg, cb); doc.setLineWidth(0.2);
    doc.line(rx, y, rx + rw, y); y += 5;
    doc.setFont("helvetica", "italic"); doc.setFontSize(8);
    doc.setTextColor(...subtle);
    doc.text(cv.references, rx, y);
  }
}
