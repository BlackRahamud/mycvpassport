// =============================================================
// get-shared-candidate  (Deno Edge Function)
//
// Phase A read path for the secure candidate share feature. An external
// reviewer with no account opens /shared/candidate/<public_token>; the
// public page calls this function with the token and nothing else.
//
// This function is the ONLY way the public page reads candidate data. It
// uses the service role internally and returns a strict whitelist. It
// never exposes the internal ATS score, recruiter notes, keyword match
// data, or the raw cv_snapshot blob.
//
// Flow:
//   - look up the share by public_token. None -> 404.
//   - revoked, or past expires_at -> 410 { status: "expired" }.
//   - else return name, role, stage, location, notice period, visa status,
//     and the sharing company. These regional fit fields are always sent.
//   - if hide_contact_info is true, email / phone / photo are omitted from
//     the payload entirely (not just hidden in the UI).
//   - mint a 20 minute signed URL for the resume from the private
//     applicant-cvs bucket. Never a public URL.
//   - increment view_count and set last_viewed_at.
//   - respond with Cache-Control: no-store.
// =============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const RESUME_BUCKET = "applicant-cvs";
const SIGNED_URL_TTL_SECONDS = 20 * 60; // 20 minutes

// Map raw application.status to a clean, sentence-case stage label.
const STAGE_LABELS: Record<string, string> = {
  new: "New",
  submitted: "New",
  viewed: "Viewed",
  shortlist: "Shortlisted",
  shortlisted: "Shortlisted",
  ready: "Ready to interview",
  interview: "Interviewing",
  interviewed: "Interviewed",
  offer: "Offer extended",
  hired: "Hired",
  rejected: "Not progressing",
};

function stageLabel(status: string): string {
  if (!status) return "In review";
  const key = String(status).toLowerCase();
  if (STAGE_LABELS[key]) return STAGE_LABELS[key];
  // Fallback: capitalise the raw status rather than invent one.
  return key.charAt(0).toUpperCase() + key.slice(1);
}

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Accept the token via ?token= (GET) or { public_token } / { token } (POST).
  let token = new URL(req.url).searchParams.get("token") || "";
  if (!token && req.method === "POST") {
    try {
      const body = await req.json();
      token = body?.public_token || body?.token || "";
    } catch {
      // no body
    }
  }
  token = String(token || "").trim();
  if (!token) {
    return jsonResponse({ status: "invalid", error: "Missing token." }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return jsonResponse({ status: "error", error: "Server not configured." }, 500);
  }
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Look up the share by public_token.
  const { data: share, error: shareErr } = await admin
    .from("candidate_shares")
    .select("id, application_id, expires_at, is_revoked, hide_contact_info, view_count")
    .eq("public_token", token)
    .maybeSingle();

  if (shareErr || !share) {
    return jsonResponse({ status: "not_found" }, 404);
  }

  // 2. Revoked or expired -> 410.
  const expired = share.is_revoked || new Date(share.expires_at).getTime() <= Date.now();
  if (expired) {
    return jsonResponse({ status: "expired" }, 410);
  }

  // 3. Fetch the application (the shared candidate) + its job for the company.
  const { data: app, error: appErr } = await admin
    .from("applications")
    .select("id, job_id, candidate_name, candidate_email, candidate_phone, visa_status, cv_file_path, cv_snapshot, status")
    .eq("id", share.application_id)
    .maybeSingle();

  if (appErr || !app) {
    return jsonResponse({ status: "not_found" }, 404);
  }

  let company = "";
  if (app.job_id) {
    const { data: job } = await admin
      .from("jobs")
      .select("company, title")
      .eq("id", app.job_id)
      .maybeSingle();
    company = job?.company || "";
    // Role falls back to the job title when the CV carries no target role.
    app.__jobTitle = job?.title || "";
  }

  // Derived regional fields live inside the cv_snapshot JSON blob.
  const cv = (app.cv_snapshot && typeof app.cv_snapshot === "object") ? app.cv_snapshot : {};
  const personal = (cv.personal && typeof cv.personal === "object")
    ? cv.personal
    : (cv.basics && typeof cv.basics === "object" ? cv.basics : {});
  const role = cv.desired_job || cv.target_role || cv.desired_position
    || personal.headline || app.__jobTitle || "Candidate";
  const location = personal.location || cv.location || "";
  const noticePeriod = cv.notice_period || cv.availability || personal.notice_period || "";

  // 4. Strict whitelist. Regional fit fields are always included.
  const msLeft = new Date(share.expires_at).getTime() - Date.now();
  const expiresInDays = Math.max(1, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
  const payload: Record<string, unknown> = {
    status: "ok",
    expiresInDays,
    candidate: {
      name: app.candidate_name || "Candidate",
      role,
      stage: stageLabel(app.status),
      location,
      noticePeriod,
      visaStatus: app.visa_status || "",
      company,
      contactHidden: !!share.hide_contact_info,
    },
  };

  // Contact info only when the recruiter chose to share it.
  if (!share.hide_contact_info) {
    const contactCandidate = payload.candidate as Record<string, unknown>;
    contactCandidate.email = app.candidate_email || "";
    contactCandidate.phone = app.candidate_phone || "";
    if (personal.photo || cv.photo) contactCandidate.photo = personal.photo || cv.photo;
  }

  // 5. Short-lived signed URL for the resume. Never a public URL.
  if (app.cv_file_path) {
    const { data: signed } = await admin.storage
      .from(RESUME_BUCKET)
      .createSignedUrl(app.cv_file_path, SIGNED_URL_TTL_SECONDS);
    if (signed?.signedUrl) {
      (payload.candidate as Record<string, unknown>).resumeUrl = signed.signedUrl;
      const parts = app.cv_file_path.split("/");
      (payload.candidate as Record<string, unknown>).resumeFileName = parts[parts.length - 1] || "resume.pdf";
    }
  }

  // 6. Best-effort view tracking. Never block or fail the response on this.
  try {
    await admin
      .from("candidate_shares")
      .update({ view_count: (share.view_count || 0) + 1, last_viewed_at: new Date().toISOString() })
      .eq("id", share.id);
  } catch {
    // ignore
  }

  return jsonResponse(payload, 200);
});
