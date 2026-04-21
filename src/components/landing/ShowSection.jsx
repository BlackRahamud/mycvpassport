import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import RejectionReel from '../marketing/RejectionReel';

// Block 2 per spec — "show, don't tell". The video placeholder was
// replaced with the RejectionReel live-feed component, which carries
// its own header copy so the section-level caption is omitted.
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
        <RejectionReel />
      </motion.div>
    </section>
  );
}
