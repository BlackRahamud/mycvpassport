// =============================================================
// src/components/AIWorkingGlow.jsx
//
// Reusable "AI is working" treatment: an animated conic-gradient amber
// ring rendered around the OUTSIDE of whatever field box it wraps.
// Shares the same orbiting-ring language as the ATS "Analyze My CV"
// CTA (the canonical conic-gradient + masked-border engine), retuned
// to the v1.2 amber accent (#EF9F27) and a faster "working" cadence.
//
// Usage — identical across Experience, Education, and Summary boxes:
//   <AIWorkingGlow active={isGenerating} radius={12}>
//     <textarea ... />
//   </AIWorkingGlow>
//
// Contract:
//   - active=false renders ZERO extra visible UI (just a relatively-
//     positioned wrapper), so it is safe to leave mounted permanently.
//   - The ring appears the instant active flips true and is removed the
//     instant it flips false (caller clears it on results/error).
//   - Animation is wrapped in @media (prefers-reduced-motion:
//     no-preference); reduced-motion users get a STATIC amber border
//     (the same masked ring, solid fill, no spin).
//
// The ring sits at inset:-3px so it reads as an outline hugging the box
// rather than an inner stroke. radius should match the wrapped box's
// border-radius so the ring corners track the field corners.
// =============================================================

import { useId } from "react";

// Self-contained animation engine. Namespaced (--aiwg-angle / aiwg-spin)
// so it never collides with the ATS page's --ats-angle declaration even
// when both mount on the same screen. Injected once per instance via a
// <style> tag — @property / @keyframes de-dupe harmlessly across copies.
const AIWG_CSS = `
@property --aiwg-angle {
  syntax: '<angle>';
  initial-value: 0deg;
  inherits: false;
}
@keyframes aiwg-spin { to { --aiwg-angle: 360deg; } }
/* Generic icon-spin, kept here so any field that mounts the glow also has
   a guaranteed spin keyframe for its "Improving..." button icon. */
@keyframes cvp-ai-spin { to { transform: rotate(360deg); } }

.aiwg-ring {
  position: absolute;
  inset: -3px;
  pointer-events: none;
  z-index: 4;
  padding: 2px;
  /* Mask the fill into a hollow border so only a 2px outline shows. */
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
          mask-composite: exclude;
  /* Reduced-motion / no-@property fallback: a static amber border. */
  background: #EF9F27;
}

@media (prefers-reduced-motion: no-preference) {
  .aiwg-ring {
    background: conic-gradient(
      from var(--aiwg-angle, 0deg),
      transparent 52%,
      #EF9F27 78%,
      #FFC775 88%,
      transparent 100%
    );
    animation: aiwg-spin 1.1s linear infinite;
  }
}
`;

export default function AIWorkingGlow({ active = false, radius = 12, children, style, className }) {
  // useId keeps the injected <style> stable across re-renders; the CSS is
  // global so we only need it present, not unique.
  const id = useId();
  return (
    <div
      className={className}
      style={{ position: "relative", width: "100%", ...style }}
      data-aiwg-id={id}
    >
      <style dangerouslySetInnerHTML={{ __html: AIWG_CSS }} />
      {children}
      {active && (
        <span
          aria-hidden="true"
          className="aiwg-ring"
          style={{ borderRadius: radius + 3 }}
        />
      )}
    </div>
  );
}
