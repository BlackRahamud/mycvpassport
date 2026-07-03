// Shared CV / template data and pure helpers (split from App.js)

export const TEMPLATES = [
  { id: 1, name: "Modern Emerald", tier: "free", color: "#1a1a2e", accent: "#e94560", desc: "Bold banner header", layout: "banner" },
  { id: 2, name: "Dubai Modern", tier: "free", color: "#0f3460", accent: "#00b4d8", desc: "Two-column split", layout: "twocol" },
  { id: 3, name: "Arabia Pro", tier: "free", color: "#1a1a2e", accent: "#1B3A6B", desc: "Sidebar with skills column", layout: "sidebar" },
  { id: 4, name: "Executive Gold", tier: "premium", color: "#1a0a00", accent: "#d4a017", desc: "Timeline experience style", layout: "timeline" },
  { id: 5, name: "Gulf Executive", tier: "premium", color: "#0D1B2A", accent: "#C9A84C", desc: "Dark navy with gold accents", layout: "gulf-exec" },
  { id: 6, name: "Banking & Finance", tier: "premium", color: "#000000", accent: "#000000", desc: "Ultra-clean ATS-first serif", layout: "banking" },
  { id: 7, name: "Compact Pro", tier: "premium", color: "#14213D", accent: "#0D7377", desc: "Dense teal layout, max content", layout: "compact-pro" },
  { id: 8, name: "Creative Sidebar", tier: "premium", color: "#2D2D2D", accent: "#E8533F", desc: "Coral sidebar for Sales/RE", layout: "creative" },
  { id: 9, name: "Hospitality & Service", tier: "premium", color: "#6B4C3B", accent: "#6B4C3B", desc: "Warm tone for hotels & F&B", layout: "hospitality" },
  { id: 10, name: "ATS International", tier: "premium", color: "#0F172A", accent: "#0EA5E9", desc: "Two-column UAE ATS · sky-blue accent · transform default", layout: "ats-intl", tags: ["ATS Friendly", "Popular in UAE", "Two Column"] },
  { id: 11, name: "Tech & IT Pro", tier: "premium", color: "#1E2D45", accent: "#4A90D9", desc: "Dark slate sidebar for tech roles", layout: "tech-it" },
  { id: 12, name: "Flat Split", tier: "premium", color: "#F5E6E0", accent: "#000000", desc: "Flat split layout · beige header, grey sidebar", layout: "flat-split" },
  { id: 13, name: "Finance", tier: "premium", color: "#000000", accent: "#000000", desc: "Dense finance & accounting · UAE banking", layout: "finance", tags: ["ATS Friendly", "Popular in UAE", "Banking & Finance"] },
  { id: 14, name: "Figma Mirror", tier: "premium", color: "#1e293b", accent: "#60a5fa", desc: "2-page Figma mirror · 595×842px", layout: "figma-mirror", tags: ["2 Pages", "Figma Export"] },
  { id: 15, name: "Slate Carbon", tier: "premium", color: "#111827", accent: "#6B7280", desc: "Dark slate header, clean serif name", layout: "slate-carbon" },
  { id: 16, name: "Crimson Edge", tier: "premium", color: "#0F0F0F", accent: "#DC2626", desc: "Red accent bar, bold creative edge", layout: "crimson-edge" },
  { id: 17, name: "Forest Pro", tier: "premium", color: "#14532D", accent: "#16A34A", desc: "Deep green header, modern professional", layout: "forest-pro" },
  { id: 18, name: "Midnight Gold", tier: "premium", color: "#0A0A0A", accent: "#D97706", desc: "Dark header with amber gold accent", layout: "midnight-gold" },
  { id: 19, name: "UAE ATS", tier: "free", color: "#FFFFFF", accent: "#000000", desc: "Pure ATS single-column · UAE/GCC + India focused", layout: "uae-ats", tags: ["ATS Friendly", "Single Column", "Popular in UAE"] },
];

/** Filter keys → TEMPLATES[].id (numeric ids 1–14 are the canonical template IDs in this app). */
export const TEMPLATE_FILTER_IDS = {
  popular: [1, 2, 3, 4, 5],
  simple: [1, 2, 3, 6, 7, 15],
  modern: [4, 5, 8, 9, 10, 17],
  creative: [11, 12, 13, 14, 16, 18],
};

export const EMPTY_EXP = {
  company: "",
  role: "",
  location: "",
  period: "",
  points: "",
  startDate: "",
  endDate: "",
  present: false,
};

export const EMPTY_EDU = {
  school: "",
  degree: "",
  year: "",
  fieldOfStudy: "",
  startDate: "",
  endDate: "",
  location: "",
};

export const EMPTY_CERT = {
  name: "",
  issuer: "",
  year: "",
};

/* A truly empty starting CV. The old prefills (Dubai UAE, English/Hindi,
   Immediately Available, relocate Yes) made a stranger's first builder
   visit open on someone else's assumptions — fields show placeholders
   instead; the user types their own facts. Never put personal-looking
   data here: an anonymous /builder session must contain no real values. */
export const EMPTY_RESUME = {
  name: "",
  email: "",
  phone: "",
  linkedin: "",
  location: "",
  title: "",
  summary: "",
  nationality: "",
  visaStatus: "",
  dob: "",
  gender: "",
  maritalStatus: "",
  experience: [],
  education: [],
  skills: "",
  languages: "",
  certifications: [],
  technicalSkills: "",
  projects: "",
  volunteerWork: "",
  publications: "",
  builderExtraSectionIds: [],
  customFields: [],
  availability: "",
  drivingLicense: "",
  willingToRelocate: "",
  references: "References available upon request",
};

/* Legacy-draft scrub. Older builds shipped EMPTY_RESUME with prefilled
   values; those defaults live on inside users' persisted localStorage
   drafts (7-day TTL) and resurface as "why does my fresh CV speak Hindi?".
   Blank a field ONLY when it verbatim-equals the old default — a user who
   actually typed one of these exact strings loses nothing but a re-type,
   while every stale draft stops leaking assumptions. */
const LEGACY_PREFILLS = {
  languages: ["English, Hindi"],
  location: ["Dubai, UAE"],
  availability: ["Immediately Available"],
  willingToRelocate: ["Yes"],
};

export function scrubLegacyDraftPrefills(cv) {
  if (!cv || typeof cv !== "object") return cv;
  let changed = false;
  const next = { ...cv };
  Object.entries(LEGACY_PREFILLS).forEach(([field, legacyValues]) => {
    const v = typeof next[field] === "string" ? next[field].trim() : next[field];
    if (legacyValues.includes(v)) {
      next[field] = "";
      changed = true;
    }
  });
  return changed ? next : cv;
}

export const OPTIONAL_BUILDER_SECTIONS = [
  { id: "certifications", label: "Certifications", field: "certifications", multiline: false },
  { id: "personalDetails", label: "Personal Details", custom: true },
  { id: "projects", label: "Projects", field: "projects", multiline: true },
  { id: "volunteer", label: "Volunteer Work", field: "volunteerWork", multiline: true },
  { id: "publications", label: "Publications", field: "publications", multiline: true },
];

export function normalizeCertificationsArray(raw) {
  if (Array.isArray(raw)) {
    return raw
      .map((c) => {
        if (c == null) return null;
        if (typeof c === "string") {
          const n = c.trim();
          return n ? { ...EMPTY_CERT, name: n } : null;
        }
        return {
          ...EMPTY_CERT,
          name: String(c.name || "").trim(),
          issuer: String(c.issuer || "").trim(),
          year: String(c.year || "").trim(),
        };
      })
      .filter((c) => c && c.name);
  }
  if (typeof raw === "string" && raw.trim()) {
    return raw.split(",").map((s) => ({ ...EMPTY_CERT, name: s.trim() })).filter((c) => c.name);
  }
  return [];
}

/** One line per cert for templates that split by comma */
export function formatCertificationLine(c) {
  if (!c || !c.name) return "";
  const n = c.name.replace(/,/g, " ");
  let s = n;
  if (c.issuer) s += ` — ${String(c.issuer).replace(/,/g, " ")}`;
  if (c.year) s += ` (${c.year})`;
  return s;
}

export function certificationsToCommaString(arr) {
  return normalizeCertificationsArray(arr).map(formatCertificationLine).filter(Boolean).join(", ");
}

export function cvWithTemplateCertifications(cv) {
  if (!cv || typeof cv !== "object") return cv;
  return {
    ...cv,
    certifications: certificationsToCommaString(cv.certifications),
  };
}

// Generic regional-fields escape hatch (research doc sections 1, 12).
// Each entry: { id, icon, name, value, link }. Existing CVs that predate
// this field load with customFields=[]; new transforms populate from
// intake/source via the parse + run prompts. Templates that render this
// loop over the array; templates that don't simply ignore it.
export function normalizeCustomFieldsArray(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const name = String(item.name || "").trim();
      const value = String(item.value || "").trim();
      if (!name || !value) return null;
      const id = String(item.id || "").trim() || null;
      const icon = item.icon == null ? null : (String(item.icon).trim() || null);
      const link = item.link == null ? null : (String(item.link).trim() || null);
      return { id, icon, name, value, link };
    })
    .filter(Boolean);
}

// Defensive coercion for fields that templates assume are strings.
// AI-imported CVs (transform import-only mode, Haiku) occasionally return
// arrays or nulls where the builder + templates expect strings. Without
// this, e.g. `cv.skills.split(",")` in Template1ModernEmerald crashes the
// preview. Joins arrays with the supplied separator (comma for CSV-shaped
// fields, newline for experience.points), nulls become "".
function toStrField(v, joinWith = ", ") {
  if (typeof v === "string") return v;
  if (v == null) return "";
  if (Array.isArray(v)) return v.filter((x) => x != null && x !== "").map((x) => String(x)).join(joinWith);
  return String(v);
}

// languages-specific flattener: Haiku occasionally returns objects per
// language ({ name: "English", level: "Fluent" } or similar). toStrField
// would render those as "[object Object]". This helper produces the
// canonical "English (Fluent), Hindi (Native)" string regardless of
// whether items arrived as strings, {name, level}, {language, proficiency},
// or any common shape.
export function flattenLanguagesField(v) {
  if (typeof v === "string") return v;
  if (v == null) return "";
  if (!Array.isArray(v)) return String(v);
  return v
    .map((item) => {
      if (item == null) return "";
      if (typeof item === "string") return item.trim();
      if (typeof item !== "object") return String(item).trim();
      const name = String(item.name || item.language || item.lang || "").trim();
      const level = String(
        item.level || item.proficiency || item.fluency || item.skill_level || ""
      ).trim();
      if (!name) return "";
      return level ? `${name} (${level})` : name;
    })
    .filter(Boolean)
    .join(", ");
}

// Gulf-location detection — matches UAE emirates, GCC capitals, AED, and
// "GCC" itself. Used by the builder to auto-surface the Personal Details
// section for Gulf-bound users on first builder load.
const GULF_LOCATION_SIGNALS = [
  "uae", "u.a.e",
  "dubai", "abu dhabi", "sharjah", "ajman",
  "ras al khaimah", "ras al-khaimah", "fujairah",
  "umm al quwain", "umm al-quwain", "al ain",
  "aed", "dirham",
  "qatar", "doha",
  "saudi", "ksa", "riyadh", "jeddah", "mecca", "medina", "dammam", "al khobar",
  "kuwait",
  "bahrain", "manama",
  "oman", "muscat", "salalah",
  "gcc", "gulf",
];

export function isGulfLocation(location) {
  if (!location || typeof location !== "string") return false;
  const lower = location.toLowerCase();
  return GULF_LOCATION_SIGNALS.some((signal) => lower.includes(signal));
}

// Ordered personal-details entries for template headers (Gulf convention:
// nationality + visa status lead). Returns [{ label, value }] for ONLY the
// filled fields — empty/whitespace values are skipped, never "N/A".
// Twin: buildPersonalDetailsEntries in src/serverLib/pdfCommon.js (CommonJS)
// — keep the field order and trimming identical when changing either.
export function buildPersonalDetailsEntries(resume) {
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

// True iff at least one of the eight Personal Details fields is populated.
// Used by templates to skip rendering the section header + body when the
// user hasn't filled any of them — same rule as how Projects / Volunteer
// already work.
export function hasAnyPersonalDetail(cv) {
  if (!cv || typeof cv !== "object") return false;
  const keys = [
    "dob", "gender", "nationality", "maritalStatus",
    "visaStatus", "drivingLicense", "availability", "willingToRelocate",
  ];
  return keys.some((k) => String(cv[k] || "").trim().length > 0);
}

const RESUME_STRING_FIELDS = [
  "name", "email", "phone", "linkedin", "location", "title", "summary",
  "nationality", "visaStatus", "dob", "gender", "maritalStatus",
  "skills", "languages", "technicalSkills",
  "projects", "volunteerWork", "publications",
  "availability", "drivingLicense", "willingToRelocate", "references",
];

const EXP_STRING_FIELDS = ["company", "role", "location", "period", "startDate", "endDate"];
const EDU_STRING_FIELDS = ["school", "degree", "year", "fieldOfStudy", "startDate", "endDate", "location"];

export function normalizeResumeForBuilder(cv) {
  if (!cv || typeof cv !== "object") return { ...EMPTY_RESUME };
  const exp = Array.isArray(cv.experience) ? cv.experience : [];
  const edu = Array.isArray(cv.education) ? cv.education : [];
  const merged = {
    ...EMPTY_RESUME,
    ...cv,
    experience: exp.length
      ? exp.map((e) => {
          const base = { ...EMPTY_EXP, ...(e && typeof e === "object" ? e : {}) };
          for (const k of EXP_STRING_FIELDS) base[k] = toStrField(base[k]);
          base.points = toStrField(base.points, "\n");
          base.present = Boolean(base.present);
          return base;
        })
      : [],
    education: edu.length
      ? edu.map((e) => {
          const base = { ...EMPTY_EDU, ...(e && typeof e === "object" ? e : {}) };
          for (const k of EDU_STRING_FIELDS) base[k] = toStrField(base[k]);
          return base;
        })
      : [],
    certifications: normalizeCertificationsArray(cv.certifications),
    customFields: normalizeCustomFieldsArray(cv.customFields),
    builderExtraSectionIds: Array.isArray(cv.builderExtraSectionIds) ? cv.builderExtraSectionIds : [],
  };
  for (const k of RESUME_STRING_FIELDS) merged[k] = toStrField(merged[k]);
  // languages may arrive as [{name,level}, ...] from Haiku; toStrField
  // would render objects as "[object Object]". Flatten properly here.
  merged.languages = flattenLanguagesField(cv.languages);
  return merged;
}

export function splitCommaItems(str) {
  if (!str || typeof str !== "string") return [];
  return str.split(",").map((s) => s.trim()).filter(Boolean);
}

export function buildExperiencePeriod(e) {
  if (e.startDate || e.endDate || e.present) {
    const end = e.present ? "Present" : (e.endDate || "").trim();
    const start = (e.startDate || "").trim();
    if (start && end) return `${start} – ${end}`;
    if (start) return e.present ? `${start} – Present` : start;
    if (end) return end;
    if (e.present) return "Present";
  }
  return (e.period || "").trim();
}

export function buildEducationYearLine(e) {
  if (e.startDate || e.endDate) {
    const a = (e.startDate || "").trim();
    const b = (e.endDate || "").trim();
    if (a && b) return `${a} – ${b}`;
    return a || b || (e.year || "").trim();
  }
  return (e.year || "").trim();
}

export function builderAtsScore(resume) {
  let s = 0;
  if (resume.name) s += 8;
  if (resume.email) s += 8;
  if (resume.phone) s += 8;
  if (resume.title) s += 10;
  if (resume.nationality) s += 5;
  if (resume.visaStatus) s += 5;
  if (resume.summary?.length > 50) s += 16;
  if (resume.experience?.some((e) => e?.company)) s += 16;
  if (resume.skills?.length > 20) s += 12;
  if (normalizeCertificationsArray(resume.certifications).length > 0) s += 6;
  if (resume.languages) s += 6;
  return s;
}

export function builderAtsBreakdown(resume) {
  const certs = normalizeCertificationsArray(resume.certifications);
  return [
    { pass: Boolean(String(resume.name || "").trim()), text: "Full name filled in" },
    { pass: Boolean(String(resume.email || "").trim()), text: "Email address present" },
    { pass: Boolean(String(resume.phone || "").trim()), text: "Phone number present" },
    { pass: Boolean(String(resume.title || "").trim()), text: "Professional title set" },
    { pass: Boolean(String(resume.nationality || "").trim()), text: "Nationality included" },
    { pass: Boolean(String(resume.visaStatus || "").trim()), text: "Visa status included" },
    { pass: Boolean(resume.summary && resume.summary.length > 50), text: "Professional summary (50+ characters)" },
    { pass: Boolean(resume.experience?.some((e) => e?.company)), text: "At least one work experience entry" },
    { pass: Boolean(resume.skills && resume.skills.length > 20), text: "Core skills list filled out" },
    { pass: certs.length > 0, text: "Certifications added" },
    { pass: Boolean(String(resume.languages || "").trim()), text: "Languages listed" },
  ];
}

export function isCvDataEmptyForTemplateApply(cv) {
  const r = normalizeResumeForBuilder(cv);
  const hasIdentity = String(r.name || "").trim().length > 0 || String(r.email || "").trim().length > 0;
  const hasExp =
    Array.isArray(r.experience) &&
    r.experience.some((e) => String(e?.company || "").trim().length > 0 || String(e?.role || "").trim().length > 0);
  const hasSum = String(r.summary || "").trim().length > 30;
  const hasSkills = String(r.skills || "").trim().length > 10;
  return !hasIdentity && !hasExp && !hasSum && !hasSkills;
}

export function getStrength(cv) {
  if (!cv || typeof cv !== "object") return 0;
  const fields = [
    cv.name,
    cv.title,
    cv.email,
    cv.phone,
    cv.location,
    cv.summary,
    cv.skills,
    cv.languages,
    cv.nationality,
    cv.visaStatus,
    Array.isArray(cv.experience) && cv.experience.some((e) => e?.company || e?.role),
    Array.isArray(cv.education) && cv.education.some((e) => e?.school || e?.degree),
  ];
  const filled = fields.filter(Boolean).length;
  return Math.min(100, Math.round((filled / 12) * 100));
}
