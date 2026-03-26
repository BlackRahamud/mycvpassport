// ─────────────────────────────────────────────────────────────────
//  TEMPLATE 4 — Executive Gold (timeline layout)
//  Preview component only (PDF builder lives in serverLib).
// ─────────────────────────────────────────────────────────────────

import React from "react";
import { splitExperiencePointsForPreview } from "./experiencePointsPreview";
import { resumePageRootBoxStyle } from "./resumePageRootBoxStyle";

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

export function PreviewTimeline({ cv, t, mobileMode = false }) {
  const skillList = cv.skills ? cv.skills.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const certList = cv.certifications ? cv.certifications.split(",").map((s) => s.trim()).filter(Boolean) : [];
  return (
    <div
      style={{
        ...resumePageRootBoxStyle(mobileMode),
        background: "#fff",
        fontFamily: "Georgia,serif",
        color: "#222",
        fontSize: "11px",
      }}
    >
      {/* Header */}
      <div style={{ padding: "24px 28px 16px", borderBottom: `3px solid ${t.accent}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <h1 style={{ fontSize: "24px", fontWeight: "900", color: t.color, margin: "0 0 3px" }}>{cv.name || "Your Name"}</h1>
            <p style={{ color: t.accent, fontWeight: "700", fontSize: "11px", margin: "0 0 6px" }}>{cv.title || "Job Title"}</p>
            <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", fontSize: "9px", color: "#666" }}>
              {cv.nationality && <span>🌍 {cv.nationality}</span>}
              {cv.visaStatus && <span>🪪 {cv.visaStatus}</span>}
              {cv.dob && <span>DOB: {cv.dob}</span>}
              {cv.gender && <span>{cv.gender}</span>}
              {cv.maritalStatus && <span>{cv.maritalStatus}</span>}
            </div>
          </div>
          <div style={{ textAlign: "right", fontSize: "9px", color: "#666", lineHeight: "1.8" }}>
            {cv.email && <div>✉ {cv.email}</div>}
            {cv.phone && <div>📞 {cv.phone}</div>}
            {cv.location && <div>📍 {cv.location}</div>}
          </div>
        </div>
      </div>

      <div style={{ padding: "18px 28px" }}>
        {cv.summary && (
          <div
            style={{
              marginBottom: "16px",
              padding: "12px 14px",
              background: `${t.accent}0d`,
              borderLeft: `3px solid ${t.accent}`,
              borderRadius: "0 6px 6px 0",
            }}
          >
            <p style={{ fontSize: "10px", lineHeight: "1.7", margin: 0, color: "#444", fontStyle: "italic" }}>{cv.summary}</p>
          </div>
        )}

        {skillList.length > 0 && (
          <div style={{ marginBottom: "14px" }}>
            <RightLabel accent={t.accent}>Core Skills</RightLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
              {skillList.map((s, i) => (
                <span
                  key={i}
                  style={{ padding: "2px 9px", background: `${t.accent}15`, border: `1px solid ${t.accent}44`, borderRadius: "10px", fontSize: "9px", color: "#333" }}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}

        {cv.experience.some((e) => e.company) && (
          <div style={{ marginBottom: "14px" }}>
            <RightLabel accent={t.accent}>Work Experience</RightLabel>
            <div style={{ position: "relative", paddingLeft: "20px" }}>
              <div style={{ position: "absolute", left: "5px", top: "4px", bottom: "4px", width: "2px", background: `${t.accent}33` }} />
              {cv.experience
                .filter((e) => e.company)
                .map((e, i) => (
                  <div key={i} style={{ position: "relative", marginBottom: "14px" }}>
                    <div
                      style={{
                        position: "absolute",
                        left: "-17px",
                        top: "3px",
                        width: "10px",
                        height: "10px",
                        borderRadius: "50%",
                        background: t.accent,
                        border: "2px solid #fff",
                        boxShadow: `0 0 0 2px ${t.accent}`,
                      }}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <strong style={{ fontSize: "11px", color: t.color }}>{e.role}</strong>
                      <span style={{ fontSize: "9px", color: "#888" }}>{e.period}</span>
                    </div>
                    <div style={{ color: t.accent, fontSize: "10px", fontWeight: "700", marginBottom: "3px" }}>
                      {e.company}
                      {e.location ? ` · ${e.location}` : ""}
                    </div>
                    {e.points && (
                      <div className="cvp-preview-exp-timeline-wrap">
                        {splitExperiencePointsForPreview(e.points).map((line, j) => (
                          <p key={j} className="cvp-preview-exp-timeline-line">
                            {j === 0 ? line : `• ${line}`}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: mobileMode ? "1fr" : "1fr 1fr", gap: "16px" }}>
          <div>
            {cv.education.some((e) => e.school) && (
              <div style={{ marginBottom: "12px" }}>
                <RightLabel accent={t.accent}>Education</RightLabel>
                {cv.education
                  .filter((e) => e.school)
                  .map((e, i) => (
                    <div key={i} style={{ marginBottom: "8px" }}>
                      <strong style={{ fontSize: "11px" }}>{e.degree}</strong>
                      <div style={{ fontSize: "9px", color: "#666" }}>{e.school}</div>
                      <div style={{ fontSize: "9px", color: t.accent }}>{e.year}</div>
                    </div>
                  ))}
              </div>
            )}
            {certList.length > 0 && (
              <div>
                <RightLabel accent={t.accent}>Certifications</RightLabel>
                {certList.map((c, i) => (
                  <div key={i} style={{ fontSize: "10px", color: "#444", marginBottom: "3px" }}>
                    🏅 {c}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            {cv.technicalSkills && (
              <div style={{ marginBottom: "12px" }}>
                <RightLabel accent={t.accent}>Technical Skills</RightLabel>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                  {cv.technicalSkills.split(",").map((s, i) => (
                    <span key={i} style={{ padding: "2px 7px", background: "#f5f5f5", borderRadius: "4px", fontSize: "9px", color: "#333" }}>
                      {s.trim()}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {cv.languages && (
              <div style={{ marginBottom: "12px" }}>
                <RightLabel accent={t.accent}>Languages</RightLabel>
                <p style={{ fontSize: "10px", margin: 0, color: "#444" }}>{cv.languages}</p>
              </div>
            )}
            {(cv.availability || cv.drivingLicense || cv.willingToRelocate) && (
              <div>
                <RightLabel accent={t.accent}>Additional Info</RightLabel>
                {cv.availability && <div style={{ fontSize: "9px", color: "#555", marginBottom: "3px" }}>📅 {cv.availability}</div>}
                {cv.drivingLicense && <div style={{ fontSize: "9px", color: "#555", marginBottom: "3px" }}>🚗 License: {cv.drivingLicense}</div>}
                {cv.willingToRelocate && <div style={{ fontSize: "9px", color: "#555" }}>✈️ Relocate: {cv.willingToRelocate}</div>}
              </div>
            )}
          </div>
        </div>

        {cv.references && (
          <p style={{ fontSize: "9px", color: "#999", fontStyle: "italic", marginTop: "12px", paddingTop: "8px", borderTop: "1px solid #eee" }}>
            {cv.references}
          </p>
        )}
      </div>
    </div>
  );
}

