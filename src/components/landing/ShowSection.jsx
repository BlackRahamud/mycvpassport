import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import GhostChipShowSVG from '../marketing/GhostChipShowSVG';

// Block 2 — the conversion pivot. Renders the permanent
// inline-SVG + Framer Motion animation from Round 3a
// (src/components/marketing/GhostChipShowSVG.jsx). The retired
// video placeholder is gone; the temporary RejectionReel
// placement from Round 2 recovery is superseded by this round
// per Supreme Court Hybrid Path ruling 2026-04-21.
//
// Section id="show" is the smooth-scroll target for the Hero's
// "See how it works" secondary CTA.

export default function ShowSection() {
  const reduce = useReducedMotion();

  return (
    <section id="show" className="cvp-show" aria-label="Product demo">
      <style>{`
        .cvp-show {
          background: var(--color-surface-00);
          color: var(--color-text-primary);
          box-sizing: border-box;
          padding: 96px 24px;
        }
        @media (max-width: 768px) {
          .cvp-show { padding: 72px 16px; }
        }
      `}</style>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={reduce
          ? { duration: 0.01 }
          : { duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <GhostChipShowSVG />
      </motion.div>
    </section>
  );
}
