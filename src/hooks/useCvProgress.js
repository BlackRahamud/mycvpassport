import { useMemo } from "react";
import { splitCommaItems } from "../cvShared";

/**
 * Weighted CV completion for FAB sheet (builder resume shape + optional personalInfo.*).
 * Weights sum to 100. Minimum 20% when full name is present (endowed progress).
 */
/** Exported for builder progress tooltip breakdown (same weights as FAB completion).
 *
 * Weights are tuned so the number roughly tracks CV completeness as a
 * recruiter would read it: the whole contact block is worth ~15 (it used
 * to be 35 — typing your own name felt like a third of a CV), the first
 * experience entry is the single biggest earn at 25, and the long tail
 * (languages / certifications / personal details) counts as "extras". */
export const SECTIONS = [
  {
    id: "fullName",
    weight: 7,
    completedLabel: "Full name",
    nudgePhrase: "your full name",
    isComplete: (d) => String(d?.name ?? d?.personalInfo?.fullName ?? "").trim().length > 0,
  },
  {
    id: "email",
    weight: 4,
    completedLabel: "Email",
    nudgePhrase: "an email address",
    isComplete: (d) => String(d?.email ?? d?.personalInfo?.email ?? "").trim().length > 0,
  },
  {
    id: "phone",
    weight: 4,
    completedLabel: "Phone",
    nudgePhrase: "a phone number",
    isComplete: (d) => String(d?.phone ?? d?.personalInfo?.phone ?? "").trim().length > 0,
  },
  {
    id: "education",
    weight: 15,
    completedLabel: "Education",
    nudgePhrase: "education",
    isComplete: (d) => Array.isArray(d?.education) && d.education.length > 0,
  },
  {
    id: "experience",
    weight: 25,
    completedLabel: "Experience",
    nudgePhrase: "work experience",
    isComplete: (d) => Array.isArray(d?.experience) && d.experience.length > 0,
  },
  {
    id: "skills",
    weight: 15,
    completedLabel: "Skills",
    nudgePhrase: "at least three skills",
    isComplete: (d) => {
      const skills = d?.skills;
      const n = Array.isArray(skills) ? skills.length : splitCommaItems(typeof skills === "string" ? skills : "").length;
      return n >= 3;
    },
  },
  {
    id: "summary",
    weight: 15,
    completedLabel: "Summary",
    nudgePhrase: "a professional summary",
    isComplete: (d) => String(d?.summary ?? "").trim().length > 30,
  },
  {
    id: "extras",
    weight: 15,
    completedLabel: "Extras (languages, certs…)",
    nudgePhrase: "languages or certifications",
    isComplete: (d) =>
      String(d?.languages ?? "").trim().length > 0 ||
      (Array.isArray(d?.certifications) && d.certifications.length > 0) ||
      String(d?.nationality ?? "").trim().length > 0 ||
      String(d?.visaStatus ?? "").trim().length > 0,
  },
];

function labelForPercent(percent) {
  const p = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
  if (p >= 100) return "CV ready to send";
  if (p >= 81) return "Final touches";
  if (p >= 61) return "Almost there";
  if (p >= 41) return "Halfway to Dubai interviews";
  if (p >= 21) return "Looking good so far";
  return "Getting started";
}

export function computeCvProgress(cvData) {
  if (cvData == null || typeof cvData !== "object") {
    return {
      percent: 0,
      label: labelForPercent(0),
      completedSections: [],
      missingSections: [],
      topMissingNudge: null,
    };
  }

  let earned = 0;
  const completedSections = [];
  const missingMeta = [];

  for (const s of SECTIONS) {
    if (s.isComplete(cvData)) {
      earned += s.weight;
      completedSections.push(s.completedLabel);
    } else {
      missingMeta.push({ weight: s.weight, missingLabel: s.completedLabel, nudgePhrase: s.nudgePhrase });
    }
  }

  let percent = Math.round(earned);
  const hasFullName = String(cvData?.name ?? cvData?.personalInfo?.fullName ?? "").trim().length > 0;
  if (hasFullName) percent = Math.max(percent, 20);
  percent = Math.min(100, Math.max(0, percent));

  const missingSections = missingMeta.map((m) => m.missingLabel);

  missingMeta.sort((a, b) => b.weight - a.weight);
  const topMissingNudge =
    percent >= 100 || missingMeta.length === 0
      ? null
      : (() => {
          const top = missingMeta[0];
          const sec = SECTIONS.find((s) => s.completedLabel === top.missingLabel);
          if (!sec) return `· Add ${top.nudgePhrase} and your CV gets stronger`;
          switch (sec.id) {
            case "skills":
              return "· Add 3 skills and your CV gets stronger";
            case "summary":
              return "· Add a summary and your CV gets stronger";
            case "experience":
              return "· Add work experience and your CV gets stronger";
            case "education":
              return "· Add education and your CV gets stronger";
            case "email":
              return "· Add an email address and your CV gets stronger";
            case "phone":
              return "· Add a phone number and your CV gets stronger";
            case "fullName":
              return "· Add your name and your CV gets stronger";
            case "extras":
              return "· Add languages or certifications and your CV gets stronger";
            default:
              return `· Add ${top.nudgePhrase} and your CV gets stronger`;
          }
        })();

  return {
    percent,
    label: labelForPercent(percent),
    completedSections,
    missingSections,
    topMissingNudge,
  };
}

export function useCvProgress(cvData) {
  return useMemo(() => computeCvProgress(cvData), [cvData]);
}
