import React from 'react';
import TabletFrame from './TabletFrame';
import RejectionReel from './RejectionReel';
import { SampleResultCard } from '../../ATSChecker';

// Hero visual composition: two tablet frames side by side.
// Left tablet mounts <RejectionReel compact /> — the ATS streaming terminal.
// Right tablet mounts <SampleResultCard pinnedScore={94} /> — frozen on the
// 94 / Market Ready / green state. No new animation logic; both components
// run their own internal loops.

export default function HeroDualTablet() {
  return (
    <div className="cvp-hdt-root" aria-hidden="false">
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
            rgba(217, 119, 6, 0.08) 0%,
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
          flex: 1.45 1 0;
          min-width: 0;
          display: flex;
        }
        .cvp-hdt-right {
          flex: 1 1 0;
          min-width: 0;
          display: flex;
        }
        .cvp-hdt-left .cvp-tablet-screen,
        .cvp-hdt-right .cvp-tablet-screen {
          display: flex;
          flex-direction: column;
        }
        .cvp-hdt-left .cvp-tablet-screen > * {
          flex: 1;
          min-height: 0;
        }
        .cvp-hdt-right .cvp-tablet-screen {
          align-items: center;
          justify-content: center;
          padding: 12px 8px;
        }
        .cvp-hdt-right .cvp-tablet-screen > * {
          width: 100%;
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
        @media (prefers-reduced-motion: reduce) {
          .cvp-hdt-glow { animation: none; }
        }
      `}</style>

      <div className="cvp-hdt-glow" aria-hidden />

      <div className="cvp-hdt-stage">
        <TabletFrame className="cvp-hdt-left">
          <RejectionReel compact />
        </TabletFrame>

        <TabletFrame className="cvp-hdt-right">
          <SampleResultCard isMobile pinnedScore={94} />
        </TabletFrame>
      </div>
    </div>
  );
}
