// ─────────────────────────────────────────────────────────────────
//  TEMPLATE 12 — Classic
//  Single column · black & white · Gulf-friendly · maximum clarity
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

export function PreviewClassic({ cv }) {
  const skills = skillItems(cv);
  const certs = certItems(cv);

  const contactParts = [
    cv.email,
    cv.phone,
    cv.location,
    cv.nationality,
  ].filter(Boolean);

  const row2Parts = [];
  if (cv.visaStatus) row2Parts.push(cv.visaStatus);
  if (cv.dob) row2Parts.push(`DOB: ${cv.dob}`);
  if (cv.drivingLicense) row2Parts.push(`Driving License: ${cv.drivingLicense}`);

  const SectionTitle = ({ children }) => (
    <div style={{ marginTop: "20px", marginBottom: "10px" }}>
      <div
        style={{
          fontSize: "11px",
          fontWeight: "700",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "#000000",
          fontFamily: "Arial, Helvetica, sans-serif",
          marginBottom: "6px",
        }}
      >
        {children}
      </div>
      <div style={{ height: "1px", background: "#CCCCCC", width: "100%" }} />
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
      {/* Header */}
      <div style={{ marginBottom: "12px" }}>
        <h1
          style={{
            fontSize: "26px",
            fontWeight: "700",
            color: "#000000",
            margin: "0 0 6px",
            fontFamily: "Arial, Helvetica, sans-serif",
          }}
        >
          {cv.name || "Your Name"}
        </h1>
        <p
          style={{
            fontSize: "14px",
            color: "#444444",
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
          {contactParts.join(" | ")}
        </div>
        {row2Parts.length > 0 && (
          <div
            style={{
              fontSize: "12px",
              color: "#555555",
              lineHeight: 1.6,
              marginTop: "4px",
              fontFamily: "Arial, Helvetica, sans-serif",
            }}
          >
            {row2Parts.join(" | ")}
          </div>
        )}
      </div>
      <div style={{ height: "1px", background: "#000000", width: "100%", marginBottom: "4px" }} />

      {/* Professional Summary */}
      {cv.summary && (
        <>
          <SectionTitle>Professional Summary</SectionTitle>
          <p
            style={{
              fontSize: "13px",
              lineHeight: 1.55,
              color: "#333333",
              margin: "0 0 4px",
              fontFamily: "Arial, Helvetica, sans-serif",
            }}
          >
            {cv.summary}
          </p>
        </>
      )}

      {/* Experience — company bold, title italic, dates right */}
      {cv.experience.some((e) => e.company) && (
        <>
          <SectionTitle>Professional Experience</SectionTitle>
          {cv.experience
            .filter((e) => e.company)
            .map((e, i) => (
              <div key={i} style={{ marginBottom: "16px" }}>
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
                      color: "#666666",
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
                    color: "#444444",
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
                      color: "#333333",
                      marginLeft: "12px",
                      textIndent: "-12px",
                      lineHeight: 1.5,
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

      {/* Education */}
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
                  alignItems: "baseline",
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
                      color: "#333333",
                      fontFamily: "Arial, Helvetica, sans-serif",
                    }}
                  >
                    {e.degree}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: "12px",
                    color: "#666666",
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

      {/* Skills */}
      {skills.length > 0 && (
        <>
          <SectionTitle>Skills</SectionTitle>
          <p
            style={{
              fontSize: "13px",
              color: "#333333",
              margin: 0,
              lineHeight: 1.6,
              fontFamily: "Arial, Helvetica, sans-serif",
            }}
          >
            {skills.join(", ")}
          </p>
        </>
      )}

      {/* Languages */}
      {cv.languages && (
        <>
          <SectionTitle>Languages</SectionTitle>
          <p
            style={{
              fontSize: "13px",
              color: "#333333",
              margin: 0,
              lineHeight: 1.55,
              fontFamily: "Arial, Helvetica, sans-serif",
            }}
          >
            {cv.languages}
          </p>
        </>
      )}

      {/* Certifications */}
      {certs.length > 0 && (
        <>
          <SectionTitle>Certifications</SectionTitle>
          <div style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
            {certs.map((c, i) => (
              <div
                key={i}
                style={{
                  fontSize: "13px",
                  color: "#333333",
                  marginLeft: "12px",
                  textIndent: "-12px",
                  marginBottom: "4px",
                  lineHeight: 1.5,
                }}
              >
                <span style={{ marginRight: "6px" }}>•</span>
                {c}
              </div>
            ))}
          </div>
        </>
      )}

      {/* References (optional, if user filled) */}
      {cv.references && (
        <>
          <SectionTitle>References</SectionTitle>
          <p
            style={{
              fontSize: "12px",
              color: "#666666",
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

// ─── PDF body (jsPDF instance) ───────────────────────────────────
function pdfClassicBody(doc, cv, W, M) {
  const black = [0, 0, 0];
  const mid = [51, 51, 51];
  const subtle = [102, 102, 102];
  const grayRule = [204, 204, 204];

  let y = 16;

  doc.setTextColor(...black);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(cv.name || "Your Name", M, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(68, 68, 68);
  doc.text(cv.title || "Professional Title", M, y);
  y += 6;

  doc.setFontSize(8.5);
  doc.setTextColor(85, 85, 85);
  const contactStr = [cv.email, cv.phone, cv.location, cv.nationality].filter(Boolean).join("   |   ");
  if (contactStr) {
    const cl = doc.splitTextToSize(contactStr, W - M * 2);
    doc.text(cl, M, y);
    y += cl.length * 4.2;
  }

  const row2 = [];
  if (cv.visaStatus) row2.push(cv.visaStatus);
  if (cv.dob) row2.push(`DOB: ${cv.dob}`);
  if (cv.drivingLicense) row2.push(`Driving License: ${cv.drivingLicense}`);
  if (row2.length) {
    doc.setFontSize(8.5);
    doc.text(row2.join("   |   "), M, y);
    y += 5;
  }

  doc.setDrawColor(...black);
  doc.setLineWidth(0.35);
  doc.line(M, y + 2, W - M, y + 2);
  y += 10;

  const sectionHead = (label) => {
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...black);
    doc.text(label.toUpperCase(), M, y);
    y += 3;
    doc.setDrawColor(...grayRule);
    doc.setLineWidth(0.2);
    doc.line(M, y, W - M, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...mid);
  };

  if (cv.summary) {
    sectionHead("Professional Summary");
    doc.setFontSize(9.5);
    const sl = doc.splitTextToSize(cv.summary, W - M * 2);
    doc.text(sl, M, y);
    y += sl.length * 4.3 + 4;
  }

  if (cv.experience.some((e) => e.company)) {
    sectionHead("Professional Experience");
    cv.experience
      .filter((e) => e.company)
      .forEach((e, idx, arr) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(...black);
        const left = `${e.company || ""}${e.location ? ` — ${e.location}` : ""}`;
        const lw = doc.splitTextToSize(left, W - M * 2 - 40);
        doc.text(lw, M, y);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(...subtle);
        doc.text(e.period || "", W - M, y, { align: "right" });
        y += lw.length * 4.5 + 1;
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9.5);
        doc.setTextColor(68, 68, 68);
        doc.text(e.role || "", M, y);
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(...mid);
        splitPoints(e.points).forEach((line) => {
          const pl = doc.splitTextToSize(`• ${line}`, W - M * 2 - 4);
          doc.text(pl, M + 3, y);
          y += pl.length * 4 + 1;
        });
        y += idx < arr.length - 1 ? 4 : 2;
      });
  }

  if (cv.education.some((e) => e.school)) {
    sectionHead("Education");
    cv.education
      .filter((e) => e.school)
      .forEach((e) => {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(...black);
        doc.text(e.school || "", M, y);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(...subtle);
        doc.text(e.year || "", W - M, y, { align: "right" });
        y += 5;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(...mid);
        doc.text(e.degree || "", M, y);
        y += 8;
      });
  }

  const skills = skillItems(cv);
  if (skills.length) {
    sectionHead("Skills");
    doc.setFontSize(9.5);
    const skillStr = skills.join(", ");
    const sl = doc.splitTextToSize(skillStr, W - M * 2);
    doc.text(sl, M, y);
    y += sl.length * 4.2 + 4;
  }

  if (cv.languages) {
    sectionHead("Languages");
    doc.setFontSize(9.5);
    const ll = doc.splitTextToSize(cv.languages, W - M * 2);
    doc.text(ll, M, y);
    y += ll.length * 4.2 + 4;
  }

  const certs = certItems(cv);
  if (certs.length) {
    sectionHead("Certifications");
    certs.forEach((c) => {
      const pl = doc.splitTextToSize(`• ${c}`, W - M * 2 - 4);
      doc.text(pl, M + 3, y);
      y += pl.length * 4 + 1;
    });
    y += 2;
  }

  if (cv.references) {
    sectionHead("References");
    doc.setFontSize(9);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(...subtle);
    const rl = doc.splitTextToSize(cv.references, W - M * 2);
    doc.text(rl, M, y);
  }
}

/** Called from App downloadResume — loads jsPDF, renders, saves */
export async function pdfClassic(cv) {
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
  pdfClassicBody(doc, cv, W, M);
  const safe = String(cv.name || "CV").replace(/[^\w-]+/g, "_").slice(0, 60);
  doc.save(`${safe || "CV"}.pdf`);
}
