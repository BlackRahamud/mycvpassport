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

const PRIMARY = "#1E3A5F"; // Deep Navy
const ACCENT = "#C8A96E"; // Warm Gold
const TEXT_MAIN = "#374151"; // Gray 700
const TEXT_MUTED = "#6B7280"; // Gray 500
const SKELETON = "#D1D5DB"; // Gray 300
const FONT = 'Arial, "Helvetica Neue", Helvetica, sans-serif';

export function PreviewModernEmerald({ cv, mobileMode = false }) {
  const s = mobileMode ? 0.8 : 1;
  const pt = (n) => `${n * s}pt`;

  const isEmpty = !cv.name || cv.name.trim() === "";

  const summaryDisplay =
    cv.summary ||
    "Write a brief overview of your professional background, key achievements, and career goals here. This section helps recruiters understand your value proposition at a glance.";

  // Data parsing
  const skillList = cv.skills ? cv.skills.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const languageList = cv.languages ? cv.languages.split(",").map((l) => l.trim()).filter(Boolean) : [];

  const SectionTitle = ({ children, first }) => (
    <div
      style={{
        marginTop: first ? 0 : "10mm",
        marginBottom: "5mm",
        borderLeft: `4px solid ${isEmpty ? SKELETON : ACCENT}`,
        paddingLeft: "10px",
        breakAfter: "avoid",
        pageBreakAfter: "avoid",
      }}
    >
      <span
        style={{
          fontSize: pt(13),
          fontWeight: "bold",
          color: isEmpty ? SKELETON : PRIMARY,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {children}
      </span>
    </div>
  );

  const EntryWrap = ({ children }) => (
    <div style={{ marginBottom: "6mm", breakInside: "avoid", pageBreakInside: "avoid" }}>{children}</div>
  );

  return (
    <div
      style={{
        width: mobileMode ? "100%" : "210mm",
        maxWidth: "100%",
        minHeight: "auto",
        background: "#FFFFFF",
        padding: "15mm",
        paddingBottom: "40px", // Puppeteer footer margin
        boxSizing: "border-box",
        fontFamily: FONT,
        color: TEXT_MAIN,
        WebkitPrintColorAdjust: "exact",
      }}
    >
      {/* Header - Left Aligned */}
      <header style={{ textAlign: "left", marginBottom: "12mm" }}>
        <h1 style={{ fontSize: pt(26), fontWeight: "bold", color: isEmpty ? SKELETON : PRIMARY, margin: 0, lineHeight: 1.1 }}>
          {cv.name || "Your Name"}
        </h1>
        <div style={{ fontSize: pt(13), fontWeight: "bold", color: isEmpty ? SKELETON : ACCENT, margin: "6px 0 10px" }}>
          {cv.title || "Your Professional Title"}
        </div>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "8px 16px",
            fontSize: pt(10),
            color: TEXT_MUTED,
          }}
        >
          {cv.email && <span>{cv.email}</span>}
          {cv.phone && <span>{cv.phone}</span>}
          {cv.location && <span>{cv.location}</span>}
          {isEmpty && <span style={{ color: SKELETON }}>email@address.com • Phone Number • Location</span>}
        </div>
      </header>

      {/* Summary */}
      {(cv.summary || isEmpty) && (
        <section data-section="summary">
          <SectionTitle first>Professional Summary</SectionTitle>
          <p
            style={{
              fontSize: pt(10.5),
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            <GhostChip>{summaryDisplay}</GhostChip>
            {summaryDisplay}
          </p>
        </section>
      )}

      {/* Skills */}
      {(skillList.length > 0 || isEmpty) && (
        <section data-section="competencies">
          <SectionTitle>Skills</SectionTitle>
          <div style={{ fontSize: pt(10.5), lineHeight: 1.5 }}>
            <GhostChip>
              {isEmpty ? "Skill One, Skill Two, Skill Three" : skillList.join(", ")}
            </GhostChip>
            {isEmpty ? (
              <span style={{ color: SKELETON }}>Skill One, Skill Two, Skill Three</span>
            ) : (
              skillList.join(", ")
            )}
          </div>
        </section>
      )}

      {/* Technical Skills */}
      {(technicalSkillsGroupsForTemplate(cv.technicalSkills).length > 0 || isEmpty) && (
        <section data-section="competencies">
          <SectionTitle>Technical Skills</SectionTitle>
          <div style={{ fontSize: pt(10.5), lineHeight: 1.6, margin: 0 }}>
            <GhostChip>
              {isEmpty
                ? "Tool Name, Software Expertise"
                : technicalSkillsGroupsForTemplate(cv.technicalSkills)
                    .map((g) => `${g.category} ${g.chips.join(" ")}`)
                    .join(" ")}
            </GhostChip>
            {isEmpty ? (
              <span style={{ color: SKELETON }}>Tool Name, Software Expertise</span>
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

      {/* Experience */}
      {(cv.experience?.length > 0 || isEmpty) && (
        <section data-section="experience">
          <SectionTitle>Professional Experience</SectionTitle>
          {isEmpty ? (
            <EntryWrap>
              <div>
                <GhostChip>Job Role / Position Company Name | Location</GhostChip>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
                  <span style={{ color: SKELETON }}>Job Role / Position</span>
                  <span style={{ color: SKELETON }}>2020 — Present</span>
                </div>
                <div style={{ color: SKELETON, fontStyle: "italic", marginBottom: "2mm" }}>Company Name | Location</div>
                <p style={{ margin: 0, color: SKELETON }}>• Accomplishment or responsibility placeholder line</p>
                <p style={{ margin: 0, color: SKELETON }}>• Key metric or project success indicator</p>
              </div>
            </EntryWrap>
          ) : (
            cv.experience.map((e, i) => (
              <EntryWrap key={i}>
                <div>
                  <GhostChip>
                    {e.role} {e.company}
                  </GhostChip>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <span style={{ fontSize: pt(11), fontWeight: "bold", color: PRIMARY }}>{e.role}</span>
                    <span style={{ fontSize: pt(10), fontWeight: "bold", color: ACCENT }}>{e.period}</span>
                  </div>
                  <div style={{ fontSize: pt(10.5), fontWeight: "bold", color: TEXT_MUTED, marginBottom: "2mm" }}>
                    {e.company} {e.location && `| ${e.location}`}
                  </div>
                  {e.points &&
                    splitExperiencePointsForPreview(e.points).map((p, j) => (
                      <p key={j} style={{ fontSize: pt(10), margin: "0 0 1.5mm", lineHeight: 1.45 }}>
                        • {p}
                      </p>
                    ))}
                </div>
              </EntryWrap>
            ))
          )}
        </section>
      )}

      {/* Education */}
      {(cv.education?.length > 0 || isEmpty) && (
        <section data-section="education">
          <SectionTitle>Education</SectionTitle>
          {isEmpty ? (
            <div style={{ color: SKELETON }}>
              <div style={{ fontWeight: "bold" }}>Degree / Field of Study</div>
              <div>University or School Name | 2018</div>
            </div>
          ) : (
            cv.education.map((edu, i) => (
              <EntryWrap key={i}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: "bold", fontSize: pt(10.5), color: PRIMARY }}>{edu.degree}</span>
                  <span style={{ color: TEXT_MUTED, fontSize: pt(10) }}>{edu.year}</span>
                </div>
                <div style={{ fontSize: pt(10), color: TEXT_MUTED }}>{edu.school}</div>
              </EntryWrap>
            ))
          )}
        </section>
      )}

      {/* Languages */}
      {languageList.length > 0 && (
        <section data-section="languages">
          <SectionTitle>Languages</SectionTitle>
          <div style={{ fontSize: pt(10.5), lineHeight: 1.5 }}>
            {languageList.join(", ")}
          </div>
        </section>
      )}
    </div>
  );
}
