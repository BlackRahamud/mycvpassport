import React from 'react';
import { useNavigate } from 'react-router-dom';
import CardHoverLift from '../motion/CardHoverLift';

// Single feature card. Wraps its surface in CardHoverLift with the
// matching variant so the lift + scale + border-tint motion is
// owned by the atom, not the card. Border-colour hover transition
// is keyed off the atom's [data-card-hover-lift] attribute.
//
// Props:
//   variant  : 'default' | 'primary' — passed straight to CardHoverLift
//   title    : string
//   tagline  : string
//   badge    : string | undefined — shown only on the primary card
//   href     : string — route to navigate on CTA click (verified in App.js)
//   ctaLabel : string

export default function FeatureCard({
  variant = 'default',
  title,
  tagline,
  badge,
  href,
  ctaLabel,
}) {
  const navigate = useNavigate();
  const onCta = (e) => {
    e.stopPropagation();
    if (href) navigate(href);
  };

  return (
    <>
      <style>{`
        .cvp-feature-card-wrap { display: block; width: 100%; height: 100%; }
        .cvp-feature-card {
          background: var(--color-surface-01);
          border: 1px solid color-mix(in srgb, var(--color-border), transparent 85%);
          border-radius: var(--radius-md);
          padding: 24px;
          min-height: 280px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          color: var(--color-text-primary);
          font-family: inherit;
          box-sizing: border-box;
          transition: border-color 160ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        [data-card-hover-lift="default"]:hover .cvp-feature-card {
          border-color: color-mix(in srgb, var(--color-border), transparent 60%);
        }
        [data-card-hover-lift="primary"]:hover .cvp-feature-card {
          border-color: color-mix(in srgb, var(--color-accent), transparent 45%);
        }
        @media (prefers-reduced-motion: reduce) {
          .cvp-feature-card { transition: border-color 10ms linear; }
        }

        .cvp-feature-card-badge {
          align-self: flex-start;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--color-accent);
          background: color-mix(in srgb, var(--color-accent), transparent 88%);
          padding: 4px 10px;
          border-radius: var(--radius-pill);
          font-family: inherit;
        }
        .cvp-feature-card-title {
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -0.01em;
          line-height: 1.2;
          margin: 0;
          color: var(--color-text-primary);
          font-family: inherit;
        }
        .cvp-feature-card-tagline {
          font-size: 14px;
          line-height: 1.55;
          margin: 0;
          color: var(--color-text-secondary);
          font-family: inherit;
        }
        .cvp-feature-card-cta-row { margin-top: auto; padding-top: 16px; }

        .cvp-feature-card-cta {
          display: inline-flex;
          align-items: center;
          background: transparent;
          border: 1px solid var(--color-border);
          color: var(--color-text-primary);
          padding: 10px 20px;
          border-radius: var(--radius-pill);
          font-family: inherit;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          text-decoration: none;
          transition: background-color 160ms cubic-bezier(0.25, 0.46, 0.45, 0.94),
                      border-color 160ms cubic-bezier(0.25, 0.46, 0.45, 0.94),
                      filter 160ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        .cvp-feature-card-cta:hover {
          background: var(--color-surface-00);
          border-color: var(--color-text-secondary);
        }
        .cvp-feature-card-cta:focus-visible {
          outline: 2px solid var(--color-accent);
          outline-offset: 2px;
        }
        /* Primary variant CTA — amber fill (the one-amber-per-fold call). */
        [data-card-hover-lift="primary"] .cvp-feature-card-cta {
          background: var(--color-accent);
          border-color: var(--color-accent);
          color: var(--color-surface-00);
          font-weight: 600;
        }
        [data-card-hover-lift="primary"] .cvp-feature-card-cta:hover {
          background: var(--color-accent);
          border-color: var(--color-accent);
          filter: brightness(0.92);
        }
        @media (prefers-reduced-motion: reduce) {
          .cvp-feature-card-cta { transition: none; }
        }
      `}</style>
      <CardHoverLift variant={variant} className="cvp-feature-card-wrap">
        <div className="cvp-feature-card">
          {badge && <span className="cvp-feature-card-badge">{badge}</span>}
          <h3 className="cvp-feature-card-title">{title}</h3>
          <p className="cvp-feature-card-tagline">{tagline}</p>
          <div className="cvp-feature-card-cta-row">
            <button
              type="button"
              className="cvp-feature-card-cta"
              onClick={onCta}
              aria-label={`${ctaLabel} — opens ${href}`}
            >
              {ctaLabel}
            </button>
          </div>
        </div>
      </CardHoverLift>
    </>
  );
}
