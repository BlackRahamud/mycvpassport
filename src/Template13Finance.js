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

/* PDF export: html2canvas + jsPDF from App.js (builder preview capture). */
