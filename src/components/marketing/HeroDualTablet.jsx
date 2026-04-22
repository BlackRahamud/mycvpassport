import React, { useEffect, useState } from 'react';
import TabletFrame from './TabletFrame';
import LaylaCV from './LaylaCV';
import RejectionReel from './RejectionReel';
import { PremiumScoreCircle } from '../../ATSChecker';

// Hero visual: two tablets, no tilt.
//   LEFT  — static <LaylaCV /> on white paper. The "who".
//   RIGHT — bigger tablet; plays a 9s silent loop:
//             t=0–4s   Phase 1: <RejectionReel compact /> — the fear
//             t=4–5s   Phase 2: 1s crossfade
//             t=5–9s   Phase 3: <PremiumScoreCircle score={94} /> counts
//                      up, colour shifts to green, "PASSING", holds
//             Silent reset, loop.
// Behind both tablets: ambient amber radial OLED glow. prefers-reduced-motion
// freezes the loop at phase 3.

const CYCLE_MS = 9000;
const REEL_END = 4000;   // phase 1 → 2
const XFADE_END = 5000;  // phase 2 → 3

function LoopSequencer() {
  const [cycle, setCycle] = useState(0);
  const [phase, setPhase] = useState('reel'); // 'reel' | 'xfade' | 'ring'

  useEffect(() => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReduced) {
      setPhase('ring');
      return undefined;
    }

    const t1 = setTimeout(() => setPhase('xfade'), REEL_END);
    const t2 = setTimeout(() => setPhase('ring'), XFADE_END);
    const t3 = setTimeout(() => {
      setPhase('reel');
      setCycle((c) => c + 1);
    }, CYCLE_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [cycle]);

  const reelVisible = phase === 'reel';
  const ringMounted = phase !== 'reel';

  return (
    <div className="cvp-loop-stage">
      <style>{`
        .cvp-loop-stage {
          position: relative;
          width: 100%;
          height: 100%;
          min-height: 360px;
        }
        .cvp-loop-layer {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: opacity 1s cubic-bezier(0.16,1,0.3,1);
        }
        .cvp-loop-reel {
          opacity: 0;
          overflow: hidden;
        }
        .cvp-loop-reel.is-on { opacity: 1; }
        .cvp-loop-ring {
          opacity: 0;
          flex-direction: column;
          gap: 12px;
        }
        .cvp-loop-ring.is-on { opacity: 1; }
        .cvp-loop-passing {
          font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.24em;
          color: #4ADE80;
          text-transform: uppercase;
          margin: 0;
          opacity: 0;
          transition: opacity 600ms cubic-bezier(0.16,1,0.3,1);
          transition-delay: 1200ms;
        }
        .cvp-loop-ring.is-on .cvp-loop-passing { opacity: 1; }
        .cvp-loop-reel > * {
          width: 100%;
          height: 100%;
        }
        @media (prefers-reduced-motion: reduce) {
          .cvp-loop-layer,
          .cvp-loop-passing {
            transition: none;
          }
        }
      `}</style>

      <div className={`cvp-loop-layer cvp-loop-reel ${reelVisible ? 'is-on' : ''}`}>
        <RejectionReel compact key={`reel-${cycle}`} />
      </div>

      {ringMounted && (
        <div
          className={`cvp-loop-layer cvp-loop-ring ${phase === 'ring' ? 'is-on' : ''}`}
          key={`ring-wrap-${cycle}`}
        >
          <PremiumScoreCircle score={94} />
          <p className="cvp-loop-passing">PASSING</p>
        </div>
      )}
    </div>
  );
}

export default function HeroDualTablet() {
  return (
    <div className="cvp-hdt-root">
      <style>{`
        .cvp-hdt-root {
          position: relative;
          width: 100%;
          isolation: isolate;
          box-sizing: border-box;
        }
        .cvp-hdt-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 800px;
          max-width: 120%;
          height: 500px;
          transform: translate(-50%, -50%);
          background: radial-gradient(
            ellipse at center,
            rgba(217, 119, 6, 0.10) 0%,
            rgba(217, 119, 6, 0.04) 40%,
            transparent 70%
          );
          filter: blur(60px);
          pointer-events: none;
          z-index: 0;
        }
        .cvp-hdt-stage {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: row;
          align-items: stretch;
          gap: 20px;
          width: 100%;
        }
        .cvp-hdt-left {
          flex: 1 1 0;
          min-width: 0;
          display: flex;
        }
        .cvp-hdt-right {
          flex: 1.4 1 0;
          min-width: 0;
          display: flex;
        }
        .cvp-hdt-left .cvp-tablet-screen,
        .cvp-hdt-right .cvp-tablet-screen {
          display: flex;
          flex-direction: column;
        }
        .cvp-hdt-left .cvp-tablet-screen > *,
        .cvp-hdt-right .cvp-tablet-screen > * {
          flex: 1;
          min-height: 0;
        }
        @media (max-width: 768px) {
          .cvp-hdt-stage {
            flex-direction: column;
            gap: 16px;
          }
          .cvp-hdt-left,
          .cvp-hdt-right {
            flex: 1 1 auto;
            width: 100%;
          }
        }
      `}</style>

      <div className="cvp-hdt-glow" aria-hidden />

      <div className="cvp-hdt-stage">
        <TabletFrame className="cvp-hdt-left">
          <LaylaCV />
        </TabletFrame>

        <TabletFrame className="cvp-hdt-right">
          <LoopSequencer />
        </TabletFrame>
      </div>
    </div>
  );
}
