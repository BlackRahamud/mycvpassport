/**
 * gatekeeper.js — Single source of truth for download permissions.
 * Queries only columns that exist in the profiles table:
 * id, is_pro, created_at, email, plan, expiry, flagged, features
 */

import { supabase } from "../supabaseClient";
import { isFounder } from "../utils/founder";

const FREE_DOWNLOAD_LIMIT = 3;

const ANON_DOWNLOADS_KEY = "cvp_anon_downloads";

function readAnonDownloadCount() {
  try {
    const raw = typeof localStorage !== "undefined"
      ? localStorage.getItem(ANON_DOWNLOADS_KEY)
      : null;
    const n = parseInt(raw || "0", 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

function mapPlanName(isPro, plan) {
  const t = String(plan || "").toLowerCase().trim();
  if (t === "express_pass") return "Express Pass";
  if (t === "active_hunter") return "Active Hunter";
  if (t === "career_pro" || t === "pro" || t === "max_pro") return "Career Pro";
  if (isPro) return "Career Pro";
  return "Free";
}

function isPaidPlan(plan, isPro) {
  if (isPro) return true;
  const t = String(plan || "").toLowerCase().trim();
  return ["express_pass", "active_hunter", "career_pro", "pro", "max_pro"].includes(t);
}

/**
 * Fetch gatekeeper data once per session.
 * Caches result in sessionStorage for 10 minutes.
 * Call invalidateGatekeeperCache() after a download to refresh count.
 */
const CACHE_KEY = "cvp_gatekeeper_cache";
const CACHE_TTL_MS = 10 * 60 * 1000;

export function invalidateGatekeeperCache() {
  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.removeItem(CACHE_KEY);
    }
  } catch {
    /* ignore */
  }
}

function readCache() {
  try {
    const raw = typeof sessionStorage !== "undefined"
      ? sessionStorage.getItem(CACHE_KEY)
      : null;
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) return null;
    return data;
  } catch {
    return null;
  }
}

function writeCache(data) {
  try {
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
    }
  } catch {
    /* ignore */
  }
}

/**
 * @returns {Promise<{
 *   canDownload: boolean,
 *   downloadsUsed: number,
 *   downloadsLimit: number,
 *   isPaidUser: boolean,
 *   planName: string,
 *   isSignedIn: boolean,
 *   blockerReason: string | null,
 *   features: object
 * }>}
 */
export async function getGatekeeperData() {
  const cached = readCache();
  if (cached) return cached;

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
        features: {},
      };
    }

    const { data: { user }, error: userErr } = await supabase.auth.getUser();
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
        features: {},
      };
    }

    // Founder unlock (client-side convenience). Keyed off the authenticated
    // session email only — never a profile row. Treated as fully paid so no
    // download limit / HR paywall / banner fires. RLS is untouched.
    if (isFounder(user)) {
      const result = {
        canDownload: true,
        downloadsUsed: 0,
        downloadsLimit: Number.POSITIVE_INFINITY,
        isPaidUser: true,
        planName: "Founder",
        isSignedIn: true,
        blockerReason: null,
        features: {},
      };
      writeCache(result);
      return result;
    }

    // Query only columns that exist in the profiles table
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("is_pro,plan,features")
      .eq("id", user.id)
      .maybeSingle();

    if (profileErr && profileErr.code !== "PGRST116") throw profileErr;

    const isPro = !!profile?.is_pro;
    const plan = profile?.plan ?? null;
    const features = profile?.features ?? {};
    const isPaid = isPaidPlan(plan, isPro);
    const planName = mapPlanName(isPro, plan);

    if (isPaid) {
      const result = {
        canDownload: true,
        downloadsUsed: 0,
        downloadsLimit: Number.POSITIVE_INFINITY,
        isPaidUser: true,
        planName,
        isSignedIn: true,
        blockerReason: null,
        features,
      };
      writeCache(result);
      return result;
    }

    // Count downloads using HEAD request — no data transfer
    const { count, error: countErr } = await supabase
      .from("downloads")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (countErr) throw countErr;

    const downloadsUsed = typeof count === "number" ? count : 0;
    const canDownload = downloadsUsed < FREE_DOWNLOAD_LIMIT;

    const result = {
      canDownload,
      downloadsUsed,
      downloadsLimit: FREE_DOWNLOAD_LIMIT,
      isPaidUser: false,
      planName: "Free",
      isSignedIn: true,
      blockerReason: canDownload ? null : "limit_reached",
      features,
    };
    writeCache(result);
    return result;

  } catch {
    return {
      canDownload: true,
      downloadsUsed: 0,
      downloadsLimit: FREE_DOWNLOAD_LIMIT,
      isPaidUser: false,
      planName: "Free",
      isSignedIn: false,
      blockerReason: null,
      features: {},
    };
  }
}
