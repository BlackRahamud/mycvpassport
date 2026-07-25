// isPrerender — the single guard that keeps build-time-only markup out of
// the static snapshots.
//
// scripts/prerender.mjs sets window.__CVP_PRERENDER__ = true before any page
// script runs. Anything that auto-opens, auto-plays or is dismissible must
// check this: without it, the prerenderer freezes a handler-less copy into
// the HTML that the visitor can see but never close (the un-closable
// launch-modal bug). The ReactSnap UA sniff is a legacy fallback.

export function isPrerender() {
  if (typeof window !== 'undefined' && window.__CVP_PRERENDER__ === true) return true;
  return typeof navigator !== 'undefined' && String(navigator.userAgent || '').includes('ReactSnap');
}

export default isPrerender;
