import React from "react";
import GhostChip from "./components/GhostChip";
import { splitExperiencePointsForPreview } from "./experiencePointsPreview";

function technicalSkillsGroupsForTemplate(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((g) => g.chips?.length > 0);
  // Legacy string: pipe-separated
  const chips = raw.split("|").map((s) => s.trim()).filter(Boolean);
  if (!chips.length) return [];
  return [{ category: 'Technical Skills', chips }];
}

const NAVY = "#1E3A5F";
const ACCENT_BG = "#DBEAFE"; // Soft blue-grey band
const BODY_TEXT = "#3D3D3D";
const GREY_TEXT = "#6B7280";
const FONT = 'Arial, "Helvetica Neue", Helvetica, sans-serif';

export function PreviewCompactPro({ cv, mobileMode = false }) {
  const s = mobileMode ? 0.8 : 1;
  const pt = (n) => `${n * s}pt`;

  // Empty state skeleton logic
  const isPlaceholder = !cv.name;
  const textColor = isPlaceholder ? "#D1D5DB" : BODY_TEXT;
  const navyColor = isPlaceholder ? "#D1D5DB" : NAVY;
  const greyColor = isPlaceholder ? "#D1D5DB" : GREY_TEXT;
  const headerBg = isPlaceholder ? "#F3F4F6" : ACCENT_BG;

  const experience = Array.isArray(cv.experience) ? cv.experience : [];
  const education = Array.isArray(cv.education) ? cv.education : [];
  const skills = cv.skills ? cv.skills.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const languages = cv.languages ? cv.languages.split(",").map((l) => l.trim()).filter(Boolean) : [];
  const hasTechnicalSkills = technicalSkillsGroupsForTemplate(cv.technicalSkills).length > 0;

  const SectionTitle = ({ children }) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginTop: "8mm",
        marginBottom: "4mm",
        pageBreakAfter: "avoid",
      }}
    >
      <span style={{ color: navyColor, fontSize: pt(10) }}>■</span>
      <h2
        style={{
          fontSize: pt(11),
          fontWeight: "bold",
          textTransform: "uppercase",
          color: navyColor,
          margin: 0,
          letterSpacing: "0.5px",
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
        paddingBottom: "40px", // Puppeteer footer constraint
        boxSizing: "border-box",
        fontFamily: FONT,
        color: textColor,
        WebkitPrintColorAdjust: "exact",
        lineHeight: 1.5,
      }}
    >
      {/* Header Band */}
      <header style={{ background: headerBg, padding: "10mm 15mm 8mm", marginBottom: "6mm" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: "12px", marginBottom: "3mm" }}>
          <h1 style={{ fontSize: pt(24), fontWeight: "bold", margin: 0, color: navyColor }}>{cv.name || "Full Name"}</h1>
          <span style={{ fontSize: pt(14), fontWeight: "300", color: navyColor, opacity: 0.8 }}>{cv.title || "Job Title"}</span>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: mobileMode ? "1fr" : "1fr 1.5fr",
            gap: "4px 20px",
            fontSize: pt(9),
            color: greyColor,
            fontWeight: "bold",
          }}
        >
          <div>{cv.email && <span>{cv.email}</span>}</div>
          <div>{cv.phone && <span>{cv.phone}</span>}</div>
          <div>{cv.location && <span>{cv.location}</span>}</div>
          {(cv.linkedin || cv.linkedIn) && <div>LinkedIn Profile</div>}
        </div>
      </header>

      <div style={{ padding: "0 15mm" }}>
        {/* Summary */}
        {cv.summary && (
          <section data-section="summary">
            <SectionTitle>Professional Profile</SectionTitle>
            <p style={{ fontSize: pt(10), margin: 0, textAlign: "justify", color: BODY_TEXT }}>{cv.summary}</p>
            <GhostChip>{cv.summary}</GhostChip>
          </section>
        )}

        {/* Experience */}
        {(experience.length > 0 || isPlaceholder) && (
          <section data-section="experience">
            <SectionTitle>Experience</SectionTitle>
            {experience.map((exp, i) => (
              <div key={i} style={{ marginBottom: "6mm", pageBreakInside: "avoid" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: pt(11), fontWeight: "bold", color: navyColor }}>
                    {exp.role} <span style={{ fontWeight: "bold", color: "#000" }}>— {exp.company}</span>
                  </span>
                  <span style={{ fontSize: pt(9.5), fontWeight: "bold", color: greyColor }}>{exp.period}</span>
                </div>
                <div style={{ fontSize: pt(9), color: greyColor, marginBottom: "2mm", fontStyle: "italic" }}>{exp.location}</div>
                {exp.points &&
                  splitExperiencePointsForPreview(exp.points).map((point, idx) => (
                    <div key={idx} style={{ fontSize: pt(10), display: "flex", gap: "8px", marginBottom: "1mm", color: BODY_TEXT }}>
                      <span style={{ color: navyColor }}>•</span>
                      <span>{point}</span>
                    </div>
                  ))}
                <GhostChip>{`${exp.role} ${exp.company}`}</GhostChip>
              </div>
            ))}
          </section>
        )}

        {/* Skills & Languages - Parallel Columns */}
        <div style={{ display: "flex", gap: "15mm", marginTop: "4mm", pageBreakInside: "avoid" }}>
          {skills.length > 0 && (
            <div data-section="competencies" style={{ flex: 1 }}>
              <SectionTitle>Skills</SectionTitle>
              <div style={{ fontSize: pt(10), color: BODY_TEXT }}>
                {skills.map((s, i) => (
                  <div key={i} style={{ marginBottom: "1mm" }}>
                    • {s}
                  </div>
                ))}
              </div>
              <GhostChip>{Array.isArray(skills) ? skills.join(" ") : skills}</GhostChip>
            </div>
          )}
          {hasTechnicalSkills && (
            <div data-section="competencies" style={{ flex: 1 }}>
              <SectionTitle>Technical Skills</SectionTitle>
              <div style={{ fontSize: pt(10), color: BODY_TEXT, margin: 0, lineHeight: 1.5 }}>
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
          {languages.length > 0 && (
            <div data-section="languages" style={{ flex: 1 }}>
              <SectionTitle>Languages</SectionTitle>
              <div style={{ fontSize: pt(10), color: BODY_TEXT }}>
                {languages.map((l, i) => (
                  <div key={i} style={{ marginBottom: "1mm" }}>
                    • {l}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Education */}
        {education.length > 0 && (
          <section data-section="education">
            <SectionTitle>Education</SectionTitle>
            {education.map((edu, i) => (
              <div key={i} style={{ marginBottom: "4mm", pageBreakInside: "avoid" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: pt(11), fontWeight: "bold" }}>{edu.degree}</span>
                  <span style={{ fontSize: pt(9.5), fontWeight: "bold", color: greyColor }}>{edu.year}</span>
                </div>
                <div style={{ fontSize: pt(10), color: navyColor, fontWeight: "bold" }}>{edu.school}</div>
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}