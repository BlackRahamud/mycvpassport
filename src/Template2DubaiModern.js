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

const GREEN = "#064E3B"; // Deep Forest Green
const GOLD = "#B45309"; // Rich Gold/Sandstone
const BG_CREAM = "#FDFBF7"; // Soft Cream Background
const TEXT_BODY = "#374151"; // Dark Gray

const FONT = 'Arial, "Helvetica Neue", Helvetica, sans-serif';

function PreviewSandstoneExecutive({ cv, mobileMode = false }) {
  const s = mobileMode ? 0.8 : 1;
  const pt = (n) => `${n * s}pt`;

  const isEmpty = !cv.name || cv.name.trim() === "";
  const personalDetails = buildPersonalDetailsEntries(cv);

  const SectionTitle = ({ children, first }) => (
    <div
      style={{
        marginTop: first ? 0 : "8mm",
        marginBottom: "4mm",
        display: "flex",
        alignItems: "center",
        gap: "10px",
        breakAfter: "avoid",
        pageBreakAfter: "avoid",
      }}
    >
      <span
        style={{
          fontSize: pt(13),
          fontWeight: "bold",
          color: GREEN,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {children}
      </span>
      <div style={{ flex: 1, height: "1.5px", backgroundColor: GOLD, opacity: 0.6 }} />
    </div>
  );

  const EntryWrap = ({ children }) => (
    <div
      style={{ marginBottom: "5mm", breakInside: "avoid", pageBreakInside: "avoid" }}
    >
      {children}
    </div>
  );

  const skills = cv.skills ? cv.skills.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const languages = cv.languages ? cv.languages.split(",").map((l) => l.trim()).filter(Boolean) : [];
  const hasTechnicalSkills = technicalSkillsGroupsForTemplate(cv.technicalSkills).length > 0;

  return (
    <div
      style={{
        width: mobileMode ? "100%" : "210mm",
        maxWidth: "100%",
        minHeight: "auto",
        background: BG_CREAM,
        padding: "15mm",
        paddingBottom: "40px", // Puppeteer constraint
        boxSizing: "border-box",
        fontFamily: FONT,
        color: TEXT_BODY,
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      {/* Modern Left-Aligned Header */}
      <header style={{ marginBottom: "8mm", borderLeft: `4px solid ${GREEN}`, paddingLeft: "15px" }}>
        <h1 style={{ fontSize: pt(26), fontWeight: "900", color: GREEN, margin: 0, lineHeight: 1 }}>
          {ph(cv.name, "JORDAN A. BLAKE")}
        </h1>
        <div
          style={{
            fontSize: pt(13),
            color: GOLD,
            fontWeight: "bold",
            marginTop: "4px",
            textTransform: "uppercase",
          }}
        >
          {ph(cv.title, "SENIOR PROJECT MANAGER")}
        </div>
        <div
          style={{
            fontSize: pt(9),
            color: TEXT_BODY,
            marginTop: "8px",
            display: "flex",
            flexWrap: "wrap",
            gap: "8px",
          }}
        >
          {isEmpty ? (
            <span className="cvp-ph">jordan.b@email.com • +01 123 456 789 • Los Angeles, CA</span>
          ) : (
            <>
              {cv.email && <span>{cv.email}</span>}
              {cv.phone && <span>• {cv.phone}</span>}
              {cv.location && <span>• {cv.location}</span>}
              {cv.linkedin && <span>• {cv.linkedin}</span>}
            </>
          )}
        </div>
        {personalDetails.length > 0 && (
          <div
            style={{
              fontSize: pt(9),
              color: TEXT_BODY,
              marginTop: "6px",
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
      {(cv.summary || isEmpty) && (
        <section data-section="summary">
          <SectionTitle first>Executive Summary</SectionTitle>
          <GhostChip>
            {cv.summary ||
              "A dynamic and results-driven professional with 10+ years of experience. Expert in leading cross-functional teams to exceed corporate goals and delivering multi-million dollar impact."}
          </GhostChip>
          <p style={{ fontSize: pt(10), lineHeight: 1.5, margin: 0, color: TEXT_BODY }}>
            {ph(
              cv.summary,
              "A dynamic and results-driven professional with 10+ years of experience. Expert in leading cross-functional teams to exceed corporate goals and delivering multi-million dollar impact."
            )}
          </p>
        </section>
      )}

      {/* Experience */}
      {((Array.isArray(cv.experience) && cv.experience.filter((e) => e.company).length > 0) || isEmpty) && (
      <section data-section="experience">
        <SectionTitle>Work History</SectionTitle>
        {isEmpty ? (
          <EntryWrap>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span className="cvp-ph" style={{ fontSize: pt(11), fontWeight: "bold", color: GREEN }}>Job Role / Position</span>
              <span className="cvp-ph" style={{ fontSize: pt(9.5), fontWeight: "bold", color: GOLD }}>2020 — Present</span>
            </div>
            <div className="cvp-ph" style={{ fontSize: pt(10), fontWeight: "bold", fontStyle: "italic", marginBottom: "2mm" }}>
              Company Name | Location
            </div>
            <p className="cvp-ph" style={{ fontSize: pt(9.5), margin: "0 0 1.5mm", lineHeight: 1.4, paddingLeft: "4mm" }}>
              • Accomplishment or responsibility placeholder line
            </p>
          </EntryWrap>
        ) : (
          cv.experience
            .filter((e) => e.company)
            .map((e, i) => (
              <EntryWrap key={i}>
                <GhostChip>{`${e.role} ${e.company}`}</GhostChip>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: pt(11), fontWeight: "bold", color: GREEN }}>{e.role}</span>
                  <span style={{ fontSize: pt(9.5), fontWeight: "bold", color: GOLD }}>{e.period}</span>
                </div>
                <div style={{ fontSize: pt(10), fontWeight: "bold", fontStyle: "italic", marginBottom: "2mm" }}>
                  {e.company} {e.location && `| ${e.location}`}
                </div>
                {e.points && (() => {
                  const { bullets, format } = parseExperiencePoints(e.points);
                  return bullets.map((p, j) => (
                    <p key={j} style={{ fontSize: pt(9.5), margin: "0 0 1.5mm", lineHeight: 1.4, paddingLeft: "4mm" }}>
                      {format === "list" ? `• ${p}` : p}
                    </p>
                  ));
                })()}
              </EntryWrap>
            ))
        )}
      </section>
      )}

      {/* Skills */}
      {(skills.length > 0 || isEmpty) && (
        <section data-section="competencies">
          <SectionTitle>Skills</SectionTitle>
          <GhostChip>{Array.isArray(skills) ? skills.join(" ") : cv.skills}</GhostChip>
          <div
            style={{
              fontSize: pt(10),
              lineHeight: 1.8,
              color: TEXT_BODY,
              fontWeight: "bold",
            }}
          >
            {isEmpty ? <span className="cvp-ph">Skill One • Skill Two • Skill Three</span> : skills.join(" • ")}
          </div>
        </section>
      )}

      {/* Technical Skills */}
      {(hasTechnicalSkills || isEmpty) && (
        <section data-section="competencies">
          <SectionTitle>Technical Skills</SectionTitle>
          <div style={{ fontSize: pt(10), lineHeight: 1.8, margin: 0, color: TEXT_BODY }}>
            {isEmpty ? (
              <span className="cvp-ph">Python, SQL, cloud platforms</span>
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
      {((Array.isArray(cv.education) && cv.education.filter((edu) => edu.school).length > 0) || isEmpty) && (
      <section data-section="education">
        <SectionTitle>Academic Background</SectionTitle>
        {isEmpty ? (
          <EntryWrap>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="cvp-ph" style={{ fontWeight: "bold", fontSize: pt(10.5), color: GREEN }}>Degree / Field of Study</span>
              <span className="cvp-ph" style={{ color: GOLD, fontWeight: "bold", fontSize: pt(9.5) }}>2018</span>
            </div>
            <div className="cvp-ph" style={{ fontSize: pt(10) }}>University or School Name</div>
          </EntryWrap>
        ) : (
          cv.education
            .filter((edu) => edu.school)
            .map((edu, i) => (
              <EntryWrap key={i}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontWeight: "bold", fontSize: pt(10.5), color: GREEN }}>{edu.degree}</span>
                  <span style={{ color: GOLD, fontWeight: "bold", fontSize: pt(9.5) }}>{edu.year}</span>
                </div>
                <div style={{ fontSize: pt(10) }}>{edu.school}</div>
              </EntryWrap>
            ))
        )}
      </section>
      )}

      {/* Languages */}
      {languages.length > 0 && (
        <section data-section="languages">
          <SectionTitle>Languages</SectionTitle>
          <div
            style={{
              fontSize: pt(10),
              lineHeight: 1.8,
              color: TEXT_BODY,
              fontWeight: "bold",
            }}
          >
            {languages.join(" • ")}
          </div>
        </section>
      )}
    </div>
  );
}

// Keep the same exported name used by src/App.js
export function PreviewTwoCol({ cv, t, mobileMode = false }) {
  return <PreviewSandstoneExecutive cv={cv} mobileMode={mobileMode} />;
}
