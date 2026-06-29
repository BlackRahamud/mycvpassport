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

/**
 * Submit an external review (vote + note) for a shared candidate. Goes only
 * to the submit-share-feedback Edge Function, which writes to share_feedback.
 * Returns { status, body } where status is the HTTP code:
 *   200 -> ok
 *   400 -> invalid input
 *   404 -> not found / invalid link
 *   409 -> a review was already submitted from here within the window
 *   410 -> expired or revoked
 *   429 -> this share has reached its review limit
 */
export async function submitShareFeedback(token, vote, feedbackText) {
  const url = `${SUPABASE_URL}/functions/v1/submit-share-feedback`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ public_token: token, vote, feedback_text: feedbackText }),
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body };
}
