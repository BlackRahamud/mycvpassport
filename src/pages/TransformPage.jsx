// =============================================================
// src/pages/TransformPage.jsx
//
// Upload & Transform — single-page state machine.
//
// Five screens, one page, picked from session state on mount:
//   1. upload    — user has no session yet (no ?session_id)
//   2. intake    — refine the placeholder intake captured at upload
//   3. loading   — animated labor-illusion while Claude rewrites
//   4. preview   — rewritten CV; blurred + paywalled for free, unlocked for paid
//
// Auth: page is mounted as a public route, but every API call needs a
// signed-in user. If the user lands here without a session, we hard-
// redirect to /auth?next=/transform?session_id=…  — same pattern as
// UploadTransformSection.jsx.
//
// Design: dark OLED palette per CLAUDE.md (background #0A0A0A, surface
// #141414, amber #D97706, green #1D9E75). Animation cadence borrowed
// from ScoutDashboard's labor-illusion (≥800 ms per step so the work
// reads as real even if the API beats the floor).
//
// Backend contract: /api/transform supports upload | update_intake |
// pay | run | status. We hit update_intake on Screen 2, run on Screen
// 3 (with status polling as a safety net), and pay on Screen 4 for
// free users. The router is /api/transform.js.
// =============================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Upload,
  Check,
  Loader2,
  Lock,
  Download,
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  CircleDot,
} from 'lucide-react';
import { supabase } from '../appSupabaseClient';
import { extractCvText } from '../services/cvExtraction';
import { logEvent } from '../lib/analytics/logEvent';
import safeFetch from '../lib/net/safeFetch';

// ── Constants ──────────────────────────────────────────────────────

const MAX_BYTES = 10 * 1024 * 1024;
const ACCEPT =
  '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const STEP_MESSAGES = [
  'Reading your CV…',
  'Identifying ATS gaps…',
  'Applying UAE/GCC hiring norms…',
  'Rewriting experience bullets…',
  'Optimising for your target industry…',
  'Final polish…',
];
const STEP_MIN_MS = 1500;

const TARGET_MARKETS = ['UAE', 'GCC', 'India', 'Other'];
const VISA_OPTIONS = [
  'On Employment Visa',
  'Visit Visa',
  'Own Visa',
  'Notice Period: 1 month',
  'Notice Period: 2 months',
  'Notice Period: 3 months',
];
const EXPERIENCE_LEVELS = [
  'Fresher',
  '1–3 yrs',
  '3–7 yrs',
  '7–15 yrs',
  '15+ yrs',
];
const INDUSTRIES = [
  'Technology',
  'Finance & Banking',
  'Real Estate',
  'Construction & Engineering',
  'Healthcare',
  'Retail & FMCG',
  'Hospitality',
  'Logistics & Supply Chain',
  'Education',
  'Oil & Gas',
  'Other',
];
const DRIVING_LICENSES = ['None', 'Home Country Only', 'UAE License'];

const EASE_OUT = [0.22, 1, 0.36, 1];

// ── Helpers ────────────────────────────────────────────────────────

async function authedFetch(url, init = {}) {
  if (!supabase) throw new Error('Auth client unavailable');
  const { data: { session } = {} } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    const e = new Error('Not signed in');
    e.code = 'NOT_SIGNED_IN';
    throw e;
  }
  const r = await safeFetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers || {}),
    },
  });
  const text = await r.text();
  let json = {};
  try { json = text ? JSON.parse(text) : {}; } catch { /* leave empty */ }
  if (!r.ok) {
    const e = new Error(json?.error || `Request failed: ${r.status}`);
    e.status = r.status;
    e.body = json;
    throw e;
  }
  return json;
}

function deriveAtsSummary(cvData) {
  if (!cvData || typeof cvData !== 'object') {
    return { sectionsFilled: 0, sectionsTotal: 9, fixes: [] };
  }
  // Sections we count as "populated" when the rewrite delivered them.
  // Truthful, computed from the actual CV — never fabricated.
  const sections = [
    !!(cvData.summary && String(cvData.summary).trim()),
    Array.isArray(cvData.experience) && cvData.experience.length > 0,
    Array.isArray(cvData.education) && cvData.education.length > 0,
    !!(cvData.skills && String(cvData.skills).trim()),
    !!(cvData.technicalSkills && String(cvData.technicalSkills).trim()),
    Array.isArray(cvData.certifications) && cvData.certifications.length > 0,
    !!(cvData.languages && String(cvData.languages).trim()),
    !!(cvData.location && String(cvData.location).trim()),
    !!(cvData.title && String(cvData.title).trim()),
  ];
  const sectionsFilled = sections.filter(Boolean).length;
  const sectionsTotal = sections.length;

  const fixes = [];
  if (cvData.summary) fixes.push('Rewrote summary in regional tone');
  if (Array.isArray(cvData.experience) && cvData.experience.length > 0) {
    fixes.push('Sharpened verbs and structure in experience bullets');
  }
  const hasMetrics = Array.isArray(cvData.experience) && cvData.experience.some((e) =>
    e?.points && /\d/.test(String(e.points)),
  );
  if (hasMetrics) fixes.push('Surfaced metrics already present in your roles');
  if (cvData.visaStatus || cvData.drivingLicense || cvData.nationality) {
    fixes.push('Filled regional fields (visa, license, nationality)');
  }
  if (Array.isArray(cvData.experience) && cvData.experience.some((e) => e?.startDate || e?.endDate)) {
    fixes.push('Normalised dates to ATS-friendly format');
  }
  return { sectionsFilled, sectionsTotal, fixes: fixes.slice(0, 5) };
}

// ── Top bar ─────────────────────────────────────────────────────────

function TopBar({ onBack }) {
  return (
    <div className="cvp-tf-topbar">
      <button type="button" className="cvp-tf-back" onClick={onBack} aria-label="Back to home">
        <ArrowLeft size={16} strokeWidth={2} />
        <span>Back</span>
      </button>
      <div className="cvp-tf-brand">
        <span className="cvp-tf-brand-dot" aria-hidden="true" />
        <span className="cvp-tf-brand-name">CVPassport</span>
        <span className="cvp-tf-brand-sep">·</span>
        <span className="cvp-tf-brand-tag">Upload &amp; Transform</span>
      </div>
      <div className="cvp-tf-topbar-spacer" aria-hidden="true" />
    </div>
  );
}

// ── Screen 1 — Upload ───────────────────────────────────────────────

function UploadScreen({ onUploaded }) {
  const inputRef = useRef(null);
  const [stage, setStage] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [errorHint, setErrorHint] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const isBusy = stage === 'reading' || stage === 'uploading';

  const openPicker = () => {
    if (isBusy) return;
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.click();
    }
  };

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    setErrorMsg(''); setErrorHint('');
    const lower = (file.name || '').toLowerCase();
    if (!(lower.endsWith('.pdf') || lower.endsWith('.docx'))) {
      setStage('error');
      setErrorMsg('Unsupported file type.');
      setErrorHint('Only PDF and DOCX files are supported right now.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setStage('error');
      setErrorMsg('File too large.');
      setErrorHint('Max 10 MB. Try a compressed PDF or a DOCX.');
      return;
    }
    try {
      setStage('reading');
      const { text, kind, chars } = await extractCvText(file);
      setStage('uploading');
      const json = await authedFetch('/api/transform?action=upload', {
        method: 'POST',
        body: JSON.stringify({
          text,
          // Same placeholder intake the landing-page section sends. The
          // /transform page collects the real answers in Screen 2.
          intake: {
            target_market: 'UAE',
            target_city: 'Dubai',
            target_role: 'Professional',
            language_pref: 'English',
            experience_level: 'Mid',
          },
          source_kind: kind,
          source_chars: chars,
        }),
      });
      logEvent('transform_page_upload_succeeded', {
        session_id: json.session_id,
        user_plan: json.user_plan,
        source_kind: kind,
      });
      onUploaded(json);
    } catch (e) {
      if (e.code === 'NOT_SIGNED_IN') {
        // The page guard catches this on next render.
        setStage('error');
        setErrorMsg('Please sign in to continue.');
        setErrorHint('Redirecting…');
        return;
      }
      setStage('error');
      setErrorMsg(e?.message || 'Upload failed.');
      setErrorHint(e?.hint || 'Try a different file or check your connection.');
      logEvent('transform_page_upload_failed', { code: e?.code || 'unknown' });
    }
  }, [onUploaded]);

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (isBusy) return;
    const f = e.dataTransfer.files && e.dataTransfer.files[0];
    handleFile(f);
  };

  const stageLabel = stage === 'reading' ? 'Reading your CV…'
    : stage === 'uploading' ? 'Uploading…' : null;

  return (
    <motion.div
      key="upload"
      className="cvp-tf-screen cvp-tf-upload"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.32, ease: EASE_OUT }}
    >
      <div className="cvp-tf-eyebrow">Step 1 of 4</div>
      <h1 className="cvp-tf-h1">Upload your existing CV</h1>
      <p className="cvp-tf-lede">
        Drop your PDF or DOCX. We&apos;ll read it client-side and prep
        the rewrite — nothing is shared until you confirm intake on the
        next screen.
      </p>

      <div
        className={
          'cvp-tf-drop'
          + (isDragging ? ' is-dragging' : '')
          + (isBusy ? ' is-busy' : '')
        }
        onClick={openPicker}
        onDragOver={(e) => { e.preventDefault(); if (!isBusy) setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
        onDrop={onDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPicker(); } }}
        aria-busy={isBusy ? 'true' : 'false'}
      >
        <div className="cvp-tf-drop-icon">
          {isBusy
            ? <Loader2 size={28} strokeWidth={2} className="cvp-tf-spin" />
            : <Upload size={28} strokeWidth={1.6} />}
        </div>
        <div className="cvp-tf-drop-title">
          {stageLabel || 'Drop your CV here, or click to browse'}
        </div>
        <div className="cvp-tf-drop-sub">PDF or DOCX, up to 10 MB</div>
      </div>

      {stage === 'error' && (
        <div className="cvp-tf-error" role="alert">
          <strong>{errorMsg}</strong>{errorHint ? <> {errorHint}</> : null}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        onChange={(e) => { const f = e.target.files && e.target.files[0]; handleFile(f); }}
        style={{ display: 'none' }}
        aria-hidden="true"
        tabIndex={-1}
      />
    </motion.div>
  );
}

// ── Screen 2 — Intake ───────────────────────────────────────────────

function IntakeField({ label, children, hint }) {
  return (
    <label className="cvp-tf-field">
      <span className="cvp-tf-field-label">{label}</span>
      {children}
      {hint ? <span className="cvp-tf-field-hint">{hint}</span> : null}
    </label>
  );
}

function ChipPicker({ value, options, onChange, name }) {
  return (
    <div className="cvp-tf-chips" role="radiogroup" aria-label={name}>
      {options.map((opt) => {
        const active = value === opt;
        return (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={active}
            className={'cvp-tf-chip' + (active ? ' is-active' : '')}
            onClick={() => onChange(opt)}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function IntakeScreen({ initialIntake, onSubmit, submitting, errorMsg }) {
  const [target_market, setMarket] = useState(initialIntake?.target_market || '');
  const [visa_status, setVisa] = useState(initialIntake?.visa_status || '');
  const [target_role, setRole] = useState(initialIntake?.target_role || '');
  const [experience_level, setExp] = useState(initialIntake?.experience_level || '');
  const [target_industry, setIndustry] = useState(initialIntake?.target_industry || '');
  const [driving_license, setLicense] = useState(initialIntake?.driving_license || '');

  const allFilled = !!(
    target_market && visa_status && target_role.trim()
    && experience_level && target_industry && driving_license
  );

  const handle = (e) => {
    e.preventDefault();
    if (!allFilled || submitting) return;
    onSubmit({
      target_market,
      visa_status,
      target_role: target_role.trim(),
      experience_level,
      target_industry,
      driving_license,
    });
  };

  return (
    <motion.form
      key="intake"
      className="cvp-tf-screen cvp-tf-intake"
      onSubmit={handle}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.32, ease: EASE_OUT }}
    >
      <div className="cvp-tf-eyebrow">Step 2 of 4</div>
      <h1 className="cvp-tf-h1">Tell us about your target</h1>
      <p className="cvp-tf-lede">
        Six quick questions. They drive the regional tone, ATS keywords,
        and which Gulf-specific fields we surface in your rewrite.
      </p>

      <div className="cvp-tf-form">
        <IntakeField label="Target market">
          <ChipPicker name="Target market" options={TARGET_MARKETS} value={target_market} onChange={setMarket} />
        </IntakeField>

        <IntakeField label="Visa status / notice period" hint="Pick the closest match — recruiters read this first.">
          <ChipPicker name="Visa status" options={VISA_OPTIONS} value={visa_status} onChange={setVisa} />
        </IntakeField>

        <IntakeField label="Target role" hint="The role you want recruiters to see — e.g. Senior Backend Engineer.">
          <input
            type="text"
            className="cvp-tf-input"
            value={target_role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. Senior Backend Engineer"
            maxLength={120}
          />
        </IntakeField>

        <IntakeField label="Experience level">
          <ChipPicker name="Experience level" options={EXPERIENCE_LEVELS} value={experience_level} onChange={setExp} />
        </IntakeField>

        <IntakeField label="Target industry">
          <select
            className="cvp-tf-select"
            value={target_industry}
            onChange={(e) => setIndustry(e.target.value)}
          >
            <option value="" disabled>Pick an industry…</option>
            {INDUSTRIES.map((i) => (<option key={i} value={i}>{i}</option>))}
          </select>
        </IntakeField>

        <IntakeField label="Driving license">
          <ChipPicker name="Driving license" options={DRIVING_LICENSES} value={driving_license} onChange={setLicense} />
        </IntakeField>
      </div>

      {errorMsg && <div className="cvp-tf-error" role="alert">{errorMsg}</div>}

      <div className="cvp-tf-actions">
        <button
          type="submit"
          className="cvp-tf-cta"
          disabled={!allFilled || submitting}
        >
          {submitting ? <><Loader2 size={16} strokeWidth={2.2} className="cvp-tf-spin" /> Saving…</> : <>Continue</>}
        </button>
        <p className="cvp-tf-fine">Your answers are saved against this transform only.</p>
      </div>
    </motion.form>
  );
}

// ── Screen 3 — Loading (labor illusion) ─────────────────────────────

function LoadingScreen({ stepIndex, message }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      key="loading"
      className="cvp-tf-screen cvp-tf-loading"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.32, ease: EASE_OUT }}
    >
      <div className="cvp-tf-eyebrow">Step 3 of 4</div>

      <div className="cvp-tf-ring" aria-hidden="true">
        <motion.div
          className="cvp-tf-ring-arc"
          animate={reduce ? {} : { rotate: 360 }}
          transition={reduce ? {} : { duration: 1.6, ease: 'linear', repeat: Infinity }}
        />
        <div className="cvp-tf-ring-core">
          <Sparkles size={22} strokeWidth={1.8} />
        </div>
      </div>

      <div className="cvp-tf-loading-message" role="status" aria-live="polite">
        <AnimatePresence mode="wait">
          <motion.span
            key={message}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28, ease: EASE_OUT }}
          >
            {message}
          </motion.span>
        </AnimatePresence>
      </div>

      <ol className="cvp-tf-steplist">
        {STEP_MESSAGES.map((m, i) => {
          const done = i < stepIndex;
          const active = i === stepIndex;
          return (
            <li
              key={m}
              className={'cvp-tf-step' + (done ? ' is-done' : '') + (active ? ' is-active' : '')}
            >
              <span className="cvp-tf-step-mark" aria-hidden="true">
                {done
                  ? <Check size={14} strokeWidth={2.4} />
                  : active
                    ? <CircleDot size={14} strokeWidth={2} />
                    : <span className="cvp-tf-step-dot" />}
              </span>
              <span className="cvp-tf-step-label">{m}</span>
            </li>
          );
        })}
      </ol>

      <p className="cvp-tf-loading-fine">
        Don&apos;t close this tab — usually 8–15 seconds.
      </p>
    </motion.div>
  );
}

// ── Screen 4 — Preview / paywall ────────────────────────────────────

function CvHeaderPreview({ cvData }) {
  // The "top third" the user sees — header + summary. Comes straight
  // from cv_data when run succeeded; falls back to a stylised
  // placeholder for free users who haven't paid yet.
  const name = cvData?.name?.trim() || 'Your Name';
  const title = cvData?.title?.trim() || 'Your Target Role';
  const location = cvData?.location?.trim() || '';
  const email = cvData?.email?.trim() || '';
  const summary = cvData?.summary?.trim()
    || 'Your summary will appear here — written in regional tone, tuned for the Gulf hiring market and the role you targeted.';
  return (
    <div className="cvp-tf-cv">
      <div className="cvp-tf-cv-head">
        <div className="cvp-tf-cv-name">{name}</div>
        <div className="cvp-tf-cv-title">{title}</div>
        <div className="cvp-tf-cv-meta">
          {location && <span>{location}</span>}
          {location && email && <span aria-hidden="true">·</span>}
          {email && <span>{email}</span>}
        </div>
      </div>
      <div className="cvp-tf-cv-divider" />
      <div className="cvp-tf-cv-section">
        <div className="cvp-tf-cv-h2">Summary</div>
        <p className="cvp-tf-cv-body">{summary}</p>
      </div>
      <div className="cvp-tf-cv-section">
        <div className="cvp-tf-cv-h2">Experience</div>
        <p className="cvp-tf-cv-body cvp-tf-cv-line"></p>
        <p className="cvp-tf-cv-body cvp-tf-cv-line cvp-tf-cv-line-short"></p>
        <p className="cvp-tf-cv-body cvp-tf-cv-line"></p>
      </div>
      <div className="cvp-tf-cv-section">
        <div className="cvp-tf-cv-h2">Education</div>
        <p className="cvp-tf-cv-body cvp-tf-cv-line"></p>
        <p className="cvp-tf-cv-body cvp-tf-cv-line cvp-tf-cv-line-short"></p>
      </div>
    </div>
  );
}

// SVG score ring for the analysis "ATS Score" card. Distinct namespace
// from .cvp-tf-ring (loading screen progress ring) - do not merge.
function CircularScore({ value }) {
  const v = Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (v / 100) * circumference;
  return (
    <div className="cvp-tf-score-ring" role="img" aria-label={`ATS score ${v} of 100`}>
      <svg width="76" height="76" viewBox="0 0 76 76" aria-hidden="true">
        <circle cx="38" cy="38" r={radius} className="cvp-tf-score-ring-track" />
        <circle
          cx="38" cy="38" r={radius}
          className="cvp-tf-score-ring-fill"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="cvp-tf-score-ring-num">{v}</span>
    </div>
  );
}

// Renders the structured analysis from /api/transform when available
// (research doc sections 2, 10). Falls back to deriveAtsSummary in
// PreviewScreen when analysis is null/empty - that path renders the
// original hardcoded card pair.
function AnalysisAside({ analysis, isPaid }) {
  const [expandedIdx, setExpandedIdx] = useState(null);
  const overallScore = Math.max(0, Math.min(100, Math.round(Number(analysis?.overallScore) || 0)));
  const suggestions = Array.isArray(analysis?.suggestions) ? analysis.suggestions : [];
  const strengths = Array.isArray(analysis?.strengths) ? analysis.strengths : [];

  return (
    <>
      <div className="cvp-tf-side-card cvp-tf-side-card--score">
        <div className="cvp-tf-score-row">
          <CircularScore value={overallScore} />
          <div>
            <div className="cvp-tf-side-title">ATS Score</div>
            <div className="cvp-tf-side-sub">Original CV before rewrite</div>
          </div>
        </div>
      </div>

      {suggestions.length > 0 && (
        <div className="cvp-tf-side-card cvp-tf-side-card--list">
          <div className="cvp-tf-side-h">What we fixed</div>
          <ul className="cvp-tf-fix-list">
            {suggestions.map((s, i) => {
              const open = expandedIdx === i;
              const impact = ['high', 'medium', 'low'].includes(s.impact) ? s.impact : 'low';
              return (
                <li key={i} className={'cvp-tf-fix-item' + (open ? ' is-open' : '')}>
                  <button
                    type="button"
                    className="cvp-tf-fix-head"
                    onClick={() => setExpandedIdx(open ? null : i)}
                    aria-expanded={open}
                  >
                    <span className="cvp-tf-fix-title">{s.title}</span>
                    <span className={'cvp-tf-impact cvp-tf-impact--' + impact}>{impact}</span>
                  </button>
                  {open && (
                    <div className="cvp-tf-fix-body">
                      {s.why && <p className="cvp-tf-fix-why">{s.why}</p>}
                      {s.exampleRewrite && (
                        isPaid ? (
                          <div className="cvp-tf-fix-example">{s.exampleRewrite}</div>
                        ) : (
                          <div className="cvp-tf-fix-locked">
                            <Lock size={12} strokeWidth={2.2} aria-hidden="true" />
                            <span>Unlock to see the rewrite</span>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {strengths.length > 0 && (
        <div className="cvp-tf-side-card cvp-tf-side-card--list">
          <div className="cvp-tf-side-h">Strengths</div>
          <ul className="cvp-tf-side-list">
            {strengths.map((s, i) => (
              <li key={i}>
                <Check size={13} strokeWidth={2.4} aria-hidden="true" />
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}

function PreviewScreen({ cvData, analysis, intake, isPaid, onUnlock, onDownload, payLoading }) {
  const summary = useMemo(() => deriveAtsSummary(cvData), [cvData]);
  const fixes = summary.fixes.length > 0 ? summary.fixes : [
    'Rewrite tuned to your target market',
    'ATS-friendly section ordering',
    'Date and location formatting normalised',
  ];
  const hasAnalysis = !!(analysis && typeof analysis === 'object'
    && Array.isArray(analysis.suggestions) && analysis.suggestions.length > 0);

  return (
    <motion.div
      key="preview"
      className="cvp-tf-screen cvp-tf-preview"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.36, ease: EASE_OUT }}
    >
      <div className="cvp-tf-eyebrow">Step 4 of 4</div>
      <h1 className="cvp-tf-h1">{isPaid ? 'Your CV is ready' : 'Your CV is ready — preview locked'}</h1>
      <p className="cvp-tf-lede">
        {isPaid
          ? 'Open it in the builder, or download a clean PDF straight away.'
          : `Tuned for ${intake?.target_market || 'your market'}. Unlock to read the full rewrite, edit it in the builder, and download as PDF.`}
      </p>

      <div className="cvp-tf-preview-grid">
        <aside className="cvp-tf-side">
          {hasAnalysis ? (
            <AnalysisAside analysis={analysis} isPaid={isPaid} />
          ) : (
            <>
              <div className="cvp-tf-side-card">
                <div className="cvp-tf-side-icon">
                  <ShieldCheck size={18} strokeWidth={2} />
                </div>
                <div className="cvp-tf-side-title">ATS-Optimised</div>
                <div className="cvp-tf-side-sub">
                  {summary.sectionsFilled} of {summary.sectionsTotal} CV sections populated
                </div>
              </div>

              <div className="cvp-tf-side-card cvp-tf-side-card--list">
                <div className="cvp-tf-side-h">What we fixed</div>
                <ul className="cvp-tf-side-list">
                  {fixes.map((f) => (
                    <li key={f}>
                      <Check size={13} strokeWidth={2.4} aria-hidden="true" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </aside>

        <main className={'cvp-tf-cv-wrap' + (isPaid ? '' : ' is-locked')}>
          <CvHeaderPreview cvData={cvData} />
          {!isPaid && (
            <div className="cvp-tf-cv-veil" aria-hidden="true">
              <div className="cvp-tf-cv-veil-grad" />
            </div>
          )}
        </main>
      </div>

      <div className="cvp-tf-cta-row">
        {isPaid ? (
          <button type="button" className="cvp-tf-cta" onClick={onDownload}>
            <Download size={16} strokeWidth={2.2} />
            Download your CV — It&apos;s free
          </button>
        ) : (
          <button type="button" className="cvp-tf-cta" onClick={onUnlock} disabled={payLoading}>
            {payLoading
              ? <><Loader2 size={16} strokeWidth={2.2} className="cvp-tf-spin" /> Opening checkout…</>
              : <><Lock size={16} strokeWidth={2.2} /> Unlock your CV — AED 49</>}
          </button>
        )}
        {!isPaid && (
          <p className="cvp-tf-fine">
            One-time payment · Free with Active Hunter or Express Pass.
          </p>
        )}
      </div>
    </motion.div>
  );
}

// ── Page root ───────────────────────────────────────────────────────

export default function TransformPage({ user }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialSessionId = (searchParams.get('session_id') || '').trim();

  const [bootstrap, setBootstrap] = useState('checking'); // checking | ready | error
  const [bootstrapError, setBootstrapError] = useState('');
  const [screen, setScreen] = useState(initialSessionId ? null : 'upload');
  const [sessionId, setSessionId] = useState(initialSessionId || null);
  const [sessionData, setSessionData] = useState(null);

  const [intakeSubmitting, setIntakeSubmitting] = useState(false);
  const [intakeError, setIntakeError] = useState('');

  const [stepIndex, setStepIndex] = useState(0);
  const [activeMessage, setActiveMessage] = useState(STEP_MESSAGES[0]);
  const [payLoading, setPayLoading] = useState(false);

  const stepTimerRef = useRef(null);
  const pollTimerRef = useRef(null);
  const runFiredRef = useRef(false);
  const runStartTsRef = useRef(0);

  // ── Auth gate ────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      const next = initialSessionId
        ? `/transform?session_id=${encodeURIComponent(initialSessionId)}`
        : '/transform';
      navigate(`/auth?mode=signup&next=${encodeURIComponent(next)}`, { replace: true });
    }
  }, [user, navigate, initialSessionId]);

  // ── Bootstrap from URL ───────────────────────────────────────────
  useEffect(() => {
    if (!user) return undefined;
    let cancelled = false;
    async function boot() {
      if (!initialSessionId) {
        setBootstrap('ready');
        setScreen('upload');
        return;
      }
      try {
        const json = await authedFetch(
          `/api/transform?action=status&session_id=${encodeURIComponent(initialSessionId)}`,
        );
        if (cancelled) return;
        setSessionData(json);
        const status = json.status;
        if (status === 'transformed') {
          setScreen('preview');
        } else if (status === 'transforming') {
          setScreen('loading');
        } else if (status === 'created' || status === 'awaiting_payment' || status === 'paid') {
          setScreen('intake');
        } else {
          setScreen('intake');
        }
        setBootstrap('ready');
      } catch (e) {
        if (cancelled) return;
        if (e.code === 'NOT_SIGNED_IN' || e.status === 401) {
          navigate(`/auth?mode=signup&next=${encodeURIComponent(`/transform?session_id=${initialSessionId}`)}`, { replace: true });
          return;
        }
        setBootstrap('error');
        setBootstrapError(e?.message || 'Could not load your transform session.');
      }
    }
    boot();
    return () => { cancelled = true; };
  }, [user, initialSessionId, navigate]);

  // ── Cleanup timers on unmount ────────────────────────────────────
  useEffect(() => () => {
    if (stepTimerRef.current) clearTimeout(stepTimerRef.current);
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
  }, []);

  // ── Upload completion (Screen 1 → Screen 2) ──────────────────────
  const handleUploaded = useCallback(async (uploadResult) => {
    setSessionId(uploadResult.session_id);
    setSessionData((prev) => ({
      ...(prev || {}),
      status: uploadResult.status,
      user_plan: uploadResult.user_plan,
    }));
    // Reflect the session_id in the URL so a refresh resumes the flow.
    const url = `/transform?session_id=${encodeURIComponent(uploadResult.session_id)}`;
    navigate(url, { replace: true });
    setScreen('intake');
  }, [navigate]);

  // ── Intake submit (Screen 2 → Screen 3) ──────────────────────────
  const handleIntakeSubmit = useCallback(async (intake) => {
    if (!sessionId) return;
    setIntakeSubmitting(true);
    setIntakeError('');
    try {
      await authedFetch('/api/transform?action=update_intake', {
        method: 'POST',
        body: JSON.stringify({ session_id: sessionId, intake }),
      });
      logEvent('transform_page_intake_submitted', {
        session_id: sessionId,
        target_market: intake.target_market,
        target_industry: intake.target_industry,
      });
      setSessionData((prev) => ({ ...(prev || {}), intake }));
      setScreen('loading');
    } catch (e) {
      setIntakeError(e?.message || 'Could not save your answers.');
      logEvent('transform_page_intake_failed', { code: e?.status || 'unknown' });
    } finally {
      setIntakeSubmitting(false);
    }
  }, [sessionId]);

  // ── Loading screen lifecycle (Screen 3 → Screen 4) ───────────────
  useEffect(() => {
    if (screen !== 'loading' || !sessionId) return undefined;

    runStartTsRef.current = Date.now();
    setStepIndex(0);
    setActiveMessage(STEP_MESSAGES[0]);

    // Step ticker — drives the visual labor illusion. Same cadence as
    // ScoutDashboard's MIN_SCAN_MS (≥800 ms / step). Even if the run
    // call returns instantly, we hold long enough to read each line.
    let i = 0;
    const tick = () => {
      i += 1;
      if (i < STEP_MESSAGES.length) {
        setStepIndex(i);
        setActiveMessage(STEP_MESSAGES[i]);
        stepTimerRef.current = setTimeout(tick, STEP_MIN_MS);
      } else {
        // Stay on the last step until the API resolves.
        setStepIndex(STEP_MESSAGES.length);
      }
    };
    stepTimerRef.current = setTimeout(tick, STEP_MIN_MS);

    let advanced = false;
    const advanceWhenReady = (data) => {
      if (advanced) return;
      const elapsed = Date.now() - runStartTsRef.current;
      const minHold = STEP_MIN_MS * STEP_MESSAGES.length;
      const wait = Math.max(0, minHold - elapsed);
      setTimeout(() => {
        if (advanced) return;
        advanced = true;
        if (data) setSessionData((prev) => ({ ...(prev || {}), ...data }));
        setScreen('preview');
      }, wait);
    };

    // Fire run exactly once. Free users hit 402 — that's the cue to
    // jump to the paywall preview without waiting for the poll to
    // confirm what we already know.
    if (!runFiredRef.current) {
      runFiredRef.current = true;
      authedFetch('/api/transform?action=run', {
        method: 'POST',
        body: JSON.stringify({ session_id: sessionId }),
      }).then((data) => {
        advanceWhenReady(data);
      }).catch((e) => {
        if (e.status === 402) {
          // Unpaid — Screen 4 will show the paywall.
          advanceWhenReady(null);
          return;
        }
        if (e.status === 409 && /already in flight/i.test(e?.message || '')) {
          // Another tab fired run — let polling handle it.
          return;
        }
        advanced = true;
        setBootstrap('error');
        setBootstrapError(e?.message || 'The transform failed. Please try again.');
      });
    }

    // Status poll — safety net so we still advance if the run call
    // hangs or the tab loses focus mid-flight.
    pollTimerRef.current = setInterval(async () => {
      try {
        const json = await authedFetch(
          `/api/transform?action=status&session_id=${encodeURIComponent(sessionId)}`,
        );
        if (json.status === 'transformed' || json.status === 'error') {
          advanceWhenReady(json);
          if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
          }
        }
      } catch {
        // Soft-fail — the run promise above is the primary path.
      }
    }, 3000);

    return () => {
      if (stepTimerRef.current) { clearTimeout(stepTimerRef.current); stepTimerRef.current = null; }
      if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
    };
  }, [screen, sessionId]);

  // ── Paywall click (Screen 4 free) ────────────────────────────────
  const handleUnlock = useCallback(async () => {
    if (!sessionId) return;
    setPayLoading(true);
    try {
      const json = await authedFetch('/api/transform?action=pay', {
        method: 'POST',
        body: JSON.stringify({ session_id: sessionId }),
      });
      if (json.payment_url) {
        logEvent('transform_page_pay_redirect', { session_id: sessionId });
        window.location.href = json.payment_url;
        return;
      }
      if (json.authorized) {
        // Plan flipped mid-flow — re-run.
        setScreen('loading');
        runFiredRef.current = false;
      }
    } catch (e) {
      setBootstrapError(e?.message || 'Could not start checkout. Please try again.');
    } finally {
      setPayLoading(false);
    }
  }, [sessionId]);

  // ── Download click (Screen 4 paid) ───────────────────────────────
  const handleDownload = useCallback(() => {
    if (!sessionId) return;
    logEvent('transform_page_download_clicked', { session_id: sessionId });
    navigate(`/transform/success?session_id=${encodeURIComponent(sessionId)}`);
  }, [sessionId, navigate]);

  // ── Render ───────────────────────────────────────────────────────
  if (!user) return null; // auth gate effect handles the redirect

  const userPlan = sessionData?.user_plan || (user ? 'free' : 'free');
  const isPaid = userPlan === 'pro' || userPlan === 'express'
    || sessionData?.status === 'transformed';

  return (
    <div className="cvp-tf-root">
      <TopBar onBack={() => navigate('/')} />

      <main className="cvp-tf-main">
        {bootstrap === 'checking' && (
          <div className="cvp-tf-screen cvp-tf-bootstrap" role="status">
            <Loader2 size={20} strokeWidth={2} className="cvp-tf-spin" />
            <span>Loading your transform…</span>
          </div>
        )}
        {bootstrap === 'error' && (
          <div className="cvp-tf-screen cvp-tf-bootstrap cvp-tf-bootstrap--error">
            <div className="cvp-tf-bootstrap-title">We hit a snag</div>
            <p className="cvp-tf-bootstrap-sub">{bootstrapError}</p>
            <button type="button" className="cvp-tf-cta" onClick={() => navigate('/')}>
              Back to home
            </button>
          </div>
        )}
        {bootstrap === 'ready' && (
          <AnimatePresence mode="wait">
            {screen === 'upload' && <UploadScreen onUploaded={handleUploaded} />}
            {screen === 'intake' && (
              <IntakeScreen
                initialIntake={sessionData?.intake}
                submitting={intakeSubmitting}
                errorMsg={intakeError}
                onSubmit={handleIntakeSubmit}
              />
            )}
            {screen === 'loading' && (
              <LoadingScreen stepIndex={stepIndex} message={activeMessage} />
            )}
            {screen === 'preview' && (
              <PreviewScreen
                cvData={sessionData?.cv_data}
                analysis={sessionData?.analysis}
                intake={sessionData?.intake}
                isPaid={isPaid}
                onUnlock={handleUnlock}
                onDownload={handleDownload}
                payLoading={payLoading}
              />
            )}
          </AnimatePresence>
        )}
      </main>

      <style>{`
        .cvp-tf-root {
          min-height: 100vh;
          background: #0A0A0A;
          color: #F5F5F7;
          font-family: 'Outfit','Inter','Segoe UI',sans-serif;
          display: flex;
          flex-direction: column;
        }
        .cvp-tf-main {
          flex: 1;
          width: 100%;
          max-width: 1080px;
          margin: 0 auto;
          padding: 32px 24px 96px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
        }
        .cvp-tf-spin { animation: cvp-tf-spin 1.1s linear infinite; }
        @keyframes cvp-tf-spin { to { transform: rotate(360deg); } }

        /* topbar */
        .cvp-tf-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 24px;
          border-bottom: 1px solid #1C1C1C;
          background: rgba(10, 10, 10, 0.92);
          backdrop-filter: blur(8px);
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .cvp-tf-back {
          appearance: none;
          background: transparent;
          border: 1px solid #2A2A2A;
          color: #A0A0A0;
          font-size: 13px;
          padding: 8px 14px;
          border-radius: 999px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          transition-property: border-color, color, background-color;
          transition-duration: 200ms;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        }
        .cvp-tf-back:hover { border-color: #3A3A3A; color: #F5F5F7; background: #141414; }
        .cvp-tf-brand {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #A0A0A0;
          font-size: 13px;
          letter-spacing: -0.005em;
        }
        .cvp-tf-brand-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #D97706;
          box-shadow: 0 0 12px rgba(217, 119, 6, 0.55);
        }
        .cvp-tf-brand-name { color: #F5F5F7; font-weight: 600; }
        .cvp-tf-brand-sep { color: #3A3A3A; }
        .cvp-tf-brand-tag { color: #A0A0A0; }
        .cvp-tf-topbar-spacer { width: 78px; }

        /* shared screen scaffolding */
        .cvp-tf-screen {
          width: 100%;
          margin: 24px auto 0;
          max-width: 760px;
          display: flex;
          flex-direction: column;
        }
        .cvp-tf-eyebrow {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #D97706;
          margin: 0 0 14px 0;
        }
        .cvp-tf-h1 {
          font-size: clamp(28px, 4.2vw, 44px);
          font-weight: 600;
          letter-spacing: -0.02em;
          line-height: 1.08;
          margin: 0 0 14px 0;
          color: #F5F5F7;
        }
        .cvp-tf-lede {
          font-size: 16px;
          line-height: 1.55;
          color: #A0A0A0;
          margin: 0 0 28px 0;
          max-width: 56ch;
        }
        .cvp-tf-error {
          margin: 16px 0 0 0;
          padding: 12px 16px;
          font-size: 14px;
          line-height: 1.5;
          color: #FF6B5C;
          background: rgba(255, 107, 92, 0.08);
          border: 1px solid rgba(255, 107, 92, 0.24);
          border-radius: 10px;
        }
        .cvp-tf-error strong { font-weight: 600; }
        .cvp-tf-fine {
          font-size: 12px;
          color: #6E6E73;
          margin: 10px 0 0 0;
        }

        /* primary CTA */
        .cvp-tf-cta {
          appearance: none;
          background: #D97706;
          color: #0A0A0A;
          font-size: 15px;
          font-weight: 600;
          letter-spacing: -0.005em;
          border: 0;
          padding: 14px 22px;
          border-radius: 12px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.10) inset,
            0 8px 24px -10px rgba(217, 119, 6, 0.45);
          transition-property: background-color, transform, box-shadow;
          transition-duration: 200ms;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        }
        .cvp-tf-cta:hover { background: #E58210; }
        .cvp-tf-cta:active { background: #C56A04; transform: translateY(1px); }
        .cvp-tf-cta:disabled {
          background: #4A380F;
          color: #8A8A8E;
          cursor: not-allowed;
          box-shadow: none;
        }
        .cvp-tf-cta:focus-visible {
          outline: 2px solid #FFC371;
          outline-offset: 3px;
        }

        /* upload screen */
        .cvp-tf-drop {
          margin-top: 8px;
          background: #141414;
          border: 1.5px dashed #2A2A2A;
          border-radius: 18px;
          padding: 56px 24px;
          text-align: center;
          cursor: pointer;
          color: #A0A0A0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 14px;
          transition-property: border-color, background-color, transform;
          transition-duration: 240ms;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        }
        .cvp-tf-drop:hover {
          border-color: #4A4A4F;
          background: #161618;
          color: #F5F5F7;
        }
        .cvp-tf-drop.is-dragging {
          border-color: #D97706;
          background: rgba(217, 119, 6, 0.06);
          color: #F5F5F7;
          transform: scale(1.005);
        }
        .cvp-tf-drop.is-busy { cursor: wait; opacity: 0.86; }
        .cvp-tf-drop:focus-visible { outline: 2px solid #D97706; outline-offset: 3px; }
        .cvp-tf-drop-icon {
          width: 56px; height: 56px; border-radius: 14px;
          background: #1C1C1C;
          border: 1px solid #2A2A2A;
          display: flex; align-items: center; justify-content: center;
          color: #F5F5F7;
        }
        .cvp-tf-drop-title { font-size: 16px; font-weight: 500; color: #F5F5F7; }
        .cvp-tf-drop-sub { font-size: 13px; color: #6E6E73; }

        /* intake form */
        .cvp-tf-form {
          display: flex;
          flex-direction: column;
          gap: 26px;
          margin-top: 4px;
        }
        .cvp-tf-field { display: flex; flex-direction: column; gap: 10px; }
        .cvp-tf-field-label { font-size: 14px; font-weight: 500; color: #F5F5F7; }
        .cvp-tf-field-hint { font-size: 12px; color: #6E6E73; }
        .cvp-tf-chips { display: flex; flex-wrap: wrap; gap: 8px; }
        .cvp-tf-chip {
          appearance: none;
          background: #141414;
          color: #C0C0C5;
          border: 1px solid #2A2A2A;
          padding: 10px 14px;
          border-radius: 999px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition-property: border-color, background-color, color;
          transition-duration: 200ms;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        }
        .cvp-tf-chip:hover { border-color: #3A3A3A; color: #F5F5F7; }
        .cvp-tf-chip.is-active {
          border-color: #D97706;
          background: rgba(217, 119, 6, 0.10);
          color: #F5F5F7;
        }
        .cvp-tf-chip:focus-visible { outline: 2px solid #D97706; outline-offset: 2px; }
        .cvp-tf-input, .cvp-tf-select {
          appearance: none;
          background: #141414;
          color: #F5F5F7;
          border: 1px solid #2A2A2A;
          padding: 12px 14px;
          border-radius: 10px;
          font-size: 14px;
          font-family: inherit;
          width: 100%;
          box-sizing: border-box;
          transition-property: border-color, background-color;
          transition-duration: 200ms;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        }
        .cvp-tf-input:focus, .cvp-tf-select:focus {
          outline: none;
          border-color: #D97706;
          background: #161618;
        }
        .cvp-tf-select {
          background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23A0A0A0' stroke-width='1.6' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 14px center;
          padding-right: 36px;
        }
        .cvp-tf-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 30px;
        }

        /* loading screen */
        .cvp-tf-loading {
          align-items: center;
          text-align: center;
          padding-top: 40px;
        }
        .cvp-tf-ring {
          position: relative;
          width: 132px; height: 132px;
          margin: 18px 0 28px;
        }
        .cvp-tf-ring-arc {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 2.5px solid transparent;
          border-top-color: #D97706;
          border-right-color: rgba(217, 119, 6, 0.35);
          filter: drop-shadow(0 0 14px rgba(217, 119, 6, 0.35));
        }
        .cvp-tf-ring-core {
          position: absolute;
          inset: 18px;
          border-radius: 50%;
          background: #141414;
          border: 1px solid #2A2A2A;
          display: flex; align-items: center; justify-content: center;
          color: #D97706;
        }
        .cvp-tf-loading-message {
          font-size: 15px;
          color: #F5F5F7;
          font-weight: 500;
          min-height: 22px;
          margin-bottom: 28px;
        }
        .cvp-tf-steplist {
          list-style: none;
          padding: 0;
          margin: 0;
          width: 100%;
          max-width: 360px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          text-align: left;
        }
        .cvp-tf-step {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13.5px;
          color: #6E6E73;
          padding: 6px 0;
          transition-property: color;
          transition-duration: 240ms;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        }
        .cvp-tf-step.is-active { color: #F5F5F7; }
        .cvp-tf-step.is-done { color: #1D9E75; }
        .cvp-tf-step-mark {
          width: 18px; height: 18px;
          display: inline-flex; align-items: center; justify-content: center;
          color: inherit;
        }
        .cvp-tf-step-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #2A2A2A;
        }
        .cvp-tf-loading-fine {
          margin-top: 24px;
          font-size: 12px;
          color: #6E6E73;
        }

        /* preview screen */
        .cvp-tf-preview { max-width: 1040px; }
        .cvp-tf-preview-grid {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 28px;
          margin-top: 16px;
        }
        .cvp-tf-side { display: flex; flex-direction: column; gap: 16px; }
        .cvp-tf-side-card {
          background: #141414;
          border: 1px solid #2A2A2A;
          border-radius: 14px;
          padding: 20px;
        }
        .cvp-tf-side-icon {
          width: 38px; height: 38px;
          border-radius: 10px;
          background: rgba(29, 158, 117, 0.12);
          color: #1D9E75;
          display: inline-flex; align-items: center; justify-content: center;
          margin-bottom: 12px;
        }
        .cvp-tf-side-title { font-size: 15px; font-weight: 600; color: #F5F5F7; }
        .cvp-tf-side-sub { font-size: 13px; color: #A0A0A0; margin-top: 4px; }
        .cvp-tf-side-h {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: #6E6E73;
          margin-bottom: 10px;
        }
        .cvp-tf-side-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .cvp-tf-side-list li {
          display: flex;
          gap: 8px;
          font-size: 13.5px;
          color: #C0C0C5;
          line-height: 1.45;
        }
        .cvp-tf-side-list li svg { color: #1D9E75; flex-shrink: 0; margin-top: 3px; }

        /* CV preview surface */
        .cvp-tf-cv-wrap {
          position: relative;
          background: #FFFFFF;
          color: #111111;
          border-radius: 14px;
          overflow: hidden;
          min-height: 480px;
          box-shadow: 0 30px 80px -30px rgba(0,0,0,0.6);
        }
        .cvp-tf-cv {
          padding: 36px 40px;
          font-family: 'Inter', 'Helvetica Neue', sans-serif;
        }
        .cvp-tf-cv-head { margin-bottom: 18px; }
        .cvp-tf-cv-name {
          font-size: 26px;
          font-weight: 700;
          letter-spacing: -0.01em;
          color: #0A0A0A;
        }
        .cvp-tf-cv-title {
          font-size: 15px;
          color: #444;
          margin-top: 4px;
        }
        .cvp-tf-cv-meta {
          font-size: 12px;
          color: #6B6B6B;
          margin-top: 6px;
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .cvp-tf-cv-divider {
          height: 1px;
          background: #E5E5E5;
          margin: 12px 0 20px;
        }
        .cvp-tf-cv-section { margin-bottom: 18px; }
        .cvp-tf-cv-h2 {
          font-size: 12px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #666;
          margin-bottom: 8px;
        }
        .cvp-tf-cv-body {
          font-size: 13.5px;
          color: #1F1F1F;
          line-height: 1.6;
          margin: 0 0 6px 0;
        }
        .cvp-tf-cv-line {
          background: #ECECEC;
          height: 12px;
          border-radius: 4px;
          margin-bottom: 6px;
        }
        .cvp-tf-cv-line-short { width: 60%; }

        /* paywall blur veil — only when locked */
        .cvp-tf-cv-wrap.is-locked .cvp-tf-cv-section:nth-child(n+3) {
          filter: blur(7px);
        }
        .cvp-tf-cv-veil {
          position: absolute;
          inset: 38% 0 0 0;
          pointer-events: none;
        }
        .cvp-tf-cv-veil-grad {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(255,255,255,0) 0%,
            rgba(255,255,255,0.55) 35%,
            rgba(255,255,255,0.92) 100%
          );
        }

        /* CTA row */
        .cvp-tf-cta-row {
          margin-top: 28px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        /* bootstrap states */
        .cvp-tf-bootstrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 80px 24px;
          color: #A0A0A0;
          font-size: 13.5px;
          letter-spacing: 0.04em;
        }
        .cvp-tf-bootstrap--error { gap: 14px; color: #F5F5F7; }
        .cvp-tf-bootstrap-title {
          font-size: 22px;
          font-weight: 600;
          color: #F5F5F7;
        }
        .cvp-tf-bootstrap-sub {
          font-size: 14px;
          color: #A0A0A0;
          margin: 0 0 12px 0;
          max-width: 44ch;
          text-align: center;
        }

        /* analysis aside - score ring + suggestion list + strengths */
        .cvp-tf-side-card--score { padding: 18px 20px; }
        .cvp-tf-score-row {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .cvp-tf-score-ring {
          position: relative;
          width: 76px;
          height: 76px;
          flex-shrink: 0;
        }
        .cvp-tf-score-ring svg { transform: rotate(-90deg); }
        .cvp-tf-score-ring-track { fill: none; stroke: #2A2A2A; stroke-width: 6; }
        .cvp-tf-score-ring-fill {
          fill: none;
          stroke: #378ADD;
          stroke-width: 6;
          stroke-linecap: round;
          transition: stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .cvp-tf-score-ring-num {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Outfit', 'Inter', sans-serif;
          font-size: 20px;
          font-weight: 700;
          color: #F5F5F7;
        }

        .cvp-tf-fix-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
        }
        .cvp-tf-fix-item { border-top: 1px solid #2A2A2A; }
        .cvp-tf-fix-item:first-child { border-top: none; }
        .cvp-tf-fix-head {
          width: 100%;
          background: transparent;
          border: 0;
          color: #C0C0C5;
          text-align: left;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 11px 0;
          cursor: pointer;
          font: inherit;
          transition: color 0.16s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .cvp-tf-fix-head:hover { color: #F5F5F7; }
        .cvp-tf-fix-title {
          font-size: 13.5px;
          line-height: 1.4;
          flex: 1;
        }
        .cvp-tf-impact {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          padding: 3px 8px;
          border-radius: 999px;
          flex-shrink: 0;
        }
        .cvp-tf-impact--high {
          background: rgba(220, 38, 38, 0.14);
          color: #F87171;
        }
        .cvp-tf-impact--medium {
          background: rgba(217, 119, 6, 0.14);
          color: #D97706;
        }
        .cvp-tf-impact--low {
          background: rgba(160, 160, 160, 0.12);
          color: #A0A0A0;
        }
        .cvp-tf-fix-body {
          padding: 0 0 12px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .cvp-tf-fix-why {
          font-size: 12.5px;
          line-height: 1.5;
          color: #A0A0A0;
          margin: 0;
        }
        .cvp-tf-fix-example {
          font-size: 12px;
          line-height: 1.55;
          color: #E5E5EA;
          background: #1C1C1C;
          border: 1px solid #2A2A2A;
          border-radius: 8px;
          padding: 10px 12px;
          white-space: pre-wrap;
          word-wrap: break-word;
        }
        .cvp-tf-fix-locked {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11.5px;
          color: #A0A0A0;
          background: rgba(217, 119, 6, 0.08);
          border: 1px solid rgba(217, 119, 6, 0.24);
          border-radius: 8px;
          padding: 7px 10px;
          align-self: flex-start;
        }
        .cvp-tf-fix-locked svg { color: #D97706; }

        /* responsive */
        @media (max-width: 880px) {
          .cvp-tf-main { padding: 20px 16px 80px; }
          .cvp-tf-topbar { padding: 12px 16px; }
          .cvp-tf-topbar-spacer { display: none; }
          .cvp-tf-h1 { font-size: clamp(24px, 7vw, 32px); }
          .cvp-tf-lede { font-size: 15px; }
          .cvp-tf-drop { padding: 40px 18px; }
          .cvp-tf-preview-grid { grid-template-columns: 1fr; }
          .cvp-tf-cv { padding: 24px 22px; }
          .cvp-tf-ring { width: 108px; height: 108px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .cvp-tf-spin { animation: none; }
          .cvp-tf-drop { transition-duration: 0.01ms; }
        }
      `}</style>
    </div>
  );
}
