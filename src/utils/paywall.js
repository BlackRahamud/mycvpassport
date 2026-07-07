import safeFetch from '../lib/net/safeFetch';
import { logEvent } from '../lib/analytics/logEvent';
import { ZIINA_FEATURE_TO_TIER, getDisplayPrice } from '../config/tierConfig';

// Monetization funnel events fire HERE because getPaymentLink is the sole
// Ziina gateway — every AED upgrade CTA in the app funnels through it, so
// one instrumentation point covers all ~10 surfaces. The INR/Razorpay
// twin lives in src/components/RazorpayPayment.jsx.
//
// A-la-carte AED prices, major units — keep in sync with
// api/create-ziina-payment.js A_LA_CARTE_FILS (analytics-only; the server
// never trusts these).
const A_LA_CARTE_AED = {
  coverLetter: 10,
  ats: 29,
  jobMatch: 29,
  templates: 29,
  linkedinOptimizer: 29,
};

function paymentEventProps(feature) {
  const tierSlug = ZIINA_FEATURE_TO_TIER[feature];
  return {
    plan: tierSlug || feature,
    price: tierSlug ? getDisplayPrice(tierSlug, 'AED') : (A_LA_CARTE_AED[feature] ?? null),
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

export async function getPaymentLink(feature, userId, userEmail) {
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

export function hasFeatureAccess(profile, feature) {
  if (!profile) return false;
  if (profile.is_pro === true) return true;
  return !!profile.features?.[feature];
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
