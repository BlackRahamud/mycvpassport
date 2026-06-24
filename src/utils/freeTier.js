/**
 * Free-tier status helpers — shared across HR Portal (post-job gate)
 * and AccountPage (limits display).
 *
 * The free tier is a 90-day window from signup. After that, posting new jobs
 * is gated behind upgrade. Within the window, the user has full ATS access,
 * up to 10 active job listings, and 200 applicants/month.
 *
 * `created_at` lives on Supabase auth users (`user.created_at`).
 */

import { isFounder } from "./founder";

export const FREE_TIER = Object.freeze({
  days: 90,
  bannerThresholdDays: 14,
  jobLimit: 10,
  applicantsPerMonth: 200,
  atsAccess: "full",
});

export function freeTierStatus(user) {
  // Founder: never expired, never banner (client-side convenience, keyed
  // off the authenticated session email only).
  if (isFounder(user)) {
    return {
      hasSignupDate: true,
      daysSinceSignup: 0,
      daysRemaining: FREE_TIER.days,
      isExpired: false,
      showBanner: false,
      expiresAt: null,
    };
  }

  const createdRaw = user?.created_at || user?.createdAt;
  const createdAt = createdRaw ? new Date(createdRaw) : null;

  if (!createdAt || Number.isNaN(createdAt.getTime())) {
    // Without a signup timestamp we play it safe — no banner, no gate.
    return {
      hasSignupDate: false,
      daysSinceSignup: null,
      daysRemaining: FREE_TIER.days,
      isExpired: false,
      showBanner: false,
      expiresAt: null,
    };
  }

  const ms = Date.now() - createdAt.getTime();
  const daysSinceSignup = Math.floor(ms / 86400000);
  const daysRemaining = Math.max(0, FREE_TIER.days - daysSinceSignup);
  const expiresAt = new Date(createdAt.getTime() + FREE_TIER.days * 86400000);

  return {
    hasSignupDate: true,
    daysSinceSignup,
    daysRemaining,
    isExpired: daysRemaining === 0,
    showBanner: daysRemaining > 0 && daysRemaining <= FREE_TIER.bannerThresholdDays,
    expiresAt,
  };
}
