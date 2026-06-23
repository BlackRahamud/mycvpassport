// Pristine `fetch`, captured at app boot before any third-party tag
// (Microsoft Clarity, Google Analytics, PostHog, future scripts) can
// monkey-patch `window.fetch`.
//
// Why this exists: session-replay / network-capture wrappers replace
// window.fetch with a version that clones the request and response streams
// to record them. A bug in that wrapper (or its interaction with an
// AbortController signal / a Bearer-auth POST) can leave the promise it
// returns unresolved even though the underlying network request completed
// 200 — the server logs a success, but the app's `await fetch` never
// settles and the UI spins forever. The /api/ai tailor calls hit exactly
// this: Vercel logged POST 200s while the client fetch hung to its timeout.
//
// Fix: capture the native fetch during the synchronous boot in index.js
// (Clarity's tag is injected async, so it patches AFTER this runs), and
// route critical first-party API calls through it so they can never depend
// on a patched fetch. Analytics simply won't record these specific calls,
// which is fine — they're internal API traffic, not user interactions.

let captured = null;

// Called once, as early as possible in index.js, before analytics init.
export function captureNativeFetch() {
  if (captured) return captured;
  if (typeof window !== "undefined" && typeof window.fetch === "function") {
    captured = window.fetch.bind(window);
  }
  return captured;
}

// Drop-in replacement for fetch() for first-party API calls. Uses the
// boot-captured native fetch when available; otherwise falls back to the
// current global fetch (still correct — just not patch-proof if a wrapper
// loaded before capture).
export default function safeFetch(...args) {
  const fn =
    captured ||
    (typeof window !== "undefined" && typeof window.fetch === "function"
      ? window.fetch.bind(window)
      : fetch);
  return fn(...args);
}
