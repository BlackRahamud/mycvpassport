/**
 * Pipeline view preference (kanban | list), persisted per user.
 * Kanban is the desktop default, list the mobile default; an explicit
 * user choice always wins over the defaults.
 */
export const viewPrefKey = (userId) => `cvp_pipeline_view_${userId || "anon"}`;

export function readViewPref(userId) {
  try {
    const v = window.localStorage?.getItem(viewPrefKey(userId));
    return v === "kanban" || v === "list" ? v : null;
  } catch {
    return null;
  }
}

export function writeViewPref(userId, view) {
  try {
    window.localStorage?.setItem(viewPrefKey(userId), view);
  } catch {
    /* private mode — session-only preference */
  }
}

export function effectiveView(pref, isDesktop) {
  return pref || (isDesktop ? "kanban" : "list");
}

/**
 * Insights panel preference (open | collapsed), persisted per user with
 * the same pattern. Collapsed is the default — the board owns the fold;
 * an explicit expand/collapse always wins.
 */
export const insightsPrefKey = (userId) => `cvp_pipeline_insights_${userId || "anon"}`;

export function readInsightsPref(userId) {
  try {
    const v = window.localStorage?.getItem(insightsPrefKey(userId));
    return v === "open" || v === "collapsed" ? v : null;
  } catch {
    return null;
  }
}

export function writeInsightsPref(userId, pref) {
  try {
    window.localStorage?.setItem(insightsPrefKey(userId), pref);
  } catch {
    /* private mode — session-only preference */
  }
}
