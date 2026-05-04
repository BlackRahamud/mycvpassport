import React from 'react';
import RejectionReel from '../marketing/RejectionReel';
import UploadTransformSection from './UploadTransformSection';

// May-2026 landing restructure: collapses the old "Quiet Truth"
// rejection-reel block and the "The Fix · 60 Seconds" upload-transform
// block into a single problem→fix arc. Both child components keep their
// existing copy and behavior; this wrapper only removes the visual gap
// between them so they read as one section, not two stacked ones.
//
// Slot order: RejectionReel (problem) → UploadTransformSection (fix).
// The wrapper exists purely so future restyling (shared eyebrow, single
// gradient backdrop, etc.) lands in one place.
export default function MergedProblemFixSection({ user }) {
  return (
    <section
      id="problem-arc"
      aria-label="Why CVs fail — and the fix"
      className="cvp-merged-problem-fix"
    >
      <style>{`
        .cvp-merged-problem-fix {
          background: var(--color-surface-00, #0A0A0A);
          color: var(--color-text-primary, #FFFFFF);
          box-sizing: border-box;
        }
        /* Tighten the seam between RejectionReel (problem) and
           UploadTransformSection (fix) so they read as one arc.
           UploadTransformSection sets its own top padding internally;
           negative margin pulls it up against the rejection reel. */
        .cvp-merged-problem-fix > :nth-child(2) {
          margin-top: -32px;
        }
        @media (max-width: 768px) {
          .cvp-merged-problem-fix > :nth-child(2) {
            margin-top: -16px;
          }
        }
      `}</style>

      <RejectionReel />
      <UploadTransformSection user={user} />
    </section>
  );
}
