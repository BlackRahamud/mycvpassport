import React, { useEffect, useState } from 'react';
import TabletFrame from './TabletFrame';
import IPhoneFrame from './IPhoneFrame';
import RejectionReel from './RejectionReel';
import { PremiumScoreCircle } from '../../ATSChecker';

// Hero visual v3 — iPhone (front, taller) + iPad (behind, wider, shorter).
//   LEFT/FRONT  — <IPhoneFrame />: portrait, Layla CV PNG mounted as image.
//                 Static throughout.
//   RIGHT/BEHIND — <TabletFrame />: iPad-proportioned, plays the locked 9s
//                  loop (reel → crossfade → score ring → hold).
//   Overlap: iPhone at z-index 2 with margin-right: -40px, iPad at z-index 1
//   with margin-top: 40px. iPhone is taller and vertically centred, so it
//   extends above and below the iPad — hardware layering effect.
//
// THE ANIMATION SEQUENCE IS LOCKED. Do not modify LoopSequencer logic.

const CYCLE_MS = 9000;
const REEL_END = 4000;
const XFADE_END = 5000;

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
          height: 640px;
          isolation: isolate;
          box-sizing: border-box;
        }
        .cvp-hdt-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 700px;
          max-width: 120%;
          height: 500px;
          transform: translate(-50%, -50%);
          background: radial-gradient(
            ellipse at center,
            rgba(217, 119, 6, 0.07) 0%,
            transparent 70%
          );
          filter: blur(80px);
          pointer-events: none;
          z-index: 0;
        }
        .cvp-hdt-stage {
          position: relative;
          z-index: 1;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: row;
          align-items: flex-end;
          justify-content: center;
          gap: 0;
        }
        .cvp-hdt-iphone {
          position: relative;
          z-index: 2;
          margin-right: -40px;
          align-self: center;
          flex-shrink: 0;
        }
        .cvp-hdt-ipad {
          position: relative;
          z-index: 1;
          margin-top: 40px;
          align-self: flex-start;
          width: 380px;
          height: 520px;
          flex-shrink: 0;
          display: flex;
        }
        .cvp-hdt-ipad > .cvp-tablet-frame {
          width: 100%;
          height: 100%;
        }
        .cvp-hdt-ipad .cvp-tablet-screen {
          display: flex;
          flex-direction: column;
        }
        .cvp-hdt-ipad .cvp-tablet-screen > * {
          flex: 1;
          min-height: 0;
        }

        @media (max-width: 1100px) {
          .cvp-hdt-iphone { transform: scale(0.88); transform-origin: center right; }
          .cvp-hdt-ipad { width: 340px; height: 468px; }
        }
        @media (max-width: 900px) and (min-width: 769px) {
          .cvp-hdt-iphone { transform: scale(0.76); transform-origin: center right; }
          .cvp-hdt-ipad { width: 300px; height: 420px; }
        }
        @media (max-width: 768px) {
          .cvp-hdt-root { height: auto; }
          .cvp-hdt-stage {
            flex-direction: column;
            align-items: center;
            gap: 24px;
          }
          .cvp-hdt-iphone {
            margin-right: 0;
            transform: none;
            align-self: center;
          }
          .cvp-hdt-ipad {
            margin-top: 0;
            align-self: center;
            width: 100%;
            max-width: 380px;
            height: 460px;
          }
        }
      `}</style>

      <div className="cvp-hdt-glow" aria-hidden />

      <div className="cvp-hdt-stage">
        <div className="cvp-hdt-iphone">
          <IPhoneFrame />
        </div>

        <div className="cvp-hdt-ipad">
          <TabletFrame>
            <LoopSequencer />
          </TabletFrame>
        </div>
      </div>
    </div>
  );
}
