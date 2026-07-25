import React from "react";
import GhostChip from "./components/GhostChip";
import { parseExperiencePoints } from "./experiencePointsPreview";
import { buildPersonalDetailsEntries } from "./cvShared";
import { ph } from "./previewPlaceholder";

function technicalSkillsGroupsForTemplate(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((g) => g.chips?.length > 0);
  // Legacy string: pipe-separated
  const chips = raw.split("|").map((s) => s.trim()).filter(Boolean);
  if (!chips.length) return [];
  return [{ category: 'Technical Skills', chips }];
}

function certificationLines(cv) {
  const raw = cv.certifications;
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((c) => {
        if (c == null) return "";
        if (typeof c === "string") return c.trim();
        const name = String(c.name || "").trim();
        if (!name) return "";
        const bits = [name];
        if (c.issuer) bits.push(String(c.issuer).trim());
        if (c.year) bits.push(`(${String(c.year).trim()})`);
        return bits.join(" — ");
      })
      .filter(Boolean);
  }
  return String(raw).split(",").map((s) => s.trim()).filter(Boolean);
}

const FREETEXT_BULLET = /^\s*(?:[•·*]\s*|[-–]\s+|\d+[.):]\s+)/;
function freeTextLines(text) {
  if (!text) return [];
  return String(text)
    .split(/\r?\n/)
    .map((l) => l.trim().replace(FREETEXT_BULLET, "").trim())
    .filter(Boolean);
}

const NAVY_DARK = "#0F172A"; // Deep navy/black
const TEXT_PRIMARY = "#1F2937"; // Charcoal
const TEXT_SECONDARY = "#4B5563"; // Slate/Grey
const ACCENT = "#334155"; // Muted dark slate
const SKELETON = "#D1D5DB";

const FONT = 'Arial, "Helvetica Neue", Helvetica, sans-serif';

export function PreviewEditorialDark({ cv, mobileMode = false }) {
  const s = mobileMode ? 0.8 : 1;
  const pt = (n) => `${n * s}pt`;
  const isEmpty = !cv.name || cv.name.trim() === "";
  const personalDetails = buildPersonalDetailsEntries(cv);

  const SectionTitle = ({ children }) => (
    <div style={{ marginTop: "8mm", marginBottom: "5mm", breakAfter: "avoid" }}>
      <div
        style={{
          fontSize: pt(13),
          fontWeight: "800",
          color: NAVY_DARK,
          textTransform: "uppercase",
          letterSpacing: "1px",
          fontFamily: FONT,
        }}
      >
        {children}
      </div>
      {/* Short thick underline/bar */}
      <div style={{ width: "35px", height: "4px", backgroundColor: NAVY_DARK, marginTop: "4px" }} />
    </div>
  );

  const experience = Array.isArray(cv.experience) ? cv.experience : [];
  const skillsCells = (cv.skills || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const hasTechnicalSkills = technicalSkillsGroupsForTemplate(cv.technicalSkills).length > 0;
  const languageList = (cv.languages || "")
    .split(",")
    .map((l) => l.trim())
    .filter(Boolean);
  const educationRows = (Array.isArray(cv.education) ? cv.education : []).filter((edu) => edu && edu.school);
  const certList = certificationLines(cv);
  const projectLines = freeTextLines(cv.projects);
  const publicationLines = freeTextLines(cv.publications);
  const volunteerLines = freeTextLines(cv.volunteerWork);

  return (
    <div
      style={{
        width: mobileMode ? "100%" : "210mm",
        maxWidth: "100%",
        minHeight: "auto",
        background: "#FFFFFF",
        paddingBottom: "40px", // Puppeteer constraint
        boxSizing: "border-box",
        fontFamily: FONT,
        color: TEXT_SECONDARY,
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
      }}
    >
      {/* Dark Full-Width Header Band */}
      <header
        style={{
          background: NAVY_DARK,
          padding: "12mm 15mm",
          color: "#FFFFFF",
          textAlign: "left",
        }}
      >
        <h1
          style={{
            fontSize: pt(26),
            fontWeight: "900",
            margin: 0,
            color: "#FFFFFF",
            letterSpacing: "-0.5px",
          }}
        >
          {ph(cv.name, "JONATHAN DOE")}
        </h1>
        <div
          style={{
            fontSize: pt(12),
            fontWeight: "400",
            color: "#94A3B8",
            marginTop: "2px",
            textTransform: "uppercase",
            letterSpacing: "2px",
          }}
        >
          {ph(cv.title, "STRATEGIC OPERATIONS DIRECTOR")}
        </div>

        <div
          style={{
            marginTop: "15px",
            fontSize: pt(9),
            display: "flex",
            flexWrap: "wrap",
            gap: "8px 20px",
            color: "#F1F5F9",
            opacity: 0.9,
          }}
        >
          {isEmpty ? (
            <span className="cvp-ph">email@address.com • +00 000 000 • Location</span>
          ) : (
            <>
              {cv.email && <span>{cv.email}</span>}
              {cv.phone && <span>{cv.phone}</span>}
              {cv.location && <span>{cv.location}</span>}
              {(cv.linkedin || cv.linkedIn) && <span>{cv.linkedin || cv.linkedIn}</span>}
            </>
          )}
        </div>
        {personalDetails.length > 0 && (
          <div
            style={{
              marginTop: "8px",
              fontSize: pt(9),
              display: "flex",
              flexWrap: "wrap",
              gap: "8px 20px",
              color: "#F1F5F9",
              opacity: 0.9,
            }}
          >
            {personalDetails.map((d, i) => (
              <span key={i}>
                {d.label}: {d.value}
              </span>
            ))}
          </div>
        )}
      </header>

      <div style={{ padding: "0 15mm" }}>
        {/* Profile */}
        {cv.summary && (
          <section data-section="summary">
            <GhostChip>{cv.summary}</GhostChip>
            <SectionTitle>Profile</SectionTitle>
            <p
              style={{
                fontSize: pt(10),
                lineHeight: 1.6,
                margin: 0,
                color: TEXT_PRIMARY,
              }}
            >
              {cv.summary}
            </p>
          </section>
        )}

        {/* Experience */}
        {experience.filter((e) => e.company).length > 0 && (
        <section data-section="experience">
          <SectionTitle>Experience</SectionTitle>
          {experience
            .filter((e) => e.company)
            .map((e, i) => (
              <div
                key={i}
                style={{ marginBottom: "6mm", breakInside: "avoid", pageBreakInside: "avoid" }}
              >
                <GhostChip>{`${e.role} ${e.company}`}</GhostChip>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div style={{ fontWeight: "800", fontSize: pt(11), color: NAVY_DARK }}>{e.company}</div>
                  <div style={{ fontSize: pt(9), fontWeight: "600", color: TEXT_SECONDARY }}>{e.period}</div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: "1px" }}>
                  <div style={{ fontStyle: "italic", fontSize: pt(10), color: ACCENT }}>{e.role}</div>
                  {e.location && (
                    <div style={{ fontSize: pt(9), color: TEXT_SECONDARY }}>{e.location}</div>
                  )}
                </div>

                <div style={{ marginTop: "3mm" }}>
                  {e.points && (() => {
                    const { bullets, format } = parseExperiencePoints(e.points);
                    return bullets.map((p, j) => (
                      <div
                        key={j}
                        style={{
                          fontSize: pt(9.5),
                          margin: "0 0 1.5mm",
                          lineHeight: 1.5,
                          display: "flex",
                          gap: "8px",
                          color: TEXT_PRIMARY,
                        }}
                      >
                        {format === "list" && <span style={{ color: SKELETON }}>•</span>}
                        <span>{p}</span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            ))}
        </section>
        )}

        {/* Skills */}
        {(skillsCells.length > 0 || isEmpty) && (
          <section>
            <SectionTitle>Skills</SectionTitle>
            <GhostChip>
              {Array.isArray(cv.skills) ? cv.skills.join(" ") : cv.skills || ""}
            </GhostChip>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "2px" }}>
              {(isEmpty ? ["Skill One", "Skill Two", "Skill Three"] : skillsCells).map((s, i) => (
                <span
                  key={i}
                  style={{
                    background: NAVY_DARK,
                    color: "#FFFFFF",
                    fontSize: pt(8.5),
                    padding: "3px 10px",
                    borderRadius: "4px",
                    fontWeight: "600",
                    letterSpacing: "0.3px",
                  }}
                >
                  {isEmpty ? <span className="cvp-ph">{s}</span> : s}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Technical Skills */}
        {(hasTechnicalSkills || isEmpty) && (
          <section data-section="competencies">
            <SectionTitle>Technical Skills</SectionTitle>
            <div style={{ fontSize: pt(9.5), color: TEXT_PRIMARY, margin: 0, lineHeight: 1.6 }}>
              {isEmpty ? (
                <span className="cvp-ph">Stack, tools, and platforms</span>
              ) : (
                (() => {
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
                })()
              )}
            </div>
          </section>
        )}

        {/* Education */}
        {educationRows.length > 0 && (
          <section data-section="education">
            <SectionTitle>Education</SectionTitle>
            {educationRows.map((edu, i) => (
              <div key={i} style={{ marginBottom: "4mm", breakInside: "avoid" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <div style={{ fontWeight: "700", color: NAVY_DARK, fontSize: pt(10) }}>
                    {[edu.school, edu.location].map((v) => String(v || "").trim()).filter(Boolean).join(", ")}
                  </div>
                  <div style={{ fontSize: pt(9), color: TEXT_SECONDARY }}>{edu.year}</div>
                </div>
                <div style={{ fontSize: pt(9.5), color: TEXT_SECONDARY }}>
                  {[edu.degree, edu.fieldOfStudy].map((v) => String(v || "").trim()).filter(Boolean).join(", ")}
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Certifications */}
        {certList.length > 0 && (
          <section data-section="certifications">
            <SectionTitle>Certifications</SectionTitle>
            {certList.map((c, i) => (
              <p key={i} style={{ fontSize: pt(9.5), color: TEXT_PRIMARY, margin: "0 0 1.5mm", lineHeight: 1.5 }}>
                {c}
              </p>
            ))}
          </section>
        )}

        {/* Projects */}
        {projectLines.length > 0 && (
          <section data-section="projects">
            <SectionTitle>Projects</SectionTitle>
            {projectLines.map((p, i) => (
              <div
                key={i}
                style={{
                  fontSize: pt(9.5),
                  margin: "0 0 1.5mm",
                  lineHeight: 1.5,
                  display: "flex",
                  gap: "8px",
                  color: TEXT_PRIMARY,
                }}
              >
                <span style={{ color: SKELETON }}>•</span>
                <span>{p}</span>
              </div>
            ))}
          </section>
        )}

        {/* Publications */}
        {publicationLines.length > 0 && (
          <section data-section="publications">
            <SectionTitle>Publications</SectionTitle>
            {publicationLines.map((p, i) => (
              <div
                key={i}
                style={{
                  fontSize: pt(9.5),
                  margin: "0 0 1.5mm",
                  lineHeight: 1.5,
                  display: "flex",
                  gap: "8px",
                  color: TEXT_PRIMARY,
                }}
              >
                <span style={{ color: SKELETON }}>•</span>
                <span>{p}</span>
              </div>
            ))}
          </section>
        )}

        {/* Volunteer Work */}
        {volunteerLines.length > 0 && (
          <section data-section="volunteer">
            <SectionTitle>Volunteer Work</SectionTitle>
            {volunteerLines.map((p, i) => (
              <div
                key={i}
                style={{
                  fontSize: pt(9.5),
                  margin: "0 0 1.5mm",
                  lineHeight: 1.5,
                  display: "flex",
                  gap: "8px",
                  color: TEXT_PRIMARY,
                }}
              >
                <span style={{ color: SKELETON }}>•</span>
                <span>{p}</span>
              </div>
            ))}
          </section>
        )}

        {/* Languages */}
        {languageList.length > 0 && (
          <section data-section="languages">
            <SectionTitle>Languages</SectionTitle>
            <div
              style={{
                fontSize: pt(10),
                color: TEXT_PRIMARY,
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              {languageList.join(" • ")}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

// Keep the same exported name used by src/App.js
export function PreviewGulfExecutive({ cv, t, mobileMode = false }) {
  return <PreviewEditorialDark cv={cv} mobileMode={mobileMode} />;
}