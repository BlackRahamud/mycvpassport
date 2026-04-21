import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

// Block 2 per spec — a 6-second silent looping recording of the
// product in motion. NOT interactive. NOT an embedded demo.
// Section id="show" is the smooth-scroll target for the Hero's
// "See how it works" secondary CTA.

const CAPTION = 'The reader sees the original CV. The ATS sees this.';

// TODO: replace with real asset — placeholder 404s until
// /video/ghostchip-loop.mp4 and /video/ghostchip-loop-poster.png
// are supplied by the Founder / Cowork asset drop.
const VIDEO_SRC = '/video/ghostchip-loop.mp4';
const VIDEO_POSTER = '/video/ghostchip-loop-poster.png';

export default function ShowSection() {
  const reduce = useReducedMotion();

  return (
    <section id="show" className="cvp-show" aria-label="Product demo">
      <style>{`
        .cvp-show {
          padding: 120px 24px;
          background: var(--color-surface-00);
          color: var(--color-text-primary);
          box-sizing: border-box;
        }
        @media (max-width: 768px) {
          .cvp-show { padding: 72px 0; }
        }
        .cvp-show-inner {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
          align-items: center;
        }
        .cvp-show-video-wrap {
          position: relative;
          width: 100%;
          aspect-ratio: 16 / 9;
          border-radius: var(--radius-md);
          overflow: hidden;
          border: 1px solid var(--color-border);
          background: var(--color-surface-01);
        }
        @media (max-width: 768px) {
          .cvp-show-video-wrap { border-radius: 0; border-left: none; border-right: none; }
        }
        .cvp-show-video {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }
        .cvp-show-caption {
          font-size: 14px;
          line-height: 1.5;
          color: var(--color-text-secondary);
          text-align: center;
          margin: 0;
          max-width: 640px;
          padding: 0 20px;
          font-family: inherit;
        }
      `}</style>

      <div className="cvp-show-inner">
        <motion.div
          className="cvp-show-video-wrap"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={reduce
            ? { duration: 0.01 }
            : { duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] }}
        >
          {/* TODO: replace with real asset — placeholder 404s until /video/ghostchip-loop.mp4 is supplied */}
          <video
            className="cvp-show-video"
            src={VIDEO_SRC}
            poster={VIDEO_POSTER}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-label="GhostChip transforming a CV for ATS"
          />
        </motion.div>
        <p className="cvp-show-caption">{CAPTION}</p>
      </div>
    </section>
  );
}
