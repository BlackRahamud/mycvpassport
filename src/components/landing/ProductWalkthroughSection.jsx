/* ProductWalkthroughSection — the real product film, section 3 of the
   landing page (anchor #live-demo).

   Replaces LiveAIDemo.jsx, the coded 11-second simulation that stood in
   this slot before there was a film to show. The section chrome (eyebrow,
   shimmering h2, sub) is carried over from that component so the rhythm of
   the page is unchanged; only the stage is different.

   Visual intent: a theme-following section header above ONE edge-to-edge
   dark video card whose black frame blends into the film's own letterbox,
   with the amber pulsing play button on the poster and a single amber CTA
   beneath it.

   The card is a pinned dark island (data-theme="dark") in both themes —
   the film is graded on black, and a white frame around it would read as a
   letterbox bug rather than a design choice.

   Playback: click to play, muted, controls after the first click. The file
   carries NO audio track at all (stripped on encode), so nothing can ever
   surprise a visitor with sound. preload="none" means a visitor who never
   presses play downloads the 39 KB poster and not the 2.7 MB film. */

import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { logEvent } from "../../lib/analytics/logEvent";

const VIDEO_SRC = "/video/cvpassport-walkthrough.mp4";
const POSTER_SRC = "/video/cvpassport-walkthrough-poster.jpg";
/* 92s of film. Kept next to the src so the on-screen runtime and the file
   can never drift apart silently. */
const RUNTIME_LABEL = "1 min 32 sec";

export default function ProductWalkthroughSection() {
  const navigate = useNavigate();
  const videoRef = useRef(null);
  const [started, setStarted] = useState(false);

  const play = useCallback(() => {
    const node = videoRef.current;
    if (!node) return;
    setStarted(true);
    node.preload = "auto";
    const p = node.play();
    if (p && typeof p.catch === "function") p.catch(() => { /* user can still hit the native controls */ });
    try {
      logEvent("landing_walkthrough_played", { source: "product_walkthrough_section", runtime_seconds: 92 });
    } catch { /* analytics failure must not block playback */ }
  }, []);

  const handleCTA = useCallback(() => {
    const node = videoRef.current;
    if (node && !node.paused) node.pause();
    try {
      logEvent("cta_build_cv_clicked", {
        source: "product_walkthrough_section",
        cta_text: "Build my CV — free",
        cta_destination: "/builder",
      });
    } catch { /* analytics failure must not block navigation */ }
    navigate("/builder");
  }, [navigate]);

  return (
    <section className="cvp-pw-section" id="demo">
      <style>{PRODUCT_WALKTHROUGH_STYLES}</style>

      <div className="cvp-pw-eyebrow">✦ Product walkthrough</div>
      <h2 className="cvp-pw-h2">
        Watch your CV go from <em>&ldquo;meh&rdquo;</em> to <em>&ldquo;interview, please.&rdquo;</em>
      </h2>
      <p className="cvp-pw-sub">
        A full walkthrough of CVPassport, start to finish — the details a Gulf recruiter
        reads first, the AI rewrite, the ATS check, the download. No signup to watch,
        no sound.
      </p>

      <div className="cvp-pw-card" data-theme="dark">
        <div className="cvp-pw-stage" data-started={started ? "true" : "false"}>
          <video
            ref={videoRef}
            className="cvp-pw-video"
            src={VIDEO_SRC}
            poster={POSTER_SRC}
            preload="none"
            muted
            playsInline
            controls={started}
            aria-label="Silent walkthrough of CVPassport: filling the Gulf recruiter details, rewriting a bullet with AI, running the ATS check and downloading the finished CV."
          />

          {/* Deliberately just the button and a footer strip: the poster
              frame is a real product still with its own on-screen type, and
              the section's own h2 + sub sit directly above the card. A second
              headline here would both repeat them and land on top of the
              still's text. */}
          {!started && (
            <div className="cvp-pw-poster-overlay">
              <button type="button" className="cvp-pw-play" onClick={play} aria-label={`Play the walkthrough, ${RUNTIME_LABEL}, silent`}>
                <span className="triangle" />
              </button>
              <div className="cvp-pw-meta">
                <span><b>Full walkthrough</b> · {RUNTIME_LABEL}</span>
                <span className="sep">·</span>
                <span>No signup</span>
                <span className="sep">·</span>
                <span>No sound</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="cvp-pw-cta-row">
        <button type="button" className="cvp-pw-cta" onClick={handleCTA}>
          Build my CV — free →
        </button>
        <span className="cvp-pw-cta-note">Free to build. Sign up only when you download.</span>
      </div>
    </section>
  );
}

/* Section chrome carried over from LiveAIDemo so the page rhythm is
   unchanged; the stage below it is new. */
const PRODUCT_WALKTHROUGH_STYLES = `
.cvp-pw-section {
  max-width: 1200px;
  margin: 0 auto;
  padding: 96px 24px 120px;
  position: relative;
  width: 100%;
  box-sizing: border-box;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
}
@media (max-width: 880px) {
  .cvp-pw-section { padding: 64px 20px 72px; }
}
.cvp-pw-eyebrow {
  display: inline-flex; align-items: center; gap: 10px;
  font-family: 'JetBrains Mono', ui-monospace, monospace;
  font-size: 11px; font-weight: 600;
  letter-spacing: 0.22em; text-transform: uppercase;
  color: var(--color-accent);
  margin-bottom: 18px;
}
.cvp-pw-eyebrow::before {
  content: ""; width: 22px; height: 1px;
  background: var(--color-accent); display: block;
}
.cvp-pw-h2 {
  font-size: clamp(34px, 5.2vw, 56px);
  font-weight: 510; letter-spacing: -0.032em;
  line-height: 1.0; margin: 0;
  color: var(--color-text-primary);
  text-wrap: balance;
}
.cvp-pw-h2 em {
  font-style: normal;
  /* Fallback: solid accent when background-clip:text is unavailable. */
  color: var(--color-accent);
}
@supports (-webkit-background-clip: text) or (background-clip: text) {
  .cvp-pw-h2 em {
    background: linear-gradient(90deg, var(--color-accent), #FCD34D 60%, var(--color-accent));
    background-size: 200% auto;
    -webkit-background-clip: text; background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: cvpPwShimmer 5s linear infinite;
  }
  @media (prefers-reduced-motion: reduce) {
    /* Freeze the shimmer only — a background:<color> reset here drops
       background-clip and paints a solid box over the transparent text. */
    .cvp-pw-h2 em { animation: none; }
  }
}
@keyframes cvpPwShimmer { 0% { background-position: 0% center; } 100% { background-position: 200% center; } }
.cvp-pw-sub {
  font-size: 17px; color: var(--color-text-secondary);
  margin: 22px 0 0; max-width: 620px; line-height: 1.55;
}

/* The film sits edge-to-edge in its own dark card — no inner padding, so
   the card border reads as the frame of the picture. */
.cvp-pw-card {
  margin-top: 48px;
  background: var(--color-surface-00);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  position: relative; overflow: hidden;
  box-shadow: var(--shadow-card);
}
.cvp-pw-card::before {
  content: "";
  position: absolute; top: 0; left: 0; right: 0; height: 2px;
  z-index: 3;
  background: linear-gradient(90deg, var(--color-accent), var(--color-success));
}
.cvp-pw-stage { position: relative; isolation: isolate; }
.cvp-pw-video {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  height: auto;
  background: var(--color-surface-00);
  object-fit: cover;
}

/* The scrim does two jobs: it lifts the amber button off a busy product
   still, and it darkens the bottom band so the meta strip stays legible
   over whatever frame the film opens on. */
.cvp-pw-poster-overlay {
  position: absolute; inset: 0;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  text-align: center;
  padding: 24px;
  box-sizing: border-box;
  background:
    linear-gradient(to bottom, transparent 55%, rgba(10, 10, 10, 0.72) 100%),
    radial-gradient(circle at 50% 50%, rgba(10, 10, 10, 0.62) 0%, rgba(10, 10, 10, 0.34) 45%, rgba(10, 10, 10, 0.5) 100%);
}

.cvp-pw-play {
  width: 96px; height: 96px;
  border-radius: 50%;
  background: var(--color-accent);
  color: var(--accent-contrast);
  border: none; cursor: pointer;
  display: grid; place-items: center;
  position: relative;
  box-shadow: 0 10px 36px rgba(217, 119, 6, 0.45);
  transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 200ms cubic-bezier(0.4, 0, 0.2, 1);
}
@media (max-width: 560px) {
  .cvp-pw-play { width: 72px; height: 72px; }
}
.cvp-pw-play::before, .cvp-pw-play::after {
  content: ""; position: absolute; inset: 0;
  border-radius: 50%; pointer-events: none;
  border: 2px solid var(--color-accent);
}
.cvp-pw-play::before { animation: cvpPwPulse 2.4s ease-out infinite; }
.cvp-pw-play::after  { animation: cvpPwPulse 2.4s ease-out 1.2s infinite; }
@keyframes cvpPwPulse {
  0% { transform: scale(1); opacity: 0.6; }
  100% { transform: scale(1.7); opacity: 0; }
}
.cvp-pw-play:hover { transform: scale(1.04); box-shadow: 0 14px 44px rgba(217, 119, 6, 0.55); }
.cvp-pw-play:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 4px; }
.cvp-pw-play .triangle {
  width: 0; height: 0;
  border-style: solid;
  border-width: 14px 0 14px 22px;
  border-color: transparent transparent transparent var(--accent-contrast);
  margin-left: 5px;
}
@media (prefers-reduced-motion: reduce) {
  .cvp-pw-play::before, .cvp-pw-play::after { animation: none; opacity: 0; }
  .cvp-pw-play { transition: none; }
}

/* Pinned to the bottom of the frame, out of the still's busy middle. */
.cvp-pw-meta {
  position: absolute;
  left: 24px; right: 24px; bottom: 18px;
  display: flex; gap: 12px; flex-wrap: wrap; justify-content: center;
  font-size: 12.5px; color: var(--color-text-secondary);
}
.cvp-pw-meta b { color: var(--color-text-primary); font-weight: 600; }
.cvp-pw-meta .sep { color: var(--color-border-strong); }
@media (max-width: 560px) {
  .cvp-pw-meta { left: 12px; right: 12px; bottom: 10px; gap: 8px; font-size: 11px; }
}

.cvp-pw-cta-row {
  margin-top: 28px;
  display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
}
.cvp-pw-cta {
  min-height: 48px;
  padding: 14px 26px;
  border: none; border-radius: var(--radius-pill);
  background: var(--color-accent);
  color: var(--accent-contrast);
  font-family: inherit; font-size: 15px; font-weight: 700;
  cursor: pointer;
  transition: background-color 200ms cubic-bezier(0.4, 0, 0.2, 1), transform 200ms cubic-bezier(0.4, 0, 0.2, 1);
}
.cvp-pw-cta:hover { background: var(--accent-hover); }
.cvp-pw-cta:active { transform: translateY(1px); }
.cvp-pw-cta:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 3px; }
.cvp-pw-cta-note { font-size: 13px; color: var(--color-text-muted); }
@media (prefers-reduced-motion: reduce) {
  .cvp-pw-cta { transition: none; }
}
`;
