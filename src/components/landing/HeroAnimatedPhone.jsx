/* HeroAnimatedPhone — direct port of landing-hero.jsx HeroBillboard
   from the Claude Design bundle (5JQJeKOZMfC0rU1_9PkL2Q). Auto-loops
   through 4 phone states (CV → Inbox → WhatsApp → Calendar) every 3.2s
   using framer-motion. Body kept verbatim from the design export — only
   imports were rewritten to ES modules (window.React/window.Motion →
   real imports) and CSS was scoped via a <style> block. The class names
   match the bundle's landing.css so styling is intentional, not
   improvised. */

import React, {
  useState as useHS,
  useEffect as useHE,
  useRef as useHR,
  useMemo as useHM,
} from "react";
import { motion as HMotion, useReducedMotion } from "framer-motion";

/* Treats hardwareConcurrency<4 or deviceMemory<4 as a low-end signal.
   Cycle slows from 3.2s → 4.5s per state on those devices so each
   transition has more breathing room and the GPU gets idle frames
   between cross-fades. Both APIs are best-effort; defaults to fast on
   browsers that don't expose them (Safari/iOS for deviceMemory). */
function isLowEndDevice() {
  if (typeof navigator === "undefined") return false;
  try {
    const cores = navigator.hardwareConcurrency || 8;
    const memory = navigator.deviceMemory || 8;
    return cores < 4 || memory < 4;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------
   STATE 1 — Layla's CV (the FULL original — generic orgs only)
------------------------------------------------------------------ */
function HeroStateCV() {
  return (
    <div className="cvp-h-state cvp-h-cv-v2">
      <div className="cvp-cv2-top">
        <div className="cvp-cv2-photo" aria-hidden></div>
        <div className="cvp-cv2-contact">
          <div>Dubai, UAE</div>
          <div>+971 50 000 0000</div>
        </div>
      </div>

      <div className="cvp-cv2-name"><b>Layla Al-Hashimi</b>, Marketing Strategist</div>

      <p className="cvp-cv2-profile">
        GCC-focused marketing strategist specialising in brand growth, digital campaigns, and market entry across the Middle East.
      </p>

      <div className="cvp-cv2-h">Experience</div>

      <div className="cvp-cv2-job">
        <div className="cvp-cv2-jobline">
          <span className="role">Marketing Manager</span>
          <span className="dates">Mar 2024 - Present</span>
        </div>
        <ul className="cvp-cv2-bullets">
          <li>Led GCC brand campaigns across 3 markets</li>
          <li>Grew social following by 40% in 12 months</li>
          <li>Managed $500K annual marketing budget</li>
        </ul>
      </div>

      <div className="cvp-cv2-job">
        <div className="cvp-cv2-jobline">
          <span className="role">Brand Strategist, JWT MENA</span>
          <span className="dates">Dec 2021 - Mar 2024</span>
        </div>
        <ul className="cvp-cv2-bullets">
          <li>Developed regional campaigns for FMCG clients</li>
          <li>Delivered 3 award-winning brand launches</li>
        </ul>
      </div>

      <div className="cvp-cv2-cols">
        <div className="cvp-cv2-col">
          <div className="cvp-cv2-h">Skills</div>
          <ul className="cvp-cv2-list">
            <li>Brand Strategy</li>
            <li>Digital Marketing</li>
            <li>SEO/SEM</li>
            <li>Campaign Management</li>
          </ul>
        </div>
        <div className="cvp-cv2-col">
          <div className="cvp-cv2-h">Languages</div>
          <ul className="cvp-cv2-list">
            <li>Arabic (Native)</li>
            <li>English (Fluent)</li>
          </ul>
        </div>
      </div>

      <div className="cvp-cv2-h">Education</div>
      <div className="cvp-cv2-edu">
        BSc Marketing - American University of Beirut, 2020
      </div>
    </div>);

}

/* ------------------------------------------------------------------
   STATE 2 — Inbox: Interview confirmed (simple dark cards)
------------------------------------------------------------------ */
function HeroStateInbox() {
  return (
    <div className="cvp-h-state cvp-h-inbox">
      <div className="cvp-h-inbox-head">
        <div className="cvp-h-inbox-title">Inbox</div>
        <div className="cvp-h-inbox-sub">3 new this morning</div>
      </div>

      <div className="cvp-h-inbox-list">
        <div className="cvp-h-inbox-card top">
          <div className="cvp-h-inbox-row">
            <span className="cvp-h-inbox-from">Recruiter · Aviation</span>
            <span className="cvp-h-inbox-time">10:46 AM</span>
          </div>
          <div className="cvp-h-inbox-subj">Interview confirmed — Senior Marketing Lead</div>
          <div className="cvp-h-inbox-body">
            Hi Layla, looking forward to meeting you Tuesday at 10:00 AM. Calendar invite attached.
          </div>
          <div className="cvp-h-inbox-flag">
            <svg viewBox="0 0 24 24" width="11" height="11" aria-hidden>
              <path d="M5 12.5l4.5 4.5L19 7" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Confirmed · Tue 10 AM</span>
          </div>
        </div>

        <div className="cvp-h-inbox-card">
          <div className="cvp-h-inbox-row">
            <span className="cvp-h-inbox-from">Recruiter · Banking</span>
            <span className="cvp-h-inbox-time">09:12 AM</span>
          </div>
          <div className="cvp-h-inbox-subj">Re: Application — Marketing Director</div>
          <div className="cvp-h-inbox-body">
            Thanks for your CV. We'd love to schedule an introductory call this week.
          </div>
        </div>

        <div className="cvp-h-inbox-card dim">
          <div className="cvp-h-inbox-row">
            <span className="cvp-h-inbox-from">Recruiter · Hospitality</span>
            <span className="cvp-h-inbox-time">Yesterday</span>
          </div>
          <div className="cvp-h-inbox-subj">Shortlisted — Brand Manager role</div>
          <div className="cvp-h-inbox-body">
            You've been shortlisted. Next step: panel interview with the regional team.
          </div>
        </div>
      </div>
    </div>);

}

/* ------------------------------------------------------------------
   STATE 3 — WhatsApp from a generic recruiter (the WIN)
------------------------------------------------------------------ */
function HeroStateWhatsApp() {
  return (
    <div className="cvp-h-state cvp-h-wa">
      <div className="cvp-h-wa-bar">
        <div className="av">RC</div>
        <div className="who">
          <div className="nm">Recruiter</div>
          <div className="org">online</div>
        </div>
      </div>
      <div className="cvp-h-wa-body">
        <div className="cvp-h-wa-banner">✦ Today</div>
        <div className="cvp-h-wa-bubble">
          Hi <b>Layla</b> 👋
          <span className="time">10:42</span>
        </div>
        <div className="cvp-h-wa-bubble">
          We loved your CV — would love to schedule an interview for the
          <b> Senior Marketing Lead</b> role.
          <span className="time">10:42</span>
        </div>
        <div className="cvp-h-wa-bubble">
          Does <b>Tuesday 10 AM</b> work? ☕
          <span className="time">10:43</span>
        </div>
        <div className="cvp-h-wa-bubble me">
          Yes — see you then 🙌
          <span className="time">10:43<span className="ticks">✓✓</span></span>
        </div>
      </div>
    </div>);

}

/* ------------------------------------------------------------------
   STATE 4 — Calendar: simple invite card with mini week strip
------------------------------------------------------------------ */
function HeroStateCalendar() {
  // Week strip: Mon-Sun, with Tue highlighted as the interview day
  const week = [
  { d: "Mon", n: 17 },
  { d: "Tue", n: 18, interview: true },
  { d: "Wed", n: 19 },
  { d: "Thu", n: 20 },
  { d: "Fri", n: 21 },
  { d: "Sat", n: 22 },
  { d: "Sun", n: 23 }];


  return (
    <div className="cvp-h-state cvp-h-cal2">
      <div className="cvp-h-cal2-head">
        <div className="cvp-h-cal2-month">November 2025</div>
        <div className="cvp-h-cal2-sub">Your week</div>
      </div>

      <div className="cvp-h-cal2-strip" aria-hidden>
        {week.map((w) =>
        <div key={w.n} className={`cvp-h-cal2-day${w.interview ? " on" : ""}`}>
            <div className="dow">{w.d}</div>
            <div className="num">{w.n}</div>
            {w.interview && <div className="dot"></div>}
          </div>
        )}
      </div>

      <div className="cvp-h-cal2-card">
        <div className="cvp-h-cal2-card-bar" aria-hidden></div>
        <div className="cvp-h-cal2-card-body">
          <div className="cvp-h-cal2-card-row">
            <span className="cvp-h-cal2-card-time">Tue 18 · 10:00 AM</span>
            <span className="cvp-h-cal2-card-pill">✓ Accepted</span>
          </div>
          <div className="cvp-h-cal2-card-title">Interview · Senior Marketing Lead</div>
          <div className="cvp-h-cal2-card-meta">Recruiter · Aviation — Dubai HQ</div>
          <div className="cvp-h-cal2-card-foot">
            <span className="cvp-h-cal2-card-chip">📍 In person</span>
            <span className="cvp-h-cal2-card-chip">🗓 1 hr</span>
          </div>
        </div>
      </div>

      <div className="cvp-h-cal2-foot">
        <span className="dot" aria-hidden></span>
        <span>Reminder set · 1 hour before</span>
      </div>
    </div>);

}

/* ------------------------------------------------------------------
   The billboard — auto-loops through 4 states.
   Perf budget targets:
     - desktop: 60 FPS sustained
     - mid-range Android (Pixel 6a, A-series): 30 FPS minimum
   Optimisations live here, not in the state components themselves:
     1. Animate ONLY opacity + transform — no filter:blur, no width/height.
     2. IntersectionObserver pauses the cycle when scrolled past.
     3. useReducedMotion freezes on state 1 (Layla CV) for accessibility
        + acts as an escape hatch on devices that hate compositor work.
     4. isLowEndDevice() throttles the interval (3.2s → 4.5s).
     5. Layered states are pre-mounted; we only toggle opacity/translate.
     6. .cvp-h-state-layer is GPU-promoted via translateZ(0) +
        will-change: opacity, transform. pointer-events lives in CSS so
        framer-motion isn't asked to "animate" a non-numeric prop.
------------------------------------------------------------------ */
const HERO_STATES = 4;
const HERO_INTERVAL_MS_FAST = 3200;
const HERO_INTERVAL_MS_SLOW = 4500;

function HeroBillboard() {
  const reduce = useReducedMotion();
  const [idx, setIdx] = useHS(0);
  const [inView, setInView] = useHS(true);
  const stageRef = useHR(null);

  // Pause the cycle when the phone is not in the viewport. setInterval
  // is gated below on `inView` so a scrolled-past hero burns no CPU.
  useHE(() => {
    const el = stageRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    const obs = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0.15, rootMargin: "0px 0px 100px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useHE(() => {
    if (reduce) return undefined;
    if (!inView) return undefined;
    const interval = isLowEndDevice() ? HERO_INTERVAL_MS_SLOW : HERO_INTERVAL_MS_FAST;
    const id = setInterval(() => setIdx((n) => (n + 1) % HERO_STATES), interval);
    return () => clearInterval(id);
  }, [reduce, inView]);

  // Memoised so the children identity is stable across re-renders —
  // framer-motion can then short-circuit prop diffing on the inactive
  // layers and avoid touching the DOM for them at all.
  const variants = useHM(
    () => [
      <HeroStateCV key="v-cv" />,
      <HeroStateInbox key="v-inbox" />,
      <HeroStateWhatsApp key="v-wa" />,
      <HeroStateCalendar key="v-cal" />,
    ],
    []
  );

  // prefers-reduced-motion: render state 1 statically. No interval, no
  // framer-motion subscriptions, no compositor layers. Doubles as a
  // last-resort perf escape hatch.
  if (reduce) {
    return (
      <div ref={stageRef} className="cvp-hphone-stage">
        <div className="cvp-h-state-layer is-active">{variants[0]}</div>
      </div>
    );
  }

  if (!HMotion) {
    return (
      <div ref={stageRef} className="cvp-hphone-stage">
        {variants[idx]}
        <div className="cvp-h-dots" aria-hidden>
          {Array.from({ length: HERO_STATES }).map((_, i) =>
            <div key={i} className={`cvp-h-dot${idx === i ? " on" : ""}`}></div>
          )}
        </div>
      </div>
    );
  }

  const tx = { duration: 0.45, ease: [0.4, 0, 0.2, 1] };

  return (
    <div ref={stageRef} className="cvp-hphone-stage">
      {variants.map((v, i) => {
        const active = idx === i;
        // Directional slide kept (right-to-left = "next state arriving"),
        // but blur is gone — opacity + translate is all the GPU has to
        // composite. `pointer-events` is class-driven, not animated.
        const rel = (i - idx + HERO_STATES) % HERO_STATES;
        const x = active ? 0 : rel === 1 ? 28 : -28;
        return (
          // eslint-disable-next-line react/jsx-pascal-case
          <HMotion.div
            key={"hstate-" + i}
            className={`cvp-h-state-layer${active ? " is-active" : ""}`}
            initial={false}
            animate={{ opacity: active ? 1 : 0, x }}
            transition={tx}
          >
            {v}
          </HMotion.div>
        );
      })}
      <div className="cvp-h-dots" aria-hidden>
        {Array.from({ length: HERO_STATES }).map((_, i) =>
          <div key={i} className={`cvp-h-dot${idx === i ? " on" : ""}`}></div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------
   HeroAnimatedPhone — wraps HeroBillboard in the iPhone shell so the
   slot in HeroSection.jsx receives a self-contained visual. The phone
   chrome (.cvp-hphone) and inner screen (.cvp-hphone-screen) come
   straight from the design's landing.css.
------------------------------------------------------------------ */
export default function HeroAnimatedPhone() {
  return (
    <>
      <style>{HERO_PHONE_STYLES}</style>
      <div className="cvp-hphone" aria-hidden>
        <div className="cvp-hphone-screen" style={{ padding: 0 }}>
          <div className="notch"></div>
          <HeroBillboard />
        </div>
      </div>
    </>
  );
}

/* CSS extracted from the design bundle's landing.css, scoped to the
   classes this component actually uses. The outer .cvp-hero-visual
   styling from the bundle is intentionally NOT included — the slot's
   parent (cvp-hero-visual in HeroSection.jsx) already owns layout. */
const HERO_PHONE_STYLES = `
.cvp-hphone {
  position: relative; z-index: 2;
  width: 300px; aspect-ratio: 9/19;
  background: #0a0a0a;
  border-radius: 42px;
  border: 1px solid rgba(255,255,255,0.12);
  box-shadow: 0 30px 80px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06);
  padding: 12px;
  /* phone overlaps the iPad to its right (matches the bundle's design) */
  margin-right: -36px;
  flex-shrink: 0;
}
.cvp-hphone-screen {
  width: 100%; height: 100%;
  background: linear-gradient(180deg, #0f0f10 0%, #0a0a0a 100%);
  border-radius: 32px; overflow: hidden;
  position: relative;
  display: flex; flex-direction: column;
}
.cvp-hphone .notch {
  position: absolute; top: 7px; left: 50%; transform: translateX(-50%);
  width: 78px; height: 20px; background: #000; border-radius: 999px;
  z-index: 5;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.04);
}

.cvp-hphone-stage {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: 32px;
  /* Containing block + compositor layer — keeps the layered states on
     the GPU side and lets the browser skip rasterising the static
     background while transforms tick. No fixed-position descendants
     here, so this is safe under Safari's containing-block rule. */
  transform: translateZ(0);
}
/* Wrapper around each of the four layered states. Stays GPU-promoted
   for the lifetime of the cycle; opacity + translate are the only
   things the compositor has to do per frame. pointer-events is
   class-driven so framer-motion doesn't touch it. */
.cvp-h-state-layer {
  position: absolute;
  inset: 0;
  will-change: opacity, transform;
  transform: translateZ(0);
  backface-visibility: hidden;
  pointer-events: none;
}
.cvp-h-state-layer.is-active { pointer-events: auto; }
.cvp-h-state {
  position: absolute; inset: 0;
  display: flex; flex-direction: column;
  border-radius: 32px;
  overflow: hidden;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
}

/* progress dots */
.cvp-h-dots {
  position: absolute; bottom: -22px; left: 0; right: 0;
  display: flex; gap: 5px; justify-content: center;
  pointer-events: none;
}
.cvp-h-dot { width: 14px; height: 3px; border-radius: 2px; background: rgba(255,255,255,0.16); transition: background 240ms, box-shadow 240ms, transform 240ms; }
.cvp-h-dot.on { background: var(--color-accent); box-shadow: 0 0 6px var(--color-accent); transform: scaleX(1.15); }

/* State 1 — CV light card */
.cvp-h-cv-v2 {
  background:
    linear-gradient(170deg, #ffffff 0%, #f3faf6 60%, #d8efe1 100%);
  color: #0f172a;
  padding: 56px 18px 18px;
  font-family: 'Inter', system-ui, sans-serif;
}
.cvp-cv2-top {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 12px; margin-bottom: 8px;
}
.cvp-cv2-photo {
  width: 88px; height: 28px; border-radius: 999px;
  background: transparent;
  flex-shrink: 0;
  margin-top: 2px;
}
.cvp-cv2-contact {
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 9px; line-height: 1.5; color: #334155;
  text-align: right;
  font-weight: 500;
}
.cvp-cv2-name {
  font-size: 13px; line-height: 1.25;
  color: #0f172a;
  letter-spacing: -0.01em;
  margin: 6px 0 6px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.cvp-cv2-name b { font-weight: 700; }
.cvp-cv2-profile {
  font-size: 9.5px; line-height: 1.5;
  color: #475569;
  margin: 0 0 10px;
}
.cvp-cv2-h {
  font-size: 11px; font-weight: 700; letter-spacing: -0.01em;
  color: #0f172a;
  margin: 8px 0 6px;
}
.cvp-cv2-job { margin-bottom: 8px; }
.cvp-cv2-jobline {
  display: flex; align-items: baseline; justify-content: space-between;
  gap: 6px; line-height: 1.25;
  margin-bottom: 3px;
}
.cvp-cv2-jobline .role {
  font-size: 10px; font-weight: 700; color: #0f172a;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.cvp-cv2-jobline .dates {
  font-size: 8.5px; color: #64748b; flex-shrink: 0; font-weight: 500;
}
.cvp-cv2-bullets { list-style: none; padding: 0; margin: 0; }
.cvp-cv2-bullets li { font-size: 9px; line-height: 1.5; color: #334155; }
.cvp-cv2-cols { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 6px 0 4px; }
.cvp-cv2-col .cvp-cv2-h { margin: 0 0 4px; }
.cvp-cv2-list { list-style: none; padding: 0; margin: 0; font-size: 9px; line-height: 1.55; color: #334155; }
.cvp-cv2-edu { font-size: 9px; line-height: 1.45; color: #334155; }

/* State 2 — Inbox */
.cvp-h-inbox {
  display: flex; flex-direction: column;
  padding: 36px 12px 14px;
  gap: 10px;
  color: var(--color-text-primary);
}
.cvp-h-inbox-head { padding: 0 4px 4px; }
.cvp-h-inbox-title { font-size: 16px; font-weight: 600; letter-spacing: -0.02em; color: var(--color-text-primary); line-height: 1.1; }
.cvp-h-inbox-sub { font-size: 10.5px; color: var(--color-text-muted); margin-top: 2px; font-family: 'JetBrains Mono', ui-monospace, monospace; letter-spacing: 0.02em; }
.cvp-h-inbox-list { display: flex; flex-direction: column; gap: 8px; flex: 1; }
.cvp-h-inbox-card {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 10px;
  padding: 10px 11px;
  display: flex; flex-direction: column; gap: 4px;
}
.cvp-h-inbox-card.top { background: rgba(74,222,128,0.06); border-color: rgba(74,222,128,0.20); }
.cvp-h-inbox-card.dim { opacity: 0.55; }
.cvp-h-inbox-row { display: flex; align-items: baseline; justify-content: space-between; gap: 6px; }
.cvp-h-inbox-from { font-size: 9.5px; font-weight: 600; color: var(--color-text-secondary); letter-spacing: 0.02em; text-transform: uppercase; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cvp-h-inbox-time { font-size: 9px; color: var(--color-text-muted); font-family: 'JetBrains Mono', ui-monospace, monospace; flex-shrink: 0; }
.cvp-h-inbox-subj { font-size: 11.5px; font-weight: 600; line-height: 1.3; color: var(--color-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cvp-h-inbox-body { font-size: 10px; line-height: 1.4; color: var(--color-text-muted); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.cvp-h-inbox-flag {
  display: inline-flex; align-items: center; gap: 5px;
  margin-top: 4px;
  font-size: 9.5px; font-weight: 600;
  color: var(--color-success);
  background: rgba(74,222,128,0.10);
  border: 1px solid rgba(74,222,128,0.22);
  border-radius: 999px;
  padding: 3px 8px;
  align-self: flex-start;
  letter-spacing: 0.01em;
}

/* State 3 — WhatsApp */
.cvp-h-wa {
  background: #0b141a;
  display: flex; flex-direction: column;
  padding-top: 30px;
}
.cvp-h-wa-bar {
  display: flex; align-items: center; gap: 9px;
  padding: 8px 10px;
  background: #1f2c33;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.cvp-h-wa-bar .av { width: 30px; height: 30px; border-radius: 50%; background: linear-gradient(135deg, #25D366, #128C7E); color: white; font-weight: 700; font-size: 11px; display: grid; place-items: center; }
.cvp-h-wa-bar .who { display: flex; flex-direction: column; line-height: 1.15; flex: 1; min-width: 0; }
.cvp-h-wa-bar .nm { font-size: 12px; font-weight: 600; color: #e9edef; letter-spacing: -0.01em; }
.cvp-h-wa-bar .org { font-size: 9.5px; color: #25D366; font-weight: 500; display: flex; align-items: center; gap: 4px; }
.cvp-h-wa-bar .org::before { content: ""; width: 5px; height: 5px; border-radius: 50%; background: #25D366; }
.cvp-h-wa-body {
  flex: 1; padding: 14px 10px;
  background:
    radial-gradient(circle at 20% 10%, rgba(37,211,102,0.04), transparent 40%),
    repeating-linear-gradient(45deg, rgba(255,255,255,0.012) 0 2px, transparent 2px 18px),
    #0b141a;
  display: flex; flex-direction: column; gap: 8px; justify-content: flex-end;
}
.cvp-h-wa-bubble {
  background: #1f2c33; color: #e9edef;
  font-size: 11px; line-height: 1.42;
  padding: 8px 11px;
  border-radius: 8px; border-top-left-radius: 0;
  max-width: 86%; align-self: flex-start;
  position: relative;
  box-shadow: 0 1px 1px rgba(0,0,0,0.18);
}
.cvp-h-wa-bubble.me { background: #005c4b; align-self: flex-end; border-radius: 8px; border-top-right-radius: 0; }
.cvp-h-wa-bubble b { font-weight: 600; color: #fff; }
.cvp-h-wa-bubble .time { font-size: 8px; color: rgba(255,255,255,0.45); display: inline-block; margin-left: 6px; vertical-align: -1px; }
.cvp-h-wa-bubble .ticks { color: #53bdeb; font-weight: 700; margin-left: 3px; letter-spacing: -2px; }
.cvp-h-wa-banner {
  align-self: center; max-width: 100%;
  background: rgba(37,211,102,0.10);
  border: 1px solid rgba(37,211,102,0.35);
  color: #25D366;
  font-size: 9.5px; font-weight: 600; letter-spacing: 0.06em;
  padding: 4px 10px; border-radius: 999px;
  display: inline-flex; align-items: center; gap: 5px;
  text-transform: uppercase;
}

/* State 4 — Calendar */
@keyframes cvpHPing { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.45; transform: scale(0.85); } }
.cvp-h-cal2 {
  display: flex; flex-direction: column;
  padding: 36px 12px 14px;
  gap: 10px;
  color: var(--color-text-primary);
}
.cvp-h-cal2-head { padding: 0 4px 2px; }
.cvp-h-cal2-month { font-size: 16px; font-weight: 600; letter-spacing: -0.02em; color: var(--color-text-primary); line-height: 1.1; }
.cvp-h-cal2-sub { font-size: 10.5px; color: var(--color-text-muted); margin-top: 2px; font-family: 'JetBrains Mono', ui-monospace, monospace; letter-spacing: 0.02em; }
.cvp-h-cal2-strip { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; padding: 4px 0 2px; }
.cvp-h-cal2-day {
  position: relative;
  display: flex; flex-direction: column; align-items: center;
  gap: 2px;
  padding: 6px 0 8px;
  background: rgba(255,255,255,0.03);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 8px;
}
.cvp-h-cal2-day .dow { font-size: 8.5px; font-weight: 600; color: var(--color-text-muted); letter-spacing: 0.02em; text-transform: uppercase; }
.cvp-h-cal2-day .num { font-size: 14px; font-weight: 600; color: var(--color-text-primary); letter-spacing: -0.02em; line-height: 1; }
.cvp-h-cal2-day.on { background: rgba(217,119,6,0.14); border-color: rgba(217,119,6,0.45); }
.cvp-h-cal2-day.on .num { color: var(--color-accent); }
.cvp-h-cal2-day.on .dow { color: var(--color-accent); }
.cvp-h-cal2-day .dot { position: absolute; bottom: 3px; left: 50%; transform: translateX(-50%); width: 4px; height: 4px; border-radius: 50%; background: var(--color-accent); }
.cvp-h-cal2-card {
  display: flex; gap: 0;
  background: rgba(217,119,6,0.08);
  border: 1px solid rgba(217,119,6,0.30);
  border-radius: 10px;
  overflow: hidden;
  margin-top: 2px;
}
.cvp-h-cal2-card-bar { flex-shrink: 0; width: 3px; align-self: stretch; background: var(--color-accent); }
.cvp-h-cal2-card-body { flex: 1; min-width: 0; padding: 10px 11px; display: flex; flex-direction: column; gap: 3px; }
.cvp-h-cal2-card-row { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.cvp-h-cal2-card-time { font-size: 10px; font-weight: 700; color: var(--color-accent); font-family: 'JetBrains Mono', ui-monospace, monospace; letter-spacing: 0.02em; }
.cvp-h-cal2-card-pill { font-size: 9px; font-weight: 700; color: var(--color-success); background: rgba(74,222,128,0.12); border: 1px solid rgba(74,222,128,0.30); border-radius: 999px; padding: 2px 7px; letter-spacing: 0.02em; }
.cvp-h-cal2-card-title { font-size: 12px; font-weight: 600; line-height: 1.3; color: var(--color-text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cvp-h-cal2-card-meta { font-size: 10px; line-height: 1.35; color: var(--color-text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.cvp-h-cal2-card-foot { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 4px; }
.cvp-h-cal2-card-chip { font-size: 9px; font-weight: 600; color: var(--color-text-secondary); background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 999px; padding: 2px 7px; letter-spacing: 0.01em; }
.cvp-h-cal2-foot {
  display: flex; align-items: center; gap: 6px;
  margin-top: auto;
  padding: 6px 4px 0;
  font-size: 9.5px; color: var(--color-text-muted);
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  letter-spacing: 0.02em;
}
.cvp-h-cal2-foot .dot {
  width: 5px; height: 5px; border-radius: 50%;
  background: var(--color-accent);
  animation: cvpHPing 1.6s ease-in-out infinite;
}

@media (max-width: 900px) {
  .cvp-hphone { width: 240px; margin-right: -28px; }
}
@media (max-width: 600px) {
  .cvp-hphone { margin-right: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .cvp-h-cal2-foot .dot { animation: none; }
}
`;
