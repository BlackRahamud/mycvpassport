import React, { useEffect, useMemo, useState } from 'react';
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  animate,
} from 'framer-motion';
import {
  Search,
  MapPin,
  Briefcase,
  Banknote,
  Sparkles,
  ChevronDown,
  Check,
  X,
  ArrowRight,
  Bookmark,
  SkipForward,
  Activity,
  Building2,
  Clock,
  Compass,
  ArrowUpRight,
} from 'lucide-react';

/* =====================================================================
   ScoutDashboard — Pro-only feature, static UI prototype
   - Self-contained: scoped <style> block uses CVPassport design tokens
   - Tailwind not installed in this project; CSS vars match styles.css
   - Reference layout (Eclipse 3-col) used for structure only — palette,
     typography and motion are bespoke for the CVPassport dark system
   ===================================================================== */

const JOBS = [
  {
    id: 'j1',
    company: 'Marina Logistics Co.',
    initials: 'ML',
    role: 'IT Support Specialist',
    location: 'Dubai · DIFC',
    salary: 'AED 9,500 – 12,000',
    salaryNote: '/month',
    posted: '6h ago',
    score: 92,
    state: 'direct',
    summary:
      'Front-line desktop, O365 and AD support for a 600-seat logistics HQ. Hybrid, 4 days on-site.',
    skills: ['Active Directory', 'Office 365', 'ITIL v4', 'Windows 11', 'JIRA'],
    skillsMatched: 9,
    skillsTotal: 10,
    breakdown: { Skills: 95, Experience: 90, Location: 100, Salary: 82 },
    why:
      'Your four years on a service desk plus your Office 365 admin chops map almost one-to-one. DIFC is a 12-minute walk from your stated home location.',
    cvTweaks: [
      {
        field: 'Headline',
        before: 'IT Support Engineer',
        after: 'IT Support Specialist · Office 365 + Active Directory',
      },
      {
        field: 'Top skills (reorder)',
        before: 'Windows · Networking · O365',
        after: 'Office 365 · Active Directory · ITIL v4',
      },
    ],
    keywords: {
      present: ['Office 365', 'Active Directory', 'ITIL', 'Windows 11', 'Service Desk'],
      missing: ['Intune', 'Azure AD'],
    },
  },
  {
    id: 'j2',
    company: 'Cobalt Insurance',
    initials: 'CI',
    role: 'Service Desk Analyst',
    location: 'Dubai · Business Bay',
    salary: 'AED 8,000 – 10,500',
    salaryNote: '/month',
    posted: '11h ago',
    score: 88,
    state: 'direct',
    summary:
      'L1/L2 ticket queue for a regional insurer. Strong ITIL culture, clear escalation paths, room to grow into infra.',
    skills: ['ITIL', 'Service Desk', 'Ticketing', 'Remote Support', 'O365'],
    skillsMatched: 8,
    skillsTotal: 10,
    breakdown: { Skills: 90, Experience: 88, Location: 92, Salary: 80 },
    why:
      'Your ticket-handling volume in your last role exceeds their stated SLA. Insurance domain language is missing from your CV — easy fix.',
    cvTweaks: [
      {
        field: 'Domain language',
        before: 'Supported business users',
        after: 'Supported underwriters and claims teams across two regions',
      },
      {
        field: 'Metric',
        before: 'High ticket volume',
        after: 'Closed 220+ tickets / month at 96% SLA',
      },
    ],
    keywords: {
      present: ['ITIL', 'Service Desk', 'O365', 'Remote Support'],
      missing: ['Insurance', 'Underwriting workflows', 'Compliance'],
    },
  },
  {
    id: 'j3',
    company: 'Atlas Retail Group',
    initials: 'AR',
    role: 'Systems Support Engineer',
    location: 'Dubai · Al Quoz',
    salary: 'AED 12,000 – 15,000',
    salaryNote: '/month',
    posted: '1d ago',
    score: 76,
    state: 'stretch',
    summary:
      'Mid-level role bridging support and sysadmin for a 30-store retail group. POS, networking, light scripting.',
    skills: ['Networking', 'PowerShell', 'POS Systems', 'Linux', 'VPN'],
    skillsMatched: 6,
    skillsTotal: 10,
    breakdown: { Skills: 72, Experience: 70, Location: 88, Salary: 90 },
    why:
      'A reach — they want one year of scripting you don\'t have on paper. Your home-lab automation work would close that gap if you surface it.',
    cvTweaks: [
      {
        field: 'New section',
        before: '(missing)',
        after: 'Personal projects: PowerShell automation for AD user provisioning',
      },
      {
        field: 'Skills add',
        before: 'Networking, VPN',
        after: 'Networking, VPN, PowerShell scripting, basic Linux',
      },
    ],
    keywords: {
      present: ['Networking', 'VPN', 'POS Systems'],
      missing: ['PowerShell', 'Bash', 'Linux server administration'],
    },
  },
  {
    id: 'j4',
    company: 'Helix Manufacturing',
    initials: 'HX',
    role: 'IT Operations Lead',
    location: 'Dubai · Jebel Ali',
    salary: 'AED 16,000 – 20,000',
    salaryNote: '/month',
    posted: '2d ago',
    score: 71,
    state: 'stretch',
    summary:
      'A jump role. Leads a small ops team across two plants. They need someone ready to manage two reports.',
    skills: ['Team Leadership', 'ITIL', 'Vendor Mgmt', 'Networking', 'O365'],
    skillsMatched: 6,
    skillsTotal: 11,
    breakdown: { Skills: 70, Experience: 60, Location: 75, Salary: 95 },
    why:
      'A real stretch — you have not formally led a team. The salary delta is huge, and your vendor coordination experience is a credible bridge.',
    cvTweaks: [
      {
        field: 'Reframe',
        before: 'Senior team member',
        after: 'Informal lead — mentored 2 L1 analysts, ran weekly triage',
      },
      {
        field: 'Add metric',
        before: 'Worked with vendors',
        after: 'Owned 6 vendor contracts, reduced ticket-vendor handoff by 30%',
      },
    ],
    keywords: {
      present: ['ITIL', 'Networking', 'O365'],
      missing: ['Team management', 'Budget ownership', 'OKRs', 'KPI reporting'],
    },
  },
];

/* ---------------------------- helpers ---------------------------- */

const useViewport = () => {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1440);
  useEffect(() => {
    const onResize = () => setW(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return {
    width: w,
    isMobile: w < 768,
    isTablet: w >= 768 && w < 1180,
    isDesktop: w >= 1180,
  };
};

/* count-up score number, set in serif italic */
const ScoreNumber = ({ value, size = 28 }) => {
  const mv = useMotionValue(0);
  const display = useTransform(mv, (n) => Math.round(n));
  useEffect(() => {
    const controls = animate(mv, value, {
      duration: 1.1,
      ease: [0.16, 1, 0.3, 1],
    });
    return () => controls.stop();
  }, [value, mv]);
  return (
    <span className="scout-score-num" style={{ fontSize: size }}>
      <motion.span>{display}</motion.span>
      <span className="scout-score-pct">%</span>
    </span>
  );
};

/* horizontal bar that animates width on mount */
const Bar = ({ label, value, tone }) => {
  return (
    <div className="scout-bar-row">
      <div className="scout-bar-head">
        <span className="scout-bar-label">{label}</span>
        <span className="scout-bar-value">{value}</span>
      </div>
      <div className="scout-bar-track">
        <motion.div
          className={`scout-bar-fill scout-bar-fill--${tone}`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        />
      </div>
    </div>
  );
};

/* circular score ring, SVG */
const ScoreRing = ({ value, tone }) => {
  const r = 38;
  const c = 2 * Math.PI * r;
  const offset = useMotionValue(c);
  useEffect(() => {
    const controls = animate(offset, c - (value / 100) * c, {
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1],
    });
    return () => controls.stop();
  }, [value, c, offset]);
  const stroke = tone === 'direct' ? 'var(--scout-green)' : 'var(--scout-amber)';
  return (
    <div className="scout-ring-wrap">
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle
          cx="48"
          cy="48"
          r={r}
          stroke="var(--scout-border)"
          strokeWidth="4"
          fill="none"
        />
        <motion.circle
          cx="48"
          cy="48"
          r={r}
          stroke={stroke}
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          style={{ strokeDashoffset: offset }}
          transform="rotate(-90 48 48)"
        />
      </svg>
      <div className="scout-ring-inner">
        <ScoreNumber value={value} size={26} />
      </div>
    </div>
  );
};

/* ---------------------------- sidebar ---------------------------- */

const PreferencesSidebar = ({ onRunScout, scanning }) => {
  const [salary, setSalary] = useState(10000);

  return (
    <motion.aside
      className="scout-sidebar"
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="scout-sidebar-head">
        <div className="scout-brand">
          <Compass size={18} strokeWidth={1.6} />
          <span className="scout-brand-word">Scout</span>
        </div>
        <p className="scout-sidebar-sub">
          Tell Scout what you want. It searches the corridor at 4&nbsp;AM Gulf time and
          comes back with a shortlist.
        </p>
      </div>

      <div className="scout-form">
        <Field icon={<Briefcase size={14} strokeWidth={1.6} />} label="Role">
          <input
            className="scout-input"
            defaultValue="IT Support / Service Desk"
          />
        </Field>

        <Field icon={<MapPin size={14} strokeWidth={1.6} />} label="Location">
          <select className="scout-input scout-select">
            <option>Dubai, UAE</option>
            <option>Abu Dhabi, UAE</option>
            <option>Riyadh, KSA</option>
            <option>Doha, Qatar</option>
          </select>
        </Field>

        <Field icon={<Activity size={14} strokeWidth={1.6} />} label="Experience">
          <select className="scout-input scout-select">
            <option>Mid (3-5 years)</option>
            <option>Junior (0-2 years)</option>
            <option>Senior (6-10 years)</option>
          </select>
        </Field>

        <Field
          icon={<Banknote size={14} strokeWidth={1.6} />}
          label={
            <span className="scout-salary-head">
              <span>Min salary</span>
              <span className="scout-salary-num">
                AED&nbsp;{salary.toLocaleString()}
              </span>
            </span>
          }
        >
          <div className="scout-slider-wrap">
            <input
              type="range"
              min="5000"
              max="25000"
              step="500"
              value={salary}
              onChange={(e) => setSalary(Number(e.target.value))}
              className="scout-slider"
            />
            <div className="scout-slider-ticks">
              <span>5k</span>
              <span>15k</span>
              <span>25k</span>
            </div>
          </div>
        </Field>
      </div>

      <motion.button
        type="button"
        className={`scout-run ${scanning ? 'is-scanning' : ''}`}
        onClick={onRunScout}
        whileHover={{ y: -1 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.15 }}
      >
        <span className="scout-run-glow" aria-hidden="true" />
        <span className="scout-run-inner">
          <Sparkles size={15} strokeWidth={1.8} />
          {scanning ? 'Scout is searching…' : 'Run Scout now'}
        </span>
      </motion.button>

      <div className="scout-stats">
        <div className="scout-stats-head">
          <span>Today&apos;s haul</span>
          <span className="scout-live">
            <span className="scout-live-dot" />
            live
          </span>
        </div>
        <div className="scout-stats-grid">
          <Stat n="4" l="matches" />
          <Stat n="2" l="direct" tone="green" />
          <Stat n="2" l="stretch" tone="amber" />
          <Stat n="82%" l="avg fit" />
        </div>
        <div className="scout-stats-foot">
          <Clock size={11} strokeWidth={1.6} />
          Last sweep · 2h ago
        </div>
      </div>
    </motion.aside>
  );
};

const Field = ({ icon, label, children }) => (
  <label className="scout-field">
    <span className="scout-field-label">
      {icon}
      {label}
    </span>
    {children}
  </label>
);

const Stat = ({ n, l, tone }) => (
  <div className={`scout-stat ${tone ? `scout-stat--${tone}` : ''}`}>
    <span className="scout-stat-n">{n}</span>
    <span className="scout-stat-l">{l}</span>
  </div>
);

/* ---------------------------- job card ---------------------------- */

const JobCard = ({ job, active, onClick, index }) => {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={`scout-card scout-card--${job.state} ${
        active ? 'is-active' : ''
      }`}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: 0.15 + index * 0.07,
        ease: [0.16, 1, 0.3, 1],
      }}
      whileHover={{ y: -2 }}
    >
      <div className="scout-card-glow" aria-hidden="true" />

      <div className="scout-card-head">
        <div className="scout-company">
          <div className={`scout-logo scout-logo--${job.state}`}>
            {job.initials}
          </div>
          <div className="scout-company-meta">
            <div className="scout-company-name">{job.company}</div>
            <div className="scout-company-sub">
              <Building2 size={11} strokeWidth={1.6} />
              {job.location}
              <span className="scout-dot" />
              <Clock size={11} strokeWidth={1.6} />
              {job.posted}
            </div>
          </div>
        </div>

        <div className="scout-score-block">
          <div className={`scout-state-pip scout-state-pip--${job.state}`}>
            <span className="scout-pip-dot" />
            {job.state === 'direct' ? 'Direct match' : 'Stretch match'}
          </div>
          <ScoreNumber value={job.score} size={32} />
        </div>
      </div>

      <h3 className="scout-card-role">{job.role}</h3>
      <p className="scout-card-summary">{job.summary}</p>

      <div className="scout-card-meta">
        <div className="scout-salary">
          <Banknote size={13} strokeWidth={1.6} />
          {job.salary}
          <span className="scout-salary-note">{job.salaryNote}</span>
        </div>
        <div className="scout-skill-fit">
          {job.skillsMatched}/{job.skillsTotal} skills
        </div>
      </div>

      <div className="scout-skill-row">
        {job.skills.slice(0, 4).map((s) => (
          <span key={s} className="scout-skill">
            {s}
          </span>
        ))}
        {job.skills.length > 4 && (
          <span className="scout-skill scout-skill--more">
            +{job.skills.length - 4}
          </span>
        )}
      </div>

      <div className="scout-card-foot">
        <span className="scout-card-foot-cta">
          View match
          <ArrowRight size={13} strokeWidth={1.8} />
        </span>
      </div>
    </motion.button>
  );
};

/* ---------------------------- detail panel ---------------------------- */

const DetailPanel = ({ job, onClose, isOverlay }) => {
  if (!job) {
    return (
      <div className="scout-detail-empty">
        <div className="scout-empty-mark">
          <Compass size={28} strokeWidth={1.4} />
        </div>
        <h4>Pick a match to open the dossier</h4>
        <p>
          Scout will lay out the breakdown, the CV tweaks, and the ATS keywords
          for any job you click.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      key={job.id}
      className="scout-detail"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ type: 'spring', stiffness: 240, damping: 28, mass: 0.6 }}
    >
      <div className="scout-detail-head">
        <div className="scout-detail-head-left">
          <div className={`scout-state-pip scout-state-pip--${job.state}`}>
            <span className="scout-pip-dot" />
            {job.state === 'direct' ? 'Direct match' : 'Stretch match'}
          </div>
          <h2 className="scout-detail-role">{job.role}</h2>
          <div className="scout-detail-meta">
            <span>{job.company}</span>
            <span className="scout-dot" />
            <span>{job.location}</span>
            <span className="scout-dot" />
            <span>{job.salary}</span>
          </div>
        </div>
        <ScoreRing value={job.score} tone={job.state} />
        {isOverlay && (
          <button
            type="button"
            className="scout-detail-close"
            onClick={onClose}
            aria-label="Close detail"
          >
            <X size={16} strokeWidth={1.8} />
          </button>
        )}
      </div>

      <Section title="Why Scout picked this">
        <p className="scout-detail-why">{job.why}</p>
      </Section>

      <Section title="Match breakdown">
        <div className="scout-bars">
          {Object.entries(job.breakdown).map(([k, v]) => (
            <Bar
              key={k}
              label={k}
              value={v}
              tone={v >= 85 ? 'green' : v >= 70 ? 'amber' : 'dim'}
            />
          ))}
        </div>
      </Section>

      <Section title="CV tweaks Scout suggests">
        <div className="scout-tweaks">
          {job.cvTweaks.map((t, i) => (
            <motion.div
              key={i}
              className="scout-tweak"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + i * 0.08, duration: 0.4 }}
            >
              <div className="scout-tweak-field">{t.field}</div>
              <div className="scout-tweak-rows">
                <div className="scout-tweak-row scout-tweak-row--before">
                  <span className="scout-tweak-tag">before</span>
                  <span className="scout-tweak-text">{t.before}</span>
                </div>
                <div className="scout-tweak-row scout-tweak-row--after">
                  <span className="scout-tweak-tag">after</span>
                  <span className="scout-tweak-text">{t.after}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </Section>

      <Section title="ATS keywords">
        <div className="scout-kw-group">
          <div className="scout-kw-label scout-kw-label--ok">
            <Check size={11} strokeWidth={2.2} />
            Already in your CV
          </div>
          <div className="scout-kw-row">
            {job.keywords.present.map((k) => (
              <span key={k} className="scout-kw scout-kw--ok">
                {k}
              </span>
            ))}
          </div>
        </div>
        <div className="scout-kw-group">
          <div className="scout-kw-label scout-kw-label--miss">
            <X size={11} strokeWidth={2.2} />
            Missing — add these
          </div>
          <div className="scout-kw-row">
            {job.keywords.missing.map((k) => (
              <span key={k} className="scout-kw scout-kw--miss">
                {k}
              </span>
            ))}
          </div>
        </div>
      </Section>

      <div className="scout-detail-actions">
        <button type="button" className="scout-btn scout-btn--primary">
          <Sparkles size={14} strokeWidth={1.8} />
          Apply with tailored CV
          <ArrowUpRight size={14} strokeWidth={1.8} />
        </button>
        <button type="button" className="scout-btn scout-btn--ghost">
          <Bookmark size={13} strokeWidth={1.8} />
          Save
        </button>
        <button type="button" className="scout-btn scout-btn--ghost">
          <SkipForward size={13} strokeWidth={1.8} />
          Skip
        </button>
      </div>
    </motion.div>
  );
};

const Section = ({ title, children }) => (
  <section className="scout-section">
    <h5 className="scout-section-title">{title}</h5>
    {children}
  </section>
);

/* ---------------------------- root ---------------------------- */

const ScoutDashboard = () => {
  const { isDesktop, isMobile } = useViewport();
  const [selectedId, setSelectedId] = useState(isDesktop ? JOBS[0].id : null);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const sort = 'Best match';

  const selected = useMemo(
    () => JOBS.find((j) => j.id === selectedId) || null,
    [selectedId]
  );

  // load distinctive fonts (Instrument Serif italic + Geist) at runtime
  useEffect(() => {
    const id = 'scout-fonts';
    if (document.getElementById(id)) return undefined;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap';
    document.head.appendChild(link);
    return () => {
      const el = document.getElementById(id);
      if (el) el.remove();
    };
  }, []);

  // when picking a card on tablet/mobile, open the overlay
  const handleSelect = (id) => {
    setSelectedId(id);
    if (!isDesktop) setOverlayOpen(true);
  };

  const closeOverlay = () => setOverlayOpen(false);

  const runScout = () => {
    setScanning(true);
    setTimeout(() => setScanning(false), 1800);
  };

  return (
    <div className="scout-root">
      <ScoutStyle />

      {/* ambient gradient backdrop */}
      <div className="scout-ambient" aria-hidden="true">
        <div className="scout-ambient-amber" />
        <div className="scout-ambient-green" />
      </div>

      {/* top bar */}
      <header className="scout-topbar">
        <div className="scout-topbar-left">
          <div className="scout-brand scout-brand--top">
            <Compass size={16} strokeWidth={1.6} />
            <span className="scout-brand-word">Scout</span>
            <span className="scout-brand-tag">pro</span>
          </div>
          <div className="scout-topbar-status">
            <span className="scout-live-dot" />
            Last sweep · 2h ago · 4 new matches
          </div>
        </div>
        <div className="scout-topbar-right">
          <button type="button" className="scout-icon-btn" aria-label="Search">
            <Search size={15} strokeWidth={1.6} />
          </button>
          <div className="scout-avatar">JK</div>
        </div>
      </header>

      {/* shell */}
      <div className="scout-shell">
        {!isMobile && (
          <PreferencesSidebar onRunScout={runScout} scanning={scanning} />
        )}

        <main className="scout-list">
          <div className="scout-list-head">
            <div>
              <div className="scout-list-eyebrow">Tonight&apos;s shortlist</div>
              <h1 className="scout-list-title">
                <span className="scout-list-title-italic">Four</span> jobs worth your
                morning coffee
              </h1>
              <p className="scout-list-sub">
                Two direct matches you should apply to today, two stretch roles
                Scout thinks you can crack with the right CV tweaks.
              </p>
            </div>

            <div className="scout-sort">
              <span className="scout-sort-label">Sort by</span>
              <button type="button" className="scout-sort-btn">
                {sort}
                <ChevronDown size={13} strokeWidth={1.8} />
              </button>
            </div>
          </div>

          <motion.div
            className="scout-cards"
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.06 } },
            }}
          >
            {JOBS.map((j, i) => (
              <JobCard
                key={j.id}
                job={j}
                index={i}
                active={selectedId === j.id}
                onClick={() => handleSelect(j.id)}
              />
            ))}
          </motion.div>

          {/* mobile-only CTA — surfaces preferences bottom-up */}
          {isMobile && (
            <button
              type="button"
              className="scout-mobile-pref"
              onClick={runScout}
            >
              <Sparkles size={14} strokeWidth={1.8} />
              Adjust scout preferences
            </button>
          )}
        </main>

        {isDesktop && (
          <aside className="scout-detail-rail">
            <AnimatePresence mode="wait">
              <DetailPanel
                key={selected ? selected.id : 'empty'}
                job={selected}
                isOverlay={false}
              />
            </AnimatePresence>
          </aside>
        )}
      </div>

      {/* overlay modes — tablet right slide-over, mobile bottom sheet */}
      <AnimatePresence>
        {!isDesktop && overlayOpen && selected && (
          <motion.div
            className="scout-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeOverlay}
          >
            <motion.div
              className={`scout-overlay ${isMobile ? 'scout-overlay--sheet' : 'scout-overlay--rail'}`}
              initial={isMobile ? { y: '100%' } : { x: '100%' }}
              animate={isMobile ? { y: 0 } : { x: 0 }}
              exit={isMobile ? { y: '100%' } : { x: '100%' }}
              transition={{ type: 'spring', stiffness: 260, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
            >
              {isMobile && <div className="scout-sheet-grip" />}
              <DetailPanel job={selected} onClose={closeOverlay} isOverlay />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ---------------------------- styles ---------------------------- */

const ScoutStyle = () => (
  <style>{`
    .scout-root {
      --scout-bg: #0A0A0A;
      --scout-surface: #141414;
      --scout-elevated: #1C1C1C;
      --scout-elevated-2: #232323;
      --scout-border: #2A2A2A;
      --scout-border-strong: #3A3A3A;
      --scout-text: #FFFFFF;
      --scout-text-dim: #A0A0A0;
      --scout-text-faint: #6B6B6B;
      --scout-amber: #D97706;
      --scout-amber-soft: rgba(217, 119, 6, 0.10);
      --scout-amber-line: rgba(217, 119, 6, 0.32);
      --scout-amber-glow: rgba(217, 119, 6, 0.28);
      --scout-green: #1D9E75;
      --scout-green-soft: rgba(29, 158, 117, 0.10);
      --scout-green-line: rgba(29, 158, 117, 0.32);
      --scout-green-glow: rgba(29, 158, 117, 0.28);
      --scout-blue: #378ADD;
      --scout-ease: cubic-bezier(0.16, 1, 0.3, 1);
      --scout-font: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      --scout-font-display: 'Instrument Serif', 'Iowan Old Style', Georgia, serif;

      position: relative;
      min-height: 100vh;
      background: var(--scout-bg);
      color: var(--scout-text);
      font-family: var(--scout-font);
      font-size: 14px;
      line-height: 1.5;
      letter-spacing: -0.005em;
      isolation: isolate;
    }

    .scout-root *, .scout-root *::before, .scout-root *::after {
      box-sizing: border-box;
    }

    .scout-root button {
      font-family: inherit;
      cursor: pointer;
      border: 0;
      background: transparent;
      color: inherit;
      padding: 0;
    }

    /* ambient backdrop -------------------------------------------------- */
    .scout-ambient {
      position: absolute;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
      z-index: 0;
    }
    .scout-ambient-amber,
    .scout-ambient-green {
      position: absolute;
      width: 720px;
      height: 720px;
      border-radius: 50%;
      filter: blur(140px);
      opacity: 0.35;
    }
    .scout-ambient-amber {
      top: -260px;
      right: -200px;
      background: radial-gradient(circle, rgba(217,119,6,0.28), transparent 65%);
    }
    .scout-ambient-green {
      bottom: -300px;
      left: -240px;
      background: radial-gradient(circle, rgba(29,158,117,0.20), transparent 65%);
    }

    /* topbar ------------------------------------------------------------ */
    .scout-topbar {
      position: relative;
      z-index: 2;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      padding: 18px 32px;
      border-bottom: 1px solid var(--scout-border);
      background: rgba(10, 10, 10, 0.65);
      backdrop-filter: saturate(140%) blur(12px);
      -webkit-backdrop-filter: saturate(140%) blur(12px);
    }
    .scout-topbar-left {
      display: flex;
      align-items: center;
      gap: 24px;
      min-width: 0;
    }
    .scout-brand {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--scout-text);
    }
    .scout-brand-word {
      font-family: var(--scout-font-display);
      font-style: italic;
      font-size: 22px;
      letter-spacing: -0.01em;
      line-height: 1;
    }
    .scout-brand-tag {
      padding: 2px 6px;
      font-size: 9.5px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--scout-amber);
      background: var(--scout-amber-soft);
      border: 1px solid var(--scout-amber-line);
      border-radius: 999px;
      font-weight: 500;
    }
    .scout-topbar-status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--scout-text-dim);
      font-size: 12px;
      letter-spacing: 0.005em;
      padding-left: 24px;
      border-left: 1px solid var(--scout-border);
    }
    .scout-live-dot {
      width: 6px;
      height: 6px;
      background: var(--scout-green);
      border-radius: 50%;
      box-shadow: 0 0 0 0 rgba(29, 158, 117, 0.45);
      animation: scout-pulse 2.4s var(--scout-ease) infinite;
    }
    @keyframes scout-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(29, 158, 117, 0.45); }
      50% { box-shadow: 0 0 0 6px rgba(29, 158, 117, 0); }
    }
    .scout-topbar-right {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .scout-icon-btn {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--scout-text-dim);
      border: 1px solid var(--scout-border);
      background: var(--scout-surface);
      transition: color 160ms var(--scout-ease),
                  border-color 160ms var(--scout-ease);
    }
    .scout-icon-btn:hover {
      color: var(--scout-text);
      border-color: var(--scout-border-strong);
    }
    .scout-avatar {
      width: 34px;
      height: 34px;
      border-radius: 10px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.04em;
      color: #f5e9d6;
      background: linear-gradient(135deg, #3a2308 0%, #6a3d0c 100%);
      border: 1px solid var(--scout-amber-line);
    }

    /* shell ------------------------------------------------------------- */
    .scout-shell {
      position: relative;
      z-index: 1;
      display: grid;
      grid-template-columns: 280px minmax(0, 1fr) 460px;
      gap: 24px;
      padding: 28px 32px 56px;
      max-width: 1480px;
      margin: 0 auto;
      align-items: start;
    }
    @media (max-width: 1180px) {
      .scout-shell { grid-template-columns: 260px minmax(0, 1fr); }
    }
    @media (max-width: 768px) {
      .scout-shell { grid-template-columns: 1fr; padding: 20px 16px 96px; gap: 16px; }
    }

    /* sidebar ----------------------------------------------------------- */
    .scout-sidebar {
      position: sticky;
      top: 88px;
      display: flex;
      flex-direction: column;
      gap: 18px;
      padding: 22px;
      border: 1px solid var(--scout-border);
      background: linear-gradient(180deg, var(--scout-surface) 0%, #101010 100%);
      border-radius: 18px;
    }
    .scout-sidebar-head { display: flex; flex-direction: column; gap: 8px; }
    .scout-sidebar-sub {
      margin: 0;
      font-size: 12.5px;
      line-height: 1.55;
      color: var(--scout-text-dim);
    }
    .scout-form { display: flex; flex-direction: column; gap: 14px; }
    .scout-field {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .scout-field-label {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      font-size: 11px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--scout-text-dim);
      font-weight: 500;
    }
    .scout-input {
      width: 100%;
      height: 38px;
      border-radius: 10px;
      padding: 0 12px;
      font: inherit;
      font-size: 13px;
      color: var(--scout-text);
      background: var(--scout-bg);
      border: 1px solid var(--scout-border);
      transition: border-color 160ms var(--scout-ease),
                  background-color 160ms var(--scout-ease);
      outline: none;
    }
    .scout-input:focus {
      border-color: var(--scout-amber-line);
      background: #0E0E0E;
    }
    .scout-select { appearance: none; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6' fill='none'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23A0A0A0' stroke-width='1.4' stroke-linecap='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 12px center; padding-right: 28px; }
    .scout-salary-head { display: inline-flex; align-items: center; justify-content: space-between; width: 100%; gap: 8px; }
    .scout-salary-num {
      font-family: var(--scout-font-display);
      font-style: italic;
      font-size: 14px;
      color: var(--scout-text);
      letter-spacing: 0;
      text-transform: none;
    }
    .scout-slider-wrap { display: flex; flex-direction: column; gap: 6px; padding: 4px 2px 0; }
    .scout-slider {
      width: 100%;
      -webkit-appearance: none;
      appearance: none;
      background: transparent;
      height: 22px;
    }
    .scout-slider::-webkit-slider-runnable-track {
      height: 4px;
      background: linear-gradient(90deg, var(--scout-amber) 0%, var(--scout-amber) var(--p, 25%), var(--scout-border) var(--p, 25%));
      border-radius: 2px;
    }
    .scout-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: #fff;
      border: 2px solid var(--scout-amber);
      margin-top: -5px;
      box-shadow: 0 0 0 4px rgba(217, 119, 6, 0.18);
    }
    .scout-slider::-moz-range-track { height: 4px; background: var(--scout-border); border-radius: 2px; }
    .scout-slider::-moz-range-progress { height: 4px; background: var(--scout-amber); border-radius: 2px; }
    .scout-slider::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; background: #fff; border: 2px solid var(--scout-amber); }
    .scout-slider-ticks { display: flex; justify-content: space-between; font-size: 10px; color: var(--scout-text-faint); letter-spacing: 0.04em; }

    /* run scout button -------------------------------------------------- */
    .scout-run {
      position: relative;
      height: 44px;
      border-radius: 12px;
      background: var(--scout-amber);
      color: #1A0E00;
      font-weight: 600;
      font-size: 13.5px;
      letter-spacing: -0.005em;
      overflow: hidden;
      isolation: isolate;
      box-shadow:
        0 1px 0 rgba(255,255,255,0.12) inset,
        0 12px 32px -16px rgba(217,119,6,0.7),
        0 0 0 1px rgba(217,119,6,0.5);
    }
    .scout-run-inner {
      position: relative;
      z-index: 2;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      width: 100%;
      height: 100%;
      justify-content: center;
    }
    .scout-run-glow {
      position: absolute;
      inset: -1px;
      z-index: 1;
      background: conic-gradient(
        from var(--a, 0deg),
        rgba(255,255,255,0.0) 0deg,
        rgba(255,255,255,0.0) 200deg,
        rgba(255,240,210,0.55) 290deg,
        rgba(255,255,255,0.0) 360deg
      );
      opacity: 0;
      transition: opacity 240ms var(--scout-ease);
    }
    .scout-run.is-scanning .scout-run-glow {
      opacity: 1;
      animation: scout-spin 1.6s linear infinite;
    }
    @keyframes scout-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .scout-run.is-scanning .scout-run-inner {
      background: var(--scout-amber);
      margin: 1px;
      border-radius: 11px;
    }

    /* stats card -------------------------------------------------------- */
    .scout-stats {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 14px;
      border-radius: 12px;
      background: var(--scout-bg);
      border: 1px solid var(--scout-border);
    }
    .scout-stats-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--scout-text-dim);
    }
    .scout-live {
      display: inline-flex; align-items: center; gap: 5px;
      color: var(--scout-green);
      font-weight: 500;
      letter-spacing: 0.08em;
    }
    .scout-stats-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }
    .scout-stat {
      display: flex; flex-direction: column;
      padding: 8px 10px;
      border-radius: 8px;
      background: var(--scout-elevated);
      border: 1px solid var(--scout-border);
    }
    .scout-stat-n {
      font-family: var(--scout-font-display);
      font-style: italic;
      font-size: 22px;
      line-height: 1;
      color: var(--scout-text);
    }
    .scout-stat-l {
      font-size: 10.5px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--scout-text-faint);
      margin-top: 2px;
    }
    .scout-stat--green .scout-stat-n { color: var(--scout-green); }
    .scout-stat--amber .scout-stat-n { color: var(--scout-amber); }
    .scout-stats-foot {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: var(--scout-text-faint);
    }

    /* list head --------------------------------------------------------- */
    .scout-list { display: flex; flex-direction: column; gap: 18px; min-width: 0; }
    .scout-list-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 24px;
      padding: 6px 4px 0;
    }
    .scout-list-eyebrow {
      font-size: 11px;
      letter-spacing: 0.14em;
      text-transform: uppercase;
      color: var(--scout-amber);
      font-weight: 500;
      margin-bottom: 8px;
    }
    .scout-list-title {
      margin: 0;
      font-size: 28px;
      line-height: 1.15;
      font-weight: 600;
      letter-spacing: -0.02em;
      color: var(--scout-text);
      max-width: 520px;
    }
    .scout-list-title-italic {
      font-family: var(--scout-font-display);
      font-style: italic;
      font-weight: 400;
      font-size: 1.05em;
    }
    .scout-list-sub {
      margin: 8px 0 0;
      max-width: 480px;
      color: var(--scout-text-dim);
      font-size: 13px;
      line-height: 1.55;
    }
    .scout-sort {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }
    .scout-sort-label {
      font-size: 11px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--scout-text-faint);
    }
    .scout-sort-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 32px;
      padding: 0 12px;
      font-size: 12.5px;
      color: var(--scout-text);
      background: var(--scout-surface);
      border: 1px solid var(--scout-border);
      border-radius: 10px;
      transition: border-color 160ms var(--scout-ease);
    }
    .scout-sort-btn:hover { border-color: var(--scout-border-strong); }

    /* job cards --------------------------------------------------------- */
    .scout-cards { display: flex; flex-direction: column; gap: 12px; }
    .scout-card {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 14px;
      width: 100%;
      padding: 20px 22px;
      text-align: left;
      border-radius: 16px;
      background: var(--scout-surface);
      border: 1px solid var(--scout-border);
      overflow: hidden;
      transition:
        border-color 220ms var(--scout-ease),
        background-color 220ms var(--scout-ease),
        transform 220ms var(--scout-ease);
    }
    .scout-card-glow {
      position: absolute;
      inset: -1px;
      pointer-events: none;
      opacity: 0;
      transition: opacity 320ms var(--scout-ease);
      background:
        radial-gradient(420px 200px at 90% -10%, var(--scout-card-glow), transparent 60%);
    }
    .scout-card--direct { --scout-card-glow: var(--scout-green-glow); }
    .scout-card--stretch { --scout-card-glow: var(--scout-amber-glow); }
    .scout-card:hover { border-color: var(--scout-border-strong); }
    .scout-card:hover .scout-card-glow { opacity: 0.7; }
    .scout-card.is-active {
      border-color: transparent;
      background: var(--scout-elevated);
      box-shadow:
        0 0 0 1px var(--scout-card-line),
        0 18px 40px -28px rgba(0,0,0,0.9);
    }
    .scout-card.is-active .scout-card-glow { opacity: 1; }
    .scout-card--direct.is-active { --scout-card-line: var(--scout-green-line); }
    .scout-card--stretch.is-active { --scout-card-line: var(--scout-amber-line); }

    .scout-card-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 16px;
    }
    .scout-company { display: flex; align-items: center; gap: 12px; min-width: 0; }
    .scout-logo {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.04em;
      flex-shrink: 0;
    }
    .scout-logo--direct {
      color: #C8FFE7;
      background: linear-gradient(140deg, #0e3328 0%, #154a3a 100%);
      border: 1px solid var(--scout-green-line);
    }
    .scout-logo--stretch {
      color: #FFE5C2;
      background: linear-gradient(140deg, #3a2308 0%, #5a3a13 100%);
      border: 1px solid var(--scout-amber-line);
    }
    .scout-company-meta { min-width: 0; }
    .scout-company-name {
      font-size: 14px;
      font-weight: 500;
      color: var(--scout-text);
      letter-spacing: -0.005em;
    }
    .scout-company-sub {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 2px;
      font-size: 11.5px;
      color: var(--scout-text-faint);
    }
    .scout-dot {
      width: 3px; height: 3px;
      border-radius: 50%;
      background: var(--scout-text-faint);
      display: inline-block;
      flex-shrink: 0;
    }

    .scout-score-block {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 6px;
      flex-shrink: 0;
    }
    .scout-state-pip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 8px;
      border-radius: 999px;
      font-size: 10.5px;
      letter-spacing: 0.04em;
      font-weight: 500;
      border: 1px solid;
    }
    .scout-state-pip--direct {
      color: var(--scout-green);
      background: var(--scout-green-soft);
      border-color: var(--scout-green-line);
    }
    .scout-state-pip--stretch {
      color: var(--scout-amber);
      background: var(--scout-amber-soft);
      border-color: var(--scout-amber-line);
    }
    .scout-pip-dot {
      width: 5px; height: 5px;
      border-radius: 50%;
      background: currentColor;
    }
    .scout-score-num {
      font-family: var(--scout-font-display);
      font-style: italic;
      line-height: 0.95;
      color: var(--scout-text);
      letter-spacing: -0.01em;
      display: inline-flex;
      align-items: baseline;
    }
    .scout-card--direct .scout-score-num { color: var(--scout-green); }
    .scout-card--stretch .scout-score-num { color: var(--scout-amber); }
    .scout-score-pct {
      font-size: 0.45em;
      margin-left: 2px;
      font-style: italic;
      opacity: 0.8;
    }

    .scout-card-role {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      letter-spacing: -0.015em;
      color: var(--scout-text);
    }
    .scout-card-summary {
      margin: 0;
      font-size: 12.5px;
      line-height: 1.55;
      color: var(--scout-text-dim);
      max-width: 56ch;
    }
    .scout-card-meta {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      flex-wrap: wrap;
    }
    .scout-salary {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12.5px;
      color: var(--scout-text);
      font-weight: 500;
    }
    .scout-salary-note {
      color: var(--scout-text-faint);
      font-weight: 400;
      margin-left: -2px;
    }
    .scout-skill-fit {
      font-size: 11px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: var(--scout-text-faint);
    }
    .scout-skill-row {
      display: flex; flex-wrap: wrap; gap: 6px;
    }
    .scout-skill {
      padding: 4px 9px;
      font-size: 11px;
      letter-spacing: 0.005em;
      color: var(--scout-text-dim);
      background: var(--scout-elevated);
      border: 1px solid var(--scout-border);
      border-radius: 999px;
    }
    .scout-skill--more {
      color: var(--scout-text-faint);
      background: transparent;
    }
    .scout-card-foot {
      display: flex;
      justify-content: flex-end;
      align-items: center;
      margin-top: 2px;
      border-top: 1px solid var(--scout-border);
      padding-top: 12px;
    }
    .scout-card-foot-cta {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 500;
      color: var(--scout-text-dim);
      transition: color 200ms var(--scout-ease), gap 200ms var(--scout-ease);
    }
    .scout-card:hover .scout-card-foot-cta {
      color: var(--scout-text);
      gap: 9px;
    }

    /* detail panel ------------------------------------------------------ */
    .scout-detail-rail {
      position: sticky;
      top: 88px;
      max-height: calc(100vh - 108px);
      overflow-y: auto;
      border: 1px solid var(--scout-border);
      background: linear-gradient(180deg, var(--scout-surface) 0%, #101010 100%);
      border-radius: 18px;
      padding: 22px 22px 16px;
    }
    .scout-detail-rail::-webkit-scrollbar { width: 8px; }
    .scout-detail-rail::-webkit-scrollbar-thumb { background: var(--scout-border); border-radius: 4px; }
    .scout-detail-rail::-webkit-scrollbar-track { background: transparent; }

    .scout-detail-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 10px;
      padding: 64px 28px;
      color: var(--scout-text-dim);
    }
    .scout-detail-empty h4 { margin: 0; font-size: 15px; color: var(--scout-text); font-weight: 600; }
    .scout-detail-empty p { margin: 0; font-size: 12.5px; max-width: 32ch; line-height: 1.55; }
    .scout-empty-mark {
      width: 56px; height: 56px;
      border-radius: 14px;
      display: inline-flex; align-items: center; justify-content: center;
      color: var(--scout-amber);
      background: var(--scout-amber-soft);
      border: 1px solid var(--scout-amber-line);
      margin-bottom: 6px;
    }

    .scout-detail { display: flex; flex-direction: column; gap: 20px; position: relative; }
    .scout-detail-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 16px;
      border-bottom: 1px solid var(--scout-border);
      position: relative;
    }
    .scout-detail-head-left { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
    .scout-detail-role {
      margin: 4px 0 0;
      font-size: 22px;
      font-weight: 600;
      letter-spacing: -0.018em;
      color: var(--scout-text);
      line-height: 1.2;
    }
    .scout-detail-meta {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      font-size: 12px;
      color: var(--scout-text-dim);
    }
    .scout-detail-close {
      position: absolute;
      top: -4px;
      right: -4px;
      width: 30px; height: 30px;
      border-radius: 8px;
      color: var(--scout-text-dim);
      background: var(--scout-elevated);
      border: 1px solid var(--scout-border);
      display: inline-flex; align-items: center; justify-content: center;
      transition: color 160ms var(--scout-ease), border-color 160ms var(--scout-ease);
    }
    .scout-detail-close:hover { color: var(--scout-text); border-color: var(--scout-border-strong); }

    .scout-ring-wrap {
      position: relative;
      width: 96px; height: 96px;
      flex-shrink: 0;
    }
    .scout-ring-inner {
      position: absolute;
      inset: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .scout-detail .scout-ring-wrap .scout-score-num { color: var(--scout-text); }

    /* sections ---------------------------------------------------------- */
    .scout-section { display: flex; flex-direction: column; gap: 12px; }
    .scout-section-title {
      margin: 0;
      font-size: 11px;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--scout-text-faint);
      font-weight: 500;
    }
    .scout-detail-why {
      margin: 0;
      font-size: 13.5px;
      line-height: 1.6;
      color: var(--scout-text);
      letter-spacing: -0.005em;
    }

    /* breakdown bars ---------------------------------------------------- */
    .scout-bars { display: flex; flex-direction: column; gap: 10px; }
    .scout-bar-row { display: flex; flex-direction: column; gap: 6px; }
    .scout-bar-head {
      display: flex; justify-content: space-between;
      font-size: 11.5px;
      color: var(--scout-text-dim);
    }
    .scout-bar-label { letter-spacing: 0; }
    .scout-bar-value {
      font-family: var(--scout-font-display);
      font-style: italic;
      color: var(--scout-text);
      font-size: 14px;
    }
    .scout-bar-track {
      height: 6px;
      background: var(--scout-elevated);
      border-radius: 3px;
      overflow: hidden;
    }
    .scout-bar-fill { height: 100%; border-radius: 3px; }
    .scout-bar-fill--green { background: linear-gradient(90deg, #1A8264, var(--scout-green)); }
    .scout-bar-fill--amber { background: linear-gradient(90deg, #A05A04, var(--scout-amber)); }
    .scout-bar-fill--dim { background: linear-gradient(90deg, #3A3A3A, #6B6B6B); }

    /* tweaks ------------------------------------------------------------ */
    .scout-tweaks { display: flex; flex-direction: column; gap: 10px; }
    .scout-tweak {
      padding: 12px 14px;
      border-radius: 12px;
      background: var(--scout-bg);
      border: 1px solid var(--scout-border);
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .scout-tweak-field {
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--scout-text-faint);
    }
    .scout-tweak-rows { display: flex; flex-direction: column; gap: 6px; }
    .scout-tweak-row {
      display: flex; gap: 10px; align-items: flex-start;
      font-size: 12.5px; line-height: 1.55;
    }
    .scout-tweak-tag {
      flex-shrink: 0;
      padding: 1px 6px;
      font-size: 9.5px;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      border-radius: 4px;
      font-weight: 600;
      margin-top: 2px;
    }
    .scout-tweak-row--before .scout-tweak-tag { background: rgba(255,255,255,0.04); color: var(--scout-text-faint); }
    .scout-tweak-row--before .scout-tweak-text { color: var(--scout-text-dim); text-decoration: line-through; text-decoration-color: rgba(255,255,255,0.18); text-decoration-thickness: 1px; }
    .scout-tweak-row--after .scout-tweak-tag { background: var(--scout-green-soft); color: var(--scout-green); }
    .scout-tweak-row--after .scout-tweak-text { color: var(--scout-text); }

    /* keywords ---------------------------------------------------------- */
    .scout-kw-group { display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px; }
    .scout-kw-group:last-child { margin-bottom: 0; }
    .scout-kw-label {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 11px;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      font-weight: 500;
    }
    .scout-kw-label--ok { color: var(--scout-green); }
    .scout-kw-label--miss { color: var(--scout-amber); }
    .scout-kw-row { display: flex; flex-wrap: wrap; gap: 6px; }
    .scout-kw {
      padding: 4px 9px;
      font-size: 11px;
      border-radius: 999px;
      letter-spacing: -0.005em;
    }
    .scout-kw--ok { color: var(--scout-green); background: var(--scout-green-soft); border: 1px solid var(--scout-green-line); }
    .scout-kw--miss { color: var(--scout-amber); background: var(--scout-amber-soft); border: 1px solid var(--scout-amber-line); border-style: dashed; }

    /* actions ----------------------------------------------------------- */
    .scout-detail-actions {
      display: grid;
      grid-template-columns: 1fr auto auto;
      gap: 8px;
      padding-top: 8px;
      border-top: 1px solid var(--scout-border);
      margin-top: 4px;
      padding-top: 16px;
    }
    .scout-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 40px;
      padding: 0 14px;
      border-radius: 11px;
      font-size: 12.5px;
      font-weight: 500;
      letter-spacing: -0.005em;
      transition: background-color 180ms var(--scout-ease),
                  border-color 180ms var(--scout-ease),
                  color 180ms var(--scout-ease);
    }
    .scout-btn--primary {
      color: #1A0E00;
      background: var(--scout-amber);
      box-shadow:
        0 1px 0 rgba(255,255,255,0.12) inset,
        0 12px 28px -16px rgba(217,119,6,0.6),
        0 0 0 1px rgba(217,119,6,0.4);
      font-weight: 600;
    }
    .scout-btn--primary:hover { background: #E68512; }
    .scout-btn--ghost {
      color: var(--scout-text-dim);
      background: var(--scout-elevated);
      border: 1px solid var(--scout-border);
    }
    .scout-btn--ghost:hover { color: var(--scout-text); border-color: var(--scout-border-strong); }

    /* mobile pref CTA --------------------------------------------------- */
    .scout-mobile-pref {
      display: none;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 44px;
      border-radius: 12px;
      background: var(--scout-amber);
      color: #1A0E00;
      font-weight: 600;
      font-size: 13px;
      box-shadow: 0 12px 28px -14px rgba(217,119,6,0.65);
    }
    @media (max-width: 768px) { .scout-mobile-pref { display: inline-flex; } }

    /* overlay (tablet rail / mobile sheet) ----------------------------- */
    .scout-scrim {
      position: fixed;
      inset: 0;
      z-index: 40;
      background: rgba(0,0,0,0.55);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
      display: flex;
    }
    .scout-overlay {
      position: absolute;
      background: linear-gradient(180deg, var(--scout-surface) 0%, #101010 100%);
      border: 1px solid var(--scout-border);
      overflow-y: auto;
    }
    .scout-overlay--rail {
      top: 0; right: 0; bottom: 0;
      width: min(480px, 92vw);
      padding: 22px;
      border-left: 1px solid var(--scout-border);
      border-radius: 18px 0 0 18px;
    }
    .scout-overlay--sheet {
      left: 0; right: 0; bottom: 0;
      max-height: 88vh;
      padding: 14px 18px 28px;
      border-radius: 18px 18px 0 0;
    }
    .scout-sheet-grip {
      width: 36px; height: 4px;
      background: var(--scout-border-strong);
      border-radius: 2px;
      margin: 4px auto 12px;
    }

    /* responsive tweaks ------------------------------------------------- */
    @media (max-width: 1180px) {
      .scout-detail-rail { display: none; }
    }
    @media (max-width: 768px) {
      .scout-topbar { padding: 14px 16px; }
      .scout-topbar-status { padding-left: 0; border-left: 0; font-size: 11px; }
      .scout-list-head { flex-direction: column; align-items: flex-start; gap: 12px; }
      .scout-list-title { font-size: 22px; }
      .scout-card { padding: 16px; }
      .scout-card-role { font-size: 16px; }
      .scout-detail-actions { grid-template-columns: 1fr; }
    }
  `}</style>
);

export default ScoutDashboard;
