// ATS typed-gap model — produced at the scan→tailor handoff (ATSChecker),
// carried in the cv_data draft (NOT the URL), consumed by the Builder.
//
// Phase A: STRUCTURAL gaps only (analyze-cv structureIssues + atsFlags). The
// `type` field is forward-compatible — Phase B adds type:'content' gaps from
// reasons / rankTriggers without changing this contract.

import { classifyStructuralGap } from "./structuralResolution";

function slug(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

function normWeight(w) {
  const v = String(w || "").toLowerCase();
  return v === "high" || v === "medium" || v === "low" ? v : "medium";
}

/**
 * Build typed STRUCTURAL gaps from an analyze-cv result (cv_only or matched).
 * Dedupes by category+label, preferring the richer structureIssue (which
 * carries evidence) over the atsFlags-derived duplicate.
 */
export function buildStructuralGaps(results) {
  const out = [];
  const seen = new Set();

  const add = (g) => {
    const key = `${g.category}|${slug(g.label)}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push({
      id: `${g.category}:${slug(g.label)}:${out.length}`,
      type: "structural",
      category: g.category,
      weight: normWeight(g.weight),
      label: g.label,
      evidence: String(g.evidence || "").trim(),
    });
  };

  const issues = Array.isArray(results?.structureIssues) ? results.structureIssues : [];
  for (const it of issues) {
    const label = String(it?.claim || "").trim();
    if (!label) continue;
    add({
      category: classifyStructuralGap(`${label} ${it?.evidence || ""}`),
      weight: it?.weight,
      label,
      evidence: it?.evidence,
    });
  }

  const flags = results?.atsFlags && typeof results.atsFlags === "object" ? results.atsFlags : null;
  if (flags) {
    if (flags.hasContactBlock === false) {
      add({ category: "missing_contact", weight: "high", label: "No clear contact block detected" });
    }
    if (flags.hasTablesOrColumns === true) {
      add({ category: "tables_columns", weight: "medium", label: "Tables or multi-column layout" });
    }
    if (flags.imageHeavy === true) {
      add({ category: "image_or_nontext", weight: "medium", label: "Image-heavy / non-text content" });
    }
    if (flags.fontIssues === true) {
      add({ category: "decorative_fonts", weight: "low", label: "Parser-unfriendly fonts" });
    }
  }

  return out;
}

const WEIGHT_RANK = { high: 0, medium: 1, low: 2 };

export function sortGapsByWeight(gaps) {
  return [...gaps].sort((a, b) => (WEIGHT_RANK[a.weight] ?? 1) - (WEIGHT_RANK[b.weight] ?? 1));
}

/**
 * Defensive read of gaps carried in a draft. Tolerates missing/garbage entries
 * and falls back to legacy URL strings (pre-typed handoffs) as 'unknown'
 * structural review chips, preserving today's behaviour for old links.
 */
export function normalizeAtsGaps(raw) {
  if (Array.isArray(raw)) {
    return raw
      .filter((g) => g && typeof g === "object" && String(g.label || "").trim())
      .map((g, i) => ({
        id: String(g.id || `${g.category || "unknown"}:${i}`),
        type: g.type === "content" ? "content" : "structural",
        category: String(g.category || "unknown"),
        weight: normWeight(g.weight),
        label: String(g.label).trim(),
        evidence: String(g.evidence || "").trim(),
      }));
  }
  return [];
}

/** Legacy fallback: comma-separated ?gaps= strings → untyped review chips. */
export function gapsFromLegacyParam(rawParam) {
  if (!rawParam) return [];
  return rawParam
    .split(",")
    .map((g) => {
      let t = g;
      try {
        t = decodeURIComponent(g);
      } catch {
        /* keep raw */
      }
      return t.trim();
    })
    .filter(Boolean)
    .map((label, i) => ({
      id: `legacy:${i}`,
      type: "structural",
      category: "unknown",
      weight: "medium",
      label,
      evidence: "",
    }));
}
