import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import FeatureCard from './FeatureCard';

/* ── Per-card floating widgets ─────────────────────────────────
   Each widget is rendered directly inside the card flex column —
   no wrapper box, no nested card. Widget-specific CSS lives in
   this file's <style> block so FeatureCard stays generic.
────────────────────────────────────────────────────────────────*/

function AtsWidget() {
  return (
    <>
      <div className="fcw-ats-head">
        <span className="fcw-ats-score">42</span>
        <span className="fcw-ats-slash">/100</span>
        <span className="fcw-ats-pill">LIKELY REJECTED</span>
      </div>
      <div className="fcw-bars">
        <div className="fcw-bar-row">
          <div className="fcw-bar-label"><span>Keywords matched</span><span>3/14</span></div>
          <div className="fcw-bar-track"><div className="fcw-bar-fill fcw-bar-fill--red" style={{ width: '21%' }} /></div>
        </div>
        <div className="fcw-bar-row">
          <div className="fcw-bar-label"><span>Format score</span><span>61%</span></div>
          <div className="fcw-bar-track"><div className="fcw-bar-fill fcw-bar-fill--amber" style={{ width: '61%' }} /></div>
        </div>
        <div className="fcw-bar-row">
          <div className="fcw-bar-label"><span>Section order</span><span>89%</span></div>
          <div className="fcw-bar-track"><div className="fcw-bar-fill fcw-bar-fill--green" style={{ width: '89%' }} /></div>
        </div>
      </div>
    </>
  );
}

function SalaryWidget() {
  const ROWS = [
    { flag: '🇦🇪', city: 'Dubai',  amount: 'AED 18,000', tag: 'Base', tone: 'green' },
    { flag: '🇸🇦', city: 'Riyadh', amount: 'SAR 17,200', tag: '+4%',  tone: 'green' },
    { flag: '🇮🇳', city: 'Mumbai', amount: '₹3.2L/mo',   tag: '-18%', tone: 'red'   },
  ];
  return (
    <div className="fcw-salary">
      {ROWS.map((r) => (
        <div key={r.city} className="fcw-salary-row">
          <span className="fcw-salary-flag" aria-hidden="true">{r.flag}</span>
          <span className="fcw-salary-city">{r.city}</span>
          <span className="fcw-salary-amount">{r.amount}</span>
          <span className={`fcw-salary-tag fcw-salary-tag--${r.tone}`}>{r.tag}</span>
        </div>
      ))}
    </div>
  );
}

function LinkedInWidget() {
  return (
    <>
      <div className="fcw-li-head">
        <span className="fcw-li-score">68%</span>
        <div className="fcw-li-meta">
          <span className="fcw-li-label">Profile score</span>
          <span className="fcw-li-fixes">3 critical fixes found</span>
        </div>
      </div>
      <div className="fcw-fixes">
        <div className="fcw-fix-row"><span className="fcw-dot fcw-dot--red" aria-hidden="true" />Headline missing UAE &amp; GCC keywords</div>
        <div className="fcw-fix-row"><span className="fcw-dot fcw-dot--amber" aria-hidden="true" />About section too short for search indexing</div>
        <div className="fcw-fix-row"><span className="fcw-dot fcw-dot--amber" aria-hidden="true" />No Gulf location signal detected</div>
      </div>
    </>
  );
}

const CARDS = [
  {
    id: 'ats-checker',
    variant: 'default',
    title: 'ATS Checker',
    tagline: 'Upload. See your score. Know what to fix.',
    href: '/ats',
    ctaLabel: 'Check my CV',
    widget: <AtsWidget />,
    tintRGB: '239,68,68',
  },
  {
    id: 'salary-switcher',
    variant: 'default',
    title: 'Salary Switcher',
    tagline: 'See your offer reframed across UAE, Saudi and India — in seconds.',
    href: '/salary-switcher',
    ctaLabel: 'Switch salaries',
    widget: <SalaryWidget />,
    tintRGB: '217,119,6',
  },
  {
    id: 'linkedin-optimizer',
    variant: 'default',
    title: 'LinkedIn Optimizer',
    tagline: 'The LinkedIn profile your CV deserves.',
    href: '/linkedin-optimizer',
    ctaLabel: 'Optimize LinkedIn',
    widget: <LinkedInWidget />,
    tintRGB: '99,102,241',
  },
];

const FADE_UP = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: [0.25, 0.46, 0.45, 0.94],
      delay: i * 0.08,
    },
  }),
};

const INSTANT = {
  hidden: { opacity: 1, y: 0 },
  show: { opacity: 1, y: 0 },
};

export default function FeatureCardGrid() {
  const reduce = useReducedMotion();
  const variants = reduce ? INSTANT : FADE_UP;

  return (
    <section className="cvp-feature-card-grid" aria-label="Product features">
      <style>{`
        .cvp-feature-card-grid {
          max-width: 1200px;
          margin: 0 auto;
          padding: 96px 24px;
          box-sizing: border-box;
          color: var(--color-text-primary);
        }
        @media (max-width: 768px) {
          .cvp-feature-card-grid { padding: 72px 20px; }
        }
        .cvp-feature-card-grid-inner {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
        }
        @media (min-width: 1024px) {
          .cvp-feature-card-grid-inner {
            grid-template-columns: repeat(3, 1fr);
            gap: 32px;
          }
        }
        .cvp-feature-card-grid-item { display: flex; }
        .cvp-feature-card-grid-item > * { width: 100%; }

        /* ── Card 1 · ATS score + bars ───────────────────────── */
        .fcw-ats-head {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .fcw-ats-score {
          font-size: 48px;
          font-weight: 900;
          color: #ef4444;
          text-shadow: 0 0 20px rgba(239,68,68,0.6), 0 0 40px rgba(239,68,68,0.3);
          line-height: 1;
          font-family: inherit;
        }
        .fcw-ats-slash {
          font-size: 16px;
          font-weight: 600;
          color: rgba(255,255,255,0.4);
          font-family: inherit;
        }
        .fcw-ats-pill {
          margin-left: auto;
          background: rgba(239,68,68,0.12);
          color: #ef4444;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.08em;
          padding: 4px 10px;
          border-radius: 999px;
          font-family: inherit;
        }
        .fcw-bars { display: flex; flex-direction: column; gap: 8px; }
        .fcw-bar-row { display: flex; flex-direction: column; gap: 4px; }
        .fcw-bar-label {
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: rgba(255,255,255,0.4);
          font-family: inherit;
        }
        .fcw-bar-track {
          width: 100%;
          height: 5px;
          background: rgba(255,255,255,0.06);
          border-radius: 3px;
          overflow: hidden;
        }
        .fcw-bar-fill { height: 100%; border-radius: 3px; }
        .fcw-bar-fill--red    { background: #ef4444; box-shadow: 2px 0 8px rgba(239,68,68,0.7); }
        .fcw-bar-fill--amber  { background: #D97706; box-shadow: 2px 0 8px rgba(217,119,6,0.7); }
        .fcw-bar-fill--green  { background: #22c55e; box-shadow: 2px 0 8px rgba(34,197,94,0.7); }

        /* ── Card 2 · Salary rows ────────────────────────────── */
        .fcw-salary { display: flex; flex-direction: column; }
        .fcw-salary-row {
          display: grid;
          grid-template-columns: auto auto 1fr auto;
          align-items: center;
          gap: 10px;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255,255,255,0.04);
        }
        .fcw-salary-row:last-child { border-bottom: none; }
        .fcw-salary-flag { font-size: 14px; line-height: 1; }
        .fcw-salary-city { font-size: 12px; color: rgba(255,255,255,0.5); font-family: inherit; }
        .fcw-salary-amount {
          font-size: 14px;
          font-weight: 700;
          color: #fff;
          text-align: right;
          font-family: inherit;
        }
        .fcw-salary-tag {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.04em;
          padding: 2px 8px;
          border-radius: 999px;
          min-width: 44px;
          text-align: center;
          font-family: inherit;
        }
        .fcw-salary-tag--green { background: rgba(34,197,94,0.12); color: #22c55e; }
        .fcw-salary-tag--red   { background: rgba(239,68,68,0.12); color: #ef4444; }

        /* ── Card 3 · Profile score + fixes ──────────────────── */
        .fcw-li-head { display: flex; align-items: baseline; gap: 12px; }
        .fcw-li-score {
          font-size: 42px;
          font-weight: 900;
          color: #6366f1;
          text-shadow: 0 0 20px rgba(99,102,241,0.6), 0 0 40px rgba(99,102,241,0.3);
          line-height: 1;
          font-family: inherit;
        }
        .fcw-li-meta { display: flex; flex-direction: column; gap: 2px; }
        .fcw-li-label  { font-size: 12px; color: rgba(255,255,255,0.5); font-family: inherit; }
        .fcw-li-fixes  { font-size: 11px; color: rgba(255,255,255,0.4); font-family: inherit; }
        .fcw-fixes { display: flex; flex-direction: column; gap: 6px; }
        .fcw-fix-row {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          color: rgba(255,255,255,0.4);
          font-family: inherit;
        }
        .fcw-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .fcw-dot--red   { background: #ef4444; box-shadow: 0 0 6px rgba(239,68,68,0.8); }
        .fcw-dot--amber { background: #D97706; box-shadow: 0 0 6px rgba(217,119,6,0.8); }
      `}</style>

      <div className="cvp-feature-card-grid-inner">
        {CARDS.map((card, i) => (
          <motion.div
            key={card.id}
            className="cvp-feature-card-grid-item"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            variants={variants}
            custom={i}
          >
            <FeatureCard
              variant={card.variant}
              title={card.title}
              tagline={card.tagline}
              badge={card.badge}
              href={card.href}
              ctaLabel={card.ctaLabel}
              widget={card.widget}
              tintRGB={card.tintRGB}
            />
          </motion.div>
        ))}
      </div>
    </section>
  );
}
