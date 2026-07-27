/* One-time Supabase -> Brevo backfill. Idempotent: every write is the same
 * updateEnabled:true upsert the real-time webhook uses, so running this
 * twice (or after the webhooks are already live) can never duplicate a
 * contact — it just re-states what is already there.
 *
 * Pushes:
 *   public.profiles           (candidates only, user_type <> 'recruiter')
 *                             -> Brevo list "Candidates"
 *   public.job_board_waitlist (every row)
 *                             -> Brevo list "Job Board Waitlist"
 *
 * FIRSTNAME comes from profiles.full_name when set, otherwise from the
 * auth user's metadata `name` (which is where signUp() puts it).
 *
 * Credentials, from the environment ONLY — never hardcoded, never client
 * side. The service-role key is required because job_board_waitlist has NO
 * select policy by design (migration 052): only the service role can read
 * the list back.
 *
 *   PowerShell:
 *     $env:BREVO_API_KEY = "<v3 key>"
 *     $env:SUPABASE_URL = "https://evihcqpvoorsdmzjnvjz.supabase.co"
 *     $env:SUPABASE_SERVICE_ROLE_KEY = "<service role key>"
 *     node scripts/brevo-backfill.mjs
 *
 * Flags:
 *   --dry-run           read + map everything, print the exact payloads,
 *                       send NOTHING to Brevo
 *   --only=signups      or --only=waitlist
 *   --limit=N           cap rows per source (smoke test)
 */
import {
  buildBrevoContact,
  isSyncableEmail,
  normalizeEmail,
  LIST_NAMES,
} from "../supabase/functions/brevo-sync/mapping.mjs";

/* Top-level await rejections surface as unhandled rejections in ESM; turn a
   read/auth failure into one readable line instead of a Node stack dump.
   Re-running is always safe, so aborting mid-way costs nothing. */
const abort = (err) => {
  console.error(`\nBackfill aborted: ${err instanceof Error ? err.message : err}`);
  console.error("Nothing is left half-written — every upsert is idempotent, so just re-run once the cause is fixed.");
  process.exit(1);
};
process.on("unhandledRejection", abort);
process.on("uncaughtException", abort);

const BREVO = "https://api.brevo.com/v3";
const DRY = process.argv.includes("--dry-run");
const onlyArg = process.argv.find((a) => a.startsWith("--only="));
const ONLY = onlyArg ? onlyArg.split("=")[1] : null;
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? Math.max(1, Number(limitArg.split("=")[1])) : null;

/* --via-function routes every upsert through the deployed brevo-sync Edge
   Function's batch mode instead of calling Brevo from here. The function
   holds BREVO_API_KEY in its own secrets, so this machine never needs the
   Brevo key at all — only the service-role key to READ Supabase (the
   waitlist has no select policy) and to authorise the function call. */
const VIA_FUNCTION = process.argv.includes("--via-function");

const brevoKey = process.env.BREVO_API_KEY;
const supabaseUrl = (process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || "").replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const missing = [];
if (!brevoKey && !DRY && !VIA_FUNCTION) missing.push("BREVO_API_KEY");
if (!supabaseUrl) missing.push("SUPABASE_URL");
if (!serviceKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
if (missing.length) {
  console.error(`
Missing from the environment: ${missing.join(", ")}

  SUPABASE_URL                https://evihcqpvoorsdmzjnvjz.supabase.co
  SUPABASE_SERVICE_ROLE_KEY   Supabase -> Project Settings -> API -> service_role
                              (needed because public.job_board_waitlist has no
                              select policy — only the service role can read it)
  BREVO_API_KEY               Brevo -> SMTP & API -> API keys (not needed for --dry-run)

PowerShell:
  $env:SUPABASE_URL = "https://evihcqpvoorsdmzjnvjz.supabase.co"
  $env:SUPABASE_SERVICE_ROLE_KEY = "<service role key>"
  $env:BREVO_API_KEY = "<v3 key>"
  node scripts/brevo-backfill.mjs --dry-run
`);
  process.exit(1);
}

const sbHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" };
const brevoHeaders = { "api-key": brevoKey, "Content-Type": "application/json", accept: "application/json" };

/* ── Supabase reads (REST, service role bypasses RLS) ─────────────── */
async function fetchAll(table, select, extraQuery = "") {
  const out = [];
  const page = 1000;
  for (let offset = 0; offset < 200000; offset += page) {
    const url = `${supabaseUrl}/rest/v1/${table}?select=${encodeURIComponent(select)}${extraQuery}&order=created_at.asc&limit=${page}&offset=${offset}`;
    const res = await fetch(url, { headers: sbHeaders });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`read ${table} failed: ${res.status} ${t.slice(0, 300)}`);
    }
    const rows = await res.json();
    out.push(...rows);
    if (rows.length < page) break;
    if (LIMIT && out.length >= LIMIT) break;
  }
  return LIMIT ? out.slice(0, LIMIT) : out;
}

/* auth.users is not exposed over REST; the admin endpoint is. One paged
   sweep builds an id -> metadata-name map so the backfill does not make a
   request per profile. */
async function fetchAuthNames() {
  const byId = new Map();
  for (let page = 1; page <= 200; page += 1) {
    const res = await fetch(`${supabaseUrl}/auth/v1/admin/users?page=${page}&per_page=200`, { headers: sbHeaders });
    if (!res.ok) {
      console.warn(`  (auth name lookup unavailable: HTTP ${res.status} — FIRSTNAME will fall back to profiles.full_name)`);
      return byId;
    }
    const body = await res.json().catch(() => ({}));
    const users = body.users ?? [];
    for (const u of users) {
      const meta = u.user_metadata || {};
      const name = meta.name || meta.full_name || null;
      if (name) byId.set(u.id, name);
    }
    if (users.length < 200) break;
  }
  return byId;
}

/* ── Brevo upsert (identical body to the Edge Function) ───────────── */
const FUNCTION_URL = `${supabaseUrl.replace(".supabase.co", ".functions.supabase.co")}/brevo-sync`;

/** Batch through the Edge Function. It resolves the list ids and holds the
 *  Brevo key itself, so nothing sensitive is needed locally. */
async function pushViaFunction(kind, rows) {
  const CHUNK = 50;
  const totals = { sent: 0, failed: 0, skipped: 0 };
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const res = await fetch(FUNCTION_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ rows: chunk.map((r) => ({ ...r, kind })) }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.skipped) {
      console.error(`  chunk ${i / CHUNK + 1} refused:`, res.status, JSON.stringify(body));
      totals.failed += chunk.length;
      continue;
    }
    totals.sent += body.synced ?? 0;
    totals.failed += body.failed ?? 0;
    totals.skipped += body.skipped ?? 0;
    console.log(`  chunk ${i / CHUNK + 1}: synced ${body.synced} failed ${body.failed} skipped ${body.skipped}`);
  }
  return totals;
}

async function resolveListId(kind) {
  const wanted = LIST_NAMES[kind];
  for (let offset = 0; offset < 2000; offset += 50) {
    const res = await fetch(`${BREVO}/contacts/lists?limit=50&offset=${offset}`, { headers: brevoHeaders });
    if (!res.ok) throw new Error(`Brevo list lookup failed: ${res.status}`);
    const body = await res.json().catch(() => ({}));
    const lists = body.lists ?? [];
    const hit = lists.find((l) => l.name === wanted);
    if (hit) return hit.id;
    if (lists.length < 50) break;
  }
  throw new Error(`Brevo list "${wanted}" not found — run: node scripts/brevo-setup.mjs`);
}

async function upsert(contact) {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const res = await fetch(`${BREVO}/contacts`, {
      method: "POST",
      headers: brevoHeaders,
      body: JSON.stringify(contact),
    });
    if (res.ok) return { ok: true };
    // Brevo rate limit. Back off and retry rather than losing the row.
    if (res.status === 429) {
      const wait = 1500 * (attempt + 1);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    const text = await res.text().catch(() => "");
    return { ok: false, status: res.status, body: text.slice(0, 200) };
  }
  return { ok: false, status: 429, body: "rate limited after retries" };
}

/* ── Run ─────────────────────────────────────────────────────────── */
const stats = {
  signups: { read: 0, sent: 0, skipped: 0, failed: 0 },
  waitlist: { read: 0, sent: 0, skipped: 0, failed: 0 },
};
const failures = [];

/* `people` are raw {email, firstName, targetMarket, createdAt} — the shape
   the Edge Function's batch mode expects. In direct mode they are mapped
   here with the same buildBrevoContact(); via-function the function maps
   them. Either way there is exactly ONE mapping implementation. */
async function push(kind, people) {
  const bucket = kind === "signup" ? stats.signups : stats.waitlist;

  if (DRY) { bucket.sent += people.length; return; }

  if (VIA_FUNCTION) {
    const t = await pushViaFunction(kind, people);
    bucket.sent += t.sent;
    bucket.failed += t.failed;
    bucket.skipped += t.skipped;
    if (t.failed) failures.push({ kind, count: t.failed, via: "function" });
    return;
  }

  const listId = await resolveListId(kind);
  for (const person of people) {
    const contact = buildBrevoContact({ ...person, kind, listId });
    const r = await upsert(contact);
    if (r.ok) bucket.sent += 1;
    else {
      bucket.failed += 1;
      failures.push({ email: contact.email, status: r.status, body: r.body });
      console.error(`  FAIL ${contact.email} -> HTTP ${r.status} ${r.body}`);
    }
  }
}

console.log(`Brevo backfill${DRY ? " (DRY RUN — nothing will be sent)" : ""}${VIA_FUNCTION ? " [via brevo-sync Edge Function — no Brevo key needed locally]" : ""}\n`);

if (!ONLY || ONLY === "signups") {
  console.log("Reading public.profiles ...");
  // user_type is NULL for candidates and 'recruiter' for the HR side.
  const rows = await fetchAll("profiles", "id,email,full_name,user_type,created_at", "&or=(user_type.is.null,user_type.neq.recruiter)");
  stats.signups.read = rows.length;
  console.log(`  ${rows.length} candidate profile rows`);

  const names = await fetchAuthNames();

  const people = [];
  for (const row of rows) {
    if (!isSyncableEmail(row.email)) { stats.signups.skipped += 1; continue; }
    people.push({
      email: row.email,
      firstName: row.full_name || names.get(row.id) || null,
      createdAt: row.created_at,
    });
  }
  if (DRY && people.length) {
    console.log("  sample payload:", JSON.stringify(buildBrevoContact({ ...people[0], kind: "signup", listId: 0 })));
  }
  console.log(`  pushing ${people.length} -> "${LIST_NAMES.signup}"`);
  await push("signup", people);
}

if (!ONLY || ONLY === "waitlist") {
  console.log("\nReading public.job_board_waitlist ...");
  const rows = await fetchAll("job_board_waitlist", "email,target_market,source,created_at");
  stats.waitlist.read = rows.length;
  console.log(`  ${rows.length} waitlist rows`);

  /* One person can hold seats for two markets (unique is per email+market).
     Brevo is one contact per email, so collapse to the widest intent:
     'both' wins, otherwise two different markets means 'both'. */
  const byEmail = new Map();
  for (const row of rows) {
    if (!isSyncableEmail(row.email)) { stats.waitlist.skipped += 1; continue; }
    const email = normalizeEmail(row.email);
    const prev = byEmail.get(email);
    if (!prev) { byEmail.set(email, { ...row, email }); continue; }
    const market = prev.target_market === row.target_market ? prev.target_market : "both";
    byEmail.set(email, { ...prev, target_market: market, created_at: prev.created_at });
  }
  const collapsed = rows.length - stats.waitlist.skipped - byEmail.size;
  if (collapsed > 0) console.log(`  ${collapsed} duplicate email(s) collapsed to one contact (target_market -> 'both')`);

  const people = [...byEmail.values()].map((row) => ({
    email: row.email,
    targetMarket: row.target_market,
    createdAt: row.created_at,
  }));
  if (DRY && people.length) {
    console.log("  sample payload:", JSON.stringify(buildBrevoContact({ ...people[0], kind: "waitlist", listId: 0 })));
  }
  console.log(`  pushing ${people.length} -> "${LIST_NAMES.waitlist}"`);
  await push("waitlist", people);
}

console.log(`
──────────────────────────────────────────────
Backfill ${DRY ? "DRY RUN " : ""}summary

  Candidates          read ${stats.signups.read}  upserted ${stats.signups.sent}  skipped ${stats.signups.skipped}  failed ${stats.signups.failed}
  Job Board Waitlist  read ${stats.waitlist.read}  upserted ${stats.waitlist.sent}  skipped ${stats.waitlist.skipped}  failed ${stats.waitlist.failed}
──────────────────────────────────────────────`);

if (failures.length) {
  console.log(`\n${failures.length} failure(s). Re-running is safe — the upsert is idempotent.`);
  process.exit(1);
}
