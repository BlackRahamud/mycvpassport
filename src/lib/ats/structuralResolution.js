// Structural ATS-gap resolution engine — PURE, dependency-free, unit-tested.
//
// Decides, for one STRUCTURAL gap, whether the parsed cv_data (as rendered by
// the chosen template) GENUINELY satisfies it, or whether it still needs a
// mechanical action / human review.
//
// HONESTY RULE (non-negotiable): `status: "resolved"` (the ✓ "Fixed by your
// template" state) is returned ONLY when a concrete check against cv_data
// passes. Anything unverifiable stays "action" or "review" — never a false ✓.
// A false ✓ tells a user their CV is fixed when it isn't; that is worse than
// no ✓.

import { locateGapInCv, isRemovableRef } from "./locateGap";

export const STRUCTURAL_CATEGORIES = [
  "letter_spacing",
  "tables_columns",
  "page_break_marker",
  "image_or_nontext",
  "decorative_fonts",
  "missing_contact",
  "split_skills",
  "irrelevant_block",
  "date_format",
  "unknown",
];

// "C O N T A C T" — 3+ single letters separated by whitespace, then one more.
const SPACED_LETTERS_RE = /(?:\b[A-Za-z]\s+){3,}\b[A-Za-z]\b/;
// "Page 1 of 2", "Page 1/2", "page break", "continued".
const PAGE_MARKER_RE = /\bpage\s*\d+\s*(?:of|\/)\s*\d+\b|\bpage\s*break\b|\bcontinued\b/i;

function hasSpacedLetters(s) {
  return SPACED_LETTERS_RE.test(String(s || ""));
}

export function classifyStructuralGap(text) {
  const original = String(text || "");
  const s = original.toLowerCase();
  if (!s.trim()) return "unknown";
  if (hasSpacedLetters(original)) return "letter_spacing";
  if (/(letter[- ]?spac|kerning|tracking|expanded text|spaced[- ]?out)/.test(s)) return "letter_spacing";
  if (/(key metrics|unsubstantiated|irrelevant|buzzword|filler|fluff|vanity metric|padding|inflated|off[- ]?topic)/.test(s)) return "irrelevant_block";
  if (/skill/.test(s) && /(split|two |multiple|separate|duplicat|scatter|second section)/.test(s)) return "split_skills";
  if (/(contact|email|phone|mobile|reach you|contact block|contact details)/.test(s)) return "missing_contact";
  if (PAGE_MARKER_RE.test(s) || /(page number|pagination|in the (header|footer))/.test(s)) return "page_break_marker";
  if (/(table|column|multi[- ]?column|two[- ]?column|grid layout)/.test(s)) return "tables_columns";
  if (/(image|graphic|photo|picture|icon|logo|chart|non[- ]?text|scanned)/.test(s)) return "image_or_nontext";
  if (/(font|decorative|fancy|script typeface|typeface|glyph)/.test(s)) return "decorative_fonts";
  if (/(date format|inconsistent date|date range|chronolog|mm\/yyyy)/.test(s)) return "date_format";
  return "unknown";
}

// Map an internal cv_data field key to the Builder section the user edits it in.
// 'contact' is the always-visible personal-info card (#section-personal); the
// rest are accordion ids.
function sectionForField(fieldKey) {
  switch (fieldKey) {
    case "name":
    case "email":
    case "phone":
    case "title":
      return "contact";
    case "summary":
      return "summary";
    case "experience":
      return "experience";
    case "education":
      return "education";
    case "skills":
      return "skills";
    case "technicalSkills":
      return "technicalSkills";
    case "languages":
      return "languages";
    default:
      return "experience";
  }
}

// Flatten every user-visible text value in cv_data, tagged with its field key,
// so detectors can scan for leaked artifacts (spaced letters, page markers).
function collectTextFields(cv) {
  const out = [];
  const push = (field, val) => {
    const t = String(val == null ? "" : val).trim();
    if (t) out.push({ field, text: t });
  };
  push("name", cv?.name);
  push("title", cv?.title);
  push("summary", cv?.summary);
  (Array.isArray(cv?.experience) ? cv.experience : []).forEach((e) => {
    push("experience", e?.role);
    push("experience", e?.company);
    String(e?.points || "").split("\n").forEach((line) => push("experience", line));
  });
  (Array.isArray(cv?.education) ? cv.education : []).forEach((e) => {
    push("education", e?.school);
    push("education", e?.degree);
  });
  push("skills", cv?.skills);
  push("technicalSkills", cv?.technicalSkills);
  push("languages", cv?.languages);
  return out;
}

const resolved = (reason) => ({ resolved: true, status: "resolved", reason, action: null, cta: null });
const action = (reason, act, cta) => ({ resolved: false, status: "action", reason, action: act, cta });
const review = (reason, act, cta) => ({ resolved: false, status: "review", reason, action: act, cta });

// Map a located ref back to the Builder section it lives in.
function sectionForRef(ref) {
  if (!ref) return "experience";
  if (ref.kind === "bullet") return "experience";
  if (ref.kind === "cert") return "certifications";
  if (ref.kind === "customField") return "personalDetails";
  if (ref.kind === "section") return ref.field;
  if (ref.kind === "field") return sectionForField(ref.field);
  return "experience";
}

// Precise locate of a page-break marker → bullet coords if it leaked into a
// bullet (removable line), else the field it sits in (focus to clean up).
function findPageMarker(cv) {
  const exp = Array.isArray(cv?.experience) ? cv.experience : [];
  for (let ei = 0; ei < exp.length; ei++) {
    const lines = String(exp[ei]?.points || "").split("\n");
    for (let li = 0; li < lines.length; li++) {
      if (PAGE_MARKER_RE.test(lines[li])) return { kind: "bullet", expIndex: ei, lineIndex: li };
    }
  }
  for (const f of ["summary", "title", "skills", "technicalSkills"]) {
    if (PAGE_MARKER_RE.test(String(cv?.[f] || ""))) return { kind: "field", field: f };
  }
  return null;
}

/**
 * @param {object} gap  typed structural gap { category, label, evidence, ... }
 * @param {object} cvData  the parsed resume (canonical builder shape)
 * @param {object} [ctx]  { templateIsAtsSafe?: boolean } — render-time context
 * @returns {{resolved:boolean, status:'resolved'|'action'|'review', reason:string, action:object|null, cta:string|null}}
 *   action.kind: 'focus_field' | 'remove_element' | 'merge_skills' |
 *                'goto_template' | 'open_experience'
 */
export function evaluateStructuralGap(gap, cvData, ctx = {}) {
  const cv = cvData && typeof cvData === "object" ? cvData : {};
  const category = gap?.category || classifyStructuralGap(gap?.label);
  const fields = collectTextFields(cv);

  switch (category) {
    // Genuinely true of ANY builder output: cv_data is selectable text and no
    // CVPassport template uses images or decorative fonts.
    case "image_or_nontext":
      return resolved("Your CV is now selectable text — no images for the parser to choke on.");
    case "decorative_fonts":
      return resolved("Your template uses ATS-safe fonts.");

    // Template-dependent: a two-column template can still hurt reading order,
    // so only ✓ when the chosen template is ATS-safe; otherwise it's an action.
    case "tables_columns": {
      if (ctx.templateIsAtsSafe === true) {
        return resolved("Rendered in an ATS-safe single-column flow by your template.");
      }
      // We know which template is ATS-safe — give the answer, don't punt to a
      // picker. ctx.atsRecommendation = { id, name } is computed by the Builder
      // (industry/tier aware). Fall back to the picker only if absent.
      const rec = ctx.atsRecommendation;
      const reason = "Your current template isn't ATS-single-column.";
      if (ctx.templateIsAtsSafe === false) {
        return rec && rec.id
          ? action(reason, { kind: "switch_template", templateId: rec.id }, `Switch to ${rec.name}`)
          : action(reason, { kind: "goto_template" }, "Choose ATS template");
      }
      return rec && rec.id
        ? review("Confirm an ATS single-column layout.", { kind: "switch_template", templateId: rec.id }, `Switch to ${rec.name}`)
        : review("Confirm your template is an ATS single-column layout.", { kind: "goto_template" }, "Choose ATS template");
    }

    case "letter_spacing": {
      const hit = fields.find((f) => hasSpacedLetters(f.text));
      if (!hit) return resolved("Headings render cleanly — no spaced-out letters.");
      return action("Spaced-out text is still inside a field.", { kind: "focus_field", field: sectionForField(hit.field) }, "Fix text");
    }

    case "page_break_marker": {
      const loc = findPageMarker(cv);
      if (!loc) return resolved('No "page X of Y" or page-break text in your content.');
      if (loc.kind === "bullet") {
        return action("Page-break text leaked into a bullet — remove that line.", { kind: "remove_element", target: loc, label: "page-break line" }, "Remove line");
      }
      return action("Page-break text is still inside a field.", { kind: "focus_field", field: sectionForField(loc.field) }, "Clean up");
    }

    case "missing_contact": {
      const missing = [];
      if (!String(cv.name || "").trim()) missing.push("name");
      if (!String(cv.email || "").trim()) missing.push("email");
      if (!String(cv.phone || "").trim()) missing.push("phone");
      if (missing.length === 0) return resolved("Name, email and phone are all present.");
      return action(`Add your ${missing.join(", ")}.`, { kind: "focus_field", field: "contact", missing }, `Add ${missing[0]}`);
    }

    case "split_skills": {
      const hasSkills = !!String(cv.skills || "").trim();
      const hasTech = !!String(cv.technicalSkills || "").trim();
      if (hasSkills && hasTech) {
        return action("Skills are split across two sections — merge them into one.", { kind: "merge_skills" }, "Merge skills");
      }
      return resolved("Your skills sit in a single section.");
    }

    // Junk / off-target block (e.g. unsubstantiated KEY METRICS). This is a
    // DELETE, not a rewrite. Locate it precisely; if it can be removed, offer
    // Remove. If it genuinely didn't survive the clean parse, ✓. If we can't
    // confidently locate it, route to review — never a blind delete or a false ✓.
    case "irrelevant_block": {
      const reason = "Unsubstantiated / off-target content a recruiter will skim past.";
      const res = locateGapInCv(gap, cv);
      if (res.ref && isRemovableRef(res.ref)) {
        return action(reason, { kind: "remove_element", target: res.ref, label: gap?.label || "this block" }, "Remove this");
      }
      if (res.ref) {
        return action(reason, { kind: "focus_field", field: sectionForRef(res.ref) }, "Review & edit");
      }
      if (res.probeTokenCount >= 3 && res.score < 0.3) {
        return resolved("Removed in the clean rebuild.");
      }
      return review("Couldn't auto-locate this block — open your CV to check.", { kind: "focus_field", field: "experience" }, "Review");
    }

    case "date_format": {
      const exp = Array.isArray(cv.experience) ? cv.experience : [];
      if (exp.length === 0) {
        return review("No experience entries to date-check yet.", { kind: "focus_field", field: "experience" }, "Review");
      }
      const idx = exp.findIndex((e) => !(String(e?.startDate || "").trim() || String(e?.period || "").trim()));
      if (idx === -1) return resolved("Every role carries a parseable date.");
      return action("Some roles are missing dates.", { kind: "open_experience", expIndex: idx }, "Add dates");
    }

    default: {
      // Unknown: never auto-✓. But if the evidence pins it to a specific role,
      // OPEN that exact entry in edit mode (not the top of Work History).
      const res = locateGapInCv(gap, cv);
      const ref = res.ref;
      if (ref && (ref.kind === "bullet" || (ref.kind === "field" && ref.field === "experience"))) {
        const isDate = /\bdate|dated|future|expire|\b(19|20)\d{2}\b/i.test(`${gap?.label || ""} ${gap?.evidence || ""}`);
        return review(
          isDate ? "Open this role and fix its dates." : "Open this role and review it.",
          { kind: "open_experience", expIndex: ref.expIndex, focus: isDate ? "dates" : "points" },
          isDate ? "Fix date" : "Open role",
        );
      }
      return review("Open the relevant section and confirm this reads cleanly.", { kind: "focus_field", field: "experience" }, "Review");
    }
  }
}
