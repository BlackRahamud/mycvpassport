// Public read path for a shared candidate link. Talks ONLY to the
// get-shared-candidate Edge Function, never to the applications table.
// The anon key is public (already in the client bundle) and lets an
// account-less reviewer reach the function; the function uses the service
// role internally and returns a strict whitelist.

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

/**
 * Fetch a shared candidate by public token.
 * Returns { status, body } where status is the HTTP code:
 *   200 -> body.candidate is the whitelisted view
 *   410 -> { status: "expired" }
 *   404 -> not found / invalid link
 */
export async function getSharedCandidate(token) {
  const url = `${SUPABASE_URL}/functions/v1/get-shared-candidate?token=${encodeURIComponent(token)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body };
}
