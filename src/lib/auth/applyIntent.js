/**
 * applyIntent — sessionStorage handoff for the Job Apply flow.
 *
 * When a logged-out visitor clicks Submit on /jobs/:id, we stash the
 * partially-filled form + jobId here, set cvp_return_path so
 * useCvpAuth lands them back on the job, and route to /auth. Once
 * the auth round-trip completes the JobPage reads the intent on
 * mount and replays the application — the user never has to re-key
 * the form. Single-shot: the intent is consumed (deleted) on read,
 * so a stale intent can't fire on the next visit.
 *
 * Stored under cvp_apply_intent. Shape:
 *   { jobId, form: { first_name, last_name, email, phone, visa_status }, ts }
 */

const KEY = "cvp_apply_intent";
// 30-minute TTL — plenty for an auth round-trip, short enough that a
// forgotten intent doesn't fire weeks later.
const TTL_MS = 30 * 60 * 1000;

function safeStorage() {
  if (typeof window === "undefined") return null;
  try { return window.sessionStorage; } catch { return null; }
}

export function saveApplyIntent({ jobId, form }) {
  const s = safeStorage();
  if (!s || !jobId) return;
  try {
    s.setItem(KEY, JSON.stringify({ jobId, form: form || {}, ts: Date.now() }));
  } catch { /* private mode etc. — fail silently */ }
}

export function consumeApplyIntent(jobId) {
  const s = safeStorage();
  if (!s) return null;
  let raw = null;
  try { raw = s.getItem(KEY); } catch { return null; }
  if (!raw) return null;
  // Always delete on read — single-shot replay.
  try { s.removeItem(KEY); } catch { /* noop */ }
  let parsed = null;
  try { parsed = JSON.parse(raw); } catch { return null; }
  if (!parsed || typeof parsed !== "object") return null;
  if (jobId && parsed.jobId !== jobId) return null;
  if (!parsed.ts || Date.now() - parsed.ts > TTL_MS) return null;
  return parsed;
}

export function clearApplyIntent() {
  const s = safeStorage();
  if (!s) return;
  try { s.removeItem(KEY); } catch { /* noop */ }
}
