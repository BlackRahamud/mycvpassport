import { useEffect, useRef, useState } from 'react';

const CONSENT_KEY = 'cvp_cookie_consent';

const styleBlock = `
  .cvp-cookie-banner {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 999;
    background: var(--glass);
    -webkit-backdrop-filter: blur(12px);
    backdrop-filter: blur(12px);
    border-top: 1px solid var(--border);
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
    color: var(--text-primary);
    text-decoration: underline;
  }
  .cvp-cookie-banner__link:visited {
    color: var(--text-primary);
  }
  .cvp-cookie-banner__actions {
    display: flex;
    flex-direction: row;
    gap: 12px;
    flex-shrink: 0;
    align-items: center;
  }
  .cvp-cookie-banner__btn-primary {
    background: var(--text-primary);
    color: var(--bg);
    font-size: 13px;
    padding: 8px 16px;
    border-radius: 6px;
    border: none;
    cursor: pointer;
    font-family: inherit;
    transition: opacity 150ms ease;
  }
  .cvp-cookie-banner__btn-primary:hover {
    opacity: 0.85;
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
    color: var(--text-primary);
    border-color: var(--text-primary);
  }
  @media (max-width: 768px) {
    .cvp-cookie-banner__inner {
      flex-direction: column;
      align-items: flex-start;
      gap: 12px;
    }
    /* The banner is the last thing above the home indicator. Without this
       the Accept / Essential Only buttons sit under it on a notched phone,
       which makes consent hard to give and the banner hard to dismiss. */
    .cvp-cookie-banner {
      padding-bottom: max(16px, env(safe-area-inset-bottom, 0px));
    }
  }
`;

function CookieBanner() {
  const [ready, setReady] = useState(false);
  const [needsBanner, setNeedsBanner] = useState(false);
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [unmounted, setUnmounted] = useState(false);
  const bannerRef = useRef(null);

  /* Publish the banner's live height as --cvp-cookie-h so other fixed
     bottom-anchored UI (the landing FAB) can lift clear of it instead of
     being buried under a z-index 999 full-width bar. Measured rather than
     hardcoded: the banner is one row on desktop and three on a phone.
     Cleared on unmount so the offset never outlives the banner. */
  useEffect(() => {
    const root = document.documentElement;
    const node = bannerRef.current;
    if (!node || exiting || unmounted) {
      root.style.removeProperty('--cvp-cookie-h');
      return undefined;
    }
    const publish = () => {
      root.style.setProperty('--cvp-cookie-h', `${Math.round(node.getBoundingClientRect().height)}px`);
    };
    publish();
    let ro;
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(publish);
      ro.observe(node);
    }
    window.addEventListener('resize', publish);
    return () => {
      if (ro) ro.disconnect();
      window.removeEventListener('resize', publish);
      root.style.removeProperty('--cvp-cookie-h');
    };
  }, [visible, exiting, unmounted]);

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
      <div ref={bannerRef} className={bannerClass} role="dialog" aria-label="Cookie preferences">
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
