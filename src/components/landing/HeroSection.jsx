import React, { useCallback } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import HeroDualTablet from '../marketing/HeroDualTablet';

// W18 copy rewrite v2 — Founder-locked 2026-04-22 in
// /5-HANDOFF/[READY]_hero_headline_rewrite_W18.json. Do not paraphrase.
const H1 = 'Get More Interviews.';
const H2 = 'Same experience. Better CV.';
const SUB =
  "Across the Gulf and India, qualified candidates are filtered out every day — not because they're underqualified, but because their CV wasn't built to pass the system that reads it first. CVPassport fixes that.";
const PRIMARY_LABEL = 'Try it free';
const SECONDARY_LABEL = 'See how it works';
const PRIMARY_HREF = '/ats';
const TRUST_LINE_1 = 'Free to start. No signup required.';
const TRUST_LINE_2 = 'Used across UAE, India & beyond.';

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
          grid-template-columns: 1fr 1.4fr;
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
          font-size: 64px;
          font-weight: 510;
          letter-spacing: -1.408px;
          line-height: 1.0;
          margin: 0;
          color: var(--color-text-primary);
          font-family: inherit;
        }
        .cvp-hero-h2 {
          font-size: 48px;
          font-weight: 510;
          letter-spacing: -1.056px;
          line-height: 1.0;
          margin: 16px 0 0;
          color: var(--color-text-primary);
          font-family: inherit;
        }
        .cvp-hero-sub {
          font-size: 17px;
          font-weight: 400;
          letter-spacing: -0.374px;
          line-height: 1.47;
          color: var(--color-text-secondary);
          margin: 32px 0 0;
          max-width: 520px;
          font-family: inherit;
        }
        @media (max-width: 900px) {
          .cvp-hero-h1 {
            font-size: 40px;
            letter-spacing: -0.880px;
          }
          .cvp-hero-h2 {
            font-size: 32px;
            letter-spacing: -0.640px;
          }
          .cvp-hero-sub {
            font-size: 16px;
            letter-spacing: -0.176px;
            margin-left: auto;
            margin-right: auto;
          }
        }
        .cvp-hero-ctas {
          display: flex; flex-wrap: wrap; gap: 16px;
          margin-top: 32px;
        }
        @media (max-width: 900px) {
          .cvp-hero-ctas { justify-content: center; }
        }
        @media (max-width: 640px) {
          .cvp-hero-ctas { flex-direction: column; align-items: stretch; }
        }
        .cvp-hero-trust {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 24px;
        }
        .cvp-hero-trust-line {
          font-size: 14px;
          font-weight: 500;
          letter-spacing: 0;
          line-height: 1.4;
          color: var(--color-text-secondary);
          margin: 0;
          font-family: inherit;
        }
        @media (max-width: 900px) {
          .cvp-hero-trust { align-items: center; }
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

        .cvp-hero-visual {
          position: relative;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
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
        <motion.h2 className="cvp-hero-h2" variants={variants} custom={1}>
          {H2}
        </motion.h2>
        <motion.p className="cvp-hero-sub" variants={variants} custom={2}>
          {SUB}
        </motion.p>
        <motion.div className="cvp-hero-ctas" variants={variants} custom={3}>
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
        <motion.div className="cvp-hero-trust" variants={variants} custom={4}>
          <p className="cvp-hero-trust-line">{TRUST_LINE_1}</p>
          <p className="cvp-hero-trust-line">{TRUST_LINE_2}</p>
        </motion.div>
      </motion.div>

      <motion.div
        className="cvp-hero-visual"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={reduce
          ? { duration: 0.01 }
          : { duration: 0.48, delay: 0.24, ease: [0.25, 0.46, 0.45, 0.94] }}
        aria-hidden="true"
      >
        <HeroDualTablet />
      </motion.div>
    </section>
  );
}
