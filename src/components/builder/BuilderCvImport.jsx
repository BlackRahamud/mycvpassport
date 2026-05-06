import { useState, useRef, useCallback } from 'react';
import { Upload } from 'lucide-react';
import { supabase } from '../../appSupabaseClient';
import { extractCvText } from '../../services/cvExtraction';

const ACCEPT =
  '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * variant:
 *   "card"          (default) — full empty-state card with title + description
 *   "header-button"           — compact ghost button for the builder topbar
 *
 * Both share the same extract → upload (mode=import-only) → parse pipeline
 * and fire onImported(cv_data, filename) on success.
 */
export default function BuilderCvImport({ onImported, variant = "card" }) {
  const inputRef = useRef(null);
  const [stage, setStage] = useState('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [errorHint, setErrorHint] = useState('');

  const isBusy = stage === 'reading' || stage === 'uploading' || stage === 'parsing';

  const openPicker = useCallback(() => {
    if (isBusy) return;
    setErrorMsg('');
    setErrorHint('');
    if (inputRef.current) {
      inputRef.current.value = '';
      inputRef.current.click();
    }
  }, [isBusy]);

  const handleFile = useCallback(
    async (file) => {
      if (!file) return;
      setErrorMsg('');
      setErrorHint('');

      const lower = (file.name || '').toLowerCase();
      if (!lower.endsWith('.pdf') && !lower.endsWith('.docx')) {
        setStage('error');
        setErrorMsg('Unsupported file type.');
        setErrorHint('Only PDF and DOCX files are supported.');
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
        const { data: { session } = {} } = await supabase.auth.getSession();
        const accessToken = session?.access_token;
        if (!accessToken) {
          setStage('error');
          setErrorMsg('Please sign in again to import.');
          return;
        }

        const uploadRes = await fetch('/api/transform?action=upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            text,
            mode: 'import-only',
            source_kind: kind,
            source_chars: chars,
          }),
        });
        const uploadJson = await uploadRes.json().catch(() => ({}));
        if (!uploadRes.ok || !uploadJson.ok || !uploadJson.session_id) {
          setStage('error');
          setErrorMsg(uploadJson.error || 'Could not start import.');
          setErrorHint('Please try again in a moment.');
          return;
        }

        setStage('parsing');
        const parseRes = await fetch('/api/transform?action=parse', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ session_id: uploadJson.session_id }),
        });
        const parseJson = await parseRes.json().catch(() => ({}));
        if (!parseRes.ok || !parseJson.ok || !parseJson.cv_data) {
          setStage('error');
          setErrorMsg(parseJson.error || 'Could not import your CV.');
          setErrorHint('Try a different file or paste your text.');
          return;
        }

        setStage('idle');
        onImported(parseJson.cv_data, file.name);
      } catch (e) {
        setStage('error');
        setErrorMsg(e?.message || 'Something went wrong reading your file.');
        setErrorHint(e?.hint || 'Try a different file.');
      }
    },
    [onImported],
  );

  const onPickerChange = useCallback(
    (e) => {
      const f = e.target.files && e.target.files[0];
      handleFile(f);
    },
    [handleFile],
  );

  const stageLabel =
    stage === 'reading' ? 'Reading your file…'
      : stage === 'uploading' ? 'Sending to AI…'
        : stage === 'parsing' ? 'Extracting your details…'
          : null;

  if (variant === "header-button") {
    const hasError = stage === "error";
    const compactLabel = stageLabel
      || (hasError ? "Try again" : "Import CV");
    const tooltip = hasError
      ? `${errorMsg || "Import failed"}${errorHint ? " — " + errorHint : ""}`
      : "Upload your existing CV (PDF or DOCX)";
    return (
      <>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          onChange={onPickerChange}
          style={{ display: 'none' }}
          aria-hidden
          tabIndex={-1}
        />
        <button
          type="button"
          onClick={openPicker}
          disabled={isBusy}
          aria-label="Import existing CV"
          title={tooltip}
          className="cvp-builder-import-header-btn"
          data-state={hasError ? "error" : (isBusy ? "busy" : "idle")}
        >
          <Upload size={12} strokeWidth={1.8} aria-hidden />
          <span>{compactLabel}</span>
        </button>
      </>
    );
  }

  return (
    <div
      style={{
        background: '#141414',
        border: '1px solid #2A2A2A',
        borderRadius: 16,
        padding: 16,
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        onChange={onPickerChange}
        style={{ display: 'none' }}
        aria-hidden
        tabIndex={-1}
      />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ minWidth: 0, flex: '1 1 220px' }}>
          <p style={{ margin: 0, fontSize: 14, color: '#FFFFFF', fontWeight: 600 }}>
            Already have a CV?
          </p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#A0A0A0', lineHeight: 1.45 }}>
            Import your PDF or DOCX. We'll fill the builder for you in about 10 seconds.
          </p>
        </div>
        <button
          type="button"
          onClick={openPicker}
          disabled={isBusy}
          style={{
            padding: '10px 18px',
            background: isBusy ? '#1C1C1C' : '#FFFFFF',
            color: isBusy ? '#A0A0A0' : '#000000',
            border: isBusy ? '1px solid #2A2A2A' : 'none',
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 13,
            cursor: isBusy ? 'wait' : 'pointer',
            flexShrink: 0,
            transition: 'background-color 150ms cubic-bezier(0.4,0,0.2,1), color 150ms cubic-bezier(0.4,0,0.2,1)',
          }}
        >
          {stageLabel || 'Import CV'}
        </button>
      </div>
      {stage === 'error' && (
        <div
          role="alert"
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 10,
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.35)',
          }}
        >
          <p style={{ margin: 0, fontSize: 13, color: '#F87171', fontWeight: 600 }}>
            {errorMsg}
          </p>
          {errorHint ? (
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#A0A0A0' }}>
              {errorHint}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
