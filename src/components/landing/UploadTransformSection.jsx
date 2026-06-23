// =============================================================
// src/components/landing/UploadTransformSection.jsx
//
// Conversion section that sits directly under the Hero. One job:
// turn a returning visitor's existing CV into a paid Upload &
// Transform session. Click → file picker → /api/transform?action=upload
// → stash session id + access token in localStorage → /transform.
//
// Backend contract: /api/transform?action=upload requires a 5-field
// intake. The landing copy intentionally doesn't ask 5 questions
// (kills conversion); we send safe defaults so the upload succeeds,
// then the /transform page is where the user refines intake before pay.
// =============================================================

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../appSupabaseClient';
import { extractCvText } from '../../services/cvExtraction';
import safeFetch from '../../lib/net/safeFetch';
import { logEvent } from '../../lib/analytics/logEvent';

// ── Founder-locked copy ────────────────────────────────────────────
const EYEBROW = 'Upload & Transform';
const HEADLINE = 'Have an existing CV? Fix it in 60 seconds.';
const SUBTEXT =
  'Upload your PDF or DOCX. AI rewrites it for GCC or India hiring norms. AED 49 — no subscription.';
const TRUST =
  'Professional CV writers charge AED 500+. Same result. 60 seconds.';
const CTA_LABEL = 'Upload & Transform — AED 49';
const FINEPRINT = 'Free with Active Hunter or Express Pass.';

// ── File input config ──────────────────────────────────────────────
const ACCEPT =
  '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

// Default intake sent at upload time. The /transform page (next phase)
// is where the user refines target_market / target_city / target_role
// before payment runs.
const DEFAULT_INTAKE = {
  target_market: 'UAE',
  target_city: 'Dubai',
  target_role: 'Professional',
  language_pref: 'English',
  experience_level: 'Mid',
};

const FADE = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.32, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};
const INSTANT = { hidden: { opacity: 1, y: 0 }, show: { opacity: 1, y: 0 } };

function UploadGlyph() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function CheckGlyph() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <polyline points="8 12 11 15 16 9" />
    </svg>
  );
}

export default function UploadTransformSection({ user }) {
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const variants = reduce ? INSTANT : FADE;

  const inputRef = useRef(null);
  const redirectTimerRef = useRef(null);
  const [stage, setStage] = useState('idle'); // idle | reading | uploading | success | error
  const [errorMsg, setErrorMsg] = useState('');
  const [errorHint, setErrorHint] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  const isBusy = stage === 'reading' || stage === 'uploading' || stage === 'success';

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  const openPicker = useCallback(() => {
    if (isBusy) return;
    logEvent('transform_section_cta_clicked', {
      section: 'landing_upload_transform',
      is_authenticated: !!user?.id,
    });
    if (!user?.id) {
      // Auth gate: send unsigned-in users to signup first. They'll
      // re-upload after auth — small friction, accepted for v1.
      navigate('/auth?mode=signup&next=/');
      return;
    }
    if (inputRef.current) {
      inputRef.current.value = ''; // re-pick of same file works
      inputRef.current.click();
    }
  }, [isBusy, navigate, user?.id]);

  const handleFile = useCallback(
    async (file) => {
      if (!file) return;
      setErrorMsg('');
      setErrorHint('');

      const lower = (file.name || '').toLowerCase();
      const okExt = lower.endsWith('.pdf') || lower.endsWith('.docx');
      if (!okExt) {
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
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const accessToken = session?.access_token;
        if (!accessToken) {
          // Token might have expired between mount and click.
          navigate('/auth?mode=signup&next=/');
          return;
        }

        const r = await safeFetch('/api/transform?action=upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            text,
            intake: DEFAULT_INTAKE,
            source_kind: kind,
            source_chars: chars,
          }),
        });
        const json = await r.json().catch(() => ({}));
        if (!r.ok || !json.ok || !json.session_id) {
          setStage('error');
          setErrorMsg(json.error || 'Could not start your transform.');
          setErrorHint('Please try again in a moment.');
          return;
        }

        // Stash auth + session id so /transform can authenticate API
        // calls without re-fetching from Supabase. Wrapped because
        // Safari private mode disables localStorage entirely.
        try {
          localStorage.setItem('cvp_transform_token', accessToken);
          localStorage.setItem('cvp_transform_session', json.session_id);
        } catch {
          /* localStorage disabled — non-fatal, /transform will
             fall back to fresh supabase.auth.getSession() */
        }

        logEvent('transform_section_upload_succeeded', {
          session_id: json.session_id,
          user_plan: json.user_plan,
          status: json.status,
          source_kind: kind,
          source_chars: chars,
        });

        // 1s "Got your CV ✓" confirmation beat before redirect.
        // Gives the user a moment to register success rather than
        // a jarring page swap on a fast upload.
        setStage('success');
        redirectTimerRef.current = setTimeout(() => {
          navigate(`/transform?session_id=${encodeURIComponent(json.session_id)}`);
        }, 1000);
      } catch (e) {
        // CvExtractionError carries .code + .hint; everything else
        // gets a generic message. We never log the file content.
        setStage('error');
        setErrorMsg(e?.message || 'Something went wrong reading your file.');
        setErrorHint(e?.hint || 'Try a different file.');
        logEvent('transform_section_upload_failed', {
          code: e?.code || 'unknown',
        });
      }
    },
    [navigate],
  );

  const onPickerChange = useCallback(
    (e) => {
      const f = e.target.files && e.target.files[0];
      handleFile(f);
    },
    [handleFile],
  );

  const onDragOver = useCallback((e) => {
    e.preventDefault();
    if (isBusy) return;
    setIsDragging(true);
  }, [isBusy]);
  const onDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);
  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);
      if (isBusy) return;
      if (!user?.id) {
        navigate('/auth?mode=signup&next=/');
        return;
      }
      const f = e.dataTransfer.files && e.dataTransfer.files[0];
      handleFile(f);
    },
    [handleFile, isBusy, navigate, user?.id],
  );

  const onKeyDown = useCallback(
    (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openPicker();
      }
    },
    [openPicker],
  );

  const stageLabel =
    stage === 'reading' ? 'Reading your CV…' :
    stage === 'uploading' ? 'Uploading…' :
    stage === 'success' ? 'Got your CV ✓' :
    null;

  const isSuccess = stage === 'success';

  return (
    <section
      id="upload-transform"
      className="cvp-utr"
      aria-label="Upload and transform your existing CV"
    >
      <style>{`
        .cvp-utr {
          background: var(--color-surface-00, #0A0A0A);
          color: var(--color-text-primary, #F5F5F7);
          padding: 104px 24px;
          box-sizing: border-box;
        }
        .cvp-utr-inner {
          max-width: 1080px;
          margin: 0 auto;
          display: grid;
          grid-template-columns: 1.05fr 0.95fr;
          gap: 64px;
          align-items: center;
        }
        .cvp-utr-eyebrow {
          display: inline-block;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--color-accent, #D97706);
          margin-bottom: 18px;
        }
        .cvp-utr-headline {
          font-size: clamp(32px, 4.6vw, 52px);
          font-weight: 600;
          letter-spacing: -0.022em;
          line-height: 1.06;
          margin: 0 0 20px 0;
          color: var(--color-text-primary, #F5F5F7);
        }
        .cvp-utr-sub {
          font-size: 17px;
          line-height: 1.6;
          color: var(--color-text-secondary, #A0A0A0);
          margin: 0 0 28px 0;
          max-width: 54ch;
        }
        .cvp-utr-trust {
          font-size: 13px;
          line-height: 1.5;
          color: #6E6E73;
          margin: 0;
          max-width: 54ch;
        }

        .cvp-utr-action {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .cvp-utr-drop {
          position: relative;
          background: var(--color-surface-01, #141414);
          border: 1.5px dashed var(--color-border, #2A2A2A);
          border-radius: 16px;
          padding: 40px 24px;
          text-align: center;
          cursor: pointer;
          color: var(--color-text-secondary, #A0A0A0);
          min-height: 184px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          gap: 12px;
          transition-property: border-color, background-color, transform;
          transition-duration: 240ms;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        }
        .cvp-utr-drop:hover {
          border-color: #4A4A4F;
          background: #161618;
          color: var(--color-text-primary, #F5F5F7);
        }
        .cvp-utr-drop:focus-visible {
          outline: 2px solid var(--color-accent, #D97706);
          outline-offset: 3px;
          border-color: var(--color-accent, #D97706);
        }
        .cvp-utr-drop.is-dragging {
          border-color: var(--color-accent, #D97706);
          background: rgba(217, 119, 6, 0.06);
          color: var(--color-text-primary, #F5F5F7);
          transform: scale(1.006);
        }
        .cvp-utr-drop.is-busy {
          cursor: wait;
          opacity: 0.86;
        }
        .cvp-utr-drop.is-success {
          border-color: #1D9E75;
          background: rgba(29, 158, 117, 0.08);
          color: #1D9E75;
          cursor: default;
        }
        .cvp-utr-drop.is-success .cvp-utr-drop-title {
          color: #1D9E75;
        }
        .cvp-utr-drop-title {
          font-size: 15px;
          font-weight: 500;
          color: var(--color-text-primary, #F5F5F7);
          margin: 0;
        }
        .cvp-utr-drop-sub {
          font-size: 13px;
          color: #6E6E73;
          margin: 0;
        }
        .cvp-utr-drop-beta {
          font-size: 11.5px;
          font-weight: 500;
          color: #8A8A8E;
          letter-spacing: 0.01em;
          margin: -2px 0 0 0;
          opacity: 0.85;
        }

        .cvp-utr-cta {
          appearance: none;
          background: var(--color-accent, #D97706);
          color: #0A0A0A;
          font-size: 16px;
          font-weight: 600;
          letter-spacing: -0.01em;
          border: 0;
          padding: 16px 24px;
          border-radius: 12px;
          cursor: pointer;
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.08) inset,
            0 8px 24px -8px rgba(217, 119, 6, 0.35);
          transition-property: background-color, box-shadow;
          transition-duration: 200ms;
          transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
        }
        .cvp-utr-cta:hover {
          background: #E58210;
          box-shadow:
            0 1px 0 rgba(255, 255, 255, 0.10) inset,
            0 12px 28px -8px rgba(217, 119, 6, 0.45);
        }
        .cvp-utr-cta:active { background: #C56A04; }
        .cvp-utr-cta:disabled {
          background: #4A380F;
          color: #8A8A8E;
          cursor: not-allowed;
          box-shadow: none;
        }
        .cvp-utr-cta:focus-visible {
          outline: 2px solid #FFC371;
          outline-offset: 3px;
        }

        .cvp-utr-fineprint {
          font-size: 13px;
          color: #6E6E73;
          margin: 2px 0 0 0;
          text-align: center;
        }
        .cvp-utr-error {
          font-size: 14px;
          line-height: 1.5;
          color: #FF6B5C;
          background: rgba(255, 107, 92, 0.08);
          border: 1px solid rgba(255, 107, 92, 0.24);
          border-radius: 10px;
          padding: 12px 16px;
        }
        .cvp-utr-error strong { color: #FF6B5C; font-weight: 600; }

        @media (max-width: 880px) {
          .cvp-utr { padding: 72px 20px; }
          .cvp-utr-inner {
            grid-template-columns: 1fr;
            gap: 36px;
          }
          .cvp-utr-headline { font-size: clamp(28px, 7.4vw, 40px); }
          .cvp-utr-sub { font-size: 16px; margin-bottom: 22px; }
          .cvp-utr-drop { padding: 32px 20px; min-height: 168px; }
        }

        @media (prefers-reduced-motion: reduce) {
          .cvp-utr-drop, .cvp-utr-cta { transition-duration: 0.01ms; }
          .cvp-utr-drop.is-dragging { transform: none; }
        }
      `}</style>

      <motion.div
        className="cvp-utr-inner"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        variants={variants}
      >
        <div className="cvp-utr-copy">
          <span className="cvp-utr-eyebrow">{EYEBROW}</span>
          <h2 className="cvp-utr-headline">{HEADLINE}</h2>
          <p className="cvp-utr-sub">{SUBTEXT}</p>
          <p className="cvp-utr-trust">{TRUST}</p>
        </div>

        <div className="cvp-utr-action">
          <div
            className={
              'cvp-utr-drop' +
              (isDragging ? ' is-dragging' : '') +
              (isBusy && !isSuccess ? ' is-busy' : '') +
              (isSuccess ? ' is-success' : '')
            }
            onClick={openPicker}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            role="button"
            tabIndex={0}
            onKeyDown={onKeyDown}
            aria-label="Upload your CV — drop a file here or press Enter to choose"
            aria-busy={isBusy ? 'true' : 'false'}
          >
            {isSuccess ? <CheckGlyph /> : <UploadGlyph />}
            <p className="cvp-utr-drop-title">
              {stageLabel || 'Drop your CV here, or click to browse'}
            </p>
            {!isSuccess && (
              <p className="cvp-utr-drop-beta">
                🧪 Beta — We&apos;re improving this. Full launch in a few days.
              </p>
            )}
            <p className="cvp-utr-drop-sub">
              {isSuccess ? 'Opening your transform…' : 'PDF or DOCX, up to 10 MB'}
            </p>
          </div>

          <motion.button
            type="button"
            className="cvp-utr-cta"
            onClick={openPicker}
            disabled={isBusy}
            whileHover={reduce || isBusy ? {} : { scale: 1.015 }}
            whileTap={reduce || isBusy ? {} : { scale: 0.985 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
          >
            {isBusy ? stageLabel : CTA_LABEL}
          </motion.button>

          <p className="cvp-utr-fineprint">{FINEPRINT}</p>

          {stage === 'error' && (
            <div className="cvp-utr-error" role="alert">
              <strong>{errorMsg}</strong>
              {errorHint ? <span>{' '}{errorHint}</span> : null}
            </div>
          )}

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            onChange={onPickerChange}
            style={{ display: 'none' }}
            aria-hidden="true"
            tabIndex={-1}
          />
        </div>
      </motion.div>
    </section>
  );
}
