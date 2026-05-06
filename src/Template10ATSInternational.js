// =============================================================
// src/Template10ATSInternational.js
//
// Template 10 - ATS International (redesign 2026-05-03).
// React preview component for the builder.
//
// Twin file: src/serverLib/atsInternationalTemplate10Html.js renders
// the same shape server-side for Puppeteer PDF. Keep them visually
// consistent.
//
// Replaces the prior decorative version (cyan header bar, decorative
// circles, hardcoded "Key Achievements / Courses / Interests" filler)
// with a clean two-column white surface, sky-blue accents, strict
// null-guarded sections, and customFields[]-aware status row.
//
// Exports:
//   - PreviewATSInternational  (consumed by ResumePreview.jsx)
//   - PreviewSaaSModern        (alias preserved for legacy imports)
// =============================================================

import React from "react";
import { parseExperiencePoints } from "./experiencePointsPreview";

const COLORS = {
  ACCENT_SKY:    "#0EA5E9",   // sky-500 - top bar, dot bullets, separators
  HEADING_SKY:   "#0284C7",   // sky-600 - section titles, role, company
  INK:           "#0F172A",   // slate-900 - name, exp-role, edu-degree
  BODY:          "#334155",   // slate-700 - bullet/body text
  MUTED:         "#64748B",   // slate-500 - meta dates, contact
  MUTED_LIGHT:   "#94A3B8",   // slate-400 - contact pipes
  HAIRLINE:      "#E2E8F0",   // slate-200 - section title underline + dividers
};

const FONT_STACK = "Helvetica, Arial, sans-serif";

function readCustomField(cv, ids, fallbackFlatField) {
  if (cv && Array.isArray(cv.customFields)) {
    for (const f of cv.customFields) {
      if (!f || typeof f !== "object") continue;
      const id = String(f.id || "").trim();
      const value = String(f.value || "").trim();
      if (ids.includes(id) && value) return value;
    }
  }
  if (fallbackFlatField && cv && cv[fallbackFlatField]) {
    return String(cv[fallbackFlatField]).trim();
  }
  return "";
}

function technicalSkillsGroupsForTemplate(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .filter((g) => g && Array.isArray(g.chips) && g.chips.length > 0)
      .map((g) => ({
        category: String(g.category || "").trim(),
        chips: g.chips.map((c) => String(c).trim()).filter(Boolean),
      }));
  }
  return String(raw)
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((line) => {
      const colonIdx = line.indexOf(":");
      if (colonIdx === -1) return { category: "", chips: [line] };
      const category = line.slice(0, colonIdx).trim();
      const chips = line
        .slice(colonIdx + 1)
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
      return { category, chips };
    })
    .filter((g) => g.category || g.chips.length > 0);
}

function trimStr(v) {
  return typeof v === "string" ? v.trim() : "";
}

function SectionTitle({ children }) {
  return (
    <h2
      style={{
        fontSize: "10.5px",
        fontWeight: 700,
        color: COLORS.HEADING_SKY,
        textTransform: "uppercase",
        letterSpacing: "0.14em",
        margin: "0 0 10px 0",
        paddingBottom: "6px",
        borderBottom: `1px solid ${COLORS.HAIRLINE}`,
        pageBreakAfter: "avoid",
        breakAfter: "avoid",
      }}
    >
      {children}
    </h2>
  );
}

function RowBetween({ left, right }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: "12px",
      }}
    >
      <div>{left}</div>
      {right ? (
        <div
          style={{
            color: COLORS.MUTED,
            fontSize: "11.5px",
            fontWeight: 500,
            whiteSpace: "nowrap",
          }}
        >
          {right}
        </div>
      ) : null}
    </div>
  );
}

function PipeRow({ items, color, sepColor, sepBold }) {
  return (
    <div
      style={{
        marginTop: "8px",
        fontSize: "11.5px",
        color,
        lineHeight: 1.5,
      }}
    >
      {items.map((it, i) => (
        <React.Fragment key={i}>
          {i > 0 && (
            <span
              style={{
                color: sepColor,
                margin: "0 10px",
                fontWeight: sepBold ? 700 : "normal",
              }}
            >
              |
            </span>
          )}
          <span>{it}</span>
        </React.Fragment>
      ))}
    </div>
  );
}

function Header({ cv }) {
  const name = trimStr(cv.name) || "Your Name";
  const role = trimStr(cv.title);
  const contactItems = [trimStr(cv.phone), trimStr(cv.email), trimStr(cv.linkedin), trimStr(cv.location)].filter(Boolean);

  const visa = readCustomField(cv, ["visa_status"], "visaStatus");
  const notice = readCustomField(cv, ["notice_period"], null);
  const license = readCustomField(cv, ["driving_license"], "drivingLicense");
  const statusItems = [];
  if (visa) statusItems.push(`Visa: ${visa}`);
  if (notice) statusItems.push(`Notice: ${notice}`);
  if (license) statusItems.push(`License: ${license}`);

  return (
    <header
      style={{
        padding: "32px 40px 22px 40px",
        borderBottom: `1px solid ${COLORS.HAIRLINE}`,
        background: "#FFFFFF",
      }}
    >
      <h1
        style={{
          fontSize: "30px",
          fontWeight: 700,
          color: COLORS.INK,
          margin: 0,
          letterSpacing: "0.02em",
          lineHeight: 1.1,
          textTransform: "uppercase",
        }}
      >
        {name}
      </h1>
      {role ? (
        <p
          style={{
            fontSize: "14px",
            color: COLORS.HEADING_SKY,
            margin: "6px 0 0 0",
            fontWeight: 500,
            letterSpacing: "0.02em",
          }}
        >
          {role}
        </p>
      ) : null}
      {contactItems.length > 0 && (
        <div
          style={{
            marginTop: "14px",
            fontSize: "11.5px",
            color: COLORS.MUTED,
            lineHeight: 1.5,
          }}
        >
          {contactItems.map((c, i) => (
            <React.Fragment key={i}>
              {i > 0 && (
                <span style={{ color: COLORS.MUTED_LIGHT, margin: "0 10px" }}>|</span>
              )}
              <span>{c}</span>
            </React.Fragment>
          ))}
        </div>
      )}
      {statusItems.length > 0 && (
        <PipeRow
          items={statusItems}
          color={COLORS.INK}
          sepColor={COLORS.ACCENT_SKY}
          sepBold
        />
      )}
    </header>
  );
}

function ExperienceItem({ exp }) {
  const role = trimStr(exp.role);
  const period = trimStr(exp.period);
  const companyParts = [trimStr(exp.company), trimStr(exp.location)].filter(Boolean).join(" · ");
  const parsed = trimStr(exp.points) ? parseExperiencePoints(exp.points) : { bullets: [], format: "list" };
  const bullets = parsed.bullets;
  const bulletFormat = parsed.format;

  return (
    <div
      style={{
        marginBottom: "18px",
        pageBreakInside: "avoid",
        breakInside: "avoid",
      }}
    >
      <RowBetween
        left={
          <div style={{ fontWeight: 700, color: COLORS.INK, fontSize: "13.5px" }}>
            {role}
          </div>
        }
        right={period}
      />
      {companyParts ? (
        <div
          style={{
            color: COLORS.HEADING_SKY,
            fontSize: "12px",
            fontWeight: 500,
            margin: "2px 0 8px 0",
          }}
        >
          {companyParts}
        </div>
      ) : null}
      {bullets.map((b, i) => (
        <div
          key={i}
          style={{
            fontSize: "12.5px",
            color: COLORS.BODY,
            marginBottom: "4px",
            display: "flex",
            lineHeight: 1.55,
            pageBreakInside: "avoid",
            breakInside: "avoid",
          }}
        >
          {bulletFormat === "list" && (
            <span
              style={{
                marginRight: "10px",
                color: COLORS.ACCENT_SKY,
                fontWeight: 700,
              }}
            >
              &middot;
            </span>
          )}
          <span>{b}</span>
        </div>
      ))}
    </div>
  );
}

function EducationItem({ edu }) {
  const degreeAndField = [trimStr(edu.degree), trimStr(edu.fieldOfStudy)].filter(Boolean).join(", ");
  const schoolAndLocation = [trimStr(edu.school), trimStr(edu.location)].filter(Boolean).join(" · ");
  const year = trimStr(edu.year);
  const leading = degreeAndField || trimStr(edu.school);
  const middle = degreeAndField ? schoolAndLocation : trimStr(edu.location);

  return (
    <div
      style={{
        marginBottom: "12px",
        pageBreakInside: "avoid",
        breakInside: "avoid",
      }}
    >
      <RowBetween
        left={
          <div style={{ fontWeight: 700, color: COLORS.INK, fontSize: "13px" }}>
            {leading}
          </div>
        }
        right={year}
      />
      {middle ? (
        <div
          style={{
            color: COLORS.HEADING_SKY,
            fontSize: "12px",
            fontWeight: 500,
            marginTop: "2px",
          }}
        >
          {middle}
        </div>
      ) : null}
    </div>
  );
}

function SkillList({ items }) {
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {items.map((s, i) => {
        const isLast = i === items.length - 1;
        return (
          <li
            key={i}
            style={{
              fontSize: "12.5px",
              color: COLORS.BODY,
              lineHeight: 1.5,
              padding: "4px 0",
              borderBottom: isLast ? "none" : `1px solid ${COLORS.HAIRLINE}`,
              pageBreakInside: "avoid",
              breakInside: "avoid",
            }}
          >
            {s}
          </li>
        );
      })}
    </ul>
  );
}

function MultilineSection({ title, raw }) {
  const lines = String(raw || "")
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (lines.length === 0) return null;
  return (
    <section style={{ marginBottom: "22px", pageBreakInside: "avoid", breakInside: "avoid" }}>
      <SectionTitle>{title}</SectionTitle>
      <div>
        {lines.map((line, i) => (
          <p
            key={i}
            style={{
              margin: "0 0 6px 0",
              fontSize: "12.5px",
              color: COLORS.BODY,
              lineHeight: 1.55,
              pageBreakInside: "avoid",
              breakInside: "avoid",
            }}
          >
            {line.replace(/^[-*•]\s+/, "")}
          </p>
        ))}
      </div>
    </section>
  );
}

export function PreviewSaaSModern({ cv }) {
  const safe = cv && typeof cv === "object" ? cv : {};

  const summary = trimStr(safe.summary);
  const experience = Array.isArray(safe.experience)
    ? safe.experience.filter(
        (e) => e && (trimStr(e.role) || trimStr(e.company) || trimStr(e.points)),
      )
    : [];
  const education = Array.isArray(safe.education)
    ? safe.education.filter(
        (e) => e && (trimStr(e.school) || trimStr(e.degree) || trimStr(e.fieldOfStudy)),
      )
    : [];
  const skillsItems = trimStr(safe.skills)
    ? safe.skills.split(",").map((s) => s.trim()).filter(Boolean)
    : [];
  const techGroups = technicalSkillsGroupsForTemplate(safe.technicalSkills);
  const languageItems = trimStr(safe.languages)
    ? safe.languages.split(",").map((s) => s.trim()).filter(Boolean)
    : [];

  let certifications = [];
  if (Array.isArray(safe.certifications)) {
    certifications = safe.certifications
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
  } else if (typeof safe.certifications === "string" && safe.certifications.trim()) {
    certifications = safe.certifications
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((name) => ({ name, issuer: "", year: "" }));
  }

  const projects = trimStr(safe.projects);
  const publications = trimStr(safe.publications);
  const volunteerWork = trimStr(safe.volunteerWork);
  const references = trimStr(safe.references);

  return (
    <div
      style={{
        width: "100%",
        minHeight: "auto",
        backgroundColor: "#FFFFFF",
        fontFamily: FONT_STACK,
        color: COLORS.BODY,
        WebkitPrintColorAdjust: "exact",
      }}
    >
      <div style={{ height: "4px", width: "100%", background: COLORS.ACCENT_SKY }} />
      <Header cv={safe} />
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          gap: "36px",
          padding: "26px 40px 32px 40px",
        }}
      >
        <div style={{ flex: "0 0 62%", minWidth: 0 }}>
          {experience.length > 0 && (
            <section style={{ marginBottom: "22px", pageBreakInside: "avoid", breakInside: "avoid" }}>
              <SectionTitle>Professional Experience</SectionTitle>
              {experience.map((exp, i) => (
                <ExperienceItem key={i} exp={exp} />
              ))}
            </section>
          )}
          {education.length > 0 && (
            <section style={{ marginBottom: "22px", pageBreakInside: "avoid", breakInside: "avoid" }}>
              <SectionTitle>Education</SectionTitle>
              {education.map((edu, i) => (
                <EducationItem key={i} edu={edu} />
              ))}
            </section>
          )}
          {projects && <MultilineSection title="Projects" raw={projects} />}
          {publications && <MultilineSection title="Publications" raw={publications} />}
          {volunteerWork && <MultilineSection title="Volunteer Work" raw={volunteerWork} />}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {summary && (
            <section style={{ marginBottom: "22px", pageBreakInside: "avoid", breakInside: "avoid" }}>
              <SectionTitle>Profile</SectionTitle>
              <p
                style={{
                  fontSize: "12.5px",
                  color: COLORS.BODY,
                  lineHeight: 1.55,
                  margin: 0,
                  pageBreakInside: "avoid",
                  breakInside: "avoid",
                }}
              >
                {summary}
              </p>
            </section>
          )}
          {skillsItems.length > 0 && (
            <section style={{ marginBottom: "22px", pageBreakInside: "avoid", breakInside: "avoid" }}>
              <SectionTitle>Core Skills</SectionTitle>
              <SkillList items={skillsItems} />
            </section>
          )}
          {techGroups.length > 0 && (
            <section style={{ marginBottom: "22px", pageBreakInside: "avoid", breakInside: "avoid" }}>
              <SectionTitle>Technical Skills</SectionTitle>
              <div>
                {techGroups.map((g, i) => (
                  <p
                    key={i}
                    style={{
                      margin: "0 0 6px 0",
                      fontSize: "12.5px",
                      color: COLORS.BODY,
                      lineHeight: 1.55,
                      pageBreakInside: "avoid",
                      breakInside: "avoid",
                    }}
                  >
                    {g.category && (
                      <strong style={{ color: COLORS.INK }}>{g.category}: </strong>
                    )}
                    {g.chips.join(", ")}
                  </p>
                ))}
              </div>
            </section>
          )}
          {languageItems.length > 0 && (
            <section style={{ marginBottom: "22px", pageBreakInside: "avoid", breakInside: "avoid" }}>
              <SectionTitle>Languages</SectionTitle>
              <div>
                {languageItems.map((l, i) => (
                  <div
                    key={i}
                    style={{
                      fontSize: "12.5px",
                      color: COLORS.BODY,
                      lineHeight: 1.5,
                      padding: "3px 0",
                      pageBreakInside: "avoid",
                      breakInside: "avoid",
                    }}
                  >
                    {l}
                  </div>
                ))}
              </div>
            </section>
          )}
          {certifications.length > 0 && (
            <section style={{ marginBottom: "22px", pageBreakInside: "avoid", breakInside: "avoid" }}>
              <SectionTitle>Certifications</SectionTitle>
              <SkillList
                items={certifications.map((c) =>
                  [c.name, c.issuer, c.year].filter(Boolean).join(" — "),
                )}
              />
            </section>
          )}
          {references && (
            <section style={{ marginBottom: "22px", pageBreakInside: "avoid", breakInside: "avoid" }}>
              <SectionTitle>References</SectionTitle>
              <p
                style={{
                  fontSize: "12.5px",
                  color: COLORS.BODY,
                  lineHeight: 1.55,
                  margin: 0,
                }}
              >
                {references}
              </p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

// Public export consumed by ResumePreview.jsx (layout="ats-intl").
export function PreviewATSInternational({ cv, mobileMode = false }) {
  return <PreviewSaaSModern cv={cv} mobileMode={mobileMode} />;
}
