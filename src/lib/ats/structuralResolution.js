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

// Every category is one of two CLASSES:
//   Class A (hard, checkable) — code can detect AND verify the fix, so these
//     auto-clear on re-validation. cls "A".
//   Class B (subjective critique) — no code can verify "is this now good?", so
//     these route to the exact spot and the USER clears them (Mark reviewed).
//     cls "B".
export const STRUCTURAL_CATEGORIES = [
  // Class A
  "letter_spacing",
  "tables_columns",
  "page_break_marker",
  "image_or_nontext",
  "decorative_fonts",
  "missing_contact",
  "split_skills",
  "irrelevant_block",
  "future_date",
  "no_end_date",
  "malformed_data",
  "date_format",
  // Class B
  "skills_mix",
  "weak_bullet",
  "thin_education",
  "tenure_gap",
  "unknown",
];

// Human section labels for building SPECIFIC guidance ("Open your Education…").
const SECTION_LABEL = {
  contact: "Contact",
  summary: "Summary",
  experience: "Work History",
  education: "Education",
  skills: "Skills",
  technicalSkills: "Technical Skills",
  languages: "Languages",
  certifications: "Certifications",
  personalDetails: "Personal Details",
};

// A role dated in the future ("Future-dated employment start", "beyond the
// current date", "starts in the future"). Distinct from date_format (which is
// about formatting/order), because this one is VERIFIABLE against today's date.
const FUTURE_DATE_RE = /(future[- ]?dated|future date|dated in the future|beyond (?:the )?(?:current|today'?s) date|start(?:s|ing)? in the future|future start)/i;
// "Current role has no end date" — a FALSE POSITIVE: a current role correctly
// shows "Present". Kept separate so we can auto-resolve it.
const NO_END_DATE_RE = /(no end date|missing end date|without (?:an? )?end date|end date (?:is )?(?:missing|absent|empty|blank)|lacks? an? end date|end date not (?:set|provided))/i;
// Content renders as a raw object / non-readable blob.
const MALFORMED_RE = /(\[object object\]|raw (?:javascript |js )?object|object literal|json (?:blob|dump|object)|not (?:human|machine|ats)[- ]?readable|renders? as (?:a )?(?:raw )?object|unparse|unreadable text|garbled)/i;

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
  if (FUTURE_DATE_RE.test(original)) return "future_date";
  if (NO_END_DATE_RE.test(original)) return "no_end_date";
  if (MALFORMED_RE.test(original)) return "malformed_data";
  if (hasSpacedLetters(original)) return "letter_spacing";
  if (/(letter[- ]?spac|kerning|tracking|expanded text|spaced[- ]?out)/.test(s)) return "letter_spacing";
  if (/(key metrics|unsubstantiated|irrelevant block|buzzword|filler|fluff|vanity metric|padding|inflated|off[- ]?topic)/.test(s)) return "irrelevant_block";
  if (/skill/.test(s) && /(split|two |multiple|separate|duplicat|scatter|second section)/.test(s)) return "split_skills";
  // Class B (subjective) — these are AI critiques no code can verify as "fixed".
  if (/skill/.test(s) && /(mismatch|not (relevant|aligned|matched|targeted)|don'?t match|generic|irrelevant|missing (keyword|skill)|weak|align|wrong|selection|not tailored|too broad)/.test(s)) return "skills_mix";
  if (/(bullet|achievement|accomplishment|responsibilit|duty|duties|experience point|job description)/.test(s) && /(weak|vague|generic|passive|no (metric|number|result|impact|quantif)|not quantif|unquantif|lacks? (impact|detail|metric|result)|stronger|not measurable|no outcome|not anchored)/.test(s)) return "weak_bullet";
  if (/(education|degree|qualification|academic|schooling)/.test(s) && /(thin|sparse|lacks?|missing|no detail|incomplete|expand|brief|minimal|bare|underdevelop|light)/.test(s)) return "thin_education";
  if (/(tenure|employment gap|career gap|unexplained gap|\bgap (in|between|of|during)|overlapping (dates|roles)|job.?hopp|short (stint|tenure)|ambiguous (tenure|duration|dates|timeline)|duration (unclear|ambiguous)|timeline (unclear|gap))/.test(s)) return "tenure_gap";
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
// technicalSkills is polymorphic: "" or "Cat: a, b | Cat2: c" (string on disk)
// or [{category, chips[]}] (in-memory). Serialize ANY shape to readable text so
// the collector never sees a raw "[object Object]" — which was both a garbage
// input to the detectors and, more importantly, exactly the kind of artifact a
// scan then flags as "renders as a raw object literal".
export function technicalSkillsToText(ts) {
  if (!ts) return "";
  if (typeof ts === "string") return ts.trim();
  if (Array.isArray(ts)) {
    return ts
      .map((g) => {
        if (g && typeof g === "object") {
          const cat = String(g.category || "").trim();
          const chips = Array.isArray(g.chips) ? g.chips.filter(Boolean).join(", ") : "";
          return cat ? (chips ? `${cat}: ${chips}` : cat) : chips;
        }
        return String(g == null ? "" : g).trim();
      })
      .filter(Boolean)
      .join(" | ");
  }
  return "";
}

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
  push("technicalSkills", technicalSkillsToText(cv?.technicalSkills));
  push("languages", cv?.languages);
  return out;
}

// `cls`: "A" = code verifies the fix (auto-clears); "B" = subjective critique
// the USER clears (Mark reviewed). Defaults: a resolved/action verdict is an
// auto-verifiable Class A; a `review` verdict is a subjective Class B. Pass an
// explicit cls to override (a few Class A checks legitimately return `review`).
const resolved = (reason, cls = "A") => ({ resolved: true, status: "resolved", reason, action: null, cta: null, cls });
const action = (reason, act, cta, cls = "A") => ({ resolved: false, status: "action", reason, action: act, cta, cls });
const review = (reason, act, cta, cls = "B") => ({ resolved: false, status: "review", reason, action: act, cta, cls });

// "Senior Engineer at Globex" for specific guidance; "" when unknown.
function roleName(cv, idx) {
  const e = (Array.isArray(cv?.experience) ? cv.experience : [])[idx];
  const r = String(e?.role || "").trim();
  const c = String(e?.company || "").trim();
  if (r && c) return `${r} at ${c}`;
  return r || c || "";
}

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

// Parse "MM/YYYY" (tolerating "M/YYYY" and stray spaces) → { y, m } or null.
function parseMonthYear(s) {
  const m = String(s || "").trim().match(/^(\d{1,2})\s*\/\s*(\d{4})$/);
  if (!m) return null;
  const mm = parseInt(m[1], 10);
  const yy = parseInt(m[2], 10);
  if (mm < 1 || mm > 12) return null;
  return { y: yy, m: mm };
}

// Strictly after the current month? Compared against the REAL current date, so
// a date nine months in the past is never "future".
function isFutureMonth(d, now) {
  if (!d) return false;
  const ny = now.getFullYear();
  const nm = now.getMonth() + 1;
  return d.y > ny || (d.y === ny && d.m > nm);
}

// Index of the first experience whose start (or a concrete, non-"Present" end)
// is genuinely in the future, else -1. This is the live re-validation: fix the
// date and the next call returns -1 → the gap resolves.
function findFutureDatedExperience(cv, now) {
  const exp = Array.isArray(cv?.experience) ? cv.experience : [];
  for (let i = 0; i < exp.length; i++) {
    const e = exp[i] || {};
    if (isFutureMonth(parseMonthYear(e.startDate), now)) return i;
    const endRaw = String(e.endDate || "").trim();
    if (endRaw && !/present|current|now|ongoing/i.test(endRaw) && isFutureMonth(parseMonthYear(endRaw), now)) {
      return i;
    }
  }
  return -1;
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

  // Future-dated role — the ONE structural gap that's verifiable against TODAY,
  // so it must re-validate live off the current resume (the frozen scan text is
  // never trusted for the verdict). Matched off the label too, so a scan stored
  // before this rule existed still clears once the date is corrected. A start
  // (or a concrete, non-"Present" end) after the current month is the problem;
  // a date in the past or present is fine, whatever the scan claimed.
  if (category === "future_date" || FUTURE_DATE_RE.test(`${gap?.label || ""} ${gap?.evidence || ""}`)) {
    const exp = Array.isArray(cv.experience) ? cv.experience : [];
    if (exp.length === 0) {
      return resolved("No dated roles that could be in the future.");
    }
    const now = ctx.now instanceof Date ? ctx.now : new Date();
    const idx = findFutureDatedExperience(cv, now);
    if (idx === -1) {
      return resolved("Every role starts in the past or present — no future dates.");
    }
    return action(
      "A role starts in the future — set it to when you actually started.",
      { kind: "open_experience", expIndex: idx, focus: "startDate" },
      "Fix date",
    );
  }

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
        ? review("Confirm an ATS single-column layout.", { kind: "switch_template", templateId: rec.id }, `Switch to ${rec.name}`, "A")
        : review("Confirm your template is an ATS single-column layout.", { kind: "goto_template" }, "Choose ATS template", "A");
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
      const hasTech = !!technicalSkillsToText(cv.technicalSkills);
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
        return review("Add your work history so the dates can be checked.", { kind: "focus_field", field: "experience" }, "Add experience", "A");
      }
      const idx = exp.findIndex((e) => !(String(e?.startDate || "").trim() || String(e?.period || "").trim()));
      if (idx === -1) return resolved("Every role carries a parseable date.");
      return action(`Add dates to ${roleName(cv, idx) || "the role that's missing them"}.`, { kind: "open_experience", expIndex: idx, focus: "dates" }, "Add dates");
    }

    // ── Class A: no_end_date — a FALSE POSITIVE for a current role. ─────────
    case "no_end_date": {
      const exp = Array.isArray(cv.experience) ? cv.experience : [];
      // A current role correctly has NO end date (it renders "Present"). Only a
      // PAST role missing its end date is a real gap.
      const idx = exp.findIndex((e) => {
        const present = e?.present === true || /present|current|now|ongoing/i.test(String(e?.endDate || ""));
        return !present && !String(e?.endDate || "").trim() && String(e?.startDate || e?.period || "").trim();
      });
      if (idx === -1) return resolved("Your current role correctly shows Present — a current role needs no end date.");
      return action(`Add an end date to ${roleName(cv, idx) || "the past role"} — it isn't your current job.`, { kind: "open_experience", expIndex: idx, focus: "dates" }, "Add end date");
    }

    // ── Class A: malformed_data — raw object / unreadable text. ────────────
    case "malformed_data": {
      const bad = fields.find((f) => /\[object object\]/.test(f.text.toLowerCase()) || /^\s*[{[]/.test(f.text));
      if (!bad) return resolved("Every section renders as clean, readable text.");
      const sec = sectionForField(bad.field);
      return action(`Your ${SECTION_LABEL[sec] || "content"} isn't rendering as readable text — re-enter it.`, { kind: "focus_field", field: sec }, "Fix formatting");
    }

    // ── Class B: subjective critiques — route to the EXACT spot, USER clears ─
    case "skills_mix":
      return review("Line your skills up with the target role — swap generic ones for the exact tools the job description names.", { kind: "focus_field", field: "skills" }, "Open skills");

    case "weak_bullet": {
      const res = locateGapInCv(gap, cv);
      const ref = res.ref;
      if (ref && (ref.kind === "bullet" || (ref.kind === "field" && ref.field === "experience"))) {
        const rn = roleName(cv, ref.expIndex);
        return review(`Open ${rn || "this role"} and rewrite this line around a result — a number, a scale, or an outcome, not just the duty.`, { kind: "open_experience", expIndex: ref.expIndex, focus: "points" }, "Open role");
      }
      return review("Rewrite this bullet around a concrete result — a number, a scale, or an outcome.", { kind: "focus_field", field: "experience" }, "Open experience");
    }

    case "thin_education": {
      const edu = Array.isArray(cv.education) ? cv.education : [];
      if (edu.length === 0) {
        return review("Add your education — degree, institution, and dates.", { kind: "focus_field", field: "education" }, "Add education");
      }
      return review("Open your education and fill in the missing detail — field of study, dates, and any honours or relevant coursework.", { kind: "open_education", eduIndex: 0 }, "Open education");
    }

    case "tenure_gap": {
      const res = locateGapInCv(gap, cv);
      const idx = res.ref && res.ref.kind !== "section" && typeof res.ref.expIndex === "number" ? res.ref.expIndex : 0;
      const rn = roleName(cv, idx);
      return review(`Open ${rn || "the role"} and make the dates unambiguous — a clear start and end (or Present) so there's no unexplained gap.`, { kind: "open_experience", expIndex: idx, focus: "dates" }, "Open role");
    }

    default: {
      // Unclassified AI critique (Class B). Route to the EXACT located spot and
      // repeat WHAT to address — never the old generic "confirm this reads
      // cleanly" placeholder. The user clears it with Mark reviewed.
      const critique = String(gap?.label || "this point").trim().replace(/\.$/, "");
      const res = locateGapInCv(gap, cv);
      const ref = res.ref;
      if (ref && (ref.kind === "bullet" || (ref.kind === "field" && ref.field === "experience"))) {
        const rn = roleName(cv, ref.expIndex);
        return review(`Open ${rn || "this role"} and address it: ${critique}.`, { kind: "open_experience", expIndex: ref.expIndex, focus: "points" }, "Open role");
      }
      if (ref && ref.kind === "field") {
        const sec = sectionForField(ref.field);
        return review(`Open your ${SECTION_LABEL[sec] || sec} and address it: ${critique}.`, { kind: "focus_field", field: sec }, "Open section");
      }
      // Can't pin it to one place — still name WHAT to fix, land in Work History.
      return review(`Address this in your CV, then mark it done: ${critique}.`, { kind: "focus_field", field: "experience" }, "Review");
    }
  }
}
