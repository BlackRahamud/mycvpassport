import React from "react";
import { splitExperiencePointsForPreview } from "./experiencePointsPreview";

const NAVY = "#1E2D45";
const ACCENT_BLUE = "#4A90E2";
const BODY_GREY = "#475569";
const LIGHT_GREY = "#94A3B8";
const PILL_BG = "#EBF4FF";
const PROGRESS_TRACK = "#E2E8F0";
const CARD_BG_GRADIENT = "linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%)";
const OUTER_BG = "linear-gradient(135deg, #4F5B66 0%, #2D3748 100%)";

export function PreviewSaaSModern({ cv, mobileMode = false }) {
  if (!cv.name) {
    return (
      <div
        style={{
          width: mobileMode ? "100%" : "1000px",
          height: "500px",
          backgroundColor: "#D1D5DB",
          borderRadius: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
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

  const SectionTitle = ({ children }) => (
    <div
      style={{
        fontSize: "11px",
        fontWeight: "bold",
        color: ACCENT_BLUE,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        marginBottom: "12px",
        marginTop: "20px",
      }}
    >
      {children}
    </div>
  );

  return (
    <div
      style={{
        width: "100%",
        minHeight: "auto",
        background: OUTER_BG,
        padding: mobileMode ? "20px" : "60px 20px",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        fontFamily: "Arial, sans-serif",
        WebkitPrintColorAdjust: "exact",
      }}
    >
      <div
        style={{
          width: mobileMode ? "100%" : "950px",
          backgroundColor: "#FFFFFF",
          backgroundImage: CARD_BG_GRADIENT,
          borderRadius: "20px",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
          padding: "32px",
          position: "relative",
          overflow: "hidden",
          minHeight: "600px",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.03,
            pointerEvents: "none",
            background: "radial-gradient(circle at 2px 2px, #000 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "32px",
            borderBottom: `1px solid ${PROGRESS_TRACK}`,
            paddingBottom: "24px",
          }}
        >
          <div>
            <h1 style={{ fontSize: "28px", fontWeight: "bold", color: NAVY, margin: 0 }}>{cv.name}</h1>
            <div style={{ fontSize: "14px", color: ACCENT_BLUE, marginTop: "4px", fontWeight: "500" }}>{cv.title || "Professional Title"}</div>
            <div style={{ display: "flex", gap: "12px", marginTop: "12px", color: LIGHT_GREY, fontSize: "11px" }}>
              {cv.phone && <span>{cv.phone}</span>}
              {cv.email && <span>{cv.email}</span>}
              {cv.location && <span>{cv.location}</span>}
            </div>
          </div>

          <div
            style={{
              width: "70px",
              height: "70px",
              borderRadius: "50%",
              backgroundColor: PROGRESS_TRACK,
              border: "3px solid #FFF",
              boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
            }}
          >
            {cv.profileImage ? (
              <img src={cv.profileImage} alt="profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ color: "#FFF", fontSize: "24px", fontWeight: "bold" }}>{cv.name[0]}</span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: "40px" }}>
          <div style={{ flex: "0 0 62%" }}>
            <SectionTitle>Experience</SectionTitle>
            {experience.map((exp, i) => (
              <div key={i} style={{ marginBottom: "20px", pageBreakInside: "avoid" }}>
                <div style={{ fontWeight: "bold", color: NAVY, fontSize: "15px" }}>{exp.role}</div>
                <div style={{ color: LIGHT_GREY, fontSize: "12px", marginBottom: "8px" }}>
                  {exp.company} | {exp.period}
                </div>
                {exp.points &&
                  splitExperiencePointsForPreview(exp.points).map((point, j) => (
                    <div key={j} style={{ fontSize: "12.5px", color: BODY_GREY, marginBottom: "4px", display: "flex" }}>
                      <span style={{ marginRight: "8px" }}>•</span>
                      <span>{point}</span>
                    </div>
                  ))}
              </div>
            ))}

            <SectionTitle>Education</SectionTitle>
            {education.map((edu, i) => (
              <div key={i} style={{ marginBottom: "12px", pageBreakInside: "avoid" }}>
                <div style={{ fontWeight: "bold", color: NAVY, fontSize: "14px" }}>{edu.degree}</div>
                <div style={{ color: BODY_GREY, fontSize: "12px" }}>
                  {edu.school} • {edu.year}
                </div>
              </div>
            ))}
          </div>

          <div style={{ flex: "1" }}>
            <SectionTitle>Summary</SectionTitle>
            <p style={{ fontSize: "12px", color: BODY_GREY, lineHeight: "1.5", margin: 0 }}>{cv.summary}</p>

            <SectionTitle>Skills</SectionTitle>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {skills.map((skill, i) => (
                <span
                  key={i}
                  style={{
                    padding: "4px 10px",
                    backgroundColor: PILL_BG,
                    color: ACCENT_BLUE,
                    borderRadius: "12px",
                    fontSize: "11px",
                    fontWeight: "500",
                  }}
                >
                  {skill}
                </span>
              ))}
            </div>

            <SectionTitle>Languages</SectionTitle>
            {languages.map((lang, i) => (
              <div key={i} style={{ marginBottom: "10px" }}>
                <div style={{ fontSize: "12px", color: NAVY, marginBottom: "4px" }}>{lang}</div>
                <div style={{ height: "6px", width: "100%", background: PROGRESS_TRACK, borderRadius: "3px" }}>
                  <div style={{ height: "100%", width: "80%", background: ACCENT_BLUE, borderRadius: "3px" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: "40px" }} />

        <div
          style={{
            position: "absolute",
            bottom: "10px",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 10,
          }}
        >
          <button
            style={{
              background: "linear-gradient(to right, #10B981, #059669)",
              color: "white",
              padding: "12px 32px",
              borderRadius: "9999px",
              border: "none",
              fontWeight: "bold",
              fontSize: "14px",
              boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Start With This Template
          </button>
        </div>
      </div>
    </div>
  );
}

export function PreviewATSInternational({ cv, t, mobileMode = false }) {
  return <PreviewSaaSModern cv={cv} mobileMode={mobileMode} />;
}