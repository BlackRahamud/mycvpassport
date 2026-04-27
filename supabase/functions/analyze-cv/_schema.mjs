/**
 * Anthropic tool_use schema for the ATS scan pipeline + tier→model routing.
 *
 * No external deps. Universal between Deno and Node.
 * Mirrored by evals/scan/_schemaZod.mjs which adds zod-based runtime
 * validation for the eval suite.
 */

export const SCAN_TOOL = {
  name: "submit_scan_result",
  description:
    "Submit the structured ATS scan result for the given CV and job description. ALWAYS use this tool to deliver the final result.",
  input_schema: {
    type: "object",
    required: [
      "score",
      "keywordsScore",
      "structureScore",
      "contentScore",
      "industry",
      "seniority",
      "reasons",
      "missingSkills",
      "atsFlags",
      "confidence",
    ],
    properties: {
      score: { type: "integer", minimum: 0, maximum: 100, description: "Overall ATS match score 0-100" },
      keywordsScore: { type: "integer", minimum: 0, maximum: 100 },
      structureScore: { type: "integer", minimum: 0, maximum: 100 },
      contentScore: { type: "integer", minimum: 0, maximum: 100 },
      industry: {
        type: "string",
        description: "Detected industry, free-form, model-inferred (do NOT use a fixed enum)",
      },
      seniority: { type: "string", enum: ["fresh_graduate", "junior", "mid", "senior", "executive"] },
      visibilityBoosters: {
        type: "array",
        items: { type: "string" },
        maxItems: 8,
        description: "CV phrases that match the JD well — quote the CV verbatim",
      },
      rankTriggers: {
        type: "array",
        items: { type: "string" },
        maxItems: 8,
        description: "JD keywords the CV is missing",
      },
      missingSkills: {
        type: "array",
        items: { type: "string" },
        maxItems: 3,
        description: "Top 3 missing skills the candidate should add to be JD-competitive",
      },
      reasons: {
        type: "array",
        minItems: 5,
        maxItems: 5,
        items: {
          type: "object",
          required: ["claim", "evidence", "weight"],
          properties: {
            claim: { type: "string" },
            evidence: { type: "string", description: "Direct quote from the CV when possible" },
            weight: { type: "string", enum: ["high", "medium", "low"] },
          },
        },
      },
      atsFlags: {
        type: "object",
        required: ["hasContactBlock", "hasTablesOrColumns", "imageHeavy", "fontIssues"],
        properties: {
          hasContactBlock: { type: "boolean" },
          hasTablesOrColumns: { type: "boolean" },
          imageHeavy: { type: "boolean" },
          fontIssues: { type: "boolean" },
        },
      },
      bilingualHeadline: {
        type: "object",
        required: ["english", "arabic"],
        properties: {
          english: { type: "string", maxLength: 140 },
          arabic: { type: "string", maxLength: 140 },
        },
        description: "Optional bilingual professional headline the candidate can paste into the CV",
      },
      missingJd: { type: "boolean" },
      confidence: {
        type: "object",
        required: ["industry", "seniority", "score"],
        properties: {
          industry: { type: "number", minimum: 0, maximum: 1 },
          seniority: { type: "number", minimum: 0, maximum: 1 },
          score: { type: "number", minimum: 0, maximum: 1 },
        },
        description: "Per-field confidence in [0,1]",
      },
    },
  },
};

/**
 * Sprint: JD nudge — cv_only mode tool.
 *
 * When the user runs a scan WITHOUT a JD (or with one shorter than the
 * 50-char threshold), we don't pretend to score fit. Instead we deliver
 * a CV-health analysis: how parseable is this CV in absolute terms,
 * which skills does it surface, what structure problems will hurt at
 * any ATS. The matched scan_result schema (above) is reused for the
 * full match flow once a real JD lands.
 */
export const CV_ONLY_TOOL = {
  name: "submit_cv_only_result",
  description:
    "Submit a CV-only health analysis when no job description is available. Do NOT score fit, do NOT identify missing skills.",
  input_schema: {
    type: "object",
    required: [
      "cvHealthScore",
      "topSkills",
      "structureIssues",
      "atsFlags",
      "industry",
      "seniority",
      "confidence",
    ],
    properties: {
      cvHealthScore: {
        type: "integer",
        minimum: 0,
        maximum: 100,
        description:
          "Absolute parseability + structural quality 0-100. NOT a fit score. Penalise tables, columns, image-only PDFs, missing contact block, weird fonts, non-standard sections.",
      },
      topSkills: {
        type: "array",
        items: { type: "string" },
        minItems: 3,
        maxItems: 5,
        description:
          "Top 5 strongest concrete skills demonstrated by the CV (proper-noun and technical, not soft skills). Quote the CV.",
      },
      structureIssues: {
        type: "array",
        maxItems: 5,
        items: {
          type: "object",
          required: ["claim", "weight"],
          properties: {
            claim: { type: "string" },
            evidence: { type: "string" },
            weight: { type: "string", enum: ["high", "medium", "low"] },
          },
        },
        description:
          "Up to 5 specific ATS-parseability problems. Quote the CV in evidence when possible.",
      },
      atsFlags: {
        type: "object",
        required: [
          "hasContactBlock",
          "hasTablesOrColumns",
          "imageHeavy",
          "fontIssues",
        ],
        properties: {
          hasContactBlock: { type: "boolean" },
          hasTablesOrColumns: { type: "boolean" },
          imageHeavy: { type: "boolean" },
          fontIssues: { type: "boolean" },
        },
      },
      bilingualHeadline: {
        type: "object",
        required: ["english", "arabic"],
        properties: {
          english: { type: "string", maxLength: 140 },
          arabic: { type: "string", maxLength: 140 },
        },
        description:
          "Optional EN + AR professional headline the candidate can paste at the top of their CV.",
      },
      industry: { type: "string" },
      seniority: {
        type: "string",
        enum: ["fresh_graduate", "junior", "mid", "senior", "executive"],
      },
      confidence: {
        type: "object",
        required: ["industry", "seniority", "score"],
        properties: {
          industry: { type: "number", minimum: 0, maximum: 1 },
          seniority: { type: "number", minimum: 0, maximum: 1 },
          score: { type: "number", minimum: 0, maximum: 1 },
        },
      },
    },
  },
};

/**
 * Hard threshold below which the Edge Function branches to cv_only mode.
 * Conservative — most pasted JDs are ≥ 200 chars; under 50 means the
 * user pasted a job title or nothing at all.
 */
export const JD_MIN_CHARS = 50;

/**
 * Tier → model routing.
 *   anonymous + free → claude-haiku-4-5
 *   paid + paid_pro  → claude-sonnet-4-6
 */
export function modelForTier(tier) {
  switch (String(tier ?? "").toLowerCase()) {
    case "paid":
    case "paid_pro":
    case "career_pro":
    case "active_hunter":
    case "express_pass":
    case "pro":
    case "max_pro":
      return "claude-sonnet-4-6";
    case "free":
    case "anonymous":
    default:
      return "claude-haiku-4-5";
  }
}

export const ANTHROPIC_VERSION = "2023-06-01";

export const MAX_TOKENS_BY_MODEL = {
  "claude-haiku-4-5": 2048,
  "claude-sonnet-4-6": 4096,
};
