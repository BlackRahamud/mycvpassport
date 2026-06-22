import { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';

// Polls the invoices table for a row issued via this gateway within the
// recent lookback window. The invoice row is the LAST thing the webhook
// writes (after applyPaidTier + recordPayment + issueDocument), so its
// presence is the canonical "post-payment chain fully completed" signal.
// RLS scopes the select to the current authenticated user automatically.
//
// We poll the invoices table rather than checking hasProAccess(profile)
// because Express Pass purchases never set pro_access_expires_at (they
// bump download_credits via grant_download_credits). The invoice row is
// the only reliable cross-tier confirmation that the webhook ran end-to-
// end for all three paid tiers.
//
// States:
//   'activating' — initial, polling in flight
//   'activated'  — invoice row found
//   'pending'    — POLL_TIMEOUT_MS elapsed without a row

const POLL_INTERVAL_MS = 1500;
const POLL_TIMEOUT_MS = 15000;
// 30-minute lookback so a buyer reloading the success page minutes later
// (or with a slow webhook on the gateway side) still resolves correctly.
const LOOKBACK_MS = 30 * 60 * 1000;

export function useActivationPoll(gateway, { enabled = true } = {}) {
  const [state, setState] = useState('activating');
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!enabled) return undefined;
    cancelledRef.current = false;
    let elapsed = 0;
    let timer = null;
    const lookbackTime = new Date(Date.now() - LOOKBACK_MS).toISOString();

    async function tick() {
      if (cancelledRef.current) return;
      try {
        const { data: row } = await supabase
          .from('invoices')
          .select('id')
          .eq('gateway', gateway)
          .gte('issued_at', lookbackTime)
          .order('issued_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (cancelledRef.current) return;
        if (row) {
          setState('activated');
          return;
        }
      } catch {
        // Transient RLS / network blips don't stop the loop.
      }
      elapsed += POLL_INTERVAL_MS;
      if (elapsed >= POLL_TIMEOUT_MS) {
        if (!cancelledRef.current) setState('pending');
        return;
      }
      timer = setTimeout(tick, POLL_INTERVAL_MS);
    }

    timer = setTimeout(tick, POLL_INTERVAL_MS);

    return () => {
      cancelledRef.current = true;
      if (timer) clearTimeout(timer);
    };
  }, [gateway, enabled]);

  return state;
}
