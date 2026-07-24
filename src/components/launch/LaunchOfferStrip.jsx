// LaunchOfferStrip — site-wide top strip, shown ONLY while the offer is
// active. Renders null otherwise (no leftovers when the switch is off).
//
// This file owns the WIRING (visibility gate, launch_offer_viewed on mount,
// launch_offer_cta_clicked + routing on CTA). The visual markup between the
// «DESIGNER SLOT» markers is a minimal on-brand default — replace it with the
// designed strip when it lands; keep the wrapper, `active` gate, and onCta.

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { trackLaunchOfferViewed, trackLaunchOfferCtaClicked } from '../../lib/analytics/launchOfferEvents';
import { launchCtaNavigate } from './launchCta';

export default function LaunchOfferStrip({ active, user, onDismiss }) {
  const navigate = useNavigate();
  const viewedRef = useRef(false);

  useEffect(() => {
    if (active && !viewedRef.current) {
      viewedRef.current = true;
      trackLaunchOfferViewed('strip');
    }
  }, [active]);

  if (!active) return null;

  const onCta = () => {
    trackLaunchOfferCtaClicked('strip');
    launchCtaNavigate(navigate, user);
  };

  return (
    /* ─────────────────────── DESIGNER SLOT ─────────────────────── */
    <div
      role="region"
      aria-label="Launch offer"
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        flexWrap: 'wrap',
        padding: '10px 44px',
        background: 'var(--color-accent-soft, rgba(217,118,6,0.12))',
        borderBottom: '1px solid var(--border, #2A2A2A)',
        color: 'var(--text-primary, #FFFFFF)',
        fontSize: 13.5,
        lineHeight: 1.4,
        textAlign: 'center',
      }}
    >
      <span>
        <strong style={{ fontWeight: 700 }}>Launch offer</strong>
        {' — '}3 CV imports, 3 downloads &amp; every template, free for 2 weeks.
      </span>
      <button
        type="button"
        onClick={onCta}
        style={{
          appearance: 'none',
          border: 'none',
          borderRadius: 8,
          padding: '6px 14px',
          background: 'var(--accent, #D97706)',
          color: 'var(--accent-contrast, #0A0A0A)',
          fontWeight: 700,
          fontSize: 13,
          cursor: 'pointer',
          transition: 'opacity 150ms cubic-bezier(0.4,0,0.2,1)',
        }}
      >
        Start free
      </button>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss launch offer"
          style={{
            position: 'absolute',
            right: 10,
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'inline-flex',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-secondary, #A0A0A0)',
            cursor: 'pointer',
            padding: 4,
          }}
        >
          <X size={16} strokeWidth={2} aria-hidden />
        </button>
      ) : null}
    </div>
    /* ───────────────────── END DESIGNER SLOT ───────────────────── */
  );
}
