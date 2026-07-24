// LaunchOfferModal — the designed launch-offer modal (exported from Claude
// Design as "Launch Offer Modal.dc.html"), converted to a React component.
//
// The VISUALS are ported pixel-for-pixel: every inline style, the mascot, the
// glass card, the aurora glow, the speech bubble, the stat row, the shimmer
// CTA, and all six keyframe animations are preserved exactly (keyframes +
// hover/active + reduced-motion live in LaunchOfferModal.css). This file only
// ADDS behaviour: gating, show-once, a real countdown, routing, a11y
// (focus trap + Esc + return focus), and analytics.
//
// The demo landing-page chrome from the export (nav bar, hero) is intentionally
// NOT ported — only the modal itself is wired into the real site.

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Helmet } from 'react-helmet-async';
import { useLocation, useNavigate } from 'react-router-dom';
import { isOfferActive, OFFER_END_ISO } from '../config/launchOffer';
import { launchCtaNavigate } from './launch/launchCta';
import {
  trackLaunchOfferViewed,
  trackLaunchOfferCtaClicked,
  trackLaunchOfferDismissed,
} from '../lib/analytics/launchOfferEvents';
import './LaunchOfferModal.css';

const SEEN_KEY = 'cvpassport_launch_modal_seen';
const OPEN_DELAY_MS = 1000;

// Landing / public marketing surfaces get the modal; functional flows (auth,
// checkout, builder, dashboard, employer, …) never do — per spec.
const EXCLUDED_PREFIXES = [
  '/auth', '/register', '/login', '/signin', '/reset-password', '/auth/callback',
  '/builder', '/walk-in', '/cover-letter',
  '/payment', '/payment-success', '/checkout', '/transform',
  '/dashboard', '/account', '/scout', '/admin',
  '/employer', '/hr',
];

function isPrerender() {
  // Primary, reliable signal: the build-time prerenderer sets this flag on the
  // window before loading each route (see scripts/prerender.mjs). Without this,
  // the modal auto-opens during the prerender pass and freezes a dead copy into
  // the static HTML. The ReactSnap UA check is a legacy fallback.
  if (typeof window !== 'undefined' && window.__CVP_PRERENDER__ === true) return true;
  return typeof navigator !== 'undefined' && navigator.userAgent.includes('ReactSnap');
}

function isEligibleRoute(pathname) {
  if (!pathname) return false;
  return !EXCLUDED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

function hasSeen() {
  try { return localStorage.getItem(SEEN_KEY) === '1'; } catch (e) { return false; }
}
function markSeen() {
  try { localStorage.setItem(SEEN_KEY, '1'); } catch (e) { /* private mode */ }
}

function prefersReducedMotion() {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// Countdown parts to the real offer end.
function computeParts(nowMs) {
  const end = new Date(OFFER_END_ISO).getTime();
  const s = Math.max(0, Math.floor((end - nowMs) / 1000));
  return {
    days: String(Math.floor(s / 86400)).padStart(2, '0'),
    hours: String(Math.floor((s % 86400) / 3600)).padStart(2, '0'),
    mins: String(Math.floor((s % 3600) / 60)).padStart(2, '0'),
    secs: s % 60,
  };
}

// "Ends 07 Aug" — derived from the real end date so it stays truthful if
// OFFER_END_ISO ever changes (produces the identical label for 2026-08-07).
function endLabel() {
  try {
    const d = new Date(OFFER_END_ISO);
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('en-US', { month: 'short' });
    return `Ends ${day} ${month}`;
  } catch (e) {
    return 'Ends 07 Aug';
  }
}

export default function LaunchOfferModal({ user }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);
  const [closing, setClosing] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const shellRef = useRef(null);
  const ctaRef = useRef(null);
  const daysRef = useRef(null);
  const hoursRef = useRef(null);
  const minsRef = useRef(null);
  const prevPartsRef = useRef({});
  const lastFocusedRef = useRef(null);
  const viewedFiredRef = useRef(false);

  const enterTimerRef = useRef(0);
  const closeTimerRef = useRef(0);
  const openTimerRef = useRef(0);

  const doOpen = useCallback(() => {
    lastFocusedRef.current = typeof document !== 'undefined' ? document.activeElement : null;
    setMounted(true);
    setClosing(false);
    setEntered(false);
    clearTimeout(enterTimerRef.current);
    enterTimerRef.current = setTimeout(() => {
      setEntered(true);
      if (ctaRef.current) {
        try { ctaRef.current.focus({ preventScroll: true }); } catch (e) { ctaRef.current.focus(); }
      }
    }, 30);
  }, []);

  const finishClose = useCallback(() => {
    setMounted(false);
    setEntered(false);
    setClosing(false);
    // Return focus to wherever it was before the modal opened.
    const el = lastFocusedRef.current;
    if (el && typeof el.focus === 'function') {
      try { el.focus({ preventScroll: true }); } catch (e) { /* ignore */ }
    }
  }, []);

  // method: "x" | "maybe_later" | "backdrop" | "esc" | null (CTA handles its own)
  const close = useCallback((method) => {
    // Guard against double-close.
    if (closing || !mounted) return;
    markSeen();
    if (method) trackLaunchOfferDismissed(method);
    setClosing(true);
    clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(finishClose, 260);
  }, [closing, mounted, finishClose]);

  const handleCta = useCallback(() => {
    trackLaunchOfferCtaClicked('modal');
    markSeen();
    // Hide immediately, then route (signed-out → sign up → builder; signed-in
    // → straight to the builder with upload enabled).
    setMounted(false);
    setEntered(false);
    setClosing(false);
    launchCtaNavigate(navigate, user);
  }, [navigate, user]);

  // Auto-open once, ~1s after load, on eligible public routes only.
  useEffect(() => {
    if (isPrerender()) return undefined;
    if (!isOfferActive()) return undefined;
    if (!isEligibleRoute(location.pathname)) return undefined;
    if (hasSeen()) return undefined;
    clearTimeout(openTimerRef.current);
    openTimerRef.current = setTimeout(doOpen, OPEN_DELAY_MS);
    return () => clearTimeout(openTimerRef.current);
    // location.pathname intentionally in deps: if the visitor lands on an
    // excluded route first and navigates to an eligible one, the timer arms.
  }, [location.pathname, doOpen]);

  // Countdown ticker + key handling — only while mounted.
  useEffect(() => {
    if (!mounted) return undefined;

    const ticker = setInterval(() => setNow(Date.now()), 1000);

    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close('esc'); return; }
      if (e.key !== 'Tab' || !shellRef.current) return;
      const focusables = Array.from(
        shellRef.current.querySelectorAll(
          "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
        ),
      ).filter((el) => el.offsetParent !== null);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);

    return () => {
      clearInterval(ticker);
      document.removeEventListener('keydown', onKey);
    };
  }, [mounted, close]);

  // Fire launch_offer_viewed once, when the modal is actually visible.
  useEffect(() => {
    if (mounted && entered && !closing && !viewedFiredRef.current) {
      viewedFiredRef.current = true;
      trackLaunchOfferViewed('modal');
    }
  }, [mounted, entered, closing]);

  // Rolling-digit animation on each countdown change (WAAPI; skipped when the
  // visitor prefers reduced motion). Ported from the design's componentDidUpdate.
  useEffect(() => {
    if (!mounted) return;
    const p = computeParts(now);
    const refs = { days: daysRef.current, hours: hoursRef.current, mins: minsRef.current };
    ['days', 'hours', 'mins'].forEach((k) => {
      const el = refs[k];
      const prev = prevPartsRef.current[k];
      if (!el || prev === undefined || prev === p[k] || prefersReducedMotion()) return;
      if (typeof el.animate !== 'function') return;
      el.animate(
        [
          { opacity: 1, transform: 'translateY(0)' },
          { opacity: 0, transform: 'translateY(-55%)' },
          { opacity: 0, transform: 'translateY(55%)', offset: 0.5001 },
          { opacity: 1, transform: 'translateY(0)' },
        ],
        { duration: 520, easing: 'cubic-bezier(.16,1,.3,1)' },
      );
    });
    prevPartsRef.current = p;
  }, [now, mounted]);

  // Cleanup all timers on unmount.
  useEffect(() => () => {
    clearTimeout(enterTimerRef.current);
    clearTimeout(closeTimerRef.current);
    clearTimeout(openTimerRef.current);
  }, []);

  // Secondary gate: never render when the offer isn't active (the mount also
  // gates on the flag-aware offerActive, so a killed flag never reaches here).
  if (!isOfferActive()) return null;
  if (!mounted || typeof document === 'undefined') return null;

  const parts = computeParts(now);
  const shown = entered && !closing;
  const shellOpacity = shown ? 1 : 0;
  const cardOpacity = shown ? 1 : 0;
  const cardTransform = shown
    ? 'scale(1) translateY(0)'
    : closing
      ? 'scale(.97) translateY(8px)'
      : 'scale(.93) translateY(20px)';

  const modal = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="14 days free offer"
      ref={shellRef}
      className="lom-root"
      style={{
        position: 'fixed', inset: 0, zIndex: 999, display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: 16, opacity: shellOpacity,
        transition: 'opacity 300ms cubic-bezier(.16,1,.3,1)',
        fontFamily: "'Lato', 'Gill Sans', sans-serif", WebkitFontSmoothing: 'antialiased',
      }}
    >
      {/* Backdrop */}
      <div
        onClick={() => close('backdrop')}
        style={{
          position: 'absolute', inset: 0, background: 'rgba(13,16,17,.64)',
          backdropFilter: 'blur(20px) saturate(120%)', WebkitBackdropFilter: 'blur(20px) saturate(120%)',
        }}
      />

      {/* Card wrapper (entrance transform/opacity) */}
      <div
        style={{
          position: 'relative', width: '100%', maxWidth: 452, maxHeight: 'calc(100vh - 32px)',
          display: 'block', opacity: cardOpacity, transform: cardTransform,
          transition: 'transform 480ms cubic-bezier(.17,.89,.24,1.03), opacity 280ms ease-out',
        }}
      >
        {/* Outer glow */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', inset: '-46px -28px -22px', borderRadius: 70, filter: 'blur(34px)',
            pointerEvents: 'none', background: 'radial-gradient(closest-side, rgba(15,118,110,.42), transparent 70%)',
          }}
        />

        {/* Glass card */}
        <div
          style={{
            position: 'relative', display: 'flex', flexDirection: 'column', minHeight: 0, width: '100%',
            borderRadius: 28, overflow: 'hidden',
            background: 'linear-gradient(168deg, rgba(23,27,28,.94), rgba(11,14,15,.93))',
            backdropFilter: 'blur(32px) saturate(170%)', WebkitBackdropFilter: 'blur(32px) saturate(170%)',
            border: '1px solid rgba(255,255,255,.11)',
            boxShadow: '0 46px 104px -34px rgba(4,26,25,.82), inset 0 1px 0 rgba(255,255,255,.13)',
            color: '#F6F7F5',
          }}
        >
          {/* Close */}
          <button
            type="button"
            aria-label="Close offer"
            className="lom-close"
            onClick={() => close('x')}
            style={{
              position: 'absolute', top: 13, right: 13, zIndex: 6, width: 32, height: 32, borderRadius: '50%',
              border: '1px solid rgba(255,255,255,.18)', background: 'rgba(16,20,21,.55)', backdropFilter: 'blur(8px)',
              color: 'rgba(246,247,245,.78)', fontSize: 12.5, lineHeight: 1, display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer',
            }}
          >
            &#10005;
          </button>

          {/* Mascot band */}
          <div style={{ position: 'relative', flexShrink: 1, height: 'clamp(80px, 20vw, 140px)', minHeight: 0, overflow: 'hidden' }}>
            <div
              aria-hidden="true"
              style={{
                position: 'absolute', inset: '-26% -14% auto -14%', height: '96%', pointerEvents: 'none',
                background: 'radial-gradient(closest-side, rgba(15,118,110,.5), transparent 72%)', filter: 'blur(36px)',
                animation: 'cvpAurora 18s ease-in-out infinite',
              }}
            />
            <img
              src="/launch/mascot.png"
              alt=""
              aria-hidden="true"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
              style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain',
                objectPosition: '64% 100%', display: 'block', animation: 'cvpZoom 900ms cubic-bezier(.16,1,.3,1) both',
              }}
            />
            <div
              aria-hidden="true"
              style={{
                position: 'absolute', inset: 0, pointerEvents: 'none',
                background: 'linear-gradient(180deg, rgba(11,14,15,.28) 0%, rgba(11,14,15,0) 32%, rgba(11,14,15,.5) 84%, #0F1213 100%)',
              }}
            />
            <div
              style={{
                position: 'absolute', left: 14, top: 16, width: 'min(46%, 172px)', boxSizing: 'border-box',
                padding: '9px 12px', borderRadius: '14px 14px 14px 5px', background: 'rgba(18,22,23,.7)',
                backdropFilter: 'blur(14px) saturate(160%)', WebkitBackdropFilter: 'blur(14px) saturate(160%)',
                border: '1px solid rgba(255,255,255,.16)', boxShadow: '0 16px 30px -16px rgba(0,0,0,.85)',
                fontFamily: "'Lora', Georgia, serif", fontSize: 12.5, lineHeight: 1.42, color: 'rgba(246,247,245,.92)',
                animation: 'cvpPop 620ms cubic-bezier(.2,.85,.3,1.08) 380ms both',
              }}
            >
              Hey, you are early. Let me open everything for you.
            </div>
          </div>

          {/* Content */}
          <div style={{ position: 'relative', flexShrink: 0, minHeight: 184, overflowY: 'visible', overflowX: 'hidden', padding: '0px clamp(16px, 5vw, 24px) 0' }}>
            <div
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 5, padding: '3px 10px 3px 7px',
                borderRadius: 999, background: 'rgba(217,119,6,.18)', border: '1px solid rgba(217,119,6,.38)',
                fontSize: 9.5, fontWeight: 700, letterSpacing: '.2em', textTransform: 'uppercase', color: '#F5B461',
                animation: 'cvpRise 520ms cubic-bezier(.16,1,.3,1) 40ms both',
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#E8871E', animation: 'cvpBreathe 2.4s ease-in-out infinite' }} />
              Launch offer
            </div>
            <h2 style={{ margin: 0, fontFamily: "'Optima', 'Gill Sans', 'Lato', sans-serif", fontWeight: 600, fontSize: 'clamp(26px, 7.4vw, 32px)', lineHeight: '.98', letterSpacing: '-.4px', animation: 'cvpRise 540ms cubic-bezier(.16,1,.3,1) 60ms both' }}>
              14 days, <em style={{ fontFamily: "'Lora', Georgia, serif", fontStyle: 'italic', fontWeight: 500, color: '#6EE7DA' }}>free</em>.
            </h2>
            <p style={{ margin: '5px 0 0', fontFamily: "'Lora', Georgia, serif", fontSize: 12, lineHeight: 1.35, color: 'rgba(246,247,245,.66)', textWrap: 'pretty', animation: 'cvpRise 540ms cubic-bezier(.16,1,.3,1) 110ms both' }}>
              Everything unlocked for two weeks. Upload your CV, score it, download it. No card, nothing to cancel.
            </p>

            <div style={{ marginTop: 7, display: 'flex', alignItems: 'stretch', gap: 1, background: 'rgba(255,255,255,.1)', borderRadius: 13, overflow: 'hidden', animation: 'cvpRise 520ms cubic-bezier(.16,1,.3,1) 170ms both' }}>
              <div style={{ flex: '1 1 0', minWidth: 0, padding: '6px clamp(6px, 2vw, 10px)', background: 'rgba(255,255,255,.05)' }}>
                <div style={{ fontSize: 17, fontWeight: 900, letterSpacing: '-.5px', color: '#6EE7DA' }}>3</div>
                <div style={{ marginTop: 0, fontSize: 11, fontWeight: 700 }}>Uploads</div>
                <div style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 10, lineHeight: 1.25, color: 'rgba(246,247,245,.5)' }}>import &amp; auto-fill</div>
              </div>
              <div style={{ flex: '1 1 0', minWidth: 0, padding: '6px clamp(6px, 2vw, 10px)', background: 'rgba(255,255,255,.05)' }}>
                <div style={{ fontSize: 17, fontWeight: 900, letterSpacing: '-.5px', color: '#6EE7DA' }}>3</div>
                <div style={{ marginTop: 0, fontSize: 11, fontWeight: 700 }}>Downloads</div>
                <div style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 10, lineHeight: 1.25, color: 'rgba(246,247,245,.5)' }}>yours to keep</div>
              </div>
              <div style={{ flex: '1 1 0', minWidth: 0, padding: '6px clamp(6px, 2vw, 10px)', background: 'rgba(255,255,255,.05)' }}>
                <div style={{ fontSize: 17, fontWeight: 900, letterSpacing: '-.5px', color: '#6EE7DA' }}>All</div>
                <div style={{ marginTop: 0, fontSize: 11, fontWeight: 700 }}>Templates</div>
                <div style={{ fontFamily: "'Lora', Georgia, serif", fontSize: 10, lineHeight: 1.25, color: 'rgba(246,247,245,.5)' }}>Gulf ready</div>
              </div>
            </div>
          </div>

          {/* Footer: countdown + CTA + reassurance */}
          <div style={{ position: 'relative', flexShrink: 0, padding: '4px clamp(16px, 5vw, 24px) 7px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '3px 12px', marginBottom: 4, borderRadius: 10, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.11)', fontSize: 11.5, color: 'rgba(246,247,245,.6)', whiteSpace: 'nowrap', overflow: 'hidden' }}>
              <span style={{ fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', fontSize: 9, color: 'rgba(246,247,245,.45)' }}>{endLabel()}</span>
              <span style={{ color: 'rgba(246,247,245,.28)' }}>&middot;</span>
              <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 1, fontWeight: 900, letterSpacing: '-.3px', fontVariantNumeric: 'tabular-nums', color: '#F6F7F5' }}>
                <span ref={daysRef} style={{ fontSize: 13.5 }}>{parts.days}</span><span style={{ fontSize: 9, marginRight: 3 }}>d</span>
                <span ref={hoursRef} style={{ fontSize: 13.5 }}>{parts.hours}</span><span style={{ fontSize: 9, marginRight: 3 }}>h</span>
                <span ref={minsRef} style={{ fontSize: 13.5 }}>{parts.mins}</span><span style={{ fontSize: 9 }}>m</span>
              </span>
            </div>
            <button
              type="button"
              ref={ctaRef}
              className="lom-cta"
              onClick={handleCta}
              style={{
                position: 'relative', overflow: 'hidden', width: '100%', minHeight: 42, padding: '10px 18px',
                border: 'none', borderRadius: 15, background: 'linear-gradient(180deg, #F09B33, #C9720F)', color: '#fff',
                fontFamily: "'Optima', 'Gill Sans', 'Lato', sans-serif", fontSize: 'clamp(15.5px, 4.2vw, 16.5px)',
                fontWeight: 600, letterSpacing: '-.1px', cursor: 'pointer',
                boxShadow: '0 16px 34px -14px rgba(232,135,30,.85), inset 0 1px 0 rgba(255,255,255,.32)',
                animation: 'cvpRise 520ms cubic-bezier(.16,1,.3,1) 300ms both',
              }}
            >
              <span style={{ position: 'relative', zIndex: 1 }}>Start my 14 free days &rarr;</span>
              <span aria-hidden="true" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: '42%', background: 'linear-gradient(90deg, transparent, rgba(255,255,255,.4), transparent)', animation: 'cvpSweep 4.6s ease-in-out 1.6s infinite', pointerEvents: 'none' }} />
            </button>

            <p style={{ margin: '5px 0 0', textAlign: 'center', fontFamily: "'Lora', Georgia, serif", fontSize: 10.5, lineHeight: 1.28, color: 'rgba(246,247,245,.55)', textWrap: 'pretty' }}>
              Free for 14 days, then the standard plan. No card, no charge, nothing to cancel.
            </p>

            <div style={{ marginTop: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 9.5, color: 'rgba(246,247,245,.48)' }}>
              <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#6EE7DA', flexShrink: 0 }} />
              <span style={{ textAlign: 'center', textWrap: 'pretty' }}>Trusted across India &amp; the Gulf</span>
              <span style={{ color: 'rgba(246,247,245,.3)' }}>&middot;</span>
              <button
                type="button"
                className="lom-maybe"
                onClick={() => close('maybe_later')}
                style={{ display: 'inline', padding: '3px 2px', minHeight: 20, border: 'none', background: 'transparent', color: 'rgba(246,247,245,.7)', fontFamily: "'Lora', Georgia, serif", fontSize: 11, textDecoration: 'underline', textUnderlineOffset: 2, cursor: 'pointer' }}
              >
                Maybe later
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <Helmet>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,300;0,400;0,700;0,900;1,400&family=Lora:ital,wght@0,400;0,500;0,600;1,400;1,500&display=swap"
          rel="stylesheet"
        />
      </Helmet>
      {createPortal(modal, document.body)}
    </>
  );
}
