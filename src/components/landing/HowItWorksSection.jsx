// ============== src/components/landing/HowItWorksSection.jsx ==============
// Ported by hand from the Claude Design "How It Works Section" reference.
// Native stack: React + our dark --color-* tokens (bridged into the design's
// local palette) + CSS transitions. useInView drives the scroll reveal and
// re-fires the cvp-fab-pulse event the landing's FloatingActionButton listens
// for. Nothing is imported from the design's HTML/Babel runtime.
//
// Deviations from the raw design, for our constitution:
//   • No-purple rule — only Ziina keeps its brand purple. The Google Pay /
//     PhonePe card + its "Pe" mark are rendered neutral (no lavender card,
//     no #5F259F badge).
//   • Marketing rule — "Recruiter-trusted" softened to "Gulf-tested" (no
//     unverifiable social-proof claim).
//   • The design's own fixed .fab is omitted; the app already renders
//     FloatingActionButton on the landing.
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useInView } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

function Mono({ children, style, className }) {
  return <span className={className} style={{ fontFamily: 'var(--mono)', ...style }}>{children}</span>;
}
function Check({ size = 12, color = '#34D399', w = 2.4 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>;
}
function Arrow({ size = 16, color = '#0A0A0A' }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7" /></svg>;
}
const StepIco = {
  build: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M8 8h8M8 12h8M8 16h5" /></svg>,
  score: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12h3l2.5-6 4 13 2.5-7H21" /></svg>,
  apply: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v11" /><path d="M7.5 10.5L12 15l4.5-4.5" /><path d="M5 20h14" /></svg>,
};

function prefersReduced() {
  return typeof window !== 'undefined'
    && window.matchMedia
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function useTilt(maxX = 9, maxY = 13) {
  const ref = useRef(null);
  const onMove = useCallback((e) => {
    const el = ref.current; if (!el) return;
    const b = el.getBoundingClientRect();
    el.style.setProperty('--rx', (-((e.clientY - b.top) / b.height - 0.5) * maxX * 2).toFixed(2) + 'deg');
    el.style.setProperty('--ry', (((e.clientX - b.left) / b.width - 0.5) * maxY * 2).toFixed(2) + 'deg');
  }, [maxX, maxY]);
  const onLeave = useCallback(() => {
    const el = ref.current; if (!el) return;
    el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg');
  }, []);
  return { ref, onMove, onLeave };
}

/* ───────── STEP 01 · Gulf CV card + 92 PASSING ring + shortlisted toast ───────── */
function TemplateCard({ go }) {
  const { ref, onMove, onLeave } = useTilt(4, 7);
  return (
    <div className="hiw-visual hiw-tpl1" onMouseMove={onMove} onMouseLeave={onLeave}>
      <div ref={ref} className="hiw-tilt" style={{ position: 'absolute', inset: 0 }}>
        <div className="hiw-cvcard" style={{ transform: go ? 'none' : 'translateY(10px)' }}>
          <div className="hiw-cv-top">
            <span className="hiw-cv-av">LA</span>
            <div><div className="hiw-cv-name">Layla Al-Hashimi</div><div className="hiw-cv-role">Marketing Manager · Dubai</div></div>
          </div>
          <div className="hiw-cv-bars"><span style={{ width: '88%' }} /><span style={{ width: '66%' }} /></div>
          <div className="hiw-cv-lbl">SKILLS</div>
          <div className="hiw-cv-chips"><span>Brand Strategy</span><span>SEO/SEM</span><span>Campaigns</span></div>
          <div className="hiw-cv-lbl">EXPERIENCE</div>
          <div className="hiw-cv-bars"><span style={{ width: '82%' }} /><span style={{ width: '92%' }} /></div>
        </div>
        <div className="hiw-pass-ring" style={{ transform: go ? 'none' : 'scale(0.82)' }}>
          <span className="hiw-pr-num">92</span><span className="hiw-pr-lbl">PASSING</span>
        </div>
        <div className="hiw-short-toast" style={{ transform: go ? 'none' : 'translateY(8px)' }}>
          <span className="hiw-st-ic"><Check size={12} color="#34D399" w={3} /></span>
          <div><div className="hiw-st-t">You&rsquo;ve been shortlisted</div><div className="hiw-st-s">Next: panel interview</div></div>
        </div>
      </div>
    </div>
  );
}

/* ───────── STEP 02 · live ATS score ───────── */
const CHECKS = ['keywords matched', 'format integrity', 'section order'];
const ATS_TARGET = 92;
function ScoreVisual({ go }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!go) return;
    if (prefersReduced()) { setVal(ATS_TARGET); return; }
    const start = Date.now(); let id;
    const loop = () => {
      const k = Math.min(1, (Date.now() - start) / 1300);
      setVal(Math.round((1 - Math.pow(1 - k, 3)) * ATS_TARGET));
      if (k < 1) id = setTimeout(loop, 28);
    };
    loop();
    return () => clearTimeout(id);
  }, [go]);
  const R = 34, C = 2 * Math.PI * R, off = C - (val / 100) * C;
  return (
    <div className="hiw-visual" style={{ marginTop: 'auto', display: 'grid', gap: 12 }}>
      <div className="hiw-doc-mini">
        <div className="hiw-doc-row"><span className="hiw-doc-ic">▤</span><span className="hiw-doc-field">Senior Marketing Lead<span className="hiw-caret" /></span></div>
        <div className="hiw-doc-lines">
          <span style={{ width: '92%' }} /><span className="hit" style={{ width: '78%' }} /><span style={{ width: '86%' }} />
          <span className="hit" style={{ width: '64%' }} /><span style={{ width: '72%' }} />
        </div>
      </div>
      <div className="hiw-ats-panel">
        <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
          <div style={{ position: 'absolute', inset: 10, borderRadius: '50%', boxShadow: go ? '0 0 26px rgba(29,158,117,0.32)' : 'none', transition: 'box-shadow .5s var(--ease)' }} />
          <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="40" cy="40" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
            <circle cx="40" cy="40" r={R} fill="none" stroke="var(--green)" strokeWidth="6" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={off} style={{ transition: 'stroke-dashoffset 80ms linear' }} />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
            <span style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.04em', color: '#fff', fontVariantNumeric: 'tabular-nums' }}>{val}</span>
          </div>
        </div>
        <div style={{ display: 'grid', gap: 6, flex: 1 }}>
          <Mono style={{ fontSize: 8.5, letterSpacing: '0.2em', color: 'var(--green)' }}>ATS · LIVE</Mono>
          {CHECKS.map((c, i) => (
            <div key={c} className="hiw-chip" style={{ display: 'flex', alignItems: 'center', gap: 8, transitionDelay: (0.4 + i * 0.18) + 's', transform: go ? 'none' : 'translateX(-8px)' }}>
              <Check size={11} /><span style={{ fontSize: 11.5, color: 'var(--text)' }}>{c}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ───────── STEP 03 · download + fast payment shuffle ─────────
   Only Ziina carries purple (its brand mark). Apple Pay is dark; the
   Google Pay / PhonePe card stays neutral per the no-purple rule. */
const PAY = [
  { id: 'ziina', kind: 'ziina', bg: 'linear-gradient(150deg,#8A4BFF,#4A1FB0 72%,#2C0F86)' },
  { id: 'apple', kind: 'apple', bg: 'linear-gradient(155deg,#2B2B2F,#0A0A0C)' },
  { id: 'gpp',   kind: 'gpp',   bg: 'linear-gradient(150deg,#F6F4EF,#E8E6E0)' },
];
function Chip({ light }) {
  return (
    <span style={{ width: 26, height: 19, borderRadius: 4, flexShrink: 0,
      background: light ? 'linear-gradient(135deg,#D9B45A,#B8923D)' : 'linear-gradient(135deg,#E7C56A,#C49A45)',
      display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 1, padding: 3, opacity: 0.95 }}>
      {[0, 1, 2, 3].map((i) => <span key={i} style={{ background: 'rgba(0,0,0,0.18)', borderRadius: 1 }} />)}
    </span>
  );
}
function ZiinaStar({ s = 16 }) {
  return (
    <span style={{ position: 'relative', width: s, height: s, display: 'inline-block', flexShrink: 0 }}>
      <span style={{ position: 'absolute', inset: '16%', background: '#fff', borderRadius: 2 }} />
      <span style={{ position: 'absolute', inset: '16%', background: '#fff', borderRadius: 2, transform: 'rotate(45deg)' }} />
    </span>
  );
}
function AppleGlyph({ s = 16 }) {
  return (
    <svg width={s} height={s * 1.14} viewBox="0 0 22 25" fill="#fff" style={{ flexShrink: 0 }}>
      <path d="M15.3 13.2c0-2.4 2-3.5 2-3.6-1.1-1.6-2.8-1.8-3.4-1.8-1.5-.15-2.8.85-3.5.85s-1.8-.83-3-.83c-1.5 0-2.9.9-3.7 2.3-1.6 2.8-.4 6.9 1.1 9.2.8 1.1 1.7 2.3 2.9 2.25 1.15-.05 1.6-.75 3-.75s1.8.75 3 .73c1.25-.02 2.05-1.1 2.8-2.2.55-.8.8-1.25 1.25-2.15-3.2-1.25-3.45-4.9-.45-6.05z" />
      <path d="M13 6.2c.62-.8 1.05-1.85.92-2.95-.9.04-2 .62-2.65 1.4-.58.72-1.07 1.8-.93 2.85.98.07 2.03-.5 2.66-1.3z" />
    </svg>
  );
}
function PayCard({ b }) {
  if (b.kind === 'ziina') return (
    <div className="hiw-pcard" style={{ background: b.bg, color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}>
      <div className="hiw-pc-top"><Chip /><Mono style={{ fontSize: 9, letterSpacing: '0.16em', opacity: 0.75 }}>AED</Mono></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ZiinaStar s={17} /><span style={{ fontSize: 19, fontWeight: 700, letterSpacing: '0.14em' }}>ZIINA</span></div>
      <div className="hiw-pc-bot"><Mono style={{ fontSize: 9.5, opacity: 0.6 }}>•••• 0049</Mono><Mono style={{ fontSize: 8.5, opacity: 0.55 }}>UAE wallet</Mono></div>
    </div>
  );
  if (b.kind === 'apple') return (
    <div className="hiw-pcard" style={{ background: b.bg, color: '#fff', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="hiw-pc-top"><Chip /><Mono style={{ fontSize: 9, letterSpacing: '0.16em', opacity: 0.7 }}>AED</Mono></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}><AppleGlyph s={18} /><span style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-0.01em' }}>Pay</span></div>
      <div className="hiw-pc-bot"><Mono style={{ fontSize: 9.5, opacity: 0.55 }}>•••• 0049</Mono><Mono style={{ fontSize: 8.5, opacity: 0.5 }}>one tap</Mono></div>
    </div>
  );
  return (
    <div className="hiw-pcard" style={{ background: b.bg, color: '#202124', border: '1px solid rgba(0,0,0,0.06)' }}>
      <div className="hiw-pc-top"><Chip light /><Mono style={{ fontSize: 9, letterSpacing: '0.16em', opacity: 0.5 }}>AED</Mono></div>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <span className="hiw-ppe">पे</span>
        <span className="hiw-gp"><span className="hiw-gp-g">G</span><span style={{ fontWeight: 600, fontSize: 12, color: '#5f6368' }}>Pay</span></span>
      </div>
      <div className="hiw-pc-bot"><span style={{ fontSize: 9.5, fontWeight: 600, color: '#3c4043' }}>Google&nbsp;Pay · PhonePe</span></div>
    </div>
  );
}
const POS = [{ x: 0, y: 0, r: 0, s: 1 }, { x: 18, y: 14, r: 5, s: 0.94 }, { x: 34, y: 28, r: 9, s: 0.88 }];
function PaymentDeck() {
  const N = PAY.length;
  const [front, setFront] = useState(0);
  useEffect(() => {
    if (prefersReduced()) return;
    const id = setInterval(() => setFront((f) => (f + 1) % N), 900);
    return () => clearInterval(id);
  }, [N]);
  return (
    <div className="hiw-deck">
      {PAY.map((b, i) => {
        const rank = (i - front + N) % N;
        const p = POS[rank];
        return (
          <div key={b.id} className="hiw-pay-card"
            style={{ zIndex: N - rank, transform: `translate(${p.x}px, ${p.y}px) rotate(${p.r}deg) scale(${p.s})`, opacity: rank === N - 1 ? 0.92 : 1 }}>
            <PayCard b={b} />
          </div>
        );
      })}
    </div>
  );
}
function ApplyVisual() {
  return (
    <div className="hiw-visual" style={{ marginTop: 'auto', display: 'grid', gap: 14 }}>
      <div className="hiw-pdf-chip">
        <span className="hiw-pdf-ic"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3v5h5" /><path d="M7 3h7l5 5v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" /></svg></span>
        <Mono style={{ fontSize: 11, fontWeight: 600, color: '#fff' }}>my-cv.pdf</Mono>
        <Mono style={{ fontSize: 10, color: 'var(--muted)' }}>184&nbsp;KB</Mono>
        <span className="hiw-pdf-free">FREE</span>
      </div>
      <div className="hiw-pay-line">Pay in AED or INR — <em>only when you&rsquo;re winning</em> — Ziina, Apple Pay, Google Pay &amp; PhonePe.</div>
      <PaymentDeck />
    </div>
  );
}

/* ───────── steps ───────── */
const STEPS = [
  { n: '01', icon: 'build',
    title: 'Pick a Gulf-tested template',
    desc: 'Gulf-tested layouts for the UAE, KSA & Qatar — tuned for tech, finance, healthcare and hospitality. Pick one, make it yours.',
    Visual: TemplateCard },
  { n: '02', icon: 'score',
    title: 'Fill it in — see your score climb',
    desc: 'Type as you go and watch what passes: keywords, formatting, section order. We flag what to fix, live. No signup needed.',
    Visual: ScoreVisual },
  { n: '03', icon: 'apply',
    title: <>Download free<br />pay when you win</>,
    desc: 'Export a clean, ATS-ready PDF for free. Land the interview, then pay in AED with Ziina, Apple Pay, Google Pay or PhonePe.',
    Visual: ApplyVisual, final: true },
];

function Step({ s, i, go }) {
  const Visual = s.Visual;
  return (
    <div className={'hiw-step reveal' + (s.final ? ' hiw-step--final' : '')} style={{ transitionDelay: (i * 0.12) + 's' }}>
      <div className="hiw-step-head">
        <span className="hiw-step-num">{s.n}</span>
        <span className="hiw-step-icon">{StepIco[s.icon]}</span>
      </div>
      <h3 className="hiw-step-title">{s.title}</h3>
      <p className="hiw-step-desc">{s.desc}</p>
      <Visual go={go} />
    </div>
  );
}

/* ───────── section ───────── */
export default function HowItWorksSection() {
  const navigate = useNavigate();
  const ref = useRef(null);
  const inView = useInView(ref, { amount: 0.15, once: true });
  const go = inView;

  useEffect(() => {
    if (!inView) return;
    window.dispatchEvent(new CustomEvent('cvp-fab-pulse'));
  }, [inView]);

  return (
    <section ref={ref} className="hiw" data-in={go ? 'true' : 'false'} aria-labelledby="cvp-hiw-h" data-testid="how-it-works">
      <style>{`
        .hiw{
          --bg: var(--color-surface-00, #0A0A0A);
          --s1: var(--color-surface-01, #141414);
          --s2: var(--color-surface-02, #1C1C1C);
          --text: var(--color-text-primary, #FFFFFF);
          --muted: var(--color-text-secondary, #A0A0A0);
          --border: var(--color-border, #2A2A2A);
          --amber: var(--color-accent, #D97706);
          --amber-lit:#F59E0B; --green:#1D9E75; --green-lit:#34D399; --blue:#378ADD;
          --ease:cubic-bezier(.4,0,.2,1); --overshoot:cubic-bezier(.34,1.46,.5,1);
          --mono: ui-monospace, "SF Mono", Menlo, monospace;
          --sans: -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif;
          position:relative; max-width:1200px; margin:0 auto; padding:110px 24px 124px; box-sizing:border-box; overflow:hidden;
          font-family:var(--sans); color:var(--text);
        }
        @media (max-width:880px){ .hiw{ padding:72px 20px 88px; } }
        .hiw::before{ content:""; position:absolute; right:-160px; bottom:-160px; width:560px; height:560px;
          background:radial-gradient(closest-side, rgba(217,119,6,0.13), transparent 72%); pointer-events:none; z-index:0; }

        .hiw-head{ position:relative; z-index:1; max-width:760px; margin:0 0 56px; }
        @media (max-width:880px){ .hiw-head{ margin-bottom:40px; } }
        .hiw-eyebrow{ display:inline-flex; align-items:center; gap:10px; font-family:var(--mono); font-size:11px; letter-spacing:0.24em; color:var(--amber); font-weight:600; margin:0 0 18px; }
        .hiw-eyebrow::before{ content:""; width:24px; height:1px; background:var(--amber); }
        .hiw-h{ font-size:clamp(36px,5.4vw,60px); line-height:0.98; letter-spacing:-0.035em; font-weight:600; margin:0; color:var(--color-text-primary,#fff); text-wrap:balance; }
        .hiw-h .em{ color:var(--amber-lit); }
        .hiw-sub{ font-size:clamp(15px,1.5vw,18px); line-height:1.55; color:var(--muted); font-weight:400; margin:18px 0 0; max-width:54ch; }

        .reveal{ transition:transform .55s var(--ease); }
        .hiw[data-in="false"] .reveal{ transform:translateY(20px); }

        .hiw-grid{ position:relative; z-index:1; display:grid; grid-template-columns:repeat(3,1fr); gap:20px; }
        @media (max-width:880px){ .hiw-grid{ grid-template-columns:1fr; gap:16px; } }
        .hiw-rail{ position:absolute; top:62px; left:16.5%; right:16.5%; height:1px; z-index:0; pointer-events:none;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,0.10) 12%,rgba(255,255,255,0.10) 88%,transparent); }
        .hiw-rail::after{ content:""; position:absolute; inset:0 auto 0 0; height:1px; width:0;
          background:linear-gradient(90deg,rgba(217,119,6,0),var(--amber),rgba(217,119,6,0)); transition:width 1.7s var(--ease) .35s; }
        .hiw[data-in="true"] .hiw-rail::after{ width:100%; }
        @media (max-width:880px){ .hiw-rail{ display:none; } }

        .hiw-step{ position:relative; background:var(--s1); border:1px solid var(--border); border-radius:18px; padding:28px 24px 24px;
          display:flex; flex-direction:column; gap:10px; min-height:436px; isolation:isolate; overflow:hidden;
          transition:border-color 240ms var(--ease), transform 240ms var(--ease), box-shadow 240ms var(--ease), opacity .55s var(--ease); }
        .hiw-step:hover{ border-color:color-mix(in srgb,var(--amber),transparent 56%); transform:translateY(-3px); box-shadow:0 24px 48px -22px rgba(0,0,0,0.7); }
        .hiw[data-in="false"] .hiw-step:hover{ transform:translateY(20px); }
        .hiw-step--final{ background:radial-gradient(130% 80% at 100% 0%, rgba(217,119,6,0.10), transparent 58%), var(--s1); border-color:color-mix(in srgb,var(--amber),transparent 52%); }

        .hiw-step-head{ display:flex; align-items:flex-start; justify-content:space-between; }
        .hiw-step-num{ font-family:var(--mono); font-size:46px; line-height:0.9; font-weight:600; letter-spacing:-0.04em; color:var(--color-text-primary,#fff); }
        .hiw-step--final .hiw-step-num{ color:var(--amber-lit); }
        @supports (-webkit-background-clip: text) or (background-clip: text) {
          .hiw-step-num{ background:linear-gradient(180deg,var(--color-text-primary,#fff) 0%,var(--color-text-secondary,rgba(255,255,255,0.32)) 100%); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
          .hiw-step--final .hiw-step-num{ background:linear-gradient(180deg,var(--amber-lit) 0%,var(--amber) 100%); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
        }
        .hiw-step-icon{ width:34px; height:34px; border-radius:9px; border:1px solid var(--border); background:rgba(255,255,255,0.03);
          display:grid; place-items:center; color:var(--muted); }
        .hiw-step--final .hiw-step-icon{ border-color:rgba(217,119,6,0.4); background:rgba(217,119,6,0.1); color:var(--amber-lit); }

        .hiw-step-title{ font-size:19px; font-weight:600; letter-spacing:-0.012em; line-height:1.25; margin:8px 0 0; color:var(--color-text-primary,#fff); text-wrap:balance; }
        .hiw-step-desc{ font-size:13.5px; line-height:1.55; color:var(--muted); font-weight:400; margin:0 0 4px; }

        .hiw-chip{ transition:transform .4s var(--ease); }
        .hiw-tilt{ transform-style:preserve-3d; transform:rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg)); transition:transform .3s var(--ease); }

        /* step 1 — CV template card */
        .hiw-tpl1{ position:relative; height:240px; margin-top:auto; perspective:900px; }
        .hiw-cvcard{ position:absolute; left:2px; right:34px; top:18px; background:#F7F6F3; border-radius:14px; padding:14px 14px 16px; color:#16181d;
          box-shadow:0 24px 50px -24px rgba(0,0,0,0.75); transition:transform .5s var(--overshoot); }
        .hiw-cv-top{ display:flex; align-items:center; gap:11px; }
        .hiw-cv-av{ width:36px; height:36px; border-radius:50%; background:#DBDDE2; color:#5b6170; display:grid; place-items:center; font-size:12px; font-weight:700; flex-shrink:0; }
        .hiw-cv-name{ font-size:13.5px; font-weight:700; letter-spacing:-0.01em; }
        .hiw-cv-role{ font-size:10px; color:#7a7f8a; margin-top:2px; }
        .hiw-cv-bars{ display:grid; gap:6px; margin:10px 0; }
        .hiw-cv-bars span{ height:7px; border-radius:4px; background:#E7E5E0; display:block; }
        .hiw-cv-lbl{ font-size:8px; letter-spacing:0.16em; color:#A2A0A8; font-weight:700; margin:8px 0 6px; }
        .hiw-cv-chips{ display:flex; gap:6px; flex-wrap:wrap; }
        .hiw-cv-chips span{ font-size:9.5px; color:#3a3d44; background:#EDEBE6; border-radius:6px; padding:4px 8px; }
        .hiw-pass-ring{ position:absolute; right:0; top:0; width:64px; height:64px; border-radius:50%; background:#0D1411;
          border:1px solid rgba(29,158,117,0.4); display:grid; place-items:center; box-shadow:0 0 30px rgba(29,158,117,0.32); transition:transform .5s var(--overshoot); }
        .hiw-pr-num{ font-size:21px; font-weight:700; color:var(--green-lit); line-height:1; }
        .hiw-pr-lbl{ font-size:6.5px; letter-spacing:0.18em; color:var(--green); margin-top:3px; font-weight:600; }
        .hiw-short-toast{ position:absolute; left:0; bottom:0; display:flex; gap:9px; align-items:center; background:#171717; border:1px solid var(--border);
          border-radius:11px; padding:8px 12px; box-shadow:0 16px 30px -14px rgba(0,0,0,0.75); transition:transform .5s var(--ease); }
        .hiw-st-ic{ width:22px; height:22px; border-radius:50%; background:rgba(29,158,117,0.16); display:grid; place-items:center; flex-shrink:0; }
        .hiw-st-t{ font-size:11px; font-weight:600; color:#fff; }
        .hiw-st-s{ font-size:9.5px; color:var(--muted); margin-top:1px; }

        /* step 3 — payment cards */
        .hiw-pcard{ width:100%; height:100%; border-radius:13px; padding:12px 14px; display:flex; flex-direction:column; justify-content:space-between;
          box-shadow:0 18px 36px -14px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.14); }
        .hiw-pc-top,.hiw-pc-bot{ display:flex; align-items:center; justify-content:space-between; }
        .hiw-ppe{ width:30px; height:30px; border-radius:50%; background:#2A2D31; color:#fff; font-size:14px; font-weight:700; display:grid; place-items:center; z-index:2; box-shadow:0 2px 6px rgba(0,0,0,0.2); }
        .hiw-gp{ height:30px; border-radius:15px; background:#fff; border:1px solid #e4e4e7; display:flex; align-items:center; gap:3px; padding:0 11px 0 8px; margin-left:-9px; box-shadow:0 1px 4px rgba(0,0,0,0.14); }
        .hiw-gp-g{ font-weight:700; font-size:14px; color:#4285F4; }
        @supports (-webkit-background-clip: text) or (background-clip: text) {
          .hiw-gp-g{ background:linear-gradient(90deg,#4285F4,#EA4335 38%,#FBBC05 68%,#34A853); -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; }
        }

        /* step 2 */
        .hiw-doc-mini{ background:#0C0C0C; border:1px solid var(--border); border-radius:11px; padding:11px 12px; display:grid; gap:9px; }
        .hiw-doc-row{ display:flex; align-items:center; gap:8px; }
        .hiw-doc-ic{ font-size:11px; color:var(--muted); }
        .hiw-doc-field{ flex:1; font-size:11px; color:#fff; background:#161616; border:1px solid var(--border); border-radius:6px; padding:5px 8px; display:flex; align-items:center; }
        .hiw-caret{ width:1.5px; height:12px; background:var(--amber); margin-left:2px; animation:hiw-bl 1s steps(2) infinite; }
        @keyframes hiw-bl{ 50%{ opacity:0; } }
        .hiw-doc-lines{ display:grid; gap:6px; }
        .hiw-doc-lines span{ height:4px; border-radius:2px; background:rgba(255,255,255,0.1); }
        .hiw-doc-lines span.hit{ background:linear-gradient(90deg, rgba(29,158,117,0.8), rgba(29,158,117,0.15)); }
        .hiw-ats-panel{ display:flex; align-items:center; gap:14px; background:#0C0C0C; border:1px solid var(--border); border-radius:11px; padding:12px 14px; }

        /* step 3 */
        .hiw-pdf-chip{ display:inline-flex; align-items:center; gap:8px; align-self:flex-start; padding:7px 11px; border-radius:9px;
          border:1px solid rgba(217,119,6,0.3); background:rgba(217,119,6,0.08); }
        .hiw-pdf-ic{ display:grid; place-items:center; }
        .hiw-pdf-free{ font-family:var(--mono); font-size:8.5px; font-weight:700; letter-spacing:0.14em; color:#04130d; background:var(--green-lit); padding:2px 6px; border-radius:4px; }
        .hiw-pay-line{ font-size:12px; line-height:1.5; color:var(--muted); }
        .hiw-pay-line em{ color:var(--amber-lit); font-style:italic; }
        .hiw-deck{ position:relative; height:128px; margin-top:2px; }
        .hiw-pay-card{ position:absolute; left:6px; top:4px; width:182px; height:114px; transition:transform .34s var(--overshoot), opacity .34s var(--ease); will-change:transform; }
        @media (max-width:360px){ .hiw-pay-card{ width:168px; } }

        @media (prefers-reduced-motion:reduce){ .reveal,.hiw-chip,.hiw-tilt,.hiw-rail::after,.hiw-step,.hiw-pay-card,.hiw-caret,.hiw-cvcard,.hiw-pass-ring,.hiw-short-toast{ transition:none !important; animation:none !important; } }

        .hiw-cta-row{ position:relative; z-index:1; margin-top:44px; display:flex; flex-wrap:wrap; align-items:center; gap:18px; }
        @media (max-width:880px){ .hiw-cta-row{ margin-top:30px; } }
        .hiw-cta{ display:inline-flex; align-items:center; gap:10px; background:var(--amber); color:#0A0A0A; border:0; padding:15px 24px; border-radius:999px;
          font-family:var(--sans); font-size:15px; font-weight:600; cursor:pointer; box-shadow:0 0 0 1px rgba(245,158,11,0.4), 0 10px 30px -8px rgba(217,119,6,0.5);
          transition:transform 160ms var(--ease), filter 160ms var(--ease); }
        .hiw-cta:hover{ filter:brightness(0.96); transform:translateY(-1px); }
        .hiw-cta:focus-visible{ outline:2px solid var(--amber); outline-offset:3px; }
        @media (prefers-reduced-motion:reduce){ .hiw-cta{ transition:none; } }
        .hiw-aside{ display:inline-flex; align-items:center; gap:8px; font-size:13px; color:var(--muted); }
        .hiw-aside .a{ color:var(--amber-lit); font-weight:600; }
      `}</style>

      <div className="hiw-head">
        <div className="hiw-eyebrow reveal">how it works</div>
        <h2 id="cvp-hiw-h" className="hiw-h reveal" style={{ transitionDelay: '.04s' }}>Three steps. <span className="em">Five minutes.</span></h2>
        <p className="hiw-sub reveal" style={{ transitionDelay: '.1s' }}>From a blank page to an interview-ready PDF — no signup, no card. You only pay once you&rsquo;re landing interviews.</p>
      </div>

      <div className="hiw-grid">
        <span className="hiw-rail" aria-hidden="true" />
        {STEPS.map((s, i) => <Step key={s.n} s={s} i={i} go={go} />)}
      </div>

      <div className="hiw-cta-row reveal" style={{ transitionDelay: '.44s' }}>
        <button className="hiw-cta" type="button" onClick={() => navigate('/builder')}>Build my Gulf CV — free <Arrow /></button>
        <span className="hiw-aside"><span className="a">↳</span> …or tap the floating button anytime.</span>
      </div>
    </section>
  );
}
