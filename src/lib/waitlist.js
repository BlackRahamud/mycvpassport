// Job Board waitlist writer — "Save my seat" on the boarding pass.
//
// This list is the demand evidence behind the employer pitch, so the row
// is the deliverable: the caller must only show the "you're on the list"
// state when this resolves ok:true. A failed write shows an honest retry,
// never a silent success (see the no-mystery-states rule).
//
// Table: public.job_board_waitlist (migration 052) — insert-only for
// clients, unique on (lower(email), target_market). A duplicate seat is a
// SUCCESS, not an error: the person is already on the list.

import { supabase } from '../appSupabaseClient';

export const MARKETS = ['india', 'gulf', 'both'];

const DUPLICATE = '23505'; // unique_violation — already seated

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function isValidEmail(email) {
  const e = normalizeEmail(email);
  // Deliberately permissive: one @, a dot in the domain, no spaces.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

/**
 * Add one seat to the job board waitlist.
 *
 * @param {object} p
 * @param {string} p.email          the address to notify (required)
 * @param {string} p.market         'india' | 'gulf' | 'both'
 * @param {string} [p.source]       entry point, defaults to 'boarding_pass'
 * @param {string|null} [p.userId]  auth user id when signed in
 * @returns {Promise<{ok: boolean, duplicate?: boolean, reason?: string}>}
 */
export async function joinJobBoardWaitlist(p) {
  const email = normalizeEmail(p && p.email);
  const market = MARKETS.includes(p && p.market) ? p.market : null;

  if (!isValidEmail(email)) return { ok: false, reason: 'invalid_email' };
  if (!market) return { ok: false, reason: 'invalid_market' };

  const row = {
    email,
    target_market: market,
    source: (p && p.source) || 'boarding_pass',
    user_id: (p && p.userId) || null,
  };

  try {
    const { error } = await supabase.from('job_board_waitlist').insert(row);
    if (!error) return { ok: true };
    if (error.code === DUPLICATE) return { ok: true, duplicate: true };
    return { ok: false, reason: error.message || 'write_failed' };
  } catch (e) {
    // Network / client error — the seat was NOT saved, say so.
    return { ok: false, reason: (e && e.message) || 'network' };
  }
}

export default joinJobBoardWaitlist;
