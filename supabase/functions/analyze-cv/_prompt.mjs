/**
 * Prompt builders for the ATS scan pipeline.
 *
 * No I/O, no Deno or Node specific imports — works in both runtimes.
 * Imported by:
 *   - supabase/functions/analyze-cv/index.ts (Deno)
 *   - evals/scan/scoring/*.mjs (Node)
 *
 * Sprint #4: JD now comes BEFORE the CV so the JD block can be marked
 * cache_control: ephemeral on the Edge Function side. Anthropic caches
 * a prefix; everything up to the cache_control marker is cacheable, so
 * the variable CV bytes have to live AFTER any cached content.
 *
 * The eval suite uses buildScanPrompt() (string) — adversarial variance
 * still passes because the CV portion still varies per fixture, and
 * paid-prompt-integrity still passes because the CV text is still in
 * the prompt. The Edge Function uses buildScanPromptBlocks() (array)
 * so it can mark cache_control per block.
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

function jdBlockText(jobDescription) {
  const jd = String(jobDescription ?? "").trim();
  return jd
    ? `## Target job description\n\n${jd}`
    : "## Target job description\n\n(none — score against general professional standards for the inferred industry and set missingJd: true)";
}

function cvBlockText(cvText) {
  const cv = String(cvText ?? "").trim();
  return cv
    ? `## Candidate CV (full extracted text)\n\n${cv}`
    : "## Candidate CV\n\n(no CV text was extracted from the upload — surface this as a critical structure flaw)";
}

/**
 * Single-string prompt for the eval suite (offline structural tests).
 * Order: JD then CV — same as the cacheable Edge Function prompt.
 */
export function buildScanPrompt({ cvText, jobDescription }) {
  return `${jdBlockText(jobDescription)}\n\n${cvBlockText(cvText)}`;
}

/**
 * Anthropic content-block array for the Edge Function. The JD block is
 * marked cache_control: ephemeral; the CV block is not. Together with
 * a cached system prompt, this gives the cache 90 % cost savings on
 * repeat-JD scans.
 */
export function buildScanPromptBlocks({ cvText, jobDescription }) {
  return [
    {
      type: "text",
      text: jdBlockText(jobDescription),
      cache_control: { type: "ephemeral" },
    },
    {
      type: "text",
      text: cvBlockText(cvText),
    },
  ];
}

export const SHARED_PROMPT_VERSION = "2026-04-28-sprint4";
