// Empirical RLS probe — can an UNAUTHENTICATED client read cvs / profiles?
// Read-only diagnostic. If any row comes back, anon visitors can read real
// user data and it must be treated as a security incident.
require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const url = process.env.REACT_APP_SUPABASE_URL;
const anonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;
if (!url || !anonKey) { console.error("missing env"); process.exit(1); }

const supabase = createClient(url, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

(async () => {
  let leaks = 0;
  for (const [table, cols] of [
    ["cvs", "id, user_id, title, updated_at"],
    ["profiles", "id, plan, user_type"],
  ]) {
    const { data, error, status } = await supabase.from(table).select(cols).limit(5);
    const rows = data || [];
    console.log(`${table}: status=${status} error=${error ? error.message : "none"} rows=${rows.length}`);
    if (rows.length > 0) {
      leaks++;
      console.log(`  ✗ LEAK — anon can read ${table}. Sample keys:`, Object.keys(rows[0]).join(", "));
    } else {
      console.log(`  ✓ DENIED/empty (correct)`);
    }
  }
  process.exit(leaks ? 1 : 0);
})().catch((e) => { console.error("threw:", e.message); process.exit(1); });
