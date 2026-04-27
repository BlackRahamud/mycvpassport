// ============== src/components/landing/HowItWorksSection.jsx ==============
import React, { useRef, useEffect, useCallback } from 'react';
import { motion, useReducedMotion, useInView } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import OLEDScoreRing, { OLEDRingStyles } from './OLEDScoreRing';

const STEPS = [
  { n: '01', title: 'Pick a Gulf-tested template',
    desc: 'Built for professional CV standards across the UAE, KSA, and Qatar — covering tech, finance, healthcare and hospitality.',
    glyph: 'template' },
  { n: '02', title: 'Fill in — see your ATS score live',
    desc: 'Live preview, no signup. Fix what’s flagged.',
    glyph: 'score' },
  { n: '03', title: 'Download free, apply',
    desc: 'Free PDF. AED now · UPI for India soon.',
    glyph: 'download' },
];

function Glyph({ kind }) {
  if (kind === 'template') return (<svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true"><rect x="3" y="3" width="16" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.4" /><path d="M3 8h16" stroke="currentColor" strokeWidth="1.4" /><path d="M6.5 12h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /><path d="M6.5 15h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>);
  if (kind === 'score') return (<svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true"><path d="M11 2.2A8.8 8.8 0 1 0 19.8 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /><path d="M11 11l5-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><circle cx="11" cy="11" r="1.4" fill="currentColor" /></svg>);
  return (<svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true"><path d="M11 3v11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /><path d="M6.5 9.5L11 14l4.5-4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /><path d="M4 18h14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>);
}

function PayMark({ kind }) {
  const base = { height: 22, padding: '0 9px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 5, fontWeight: 700, letterSpacing: 0.4, fontFamily: '-apple-system, "SF Pro Display", "Inter", system-ui, sans-serif', fontSize: 11, whiteSpace: 'nowrap' };
  if (kind === 'applepay') return (<span aria-label="Apple Pay" title="Apple Pay" style={{ ...base, background: '#fff', color: '#0a0a0a', gap: 2 }}><svg width="11" height="13" viewBox="0 0 17 20" fill="currentColor" aria-hidden="true" style={{ marginTop: -1 }}><path d="M14.4 6.6c-.1 0-2.4.1-3.6 1.4-1.2 1.3-1 3.1-1 3.2.1.1 1.9.2 3-1 1.1-1.1 1.6-2.7 1.6-3.6Z" /><path d="M16.5 14.7c0-.1-1.3-.7-1.3-2.4 0-1.5 1.2-2.2 1.2-2.3-.7-1-1.7-1.1-2-1.1-.9-.1-1.6.5-2.1.5-.5 0-1.1-.5-1.9-.5-1 0-2 .6-2.5 1.5-1.1 1.8-.3 4.5.7 6 .5.7 1.1 1.6 1.9 1.5.8 0 1.1-.5 2-.5.9 0 1.2.5 2 .5.8 0 1.4-.7 1.9-1.5.6-.8.8-1.6.8-1.6 0-.1-1.7-.6-1.7-2.1Z" /></svg>Pay</span>);
  if (kind === 'ziina') return (<span aria-label="Ziina" title="Ziina" style={{ ...base, background: '#7c3aed', color: '#fff' }}>Ziina</span>);
  if (kind === 'visa') return (<span aria-label="Visa" title="Visa" style={{ ...base, background: '#1A1F71', color: '#F7B600', fontFamily: 'Georgia, serif', fontStyle: 'italic', letterSpacing: 0.6, fontSize: 12 }}>VISA</span>);
  if (kind === 'mc') return (<span aria-label="Mastercard" title="Mastercard" style={{ ...base, background: '#fff', color: '#0a0a0a', padding: '0 6px', gap: 0 }}><svg width="22" height="14" viewBox="0 0 32 20" aria-hidden="true"><circle cx="12" cy="10" r="9" fill="#EB001B" /><circle cx="20" cy="10" r="9" fill="#F79E1B" opacity="0.95" /><path d="M16 3.5a9 9 0 0 1 0 13 9 9 0 0 1 0-13Z" fill="#FF5F00" /></svg></span>);
  if (kind === 'upi') return (<span aria-label="UPI coming soon" title="UPI coming soon" style={{ ...base, background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.65)', border: '1px dashed rgba(255,255,255,0.22)', gap: 6, padding: '0 8px' }}><span style={{ color: '#fff', letterSpacing: 0.5 }}>UPI</span><span style={{ fontSize: 8.5, letterSpacing: 1.4, textTransform: 'uppercase', color: 'rgba(217,119,6,0.85)', fontWeight: 700 }}>SOON</span></span>);
  return null;
}

export default function HowItWorksSection() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const sectionRef = useRef(null);
  const inView = useInView(sectionRef, { amount: 0.35, once: true });

  useEffect(() => {
    if (!inView) return;
    window.dispatchEvent(new CustomEvent('cvp-fab-pulse'));
  }, [inView]);

  const onPrimary = useCallback(() => navigate('/builder'), [navigate]);

  return (
    <section ref={sectionRef} className="cvp-hiw" aria-labelledby="cvp-hiw-h" data-testid="how-it-works">
      <OLEDRingStyles />
      <style>{`
        .cvp-hiw { position: relative; max-width: 1200px; margin: 24px auto; padding: 96px 24px 120px; color: var(--color-text-primary, #fff); font-family: 'Inter', -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif; box-sizing: border-box; overflow: hidden; }
        @media (max-width: 880px) { .cvp-hiw { padding: 72px 20px 96px; } }
        .cvp-hiw::before { content: ""; position: absolute; right: -120px; bottom: -120px; width: 520px; height: 520px; background: radial-gradient(closest-side, rgba(217,119,6,0.16), transparent 70%); pointer-events: none; z-index: 0; }
        .cvp-hiw-head { position: relative; z-index: 1; max-width: 720px; margin: 0 0 56px; }
        @media (max-width: 880px) { .cvp-hiw-head { margin-bottom: 40px; } }
        .cvp-hiw-eyebrow { display: inline-flex; align-items: center; gap: 10px; font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase; color: var(--color-accent, #D97706); font-weight: 600; margin-bottom: 18px; }
        .cvp-hiw-eyebrow::before { content: ""; width: 22px; height: 1px; background: var(--color-accent, #D97706); }
        .cvp-hiw-h { font-size: clamp(34px, 5.2vw, 56px); line-height: 1.0; letter-spacing: -0.032em; font-weight: 510; margin: 0; color: var(--color-text-primary, #fff); text-wrap: balance; }
        .cvp-hiw-h em { font-style: normal; background: linear-gradient(90deg, #fff 0%, #fde68a 50%, #d97706 100%); background-size: 220% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; animation: cvp-hiw-shimmer 6s linear infinite; }
        @keyframes cvp-hiw-shimmer { 0% { background-position: 0% center; } 100% { background-position: 220% center; } }
        @media (prefers-reduced-motion: reduce) { .cvp-hiw-h em { animation: none; background: #fde68a; -webkit-text-fill-color: #fde68a; } }
        .cvp-hiw-sub { font-size: clamp(15px, 1.5vw, 17px); line-height: 1.5; color: var(--color-text-secondary, rgba(255,255,255,0.65)); margin: 18px 0 0; max-width: 56ch; }
        .cvp-hiw-grid { position: relative; z-index: 1; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        @media (max-width: 880px) { .cvp-hiw-grid { grid-template-columns: 1fr; gap: 14px; } }
        .cvp-hiw-rail { position: absolute; top: 64px; left: 11%; right: 11%; height: 1px; background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.10) 8%, rgba(255,255,255,0.10) 92%, transparent 100%); z-index: 0; pointer-events: none; }
        .cvp-hiw-rail::after { content: ""; position: absolute; top: 50%; left: 0; height: 1px; width: 0; background: linear-gradient(90deg, rgba(217,119,6,0.0), rgba(217,119,6,0.85), rgba(217,119,6,0.0)); transform: translateY(-50%); transition: width 1.6s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
        .cvp-hiw[data-in-view="true"] .cvp-hiw-rail::after { width: 100%; }
        @media (max-width: 880px) { .cvp-hiw-rail { display: none; } }
        .cvp-hiw-step { position: relative; background: var(--color-surface-01, #141414); border: 1px solid color-mix(in srgb, var(--color-border, #2a2a2a), transparent 30%); border-radius: var(--radius-md, 18px); padding: 32px 28px 28px; display: flex; flex-direction: column; gap: 14px; min-height: 360px; isolation: isolate; overflow: hidden; transition: border-color 220ms cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 220ms cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 220ms cubic-bezier(0.25, 0.46, 0.45, 0.94); }
        .cvp-hiw-step:hover { border-color: color-mix(in srgb, var(--color-accent, #D97706), transparent 55%); transform: translateY(-2px); box-shadow: 0 18px 36px -16px rgba(0,0,0,0.55); }
        .cvp-hiw-step.is-final { background: radial-gradient(120% 80% at 100% 0%, rgba(217,119,6,0.10), transparent 60%), var(--color-surface-01, #141414); border-color: color-mix(in srgb, var(--color-accent, #D97706), transparent 55%); }
        @media (prefers-reduced-motion: reduce) { .cvp-hiw-step { transition: border-color 100ms linear; } .cvp-hiw-step:hover { transform: none; } }
        .cvp-hiw-step-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .cvp-hiw-step-num { font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 56px; line-height: 0.9; font-weight: 600; letter-spacing: -0.04em; background: linear-gradient(180deg, #fff 0%, rgba(255,255,255,0.4) 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .cvp-hiw-step.is-final .cvp-hiw-step-num { background: linear-gradient(180deg, #fde68a 0%, #d97706 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
        .cvp-hiw-step-icon { width: 36px; height: 36px; display: grid; place-items: center; border-radius: 10px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); color: rgba(255,255,255,0.78); }
        .cvp-hiw-step.is-final .cvp-hiw-step-icon { background: rgba(217,119,6,0.12); border-color: rgba(217,119,6,0.4); color: #fde68a; }
        .cvp-hiw-step-title { font-size: 20px; font-weight: 600; letter-spacing: -0.012em; line-height: 1.25; margin: 4px 0 0; color: var(--color-text-primary, #fff); text-wrap: balance; }
        .cvp-hiw-step-desc { font-size: 14px; line-height: 1.55; color: var(--color-text-secondary, rgba(255,255,255,0.62)); margin: 0; }
        .cvp-hiw-thumbs { margin-top: auto; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
        .cvp-hiw-thumb { aspect-ratio: 3 / 4; background: #f7f5f0; color: #14171d; border-radius: 6px; padding: 8px 7px; display: flex; flex-direction: column; gap: 3px; box-shadow: inset 0 0 0 1px rgba(0,0,0,0.06); transition: transform 280ms cubic-bezier(0.25, 0.46, 0.45, 0.94); }
        .cvp-hiw-thumb:nth-child(1) { transform: translateY(2px) rotate(-1.2deg); }
        .cvp-hiw-thumb:nth-child(3) { transform: translateY(2px) rotate(1.2deg); }
        .cvp-hiw[data-in-view="true"] .cvp-hiw-thumb:nth-child(1) { transform: translateY(0) rotate(-2.8deg); }
        .cvp-hiw[data-in-view="true"] .cvp-hiw-thumb:nth-child(3) { transform: translateY(0) rotate(2.8deg); }
        .cvp-hiw-thumb-name { font-size: 6.5px; font-weight: 700; letter-spacing: -0.01em; color: #0a0d12; line-height: 1; margin-bottom: 1px; }
        .cvp-hiw-thumb-role { font-size: 4.8px; font-weight: 600; letter-spacing: 0.02em; margin-bottom: 2px; }
        .cvp-hiw-thumb-rule { height: 1px; width: 65%; background: currentColor; opacity: 0.55; margin-bottom: 2px; }
        .cvp-hiw-thumb-bar { height: 2.2px; border-radius: 1px; background: rgba(0,0,0,0.10); }
        .cvp-hiw-thumb-bar.w70 { width: 70%; } .cvp-hiw-thumb-bar.w50 { width: 50%; } .cvp-hiw-thumb-bar.w90 { width: 90%; } .cvp-hiw-thumb-bar.w40 { width: 40%; } .cvp-hiw-thumb-bar.w85 { width: 85%; }
        .cvp-hiw-score { margin-top: auto; display: flex; align-items: center; gap: 16px; padding: 14px 16px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; }
        .cvp-hiw-score-meta { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 0; }
        .cvp-hiw-score-label { font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 9.5px; letter-spacing: 0.22em; text-transform: uppercase; color: rgba(255,255,255,0.5); font-weight: 600; }
        .cvp-hiw-score-checks { display: flex; flex-direction: column; gap: 3px; }
        .cvp-hiw-score-check { display: flex; align-items: center; gap: 6px; font-size: 11px; color: rgba(255,255,255,0.78); font-variant-numeric: tabular-nums; }
        .cvp-hiw-score-tick { width: 11px; height: 11px; border-radius: 50%; background: rgba(74,222,128,0.16); color: #4ade80; display: grid; place-items: center; flex-shrink: 0; }
        .cvp-hiw-pdf { margin-top: auto; display: flex; flex-direction: column; gap: 12px; }
        .cvp-hiw-pdf-chip { display: inline-flex; align-items: center; gap: 10px; padding: 10px 14px; background: rgba(217,119,6,0.10); border: 1px solid rgba(217,119,6,0.28); border-radius: 10px; font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 12px; color: #fde68a; letter-spacing: 0.04em; align-self: flex-start; }
        .cvp-hiw-pdf-chip b { color: #fff; font-weight: 700; }
        .cvp-hiw-pdf-pill { font-size: 9.5px; letter-spacing: 0.18em; text-transform: uppercase; padding: 2px 7px; border-radius: 4px; background: rgba(34,197,94,0.18); color: #4ade80; font-weight: 700; }
        .cvp-hiw-paywall { display: flex; flex-direction: column; gap: 8px; padding-top: 12px; border-top: 1px dashed rgba(255,255,255,0.08); }
        .cvp-hiw-paywall-label { font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 9.5px; letter-spacing: 0.22em; text-transform: uppercase; color: rgba(255,255,255,0.45); font-weight: 600; }
        .cvp-hiw-paywall-row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
        .cvp-hiw-fabhint { display: none; }
        @media (min-width: 1080px) { .cvp-hiw-fabhint { display: block; position: absolute; right: -20px; bottom: -40px; width: 280px; height: 200px; pointer-events: none; z-index: 2; opacity: 0; transition: opacity 600ms cubic-bezier(0.25, 0.46, 0.45, 0.94); } .cvp-hiw[data-in-view="true"] .cvp-hiw-fabhint { opacity: 1; } }
        .cvp-hiw-fabhint-path { stroke: rgba(217,119,6,0.7); stroke-width: 1.5; fill: none; stroke-linecap: round; stroke-dasharray: 4 6; stroke-dashoffset: 220; animation: cvp-hiw-dash 2.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards; animation-delay: 600ms; }
        @keyframes cvp-hiw-dash { to { stroke-dashoffset: 0; } }
        .cvp-hiw[data-in-view="false"] .cvp-hiw-fabhint-path { animation: none; stroke-dashoffset: 220; }
        .cvp-hiw-fabhint-label { font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 10.5px; letter-spacing: 0.18em; text-transform: uppercase; fill: rgba(217,119,6,0.85); font-weight: 600; }
        @media (prefers-reduced-motion: reduce) { .cvp-hiw-fabhint-path { animation: none; stroke-dashoffset: 0; } }
        .cvp-hiw-cta-row { position: relative; z-index: 1; margin-top: 40px; display: flex; flex-wrap: wrap; align-items: center; gap: 18px; }
        @media (max-width: 880px) { .cvp-hiw-cta-row { margin-top: 28px; gap: 14px; } }
        .cvp-hiw-cta { background: var(--color-accent, #D97706); color: var(--color-surface-00, #0a0a0a); border: 0; padding: 14px 26px; border-radius: var(--radius-pill, 999px); font-family: inherit; font-size: 15px; font-weight: 600; letter-spacing: -0.005em; cursor: pointer; box-shadow: 0 0 0 1px rgba(245,158,11,0.4), 0 8px 24px -6px rgba(217,119,6,0.45); transition: transform 160ms cubic-bezier(0.25, 0.46, 0.45, 0.94), filter 160ms cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 220ms cubic-bezier(0.25, 0.46, 0.45, 0.94); will-change: transform; }
        .cvp-hiw-cta:hover { filter: brightness(0.95); }
        .cvp-hiw-cta:active { transform: scale(0.98); }
        .cvp-hiw-cta:focus-visible { outline: 2px solid var(--color-accent, #D97706); outline-offset: 3px; }
        @media (prefers-reduced-motion: reduce) { .cvp-hiw-cta { transition: none; } }
        .cvp-hiw-cta-aside { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: rgba(255,255,255,0.6); }
        .cvp-hiw-cta-aside-arrow { color: rgba(217,119,6,0.85); font-weight: 700; }
      `}</style>

      <div className="cvp-hiw-head">
        <div className="cvp-hiw-eyebrow">How it works</div>
        <motion.h2 id="cvp-hiw-h" className="cvp-hiw-h"
          initial={reduce ? false : { opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}>
          Three steps. <em>Five minutes.</em>
        </motion.h2>
        <motion.p className="cvp-hiw-sub"
          initial={reduce ? false : { opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }} transition={{ duration: 0.4, delay: 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}>
          From blank page to ATS-ready PDF — no signup, no card.
        </motion.p>
      </div>

      <div className="cvp-hiw-grid" data-in-view={inView ? 'true' : 'false'}>
        <span className="cvp-hiw-rail" aria-hidden="true" />
        {STEPS.map((s, i) => (
          <motion.div key={s.n} className={`cvp-hiw-step${s.n === '03' ? ' is-final' : ''}`}
            initial={reduce ? false : { opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }} transition={{ duration: 0.42, delay: i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}>
            <div className="cvp-hiw-step-head">
              <div className="cvp-hiw-step-num">{s.n}</div>
              <div className="cvp-hiw-step-icon"><Glyph kind={s.glyph} /></div>
            </div>
            <h3 className="cvp-hiw-step-title">{s.title}</h3>
            <p className="cvp-hiw-step-desc">{s.desc}</p>

            {s.n === '01' && (
              <div className="cvp-hiw-thumbs" aria-hidden="true">
                {[
                  { name: 'Layla A.', role: 'Marketing Lead', accent: '#D97706' },
                  { name: 'Ahmed M.',  role: 'Finance Mgr',   accent: '#0F4C81' },
                  { name: 'Faisal O.', role: 'Engineer',      accent: '#0d7a4a' },
                ].map((t, k) => (
                  <div className="cvp-hiw-thumb" key={k}>
                    <div className="cvp-hiw-thumb-name">{t.name}</div>
                    <div className="cvp-hiw-thumb-role" style={{ color: t.accent }}>{t.role}</div>
                    <div className="cvp-hiw-thumb-rule" style={{ background: t.accent }} />
                    <div className="cvp-hiw-thumb-bar w90" /><div className="cvp-hiw-thumb-bar w70" />
                    <div className="cvp-hiw-thumb-bar w85" /><div className="cvp-hiw-thumb-bar w50" />
                    <div className="cvp-hiw-thumb-bar w70" /><div className="cvp-hiw-thumb-bar w40" />
                  </div>
                ))}
              </div>
            )}

            {s.n === '02' && (
              <div className="cvp-hiw-score" aria-live="polite">
                <OLEDScoreRing score={87} revealed={inView} size={92} showLabel={false} duration={1500} />
                <div className="cvp-hiw-score-meta">
                  <div className="cvp-hiw-score-label">ATS · Live</div>
                  <div className="cvp-hiw-score-checks">
                    {['Keywords matched', 'Format integrity', 'Section order'].map((t) => (
                      <div className="cvp-hiw-score-check" key={t}>
                        <span className="cvp-hiw-score-tick">
                          <svg width="7" height="7" viewBox="0 0 10 10" fill="none" aria-hidden="true">
                            <path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </span>
                        {t}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {s.n === '03' && (
              <div className="cvp-hiw-pdf" aria-hidden="true">
                <div className="cvp-hiw-pdf-chip">
                  <span><b>my-cv.pdf</b></span>
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>·</span>
                  <span>184 KB</span>
                  <span className="cvp-hiw-pdf-pill">FREE</span>
                </div>
                <div className="cvp-hiw-paywall">
                  <div className="cvp-hiw-paywall-label">Pay in AED via</div>
                  <div className="cvp-hiw-paywall-row">
                    <PayMark kind="applepay" />
                    <PayMark kind="ziina" />
                    <PayMark kind="visa" />
                    <PayMark kind="mc" />
                    <PayMark kind="upi" />
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        ))}

        <svg className="cvp-hiw-fabhint" viewBox="0 0 280 200" aria-hidden="true">
          <path className="cvp-hiw-fabhint-path" d="M 30 30 C 90 30, 140 80, 180 130 S 240 180, 260 180" />
          <path d="M 252 174 L 264 182 L 254 188" stroke="rgba(217,119,6,0.85)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <text x="36" y="22" className="cvp-hiw-fabhint-label">{'→ or tap here'}</text>
        </svg>
      </div>

      <div className="cvp-hiw-cta-row">
        <button type="button" className="cvp-hiw-cta" onClick={onPrimary}>Start with a template →</button>
        <span className="cvp-hiw-cta-aside">
          <span className="cvp-hiw-cta-aside-arrow">↴</span>
          …or tap the floating button anytime.
        </span>
      </div>
    </section>
  );
}
