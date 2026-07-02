// Empirical RLS probe — verifies the applicant-cvs bucket DENIES reads
// outside the policy chain. Read-only diagnostic, no writes.
//
// What it checks (as an UNAUTHENTICATED anon client):
//  1. list() on the bucket root returns nothing (no enumeration).
//  2. download() of a plausible path is denied.
//  3. createSignedUrl() of a plausible path is denied.
//
// The ALLOW side (recruiter reads CVs for own applications) is enforced by
// migration 021's policy: EXISTS(applications WHERE cv_file_path = name AND
// hr_id = auth.uid()) — it depends only on the application row, never on
// hr_profiles / companies, so fresh recruiters from the new onboarding pass
// the same chain as legacy accounts. See docs in migration 021.

require("dotenv").config({ path: ".env.local" });

const { createClient } = require("@supabase/supabase-js");

const url = process.env.REACT_APP_SUPABASE_URL;
const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
if (!url || !anonKey) {
  console.error("Missing REACT_APP_SUPABASE_URL or REACT_APP_SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const FAKE_PATH = "00000000-0000-0000-0000-000000000000/probe.pdf";
let failures = 0;

function report(name, denied, detail) {
  console.log(`${denied ? "✓ DENIED (correct)" : "✗ ALLOWED (LEAK!)"} — ${name}${detail ? ` — ${detail}` : ""}`);
  if (!denied) failures++;
}

(async () => {
  const store = supabase.storage.from("applicant-cvs");

  const list = await store.list("", { limit: 10 });
  report("anon list bucket root", !!list.error || (list.data || []).length === 0,
    list.error ? list.error.message : `${(list.data || []).length} entries`);

  const dl = await store.download(FAKE_PATH);
  report("anon download", !!dl.error, dl.error?.message);

  const signed = await store.createSignedUrl(FAKE_PATH, 60);
  report("anon createSignedUrl", !!signed.error || !signed.data?.signedUrl, signed.error?.message);

  if (failures > 0) {
    console.error(`\n${failures} probe(s) show the bucket is readable outside the policy chain.`);
    process.exit(1);
  }
  console.log("\nAll deny-side probes correct: applicant-cvs is closed to anon access.");
})().catch((e) => {
  console.error("script threw:", e);
  process.exit(1);
});
