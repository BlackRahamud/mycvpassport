/**
 * Logging + identity helpers for the analyze-cv Edge Function.
 */

/**
 * Hash an IP address with a salted SHA-256 so we can rate-limit
 * anonymous callers without retaining raw IPs. Set IP_HASH_SALT in the
 * Edge Function env. If unset, the helper still returns a deterministic
 * hash but with a default salt (avoid in production).
 */
export async function hashIp(ip) {
  if (!ip) return null;
  const salt = Deno.env.get("IP_HASH_SALT") || "cvp-default-salt-rotate-me";
  const data = new TextEncoder().encode(`${salt}:${ip}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

/**
 * Best-effort caller IP from common proxy headers.
 */
export function getCallerIp(req) {
  const candidates = [
    "cf-connecting-ip",
    "x-forwarded-for",
    "x-real-ip",
    "fly-client-ip",
  ];
  for (const h of candidates) {
    const v = req.headers.get(h);
    if (v) return v.split(",")[0].trim();
  }
  return null;
}

/**
 * Insert a row into anthropic_calls. Failures are logged to the function
 * console but do NOT propagate — we never want the audit step to break
 * a successful scan response.
 */
export async function logCall(supabase, payload) {
  try {
    const { error } = await supabase.from("anthropic_calls").insert(payload);
    if (error) {
      // eslint-disable-next-line no-console
      console.error("[analyze-cv] anthropic_calls insert failed:", error.message);
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[analyze-cv] anthropic_calls insert threw:", err);
  }
}
