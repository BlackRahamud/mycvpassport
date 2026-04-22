import React, { useState } from 'react';

// iPhone 15 Pro-proportioned frame. Hardware-accurate radii (44/38) and
// titanium-dark bezel (#1C1C1E). Dynamic Island sits on top of the screen
// content. No side buttons (omitted per spec).
//
// Content: the founder drops a CV image at public/img/layla-cv-template.png.
// If it's missing, the frame falls back to a styled "CV_PLACEHOLDER" panel
// so the composition still renders correctly.

const DEFAULT_SRC = '/img/layla-cv-template.png';

export default function IPhoneFrame({
  src = DEFAULT_SRC,
  alt = 'Layla Al-Hashimi CV',
  className,
  style,
}) {
  const [imgFailed, setImgFailed] = useState(false);
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
        .cvp-iphone-content {
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: top;
          display: block;
          border-radius: 38px;
        }
        .cvp-iphone-placeholder {
          width: 100%;
          height: 100%;
          background: #f5f5f5;
          border-radius: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.18em;
          color: #6E6E73;
          text-align: center;
          padding: 24px;
          box-sizing: border-box;
        }
      `}</style>

      <div className="cvp-iphone-screen">
        <div className="cvp-iphone-island" aria-hidden="true" />
        {imgFailed ? (
          <div className="cvp-iphone-placeholder" role="img" aria-label={alt}>
            CV_PLACEHOLDER
          </div>
        ) : (
          <img
            className="cvp-iphone-content"
            src={src}
            alt={alt}
            onError={() => setImgFailed(true)}
            draggable="false"
          />
        )}
      </div>
    </div>
  );
}
