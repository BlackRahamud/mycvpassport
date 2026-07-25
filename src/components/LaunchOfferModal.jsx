// LaunchOfferModal — the once-per-visitor launch-offer poster.
//
// TIMING (the rule that matters): a cold visitor must see the landing page
// FIRST. The modal arms two triggers and fires on whichever lands first —
// OPEN_DELAY_MS on the page, or SCROLL_TRIGGER_RATIO of the page scrolled.
// It never pops instantly, and it still shows only once per visitor
// (localStorage), only on public marketing routes, and never during the
// build-time prerender pass.
//
// VISUALS live in LaunchOfferModal.css and read the semantic theme tokens
// only — light on the site's light default, flipping with data-theme="dark".
// Amber is the single accent; the ticks are the only green.

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { isOfferActive, OFFER_END_ISO } from '../config/launchOffer';
import { isPrerender } from '../lib/prerender';
import { launchCtaNavigate } from './launch/launchCta';
import {
  trackLaunchOfferViewed,
  trackLaunchOfferCtaClicked,
  trackLaunchOfferDismissed,
} from '../lib/analytics/launchOfferEvents';
import './LaunchOfferModal.css';

const SEEN_KEY = 'cvpassport_launch_modal_seen';

// Warm-up window: the offer appears after 5s on the page OR once the visitor
// has scrolled 30% of it — whichever comes first.
const OPEN_DELAY_MS = 5000;
const SCROLL_TRIGGER_RATIO = 0.3;

// Landing / public marketing surfaces get the modal; functional flows (auth,
// checkout, builder, dashboard, employer, …) never do — per spec.
const EXCLUDED_PREFIXES = [
  '/auth', '/register', '/login', '/signin', '/reset-password', '/auth/callback',
  '/builder', '/walk-in', '/cover-letter',
  '/payment', '/payment-success', '/checkout', '/transform',
  '/dashboard', '/account', '/scout', '/admin',
  '/employer', '/hr',
];

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

function Tick() {
  return (
    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M2.5 6.2 5 8.6l4.5-5.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
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
  const openedRef = useRef(false);

  const enterTimerRef = useRef(0);
  const closeTimerRef = useRef(0);

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
    closeTimerRef.current = setTimeout(finishClose, 240);
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

  // Arm the two open triggers — dwell time OR scroll depth, first one wins.
  // Never during prerender, never off-route, never twice per visitor.
  useEffect(() => {
    if (openedRef.current) return undefined;
    if (isPrerender()) return undefined;
    if (!isOfferActive()) return undefined;
    if (!isEligibleRoute(location.pathname)) return undefined;
    if (hasSeen()) return undefined;

    let fired = false;
    let timer = 0;

    function disarm() {
      clearTimeout(timer);
      window.removeEventListener('scroll', onScroll);
    }
    function fire() {
      if (fired || openedRef.current) return;
      fired = true;
      openedRef.current = true;
      disarm();
      doOpen();
    }
    // Depth is measured on the document, and only from a real scroll event —
    // a restored scroll position on load does not count as "warmed up".
    function onScroll() {
      const doc = document.documentElement;
      const max = (doc.scrollHeight || 0) - (window.innerHeight || 0);
      if (max <= 0) return; // nothing to scroll — the timer owns this page
      const y = window.scrollY || doc.scrollTop || 0;
      if (y / max >= SCROLL_TRIGGER_RATIO) fire();
    }

    timer = setTimeout(fire, OPEN_DELAY_MS);
    window.addEventListener('scroll', onScroll, { passive: true });

    return disarm;
    // location.pathname intentionally in deps: if the visitor lands on an
    // excluded route first and navigates to an eligible one, the triggers arm.
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
  // visitor prefers reduced motion).
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
        { duration: 520, easing: 'cubic-bezier(0.4, 0, 0.2, 1)' },
      );
    });
    prevPartsRef.current = p;
  }, [now, mounted]);

  // Cleanup all timers on unmount.
  useEffect(() => () => {
    clearTimeout(enterTimerRef.current);
    clearTimeout(closeTimerRef.current);
  }, []);

  // Secondary gate: never render when the offer isn't active (the mount also
  // gates on the flag-aware offerActive, so a killed flag never reaches here).
  if (!isOfferActive()) return null;
  if (!mounted || typeof document === 'undefined') return null;

  const parts = computeParts(now);
  const shown = entered && !closing;

  const modal = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="14 days free launch offer"
      ref={shellRef}
      className="lom-root"
      data-shown={shown ? 'true' : 'false'}
      data-closing={closing ? 'true' : 'false'}
    >
      <div className="lom-scrim" onClick={() => close('backdrop')} />

      <div className="lom-wrap">
        <div className="lom-card">
          <button type="button" className="lom-close" aria-label="Close offer" onClick={() => close('x')}>
            &#10005;
          </button>

          {/* Mascot band — the greeter who opens the offer. */}
          <div className="lom-band">
            <div className="lom-band-aurora" aria-hidden="true" />
            <img
              src="/launch/mascot.png"
              alt=""
              aria-hidden="true"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <div className="lom-band-fade" aria-hidden="true" />
            <p className="lom-bubble">Hey, you are early. Let me open everything for you.</p>
          </div>

          <div className="lom-body">
          <div className="lom-glow" aria-hidden="true" />

          <span className="lom-chip">
            <i aria-hidden="true" />
            Launch offer
          </span>

          <h2 className="lom-title">
            14 days, <em>free</em>.
          </h2>

          <p className="lom-sub">
            You are early. Everything is unlocked for two weeks — import your CV,
            score it against the job, download it.
          </p>

          <div className="lom-perks">
            <div className="lom-perk">
              <div className="lom-perk-top">
                <Tick />
                <span className="lom-perk-val">3</span>
              </div>
              <div className="lom-perk-key">Imports</div>
              <div className="lom-perk-sub">upload &amp; auto-fill</div>
            </div>
            <div className="lom-perk">
              <div className="lom-perk-top">
                <Tick />
                <span className="lom-perk-val">3</span>
              </div>
              <div className="lom-perk-key">Downloads</div>
              <div className="lom-perk-sub">yours to keep</div>
            </div>
            <div className="lom-perk">
              <div className="lom-perk-top">
                <Tick />
                <span className="lom-perk-val">All</span>
              </div>
              <div className="lom-perk-key">Templates</div>
              <div className="lom-perk-sub">Gulf ready</div>
            </div>
          </div>

          <div className="lom-count">
            <span className="lom-count-label">{endLabel()}</span>
            <span className="lom-count-dot" aria-hidden="true">&middot;</span>
            <span className="lom-count-nums">
              <b ref={daysRef}>{parts.days}</b><span>d</span>
              <b ref={hoursRef}>{parts.hours}</b><span>h</span>
              <b ref={minsRef}>{parts.mins}</b><span>m</span>
            </span>
          </div>

          <button type="button" ref={ctaRef} className="lom-cta" onClick={handleCta}>
            <b>Start my 14 free days &rarr;</b>
            <i aria-hidden="true" />
          </button>

          <p className="lom-reassure">
            Free for 14 days, then the standard plan. No card, no charge, nothing to cancel.
          </p>

          <div className="lom-foot">
            <i aria-hidden="true" />
            <span>Trusted across India &amp; the Gulf</span>
            <span aria-hidden="true">&middot;</span>
            <button type="button" className="lom-maybe" onClick={() => close('maybe_later')}>
              Maybe later
            </button>
          </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
