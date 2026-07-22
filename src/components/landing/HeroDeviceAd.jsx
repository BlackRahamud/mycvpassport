/* HeroDeviceAd — faithful port of "CV Device Ad.dc.html" from the Claude
   Design project 6eb9217e (file "CV Device Ad.dc.html"). The motion is
   NOT re-authored: the design's single requestAnimationFrame frame(t)
   timeline (P = 16s loop) is reused verbatim below, and the phone /
   score-tablet / 3D pop-out-CV markup is the design's markup verbatim.
   Only three faithful adaptations were made:
     1. The three devices were re-anchored from right: to left: so the
        cluster lives inside a self-scaling stage instead of the design's
        full 1600x1000 hero stage (frame(t) writes only transforms /
        opacity / score — it never touches left/top, so the timeline is
        position-independent and unchanged).
     2. The design's off-brand amber (#DE8300 / #F5A623 / rgba(222,131,0))
        is mapped to our real tokens (--color-accent / --color-accent-bright).
        The depicted third-party apps (iCloud Mail blue, Apple Calendar
        red + green, the chat) and the semantic score ramp are kept literal
        exactly as the design specified — they are set dressing, not brand.
     3. Font families 'Sora' / 'DM Sans' fall back to the app font (inherit)
        instead of loading Google Fonts, so the hero never blocks first paint.

   Layout: the design's 1600x1000 stage is scaled to fit its column. Here
   only the device cluster is kept; its bounding box is a 840x940 stage
   (design coords x0=760, y0=0) reserved with CSS aspect-ratio so there is
   zero layout shift, then scaled to the column width in a layout effect
   (before paint, so there is no first-frame flash either). */

import React, { useEffect, useLayoutEffect, useRef } from 'react';

const STAGE_W = 840;
const STAGE_H = 940;

/* Static resolved state for prefers-reduced-motion users: t=13.5s of the
   loop, which composes to the 94 "Market ready / PASSING" score device +
   the booked Apple Calendar interview ("Accepted"). The CV pop-out and the
   Mail/chat beats are motion-only (they cannot coexist with the calendar on
   one phone screen), so the reduced-motion frame shows the resolved payoff. */
const REDUCED_MOTION_T = 13.5;

export default function HeroDeviceAd() {
  const fitRef = useRef(null);
  const stageRef = useRef(null);

  // Scale the fixed 840x940 stage to the column width. useLayoutEffect so
  // the correct scale is applied before the browser paints (no flash); the
  // .hda-fit aspect-ratio already reserves the final height (no CLS).
  useLayoutEffect(() => {
    const fit = fitRef.current;
    const stage = stageRef.current;
    if (!fit || !stage) return undefined;
    const applyScale = () => {
      const s = Math.min(1, fit.clientWidth / STAGE_W);
      stage.style.transform = `scale(${s})`;
    };
    applyScale();
    let ro;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(applyScale);
      ro.observe(fit);
    } else if (typeof window !== 'undefined') {
      window.addEventListener('resize', applyScale);
    }
    return () => {
      if (ro) ro.disconnect();
      else if (typeof window !== 'undefined') window.removeEventListener('resize', applyScale);
    };
  }, []);

  // The animation. frame(t) below is the design's timeline verbatim.
  useEffect(() => {
    const root = stageRef.current;
    if (!root) return undefined;
    const $ = (id) => root.querySelector('#' + id);

    const R = 124, C = 2 * Math.PI * R;
    const reduce = typeof window !== 'undefined' && window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const clamp01 = (x) => Math.max(0, Math.min(1, x));
    const outCubic = (x) => 1 - Math.pow(1 - clamp01(x), 3);
    const inOut = (x) => { x = clamp01(x); return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2; };
    const outBack = (x) => { x = clamp01(x); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
    const band = (s) => s >= 85 ? '#10b981' : s >= 70 ? '#f59e0b' : s >= 60 ? '#f97316' : '#ef4444';
    const bandL = (s) => s >= 85 ? 'Market ready' : s >= 70 ? 'On track' : s >= 60 ? 'Almost there' : 'Needs work';
    const P = 16.0;

    const setBar = (el, val, x) => { if (el) el.style.width = (val * outCubic(x)) + '%'; };
    const pop = (el, t, te, dur) => { if (!el) return; const p = clamp01((t - te) / (dur || 0.5)); el.style.opacity = p; el.style.translate = '0 ' + ((1 - outBack(p)) * 22).toFixed(1) + 'px'; };
    const win = (t, a, b) => { const inp = clamp01((t - a) / 0.5), out = 1 - clamp01((t - (b - 0.5)) / 0.5); return Math.min(inp, out); };

    const frame = (t) => {
      // ---- TABLET score (sweeps once, then holds) ----
      let tf = 1; if (t < 0.35) tf = outCubic(t / 0.35); else if (t > 15.5) tf = 1 - outCubic((t - 15.5) / 0.5);
      const ti = $('tabletInner'); if (ti) ti.style.opacity = tf;
      const sp = outCubic((t - 0.5) / 1.9); const score = Math.round(52 + (94 - 52) * sp); const col = band(score);
      const sn = $('scoreNum'); if (sn) { sn.textContent = score; sn.style.color = col; sn.style.textShadow = '0 0 18px ' + col + '66'; }
      const rf = $('ringFg'); if (rf) { rf.style.stroke = col; rf.style.strokeDashoffset = (C * (1 - score / 100)).toFixed(1); }
      const rw = $('ringWrap'); if (rw) { const pu = 0.5 + 0.5 * Math.sin(t * 1.6); rw.style.filter = 'drop-shadow(0 0 ' + (14 + 8 * pu) + 'px ' + col + '55)'; }
      const sl = $('scoreLabel'); if (sl) { sl.textContent = bandL(score); sl.style.color = col; }
      setBar($('barKw'), 92, (t - 0.7) / 1.5); setBar($('barSt'), 88, (t - 0.95) / 1.5); setBar($('barIm'), 90, (t - 1.2) / 1.5);
      const ba = $('badgeAI'); if (ba) { ba.style.opacity = clamp01((t - 0.5) / 0.3); const bp = outBack((t - 0.5) / 0.5); const pl = t > 1 ? 1 + 0.03 * Math.sin(t * 3) : 1; ba.style.scale = ((0.7 + 0.3 * bp) * pl).toFixed(3); }
      const ps = $('passStamp'); if (ps) { ps.style.opacity = clamp01((t - 2.5) / 0.35); ps.style.scale = (1.3 - 0.3 * outBack((t - 2.5) / 0.4)).toFixed(3); }

      // ---- SCENE 1: CV pops out, then flies into the email ----
      const pc = $('popCV'); const cvIn = clamp01(t / 0.35);
      if (pc) {
        if (t < 3.5) {
          let lift = 0; if (t >= 1.2 && t < 2.6) lift = inOut((t - 1.2) / 1.4); else if (t >= 2.6) lift = 1;
          const hover = (t >= 2.6 && t < 3.5) ? Math.sin((t - 2.6) * 2.2) * 6 : 0;
          pc.style.transform = 'translateY(' + (-165 * lift + hover).toFixed(1) + 'px) rotateY(' + (-9 * lift).toFixed(2) + 'deg) scale(' + (1 + 0.06 * lift).toFixed(3) + ')';
          pc.style.opacity = cvIn;
          pc.style.boxShadow = '0 ' + (28 + 70 * lift) + 'px ' + (40 + 80 * lift) + 'px -20px rgba(0,0,0,' + (0.3 + 0.32 * lift).toFixed(2) + '), 0 0 ' + (46 * lift) + 'px rgba(16,185,129,' + (0.4 * lift).toFixed(2) + ')';
          pc.style.borderRadius = (36 - 14 * lift) + 'px';
        } else {
          const k = inOut(clamp01((t - 3.5) / 1.0));
          pc.style.transform = 'translateY(' + (-165 + 315 * k).toFixed(1) + 'px) rotateY(0deg) scale(' + (1.06 - 0.9 * k).toFixed(3) + ')';
          pc.style.opacity = 1 - clamp01((t - 4.0) / 0.5);
          pc.style.boxShadow = '0 40px 70px -20px rgba(0,0,0,0.28)';
          pc.style.borderRadius = '22px';
        }
      }
      const tag = $('atsTag'); if (tag) { const tp = clamp01((t - 2.4) / 0.4); tag.style.opacity = Math.min(tp, 1 - clamp01((t - 3.4) / 0.4)); tag.style.scale = (0.7 + 0.3 * outBack(tp)).toFixed(3); }

      // ---- SCENE 2: iCloud mail — attach CV & send to HR ----
      const sm = $('sceneMail');
      if (sm) { const mIn = clamp01((t - 3.4) / 0.4); const send = clamp01((t - 5.3) / 0.9); sm.style.opacity = (mIn * (1 - send)).toFixed(3); sm.style.transform = 'translateY(' + (-150 * inOut(send)).toFixed(1) + 'px)'; }
      const ma = $('mailAttach'); if (ma) { const p = clamp01((t - 4.15) / 0.45); ma.style.opacity = p; ma.style.scale = (0.7 + 0.3 * outBack(p)).toFixed(3); }
      const sb = $('sendBtn'); if (sb) { sb.style.scale = (t >= 5.1 && t < 5.35) ? '0.86' : '1'; }
      const msn = $('mailSent'); if (msn) { const p = clamp01((t - 5.5) / 0.35); msn.style.opacity = p; msn.style.scale = (0.7 + 0.3 * outBack(p)).toFixed(3); }

      // ---- SCENE 3: HR texts the candidate ----
      const chA = win(t, 5.9, 11.4); const sc2 = $('sceneChat'); if (sc2) sc2.style.opacity = chA;
      pop($('chDay'), t, 6.7, 0.4); pop($('chB0'), t, 7.0, 0.5); pop($('chB1'), t, 7.6, 0.5); pop($('chB2'), t, 8.3, 0.5); pop($('chB3'), t, 9.2, 0.5);

      // ---- SCENE 4: interview booked ----
      const caA = win(t, 11.3, 16.0); const sc3 = $('sceneCal'); if (sc3) sc3.style.opacity = caA;
      pop($('calWeek'), t, 11.7, 0.5); pop($('calCard'), t, 12.2, 0.5);
      const cc = $('calChip'); if (cc) { cc.style.opacity = clamp01((t - 12.8) / 0.3); cc.style.scale = (0.6 + 0.4 * outBack((t - 12.8) / 0.45)).toFixed(3); }
    };

    // Expose the frame fn for the verification harness (captures specific t).
    if (typeof window !== 'undefined') window.__adFrame = frame;

    // prefers-reduced-motion: paint the resolved payoff once, no rAF loop.
    if (reduce) { frame(REDUCED_MOTION_T); return undefined; }

    // Pause the loop when scrolled out of view (no wasted compositor work).
    let inView = true;
    let io;
    if (typeof IntersectionObserver !== 'undefined') {
      io = new IntersectionObserver(
        ([entry]) => { inView = entry.isIntersecting; },
        { threshold: 0.05, rootMargin: '0px 0px 120px 0px' }
      );
      io.observe(root);
    }

    let raf = 0;
    let t0 = null;
    const loop = (now) => {
      if (t0 === null) t0 = now;
      if (inView && !document.hidden) frame(((now - t0) / 1000) % P);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      if (io) io.disconnect();
      if (typeof window !== 'undefined' && window.__adFrame === frame) delete window.__adFrame;
    };
  }, []);

  return (
    <>
      <style>{HDA_STYLES}</style>
      <div className="hda-fit" ref={fitRef} aria-hidden="true">
        <div className="hda-stage" ref={stageRef} dangerouslySetInnerHTML={{ __html: DEVICE_HTML }} />
      </div>
    </>
  );
}

const HDA_STYLES = `
.hda-fit {
  position: relative;
  width: 100%;
  max-width: ${STAGE_W}px;
  aspect-ratio: ${STAGE_W} / ${STAGE_H};
  margin: 0 auto;
  overflow: hidden;
}
.hda-stage {
  position: absolute;
  top: 0;
  left: 0;
  width: ${STAGE_W}px;
  height: ${STAGE_H}px;
  transform-origin: top left;
  transform: scale(1);
  font-family: inherit;
  will-change: transform;
}
`;

/* The design's device cluster, verbatim, with the three faithful edits noted
   in the file header (right:->left: re-anchor, amber->token, font->inherit). */
const DEVICE_HTML = `
<!-- TABLET (behind) — ATS score -->
<div style="position:absolute;left:324px;top:210px;width:452px;height:600px;border-radius:42px;background:linear-gradient(155deg,#151518,#0b0b0d);padding:12px;box-shadow:0 50px 90px -30px rgba(20,15,5,0.5), 0 0 0 1px rgba(255,255,255,0.04);z-index:1;">
  <div style="width:100%;height:100%;border-radius:32px;background:radial-gradient(120% 90% at 50% 18%, #101216 0%, #0a0a0c 70%);overflow:hidden;position:relative;">
    <div id="tabletInner" style="position:absolute;inset:0;padding:30px 26px;display:flex;flex-direction:column;align-items:center;">
      <div id="badgeAI" style="position:absolute;top:26px;right:24px;display:inline-flex;align-items:center;gap:8px;padding:9px 15px;border-radius:50px;background:rgba(217,119,6,0.12);border:1px solid rgba(217,119,6,0.5);color:var(--color-accent-bright);font-size:13px;font-weight:700;box-shadow:0 0 22px -4px rgba(217,119,6,0.5);opacity:0;transform-origin:right center;">✨ AI rewritten in 47s</div>
      <div style="height:78px;"></div>
      <div id="ringWrap" style="position:relative;width:300px;height:300px;">
        <svg width="300" height="300" viewBox="0 0 300 300">
          <circle cx="150" cy="150" r="124" fill="none" stroke="rgba(255,255,255,0.07)" stroke-width="18"></circle>
          <circle id="ringFg" cx="150" cy="150" r="124" fill="none" stroke="#ef4444" stroke-width="18" stroke-linecap="round" stroke-dasharray="779.1" stroke-dashoffset="373.9" transform="rotate(-90 150 150)"></circle>
        </svg>
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;">
          <span id="scoreNum" style="font-size:82px;font-weight:800;line-height:1;letter-spacing:-0.03em;color:#ef4444;font-variant-numeric:tabular-nums;">52</span>
          <span style="font-size:12px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;color:#9a9a9f;margin-top:8px;">Score</span>
          <span id="scoreLabel" style="font-size:16px;font-weight:700;color:#ef4444;margin-top:5px;">Needs work</span>
        </div>
      </div>
      <div id="passStamp" style="margin-top:16px;font-size:15px;font-weight:800;letter-spacing:0.34em;color:#10b981;opacity:0;">PASSING</div>
      <div style="width:100%;margin-top:26px;display:flex;flex-direction:column;gap:14px;">
        <div style="display:flex;align-items:center;gap:12px;"><span style="width:78px;font-size:12.5px;color:#8b8b92;">Keywords</span><div style="flex:1;height:6px;border-radius:3px;background:rgba(255,255,255,0.08);overflow:hidden;"><div id="barKw" style="height:100%;width:0%;border-radius:3px;background:#10b981;"></div></div></div>
        <div style="display:flex;align-items:center;gap:12px;"><span style="width:78px;font-size:12.5px;color:#8b8b92;">Structure</span><div style="flex:1;height:6px;border-radius:3px;background:rgba(255,255,255,0.08);overflow:hidden;"><div id="barSt" style="height:100%;width:0%;border-radius:3px;background:#10b981;"></div></div></div>
        <div style="display:flex;align-items:center;gap:12px;"><span style="width:78px;font-size:12.5px;color:#8b8b92;">Impact</span><div style="flex:1;height:6px;border-radius:3px;background:rgba(255,255,255,0.08);overflow:hidden;"><div id="barIm" style="height:100%;width:0%;border-radius:3px;background:#10b981;"></div></div></div>
      </div>
    </div>
  </div>
</div>

<!-- PHONE (front) -->
<div style="position:absolute;left:84px;top:150px;width:348px;height:708px;border-radius:52px;background:linear-gradient(155deg,#18181b,#0a0a0c);padding:13px;box-shadow:-30px 44px 90px -28px rgba(20,15,5,0.55), 0 0 0 1px rgba(255,255,255,0.05);z-index:2;">
  <div style="width:100%;height:100%;border-radius:40px;background:#0b0b0d;overflow:hidden;position:relative;">
    <div style="position:absolute;top:16px;left:50%;transform:translateX(-50%);width:104px;height:26px;border-radius:16px;background:#000;z-index:6;"></div>

    <!-- SCENE: iCLOUD MAIL -->
    <div id="sceneMail" style="position:absolute;inset:0;opacity:0;background:#ffffff;display:flex;flex-direction:column;">
      <div style="height:50px;"></div>
      <div style="display:flex;align-items:center;justify-content:space-between;padding:6px 16px 12px;border-bottom:1px solid #E6E6EA;">
        <span style="font-size:15px;color:#0A84FF;">Cancel</span>
        <span style="font-size:15.5px;font-weight:600;color:#1c1c1e;">New Message</span>
        <span id="sendBtn" style="width:30px;height:30px;border-radius:50%;background:#0A84FF;display:flex;align-items:center;justify-content:center;transition:scale .12s;transform-origin:center;"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="6 11 12 5 18 11"></polyline></svg></span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;padding:11px 16px;border-bottom:1px solid #EDEDF0;font-size:14px;"><span style="color:#8E8E93;">To:</span><span style="display:inline-flex;align-items:center;gap:6px;padding:3px 10px;border-radius:50px;background:#EAF3FF;color:#0A6FE0;font-weight:600;font-size:13px;">HR · Aviation Dubai</span></div>
      <div style="display:flex;align-items:center;gap:8px;padding:11px 16px;border-bottom:1px solid #EDEDF0;font-size:14px;"><span style="color:#8E8E93;">Subject:</span><span style="color:#1c1c1e;font-weight:600;">Application for Senior Marketing Lead</span></div>
      <div style="padding:16px;font-size:13.5px;line-height:1.55;color:#3a3a3c;">Dear Hiring Manager,<br><br>Please find my CV attached for the Senior Marketing Lead role. I'd welcome the chance to discuss how I can help.<br><br>Best,<br>Layla Al-Hashimi</div>
      <div id="mailAttach" style="opacity:0;margin:4px 16px;display:flex;align-items:center;gap:12px;padding:12px;border-radius:14px;background:#F5F5F7;border:1px solid #E6E6EA;transform-origin:left center;">
        <div style="width:40px;height:48px;border-radius:7px;background:#fff;border:1px solid #E0E0E4;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;box-shadow:0 2px 6px -2px rgba(0,0,0,0.12);"><div style="width:24px;height:5px;border-radius:2px;background:#FF3B30;"></div><span style="font-size:8px;font-weight:800;color:#FF3B30;letter-spacing:0.04em;">PDF</span></div>
        <div style="display:flex;flex-direction:column;gap:3px;"><span style="font-size:13.5px;font-weight:600;color:#1c1c1e;">Layla_Al-Hashimi_CV.pdf</span><span style="font-size:12px;color:#8E8E93;">248 KB · ATS optimised</span></div>
      </div>
      <div id="mailSent" style="opacity:0;position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:rgba(255,255,255,0.9);transform-origin:center;">
        <div style="width:76px;height:76px;border-radius:50%;background:#34C759;display:flex;align-items:center;justify-content:center;box-shadow:0 14px 30px -8px rgba(52,199,89,0.6);"><svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
        <span style="font-size:17px;font-weight:700;color:#1c1c1e;">Sent to HR</span>
      </div>
    </div>

    <!-- SCENE: CHAT -->
    <div id="sceneChat" style="position:absolute;inset:0;opacity:0;padding:52px 18px 20px;display:flex;flex-direction:column;">
      <div style="display:flex;align-items:center;gap:11px;padding:10px 12px 16px;border-bottom:1px solid rgba(255,255,255,0.06);">
        <div style="width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#10b981,#0e9f74);display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#04231a;">RC</div>
        <div style="display:flex;flex-direction:column;gap:2px;"><span style="font-size:15px;font-weight:700;color:#F2F2F4;">Aviation HR</span><span style="display:inline-flex;align-items:center;gap:5px;font-size:12px;color:#10b981;"><span style="width:6px;height:6px;border-radius:50%;background:#10b981;"></span>online</span></div>
      </div>
      <div style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;gap:9px;padding-top:12px;">
        <div id="chDay" style="opacity:0;align-self:center;margin-bottom:4px;padding:5px 13px;border-radius:50px;border:1px solid rgba(16,185,129,0.35);color:#10b981;font-size:11px;font-weight:700;">✦ TODAY</div>
        <div id="chB0" style="opacity:0;align-self:flex-start;max-width:80%;background:#17171a;border-radius:15px 15px 15px 4px;padding:10px 13px;font-size:13.5px;color:#E8E8EC;">Hi Layla 👋 <span style="font-size:10.5px;color:#6a6a70;">10:42</span></div>
        <div id="chB1" style="opacity:0;align-self:flex-start;max-width:86%;background:#17171a;border-radius:15px 15px 15px 4px;padding:10px 13px;font-size:13.5px;line-height:1.4;color:#E8E8EC;">We loved your CV — would love to schedule an interview for the <strong>Senior Marketing Lead</strong> role. <span style="font-size:10.5px;color:#6a6a70;">10:42</span></div>
        <div id="chB2" style="opacity:0;align-self:flex-start;max-width:80%;background:#17171a;border-radius:15px 15px 15px 4px;padding:10px 13px;font-size:13.5px;color:#E8E8EC;">Does <strong>Tuesday 10 AM</strong> work? <span style="font-size:10.5px;color:#6a6a70;">10:43</span></div>
        <div id="chB3" style="opacity:0;align-self:flex-end;max-width:80%;background:linear-gradient(135deg,#10b981,#0e9f74);border-radius:15px 15px 4px 15px;padding:10px 13px;font-size:13.5px;color:#04231a;font-weight:600;">Yes — see you then 🙌 <span style="font-size:10.5px;color:#04231a;opacity:0.7;">10:43 ✓✓</span></div>
      </div>
    </div>

    <!-- SCENE: APPLE CALENDAR (day view) -->
    <div id="sceneCal" style="position:absolute;inset:0;opacity:0;padding:50px 0 18px;display:flex;flex-direction:column;background:#ffffff;">
      <div style="display:flex;align-items:center;justify-content:space-between;padding:2px 16px 10px;">
        <span style="display:inline-flex;align-items:center;gap:2px;font-size:16px;color:#FF453A;font-weight:600;">‹ November</span>
        <span style="font-size:14px;color:#FF453A;font-weight:600;">Today</span>
      </div>
      <div id="calWeek" style="opacity:0;display:grid;grid-template-columns:repeat(7,1fr);padding:2px 8px 12px;border-bottom:1px solid rgba(0,0,0,0.08);">
        <div style="display:flex;flex-direction:column;align-items:center;gap:7px;"><span style="font-size:11px;color:#8a8a8e;">M</span><span style="font-size:16px;font-weight:600;color:#1c1c1e;width:30px;height:30px;display:flex;align-items:center;justify-content:center;">17</span></div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:7px;"><span style="font-size:11px;color:#FF453A;">T</span><span style="font-size:16px;font-weight:700;color:#fff;width:30px;height:30px;border-radius:50%;background:#FF453A;display:flex;align-items:center;justify-content:center;">18</span></div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:7px;"><span style="font-size:11px;color:#8a8a8e;">W</span><span style="font-size:16px;font-weight:600;color:#1c1c1e;width:30px;height:30px;display:flex;align-items:center;justify-content:center;">19</span></div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:7px;"><span style="font-size:11px;color:#8a8a8e;">T</span><span style="font-size:16px;font-weight:600;color:#1c1c1e;width:30px;height:30px;display:flex;align-items:center;justify-content:center;">20</span></div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:7px;"><span style="font-size:11px;color:#8a8a8e;">F</span><span style="font-size:16px;font-weight:600;color:#1c1c1e;width:30px;height:30px;display:flex;align-items:center;justify-content:center;">21</span></div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:7px;"><span style="font-size:11px;color:#8a8a8e;">S</span><span style="font-size:16px;font-weight:600;color:#1c1c1e;width:30px;height:30px;display:flex;align-items:center;justify-content:center;">22</span></div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:7px;"><span style="font-size:11px;color:#8a8a8e;">S</span><span style="font-size:16px;font-weight:600;color:#1c1c1e;width:30px;height:30px;display:flex;align-items:center;justify-content:center;">23</span></div>
      </div>
      <div style="padding:12px 18px 4px;font-size:13px;font-weight:600;color:#8a8a8e;">Tuesday</div>
      <div style="position:relative;flex:1;margin-top:2px;">
        <div style="position:absolute;left:0;right:0;top:6px;display:flex;align-items:center;gap:10px;"><span style="width:48px;text-align:right;font-size:11px;color:#8a8a8e;">9 AM</span><div style="flex:1;height:1px;background:rgba(0,0,0,0.08);margin-right:14px;"></div></div>
        <div style="position:absolute;left:0;right:0;top:84px;display:flex;align-items:center;gap:10px;"><span style="width:48px;text-align:right;font-size:11px;color:#8a8a8e;">10 AM</span><div style="flex:1;height:1px;background:rgba(0,0,0,0.08);margin-right:14px;"></div></div>
        <div style="position:absolute;left:0;right:0;top:162px;display:flex;align-items:center;gap:10px;"><span style="width:48px;text-align:right;font-size:11px;color:#8a8a8e;">11 AM</span><div style="flex:1;height:1px;background:rgba(0,0,0,0.08);margin-right:14px;"></div></div>
        <div style="position:absolute;left:0;right:0;top:240px;display:flex;align-items:center;gap:10px;"><span style="width:48px;text-align:right;font-size:11px;color:#8a8a8e;">12 PM</span><div style="flex:1;height:1px;background:rgba(0,0,0,0.08);margin-right:14px;"></div></div>
        <div style="position:absolute;left:52px;right:14px;top:118px;display:flex;align-items:center;"><span style="width:8px;height:8px;border-radius:50%;background:#FF453A;margin-left:-4px;"></span><div style="flex:1;height:2px;background:#FF453A;"></div></div>
        <div id="calCard" style="opacity:0;position:absolute;top:88px;left:58px;right:14px;height:70px;border-radius:9px;background:rgba(48,209,88,0.16);overflow:hidden;display:flex;transform-origin:center top;">
          <div style="width:4px;background:#30D158;flex-shrink:0;"></div>
          <div style="padding:8px 12px;display:flex;flex-direction:column;gap:3px;flex:1;min-width:0;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;"><span style="font-size:13.5px;font-weight:700;color:#1c1c1e;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Interview · Senior Marketing Lead</span><span id="calChip" style="opacity:0;flex-shrink:0;display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:50px;background:rgba(48,209,88,0.18);color:#1f8a4c;font-size:10.5px;font-weight:700;transform-origin:right center;">✓ Accepted</span></div>
            <span style="font-size:12px;color:#2e7d52;">10:00 – 11:00 · Dubai HQ</span>
            <span style="font-size:11.5px;color:#6a8a76;">Recruiter · Aviation · In person</span>
          </div>
        </div>
      </div>
    </div>

  </div>
</div>

<!-- 3D POP-OUT CV LAYER (over the phone screen) -->
<div style="position:absolute;left:97px;top:163px;width:322px;height:682px;z-index:7;pointer-events:none;perspective:1700px;perspective-origin:50% 62%;">
  <div id="popCV" style="position:absolute;inset:0;border-radius:36px;background:linear-gradient(180deg,#FFFFFF 66%,#EAF6EF 100%);overflow:hidden;transform-origin:50% 72%;box-shadow:0 30px 40px -22px rgba(0,0,0,0.35);padding:26px 24px;color:#1b1a17;">
    <div style="display:flex;justify-content:flex-end;flex-direction:column;align-items:flex-end;gap:2px;">
      <span style="font-size:12.5px;font-weight:600;color:#3a3833;">Dubai, UAE</span>
      <span style="font-size:12.5px;color:#8a887f;">+971 50 000 0000</span>
    </div>
    <div style="margin-top:8px;font-size:20px;font-weight:800;color:#161512;">Layla Al-Hashimi<span style="font-weight:500;color:#4a4842;">, Marketing Strategist</span></div>
    <p style="margin:8px 0 0;font-size:12.5px;line-height:1.5;color:#6a685f;">GCC-focused marketing strategist specialising in brand growth, digital campaigns and market entry across the Middle East.</p>
    <div style="margin-top:18px;font-size:14px;font-weight:800;color:#161512;">Experience</div>
    <div style="margin-top:9px;display:flex;align-items:baseline;justify-content:space-between;"><span style="font-size:13.5px;font-weight:700;color:#201f1b;">Marketing Manager</span><span style="font-size:11px;font-weight:700;color:var(--color-accent);">Mar 2024 – Present</span></div>
    <div style="margin-top:5px;display:flex;flex-direction:column;gap:3px;font-size:12px;color:#6a685f;"><span>Led GCC brand campaigns across 3 markets</span><span>Grew social following by 40% in 12 months</span><span>Managed $500K annual marketing budget</span></div>
    <div style="margin-top:12px;display:flex;align-items:baseline;justify-content:space-between;"><span style="font-size:13.5px;font-weight:700;color:#201f1b;">Brand Strategist, JWT MENA</span><span style="font-size:11px;font-weight:700;color:var(--color-accent);">Dec 2021 – Mar 2024</span></div>
    <div style="margin-top:5px;display:flex;flex-direction:column;gap:3px;font-size:12px;color:#6a685f;"><span>Developed regional campaigns for FMCG clients</span><span>Delivered 3 award-winning brand launches</span></div>
    <div style="margin-top:18px;display:flex;gap:40px;">
      <div style="display:flex;flex-direction:column;gap:5px;"><span style="font-size:14px;font-weight:800;color:#161512;margin-bottom:2px;">Skills</span><span style="font-size:12px;color:#6a685f;">Brand Strategy</span><span style="font-size:12px;color:#6a685f;">Digital Marketing</span><span style="font-size:12px;color:#6a685f;">SEO/SEM</span></div>
      <div style="display:flex;flex-direction:column;gap:5px;"><span style="font-size:14px;font-weight:800;color:#161512;margin-bottom:2px;">Languages</span><span style="font-size:12px;color:#6a685f;">Arabic (Native)</span><span style="font-size:12px;color:#6a685f;">English (Fluent)</span></div>
    </div>
    <div style="margin-top:18px;font-size:14px;font-weight:800;color:#161512;">Education</div>
    <div style="margin-top:6px;font-size:12px;color:#6a685f;">BSc Marketing — American University of Beirut, 2020</div>
    <!-- ATS tag appears on pop -->
    <div id="atsTag" style="opacity:0;position:absolute;top:16px;left:16px;display:inline-flex;align-items:center;gap:7px;padding:8px 13px;border-radius:50px;background:#10b981;color:#04231a;font-size:12.5px;font-weight:800;box-shadow:0 10px 22px -8px rgba(16,185,129,0.7);transform-origin:left center;">✓ ATS optimised</div>
  </div>
</div>
`;
