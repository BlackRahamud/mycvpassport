/* AtsScoreLiftBanner — extracted verbatim from the .cvp-tt-banner block
   in landing-testimonials.jsx (Claude Design bundle 5JQJeKOZMfC0rU1_9PkL2Q).
   Big +52 number, before→after copy, and a horizontal gradient bar with
   42 / 94 markers. Sits directly above the existing TestimonialsRow
   "Real people. Real results." heading. CSS scoped via <style> block. */

import React from "react";

export default function AtsScoreLiftBanner() {
  return (
    <section
      className="cvp-tt-banner-wrap"
      role="figure"
      aria-label="Average ATS score lift"
    >
      <style>{ATS_LIFT_BANNER_STYLES}</style>
      <div className="cvp-tt-banner">
        <div className="cvp-tt-banner-num">
          <span aria-hidden>+</span>52
        </div>
        <div className="cvp-tt-banner-body">
          <div className="cvp-tt-banner-h">average ATS score lift</div>
          <div className="cvp-tt-banner-s">
            from <b>42</b>{" "}
            <span className="cvp-tt-banner-mut">(rejected at the bot)</span>{" "}
            <span className="cvp-tt-banner-arrow">→</span> <b>94</b>{" "}
            <span className="cvp-tt-banner-mut">(seen by a human)</span>
          </div>
        </div>
        <div className="cvp-tt-banner-bar" aria-hidden>
          <span className="cvp-tt-banner-bar-fill" />
          <span className="cvp-tt-banner-bar-marker cvp-tt-banner-bar-marker--from">42</span>
          <span className="cvp-tt-banner-bar-marker cvp-tt-banner-bar-marker--to">94</span>
        </div>
      </div>
    </section>
  );
}

const ATS_LIFT_BANNER_STYLES = `
.cvp-tt-banner-wrap {
  max-width: 1100px;
  margin: 64px auto 0;
  padding: 0 24px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
}
.cvp-tt-banner {
  display: grid;
  grid-template-columns: auto 1fr;
  grid-template-rows: auto auto;
  align-items: center;
  gap: 8px 28px;
  padding: 28px 32px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background:
    radial-gradient(120% 140% at 0% 50%, rgba(74,222,128,0.10), transparent 55%),
    radial-gradient(120% 140% at 100% 50%, rgba(74,222,128,0.06), transparent 60%),
    var(--color-surface-01);
  position: relative;
  overflow: hidden;
}
.cvp-tt-banner::before {
  content: "";
  position: absolute; inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(74,222,128,0.18), transparent 50%);
  mask: linear-gradient(#000, #000) content-box, linear-gradient(#000, #000);
  mask-composite: exclude;
  -webkit-mask-composite: xor;
  padding: 1px;
  opacity: 0.55;
}
.cvp-tt-banner-num {
  grid-row: 1 / span 2;
  font-size: clamp(72px, 9vw, 128px);
  font-weight: 700;
  letter-spacing: -0.05em;
  line-height: 0.9;
  color: var(--color-success);
  text-shadow: 0 0 36px rgba(74,222,128,0.30);
  display: flex; align-items: baseline;
}
.cvp-tt-banner-num span {
  font-size: 0.55em; font-weight: 600; opacity: 0.9;
  margin-right: 0.04em;
}
.cvp-tt-banner-body { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.cvp-tt-banner-h {
  font-size: 22px; font-weight: 600; letter-spacing: -0.02em;
  color: var(--color-text-primary);
  line-height: 1.2;
}
.cvp-tt-banner-s {
  font-size: 15px; line-height: 1.5;
  color: var(--color-text-secondary);
}
.cvp-tt-banner-s b {
  color: var(--color-text-primary); font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.cvp-tt-banner-mut { color: var(--color-text-muted); }
.cvp-tt-banner-arrow {
  color: var(--color-success);
  font-weight: 700;
  margin: 0 4px;
}
.cvp-tt-banner-bar {
  grid-column: 1 / -1;
  position: relative;
  height: 6px;
  border-radius: 999px;
  background: var(--hover-wash);
  margin-top: 14px;
  overflow: visible;
}
.cvp-tt-banner-bar-fill {
  position: absolute; left: 0; top: 0; bottom: 0;
  width: 94%;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(248,113,113,0.55) 0%, rgba(250,204,21,0.7) 42%, var(--color-success) 100%);
  box-shadow: 0 0 12px rgba(74,222,128,0.35);
}
.cvp-tt-banner-bar-marker {
  position: absolute; top: 50%;
  transform: translate(-50%, -50%);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 9.5px; font-weight: 700; letter-spacing: 0.10em;
  padding: 3px 6px; border-radius: 999px;
  background: var(--color-surface-00);
  border: 1px solid var(--color-border);
}
.cvp-tt-banner-bar-marker--from { left: 42%; color: rgba(248,113,113,0.85); border-color: rgba(248,113,113,0.35); }
.cvp-tt-banner-bar-marker--to   { left: 94%; color: var(--color-success); border-color: rgba(74,222,128,0.40); }

@media (max-width: 720px) {
  .cvp-tt-banner-wrap { padding: 0 16px; }
  .cvp-tt-banner { grid-template-columns: 1fr; padding: 22px; gap: 6px; }
  .cvp-tt-banner-num { grid-row: auto; }
  .cvp-tt-banner-h { font-size: 18px; }
  .cvp-tt-banner-s { font-size: 14px; }
}
`;
