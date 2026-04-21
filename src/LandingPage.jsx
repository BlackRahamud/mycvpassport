import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from './appSupabaseClient';
import { Helmet } from 'react-helmet-async';
import CVPassportLogo from './components/CVPassportLogo';
import { useGeoContent } from './hooks/useGeoContent';
import { TEMPLATES, EMPTY_RESUME, EMPTY_EXP } from './cvShared';
import { CvTemplateThumb } from './pages/TemplatesPage';
import HowItWorks from './HowItWorks';
import TestimonialsGrid from './components/marketing/TestimonialsGrid';
import RejectionReel from './components/marketing/RejectionReel';
import ATSPreview from './components/marketing/ATSPreview';
import CookieBanner from './components/CookieBanner';
import PaymentTrustBar from './components/PaymentTrustBar';
import MiniToolCard, { MINI_TOOL_CSS } from './components/MiniToolCard';
import MobileNav from './components/navigation/MobileNav';

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
  { name: 'Modern', tier: 'FREE', template: TEMPLATES[1] },
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
    a: "Email support@mycvpassport.com with your Ziina order ID and we'll sort it. All payments are processed securely through Ziina — we never see your card details.",
  },
  {
    q: 'Can I use CVPassport on my phone?',
    a: 'Yes. CVPassport is built mobile-first. The full builder, templates, and download flow work on any smartphone browser — no app install needed.',
  },
];

// ── Feature cards data ──────────────────────────────────────────────
const FEATURE_CARDS = [
  {
    eyebrow: 'ATS CHECK',
    title: 'Score your CV against real ATS',
    desc: 'Keyword density, format compliance, section structure — get a score and fix list before you apply.',
    iconColor: '#1D9E75',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
    route: '/builder?tab=ats',
  },
  {
    eyebrow: 'JOB MATCH',
    title: 'Match your CV to job descriptions',
    desc: 'Paste any job listing and see exactly which keywords you hit and which you miss.',
    iconColor: '#378ADD',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#378ADD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    ),
    route: '/builder?tab=jobmatch',
  },
  {
    eyebrow: 'COVER LETTER',
    title: 'Gulf-tone cover letters in seconds',
    desc: 'Structured fields, region-aware tone. UAE formal or India professional — ready in one click.',
    iconColor: '#D97706',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
      </svg>
    ),
    route: '/cover-letter',
  },
  {
    eyebrow: 'WALK-IN MODE',
    title: '60-second CV for walk-in interviews',
    desc: '6 fields, instant PDF, WhatsApp-ready. Built for hospitality, retail, and logistics roles.',
    iconColor: '#D85A30',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#D85A30" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    route: '/walkin',
  },
];

function LandingTemplateThumb({ template }) {
  return (
    <div className="lp-cv-thumb-scale-outer">
      <CvTemplateThumb resume={LANDING_THUMB_CV} template={template} />
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
    c.scrollLeft = c.scrollWidth / 3;

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
      onMouseEnter={() => { isPaused.current = true; }}
      onMouseLeave={() => { isPaused.current = false; isDragging.current = false; }}
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

// ── Animated SVG background for hero ────────────────────────────────
function HeroBackground({ isDark }) {
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      <style>{`
        @keyframes lp-path-draw {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1440 700"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        style={{ position: 'absolute', inset: 0, opacity: isDark ? 0.4 : 0.15 }}
      >
        <path
          d="M-100 200 C200 180, 400 300, 700 250 S1100 150, 1540 280"
          stroke={isDark ? '#1C1C1C' : '#D0D0D0'}
          strokeWidth="1"
          strokeDasharray="8 6"
          style={{ animation: 'lp-path-draw 4s ease forwards' }}
          strokeDashoffset="1200"
        />
        <path
          d="M-50 450 C300 400, 500 500, 800 420 S1200 350, 1540 500"
          stroke={isDark ? '#1C1C1C' : '#D0D0D0'}
          strokeWidth="1"
          strokeDasharray="10 8"
          style={{ animation: 'lp-path-draw 5s ease 0.5s forwards' }}
          strokeDashoffset="1400"
        />
        <path
          d="M-80 100 C150 80, 350 180, 600 120 S900 200, 1200 150 S1400 100, 1540 160"
          stroke={isDark ? '#1C1C1C' : '#D0D0D0'}
          strokeWidth="0.8"
          strokeDasharray="6 10"
          style={{ animation: 'lp-path-draw 6s ease 1s forwards' }}
          strokeDashoffset="1600"
        />
        <path
          d="M-30 600 C200 560, 500 620, 750 580 S1000 540, 1540 610"
          stroke={isDark ? '#181818' : '#E0E0E0'}
          strokeWidth="0.6"
          strokeDasharray="4 12"
          style={{ animation: 'lp-path-draw 7s ease 1.5s forwards' }}
          strokeDashoffset="1500"
        />
      </svg>
    </div>
  );
}

// ── Beam sweep animation component ──────────────────────────────────
function BeamBorder({ color = 'rgba(255,255,255,0.4)' }) {
  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, overflow: 'hidden', borderRadius: 'inherit' }}>
      <style>{`
        @keyframes lp-beam-sweep {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
      <div style={{
        width: '50%',
        height: '100%',
        background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
        animation: 'lp-beam-sweep 3s ease-in-out infinite',
      }} />
    </div>
  );
}

// ── Bento Cards for Hero (desktop only) ─────────────────────────────
function BentoCardYourCV() {
  return (
    <div style={{
      background: '#0C0C0C',
      border: '1px solid #161616',
      borderRadius: 18,
      padding: '20px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <BeamBorder />
      {/* Eyebrow */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#1D9E75', boxShadow: '0 0 6px #1D9E75', animation: 'lp-pulse-dot 2s ease-in-out infinite' }} />
        <span style={{ fontSize: 10, fontWeight: 700, color: '#1D9E75', letterSpacing: 1.2, textTransform: 'uppercase' }}>Your CV</span>
      </div>

      {/* CV bar preview */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        {[
          { color: '#378ADD', label: 'Contact Details', width: '90%' },
          { color: '#1D9E75', label: 'Experience', width: '85%' },
          { color: '#6366F1', label: 'Education', width: '60%' },
          { color: '#D97706', label: 'Skills', width: '70%' },
        ].map((sec) => (
          <div key={sec.label}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
              <div style={{ width: 3, height: 10, borderRadius: 1, background: sec.color }} />
              <span style={{ fontSize: 9, color: '#666', letterSpacing: 0.3 }}>{sec.label}</span>
            </div>
            <div style={{ height: 4, width: sec.width, background: `${sec.color}33`, borderRadius: 2 }}>
              <div style={{ height: '100%', width: '100%', background: sec.color, borderRadius: 2, opacity: 0.6 }} />
            </div>
          </div>
        ))}
      </div>

      {/* Badges row */}
      <div style={{ display: 'flex', gap: 6 }}>
        <span style={{ fontSize: 9, background: 'rgba(29,158,117,0.1)', color: '#1D9E75', padding: '3px 8px', borderRadius: 4, fontWeight: 600 }}>ATS cleared</span>
        <span style={{ fontSize: 9, background: 'rgba(55,138,221,0.1)', color: '#378ADD', padding: '3px 8px', borderRadius: 4, fontWeight: 600 }}>Score 84</span>
      </div>

      {/* Stats row */}
      <div style={{ marginTop: 10, fontSize: 9, color: '#444', display: 'flex', gap: 4, alignItems: 'center' }}>
        <span>Gulf-ready templates</span>
        <span>&middot;</span>
        <span>11 Steps</span>
        <span>&middot;</span>
        <span>Free to start</span>
      </div>
    </div>
  );
}

function BentoCardGuideFlow() {
  const steps = [
    { label: 'Build CV', done: true },
    { label: 'ATS scan', done: true },
    { label: 'Job match', done: true },
    { label: 'Cover letter', done: false },
    { label: 'Download', done: false },
  ];

  return (
    <div style={{
      background: '#0C0C0C',
      border: '1px solid #161616',
      borderRadius: 18,
      padding: '16px',
      position: 'relative',
      overflow: 'hidden',
      flex: 1,
    }}>
      <BeamBorder />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#1D9E75', boxShadow: '0 0 6px #1D9E75', animation: 'lp-pulse-dot 2s ease-in-out infinite' }} />
        <span style={{ fontSize: 9, fontWeight: 700, color: '#1D9E75', letterSpacing: 1, textTransform: 'uppercase' }}>Guide Flow</span>
      </div>
      <p style={{ fontSize: 11, color: '#ccc', fontWeight: 600, margin: '0 0 10px', lineHeight: 1.3 }}>We don&apos;t give you a blank page.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {steps.map((s) => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 14, height: 14, borderRadius: '50%',
              background: s.done ? '#1D9E75' : 'transparent',
              border: s.done ? 'none' : '1.5px solid #333',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 8, color: '#fff', flexShrink: 0,
            }}>
              {s.done && '\u2713'}
            </div>
            <span style={{ fontSize: 10, color: s.done ? '#ccc' : '#555' }}>{s.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BentoCardATSCheck() {
  const score = 84;
  const r = 18;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <div style={{
      background: '#0C0C0C',
      border: '1px solid #161616',
      borderRadius: 18,
      padding: '16px',
      position: 'relative',
      overflow: 'hidden',
      flex: 1,
    }}>
      <BeamBorder />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
        <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#378ADD', boxShadow: '0 0 6px #378ADD', animation: 'lp-pulse-dot 2s ease-in-out infinite' }} />
        <span style={{ fontSize: 9, fontWeight: 700, color: '#378ADD', letterSpacing: 1, textTransform: 'uppercase' }}>ATS Check</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ fontSize: 11, color: '#ccc', fontWeight: 600, margin: '0 0 10px' }}>Gulf Market Ready</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {[
              { label: 'Keywords', status: 'Pass', ok: true },
              { label: 'Format', status: 'Pass', ok: true },
              { label: 'Add achievements', status: 'Improve', ok: false },
            ].map((row) => (
              <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: row.ok ? '#1D9E75' : '#D97706',
                  flexShrink: 0,
                }} />
                <span style={{ fontSize: 9, color: '#888' }}>{row.label}</span>
                <span style={{
                  fontSize: 8,
                  color: row.ok ? '#1D9E75' : '#D97706',
                  fontWeight: 600,
                  marginLeft: 'auto',
                }}>{row.status}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Score ring */}
        <div style={{ position: 'relative', width: 48, height: 48, flexShrink: 0, marginLeft: 8 }}>
          <svg width={48} height={48} viewBox="0 0 48 48" style={{ transform: 'rotate(-90deg)' }}>
            <defs>
              <linearGradient id="bento-ats-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#1D9E75" />
                <stop offset="100%" stopColor="#378ADD" />
              </linearGradient>
            </defs>
            <circle cx={24} cy={24} r={r} fill="none" stroke="#1e1e1e" strokeWidth={3} />
            <circle cx={24} cy={24} r={r} fill="none" stroke="url(#bento-ats-grad)" strokeWidth={3} strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" />
          </svg>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>{score}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────
export default function LandingPage({ user, onSignOut, onLogin, onSignup, onWalkIn }) {
  const geo = useGeoContent();
  const navigate = useNavigate();
  const location = useLocation();
  const [heroWordIndex, setHeroWordIndex] = useState(0);
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

  // Smart CTA helpers
  const userType = userProfile?.user_type;
  const firstName = userProfile?.full_name
    ? userProfile.full_name.split(' ')[0]
    : (user?.name ? user.name.split(' ')[0] : '');
  const userInitials = (() => {
    const fullName = userProfile?.full_name || user?.name || '';
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    if (parts.length === 1 && parts[0]) return parts[0][0].toUpperCase();
    return '?';
  })();

  const smartCtaText = !user
    ? geo.cta
    : userType === 'recruiter'
      ? 'Manage Talent'
      : 'Continue to Dashboard';

  const smartCtaAction = !user
    ? onSignup
    : userType === 'recruiter'
      ? () => navigate('/hr')
      : () => navigate('/dashboard');

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

  useEffect(() => {
    const id = window.setInterval(() => {
      setHeroWordIndex((i) => (i + 1) % HERO_CYCLE_WORDS.length);
    }, 2500);
    return () => clearInterval(id);
  }, []);

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark');

  const closeMobileMenu = () => setMobileMenuOpen(false);

  const handleLandingNav = (item) => {
    if (item === 'Templates') scrollToLandingSection('templates');
    else if (item === 'ATS Check') navigate('/ats');
    else if (item === 'Free Tools') navigate('/tools');
    else if (item === 'Blog') navigate('/blog');
    else if (item === 'Pricing') navigate('/pricing');
  };

  return (
    <>
      <Helmet>
        <title>CVPassport — ATS-Optimised CV Builder for UAE, GCC &amp; India Job Seekers</title>
        <meta name="description" content="Build a job-winning CV in minutes. ATS-optimised templates for Dubai, UAE, GCC & India. Free to start — no credit card required." />
        <meta name="keywords" content="CV builder UAE, ATS CV Dubai, resume builder GCC, CV maker India, ATS optimised CV, job seeker Dubai, expat CV builder, CV templates UAE" />
        <meta name="robots" content="index, follow" />
        <meta name="author" content="CVPassport" />
        <link rel="canonical" href="https://mycvpassport.com" />
        <meta property="og:title" content="CVPassport — ATS-Optimised CV Builder for UAE, GCC &amp; India Job Seekers" />
        <meta property="og:description" content="Build a job-winning CV in minutes. ATS-optimised templates for Dubai, UAE, GCC & India. Free to start — no credit card required." />
        <meta property="og:url" content="https://mycvpassport.com" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="en_AE" />
        <meta property="og:image" content="https://mycvpassport.com/images/falcon-icon.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="CVPassport — ATS-Optimised CV Builder for UAE, GCC &amp; India Job Seekers" />
        <meta name="twitter:description" content="Build a job-winning CV in minutes. ATS-optimised templates for Dubai, UAE, GCC & India. Free to start — no credit card required." />
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

          {/* Center nav — desktop only */}
          <div
            className="lp-nav-center"
            style={{
              display:              'flex',
              alignItems:           'center',
              gap:                  '2px',
              background:           isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
              border:               `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : T.border}`,
              borderRadius:         '100px',
              padding:              '6px 8px',
              backdropFilter:       'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              boxShadow:            isDark
                ? 'inset 0 1px 0 rgba(255,255,255,0.05), 0 4px 16px rgba(0,0,0,0.35)'
                : 'inset 0 1px 0 rgba(255,255,255,0.6), 0 2px 8px rgba(0,0,0,0.05)',
            }}
          >
            {['Templates', 'ATS Check', 'Free Tools', 'Blog', 'Pricing'].map(item => (
              <button
                key={item}
                type="button"
                className="lp-nav-link"
                onClick={() => handleLandingNav(item)}
                style={{
                  background:   'transparent',
                  border:       'none',
                  color:        isDark ? '#A0A0A0' : T.textSecondary,
                  fontSize:     '14px',
                  fontWeight:   500,
                  padding:      '6px 16px',
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

        {/* ── HERO (Task 3) ──────────────────────────────────────── */}
        <section
          className="lp-hero"
          style={{ maxWidth: '1300px', margin: '0 auto', position: 'relative', overflow: 'visible' }}
        >
          <HeroBackground isDark={isDark} />
          <div className="lp-hero-inner" style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: '40px' }}>
            {/* Left */}
            <div className="lp-hero-content" style={{ flex: 1, maxWidth: '560px' }}>
              {geo.showWalkIn && (
                <button
                  type="button"
                  className="cvp-walkin-chip"
                  onClick={() => scrollToLandingSection('walkin')}
                  style={{ marginBottom: '16px' }}
                >
                  &#9889; Walk-in tomorrow? Start building now
                </button>
              )}

              {/* Pill */}
              <div style={{
                display:      'inline-flex',
                alignItems:   'center',
                gap:          '8px',
                background:   isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.04)',
                border:       `1px solid ${isDark ? '#1E1E1E' : '#E0E0E0'}`,
                borderRadius: '20px',
                padding:      '6px 16px',
                marginBottom: '28px',
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: '#555',
                  animation: 'lp-pulse-dot 2s ease-in-out infinite',
                  flexShrink: 0,
                }} />
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
                {user && firstName ? (
                  <>Ready to build, {firstName}?</>
                ) : (
                  <>
                    {geo.heroHeadlineBefore}
                    <span
                      className="lp-hero-cycle-word"
                      aria-live="polite"
                      aria-atomic="true"
                    >
                      {HERO_CYCLE_WORDS[heroWordIndex]}
                    </span>
                    {geo.heroHeadlineAfter}
                  </>
                )}
              </h1>

              {/* Subheadline */}
              <p style={{ fontSize: '16px', color: isDark ? '#444' : '#666', marginBottom: '36px', lineHeight: 1.7, maxWidth: 480 }}>
                {geo.subheadline}
              </p>

              {/* CTA row */}
              <div className="lp-hero-ctas" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '16px' }}>
                <button
                  type="button"
                  className="lp-btn lp-hero-primary-cta"
                  onClick={smartCtaAction}
                  style={{
                    position:     'relative',
                    overflow:     'hidden',
                    background:   isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
                    color:        T.textPrimary,
                    border:       `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                    borderRadius: '26px',
                    padding:      '13px 28px',
                    fontSize:     '15px',
                    fontWeight:   '600',
                    cursor:       'pointer',
                    fontFamily:   'inherit',
                    whiteSpace:   'nowrap',
                    display:      'inline-flex',
                    alignItems:   'center',
                    gap:          '10px',
                  }}
                >
                  {smartCtaText}
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 24, height: 24, borderRadius: '50%',
                    background: isDark ? '#fff' : '#111',
                  }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6h8M7 3l3 3-3 3" stroke={isDark ? '#000' : '#fff'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/builder?tab=templates')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: isDark ? '#333' : '#888',
                    fontSize: '15px',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    padding: 0,
                  }}
                >
                  {geo.ctaSecondary}
                </button>
              </div>

              <p style={{ fontSize: '12px', color: isDark ? '#333' : '#999', marginTop: 4 }}>
                {geo.anxietyKiller}
              </p>

              <div
                style={{
                  width: '100%',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '10px',
                  marginTop: 20,
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect x="3" y="11" width="18" height="11" rx="2" stroke="white" strokeWidth="1.5" />
                  <path d="M7 11V7a5 5 0 0110 0v4" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span style={{ fontSize: '12px', fontWeight: 500, color: '#FFFFFF', letterSpacing: '0.05em' }}>
                  Secure payments via
                </span>

                <span style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 6, padding: '3px 10px', height: 26, display: 'inline-flex', alignItems: 'center', boxSizing: 'border-box' }}>
                  <svg width="36" height="16" viewBox="0 0 44 20" aria-label="Apple Pay" role="img">
                    <rect width="44" height="20" rx="4" fill="#000" />
                    <path d="M12.04 7.5c-.28-.35-.76-.65-1.25-.63-.06.58.18 1.14.47 1.48.28.34.74.6 1.21.58.08-.55-.18-1.1-.43-1.43zM14.2 13.8c-.26.38-.51.74-.92.75-.4.01-.53-.24-.99-.24-.46 0-.6.23-.98.25-.4.01-.7-.42-.96-.8-.53-.77-.93-2.17-.38-3.12.27-.47.75-.76 1.27-.77.38-.01.74.26.97.26.23 0 .67-.32 1.13-.27.19.01.73.08 1.08.58-.03.02-.64.38-.63 1.12.01.89.79 1.18.8 1.19-.01.03-.12.42-.39.79z" fill="#fff" />
                    <text x="17" y="14" fill="#fff" fontFamily="Arial, sans-serif" fontSize="10" fontWeight="600">Pay</text>
                  </svg>
                </span>
                <span style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 6, padding: '3px 10px', height: 26, display: 'inline-flex', alignItems: 'center', boxSizing: 'border-box' }}>
                  <img src="/ziina-logo.png" alt="Ziina" style={{ height: 14, width: 'auto', display: 'block' }} />
                </span>
                <span style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 6, padding: '3px 10px', height: 26, display: 'inline-flex', alignItems: 'center', boxSizing: 'border-box' }}>
                  <svg width="36" height="16" viewBox="0 0 44 20" aria-label="Visa" role="img">
                    <rect width="44" height="20" rx="3" fill="#1A1F71" />
                    <text x="22" y="14" fill="#fff" fontFamily="Arial, sans-serif" fontSize="10" fontWeight="900" textAnchor="middle" letterSpacing="1">VISA</text>
                  </svg>
                </span>
                <span style={{ background: '#1A1A1A', border: '1px solid #2A2A2A', borderRadius: 6, padding: '3px 10px', height: 26, display: 'inline-flex', alignItems: 'center', boxSizing: 'border-box' }}>
                  <svg width="36" height="16" viewBox="0 0 44 20" aria-label="Mastercard" role="img">
                    <circle cx="17" cy="10" r="7" fill="#EB001B" />
                    <circle cx="27" cy="10" r="7" fill="#F79E1B" fillOpacity="0.85" />
                  </svg>
                </span>

                <span style={{ color: '#444', fontSize: 14 }}>·</span>
                <span style={{ fontSize: '12px', fontWeight: 500, color: '#A0A0A0' }}>
                  Operated by JMK, Dubai UAE 🇦🇪
                </span>
              </div>
            </div>

            {/* Right — Bento cards (desktop only) */}
            <div className="lp-hero-right-bento">
              <BentoCardYourCV />
              <div style={{ display: 'flex', gap: 10 }}>
                <BentoCardGuideFlow />
                <BentoCardATSCheck />
              </div>
            </div>
          </div>
        </section>

        <section className="lp-sec lp-proof">
          <h2 className="lp-proof-statement">
            {geo.proof}
          </h2>
        </section>

        {/* ── FEATURES (Task 6) ──────────────────────────────────── */}
        <section
          id="lp-features"
          className="lp-feature-section-bleed"
          style={{
            background: isDark ? '#0A0A0A' : '#F5F5F0',
            color: T.textPrimary,
            maxWidth: 'none',
            margin: 0,
          }}
        >
          <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
            <p style={{ fontSize: '11px', letterSpacing: '3px', color: T.textSecondary, fontWeight: '700', textTransform: 'uppercase', marginBottom: '12px', textAlign: 'center' }}>
              Everything in one place
            </p>
            <h2 style={{
              fontSize: 'clamp(22px, 4vw, 32px)',
              fontWeight: '800',
              letterSpacing: '-0.5px',
              marginBottom: '28px',
              color: T.textPrimary,
              fontFamily: "'DM Sans', sans-serif",
              textAlign: 'center',
            }}>
              Built for Gulf job seekers
            </h2>
            <div className="lp-feature-grid-desktop">
              {FEATURE_CARDS.map((card) => (
                <button
                  key={card.eyebrow}
                  type="button"
                  className="lp-card"
                  onClick={() => navigate(card.route)}
                  style={{
                    background: isDark ? '#141414' : '#FFFFFF',
                    border: `1px solid ${isDark ? '#2A2A2A' : '#E0E0E0'}`,
                    borderRadius: '16px',
                    padding: '24px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <BeamBorder color={`${card.iconColor}66`} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10,
                      background: `${card.iconColor}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {card.icon}
                    </div>
                    <p style={{ fontSize: '10px', letterSpacing: '1px', color: T.textSecondary, textTransform: 'uppercase', margin: 0, fontWeight: '600' }}>
                      {card.eyebrow}
                    </p>
                  </div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: T.textPrimary, margin: '0 0 8px', lineHeight: 1.3 }}>
                    {card.title}
                  </h3>
                  <p style={{ fontSize: 13, color: T.textSecondary, margin: 0, lineHeight: 1.55 }}>
                    {card.desc}
                  </p>
                  <span
                    className="lp-feature-cta"
                    style={{
                      display: 'inline-block',
                      marginTop: 14,
                      fontSize: 12,
                      fontWeight: 600,
                      color: card.iconColor,
                    }}
                  >
                    Try it free &rarr;
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section id="templates" className="lp-sec lp-templates">
          <h2 className="lp-section-title">
            See what your CV will look like
          </h2>
          <p className="lp-section-sub">
            Professionally designed, ATS-friendly layouts. Tap to preview.
          </p>

          {/* Mobile: scrolling marquee */}
          <div className="lp-templates-mobile-only">
            <LandingTemplateMarquee />
          </div>

          {/* Desktop: static row of 5 */}
          <div className="lp-templates-desktop-only">
            <div className="lp-templates-desktop-grid">
              {LP_TEMPLATE_STRIP.slice(0, 5).map((t) => (
                <div key={t.name} className="lp-templates-desktop-card">
                  <LandingTemplateThumb template={t.template} />
                  <div className="lp-templates-desktop-card-frost" />
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => navigate('/builder?tab=templates')}
              style={{
                display: 'inline-block',
                marginTop: 24,
                background: 'none',
                border: 'none',
                fontSize: 14,
                fontWeight: 600,
                color: T.textPrimary,
                cursor: 'pointer',
                fontFamily: 'inherit',
                borderBottom: `1px solid ${T.border}`,
                padding: 0,
              }}
            >
              Explore Gulf-ready templates &rarr;
            </button>
          </div>

          {/* Mobile CTA */}
          <div className="lp-templates-mobile-only" style={{ paddingLeft: 24, paddingRight: 24, marginTop: 16 }}>
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
              Browse all templates &rarr;
            </Link>
          </div>
        </section>

        {/* ── MINI TOOLS TEASER (bento · links to /tools suite) ──── */}
        <section
          className="lp-mini-tools"
          aria-label="Free GCC career tools"
          style={{
            background:    '#070707',
            borderTop:     `1px solid ${T.border}`,
            borderBottom:  `1px solid ${T.border}`,
            padding:       '72px 24px',
          }}
        >
          <style>{MINI_TOOL_CSS}</style>
          <style>{`
            .lp-mini-tools-wrap { max-width: 1200px; margin: 0 auto; }
            .lp-mini-tools-head { text-align: center; margin-bottom: 44px; }
            .lp-mini-tools-eyebrow-line { display: inline-flex; align-items: center; gap: 12px; margin-bottom: 18px; }
            .lp-mini-tools-eyebrow-marker { width: 28px; height: 1px; background: linear-gradient(90deg, transparent, rgba(217,119,6,0.5), transparent); }
            .lp-mini-tools-eyebrow { font-family: 'JetBrains Mono', ui-monospace, monospace; font-size: 10.5px; font-weight: 600; color: #D97706; letter-spacing: 0.22em; }
            .lp-mini-tools-title { font-family: 'DM Sans', sans-serif; font-size: clamp(26px, 3.4vw, 40px); font-weight: 800; letter-spacing: -0.025em; line-height: 1.14; color: #fff; margin: 0 auto 14px; max-width: 760px; }
            .lp-mini-tools-sub { font-family: 'DM Sans', sans-serif; font-size: clamp(14px, 1.3vw, 16px); color: #A0A0A0; line-height: 1.5; margin: 0 auto; max-width: 560px; }
            .lp-mini-tools-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 280px)); gap: 24px; justify-content: center; align-items: stretch; }
            .lp-mini-tools-grid > * { justify-self: center; height: 100%; }
            .lp-mini-tools-ghost { display: block; text-align: center; margin: 32px auto 0; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 500; color: #6A6A6A; text-decoration: none; letter-spacing: 0.01em; transition: color 180ms cubic-bezier(0.4,0,0.2,1); }
            .lp-mini-tools-ghost:hover { color: #A0A0A0; }
            @media (max-width: 1200px) {
              .lp-mini-tools-grid { grid-template-columns: repeat(2, minmax(0, 320px)); }
            }
            @media (max-width: 880px) {
              .lp-mini-tools { padding: 56px 18px; }
              .lp-mini-tools-grid { grid-template-columns: 1fr; max-width: 360px; margin: 0 auto; }
            }
          `}</style>

          <div className="lp-mini-tools-wrap">
            <header className="lp-mini-tools-head">
              <span className="lp-mini-tools-eyebrow-line">
                <span aria-hidden className="lp-mini-tools-eyebrow-marker" />
                <span className="lp-mini-tools-eyebrow">[ POPULAR WITH INDIAN EXPATS ]</span>
                <span aria-hidden className="lp-mini-tools-eyebrow-marker" />
              </span>
              <h2 className="lp-mini-tools-title">
                Built for the answers you&rsquo;re already Googling at 2am.
              </h2>
              <p className="lp-mini-tools-sub">
                Free. No signup. GCC-tuned tools to win your next interview.
              </p>
            </header>

            <div className="lp-mini-tools-grid">
              <MiniToolCard
                to="/salary-switcher"
                glyph="₹/AED"
                title="Salary Switcher"
                snippet="Know your INR worth."
                ring="#D97706"
                bleedRGB="217,119,6"
                metric={{ type: 'text', value: 'AED 15,000 → ₹3.4L' }}
              />
              <MiniToolCard
                to="/ats"
                glyph="ATS"
                title="ATS Checker"
                snippet="Scan your CV readiness."
                ring="#378ADD"
                bleedRGB="55,138,221"
                metric={{ type: 'ring', percent: 82 }}
              />
              <MiniToolCard
                to="/linkedin-optimizer"
                glyph="in"
                title="LinkedIn Optimizer"
                snippet="Fix your UAE keywords."
                ring="#1D9E75"
                bleedRGB="29,158,117"
                metric={{ type: 'pills', items: ['KSA Market', 'Project Mgmt', 'Golden Visa'] }}
              />
              <MiniToolCard
                to="/blog"
                glyph="✎"
                title="Gulf Career Blog"
                snippet="Stories from the corridor."
                ring="#B48228"
                bleedRGB="180,130,40"
                metric={{ type: 'pills', items: ['UAE Jobs', 'ATS Tips', 'Salary'] }}
              />
            </div>

            <Link to="/tools" className="lp-mini-tools-ghost">
              Explore the full Career Lab &rarr;
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

        {/* ── TESTIMONIALS GRID (warm-lounge v2) ───────────────────── */}
        <TestimonialsGrid />

        {/* ── HOW IT WORKS ───────────────────────────────────────── */}
        <HowItWorks />

        {/* ── REJECTION REEL (live ATS feed) ─────────────────────── */}
        <RejectionReel />

        {/* ── ATS PREVIEW (The X-Ray) ─────────────────────────────── */}
        <ATSPreview />

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
            <div style={{ flex: 1 }}>
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
                onClick={() => navigate('/walkin')}
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
                Build walk-in CV &rarr;
              </button>
              <p style={{ fontSize: '12px', color: T.textSecondary }}>No signup needed</p>
            </div>

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
                    type="button"
                    onClick={() => navigate('/walkin')}
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
                    type="button"
                    onClick={() => navigate('/walkin')}
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

        {/* ── FINAL CTA ───────────────────────────────────────────── */}
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
            onClick={smartCtaAction}
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
            {smartCtaText}
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
                <p className="lp-site-footer-brand-tag">Built for South Asian job seekers in the Gulf.</p>
              </div>
              <nav className="lp-site-footer-cols" aria-label="Footer">
                <div>
                  <p className="lp-site-footer-col-h">Product</p>
                  <span className="lp-site-footer-link" style={{ cursor: 'pointer' }} onClick={() => navigate('/builder?tab=templates')}>Templates</span>
                  <span className="lp-site-footer-link" style={{ cursor: 'pointer' }} onClick={() => navigate('/builder?tab=ats')}>ATS Score</span>
                  <span className="lp-site-footer-link" style={{ cursor: 'pointer' }} onClick={() => navigate('/cover-letter')}>Cover Letter</span>
                  <span className="lp-site-footer-link" style={{ cursor: 'pointer' }} onClick={() => navigate('/walkin')}>Walk-In Mode</span>
                  <span
                    className="lp-site-footer-link"
                    style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                    onClick={() => navigate('/salary-switcher')}
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
                  </span>
                </div>
                <div>
                  <p className="lp-site-footer-col-h">Legal</p>
                  <span className="lp-site-footer-link" style={{ cursor: 'pointer' }} onClick={() => navigate('/terms')}>Terms of Service</span>
                  <span className="lp-site-footer-link" style={{ cursor: 'pointer' }} onClick={() => navigate('/privacy')}>Privacy Policy</span>
                  <span className="lp-site-footer-link" style={{ cursor: 'pointer' }} onClick={() => navigate('/refund')}>Refund Policy</span>
                </div>
                <div>
                  <p className="lp-site-footer-col-h">Support</p>
                  <span className="lp-site-footer-link" style={{ cursor: 'pointer' }} onClick={() => { window.location.href = 'mailto:support@mycvpassport.com'; }}>support@mycvpassport.com</span>
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
