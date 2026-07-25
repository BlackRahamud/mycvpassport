// Jobs board switch — ONE flag decides whether the board is reachable.
//
// While JOBS_BOARD_LIVE is false, every "Browse Jobs" entry point opens the
// Boarding Soon popup instead of navigating, so nothing in the product
// promises live roles we cannot yet show. Flip this single constant to true
// and every one of those entry points navigates to the real board and the
// popup is bypassed — no other code change anywhere.
//
// Deliberately a plain constant, not an env var or a feature flag: the
// switch has to be greppable, and it has to behave identically on the
// server-rendered snapshot, in the client bundle and in the harness.

export const JOBS_BOARD_LIVE = false;

// Routes that cannot work until the board is live. `/jobs/:id` is NOT here
// on purpose — HR shares those direct links with candidates to apply, and
// they work today.
export const GATED_JOB_PATHS = ['/jobs'];

/** Is the board reachable right now? */
export function isJobsBoardLive() {
  return JOBS_BOARD_LIVE;
}

/**
 * Should a click on this href be intercepted by the Boarding Soon popup?
 * @param {string} href
 */
export function isGatedJobPath(href) {
  if (JOBS_BOARD_LIVE) return false;
  return GATED_JOB_PATHS.includes(String(href || '').split('?')[0]);
}
