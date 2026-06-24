import safeFetch from '../lib/net/safeFetch';

// HR portal "Enterprise" is contact-sales — NOT a Ziina/payment flow.
// Single source of truth for the sales contact targets so the pricing
// screen and any future CTA reference one place. Digits only for wa.me.
export const HR_SALES = {
  whatsapp: '971585508782',                 // +971 58 550 8782
  email: 'partnership@mycvpassport.com',
};

export async function getPaymentLink(feature, userId, userEmail) {
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
