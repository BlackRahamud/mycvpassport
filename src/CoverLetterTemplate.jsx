import GhostChip from "./components/GhostChip";
import skillSuggestions from "./data/skillSuggestions";
import { detectRole } from "./utils/detectRole";

const SOFT_SKILLS = [
  "Strategic Leadership",
  "Cross-functional Collaboration",
  "Stakeholder Management",
  "Problem Solving",
  "Communication Skills",
  "Team Leadership",
];

export function CoverLetterTemplate({
  clFullName,
  clCurrentJobTitle,
  clTargetRole,
  clCompanyName,
  fullLetterDisplay,
  resumeForApi,
  clTemplateVariant,
}) {
  const fullName = clFullName || resumeForApi?.name || "Candidate Name";
  const email = resumeForApi?.email || "";
  const phone = resumeForApi?.phone || "";
  const location = resumeForApi?.location || "";

  const contactParts = [email, phone, location].filter(Boolean);

  const roleKey = detectRole(clTargetRole || "");
  const pack = roleKey ? skillSuggestions[roleKey] : null;
  const hardSkills = (pack?.atsKeywords || [])
    .slice(0, 3)
    .map((k) => (typeof k === "string" ? k : k.keyword || ""));
  const softSkills = SOFT_SKILLS.slice(0, 3);

  return (
    <div
      style={{
        width: 794,
        minHeight: 1123,
        padding: "60px 70px",
        background: "#ffffff",
        boxSizing: "border-box",
        position: "relative",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif",
        color: "#1a1a1a",
      }}
    >
      {/* GhostChips — hard skills */}
      {hardSkills.map((s, i) =>
        s ? <GhostChip key={`hard-${i}`}>{s}</GhostChip> : null
      )}
      {/* GhostChips — soft skills */}
      {softSkills.map((s, i) => (
        <GhostChip key={`soft-${i}`}>{s}</GhostChip>
      ))}

      {/* Header */}
      <div
        style={{
          borderBottom: "2px solid #1a1a1a",
          paddingBottom: 16,
          marginBottom: 32,
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.3 }}>
          {fullName}
        </div>
        {clCurrentJobTitle ? (
          <div style={{ fontSize: 14, color: "#555", marginTop: 4 }}>
            {clCurrentJobTitle}
          </div>
        ) : null}
        {contactParts.length > 0 ? (
          <div style={{ fontSize: 12, color: "#777", marginTop: 6 }}>
            {contactParts.join(" \u00B7 ")}
          </div>
        ) : null}
      </div>

      {/* Date + Hiring Manager + Company */}
      <div style={{ fontSize: "10.5pt", lineHeight: 1.75, marginBottom: 24 }}>
        <div>
          {new Date().toLocaleDateString("en-GB", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
        <div style={{ marginTop: 4 }}>
          {clTemplateVariant === "india" ? "Dear Sir/Madam," : "Hiring Manager"}
        </div>
        {clCompanyName ? (
          <div>{clCompanyName}</div>
        ) : null}
      </div>

      {/* Subject line */}
      {clTargetRole ? (
        <div
          style={{
            fontWeight: 700,
            fontSize: "10.5pt",
            marginBottom: 16,
          }}
        >
          Re: Application for {clTargetRole} Position
        </div>
      ) : null}

      {/* Body */}
      <div
        style={{
          whiteSpace: "pre-wrap",
          maxHeight: 700,
          overflow: "hidden",
          lineHeight: 1.75,
          fontSize: "10.5pt",
          color: "#1a1a1a",
        }}
      >
        {fullLetterDisplay}
      </div>
    </div>
  );
}
