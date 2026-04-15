// ─────────────────────────────────────────────────────────────────
//  TEMPLATE 18 — Midnight Gold
//  Full-width single-column, dark header with gold accent. Preview + PDF.
// ─────────────────────────────────────────────────────────────────

import GhostChip from "./components/GhostChip";
import { renderPdfExperiencePoints } from "./experiencePointsPdf";
import {
  PDF_CONTENT_BOTTOM_Y,
  PDF_NEW_PAGE_TOP_Y,
  pdfEnsureY,
  pdfDrawWrappedText,
} from "./pdfA4Layout";

const HEADER_BG = "#0A0A0A";
const ACCENT = "#D97706";
const SECTION_TITLE = "#0A0A0A";
const COMPANY_COLOR = "#D97706";
const DATE_COLOR = "#9CA3AF";
const BODY_COLOR = "#4B5563";
const BG = "#FFFFFF";

const SERIF = 'Georgia, "Times New Roman", serif';
const SANS = 'Arial, "Helvetica Neue", Helvetica, sans-serif';

function experienceBulletItems(points) {
  if (points == null) return [];
  if (Array.isArray(points)) {
    return points.flatMap((p) =>
      experienceBulletItems(typeof p === "string" ? p : p == null ? "" : String(p)),
    );
  }
  const raw = String(points).trim();
  if (!raw) return [];
  const byNl = raw.split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  if (byNl.length > 1) {
    return byNl.flatMap((line) =>
      line.includes("•")
        ? line.split("•").map((s) => s.trim()).filter(Boolean)
        : [line],
    );
  }
  const one = byNl[0] ?? raw;
  if (one.includes("•")) {
    return one.split("•").map((s) => s.trim()).filter(Boolean);
  }
  return [one];
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

export function PreviewMidnightGold({ cv, mobileMode = false }) {
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
        display: "flex",
        alignItems: "center",
        gap: "8px",
        marginTop: first ? 0 : "8mm",
        marginBottom: "8mm",
        breakAfter: "avoid",
        pageBreakAfter: "avoid",
        WebkitColumnBreakAfter: "avoid",
      }}
    >
      <span
        style={{
          fontSize: pt(10),
          fontWeight: 700,
          color: SECTION_TITLE,
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          fontFamily: SANS,
          flexShrink: 0,
        }}
      >
        {children}
      </span>
      <span
        style={{
          flex: 1,
          height: "1px",
          background: ACCENT,
        }}
      />
    </div>
  );

  const contactBits = [];
  if (cv.email) contactBits.push(cv.email);
  if (cv.phone) contactBits.push(cv.phone);
  if (cv.location) contactBits.push(cv.location);
  if (linkedIn) contactBits.push(linkedIn);

  const experience = Array.isArray(cv.experience) ? cv.experience : [];
  const education = Array.isArray(cv.education) ? cv.education : [];

  return (
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
          padding: "12mm 15mm 10mm",
          marginBottom: "6mm",
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
              color: ACCENT,
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
              color: "#737373",
              lineHeight: 1.5,
              fontFamily: SANS,
            }}
          >
            {contactBits.join("  ·  ")}
          </div>
        )}
      </header>

      {/* Body content — 15mm gutters */}
      <div style={{ paddingLeft: "15mm", paddingRight: "15mm" }}>

      {/* Professional Summary */}
      {cv.summary && (
        <section data-section="summary">
          <SectionTitle first>Professional Summary</SectionTitle>
          <div style={{ position: "relative" }}>
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
          <div style={{ marginTop: "-4mm" }}>
            {experience
              .filter((e) => e.company)
              .map((e, i) => (
                <EntryWrap key={i}>
                  <div style={{ position: "relative" }}>
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
                          color: SECTION_TITLE,
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
                  {e.points && (
                    <div>
                      {experienceBulletItems(e.points).map((line, j) => (
                        <div
                          key={j}
                          style={{
                            display: "block",
                            marginBottom: "4px",
                            paddingLeft: 12,
                            textIndent: -12,
                            lineHeight: 1.5,
                            fontSize: pt(10),
                            color: BODY_COLOR,
                          }}
                        >
                          • {line}
                        </div>
                      ))}
                    </div>
                  )}
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
          <div style={{ marginTop: "-4mm" }}>
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
                          color: SECTION_TITLE,
                        }}
                      >
                        {e.degree}
                      </div>
                      <div
                        style={{
                          fontSize: pt(10),
                          fontStyle: "italic",
                          color: COMPANY_COLOR,
                        }}
                      >
                        {e.school}
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
          <div style={{ marginTop: "-4mm" }}>
            <EntryWrap>
              <div style={{ position: "relative" }}>
                <GhostChip>{certList.join(" · ")}</GhostChip>
                <p style={{ fontSize: pt(10), lineHeight: 1.5, margin: 0, color: BODY_COLOR }}>
                  {certList.join(" · ")}
                </p>
              </div>
            </EntryWrap>
          </div>
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
              certList.length === 0
            }
          >
            Skills
          </SectionTitle>
          <div style={{ marginTop: "-4mm" }}>
            <EntryWrap>
              <div style={{ position: "relative" }}>
                <GhostChip>{skillCore.join(" · ")}</GhostChip>
                <p style={{ fontSize: pt(10), lineHeight: 1.5, margin: 0, color: BODY_COLOR }}>
                  {skillCore.join(" · ")}
                </p>
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
              skillCore.length === 0
            }
          >
            Languages
          </SectionTitle>
          <div style={{ marginTop: "-4mm" }}>
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

// ─── PDF: Midnight Gold ─────────────────────────────────────────
export function pdfMidnightGold(doc, cv, W, M) {
  const pdfBottomY = PDF_CONTENT_BOTTOM_Y;
  const pdfTopY = PDF_NEW_PAGE_TOP_Y;
  const newPageOpts = {};

  const body = [75, 85, 99];
  const dark = [10, 10, 10];
  const accentRgb = [217, 119, 6];
  const dateC = [156, 163, 175];

  // Header background
  doc.setFillColor(10, 10, 10);
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
    doc.setTextColor(...accentRgb);
    doc.text(cv.title.toUpperCase(), M, y);
    y += 5;
  }

  // Gold bar
  doc.setFillColor(...accentRgb);
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
    doc.setTextColor(115, 115, 115);
    doc.text(contactParts.join("  ·  "), M, y);
  }

  y = 50;
  const rw = W - M - M;

  const mainSection = (title) => {
    y = pdfEnsureY(doc, y, 8, pdfBottomY, pdfTopY, newPageOpts);
    doc.setTextColor(...dark);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text(title.toUpperCase(), M, y);
    const titleWidth = doc.getTextWidth(title.toUpperCase());
    doc.setDrawColor(...accentRgb);
    doc.setLineWidth(0.5);
    doc.line(M + titleWidth + 3, y, M + rw, y);
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
      doc.setTextColor(...accentRgb);
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
      doc.setTextColor(...accentRgb);
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
