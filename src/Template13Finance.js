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

/**
 * TEMPLATE 13 — Finance & Corporate
 * Design: Single-sheet continuous surface, Finance-grade, No Cards.
 */

const COLORS = {
  ACCENT: "#5c6ac4",
  TEXT_PRIMARY: "#1f2933",
  TEXT_SECONDARY: "#6b7280",
  DIVIDER: "#e5e7eb",
  WHITE: "#ffffff",
};

export function PreviewFinance({ cv, mobileMode = false }) {
  if (!cv) return null;

  const isEmpty = !cv.name || cv.name.trim() === "";
  const experience = Array.isArray(cv.experience) ? cv.experience : [];
  const education = Array.isArray(cv.education) ? cv.education : [];
  const skills = cv.skills ? cv.skills.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const languages = cv.languages ? cv.languages.split(",").map((l) => l.trim()).filter(Boolean) : [];
  const certifications = cv.certifications ? cv.certifications.split(",").map((c) => c.trim()).filter(Boolean) : [];
  const hasTechnicalSkills = technicalSkillsGroupsForTemplate(cv.technicalSkills).length > 0;
  const personalDetails = buildPersonalDetailsEntries(cv);

  const SectionHeading = ({ children }) => (
    <div style={{ marginBottom: "12px", breakAfter: "avoid" }}>
      <h2
        style={{
          fontSize: "12px",
          fontWeight: "bold",
          color: COLORS.TEXT_SECONDARY,
          textTransform: "uppercase",
          letterSpacing: "1px",
          margin: "0 0 8px 0",
        }}
      >
        {children}
      </h2>
      <div style={{ height: "1px", backgroundColor: COLORS.DIVIDER, width: "100%" }} />
    </div>
  );

  return (
    <div
      style={{
        width: "100%",
        minHeight: "auto", // T11 Constraint
        backgroundColor: COLORS.WHITE,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
        WebkitPrintColorAdjust: "exact",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "800px",
          backgroundColor: COLORS.WHITE,
          position: "relative",
          paddingBottom: "40px", // Puppeteer footer safety
        }}
      >
        <div style={{ height: "6px", backgroundColor: COLORS.ACCENT, width: "100%" }} />

        <header style={{ padding: "32px 32px 20px 32px" }}>
          <h1
            style={{
              fontSize: "28px",
              fontWeight: "bold",
              color: COLORS.TEXT_PRIMARY,
              margin: 0,
              letterSpacing: "-0.5px",
              textTransform: "uppercase",
            }}
          >
            {ph(cv.name && cv.name.toUpperCase(), "YOUR NAME")}
          </h1>
          <p style={{ fontSize: "14px", color: COLORS.TEXT_SECONDARY, margin: "4px 0 12px 0" }}>
            {ph(cv.title, "Finance Professional")}
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              fontSize: "12px",
              color: COLORS.TEXT_SECONDARY,
            }}
          >
            {isEmpty && <span className="cvp-ph">Phone Number • email@address.com • Location</span>}
            {cv.phone && <span>{cv.phone}</span>}
            {cv.phone && cv.email && <span>•</span>}
            {cv.email && <span>{cv.email}</span>}
            {cv.email && cv.linkedin && <span>•</span>}
            {cv.linkedin && <span>{cv.linkedin}</span>}
            {(cv.email || cv.linkedin) && cv.location && <span>•</span>}
            {cv.location && <span>{cv.location}</span>}
          </div>

          {personalDetails.length > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "10px",
                fontSize: "12px",
                color: COLORS.TEXT_SECONDARY,
                marginTop: "8px",
              }}
            >
              {personalDetails.map((d, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <span>•</span>}
                  <span>
                    {d.label}: {d.value}
                  </span>
                </React.Fragment>
              ))}
            </div>
          )}
        </header>

        <div style={{ display: "flex", flexDirection: "row", gap: "40px", padding: "0 32px 32px 32px" }}>
          <div style={{ flex: "0 0 62%" }}>
            {(experience.length > 0 || isEmpty) && (
              <div data-section="experience">
                <SectionHeading>Experience</SectionHeading>
                {isEmpty && (
                  <div style={{ marginBottom: "20px", pageBreakInside: "avoid", position: "relative" }}>
                    <div className="cvp-ph" style={{ fontWeight: "bold", color: COLORS.TEXT_PRIMARY, fontSize: "14px" }}>Job Role / Position</div>
                    <div className="cvp-ph" style={{ color: COLORS.TEXT_SECONDARY, fontSize: "12px", marginBottom: "6px" }}>
                      Company Name • 2020 — Present
                    </div>
                    <div style={{ fontSize: "12.5px", color: COLORS.TEXT_PRIMARY, marginBottom: "4px", display: "flex", lineHeight: "1.5" }}>
                      <span style={{ marginRight: "8px" }}>•</span>
                      <span className="cvp-ph">Accomplishment or responsibility placeholder line</span>
                    </div>
                  </div>
                )}
                {experience.map((exp, i) => (
                  <div key={i} style={{ marginBottom: "20px", pageBreakInside: "avoid", position: "relative" }}>
                    <GhostChip>{`${exp.role} ${exp.company}`}</GhostChip>
                    <div style={{ fontWeight: "bold", color: COLORS.TEXT_PRIMARY, fontSize: "14px" }}>{exp.role}</div>
                    <div style={{ color: COLORS.TEXT_SECONDARY, fontSize: "12px", marginBottom: "6px" }}>
                      {exp.company} • {exp.period}
                    </div>
                    {exp.points && (() => {
                      const { bullets, format } = parseExperiencePoints(exp.points);
                      return bullets.map((point, j) => (
                        <div
                          key={j}
                          style={{ fontSize: "12.5px", color: COLORS.TEXT_PRIMARY, marginBottom: "4px", display: "flex", lineHeight: "1.5" }}
                        >
                          {format === "list" && <span style={{ marginRight: "8px" }}>•</span>}
                          <span>{point}</span>
                        </div>
                      ));
                    })()}
                  </div>
                ))}
              </div>
            )}

            {(education.length > 0 || isEmpty) && (
              <div data-section="education">
                <SectionHeading>Education</SectionHeading>
                {isEmpty && (
                  <div style={{ marginBottom: "16px", pageBreakInside: "avoid" }}>
                    <div className="cvp-ph" style={{ fontWeight: "bold", color: COLORS.TEXT_PRIMARY, fontSize: "13px" }}>Degree / Field of Study</div>
                    <div className="cvp-ph" style={{ color: COLORS.TEXT_SECONDARY, fontSize: "12px" }}>University or School Name • 2018</div>
                  </div>
                )}
                {education.map((edu, i) => (
                  <div key={i} style={{ marginBottom: "16px", pageBreakInside: "avoid" }}>
                    <div style={{ fontWeight: "bold", color: COLORS.TEXT_PRIMARY, fontSize: "13px" }}>{edu.degree}</div>
                    <div style={{ color: COLORS.TEXT_SECONDARY, fontSize: "12px" }}>
                      {edu.school} • {edu.year}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {(skills.length > 0 || isEmpty) && (
              <div data-section="competencies">
                <SectionHeading>Skills</SectionHeading>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", position: "relative" }}>
                  <GhostChip>{Array.isArray(skills) ? skills.join(" ") : cv.skills}</GhostChip>
                  {(isEmpty ? ["Skill One", "Skill Two", "Skill Three"] : skills).map((skill, i) => (
                    <span key={i} style={{ padding: "5px 12px", backgroundColor: "#e6eef7", color: COLORS.TEXT_PRIMARY, borderRadius: "6px", fontSize: "12px" }}>
                      {isEmpty ? <span className="cvp-ph">{skill}</span> : skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {hasTechnicalSkills && (
              <div data-section="competencies">
                <SectionHeading>Technical Skills</SectionHeading>
                <div style={{ fontSize: "12.5px", color: COLORS.TEXT_PRIMARY, lineHeight: "1.5", margin: "0 0 24px 0" }}>
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
          </div>

          <div style={{ flex: "1" }}>
            {(cv.summary || isEmpty) && (
              <div data-section="summary">
                <SectionHeading>Professional Summary</SectionHeading>
                <div style={{ position: "relative", margin: "0 0 24px 0" }}>
                  <GhostChip>{cv.summary || ""}</GhostChip>
                  <p style={{ fontSize: "12.5px", color: COLORS.TEXT_PRIMARY, lineHeight: "1.5", margin: 0 }}>
                    {ph(cv.summary, "Write a brief overview of your professional background, key achievements, and career goals here.")}
                  </p>
                </div>
              </div>
            )}

            {certifications.length > 0 && (
              <div data-section="certifications">
                <SectionHeading>Certifications</SectionHeading>
                <div style={{ fontSize: "12px", color: COLORS.TEXT_PRIMARY, lineHeight: "1.8", marginBottom: "24px" }}>
                  {certifications.map((c, i) => (
                    <div key={i}>• {c}</div>
                  ))}
                </div>
              </div>
            )}

            {languages.length > 0 && (
              <div data-section="languages">
                <SectionHeading>Languages</SectionHeading>
                <div style={{ fontSize: "12px", color: COLORS.TEXT_PRIMARY }}>
                  {languages.map((l, i) => (
                    <div key={i}>{l}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
