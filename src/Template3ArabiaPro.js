// ─────────────────────────────────────────────────────────────────
//  TEMPLATE 3 — Arabia Pro (sidebar layout)
//  Preview component only (PDF builder lives in serverLib).
// ─────────────────────────────────────────────────────────────────

import React from "react";
import { splitExperiencePointsForPreview } from "./experiencePointsPreview";
import { resumePageRootBoxStyle } from "./resumePageRootBoxStyle";

function ColLabel({ accent, children }) {
  return (
    <div
      style={{
        fontSize: "9px",
        fontWeight: "800",
        color: accent,
        letterSpacing: "1.5px",
        textTransform: "uppercase",
        marginBottom: "6px",
        fontFamily: "sans-serif",
      }}
    >
      {children}
    </div>
  );
}

function ColItem({ children }) {
  return (
    <div style={{ fontSize: "10px", color: "#ccc", marginBottom: "5px", wordBreak: "break-all", lineHeight: "1.4" }}>
      {children}
    </div>
  );
}

function RightLabel({ accent, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
      <span
        style={{
          fontSize: "10px",
          fontWeight: "800",
          letterSpacing: "1.5px",
          color: accent,
          textTransform: "uppercase",
          fontFamily: "sans-serif",
        }}
      >
        {children}
      </span>
      <div style={{ flex: 1, height: "1px", background: `${accent}33` }} />
    </div>
  );
}

export function PreviewSidebar({ cv, t, mobileMode = false }) {
  const skillList = cv.skills ? cv.skills.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const certList = cv.certifications ? cv.certifications.split(",").map((s) => s.trim()).filter(Boolean) : [];
  return (
    <div
      style={{
        ...resumePageRootBoxStyle(mobileMode),
        background: "#fff",
        fontFamily: "'Trebuchet MS',sans-serif",
        color: "#222",
        display: "flex",
        flexDirection: mobileMode ? "column" : "row",
        fontSize: "11px",
        alignItems: "stretch",
      }}
    >
      {/* Sidebar */}
      <div style={{ width: mobileMode ? "100%" : "28%", background: t.color, padding: "22px 14px", alignSelf: "stretch" }}>
        <div
          style={{
            width: "50px",
            height: "50px",
            borderRadius: "50%",
            background: t.accent,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "18px",
            fontWeight: "900",
            color: t.color,
            marginBottom: "12px",
          }}
        >
          {(cv.name || "?")[0].toUpperCase()}
        </div>
        <ColLabel accent={t.accent}>Contact</ColLabel>
        {cv.email && <ColItem>✉ {cv.email}</ColItem>}
        {cv.phone && <ColItem>📞 {cv.phone}</ColItem>}
        {cv.location && <ColItem>📍 {cv.location}</ColItem>}

        {(cv.nationality || cv.visaStatus || cv.dob || cv.gender || cv.maritalStatus) && (
          <div style={{ marginTop: "14px" }}>
            <ColLabel accent={t.accent}>Personal</ColLabel>
            {cv.nationality && <ColItem>🌍 {cv.nationality}</ColItem>}
            {cv.visaStatus && <ColItem>🪪 {cv.visaStatus}</ColItem>}
            {cv.dob && <ColItem>DOB: {cv.dob}</ColItem>}
            {cv.gender && <ColItem>{cv.gender}</ColItem>}
            {cv.maritalStatus && <ColItem>{cv.maritalStatus}</ColItem>}
          </div>
        )}

        {skillList.length > 0 && (
          <div style={{ marginTop: "14px" }}>
            <ColLabel accent={t.accent}>Core Skills</ColLabel>
            {skillList.map((s, i) => (
              <div key={i} style={{ fontSize: "9px", color: "#ddd", marginBottom: "6px" }}>
                <div style={{ marginBottom: "2px" }}>{s}</div>
                <div style={{ height: "3px", background: "#ffffff22", borderRadius: "2px" }}>
                  <div style={{ height: "3px", width: `${65 + (i % 4) * 9}%`, background: t.accent, borderRadius: "2px" }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {cv.languages && (
          <div style={{ marginTop: "14px" }}>
            <ColLabel accent={t.accent}>Languages</ColLabel>
            {cv.languages.split(",").map((l, i) => (
              <ColItem key={i}>🌐 {l.trim()}</ColItem>
            ))}
          </div>
        )}

        {certList.length > 0 && (
          <div style={{ marginTop: "14px" }}>
            <ColLabel accent={t.accent}>Certifications</ColLabel>
            {certList.map((c, i) => (
              <ColItem key={i}>🏅 {c}</ColItem>
            ))}
          </div>
        )}

        {(cv.availability || cv.drivingLicense || cv.willingToRelocate) && (
          <div style={{ marginTop: "14px" }}>
            <ColLabel accent={t.accent}>Additional</ColLabel>
            {cv.availability && <ColItem>📅 {cv.availability}</ColItem>}
            {cv.drivingLicense && <ColItem>🚗 {cv.drivingLicense}</ColItem>}
            {cv.willingToRelocate && <ColItem>✈️ Relocate: {cv.willingToRelocate}</ColItem>}
          </div>
        )}
      </div>

      {/* Main */}
      <div style={{ flex: 1, padding: "22px 18px" }}>
        <div style={{ marginBottom: "16px" }}>
          <h1 style={{ fontSize: "18px", fontWeight: "900", margin: "0 0 2px", color: t.color }}>{cv.name || "Your Name"}</h1>
          <p style={{ color: t.accent, fontWeight: "700", fontSize: "11px", margin: 0 }}>{cv.title || "Job Title"}</p>
        </div>

        {cv.summary && (
          <div style={{ marginBottom: "14px" }}>
            <RightLabel accent={t.accent}>Professional Summary</RightLabel>
            <p style={{ fontSize: "10px", lineHeight: "1.7", margin: 0, color: "#444" }}>{cv.summary}</p>
          </div>
        )}

        {cv.experience.some((e) => e.company) && (
          <div style={{ marginBottom: "14px" }}>
            <RightLabel accent={t.accent}>Work Experience</RightLabel>
            {cv.experience
              .filter((e) => e.company)
              .map((e, i) => (
                <div key={i} style={{ marginBottom: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <strong style={{ fontSize: "11px", color: t.color }}>{e.role}</strong>
                    <span
                      style={{
                        fontSize: "9px",
                        color: "#888",
                        background: `${t.accent}18`,
                        padding: "1px 6px",
                        borderRadius: "8px",
                      }}
                    >
                      {e.period}
                    </span>
                  </div>
                  <div style={{ color: t.accent, fontSize: "10px", marginBottom: "3px" }}>
                    {e.company}
                    {e.location ? ` · ${e.location}` : ""}
                  </div>
                  {e.points && (
                    <div className="cvp-preview-exp-sidebar-wrap">
                      {splitExperiencePointsForPreview(e.points).map((line, j) => (
                        <p key={j} className="cvp-preview-exp-sidebar-line">
                          {j === 0 ? line : `• ${line}`}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}

        {cv.technicalSkills && (
          <div style={{ marginBottom: "14px" }}>
            <RightLabel accent={t.accent}>Technical Skills</RightLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
              {cv.technicalSkills.split(",").map((s, i) => (
                <span
                  key={i}
                  style={{ padding: "2px 7px", background: "#f0f0f0", borderRadius: "4px", fontSize: "9px", color: "#333" }}
                >
                  {s.trim()}
                </span>
              ))}
            </div>
          </div>
        )}

        {cv.education.some((e) => e.school) && (
          <div style={{ marginBottom: "14px" }}>
            <RightLabel accent={t.accent}>Education</RightLabel>
            {cv.education
              .filter((e) => e.school)
              .map((e, i) => (
                <div key={i} style={{ marginBottom: "8px", display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <strong style={{ fontSize: "11px" }}>{e.degree}</strong>
                    <div style={{ fontSize: "10px", color: "#666" }}>{e.school}</div>
                  </div>
                  <span style={{ fontSize: "9px", color: "#888" }}>{e.year}</span>
                </div>
              ))}
          </div>
        )}

        {cv.references && (
          <p style={{ fontSize: "9px", color: "#999", fontStyle: "italic", marginTop: "10px", paddingTop: "8px", borderTop: "1px solid #eee" }}>
            {cv.references}
          </p>
        )}
      </div>
    </div>
  );
}

