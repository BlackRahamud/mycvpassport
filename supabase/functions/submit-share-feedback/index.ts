// =============================================================
// submit-share-feedback  (Deno Edge Function)
//
// Phase B write path for the secure candidate share feature. An external
// reviewer with no account submits a vote (approve / pass) plus a note from
// the public /shared/candidate/<token> page. This function is the ONLY way
// that submission is written.
//
// Security:
//   - Writes ONLY into public.share_feedback. Never recruiter_notes or any
//     existing internal table.
//   - Re-validates the share live (exists, not revoked, not expired) inside
//     the function, regardless of anything the client sends.
//   - Rate limited: a hard cap of rows per share, plus per-reviewer dedup
//     using a salted SHA-256 hash of the client IP. The salt is a function
//     secret (SHARE_FEEDBACK_IP_SALT); if it is missing the function refuses
//     rather than hash with an empty salt. The raw IP is never stored.
//   - Deploy with --no-verify-jwt; public visitors call it with the anon key.
// =============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_ROWS_PER_SHARE = 25;            // hard cap of reviews per share
const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000; // per-reviewer window: 24 hours
const MAX_FEEDBACK_CHARS = 4000;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    },
  });
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// The first entry of x-forwarded-for is the real client; the rest are proxies.
function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for") || "";
  const first = fwd.split(",")[0].trim();
  return first || (req.headers.get("x-real-ip") || "").trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ status: "invalid", error: "Method not allowed." }, 405);
  }

  // Fail closed: a missing or empty salt must refuse, never hash with "".
  const salt = Deno.env.get("SHARE_FEEDBACK_IP_SALT");
  if (!salt || salt.trim().length < 16) {
    return jsonResponse({ status: "error", error: "Server not configured." }, 500);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ status: "error", error: "Server not configured." }, 500);
  }

  // Parse + validate input.
  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    return jsonResponse({ status: "invalid", error: "Invalid request body." }, 400);
  }
  const token = String(payload.public_token || payload.token || "").trim();
  const vote = String(payload.vote || "").trim().toLowerCase();
  const feedbackText = String(payload.feedback_text || "").trim().slice(0, MAX_FEEDBACK_CHARS);

  if (!token) return jsonResponse({ status: "invalid", error: "Missing token." }, 400);
  if (vote !== "approve" && vote !== "pass") {
    return jsonResponse({ status: "invalid", error: "Vote must be approve or pass." }, 400);
  }
  if (!feedbackText) {
    return jsonResponse({ status: "invalid", error: "Feedback is required." }, 400);
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Re-validate the share live, regardless of what the client claims.
  const { data: share, error: shareErr } = await admin
    .from("candidate_shares")
    .select("id, is_revoked, expires_at")
    .eq("public_token", token)
    .maybeSingle();

  if (shareErr || !share) {
    return jsonResponse({ status: "not_found" }, 404);
  }
  const expired = share.is_revoked || new Date(share.expires_at).getTime() <= Date.now();
  if (expired) {
    return jsonResponse({ status: "expired" }, 410);
  }

  // Rate limit: hard cap of reviews per share.
  const { count } = await admin
    .from("share_feedback")
    .select("id", { count: "exact", head: true })
    .eq("share_id", share.id);
  if ((count || 0) >= MAX_ROWS_PER_SHARE) {
    return jsonResponse({ status: "rate_limited" }, 429);
  }

  // Per-reviewer dedup within the window, keyed on a salted hash of the IP.
  const ip = clientIp(req);
  const ipHash = ip ? await sha256Hex(`${salt}:${ip}`) : null;
  if (ipHash) {
    const since = new Date(Date.now() - DEDUP_WINDOW_MS).toISOString();
    const { data: dup } = await admin
      .from("share_feedback")
      .select("id")
      .eq("share_id", share.id)
      .eq("reviewer_ip_hash", ipHash)
      .gte("created_at", since)
      .limit(1)
      .maybeSingle();
    if (dup) {
      return jsonResponse({ status: "already_submitted" }, 409);
    }
  }

  // Insert into the dedicated table only.
  const { error: insErr } = await admin
    .from("share_feedback")
    .insert({ share_id: share.id, vote, feedback_text: feedbackText, reviewer_ip_hash: ipHash });
  if (insErr) {
    return jsonResponse({ status: "error", error: "Could not save your review." }, 500);
  }

  return jsonResponse({ status: "ok" }, 200);
});
