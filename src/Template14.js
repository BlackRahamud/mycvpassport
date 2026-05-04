import React from "react";
import GhostChip from "./components/GhostChip";
import { parseExperiencePoints } from "./experiencePointsPreview";

function technicalSkillsGroupsForTemplate(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((g) => g.chips?.length > 0);
  // Legacy string: pipe-separated
  const chips = raw.split("|").map((s) => s.trim()).filter(Boolean);
  if (!chips.length) return [];
  return [{ category: 'Technical Skills', chips }];
}

/**
 * TEMPLATE 14 — Single Column Timeline (Based on T11 Logic)
 * Features: Zero-margin header, Vertical Timeline, Blue/Orange Accents.
 */
export function Template14({ cv, mobileMode = false }) {
  const ACCENT_BLUE = "#1E40AF";
  const ACCENT_ORANGE = "#EA580C";
  const TEXT_MAIN = "#1F2937";

  const skillsItems = cv.skills
    ? (Array.isArray(cv.skills) ? cv.skills : String(cv.skills).split(",").map((s) => s.trim()).filter(Boolean))
    : [];
  const hasTechnicalSkills = technicalSkillsGroupsForTemplate(cv.technicalSkills).length > 0;
  const languagesItems = cv.languages
    ? String(cv.languages).split(",").map((l) => l.trim()).filter(Boolean)
    : [];

  return (
    <div
      style={{
        width: mobileMode ? "100%" : "210mm",
        maxWidth: "100%",
        minHeight: "auto",
        background: "#FFFFFF",
        color: TEXT_MAIN,
        fontFamily: "Inter, Arial, sans-serif",
        display: "flex",
        flexDirection: "column",
        margin: "0 auto",
        padding: 0,
        paddingBottom: "40px",
        WebkitPrintColorAdjust: "exact",
      }}
    >
      {/* HEADER: ZERO TOP MARGIN - EXACTLY LIKE T11 */}
      <header
        style={{
          backgroundColor: "#FFFFFF",
          padding: "40px 50px",
          margin: 0,
          borderBottom: `5px solid ${ACCENT_BLUE}`,
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "32pt",
            color: ACCENT_BLUE,
            fontWeight: "800",
            textTransform: "uppercase",
            lineHeight: "1",
          }}
        >
          {cv.name || "YOUR NAME"}
        </h1>
        <div style={{ fontSize: "14pt", fontWeight: "600", color: TEXT_MAIN }}>
          {cv.title || "PROFESSIONAL ROLE"}
        </div>
        <div
          style={{
            display: "flex",
            gap: "20px",
            fontSize: "10pt",
            color: "#6B7280",
            marginTop: "5px",
          }}
        >
          <span>{cv.phone}</span>
          <span>{cv.email}</span>
          <span>{cv.location}</span>
        </div>
      </header>

      <div style={{ padding: "40px 50px" }}>
        {/* SUMMARY */}
        {cv.summary && (
          <section data-section="summary" style={{ marginBottom: "35px" }}>
            <GhostChip>{cv.summary}</GhostChip>
            <h2
              style={{
                fontSize: "12pt",
                color: ACCENT_BLUE,
                fontWeight: "bold",
                textTransform: "uppercase",
                marginBottom: "12px",
              }}
            >
              Summary
            </h2>
            <p style={{ fontSize: "10.5pt", lineHeight: "1.6", margin: 0 }}>
              {cv.summary}
            </p>
          </section>
        )}

        {/* EXPERIENCE WITH T11 TIMELINE LOGIC */}
        {Array.isArray(cv.experience) && cv.experience.length > 0 && (
        <section data-section="experience" style={{ marginBottom: "35px" }}>
          <h2
            style={{
              fontSize: "12pt",
              color: ACCENT_BLUE,
              fontWeight: "bold",
              textTransform: "uppercase",
              marginBottom: "25px",
            }}
          >
            Experience
          </h2>
          {/* KEEP position:relative — timeline container; the borderLeft IS the timeline, and per-entry absolute Timeline Dots + Date/Location labels anchor here transitively (Phase 3 audit) */}
          <div
            style={{
              position: "relative",
              borderLeft: `2px solid ${ACCENT_BLUE}`,
              marginLeft: "140px",
              paddingLeft: "30px",
            }}
          >
            {cv.experience &&
              cv.experience.map((exp, idx) => (
                // KEEP position:relative — anchors absolute Timeline Dot (left:-37px) and absolute Date/Location label (left:-170px) per entry; removing scrambles the timeline geometry (Phase 3 audit)
                <div key={idx} style={{ marginBottom: "30px", position: "relative" }}>
                  <GhostChip>{`${exp.role} ${exp.company}`}</GhostChip>
                  {/* Timeline Dot */}
                  <div
                    style={{
                      position: "absolute",
                      left: "-37px",
                      top: "6px",
                      width: "12px",
                      height: "12px",
                      backgroundColor: ACCENT_ORANGE,
                    }}
                  />

                  {/* Date & Location (Left of Line) */}
                  <div
                    style={{
                      position: "absolute",
                      left: "-170px",
                      width: "130px",
                      textAlign: "right",
                      top: "5px",
                    }}
                  >
                    <div style={{ fontSize: "9pt", fontWeight: "bold" }}>
                      {exp.period}
                    </div>
                    <div style={{ fontSize: "8.5pt", color: "#6B7280" }}>
                      {exp.location}
                    </div>
                  </div>

                  <div style={{ fontSize: "12pt", fontWeight: "bold" }}>{exp.role}</div>
                  <div
                    style={{
                      fontSize: "11pt",
                      fontWeight: "bold",
                      color: ACCENT_ORANGE,
                      margin: "2px 0 8px 0",
                    }}
                  >
                    {exp.company}
                  </div>

                  {(() => {
                    const { bullets, format } = parseExperiencePoints(exp.points);
                    return bullets.map((p, pIdx) => (
                      <div
                        key={pIdx}
                        style={{
                          fontSize: "10pt",
                          display: "flex",
                          gap: "8px",
                          marginBottom: "4px",
                          lineHeight: "1.5",
                        }}
                      >
                        {format === "list" && <span style={{ color: ACCENT_ORANGE }}>•</span>}
                        <span>{p}</span>
                      </div>
                    ));
                  })()}
                </div>
              ))}
          </div>
        </section>
        )}

        {/* 2-COLUMN GRID FOR ACHIEVEMENTS/SKILLS */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px" }}>
          {Array.isArray(cv.education) && cv.education.length > 0 && (
            <section data-section="education">
              <h2
                style={{
                  fontSize: "12pt",
                  color: ACCENT_BLUE,
                  fontWeight: "bold",
                  textTransform: "uppercase",
                  marginBottom: "15px",
                }}
              >
                Education
              </h2>
              {cv.education.map((edu, i) => (
                <div key={i} style={{ marginBottom: "12px" }}>
                  <div style={{ fontSize: "10pt", fontWeight: "bold" }}>{edu.degree}</div>
                  <div style={{ fontSize: "9pt", color: ACCENT_ORANGE }}>{edu.school}</div>
                </div>
              ))}
            </section>
          )}
          <div>
            {skillsItems.length > 0 && (
              <section data-section="competencies">
                <GhostChip>
                  {Array.isArray(cv.skills) ? cv.skills.join(" ") : cv.skills}
                </GhostChip>
                <h2
                  style={{
                    fontSize: "12pt",
                    color: ACCENT_BLUE,
                    fontWeight: "bold",
                    textTransform: "uppercase",
                    marginBottom: "15px",
                  }}
                >
                  Skills
                </h2>
                <p style={{ fontSize: "10pt", lineHeight: "1.6", margin: 0 }}>{Array.isArray(cv.skills) ? cv.skills.join(", ") : cv.skills}</p>
              </section>
            )}

            {hasTechnicalSkills && (
              <section data-section="competencies" style={{ marginTop: skillsItems.length > 0 ? "24px" : 0 }}>
                <h2
                  style={{
                    fontSize: "12pt",
                    color: ACCENT_BLUE,
                    fontWeight: "bold",
                    textTransform: "uppercase",
                    marginBottom: "15px",
                  }}
                >
                  Technical Skills
                </h2>
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
              </section>
            )}

            {languagesItems.length > 0 && (
              <section
                data-section="languages"
                style={{ marginTop: skillsItems.length > 0 || hasTechnicalSkills ? "24px" : 0 }}
              >
                <h2
                  style={{
                    fontSize: "12pt",
                    color: ACCENT_BLUE,
                    fontWeight: "bold",
                    textTransform: "uppercase",
                    marginBottom: "15px",
                  }}
                >
                  Languages
                </h2>
                <p style={{ fontSize: "10pt", lineHeight: "1.6", margin: 0 }}>
                  {languagesItems.join(", ")}
                </p>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

