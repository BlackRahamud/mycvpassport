/**
 * Cloudflare Turnstile server-side verification.
 *
 * Env config:
 *   TURNSTILE_SECRET         secret key from Cloudflare dashboard
 *   TURNSTILE_BYPASS_TOKEN   shared secret that lets the deploy-verify
 *                            script and CI skip the captcha (matches the
 *                            "bypassToken" field in the request body)
 *   DENO_ENV                 "production" → fail-closed when secret missing
 *                            anything else → fail-open (dev convenience)
 *
 * https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */

const VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * @param {{ token?: string, bypassToken?: string, remoteIp?: string }} args
 * @returns {Promise<{ ok: boolean, mode: string, reason?: string, errorCodes?: string[] }>}
 */
export async function verifyTurnstile({ token, bypassToken, remoteIp }) {
  const secret = Deno.env.get("TURNSTILE_SECRET");
  const sharedBypass = Deno.env.get("TURNSTILE_BYPASS_TOKEN");

  if (sharedBypass && bypassToken && bypassToken === sharedBypass) {
    return { ok: true, mode: "bypass" };
  }

  if (!secret) {
    const env = Deno.env.get("DENO_ENV") || "production";
    if (env === "production") {
      return {
        ok: false,
        mode: "missing_secret",
        reason:
          "TURNSTILE_SECRET not configured — set it in Supabase Edge Function env",
      };
    }
    return { ok: true, mode: "dev_fail_open" };
  }

  if (!token) {
    return { ok: false, mode: "missing_token", reason: "no_turnstile_token" };
  }

  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  if (remoteIp) body.set("remoteip", remoteIp);

  let response;
  try {
    response = await fetch(VERIFY_URL, { method: "POST", body });
  } catch (err) {
    return {
      ok: false,
      mode: "unreachable",
      reason: `turnstile_unreachable: ${String(err)}`,
    };
  }
  if (!response.ok) {
    return {
      ok: false,
      mode: "siteverify_http_error",
      reason: `siteverify HTTP ${response.status}`,
    };
  }
  let data;
  try {
    data = await response.json();
  } catch {
    return { ok: false, mode: "siteverify_bad_json" };
  }

  if (data.success) return { ok: true, mode: "verified" };
  return {
    ok: false,
    mode: "rejected",
    reason: "turnstile_rejected",
    errorCodes: data["error-codes"] ?? [],
  };
}
