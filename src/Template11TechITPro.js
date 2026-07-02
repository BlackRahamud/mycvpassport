// ─────────────────────────────────────────────────────────────────
//  TEMPLATE 11 — Tech & IT Pro
//  Single-column bordered timeline (no sidebar grid). Preview + PDF HTML
//  align on timeline + typography; jsPDF path unchanged below.
// ─────────────────────────────────────────────────────────────────

import { renderPdfExperiencePoints } from "./experiencePointsPdf";
import { parseExperiencePoints } from "./experiencePointsPreview";
import {
  PDF_CONTENT_BOTTOM_Y,
  PDF_NEW_PAGE_TOP_Y,
  drawNewPage,
  pdfEnsureY,
  pdfDrawWrappedText,
  pdfSplitText,
} from "./pdfA4Layout";

// ─── T11-local ghost chip (Round 2 fix) ─────────────────────────────────────
// The shared GhostChip uses position: absolute + scale(0.01) to keep ATS
// keywords invisible. In T11, that triggered a Chromium PDF-print quirk: any
// content inside a `position: relative` parent (which is required to anchor
// the absolutely-positioned ghost chip) was emitted at the END of the page's
// text stream — section titles → bullets → body text → entry headers — even
// though the visual layout was correct. ATS readers parsing in stream order
// saw orphaned bullets followed by a header at the end, destroying the
// role↔company association.
//
// T11GhostChip stays in normal flow as an inline-block sized 0x0, so it
// requires no positioned parent and does not create a stacking context.
// Same ATS payload, no stream-order side effect.
//
// IMPORTANT: do NOT use overflow: hidden here. Chromium's PDF print pipeline
// drops clipped text from the content stream, which would silently delete
// the ATS keyword payload. Instead, the element is sized 0x0 with the text
// content rendered (invisibly via color: transparent + scale(0.01)) outside
// the box. The text remains in the PDF stream for ATS readers and the user
// sees nothing.
//
// T11-local on purpose: other templates still use the shared GhostChip and
// haven't shown this stream-order bug in production.
const T11GhostChip = ({ children }) => (
  <span
    aria-hidden="true"
    style={{
      display: "inline-block",
      width: 0,
      height: 0,
      fontSize: "12px",
      color: "transparent",
      transform: "scale(0.01)",
      transformOrigin: "top left",
      pointerEvents: "none",
      whiteSpace: "nowrap",
      verticalAlign: "top",
    }}
  >
    {children}
  </span>
);

const NAVY = "#1E2D45";
const ACCENT = "#4A90D9";
const BODY = "#475569";
const DATE = "#94A3B8";
const BG = "#FFFFFF";

const FONT =
  'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

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
  return String(raw)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Structured categories + chips, or legacy pipe-separated / plain string. */
function technicalSkillsGroupsForTemplate(cv) {
  const ts = cv?.technicalSkills;
  if (Array.isArray(ts) && ts.length > 0) {
    const first = ts[0];
    if (first != null && typeof first === "object" && !Array.isArray(first) && ("chips" in first || "category" in first)) {
      return ts
        .map((g) => ({
          category: String(g?.category ?? "").trim(),
          chips: Array.isArray(g?.chips) ? g.chips.map((c) => String(c).trim()).filter(Boolean) : [],
        }))
        .filter((g) => g.chips.length > 0);
    }
  }
  const s = typeof ts === "string" ? ts.trim() : String(ts || "").trim();
  if (!s) return [];
  return [{ category: "Technical Skills", chips: s.split("|").map((x) => x.trim()).filter(Boolean) }];
}

export function PreviewTechITPro({ cv, mobileMode = false }) {
  const s = mobileMode ? 0.8 : 1;
  const pt = (n) => `${n * s}pt`;

  const skillCore = cv.skills
    ? cv.skills.split(",").map((x) => x.trim()).filter(Boolean)
    : [];
  const technicalSkillsGroups = technicalSkillsGroupsForTemplate(cv);
  const certList = certificationLines(cv);
  const langList = cv.languages
    ? cv.languages.split(",").map((l) => l.trim()).filter(Boolean)
    : [];
  const linkedIn =
    cv.linkedin || cv.linkedIn || cv.linkedInUrl || cv.linkedinUrl || "";

  // dataBlock is opt-in. For T11 experience entries we pass "job" so the
  // server-side smart-pagination pass in api/generate-pdf.js can find the
  // atomic entry and insert an explicit .cvp-page-break before any entry
  // that would straddle a page boundary. This prevents the Chromium
  // text-stream reorder bug (Round 2): when an element with break-inside:
  // avoid is "deferred" to the next page, Chromium emits subsequent
  // siblings' text-stream operators first and the deferred element's
  // operators last, scrambling the PDF text stream even though the
  // visual layout is correct. Inserting a clean .cvp-page-break before
  // the straddling entry sidesteps the deferral entirely.
  const EntryWrap = ({ children, dataBlock }) => (
    <div style={{ display: "block" }}>
      <div
        data-block={dataBlock}
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
        fontSize: pt(14),
        fontWeight: 700,
        color: NAVY,
        textTransform: "uppercase",
        letterSpacing: "0.04em",
        fontFamily: FONT,
        marginTop: first ? 0 : "8mm",
        marginBottom: "8mm",
        paddingBottom: "2px",
        borderBottom: `2px solid ${ACCENT}`,
        breakAfter: "avoid",
        pageBreakAfter: "avoid",
        WebkitColumnBreakAfter: "avoid",
      }}
    >
      {children}
    </div>
  );

  const contactBits = [];
  if (cv.email) contactBits.push({ label: cv.email, href: `mailto:${cv.email}` });
  if (cv.phone) contactBits.push({ label: cv.phone, href: `tel:${cv.phone.replace(/\s/g, "")}` });
  if (cv.location) contactBits.push({ label: cv.location, href: null });
  if (linkedIn) {
    const url = /^https?:\/\//i.test(linkedIn) ? linkedIn : `https://${linkedIn}`;
    contactBits.push({ label: "LinkedIn", href: url });
  }

  // Mirrors the serverLib twin (techITProTemplate11Html.js "Personal Info"):
  // values only, no labels, one per line with an accent chevron, in the same
  // field order. drivingLicense intentionally excluded — the twin keeps it in
  // its "Additional" section, not here.
  const personalInfo = [cv.nationality, cv.visaStatus, cv.dob, cv.gender, cv.maritalStatus]
    .map((v) => (v == null ? "" : String(v).trim()))
    .filter(Boolean);

  const hasAnySkillsBlock = skillCore.length > 0 || technicalSkillsGroups.length > 0;
  const projectsText = (cv.projects && String(cv.projects).trim()) || "";
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
        backgroundImage: mobileMode
          ? "none"
          : "linear-gradient(to right, #4A90D9 2px, transparent 2px)",
        backgroundSize: mobileMode ? "0%" : "100% 100%",
        backgroundPosition: "20mm 0",
        backgroundRepeat: "no-repeat",
        paddingLeft: mobileMode ? "15mm" : "30mm",
        paddingRight: "15mm",
        paddingTop: "15mm",
        paddingBottom: "15mm",
        WebkitPrintColorAdjust: "exact",
        printColorAdjust: "exact",
        boxSizing: "border-box",
        fontFamily: FONT,
        color: BODY,
        overflow: "visible",
        textRendering: "optimizeLegibility",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {/* Header */}
      <header style={{ marginBottom: "8mm" }}>
        <h1
          style={{
            fontSize: pt(24),
            fontWeight: 800,
            color: NAVY,
            margin: 0,
            lineHeight: 1.15,
            fontFamily: FONT,
          }}
        >
          {cv.name || "Your Name"}
        </h1>
        <p
          style={{
            fontSize: pt(12),
            fontWeight: 600,
            color: ACCENT,
            margin: "4px 0 10px",
            lineHeight: 1.4,
            fontFamily: FONT,
          }}
        >
          {cv.title || "IT Professional"}
        </p>
        {contactBits.length > 0 && (
          <div
            style={{
              fontSize: pt(10),
              lineHeight: 1.5,
              display: "flex",
              flexWrap: "wrap",
              gap: "6px 12px",
              alignItems: "center",
            }}
          >
            {contactBits.map((c, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                {i > 0 && (
                  <span style={{ color: DATE, userSelect: "none" }} aria-hidden>
                    ·
                  </span>
                )}
                {c.href ? (
                  <a
                    href={c.href}
                    style={{ color: ACCENT, textDecoration: "none" }}
                    target={c.href.startsWith("http") ? "_blank" : undefined}
                    rel={c.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  >
                    {c.label}
                  </a>
                ) : (
                  <span style={{ color: BODY }}>{c.label}</span>
                )}
              </span>
            ))}
          </div>
        )}
        {personalInfo.length > 0 && (
          <div style={{ marginTop: "6px", fontSize: pt(10), lineHeight: 1.5 }}>
            {personalInfo.map((v, i) => (
              <div
                key={i}
                style={{ display: "flex", alignItems: "baseline", gap: "6px" }}
              >
                <span style={{ color: ACCENT }} aria-hidden>
                  ›
                </span>
                <span style={{ color: BODY }}>{v}</span>
              </div>
            ))}
          </div>
        )}
      </header>

      {/* Professional Summary */}
      {cv.summary && (
        <section data-section="summary">
          <SectionTitle first>Professional Summary</SectionTitle>
          <div>
            <T11GhostChip>{cv.summary}</T11GhostChip>
            <p
              style={{
                fontSize: pt(10),
                lineHeight: 1.5,
                color: BODY,
                margin: 0,
                marginTop: "-4mm",
                marginBottom: 0,
              }}
            >
              {cv.summary}
            </p>
          </div>
        </section>
      )}

      {/* Skills */}
      {skillCore.length > 0 && (
        <section data-section="competencies">
          <SectionTitle first={!cv.summary}>Skills</SectionTitle>
          <div style={{ marginTop: "-4mm" }}>
            <EntryWrap>
              <div>
                <T11GhostChip>{skillCore.join(" · ")}</T11GhostChip>
                <p style={{ fontSize: pt(10), lineHeight: 1.5, margin: 0, color: BODY }}>
                  {skillCore.join(" · ")}
                </p>
              </div>
            </EntryWrap>
          </div>
        </section>
      )}

      {/* Technical Skills */}
      {technicalSkillsGroups.length > 0 && (
        <section data-section="competencies">
          <SectionTitle first={!cv.summary && skillCore.length === 0}>Technical Skills</SectionTitle>
          <div style={{ marginTop: "-4mm" }}>
            <div className="t11-technical-skills-body">
              {technicalSkillsGroups.map((group, i) => (
                <p
                  key={i}
                  style={{
                    margin: "2px 0",
                    fontSize: "9pt",
                    color: "#333",
                    lineHeight: "1.4",
                  }}
                >
                  <strong>{group.category ? `${group.category}:` : "Technical Skills:"}</strong>{" "}
                  {group.chips.join(", ")}
                </p>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Professional Experience */}
      {experience.some((e) => e.company) && (
        <section data-section="experience">
          <SectionTitle
            first={!cv.summary && !hasAnySkillsBlock}
          >
            Professional Experience
          </SectionTitle>
          <div style={{ marginTop: "-4mm" }}>
            {experience
              .filter((e) => e.company)
              .map((e, i) => (
                <EntryWrap key={i} dataBlock="job">
                  <div>
                    <T11GhostChip>
                      {e.role} at {e.company} {e.period}
                    </T11GhostChip>
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
                          color: NAVY,
                        }}
                      >
                        {e.role}
                      </span>
                      <span
                        style={{
                          fontSize: pt(10),
                          color: DATE,
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
                        color: BODY,
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
                      <div className="cvp-preview-exp-t11-wrap">
                        {bullets.map((line, j) => (
                          <div
                            key={j}
                            className="cvp-preview-exp-t11-line"
                            style={{
                              display: "block",
                              marginBottom: "4px",
                              paddingLeft: format === "list" ? 12 : 0,
                              textIndent: format === "list" ? -12 : 0,
                              lineHeight: 1.5,
                              fontSize: pt(10),
                              color: BODY,
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

      {/* Projects */}
      {projectsText && (
        <section>
          <SectionTitle
            first={
              !cv.summary &&
              !hasAnySkillsBlock &&
              !experience.some((e) => e.company)
            }
          >
            Projects
          </SectionTitle>
          <div style={{ marginTop: "-4mm" }}>
            <EntryWrap>
              {projectsText.split(/\n\n+/).map((para, pi) => (
                <p
                  key={pi}
                  style={{
                    fontSize: pt(10),
                    lineHeight: 1.5,
                    color: BODY,
                    margin: pi ? "4mm 0 0" : 0,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {para.trim()}
                </p>
              ))}
            </EntryWrap>
          </div>
        </section>
      )}

      {/* Education */}
      {education.some((e) => e.school) && (
        <section data-section="education">
          <SectionTitle
            first={
              !cv.summary &&
              !hasAnySkillsBlock &&
              !experience.some((e) => e.company) &&
              !projectsText
            }
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
                          color: NAVY,
                        }}
                      >
                        {e.degree}
                      </div>
                      <div
                        style={{
                          fontSize: pt(10),
                          fontStyle: "italic",
                          color: BODY,
                        }}
                      >
                        {e.school}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: pt(10),
                        color: DATE,
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
              !hasAnySkillsBlock &&
              !experience.some((e) => e.company) &&
              !projectsText &&
              !education.some((e) => e.school)
            }
          >
            Certifications
          </SectionTitle>
          <div style={{ marginTop: "-4mm" }}>
            {certList.map((c, i) => (
              <EntryWrap key={i}>
                <p style={{ fontSize: pt(10), lineHeight: 1.5, margin: 0, color: BODY }}>
                  {c}
                </p>
              </EntryWrap>
            ))}
          </div>
        </section>
      )}

      {/* Languages */}
      {langList.length > 0 && (
        <section data-section="languages">
          <SectionTitle
            first={
              !cv.summary &&
              !hasAnySkillsBlock &&
              !experience.some((e) => e.company) &&
              !projectsText &&
              !education.some((e) => e.school) &&
              certList.length === 0
            }
          >
            Languages
          </SectionTitle>
          <div style={{ marginTop: "-4mm" }}>
            <EntryWrap>
              <p style={{ fontSize: pt(10), lineHeight: 1.5, margin: 0, color: BODY }}>
                {langList.join(" · ")}
              </p>
            </EntryWrap>
          </div>
        </section>
      )}
    </div>
  );
}

// ─── PDF: Tech & IT Pro ───────────────────────────────────────────
export function pdfTechITPro(doc, cv, W, M) {
  const pdfBottomY = PDF_CONTENT_BOTTOM_Y;
  const pdfTopY = PDF_NEW_PAGE_TOP_Y;
  const slate  = [30,  45,  69];
  const accent = [74,  144, 217];
  const dark   = [26,  26,  46];
  const mid    = [61,  61,  92];
  const subtle = [122, 122, 154];
 // const white  = [255, 255, 255];

  const [sr, sg, sb] = slate;
  const [ar, ag, ab] = accent;

  const sideW = 65;
  const newPageOpts = {
    sidebarWidth: sideW,
    sidebarColor: [sr, sg, sb],
    accentColor: [ar, ag, ab],
  };
  /** Sidebar: text from x=6 to column edge at sideW-5 */
  const sideTextW = sideW - 6 - 5;
  /** Bullet lines with body text starting at x=11 */
  const sideSkillW = sideW - 5 - 11;

  const redrawSidebar = () => {
    doc.setFillColor(sr, sg, sb);
    doc.rect(0, 0, sideW, 297, "F");
    doc.setFillColor(ar, ag, ab);
    doc.rect(0, 0, sideW, 3, "F");
  };
  redrawSidebar();

  const ensureSy = (sy, lh) => {
    if (sy + lh > pdfBottomY) {
      drawNewPage(doc, newPageOpts);
      return pdfTopY;
    }
    return sy;
  };
  const drawSideWrapped = (lines, x, sy, lh) => {
    let yy = sy;
    lines.forEach((line) => {
      yy = ensureSy(yy, lh);
      doc.text(line, x, yy);
      yy += lh;
    });
    return yy;
  };

  // Name
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFont("helvetica", "normal");
  const nameLines = pdfSplitText(doc, cv.name || "Your Name", sideTextW, 13);
  doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold");
  let sy = drawSideWrapped(nameLines, 6, 12, 5.5);

  // Accent underline
  doc.setFillColor(ar, ag, ab);
  doc.rect(6, sy + 2, 22, 2, "F");

  // Title
  doc.setTextColor(ar, ag, ab);
  doc.setFont("helvetica", "normal");
  const titleLines = pdfSplitText(doc, cv.title || "IT Professional", sideTextW, 7.5);
  doc.setTextColor(ar, ag, ab); doc.setFont("helvetica", "normal");
  sy = drawSideWrapped(titleLines, 6, sy + 6, 4.5);

  sy += 10;

  const sideSection = (label) => {
    sy = ensureSy(sy, 4);
    doc.setTextColor(ar, ag, ab);
    doc.setFontSize(6.5); doc.setFont("helvetica", "bold");
    doc.text(label.toUpperCase(), 6, sy);
    sy += 1.5;
    doc.setDrawColor(ar, ag, ab); doc.setLineWidth(0.2);
    doc.line(6, sy, sideW - 5, sy);
    sy += 4;
    doc.setTextColor(180, 190, 200);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5);
  };

  sideSection("Contact");
  if (cv.email) { doc.setFont("helvetica", "normal"); const l = pdfSplitText(doc, cv.email, sideTextW, 7.5); sy = drawSideWrapped(l, 6, sy, 3.5); sy += 2; }
  if (cv.phone) { sy = ensureSy(sy, 5); doc.text(cv.phone, 6, sy); sy += 5; }
  if (cv.location) { sy = ensureSy(sy, 6); doc.text(cv.location, 6, sy); sy += 6; }

  if (cv.nationality || cv.visaStatus || cv.dob || cv.gender || cv.maritalStatus) {
    sideSection("Personal Info");
    const fields = [cv.nationality, cv.visaStatus, cv.dob, cv.gender, cv.maritalStatus].filter(Boolean);
    fields.forEach(f => {
      sy = ensureSy(sy, 4.5);
      doc.setTextColor(ar, ag, ab); doc.text("›", 6, sy);
      doc.setTextColor(180, 190, 200); doc.text(f, 10, sy);
      sy += 4.5;
    });
    sy += 2;
  }

  if (cv.skills) {
    sideSection("Skills");
    cv.skills.split(",").forEach(s => {
      if (!s.trim()) return;
      sy = ensureSy(sy, 5);
      doc.setFillColor(ar, ag, ab);
      doc.circle(7.5, sy - 1, 1.2, "F");
      doc.setTextColor(207, 216, 220); doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      const sl = pdfSplitText(doc, s.trim(), sideSkillW, 7.5);
      sy = drawSideWrapped(sl, 11, sy, 3.5); sy += 1.5;
    });
    sy += 2;
  }

  {
    const pdfTechGroups = technicalSkillsGroupsForTemplate(cv);
    if (pdfTechGroups.length > 0) {
      sideSection("Technical Skills");
      pdfTechGroups.forEach((g) => {
        const head = g.category ? `${g.category}: ` : "Technical Skills: ";
        const line = `${head}${g.chips.join(", ")}`;
        sy = ensureSy(sy, 5);
        doc.setTextColor(ar, ag, ab); doc.text("—", 6, sy);
        doc.setTextColor(176, 190, 197);
        doc.setFont("helvetica", "normal");
        const sl = pdfSplitText(doc, line, sideSkillW, 7.5);
        sy = drawSideWrapped(sl, 11, sy, 3.5); sy += 1.5;
      });
      sy += 2;
    }
  }

  if (cv.languages) {
    sideSection("Languages");
    cv.languages.split(",").forEach(l => {
      sy = ensureSy(sy, 4.5);
      doc.setTextColor(ar, ag, ab); doc.text("›", 6, sy);
      doc.setTextColor(176, 190, 197); doc.text(l.trim(), 10, sy);
      sy += 4.5;
    });
    sy += 2;
  }

  if (cv.certifications) {
    sideSection("Certifications");
    cv.certifications.split(",").forEach(c => {
      if (!c.trim()) return;
      sy = ensureSy(sy, 5);
      doc.setTextColor(ar, ag, ab); doc.text("✦", 6, sy);
      doc.setTextColor(176, 190, 197);
      doc.setFont("helvetica", "normal");
      const sl = pdfSplitText(doc, c.trim(), sideSkillW, 7.5);
      sy = drawSideWrapped(sl, 11, sy, 3.5); sy += 2;
    });
    sy += 2;
  }

  if (cv.availability || cv.drivingLicense || cv.willingToRelocate) {
    sideSection("Additional");
    if (cv.availability)      { sy = ensureSy(sy, 4.5); doc.setTextColor(ar,ag,ab); doc.text("›",6,sy); doc.setTextColor(176,190,197); doc.text(cv.availability,10,sy); sy+=4.5; }
    if (cv.drivingLicense)    { sy = ensureSy(sy, 4.5); doc.setTextColor(ar,ag,ab); doc.text("›",6,sy); doc.setTextColor(176,190,197); doc.text(cv.drivingLicense,10,sy); sy+=4.5; }
    if (cv.willingToRelocate) { sy = ensureSy(sy, 4.5); doc.setTextColor(ar,ag,ab); doc.text("›",6,sy); doc.setTextColor(176,190,197); doc.text("Relocate: "+cv.willingToRelocate,10,sy); sy+=4.5; }
  }

  // Right panel
  let y = 10;
  const rx = sideW + 8;
  const rw = W - M - rx;

  const mainSection = (title) => {
    y = pdfEnsureY(doc, y, 8, pdfBottomY, pdfTopY, newPageOpts);
    doc.setTextColor(sr, sg, sb);
    doc.setFontSize(8); doc.setFont("helvetica", "bold");
    doc.text(title.toUpperCase(), rx, y);
    y += 1.5;
    doc.setDrawColor(ar, ag, ab); doc.setLineWidth(0.8);
    doc.line(rx, y, rx + rw, y);
    y += 6;
    doc.setFont("helvetica", "normal"); doc.setTextColor(...mid);
  };

  if (cv.summary) {
    mainSection("Professional Summary");
    doc.setFontSize(8.5); doc.setFont("helvetica", "normal"); doc.setTextColor(...mid);
    doc.setFont("helvetica", "normal");
    y = pdfDrawWrappedText(doc, cv.summary, rw, 8.5, rx, y, 4.5, pdfBottomY, pdfTopY, undefined, newPageOpts);
    y += 8;
  }

  if (cv.experience.some(e => e.company)) {
    mainSection("Professional Experience");
    cv.experience.filter(e => e.company).forEach(e => {
      y = pdfEnsureY(doc, y, 5, pdfBottomY, pdfTopY, newPageOpts);
      // Title
      doc.setFont("helvetica", "bold"); doc.setFontSize(10);
      doc.setTextColor(...dark);
      doc.text(e.role || "", rx, y);
      y += 5;

      // Company — plain body colour (no accent/link styling)
      y = pdfEnsureY(doc, y, 5, pdfBottomY, pdfTopY, newPageOpts);
      doc.setFont("helvetica", "italic"); doc.setFontSize(8.5);
      doc.setTextColor(...mid);
      const compStr = (e.company || "") + (e.location ? ` — ${e.location}` : "");
      doc.text(compStr, rx, y);
      y += 5;

      // Period — plain text, right-aligned (no pill)
      y = pdfEnsureY(doc, y, 5, pdfBottomY, pdfTopY, newPageOpts);
      doc.setFont("helvetica", "normal"); doc.setFontSize(7);
      doc.setTextColor(136, 136, 136);
      doc.text(e.period || "", W - M, y, { align: "right" });
      y += 5;

      // Points
      if (e.points) {
        doc.setFont("helvetica", "normal"); doc.setFontSize(8);
        doc.setTextColor(...mid);
        y = renderPdfExperiencePoints(doc, e.points, rx, y, rw, 4, pdfBottomY, pdfTopY, 8) + 2;
      }
      y += 5;
    });
  }

  if (cv.education.some(e => e.school)) {
    mainSection("Education");
    cv.education.filter(e => e.school).forEach(e => {
      y = pdfEnsureY(doc, y, 5, pdfBottomY, pdfTopY, newPageOpts);
      doc.setFont("helvetica", "bold"); doc.setFontSize(10);
      doc.setTextColor(...dark);
      doc.text(e.degree || "", rx, y);
      doc.setFont("helvetica", "bold"); doc.setFontSize(7.5);
      doc.setTextColor(ar, ag, ab);
      doc.text(e.year || "", W - M, y, { align: "right" });
      y += 4.5;
      y = pdfEnsureY(doc, y, 5, pdfBottomY, pdfTopY, newPageOpts);
      doc.setFont("helvetica", "italic"); doc.setFontSize(8.5);
      doc.setTextColor(...subtle);
      doc.text(e.school || "", rx, y); y += 9;
    });
  }

  if (cv.references) {
    y = pdfEnsureY(doc, y, 8, pdfBottomY, pdfTopY, newPageOpts);
    doc.setDrawColor(ar, ag, ab); doc.setLineWidth(0.2);
    doc.line(rx, y, rx + rw, y); y += 5;
    y = pdfEnsureY(doc, y, 5, pdfBottomY, pdfTopY, newPageOpts);
    doc.setFont("helvetica", "italic"); doc.setFontSize(8);
    doc.setTextColor(...subtle);
    doc.text(cv.references, rx, y);
  }
}