// ─────────────────────────────────────────────────────────────────
//  TEMPLATE 7 — Compact Pro
//  Dense · info-rich · two-column header · single column body
//  Target: Experienced professionals, 5+ years, multiple roles
//  Design: Maximum information density without feeling cluttered
//          Teal/charcoal palette, tight spacing, tabular skills
// ─────────────────────────────────────────────────────────────────

export function PreviewCompactPro({ cv, t }) {
  const skillList = cv.skills
    ? cv.skills.split(",").map(s => s.trim()).filter(Boolean)
    : [];
  const techList = cv.technicalSkills
    ? cv.technicalSkills.split(",").map(s => s.trim()).filter(Boolean)
    : [];
  const certList = cv.certifications
    ? cv.certifications.split(",").map(s => s.trim()).filter(Boolean)
    : [];

  const teal   = "#0D7377";
  const dark   = "#14213D";
  const mid    = "#3D3D3D";
  const subtle = "#888888";
  const light  = "#F0F7F7";
  const white  = "#FFFFFF";

  const SectionTitle = ({ children }) => (
    <div style={{
      display: "flex", alignItems: "center", gap: "8px",
      margin: "12px 0 7px",
    }}>
      <div style={{ width: "3px", height: "14px", background: teal, borderRadius: "2px" }} />
      <span style={{
        fontSize: "9px", fontWeight: "800", letterSpacing: "1.8px",
        color: dark, textTransform: "uppercase", fontFamily: "Arial, sans-serif",
      }}>{children}</span>
      <div style={{ flex: 1, height: "1px", background: `${teal}33` }} />
    </div>
  );

  return (
    <div style={{
      background: white, borderRadius: "10px", overflow: "hidden",
      fontFamily: "Arial, sans-serif", color: mid, fontSize: "10px",
    }}>
      {/* ── Header — split layout ── */}
      <div style={{ background: dark, padding: "20px 24px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px" }}>
          {/* Left: name + title */}
          <div>
            <h1 style={{
              fontSize: "22px", fontWeight: "900", color: white,
              margin: "0 0 3px", letterSpacing: "0.5px",
            }}>{cv.name || "Your Name"}</h1>
            <p style={{
              color: teal, fontWeight: "700", fontSize: "11px",
              margin: "0 0 8px",
            }}>{cv.title || "Job Title"}</p>
            {/* Gulf info compact */}
            {(cv.nationality || cv.visaStatus || cv.dob) && (
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", fontSize: "8.5px", color: "#aac" }}>
                {cv.nationality && <span>🌍 {cv.nationality}</span>}
                {cv.visaStatus  && <span>🪪 {cv.visaStatus}</span>}
                {cv.dob         && <span>DOB: {cv.dob}</span>}
                {cv.gender      && <span>{cv.gender}</span>}
                {cv.maritalStatus && <span>{cv.maritalStatus}</span>}
              </div>
            )}
          </div>
          {/* Right: contact block */}
          <div style={{
            textAlign: "right", fontSize: "8.5px", color: "#bbc",
            lineHeight: "1.9", flexShrink: 0,
          }}>
            {cv.email    && <div>✉ {cv.email}</div>}
            {cv.phone    && <div>📞 {cv.phone}</div>}
            {cv.location && <div>📍 {cv.location}</div>}
          </div>
        </div>
        {/* Teal bottom accent */}
        <div style={{ marginTop: "14px", height: "2px", background: `linear-gradient(90deg, ${teal}, ${teal}00)` }} />
      </div>

      {/* ── Skills bar — highlighted strip ── */}
      {skillList.length > 0 && (
        <div style={{ background: light, padding: "10px 24px", borderBottom: `1px solid ${teal}22` }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "8px", fontWeight: "800", color: teal, letterSpacing: "1.5px", textTransform: "uppercase", flexShrink: 0 }}>Core Skills</span>
            <div style={{ width: "1px", height: "12px", background: `${teal}44` }} />
            {skillList.map((s, i) => (
              <span key={i} style={{
                fontSize: "9px", color: dark, fontWeight: "600",
                padding: "2px 8px", background: white,
                border: `1px solid ${teal}44`, borderRadius: "3px",
              }}>{s}</span>
            ))}
          </div>
        </div>
      )}

      {/* ── Body ── */}
      <div style={{ padding: "4px 24px 20px" }}>

        {/* Summary — compact */}
        {cv.summary && (
          <>
            <SectionTitle>Professional Summary</SectionTitle>
            <p style={{ fontSize: "10px", lineHeight: "1.7", color: mid, margin: 0 }}>{cv.summary}</p>
          </>
        )}

        {/* Experience — compact entries */}
        {cv.experience.some(e => e.company) && (
          <>
            <SectionTitle>Work Experience</SectionTitle>
            {cv.experience.filter(e => e.company).map((e, i) => (
              <div key={i} style={{ marginBottom: "11px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: teal, flexShrink: 0 }} />
                    <span style={{ fontSize: "11px", fontWeight: "700", color: dark }}>{e.role}</span>
                  </div>
                  <span style={{
                    fontSize: "8.5px", color: white, background: teal,
                    padding: "1px 7px", borderRadius: "10px", flexShrink: 0,
                  }}>{e.period}</span>
                </div>
                <div style={{ fontSize: "9.5px", color: teal, fontWeight: "600", margin: "2px 0 2px 11px" }}>
                  {e.company}{e.location ? ` · ${e.location}` : ""}
                </div>
                {e.points && (
                  <p style={{ fontSize: "9.5px", color: mid, margin: "0 0 0 11px", lineHeight: "1.6" }}>
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
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "6px" }}>
                <div>
                  <span style={{ fontSize: "10.5px", fontWeight: "700", color: dark }}>{e.degree}</span>
                  <span style={{ fontSize: "9.5px", color: subtle }}> · {e.school}</span>
                </div>
                <span style={{ fontSize: "8.5px", color: teal, fontWeight: "700", flexShrink: 0, marginLeft: "8px" }}>{e.year}</span>
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
                  padding: "2px 9px", background: light,
                  border: `1px solid ${teal}55`, borderRadius: "3px",
                  fontSize: "9px", color: dark,
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
                  padding: "2px 8px", background: "#f0f0f0",
                  borderRadius: "3px", fontSize: "9px", color: mid,
                }}>{s}</span>
              ))}
            </div>
          </>
        )}

        {/* Bottom 2-col: Languages + Additional */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "4px" }}>
          {cv.languages && (
            <div>
              <SectionTitle>Languages</SectionTitle>
              <p style={{ fontSize: "10px", margin: 0, color: mid }}>{cv.languages}</p>
            </div>
          )}
          {(cv.availability || cv.drivingLicense || cv.willingToRelocate) && (
            <div>
              <SectionTitle>Additional Info</SectionTitle>
              <div style={{ fontSize: "9.5px", color: mid, lineHeight: "1.8" }}>
                {cv.availability      && <div>📅 {cv.availability}</div>}
                {cv.drivingLicense    && <div>🚗 {cv.drivingLicense}</div>}
                {cv.willingToRelocate && <div>✈️ Relocate: {cv.willingToRelocate}</div>}
              </div>
            </div>
          )}
        </div>

        {/* References */}
        {cv.references && (
          <p style={{ fontSize: "9px", color: subtle, fontStyle: "italic", margin: "12px 0 0", paddingTop: "8px", borderTop: `1px solid ${teal}22` }}>
            {cv.references}
          </p>
        )}
      </div>
    </div>
  );
}

// ─── PDF: Compact Pro ─────────────────────────────────────────────
export function pdfCompactPro(doc, cv, W, M) {
  const fullTextW = W - M * 2;
  const teal   = [13,  115, 119];
  const dark   = [20,  33,  61];
  const mid    = [61,  61,  61];
  const subtle = [136, 136, 136];
 // const white  = [255, 255, 255];

  const [tr, tg, tb] = teal;
  const [dr, dg, db] = dark;

  // Dark header
  doc.setFillColor(dr, dg, db);
  doc.rect(0, 0, W, 38, "F");

  // Teal bottom rule
  doc.setFillColor(tr, tg, tb);
  doc.rect(0, 37, W, 1.5, "F");

  // Name
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20); doc.setFont("helvetica", "bold");
  doc.text(cv.name || "Your Name", M, 13);

  // Title
  doc.setTextColor(tr, tg, tb);
  doc.setFontSize(10); doc.setFont("helvetica", "normal");
  doc.text(cv.title || "Job Title", M, 20);

  // Contact — right aligned
  doc.setFontSize(7.5); doc.setTextColor(187, 187, 204);
  const contactLines = [cv.email, cv.phone, cv.location].filter(Boolean);
  contactLines.forEach((line, i) => {
    doc.text(line, W - M, 12 + i * 5, { align: "right" });
  });

  // Gulf info
  const gparts = [];
  if (cv.nationality)   gparts.push(`Nationality: ${cv.nationality}`);
  if (cv.visaStatus)    gparts.push(`Visa: ${cv.visaStatus}`);
  if (cv.dob)           gparts.push(`DOB: ${cv.dob}`);
  if (cv.gender)        gparts.push(cv.gender);
  if (cv.maritalStatus) gparts.push(cv.maritalStatus);
  if (gparts.length) {
    doc.setTextColor(tr, tg, tb); doc.setFontSize(7);
    doc.text(gparts.join("   •   "), M, 27);
  }

  let y = 46;

  const sectionTitle = (title) => {
    doc.setFillColor(tr, tg, tb);
    doc.rect(M, y - 1, 2.5, 10, "F");
    doc.setTextColor(...dark);
    doc.setFontSize(8); doc.setFont("helvetica", "bold");
    doc.text(title.toUpperCase(), M + 6, y + 4);
    doc.setDrawColor(tr, tg, tb); doc.setLineWidth(0.2);
    const tw = doc.getTextWidth(title.toUpperCase());
    doc.line(M + 6 + tw + 3, y + 4, W - M, y + 3.5);
    y += 10;
    doc.setFont("helvetica", "normal"); doc.setTextColor(...mid);
  };

  // Skills strip
  if (cv.skills) {
    doc.setFillColor(240, 247, 247);
    doc.rect(0, y - 3, W, 10, "F");
    doc.setTextColor(tr, tg, tb); doc.setFontSize(7); doc.setFont("helvetica", "bold");
    doc.text("CORE SKILLS", M, y + 3);
    doc.setTextColor(...dark); doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
    const skillStr = cv.skills.split(",").map(s => s.trim()).filter(Boolean).join("   ·   ");
    const sl = doc.splitTextToSize(skillStr, fullTextW - 28);
    doc.text(sl, M + 28, y + 3);
    y += 14;
  }

  if (cv.summary) {
    sectionTitle("Professional Summary");
    doc.setFontSize(8.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...mid);
    const sl = doc.splitTextToSize(cv.summary, fullTextW);
    doc.text(sl, M, y); y += sl.length * 4.5 + 7;
  }

  if (cv.experience.some(e => e.company)) {
    sectionTitle("Work Experience");
    cv.experience.filter(e => e.company).forEach(e => {
      // dot marker
      doc.setFillColor(tr, tg, tb);
      doc.circle(M + 1.5, y + 1, 1.5, "F");

      doc.setFont("helvetica", "bold"); doc.setFontSize(9.5);
      doc.setTextColor(...dark);
      doc.text(e.role || "", M + 6, y + 2);

      // period pill
      doc.setFillColor(tr, tg, tb);
      const periodW = doc.getTextWidth(e.period || "") + 6;
      doc.roundedRect(W - M - periodW, y - 1, periodW, 5, 2, 2, "F");
      doc.setTextColor(255, 255, 255); doc.setFontSize(7);
      doc.text(e.period || "", W - M - periodW / 2, y + 2.5, { align: "center" });

      y += 5;
      doc.setFont("helvetica", "bold"); doc.setFontSize(8.5);
      doc.setTextColor(tr, tg, tb);
      const compStr = (e.company || "") + (e.location ? ` · ${e.location}` : "");
      doc.text(compStr, M + 6, y); y += 5;

      if (e.points) {
        doc.setFont("helvetica", "normal"); doc.setFontSize(8);
        doc.setTextColor(...mid);
        const pl = doc.splitTextToSize(e.points, fullTextW - 6);
        doc.text(pl, M + 6, y); y += pl.length * 4 + 2;
      }
      y += 4;
    });
  }

  if (cv.education.some(e => e.school)) {
    sectionTitle("Education");
    cv.education.filter(e => e.school).forEach(e => {
      doc.setFont("helvetica", "bold"); doc.setFontSize(9.5);
      doc.setTextColor(...dark);
      doc.text(e.degree || "", M, y);
      doc.setFont("helvetica", "bold"); doc.setFontSize(8);
      doc.setTextColor(tr, tg, tb);
      doc.text(e.year || "", W - M, y, { align: "right" });
      y += 4.5;
      doc.setFont("helvetica", "normal"); doc.setFontSize(8);
      doc.setTextColor(...subtle);
      doc.text(e.school || "", M, y); y += 8;
    });
  }

  if (cv.certifications) {
    sectionTitle("Certifications");
    doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(...mid);
    const sl = doc.splitTextToSize(cv.certifications, fullTextW);
    doc.text(sl, M, y); y += sl.length * 4 + 5;
  }

  if (cv.technicalSkills) {
    sectionTitle("Technical Skills");
    doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(...mid);
    const sl = doc.splitTextToSize(cv.technicalSkills, fullTextW);
    doc.text(sl, M, y); y += sl.length * 4 + 5;
  }

  if (cv.languages) {
    sectionTitle("Languages");
    doc.setFontSize(8.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...mid);
    doc.text(cv.languages, M, y); y += 8;
  }

  if (cv.availability || cv.drivingLicense || cv.willingToRelocate) {
    sectionTitle("Additional Information");
    const adds = [];
    if (cv.availability)      adds.push(cv.availability);
    if (cv.drivingLicense)    adds.push("License: " + cv.drivingLicense);
    if (cv.willingToRelocate) adds.push("Relocate: " + cv.willingToRelocate);
    doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(...mid);
    const al = doc.splitTextToSize(adds.join("   •   "), fullTextW);
    doc.text(al, M, y); y += al.length * 4 + 5;
  }

  if (cv.references) {
    doc.setDrawColor(tr, tg, tb); doc.setLineWidth(0.2);
    doc.line(M, y, W - M, y); y += 5;
    doc.setFont("helvetica", "italic"); doc.setFontSize(8);
    doc.setTextColor(...subtle);
    doc.text(cv.references, M, y);
  }
}