import React, { useCallback } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
// Hero billboard — the "CV Device Ad" animation ported verbatim from the
// Claude Design project (phone cycles CV pop-out -> iCloud Mail -> HR chat
// -> booked Apple Calendar, beside the dark CVPassport score device that
// counts to 94). One self-contained 16s-loop component.
import HeroDeviceAd from './HeroDeviceAd';
import { logEvent } from '../../lib/analytics/logEvent';

// W18 copy rewrite v2 — Founder-locked 2026-04-22 in
// /5-HANDOFF/[READY]_hero_headline_rewrite_W18.json. Do not paraphrase.
const SUB =
  "Across the Gulf and India, qualified candidates are filtered out every day — not because they're underqualified, but because their CV wasn't built to pass the system that reads it first. CVPassport fixes that.";
const PRIMARY_LABEL = 'Build my Gulf CV — free →';
const SECONDARY_LABEL = 'Score my CV';
const MICROCOPY = 'No signup. No card. Pay in AED only if you upgrade.';

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

export default function HeroSection({ user }) {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const parallaxY = useTransform(scrollY, [0, 480], [0, -20]);
  const parallaxOpacity = useTransform(scrollY, [0, 480], [1, 0.88]);
  const variants = reduce ? INSTANT : FADE_UP;

  const onPrimary = useCallback(() => {
    logEvent('homepage_cta_clicked', {
      cta_text: PRIMARY_LABEL,
      cta_section: 'hero',
      cta_destination_before: '/auth?mode=signup',
      cta_destination_after: '/builder',
      is_authenticated: !!user?.id,
    });
    navigate('/builder');
  }, [navigate, user?.id]);

  const onSecondary = useCallback(() => {
    logEvent('homepage_cta_clicked', {
      cta_text: SECONDARY_LABEL,
      cta_section: 'hero',
      cta_destination_after: '/ats',
      is_authenticated: !!user?.id,
    });
    navigate('/ats');
  }, [navigate, user?.id]);

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
        .cvp-hero-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          margin: 0 0 18px;
          border: 1px solid rgba(217,119,6,0.45);
          background: rgba(217,119,6,0.12);
          border-radius: 999px;
          color: #D97706;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.02em;
          width: max-content;
          font-family: inherit;
        }
        .cvp-hero-pill-tag {
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          font-size: 11px;
        }
        .cvp-hero-pill-dot {
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: rgba(217,119,6,0.55);
          flex-shrink: 0;
        }
        @media (max-width: 900px) {
          .cvp-hero-pill { margin-left: auto; margin-right: auto; }
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
        .cvp-hero-seo-h2 {
          font-size: 24px;
          font-weight: 400;
          letter-spacing: -0.264px;
          line-height: 1.3;
          margin: 14px 0 0;
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
          .cvp-hero-seo-h2 {
            font-size: 18px;
            letter-spacing: -0.198px;
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

        @keyframes shimmer {
          0%   { background-position: 0% center; }
          100% { background-position: 200% center; }
        }
        @keyframes headlineShimmer {
          0%   { background-position: 0% center; }
          100% { background-position: 300% center; }
        }
        .hero-headline-shimmer {
          /* Fallback: solid accent when background-clip:text is unavailable —
             intentional-looking in both themes, no gradient box. The gradient
             treatment lives entirely inside the @supports guard below. */
          color: var(--color-accent);
        }
        @supports (-webkit-background-clip: text) or (background-clip: text) {
          .hero-headline-shimmer {
            /* Token-driven gradient: near-black→amber on light, white→amber
               on dark — legible on both. */
            background: linear-gradient(90deg, var(--color-text-primary) 0%, var(--color-accent) 100%);
            background-size: 200% auto;
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: headlineShimmer 4s linear infinite;
          }
          @media (prefers-reduced-motion: reduce) {
            /* Static gradient — never reset the background shorthand here:
               background:<color> resets background-clip to border-box and
               paints a solid rectangle over the (transparent-fill) text. */
            .hero-headline-shimmer { animation: none; }
          }
        }
        .cvp-hero-uae-line {
          font-size: 13px;
          color: var(--color-text-secondary);
          text-align: center;
          margin: 12px 0 20px;
          line-height: 1.4;
          font-family: inherit;
        }
        @media (min-width: 640px) {
          .cvp-hero-uae-line {
            white-space: nowrap;
          }
        }
        .cvp-hero-uae-percent {
          font-weight: 800;
          font-size: 16px;
          color: var(--color-accent);
          text-shadow: none;
        }
        @supports (-webkit-background-clip: text) or (background-clip: text) {
          .cvp-hero-uae-percent {
            background: linear-gradient(90deg, var(--color-text-primary) 0%, var(--color-accent) 100%);
            background-size: 200% auto;
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
            animation: shimmer 3s linear infinite;
          }
          @media (prefers-reduced-motion: reduce) {
            .cvp-hero-uae-percent { animation: none; }
          }
        }

        .cvp-hero-trustbar {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-wrap: wrap;
          gap: 20px;
          padding: 14px 20px;
          background: var(--color-surface-01);
          border-top: 1px solid var(--color-border);
          border-bottom: 1px solid var(--color-border);
          margin-top: 20px;
        }
        .cvp-hero-trustbar-item {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          color: var(--color-text-secondary);
          line-height: 1.2;
          font-family: inherit;
        }
        .cvp-hero-trustbar-dot {
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: var(--color-border-strong);
          flex-shrink: 0;
        }
        .cvp-hero-trustbar-strong {
          color: var(--color-text-primary);
          font-weight: 600;
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
          color: var(--accent-contrast);
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

        .cvp-hero-cta-microcopy {
          font-size: 13px;
          font-weight: 400;
          line-height: 1.4;
          color: var(--color-text-secondary);
          margin: 12px 0 0;
          font-family: inherit;
        }
        @media (max-width: 900px) {
          .cvp-hero-cta-microcopy { text-align: center; }
        }

        .cvp-hero-visual {
          position: relative;
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 600px;
        }
        .cvp-hero-visual::before {
          content: "";
          position: absolute; inset: 0;
          background: radial-gradient(ellipse at center, rgba(217,119,6,0.10) 0%, transparent 60%);
          filter: blur(60px);
          pointer-events: none;
          z-index: 0;
        }
        @media (max-width: 900px) {
          .cvp-hero-visual { min-height: 540px; }
        }
        @media (max-width: 600px) {
          .cvp-hero-visual {
            flex-direction: column;
            min-height: auto;
            gap: 20px;
            padding: 20px 0;
          }
        }
      `}</style>

      <motion.div
        className="cvp-hero-content"
        style={contentMotionStyle}
        initial="hidden"
        animate="show"
      >
        <motion.div className="cvp-hero-pill" variants={variants} custom={0} aria-label="New: AI-powered summary rewrites">
          <span aria-hidden="true">✨</span>
          <span className="cvp-hero-pill-tag">New</span>
          <span className="cvp-hero-pill-dot" aria-hidden="true" />
          <span>AI-powered summary rewrites</span>
        </motion.div>
        <motion.h1 id="cvp-hero-h1" className="cvp-hero-h1" variants={variants} custom={0}>
          Get More <span className="hero-headline-shimmer">Interviews.</span>
        </motion.h1>
        <motion.h2 className="cvp-hero-seo-h2" variants={variants} custom={1}>
          Build ATS-Friendly CVs for UAE, Gulf &amp; India Jobs
        </motion.h2>
        <motion.p className="cvp-hero-sub" variants={variants} custom={3}>
          {SUB}
        </motion.p>
        <motion.p className="cvp-hero-uae-line" variants={variants} custom={4}>
          ✦ <span className="cvp-hero-uae-percent">67%</span> of our users are UAE-based — built for this market, not adapted for it
        </motion.p>
        <motion.div className="cvp-hero-ctas" variants={variants} custom={5}>
          <button type="button" className="cvp-hero-cta-primary" onClick={onPrimary}>
            {PRIMARY_LABEL}
          </button>
          <button type="button" className="cvp-hero-cta-secondary" onClick={onSecondary}>
            {SECONDARY_LABEL}
          </button>
        </motion.div>
        <motion.p className="cvp-hero-cta-microcopy" variants={variants} custom={5}>
          {MICROCOPY}
        </motion.p>
        <motion.div className="cvp-hero-trustbar" variants={variants} custom={6}>
          <div className="cvp-hero-trustbar-item">
            <svg width="72" height="14" viewBox="0 0 72 14" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <defs>
                <filter id="sglow">
                  <feGaussianBlur stdDeviation="1.2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <g filter="url(#sglow)">
                <path d="M6.5 0.5l1.6 4H13l-3.5 2.6 1.3 4.1L6.5 9l-4.3 2.2 1.3-4.1L0 4.5h4.9z" fill="#FFD700" />
                <path d="M6.5 0.5l1.6 4H13l-3.5 2.6 1.3 4.1L6.5 9l-4.3 2.2 1.3-4.1L0 4.5h4.9z" fill="#FFD700" transform="translate(15,0)" />
                <path d="M6.5 0.5l1.6 4H13l-3.5 2.6 1.3 4.1L6.5 9l-4.3 2.2 1.3-4.1L0 4.5h4.9z" fill="#FFD700" transform="translate(30,0)" />
                <path d="M6.5 0.5l1.6 4H13l-3.5 2.6 1.3 4.1L6.5 9l-4.3 2.2 1.3-4.1L0 4.5h4.9z" fill="#FFD700" transform="translate(45,0)" />
                <path d="M6.5 0.5l1.6 4H13l-3.5 2.6 1.3 4.1L6.5 9l-4.3 2.2 1.3-4.1L0 4.5h4.9z" fill="#FFD700" transform="translate(60,0)" />
              </g>
            </svg>
            <span className="cvp-hero-trustbar-strong">4.8</span>
            <span>&nbsp;from early users</span>
          </div>
          <span className="cvp-hero-trustbar-dot" aria-hidden="true" />
          <div className="cvp-hero-trustbar-item">
            <span aria-hidden="true">🇦🇪</span>
            <span className="cvp-hero-trustbar-strong">67%</span>
            <span>&nbsp;UAE-based users</span>
          </div>
          <span className="cvp-hero-trustbar-dot" aria-hidden="true" />
          <div className="cvp-hero-trustbar-item">
            <span>✓ Free to start. </span>
            <span className="cvp-hero-trustbar-strong">No card required.</span>
          </div>
          <span className="cvp-hero-trustbar-dot" aria-hidden="true" />
          <div className="cvp-hero-trustbar-item">
            <svg width="14" height="16" viewBox="0 0 14 16" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <defs>
                <filter id="shglow">
                  <feGaussianBlur stdDeviation="1.2" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <g filter="url(#shglow)">
                <path d="M7 1L1.5 3.5V8c0 3 2.5 5.5 5.5 6.5C9 13.5 12.5 11 12.5 8V3.5L7 1z" stroke="currentColor" strokeWidth="1.2" fill="none" />
                <path d="M4.5 8l2 2 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" fill="none" />
              </g>
            </svg>
            <span className="cvp-hero-trustbar-strong">ATS-optimised</span>
            <span>&nbsp;for Gulf recruiters</span>
          </div>
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
        {/* CV Device Ad — the phone journey (CV pop-out → iCloud Mail →
            HR chat → booked Apple Calendar) beside the dark score device
            counting to 94. Ported verbatim from the Claude Design file. */}
        <HeroDeviceAd />
      </motion.div>
    </section>
  );
}
