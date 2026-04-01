import React from "react";
import GhostChip from "./components/GhostChip";
import { splitExperiencePointsForPreview } from "./experiencePointsPreview";

const GREEN = "#064E3B"; // Deep Forest Green
const GOLD = "#B45309"; // Rich Gold/Sandstone
const BG_CREAM = "#FDFBF7"; // Soft Cream Background
const TEXT_BODY = "#374151"; // Dark Gray
const SKELETON = "#D1D5DB";

const FONT = 'Arial, "Helvetica Neue", Helvetica, sans-serif';

function PreviewSandstoneExecutive({ cv, mobileMode = false }) {
  const s = mobileMode ? 0.8 : 1;
  const pt = (n) => `${n * s}pt`;

  const isEmpty = !cv.name || cv.name.trim() === "";

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
          color: isEmpty ? SKELETON : GREEN,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {children}
      </span>
      <div style={{ flex: 1, height: "1.5px", backgroundColor: isEmpty ? SKELETON : GOLD, opacity: 0.6 }} />
    </div>
  );

  const EntryWrap = ({ children }) => (
    <div
      style={{ marginBottom: "5mm", breakInside: "avoid", pageBreakInside: "avoid", position: "relative" }}
    >
      {children}
    </div>
  );

  const skills = cv.skills ? cv.skills.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const technicalSkillsTrim = String(cv.technicalSkills || "").trim();

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
      <header style={{ marginBottom: "8mm", borderLeft: `4px solid ${isEmpty ? SKELETON : GREEN}`, paddingLeft: "15px" }}>
        <h1 style={{ fontSize: pt(26), fontWeight: "900", color: isEmpty ? SKELETON : GREEN, margin: 0, lineHeight: 1 }}>
          {cv.name || "JORDAN A. BLAKE"}
        </h1>
        <div
          style={{
            fontSize: pt(13),
            color: isEmpty ? SKELETON : GOLD,
            fontWeight: "bold",
            marginTop: "4px",
            textTransform: "uppercase",
          }}
        >
          {cv.title || "SENIOR PROJECT MANAGER"}
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
            <span style={{ color: SKELETON }}>jordan.b@email.com • +01 123 456 789 • Los Angeles, CA</span>
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

      {/* Summary */}
      <section style={{ position: "relative" }}>
        <SectionTitle first>Executive Summary</SectionTitle>
        <GhostChip>
          {cv.summary ||
            "A dynamic and results-driven professional with 10+ years of experience. Expert in leading cross-functional teams to exceed corporate goals and delivering multi-million dollar impact."}
        </GhostChip>
        <p style={{ fontSize: pt(10), lineHeight: 1.5, margin: 0, color: isEmpty ? SKELETON : TEXT_BODY }}>
          {cv.summary ||
            "A dynamic and results-driven professional with 10+ years of experience. Expert in leading cross-functional teams to exceed corporate goals and delivering multi-million dollar impact."}
        </p>
      </section>

      {/* Experience */}
      <section>
        <SectionTitle>Work History</SectionTitle>
        {isEmpty ? (
          <EntryWrap>
            <div style={{ height: "15px", width: "60%", backgroundColor: SKELETON, marginBottom: "5px" }} />
            <div style={{ height: "10px", width: "40%", backgroundColor: SKELETON, marginBottom: "8px" }} />
            <div style={{ height: "10px", width: "90%", backgroundColor: SKELETON }} />
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
                {e.points &&
                  splitExperiencePointsForPreview(e.points).map((p, j) => (
                    <p key={j} style={{ fontSize: pt(9.5), margin: "0 0 1.5mm", lineHeight: 1.4, paddingLeft: "4mm" }}>
                      • {p}
                    </p>
                  ))}
              </EntryWrap>
            ))
        )}
      </section>

      {/* Skills */}
      {(skills.length > 0 || isEmpty) && (
        <section style={{ position: "relative" }}>
          <SectionTitle>Skills</SectionTitle>
          <GhostChip>{Array.isArray(skills) ? skills.join(" ") : cv.skills}</GhostChip>
          <div
            style={{
              fontSize: pt(10),
              lineHeight: 1.8,
              color: isEmpty ? SKELETON : TEXT_BODY,
              fontWeight: "bold",
            }}
          >
            {isEmpty ? "Skill One • Skill Two • Skill Three" : skills.join(" • ")}
          </div>
        </section>
      )}

      {/* Technical Skills */}
      {(technicalSkillsTrim || isEmpty) && (
        <section style={{ position: "relative" }}>
          <SectionTitle>Technical Skills</SectionTitle>
          <p style={{ fontSize: pt(10), lineHeight: 1.8, margin: 0, color: isEmpty ? SKELETON : TEXT_BODY }}>
            {isEmpty ? "Python, SQL, cloud platforms" : cv.technicalSkills}
          </p>
        </section>
      )}

      {/* Education */}
      <section>
        <SectionTitle>Academic Background</SectionTitle>
        {isEmpty ? (
          <div style={{ height: "20px", width: "50%", backgroundColor: SKELETON }} />
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
    </div>
  );
}

// Keep the same exported name used by src/App.js
export function PreviewTwoCol({ cv, t, mobileMode = false }) {
  return <PreviewSandstoneExecutive cv={cv} mobileMode={mobileMode} />;
}
