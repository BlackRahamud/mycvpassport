import { useMemo } from "react";
import { splitCommaItems } from "../cvShared";

/**
 * Weighted CV completion for FAB sheet (builder resume shape + optional personalInfo.*).
 * Weights sum to 100. Minimum 20% when full name is present (endowed progress).
 */
const SECTIONS = [
  {
    id: "fullName",
    weight: 15,
    completedLabel: "Full name",
    nudgePhrase: "your full name",
    isComplete: (d) => String(d?.name ?? d?.personalInfo?.fullName ?? "").trim().length > 0,
  },
  {
    id: "email",
    weight: 10,
    completedLabel: "Email",
    nudgePhrase: "an email address",
    isComplete: (d) => String(d?.email ?? d?.personalInfo?.email ?? "").trim().length > 0,
  },
  {
    id: "phone",
    weight: 10,
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
    weight: 20,
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
    percent >= 100 || missingMeta.length === 0 ? null : `Add ${missingMeta[0].nudgePhrase} to strengthen your CV`;

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
