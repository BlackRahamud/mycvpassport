/* HeroBillboardTablet — static iPad with the 94 / SCORE / Market ready /
   PASSING green score ring + the floating "AI-rewritten in 47s" pill.
   Direct port of the .cvp-htab block from the design bundle's
   landing-hero.jsx (5JQJeKOZMfC0rU1_9PkL2Q). Lives next to the animated
   iPhone in HeroSection.jsx as the second half of the hero billboard.
   No animation on the ring itself — the gradient stop and the pill's
   gentle float are CSS-only. */

import React from "react";

export default function HeroBillboardTablet() {
  return (
    <>
      <style>{HERO_TABLET_STYLES}</style>
      <div className="cvp-htab" aria-hidden>
        <div className="cvp-htab-screen">
          <div className="cvp-ai-pill-inject">
            <span className="spark" aria-hidden>✨</span>
            <span>AI-rewritten in 47s</span>
          </div>

          <div className="cvp-score-ring">
            <svg viewBox="0 0 180 180">
              <circle className="track" cx="90" cy="90" r="80" />
              <circle className="arc" cx="90" cy="90" r="80" />
            </svg>
            <div className="center">
              <div className="num">94</div>
              <div className="lbl-score">SCORE</div>
              <div className="verdict">Market ready</div>
            </div>
          </div>
          <div className="cvp-score-passing">PASSING</div>
        </div>
      </div>
    </>
  );
}

const HERO_TABLET_STYLES = `
.cvp-htab {
  position: relative; z-index: 1;
  width: 360px; height: 500px;
  margin-top: 38px; align-self: flex-start;
  background: #1c1c1c;
  border-radius: 28px;
  border: 1px solid rgba(255,255,255,0.10);
  box-shadow: 0 24px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05);
  padding: 14px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
}
.cvp-htab-screen {
  width: 100%; height: 100%;
  background: radial-gradient(ellipse at center, #1a1a1a 0%, #0a0a0a 100%);
  border-radius: 18px;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 14px;
  position: relative;
}

/* score ring (94 / SCORE / Market ready / PASSING) */
.cvp-score-ring { position: relative; width: 200px; height: 200px; }
.cvp-score-ring svg { width: 100%; height: 100%; transform: rotate(-90deg); }
.cvp-score-ring .track { fill: none; stroke: rgba(255,255,255,0.06); stroke-width: 14; }
.cvp-score-ring .arc {
  fill: none; stroke: var(--color-success); stroke-width: 14;
  stroke-linecap: round;
  stroke-dasharray: 502.4; stroke-dashoffset: 30.1;
  filter: drop-shadow(0 0 8px rgba(74,222,128,0.5));
}
.cvp-score-ring .center {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 2px;
}
.cvp-score-ring .num {
  font-size: 64px; font-weight: 510; letter-spacing: -0.04em;
  color: var(--color-text-primary); line-height: 1;
}
.cvp-score-ring .lbl-score {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9.5px; letter-spacing: 0.28em;
  color: var(--color-text-muted); margin-top: 4px;
}
.cvp-score-ring .verdict {
  font-size: 13px; font-weight: 600; color: var(--color-success);
  letter-spacing: -0.01em;
}
.cvp-score-passing {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10px; font-weight: 700;
  letter-spacing: 0.24em; color: var(--color-success);
  text-transform: uppercase;
}

/* the small "AI-rewritten in 47s" pill — only on the iPad */
@keyframes cvpAiPill {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}
@keyframes cvpSparkle {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.55; transform: scale(0.85); }
}
.cvp-ai-pill-inject {
  position: absolute;
  top: 26px; right: 18px;
  display: inline-flex; align-items: center; gap: 6px;
  padding: 6px 10px;
  border: 1px solid var(--color-accent-line);
  background: rgba(217,119,6,0.18);
  border-radius: var(--radius-pill);
  color: #FCD34D;
  font-size: 11px; font-weight: 600; letter-spacing: -0.01em;
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
  box-shadow: 0 4px 16px rgba(217,119,6,0.25);
  animation: cvpAiPill 2.4s ease-in-out infinite;
}
.cvp-ai-pill-inject .spark { animation: cvpSparkle 1.8s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .cvp-ai-pill-inject { animation: none; }
  .cvp-ai-pill-inject .spark { animation: none; }
}

@media (max-width: 900px) {
  .cvp-htab { width: 300px; height: 420px; }
}
@media (max-width: 600px) {
  .cvp-htab { margin-top: 0; }
  .cvp-ai-pill-inject { top: 16px; right: 12px; }
}
`;
