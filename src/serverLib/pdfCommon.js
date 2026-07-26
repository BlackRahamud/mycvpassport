/**
 * Shared helpers for server-side CV → HTML (Puppeteer PDF).
 */

function escapeHtml(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripEmojiPictographs(s) {
  if (s == null) return "";
  return String(s)
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\uFE0F/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// CJS TWIN of src/experiencePointsPreview.js#parseExperiencePoints —
// "each line becomes one bullet". Keep the regex and split rules
// byte-identical with the ESM parser; src/experiencePointsPreview.test.js
// locks the pair. (The old continuation-merge glued a user's plain-Enter
// lines into one run-on paragraph — removed on both sides together.)
const BULLET_LINE = /^\s*(?:[•·*]\s*|[-–]\s+|\d+[.):]\s+)/;

function splitExperiencePointsForPreview(text) {
  if (text == null || text === "") return [];

  const out = [];
  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (BULLET_LINE.test(line)) {
      const stripped = line.replace(BULLET_LINE, "").trim();
      if (stripped) out.push(stripped);
    } else {
      out.push(line);
    }
  }
  return out;
}

function normalizeCertificationsArray(raw) {
  if (Array.isArray(raw)) {
    return raw
      .map((c) => {
        if (c == null) return null;
        if (typeof c === "string") {
          const n = c.trim();
          return n ? { name: n, issuer: "", year: "" } : null;
        }
        return {
          name: String(c.name || "").trim(),
          issuer: String(c.issuer || "").trim(),
          year: String(c.year || "").trim(),
        };
      })
      .filter((c) => c && c.name);
  }
  if (typeof raw === "string" && raw.trim()) {
    return raw.split(",").map((s) => ({ name: s.trim(), issuer: "", year: "" })).filter((c) => c.name);
  }
  return [];
}

function formatCertificationLine(c) {
  if (!c || !c.name) return "";
  const n = c.name.replace(/,/g, " ");
  let s = n;
  if (c.issuer) s += ` — ${String(c.issuer).replace(/,/g, " ")}`;
  if (c.year) s += ` (${c.year})`;
  return s;
}

function certificationsToCommaString(arr) {
  return normalizeCertificationsArray(arr).map(formatCertificationLine).filter(Boolean).join(", ");
}

function cvWithTemplateCertifications(cv) {
  if (!cv || typeof cv !== "object") return cv;
  return {
    ...cv,
    certifications: certificationsToCommaString(cv.certifications),
  };
}

// CJS TWIN of the per-template `technicalSkillsGroupsForTemplate` helpers in
// the client components (e.g. src/Template1ModernEmerald.js). Normalizes
// `cv.technicalSkills` — either the structured [{category, chips[]}] array
// the builder writes, or the legacy pipe-string "A | B | C" — into
// [{category, chips[]}]. Returns [] when empty so callers can gate sections.
function technicalSkillsGroups(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((g) => {
        if (!g || typeof g !== "object") return null;
        const chips = Array.isArray(g.chips)
          ? g.chips.map((c) => String(c == null ? "" : c).trim()).filter(Boolean)
          : [];
        if (!chips.length) return null;
        return { category: String(g.category || "").trim() || "Technical Skills", chips };
      })
      .filter(Boolean);
  }
  // Pipe-separated category format the builder writes:
  //   "Frontend: React, Vue | Backend: Node, Python"
  return String(raw)
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((line) => {
      const colonIdx = line.indexOf(":");
      if (colonIdx === -1) return { category: "", chips: [line] };
      return {
        category: line.slice(0, colonIdx).trim(),
        chips: line.slice(colonIdx + 1).split(",").map((c) => c.trim()).filter(Boolean),
      };
    })
    .filter((g) => g.category || g.chips.length > 0);
}

/**
 * Ensures education and languages match preview/React shape for Puppeteer HTML builders.
 * - education: always an array of objects (never null/undefined)
 * - languages: comma-separated string (preview uses string; arrays from legacy data join cleanly)
 */
function normalizeCvForPdf(cv) {
  if (!cv || typeof cv !== "object") return cv;
  let education = cv.education;
  if (!Array.isArray(education)) education = [];
  education = education.map((e) =>
    e && typeof e === "object"
      ? {
          ...e,
          school: e.school != null ? String(e.school) : "",
          degree: e.degree != null ? String(e.degree) : "",
          year: e.year != null ? String(e.year) : "",
        }
      : { school: "", degree: "", year: "" },
  );

  let languages = cv.languages;
  if (Array.isArray(languages)) {
    languages = languages
      .map((x) => (x == null ? "" : String(x).trim()))
      .filter(Boolean)
      .join(", ");
  } else if (languages == null) {
    languages = "";
  } else {
    languages = String(languages);
  }

  return { ...cv, education, languages };
}

// The eight printable Personal Details fields, in Gulf convention order
// (nationality + visa status lead).
// Twin: PERSONAL_DETAIL_DEFS in src/cvShared.js (ESM).
const PERSONAL_DETAIL_DEFS = [
  ["Nationality", "nationality"],
  ["Visa Status", "visaStatus"],
  ["Date of Birth", "dob"],
  ["Marital Status", "maritalStatus"],
  ["Driving License", "drivingLicense"],
  ["Gender", "gender"],
  ["Availability", "availability"],
  ["Willing to Relocate", "willingToRelocate"],
];

// customFields[] ids that are just an imported spelling of a flat field. When
// the flat field is hidden its imported twin must hide with it.
// Twin: CUSTOM_ID_TO_PERSONAL_KEY in src/cvShared.js.
const CUSTOM_ID_TO_PERSONAL_KEY = {
  nationality: "nationality",
  visa_status: "visaStatus",
  date_of_birth: "dob",
  dob: "dob",
  marital_status: "maritalStatus",
  driving_license: "drivingLicense",
  gender: "gender",
  availability: "availability",
  willing_to_relocate: "willingToRelocate",
};

// Labels for imported regional fields that arrive without a .name.
// Twin: REGIONAL_LABEL_FALLBACK in src/cvShared.js.
const REGIONAL_LABEL_FALLBACK = {
  visa_status: "Visa Status",
  notice_period: "Notice Period",
  driving_license: "Driving License",
  date_of_birth: "Date of Birth",
  marital_status: "Marital Status",
  willing_to_relocate: "Willing to Relocate",
  nationality: "Nationality",
  gender: "Gender",
  availability: "Availability",
  nafis_registered: "Nafis Registered",
};

// Is this personal-detail key suppressed from print? Data is untouched either
// way — the toggle controls rendering only.
// Twin: isPersonalDetailHidden in src/cvShared.js.
function isPersonalDetailHidden(resume, key) {
  if (!resume || typeof resume !== "object") return false;
  const hidden = resume.hiddenPersonalDetails;
  return Array.isArray(hidden) && hidden.includes(key);
}

/* Imported customFields[] as printable { label, value } entries, so no custom
   field the user provided is silently dropped from the CV.
   Pass { excludeRegionalTwins: true } from a template that already renders the
   regional fields itself (T10, T11) so an imported "nationality" doesn't print
   a second time next to the flat one.
   Twin: buildCustomFieldEntries in src/cvShared.js. */
function buildCustomFieldEntries(resume, opts) {
  if (!resume || typeof resume !== "object") return [];
  if (!Array.isArray(resume.customFields)) return [];
  const excludeTwins = Boolean(opts && opts.excludeRegionalTwins);
  const entries = [];
  for (const f of resume.customFields) {
    if (!f || typeof f !== "object") continue;
    const id = String(f.id || "").trim();
    const label = String(f.name || "").trim() || REGIONAL_LABEL_FALLBACK[id] || "";
    const value = f.value == null ? "" : String(f.value).trim();
    if (!label || !value) continue;
    const twin = CUSTOM_ID_TO_PERSONAL_KEY[id];
    if (twin && isPersonalDetailHidden(resume, twin)) continue;
    if (twin && excludeTwins) continue;
    entries.push({ label, value });
  }
  return entries;
}

// Ordered personal-details entries for template headers, followed by any
// imported custom fields. Returns [{ label, value }] for ONLY the filled,
// non-hidden fields — empty/whitespace values are skipped, never "N/A".
// De-duped by label so a custom field repeating a flat one prints once.
// Twin: buildPersonalDetailsEntries in src/cvShared.js (ESM) — keep the
// field order, hide rule and trimming identical when changing either.
function buildPersonalDetailsEntries(resume) {
  if (!resume || typeof resume !== "object") return [];
  const entries = [];
  const seen = new Set();
  const push = (rawLabel, rawValue) => {
    const label = String(rawLabel == null ? "" : rawLabel).trim();
    const value = String(rawValue == null ? "" : rawValue).trim();
    if (!label || !value) return;
    const key = label.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (seen.has(key)) return;
    seen.add(key);
    entries.push({ label, value });
  };
  for (const [label, key] of PERSONAL_DETAIL_DEFS) {
    if (isPersonalDetailHidden(resume, key)) continue;
    push(label, resume[key]);
  }
  for (const e of buildCustomFieldEntries(resume)) push(e.label, e.value);
  return entries;
}

module.exports = {
  escapeHtml,
  stripEmojiPictographs,
  splitExperiencePointsForPreview,
  cvWithTemplateCertifications,
  technicalSkillsGroups,
  normalizeCvForPdf,
  buildPersonalDetailsEntries,
  buildCustomFieldEntries,
  isPersonalDetailHidden,
  PERSONAL_DETAIL_DEFS,
  REGIONAL_LABEL_FALLBACK,
};
