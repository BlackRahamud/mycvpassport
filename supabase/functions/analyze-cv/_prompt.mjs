/**
 * Prompt builders for the ATS scan pipeline.
 *
 * No I/O, no Deno or Node specific imports — works in both runtimes.
 * Imported by:
 *   - supabase/functions/analyze-cv/index.ts (Deno)
 *   - evals/scan/scoring/*.mjs (Node)
 */

const SYSTEM_PROMPT = `You are an ATS-grade CV analyst for the Gulf (UAE / KSA / Qatar / Bahrain / Kuwait / Oman) and India job markets.

Read the candidate CV and the target job description carefully. Infer the candidate's industry, seniority, and core skill set from the CV — do NOT rely on a fixed taxonomy of roles. Score how well the CV matches the JD on three dimensions:
  - keywords: overlap of role-relevant terms between CV and JD;
  - structure: parseable formatting, clear sections, contact block, columns / tables / fonts / images that hurt parsers;
  - content: depth of accomplishments, quantified impact, recency, alignment to the JD.

Quote phrases from the CV verbatim in your reasons and visibilityBoosters. Do NOT invent achievements not present in the CV. If the CV contains an Indian regional language (Hindi, Tamil, Malayalam, Telugu, Bengali, Punjabi, Marathi, Gujarati, Urdu) capture it. If the CV contains a Gulf identity reference (Iqama, EID, QID, CPR, Civil ID), call it out as a structure positive.

Always submit your final analysis as a single tool_use call to the "submit_scan_result" tool. If the JD is missing, score against general professional standards for the inferred industry and set missingJd: true.`;

export function getSystemPrompt() {
  return SYSTEM_PROMPT;
}

export function buildScanPrompt({ cvText, jobDescription }) {
  const cv = String(cvText ?? "").trim();
  const jd = String(jobDescription ?? "").trim();
  const cvBlock = cv
    ? `## Candidate CV (full extracted text)\n\n${cv}`
    : "## Candidate CV\n\n(no CV text was extracted from the upload — surface this as a critical structure flaw)";
  const jdBlock = jd
    ? `## Target job description\n\n${jd}`
    : "## Target job description\n\n(none — score against general professional standards for the inferred industry and set missingJd: true)";
  return `${cvBlock}\n\n${jdBlock}`;
}

export const SHARED_PROMPT_VERSION = "2026-04-28-day2";
