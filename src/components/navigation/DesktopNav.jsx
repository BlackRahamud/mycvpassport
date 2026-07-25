import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { NAV_SECTIONS, FREEBIE_BANNER_COPY } from '../../config/navItems';
import { isGatedJobPath } from '../../config/jobsBoard';
import { useBrowseJobs } from '../jobs/useBrowseJobs';
import NavBadge from './NavBadge';
import NavIcon from './NavIcon';

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
  const browseJobs = useBrowseJobs(user);
  const reduceMotion = useReducedMotion();
  const [openPanelId, setOpenPanelId] = useState(null);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!openPanelId) return undefined;
    const onClick = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpenPanelId(null);
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
    // Jobs board is not live yet — open the Boarding Soon gate instead of
    // landing the visitor on a board with nothing in it.
    if (isGatedJobPath(item.href)) {
      browseJobs.go(item.href);
      setOpenPanelId(null);
      return;
    }
    navigate(item.href);
    setOpenPanelId(null);
  };

  const goSeeAll = (href) => {
    if (isGatedJobPath(href)) {
      browseJobs.go(href);
      setOpenPanelId(null);
      return;
    }
    navigate(href);
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
        .cvp-desktop-nav-group { position: relative; }
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
          left: 0;
          margin-top: 8px;
          background: var(--nav-surface-elevated);
          border: 1px solid var(--nav-border-hairline);
          border-radius: var(--nav-radius-md);
          padding: 8px;
          z-index: var(--nav-z-header);
          transform-origin: top left;
          box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45);
        }
        .cvp-desktop-nav-panel[data-wide="true"] { min-width: 540px; }
        .cvp-desktop-nav-panel[data-wide="false"] { min-width: 320px; max-width: 360px; }
        .cvp-desktop-nav-note {
          font-size: 12px;
          color: var(--nav-text-muted);
          padding: 6px 10px 10px;
          margin: 0 4px 4px;
          border-bottom: 1px solid var(--nav-border-hairline);
        }
        .cvp-desktop-nav-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 2px;
        }
        .cvp-desktop-nav-grid[data-cols="2"] { grid-template-columns: 1fr 1fr; }
        .cvp-desktop-nav-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 10px;
          background: transparent;
          border: none;
          color: var(--nav-text);
          font-family: inherit;
          text-align: left;
          border-radius: var(--nav-radius-sm);
          cursor: pointer;
          transition: background-color var(--nav-dur-quick) var(--nav-ease);
        }
        .cvp-desktop-nav-item:hover { background: var(--nav-surface); }
        .cvp-desktop-nav-item:focus-visible {
          outline: 2px solid var(--nav-border-focus);
          outline-offset: -2px;
        }
        .cvp-desktop-nav-item[data-active="true"] { background: var(--nav-accent-subtle); }
        .cvp-desktop-nav-item[data-disabled="true"] { cursor: default; }
        .cvp-desktop-nav-item[data-disabled="true"]:hover { background: transparent; }
        .cvp-desktop-nav-item-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
        .cvp-desktop-nav-item-title {
          display: inline-flex; align-items: center; gap: 8px;
          font-size: 14px; font-weight: 600; color: var(--nav-text);
        }
        .cvp-desktop-nav-item[data-active="true"] .cvp-desktop-nav-item-title { color: var(--nav-accent); }
        .cvp-desktop-nav-item[data-disabled="true"] .cvp-desktop-nav-item-title { color: var(--nav-text-disabled); }
        .cvp-desktop-nav-item-desc {
          font-size: 12px; line-height: 1.4; color: var(--nav-text-muted);
          overflow: hidden; text-overflow: ellipsis;
        }
        .cvp-desktop-nav-item-hint {
          font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase;
          color: var(--nav-text-muted); align-self: center; flex: 0 0 auto;
        }
        @media (prefers-reduced-motion: reduce) {
          .cvp-desktop-nav-item { transition: none !important; }
        }
        .cvp-desktop-nav-seeall {
          display: inline-flex; align-items: center; gap: 6px;
          margin: 6px 4px 2px;
          padding: 8px 10px;
          background: transparent; border: none;
          color: var(--nav-accent);
          font-family: inherit; font-size: 13px; font-weight: 600;
          cursor: pointer; border-radius: var(--nav-radius-sm);
          transition: background-color var(--nav-dur-quick) var(--nav-ease);
        }
        .cvp-desktop-nav-seeall:hover { background: var(--nav-accent-subtle); }
        .cvp-desktop-nav-seeall:focus-visible { outline: 2px solid var(--nav-border-focus); outline-offset: -2px; }
      `}</style>

      {NAV_SECTIONS.map((section, idx) => {
        const isOpen = openPanelId === section.id;
        const active = !isOpen && isActiveSection(section);
        const emphasis = idx === 0;
        const wide = section.id === 'free-tools';
        return (
          <div
            key={section.id}
            className="cvp-desktop-nav-group"
            onMouseEnter={() => setOpenPanelId(section.id)}
            onMouseLeave={() => setOpenPanelId((cur) => (cur === section.id ? null : cur))}
          >
            <button
              type="button"
              className="cvp-desktop-nav-trigger"
              data-open={isOpen ? 'true' : undefined}
              data-active={active ? 'true' : undefined}
              aria-haspopup="true"
              aria-expanded={isOpen}
              aria-controls={`cvp-desktop-nav-panel-${section.id}`}
              onClick={() => setOpenPanelId(isOpen ? null : section.id)}
              onFocus={() => setOpenPanelId(section.id)}
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
                  data-wide={wide ? 'true' : 'false'}
                  variants={PANEL_VARIANTS}
                  initial="hidden"
                  animate="shown"
                  exit="hidden"
                  transition={reduceMotion ? { duration: 0 } : { duration: 0.16, ease: SNAP }}
                >
                  {section.id === 'free-tools' && (
                    <p className="cvp-desktop-nav-note">{FREEBIE_BANNER_COPY}</p>
                  )}

                  <div className="cvp-desktop-nav-grid" data-cols={wide ? '2' : '1'}>
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
                          <NavIcon name={item.icon} muted={authGated} />
                          <span className="cvp-desktop-nav-item-text">
                            <span className="cvp-desktop-nav-item-title">
                              {item.label}
                              {item.badge && <NavBadge label={item.badge} />}
                            </span>
                            <span className="cvp-desktop-nav-item-desc">{item.desc}</span>
                          </span>
                          {authGated && <span className="cvp-desktop-nav-item-hint">Sign in</span>}
                        </button>
                      );
                    })}
                  </div>

                  {section.seeAll && (
                    <button
                      type="button"
                      className="cvp-desktop-nav-seeall"
                      onClick={() => goSeeAll(section.seeAll.href)}
                    >
                      {section.seeAll.label} <span aria-hidden="true">→</span>
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
      {browseJobs.gate}
    </nav>
  );
}
