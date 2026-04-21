import React, { useCallback } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

// V8 copy — Founder-locked 2026-04-21 in
// /3-MARKETING/GhostChip/[READY]_ghostchip_one_liner.md. Do not paraphrase.
const H1 = "Built to pass the filter you can't see.";
const H2 = 'GhostChip injects the ATS keywords your CV needs — invisibly. You write the story. We handle the scan.';
const PRIMARY_LABEL = 'Try it free';
const SECONDARY_LABEL = 'See how it works';
const PRIMARY_HREF = '/builder';

const FADE_UP = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.24, ease: [0.25, 0.46, 0.45, 0.94], delay: i * 0.08 },
  }),
};

const INSTANT = {
  hidden: { opacity: 1, y: 0 },
  show: { opacity: 1, y: 0 },
};

export default function HeroSection() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const parallaxY = useTransform(scrollY, [0, 480], [0, -20]);
  const parallaxOpacity = useTransform(scrollY, [0, 480], [1, 0.88]);
  const variants = reduce ? INSTANT : FADE_UP;

  const onPrimary = useCallback(() => { navigate(PRIMARY_HREF); }, [navigate]);
  const onSecondary = useCallback((e) => {
    e.preventDefault();
    const el = typeof document !== 'undefined' ? document.getElementById('show') : null;
    if (el) {
      el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    }
  }, [reduce]);

  const contentMotionStyle = reduce ? undefined : { y: parallaxY, opacity: parallaxOpacity };

  return (
    <section className="cvp-hero" aria-labelledby="cvp-hero-h1">
      <style>{`
        .cvp-hero {
          position: relative;
          max-width: 1200px;
          margin: 0 auto;
          padding: 96px 24px 120px;
          display: grid;
          grid-template-columns: 3fr 2fr;
          gap: 48px;
          align-items: center;
          color: var(--color-text-primary);
          font-family: inherit;
          box-sizing: border-box;
        }
        @media (max-width: 900px) {
          .cvp-hero {
            grid-template-columns: 1fr;
            gap: 32px;
            padding: 64px 20px 72px;
            text-align: center;
          }
        }
        .cvp-hero-h1 {
          font-size: clamp(36px, 5.4vw, 60px);
          font-weight: 700;
          letter-spacing: -0.02em;
          line-height: 1.05;
          margin: 0;
          color: var(--color-text-primary);
          font-family: inherit;
        }
        .cvp-hero-h2 {
          font-size: clamp(16px, 1.6vw, 19px);
          font-weight: 400;
          line-height: 1.6;
          color: var(--color-text-secondary);
          margin: 24px 0 0;
          max-width: 560px;
          font-family: inherit;
        }
        @media (max-width: 900px) {
          .cvp-hero-h2 { margin-left: auto; margin-right: auto; }
        }
        .cvp-hero-ctas {
          display: flex; flex-wrap: wrap; gap: 12px;
          margin-top: 40px;
        }
        @media (max-width: 900px) {
          .cvp-hero-ctas { justify-content: center; }
        }
        .cvp-hero-cta-primary {
          background: var(--color-accent);
          color: var(--color-surface-00);
          border: none;
          padding: 14px 28px;
          border-radius: var(--radius-pill);
          font-family: inherit;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          transition: filter 160ms cubic-bezier(0.25, 0.46, 0.45, 0.94),
                      transform 160ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
          will-change: transform;
        }
        .cvp-hero-cta-primary:hover { filter: brightness(0.92); }
        .cvp-hero-cta-primary:active { transform: scale(0.98) translateZ(0); }
        .cvp-hero-cta-primary:focus-visible {
          outline: 2px solid var(--color-accent);
          outline-offset: 2px;
        }
        .cvp-hero-cta-secondary {
          background: transparent;
          color: var(--color-text-primary);
          border: 1px solid var(--color-border);
          padding: 14px 24px;
          border-radius: var(--radius-pill);
          font-family: inherit;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          transition: background-color 160ms cubic-bezier(0.25, 0.46, 0.45, 0.94),
                      border-color 160ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        .cvp-hero-cta-secondary:hover {
          background: var(--color-surface-01);
          border-color: var(--color-text-secondary);
        }
        .cvp-hero-cta-secondary:focus-visible {
          outline: 2px solid var(--color-accent);
          outline-offset: 2px;
        }
        @media (prefers-reduced-motion: reduce) {
          .cvp-hero-cta-primary,
          .cvp-hero-cta-secondary { transition: none; }
          .cvp-hero-cta-primary:active { transform: none; }
        }

        .cvp-hero-preview {
          position: relative;
          aspect-ratio: 3 / 4;
          max-width: 360px;
          margin: 0 auto;
          width: 100%;
        }
        .cvp-hero-preview-sheet {
          position: relative;
          width: 100%;
          height: 100%;
          background: var(--color-text-primary);
          border-radius: var(--radius-md);
          border: 1px solid var(--color-border);
          padding: 28px 24px;
          box-sizing: border-box;
          overflow: hidden;
        }
      `}</style>

      <motion.div
        className="cvp-hero-content"
        style={contentMotionStyle}
        initial="hidden"
        animate="show"
      >
        <motion.h1 id="cvp-hero-h1" className="cvp-hero-h1" variants={variants} custom={0}>
          {H1}
        </motion.h1>
        <motion.p className="cvp-hero-h2" variants={variants} custom={1}>
          {H2}
        </motion.p>
        <motion.div className="cvp-hero-ctas" variants={variants} custom={2}>
          <button type="button" className="cvp-hero-cta-primary" onClick={onPrimary}>
            {PRIMARY_LABEL}
          </button>
          <a
            className="cvp-hero-cta-secondary"
            href="#show"
            onClick={onSecondary}
          >
            {SECONDARY_LABEL}
          </a>
        </motion.div>
      </motion.div>

      <motion.div
        className="cvp-hero-preview"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={reduce
          ? { duration: 0.01 }
          : { duration: 0.48, delay: 0.24, ease: [0.25, 0.46, 0.45, 0.94] }}
        aria-hidden="true"
      >
        <div className="cvp-hero-preview-sheet">
          <h3
            style={{
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: '-0.01em',
              lineHeight: 1.15,
              color: 'var(--color-surface-00)',
              margin: 0,
              fontFamily: 'inherit',
            }}
          >
            Layla Al-Hashimi
          </h3>
          <p
            style={{
              fontSize: 13,
              fontWeight: 500,
              lineHeight: 1.5,
              color: 'var(--color-surface-02)',
              margin: '8px 0 0',
              fontFamily: 'inherit',
            }}
          >
            Senior Marketing Manager · Dubai, UAE
          </p>
        </div>
      </motion.div>
    </section>
  );
}
