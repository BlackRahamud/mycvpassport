import React from "react";
import GhostChip from "./components/GhostChip";
import { parseExperiencePoints } from "./experiencePointsPreview";
import { buildPersonalDetailsEntries } from "./cvShared";
import { ph } from "./previewPlaceholder";

function technicalSkillsGroupsForTemplate(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((g) => g.chips?.length > 0);
  // Legacy string: pipe-separated
  const chips = raw.split("|").map((s) => s.trim()).filter(Boolean);
  if (!chips.length) return [];
  return [{ category: 'Technical Skills', chips }];
}

// Defensive: certifications arrive pre-flattened as a comma string in the
// client, but may be an array of {name, issuer, year} elsewhere.
function certificationLines(cv) {
  const raw = cv.certifications;
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((c) => {
        if (c == null) return "";
        if (typeof c === "string") return c.trim();
        const name = String(c.name || "").trim();
        if (!name) return "";
        const bits = [name];
        if (c.issuer) bits.push(String(c.issuer).trim());
        if (c.year) bits.push(`(${String(c.year).trim()})`);
        return bits.join(" — ");
      })
      .filter(Boolean);
  }
  return String(raw).split(",").map((s) => s.trim()).filter(Boolean);
}

function multilineLines(raw) {
  return String(raw || "")
    .split(/\r?\n/)
    .map((s) => s.trim().replace(/^[-*•]\s+/, "").trim())
    .filter(Boolean);
}

/**
 * TEMPLATE 12 — Flat Split
 * Non-negotiable: No shadows, no gradients, no border-radius.
 * Layout: Beige/Pink Header, Grey Sidebar, White Main.
 */
export function Template12Split({ cv, mobileMode = false }) {
  // Color Palette
  const HEADER_BG = "#D6D3D1";
  const SIDEBAR_BG = "#F3F4F6";
  const TEXT_DARK = "#1A1A1A";
  const TEXT_MUTED = "#4B5563";

  // Typography
  const SERIF = "Georgia, 'Times New Roman', serif";
  const SANS = "Arial, Helvetica, sans-serif";

  const skillItems = cv.skills
    ? (Array.isArray(cv.skills) ? cv.skills : String(cv.skills).split(",").map((s) => s.trim()).filter(Boolean))
    : [];
  const hasTechnicalSkills = technicalSkillsGroupsForTemplate(cv.technicalSkills).length > 0;
  const languageItems = cv.languages
    ? String(cv.languages).split(",").map((l) => l.trim()).filter(Boolean)
    : [];
  const personalDetails = buildPersonalDetailsEntries(cv);
  const educationRows = (Array.isArray(cv.education) ? cv.education : []).filter(
    (e) => e && (e.school || e.degree),
  );
  const experienceRows = (Array.isArray(cv.experience) ? cv.experience : []).filter(
    (e) => e && (e.company || e.role),
  );
  const certList = certificationLines(cv);
  const projectLines = multilineLines(cv.projects);
  const publicationLines = multilineLines(cv.publications);
  const volunteerLines = multilineLines(cv.volunteerWork);

  // KEEP position:relative on containerStyle — outermost template root, conservative bias against future absolute descendants re-anchoring (Phase 3 audit)
  const containerStyle = {
    width: mobileMode ? "100%" : "210mm",
    maxWidth: "100%",
    minHeight: "auto",
    background: "#FFFFFF",
    color: TEXT_DARK,
    margin: "0 auto",
    padding: 0,
    boxSizing: "border-box",
    WebkitPrintColorAdjust: "exact",
    printColorAdjust: "exact",
    fontFamily: SANS,
    display: "flex",
    flexDirection: "column",
    paddingBottom: "40px", // Puppeteer footer constraint
    position: "relative",
  };

  return (
    <div style={containerStyle}>
      {/* HEADER SECTION - NO TOP GAP */}
      <header
        style={{
          backgroundColor: HEADER_BG,
          padding: "40px 50px",
          width: "100%",
          boxSizing: "border-box",
          margin: 0,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontFamily: SERIF,
            fontSize: "32pt",
            fontWeight: "normal",
            textTransform: "uppercase",
            lineHeight: "1",
          }}
        >
          {ph(cv.name, "YOUR NAME")}
        </h1>
        <div
          style={{
            marginTop: "8px",
            fontFamily: SANS,
            fontSize: "13pt",
            fontWeight: "bold",
            color: TEXT_MUTED,
            textTransform: "uppercase",
            letterSpacing: "2px",
          }}
        >
          {ph(cv.title, "PROFESSIONAL TITLE")}
        </div>
        <div
          style={{
            marginTop: "15px",
            fontSize: "10pt",
            display: "flex",
            gap: "20px",
          }}
        >
          {cv.email && <span>{cv.email}</span>}
          {cv.phone && <span>{cv.phone}</span>}
          {cv.linkedin && <span>{cv.linkedin}</span>}
          {cv.location && <span>{cv.location}</span>}
        </div>

        {personalDetails.length > 0 && (
          <div
            style={{
              marginTop: "10px",
              fontSize: "10pt",
              display: "flex",
              flexWrap: "wrap",
              gap: "8px 20px",
            }}
          >
            {personalDetails.map((d, i) => (
              <span key={i}>
                {d.label}: {d.value}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* TWO COLUMN BODY */}
      <div style={{ display: "flex", flex: 1, margin: 0 }}>
        {/* LEFT COLUMN: SUMMARY */}
        <aside
          style={{
            width: "35%",
            backgroundColor: SIDEBAR_BG,
            padding: "40px 30px",
            boxSizing: "border-box",
          }}
        >
          {cv.summary && (
            <div data-section="summary">
              <GhostChip>{cv.summary}</GhostChip>
              <h3
                style={{
                  fontSize: "11pt",
                  fontWeight: "bold",
                  textTransform: "uppercase",
                  borderBottom: "1.5px solid #000000",
                  paddingBottom: "5px",
                  marginBottom: "15px",
                  marginTop: 0,
                }}
              >
                Summary
              </h3>
              <p style={{ fontSize: "10pt", lineHeight: "1.6", margin: 0 }}>
                {cv.summary}
              </p>
            </div>
          )}

          {skillItems.length > 0 && (
            <div data-section="competencies" style={{ marginTop: "40px" }}>
              <GhostChip>
                {Array.isArray(cv.skills) ? cv.skills.join(" ") : cv.skills}
              </GhostChip>
              <h3
                style={{
                  fontSize: "11pt",
                  fontWeight: "bold",
                  textTransform: "uppercase",
                  borderBottom: "1.5px solid #000000",
                  paddingBottom: "5px",
                  marginBottom: "15px",
                }}
              >
                Skills
              </h3>
              <p style={{ fontSize: "10pt", lineHeight: "1.6", margin: 0 }}>
                {Array.isArray(cv.skills) ? cv.skills.join(", ") : cv.skills}
              </p>
            </div>
          )}

          {hasTechnicalSkills && (
            <div data-section="competencies" style={{ marginTop: "40px" }}>
              <h3
                style={{
                  fontSize: "11pt",
                  fontWeight: "bold",
                  textTransform: "uppercase",
                  borderBottom: "1.5px solid #000000",
                  paddingBottom: "5px",
                  marginBottom: "15px",
                }}
              >
                Technical Skills
              </h3>
              <div style={{ fontSize: "10pt", lineHeight: "1.6", margin: 0 }}>
                {(() => {
                  const groups = technicalSkillsGroupsForTemplate(cv.technicalSkills);
                  if (!groups.length) return null;
                  return (
                    <div>
                      {groups.map((g, i) => (
                        <p key={i} style={{ margin: "2px 0", lineHeight: "1.4" }}>
                          <strong>{g.category}:</strong> {g.chips.join(", ")}
                        </p>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {languageItems.length > 0 && (
            <div data-section="languages" style={{ marginTop: "40px" }}>
              <h3
                style={{
                  fontSize: "11pt",
                  fontWeight: "bold",
                  textTransform: "uppercase",
                  borderBottom: "1.5px solid #000000",
                  paddingBottom: "5px",
                  marginBottom: "15px",
                }}
              >
                Languages
              </h3>
              <p style={{ fontSize: "10pt", lineHeight: "1.6", margin: 0 }}>
                {languageItems.join(", ")}
              </p>
            </div>
          )}

          {educationRows.length > 0 && (
            <div data-section="education" style={{ marginTop: "40px" }}>
              <h3
                style={{
                  fontSize: "11pt",
                  fontWeight: "bold",
                  textTransform: "uppercase",
                  borderBottom: "1.5px solid #000000",
                  paddingBottom: "5px",
                  marginBottom: "15px",
                }}
              >
                Education
              </h3>
              <div style={{ fontSize: "10pt", lineHeight: "1.6" }}>
                {educationRows.map((edu, i) => (
                  <p key={i} style={{ margin: "0 0 10px 0" }}>
                    <strong>{[edu.degree, edu.fieldOfStudy].filter(Boolean).join(", ")}</strong>
                    <br />
                    {[[edu.school, edu.location].filter(Boolean).join(", "), edu.year]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                ))}
              </div>
            </div>
          )}

          {certList.length > 0 && (
            <div data-section="certifications" style={{ marginTop: "40px" }}>
              <h3
                style={{
                  fontSize: "11pt",
                  fontWeight: "bold",
                  textTransform: "uppercase",
                  borderBottom: "1.5px solid #000000",
                  paddingBottom: "5px",
                  marginBottom: "15px",
                }}
              >
                Certifications
              </h3>
              <div style={{ fontSize: "10pt", lineHeight: "1.6" }}>
                {certList.map((c, i) => (
                  <p key={i} style={{ margin: "0 0 6px 0" }}>
                    {c}
                  </p>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* RIGHT COLUMN: EXPERIENCE */}
        <main
          data-section="experience"
          style={{ width: "65%", padding: "40px 40px", boxSizing: "border-box" }}
        >
          {experienceRows.length > 0 && (
            <h3
              style={{
                fontSize: "11pt",
                fontWeight: "bold",
                textTransform: "uppercase",
                marginBottom: "20px",
                marginTop: 0,
              }}
            >
              Experience
            </h3>
          )}

          {experienceRows.map((exp, idx) => (
              <div
                key={idx}
                style={{
                  marginBottom: "30px",
                  pageBreakInside: "avoid",
                  display: "block",
                }}
              >
                <GhostChip>{`${exp.role} ${exp.company}`}</GhostChip>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                  }}
                >
                  <span
                    style={{
                      fontFamily: SERIF,
                      fontSize: "14pt",
                      fontWeight: "bold",
                    }}
                  >
                    {exp.company}
                  </span>
                  <span style={{ fontSize: "9pt", fontWeight: "bold" }}>
                    {[exp.period, exp.location].filter(Boolean).join(" · ")}
                  </span>
                </div>
                <div
                  style={{
                    fontStyle: "italic",
                    fontSize: "11pt",
                    color: TEXT_MUTED,
                    margin: "4px 0 10px 0",
                  }}
                >
                  {exp.role}
                </div>
                {exp.points && (() => {
                  const { bullets, format } = parseExperiencePoints(exp.points);
                  if (bullets.length === 0) return null;
                  return (
                    <div style={{ margin: 0, padding: 0 }}>
                      {bullets.map((point, pIdx) => (
                        <div
                          key={pIdx}
                          style={{
                            fontSize: "10pt",
                            lineHeight: "1.5",
                            display: "flex",
                            marginBottom: "4px",
                          }}
                        >
                          {format === "list" && <span style={{ marginRight: "10px" }}>•</span>}
                          <span>{point}</span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            ))}

          {[
            ["Projects", "projects", projectLines],
            ["Publications", "publications", publicationLines],
            ["Volunteer Work", "volunteerWork", volunteerLines],
          ].map(([label, section, lines]) =>
            lines.length > 0 ? (
              <div key={section} data-section={section} style={{ marginBottom: "30px" }}>
                <h3
                  style={{
                    fontSize: "11pt",
                    fontWeight: "bold",
                    textTransform: "uppercase",
                    marginBottom: "15px",
                    marginTop: 0,
                  }}
                >
                  {label}
                </h3>
                {lines.map((line, i) => (
                  <p key={i} style={{ fontSize: "10pt", lineHeight: "1.5", margin: "0 0 6px 0" }}>
                    {line}
                  </p>
                ))}
              </div>
            ) : null,
          )}
        </main>
      </div>
    </div>
  );
}

