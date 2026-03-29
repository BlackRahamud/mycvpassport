import { supabase } from "../../supabaseClient";

export const FAB_MEMORY_KEY = "cvp_fab_memory";
export const ANON_DOWNLOADS_KEY = "cvp_anon_downloads";

const FREE_DOWNLOAD_LIMIT = 3;

/** @type {{ lastAction: string | null, lastActionAt: string | null, lastTemplateId: string | null, lastTabVisited: string | null, sessionCount: number }} */
const DEFAULT_FAB_MEMORY = {
  lastAction: null,
  lastActionAt: null,
  lastTemplateId: null,
  lastTabVisited: null,
  sessionCount: 0,
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

function readAnonDownloadCount() {
  try {
    if (typeof localStorage === "undefined") return 0;
    const raw = localStorage.getItem(ANON_DOWNLOADS_KEY);
    const n = parseInt(raw || "0", 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

function parseFabMemory(raw) {
  try {
    if (!raw || typeof raw !== "string") return { ...DEFAULT_FAB_MEMORY };
    const o = JSON.parse(raw);
    if (!o || typeof o !== "object") return { ...DEFAULT_FAB_MEMORY };
    return {
      ...DEFAULT_FAB_MEMORY,
      lastAction: typeof o.lastAction === "string" ? o.lastAction : o.lastAction === null ? null : DEFAULT_FAB_MEMORY.lastAction,
      lastActionAt: typeof o.lastActionAt === "string" ? o.lastActionAt : o.lastActionAt === null ? null : DEFAULT_FAB_MEMORY.lastActionAt,
      lastTemplateId: typeof o.lastTemplateId === "string" ? o.lastTemplateId : o.lastTemplateId === null ? null : DEFAULT_FAB_MEMORY.lastTemplateId,
      lastTabVisited: typeof o.lastTabVisited === "string" ? o.lastTabVisited : o.lastTabVisited === null ? null : DEFAULT_FAB_MEMORY.lastTabVisited,
      sessionCount: Number.isFinite(Number(o.sessionCount)) ? Math.max(0, Math.floor(Number(o.sessionCount))) : DEFAULT_FAB_MEMORY.sessionCount,
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

function mapPlanName(isPro, rawTier) {
  const t = String(rawTier || "").toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
  if (t === "express_pass") return "Express Pass";
  if (t === "active_hunter") return "Active Hunter";
  if (t === "career_pro" || t === "pro" || t === "max_pro") return "Career Pro";
  if (isPro) return "Career Pro";
  return "Free";
}

/**
 * Download limits: paid → unlimited; signed-in free → Supabase `downloads` count (limit 3); anon → localStorage cvp_anon_downloads.
 */
export async function getDownloadGatekeeperData() {
  try {
    if (!supabase) {
      const used = readAnonDownloadCount();
      const can = used < FREE_DOWNLOAD_LIMIT;
      return {
        canDownload: can,
        downloadsUsed: used,
        downloadsLimit: FREE_DOWNLOAD_LIMIT,
        isPaidUser: false,
        planName: "Free",
        isSignedIn: false,
        blockerReason: can ? null : "not_signed_in",
      };
    }

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser();
    if (userErr) throw userErr;

    if (!user) {
      const used = readAnonDownloadCount();
      const can = used < FREE_DOWNLOAD_LIMIT;
      return {
        canDownload: can,
        downloadsUsed: used,
        downloadsLimit: FREE_DOWNLOAD_LIMIT,
        isPaidUser: false,
        planName: "Free",
        isSignedIn: false,
        blockerReason: can ? null : "not_signed_in",
      };
    }

    let isPro = false;
    let planTier = null;
    const wide = await supabase.from("profiles").select("is_pro, plan_tier, plan").eq("id", user.id).maybeSingle();
    if (!wide.error) {
      isPro = !!wide.data?.is_pro;
      planTier = wide.data?.plan_tier ?? wide.data?.plan ?? null;
    } else {
      const narrow = await supabase.from("profiles").select("is_pro").eq("id", user.id).maybeSingle();
      if (narrow.error && narrow.error.code !== "PGRST116") throw narrow.error;
      isPro = !!narrow.data?.is_pro;
    }

    const tier = String(planTier || "").toLowerCase().trim();
    const normTier = tier.replace(/\s+/g, "_").replace(/-/g, "_");
    const paidNormTiers = new Set(["express_pass", "active_hunter", "career_pro", "pro", "max_pro"]);
    const tierPaid = tier !== "" && tier !== "free" && paidNormTiers.has(normTier);
    const isPaidUser = !!isPro || tierPaid;
    const planName = mapPlanName(isPro, planTier);

    if (isPaidUser) {
      return {
        canDownload: true,
        downloadsUsed: 0,
        downloadsLimit: Number.POSITIVE_INFINITY,
        isPaidUser: true,
        planName,
        isSignedIn: true,
        blockerReason: null,
      };
    }

    const { count, error: cErr } = await supabase
      .from("downloads")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (cErr) throw cErr;
    const downloadsUsed = typeof count === "number" ? count : 0;
    const canDownload = downloadsUsed < FREE_DOWNLOAD_LIMIT;
    return {
      canDownload,
      downloadsUsed,
      downloadsLimit: FREE_DOWNLOAD_LIMIT,
      isPaidUser: false,
      planName: "Free",
      isSignedIn: true,
      blockerReason: canDownload ? null : "limit_reached",
    };
  } catch {
    return { ...GATEKEEPER_FALLBACK };
  }
}

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
