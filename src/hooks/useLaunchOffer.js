// useLaunchOffer — React binding for the launch-offer switch + entitlements.
//
// Resolves the PostHog "launch_offer" flag (falling back to the REACT_APP_
// env var), computes offer state, and loads the current account's
// entitlements via getEntitlements(). Returns everything the launch UI and
// the builder gates need, plus a refresh() to re-pull counts after an
// upload/download.
//
// SSR/prerender safe: no window access at module scope; the flag read is
// best-effort and undefined until PostHog loads.

import { useCallback, useEffect, useRef, useState } from 'react';
import { getFeatureFlag, onFeatureFlags } from '../lib/analytics/posthog';
import { isOfferActive } from '../config/launchOffer';
import { getEntitlements } from '../services/entitlements';

export function useLaunchOffer() {
  // Resolved PostHog flag: undefined until flags load (→ env fallback).
  const [flag, setFlag] = useState(() => getFeatureFlag('launch_offer'));
  const [entitlements, setEntitlements] = useState(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // React to PostHog flags becoming available / changing.
  useEffect(() => {
    const off = onFeatureFlags(() => {
      const next = getFeatureFlag('launch_offer');
      if (mountedRef.current) setFlag(next);
    });
    return off;
  }, []);

  const refresh = useCallback(async () => {
    // Steady state after the offer ends: skip the entitlement DB round-trips
    // entirely when the offer isn't even active. The only consumer of these
    // entitlements is the launch UI, which renders nothing when inactive —
    // so "off" costs zero queries. (Builder gates read gatekeeper directly.)
    if (!isOfferActive({ flag })) {
      if (mountedRef.current) {
        setEntitlements(null);
        setLoading(false);
      }
      return;
    }
    try {
      const ent = await getEntitlements({ flag });
      if (mountedRef.current) {
        setEntitlements(ent);
        setLoading(false);
      }
    } catch (e) {
      if (mountedRef.current) setLoading(false);
    }
  }, [flag]);

  useEffect(() => { refresh(); }, [refresh]);

  // Synchronous best-effort read for gating the UI before entitlements load —
  // avoids a flash of the offer strip when the flag/env already says "off".
  const offerActive = entitlements ? entitlements.offerActive : isOfferActive({ flag });

  return { offerActive, entitlements, loading, refresh };
}
