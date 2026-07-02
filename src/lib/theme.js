/**
 * Global theme (light | dark) — single mechanism, replaces the ad-hoc
 * trio (html.className, .cvp-theme-light, per-page palettes).
 *
 * - Persisted under cvp_theme (NEW key). The legacy 'cvp-theme' key is
 *   deliberately ignored: LandingPage wrote it on every mount, so a stored
 *   'dark' never meant an explicit user choice.
 * - Applied as <html data-theme="..."> BEFORE first paint by the inline
 *   script in public/index.html — no flash of wrong theme.
 * - prefers-color-scheme is intentionally ignored: the default wins unless
 *   the user explicitly toggles.
 * - Unmigrated dark surfaces pin data-theme="dark" on their own root
 *   element; the token overrides in index.css key on the ATTRIBUTE
 *   selector, so the pin re-darkens every token beneath it.
 */

const KEY = "cvp_theme";

// NOTE: keep in sync with the inline pre-paint script in public/index.html.
// Light is the product default — this is a careers product and light mode is
// what most users and employers see first. Dark is the opt-in toggle.
export const DEFAULT_THEME = "light";

export function getStoredTheme() {
  try {
    const t = window.localStorage?.getItem(KEY);
    return t === "dark" || t === "light" ? t : null;
  } catch {
    return null;
  }
}

export function getTheme() {
  if (typeof document !== "undefined") {
    const attr = document.documentElement.getAttribute("data-theme");
    if (attr === "dark" || attr === "light") return attr;
  }
  return getStoredTheme() || DEFAULT_THEME;
}

export function setTheme(theme) {
  const t = theme === "dark" ? "dark" : "light";
  try {
    window.localStorage?.setItem(KEY, t);
  } catch {
    /* private mode — attribute still applies for this session */
  }
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-theme", t);
  }
  return t;
}
