// Launch-offer analytics. Thin wrappers over the existing triple-write
// logEvent() so event names/props stay consistent across the app. These are
// ADDITIVE — the existing download_clicked event (fired in BuilderPage) is
// left exactly as-is and never renamed.
//
// Events (see the launch spec):
//   launch_offer_viewed        { surface: "modal" | "strip" | "hero" }
//   launch_offer_cta_clicked   { surface }
//   upload_started             { upload_number: 1..3 }
//   upload_blocked             { reason: "not_signed_in" | "limit_reached" }
//   upload_succeeded
//   download_blocked           { reason: "limit_reached" }
//   launch_offer_limit_hit     { type: "upload" | "download" }
//   launch_offer_dismissed     { method: "x" | "maybe_later" | "backdrop" | "esc" }

import { logEvent } from './logEvent';

export function trackLaunchOfferViewed(surface) {
  logEvent('launch_offer_viewed', { surface });
}

export function trackLaunchOfferCtaClicked(surface) {
  logEvent('launch_offer_cta_clicked', { surface });
}

export function trackLaunchOfferDismissed(method) {
  logEvent('launch_offer_dismissed', { method });
}

export function trackUploadStarted(uploadNumber) {
  logEvent('upload_started', { upload_number: uploadNumber });
}

export function trackUploadBlocked(reason) {
  logEvent('upload_blocked', { reason });
}

export function trackUploadSucceeded() {
  logEvent('upload_succeeded', {});
}

export function trackDownloadBlocked(reason) {
  logEvent('download_blocked', { reason });
}

export function trackLaunchOfferLimitHit(type) {
  logEvent('launch_offer_limit_hit', { type });
}
