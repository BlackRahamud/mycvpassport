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

// Ordered personal-details entries for template headers (Gulf convention:
// nationality + visa status lead). Returns [{ label, value }] for ONLY the
// filled fields — empty/whitespace values are skipped, never "N/A".
// Twin: buildPersonalDetailsEntries in src/cvShared.js (ESM) — keep the
// field order and trimming identical when changing either.
function buildPersonalDetailsEntries(resume) {
  if (!resume || typeof resume !== "object") return [];
  const defs = [
    ["Nationality", "nationality"],
    ["Visa Status", "visaStatus"],
    ["Date of Birth", "dob"],
    ["Marital Status", "maritalStatus"],
    ["Driving License", "drivingLicense"],
    ["Gender", "gender"],
    ["Availability", "availability"],
    ["Willing to Relocate", "willingToRelocate"],
  ];
  const entries = [];
  for (const [label, key] of defs) {
    const raw = resume[key];
    const value = raw == null ? "" : String(raw).trim();
    if (value) entries.push({ label, value });
  }
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
};
