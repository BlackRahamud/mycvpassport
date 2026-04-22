import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';

// Block 4 per spec — signed statement from the Founder. NOT a
// customer testimonial. The note text is treated as editable draft
// copy (Founder may rewrite before the PR merges); shipping as-is.

const AVATAR_SRC = '/img/founder-jacky.jpg';
const INITIALS = 'J';
const NAME = 'JMK';
const TITLE = 'Founder, CVPassport';
const LOCATION = 'Dubai';
const NOTE =
  "I built GhostChip because I watched too many good CVs get filtered out by a robot that couldn't see past a missing keyword. Your story deserves to reach a human. This is the tool that gets it there. — JMK";

export default function FoundersNoteSection() {
  const reduce = useReducedMotion();
  const [avatarFailed, setAvatarFailed] = useState(false);

  return (
    <section className="cvp-founders-note" aria-label="Founder's note">
      <style>{`
        .cvp-founders-note {
          padding: 120px 24px;
          background: var(--color-surface-00);
          color: var(--color-text-primary);
          box-sizing: border-box;
        }
        @media (max-width: 768px) {
          .cvp-founders-note { padding: 72px 20px; }
        }
        .cvp-founders-note-inner {
          max-width: 720px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 16px;
        }
        .cvp-founders-note-avatar {
          width: 64px;
          height: 64px;
          border-radius: var(--radius-pill);
          object-fit: cover;
          display: block;
          border: 1px solid var(--color-border);
        }
        .cvp-founders-note-avatar-fallback {
          width: 64px;
          height: 64px;
          border-radius: var(--radius-pill);
          background: var(--color-surface-02);
          color: var(--color-text-primary);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 22px;
          font-weight: 600;
          letter-spacing: -0.01em;
          font-family: inherit;
          border: 1px solid var(--color-border);
        }
        .cvp-founders-note-name {
          font-size: 16px;
          font-weight: 600;
          margin: 0;
          color: var(--color-text-secondary);
          font-family: inherit;
        }
        .cvp-founders-note-title-line {
          font-size: 13px;
          margin: 0;
          color: var(--color-text-secondary);
          font-family: inherit;
        }
        .cvp-founders-note-text {
          font-size: 24px;
          line-height: 32px;
          font-style: italic;
          margin: 24px 0 0;
          color: var(--color-text-primary);
          font-family: inherit;
          max-width: 640px;
        }
        @media (max-width: 768px) {
          .cvp-founders-note-text {
            font-size: 20px;
            line-height: 28px;
          }
        }
      `}</style>

      <motion.div
        className="cvp-founders-note-inner"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={reduce
          ? { duration: 0.01 }
          : { duration: 0.24, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        {avatarFailed ? (
          <span className="cvp-founders-note-avatar-fallback" aria-hidden="true">
            {INITIALS}
          </span>
        ) : (
          <img
            className="cvp-founders-note-avatar"
            src={AVATAR_SRC}
            alt={`${NAME}, ${TITLE}`}
            width="64"
            height="64"
            onError={() => setAvatarFailed(true)}
          />
        )}
        <p className="cvp-founders-note-name">{NAME}</p>
        <p className="cvp-founders-note-title-line">{TITLE} · {LOCATION}</p>
        <p className="cvp-founders-note-text">{NOTE}</p>
      </motion.div>
    </section>
  );
}
