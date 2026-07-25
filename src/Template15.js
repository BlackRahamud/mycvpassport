// ─────────────────────────────────────────────────────────────────
//  TEMPLATE 15 — Slate Carbon
//  Full-width single-column, dark header block. Preview + PDF.
// ─────────────────────────────────────────────────────────────────

import GhostChip from "./components/GhostChip";
import { buildPersonalDetailsEntries } from "./cvShared";
import { renderPdfExperiencePoints } from "./experiencePointsPdf";
import { parseExperiencePoints } from "./experiencePointsPreview";
import {
  PDF_CONTENT_BOTTOM_Y,
  PDF_NEW_PAGE_TOP_Y,
  pdfEnsureY,
  pdfDrawWrappedText,
} from "./pdfA4Layout";

const HEADER_BG = "#111827";
const ACCENT = "#6B7280";
const SECTION_TITLE = "#111827";
const ROLE_COLOR = "#111827";
const COMPANY_COLOR = "#6B7280";
const DATE_COLOR = "#9CA3AF";
const BULLET_COLOR = "#4B5563";
const BODY_COLOR = "#4B5563";
const BORDER_COLOR = "#E5E7EB";
const BG = "#FFFFFF";

const SERIF = 'Georgia, "Times New Roman", serif';
const SANS = 'Arial, "Helvetica Neue", Helvetica, sans-serif';

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

function technicalSkillsGroups(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((g) => g.chips?.length > 0);
  // Legacy string: pipe-separated
  const chips = String(raw).split("|").map((s) => s.trim()).filter(Boolean);
  if (!chips.length) return [];
  return [{ category: "Technical Skills", chips }];
}

function freeTextLines(raw) {
  if (!raw) return [];
  return String(raw)
    .split(/\r?\n/)
    .map((s) => s.trim().replace(/^(?:[•\-–*]|\d+\.)\s*/, "").trim())
    .filter(Boolean);
}

export function PreviewSlateCarbon({ cv, mobileMode = false }) {
  const s = mobileMode ? 0.8 : 1;
  const pt = (n) => `${n * s}pt`;

  const skillCore = cv.skills
    ? cv.skills.split(",").map((x) => x.trim()).filter(Boolean)
    : [];
  const certList = certificationLines(cv);
  const langList = cv.languages
    ? cv.languages.split(",").map((l) => l.trim()).filter(Boolean)
    : [];
  const linkedIn = cv.linkedin || cv.linkedIn || cv.linkedInUrl || cv.linkedinUrl || "";
  const techGroups = technicalSkillsGroups(cv.technicalSkills);
  const projectLines = freeTextLines(cv.projects);
  const publicationLines = freeTextLines(cv.publications);
  const volunteerLines = freeTextLines(cv.volunteerWork);

  const EntryWrap = ({ children }) => (
    <div style={{ display: "block" }}>
      <div
        style={{
          display: "block",
          breakInside: "avoid-page",
          pageBreakInside: "avoid",
          WebkitColumnBreakInside: "avoid",
          marginBottom: "6mm",
        }}
      >
        {children}
      </div>
    </div>
  );

  const SectionTitle = ({ children, first }) => (
    <div
      style={{
        fontSize: pt(10),
        fontWeight: 700,
        color: SECTION_TITLE,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        fontFamily: SANS,
        marginTop: first ? 0 : "8mm",
        marginBottom: "8mm",
        paddingBottom: "3px",
        borderBottom: `0.8px solid ${BORDER_COLOR}`,
        breakAfter: "avoid",
        pageBreakAfter: "avoid",
        WebkitColumnBreakAfter: "avoid",
      }}
    >
      {children}
    </div>
  );

  const LineList = ({ lines }) => (
    <div style={{ marginTop: "-4mm", breakInside: "auto", pageBreakInside: "auto" }}>
      <EntryWrap>
        <div>
          {lines.map((line, i) => (
            <div
              key={i}
              style={{
                display: "block",
                marginBottom: "4px",
                paddingLeft: 12,
                textIndent: -12,
                lineHeight: 1.5,
                fontSize: pt(10),
                color: BULLET_COLOR,
              }}
            >
              {`• ${line}`}
            </div>
          ))}
        </div>
      </EntryWrap>
    </div>
  );

  const contactBits = [];
  if (cv.email) contactBits.push(cv.email);
  if (cv.phone) contactBits.push(cv.phone);
  if (cv.location) contactBits.push(cv.location);
  if (linkedIn) contactBits.push(linkedIn);

  const personalDetails = buildPersonalDetailsEntries(cv);

  const experience = Array.isArray(cv.experience) ? cv.experience : [];
  const education = Array.isArray(cv.education) ? cv.education : [];

  return (
    // KEEP position:relative on outer template root — conservative bias against future absolute descendants re-anchoring (Phase 3 audit)
    <div
      style={{
        width: mobileMode ? "100%" : "210mm",
        maxWidth: "100%",
        minHeight: mobileMode ? "100%" : "297mm",
        height: "auto",
        background: BG,
        position: "relative",
        paddingLeft: 0,
        paddingRight: 0,
        paddingTop: 0,
        paddingBottom: "15mm",
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
        boxSizing: "border-box",
        fontFamily: SANS,
        color: BODY_COLOR,
        overflow: "visible",
      }}
    >
      {/* Header */}
      <header
        style={{
          background: HEADER_BG,
          padding: "8mm 15mm 8mm",
          marginBottom: "4mm",
        }}
      >
        <h1
          style={{
            fontSize: pt(24),
            fontWeight: 700,
            color: "#FFFFFF",
            margin: 0,
            lineHeight: 1.15,
            fontFamily: SERIF,
          }}
        >
          {cv.name || "Your Name"}
        </h1>
        {cv.title && (
          <p
            style={{
              fontSize: pt(10),
              fontWeight: 400,
              color: "#9CA3AF",
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              margin: "6px 0 0",
              fontFamily: SANS,
            }}
          >
            {cv.title}
          </p>
        )}
        <div
          style={{
            width: "28px",
            height: "1.5px",
            background: ACCENT,
            margin: "10px 0",
          }}
        />
        {contactBits.length > 0 && (
          <div
            style={{
              fontSize: pt(9),
              color: "#9CA3AF",
              lineHeight: 1.5,
              fontFamily: SANS,
            }}
          >
            {contactBits.join("  ·  ")}
          </div>
        )}
        {personalDetails.length > 0 && (
          <div
            style={{
              fontSize: pt(9),
              color: "#9CA3AF",
              lineHeight: 1.5,
              fontFamily: SANS,
              marginTop: "4px",
            }}
          >
            {personalDetails.map((d) => `${d.label}: ${d.value}`).join("  ·  ")}
          </div>
        )}
      </header>

      {/* Body content — 15mm gutters */}
      <div style={{ paddingLeft: "15mm", paddingRight: "15mm" }}>

      {/* Professional Summary */}
      {cv.summary && (
        <section data-section="summary">
          <SectionTitle first>Professional Summary</SectionTitle>
          <div>
            <GhostChip>{cv.summary}</GhostChip>
            <p
              style={{
                fontSize: pt(10),
                lineHeight: 1.5,
                color: BODY_COLOR,
                margin: 0,
                marginTop: "-4mm",
              }}
            >
              {cv.summary}
            </p>
          </div>
        </section>
      )}

      {/* Professional Experience */}
      {experience.some((e) => e.company) && (
        <section data-section="experience">
          <SectionTitle first={!cv.summary}>Professional Experience</SectionTitle>
          <div style={{ marginTop: "-4mm", breakInside: "auto", pageBreakInside: "auto" }}>
            {experience
              .filter((e) => e.company)
              .map((e, i) => (
                <EntryWrap key={i}>
                  <div>
                    <GhostChip>
                      {e.role} at {e.company} {e.period}
                    </GhostChip>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "10px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: pt(10),
                          fontWeight: 700,
                          color: ROLE_COLOR,
                        }}
                      >
                        {e.role}
                      </span>
                      <span
                        style={{
                          fontSize: pt(10),
                          color: DATE_COLOR,
                          flexShrink: 0,
                          textAlign: "right",
                        }}
                      >
                        {e.period}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: pt(10),
                        fontStyle: "italic",
                        color: COMPANY_COLOR,
                        margin: "2px 0 6px",
                      }}
                    >
                      {e.company}
                      {e.location ? ` — ${e.location}` : ""}
                    </div>
                  </div>
                  {e.points && (() => {
                    const { bullets, format } = parseExperiencePoints(e.points);
                    if (bullets.length === 0) return null;
                    return (
                      <div>
                        {bullets.map((line, j) => (
                          <div
                            key={j}
                            style={{
                              display: "block",
                              marginBottom: "4px",
                              paddingLeft: format === "list" ? 12 : 0,
                              textIndent: format === "list" ? -12 : 0,
                              lineHeight: 1.5,
                              fontSize: pt(10),
                              color: BULLET_COLOR,
                            }}
                          >
                            {format === "list" ? `• ${line}` : line}
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </EntryWrap>
              ))}
          </div>
        </section>
      )}

      {/* Education */}
      {education.some((e) => e.school) && (
        <section data-section="education">
          <SectionTitle
            first={!cv.summary && !experience.some((e) => e.company)}
          >
            Education
          </SectionTitle>
          <div style={{ marginTop: "-4mm", breakInside: "auto", pageBreakInside: "auto" }}>
            {education
              .filter((e) => e.school)
              .map((e, i) => (
                <EntryWrap key={i}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      gap: "10px",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: pt(10),
                          fontWeight: 700,
                          color: ROLE_COLOR,
                        }}
                      >
                        {[e.degree, e.fieldOfStudy]
                          .map((v) => String(v || "").trim())
                          .filter(Boolean)
                          .join(", ")}
                      </div>
                      <div
                        style={{
                          fontSize: pt(10),
                          fontStyle: "italic",
                          color: COMPANY_COLOR,
                        }}
                      >
                        {[e.school, e.location]
                          .map((v) => String(v || "").trim())
                          .filter(Boolean)
                          .join(", ")}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: pt(10),
                        color: DATE_COLOR,
                        flexShrink: 0,
                      }}
                    >
                      {e.year}
                    </span>
                  </div>
                </EntryWrap>
              ))}
          </div>
        </section>
      )}

      {/* Certifications */}
      {certList.length > 0 && (
        <section data-section="certifications">
          <SectionTitle
            first={
              !cv.summary &&
              !experience.some((e) => e.company) &&
              !education.some((e) => e.school)
            }
          >
            Certifications
          </SectionTitle>
          <div style={{ marginTop: "-4mm", breakInside: "auto", pageBreakInside: "auto" }}>
            <EntryWrap>
              <div>
                <GhostChip>{certList.join(" · ")}</GhostChip>
                <p style={{ fontSize: pt(10), lineHeight: 1.5, margin: 0, color: BODY_COLOR }}>
                  {certList.join(" · ")}
                </p>
              </div>
            </EntryWrap>
          </div>
        </section>
      )}

      {/* Projects */}
      {projectLines.length > 0 && (
        <section data-section="projects">
          <SectionTitle
            first={
              !cv.summary &&
              !experience.some((e) => e.company) &&
              !education.some((e) => e.school) &&
              certList.length === 0
            }
          >
            Projects
          </SectionTitle>
          <LineList lines={projectLines} />
        </section>
      )}

      {/* Publications */}
      {publicationLines.length > 0 && (
        <section data-section="publications">
          <SectionTitle
            first={
              !cv.summary &&
              !experience.some((e) => e.company) &&
              !education.some((e) => e.school) &&
              certList.length === 0 &&
              projectLines.length === 0
            }
          >
            Publications
          </SectionTitle>
          <LineList lines={publicationLines} />
        </section>
      )}

      {/* Volunteer Work */}
      {volunteerLines.length > 0 && (
        <section data-section="volunteer">
          <SectionTitle
            first={
              !cv.summary &&
              !experience.some((e) => e.company) &&
              !education.some((e) => e.school) &&
              certList.length === 0 &&
              projectLines.length === 0 &&
              publicationLines.length === 0
            }
          >
            Volunteer Work
          </SectionTitle>
          <LineList lines={volunteerLines} />
        </section>
      )}

      {/* Skills */}
      {skillCore.length > 0 && (
        <section data-section="competencies">
          <SectionTitle
            first={
              !cv.summary &&
              !experience.some((e) => e.company) &&
              !education.some((e) => e.school) &&
              certList.length === 0 &&
              projectLines.length === 0 &&
              publicationLines.length === 0 &&
              volunteerLines.length === 0
            }
          >
            Skills
          </SectionTitle>
          <div style={{ marginTop: "-4mm", breakInside: "auto", pageBreakInside: "auto" }}>
            <EntryWrap>
              <div>
                <GhostChip>{skillCore.join(" · ")}</GhostChip>
                <p style={{ fontSize: pt(10), lineHeight: 1.5, margin: 0, color: BODY_COLOR }}>
                  {skillCore.join(" · ")}
                </p>
              </div>
            </EntryWrap>
          </div>
        </section>
      )}

      {/* Technical Skills */}
      {techGroups.length > 0 && (
        <section data-section="technical-skills">
          <SectionTitle
            first={
              !cv.summary &&
              !experience.some((e) => e.company) &&
              !education.some((e) => e.school) &&
              certList.length === 0 &&
              projectLines.length === 0 &&
              publicationLines.length === 0 &&
              volunteerLines.length === 0 &&
              skillCore.length === 0
            }
          >
            Technical Skills
          </SectionTitle>
          <div style={{ marginTop: "-4mm", breakInside: "auto", pageBreakInside: "auto" }}>
            <EntryWrap>
              <div>
                {techGroups.map((g, i) => (
                  <p
                    key={i}
                    style={{
                      fontSize: pt(10),
                      lineHeight: 1.5,
                      margin: i === 0 ? 0 : "4px 0 0",
                      color: BODY_COLOR,
                    }}
                  >
                    {g.category && (
                      <span style={{ fontWeight: 700, color: ROLE_COLOR }}>
                        {g.category}:{" "}
                      </span>
                    )}
                    {g.chips.join(" · ")}
                  </p>
                ))}
              </div>
            </EntryWrap>
          </div>
        </section>
      )}

      {/* Languages */}
      {langList.length > 0 && (
        <section data-section="languages">
          <SectionTitle
            first={
              !cv.summary &&
              !experience.some((e) => e.company) &&
              !education.some((e) => e.school) &&
              certList.length === 0 &&
              projectLines.length === 0 &&
              publicationLines.length === 0 &&
              volunteerLines.length === 0 &&
              skillCore.length === 0 &&
              techGroups.length === 0
            }
          >
            Languages
          </SectionTitle>
          <div style={{ marginTop: "-4mm", breakInside: "auto", pageBreakInside: "auto" }}>
            <EntryWrap>
              <p style={{ fontSize: pt(10), lineHeight: 1.5, margin: 0, color: BODY_COLOR }}>
                {langList.join(" · ")}
              </p>
            </EntryWrap>
          </div>
        </section>
      )}
      </div>
    </div>
  );
}

// ─── PDF: Slate Carbon ──────────────────────────────────────────
export function pdfSlateCarbon(doc, cv, W, M) {
  const pdfBottomY = PDF_CONTENT_BOTTOM_Y;
  const pdfTopY = PDF_NEW_PAGE_TOP_Y;
  const newPageOpts = {};

  const body = [75, 85, 99];
  const dark = [17, 24, 39];
  const dateC = [156, 163, 175];
  const companyC = [107, 114, 128];

  // Header background
  doc.setFillColor(17, 24, 39);
  doc.rect(0, 0, 210, 42, "F");

  let y = 14;

  // Name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text(cv.name || "Your Name", M, y);
  y += 6;

  // Title
  if (cv.title) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(cv.title.toUpperCase(), M, y);
    y += 5;
  }

  // Accent bar
  doc.setFillColor(107, 114, 128);
  doc.rect(M, y, 28, 1.5, "F");
  y += 4;

  // Contact
  const contactParts = [];
  if (cv.email) contactParts.push(cv.email);
  if (cv.phone) contactParts.push(cv.phone);
  if (cv.location) contactParts.push(cv.location);
  const linkedIn = cv.linkedin || cv.linkedIn || cv.linkedInUrl || cv.linkedinUrl || "";
  if (linkedIn) contactParts.push(linkedIn);
  if (contactParts.length > 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(156, 163, 175);
    doc.text(contactParts.join("  ·  "), M, y);
  }

  // Personal details — Gulf position, directly under contact
  const personalEntries = buildPersonalDetailsEntries(cv);
  if (personalEntries.length > 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(156, 163, 175);
    const detailLines = doc.splitTextToSize(
      personalEntries.map((d) => `${d.label}: ${d.value}`).join("  ·  "),
      W - M - M
    );
    let dy = contactParts.length > 0 ? y + 3.5 : y;
    detailLines.forEach((line) => {
      doc.text(line, M, dy);
      dy += 3.5;
    });
  }

  y = 50;
  const rw = W - M - M;

  const mainSection = (title) => {
    y = pdfEnsureY(doc, y, 8, pdfBottomY, pdfTopY, newPageOpts);
    doc.setTextColor(...dark);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(title.toUpperCase(), M, y);
    y += 1.5;
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.4);
    doc.line(M, y, M + rw, y);
    y += 6;
  };

  if (cv.summary) {
    mainSection("Professional Summary");
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...body);
    y = pdfDrawWrappedText(doc, cv.summary, rw, 8.5, M, y, 4.5, pdfBottomY, pdfTopY, undefined, newPageOpts);
    y += 8;
  }

  const experience = Array.isArray(cv.experience) ? cv.experience : [];
  if (experience.some((e) => e.company)) {
    mainSection("Professional Experience");
    experience.filter((e) => e.company).forEach((e) => {
      y = pdfEnsureY(doc, y, 5, pdfBottomY, pdfTopY, newPageOpts);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...dark);
      doc.text(e.role || "", M, y);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...dateC);
      doc.text(e.period || "", W - M, y, { align: "right" });
      y += 5;

      y = pdfEnsureY(doc, y, 5, pdfBottomY, pdfTopY, newPageOpts);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.5);
      doc.setTextColor(...companyC);
      const compStr = (e.company || "") + (e.location ? ` — ${e.location}` : "");
      doc.text(compStr, M, y);
      y += 5;

      if (e.points) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(...body);
        y = renderPdfExperiencePoints(doc, e.points, M, y, rw, 4, pdfBottomY, pdfTopY, 8, newPageOpts) + 2;
      }
      y += 5;
    });
  }

  const education = Array.isArray(cv.education) ? cv.education : [];
  if (education.some((e) => e.school)) {
    mainSection("Education");
    education.filter((e) => e.school).forEach((e) => {
      y = pdfEnsureY(doc, y, 5, pdfBottomY, pdfTopY, newPageOpts);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...dark);
      doc.text(e.degree || "", M, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...dateC);
      doc.text(e.year || "", W - M, y, { align: "right" });
      y += 4.5;
      y = pdfEnsureY(doc, y, 5, pdfBottomY, pdfTopY, newPageOpts);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8.5);
      doc.setTextColor(...companyC);
      doc.text(e.school || "", M, y);
      y += 9;
    });
  }

  if (cv.certifications) {
    mainSection("Certifications");
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...body);
    const certText = typeof cv.certifications === "string"
      ? cv.certifications
      : Array.isArray(cv.certifications)
        ? cv.certifications.map((c) => (typeof c === "string" ? c : c?.name || "")).join(" · ")
        : "";
    y = pdfDrawWrappedText(doc, certText, rw, 8.5, M, y, 4.5, pdfBottomY, pdfTopY, undefined, newPageOpts);
    y += 8;
  }

  if (cv.skills) {
    mainSection("Skills");
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...body);
    y = pdfDrawWrappedText(doc, cv.skills, rw, 8.5, M, y, 4.5, pdfBottomY, pdfTopY, undefined, newPageOpts);
    y += 8;
  }

  if (cv.languages) {
    mainSection("Languages");
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...body);
    y = pdfDrawWrappedText(doc, cv.languages, rw, 8.5, M, y, 4.5, pdfBottomY, pdfTopY, undefined, newPageOpts);
  }
}
