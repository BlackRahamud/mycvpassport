import { useEffect, useState } from 'react';

const CONSENT_KEY = 'cvp_cookie_consent';

const styleBlock = `
  .cvp-cookie-banner {
    --bg-surface: #141414;
    --text-primary: #FFF;
    --text-secondary: #A0A0A0;
    --border-default: #2A2A2A;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 999;
    background: rgba(20, 20, 20, 0.85);
    -webkit-backdrop-filter: blur(12px);
    backdrop-filter: blur(12px);
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    padding: 16px 24px;
    box-sizing: border-box;
    transform: translateY(100%);
    transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1);
  }
  .cvp-cookie-banner.cvp-cookie-banner--in {
    transform: translateY(0);
  }
  .cvp-cookie-banner.cvp-cookie-banner--out {
    transform: translateY(100%);
  }
  .cvp-cookie-banner__inner {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
    max-width: 100%;
  }
  .cvp-cookie-banner__text {
    font-size: 14px;
    color: var(--text-secondary);
    max-width: 620px;
    line-height: 1.5;
    margin: 0;
  }
  .cvp-cookie-banner__link {
    color: #FFF;
    text-decoration: underline;
  }
  .cvp-cookie-banner__link:visited {
    color: #FFF;
  }
  .cvp-cookie-banner__actions {
    display: flex;
    flex-direction: row;
    gap: 12px;
    flex-shrink: 0;
    align-items: center;
  }
  .cvp-cookie-banner__btn-primary {
    background: #FFF;
    color: #000;
    font-size: 13px;
    padding: 8px 16px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-family: inherit;
    transition: background-color 150ms ease;
  }
  .cvp-cookie-banner__btn-primary:hover {
    background: #E0E0E0;
  }
  .cvp-cookie-banner__btn-secondary {
    background: transparent;
    color: var(--text-secondary);
    font-size: 13px;
    padding: 8px 16px;
    border-radius: 6px;
    border: 1px solid var(--border-default);
    cursor: pointer;
    font-family: inherit;
    transition: color 150ms ease, border-color 150ms ease;
  }
  .cvp-cookie-banner__btn-secondary:hover {
    color: #FFF;
    border-color: #FFF;
  }
  @media (max-width: 768px) {
    .cvp-cookie-banner__inner {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }
  }
`;

function CookieBanner() {
  const [ready, setReady] = useState(false);
  const [needsBanner, setNeedsBanner] = useState(false);
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [unmounted, setUnmounted] = useState(false);

  useEffect(() => {
    const v = localStorage.getItem(CONSENT_KEY);
    if (v === 'accepted' || v === 'declined') {
      setNeedsBanner(false);
    } else {
      setNeedsBanner(true);
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !needsBanner) return undefined;
    const t = setTimeout(() => setVisible(true), 800);
    return () => clearTimeout(t);
  }, [ready, needsBanner]);

  const dismiss = (value) => {
    localStorage.setItem(CONSENT_KEY, value);
    setExiting(true);
    setTimeout(() => setUnmounted(true), 200);
  };

  if (!ready || !needsBanner || unmounted) {
    return null;
  }

  const bannerClass = [
    'cvp-cookie-banner',
    visible && !exiting ? 'cvp-cookie-banner--in' : '',
    exiting ? 'cvp-cookie-banner--out' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <>
      <style>{styleBlock}</style>
      <div className={bannerClass} role="dialog" aria-label="Cookie preferences">
        <div className="cvp-cookie-banner__inner">
          <p className="cvp-cookie-banner__text">
            We use essential cookies to keep CVPassport running, and optional analytics
            cookies to understand how people use the product. No data is sold.{' '}
            <a className="cvp-cookie-banner__link" href="/privacy">
              Privacy Policy
            </a>
          </p>
          <div className="cvp-cookie-banner__actions">
            <button
              type="button"
              className="cvp-cookie-banner__btn-primary"
              onClick={() => dismiss('accepted')}
            >
              Accept All
            </button>
            <button
              type="button"
              className="cvp-cookie-banner__btn-secondary"
              onClick={() => dismiss('declined')}
            >
              Essential Only
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default CookieBanner;
