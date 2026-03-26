import React from "react";
import { splitExperiencePointsForPreview } from "./experiencePointsPreview";

/**
 * Template 10: Continuous Surface Modern CV
 * Constraints: Single-column HTML, Flexbox visual split, Puppeteer-safe.
 * Design: No cards, no shadows, continuous white surface with integrated header.
 */

const COLORS = {
  TEXT_MAIN: "#2c3e50",
  TEXT_MUTED: "#6b7c93",
  TEXT_BODY: "#444",
  TEXT_LIGHT: "#8a99a8",
  ACCENT_BLUE: "#4a90e2",
  HEADER_BG: "#c9dced",
  PROGRESS_TRACK: "#e0e6ed",
  PILL_BG: "#e6eef7",
  SKELETON_BG: "#D1D5DB"
};

export function PreviewSaaSModern({ cv, mobileMode = false }) {
  // Empty state: placeholder skeleton when cv.name is empty
  if (!cv || !cv.name) {
    return (
      <div
        style={{
          width: mobileMode ? "100%" : "800px",
          height: "600px",
          backgroundColor: COLORS.SKELETON_BG,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          margin: "0 auto",
          fontFamily: "Arial, sans-serif",
          color: "#4B5563",
        }}
      >
        Loading Template Preview...
      </div>
    );
  }

  const experience = Array.isArray(cv.experience) ? cv.experience : [];
  const education = Array.isArray(cv.education) ? cv.education : [];
  const skills = cv.skills ? cv.skills.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const languages = cv.languages ? cv.languages.split(",").map((l) => l.trim()).filter(Boolean) : [];

  const SectionHeading = ({ children }) => (
    <h2
      style={{
        fontSize: "11px",
        fontWeight: "bold",
        color: COLORS.TEXT_MUTED,
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        marginBottom: "16px",
        marginTop: "0",
      }}
    >
      {children}
    </h2>
  );

  return (
    <div
      style={{
        width: "100%",
        minHeight: "auto", // Required constraint
        backgroundColor: "#FFFFFF", // Continuous white surface
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontFamily: 'Arial, "system-ui", sans-serif',
        WebkitPrintColorAdjust: "exact",
      }}
    >
      <div
        className="main-container"
        style={{
          width: "100%",
          maxWidth: "800px",
          backgroundColor: "#FFFFFF",
          position: "relative",
          paddingBottom: "40px", // Required for Puppeteer footer safety
        }}
      >
        {/* TOP HEADER SECTION */}
        <header
          style={{
            backgroundColor: COLORS.HEADER_BG,
            padding: "40px 32px 28px 32px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Subtle Abstract Shapes */}
          <div
            style={{
              position: "absolute",
              top: "-30px",
              right: "-30px",
              width: "180px",
              height: "180px",
              borderRadius: "50%",
              border: `2px solid ${COLORS.TEXT_MAIN}`,
              opacity: 0.05,
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "-20px",
              left: "40%",
              width: "100px",
              height: "100px",
              borderRadius: "50%",
              backgroundColor: "#FFF",
              opacity: 0.15,
            }}
          />

          <div style={{ position: "relative", zIndex: 1, textAlign: "left" }}>
            <h1 style={{ fontSize: "30px", fontWeight: "bold", color: COLORS.TEXT_MAIN, margin: 0, letterSpacing: "-0.02em" }}>
              {cv.name.toUpperCase()}
            </h1>
            <p style={{ fontSize: "14px", color: COLORS.TEXT_MUTED, margin: "6px 0 16px 0", fontWeight: "500" }}>
              {cv.title || "The role you are applying for?"}
            </p>

            {/* CONTACT ROW */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", fontSize: "12px", color: COLORS.TEXT_MUTED }}>
              {cv.phone && <span>{cv.phone}</span>}
              {cv.email && <span>{cv.email}</span>}
              {cv.location && <span>{cv.location}</span>}
            </div>
          </div>
        </header>

        <div
          style={{
            display: "flex",
            flexDirection: "row", // Visual split
            gap: "40px",
            padding: "32px",
          }}
        >
          {/* LEFT COLUMN (60%) */}
          <div style={{ flex: "0 0 58%" }}>
            <SectionHeading>Experience</SectionHeading>
            {experience.map((exp, i) => (
              <div key={i} style={{ marginBottom: "24px", pageBreakInside: "avoid" }}>
                <div style={{ fontWeight: "bold", color: COLORS.TEXT_MAIN, fontSize: "14px" }}>{exp.role}</div>
                <div style={{ color: COLORS.TEXT_LIGHT, fontSize: "12px", marginBottom: "8px" }}>
                  {exp.company} • {exp.period}
                </div>
                {exp.points &&
                  splitExperiencePointsForPreview(exp.points).map((point, j) => (
                    <div key={j} style={{ fontSize: "13px", color: COLORS.TEXT_BODY, marginBottom: "5px", display: "flex", lineHeight: "1.5" }}>
                      <span style={{ marginRight: "10px", color: COLORS.ACCENT_BLUE }}>•</span>
                      <span>{point}</span>
                    </div>
                  ))}
              </div>
            ))}

            <SectionHeading>Education</SectionHeading>
            {education.map((edu, i) => (
              <div key={i} style={{ marginBottom: "16px", pageBreakInside: "avoid" }}>
                <div style={{ fontWeight: "bold", color: COLORS.TEXT_MAIN, fontSize: "13px" }}>{edu.degree}</div>
                <div style={{ color: COLORS.TEXT_MUTED, fontSize: "12px" }}>
                  {edu.school} • {edu.year}
                </div>
              </div>
            ))}

            <SectionHeading>Skills</SectionHeading>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {skills.map((skill, i) => (
                <span
                  key={i}
                  style={{
                    padding: "5px 12px",
                    backgroundColor: COLORS.PILL_BG,
                    color: COLORS.TEXT_MAIN,
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* RIGHT COLUMN (40%) */}
          <div style={{ flex: "1" }}>
            <SectionHeading>Summary</SectionHeading>
            <p style={{ fontSize: "13px", color: "#555", lineHeight: "1.6", margin: "0 0 28px 0" }}>
              {cv.summary}
            </p>

            <SectionHeading>Key Achievements</SectionHeading>
            <div style={{ marginBottom: "24px" }}>
              <div style={{ color: COLORS.ACCENT_BLUE, fontWeight: "bold", fontSize: "13px", marginBottom: "2px" }}>Project Excellence</div>
              <div style={{ color: COLORS.TEXT_LIGHT, fontSize: "11px", lineHeight: "1.4" }}>Successfully migrated legacy architecture to cloud-native microservices.</div>
            </div>

            <SectionHeading>Languages</SectionHeading>
            {languages.map((lang, i) => (
              <div key={i} style={{ marginBottom: "14px" }}>
                <div style={{ fontSize: "12px", color: COLORS.TEXT_MAIN, marginBottom: "5px" }}>{lang}</div>
                <div style={{ height: "5px", width: "100%", background: COLORS.PROGRESS_TRACK, borderRadius: "999px" }}>
                  <div style={{ height: "100%", width: "80%", background: COLORS.ACCENT_BLUE, borderRadius: "999px" }} />
                </div>
              </div>
            ))}

            <SectionHeading>Courses</SectionHeading>
            <div style={{ marginBottom: "16px" }}>
              <div style={{ color: COLORS.TEXT_MAIN, fontWeight: "bold", fontSize: "12px" }}>Advanced System Design</div>
              <div style={{ color: COLORS.TEXT_LIGHT, fontSize: "11px" }}>Focus on scalability and fault tolerance.</div>
            </div>

            <SectionHeading>Interests</SectionHeading>
            <div style={{ color: COLORS.ACCENT_BLUE, fontWeight: "bold", fontSize: "12px" }}>UI/UX Research</div>
            <div style={{ color: COLORS.TEXT_LIGHT, fontSize: "11px" }}>Passionate about accessible design patterns.</div>
          </div>
        </div>
      </div>

      <style>
        {`
          @media print {
            body { background: white !important; -webkit-print-color-adjust: exact; }
            header { background-color: ${COLORS.HEADER_BG} !important; }
          }
        `}
      </style>
    </div>
  );
}

export function PreviewATSInternational({ cv, mobileMode = false }) {
  return <PreviewSaaSModern cv={cv} mobileMode={mobileMode} />;
}