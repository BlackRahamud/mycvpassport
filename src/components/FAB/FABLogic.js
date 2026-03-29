/** @typedef {{ percent: number, missing: string[] }} ProgressCoachResult */

/**
 * PROGRESS COACH — wire next session
 * reads cvData sections, calculates % complete
 * returns { percent, missingSections[] }
 * @param {unknown} cvData
 * @returns {ProgressCoachResult}
 */
export const getProgressCoachData = (_cvData) => ({
  percent: 0,
  missing: [],
});

/**
 * DOWNLOAD GATEKEEPER — wire next session
 * called before download executes
 * returns { shouldWarn, atsScore, fixes[] }
 * @param {number} atsScore
 */
export const getDownloadGatekeeperData = (_atsScore) => ({
  shouldWarn: false,
  fixes: [],
});

/**
 * FAB MEMORY — wire next session
 * reads last session from localStorage
 * returns { hasMemory, message }
 */
export const getFabMemory = () => ({
  hasMemory: false,
  message: "",
});

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
  return (
    builderTab === "ats" &&
    atsScore >= 71 &&
    !readFabSeen("ats") &&
    !readAtsFabGuideOpened()
  );
}

export function shouldShowFabDot(tabKey, extraDot = false) {
  return extraDot || !readFabSeen(tabKey);
}
