// =============================================================
// supabase/functions/brevo-sync/index.ts
//
// Real-time Supabase -> Brevo contact sync. Driven by Database Webhooks on
// INSERT, following the same shape as ats-lead-welcome:
//
//   public.profiles          INSERT -> Brevo list "Candidates"
//   public.job_board_waitlist INSERT -> Brevo list "Job Board Waitlist"
//
// SAFETY — why this can never slow a signup down:
// a Database Webhook fires from Postgres AFTER the row is committed, out of
// band from the client request. The browser never awaits Brevo. On top of
// that this function ALWAYS answers 200 (see `ok()`), so a Brevo outage
// produces a logged line and nothing else — no webhook retry storm, no
// error surfaced anywhere near the user's flow.
//
// SCHEMA AUDIT (done against the repo, not assumed):
//   - Signups live in public.profiles. There is NO trigger on auth.users —
//     the row is written client-side by ensureProfileRow() in
//     src/useCvpAuth.js, which upserts { id, email, plan:'FREE', flagged,
//     features } and, for employer signups only, user_type:'recruiter'.
//     => `email` IS on the INSERT. `full_name` is NOT (it is written later
//        by the profile editor), so FIRSTNAME is resolved from auth
//        metadata (`user_metadata.name`), which signUp() does set.
//     => Because the row is written on first SESSION, a signup that never
//        confirms its email never reaches Brevo. That is the desirable
//        behaviour for a marketing list, but it is a real behavioural
//        detail — see docs/BREVO_SYNC.md.
//   - The waitlist is public.job_board_waitlist (migration 052):
//     email, target_market ('india'|'gulf'|'both'), source, created_at,
//     user_id. Unique on (lower(email), target_market).
//
// Secrets (Supabase Function secrets, never client-side):
//   BREVO_API_KEY                 required
//   BREVO_LIST_ID_CANDIDATES      optional — skips a lookup
//   BREVO_LIST_ID_WAITLIST        optional — skips a lookup
//   BREVO_SYNC_WEBHOOK_SECRET     optional — when set, callers must send
//                                 a matching x-webhook-secret header
//   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY  injected by the platform;
//                                 used ONLY to read the signup's display
//                                 name out of auth metadata.
// =============================================================

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import {
  ATTRIBUTE_SCHEMA,
  LIST_NAMES,
  buildBrevoContact,
  interpretWebhook,
  isSyncableEmail,
  normalizeEmail,
} from "./mapping.mjs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

/* Always 200. A non-2xx here would make Postgres' webhook worker retry a
   call that is never going to succeed, and would put Brevo's health on the
   critical path of a database insert. */
const ok = (body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const BREVO = "https://api.brevo.com/v3";

/* Warm-invocation cache: resolving a list by name costs a round trip, and
   a busy signup hour would otherwise repeat it every time. */
const listIdCache = new Map<string, number>();

function brevoHeaders(apiKey: string) {
  return { "api-key": apiKey, "Content-Type": "application/json", accept: "application/json" };
}

/** env id -> cache -> look up by name -> create. Never throws; returns null
 *  so the caller can log and bail without failing the webhook. */
async function resolveListId(kind: "signup" | "waitlist", apiKey: string): Promise<number | null> {
  const envKey = kind === "signup" ? "BREVO_LIST_ID_CANDIDATES" : "BREVO_LIST_ID_WAITLIST";
  const fromEnv = Number(Deno.env.get(envKey) ?? "");
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;

  const cached = listIdCache.get(kind);
  if (cached) return cached;

  const wanted = LIST_NAMES[kind];
  try {
    // Brevo pages at 50 by default; 100 is the max and is plenty here.
    for (let offset = 0; offset < 1000; offset += 100) {
      const res = await fetch(`${BREVO}/contacts/lists?limit=100&offset=${offset}`, {
        headers: brevoHeaders(apiKey),
      });
      if (!res.ok) {
        console.error("brevo-sync: list lookup failed", res.status);
        return null;
      }
      const body = await res.json().catch(() => ({})) as { lists?: Array<{ id: number; name: string }> };
      const lists = body.lists ?? [];
      const hit = lists.find((l) => l.name === wanted);
      if (hit) {
        listIdCache.set(kind, hit.id);
        return hit.id;
      }
      if (lists.length < 100) break;
    }
    console.error(`brevo-sync: Brevo list "${wanted}" does not exist — run scripts/brevo-setup.mjs`);
    return null;
  } catch (err) {
    console.error("brevo-sync: list lookup threw", err instanceof Error ? err.message : err);
    return null;
  }
}

/** The signup's display name. profiles.full_name is empty at INSERT, but
 *  signUp() puts `name` in auth metadata, so read it from there. Best
 *  effort only — a missing name must never stop the contact syncing. */
async function lookupFirstName(authUserId: string | null): Promise<string | null> {
  if (!authUserId) return null;
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return null;
  try {
    const res = await fetch(`${url}/auth/v1/admin/users/${authUserId}`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    if (!res.ok) return null;
    const user = await res.json().catch(() => ({})) as {
      user_metadata?: { name?: string; full_name?: string };
    };
    const meta = user.user_metadata ?? {};
    return meta.name || meta.full_name || null;
  } catch {
    return null;
  }
}

/** One upsert. Returns a small result object; never throws. */
async function upsertContact(
  apiKey: string,
  contact: ReturnType<typeof buildBrevoContact>,
): Promise<{ ok: boolean; status?: number; reason?: string }> {
  try {
    const res = await fetch(`${BREVO}/contacts`, {
      method: "POST",
      headers: brevoHeaders(apiKey),
      body: JSON.stringify(contact),
    });
    // 201 created, 204 updated (updateEnabled), both are success.
    if (res.ok) return { ok: true, status: res.status };
    const text = await res.text().catch(() => "");
    // Log the email (allowed) and Brevo's message — no other PII.
    console.error("brevo-sync: upsert failed", { email: contact.email, status: res.status, body: text.slice(0, 300) });
    return { ok: false, status: res.status, reason: "brevo-error" };
  } catch (err) {
    console.error("brevo-sync: upsert threw", { email: contact.email, message: err instanceof Error ? err.message : String(err) });
    return { ok: false, reason: "network" };
  }
}

/* ── Privileged modes ──────────────────────────────────────────────
   `mode: "setup"` and `mode: "backfill"` exist so the BREVO_API_KEY never
   has to leave Supabase: the operator triggers them with the service-role
   key and the function uses its own injected secret to talk to Brevo.

   They are gated on the service-role bearer token, NOT on the anon key —
   otherwise anyone holding the (public) anon key could trigger a full
   re-push of every contact and burn the Brevo quota. */
function isServiceRoleCaller(req: Request): boolean {
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceKey) return false;
  const auth = req.headers.get("Authorization") ?? "";
  const bearer = auth.replace(/^Bearer\s+/i, "").trim();
  return bearer.length > 0 && bearer === serviceKey;
}

/** Ensure the custom attributes and both lists exist. Idempotent. */
async function runSetup(apiKey: string) {
  const steps: Record<string, unknown> = {};

  const attrRes = await fetch(`${BREVO}/contacts/attributes`, { headers: brevoHeaders(apiKey) });
  if (!attrRes.ok) return { error: `attribute list failed: HTTP ${attrRes.status}` };
  const attrBody = await attrRes.json().catch(() => ({})) as { attributes?: Array<{ name: string; category: string }> };
  const have = new Set(
    (attrBody.attributes ?? []).filter((a) => a.category === "normal").map((a) => String(a.name).toUpperCase()),
  );

  const attributes: Record<string, string> = {};
  for (const attr of ATTRIBUTE_SCHEMA) {
    if (have.has(attr.name)) { attributes[attr.name] = "exists"; continue; }
    const made = await fetch(`${BREVO}/contacts/attributes/normal/${encodeURIComponent(attr.name)}`, {
      method: "POST",
      headers: brevoHeaders(apiKey),
      body: JSON.stringify({ type: attr.type }),
    });
    attributes[attr.name] = made.ok ? "created" : `FAILED HTTP ${made.status}`;
  }
  steps.attributes = attributes;

  /* A Brevo list needs a folder; reuse the first rather than littering. */
  let folderId: number | null = null;
  const folders = await fetch(`${BREVO}/contacts/folders?limit=50&offset=0`, { headers: brevoHeaders(apiKey) });
  if (folders.ok) {
    const fb = await folders.json().catch(() => ({})) as { folders?: Array<{ id: number }> };
    folderId = (fb.folders ?? [])[0]?.id ?? null;
  }
  if (folderId === null) {
    const made = await fetch(`${BREVO}/contacts/folders`, {
      method: "POST", headers: brevoHeaders(apiKey), body: JSON.stringify({ name: "CVPassport" }),
    });
    if (!made.ok) return { error: `folder create failed: HTTP ${made.status}` };
    folderId = ((await made.json().catch(() => ({}))) as { id?: number }).id ?? null;
  }

  const listIds: Record<string, number | null> = {};
  const listState: Record<string, string> = {};
  for (const kind of ["signup", "waitlist"] as const) {
    const name = LIST_NAMES[kind];
    let found: number | null = null;
    for (let offset = 0; offset < 2000; offset += 50) {
      const res = await fetch(`${BREVO}/contacts/lists?limit=50&offset=${offset}`, { headers: brevoHeaders(apiKey) });
      if (!res.ok) break;
      const body = await res.json().catch(() => ({})) as { lists?: Array<{ id: number; name: string }> };
      const lists = body.lists ?? [];
      const hit = lists.find((l) => l.name === name);
      if (hit) { found = hit.id; break; }
      if (lists.length < 50) break;
    }
    if (found !== null) { listIds[kind] = found; listState[name] = "exists"; continue; }
    const made = await fetch(`${BREVO}/contacts/lists`, {
      method: "POST", headers: brevoHeaders(apiKey), body: JSON.stringify({ name, folderId }),
    });
    if (!made.ok) { listIds[kind] = null; listState[name] = `FAILED HTTP ${made.status}`; continue; }
    const id = ((await made.json().catch(() => ({}))) as { id?: number }).id ?? null;
    listIds[kind] = id;
    listState[name] = "created";
    if (id) listIdCache.set(kind, id);
  }
  steps.lists = listState;

  return {
    ...steps,
    listIds: { candidates: listIds.signup, waitlist: listIds.waitlist },
    listNames: LIST_NAMES,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const expectedSecret = Deno.env.get("BREVO_SYNC_WEBHOOK_SECRET");
    const secretOk = !expectedSecret || req.headers.get("x-webhook-secret") === expectedSecret;
    const privileged = isServiceRoleCaller(req);
    if (!secretOk && !privileged) {
      console.warn("brevo-sync: unauthorized call");
      return ok({ skipped: "unauthorized" });
    }

    const apiKey = Deno.env.get("BREVO_API_KEY");
    if (!apiKey) {
      console.error("brevo-sync: BREVO_API_KEY not set — nothing synced");
      return ok({ skipped: "missing-api-key" });
    }

    const payload = await req.json().catch(() => null) as
      | {
          type?: string;
          table?: string;
          schema?: string;
          record?: Record<string, unknown>;
          // Batch mode, used by scripts/brevo-backfill.mjs
          rows?: Array<{ kind?: string; email?: string; firstName?: string | null; targetMarket?: string | null; createdAt?: string | null }>;
          mode?: string;
        }
      | null;

    if (!payload) return ok({ skipped: "malformed-payload" });

    // ── Privileged: ensure the Brevo attributes + both lists exist, and
    //    report their ids. Service-role bearer required.
    if (payload.mode === "setup") {
      if (!privileged) {
        console.warn("brevo-sync: setup refused — service-role bearer required");
        return ok({ skipped: "requires-service-role" });
      }
      const result = await runSetup(apiKey);
      console.log("brevo-sync: setup", result);
      return ok({ mode: "setup", ...result });
    }

    // ── Batch mode: the backfill posts pre-shaped rows through the exact
    //    same mapping + upsert path as the webhook, so there is one
    //    definition of a Brevo contact in the whole system.
    if (Array.isArray(payload.rows)) {
      if (!privileged) {
        // Otherwise the public anon key would be enough to inject arbitrary
        // contacts into the marketing lists.
        console.warn("brevo-sync: batch refused — service-role bearer required");
        return ok({ skipped: "requires-service-role" });
      }
      let synced = 0;
      let failed = 0;
      let skipped = 0;
      for (const row of payload.rows) {
        const kind = row.kind === "waitlist" ? "waitlist" : "signup";
        if (!isSyncableEmail(row.email)) { skipped += 1; continue; }
        const listId = await resolveListId(kind, apiKey);
        if (!listId) { failed += 1; continue; }
        const contact = buildBrevoContact({
          kind,
          email: row.email as string,
          listId,
          firstName: row.firstName ?? null,
          targetMarket: row.targetMarket ?? null,
          createdAt: row.createdAt ?? null,
        });
        const result = await upsertContact(apiKey, contact);
        if (result.ok) synced += 1; else failed += 1;
      }
      console.log("brevo-sync: batch done", { synced, failed, skipped });
      return ok({ mode: "batch", synced, failed, skipped });
    }

    // ── Webhook mode
    if (payload.type !== "INSERT" || !payload.record) {
      return ok({ skipped: "not-an-insert" });
    }

    const person = interpretWebhook(payload);
    if (!person) {
      // Either a table we do not sync, or a recruiter profile (HR side).
      return ok({ skipped: "not-a-candidate-row" });
    }

    if (!isSyncableEmail(person.email)) {
      console.log("brevo-sync: skipping row with no usable email", { table: payload.table });
      return ok({ skipped: "no-email" });
    }

    const listId = await resolveListId(person.kind, apiKey);
    if (!listId) return ok({ skipped: "no-list-id" });

    const firstName = person.firstName || (await lookupFirstName(person.authUserId));

    const contact = buildBrevoContact({
      kind: person.kind,
      email: person.email as string,
      listId,
      firstName,
      targetMarket: person.targetMarket ?? null,
      createdAt: person.createdAt ?? new Date().toISOString(),
    });

    const result = await upsertContact(apiKey, contact);
    if (!result.ok) return ok({ skipped: result.reason, status: result.status ?? null });

    console.log("brevo-sync: synced", {
      email: normalizeEmail(person.email),
      list: LIST_NAMES[person.kind],
      listId,
      source: contact.attributes.SOURCE,
    });
    return ok({ synced: true, listId, source: contact.attributes.SOURCE });
  } catch (err) {
    console.error("brevo-sync: unhandled error", err instanceof Error ? err.message : err);
    return ok({ skipped: "internal-error" });
  }
});
