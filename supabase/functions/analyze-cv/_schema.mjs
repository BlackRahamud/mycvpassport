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
