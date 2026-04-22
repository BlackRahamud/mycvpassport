import React from 'react';

// iPad-proportioned tablet bezel wrapper. Shell only — no animation.
// Hardware-accurate dark bezel (#1C1C1E) and tight corner radius to match
// Apple's iPad Pro language, not a generic soft mockup.

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
          background: #1C1C1E;
          border: 1px solid rgba(255, 255, 255, 0.10);
          border-radius: 20px;
          padding: 12px;
          box-shadow:
            0 4px 8px rgba(0, 0, 0, 0.4),
            0 16px 48px rgba(0, 0, 0, 0.5),
            0 48px 96px rgba(0, 0, 0, 0.4);
          -webkit-font-smoothing: antialiased;
          transform: translateZ(0);
        }
        .cvp-tablet-frame::before {
          content: "";
          position: absolute;
          top: 5px;
          left: 50%;
          transform: translateX(-50%);
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #000;
          box-shadow: inset 0 0 0 0.5px rgba(255, 255, 255, 0.06);
          pointer-events: none;
        }
        .cvp-tablet-screen {
          position: relative;
          width: 100%;
          height: 100%;
          background: #0A0A0A;
          border-radius: 10px;
          overflow: hidden;
          box-sizing: border-box;
        }
      `}</style>
      <div className="cvp-tablet-screen">{children}</div>
    </div>
  );
}
