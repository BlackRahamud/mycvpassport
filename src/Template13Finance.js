// ─────────────────────────────────────────────────────────────────
//  TEMPLATE 13 — Finance
//  Dense single column · banking & accounting · Gulf-ready
// ─────────────────────────────────────────────────────────────────

function splitPoints(points) {
  if (!points) return [];
  return String(points)
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function skillItems(cv) {
  return cv.skills
    ? cv.skills.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
}

function certItems(cv) {
  return cv.certifications
    ? cv.certifications.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
}

export function PreviewFinance({ cv }) {
  const skills = skillItems(cv);
  const certs = certItems(cv);

  const contactRow = [cv.email, cv.phone, cv.location, cv.nationality, cv.visaStatus].filter(Boolean);
  const extraRow = [];
  if (cv.dob) extraRow.push(`DOB: ${cv.dob}`);
  if (cv.drivingLicense) extraRow.push(`Driving License: ${cv.drivingLicense}`);

  const SectionTitle = ({ children }) => (
    <div style={{ marginTop: "18px", marginBottom: "10px" }}>
      <div
        style={{
          fontSize: "12px",
          fontWeight: "700",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "#000000",
          fontFamily: "Arial, Helvetica, sans-serif",
          paddingBottom: "6px",
          borderBottom: "1px solid #000000",
        }}
      >
        {children}
      </div>
    </div>
  );

  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: "10px",
        overflow: "hidden",
        fontFamily: "Arial, Helvetica, sans-serif",
        color: "#000000",
        padding: "40px 48px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ marginBottom: "14px" }}>
        <div style={{ paddingBottom: "8px", borderBottom: "2px solid #000000", marginBottom: "10px" }}>
          <h1
            style={{
              fontSize: "28px",
              fontWeight: "700",
              color: "#000000",
              margin: 0,
              fontFamily: "Arial, Helvetica, sans-serif",
            }}
          >
            {cv.name || "Your Name"}
          </h1>
        </div>
        <p
          style={{
            fontSize: "14px",
            color: "#333333",
            margin: "0 0 10px",
            fontFamily: "Arial, Helvetica, sans-serif",
          }}
        >
          {cv.title || "Professional Title"}
        </p>
        <div
          style={{
            fontSize: "12px",
            color: "#555555",
            lineHeight: 1.6,
            fontFamily: "Arial, Helvetica, sans-serif",
          }}
        >
          {contactRow.join(" | ")}
        </div>
        {extraRow.length > 0 && (
          <div
            style={{
              fontSize: "12px",
              color: "#555555",
              lineHeight: 1.6,
              marginTop: "4px",
              fontFamily: "Arial, Helvetica, sans-serif",
            }}
          >
            {extraRow.join(" | ")}
          </div>
        )}
      </div>

      {cv.summary && (
        <>
          <SectionTitle>Professional Summary</SectionTitle>
          <p
            style={{
              fontSize: "13px",
              lineHeight: 1.5,
              color: "#000000",
              margin: 0,
              fontFamily: "Arial, Helvetica, sans-serif",
            }}
          >
            {cv.summary}
          </p>
        </>
      )}

      {cv.experience.some((e) => e.company) && (
        <>
          <SectionTitle>Professional Experience</SectionTitle>
          {cv.experience
            .filter((e) => e.company)
            .map((e, i) => (
              <div key={i} style={{ marginBottom: "14px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    gap: "12px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: "700",
                      color: "#000000",
                      fontFamily: "Arial, Helvetica, sans-serif",
                    }}
                  >
                    {e.company}
                    {e.location ? ` — ${e.location}` : ""}
                  </span>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#000000",
                      flexShrink: 0,
                      fontFamily: "Arial, Helvetica, sans-serif",
                    }}
                  >
                    {e.period}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    fontStyle: "italic",
                    color: "#000000",
                    marginBottom: "6px",
                    fontFamily: "Arial, Helvetica, sans-serif",
                  }}
                >
                  {e.role}
                </div>
                {splitPoints(e.points).map((line, j) => (
                  <div
                    key={j}
                    style={{
                      fontSize: "13px",
                      color: "#000000",
                      marginLeft: "12px",
                      textIndent: "-12px",
                      lineHeight: 1.45,
                      fontFamily: "Arial, Helvetica, sans-serif",
                    }}
                  >
                    <span style={{ marginRight: "6px" }}>•</span>
                    {line}
                  </div>
                ))}
              </div>
            ))}
        </>
      )}

      {cv.education.some((e) => e.school) && (
        <>
          <SectionTitle>Education</SectionTitle>
          {cv.education
            .filter((e) => e.school)
            .map((e, i) => (
              <div
                key={i}
                style={{
                  marginBottom: "10px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "12px",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: "700",
                      color: "#000000",
                      fontFamily: "Arial, Helvetica, sans-serif",
                    }}
                  >
                    {e.school}
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#000000",
                      fontFamily: "Arial, Helvetica, sans-serif",
                    }}
                  >
                    {e.degree}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: "12px",
                    color: "#000000",
                    flexShrink: 0,
                    fontFamily: "Arial, Helvetica, sans-serif",
                  }}
                >
                  {e.year}
                </span>
              </div>
            ))}
        </>
      )}

      {skills.length > 0 && (
        <>
          <SectionTitle>Skills</SectionTitle>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "6px 16px",
              fontSize: "13px",
              color: "#000000",
              fontFamily: "Arial, Helvetica, sans-serif",
            }}
          >
            {skills.map((s, i) => (
              <div key={i} style={{ lineHeight: 1.45 }}>
                {s}
              </div>
            ))}
          </div>
        </>
      )}

      {certs.length > 0 && (
        <>
          <SectionTitle>Certifications &amp; Training</SectionTitle>
          <div style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
            {certs.map((c, i) => (
              <div
                key={i}
                style={{
                  fontSize: "13px",
                  color: "#000000",
                  marginLeft: "12px",
                  textIndent: "-12px",
                  marginBottom: "4px",
                  lineHeight: 1.45,
                }}
              >
                <span style={{ marginRight: "6px" }}>•</span>
                {c}
              </div>
            ))}
          </div>
        </>
      )}

      {cv.languages && (
        <>
          <SectionTitle>Languages</SectionTitle>
          <p
            style={{
              fontSize: "13px",
              color: "#000000",
              margin: 0,
              lineHeight: 1.45,
              fontFamily: "Arial, Helvetica, sans-serif",
            }}
          >
            {cv.languages}
          </p>
        </>
      )}

      {cv.references && (
        <>
          <SectionTitle>References</SectionTitle>
          <p
            style={{
              fontSize: "12px",
              color: "#000000",
              fontStyle: "italic",
              margin: 0,
              fontFamily: "Arial, Helvetica, sans-serif",
            }}
          >
            {cv.references}
          </p>
        </>
      )}
    </div>
  );
}

function pdfFinanceBody(doc, cv, W, M) {
  const black = [0, 0, 0];
  const mid = [51, 51, 51];

  let y = 16;

  doc.setTextColor(...black);
  doc.setFontSize(19);
  doc.setFont("helvetica", "bold");
  doc.text(cv.name || "Your Name", M, y);
  y += 2;
  doc.setDrawColor(...black);
  doc.setLineWidth(0.6);
  doc.line(M, y + 4, W - M, y + 4);
  y += 12;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...mid);
  doc.text(cv.title || "Professional Title", M, y);
  y += 7;

  doc.setFontSize(8.5);
  doc.setTextColor(85, 85, 85);
  const c1 = [cv.email, cv.phone, cv.location, cv.nationality, cv.visaStatus].filter(Boolean).join("   |   ");
  if (c1) {
    const l1 = doc.splitTextToSize(c1, W - M * 2);
    doc.text(l1, M, y);
    y += l1.length * 4.2;
  }
  const ex = [];
  if (cv.dob) ex.push(`DOB: ${cv.dob}`);
  if (cv.drivingLicense) ex.push(`Driving License: ${cv.drivingLicense}`);
  if (ex.length) {
    doc.text(ex.join("   |   "), M, y);
    y += 5;
  }

  y += 4;

  const sectionHead = (label) => {
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...black);
    doc.text(label.toUpperCase(), M, y);
    y += 2.5;
    doc.setDrawColor(...black);
    doc.setLineWidth(0.25);
    doc.line(M, y, W - M, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...black);
  };

  if (cv.summary) {
    sectionHead("Professional Summary");
    doc.setFontSize(9.5);
    const sl = doc.splitTextToSize(cv.summary, W - M * 2);
    doc.text(sl, M, y);
    y += sl.length * 4.2 + 3;
  }

  if (cv.experience.some((e) => e.company)) {
    sectionHead("Professional Experience");
    cv.experience
      .filter((e) => e.company)
      .forEach((e) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        const left = `${e.company || ""}${e.location ? ` — ${e.location}` : ""}`;
        const lw = doc.splitTextToSize(left, W - M * 2 - 38);
        doc.text(lw, M, y);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.text(e.period || "", W - M, y, { align: "right" });
        y += lw.length * 4.5 + 1;
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9.5);
        doc.text(e.role || "", M, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        splitPoints(e.points).forEach((line) => {
          const pl = doc.splitTextToSize(`• ${line}`, W - M * 2 - 4);
          doc.text(pl, M + 3, y);
          y += pl.length * 4 + 1;
        });
        y += 3;
      });
  }

  if (cv.education.some((e) => e.school)) {
    sectionHead("Education");
    cv.education
      .filter((e) => e.school)
      .forEach((e) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(e.school || "", M, y);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.text(e.year || "", W - M, y, { align: "right" });
        y += 5;
        doc.setFontSize(9.5);
        doc.text(e.degree || "", M, y);
        y += 8;
      });
  }

  const skills = skillItems(cv);
  if (skills.length) {
    sectionHead("Skills");
    doc.setFontSize(9.5);
    const colW = (W - M * 2 - 6) / 2;
    let rowY = y;
    for (let i = 0; i < skills.length; i += 2) {
      doc.text(skills[i], M, rowY);
      if (skills[i + 1]) {
        doc.text(skills[i + 1], M + colW + 6, rowY);
      }
      rowY += 5;
    }
    y = rowY + 2;
  }

  const certs = certItems(cv);
  if (certs.length) {
    sectionHead("Certifications & Training");
    certs.forEach((c) => {
      const pl = doc.splitTextToSize(`• ${c}`, W - M * 2 - 4);
      doc.text(pl, M + 3, y);
      y += pl.length * 4 + 1;
    });
    y += 2;
  }

  if (cv.languages) {
    sectionHead("Languages");
    doc.setFontSize(9.5);
    const ll = doc.splitTextToSize(cv.languages, W - M * 2);
    doc.text(ll, M, y);
    y += ll.length * 4.2;
  }

  if (cv.references) {
    y += 4;
    sectionHead("References");
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    const rl = doc.splitTextToSize(cv.references, W - M * 2);
    doc.text(rl, M, y);
  }
}

export async function pdfFinance(cv) {
  if (!window.jspdf) {
    await new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const M = 13;
  pdfFinanceBody(doc, cv, W, M);
  const safe = String(cv.name || "CV").replace(/[^\w-]+/g, "_").slice(0, 60);
  doc.save(`${safe || "CV"}.pdf`);
}
