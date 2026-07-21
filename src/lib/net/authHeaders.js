import { supabase } from '../../supabaseClient';

/**
 * Bearer header for authenticated /api calls.
 *
 * Returns an empty object when there is no session, so a caller can
 * always spread it. The server decides what an unauthenticated call
 * gets; this helper never pretends to be a gate.
 */
export async function authHeaders() {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}
