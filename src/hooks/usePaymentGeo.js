import { useState, useEffect } from 'react';
import safeFetch from '../lib/net/safeFetch';

/*
 * ONE source of truth for the pricing currency + payment processor, used by
 * BOTH the homepage pricing preview and /pricing so they can never disagree.
 *
 * Detection is by IP GEOLOCATION (actual network location) via the server geo
 * endpoint, which reads Vercel's edge x-vercel-ip-country header — NOT the
 * device locale or timezone. That distinction is the whole point: an Indian
 * expat in the Gulf carries an India-locale, IST-timezone phone, and MUST see
 * AED + Ziina (their real location), not INR + Razorpay. useGeoContent (which
 * reads the browser timezone) is deliberately not used for money.
 *
 * Currency and processor are locked together so the disclaimer can never
 * contradict the price:  AED → Ziina,  INR → Razorpay.
 *
 * Fallback (header missing / country unknown / request fails): INR + Razorpay —
 * the cheaper currency, so a misdetect under-charges rather than over-charges.
 * `resolved` is false until the fetch settles, in case a caller wants to hold.
 */
function processorFor(currency) {
  return currency === 'AED' ? 'Ziina' : 'Razorpay';
}

export function usePaymentGeo() {
  const [geo, setGeo] = useState({ currency: 'INR', processor: 'Razorpay', country: null, resolved: false });

  useEffect(() => {
    let cancelled = false;
    safeFetch('/api/razorpay?action=geo')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled) return;
        const currency = d?.currency === 'AED' ? 'AED' : 'INR';
        setGeo({ currency, processor: processorFor(currency), country: d?.country || null, resolved: true });
      })
      .catch(() => {
        if (!cancelled) setGeo({ currency: 'INR', processor: 'Razorpay', country: null, resolved: true });
      });
    return () => { cancelled = true; };
  }, []);

  return geo;
}
