import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';

// Landing-page hook into /gulf-career. Lives between Hero and ShowSection.
// Dark glassmorphism card mirroring the Act 2/3 visual language of the
// Gulf Career Intelligence report — same gradient text, same silver
// border, same conic-spinning ring as the report's friction gauge.
export default function GulfTeaserSection() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();

  return (
    <section className="cvp-gulf-teaser" aria-label="Gulf Career Intelligence teaser">
      <style>{`
        @property --gci-teaser-angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
        @keyframes cvp-gulf-spin { to { --gci-teaser-angle: 360deg; } }
        @keyframes cvp-gulf-blink { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }

        .cvp-gulf-teaser {
          position: relative;
          padding: 64px 24px 32px;
          background: var(--color-surface-00);
          color: var(--color-text-primary);
          box-sizing: border-box;
        }
        @media (max-width: 760px) {
          .cvp-gulf-teaser { padding: 40px 16px 24px; }
        }

        .cvp-gulf-card {
          position: relative;
          max-width: 980px;
          margin: 0 auto;
          padding: 44px 40px;
          border-radius: 22px;
          background:
            radial-gradient(120% 80% at 50% -20%, rgba(255,255,255,0.08), transparent 60%),
            linear-gradient(180deg, rgba(255,255,255,0.045) 0%, rgba(255,255,255,0.018) 100%);
          border: 1px solid rgba(255,255,255,0.1);
          box-shadow:
            0 1px 0 rgba(255,255,255,0.08) inset,
            0 24px 60px -20px rgba(0,0,0,0.6);
          -webkit-backdrop-filter: blur(20px) saturate(140%);
          backdrop-filter: blur(20px) saturate(140%);
          overflow: hidden;
          isolation: isolate;
        }
        .cvp-gulf-card::before {
          content: "";
          position: absolute; top: 0; left: 24px; right: 24px; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent);
          pointer-events: none;
        }
        @media (max-width: 760px) {
          .cvp-gulf-card { padding: 28px 22px; border-radius: 18px; }
        }

        .cvp-gulf-eyebrow {
          display: inline-flex; align-items: center; gap: 8px;
          font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;
          font-size: 10.5px; letter-spacing: 0.24em; text-transform: uppercase;
          color: rgba(255,255,255,0.55); font-weight: 600; margin-bottom: 16px;
        }
        .cvp-gulf-eyebrow .cvp-gulf-pulse {
          width: 6px; height: 6px; border-radius: 50%;
          background: #FFFFFF; box-shadow: 0 0 14px rgba(255,255,255,0.6);
          animation: cvp-gulf-blink 1.6s ease-in-out infinite;
        }

        .cvp-gulf-h2 {
          font-size: clamp(28px, 4.4vw, 44px);
          line-height: 1.1;
          letter-spacing: -0.025em;
          font-weight: 600;
          margin: 0 0 14px;
          color: #FFFFFF;
          background: linear-gradient(180deg, #FFFFFF 0%, #B8B8BC 100%);
          -webkit-background-clip: text; background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .cvp-gulf-h2 em {
          font-style: normal;
          background: none;
          -webkit-text-fill-color: var(--color-accent, #D97706);
          color: var(--color-accent, #D97706);
        }

        .cvp-gulf-lede {
          font-size: clamp(14px, 1.6vw, 16px);
          line-height: 1.55;
          color: rgba(255,255,255,0.6);
          margin: 0 0 24px;
          max-width: 640px;
        }

        .cvp-gulf-sample {
          position: relative;
          display: inline-flex; align-items: center; gap: 10px;
          padding: 10px 14px;
          border-radius: 999px;
          border: 1px solid rgba(217,119,6,0.4);
          background: rgba(217,119,6,0.08);
          margin-bottom: 26px;
          overflow: hidden;
          max-width: 100%;
          flex-wrap: wrap;
        }
        .cvp-gulf-sample-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #D97706;
          box-shadow: 0 0 10px rgba(217,119,6,0.85);
          flex-shrink: 0;
          animation: cvp-gulf-blink 1.6s ease-in-out infinite;
        }
        .cvp-gulf-sample-label {
          font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;
          font-size: 9px; font-weight: 700; letter-spacing: 0.22em;
          color: rgba(255,255,255,0.55);
          flex-shrink: 0;
        }
        .cvp-gulf-sample-text {
          font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;
          font-size: 13px; font-weight: 700;
          color: #FFFFFF;
          letter-spacing: -0.005em;
        }

        .cvp-gulf-cta {
          position: relative;
          display: inline-flex; align-items: center; gap: 10px;
          padding: 16px 26px;
          border-radius: 13px;
          background: linear-gradient(180deg, #FFFFFF 0%, #DCDCE0 100%);
          color: #0A0A0A;
          font-family: inherit;
          font-size: 15px; font-weight: 700;
          letter-spacing: -0.005em;
          border: 0;
          cursor: pointer;
          box-shadow: 0 1px 0 rgba(255,255,255,0.7) inset, 0 8px 24px rgba(0,0,0,0.5);
          transition: transform 120ms cubic-bezier(0.4,0,0.2,1),
                      box-shadow 180ms cubic-bezier(0.4,0,0.2,1);
        }
        .cvp-gulf-cta:hover {
          box-shadow: 0 1px 0 rgba(255,255,255,0.7) inset, 0 12px 36px rgba(255,255,255,0.22);
        }
        .cvp-gulf-cta:active { transform: scale(0.98); }
        .cvp-gulf-cta:focus-visible {
          outline: 2px solid #D97706;
          outline-offset: 3px;
        }

        .cvp-gulf-meta {
          margin-top: 14px;
          font-size: 11.5px;
          color: rgba(255,255,255,0.45);
          font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;
          letter-spacing: 0.04em;
          display: inline-flex; gap: 16px; flex-wrap: wrap;
        }
        .cvp-gulf-meta span::before { content: "✓ "; color: #1D9E75; }

        .cvp-gulf-decor {
          position: absolute;
          top: -80px; right: -80px;
          width: 280px; height: 280px;
          border-radius: 50%;
          padding: 1.5px;
          background: conic-gradient(from var(--gci-teaser-angle, 0deg), transparent 60%, rgba(217,119,6,0.55) 80%, transparent 100%);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor; mask-composite: exclude;
          pointer-events: none;
          animation: cvp-gulf-spin 6s linear infinite;
          opacity: 0.55;
          filter: drop-shadow(0 0 14px rgba(217,119,6,0.4));
          z-index: 0;
        }
        @media (max-width: 760px) {
          .cvp-gulf-decor { width: 200px; height: 200px; top: -60px; right: -60px; opacity: 0.4; }
        }
        @media (prefers-reduced-motion: reduce) {
          .cvp-gulf-decor, .cvp-gulf-pulse, .cvp-gulf-sample-dot { animation: none; }
        }

        .cvp-gulf-card > * { position: relative; z-index: 1; }
      `}</style>

      <motion.div
        className="cvp-gulf-card"
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={reduce
          ? { duration: 0.01 }
          : { duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <div aria-hidden className="cvp-gulf-decor" />

        <div className="cvp-gulf-eyebrow">
          <span aria-hidden className="cvp-gulf-pulse" />
          GULF CAREER INTELLIGENCE &middot; LIVE
        </div>

        <h2 className="cvp-gulf-h2">
          What is your CV <em>actually worth</em> in the Gulf?
        </h2>

        <p className="cvp-gulf-lede">
          Benchmark your CV against UAE market data in 30 seconds &mdash; peer salary bands,
          recruiter friction, employer tier match and a paste-ready negotiation script.
          Free, no signup to see your match.
        </p>

        <div className="cvp-gulf-sample" aria-label="Sample report output">
          <span aria-hidden className="cvp-gulf-sample-dot" />
          <span className="cvp-gulf-sample-label">SAMPLE</span>
          <span className="cvp-gulf-sample-text">Senior Analyst &middot; DXB &rarr; AED 28&ndash;42K</span>
        </div>

        <div>
          <button
            type="button"
            className="cvp-gulf-cta"
            onClick={() => navigate('/gulf-career')}
          >
            Get My Gulf Intelligence Report &mdash; Free
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <div className="cvp-gulf-meta">
          <span>30 seconds, 7 questions</span>
          <span>No signup to see your match</span>
          <span>Paste-ready negotiation script</span>
        </div>
      </motion.div>
    </section>
  );
}
