import React, { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPlanPreview } from '../../config/planPreview';
import { useGeoContent } from '../../hooks/useGeoContent';

/*
 * Homepage pricing PREVIEW. It is a shorter teaser than /pricing, but it reads
 * the SAME live data (getPlanPreview → tierConfig prices + shared names) and
 * uses candidate theme tokens throughout, so:
 *   - prices are live (no hardcoded "AED 29" — tierConfig is the source),
 *   - names match /pricing exactly,
 *   - text is readable in BOTH themes (the old card was a hardcoded #141414
 *     dark island, so day-mode prices rendered dark-on-dark and vanished).
 * Full detail + CTAs live on /pricing via "See all plans".
 */
export default function PricingAnchorSection() {
  const navigate = useNavigate();
  const geo = useGeoContent();
  const currency = geo.currency === '₹' ? 'INR' : 'AED';
  const plans = getPlanPreview(currency);
  const onSeeAll = useCallback(() => { navigate('/pricing'); }, [navigate]);

  return (
    <section className="cvp-pricing-anchor" aria-label="Pricing">
      <style>{`
        .cvp-pricing-anchor {
          padding: 96px 24px;
          background: var(--bg);
          color: var(--text-primary);
          box-sizing: border-box;
        }
        @media (max-width: 768px) { .cvp-pricing-anchor { padding: 72px 20px; } }
        .cvp-pricing-anchor-inner { max-width: 1120px; margin: 0 auto; }
        .cvp-pricing-anchor-header { text-align: center; margin: 0 auto 48px; max-width: 640px; }
        .cvp-pricing-anchor-title {
          font-size: 44px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.02;
          color: var(--text-primary); margin: 0; font-family: inherit;
        }
        .cvp-pricing-anchor-sub {
          font-size: 17px; font-weight: 400; letter-spacing: -0.01em; line-height: 1.47;
          color: var(--text-secondary); margin: 14px auto 0; max-width: 540px; font-family: inherit;
        }
        @media (max-width: 900px) {
          .cvp-pricing-anchor-title { font-size: 30px; letter-spacing: -0.015em; }
          .cvp-pricing-anchor-sub { font-size: 16px; }
        }
        .cvp-pricing-anchor-grid {
          display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; align-items: stretch;
        }
        @media (max-width: 980px) { .cvp-pricing-anchor-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 560px) { .cvp-pricing-anchor-grid { grid-template-columns: 1fr; } }
        .cvp-pricing-anchor-card {
          position: relative;
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 22px 20px;
          display: flex; flex-direction: column; gap: 8px;
          font-family: inherit; box-sizing: border-box;
        }
        /* Hero (Active Hunter) — amber border + soft amber glow, matching the
           /pricing hero language. box-shadow amber, never drop-shadow. */
        .cvp-pricing-anchor-card.is-hero {
          background: var(--bg-elevated);
          border-color: rgba(217, 119, 6, 0.42);
          box-shadow: 0 0 0 1px rgba(217,119,6,0.10), 0 0 60px -28px rgba(217,119,6,0.34);
        }
        .cvp-pricing-anchor-badge {
          position: absolute; top: -10px; left: 20px;
          background: var(--accent); color: var(--accent-contrast);
          font-size: 9.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
          padding: 4px 9px; border-radius: 999px; font-family: inherit; line-height: 1.2;
        }
        .cvp-pricing-anchor-name {
          font-size: 13px; font-weight: 700; color: var(--text-primary);
          margin: 0; letter-spacing: 0.01em; font-family: inherit;
        }
        .cvp-pricing-anchor-price {
          font-size: 30px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.1;
          color: var(--text-primary); margin: 2px 0 0; font-family: inherit;
          font-variant-numeric: tabular-nums;
        }
        .cvp-pricing-anchor-period { font-size: 12.5px; color: var(--text-secondary); margin: 0; font-family: inherit; }
        .cvp-pricing-anchor-tagline {
          font-size: 13px; line-height: 1.45; color: var(--text-secondary);
          margin: 10px 0 0; padding-top: 12px; border-top: 1px solid var(--border); font-family: inherit;
        }
        .is-hero .cvp-pricing-anchor-tagline { color: var(--accent-text); font-weight: 500; }
        .cvp-pricing-anchor-footer {
          display: flex; flex-direction: column; align-items: center; gap: 12px; margin-top: 40px;
        }
        .cvp-pricing-anchor-cta {
          background: var(--accent); color: var(--accent-contrast);
          border: none; padding: 14px 28px; border-radius: 999px;
          font-family: inherit; font-size: 15px; font-weight: 700; cursor: pointer;
          transition: filter 160ms cubic-bezier(0.4,0,0.2,1), transform 160ms cubic-bezier(0.4,0,0.2,1);
        }
        .cvp-pricing-anchor-cta:hover { filter: brightness(1.05); }
        .cvp-pricing-anchor-cta:active { transform: scale(0.98); }
        .cvp-pricing-anchor-cta:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) {
          .cvp-pricing-anchor-cta { transition: none; }
          .cvp-pricing-anchor-cta:active { transform: none; }
        }
        .cvp-pricing-anchor-foot-note {
          font-size: 13px; color: var(--text-secondary); margin: 0; font-family: inherit; text-align: center;
        }
      `}</style>

      <div className="cvp-pricing-anchor-inner">
        <header className="cvp-pricing-anchor-header">
          <h2 className="cvp-pricing-anchor-title">Simple pricing. Start free.</h2>
          <p className="cvp-pricing-anchor-sub">No credit card required to get started. Upgrade only when you’re ready.</p>
        </header>

        <div className="cvp-pricing-anchor-grid">
          {plans.map((plan) => {
            const isHero = plan.role === 'hero';
            return (
              <article
                key={plan.slug}
                className={`cvp-pricing-anchor-card${isHero ? ' is-hero' : ''}`}
              >
                {isHero && <span className="cvp-pricing-anchor-badge">Most chosen</span>}
                <p className="cvp-pricing-anchor-name">{plan.name}</p>
                <p className="cvp-pricing-anchor-price">{plan.priceLabel}</p>
                <p className="cvp-pricing-anchor-period">{plan.period}</p>
                <p className="cvp-pricing-anchor-tagline">{plan.tagline}</p>
              </article>
            );
          })}
        </div>

        <div className="cvp-pricing-anchor-footer">
          <button type="button" className="cvp-pricing-anchor-cta" onClick={onSeeAll}>
            See all plans →
          </button>
          <p className="cvp-pricing-anchor-foot-note">
            Secured by Ziina. One-time and pass options, no hidden fees.
          </p>
        </div>
      </div>
    </section>
  );
}
