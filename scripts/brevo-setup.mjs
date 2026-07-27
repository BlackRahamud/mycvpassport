/* Brevo bootstrap — run ONCE (safe to re-run, it is idempotent).
 *
 * Ensures, via the Brevo v3 API:
 *   1. the custom contact attributes SOURCE / TARGET_MARKET / SIGNUP_DATE
 *      exist. Brevo REJECTS a contact carrying an undeclared attribute
 *      ("Contact attributes not found"), so this must happen before any
 *      sync — it is the single most common cause of a silent 400.
 *   2. the two lists exist: "Candidates" and "Job Board Waitlist".
 *   3. writes the resolved ids to supabase/functions/brevo-sync/lists.json
 *      and prints the `supabase secrets set` line to pin them.
 *
 * The API key is read from the environment, NEVER hardcoded:
 *   BREVO_API_KEY=...  node scripts/brevo-setup.mjs
 * On Windows PowerShell:
 *   $env:BREVO_API_KEY = "<key>"; node scripts/brevo-setup.mjs
 *
 * Flags:
 *   --dry-run   report what exists / what would be created, change nothing
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { LIST_NAMES, ATTRIBUTE_SCHEMA } from "../supabase/functions/brevo-sync/mapping.mjs";

const BREVO = "https://api.brevo.com/v3";
const DRY = process.argv.includes("--dry-run");
const LISTS_FILE = join("supabase", "functions", "brevo-sync", "lists.json");

const apiKey = process.env.BREVO_API_KEY;
if (!apiKey) {
  console.error(`
BREVO_API_KEY is not set in this shell.

The key lives in Supabase Function secrets for the deployed function, but
this script runs locally, so it needs the value in the environment for the
length of this one command:

  PowerShell:  $env:BREVO_API_KEY = "<your v3 key>"; node scripts/brevo-setup.mjs
  bash:        BREVO_API_KEY="<your v3 key>" node scripts/brevo-setup.mjs

Get the key at Brevo -> SMTP & API -> API keys. Do not paste it into any
file in this repo.
`);
  process.exit(1);
}

const headers = { "api-key": apiKey, "Content-Type": "application/json", accept: "application/json" };

async function call(path, init = {}) {
  const res = await fetch(`${BREVO}${path}`, { ...init, headers });
  const text = await res.text().catch(() => "");
  let body = {};
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }
  return { ok: res.ok, status: res.status, body };
}

/* Fail loudly and early on a bad key — every later 401 would otherwise
   read as "nothing exists yet". */
const whoami = await call("/account");
if (!whoami.ok) {
  console.error(`Brevo rejected the key (HTTP ${whoami.status}).`,
    whoami.status === 401 ? "The key is invalid, revoked, or is an SMTP key rather than a v3 API key." : whoami.body);
  process.exit(1);
}
console.log(`Brevo account OK: ${whoami.body?.companyName ?? whoami.body?.email ?? "(unnamed)"}\n`);

/* ── 1. attributes ───────────────────────────────────────────────── */
const existingAttrs = await call("/contacts/attributes");
if (!existingAttrs.ok) {
  console.error("Could not list contact attributes:", existingAttrs.status, existingAttrs.body);
  process.exit(1);
}
const haveAttr = new Set(
  (existingAttrs.body?.attributes ?? [])
    .filter((a) => a.category === "normal")
    .map((a) => String(a.name).toUpperCase()),
);

for (const attr of ATTRIBUTE_SCHEMA) {
  if (haveAttr.has(attr.name)) {
    console.log(`attribute ${attr.name.padEnd(14)} exists`);
    continue;
  }
  if (DRY) {
    console.log(`attribute ${attr.name.padEnd(14)} WOULD CREATE (${attr.type})`);
    continue;
  }
  const made = await call(`/contacts/attributes/normal/${encodeURIComponent(attr.name)}`, {
    method: "POST",
    body: JSON.stringify({ type: attr.type }),
  });
  if (made.ok) console.log(`attribute ${attr.name.padEnd(14)} created (${attr.type})`);
  else {
    console.error(`attribute ${attr.name} FAILED`, made.status, made.body);
    process.exit(1);
  }
}
console.log("");

/* ── 2. lists ────────────────────────────────────────────────────── */
async function allLists() {
  const out = [];
  for (let offset = 0; offset < 2000; offset += 50) {
    const page = await call(`/contacts/lists?limit=50&offset=${offset}`);
    if (!page.ok) throw new Error(`list fetch failed: ${page.status}`);
    const lists = page.body?.lists ?? [];
    out.push(...lists);
    if (lists.length < 50) break;
  }
  return out;
}

/* A list needs a folder. Reuse the first one rather than littering the
   account with new folders. */
async function defaultFolderId() {
  const folders = await call("/contacts/folders?limit=50&offset=0");
  const first = folders.ok ? (folders.body?.folders ?? [])[0] : null;
  if (first) return first.id;
  if (DRY) return "(would create folder 'CVPassport')";
  const made = await call("/contacts/folders", { method: "POST", body: JSON.stringify({ name: "CVPassport" }) });
  if (!made.ok) throw new Error(`folder create failed: ${made.status} ${JSON.stringify(made.body)}`);
  return made.body.id;
}

const lists = await allLists();
const resolved = {};

for (const [kind, name] of Object.entries(LIST_NAMES)) {
  const hit = lists.find((l) => l.name === name);
  if (hit) {
    resolved[kind] = hit.id;
    console.log(`list "${name}" exists -> id ${hit.id}`);
    continue;
  }
  if (DRY) {
    console.log(`list "${name}" WOULD CREATE`);
    resolved[kind] = null;
    continue;
  }
  const folderId = await defaultFolderId();
  const made = await call("/contacts/lists", { method: "POST", body: JSON.stringify({ name, folderId }) });
  if (!made.ok) {
    console.error(`list "${name}" FAILED`, made.status, made.body);
    process.exit(1);
  }
  resolved[kind] = made.body.id;
  console.log(`list "${name}" created -> id ${made.body.id}`);
}

/* ── 3. persist ──────────────────────────────────────────────────── */
if (DRY) {
  console.log("\n--dry-run: nothing was created and lists.json was not written.");
  process.exit(0);
}

mkdirSync(dirname(LISTS_FILE), { recursive: true });
writeFileSync(
  LISTS_FILE,
  `${JSON.stringify({ candidates: resolved.signup, waitlist: resolved.waitlist, listNames: LIST_NAMES }, null, 2)}\n`,
  "utf8",
);

console.log(`
Wrote ${LISTS_FILE}

  Candidates          ${resolved.signup}
  Job Board Waitlist  ${resolved.waitlist}

Pin them on the Edge Function so it skips the name lookup entirely:

  npx supabase secrets set BREVO_LIST_ID_CANDIDATES=${resolved.signup} BREVO_LIST_ID_WAITLIST=${resolved.waitlist} --project-ref evihcqpvoorsdmzjnvjz
`);
