// =============================================================
// src/components/templates/UAEATSTemplate.jsx
//
// Template 19 - UAE ATS (single column, pure ATS).
//
// Single-column, black-on-white print template engineered for UAE / GCC
// and India job seekers and the ATS scanners they pass through. No
// sidebar, no decorative shapes, no skill bubbles, no progress bars,
// no emoji icons - text only. ATS scanners read this as a clean
// linear document. Recruiters scan visa / notice / license at the top.
//
// Design source: docs/research/transform-pipeline-rd.md sections 13
// (page-break rules), 14 (inline header), 15 (skills as text), 17
// (CSS variable design tokens), 18 (font hierarchy + RTL hooks),
// 19 (single-column structure), 21 (experience inline header),
// 22 (education inline header), 23 (n/a here - builder layout).
//
// Twin file: src/serverLib/uaeAtsTemplate19Html.js renders the same
// structure as an HTML string for Puppeteer PDF. Keep them visually
// identical when you change one.
//
// Default for transform output (TransformSuccessPage.jsx PDF_TEMPLATE_ID
// flips from 10 to 19 in this same Session 4 commit). Free tier so
// every transform user can re-render in the builder without paywall.
// =============================================================

import React from "react";
import { buildPersonalDetailsEntries } from "../../cvShared";
import { parseExperiencePoints } from "../../experiencePointsPreview";

const SECTION_TITLES = {
  summary: "Summary",
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  technicalSkills: "Technical Skills",
  languages: "Languages",
  certifications: "Certifications",
  projects: "Projects",
  publications: "Publications",
  volunteerWork: "Volunteer Work",
  references: "References",
};

// customFields entries arrive with their own .name string. These fall
// back when an entry is missing .name but has a known .id (research
// section 12 - regional fields rendered with stable labels).
const REGIONAL_LABEL_FALLBACK = {
  visa_status: "Visa Status",
  notice_period: "Notice Period",
  driving_license: "Driving License",
  nafis_registered: "Nafis Registered",
};

// --- Pure helpers (also used by the server HTML twin's logic shape) ---

function trimStr(v) {
  return typeof v === "string" ? v.trim() : "";
}

function buildContactRow(cv) {
  return [trimStr(cv.phone), trimStr(cv.email), trimStr(cv.linkedin), trimStr(cv.location)].filter(Boolean);
}

function buildStatusEntries(cv) {
  // Prefer customFields[] (research section 12 escape hatch). Fall back
  // to the legacy flat fields when customFields is empty so existing
  // CVs still get the visa / driving-license status row.
  const entries = [];
  if (Array.isArray(cv.customFields) && cv.customFields.length > 0) {
    for (const f of cv.customFields) {
      if (!f || typeof f !== "object") continue;
      const value = trimStr(f.value);
      if (!value) continue;
      const id = trimStr(f.id);
      const name = trimStr(f.name) || REGIONAL_LABEL_FALLBACK[id] || "";
      if (!name) continue;
      entries.push({ name, value });
    }
  }
  if (entries.length === 0) {
    for (const d of buildPersonalDetailsEntries(cv)) {
      entries.push({ name: d.label, value: d.value });
    }
    if (cv.availability) entries.push({ name: "Availability", value: trimStr(cv.availability) });
  }
  return entries;
}

function normalizeExperienceArray(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((e) => (e && typeof e === "object" ? e : null))
    .filter((e) => e && (trimStr(e.company) || trimStr(e.role) || trimStr(e.points)));
}

function normalizeEducationArray(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((e) => (e && typeof e === "object" ? e : null))
    .filter((e) => e && (trimStr(e.school) || trimStr(e.degree) || trimStr(e.fieldOfStudy)));
}

function normalizeCertificationsForRender(raw) {
  if (Array.isArray(raw)) {
    return raw
      .map((c) => {
        if (!c) return null;
        if (typeof c === "string") {
          const n = c.trim();
          return n ? { name: n, issuer: "", year: "" } : null;
        }
        if (typeof c === "object") {
          const name = trimStr(c.name);
          if (!name) return null;
          return { name, issuer: trimStr(c.issuer), year: trimStr(c.year) };
        }
        return null;
      })
      .filter(Boolean);
  }
  if (typeof raw === "string" && raw.trim()) {
    return raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name) => ({ name, issuer: "", year: "" }));
  }
  return [];
}

// --- Sub-components ---

function PageStyles() {
  // Typography hierarchy + page-break rules + status-row layout. Kept
  // inline so the component is self-contained when previewed in the
  // builder. The server HTML twin embeds the same rules in <head>.
  return (
    <style>{`
      .uae-ats-page {
        --page-body-font-family: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
        --page-body-font-size: 11;
        --page-body-line-height: 1.4;
        --page-heading-font-size: 14;
        --page-text-color: rgba(26,26,26,1);
        --page-primary-color: rgba(0,0,0,1);
        --page-background-color: rgba(255,255,255,1);
        --page-margin-x: 14pt;
        --page-margin-y: 12pt;
        --page-gap-y: 6pt;
        --page-section-gap: 9pt;

        font-family: var(--page-body-font-family);
        font-size: calc(var(--page-body-font-size) * 1pt);
        line-height: var(--page-body-line-height);
        color: var(--page-text-color);
        background: var(--page-background-color);
        padding: var(--page-margin-y) var(--page-margin-x);
        box-sizing: border-box;
      }
      .uae-ats-page * { box-sizing: border-box; }
      .uae-ats-page h1,
      .uae-ats-page h2,
      .uae-ats-page h3 {
        margin: 0;
        color: var(--page-primary-color);
        font-weight: 700;
      }
      .uae-ats-page h1 { font-size: calc(var(--page-heading-font-size) * 1.6pt); letter-spacing: 0.2pt; }
      .uae-ats-page h2 { font-size: calc(var(--page-heading-font-size) * 1.05pt); font-weight: 500; }
      .uae-ats-page h3 { font-size: calc(var(--page-heading-font-size) * 0.95pt); }
      .uae-ats-page p { margin: 0; }
      .uae-ats-page strong { font-weight: 700; }
      .uae-ats-page ul {
        margin: 3pt 0 0;
        padding: 0 0 0 14pt;
        list-style: disc outside;
      }
      .uae-ats-page li {
        margin: 1.5pt 0;
        line-height: var(--page-body-line-height);
        break-inside: avoid;
        page-break-inside: avoid;
      }

      /* Header block */
      .uae-ats-header-block {
        border-bottom: 1px solid var(--page-primary-color);
        padding-bottom: var(--page-gap-y);
        margin-bottom: var(--page-gap-y);
      }
      .uae-ats-target-title {
        font-size: calc(var(--page-heading-font-size) * 1pt);
        font-weight: 500;
        margin-top: 1pt;
      }
      .uae-ats-contact-row,
      .uae-ats-status-row {
        margin-top: 4pt;
        font-size: calc(var(--page-body-font-size) * 0.95pt);
      }
      .uae-ats-status-row { margin-top: 2pt; }
      .uae-ats-pipe {
        padding: 0 6pt;
        opacity: 0.55;
      }

      /* Sections - research section 13 (page-break) */
      .uae-ats-section { margin-top: var(--page-section-gap); }
      .uae-ats-section-heading {
        text-transform: uppercase;
        font-size: calc(var(--page-heading-font-size) * 0.92pt);
        font-weight: 700;
        letter-spacing: 0.6pt;
        border-bottom: 1px solid var(--page-primary-color);
        padding-bottom: 1.5pt;
        margin-bottom: 5pt;
        break-after: avoid;
        page-break-after: avoid;
      }
      .uae-ats-section-item {
        margin-bottom: 6pt;
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .uae-ats-section-item:last-child { margin-bottom: 0; }

      /* Inline header - research sections 14, 21, 22 */
      .uae-ats-inline-header {
        display: grid;
        grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) auto;
        gap: 0 12pt;
        align-items: baseline;
        margin-bottom: 1pt;
      }
      .uae-ats-inline-leading { font-weight: 700; }
      .uae-ats-inline-middle { font-weight: 500; }
      .uae-ats-inline-trailing {
        white-space: nowrap;
        font-variant-numeric: tabular-nums;
        text-align: right;
      }
      .uae-ats-meta-row {
        font-size: calc(var(--page-body-font-size) * 0.92pt);
        margin-top: 1pt;
        opacity: 0.85;
      }

      /* Skills matrix - research section 15 (no bubbles, no progress bars) */
      .uae-ats-skills-line { margin: 1pt 0; }

      /* RTL hook - research section 18 */
      .uae-ats-page p[dir="rtl"],
      .uae-ats-page li[dir="rtl"] {
        direction: rtl;
        word-wrap: break-word;
      }
    `}</style>
  );
}

function HeaderBlock({ cv }) {
  const name = trimStr(cv.name) || "Your Name";
  const title = trimStr(cv.title);
  const contactEntries = buildContactRow(cv);
  const statusEntries = buildStatusEntries(cv);

  return (
    <header className="uae-ats-header-block">
      <h1>{name}</h1>
      {title && <div className="uae-ats-target-title">{title}</div>}

      {contactEntries.length > 0 && (
        <div className="uae-ats-contact-row">
          {contactEntries.map((c, i) => (
            <React.Fragment key={`c-${i}`}>
              {i > 0 && <span className="uae-ats-pipe" aria-hidden="true">|</span>}
              <span>{c}</span>
            </React.Fragment>
          ))}
        </div>
      )}

      {statusEntries.length > 0 && (
        <div className="uae-ats-status-row">
          {statusEntries.map((s, i) => (
            <React.Fragment key={`s-${i}`}>
              {i > 0 && <span className="uae-ats-pipe" aria-hidden="true">|</span>}
              <span>
                <strong>{s.name}:</strong> {s.value}
              </span>
            </React.Fragment>
          ))}
        </div>
      )}
    </header>
  );
}

function ExperienceItem({ item }) {
  const role = trimStr(item.role);
  const company = trimStr(item.company);
  const location = trimStr(item.location);
  const period = trimStr(item.period);
  const points = trimStr(item.points);
  const parsed = points ? parseExperiencePoints(points) : { bullets: [], format: "list" };
  const bullets = parsed.bullets;
  const bulletFormat = parsed.format;
  const leading = location ? `${role || ""} (${location})`.trim() : role;

  return (
    <div className="uae-ats-section-item">
      <div className="uae-ats-inline-header">
        <span className="uae-ats-inline-leading">{leading}</span>
        <span className="uae-ats-inline-middle">{company}</span>
        <span className="uae-ats-inline-trailing">{period}</span>
      </div>
      {bullets.length > 0 && (
        bulletFormat === "list" ? (
          <ul>
            {bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        ) : (
          <p>{bullets[0]}</p>
        )
      )}
    </div>
  );
}

function EducationItem({ item }) {
  const degree = trimStr(item.degree);
  const fieldOfStudy = trimStr(item.fieldOfStudy);
  const school = trimStr(item.school);
  const location = trimStr(item.location);
  const year = trimStr(item.year);
  const degreeAndField = [degree, fieldOfStudy].filter(Boolean).join(", ");
  const schoolAndLocation = [school, location].filter(Boolean).join(", ");
  const leading = degreeAndField || school;
  const middle = degreeAndField ? schoolAndLocation : location;

  return (
    <div className="uae-ats-section-item">
      <div className="uae-ats-inline-header">
        <span className="uae-ats-inline-leading">{leading}</span>
        <span className="uae-ats-inline-middle">{middle}</span>
        <span className="uae-ats-inline-trailing">{year}</span>
      </div>
    </div>
  );
}

function CertificationItem({ item }) {
  const parts = [item.name, item.issuer, item.year].filter(Boolean);
  return <li>{parts.join(" - ")}</li>;
}

function MultilineText({ text }) {
  // For projects / publications / volunteerWork - render newline-separated
  // text as paragraphs. Each paragraph is its own section item so a long
  // entry never gets cut mid-paragraph by a page break.
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;
  return (
    <>
      {lines.map((line, i) => (
        <p key={i} className="uae-ats-section-item">
          {line.replace(/^[-*•]\s+/, "")}
        </p>
      ))}
    </>
  );
}

function TechnicalSkillsBlock({ raw }) {
  // Convention from cvShared / Reactive Resume notes: pipe-separated
  // categorised list, e.g. "Frontend: React, Vue | Backend: Node, Python".
  const lines = String(raw || "")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;
  return (
    <div className="uae-ats-section-item">
      {lines.map((line, i) => (
        <p key={i} className="uae-ats-skills-line">
          {line}
        </p>
      ))}
    </div>
  );
}

// --- Main component ---

function UAEATSTemplateInner({ cv }) {
  const safe = cv && typeof cv === "object" ? cv : {};

  const summary = trimStr(safe.summary);
  const experience = normalizeExperienceArray(safe.experience);
  const education = normalizeEducationArray(safe.education);
  const skills = trimStr(safe.skills);
  const technicalSkills = trimStr(safe.technicalSkills);
  const languages = trimStr(safe.languages);
  const certifications = normalizeCertificationsForRender(safe.certifications);
  const projects = trimStr(safe.projects);
  const publications = trimStr(safe.publications);
  const volunteerWork = trimStr(safe.volunteerWork);
  const references = trimStr(safe.references);

  return (
    <div className="uae-ats-page">
      <PageStyles />
      <HeaderBlock cv={safe} />

      {summary && (
        <section className="uae-ats-section">
          <h3 className="uae-ats-section-heading">{SECTION_TITLES.summary}</h3>
          <p className="uae-ats-section-item">{summary}</p>
        </section>
      )}

      {experience.length > 0 && (
        <section className="uae-ats-section">
          <h3 className="uae-ats-section-heading">{SECTION_TITLES.experience}</h3>
          {experience.map((exp, i) => (
            <ExperienceItem key={i} item={exp} />
          ))}
        </section>
      )}

      {education.length > 0 && (
        <section className="uae-ats-section">
          <h3 className="uae-ats-section-heading">{SECTION_TITLES.education}</h3>
          {education.map((edu, i) => (
            <EducationItem key={i} item={edu} />
          ))}
        </section>
      )}

      {skills && (
        <section className="uae-ats-section">
          <h3 className="uae-ats-section-heading">{SECTION_TITLES.skills}</h3>
          <p className="uae-ats-section-item">{skills}</p>
        </section>
      )}

      {technicalSkills && (
        <section className="uae-ats-section">
          <h3 className="uae-ats-section-heading">{SECTION_TITLES.technicalSkills}</h3>
          <TechnicalSkillsBlock raw={technicalSkills} />
        </section>
      )}

      {languages && (
        <section className="uae-ats-section">
          <h3 className="uae-ats-section-heading">{SECTION_TITLES.languages}</h3>
          <p className="uae-ats-section-item">{languages}</p>
        </section>
      )}

      {certifications.length > 0 && (
        <section className="uae-ats-section">
          <h3 className="uae-ats-section-heading">{SECTION_TITLES.certifications}</h3>
          <ul className="uae-ats-section-item">
            {certifications.map((c, i) => (
              <CertificationItem key={i} item={c} />
            ))}
          </ul>
        </section>
      )}

      {projects && (
        <section className="uae-ats-section">
          <h3 className="uae-ats-section-heading">{SECTION_TITLES.projects}</h3>
          <MultilineText text={projects} />
        </section>
      )}

      {publications && (
        <section className="uae-ats-section">
          <h3 className="uae-ats-section-heading">{SECTION_TITLES.publications}</h3>
          <MultilineText text={publications} />
        </section>
      )}

      {volunteerWork && (
        <section className="uae-ats-section">
          <h3 className="uae-ats-section-heading">{SECTION_TITLES.volunteerWork}</h3>
          <MultilineText text={volunteerWork} />
        </section>
      )}

      {references && (
        <section className="uae-ats-section">
          <h3 className="uae-ats-section-heading">{SECTION_TITLES.references}</h3>
          <p className="uae-ats-section-item">{references}</p>
        </section>
      )}
    </div>
  );
}

export function PreviewUAEATS({ cv }) {
  return <UAEATSTemplateInner cv={cv} />;
}

export default PreviewUAEATS;
