// ============== src/components/landing/HowItWorksSection.jsx ==============
import React, { useRef, useEffect, useCallback, useState } from 'react';
import { motion, useReducedMotion, useInView } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import OLEDScoreRing, { OLEDRingStyles } from './OLEDScoreRing';

const STEPS = [
  { n: '01', title: 'Pick a Gulf-tested template',
    desc: 'Gulf-tested layouts for the UAE, KSA & Qatar — tuned for tech, finance, healthcare and hospitality. Pick one, make it yours.',
    glyph: 'template' },
  { n: '02', title: 'Fill it in, see your score climb',
    desc: 'Type as you go and watch what passes: keywords, formatting, section order. We flag what to fix, live. No signup needed.',
    glyph: 'score' },
  { n: '03', title: 'Download free, pay when you win',
    desc: 'Export a clean, ATS-ready PDF for free. Land the interview, then pay in AED with Ziina, Apple Pay, Google Pay or PhonePe.',
    glyph: 'download' },
];

function Glyph({ kind }) {
  if (kind === 'template') return (<svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true"><rect x="3" y="3" width="16" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.4" /><path d="M3 8h16" stroke="currentColor" strokeWidth="1.4" /><path d="M6.5 12h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /><path d="M6.5 15h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>);
  if (kind === 'score') return (<svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true"><path d="M11 2.2A8.8 8.8 0 1 0 19.8 11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /><path d="M11 11l5-3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /><circle cx="11" cy="11" r="1.4" fill="currentColor" /></svg>);
  return (<svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true"><path d="M11 3v11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /><path d="M6.5 9.5L11 14l4.5-4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /><path d="M4 18h14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>);
}

/* ── Payment card stack (Step 03) ─────────────────────────────────
   Layered Apple-Wallet style fan of the methods we accept: Ziina,
   Apple Pay, Google Pay and PhonePe. Auto-shuffles every 3.5s so each
   card gets hero time. Apple Pay NFC ripple only fires while Apple Pay
   is the front card. Hover pauses the cycle so visitors can read the
   active card. Reduced-motion: skip the cycle, keep Apple Pay on top.

   Only the Ziina card carries purple — that is Ziina's actual brand
   mark, not a UI accent. Every other mark stays monochrome-leaning so
   the stack reads as trust signals (and the no-purple-UI rule holds).

   PAY_CARDS is the canonical card list. PAY_SLOTS is the geometry —
   index 0 is furthest back, last index is front. distanceFromFront
   maps each card into a slot every cycle. */
const PAY_CARDS = [
  { kind: 'gpay' },
  { kind: 'phonepe' },
  { kind: 'ziina' },
  { kind: 'applepay' },
];
const APPLEPAY_INDEX = PAY_CARDS.findIndex((c) => c.kind === 'applepay');
const PAY_SLOTS = [
  // back → front
  { z: 3, x: -26, y: -8, rotate: -6, shadow: '0 6px 14px rgba(0,0,0,0.32)' },
  { z: 4, x:  22, y: -7, rotate:  5, shadow: '0 8px 18px rgba(0,0,0,0.30)' },
  { z: 5, x: -12, y: -3, rotate: -3, shadow: '0 10px 22px rgba(0,0,0,0.42)' },
  { z: 6, x:   0, y:  0, rotate:  0, shadow: '0 18px 36px -8px rgba(0,0,0,0.6), 0 4px 10px rgba(0,0,0,0.4)' },
];
const SHUFFLE_INTERVAL_MS = 3500;

function PayCardFace({ kind, isFront }) {
  if (kind === 'applepay') {
    return (
      <div className="cvp-paycard cvp-paycard--apple" aria-label="Apple Pay">
        <span className="cvp-paycard-applemark">
          <svg width="13" height="15" viewBox="0 0 17 20" fill="#fff" aria-hidden="true"><path d="M14.4 6.6c-.1 0-2.4.1-3.6 1.4-1.2 1.3-1 3.1-1 3.2.1.1 1.9.2 3-1 1.1-1.1 1.6-2.7 1.6-3.6Z" /><path d="M16.5 14.7c0-.1-1.3-.7-1.3-2.4 0-1.5 1.2-2.2 1.2-2.3-.7-1-1.7-1.1-2-1.1-.9-.1-1.6.5-2.1.5-.5 0-1.1-.5-1.9-.5-1 0-2 .6-2.5 1.5-1.1 1.8-.3 4.5.7 6 .5.7 1.1 1.6 1.9 1.5.8 0 1.1-.5 2-.5.9 0 1.2.5 2 .5.8 0 1.4-.7 1.9-1.5.6-.8.8-1.6.8-1.6 0-.1-1.7-.6-1.7-2.1Z" /></svg>
          <span>Pay</span>
        </span>
        <span className="cvp-paycard-chip" aria-hidden="true" />
        {isFront && (
          <>
            <span className="cvp-paycard-nfc cvp-paycard-nfc-1" aria-hidden="true" />
            <span className="cvp-paycard-nfc cvp-paycard-nfc-2" aria-hidden="true" />
            <span className="cvp-paycard-nfc cvp-paycard-nfc-3" aria-hidden="true" />
          </>
        )}
      </div>
    );
  }
  if (kind === 'ziina') {
    return (
      <div className="cvp-paycard cvp-paycard--ziina" aria-label="Ziina">
        <span className="cvp-paycard-wordmark cvp-paycard-wordmark--ziina">Ziina</span>
        <span className="cvp-paycard-ziina-meta" aria-hidden="true">AED · UAE wallet</span>
      </div>
    );
  }
  if (kind === 'gpay') {
    return (
      <div className="cvp-paycard cvp-paycard--gpay" aria-label="Google Pay">
        <svg className="cvp-paycard-gpay-mark" width="24" height="24" viewBox="0 0 533.5 544.3" aria-hidden="true">
          <path fill="#4285F4" d="M533.5 278.4c0-18.5-1.5-37.1-4.7-55.3H272.1v104.8h147c-6.1 33.8-25.7 63.7-54.4 82.7v68h87.7c51.5-47.4 81.1-117.4 81.1-200.2z"/>
          <path fill="#34A853" d="M272.1 544.3c73.4 0 135.3-24.1 180.4-65.7l-87.7-68c-24.4 16.6-55.9 26-92.6 26-71 0-131.2-47.9-152.8-112.3H28.9v70.1c46.2 91.9 140.3 149.9 243.2 149.9z"/>
          <path fill="#FBBC04" d="M119.3 324.3c-11.4-33.8-11.4-70.4 0-104.2V150H28.9c-38.6 76.9-38.6 167.5 0 244.4l90.4-70.1z"/>
          <path fill="#EA4335" d="M272.1 107.7c38.8-.6 76.3 14 104.4 40.8l77.7-77.7C404.7 24.7 339.8-.5 272.1 0 169.2 0 75.1 58 28.9 150l90.4 70.1c21.5-64.5 81.8-112.4 152.8-112.4z"/>
        </svg>
        <span className="cvp-paycard-gpay-wordmark">Google Pay</span>
      </div>
    );
  }
  if (kind === 'phonepe') {
    return (
      <div className="cvp-paycard cvp-paycard--phonepe" aria-label="PhonePe">
        <span className="cvp-paycard-phonepe-mark" aria-hidden="true">Pe</span>
        <span className="cvp-paycard-phonepe-wordmark">PhonePe</span>
      </div>
    );
  }
  return null;
}

/* ── Step 01 stage: Gulf CV card + 92·PASSING ring + shortlisted toast.
   The CV card reveals on scroll-in; the OLED ring counts 0 → 92 (green
   = passing); the "shortlisted" toast fades up after the card lands.
   Reduced-motion: everything renders at its final state. */
const CV_BAR_WIDTHS = ['88%', '64%', '92%', '72%'];
function Step01CvCard({ revealed }) {
  const reduce = useReducedMotion();
  return (
    <div className="cvp-hiw-cvwrap" aria-hidden="true">
      <motion.div
        className="cvp-hiw-cvcard"
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={revealed ? { opacity: 1, y: 0 } : (reduce ? {} : { opacity: 0, y: 16 })}
        transition={reduce ? { duration: 0.01 } : { duration: 0.6, ease: [0.34, 1.18, 0.64, 1] }}
      >
        <div className="cvp-hiw-cvcard-head">
          <div className="cvp-hiw-cvcard-avatar">LA</div>
          <div className="cvp-hiw-cvcard-id">
            <div className="cvp-hiw-cvcard-name">Layla Al-Hashimi</div>
            <div className="cvp-hiw-cvcard-role">Marketing Manager · Dubai</div>
          </div>
        </div>
        <div className="cvp-hiw-cvcard-bars">
          {CV_BAR_WIDTHS.map((w, i) => (
            <span key={i} className="cvp-hiw-cvcard-bar" style={{ width: w }} />
          ))}
        </div>
        <div className="cvp-hiw-cvcard-skills-label">Skills</div>
        <div className="cvp-hiw-cvcard-chips">
          {['Brand Strategy', 'SEO/SEM', 'Campaigns'].map((s) => (
            <span key={s} className="cvp-hiw-cvcard-chip">{s}</span>
          ))}
        </div>
      </motion.div>

      <div className="cvp-hiw-cvring">
        <OLEDScoreRing score={92} revealed={revealed} size={58} showLabel={false} duration={1100} />
        <span className="cvp-hiw-cvring-label">Passing</span>
      </div>

      <motion.div
        className="cvp-hiw-cvtoast"
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={revealed ? { opacity: 1, y: 0 } : (reduce ? {} : { opacity: 0, y: 8 })}
        transition={reduce ? { duration: 0.01 } : { duration: 0.5, delay: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <span className="cvp-hiw-cvtoast-check">
          <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <span>You’ve been shortlisted — <b>next: panel interview</b></span>
      </motion.div>
    </div>
  );
}

/* ── Step 02 stage: scanning CV doc + OLED ring (counts up to 92) +
   typing input + ATS checks.

   Master cycle (4s = 3s scan + 1s hold). Drives three things in sync:
     1. A green scan line travelling top→bottom of a fake CV doc.
        Content lines below the scan stay dim (0.2); lines above fade up.
     2. The OLED ring's score: 88 during scan, climbs to 92 at scan
        complete, holds 1s, then re-runs. (OLEDScoreRing always counts
        0 → score on score change — that ring-refire reads as "live
        re-scoring".)
     3. The fake-input typing line ("Senior Marketing Lead") types
        char-by-char over ~1.6s starting each cycle.

   Reduced motion: render final state — no scan, no typing, score 92. */
const TYPING_TEXT = 'Senior Marketing Lead';
const DOC_LINE_WIDTHS = [90, 70, 85, 50, 75, 90, 60, 80, 65];
const SCAN_MS = 3000;
const HOLD_MS = 1000;
const CYCLE_MS = SCAN_MS + HOLD_MS;

function Step02Stage({ revealed }) {
  const reduce = useReducedMotion();
  const [scanT, setScanT] = useState(reduce ? 1 : 0);
  const [score, setScore] = useState(reduce ? 92 : 88);
  const [typed, setTyped] = useState(reduce ? TYPING_TEXT.length : 0);

  useEffect(() => {
    if (!revealed || reduce) return;
    let cancelled = false;
    let raf;
    let typingTimer;
    let lastCycleNum = -1;
    const startedAt = performance.now();

    const startTyping = () => {
      clearTimeout(typingTimer);
      setTyped(0);
      let i = 0;
      const typeChar = () => {
        if (cancelled) return;
        i += 1;
        setTyped(i);
        if (i < TYPING_TEXT.length) {
          typingTimer = setTimeout(typeChar, 60);
        }
      };
      typingTimer = setTimeout(typeChar, 360);
    };

    const tick = (now) => {
      if (cancelled) return;
      const elapsed = now - startedAt;
      const cycleNum = Math.floor(elapsed / CYCLE_MS);
      const inCycle = elapsed - cycleNum * CYCLE_MS;

      // New cycle starting? Restart typing + reset score.
      if (cycleNum !== lastCycleNum) {
        lastCycleNum = cycleNum;
        startTyping();
      }

      if (inCycle < SCAN_MS) {
        setScanT(inCycle / SCAN_MS);
        setScore(88);
      } else {
        setScanT(1);
        setScore(92);
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      clearTimeout(typingTimer);
    };
  }, [revealed, reduce]);

  return (
    <div className="cvp-hiw-stage">
      <div className="cvp-hiw-doc-glow" aria-hidden="true" />
      <div className="cvp-hiw-doc" aria-hidden="true">
        <div className="cvp-hiw-doc-head">
          <FileText size={14} color="rgba(255,255,255,0.55)" strokeWidth={2} />
          <div className="cvp-hiw-doc-head-meta">
            <div className="cvp-hiw-doc-head-name" />
            <div className="cvp-hiw-doc-head-role" />
          </div>
        </div>
        <div className="cvp-hiw-doc-lines">
          {DOC_LINE_WIDTHS.map((w, i) => {
            const linePos = (i + 0.5) / DOC_LINE_WIDTHS.length;
            const lit = reduce || scanT > linePos;
            return (
              <div
                key={i}
                className="cvp-hiw-doc-line"
                style={{ width: `${w}%`, opacity: lit ? 1 : 0.2 }}
              />
            );
          })}
        </div>
        <div
          className="cvp-hiw-doc-scan"
          style={{
            top: `${scanT * 100}%`,
            opacity: !reduce && scanT > 0.005 && scanT < 0.99 ? 1 : 0,
          }}
        />
      </div>
      <div className="cvp-hiw-score" aria-live="polite">
        <OLEDScoreRing score={score} revealed={revealed} size={92} showLabel={false} duration={900} />
        <div className="cvp-hiw-score-meta">
          <div className="cvp-hiw-score-label">ATS · Live</div>
          <div className="cvp-hiw-typing-input" aria-hidden="true">
            <span className="cvp-hiw-typing-text">{TYPING_TEXT.slice(0, typed)}</span>
            <span className="cvp-hiw-typing-cursor" />
          </div>
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
    </div>
  );
}

function PaymentCardStack({ revealed }) {
  const reduce = useReducedMotion();
  // Apple Pay starts on top (matches the "fanned card stack with one prominent" intent).
  const [frontIndex, setFrontIndex] = useState(APPLEPAY_INDEX);
  const [hovering, setHovering] = useState(false);

  // Auto-shuffle: every 3.5s, advance frontIndex so the next card rotates to the front.
  // Pause on hover (visitors get to read the active card) and skip entirely on reduced motion.
  useEffect(() => {
    if (!revealed || reduce || hovering) return;
    const id = setInterval(() => {
      setFrontIndex((prev) => (prev + 1) % PAY_CARDS.length);
    }, SHUFFLE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [revealed, reduce, hovering]);

  const effectiveFront = reduce ? APPLEPAY_INDEX : frontIndex;

  return (
    <div
      className="cvp-paystack"
      aria-label="Accepted payment methods"
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
    >
      <div className="cvp-paystack-stage">
        {PAY_CARDS.map((c, i) => {
          const distance = (i - effectiveFront + PAY_CARDS.length) % PAY_CARDS.length;
          const slot = PAY_SLOTS[PAY_SLOTS.length - 1 - distance];
          const isFront = distance === 0;
          const target = { x: slot.x, y: slot.y, rotate: slot.rotate, opacity: 1 };
          const initial = revealed && !reduce
            ? { x: 0, y: 0, rotate: 0, opacity: 1 }
            : target;
          return (
            <motion.div
              key={c.kind}
              className="cvp-paystack-slot"
              data-kind={c.kind}
              style={{ zIndex: slot.z, boxShadow: slot.shadow }}
              initial={initial}
              animate={target}
              transition={reduce
                ? { duration: 0.01 }
                : { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
            >
              <PayCardFace kind={c.kind} isFront={isFront} />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
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
        .cvp-hiw-sub { font-size: clamp(15px, 1.5vw, 17px); line-height: 1.5; color: var(--color-text-secondary, rgba(255,255,255,0.65)); margin: 18px 0 0; max-width: 60ch; }
        .cvp-hiw-grid { position: relative; z-index: 1; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
        @media (max-width: 880px) { .cvp-hiw-grid { grid-template-columns: 1fr; gap: 14px; } }
        .cvp-hiw-rail { position: absolute; top: 64px; left: 11%; right: 11%; height: 1px; background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.10) 8%, rgba(255,255,255,0.10) 92%, transparent 100%); z-index: 0; pointer-events: none; }
        .cvp-hiw-rail::after { content: ""; position: absolute; top: 50%; left: 0; height: 1px; width: 0; background: linear-gradient(90deg, rgba(217,119,6,0.0), rgba(217,119,6,0.85), rgba(217,119,6,0.0)); transform: translateY(-50%); transition: width 1.6s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
        .cvp-hiw[data-in-view="true"] .cvp-hiw-rail::after { width: 100%; }
        @media (max-width: 880px) { .cvp-hiw-rail { display: none; } }
        .cvp-hiw-step { position: relative; background: var(--color-surface-01, #141414); border: 1px solid color-mix(in srgb, var(--color-border, #2a2a2a), transparent 30%); border-radius: var(--radius-md, 18px); padding: 32px 28px 28px; display: flex; flex-direction: column; gap: 14px; min-height: 460px; isolation: isolate; overflow: hidden; transition: border-color 220ms cubic-bezier(0.25, 0.46, 0.45, 0.94), transform 220ms cubic-bezier(0.25, 0.46, 0.45, 0.94), box-shadow 220ms cubic-bezier(0.25, 0.46, 0.45, 0.94); }
        /* Step 02 (doc + scan + ring) and Step 03 (PDF chip + wallet stack) need
           extra room. Rail span is grid child 1, so steps are children 2/3/4. */
        .cvp-hiw-step:nth-child(3),
        .cvp-hiw-step:nth-child(4) { min-height: 520px; }
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

        /* ── Step 01 — Gulf CV card + 92 ring + shortlisted toast ──────── */
        .cvp-hiw-cvwrap { position: relative; margin-top: auto; padding-top: 30px; display: flex; flex-direction: column; gap: 12px; }
        .cvp-hiw-cvcard {
          position: relative;
          background: #f7f5f0; color: #14171d;
          border-radius: 12px; padding: 16px 16px 18px;
          display: flex; flex-direction: column; gap: 12px;
          box-shadow: 0 18px 36px -14px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.6), inset 0 0 0 1px rgba(0,0,0,0.05);
        }
        .cvp-hiw-cvcard-head { display: flex; align-items: center; gap: 10px; }
        .cvp-hiw-cvcard-avatar { width: 34px; height: 34px; border-radius: 50%; background: #e3ded3; color: #6b6256; font-size: 11.5px; font-weight: 700; display: grid; place-items: center; letter-spacing: 0.02em; flex-shrink: 0; }
        .cvp-hiw-cvcard-name { font-size: 13px; font-weight: 700; color: #0a0d12; line-height: 1.1; }
        .cvp-hiw-cvcard-role { font-size: 10px; font-weight: 600; color: #6b7280; margin-top: 2px; }
        .cvp-hiw-cvcard-bars { display: flex; flex-direction: column; gap: 5px; }
        .cvp-hiw-cvcard-bar { height: 4px; border-radius: 2px; background: rgba(0,0,0,0.08); }
        .cvp-hiw-cvcard-skills-label { font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 8px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: #9aa0a6; }
        .cvp-hiw-cvcard-chips { display: flex; flex-wrap: wrap; gap: 6px; }
        .cvp-hiw-cvcard-chip { font-size: 9.5px; font-weight: 600; color: #44474c; background: #ece8df; border: 1px solid rgba(0,0,0,0.06); border-radius: 5px; padding: 3px 8px; }
        .cvp-hiw-cvring { position: absolute; top: 0; right: 8px; z-index: 2; display: flex; flex-direction: column; align-items: center; gap: 3px; }
        .cvp-hiw-cvring-label { font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 8px; font-weight: 700; letter-spacing: 0.16em; text-transform: uppercase; color: #4ade80; }
        .cvp-hiw-cvtoast { display: flex; align-items: center; gap: 9px; padding: 9px 11px; background: rgba(20,20,20,0.92); border: 1px solid rgba(74,222,128,0.28); border-radius: 9px; font-size: 11px; line-height: 1.3; color: rgba(255,255,255,0.82); }
        .cvp-hiw-cvtoast b { color: #fff; font-weight: 600; }
        .cvp-hiw-cvtoast-check { width: 16px; height: 16px; border-radius: 50%; background: rgba(74,222,128,0.16); color: #4ade80; display: grid; place-items: center; flex-shrink: 0; }

        /* ── Step 02 stage — doc + scan + ring + checks ────────────────── */
        .cvp-hiw-stage {
          position: relative; margin-top: auto;
          display: flex; flex-direction: column; gap: 14px;
          isolation: isolate;
        }
        .cvp-hiw-doc-glow {
          position: absolute; inset: -8px -4px;
          background: radial-gradient(ellipse at bottom, rgba(217,119,6,0.10), transparent 60%);
          pointer-events: none; z-index: 0;
        }
        .cvp-hiw-doc {
          position: relative; z-index: 1;
          padding: 12px 14px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: var(--radius-md, 12px);
          overflow: hidden;
          display: flex; flex-direction: column; gap: 7px;
          min-height: 170px;
        }
        .cvp-hiw-doc-head {
          display: flex; align-items: center; gap: 8px;
          padding-bottom: 7px;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
        .cvp-hiw-doc-head-meta { display: flex; flex-direction: column; gap: 3px; flex: 1; }
        .cvp-hiw-doc-head-name { height: 6px; width: 60%; border-radius: 1px; background: rgba(255,255,255,0.18); }
        .cvp-hiw-doc-head-role { height: 4px; width: 40%; border-radius: 1px; background: rgba(255,255,255,0.10); }
        .cvp-hiw-doc-lines { display: flex; flex-direction: column; gap: 6px; }
        .cvp-hiw-doc-line {
          height: 2px;
          background: rgba(255,255,255,0.10);
          border-radius: 1px;
          transition: opacity 200ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        .cvp-hiw-doc-scan {
          position: absolute; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, #4ade80, transparent);
          box-shadow: 0 0 12px rgba(74,222,128,0.4);
          pointer-events: none;
          z-index: 2;
        }
        @media (prefers-reduced-motion: reduce) {
          .cvp-hiw-doc-line { transition: none; }
          .cvp-hiw-doc-scan { display: none; }
        }
        .cvp-hiw-score { position: relative; z-index: 1; display: flex; align-items: center; gap: 16px; padding: 14px 16px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; }
        .cvp-hiw-score-meta { display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 0; }
        .cvp-hiw-score-label { font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 9.5px; letter-spacing: 0.22em; text-transform: uppercase; color: rgba(255,255,255,0.5); font-weight: 600; }
        .cvp-hiw-score-checks { display: flex; flex-direction: column; gap: 3px; }
        .cvp-hiw-score-check { display: flex; align-items: center; gap: 6px; font-size: 11px; color: rgba(255,255,255,0.78); font-variant-numeric: tabular-nums; }
        .cvp-hiw-score-tick { width: 11px; height: 11px; border-radius: 50%; background: rgba(74,222,128,0.16); color: #4ade80; display: grid; place-items: center; flex-shrink: 0; }
        /* Live ATS demo — fake input row that types the sample CV line. */
        .cvp-hiw-typing-input {
          display: inline-flex; align-items: center;
          padding: 5px 9px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 7px;
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 11px; line-height: 1.2; font-weight: 500;
          color: rgba(255,255,255,0.88);
          min-height: 22px; max-width: 100%;
          overflow: hidden; white-space: nowrap;
          font-variant-numeric: tabular-nums;
        }
        .cvp-hiw-typing-text { letter-spacing: -0.005em; }
        .cvp-hiw-typing-cursor {
          display: inline-block;
          width: 5px; height: 11px;
          background: var(--color-accent, #D97706);
          margin-left: 2px;
          animation: cvp-hiw-cursor 1s step-end infinite;
          flex-shrink: 0;
        }
        @keyframes cvp-hiw-cursor {
          0%, 50%   { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .cvp-hiw-typing-cursor { animation: none; opacity: 0.5; }
        }
        .cvp-hiw-pdf { margin-top: auto; display: flex; flex-direction: column; gap: 12px; }
        .cvp-hiw-pdf-chip { display: inline-flex; align-items: center; gap: 10px; padding: 10px 14px; background: rgba(217,119,6,0.10); border: 1px solid rgba(217,119,6,0.28); border-radius: 10px; font-family: ui-monospace, "SF Mono", Menlo, monospace; font-size: 12px; color: #fde68a; letter-spacing: 0.04em; align-self: flex-start; }
        .cvp-hiw-pdf-chip b { color: #fff; font-weight: 700; }
        .cvp-hiw-pdf-pill { font-size: 9.5px; letter-spacing: 0.18em; text-transform: uppercase; padding: 2px 7px; border-radius: 4px; background: rgba(34,197,94,0.18); color: #4ade80; font-weight: 700; }
        .cvp-hiw-paywall { display: flex; flex-direction: column; gap: 14px; padding-top: 14px; border-top: 1px dashed rgba(255,255,255,0.08); }
        /* Marketing copy — body sans, sentence case, italicised so it reads as a human voice. */
        .cvp-hiw-paywall-label {
          font-family: inherit;
          font-size: 13px; font-weight: 500; font-style: italic;
          letter-spacing: 0; text-transform: none;
          color: rgba(255,255,255,0.6);
          line-height: 1.4;
        }

        /* ── Payment card stack (Step 03) ─────────────────────────── */
        .cvp-paystack { width: 100%; display: flex; align-items: center; justify-content: center; padding: 6px 0 12px; }
        .cvp-paystack-stage {
          position: relative; width: 100%; max-width: 240px; height: 124px;
          margin: 0 auto;
        }
        .cvp-paystack-slot {
          position: absolute; top: 50%; left: 50%;
          width: 168px; height: 100px;
          margin-left: -84px; margin-top: -50px;
          border-radius: 12px;
          will-change: transform;
        }
        .cvp-paycard {
          position: relative; width: 100%; height: 100%;
          border-radius: 12px; overflow: hidden;
          font-family: -apple-system, "SF Pro Display", "Inter", system-ui, sans-serif;
          color: #fff; box-sizing: border-box; padding: 12px 14px;
          display: block;
        }
        .cvp-paycard--apple { background: #0a0a0a; box-shadow: inset 0 1px 0 rgba(255,255,255,0.08); }
        /* Ziina keeps purple — its actual brand mark, not a UI accent. */
        .cvp-paycard--ziina { background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); }
        .cvp-paycard--gpay {
          background: #f7f5f0; color: #3C4043;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 5px;
          padding: 0;
        }
        .cvp-paycard--phonepe {
          background: #f7f5f0; color: #2a2d31;
          display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 6px;
          padding: 0;
        }

        /* Apple Pay mark — top-left */
        .cvp-paycard-applemark {
          position: absolute; top: 12px; left: 14px;
          display: inline-flex; align-items: center; gap: 3px;
          font-size: 13px; font-weight: 600; letter-spacing: -0.01em; color: #fff;
          line-height: 1;
        }
        .cvp-paycard-applemark svg { margin-top: -2px; }

        /* Chip rectangle (gold gradient) — Apple Pay */
        .cvp-paycard-chip {
          position: absolute; bottom: 14px; left: 14px;
          width: 24px; height: 16px; border-radius: 3px;
          background: linear-gradient(135deg, #d4af37 0%, #f4cf64 50%, #d4af37 100%);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.4), inset 0 -1px 0 rgba(0,0,0,0.2);
        }

        /* NFC ripple — three concentric arcs from upper-right corner.
           Cards have overflow:hidden so only the visible quadrant shows. */
        .cvp-paycard-nfc {
          position: absolute;
          top: -22px; right: -22px;
          width: 56px; height: 56px;
          border-radius: 50%;
          border: 1.5px solid rgba(255,255,255,0.4);
          opacity: 0;
          transform-origin: 78% 22%;
          animation: cvp-nfc-pulse 2.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) infinite;
          pointer-events: none;
        }
        .cvp-paycard-nfc-1 { animation-delay: 0s; }
        .cvp-paycard-nfc-2 { animation-delay: 0.5s; }
        .cvp-paycard-nfc-3 { animation-delay: 1.0s; }
        @keyframes cvp-nfc-pulse {
          0%   { transform: scale(0.6); opacity: 0.6; }
          80%  { opacity: 0; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .cvp-paycard-nfc { animation: none; opacity: 0; }
        }

        /* Wordmarks */
        .cvp-paycard-wordmark { position: absolute; line-height: 1; }
        .cvp-paycard-wordmark--ziina {
          top: 50%; left: 14px; transform: translateY(-50%);
          font-size: 18px; font-weight: 700; letter-spacing: -0.01em; color: #fff;
        }
        .cvp-paycard-ziina-meta {
          position: absolute; bottom: 12px; left: 14px;
          font-size: 8.5px; font-weight: 600; letter-spacing: 0.04em;
          color: rgba(255,255,255,0.78); text-transform: none;
        }

        /* Google Pay card — cream surface, official 4-colour G. */
        .cvp-paycard-gpay-mark { display: block; }
        .cvp-paycard-gpay-wordmark {
          font-size: 12px; font-weight: 500; letter-spacing: -0.005em;
          color: #3C4043; line-height: 1;
          font-family: 'Inter', -apple-system, "SF Pro Display", system-ui, sans-serif;
        }

        /* PhonePe card — monochrome-leaning (no purple; only Ziina is purple). */
        .cvp-paycard-phonepe-mark {
          width: 26px; height: 26px; border-radius: 7px;
          background: #2a2d31; color: #fff;
          font-size: 11px; font-weight: 700; letter-spacing: -0.02em;
          display: grid; place-items: center;
          font-family: 'Inter', -apple-system, system-ui, sans-serif;
        }
        .cvp-paycard-phonepe-wordmark {
          font-size: 12px; font-weight: 700; letter-spacing: -0.01em;
          color: #2a2d31;
          font-family: 'Inter', -apple-system, "SF Pro Display", system-ui, sans-serif;
        }

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
          From a blank page to an interview-ready PDF — no signup, no card. You only pay once you’re landing interviews.
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

            {s.n === '01' && <Step01CvCard revealed={inView} />}

            {s.n === '02' && <Step02Stage revealed={inView} />}

            {s.n === '03' && (
              <div className="cvp-hiw-pdf">
                <div className="cvp-hiw-pdf-chip" aria-hidden="true">
                  <span><b>my-cv.pdf</b></span>
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>·</span>
                  <span>184 KB</span>
                  <span className="cvp-hiw-pdf-pill">FREE</span>
                </div>
                <div className="cvp-hiw-paywall">
                  <div className="cvp-hiw-paywall-label">Pay in AED only when you’re winning</div>
                  <PaymentCardStack revealed={inView} />
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
        <button type="button" className="cvp-hiw-cta" onClick={onPrimary}>Build my Gulf CV — free →</button>
        <span className="cvp-hiw-cta-aside">
          <span className="cvp-hiw-cta-aside-arrow">↴</span>
          …or tap the floating button anytime.
        </span>
      </div>
    </section>
  );
}
