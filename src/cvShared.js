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
  { id: 10, name: "ATS International", tier: "premium", color: "#000000", accent: "#333333", desc: "Pure ATS — zero colour, max score", layout: "ats-intl" },
  { id: 11, name: "Tech & IT Pro", tier: "premium", color: "#1E2D45", accent: "#4A90D9", desc: "Dark slate sidebar for tech roles", layout: "tech-it" },
  { id: 12, name: "Flat Split", tier: "premium", color: "#F5E6E0", accent: "#000000", desc: "Flat split layout · beige header, grey sidebar", layout: "flat-split" },
  { id: 13, name: "Finance", tier: "premium", color: "#000000", accent: "#000000", desc: "Dense finance & accounting · UAE banking", layout: "finance", tags: ["ATS Friendly", "Popular in UAE", "Banking & Finance"] },
  { id: 14, name: "Figma Mirror", tier: "premium", color: "#1e293b", accent: "#60a5fa", desc: "2-page Figma mirror · 595×842px", layout: "figma-mirror", tags: ["2 Pages", "Figma Export"] },
  { id: 15, name: "Slate Carbon", tier: "premium", color: "#111827", accent: "#6B7280", desc: "Dark slate header, clean serif name", layout: "slate-carbon" },
  { id: 16, name: "Crimson Edge", tier: "premium", color: "#0F0F0F", accent: "#DC2626", desc: "Red accent bar, bold creative edge", layout: "crimson-edge" },
  { id: 17, name: "Forest Pro", tier: "premium", color: "#14532D", accent: "#16A34A", desc: "Deep green header, modern professional", layout: "forest-pro" },
  { id: 18, name: "Midnight Gold", tier: "premium", color: "#0A0A0A", accent: "#D97706", desc: "Dark header with amber gold accent", layout: "midnight-gold" },
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

export const EMPTY_RESUME = {
  name: "",
  email: "",
  phone: "",
  location: "Dubai, UAE",
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
  languages: "English, Hindi",
  certifications: [],
  technicalSkills: "",
  projects: "",
  volunteerWork: "",
  publications: "",
  builderExtraSectionIds: [],
  availability: "Immediately Available",
  drivingLicense: "",
  willingToRelocate: "Yes",
  references: "References available upon request",
};

export const OPTIONAL_BUILDER_SECTIONS = [
  { id: "certifications", label: "Certifications", field: "certifications", multiline: false },
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

export function normalizeResumeForBuilder(cv) {
  if (!cv || typeof cv !== "object") return { ...EMPTY_RESUME };
  const exp = Array.isArray(cv.experience) ? cv.experience : [];
  const edu = Array.isArray(cv.education) ? cv.education : [];
  return {
    ...EMPTY_RESUME,
    ...cv,
    experience: exp.length ? exp.map((e) => ({ ...EMPTY_EXP, ...e })) : [],
    education: edu.length ? edu.map((e) => ({ ...EMPTY_EDU, ...e })) : [],
    certifications: normalizeCertificationsArray(cv.certifications),
    builderExtraSectionIds: Array.isArray(cv.builderExtraSectionIds) ? cv.builderExtraSectionIds : [],
    projects: cv.projects ?? "",
    volunteerWork: cv.volunteerWork ?? "",
    publications: cv.publications ?? "",
  };
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
