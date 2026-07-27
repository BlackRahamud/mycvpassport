import React, { useEffect, useRef, useState } from 'react';

/**
 * Founder callout — loader ring that resolves to CLEARED.
 *
 * Ported from the approved Claude Design file "Founder Callout v3"
 * (handoff: "Founder Callout Handoff"). Structure and wiring only: the
 * layout rules, ring behaviour, type scale and copy are the design's and
 * are not reinterpreted here.
 *
 * Replaces the old signed note (avatar, name line, location line, italic
 * paragraph) in full, per the handoff.
 *
 * Ring behaviour, verbatim from the handoff:
 *   - IntersectionObserver on the ring box, threshold 0.4. Fires once,
 *     then disconnects.
 *   - idle    : stroke-dashoffset 334.8 of circumference 464.96 (r 74, w 6)
 *   - filling : dashoffset to 0 over 1500ms cubic-bezier(0.16,0.84,0.44,1);
 *               the masked conic sweep runs ONLY during this phase
 *   - cleared : sweep unmounted, bloom 0.35 to 1, tick springs in, check
 *               draws on, pill turns green. Holds. No loop.
 *   - prefers-reduced-motion: mount straight into cleared, no sweep.
 *
 * The conic sweep reuses the existing engine (@property --ats-angle plus
 * ats-spin-border, declared once in src/index.css). No new spinner.
 *
 * The logo mark is public/favicon.svg itself, referenced rather than
 * redrawn, so the mark has exactly one source of truth.
 */

const CIRC = 464.96;        // 2 * PI * 74
const IDLE_OFFSET = 334.8;  // CIRC * 0.72
const FILL_MS = 1500;

export default function FoundersNoteSection({ founderPhotoUrl = '' }) {
  const ringRef = useRef(null);
  const timerRef = useRef(null);
  const [phase, setPhase] = useState('idle'); // idle | filling | cleared

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reduce) { setPhase('cleared'); return undefined; }

    const el = ringRef.current;
    const start = () => {
      setPhase((p) => (p === 'idle' ? 'filling' : p));
      timerRef.current = window.setTimeout(() => setPhase('cleared'), FILL_MS);
    };

    if (!el || typeof IntersectionObserver === 'undefined') {
      timerRef.current = window.setTimeout(start, 400);
      return () => window.clearTimeout(timerRef.current);
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { start(); io.disconnect(); }
        });
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => { io.disconnect(); window.clearTimeout(timerRef.current); };
  }, []);

  const cleared = phase === 'cleared';
  const sweeping = phase === 'filling';

  return (
    <section className="cvp-fc" aria-label="Founder note">
      <style>{FOUNDER_CALLOUT_CSS}</style>

      <div className="cvp-fc-wrap">
        {/* ── copy (order 2 desktop, order 1 mobile) ── */}
        <div className="cvp-fc-copy">
          <div className="cvp-fc-badge cvp-fc-anim">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 12l5.5 6L20 6" />
            </svg>
            Straight from the founder
          </div>

          <p className="cvp-fc-hook cvp-fc-anim">
            Your CV isn&rsquo;t judged by how it looks. It&rsquo;s judged by what the software can read.
          </p>

          <p className="cvp-fc-body cvp-fc-anim">
            Most companies run your CV through an ATS that scans it before any human does, and it reads data, not design. CVPassport is built the other way round. Data first, so your CV gets past the ATS and actually gets seen.
          </p>

          <p className="cvp-fc-caveat cvp-fc-anim">It can&rsquo;t promise you the job.</p>

          <div className="cvp-fc-payoff cvp-fc-anim">
            <span className="cvp-fc-rule" aria-hidden="true" />
            <p>But it makes sure you get a fair shot at it.</p>
          </div>

          <div className="cvp-fc-sig cvp-fc-anim">
            <span className="cvp-fc-avatar">
              JMK
              {founderPhotoUrl ? (
                <span
                  role="img"
                  aria-label="JMK, Founder of CVPassport"
                  className="cvp-fc-avatar-photo"
                  style={{ backgroundImage: `url("${founderPhotoUrl}")` }}
                />
              ) : null}
            </span>
            <span className="cvp-fc-sig-name">JMK, Founder of CVPassport</span>
          </div>
        </div>

        {/* ── loader (order 1 desktop, order 2 mobile) ── */}
        <div className="cvp-fc-loader">
          <div className="cvp-fc-stack">
            <div className="cvp-fc-bloom" aria-hidden="true" data-cleared={cleared ? 'true' : undefined} />
            <div className="cvp-fc-orbit cvp-fc-anim" aria-hidden="true" />

            <div className="cvp-fc-ringbox" ref={ringRef}>
              <div className="cvp-fc-pulse cvp-fc-anim" data-cleared={cleared ? 'true' : undefined} />

              {sweeping ? <div className="cvp-fc-sweep cvp-fc-anim" aria-hidden="true" /> : null}

              <svg
                viewBox="0 0 168 168"
                fill="none"
                className="cvp-fc-ring"
                role="img"
                aria-label={cleared ? 'ATS check cleared' : 'Checking your CV'}
              >
                <circle cx="84" cy="84" r="74" stroke="var(--fc-track)" strokeWidth="6" />
                <circle
                  cx="84" cy="84" r="74"
                  stroke="var(--fc-ok)" strokeWidth="6" strokeLinecap="round"
                  strokeDasharray={CIRC}
                  strokeDashoffset={phase === 'idle' ? IDLE_OFFSET : 0}
                  transform="rotate(-90 84 84)"
                  style={{ transition: `stroke-dashoffset ${FILL_MS}ms cubic-bezier(0.16,0.84,0.44,1)` }}
                />
              </svg>

              {/* the real brand mark, referenced not redrawn */}
              <img className="cvp-fc-mark" src="/favicon.svg" width="112" height="112" alt="CVPassport" />

              {cleared ? (
                <span className="cvp-fc-tickwrap">
                  <span className="cvp-fc-halo cvp-fc-anim" aria-hidden="true" />
                  <span className="cvp-fc-tick cvp-fc-anim">
                    <svg width="31" height="31" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path className="cvp-fc-draw cvp-fc-anim" d="M4 12l5.5 6L20 6" strokeDasharray="30" strokeDashoffset="0" />
                    </svg>
                  </span>
                </span>
              ) : null}
            </div>

            <div className="cvp-fc-status">
              <span className="cvp-fc-pill" data-cleared={cleared ? 'true' : undefined}>
                <span className="cvp-fc-dot" aria-hidden="true" />
                {cleared ? 'Cleared' : 'Reading your CV'}
              </span>
              <span className="cvp-fc-statussub">
                {cleared
                  ? 'Data first. Your CV was read the way the software reads it.'
                  : 'The scan runs on data, not design.'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* Scoped token map: the design's local names resolved against the app's
   real day/night tokens, so the section flips with the site toggle and
   nothing is a hardcoded surface. Only the green alpha derivatives are
   declared here, once, and then used by name. */
const FOUNDER_CALLOUT_CSS = `
.cvp-fc {
  --fc-ok: var(--success);
  --fc-ok-text: var(--success-text);
  --fc-ok-soft: rgba(74, 222, 128, 0.16);
  --fc-ok-glow: rgba(74, 222, 128, 0.42);
  --fc-ok-on: #0A0A0A;
  --fc-track: var(--border);
  --fc-card: rgba(255, 255, 255, 0.72);
  --fc-card-line: rgba(20, 19, 16, 0.06);
  --fc-mark-edge: rgba(20, 19, 16, 0.10);

  display: block;
  box-sizing: border-box;
  max-width: 1160px;
  margin: 0 auto;
  padding: clamp(40px, 6vw, 88px) clamp(20px, 4vw, 64px);
  background: var(--bg);
  color: var(--text-primary);
  font-family: inherit;
}
[data-theme="dark"] .cvp-fc {
  --fc-ok-glow: rgba(74, 222, 128, 0.50);
  --fc-card: rgba(255, 255, 255, 0.03);
  --fc-card-line: rgba(255, 255, 255, 0.06);
  --fc-mark-edge: var(--border);
}

/* ── layout: one flex row, single breakpoint at 880px ── */
.cvp-fc-wrap { display: flex; align-items: center; gap: clamp(28px, 5vw, 72px); }
.cvp-fc-copy { flex: 1 1 460px; min-width: min(100%, 300px); display: flex; flex-direction: column; gap: 20px; max-width: 620px; }
.cvp-fc-loader { flex: 0 0 340px; display: flex; justify-content: center; }
@media (min-width: 881px) { .cvp-fc-loader { order: 1; } .cvp-fc-copy { order: 2; } }
@media (max-width: 880px) {
  .cvp-fc-wrap { flex-direction: column; align-items: stretch; gap: 36px; }
  .cvp-fc-loader { order: 2; flex: 0 0 auto; }
  .cvp-fc-copy { order: 1; gap: 18px; }
}

/* ── copy ── */
.cvp-fc-badge {
  display: inline-flex; align-items: center; gap: 8px; align-self: flex-start;
  padding: 7px 13px; border-radius: 9999px;
  background: var(--color-accent-soft);
  border: 1px solid var(--color-accent-line);
  color: var(--accent-text);
  font-size: 11px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
  animation: cvpFcRise 420ms cubic-bezier(0.25,0.46,0.45,0.94) both;
}
.cvp-fc-hook {
  margin: 0; font-size: clamp(23px, 2.8vw, 31px); line-height: 1.32;
  font-weight: 700; letter-spacing: -0.025em; text-wrap: pretty;
  animation: cvpFcRise 420ms 60ms cubic-bezier(0.25,0.46,0.45,0.94) both;
}
.cvp-fc-body {
  margin: 0; font-size: clamp(15.5px, 1.5vw, 17.5px); line-height: 1.72;
  color: var(--text-secondary); text-wrap: pretty;
  animation: cvpFcRise 420ms 120ms cubic-bezier(0.25,0.46,0.45,0.94) both;
}
.cvp-fc-caveat {
  margin: 0; font-size: clamp(15.5px, 1.5vw, 17.5px); line-height: 1.72;
  color: var(--text-muted);
  animation: cvpFcRise 420ms 180ms cubic-bezier(0.25,0.46,0.45,0.94) both;
}
.cvp-fc-payoff {
  position: relative; align-self: flex-start;
  padding: 16px 22px; border-radius: 16px;
  background: var(--fc-card); border: 1px solid var(--fc-card-line);
  animation: cvpFcRise 460ms 240ms cubic-bezier(0.25,0.46,0.45,0.94) both;
}
.cvp-fc-payoff p {
  margin: 0; font-size: clamp(20px, 2.4vw, 27px); line-height: 1.32;
  font-weight: 700; letter-spacing: -0.025em; text-wrap: pretty;
}
.cvp-fc-rule {
  position: absolute; left: 0; top: 16px; bottom: 16px;
  width: 3px; border-radius: 2px; background: var(--accent);
}
.cvp-fc-sig {
  display: flex; align-items: center; gap: 12px; margin-top: 6px;
  animation: cvpFcRise 420ms 300ms cubic-bezier(0.25,0.46,0.45,0.94) both;
}
.cvp-fc-avatar {
  position: relative; width: 40px; height: 40px; border-radius: 9999px;
  overflow: hidden; flex-shrink: 0;
  background: var(--bg-elevated); border: 1px solid var(--border);
  display: grid; place-items: center;
  font-size: 12.5px; font-weight: 700; letter-spacing: 0.02em; color: var(--text-secondary);
}
/* Photo rides as a background layer: an unset or missing file can never
   fire a 404 the way an <img src> would. */
.cvp-fc-avatar-photo { position: absolute; inset: 0; background-size: cover; background-position: center; }
.cvp-fc-sig-name { font-size: 13.5px; font-weight: 600; color: var(--text-primary); }

/* ── loader ── */
.cvp-fc-stack { position: relative; display: flex; flex-direction: column; align-items: center; gap: 26px; }
.cvp-fc-bloom {
  position: absolute; left: 50%; top: 38%; width: min(150%, 560px); aspect-ratio: 1;
  transform: translate(-50%, -50%); border-radius: 9999px;
  background: radial-gradient(closest-side, var(--fc-ok-glow), transparent 70%);
  opacity: 0.35; transition: opacity 900ms cubic-bezier(0.4,0,0.2,1); pointer-events: none;
}
.cvp-fc-bloom[data-cleared="true"] { opacity: 1; }
.cvp-fc-orbit {
  position: absolute; left: 50%; top: 38%; width: min(126%, 470px); aspect-ratio: 1;
  transform: translate(-50%, -50%); border-radius: 9999px;
  border: 1px dashed var(--fc-ok-soft);
  animation: cvpFcSpinSlow 70s linear infinite; pointer-events: none;
}
.cvp-fc-ringbox { position: relative; width: clamp(220px, 26vw, 288px); aspect-ratio: 1; display: grid; place-items: center; }
.cvp-fc-pulse { position: absolute; inset: 16px; border-radius: 9999px; }
.cvp-fc-pulse[data-cleared="true"] { animation: cvpFcGlow 900ms cubic-bezier(0.4,0,0.2,1) both; }
/* Reuses the canonical @property --ats-angle + ats-spin-border from
   src/index.css. Mounted only while filling, so it can never loop on. */
.cvp-fc-sweep {
  position: absolute; inset: 6px; border-radius: 50%; padding: 2px;
  background: conic-gradient(from var(--ats-angle, 0deg), transparent 55%, var(--fc-ok) 82%, transparent 100%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
  animation: ats-spin-border 1.4s linear infinite;
  will-change: transform;
}
.cvp-fc-ring { position: absolute; inset: 0; width: 100%; height: 100%; }
.cvp-fc-mark {
  position: relative; display: block; width: 112px; height: 112px; border-radius: 18px;
  box-shadow: 0 0 0 1px var(--fc-mark-edge), 0 22px 44px -20px rgba(0, 0, 0, 0.45);
}
.cvp-fc-tickwrap { position: absolute; right: -6px; bottom: 14px; width: 66px; height: 66px; display: grid; place-items: center; pointer-events: none; }
.cvp-fc-halo {
  position: absolute; inset: 0; border-radius: 9999px; background: var(--fc-ok);
  animation: cvpFcTickHalo 1000ms 140ms cubic-bezier(0.4,0,0.2,1) both;
}
.cvp-fc-tick {
  position: relative; width: 62px; height: 62px; border-radius: 9999px;
  background: var(--fc-ok); color: var(--fc-ok-on); display: grid; place-items: center;
  box-shadow: 0 0 0 6px var(--bg), 0 14px 30px -10px var(--fc-ok-glow), 0 0 40px -4px var(--fc-ok-glow);
  animation: cvpFcTick 640ms cubic-bezier(0.34,1.56,0.64,1) both;
}
.cvp-fc-draw { animation: cvpFcDraw 420ms 260ms cubic-bezier(0.16,0.84,0.44,1) both; }

.cvp-fc-status { position: relative; display: flex; flex-direction: column; align-items: center; gap: 10px; text-align: center; }
.cvp-fc-pill {
  display: inline-flex; align-items: center; gap: 8px; padding: 7px 14px; border-radius: 9999px;
  background: transparent; border: 1px solid var(--border);
  font-size: 11px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase;
  color: var(--text-secondary);
  transition: background-color 400ms cubic-bezier(0.4,0,0.2,1), border-color 400ms cubic-bezier(0.4,0,0.2,1), color 400ms cubic-bezier(0.4,0,0.2,1);
}
.cvp-fc-pill[data-cleared="true"] { background: var(--fc-ok-soft); border-color: var(--fc-ok); color: var(--fc-ok-text); }
.cvp-fc-dot { width: 7px; height: 7px; border-radius: 9999px; background: currentColor; }
.cvp-fc-statussub { font-size: 13.5px; line-height: 1.6; color: var(--text-muted); max-width: 250px; }

/* Mobile pairing. Declared AFTER the base copy rules so it wins on a
   specificity tie: "It can't promise you the job." must stay welded to the
   payoff card it sets up, instead of orphaning at the fold. */
@media (max-width: 880px) {
  .cvp-fc-caveat { margin-bottom: -8px; }
  .cvp-fc-payoff { align-self: stretch; }

  /* The CLEARED tick moves to the ring's bottom LEFT on phones. The site's
     floating "Start free" CTA is fixed to the bottom RIGHT, and a fixed
     element cannot dodge scrolling content: at some scroll offsets it
     landed straight on top of the tick, covering the one moment this
     section exists to deliver. Swapping the side clears it at every offset
     without moving the CTA or changing the tick itself. */
  .cvp-fc-tickwrap { right: auto; left: -6px; }
}

@keyframes cvpFcRise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: none; } }
@keyframes cvpFcGlow { 0% { box-shadow: 0 0 0 0 var(--fc-ok-glow); } 55% { box-shadow: 0 0 0 22px rgba(74,222,128,0); } 100% { box-shadow: 0 0 0 0 rgba(74,222,128,0); } }
@keyframes cvpFcTick { 0% { opacity: 0; transform: scale(0.2) rotate(-25deg); } 55% { opacity: 1; transform: scale(1.22) rotate(4deg); } 78% { transform: scale(0.94) rotate(0deg); } 100% { opacity: 1; transform: scale(1) rotate(0deg); } }
@keyframes cvpFcTickHalo { 0% { opacity: 0.55; transform: scale(0.7); } 100% { opacity: 0; transform: scale(2.1); } }
@keyframes cvpFcDraw { from { stroke-dashoffset: 30; } to { stroke-dashoffset: 0; } }
@keyframes cvpFcSpinSlow { to { transform: translate(-50%, -50%) rotate(360deg); } }

@media (prefers-reduced-motion: reduce) {
  .cvp-fc-anim { animation: none !important; }
  .cvp-fc-bloom, .cvp-fc-pill { transition: none !important; }
}

/* ── Low-end and older-browser hardening ──────────────────────────
   The design assumes a modern engine. These keep it intact where the
   engine is older or the device is slow, without changing the layout
   anywhere the modern path is available. */

/* 1. aspect-ratio is Safari 15+. Older engines collapse the ring box to
   zero height without this, taking the mark and the tick with it. */
@supports not (aspect-ratio: 1 / 1) {
  .cvp-fc-ringbox { height: clamp(220px, 26vw, 288px); }
  .cvp-fc-bloom { height: min(150%, 560px); }
  .cvp-fc-orbit { height: min(126%, 470px); }
}

/* 2. The decorations bleed wider than the ring box on purpose. Contain
   them to the loader column so a narrow phone can never inherit a
   horizontal scrollbar from this section. */
.cvp-fc-loader { max-width: 100%; overflow: hidden; }
.cvp-fc { overflow-x: clip; }

/* 3. Phones: drop the perpetual orbit rotation and the widest bloom.
   Both are ambient decoration, and an infinite compositor job plus a
   560px radial repaint is exactly what a cheap phone cannot spare. The
   ring, the CLEARED state and the tick are untouched. */
@media (max-width: 880px) {
  .cvp-fc-orbit { animation: none; width: min(112%, 360px); }
  .cvp-fc-bloom { width: min(120%, 380px); }
}

/* 4. Coarse pointers on any width: same reasoning, plus it saves battery
   on tablets that report a wide viewport. */
@media (hover: none) and (pointer: coarse) {
  .cvp-fc-orbit { animation: none; }
}
`;
