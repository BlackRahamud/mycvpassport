import safeFetch from '../lib/net/safeFetch';
import { logEvent } from '../lib/analytics/logEvent';
import { ZIINA_FEATURE_TO_TIER, getDisplayPrice, A_LA_CARTE } from '../config/tierConfig';
import { hasProAccess } from '../config/access';

// Monetization funnel events fire HERE because getPaymentLink is the sole
// Ziina gateway — every AED upgrade CTA in the app funnels through it, so
// one instrumentation point covers all ~10 surfaces. The INR/Razorpay
// twin lives in src/components/RazorpayPayment.jsx.
//
// A-la-carte AED prices now read from the single table in tierConfig.
// This used to be a hand-maintained third copy of the same numbers; the
// analytics price could drift from the charged price with nothing to
// catch it. Analytics-only either way — the server never trusts these.
function alaCarteDisplayAed(feature) {
  return A_LA_CARTE[feature]?.prices?.AED ?? null;
}

// Virtual feature keys — CTAs that sell a TIER but were historically
// passed to the payment layer as if they were one-time unlocks.
//
// `builder_ai` was already recognised as virtual and remapped inside
// UpgradeModal; ats, jobMatch and templates are the same shape and were
// never given the same treatment. They only ever granted access because
// the webhook's unrecognised-amount fallback handed out Active Hunter by
// accident. Resolving them HERE, at the single gateway, means no call
// site can drift: every getPaymentLink caller is corrected at once.
export const VIRTUAL_FEATURE_TO_TIER = {
  builder_ai: 'activeHunter',
  ats: 'activeHunter',
  jobMatch: 'activeHunter',
  templates: 'activeHunter',
};

export function resolvePaymentFeature(feature) {
  return VIRTUAL_FEATURE_TO_TIER[feature] || feature;
}

function paymentEventProps(feature) {
  const tierSlug = ZIINA_FEATURE_TO_TIER[feature];
  return {
    plan: tierSlug || feature,
    price: tierSlug ? getDisplayPrice(tierSlug, 'AED') : alaCarteDisplayAed(feature),
    currency: 'AED',
    gateway: 'ziina',
    cta_location: typeof window !== 'undefined' ? window.location.pathname : null,
  };
}

// HR portal "Enterprise" is contact-sales — NOT a Ziina/payment flow.
// Single source of truth for the sales contact targets so the pricing
// screen and any future CTA reference one place. Digits only for wa.me.
export const HR_SALES = {
  whatsapp: '971585508782',                 // +971 58 550 8782
  email: 'partnership@mycvpassport.com',
};

export async function getPaymentLink(rawFeature, userId, userEmail) {
  // Resolve virtual keys to the tier they actually sell BEFORE anything
  // else, so analytics and the charge agree on what was bought.
  const feature = resolvePaymentFeature(rawFeature);
  const eventProps = paymentEventProps(feature);
  // Every call to this function IS an upgrade-CTA click (access-holders
  // never reach it — handlePaywallClick short-circuits them).
  logEvent('upgrade_clicked', eventProps);
  try {
    if (!userId) {
      const { supabase } = await import('../supabaseClient');
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        userId = user.id;
        userEmail = userEmail || user.email;
      }
    }
    const res = await safeFetch('/api/create-ziina-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ feature, userId, userEmail }),
    });
    const data = await res.json();
    // A payment URL in hand means the user is about to land on Ziina's
    // hosted checkout — the last observable client moment before payment.
    if (data.url) logEvent('checkout_started', eventProps);
    return data.url || null;
  } catch {
    return null;
  }
}

// Pro access. Reuses the canonical helper in src/config/access.js rather
// than defining a second one — that file is already the shared client and
// server check. The is_pro fallback is kept here because useCvpAuth
// derives is_pro (including the founder unlock) into the profile object
// this function receives, so a profile can legitimately be pro with no
// expiry set.
function isProNow(profile) {
  if (!profile) return false;
  return profile.is_pro === true || hasProAccess(profile);
}

/**
 * Client-side access reflection. This is NOT the gate — it decides what
 * the UI shows. The real gate is server side: cover letter generation
 * consumes a credit in api/ai.js, and the LinkedIn optimizer decides
 * unlock in its edge function. A user who edits this in devtools sees a
 * different button and still cannot generate anything.
 *
 * The old `profile.features?.[feature]` branch is GONE. Nothing in the
 * codebase ever wrote profiles.features, so that branch was dead on both
 * ends and made this function look like it consulted an entitlement map
 * when it only ever read is_pro.
 *
 * coverLetter is consumable: pro access, or at least one credit left.
 * Every other feature key resolves to pro access, because ats, jobMatch
 * and templates are tier features rather than a-la-carte unlocks (see
 * A_LA_CARTE in src/config/tierConfig.js).
 */
export function hasFeatureAccess(profile, feature) {
  if (!profile) return false;
  if (isProNow(profile)) return true;
  if (feature === 'coverLetter') {
    return Number(profile.cover_letter_credits) > 0;
  }
  return false;
}

// Credits remaining for the UI to show. Pro users are not metered, so
// null means "not applicable" rather than zero.
export function coverLetterCreditsLeft(profile) {
  if (!profile || isProNow(profile)) return null;
  return Math.max(0, Number(profile.cover_letter_credits) || 0);
}

export async function handlePaywallClick(e, profile, feature, onSuccess, setLoading) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  if (!hasFeatureAccess(profile, feature)) {
    if (setLoading) setLoading(true);
    try {
      const url = await getPaymentLink(feature, profile?.id, profile?.email);
      if (url) {
        window.location.href = url;
      } else {
        alert('Payment initialization failed. Please try again.');
      }
    } catch {
      alert('Payment initialization failed. Please try again.');
    } finally {
      if (setLoading) setLoading(false);
    }
    return false;
  }
  if (onSuccess) onSuccess();
  return true;
}
