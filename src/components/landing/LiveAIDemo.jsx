/* LiveAIDemo — direct port of landing-demo.jsx from the Claude Design
   bundle (5JQJeKOZMfC0rU1_9PkL2Q). 11-second guided walkthrough of the
   builder UI rewriting a bullet, gated behind an orange play button.

   Body kept verbatim from the design export. Only changes:
     1. window.React → ES module imports (useState/useEffect/useRef
        kept under their bundle aliases useDS/useDE/useDR so the body
        does not need rewriting).
     2. Removed the cvp-arabic + cvp-side-stat addendum at the end of
        DemoSection — those belong in their own slots in the May-2026
        landing layout (Arabic testimonial card and +52 stat banner).
     3. CSS scoped via a <style> block.
     4. Section uses className="cvp-d-section" instead of "cvp-sec" so
        it can sit inside HowItWorks Step 02 without inheriting the
        bundle's section padding (which would be a layout regression). */

import React, {
  useState as useDS,
  useEffect as useDE,
  useRef as useDR,
  useCallback as useDCB,
} from "react";
import { useNavigate } from "react-router-dom";
import { logEvent } from "../../lib/analytics/logEvent";

/* The bullet the user "picks" (item index 2 — the aviation-specific one) */
const BULLETS_BEFORE = [
"Administered user accounts, permissions, and access control across Active Directory to ensure enterprise-wide security compliance.",
"Delivered end-to-end IT incident management via ticketing systems, consistently meeting SLA targets and reducing resolution backlogs through high-volume ticket handling.",
"Supported critical aviation-specific applications including CMRO, EDoc, AirNav, Boeing MFT, and Stream, ensuring high availability for operational teams.",
"Configured and maintained Citrix-hosted applications for enterprise users, minimising downtime through proactive troubleshooting and scheduled Windows Server maintenance.",
"Implemented and maintained backup procedures safeguarding critical company data and performed installation, testing, and evaluation of desktop software applications."];


/* The rewritten version that types in after the spinner */
const BULLET_AFTER = "Maintained 99.8% uptime across CMRO, EDoc, AirNav, Boeing MFT, and Stream — five flight-critical aviation applications — by leading proactive incident response across MEA operational teams.";

function Cursor({ x, y, click }) {
  return (
    <div className="cvp-d-cursor" data-click={click ? "1" : "0"} style={{ transform: `translate(${x}px, ${y}px)` }}>
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="22" height="22">
        <path d="M3 2 L3 18 L8 14 L11 21 L14 20 L11 13 L18 13 Z" fill="#fff" stroke="#0a0a0a" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
      <span className="ring"></span>
    </div>);

}

function Typer({ text, speed = 14, onDone }) {
  const [s, setS] = useDS("");
  const i = useDR(0);
  useDE(() => {
    setS("");i.current = 0;
    const id = setInterval(() => {
      i.current += 1;
      setS(text.slice(0, i.current));
      if (i.current >= text.length) {
        clearInterval(id);
        onDone && onDone();
      }
    }, speed);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);
  return <span>{s}<span className="cvp-d-caret"></span></span>;
}

export default function LiveAIDemo() {
  const navigate = useNavigate();
  const [phase, setPhase] = useDS("idle");
  const [muted, setMuted] = useDS(true);

  // Sidebar accordion state
  const [expExpanded, setExpExpanded] = useDS(false);

  // Modal stack
  const [showEdit, setShowEdit] = useDS(false);
  const [showPick, setShowPick] = useDS(false);
  const [showSpinner, setShowSpinner] = useDS(false);

  // Edit modal state
  const [descText, setDescText] = useDS(""); // shows "before" text once typed
  const [picked, setPicked] = useDS(-1);
  const [aiBtnGlow, setAiBtnGlow] = useDS(false);
  const [aiBtnPress, setAiBtnPress] = useDS(false);
  const [continueGlow, setContinueGlow] = useDS(false);
  const [showRewrittenChip, setShowRewrittenChip] = useDS(false);
  const [rewriteInProgress, setRewriteInProgress] = useDS(false);
  const [bulletReplaced, setBulletReplaced] = useDS(false);

  // Cursor (relative to .cvp-d-stage)
  const [cur, setCur] = useDS({ x: 80, y: 80, click: false });

  const stageRef = useDR(null);
  const aiBtnRef = useDR(null);
  const expEditRef = useDR(null);
  const bulletRowsRef = useDR([]);
  const continueBtnRef = useDR(null);

  const timeouts = useDR([]);
  const clearAll = () => {timeouts.current.forEach(clearTimeout);timeouts.current = [];};
  const later = (fn, ms) => {
    const id = setTimeout(fn, ms);
    timeouts.current.push(id);
    return id;
  };
  useDE(() => () => clearAll(), []);

  function moveTo(el, opts = {}) {
    if (!el || !stageRef.current) return;
    const stage = stageRef.current.getBoundingClientRect();
    const t = el.getBoundingClientRect();
    const x = t.left - stage.left + t.width / 2 - 11;
    const y = t.top - stage.top + t.height / 2 - 11;
    setCur({ x, y, click: false });
    if (opts.click) {
      later(() => setCur((p) => ({ ...p, click: true })), opts.clickDelay || 600);
      later(() => setCur((p) => ({ ...p, click: false })), (opts.clickDelay || 600) + 380);
    }
  }

  function reset() {
    clearAll();
    setExpExpanded(false);
    setShowEdit(false);setShowPick(false);setShowSpinner(false);
    setDescText("");setPicked(-1);
    setAiBtnGlow(false);setAiBtnPress(false);setContinueGlow(false);
    setShowRewrittenChip(false);setRewriteInProgress(false);setBulletReplaced(false);
    setCur({ x: 80, y: 80, click: false });
  }

  function play() {
    reset();
    setPhase("openModal");

    // 1. Cursor moves to "Edit" on Professional Experience, expands, opens modal
    later(() => {
      if (expEditRef.current) moveTo(expEditRef.current, { click: true, clickDelay: 700 });
    }, 250);
    later(() => setExpExpanded(true), 1100);
    later(() => setShowEdit(true), 1400);

    // 2. Cursor moves down to description textarea, types the bullet preview
    later(() => {
      const ta = stageRef.current?.querySelector(".cvp-d-ta");
      if (ta) moveTo(ta);
    }, 1900);
    later(() => {
      setPhase("typingDesc");
      // type a SHORT preview of the bullets (truncated for time budget)
      const preview =
      BULLETS_BEFORE[0].slice(0, 70) + "…\n" +
      BULLETS_BEFORE[2].slice(0, 60) + "…";
      let i = 0;
      const tick = () => {
        i += 1;
        setDescText(preview.slice(0, i));
        if (i < preview.length) later(tick, 14 + Math.random() * 12);else
        {
          // 3. Move to ✦ Improve with AI button
          later(() => {
            setAiBtnGlow(true);
            if (aiBtnRef.current) moveTo(aiBtnRef.current, { click: true, clickDelay: 600 });
            setPhase("clickAI");
          }, 200);
          later(() => setAiBtnPress(true), 1100);
          later(() => setAiBtnPress(false), 1300);
          // 4. Open Pick a bullet modal
          later(() => {
            setShowPick(true);
            setPhase("pickModal");
          }, 1450);
          // 5. Move cursor down list, settle on bullet 2 (aviation)
          later(() => {
            const r = bulletRowsRef.current[2];
            if (r) moveTo(r, { click: true, clickDelay: 500 });
          }, 1850);
          later(() => {
            setPicked(2);
            setPhase("clickBullet");
          }, 2350);
          // 6. Move to Continue button, click → opens spinner
          later(() => {
            setContinueGlow(true);
            if (continueBtnRef.current) moveTo(continueBtnRef.current, { click: true, clickDelay: 500 });
            setPhase("continue");
          }, 2700);
          later(() => {
            setShowPick(false);
            setShowSpinner(true);
            setRewriteInProgress(true);
            setPhase("rewriting");
          }, 3300);
          // 7. Spinner runs ~1.5s, then closes and bullet replaces with typed-in new text
          later(() => {
            setShowSpinner(false);
            setBulletReplaced(true); // replaces the picked bullet text in the textarea preview
            setPhase("typingNew");
          }, 4900);
          // 8. After typing finishes (handled by Typer onDone), show the green chip + final state
        }
      };
      tick();
    }, 2300);
  }

  function onRewriteTyped() {
    setRewriteInProgress(false);
    setShowRewrittenChip(true);
    setPhase("done");
  }

  // "Rewrite mine now — free" CTA inside the post-rewrite done overlay.
  // Stops any in-flight demo timers, fires the funnel event, then deep-
  // links into the builder's experience editor in add-mode with the
  // "Improve with AI" affordance visible. Guests are NOT gated — the
  // /builder route is open and sign-up is only required at download.
  const handleRewriteCTA = useDCB(() => {
    reset();
    setPhase("idle");
    try {
      logEvent("cta_rewrite_mine_clicked", {
        source: "live_ai_demo_modal",
        cta_text: "Rewrite mine now — free",
        cta_destination: "/builder?step=experience&ai=open",
      });
    } catch { /* analytics failure must not block navigation */ }
    navigate("/builder?step=experience&ai=open");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  /* --------------------------- render --------------------------- */
  return (
    <section className="cvp-d-section" id="demo">
      <style>{LIVE_AI_DEMO_STYLES}</style>
      <div className="cvp-sec-eyebrow">✦ Live AI Rewrite</div>
      <h2 className="cvp-sec-h2">
        Watch your CV go from <em>"meh"</em> to <em>"interview, please."</em>
      </h2>
      <p className="cvp-sec-sub">An 11-second guided walkthrough of the actual CVPassport builder. Press play see a bullet rewritten, live, exactly as you'd experience it in the editor. No signup. No video.



      </p>

      <div className="cvp-demo-card">
        <div className="cvp-d-stage" data-phase={phase} ref={stageRef}>
          {phase === "idle" ?
          <div className="cvp-demo-poster">
              <div className="cvp-demo-poster-eyebrow">▸ Guided walkthrough · 11 sec</div>
              <h3 className="cvp-demo-poster-h">See the AI rewrite a Gulf CV — live.</h3>
              <p className="cvp-demo-poster-s">
                Watch the actual builder rewrite a bullet in real time —
                same modals, same buttons you'll see when you sign up.
              </p>
              <button className="cvp-play-btn" onClick={play} aria-label="Play the demo">
                <span className="triangle"></span>
              </button>
              <div className="cvp-play-meta">
                <span><b>~11s</b> walkthrough</span>
                <span className="sep">·</span>
                <span>No signup</span>
                <span className="sep">·</span>
                <span><b>Real builder</b> UI</span>
              </div>
            </div> :

          <BuilderMockup
            expExpanded={expExpanded}
            expEditRef={expEditRef}
            showEdit={showEdit}
            descText={descText}
            bulletReplaced={bulletReplaced}
            rewriteInProgress={rewriteInProgress}
            showRewrittenChip={showRewrittenChip}
            aiBtnRef={aiBtnRef}
            aiBtnGlow={aiBtnGlow}
            aiBtnPress={aiBtnPress}
            showPick={showPick}
            picked={picked}
            bulletRowsRef={bulletRowsRef}
            continueBtnRef={continueBtnRef}
            continueGlow={continueGlow}
            showSpinner={showSpinner}
            onRewriteTyped={onRewriteTyped} />

          }

          {phase !== "idle" ? <Cursor x={cur.x} y={cur.y} click={cur.click} /> : null}

          {phase === "done" ?
          <div className="cvp-d-done-overlay">
              <div className="cvp-d-done-card">
                <div className="cvp-d-done-eyebrow">✓ Bullet rewritten in 11 seconds</div>
                <div className="cvp-d-done-t">That's the rewrite. On every bullet of your CV.</div>
                <div className="cvp-d-done-row">
                  <button className="cvp-d-replay" onClick={play}>↻ Replay</button>
                  <button className="cvp-d-cta" onClick={handleRewriteCTA}>
                    Rewrite mine now → free →
                  </button>
                </div>
              </div>
            </div> :
          null}

          {/* Audio control (stub — wired later) */}
          {phase !== "idle" ?
          <button
            className="cvp-d-audio"
            onClick={() => setMuted((m) => !m)}
            aria-label={muted ? "Unmute walkthrough audio" : "Mute walkthrough audio"}
            title={muted ? "Audio coming soon" : "Mute"}>

              {muted ?
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" />
                  <line x1="23" y1="9" x2="17" y2="15"></line>
                  <line x1="17" y1="9" x2="23" y2="15"></line>
                </svg> :

            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                </svg>
            }
            </button> :
          null}
        </div>
      </div>
    </section>);

}

/* --------------------------------------------------------------
   The builder mockup itself — sidebar + modal stack
-------------------------------------------------------------- */
function BuilderMockup(props) {
  const {
    expExpanded, expEditRef,
    showEdit, descText, bulletReplaced, rewriteInProgress, showRewrittenChip,
    aiBtnRef, aiBtnGlow, aiBtnPress,
    showPick, picked, bulletRowsRef, continueBtnRef, continueGlow,
    showSpinner, onRewriteTyped
  } = props;
  // rewriteInProgress is part of the pasted props contract — kept even
  // though this view does not consume it directly (Typer manages timing).
  void rewriteInProgress;

  return (
    <div className="cvp-d-builder">
      {/* Top tab bar (faithful to screenshot) */}
      <div className="cvp-d-topbar">
        <div className="cvp-d-tabs">
          <span className="cvp-d-tab on">Content</span>
          <span className="cvp-d-tab">Templates</span>
          <span className="cvp-d-tab">ATS Check</span>
          <span className="cvp-d-tab">Job Match</span>
        </div>
        <div className="cvp-d-tab-right">
          <span className="cvp-d-template-pill">Hospitality &amp; Service ▾</span>
          <span className="cvp-d-save">Save</span>
          <span className="cvp-d-download">Download CV</span>
        </div>
      </div>

      {/* Sidebar accordion */}
      <div className="cvp-d-sidebar">
        <SidebarRow icon="📄" label="Professional Summary" sub="Written · 4 sentences" />
        <SidebarRow
          icon="💼"
          label="Professional Experie…"
          sub="1 entry"
          editRef={expEditRef}
          expanded={expExpanded}>

          {expExpanded ?
          <div className="cvp-d-exp-detail">
              <div className="cvp-d-exp-card">
                <div className="cvp-d-exp-grip" aria-hidden>⋮⋮</div>
                <div className="cvp-d-exp-body">
                  <div className="cvp-d-exp-title">System Administrator L2</div>
                  <div className="cvp-d-exp-meta">Major Gulf Aviation MRO · Dubai, UAE · 2023-09 – Present</div>
                </div>
                <span className="cvp-d-exp-icon" aria-hidden>✎</span>
                <span className="cvp-d-exp-icon" aria-hidden>🗑</span>
              </div>
              <button className="cvp-d-exp-add">+ Add Experience</button>
            </div> :
          null}
        </SidebarRow>
        <SidebarRow icon="🎓" label="Education" sub="1 entry" />
        <SidebarRow icon="★" label="Skills" sub="8 skills" />
      </div>

      {/* Backdrop dimmer when any modal is open */}
      {showEdit || showPick || showSpinner ? <div className="cvp-d-backdrop"></div> : null}

      {/* Edit Experience Modal */}
      {showEdit ?
      <div className="cvp-d-modal cvp-d-modal-edit" role="dialog">
          <div className="cvp-d-modal-h">
            <div className="cvp-d-modal-title">Edit experience</div>
          </div>
          <div className="cvp-d-modal-body">
            <FieldRow label="COMPANY NAME" value="Major Gulf Aviation MRO" />
            <FieldRow label="JOB TITLE" value="System Administrator L2" />
            <div className="cvp-d-row2">
              <FieldRow label="START (MM/YYYY)" value="2023-09-01" small />
              <FieldRow label="END (MM/YYYY)" value="" placeholder="12/2023" small />
            </div>
            <div className="cvp-d-check"><span className="box">✓</span> Currently working here</div>
            <FieldRow label="LOCATION" value="Dubai, UAE" />
            <div className="cvp-d-field">
              <label className="cvp-d-lbl">DESCRIPTION</label>
              <div className="cvp-d-ta">
                {bulletReplaced ?
              <BulletReplacedView descText={descText} onTyped={onRewriteTyped} /> :

              descText ?
              <span className="cvp-d-ta-text">{descText}<span className="cvp-d-caret"></span></span> :

              <span className="cvp-d-ta-placeholder">Describe what you did in this role…</span>

              }
                <span className="cvp-d-ta-count">{descText.length || 0}</span>
              </div>
              <div className="cvp-d-ta-foot">
                <span className="cvp-d-ta-hint">≡ Each line = one bullet on your CV</span>
                <div className="cvp-d-ta-actions">
                  {showRewrittenChip ?
                <span className="cvp-d-rewritten-chip">✓ Bullet rewritten</span> :
                null}
                  <button
                  ref={aiBtnRef}
                  className="cvp-d-ai-btn"
                  data-glow={aiBtnGlow ? "1" : "0"}
                  data-pressed={aiBtnPress ? "1" : "0"}>

                    <span className="spark" aria-hidden>✦</span>
                    Improve with AI
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="cvp-d-modal-foot">
            <button className="cvp-d-btn-ghost">Cancel</button>
            <button className="cvp-d-btn-primary">Save</button>
          </div>
        </div> :
      null}

      {/* Pick a bullet modal */}
      {showPick ?
      <div className="cvp-d-modal cvp-d-modal-pick" role="dialog">
          <div className="cvp-d-modal-h">
            <div className="cvp-d-modal-title cvp-d-modal-title-spark">
              <span className="spark" aria-hidden>✦</span> Pick a bullet to rewrite
            </div>
            <button className="cvp-d-modal-close" aria-label="Close">×</button>
          </div>
          <div className="cvp-d-modal-body">
            <div className="cvp-d-pick-sub">Which bullet should we rewrite? You'll see 3 alternatives next.</div>
            <div className="cvp-d-pick-list">
              {BULLETS_BEFORE.map((b, i) =>
            <div
              key={i}
              ref={(el) => bulletRowsRef.current[i] = el}
              className={`cvp-d-pick-row${picked === i ? " on" : ""}`}>

                  <span className="cvp-d-radio" aria-hidden>{picked === i ? <span className="dot"></span> : null}</span>
                  <span className="cvp-d-pick-text">{b}</span>
                </div>
            )}
            </div>
          </div>
          <div className="cvp-d-modal-foot cvp-d-modal-foot-stacked">
            <button
            ref={continueBtnRef}
            className="cvp-d-btn-orange"
            data-glow={continueGlow ? "1" : "0"}>

              Continue
            </button>
            <button className="cvp-d-btn-text">Cancel</button>
          </div>
        </div> :
      null}

      {/* Rewriting spinner mini-modal */}
      {showSpinner ?
      <div className="cvp-d-modal cvp-d-modal-spin" role="dialog">
          <div className="cvp-d-modal-h">
            <div className="cvp-d-modal-title cvp-d-modal-title-spark">
              <span className="spark" aria-hidden>✦</span> Rewriting
            </div>
            <button className="cvp-d-modal-close" aria-label="Close">×</button>
          </div>
          <div className="cvp-d-spin-body">
            <div className="cvp-d-spin-ring" aria-hidden>
              <svg viewBox="0 0 40 40" width="40" height="40">
                <circle cx="20" cy="20" r="16" fill="none" stroke="rgba(217,119,6,0.18)" strokeWidth="3" />
                <circle cx="20" cy="20" r="16" fill="none" stroke="#D97706" strokeWidth="3" strokeLinecap="round" strokeDasharray="60 100" transform="rotate(-90 20 20)">
                  <animateTransform attributeName="transform" type="rotate" from="0 20 20" to="360 20 20" dur="1s" repeatCount="indefinite" />
                </circle>
              </svg>
            </div>
            <div className="cvp-d-spin-msg">Rewriting your bullet…</div>
          </div>
          <div className="cvp-d-modal-foot cvp-d-modal-foot-stacked">
            <button className="cvp-d-btn-text">Cancel</button>
          </div>
        </div> :
      null}
    </div>);

}

function SidebarRow({ icon, label, sub, expanded, editRef, children }) {
  return (
    <div className={`cvp-d-side-row${expanded ? " expanded" : ""}`}>
      <div className="cvp-d-side-head">
        <div className="cvp-d-side-ico" aria-hidden>{icon}</div>
        <div className="cvp-d-side-text">
          <div className="cvp-d-side-lbl">{label}</div>
          <div className="cvp-d-side-sub">{sub}</div>
        </div>
        <button ref={editRef} className="cvp-d-side-edit">Edit</button>
        <span className="cvp-d-side-chev" aria-hidden>{expanded ? "˄" : "˅"}</span>
      </div>
      {children}
    </div>);

}

function FieldRow({ label, value, placeholder, small }) {
  return (
    <div className={`cvp-d-field${small ? " small" : ""}`}>
      <label className="cvp-d-lbl">{label}</label>
      <div className="cvp-d-input">
        {value ? <span className="val">{value}</span> : <span className="ph">{placeholder}</span>}
      </div>
    </div>);

}

function BulletReplacedView({ descText, onTyped }) {
  // Show the OTHER bullets dimmed, and the picked bullet (#2 — aviation) being typed in.
  void descText;
  return (
    <div className="cvp-d-ta-text">
      <span className="cvp-d-old-bullet">{BULLETS_BEFORE[0].slice(0, 65)}…</span>
      {"\n"}
      <span className="cvp-d-new-bullet">
        <Typer text={BULLET_AFTER} speed={11} onDone={onTyped} />
      </span>
    </div>);

}

/* CSS extracted from the design bundle's landing.css. Full-section
   sizing for the standalone Live AI Demo section that sits between
   the hero and the Upload section. */
const LIVE_AI_DEMO_STYLES = `
.cvp-d-section {
  max-width: 1200px;
  margin: 0 auto;
  padding: 96px 24px 120px;
  position: relative;
  width: 100%;
  box-sizing: border-box;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
}
@media (max-width: 880px) {
  .cvp-d-section { padding: 64px 20px 72px; }
}
.cvp-d-section .cvp-sec-eyebrow {
  display: inline-flex; align-items: center; gap: 10px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px; font-weight: 600;
  letter-spacing: 0.22em; text-transform: uppercase;
  color: var(--color-accent);
  margin-bottom: 18px;
}
.cvp-d-section .cvp-sec-eyebrow::before {
  content: ""; width: 22px; height: 1px;
  background: var(--color-accent); display: block;
}
.cvp-d-section .cvp-sec-h2 {
  font-size: clamp(34px, 5.2vw, 56px);
  font-weight: 510; letter-spacing: -0.032em;
  line-height: 1.0; margin: 0;
  color: var(--color-text-primary);
  text-wrap: balance;
}
.cvp-d-section .cvp-sec-h2 em {
  font-style: normal;
  background: linear-gradient(90deg, var(--color-accent), #FCD34D 60%, var(--color-accent));
  background-size: 200% auto;
  -webkit-background-clip: text; background-clip: text;
  -webkit-text-fill-color: transparent; color: transparent;
  animation: cvpDShimmer 5s linear infinite;
}
@keyframes cvpDShimmer { 0% { background-position: 0% center; } 100% { background-position: 200% center; } }
@media (prefers-reduced-motion: reduce) {
  .cvp-d-section .cvp-sec-h2 em { animation: none; background: #FCD34D; -webkit-text-fill-color: #FCD34D; }
}
.cvp-d-section .cvp-sec-sub {
  font-size: 17px; color: var(--color-text-secondary);
  margin: 22px 0 0; max-width: 620px; line-height: 1.55;
}

.cvp-demo-card {
  margin-top: 48px;
  background: var(--color-surface-01);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: clamp(20px, 3vw, 36px);
  position: relative; overflow: hidden;
}
.cvp-demo-card::before {
  content: "";
  position: absolute; top: 0; left: 0; right: 0; height: 2px;
  background: linear-gradient(90deg, var(--color-accent), var(--color-success));
}

.cvp-d-stage {
  position: relative;
  min-height: 480px;
  isolation: isolate;
}
.cvp-d-stage[data-phase="idle"] .cvp-d-builder { display: none; }
@keyframes cvpDPing { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.45; transform: scale(0.85); } }

.cvp-demo-poster {
  position: relative;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-align: center;
  padding: 72px 24px;
  min-height: 480px;
  border-radius: var(--radius-lg);
  background:
    radial-gradient(circle at 50% 30%, rgba(217,119,6,0.10), transparent 60%),
    repeating-linear-gradient(0deg, transparent 0 38px, rgba(255,255,255,0.03) 38px 39px),
    var(--color-surface-01);
  overflow: hidden;
}
.cvp-demo-poster::after {
  content: "";
  position: absolute; inset: 0;
  background: radial-gradient(circle at 50% 30%, transparent 30%, rgba(10,10,10,0.55) 100%);
  pointer-events: none;
}
.cvp-demo-poster-eyebrow {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px; letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--color-accent);
  margin-bottom: 14px;
  position: relative; z-index: 1;
}
.cvp-demo-poster-h {
  font-size: clamp(22px, 3.4vw, 30px);
  font-weight: 510; letter-spacing: -0.02em;
  margin: 0 0 10px;
  position: relative; z-index: 1;
  max-width: 520px;
  text-wrap: balance;
  color: var(--color-text-primary);
}
.cvp-demo-poster-s {
  font-size: 14px; color: var(--color-text-secondary);
  margin: 0 0 28px; max-width: 460px;
  position: relative; z-index: 1;
  line-height: 1.5;
}

.cvp-play-btn {
  position: relative; z-index: 1;
  width: 96px; height: 96px;
  border-radius: 50%;
  background: var(--color-accent);
  color: #0a0a0a;
  border: none; cursor: pointer;
  display: grid; place-items: center;
  font-size: 32px;
  box-shadow: 0 10px 36px rgba(217,119,6,0.45);
  transition: transform 200ms ease, box-shadow 200ms ease;
}
.cvp-play-btn::before, .cvp-play-btn::after {
  content: ""; position: absolute; inset: 0;
  border-radius: 50%; pointer-events: none;
  border: 2px solid var(--color-accent);
}
.cvp-play-btn::before { animation: cvpDPulse 2.4s ease-out infinite; }
.cvp-play-btn::after  { animation: cvpDPulse 2.4s ease-out 1.2s infinite; }
@keyframes cvpDPulse {
  0% { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(1.7); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .cvp-play-btn::before, .cvp-play-btn::after { animation: none; opacity: 0; }
}
.cvp-play-btn:hover { transform: scale(1.04); box-shadow: 0 14px 44px rgba(217,119,6,0.55); }
.cvp-play-btn .triangle {
  width: 0; height: 0;
  border-style: solid;
  border-width: 14px 0 14px 22px;
  border-color: transparent transparent transparent #0a0a0a;
  margin-left: 5px;
}

.cvp-play-meta {
  position: relative; z-index: 1;
  margin-top: 22px;
  display: flex; gap: 16px; flex-wrap: wrap; justify-content: center;
  font-size: 12px; color: var(--color-text-muted);
}
.cvp-play-meta b { color: var(--color-text-secondary); font-weight: 600; }
.cvp-play-meta .sep { color: rgba(255,255,255,0.15); }

.cvp-d-builder {
  position: relative;
  min-height: 560px;
  background:
    repeating-linear-gradient(0deg, transparent 0 38px, rgba(255,255,255,0.025) 38px 39px),
    var(--color-surface-01);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.04);
}
.cvp-d-topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid var(--color-border);
  background: rgba(0,0,0,0.35);
  font-size: 12px;
}
.cvp-d-tabs { display: flex; gap: 22px; }
.cvp-d-tab {
  color: var(--color-text-muted);
  padding: 4px 0;
  border-bottom: 2px solid transparent;
  font-weight: 500;
}
.cvp-d-tab.on {
  color: var(--color-text-primary);
  border-bottom-color: var(--color-accent);
}
.cvp-d-tab-right {
  display: flex; gap: 12px; align-items: center;
  color: var(--color-text-muted); font-size: 11.5px;
}
.cvp-d-template-pill {
  padding: 4px 10px; border-radius: var(--radius-pill);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
}
.cvp-d-save { color: var(--color-text-secondary); }
.cvp-d-download {
  background: var(--color-accent); color: #0a0a0a;
  padding: 5px 12px; border-radius: var(--radius-pill);
  font-weight: 600; font-size: 11.5px;
}

.cvp-d-sidebar {
  padding: 14px;
  display: flex; flex-direction: column; gap: 8px;
}
.cvp-d-side-row {
  background: rgba(0,0,0,0.25);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  overflow: hidden;
  transition: border-color 200ms;
}
.cvp-d-side-row.expanded { border-color: var(--color-accent-line); }
.cvp-d-side-head {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 14px;
}
.cvp-d-side-ico {
  width: 32px; height: 32px;
  display: grid; place-items: center;
  background: rgba(255,255,255,0.04);
  border-radius: 8px;
  font-size: 15px;
}
.cvp-d-side-text { flex: 1; min-width: 0; }
.cvp-d-side-lbl {
  font-size: 13.5px; font-weight: 600;
  color: var(--color-text-primary);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.cvp-d-side-sub { font-size: 11.5px; color: var(--color-text-muted); margin-top: 2px; }
.cvp-d-side-edit {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-family: inherit; font-size: 11.5px; font-weight: 500;
  padding: 5px 14px; border-radius: var(--radius-pill);
  cursor: default;
}
.cvp-d-side-chev { color: var(--color-text-muted); font-size: 13px; width: 14px; text-align: center; }

.cvp-d-exp-detail { padding: 0 14px 14px; display: flex; flex-direction: column; gap: 8px; }
.cvp-d-exp-card {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px;
  background: rgba(255,255,255,0.025);
  border: 1px solid var(--color-border);
  border-radius: 10px;
}
.cvp-d-exp-grip { color: var(--color-text-muted); font-size: 11px; letter-spacing: -1px; }
.cvp-d-exp-body { flex: 1; min-width: 0; }
.cvp-d-exp-title { font-size: 13px; font-weight: 600; color: var(--color-text-primary); }
.cvp-d-exp-meta { font-size: 11.5px; color: var(--color-text-muted); margin-top: 2px; }
.cvp-d-exp-icon { color: var(--color-text-muted); font-size: 12px; padding: 4px; }
.cvp-d-exp-add {
  background: transparent;
  border: 1px dashed var(--color-border);
  color: var(--color-text-muted);
  font-family: inherit; font-size: 12px;
  padding: 8px 12px; border-radius: 10px;
  cursor: default;
}

.cvp-d-backdrop {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.55);
  backdrop-filter: blur(2px);
  z-index: 10;
  animation: cvpDFade 200ms ease-out;
}
@keyframes cvpDFade { from { opacity: 0; } to { opacity: 1; } }

.cvp-d-modal {
  position: absolute;
  left: 50%; top: 50%;
  transform: translate(-50%, -50%);
  z-index: 20;
  background: #1a1a1a;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  box-shadow: 0 24px 60px rgba(0,0,0,0.7);
  display: flex; flex-direction: column;
  opacity: 1;
}
.cvp-d-modal-edit { width: min(620px, calc(100% - 32px)); max-height: calc(100% - 24px); }
.cvp-d-modal-pick { width: min(560px, calc(100% - 32px)); max-height: calc(100% - 24px); }
.cvp-d-modal-spin { width: min(420px, calc(100% - 32px)); }

.cvp-d-modal-h {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--color-border);
}
.cvp-d-modal-title { font-size: 14px; font-weight: 600; color: var(--color-text-primary); letter-spacing: -0.01em; }
.cvp-d-modal-title-spark { display: inline-flex; align-items: center; gap: 8px; color: var(--color-accent); }
.cvp-d-modal-title-spark .spark {
  display: inline-grid; place-items: center;
  width: 22px; height: 22px;
  background: rgba(217,119,6,0.15);
  border-radius: 50%;
  font-size: 12px;
}
.cvp-d-modal-close { background: transparent; border: none; color: var(--color-text-muted); font-size: 20px; line-height: 1; cursor: default; }
.cvp-d-modal-body { padding: 18px 20px; overflow-y: auto; display: flex; flex-direction: column; gap: 14px; }
.cvp-d-modal-foot { padding: 14px 20px; border-top: 1px solid var(--color-border); display: flex; justify-content: flex-end; gap: 8px; }
.cvp-d-modal-foot-stacked { flex-direction: column-reverse; align-items: stretch; gap: 6px; }

.cvp-d-btn-ghost {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-family: inherit; font-size: 13px; font-weight: 500;
  padding: 8px 16px; border-radius: var(--radius-pill);
  cursor: default;
}
.cvp-d-btn-primary {
  background: var(--color-accent); color: #0a0a0a;
  border: none;
  font-family: inherit; font-size: 13px; font-weight: 600;
  padding: 8px 18px; border-radius: var(--radius-pill);
  cursor: default;
}
.cvp-d-btn-orange {
  background: var(--color-accent); color: #0a0a0a;
  border: none;
  font-family: inherit; font-size: 14px; font-weight: 700;
  padding: 11px 20px; border-radius: var(--radius-pill);
  cursor: default;
  width: 100%;
  transition: box-shadow 240ms;
}
.cvp-d-btn-orange[data-glow="1"] {
  animation: cvpDRewriteGlow 1.4s ease-in-out infinite;
}
@keyframes cvpDRewriteGlow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(217,119,6,0.6), 0 8px 24px rgba(217,119,6,0.40); }
  50% { box-shadow: 0 0 0 6px rgba(217,119,6,0), 0 12px 32px rgba(217,119,6,0.65); }
}
@media (prefers-reduced-motion: reduce) {
  .cvp-d-btn-orange[data-glow="1"] { animation: none; }
}
.cvp-d-btn-text {
  background: transparent; border: none;
  color: var(--color-text-muted);
  font-family: inherit; font-size: 13px; font-weight: 500;
  padding: 8px 16px;
  cursor: default;
  align-self: center;
}

.cvp-d-field { display: flex; flex-direction: column; gap: 6px; }
.cvp-d-row2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.cvp-d-lbl {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10.5px; letter-spacing: 0.18em; text-transform: uppercase;
  color: var(--color-text-muted); font-weight: 600;
}
.cvp-d-input {
  background: rgba(0,0,0,0.35);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 9px 12px;
  font-size: 13px;
  color: var(--color-text-primary);
  min-height: 36px;
  display: flex; align-items: center;
}
.cvp-d-input .ph { color: var(--color-text-muted); }
.cvp-d-check { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--color-text-secondary); }
.cvp-d-check .box {
  width: 16px; height: 16px;
  background: var(--color-accent); color: #0a0a0a;
  border-radius: 4px;
  display: grid; place-items: center;
  font-size: 10px; font-weight: 700;
}

.cvp-d-ta {
  background: rgba(0,0,0,0.35);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 12px 14px;
  font-size: 12.5px; line-height: 1.55;
  color: var(--color-text-primary);
  min-height: 90px;
  white-space: pre-wrap;
  position: relative;
}
.cvp-d-ta-text { white-space: pre-wrap; }
.cvp-d-ta-placeholder { color: var(--color-text-muted); }
.cvp-d-ta-count { position: absolute; right: 10px; bottom: 6px; font-size: 10px; color: var(--color-text-muted); }
.cvp-d-old-bullet {
  color: var(--color-text-muted);
  text-decoration: line-through;
  text-decoration-color: rgba(248,113,113,0.4);
  display: block;
  padding: 2px 0;
}
.cvp-d-new-bullet {
  display: block;
  padding: 6px 8px;
  background: rgba(74,222,128,0.06);
  border-left: 2px solid var(--color-success);
  border-radius: 4px;
  margin-top: 4px;
  color: var(--color-text-primary);
}
.cvp-d-caret {
  display: inline-block;
  width: 6px; height: 13px; vertical-align: -2px;
  background: var(--color-accent);
  margin-left: 2px;
  animation: cvpDCaret 0.7s steps(2) infinite;
}
@keyframes cvpDCaret { 50% { opacity: 0; } }
@media (prefers-reduced-motion: reduce) {
  .cvp-d-caret { animation: none; }
}

.cvp-d-ta-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 6px; gap: 12px; }
.cvp-d-ta-hint { font-size: 11px; color: var(--color-text-muted); }
.cvp-d-ta-actions { display: flex; align-items: center; gap: 8px; }
.cvp-d-rewritten-chip {
  display: inline-flex; align-items: center; gap: 4px;
  background: rgba(74,222,128,0.12);
  color: var(--color-success);
  border: 1px solid rgba(74,222,128,0.30);
  padding: 4px 10px; border-radius: var(--radius-pill);
  font-size: 11.5px; font-weight: 600;
  animation: cvpDKw 320ms cubic-bezier(0.34,1.56,0.64,1) both;
}
@keyframes cvpDKw { 0% { opacity: 0; transform: translateY(6px) scale(0.85); } 100% { opacity: 1; transform: translateY(0) scale(1); } }

.cvp-d-ai-btn {
  position: relative;
  background: linear-gradient(135deg, var(--color-accent), #B45309);
  color: #0a0a0a;
  border: none;
  padding: 7px 14px; border-radius: var(--radius-pill);
  font-family: inherit; font-size: 12px; font-weight: 700;
  display: inline-flex; align-items: center; gap: 6px;
  cursor: default;
  transition: transform 200ms;
}
.cvp-d-ai-btn[data-glow="1"] { animation: cvpDRewriteGlow 1.4s ease-in-out infinite; }
.cvp-d-ai-btn[data-pressed="1"] { transform: scale(0.94); }
.cvp-d-ai-btn .spark { display: inline-grid; place-items: center; width: 14px; height: 14px; font-size: 11px; }

.cvp-d-pick-sub { font-size: 12px; color: var(--color-text-secondary); margin-bottom: 4px; }
.cvp-d-pick-list { display: flex; flex-direction: column; gap: 6px; max-height: 320px; overflow-y: auto; }
.cvp-d-pick-row {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 10px 12px;
  background: rgba(0,0,0,0.25);
  border: 1px solid var(--color-border);
  border-radius: 10px;
  font-size: 12.5px; line-height: 1.5;
  color: var(--color-text-secondary);
  transition: border-color 200ms, background 200ms;
}
.cvp-d-pick-row.on { border-color: var(--color-accent); background: rgba(217,119,6,0.10); color: var(--color-text-primary); }
.cvp-d-radio {
  flex-shrink: 0;
  width: 16px; height: 16px;
  border-radius: 50%;
  border: 1.5px solid var(--color-border-strong);
  display: grid; place-items: center;
  margin-top: 1px;
}
.cvp-d-pick-row.on .cvp-d-radio { border-color: var(--color-accent); }
.cvp-d-radio .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--color-accent); }
.cvp-d-pick-text { flex: 1; }

.cvp-d-spin-body { padding: 28px 20px 20px; display: flex; flex-direction: column; align-items: center; gap: 14px; }
.cvp-d-spin-msg { font-size: 13px; color: var(--color-accent); font-weight: 600; }

.cvp-d-cursor {
  position: absolute;
  width: 22px; height: 22px;
  pointer-events: none;
  z-index: 100;
  transition: transform 850ms cubic-bezier(0.5, 0, 0.2, 1);
  filter: drop-shadow(0 4px 10px rgba(0,0,0,0.7));
}
@media (prefers-reduced-motion: reduce) {
  .cvp-d-cursor { transition: none; }
}
.cvp-d-cursor svg { display: block; }
.cvp-d-cursor .ring {
  position: absolute; inset: -8px;
  border-radius: 50%;
  border: 2px solid var(--color-accent);
  opacity: 0;
}
.cvp-d-cursor[data-click="1"] .ring { animation: cvpDClickRing 600ms ease-out; }
@keyframes cvpDClickRing {
  0% { transform: scale(0.4); opacity: 1; }
  100% { transform: scale(1.7); opacity: 0; }
}

.cvp-d-done-overlay {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  background: radial-gradient(circle at 50% 50%, rgba(10,10,10,0.40) 0%, rgba(10,10,10,0.85) 70%);
  z-index: 50;
  animation: cvpDFade 320ms ease-out;
}
.cvp-d-done-card {
  background: var(--color-surface-01);
  border: 1px solid var(--color-accent-line);
  border-radius: 16px;
  padding: 24px 28px;
  max-width: 440px;
  text-align: center;
  display: flex; flex-direction: column; gap: 12px; align-items: center;
  box-shadow: 0 24px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(217,119,6,0.20);
}
.cvp-d-done-eyebrow {
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 10.5px; letter-spacing: 0.20em; text-transform: uppercase;
  color: var(--color-success);
}
.cvp-d-done-t { font-size: 18px; font-weight: 600; letter-spacing: -0.01em; color: var(--color-text-primary); text-wrap: balance; }
.cvp-d-done-row { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; margin-top: 6px; }
.cvp-d-replay {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  font-family: inherit; font-size: 13px; font-weight: 500;
  padding: 10px 16px; border-radius: var(--radius-pill);
  cursor: pointer;
}
.cvp-d-replay:hover { color: var(--color-text-primary); border-color: var(--color-border-strong); }
.cvp-d-cta {
  background: var(--color-accent); color: #0a0a0a;
  border: none;
  font-family: inherit; font-size: 13px; font-weight: 700;
  padding: 10px 20px; border-radius: var(--radius-pill);
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(217,119,6,0.45);
}
.cvp-d-cta:hover { filter: brightness(1.05); }

.cvp-d-audio {
  position: absolute;
  bottom: 14px; right: 14px;
  z-index: 60;
  width: 30px; height: 30px;
  border-radius: 50%;
  background: rgba(0,0,0,0.5);
  border: 1px solid var(--color-border);
  color: var(--color-text-secondary);
  display: grid; place-items: center;
  cursor: pointer;
  transition: color 160ms, border-color 160ms;
}
.cvp-d-audio:hover { color: var(--color-text-primary); border-color: var(--color-border-strong); }
`;
