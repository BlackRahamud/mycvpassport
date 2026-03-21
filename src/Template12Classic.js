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

/* PDF export: html2canvas + jsPDF from App.js (builder preview capture). */
