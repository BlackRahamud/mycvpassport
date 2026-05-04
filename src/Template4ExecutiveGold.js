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

const BAND_BG = "#F3F4F6"; // Light grey for header and section bars
const TEXT_PRIMARY = "#1F2937"; // Dark charcoal
const TEXT_SECONDARY = "#4B5563"; // Subtle accent/body
const SKELETON = "#D1D5DB";

const FONT = 'Arial, "Helvetica Neue", Helvetica, sans-serif';

export function PreviewSlateMinimalist({ cv, mobileMode = false }) {
  const s = mobileMode ? 0.8 : 1;
  const pt = (n) => `${n * s}pt`;
  const isEmpty = !cv.name || cv.name.trim() === "";
  const skillsCells = (cv.skills || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const hasTechnicalSkills = technicalSkillsGroupsForTemplate(cv.technicalSkills).length > 0;
  const languageList = (cv.languages || "")
    .split(",")
    .map((l) => l.trim())
    .filter(Boolean);

  const SectionBand = ({ children }) => (
    <div
      style={{
        background: BAND_BG,
        padding: "4px 0",
        textAlign: "center",
        marginTop: "8mm",
        marginBottom: "5mm",
        breakAfter: "avoid",
        pageBreakAfter: "avoid",
      }}
    >
      <span
        style={{
          fontSize: pt(11),
          fontWeight: "700",
          color: TEXT_PRIMARY,
          textTransform: "uppercase",
          letterSpacing: "2px",
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
        paddingBottom: "40px", // Puppeteer footer constraint
        boxSizing: "border-box",
        fontFamily: FONT,
        color: TEXT_SECONDARY,
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      {/* Shaded Header Band */}
      <header
        style={{
          background: BAND_BG,
          padding: "12mm 15mm",
          textAlign: "center",
          borderBottom: `1px solid ${SKELETON}`,
        }}
      >
        <h1
          style={{
            fontSize: pt(28),
            fontWeight: "900",
            margin: 0,
            color: isEmpty ? SKELETON : TEXT_PRIMARY,
            letterSpacing: "-0.5px",
          }}
        >
          {cv.name || "JONATHAN DOE"}
        </h1>
        <div
          style={{
            fontSize: pt(13),
            fontWeight: "400",
            color: isEmpty ? SKELETON : TEXT_SECONDARY,
            marginTop: "4px",
            textTransform: "uppercase",
            letterSpacing: "3px",
          }}
        >
          {cv.title || "EXECUTIVE IT MANAGER"}
        </div>
        <div
          style={{
            marginTop: "12px",
            fontSize: pt(9.5),
            display: "flex",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: "8px 20px",
            color: TEXT_PRIMARY,
            fontWeight: "500",
          }}
        >
          {isEmpty ? (
            <span style={{ color: SKELETON }}>email@address.com • +00 000 000 • Location</span>
          ) : (
            <>
              {cv.email && <span>{cv.email}</span>}
              {cv.phone && <span>{cv.phone}</span>}
              {cv.location && <span>{cv.location}</span>}
              {cv.linkedin && <span>LINKEDIN</span>}
            </>
          )}
        </div>
      </header>

      <div style={{ padding: "0 15mm" }}>
        {/* Profile */}
        <section data-section="summary">
          <GhostChip>
            {cv.summary ||
              "Strategically-minded professional with 10+ years of experience..."}
          </GhostChip>
          <SectionBand>Professional Profile</SectionBand>
          <p
            style={{
              fontSize: pt(10),
              lineHeight: 1.6,
              margin: 0,
              textAlign: "center",
              color: TEXT_SECONDARY,
            }}
          >
            {cv.summary || "Strategically-minded professional with 10+ years of experience..."}
          </p>
        </section>

        {/* Experience - Two Column Feel within Single Column */}
        <section data-section="experience">
          <SectionBand>Work History</SectionBand>
          {cv.experience.filter((e) => e.company).map((e, i) => (
            <div
              key={i}
              style={{
                marginBottom: "6mm",
                breakInside: "avoid",
                pageBreakInside: "avoid",
              }}
            >
              <GhostChip>{`${e.role} ${e.company}`}</GhostChip>
              <div style={{ display: "flex", marginBottom: "2px" }}>
                {/* Left side: Date/Location */}
                <div style={{ width: "30%", fontSize: pt(9), fontWeight: "700", color: TEXT_SECONDARY }}>
                  {e.period} <br />
                  <span style={{ fontWeight: "400", fontSize: pt(8.5) }}>{e.location}</span>
                </div>
                {/* Right side: Company/Role */}
                <div style={{ width: "70%", textAlign: "right" }}>
                  <div style={{ fontWeight: "800", fontSize: pt(11), color: TEXT_PRIMARY }}>{e.role}</div>
                  <div style={{ fontStyle: "italic", fontSize: pt(10), color: TEXT_SECONDARY }}>{e.company}</div>
                </div>
              </div>

              {/* Bullets: Full Width below */}
              <div style={{ marginTop: "3mm" }}>
                {e.points &&
                  splitExperiencePointsForPreview(e.points).map((p, j) => (
                    <p
                      key={j}
                      style={{
                        fontSize: pt(9.5),
                        margin: "0 0 1.5mm",
                        lineHeight: 1.5,
                        display: "flex",
                        gap: "10px",
                      }}
                    >
                      <span style={{ color: SKELETON }}>•</span>
                      <span>{p}</span>
                    </p>
                  ))}
              </div>
            </div>
          ))}
        </section>

        {/* Skills */}
        {(skillsCells.length > 0 || isEmpty) && (
          <section data-section="competencies">
            <SectionBand>Skills</SectionBand>
            <GhostChip>
              {Array.isArray(cv.skills) ? cv.skills.join(" ") : cv.skills || ""}
            </GhostChip>
            {isEmpty ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px 20px" }}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} style={{ height: "12px", backgroundColor: SKELETON }} />
                ))}
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "8px 20px",
                  fontSize: pt(9.5),
                  color: TEXT_PRIMARY,
                }}
              >
                {skillsCells.map((s, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ color: SKELETON }}>•</span> {s}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Technical Skills */}
        {(hasTechnicalSkills || isEmpty) && (
          <section data-section="competencies">
            <SectionBand>Technical Skills</SectionBand>
            <div style={{ fontSize: pt(9.5), color: TEXT_PRIMARY, margin: 0, lineHeight: 1.6 }}>
              {isEmpty ? (
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

        {/* Languages */}
        {languageList.length > 0 && (
          <section data-section="languages">
            <SectionBand>Languages</SectionBand>
            <div
              style={{
                fontSize: pt(9.5),
                color: TEXT_PRIMARY,
                textAlign: "center",
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {languageList.join(" • ")}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

// Keep the same exported name used by src/App.js
export function PreviewTimeline({ cv, t, mobileMode = false }) {
  return <PreviewSlateMinimalist cv={cv} mobileMode={mobileMode} />;
}

