import React from "react";
import GhostChip from "./components/GhostChip";
import { splitExperiencePointsForPreview } from "./experiencePointsPreview";

const NAVY_DARK = "#0F172A"; // Deep navy/black
const TEXT_PRIMARY = "#1F2937"; // Charcoal
const TEXT_SECONDARY = "#4B5563"; // Slate/Grey
const ACCENT = "#334155"; // Muted dark slate
const SKELETON = "#D1D5DB";

const FONT = 'Arial, "Helvetica Neue", Helvetica, sans-serif';

export function PreviewEditorialDark({ cv, mobileMode = false }) {
  const s = mobileMode ? 0.8 : 1;
  const pt = (n) => `${n * s}pt`;
  const isEmpty = !cv.name || cv.name.trim() === "";

  const SectionTitle = ({ children }) => (
    <div style={{ marginTop: "8mm", marginBottom: "5mm", breakAfter: "avoid" }}>
      <div
        style={{
          fontSize: pt(13),
          fontWeight: "800",
          color: NAVY_DARK,
          textTransform: "uppercase",
          letterSpacing: "1px",
          fontFamily: FONT,
        }}
      >
        {children}
      </div>
      {/* Short thick underline/bar */}
      <div style={{ width: "35px", height: "4px", backgroundColor: NAVY_DARK, marginTop: "4px" }} />
    </div>
  );

  const experience = Array.isArray(cv.experience) ? cv.experience : [];
  const skillsCells = (cv.skills || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const technicalSkillsTrim = String(cv.technicalSkills || "").trim();

  return (
    <div
      style={{
        width: mobileMode ? "100%" : "210mm",
        maxWidth: "100%",
        minHeight: "auto",
        background: "#FFFFFF",
        paddingBottom: "40px", // Puppeteer constraint
        boxSizing: "border-box",
        fontFamily: FONT,
        color: TEXT_SECONDARY,
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      {/* Dark Full-Width Header Band */}
      <header
        style={{
          background: NAVY_DARK,
          padding: "12mm 15mm",
          color: "#FFFFFF",
          textAlign: "left",
        }}
      >
        <h1
          style={{
            fontSize: pt(26),
            fontWeight: "900",
            margin: 0,
            color: isEmpty ? SKELETON : "#FFFFFF",
            letterSpacing: "-0.5px",
          }}
        >
          {cv.name || "JONATHAN DOE"}
        </h1>
        <div
          style={{
            fontSize: pt(12),
            fontWeight: "400",
            color: isEmpty ? SKELETON : "#94A3B8",
            marginTop: "2px",
            textTransform: "uppercase",
            letterSpacing: "2px",
          }}
        >
          {cv.title || "STRATEGIC OPERATIONS DIRECTOR"}
        </div>

        <div
          style={{
            marginTop: "15px",
            fontSize: pt(9),
            display: "flex",
            flexWrap: "wrap",
            gap: "8px 20px",
            color: "#F1F5F9",
            opacity: 0.9,
          }}
        >
          {isEmpty ? (
            <span style={{ color: SKELETON }}>email@address.com • +00 000 000 • Location</span>
          ) : (
            <>
              {cv.email && <span>{cv.email}</span>}
              {cv.phone && <span>{cv.phone}</span>}
              {cv.location && <span>{cv.location}</span>}
              {(cv.linkedin || cv.linkedIn) && <span>LINKEDIN</span>}
            </>
          )}
        </div>
      </header>

      <div style={{ padding: "0 15mm" }}>
        {/* Profile */}
        {cv.summary && (
          <section style={{ position: "relative" }}>
            <GhostChip>{cv.summary}</GhostChip>
            <SectionTitle>Profile</SectionTitle>
            <p
              style={{
                fontSize: pt(10),
                lineHeight: 1.6,
                margin: 0,
                color: TEXT_PRIMARY,
              }}
            >
              {cv.summary}
            </p>
          </section>
        )}

        {/* Experience */}
        <section>
          <SectionTitle>Experience</SectionTitle>
          {experience
            .filter((e) => e.company)
            .map((e, i) => (
              <div
                key={i}
                style={{ marginBottom: "6mm", breakInside: "avoid", pageBreakInside: "avoid", position: "relative" }}
              >
                <GhostChip>{`${e.role} ${e.company}`}</GhostChip>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div style={{ fontWeight: "800", fontSize: pt(11), color: NAVY_DARK }}>{e.company}</div>
                  <div style={{ fontSize: pt(9), fontWeight: "600", color: TEXT_SECONDARY }}>{e.period}</div>
                </div>
                <div style={{ fontStyle: "italic", fontSize: pt(10), color: ACCENT, marginTop: "1px" }}>{e.role}</div>

                <div style={{ marginTop: "3mm" }}>
                  {e.points &&
                    splitExperiencePointsForPreview(e.points).map((p, j) => (
                      <div
                        key={j}
                        style={{
                          fontSize: pt(9.5),
                          margin: "0 0 1.5mm",
                          lineHeight: 1.5,
                          display: "flex",
                          gap: "8px",
                          color: TEXT_PRIMARY,
                        }}
                      >
                        <span style={{ color: SKELETON }}>•</span>
                        <span>{p}</span>
                      </div>
                    ))}
                </div>
              </div>
            ))}
        </section>

        {/* Skills */}
        {(skillsCells.length > 0 || isEmpty) && (
          <section style={{ position: "relative" }}>
            <SectionTitle>Skills</SectionTitle>
            <GhostChip>
              {Array.isArray(cv.skills) ? cv.skills.join(" ") : cv.skills || ""}
            </GhostChip>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "2px" }}>
              {(isEmpty ? ["Skill One", "Skill Two", "Skill Three"] : skillsCells).map((s, i) => (
                <span
                  key={i}
                  style={{
                    background: NAVY_DARK,
                    color: "#FFFFFF",
                    fontSize: pt(8.5),
                    padding: "3px 10px",
                    borderRadius: "4px",
                    fontWeight: "600",
                    letterSpacing: "0.3px",
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Technical Skills */}
        {(technicalSkillsTrim || isEmpty) && (
          <section style={{ position: "relative" }}>
            <SectionTitle>Technical Skills</SectionTitle>
            <p style={{ fontSize: pt(9.5), color: TEXT_PRIMARY, margin: 0, lineHeight: 1.6 }}>
              {isEmpty ? "Stack, tools, and platforms" : cv.technicalSkills}
            </p>
          </section>
        )}

        {/* Education */}
        {cv.education && cv.education.length > 0 && (
          <section>
            <SectionTitle>Education</SectionTitle>
            {cv.education
              .filter((edu) => edu.school)
              .map((edu, i) => (
                <div key={i} style={{ marginBottom: "4mm", breakInside: "avoid" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                    <div style={{ fontWeight: "700", color: NAVY_DARK, fontSize: pt(10) }}>{edu.school}</div>
                    <div style={{ fontSize: pt(9), color: TEXT_SECONDARY }}>{edu.year}</div>
                  </div>
                  <div style={{ fontSize: pt(9.5), color: TEXT_SECONDARY }}>{edu.degree}</div>
                </div>
              ))}
          </section>
        )}
      </div>
    </div>
  );
}

// Keep the same exported name used by src/App.js
export function PreviewGulfExecutive({ cv, t, mobileMode = false }) {
  return <PreviewEditorialDark cv={cv} mobileMode={mobileMode} />;
}