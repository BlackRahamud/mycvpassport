import React from 'react';

// iPhone 15 Pro-proportioned frame. Hardware-accurate radii (44/38) and
// titanium-dark bezel (#1C1C1E). Dynamic Island sits on top of the screen
// content. No side buttons (omitted per spec).
//
// Content: the CV PNG at public/img/layla-cv-template.png, exported from
// Figma at 516×1168 (2× the 258×584 screen area). Mounted edge-to-edge
// with object-fit: cover so the screen fills without letterbox.

const DEFAULT_SRC = '/img/layla-cv-template.png';

export default function IPhoneFrame({
  src = DEFAULT_SRC,
  alt = 'Layla Al-Hashimi CV',
  className,
  style,
}) {
  const rootClass = className ? `cvp-iphone-frame ${className}` : 'cvp-iphone-frame';

  return (
    <div className={rootClass} style={style}>
      <style>{`
        .cvp-iphone-frame {
          position: relative;
          box-sizing: border-box;
          width: 280px;
          aspect-ratio: 9 / 19.5;
          background: #1C1C1E;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 44px;
          padding: 10px;
          box-shadow:
            0 4px 8px rgba(0, 0, 0, 0.4),
            0 16px 48px rgba(0, 0, 0, 0.5),
            0 48px 96px rgba(0, 0, 0, 0.4);
          -webkit-font-smoothing: antialiased;
          transform: translateZ(0);
        }
        .cvp-iphone-screen {
          position: relative;
          width: 100%;
          height: 100%;
          background: #0A0A0A;
          border-radius: 38px;
          overflow: hidden;
          box-sizing: border-box;
        }
        .cvp-iphone-island {
          position: absolute;
          top: 8px;
          left: 50%;
          transform: translateX(-50%);
          width: 120px;
          height: 34px;
          border-radius: 20px;
          background: #000;
          z-index: 2;
          pointer-events: none;
        }
      `}</style>

      <div className="cvp-iphone-screen">
        <div className="cvp-iphone-island" aria-hidden="true" />
        <img
          src={src}
          alt={alt}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'top center',
            borderRadius: '38px',
            display: 'block',
          }}
        />
      </div>
    </div>
  );
}
