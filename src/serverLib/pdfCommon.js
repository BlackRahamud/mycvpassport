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

function stripLeadingBulletToken(str) {
  return String(str ?? "")
    .replace(/^\s*[-•*]\s*/, "")
    .trim();
}

function isNewBulletLine(line) {
  return /^\s*[-•*]/.test(line);
}

function mergeContinuationLines(lines) {
  if (lines.length === 0) return [];
  const blocks = [];
  let cur = stripLeadingBulletToken(lines[0]);

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (isNewBulletLine(line)) {
      blocks.push(cur);
      cur = stripLeadingBulletToken(line);
    } else {
      cur = `${cur} ${stripLeadingBulletToken(line)}`.trim();
    }
  }
  blocks.push(cur);
  return blocks;
}

function splitInlineBulletSegments(block) {
  const t = String(block ?? "").trim();
  if (!t) return [];
  return t
    .split(/\s*•\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function splitExperiencePointsForPreview(text) {
  if (text == null || text === "") return [];

  const rawLines = String(text)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (rawLines.length === 0) return [];

  const mergedBlocks = mergeContinuationLines(rawLines);
  const out = [];
  for (const block of mergedBlocks) {
    out.push(...splitInlineBulletSegments(block));
  }

  return out.map((s) => s.replace(/^•\s*/, "").trim()).filter(Boolean);
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
  normalizeCvForPdf,
  buildPersonalDetailsEntries,
};
