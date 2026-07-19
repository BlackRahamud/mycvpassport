// Single source of truth for the candidate-facing plan IDENTITY (names,
// order, taglines) — prices come from tierConfig. Both the homepage pricing
// preview (PricingAnchorSection) and the full /pricing page read this so plan
// names and prices can never drift between the two surfaces again.
//
// Note: express_pass is shown to customers as "Single-CV Unlock" — the
// canonical tierConfig displayName ("Express Pass") stays untouched so webhook
// routing / invoices / stored plan enums are stable.
import { getDisplayPrice } from './tierConfig';

export const PLAN_ORDER = ['explorer', 'express_pass', 'active_hunter', 'career_pro'];

export const PLAN_META = {
  explorer:      { name: 'Explorer',         period: 'forever',     role: 'floor',  tagline: 'No card. No catch.' },
  express_pass:  { name: 'Single-CV Unlock', period: 'one time',    role: 'entry',  tagline: 'Three premium downloads, yours to keep.' },
  active_hunter: { name: 'Active Hunter',    period: '30 day pass', role: 'hero',   tagline: 'Less than a coffee. More than a recruiter.' },
  career_pro:    { name: 'Career Pro',       period: '1 year pass', role: 'anchor', tagline: 'Every tool, all year.' },
};

// currency: 'AED' | 'INR'. Returns display-ready cards with live prices.
export function getPlanPreview(currency) {
  const cur = currency === 'INR' ? 'INR' : 'AED';
  const symbol = cur === 'INR' ? '₹' : 'AED';
  return PLAN_ORDER.map((slug) => {
    const amount = getDisplayPrice(slug, cur);
    return {
      slug,
      ...PLAN_META[slug],
      priceLabel: slug === 'explorer' ? 'Free' : `${symbol} ${amount}`,
    };
  });
}
