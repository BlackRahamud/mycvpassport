// ─────────────────────────────────────────────────────────────────────────────
// LAUNCH OFFER — single source of truth for the 2-week launch entitlements.
//
// This module is ISOMORPHIC and side-effect-free: it is imported by the
// client bundle (React) AND by the server (api/transform.js as an ESM import,
// api/generate-pdf.js via dynamic import). It reads env/flags but never talks
// to a database — callers pass in `isPro` + the raw usage counts and get back
// a plain entitlements object.
//
// ── The switch ───────────────────────────────────────────────────────────────
// Effective state = enabled AND (now <= endDate). If EITHER fails, every
// consumer falls back to the ORIGINAL PLAN automatically — no other change.
//
//   enabled is resolved as:
//     • Client  — PostHog feature flag "launch_offer" when it resolves to a
//                 boolean, else the build-time env REACT_APP_LAUNCH_OFFER_ENABLED.
//     • Server  — the env LAUNCH_OFFER_ENABLED (Vercel function env). The
//                 server cannot read a client PostHog flag, so the ENV VAR is
//                 the authoritative switch for server-side enforcement. Keep
//                 the client env in sync with the server env (set both).
//
// NOTE ON STACK: this is a Create React App project, not Next.js. Only vars
// prefixed REACT_APP_ are inlined into the client bundle at build time. The
// task named NEXT_PUBLIC_LAUNCH_OFFER_ENABLED; we accept it as a server-side
// alias, but the value the browser actually reads is REACT_APP_LAUNCH_OFFER_ENABLED.
// ─────────────────────────────────────────────────────────────────────────────

// endDate has no timezone suffix (per spec) → interpreted in the runtime's
// local time. Vercel functions run UTC; a 2-week marketing window tolerates
// the boundary drift. Change this one string to move the end date.
export const OFFER_END_ISO = '2026-08-07T23:59:59';

// The offer's declared shape. `enabled` is resolved dynamically (see
// resolveOfferEnabled) — it is intentionally NOT baked in here so a stale
// literal can never override the live flag/env.
export const LAUNCH_OFFER = {
  endDate: OFFER_END_ISO,
  maxUploads: 3,
  maxDownloads: 3,
  unlockAllTemplates: true,
};

// Baseline free allowances that hold REGARDLESS of the offer switch.
// CV import is our main activation step, so free accounts always get 3
// (server-enforced) whether the offer is ON or OFF — the offer's extra value
// is the download bump + all templates, not the imports. Downloads fall back
// to the original single free download when the offer is off.
export const FREE_IMPORT_LIMIT = 3;
export const ORIGINAL_FREE_DOWNLOAD_LIMIT = 1;

function truthyEnv(v) {
  return String(v).toLowerCase() === 'true';
}

/**
 * Is `now` still inside the offer window?
 * @param {number} [now] epoch ms (defaults to Date.now()).
 */
export function isWithinOfferWindow(now) {
  const nowMs = typeof now === 'number' ? now : Date.now();
  const endMs = Date.parse(OFFER_END_ISO);
  if (Number.isNaN(endMs)) return false;
  return nowMs <= endMs;
}

/**
 * Resolve the raw `enabled` switch for the current runtime.
 *
 * The ENV VAR is the master switch — it is the ONLY thing the server can read,
 * so it must gate the enforced perks (downloads / templates). The client
 * mirrors the same env, and the PostHog "launch_offer" flag acts as an instant
 * CLIENT-SIDE KILL (no redeploy): flag === false hides the launch UI. The flag
 * deliberately cannot ENABLE the offer on its own — doing so would promise
 * perks the env-gated server won't honor (a "3 downloads" strip over a 1-download
 * server gate). To turn the offer fully ON, set the env var (client + server).
 *
 * @param {{ flag?: boolean }} [opts] flag = a resolved PostHog value (client only).
 * @returns {boolean}
 */
export function resolveOfferEnabled(opts) {
  const flag = opts && typeof opts.flag === 'boolean' ? opts.flag : undefined;

  // Client. The static process.env.REACT_APP_* reference is inlined by CRA's
  // DefinePlugin, so no `process` global is touched in the browser.
  if (typeof window !== 'undefined') {
    if (flag === false) return false; // instant kill switch
    return truthyEnv(process.env.REACT_APP_LAUNCH_OFFER_ENABLED);
  }

  // Server (Node): read the function env. LAUNCH_OFFER_ENABLED is the
  // authoritative switch; the other two are accepted aliases.
  if (typeof process !== 'undefined' && process.env) {
    return truthyEnv(
      process.env.LAUNCH_OFFER_ENABLED
        || process.env.NEXT_PUBLIC_LAUNCH_OFFER_ENABLED
        || process.env.REACT_APP_LAUNCH_OFFER_ENABLED,
    );
  }
  return false;
}

/**
 * Effective offer state: enabled AND within the date window.
 * @param {{ flag?: boolean, now?: number }} [opts]
 * @returns {boolean}
 */
export function isOfferActive(opts) {
  const flag = opts ? opts.flag : undefined;
  const now = opts ? opts.now : undefined;
  return resolveOfferEnabled({ flag }) && isWithinOfferWindow(now);
}

/**
 * The download allowance for a signed-in FREE account, given offer state.
 * (Anonymous visitors and Pro users are handled by their own branches.)
 */
export function freeDownloadLimit(offerActive) {
  return offerActive ? LAUNCH_OFFER.maxDownloads : ORIGINAL_FREE_DOWNLOAD_LIMIT;
}

/**
 * PURE entitlement computation. Every consumer (client hook, gatekeeper,
 * server enforcement) funnels through this so there is one rule set.
 *
 * @param {object} p
 * @param {boolean} p.isPro        time-bounded Pro access in effect.
 * @param {boolean} p.offerActive  isOfferActive() result for this runtime.
 * @param {boolean} [p.isSignedIn] account present (offer perks are per-account).
 * @param {number}  [p.uploadCount]   imports already used by this account.
 * @param {number}  [p.downloadCount] downloads already used by this account.
 * @returns {{
 *   offerActive: boolean, endDate: string, allTemplates: boolean,
 *   requiresSignIn: boolean,
 *   canUpload: boolean, uploadsLeft: number, uploadsLimit: number,
 *   canDownload: boolean, downloadsLeft: number, downloadsLimit: number,
 * }}
 */
export function computeEntitlements(p) {
  const isPro = !!(p && p.isPro);
  const offerActive = !!(p && p.offerActive);
  const isSignedIn = !!(p && p.isSignedIn);
  const uploadCount = Math.max(0, Number((p && p.uploadCount) || 0));
  const downloadCount = Math.max(0, Number((p && p.downloadCount) || 0));

  // Imports — flat 3 for free accounts, always. Unlimited for Pro.
  const uploadsLimit = isPro ? Infinity : FREE_IMPORT_LIMIT;
  const uploadsLeft = isPro ? Infinity : Math.max(0, FREE_IMPORT_LIMIT - uploadCount);

  // Downloads — 1 (original) or 3 (offer) for free accounts, unlimited Pro.
  const downloadsLimit = isPro ? Infinity : freeDownloadLimit(offerActive);
  const downloadsLeft = isPro ? Infinity : Math.max(0, downloadsLimit - downloadCount);

  return {
    offerActive,
    endDate: OFFER_END_ISO,
    // Templates: Pro always; free accounts only when the offer is live.
    allTemplates: isPro || offerActive,
    // Upload needs an account (lead capture); a signed-out user is asked to
    // sign in first rather than being told "limit reached".
    requiresSignIn: !isSignedIn && !isPro,
    canUpload: (isSignedIn || isPro) && (isPro || uploadsLeft > 0),
    uploadsLeft,
    uploadsLimit,
    canDownload: isPro || downloadsLeft > 0,
    downloadsLeft,
    downloadsLimit,
  };
}
