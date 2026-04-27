/**
 * TemplatesSection v2 — Resume.io-density CV previews + OLED ring scores.
 *
 * Each card renders a fully-populated mini CV (profile, experience bullets,
 * skills, languages, education) for a Gulf-market persona. ATS scores are
 * shown using the OLED ring component reused from /ats — same green/amber/red
 * threshold logic, same spinning conic border. Every card also gets a
 * subtle card-level OLED conic ring on hover to visually marry it to the
 * /ats screen and the testimonials grid.
 *
 * Sectors only — no real company names.
 *
 *   import TemplatesSection from '@/components/landing/TemplatesSection';
 */
import React, { useMemo, useRef, useState } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import OLEDScoreRing, { scoreColor, scoreVerdict, OLEDRingStyles } from './OLEDScoreRing';

const FILTERS = ['All', 'Banking', 'Tech', 'Healthcare', 'Aviation', 'Hospitality', 'Finance', 'Walk-in', 'India to UAE'];

/* ────────────────────────────────────────────────────────────── */
/*  Templates                                                     */
/* ────────────────────────────────────────────────────────────── */
const TEMPLATES = [
  {
    slug: 'dubai-modern',
    name: 'Dubai Modern',
    desc: 'Editorial layout for senior marketing and brand-side roles across the UAE.',
    style: 'split',
    accent: '#D97706',
    ats: 91,
    tier: 'free',
    tags: ['Hospitality', 'Finance'],
    cv: {
      name: 'Layla Al-Hashimi',
      role: 'Senior Marketing Lead',
      location: 'Dubai, UAE',
      contact: 'layla.h@mail.com  ·  +971 50 xxx xxxx',
      profile: 'GCC-focused marketing strategist specialising in brand growth, digital campaigns, and market entry across the Middle East.',
      exp: [
        { role: 'Marketing Manager', org: 'Regional FMCG group', dates: 'Mar 2024 – Present',
          bullets: ['Led GCC brand campaigns across 3 markets', 'Grew social following by 40% in 12 months', 'Managed $500K annual marketing budget'] },
        { role: 'Brand Strategist', org: 'Regional retail client', dates: 'Dec 2021 – Mar 2024',
          bullets: ['Developed regional campaigns end-to-end', 'Delivered 3 award-winning brand launches'] },
      ],
      skills: ['Brand Strategy', 'Digital Marketing', 'SEO/SEM', 'Campaign Management', 'Adobe Suite'],
      languages: [{ en: 'Arabic', ar: 'العربية', level: 'Native' }, { en: 'English', ar: 'الإنجليزية', level: 'Fluent' }],
      education: 'BSc Marketing  ·  American University of Beirut  ·  2020',
      arabic: true,
    },
  },
  {
    slug: 'arabia-pro',
    name: 'Arabia Pro',
    desc: 'Conservative two-column format for senior finance-sector roles in the Emirates.',
    style: 'sidebar',
    accent: '#0F4C81',
    ats: 88,
    tier: 'premium',
    tags: ['Finance', 'Banking'],
    cv: {
      name: 'Ahmed Al-Mansoori',
      role: 'Finance Manager',
      location: 'Abu Dhabi, UAE',
      contact: 'a.mansoori@mail.com  ·  +971 56 xxx xxxx',
      profile: 'Qualified finance manager with 9 years across regional banking and corporate treasury — IFRS, audit, and regulatory reporting.',
      exp: [
        { role: 'Senior Finance Manager', org: 'Regional bank, GCC', dates: 'Jun 2022 – Present',
          bullets: ['Owned $120M monthly closing across 4 entities', 'Cut audit findings by 65% over two cycles', 'Led IFRS 17 implementation for the insurance arm'] },
        { role: 'Finance Manager', org: 'Tier-1 holding group', dates: 'Aug 2018 – Jun 2022',
          bullets: ['Managed treasury operations across 6 subsidiaries', 'Delivered FY budget on a 14-day timeline'] },
      ],
      skills: ['IFRS', 'SAP S/4HANA', 'Treasury', 'Audit & Compliance', 'Financial Modelling', 'Power BI'],
      languages: [{ en: 'Arabic', ar: 'العربية', level: 'Native' }, { en: 'English', ar: 'الإنجليزية', level: 'Fluent' }],
      education: 'CA · ICAI 2016  ·  BCom · University of Mumbai · 2014',
      arabic: true,
    },
  },
  {
    slug: 'banking-dubai',
    name: 'Banking Dubai',
    desc: 'For senior banking-sector roles across Dubai — keyword density tuned for screeners.',
    style: 'header-block',
    accent: '#0a3d62',
    ats: 86,
    tier: 'premium',
    tags: ['Banking', 'Finance'],
    cv: {
      name: 'Maryam Al-Suwaidi',
      role: 'Senior Banker',
      location: 'Dubai, UAE',
      contact: 'm.suwaidi@mail.com  ·  +971 55 xxx xxxx',
      profile: 'Senior banker with 11 years across corporate and SME lending in the UAE — credit underwriting, portfolio management, regulatory exposure.',
      exp: [
        { role: 'Senior Relationship Manager', org: 'Tier-1 UAE bank', dates: 'Jan 2021 – Present',
          bullets: ['Managed AED 850M corporate-banking portfolio', 'Closed 22 new mandates in FY24, +18% YoY', 'Cleared full Central Bank conduct audit, zero findings'] },
        { role: 'Credit Analyst', org: 'Regional commercial bank', dates: 'Sep 2016 – Jan 2021',
          bullets: ['Underwrote SME exposures up to AED 25M', 'Built sector heat-maps adopted across the credit team'] },
      ],
      skills: ['Credit Underwriting', 'Corporate Lending', 'Risk Analysis', 'Basel III', 'Bloomberg'],
      languages: [{ en: 'Arabic', ar: 'العربية', level: 'Native' }, { en: 'English', ar: 'الإنجليزية', level: 'Fluent' }],
      education: 'MBA Finance  ·  London Business School  ·  2016',
      arabic: true,
    },
  },
  {
    slug: 'tech-riyadh',
    name: 'Tech Riyadh',
    desc: 'Engineer-first layout with a skills-forward sidebar for the Saudi tech market.',
    style: 'sidebar',
    accent: '#0d7a4a',
    ats: 84,
    tier: 'free',
    tags: ['Tech'],
    cv: {
      name: 'Faisal Al-Otaibi',
      role: 'Senior Software Engineer',
      location: 'Riyadh, KSA',
      contact: 'f.otaibi@mail.com  ·  +966 50 xxx xxxx',
      profile: 'Backend engineer with 7 years building distributed systems for Saudi tech scale-ups — payments, identity, and high-throughput APIs.',
      exp: [
        { role: 'Senior Software Engineer', org: 'Saudi tech scale-up', dates: 'Apr 2023 – Present',
          bullets: ['Scaled payments service to 12M txns/day', 'Cut p99 latency from 480ms to 90ms', 'Mentored 4 mid-level engineers through promotion'] },
        { role: 'Software Engineer', org: 'Regional fintech', dates: 'Jul 2020 – Apr 2023',
          bullets: ['Built KYC pipeline serving 6 GCC markets', 'Owned migration from monolith to 9 services'] },
      ],
      skills: ['Go', 'Kubernetes', 'PostgreSQL', 'Kafka', 'AWS', 'Terraform', 'gRPC'],
      languages: [{ en: 'Arabic', ar: 'العربية', level: 'Native' }, { en: 'English', ar: 'الإنجليزية', level: 'Fluent' }],
      education: 'BSc Computer Science  ·  KFUPM  ·  2018',
      arabic: true,
    },
  },
  {
    slug: 'healthcare-doha',
    name: 'Healthcare Doha',
    desc: 'Credentials-first format for clinical and nursing roles across Qatar.',
    style: 'mono',
    accent: '#7c2d12',
    ats: 89,
    tier: 'free',
    tags: ['Healthcare'],
    cv: {
      name: 'Dr. Sara Al-Kubaisi',
      role: 'ICU Registered Nurse',
      location: 'Doha, Qatar',
      contact: 's.kubaisi@mail.com  ·  +974 33 xxx xxx',
      profile: 'QCHP-licensed ICU nurse with 8 years in tertiary care across Qatar and the UAE — ventilator management, sepsis protocols, code-blue lead.',
      exp: [
        { role: 'Senior Staff Nurse — ICU', org: 'Leading Qatar healthcare group', dates: 'Feb 2022 – Present',
          bullets: ['Lead nurse on 14-bed adult ICU rotation', 'Trained 9 new hires on Qatar sepsis protocol', 'Patient-fall rate reduced 32% across the unit'] },
        { role: 'Staff Nurse — Critical Care', org: 'UAE healthcare group', dates: 'May 2018 – Feb 2022',
          bullets: ['Rotated across CCU, ICU, and recovery', 'Preceptor for 6 BSN-track new graduates'] },
      ],
      skills: ['ACLS', 'BLS', 'Ventilator Mgmt', 'Sepsis Protocol', 'EMR (Cerner)', 'Triage'],
      languages: [{ en: 'Arabic', ar: 'العربية', level: 'Native' }, { en: 'English', ar: 'الإنجليزية', level: 'Fluent' }],
      education: 'BSN Nursing  ·  University of Sharjah  ·  2017  ·  QCHP licensed',
      arabic: true,
    },
  },
  {
    slug: 'aviation-gulf',
    name: 'Aviation Gulf',
    desc: 'For cabin-crew and aviation roles across the Gulf carriers.',
    style: 'header-block',
    accent: '#831843',
    ats: 82,
    tier: 'premium',
    tags: ['Aviation', 'Hospitality'],
    cv: {
      name: 'Omar Al-Rashidi',
      role: 'Senior Cabin Crew',
      location: 'Dubai, UAE',
      contact: 'o.rashidi@mail.com  ·  +971 52 xxx xxxx',
      profile: '6 years long-haul cabin-crew experience with a major GCC airline — premium cabin trained, GCAA-licensed, multilingual.',
      exp: [
        { role: 'Senior Cabin Crew', org: 'Major GCC airline', dates: 'Mar 2021 – Present',
          bullets: ['Lead cabin crew on long-haul A380 routes', 'Inflight service score 4.8/5 over 14 audits', 'Selected for the airline\u2019s premium-cabin brand campaign'] },
        { role: 'Cabin Crew', org: 'Regional Gulf carrier', dates: 'Aug 2018 – Mar 2021',
          bullets: ['Operated short-haul GCC and India sectors', 'Awarded employee of the quarter (Q3 2020)'] },
      ],
      skills: ['Premium Cabin Service', 'Safety & Emergency', 'First Aid', 'Conflict Resolution'],
      languages: [{ en: 'Arabic', ar: 'العربية', level: 'Native' }, { en: 'English', ar: 'الإنجليزية', level: 'Fluent' }, { en: 'French', level: 'Conversational' }],
      education: 'Diploma · Hospitality & Tourism  ·  Emirates Academy  ·  2018',
      arabic: true,
    },
  },
  {
    slug: 'walk-in-hospitality',
    name: 'Walk-In Hospitality',
    desc: 'One-page, walk-in-ready format for hospitality and front-of-house roles.',
    style: 'mono',
    accent: '#5b21b6',
    ats: 78,
    tier: 'free',
    tags: ['Walk-in', 'Hospitality'],
    cv: {
      name: 'Priya Sharma',
      role: 'Front Office Agent',
      location: 'Sharjah, UAE',
      contact: 'p.sharma@mail.com  ·  +971 58 xxx xxxx',
      profile: '4 years front-office experience across 5-star hospitality groups in the UAE — Opera-certified, guest-relations specialist.',
      exp: [
        { role: 'Front Office Agent', org: 'Tier-1 hospitality group', dates: 'Jan 2023 – Present',
          bullets: ['Handle 120+ daily check-ins across two shifts', 'Highest guest-survey score on the FO team (Q2/Q3 2024)', 'Cross-trained on concierge and reservations desks'] },
        { role: 'Guest Service Agent', org: '5-star UAE resort', dates: 'Sep 2021 – Jan 2023',
          bullets: ['Managed VIP arrivals and group blocks', 'Resolved guest escalations with a 96% recovery rate'] },
      ],
      skills: ['Opera PMS', 'Guest Relations', 'Front Office', 'Cash Handling', 'Concierge'],
      languages: [{ en: 'English', level: 'Fluent' }, { en: 'Hindi', level: 'Native' }, { en: 'Arabic', ar: 'العربية', level: 'Basic' }],
      education: 'Diploma · Hotel Management  ·  IHM Mumbai  ·  2021',
      arabic: false,
    },
  },
  {
    slug: 'india-to-uae',
    name: 'India to UAE',
    desc: 'Built for India-to-Gulf transitions — recruiter-readable from both sides of the move.',
    style: 'split',
    accent: '#b45309',
    ats: 85,
    tier: 'free',
    tags: ['India to UAE', 'Tech'],
    cv: {
      name: 'Rahul Sengupta',
      role: 'Senior Product Manager',
      location: 'Bangalore → Dubai',
      contact: 'r.sengupta@mail.com  ·  +91 98 xxx xxxxx',
      profile: 'Senior product manager with 8 years across Indian fintech and SaaS — payments, lending, and growth surfaces. Open to UAE relocation; valid passport, GCC visa-ready.',
      exp: [
        { role: 'Senior Product Manager', org: 'Indian fintech (Series C)', dates: 'May 2022 – Present',
          bullets: ['Owned UPI-on-credit roadmap, $9M ARR contribution', 'Shipped 2 GCC-corridor remittance flows', 'Cut onboarding drop-off by 38% in 2 quarters'] },
        { role: 'Product Manager', org: 'B2B SaaS scale-up, Bangalore', dates: 'Jul 2019 – May 2022',
          bullets: ['Launched Middle-East billing module', 'Owned activation funnel from 11% → 27%'] },
      ],
      skills: ['Product Strategy', 'Roadmapping', 'A/B Testing', 'SQL', 'Mixpanel', 'Figma'],
      languages: [{ en: 'English', level: 'Fluent' }, { en: 'Hindi', level: 'Native' }, { en: 'Bengali', level: 'Native' }],
      education: 'MBA  ·  IIM Bangalore  ·  2019  ·  BTech CSE  ·  IIT Kharagpur  ·  2014',
      arabic: false,
    },
  },
  {
    slug: 'sales-lead-uae',
    name: 'Sales Lead UAE',
    desc: 'Numbers-forward layout for senior sales and BD roles in the Emirates.',
    style: 'sidebar',
    accent: '#155e75',
    ats: 87,
    tier: 'premium',
    tags: ['Hospitality', 'Finance'],
    cv: {
      name: 'Fatima Al-Hammadi',
      role: 'Senior Sales Manager',
      location: 'Sharjah, UAE',
      contact: 'f.hammadi@mail.com  ·  +971 50 xxx xxxx',
      profile: 'Senior sales manager with 10 years in B2B SaaS and corporate hospitality across the GCC — quota-carrier, team lead, regional BD.',
      exp: [
        { role: 'Senior Sales Manager', org: 'Regional B2B SaaS', dates: 'Apr 2022 – Present',
          bullets: ['Closed AED 14M ARR in FY24, 138% of quota', 'Built and onboarded 5-person UAE BD team', 'Owned C-suite relationships across 3 GCC markets'] },
        { role: 'Account Executive', org: 'Tier-1 hospitality group', dates: 'Jan 2018 – Apr 2022',
          bullets: ['Top performer 3 of 4 years', 'Grew strategic accounts portfolio 4× over tenure'] },
      ],
      skills: ['Enterprise Sales', 'Salesforce', 'Forecasting', 'Negotiation', 'Account Management'],
      languages: [{ en: 'Arabic', ar: 'العربية', level: 'Native' }, { en: 'English', ar: 'الإنجليزية', level: 'Fluent' }],
      education: 'BBA Marketing  ·  Zayed University  ·  2014',
      arabic: true,
    },
  },
];

/* ────────────────────────────────────────────────────────────── */
/*  CV preview — renders FULL content                             */
/* ────────────────────────────────────────────────────────────── */
function CVPreview({ tpl }) {
  const { cv, style, accent, slug } = tpl;
  return (
    <div className={`cvp-cv cvp-cv--${style}`}>
      {style === 'sidebar' && <CVSidebar cv={cv} accent={accent} />}
      {style === 'header-block' && <CVHeaderBlock cv={cv} accent={accent} slug={slug} />}
      {style === 'split' && <CVSplit cv={cv} accent={accent} slug={slug} />}
      {style === 'mono' && <CVMono cv={cv} accent={accent} slug={slug} />}
    </div>
  );
}

/* Micro-detail badges — 4 templates get one small accent badge in their
   header. Polish move 2: kills the robo "same data, same rhythm" feel
   without touching the underlying template data. */
function MicroBadge({ slug, placement }) {
  if (slug === 'healthcare-doha' && placement === 'name') {
    return (
      <span className="cvp-cv-microbadge cvp-cv-microbadge--verified" title="QCHP licensed">
        <svg width="6.5" height="6.5" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path d="M2 5l2 2 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        QCHP
      </span>
    );
  }
  if (slug === 'india-to-uae' && placement === 'role') {
    return (
      <span className="cvp-cv-microbadge cvp-cv-microbadge--relocate">Open to relocate</span>
    );
  }
  if (slug === 'aviation-gulf' && placement === 'meta') {
    return (
      <span className="cvp-cv-microbadge cvp-cv-microbadge--stamp">GCC certified</span>
    );
  }
  if (slug === 'banking-dubai' && placement === 'meta') {
    return (
      <span className="cvp-cv-microbadge cvp-cv-microbadge--tier1">Tier-1 portfolio</span>
    );
  }
  return null;
}

function SecLabel({ en, ar, accent, light = false }) {
  return (
    <div className="cvp-cv-sec">
      <span className="cvp-cv-sec-en" style={light ? { color: 'rgba(255,255,255,0.94)' } : undefined}>{en}</span>
      {ar && <span className="cvp-cv-sec-ar" lang="ar" dir="rtl" style={light ? { color: 'rgba(255,255,255,0.7)' } : undefined}>{ar}</span>}
      <span className="cvp-cv-sec-rule" style={{ background: light ? 'rgba(255,255,255,0.3)' : accent }} />
    </div>
  );
}

function ExpBlock({ items, accent, light = false }) {
  return (
    <div className="cvp-cv-exp">
      {items.map((e, i) => (
        <div key={i} className="cvp-cv-exp-row">
          <div className="cvp-cv-exp-head">
            <span className="cvp-cv-exp-role" style={light ? { color: '#fff' } : undefined}>{e.role}</span>
            <span className="cvp-cv-exp-dates" style={{ color: light ? 'rgba(255,255,255,0.6)' : undefined }}>{e.dates}</span>
          </div>
          <div className="cvp-cv-exp-org" style={{ color: light ? 'rgba(255,255,255,0.7)' : accent }}>{e.org}</div>
          <ul className="cvp-cv-exp-bullets" style={light ? { color: 'rgba(255,255,255,0.78)' } : undefined}>
            {e.bullets.map((b, j) => <li key={j}>{b}</li>)}
          </ul>
        </div>
      ))}
    </div>
  );
}

function SkillsChips({ skills, accent, light = false }) {
  return (
    <div className="cvp-cv-skills">
      {skills.map((s, i) => (
        <span key={i} className="cvp-cv-skill" style={{
          color: light ? 'rgba(255,255,255,0.95)' : '#1a1d23',
          background: light ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.04)',
          borderColor: light ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.08)',
        }}>{s}</span>
      ))}
    </div>
  );
}

function LangsRow({ langs, light = false }) {
  return (
    <div className="cvp-cv-langs" style={light ? { color: 'rgba(255,255,255,0.85)' } : undefined}>
      {langs.map((l, i) => (
        <span key={i} className="cvp-cv-lang">
          <span className="cvp-cv-lang-name">{l.en}{l.ar && <span lang="ar" dir="rtl" style={{ marginLeft: 4, opacity: 0.7 }}>· {l.ar}</span>}</span>
          <span className="cvp-cv-lang-level" style={light ? { color: 'rgba(255,255,255,0.6)' } : undefined}>{l.level}</span>
        </span>
      ))}
    </div>
  );
}

/* Style: sidebar — coloured left rail with photo placeholder, skills, languages.
   No micro-detail badge for sidebar templates in this round, so slug isn't needed. */
function CVSidebar({ cv, accent }) {
  return (
    <div className="cvp-cv-sb">
      <aside className="cvp-cv-sb-side" style={{ background: accent }}>
        <div className="cvp-cv-sb-avatar" aria-hidden="true">
          <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.95)' }}>
            {cv.name.split(' ').slice(0, 2).map(n => n[0]).join('')}
          </span>
        </div>
        <div className="cvp-cv-sb-block">
          <SecLabel en="Skills" ar={cv.arabic ? 'المهارات' : null} accent={accent} light />
          <div className="cvp-cv-sb-skills">{cv.skills.slice(0, 5).map((s, i) => <div key={i}>· {s}</div>)}</div>
        </div>
        <div className="cvp-cv-sb-block">
          <SecLabel en="Languages" ar={cv.arabic ? 'اللغات' : null} accent={accent} light />
          <LangsRow langs={cv.languages} light />
        </div>
        <div className="cvp-cv-sb-block">
          <SecLabel en="Education" ar={cv.arabic ? 'التعليم' : null} accent={accent} light />
          <div style={{ fontSize: 8, lineHeight: 1.45, color: 'rgba(255,255,255,0.85)' }}>{cv.education}</div>
        </div>
      </aside>
      <main className="cvp-cv-sb-main">
        <h4 className="cvp-cv-name">{cv.name}</h4>
        <div className="cvp-cv-role" style={{ color: accent }}>{cv.role}</div>
        <div className="cvp-cv-meta">{cv.location}  ·  {cv.contact}</div>
        <SecLabel en="Profile" ar={cv.arabic ? 'الملف' : null} accent={accent} />
        <p className="cvp-cv-profile">{cv.profile}</p>
        <SecLabel en="Experience" ar={cv.arabic ? 'الخبرة' : null} accent={accent} />
        <ExpBlock items={cv.exp} accent={accent} />
      </main>
    </div>
  );
}

/* Style: header-block — solid coloured header, body below.
   Per-style polish lives in CSS via [data-style="header-block"] (denser body).
   slice(0, 8) is the spec'd skills bump for this style. */
function CVHeaderBlock({ cv, accent, slug }) {
  return (
    <div className="cvp-cv-hb">
      <header className="cvp-cv-hb-hdr" style={{ background: accent }}>
        <h4 className="cvp-cv-name" style={{ color: '#fff' }}>{cv.name}</h4>
        <div className="cvp-cv-role" style={{ color: 'rgba(255,255,255,0.86)' }}>{cv.role}</div>
        <div className="cvp-cv-meta cvp-cv-meta--row" style={{ color: 'rgba(255,255,255,0.7)' }}>
          <span>{cv.location}  ·  {cv.contact}</span>
          <MicroBadge slug={slug} placement="meta" />
        </div>
      </header>
      <main className="cvp-cv-hb-body">
        <SecLabel en="Profile" ar={cv.arabic ? 'الملف' : null} accent={accent} />
        <p className="cvp-cv-profile">{cv.profile}</p>
        <SecLabel en="Experience" ar={cv.arabic ? 'الخبرة' : null} accent={accent} />
        <ExpBlock items={cv.exp} accent={accent} />
        <div className="cvp-cv-row2">
          <div>
            <SecLabel en="Skills" ar={cv.arabic ? 'المهارات' : null} accent={accent} />
            <SkillsChips skills={cv.skills.slice(0, 8)} accent={accent} />
          </div>
          <div>
            <SecLabel en="Languages" ar={cv.arabic ? 'اللغات' : null} accent={accent} />
            <LangsRow langs={cv.languages} />
          </div>
        </div>
        <SecLabel en="Education" ar={cv.arabic ? 'التعليم' : null} accent={accent} />
        <div className="cvp-cv-edu">{cv.education}</div>
      </main>
    </div>
  );
}

/* Style: split — header w/ name left, location right, two-column body.
   Polish move 2: accent rule is now scoped under role (not full-width) so the
   editorial split style reads more like Resume.io's higher-end template feel. */
function CVSplit({ cv, accent, slug }) {
  return (
    <div className="cvp-cv-sp">
      <header className="cvp-cv-sp-hdr">
        <div className="cvp-cv-sp-hdr-l">
          <h4 className="cvp-cv-name">{cv.name}</h4>
          <div className="cvp-cv-role" style={{ color: accent }}>{cv.role}</div>
          <div className="cvp-cv-sp-role-rule" style={{ background: accent }} aria-hidden="true" />
          <MicroBadge slug={slug} placement="role" />
        </div>
        <div className="cvp-cv-sp-meta">
          <div>{cv.location}</div>
          <div style={{ color: 'rgba(0,0,0,0.45)' }}>{cv.contact}</div>
        </div>
      </header>
      <SecLabel en="Profile" ar={cv.arabic ? 'الملف' : null} accent={accent} />
      <p className="cvp-cv-profile">{cv.profile}</p>
      <div className="cvp-cv-sp-cols">
        <div>
          <SecLabel en="Experience" ar={cv.arabic ? 'الخبرة' : null} accent={accent} />
          <ExpBlock items={cv.exp} accent={accent} />
        </div>
        <div>
          <SecLabel en="Skills" ar={cv.arabic ? 'المهارات' : null} accent={accent} />
          <SkillsChips skills={cv.skills} accent={accent} />
          <SecLabel en="Languages" ar={cv.arabic ? 'اللغات' : null} accent={accent} />
          <LangsRow langs={cv.languages} />
          <SecLabel en="Education" ar={cv.arabic ? 'التعليم' : null} accent={accent} />
          <div className="cvp-cv-edu">{cv.education}</div>
        </div>
      </div>
    </div>
  );
}

/* Style: mono — single column, monochrome accent rule per section */
function CVMono({ cv, accent, slug }) {
  return (
    <div className="cvp-cv-mn">
      <div className="cvp-cv-mn-name-row">
        <h4 className="cvp-cv-name">{cv.name}</h4>
        <MicroBadge slug={slug} placement="name" />
      </div>
      <div className="cvp-cv-role" style={{ color: accent }}>{cv.role}</div>
      <div className="cvp-cv-meta">{cv.location}  ·  {cv.contact}</div>
      <div className="cvp-cv-rule" style={{ background: accent }} />
      <SecLabel en="Profile" ar={cv.arabic ? 'الملف' : null} accent={accent} />
      <p className="cvp-cv-profile">{cv.profile}</p>
      <SecLabel en="Experience" ar={cv.arabic ? 'الخبرة' : null} accent={accent} />
      <ExpBlock items={cv.exp} accent={accent} />
      <SecLabel en="Skills" ar={cv.arabic ? 'المهارات' : null} accent={accent} />
      <SkillsChips skills={cv.skills} accent={accent} />
      <SecLabel en="Languages" ar={cv.arabic ? 'اللغات' : null} accent={accent} />
      <LangsRow langs={cv.languages} />
      <SecLabel en="Education" ar={cv.arabic ? 'التعليم' : null} accent={accent} />
      <div className="cvp-cv-edu">{cv.education}</div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────── */
/*  Section                                                       */
/* ────────────────────────────────────────────────────────────── */
export default function TemplatesSection() {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const sectionRef = useRef(null);
  const inView = useInView(sectionRef, { amount: 0.15, once: true });

  const [filter, setFilter] = useState('All');
  const filtered = useMemo(
    () => filter === 'All' ? TEMPLATES : TEMPLATES.filter((t) => t.tags.includes(filter)),
    [filter]
  );

  return (
    <section ref={sectionRef} className="cvp-tpl" aria-labelledby="cvp-tpl-h">
      <OLEDRingStyles />
      <TemplatesStyles />

      <motion.header
        className="cvp-tpl-head"
        initial={reduce ? false : { opacity: 0, y: 24 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
      >
        <div className="cvp-tpl-eyebrow">Templates</div>
        <h2 id="cvp-tpl-h" className="cvp-tpl-h">
          Engineered for the <em>Gulf shortlist.</em>
        </h2>
        <p className="cvp-tpl-sub">
          ATS-tested, recruiter-approved templates for the UAE, Saudi, Qatar — and the India-to-Gulf move.
        </p>
      </motion.header>

      <div className="cvp-tpl-filters" role="tablist" aria-label="Template categories">
        {FILTERS.map((f) => (
          <button
            type="button" key={f} role="tab" aria-selected={filter === f}
            className={`cvp-tpl-chip${filter === f ? ' is-on' : ''}`}
            onClick={() => setFilter(f)}
          >{f}</button>
        ))}
      </div>

      <div className="cvp-tpl-shelf">
        <div className="cvp-tpl-shelf-fade cvp-tpl-shelf-fade-l" aria-hidden="true" />
        <div className="cvp-tpl-shelf-fade cvp-tpl-shelf-fade-r" aria-hidden="true" />
        <ol className="cvp-tpl-row">
          {filtered.length === 0 && (
            <li className="cvp-tpl-empty">No templates in this category yet — try All.</li>
          )}
          {filtered.map((tpl, i) => (
            <motion.li
              key={tpl.slug}
              className="cvp-tpl-item"
              initial={reduce ? false : { opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.08 * (i % 6), ease: [0.4, 0, 0.2, 1] }}
            >
              <div
                className="cvp-tpl-paper"
                data-style={tpl.style}
                style={{ '--ring-color': scoreColor(tpl.ats), '--accent': tpl.accent }}
              >
                <div className="cvp-tpl-accent-strip" aria-hidden="true" />
                <div className="cvp-tpl-paper-inner" aria-hidden="true">
                  <CVPreview tpl={tpl} />
                </div>
                <div className="cvp-tpl-paper-overlay">
                  <button
                    type="button"
                    className="cvp-tpl-overlay-cta"
                    onClick={() => navigate(`/builder?template=${tpl.slug}`)}
                    aria-label={`Use ${tpl.name} template — opens the builder`}
                  >
                    <span>Use this template</span>
                    <span className="cvp-tpl-overlay-cta-arrow" aria-hidden="true">→</span>
                  </button>
                </div>
              </div>

              <div className="cvp-tpl-meta">
                <div className="cvp-tpl-meta-pill cvp-tpl-meta-pill--name">
                  <h3 className="cvp-tpl-meta-name">{tpl.name}</h3>
                  <span className={`cvp-tpl-meta-tier cvp-tpl-meta-tier--${tpl.tier}`}>
                    {tpl.tier === 'free' ? 'FREE' : tpl.tier === 'premium' ? 'PREMIUM' : 'POPULAR'}
                  </span>
                </div>
                <div className="cvp-tpl-meta-pill cvp-tpl-meta-pill--score" title={`ATS ${tpl.ats} · ${scoreVerdict(tpl.ats)}`}>
                  <OLEDScoreRing score={tpl.ats} revealed={inView} size={28} showLabel={false} duration={1400} />
                  <span className="cvp-tpl-meta-score-num" style={{ color: scoreColor(tpl.ats) }}>{tpl.ats}</span>
                  <span className="cvp-tpl-meta-score-verdict">{scoreVerdict(tpl.ats)}</span>
                </div>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>

      <div className="cvp-tpl-foot">
        <button type="button" className="cvp-tpl-seeall" onClick={() => navigate('/templates')}>
          See all 18 templates <span className="cvp-tpl-seeall-arrow" aria-hidden="true">→</span>
        </button>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────── */
/*  Styles                                                        */
/* ────────────────────────────────────────────────────────────── */
function TemplatesStyles() {
  return (
    <style>{`
      .cvp-tpl {
        position: relative; max-width: 1200px; margin: 24px auto;
        padding: 140px 24px 160px;
        color: var(--color-text-primary, #fff);
        font-family: 'Inter', -apple-system, "SF Pro Display", system-ui, sans-serif;
        box-sizing: border-box;
      }
      @media (max-width: 880px) { .cvp-tpl { padding: 88px 20px 112px; } }
      .cvp-tpl-head { max-width: 720px; margin: 0 0 56px; }
      .cvp-tpl-eyebrow {
        display: inline-flex; align-items: center; gap: 10px;
        font-family: 'JetBrains Mono', ui-monospace, monospace;
        font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase;
        color: var(--color-accent, #D97706); font-weight: 600; margin-bottom: 22px;
      }
      .cvp-tpl-eyebrow::before { content: ""; width: 22px; height: 1px; background: currentColor; }
      .cvp-tpl-h {
        font-size: clamp(40px, 5.6vw, 64px); line-height: 0.96;
        letter-spacing: -0.034em; font-weight: 600; margin: 0;
        color: var(--color-text-primary, #fff); text-wrap: balance;
      }
      .cvp-tpl-h em {
        font-style: normal; font-weight: 600;
        color: rgba(255,255,255,0.42);
      }
      .cvp-tpl-sub {
        font-size: 17px; line-height: 1.55;
        color: rgba(255,255,255,0.6); margin: 22px 0 0; max-width: 56ch;
        font-weight: 400; letter-spacing: -0.005em;
      }
      .cvp-tpl-filters {
        display: flex; flex-wrap: wrap; gap: 6px; margin: 0 0 40px; padding: 5px;
        background: rgba(255,255,255,0.025); border: 1px solid rgba(255,255,255,0.06);
        border-radius: 14px; width: fit-content; max-width: 100%;
      }
      @media (max-width: 720px) {
        .cvp-tpl-filters { overflow-x: auto; flex-wrap: nowrap; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
        .cvp-tpl-filters::-webkit-scrollbar { display: none; }
      }
      .cvp-tpl-chip {
        background: transparent; border: 0; padding: 9px 14px; border-radius: 9px;
        font-family: inherit; font-size: 13px; font-weight: 500; color: rgba(255,255,255,0.62);
        cursor: pointer; white-space: nowrap; letter-spacing: -0.005em;
        transition: background-color 220ms cubic-bezier(0.4,0,0.2,1),
                    color 220ms cubic-bezier(0.4,0,0.2,1);
      }
      .cvp-tpl-chip:hover { color: #fff; background: rgba(255,255,255,0.04); }
      .cvp-tpl-chip.is-on { background: #fff; color: #0a0a0a; font-weight: 600; }
      .cvp-tpl-chip:focus-visible { outline: 2px solid var(--color-accent, #D97706); outline-offset: 2px; }

      /* ── Printed-shelf row (replaces the framed grid) ─────────── */
      .cvp-tpl-shelf {
        position: relative;
        margin: 0 -24px;
      }
      @media (max-width: 880px) { .cvp-tpl-shelf { margin: 0 -20px; } }
      .cvp-tpl-row {
        display: flex; gap: 28px;
        padding: 36px 24px 56px;
        margin: 0; list-style: none;
        overflow-x: auto; overflow-y: visible;
        scroll-snap-type: x mandatory;
        scroll-padding-inline: 24px;
        -webkit-overflow-scrolling: touch;
        scrollbar-width: none;
      }
      .cvp-tpl-row::-webkit-scrollbar { display: none; }
      @media (max-width: 880px) {
        .cvp-tpl-row { padding: 28px 20px 48px; gap: 20px; }
      }
      .cvp-tpl-shelf-fade {
        position: absolute; top: 0; bottom: 0; width: 60px; pointer-events: none; z-index: 2;
      }
      .cvp-tpl-shelf-fade-l { left: 0; background: linear-gradient(to right, var(--color-surface-00, #0A0A0A), transparent); }
      .cvp-tpl-shelf-fade-r { right: 0; background: linear-gradient(to left, var(--color-surface-00, #0A0A0A), transparent); }
      @media (max-width: 880px) { .cvp-tpl-shelf-fade { width: 36px; } }

      .cvp-tpl-item {
        flex: 0 0 360px;
        scroll-snap-align: center;
        display: flex; flex-direction: column; gap: 14px;
        min-width: 0;
      }
      @media (max-width: 640px) {
        .cvp-tpl-item { flex-basis: min(86vw, 340px); }
      }

      /* The PAPER itself is the card — no dark frame.
         box-shadow: floating depth + inner top-edge highlight (Apple Pay card feel). */
      .cvp-tpl-paper {
        position: relative;
        aspect-ratio: 8.5 / 11;
        background: #f7f5f0;
        border-radius: 12px;
        overflow: hidden;
        color: #14171d;
        isolation: isolate;
        box-shadow:
          0 24px 60px -20px rgba(0,0,0,0.6),
          inset 0 1px 0 rgba(255,255,255,0.4);
        transition:
          transform 320ms cubic-bezier(0.4,0,0.2,1),
          box-shadow 320ms cubic-bezier(0.4,0,0.2,1);
        will-change: transform;
      }
      .cvp-tpl-item:hover .cvp-tpl-paper {
        transform: translateY(-6px);
        box-shadow:
          0 36px 80px -24px rgba(0,0,0,0.72),
          0 0 0 1px rgba(217,119,6,0.35),
          inset 0 1px 0 rgba(255,255,255,0.55);
      }
      @media (prefers-reduced-motion: reduce) {
        .cvp-tpl-paper { transition: none; }
        .cvp-tpl-item:hover .cvp-tpl-paper { transform: none; }
      }

      /* 4px accent strip at top — single CSS line per template's accent. */
      .cvp-tpl-accent-strip {
        position: absolute; top: 0; left: 0; right: 0;
        height: 4px; background: var(--accent, #D97706);
        z-index: 2;
      }
      .cvp-tpl-paper-inner {
        position: absolute; inset: 0;
        padding-top: 4px; /* leave room for accent strip */
        box-sizing: border-box;
      }

      /* Hover overlay — dark wash + centred pill button */
      .cvp-tpl-paper-overlay {
        position: absolute; inset: 0; z-index: 3;
        display: flex; align-items: center; justify-content: center;
        background: rgba(0,0,0,0.55);
        backdrop-filter: blur(2px);
        -webkit-backdrop-filter: blur(2px);
        opacity: 0; pointer-events: none;
        transition: opacity 200ms cubic-bezier(0.4,0,0.2,1);
      }
      .cvp-tpl-item:hover .cvp-tpl-paper-overlay,
      .cvp-tpl-item:focus-within .cvp-tpl-paper-overlay {
        opacity: 1; pointer-events: auto;
      }
      @media (prefers-reduced-motion: reduce) {
        .cvp-tpl-paper-overlay { transition: none; }
      }
      @media (hover: none) {
        /* Touch devices: keep overlay button reachable without hover. */
        .cvp-tpl-paper-overlay {
          opacity: 1; pointer-events: auto;
          background: linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 50%);
          align-items: flex-end; padding-bottom: 18px;
          backdrop-filter: none; -webkit-backdrop-filter: none;
        }
      }
      .cvp-tpl-overlay-cta {
        display: inline-flex; align-items: center; gap: 10px;
        padding: 12px 22px;
        background: #fff; color: #0a0a0a;
        border: 0; border-radius: 999px;
        font-family: inherit; font-size: 13.5px; font-weight: 600;
        letter-spacing: -0.005em; cursor: pointer;
        box-shadow: 0 12px 28px -10px rgba(0,0,0,0.4);
        transition: transform 160ms cubic-bezier(0.4,0,0.2,1), filter 160ms cubic-bezier(0.4,0,0.2,1);
      }
      .cvp-tpl-overlay-cta:hover { filter: brightness(0.95); }
      .cvp-tpl-overlay-cta:active { transform: scale(0.97); }
      .cvp-tpl-overlay-cta:focus-visible { outline: 2px solid var(--color-accent, #D97706); outline-offset: 3px; }
      .cvp-tpl-overlay-cta-arrow {
        font-weight: 700;
        transition: transform 160ms cubic-bezier(0.4,0,0.2,1);
      }
      .cvp-tpl-overlay-cta:hover .cvp-tpl-overlay-cta-arrow { transform: translateX(3px); }

      /* ── Mini-CV typography (Inter @ ~6px base) ─────────────── */
      .cvp-cv {
        width: 100%; height: 100%; box-sizing: border-box;
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 7.6px; line-height: 1.42; color: #14171d;
        display: flex; flex-direction: column;
      }
      .cvp-cv-name { font-size: 14.4px; font-weight: 700; letter-spacing: -0.012em; margin: 0; line-height: 1.05; color: #0a0d12; }
      .cvp-cv-role { font-size: 10px; font-weight: 600; margin-top: 2px; letter-spacing: 0.005em; }
      .cvp-cv-meta { font-size: 7.2px; color: #6b6f78; margin-top: 2px; letter-spacing: 0.04em; }
      .cvp-cv-rule { width: 24px; height: 1.4px; margin: 4px 0; border-radius: 1px; }
      .cvp-cv-profile { font-size: 8px; line-height: 1.45; color: #2a2e36; margin: 2px 0 0; font-weight: 400; }

      .cvp-cv-sec {
        display: flex; align-items: baseline; gap: 4px;
        margin: 4.5px 0 2px;
      }
      .cvp-cv-sec-en { font-size: 7.4px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: #0a0d12; }
      .cvp-cv-sec-ar { font-size: 8px; font-weight: 500; color: #6b6f78; opacity: 0.85; }
      .cvp-cv-sec-rule { flex: 1; height: 0.7px; opacity: 0.55; margin-left: 4px; align-self: center; }

      .cvp-cv-exp { display: flex; flex-direction: column; gap: 2.5px; }
      .cvp-cv-exp-row { display: flex; flex-direction: column; gap: 0.6px; }
      .cvp-cv-exp-head { display: flex; justify-content: space-between; align-items: baseline; gap: 6px; }
      .cvp-cv-exp-role { font-size: 8.2px; font-weight: 600; color: #14171d; }
      .cvp-cv-exp-dates { font-size: 7px; color: #6b6f78; font-variant-numeric: tabular-nums; flex-shrink: 0; letter-spacing: 0.02em; }
      .cvp-cv-exp-org { font-size: 7.4px; font-weight: 500; }
      .cvp-cv-exp-bullets { margin: 2px 0 0; padding-left: 0; list-style: none; font-size: 7.2px; line-height: 1.5; color: #2a2e36; }
      .cvp-cv-exp-bullets li { padding-left: 8px; position: relative; margin-bottom: 0.6px; }
      .cvp-cv-exp-bullets li::before { content: "·"; position: absolute; left: 0; color: #9aa0aa; font-weight: 700; }

      .cvp-cv-skills { display: flex; flex-wrap: wrap; gap: 2px; margin-top: 1.5px; }
      .cvp-cv-skill {
        font-size: 7px; font-weight: 500; padding: 2px 6px;
        border-radius: 2px; border: 0.5px solid rgba(0,0,0,0.08);
      }

      .cvp-cv-langs { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 2px; font-size: 7.4px; }
      .cvp-cv-lang { display: inline-flex; gap: 3px; align-items: baseline; }
      .cvp-cv-lang-name { font-weight: 600; color: #14171d; }
      .cvp-cv-lang-level { color: #6b6f78; font-style: italic; }

      .cvp-cv-edu { font-size: 7.4px; color: #2a2e36; margin-top: 2px; line-height: 1.4; }

      /* style variants */
      .cvp-cv--sidebar { padding: 0; flex-direction: row; }
      .cvp-cv-sb { display: flex; width: 100%; height: 100%; }
      .cvp-cv-sb-side {
        width: 36%; padding: 16px 12px; color: #fff;
        display: flex; flex-direction: column; gap: 6px;
      }
      .cvp-cv-sb-avatar {
        width: 30px; height: 30px; border-radius: 50%;
        background: rgba(255,255,255,0.16); border: 0.8px solid rgba(255,255,255,0.32);
        display: grid; place-items: center; flex-shrink: 0;
      }
      .cvp-cv-sb-block { display: flex; flex-direction: column; gap: 1.5px; }
      .cvp-cv-sb-skills { font-size: 7.2px; line-height: 1.55; color: rgba(255,255,255,0.92); }
      .cvp-cv-sb-main { flex: 1; padding: 16px 14px; min-width: 0; display: flex; flex-direction: column; }

      .cvp-cv--header-block { padding: 0; }
      .cvp-cv-hb { display: flex; flex-direction: column; height: 100%; }
      .cvp-cv-hb-hdr { padding: 16px 18px 14px; }
      .cvp-cv-hb-body { padding: 14px 18px 18px; flex: 1; }
      .cvp-cv-row2 { display: grid; grid-template-columns: 1.1fr 1fr; gap: 8px; }

      .cvp-cv--split { padding: 16px 18px; }
      .cvp-cv-sp { display: flex; flex-direction: column; height: 100%; }
      .cvp-cv-sp-hdr { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
      .cvp-cv-sp-meta { text-align: right; font-size: 7.4px; color: #6b6f78; line-height: 1.45; flex-shrink: 0; }
      .cvp-cv-sp-cols { display: grid; grid-template-columns: 1.5fr 1fr; gap: 9px; margin-top: 2px; }

      .cvp-cv--mono { padding: 16px 18px; }
      .cvp-cv-mn { display: flex; flex-direction: column; height: 100%; }

      /* ── Meta pills under each paper card (move 1 — meta below) ── */
      .cvp-tpl-meta {
        display: flex; align-items: center; gap: 10px;
        flex-wrap: wrap;
      }
      .cvp-tpl-meta-pill {
        display: inline-flex; align-items: center; gap: 8px;
        padding: 7px 12px;
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.07);
        border-radius: 999px;
        min-width: 0;
      }
      .cvp-tpl-meta-pill--name { flex: 1 1 auto; }
      .cvp-tpl-meta-name {
        font-size: 14.5px; font-weight: 600; letter-spacing: -0.012em;
        margin: 0; color: #fff; line-height: 1.2;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .cvp-tpl-meta-tier {
        flex-shrink: 0;
        font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase;
        padding: 2px 7px; border-radius: 3px; font-weight: 700;
        font-family: 'JetBrains Mono', ui-monospace, monospace;
      }
      .cvp-tpl-meta-tier--free    { background: rgba(29,158,117,0.16);  color: #6ee7b7; }
      .cvp-tpl-meta-tier--premium { background: rgba(217,119,6,0.16);   color: #fde68a; }
      .cvp-tpl-meta-tier--popular { background: rgba(217,119,6,0.16);   color: #fde68a; }

      .cvp-tpl-meta-pill--score { flex-shrink: 0; padding: 4px 12px 4px 4px; gap: 8px; }
      .cvp-tpl-meta-score-num {
        font-size: 13px; font-weight: 700; line-height: 1;
        font-variant-numeric: tabular-nums; letter-spacing: -0.01em;
      }
      .cvp-tpl-meta-score-verdict {
        font-size: 10.5px; font-weight: 500; letter-spacing: 0.04em;
        color: rgba(255,255,255,0.55);
      }

      /* ── Move 2: 4 micro-detail badges (rendered inside the cream paper) ── */
      .cvp-cv-microbadge {
        display: inline-flex; align-items: center; gap: 4px;
        padding: 2px 6px; border-radius: 3px;
        font-size: 6.8px; font-weight: 700; letter-spacing: 0.06em;
        text-transform: uppercase;
        font-family: 'Inter', system-ui, sans-serif;
        line-height: 1.2;
        flex-shrink: 0;
      }
      .cvp-cv-microbadge--verified { background: rgba(29,158,117,0.16); color: #0d7a4a; }
      .cvp-cv-microbadge--relocate { background: rgba(217,119,6,0.16);  color: #92400e; align-self: flex-start; margin-top: 2px; }
      .cvp-cv-microbadge--stamp    { background: rgba(255,255,255,0.16); color: rgba(255,255,255,0.92); border: 0.6px dashed rgba(255,255,255,0.5); }
      .cvp-cv-microbadge--tier1    { background: rgba(255,255,255,0.16); color: rgba(255,255,255,0.92); }

      /* Header-block meta row supports an inline badge to the right of location/contact. */
      .cvp-cv-meta--row {
        display: flex; align-items: baseline; justify-content: space-between;
        gap: 6px; flex-wrap: wrap;
      }
      /* Mono-style name row holds the verified chip beside the name. */
      .cvp-cv-mn-name-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
      /* Split-style left column holds name, role, accent-rule-under-role, and badge. */
      .cvp-cv-sp-hdr-l { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
      .cvp-cv-sp-role-rule { width: 22px; height: 1.2px; margin: 3px 0 0; border-radius: 1px; }

      /* ── Move 2: per-style hierarchy variation via [data-style="..."] ── */
      /* Split (dubai-modern, india-to-uae) — editorial: bigger name, more top whitespace. */
      .cvp-tpl-paper[data-style="split"] .cvp-cv--split { padding: 22px 18px 16px; }
      .cvp-tpl-paper[data-style="split"] .cvp-cv-name { font-size: 16px; }

      /* Sidebar (arabia-pro, tech-riyadh, sales-lead-uae) — corporate: bigger initials avatar with white ring. */
      .cvp-tpl-paper[data-style="sidebar"] .cvp-cv-sb-avatar {
        width: 36px; height: 36px;
        border: 1px solid rgba(255,255,255,0.85);
        background: rgba(255,255,255,0.18);
        margin-bottom: 4px;
      }
      .cvp-tpl-paper[data-style="sidebar"] .cvp-cv-sb-avatar > span { font-size: 13px !important; font-weight: 700 !important; color: #fff !important; }

      /* Header-block (banking-dubai, aviation-gulf) — denser body with consistent rhythm. */
      .cvp-tpl-paper[data-style="header-block"] .cvp-cv-hb-body {
        display: flex; flex-direction: column; gap: 6px;
      }
      .cvp-tpl-paper[data-style="header-block"] .cvp-cv-hb-body > .cvp-cv-sec { margin: 0; }
      .cvp-tpl-paper[data-style="header-block"] .cvp-cv-hb-body > .cvp-cv-profile { margin: 0; }
      .cvp-tpl-paper[data-style="header-block"] .cvp-cv-hb-body > .cvp-cv-edu { margin: 0; }

      .cvp-tpl-foot { display: flex; justify-content: center; margin-top: 56px; }
      .cvp-tpl-seeall {
        background: transparent; border: 0; padding: 0; color: rgba(255,255,255,0.5);
        font-family: inherit; font-size: 14.5px; font-weight: 500; cursor: pointer; letter-spacing: -0.005em;
        transition: color 200ms cubic-bezier(0.4,0,0.2,1);
      }
      .cvp-tpl-seeall:hover { color: #fff; }
      .cvp-tpl-seeall:focus-visible { outline: 2px solid var(--color-accent, #D97706); outline-offset: 3px; border-radius: 4px; }
      .cvp-tpl-seeall-arrow { margin-left: 6px; color: var(--color-accent, #D97706); font-weight: 700; }
      .cvp-tpl-empty {
        flex: 1; padding: 56px 24px; text-align: center;
        color: rgba(255,255,255,0.5); font-size: 14px;
        border: 1px dashed rgba(255,255,255,0.10); border-radius: 16px;
        list-style: none;
      }
    `}</style>
  );
}
