/* Brevo mapping verification — runs with NO credentials.
 *
 * Exercises supabase/functions/brevo-sync/mapping.mjs against realistic
 * Database Webhook payloads for public.profiles and
 * public.job_board_waitlist, so the row -> contact contract is proven
 * before anything is deployed. Covers the cases that would silently send
 * the wrong thing: recruiter rows, missing emails, the date format Brevo
 * requires, and updateEnabled (the idempotency flag).
 *
 * Usage: node scripts/verify-brevo-mapping.mjs
 */
import {
  buildBrevoContact,
  interpretWebhook,
  isSyncableEmail,
  firstNameOf,
  toBrevoDate,
  LIST_NAMES,
  ATTRIBUTE_SCHEMA,
} from "../supabase/functions/brevo-sync/mapping.mjs";

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  | " + detail : ""}`);
};
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/* ── 1. candidate signup (public.profiles INSERT) ─────────────────── */
const signupPayload = {
  type: "INSERT",
  table: "profiles",
  schema: "public",
  record: {
    id: "8f1c2d3e-0000-4000-8000-abcdefabcdef",
    email: "Priya.Nair@Example.com",
    plan: "FREE",
    flagged: false,
    features: {},
    full_name: null, // real INSERT shape: ensureProfileRow does not set it
    user_type: null,
    created_at: "2026-07-27T09:14:22.123Z",
  },
};
const signup = interpretWebhook(signupPayload);
check("profiles INSERT is read as a signup", signup?.kind === "signup" && signup.authUserId === signupPayload.record.id,
  JSON.stringify(signup));

const signupContact = buildBrevoContact({
  kind: "signup",
  email: signup.email,
  listId: 4,
  firstName: "Priya Ramachandran Nair", // as resolved from auth metadata
  createdAt: signup.createdAt,
});
check("signup contact body matches the Brevo contract",
  eq(signupContact, {
    email: "priya.nair@example.com",
    attributes: { SOURCE: "signup", FIRSTNAME: "Priya", SIGNUP_DATE: "2026-07-27" },
    listIds: [4],
    updateEnabled: true,
  }),
  JSON.stringify(signupContact));

/* ── 2. recruiter must NOT land in Candidates ─────────────────────── */
const recruiter = interpretWebhook({
  type: "INSERT", table: "profiles", schema: "public",
  record: { id: "r1", email: "hr@acme.com", user_type: "recruiter", company_name: "Acme", created_at: "2026-07-27T09:00:00Z" },
});
check("recruiter profile is skipped (HR side stays out of Candidates)", recruiter === null, String(recruiter));

/* ── 3. waitlist row (public.job_board_waitlist INSERT) ───────────── */
const waitlistPayload = {
  type: "INSERT",
  table: "job_board_waitlist",
  schema: "public",
  record: {
    id: "w1",
    email: "seat@example.com",
    target_market: "gulf",
    source: "boarding_pass",
    user_id: null,
    created_at: "2026-07-26T18:02:00Z",
  },
};
const waitlist = interpretWebhook(waitlistPayload);
check("job_board_waitlist INSERT is read as a waitlist seat",
  waitlist?.kind === "waitlist" && waitlist.targetMarket === "gulf", JSON.stringify(waitlist));

const waitlistContact = buildBrevoContact({
  kind: "waitlist",
  email: waitlist.email,
  listId: 5,
  targetMarket: waitlist.targetMarket,
  createdAt: waitlist.createdAt,
});
check("waitlist contact carries TARGET_MARKET and SOURCE=waitlist",
  eq(waitlistContact, {
    email: "seat@example.com",
    attributes: { SOURCE: "waitlist", TARGET_MARKET: "gulf", SIGNUP_DATE: "2026-07-26" },
    listIds: [5],
    updateEnabled: true,
  }),
  JSON.stringify(waitlistContact));

/* ── 4. the two lists are distinct and correctly named ────────────── */
check('lists are exactly "Candidates" and "Job Board Waitlist"',
  LIST_NAMES.signup === "Candidates" && LIST_NAMES.waitlist === "Job Board Waitlist",
  JSON.stringify(LIST_NAMES));
check("signup and waitlist target DIFFERENT list ids",
  signupContact.listIds[0] !== waitlistContact.listIds[0],
  `${signupContact.listIds[0]} vs ${waitlistContact.listIds[0]}`);

/* ── 5. idempotency ──────────────────────────────────────────────── */
check("updateEnabled:true on every payload (re-runs never duplicate)",
  signupContact.updateEnabled === true && waitlistContact.updateEnabled === true);
check("same row maps to a byte-identical payload twice (pure mapping)",
  eq(buildBrevoContact({ kind: "waitlist", email: "seat@example.com", listId: 5, targetMarket: "gulf", createdAt: waitlist.createdAt }), waitlistContact));

/* ── 6. junk in, nothing out ─────────────────────────────────────── */
check("unknown table is ignored", interpretWebhook({ table: "applications", record: { email: "x@y.com" } }) === null);
check("empty / malformed emails are not syncable",
  !isSyncableEmail("") && !isSyncableEmail(null) && !isSyncableEmail("nope") && !isSyncableEmail("a b@c.com") && isSyncableEmail(" Ok@Example.CO "));
check("email is always lowercased and trimmed",
  buildBrevoContact({ kind: "signup", email: "  MiXeD@Case.COM ", listId: 1 }).email === "mixed@case.com");
check("no FIRSTNAME key when there is no name (never sends an empty string)",
  !("FIRSTNAME" in buildBrevoContact({ kind: "signup", email: "a@b.com", listId: 1 }).attributes));
check("no SIGNUP_DATE key when created_at is missing or unparseable",
  !("SIGNUP_DATE" in buildBrevoContact({ kind: "signup", email: "a@b.com", listId: 1, createdAt: "not-a-date" }).attributes));
check("waitlist TARGET_MARKET omitted when absent",
  !("TARGET_MARKET" in buildBrevoContact({ kind: "waitlist", email: "a@b.com", listId: 5 }).attributes));
check("signup never carries TARGET_MARKET even if one is passed",
  !("TARGET_MARKET" in buildBrevoContact({ kind: "signup", email: "a@b.com", listId: 1, targetMarket: "gulf" }).attributes));

/* ── 7. helpers ──────────────────────────────────────────────────── */
check("firstNameOf takes the first token only",
  firstNameOf("Priya Ramachandran Nair") === "Priya" && firstNameOf("  ") === null && firstNameOf(null) === null);
check("toBrevoDate yields YYYY-MM-DD",
  toBrevoDate("2026-07-27T09:14:22.123Z") === "2026-07-27" && toBrevoDate("garbage") === null && toBrevoDate(null) === null);
check("declared attributes are exactly SOURCE / TARGET_MARKET / SIGNUP_DATE",
  eq(ATTRIBUTE_SCHEMA.map((a) => a.name).sort(), ["SIGNUP_DATE", "SOURCE", "TARGET_MARKET"]),
  ATTRIBUTE_SCHEMA.map((a) => `${a.name}:${a.type}`).join(", "));

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
if (failed.length) process.exit(1);
