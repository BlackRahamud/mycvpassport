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

const PRIMARY = "#1F2937"; // Deep Charcoal
const ACCENT = "#475569"; // Steel Blue
const BORDER = "#E5E7EB"; // Light Gray
const TEXT_BODY = "#374151";
const SKELETON = "#D1D5DB";

const FONT = 'Arial, "Helvetica Neue", Helvetica, sans-serif';

function PreviewExecutiveModern({ cv, mobileMode = false }) {
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

  const SectionHeader = ({ children }) => (
    <div
      style={{
        borderBottom: `1.5px solid ${isEmpty ? SKELETON : PRIMARY}`,
        paddingBottom: "4px",
        marginTop: "8mm",
        marginBottom: "4mm",
        textAlign: "center",
        breakAfter: "avoid",
        pageBreakAfter: "avoid",
      }}
    >
      <span
        style={{
          fontSize: pt(12),
          fontWeight: "800",
          color: isEmpty ? SKELETON : PRIMARY,
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
        background: "#fff",
        padding: "15mm 20mm",
        paddingBottom: "40px", // Puppeteer constraint
        boxSizing: "border-box",
        fontFamily: FONT,
        color: TEXT_BODY,
        WebkitPrintColorAdjust: "exact",
      }}
    >
      {/* Left-aligned header (same behavior as T1/T2) */}
      <header style={{ marginBottom: "8mm", borderLeft: `4px solid ${isEmpty ? SKELETON : PRIMARY}`, paddingLeft: "15px" }}>
        <h1
          style={{
            fontSize: pt(26),
            fontWeight: "900",
            margin: 0,
            color: isEmpty ? SKELETON : PRIMARY,
            letterSpacing: "-0.5px",
          }}
        >
          {cv.name || "BRIAN T. WAYNE"}
        </h1>
        <div
          style={{
            fontSize: pt(13),
            fontWeight: "600",
            color: isEmpty ? SKELETON : ACCENT,
            marginTop: "4px",
            marginBottom: "12px",
            textTransform: "uppercase",
            letterSpacing: "1px",
          }}
        >
          {cv.title || "Business Development Consultant"}
        </div>
        <div
          style={{
            fontSize: pt(9.5),
            color: TEXT_BODY,
            display: "flex",
            flexWrap: "wrap",
            gap: "8px 15px",
          }}
        >
          {isEmpty ? (
            <span style={{ color: SKELETON }}>email@address.com • +00 000 000 • Location • LinkedIn</span>
          ) : (
            <>
              {cv.email && <span>{cv.email}</span>}
              {cv.phone && <span>• {cv.phone}</span>}
              {cv.location && <span>• {cv.location}</span>}
              {cv.linkedin && <span>• {cv.linkedin}</span>}
            </>
          )}
        </div>
      </header>

      {/* Profile */}
      <section data-section="summary">
        <SectionHeader>Professional Profile</SectionHeader>
        <GhostChip>
          {cv.summary ||
            "Strategically-minded professional with an MBA and extensive experience in strategy and relationship building..."}
        </GhostChip>
        <p
          style={{
            fontSize: pt(10),
            lineHeight: 1.6,
            margin: 0,
            textAlign: "center",
            color: isEmpty ? SKELETON : TEXT_BODY,
          }}
        >
          {cv.summary ||
            "Strategically-minded professional with an MBA and extensive experience in strategy and relationship building..."}
        </p>
      </section>

      {/* Experience - T11 Structural Flow */}
      <section data-section="experience">
        <SectionHeader>Work Experience</SectionHeader>
        {isEmpty ? (
          <div style={{ marginBottom: "6mm" }}>
            <div style={{ height: "15px", width: "60%", backgroundColor: SKELETON, marginBottom: "5px" }} />
            <div style={{ height: "10px", width: "40%", backgroundColor: SKELETON, marginBottom: "8px" }} />
            <div style={{ height: "10px", width: "90%", backgroundColor: SKELETON }} />
          </div>
        ) : (
          (cv.experience || [])
            .filter((e) => e.company)
            .map((e, i) => (
              <div key={i} style={{ marginBottom: "6mm", breakInside: "avoid" }}>
                <GhostChip>{`${e.role} ${e.company}`}</GhostChip>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "2px" }}>
                  <span style={{ fontWeight: "bold", fontSize: pt(11), color: PRIMARY }}>{e.company}</span>
                  <span style={{ fontSize: pt(9), fontWeight: "bold", color: ACCENT }}>{e.period}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "2mm" }}>
                  <span style={{ fontStyle: "italic", fontSize: pt(10), color: TEXT_BODY }}>{e.role}</span>
                  <span style={{ fontSize: pt(9), color: TEXT_BODY }}>{e.location}</span>
                </div>
                {e.points &&
                  splitExperiencePointsForPreview(e.points).map((p, j) => (
                    <p
                      key={j}
                      style={{
                        fontSize: pt(9.5),
                        margin: "0 0 1.2mm",
                        lineHeight: 1.4,
                        display: "flex",
                        gap: "8px",
                      }}
                    >
                      <span style={{ color: ACCENT }}>•</span> <span>{p}</span>
                    </p>
                  ))}
              </div>
            ))
        )}
      </section>

      {/* Education */}
      <section data-section="education">
        <SectionHeader>Education</SectionHeader>
        {isEmpty ? (
          <div style={{ height: "20px", width: "50%", backgroundColor: SKELETON }} />
        ) : (
          (cv.education || [])
            .filter((edu) => edu.school)
            .map((edu, i) => (
              <div key={i} style={{ marginBottom: "4mm", breakInside: "avoid" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "bold" }}>
                  <span style={{ fontSize: pt(10.5), color: PRIMARY }}>{edu.degree}</span>
                  <span style={{ fontSize: pt(9.5), color: ACCENT }}>{edu.year}</span>
                </div>
                <div style={{ fontSize: pt(10), color: TEXT_BODY }}>{edu.school}</div>
              </div>
            ))
        )}
      </section>

      {/* Skills */}
      {(skillsCells.length > 0 || isEmpty) && (
        <section data-section="competencies">
          <SectionHeader>Skills</SectionHeader>
          {isEmpty ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px 20px" }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ height: "12px", backgroundColor: SKELETON, borderRadius: "2px" }} />
              ))}
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                gap: "10px 20px",
                fontSize: pt(9.5),
                color: TEXT_BODY,
                textAlign: "center",
              }}
            >
              <GhostChip>
                {Array.isArray(cv.skills) ? cv.skills.join(" ") : cv.skills || ""}
              </GhostChip>
              {skillsCells.map((s, i) => (
                <div key={i} style={{ borderBottom: `1px solid ${BORDER}`, paddingBottom: "2px" }}>
                  {s}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Technical Skills */}
      {(hasTechnicalSkills || isEmpty) && (
        <section data-section="competencies">
          <SectionHeader>Technical Skills</SectionHeader>
          <div
            style={{
              fontSize: pt(9.5),
              color: TEXT_BODY,
              textAlign: "center",
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            {isEmpty ? (
              "Tools, platforms, and stack details"
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
          <SectionHeader>Languages</SectionHeader>
          <div
            style={{
              fontSize: pt(9.5),
              color: TEXT_BODY,
              textAlign: "center",
              lineHeight: 1.6,
            }}
          >
            {languageList.join(" • ")}
          </div>
        </section>
      )}
    </div>
  );
}

// Keep the same exported name used by src/App.js
export function PreviewSidebar({ cv, t, mobileMode = false }) {
  return <PreviewExecutiveModern cv={cv} mobileMode={mobileMode} />;
}
