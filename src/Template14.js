import React from "react";

/**
 * TEMPLATE 14 — Single Column Timeline (Based on T11 Logic)
 * Features: Zero-margin header, Vertical Timeline, Blue/Orange Accents.
 */
export function Template14({ cv, mobileMode = false }) {
  const ACCENT_BLUE = "#1E40AF";
  const ACCENT_ORANGE = "#EA580C";
  const TEXT_MAIN = "#1F2937";

  const splitPoints = (pts) => (pts ? pts.split("\n").filter((p) => p.trim()) : []);

  return (
    <div
      style={{
        width: mobileMode ? "100%" : "210mm",
        maxWidth: "100%",
        minHeight: "auto",
        background: "#FFFFFF",
        color: TEXT_MAIN,
        fontFamily: "Inter, Arial, sans-serif",
        display: "flex",
        flexDirection: "column",
        margin: "0 auto",
        padding: 0,
        paddingBottom: "40px",
        WebkitPrintColorAdjust: "exact",
      }}
    >
      {/* HEADER: ZERO TOP MARGIN - EXACTLY LIKE T11 */}
      <header
        style={{
          backgroundColor: "#FFFFFF",
          padding: "40px 50px",
          margin: 0,
          borderBottom: `5px solid ${ACCENT_BLUE}`,
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: "32pt",
            color: ACCENT_BLUE,
            fontWeight: "800",
            textTransform: "uppercase",
            lineHeight: "1",
          }}
        >
          {cv.name || "YOUR NAME"}
        </h1>
        <div style={{ fontSize: "14pt", fontWeight: "600", color: TEXT_MAIN }}>
          {cv.title || "PROFESSIONAL ROLE"}
        </div>
        <div
          style={{
            display: "flex",
            gap: "20px",
            fontSize: "10pt",
            color: "#6B7280",
            marginTop: "5px",
          }}
        >
          <span>{cv.phone}</span>
          <span>{cv.email}</span>
          <span>{cv.location}</span>
        </div>
      </header>

      <div style={{ padding: "40px 50px" }}>
        {/* SUMMARY */}
        <section style={{ marginBottom: "35px" }}>
          <h2
            style={{
              fontSize: "12pt",
              color: ACCENT_BLUE,
              fontWeight: "bold",
              textTransform: "uppercase",
              marginBottom: "12px",
            }}
          >
            Summary
          </h2>
          <p style={{ fontSize: "10.5pt", lineHeight: "1.6", margin: 0 }}>
            {cv.summary}
          </p>
        </section>

        {/* EXPERIENCE WITH T11 TIMELINE LOGIC */}
        <section style={{ marginBottom: "35px" }}>
          <h2
            style={{
              fontSize: "12pt",
              color: ACCENT_BLUE,
              fontWeight: "bold",
              textTransform: "uppercase",
              marginBottom: "25px",
            }}
          >
            Experience
          </h2>
          <div
            style={{
              position: "relative",
              borderLeft: `2px solid ${ACCENT_BLUE}`,
              marginLeft: "140px",
              paddingLeft: "30px",
            }}
          >
            {cv.experience &&
              cv.experience.map((exp, idx) => (
                <div key={idx} style={{ marginBottom: "30px", position: "relative" }}>
                  {/* Timeline Dot */}
                  <div
                    style={{
                      position: "absolute",
                      left: "-37px",
                      top: "6px",
                      width: "12px",
                      height: "12px",
                      backgroundColor: ACCENT_ORANGE,
                    }}
                  />

                  {/* Date & Location (Left of Line) */}
                  <div
                    style={{
                      position: "absolute",
                      left: "-170px",
                      width: "130px",
                      textAlign: "right",
                      top: "5px",
                    }}
                  >
                    <div style={{ fontSize: "9pt", fontWeight: "bold" }}>
                      {exp.period}
                    </div>
                    <div style={{ fontSize: "8.5pt", color: "#6B7280" }}>
                      {exp.location}
                    </div>
                  </div>

                  <div style={{ fontSize: "12pt", fontWeight: "bold" }}>{exp.role}</div>
                  <div
                    style={{
                      fontSize: "11pt",
                      fontWeight: "bold",
                      color: ACCENT_ORANGE,
                      margin: "2px 0 8px 0",
                    }}
                  >
                    {exp.company}
                  </div>

                  {splitPoints(exp.points).map((p, pIdx) => (
                    <div
                      key={pIdx}
                      style={{
                        fontSize: "10pt",
                        display: "flex",
                        gap: "8px",
                        marginBottom: "4px",
                        lineHeight: "1.5",
                      }}
                    >
                      <span style={{ color: ACCENT_ORANGE }}>•</span>
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
              ))}
          </div>
        </section>

        {/* 2-COLUMN GRID FOR ACHIEVEMENTS/SKILLS */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "40px" }}>
          <section>
            <h2
              style={{
                fontSize: "12pt",
                color: ACCENT_BLUE,
                fontWeight: "bold",
                textTransform: "uppercase",
                marginBottom: "15px",
              }}
            >
              Education
            </h2>
            {cv.education &&
              cv.education.map((edu, i) => (
                <div key={i} style={{ marginBottom: "12px" }}>
                  <div style={{ fontSize: "10pt", fontWeight: "bold" }}>{edu.degree}</div>
                  <div style={{ fontSize: "9pt", color: ACCENT_ORANGE }}>{edu.school}</div>
                </div>
              ))}
          </section>
          <section>
            <h2
              style={{
                fontSize: "12pt",
                color: ACCENT_BLUE,
                fontWeight: "bold",
                textTransform: "uppercase",
                marginBottom: "15px",
              }}
            >
              Skills
            </h2>
            <p style={{ fontSize: "10pt", lineHeight: "1.6" }}>{cv.skills}</p>
          </section>
        </div>
      </div>
    </div>
  );
}

