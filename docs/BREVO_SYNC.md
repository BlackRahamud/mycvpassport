# Supabase → Brevo contact sync

Real-time sync of new candidate signups and Job Board waitlist seats into
Brevo contact lists, plus a one-time idempotent backfill.

Nothing here touches pricing, the employer/HR portal, or any existing flow.
The candidate signup and "Save my seat" paths are **unmodified** — see
[Safety](#safety) for why they did not need to change.

---

## Schema audit (what is actually there)

Done against the repo, not assumed.

### Signups → `public.profiles`

There is **no trigger on `auth.users`**. The profile row is written
client-side by `ensureProfileRow()` in `src/useCvpAuth.js`:

```js
supabase.from("profiles").upsert({
  id: authUser.id,
  email: authUser.email || "",
  plan: "FREE",
  flagged: false,
  features: {},
  ...(isMetaRecruiter ? { user_type: "recruiter", company_name, work_email } : {}),
}, { onConflict: "id", ignoreDuplicates: true });
```

Consequences that shaped the design:

| Fact | Consequence |
| --- | --- |
| `email` **is** on the INSERT | the webhook payload is enough to identify the contact |
| `full_name` is **not** on the INSERT (written later by the profile editor) | `FIRSTNAME` is resolved from `auth.users.user_metadata.name`, which `signUp()` **does** set |
| `user_type='recruiter'` **is** stamped at INSERT for employer signups | recruiters are decidable at webhook time and are skipped — the HR side never enters "Candidates" |
| the row is written on first **session**, not at `signUp()` | a signup that never confirms its email never reaches Brevo |

That last row is a real behavioural detail, not a bug: with email
confirmation ON, only confirmed addresses reach the marketing list, which is
what you want for deliverability. If Supabase email confirmation is OFF, the
session exists immediately and the contact syncs at signup.

### Waitlist → `public.job_board_waitlist` (migration 052)

```
id            uuid pk
created_at    timestamptz not null default now()
email         text not null
target_market text not null check (in 'india','gulf','both')
source        text not null default 'boarding_pass'
user_id       uuid null references auth.users(id)
```

Unique on `(lower(email), target_market)` — one seat per email per market.
**No `select` policy exists by design**, so only the service role can read
the list back. That is why the backfill needs `SUPABASE_SERVICE_ROLE_KEY`.

Because the uniqueness is per *market*, one person can legitimately hold two
rows. Brevo is one contact per email, so the backfill collapses those to a
single contact with `TARGET_MARKET = both`.

---

## What was built

| File | Role |
| --- | --- |
| `supabase/functions/brevo-sync/index.ts` | the Edge Function — webhook receiver + Brevo upsert |
| `supabase/functions/brevo-sync/mapping.mjs` | the ONE row→contact mapping, imported by the function (Deno) *and* the backfill (Node) so they can never drift |
| `supabase/functions/brevo-sync/lists.json` | written by the setup script: the resolved list ids |
| `scripts/brevo-setup.mjs` | ensures the Brevo attributes + the two lists exist; prints the ids |
| `scripts/brevo-backfill.mjs` | one-time idempotent backfill of all existing rows |
| `scripts/verify-brevo-mapping.mjs` | 19 checks on the mapping, runs with no credentials |

### Contact mapping

| Field | Signup | Waitlist |
| --- | --- | --- |
| `email` | `profiles.email`, lowercased/trimmed | `job_board_waitlist.email`, lowercased/trimmed |
| `FIRSTNAME` | first token of `auth` metadata `name` (or `profiles.full_name` in the backfill) | — (no name column) |
| `SOURCE` | `signup` | `waitlist` |
| `TARGET_MARKET` | — | `india` \| `gulf` \| `both` |
| `SIGNUP_DATE` | `created_at` as `YYYY-MM-DD` | `created_at` as `YYYY-MM-DD` |
| `listIds` | `["Candidates"]` | `["Job Board Waitlist"]` |
| `updateEnabled` | `true` | `true` |

Absent values are **omitted**, never sent as empty strings — Brevo would
otherwise overwrite a good `FIRSTNAME` with `""` on a later sync.

`updateEnabled: true` is what makes every write an upsert, so re-running the
backfill, or a webhook re-delivery, can never duplicate a contact.

---

## Setup

### The one interactive step

Everything below needs an authenticated Supabase CLI, and `login` opens a
browser, so it can only be run by a human in a real terminal:

```powershell
npx supabase login
```

After that, **the Brevo key never has to leave Supabase.** The Edge Function
already holds `BREVO_API_KEY` in its own secrets, and two privileged modes
(`setup` and batch) let the operator drive it with the service-role key
instead of a Brevo key:

```powershell
# the service-role key comes from the CLI — no copy-pasting keys around
npx supabase projects api-keys --project-ref evihcqpvoorsdmzjnvjz
```

Both privileged modes are gated on the **service-role bearer token**, not
the anon key — otherwise the public anon key would be enough to trigger a
full re-push or inject arbitrary contacts into the marketing lists.

### 0. Prerequisites

`BREVO_API_KEY` must be a **v3 API key** (Brevo → SMTP & API → API keys),
not an SMTP password. Confirm it is set as a Supabase Function secret:

```powershell
npx supabase login          # one-time, opens the browser
npx supabase secrets list --project-ref evihcqpvoorsdmzjnvjz
```

If `BREVO_API_KEY` is not in that list:

```powershell
npx supabase secrets set BREVO_API_KEY="<v3 key>" --project-ref evihcqpvoorsdmzjnvjz
```

The key is read at runtime with `Deno.env.get("BREVO_API_KEY")`. It is never
hardcoded, never committed, and never reaches the browser — the Edge Function
is the only thing that holds it.

### 1. Create the Brevo lists + attributes

**Preferred — no Brevo key locally.** Deploy first (step 2), then ask the
function to bootstrap itself using the key it already holds:

```powershell
$SR = "<service_role key from projects api-keys>"
curl.exe -s -X POST "https://evihcqpvoorsdmzjnvjz.functions.supabase.co/brevo-sync" `
  -H "Authorization: Bearer $SR" -H "Content-Type: application/json" `
  -d '{\"mode\":\"setup\"}'
```

It returns the two list ids and what it created:

```json
{ "mode": "setup",
  "attributes": { "SOURCE": "created", "TARGET_MARKET": "created", "SIGNUP_DATE": "created" },
  "lists": { "Candidates": "created", "Job Board Waitlist": "created" },
  "listIds": { "candidates": 0, "waitlist": 0 } }
```

**Alternative — local script**, if you would rather hold the key yourself:

```powershell
$env:BREVO_API_KEY = "<v3 key>"
node scripts/brevo-setup.mjs --dry-run   # report only
node scripts/brevo-setup.mjs             # create what is missing
```

Either path creates the `SOURCE`, `TARGET_MARKET` and `SIGNUP_DATE` contact
attributes **first**. Brevo rejects a contact carrying an undeclared
attribute (`Contact attributes not found`) — skipping this step is the most
common cause of a silent 400 in a Brevo integration.

It prints the two list ids and writes them to
`supabase/functions/brevo-sync/lists.json`. Pin them on the function so it
skips the name lookup:

```powershell
npx supabase secrets set BREVO_LIST_ID_CANDIDATES=<id> BREVO_LIST_ID_WAITLIST=<id> --project-ref evihcqpvoorsdmzjnvjz
```

This is optional — with no ids set, the function resolves the lists by name
on first call and caches the result.

### 2. Deploy the Edge Function

```powershell
npx supabase functions deploy brevo-sync --project-ref evihcqpvoorsdmzjnvjz
```

### 3. Wire the two Database Webhooks

Dashboard → **Database → Webhooks → Create a new hook**. Two hooks, same
pattern as the existing `ats-lead-welcome` hook.

**Hook 1 — signups**

| Field | Value |
| --- | --- |
| Name | `brevo_sync_signups` |
| Table | `public.profiles` |
| Events | **Insert** only |
| Type | Supabase Edge Functions |
| Edge Function | `brevo-sync` |
| Method | `POST` |
| Timeout | `5000` ms |

**Hook 2 — waitlist**

| Field | Value |
| --- | --- |
| Name | `brevo_sync_waitlist` |
| Table | `public.job_board_waitlist` |
| Events | **Insert** only |
| Type | Supabase Edge Functions |
| Edge Function | `brevo-sync` |
| Method | `POST` |
| Timeout | `5000` ms |

Do **not** add Update or Delete events. The function ignores anything that
is not an INSERT, but sending them is wasted invocations.

Optional hardening — set a shared secret so only these hooks can drive the
function:

```powershell
npx supabase secrets set BREVO_SYNC_WEBHOOK_SECRET="<random string>" --project-ref evihcqpvoorsdmzjnvjz
```

Then add HTTP header `x-webhook-secret: <same value>` to both hooks. While
the secret is unset the check is skipped (same behaviour as
`ats-lead-welcome`).

### 4. Backfill

**Preferred — no Brevo key locally.** `--via-function` posts batches of 50
through the deployed function, which holds the Brevo key:

```powershell
$env:SUPABASE_URL = "https://evihcqpvoorsdmzjnvjz.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY = "<service_role key>"

node scripts/brevo-backfill.mjs --dry-run                    # read + map, send nothing
node scripts/brevo-backfill.mjs --via-function --limit=5     # smoke test
node scripts/brevo-backfill.mjs --via-function               # the real run
```

The service-role key is still required here — not for Brevo, but because
`job_board_waitlist` has no select policy, so nothing else can read the list.

**Alternative — direct to Brevo**, add `$env:BREVO_API_KEY` and drop
`--via-function`.

Prints `read / upserted / skipped / failed` per list. Safe to re-run at any
time, including after the webhooks are live — every write is the same
`updateEnabled` upsert.

`--only=signups` / `--only=waitlist` limit it to one source.

---

## Verify

```powershell
node scripts/verify-brevo-mapping.mjs
```

19 checks on the row→contact contract with no credentials needed: recruiter
rows are skipped, the two lists are distinct, emails are normalised, absent
attributes are omitted, `updateEnabled` is always true, dates come out as
`YYYY-MM-DD`.

End-to-end, once deployed:

1. Sign up a throwaway candidate address → Brevo → Contacts → **Candidates**.
   Expect `SOURCE=signup`, `SIGNUP_DATE=today`, `FIRSTNAME` set.
2. Build and download a CV, then "Save my seat" on the boarding pass with a
   second throwaway address and a known market → Brevo → **Job Board
   Waitlist**. Expect `SOURCE=waitlist`, `TARGET_MARKET=<market>`.
3. Re-run the backfill and confirm the contact count does not change — that
   is the idempotency proof.

Function logs: Dashboard → Edge Functions → `brevo-sync` → Logs. Every line
is prefixed `brevo-sync:`. Success logs `{ email, list, listId, source }`;
failures log the email, the HTTP status and Brevo's message. **Email is the
only PII in any log line.**

---

## Safety

- **The sync is not in the user's critical path, by architecture.** A
  Database Webhook fires from Postgres *after* the row commits, out of band
  from the browser request. The client never awaits Brevo, so no change to
  `useCvpAuth.js` or `src/lib/waitlist.js` was needed or made.
- **The function always answers HTTP 200** (`ok()`), even on failure. A
  non-2xx would make the webhook worker retry a call that is not going to
  succeed and would tie Brevo's health to a database insert.
- **Failures are logged, not raised.** Missing key, missing list, Brevo 4xx,
  network error — each logs one line and returns a `skipped` reason.
- **No PII beyond email** in any log line.
- **The API key is server-side only.** It lives in Supabase Function
  secrets, is read via `Deno.env.get`, and appears in no client bundle.

### Known gaps

- A signup that never confirms its email never reaches Brevo (see the audit
  above). Deliberate.
- Brevo rate limits are handled with backoff in the backfill (429 → retry
  up to 4×). The real-time path does not retry: one webhook, one attempt,
  and the backfill is the repair tool.
- Unsubscribes and deletions are **not** synced back to Supabase. Brevo is
  the source of truth for consent; this is a one-way feed.
