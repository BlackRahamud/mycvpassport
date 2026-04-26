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

import posthog from "posthog-js";

let initialized = false;

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

export function initPostHog() {
  try {
    if (initialized) return;
    if (!shouldRun()) return;
    const key = getKey();
    if (!key) return;
    posthog.init(key, {
      api_host: getHost(),
      autocapture: false,
      disable_session_recording: true,
      capture_pageview: true,
      capture_pageleave: true,
      person_profiles: "identified_only",
      loaded: (ph) => {
        try {
          if (process.env.NODE_ENV !== "production") ph.debug();
        } catch (e) { /* never throw from analytics callback */ }
      },
    });
    initialized = true;
  } catch (e) {
    console.warn("[posthog] init failed", e);
  }
}

export function identifyPostHog(userId, traits) {
  try {
    if (!shouldRun()) return;
    if (!initialized) return;
    if (!userId) return;
    posthog.identify(String(userId), traits && typeof traits === "object" ? traits : undefined);
  } catch (e) {
    console.warn("[posthog] identify failed", e);
  }
}

export function trackPostHog(eventName, props) {
  try {
    if (!shouldRun()) return;
    if (!initialized) return;
    if (!eventName) return;
    posthog.capture(String(eventName), props && typeof props === "object" ? props : undefined);
  } catch (e) {
    console.warn("[posthog] track failed", e);
  }
}

export function resetPostHog() {
  try {
    if (!shouldRun()) return;
    if (!initialized) return;
    posthog.reset();
  } catch (e) {
    console.warn("[posthog] reset failed", e);
  }
}
