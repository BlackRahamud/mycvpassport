// PostHog client wrapper. Mirrors clarity.js gating + safety contract.
//
// Boot rules:
//  - SSR-safe: no-op when `window` is undefined.
//  - Disabled in non-production builds; opt-in locally with
//    REACT_APP_ANALYTICS_FORCE=true.
//  - No-op when REACT_APP_POSTHOG_KEY is missing.
//  - Idempotent — repeated initPostHog() calls are ignored after the
//    first successful init.
//  - Every public call wrapped in try/catch.

// posthog-js is dynamically imported so its ~150KB gz payload never lands
// in the initial bundle — it loads after first paint via requestIdleCallback.

let posthog = null;
let initialized = false;
let loadPromise = null;

function shouldRun() {
  if (typeof window === "undefined") return false;
  const force = process.env.REACT_APP_ANALYTICS_FORCE === "true";
  if (process.env.NODE_ENV !== "production" && !force) return false;
  return true;
}

function getKey() {
  const k = process.env.REACT_APP_POSTHOG_KEY;
  return typeof k === "string" && k.trim() ? k.trim() : null;
}

function getHost() {
  const h = process.env.REACT_APP_POSTHOG_HOST;
  return typeof h === "string" && h.trim() ? h.trim() : "https://eu.i.posthog.com";
}

async function loadPosthog() {
  if (posthog) return posthog;
  if (loadPromise) return loadPromise;
  loadPromise = import(/* webpackChunkName: "posthog" */ "posthog-js").then((m) => {
    posthog = m.default || m;
    return posthog;
  });
  return loadPromise;
}

function whenIdle(fn) {
  if (typeof window === "undefined") return;
  const ric = window.requestIdleCallback;
  if (typeof ric === "function") {
    ric(fn, { timeout: 4000 });
  } else {
    setTimeout(fn, 1500);
  }
}

export function initPostHog() {
  try {
    if (initialized) return;
    if (!shouldRun()) return;
    const key = getKey();
    if (!key) return;
    whenIdle(async () => {
      try {
        const ph = await loadPosthog();
        if (initialized) return;
        ph.init(key, {
          api_host: getHost(),
          autocapture: false,
          disable_session_recording: true,
          capture_pageview: true,
          capture_pageleave: true,
          person_profiles: "identified_only",
          loaded: (instance) => {
            try {
              if (process.env.NODE_ENV !== "production") instance.debug();
            } catch (e) { /* never throw from analytics callback */ }
          },
        });
        initialized = true;
      } catch (e) {
        console.warn("[posthog] init failed", e);
      }
    });
  } catch (e) {
    console.warn("[posthog] init scheduling failed", e);
  }
}

export function identifyPostHog(userId, traits) {
  try {
    if (!shouldRun()) return;
    if (!userId) return;
    if (!posthog || !initialized) {
      loadPosthog().then((ph) => {
        if (initialized) ph.identify(String(userId), traits && typeof traits === "object" ? traits : undefined);
      }).catch(() => {});
      return;
    }
    posthog.identify(String(userId), traits && typeof traits === "object" ? traits : undefined);
  } catch (e) {
    console.warn("[posthog] identify failed", e);
  }
}

export function trackPostHog(eventName, props) {
  try {
    if (!shouldRun()) return;
    if (!eventName) return;
    if (!posthog || !initialized) {
      loadPosthog().then((ph) => {
        if (initialized) ph.capture(String(eventName), props && typeof props === "object" ? props : undefined);
      }).catch(() => {});
      return;
    }
    posthog.capture(String(eventName), props && typeof props === "object" ? props : undefined);
  } catch (e) {
    console.warn("[posthog] track failed", e);
  }
}

export function resetPostHog() {
  try {
    if (!shouldRun()) return;
    if (!posthog || !initialized) return;
    posthog.reset();
  } catch (e) {
    console.warn("[posthog] reset failed", e);
  }
}
