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
//     and the SHARING RECRUITER's brand (hr_profiles.company_name, keyed to
//     share.created_by; NOT jobs.company). Regional fit fields are always
//     sent.
//   - if hide_contact_info is true, email / phone / photo are omitted from
//     the payload entirely (not just hidden in the UI).
//   - mint two 20 minute signed URLs for the resume from the private
//     applicant-cvs bucket: one inline (for the in-page embed) and one with
//     a download disposition. Never a public URL.
//   - increment view_count and set last_viewed_at (fire and forget).
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

// Build a clean, header-safe download filename from the candidate name.
// Allowlist letters (any script), numbers, spaces and a few safe punctuation
// marks; everything else (slashes, quotes, control and reserved characters)
// becomes a space. So a name like O'Brien/test cannot break the
// Content-Disposition header.
function safeFileName(name: string, ext: string): string {
  const cleanedBase = String(name || "")
    .replace(/[^\p{L}\p{N}\s._()&-]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  const base = cleanedBase ? `${cleanedBase} resume` : "candidate resume";
  const safeExt = /^[a-z0-9]{1,5}$/i.test(ext) ? ext.toLowerCase() : "pdf";
  return `${base}.${safeExt}`;
}

// Resolve the sharing recruiter's brand from their own account, keyed to the
// share creator. hr_profiles.company_name is the canonical source, with
// profiles.company_name as a fallback. Never jobs.company (the employer).
async function resolveBrand(admin: ReturnType<typeof createClient>, createdBy: string): Promise<string> {
  const [hr, prof] = await Promise.all([
    admin.from("hr_profiles").select("company_name").eq("user_id", createdBy).maybeSingle(),
    admin.from("profiles").select("company_name").eq("id", createdBy).maybeSingle(),
  ]);
  return String(hr.data?.company_name || prof.data?.company_name || "").trim();
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

  // 1. One embedded query: share + its application + the job title.
  const { data: share, error: shareErr } = await admin
    .from("candidate_shares")
    .select(
      "id, created_by, expires_at, is_revoked, hide_contact_info, view_count, " +
      "applications(id, candidate_name, candidate_email, candidate_phone, visa_status, cv_file_path, cv_snapshot, status, jobs(title))",
    )
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

  const app = Array.isArray(share.applications) ? share.applications[0] : share.applications;
  if (!app) {
    return jsonResponse({ status: "not_found" }, 404);
  }
  const job = Array.isArray(app.jobs) ? app.jobs[0] : app.jobs;
  const jobTitle = job?.title || "";

  // Derived regional fields live inside the cv_snapshot JSON blob.
  const cv = (app.cv_snapshot && typeof app.cv_snapshot === "object") ? app.cv_snapshot : {};
  const personal = (cv.personal && typeof cv.personal === "object")
    ? cv.personal
    : (cv.basics && typeof cv.basics === "object" ? cv.basics : {});
  const role = cv.desired_job || cv.target_role || cv.desired_position
    || personal.headline || jobTitle || "Candidate";
  const location = personal.location || cv.location || "";
  const noticePeriod = cv.notice_period || cv.availability || personal.notice_period || "";

  // Clean, header-safe download filename (never the raw storage key).
  const ext = (String(app.cv_file_path || "").split(".").pop() || "pdf");
  const cleanFileName = safeFileName(app.candidate_name, ext);

  // 3. Resolve brand + mint both signed URLs in parallel.
  const inlinePromise = app.cv_file_path
    ? admin.storage.from(RESUME_BUCKET).createSignedUrl(app.cv_file_path, SIGNED_URL_TTL_SECONDS)
    : Promise.resolve(null);
  const downloadPromise = app.cv_file_path
    ? admin.storage.from(RESUME_BUCKET).createSignedUrl(app.cv_file_path, SIGNED_URL_TTL_SECONDS, { download: cleanFileName })
    : Promise.resolve(null);
  const [brand, inlineSigned, downloadSigned] = await Promise.all([
    resolveBrand(admin, share.created_by),
    inlinePromise,
    downloadPromise,
  ]);

  // 4. Strict whitelist. Regional fit fields are always included.
  const msLeft = new Date(share.expires_at).getTime() - Date.now();
  const expiresInDays = Math.max(1, Math.ceil(msLeft / (24 * 60 * 60 * 1000)));
  const candidate: Record<string, unknown> = {
    name: app.candidate_name || "Candidate",
    role,
    stage: stageLabel(app.status),
    location,
    noticePeriod,
    visaStatus: app.visa_status || "",
    company: brand,
    contactHidden: !!share.hide_contact_info,
  };

  // Contact info only when the recruiter chose to share it.
  if (!share.hide_contact_info) {
    candidate.email = app.candidate_email || "";
    candidate.phone = app.candidate_phone || "";
    if (personal.photo || cv.photo) candidate.photo = personal.photo || cv.photo;
  }

  // Inline + download signed URLs (never public). Inline feeds the in-page
  // embed; download carries a Content-Disposition so the button downloads.
  if (inlineSigned?.data?.signedUrl) {
    candidate.resumeUrl = inlineSigned.data.signedUrl;
    candidate.resumeFileName = cleanFileName;
  }
  if (downloadSigned?.data?.signedUrl) {
    candidate.resumeDownloadUrl = downloadSigned.data.signedUrl;
  }

  // 5. Fire-and-forget view tracking. Never blocks the response.
  const bump = admin
    .from("candidate_shares")
    .update({ view_count: (share.view_count || 0) + 1, last_viewed_at: new Date().toISOString() })
    .eq("id", share.id);
  try {
    // @ts-ignore EdgeRuntime is a Supabase edge global
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(Promise.resolve(bump).then(() => {}, () => {}));
    } else {
      Promise.resolve(bump).then(() => {}, () => {});
    }
  } catch {
    // ignore
  }

  return jsonResponse({ status: "ok", expiresInDays, candidate }, 200);
});
