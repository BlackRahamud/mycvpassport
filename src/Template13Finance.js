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

/**
 * TEMPLATE 13 — Finance & Corporate
 * Design: Single-sheet continuous surface, Finance-grade, No Cards.
 */

const COLORS = {
  ACCENT: "#5c6ac4",
  TEXT_PRIMARY: "#1f2933",
  TEXT_SECONDARY: "#6b7280",
  DIVIDER: "#e5e7eb",
  WHITE: "#ffffff",
  SKELETON_BG: "#D1D5DB",
};

export function PreviewFinance({ cv, mobileMode = false }) {
  // Empty state: placeholder skeleton per T11 requirement
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
        Loading Template 13...
      </div>
    );
  }

  const experience = Array.isArray(cv.experience) ? cv.experience : [];
  const education = Array.isArray(cv.education) ? cv.education : [];
  const skills = cv.skills ? cv.skills.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const languages = cv.languages ? cv.languages.split(",").map((l) => l.trim()).filter(Boolean) : [];
  const certifications = cv.certifications ? cv.certifications.split(",").map((c) => c.trim()).filter(Boolean) : [];
  const hasTechnicalSkills = technicalSkillsGroupsForTemplate(cv.technicalSkills).length > 0;

  const SectionHeading = ({ children }) => (
    <div style={{ marginBottom: "12px", breakAfter: "avoid" }}>
      <h2
        style={{
          fontSize: "12px",
          fontWeight: "bold",
          color: COLORS.TEXT_SECONDARY,
          textTransform: "uppercase",
          letterSpacing: "1px",
          margin: "0 0 8px 0",
        }}
      >
        {children}
      </h2>
      <div style={{ height: "1px", backgroundColor: COLORS.DIVIDER, width: "100%" }} />
    </div>
  );

  return (
    <div
      style={{
        width: "100%",
        minHeight: "auto", // T11 Constraint
        backgroundColor: COLORS.WHITE,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
        WebkitPrintColorAdjust: "exact",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "800px",
          backgroundColor: COLORS.WHITE,
          position: "relative",
          paddingBottom: "40px", // Puppeteer footer safety
        }}
      >
        <div style={{ height: "6px", backgroundColor: COLORS.ACCENT, width: "100%" }} />

        <header style={{ padding: "32px 32px 20px 32px" }}>
          <h1
            style={{
              fontSize: "28px",
              fontWeight: "bold",
              color: COLORS.TEXT_PRIMARY,
              margin: 0,
              letterSpacing: "-0.5px",
              textTransform: "uppercase",
            }}
          >
            {cv.name.toUpperCase()}
          </h1>
          <p style={{ fontSize: "14px", color: COLORS.TEXT_SECONDARY, margin: "4px 0 12px 0" }}>
            {cv.title || "Finance Professional"}
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              fontSize: "12px",
              color: COLORS.TEXT_SECONDARY,
            }}
          >
            {cv.phone && <span>{cv.phone}</span>}
            {cv.phone && cv.email && <span>•</span>}
            {cv.email && <span>{cv.email}</span>}
            {cv.email && cv.location && <span>•</span>}
            {cv.location && <span>{cv.location}</span>}
          </div>
        </header>

        <div style={{ display: "flex", flexDirection: "row", gap: "40px", padding: "0 32px 32px 32px" }}>
          <div style={{ flex: "0 0 62%" }}>
            <SectionHeading>Experience</SectionHeading>
            {experience.map((exp, i) => (
              <div key={i} style={{ marginBottom: "20px", pageBreakInside: "avoid", position: "relative" }}>
                <GhostChip>{`${exp.role} ${exp.company}`}</GhostChip>
                <div style={{ fontWeight: "bold", color: COLORS.TEXT_PRIMARY, fontSize: "14px" }}>{exp.role}</div>
                <div style={{ color: COLORS.TEXT_SECONDARY, fontSize: "12px", marginBottom: "6px" }}>
                  {exp.company} • {exp.period}
                </div>
                {exp.points &&
                  splitExperiencePointsForPreview(exp.points).map((point, j) => (
                    <div
                      key={j}
                      style={{ fontSize: "12.5px", color: COLORS.TEXT_PRIMARY, marginBottom: "4px", display: "flex", lineHeight: "1.5" }}
                    >
                      <span style={{ marginRight: "8px" }}>•</span>
                      <span>{point}</span>
                    </div>
                  ))}
              </div>
            ))}

            <SectionHeading>Education</SectionHeading>
            {education.map((edu, i) => (
              <div key={i} style={{ marginBottom: "16px", pageBreakInside: "avoid" }}>
                <div style={{ fontWeight: "bold", color: COLORS.TEXT_PRIMARY, fontSize: "13px" }}>{edu.degree}</div>
                <div style={{ color: COLORS.TEXT_SECONDARY, fontSize: "12px" }}>
                  {edu.school} • {edu.year}
                </div>
              </div>
            ))}

            {skills.length > 0 && (
              <>
                <SectionHeading>Skills</SectionHeading>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", position: "relative" }}>
                  <GhostChip>{Array.isArray(skills) ? skills.join(" ") : cv.skills}</GhostChip>
                  {skills.map((skill, i) => (
                    <span key={i} style={{ padding: "5px 12px", backgroundColor: "#e6eef7", color: COLORS.TEXT_PRIMARY, borderRadius: "6px", fontSize: "12px" }}>
                      {skill}
                    </span>
                  ))}
                </div>
              </>
            )}

            {hasTechnicalSkills && (
              <>
                <SectionHeading>Technical Skills</SectionHeading>
                <div style={{ fontSize: "12.5px", color: COLORS.TEXT_PRIMARY, lineHeight: "1.5", margin: "0 0 24px 0" }}>
                  {(() => {
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
                  })()}
                </div>
              </>
            )}
          </div>

          <div style={{ flex: "1" }}>
            <SectionHeading>Professional Summary</SectionHeading>
            <div style={{ position: "relative", margin: "0 0 24px 0" }}>
              <GhostChip>{cv.summary}</GhostChip>
              <p style={{ fontSize: "12.5px", color: COLORS.TEXT_PRIMARY, lineHeight: "1.5", margin: 0 }}>{cv.summary}</p>
            </div>

            <SectionHeading>Key Metrics</SectionHeading>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
              <div style={{ fontSize: "12px" }}>
                <span style={{ color: COLORS.ACCENT, fontWeight: "bold" }}>Portfolio:</span> $2.5M+
              </div>
              <div style={{ fontSize: "12px" }}>
                <span style={{ color: COLORS.ACCENT, fontWeight: "bold" }}>Cost Reduction:</span> 15%
              </div>
            </div>

            <SectionHeading>Certifications</SectionHeading>
            <div style={{ fontSize: "12px", color: COLORS.TEXT_PRIMARY, lineHeight: "1.8", marginBottom: "24px" }}>
              {certifications.length
                ? certifications.map((c, i) => (
                    <div key={i}>• {c}</div>
                  ))
                : "CFA Level 1"}
            </div>

            <SectionHeading>Languages</SectionHeading>
            <div style={{ fontSize: "12px", color: COLORS.TEXT_PRIMARY }}>
              {languages.map((l, i) => (
                <div key={i}>{l} — Fluent</div>
              ))}
            </div>

            <SectionHeading>Courses</SectionHeading>
            <div style={{ marginBottom: "16px" }}>
              <div style={{ color: COLORS.TEXT_PRIMARY, fontWeight: "bold", fontSize: "12px" }}>Advanced System Design</div>
              <div style={{ color: COLORS.TEXT_SECONDARY, fontSize: "11px" }}>Focus on scalability and fault tolerance.</div>
            </div>

            <SectionHeading>Interests</SectionHeading>
            <div style={{ color: COLORS.ACCENT, fontWeight: "bold", fontSize: "12px" }}>UI/UX Research</div>
            <div style={{ color: COLORS.TEXT_SECONDARY, fontSize: "11px" }}>Passionate about accessible design patterns.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * TEMPLATE 13 — Finance & Corporate
 * Technical Reference: Template 11 (Structure & Constraints)
 * Design: Single-sheet continuous surface, Finance-grade, No Cards.
 */

// eslint-disable-next-line no-unused-vars
function PreviewFinanceDuplicate({ cv, mobileMode = false }) {
  // Empty state: placeholder skeleton per T11 requirement
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
        Loading Template 13...
      </div>
    );
  }

  const experience = Array.isArray(cv.experience) ? cv.experience : [];
  const education = Array.isArray(cv.education) ? cv.education : [];
  const skills = cv.skills ? cv.skills.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const languages = cv.languages ? cv.languages.split(",").map((l) => l.trim()).filter(Boolean) : [];
  const certifications = cv.certifications ? cv.certifications.split(",").map((c) => c.trim()).filter(Boolean) : [];

  const SectionHeading = ({ children }) => (
    <div style={{ marginBottom: "12px", breakAfter: "avoid" }}>
      <h2
        style={{
          fontSize: "12px",
          fontWeight: "bold",
          color: COLORS.TEXT_SECONDARY,
          textTransform: "uppercase",
          letterSpacing: "1px",
          margin: "0 0 8px 0",
        }}
      >
        {children}
      </h2>
      <div style={{ height: "1px", backgroundColor: COLORS.DIVIDER, width: "100%" }} />
    </div>
  );

  return (
    <div
      style={{
        width: "100%",
        minHeight: "auto", // T11 Constraint
        backgroundColor: COLORS.WHITE,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
        WebkitPrintColorAdjust: "exact",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "800px",
          backgroundColor: COLORS.WHITE,
          position: "relative",
          paddingBottom: "40px", // Puppeteer footer safety
        }}
      >
        {/* TOP ACCENT BAR */}
        <div style={{ height: "6px", backgroundColor: COLORS.ACCENT, width: "100%" }} />

        {/* HEADER SECTION */}
        <header style={{ padding: "32px 32px 20px 32px" }}>
          <h1
            style={{
              fontSize: "28px",
              fontWeight: "bold",
              color: COLORS.TEXT_PRIMARY,
              margin: 0,
              letterSpacing: "-0.5px",
              textTransform: "uppercase",
            }}
          >
            {cv.name.toUpperCase()}
          </h1>
          <p style={{ fontSize: "14px", color: COLORS.TEXT_SECONDARY, margin: "4px 0 12px 0" }}>
            {cv.title || "Finance Professional"}
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              fontSize: "12px",
              color: COLORS.TEXT_SECONDARY,
            }}
          >
            {cv.phone && <span>{cv.phone}</span>}
            {cv.phone && cv.email && <span>•</span>}
            {cv.email && <span>{cv.email}</span>}
            {cv.email && cv.location && <span>•</span>}
            {cv.location && <span>{cv.location}</span>}
          </div>
        </header>

        {/* CONTENT GRID (FLEX) */}
        <div style={{ display: "flex", flexDirection: "row", gap: "40px", padding: "0 32px 32px 32px" }}>
          {/* LEFT COLUMN (65%) */}
          <div style={{ flex: "0 0 62%" }}>
            <SectionHeading>Experience</SectionHeading>
            {experience.map((exp, i) => (
              <div key={i} style={{ marginBottom: "20px", pageBreakInside: "avoid" }}>
                <div style={{ fontWeight: "bold", color: COLORS.TEXT_PRIMARY, fontSize: "14px" }}>{exp.role}</div>
                <div style={{ color: COLORS.TEXT_SECONDARY, fontSize: "12px", marginBottom: "6px" }}>
                  {exp.company} • {exp.period}
                </div>
                {exp.points &&
                  splitExperiencePointsForPreview(exp.points).map((point, j) => (
                    <div
                      key={j}
                      style={{
                        fontSize: "12.5px",
                        color: COLORS.TEXT_PRIMARY,
                        marginBottom: "4px",
                        display: "flex",
                        lineHeight: "1.5",
                      }}
                    >
                      <span style={{ marginRight: "8px" }}>•</span>
                      <span>{point}</span>
                    </div>
                  ))}
              </div>
            ))}

            <SectionHeading>Education</SectionHeading>
            {education.map((edu, i) => (
              <div key={i} style={{ marginBottom: "16px", pageBreakInside: "avoid" }}>
                <div style={{ fontWeight: "bold", color: COLORS.TEXT_PRIMARY, fontSize: "13px" }}>{edu.degree}</div>
                <div style={{ color: COLORS.TEXT_SECONDARY, fontSize: "12px" }}>
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
                    backgroundColor: "#e6eef7",
                    color: COLORS.TEXT_PRIMARY,
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* RIGHT COLUMN (35%) */}
          <div style={{ flex: "1" }}>
            <SectionHeading>Professional Summary</SectionHeading>
            <p style={{ fontSize: "12.5px", color: COLORS.TEXT_PRIMARY, lineHeight: "1.5", margin: "0 0 24px 0" }}>
              {cv.summary}
            </p>

            <SectionHeading>Key Metrics</SectionHeading>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
              <div style={{ fontSize: "12px" }}>
                <span style={{ color: COLORS.ACCENT, fontWeight: "bold" }}>Portfolio:</span> $2.5M+
              </div>
              <div style={{ fontSize: "12px" }}>
                <span style={{ color: COLORS.ACCENT, fontWeight: "bold" }}>Cost Reduction:</span> 15%
              </div>
            </div>

            <SectionHeading>Certifications</SectionHeading>
            <div style={{ fontSize: "12px", color: COLORS.TEXT_PRIMARY, lineHeight: "1.8", marginBottom: "24px" }}>
              {certifications.length
                ? certifications.map((c, i) => (
                    <div key={i}>• {c}</div>
                  ))
                : "CFA Level 1"}
            </div>

            <SectionHeading>Languages</SectionHeading>
            <div style={{ fontSize: "12px", color: COLORS.TEXT_PRIMARY }}>
              {languages.map((l, i) => (
                <div key={i}>{l} — Fluent</div>
              ))}
            </div>

            <SectionHeading>Courses</SectionHeading>
            <div style={{ marginBottom: "16px" }}>
              <div style={{ color: COLORS.TEXT_PRIMARY, fontWeight: "bold", fontSize: "12px" }}>Advanced System Design</div>
              <div style={{ color: COLORS.TEXT_SECONDARY, fontSize: "11px" }}>Focus on scalability and fault tolerance.</div>
            </div>

            <SectionHeading>Interests</SectionHeading>
            <div style={{ color: COLORS.ACCENT, fontWeight: "bold", fontSize: "12px" }}>UI/UX Research</div>
            <div style={{ color: COLORS.TEXT_SECONDARY, fontSize: "11px" }}>Passionate about accessible design patterns.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * TEMPLATE 13 — Finance & Corporate
 * Technical Reference: Template 11 (Structure & Constraints)
 * Design: Single-sheet continuous surface, Finance-grade, No Cards.
 */

// eslint-disable-next-line no-unused-vars
function PreviewFinanceDuplicate2({ cv, mobileMode = false }) {
  // Empty state: placeholder skeleton per T11 requirement
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
        }}
      >
        Loading Template 13...
      </div>
    );
  }

  const experience = Array.isArray(cv.experience) ? cv.experience : [];
  const education = Array.isArray(cv.education) ? cv.education : [];
  const languages = cv.languages ? cv.languages.split(",").map((l) => l.trim()).filter(Boolean) : [];

  const SectionHeading = ({ children }) => (
    <div style={{ marginBottom: "12px", breakAfter: "avoid" }}>
      <h2
        style={{
          fontSize: "12px",
          fontWeight: "bold",
          color: COLORS.TEXT_SECONDARY,
          textTransform: "uppercase",
          letterSpacing: "1px",
          margin: "0 0 8px 0",
        }}
      >
        {children}
      </h2>
      <div style={{ height: "1px", backgroundColor: COLORS.DIVIDER, width: "100%" }} />
    </div>
  );

  const skills = cv.skills ? cv.skills.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const certifications = cv.certifications ? cv.certifications.split(",").map((c) => c.trim()).filter(Boolean) : [];

  return (
    <div
      style={{
        width: "100%",
        minHeight: "auto", // T11 Constraint
        backgroundColor: COLORS.WHITE,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        fontFamily: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
        WebkitPrintColorAdjust: "exact",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "800px",
          backgroundColor: COLORS.WHITE,
          position: "relative",
          paddingBottom: "40px", // Puppeteer footer safety
        }}
      >
        {/* TOP ACCENT BAR */}
        <div style={{ height: "6px", backgroundColor: COLORS.ACCENT, width: "100%" }} />

        {/* HEADER SECTION */}
        <header style={{ padding: "32px 32px 20px 32px" }}>
          <h1
            style={{
              fontSize: "28px",
              fontWeight: "bold",
              color: COLORS.TEXT_PRIMARY,
              margin: 0,
              letterSpacing: "-0.5px",
            }}
          >
            {cv.name.toUpperCase()}
          </h1>
          <p style={{ fontSize: "14px", color: COLORS.TEXT_SECONDARY, margin: "4px 0 12px 0" }}>
            {cv.title || "Finance Professional"}
          </p>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              fontSize: "12px",
              color: COLORS.TEXT_SECONDARY,
            }}
          >
            {cv.phone && <span>{cv.phone}</span>}
            {cv.phone && cv.email && <span>•</span>}
            {cv.email && <span>{cv.email}</span>}
            {cv.email && cv.location && <span>•</span>}
            {cv.location && <span>{cv.location}</span>}
          </div>
        </header>

        {/* CONTENT GRID (FLEX) */}
        <div style={{ display: "flex", flexDirection: "row", gap: "40px", padding: "0 32px 32px 32px" }}>
          {/* LEFT COLUMN (65%) */}
          <div style={{ flex: "0 0 62%" }}>
            <SectionHeading>Experience</SectionHeading>
            {experience.map((exp, i) => (
              <div key={i} style={{ marginBottom: "20px", pageBreakInside: "avoid" }}>
                <div style={{ fontWeight: "bold", color: COLORS.TEXT_PRIMARY, fontSize: "14px" }}>{exp.role}</div>
                <div style={{ color: COLORS.TEXT_SECONDARY, fontSize: "12px", marginBottom: "6px" }}>
                  {exp.company} • {exp.period}
                </div>
                {exp.points &&
                  splitExperiencePointsForPreview(exp.points).map((point, j) => (
                    <div key={j} style={{ fontSize: "12.5px", color: COLORS.TEXT_PRIMARY, marginBottom: "4px", display: "flex", lineHeight: "1.5" }}>
                      <span style={{ marginRight: "8px" }}>•</span>
                      <span>{point}</span>
                    </div>
                  ))}
              </div>
            ))}

            <SectionHeading>Education</SectionHeading>
            {education.map((edu, i) => (
              <div key={i} style={{ marginBottom: "16px", pageBreakInside: "avoid" }}>
                <div style={{ fontWeight: "bold", color: COLORS.TEXT_PRIMARY, fontSize: "13px" }}>{edu.degree}</div>
                <div style={{ color: COLORS.TEXT_SECONDARY, fontSize: "12px" }}>
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
                    backgroundColor: "#e6eef7",
                    color: COLORS.TEXT_PRIMARY,
                    borderRadius: "6px",
                    fontSize: "12px",
                  }}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          {/* RIGHT COLUMN (35%) */}
          <div style={{ flex: "1" }}>
            <SectionHeading>Professional Summary</SectionHeading>
            <p style={{ fontSize: "12.5px", color: COLORS.TEXT_PRIMARY, lineHeight: "1.5", margin: "0 0 24px 0" }}>
              {cv.summary}
            </p>

            <SectionHeading>Key Metrics</SectionHeading>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "24px" }}>
              <div style={{ fontSize: "12px" }}>
                <span style={{ color: COLORS.ACCENT, fontWeight: "bold" }}>Portfolio:</span> $2.5M+
              </div>
              <div style={{ fontSize: "12px" }}>
                <span style={{ color: COLORS.ACCENT, fontWeight: "bold" }}>Cost Reduction:</span> 15%
              </div>
            </div>

            <SectionHeading>Certifications</SectionHeading>
            <div style={{ fontSize: "12px", color: COLORS.TEXT_PRIMARY, lineHeight: "1.8", marginBottom: "24px" }}>
              {certifications.length
                ? certifications.map((c, i) => (
                    <div key={i}>
                      • {c}
                    </div>
                  ))
                : "CFA Level 1"}
            </div>

            <SectionHeading>Languages</SectionHeading>
            <div style={{ fontSize: "12px", color: COLORS.TEXT_PRIMARY }}>
              {languages.map((l, i) => (
                <div key={i}>{l} — Fluent</div>
              ))}
            </div>

            <SectionHeading>Courses</SectionHeading>
            <div style={{ marginBottom: "16px" }}>
              <div style={{ color: COLORS.TEXT_PRIMARY, fontWeight: "bold", fontSize: "12px" }}>Advanced System Design</div>
              <div style={{ color: COLORS.TEXT_SECONDARY, fontSize: "11px" }}>Focus on scalability and fault tolerance.</div>
            </div>

            <SectionHeading>Interests</SectionHeading>
            <div style={{ color: COLORS.ACCENT, fontWeight: "bold", fontSize: "12px" }}>UI/UX Research</div>
            <div style={{ color: COLORS.TEXT_SECONDARY, fontSize: "11px" }}>Passionate about accessible design patterns.</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Keep wrapper export name in case the registry uses it elsewhere.
export function PreviewATSInternational({ cv, mobileMode = false }) {
  return <PreviewFinance cv={cv} mobileMode={mobileMode} />;
}

// ─────────────────────────────────────────────────────────────────
//  TEMPLATE 13 — Finance
//  Dense single column · banking & accounting · Gulf-ready
// ─────────────────────────────────────────────────────────────────

function splitPoints(points) {
  if (!points) return [];
  return String(points)
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function skillItems(cv) {
  return cv.skills
    ? cv.skills.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
}

function certItems(cv) {
  return cv.certifications
    ? cv.certifications.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
}

// eslint-disable-next-line no-unused-vars
function PreviewFinanceLegacy({ cv }) {
  const skills = skillItems(cv);
  const certs = certItems(cv);
  const hasTechnicalSkills = technicalSkillsGroupsForTemplate(cv.technicalSkills).length > 0;

  const contactRow = [cv.email, cv.phone, cv.location, cv.nationality, cv.visaStatus].filter(Boolean);
  const extraRow = [];
  if (cv.dob) extraRow.push(`DOB: ${cv.dob}`);
  if (cv.drivingLicense) extraRow.push(`Driving License: ${cv.drivingLicense}`);

  const SectionTitle = ({ children }) => (
    <div style={{ marginTop: "18px", marginBottom: "10px" }}>
      <div
        style={{
          fontSize: "12px",
          fontWeight: "700",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "#000000",
          fontFamily: "Arial, Helvetica, sans-serif",
          paddingBottom: "6px",
          borderBottom: "1px solid #000000",
        }}
      >
        {children}
      </div>
    </div>
  );

  return (
    <div
      style={{
        background: "#FFFFFF",
        borderRadius: "10px",
        overflow: "hidden",
        fontFamily: "Arial, Helvetica, sans-serif",
        color: "#000000",
        padding: "40px 48px",
        boxSizing: "border-box",
      }}
    >
      <div style={{ marginBottom: "14px" }}>
        <div style={{ paddingBottom: "8px", borderBottom: "2px solid #000000", marginBottom: "10px" }}>
          <h1
            style={{
              fontSize: "28px",
              fontWeight: "700",
              color: "#000000",
              margin: 0,
              fontFamily: "Arial, Helvetica, sans-serif",
            }}
          >
            {cv.name || "Your Name"}
          </h1>
        </div>
        <p
          style={{
            fontSize: "14px",
            color: "#333333",
            margin: "0 0 10px",
            fontFamily: "Arial, Helvetica, sans-serif",
          }}
        >
          {cv.title || "Professional Title"}
        </p>
        <div
          style={{
            fontSize: "12px",
            color: "#555555",
            lineHeight: 1.6,
            fontFamily: "Arial, Helvetica, sans-serif",
          }}
        >
          {contactRow.join(" | ")}
        </div>
        {extraRow.length > 0 && (
          <div
            style={{
              fontSize: "12px",
              color: "#555555",
              lineHeight: 1.6,
              marginTop: "4px",
              fontFamily: "Arial, Helvetica, sans-serif",
            }}
          >
            {extraRow.join(" | ")}
          </div>
        )}
      </div>

      {cv.summary && (
        <>
          <SectionTitle>Professional Summary</SectionTitle>
          <p
            style={{
              fontSize: "13px",
              lineHeight: 1.5,
              color: "#000000",
              margin: 0,
              fontFamily: "Arial, Helvetica, sans-serif",
            }}
          >
            {cv.summary}
          </p>
        </>
      )}

      {cv.experience.some((e) => e.company) && (
        <>
          <SectionTitle>Professional Experience</SectionTitle>
          {cv.experience
            .filter((e) => e.company)
            .map((e, i) => (
              <div key={i} style={{ marginBottom: "14px" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    gap: "12px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: "700",
                      color: "#000000",
                      fontFamily: "Arial, Helvetica, sans-serif",
                    }}
                  >
                    {e.company}
                    {e.location ? ` — ${e.location}` : ""}
                  </span>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#000000",
                      flexShrink: 0,
                      fontFamily: "Arial, Helvetica, sans-serif",
                    }}
                  >
                    {e.period}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: "13px",
                    fontStyle: "italic",
                    color: "#000000",
                    marginBottom: "6px",
                    fontFamily: "Arial, Helvetica, sans-serif",
                  }}
                >
                  {e.role}
                </div>
                {splitPoints(e.points).map((line, j) => (
                  <div
                    key={j}
                    style={{
                      fontSize: "13px",
                      color: "#000000",
                      marginLeft: "12px",
                      textIndent: "-12px",
                      lineHeight: 1.45,
                      fontFamily: "Arial, Helvetica, sans-serif",
                    }}
                  >
                    <span style={{ marginRight: "6px" }}>•</span>
                    {line}
                  </div>
                ))}
              </div>
            ))}
        </>
      )}

      {cv.education.some((e) => e.school) && (
        <>
          <SectionTitle>Education</SectionTitle>
          {cv.education
            .filter((e) => e.school)
            .map((e, i) => (
              <div
                key={i}
                style={{
                  marginBottom: "10px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "12px",
                }}
              >
                <div>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: "700",
                      color: "#000000",
                      fontFamily: "Arial, Helvetica, sans-serif",
                    }}
                  >
                    {e.school}
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      color: "#000000",
                      fontFamily: "Arial, Helvetica, sans-serif",
                    }}
                  >
                    {e.degree}
                  </div>
                </div>
                <span
                  style={{
                    fontSize: "12px",
                    color: "#000000",
                    flexShrink: 0,
                    fontFamily: "Arial, Helvetica, sans-serif",
                  }}
                >
                  {e.year}
                </span>
              </div>
            ))}
        </>
      )}

      {skills.length > 0 && (
        <>
          <SectionTitle>Skills</SectionTitle>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "6px 16px",
              fontSize: "13px",
              color: "#000000",
              fontFamily: "Arial, Helvetica, sans-serif",
            }}
          >
            {skills.map((s, i) => (
              <div key={i} style={{ lineHeight: 1.45 }}>
                {s}
              </div>
            ))}
          </div>
        </>
      )}

      {hasTechnicalSkills && (
        <>
          <SectionTitle>Technical Skills</SectionTitle>
          <div
            style={{
              fontSize: "13px",
              lineHeight: 1.5,
              color: "#000000",
              margin: 0,
              fontFamily: "Arial, Helvetica, sans-serif",
            }}
          >
            {(() => {
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
            })()}
          </div>
        </>
      )}

      {certs.length > 0 && (
        <>
          <SectionTitle>Certifications &amp; Training</SectionTitle>
          <div style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
            {certs.map((c, i) => (
              <div
                key={i}
                style={{
                  fontSize: "13px",
                  color: "#000000",
                  marginLeft: "12px",
                  textIndent: "-12px",
                  marginBottom: "4px",
                  lineHeight: 1.45,
                }}
              >
                <span style={{ marginRight: "6px" }}>•</span>
                {c}
              </div>
            ))}
          </div>
        </>
      )}

      {cv.languages && (
        <>
          <SectionTitle>Languages</SectionTitle>
          <p
            style={{
              fontSize: "13px",
              color: "#000000",
              margin: 0,
              lineHeight: 1.45,
              fontFamily: "Arial, Helvetica, sans-serif",
            }}
          >
            {cv.languages}
          </p>
        </>
      )}

      {cv.references && (
        <>
          <SectionTitle>References</SectionTitle>
          <p
            style={{
              fontSize: "12px",
              color: "#000000",
              fontStyle: "italic",
              margin: 0,
              fontFamily: "Arial, Helvetica, sans-serif",
            }}
          >
            {cv.references}
          </p>
        </>
      )}
    </div>
  );
}

/* PDF export: html2canvas + jsPDF from App.js (builder preview capture). */
