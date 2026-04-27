/**
 * Replicates the FREE-tier scoring logic from src/ATSChecker.jsx:403-482
 * exactly as it ships today. Do not "improve" this — it must mirror the
 * production path so the eval can detect when behavior changes.
 *
 * No-JD branch: hardcoded scores 65/70/75, score=70, topPercent=42,
 * keywords sliced from a flat pool of skillSuggestions.
 * With-JD branch: substring match of JD against
 * skillSuggestions[detectRole(jd) || "sales_real_estate"].atsKeywords.
 *
 * The CV argument is accepted but never read — by design, mirroring
 * the bug we're proving.
 */

import { loadLegacySkillSuggestions, loadLegacyDetectRole } from "../_legacyLoader.mjs";

const skillSuggestions = loadLegacySkillSuggestions();
const detectRole = loadLegacyDetectRole();

export function runFreeScan(_cvText, jobDescription) {
  const jd = (jobDescription || "").trim();

  if (!jd) {
    const seen = new Set();
    const pool = [];
    poolLoop: for (const pack of Object.values(skillSuggestions)) {
      for (const row of pack?.atsKeywords ?? []) {
        if (pool.length >= 30) break poolLoop;
        const keyword = row?.keyword?.trim();
        if (!keyword) continue;
        const key = keyword.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        pool.push(keyword);
      }
    }
    return {
      score: 70,
      keywordsScore: 65,
      structureScore: 70,
      contentScore: 75,
      visibilityBoosters: pool.slice(0, 5),
      rankTriggers: pool.slice(5, 10),
      industry: "General GCC Market",
      topPercent: 42,
      missingCount: 5,
      detectedRoleKey: null,
      fallbackRoleUsed: false,
    };
  }

  const jdLower = jd.toLowerCase();
  const detected = detectRole(jd);
  const fallbackRoleUsed = !detected;
  const roleKey = detected || "sales_real_estate";
  const pack = skillSuggestions[roleKey];
  const list = pack?.atsKeywords ?? [];

  const visibilityBoosters = [];
  const rankTriggers = [];
  for (const row of list) {
    const keyword = row?.keyword?.trim();
    if (!keyword) continue;
    if (jdLower.includes(keyword.toLowerCase())) visibilityBoosters.push(keyword);
    else rankTriggers.push(keyword);
  }

  const total = list.length;
  const keywordsScore = total > 0 ? Math.round((visibilityBoosters.length / total) * 100) : 0;
  const structureScore = 70;
  const contentScore = 75;
  const score = Math.round((keywordsScore + structureScore + contentScore) / 3);

  const industry =
    (pack?.jobTitles && pack.jobTitles[0]) ||
    roleKey.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const topPercent = Math.max(1, Math.min(99, 100 - score));

  return {
    score,
    keywordsScore,
    structureScore,
    contentScore,
    visibilityBoosters,
    rankTriggers,
    industry,
    topPercent,
    missingCount: rankTriggers.length,
    detectedRoleKey: roleKey,
    fallbackRoleUsed,
  };
}
