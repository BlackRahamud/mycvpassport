// Microsoft Clarity client wrapper.
//
// Boot rules:
//  - SSR-safe: no-op when `window` is undefined.
//  - Disabled in non-production builds to keep dev/test heatmaps clean.
//    Set REACT_APP_ANALYTICS_FORCE=true to opt-in locally for QA.
//  - Every public call is wrapped in try/catch — analytics must never
//    crash the host app.

const SCRIPT_ID = "cvp-clarity-tag";

function shouldRun() {
  if (typeof window === "undefined") return false;
  const force = process.env.REACT_APP_ANALYTICS_FORCE === "true";
  if (process.env.NODE_ENV !== "production" && !force) return false;
  return true;
}

function getProjectId() {
  const id = process.env.REACT_APP_CLARITY_PROJECT_ID;
  return typeof id === "string" && id.trim() ? id.trim() : null;
}

export function initClarity() {
  try {
    if (!shouldRun()) return;
    const projectId = getProjectId();
    if (!projectId) return;
    if (document.getElementById(SCRIPT_ID)) return;

    // Standard Clarity bootstrap: stub a queueing function on `window.clarity`
    // so calls made before the remote script loads still flush once it does.
    window.clarity = window.clarity || function () {
      (window.clarity.q = window.clarity.q || []).push(arguments);
    };

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.async = true;
    script.src = `https://www.clarity.ms/tag/${projectId}`;
    const first = document.getElementsByTagName("script")[0];
    if (first && first.parentNode) {
      first.parentNode.insertBefore(script, first);
    } else {
      document.head.appendChild(script);
    }
  } catch (e) {
    console.warn("[clarity] init failed", e);
  }
}

export function identifyClarity(userId, traits) {
  try {
    if (!shouldRun()) return;
    if (typeof window.clarity !== "function") return;
    if (userId) window.clarity("identify", String(userId));
    if (traits && typeof traits === "object") {
      for (const [key, value] of Object.entries(traits)) {
        if (value == null) continue;
        window.clarity("set", key, String(value));
      }
    }
  } catch (e) {
    console.warn("[clarity] identify failed", e);
  }
}

export function tagClarity(eventName) {
  try {
    if (!shouldRun()) return;
    if (typeof window.clarity !== "function") return;
    if (!eventName) return;
    window.clarity("event", String(eventName));
  } catch (e) {
    console.warn("[clarity] tag failed", e);
  }
}
