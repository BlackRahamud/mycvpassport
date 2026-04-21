import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { NAV_SECTIONS, FREEBIE_BANNER_COPY } from '../../config/navItems';
import NavBadge from './NavBadge';

function CloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export default function MobileNav({
  isOpen,
  onClose,
  user,
  userType,
  avatarDest,
  onLogin,
  onSignup,
  onSignOut,
}) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  if (!isOpen) return null;

  const handleItemClick = (item) => {
    if (item.requiresAuth && !user) return;
    navigate(item.href);
    onClose();
  };

  const isActiveRoute = (href) => {
    if (href === location.pathname) return true;
    if (href !== '/' && location.pathname.startsWith(href + '/')) return true;
    return false;
  };

  return (
    <>
      <style>{`
        .cvp-nav-scrim {
          position: fixed; inset: 0;
          background: var(--nav-scrim);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: var(--nav-z-scrim);
          opacity: 0;
          animation: cvp-nav-scrim-in var(--nav-dur-standard) var(--nav-ease) forwards;
        }
        @keyframes cvp-nav-scrim-in { to { opacity: 1; } }
        .cvp-nav-drawer {
          position: fixed; top: 0; right: 0; bottom: 0;
          width: min(88vw, 420px);
          background: var(--nav-surface);
          border-left: 1px solid var(--nav-border-hairline);
          z-index: var(--nav-z-drawer);
          overflow-y: auto;
          overscroll-behavior: contain;
          padding: max(16px, env(safe-area-inset-top)) 16px max(24px, env(safe-area-inset-bottom));
          display: flex;
          flex-direction: column;
          transform: translateX(100%) translateZ(0);
          animation: cvp-nav-drawer-in var(--nav-dur-standard) var(--nav-ease) forwards;
          color: var(--nav-text);
          box-sizing: border-box;
          font-family: inherit;
        }
        @keyframes cvp-nav-drawer-in { to { transform: translateX(0) translateZ(0); } }
        @media (prefers-reduced-motion: reduce) {
          .cvp-nav-scrim, .cvp-nav-drawer { animation-duration: 10ms !important; }
        }
        .cvp-nav-drawer-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 4px 4px 12px;
        }
        .cvp-nav-drawer-title {
          font-size: 20px; font-weight: 600; margin: 0;
          color: var(--nav-text);
          font-family: inherit;
        }
        .cvp-nav-drawer-close {
          background: transparent; border: none; color: var(--nav-text);
          width: 48px; height: 48px;
          display: inline-flex; align-items: center; justify-content: center;
          border-radius: var(--nav-radius-md);
          cursor: pointer; margin-right: -12px; padding: 0;
          transition: background-color var(--nav-dur-quick) var(--nav-ease);
          font-family: inherit;
        }
        .cvp-nav-drawer-close:hover { background: var(--nav-surface-elevated); }
        .cvp-nav-drawer-close:focus-visible { outline: 2px solid var(--nav-border-focus); outline-offset: 2px; }
        .cvp-nav-banner {
          font-size: 13px; color: var(--nav-text-muted);
          padding: 0 4px 4px; margin: 0 0 8px;
        }
        .cvp-nav-section { margin-top: 20px; }
        .cvp-nav-section-header {
          font-size: 11px; font-weight: 600; letter-spacing: 0.24px;
          text-transform: uppercase;
          color: var(--nav-text-muted);
          padding: 8px 4px;
          border-bottom: 1px solid var(--nav-border-hairline);
          margin: 0;
        }
        .cvp-nav-item {
          width: 100%;
          min-height: 56px;
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px;
          padding: 14px 12px;
          background: transparent; border: none;
          border-bottom: 1px solid var(--nav-border-hairline);
          color: var(--nav-text);
          font-family: inherit;
          font-size: 16px; font-weight: 500;
          text-align: left;
          cursor: pointer;
          transition: background-color var(--nav-dur-quick) var(--nav-ease),
                      color var(--nav-dur-quick) var(--nav-ease);
        }
        .cvp-nav-item:hover { background: var(--nav-surface-elevated); }
        .cvp-nav-item:focus-visible { outline: 2px solid var(--nav-border-focus); outline-offset: -2px; }
        .cvp-nav-item[data-active="true"] {
          color: var(--nav-accent); background: var(--nav-accent-subtle);
        }
        .cvp-nav-item[data-disabled="true"] {
          color: var(--nav-text-disabled); cursor: default;
          opacity: 1;
        }
        .cvp-nav-item[data-disabled="true"]:hover { background: transparent; }
        .cvp-nav-item-left {
          display: inline-flex; align-items: center; gap: 10px; min-width: 0; flex: 1;
        }
        .cvp-nav-item-label {
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .cvp-nav-item-hint {
          font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase;
          color: var(--nav-text-muted);
          font-weight: 500;
        }
        @media (prefers-reduced-motion: reduce) {
          .cvp-nav-item, .cvp-nav-drawer-close { transition: none !important; }
        }
        .cvp-nav-footer {
          margin-top: auto;
          padding-top: 24px;
          border-top: 1px solid var(--nav-border-hairline);
          display: flex; flex-direction: column; gap: 10px;
        }
        .cvp-nav-cta-primary {
          width: 100%;
          min-height: 48px;
          background: var(--nav-accent);
          color: var(--nav-surface);
          border: none; border-radius: var(--nav-radius-pill);
          font-family: inherit;
          font-size: 15px; font-weight: 600;
          cursor: pointer;
          padding: 14px 20px;
          transition: background-color var(--nav-dur-quick) var(--nav-ease);
        }
        .cvp-nav-cta-primary:hover { background: var(--nav-accent-hover); }
        .cvp-nav-cta-primary:focus-visible { outline: 2px solid var(--nav-border-focus); outline-offset: 2px; }
        .cvp-nav-cta-secondary {
          width: 100%;
          min-height: 48px;
          background: transparent;
          color: var(--nav-text);
          border: 1px solid var(--nav-border-hairline);
          border-radius: var(--nav-radius-pill);
          font-family: inherit;
          font-size: 15px; font-weight: 500;
          cursor: pointer;
          padding: 14px 20px;
          transition: background-color var(--nav-dur-quick) var(--nav-ease);
        }
        .cvp-nav-cta-secondary:hover { background: var(--nav-surface-elevated); }
        .cvp-nav-cta-secondary:focus-visible { outline: 2px solid var(--nav-border-focus); outline-offset: 2px; }
      `}</style>

      <div
        className="cvp-nav-scrim"
        role="presentation"
        aria-hidden="true"
        onClick={onClose}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Main navigation"
        className="cvp-nav-drawer"
      >
        <div className="cvp-nav-drawer-header">
          <h2 className="cvp-nav-drawer-title">Menu</h2>
          <button
            type="button"
            className="cvp-nav-drawer-close"
            onClick={onClose}
            aria-label="Close menu"
          >
            <CloseIcon />
          </button>
        </div>

        <p className="cvp-nav-banner">{FREEBIE_BANNER_COPY}</p>

        {NAV_SECTIONS.map((section) => (
          <section
            key={section.id}
            className="cvp-nav-section"
            aria-label={section.label}
          >
            <h3 className="cvp-nav-section-header">{section.label}</h3>
            {section.items.map((item) => {
              const authGated = item.requiresAuth && !user;
              const active = !authGated && isActiveRoute(item.href);
              return (
                <button
                  key={item.href}
                  type="button"
                  className="cvp-nav-item"
                  data-active={active ? 'true' : undefined}
                  data-disabled={authGated ? 'true' : undefined}
                  disabled={authGated}
                  aria-label={authGated ? `${item.label}, sign in required to access` : undefined}
                  onClick={authGated ? undefined : () => handleItemClick(item)}
                >
                  <span className="cvp-nav-item-left">
                    <span className="cvp-nav-item-label">{item.label}</span>
                    {item.badge && <NavBadge variant="free-tool" />}
                  </span>
                  {authGated ? (
                    <span className="cvp-nav-item-hint">Sign in</span>
                  ) : (
                    <ChevronRightIcon />
                  )}
                </button>
              );
            })}
          </section>
        ))}

        <div className="cvp-nav-footer">
          {user ? (
            <>
              <button
                type="button"
                className="cvp-nav-cta-primary"
                onClick={() => { navigate(avatarDest); onClose(); }}
              >
                {userType === 'recruiter' ? 'Go to Hiring Portal' : 'Go to Dashboard'}
              </button>
              <button
                type="button"
                className="cvp-nav-cta-secondary"
                onClick={() => { onClose(); if (onSignOut) onSignOut(); }}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="cvp-nav-cta-primary"
                onClick={() => { onClose(); if (onSignup) onSignup(); }}
              >
                Create account — free
              </button>
              <button
                type="button"
                className="cvp-nav-cta-secondary"
                onClick={() => { onClose(); if (onLogin) onLogin(); }}
              >
                Sign in
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
