import { useEffect } from 'react';
import { useActivationPoll } from './useActivationPoll';

// Three-state post-payment overlay shared by the Razorpay in-pricing success
// screen and the Ziina /payment-success page. Polls invoices for a row
// confirming the webhook chain completed; renders:
//
//   'activating' — neutral conic-gradient spinner + "Activating your plan…"
//                  No nav CTAs (don't dump them into a Free experience).
//   'activated'  — green pulse + plan name + Dashboard / Builder CTAs.
//                  Calls onActivated once (so callers can refreshProfile).
//   'pending'    — graceful copy + Refresh button. Receipt is en route by
//                  email; we don't push them anywhere that could read
//                  pre-webhook profile state.

const KEYFRAMES = `
@property --ats-angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
@keyframes ats-spin-border { to { --ats-angle: 360deg; } }
@keyframes cvp-success-pulse {
  0%   { transform: scale(1);   opacity: 0.55; }
  100% { transform: scale(1.6); opacity: 0; }
}
`;

const S = {
  page: {
    position: 'fixed',
    inset: 0,
    background: '#0A0A0A',
    color: '#FFFFFF',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    fontFamily: "Inter, -apple-system, system-ui, sans-serif",
    padding: '40px 24px',
  },
  brand: {
    fontSize: 22,
    fontWeight: 700,
    letterSpacing: '-0.02em',
    marginBottom: 36,
  },
  title: {
    fontSize: 26,
    fontWeight: 700,
    color: '#FFFFFF',
    margin: '0 0 10px',
    textAlign: 'center',
  },
  sub: {
    fontSize: 14,
    color: '#A0A0A0',
    margin: '0 0 36px',
    textAlign: 'center',
    maxWidth: 380,
    lineHeight: 1.55,
  },
  ctaRow: {
    display: 'flex',
    gap: 12,
  },
  ctaPrimary: {
    backgroundColor: '#FFFFFF',
    color: '#000000',
    border: 'none',
    borderRadius: 12,
    padding: '14px 28px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
  ctaGhost: {
    backgroundColor: 'transparent',
    color: '#FFFFFF',
    border: '1px solid #FFFFFF',
    borderRadius: 12,
    padding: '14px 28px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
  },
};

function RingActivating() {
  return (
    <div style={{ position: 'relative', width: 96, height: 96, marginBottom: 28 }}>
      <div aria-hidden style={{
        position: 'absolute', inset: 0, borderRadius: '50%', padding: 2,
        background: 'conic-gradient(from var(--ats-angle, 0deg), transparent 55%, #D97706 80%, transparent 100%)',
        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
        pointerEvents: 'none',
        animation: 'ats-spin-border 2.2s linear infinite',
      }} />
      <div style={{
        position: 'absolute', inset: 2, borderRadius: '50%', background: '#0A0A0A',
      }} />
    </div>
  );
}

function RingActivated() {
  return (
    <div style={{ position: 'relative', marginBottom: 28 }}>
      <div aria-hidden style={{
        position: 'absolute', inset: 0, borderRadius: '50%',
        backgroundColor: '#16A34A', opacity: 0.3,
        animation: 'cvp-success-pulse 1.5s ease-out infinite',
      }} />
      <div style={{
        width: 80, height: 80, borderRadius: '50%',
        backgroundColor: '#16A34A',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', zIndex: 1,
      }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    </div>
  );
}

function RingPending() {
  return (
    <div style={{ position: 'relative', width: 96, height: 96, marginBottom: 28, filter: 'drop-shadow(0 0 12px rgba(160,160,160,0.18))' }}>
      <div aria-hidden style={{
        position: 'absolute', inset: 0, borderRadius: '50%', padding: 2,
        background: 'conic-gradient(from var(--ats-angle, 0deg), transparent 60%, rgba(160,160,160,0.7) 80%, transparent 100%)',
        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
        pointerEvents: 'none',
        animation: 'ats-spin-border 6s linear infinite',
      }} />
      <div style={{
        position: 'absolute', inset: 2, borderRadius: '50%', background: '#0A0A0A',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#A0A0A0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <polyline points="12 7 12 12 15 14" />
        </svg>
      </div>
    </div>
  );
}

export default function PostPaymentOverlay({
  gateway,
  planLabel,
  onActivated,
  onGoToDashboard,
  onBuildCv,
  isMobile = false,
}) {
  const state = useActivationPoll(gateway);

  // Call the parent's refresh callback exactly once when activation lands.
  useEffect(() => {
    if (state === 'activated' && onActivated) onActivated();
  }, [state, onActivated]);

  const handleRefresh = () => {
    if (typeof window !== 'undefined') window.location.reload();
  };

  const planLine = planLabel ? `Welcome to ${planLabel}.` : 'Welcome to CVPassport.';
  const ctaDirection = isMobile ? 'column' : 'row';

  return (
    <>
      <style>{KEYFRAMES}</style>
      <div role="status" aria-live="polite" style={S.page}>
        <div style={S.brand}>CVPassport</div>

        {state === 'activating' && (
          <>
            <RingActivating />
            <h2 style={S.title}>Activating your plan…</h2>
            <p style={S.sub}>
              Your payment cleared. We're enabling access — this usually takes a few seconds.
            </p>
          </>
        )}

        {state === 'activated' && (
          <>
            <RingActivated />
            <h2 style={S.title}>Plan activated</h2>
            <p style={S.sub}>{planLine} Your receipt is on its way to your email.</p>
            <div style={{ ...S.ctaRow, flexDirection: ctaDirection }}>
              {onGoToDashboard ? (
                <button type="button" onClick={onGoToDashboard} style={S.ctaPrimary}>
                  Go to Dashboard
                </button>
              ) : null}
              {onBuildCv ? (
                <button type="button" onClick={onBuildCv} style={S.ctaGhost}>
                  Build My CV Now
                </button>
              ) : null}
            </div>
          </>
        )}

        {state === 'pending' && (
          <>
            <RingPending />
            <h2 style={S.title}>Your access will appear shortly</h2>
            <p style={S.sub}>
              Your payment was received and your receipt is on its way to your email. Access is
              being activated in the background — refresh in a moment to continue.
            </p>
            <div style={{ ...S.ctaRow, flexDirection: ctaDirection }}>
              <button type="button" onClick={handleRefresh} style={S.ctaPrimary}>
                Refresh now
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
