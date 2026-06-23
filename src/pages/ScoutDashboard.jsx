import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Banknote,
  Sparkles,
  ChevronDown,
  Check,
  X,
  Bookmark,
  SkipForward,
  Clock,
  Compass,
  Plus,
  GraduationCap,
  RotateCcw,
  Copy,
  Inbox,
  Briefcase,
  Settings as SettingsIcon,
  HelpCircle,
  LogOut,
  ArrowUpRight,
  ArrowRight,
  FileText,
  Upload,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '../appSupabaseClient';
import safeFetch from '../lib/net/safeFetch';

/* =====================================================================
   ScoutDashboard — Pro-only feature, static UI prototype.
   Light, warm, LinkedIn-adjacent. Eclipse-inspired colored card grid +
   Framer Motion interaction layer. Tailwind not installed — all styles
   in scoped <style> block at the bottom.
   ===================================================================== */

const SOURCES = ['LinkedIn', 'Indeed', 'Glassdoor', 'Bayt', 'Naukri'];

/* Platform brand colours used when a specific source is selected.
   Per-source UI accent only — never used elsewhere on the screen. */
const SOURCE_COLORS = {
  LinkedIn: '#0A66C2',
  Indeed: '#E96E00',
  Glassdoor: '#0F73E2',
  Bayt: '#15803D',
  Naukri: '#DC2626',
};

/* Soft pastel rotation for the card grid — Eclipse-style variety. */
const TINTS = [
  { bg: '#F0FDF4', logoBg: '#BBF7D0', logoText: '#14532D' }, // soft green
  { bg: '#EFF6FF', logoBg: '#BFDBFE', logoText: '#1E3A8A' }, // sky blue
  { bg: '#FFFBEB', logoBg: '#FDE68A', logoText: '#7C2D12' }, // light amber
  { bg: '#FFF1F2', logoBg: '#FECDD3', logoText: '#881337' }, // pale blush
  { bg: '#FAF7F2', logoBg: '#EADDC4', logoText: '#7C5A1F' }, // warm cream
];

/* ---------------------------- API + shape helpers ---------------------------- */

async function authedFetch(url, options = {}) {
  if (!supabase) throw new Error('Supabase client unavailable');
  const { data: { session } = {} } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    const err = new Error('Not signed in');
    err.code = 'NOT_SIGNED_IN';
    throw err;
  }
  const r = await safeFetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  const text = await r.text();
  let json = {};
  try { json = text ? JSON.parse(text) : {}; } catch { /* leave empty */ }
  if (!r.ok) {
    const err = new Error(json?.error || `Request failed: ${r.status}`);
    err.status = r.status;
    throw err;
  }
  return json;
}

function timeAgo(iso) {
  if (!iso) return '';
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return '';
  const min = Math.floor(ms / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  return `${mo}mo ago`;
}

function initialsOf(name) {
  if (!name) return '—';
  const tokens = String(name).trim().split(/\s+/).filter(Boolean);
  return tokens.slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '—';
}

function seniorityToYears(label) {
  if (!label) return null;
  const m = String(label).match(/(\d+)\s*-\s*(\d+)/);
  if (m) return Math.round((parseInt(m[1], 10) + parseInt(m[2], 10)) / 2);
  if (/junior/i.test(label)) return 1;
  if (/mid/i.test(label)) return 4;
  if (/senior/i.test(label)) return 8;
  return null;
}

// Default template for Apply-flow PDFs when the user uploaded a CV (no
// stored template_id). Template 10 = "ATS International" — pure ATS, zero
// colour, max parser score. Safest pick for a JD-tailored application.
const APPLY_DEFAULT_TEMPLATE_ID = 10;

// Static 5-step progress copy. The frontend holds each line for at least
// 800ms (see runScout's MIN_SCAN_MS) so even a fast upstream still reads
// like real work — important for trust on a $99/yr feature.
const SCAN_PROGRESS_MESSAGES = [
  'Searching JSearch…',
  'Searching Jooble…',
  'Removing duplicates…',
  'AI is analysing matches…',
  'Building your shortlist…',
];

async function triggerPdfDownload({ tailoredCv, templateId, baseName, signal }) {
  const res = await safeFetch(`${window.location.origin}/api/generate-pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      templateId: templateId || APPLY_DEFAULT_TEMPLATE_ID,
      cv: tailoredCv,
    }),
    signal,
  });
  if (!res.ok) {
    let msg = `PDF render failed (${res.status})`;
    try { const j = await res.json(); if (j.error) msg = j.error; } catch { /* ignore */ }
    throw new Error(msg);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(baseName || 'Tailored_CV').replace(/[^A-Za-z0-9_-]+/g, '_')}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Defer revoke so Safari has time to consume the blob URL.
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// Compact period label for salary strings ("month" → "/mo", "year" → "/yr").
function periodSuffix(period) {
  const p = String(period || '').toLowerCase();
  if (p.includes('hour')) return '/hr';
  if (p.includes('day')) return '/day';
  if (p.includes('week')) return '/wk';
  if (p.includes('month') || p === 'mo' || p === 'monthly') return '/mo';
  if (p.includes('year') || p === 'yr' || p === 'annual' || p === 'annually') return '/yr';
  return '';
}

// Format the salary block for cards + detail header. Returns '' when there
// is nothing real to show — callers conditionally render based on truthiness
// so we never display "Not stated" or empty placeholders.
function formatSalary(job) {
  const min = Number.isFinite(Number(job?.salaryMin)) ? Number(job.salaryMin) : null;
  const max = Number.isFinite(Number(job?.salaryMax)) ? Number(job.salaryMax) : null;
  const currency = (job?.salaryCurrency || '').toUpperCase();
  const period = periodSuffix(job?.salaryPeriod);
  if (min == null && max == null) return '';
  const fmt = (n) => n.toLocaleString();
  const cur = currency || '';
  if (min != null && max != null) {
    return `${cur ? cur + ' ' : ''}${fmt(min)} – ${fmt(max)}${period ? ' ' + period : ''}`.trim();
  }
  const single = min != null ? min : max;
  return `From ${cur ? cur + ' ' : ''}${fmt(single)}${period ? ' ' + period : ''}`.trim();
}

function mapMatchToUi(m) {
  const state = m.match_type === 'direct' ? 'direct' : m.match_type === 'stretch' ? 'stretch' : 'discarded';
  return {
    id: m.match_id,
    jobId: m.job_id,
    company: m.company || '—',
    initials: initialsOf(m.company),
    role: m.title || 'Untitled role',
    location: m.location || '',
    jobType: '',
    salaryMin: m.salary_min ?? null,
    salaryMax: m.salary_max ?? null,
    salaryCurrency: m.salary_currency || null,
    salaryPeriod: m.salary_period || null,
    posted: timeAgo(m.fetched_at),
    source: m.source_platform || 'Source',
    score: m.match_score || 0,
    state,
    summary: m.jd_snippet || '',
    // Full JD text is shipped to the apply-fallback payload so the
    // tailor endpoint can keep working even when the scout_matches DB
    // row is missing. Snippet stays separate for the card UI.
    jdText: m.jd_text || '',
    skills: Array.isArray(m.ats_keywords) ? m.ats_keywords : [],
    why: m.tailoring_advice || '',
    keyStrengths: Array.isArray(m.key_strengths) ? m.key_strengths : [],
    missingRequirements: Array.isArray(m.missing_requirements) ? m.missing_requirements : [],
    atsKeywords: Array.isArray(m.ats_keywords) ? m.ats_keywords : [],
    applyUrl: m.apply_url || '',
    status: m.status || 'new',
    fetchedAt: m.fetched_at || null,
  };
}

const DEFAULT_FILTERS = Object.freeze({
  role: 'IT Support / Service Desk',
  location: 'Dubai, UAE',
  experience: 'Mid (3-5 years)',
  salary: 10000,
  sources: ['all'],
  jobType: 'Any',
  datePosted: 'Any time',
});

/* shared spring — snappy, never linear */
const SPRING = { type: 'spring', stiffness: 300, damping: 25 };
const SPRING_SOFT = { type: 'spring', stiffness: 220, damping: 26 };

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

const ScoreRing = ({ value, tone, size = 84 }) => {
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
  const stroke = tone === 'direct' ? 'var(--scout-match-blue)' : 'var(--scout-stretch)';
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
        <ScoreNumber value={value} size={Math.round(size * 0.27)} weight={700} />
      </div>
    </div>
  );
};

/* Breakdown component removed — the API contract returns a single match_score
   per match rather than per-axis stats; the score-ring in DetailPanel covers
   that signal. If we ever extend Claude scoring to return per-axis breakdowns,
   re-add this component then. */

/* ---------------------------- sources chip selector ---------------------------- */

const SourcesChips = ({ value, onChange, counts = null }) => {
  const allOn = value.includes('all');
  // counts === null OR all === 0 → no matches loaded yet. Source chips
  // are pure client-side filters in the new architecture: nothing to
  // filter against → every chip is disabled. Once matches arrive, chips
  // with 0 hits stay disabled (honest yield) but the rest light up.
  const hasResults = counts && (counts.all || 0) > 0;
  const allChipsDisabled = !hasResults;

  const toggle = (src) => {
    if (src === 'all') {
      onChange(['all']);
      return;
    }
    if (allOn) {
      onChange([src]);
      return;
    }
    if (value.includes(src)) {
      const next = value.filter((v) => v !== src);
      onChange(next.length ? next : ['all']);
    } else {
      const next = [...value, src];
      onChange(next.length === SOURCES.length ? ['all'] : next);
    }
  };

  const allTotal = counts ? (counts.all || 0) : null;

  return (
    <div className="scout-sources">
      <motion.button
        type="button"
        className={`scout-source scout-source--all ${allOn ? 'is-on' : ''} ${allChipsDisabled ? 'is-disabled' : ''}`}
        onClick={allChipsDisabled ? undefined : () => toggle('all')}
        disabled={allChipsDisabled}
        aria-disabled={allChipsDisabled}
        whileHover={allChipsDisabled ? undefined : { y: -1 }}
        whileTap={allChipsDisabled ? undefined : { scale: 0.97 }}
        transition={SPRING}
        style={allChipsDisabled ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
      >
        All{allTotal != null ? ` · ${allTotal}` : ''}
      </motion.button>
      {SOURCES.map((s) => {
        const count = counts ? (counts[s] || 0) : null;
        const disabled = hasResults && count === 0;
        const filled = !allOn && value.includes(s);
        const color = SOURCE_COLORS[s];
        const baseStyle = filled
          ? { background: color, borderColor: color, color: '#fff' }
          : allOn
          ? { borderColor: `${color}40`, color }
          : { borderColor: `${color}55`, color };
        const style = disabled
          ? { borderColor: 'var(--scout-border-soft, #2A2A2A)', color: 'var(--scout-text-faint, #6B6B6B)', background: 'transparent', opacity: 0.5 }
          : baseStyle;
        return (
          <motion.button
            key={s}
            type="button"
            disabled={disabled}
            aria-disabled={disabled}
            className={`scout-source ${filled ? 'is-on' : ''} ${
              allOn ? 'is-implicit' : ''
            } ${disabled ? 'is-disabled' : ''}`}
            style={style}
            onClick={disabled ? undefined : () => toggle(s)}
            whileHover={disabled ? undefined : { y: -1 }}
            whileTap={disabled ? undefined : { scale: 0.97 }}
            transition={SPRING}
          >
            {s}{count != null ? ` · ${count}` : ''}
          </motion.button>
        );
      })}
    </div>
  );
};

/* ---------------------------- sidebar ---------------------------- */

const PreferencesSidebar = ({
  filters,
  setFilters,
  onRunScout,
  onReset,
  scanState,
  scanMessages,
  sourceCounts,
  chipCounts,
  cooldownLeft = 0,
}) => {
  const onCooldown = cooldownLeft > 0 && scanState === 'idle';
  const cooldownLabel = `${Math.floor(cooldownLeft / 60)}:${String(cooldownLeft % 60).padStart(2, '0')}`;
  const pct = ((filters.salary - 5000) / (25000 - 5000)) * 100;

  return (
    <motion.aside
      className="scout-sidebar"
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Source chips — hidden mid-scan so the user reads the progress
          messages, not a stale chip row. Reappear once results arrive. */}
      {scanState !== 'scanning' && (
        <div className="scout-sidebar-section scout-sidebar-section--first">
          <div className="scout-sidebar-title">Search on</div>
          <SourcesChips
            value={filters.sources}
            onChange={(sources) => setFilters({ ...filters, sources })}
            counts={chipCounts}
          />
        </div>
      )}

      <div className="scout-sidebar-divider" aria-hidden="true" />

      <div className="scout-sidebar-section">
        <div className="scout-sidebar-title">Search preferences</div>

        <Field icon={<Briefcase size={14} strokeWidth={1.9} />} label="Role">
          <input
            className="scout-input"
            value={filters.role}
            onChange={(e) => setFilters({ ...filters, role: e.target.value })}
          />
        </Field>

        <Field icon={<MapPin size={14} strokeWidth={1.9} />} label="Location">
          <select
            className="scout-input scout-select"
            value={filters.location}
            onChange={(e) => setFilters({ ...filters, location: e.target.value })}
          >
            <option>Dubai, UAE</option>
            <option>Abu Dhabi, UAE</option>
            <option>Riyadh, KSA</option>
            <option>Doha, Qatar</option>
          </select>
        </Field>

        <Field
          icon={<GraduationCap size={14} strokeWidth={1.9} />}
          label="Experience"
        >
          <select
            className="scout-input scout-select"
            value={filters.experience}
            onChange={(e) => setFilters({ ...filters, experience: e.target.value })}
          >
            <option>Mid (3-5 years)</option>
            <option>Junior (0-2 years)</option>
            <option>Senior (6-10 years)</option>
          </select>
        </Field>

        <Field
          icon={<Briefcase size={14} strokeWidth={1.9} />}
          label="Job Type"
        >
          <select
            className="scout-input scout-select"
            value={filters.jobType}
            onChange={(e) => setFilters({ ...filters, jobType: e.target.value })}
          >
            <option>Any</option>
            <option>Full Time</option>
            <option>Part Time</option>
            <option>Contract</option>
            <option>Remote</option>
            <option>Hybrid</option>
          </select>
        </Field>

        <Field
          icon={<Clock size={14} strokeWidth={1.9} />}
          label="Date Posted"
        >
          <select
            className="scout-input scout-select"
            value={filters.datePosted}
            onChange={(e) => setFilters({ ...filters, datePosted: e.target.value })}
          >
            <option>Any time</option>
            <option>Last 24 hours</option>
            <option>Last 3 days</option>
            <option>Last week</option>
            <option>Last month</option>
          </select>
        </Field>

        <Field
          icon={<Banknote size={14} strokeWidth={1.9} />}
          label={
            <span className="scout-salary-head">
              <span>Min salary</span>
              <span className="scout-salary-num">
                AED&nbsp;{filters.salary.toLocaleString()}
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
              value={filters.salary}
              onChange={(e) =>
                setFilters({ ...filters, salary: Number(e.target.value) })
              }
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
        className={`scout-run scout-run--${scanState} ${onCooldown ? 'scout-run--cooldown' : ''}`}
        onClick={onRunScout}
        whileHover={onCooldown ? undefined : { y: -1 }}
        whileTap={onCooldown ? undefined : { scale: 0.97 }}
        transition={SPRING}
        disabled={scanState === 'scanning' || onCooldown}
      >
        {scanState === 'scanning' ? (
          <>
            <span className="scout-run-pulse" aria-hidden="true" />
            <ProgressMessages
              messages={scanMessages && scanMessages.length ? scanMessages : ['Searching jobs…']}
              intervalMs={800}
            />
          </>
        ) : scanState === 'complete' ? (
          <>
            <Check size={15} strokeWidth={2.4} />
            Scout complete
          </>
        ) : onCooldown ? (
          <>
            <Clock size={15} strokeWidth={1.9} />
            Run Scout again in {cooldownLabel}
          </>
        ) : (
          <>
            <Sparkles size={15} strokeWidth={1.9} />
            Run Scout
          </>
        )}
      </motion.button>

      <button type="button" className="scout-reset" onClick={onReset}>
        <RotateCcw size={11} strokeWidth={2} />
        Reset filters
      </button>

      <div className="scout-mini-stat">
        <div className="scout-mini-stat-row">
          <span className="scout-live-dot" />
          <span>{sourceCounts.reduce((t, s) => t + s.count, 0)} matches found · 2h ago</span>
        </div>
        <div className="scout-mini-stat-sources">
          {sourceCounts.map(({ source, count }) => (
            <span key={source} className="scout-source-chip">
              <span
                className="scout-source-mark"
                style={{ background: SOURCE_COLORS[source] || 'var(--scout-direct)' }}
              >
                {source[0]}
              </span>
              <span className="scout-source-name">{source}</span>
              <span className="scout-source-count">{count}</span>
            </span>
          ))}
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

/* ---------------------------- job card ---------------------------- */

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: SPRING },
  exit: {
    x: -360,
    rotate: -6,
    opacity: 0,
    transition: { duration: 0.36, ease: [0.32, 0, 0.67, 0] },
  },
  hover: { y: -4 },
  tap: { scale: 0.97, transition: { type: 'spring', stiffness: 420, damping: 22 } },
};

const JobCard = ({ job, tint, active, onClick }) => {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      layout
      variants={cardVariants}
      initial="hidden"
      animate="show"
      exit="exit"
      whileHover="hover"
      whileTap="tap"
      transition={SPRING}
      style={{ background: tint.bg }}
      className={`scout-card scout-card--${job.state} ${active ? 'is-active' : ''}`}
    >
      <div className="scout-card-head">
        <div
          className="scout-logo"
          style={{ background: tint.logoBg, color: tint.logoText }}
        >
          {job.initials}
        </div>

        <motion.div
          className="scout-score-block"
          variants={{ hover: { scale: 1.05 } }}
          transition={{ type: 'spring', stiffness: 380, damping: 18 }}
        >
          <div className={`scout-state-pip scout-state-pip--${job.state}`}>
            <span className="scout-pip-dot" />
            {job.state === 'direct' ? 'Direct' : 'Stretch'}
          </div>
          <ScoreNumber value={job.score} size={24} weight={700} />
        </motion.div>
      </div>

      <div className="scout-card-body">
        <h3 className="scout-card-role">{job.role}</h3>
        <div className="scout-card-company">{job.company}</div>
      </div>

      <div className="scout-skill-row">
        {job.skills.slice(0, 3).map((s) => (
          <span key={s} className="scout-skill">
            {s}
          </span>
        ))}
        {job.skills.length > 3 && (
          <span className="scout-skill scout-skill--more">
            +{job.skills.length - 3}
          </span>
        )}
      </div>

      <div className="scout-card-where">
        <div className="scout-card-where-city">
          <MapPin size={12} strokeWidth={2.2} />
          <span>{job.location || 'Location not stated'}</span>
        </div>
        {job.posted && (
          <div className="scout-card-where-when">
            <Clock size={11} strokeWidth={2} />
            <span>{job.posted}</span>
          </div>
        )}
      </div>

      <div className="scout-card-foot">
        {(() => {
          const sal = formatSalary(job);
          return sal ? <div className="scout-salary">{sal}</div> : null;
        })()}
        <div className="scout-salary-meta">
          <span className="scout-source-tag scout-source-tag--card">
            via {job.source}
          </span>
        </div>
      </div>
    </motion.button>
  );
};

/* ---------------------------- skeleton ---------------------------- */

const SkeletonCard = ({ index }) => (
  <motion.div
    className="scout-card scout-skeleton-card"
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.22 } }}
    transition={{ delay: 0.04 * index, ...SPRING_SOFT }}
  >
    <div className="scout-card-head">
      <div className="scout-skel scout-skel--logo" />
      <div className="scout-skel scout-skel--pill" />
    </div>
    <div className="scout-skel scout-skel--line" style={{ width: '80%', height: '14px' }} />
    <div className="scout-skel scout-skel--line" style={{ width: '50%', height: '10px' }} />
    <div className="scout-skel-row">
      <div className="scout-skel scout-skel--chip" />
      <div className="scout-skel scout-skel--chip" />
      <div className="scout-skel scout-skel--chip" />
    </div>
    <div className="scout-skel scout-skel--line" style={{ width: '60%', height: '10px' }} />
    <div className="scout-skel scout-skel--line" style={{ width: '46%', height: '14px' }} />
  </motion.div>
);

/* ---------------------------- empty state ---------------------------- */

const EmptyState = ({ onAdjust }) => (
  <motion.div
    className="scout-empty-state"
    initial={{ opacity: 0, y: 6 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: 6 }}
    transition={SPRING_SOFT}
  >
    <div className="scout-empty-mark scout-empty-mark--big">
      <Inbox size={28} strokeWidth={1.6} />
    </div>
    <h3>Scout came back empty</h3>
    <p>
      Nothing matched these filters tonight. Try widening the salary, adding more
      sources, or relaxing the experience level.
    </p>
    <button type="button" className="scout-btn scout-btn--primary" onClick={onAdjust}>
      <Sparkles size={14} strokeWidth={2} />
      Adjust preferences
    </button>
  </motion.div>
);

/* ---------------------------- detail panel ---------------------------- */

const DetailPanel = ({ job, onClose, isOverlay, onCopyKeyword, onApply, onSave, onSkip }) => {
  if (!job) {
    return (
      <div className="scout-detail-empty">
        <div className="scout-empty-mark">
          <Compass size={26} strokeWidth={1.6} />
        </div>
        <h4>Pick a match to open the breakdown</h4>
        <p>
          Scout will lay out the score, the strengths, and the ATS keywords for
          any job you click.
        </p>
      </div>
    );
  }

  const stateLabel =
    job.state === 'direct' ? 'Direct match' : job.state === 'stretch' ? 'Stretch match' : 'Low match';
  const tone = job.state === 'direct' ? 'direct' : 'stretch';
  const hasKeyStrengths = Array.isArray(job.keyStrengths) && job.keyStrengths.length > 0;
  const hasMissing = Array.isArray(job.missingRequirements) && job.missingRequirements.length > 0;
  const hasAtsKeywords = Array.isArray(job.atsKeywords) && job.atsKeywords.length > 0;
  const isSaved = job.status === 'saved';
  const isIgnored = job.status === 'ignored';

  return (
    <motion.div
      key={job.id}
      className="scout-detail"
      initial={{ opacity: 0, x: 60 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 60 }}
      transition={SPRING}
    >
      <div className="scout-detail-head">
        <div className="scout-detail-head-left">
          <div className={`scout-state-pip scout-state-pip--${job.state}`}>
            <span className="scout-pip-dot" />
            {stateLabel}
          </div>
          <h2 className="scout-detail-role">{job.role}</h2>
          <div className="scout-detail-company">{job.company}</div>
          <div className="scout-detail-meta">
            {job.location && <span>{job.location}</span>}
            {(() => {
              const sal = formatSalary(job);
              if (!sal) return null;
              return (
                <>
                  {job.location && <span className="scout-dot" />}
                  <span>{sal}</span>
                </>
              );
            })()}
          </div>
          <div className="scout-detail-sub">
            {job.posted && (
              <>
                <Clock size={11} strokeWidth={2} />
                Last updated {job.posted}
                <span className="scout-dot" />
              </>
            )}
            <span className="scout-source-tag scout-source-tag--inline">
              via {job.source}
            </span>
          </div>
        </div>
        <ScoreRing value={job.score} tone={tone} />
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

      {/* Action bar — visible immediately under header */}
      <div className="scout-detail-actions scout-detail-actions--top">
        <motion.button
          type="button"
          className="scout-btn scout-btn--primary"
          whileHover={{ y: -1 }}
          whileTap={{ scale: 0.97 }}
          transition={SPRING}
          onClick={() => onApply && onApply(job)}
        >
          <Sparkles size={14} strokeWidth={2} />
          Apply with tailored CV
        </motion.button>
        <motion.button
          type="button"
          className={`scout-btn scout-btn--ghost ${isSaved ? 'is-on' : ''}`}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSave && onSave(job)}
          disabled={isSaved}
        >
          <Bookmark size={13} strokeWidth={1.9} />
          {isSaved ? 'Saved' : 'Save'}
        </motion.button>
        <motion.button
          type="button"
          className={`scout-btn scout-btn--ghost ${isIgnored ? 'is-on' : ''}`}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSkip && onSkip(job)}
          disabled={isIgnored}
        >
          <SkipForward size={13} strokeWidth={1.9} />
          {isIgnored ? 'Skipped' : 'Skip'}
        </motion.button>
      </div>

      {job.applyUrl && (
        <a
          className="scout-detail-job-link"
          href={job.applyUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink size={12} strokeWidth={2} />
          View original job posting
        </a>
      )}

      {(job.summary || job.why) && (
        <Section title="Why Scout picked this">
          {job.summary && <p className="scout-detail-why">{job.summary}</p>}
          {job.why && <p className="scout-detail-why scout-detail-why--soft">{job.why}</p>}
        </Section>
      )}

      {hasMissing && (
        <Section title="Gaps to address">
          <ul className="scout-gap-list">
            {job.missingRequirements.map((g, i) => (
              <motion.li
                key={`${g}-${i}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 + i * 0.05, ...SPRING_SOFT }}
              >
                {g}
              </motion.li>
            ))}
          </ul>
        </Section>
      )}

      {(hasKeyStrengths || hasAtsKeywords) && (
        <Section title="ATS keywords">
          {hasKeyStrengths && (
            <div className="scout-kw-group">
              <div className="scout-kw-label scout-kw-label--ok">
                <Check size={11} strokeWidth={2.4} />
                Strengths to lean into
              </div>
              <div className="scout-kw-row">
                {job.keyStrengths.map((k, i) => (
                  <span key={`${k}-${i}`} className="scout-kw scout-kw--ok">
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}
          {hasAtsKeywords && (
            <div className="scout-kw-group">
              <div className="scout-kw-label scout-kw-label--miss">
                <Plus size={11} strokeWidth={2.4} />
                Add these to your CV — tap to copy
              </div>
              <div className="scout-kw-row">
                {job.atsKeywords.map((k, i) => (
                  <motion.button
                    key={`${k}-${i}`}
                    type="button"
                    className="scout-kw scout-kw--miss"
                    onClick={() => onCopyKeyword(k)}
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.94 }}
                    transition={SPRING}
                  >
                    <Copy size={10.5} strokeWidth={2.2} />
                    {k}
                  </motion.button>
                ))}
              </div>
            </div>
          )}
        </Section>
      )}
    </motion.div>
  );
};

const Section = ({ title, children }) => (
  <section className="scout-section">
    <h5 className="scout-section-title">{title}</h5>
    {children}
  </section>
);

/* ---------------------------- user menu popover ---------------------------- */

const UserMenu = ({ open, onClose, anchorRef, plan = 'active-hunter', email = '', onUniversalCv, universalRunning }) => {
  const navigate = useNavigate();
  const [hoverUpgrade, setHoverUpgrade] = useState(false);
  const isCareerPro = plan === 'career-pro';
  const isFree = plan === 'free';
  const planName = isCareerPro ? 'Career Pro' : isFree ? 'Free plan' : 'Active Hunter';
  const planDot = isCareerPro ? 'gold' : isFree ? 'green' : 'green';

  // Close on outside click. Anchor (the avatar button) lives outside the
  // popover, so we ignore clicks inside the anchor too — the anchor's own
  // onClick is the toggle.
  useEffect(() => {
    if (!open) return undefined;
    const handler = (e) => {
      const popover = document.querySelector('[data-scout-popover]');
      if (popover && popover.contains(e.target)) return;
      if (anchorRef?.current && anchorRef.current.contains(e.target)) return;
      onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose, anchorRef]);

  const go = (path) => () => {
    onClose();
    navigate(path);
  };

  const handleLogout = async () => {
    onClose();
    try {
      if (supabase) await supabase.auth.signOut();
    } catch (e) {
      // signOut already invalidates locally even if the network call fails
    }
    navigate('/');
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          data-scout-popover
          className="scout-popover"
          initial={{ opacity: 0, scale: 0.96, y: -4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -4 }}
          transition={{ type: 'spring', stiffness: 360, damping: 28 }}
        >
          <div className="scout-popover-email" title={email}>{email}</div>

          <div className="scout-popover-divider" />

          <div className="scout-popover-plan">
            <div className="scout-plan-head">
              <span className={`scout-plan-dot scout-plan-dot--${planDot}`} />
              {planName}
            </div>
            <div className="scout-plan-line">Scout runs · daily limit applies</div>
          </div>

          <div className="scout-popover-divider" />

          {onUniversalCv && !isFree && (
            <button
              type="button"
              className="scout-popover-item"
              onClick={() => { onClose(); onUniversalCv(); }}
              disabled={universalRunning}
            >
              <Sparkles size={14} strokeWidth={1.9} />
              {universalRunning ? 'Generating universal CV…' : 'Generate universal CV'}
            </button>
          )}

          {!isCareerPro && (
            <div
              className="scout-upgrade-wrap"
              onMouseEnter={() => setHoverUpgrade(true)}
              onMouseLeave={() => setHoverUpgrade(false)}
            >
              <button
                type="button"
                className="scout-popover-item scout-popover-item--upgrade"
                onClick={go('/pricing')}
              >
                <ArrowUpRight size={14} strokeWidth={2} />
                Upgrade to Career Pro
                <ChevronDown
                  size={12}
                  strokeWidth={2}
                  className="scout-popover-item-chev"
                />
              </button>

              <AnimatePresence>
                {hoverUpgrade && (
                  <motion.div
                    className="scout-upgrade-sub"
                    initial={{ opacity: 0, x: 12, scale: 0.98 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 12 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 26 }}
                  >
                    <div className="scout-upgrade-sub-head">
                      <span className="scout-plan-dot scout-plan-dot--gold" />
                      Career Pro
                    </div>
                    <div className="scout-upgrade-sub-price">
                      AED&nbsp;199<span>/year</span>
                    </div>
                    <div className="scout-upgrade-sub-label">What you get</div>
                    <ul className="scout-upgrade-sub-list">
                      <li><Check size={11} strokeWidth={2.4} /> Unlimited Scout runs</li>
                      <li><Check size={11} strokeWidth={2.4} /> Unlimited CV generations</li>
                      <li><Check size={11} strokeWidth={2.4} /> Priority matching</li>
                    </ul>
                    <button
                      type="button"
                      className="scout-upgrade-sub-cta"
                      onClick={go('/pricing')}
                    >
                      Upgrade Now
                      <ArrowRight size={12} strokeWidth={2.2} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <button
            type="button"
            className="scout-popover-item"
            onClick={go('/account')}
          >
            <SettingsIcon size={14} strokeWidth={1.9} />
            Settings
          </button>

          <button
            type="button"
            className="scout-popover-item"
            onClick={go('/support')}
          >
            <HelpCircle size={14} strokeWidth={1.9} />
            Help &amp; Support
          </button>

          <div className="scout-popover-divider" />

          <button
            type="button"
            className="scout-popover-item scout-popover-item--logout"
            onClick={handleLogout}
          >
            <LogOut size={14} strokeWidth={1.9} />
            Log out
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

/* ---------------------------- toast ---------------------------- */

const Toast = ({ message }) => (
  <motion.div
    className="scout-toast"
    initial={{ opacity: 0, y: 16, scale: 0.94 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: 8, scale: 0.96 }}
    transition={SPRING}
  >
    <Check size={13} strokeWidth={2.4} />
    {message}
  </motion.div>
);

/* ---------------------------- progress messages ---------------------------- */

// Crossfades through a list of messages on a fixed interval. Used by the
// Run-Scout button (per-source cycling) and the Apply modal (extract →
// tailor → render). Single message? It just renders that message.
const ProgressMessages = ({ messages, intervalMs = 2400 }) => {
  const [i, setI] = useState(0);
  useEffect(() => {
    setI(0);
    if (!Array.isArray(messages) || messages.length <= 1) return undefined;
    const t = setInterval(() => {
      setI((cur) => (cur + 1) % messages.length);
    }, intervalMs);
    return () => clearInterval(t);
  }, [messages, intervalMs]);
  const current = (messages && messages[i]) || '';
  return (
    <AnimatePresence mode="wait">
      <motion.span
        key={`${i}-${current}`}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -4 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        style={{ display: 'inline-block' }}
      >
        {current}
      </motion.span>
    </AnimatePresence>
  );
};

/* ---------------------------- apply modal ---------------------------- */

// Stages: 'choose' | 'tailoring' | 'rendering' | 'opening' | 'done' | 'error'
//
// Path A (Use my CVPassport CV) flows through 'tailoring' → 'rendering' → 'done'.
// Path B (Upload a CV) flips to 'opening' for a single beat then 'done' — it
// never hits an API.
const ApplyModal = ({ job, stage, error, onPickStored, onPickUpload, onClose }) => {
  const fileRef = useRef(null);

  if (!job) return null;

  const onFileChange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    onPickUpload(f);
  };

  const stageMessages = {
    tailoring: [
      `Tailoring your CV for ${job.company || 'this role'}…`,
      'Inserting ATS keywords…',
      'Reframing bullets to mirror the JD…',
    ],
    rendering: ['Rendering PDF…', 'Almost there…'],
    opening: ['Opening job page…'],
  };

  const showProgress = stage === 'tailoring' || stage === 'rendering' || stage === 'opening';
  const showDone = stage === 'done';
  const showError = stage === 'error';

  // Done-state copy depends on which path we took. Path A downloaded a PDF
  // and opened the tab. Path B only opened the tab.
  const doneTitle = 'Job opened in a new tab';
  const doneSub = 'Upload your CV there to apply.';

  return (
    <motion.div
      className="scout-apply-scrim"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      onClick={stage === 'choose' || stage === 'error' ? onClose : undefined}
    >
      <motion.div
        className="scout-apply-modal"
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Apply with tailored CV"
      >
        {/* X always works — onClose aborts the in-flight Apply (Path A)
            via AbortController and resets modal state. */}
        <button
          type="button"
          className="scout-apply-close"
          onClick={onClose}
          aria-label="Close"
        >
          <X size={16} strokeWidth={2} />
        </button>

        <div className="scout-apply-head">
          <div className="scout-apply-title">Apply with a tailored CV</div>
          <div className="scout-apply-sub">
            For <strong>{job.role}</strong>
            {job.company ? <> at <strong>{job.company}</strong></> : null}
          </div>
        </div>

        {stage === 'choose' && (
          <div className="scout-apply-options">
            <button
              type="button"
              className="scout-apply-option scout-apply-option--primary"
              onClick={onPickStored}
            >
              <div className="scout-apply-option-icon">
                <FileText size={18} strokeWidth={2} />
              </div>
              <div className="scout-apply-option-body">
                <div className="scout-apply-option-title">Use my CVPassport CV</div>
                <div className="scout-apply-option-desc">
                  Tailor the CV you built here to this JD. Downloads + opens the job page.
                </div>
              </div>
              <ArrowRight size={14} strokeWidth={2} className="scout-apply-option-arrow" />
            </button>

            <button
              type="button"
              className="scout-apply-option"
              onClick={() => fileRef.current && fileRef.current.click()}
            >
              <div className="scout-apply-option-icon">
                <Upload size={18} strokeWidth={2} />
              </div>
              <div className="scout-apply-option-body">
                <div className="scout-apply-option-title">Upload a CV</div>
                <div className="scout-apply-option-desc">
                  Use a CV you already have. We&apos;ll open the job page so you can upload it.
                </div>
              </div>
              <ArrowRight size={14} strokeWidth={2} className="scout-apply-option-arrow" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf,.pdf"
              onChange={onFileChange}
              style={{ display: 'none' }}
            />
            <p className="scout-apply-foot-note">
              We&apos;ll never auto-submit your application — you stay in control on the employer&apos;s page.
            </p>
          </div>
        )}

        {showProgress && (
          <div className="scout-apply-progress">
            <div className="scout-apply-spinner" aria-hidden="true">
              <Loader2 size={28} strokeWidth={2} />
            </div>
            <div className="scout-apply-progress-text">
              <ProgressMessages messages={stageMessages[stage]} intervalMs={2400} />
            </div>
          </div>
        )}

        {showDone && (
          <div className="scout-apply-done">
            <div className="scout-apply-done-mark">
              <Check size={18} strokeWidth={2.4} />
            </div>
            <div className="scout-apply-done-title">{doneTitle}</div>
            <div className="scout-apply-done-sub">{doneSub}</div>
            <button type="button" className="scout-btn scout-btn--primary" onClick={onClose}>
              Done
            </button>
          </div>
        )}

        {showError && (
          <div className="scout-apply-error">
            <div className="scout-apply-error-title">Something went wrong</div>
            <div className="scout-apply-error-sub">{error || 'Please try again.'}</div>
            <button type="button" className="scout-btn scout-btn--ghost" onClick={onClose}>
              Close
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};

/* ---------------------------- root ---------------------------- */

// Auth state (user, isPro) is owned by useCvpAuth and threaded in as props
// from App.js — never re-query profiles here. The previous local query
// silently failed because it referenced a non-existent `full_name` column,
// which left isPro unset and forced every pro user into the pricing gate.
const ScoutDashboard = ({ user, isPro }) => {
  const navigate = useNavigate();
  const { isDesktop, isMobile } = useViewport();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [matches, setMatches] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [scanState, setScanState] = useState('idle'); // idle | scanning | complete
  // Mobile-only: bottom-sheet hosting the filter panel. Desktop renders the
  // sidebar inline so this state is unused there.
  const [mobilePrefOpen, setMobilePrefOpen] = useState(false);
  // Post-run cooldown. cooldownEndRef holds the absolute end timestamp
  // (Date.now() + 60s) so it survives re-renders without re-creating the
  // interval; cooldownLeft is the seconds-remaining the UI binds to.
  // intervalRef tracks the active setInterval so we can clear it on
  // unmount or whenever a new cooldown starts.
  const cooldownEndRef = useRef(null);
  const cooldownIntervalRef = useRef(null);
  const [cooldownLeft, setCooldownLeft] = useState(0);

  const startCooldown = (seconds = 60) => {
    cooldownEndRef.current = Date.now() + seconds * 1000;
    setCooldownLeft(seconds);
    if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
    cooldownIntervalRef.current = setInterval(() => {
      const ms = (cooldownEndRef.current || 0) - Date.now();
      const sec = Math.max(0, Math.ceil(ms / 1000));
      setCooldownLeft(sec);
      if (sec <= 0) {
        clearInterval(cooldownIntervalRef.current);
        cooldownIntervalRef.current = null;
        cooldownEndRef.current = null;
      }
    }, 1000);
  };

  useEffect(() => () => {
    if (cooldownIntervalRef.current) clearInterval(cooldownIntervalRef.current);
  }, []);
  const [toast, setToast] = useState(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [hasCv, setHasCv] = useState(null); // null = unknown, true/false once probed
  const [bootError, setBootError] = useState(null);
  const [universalRunning, setUniversalRunning] = useState(false);
  // Apply flow state. applyJob holds the job we're applying to (modal opens
  // when non-null). applyStage drives the modal's view ('choose' | 'extracting'
  // | 'tailoring' | 'rendering' | 'done' | 'error'). applyError is the
  // surfaced message for the 'error' stage.
  const [applyJob, setApplyJob] = useState(null);
  const [applyStage, setApplyStage] = useState('choose');
  const [applyError, setApplyError] = useState(null);
  const avatarRef = useRef(null);
  // Aborts the in-flight Apply (Path A) fetch when the user clicks the
  // modal X. Set on each onPickStored invocation, cleared in finally.
  const applyAbortRef = useRef(null);
  const sort = 'Best match';

  const allJobs = useMemo(() => matches.map(mapMatchToUi), [matches]);

  // Per-source hit counts driving the chip badges + disabled state. Computed
  // off the unfiltered allJobs (chip "All · 12" must hold steady as you
  // toggle other chips — only the card grid filters).
  const chipCounts = useMemo(() => {
    if (allJobs.length === 0) return null;
    const map = { all: allJobs.length };
    SOURCES.forEach((s) => {
      const needle = s.toLowerCase();
      map[s] = allJobs.filter((j) =>
        String(j.source || '').toLowerCase().includes(needle)
      ).length;
    });
    return map;
  }, [allJobs]);

  // Visible cards = allJobs gated by selected source chips (case-insensitive
  // contains, OR across selections). 'all' or empty selection = pass-through.
  const visibleJobs = useMemo(() => {
    if (!filters.sources || filters.sources.length === 0 || filters.sources.includes('all')) {
      return allJobs;
    }
    const needles = filters.sources
      .filter((s) => s !== 'all')
      .map((s) => String(s).toLowerCase());
    if (needles.length === 0) return allJobs;
    return allJobs.filter((j) => {
      const src = String(j.source || '').toLowerCase();
      return needles.some((n) => src.includes(n));
    });
  }, [allJobs, filters.sources]);

  const selected = useMemo(
    () => visibleJobs.find((j) => j.id === selectedId) || null,
    [selectedId, visibleJobs]
  );

  const sourceCounts = useMemo(() => {
    const counts = allJobs.reduce((acc, j) => {
      acc[j.source] = (acc[j.source] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([source, count]) => ({ source, count }));
  }, [allJobs]);

  // Pipeline-aligned progress messages. Static — same 5 lines every run.
  // ProgressMessages cycles them at intervalMs (defaults to 2400ms in this
  // file), and runScout's MIN_SCAN_MS guarantees each line surfaces for
  // ≥800ms even on the fastest pipeline pass.
  const scanMessages = SCAN_PROGRESS_MESSAGES;

  const lastRunLabel = useMemo(() => {
    if (visibleJobs.length === 0) return '';
    const latest = visibleJobs.reduce(
      (acc, j) => (j.fetchedAt && (!acc || j.fetchedAt > acc) ? j.fetchedAt : acc),
      null
    );
    return latest ? `last sweep ${timeAgo(latest)}` : '';
  }, [visibleJobs]);

  // Auto-pick top match on desktop once matches load
  useEffect(() => {
    if (!isDesktop || selectedId) return;
    if (visibleJobs.length > 0) setSelectedId(visibleJobs[0].id);
  }, [isDesktop, selectedId, visibleJobs]);

  // Font preload
  useEffect(() => {
    const id = 'scout-fonts';
    if (document.getElementById(id)) return undefined;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap';
    document.head.appendChild(link);
    return () => {
      const el = document.getElementById(id);
      if (el) el.remove();
    };
  }, []);

  // Bootstrap: cv check → preferences → initial matches.
  // Auth/pro come from props (useCvpAuth is the single source of truth).
  useEffect(() => {
    if (!supabase || !user?.id) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const { data: cvRows } = await supabase
          .from('cvs')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);
        if (cancelled) return;
        setHasCv(Array.isArray(cvRows) && cvRows.length > 0);

        // .select('*') instead of an explicit column list so the query
        // doesn't 400 when a newly-shipped client meets a not-yet-migrated
        // database. Optional chaining + ?? on every read below already
        // handles missing fields.
        const { data: prefRow } = await supabase
          .from('scout_preferences')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (cancelled) return;
        if (prefRow) {
          const yrs = prefRow.experience_years;
          const expLabel = yrs == null
            ? DEFAULT_FILTERS.experience
            : yrs <= 2 ? 'Junior (0-2 years)'
            : yrs <= 5 ? 'Mid (3-5 years)'
            : 'Senior (6-10 years)';
          setFilters({
            role: prefRow.target_role || DEFAULT_FILTERS.role,
            location: prefRow.location || DEFAULT_FILTERS.location,
            experience: expLabel,
            salary: prefRow.salary_min || DEFAULT_FILTERS.salary,
            sources: Array.isArray(prefRow.sources) && prefRow.sources.length
              ? prefRow.sources
              : DEFAULT_FILTERS.sources,
            jobType: prefRow.job_type || DEFAULT_FILTERS.jobType,
            datePosted: prefRow.date_posted_filter || DEFAULT_FILTERS.datePosted,
          });
        }

        // Intentionally NOT auto-loading scout_matches on mount — fresh
        // page load must show the empty state, not the user's last run's
        // cards. New matches arrive only via the run response.
      } catch (e) {
        if (!cancelled) setBootError(e?.message || 'Could not load Scout');
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, isPro]);

  const handleSelect = (id) => {
    setSelectedId(id);
    if (!isDesktop) setOverlayOpen(true);
  };

  const closeOverlay = () => setOverlayOpen(false);

  // Flat body shape consumed by /api/scout-run after the pipeline
  // refactor — sources are intentionally omitted because chip filtering
  // is purely client-side now.
  const buildRunPayload = () => ({
    userId: user?.id || null,
    role: filters.role,
    location: filters.location,
    experience: seniorityToYears(filters.experience),
    jobType: filters.jobType || 'Any',
    datePosted: filters.datePosted || 'Any time',
    minSalary: filters.salary || null,
  });

  const runScout = async () => {
    if (!user) { navigate('/auth'); return; }
    if (!isPro) {
      setToast({ id: Date.now(), message: 'Scout is a Pro feature' });
      navigate('/pricing');
      return;
    }
    if (hasCv === false) {
      setToast({ id: Date.now(), message: 'Build your CV first' });
      navigate('/builder');
      return;
    }

    // Wipe the previous run's cards before firing the new request — without
    // this the user sees stale matches sitting under the loading state and,
    // when the new run completes, momentarily a mix of old + new before the
    // reload settles. Resetting selectedId too keeps the detail rail in
    // sync (no orphaned highlight on a card that's about to be replaced).
    setMatches([]);
    setSelectedId(null);
    setScanState('scanning');
    // Snapshot the current filters at click time so the request always uses
    // what's on screen right now, not whatever the closure captured earlier.
    const payload = buildRunPayload();
    // Anchor for the minimum scan duration — we want each progress message
    // to read for ~800ms even when the upstream pipeline is fast, so the UI
    // doesn't flash through to "complete" before the user reads the steps.
    const scanStartedAt = Date.now();
    const MIN_SCAN_MS = SCAN_PROGRESS_MESSAGES.length * 800;
    try {
      const json = await authedFetch('/api/scout-run', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      // Hold the loading state for the minimum if the API beat the floor.
      const elapsed = Date.now() - scanStartedAt;
      if (elapsed < MIN_SCAN_MS) {
        await new Promise((res) => setTimeout(res, MIN_SCAN_MS - elapsed));
      }
      // Response now carries the full match payload — no second roundtrip
      // to /api/scout-matches needed.
      setMatches(Array.isArray(json.matches) ? json.matches : []);
      setScanState('complete');
      // Real success only — empty runs and errors must not lock the user
      // out of an immediate retry. matchesCreated is the API's truth.
      if ((json.matchesCreated || 0) > 0) {
        startCooldown(60);
      }
      const remaining = typeof json.runsRemaining === 'number'
        ? ` · ${json.runsRemaining} runs left today`
        : '';
      setToast({
        id: Date.now(),
        message: `${json.matchesCreated || 0} matches added${remaining}`,
      });
      setTimeout(() => setScanState('idle'), 1700);
    } catch (e) {
      setScanState('idle');
      const msg = e?.status === 429 ? e.message
        : e?.status === 402 ? 'Scout is a Pro feature'
        : e?.status === 400 ? e.message
        : 'Scout run failed — try again';
      setToast({ id: Date.now(), message: msg });
    }
  };

  const resetFilters = () => setFilters(DEFAULT_FILTERS);

  const updateMatchStatus = async (matchId, status) => {
    if (!supabase || !matchId) return;
    const { error } = await supabase
      .from('scout_matches')
      .update({ status })
      .eq('id', matchId);
    if (error) {
      setToast({ id: Date.now(), message: 'Could not update match' });
      return;
    }
    setMatches((prev) =>
      prev.map((m) => (m.match_id === matchId ? { ...m, status } : m))
    );
  };

  // Open the Apply modal for a given job. Modal owns the rest of the flow.
  const handleApply = (job) => {
    if (!job?.id) return;
    setApplyJob(job);
    setApplyStage('choose');
    setApplyError(null);
  };

  // X-button close. Aborts any in-flight fetch (the AbortController is
  // attached to authedFetch / triggerPdfDownload via signal). The aborted
  // fetch throws AbortError which the orchestrators below silently swallow.
  const closeApplyModal = () => {
    if (applyAbortRef.current) {
      try { applyAbortRef.current.abort(); } catch { /* noop */ }
      applyAbortRef.current = null;
    }
    setApplyJob(null);
    setApplyStage('choose');
    setApplyError(null);
  };

  // Path A — Use my CVPassport CV.
  // Tailor → PDF download → open apply URL → mark applied → toast.
  const onPickStored = async () => {
    const job = applyJob;
    if (!job) return;
    if (hasCv === false) {
      setApplyStage('error');
      setApplyError('No CV on file. Build your CV first, or upload one instead.');
      return;
    }
    const ac = new AbortController();
    applyAbortRef.current = ac;
    try {
      setApplyStage('tailoring');
      // Fallback payload — sent every time, used by the backend only
      // when the scout_matches DB lookup misses (race after a fresh
      // run wipes the table, transient query error, stale match_id
      // in client state). Belt-and-braces: user never sees a 404.
      const fallback = {
        title: job.role || '',
        company: job.company || '',
        location: job.location || '',
        description: job.jdText || '',
        match_score: job.score || 0,
        key_strengths: Array.isArray(job.keyStrengths) ? job.keyStrengths : [],
        missing_requirements: Array.isArray(job.missingRequirements) ? job.missingRequirements : [],
        tailoring_advice: job.why || '',
        ats_keywords: Array.isArray(job.atsKeywords) ? job.atsKeywords : [],
      };
      const json = await authedFetch('/api/scout-tailor', {
        method: 'POST',
        body: JSON.stringify({ match_id: job.id, cv_type: 'specific', fallback }),
        signal: ac.signal,
      });
      if (ac.signal.aborted) return;
      if (!json?.tailored_cv) throw new Error('Tailor returned no CV');

      setApplyStage('rendering');
      const baseName = `${(json.tailored_cv.name || 'CV').replace(/\s+/g, '_')}_for_${(job.company || 'role').replace(/\s+/g, '_')}`;
      await triggerPdfDownload({
        tailoredCv: json.tailored_cv,
        templateId: json.template_id,
        baseName,
        signal: ac.signal,
      });
      if (ac.signal.aborted) return;

      if (job.applyUrl) {
        try { window.open(job.applyUrl, '_blank', 'noopener,noreferrer'); } catch { /* popup blocked */ }
      }

      await updateMatchStatus(job.id, 'applied');
      setToast({
        id: Date.now(),
        message: 'Tailored CV downloaded. Job opened in new tab — upload your CV there.',
      });
      setApplyStage('done');
    } catch (e) {
      if (e?.name === 'AbortError' || ac.signal.aborted) return; // user cancelled
      console.error('[scout] apply (stored) failed:', e);
      setApplyStage('error');
      setApplyError(e?.message || 'Apply failed — please try again.');
    } finally {
      if (applyAbortRef.current === ac) applyAbortRef.current = null;
    }
  };

  // Path B — Upload a CV.
  // Zero API calls, zero Anthropic spend, zero PDF generation. Just open
  // the apply URL in a new tab and let the user upload there. We mark
  // 'saved' so the row stays on the shortlist for follow-up. The file
  // input is wired so the modal accepts a file but we never read it.
  const onPickUpload = async () => {
    const job = applyJob;
    if (!job) return;
    if (job.applyUrl) {
      try { window.open(job.applyUrl, '_blank', 'noopener,noreferrer'); } catch { /* popup blocked */ }
    }
    try {
      await updateMatchStatus(job.id, 'saved');
    } catch { /* status update is best-effort */ }
    setToast({
      id: Date.now(),
      message: 'Job opened in a new tab. Upload your CV there to apply.',
    });
    setApplyStage('done');
  };

  const handleSave = async (job) => {
    await updateMatchStatus(job.id, 'saved');
    setToast({ id: Date.now(), message: 'Saved to shortlist' });
  };

  const handleSkip = async (job) => {
    await updateMatchStatus(job.id, 'ignored');
    setToast({ id: Date.now(), message: 'Skipped' });
    setSelectedId((cur) => (cur === job.id ? null : cur));
  };

  const handleUniversalCv = async () => {
    if (!user) { navigate('/auth'); return; }
    if (!isPro) { navigate('/pricing'); return; }
    if (hasCv === false) {
      setToast({ id: Date.now(), message: 'Build your CV first' });
      return;
    }
    setUniversalRunning(true);
    try {
      await authedFetch('/api/scout-universal', {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setToast({ id: Date.now(), message: 'Universal CV generated · saved to your account' });
    } catch (e) {
      setToast({ id: Date.now(), message: e?.message || 'Universal CV failed' });
    } finally {
      setUniversalRunning(false);
    }
  };

  const copyKeyword = (kw) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(kw).catch(() => {});
    }
    setToast({ id: Date.now(), message: `Copied "${kw}"` });
  };

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 1700);
    return () => clearTimeout(t);
  }, [toast]);

  const showSkeleton = scanState === 'scanning';
  const showAuthGate = !!supabase && user === null;
  const showProGate = !!user && !isPro;
  const showCvGate = !!user && isPro && hasCv === false;
  const gated = showAuthGate || showProGate || showCvGate;
  const showEmpty = !showSkeleton && !gated && visibleJobs.length === 0;
  const showCards = !showSkeleton && !gated && visibleJobs.length > 0;

  const topbarStatusText = scanState === 'scanning'
    ? 'Scout is searching…'
    : scanState === 'complete'
    ? `Just updated · ${visibleJobs.length} matches`
    : visibleJobs.length === 0
    ? 'No matches yet — run Scout to begin'
    : `${visibleJobs.length} matches${lastRunLabel ? ` · ${lastRunLabel}` : ''}`;

  const userEmail = user?.email || '';
  const userInitials = initialsOf(user?.name || user?.email);
  const userPlan = isPro ? 'active-hunter' : 'free';

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
          <div className={`scout-topbar-status scout-topbar-status--${scanState}`}>
            <span className="scout-live-dot" />
            {topbarStatusText}
          </div>
        </div>
        <div className="scout-topbar-right">
          <div className="scout-search">
            <Search size={14} strokeWidth={1.9} />
            <input placeholder="Search Scout" />
          </div>
          <div className="scout-user-wrap">
            <button
              type="button"
              ref={avatarRef}
              className="scout-avatar"
              onClick={() => setUserMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={userMenuOpen}
              aria-label="Open user menu"
            >
              {userInitials}
            </button>
            <UserMenu
              open={userMenuOpen}
              onClose={() => setUserMenuOpen(false)}
              anchorRef={avatarRef}
              email={userEmail || 'Not signed in'}
              plan={userPlan}
              onUniversalCv={handleUniversalCv}
              universalRunning={universalRunning}
            />
          </div>
        </div>
      </header>

      <motion.div
        className="scout-shell"
        animate={{ filter: !isDesktop && overlayOpen ? 'blur(3px)' : 'blur(0px)' }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        {!isMobile && (
          <PreferencesSidebar
            filters={filters}
            setFilters={setFilters}
            onRunScout={runScout}
            onReset={resetFilters}
            scanState={scanState}
            scanMessages={scanMessages}
            sourceCounts={sourceCounts}
            chipCounts={chipCounts}
            cooldownLeft={cooldownLeft}
          />
        )}

        <main className="scout-list">
          <div className="scout-list-head">
            <div>
              <h1 className="scout-list-title">Tonight&apos;s shortlist</h1>
              <p className="scout-list-sub">
                {visibleJobs.length === 0
                  ? 'Run Scout to find matches against your preferences.'
                  : `${visibleJobs.length} matches · ${visibleJobs.filter((j) => j.state === 'direct').length} direct, ${visibleJobs.filter((j) => j.state === 'stretch').length} stretch.`}
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

          {bootError && (
            <div className="scout-empty-state" style={{ padding: '24px' }}>
              <h3>Could not load Scout</h3>
              <p>{bootError}</p>
            </div>
          )}

          <AnimatePresence mode="wait">
            {showAuthGate ? (
              <motion.div
                key="gate-auth"
                className="scout-empty-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="scout-empty-mark scout-empty-mark--big">
                  <Compass size={28} strokeWidth={1.6} />
                </div>
                <h3>Sign in to use Scout</h3>
                <p>Scout matches your CV against live job postings. You&apos;ll need an account to run it.</p>
                <button
                  type="button"
                  className="scout-btn scout-btn--primary"
                  onClick={() => navigate('/auth')}
                >
                  Sign in
                </button>
              </motion.div>
            ) : showProGate ? (
              <motion.div
                key="gate-pro"
                className="scout-empty-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="scout-empty-mark scout-empty-mark--big">
                  <Sparkles size={28} strokeWidth={1.6} />
                </div>
                <h3>Scout is a Pro feature</h3>
                <p>Active Hunter and Career Pro plans unlock Scout. Find live matches every day.</p>
                <button
                  type="button"
                  className="scout-btn scout-btn--primary"
                  onClick={() => navigate('/pricing')}
                >
                  See plans
                </button>
              </motion.div>
            ) : showCvGate ? (
              <motion.div
                key="gate-cv"
                className="scout-empty-state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="scout-empty-mark scout-empty-mark--big">
                  <Briefcase size={28} strokeWidth={1.6} />
                </div>
                <h3>Build your CV first</h3>
                <p>Scout reads your CV to score job matches. Build it once and Scout will use it on every run.</p>
                <button
                  type="button"
                  className="scout-btn scout-btn--primary"
                  onClick={() => navigate('/builder')}
                >
                  Build CV
                </button>
              </motion.div>
            ) : showSkeleton ? (
              <motion.div
                key="skel"
                className="scout-cards-grid"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
              >
                {Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonCard key={i} index={i} />
                ))}
              </motion.div>
            ) : showEmpty ? (
              <EmptyState key="empty" onAdjust={runScout} />
            ) : showCards ? (
              <motion.div
                key="jobs"
                className="scout-cards-grid"
                initial="hidden"
                animate="show"
                variants={{
                  hidden: {},
                  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
                }}
              >
                <AnimatePresence mode="popLayout">
                  {visibleJobs.map((j, i) => (
                    <JobCard
                      key={j.id}
                      job={j}
                      tint={TINTS[i % TINTS.length]}
                      active={selectedId === j.id}
                      onClick={() => handleSelect(j.id)}
                    />
                  ))}
                </AnimatePresence>
              </motion.div>
            ) : null}
          </AnimatePresence>

          {isMobile && !gated && (
            <button
              type="button"
              className={`scout-mobile-pref ${cooldownLeft > 0 && scanState === 'idle' ? 'scout-mobile-pref--cooldown' : ''}`}
              onClick={runScout}
              disabled={scanState === 'scanning' || (cooldownLeft > 0 && scanState === 'idle')}
            >
              {cooldownLeft > 0 && scanState === 'idle' ? (
                <>
                  <Clock size={14} strokeWidth={2} />
                  Run Scout again in {`${Math.floor(cooldownLeft / 60)}:${String(cooldownLeft % 60).padStart(2, '0')}`}
                </>
              ) : (
                <>
                  <Sparkles size={14} strokeWidth={2} />
                  Run Scout
                </>
              )}
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
                onCopyKeyword={copyKeyword}
                onApply={handleApply}
                onSave={handleSave}
                onSkip={handleSkip}
              />
            </AnimatePresence>
          </aside>
        )}
      </motion.div>

      <AnimatePresence>
        {!isDesktop && overlayOpen && selected && (
          <motion.div
            className="scout-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={closeOverlay}
          >
            <motion.div
              className={`scout-overlay ${
                isMobile ? 'scout-overlay--sheet' : 'scout-overlay--rail'
              }`}
              initial={isMobile ? { y: '100%' } : { x: '100%' }}
              animate={isMobile ? { y: 0 } : { x: 0 }}
              exit={isMobile ? { y: '100%' } : { x: '100%' }}
              transition={SPRING}
              onClick={(e) => e.stopPropagation()}
            >
              {isMobile && (
                <div className="scout-sheet-head">
                  <div className="scout-sheet-grip" aria-hidden="true" />
                  <button
                    type="button"
                    className="scout-sheet-close"
                    onClick={closeOverlay}
                    aria-label="Close"
                  >
                    <X size={16} strokeWidth={2} />
                  </button>
                </div>
              )}
              <DetailPanel
                job={selected}
                onClose={closeOverlay}
                isOverlay
                onCopyKeyword={copyKeyword}
                onApply={handleApply}
                onSave={handleSave}
                onSkip={handleSkip}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile-only floating Edit Search button. Hidden mid-scan so it
          doesn't overlay the loading shimmer. Tapping opens the filter
          sheet below. */}
      {isMobile && !gated && scanState !== 'scanning' && (
        <motion.button
          type="button"
          className="scout-mobile-edit-search"
          onClick={() => setMobilePrefOpen(true)}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 12 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <SettingsIcon size={14} strokeWidth={2} />
          Edit Search
        </motion.button>
      )}

      <AnimatePresence>
        {isMobile && mobilePrefOpen && (
          <motion.div
            key="pref-scrim"
            className="scout-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.22 }}
            onClick={() => setMobilePrefOpen(false)}
          >
            <motion.div
              className="scout-overlay scout-overlay--sheet scout-pref-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={SPRING}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="scout-sheet-head">
                <div className="scout-sheet-grip" aria-hidden="true" />
                <button
                  type="button"
                  className="scout-sheet-close"
                  onClick={() => setMobilePrefOpen(false)}
                  aria-label="Close filters"
                >
                  <X size={16} strokeWidth={2} />
                </button>
              </div>
              <PreferencesSidebar
                filters={filters}
                setFilters={setFilters}
                onRunScout={() => { setMobilePrefOpen(false); runScout(); }}
                onReset={resetFilters}
                scanState={scanState}
                scanMessages={scanMessages}
                sourceCounts={sourceCounts}
                chipCounts={chipCounts}
                cooldownLeft={cooldownLeft}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {applyJob && (
          <ApplyModal
            key={`apply-${applyJob.id}`}
            job={applyJob}
            stage={applyStage}
            error={applyError}
            onPickStored={onPickStored}
            onPickUpload={onPickUpload}
            onClose={closeApplyModal}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && <Toast key={toast.id} message={toast.message} />}
      </AnimatePresence>
    </div>
  );
};

/* ---------------------------- styles ---------------------------- */

const ScoutStyle = () => (
  <style>{`
    .scout-root {
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

      /* Direct match indicator — LinkedIn blue, "blue means go" */
      --scout-match-blue: #0A66C2;
      --scout-match-blue-soft: #E7F0FA;
      --scout-match-blue-line: #B8D2EE;

      --scout-amber: #D97706;
      --scout-amber-hover: #B45309;
      --scout-amber-soft: #FCEFE0;

      --scout-shadow-1: 0 1px 2px rgba(20,22,28,0.04);
      --scout-shadow-2: 0 1px 2px rgba(20,22,28,0.05), 0 6px 14px -2px rgba(20,22,28,0.06);
      --scout-shadow-3: 0 1px 3px rgba(20,22,28,0.05), 0 14px 36px rgba(20,22,28,0.08);
      --scout-shadow-card-hover: 0 1px 2px rgba(20,22,28,0.05), 0 16px 32px -10px rgba(20,22,28,0.14);
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
      position: sticky; top: 0; z-index: 10;
      display: flex; align-items: center; justify-content: space-between;
      gap: 24px; padding: 14px 28px;
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
      display: inline-flex; align-items: center; justify-content: center;
      color: #fff;
      background: linear-gradient(135deg, #0E7C5A 0%, #15A074 100%);
      box-shadow: 0 1px 2px rgba(14,124,90,0.25), inset 0 1px 0 rgba(255,255,255,0.18);
    }
    .scout-brand-word { font-size: 17px; font-weight: 700; letter-spacing: -0.01em; color: var(--scout-text); }
    .scout-brand-tag {
      padding: 2px 6px; border-radius: 999px;
      font-size: 9.5px; font-weight: 700; letter-spacing: 0.08em;
      color: var(--scout-amber); background: var(--scout-amber-soft);
    }
    .scout-topbar-status {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 5px 12px 5px 8px;
      border-radius: 999px;
      color: var(--scout-text-dim);
      font-size: 12.5px; font-weight: 500;
      transition: background-color 320ms var(--scout-ease), color 320ms var(--scout-ease), border-color 320ms var(--scout-ease);
      border: 1px solid transparent;
    }
    .scout-topbar-status--complete {
      color: var(--scout-direct);
      background: var(--scout-direct-tint);
      border-color: var(--scout-direct-line);
      animation: scout-flash 1.6s var(--scout-ease);
    }
    @keyframes scout-flash {
      0% { background: var(--scout-direct-soft); }
      50% { background: var(--scout-direct-soft); }
      100% { background: var(--scout-direct-tint); }
    }
    .scout-live-dot {
      width: 7px; height: 7px;
      border-radius: 50%;
      background: var(--scout-direct);
      box-shadow: 0 0 0 0 rgba(14,124,90,0.4);
      animation: scout-pulse 2.4s var(--scout-ease) infinite;
    }
    .scout-topbar-status--scanning .scout-live-dot {
      background: var(--scout-amber);
      animation: scout-pulse-fast 1s var(--scout-ease) infinite;
    }
    @keyframes scout-pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(14,124,90,0.4); } 50% { box-shadow: 0 0 0 6px rgba(14,124,90,0); } }
    @keyframes scout-pulse-fast { 0%, 100% { box-shadow: 0 0 0 0 rgba(217,119,6,0.5); } 50% { box-shadow: 0 0 0 5px rgba(217,119,6,0); } }
    .scout-topbar-right { display: flex; align-items: center; gap: 12px; }
    .scout-search {
      display: inline-flex; align-items: center; gap: 8px;
      padding: 0 12px;
      height: 34px; width: 220px;
      border-radius: 10px;
      background: var(--scout-surface);
      border: 1px solid var(--scout-border);
      color: var(--scout-text-faint);
      transition: border-color 160ms var(--scout-ease), background-color 160ms var(--scout-ease);
    }
    .scout-search:focus-within { border-color: var(--scout-border-strong); background: #fff; color: var(--scout-text-dim); }
    .scout-search input { border: 0; outline: 0; background: transparent; font-size: 13px; width: 100%; color: var(--scout-text); }
    .scout-search input::placeholder { color: var(--scout-text-faint); }
    .scout-avatar {
      width: 34px; height: 34px;
      border-radius: 50%;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 12px; font-weight: 700; letter-spacing: 0.02em;
      color: #fff;
      background: linear-gradient(135deg, #C2410C 0%, #D97706 100%);
      box-shadow: var(--scout-shadow-1);
      cursor: pointer;
      border: 0;
      transition: box-shadow 160ms var(--scout-ease), transform 160ms var(--scout-ease);
    }
    .scout-avatar:hover { box-shadow: 0 1px 2px rgba(20,22,28,0.06), 0 0 0 3px rgba(217,119,6,0.18); }
    .scout-avatar:focus-visible { outline: none; box-shadow: 0 0 0 3px rgba(217,119,6,0.35); }

    /* user menu popover (Claude.ai-style) -------------------------------- */
    .scout-user-wrap { position: relative; }
    .scout-popover {
      position: absolute;
      top: calc(100% + 10px);
      right: 0;
      z-index: 100;
      width: 280px;
      padding: 6px;
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 14px;
      box-shadow:
        0 1px 2px rgba(17,17,17,0.04),
        0 12px 32px -8px rgba(17,17,17,0.18);
      transform-origin: top right;
      color: #111111;
      font-family: var(--scout-font);
    }
    .scout-popover-email {
      padding: 10px 12px 8px;
      font-size: 12px; font-weight: 500;
      color: #6B7280;
      letter-spacing: -0.005em;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .scout-popover-divider {
      height: 1px;
      background: #E5E7EB;
      margin: 4px 0;
    }
    .scout-popover-plan {
      padding: 10px 12px 12px;
      display: flex; flex-direction: column; gap: 4px;
    }
    .scout-plan-head {
      display: inline-flex; align-items: center; gap: 8px;
      font-size: 13px; font-weight: 600; color: #111111;
      letter-spacing: -0.005em;
    }
    .scout-plan-dot {
      width: 8px; height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .scout-plan-dot--green {
      background: #22C55E;
      box-shadow: 0 0 0 3px rgba(34,197,94,0.18);
    }
    .scout-plan-dot--gold {
      background: linear-gradient(135deg, #F4C147 0%, #D49B25 100%);
      box-shadow: 0 0 0 3px rgba(212,155,37,0.22);
    }
    .scout-plan-line {
      font-size: 11.5px; font-weight: 500;
      color: #6B7280;
      padding-left: 16px;
      letter-spacing: -0.005em;
    }

    .scout-popover-item {
      position: relative;
      width: 100%;
      display: inline-flex; align-items: center; gap: 10px;
      padding: 9px 12px;
      border-radius: 9px;
      font-size: 13px; font-weight: 500;
      color: #111111;
      text-align: left;
      letter-spacing: -0.005em;
      transition: background-color 140ms var(--scout-ease), color 140ms var(--scout-ease);
    }
    .scout-popover-item:hover { background: #F3F4F6; }
    .scout-popover-item svg { color: #6B7280; flex-shrink: 0; }
    .scout-popover-item-chev {
      margin-left: auto;
      transform: rotate(-90deg);
      transition: transform 160ms var(--scout-ease);
    }
    .scout-popover-item--upgrade {
      color: #D97706;
      font-weight: 600;
    }
    .scout-popover-item--upgrade svg { color: #D97706; }
    .scout-popover-item--upgrade:hover { background: #FEF3E2; color: #B45309; }
    .scout-popover-item--upgrade:hover svg { color: #B45309; }
    .scout-popover-item--logout { color: #111111; }
    .scout-popover-item--logout:hover { background: #FEF2F2; color: #DC2626; }
    .scout-popover-item--logout:hover svg { color: #DC2626; }

    /* upgrade sub-panel — slides in from the right of the popover --- */
    .scout-upgrade-wrap { position: relative; }
    .scout-upgrade-sub {
      position: absolute;
      top: -6px;
      right: calc(100% + 12px);
      width: 240px;
      padding: 14px;
      background: #FFFFFF;
      border: 1px solid #E5E7EB;
      border-radius: 14px;
      box-shadow:
        0 1px 2px rgba(17,17,17,0.04),
        0 14px 30px -10px rgba(17,17,17,0.18);
      display: flex; flex-direction: column; gap: 10px;
      z-index: 1;
    }
    .scout-upgrade-sub-head {
      display: inline-flex; align-items: center; gap: 8px;
      font-size: 13px; font-weight: 600; color: #111111;
      letter-spacing: -0.005em;
    }
    .scout-upgrade-sub-price {
      font-size: 22px; font-weight: 700; color: #111111;
      letter-spacing: -0.022em;
      font-feature-settings: "tnum" 1, "lnum" 1;
      line-height: 1;
    }
    .scout-upgrade-sub-price span {
      font-size: 12px; font-weight: 500;
      color: #6B7280; margin-left: 4px;
      letter-spacing: -0.005em;
    }
    .scout-upgrade-sub-label {
      font-size: 10.5px; font-weight: 600;
      letter-spacing: 0.06em; text-transform: uppercase;
      color: #9CA3AF;
      margin-top: 2px;
    }
    .scout-upgrade-sub-list {
      list-style: none;
      padding: 0; margin: 0;
      display: flex; flex-direction: column; gap: 6px;
    }
    .scout-upgrade-sub-list li {
      display: inline-flex; align-items: center; gap: 8px;
      font-size: 12px; font-weight: 500;
      color: #374151;
      letter-spacing: -0.005em;
    }
    .scout-upgrade-sub-list svg { color: #15803D; flex-shrink: 0; }
    .scout-upgrade-sub-cta {
      display: inline-flex; align-items: center; justify-content: center; gap: 6px;
      height: 36px;
      border-radius: 10px;
      background: #D97706;
      color: #FFFFFF;
      font-size: 12.5px; font-weight: 600;
      letter-spacing: -0.005em;
      box-shadow: 0 1px 0 rgba(255,255,255,0.18) inset, 0 4px 12px -3px rgba(217,119,6,0.32);
      transition: background-color 160ms var(--scout-ease);
      margin-top: 2px;
    }
    .scout-upgrade-sub-cta:hover { background: #B45309; }

    @media (max-width: 540px) {
      .scout-popover { width: min(300px, calc(100vw - 24px)); right: -4px; }
      .scout-upgrade-sub {
        right: 0;
        top: calc(100% + 8px);
        width: calc(100% - 12px);
      }
    }

    /* shell ------------------------------------------------------------- */
    .scout-shell {
      display: grid;
      grid-template-columns: 280px minmax(0, 1fr) 440px;
      gap: 22px;
      padding: 24px 28px 56px;
      max-width: 1480px;
      margin: 0 auto;
      align-items: start;
    }
    @media (max-width: 1180px) {
      .scout-shell { grid-template-columns: 260px minmax(0, 1fr); gap: 20px; }
    }
    @media (max-width: 768px) {
      .scout-shell { grid-template-columns: 1fr; padding: 16px 14px 96px; gap: 16px; }
    }

    /* sidebar ----------------------------------------------------------- */
    .scout-sidebar {
      position: sticky; top: 80px;
      display: flex; flex-direction: column; gap: 14px;
      padding: 18px;
      border-radius: 14px;
      background: var(--scout-surface);
      border: 1px solid var(--scout-border);
      box-shadow: var(--scout-shadow-1);
    }
    .scout-sidebar-section { display: flex; flex-direction: column; gap: 10px; }
    .scout-sidebar-section--first { gap: 12px; }
    .scout-sidebar-divider {
      height: 1px;
      background: var(--scout-border);
      margin: 2px -2px;
    }
    .scout-sidebar-title {
      font-size: 13px; font-weight: 700; letter-spacing: -0.005em;
      color: var(--scout-text); margin-bottom: 2px;
    }
    .scout-field { display: flex; flex-direction: column; gap: 6px; }
    .scout-field-label {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 12px; font-weight: 500; color: var(--scout-text-dim);
    }
    .scout-input {
      width: 100%; height: 36px;
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
    .scout-input:focus { border-color: var(--scout-amber); box-shadow: 0 0 0 3px var(--scout-amber-soft); }
    .scout-select {
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6' fill='none'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%238B92A1' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
      background-repeat: no-repeat; background-position: right 12px center;
      padding-right: 28px;
    }
    .scout-salary-head { display: inline-flex; align-items: center; justify-content: space-between; width: 100%; gap: 8px; }
    .scout-salary-num { font-size: 12.5px; font-weight: 700; color: var(--scout-text); }
    .scout-slider-wrap { display: flex; flex-direction: column; gap: 4px; padding: 4px 2px 0; }
    .scout-slider {
      width: 100%;
      -webkit-appearance: none; appearance: none;
      background: transparent;
      height: 28px; touch-action: pan-y;
    }
    .scout-slider::-webkit-slider-runnable-track {
      height: 4px; border-radius: 2px;
      background: linear-gradient(90deg, var(--scout-amber) 0%, var(--scout-amber) var(--p, 25%), var(--scout-border) var(--p, 25%));
    }
    .scout-slider::-webkit-slider-thumb {
      -webkit-appearance: none; appearance: none;
      width: 18px; height: 18px;
      border-radius: 50%;
      background: #fff; border: 2.5px solid var(--scout-amber);
      margin-top: -7px;
      box-shadow: 0 1px 3px rgba(20,22,28,0.16);
    }
    .scout-slider::-moz-range-track { height: 4px; background: var(--scout-border); border-radius: 2px; }
    .scout-slider::-moz-range-progress { height: 4px; background: var(--scout-amber); border-radius: 2px; }
    .scout-slider::-moz-range-thumb { width: 18px; height: 18px; border-radius: 50%; background: #fff; border: 2.5px solid var(--scout-amber); }
    .scout-slider-ticks { display: flex; justify-content: space-between; font-size: 10.5px; color: var(--scout-text-faint); font-weight: 500; }
    @media (max-width: 768px) {
      .scout-slider { height: 36px; }
      .scout-slider::-webkit-slider-thumb { width: 24px; height: 24px; margin-top: -10px; }
      .scout-slider::-moz-range-thumb { width: 24px; height: 24px; }
    }

    /* sources chips — bigger, platform-tinted ------------------------- */
    .scout-sources { display: flex; flex-wrap: wrap; gap: 6px; }
    .scout-source {
      padding: 7px 12px;
      font-size: 12.5px; font-weight: 600;
      color: var(--scout-text-dim);
      background: transparent;
      border: 1.5px solid var(--scout-border-strong);
      border-radius: 999px;
      letter-spacing: -0.005em;
      transition: background-color 160ms var(--scout-ease), border-color 160ms var(--scout-ease), color 160ms var(--scout-ease);
    }
    .scout-source--all {
      color: var(--scout-text-dim);
      border-color: var(--scout-border-strong);
    }
    .scout-source--all.is-on {
      background: var(--scout-amber);
      border-color: var(--scout-amber);
      color: #fff;
    }
    .scout-source--all.is-on:hover { background: var(--scout-amber-hover); border-color: var(--scout-amber-hover); }

    /* run scout button -------------------------------------------------- */
    .scout-run {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      height: 42px; padding: 0 16px;
      border-radius: 10px;
      font-size: 13.5px; font-weight: 600; letter-spacing: -0.005em;
      color: #fff;
      background: var(--scout-amber);
      box-shadow:
        0 1px 0 rgba(255,255,255,0.18) inset,
        0 4px 12px -2px rgba(217,119,6,0.30);
      transition: background-color 180ms var(--scout-ease), box-shadow 180ms var(--scout-ease);
    }
    .scout-run:hover { background: var(--scout-amber-hover); }
    .scout-run--scanning { background: var(--scout-amber-hover); cursor: progress; }
    .scout-run--complete { background: var(--scout-direct); box-shadow: 0 1px 0 rgba(255,255,255,0.18) inset, 0 4px 12px -2px rgba(14,124,90,0.32); }
    /* Cooldown — muted warm, same family as the active amber CTA but quieter
       so it reads as "wait" rather than "go". cursor:not-allowed +
       disabled[disabled] handle the input affordance. */
    .scout-run--cooldown {
      background: color-mix(in srgb, var(--scout-amber) 28%, var(--scout-surface) 72%);
      color: var(--scout-text-dim);
      box-shadow: none;
      cursor: not-allowed;
    }
    .scout-run--cooldown:hover { background: color-mix(in srgb, var(--scout-amber) 28%, var(--scout-surface) 72%); }
    .scout-mobile-pref--cooldown {
      background: color-mix(in srgb, var(--scout-amber) 28%, var(--scout-surface) 72%);
      color: var(--scout-text-dim);
      box-shadow: none;
      cursor: not-allowed;
    }
    .scout-run-pulse {
      width: 8px; height: 8px;
      border-radius: 50%;
      background: #fff;
      animation: scout-run-pulse 0.9s var(--scout-ease) infinite;
    }
    @keyframes scout-run-pulse {
      0%, 100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(255,255,255,0.6); }
      50% { transform: scale(0.85); box-shadow: 0 0 0 5px rgba(255,255,255,0); }
    }

    .scout-reset {
      display: inline-flex; align-items: center; justify-content: center; gap: 5px;
      align-self: center;
      padding: 4px 8px;
      font-size: 11.5px; font-weight: 500; color: var(--scout-text-faint);
      transition: color 160ms var(--scout-ease);
    }
    .scout-reset:hover { color: var(--scout-text-dim); }

    /* mini stats ------------------------------------------------------- */
    .scout-mini-stat {
      display: flex; flex-direction: column; gap: 8px;
      padding: 12px;
      border-radius: 12px;
      background: var(--scout-direct-tint);
      border: 1px solid var(--scout-direct-line);
    }
    .scout-mini-stat-row {
      display: inline-flex; align-items: center; gap: 8px;
      color: var(--scout-direct);
      font-size: 12px; font-weight: 600; letter-spacing: -0.005em;
    }
    .scout-mini-stat .scout-live-dot { background: var(--scout-direct); }
    .scout-mini-stat-sources { display: flex; flex-wrap: wrap; gap: 5px; }
    .scout-source-chip {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 2px 7px 2px 2px;
      background: var(--scout-surface);
      border: 1px solid var(--scout-direct-line);
      border-radius: 999px;
      font-size: 10.5px; font-weight: 500;
      color: var(--scout-text-dim);
    }
    .scout-source-mark {
      width: 16px; height: 16px;
      border-radius: 50%;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 9.5px; font-weight: 700;
      color: #fff;
      letter-spacing: 0;
    }
    .scout-source-name { color: var(--scout-text-dim); }
    .scout-source-count { font-weight: 700; color: var(--scout-text); }

    /* list head --------------------------------------------------------- */
    .scout-list { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
    .scout-list-head {
      display: flex; justify-content: space-between; align-items: flex-end;
      gap: 24px;
      padding: 6px 4px 0;
    }
    .scout-list-title {
      margin: 0;
      font-size: 24px; line-height: 1.2;
      font-weight: 700; letter-spacing: -0.018em;
      color: var(--scout-text);
    }
    .scout-list-sub {
      margin: 6px 0 0;
      max-width: 520px;
      color: var(--scout-text-dim);
      font-size: 13.5px; line-height: 1.55;
    }
    .scout-sort { display: inline-flex; align-items: center; gap: 8px; flex-shrink: 0; }
    .scout-sort-label { font-size: 12px; color: var(--scout-text-faint); font-weight: 500; }
    .scout-sort-btn {
      display: inline-flex; align-items: center; gap: 6px;
      height: 32px; padding: 0 12px;
      font-size: 12.5px; font-weight: 500;
      color: var(--scout-text);
      background: var(--scout-surface);
      border: 1px solid var(--scout-border);
      border-radius: 9px;
      transition: border-color 160ms var(--scout-ease);
    }
    .scout-sort-btn:hover { border-color: var(--scout-border-strong); }

    /* job cards — Eclipse-style colored grid --------------------------- */
    .scout-cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 14px;
    }
    @media (max-width: 540px) {
      .scout-cards-grid { grid-template-columns: 1fr; }
    }

    .scout-card {
      position: relative;
      display: flex;
      flex-direction: column;
      gap: 12px;
      width: 100%;
      min-width: 0;
      padding: 16px;
      text-align: left;
      border-radius: 18px;
      border: 1px solid rgba(20,22,28,0.045);
      box-shadow: 0 1px 1px rgba(20,22,28,0.025);
      overflow: hidden;
      will-change: transform;
      transition:
        box-shadow 240ms var(--scout-ease),
        border-color 240ms var(--scout-ease);
    }
    .scout-card:hover {
      box-shadow: var(--scout-shadow-card-hover);
      border-color: rgba(20,22,28,0.06);
    }
    .scout-card.is-active {
      box-shadow:
        0 0 0 2px var(--scout-card-ring),
        var(--scout-shadow-card-hover);
      border-color: transparent;
    }
    .scout-card--direct.is-active { --scout-card-ring: var(--scout-match-blue); }
    .scout-card--stretch.is-active { --scout-card-ring: var(--scout-stretch); }

    .scout-card-head {
      display: flex; justify-content: space-between; align-items: flex-start;
      gap: 12px;
      min-width: 0;
    }
    .scout-logo {
      width: 42px; height: 42px;
      border-radius: 12px;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: 13px; font-weight: 800; letter-spacing: 0.02em;
      flex-shrink: 0;
      box-shadow: 0 1px 0 rgba(255,255,255,0.4) inset, 0 1px 2px rgba(20,22,28,0.06);
    }
    .scout-score-block {
      display: flex; flex-direction: column; align-items: flex-end; gap: 4px;
    }
    .scout-state-pip {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 10.5px; font-weight: 700; letter-spacing: 0.005em;
      border: 1px solid;
      white-space: nowrap;
    }
    .scout-state-pip--direct { color: var(--scout-match-blue); background: var(--scout-match-blue-soft); border-color: var(--scout-match-blue-line); }
    .scout-state-pip--stretch { color: var(--scout-stretch); background: var(--scout-stretch-soft); border-color: var(--scout-stretch-line); }
    .scout-pip-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }

    .scout-score-num {
      display: inline-flex; align-items: baseline;
      line-height: 1; letter-spacing: -0.02em;
      color: var(--scout-text);
      font-feature-settings: "tnum" 1, "lnum" 1;
    }
    .scout-card--direct .scout-score-num { color: var(--scout-match-blue); }
    .scout-card--stretch .scout-score-num { color: var(--scout-stretch); }
    .scout-score-pct { font-size: 0.55em; margin-left: 1px; font-weight: 700; opacity: 0.85; }

    /* card body --------------------------------------------------------- */
    .scout-card-body { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .scout-card-role {
      margin: 0;
      font-size: 16px; font-weight: 700; letter-spacing: -0.018em;
      color: var(--scout-text); line-height: 1.2;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      word-break: break-word;
    }
    .scout-card-company {
      font-size: 12.5px; font-weight: 500;
      color: var(--scout-text-dim);
      letter-spacing: -0.005em;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .scout-skill-row { display: flex; flex-wrap: wrap; gap: 5px; min-width: 0; }
    .scout-skill {
      padding: 3px 9px;
      font-size: 11px; font-weight: 600;
      color: var(--scout-text-dim);
      background: rgba(255,255,255,0.7);
      border: 1px solid rgba(20,22,28,0.05);
      border-radius: 999px;
      white-space: nowrap;
      max-width: 130px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .scout-skill--more { background: transparent; color: var(--scout-text-faint); border-color: transparent; }

    .scout-meta-line {
      display: flex; align-items: center; flex-wrap: wrap; gap: 6px;
      font-size: 11.5px; font-weight: 500;
      color: var(--scout-text-dim);
      min-width: 0;
    }
    .scout-meta-line svg { color: var(--scout-text-faint); flex-shrink: 0; }
    .scout-meta-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    /* Card location/posted block — city in bold above muted posted-time. */
    .scout-card-where {
      display: flex; flex-direction: column; gap: 3px;
      min-width: 0;
    }
    .scout-card-where-city {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 13px; font-weight: 700;
      color: var(--scout-text);
      letter-spacing: -0.01em;
      overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .scout-card-where-city svg {
      color: var(--scout-text-dim); flex-shrink: 0;
    }
    .scout-card-where-when {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 11.5px; font-weight: 500;
      color: var(--scout-text-faint);
    }
    .scout-card-where-when svg { color: var(--scout-text-faint); flex-shrink: 0; }
    .scout-dot {
      width: 3px; height: 3px;
      border-radius: 50%;
      background: var(--scout-text-faint);
      display: inline-block; flex-shrink: 0;
    }

    .scout-card-foot {
      display: flex; flex-direction: column; gap: 2px;
      padding-top: 10px;
      margin-top: 2px;
      border-top: 1px solid rgba(20,22,28,0.06);
      min-width: 0;
    }
    .scout-salary {
      font-size: 16px; font-weight: 700;
      color: var(--scout-text);
      letter-spacing: -0.018em;
      font-feature-settings: "tnum" 1, "lnum" 1;
      line-height: 1.2;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .scout-salary-meta {
      display: inline-flex; align-items: center; gap: 6px; flex-wrap: wrap;
      font-size: 10.5px; font-weight: 500;
      color: var(--scout-text-faint);
    }
    .scout-source-tag {
      padding: 1px 6px;
      border-radius: 5px;
      background: rgba(255,255,255,0.7);
      border: 1px solid rgba(20,22,28,0.06);
      color: var(--scout-text-dim);
      font-size: 10px; font-weight: 600;
      letter-spacing: 0.005em;
      white-space: nowrap;
    }
    .scout-source-tag--inline {
      font-size: 11px; padding: 2px 8px;
      background: var(--scout-surface-tint);
      border: 1px solid var(--scout-border);
    }

    /* skeleton cards (loading) ----------------------------------------- */
    .scout-skeleton-card { background: var(--scout-surface); pointer-events: none; }
    .scout-skel {
      background: linear-gradient(90deg, rgba(20,22,28,0.06) 0%, rgba(20,22,28,0.10) 50%, rgba(20,22,28,0.06) 100%);
      background-size: 200% 100%;
      animation: scout-shimmer 1.4s linear infinite;
      border-radius: 6px;
    }
    @keyframes scout-shimmer {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
    .scout-skel--logo { width: 42px; height: 42px; border-radius: 12px; }
    .scout-skel--line { height: 10px; width: 100%; }
    .scout-skel--pill { width: 64px; height: 22px; border-radius: 999px; }
    .scout-skel--chip { width: 64px; height: 18px; border-radius: 999px; }
    .scout-skel-row { display: flex; gap: 5px; }

    /* empty state ------------------------------------------------------- */
    .scout-empty-state {
      display: flex; flex-direction: column; align-items: center;
      gap: 10px; text-align: center;
      padding: 56px 24px;
      border-radius: 16px;
      background: var(--scout-surface);
      border: 1px dashed var(--scout-border-strong);
    }
    .scout-empty-state h3 {
      margin: 8px 0 0;
      font-size: 17px; font-weight: 700; letter-spacing: -0.018em;
      color: var(--scout-text);
    }
    .scout-empty-state p {
      margin: 0 0 4px;
      max-width: 38ch;
      font-size: 13px; line-height: 1.55;
      color: var(--scout-text-dim);
    }
    .scout-empty-mark {
      width: 52px; height: 52px;
      border-radius: 13px;
      display: inline-flex; align-items: center; justify-content: center;
      color: var(--scout-amber);
      background: var(--scout-amber-soft);
    }
    .scout-empty-mark--big { width: 60px; height: 60px; border-radius: 16px; }

    /* detail panel ------------------------------------------------------ */
    .scout-detail-rail {
      position: sticky; top: 80px;
      max-height: calc(100vh - 100px);
      overflow-y: auto;
      overscroll-behavior: contain;
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
      display: flex; flex-direction: column; align-items: center; text-align: center;
      gap: 10px; padding: 56px 28px;
      color: var(--scout-text-dim);
    }
    .scout-detail-empty h4 { margin: 4px 0 0; font-size: 15px; font-weight: 600; color: var(--scout-text); }
    .scout-detail-empty p { margin: 0; font-size: 12.5px; max-width: 32ch; line-height: 1.55; }

    .scout-detail { display: flex; flex-direction: column; gap: 18px; position: relative; }
    .scout-detail-head {
      display: flex; align-items: flex-start; justify-content: space-between;
      gap: 16px;
      padding-bottom: 14px;
      position: relative;
    }
    .scout-detail-head-left { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
    .scout-detail-role {
      margin: 4px 0 0;
      font-size: 20px; font-weight: 700; letter-spacing: -0.02em;
      color: var(--scout-text); line-height: 1.2;
    }
    .scout-detail-company {
      font-size: 13.5px; font-weight: 600;
      color: var(--scout-text); letter-spacing: -0.005em;
    }
    .scout-detail-meta {
      display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap;
      font-size: 12.5px; color: var(--scout-text-dim);
    }
    .scout-detail-sub {
      display: inline-flex; align-items: center; gap: 8px; flex-wrap: wrap;
      margin-top: 4px;
      font-size: 11.5px; font-weight: 500;
      color: var(--scout-text-faint);
    }
    .scout-detail-close {
      position: absolute; top: -2px; right: -2px;
      width: 30px; height: 30px;
      border-radius: 8px;
      color: var(--scout-text-dim);
      background: var(--scout-surface-tint);
      border: 1px solid var(--scout-border);
      display: inline-flex; align-items: center; justify-content: center;
      transition: color 160ms var(--scout-ease), border-color 160ms var(--scout-ease);
    }
    .scout-detail-close:hover { color: var(--scout-text); border-color: var(--scout-border-strong); }

    .scout-ring-wrap { position: relative; flex-shrink: 0; }
    .scout-ring-inner {
      position: absolute; inset: 0;
      display: inline-flex; align-items: center; justify-content: center;
    }
    .scout-detail .scout-ring-wrap .scout-score-num { color: var(--scout-text); }

    /* sections ---------------------------------------------------------- */
    .scout-section { display: flex; flex-direction: column; gap: 10px; }
    .scout-section-title {
      margin: 0;
      font-size: 11.5px; font-weight: 600; letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--scout-text-faint);
    }
    .scout-detail-why {
      margin: 0;
      font-size: 13.5px; line-height: 1.6;
      color: var(--scout-text); letter-spacing: -0.005em;
    }
    .scout-detail-why--soft { color: var(--scout-text-dim); margin-top: 2px; }

    .scout-breakdown { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .scout-stat-card {
      display: flex; flex-direction: column; gap: 4px;
      padding: 12px 14px;
      border-radius: 12px;
      background: var(--scout-surface);
      border: 1px solid var(--scout-border);
    }
    .scout-stat-card--good { background: var(--scout-direct-tint); border-color: var(--scout-direct-line); }
    .scout-stat-card--okay { background: var(--scout-stretch-tint); border-color: var(--scout-stretch-line); }
    .scout-stat-card--low { background: var(--scout-surface-tint); border-color: var(--scout-border); }
    .scout-stat-label { font-size: 11.5px; font-weight: 500; color: var(--scout-text-dim); }
    .scout-stat-value .scout-score-num { color: var(--scout-text); font-weight: 700; }
    .scout-stat-card--good .scout-stat-value .scout-score-num { color: var(--scout-direct); }
    .scout-stat-card--okay .scout-stat-value .scout-score-num { color: var(--scout-stretch); }
    .scout-stat-note { font-size: 11px; font-weight: 500; color: var(--scout-text-faint); letter-spacing: -0.005em; }
    .scout-stat-card--good .scout-stat-note { color: var(--scout-direct); opacity: 0.8; }
    .scout-stat-card--okay .scout-stat-note { color: var(--scout-stretch); opacity: 0.8; }

    /* original-job-posting link (under the action bar) ----------------- */
    .scout-detail-job-link {
      display: inline-flex; align-items: center; gap: 6px;
      margin: 4px 0 18px;
      font-size: 12px; font-weight: 500;
      color: #6B7280;
      text-decoration: none;
      transition: color 160ms var(--scout-ease);
    }
    .scout-detail-job-link:hover {
      color: var(--scout-text);
      text-decoration: underline;
    }
    .scout-detail-job-link svg { color: inherit; }

    /* gap list (replaces the old "CV tweaks" before/after) ------------- */
    .scout-gap-list {
      list-style: none; margin: 0; padding: 0;
      display: flex; flex-direction: column; gap: 8px;
    }
    .scout-gap-list li {
      padding: 10px 14px;
      border-radius: 10px;
      background: var(--scout-surface-tint);
      border: 1px solid var(--scout-border);
      font-size: 13px; line-height: 1.55;
      color: var(--scout-text);
      position: relative; padding-left: 28px;
    }
    .scout-gap-list li::before {
      content: '';
      position: absolute; left: 12px; top: 16px;
      width: 6px; height: 6px; border-radius: 50%;
      background: var(--scout-stretch);
    }

    /* tweaks ------------------------------------------------------------ */
    .scout-tweaks { display: flex; flex-direction: column; gap: 10px; }
    .scout-tweak {
      padding: 12px 14px;
      border-radius: 12px;
      background: var(--scout-surface-tint);
      border: 1px solid var(--scout-border);
      display: flex; flex-direction: column; gap: 8px;
    }
    .scout-tweak-field {
      font-size: 11px; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase;
      color: var(--scout-text-faint);
    }
    .scout-tweak-rows { display: flex; flex-direction: column; gap: 6px; }
    .scout-tweak-row { display: flex; gap: 10px; align-items: flex-start; font-size: 13px; line-height: 1.55; }
    .scout-tweak-tag {
      flex-shrink: 0;
      padding: 2px 7px;
      font-size: 9.5px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
      border-radius: 6px;
      margin-top: 2px;
    }
    .scout-tweak-row--before .scout-tweak-tag { background: var(--scout-surface); color: var(--scout-text-faint); border: 1px solid var(--scout-border); }
    .scout-tweak-row--before .scout-tweak-text {
      color: var(--scout-text-faint);
      text-decoration: line-through;
      text-decoration-color: rgba(139,146,161,0.45);
      text-decoration-thickness: 1px;
    }
    .scout-tweak-row--after .scout-tweak-tag { background: var(--scout-direct-soft); color: var(--scout-direct); }
    .scout-tweak-row--after .scout-tweak-text { color: var(--scout-text); font-weight: 500; }

    /* keywords ---------------------------------------------------------- */
    .scout-kw-group { display: flex; flex-direction: column; gap: 8px; margin-bottom: 10px; }
    .scout-kw-group:last-child { margin-bottom: 0; }
    .scout-kw-label { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 600; letter-spacing: 0.005em; }
    .scout-kw-label--ok { color: var(--scout-direct); }
    .scout-kw-label--miss { color: var(--scout-stretch); }
    .scout-kw-row { display: flex; flex-wrap: wrap; gap: 6px; }
    .scout-kw {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 4px 10px;
      font-size: 11.5px; font-weight: 500;
      border-radius: 999px;
      letter-spacing: -0.005em;
    }
    .scout-kw--ok { color: var(--scout-direct); background: var(--scout-direct-soft); border: 1px solid var(--scout-direct-line); }
    .scout-kw--miss {
      color: var(--scout-stretch);
      background: var(--scout-stretch-soft);
      border: 1px dashed var(--scout-stretch-line);
      cursor: pointer;
      transition: background-color 140ms var(--scout-ease), border-color 140ms var(--scout-ease);
    }
    button.scout-kw--miss:hover { background: #FCE5C0; border-style: solid; }

    /* actions — moved to top of detail panel --------------------------- */
    .scout-detail-actions {
      display: grid; grid-template-columns: 1fr auto auto; gap: 8px;
    }
    .scout-detail-actions--top {
      padding-bottom: 18px;
      border-bottom: 1px solid var(--scout-border);
    }
    .scout-btn {
      display: inline-flex; align-items: center; justify-content: center; gap: 8px;
      height: 40px; padding: 0 14px;
      border-radius: 10px;
      font-size: 13px; font-weight: 600; letter-spacing: -0.005em;
      transition: background-color 180ms var(--scout-ease), border-color 180ms var(--scout-ease), color 180ms var(--scout-ease);
    }
    .scout-btn--primary {
      color: #fff;
      background: var(--scout-amber);
      box-shadow: 0 1px 0 rgba(255,255,255,0.15) inset, 0 4px 14px -4px rgba(217,119,6,0.32);
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
      align-items: center; justify-content: center; gap: 8px;
      height: 44px; border-radius: 11px;
      background: var(--scout-amber); color: #fff;
      font-weight: 600; font-size: 13px;
      box-shadow: 0 4px 14px -4px rgba(217,119,6,0.35);
    }
    @media (max-width: 768px) { .scout-mobile-pref { display: inline-flex; } }

    /* overlay (tablet rail / mobile sheet) ----------------------------- */
    .scout-scrim {
      position: fixed; inset: 0; z-index: 40;
      background: rgba(27,31,42,0.32);
      backdrop-filter: blur(6px);
      -webkit-backdrop-filter: blur(6px);
    }
    .scout-overlay {
      position: absolute;
      background: var(--scout-surface);
      border: 1px solid var(--scout-border);
      box-shadow: var(--scout-shadow-3);
      overflow-y: auto;
      overscroll-behavior: contain;
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
      padding: 0 18px 28px;
      border-radius: 18px 18px 0 0;
    }
    .scout-sheet-head {
      position: sticky; top: 0; z-index: 1;
      background: var(--scout-surface);
      padding: 10px 0 8px;
      display: flex; align-items: center; justify-content: center;
    }
    .scout-sheet-grip {
      width: 40px; height: 4px;
      background: var(--scout-border-strong);
      border-radius: 2px;
    }
    .scout-sheet-close {
      position: absolute; right: 0; top: 6px;
      width: 32px; height: 32px;
      border-radius: 9px;
      color: var(--scout-text-dim);
      background: var(--scout-surface-tint);
      border: 1px solid var(--scout-border);
      display: inline-flex; align-items: center; justify-content: center;
    }

    /* mobile filter sheet ----------------------------------------------- */
    /* The PreferencesSidebar is built for a desktop column with sticky
       positioning + its own card chrome. Inside the sheet we strip those
       so it reads as a single continuous panel. */
    .scout-pref-sheet { right: 0 !important; padding-right: 18px; }
    .scout-pref-sheet .scout-sidebar {
      position: static;
      top: auto;
      padding: 0;
      border: 0;
      background: transparent;
      box-shadow: none;
    }
    /* mobile floating Edit Search FAB ----------------------------------- */
    .scout-mobile-edit-search { display: none; }
    @media (max-width: 768px) {
      .scout-mobile-edit-search {
        position: fixed;
        left: 50%;
        bottom: 18px;
        transform: translateX(-50%);
        z-index: 35;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        height: 44px;
        padding: 0 18px;
        border-radius: 999px;
        background: var(--scout-text);
        color: #fff;
        font-weight: 600;
        font-size: 13.5px;
        letter-spacing: -0.005em;
        box-shadow: 0 10px 28px -8px rgba(0,0,0,0.32), 0 2px 6px -2px rgba(0,0,0,0.18);
      }
      .scout-mobile-edit-search:active { transform: translateX(-50%) scale(0.97); }
    }

    /* apply modal ------------------------------------------------------- */
    .scout-apply-scrim {
      position: fixed; inset: 0;
      background: rgba(20,22,28,0.45);
      backdrop-filter: blur(2px);
      -webkit-backdrop-filter: blur(2px);
      display: flex; align-items: center; justify-content: center;
      z-index: 80;
      padding: 24px;
    }
    .scout-apply-modal {
      position: relative;
      width: 100%; max-width: 480px;
      background: var(--scout-surface);
      border-radius: 16px;
      box-shadow: 0 24px 64px -12px rgba(20,22,28,0.35), 0 2px 6px rgba(20,22,28,0.10);
      padding: 28px 24px 22px;
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      max-height: calc(100vh - 48px);
      overflow-y: auto;
    }
    .scout-apply-close {
      position: absolute; top: 14px; right: 14px;
      background: transparent; border: none;
      width: 28px; height: 28px;
      border-radius: 50%;
      display: inline-flex; align-items: center; justify-content: center;
      color: var(--scout-text-faint); cursor: pointer;
      transition: background-color 160ms var(--scout-ease), color 160ms var(--scout-ease);
    }
    .scout-apply-close:hover:not(:disabled) {
      background: var(--scout-surface-tint); color: var(--scout-text);
    }
    .scout-apply-close:disabled { opacity: 0.4; cursor: default; }
    .scout-apply-head { margin-bottom: 18px; padding-right: 28px; }
    .scout-apply-title {
      font-size: 18px; font-weight: 700; letter-spacing: -0.012em;
      color: var(--scout-text);
    }
    .scout-apply-sub {
      margin-top: 4px;
      font-size: 13px; color: var(--scout-text-dim);
    }
    .scout-apply-sub strong { color: var(--scout-text); font-weight: 700; }

    .scout-apply-options { display: flex; flex-direction: column; gap: 10px; }
    .scout-apply-option {
      width: 100%;
      display: flex; align-items: center; gap: 14px;
      padding: 14px 16px;
      border-radius: 12px;
      background: var(--scout-surface-tint);
      border: 1px solid var(--scout-border);
      text-align: left;
      cursor: pointer;
      font-family: inherit;
      transition: background-color 160ms var(--scout-ease), border-color 160ms var(--scout-ease), transform 120ms var(--scout-ease);
    }
    .scout-apply-option:hover { background: #FFFFFF; border-color: var(--scout-border-strong); transform: translateY(-1px); }
    .scout-apply-option:active { transform: translateY(0); }
    .scout-apply-option--primary {
      background: linear-gradient(135deg, #FFFFFF 0%, #FBF8F3 100%);
      border-color: var(--scout-match-blue, #0A66C2);
      box-shadow: 0 0 0 3px rgba(10,102,194,0.08);
    }
    .scout-apply-option-icon {
      flex-shrink: 0;
      width: 36px; height: 36px;
      border-radius: 9px;
      background: var(--scout-surface);
      border: 1px solid var(--scout-border);
      display: inline-flex; align-items: center; justify-content: center;
      color: var(--scout-text);
    }
    .scout-apply-option--primary .scout-apply-option-icon {
      background: var(--scout-match-blue, #0A66C2);
      border-color: var(--scout-match-blue, #0A66C2);
      color: #FFFFFF;
    }
    .scout-apply-option-body { flex: 1; min-width: 0; }
    .scout-apply-option-title {
      font-size: 14px; font-weight: 700;
      color: var(--scout-text);
      letter-spacing: -0.01em;
    }
    .scout-apply-option-desc {
      margin-top: 2px;
      font-size: 12px; color: var(--scout-text-dim);
      line-height: 1.45;
    }
    .scout-apply-option-arrow { color: var(--scout-text-faint); flex-shrink: 0; }
    .scout-apply-option:hover .scout-apply-option-arrow { color: var(--scout-text); }

    .scout-apply-foot-note {
      margin: 14px 0 0;
      font-size: 11.5px; color: var(--scout-text-faint);
      text-align: center;
    }

    .scout-apply-progress {
      display: flex; flex-direction: column; align-items: center; gap: 14px;
      padding: 28px 8px 14px;
    }
    .scout-apply-spinner {
      color: var(--scout-match-blue, #0A66C2);
      animation: scout-apply-spin 1s linear infinite;
      display: inline-flex;
    }
    @keyframes scout-apply-spin { to { transform: rotate(360deg); } }
    @media (prefers-reduced-motion: reduce) {
      .scout-apply-spinner { animation: none; }
    }
    .scout-apply-progress-text {
      font-size: 14px; font-weight: 600; color: var(--scout-text);
      letter-spacing: -0.005em;
      text-align: center; min-height: 22px;
    }
    .scout-apply-progress-sub {
      font-size: 12px; color: var(--scout-text-faint);
    }

    .scout-apply-done {
      display: flex; flex-direction: column; align-items: center; gap: 10px;
      padding: 14px 8px 4px;
      text-align: center;
    }
    .scout-apply-done-mark {
      width: 44px; height: 44px;
      border-radius: 50%;
      background: var(--scout-direct, #0F8B5C);
      color: #FFFFFF;
      display: inline-flex; align-items: center; justify-content: center;
    }
    .scout-apply-done-title {
      font-size: 16px; font-weight: 700; color: var(--scout-text);
      letter-spacing: -0.01em;
    }
    .scout-apply-done-sub {
      font-size: 13px; color: var(--scout-text-dim);
      line-height: 1.5; max-width: 320px;
    }
    .scout-apply-done .scout-btn { margin-top: 10px; }

    .scout-apply-error {
      display: flex; flex-direction: column; align-items: center; gap: 8px;
      padding: 16px 8px 4px;
      text-align: center;
    }
    .scout-apply-error-title {
      font-size: 15px; font-weight: 700; color: var(--scout-text);
    }
    .scout-apply-error-sub {
      font-size: 13px; color: var(--scout-text-dim);
      line-height: 1.5; max-width: 360px;
    }
    .scout-apply-error .scout-btn { margin-top: 8px; }

    /* toast ------------------------------------------------------------- */
    .scout-toast {
      position: fixed; z-index: 100;
      bottom: 28px; right: 28px;
      display: inline-flex; align-items: center; gap: 8px;
      padding: 10px 14px;
      border-radius: 10px;
      background: var(--scout-text);
      color: #FFFEF8;
      font-size: 12.5px; font-weight: 600; letter-spacing: -0.005em;
      box-shadow: 0 10px 28px -8px rgba(20,22,28,0.30), 0 1px 2px rgba(20,22,28,0.18);
    }
    .scout-toast svg { color: #4FE1A6; }
    @media (max-width: 540px) {
      .scout-toast { left: 18px; right: 18px; bottom: 18px; justify-content: center; }
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
      .scout-card-role { font-size: 15.5px; }
      .scout-salary { font-size: 15.5px; }
      .scout-detail-actions { grid-template-columns: 1fr; }
    }
  `}</style>
);

export default ScoutDashboard;
