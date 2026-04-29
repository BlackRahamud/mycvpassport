// =============================================================
// src/pages/TransformSuccessPage.jsx
//
// Post-payment landing for Upload & Transform. Two arrival paths:
//   (a) Free user paid Ziina — webhook flips status='paid', Ziina
//       redirects here. cv_data is null until /api/transform?action=run
//       fires, so we auto-fire it once we see paid.
//   (b) Pro / Express user clicked "Download" on /transform Screen 4 —
//       status is already 'transformed', cv_data is populated.
//
// Combined working state covers (a) end-to-end and (b)'s very brief
// confirmation poll. Progress bar fills 0 → 100 % over a 45 s budget;
// "Don't close or refresh" message is prominent because UAE/India
// users will reload at five seconds of dead air. If we don't reach
// 'transformed' inside the budget, we show a contact-support fallback.
//
// Visual: matches TransformPage exactly — OLED palette, amber CTAs,
// Framer Motion entrance, lucide icons. The ring animation is a
// direct cousin of TransformPage Screen 3.
// =============================================================

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Download,
  Pencil,
  Check,
  Copy,
  ArrowLeft,
  ArrowUpRight,
  Sparkles,
  ShieldCheck,
  Target,
  Briefcase,
  PenSquare,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { supabase } from '../appSupabaseClient';
import { logEvent } from '../lib/analytics/logEvent';

// ── Constants ──────────────────────────────────────────────────────

const TIMEOUT_MS = 45_000;
const POLL_MS = 2_000;
// ATS International — pure-ATS layout, the safest regional default for
// a CV the user just paid AED 49 to have rewritten. Mirrors Scout's
// APPLY_DEFAULT_TEMPLATE_ID.
const PDF_TEMPLATE_ID = 10;
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
  const r = await fetch(url, {
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

function safeFilename(name) {
  return String(name || 'CV').replace(/[^A-Za-z0-9_-]+/g, '_').slice(0, 60) || 'CV';
}

async function triggerPdfDownload(cvData) {
  const res = await fetch('/api/generate-pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ templateId: PDF_TEMPLATE_ID, cv: cvData }),
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
  a.download = `${safeFilename(cvData?.name)}_CVPassport.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

// ── Top bar (mirrors TransformPage) ─────────────────────────────────

function TopBar({ onBack }) {
  return (
    <div className="cvp-tfs-topbar">
      <button type="button" className="cvp-tfs-back" onClick={onBack} aria-label="Back to home">
        <ArrowLeft size={16} strokeWidth={2} />
        <span>Back</span>
      </button>
      <div className="cvp-tfs-brand">
        <span className="cvp-tfs-brand-dot" aria-hidden="true" />
        <span className="cvp-tfs-brand-name">CVPassport</span>
        <span className="cvp-tfs-brand-sep">·</span>
        <span className="cvp-tfs-brand-tag">Upload &amp; Transform</span>
      </div>
      <div className="cvp-tfs-topbar-spacer" aria-hidden="true" />
    </div>
  );
}

// ── Working state (poll + run) ──────────────────────────────────────

function WorkingState({ phase, intake, elapsedMs }) {
  const reduce = useReducedMotion();
  const pct = Math.min(100, Math.round((elapsedMs / TIMEOUT_MS) * 100));
  const headline =
    phase === 'confirming' ? 'Confirming your payment…'
    : phase === 'transforming' ? 'Finalising your CV…'
    : 'Working…';
  const targetMarket = intake?.target_market || 'your target market';
  return (
    <motion.section
      key="working"
      className="cvp-tfs-screen cvp-tfs-working"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: EASE_OUT }}
      aria-live="polite"
    >
      <div className="cvp-tfs-ring" aria-hidden="true">
        <motion.div
          className="cvp-tfs-ring-arc"
          animate={reduce ? {} : { rotate: 360 }}
          transition={reduce ? {} : { duration: 1.6, ease: 'linear', repeat: Infinity }}
        />
        <div className="cvp-tfs-ring-core">
          <Sparkles size={22} strokeWidth={1.8} />
        </div>
      </div>

      <h1 className="cvp-tfs-h1">{headline}</h1>
      <p className="cvp-tfs-lede">
        We&apos;re rewriting your CV with {targetMarket} hiring norms in mind.
        Usually 8–15 seconds.
      </p>

      <div className="cvp-tfs-warn" role="status">
        <AlertTriangle size={14} strokeWidth={2.2} />
        <span><strong>Don&apos;t close or refresh this page.</strong> Your transform finishes here — refreshing restarts the wait.</span>
      </div>

      <div
        className="cvp-tfs-progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label="Transform progress"
      >
        <div className="cvp-tfs-progress-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="cvp-tfs-progress-text">{pct}%</div>
    </motion.section>
  );
}

// ── Ready state (download + next steps) ─────────────────────────────

function NextStepCard({ icon, title, sub, onClick }) {
  return (
    <button type="button" className="cvp-tfs-next" onClick={onClick}>
      <span className="cvp-tfs-next-icon">{icon}</span>
      <span className="cvp-tfs-next-body">
        <span className="cvp-tfs-next-title">{title}</span>
        <span className="cvp-tfs-next-sub">{sub}</span>
      </span>
      <ArrowUpRight size={14} strokeWidth={2} className="cvp-tfs-next-arrow" />
    </button>
  );
}

function ReadyState({ cvData, intake, sessionId, onDownloadPdf, onEditBuilder, onCopyLink, downloading, downloadError, copied, navigate }) {
  const reduce = useReducedMotion();
  const subtargets = useMemo(() => {
    const m = intake?.target_market;
    if (m === 'India') return 'Indian corporate hiring norms';
    if (m === 'GCC' || m === 'UAE') return 'UAE/GCC hiring norms';
    return 'your target market';
  }, [intake?.target_market]);

  return (
    <motion.section
      key="ready"
      className="cvp-tfs-screen cvp-tfs-ready"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE_OUT }}
    >
      <motion.div
        className="cvp-tfs-success-mark"
        initial={reduce ? { scale: 1, opacity: 1 } : { scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 20, delay: 0.05 }}
        aria-hidden="true"
      >
        <Check size={28} strokeWidth={2.6} />
      </motion.div>

      <h1 className="cvp-tfs-h1">Your CV is ready.</h1>
      <p className="cvp-tfs-lede">
        Rewritten for {subtargets}. ATS-optimised. Download below.
      </p>

      <div className="cvp-tfs-cta-row">
        <button
          type="button"
          className="cvp-tfs-cta cvp-tfs-cta--primary"
          onClick={onDownloadPdf}
          disabled={downloading}
        >
          {downloading
            ? <><Loader2 size={16} strokeWidth={2.2} className="cvp-tfs-spin" /> Preparing PDF…</>
            : <><Download size={16} strokeWidth={2.2} /> Download PDF</>}
        </button>
        <button
          type="button"
          className="cvp-tfs-cta cvp-tfs-cta--ghost"
          onClick={onEditBuilder}
        >
          <Pencil size={16} strokeWidth={2.2} />
          Edit in Builder
        </button>
      </div>

      {downloadError && (
        <div className="cvp-tfs-error" role="alert">{downloadError}</div>
      )}

      <div className="cvp-tfs-link">
        <div className="cvp-tfs-link-head">
          <span>Need to re-download? This link is valid for 72 hours.</span>
        </div>
        <div className="cvp-tfs-link-row">
          <code className="cvp-tfs-link-url" title={`/transform/success?session_id=${sessionId}`}>
            /transform/success?session_id={sessionId}
          </code>
          <button
            type="button"
            className="cvp-tfs-link-copy"
            onClick={onCopyLink}
            aria-label="Copy session link"
          >
            {copied ? <Check size={14} strokeWidth={2.4} /> : <Copy size={14} strokeWidth={2} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      <div className="cvp-tfs-next-h">What&apos;s next</div>
      <div className="cvp-tfs-next-grid">
        <NextStepCard
          icon={<ShieldCheck size={18} strokeWidth={2} />}
          title="Check your ATS Score"
          sub="Run it against a JD"
          onClick={() => { logEvent('transform_success_next_clicked', { target: 'ats' }); navigate('/ats'); }}
        />
        <NextStepCard
          icon={<Target size={18} strokeWidth={2} />}
          title="Find matching jobs"
          sub="Scout the GCC + India market"
          onClick={() => { logEvent('transform_success_next_clicked', { target: 'scout' }); navigate('/scout'); }}
        />
        <NextStepCard
          icon={<PenSquare size={18} strokeWidth={2} />}
          title="Build from scratch"
          sub="Open the full builder"
          onClick={() => { logEvent('transform_success_next_clicked', { target: 'builder' }); navigate('/builder'); }}
        />
      </div>

      {/* unused to satisfy linter */}
      <span style={{ display: 'none' }} aria-hidden="true"><Briefcase /></span>
    </motion.section>
  );
}

// ── Error state ─────────────────────────────────────────────────────

function ErrorState({ message, onRetry, onHome }) {
  return (
    <motion.section
      key="error"
      className="cvp-tfs-screen cvp-tfs-errorscreen"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: EASE_OUT }}
    >
      <div className="cvp-tfs-err-mark" aria-hidden="true">
        <AlertTriangle size={26} strokeWidth={2.2} />
      </div>
      <h1 className="cvp-tfs-h1">Taking longer than expected</h1>
      <p className="cvp-tfs-lede">
        {message || 'Your transform hasn\'t completed yet. Check your email in a few minutes — your CV will be there. If it isn\'t,'} {' '}
        contact <a className="cvp-tfs-link-inline" href="mailto:support@mycvpassport.com">support@mycvpassport.com</a> with this URL.
      </p>
      <div className="cvp-tfs-cta-row">
        <button type="button" className="cvp-tfs-cta cvp-tfs-cta--primary" onClick={onRetry}>
          Try again
        </button>
        <button type="button" className="cvp-tfs-cta cvp-tfs-cta--ghost" onClick={onHome}>
          Back to home
        </button>
      </div>
    </motion.section>
  );
}

// ── Page root ───────────────────────────────────────────────────────

export default function TransformSuccessPage({ user }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = (searchParams.get('session_id') || '').trim();

  // Phase machine: 'confirming' (waiting for paid) → 'transforming' (run
  // is in flight) → 'ready' (have cv_data) → 'error' (timeout / failure).
  const [phase, setPhase] = useState('confirming');
  const [sessionData, setSessionData] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [elapsedMs, setElapsedMs] = useState(0);

  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');
  const [copied, setCopied] = useState(false);

  const startTsRef = useRef(0);
  const pollTimerRef = useRef(null);
  const tickTimerRef = useRef(null);
  const runFiredRef = useRef(false);
  const settledRef = useRef(false);

  // ── Auth gate ────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      const next = sessionId
        ? `/transform/success?session_id=${encodeURIComponent(sessionId)}`
        : '/transform/success';
      navigate(`/auth?mode=signup&next=${encodeURIComponent(next)}`, { replace: true });
    }
  }, [user, navigate, sessionId]);

  // ── Missing session id → bounce ──────────────────────────────────
  useEffect(() => {
    if (user && !sessionId) {
      navigate('/transform', { replace: true });
    }
  }, [user, sessionId, navigate]);

  // ── Stop everything once we settle ───────────────────────────────
  const stopTimers = useCallback(() => {
    if (pollTimerRef.current) { clearTimeout(pollTimerRef.current); pollTimerRef.current = null; }
    if (tickTimerRef.current) { clearInterval(tickTimerRef.current); tickTimerRef.current = null; }
  }, []);

  // ── Poll lifecycle ───────────────────────────────────────────────
  useEffect(() => {
    if (!user || !sessionId) return undefined;

    settledRef.current = false;
    startTsRef.current = Date.now();
    setElapsedMs(0);

    // 100 ms tick — drives the progress bar smoothly without a re-render
    // storm. The 45 s budget gates the user-visible timeout below.
    tickTimerRef.current = setInterval(() => {
      const e = Date.now() - startTsRef.current;
      setElapsedMs(e);
      if (e >= TIMEOUT_MS && !settledRef.current) {
        settledRef.current = true;
        stopTimers();
        setErrorMsg('Your transform is still working — usually it just needs another minute. Check your email or refresh in 60 seconds.');
        setPhase('error');
        logEvent('transform_success_timeout', { session_id: sessionId });
      }
    }, 100);

    const poll = async () => {
      if (settledRef.current) return;
      try {
        const json = await authedFetch(
          `/api/transform?action=status&session_id=${encodeURIComponent(sessionId)}`,
        );
        if (settledRef.current) return;
        setSessionData(json);

        if (json.status === 'transformed') {
          settledRef.current = true;
          stopTimers();
          setPhase('ready');
          logEvent('transform_success_ready', {
            session_id: sessionId,
            user_plan: json.user_plan,
          });
          return;
        }
        if (json.status === 'error') {
          settledRef.current = true;
          stopTimers();
          setErrorMsg(json.error_message || 'The rewrite failed. Please contact support.');
          setPhase('error');
          return;
        }
        if (json.status === 'paid' && !runFiredRef.current) {
          // Free user: webhook flipped us to paid, now kick Claude. Pro
          // / Express landed here already past 'paid' (status was
          // 'transformed' on first poll), so they never enter this branch.
          runFiredRef.current = true;
          setPhase('transforming');
          logEvent('transform_success_run_fired', { session_id: sessionId });
          authedFetch('/api/transform?action=run', {
            method: 'POST',
            body: JSON.stringify({ session_id: sessionId }),
          })
            .then((data) => {
              if (settledRef.current) return;
              if (data?.cv_data) {
                settledRef.current = true;
                stopTimers();
                setSessionData((prev) => ({ ...(prev || {}), ...data, status: 'transformed' }));
                setPhase('ready');
              }
              // Else: poll will pick it up on next tick.
            })
            .catch((e) => {
              // Don't kill the page — the poll still has time to catch
              // a transformed status. Real failures will surface as
              // status='error' through the poll path.
              console.warn('[transform-success] run call failed', e?.message || e);
            });
        }

        pollTimerRef.current = setTimeout(poll, POLL_MS);
      } catch (e) {
        if (settledRef.current) return;
        if (e.code === 'NOT_SIGNED_IN' || e.status === 401) {
          navigate(`/auth?mode=signup&next=${encodeURIComponent(`/transform/success?session_id=${sessionId}`)}`, { replace: true });
          return;
        }
        if (e.status === 404) {
          settledRef.current = true;
          stopTimers();
          setErrorMsg('We couldn\'t find that transform. Start a fresh upload from the home page.');
          setPhase('error');
          return;
        }
        // Transient — keep polling until budget exhausts.
        pollTimerRef.current = setTimeout(poll, POLL_MS);
      }
    };

    poll();

    return () => { stopTimers(); };
  }, [user, sessionId, navigate, stopTimers]);

  // ── PDF download ─────────────────────────────────────────────────
  const handleDownloadPdf = useCallback(async () => {
    if (!sessionData?.cv_data) {
      setDownloadError('CV data not ready yet. Try again in a moment.');
      return;
    }
    setDownloading(true);
    setDownloadError('');
    try {
      logEvent('transform_success_pdf_clicked', { session_id: sessionId });
      await triggerPdfDownload(sessionData.cv_data);
    } catch (e) {
      setDownloadError(e?.message || 'Could not generate the PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  }, [sessionData, sessionId]);

  // ── Edit in builder — passes cv_data through location.state. ─────
  // BuilderPage's state-consumer effect picks up `cvpInitialResume`
  // and calls setResume on mount; the URL stays clean.
  const handleEditBuilder = useCallback(() => {
    if (!sessionData?.cv_data) return;
    logEvent('transform_success_edit_clicked', { session_id: sessionId });
    navigate('/builder', { state: { cvpInitialResume: sessionData.cv_data } });
  }, [sessionData, sessionId, navigate]);

  // ── Copy session link ────────────────────────────────────────────
  const handleCopyLink = useCallback(async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (!url) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
      } else {
        // Safari private + older browsers — fall back to a temporary
        // textarea + execCommand. Not pretty but works everywhere.
        const ta = document.createElement('textarea');
        ta.value = url; ta.setAttribute('readonly', '');
        ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.select();
        document.execCommand('copy'); ta.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setDownloadError('Could not copy. Select the URL manually.');
    }
  }, []);

  const handleRetry = useCallback(() => {
    setPhase('confirming');
    runFiredRef.current = false;
    settledRef.current = false;
    startTsRef.current = Date.now();
    setElapsedMs(0);
    // Re-running the lifecycle: simplest way is a forced reload of
    // this URL, which kicks the poll effect from scratch. Avoids
    // re-implementing the lifecycle outside the effect closure.
    if (typeof window !== 'undefined') window.location.reload();
  }, []);

  // ── Render ───────────────────────────────────────────────────────
  if (!user) return null;
  if (!sessionId) return null;

  return (
    <div className="cvp-tfs-root">
      <TopBar onBack={() => navigate('/')} />
      <main className="cvp-tfs-main">
        {(phase === 'confirming' || phase === 'transforming') && (
          <WorkingState phase={phase} intake={sessionData?.intake} elapsedMs={elapsedMs} />
        )}
        {phase === 'ready' && (
          <ReadyState
            cvData={sessionData?.cv_data}
            intake={sessionData?.intake}
            sessionId={sessionId}
            onDownloadPdf={handleDownloadPdf}
            onEditBuilder={handleEditBuilder}
            onCopyLink={handleCopyLink}
            downloading={downloading}
            downloadError={downloadError}
            copied={copied}
            navigate={navigate}
          />
        )}
        {phase === 'error' && (
          <ErrorState
            message={errorMsg}
            onRetry={handleRetry}
            onHome={() => navigate('/')}
          />
        )}
      </main>

      <style>{`
        .cvp-tfs-root {
          min-height: 100vh;
          background: #0A0A0A;
          color: #F5F5F7;
          font-family: 'Outfit','Inter','Segoe UI',sans-serif;
          display: flex;
          flex-direction: column;
        }
        .cvp-tfs-main {
          flex: 1;
          width: 100%;
          max-width: 880px;
          margin: 0 auto;
          padding: 32px 24px 96px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
        }
        .cvp-tfs-spin { animation: cvp-tfs-spin 1.1s linear infinite; }
        @keyframes cvp-tfs-spin { to { transform: rotate(360deg); } }

        /* topbar — same skin as TransformPage */
        .cvp-tfs-topbar {
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
        .cvp-tfs-back {
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
        .cvp-tfs-back:hover { border-color: #3A3A3A; color: #F5F5F7; background: #141414; }
        .cvp-tfs-brand {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #A0A0A0;
          font-size: 13px;
        }
        .cvp-tfs-brand-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: #D97706;
          box-shadow: 0 0 12px rgba(217, 119, 6, 0.55);
        }
        .cvp-tfs-brand-name { color: #F5F5F7; font-weight: 600; }
        .cvp-tfs-brand-sep { color: #3A3A3A; }
        .cvp-tfs-brand-tag { color: #A0A0A0; }
        .cvp-tfs-topbar-spacer { width: 78px; }

        /* shared screen scaffolding */
        .cvp-tfs-screen {
          width: 100%;
          margin: 28px auto 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .cvp-tfs-h1 {
          font-size: clamp(28px, 4.4vw, 44px);
          font-weight: 600;
          letter-spacing: -0.02em;
          line-height: 1.08;
          margin: 0 0 14px 0;
          color: #F5F5F7;
        }
        .cvp-tfs-lede {
          font-size: 16px;
          line-height: 1.55;
          color: #A0A0A0;
          margin: 0 0 24px 0;
          max-width: 56ch;
        }
        .cvp-tfs-error {
          margin: 16px 0 0 0;
          padding: 12px 16px;
          font-size: 14px;
          line-height: 1.5;
          color: #FF6B5C;
          background: rgba(255, 107, 92, 0.08);
          border: 1px solid rgba(255, 107, 92, 0.24);
          border-radius: 10px;
          max-width: 56ch;
        }

        /* CTA buttons */
        .cvp-tfs-cta-row {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 10px;
          margin-top: 8px;
        }
        .cvp-tfs-cta {
          appearance: none;
          font-size: 15px;
          font-weight: 600;
          letter-spacing: -0.005em;
          padding: 14px 22px;
          border-radius: 12px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-family: inherit;
          transition-property: background-color, border-color, color, box-shadow, transform;
          transition-duration: 200ms;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        }
        .cvp-tfs-cta--primary {
          background: #D97706;
          color: #0A0A0A;
          border: 0;
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.10) inset,
            0 8px 24px -10px rgba(217, 119, 6, 0.45);
        }
        .cvp-tfs-cta--primary:hover { background: #E58210; }
        .cvp-tfs-cta--primary:active { background: #C56A04; transform: translateY(1px); }
        .cvp-tfs-cta--primary:disabled {
          background: #4A380F; color: #8A8A8E; cursor: not-allowed; box-shadow: none;
        }
        .cvp-tfs-cta--primary:focus-visible { outline: 2px solid #FFC371; outline-offset: 3px; }
        .cvp-tfs-cta--ghost {
          background: transparent;
          color: #F5F5F7;
          border: 1px solid #2A2A2A;
        }
        .cvp-tfs-cta--ghost:hover { border-color: #3A3A3A; background: #141414; }
        .cvp-tfs-cta--ghost:active { background: #0F0F0F; }
        .cvp-tfs-cta--ghost:focus-visible { outline: 2px solid #D97706; outline-offset: 3px; }

        /* working state */
        .cvp-tfs-working { padding-top: 24px; }
        .cvp-tfs-ring {
          position: relative;
          width: 132px; height: 132px;
          margin: 18px auto 28px;
        }
        .cvp-tfs-ring-arc {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 2.5px solid transparent;
          border-top-color: #D97706;
          border-right-color: rgba(217, 119, 6, 0.35);
          filter: drop-shadow(0 0 14px rgba(217, 119, 6, 0.35));
        }
        .cvp-tfs-ring-core {
          position: absolute;
          inset: 18px;
          border-radius: 50%;
          background: #141414;
          border: 1px solid #2A2A2A;
          display: flex; align-items: center; justify-content: center;
          color: #D97706;
        }
        .cvp-tfs-warn {
          margin: 4px 0 24px 0;
          padding: 12px 16px;
          font-size: 13.5px;
          line-height: 1.5;
          color: #F5F5F7;
          background: rgba(217, 119, 6, 0.08);
          border: 1px solid rgba(217, 119, 6, 0.32);
          border-radius: 10px;
          max-width: 52ch;
          display: flex;
          gap: 10px;
          align-items: flex-start;
          text-align: left;
        }
        .cvp-tfs-warn svg { color: #D97706; flex-shrink: 0; margin-top: 2px; }
        .cvp-tfs-warn strong { color: #D97706; font-weight: 600; }
        .cvp-tfs-progress {
          width: 100%;
          max-width: 360px;
          height: 6px;
          background: #1C1C1C;
          border: 1px solid #2A2A2A;
          border-radius: 999px;
          overflow: hidden;
          margin-top: 4px;
        }
        .cvp-tfs-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #D97706 0%, #E58210 100%);
          box-shadow: 0 0 12px rgba(217, 119, 6, 0.45);
          transition-property: width;
          transition-duration: 120ms;
          transition-timing-function: linear;
        }
        .cvp-tfs-progress-text {
          margin-top: 8px;
          font-size: 12px;
          color: #6E6E73;
          letter-spacing: 0.04em;
        }

        /* ready state */
        .cvp-tfs-ready { padding-top: 8px; }
        .cvp-tfs-success-mark {
          width: 64px; height: 64px;
          border-radius: 50%;
          background: rgba(29, 158, 117, 0.14);
          border: 1px solid rgba(29, 158, 117, 0.4);
          color: #1D9E75;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 18px;
          box-shadow: 0 10px 28px -16px rgba(29, 158, 117, 0.6);
        }

        /* session link block */
        .cvp-tfs-link {
          margin: 28px auto 0;
          width: 100%;
          max-width: 560px;
          background: #141414;
          border: 1px solid #2A2A2A;
          border-radius: 12px;
          padding: 16px 18px;
          text-align: left;
        }
        .cvp-tfs-link-head {
          font-size: 12px;
          color: #A0A0A0;
          letter-spacing: 0.02em;
          margin-bottom: 8px;
        }
        .cvp-tfs-link-row {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #0A0A0A;
          border: 1px solid #2A2A2A;
          border-radius: 8px;
          padding: 8px 10px;
        }
        .cvp-tfs-link-url {
          flex: 1;
          font-family: 'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace;
          font-size: 12px;
          color: #C0C0C5;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .cvp-tfs-link-copy {
          appearance: none;
          background: transparent;
          border: 1px solid #2A2A2A;
          color: #A0A0A0;
          font-family: inherit;
          font-size: 12px;
          padding: 6px 10px;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          transition-property: border-color, color, background-color;
          transition-duration: 200ms;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        }
        .cvp-tfs-link-copy:hover { border-color: #3A3A3A; color: #F5F5F7; background: #141414; }
        .cvp-tfs-link-copy:focus-visible { outline: 2px solid #D97706; outline-offset: 2px; }
        .cvp-tfs-link-inline { color: #D97706; text-decoration: underline; text-underline-offset: 3px; }

        /* next-steps cards */
        .cvp-tfs-next-h {
          margin: 36px 0 14px 0;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: #6E6E73;
          text-align: left;
          width: 100%;
          max-width: 720px;
        }
        .cvp-tfs-next-grid {
          width: 100%;
          max-width: 720px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        .cvp-tfs-next {
          appearance: none;
          background: #141414;
          border: 1px solid #2A2A2A;
          border-radius: 12px;
          padding: 18px 16px;
          color: #F5F5F7;
          font-family: inherit;
          text-align: left;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 10px;
          position: relative;
          transition-property: border-color, background-color, transform;
          transition-duration: 200ms;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        }
        .cvp-tfs-next:hover { border-color: #3A3A3A; background: #161618; transform: translateY(-1px); }
        .cvp-tfs-next:focus-visible { outline: 2px solid #D97706; outline-offset: 2px; }
        .cvp-tfs-next-icon {
          width: 36px; height: 36px;
          border-radius: 9px;
          background: #1C1C1C;
          border: 1px solid #2A2A2A;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #D97706;
        }
        .cvp-tfs-next-body {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .cvp-tfs-next-title {
          font-size: 14.5px;
          font-weight: 600;
          color: #F5F5F7;
        }
        .cvp-tfs-next-sub {
          font-size: 12.5px;
          color: #A0A0A0;
        }
        .cvp-tfs-next-arrow {
          position: absolute;
          top: 14px;
          right: 14px;
          color: #6E6E73;
        }

        /* error state */
        .cvp-tfs-err-mark {
          width: 64px; height: 64px;
          border-radius: 50%;
          background: rgba(255, 107, 92, 0.10);
          border: 1px solid rgba(255, 107, 92, 0.36);
          color: #FF6B5C;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 18px;
        }

        /* responsive */
        @media (max-width: 720px) {
          .cvp-tfs-main { padding: 20px 16px 80px; }
          .cvp-tfs-topbar { padding: 12px 16px; }
          .cvp-tfs-topbar-spacer { display: none; }
          .cvp-tfs-h1 { font-size: clamp(24px, 7vw, 32px); }
          .cvp-tfs-next-grid { grid-template-columns: 1fr; }
          .cvp-tfs-ring { width: 108px; height: 108px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .cvp-tfs-spin { animation: none; }
          .cvp-tfs-progress-fill { transition-duration: 0.01ms; }
        }
      `}</style>
    </div>
  );
}
