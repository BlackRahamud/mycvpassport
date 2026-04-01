import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import CVPassportLogo from './components/CVPassportLogo';
import CVPlayCard from './components/CVPlayCard';
import { useGeoContent } from './hooks/useGeoContent';
import { ResumePreview, A4_PREVIEW_WIDTH_PX } from './ResumePreview';
import { TEMPLATES, EMPTY_RESUME, EMPTY_EXP } from './cvShared';
import HowItWorks from './HowItWorks';
import CookieBanner from './components/CookieBanner';

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

function FaqChevronIcon({ open }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{
        flexShrink: 0,
        color: 'var(--text-secondary)',
        transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
        transition: 'transform 200ms cubic-bezier(0.4,0,0.2,1)',
      }}
    >
      <polyline points="6 9 12 15 18 9" />
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

// ── Static data ─────────────────────────────────────────────────────
const PROBLEM_CARDS = [
  { icon: <XCircleIcon />,       title: 'Missing keywords',  desc: 'Your CV doesn\'t match the job description. ATS rejects it before a human ever sees it.' },
  { icon: <GridIcon />,          title: 'Poor formatting',   desc: 'Tables, columns, and graphics confuse ATS systems and lose your data entirely.' },
  { icon: <StarAchieveIcon />,   title: 'Weak achievements', desc: 'Generic job duties instead of quantified results. You look identical to every other applicant.' },
];

function scrollToLandingSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/** Hero headline cycle — natural job search journey (order fixed). */
const HERO_CYCLE_WORDS = ['shortlisted', 'called', 'hired'];

const LANDING_THUMB_CV = {
  ...EMPTY_RESUME,
  name: 'Ahmed Al Mansouri',
  title: 'Senior Operations Manager',
  summary: 'Operations leader with a track record of scaling teams and improving service delivery across GCC markets.',
  experience: [
    {
      ...EMPTY_EXP,
      company: 'Emirates NBD',
      role: 'Assistant Manager',
      location: 'Dubai',
      period: '2020 — Present',
      points: 'Led a team of 12; improved SLA metrics by 18%.',
    },
  ],
  education: [
    {
      school: 'American University of Sharjah',
      degree: 'BBA',
      year: '2015',
      fieldOfStudy: '',
      startDate: '',
      endDate: '',
      location: '',
    },
  ],
  skills: 'Stakeholder Management, SAP, Lean Six Sigma',
};

const LP_TEMPLATE_STRIP = [
  { name: 'Classic', tier: 'FREE', template: TEMPLATES[0] },
  { name: 'Gulf Pro', tier: 'POPULAR', template: TEMPLATES[4] },
  { name: 'Tech Pro', tier: 'PREMIUM', template: TEMPLATES[10] },
  { name: 'Executive', tier: 'PREMIUM', template: TEMPLATES[3] },
];

const FAQ_ITEMS = [
  {
    q: 'Is CVPassport really free?',
    a: 'Yes — Templates 1, 2, and 3 are completely free. No credit card, no trial period. You can build and download a clean, professional CV right now at no cost. Premium templates and tools like ATS scoring and the Cover Letter Generator are available as affordable one-time or monthly options.',
  },
  {
    q: "I'm not based in the UAE. Can I still use it?",
    a: 'Absolutely. CVPassport works for job seekers across the GCC and India. The platform automatically detects your region and adjusts the currency, tone guidance, and formatting to match local hiring norms.',
  },
  {
    q: 'What format does my CV download in?',
    a: 'Your CV downloads as a PDF — the format accepted by every ATS, recruiter portal, and email attachment. The file is cleanly formatted and ready to send without any editing.',
  },
  {
    q: 'Will my CV pass ATS screening?',
    a: "CVPassport's ATS Score tool checks your CV against common screening criteria — keyword density, section labelling, formatting flags — and gives you a score with specific suggestions. No tool can guarantee ATS success, but ours gives you a clear picture of where you stand before you apply.",
  },
  {
    q: 'What is the Cover Letter Generator?',
    a: "It's a structured tool that builds a tailored cover letter based on your role, company, and location. UAE output follows Gulf professional tone. India output follows a formal subcontinent style. Available as a small one-time unlock.",
  },
  {
    q: 'What is Walk-In Mode?',
    a: 'A rapid 6-field CV builder designed for walk-in interviews — common in UAE hospitality, retail, and logistics. You fill in the basics, download instantly, and walk in ready.',
  },
  {
    q: 'Is my data safe?',
    a: 'Your data is stored securely via Supabase infrastructure hosted in Singapore (AWS ap-southeast-1). We do not sell your data. We do not share it with recruiters or third parties. You can request deletion at any time by emailing support@mycvpassport.com.',
  },
  {
    q: 'What happens if I pay and something goes wrong?',
    a: "Email support@mycvpassport.com with your LemonSqueezy order ID and we'll sort it. All payments are processed securely through LemonSqueezy — we never see your card details.",
  },
  {
    q: 'Can I use CVPassport on my phone?',
    a: 'Yes. CVPassport is built mobile-first. The full builder, templates, and download flow work on any smartphone browser — no app install needed.',
  },
];

function LandingTemplateThumb({ template }) {
  const wrapRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width;
      if (w == null || w < 1) return;
      setContainerWidth((prev) => (Math.abs(prev - w) < 0.5 ? prev : w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scale = useMemo(() => {
    const w = containerWidth > 0 ? containerWidth : 120;
    return w / A4_PREVIEW_WIDTH_PX;
  }, [containerWidth]);

  return (
    <div ref={wrapRef} className="lp-cv-thumb-scale-outer">
      <div
        className="lp-cv-thumb-scale-inner"
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          willChange: 'transform',
          transition: 'none',
        }}
      >
        <ResumePreview cv={LANDING_THUMB_CV} template={template} />
      </div>
    </div>
  );
}

const LandingTemplateMarquee = React.memo(function LandingTemplateMarquee() {
  const scrollRef = useRef(null);
  const rafRef = useRef(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeftStart = useRef(0);
  const isPaused = useRef(false);

  const tripleStrip = [...LP_TEMPLATE_STRIP, ...LP_TEMPLATE_STRIP, ...LP_TEMPLATE_STRIP];

  const normalize = () => {
    const c = scrollRef.current;
    if (!c) return;
    const third = c.scrollWidth / 3;
    if (c.scrollLeft <= 0 || c.scrollLeft >= third * 2) c.scrollLeft = third;
  };

  useEffect(() => {
    const c = scrollRef.current;
    if (!c) return;
    const init = () => {
      c.scrollLeft = c.scrollWidth / 3;
    };
    init();

    const tick = () => {
      if (!isPaused.current && !isDragging.current) {
        c.scrollLeft += 0.5;
        normalize();
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  const onPointerDown = (e) => {
    isDragging.current = true;
    startX.current = e.pageX;
    scrollLeftStart.current = scrollRef.current.scrollLeft;
    scrollRef.current.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e) => {
    if (!isDragging.current) return;
    e.preventDefault();
    const c = scrollRef.current;
    if (!c) return;
    const walk = (e.pageX - startX.current) * 1.5;
    c.scrollLeft = scrollLeftStart.current - walk;
  };

  const onPointerUp = () => {
    isDragging.current = false;
    normalize();
  };

  return (
    <div
      className="lp-templates-carousel"
      onMouseEnter={() => {
        isPaused.current = true;
      }}
      onMouseLeave={() => {
        isPaused.current = false;
        isDragging.current = false;
      }}
    >
      <div
        ref={scrollRef}
        className="lp-templates-viewport"
        style={{ overflowX: 'hidden', touchAction: 'none', cursor: 'grab' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
      >
        <div className="lp-templates-track" style={{ display: 'flex' }}>
          {tripleStrip.map((t, i) => (
            <div key={`${t.name}-${i}`} style={{ flexShrink: 0 }}>
              <LandingTemplateThumb template={t.template} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

// ── Main component ──────────────────────────────────────────────────
export default function LandingPage({ user, onSignOut, onLogin, onSignup, onWalkIn }) {
  const geo = useGeoContent();
  const navigate = useNavigate();
  const [heroWordIndex, setHeroWordIndex] = useState(0);
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('cvp-theme') || 'dark'; } catch { return 'dark'; }
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [faqOpenIndex, setFaqOpenIndex] = useState(null);

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

  useEffect(() => {
    const id = window.setInterval(() => {
      setHeroWordIndex((i) => (i + 1) % HERO_CYCLE_WORDS.length);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  const closeMobileMenu = () => setMobileMenuOpen(false);

  /** Nav items: Templates = in-page anchor; ATS/Pricing via React Router. */
  const handleLandingNav = (item) => {
    if (item === 'Templates') scrollToLandingSection('templates');
    else if (item === 'ATS Check') navigate('/ats');
    else if (item === 'Pricing') navigate('/pricing');
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
        @keyframes cvp-walkin-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        .cvp-walkin-chip {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border-radius: 20px;
          border: 1px solid #EF9F27;
          background: rgba(239, 159, 39, 0.08);
          color: #EF9F27;
          font-size: 13px;
          cursor: pointer;
          animation: cvp-walkin-pulse 2s ease-in-out infinite;
          font-family: inherit;
        }

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
        .lp-theme-btn:hover{ opacity: 0.8; }

        /* Transitions */
        .lp-btn       { transition: opacity 0.2s cubic-bezier(0.4,0,0.2,1), transform 0.2s cubic-bezier(0.4,0,0.2,1); }
        .lp-ghost-btn { transition: opacity 0.2s cubic-bezier(0.4,0,0.2,1), transform 0.2s cubic-bezier(0.4,0,0.2,1); }
        .lp-nav-link  { transition: color 0.2s cubic-bezier(0.4,0,0.2,1); }
        .lp-card      { transition: border-color 0.2s cubic-bezier(0.4,0,0.2,1), transform 0.2s cubic-bezier(0.4,0,0.2,1); }
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

        .lp-sec.lp-proof { text-align: center; padding: 48px 24px; }
        .lp-proof-statement {
          font-size: clamp(24px, 5vw, 42px);
          font-weight: 800;
          letter-spacing: -1px;
          color: var(--text-primary);
          margin: 0;
        }

        .lp-sec.lp-templates { padding: 48px 0 48px 24px; }
        .lp-section-title { font-size: clamp(22px, 4vw, 36px); font-weight: 800; margin-bottom: 8px; }
        .lp-section-sub { font-size: 14px; color: var(--text-secondary); margin-bottom: 24px; }
        .lp-templates-carousel {
          width: 100%;
        }
        .lp-templates-viewport {
          overflow: hidden;
          width: 100%;
          cursor: grab;
          -webkit-user-select: none;
          user-select: none;
        }
        .lp-templates-viewport:active {
          cursor: grabbing;
        }
        .lp-templates-track {
          display: flex;
          gap: 16px;
          width: max-content;
          padding-bottom: 16px;
        }
        .lp-template-card {
          flex: 0 0 120px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }
        .lp-hero-cycle-word {
          display: inline-block;
          margin: 0 0.12em;
          min-width: 2.4em;
          text-align: center;
          transition: opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .lp-feature-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        @media (min-width: 769px) {
          .lp-feature-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
        .lp-feature-section-bleed {
          padding: 80px 60px;
        }
        @media (max-width: 768px) {
          .lp-feature-section-bleed {
            padding: 60px 20px;
          }
        }
        .lp-template-card-link {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          text-decoration: none;
          color: inherit;
        }
        .lp-feature-cta {
          transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .lp-feature-cta:hover {
          opacity: 0.85;
        }
        .lp-template-name { font-size: 12px; color: var(--text-primary); font-weight: 500; }
        .lp-template-tier { font-size: 11px; font-weight: 600; }
        .lp-tier-free { color: #3B8BD4; }
        .lp-tier-popular { color: #EF9F27; }
        .lp-tier-premium { color: var(--text-secondary); }
        .lp-template-more {
          justify-content: center;
          opacity: 0.5;
          font-size: 14px;
          color: var(--text-secondary);
        }

        .lp-problem-card-header {
          display: flex;
          flex-direction: row;
          align-items: center;
          gap: 12px;
        }
        .lp-problem-card-icon {
          width: 20px;
          height: 20px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: inherit;
        }
        .lp-problem-card-icon svg { width: 20px; height: 20px; }
        .lp-problem-card-title {
          font-weight: 600;
          font-size: 14px;
          margin: 0;
          color: var(--text-primary);
          font-family: inherit;
        }
        .lp-problem-card-desc {
          font-size: 13px;
          color: var(--text-secondary);
          margin-top: 4px;
          margin-bottom: 0;
          line-height: 1.65;
        }

        .lp-feature-pills { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 24px; justify-content: center; }
        .lp-feature-pill {
          padding: 6px 14px;
          border-radius: 20px;
          border: 1px solid var(--border-default);
          font-size: 12px;
          color: var(--text-secondary);
        }

        .lp-sec.lp-industry { text-align: center; padding: 48px 24px; }
        .lp-badges { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin: 16px 0; }
        .lp-badge {
          padding: 8px 18px;
          border-radius: 20px;
          border: 1px solid var(--border-default);
          font-size: 13px;
          color: var(--text-primary);
          background: var(--bg-surface);
        }
        .lp-micro-disclaimer {
          font-size: 11px;
          color: var(--text-secondary);
          opacity: 0.5;
          margin-top: 12px;
          max-width: 480px;
          margin-left: auto;
          margin-right: auto;
        }

        .lp-faq-section {
          max-width: 720px;
          margin: 0 auto;
          padding: 80px 24px;
        }
        .lp-faq-heading {
          font-size: 28px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 40px;
        }
        .lp-faq-item {
          border-bottom: 1px solid var(--border-default);
        }
        .lp-faq-q {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: pointer;
          padding: 20px 0;
          margin: 0;
          background: none;
          border: none;
          font-family: inherit;
          text-align: left;
        }
        .lp-faq-q-text {
          font-size: 15px;
          color: var(--text-primary);
          font-weight: 500;
          padding-right: 16px;
        }
        .lp-faq-a {
          font-size: 14px;
          color: var(--text-secondary);
          line-height: 1.6;
          padding-bottom: 20px;
          margin: 0;
        }

        .lp-site-footer {
          background: #0A0A0A;
          border-top: 1px solid #2A2A2A;
          padding: 48px 24px 32px;
          --text-secondary: #A0A0A0;
          --border-default: #2A2A2A;
        }
        .lp-site-footer-inner {
          max-width: 1100px;
          margin: 0 auto;
        }
        .lp-site-footer-row1 {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 40px;
          flex-wrap: wrap;
        }
        .lp-site-footer-brand-title {
          font-size: 16px;
          font-weight: 600;
          color: #FFF;
          margin: 0;
        }
        .lp-site-footer-brand-tag {
          font-size: 13px;
          color: var(--text-secondary);
          margin: 8px 0 0;
        }
        .lp-site-footer-cols {
          display: flex;
          flex-direction: row;
          gap: 40px;
          flex-wrap: wrap;
        }
        .lp-site-footer-col-h {
          font-size: 11px;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: var(--text-secondary);
          opacity: 0.5;
          margin: 0 0 12px;
          font-weight: 500;
        }
        .lp-site-footer-link {
          font-size: 13px;
          color: var(--text-secondary);
          text-decoration: none;
          display: block;
          line-height: 2;
          transition: color 150ms ease;
        }
        .lp-site-footer-link:hover {
          color: #FFF;
        }
        .lp-site-footer-row2 {
          margin-top: 40px;
          padding-top: 24px;
          border-top: 1px solid #2A2A2A;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }
        .lp-site-footer-row2 p {
          font-size: 12px;
          color: var(--text-secondary);
          margin: 0;
        }
        @media (max-width: 768px) {
          .lp-site-footer-row1 {
            flex-direction: column;
          }
          .lp-site-footer-cols {
            flex-direction: column;
            gap: 24px;
          }
          .lp-site-footer-row2 {
            flex-direction: column;
            text-align: center;
          }
        }

        .lp-footer-disclaimer {
          text-align: center;
          padding: 24px;
          border-top: 1px solid var(--border-default);
        }
        .lp-footer-disclaimer p {
          font-size: 11px;
          color: var(--text-secondary);
          opacity: 0.4;
          max-width: 560px;
          margin: 0 auto;
          line-height: 1.6;
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
          {/* Logo — Link avoids fighting App session redirect + gives native client nav */}
          <Link
            to="/"
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'inherit' }}
            aria-label="CVPassport home"
          >
            <CVPassportLogo height={40} />
          </Link>

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
            {user ? (
              <button
                type="button"
                className="lp-ghost-btn"
                onClick={() => onSignOut && onSignOut()}
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
                Sign Out
              </button>
            ) : (
              <>
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
              </>
            )}
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
            {user ? (
              <button
                onClick={() => { closeMobileMenu(); onSignOut && onSignOut(); }}
                style={{ background: 'none', border: `1px solid ${T.border}`, color: T.textPrimary, borderRadius: '10px', padding: '13px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Sign Out
              </button>
            ) : (
              <>
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
              </>
            )}
          </div>
        )}

        {/* ── HERO ────────────────────────────────────────────────── */}
        <section
          className="lp-hero"
          style={{ maxWidth: '1300px', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '60px', overflow: 'visible' }}
        >
          {/* Left */}
          <div className="lp-hero-content" style={{ flex: 1, maxWidth: '560px' }}>
            {geo.showWalkIn && (
              <button
                type="button"
                className="cvp-walkin-chip"
                onClick={() => scrollToLandingSection('walkin')}
                style={{ marginBottom: '16px' }}
              >
                ⚡ Walk-in tomorrow? Start building now
              </button>
            )}

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
                {geo.pill}
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
              {geo.heroHeadlineBefore}
              <span
                className="lp-hero-cycle-word"
                aria-live="polite"
                aria-atomic="true"
              >
                {HERO_CYCLE_WORDS[heroWordIndex]}
              </span>
              {geo.heroHeadlineAfter}
            </h1>

            {/* Subtext */}
            <p style={{ fontSize: '17px', color: T.textSecondary, marginBottom: '36px', lineHeight: 1.7 }}>
              {geo.subheadline}
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
                {geo.cta}
              </button>
              <button
                type="button"
                className="lp-ghost-btn"
                onClick={() => scrollToLandingSection('templates')}
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
                {geo.ctaSecondary}
              </button>
            </div>

            <p
              style={{
                fontSize: '13px',
                color: 'var(--text-secondary)',
                textAlign: 'center',
                marginTop: '8px',
              }}
            >
              {geo.anxietyKiller}
            </p>
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

        <section className="lp-sec lp-proof">
          <h2 className="lp-proof-statement">
            {geo.proof}
          </h2>
        </section>

        <section
          id="lp-features"
          className="lp-feature-section-bleed"
          style={{
            background: '#0A0A0A',
            color: '#FFFFFF',
            maxWidth: 'none',
            margin: 0,
          }}
        >
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <p style={{ fontSize: '11px', letterSpacing: '3px', color: '#A0A0A0', fontWeight: '700', textTransform: 'uppercase', marginBottom: '12px', textAlign: 'center' }}>
              Everything in one place
            </p>
            <h2 style={{
              fontSize: 'clamp(22px, 4vw, 32px)',
              fontWeight: '800',
              letterSpacing: '-0.5px',
              marginBottom: '28px',
              color: '#FFFFFF',
              fontFamily: "'DM Sans', sans-serif",
              textAlign: 'center',
            }}>
              Built for Gulf job seekers
            </h2>
            <div className="lp-feature-grid">
              {/* Card 1 — ATS */}
              <div
                id="ats"
                className="lp-card"
                style={{
                  background: isDark ? '#141414' : '#F5F5F0',
                  border: isDark ? '1px solid #2A2A2A' : '1px solid #E0E0E0',
                  borderRadius: '16px',
                  padding: '20px',
                  textAlign: 'left',
                }}
              >
                <p style={{ fontSize: '10px', letterSpacing: '0.5px', color: '#A0A0A0', textTransform: 'uppercase', margin: '0 0 16px', fontWeight: '600' }}>
                  ATS CHECKER
                </p>
                <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                  <div style={{ position: 'relative', width: 56, height: 56, flexShrink: 0 }}>
                    <svg width="56" height="56" viewBox="0 0 56 56" aria-hidden="true">
                      <circle cx="28" cy="28" r="22" fill="none" stroke="#2A2A2A" strokeWidth="6" />
                      <circle
                        cx="28"
                        cy="28"
                        r="22"
                        fill="none"
                        stroke="#14B8A6"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray="138.23 138.23"
                        strokeDashoffset={138.23 * (1 - 0.84)}
                        transform="rotate(-90 28 28)"
                      />
                    </svg>
                    <span style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      top: 0,
                      bottom: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px',
                      fontWeight: 500,
                      color: '#14B8A6',
                    }}
                    >
                      84
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '10px', paddingTop: '4px' }}>
                    {[
                      { label: 'Keywords', pct: 80, fill: '#22C55E' },
                      { label: 'Format', pct: 65, fill: '#F59E0B' },
                      { label: 'Sections', pct: 90, fill: '#EAB308' },
                    ].map((row) => (
                      <div key={row.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11, color: '#A0A0A0' }}>
                          <span>{row.label}</span>
                          <span>{row.pct}%</span>
                        </div>
                        <div style={{ height: 4, borderRadius: 99, background: '#2A2A2A', overflow: 'hidden' }}>
                          <div style={{ width: `${row.pct}%`, height: '100%', borderRadius: 99, background: row.fill }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  className="lp-feature-cta"
                  onClick={() => navigate('/ats')}
                  style={{
                    marginTop: '18px',
                    padding: 0,
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#14B8A6',
                  }}
                >
                  Start for free →
                </button>
              </div>

              {/* Card 2 — Cover letter (always dark) */}
              <div
                id="cover-letter"
                className="lp-card"
                style={{
                  background: '#0F1F1A',
                  border: '1px solid #2A2A2A',
                  borderRadius: '16px',
                  padding: '20px',
                  textAlign: 'left',
                }}
              >
                <p style={{ fontSize: '10px', color: '#A0A0A0', textTransform: 'uppercase', margin: '0 0 14px', fontWeight: '600' }}>
                  COVER LETTER
                </p>
                <p style={{ fontSize: '13px', fontWeight: 500, color: '#FFFFFF', margin: '0 0 8px', lineHeight: 1.45 }}>
                  Dear Hiring Manager,
                </p>
                <p style={{ fontSize: '12px', color: '#A0A0A0', margin: '0 0 6px', lineHeight: 1.5 }}>
                  I am writing to express my strong interest in
                </p>
                <p style={{ fontSize: '12px', color: '#A0A0A0', margin: '0 0 14px', lineHeight: 1.5 }}>
                  the Customer Service role at Emirates NBD...
                </p>
                <span style={{
                  display: 'inline-block',
                  fontSize: '10px',
                  background: '#1A3A30',
                  color: '#4ADE80',
                  borderRadius: 99,
                  padding: '4px 10px',
                  marginBottom: '12px',
                }}
                >
                  Gulf tone · Arabic-aware
                </span>
                <p style={{ fontSize: '12px', color: '#A0A0A0', margin: 0 }}>
                  AED 10 / ₹49
                </p>
              </div>

              {/* Card 3 — Walk-in (always dark) */}
              <div
                className="lp-card"
                style={{
                  background: '#0A1A0A',
                  border: '1px solid #2A2A2A',
                  borderRadius: '16px',
                  padding: '20px',
                  textAlign: 'left',
                }}
              >
                <p style={{ fontSize: '10px', color: '#A0A0A0', textTransform: 'uppercase', margin: '0 0 14px', fontWeight: '600' }}>
                  WALK-IN MODE
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: '14px' }}>
                  {['Ahmed Al Mansouri', 'Driver', '+971 50 123 4567', '10 yrs experience'].map((text) => (
                    <div
                      key={text}
                      style={{
                        background: '#0F2A0F',
                        border: '1px solid #1A4A1A',
                        borderRadius: 6,
                        padding: '6px 10px',
                        fontSize: 11,
                        color: '#4ADE80',
                      }}
                    >
                      {text}
                    </div>
                  ))}
                </div>
                <p style={{ fontSize: '11px', color: '#4ADE80', margin: 0 }}>
                  60 seconds · WhatsApp ready
                </p>
              </div>

              {/* Card 4 — Job match */}
              <div
                className="lp-card"
                style={{
                  background: isDark ? '#141414' : '#F5F5F0',
                  border: isDark ? '1px solid #2A2A2A' : '1px solid #E0E0E0',
                  borderRadius: '16px',
                  padding: '20px',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: '14px', flexWrap: 'wrap' }}>
                  <p style={{ fontSize: '10px', letterSpacing: '0.5px', color: '#A0A0A0', textTransform: 'uppercase', margin: 0, fontWeight: '600' }}>
                    JOB MATCH
                  </p>
                  <span style={{
                    fontSize: '10px',
                    background: '#2A2A2A',
                    color: '#A0A0A0',
                    borderRadius: 99,
                    padding: '3px 8px',
                  }}
                  >
                    Coming Soon
                  </span>
                </div>
                {[
                  { label: 'LinkedIn UAE', pct: 70, fill: '#14B8A6' },
                  { label: 'Bayt.com', pct: 55, fill: '#F59E0B' },
                ].map((row) => (
                  <div key={row.label} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 11, color: '#A0A0A0' }}>
                      <span>{row.label}</span>
                      <span>{row.pct}%</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 99, background: '#2A2A2A', overflow: 'hidden' }}>
                      <div style={{ width: `${row.pct}%`, height: '100%', borderRadius: 99, background: row.fill }} />
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  className="lp-feature-cta"
                  onClick={() => onSignup && onSignup()}
                  style={{
                    marginTop: '6px',
                    padding: 0,
                    border: 'none',
                    background: 'none',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontSize: '12px',
                    fontWeight: 600,
                    color: '#14B8A6',
                  }}
                >
                  Start for free →
                </button>
              </div>
            </div>
          </div>
        </section>

        <section id="templates" className="lp-sec lp-templates">
          <h2 className="lp-section-title">
            See what your CV will look like
          </h2>
          <p className="lp-section-sub">
            14 ATS-friendly designs. Tap to preview.
          </p>
          <LandingTemplateMarquee />
          <div style={{ paddingLeft: 24, paddingRight: 24, marginTop: 16 }}>
            <Link
              to="/templates"
              onClick={() => window.scrollTo(0, 0)}
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: T.textPrimary,
                textDecoration: 'none',
                borderBottom: `1px solid ${T.border}`,
                transition: 'opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              Browse all templates →
            </Link>
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
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', maxWidth: '1000px', margin: '0 auto' }}
          >
            {PROBLEM_CARDS.map((card, i) => (
              <div
                key={i}
                className="lp-card"
                style={{
                  background:   T.bgSurface,
                  border:       `1px solid ${T.border}`,
                  borderRadius: '16px',
                  padding:      '16px',
                  textAlign:    'left',
                }}
              >
                <div className="lp-problem-card-header" style={{ color: T.textPrimary }}>
                  <div className="lp-problem-card-icon">{card.icon}</div>
                  <h3 className="lp-problem-card-title">{card.title}</h3>
                </div>
                <p className="lp-problem-card-desc">{card.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS (S5) ───────────────────────────────────── */}
        <HowItWorks />

        {/* ── WALK-IN BAND ────────────────────────────────────────── */}
        <section
          id="walkin"
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

        <section className="lp-sec lp-industry">
          <h2 className="lp-section-title">{geo.industryHeadline}</h2>
          <p className="lp-section-sub">{geo.industrySub}</p>
          <div className="lp-badges">
            {geo.badges.map((b) => (
              <span key={b} className="lp-badge">{b}</span>
            ))}
          </div>
          <p className="lp-micro-disclaimer">{geo.microDisclaimer}</p>
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
            {geo.proof}
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
            {geo.cta}
          </button>
          <p style={{ fontSize: '13px', color: T.textSecondary }}>
            {geo.anxietyKiller}
          </p>
        </section>

        <footer className="lp-footer-disclaimer">
          <p>
            Brand names referenced are property of their respective owners.
            CVPassport is a document preparation tool and has no affiliation
            with, or endorsement from, any company listed.
          </p>
        </footer>

        <section id="faq" className="lp-faq-section" aria-labelledby="lp-faq-heading">
          <h2 id="lp-faq-heading" className="lp-faq-heading">
            Questions people actually ask
          </h2>
          {FAQ_ITEMS.map((item, i) => {
            const open = faqOpenIndex === i;
            return (
              <div key={item.q} className="lp-faq-item">
                <button
                  type="button"
                  className="lp-faq-q"
                  aria-expanded={open}
                  onClick={() => setFaqOpenIndex((prev) => (prev === i ? null : i))}
                >
                  <span className="lp-faq-q-text">{item.q}</span>
                  <FaqChevronIcon open={open} />
                </button>
                <div
                  style={{
                    maxHeight: open ? '400px' : '0',
                    overflow: 'hidden',
                    opacity: open ? 1 : 0,
                    transition: 'max-height 300ms cubic-bezier(0.4,0,0.2,1), opacity 300ms cubic-bezier(0.4,0,0.2,1)',
                  }}
                >
                  <p className="lp-faq-a">{item.a}</p>
                </div>
              </div>
            );
          })}
        </section>

        <footer className="lp-site-footer" role="contentinfo">
          <div className="lp-site-footer-inner">
            <div className="lp-site-footer-row1">
              <div>
                <p className="lp-site-footer-brand-title">CVPassport</p>
                <p className="lp-site-footer-brand-tag">Built for South Asian job seekers in the Gulf.</p>
              </div>
              <nav className="lp-site-footer-cols" aria-label="Footer">
                <div>
                  <p className="lp-site-footer-col-h">Product</p>
                  <a className="lp-site-footer-link" href="#templates">Templates</a>
                  <a className="lp-site-footer-link" href="#ats">ATS Score</a>
                  <a className="lp-site-footer-link" href="#cover-letter">Cover Letter</a>
                  <a className="lp-site-footer-link" href="#walkin">Walk-In Mode</a>
                </div>
                <div>
                  <p className="lp-site-footer-col-h">Legal</p>
                  <a className="lp-site-footer-link" href="/terms">Terms of Service</a>
                  <a className="lp-site-footer-link" href="/privacy">Privacy Policy</a>
                  <a className="lp-site-footer-link" href="/privacy#cookies">Cookie Policy</a>
                </div>
                <div>
                  <p className="lp-site-footer-col-h">Support</p>
                  <a className="lp-site-footer-link" href="mailto:support@mycvpassport.com">support@mycvpassport.com</a>
                  <a className="lp-site-footer-link" href="#faq">FAQ</a>
                </div>
              </nav>
            </div>
            <div className="lp-site-footer-row2">
              <p>
                © 2026 CVPassport. All rights reserved.
                <br />
                Operated by Junaid Mujtaba Khan, Dubai, UAE.
              </p>
              <p>Payments by LemonSqueezy · Infrastructure by Supabase</p>
            </div>
          </div>
        </footer>

        <CookieBanner />
      </div>
    </>
  );
}
