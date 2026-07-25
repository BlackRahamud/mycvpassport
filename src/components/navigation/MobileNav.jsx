import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { NAV_SECTIONS, FREEBIE_BANNER_COPY } from '../../config/navItems';
import { isGatedJobPath } from '../../config/jobsBoard';
import { useBrowseJobs } from '../jobs/useBrowseJobs';
import NavBadge from './NavBadge';
import NavIcon from './NavIcon';

// webclaw sideDrawerIn — translateX(100%) → 0 over .22s, snap easing; close reverses.
// Accordion bodies expand with a matching height + fade on the same curve.
const SNAP = [0.2, 0.9, 0.3, 1];

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

function ChevronDownIcon({ open }) {
  return (
    <svg
      width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
      className="cvp-nav-acc-chev" data-open={open ? 'true' : undefined}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

export default function MobileNav({
  isOpen,
  onClose,
  user,
  isPro,
  userType,
  avatarDest,
  onLogin,
  onSignup,
  onSignOut,
  logo,
  isDark,
  onToggleTheme,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const browseJobs = useBrowseJobs(user);
  const drawerRef = useRef(null);
  // Single-open accordion — first section (Free Tools) open by default.
  const [openSectionId, setOpenSectionId] = useState(NAV_SECTIONS[0]?.id || null);

  // Esc closes.
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  // Close on route change.
  useEffect(() => {
    if (isOpen) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  // Body scroll-lock with scrollbar compensation — no layout shift on open.
  useEffect(() => {
    if (!isOpen) return undefined;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    const prevOverflow = document.body.style.overflow;
    const prevPad = document.body.style.paddingRight;
    document.body.style.overflow = 'hidden';
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPad;
    };
  }, [isOpen]);

  // Focus trap — move focus into the drawer, keep Tab cycling inside it.
  useEffect(() => {
    if (!isOpen) return undefined;
    const node = drawerRef.current;
    if (!node) return undefined;
    const focusables = () => Array.from(
      node.querySelectorAll(
        'button:not([disabled]), a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => el.offsetParent !== null || el === document.activeElement);
    const t = setTimeout(() => { focusables()[0]?.focus(); }, 60);
    const onKey = (e) => {
      if (e.key !== 'Tab') return;
      const f = focusables();
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    node.addEventListener('keydown', onKey);
    return () => { clearTimeout(t); node.removeEventListener('keydown', onKey); };
  }, [isOpen]);

  const handleItemClick = (item) => {
    if (item.requiresAuth && !user) return;
    if (item.requiresPro && !isPro) {
      navigate('/pricing');
      onClose();
      return;
    }
    // Jobs board is not live yet — close the drawer and open the gate.
    if (isGatedJobPath(item.href)) {
      browseJobs.go(item.href);
      onClose();
      return;
    }
    navigate(item.href);
    onClose();
  };

  const goSeeAll = (href) => {
    if (isGatedJobPath(href)) {
      browseJobs.go(href);
      onClose();
      return;
    }
    navigate(href);
    onClose();
  };

  const isActiveRoute = (href) => {
    if (href === location.pathname) return true;
    if (href !== '/' && location.pathname.startsWith(href + '/')) return true;
    return false;
  };

  const scrimT = reduceMotion ? { duration: 0 } : { duration: 0.18, ease: SNAP };
  const drawerT = reduceMotion ? { duration: 0 } : { duration: 0.22, ease: SNAP };
  const accT = reduceMotion ? { duration: 0 } : { duration: 0.22, ease: SNAP };

  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <>
          <style>{`
            .cvp-nav-scrim {
              position: fixed; inset: 0;
              background: var(--nav-scrim);
              z-index: var(--nav-z-scrim);
            }
            .cvp-nav-drawer {
              position: fixed; top: 0; right: 0; bottom: 0;
              width: min(86vw, 400px);
              background: var(--nav-surface);
              border-left: 1px solid var(--nav-border-hairline);
              z-index: var(--nav-z-drawer);
              display: flex;
              flex-direction: column;
              color: var(--nav-text);
              box-sizing: border-box;
              font-family: inherit;
              box-shadow: -24px 0 60px rgba(0, 0, 0, 0.5);
              will-change: transform;
            }
            .cvp-nav-drawer-header {
              flex: 0 0 auto;
              display: flex; align-items: center; justify-content: space-between;
              gap: 12px;
              padding: max(14px, env(safe-area-inset-top)) 16px 12px;
              border-bottom: 1px solid var(--nav-border-hairline);
            }
            .cvp-nav-drawer-brand {
              display: inline-flex; align-items: center; gap: 8px;
              color: var(--nav-text); text-decoration: none;
              font-weight: 700; font-size: 17px; letter-spacing: -0.01em;
            }
            .cvp-nav-drawer-actions { display: inline-flex; align-items: center; gap: 4px; }
            .cvp-nav-iconbtn {
              background: transparent; border: none; color: var(--nav-text);
              width: 44px; height: 44px;
              display: inline-flex; align-items: center; justify-content: center;
              border-radius: var(--nav-radius-md);
              cursor: pointer; padding: 0;
              transition: background-color var(--nav-dur-quick) var(--nav-ease);
              font-family: inherit;
            }
            .cvp-nav-iconbtn:hover { background: var(--nav-surface-elevated); }
            .cvp-nav-iconbtn:focus-visible { outline: 2px solid var(--nav-border-focus); outline-offset: 2px; }
            .cvp-nav-drawer-scroll {
              flex: 1 1 auto;
              overflow-y: auto;
              overscroll-behavior: contain;
              -webkit-overflow-scrolling: touch;
              padding: 4px 12px 16px;
            }
            .cvp-nav-banner {
              font-size: 12px; letter-spacing: 0.01em;
              color: var(--nav-text-muted);
              padding: 12px 8px 4px; margin: 0;
            }
            /* Accordion */
            .cvp-nav-acc { border-bottom: 1px solid var(--nav-border-hairline); }
            .cvp-nav-acc-header {
              width: 100%; min-height: 48px;
              display: flex; align-items: center; justify-content: space-between;
              gap: 12px; padding: 12px 8px;
              background: transparent; border: none;
              color: var(--nav-text);
              font-family: inherit; font-size: 15px; font-weight: 600;
              text-align: left; cursor: pointer;
              transition: color var(--nav-dur-quick) var(--nav-ease);
            }
            .cvp-nav-acc-header:focus-visible { outline: 2px solid var(--nav-border-focus); outline-offset: -2px; }
            .cvp-nav-acc-chev {
              flex: 0 0 auto; color: var(--nav-text-muted);
              transition: transform var(--nav-dur-quick) var(--nav-ease);
            }
            .cvp-nav-acc-chev[data-open="true"] { transform: rotate(180deg); }
            .cvp-nav-acc-body { overflow: hidden; }
            .cvp-nav-acc-inner { padding: 2px 0 10px; }
            /* Rich item row */
            .cvp-nav-item {
              width: 100%; min-height: 48px;
              display: flex; align-items: center; gap: 12px;
              padding: 10px 8px;
              background: transparent; border: none;
              color: var(--nav-text);
              font-family: inherit; text-align: left; cursor: pointer;
              border-radius: var(--nav-radius-sm);
              transition: background-color var(--nav-dur-quick) var(--nav-ease);
            }
            .cvp-nav-item:hover { background: var(--nav-surface-elevated); }
            .cvp-nav-item:active { background: var(--nav-accent-subtle); }
            .cvp-nav-item:focus-visible { outline: 2px solid var(--nav-border-focus); outline-offset: -2px; }
            .cvp-nav-item[data-active="true"] { background: var(--nav-accent-subtle); }
            .cvp-nav-item[data-disabled="true"] { cursor: default; }
            .cvp-nav-item[data-disabled="true"]:hover { background: transparent; }
            .cvp-nav-item-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
            .cvp-nav-item-title {
              display: inline-flex; align-items: center; gap: 8px;
              font-size: 15px; font-weight: 500; color: var(--nav-text);
              overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
            }
            .cvp-nav-item[data-active="true"] .cvp-nav-item-title { color: var(--nav-accent); }
            .cvp-nav-item[data-disabled="true"] .cvp-nav-item-title { color: var(--nav-text-disabled); }
            .cvp-nav-item-desc {
              font-size: 12px; line-height: 1.4; color: var(--nav-text-muted);
              overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
            }
            .cvp-nav-item-hint {
              font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase;
              color: var(--nav-text-muted); font-weight: 500; flex: 0 0 auto;
            }
            .cvp-nav-seeall {
              display: inline-flex; align-items: center; gap: 6px;
              margin: 2px 0 4px; padding: 10px 8px;
              background: transparent; border: none;
              color: var(--nav-accent);
              font-family: inherit; font-size: 14px; font-weight: 600;
              cursor: pointer; border-radius: var(--nav-radius-sm); min-height: 48px;
              transition: background-color var(--nav-dur-quick) var(--nav-ease);
            }
            .cvp-nav-seeall:hover { background: var(--nav-accent-subtle); }
            .cvp-nav-seeall:focus-visible { outline: 2px solid var(--nav-border-focus); outline-offset: -2px; }
            /* Employer doorway — a separate-audience card AFTER the candidate
               menu groups (the last accordion's hairline is the divider above
               it). Outlined card on the elevated surface: quieter than the
               menu items, unmistakably not one of them. */
            .cvp-nav-employer {
              width: 100%; min-height: 60px;
              display: flex; align-items: center; gap: 12px;
              margin: 14px 0 6px; padding: 12px;
              background: var(--nav-surface-elevated);
              border: 1px solid var(--nav-border-hairline);
              border-radius: var(--nav-radius-md);
              color: var(--nav-text);
              font-family: inherit; text-align: left; cursor: pointer;
              transition: background-color var(--nav-dur-quick) var(--nav-ease),
                          border-color var(--nav-dur-quick) var(--nav-ease),
                          transform var(--nav-dur-quick) var(--nav-ease);
            }
            .cvp-nav-employer:hover { border-color: var(--nav-text-muted); }
            .cvp-nav-employer:active { transform: scale(0.985); background: var(--nav-accent-subtle); }
            .cvp-nav-employer:focus-visible { outline: 2px solid var(--nav-border-focus); outline-offset: 2px; }
            .cvp-nav-employer-title { font-size: 14.5px; font-weight: 600; color: var(--nav-text); }
            .cvp-nav-employer-chev { flex: 0 0 auto; color: var(--nav-text-muted); }
            /* Pinned bottom CTA */
            .cvp-nav-footer {
              flex: 0 0 auto;
              padding: 14px 16px max(16px, env(safe-area-inset-bottom));
              border-top: 1px solid var(--nav-border-hairline);
              background: var(--nav-surface);
              display: flex; flex-direction: column; gap: 10px;
            }
            .cvp-nav-cta-primary {
              width: 100%; min-height: 48px;
              background: var(--nav-accent); color: var(--nav-surface);
              border: none; border-radius: var(--nav-radius-pill);
              font-family: inherit; font-size: 15px; font-weight: 700;
              cursor: pointer; padding: 14px 20px;
              transition: background-color var(--nav-dur-quick) var(--nav-ease),
                          transform var(--nav-dur-quick) var(--nav-ease);
            }
            .cvp-nav-cta-primary:hover { background: var(--nav-accent-hover); }
            .cvp-nav-cta-primary:active { transform: translateY(1px); }
            .cvp-nav-cta-primary:focus-visible { outline: 2px solid var(--nav-border-focus); outline-offset: 2px; }
            .cvp-nav-cta-secondary {
              width: 100%; min-height: 48px;
              background: transparent; color: var(--nav-text);
              border: 1px solid var(--nav-border-hairline);
              border-radius: var(--nav-radius-pill);
              font-family: inherit; font-size: 15px; font-weight: 500;
              cursor: pointer; padding: 14px 20px;
              transition: background-color var(--nav-dur-quick) var(--nav-ease);
            }
            .cvp-nav-cta-secondary:hover { background: var(--nav-surface-elevated); }
            .cvp-nav-cta-secondary:focus-visible { outline: 2px solid var(--nav-border-focus); outline-offset: 2px; }
            @media (prefers-reduced-motion: reduce) {
              .cvp-nav-iconbtn, .cvp-nav-item, .cvp-nav-acc-header, .cvp-nav-acc-chev,
              .cvp-nav-seeall, .cvp-nav-employer, .cvp-nav-cta-primary, .cvp-nav-cta-secondary {
                transition-duration: 0.01ms !important;
              }
            }
          `}</style>

          <motion.div
            className="cvp-nav-scrim"
            role="presentation"
            aria-hidden="true"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={scrimT}
          />

          <motion.aside
            ref={drawerRef}
            id="cvp-mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Main navigation"
            className="cvp-nav-drawer"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={drawerT}
          >
            <div className="cvp-nav-drawer-header">
              <button
                type="button"
                className="cvp-nav-drawer-brand cvp-nav-iconbtn"
                style={{ width: 'auto', padding: '6px 8px 6px 4px' }}
                onClick={() => { navigate('/'); onClose(); }}
                aria-label="CVPassport home"
              >
                {logo || 'CVPassport'}
              </button>
              <div className="cvp-nav-drawer-actions">
                {onToggleTheme && (
                  <button
                    type="button"
                    className="cvp-nav-iconbtn"
                    onClick={onToggleTheme}
                    aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
                  >
                    {isDark ? <SunIcon /> : <MoonIcon />}
                  </button>
                )}
                <button
                  type="button"
                  className="cvp-nav-iconbtn"
                  onClick={onClose}
                  aria-label="Close menu"
                >
                  <CloseIcon />
                </button>
              </div>
            </div>

            <div className="cvp-nav-drawer-scroll">
              <p className="cvp-nav-banner">{FREEBIE_BANNER_COPY}</p>

              {NAV_SECTIONS.map((section) => {
                const sectionOpen = openSectionId === section.id;
                const panelId = `cvp-nav-acc-${section.id}`;
                return (
                  <div className="cvp-nav-acc" key={section.id}>
                    <button
                      type="button"
                      className="cvp-nav-acc-header"
                      aria-expanded={sectionOpen}
                      aria-controls={panelId}
                      onClick={() => setOpenSectionId((cur) => (cur === section.id ? null : section.id))}
                    >
                      <span>{section.label}</span>
                      <ChevronDownIcon open={sectionOpen} />
                    </button>

                    <AnimatePresence initial={false}>
                      {sectionOpen && (
                        <motion.div
                          id={panelId}
                          role="region"
                          aria-label={section.label}
                          className="cvp-nav-acc-body"
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={accT}
                        >
                          <div className="cvp-nav-acc-inner">
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
                                  <NavIcon name={item.icon} muted={authGated} />
                                  <span className="cvp-nav-item-text">
                                    <span className="cvp-nav-item-title">
                                      {item.label}
                                      {item.badge && <NavBadge label={item.badge} />}
                                    </span>
                                    <span className="cvp-nav-item-desc">{item.desc}</span>
                                  </span>
                                  {authGated && <span className="cvp-nav-item-hint">Sign in</span>}
                                </button>
                              );
                            })}

                            {section.seeAll && (
                              <button
                                type="button"
                                className="cvp-nav-seeall"
                                onClick={() => goSeeAll(section.seeAll.href)}
                              >
                                {section.seeAll.label} <span aria-hidden="true">→</span>
                              </button>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}

              {/* Separate audience: recruiters. One quiet card, not a menu row —
                  the last accordion's bottom hairline is the divider above it. */}
              <button
                type="button"
                className="cvp-nav-employer"
                onClick={() => { navigate('/employer'); onClose(); }}
              >
                <NavIcon name="briefcase" />
                <span className="cvp-nav-item-text">
                  <span className="cvp-nav-employer-title">For Employers</span>
                  <span className="cvp-nav-item-desc">Post jobs &amp; find Gulf talent</span>
                </span>
                <span className="cvp-nav-employer-chev" aria-hidden="true"><ChevronRightIcon /></span>
              </button>
            </div>

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
          </motion.aside>
        </>
      )}
    </AnimatePresence>
    {/* Outside AnimatePresence on purpose: the drawer closes as the gate
        opens, and the gate must survive that unmount. */}
    {browseJobs.gate}
    </>
  );
}
