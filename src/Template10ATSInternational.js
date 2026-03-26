import React from "react";
import { splitExperiencePointsForPreview } from "./experiencePointsPreview";

/**
 * Modern SaaS-inspired Resume Template - PDF Builder Function
 * Constraints: Single column HTML structure, Flexbox row for visual split,
 * Puppeteer-safe, strict Arial/system fonts.
 */

const COLORS = {
  PRIMARY_TEXT: "#2c3e50",
  SUBTITLE_TEXT: "#6b7c93",
  BODY_TEXT: "#444",
  LIGHT_GREY_TEXT: "#8a99a8",
  ACCENT_BLUE: "#4a90e2",
  SOFT_BLUE: "#5aa0e6",
  HERO_BG: "#dfeaf5",
  HERO_WAVE: "#c9dced",
  PAGE_BG: "#f5f7fa",
  PILL_BG: "#e6eef7",
  PROGRESS_BG: "#e0e6ed",
  SKELETON_BG: "#D1D5DB",
};

export function PreviewSaaSModern({ cv, mobileMode = false }) {
  if (!cv || !cv.name) {
    return (
      <div
        style={{
          width: mobileMode ? "100%" : "800px",
          height: "500px",
          backgroundColor: COLORS.SKELETON_BG,
          borderRadius: "20px",
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
        color: COLORS.SUBTITLE_TEXT,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        marginBottom: "12px",
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
        minHeight: "auto",
        backgroundColor: COLORS.PAGE_BG,
        padding: mobileMode ? "10px" : "40px 20px",
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
          borderRadius: "20px",
          boxShadow: mobileMode ? "none" : "0 10px 25px rgba(0,0,0,0.05)",
          overflow: "hidden",
          position: "relative",
          paddingBottom: "40px",
        }}
      >
        <header
          style={{
            backgroundColor: COLORS.HERO_BG,
            padding: "40px 32px 24px 32px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "-40px",
              right: "-20px",
              width: "240px",
              height: "240px",
              borderRadius: "50%",
              background: COLORS.HERO_WAVE,
              opacity: 0.5,
              zIndex: 0,
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "-20px",
              right: "150px",
              width: "100px",
              height: "100px",
              borderRadius: "50%",
              background: COLORS.HERO_WAVE,
              opacity: 0.3,
              zIndex: 0,
            }}
          />

          <div style={{ position: "relative", zIndex: 1, textAlign: "left" }}>
            <h1 style={{ fontSize: "28px", fontWeight: "bold", color: COLORS.PRIMARY_TEXT, margin: 0 }}>{cv.name.toUpperCase()}</h1>
            <p style={{ fontSize: "14px", color: COLORS.SUBTITLE_TEXT, margin: "4px 0 16px 0" }}>{cv.title || "The role you are applying for?"}</p>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", fontSize: "12px", color: COLORS.LIGHT_GREY_TEXT }}>
              {cv.phone && <span>{cv.phone}</span>}
              {cv.email && <span>{cv.email}</span>}
              {cv.location && <span>{cv.location}</span>}
            </div>
          </div>
        </header>

        <div
          style={{
            display: "flex",
            flexDirection: "row",
            gap: "32px",
            padding: "32px",
          }}
        >
          <div style={{ flex: "0 0 60%" }}>
            <SectionHeading>Experience</SectionHeading>
            {experience.map((exp, i) => (
              <div key={i} style={{ marginBottom: "20px", pageBreakInside: "avoid" }}>
                <div style={{ fontWeight: "bold", color: COLORS.PRIMARY_TEXT, fontSize: "14px" }}>{exp.role}</div>
                <div style={{ color: COLORS.LIGHT_GREY_TEXT, fontSize: "12px", marginBottom: "8px" }}>
                  {exp.company} • {exp.period}
                </div>
                {exp.points &&
                  splitExperiencePointsForPreview(exp.points).map((point, j) => (
                    <div key={j} style={{ fontSize: "13px", color: COLORS.BODY_TEXT, marginBottom: "4px", display: "flex", lineHeight: "1.5" }}>
                      <span style={{ marginRight: "8px" }}>•</span>
                      <span>{point}</span>
                    </div>
                  ))}
              </div>
            ))}

            <SectionHeading>Education</SectionHeading>
            {education.map((edu, i) => (
              <div key={i} style={{ marginBottom: "16px", pageBreakInside: "avoid" }}>
                <div style={{ fontWeight: "bold", color: COLORS.PRIMARY_TEXT, fontSize: "13px" }}>{edu.degree}</div>
                <div style={{ color: COLORS.SUBTITLE_TEXT, fontSize: "12px" }}>
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
                    padding: "6px 10px",
                    backgroundColor: COLORS.PILL_BG,
                    color: COLORS.PRIMARY_TEXT,
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div style={{ flex: "1" }}>
            <SectionHeading>Summary</SectionHeading>
            <p style={{ fontSize: "13px", color: "#555", lineHeight: "1.5", margin: "0 0 24px 0" }}>{cv.summary}</p>

            <SectionHeading>Key Achievements</SectionHeading>
            <div style={{ marginBottom: "20px" }}>
              <div style={{ color: COLORS.ACCENT_BLUE, fontWeight: "bold", fontSize: "13px" }}>Strategic Leadership</div>
              <div style={{ color: COLORS.LIGHT_GREY_TEXT, fontSize: "11px" }}>Delivered 20% efficiency increase in SaaS deployment workflows.</div>
            </div>

            <SectionHeading>Languages</SectionHeading>
            {languages.map((lang, i) => (
              <div key={i} style={{ marginBottom: "12px" }}>
                <div style={{ fontSize: "12px", color: COLORS.PRIMARY_TEXT, marginBottom: "4px" }}>{lang}</div>
                <div style={{ height: "6px", width: "100%", background: COLORS.PROGRESS_BG, borderRadius: "999px" }}>
                  <div style={{ height: "100%", width: "85%", background: COLORS.SOFT_BLUE, borderRadius: "999px" }} />
                </div>
              </div>
            ))}

            <SectionHeading>Interests</SectionHeading>
            <div style={{ color: COLORS.ACCENT_BLUE, fontWeight: "bold", fontSize: "12px" }}>Open Source Contribution</div>
            <div style={{ color: COLORS.LIGHT_GREY_TEXT, fontSize: "11px" }}>Maintaining UI libraries and documentation.</div>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: "0",
            left: "0",
            width: "120px",
            height: "120px",
            background: `radial-gradient(circle at bottom left, ${COLORS.HERO_WAVE}, transparent)`,
            opacity: 0.3,
            pointerEvents: "none",
          }}
        />
      </div>

      <style>
        {`
          @media print {
            .main-container { box-shadow: none !important; border-radius: 0 !important; }
            body { background: white !important; -webkit-print-color-adjust: exact; }
          }
        `}
      </style>
    </div>
  );
}

export function PreviewATSInternational({ cv, mobileMode = false }) {
  return <PreviewSaaSModern cv={cv} mobileMode={mobileMode} />;
}