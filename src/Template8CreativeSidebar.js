import React from "react";
import { splitExperiencePointsForPreview } from "./experiencePointsPreview";
import GhostChip from "./components/GhostChip";

function technicalSkillsGroupsForTemplate(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((g) => g.chips?.length > 0);
  // Legacy string: pipe-separated
  const chips = raw.split("|").map((s) => s.trim()).filter(Boolean);
  if (!chips.length) return [];
  return [{ category: 'Technical Skills', chips }];
}

const PURPLE_BAR = "#EEF2FF";
const DEEP_PURPLE = "#3730A3";
const MAIN_TEXT = "#111827";
const GREY_TEXT = "#6B7280";
const FONT = 'Arial, "Helvetica Neue", Helvetica, sans-serif';

export function PreviewMinimalistPurple({ cv, mobileMode = false }) {
  const s = mobileMode ? 0.8 : 1;
  const pt = (n) => `${n * s}pt`;

  // Empty state skeleton logic
  const isPlaceholder = !cv.name;
  const textColor = isPlaceholder ? "#D1D5DB" : MAIN_TEXT;
  const accentColor = isPlaceholder ? "#D1D5DB" : DEEP_PURPLE;
  const greyColor = isPlaceholder ? "#E5E7EB" : GREY_TEXT;
  const barBg = isPlaceholder ? "#F9FAFB" : PURPLE_BAR;

  const experience = Array.isArray(cv.experience) ? cv.experience : [];
  const education = Array.isArray(cv.education) ? cv.education : [];
  const skills = cv.skills ? cv.skills.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const languages = cv.languages ? cv.languages.split(",").map((l) => l.trim()).filter(Boolean) : [];
  const hasTechnicalSkills = technicalSkillsGroupsForTemplate(cv.technicalSkills).length > 0;

  const SectionTitle = ({ children }) => (
    <div
      style={{
        background: barBg,
        width: "100%",
        padding: "6px 0",
        textAlign: "center",
        marginTop: "8mm",
        marginBottom: "5mm",
        pageBreakAfter: "avoid",
        WebkitPrintColorAdjust: "exact",
      }}
    >
      <h2
        style={{
          fontSize: pt(10),
          fontWeight: "bold",
          textTransform: "uppercase",
          color: accentColor,
          margin: 0,
          letterSpacing: "2px",
        }}
      >
        {children}
      </h2>
    </div>
  );

  return (
    <div
      style={{
        width: mobileMode ? "100%" : "210mm",
        maxWidth: "100%",
        minHeight: "auto",
        background: "#FFFFFF",
        padding: "15mm",
        paddingBottom: "40px", // Puppeteer footer constraint
        boxSizing: "border-box",
        fontFamily: FONT,
        color: textColor,
        WebkitPrintColorAdjust: "exact",
        lineHeight: 1.4,
      }}
    >
      {/* Header */}
      <header style={{ marginBottom: "4mm" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "10px", marginBottom: "4px" }}>
          <h1 style={{ fontSize: pt(22), fontWeight: "bold", margin: 0, color: textColor }}>{cv.name || "YOUR NAME"}</h1>
          <span style={{ fontSize: pt(13), fontStyle: "italic", color: greyColor }}>{cv.title || "Professional Title"}</span>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", columnGap: "12px", fontSize: pt(9), color: greyColor }}>
          {cv.email && <span>{cv.email}</span>}
          {cv.email && cv.phone && <span>•</span>}
          {cv.phone && <span>{cv.phone}</span>}
          {(cv.phone || cv.email) && cv.location && <span>•</span>}
          {cv.location && <span>{cv.location}</span>}
        </div>
      </header>

      {/* Summary */}
      {(cv.summary || isPlaceholder) && (
        <section data-section="summary" style={{ position: "relative", pageBreakInside: "avoid" }}>
          <GhostChip>
            {cv.summary || "A dedicated professional with extensive experience..."}
          </GhostChip>
          <SectionTitle>Professional Profile</SectionTitle>
          <p style={{ fontSize: pt(10), margin: 0, textAlign: "justify", color: textColor }}>
            {cv.summary || "A dedicated professional with extensive experience..."}
          </p>
        </section>
      )}

      {/* Experience */}
      {(experience.length > 0 || isPlaceholder) && (
        <section data-section="experience">
          <SectionTitle>Experience</SectionTitle>
          {experience.map((exp, i) => (
            <div key={i} style={{ position: "relative", marginBottom: "6mm", pageBreakInside: "avoid" }}>
              <GhostChip>{`${exp.role} ${exp.company}`}</GhostChip>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={{ fontSize: pt(11) }}>
                  <span style={{ fontWeight: "bold" }}>{exp.role}</span>
                  <span style={{ fontStyle: "italic", color: greyColor }}> — {exp.company}</span>
                </div>
                <span style={{ fontSize: pt(9), fontWeight: "bold", color: textColor }}>{exp.period}</span>
              </div>
              <div style={{ textAlign: "right", fontSize: pt(9), color: greyColor, marginBottom: "2mm" }}>{exp.location}</div>
              {exp.points &&
                splitExperiencePointsForPreview(exp.points).map((point, idx) => (
                  <div
                    key={idx}
                    style={{
                      fontSize: pt(10),
                      display: "flex",
                      gap: "10px",
                      paddingLeft: "4mm",
                      marginBottom: "1mm",
                      color: textColor,
                    }}
                  >
                    <span style={{ color: accentColor }}>•</span>
                    <span>{point}</span>
                  </div>
                ))}
            </div>
          ))}
        </section>
      )}

      {/* Skills */}
      {(skills.length > 0 || isPlaceholder) && (
        <section data-section="competencies" style={{ position: "relative", pageBreakInside: "avoid" }}>
          <GhostChip>{Array.isArray(skills) ? skills.join(" ") : cv.skills}</GhostChip>
          <SectionTitle>Skills</SectionTitle>
          <div style={{ fontSize: pt(10), color: textColor, display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {(isPlaceholder ? ["Skill One", "Skill Two"] : skills).map((s, i) => (
              <span key={i}>• {s} </span>
            ))}
          </div>
        </section>
      )}

      {/* Technical Skills */}
      {(hasTechnicalSkills || isPlaceholder) && (
        <section data-section="competencies" style={{ pageBreakInside: "avoid" }}>
          <SectionTitle>Technical Skills</SectionTitle>
          <div style={{ fontSize: pt(10), color: textColor, margin: 0, lineHeight: 1.5 }}>
            {isPlaceholder ? (
              "Tools, platforms, stack"
            ) : (
              (() => {
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
              })()
            )}
          </div>
        </section>
      )}

      {/* Languages - Two Column */}
      {languages.length > 0 && (
        <section data-section="languages" style={{ pageBreakInside: "avoid" }}>
          <SectionTitle>Languages</SectionTitle>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              columnGap: "15mm",
              rowGap: "2mm",
              fontSize: pt(10),
            }}
          >
            {languages.map((l, i) => {
              const [name, level] = l.split("-");
              return (
                <div key={i}>
                  <span style={{ fontWeight: "bold" }}>{name?.trim()}</span>
                  {level && <span style={{ color: greyColor }}> — {level.trim()}</span>}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Education */}
      {education.length > 0 && (
        <section data-section="education">
          <SectionTitle>Education</SectionTitle>
          {education.map((edu, i) => (
            <div key={i} style={{ marginBottom: "4mm", pageBreakInside: "avoid" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: pt(11), fontWeight: "bold" }}>{edu.degree}</span>
                <span style={{ fontSize: pt(9), fontWeight: "bold" }}>{edu.year}</span>
              </div>
              <div style={{ fontSize: pt(10), fontStyle: "italic", color: greyColor }}>{edu.school}</div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

// Keep the same exported name used by src/App.js
export function PreviewCreativeSidebar({ cv, t, mobileMode = false }) {
  return <PreviewMinimalistPurple cv={cv} mobileMode={mobileMode} />;
}
