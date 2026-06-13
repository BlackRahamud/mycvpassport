// Empirical RLS probe — tests whether an UNAUTHENTICATED client (anon key,
// no session) can INSERT into public.candidate_events with candidate_id: null.
// If RLS blocks anon inserts, this is exactly what save_attempted_unauthed
// would hit in production. Read-only diagnostic — does not run in app code.

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

(async () => {
  const { data: sessionData } = await supabase.auth.getSession();
  console.log("session:", sessionData.session ? "AUTHED" : "ANON (expected)");

  const payload = {
    event_type: "_rls_probe_unauth",
    candidate_id: null,
    metadata: { source: "scripts/probe-rls-candidate-events.js", ts: new Date().toISOString() },
  };
  console.log("attempting insert:", JSON.stringify(payload));

  const { data, error, status } = await supabase
    .from("candidate_events")
    .insert(payload)
    .select();

  console.log("HTTP status:", status);
  if (error) {
    console.log("ERROR code:", error.code);
    console.log("ERROR message:", error.message);
    console.log("ERROR details:", error.details);
    console.log("ERROR hint:", error.hint);
  } else {
    console.log("SUCCESS — row inserted:", JSON.stringify(data));
    const insertedId = data?.[0]?.id;
    if (insertedId) {
      // Cleanup: try to delete what we inserted. (Anon may not be able to
      // delete it; that's expected if RLS is strict on DELETE.)
      const { error: delErr } = await supabase
        .from("candidate_events")
        .delete()
        .eq("id", insertedId);
      console.log("cleanup delete:", delErr ? `failed (${delErr.message})` : "ok");
    }
  }
})().catch((e) => {
  console.error("script threw:", e);
  process.exit(1);
});
