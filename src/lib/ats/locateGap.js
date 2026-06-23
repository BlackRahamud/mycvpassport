// Locate where a gap's problem text actually lives in the parsed cv_data.
//
// Structural gaps reference the ORIGINAL file; after a faithful parse that
// content may sit in a different field — or be gone. The gap's `evidence` (the
// verbatim quote analyze-cv returns) is the bridge: we token-match it against
// every cv_data text candidate and return the precise element, plus the best
// score (so callers can honestly distinguish "located" / "uncertain" /
// "genuinely absent").
//
// PURE, dependency-free, unit-tested.

function norm(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(s) {
  return norm(s).split(" ").filter((t) => t.length > 2);
}

// Containment: how much of the probe (evidence) appears in the candidate text.
// Asymmetric on purpose — a short evidence quote fully contained in a long
// bullet should score high.
function containment(probeTokens, candidateText) {
  if (!probeTokens.length) return 0;
  const set = new Set(tokenize(candidateText));
  if (!set.size) return 0;
  const shared = probeTokens.filter((t) => set.has(t)).length;
  return shared / probeTokens.length;
}

// Build the candidate list — every user-visible text value tagged with a ref
// that says exactly where it lives (and whether it's safely removable).
function candidates(cv) {
  const out = [];
  const add = (ref, text) => {
    const t = String(text == null ? "" : text).trim();
    if (t) out.push({ ref, text: t });
  };
  add({ kind: "field", field: "summary" }, cv?.summary);
  add({ kind: "field", field: "title" }, cv?.title);
  add({ kind: "field", field: "name" }, cv?.name);
  add({ kind: "field", field: "skills" }, cv?.skills);
  add({ kind: "field", field: "technicalSkills" }, cv?.technicalSkills);
  (Array.isArray(cv?.experience) ? cv.experience : []).forEach((e, expIndex) => {
    // Include dates so date-based evidence ("Oct 2025") locates the entry.
    add(
      { kind: "field", field: "experience", expIndex, sub: "header" },
      `${e?.role || ""} ${e?.company || ""} ${e?.period || ""} ${e?.startDate || ""} ${e?.endDate || ""}`,
    );
    String(e?.points || "").split("\n").forEach((line, lineIndex) => {
      if (line.trim()) add({ kind: "bullet", expIndex, lineIndex }, line);
    });
  });
  (Array.isArray(cv?.education) ? cv.education : []).forEach((e, index) => {
    add({ kind: "field", field: "education", index }, `${e?.school || ""} ${e?.degree || ""}`);
  });
  (Array.isArray(cv?.certifications) ? cv.certifications : []).forEach((c, index) => {
    add({ kind: "cert", index }, `${c?.name || ""} ${c?.issuer || ""}`);
  });
  (Array.isArray(cv?.customFields) ? cv.customFields : []).forEach((c, index) => {
    add({ kind: "customField", customFieldId: c?.id || null, index }, `${c?.name || ""} ${c?.value || ""}`);
  });
  ["projects", "volunteerWork", "publications"].forEach((field) => {
    add({ kind: "section", field }, cv?.[field]);
  });
  return out;
}

// Refs we can safely DELETE in full (vs. core fields, which we only focus).
const REMOVABLE_KINDS = new Set(["bullet", "cert", "customField", "section"]);

export function isRemovableRef(ref) {
  return !!ref && REMOVABLE_KINDS.has(ref.kind);
}

/**
 * @returns {{ ref: object|null, score: number, probeTokenCount: number }}
 *   ref           — best candidate at/above threshold, else null
 *   score         — best containment score across all candidates (0..1)
 *   probeTokenCount — how many usable tokens the evidence had
 */
export function locateGapInCv(gap, cv, { threshold = 0.6 } = {}) {
  const probe = String(gap?.evidence || gap?.label || "");
  const probeTokens = tokenize(probe);
  const cands = candidates(cv || {});
  let best = null;
  let bestScore = 0;
  for (const c of cands) {
    const s = containment(probeTokens, c.text);
    if (s > bestScore) {
      bestScore = s;
      best = c;
    }
  }
  return {
    ref: probeTokens.length >= 2 && bestScore >= threshold ? { ...best.ref, score: bestScore } : null,
    score: bestScore,
    probeTokenCount: probeTokens.length,
  };
}
