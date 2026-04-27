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

const CV_ONLY_SYSTEM_PROMPT = `You are an ATS-grade CV analyst for the Gulf (UAE / KSA / Qatar / Bahrain / Kuwait / Oman) and India job markets.

The candidate has uploaded a CV but has NOT provided a target job description. You MUST NOT pretend to score fit, identify missing skills, or recommend keywords against an imaginary role. Instead, deliver a CV-HEALTH analysis:

  1. cvHealthScore (0-100): OVERALL parseability + structural quality. NOT a fit score — a parseable but generic CV scores high here. Penalise tables, columns, image-only PDFs, non-standard sections, missing contact block, decorative fonts, and unclear date formats.
  2. Sub-scores (each 0-100, INDEPENDENT of any JD):
     - keywordsScore: proper-noun density, role-relevant terms, recognisable certifications.
     - structureScore: clear sections, contact block, single-column body, parser-friendly fonts.
     - contentScore: depth + recency + quantification, bullet quality, accomplishments expressed in numbers.
     The cvHealthScore should NOT just average these — give it your own holistic read.
  3. topSkills: 3-5 strongest concrete skills demonstrated by the CV. Prefer proper nouns + technical terms (e.g. "AWS Lambda", "ASME IX welding", "DHA Pharmacist licence"). Skip soft skills.
  4. structureIssues: up to 5 specific parseability problems, each with a verbatim quote from the CV when possible.
  5. atsFlags: parser-readability booleans.
  6. bilingualHeadline: a short professional headline the candidate can paste at the top of their CV in English AND Arabic. Use the candidate's actual industry + seniority; do not invent.
  7. industry + seniority: model-inferred, free-form industry, seniority from the enum.
  8. confidence: per-field [0, 1].

Always submit via the "submit_cv_only_result" tool. Do NOT include a fit score or matching keywords — there's no JD to match against.`;

export function getSystemPrompt() {
  return SYSTEM_PROMPT;
}

export function getCvOnlySystemPrompt() {
  return CV_ONLY_SYSTEM_PROMPT;
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

/**
 * Single content block carrying just the CV. Used by the cv_only branch
 * — no JD block, no cache_control (every CV is unique). System prompt
 * cache_control is still set in the Edge Function so that prefix is
 * cached across CV-only callers.
 */
export function buildCvOnlyPromptBlocks({ cvText }) {
  return [
    {
      type: "text",
      text: cvBlockText(cvText),
    },
  ];
}

export const SHARED_PROMPT_VERSION = "2026-04-28-jd-nudge";
