import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const PLANS = [
  {
    id: 'explorer',
    name: 'Explorer',
    price: 'Free',
    subtitle: 'Always free',
    description: 'Basic templates + ATS checker',
    highlighted: false,
  },
  {
    id: 'active-hunter',
    name: 'Active Hunter',
    price: 'AED 29/mo',
    subtitle: 'Best for active job seekers',
    description: 'Full ATS Pro + unlimited downloads',
    highlighted: true,
    badge: 'MOST POPULAR',
  },
  {
    id: 'career-pro',
    name: 'Career Pro',
    price: 'AED 199/yr',
    subtitle: 'Full year, maximum results',
    description: 'Everything included',
    highlighted: false,
  },
];

export default function PricingAnchorSection() {
  const navigate = useNavigate();
  const onSeeAll = useCallback(() => { navigate('/pricing'); }, [navigate]);

  return (
    <section className="cvp-pricing-anchor" aria-label="Pricing">
      <style>{`
        .cvp-pricing-anchor {
          padding: 96px 24px;
          background: var(--color-surface-00);
          color: var(--color-text-primary);
          box-sizing: border-box;
        }
        @media (max-width: 768px) {
          .cvp-pricing-anchor { padding: 72px 20px; }
        }
        .cvp-pricing-anchor-inner {
          max-width: 1100px;
          margin: 0 auto;
        }
        .cvp-pricing-anchor-header {
          text-align: center;
          margin: 0 auto 48px;
          max-width: 640px;
        }
        .cvp-pricing-anchor-title {
          font-size: 48px;
          font-weight: 510;
          letter-spacing: -1.056px;
          line-height: 1.0;
          color: var(--color-text-primary);
          margin: 0;
          font-family: inherit;
        }
        .cvp-pricing-anchor-sub {
          font-size: 17px;
          font-weight: 400;
          letter-spacing: -0.374px;
          line-height: 1.47;
          color: var(--color-text-secondary);
          margin: 16px auto 0;
          max-width: 520px;
          font-family: inherit;
        }
        @media (max-width: 900px) {
          .cvp-pricing-anchor-title {
            font-size: 32px;
            letter-spacing: -0.640px;
          }
          .cvp-pricing-anchor-sub {
            font-size: 16px;
            letter-spacing: -0.176px;
          }
        }
        .cvp-pricing-anchor-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          align-items: stretch;
        }
        @media (max-width: 900px) {
          .cvp-pricing-anchor-grid { grid-template-columns: 1fr; gap: 16px; }
        }
        .cvp-pricing-anchor-card {
          position: relative;
          background: #141414;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          font-family: inherit;
          box-sizing: border-box;
        }
        .cvp-pricing-anchor-card.is-highlighted {
          border-color: #D4860A;
        }
        .cvp-pricing-anchor-badge {
          position: absolute;
          top: -10px;
          left: 24px;
          background: #D4860A;
          color: #000000;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          padding: 4px 10px;
          border-radius: 999px;
          font-family: inherit;
          line-height: 1.2;
        }
        .cvp-pricing-anchor-name {
          font-size: 14px;
          font-weight: 700;
          color: #FFFFFF;
          margin: 0;
          letter-spacing: -0.01em;
          font-family: inherit;
        }
        .cvp-pricing-anchor-price {
          font-size: 32px;
          font-weight: 700;
          letter-spacing: -0.640px;
          line-height: 1.1;
          color: var(--color-text-primary);
          margin: 0;
          font-family: inherit;
        }
        .cvp-pricing-anchor-subtitle {
          font-size: 13px;
          color: var(--color-text-secondary);
          margin: 0;
          font-family: inherit;
        }
        .cvp-pricing-anchor-desc {
          font-size: 14px;
          line-height: 1.5;
          color: var(--color-text-secondary);
          margin: 0;
          padding-top: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          font-family: inherit;
        }
        .cvp-pricing-anchor-footer {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          margin-top: 40px;
        }
        .cvp-pricing-anchor-cta {
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
        .cvp-pricing-anchor-cta:hover { filter: brightness(0.92); }
        .cvp-pricing-anchor-cta:active { transform: scale(0.98) translateZ(0); }
        .cvp-pricing-anchor-cta:focus-visible {
          outline: 2px solid var(--color-accent);
          outline-offset: 2px;
        }
        @media (prefers-reduced-motion: reduce) {
          .cvp-pricing-anchor-cta { transition: none; }
          .cvp-pricing-anchor-cta:active { transform: none; }
        }
        .cvp-pricing-anchor-foot-note {
          font-size: 13px;
          color: var(--color-text-secondary);
          margin: 0;
          font-family: inherit;
          text-align: center;
        }
      `}</style>

      <div className="cvp-pricing-anchor-inner">
        <header className="cvp-pricing-anchor-header">
          <h2 className="cvp-pricing-anchor-title">Simple pricing. Start free.</h2>
          <p className="cvp-pricing-anchor-sub">No credit card required to get started.</p>
        </header>

        <div className="cvp-pricing-anchor-grid">
          {PLANS.map((plan) => (
            <article
              key={plan.id}
              className={`cvp-pricing-anchor-card${plan.highlighted ? ' is-highlighted' : ''}`}
            >
              {plan.badge && (
                <span className="cvp-pricing-anchor-badge">{plan.badge}</span>
              )}
              <p className="cvp-pricing-anchor-name">{plan.name}</p>
              <p className="cvp-pricing-anchor-price">{plan.price}</p>
              <p className="cvp-pricing-anchor-subtitle">{plan.subtitle}</p>
              <p className="cvp-pricing-anchor-desc">{plan.description}</p>
            </article>
          ))}
        </div>

        <div className="cvp-pricing-anchor-footer">
          <button
            type="button"
            className="cvp-pricing-anchor-cta"
            onClick={onSeeAll}
          >
            See all plans →
          </button>
          <p className="cvp-pricing-anchor-foot-note">
            Express Pass — AED 49 one-time lifetime access also available
          </p>
        </div>
      </div>
    </section>
  );
}
