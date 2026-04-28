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
  Clock,
  Compass,
  Plus,
  GraduationCap,
} from 'lucide-react';

/* =====================================================================
   ScoutDashboard — Pro-only feature, static UI prototype
   Light, warm, LinkedIn-adjacent direction. Single sans-serif type
   system (Plus Jakarta Sans). Tailwind not installed in this project,
   so all styles ship in a self-contained scoped <style> block.
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
    breakdown: {
      Skills: { value: 95, note: 'Excellent' },
      Experience: { value: 90, note: 'Strong' },
      Location: { value: 100, note: 'Walking distance' },
      Salary: { value: 82, note: 'In range' },
    },
    why:
      'Your four years on a service desk plus your Office 365 admin experience map almost one-to-one. DIFC is a 12-minute walk from your stated home location.',
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
    breakdown: {
      Skills: { value: 90, note: 'Strong' },
      Experience: { value: 88, note: 'Strong' },
      Location: { value: 92, note: '15 min commute' },
      Salary: { value: 80, note: 'In range' },
    },
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
    breakdown: {
      Skills: { value: 72, note: 'Close' },
      Experience: { value: 70, note: 'Close' },
      Location: { value: 88, note: '25 min commute' },
      Salary: { value: 90, note: 'Above target' },
    },
    why:
      'A reach — they want one year of scripting you don’t have on paper. Your home-lab automation work would close that gap if you surface it.',
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
    breakdown: {
      Skills: { value: 70, note: 'Close' },
      Experience: { value: 60, note: 'Stretch' },
      Location: { value: 75, note: '35 min commute' },
      Salary: { value: 95, note: 'Above target' },
    },
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
    isDesktop: w >= 1180,
  };
};

/* count-up score number — sans-serif, no italic serif */
const ScoreNumber = ({ value, size = 22, weight = 600 }) => {
  const mv = useMotionValue(0);
  const display = useTransform(mv, (n) => Math.round(n));
  useEffect(() => {
    const controls = animate(mv, value, { duration: 0.9, ease: [0.22, 1, 0.36, 1] });
    return () => controls.stop();
  }, [value, mv]);
  return (
    <span className="scout-score-num" style={{ fontSize: size, fontWeight: weight }}>
      <motion.span>{display}</motion.span>
      <span className="scout-score-pct">%</span>
    </span>
  );
};

/* circular score ring — light, refined */
const ScoreRing = ({ value, tone, size = 88 }) => {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const offset = useMotionValue(c);
  useEffect(() => {
    const controls = animate(offset, c - (value / 100) * c, {
      duration: 1.0,
      ease: [0.22, 1, 0.36, 1],
    });
    return () => controls.stop();
  }, [value, c, offset]);
  const stroke = tone === 'direct' ? 'var(--scout-direct)' : 'var(--scout-stretch)';
  return (
    <div className="scout-ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--scout-border)"
          strokeWidth="5"
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={stroke}
          strokeWidth="5"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          style={{ strokeDashoffset: offset }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="scout-ring-inner">
        <ScoreNumber value={value} size={Math.round(size * 0.26)} weight={600} />
      </div>
    </div>
  );
};

/* breakdown stat block — replaces horizontal bars */
const Breakdown = ({ data }) => (
  <div className="scout-breakdown">
    {Object.entries(data).map(([label, { value, note }]) => {
      const tone = value >= 85 ? 'good' : value >= 70 ? 'okay' : 'low';
      return (
        <div key={label} className={`scout-stat-card scout-stat-card--${tone}`}>
          <div className="scout-stat-label">{label}</div>
          <div className="scout-stat-value">
            <ScoreNumber value={value} size={22} weight={600} />
          </div>
          <div className="scout-stat-note">{note}</div>
        </div>
      );
    })}
  </div>
);

/* ---------------------------- sidebar ---------------------------- */

const PreferencesSidebar = ({ onRunScout, scanning }) => {
  const [salary, setSalary] = useState(10000);
  const pct = ((salary - 5000) / (25000 - 5000)) * 100;

  return (
    <motion.aside
      className="scout-sidebar"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="scout-sidebar-section">
        <div className="scout-sidebar-title">Search preferences</div>

        <Field icon={<Briefcase size={14} strokeWidth={1.8} />} label="Role">
          <input
            className="scout-input"
            defaultValue="IT Support / Service Desk"
          />
        </Field>

        <Field icon={<MapPin size={14} strokeWidth={1.8} />} label="Location">
          <select className="scout-input scout-select">
            <option>Dubai, UAE</option>
            <option>Abu Dhabi, UAE</option>
            <option>Riyadh, KSA</option>
            <option>Doha, Qatar</option>
          </select>
        </Field>

        <Field
          icon={<GraduationCap size={14} strokeWidth={1.8} />}
          label="Experience"
        >
          <select className="scout-input scout-select">
            <option>Mid (3-5 years)</option>
            <option>Junior (0-2 years)</option>
            <option>Senior (6-10 years)</option>
          </select>
        </Field>

        <Field
          icon={<Banknote size={14} strokeWidth={1.8} />}
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
              style={{ '--p': `${pct}%` }}
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
        whileTap={{ scale: 0.985 }}
        transition={{ duration: 0.18 }}
      >
        <Sparkles size={15} strokeWidth={1.9} />
        {scanning ? 'Searching jobs…' : 'Run Scout'}
      </motion.button>

      <div className="scout-mini-stat">
        <span className="scout-live-dot" />
        4 matches found · 2h ago
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

/* ---------------------------- job card ---------------------------- */

const JobCard = ({ job, active, onClick, index }) => (
  <motion.button
    type="button"
    onClick={onClick}
    className={`scout-card scout-card--${job.state} ${active ? 'is-active' : ''}`}
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{
      duration: 0.4,
      delay: 0.08 + index * 0.05,
      ease: [0.22, 1, 0.36, 1],
    }}
    whileHover={{ y: -1 }}
  >
    <div className="scout-card-head">
      <div className="scout-company">
        <div className={`scout-logo scout-logo--${job.state}`}>
          {job.initials}
        </div>
        <div className="scout-company-meta">
          <div className="scout-company-name">{job.company}</div>
          <div className="scout-company-sub">
            <MapPin size={11} strokeWidth={1.9} />
            {job.location}
            <span className="scout-dot" />
            <Clock size={11} strokeWidth={1.9} />
            {job.posted}
          </div>
        </div>
      </div>

      <div className="scout-score-block">
        <div className={`scout-state-pip scout-state-pip--${job.state}`}>
          <span className="scout-pip-dot" />
          {job.state === 'direct' ? 'Direct match' : 'Stretch match'}
        </div>
        <ScoreNumber value={job.score} size={26} weight={700} />
      </div>
    </div>

    <h3 className="scout-card-role">{job.role}</h3>
    <p className="scout-card-summary">{job.summary}</p>

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
      <div className="scout-salary">
        <Banknote size={13} strokeWidth={1.9} />
        {job.salary}
        <span className="scout-salary-note">{job.salaryNote}</span>
      </div>
      <div className="scout-card-foot-right">
        <div className="scout-skill-fit">
          {job.skillsMatched}/{job.skillsTotal} skills match
        </div>
        <span className="scout-card-foot-cta">
          View match
          <ArrowRight size={13} strokeWidth={2} />
        </span>
      </div>
    </div>
  </motion.button>
);

/* ---------------------------- detail panel ---------------------------- */

const DetailPanel = ({ job, onClose, isOverlay }) => {
  if (!job) {
    return (
      <div className="scout-detail-empty">
        <div className="scout-empty-mark">
          <Compass size={26} strokeWidth={1.6} />
        </div>
        <h4>Pick a match to open the breakdown</h4>
        <p>
          Scout will lay out the score, the CV tweaks, and the ATS keywords for
          any job you click.
        </p>
      </div>
    );
  }

  return (
    <motion.div
      key={job.id}
      className="scout-detail"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      transition={{ type: 'spring', stiffness: 260, damping: 30, mass: 0.6 }}
    >
      <div className="scout-detail-head">
        <div className="scout-detail-head-left">
          <div className={`scout-state-pip scout-state-pip--${job.state}`}>
            <span className="scout-pip-dot" />
            {job.state === 'direct' ? 'Direct match' : 'Stretch match'}
          </div>
          <h2 className="scout-detail-role">{job.role}</h2>
          <div className="scout-detail-meta">
            <span className="scout-detail-meta-strong">{job.company}</span>
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
            <X size={16} strokeWidth={2} />
          </button>
        )}
      </div>

      <Section title="Why Scout picked this">
        <p className="scout-detail-why">{job.why}</p>
      </Section>

      <Section title="Match breakdown">
        <Breakdown data={job.breakdown} />
      </Section>

      <Section title="CV tweaks Scout suggests">
        <div className="scout-tweaks">
          {job.cvTweaks.map((t, i) => (
            <motion.div
              key={i}
              className="scout-tweak"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 + i * 0.06, duration: 0.32 }}
            >
              <div className="scout-tweak-field">{t.field}</div>
              <div className="scout-tweak-rows">
                <div className="scout-tweak-row scout-tweak-row--before">
                  <span className="scout-tweak-tag">Before</span>
                  <span className="scout-tweak-text">{t.before}</span>
                </div>
                <div className="scout-tweak-row scout-tweak-row--after">
                  <span className="scout-tweak-tag">After</span>
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
            <Check size={11} strokeWidth={2.4} />
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
            <Plus size={11} strokeWidth={2.4} />
            Add these to your CV
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
          <Sparkles size={14} strokeWidth={2} />
          Apply with tailored CV
        </button>
        <button type="button" className="scout-btn scout-btn--ghost">
          <Bookmark size={13} strokeWidth={1.9} />
          Save
        </button>
        <button type="button" className="scout-btn scout-btn--ghost">
          <SkipForward size={13} strokeWidth={1.9} />
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

  // Plus Jakarta Sans — single sans-serif for the whole screen
  useEffect(() => {
    const id = 'scout-fonts';
    if (document.getElementById(id)) return undefined;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap';
    document.head.appendChild(link);
    return () => {
      const el = document.getElementById(id);
      if (el) el.remove();
    };
  }, []);

  const handleSelect = (id) => {
    setSelectedId(id);
    if (!isDesktop) setOverlayOpen(true);
  };

  const closeOverlay = () => setOverlayOpen(false);

  const runScout = () => {
    setScanning(true);
    setTimeout(() => setScanning(false), 1600);
  };

  return (
    <div className="scout-root">
      <ScoutStyle />

      {/* topbar */}
      <header className="scout-topbar">
        <div className="scout-topbar-left">
          <div className="scout-brand">
            <div className="scout-brand-mark">
              <Compass size={14} strokeWidth={2} />
            </div>
            <span className="scout-brand-word">Scout</span>
            <span className="scout-brand-tag">PRO</span>
          </div>
          <div className="scout-topbar-status">
            <span className="scout-live-dot" />
            4 new matches · last sweep 2h ago
          </div>
        </div>
        <div className="scout-topbar-right">
          <div className="scout-search">
            <Search size={14} strokeWidth={1.9} />
            <input placeholder="Search Scout" />
          </div>
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
              <h1 className="scout-list-title">Tonight&apos;s shortlist</h1>
              <p className="scout-list-sub">
                4 jobs found in Dubai &middot; 2 direct matches and 2 stretch
                roles worth a look.
              </p>
            </div>

            <div className="scout-sort">
              <span className="scout-sort-label">Sort by</span>
              <button type="button" className="scout-sort-btn">
                {sort}
                <ChevronDown size={13} strokeWidth={2} />
              </button>
            </div>
          </div>

          <div className="scout-cards">
            {JOBS.map((j, i) => (
              <JobCard
                key={j.id}
                job={j}
                index={i}
                active={selectedId === j.id}
                onClick={() => handleSelect(j.id)}
              />
            ))}
          </div>

          {isMobile && (
            <button
              type="button"
              className="scout-mobile-pref"
              onClick={runScout}
            >
              <Sparkles size={14} strokeWidth={2} />
              Adjust search preferences
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

      {/* overlay — tablet right slide-over, mobile bottom sheet */}
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
              className={`scout-overlay ${
                isMobile ? 'scout-overlay--sheet' : 'scout-overlay--rail'
              }`}
              initial={isMobile ? { y: '100%' } : { x: '100%' }}
              animate={isMobile ? { y: 0 } : { x: 0 }}
              exit={isMobile ? { y: '100%' } : { x: '100%' }}
              transition={{ type: 'spring', stiffness: 280, damping: 32 }}
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
      /* warm, light palette */
      --scout-bg: #FAF7F2;
      --scout-surface: #FFFFFF;
      --scout-surface-tint: #FBF8F3;
      --scout-border: #ECE6D7;
      --scout-border-strong: #D9D2BF;
      --scout-text: #1B1F2A;
      --scout-text-dim: #5C6473;
      --scout-text-faint: #8B92A1;

      --scout-direct: #0E7C5A;
      --scout-direct-soft: #E7F2EC;
      --scout-direct-line: #BDD9C9;
      --scout-direct-tint: #F4FAF6;

      --scout-stretch: #B45309;
      --scout-stretch-soft: #FBEEDB;
      --scout-stretch-line: #ECCAA0;
      --scout-stretch-tint: #FCF7EE;

      --scout-amber: #D97706;
      --scout-amber-hover: #B45309;
      --scout-amber-soft: #FCEFE0;

      --scout-shadow-1: 0 1px 2px rgba(20, 22, 28, 0.04);
      --scout-shadow-2: 0 1px 2px rgba(20, 22, 28, 0.04), 0 8px 22px rgba(20, 22, 28, 0.05);
      --scout-shadow-3: 0 1px 3px rgba(20, 22, 28, 0.05), 0 14px 36px rgba(20, 22, 28, 0.08);
      --scout-ease: cubic-bezier(0.22, 1, 0.36, 1);
      --scout-font: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

      position: relative;
      min-height: 100vh;
      background: var(--scout-bg);
      color: var(--scout-text);
      font-family: var(--scout-font);
      font-size: 14px;
      line-height: 1.5;
      letter-spacing: -0.005em;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    .scout-root *, .scout-root *::before, .scout-root *::after { box-sizing: border-box; }
    .scout-root button { font-family: inherit; cursor: pointer; border: 0; background: transparent; color: inherit; padding: 0; }
    .scout-root input, .scout-root select { font-family: inherit; }

    /* topbar ------------------------------------------------------------ */
    .scout-topbar {
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      padding: 14px 28px;
      background: rgba(255, 255, 255, 0.85);
      backdrop-filter: saturate(140%) blur(10px);
      -webkit-backdrop-filter: saturate(140%) blur(10px);
      border-bottom: 1px solid var(--scout-border);
    }
    .scout-topbar-left { display: flex; align-items: center; gap: 18px; min-width: 0; }
    .scout-brand { display: inline-flex; align-items: center; gap: 8px; }
    .scout-brand-mark {
      width: 26px; height: 26px;
      border-radius: 8px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: #fff;
      background: linear-gradient(135deg, #0E7C5A 0%, #15A074 100%);
      box-shadow: 0 1px 2px rgba(14, 124, 90, 0.25), inset 0 1px 0 rgba(255,255,255,0.18);
    }
    .scout-brand-word {
      font-size: 17px;
      font-weight: 700;
      letter-spacing: -0.01em;
      color: var(--scout-text);
    }
    .scout-brand-tag {
      padding: 2px 6px;
      border-radius: 999px;
      font-size: 9.5px;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: var(--scout-amber);
      background: var(--scout-amber-soft);
    }
    .scout-topbar-status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding-left: 18px;
      border-left: 1px solid var(--scout-border);
      color: var(--scout-text-dim);
      font-size: 12.5px;
      font-weight: 500;
    }
    .scout-live-dot {
      width: 7px; height: 7px;
      border-radius: 50%;
      background: var(--scout-direct);
      box-shadow: 0 0 0 0 rgba(14, 124, 90, 0.4);
      animation: scout-pulse 2.4s var(--scout-ease) infinite;
    }
    @keyframes scout-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(14, 124, 90, 0.4); }
      50% { box-shadow: 0 0 0 6px rgba(14, 124, 90, 0); }
    }
    .scout-topbar-right { display: flex; align-items: center; gap: 12px; }
    .scout-search {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 0 12px;
      height: 34px;
      width: 220px;
      border-radius: 10px;
      background: var(--scout-surface);
      border: 1px solid var(--scout-border);
      color: var(--scout-text-faint);
      transition: border-color 160ms var(--scout-ease), background-color 160ms var(--scout-ease);
    }
    .scout-search:focus-within {
      border-color: var(--scout-border-strong);
      background: #fff;
      color: var(--scout-text-dim);
    }
    .scout-search input {
      border: 0; outline: 0;
      background: transparent;
      font-size: 13px;
      width: 100%;
      color: var(--scout-text);
    }
    .scout-search input::placeholder { color: var(--scout-text-faint); }
    .scout-avatar {
      width: 34px; height: 34px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.02em;
      color: #fff;
      background: linear-gradient(135deg, #C2410C 0%, #D97706 100%);
      box-shadow: var(--scout-shadow-1);
    }

    /* shell ------------------------------------------------------------- */
    .scout-shell {
      display: grid;
      grid-template-columns: 260px minmax(0, 1fr) 440px;
      gap: 22px;
      padding: 24px 28px 56px;
      max-width: 1440px;
      margin: 0 auto;
      align-items: start;
    }
    @media (max-width: 1180px) {
      .scout-shell { grid-template-columns: 240px minmax(0, 1fr); gap: 20px; }
    }
    @media (max-width: 768px) {
      .scout-shell { grid-template-columns: 1fr; padding: 16px 14px 96px; gap: 16px; }
    }

    /* sidebar ----------------------------------------------------------- */
    .scout-sidebar {
      position: sticky;
      top: 80px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      padding: 18px;
      border-radius: 14px;
      background: var(--scout-surface);
      border: 1px solid var(--scout-border);
      box-shadow: var(--scout-shadow-1);
    }
    .scout-sidebar-section { display: flex; flex-direction: column; gap: 12px; }
    .scout-sidebar-title {
      font-size: 13px;
      font-weight: 600;
      letter-spacing: -0.005em;
      color: var(--scout-text);
      margin-bottom: 2px;
    }
    .scout-field { display: flex; flex-direction: column; gap: 6px; }
    .scout-field-label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 500;
      color: var(--scout-text-dim);
    }
    .scout-input {
      width: 100%;
      height: 36px;
      padding: 0 12px;
      border-radius: 9px;
      font-size: 13px;
      color: var(--scout-text);
      background: var(--scout-surface);
      border: 1px solid var(--scout-border);
      outline: none;
      transition: border-color 160ms var(--scout-ease), box-shadow 160ms var(--scout-ease);
    }
    .scout-input:hover { border-color: var(--scout-border-strong); }
    .scout-input:focus {
      border-color: var(--scout-amber);
      box-shadow: 0 0 0 3px var(--scout-amber-soft);
    }
    .scout-select {
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6' fill='none'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%238B92A1' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 12px center;
      padding-right: 28px;
    }

    .scout-salary-head { display: inline-flex; align-items: center; justify-content: space-between; width: 100%; gap: 8px; }
    .scout-salary-num { font-size: 12.5px; font-weight: 600; color: var(--scout-text); }
    .scout-slider-wrap { display: flex; flex-direction: column; gap: 4px; padding: 4px 2px 0; }
    .scout-slider {
      width: 100%;
      -webkit-appearance: none; appearance: none;
      background: transparent;
      height: 22px;
    }
    .scout-slider::-webkit-slider-runnable-track {
      height: 4px;
      border-radius: 2px;
      background: linear-gradient(90deg, var(--scout-amber) 0%, var(--scout-amber) var(--p, 25%), var(--scout-border) var(--p, 25%));
    }
    .scout-slider::-webkit-slider-thumb {
      -webkit-appearance: none; appearance: none;
      width: 14px; height: 14px;
      border-radius: 50%;
      background: #fff;
      border: 2px solid var(--scout-amber);
      margin-top: -5px;
      box-shadow: 0 1px 2px rgba(20,22,28,0.12);
    }
    .scout-slider::-moz-range-track { height: 4px; background: var(--scout-border); border-radius: 2px; }
    .scout-slider::-moz-range-progress { height: 4px; background: var(--scout-amber); border-radius: 2px; }
    .scout-slider::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; background: #fff; border: 2px solid var(--scout-amber); }
    .scout-slider-ticks { display: flex; justify-content: space-between; font-size: 10.5px; color: var(--scout-text-faint); font-weight: 500; }

    /* run scout button -------------------------------------------------- */
    .scout-run {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 42px;
      padding: 0 16px;
      border-radius: 10px;
      font-size: 13.5px;
      font-weight: 600;
      letter-spacing: -0.005em;
      color: #fff;
      background: var(--scout-amber);
      box-shadow:
        0 1px 0 rgba(255,255,255,0.18) inset,
        0 4px 12px -2px rgba(217, 119, 6, 0.30);
      transition:
        background-color 180ms var(--scout-ease),
        box-shadow 180ms var(--scout-ease),
        transform 180ms var(--scout-ease);
    }
    .scout-run:hover { background: var(--scout-amber-hover); }
    .scout-run.is-scanning { background: var(--scout-amber-hover); }
    .scout-run.is-scanning svg {
      animation: scout-spin 1.4s linear infinite;
    }
    @keyframes scout-spin { to { transform: rotate(360deg); } }

    .scout-mini-stat {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 12px;
      border-radius: 10px;
      background: var(--scout-direct-tint);
      border: 1px solid var(--scout-direct-line);
      color: var(--scout-direct);
      font-size: 12px;
      font-weight: 500;
      letter-spacing: -0.005em;
    }
    .scout-mini-stat .scout-live-dot { background: var(--scout-direct); }

    /* list head --------------------------------------------------------- */
    .scout-list { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
    .scout-list-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 24px;
      padding: 6px 4px 0;
    }
    .scout-list-title {
      margin: 0;
      font-size: 24px;
      line-height: 1.2;
      font-weight: 700;
      letter-spacing: -0.018em;
      color: var(--scout-text);
    }
    .scout-list-sub {
      margin: 6px 0 0;
      max-width: 520px;
      color: var(--scout-text-dim);
      font-size: 13.5px;
      line-height: 1.55;
    }
    .scout-sort { display: inline-flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .scout-sort-label { font-size: 12px; color: var(--scout-text-faint); font-weight: 500; }
    .scout-sort-btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 32px;
      padding: 0 12px;
      font-size: 12.5px;
      font-weight: 500;
      color: var(--scout-text);
      background: var(--scout-surface);
      border: 1px solid var(--scout-border);
      border-radius: 9px;
      transition: border-color 160ms var(--scout-ease);
    }
    .scout-sort-btn:hover { border-color: var(--scout-border-strong); }

    /* job cards --------------------------------------------------------- */
    .scout-cards { display: flex; flex-direction: column; gap: 12px; }
    .scout-card {
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 100%;
      padding: 18px 20px;
      text-align: left;
      border-radius: 14px;
      background: var(--scout-surface);
      border: 1px solid var(--scout-border);
      box-shadow: var(--scout-shadow-1);
      transition:
        border-color 200ms var(--scout-ease),
        box-shadow 200ms var(--scout-ease),
        transform 200ms var(--scout-ease);
    }
    .scout-card:hover {
      border-color: var(--scout-border-strong);
      box-shadow: var(--scout-shadow-2);
    }
    .scout-card.is-active {
      box-shadow:
        0 0 0 2px var(--scout-card-ring),
        var(--scout-shadow-2);
      border-color: transparent;
    }
    .scout-card--direct.is-active { --scout-card-ring: var(--scout-direct); }
    .scout-card--stretch.is-active { --scout-card-ring: var(--scout-stretch); }
    .scout-card--direct.is-active { background: linear-gradient(180deg, var(--scout-direct-tint) 0%, var(--scout-surface) 60%); }
    .scout-card--stretch.is-active { background: linear-gradient(180deg, var(--scout-stretch-tint) 0%, var(--scout-surface) 60%); }

    .scout-card-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; }
    .scout-company { display: flex; align-items: center; gap: 12px; min-width: 0; }
    .scout-logo {
      width: 44px; height: 44px;
      border-radius: 11px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.02em;
      flex-shrink: 0;
    }
    .scout-logo--direct {
      color: var(--scout-direct);
      background: var(--scout-direct-soft);
      border: 1px solid var(--scout-direct-line);
    }
    .scout-logo--stretch {
      color: var(--scout-stretch);
      background: var(--scout-stretch-soft);
      border: 1px solid var(--scout-stretch-line);
    }
    .scout-company-meta { min-width: 0; }
    .scout-company-name { font-size: 13.5px; font-weight: 600; color: var(--scout-text); letter-spacing: -0.005em; }
    .scout-company-sub {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 3px;
      font-size: 12px;
      font-weight: 500;
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
      font-size: 11px;
      font-weight: 600;
      letter-spacing: -0.005em;
      border: 1px solid;
    }
    .scout-state-pip--direct {
      color: var(--scout-direct);
      background: var(--scout-direct-soft);
      border-color: var(--scout-direct-line);
    }
    .scout-state-pip--stretch {
      color: var(--scout-stretch);
      background: var(--scout-stretch-soft);
      border-color: var(--scout-stretch-line);
    }
    .scout-pip-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }

    .scout-score-num {
      display: inline-flex;
      align-items: baseline;
      line-height: 1;
      letter-spacing: -0.02em;
      color: var(--scout-text);
      font-feature-settings: "tnum" 1, "lnum" 1;
    }
    .scout-card--direct .scout-score-num { color: var(--scout-direct); }
    .scout-card--stretch .scout-score-num { color: var(--scout-stretch); }
    .scout-score-pct {
      font-size: 0.55em;
      margin-left: 1px;
      font-weight: 600;
      opacity: 0.85;
    }

    .scout-card-role {
      margin: 0;
      font-size: 17px;
      font-weight: 700;
      letter-spacing: -0.018em;
      color: var(--scout-text);
      line-height: 1.3;
    }
    .scout-card-summary {
      margin: 0;
      font-size: 13px;
      line-height: 1.55;
      color: var(--scout-text-dim);
      max-width: 60ch;
    }
    .scout-skill-row { display: flex; flex-wrap: wrap; gap: 6px; }
    .scout-skill {
      padding: 4px 10px;
      font-size: 11.5px;
      font-weight: 500;
      color: var(--scout-text-dim);
      background: var(--scout-surface-tint);
      border: 1px solid var(--scout-border);
      border-radius: 999px;
    }
    .scout-skill--more { background: transparent; color: var(--scout-text-faint); }

    .scout-card-foot {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      padding-top: 12px;
      border-top: 1px solid var(--scout-border);
    }
    .scout-salary {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 600;
      color: var(--scout-text);
    }
    .scout-salary-note { font-weight: 500; color: var(--scout-text-faint); margin-left: -2px; }
    .scout-card-foot-right {
      display: inline-flex;
      align-items: center;
      gap: 14px;
    }
    .scout-skill-fit {
      font-size: 11.5px;
      font-weight: 500;
      color: var(--scout-text-faint);
    }
    .scout-card-foot-cta {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12.5px;
      font-weight: 600;
      color: var(--scout-text);
      transition: gap 200ms var(--scout-ease);
    }
    .scout-card:hover .scout-card-foot-cta { gap: 9px; }

    /* detail panel ------------------------------------------------------ */
    .scout-detail-rail {
      position: sticky;
      top: 80px;
      max-height: calc(100vh - 100px);
      overflow-y: auto;
      border-radius: 14px;
      background: var(--scout-surface);
      border: 1px solid var(--scout-border);
      box-shadow: var(--scout-shadow-2);
      padding: 22px;
    }
    .scout-detail-rail::-webkit-scrollbar { width: 8px; }
    .scout-detail-rail::-webkit-scrollbar-thumb { background: var(--scout-border-strong); border-radius: 4px; }
    .scout-detail-rail::-webkit-scrollbar-track { background: transparent; }

    .scout-detail-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      gap: 10px;
      padding: 56px 28px;
      color: var(--scout-text-dim);
    }
    .scout-detail-empty h4 {
      margin: 4px 0 0;
      font-size: 15px;
      font-weight: 600;
      color: var(--scout-text);
    }
    .scout-detail-empty p {
      margin: 0;
      font-size: 12.5px;
      max-width: 32ch;
      line-height: 1.55;
    }
    .scout-empty-mark {
      width: 52px; height: 52px;
      border-radius: 13px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--scout-amber);
      background: var(--scout-amber-soft);
      margin-bottom: 4px;
    }

    .scout-detail { display: flex; flex-direction: column; gap: 22px; position: relative; }
    .scout-detail-head {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 16px;
      padding-bottom: 18px;
      border-bottom: 1px solid var(--scout-border);
      position: relative;
    }
    .scout-detail-head-left { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
    .scout-detail-role {
      margin: 4px 0 0;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.02em;
      color: var(--scout-text);
      line-height: 1.25;
    }
    .scout-detail-meta {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      font-size: 12.5px;
      color: var(--scout-text-dim);
    }
    .scout-detail-meta-strong { color: var(--scout-text); font-weight: 600; }
    .scout-detail-close {
      position: absolute;
      top: -2px;
      right: -2px;
      width: 30px; height: 30px;
      border-radius: 8px;
      color: var(--scout-text-dim);
      background: var(--scout-surface-tint);
      border: 1px solid var(--scout-border);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: color 160ms var(--scout-ease), border-color 160ms var(--scout-ease);
    }
    .scout-detail-close:hover { color: var(--scout-text); border-color: var(--scout-border-strong); }

    .scout-ring-wrap { position: relative; flex-shrink: 0; }
    .scout-ring-inner {
      position: absolute;
      inset: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .scout-detail .scout-ring-wrap .scout-score-num { color: var(--scout-text); }

    /* sections ---------------------------------------------------------- */
    .scout-section { display: flex; flex-direction: column; gap: 10px; }
    .scout-section-title {
      margin: 0;
      font-size: 11.5px;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--scout-text-faint);
    }
    .scout-detail-why {
      margin: 0;
      font-size: 13.5px;
      line-height: 1.6;
      color: var(--scout-text);
      letter-spacing: -0.005em;
    }

    /* breakdown — stat blocks (no bars) -------------------------------- */
    .scout-breakdown {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
    }
    .scout-stat-card {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 12px 14px;
      border-radius: 12px;
      background: var(--scout-surface);
      border: 1px solid var(--scout-border);
    }
    .scout-stat-card--good {
      background: var(--scout-direct-tint);
      border-color: var(--scout-direct-line);
    }
    .scout-stat-card--okay {
      background: var(--scout-stretch-tint);
      border-color: var(--scout-stretch-line);
    }
    .scout-stat-card--low {
      background: var(--scout-surface-tint);
      border-color: var(--scout-border);
    }
    .scout-stat-label {
      font-size: 11.5px;
      font-weight: 500;
      color: var(--scout-text-dim);
    }
    .scout-stat-value .scout-score-num { color: var(--scout-text); font-weight: 700; }
    .scout-stat-card--good .scout-stat-value .scout-score-num { color: var(--scout-direct); }
    .scout-stat-card--okay .scout-stat-value .scout-score-num { color: var(--scout-stretch); }
    .scout-stat-note {
      font-size: 11px;
      font-weight: 500;
      color: var(--scout-text-faint);
      letter-spacing: -0.005em;
    }
    .scout-stat-card--good .scout-stat-note { color: var(--scout-direct); opacity: 0.78; }
    .scout-stat-card--okay .scout-stat-note { color: var(--scout-stretch); opacity: 0.78; }

    /* tweaks ------------------------------------------------------------ */
    .scout-tweaks { display: flex; flex-direction: column; gap: 10px; }
    .scout-tweak {
      padding: 12px 14px;
      border-radius: 12px;
      background: var(--scout-surface-tint);
      border: 1px solid var(--scout-border);
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .scout-tweak-field {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--scout-text-faint);
    }
    .scout-tweak-rows { display: flex; flex-direction: column; gap: 6px; }
    .scout-tweak-row {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      font-size: 13px;
      line-height: 1.55;
    }
    .scout-tweak-tag {
      flex-shrink: 0;
      padding: 2px 7px;
      font-size: 9.5px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      border-radius: 6px;
      margin-top: 2px;
    }
    .scout-tweak-row--before .scout-tweak-tag {
      background: var(--scout-surface);
      color: var(--scout-text-faint);
      border: 1px solid var(--scout-border);
    }
    .scout-tweak-row--before .scout-tweak-text {
      color: var(--scout-text-faint);
      text-decoration: line-through;
      text-decoration-color: rgba(139, 146, 161, 0.45);
      text-decoration-thickness: 1px;
    }
    .scout-tweak-row--after .scout-tweak-tag {
      background: var(--scout-direct-soft);
      color: var(--scout-direct);
    }
    .scout-tweak-row--after .scout-tweak-text {
      color: var(--scout-text);
      font-weight: 500;
    }

    /* keywords ---------------------------------------------------------- */
    .scout-kw-group { display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px; }
    .scout-kw-group:last-child { margin-bottom: 0; }
    .scout-kw-label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11.5px;
      font-weight: 600;
      letter-spacing: 0.005em;
    }
    .scout-kw-label--ok { color: var(--scout-direct); }
    .scout-kw-label--miss { color: var(--scout-stretch); }
    .scout-kw-row { display: flex; flex-wrap: wrap; gap: 6px; }
    .scout-kw {
      padding: 4px 10px;
      font-size: 11.5px;
      font-weight: 500;
      border-radius: 999px;
      letter-spacing: -0.005em;
    }
    .scout-kw--ok {
      color: var(--scout-direct);
      background: var(--scout-direct-soft);
      border: 1px solid var(--scout-direct-line);
    }
    .scout-kw--miss {
      color: var(--scout-stretch);
      background: var(--scout-stretch-soft);
      border: 1px dashed var(--scout-stretch-line);
    }

    /* actions ----------------------------------------------------------- */
    .scout-detail-actions {
      display: grid;
      grid-template-columns: 1fr auto auto;
      gap: 8px;
      padding-top: 18px;
      border-top: 1px solid var(--scout-border);
    }
    .scout-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 40px;
      padding: 0 14px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: -0.005em;
      transition: background-color 180ms var(--scout-ease), border-color 180ms var(--scout-ease), color 180ms var(--scout-ease);
    }
    .scout-btn--primary {
      color: #fff;
      background: var(--scout-amber);
      box-shadow:
        0 1px 0 rgba(255,255,255,0.15) inset,
        0 4px 14px -4px rgba(217, 119, 6, 0.32);
    }
    .scout-btn--primary:hover { background: var(--scout-amber-hover); }
    .scout-btn--ghost {
      color: var(--scout-text-dim);
      background: var(--scout-surface);
      border: 1px solid var(--scout-border);
    }
    .scout-btn--ghost:hover { color: var(--scout-text); border-color: var(--scout-border-strong); background: var(--scout-surface-tint); }

    /* mobile pref CTA --------------------------------------------------- */
    .scout-mobile-pref {
      display: none;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 44px;
      border-radius: 11px;
      background: var(--scout-amber);
      color: #fff;
      font-weight: 600;
      font-size: 13px;
      box-shadow: 0 4px 14px -4px rgba(217, 119, 6, 0.35);
    }
    @media (max-width: 768px) { .scout-mobile-pref { display: inline-flex; } }

    /* overlay (tablet rail / mobile sheet) ----------------------------- */
    .scout-scrim {
      position: fixed;
      inset: 0;
      z-index: 40;
      background: rgba(27, 31, 42, 0.32);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
    }
    .scout-overlay {
      position: absolute;
      background: var(--scout-surface);
      border: 1px solid var(--scout-border);
      box-shadow: var(--scout-shadow-3);
      overflow-y: auto;
    }
    .scout-overlay--rail {
      top: 0; right: 0; bottom: 0;
      width: min(460px, 92vw);
      padding: 22px;
      border-radius: 16px 0 0 16px;
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
      .scout-topbar { padding: 12px 14px; }
      .scout-topbar-status { display: none; }
      .scout-search { display: none; }
      .scout-list-head { flex-direction: column; align-items: flex-start; gap: 12px; }
      .scout-list-title { font-size: 22px; }
      .scout-card { padding: 16px; }
      .scout-card-role { font-size: 16px; }
      .scout-detail-actions { grid-template-columns: 1fr; }
      /* breakdown stays 2-col on mobile — that's the whole point of dropping bars */
    }
  `}</style>
);

export default ScoutDashboard;
