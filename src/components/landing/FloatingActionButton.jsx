import React, { useEffect, useState, useCallback } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

/**
 * FloatingActionButton — persistent CTA, bottom-right.
 *
 * Visual identity is shared with the HowItWorksSection's "Start now" button
 * so the section and the FAB feel like one gesture. When HowItWorks scrolls
 * into view, this component listens for a custom event ('cvp-fab-pulse') and
 * fires its halo + bounce, drawing the eye from Step 03 toward the FAB.
 *
 * Props:
 *   href  : default '/builder'
 *   label : default 'Start free →'
 */

const DEFAULT_HREF = '/builder';
const DEFAULT_LABEL = 'Start free';

export default function FloatingActionButton({
  href = DEFAULT_HREF,
  label = DEFAULT_LABEL,
} = {}) {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const [pulsing, setPulsing] = useState(false);
  const [revealed, setRevealed] = useState(false);

  // Reveal after first scroll past hero, ~520px
  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > 320) setRevealed(true);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Listen for the HowItWorks "in view" trigger
  useEffect(() => {
    const onPulse = () => {
      setPulsing(true);
      // Pulse for ~3.6s then settle
      const t = setTimeout(() => setPulsing(false), 3600);
      return () => clearTimeout(t);
    };
    window.addEventListener('cvp-fab-pulse', onPulse);
    return () => window.removeEventListener('cvp-fab-pulse', onPulse);
  }, []);

  const onClick = useCallback(() => {
    navigate(href);
  }, [navigate, href]);

  return (
    <>
      <style>{`
        .cvp-fab {
          position: fixed;
          right: clamp(16px, 2.4vw, 28px);
          bottom: clamp(16px, 2.4vw, 28px);
          z-index: 60;
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 14px 22px 14px 18px;
          background: var(--color-accent, #D97706);
          color: var(--color-surface-00, #0a0a0a);
          border: 0;
          border-radius: var(--radius-pill, 999px);
          font-family: inherit;
          font-size: 14.5px;
          font-weight: 600;
          letter-spacing: -0.005em;
          cursor: pointer;
          box-shadow:
            0 0 0 1px rgba(245, 158, 11, 0.35),
            0 12px 32px -8px rgba(217, 119, 6, 0.55),
            0 2px 6px rgba(0, 0, 0, 0.3);
          transition:
            transform 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94),
            filter 160ms cubic-bezier(0.25, 0.46, 0.45, 0.94),
            box-shadow 220ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
          will-change: transform;
        }
        .cvp-fab:hover {
          filter: brightness(0.95);
          box-shadow:
            0 0 0 1px rgba(245, 158, 11, 0.55),
            0 16px 40px -8px rgba(217, 119, 6, 0.7),
            0 2px 6px rgba(0, 0, 0, 0.3);
        }
        .cvp-fab:active { transform: scale(0.97); }
        .cvp-fab:focus-visible {
          outline: 2px solid var(--color-accent, #D97706);
          outline-offset: 3px;
        }
        .cvp-fab-spark {
          width: 18px; height: 18px; display: grid; place-items: center;
          background: rgba(0, 0, 0, 0.18);
          border-radius: 50%;
          flex-shrink: 0;
        }
        .cvp-fab-arrow {
          font-size: 16px;
          line-height: 1;
          transition: transform 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        .cvp-fab:hover .cvp-fab-arrow { transform: translateX(3px); }

        /* Halo — multiple expanding rings during pulse window */
        .cvp-fab-halo,
        .cvp-fab-halo2 {
          position: absolute;
          inset: -6px;
          border-radius: 999px;
          border: 1.5px solid rgba(245, 158, 11, 0.55);
          opacity: 0;
          pointer-events: none;
        }
        .cvp-fab.is-pulsing .cvp-fab-halo {
          animation: cvp-fab-halo 1.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite;
        }
        .cvp-fab.is-pulsing .cvp-fab-halo2 {
          animation: cvp-fab-halo 1.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite;
          animation-delay: 0.5s;
        }
        @keyframes cvp-fab-halo {
          0%   { opacity: 0; transform: scale(0.92); }
          40%  { opacity: 0.85; }
          100% { opacity: 0; transform: scale(1.5); }
        }
        .cvp-fab.is-pulsing {
          animation: cvp-fab-bounce 1.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite;
        }
        @keyframes cvp-fab-bounce {
          0%, 100% { transform: translateY(0); }
          50%      { transform: translateY(-3px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .cvp-fab.is-pulsing,
          .cvp-fab.is-pulsing .cvp-fab-halo,
          .cvp-fab.is-pulsing .cvp-fab-halo2 { animation: none; }
          .cvp-fab { transition: none; }
        }
        @media (max-width: 520px) {
          .cvp-fab {
            padding: 12px 18px 12px 14px;
            font-size: 13.5px;
          }
        }
      `}</style>
      <motion.button
        type="button"
        className={`cvp-fab${pulsing ? ' is-pulsing' : ''}`}
        onClick={onClick}
        aria-label={`${label} — open the CV builder`}
        data-cvp-fab="true"
        initial={reduce ? false : { opacity: 0, y: 24, scale: 0.9 }}
        animate={revealed
          ? { opacity: 1, y: 0, scale: 1 }
          : (reduce ? { opacity: 1 } : { opacity: 0, y: 24, scale: 0.9 })
        }
        transition={{ duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <span className="cvp-fab-halo" aria-hidden="true" />
        <span className="cvp-fab-halo2" aria-hidden="true" />
        <span className="cvp-fab-spark" aria-hidden="true">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M5 0.5L6.1 3.9L9.5 5L6.1 6.1L5 9.5L3.9 6.1L0.5 5L3.9 3.9L5 0.5Z" fill="currentColor" />
          </svg>
        </span>
        <span>{label}</span>
        <span className="cvp-fab-arrow" aria-hidden="true">→</span>
      </motion.button>
    </>
  );
}
