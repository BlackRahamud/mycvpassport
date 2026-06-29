import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { NAV_SECTIONS, FREEBIE_BANNER_COPY } from '../../config/navItems';
import NavBadge from './NavBadge';

// webclaw cdPopIn — translateY(8px) scale(.98) → 0/1, snap easing, close reverses.
const SNAP = [0.2, 0.9, 0.3, 1];
const PANEL_VARIANTS = {
  hidden: { opacity: 0, y: 8, scale: 0.98 },
  shown: { opacity: 1, y: 0, scale: 1 },
};

function ChevronDownIcon({ open }) {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
      style={{
        transform: open ? 'rotate(180deg)' : 'rotate(0)',
        transition: 'transform var(--nav-dur-quick) var(--nav-ease)',
      }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export default function DesktopNav({ user, isPro }) {
  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const [openPanelId, setOpenPanelId] = useState(null);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!openPanelId) return;
    const onClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpenPanelId(null);
      }
    };
    const onKey = (e) => { if (e.key === 'Escape') setOpenPanelId(null); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [openPanelId]);

  useEffect(() => { setOpenPanelId(null); }, [location.pathname]);

  const isActiveSection = (section) =>
    section.items.some(
      (it) => it.href === location.pathname || (it.href !== '/' && location.pathname.startsWith(it.href + '/'))
    );

  const handleItemClick = (item) => {
    if (item.requiresAuth && !user) return;
    if (item.requiresPro && !isPro) {
      navigate('/pricing');
      setOpenPanelId(null);
      return;
    }
    navigate(item.href);
    setOpenPanelId(null);
  };

  return (
    <nav
      ref={rootRef}
      className="cvp-desktop-nav"
      role="navigation"
      aria-label="Primary"
    >
      <style>{`
        .cvp-desktop-nav {
          position: relative;
          display: flex;
          align-items: center;
          gap: 4px;
          font-family: inherit;
        }
        @media (max-width: 768px) {
          .cvp-desktop-nav { display: none; }
        }
        .cvp-desktop-nav-trigger {
          position: relative;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: transparent;
          border: none;
          color: var(--nav-text-muted);
          font-family: inherit;
          font-size: 14px;
          font-weight: 500;
          padding: 8px 16px;
          border-radius: var(--nav-radius-pill);
          cursor: pointer;
          transition: background-color var(--nav-dur-quick) var(--nav-ease),
                      color var(--nav-dur-quick) var(--nav-ease);
        }
        .cvp-desktop-nav-trigger:hover,
        .cvp-desktop-nav-trigger[data-open="true"],
        .cvp-desktop-nav-trigger[data-active="true"] {
          background: var(--nav-surface-elevated);
          color: var(--nav-text);
        }
        .cvp-desktop-nav-trigger:focus-visible {
          outline: 2px solid var(--nav-border-focus);
          outline-offset: 2px;
        }
        @media (prefers-reduced-motion: reduce) {
          .cvp-desktop-nav-trigger { transition: none !important; }
        }
        .cvp-desktop-nav-trigger-emphasis {
          position: absolute;
          top: 6px;
          right: 10px;
          width: 6px;
          height: 6px;
          background: var(--nav-accent);
          border-radius: var(--nav-radius-pill);
        }
        .cvp-desktop-nav-panel {
          position: absolute;
          top: 100%;
          margin-top: 8px;
          min-width: 280px;
          max-width: 360px;
          background: var(--nav-surface-elevated);
          border: 1px solid var(--nav-border-hairline);
          border-radius: var(--nav-radius-md);
          padding: 8px;
          z-index: var(--nav-z-header);
          transform-origin: top center;
          box-shadow: 0 16px 40px rgba(28, 23, 20, 0.22);
        }
        .cvp-desktop-nav-banner {
          font-size: 12px;
          color: var(--nav-text-muted);
          padding: 6px 10px 10px;
          margin: 0 0 4px;
          border-bottom: 1px solid var(--nav-border-hairline);
        }
        .cvp-desktop-nav-item {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 12px;
          background: transparent;
          border: none;
          color: var(--nav-text);
          font-family: inherit;
          font-size: 14px;
          font-weight: 500;
          text-align: left;
          border-radius: var(--nav-radius-sm);
          cursor: pointer;
          transition: background-color var(--nav-dur-quick) var(--nav-ease),
                      color var(--nav-dur-quick) var(--nav-ease);
        }
        .cvp-desktop-nav-item:hover { background: var(--nav-surface); }
        .cvp-desktop-nav-item:focus-visible {
          outline: 2px solid var(--nav-border-focus);
          outline-offset: -2px;
        }
        .cvp-desktop-nav-item[data-active="true"] {
          color: var(--nav-accent);
          background: var(--nav-accent-subtle);
        }
        .cvp-desktop-nav-item[data-disabled="true"] {
          color: var(--nav-text-disabled);
          cursor: default;
          opacity: 1;
        }
        .cvp-desktop-nav-item[data-disabled="true"]:hover { background: transparent; }
        .cvp-desktop-nav-item-left {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          flex: 1;
        }
        .cvp-desktop-nav-item-hint {
          font-size: 10px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--nav-text-muted);
        }
        @media (prefers-reduced-motion: reduce) {
          .cvp-desktop-nav-item { transition: none !important; }
        }
      `}</style>

      {NAV_SECTIONS.map((section, idx) => {
        const isOpen = openPanelId === section.id;
        const active = !isOpen && isActiveSection(section);
        const emphasis = idx === 0;
        return (
          <div key={section.id} style={{ position: 'relative' }}>
            <button
              type="button"
              className="cvp-desktop-nav-trigger"
              data-open={isOpen ? 'true' : undefined}
              data-active={active ? 'true' : undefined}
              aria-haspopup="true"
              aria-expanded={isOpen}
              aria-controls={`cvp-desktop-nav-panel-${section.id}`}
              onClick={() => setOpenPanelId(isOpen ? null : section.id)}
            >
              {section.label}
              <ChevronDownIcon open={isOpen} />
              {emphasis && <span className="cvp-desktop-nav-trigger-emphasis" aria-hidden="true" />}
            </button>

            <AnimatePresence>
              {isOpen && (
              <motion.div
                id={`cvp-desktop-nav-panel-${section.id}`}
                role="region"
                aria-label={section.label}
                className="cvp-desktop-nav-panel"
                variants={PANEL_VARIANTS}
                initial="hidden"
                animate="shown"
                exit="hidden"
                transition={reduceMotion ? { duration: 0 } : { duration: 0.16, ease: SNAP }}
              >
                {section.id === 'free-tools' && (
                  <p className="cvp-desktop-nav-banner">{FREEBIE_BANNER_COPY}</p>
                )}
                {section.items.map((item) => {
                  const authGated = item.requiresAuth && !user;
                  const itemActive = !authGated && (
                    item.href === location.pathname ||
                    (item.href !== '/' && location.pathname.startsWith(item.href + '/'))
                  );
                  return (
                    <button
                      key={item.href}
                      type="button"
                      className="cvp-desktop-nav-item"
                      data-active={itemActive ? 'true' : undefined}
                      data-disabled={authGated ? 'true' : undefined}
                      disabled={authGated}
                      aria-label={authGated ? `${item.label}, sign in required to access` : undefined}
                      onClick={authGated ? undefined : () => handleItemClick(item)}
                    >
                      <span className="cvp-desktop-nav-item-left">
                        <span>{item.label}</span>
                        {item.badge && <NavBadge label={item.badge} />}
                      </span>
                      {authGated && <span className="cvp-desktop-nav-item-hint">Sign in</span>}
                    </button>
                  );
                })}
              </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </nav>
  );
}
