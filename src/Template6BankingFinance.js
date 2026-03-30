import React from "react";
import GhostChip from "./components/GhostChip";
import { splitExperiencePointsForPreview } from "./experiencePointsPreview";

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

  const experience = Array.isArray(cv.experience) ? cv.experience : [];
  const education = Array.isArray(cv.education) ? cv.education : [];
  const skills = cv.skills ? cv.skills.split(",").map((s) => s.trim()).filter(Boolean) : [];

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
          {(cv.linkedin || cv.linkedIn) && <span>• LinkedIn</span>}
          {isPlaceholder && <span style={{ color: "#D1D5DB" }}>email@address.com • +00 000 000 • Location</span>}
        </div>
      </header>

      {/* Summary */}
      {(cv.summary || isPlaceholder) && (
        <section style={{ position: "relative" }}>
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
        <section>
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
                  position: "relative",
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
                  {exp.points &&
                    splitExperiencePointsForPreview(exp.points).map((point, idx) => (
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
                        <span>•</span>
                        <span>{point}</span>
                      </div>
                    ))}
                </div>
              </div>
            ))
          )}
        </section>
      )}

      {/* Skills */}
      {(skills.length > 0 || isPlaceholder) && (
        <section style={{ position: "relative", pageBreakInside: "avoid" }}>
          <GhostChip>
            {Array.isArray(skills) ? skills.join(" ") : cv.skills}
          </GhostChip>
          <SectionTitle>Expertise & Skills</SectionTitle>
          <p style={{ fontSize: pt(10), margin: 0, color: isPlaceholder ? "#D1D5DB" : "#333" }}>
            {isPlaceholder ? "Skill One • Skill Two • Skill Three" : skills.join(" • ")}
          </p>
        </section>
      )}

      {/* Education */}
      {(education.length > 0 || isPlaceholder) && (
        <section>
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
                  <div style={{ fontSize: pt(11), fontWeight: "bold" }}>{edu.school}</div>
                  <div style={{ fontSize: pt(10) }}>{edu.degree}</div>
                </div>
              </div>
            ))
          )}
        </section>
      )}
    </div>
  );
}

// Keep the same exported name used by src/App.js
export function PreviewBankingFinance({ cv, t, mobileMode = false }) {
  return <PreviewBankingFinanceInner cv={cv} mobileMode={mobileMode} />;
}