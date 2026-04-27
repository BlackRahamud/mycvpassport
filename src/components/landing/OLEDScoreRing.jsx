/**
 * OLEDScoreRing — port of PremiumScoreCircle from ATSChecker.jsx / ATSPreview.
 *
 * Identical behaviour: spinning conic-gradient border, red/amber/green threshold,
 * drop-shadow glow, animated count-up to `score` when `revealed` flips true.
 *
 *   • size      — outer dimension in px (default 220 — full ATSPreview spec)
 *   • score     — final value (0–100)
 *   • revealed  — when true, animate display 0 → score over 1500ms
 *   • showLabel — whether to render "SCORE" + verdict ("Market ready" etc.)
 *
 * Tokens (red/amber/green, glow, sublabel) match the rest of the product.
 * Place this once at module scope; it manages its own RAF animation.
 *
 * Required CSS (inject once near the page root):
 *
 *   @property --ats-angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
 *   @keyframes ats-spin-border { to { --ats-angle: 360deg; } }
 *
 * The OLEDRingStyles component below injects this for you.
 */
import React, { useEffect, useState } from 'react';

export function scoreColor(v) {
  if (v <= 40) return '#F87171';
  if (v <= 70) return '#FACC15';
  return '#4ADE80';
}

export function scoreGlow(v) {
  const c = scoreColor(v);
  if (c === '#F87171') return 'drop-shadow(0 0 12px rgba(248,113,113,0.4))';
  if (c === '#FACC15') return 'drop-shadow(0 0 12px rgba(250,204,21,0.4))';
  return 'drop-shadow(0 0 12px rgba(74,222,128,0.4))';
}

export function scoreVerdict(v) {
  const c = scoreColor(v);
  if (c === '#F87171') return 'Needs work';
  if (c === '#FACC15') return 'On track';
  return 'Market ready';
}

export function OLEDRingStyles() {
  return (
    <style>{`
      @property --ats-angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
      @keyframes ats-spin-border { to { --ats-angle: 360deg; } }
    `}</style>
  );
}

export default function OLEDScoreRing({
  score = 87,
  revealed = true,
  size = 220,
  showLabel = true,
  duration = 1500,
}) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!revealed) { setDisplay(0); return; }
    let raf;
    let start = null;
    let cancelled = false;
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const step = (now) => {
      if (cancelled) return;
      if (start == null) start = now;
      const t = Math.min(1, (now - start) / duration);
      setDisplay(Math.round(ease(t) * score));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => { cancelled = true; cancelAnimationFrame(raf); };
  }, [score, revealed, duration]);

  const color = scoreColor(display);
  const verdict = scoreVerdict(display);
  const glow = scoreGlow(display);

  // Scale type sizes with ring size — keeps the small/medium/large ratio honest.
  const numSize = size * 0.327;       // 72 / 220
  const labelSize = Math.max(9, size * 0.05);
  const verdictSize = Math.max(9, size * 0.0545);
  const inset = Math.max(2, size * 0.009);

  return (
    <div style={{
      position: 'relative', width: size, height: size,
      filter: revealed ? glow : 'none',
      transition: 'filter 0.3s',
    }}>
      <div aria-hidden="true" style={{
        position: 'absolute', inset: 0, borderRadius: '50%', padding: inset,
        background: `conic-gradient(from var(--ats-angle, 0deg), transparent 60%, ${color} 80%, transparent 100%)`,
        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
        WebkitMaskComposite: 'xor',
        maskComposite: 'exclude',
        pointerEvents: 'none',
        animation: 'ats-spin-border 3s linear infinite',
      }} />
      <div style={{
        position: 'absolute', inset, borderRadius: '50%',
        background: '#0A0A0A',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          fontFamily: "'Inter', 'DM Sans', sans-serif",
          fontSize: numSize, fontWeight: 700, lineHeight: 1,
          letterSpacing: -numSize * 0.055, color, transition: 'color 0.15s',
          fontVariantNumeric: 'tabular-nums',
        }}>{display}</div>
        {showLabel && (<>
          <div style={{
            fontSize: labelSize, color: '#A0A0A0', marginTop: size * 0.018,
            letterSpacing: labelSize * 0.27, textTransform: 'uppercase',
            fontWeight: 600,
          }}>SCORE</div>
          <div style={{
            fontSize: verdictSize, color, marginTop: 2, fontWeight: 600,
            transition: 'color 0.15s',
          }}>{verdict}</div>
        </>)}
      </div>
    </div>
  );
}
