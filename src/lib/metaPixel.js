// src/lib/metaPixel.js

const PIXEL_ID = process.env.REACT_APP_META_PIXEL_ID;
export const CONSENT_KEY = 'cvp_cookie_consent';

// Add any founder emails here to completely exclude them from all tracking
const FOUNDER_EMAILS = [
  'connectingjunaidkhan@gmail.com',
  'jkhan2523@gmail.com'
];

/**
 * Checks if a given email belongs to the founder.
 */
export const isFounder = (email) => {
  if (!email) return false;
  return FOUNDER_EMAILS.includes(email.toLowerCase().trim());
};

/**
 * Checks if the user has explicitly given cookie consent ('accepted').
 */
export const hasUserConsent = () => {
  try {
    return localStorage.getItem(CONSENT_KEY) === 'accepted';
  } catch (e) {
    return false;
  }
};

// Tracks last recorded pathname to prevent duplicate StrictMode / remount firings
let lastTrackedPath = null;

/**
 * Injects the Meta Pixel script once and initializes it.
 * Does NOT fire PageView (handled separately by RouteTracker).
 */
export const initMetaPixel = (userEmail = null) => {
  if (isFounder(userEmail)) return;
  if (!hasUserConsent()) return;
  if (!PIXEL_ID) return;
  if (window.fbq) return; // Prevent duplicate injection

  (function (f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = '2.0';
    n.queue = [];
    t = b.createElement(e);
    t.async = true;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');

  window.fbq('init', PIXEL_ID);
};

/**
 * Tracks a PageView with path deduplication and consent/founder guards.
 */
export const trackPageView = (userEmail = null, pathname = window.location.pathname) => {
  if (isFounder(userEmail)) return;
  if (!hasUserConsent()) return;
  
  if (!window.fbq) {
    initMetaPixel(userEmail);
  }

  // Guard against double-firing for the same path in quick succession (StrictMode / remounts)
  if (lastTrackedPath === pathname) {
    return;
  }

  lastTrackedPath = pathname;
  if (window.fbq) {
    window.fbq('track', 'PageView');
  }
};

/**
 * Tracks custom events and mirrors to PostHog if available.
 */
export const trackCustomEvent = (eventName, data = {}, userEmail = null) => {
  if (isFounder(userEmail)) return;
  if (!hasUserConsent()) return;

  if (window.fbq) {
    window.fbq('trackCustom', eventName, data);
  }
  if (window.posthog) {
    window.posthog.capture(eventName, data);
  }
};

/**
 * Tracks Meta standard events (e.g. Lead, InitiateCheckout) and mirrors to PostHog if available.
 */
export const trackStandardEvent = (eventName, data = {}, userEmail = null) => {
  if (isFounder(userEmail)) return;
  if (!hasUserConsent()) return;
  initMetaPixel(userEmail);
  if (!window.fbq) return;
  window.fbq('track', eventName, data);
  if (window.posthog) window.posthog.capture(eventName, data);
};