import React from 'react';

// Premium tablet bezel wrapper. Shell only — no animation of its own.
// Children fill the screen area. See HeroDualTablet for composition.

export default function TabletFrame({ children, width, className, style }) {
  return (
    <div
      className={className ? `cvp-tablet-frame ${className}` : 'cvp-tablet-frame'}
      style={{ width, ...style }}
    >
      <style>{`
        .cvp-tablet-frame {
          position: relative;
          box-sizing: border-box;
          background: #141414;
          border: 0.5px solid rgba(255, 255, 255, 0.08);
          border-radius: 32px;
          padding: 20px 12px 24px 12px;
          box-shadow:
            0 2px 4px rgba(0, 0, 0, 0.3),
            0 8px 32px rgba(0, 0, 0, 0.4),
            0 32px 80px rgba(0, 0, 0, 0.5);
          -webkit-font-smoothing: antialiased;
          transform: translateZ(0);
        }
        .cvp-tablet-frame::before {
          content: "";
          position: absolute;
          top: 8px;
          left: 50%;
          transform: translateX(-50%);
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #1D1D1F;
          box-shadow: inset 0 0 0 0.5px rgba(255, 255, 255, 0.04);
          pointer-events: none;
        }
        .cvp-tablet-screen {
          position: relative;
          width: 100%;
          height: 100%;
          background: #0A0A0A;
          border-radius: 24px;
          overflow: hidden;
          box-sizing: border-box;
        }
      `}</style>
      <div className="cvp-tablet-screen">{children}</div>
    </div>
  );
}
