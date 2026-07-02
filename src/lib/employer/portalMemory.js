/**
 * Last-used portal memory ('candidate' | 'employer'). Recorded on portal
 * visits (App.js route effect) and read at login time so returning
 * dual-role users land on the side they actually work in.
 */
const KEY = "cvp_last_portal";

export function getLastPortal() {
  try {
    return (typeof window !== "undefined" && window.localStorage?.getItem(KEY)) || null;
  } catch {
    return null;
  }
}

export function setLastPortal(portal) {
  if (portal !== "candidate" && portal !== "employer") return;
  try {
    window.localStorage?.setItem(KEY, portal);
  } catch {
    /* private mode — login falls back to candidate home */
  }
}
