// Client-side entitlements resolver — THE helper the app calls to learn what
// the current account may do under the launch offer (or the original plan when
// it's off). It composes:
//   • gatekeeper.getGatekeeperData()  → isPro / isSignedIn / downloads used
//   • countAccountImports()           → imports used (from transform_sessions)
//   • isOfferActive()                 → env/flag + date window
// and funnels them through the pure computeEntitlements() so the client and
// the server share one rule set.
//
// Counts are read from the EXISTING sources of truth — the `downloads` table
// (via gatekeeper) and `transform_sessions` import rows — so there is no
// parallel counter to drift. transform_sessions RLS is owner-SELECT, so an
// account can count its own imports; the SERVER re-counts and enforces.

import { supabase } from '../appSupabaseClient';
import { getGatekeeperData } from './gatekeeper';
import { computeEntitlements, isOfferActive } from '../config/launchOffer';

/**
 * How many CV imports this signed-in account has already used.
 * An import is a transform_sessions row whose intake.import_mode === true.
 * Returns 0 for anonymous visitors or on any error (fail-open on the count —
 * the server is the real gate).
 */
export async function countAccountImports() {
  try {
    if (!supabase) return 0;
    const { data: { user } = {} } = await supabase.auth.getUser();
    if (!user) return 0;
    const { count, error } = await supabase
      .from('transform_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('intake->>import_mode', 'true');
    if (error) return 0;
    return typeof count === 'number' ? count : 0;
  } catch (e) {
    return 0;
  }
}

/**
 * Resolve the current account's entitlements.
 * @param {{ flag?: boolean }} [opts] flag = resolved PostHog "launch_offer" value.
 * @returns {Promise<ReturnType<typeof computeEntitlements>>}
 */
export async function getEntitlements(opts) {
  const flag = opts ? opts.flag : undefined;
  const offerActive = isOfferActive({ flag });

  const [gate, uploadCount] = await Promise.all([
    getGatekeeperData().catch(() => null),
    countAccountImports(),
  ]);

  const isPro = !!(gate && gate.isPaidUser);
  const isSignedIn = !!(gate && gate.isSignedIn);
  const downloadCount = gate && typeof gate.downloadsUsed === 'number' ? gate.downloadsUsed : 0;

  return computeEntitlements({
    isPro,
    offerActive,
    isSignedIn,
    uploadCount,
    downloadCount,
  });
}
