import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './appSupabaseClient';
import { Helmet } from 'react-helmet-async';
import CVPassportLogo from './components/CVPassportLogo';
import CookieBanner from './components/CookieBanner';
import PaymentTrustBar from './components/PaymentTrustBar';
import MobileNav from './components/navigation/MobileNav';
import DesktopNav from './components/navigation/DesktopNav';
// W18 — 5-block conversion layout. See
// /5-HANDOFF/[READY]_landing_page_conversion_rewrite_W18.json.
import HeroSection from './components/landing/HeroSection';
import GulfBillboardCard from './components/landing/GulfBillboardCard';
import ShowSection from './components/landing/ShowSection';
import FeatureCardGrid from './components/landing/FeatureCardGrid';
import FoundersNoteSection from './components/landing/FoundersNoteSection';
import PricingAnchorSection from './components/landing/PricingAnchorSection';
import FinalCTASection from './components/landing/FinalCTASection';
// W18 reinforcements — free-tools bar above the fold and real
// testimonials row above the Founder's Note.
import TestimonialsRow from './components/marketing/TestimonialsRow';

// ── SVG Icons ──────────────────────────────────────────────────────
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
    a: "Email support@mycvpassport.com with your Ziina order ID and we'll sort it. All payments are processed securely through Ziina — we never see your card details.",
  },
  {
    q: 'Can I use CVPassport on my phone?',
    a: 'Yes. CVPassport is built mobile-first. The full builder, templates, and download flow work on any smartphone browser — no app install needed.',
  },
];

// ── Main component ──────────────────────────────────────────────────
export default function LandingPage({ user, onSignOut, onLogin, onSignup, onWalkIn }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('cvp-theme') || 'dark'; } catch { return 'dark'; }
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [faqOpenIndex, setFaqOpenIndex] = useState(null);

  // Smart Landing Flow state
  const [userProfile, setUserProfile] = useState(null); // { user_type, full_name }
  const [toastVisible, setToastVisible] = useState(false);
  const [toastFading, setToastFading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Fetch user profile for smart CTA / hero personalization
  useEffect(() => {
    if (!supabase || !user?.id) { setUserProfile(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.from('profiles').select('user_type, full_name').eq('id', user.id).single();
        if (!cancelled && data) setUserProfile(data);
      } catch { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  // Welcome toast on ?welcome=true
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('welcome') !== 'true') return;
    // Build toast message
    const isHr = params.get('type') === 'hr';
    const firstName = userProfile?.full_name
      ? userProfile.full_name.split(' ')[0]
      : (user?.name ? user.name.split(' ')[0] : 'there');
    const msg = isHr
      ? `Welcome, ${firstName}! Your hiring portal is set up and ready.`
      : `Welcome, ${firstName}! Explore freely — your dashboard is ready when you are.`;
    setToastMessage(msg);
    setToastVisible(true);
    setToastFading(false);
    // Remove ?welcome from URL
    params.delete('welcome');
    params.delete('type');
    const cleanUrl = params.toString() ? `${location.pathname}?${params.toString()}` : location.pathname;
    window.history.replaceState({}, '', cleanUrl);
    // Auto-dismiss
    const fadeTimer = setTimeout(() => setToastFading(true), 3700);
    const hideTimer = setTimeout(() => { setToastVisible(false); setToastFading(false); }, 4000);
    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer); };
  }, [location.search, location.pathname, userProfile, user?.name]);

  // Nav-chrome helpers — userType drives avatar destination, userInitials
  // feeds the avatar chip. The W18 landing body consumes its own copy;
  // legacy smartCtaText/smartCtaAction/firstName were dropped.
  const userType = userProfile?.user_type;
  const userInitials = (() => {
    const fullName = userProfile?.full_name || user?.name || '';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    if (parts.length === 1 && parts[0]) return parts[0][0].toUpperCase();
    return '?';
  })();

  const avatarDest = userType === 'recruiter' ? '/hr' : '/dashboard';
  const [avatarDropdownOpen, setAvatarDropdownOpen] = useState(false);
  const avatarDropdownRef = useRef(null);

  // Close avatar dropdown on outside click
  useEffect(() => {
    if (!avatarDropdownOpen) return;
    const handler = (e) => {
      if (avatarDropdownRef.current && !avatarDropdownRef.current.contains(e.target)) {
        setAvatarDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [avatarDropdownOpen]);

  const isDark = theme === 'dark';

  const T = isDark ? {
    bgPage:       '#0A0A0A',
    bgSurface:    '#141414',
    bgElevated:   '#1C1C1C',
    textPrimary:  '#FFFFFF',
    textSecondary:'#A0A0A0',
    border:       '#2A2A2A',
    navBg:        'rgba(10,10,10,0.6)',
    navBorder:    'rgba(255,255,255,0.08)',
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

  return (
    <>
      <Helmet>
        <title>CVPassport — Free ATS CV Builder for UAE, Gulf &amp; India Jobs</title>
        <meta name="description" content="Build ATS-optimised CVs for UAE, Gulf and India job markets. Free ATS score checker, Walk-In CV builder, and Gulf-ready templates. Used by job seekers across Dubai, Abu Dhabi, Mumbai and Bangalore. Free to start." />
        <meta name="keywords" content="CV builder UAE, ATS CV Dubai, resume builder GCC, CV maker India, ATS optimised CV, job seeker Dubai, expat CV builder, CV templates UAE" />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="CVPassport" />
        <link rel="canonical" href="https://www.mycvpassport.com/" />
        <meta property="og:title" content="CVPassport — Free ATS CV Builder for UAE, Gulf &amp; India Jobs" />
        <meta property="og:description" content="Build ATS-optimised CVs for UAE, Gulf and India job markets. Free ATS score checker, Walk-In CV builder, and Gulf-ready templates. Free to start." />
        <meta property="og:url" content="https://www.mycvpassport.com/" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="en_AE" />
        <meta property="og:image" content="https://www.mycvpassport.com/images/falcon-icon.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="CVPassport — Free ATS CV Builder for UAE, Gulf &amp; India Jobs" />
        <meta name="twitter:description" content="Build ATS-optimised CVs for UAE, Gulf and India job markets. Free ATS score checker, Walk-In CV builder, and Gulf-ready templates. Free to start." />
        <meta name="twitter:image" content="https://www.mycvpassport.com/images/falcon-icon.png" />
        <script type="application/ld+json">{`
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "What is an ATS-friendly CV?",
      "acceptedAnswer": { "@type": "Answer", "text": "An ATS-friendly CV is a document formatted so that Applicant Tracking Systems — software used by UAE, Gulf, and Indian employers to filter applications automatically — can correctly parse and score it. This means single-column layout, standard fonts, no tables or text boxes, correct section labelling, and the right keywords for the target role and job market. CVPassport checks your CV against the ATS systems UAE and Indian employers actually use." }
    },
    {
      "@type": "Question",
      "name": "How do I build a CV for a walk-in interview in Dubai?",
      "acceptedAnswer": { "@type": "Answer", "text": "Use CVPassport's Walk-In CV builder to create a clean, single-page ATS-safe CV in under 5 minutes. Walk-in interviews in Dubai and the UAE typically involve direct submission to a recruiter or HR team on the day — bring multiple printed copies. Your CV should be one page, easy to scan in 6 seconds, and include your visa status prominently so the recruiter knows your availability immediately." }
    },
    {
      "@type": "Question",
      "name": "Is CVPassport free to use?",
      "acceptedAnswer": { "@type": "Answer", "text": "Yes. CVPassport is free to start — build your CV, check your ATS score, and download your PDF at no cost. Premium features are available for advanced templates and detailed ATS scoring." }
    },
    {
      "@type": "Question",
      "name": "Does CVPassport work for Indian domestic job applications?",
      "acceptedAnswer": { "@type": "Answer", "text": "Yes. CVPassport is built for both Gulf and Indian job markets. Our ATS checker is calibrated for Indian portals including Naukri, Shine, and LinkedIn India, as well as Gulf platforms like Bayt, GulfTalent, and Naukrigulf. Build your profile once and generate optimised versions for both markets." }
    },
    {
      "@type": "Question",
      "name": "Should I include a photo on my UAE CV?",
      "acceptedAnswer": { "@type": "Answer", "text": "Only if the job posting explicitly asks for one, or for customer-facing roles like hospitality or aviation where some employers request it. For most corporate, tech, finance, and engineering roles, skip the photo. ATS systems cannot read images, and an unsolicited photo can disrupt document parsing." }
    },
    {
      "@type": "Question",
      "name": "Which Gulf countries does CVPassport support?",
      "acceptedAnswer": { "@type": "Answer", "text": "CVPassport templates and ATS scoring cover the full GCC: UAE, Saudi Arabia, Qatar, Kuwait, Bahrain, and Oman. The Gulf-standard format works across all six countries." }
    }
  ]
}
        `}</script>
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
        @keyframes lp-pulse-dot {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        /* ── Smooth theme transition ─── */
        .lp-wrapper,
        .lp-wrapper nav,
        .lp-wrapper .lp-card,
        .lp-wrapper footer,
        .lp-wrapper section {
          transition: background-color 0.4s cubic-bezier(0.4,0,0.2,1),
                      color 0.4s cubic-bezier(0.4,0,0.2,1),
                      border-color 0.4s cubic-bezier(0.4,0,0.2,1);
        }

        .lp-nav        { padding: 0 60px; }
        .lp-sec        { padding: 80px 60px; }
        .lp-hero       { padding: 80px 60px 32px; }
        .lp-hero + .lp-sec { padding-top: 48px; }
        .lp-walkin-sec { padding: 80px 60px; }

        /* Hover states */
        .lp-btn:hover      { opacity: 0.85; transform: translateY(-1px); }
        .lp-ghost-btn:hover{ opacity: 0.75; }
        .lp-nav-link:hover,
        .lp-nav-link.is-active { background: rgba(255,255,255,0.1) !important; color: #FFFFFF !important; }
        .lp-card:hover     { border-color: ${isDark ? 'rgba(255,255,255,0.14)' : '#BBBBBB'} !important; transform: translateY(-2px); }
        .lp-theme-btn:hover{ opacity: 0.8; }

        /* Transitions */
        .lp-btn       { transition: opacity 0.2s cubic-bezier(0.4,0,0.2,1), transform 0.2s cubic-bezier(0.4,0,0.2,1); }
        .lp-ghost-btn { transition: opacity 0.2s cubic-bezier(0.4,0,0.2,1), transform 0.2s cubic-bezier(0.4,0,0.2,1); }
        .lp-nav-link  { transition: background 0.2s ease, color 0.2s ease; }
        .lp-card      { transition: border-color 0.2s cubic-bezier(0.4,0,0.2,1), transform 0.2s cubic-bezier(0.4,0,0.2,1); }
        .lp-theme-btn { transition: opacity 0.2s cubic-bezier(0.4,0,0.2,1); }

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
          .lp-hero-ctas    { flex-direction: column !important; align-items: center !important; }
          .lp-hero-ctas button { width: 100% !important; }
          .lp-hero-ctas .lp-hero-primary-cta {
            width: auto !important;
            max-width: 280px !important;
            padding: 14px 28px !important;
            margin: 0 auto !important;
          }
        }
        @media (min-width: 769px) {
          .lp-hamburger    { display: none !important; }
          .lp-mobile-menu  { display: none !important; }
        }

        /* Desktop hero overrides */
        @media (min-width: 1024px) {
          .lp-hero {
            padding: 100px 60px 60px !important;
          }
          .lp-hero-inner {
            display: flex !important;
            align-items: flex-start !important;
            gap: 60px !important;
          }
          .lp-hero-content {
            flex: 0 0 55% !important;
            max-width: 55% !important;
          }
          .lp-hero-right-bento {
            display: flex !important;
            flex: 0 0 42% !important;
          }
          .lp-hero h1 {
            font-size: 72px !important;
            font-weight: 800 !important;
            letter-spacing: -0.03em !important;
            line-height: 1.0 !important;
          }
          .lp-feature-grid-desktop {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }

        .lp-hero-right-bento {
          display: none;
          flex-direction: column;
          gap: 10px;
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
        .lp-templates-carousel { width: 100%; }
        .lp-templates-viewport {
          overflow: hidden; width: 100%; cursor: grab;
          -webkit-user-select: none; user-select: none;
        }
        .lp-templates-viewport:active { cursor: grabbing; }
        .lp-templates-track { display: flex; gap: 16px; width: max-content; padding-bottom: 16px; }

        .lp-templates-mobile-only { display: block; }
        .lp-templates-desktop-only { display: none; }
        @media (min-width: 1024px) {
          .lp-templates-mobile-only { display: none; }
          .lp-templates-desktop-only { display: block; text-align: center; padding: 0 24px; }
          .lp-sec.lp-templates { padding: 48px 24px; text-align: center; }
          .lp-templates-desktop-grid {
            display: flex;
            justify-content: center;
            gap: 20px;
          }
          .lp-templates-desktop-card {
            position: relative;
            min-width: 220px;
            flex-shrink: 0;
          }
          .lp-templates-desktop-card .lp-cv-thumb-scale-outer {
            width: 220px;
            height: 300px;
            border-radius: 12px;
          }
          .lp-templates-desktop-card-frost {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 40%;
            background: linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.85) 60%, rgba(255,255,255,0.96) 100%);
            backdrop-filter: blur(2px);
            -webkit-backdrop-filter: blur(2px);
            border-radius: 0 0 12px 12px;
            pointer-events: none;
            z-index: 3;
          }
        }
        .lp-hero-cycle-word {
          display: inline-block;
          margin: 0 0.12em;
          min-width: 2.4em;
          text-align: center;
          transition: opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .lp-feature-grid-desktop {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        @media (max-width: 768px) {
          .lp-feature-grid-desktop {
            grid-template-columns: 1fr;
          }
        }

        .lp-feature-section-bleed { padding: 80px 60px; }
        @media (max-width: 768px) {
          .lp-feature-section-bleed { padding: 60px 20px; }
        }

        .lp-faq-section { max-width: 720px; margin: 0 auto; padding: 80px 24px; }
        .lp-faq-heading { font-size: 28px; font-weight: 600; color: var(--text-primary); margin: 0 0 40px; }
        .lp-faq-item { border-bottom: 1px solid var(--border-default); }
        .lp-faq-q {
          width: 100%; display: flex; justify-content: space-between; align-items: center;
          cursor: pointer; padding: 20px 0; margin: 0; background: none; border: none;
          font-family: inherit; text-align: left;
        }
        .lp-faq-q-text { font-size: 15px; color: var(--text-primary); font-weight: 500; padding-right: 16px; }
        .lp-faq-a { font-size: 14px; color: var(--text-secondary); line-height: 1.6; padding-bottom: 20px; margin: 0; }

        .lp-site-footer {
          background: #0A0A0A; border-top: 1px solid #2A2A2A; padding: 48px 24px 32px;
          --text-secondary: #A0A0A0; --border-default: #2A2A2A;
        }
        .lp-site-footer-inner { max-width: 1100px; margin: 0 auto; }
        .lp-site-footer-row1 { display: flex; justify-content: space-between; align-items: flex-start; gap: 40px; flex-wrap: wrap; }
        .lp-site-footer-brand-title { font-size: 16px; font-weight: 600; color: #FFF; margin: 0; }
        .lp-site-footer-brand-tag { font-size: 13px; color: var(--text-secondary); margin: 8px 0 0; }
        .lp-site-footer-cols { display: flex; flex-direction: row; gap: 40px; flex-wrap: wrap; }
        .lp-site-footer-col-h {
          font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase;
          color: var(--text-secondary); opacity: 0.5; margin: 0 0 12px; font-weight: 500;
        }
        .lp-site-footer-link {
          font-size: 13px; color: var(--text-secondary); text-decoration: none; display: block;
          line-height: 2; transition: color 150ms ease;
        }
        .lp-site-footer-link:hover { color: #FFF; }
        .lp-site-footer-row2 {
          margin-top: 40px; padding-top: 24px; border-top: 1px solid #2A2A2A;
          display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;
        }
        .lp-site-footer-row2 p { font-size: 12px; color: var(--text-secondary); margin: 0; }
        @media (max-width: 768px) {
          .lp-site-footer-row1 { flex-direction: column; }
          .lp-site-footer-cols { flex-direction: column; gap: 24px; }
          .lp-site-footer-row2 { flex-direction: column; text-align: center; }
        }
        .lp-footer-trust {
          display: flex; align-items: center; gap: 8px; flex-wrap: wrap;
          font-size: 12px; font-weight: 500; color: #FFFFFF; opacity: 1; margin-top: 16px;
        }

        .lp-footer-disclaimer { text-align: center; padding: 24px; border-top: 1px solid var(--border-default); }
        .lp-footer-disclaimer p { font-size: 11px; color: var(--text-secondary); opacity: 0.4; max-width: 560px; margin: 0 auto; line-height: 1.6; }

        .lp-sec.lp-industry { text-align: center; padding: 48px 24px; }
        .lp-badges { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin: 16px 0; }
        .lp-badge {
          padding: 8px 18px; border-radius: 20px; border: 1px solid var(--border-default);
          font-size: 13px; color: var(--text-primary); background: var(--bg-surface);
        }
        .lp-micro-disclaimer {
          font-size: 11px; color: var(--text-secondary); opacity: 0.5;
          margin-top: 12px; max-width: 480px; margin-left: auto; margin-right: auto;
        }

        .lp-problem-card-header { display: flex; flex-direction: row; align-items: center; gap: 12px; }
        .lp-problem-card-icon { width: 20px; height: 20px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; color: inherit; }
        .lp-problem-card-icon svg { width: 20px; height: 20px; }
        .lp-problem-card-title { font-weight: 600; font-size: 14px; margin: 0; color: var(--text-primary); font-family: inherit; }
        .lp-problem-card-desc { font-size: 13px; color: var(--text-secondary); margin-top: 4px; margin-bottom: 0; line-height: 1.65; }

        /* Hamburger panel links */
        .lp-hamburger-link {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 0; border-bottom: 1px solid var(--border-default);
          background: none; border-left: none; border-right: none; border-top: none;
          color: var(--text-primary); font-size: 18px; font-weight: 500;
          cursor: pointer; font-family: inherit; text-align: left; width: 100%;
        }
        .lp-hamburger-link:last-of-type { border-bottom: none; }

        .lp-feature-cta { transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
        .lp-feature-cta:hover { opacity: 0.85; }

        @keyframes lp-hero-beam {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        .lp-hero-primary-cta::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 40%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
          animation: lp-hero-beam 3s ease-in-out infinite;
          pointer-events: none;
          z-index: 1;
        }
        .lp-avatar-dropdown-item:hover {
          background: rgba(255,255,255,0.04) !important;
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
          <Link
            to="/"
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'inherit' }}
            aria-label="CVPassport home"
          >
            <CVPassportLogo height={40} />
          </Link>

          {/* Desktop nav — section-grouped dropdowns (freebie-first).
              See src/components/navigation/DesktopNav.jsx + src/config/navItems.js. */}
          <DesktopNav user={user} />

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
              <div ref={avatarDropdownRef} style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setAvatarDropdownOpen((o) => !o)}
                  aria-label="User menu"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: '#1a1a1a',
                    border: '1px solid rgba(255,179,0,0.3)',
                    color: '#FFB300',
                    fontSize: 13,
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    padding: 0,
                  }}
                >
                  {userInitials}
                </button>
                {avatarDropdownOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 44,
                      right: 0,
                      background: '#161616',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 12,
                      padding: 8,
                      minWidth: 160,
                      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                      zIndex: 999,
                    }}
                  >
                    <button
                      type="button"
                      className="lp-avatar-dropdown-item"
                      onClick={() => { setAvatarDropdownOpen(false); navigate(avatarDest); }}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 8,
                        fontSize: 13,
                        color: 'rgba(200,198,192,0.8)',
                        cursor: 'pointer',
                        background: 'none',
                        border: 'none',
                        textAlign: 'left',
                        fontFamily: 'inherit',
                      }}
                    >
                      {userType === 'recruiter' ? 'Go to Portal' : 'Go to Dashboard'}
                    </button>
                    <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
                    <button
                      type="button"
                      className="lp-avatar-dropdown-item"
                      onClick={async () => {
                        setAvatarDropdownOpen(false);
                        if (supabase) await supabase.auth.signOut();
                        navigate('/');
                      }}
                      style={{
                        display: 'block',
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 8,
                        fontSize: 13,
                        color: 'rgba(200,198,192,0.8)',
                        cursor: 'pointer',
                        background: 'none',
                        border: 'none',
                        textAlign: 'left',
                        fontFamily: 'inherit',
                      }}
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <button
                  type="button"
                  className="lp-ghost-btn"
                  onClick={onLogin}
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
                  onClick={onSignup}
                  style={{
                    background:   '#D4860A',
                    border:       'none',
                    color:        '#000000',
                    borderRadius: '20px',
                    padding:      '8px 18px',
                    fontSize:     '13px',
                    fontWeight:   '600',
                    cursor:       'pointer',
                    fontFamily:   'inherit',
                  }}
                >
                  Build my CV free →
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

        {/* Mobile nav drawer — freebie-first sections, routes only real paths.
            See src/components/navigation/MobileNav.jsx + src/config/navItems.js. */}
        <MobileNav
          isOpen={mobileMenuOpen}
          onClose={closeMobileMenu}
          user={user}
          userType={userType}
          avatarDest={avatarDest}
          onLogin={onLogin}
          onSignup={onSignup}
          onSignOut={onSignOut}
        />

        {/* ── W18 LANDING — 5-block conversion layout ───────────── */}
        <HeroSection />
        <GulfBillboardCard />
        <ShowSection />
        <FeatureCardGrid />
        <TestimonialsRow />
        <FoundersNoteSection />
        <PricingAnchorSection />
        <FinalCTASection />

        <footer className="lp-footer-disclaimer">
          <p>
            Brand names referenced are property of their respective owners.
            CVPassport is a document preparation tool and has no affiliation
            with, or endorsement from, any company listed.
          </p>
        </footer>

        {/* ── FAQ (Task 7) ───────────────────────────────────────── */}
        <section id="faq" className="lp-faq-section" aria-labelledby="lp-faq-heading">
          <h2 id="lp-faq-heading" className="lp-faq-heading">
            Questions people actually ask
          </h2>
          {FAQ_ITEMS.map((item, i) => {
            const open = faqOpenIndex === i;
            return (
              <div key={item.q} className="lp-faq-item" style={{ background: isDark ? '#0A0A0A' : '#F5F5F0' }}>
                <button
                  type="button"
                  className="lp-faq-q"
                  aria-expanded={open}
                  onClick={() => setFaqOpenIndex((prev) => (prev === i ? null : i))}
                >
                  <span className="lp-faq-q-text" style={{ color: T.textPrimary }}>{item.q}</span>
                  <span style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: isDark ? '#1C1C1C' : '#E0E0E0',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 16, color: T.textSecondary, flexShrink: 0,
                    transition: 'transform 200ms cubic-bezier(0.4,0,0.2,1)',
                    transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
                  }}>
                    +
                  </span>
                </button>
                <div
                  style={{
                    maxHeight: open ? '400px' : '0',
                    overflow: 'hidden',
                    opacity: open ? 1 : 0,
                    transition: 'max-height 300ms cubic-bezier(0.4,0,0.2,1), opacity 300ms cubic-bezier(0.4,0,0.2,1)',
                  }}
                >
                  <p className="lp-faq-a" style={{ color: T.textSecondary }}>{item.a}</p>
                </div>
              </div>
            );
          })}
        </section>

        {/* ── FOOTER (Task 8) ────────────────────────────────────── */}
        <footer className="lp-site-footer" role="contentinfo">
          <div className="lp-site-footer-inner">
            <div className="lp-site-footer-row1">
              <div>
                <p className="lp-site-footer-brand-title">CVPassport</p>
                <p className="lp-site-footer-brand-tag">Built for job seekers in the Gulf.</p>
              </div>
              <nav className="lp-site-footer-cols" aria-label="Footer">
                <div>
                  <p className="lp-site-footer-col-h">Product</p>
                  <Link className="lp-site-footer-link" to="/jobs">Browse Jobs</Link>
                  <Link className="lp-site-footer-link" to="/builder?tab=templates">Templates</Link>
                  <Link className="lp-site-footer-link" to="/ats">ATS Score</Link>
                  <Link className="lp-site-footer-link" to="/cover-letter">Cover Letter</Link>
                  <Link className="lp-site-footer-link" to="/walk-in">Walk-In Mode</Link>
                  <Link
                    className="lp-site-footer-link"
                    to="/salary-switcher"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    Salary Switcher
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: '#1D9E75',
                        background: 'rgba(29,158,117,0.12)',
                        border: '1px solid rgba(29,158,117,0.3)',
                        padding: '2px 6px',
                        borderRadius: 4,
                      }}
                    >
                      Free Tool
                    </span>
                  </Link>
                </div>
                <div>
                  <p className="lp-site-footer-col-h">Company</p>
                  <Link className="lp-site-footer-link" to="/about">About</Link>
                  <Link className="lp-site-footer-link" to="/india-to-uae">India to UAE</Link>
                  <Link className="lp-site-footer-link" to="/blog">Blog</Link>
                  <Link className="lp-site-footer-link" to="/blog/uae-cv-format-2026">UAE CV Format Guide</Link>
                </div>
                <div>
                  <p className="lp-site-footer-col-h">Legal</p>
                  <Link className="lp-site-footer-link" to="/terms">Terms of Service</Link>
                  <Link className="lp-site-footer-link" to="/privacy">Privacy Policy</Link>
                  <Link className="lp-site-footer-link" to="/refund">Refund Policy</Link>
                </div>
                <div>
                  <p className="lp-site-footer-col-h">Support</p>
                  <a className="lp-site-footer-link" href="mailto:support@mycvpassport.com">support@mycvpassport.com</a>
                  <span className="lp-site-footer-link" style={{ cursor: 'pointer' }} onClick={() => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' })}>FAQ</span>
                </div>
              </nav>
            </div>
            {/* Payment trust bar */}
            <div style={{ marginTop: 24, marginBottom: 16 }}>
              <PaymentTrustBar />
            </div>

            {/* Trust row */}
            <div className="lp-footer-trust">
              <span>Apple Pay</span>
              <span>&middot;</span>
              <span>Ziina</span>
              <span>&middot;</span>
              <span>Visa</span>
              <span>&middot;</span>
              <span>Mastercard</span>
              <span>&middot;</span>
              <span>Operated by JMK, Dubai UAE</span>
            </div>
            <div className="lp-site-footer-row2">
              <p>&copy; 2026 CVPassport. All rights reserved.</p>
              <p>Payments by Ziina</p>
            </div>
          </div>
        </footer>

        <CookieBanner />

        {/* Welcome toast */}
        {toastVisible && (
          <div
            style={{
              position: 'fixed',
              bottom: 32,
              left: '50%',
              transform: 'translateX(-50%)',
              background: '#161616',
              border: '1px solid rgba(255,255,255,0.08)',
              borderLeft: '3px solid #FFB300',
              borderRadius: 12,
              padding: '14px 20px',
              color: '#e0e0e0',
              fontSize: 13,
              boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
              zIndex: 9999,
              opacity: toastFading ? 0 : 1,
              transition: 'opacity 300ms cubic-bezier(0.4,0,0.2,1)',
              maxWidth: '90vw',
              whiteSpace: 'nowrap',
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            {toastMessage}
          </div>
        )}
      </div>
    </>
  );
}
