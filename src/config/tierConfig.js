// Canonical tier definitions. Server amount validation, gateway routing,
// UI pricing, and profiles.plan enum all map through this file. Do not
// hardcode tier prices anywhere else.
//
// Pricing model is one-time + duration-based. Express Pass is a permanent
// single-CV unlock (duration_days=null). Active Hunter / Career Pro are
// time-bounded access passes — duration_days is what the webhook adds to
// pro_access_expires_at (Phase 2).

export const TIERS = {
  explorer: {
    slug: 'explorer',
    displayName: 'Explorer',
    model: 'free',
    duration_days: null,
    prices: { AED: 0, INR: 0 },
    ai_tailor_quota: 0,
  },
  express_pass: {
    slug: 'express_pass',
    displayName: 'Express Pass',
    model: 'permanent',
    duration_days: null,
    prices: { AED: 19, INR: 149 },
    ai_tailor_quota: 3,
  },
  active_hunter: {
    slug: 'active_hunter',
    displayName: 'Active Hunter',
    model: 'pass',
    duration_days: 30,
    // AED 29 is the documented Active Hunter price (CLAUDE.md). The 45
    // held here was the source of the button-versus-charge mismatch on
    // the ats and jobMatch CTAs. Note this makes Active Hunter 2900 fils,
    // the same amount as the linkedin_optimizer unlock — harmless now
    // that webhooks identify a product from the signed reference rather
    // than from its price, and impossible to get right under the old
    // amount lookup.
    prices: { AED: 29, INR: 349 },
    ai_tailor_quota: 10,
  },
  career_pro: {
    slug: 'career_pro',
    displayName: 'Career Pro',
    model: 'pass',
    duration_days: 365,
    prices: { AED: 169, INR: 999 },
    ai_tailor_quota: null,
  },
};

export const PAID_TIER_SLUGS = Object.keys(TIERS).filter((s) => s !== 'explorer');

// A-la-carte one-time unlocks. These route through the `permissions`
// table (service string below) and never touch profiles.plan.
//
// This is the ONE price table for a-la-carte items. It replaces the three
// hand-synced copies that used to live in api/create-ziina-payment.js
// (A_LA_CARTE_FILS), api/razorpay.js (A_LA_CARTE_INR_PAISE) and
// src/utils/paywall.js (A_LA_CARTE_AED). A webhook validates the amount
// it was paid against this table, so a drifted copy is now a rejected
// payment rather than a silently wrong grant.
//
// `prices` lists ONLY the currencies an item is actually sold in. An
// absent currency means "not for sale on that rail" and getAlaCarteAmount
// returns null, which callers must treat as a hard reject. INR prices are
// deliberately absent for everything except linkedinOptimizer because no
// INR price has ever been set for those items — do not invent one here.
// Only two genuine a-la-carte products exist. `ats`, `jobMatch` and
// `templates` were REMOVED here after tracing their gates:
//   - ats:       src/ATSChecker.jsx gates on a plain isPro boolean. Its
//                CTA reads "Unlock pro" and sells a tier, not an unlock.
//   - jobMatch:  src/JobMatch.jsx already calls
//                hasFeatureAccess(..., "activeHunter") — the gate was
//                always the TIER, never a jobMatch permission.
//   - templates: no gate anywhere in the app, and no purchase CTA
//                anywhere in src/. It was a phantom price with nothing
//                on either end.
// All three now resolve to the activeHunter tier at the paywall choke
// point (VIRTUAL_FEATURE_TO_TIER in src/utils/paywall.js), which is what
// their copy always promised. They previously "worked" only because the
// unrecognised-amount webhook fallback granted Active Hunter by accident.
export const A_LA_CARTE = {
  coverLetter:       { service: 'cover_letter',       prices: { AED: 10 } },
  linkedinOptimizer: { service: 'linkedin_optimizer', prices: { AED: 29, INR: 149 } },
};

// Reverse map: permission-service string → feature key. The webhook
// receives the resolved service string and needs to price-check it.
export const SERVICE_TO_ALACARTE = Object.entries(A_LA_CARTE).reduce(
  (acc, [feature, def]) => { acc[def.service] = feature; return acc; },
  {},
);

export const VALID_ALACARTE_SERVICES = new Set(Object.keys(SERVICE_TO_ALACARTE));

export function alaCarteServiceFor(feature) {
  return A_LA_CARTE[feature]?.service || null;
}

// Amount in the smallest unit (fils/paise) for an a-la-carte item.
// Returns null for an unknown feature OR a currency it is not sold in.
export function getAlaCarteAmount(feature, currency) {
  const item = A_LA_CARTE[feature];
  if (!item) return null;
  const major = item.prices[currency];
  if (major == null) return null;
  return major * 100;
}

// Same lookup keyed by the permission-service string the webhook sees.
export function getAlaCarteAmountByService(service, currency) {
  const feature = SERVICE_TO_ALACARTE[service];
  if (!feature) return null;
  return getAlaCarteAmount(feature, currency);
}

// UI state historically uses short slugs (express/hunter/pro). Server uses
// the canonical full slug. Ziina's wire format uses a camelCase "feature"
// key. Keep all three mappings declared in one place.
export const UI_SLUG_TO_TIER = {
  explorer: 'explorer',
  express: 'express_pass',
  hunter: 'active_hunter',
  pro: 'career_pro',
};

export const TIER_TO_UI_SLUG = {
  explorer: 'explorer',
  express_pass: 'express',
  active_hunter: 'hunter',
  career_pro: 'pro',
};

export const ZIINA_FEATURE_TO_TIER = {
  expressPass: 'express_pass',
  activeHunter: 'active_hunter',
  careerPro: 'career_pro',
};

export const TIER_TO_ZIINA_FEATURE = {
  express_pass: 'expressPass',
  active_hunter: 'activeHunter',
  career_pro: 'careerPro',
};

// profiles.plan column has historically stored UPPERCASE_SNAKE — preserve.
export const TIER_TO_PROFILE_PLAN = {
  explorer: 'FREE',
  express_pass: 'EXPRESS_PASS',
  active_hunter: 'ACTIVE_HUNTER',
  career_pro: 'CAREER_PRO',
};

export const PROFILE_PLAN_TO_TIER = {
  FREE: 'explorer',
  EXPRESS_PASS: 'express_pass',
  ACTIVE_HUNTER: 'active_hunter',
  CAREER_PRO: 'career_pro',
};

export function gatewayForCurrency(currency) {
  return currency === 'INR' ? 'razorpay' : 'ziina';
}

// Countries whose users should be charged in AED (UAE + GCC corridor).
// Anything not in this set and not 'IN' falls through to INR — the
// cheaper currency, so a misdetect under-charges rather than over-charges.
// Conservative on purpose: never silently route an unknown user to AED.
const AED_COUNTRIES = new Set(['AE', 'SA', 'KW', 'BH', 'QA', 'OM']);

export function currencyForCountry(country) {
  const cc = String(country || '').toUpperCase();
  if (cc === 'IN') return 'INR';
  if (AED_COUNTRIES.has(cc)) return 'AED';
  return 'INR';
}

// Server amount in the smallest unit (paise for INR, fils for AED).
export function getServerAmount(slug, currency) {
  const tier = TIERS[slug];
  if (!tier) return null;
  const major = tier.prices[currency];
  if (major == null) return null;
  return major * 100;
}

export function getDisplayPrice(slug, currency) {
  const tier = TIERS[slug];
  if (!tier) return null;
  return tier.prices[currency];
}

export function isPaidTier(slug) {
  return PAID_TIER_SLUGS.includes(slug);
}

// REMOVED: tierByServerAmount(amount, currency).
//
// It recovered a tier slug by matching an amount, which is precisely the
// pattern that let two same-priced products be confused and let an
// unrecognised amount fall through to a default grant. It had no callers
// left once the webhooks moved to explicit product identity, and it is
// deliberately not kept "just in case" — a webhook that needs to know
// what was bought must read it from the signed reference or order notes,
// never from the price. See src/lib/payments/paymentRef.js.
