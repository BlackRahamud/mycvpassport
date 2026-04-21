import React, { useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

// Block 5 per spec — the closing conversion moment. Identical
// primary CTA (copy + href) as Hero, per the Stripe/Linear pattern
// of hero/final-CTA bookends.

const SUPPORTING_LINE =
  'Your CV, built to pass. Start for free — no signup required.';
const PRIMARY_LABEL = 'Try it free';
const PRIMARY_HREF = '/builder';
const SECONDARY_LABEL = 'See pricing';
const SECONDARY_HREF = '/pricing';

export default function FinalCTASection() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();

  const onPrimary = useCallback(() => { navigate(PRIMARY_HREF); }, [navigate]);
  const onSecondary = useCallback(() => { navigate(SECONDARY_HREF); }, [navigate]);

  return (
    <section className="cvp-final-cta" aria-label="Final call to action">
      <style>{`
        .cvp-final-cta {
          padding: 96px 24px 160px;
          background: var(--color-surface-00);
          color: var(--color-text-primary);
          box-sizing: border-box;
        }
        @media (max-width: 768px) {
          .cvp-final-cta { padding: 72px 20px 120px; }
        }
        .cvp-final-cta-inner {
          max-width: 720px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 32px;
        }
        .cvp-final-cta-line {
          font-size: clamp(20px, 2.4vw, 28px);
          line-height: 1.35;
          font-weight: 600;
          letter-spacing: -0.01em;
          margin: 0;
          color: var(--color-text-primary);
          font-family: inherit;
          max-width: 640px;
        }
        .cvp-final-cta-row {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          justify-content: center;
        }
        .cvp-final-cta-primary {
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
        .cvp-final-cta-primary:hover { filter: brightness(0.92); }
        .cvp-final-cta-primary:active { transform: scale(0.98) translateZ(0); }
        .cvp-final-cta-primary:focus-visible {
          outline: 2px solid var(--color-accent);
          outline-offset: 2px;
        }
        .cvp-final-cta-secondary {
          background: transparent;
          color: var(--color-text-primary);
          border: 1px solid var(--color-border);
          padding: 14px 24px;
          border-radius: var(--radius-pill);
          font-family: inherit;
          font-size: 15px;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 160ms cubic-bezier(0.25, 0.46, 0.45, 0.94),
                      border-color 160ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        .cvp-final-cta-secondary:hover {
          background: var(--color-surface-01);
          border-color: var(--color-text-secondary);
        }
        .cvp-final-cta-secondary:focus-visible {
          outline: 2px solid var(--color-accent);
          outline-offset: 2px;
        }
        @media (prefers-reduced-motion: reduce) {
          .cvp-final-cta-primary,
          .cvp-final-cta-secondary { transition: none; }
          .cvp-final-cta-primary:active { transform: none; }
        }
      `}</style>

      <motion.div
        className="cvp-final-cta-inner"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={reduce
          ? { duration: 0.01 }
          : { duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <p className="cvp-final-cta-line">{SUPPORTING_LINE}</p>
        <div className="cvp-final-cta-row">
          <button type="button" className="cvp-final-cta-primary" onClick={onPrimary}>
            {PRIMARY_LABEL}
          </button>
          <button type="button" className="cvp-final-cta-secondary" onClick={onSecondary}>
            {SECONDARY_LABEL}
          </button>
        </div>
      </motion.div>
    </section>
  );
}
