import { supabase } from "../../appSupabaseClient";

/**
 * Who the interview email signs as.
 *
 * Name and company are the only two identity fields the system actually
 * stores today: profiles.full_name (falling back to the auth metadata
 * captured at signup) and hr_profiles.company_name. Title, phone and
 * photo are deliberately absent — hr_profiles does not capture them, and
 * the email renders no empty rows for data we do not hold. When those
 * columns land, they slot in here and the template reads them.
 *
 * Cached per user id so the schedule path and the cancel path share one
 * pair of reads.
 */
const cache = new Map();

export async function fetchHrIdentity(userId) {
  const empty = { hrName: "", hrCompany: "" };
  if (!supabase || !userId) return empty;
  if (cache.has(userId)) return cache.get(userId);

  try {
    const [{ data: prof }, { data: hp }] = await Promise.all([
      supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
      supabase.from("hr_profiles").select("company_name").eq("user_id", userId).maybeSingle(),
    ]);

    let name = (prof?.full_name || "").trim();
    if (!name) {
      // Recruiters who signed up before the profiles row carried a name
      // still have it on the auth user.
      const { data: auth } = await supabase.auth.getUser();
      const meta = auth?.user?.user_metadata || {};
      name = String(meta.full_name || meta.name || "").trim();
    }

    const identity = { hrName: name, hrCompany: (hp?.company_name || "").trim() };
    cache.set(userId, identity);
    return identity;
  } catch {
    // The signature degrades to "The CVPassport HR Team"; never block a send.
    return empty;
  }
}

/** Test seam + a way to pick up a rename without a reload. */
export function clearHrIdentityCache(userId) {
  if (userId) cache.delete(userId); else cache.clear();
}
