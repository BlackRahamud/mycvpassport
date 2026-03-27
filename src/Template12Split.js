import React from "react";
import { splitExperiencePointsForPreview } from "./experiencePointsPreview";

/**
 * TEMPLATE 12 — Flat Split
 * Non-negotiable: No shadows, no gradients, no border-radius.
 * Layout: Beige/Pink Header, Grey Sidebar, White Main.
 */
export function Template12Split({ cv, mobileMode = false }) {
  // Color Palette
  const HEADER_BG = "#D6D3D1";
  const SIDEBAR_BG = "#F3F4F6";
  const TEXT_DARK = "#1A1A1A";
  const TEXT_MUTED = "#4B5563";
  const SKELETON = "#D1D5DB";

  // Typography
  const SERIF = "Georgia, 'Times New Roman', serif";
  const SANS = "Arial, Helvetica, sans-serif";

  // Empty State Logic
  const isPlaceholder = !cv.name;
  const currentHeaderBg = isPlaceholder ? SKELETON : HEADER_BG;

  const containerStyle = {
    width: mobileMode ? "100%" : "210mm",
    minHeight: "auto",
    background: "#FFFFFF",
    color: TEXT_DARK,
    margin: "0 auto",
    padding: 0,
    boxSizing: "border-box",
    WebkitPrintColorAdjust: "exact",
    printColorAdjust: "exact",
    fontFamily: SANS,
    display: "flex",
    flexDirection: "column",
    paddingBottom: "40px", // Puppeteer footer constraint
    position: "relative",
  };

  return (
    <div style={containerStyle}>
      {/* HEADER SECTION - NO TOP GAP */}
      <header
        style={{
          backgroundColor: currentHeaderBg,
          padding: "40px 50px",
          width: "100%",
          boxSizing: "border-box",
          margin: 0,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontFamily: SERIF,
            fontSize: "32pt",
            fontWeight: "normal",
            textTransform: "uppercase",
            lineHeight: "1",
          }}
        >
          {cv.name || "YOUR NAME"}
        </h1>
        <div
          style={{
            marginTop: "8px",
            fontFamily: SANS,
            fontSize: "13pt",
            fontWeight: "bold",
            color: TEXT_MUTED,
            textTransform: "uppercase",
            letterSpacing: "2px",
          }}
        >
          {cv.title || "PROFESSIONAL TITLE"}
        </div>
        <div
          style={{
            marginTop: "15px",
            fontSize: "10pt",
            display: "flex",
            gap: "20px",
          }}
        >
          {cv.email && <span>{cv.email}</span>}
          {cv.phone && <span>{cv.phone}</span>}
          {cv.location && <span>{cv.location}</span>}
        </div>
      </header>

      {/* TWO COLUMN BODY */}
      <div style={{ display: "flex", flex: 1, margin: 0 }}>
        {/* LEFT COLUMN: SUMMARY */}
        <aside
          style={{
            width: "35%",
            backgroundColor: SIDEBAR_BG,
            padding: "40px 30px",
            boxSizing: "border-box",
          }}
        >
          <h3
            style={{
              fontSize: "11pt",
              fontWeight: "bold",
              textTransform: "uppercase",
              borderBottom: "1.5px solid #000000",
              paddingBottom: "5px",
              marginBottom: "15px",
              marginTop: 0,
            }}
          >
            Summary
          </h3>
          <p style={{ fontSize: "10pt", lineHeight: "1.6", margin: 0 }}>
            {cv.summary || "Add your professional summary here."}
          </p>

          {cv.skills && (
            <div style={{ marginTop: "40px" }}>
              <h3
                style={{
                  fontSize: "11pt",
                  fontWeight: "bold",
                  textTransform: "uppercase",
                  borderBottom: "1.5px solid #000000",
                  paddingBottom: "5px",
                  marginBottom: "15px",
                }}
              >
                Skills
              </h3>
              <p style={{ fontSize: "10pt", lineHeight: "1.6", margin: 0 }}>
                {cv.skills}
              </p>
            </div>
          )}
        </aside>

        {/* RIGHT COLUMN: EXPERIENCE */}
        <main
          style={{ width: "65%", padding: "40px 40px", boxSizing: "border-box" }}
        >
          <h3
            style={{
              fontSize: "11pt",
              fontWeight: "bold",
              textTransform: "uppercase",
              marginBottom: "20px",
              marginTop: 0,
            }}
          >
            Experience
          </h3>

          {cv.experience &&
            cv.experience.map((exp, idx) => (
              <div
                key={idx}
                style={{
                  marginBottom: "30px",
                  pageBreakInside: "avoid",
                  display: "block",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                  }}
                >
                  <span
                    style={{
                      fontFamily: SERIF,
                      fontSize: "14pt",
                      fontWeight: "bold",
                    }}
                  >
                    {exp.company}
                  </span>
                  <span style={{ fontSize: "9pt", fontWeight: "bold" }}>
                    {exp.period}
                  </span>
                </div>
                <div
                  style={{
                    fontStyle: "italic",
                    fontSize: "11pt",
                    color: TEXT_MUTED,
                    margin: "4px 0 10px 0",
                  }}
                >
                  {exp.role}
                </div>
                {exp.points && (
                  <div style={{ margin: 0, padding: 0 }}>
                    {splitExperiencePointsForPreview(exp.points).map(
                      (point, pIdx) => (
                        <div
                          key={pIdx}
                          style={{
                            fontSize: "10pt",
                            lineHeight: "1.5",
                            display: "flex",
                            marginBottom: "4px",
                          }}
                        >
                          <span style={{ marginRight: "10px" }}>•</span>
                          <span>{point}</span>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </div>
            ))}
        </main>
      </div>
    </div>
  );
}

