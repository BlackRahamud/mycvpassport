// =============================================================
// supabase/functions/brevo-sync/mapping.mjs
//
// The ONE place a Supabase row becomes a Brevo contact payload.
// Deliberately dependency-free plain JS so BOTH runtimes import the same
// file and can never drift:
//   - supabase/functions/brevo-sync/index.ts  (Deno, real-time webhook)
//   - scripts/brevo-backfill.mjs              (Node, one-time backfill)
//
// Brevo contract: POST https://api.brevo.com/v3/contacts with
// { email, attributes, listIds, updateEnabled: true }. updateEnabled makes
// the call an UPSERT, which is what keeps the backfill and any webhook
// re-delivery idempotent — the same email is never duplicated.
// =============================================================

/* Brevo list names. The setup script resolves these to numeric ids; the
   function falls back to resolving them by name at runtime. */
export const LIST_NAMES = {
  signup: "Candidates",
  waitlist: "Job Board Waitlist",
};

/* Custom contact attributes this integration writes. Brevo REJECTS a
   contact carrying an attribute that has not been declared on the account
   ("Contact attributes not found"), so scripts/brevo-setup.mjs creates
   these before anything syncs. FIRSTNAME is a Brevo built-in and is not
   listed here. */
export const ATTRIBUTE_SCHEMA = [
  { name: "SOURCE", type: "text" },
  { name: "TARGET_MARKET", type: "text" },
  { name: "SIGNUP_DATE", type: "date" },
];

export const SOURCES = { signup: "signup", waitlist: "waitlist" };

/** Brevo date attributes take YYYY-MM-DD. Anything unparseable is dropped
 *  rather than sent as a broken string that would 400 the whole contact. */
export function toBrevoDate(value) {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/** First token of a display name. "Priya Nair" -> "Priya".
 *  Brevo FIRSTNAME is a single field; we never guess a surname split
 *  beyond the first whitespace. */
export function firstNameOf(fullName) {
  const s = String(fullName || "").trim();
  if (!s) return null;
  const first = s.split(/\s+/)[0];
  return first && first.length <= 64 ? first : null;
}

export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

/** Permissive on purpose — one @, a dot in the domain, no spaces. Mirrors
 *  src/lib/waitlist.js so the two never disagree about what is syncable. */
export function isSyncableEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

/**
 * Build the Brevo upsert body for one person.
 *
 * @param {object} p
 * @param {'signup'|'waitlist'} p.kind
 * @param {string}  p.email
 * @param {number}  p.listId          resolved Brevo list id
 * @param {string} [p.firstName]      display name (first token is used)
 * @param {string} [p.targetMarket]   waitlist only: india | gulf | both
 * @param {string} [p.createdAt]      row created_at, becomes SIGNUP_DATE
 * @returns {{email:string, attributes:object, listIds:number[], updateEnabled:true}}
 */
export function buildBrevoContact(p) {
  const email = normalizeEmail(p && p.email);
  const kind = p && p.kind === "waitlist" ? "waitlist" : "signup";

  const attributes = { SOURCE: SOURCES[kind] };

  const first = firstNameOf(p && p.firstName);
  if (first) attributes.FIRSTNAME = first;

  if (kind === "waitlist" && p && p.targetMarket) {
    attributes.TARGET_MARKET = String(p.targetMarket);
  }

  const signupDate = toBrevoDate(p && p.createdAt);
  if (signupDate) attributes.SIGNUP_DATE = signupDate;

  return {
    email,
    attributes,
    listIds: [Number(p.listId)],
    // Never duplicate: re-running the backfill, or a webhook re-delivery,
    // updates the existing contact in place.
    updateEnabled: true,
  };
}

/**
 * Which webhook payloads we act on, and how each maps onto a person.
 * Returns null for anything we deliberately ignore, so the caller can
 * answer 200 and move on.
 *
 * @param {{table?:string, record?:object}} payload
 */
export function interpretWebhook(payload) {
  const table = payload && payload.table;
  const record = (payload && payload.record) || {};

  if (table === "job_board_waitlist") {
    return {
      kind: "waitlist",
      email: record.email,
      targetMarket: record.target_market,
      createdAt: record.created_at,
      // The waitlist row has no name column; there is nothing to look up.
      authUserId: null,
    };
  }

  if (table === "profiles") {
    // Recruiters are the HR side of the product and are NOT candidates.
    // ensureProfileRow() stamps user_type='recruiter' from signup metadata
    // at INSERT time, so this is decidable here.
    if (record.user_type === "recruiter") return null;
    return {
      kind: "signup",
      email: record.email,
      // full_name is NOT populated on the INSERT (see the audit note in
      // index.ts) — the display name is resolved from auth metadata.
      firstName: record.full_name || null,
      createdAt: record.created_at,
      authUserId: record.id || null,
    };
  }

  return null;
}
