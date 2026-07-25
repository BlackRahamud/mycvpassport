// BoardingSoonModal — the jobs-board guard, ported from the design
// project's `Boarding Soon Modal.dc.html`.
//
// While JOBS_BOARD_LIVE is false (src/config/jobsBoard.js) every "Browse
// Jobs" entry point opens this instead of navigating, so nothing promises
// live roles we cannot show yet. It is a real capture surface, not a dead
// end: the seat is written to the SAME job_board_waitlist table the
// boarding pass writes to, with source "browse_jobs_popup".
//
// The opted-in state only appears after the row actually lands.

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { isPrerender } from '../../lib/prerender';
import { joinJobBoardWaitlist, isValidEmail } from '../../lib/waitlist';
import { trackWaitlistJoined } from '../../lib/analytics/launchOfferEvents';
import './boardingSoonModal.css';

const MARKETS = [
  { id: 'india', label: 'India' },
  { id: 'gulf', label: 'Gulf' },
  { id: 'both', label: 'Both' },
];

// Blurred behind glass — shape only, no employer is named.
const PEEK_ROWS = [
  { title: 'Operations Manager', salary: '18,000 to 22,000 AED', place: 'Gulf', logo: 'var(--text-primary)' },
  { title: 'Supply Chain Lead', salary: '₹75,000 per month', place: 'India', logo: 'var(--amber-deep)' },
];
const FLAPS = [0.9, 0.5, 0.75, 0.35, 0.65, 0.3];

function Lock({ size = 10 }) {
  return (
    <svg width={size} height={size * 1.2} viewBox="0 0 10 12" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <rect x="1" y="5" width="8" height="6.2" rx="1.6" stroke="currentColor" strokeWidth="1.2" />
      <path d="M3 5V3.4a2 2 0 0 1 4 0V5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function Tick({ size = 11 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M2.5 7.2L5.4 10L11.5 4" stroke="var(--success-text)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function BoardingSoonModal({ user, onClose }) {
  const accountEmail = (user && user.email) || '';

  const [email, setEmail] = useState(accountEmail);
  const [market, setMarket] = useState('both');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const shellRef = useRef(null);
  const ctaRef = useRef(null);
  const lastFocusedRef = useRef(null);

  // Focus in, focus back out, Esc to close, Tab trapped inside.
  useEffect(() => {
    if (isPrerender()) return undefined;
    lastFocusedRef.current = typeof document !== 'undefined' ? document.activeElement : null;
    const t = setTimeout(() => {
      try { ctaRef.current?.focus({ preventScroll: true }); } catch (e) { ctaRef.current?.focus(); }
    }, 30);

    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose?.(); return; }
      if (e.key !== 'Tab' || !shellRef.current) return;
      const f = Array.from(
        shellRef.current.querySelectorAll("button, input, [href], [tabindex]:not([tabindex='-1'])"),
      ).filter((el) => el.offsetParent !== null && !el.disabled);
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      const el = lastFocusedRef.current;
      if (el && typeof el.focus === 'function') {
        try { el.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
      }
    };
  }, [onClose]);

  const saveSeat = useCallback(async () => {
    const addr = String(email || '').trim();
    if (!isValidEmail(addr)) { setError('Enter an email we can reach you on.'); return; }
    setError('');
    setSaving(true);
    const res = await joinJobBoardWaitlist({
      email: addr,
      market,
      source: 'browse_jobs_popup',
      userId: (user && user.id) || null,
    });
    setSaving(false);
    if (res.ok) {
      trackWaitlistJoined(market, 'browse_jobs_popup');
      setSaved(true);
      return;
    }
    // The row did NOT land — never show the seat.
    setError(
      res.reason === 'invalid_email'
        ? 'Enter an email we can reach you on.'
        : 'That did not save. Check your connection and try again.',
    );
  }, [email, market, user]);

  if (typeof document === 'undefined') return null;

  const marketLabel = (MARKETS.find((m) => m.id === market) || MARKETS[2]).label;
  const seatNo = String(100 + Math.min(99, (email || 'x').length * 7)).slice(-3);

  const modal = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="The CVPassport Job Board is boarding soon"
      className="bsm-root"
      ref={shellRef}
    >
      <div className="bsm-scrim" onClick={() => onClose?.()} />

      <div className="bsm-card">
        <div className="bsm-head">
          <div className="bsm-head-hatch" aria-hidden="true" />
          <div className="bsm-head-scan" aria-hidden="true" />
          <div className="bsm-head-row">
            <p className="bsm-eyebrow">
              <span aria-hidden="true" style={{ fontSize: 12 }}>🛂</span>
              Boarding soon
            </p>
            <div className="bsm-flaps" aria-hidden="true">
              {FLAPS.map((o, i) => <i key={i} style={{ opacity: o }} />)}
              <span className="bsm-gate">GATE 01</span>
            </div>
            <button type="button" className="bsm-x" aria-label="Close" onClick={() => onClose?.()}>
              &#10005;
            </button>
          </div>
        </div>

        <div className="bsm-body">
          <div className="bsm-kicker">
            <i aria-hidden="true" />
            <span>In build</span>
          </div>
          <h2 className="bsm-title">The CVPassport Job Board</h2>
          <p className="bsm-lede">
            India &amp; Gulf roles, matched to your ATS-ready CV, all in one place.
            We’re building it now.
          </p>

          <div className="bsm-peek">
            <div className="bsm-peek-head">
              <span className="bsm-peek-tag">Sample · preview</span>
              <span className="bsm-peek-lock"><Lock size={9} />Locked until launch</span>
            </div>
            <div className="bsm-peek-rows" aria-hidden="true">
              {PEEK_ROWS.map((r) => (
                <div key={r.title} className="bsm-peek-row">
                  <div className="bsm-peek-top">
                    <span className="bsm-peek-logo" style={{ background: r.logo }} />
                    <span className="bsm-peek-bar" />
                    <span className="bsm-peek-bar bsm-peek-bar--short" />
                  </div>
                  <p className="bsm-peek-title">{r.title}</p>
                  <div className="bsm-peek-meta">
                    <span className="bsm-peek-salary">{r.salary}</span>
                    <span className="bsm-peek-place">{r.place}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="bsm-peek-fade" aria-hidden="true" />
            <span className="bsm-soon" aria-hidden="true">SOON</span>
          </div>

          {saved ? (
            <>
              <div className="bsm-saved">
                <span className="bsm-saved-icon" aria-hidden="true">✈️</span>
                <div style={{ minWidth: 0 }}>
                  <b><Tick size={13} />You’re on the list.</b>
                  <p>We’ll email you the moment it opens.</p>
                  <p className="bsm-saved-meta">{`${marketLabel} roles · ${email}`}</p>
                </div>
                <span className="bsm-seat" aria-hidden="true">
                  <i>SEAT</i>
                  <b>{seatNo}</b>
                </span>
              </div>
              <button type="button" className="bsm-back" onClick={() => onClose?.()}>
                Back to my CV
              </button>
            </>
          ) : (
            <div className="bsm-form">
              <div>
                <label className="bsm-label" htmlFor="bsm-email">Email</label>
                <div className="bsm-email-row">
                  <input
                    id="bsm-email"
                    className="bsm-email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="you@email.com"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  />
                  {accountEmail && !email ? (
                    <button
                      type="button"
                      className="bsm-prefill"
                      onClick={() => { setEmail(accountEmail); setError(''); }}
                    >
                      {`Use ${accountEmail}`}
                    </button>
                  ) : null}
                </div>
              </div>

              <div>
                <span className="bsm-label">Target market</span>
                <div className="bsm-markets" role="radiogroup" aria-label="Target market">
                  {MARKETS.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      role="radio"
                      aria-checked={market === m.id}
                      className="bsm-market"
                      onClick={() => setMarket(m.id)}
                    >
                      {market === m.id ? <Tick /> : null}
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                ref={ctaRef}
                className="bsm-cta"
                disabled={saving}
                onClick={saveSeat}
              >
                {saving ? 'Saving your seat…' : 'Save my seat'}
                {saving ? null : <span aria-hidden="true" style={{ fontWeight: 700 }}>&rarr;</span>}
              </button>

              {error ? <p className="bsm-error">{error}</p> : null}
              <p className="bsm-fineprint">
                <Lock />
                One email when the board opens. Nothing else, ever.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
