import { useState, useEffect } from 'react';
import React from 'react';
import { Helmet } from 'react-helmet-async';
import { ReactComponent as FalconLogo } from './logo.svg';
import CVPlayCard from './components/CVPlayCard';

// ── SVG Icons (line style, 20×20 viewBox unless noted) ─────────────
function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/>
      <line x1="12" y1="1"  x2="12" y2="3"/>
      <line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22"  y1="4.22"  x2="5.64"  y2="5.64"/>
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1"  y1="12" x2="3"  y2="12"/>
      <line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22"  y1="19.78" x2="5.64"  y2="18.36"/>
      <line x1="18.36" y1="5.64"  x2="19.78" y2="4.22"/>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}

function HamburgerIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="3" y1="6"  x2="21" y2="6"/>
      <line x1="3" y1="12" x2="21" y2="12"/>
      <line x1="3" y1="18" x2="21" y2="18"/>
    </svg>
  );
}

function XCloseIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <line x1="18" y1="6"  x2="6"  y2="18"/>
      <line x1="6"  y1="6"  x2="18" y2="18"/>
    </svg>
  );
}

function XCircleIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="15" y1="9"  x2="9"  y2="15"/>
      <line x1="9"  y1="9"  x2="15" y2="15"/>
    </svg>
  );
}

function GridIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7"/>
      <rect x="14" y="3" width="7" height="7"/>
      <rect x="3" y="14" width="7" height="7"/>
      <rect x="14" y="14" width="7" height="7"/>
    </svg>
  );
}

function StarAchieveIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  );
}

function DocumentArrowIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="12" y1="18" x2="12" y2="12"/>
      <polyline points="9 15 12 18 15 15"/>
    </svg>
  );
}

function PlusCircleIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="12" y1="8" x2="12" y2="16"/>
      <line x1="8"  y1="12" x2="16" y2="12"/>
    </svg>
  );
}

function TemplateIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <line x1="3"  y1="9"  x2="21" y2="9"/>
      <line x1="9"  y1="9"  x2="9"  y2="21"/>
    </svg>
  );
}

function DownloadArrowIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="7 10 12 15 17 10"/>
      <line x1="12" y1="15" x2="12" y2="3"/>
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <polyline points="12 6 12 12 16 14"/>
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

function WhatsAppIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
    </svg>
  );
}

function StarSmallIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  );
}

// ── Static data ─────────────────────────────────────────────────────
const PROBLEM_CARDS = [
  { icon: <XCircleIcon />,       title: 'Missing keywords',  desc: 'Your CV doesn\'t match the job description. ATS rejects it before a human ever sees it.' },
  { icon: <GridIcon />,          title: 'Poor formatting',   desc: 'Tables, columns, and graphics confuse ATS systems and lose your data entirely.' },
  { icon: <StarAchieveIcon />,   title: 'Weak achievements', desc: 'Generic job duties instead of quantified results. You look identical to every other applicant.' },
  { icon: <DocumentArrowIcon />, title: 'Wrong template',    desc: 'Using a template not built for Gulf employers kills your chances before the interview.' },
];

const STEPS = [
  { icon: <PlusCircleIcon />,   title: 'Add your details',   desc: 'Fill in your name, experience, skills, and Gulf-specific fields like visa status and nationality.' },
  { icon: <TemplateIcon />,     title: 'Pick a template',    desc: 'Choose from 11 ATS-optimised templates built for UAE banks, hospitality, tech, and more.' },
  { icon: <DownloadArrowIcon />,title: 'Download & apply',   desc: 'Export a perfect PDF in seconds. Share on WhatsApp or email it directly to recruiters.' },
];

function scrollToLandingSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Main component ──────────────────────────────────────────────────
export default function LandingPage({ onLogin, onSignup, onWalkIn, setPage }) {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('cvp-theme') || 'dark'; } catch { return 'dark'; }
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isDark = theme === 'dark';

  const T = isDark ? {
    bgPage:       '#0A0A0A',
    bgSurface:    '#141414',
    bgElevated:   '#1C1C1C',
    textPrimary:  '#FFFFFF',
    textSecondary:'#A0A0A0',
    border:       '#2A2A2A',
    navBg:        'rgba(10,10,10,0.92)',
    navBorder:    '#1E1E1E',
    btnPrimary:   '#FFFFFF',
    btnPrimaryTxt:'#000000',
    btnGhostBorder:'#333333',
    btnGhostTxt:  '#FFFFFF',
    walkInBg:     '#141414',
    accentCheck:  '#4ADE80',
  } : {
    bgPage:       '#F5F5F0',
    bgSurface:    '#FFFFFF',
    bgElevated:   '#F0F0EC',
    textPrimary:  '#111111',
    textSecondary:'#555555',
    border:       '#E5E5E5',
    navBg:        'rgba(245,245,240,0.92)',
    navBorder:    '#E5E5E5',
    btnPrimary:   '#111111',
    btnPrimaryTxt:'#FFFFFF',
    btnGhostBorder:'#CCCCCC',
    btnGhostTxt:  '#111111',
    walkInBg:     '#F0F0EC',
    accentCheck:  '#16A34A',
  };

  useEffect(() => {
    try { localStorage.setItem('cvp-theme', theme); } catch {}
    document.documentElement.className = theme;
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  const closeMobileMenu = () => setMobileMenuOpen(false);

  /** Nav items: Templates / Pricing = in-page anchors (no templates/pricing routes in App). ATS → page "ats". */
  const handleLandingNav = (item) => {
    if (item === 'Templates') scrollToLandingSection('lp-templates');
    else if (item === 'ATS Check') setPage && setPage('ats');
    else if (item === 'Pricing') scrollToLandingSection('lp-pricing');
  };

  return (
    <>
      <Helmet>
        <title>CVPassport — Build ATS-Friendly Resumes for UAE &amp; Gulf Jobs</title>
        <meta name="description" content="Build ATS-optimised resumes for UAE, Saudi Arabia and GCC job markets. Free templates, ATS score checker, and Walk-In CV builder for Gulf job seekers." />
        <meta name="keywords" content="resume builder UAE, CV builder Dubai, ATS resume Gulf, Gulf job CV, Saudi Arabia resume, GCC job seeker, Indian expat CV Dubai" />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="CVPassport" />
        <link rel="canonical" href="https://mycvpassport.com" />
        <meta property="og:title" content="CVPassport — ATS-Friendly Resume Builder for Gulf Jobs" />
        <meta property="og:description" content="Free resume builder for UAE, Saudi &amp; GCC job markets. ATS score checker, 11 professional templates, Walk-In CV mode." />
        <meta property="og:url" content="https://mycvpassport.com" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://mycvpassport.com/images/falcon-icon.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="CVPassport — Resume Builder for Gulf Jobs" />
        <meta name="twitter:description" content="ATS-optimised CVs for UAE, Saudi &amp; GCC. Free to build, free to download." />
        <meta name="twitter:image" content="https://mycvpassport.com/images/falcon-icon.png" />
      </Helmet>

      <style>{`
        @keyframes lp-arcflow { to { stroke-dashoffset: -20; } }
        @keyframes lp-globe-rotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        path[stroke="rgba(255,255,255,0.5)"] { stroke-dashoffset: 0; }
        @keyframes lp-cvLineIn {
          from { opacity: 0; transform: translateX(-12px); }
          to   { opacity: 1; transform: translateX(0); }
        }

        .lp-nav        { padding: 0 60px; }
        .lp-sec        { padding: 80px 60px; }
        .lp-hero       { padding: 80px 60px 32px; }
        .lp-hero + .lp-sec { padding-top: 48px; }
        .lp-walkin-sec { padding: 80px 60px; }

        /* Hover states */
        .lp-btn:hover      { opacity: 0.85; transform: translateY(-1px); }
        .lp-ghost-btn:hover{ opacity: 0.75; }
        .lp-nav-link:hover { color: #fff !important; }
        .lp-card:hover     { border-color: ${isDark ? 'rgba(255,255,255,0.14)' : '#BBBBBB'} !important; transform: translateY(-2px); }
        .lp-step-card:hover{ border-color: ${isDark ? 'rgba(255,255,255,0.14)' : '#BBBBBB'} !important; }
        .lp-theme-btn:hover{ opacity: 0.8; }

        /* Transitions */
        .lp-btn       { transition: opacity 0.2s cubic-bezier(0.4,0,0.2,1), transform 0.2s cubic-bezier(0.4,0,0.2,1); }
        .lp-ghost-btn { transition: opacity 0.2s cubic-bezier(0.4,0,0.2,1), transform 0.2s cubic-bezier(0.4,0,0.2,1); }
        .lp-nav-link  { transition: color 0.2s cubic-bezier(0.4,0,0.2,1); }
        .lp-card      { transition: border-color 0.2s cubic-bezier(0.4,0,0.2,1), transform 0.2s cubic-bezier(0.4,0,0.2,1); }
        .lp-step-card { transition: border-color 0.2s cubic-bezier(0.4,0,0.2,1); }
        .lp-theme-btn { transition: opacity 0.2s cubic-bezier(0.4,0,0.2,1); }
        .lp-wrapper   { transition: background-color 0.25s cubic-bezier(0.4,0,0.2,1), color 0.25s cubic-bezier(0.4,0,0.2,1); }

        /* Mobile — 390px first */
        @media (max-width: 768px) {
          .lp-nav          { padding: 0 20px; }
          .lp-sec          { padding: 60px 20px; }
          .lp-hero         { padding: 52px 20px 48px; }
          .lp-walkin-sec   { padding: 60px 20px; }
          .lp-nav-center   { display: none !important; }
          .lp-nav-desktop  { display: none !important; }
          .lp-hamburger    { display: flex !important; }
          .lp-hero-right   { display: none !important; }
          .lp-hero-content { max-width: 100% !important; }
          .lp-problem-grid { grid-template-columns: 1fr !important; }
          .lp-steps-grid   { grid-template-columns: 1fr !important; }
          .lp-walkin-right { display: none !important; }
          .lp-walkin-inner { flex-direction: column !important; gap: 32px !important; }
          .lp-trust-bar    { flex-direction: column; align-items: flex-start !important; gap: 8px !important; }
          .lp-trust-sep    { display: none !important; }
          .lp-hero-ctas    { flex-direction: column !important; }
          .lp-hero-ctas button { width: 100% !important; }
        }
        @media (min-width: 769px) {
          .lp-hamburger    { display: none !important; }
          .lp-mobile-menu  { display: none !important; }
        }
      `}</style>

      <div
        className="lp-wrapper"
        style={{
          background:  T.bgPage,
          color:       T.textPrimary,
          fontFamily:  "'DM Sans', sans-serif",
          minHeight:   '100vh',
        }}
      >
        {/* ── NAV ─────────────────────────────────────────────────── */}
        <nav
          className="lp-nav"
          style={{
            position:       'sticky',
            top:            0,
            zIndex:         100,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            height:         '64px',
            background:     T.navBg,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderBottom:   `1px solid ${T.navBorder}`,
          }}
        >
          {/* Logo */}
          <div
            onClick={() => setPage && setPage('landing')}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && setPage && setPage('landing')}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <FalconLogo
              width={28}
              height={28}
              aria-hidden="true"
              style={{
                display: 'block',
                flexShrink: 0,
                color: T.textPrimary,
                background: 'none',
                border: 'none',
                boxShadow: 'none',
              }}
            />
            <span style={{ fontSize: '18px', fontWeight: '800', letterSpacing: '-0.5px', color: T.textPrimary }}>CVPassport</span>
          </div>

          {/* Center nav — desktop only */}
          <div
            className="lp-nav-center"
            style={{
              display:        'flex',
              alignItems:     'center',
              gap:            '2px',
              background:     isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
              border:         `1px solid ${T.border}`,
              borderRadius:   '100px',
              padding:        '5px 10px',
            }}
          >
            {['Templates', 'ATS Check', 'Pricing'].map(item => (
              <button
                key={item}
                type="button"
                className="lp-nav-link"
                onClick={() => handleLandingNav(item)}
                style={{
                  background:   'none',
                  border:       'none',
                  color:        T.textSecondary,
                  fontSize:     '13px',
                  fontWeight:   '500',
                  padding:      '6px 14px',
                  borderRadius: '100px',
                  cursor:       'pointer',
                  fontFamily:   'inherit',
                }}
              >
                {item}
              </button>
            ))}
          </div>

          {/* Right actions — desktop only */}
          <div className="lp-nav-desktop" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              className="lp-theme-btn"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              style={{
                background:   'none',
                border:       `1px solid ${T.border}`,
                color:        T.textPrimary,
                borderRadius: '8px',
                padding:      '7px 9px',
                cursor:       'pointer',
                display:      'flex',
                alignItems:   'center',
              }}
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
            <button
              type="button"
              className="lp-ghost-btn"
              onClick={() => onLogin && onLogin()}
              style={{
                background:   'transparent',
                border:       `1px solid ${T.btnGhostBorder}`,
                color:        T.btnGhostTxt,
                borderRadius: '8px',
                padding:      '8px 18px',
                fontSize:     '13px',
                fontWeight:   '600',
                cursor:       'pointer',
                fontFamily:   'inherit',
              }}
            >
              Sign In
            </button>
            <button
              type="button"
              className="lp-btn"
              onClick={() => onSignup && onSignup()}
              style={{
                background:   T.btnPrimary,
                border:       'none',
                color:        T.btnPrimaryTxt,
                borderRadius: '8px',
                padding:      '8px 18px',
                fontSize:     '13px',
                fontWeight:   '700',
                cursor:       'pointer',
                fontFamily:   'inherit',
              }}
            >
              Get Started
            </button>
          </div>

          {/* Hamburger — mobile only */}
          <div className="lp-hamburger" style={{ display: 'none', alignItems: 'center', gap: '8px' }}>
            <button
              className="lp-theme-btn"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              style={{ background: 'none', border: `1px solid ${T.border}`, color: T.textPrimary, borderRadius: '8px', padding: '7px', cursor: 'pointer', display: 'flex' }}
            >
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(o => !o)}
              aria-label="Open menu"
              style={{ background: 'none', border: 'none', color: T.textPrimary, cursor: 'pointer', padding: '4px', display: 'flex' }}
            >
              {mobileMenuOpen ? <XCloseIcon /> : <HamburgerIcon />}
            </button>
          </div>
        </nav>

        {/* ── MOBILE MENU ─────────────────────────────────────────── */}
        {mobileMenuOpen && (
          <div
            className="lp-mobile-menu"
            style={{
              position:   'fixed',
              top:        '64px',
              left:       0,
              right:      0,
              zIndex:     99,
              background: T.bgSurface,
              borderBottom: `1px solid ${T.border}`,
              padding:    '16px 20px',
              display:    'flex',
              flexDirection: 'column',
              gap:        '4px',
            }}
          >
            {['Templates', 'ATS Check', 'Pricing'].map(item => (
              <button
                key={item}
                type="button"
                onClick={() => { closeMobileMenu(); handleLandingNav(item); }}
                style={{ background: 'none', border: 'none', color: T.textSecondary, fontSize: '15px', padding: '12px 0', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
              >
                {item}
              </button>
            ))}
            <div style={{ height: '1px', background: T.border, margin: '8px 0' }} />
            <button
              onClick={() => { closeMobileMenu(); onLogin && onLogin(); }}
              style={{ background: 'none', border: `1px solid ${T.border}`, color: T.textPrimary, borderRadius: '10px', padding: '13px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Sign In
            </button>
            <button
              onClick={() => { closeMobileMenu(); onSignup && onSignup(); }}
              style={{ background: T.btnPrimary, border: 'none', color: T.btnPrimaryTxt, borderRadius: '10px', padding: '13px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', marginTop: '6px', fontFamily: 'inherit' }}
            >
              Get Started
            </button>
          </div>
        )}

        {/* ── HERO ────────────────────────────────────────────────── */}
        <section
          className="lp-hero"
          style={{ maxWidth: '1300px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '60px', overflow: 'visible' }}
        >
          {/* Left */}
          <div className="lp-hero-content" style={{ flex: 1, maxWidth: '560px' }}>
            {/* Badge pill */}
            <div style={{
              display:      'inline-flex',
              alignItems:   'center',
              gap:          '8px',
              background:   isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              border:       `1px solid ${T.border}`,
              borderRadius: '100px',
              padding:      '6px 16px',
              marginBottom: '28px',
            }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: T.textPrimary, flexShrink: 0 }} />
              <span style={{ fontSize: '12px', fontWeight: '600', color: T.textPrimary, letterSpacing: '0.3px' }}>
                Built for Gulf Job Seekers
              </span>
            </div>

            {/* H1 */}
            <h1 style={{
              fontSize:     'clamp(34px, 5vw, 58px)',
              fontWeight:   '800',
              lineHeight:   1.05,
              letterSpacing:'-2px',
              marginBottom: '20px',
              color:        T.textPrimary,
              fontFamily:   "'DM Sans', sans-serif",
            }}>
              Your Resume is your{' '}
              <span style={{ borderBottom: `3px solid ${T.textPrimary}`, paddingBottom: '2px' }}>passport</span>
              {' '}to the Gulf
            </h1>

            {/* Subtext */}
            <p style={{ fontSize: '17px', color: T.textSecondary, marginBottom: '36px', lineHeight: 1.7 }}>
              ATS-optimised resumes built for UAE, Saudi &amp; GCC markets.{' '}
              Free to build, free to download.
            </p>

            {/* CTAs */}
            <div className="lp-hero-ctas" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '40px' }}>
              <button
                type="button"
                className="lp-btn"
                onClick={() => onSignup && onSignup()}
                style={{
                  background:   T.btnPrimary,
                  color:        T.btnPrimaryTxt,
                  border:       'none',
                  borderRadius: '10px',
                  padding:      '14px 28px',
                  fontSize:     '15px',
                  fontWeight:   '700',
                  cursor:       'pointer',
                  fontFamily:   'inherit',
                  whiteSpace:   'nowrap',
                }}
              >
                Build my CV free →
              </button>
              <button
                type="button"
                className="lp-ghost-btn"
                onClick={() => scrollToLandingSection('lp-templates')}
                style={{
                  background:   'transparent',
                  color:        T.textPrimary,
                  border:       `1px solid ${T.btnGhostBorder}`,
                  borderRadius: '10px',
                  padding:      '14px 28px',
                  fontSize:     '15px',
                  fontWeight:   '600',
                  cursor:       'pointer',
                  fontFamily:   'inherit',
                  whiteSpace:   'nowrap',
                }}
              >
                Browse templates
              </button>
            </div>

            {/* Trust bar */}
            <div className="lp-trust-bar" style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '13px', color: T.textSecondary }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#F59E0B' }}>
                <StarSmallIcon />
                <span style={{ color: T.textSecondary }}>4.8 / 5</span>
              </span>
              <span className="lp-trust-sep" style={{ color: T.border }}>|</span>
              <span>Used by <strong style={{ color: T.textPrimary }}>2,400+</strong> Gulf job seekers</span>
              <span className="lp-trust-sep" style={{ color: T.border }}>|</span>
              <span>ATS-tested for <strong style={{ color: T.textPrimary }}>UAE banks</strong></span>
            </div>
          </div>

          {/* Right — CV card left of globe, side-by-side with gap (no overlap) */}
          <div
            className="lp-hero-right"
            style={{
              flex:           '0 0 auto',
              display:        'flex',
              justifyContent: 'flex-end',
              alignItems:     'center',
              position:       'relative',
              overflow:       'hidden',
              paddingRight:   '24px',
              boxSizing:      'border-box',
            }}
          >
            <div style={{ position: 'relative', display: 'inline-block', overflow: 'hidden', flexShrink: 0, width: '700px', height: '700px' }}>
              {/* Glow halo */}
              <div style={{
                position:     'absolute',
                width:        '700px',
                height:       '700px',
                borderRadius: '50%',
                background:   'radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)',
                pointerEvents:'none',
              }} />
              <img src="/images/globe_and_card.svg" alt="globe" style={{ width: '680px', height: '680px', animation: 'lp-globe-rotate 60s linear infinite' }} />
              <div
                className="hidden md:block"
                style={{
                  position: 'absolute',
                  top: '68%',
                  right: '-12%',
                  transform: 'translateY(-50%) scale(0.67)',
                  transformOrigin: 'left center',
                  pointerEvents: 'none',
                  zIndex: 2,
                }}
              >
                <CVPlayCard />
              </div>
            </div>
          </div>
        </section>

        {/* ── PROBLEM SECTION ─────────────────────────────────────── */}
        <section className="lp-sec" style={{ maxWidth: '1100px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: '11px', letterSpacing: '3px', color: T.textSecondary, fontWeight: '700', textTransform: 'uppercase', marginBottom: '12px' }}>
            The problem
          </p>
          <h2 style={{
            fontSize:     'clamp(26px, 4vw, 44px)',
            fontWeight:   '800',
            letterSpacing:'-1px',
            marginBottom: '16px',
            color:        T.textPrimary,
            fontFamily:   "'DM Sans', sans-serif",
          }}>
            Why most CVs get rejected
          </h2>
          <p style={{ fontSize: '17px', color: T.textSecondary, marginBottom: '52px', maxWidth: '560px', margin: '0 auto 52px' }}>
            80% of resumes never make it past ATS screening. Here&apos;s why.
          </p>
          <div
            className="lp-problem-grid"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '20px', maxWidth: '860px', margin: '0 auto' }}
          >
            {PROBLEM_CARDS.map((card, i) => (
              <div
                key={i}
                className="lp-card"
                style={{
                  background:   T.bgSurface,
                  border:       `1px solid ${T.border}`,
                  borderRadius: '16px',
                  padding:      '32px',
                  textAlign:    'left',
                }}
              >
                <div style={{ color: T.textPrimary, marginBottom: '16px' }}>{card.icon}</div>
                <h3 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '10px', color: T.textPrimary, fontFamily: "'DM Sans', sans-serif" }}>{card.title}</h3>
                <p  style={{ color: T.textSecondary, fontSize: '14px', lineHeight: 1.65 }}>{card.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS (templates step — anchor for Browse templates / nav) ── */}
        <section id="lp-templates" className="lp-sec" style={{ maxWidth: '1100px', margin: '0 auto', textAlign: 'center' }}>
          <p style={{ fontSize: '11px', letterSpacing: '3px', color: T.textSecondary, fontWeight: '700', textTransform: 'uppercase', marginBottom: '12px' }}>
            How it works
          </p>
          <h2 style={{
            fontSize:     'clamp(26px, 4vw, 44px)',
            fontWeight:   '800',
            letterSpacing:'-1px',
            marginBottom: '52px',
            color:        T.textPrimary,
            fontFamily:   "'DM Sans', sans-serif",
          }}>
            Three steps to your Gulf CV
          </h2>
          <div
            className="lp-steps-grid"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px' }}
          >
            {STEPS.map((step, i) => (
              <div
                key={i}
                className="lp-step-card"
                style={{
                  background:   T.bgSurface,
                  border:       `1px solid ${T.border}`,
                  borderRadius: '16px',
                  padding:      '32px 28px',
                  textAlign:    'left',
                }}
              >
                <div style={{
                  width:          '44px',
                  height:         '44px',
                  background:     T.bgElevated,
                  borderRadius:   '10px',
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
                  marginBottom:   '20px',
                  color:          T.textPrimary,
                  flexShrink:     0,
                }}>
                  {step.icon}
                </div>
                <div style={{ fontSize: '12px', fontWeight: '700', color: T.textSecondary, marginBottom: '8px', letterSpacing: '0.5px' }}>
                  Step {i + 1}
                </div>
                <h3 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '10px', color: T.textPrimary, fontFamily: "'DM Sans', sans-serif" }}>{step.title}</h3>
                <p  style={{ color: T.textSecondary, fontSize: '14px', lineHeight: 1.65 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── WALK-IN BAND ────────────────────────────────────────── */}
        <section
          id="lp-walkin"
          className="lp-walkin-sec"
          style={{
            background:   T.walkInBg,
            borderTop:    `1px solid ${T.border}`,
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <div
            className="lp-walkin-inner"
            style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', gap: '60px', alignItems: 'center' }}
          >
            {/* Left — text + CTA */}
            <div style={{ flex: 1 }}>
              {/* Urgency badge */}
              <div style={{
                display:      'inline-flex',
                alignItems:   'center',
                gap:          '8px',
                background:   'rgba(255,165,0,0.1)',
                border:       '1px solid rgba(255,165,0,0.3)',
                borderRadius: '100px',
                padding:      '6px 16px',
                marginBottom: '24px',
              }}>
                <span style={{ color: '#FFA500' }}><ClockIcon /></span>
                <span style={{ fontSize: '12px', fontWeight: '700', color: '#FFA500', letterSpacing: '0.3px' }}>Walk-In Mode</span>
              </div>

              <h2 style={{
                fontSize:     'clamp(26px, 4vw, 40px)',
                fontWeight:   '800',
                letterSpacing:'-1px',
                marginBottom: '16px',
                color:        T.textPrimary,
                fontFamily:   "'DM Sans', sans-serif",
              }}>
                Got a walk-in tomorrow?
              </h2>
              <p style={{ fontSize: '16px', color: T.textSecondary, marginBottom: '28px', lineHeight: 1.7, maxWidth: '460px' }}>
                Build a complete Gulf-ready CV in 60 seconds. No account needed.
                Share it instantly on WhatsApp.
              </p>

              {/* Checkmarks */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '32px' }}>
                {[
                  'ATS-optimised in one click',
                  'Includes all Gulf CV fields',
                  'Share via WhatsApp instantly',
                ].map((feat, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: T.textPrimary }}>
                    <span style={{ color: T.accentCheck, flexShrink: 0 }}><CheckIcon /></span>
                    {feat}
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="lp-btn"
                onClick={() => onWalkIn && onWalkIn()}
                style={{
                  background:   T.btnPrimary,
                  color:        T.btnPrimaryTxt,
                  border:       'none',
                  borderRadius: '10px',
                  padding:      '14px 28px',
                  fontSize:     '15px',
                  fontWeight:   '700',
                  cursor:       'pointer',
                  display:      'inline-block',
                  marginBottom: '12px',
                  fontFamily:   'inherit',
                }}
              >
                Build walk-in CV →
              </button>
              <p style={{ fontSize: '12px', color: T.textSecondary }}>No signup needed</p>
            </div>

            {/* Right — form mockup card (hidden on mobile) */}
            <div className="lp-walkin-right" style={{ flex: '0 0 340px' }}>
              <div style={{
                background:   T.bgSurface,
                border:       `1px solid ${T.border}`,
                borderRadius: '16px',
                padding:      '28px',
              }}>
                <p style={{ fontSize: '11px', color: T.textSecondary, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '20px' }}>
                  Walk-In CV Builder
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                  {['Full name', 'Job title', 'Top 3 skills', 'Years experience', 'Location', 'Phone (WhatsApp)'].map((field, i) => (
                    <div
                      key={i}
                      style={{
                        background:   T.bgElevated,
                        border:       `1px solid ${T.border}`,
                        borderRadius: '8px',
                        padding:      '10px 14px',
                        fontSize:     '13px',
                        color:        T.textSecondary,
                      }}
                    >
                      {field}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    style={{
                      flex:         1,
                      background:   T.btnPrimary,
                      color:        T.btnPrimaryTxt,
                      border:       'none',
                      borderRadius: '8px',
                      padding:      '11px 8px',
                      fontSize:     '13px',
                      fontWeight:   '700',
                      cursor:       'pointer',
                      fontFamily:   'inherit',
                    }}
                  >
                    Download PDF
                  </button>
                  <button
                    style={{
                      flex:         1,
                      background:   '#25D366',
                      color:        '#fff',
                      border:       'none',
                      borderRadius: '8px',
                      padding:      '11px 8px',
                      fontSize:     '13px',
                      fontWeight:   '700',
                      cursor:       'pointer',
                      display:      'flex',
                      alignItems:   'center',
                      justifyContent:'center',
                      gap:          '6px',
                      fontFamily:   'inherit',
                    }}
                  >
                    <WhatsAppIcon size={15} /> Share
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── FINAL CTA (pricing / signup anchor) ─────────────────── */}
        <section id="lp-pricing" className="lp-sec" style={{ textAlign: 'center', maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{
            fontSize:     'clamp(26px, 4vw, 44px)',
            fontWeight:   '800',
            letterSpacing:'-1px',
            marginBottom: '16px',
            color:        T.textPrimary,
            fontFamily:   "'DM Sans', sans-serif",
          }}>
            Start building your Gulf CV today
          </h2>
          <p style={{ fontSize: '17px', color: T.textSecondary, marginBottom: '36px', lineHeight: 1.7 }}>
            Join 2,400+ Gulf job seekers who built their CV with CVPassport.
          </p>
          <button
            type="button"
            className="lp-btn"
            onClick={() => onSignup && onSignup()}
            style={{
              background:   T.btnPrimary,
              color:        T.btnPrimaryTxt,
              border:       'none',
              borderRadius: '12px',
              padding:      '16px 44px',
              fontSize:     '16px',
              fontWeight:   '700',
              cursor:       'pointer',
              display:      'inline-block',
              marginBottom: '16px',
              fontFamily:   'inherit',
            }}
          >
            Build my CV free →
          </button>
          <p style={{ fontSize: '13px', color: T.textSecondary }}>
            Free forever. No credit card. No hidden fees.
          </p>
        </section>
      </div>
    </>
  );
}
