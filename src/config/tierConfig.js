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
    prices: { AED: 45, INR: 349 },
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

// Reverse-lookup helpers for webhook handlers (which see amount-in-fils/paise
// from the gateway and need to recover the tier slug).
export function tierByServerAmount(amount, currency) {
  for (const slug of PAID_TIER_SLUGS) {
    if (getServerAmount(slug, currency) === amount) return slug;
  }
  return null;
}
