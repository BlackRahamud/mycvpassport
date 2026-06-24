/**
 * Founder feature-gating allowlist — SINGLE SOURCE OF TRUTH.
 *
 * The founder account gets every paid/pro feature unlocked in the UI so
 * paid flows (especially the HR portal) can be exercised end-to-end
 * without hitting paywalls, listing caps, or free-tier banners.
 *
 * SECURITY — read before changing:
 *  - This is a CLIENT-SIDE feature-gating convenience ONLY. It must never
 *    be used to bypass or weaken Supabase RLS or any server-side check.
 *    Server endpoints (api/*) keep enforcing their own auth/limits.
 *  - The match is always against the AUTHENTICATED Supabase session email
 *    (user.email from supabase.auth.getUser()/getSession()), never a
 *    profile row, a prop, or any user-supplied input.
 *  - Keep the allowlist here and nowhere else so it's trivial to remove.
 */

export const FOUNDER_EMAILS = ['connectingjunaidkhan@gmail.com'];

const NORMALISED_FOUNDER_EMAILS = FOUNDER_EMAILS.map((e) => e.toLowerCase());

/** Case-insensitive email match against the allowlist. */
export function isFounderEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return NORMALISED_FOUNDER_EMAILS.includes(email.trim().toLowerCase());
}

/**
 * True when the given AUTH-SESSION user (or email string) is the founder.
 * Pass the object from supabase.auth.getUser()/getSession() (or the `user`
 * state derived from it) — never a profiles-table row or user input.
 */
export function isFounder(userOrEmail) {
  if (!userOrEmail) return false;
  const email = typeof userOrEmail === 'string' ? userOrEmail : userOrEmail.email;
  return isFounderEmail(email);
}
