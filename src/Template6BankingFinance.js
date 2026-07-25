import React from "react";
import GhostChip from "./components/GhostChip";
import { parseExperiencePoints } from "./experiencePointsPreview";
import { buildPersonalDetailsEntries } from "./cvShared";

function technicalSkillsGroupsForTemplate(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((g) => g.chips?.length > 0);
  // Legacy string: pipe-separated
  const chips = raw.split("|").map((s) => s.trim()).filter(Boolean);
  if (!chips.length) return [];
  return [{ category: 'Technical Skills', chips }];
}

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

const FREE_TEXT_BULLET = /^\s*(?:[•·*]\s*|[-–]\s+|\d+[.):]\s+)/;
function freeTextLines(raw) {
  if (!raw) return [];
  return String(raw)
    .split(/\r?\n/)
    .map((line) => line.trim().replace(FREE_TEXT_BULLET, "").trim())
    .filter(Boolean);
}

const joinComma = (...parts) =>
  parts.map((p) => (p == null ? "" : String(p).trim())).filter(Boolean).join(", ");

const ACCENT = "#0369A1"; // Rich Teal-Blue
const TEXT_DARK = "#1a1a2e";
const GREY = "#6b7280";
const FONT = 'Arial, "Helvetica Neue", Helvetica, sans-serif';

function PreviewBankingFinanceInner({ cv, mobileMode = false }) {
  const s = mobileMode ? 0.8 : 1;
  const pt = (n) => `${n * s}pt`;

  // Placeholder Logic
  const isPlaceholder = !cv.name || String(cv.name).trim() === "";
  const textColor = isPlaceholder ? "#D1D5DB" : TEXT_DARK;
  const subTextColor = isPlaceholder ? "#D1D5DB" : GREY;
  const accentColor = isPlaceholder ? "#D1D5DB" : ACCENT;

  const personalDetails = buildPersonalDetailsEntries(cv);
  const experience = Array.isArray(cv.experience) ? cv.experience : [];
  const education = Array.isArray(cv.education) ? cv.education : [];
  const skills = cv.skills ? cv.skills.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const languages = cv.languages ? cv.languages.split(",").map((l) => l.trim()).filter(Boolean) : [];
  const hasTechnicalSkills = technicalSkillsGroupsForTemplate(cv.technicalSkills).length > 0;
  const certList = certificationLines(cv);
  const projectLines = freeTextLines(cv.projects);
  const publicationLines = freeTextLines(cv.publications);
  const volunteerLines = freeTextLines(cv.volunteerWork);

  const SectionTitle = ({ children }) => (
    <div style={{ marginTop: "8mm", marginBottom: "5mm", pageBreakAfter: "avoid" }}>
      <span
        style={{
          fontSize: pt(11),
          fontWeight: "bold",
          textTransform: "uppercase",
          color: textColor,
          display: "inline-block",
          borderBottom: `2.5px solid ${accentColor}`,
          paddingBottom: "2px",
          letterSpacing: "0.5px",
        }}
      >
        {children}
      </span>
    </div>
  );

  return (
    <div
      style={{
        width: mobileMode ? "100%" : "210mm",
        maxWidth: "100%",
        minHeight: "auto",
        background: "#FFFFFF",
        padding: "15mm 18mm 40px", // Puppeteer footer constraint
        boxSizing: "border-box",
        fontFamily: FONT,
        color: textColor,
        WebkitPrintColorAdjust: "exact",
        lineHeight: 1.4,
      }}
    >
      {/* Header - Clean White */}
      <header style={{ marginBottom: "10mm", textAlign: "left" }}>
        <h1 style={{ fontSize: pt(24), fontWeight: "bold", margin: 0, color: textColor }}>{cv.name || "Full Name"}</h1>
        <div style={{ fontSize: pt(12), fontWeight: "bold", marginTop: "1mm", color: textColor }}>
          {cv.title || "Banking & Finance Professional"}
        </div>
        <div
          style={{
            fontSize: pt(9),
            color: subTextColor,
            marginTop: "3mm",
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          {cv.email && <span>{cv.email}</span>}
          {cv.phone && <span>• {cv.phone}</span>}
          {cv.location && <span>• {cv.location}</span>}
          {(cv.linkedin || cv.linkedIn) && <span>• {cv.linkedin || cv.linkedIn}</span>}
          {isPlaceholder && <span style={{ color: "#D1D5DB" }}>email@address.com • +00 000 000 • Location</span>}
        </div>
        {personalDetails.length > 0 && (
          <div
            style={{
              fontSize: pt(9),
              color: subTextColor,
              marginTop: "2mm",
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            {personalDetails.map((d, i) => (
              <span key={i}>
                {i > 0 && "• "}
                {d.label}: {d.value}
              </span>
            ))}
          </div>
        )}
      </header>

      {/* Summary */}
      {(cv.summary || isPlaceholder) && (
        <section data-section="summary">
          <GhostChip>
            {cv.summary ||
              "Strategically-minded professional with 10+ years of experience..."}
          </GhostChip>
          <SectionTitle>Professional Profile</SectionTitle>
          <p style={{ fontSize: pt(10), margin: 0, textAlign: "justify", color: isPlaceholder ? "#D1D5DB" : "#333" }}>
            {cv.summary || "Strategically-minded professional with 10+ years of experience..."}
          </p>
        </section>
      )}

      {/* Experience - Two Column Layout */}
      {(experience.length > 0 || isPlaceholder) && (
        <section data-section="experience">
          <SectionTitle>Professional Experience</SectionTitle>
          {isPlaceholder ? (
            <div style={{ display: "flex", marginBottom: "6mm", pageBreakInside: "avoid", gap: "10mm" }}>
              <div style={{ width: "35mm", flexShrink: 0, fontSize: pt(9), color: "#D1D5DB" }}>
                <div style={{ height: "12px", width: "70%", backgroundColor: "#D1D5DB", marginBottom: "6px" }} />
                <div style={{ height: "10px", width: "55%", backgroundColor: "#D1D5DB" }} />
              </div>
              <div style={{ flexGrow: 1 }}>
                <div style={{ height: "12px", width: "60%", backgroundColor: "#D1D5DB", marginBottom: "6px" }} />
                <div style={{ height: "10px", width: "45%", backgroundColor: "#D1D5DB", marginBottom: "10px" }} />
                <div style={{ height: "10px", width: "90%", backgroundColor: "#D1D5DB", marginBottom: "5px" }} />
                <div style={{ height: "10px", width: "85%", backgroundColor: "#D1D5DB" }} />
              </div>
            </div>
          ) : (
            experience.map((exp, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  marginBottom: "6mm",
                  pageBreakInside: "avoid",
                  gap: "10mm",
                }}
              >
                <GhostChip>{`${exp.role} ${exp.company}`}</GhostChip>
                {/* Left Column: Date and Location Stacked */}
                <div style={{ width: "35mm", flexShrink: 0, fontSize: pt(9), color: subTextColor, textAlign: "left" }}>
                  <div style={{ fontWeight: "bold" }}>{exp.period}</div>
                  <div>{exp.location}</div>
                </div>

                {/* Right Column: Experience Details */}
                <div style={{ flexGrow: 1 }}>
                  <div style={{ fontSize: pt(11), fontWeight: "bold", color: accentColor }}>{exp.company}</div>
                  <div style={{ fontSize: pt(10), fontStyle: "italic", marginBottom: "2mm" }}>{exp.role}</div>
                  {exp.points && (() => {
                    const { bullets, format } = parseExperiencePoints(exp.points);
                    return bullets.map((point, idx) => (
                      <div
                        key={idx}
                        style={{
                          fontSize: pt(10),
                          display: "flex",
                          gap: "6px",
                          marginBottom: "1mm",
                          color: "#333",
                        }}
                      >
                        {format === "list" && <span>•</span>}
                        <span>{point}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            ))
          )}
        </section>
      )}

      {/* Skills */}
      {(skills.length > 0 || isPlaceholder) && (
        <section data-section="competencies" style={{ pageBreakInside: "avoid" }}>
          <GhostChip>
            {Array.isArray(skills) ? skills.join(" ") : cv.skills}
          </GhostChip>
          <SectionTitle>Skills</SectionTitle>
          <p style={{ fontSize: pt(10), margin: 0, color: isPlaceholder ? "#D1D5DB" : "#333" }}>
            {isPlaceholder ? "Skill One • Skill Two • Skill Three" : skills.join(" • ")}
          </p>
        </section>
      )}

      {/* Technical Skills */}
      {(hasTechnicalSkills || isPlaceholder) && (
        <section data-section="competencies" style={{ pageBreakInside: "avoid" }}>
          <SectionTitle>Technical Skills</SectionTitle>
          <div style={{ fontSize: pt(10), margin: 0, color: isPlaceholder ? "#D1D5DB" : "#333" }}>
            {isPlaceholder ? (
              "Tools, platforms, and stack"
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

      {/* Education */}
      {(education.length > 0 || isPlaceholder) && (
        <section data-section="education">
          <SectionTitle>Education</SectionTitle>
          {isPlaceholder ? (
            <div style={{ display: "flex", marginBottom: "4mm", gap: "10mm", pageBreakInside: "avoid" }}>
              <div style={{ width: "35mm", flexShrink: 0 }}>
                <div style={{ height: "10px", width: "55%", backgroundColor: "#D1D5DB" }} />
              </div>
              <div style={{ flexGrow: 1 }}>
                <div style={{ height: "12px", width: "60%", backgroundColor: "#D1D5DB", marginBottom: "6px" }} />
                <div style={{ height: "10px", width: "75%", backgroundColor: "#D1D5DB" }} />
              </div>
            </div>
          ) : (
            education.map((edu, i) => (
              <div key={i} style={{ display: "flex", marginBottom: "4mm", gap: "10mm", pageBreakInside: "avoid" }}>
                <div style={{ width: "35mm", flexShrink: 0, fontSize: pt(9), color: subTextColor }}>
                  <div style={{ fontWeight: "bold" }}>{edu.year}</div>
                </div>
                <div style={{ flexGrow: 1 }}>
                  <div style={{ fontSize: pt(11), fontWeight: "bold" }}>{joinComma(edu.school, edu.location)}</div>
                  <div style={{ fontSize: pt(10) }}>{joinComma(edu.degree, edu.fieldOfStudy)}</div>
                </div>
              </div>
            ))
          )}
        </section>
      )}

      {/* Certifications */}
      {certList.length > 0 && (
        <section data-section="certifications" style={{ pageBreakInside: "avoid" }}>
          <SectionTitle>Certifications</SectionTitle>
          {certList.map((line, i) => (
            <div key={i} style={{ fontSize: pt(10), display: "flex", gap: "6px", marginBottom: "1mm", color: "#333" }}>
              <span>•</span>
              <span>{line}</span>
            </div>
          ))}
        </section>
      )}

      {/* Projects */}
      {projectLines.length > 0 && (
        <section data-section="projects" style={{ pageBreakInside: "avoid" }}>
          <SectionTitle>Projects</SectionTitle>
          {projectLines.map((line, i) => (
            <div key={i} style={{ fontSize: pt(10), display: "flex", gap: "6px", marginBottom: "1mm", color: "#333" }}>
              <span>•</span>
              <span>{line}</span>
            </div>
          ))}
        </section>
      )}

      {/* Publications */}
      {publicationLines.length > 0 && (
        <section data-section="publications" style={{ pageBreakInside: "avoid" }}>
          <SectionTitle>Publications</SectionTitle>
          {publicationLines.map((line, i) => (
            <div key={i} style={{ fontSize: pt(10), display: "flex", gap: "6px", marginBottom: "1mm", color: "#333" }}>
              <span>•</span>
              <span>{line}</span>
            </div>
          ))}
        </section>
      )}

      {/* Volunteer Work */}
      {volunteerLines.length > 0 && (
        <section data-section="volunteer" style={{ pageBreakInside: "avoid" }}>
          <SectionTitle>Volunteer Work</SectionTitle>
          {volunteerLines.map((line, i) => (
            <div key={i} style={{ fontSize: pt(10), display: "flex", gap: "6px", marginBottom: "1mm", color: "#333" }}>
              <span>•</span>
              <span>{line}</span>
            </div>
          ))}
        </section>
      )}

      {/* Languages */}
      {languages.length > 0 && (
        <section data-section="languages" style={{ pageBreakInside: "avoid" }}>
          <SectionTitle>Languages</SectionTitle>
          <p style={{ fontSize: pt(10), margin: 0, color: "#333" }}>
            {languages.join(" • ")}
          </p>
        </section>
      )}
    </div>
  );
}

// Keep the same exported name used by src/App.js
export function PreviewBankingFinance({ cv, t, mobileMode = false }) {
  return <PreviewBankingFinanceInner cv={cv} mobileMode={mobileMode} />;
}