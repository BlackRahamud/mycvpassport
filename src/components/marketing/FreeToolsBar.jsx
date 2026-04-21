import React from 'react';
import { useNavigate } from 'react-router-dom';

// Free tools bar — slots between HeroSection and ShowSection.
// All three routes are mounted in App.js; no signup gate, no modal.

const TOOLS = [
  {
    id: 'ats',
    title: 'ATS Score Checker',
    desc: 'See where your CV fails the scan before you apply.',
    href: '/ats',
  },
  {
    id: 'salary',
    title: 'Salary Switcher',
    desc: 'Convert offers across UAE, Saudi, India in seconds.',
    href: '/salary-switcher',
  },
  {
    id: 'linkedin',
    title: 'LinkedIn Optimizer',
    desc: 'Score your profile and get specific line-by-line fixes.',
    href: '/linkedin-optimizer',
  },
];

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}

export default function FreeToolsBar() {
  const navigate = useNavigate();

  return (
    <section className="cvp-free-tools" aria-label="Free tools — no signup">
      <style>{`
        .cvp-free-tools {
          padding: 72px 24px;
          background: #0A0A0A;
          color: var(--color-text-primary);
          box-sizing: border-box;
        }
        @media (max-width: 768px) {
          .cvp-free-tools { padding: 56px 20px; }
        }
        .cvp-free-tools-inner {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }
        .cvp-free-tools-heading {
          font-size: 13px;
          font-weight: 500;
          letter-spacing: 0.04em;
          color: var(--color-text-secondary);
          margin: 0;
          text-align: center;
          font-family: inherit;
        }
        .cvp-free-tools-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
        }
        @media (max-width: 768px) {
          .cvp-free-tools-grid { grid-template-columns: 1fr; gap: 12px; }
        }
        .cvp-free-tools-card {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: stretch;
          gap: 12px;
          padding: 20px;
          background: #0A0A0A;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: var(--radius-md);
          color: var(--color-text-primary);
          font-family: inherit;
          text-align: left;
          cursor: pointer;
          transition: border-color 160ms cubic-bezier(0.25, 0.46, 0.45, 0.94),
                      background-color 160ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        .cvp-free-tools-card:hover {
          border-color: rgba(255, 255, 255, 0.18);
          background: var(--color-surface-01);
        }
        .cvp-free-tools-card:focus-visible {
          outline: 2px solid var(--color-accent);
          outline-offset: 2px;
        }
        @media (prefers-reduced-motion: reduce) {
          .cvp-free-tools-card { transition: none; }
        }
        .cvp-free-tools-card-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .cvp-free-tools-card-title {
          font-size: 16px;
          font-weight: 600;
          letter-spacing: -0.01em;
          color: var(--color-text-primary);
          margin: 0;
          font-family: inherit;
        }
        .cvp-free-tools-badge {
          display: inline-flex;
          align-items: center;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #E5B24D;
          background: rgba(229, 178, 77, 0.12);
          padding: 3px 8px;
          border-radius: var(--radius-pill);
          font-family: inherit;
          line-height: 1.4;
          flex-shrink: 0;
        }
        .cvp-free-tools-card-desc {
          font-size: 13px;
          line-height: 1.55;
          color: var(--color-text-secondary);
          margin: 0;
          font-family: inherit;
        }
        .cvp-free-tools-card-arrow {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-top: 4px;
          font-size: 13px;
          font-weight: 500;
          color: var(--color-text-primary);
          font-family: inherit;
          transition: color 160ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        .cvp-free-tools-card:hover .cvp-free-tools-card-arrow {
          color: #E5B24D;
        }
        @media (prefers-reduced-motion: reduce) {
          .cvp-free-tools-card-arrow { transition: none; }
        }
      `}</style>

      <div className="cvp-free-tools-inner">
        <p className="cvp-free-tools-heading">Try before you build. No signup required.</p>
        <div className="cvp-free-tools-grid">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              type="button"
              className="cvp-free-tools-card"
              onClick={() => navigate(tool.href)}
              aria-label={`${tool.title} — free tool, no signup`}
            >
              <div className="cvp-free-tools-card-row">
                <h3 className="cvp-free-tools-card-title">{tool.title}</h3>
                <span className="cvp-free-tools-badge">FREE</span>
              </div>
              <p className="cvp-free-tools-card-desc">{tool.desc}</p>
              <span className="cvp-free-tools-card-arrow">
                Open
                <ArrowIcon />
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
