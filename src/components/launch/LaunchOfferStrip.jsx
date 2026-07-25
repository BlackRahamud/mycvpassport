// LaunchOfferStrip — the announcement strip above the nav, ported from the
// design project's `Passport Header.dc.html`.
//
// Warm amber paper with a fine hatch and a slow travelling sheen. The copy
// is SHORT on mobile and full on desktop, swapped in CSS (not by measuring
// the window) so the prerendered snapshot and the hydrated page always
// agree, and so the line can never wrap or collide with the buttons.
//
// Visibility: the parent (LaunchOfferMount) only renders this while the
// launch_offer switch is on AND the end date has not passed, so when the
// offer reverts there is nothing left behind. The prerender guard keeps it
// out of the static snapshots.

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { isPrerender } from '../../lib/prerender';
import { trackLaunchOfferViewed, trackLaunchOfferCtaClicked } from '../../lib/analytics/launchOfferEvents';
import { launchCtaNavigate } from './launchCta';
import './launchOfferStrip.css';

export default function LaunchOfferStrip({ active, user, onDismiss }) {
  const navigate = useNavigate();
  const viewedRef = useRef(false);
  const visible = active && !isPrerender();

  useEffect(() => {
    if (visible && !viewedRef.current) {
      viewedRef.current = true;
      trackLaunchOfferViewed('strip');
    }
  }, [visible]);

  if (!visible) return null;

  const onCta = () => {
    trackLaunchOfferCtaClicked('strip');
    launchCtaNavigate(navigate, user);
  };

  return (
    <div role="region" aria-label="Launch offer" className="lst-root">
      <div className="lst-hatch" aria-hidden="true" />
      <div className="lst-sheen" aria-hidden="true" />

      <div className="lst-inner">
        <span className="lst-badge" aria-hidden="true">LAUNCH OFFER</span>
        <p className="lst-copy">
          <span className="lst-copy-full">3 CV imports, 3 downloads and every template, free for 2 weeks.</span>
          <span className="lst-copy-short">Launch offer: free for 2 weeks</span>
        </p>
        <button type="button" className="lst-cta" onClick={onCta}>Start free</button>
        {onDismiss ? (
          <button
            type="button"
            className="lst-x"
            aria-label="Dismiss launch offer"
            onClick={onDismiss}
          >
            &#10005;
          </button>
        ) : null}
      </div>
    </div>
  );
}
