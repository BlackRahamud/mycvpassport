import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import FeatureCard from './FeatureCard';

// Three feature cards in the locked order + copy from the W18 spec
// (blocks[2].cards in [READY]_landing_page_conversion_rewrite_W18.json).
// GhostChip is index 0 with the primary variant — the only amber card
// per fold. All three hrefs are verified routes in src/App.js.
const CARDS = [
  {
    id: 'ghostchip',
    variant: 'primary',
    title: 'GhostChip',
    tagline: "Built to pass the filter you can't see.",
    badge: 'ATS-proof, by default.',
    href: '/builder',
    ctaLabel: 'Try GhostChip',
  },
  {
    id: 'ats-checker',
    variant: 'default',
    title: 'ATS Checker',
    tagline: 'Upload. See your score. Know what to fix.',
    href: '/ats',
    ctaLabel: 'Check my CV',
  },
  {
    id: 'linkedin-optimizer',
    variant: 'default',
    title: 'LinkedIn Optimizer',
    tagline: 'The LinkedIn profile your CV deserves.',
    href: '/linkedin-optimizer',
    ctaLabel: 'Optimize LinkedIn',
  },
];

const FADE_UP = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: [0.25, 0.46, 0.45, 0.94],
      delay: i * 0.08,
    },
  }),
};

const INSTANT = {
  hidden: { opacity: 1, y: 0 },
  show: { opacity: 1, y: 0 },
};

export default function FeatureCardGrid() {
  const reduce = useReducedMotion();
  const variants = reduce ? INSTANT : FADE_UP;

  return (
    <section className="cvp-feature-card-grid" aria-label="Product features">
      <style>{`
        .cvp-feature-card-grid {
          max-width: 1200px;
          margin: 0 auto;
          padding: 96px 24px;
          box-sizing: border-box;
          color: var(--color-text-primary);
        }
        @media (max-width: 768px) {
          .cvp-feature-card-grid { padding: 72px 20px; }
        }
        .cvp-feature-card-grid-inner {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
        }
        @media (min-width: 1024px) {
          .cvp-feature-card-grid-inner {
            grid-template-columns: repeat(3, 1fr);
            gap: 32px;
          }
        }
        .cvp-feature-card-grid-item { display: flex; }
        .cvp-feature-card-grid-item > * { width: 100%; }
      `}</style>

      <div className="cvp-feature-card-grid-inner">
        {CARDS.map((card, i) => (
          <motion.div
            key={card.id}
            className="cvp-feature-card-grid-item"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            variants={variants}
            custom={i}
          >
            <FeatureCard
              variant={card.variant}
              title={card.title}
              tagline={card.tagline}
              badge={card.badge}
              href={card.href}
              ctaLabel={card.ctaLabel}
            />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
