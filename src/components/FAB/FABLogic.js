import {
  isGarbage,
  isPhoneNumber,
  isValidName,
  GCC_CITIES,
  INDIA_CITIES,
  EDUCATION_KEYWORDS,
  LANGUAGE_LIST,
  ACTION_VERBS,
  FAB_VALIDATION,
} from "./FABValidationData";
import { getGatekeeperData, invalidateGatekeeperCache } from "../../services/gatekeeper";

export const FAB_MEMORY_KEY = "cvp_fab_memory";
export const ANON_DOWNLOADS_KEY = "cvp_anon_downloads";

const FREE_DOWNLOAD_LIMIT = 1;

/** @type {{ lastAction: string | null, lastActionAt: string | null, lastTemplateId: string | null, lastTabVisited: string | null, sessionCount: number, lastAtsScore: number | null, hasVisitedCoverLetter: boolean, pendingAtsMilestone: 70 | 90 | null, firstVisitDone: boolean }} */
const DEFAULT_FAB_MEMORY = {
  lastAction: null,
  lastActionAt: null,
  lastTemplateId: null,
  lastTabVisited: null,
  sessionCount: 0,
  lastAtsScore: null,
  hasVisitedCoverLetter: false,
  pendingAtsMilestone: null,
  firstVisitDone: false,
};

/** Maps Progress Coach chip labels → builder section keys (or "personal" for the always-visible card). */
export const PROGRESS_COACH_LABEL_TO_NAV_KEY = {
  "Personal Info": "personal",
  "Work Experience": "experience",
  "Education": "education",
  Skills: "skills",
  Summary: "summary",
};

export const GATEKEEPER_FALLBACK = {
  canDownload: false,
  downloadsUsed: 0,
  downloadsLimit: FREE_DOWNLOAD_LIMIT,
  isPaidUser: false,
  planName: "Free",
  isSignedIn: false,
  blockerReason: null,
};

export const PROGRESS_COACH_FALLBACK = {
  completionPercent: 0,
  missingSections: [],
  totalSections: 5,
  completedSections: 0,
  hasCV: false,
};

function safeLen(s) {
  return String(s ?? "").replace(/\s+/g, " ").trim().length;
}

function parseFabMemory(raw) {
  try {
    if (!raw || typeof raw !== "string") return { ...DEFAULT_FAB_MEMORY };
    const o = JSON.parse(raw);
    if (!o || typeof o !== "object") return { ...DEFAULT_FAB_MEMORY };
    const pending = o.pendingAtsMilestone;
    const pendingOk = pending === 70 || pending === 90 ? pending : null;
    const lastAtsRaw = o.lastAtsScore;
    const lastAtsNum =
      lastAtsRaw == null
        ? null
        : Number.isFinite(Number(lastAtsRaw))
          ? Number(lastAtsRaw)
          : DEFAULT_FAB_MEMORY.lastAtsScore;
    return {
      ...DEFAULT_FAB_MEMORY,
      lastAction: typeof o.lastAction === "string" ? o.lastAction : o.lastAction === null ? null : DEFAULT_FAB_MEMORY.lastAction,
      lastActionAt: typeof o.lastActionAt === "string" ? o.lastActionAt : o.lastActionAt === null ? null : DEFAULT_FAB_MEMORY.lastActionAt,
      lastTemplateId: typeof o.lastTemplateId === "string" ? o.lastTemplateId : o.lastTemplateId === null ? null : DEFAULT_FAB_MEMORY.lastTemplateId,
      lastTabVisited: typeof o.lastTabVisited === "string" ? o.lastTabVisited : o.lastTabVisited === null ? null : DEFAULT_FAB_MEMORY.lastTabVisited,
      sessionCount: Number.isFinite(Number(o.sessionCount)) ? Math.max(0, Math.floor(Number(o.sessionCount))) : DEFAULT_FAB_MEMORY.sessionCount,
      lastAtsScore: lastAtsNum,
      hasVisitedCoverLetter: o.hasVisitedCoverLetter === true,
      pendingAtsMilestone: pendingOk,
      firstVisitDone: o.firstVisitDone === true,
    };
  } catch {
    return { ...DEFAULT_FAB_MEMORY };
  }
}

function writeFabMemoryRaw(obj) {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(FAB_MEMORY_KEY, JSON.stringify(obj));
  } catch {
    /* ignore */
  }
}

/**
 * Merge partial updates into cvp_fab_memory (localStorage).
 * @param {Partial<typeof DEFAULT_FAB_MEMORY>} update
 */
export function writeFabMemory(update) {
  if (!update || typeof update !== "object") return;
  const cur = parseFabMemory(typeof localStorage !== "undefined" ? localStorage.getItem(FAB_MEMORY_KEY) : null);
  const next = { ...cur, ...update };
  writeFabMemoryRaw(next);
  if (typeof window !== "undefined" && update.lastAction === "downloaded") {
    window.dispatchEvent(new CustomEvent("cvp-fab-cv-downloaded"));
  }
}

/**
 * Increment sessionCount on FAB open; returns updated memory.
 */
export function bumpFabSessionOpen() {
  const cur = parseFabMemory(typeof localStorage !== "undefined" ? localStorage.getItem(FAB_MEMORY_KEY) : null);
  const next = { ...cur, sessionCount: cur.sessionCount + 1 };
  writeFabMemoryRaw(next);
  return next;
}

/**
 * @returns {typeof DEFAULT_FAB_MEMORY}
 */
export function getFabMemory() {
  return parseFabMemory(typeof localStorage !== "undefined" ? localStorage.getItem(FAB_MEMORY_KEY) : null);
}

/**
 * Same source as Pricing.jsx (localStorage + ipapi on Pricing) and CoverLetterPage tone/pricing.
 * IN → India pricing; AE / unset → UAE & GCC default.
 * @returns {"IN" | "AE"}
 */
export function getCvpPricingCurrencyCode() {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem("cvp_pricing_currency") === "IN" ? "IN" : "AE";
  } catch {
    return "AE";
  }
}

/** @returns {"morning" | "afternoon" | "evening" | "latenight"} */
export function getFabTimeGreeting() {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 22) return "evening";
  return "latenight";
}

const FAB_TIME_GREETING_COPY = {
  morning: "Morning! Let's make today count.",
  afternoon: "Good afternoon — your CV is ready to work hard.",
  evening: "Good evening — one quick fix before you rest?",
};

/**
 * Single top line for the FAB sheet (idle > session streak > time of day).
 * @param {ReturnType<typeof getFabMemory>} memory
 * @param {typeof PROGRESS_COACH_FALLBACK | null} coach
 */
export function getFabTopGreetingLine(memory, coach) {
  const lastAt = memory?.lastActionAt;
  if (lastAt) {
    const daysIdle = Math.floor((Date.now() - new Date(lastAt).getTime()) / 86400000);
    if (daysIdle >= 7) {
      return "Welcome back! The job market moves fast — let's make sure your CV is still sharp.";
    }
  }
  const sc = memory?.sessionCount ?? 0;
  if (sc === 1) return "Welcome! Let's build something strong.";
  if (sc >= 2 && sc <= 4) {
    if (memory?.lastActionAt) {
      const days = Math.floor((Date.now() - new Date(memory.lastActionAt).getTime()) / 86400000);
      return `Back again — your CV was last updated ${days} day(s) ago.`;
    }
    return null;
  }
  if (sc >= 5) {
    const miss = coach?.missingSections?.[0];
    if (miss) return `You're a regular. Still missing: ${miss}.`;
    return FAB_TIME_GREETING_COPY[getFabTimeGreeting()] ?? null;
  }
  return FAB_TIME_GREETING_COPY[getFabTimeGreeting()] ?? null;
}

/**
 * @param {string[]} missingSections
 * @returns {"Summary" | "Experience" | "Skills" | "Education" | "Languages" | null}
 */
export function getTopNudge(missingSections) {
  if (!Array.isArray(missingSections) || missingSections.length === 0) return null;
  const priority = ["Summary", "Experience", "Skills", "Education", "Languages"];
  for (const p of priority) {
    if (missingSections.some((s) => String(s).toLowerCase().includes(p.toLowerCase()))) {
      return p;
    }
  }
  return null;
}

/** Maps getTopNudge labels → onNavigateToCvSection keys */
export const TOP_NUDGE_TO_NAV_KEY = {
  Summary: "summary",
  Experience: "experience",
  Skills: "skills",
  Education: "education",
  Languages: "languages",
};

/**
 * @param {number} currentScore
 * @param {number | null | undefined} previousScore
 * @returns {70 | 90 | null}
 */
export function checkAtsMilestone(currentScore, previousScore) {
  const c = Number(currentScore);
  if (!Number.isFinite(c) || c <= 0) return null;
  if (previousScore == null || !Number.isFinite(Number(previousScore))) return null;
  const p = Number(previousScore);
  const milestones = [70, 90];
  for (const m of milestones) {
    if (p < m && c >= m) return m;
  }
  return null;
}

/**
 * Whether to show cover-letter cross-sell (builder FAB).
 * @param {ReturnType<typeof getFabMemory>} memory
 */
export function shouldShowCoverLetterCrossSell(memory) {
  if (!memory || memory.lastAction !== "downloaded") return false;
  if (memory.hasVisitedCoverLetter === true) return false;
  if (memory.lastTabVisited === "cover-letter") return false;
  const sc = memory.sessionCount ?? 0;
  return sc >= 3;
}

/**
 * Reorder radial menu options using FAB memory (internal; same visual components).
 * @param {import("./FABContent").FabMenuOption[] | undefined} options
 * @param {ReturnType<typeof getFabMemory>} memory
 */
export function reorderFabMenuOptions(options, memory) {
  if (!options?.length) return options || [];
  const last = memory?.lastAction;
  const copy = [...options];
  if (last === "ats_checked") {
    const idx = copy.findIndex((o) => o.id === "check_pro_ats");
    if (idx > 0) {
      const [x] = copy.splice(idx, 1);
      copy.unshift(x);
    }
  }
  if (last === "downloaded") {
    const idx = copy.findIndex((o) => o.id === "preview_cv" || o.id === "preview_template");
    if (idx > 0) {
      const [x] = copy.splice(idx, 1);
      copy.unshift(x);
    }
  }
  return copy;
}

function hasStartedCv(cv) {
  if (!cv || typeof cv !== "object") return false;
  if (safeLen(cv.name) >= 1) return true;
  const em = String(cv.email || "").trim();
  if (em.includes("@") && em.length >= 5) return true;
  if (Array.isArray(cv.experience) && cv.experience.length > 0) return true;
  if (Array.isArray(cv.education) && cv.education.length > 0) return true;
  if (safeLen(cv.summary) >= 10) return true;
  if (safeLen(cv.skills) >= 10) return true;
  if (safeLen(cv.title) >= 2) return true;
  return false;
}

function personalComplete(cv) {
  const bundle = safeLen(cv.name) + safeLen(cv.email) + safeLen(cv.phone);
  return bundle >= 10;
}

function experienceComplete(cv) {
  const ex = Array.isArray(cv.experience) ? cv.experience : [];
  return ex.some((e) => {
    if (!e || typeof e !== "object") return false;
    const body = safeLen(e.company) + safeLen(e.role) + safeLen(e.points) + safeLen(e.period);
    return body >= 10;
  });
}

function educationComplete(cv) {
  const ed = Array.isArray(cv.education) ? cv.education : [];
  return ed.some((x) => {
    if (!x || typeof x !== "object") return false;
    return safeLen(x.school) + safeLen(x.degree) + safeLen(x.year) + safeLen(x.fieldOfStudy) >= 10;
  });
}

/**
 * Progress coach from in-memory CV shape (builder resume object).
 * @param {unknown} cvData
 * @returns {typeof PROGRESS_COACH_FALLBACK}
 */
export function getProgressCoachData(cvData) {
  try {
    const cv = cvData && typeof cvData === "object" ? cvData : null;
    if (!hasStartedCv(cv)) {
      return { ...PROGRESS_COACH_FALLBACK, hasCV: false, completionPercent: 0, missingSections: [] };
    }
    const sections = [
      { label: "Personal Info", ok: personalComplete(cv) },
      { label: "Work Experience", ok: experienceComplete(cv) },
      { label: "Education", ok: educationComplete(cv) },
      { label: "Skills", ok: safeLen(cv.skills) >= 10 },
      { label: "Summary", ok: safeLen(cv.summary) >= 10 },
    ];
    const totalSections = sections.length;
    const missingSections = sections.filter((s) => !s.ok).map((s) => s.label);
    const completedSections = sections.filter((s) => s.ok).length;
    const completionPercent = Math.round((completedSections / totalSections) * 100);
    return {
      completionPercent,
      missingSections,
      totalSections,
      completedSections,
      hasCV: true,
    };
  } catch {
    return { ...PROGRESS_COACH_FALLBACK };
  }
}

/**
 * Download limits: paid → unlimited; signed-in free → Supabase `downloads` count (limit 1); anon → localStorage cvp_anon_downloads.
 */
export async function getDownloadGatekeeperData() {
  return getGatekeeperData();
}

export { invalidateGatekeeperCache };

export function readFabSeen(tabKey) {
  try {
    return typeof localStorage !== "undefined" && localStorage.getItem(`fab_seen_${tabKey}`) === "true";
  } catch {
    return true;
  }
}

export function writeFabSeen(tabKey) {
  try {
    if (typeof localStorage !== "undefined") localStorage.setItem(`fab_seen_${tabKey}`, "true");
  } catch {
    /* ignore */
  }
}

export function readAtsFabGuideOpened() {
  try {
    return typeof sessionStorage !== "undefined" && sessionStorage.getItem("cvp_ats_fab_opened") === "1";
  } catch {
    return true;
  }
}

export function markAtsFabGuideOpened() {
  try {
    if (typeof sessionStorage !== "undefined") sessionStorage.setItem("cvp_ats_fab_opened", "1");
  } catch {
    /* ignore */
  }
}

/**
 * ATS tab FAB bounce + border flicker (builder): score >= 71, not seen, session not opened via high-score guide.
 */
export function shouldShowAtsFabAttention(builderTab, atsScore) {
  return builderTab === "ats" && atsScore >= 71 && !readFabSeen("ats") && !readAtsFabGuideOpened();
}

export function shouldShowFabDot(tabKey, extraDot = false) {
  return extraDot || !readFabSeen(tabKey);
}

/** Maps guided coach field ids (FABSheet QUESTIONS[].id) → FAB_VALIDATION row index; -1 = no validation */
export const GUIDED_FIELD_TO_VALIDATION_INDEX = {
  name: 0,
  title: 1,
  email: -1,
  phone: -1,
  location: 2,
  exp_company: 6,
  exp_role: 1,
  exp_dates: -1,
  exp_bullets: 7,
  skills: 5,
  summary: 10,
};

export function validateAnswer(fieldId, answer) {
  const questionIndex = GUIDED_FIELD_TO_VALIDATION_INDEX[fieldId] ?? -1;
  if (questionIndex === -1) return { valid: true };

  const text = answer.trim();
  const lower = text.toLowerCase();
  const config = FAB_VALIDATION[questionIndex];
  if (!config) return { valid: true };

  // Global garbage check
  if (isGarbage(text)) {
    return {
      valid: false,
      type: 'STERN',
      message: "I can't build a professional CV with that. Let's try again — even a rough answer works."
    };
  }

  // Q1 — Full Name
  if (questionIndex === 0) {
    if (isPhoneNumber(text)) {
      return { valid: false, type: 'PROBE', message: config.phoneProbe };
    }
    const nameResult = isValidName(text);
    if (!nameResult.valid) {
      if (nameResult.reason === 'INITIALS_ONLY') {
        return { valid: false, type: 'PROBE', message: config.initialsProbe };
      }
      return { valid: false, type: 'PROBE', message: config.probe };
    }
    return { valid: true };
  }

  // Q2 — Job Title
  if (questionIndex === 1) {
    if (text.length < 3) return { valid: false, type: 'PROBE', message: config.probe };
    const rejectWords = ['job', 'work', 'worker', 'employee', 'staff', 'nothing', 'none'];
    if (rejectWords.includes(lower)) return { valid: false, type: 'PROBE', message: config.probe };
    return { valid: true };
  }

  // Q3 — Location
  if (questionIndex === 2) {
    if (text.length < 2) return { valid: false, type: 'PROBE', message: config.probe };
    const rejectWords = ['earth', 'home', 'here', 'there', 'anywhere', 'somewhere', 'everywhere'];
    if (rejectWords.includes(lower)) return { valid: false, type: 'PROBE', message: config.probe };
    const isGCC = GCC_CITIES.some(c => lower.includes(c));
    const isIndia = INDIA_CITIES.some(c => lower.includes(c));
    if (isGCC || isIndia) {
      return { valid: true, hook: 'GCC_RECOGNITION', hookMessage: config.gccHook };
    }
    return { valid: true };
  }

  // Q4 — Industry
  if (questionIndex === 3) {
    if (text.length < 3) return { valid: false, type: 'PROBE', message: config.probe };
    const rejectWords = ['anything', 'everything', 'idk', 'any', 'all', 'various', 'other'];
    if (rejectWords.includes(lower)) return { valid: false, type: 'PROBE', message: config.probe };
    return { valid: true };
  }

  // Q5 — Experience
  if (questionIndex === 4) {
    const hasNumber = /\d/.test(text);
    const hasFresher = /fresher|fresh\s*grad|entry\s*level|junior|senior|mid|intern|trainee/i.test(text);
    if (!hasNumber && !hasFresher) {
      return { valid: false, type: 'PROBE', message: config.probe };
    }
    // Reject obviously fake numbers
    if (/^0$|^99$|^100$/.test(text.trim())) {
      return { valid: false, type: 'PROBE', message: config.probe };
    }
    return { valid: true };
  }

  // Q6 — Skills
  if (questionIndex === 5) {
    const rejectWords = ['everything', 'all', 'skills', 'i am good', 'good', 'nothing'];
    if (rejectWords.includes(lower)) return { valid: false, type: 'PROBE', message: config.probe };
    const skills = text.split(/[,/\n+]/).filter(s => s.trim().length > 1);
    if (skills.length < 2 && text.split(/\s+/).length < 2) {
      return { valid: false, type: 'PROBE', message: config.probe };
    }
    return { valid: true };
  }

  // Q7 — Company
  if (questionIndex === 6) {
    if (text.length < 2) return { valid: false, type: 'PROBE', message: config.probe };
    const rejectWords = ['company', 'place', 'secret', 'somewhere', 'employer', 'office', 'work'];
    if (rejectWords.includes(lower)) return { valid: false, type: 'PROBE', message: config.probe };
    return { valid: true };
  }

  // Q8 — Achievement
  if (questionIndex === 7) {
    if (text.length < 10) return { valid: false, type: 'PROBE', message: config.probe };
    const rejectPhrases = ['worked hard', 'i did my best', 'good job', 'i worked', 'nothing'];
    if (rejectPhrases.some(p => lower.includes(p))) {
      return { valid: false, type: 'PROBE', message: config.probe };
    }
    const hasVerb = ACTION_VERBS.some(v => lower.includes(v));
    if (!hasVerb) return { valid: false, type: 'PROBE', message: config.probe };
    // Valid but no metric — fire nudge
    const hasMetric = /\d+|%|percent|aed|sar|inr|usd/i.test(text);
    if (!hasMetric) {
      return { valid: true, nudge: config.metricNudge };
    }
    return { valid: true };
  }

  // Q9 — Education
  if (questionIndex === 8) {
    if (text.length < 2) return { valid: false, type: 'PROBE', message: config.probe };
    const rejectWords = ['done', 'yes', 'school', 'studied', 'education', 'degree', 'college', 'high'];
    if (rejectWords.includes(lower)) return { valid: false, type: 'PROBE', message: config.probe };
    const hasEduKeyword = EDUCATION_KEYWORDS.some(k => lower.includes(k));
    if (!hasEduKeyword && text.length < 5) {
      return { valid: false, type: 'PROBE', message: config.probe };
    }
    return { valid: true };
  }

  // Q10 — Languages
  if (questionIndex === 9) {
    if (text.length < 3) return { valid: false, type: 'PROBE', message: config.probe };
    const rejectWords = ['i talk', 'speak', 'language', 'yes', 'none', 'all', 'no'];
    if (rejectWords.includes(lower)) return { valid: false, type: 'PROBE', message: config.probe };
    const hasLanguage = LANGUAGE_LIST.some(l => lower.includes(l));
    if (!hasLanguage && text.length < 4) {
      return { valid: false, type: 'PROBE', message: config.probe };
    }
    return { valid: true };
  }

  // Q11 — Career Goal
  if (questionIndex === 10) {
    if (text.length < 8) return { valid: false, type: 'PROBE', message: config.probe };
    const rejectWords = ['money', 'get a job', 'job', 'anything', 'idk', 'not sure', 'whatever', 'rich'];
    if (rejectWords.includes(lower)) return { valid: false, type: 'PROBE', message: config.probe };
    return { valid: true };
  }

  return { valid: true };
}

export function getHintForQuestion(fieldId) {
  const questionIndex = GUIDED_FIELD_TO_VALIDATION_INDEX[fieldId] ?? -1;
  if (questionIndex === -1) return '';
  return FAB_VALIDATION[questionIndex]?.hint || '';
}

export function getMaxRetriesForField(fieldId) {
  const questionIndex = GUIDED_FIELD_TO_VALIDATION_INDEX[fieldId] ?? -1;
  if (questionIndex === -1) return 2;
  return FAB_VALIDATION[questionIndex]?.maxRetries ?? 2;
}
