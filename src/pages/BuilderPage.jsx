import { useState, useEffect, useCallback, useRef, useMemo, useLayoutEffect, useReducer, Fragment, forwardRef } from "react";
import { flushSync, createPortal } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  AlertCircle,
  AlertTriangle,
  Award,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Cpu,
  Download,
  FileText,
  Globe,
  GraduationCap,
  GripVertical,
  Lightbulb,
  List,
  Loader2,
  Moon,
  Pencil,
  Redo2,
  Save,
  Sparkles,
  Star,
  Sun,
  Trash2,
  Undo2,
  User,
  X,
} from "lucide-react";
import JobMatch from "../JobMatch";
import ATSChecker from "../ATSChecker";
import CoverLetterModal from "../CoverLetterModal";
import UpgradeModal from "../UpgradeModal";
import AIRewriteModal from "../components/AIRewriteModal";
import AIWorkingGlow from "../components/AIWorkingGlow";
import useAiImprove from "../hooks/useAiImprove";
import { hasFeatureAccess } from "../utils/paywall";
import { deriveAiButtonLabel, isAiExhausted } from "../lib/aiButtonLabel";
import SynthesisOverlay from "../components/SynthesisOverlay";
import CompletionScreen from "../components/CompletionScreen";
import { FAB } from "../components/FAB";
import { writeFabMemory } from "../components/FAB/FABLogic";
import { invalidateGatekeeperCache, getGatekeeperData } from "../services/gatekeeper";
import { GUIDE_STEPS } from "../components/FAB/FABGuideSteps";
import { saveResume } from "../resumeDb";
import { downloadResumeFromPreview } from "../downloadResumeFromPreview";
import { clearBulletMarkers } from "../experiencePointsPreview";
import CompletionStrip from "../components/CompletionStrip";
import TemplateSelect from "../components/TemplateSelect";
import AtsFixesPanel from "../components/ats/AtsFixesPanel";
import AtsWelcomeModal from "../components/ats/AtsWelcomeModal";
import { getDraftStorageKey, readCvDraft, writeCvDraft, clearCvDraft } from "../lib/cvDraft";
import { getTheme, setTheme } from "../lib/theme";
import BrandLockup from "../components/BrandLockup";
import { normalizeAtsGaps, gapsFromLegacyParam, partitionGapsByResolution } from "../lib/ats/atsGaps";
import { logEvent } from "../lib/analytics/logEvent";
import { BuilderTemplatesTab } from "./TemplatesPage";
import {
  TEMPLATES,
  EMPTY_RESUME,
  EMPTY_EXP,
  EMPTY_EDU,
  EMPTY_CERT,
  OPTIONAL_BUILDER_SECTIONS,
  normalizeCertificationsArray,
  normalizeResumeForBuilder,
  scrubLegacyDraftPrefills,
  splitCommaItems,
  buildExperiencePeriod,
  buildEducationYearLine,
  builderAtsScore,
  isCvDataEmptyForTemplateApply,
  isGulfLocation,
} from "../cvShared";
import BuilderCvImport from "../components/builder/BuilderCvImport";
import { getRoleSuggestions } from "../utils/detectRole";
import { CB_UI } from "../builderStyles";
import useDocumentPreview from "../components/preview/useDocumentPreview";
import DocumentSheets from "../components/preview/DocumentSheets";
import { useCvProgress } from "../hooks/useCvProgress";

function CertificationsBuilderSection({ resume, setResume, certificationEditor, setCertificationEditor, onRemoveSection, jobTitle }) {
  const list = normalizeCertificationsArray(resume.certifications);
  const certRolePack = useMemo(() => getRoleSuggestions(jobTitle), [jobTitle]);
  const [inlineNameEdit, setInlineNameEdit] = useState(null);
  const [certSuggestionsDismissed, setCertSuggestionsDismissed] = useState(false);
  const [certYearError, setCertYearError] = useState(null);
  const certYearCursorRef = useRef(null);
  const certYearInputRef = useRef(null);

  useEffect(() => {
    if (certificationEditor) setInlineNameEdit(null);
  }, [certificationEditor]);

  useEffect(() => {
    if (!certificationEditor) setCertYearError(null);
  }, [certificationEditor]);

  useLayoutEffect(() => {
    if (!certificationEditor) return;
    const pos = certYearCursorRef.current;
    if (pos == null) return;
    certYearCursorRef.current = null;
    const el = certYearInputRef.current;
    if (!el) return;
    const p = Math.min(pos, el.value.length);
    el.setSelectionRange(p, p);
  }, [certificationEditor?.draft.year, certificationEditor]);

  const certNameTaken = (name) =>
    list.some((c) => String(c.name || "").trim().toLowerCase() === String(name).trim().toLowerCase());

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {certRolePack?.certifications?.length && !certSuggestionsDismissed ? (
        <div
          style={{
            background: "rgba(217,119,6,0.06)",
            border: "1px dashed rgba(217,119,6,0.45)",
            borderRadius: 12,
            padding: 12,
            marginBottom: 10,
          }}
        >
          <div
            style={{
              marginBottom: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Lightbulb size={11} strokeWidth={1.8} style={{ color: "var(--accent-text)" }} aria-hidden />
              <span style={{ fontSize: 11, color: "var(--accent-text)", fontWeight: 600 }}>Suggested certifications, not on your CV yet</span>
            </span>
            <button
              type="button"
              title="Dismiss suggestions"
              onClick={() => setCertSuggestionsDismissed(true)}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-secondary)",
                cursor: "pointer",
                padding: 0,
                display: "flex",
                alignItems: "center",
              }}
            >
              <X size={13} strokeWidth={2} aria-hidden />
            </button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "flex-start" }}>
            {certRolePack.certifications.map((cert) => {
              const taken = certNameTaken(cert);
              return (
                <button
                  key={cert}
                  type="button"
                  disabled={taken}
                  onClick={() => {
                    if (taken) return;
                    setResume((r) => ({
                      ...r,
                      certifications: [...normalizeCertificationsArray(r.certifications), { ...EMPTY_CERT, name: cert, issuer: "", year: "" }],
                    }));
                  }}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    background: "transparent",
                    border: "1px dashed rgba(217,119,6,0.45)",
                    color: "var(--accent-text)",
                    borderRadius: 999,
                    padding: "4px 10px",
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: taken ? "not-allowed" : "pointer",
                    opacity: taken ? 0.4 : 1,
                    fontFamily: "inherit",
                  }}
                >
                  {taken ? cert : `+ ${cert}`}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
      {list.length === 0 && !certificationEditor && (
        <div className="cvp-ghost-card" aria-hidden="true">
          <div className="cvp-ghost-line cvp-ghost-line--w60" />
          <div className="cvp-ghost-line cvp-ghost-line--w40" />
          <p className="cvp-ghost-card-text">No certifications yet. Add one below.</p>
        </div>
      )}
      {list.map((c, i) =>
        inlineNameEdit && inlineNameEdit.index === i ? (
          <div
            key={i}
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              padding: "12px 16px",
              marginBottom: 8,
            }}
          >
            <div style={{ display: "grid", gap: 8 }}>
              <input
                className="cvp-input"
                value={inlineNameEdit.draft}
                onChange={(e) => setInlineNameEdit({ index: i, draft: e.target.value })}
                aria-label="Certification name"
              />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                <button
                  type="button"
                  style={CB_UI.btn}
                  onClick={() => {
                    const t = String(inlineNameEdit.draft || "").trim();
                    if (!t) return;
                    setResume((r) => {
                      const cur = normalizeCertificationsArray(r.certifications);
                      const u = [...cur];
                      u[i] = { ...u[i], name: t };
                      return { ...r, certifications: u };
                    });
                    setInlineNameEdit(null);
                  }}
                >
                  Save
                </button>
                <button
                  type="button"
                  style={{ ...CB_UI.btn, background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
                  onClick={() => setInlineNameEdit(null)}
                >
                  Cancel
                </button>
              </div>
              {c.issuer ? <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{c.issuer}</div> : null}
              {c.year ? <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>{c.year}</div> : null}
            </div>
          </div>
        ) : (
          <div key={i} style={{ marginBottom: 6 }}>
            <BuilderEntryRow
              title={c.name || "Certification"}
              subtitle={[c.issuer, c.year].filter(Boolean).join(" · ") || "—"}
              onRowClick={() => {
                setInlineNameEdit(null);
                setCertificationEditor({ mode: "edit", index: i, draft: { ...EMPTY_CERT, ...c } });
              }}
              onMoveUp={() =>
                setResume((r) => ({
                  ...r,
                  certifications: moveArrayItem(normalizeCertificationsArray(r.certifications), i, i - 1),
                }))
              }
              onMoveDown={() =>
                setResume((r) => ({
                  ...r,
                  certifications: moveArrayItem(normalizeCertificationsArray(r.certifications), i, i + 1),
                }))
              }
              disableUp={i === 0}
              disableDown={i >= list.length - 1}
              onEdit={() => {
                setCertificationEditor(null);
                setInlineNameEdit({ index: i, draft: c.name || "" });
              }}
              onDelete={() => {
                setResume((r) => ({
                  ...r,
                  certifications: normalizeCertificationsArray(r.certifications).filter((_, j) => j !== i),
                }));
                setInlineNameEdit((prev) => (prev && prev.index === i ? null : prev));
              }}
            />
          </div>
        )
      )}
      {certificationEditor && (
        <div className="cvp-glass-modal" style={{ padding: 16, display: "grid", gap: 10 }}>
          <div>
            <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Name</label>
            <input
              className="cvp-input"
              placeholder="Certification name"
              value={certificationEditor.draft.name}
              onChange={(e) => setCertificationEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, name: e.target.value } } : null))}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Issuer</label>
            <input
              className="cvp-input"
              placeholder="Issuing organisation (optional)"
              value={certificationEditor.draft.issuer}
              onChange={(e) => setCertificationEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, issuer: e.target.value } } : null))}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Date issued (MM/YYYY)</label>
            <input
              ref={certYearInputRef}
              className="cvp-input"
              placeholder="08/2023 (optional)"
              value={certificationEditor.draft.year}
              onChange={(e) => {
                const next = processMmYyyyInput(e.target.value, { allowPresent: false });
                certYearCursorRef.current = next.cursor;
                flushSync(() => {
                  setCertYearError(next.error);
                  setCertificationEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, year: next.value } } : null));
                });
              }}
              aria-invalid={certYearError ? true : undefined}
            />
            {certYearError ? (
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--danger)", lineHeight: 1.35 }}>{certYearError}</p>
            ) : null}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <button type="button" className="cvp-glass-modal-cancel" style={{ ...CB_UI.btn, background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border)" }} onClick={() => setCertificationEditor(null)}>Cancel</button>
            <button
              type="button"
              style={CB_UI.btn}
              onClick={() => {
                const { mode, index, draft } = certificationEditor;
                const next = { ...EMPTY_CERT, name: draft.name.trim(), issuer: draft.issuer.trim(), year: draft.year.trim() };
                if (!next.name) return;
                setResume((r) => {
                  const cur = normalizeCertificationsArray(r.certifications);
                  if (mode === "add") return { ...r, certifications: [...cur, next] };
                  const u = [...cur];
                  u[index] = next;
                  return { ...r, certifications: u };
                });
                setCertificationEditor(null);
              }}
            >
              Save
            </button>
          </div>
        </div>
      )}
      <button
        type="button"
        className="cvp-add-row-ghost cvp-builder-add-entry-btn"
        onClick={() => setCertificationEditor({ mode: "add", index: -1, draft: { ...EMPTY_CERT } })}
      >
        + Add a certification
      </button>
      <button
        type="button"
        style={{ ...CB_UI.btn, alignSelf: "flex-start", background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
        onClick={onRemoveSection}
      >
        Remove section
      </button>
    </div>
  );
}

const CV_IMPORT_FIELDS = [
  (r) => Boolean(String(r.name || "").trim()),
  (r) => Boolean(String(r.title || "").trim()),
  (r) => Boolean(String(r.email || "").trim()),
  (r) => Boolean(String(r.phone || "").trim()),
  (r) => Boolean(String(r.linkedin || "").trim()),
  (r) => Boolean(String(r.location || "").trim() && String(r.location).trim() !== "Dubai, UAE"),
  (r) => Boolean(String(r.summary || "").trim()),
  (r) => Boolean(String(r.skills || "").trim()),
  (r) => Boolean(String(r.languages || "").trim() && String(r.languages).trim() !== "English, Hindi"),
  (r) => Array.isArray(r.experience) && r.experience.some((e) => e?.company || e?.role),
  (r) => Array.isArray(r.education) && r.education.some((e) => e?.school || e?.degree),
  (r) => Array.isArray(r.certifications) && r.certifications.some((c) => c?.name),
];
const CV_IMPORT_FIELD_TOTAL = CV_IMPORT_FIELDS.length;

function countCvImportFields(resume) {
  if (!resume || typeof resume !== "object") return 0;
  let n = 0;
  for (const test of CV_IMPORT_FIELDS) {
    if (test(resume)) n += 1;
  }
  return n;
}

function CvImportBanner({ filename, count, total }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        borderRadius: 12,
        background: "rgba(29, 158, 117, 0.08)",
        border: "1px solid rgba(29, 158, 117, 0.35)",
      }}
    >
      <span
        aria-hidden
        style={{
          display: "grid",
          placeItems: "center",
          width: 20,
          height: 20,
          flexShrink: 0,
          borderRadius: 999,
          background: "var(--success)",
          color: "var(--accent-contrast)",
          fontSize: 12,
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        ✓
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-primary)", fontWeight: 600 }}>
          Imported from <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{filename}</span>
        </p>
        <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-secondary)" }}>
          {count} of {total} fields populated. Edit anything to dismiss.
        </p>
      </div>
    </div>
  );
}

function BuilderActionBar({
  saving,
  saveStatus,
  isAuthed,
  downloadStatus,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSave,
  onExport,
}) {
  const generating = downloadStatus === "synthesizing" || downloadStatus === "generating";
  let saveLabel = "Save";
  if (saving) saveLabel = "Saving…";
  else if (saveStatus === "saved") saveLabel = "Saved ✓";
  else if (saveStatus === "error") saveLabel = "Try again";
  let exportLabel = "Export PDF";
  if (downloadStatus === "synthesizing") exportLabel = "Preparing…";
  else if (downloadStatus === "generating") exportLabel = "Generating…";
  return (
    <div className="cvp-builder-action-bar" role="toolbar" aria-label="Resume actions">
      <div className="cvp-builder-action-bar-inner">
        <div className="cvp-builder-action-bar-cluster">
          <button
            type="button"
            className="cvp-builder-action-bar-icon"
            onClick={onUndo}
            disabled={!canUndo}
            aria-label="Undo"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 size={14} strokeWidth={1.8} aria-hidden />
          </button>
          <button
            type="button"
            className="cvp-builder-action-bar-icon"
            onClick={onRedo}
            disabled={!canRedo}
            aria-label="Redo"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 size={14} strokeWidth={1.8} aria-hidden />
          </button>
        </div>
        <div className="cvp-builder-action-bar-cluster">
          <button
            type="button"
            className="cvp-builder-action-bar-secondary"
            onClick={onSave}
            disabled={saving || !isAuthed}
            aria-label="Save resume"
          >
            <Save size={14} strokeWidth={1.8} aria-hidden />
            <span>{saveLabel}</span>
          </button>
          <button
            type="button"
            className="cvp-builder-action-bar-primary"
            onClick={() => onExport()}
            disabled={generating}
            aria-label="Export resume as PDF"
          >
            <Download size={14} strokeWidth={1.8} aria-hidden />
            <span>{exportLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function PersonalDetailsNudge({ onDismiss }) {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        borderRadius: 12,
        background: "rgba(217, 119, 6, 0.08)",
        border: "1px solid rgba(217, 119, 6, 0.35)",
      }}
    >
      <span
        aria-hidden
        style={{
          display: "grid",
          placeItems: "center",
          width: 22,
          height: 22,
          flexShrink: 0,
          borderRadius: 999,
          background: "rgba(217, 119, 6, 0.16)",
          color: "var(--accent)",
          fontSize: 12,
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        ✦
      </span>
      <p style={{ margin: 0, flex: 1, fontSize: 13, color: "var(--text-primary)", lineHeight: 1.4 }}>
        Gulf employers often expect these details. Find them in Personal Details, right below your contact card.
      </p>
      <button
        type="button"
        onClick={onDismiss}
        style={{
          flexShrink: 0,
          padding: "5px 12px",
          background: "transparent",
          border: "1px solid rgba(217, 119, 6, 0.45)",
          color: "var(--accent)",
          borderRadius: 8,
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        Got it
      </button>
    </div>
  );
}

const PERSONAL_DETAIL_FIELDS = [
  { key: "dob", label: "Date of birth", placeholder: "DD MMM YYYY" },
  { key: "gender", label: "Gender", placeholder: "Male / Female / Prefer not to say" },
  { key: "nationality", label: "Nationality", placeholder: "e.g. Indian" },
  { key: "maritalStatus", label: "Marital status", placeholder: "Single / Married" },
  { key: "visaStatus", label: "Visa status", placeholder: "e.g. Resident Visa" },
  { key: "drivingLicense", label: "Driving license", placeholder: "e.g. UAE Driving License" },
  { key: "availability", label: "Availability", placeholder: "Immediately Available" },
  { key: "willingToRelocate", label: "Willing to relocate", placeholder: "Yes / No" },
];

/* Corridor selects — fixed options where they help, and every one keeps a
   free-text fallback so an upload string like "Employment visa, transferable"
   is never dropped or coerced. */
const VISA_STATUS_OPTIONS = [
  "Employment visa (transferable)",
  "Employment visa (non transferable)",
  "Visit visa",
  "Resident visa",
  "Golden visa",
  "Cancelled visa",
  "No visa yet",
];
const GENDER_OPTIONS = ["Male", "Female", "Prefer not to say"];
const MARITAL_STATUS_OPTIONS = ["Single", "Married", "Prefer not to say"];
const RELOCATE_OPTIONS = ["Yes", "No"];

const CORRIDOR_LABEL_STYLE = { fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 5 };

function CorridorSelectField({ label, value, options, placeholder, onChange }) {
  const [open, setOpen] = useState(false);
  const [customDraft, setCustomDraft] = useState("");

  useEffect(() => {
    if (!open) return undefined;
    setCustomDraft("");
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const commitCustom = () => {
    const v = customDraft.trim();
    if (!v) return;
    onChange(v);
    setOpen(false);
  };

  return (
    <div>
      <label style={CORRIDOR_LABEL_STYLE}>{label}</label>
      <button
        type="button"
        className="cvp-corridor-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: value ? "var(--text-primary)" : "var(--text-muted)" }}>
          {value || placeholder}
        </span>
        <ChevronDown size={15} strokeWidth={2} style={{ color: "var(--text-muted)", flexShrink: 0 }} aria-hidden />
      </button>
      {open ? (
        <div className="cvp-corridor-overlay" role="presentation" onClick={() => setOpen(false)}>
          <div className="cvp-corridor-sheet" role="dialog" aria-modal="true" aria-label={label} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 6px" }} aria-hidden>
              <span style={{ width: 38, height: 4, borderRadius: 999, background: "var(--border-strong)" }} />
            </div>
            <p style={{ margin: "2px 6px 10px", fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>{label}</p>
            <div style={{ overflowY: "auto", minHeight: 0 }} role="listbox" aria-label={`${label} options`}>
              {options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  role="option"
                  aria-selected={opt === value}
                  className="cvp-corridor-option"
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                  }}
                >
                  <span style={{ flex: 1, minWidth: 0 }}>{opt}</span>
                  {opt === value ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: "var(--accent)", flexShrink: 0 }} aria-hidden><polyline points="20 6 9 17 4 12" /></svg>
                  ) : null}
                </button>
              ))}
              <div style={{ marginTop: 8, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                <label style={{ ...CORRIDOR_LABEL_STYLE, margin: "0 6px 6px" }}>Not listed? Type it exactly as it reads</label>
                <div style={{ display: "flex", gap: 8, padding: "0 4px 4px" }}>
                  <input
                    className="cvp-input"
                    style={{ flex: 1, minWidth: 0, padding: "10px 13px" }}
                    placeholder={placeholder}
                    value={customDraft}
                    onChange={(e) => setCustomDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitCustom();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={commitCustom}
                    style={{ flexShrink: 0, padding: "0 18px", borderRadius: 10, background: "var(--accent)", border: "none", color: "var(--accent-contrast)", fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
                  >
                    Use this
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* Availability — reads and writes the existing `availability` key (the
   extractor and the applyToJob shim read it by name; notice period lives
   here). "Available immediately" is deliberately NOT the legacy prefill
   string "Immediately Available", which scrubLegacyDraftPrefills blanks. */
function parseAvailabilityValue(raw) {
  const s = String(raw || "").trim();
  if (!s) return { mode: "", notice: "" };
  if (/immediat/i.test(s)) return { mode: "immediate", notice: "" };
  const m = s.match(/^serving notice(?:[,:]?\s*(.*))?$/i);
  if (m) return { mode: "notice", notice: (m[1] || "").trim() };
  return { mode: "custom", notice: "" };
}

function AvailabilityField({ value, onChange }) {
  const parsed = parseAvailabilityValue(value);
  return (
    <div>
      <label style={CORRIDOR_LABEL_STYLE}>Availability</label>
      <div className="cvp-avail-seg" role="group" aria-label="Availability">
        <button
          type="button"
          aria-pressed={parsed.mode === "immediate"}
          onClick={() => onChange("Available immediately")}
        >
          Available immediately
        </button>
        <button
          type="button"
          aria-pressed={parsed.mode === "notice"}
          onClick={() => onChange("Serving notice")}
        >
          Serving notice
        </button>
      </div>
      {parsed.mode === "notice" ? (
        <input
          className="cvp-input"
          style={{ marginTop: 8, padding: "10px 13px" }}
          placeholder="How long is your notice, for example 30 days"
          value={parsed.notice}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v.trim() ? `Serving notice, ${v}` : "Serving notice");
          }}
        />
      ) : null}
      {parsed.mode === "custom" ? (
        <input
          className="cvp-input"
          style={{ marginTop: 8, padding: "10px 13px" }}
          aria-label="Availability, as written"
          value={value || ""}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : null}
    </div>
  );
}

function PersonalDetailsBuilderSection({ resume, setResume }) {
  const setField = (key, value) => setResume((r) => ({ ...r, [key]: value }));
  /* TODO(product): salary expectation and passport have NO data source —
     neither EMPTY_RESUME nor the transform extractor carries them, so no
     upload can ever fill them. They are deliberately inert local state
     (editable, persisted nowhere) until product decides whether they feed
     the readiness score. Do not wire them to resume.* without also
     updating the cv_snapshot contract and the extractor schema. */
  const [salaryDraft, setSalaryDraft] = useState("");
  const [passportDraft, setPassportDraft] = useState("");

  return (
    <div style={{ display: "grid", gap: 14 }}>
      <p style={{ fontSize: 12.5, color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
        These are the answers a Gulf recruiter filters on before they open your CV. Most people leave them blank, so filling them is how you get called first.
      </p>

      <CorridorSelectField
        label="Visa status"
        value={resume.visaStatus || ""}
        options={VISA_STATUS_OPTIONS}
        placeholder="e.g. Resident Visa"
        onChange={(v) => setField("visaStatus", v)}
      />

      <AvailabilityField value={resume.availability || ""} onChange={(v) => setField("availability", v)} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
        <div>
          <label style={CORRIDOR_LABEL_STYLE}>Nationality</label>
          <input className="cvp-input" style={{ padding: "10px 13px" }} placeholder="e.g. Indian" value={resume.nationality || ""} onChange={(e) => setField("nationality", e.target.value)} />
        </div>
        <div>
          <label style={CORRIDOR_LABEL_STYLE}>Date of birth</label>
          <input className="cvp-input" style={{ padding: "10px 13px" }} placeholder="DD MMM YYYY" value={resume.dob || ""} onChange={(e) => setField("dob", e.target.value)} />
        </div>
        <CorridorSelectField
          label="Gender"
          value={resume.gender || ""}
          options={GENDER_OPTIONS}
          placeholder="Male / Female / Prefer not to say"
          onChange={(v) => setField("gender", v)}
        />
        <CorridorSelectField
          label="Marital status"
          value={resume.maritalStatus || ""}
          options={MARITAL_STATUS_OPTIONS}
          placeholder="Single / Married"
          onChange={(v) => setField("maritalStatus", v)}
        />
        <div>
          <label style={CORRIDOR_LABEL_STYLE}>Driving license</label>
          <input className="cvp-input" style={{ padding: "10px 13px" }} placeholder="e.g. UAE Driving License" value={resume.drivingLicense || ""} onChange={(e) => setField("drivingLicense", e.target.value)} />
        </div>
        <CorridorSelectField
          label="Willing to relocate"
          value={resume.willingToRelocate || ""}
          options={RELOCATE_OPTIONS}
          placeholder="Yes / No"
          onChange={(v) => setField("willingToRelocate", v)}
        />
      </div>

      <div style={{ marginTop: 4, paddingTop: 14, borderTop: "1px dashed var(--border)" }}>
        <p style={{ margin: "0 0 4px", fontSize: 11.5, fontWeight: 700, letterSpacing: "0.03em", textTransform: "uppercase", color: "var(--accent-text)" }}>Only you can add these</p>
        <p style={{ margin: "0 0 11px", fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.45 }}>
          No CV carries them, so they start empty. Adding them puts you ahead of everyone who left them off.
        </p>
        <div style={{ display: "grid", gap: 10 }}>
          <div>
            <label style={CORRIDOR_LABEL_STYLE}>Salary expectation</label>
            {/* TODO(product): inert — see the note at the top of this component. */}
            <div className="cvp-corridor-invite">
              <input
                placeholder="Add expected monthly pay"
                value={salaryDraft}
                onChange={(e) => setSalaryDraft(e.target.value)}
                aria-label="Salary expectation"
              />
            </div>
          </div>
          <div>
            <label style={CORRIDOR_LABEL_STYLE}>Passport</label>
            {/* TODO(product): inert — see the note at the top of this component. */}
            <div className="cvp-corridor-invite">
              <input
                placeholder="Add passport status"
                value={passportDraft}
                onChange={(e) => setPassportDraft(e.target.value)}
                aria-label="Passport"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const EASE = "cubic-bezier(0.4,0,0.2,1)";

const MM_YYYY_MONTH_ERR = "Enter a valid month (01–12)";

const MONTH_NAMES_LOWER = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];
const MONTH_ABBR_LOWER = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function isPresentLiteralTyping(s) {
  const t = String(s ?? "");
  const trim = t.trimEnd();
  if (!trim) return false;
  const a = trim.toLowerCase();
  const p = "present";
  if (a === p) return true;
  if (a.length < p.length && p.slice(0, a.length) === a) return true;
  return false;
}

function monthMmFromLetters(lettersLower) {
  if (!lettersLower || lettersLower.length < 3) return null;
  const hits = [];
  for (let i = 0; i < 12; i++) {
    const full = MONTH_NAMES_LOWER[i];
    const abbr = MONTH_ABBR_LOWER[i];
    if (full.startsWith(lettersLower) || abbr.startsWith(lettersLower) || lettersLower.startsWith(abbr)) {
      hits.push(String(i + 1).padStart(2, "0"));
    }
  }
  const uniq = [...new Set(hits)];
  if (uniq.length === 1) return uniq[0];
  return null;
}

function mmYyyyErrorForDisplay(display) {
  const t = String(display ?? "").trim();
  if (!t) return null;
  if (isPresentLiteralTyping(t)) return null;
  const m = t.match(/^(\d{2})(?:\/(\d{0,4}))?$/);
  if (!m) return null;
  const mm = parseInt(m[1], 10);
  if (!Number.isFinite(mm) || mm < 1 || mm > 12) return MM_YYYY_MONTH_ERR;
  return null;
}

function formatMmYyyyFromDigits(raw) {
  const clean = String(raw ?? "").replace(/\D/g, "").slice(0, 6);
  if (clean.length === 0) return { value: "", error: null };
  const mm = clean.slice(0, 2);
  const yy = clean.slice(2, 6);
  if (mm.length < 2) {
    return { value: mm, error: null };
  }
  const mmn = parseInt(mm, 10);
  const error = mmn < 1 || mmn > 12 ? MM_YYYY_MONTH_ERR : null;
  if (yy.length === 0) {
    return { value: `${mm}/`, error };
  }
  return { value: `${mm}/${yy}`, error };
}

/**
 * Smart MM/YYYY input: digits auto-slash; 3+ letter month names → MM/; "Present" passthrough when allowPresent.
 * Returns { value, error, cursor }.
 */
function processMmYyyyInput(rawInput, { allowPresent }) {
  const raw = String(rawInput ?? "");
  if (allowPresent && isPresentLiteralTyping(raw)) {
    return { value: raw, error: null, cursor: raw.length };
  }

  const letterMatch = raw.match(/^([a-zA-Z]+)([\s\S]*)$/);
  if (letterMatch) {
    const letters = letterMatch[1].toLowerCase();
    const tail = letterMatch[2] || "";
    const mm = monthMmFromLetters(letters);
    if (mm) {
      const restDigits = tail.replace(/\D/g, "").slice(0, 4);
      const value = restDigits.length ? `${mm}/${restDigits}` : `${mm}/`;
      return { value, error: mmYyyyErrorForDisplay(value), cursor: value.length };
    }
    if (letters.length < 3) {
      return { value: raw, error: null, cursor: raw.length };
    }
  }

  const digitLed = raw.match(/^[\d/]/);
  if (digitLed || raw === "") {
    const { value, error } = formatMmYyyyFromDigits(raw);
    return { value, error, cursor: value.length };
  }

  return { value: raw, error: mmYyyyErrorForDisplay(raw), cursor: raw.length };
}

// Textarea that grows with its content. Mirrors the Summary field's
// pattern (set height='auto' then to scrollHeight on every value change).
// forwardRef so callers like the Experience editor can still attach an
// external ref for cursor / focus management.
const AutoExpandTextarea = forwardRef(function AutoExpandTextarea(
  { value, style, onInput, ...rest },
  externalRef,
) {
  const localRef = useRef(null);
  const setRef = useCallback((node) => {
    localRef.current = node;
    if (typeof externalRef === "function") externalRef(node);
    else if (externalRef) externalRef.current = node;
  }, [externalRef]);
  useEffect(() => {
    const el = localRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);
  const handleInput = useCallback((e) => {
    const el = localRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    }
    if (onInput) onInput(e);
  }, [onInput]);
  return (
    <textarea
      ref={setRef}
      value={value}
      onInput={handleInput}
      style={{ minHeight: 80, overflowY: "hidden", resize: "none", ...style }}
      {...rest}
    />
  );
});

function OptionalBuilderAccordionSections({
  resume,
  setResume,
  filter,
  certificationEditor,
  setCertificationEditor,
  isOpen,
  toggleSection,
  variant = "default",
  orderedSectionIds,
  onSectionReorder,
  activeGuideSection = null,
  dragState,
  setDragState,
  onArmDrag,
  isDragArmed,
  onSectionDrop,
}) {
  return OPTIONAL_BUILDER_SECTIONS.filter(filter).map((opt) => (
    <AccordionSection
      key={opt.id}
      variant={variant}
      id={opt.id}
      title={opt.label}
      metaSubtitle={builderSectionMeta(resume, opt.id)}
      isOpen={isOpen(opt.id)}
      onToggle={() => toggleSection(opt.id)}
      icon={opt.id}
      orderedSectionIds={orderedSectionIds}
      onSectionReorder={onSectionReorder ? (dir) => onSectionReorder(opt.id, dir) : undefined}
      activeGuideSection={activeGuideSection}
      dragState={dragState}
      setDragState={setDragState}
      onArmDrag={onArmDrag}
      isDragArmed={isDragArmed}
      onSectionDrop={onSectionDrop}
    >
      {opt.id === "certifications" ? (
        <div data-cvp-highlight="certifications" style={{ borderRadius: 8, padding: 2, margin: -2 }}>
          <CertificationsBuilderSection
            resume={resume}
            setResume={setResume}
            certificationEditor={certificationEditor}
            setCertificationEditor={setCertificationEditor}
            jobTitle={resume.title}
            onRemoveSection={() => {
              setCertificationEditor(null);
              setResume((r) => ({ ...r, builderExtraSectionIds: (r.builderExtraSectionIds || []).filter((x) => x !== opt.id) }));
            }}
          />
        </div>
      ) : opt.id === "personalDetails" ? (
        <div data-cvp-highlight="personalDetails" style={{ borderRadius: 8, padding: 2, margin: -2 }}>
          {/* Fixed high-value section now — no Remove. The corridor block
              is the commercial heart of the builder; it stays findable. */}
          <PersonalDetailsBuilderSection resume={resume} setResume={setResume} />
        </div>
      ) : (
        <div data-cvp-highlight={opt.id} style={{ display: "grid", gap: 8, borderRadius: 8, padding: 2, margin: -2 }}>
          {opt.multiline ? (
            <>
              <div style={{ position: "relative", width: "100%" }}>
                <style dangerouslySetInnerHTML={{ __html: CVP_BUILDER_PH_CSS }} />
                <AutoExpandTextarea
                  className="cvp-builder-ph cvp-textarea"
                  style={{ paddingBottom: 30 }}
                  placeholder={opt.label}
                  value={resume[opt.field] || ""}
                  onChange={(e) => setResume((r) => ({ ...r, [opt.field]: e.target.value }))}
                />
                <span
                  style={{
                    position: "absolute",
                    bottom: 10,
                    right: 12,
                    fontSize: 10,
                    color: "var(--text-muted)",
                    pointerEvents: "none",
                  }}
                >
                  {(resume[opt.field] || "").length}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <List size={11} strokeWidth={1.8} style={{ color: "var(--text-muted)" }} aria-hidden />
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Each line = one bullet on your CV</span>
              </div>
            </>
          ) : (
            <input
              className="cvp-input"
              value={resume[opt.field] || ""}
              onChange={(e) => setResume((r) => ({ ...r, [opt.field]: e.target.value }))}
            />
          )}
          <button
            type="button"
            style={{ ...CB_UI.btn, alignSelf: "flex-start", background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
            onClick={() => setResume((r) => ({ ...r, builderExtraSectionIds: (r.builderExtraSectionIds || []).filter((x) => x !== opt.id) }))}
          >
            Remove section
          </button>
        </div>
      )}
    </AccordionSection>
  ));
}

const PASTE_IMPORT_BTN = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid var(--border)",
  background: "var(--bg-elevated)",
  color: "var(--text-primary)",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "inherit",
};

const BUILDER_SHEET_SURFACE = {
  background: "var(--bg-surface)",
  border: "1px solid var(--border)",
  borderRadius: 16,
};

const CVP_BUILDER_PH_CSS = ".cvp-builder-ph::placeholder{color:var(--text-muted);font-style:italic}";

/** Inline "+ Add" next to skill inputs — layout/size from `.cvp-builder-skill-add-btn` in index.css */
const BUILDER_SKILL_ADD_BTN = {
  background: "var(--accent)",
  border: "none",
  color: "var(--accent-contrast)",
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
};

const EXP_POINTS_PLACEHOLDER =
  "• Each line becomes one bullet on your CV\n• Keep it action-first: Managed, Built, Resolved…\n• Aim for 3–5 strong bullets";

const BUILDER_TECH_CHIP = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  background: "rgba(217,119,6,0.12)",
  border: "1px solid rgba(217,119,6,0.3)",
  color: "var(--accent-text)",
  fontSize: 11,
  fontWeight: 500,
  padding: "5px 11px",
  borderRadius: 999,
  flexShrink: 0,
};

const BUILDER_TECH_CHIP_REMOVE = {
  cursor: "pointer",
  opacity: 0.45,
  fontSize: 14,
  color: "var(--accent-text)",
  background: "none",
  border: "none",
  padding: 0,
  lineHeight: 1,
  fontFamily: "inherit",
};

const BUILDER_TECH_SKILL_COUNT_BADGE = {
  fontSize: 10,
  color: "var(--accent-text)",
  background: "rgba(217,119,6,0.12)",
  border: "1px solid rgba(217,119,6,0.25)",
  borderRadius: 999,
  padding: "2px 8px",
};

function BuilderCvPdfSpinner20() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: "@keyframes cvpBuilderPdfSpin{to{transform:rotate(360deg)}}" }} />
      <svg
        width={20}
        height={20}
        viewBox="0 0 20 20"
        aria-hidden
        style={{ flexShrink: 0, animation: "cvpBuilderPdfSpin 0.85s linear infinite" }}
      >
        <circle
          cx="10"
          cy="10"
          r="8"
          fill="none"
          style={{ stroke: "var(--text-primary)" }}
          strokeWidth="2"
          strokeDasharray="12 40"
          strokeLinecap="round"
        />
      </svg>
    </>
  );
}

function ClipboardIconThin({ size = 16, color = "var(--text-primary)" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M9 12h6M9 16h6" />
    </svg>
  );
}

function parseTechnicalSkillsPasteBlock(text) {
  const lines = String(text || "").split(/\r?\n/);
  const rows = [];
  for (const line of lines) {
    const colon = line.indexOf(":");
    if (colon < 0) continue;
    const category = line.slice(0, colon).trim();
    const rest = line.slice(colon + 1);
    const chips = rest
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!category) continue;
    rows.push({ category, chips });
  }
  return rows;
}

function skillsArrayForChipRender(skills) {
  return typeof skills === "string"
    ? skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : Array.isArray(skills)
      ? skills.map((c) => String(c).trim()).filter(Boolean)
      : [];
}

function ProfessionalSummaryField({
  summary,
  onChange,
  saveSuccessTick = 0,
  // Optional in-builder AI assist props (Session B). When cvContext is
  // null the "Write with AI" button does not render, so call sites that
  // do not wire AI keep their original behaviour.
  cvContext = null,
  creditsRemaining = null,
  onAIRewriteSuccess = null,
  onAIExhausted = null,
}) {
  const [clearAsk, setClearAsk] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  // { kind: 'success'|'error'|'info', text, onUndo? }
  const [aiToast, setAiToast] = useState(null);
  // Snapshot of the summary at the moment Improve was clicked, so Undo can
  // restore the EXACT original after a rewrite is applied.
  const originalRef = useRef("");

  // Direct improve flow: one click rewrites the whole summary into 3 full
  // options (uncached, fresh each click). The AIWorkingGlow ring shows on
  // the field while ai.isGenerating; the results modal opens when options
  // arrive; clicking a card commits instantly.
  const ai = useAiImprove({
    onCreditsUpdate: (remaining) => { if (onAIRewriteSuccess) onAIRewriteSuccess(remaining); },
    onExhausted: () => { if (onAIExhausted) onAIExhausted(); },
  });
  // Surface a generation error as the inline status pill.
  useEffect(() => {
    if (ai.error) setAiToast({ kind: "error", text: ai.error });
  }, [ai.error]);
  // Auto-expand: textarea grows with content, no internal scroll. Reruns
  // on every `summary` change so AI rewrites + paste also resize cleanly.
  const summaryRef = useRef(null);
  useEffect(() => {
    const el = summaryRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [summary]);

  useEffect(() => {
    setIsDirty(false);
  }, [saveSuccessTick]);

  // Auto-clear toast. Success / info fade on their own; ERRORS persist
  // until the next AI action or a manual edit so a failed rewrite can
  // never present as a silent spinner-then-nothing (the user must be
  // able to actually read what went wrong, including the HTTP status).
  useEffect(() => {
    if (!aiToast) return undefined;
    if (aiToast.kind === "error") return undefined;
    const ms = aiToast.kind === "success" ? 2000 : 3500;
    const t = setTimeout(() => setAiToast(null), ms);
    return () => clearTimeout(t);
  }, [aiToast]);

  const aiEnabled = cvContext != null;

  // Commit a chosen rewrite: replace the whole summary, keep an Undo that
  // restores the exact pre-rewrite text.
  const applyOption = (newText) => {
    const original = originalRef.current;
    onChange(String(newText || ""));
    setIsDirty(true);
    ai.reset();
    setAiToast({
      kind: "success",
      text: "Updated",
      onUndo: () => {
        onChange(original);
        setIsDirty(true);
        setAiToast(null);
      },
    });
  };

  // Free-tier 0-credit state short-circuits to the upgrade modal instead
  // of POSTing to /api/ai (server would 402; this avoids the round-trip
  // and removes the spinner-then-paywall lag).
  const aiExhausted = isAiExhausted(creditsRemaining);
  const aiButtonLabel = deriveAiButtonLabel({
    aiLoading: ai.isGenerating,
    creditsRemaining,
    idleLabel: "Improve with AI",
    loadingLabel: "Improving...",
  });
  const handleAiButtonClick = () => {
    if (aiExhausted) {
      if (onAIExhausted) onAIExhausted();
      return;
    }
    setAiToast(null);
    originalRef.current = String(summary || "");
    ai.improve({
      text: String(summary || ""),
      field: "summary",
      target_role: String(cvContext?.title || ""),
      target_market: String(cvContext?.targetMarket || ""),
      name: String(cvContext?.name || ""),
    });
  };

  return (
    <div style={{ position: "relative" }}>
      <style dangerouslySetInnerHTML={{ __html: CVP_BUILDER_PH_CSS }} />
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes cvp-ai-spin { to { transform: rotate(360deg); } }
        .cvp-ai-write-btn:hover:not(:disabled) {
          background-color: rgba(217,119,6,0.22) !important;
          border-color: rgba(217,119,6,0.65) !important;
        }
      ` }} />
      <AIWorkingGlow active={ai.isGenerating} radius={10}>
        <textarea
          ref={summaryRef}
          className="cvp-builder-ph cvp-textarea"
          style={{ minHeight: 80, paddingBottom: 30, overflowY: "hidden", resize: "none" }}
          placeholder="2–3 lines on your strengths, focus, and what you bring to the role…"
          value={summary}
          onChange={(e) => {
            setIsDirty(true);
            onChange(e.target.value);
          }}
          data-cvp-summary-dirty={isDirty ? "1" : "0"}
        />
        <span
          style={{
            position: "absolute",
            bottom: 10,
            right: 12,
            fontSize: 10,
            color: "var(--text-muted)",
            pointerEvents: "none",
          }}
        >
          {String(summary || "").length}
        </span>
      </AIWorkingGlow>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginTop: 8,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
          <List size={11} strokeWidth={1.8} style={{ color: "var(--text-muted)" }} aria-hidden />
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Keep it to 2–3 sentences — recruiters scan this first</span>
        </div>
        {aiEnabled && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
            {aiToast && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 11,
                  fontWeight: 500,
                  color:
                    aiToast.kind === "success" ? "var(--success)"
                      : aiToast.kind === "error" ? "var(--danger)"
                      : "var(--text-secondary)",
                }}
                role="status"
                aria-live="polite"
              >
                <span>{aiToast.kind === "success" ? "✓ " : ""}{aiToast.text}</span>
                {aiToast.onUndo && (
                  <button
                    type="button"
                    onClick={aiToast.onUndo}
                    style={{
                      background: "none",
                      border: "none",
                      padding: 0,
                      color: "var(--color-accent-bright)",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                  >
                    Undo
                  </button>
                )}
              </span>
            )}
            <button
              type="button"
              className="cvp-ai-write-btn"
              onClick={handleAiButtonClick}
              disabled={ai.isGenerating}
              aria-label={aiExhausted ? "Upgrade for unlimited AI" : "Improve summary with AI"}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 11px",
                border: "1px solid rgba(217,119,6,0.45)",
                borderRadius: 999,
                background: "rgba(217,119,6,0.12)",
                color: "var(--accent)",
                fontSize: 11.5,
                fontWeight: 600,
                cursor: ai.isGenerating ? "default" : "pointer",
                opacity: ai.isGenerating ? 0.7 : 1,
                transition:
                  "background-color 0.16s cubic-bezier(0.4,0,0.2,1), border-color 0.16s cubic-bezier(0.4,0,0.2,1)",
              }}
            >
              {ai.isGenerating
                ? <Loader2 size={12} strokeWidth={2.4} style={{ animation: "cvp-ai-spin 0.8s linear infinite" }} />
                : <Sparkles size={12} strokeWidth={2.4} />}
              <span>{aiButtonLabel}</span>
            </button>
          </div>
        )}
      </div>
      {clearAsk ? (
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            zIndex: 2,
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 8,
            maxWidth: "calc(100% - 20px)",
            justifyContent: "flex-end",
          }}
        >
          <span style={{ fontSize: 12, color: "var(--text-primary)", fontWeight: 500 }}>Clear summary?</span>
          <button
            type="button"
            style={{ background: "none", border: "none", padding: 0, color: "var(--text-primary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            onClick={() => {
              onChange("");
              setClearAsk(false);
            }}
          >
            Yes
          </button>
          <button
            type="button"
            style={{ background: "none", border: "none", padding: 0, color: "var(--text-secondary)", fontSize: 12, cursor: "pointer" }}
            onClick={() => setClearAsk(false)}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          aria-label="Clear summary"
          onClick={() => setClearAsk(true)}
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            zIndex: 2,
            width: 28,
            height: 28,
            padding: 0,
            border: "none",
            borderRadius: 6,
            background: "rgba(28,28,28,0.92)",
            color: "var(--text-primary)",
            cursor: "pointer",
            display: "grid",
            placeItems: "center",
            fontSize: 18,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      )}

      <AIRewriteModal
        isOpen={!!ai.options}
        original={originalRef.current}
        options={ai.options || []}
        creditsRemaining={creditsRemaining}
        onPick={applyOption}
        onKeepOriginal={() => ai.reset()}
        onClose={() => ai.reset()}
      />
    </div>
  );
}

function SkillsEditorSection({
  resume,
  setResume,
  skillInput,
  setSkillInput,
  skillsPasteOpen,
  setSkillsPasteOpen,
  skillsPasteDraft,
  setSkillsPasteDraft,
  jobTitle,
}) {
  const skillsRolePack = useMemo(() => getRoleSuggestions(jobTitle), [jobTitle]);
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  const [pickedSuggestions, setPickedSuggestions] = useState(() => new Set());

  const skillsList = splitCommaItems(resume.skills);
  const lowerSet = useMemo(() => new Set(skillsList.map((x) => x.toLowerCase())), [skillsList]);

  const duplicateInput = useMemo(() => {
    const segments = splitSkillInputSegments(skillInput);
    if (segments.length === 0) return false;
    return segments.some((s) => lowerSet.has(s.toLowerCase()));
  }, [skillInput, lowerSet]);

  const runSkillsPasteImport = () => {
    const parts = splitSkillInputSegments(skillsPasteDraft);
    if (parts.length === 0) {
      setSkillsPasteOpen(false);
      setSkillsPasteDraft("");
      return;
    }
    setResume((r) => {
      const cur = splitCommaItems(r.skills);
      const next = [...cur];
      for (const p of parts) {
        if (!next.some((x) => x.toLowerCase() === p.toLowerCase())) next.push(p);
      }
      return { ...r, skills: next.join(", ") };
    });
    setSkillsPasteOpen(false);
    setSkillsPasteDraft("");
  };

  const addSkillsFromInput = () => {
    const parts = splitSkillInputSegments(skillInput);
    if (parts.length === 0) return;
    setResume((r) => {
      const cur = splitCommaItems(r.skills);
      const next = [...cur];
      for (const p of parts) {
        if (!next.some((x) => x.toLowerCase() === p.toLowerCase())) next.push(p);
      }
      return { ...r, skills: next.join(", ") };
    });
    setSkillInput("");
  };

  const addSuggested = (name) => {
    if (lowerSet.has(name.toLowerCase())) return;
    setResume((r) => {
      const cur = splitCommaItems(r.skills);
      if (cur.some((x) => x.toLowerCase() === name.toLowerCase())) return r;
      return { ...r, skills: [...cur, name].join(", ") };
    });
    setPickedSuggestions((prev) => new Set(prev).add(name));
  };

  const softSuggestions = skillsRolePack?.softSkills?.length && !suggestionsDismissed ? skillsRolePack.softSkills : null;

  return (
    <>
      {skillsPasteOpen ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 450,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            padding: 16,
            boxSizing: "border-box",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSkillsPasteOpen(false);
              setSkillsPasteDraft("");
            }
          }}
        >
          <div
            style={{ ...BUILDER_SHEET_SURFACE, width: "100%", maxWidth: 480, padding: 16, display: "grid", gap: 12 }}
            onClick={(e) => e.stopPropagation()}
          >
            <textarea
              className="cvp-textarea"
              style={{ minHeight: 120 }}
              placeholder="Paste skills separated by commas e.g. Problem-Solving, Communication, Teamwork"
              value={skillsPasteDraft}
              onChange={(e) => setSkillsPasteDraft(e.target.value)}
            />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: 14, cursor: "pointer", padding: "8px 4px" }}
                onClick={() => {
                  setSkillsPasteOpen(false);
                  setSkillsPasteDraft("");
                }}
              >
                Cancel
              </button>
              <button type="button" style={{ ...CB_UI.btn, padding: "10px 18px" }} onClick={runSkillsPasteImport}>
                Import
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div
        data-cvp-highlight="skills"
        className="cvp-skills-editor-block"
        style={{ display: "grid", gap: 12, borderRadius: 8, padding: 2, margin: -2 }}
      >
        <style dangerouslySetInnerHTML={{ __html: CVP_BUILDER_PH_CSS }} />
        <div className="cvp-skills-add-row">
          <input
            className="cvp-input cvp-builder-ph cvp-skills-skill-input"
            placeholder="+ Add a skill"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSkillsFromInput();
              }
            }}
            onPaste={(e) => {
              const text = e.clipboardData?.getData("text") || "";
              if (!/[,;\n]/.test(text)) return;
              e.preventDefault();
              const parts = splitSkillInputSegments(text);
              if (parts.length === 0) return;
              setResume((r) => {
                const cur = splitCommaItems(r.skills);
                const next = [...cur];
                for (const p of parts) {
                  if (!next.some((x) => x.toLowerCase() === p.toLowerCase())) next.push(p);
                }
                return { ...r, skills: next.join(", ") };
              });
              setSkillInput("");
            }}
          />
          <button
            type="button"
            className="cvp-builder-skill-add-btn"
            style={BUILDER_SKILL_ADD_BTN}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = "0.88";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
            onClick={addSkillsFromInput}
          >
            + Add
          </button>
        </div>
        {duplicateInput ? (
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6, fontSize: 11, color: "var(--accent-text)" }}>
            <AlertCircle size={11} strokeWidth={1.8} aria-hidden />
            This skill is already added
          </div>
        ) : null}
        <div className="cvp-skills-chip-row">
          {skillsList.map((sk, si) => (
            <span key={`${sk}-${si}`} className="cvp-skills-real-chip" title={sk}>
              <span className="cvp-skills-chip-text">{sk}</span>
              <button
                type="button"
                className="cvp-skills-chip-remove"
                aria-label={`Remove ${sk}`}
                onClick={() =>
                  setResume((r) => ({ ...r, skills: splitCommaItems(r.skills).filter((x) => x !== sk).join(", ") }))
                }
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = "1";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.removeProperty("opacity");
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        {softSuggestions ? (
          <div
            style={{
              background: "rgba(217,119,6,0.06)",
              border: "1px dashed rgba(217,119,6,0.45)",
              borderRadius: 12,
              padding: 12,
              marginBottom: 10,
            }}
          >
            <div
              style={{
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Lightbulb size={11} strokeWidth={1.8} style={{ color: "var(--accent-text)" }} aria-hidden />
                <span style={{ fontSize: 11, color: "var(--accent-text)", fontWeight: 600 }}>Suggestions, not on your CV yet</span>
              </span>
              <button
                type="button"
                title="Dismiss suggestions"
                onClick={() => setSuggestionsDismissed(true)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <X size={13} strokeWidth={2} aria-hidden />
              </button>
            </div>
            <div className="cvp-skills-suggestions-chips">
              {softSuggestions.map((sk) => {
                const picked = pickedSuggestions.has(sk) || lowerSet.has(sk.toLowerCase());
                return (
                  <button
                    key={sk}
                    type="button"
                    onClick={() => addSuggested(sk)}
                    disabled={picked}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                      background: "transparent",
                      border: "1px dashed rgba(217,119,6,0.45)",
                      color: "var(--accent-text)",
                      borderRadius: 999,
                      padding: "4px 10px",
                      fontSize: 11,
                      fontWeight: 500,
                      cursor: picked ? "default" : "pointer",
                      opacity: picked ? 0.4 : 1,
                      pointerEvents: picked ? "none" : "auto",
                      fontFamily: "inherit",
                    }}
                  >
                    + {sk}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
        <button type="button" style={PASTE_IMPORT_BTN} onClick={() => setSkillsPasteOpen(true)}>
          <ClipboardIconThin size={16} />
          Paste &amp; Import from old CV
        </button>
      </div>
    </>
  );
}

function normalizeTechnicalSkillsState(ts) {
  if (Array.isArray(ts) && ts.length > 0) {
    const first = ts[0];
    if (first != null && typeof first === "object" && !Array.isArray(first) && ("chips" in first || "category" in first)) {
      return ts.map((g) => {
        const raw = g?.chips;
        const chips =
          typeof raw === "string"
            ? raw
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean)
            : Array.isArray(raw)
              ? raw.map((c) => String(c).trim()).filter(Boolean)
              : [];
        return {
          category: String(g?.category ?? "").trim(),
          chips,
        };
      });
    }
  }
  if (typeof ts === "string" && ts.trim()) {
    // Accept pipe (legacy), comma (Haiku import format), semicolon, or
    // newline as separators. Without comma support, an imported
    // technicalSkills="JavaScript, Python, SQL" became one massive chip.
    const chips = ts.split(/[|,;\n]+/).map((s) => s.trim()).filter(Boolean);
    return [{ category: "Technical Skills", chips }];
  }
  return [];
}

function sanitizeTechnicalSkillsForPersist(ts) {
  return normalizeTechnicalSkillsState(ts)
    .filter((g) => g.chips.length > 0)
    .slice(0, 20)
    .map((g) => ({
      category: g.category.trim() || "Technical Skills",
      chips: [...g.chips],
    }));
}

function technicalSkillsHasAnyChip(resume) {
  return normalizeTechnicalSkillsState(resume.technicalSkills).some((g) => g.chips.length > 0);
}

/** Default builder accordion order; optional sections appear when added to `builderExtraSectionIds`. */
/* Personal Details rides SECOND (right after the personal info card, first
   among the accordions) — it is the corridor block a Gulf recruiter filters
   on, no longer buried under Add section. Saved builderSectionOrder still
   wins for users who reordered. */
const BUILDER_SECTION_DEFAULT_ORDER = [
  "personalDetails",
  "summary",
  "experience",
  "education",
  "certifications",
  "skills",
  "technicalSkills",
  "languages",
  "projects",
  "volunteer",
  "publications",
];

function builderVisibleSectionIds(resume) {
  const extra = resume.builderExtraSectionIds || [];
  /* personalDetails is always visible — a fixed section, not opt-in. */
  const ids = ["personalDetails", "summary", "experience", "education"];
  if (extra.includes("certifications")) ids.push("certifications");
  ids.push("skills");
  if (technicalSkillsHasAnyChip(resume)) ids.push("technicalSkills");
  ids.push("languages");
  for (const opt of OPTIONAL_BUILDER_SECTIONS) {
    if (opt.id !== "certifications" && opt.id !== "personalDetails" && extra.includes(opt.id)) ids.push(opt.id);
  }
  return ids;
}

function resolveOrderedBuilderSectionIds(resume) {
  const visible = builderVisibleSectionIds(resume);
  const visibleSet = new Set(visible);
  const saved = Array.isArray(resume.builderSectionOrder) ? resume.builderSectionOrder : [];
  const ordered = [];
  const seen = new Set();
  /* A saved order that predates the always-visible corridor block never
     contains personalDetails — surface it FIRST rather than appending it
     to the tail where it would stay buried. A saved order that DOES
     contain it keeps the user's own placement. */
  if (!saved.includes("personalDetails") && visibleSet.has("personalDetails")) {
    ordered.push("personalDetails");
    seen.add("personalDetails");
  }
  for (const id of saved) {
    if (visibleSet.has(id) && !seen.has(id)) {
      ordered.push(id);
      seen.add(id);
    }
  }
  for (const id of BUILDER_SECTION_DEFAULT_ORDER) {
    if (visibleSet.has(id) && !seen.has(id)) ordered.push(id);
  }
  return ordered;
}

function applyBuilderSectionReorder(resume, sectionId, direction) {
  const ordered = resolveOrderedBuilderSectionIds(resume);
  const i = ordered.indexOf(sectionId);
  if (i < 0) return resume;
  const j = direction === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= ordered.length) return resume;
  const next = [...ordered];
  [next[i], next[j]] = [next[j], next[i]];
  return { ...resume, builderSectionOrder: next };
}

// Drag-and-drop reorder: insert fromId before|after toId. Used by Tier 3
// HTML5 DnD; runs once per drop (not during dragover) so a single drop
// produces one history entry. position ∈ {"before","after"}.
function applyBuilderSectionReorderByDrop(resume, fromId, toId, position) {
  if (!fromId || !toId || fromId === toId) return resume;
  const ordered = resolveOrderedBuilderSectionIds(resume);
  const fromIdx = ordered.indexOf(fromId);
  const toIdx = ordered.indexOf(toId);
  if (fromIdx < 0 || toIdx < 0) return resume;
  const next = [...ordered];
  next.splice(fromIdx, 1);
  // After splice the target index may have shifted — recompute by id.
  const remainingTo = next.indexOf(toId);
  const insertAt = position === "before" ? remainingTo : remainingTo + 1;
  next.splice(insertAt, 0, fromId);
  return { ...resume, builderSectionOrder: next };
}

function builderSectionMeta(resume, sectionId) {
  switch (sectionId) {
    case "summary": {
      const t = String(resume.summary || "").trim();
      if (!t) return "Empty";
      const parts = t.split(/[.!?]+/).map((s) => s.trim()).filter(Boolean);
      const n = Math.max(1, parts.length);
      return `Written · ${n} sentence${n === 1 ? "" : "s"}`;
    }
    case "experience": {
      const n = resume.experience?.length ?? 0;
      return `${n} entr${n === 1 ? "y" : "ies"}`;
    }
    case "education": {
      const n = resume.education?.length ?? 0;
      return `${n} entr${n === 1 ? "y" : "ies"}`;
    }
    case "certifications": {
      const n = normalizeCertificationsArray(resume.certifications).length;
      return `${n} entr${n === 1 ? "y" : "ies"}`;
    }
    case "skills": {
      const n = splitCommaItems(resume.skills).length;
      return `${n} skill${n === 1 ? "" : "s"}`;
    }
    case "technicalSkills": {
      const groups = normalizeTechnicalSkillsState(resume.technicalSkills);
      const n = groups.reduce((acc, g) => acc + (g.chips?.length ?? 0), 0);
      return `${n} skill${n === 1 ? "" : "s"}`;
    }
    case "languages": {
      const n = splitCommaItems(resume.languages).length;
      return `${n} language${n === 1 ? "" : "s"}`;
    }
    case "personalDetails": {
      const filled = PERSONAL_DETAIL_FIELDS.filter(
        ({ key }) => String(resume[key] || "").trim()
      ).length;
      if (filled === 0) return "Empty";
      return `${filled} of ${PERSONAL_DETAIL_FIELDS.length} filled`;
    }
    default: {
      for (const opt of OPTIONAL_BUILDER_SECTIONS) {
        if (opt.id !== sectionId) continue;
        const v = resume[opt.field];
        if (opt.multiline) {
          const lines = String(v || "")
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean).length;
          return lines ? `${lines} line${lines === 1 ? "" : "s"}` : "Empty";
        }
        return String(v || "").trim() ? "Filled" : "Empty";
      }
      return "";
    }
  }
}

function moveArrayItem(list, from, to) {
  const arr = Array.isArray(list) ? list : [];
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr;
  const next = [...arr];
  const [row] = next.splice(from, 1);
  next.splice(to, 0, row);
  return next;
}

function splitSkillInputSegments(raw) {
  return String(raw || "")
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** @returns {number | null} sortable month index */
function parseMmYyyyComparable(display) {
  const t = String(display || "").trim();
  if (!t || isPresentLiteralTyping(t)) return null;
  const m = t.match(/^(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const mm = parseInt(m[1], 10);
  const yy = parseInt(m[2], 10);
  if (!Number.isFinite(mm) || !Number.isFinite(yy)) return null;
  return yy * 12 + mm;
}

function isExperienceEndBeforeStart(startDisplay, endDisplay, present) {
  if (present) return false;
  const a = parseMmYyyyComparable(startDisplay);
  const b = parseMmYyyyComparable(endDisplay);
  if (a == null || b == null) return false;
  return b < a;
}

function snapshotResumeForDiscard(r) {
  try {
    return JSON.parse(JSON.stringify(r));
  } catch {
    return { ...r };
  }
}

// ── CV draft persistence ──────────────────────────────────────────────────
// Builder CV-draft localStorage helpers live in ../lib/cvDraft so the ATS →
// AI-tailor handoff (ATSChecker) can write a draft under the EXACT key the
// Builder reads here on mount. Tab focus, token refresh, or accidental refresh
// can remount BuilderPage and wipe in-memory resume state; the draft mirror
// (cleared on explicit save or discard, else kept until TTL) recovers it.

/** @param {{ title: string, subtitle: string, onRowClick: () => void, onMoveUp: () => void, onMoveDown: () => void, disableUp: boolean, disableDown: boolean, onEdit: () => void, onDelete: () => void }} props */
function ContactDetailsCard({ resume, set }) {
  /* Design row: Contact details as a collapsible section card. Opens by
     default while empty (first thing to fill), collapses once named. */
  const [open, setOpen] = useState(() => !String(resume.name || "").trim());
  const meta = [resume.name, resume.location].filter(Boolean).join(", ") || "Your name, contact and location";
  return (
    <div id="section-personal" className="cvp-builder-personal-card" style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 13, marginBottom: 9 }}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", minHeight: 56, padding: "11px 12px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
      >
        <span style={ACCORDION_ICON_BOX}>
          <User size={16} strokeWidth={1.8} style={{ color: "var(--text-secondary)" }} aria-hidden />
        </span>
        <span style={{ minWidth: 0, flex: 1 }}>
          <span style={{ display: "block", fontSize: 14, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.3 }}>Contact details</span>
          <span style={{ display: "block", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.35, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{meta}</span>
        </span>
        <span style={{ flexShrink: 0, color: "var(--text-muted)", display: "inline-flex", transform: open ? "rotate(180deg)" : "none", transition: "transform 200ms cubic-bezier(0.4,0,0.2,1)" }}>
          <ChevronDown size={17} strokeWidth={2} aria-hidden />
        </span>
      </button>
      <div style={{ display: "grid", gridTemplateRows: open ? "1fr" : "0fr", transition: "grid-template-rows 240ms cubic-bezier(0.4,0,0.2,1)" }}>
        <div style={{ overflow: open ? "visible" : "hidden", minHeight: 0 }}>
          <div style={{ display: "grid", gap: 10, padding: "2px 14px 15px", borderTop: "1px solid var(--border)", paddingTop: 14 }}>
            <div className="cvp-field">
              <input id="cvp-pi-name" className="cvp-input" placeholder=" " value={resume.name} onChange={(e) => set("name", e.target.value)} />
              <label htmlFor="cvp-pi-name">Full name</label>
            </div>
            <div className="cvp-field">
              <input id="cvp-pi-title" className="cvp-input" placeholder=" " value={resume.title} onChange={(e) => set("title", e.target.value)} />
              <label htmlFor="cvp-pi-title">Job title</label>
            </div>
            <div className="cvp-field">
              <input id="cvp-pi-email" className="cvp-input" placeholder=" " value={resume.email} onChange={(e) => set("email", e.target.value)} />
              <label htmlFor="cvp-pi-email">Email</label>
            </div>
            <div className="cvp-field">
              <input id="cvp-pi-phone" className="cvp-input" placeholder=" " value={resume.phone} onChange={(e) => set("phone", e.target.value)} />
              <label htmlFor="cvp-pi-phone">Phone</label>
            </div>
            <div className="cvp-field">
              <input id="cvp-pi-linkedin" className="cvp-input" placeholder=" " value={resume.linkedin || ""} onChange={(e) => set("linkedin", e.target.value)} />
              <label htmlFor="cvp-pi-linkedin">LinkedIn URL</label>
            </div>
            <div className="cvp-field">
              <input id="cvp-pi-location" className="cvp-input" placeholder=" " value={resume.location} onChange={(e) => set("location", e.target.value)} />
              <label htmlFor="cvp-pi-location">Location</label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function BuilderArrivalHero({ onImported, onManual }) {
  /* The design arrival: upload is the hero, hand-typing is the quiet
     fallback. The import pipeline is BuilderCvImport (extract, upload
     import-only, parse) — same mechanics as the header button. */
  return (
    <div style={{ maxWidth: 560, width: "100%", margin: "0 auto" }}>
      <BuilderCvImport variant="hero" onImported={onImported} />
      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 2px 0" }}>
        <span style={{ flex: 1, height: 1, background: "var(--border)" }} aria-hidden />
        <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>no CV yet</span>
        <span style={{ flex: 1, height: 1, background: "var(--border)" }} aria-hidden />
      </div>
      <button
        type="button"
        onClick={onManual}
        style={{ width: "100%", marginTop: 14, minHeight: 44, background: "transparent", border: "1px solid var(--border)", borderRadius: 11, color: "var(--text-primary)", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
      >
        Fill it in by hand instead
      </button>
    </div>
  );
}

function AddSectionChips({ resume, setResume, setOpenSection, onTechnicalSkills }) {
  const extra = resume.builderExtraSectionIds || [];
  const chips = [];
  for (const opt of OPTIONAL_BUILDER_SECTIONS) {
    if (opt.id === "personalDetails") continue; /* fixed section now */
    if (extra.includes(opt.id)) continue;
    chips.push({ key: opt.id, label: opt.label, onAdd: () => {
      setResume((r) => ({ ...r, builderExtraSectionIds: [...new Set([...(r.builderExtraSectionIds || []), opt.id])] }));
      setOpenSection(opt.id);
    } });
  }
  if (!technicalSkillsHasAnyChip(resume)) {
    chips.splice(1, 0, { key: "technicalSkills", label: "Technical Skills", onAdd: onTechnicalSkills });
  }
  if (chips.length === 0) return null;
  return (
    <div>
      <p style={{ margin: "20px 2px 11px", fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-muted)" }}>Add a section</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {chips.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={c.onAdd}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 34, padding: "0 13px", borderRadius: 999, background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text-primary)", fontSize: 12.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit", transition: `border-color 150ms ${EASE}` }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-accent-line)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
          >
            <span style={{ color: "var(--accent-text)", fontWeight: 700, fontSize: 15, lineHeight: 1 }} aria-hidden>+</span> {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function BuilderEntryRow({ title, subtitle, hint, onRowClick, onMoveUp, onMoveDown, disableUp, disableDown, onEdit, onDelete }) {
  /* Design entry row: grip, title + subtitle, an amber Edit pill, and a
     quiet overflow menu carrying move/delete (capabilities the mock's
     row omits but a candidate still needs — the menu is the design's
     own pattern for exactly this). No pencil-and-arrow cluster. */
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onRowClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onRowClick();
        }
      }}
      className="cvp-entry-row-in"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "var(--bg-elevated)",
        border: "1px solid var(--border)",
        borderRadius: 11,
        padding: "11px 8px 11px 12px",
        cursor: "pointer",
        minHeight: 44,
        boxSizing: "border-box",
        position: "relative",
        transition: "border-color 150ms cubic-bezier(0.4,0,0.2,1)",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-accent-line)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
    >
      <span style={{ color: "var(--text-muted)", flexShrink: 0, display: "flex", pointerEvents: "none" }} aria-hidden>
        <GripVertical size={14} strokeWidth={1.8} />
      </span>
      <div style={{ flex: 1, minWidth: 0, pointerEvents: "none" }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--text-primary)", lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {title}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.35, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {subtitle}
        </div>
        {hint ? (
          <div style={{ marginTop: 5 }}>
            <span className="cvp-hint-chip">{hint}</span>
          </div>
        ) : null}
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        style={{
          flexShrink: 0,
          display: "inline-flex",
          alignItems: "center",
          gap: 5,
          height: 32,
          padding: "0 13px",
          borderRadius: 8,
          background: "var(--color-accent-soft)",
          border: "1px solid var(--color-accent-line)",
          color: "var(--accent-text)",
          fontSize: 12.5,
          fontWeight: 600,
          cursor: "pointer",
          fontFamily: "inherit",
        }}
      >
        <Pencil size={13} strokeWidth={2} aria-hidden /> Edit
      </button>
      <div style={{ position: "relative", flexShrink: 0 }}>
        <button
          type="button"
          aria-label={`${title} options`}
          aria-expanded={menuOpen}
          onClick={(e) => { e.stopPropagation(); setMenuOpen((v) => !v); }}
          style={{ width: 28, height: 28, padding: 0, display: "grid", placeItems: "center", background: "transparent", border: "none", borderRadius: 7, color: "var(--text-muted)", cursor: "pointer" }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg>
        </button>
        {menuOpen ? (
          <>
            <div role="presentation" style={{ position: "fixed", inset: 0, zIndex: 39 }} onClick={(e) => { e.stopPropagation(); setMenuOpen(false); }} />
            <div role="menu" style={{ position: "absolute", top: 32, right: 0, zIndex: 40, minWidth: 158, padding: 5, borderRadius: 12, background: "var(--builder-glass)", backdropFilter: "blur(20px) saturate(1.5)", WebkitBackdropFilter: "blur(20px) saturate(1.5)", border: "1px solid var(--builder-glass-border)", boxShadow: "var(--builder-glass-shadow)" }}>
              <button role="menuitem" type="button" disabled={disableUp} onClick={(e) => { e.stopPropagation(); setMenuOpen(false); if (!disableUp) onMoveUp(); }} style={{ ...ACCORDION_MENU_ITEM, opacity: disableUp ? 0.4 : 1, cursor: disableUp ? "not-allowed" : "pointer" }}>
                <ChevronUp size={14} strokeWidth={2} aria-hidden /> Move up
              </button>
              <button role="menuitem" type="button" disabled={disableDown} onClick={(e) => { e.stopPropagation(); setMenuOpen(false); if (!disableDown) onMoveDown(); }} style={{ ...ACCORDION_MENU_ITEM, opacity: disableDown ? 0.4 : 1, cursor: disableDown ? "not-allowed" : "pointer" }}>
                <ChevronDown size={14} strokeWidth={2} aria-hidden /> Move down
              </button>
              <button role="menuitem" type="button" onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(); }} style={{ ...ACCORDION_MENU_ITEM, color: "var(--danger)" }}>
                <Trash2 size={14} strokeWidth={1.8} aria-hidden /> Delete
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildCvFinderMatchList(resume, queryRaw) {
  const query = queryRaw.trim();
  if (query.length < 1) return [];
  const ql = query.toLowerCase();
  const matches = [];
  const push = (sectionId, sectionLabel, text) => {
    if (text == null) return;
    const t = typeof text === "string" ? text : String(text);
    if (!t.trim()) return;
    if (!t.toLowerCase().includes(ql)) return;
    matches.push({ sectionId, sectionLabel, text: t.trim() });
  };

  push("summary", "Professional Summary", resume.summary || "");

  (resume.experience || []).forEach((exp) => {
    push("experience", "Professional Experience", exp.company);
    push("experience", "Professional Experience", exp.role);
    push("experience", "Professional Experience", exp.location);
    push("experience", "Professional Experience", exp.period);
    String(exp.points || "")
      .split(/\n/)
      .forEach((line) => push("experience", "Professional Experience", line));
  });

  (resume.education || []).forEach((edu) => {
    push("education", "Education", edu.school);
    push("education", "Education", edu.degree);
    push("education", "Education", edu.fieldOfStudy);
    push("education", "Education", edu.year);
    push("education", "Education", edu.location);
    push("education", "Education", buildEducationYearLine(edu));
  });

  splitCommaItems(resume.skills).forEach((sk) => push("skills", "Skills", sk));

  normalizeTechnicalSkillsState(resume.technicalSkills).forEach((g) => {
    push("technicalSkills", "Technical Skills", g.category);
    g.chips.forEach((c) => push("technicalSkills", "Technical Skills", c));
  });

  normalizeCertificationsArray(resume.certifications).forEach((c) => {
    push("certifications", "Certifications", c.name);
    push("certifications", "Certifications", c.issuer);
    push("certifications", "Certifications", c.year);
  });

  splitCommaItems(resume.languages).forEach((lg) => push("languages", "Languages", lg));

  OPTIONAL_BUILDER_SECTIONS.forEach((opt) => {
    if (!(resume.builderExtraSectionIds || []).includes(opt.id)) return;
    if (opt.id === "certifications") return;
    const val = resume[opt.field];
    if (typeof val !== "string" || !val.trim()) return;
    if (opt.multiline) {
      val.split(/\n/).forEach((line) => push(opt.id, opt.label, line));
    } else {
      push(opt.id, opt.label, val);
    }
  });

  return matches.map((m, i) => ({ ...m, key: `${m.sectionId}-${i}-${m.text.slice(0, 24)}` }));
}

function HighlightedSnippet({ text, query }) {
  const q = query.trim();
  if (!q) return text;
  const parts = text.split(new RegExp(`(${escapeRegExp(q)})`, "gi"));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === q.toLowerCase() ? (
          <strong key={i} style={{ color: "var(--text-primary)", fontWeight: 700 }}>
            {part}
          </strong>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </>
  );
}

function pulseCvpHighlight(el) {
  if (!el || typeof window === "undefined") return;
  const prevBg = el.style.backgroundColor;
  const prevTrans = el.style.transition;
  el.style.transition = "background-color 150ms cubic-bezier(0.4,0,0.2,1)";
  el.style.backgroundColor = "var(--border)";
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      el.style.backgroundColor = "var(--bg-elevated)";
    });
  });
  window.setTimeout(() => {
    el.style.backgroundColor = prevBg || "";
    el.style.transition = prevTrans || "";
  }, 320);
}

function TechnicalSkillsEditor({ resume, setResume, jobTitle }) {
  const [newCategoryName, setNewCategoryName] = useState("");
  const [chipDraftByIndex, setChipDraftByIndex] = useState({});
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pastePreview, setPastePreview] = useState(null);
  const [pasteMode, setPasteMode] = useState("global");
  const [pasteCategoryIndex, setPasteCategoryIndex] = useState(null);
  const [suggestedCategoriesDismissed, setSuggestedCategoriesDismissed] = useState(false);
  const [addedSuggestedCatKeys, setAddedSuggestedCatKeys] = useState(() => new Set());
  const groups = normalizeTechnicalSkillsState(resume.technicalSkills);
  const techRolePack = useMemo(() => getRoleSuggestions(jobTitle), [jobTitle]);

  const updateGroups = (next) => {
    setResume((r) => ({
      ...r,
      technicalSkills: typeof next === "function" ? next(normalizeTechnicalSkillsState(r.technicalSkills)) : next,
    }));
  };

  const onAddCategory = () => {
    const name = newCategoryName.trim();
    if (!name || groups.length >= 20) return;
    updateGroups((g) => [...g, { category: name, chips: [] }]);
    setNewCategoryName("");
  };

  const moveGroup = (from, to) => {
    if (from === to || from < 0 || to < 0 || from >= groups.length || to >= groups.length) return;
    updateGroups((g) => {
      const next = [...g];
      const [row] = next.splice(from, 1);
      next.splice(to, 0, row);
      return next;
    });
    setChipDraftByIndex({});
  };

  const closePaste = () => {
    setPasteOpen(false);
    setPasteText("");
    setPastePreview(null);
    setPasteCategoryIndex(null);
  };

  const openGlobalPaste = () => {
    setPasteMode("global");
    setPasteCategoryIndex(null);
    setPasteText("");
    setPastePreview(null);
    setPasteOpen(true);
  };

  const openCategoryPaste = (idx) => {
    setPasteMode("category");
    setPasteCategoryIndex(idx);
    setPasteText("");
    setPastePreview(null);
    setPasteOpen(true);
  };

  const runPasteImport = () => {
    if (pasteMode === "category" && pasteCategoryIndex != null) {
      const parts = splitSkillInputSegments(pasteText);
      setPastePreview({ kind: "category", chips: parts, warn: null });
      return;
    }
    const parsed = parseTechnicalSkillsPasteBlock(pasteText);
    const room = Math.max(0, 20 - groups.length);
    let warn = null;
    let rows = parsed;
    if (parsed.length > room) {
      rows = parsed.slice(0, room);
      warn = "Maximum 20 categories reached";
    }
    setPastePreview({ kind: "global", rows, warn });
  };

  const commitPaste = () => {
    if (!pastePreview) {
      closePaste();
      return;
    }
    if (pastePreview.kind === "category" && pasteCategoryIndex != null) {
      const chips = pastePreview.chips || [];
      if (chips.length === 0) {
        closePaste();
        return;
      }
      const idx = pasteCategoryIndex;
      updateGroups((arr) => {
        const ng = [...arr];
        if (!ng[idx]) return arr;
        const merged = [...skillsArrayForChipRender(ng[idx].chips)];
        const seen = new Set(merged.map((c) => c.toLowerCase()));
        for (const c of chips) {
          if (!seen.has(c.toLowerCase())) {
            merged.push(c);
            seen.add(c.toLowerCase());
          }
        }
        ng[idx] = { ...ng[idx], chips: merged };
        return ng;
      });
      closePaste();
      return;
    }
    const rows = pastePreview.rows || [];
    if (rows.length === 0) {
      closePaste();
      return;
    }
    updateGroups((g) => [...g, ...rows.map((row) => ({ category: row.category, chips: [...row.chips] }))]);
    closePaste();
  };

  const categoryNameTaken = (name) =>
    groups.some((g) => g.category.trim().toLowerCase() === String(name).trim().toLowerCase());

  const isSuggestedCategoryAdded = (cat) => {
    const key = String(cat.category || "").trim().toLowerCase();
    return addedSuggestedCatKeys.has(key) || categoryNameTaken(cat.category);
  };

  const addSuggestedCategory = (cat) => {
    const catName = String(cat.category || "").trim();
    if (!catName) return;
    const key = catName.toLowerCase();
    updateGroups((g) => {
      const idx = g.findIndex((x) => x.category.trim().toLowerCase() === catName.toLowerCase());
      if (idx >= 0) {
        const next = [...g];
        const seen = new Set();
        const merged = [];
        for (const c of [...skillsArrayForChipRender(next[idx].chips), ...skillsArrayForChipRender(cat.chips)]) {
          const l = c.toLowerCase();
          if (!seen.has(l)) {
            seen.add(l);
            merged.push(c);
          }
        }
        next[idx] = { ...next[idx], chips: merged };
        return next;
      }
      if (g.length >= 20) return g;
      return [...g, { category: catName, chips: skillsArrayForChipRender(cat.chips) }];
    });
    setAddedSuggestedCatKeys((prev) => new Set(prev).add(key));
  };

  const chipRowStyle = {
    display: "flex",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "flex-start",
    alignContent: "flex-start",
    minHeight: 36,
    width: "100%",
  };

  const suggestRows = techRolePack?.technicalSkillCategories?.length && !suggestedCategoriesDismissed ? techRolePack.technicalSkillCategories : null;

  return (
    <>
      {pasteOpen ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 450,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
            padding: 16,
            boxSizing: "border-box",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closePaste();
          }}
        >
          <div
            style={{ ...BUILDER_SHEET_SURFACE, width: "100%", maxWidth: 520, padding: 16, display: "grid", gap: 12, maxHeight: "85vh", overflow: "hidden" }}
            onClick={(e) => e.stopPropagation()}
          >
            <textarea
              className="cvp-textarea"
              style={{ minHeight: 140 }}
              readOnly={pastePreview != null}
              placeholder='Paste your skills here, one category per line e.g. IT Support Tools: ManageEngine, RDP'
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
            />
            {pastePreview && pastePreview.warn ? (
              <p style={{ fontSize: 12, color: "var(--warn)", margin: 0 }}>{pastePreview.warn}</p>
            ) : null}
            {pastePreview && pastePreview.kind === "category" && (pastePreview.chips || []).length > 0 ? (
              <div style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                {(pastePreview.chips || []).join(" · ")}
              </div>
            ) : null}
            {pastePreview && pastePreview.kind === "global" && pastePreview.rows.length > 0 ? (
              <div style={{ overflowY: "auto", maxHeight: 200, display: "grid", gap: 8 }}>
                {pastePreview.rows.map((row, ri) => (
                  <div key={`${row.category}-${ri}`} style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.4 }}>
                    <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>{row.category}</span>
                    {row.chips.length > 0 ? `: ${row.chips.join(", ")}` : ""}
                  </div>
                ))}
              </div>
            ) : null}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                style={{ background: "none", border: "none", color: "var(--text-secondary)", fontSize: 14, cursor: "pointer", padding: "8px 4px" }}
                onClick={closePaste}
              >
                Cancel
              </button>
              {pastePreview == null ? (
                <button type="button" style={{ ...CB_UI.btn, padding: "10px 18px" }} onClick={runPasteImport}>
                  Import
                </button>
              ) : (
                <button type="button" style={{ ...CB_UI.btn, padding: "10px 18px" }} onClick={commitPaste}>
                  Save
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
      <div data-cvp-highlight="technicalSkills" style={{ display: "grid", gap: 12 }}>
        <style dangerouslySetInnerHTML={{ __html: CVP_BUILDER_PH_CSS }} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <input
            className="cvp-input"
            style={{ flex: "1 1 160px" }}
            placeholder="Category name (e.g. IT Support Tools)"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onAddCategory();
              }
            }}
          />
          <button
            type="button"
            className="cvp-builder-add-entry-btn"
            style={{ ...CB_UI.btn }}
            disabled={!newCategoryName.trim() || groups.length >= 20}
            onClick={onAddCategory}
          >
            + Add Category
          </button>
        </div>
        {groups.length >= 20 ? <p style={{ fontSize: 12, color: "var(--warn)", margin: 0 }}>Maximum 20 categories.</p> : null}

      {groups.map((g, i) => {
        const chipList = skillsArrayForChipRender(g.chips);
        return (
        <div
          key={i}
          style={{
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: 12,
            marginBottom: 8,
          }}
          onDragOver={(e) => {
            e.preventDefault();
          }}
          onDrop={(e) => {
            e.preventDefault();
            const from = Number(e.dataTransfer.getData("application/x-cvp-tech-cat"));
            if (Number.isNaN(from)) return;
            moveGroup(from, i);
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div
              role="button"
              tabIndex={0}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("application/x-cvp-tech-cat", String(i));
                e.dataTransfer.effectAllowed = "move";
              }}
              aria-label="Drag to reorder category"
              onKeyDown={(e) => {
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  moveGroup(i, i - 1);
                }
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  moveGroup(i, i + 1);
                }
              }}
              style={{ color: "var(--text-secondary)", cursor: "grab", flexShrink: 0, display: "flex", touchAction: "none" }}
            >
              <GripVertical size={13} strokeWidth={1.8} aria-hidden />
            </div>
            <input
              type="text"
              value={g.category || ""}
              title="Click to rename"
              onChange={(e) => {
                const v = e.target.value;
                updateGroups((arr) => {
                  const ng = [...arr];
                  ng[i] = { ...ng[i], category: v };
                  return ng;
                });
              }}
              style={{
                flex: 1,
                minWidth: 0,
                background: "transparent",
                border: "none",
                borderBottom: "1px solid transparent",
                color: "var(--text-primary)",
                fontSize: 12,
                fontWeight: 600,
                outline: "none",
                padding: "2px 0",
                fontFamily: "inherit",
              }}
              onFocus={(e) => {
                e.target.style.borderBottomColor = "rgba(217,119,6,0.35)";
              }}
              onBlur={(e) => {
                e.target.style.borderBottomColor = "transparent";
              }}
            />
            <span style={{ ...BUILDER_TECH_SKILL_COUNT_BADGE, flexShrink: 0 }}>
              {chipList.length} skill{chipList.length === 1 ? "" : "s"}
            </span>
            <button
              type="button"
              aria-label="Remove category"
              onClick={() => updateGroups((arr) => arr.filter((_, j) => j !== i))}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 4, display: "flex" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "var(--danger)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "var(--text-secondary)";
              }}
            >
              <Trash2 size={14} strokeWidth={1.8} aria-hidden />
            </button>
          </div>
          {chipList.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--danger)", margin: "0 0 8px" }}>
              Add at least one skill to this category, or remove it — empty categories cannot be saved.
            </p>
          ) : null}
          <div style={chipRowStyle}>
            {chipList.map((chip, ci) => (
              <span key={`${chip}-${ci}`} style={BUILDER_TECH_CHIP}>
                {chip}
                <button
                  type="button"
                  aria-label={`Remove ${chip}`}
                  onClick={() =>
                    updateGroups((arr) => {
                      const ng = [...arr];
                      const list = skillsArrayForChipRender(ng[i].chips);
                      const next = list.filter((_, k) => k !== ci);
                      ng[i] = { ...ng[i], chips: next };
                      return ng;
                    })
                  }
                  style={BUILDER_TECH_CHIP_REMOVE}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = "1";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = "0.45";
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="cvp-skills-add-row" style={{ marginBottom: 10 }}>
            <input
              className="cvp-input cvp-builder-ph cvp-skills-skill-input"
              placeholder="Skill or tool name…"
              value={chipDraftByIndex[i] ?? ""}
              onChange={(e) => setChipDraftByIndex((d) => ({ ...d, [i]: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const raw = chipDraftByIndex[i] ?? "";
                  const parts = splitSkillInputSegments(raw);
                  if (parts.length === 0) return;
                  updateGroups((arr) => {
                    const ng = [...arr];
                    const cur = skillsArrayForChipRender(ng[i].chips);
                    const seen = new Set(cur.map((c) => c.toLowerCase()));
                    for (const t of parts) {
                      if (!seen.has(t.toLowerCase())) {
                        cur.push(t);
                        seen.add(t.toLowerCase());
                      }
                    }
                    ng[i] = { ...ng[i], chips: cur };
                    return ng;
                  });
                  setChipDraftByIndex((d) => ({ ...d, [i]: "" }));
                }
              }}
              onPaste={(e) => {
                const text = e.clipboardData?.getData("text") || "";
                if (!/[,;\n]/.test(text)) return;
                e.preventDefault();
                const parts = splitSkillInputSegments(text);
                if (parts.length === 0) return;
                updateGroups((arr) => {
                  const ng = [...arr];
                  const cur = skillsArrayForChipRender(ng[i].chips);
                  const seen = new Set(cur.map((c) => c.toLowerCase()));
                  for (const t of parts) {
                    if (!seen.has(t.toLowerCase())) {
                      cur.push(t);
                      seen.add(t.toLowerCase());
                    }
                  }
                  ng[i] = { ...ng[i], chips: cur };
                  return ng;
                });
                setChipDraftByIndex((d) => ({ ...d, [i]: "" }));
              }}
            />
            <button
              type="button"
              className="cvp-builder-skill-add-btn"
              style={BUILDER_SKILL_ADD_BTN}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "0.88";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "1";
              }}
              onClick={() => {
                const raw = chipDraftByIndex[i] ?? "";
                const parts = splitSkillInputSegments(raw);
                if (parts.length === 0) return;
                updateGroups((arr) => {
                  const ng = [...arr];
                  const cur = skillsArrayForChipRender(ng[i].chips);
                  const seen = new Set(cur.map((c) => c.toLowerCase()));
                  for (const t of parts) {
                    if (!seen.has(t.toLowerCase())) {
                      cur.push(t);
                      seen.add(t.toLowerCase());
                    }
                  }
                  ng[i] = { ...ng[i], chips: cur };
                  return ng;
                });
                setChipDraftByIndex((d) => ({ ...d, [i]: "" }));
              }}
            >
              + Add
            </button>
          </div>
          <button type="button" style={{ ...PASTE_IMPORT_BTN, width: "100%", marginTop: 6, marginBottom: 0 }} onClick={() => openCategoryPaste(i)}>
            <ClipboardIconThin size={13} />
            Paste &amp; Import
          </button>
        </div>
      );})}

        <button type="button" style={{ ...PASTE_IMPORT_BTN, width: "100%", justifyContent: "center", marginTop: 4 }} onClick={openGlobalPaste}>
          <ClipboardIconThin size={16} />
          Paste &amp; Import (multiple categories)
        </button>

        {suggestRows ? (
          <div
            style={{
              background: "rgba(217,119,6,0.06)",
              border: "1px dashed rgba(217,119,6,0.45)",
              borderRadius: 12,
              padding: 12,
              marginBottom: 10,
            }}
          >
            <div
              style={{
                marginBottom: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Lightbulb size={11} strokeWidth={1.8} style={{ color: "var(--accent-text)" }} aria-hidden />
                <span style={{ fontSize: 11, color: "var(--accent-text)", fontWeight: 600 }}>Suggested categories, not on your CV yet</span>
              </span>
              <button
                type="button"
                title="Dismiss suggestions"
                onClick={() => setSuggestedCategoriesDismissed(true)}
                style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}
              >
                <X size={13} strokeWidth={2} aria-hidden />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {suggestRows.map((cat) => {
                const added = isSuggestedCategoryAdded(cat);
                return (
                  <div key={cat.category} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{cat.category}</span>
                    <button
                      type="button"
                      disabled={added || groups.length >= 20}
                      onClick={() => addSuggestedCategory(cat)}
                      style={{
                        background: "var(--bg-elevated)",
                        border: added ? "1px solid var(--success)" : "1px solid var(--border)",
                        color: added ? "var(--success)" : "var(--text-primary)",
                        fontFamily: "inherit",
                        fontSize: 11,
                        fontWeight: 500,
                        padding: "5px 12px",
                        borderRadius: 12,
                        cursor: added || groups.length >= 20 ? "not-allowed" : "pointer",
                        opacity: groups.length >= 20 && !added ? 0.45 : 1,
                      }}
                    >
                      {added ? "✓ Added" : "+ Add"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {groups.length === 0 ? <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>Add a category, then add skills as chips.</p> : null}
      </div>
    </>
  );
}

const initialDownloadState = {
  status: 'idle',
  error: null,
};

function downloadReducer(state, action) {
  switch (action.type) {
    case 'START_SYNTHESIS':
      if (state.status !== 'idle') return state;
      return { status: 'synthesizing', error: null };
    case 'BEGIN_GENERATION':
      if (state.status !== 'synthesizing') return state;
      return { ...state, status: 'generating' };
    case 'SET_EXITING':
      return { ...state, status: 'exiting' };
    case 'FINISH_SUCCESS':
      return { status: 'completed', error: null };
    case 'FAIL':
      return { status: 'error', error: action.payload };
    case 'RESET':
      return initialDownloadState;
    default:
      return state;
  }
}

function ResumeBuilder({
  user,
  onBack,
  initialResume,
  initialResumeId,
  initialTemplateId,
  isPro = false,
  profile = null,
  refreshProfile = null,
}) {
  const hasCoverLetterAccess = hasFeatureAccess(profile, 'coverLetter');

  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isNew = !!searchParams.get("new");
  const [fabMode, setFabMode] = useState(() => {
    if (typeof window === "undefined") return "assistant";
    const params = new URLSearchParams(window.location.search);
    return params.get("guide") === "true" && sessionStorage.getItem("hasCompletedGuide") !== "true" ? "guide" : "assistant";
  });
  const [guideStep, setGuideStep] = useState(0);
  const guideStepRef = useRef(0);

  useEffect(() => {
    refreshProfile?.();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Phase A analytics: builder_loaded fires once on first mount.
  // Ref guard prevents StrictMode dev double-invocation from firing twice.
  const didFireBuilderLoadedRef = useRef(false);
  useEffect(() => {
    if (didFireBuilderLoadedRef.current) return;
    didFireBuilderLoadedRef.current = true;
    logEvent("builder_loaded", {
      template_id: selectedTemplate?.id ?? null,
      is_new_cv: isNew,
      cv_id: resumeId ?? null,
      is_mobile: isMobile,
      time_to_first_paint_ms: Math.round(performance.now()),
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const draftStorageKey = useMemo(
    () => getDraftStorageKey(initialResumeId, location.search),
    [initialResumeId, location.search]
  );
  // Owner-scoped read: a draft stamped with a different user's id (or any
  // user's id when this visit is anonymous) is ignored and cleared — on a
  // shared machine the next visitor must never see the previous CV.
  const initialDraftRef = useRef(readCvDraft(draftStorageKey, user?.id || null));

  const [selectedTemplate, setSelectedTemplate] = useState(() => {
    const draft = initialDraftRef.current;
    if (draft?.templateId) {
      const t = TEMPLATES.find((x) => x.id === draft.templateId);
      if (t) return t;
    }
    return TEMPLATES.find((t) => t.id === initialTemplateId) || TEMPLATES[0];
  });
  const [downloadState, dispatch] = useReducer(downloadReducer, initialDownloadState);
  // Free-tier download gate. Mirrors the server gate in api/generate-pdf.js
  // (free = 1 download). Once used, the download CTA shows a lock and routes
  // to /pricing instead of failing the render with a 402.
  const [dlGate, setDlGate] = useState(null);
  const refreshDlGate = useCallback(async () => {
    try {
      const g = await getGatekeeperData();
      setDlGate(g);
    } catch {
      /* non-blocking — leave the gate unknown (download still attempts) */
    }
  }, []);
  useEffect(() => { refreshDlGate(); }, [refreshDlGate]);
  // Locked only when we KNOW the free allowance is spent (never block on an
  // unknown/errored gate, and never for paid users).
  const downloadLocked = !isPro && !!dlGate && dlGate.isPaidUser === false && dlGate.canDownload === false;
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [resumeId, setResumeId] = useState(() => {
    const draft = initialDraftRef.current;
    if (draft?.resumeId) return draft.resumeId;
    return initialResumeId || null;
  });
  const [resume, setResumeRaw] = useState(() => {
    const draft = initialDraftRef.current;
    if (draft?.cv) {
      // Drafts written by older builds may still carry the removed
      // prefills (languages "English, Hindi" etc.) — scrub on read.
      const base = scrubLegacyDraftPrefills(normalizeResumeForBuilder(draft.cv));
      return {
        ...base,
        technicalSkills: normalizeTechnicalSkillsState(draft.cv.technicalSkills ?? base.technicalSkills),
      };
    }
    if (isNew) {
      return {
        ...normalizeResumeForBuilder({ ...EMPTY_RESUME }),
        technicalSkills: normalizeTechnicalSkillsState(""),
      };
    }
    const base = normalizeResumeForBuilder(
      initialResume || {
        ...EMPTY_RESUME,
        name: user?.name || "",
        email: user?.email || "",
      }
    );
    return {
      ...base,
      technicalSkills: normalizeTechnicalSkillsState(base.technicalSkills),
    };
  });
  const [builderTab, setBuilderTab] = useState("content");
  const [showSavedBridge, setShowSavedBridge] = useState(false);
  const saveBridgeRef = useRef(null);
  const savedBridgeTimerRef = useRef(null);
  const [guidedCoachRequestKey] = useState(0);
  const [openSection, setOpenSection] = useState(null);
  const [activeSection, setActiveSection] = useState(null);
  const [menuDrawerOpen, setMenuDrawerOpen] = useState(false);
  const [fabSheet, setFabSheet] = useState(null);
  /* Day/night — the builder follows the global candidate theme (cvp_theme,
     light/day is the product default). The root stamps data-theme so the
     token cascade re-resolves inside the App shell's dark pin; setTheme
     also stamps <html> so body portals (SynthesisOverlay, CompletionScreen)
     agree. No stored preference → day. */
  const [builderTheme, setBuilderTheme] = useState(() => getTheme());
  /* Arrival: an empty CV opens on the upload hero (uploading a CV she
     already has beats thumb-typing one). "Fill it in by hand instead" is
     the quiet fallback. Guide mode bypasses the hero. */
  const [manualStart, setManualStart] = useState(false);
  const toggleBuilderTheme = useCallback(() => {
    setBuilderTheme((cur) => setTheme(cur === "dark" ? "light" : "dark"));
  }, []);
  const [previewFadeOut, setPreviewFadeOut] = useState(false);
  const [contextualSection, setContextualSection] = useState(null);
  const [, setJobHasJd] = useState(false);
  const [experienceEditor, setExperienceEditor] = useState(null);
  const [educationEditor, setEducationEditor] = useState(null);
  const [certificationEditor, setCertificationEditor] = useState(null);
  const [experienceDateErrors, setExperienceDateErrors] = useState({ start: null, end: null });
  const [educationDateErrors, setEducationDateErrors] = useState({ start: null, end: null });
  const mmYyyyCursorRef = useRef(null);
  const experienceEditorSessionRef = useRef(null);
  const educationEditorSessionRef = useRef(null);
  const [skillInput, setSkillInput] = useState("");
  const [skillsPasteOpen, setSkillsPasteOpen] = useState(false);
  const [skillsPasteDraft, setSkillsPasteDraft] = useState("");
  const [langInput, setLangInput] = useState("");
  const downloadUiTimerRef = useRef(null);
  const [cvFinderOpen, setCvFinderOpen] = useState(false);
  const [cvFinderQuery, setCvFinderQuery] = useState("");
  const cvFinderPanelRef = useRef(null);
  const cvFinderToggleRef = useRef(null);
  const cvFinderInputRef = useRef(null);
  // ONE canonical 794px render feeds the paginated preview (desktop panel,
  // mobile overlay, pill thumbnail) AND the PDF export capture — desktop
  // and mobile can no longer export different documents.
  const docPreviewCaptureRef = useRef(null);
  const expDescriptionRef = useRef(null);
  const prefersReducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches,
    [],
  );
  const [coverLetterOpen, setCoverLetterOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  // Per-call-site reason for the upgrade modal. null falls through to
  // the existing default copy. Used by the Session B AI assist
  // exhaustion path ("builder_ai") and reserved for Session C bullets.
  const [upgradeFeature, setUpgradeFeature] = useState(null);

  // Free-tier AI rewrite credits remaining. null means "unlimited"
  // (Pro / Express / unknown profile state). Mirrors the response
  // contract from /api/ai?action=tailor: paid tiers receive
  // credits_remaining=null; free tier receives 0..2.
  const deriveAiCreditsRemaining = useCallback((p) => {
    if (!p) return null;
    if (p.is_pro) return null;
    const used = Number(p.ai_credits_used) || 0;
    return Math.max(0, 2 - used);
  }, []);
  const [aiCreditsRemaining, setAiCreditsRemaining] = useState(() => deriveAiCreditsRemaining(profile));
  useEffect(() => {
    setAiCreditsRemaining(deriveAiCreditsRemaining(profile));
  }, [profile, deriveAiCreditsRemaining]);

  // Direct Improve-with-AI for the experience description. One click fires
  // an uncached rewrite of the WHOLE points text; the AIWorkingGlow ring
  // shows on the field while generating; the results modal opens with 3
  // full options; clicking one replaces the entire description. The hook +
  // modal stack on top of the experience editor's own modal.
  const expImproveOriginalRef = useRef("");
  const expAi = useAiImprove({
    onCreditsUpdate: (remaining) => {
      setAiCreditsRemaining(remaining);
      if (refreshProfile) refreshProfile();
    },
    onExhausted: () => {
      setUpgradeFeature("builder_ai");
      setUpgradeOpen(true);
    },
  });
  const experienceHasText = String(experienceEditor?.draft?.points || "").trim().length > 0;
  const [templatePickPending, setTemplatePickPending] = useState(null);
  const [templateConfirmOpen, setTemplateConfirmOpen] = useState(false);
  const [previewTemplateOverride, setPreviewTemplateOverride] = useState(null);
  // Declared here (not with the other view state below) because the
  // document-preview hook's `enabled` gate reads it. The resize listener
  // stays with the rest of the effects.
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // One click = the whole action: the progress-card CTA scrolls AND opens
  // the matching new-entry editor (a scroll alone reads as a dead click).
  const handleProgressNudgeAction = useCallback((sectionId) => {
    if (sectionId === "experience") {
      setExperienceEditor((cur) => cur || { mode: "add", index: -1, draft: { ...EMPTY_EXP } });
    } else if (sectionId === "education") {
      setEducationEditor((cur) => cur || { mode: "add", index: -1, draft: { ...EMPTY_EDU } });
    }
    // Contact / summary / skills / extras: opening the section + the pulse
    // IS the action — those fields edit in place.
  }, []);

  // Live preview CV: while an entry editor is open, its unsaved draft is
  // merged in so the document updates AS THE USER TYPES each field — not
  // only after Save. (The editors are side sheets that leave the preview
  // visible for exactly this reason.)
  const previewResume = useMemo(() => {
    let cv = resume;
    if (experienceEditor?.draft) {
      const d = experienceEditor.draft;
      const entry = { ...d, period: buildExperiencePeriod({ ...d, present: d.present }) || d.period || "" };
      const hasContent = [d.role, d.company, d.points, d.location].some((v) => String(v || "").trim());
      if (experienceEditor.mode === "edit") {
        cv = { ...cv, experience: cv.experience.map((e, i) => (i === experienceEditor.index ? entry : e)) };
      } else if (hasContent) {
        cv = { ...cv, experience: [...cv.experience, entry] };
      }
    }
    if (educationEditor?.draft) {
      const d = educationEditor.draft;
      const entry = { ...d, year: buildEducationYearLine(d) || d.year || "" };
      const hasContent = [d.school, d.degree, d.fieldOfStudy].some((v) => String(v || "").trim());
      if (educationEditor.mode === "edit") {
        cv = { ...cv, education: cv.education.map((e, i) => (i === educationEditor.index ? entry : e)) };
      } else if (hasContent) {
        cv = { ...cv, education: [...cv.education, entry] };
      }
    }
    return cv;
  }, [resume, experienceEditor, educationEditor]);

  // Paginated document preview — shared print simulation (same layout pass
  // the PDF export runs). Debounced internally: 150ms desktop / 400ms touch.
  const {
    measureNode: docMeasureNode,
    doc: previewDoc,
    pulse: previewPulse,
  } = useDocumentPreview({
    cv: previewResume,
    template: previewTemplateOverride ?? selectedTemplate,
    captureRef: docPreviewCaptureRef,
    // Mobile pays for pagination ONLY while the preview is open — typing
    // in the form never triggers the measure/fragment pass (freeze guard).
    enabled: !isMobile || fabSheet === "preview",
  });
  const [pendingSection, setPendingSection] = useState(null);
  const [templatesInteractKey, setTemplatesInteractKey] = useState(0);
  const [templateSessionApplyCount, setTemplateSessionApplyCount] = useState(0);
  const [cvJourney, setCvJourney] = useState({ templateChosen: false, atsChecked: false, coverLetterSeen: false });
  const [tabTransitioning, setTabTransitioning] = useState(false);
  const [transitingToTab, setTransitingToTab] = useState(null);
  const [navigationSource, setNavigationSource] = useState(null);
  const [scanStatus, setScanStatus] = useState("idle");
  const TOLL_PLAZA_MESSAGES = {
    templates: "Choosing the best layout...",
    ats: "Preparing your ATS scan...",
    jobmatch: "Analyzing market fit...",
    coverletter: "Drafting your pitch...",
  };

  const onNavigateToTab = useCallback((tab) => {
    setTabTransitioning((prev) => {
      if (prev) return prev;
      return true;
    });
    setTransitingToTab(tab);
    setNavigationSource(`guide_step`);
    setTimeout(() => {
      setBuilderTab(tab);
      setTabTransitioning(false);
      setTransitingToTab(null);
    }, 800);
  }, []);
  const openAtsChecker = useCallback(() => {
    setCvJourney((j) => (j.atsChecked ? j : { ...j, atsChecked: true }));
    navigate("/ats");
  }, [navigate]);
  const [technicalSkillsFromPrompt, setTechnicalSkillsFromPrompt] = useState(false);
  const fabRef = useRef(null);
  const builderRootRef = useRef(null);
  const builderIdleT15Ref = useRef(null);
  const builderIdleT25Ref = useRef(null);
  const fabSheetRef = useRef(fabSheet);
  fabSheetRef.current = fabSheet;
  const scheduleBuilderIdleRef = useRef(() => {});
  const prevBuilderTabRef = useRef(null);
  const cvCompletionProgress = useCvProgress(resume);

  // ATS fixes deep-link. Typed gaps (structural, with weight + category) are
  // carried in the from=ats draft written by ATSChecker — preferred. Legacy
  // ?gaps= strings (old links) fall back to untyped review chips. The tiered
  // AtsFixesPanel re-evaluates resolution live against `resume`.
  const atsGaps = useMemo(() => {
    const fromDraft = normalizeAtsGaps(initialDraftRef.current?.atsGaps);
    if (fromDraft.length) return fromDraft;
    const params = new URLSearchParams(location.search);
    if (params.get("from") !== "ats") return [];
    return gapsFromLegacyParam(params.get("gaps"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);
  // Mirror into a ref so the debounced draft auto-save can persist gaps
  // across reloads (the auto-save payload otherwise omits them).
  const atsGapsRef = useRef([]);
  atsGapsRef.current = atsGaps;

  // Template ATS-safety drives honest resolution of the tables/columns gap:
  // only an ATS-tagged template lets that gap mark ✓.
  const templateIsAtsSafe = useMemo(() => {
    const tags = Array.isArray(selectedTemplate?.tags) ? selectedTemplate.tags : [];
    return tags.some((t) => String(t).toLowerCase().includes("ats"));
  }, [selectedTemplate]);

  // We know which template is ATS-safe — recommend it so the gap CTA gives the
  // answer instead of a picker. Default: UAE ATS (#19, free, single-column).
  // Pro + finance industry (carried in the from=ats draft) → Finance (#13).
  const atsRecommendation = useMemo(() => {
    const industry = String(initialDraftRef.current?.industry || "").toLowerCase();
    const financeLike = /financ|bank|account|audit|invest/.test(industry);
    if (isPro && financeLike) {
      const fin = TEMPLATES.find((t) => t.id === 13);
      if (fin) return { id: fin.id, name: fin.name };
    }
    const ats = TEMPLATES.find((t) => t.id === 19);
    return ats ? { id: ats.id, name: ats.name } : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPro]);

  // One-time CV-import welcome popup. Shows once per from=ats import (flag lives
  // in the draft so it survives reload; flipped to "seen" after first view).
  const [showAtsWelcome, setShowAtsWelcome] = useState(() => {
    const d = initialDraftRef.current;
    return d?.atsWelcome === "pending" && Array.isArray(d?.atsGaps) && d.atsGaps.length > 0;
  });
  const atsWelcomeRef = useRef(initialDraftRef.current?.atsWelcome || null);
  // Real, never-padded split shared with the fixes panel.
  const atsWelcomePartition = useMemo(
    () => partitionGapsByResolution(atsGaps, resume, { templateIsAtsSafe, atsRecommendation }),
    [atsGaps, resume, templateIsAtsSafe, atsRecommendation],
  );
  // Lightweight toast for ATS quick-fix removals (undoable via Ctrl+Z).
  const [atsToast, setAtsToast] = useState(null);
  useEffect(() => {
    if (!atsToast) return undefined;
    const t = setTimeout(() => setAtsToast(null), 3000);
    return () => clearTimeout(t);
  }, [atsToast]);
  // pdfTargetPages drives the PDF generation pipeline; setter is unused
  // since the 1pg/2pg toggle was removed. Keeping the state in case a
  // settings surface re-introduces user control.
  // eslint-disable-next-line no-unused-vars
  const [pdfTargetPages, setPdfTargetPages] = useState(2);
  const [savedAtMs, setSavedAtMs] = useState(null);
  const [savedBadgeLabel, setSavedBadgeLabel] = useState(null);
  const [draftSaveState, setDraftSaveState] = useState(null); // "saving" | "saved" | null
  const draftIndicatorArmedRef = useRef(false);
  const lastSavedSnapshotRef = useRef(null);
  // Replaces the old JSON-diff-vs-snapshot dirty detection. Flips true ONLY
  // on user-driven mutations (any call site using `setResume`). Data-load
  // paths must use `setResumeAsLoad` so initial CV injection (e.g. from
  // /transform/success → "Edit in Builder") doesn't register as an edit.
  const [userHasEdited, setUserHasEdited] = useState(false);
  // Tier 2: undo/redo stack. Single state object {entries, index} so push
  // updates are atomic. Cap at 50 to bound memory; oldest entry drops
  // when full. Initialised with the current resume as the first entry.
  const [historyState, setHistoryState] = useState(() => ({ entries: [resume], index: 0 }));

  // User-driven setter: every call flips the dirty flag and pushes a
  // history entry. Subcomponents that mutate via the `setResume` prop
  // (CertificationsBuilderSection, TechnicalSkillsEditor, etc.) get
  // both behaviours transparently.
  const setResume = useCallback((updaterOrValue) => {
    setResumeRaw((prev) => {
      const next = typeof updaterOrValue === "function" ? updaterOrValue(prev) : updaterOrValue;
      setHistoryState((h) => {
        // Truncate redo branch (any redo entries become invalid the
        // moment a new edit lands) then push the fresh state.
        const trimmed = h.entries.slice(0, h.index + 1);
        trimmed.push(next);
        const capped = trimmed.length > 50 ? trimmed.slice(trimmed.length - 50) : trimmed;
        return { entries: capped, index: capped.length - 1 };
      });
      return next;
    });
    setUserHasEdited(true);
  }, []);
  // Data-injection setter: skips the dirty flag and re-baselines the
  // Discard target so a future Discard reverts to the just-loaded state.
  // Also resets the history stack — a load is not an undoable user
  // action; pre-load state is recovered via Discard, not Undo.
  const setResumeAsLoad = useCallback((value) => {
    setResumeRaw(value);
    if (value && typeof value === "object" && !Array.isArray(value)) {
      lastSavedSnapshotRef.current = snapshotResumeForDiscard(value);
    }
    setHistoryState({ entries: [value], index: 0 });
  }, []);

  /* Job Match chip inserts — the SAME dedup-aware skills write the
     Content tab's skill adders use, so a tapped keyword lands in the CV
     for real (preview, draft autosave, PDF) and is undoable like any
     other edit. Removal is the chip's own undo path. */
  const addSkillFromMatch = useCallback((name) => {
    const clean = String(name || "").trim();
    if (!clean) return;
    setResume((r) => {
      const cur = splitCommaItems(r.skills);
      if (cur.some((x) => x.toLowerCase() === clean.toLowerCase())) return r;
      return { ...r, skills: [...cur, clean].join(", ") };
    });
  }, [setResume]);

  const removeSkillFromMatch = useCallback((name) => {
    const clean = String(name || "").trim();
    if (!clean) return;
    setResume((r) => {
      const cur = splitCommaItems(r.skills);
      return { ...r, skills: cur.filter((x) => x.toLowerCase() !== clean.toLowerCase()).join(", ") };
    });
  }, [setResume]);

  const handleUndo = useCallback(() => {
    setHistoryState((h) => {
      if (h.index <= 0) return h;
      const newIndex = h.index - 1;
      setResumeRaw(h.entries[newIndex]);
      setUserHasEdited(true);
      return { ...h, index: newIndex };
    });
  }, []);

  const handleRedo = useCallback(() => {
    setHistoryState((h) => {
      if (h.index >= h.entries.length - 1) return h;
      const newIndex = h.index + 1;
      setResumeRaw(h.entries[newIndex]);
      setUserHasEdited(true);
      return { ...h, index: newIndex };
    });
  }, []);

  const canUndo = historyState.index > 0;
  const canRedo = historyState.index < historyState.entries.length - 1;

  // Keyboard shortcuts: ⌘/Ctrl+Z undo, ⌘⇧Z / Ctrl+Y redo. Only fires
  // when focus is OUTSIDE form fields — inside inputs/textareas the
  // browser's native undo handles per-character edits, which is what
  // users expect.
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target;
      const inField = t instanceof HTMLElement && (
        t.tagName === "INPUT" ||
        t.tagName === "TEXTAREA" ||
        t.isContentEditable
      );
      if (inField) return;
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.key === "z" && e.shiftKey) || e.key === "y") {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleUndo, handleRedo]);
  // CV import: confirmation dialog state when triggering import on a
  // non-empty draft. The pending payload holds the parsed cv_data + the
  // original filename, applied via setResumeAsLoad on confirm.
  const [cvImportPending, setCvImportPending] = useState(null);
  // Hydration banner: filename of the most recent successful import.
  // Cleared on first user edit (userHasEdited flip) so the banner
  // naturally disappears the moment the user starts working.
  const [cvImportedFilename, setCvImportedFilename] = useState(null);
  // Personal Details auto-add nudge: shown once when we surface the
  // section for a Gulf-bound user. Persisted via localStorage so we
  // don't auto-add again if the user removes the section.
  const [personalDetailsNudgeOpen, setPersonalDetailsNudgeOpen] = useState(false);
  const applyImportedCv = useCallback(
    (cvData, filename) => {
      setResumeAsLoad(normalizeResumeForBuilder(cvData));
      setCvImportedFilename(filename || null);
    },
    [setResumeAsLoad],
  );
  const cvImportedFieldCount = useMemo(
    () => (cvImportedFilename ? countCvImportFields(resume) : 0),
    [cvImportedFilename, resume],
  );
  const handleCvImported = useCallback(
    (cvData, filename) => {
      const empty = isCvDataEmptyForTemplateApply(resume);
      if (!empty) {
        setCvImportPending({ cvData, filename });
        return;
      }
      applyImportedCv(cvData, filename);
    },
    [resume, applyImportedCv],
  );
  // Auto-surface Personal Details for Gulf-bound users on first builder
  // load. Uses setResumeRaw so the auto-add isn't treated as a user edit
  // (no dirty flag flip; no Discard target shift). Persists a localStorage
  // flag so we never re-add if the user later removes the section.
  useEffect(() => {
    if (typeof window === "undefined") return;
    let alreadyDone = false;
    try {
      alreadyDone = window.localStorage.getItem("cvp_pd_auto_added") === "true";
    } catch {
      /* private mode — fail open: still try once per session */
    }
    if (alreadyDone) return;
    if ((resume.builderExtraSectionIds || []).includes("personalDetails")) return;
    if (!isGulfLocation(resume.location)) return;
    setResumeRaw((r) => ({
      ...r,
      builderExtraSectionIds: [
        ...(r.builderExtraSectionIds || []),
        "personalDetails",
      ],
    }));
    setPersonalDetailsNudgeOpen(true);
    try {
      window.localStorage.setItem("cvp_pd_auto_added", "true");
    } catch {
      /* ignore */
    }
    // Run-once on mount: we read resume.location / builderExtraSectionIds
    // intentionally as initial values, not subscribed deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const dismissPersonalDetailsNudge = useCallback(() => {
    setPersonalDetailsNudgeOpen(false);
  }, []);
  const [cvpBannerDismissedStored, setCvpBannerDismissedStored] = useState(
    () => typeof window !== "undefined" && window.localStorage.getItem("cvp_banner_dismissed") === "true"
  );
  const expModalBodyRef = useRef(null);
  const [expModalScrollShadow, setExpModalScrollShadow] = useState(false);
  const [expModalBulletWarn, setExpModalBulletWarn] = useState(false);
  const [expModalHighEffortDirty, setExpModalHighEffortDirty] = useState(false);
  const [expCloseGuardOpen, setExpCloseGuardOpen] = useState(false);
  const [saveSuccessTick, setSaveSuccessTick] = useState(0);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'templates') setBuilderTab('templates');

    // Deep-link from the landing-page Live AI Demo modal:
    //   /builder?step=experience&ai=open
    // Lands the visitor on the Content tab with the experience accordion
    // open, the experience section scrolled into view, and (when ai=open)
    // the experience editor opened in add-mode so the "Improve with AI"
    // button is visible immediately.
    const step = params.get('step');
    const ai = params.get('ai');
    if (step === 'experience') {
      setBuilderTab('content');
      setOpenSection('experience');
      setTimeout(() => {
        document
          .getElementById('section-experience')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 120);
      if (ai === 'open') {
        setTimeout(() => {
          setExperienceEditor({ mode: 'add', index: -1, draft: { ...EMPTY_EXP } });
        }, 240);
      }
    }
  }, []);

  useEffect(() => {
    if (fabMode !== "guide") return;
    const step = GUIDE_STEPS[guideStep];
    if (!step) return;
    const allSections = [
      "section-personal",
      "section-summary",
      "section-experience",
      "section-education",
      "section-skills",
      "section-languages",
    ];
    allSections.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (step.sectionId === id) {
        el.classList.add("fab-guide-highlight");
        el.classList.remove("fab-guide-dimmed");
        setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
      } else {
        el.classList.remove("fab-guide-highlight");
        el.classList.add("fab-guide-dimmed");
      }
    });
  }, [guideStep, fabMode]);

  const finishGuide = useCallback(() => {
    ["section-personal", "section-summary", "section-experience", "section-education", "section-skills", "section-languages"].forEach(
      (id) => {
        const el = document.getElementById(id);
        if (el) el.classList.remove("fab-guide-highlight", "fab-guide-dimmed");
      }
    );
    sessionStorage.setItem("hasCompletedGuide", "true");
    setFabMode("assistant");
  }, []);

  const advanceGuideStep = useCallback(() => {
    setGuideStep((p) => {
      const next = p + 1;
      guideStepRef.current = next;
      if (next >= GUIDE_STEPS.length) {
        finishGuide();
        return p;
      }
      return next;
    });
  }, [finishGuide]);

  const retreatGuideStep = useCallback(() => {
    setGuideStep((p) => {
      const next = Math.max(0, p - 1);
      guideStepRef.current = next;
      return next;
    });
  }, []);

  // One-time snapshot capture for the Discard target. Runs on mount only
  // (empty deps) so a post-mount data injection via setResumeAsLoad —
  // which re-baselines the snapshot itself — is not overwritten.
  // `isNew` flow keeps the snapshot null; Discard is hidden in that case
  // because userHasEdited only flips on user input.
  useEffect(() => {
    if (isNew) return;
    if (lastSavedSnapshotRef.current == null) {
      lastSavedSnapshotRef.current = snapshotResumeForDiscard(resume);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced mirror of the working CV to localStorage. Survives tab-focus
  // remounts, token-refresh cascades, and accidental reloads. The
  // saving→saved state is surfaced in the progress card — the work IS
  // persisted, so show it (unsaved-work anxiety kills trust).
  useEffect(() => {
    if (!draftStorageKey) return undefined;
    // First run mirrors the initial state — silent. The indicator only
    // speaks once the user has actually edited something.
    if (draftIndicatorArmedRef.current) setDraftSaveState("saving");
    const timer = setTimeout(() => {
      writeCvDraft(draftStorageKey, {
        version: 2,
        cv: { ...resume, technicalSkills: sanitizeTechnicalSkillsForPersist(resume.technicalSkills) },
        templateId: selectedTemplate?.id || null,
        resumeId: resumeId || null,
        // Preserve ATS gaps (from=ats handoff) so a reload keeps the fixes panel.
        atsGaps: atsGapsRef.current && atsGapsRef.current.length ? atsGapsRef.current : undefined,
        // Preserve the welcome-popup flag so it stays one-time across reloads.
        atsWelcome: atsWelcomeRef.current || undefined,
        // Preserve inferred industry so the ATS-template recommendation holds.
        industry: initialDraftRef.current?.industry || undefined,
      }, user?.id || null);
      if (draftIndicatorArmedRef.current) {
        setDraftSaveState("saved");
        setSavedAtMs(Date.now());
      }
      draftIndicatorArmedRef.current = true;
    }, 500);
    return () => clearTimeout(timer);
  }, [resume, selectedTemplate?.id, resumeId, draftStorageKey, user?.id]);

  useEffect(() => {
    if (savedAtMs == null) {
      setSavedBadgeLabel(null);
      return;
    }
    const tick = () => {
      const sec = (Date.now() - savedAtMs) / 1000;
      setSavedBadgeLabel(sec < 60 ? "Saved just now" : "Saved 1 min ago");
    };
    tick();
    const id = window.setInterval(tick, 15000);
    return () => clearInterval(id);
  }, [savedAtMs]);

  useEffect(() => {
    if (!experienceEditor) {
      setExpModalScrollShadow(false);
      setExpCloseGuardOpen(false);
      setExpModalHighEffortDirty(false);
      return;
    }
    setExpModalBulletWarn(false);
    setExpCloseGuardOpen(false);
    setExpModalHighEffortDirty(false);
    const el = expModalBodyRef.current;
    if (!el) return;
    const sync = () => {
      setExpModalScrollShadow(el.scrollHeight > el.clientHeight + 2 && el.scrollTop + el.clientHeight < el.scrollHeight - 6);
    };
    sync();
    el.addEventListener("scroll", sync, { passive: true });
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(sync) : null;
    ro?.observe(el);
    return () => {
      el.removeEventListener("scroll", sync);
      ro?.disconnect();
    };
  }, [experienceEditor]);

  useEffect(() => {
    const prev = prevBuilderTabRef.current;
    prevBuilderTabRef.current = builderTab;
    if (builderTab === "templates" && prev != null && prev !== "templates") {
      setTemplateSessionApplyCount(0);
      saveBridgeRef.current?.();
    }
  }, [builderTab]);

  useEffect(() => {
    if (technicalSkillsHasAnyChip({ technicalSkills: resume.technicalSkills })) setTechnicalSkillsFromPrompt(false);
  }, [resume.technicalSkills]);

  useEffect(() => {
    if (fabMode !== "guide") return;
    if (guideStep !== 6) return;
    if (!selectedTemplate) return;
    advanceGuideStep();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- advance when template id changes at templates guide step only
  }, [selectedTemplate?.id]);

  useEffect(() => {
    if (experienceEditor == null) {
      experienceEditorSessionRef.current = null;
      setExperienceDateErrors({ start: null, end: null });
      return;
    }
    const key = `${experienceEditor.mode}-${experienceEditor.index}`;
    if (experienceEditorSessionRef.current !== key) {
      experienceEditorSessionRef.current = key;
      setExperienceDateErrors({ start: null, end: null });
    }
  }, [experienceEditor]);

  useEffect(() => {
    if (educationEditor == null) {
      educationEditorSessionRef.current = null;
      setEducationDateErrors({ start: null, end: null });
      return;
    }
    const key = `${educationEditor.mode}-${educationEditor.index}`;
    if (educationEditorSessionRef.current !== key) {
      educationEditorSessionRef.current = key;
      setEducationDateErrors({ start: null, end: null });
    }
  }, [educationEditor]);

  useLayoutEffect(() => {
    const job = mmYyyyCursorRef.current;
    if (!job) return;
    mmYyyyCursorRef.current = null;
    const el = document.getElementById(job.id);
    if (!el) return;
    const p = Math.min(job.cursor, el.value.length);
    el.setSelectionRange(p, p);
  }, [
    experienceEditor?.draft?.startDate,
    experienceEditor?.draft?.endDate,
    educationEditor?.draft?.startDate,
    educationEditor?.draft?.endDate,
    experienceEditor,
    educationEditor,
  ]);

  useEffect(() => {
    if (openSection == null) {
      setActiveSection(null);
      return;
    }
    if (openSection === "skills" || openSection === "technicalSkills") {
      setActiveSection("competencies");
      return;
    }
    if (openSection === "summary" || openSection === "experience" || openSection === "education" || openSection === "languages") {
      setActiveSection(openSection);
      return;
    }
    setActiveSection(null);
  }, [openSection]);

  useEffect(() => {
    const st = location.state && typeof location.state === "object" ? location.state : null;
    if (!st) return;
    const next = { ...st };
    let dirty = false;
    if (st.cvpBuilderTab === "jobmatch") {
      setBuilderTab("jobmatch");
      delete next.cvpBuilderTab;
      dirty = true;
    }
    if (st.cvpInitialTemplateId != null) {
      const t = TEMPLATES.find((x) => x.id === st.cvpInitialTemplateId);
      if (t) setSelectedTemplate(t);
      delete next.cvpInitialTemplateId;
      dirty = true;
    }
    // /transform/success → "Edit in Builder" hands the rewritten CV in
    // via location.state. Apply once and clear so a refresh doesn't
    // overwrite further user edits.
    if (st.cvpInitialResume && typeof st.cvpInitialResume === "object") {
      const incoming = normalizeResumeForBuilder(st.cvpInitialResume);
      // Data injection — must NOT mark the resume as user-edited.
      // setResumeAsLoad also re-baselines the Discard snapshot so the
      // user can revert to the loaded CV (not the empty pre-load state).
      setResumeAsLoad({
        ...incoming,
        technicalSkills: normalizeTechnicalSkillsState(incoming.technicalSkills),
      });
      delete next.cvpInitialResume;
      dirty = true;
    }
    if (!dirty) return;
    navigate(location.pathname, { replace: true, state: Object.keys(next).length ? next : undefined });
  }, [location.state, location.pathname, navigate, setResumeAsLoad]);

  /* Keyboard-safe inputs (mobile): when the on-screen keyboard opens, the
     focused field must never sit underneath it — settle, then centre it. */
  useEffect(() => {
    if (!isMobile) return undefined;
    const onFocusIn = (e) => {
      const t = e.target;
      if (!t || !/^(input|textarea)$/i.test(t.tagName)) return;
      setTimeout(() => {
        try {
          t.scrollIntoView({ block: "center", behavior: prefersReducedMotion ? "auto" : "smooth" });
        } catch {
          /* older WebKit: positional fallback not worth the complexity */
        }
      }, 260);
    };
    document.addEventListener("focusin", onFocusIn);
    return () => document.removeEventListener("focusin", onFocusIn);
  }, [isMobile, prefersReducedMotion]);

  useEffect(() => {
    writeFabMemory({ lastTabVisited: builderTab });
    if (builderTab !== "ats") setScanStatus("idle");
  }, [builderTab]);

  useEffect(
    () => () => {
      if (downloadUiTimerRef.current != null) {
        clearTimeout(downloadUiTimerRef.current);
        downloadUiTimerRef.current = null;
      }
    },
    []
  );

  const cvFinderMatches = useMemo(() => buildCvFinderMatchList(resume, cvFinderQuery), [resume, cvFinderQuery]);

  useEffect(() => {
    if (!cvFinderOpen) return undefined;
    cvFinderInputRef.current?.focus();
    const onDown = (e) => {
      const p = cvFinderPanelRef.current;
      const t = cvFinderToggleRef.current;
      const tgt = e.target;
      if (p && typeof p.contains === "function" && p.contains(tgt)) return;
      if (t && typeof t.contains === "function" && t.contains(tgt)) return;
      setCvFinderOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [cvFinderOpen]);

  const onCvFinderResultActivate = useCallback((sectionId) => {
    setCvFinderOpen(false);
    setCvFinderQuery("");
    setBuilderTab("content");
    setOpenSection(sectionId);
    window.requestAnimationFrame(() => {
      const visibleEl = (sel) =>
        Array.from(document.querySelectorAll(sel)).find((el) => el.offsetParent !== null);
      visibleEl(`[data-cvp-accordion="${sectionId}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
      window.setTimeout(() => {
        pulseCvpHighlight(visibleEl(`[data-cvp-highlight="${sectionId}"]`));
      }, 280);
    });
  }, []);

  // ── ATS fixes: mechanical merge of split skills sections ──────────────────
  // Fold every technicalSkills chip into the comma-separated skills list
  // (case-insensitive dedup), then clear technicalSkills. A user-driven
  // mutation → setResume flips the dirty flag and the split_skills gap
  // re-evaluates to resolved on the next render.
  const handleMergeSkills = useCallback(() => {
    setResume((r) => {
      const base = splitCommaItems(r.skills);
      const techChips = normalizeTechnicalSkillsState(r.technicalSkills).flatMap((g) => g.chips);
      const seen = new Set(base.map((s) => s.toLowerCase()));
      const merged = [...base];
      for (const c of techChips) {
        const k = String(c).trim().toLowerCase();
        if (k && !seen.has(k)) { seen.add(k); merged.push(String(c).trim()); }
      }
      return { ...r, skills: merged.join(", "), technicalSkills: "" };
    });
    onCvFinderResultActivate("skills");
  }, [onCvFinderResultActivate, setResume]);

  // ── ATS fixes: remove a located junk element (one-click, undoable) ────────
  // Operates on the precise located element only — a bullet line, a custom
  // field, a certification, or an optional free-text section. Core fields are
  // never reached here (the engine routes those to focus_field instead). Goes
  // through setResume → existing undo history (Ctrl+Z), and re-evaluates live.
  const removeAtsElement = useCallback((target, label) => {
    if (!target) return;
    const section =
      target.kind === "bullet" ? "experience"
        : target.kind === "cert" ? "certifications"
          : target.kind === "customField" ? "personalDetails"
            : target.kind === "section" ? target.field
              : null;
    if (section) {
      setBuilderTab("content");
      setOpenSection(section);
      window.requestAnimationFrame(() => {
        const el = Array.from(document.querySelectorAll(`[data-cvp-highlight="${section}"]`)).find((e) => e.offsetParent !== null);
        el?.scrollIntoView({ behavior: "smooth", block: "start" });
        pulseCvpHighlight(el);
      });
    }
    setResume((r) => {
      if (target.kind === "bullet") {
        const exp = Array.isArray(r.experience) ? [...r.experience] : [];
        const e = exp[target.expIndex];
        if (!e) return r;
        const lines = String(e.points || "").split("\n");
        if (target.lineIndex < 0 || target.lineIndex >= lines.length) return r;
        lines.splice(target.lineIndex, 1);
        exp[target.expIndex] = { ...e, points: lines.join("\n") };
        return { ...r, experience: exp };
      }
      if (target.kind === "cert") {
        const arr = normalizeCertificationsArray(r.certifications);
        arr.splice(target.index, 1);
        return { ...r, certifications: arr };
      }
      if (target.kind === "customField") {
        const arr = Array.isArray(r.customFields) ? [...r.customFields] : [];
        const next = target.customFieldId
          ? arr.filter((c) => c?.id !== target.customFieldId)
          : arr.filter((_, i) => i !== target.index);
        return { ...r, customFields: next };
      }
      if (target.kind === "section") {
        const optId = target.field === "volunteerWork" ? "volunteer" : target.field;
        const extra = (r.builderExtraSectionIds || []).filter((id) => id !== optId);
        return { ...r, [target.field]: "", builderExtraSectionIds: extra };
      }
      return r;
    });
    setAtsToast({ text: `Removed ${label || "block"}`, onUndo: handleUndo });
  }, [setResume, handleUndo]);

  // ── ATS fixes: route a gap to ITS real field + element, per action kind ────
  const gotoAtsTarget = useCallback((action) => {
    if (!action) return;
    if (action.kind === "merge_skills") { handleMergeSkills(); return; }
    if (action.kind === "goto_template") { setBuilderTab("templates"); return; }
    if (action.kind === "switch_template") {
      const tpl = TEMPLATES.find((t) => t.id === action.templateId);
      if (!tpl) { setBuilderTab("templates"); return; }
      const prev = selectedTemplate;
      setSelectedTemplate(tpl);
      // Template isn't in the resume undo history; offer an explicit revert.
      setAtsToast({ text: `Switched to ${tpl.name}`, onUndo: prev ? () => setSelectedTemplate(prev) : null });
      return;
    }
    if (action.kind === "remove_element") { removeAtsElement(action.target, action.label); return; }
    if (action.kind === "open_experience") {
      setBuilderTab("content");
      const e = resume.experience?.[action.expIndex];
      if (e) setExperienceEditor({ mode: "edit", index: action.expIndex, draft: { ...EMPTY_EXP, ...e } });
      // Focus the exact field the gap is about.
      window.setTimeout(() => {
        if (action.focus === "dates") document.getElementById("cvp-exp-end-date")?.focus();
        else expDescriptionRef.current?.focus?.();
      }, 380);
      return;
    }
    if (action.kind === "focus_field") {
      setBuilderTab("content");
      if (action.field === "contact") {
        // Contact lives in the always-visible personal card, not an accordion.
        window.requestAnimationFrame(() => {
          document.getElementById("section-personal")?.scrollIntoView({ behavior: "smooth", block: "start" });
          const first = Array.isArray(action.missing) && action.missing.length ? action.missing[0] : "name";
          window.setTimeout(() => document.getElementById(`cvp-pi-${first}`)?.focus(), 320);
        });
        return;
      }
      onCvFinderResultActivate(action.field);
      // Put the cursor in the section's first editable element.
      window.setTimeout(() => {
        const wrap = Array.from(document.querySelectorAll(`[data-cvp-highlight="${action.field}"]`)).find((e) => e.offsetParent !== null);
        wrap?.querySelector("input, textarea")?.focus();
      }, 380);
    }
  }, [onCvFinderResultActivate, handleMergeSkills, removeAtsElement, resume, setExperienceEditor, selectedTemplate]);

  // ── ATS welcome popup: mark seen (persist immediately) + actions ──────────
  const markAtsWelcomeSeen = useCallback(() => {
    atsWelcomeRef.current = "seen";
    try {
      const cur = readCvDraft(draftStorageKey, user?.id || null);
      if (cur) writeCvDraft(draftStorageKey, { ...cur, atsWelcome: "seen" }, user?.id || null);
    } catch { /* ignore — autosave will also persist "seen" */ }
  }, [draftStorageKey, user?.id]);

  const closeAtsWelcome = useCallback(() => {
    markAtsWelcomeSeen();
    setShowAtsWelcome(false);
  }, [markAtsWelcomeSeen]);

  const reviewAtsWelcome = useCallback(() => {
    markAtsWelcomeSeen();
    setShowAtsWelcome(false);
    setBuilderTab("content");
    window.requestAnimationFrame(() => {
      const el = Array.from(document.querySelectorAll("[data-cvp-ats-fixes]")).find(
        (e) => e.offsetParent !== null,
      );
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [markAtsWelcomeSeen]);

  const onBuilderGuideSheetOpenChange = useCallback((open) => {
    if (!open) scheduleBuilderIdleRef.current();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const opts = { capture: true };
    const events = ["input", "change", "click", "focusin"];

    const clearBuilderIdleTimers = () => {
      if (builderIdleT15Ref.current != null) {
        clearTimeout(builderIdleT15Ref.current);
        builderIdleT15Ref.current = null;
      }
      if (builderIdleT25Ref.current != null) {
        clearTimeout(builderIdleT25Ref.current);
        builderIdleT25Ref.current = null;
      }
    };

    const isIdleBlocked = () =>
      fabSheetRef.current === "preview" || fabRef.current?.isGuideSheetOpen?.() === true;

    const isTypingInTextField = () => {
      if (typeof document === "undefined") return false;
      const el = document.activeElement;
      const tag = el?.tagName?.toUpperCase();
      return tag === "INPUT" || tag === "TEXTAREA";
    };

    const scheduleBuilderIdleTimers = () => {
      clearBuilderIdleTimers();
      builderIdleT15Ref.current = window.setTimeout(() => {
        builderIdleT15Ref.current = null;
        if (isIdleBlocked()) return;
        if (isTypingInTextField()) {
          scheduleBuilderIdleTimers();
          return;
        }
        fabRef.current?.triggerBuilderIdlePulse?.();
      }, 45000);
      builderIdleT25Ref.current = window.setTimeout(() => {
        builderIdleT25Ref.current = null;
        if (isIdleBlocked()) return;
        if (isTypingInTextField()) {
          scheduleBuilderIdleTimers();
          return;
        }
        fabRef.current?.openGuideForCurrentTab?.();
        scheduleBuilderIdleTimers();
      }, 70000);
    };

    scheduleBuilderIdleRef.current = scheduleBuilderIdleTimers;

    const onActivity = () => {
      scheduleBuilderIdleTimers();
    };

    const detach = (root) => {
      if (!root) return;
      for (const ev of events) root.removeEventListener(ev, onActivity, opts);
    };

    const tryAttach = () => {
      const root = builderRootRef.current;
      detach(root);
      clearBuilderIdleTimers();
      if (fabSheetRef.current === "preview" || !root) return;
      for (const ev of events) root.addEventListener(ev, onActivity, opts);
      scheduleBuilderIdleTimers();
    };

    tryAttach();

    const rootAtAttach = builderRootRef.current;
    return () => {
      detach(rootAtAttach);
      clearBuilderIdleTimers();
      scheduleBuilderIdleRef.current = () => {};
    };
  }, [fabSheet]);

  // Phase A analytics: preview_clicked fires once per non→'preview' transition.
  // Single-source detection covers all 5 setFabSheet("preview") call sites.
  // has_user_edited_yet is a stable-shape placeholder until Phase B wires it.
  const prevFabSheetRef = useRef(null);
  useEffect(() => {
    const prev = prevFabSheetRef.current;
    prevFabSheetRef.current = fabSheet;
    if (fabSheet === "preview" && prev !== "preview") {
      logEvent("preview_clicked", {
        cv_id: resumeId ?? null,
        is_mobile: isMobile,
        has_user_edited_yet: false,
      });
    }
  }, [fabSheet, resumeId, isMobile]);

  useEffect(() => {
    const full = fabSheet === "preview" || previewFadeOut;
    if (full) document.body.classList.add("cvp-builder-full-preview");
    else document.body.classList.remove("cvp-builder-full-preview");
    return () => document.body.classList.remove("cvp-builder-full-preview");
  }, [fabSheet, previewFadeOut]);

  useEffect(() => {
    const isActive = downloadState.status !== 'idle';
    if (isActive) {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    } else {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    }
    return () => {
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
    };
  }, [downloadState.status]);

  const set = (k, v) => setResume(r => ({ ...r, [k]: v }));

  const orderedBuilderSectionIdList = useMemo(() => resolveOrderedBuilderSectionIds(resume), [resume]);

  const reorderBuilderSection = useCallback((sectionId, direction) => {
    setResume((r) => applyBuilderSectionReorder(r, sectionId, direction));
  }, [setResume]);

  // Tier 3 — section drag-and-drop. Single shared dragState drives the
  // is-dragging opacity and the drop indicator line on each card.
  // dragArmedRef gates draggable={true}: the card only initiates drag
  // when mousedown originated on the GripVertical handle, so clicks on
  // the title / chevrons / pencil never accidentally drag.
  const [dragState, setDragState] = useState({ draggingId: null, overId: null, overPosition: null });
  const dragArmedRef = useRef(false);
  useEffect(() => {
    const clear = () => { dragArmedRef.current = false; };
    window.addEventListener("mouseup", clear);
    window.addEventListener("dragend", clear);
    return () => {
      window.removeEventListener("mouseup", clear);
      window.removeEventListener("dragend", clear);
    };
  }, []);
  const armSectionDrag = useCallback(() => { dragArmedRef.current = true; }, []);
  const isSectionDragArmed = useCallback(() => dragArmedRef.current, []);
  const reorderBuilderSectionByDrop = useCallback((fromId, toId, position) => {
    setResume((r) => applyBuilderSectionReorderByDrop(r, fromId, toId, position));
  }, [setResume]);
  const dndProps = useMemo(() => ({
    dragState,
    setDragState,
    onArmDrag: armSectionDrag,
    isDragArmed: isSectionDragArmed,
    onSectionDrop: reorderBuilderSectionByDrop,
  }), [dragState, armSectionDrag, isSectionDragArmed, reorderBuilderSectionByDrop]);

  const score = builderAtsScore(resume);

  const templateFabRecommendNames = useMemo(() => {
    if (score >= 70) return TEMPLATES.filter((t) => t.tier === "premium").slice(0, 2).map((t) => t.name);
    return TEMPLATES.filter((t) => t.tier === "free").slice(0, 2).map((t) => t.name);
  }, [score]);

  const cvJourneyChrome = cvCompletionProgress.percent >= 100;
  const journeyStepActive = !cvJourney.templateChosen ? 1 : !cvJourney.atsChecked ? 2 : !cvJourney.coverLetterSeen ? 3 : 4;

  const handleSave = useCallback(async () => {
    if (!user?.id) {
      logEvent("save_attempted_unauthed", {
        had_typed_name: !!resume.name,
        had_typed_email: !!resume.email,
        had_typed_phone: !!resume.phone,
        route_query_params: typeof window !== "undefined" ? window.location.search : "",
        is_mobile: isMobile,
      }, { userId: null });
      return;
    }
    setSaving(true);
    try {
      const saved = await saveResume(
        user.id,
        { ...resume, technicalSkills: sanitizeTechnicalSkillsForPersist(resume.technicalSkills) },
        selectedTemplate.id,
        resumeId
      );
      setResumeId(saved.id);
      setSaveStatus("saved");
      lastSavedSnapshotRef.current = snapshotResumeForDiscard(resume);
      setUserHasEdited(false);
      setSavedAtMs(Date.now());
      setSaveSuccessTick((t) => t + 1);
      clearCvDraft(draftStorageKey);
      setTimeout(() => setSaveStatus(null), 3000);
      // TODO: wire cv_edited on section save — writeFabMemory({ lastAction: "cv_edited", lastActionAt: new Date().toISOString() })
    } catch(e) {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus(null), 3000);
    } finally {
      setSaving(false);
    }
  }, [user, resume, selectedTemplate, resumeId, draftStorageKey, isMobile]);

  saveBridgeRef.current = () => {
    if (!user?.id) return;
    if (savedBridgeTimerRef.current) clearTimeout(savedBridgeTimerRef.current);
    handleSave();
    setShowSavedBridge(true);
    savedBridgeTimerRef.current = setTimeout(() => setShowSavedBridge(false), 2400);
  };

  useEffect(() => () => {
    if (savedBridgeTimerRef.current) clearTimeout(savedBridgeTimerRef.current);
  }, []);

  const finalizeCloseExperienceModal = useCallback(() => {
    setExperienceEditor(null);
    setExpCloseGuardOpen(false);
    setExpModalHighEffortDirty(false);
  }, []);

  const askCloseExperienceModal = useCallback(() => {
    if (expModalHighEffortDirty) {
      setExpCloseGuardOpen(true);
      return;
    }
    finalizeCloseExperienceModal();
  }, [expModalHighEffortDirty, finalizeCloseExperienceModal]);

  const handleDownload = async (opts = {}) => {
    logEvent("download_clicked", {
      cv_id: resumeId ?? null,
      format: "pdf",
      is_authenticated: !!user?.id,
      is_mobile: isMobile,
    });
    // Free download spent → route to pricing rather than start synthesis and
    // hit a server 402. Guard fires for both the click and the post-synthesis
    // download call. Guide mode keeps its own flow and is exempt.
    if (downloadLocked && fabMode !== "guide") {
      logEvent("download_paywall_hit", { surface: "builder_download" });
      navigate("/pricing");
      return;
    }
    if (opts.skipSynthesis) {
      dispatch({ type: 'BEGIN_GENERATION' });
      try {
        if (user?.id) {
          try { await handleSave(); } catch (e) { console.warn('Save failed, continuing download', e); }
        }
        await new Promise((r) => setTimeout(r, 500));
        const el = docPreviewCaptureRef.current;
        if (!el) throw new Error('Preview not ready');
        await downloadResumeFromPreview(resume, el, {
          maxPages: pdfTargetPages,
          templateId: selectedTemplate?.id,
        });
        writeFabMemory({
          lastAction: 'downloaded',
          lastActionAt: new Date().toISOString(),
          lastTemplateId: selectedTemplate?.id != null ? `T${selectedTemplate.id}` : null,
        });
        invalidateGatekeeperCache();
        refreshDlGate();
        dispatch({ type: 'SET_EXITING' });
        setTimeout(() => dispatch({ type: 'FINISH_SUCCESS' }), 260);
      } catch (e) {
        console.error(e);
        // Server paywall (free download spent / no credit) — route to pricing
        // instead of surfacing a hard error. Covers the race where the gate
        // hadn't loaded before the click.
        if (/unlock|paid pass|free download used|no_credit/i.test(e?.message || "")) {
          refreshDlGate();
          dispatch({ type: 'RESET' });
          navigate("/pricing");
          return;
        }
        dispatch({ type: 'FAIL', payload: e.message });
        setTimeout(() => dispatch({ type: 'RESET' }), 3000);
      }
      return;
    }
    dispatch({ type: 'START_SYNTHESIS' });
  };

  const templatesPanel = (
    <BuilderTemplatesTab
      resume={resume}
      user={user}
      selectedTemplate={selectedTemplate}
      onApplyTemplate={setSelectedTemplate}
      onApplyTemplateAndGoToContent={(tpl) => {
        setSelectedTemplate(tpl);
        if (fabMode !== "guide") {
          setBuilderTab("content");
        }
        setTemplatePickPending(null);
        setTemplateConfirmOpen(false);
        setTemplateSessionApplyCount((c) => c + 1);
        setCvJourney((j) => ({ ...j, templateChosen: true }));
      }}
      pendingTemplate={templatePickPending}
      confirmOpen={templateConfirmOpen}
      onPendingTemplateChange={setTemplatePickPending}
      onConfirmOpenChange={setTemplateConfirmOpen}
      onTemplatesFabInteract={() => setTemplatesInteractKey((k) => k + 1)}
      showAtsJourneyPrompt={cvJourneyChrome && cvJourney.templateChosen && !cvJourney.atsChecked}
      onAtsJourneyNavigate={openAtsChecker}
      onAtsJourneySkipDownload={handleDownload}
    />
  );

  const navigateToProAtsPage = useCallback(() => {
    openAtsChecker();
    setFabSheet(null);
  }, [openAtsChecker]);

  const closePreview = useCallback(() => {
    setPendingSection(null);
    setPreviewFadeOut(true);
    setTimeout(() => {
      setFabSheet(null);
      setPreviewFadeOut(false);
      setPreviewTemplateOverride(null);
    }, 350);
  }, []);

  const handleContextualEdit = useCallback(
    (sectionName) => {
      const validSections = ["summary", "experience", "education", "competencies", "languages"];
      if (validSections.includes(sectionName)) {
        setOpenSection(sectionName);
        setContextualSection(sectionName);
      }
      setBuilderTab("content");
      closePreview();
      setTimeout(() => {
        fabRef.current?.openGuidedCoachSheet?.();
      }, 350);
    },
    [closePreview]
  );

  const sectionLabels = {
    summary: "Summary",
    experience: "Work History",
    education: "Education",
    competencies: "Skills",
    languages: "Languages",
  };

  const handleSectionHold = useCallback((sectionName) => {
    setPendingSection(sectionName);
  }, []);

  const handleConfirmEdit = useCallback(() => {
    if (!pendingSection) return;
    const section = pendingSection;
    setPendingSection(null);
    handleContextualEdit(section);
  }, [pendingSection, handleContextualEdit]);

  const handleCancelEdit = useCallback(() => {
    setPendingSection(null);
  }, []);



  const runCoverLetterJourneyStep = useCallback(() => {
    setCvJourney((j) => ({ ...j, coverLetterSeen: true }));
    if (fabMode !== "guide") setBuilderTab("jobmatch");
    if (hasCoverLetterAccess || fabMode === "guide") setCoverLetterOpen(true);
    else setUpgradeOpen(true);
  }, [hasCoverLetterAccess, fabMode]);

  const onPostPaymentCoverLetter = useCallback(() => {
    runCoverLetterJourneyStep();
  }, [runCoverLetterJourneyStep]);

  const resumeIsEmptyForArrival =
    !String(resume.name || "").trim() &&
    !String(resume.summary || "").trim() &&
    (resume.experience || []).length === 0 &&
    (resume.education || []).length === 0 &&
    !String(resume.skills || "").trim();
  const showArrivalHero = resumeIsEmptyForArrival && !manualStart && fabMode !== "guide";

  const isOpen = (id) => openSection === id;
  const toggleSection = (id) => setOpenSection(s => s === id ? null : id);


  /* ── Cover Letter locked preview for Guide step 10 ── */
  const guideCoverLetterPreview = (
    <div style={{ padding: "24px 16px 200px", filter: "blur(8px)", pointerEvents: "none", userSelect: "none" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>Cover Letter</span>
        <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999, background: "var(--border)", color: "var(--text-secondary)" }}>Preview</span>
      </div>
      <div style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", borderRadius: 12, padding: 16, overflow: "hidden", position: "relative" }}>
        <div style={{ fontSize: 14, lineHeight: 1.65, whiteSpace: "pre-wrap", color: "var(--text-secondary)" }}>
          {"Dear Hiring Manager,\n\nI am writing to express my strong interest in the position at your esteemed organisation. With my background in professional services and a proven track record of delivering results, I am confident in my ability to contribute meaningfully to your team."}
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.65, whiteSpace: "pre-wrap", color: "var(--text-secondary)", filter: "blur(5px)", marginTop: 12 }}>
          {"Throughout my career, I have consistently demonstrated the ability to manage complex projects and collaborate effectively with cross-functional teams. My experience in the Gulf region has equipped me with a deep understanding of regional business practices.\n\nI look forward to the opportunity to discuss how my qualifications align with your needs.\n\nSincerely,\nYour Name"}
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "55%", background: "linear-gradient(to bottom, rgba(20,20,20,0), var(--bg-surface) 55%, var(--bg-surface))", pointerEvents: "none" }} />
      </div>
    </div>
  );

  return (
    <div
      ref={builderRootRef}
      data-theme={builderTheme}
      style={{
        minHeight: "100vh",
        height: "100vh",
        width: "100%",
        maxWidth: "100%", /* never 100vw — it includes the scrollbar (iOS rule) */
        overflowX: "hidden",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-page)",
        color: "var(--text-primary)",
        fontFamily: "'DM Sans',sans-serif",
        paddingBottom: 80,
      }}
    >
      {/* Top nav bar — tabs row + optional CV finder */}
      <header
        className="cvp-builder-topbar"
        style={{
          flexShrink: 0,
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "var(--bg)",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          padding: 0,
          opacity: downloadState.status !== 'idle' ? 0 : 1,
          pointerEvents: downloadState.status !== 'idle' ? 'none' : 'auto',
          transition: 'opacity 0.3s ease',
        }}
      >
        <style dangerouslySetInnerHTML={{ __html: ".cvp-cv-finder-input::placeholder{color:var(--text-secondary)}" }} />
        <style dangerouslySetInnerHTML={{ __html: "@property --ats-angle{syntax:'<angle>';initial-value:0deg;inherits:false}@keyframes ats-spin-border{to{--ats-angle:360deg}}" }} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            flexWrap: "wrap",
            minHeight: 56,
            padding: "0 24px",
            boxSizing: "border-box",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: "1 1 auto", minWidth: 0 }}>
            <button type="button" onClick={onBack} aria-label="Back" className="cvp-builder-back" style={{ width: 44, height: 44, minWidth: 44, minHeight: 44, padding: 0, borderRadius: 8, border: "none", background: "transparent", color: "var(--text-secondary)", cursor: "pointer", display: "grid", placeItems: "center", transition: `color 150ms ${EASE}` }} onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-secondary)"; }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            </button>
            <div className="cvp-builder-tab-scroll" style={{ display: "flex", alignItems: "center", gap: 4, flex: 1, minWidth: 0, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              {["content", "templates", "ats", "jobmatch"].map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className="cvp-builder-tabchip"
                  onClick={() => {
                    if (tab === "ats") {
                      if (fabMode === "guide") {
                        setBuilderTab("ats");
                      } else {
                        openAtsChecker();
                      }
                      return;
                    }
                    setBuilderTab(tab);
                  }}
                  style={{
                    padding: "0 14px",
                    height: 44,
                    borderRadius: 0,
                    border: "none",
                    borderBottom: builderTab === tab ? "2px solid var(--accent)" : "2px solid transparent",
                    background: "transparent",
                    color: builderTab === tab ? "var(--accent-text)" : "var(--text-secondary)",
                    fontWeight: builderTab === tab ? 600 : 500,
                    fontSize: 14,
                    cursor: "pointer",
                    whiteSpace: "normal",
                    flex: "0 0 auto",
                    transition: `border-color 150ms ${EASE}, color 150ms ${EASE}`,
                  }}
                >
                  {tab === "content" ? "Content" : tab === "templates" ? "Templates" : tab === "ats" ? "ATS Check" : "Job Match"}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="cvp-builder-theme-toggle"
              aria-label={builderTheme === "dark" ? "Switch to day mode" : "Switch to night mode"}
              title={builderTheme === "dark" ? "Switch to day mode" : "Switch to night mode"}
              onClick={toggleBuilderTheme}
              style={{
                width: 44,
                height: 44,
                minWidth: 44,
                minHeight: 44,
                padding: 0,
                border: "none",
                background: "transparent",
                color: "var(--text-secondary)",
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
                transition: `color 150ms ${EASE}`,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-secondary)"; }}
            >
              {builderTheme === "dark" ? <Sun size={18} strokeWidth={1.8} aria-hidden /> : <Moon size={18} strokeWidth={1.8} aria-hidden />}
            </button>
            <button
              ref={cvFinderToggleRef}
              type="button"
              className="cvp-builder-cv-finder-toggle"
              aria-label={cvFinderOpen ? "Close CV search" : "Search CV"}
              aria-pressed={cvFinderOpen}
              onClick={() => {
                setCvFinderOpen((v) => !v);
              }}
              style={{
                width: 44,
                height: 44,
                minWidth: 44,
                minHeight: 44,
                padding: 0,
                border: "none",
                background: "transparent",
                color: "var(--text-primary)",
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle cx="10.5" cy="10.5" r="6.75" stroke="currentColor" strokeWidth="1.5" />
                <path d="M15.5 15.5L19 19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
            <button
              type="button"
              className="cvp-builder-menu-btn"
              aria-label="Open menu"
              onClick={() => setMenuDrawerOpen(true)}
              style={{
                width: 44,
                height: 44,
                minWidth: 44,
                minHeight: 44,
                padding: 0,
                border: "none",
                background: "transparent",
                color: "var(--text-secondary)",
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                <line x1="4" y1="6" x2="20" y2="6" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <line x1="4" y1="18" x2="20" y2="18" />
              </svg>
            </button>
          </div>
          {/* Mobile hides this slot: the picker wrapped onto its own header
              row there (a third stacked band before the first input) — it
              lives in the CVPassport/Import band instead. */}
          <div className="cvp-topbar-template-slot" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <TemplateSelect
              templates={TEMPLATES}
              value={selectedTemplate}
              onChange={(t) => setSelectedTemplate(t)}
            />
            {/* Top-bar Save + Download CV buttons removed — the sticky
                BuilderActionBar at viewport bottom now owns both. Same
                handleSave / handleDownload, same Supabase write path,
                same SynthesisOverlay + PDF flow. */}
          </div>
        </div>
        {cvJourneyChrome ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: 6,
              padding: "8px 16px 10px",
              borderTop: "1px solid var(--border)",
              boxSizing: "border-box",
            }}
            aria-label="CV completion steps"
          >
            {["Template", "ATS", "Cover Letter", "Download"].map((label, i) => {
              const n = i + 1;
              const on = n === journeyStepActive;
              return (
                <Fragment key={label}>
                  {i > 0 ? (
                    <span style={{ color: "var(--border-strong)", fontSize: 10, userSelect: "none" }} aria-hidden>
                      →
                    </span>
                  ) : null}
                  <span style={{ fontSize: 10, fontWeight: on ? 700 : 500, color: on ? "var(--text-primary)" : "var(--text-muted)" }}>{label}</span>
                </Fragment>
              );
            })}
          </div>
        ) : null}
        <div
          ref={cvFinderPanelRef}
          style={{
            overflow: "hidden",
            maxHeight: cvFinderOpen ? 320 : 0,
            opacity: cvFinderOpen ? 1 : 0,
            pointerEvents: cvFinderOpen ? "auto" : "none",
            transition: `max-height 200ms ${EASE}, opacity 200ms ${EASE}`,
            boxSizing: "border-box",
          }}
        >
          <div style={{ padding: "10px 24px 14px", display: "grid", gap: 8 }}>
            <input
              ref={cvFinderInputRef}
              className="cvp-cv-finder-input"
              value={cvFinderQuery}
              onChange={(e) => setCvFinderQuery(e.target.value)}
              placeholder="Find in your CV..."
              aria-label="Find in your CV"
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "10px 14px",
                borderRadius: 10,
                border: "1px solid var(--border)",
                background: "var(--bg-elevated)",
                color: "var(--text-primary)",
                fontSize: 14,
                outline: "none",
              }}
            />
            {cvFinderQuery.trim() ? (
              <>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {cvFinderMatches.length} match{cvFinderMatches.length === 1 ? "" : "es"} found
                </div>
                <div
                  style={{
                    maxHeight: 240,
                    overflowY: "auto",
                    WebkitOverflowScrolling: "touch",
                    display: "grid",
                    gap: 4,
                  }}
                >
                  {cvFinderMatches.map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => onCvFinderResultActivate(m.sectionId)}
                      style={{
                        textAlign: "left",
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: "1px solid var(--border)",
                        background: "var(--bg-surface)",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginBottom: 4 }}>{m.sectionLabel}</div>
                      <div style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.35 }}>
                        <HighlightedSnippet text={m.text} query={cvFinderQuery} />
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </header>

      <div
        style={{
          display: "flex",
          flexDirection: isMobile ? "column" : "row",
          flex: 1,
          minHeight: 0,
          width: "100%",
          overflowX: "hidden",
          ...(!isMobile ? { minHeight: 'calc(100vh - 56px)', height: 'auto', overflow: 'hidden' } : {}),
        }}
      >
      {/* Canonical offscreen render — measured by the print simulation and
          captured verbatim by the PDF export, in both view modes. */}
      {docMeasureNode}

      {/* Desktop: split 380px | 1fr from 768px up — layout in index.css */}
      {!isMobile ? (
      <div className={`cvp-builder-desktop cvp-builder-mode desktop-preview-panel${builderTab === 'jobmatch' ? ' cvp-jobmatch-active' : ''}${builderTab === 'templates' ? ' cvp-templates-active' : ''}`} style={{ minHeight: 'calc(100vh - 56px)', height: 'auto', opacity: downloadState.status !== 'idle' ? 0 : 1, pointerEvents: downloadState.status !== 'idle' ? 'none' : 'auto', transition: 'opacity 0.3s ease' }}>
        {/* Left panel — Editor */}
        <aside
          className="cvp-builder-left"
          style={{ width: "100%", minWidth: 0, alignSelf: "start" }}
        >
          {builderTab === "content" && showArrivalHero ? (
            <BuilderArrivalHero onImported={handleCvImported} onManual={() => setManualStart(true)} />
          ) : null}
          {builderTab === "content" && !showArrivalHero && (
            <>
              <AtsFixesPanel
                gaps={atsGaps}
                resume={resume}
                templateIsAtsSafe={templateIsAtsSafe}
                atsRecommendation={atsRecommendation}
                onGoto={gotoAtsTarget}
                onMergeSkills={handleMergeSkills}
              />
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  flexWrap: "wrap",
                  padding: "16px 0 12px",
                  borderBottom: "1px solid var(--border)",
                  marginBottom: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <BrandLockup />
                  {savedBadgeLabel ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--success)", opacity: 0.85 }}>
                      <span style={{ width: 6, height: 6, background: "var(--success)", borderRadius: "50%", flexShrink: 0 }} aria-hidden />
                      {savedBadgeLabel}
                    </span>
                  ) : null}
                </div>
                <BuilderCvImport variant="header-button" onImported={handleCvImported} />
                {/* 1pg / 2pg toggle removed — page count stays at the
                    pdfTargetPages default; expose later via Settings if
                    needed. State preserved for the PDF generation path. */}
              </div>

              <CompletionStrip
                progress={cvCompletionProgress}
                resume={resume}
                onDownload={handleDownload}
                onOpenSection={setOpenSection}
                onNudgeAction={handleProgressNudgeAction}
                saveState={draftSaveState}
                savedLabel={savedBadgeLabel || ""}
                stickyTop={56}
              />

              {cvImportedFilename && !userHasEdited ? (
                <CvImportBanner
                  filename={cvImportedFilename}
                  count={cvImportedFieldCount}
                  total={CV_IMPORT_FIELD_TOTAL}
                />
              ) : null}

              {personalDetailsNudgeOpen ? (
                <PersonalDetailsNudge onDismiss={dismissPersonalDetailsNudge} />
              ) : null}

              <ContactDetailsCard resume={resume} set={set} />

              {cvJourneyChrome && !cvJourney.templateChosen ? (
                <div style={{ marginBottom: 16, padding: 14, borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg-surface)", display: "grid", gap: 10 }}>
                  <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.45 }}>Your CV is ready. Now let&apos;s make it shine.</p>
                  <button
                    type="button"
                    onClick={() => setBuilderTab("templates")}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: "none",
                      background: "var(--accent)",
                      color: "var(--accent-contrast)",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                      transition: `opacity 150ms ${EASE}`,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = "0.92";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = "1";
                    }}
                  >
                    Choose a Template →
                  </button>
                  <button
                    type="button"
                    onClick={handleDownload}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-muted)",
                      fontSize: 11,
                      textDecoration: "underline",
                      cursor: "pointer",
                      padding: 0,
                      justifySelf: "center",
                    }}
                  >
                    Skip to download
                  </button>
                </div>
              ) : null}
              {cvJourneyChrome && cvJourney.coverLetterSeen ? (
                <div style={{ marginBottom: 16, padding: 14, borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg-surface)", display: "grid", gap: 10 }}>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.4 }}>Export your CV as PDF when you&apos;re ready.</p>
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={downloadState.status === 'generating'}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: "none",
                      background: downloadState.status === 'generating' ? "var(--bg-elevated)" : "var(--accent)",
                      color: downloadState.status === 'generating' ? "var(--text-primary)" : "var(--accent-contrast)",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: downloadState.status === 'generating' ? "not-allowed" : "pointer",
                      transition: `opacity 150ms ${EASE}, background-color 150ms ${EASE}, color 150ms ${EASE}`,
                    }}
                  >
                    Download Your CV
                  </button>
                </div>
              ) : null}

              <p style={{ margin: "2px 2px 12px", fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-muted)" }}>Your CV sections</p>
              <div className="cvp-sections-list" style={{ display: "flex", flexDirection: "column" }}>
              <AccordionSection
                id="summary"
                title="Professional Summary"
                metaSubtitle={builderSectionMeta(resume, "summary")}
                isOpen={isOpen("summary")}
                onToggle={() => toggleSection("summary")}
                icon="summary"
                orderedSectionIds={orderedBuilderSectionIdList}
                onSectionReorder={reorderBuilderSection}
                activeGuideSection={fabMode === "guide" ? (GUIDE_STEPS[guideStep]?.sectionId ?? null) : null}
                {...dndProps}
              >
                <div data-cvp-highlight="summary" style={{ borderRadius: 8, padding: 2, margin: -2 }}>
                  <ProfessionalSummaryField
                    summary={resume.summary}
                    onChange={(v) => set("summary", v)}
                    saveSuccessTick={saveSuccessTick}
                    cvContext={{
                      title: resume.title,
                      targetMarket: resume.targetMarket,
                      name: resume.name,
                    }}
                    creditsRemaining={aiCreditsRemaining}
                    onAIRewriteSuccess={(remaining) => {
                      setAiCreditsRemaining(remaining);
                      if (refreshProfile) refreshProfile();
                    }}
                    onAIExhausted={() => {
                      setUpgradeFeature("builder_ai");
                      setUpgradeOpen(true);
                    }}
                  />
                </div>
              </AccordionSection>

              <AccordionSection
                id="experience"
                title="Professional Experience"
                metaSubtitle={builderSectionMeta(resume, "experience")}
                isOpen={isOpen("experience")}
                onToggle={() => toggleSection("experience")}
                icon="experience"
                orderedSectionIds={orderedBuilderSectionIdList}
                onSectionReorder={reorderBuilderSection}
                activeGuideSection={fabMode === "guide" ? (GUIDE_STEPS[guideStep]?.sectionId ?? null) : null}
                {...dndProps}
              >
                <div data-cvp-highlight="experience" style={{ display: "grid", gap: 10, borderRadius: 8, padding: 2, margin: -2 }}>
                  {resume.experience.length === 0 && (
                    <div className="cvp-ghost-card" aria-hidden="true">
                      <div className="cvp-ghost-line cvp-ghost-line--w60" />
                      <div className="cvp-ghost-line cvp-ghost-line--w80" />
                      <div className="cvp-ghost-line cvp-ghost-line--w40" />
                      <p className="cvp-ghost-card-text">No roles yet. Add your work history below.</p>
                    </div>
                  )}
                  {resume.experience.map((exp, i) => {
                    const period = buildExperiencePeriod(exp) || exp.period || "";
                    const subtitle = [exp.company, exp.location, period].filter(Boolean).join(" · ") || "—";
                    return (
                      <BuilderEntryRow
                        key={i}
                        title={exp.role || "Job title"}
                        subtitle={subtitle}
                        hint={period ? undefined : "Add dates — recruiters check them"}
                        onRowClick={() => setExperienceEditor({ mode: "edit", index: i, draft: { ...EMPTY_EXP, ...exp } })}
                        onMoveUp={() => setResume((r) => ({ ...r, experience: moveArrayItem(r.experience, i, i - 1) }))}
                        onMoveDown={() => setResume((r) => ({ ...r, experience: moveArrayItem(r.experience, i, i + 1) }))}
                        disableUp={i === 0}
                        disableDown={i >= resume.experience.length - 1}
                        onEdit={() => setExperienceEditor({ mode: "edit", index: i, draft: { ...EMPTY_EXP, ...exp } })}
                        onDelete={() => setResume((r) => ({ ...r, experience: r.experience.filter((_, j) => j !== i) }))}
                      />
                    );
                  })}
                  <button type="button" onClick={() => setExperienceEditor({ mode: "add", index: -1, draft: { ...EMPTY_EXP } })} className="cvp-add-row-ghost cvp-builder-add-entry-btn">+ Add a role</button>
                </div>
              </AccordionSection>

              <AccordionSection
                id="education"
                title="Education"
                metaSubtitle={builderSectionMeta(resume, "education")}
                isOpen={isOpen("education")}
                onToggle={() => toggleSection("education")}
                icon="education"
                orderedSectionIds={orderedBuilderSectionIdList}
                onSectionReorder={reorderBuilderSection}
                activeGuideSection={fabMode === "guide" ? (GUIDE_STEPS[guideStep]?.sectionId ?? null) : null}
                {...dndProps}
              >
                <div data-cvp-highlight="education" style={{ display: "grid", gap: 10, borderRadius: 8, padding: 2, margin: -2 }}>
                  {resume.education.length === 0 && (
                    <div className="cvp-ghost-card" aria-hidden="true">
                      <div className="cvp-ghost-line cvp-ghost-line--w60" />
                      <div className="cvp-ghost-line cvp-ghost-line--w40" />
                      <p className="cvp-ghost-card-text">No education entries yet.</p>
                    </div>
                  )}
                  {resume.education.map((edu, i) => {
                    const yearLine = buildEducationYearLine(edu) || edu.year || "";
                    const subtitle = [edu.school, edu.fieldOfStudy, yearLine].filter(Boolean).join(" · ") || "—";
                    return (
                      <BuilderEntryRow
                        key={i}
                        title={edu.degree || "Degree"}
                        subtitle={subtitle}
                        onRowClick={() => setEducationEditor({ mode: "edit", index: i, draft: { ...EMPTY_EDU, ...edu } })}
                        onMoveUp={() => setResume((r) => ({ ...r, education: moveArrayItem(r.education, i, i - 1) }))}
                        onMoveDown={() => setResume((r) => ({ ...r, education: moveArrayItem(r.education, i, i + 1) }))}
                        disableUp={i === 0}
                        disableDown={i >= resume.education.length - 1}
                        onEdit={() => setEducationEditor({ mode: "edit", index: i, draft: { ...EMPTY_EDU, ...edu } })}
                        onDelete={() => setResume((r) => ({ ...r, education: r.education.filter((_, j) => j !== i) }))}
                      />
                    );
                  })}
                  <button type="button" onClick={() => setEducationEditor({ mode: "add", index: -1, draft: { ...EMPTY_EDU } })} className="cvp-add-row-ghost cvp-builder-add-entry-btn">+ Add a qualification</button>
                </div>
              </AccordionSection>

              <OptionalBuilderAccordionSections
                resume={resume}
                setResume={setResume}
                filter={(opt) => opt.id === "certifications" && Boolean(resume.builderExtraSectionIds?.includes(opt.id))}
                certificationEditor={certificationEditor}
                setCertificationEditor={setCertificationEditor}
                isOpen={isOpen}
                toggleSection={toggleSection}
                orderedSectionIds={orderedBuilderSectionIdList}
                onSectionReorder={reorderBuilderSection}
                activeGuideSection={fabMode === "guide" ? (GUIDE_STEPS[guideStep]?.sectionId ?? null) : null}
                {...dndProps}
              />

              <AccordionSection
                id="skills"
                title="Skills"
                metaSubtitle={builderSectionMeta(resume, "skills")}
                isOpen={isOpen("skills")}
                onToggle={() => toggleSection("skills")}
                icon="skills"
                orderedSectionIds={orderedBuilderSectionIdList}
                onSectionReorder={reorderBuilderSection}
                activeGuideSection={fabMode === "guide" ? (GUIDE_STEPS[guideStep]?.sectionId ?? null) : null}
                {...dndProps}
              >
                <SkillsEditorSection
                  resume={resume}
                  setResume={setResume}
                  skillInput={skillInput}
                  setSkillInput={setSkillInput}
                  skillsPasteOpen={skillsPasteOpen}
                  setSkillsPasteOpen={setSkillsPasteOpen}
                  skillsPasteDraft={skillsPasteDraft}
                  setSkillsPasteDraft={setSkillsPasteDraft}
                  jobTitle={resume.title}
                />
                {!technicalSkillsHasAnyChip(resume) ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      padding: "12px 14px",
                      marginTop: 10,
                      borderRadius: 12,
                      border: "1px dashed var(--border-strong)",
                      background: "var(--bg)",
                      boxSizing: "border-box",
                    }}
                  >
                    <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.35, flex: 1, minWidth: 0 }}>Have technical or IT skills? Add a Technical Skills section</p>
                    <button
                      type="button"
                      onClick={() => {
                        setTechnicalSkillsFromPrompt(true);
                        setOpenSection("technicalSkills");
                      }}
                      style={{
                        flexShrink: 0,
                        padding: "6px 12px",
                        borderRadius: 8,
                        border: "1px solid var(--border)",
                        background: "var(--bg-elevated)",
                        color: "var(--text-primary)",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: `border-color 150ms ${EASE}, background-color 150ms ${EASE}`,
                      }}
                    >
                      + Add
                    </button>
                  </div>
                ) : null}
                {technicalSkillsFromPrompt && !technicalSkillsHasAnyChip(resume) ? (
                  <div style={{ marginTop: 12, borderRadius: 8, padding: 2, marginLeft: -2, marginRight: -2 }}>
                    <TechnicalSkillsEditor resume={resume} setResume={setResume} jobTitle={resume.title} />
                  </div>
                ) : null}
              </AccordionSection>

              {technicalSkillsHasAnyChip(resume) ? (
                <AccordionSection
                  id="technicalSkills"
                  title="Technical Skills"
                  metaSubtitle={builderSectionMeta(resume, "technicalSkills")}
                  isOpen={isOpen("technicalSkills")}
                  onToggle={() => toggleSection("technicalSkills")}
                  icon="skills"
                  orderedSectionIds={orderedBuilderSectionIdList}
                  onSectionReorder={reorderBuilderSection}
                  activeGuideSection={fabMode === "guide" ? (GUIDE_STEPS[guideStep]?.sectionId ?? null) : null}
                  {...dndProps}
                >
                  <div style={{ borderRadius: 8, padding: 2, margin: -2 }}>
                    <TechnicalSkillsEditor resume={resume} setResume={setResume} jobTitle={resume.title} />
                  </div>
                </AccordionSection>
              ) : null}

              <AccordionSection
                id="languages"
                title="Languages"
                metaSubtitle={builderSectionMeta(resume, "languages")}
                isOpen={isOpen("languages")}
                onToggle={() => toggleSection("languages")}
                icon="languages"
                orderedSectionIds={orderedBuilderSectionIdList}
                onSectionReorder={reorderBuilderSection}
                activeGuideSection={fabMode === "guide" ? (GUIDE_STEPS[guideStep]?.sectionId ?? null) : null}
                {...dndProps}
              >
                <div data-cvp-highlight="languages" style={{ display: "grid", gap: 12, borderRadius: 8, padding: 2, margin: -2 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {splitCommaItems(resume.languages).map((lg, li) => (
                      <span key={`${lg}-${li}`} style={CB_UI.chip}>
                        {lg}
                        <button type="button" aria-label={`Remove ${lg}`} onClick={() => setResume(r => ({ ...r, languages: splitCommaItems(r.languages).filter((x) => x !== lg).join(", ") }))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 0, lineHeight: 1 }} onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-secondary)"; }}>×</button>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <input className="cvp-input" style={{ flex: 1, minWidth: 0 }} placeholder='e.g. English (Fluent)' value={langInput} onChange={e => setLangInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const t = langInput.trim(); if (!t) return; const cur = splitCommaItems(resume.languages); if (cur.includes(t)) return; setResume(r => ({ ...r, languages: [...cur, t].join(", ") })); setLangInput(""); } }} />
                    <button type="button" style={{ ...CB_UI.btn }} onClick={() => { const t = langInput.trim(); if (!t) return; const cur = splitCommaItems(resume.languages); if (cur.includes(t)) return; setResume(r => ({ ...r, languages: [...cur, t].join(", ") })); setLangInput(""); }}>+ Add</button>
                  </div>
                </div>
              </AccordionSection>

              <OptionalBuilderAccordionSections
                resume={resume}
                setResume={setResume}
                filter={(opt) => opt.id === "personalDetails" || (opt.id !== "certifications" && Boolean(resume.builderExtraSectionIds?.includes(opt.id)))}
                certificationEditor={certificationEditor}
                setCertificationEditor={setCertificationEditor}
                isOpen={isOpen}
                toggleSection={toggleSection}
                orderedSectionIds={orderedBuilderSectionIdList}
                onSectionReorder={reorderBuilderSection}
                activeGuideSection={fabMode === "guide" ? (GUIDE_STEPS[guideStep]?.sectionId ?? null) : null}
                {...dndProps}
              />
              </div>

              {builderTab === "content" && (
                <AddSectionChips resume={resume} setResume={setResume} setOpenSection={setOpenSection} onTechnicalSkills={() => { setTechnicalSkillsFromPrompt(true); setOpenSection("technicalSkills"); }} />
              )}
            </>
          )}
          {builderTab === "templates" ? (
            <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden", width: "100%" }}>
              {templatesPanel}
            </div>
          ) : null}
          {builderTab === "jobmatch" && (
            <JobMatch
              resume={resume}
              selectedTemplate={selectedTemplate}
              isPro={isPro}
              features={profile?.features}
              onJobDescriptionChange={setJobHasJd}
              handleDownload={handleDownload}
              downloadState={downloadState}
              onNavigateToContent={() => setBuilderTab("content")}
              onAddSkill={addSkillFromMatch}
              onRemoveSkill={removeSkillFromMatch}
            />
          )}
          {builderTab === "coverletter" && guideCoverLetterPreview}
        </aside>

        {/* Right panel — paginated document preview (true A4 sheets, same
            layout pass as the PDF export; zoom + page indicator). */}
        <div className="cvp-builder-preview">
          <div className="dp-panel-holder">
            <DocumentSheets
              doc={previewDoc}
              pulse={previewPulse}
              mode="panel"
              reduce={prefersReducedMotion}
              resetScrollKey={(previewTemplateOverride ?? selectedTemplate)?.id}
            />
          </div>
        </div>
      </div>
      ) : null}

      {/* Mobile: single column (default until viewport is at least 768px) */}
      <div
        className="cvp-builder-mobile cvp-builder-mode"
        style={{
          display: isMobile ? "flex" : "none",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          width: "100%",
          position: "relative",
          maxWidth: "100%",
          overflowX: "hidden",
          overflowY: "visible",
          opacity: downloadState.status !== 'idle' ? 0 : 1,
          pointerEvents: downloadState.status !== 'idle' ? 'none' : 'auto',
          transition: 'opacity 0.3s ease',
        }}
      >
          <div className={`cvp-builder-mobile-form${builderTab === "templates" ? " cvp-builder-mobile-form--templates" : ""}`}>
            {builderTab === "content" && showArrivalHero ? (
              <BuilderArrivalHero onImported={handleCvImported} onManual={() => setManualStart(true)} />
            ) : null}
            {builderTab === "content" && !showArrivalHero && (
              <>
                <AtsFixesPanel
                  gaps={atsGaps}
                  resume={resume}
                  templateIsAtsSafe={templateIsAtsSafe}
                  atsRecommendation={atsRecommendation}
                  onGoto={gotoAtsTarget}
                  onMergeSkills={handleMergeSkills}
                />
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    flexWrap: "wrap",
                    padding: "6px 12px 6px",
                    borderBottom: "1px solid var(--border)",
                    marginBottom: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <BrandLockup />
                    {savedBadgeLabel ? (
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--success)", opacity: 0.85 }}>
                        <span style={{ width: 6, height: 6, background: "var(--success)", borderRadius: "50%", flexShrink: 0 }} aria-hidden />
                        {savedBadgeLabel}
                      </span>
                    ) : null}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    {/* Template picker lives HERE on mobile (one band, not
                        its own header row above the content). */}
                    <TemplateSelect
                      templates={TEMPLATES}
                      value={selectedTemplate}
                      onChange={(t) => setSelectedTemplate(t)}
                    />
                    <BuilderCvImport variant="header-button" onImported={handleCvImported} />
                  </div>
                  {/* 1pg / 2pg toggle removed — see desktop layout note above. */}
                </div>
                <CompletionStrip
                  progress={cvCompletionProgress}
                  resume={resume}
                  onDownload={handleDownload}
                  onOpenSection={setOpenSection}
                  onNudgeAction={handleProgressNudgeAction}
                  saveState={draftSaveState}
                  savedLabel={savedBadgeLabel || ""}
                  stickyTop={0}
                />
                {cvImportedFilename && !userHasEdited ? (
                  <CvImportBanner
                    filename={cvImportedFilename}
                    count={cvImportedFieldCount}
                    total={CV_IMPORT_FIELD_TOTAL}
                  />
                ) : null}
                {personalDetailsNudgeOpen ? (
                  <PersonalDetailsNudge onDismiss={dismissPersonalDetailsNudge} />
                ) : null}
                <ContactDetailsCard resume={resume} set={set} />
                {cvJourneyChrome && !cvJourney.templateChosen ? (
                  <div style={{ margin: "0 12px 12px", padding: 14, borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg-surface)", display: "grid", gap: 10 }}>
                    <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.45 }}>Your CV is ready. Now let&apos;s make it shine.</p>
                    <button
                      type="button"
                      onClick={() => setBuilderTab("templates")}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 8,
                        border: "none",
                        background: "var(--accent)",
                        color: "var(--accent-contrast)",
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: `opacity 150ms ${EASE}`,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = "0.92";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = "1";
                      }}
                    >
                      Choose a Template →
                    </button>
                    <button
                      type="button"
                      onClick={handleDownload}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--text-muted)",
                        fontSize: 11,
                        textDecoration: "underline",
                        cursor: "pointer",
                        padding: 0,
                        justifySelf: "center",
                      }}
                    >
                      Skip to download
                    </button>
                  </div>
                ) : null}
                {cvJourneyChrome && cvJourney.coverLetterSeen ? (
                  <div style={{ margin: "0 12px 12px", padding: 14, borderRadius: 12, border: "1px solid var(--border)", background: "var(--bg-surface)", display: "grid", gap: 10 }}>
                    <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.4 }}>Export your CV as PDF when you&apos;re ready.</p>
                    <button
                      type="button"
                      onClick={handleDownload}
                      disabled={downloadState.status === 'generating'}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 8,
                        border: "none",
                        background: downloadState.status === 'generating' ? "var(--bg-elevated)" : "var(--accent)",
                        color: downloadState.status === 'generating' ? "var(--text-primary)" : "var(--accent-contrast)",
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: downloadState.status === 'generating' ? "not-allowed" : "pointer",
                        transition: `opacity 150ms ${EASE}, background-color 150ms ${EASE}, color 150ms ${EASE}`,
                      }}
                    >
                      Download Your CV
                    </button>
                  </div>
                ) : null}
                <p style={{ margin: "2px 2px 10px", fontSize: 12, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--text-muted)" }}>Your CV sections</p>
                <div className="cvp-mobile-section-rows" style={{ display: "flex", flexDirection: "column", maxWidth: "100%" }}>
              <AccordionSection
                variant="mobileRow"
                id="summary"
                title="Professional Summary"
                metaSubtitle={builderSectionMeta(resume, "summary")}
                isOpen={isOpen("summary")}
                onToggle={() => toggleSection("summary")}
                icon="summary"
                orderedSectionIds={orderedBuilderSectionIdList}
                onSectionReorder={reorderBuilderSection}
                activeGuideSection={fabMode === "guide" ? (GUIDE_STEPS[guideStep]?.sectionId ?? null) : null}
                {...dndProps}
              >
                <div data-cvp-highlight="summary" style={{ borderRadius: 8, padding: 2, margin: -2 }}>
                  <ProfessionalSummaryField
                    summary={resume.summary}
                    onChange={(v) => set("summary", v)}
                    saveSuccessTick={saveSuccessTick}
                    cvContext={{
                      title: resume.title,
                      targetMarket: resume.targetMarket,
                      name: resume.name,
                    }}
                    creditsRemaining={aiCreditsRemaining}
                    onAIRewriteSuccess={(remaining) => {
                      setAiCreditsRemaining(remaining);
                      if (refreshProfile) refreshProfile();
                    }}
                    onAIExhausted={() => {
                      setUpgradeFeature("builder_ai");
                      setUpgradeOpen(true);
                    }}
                  />
                </div>
              </AccordionSection>

              <AccordionSection
                variant="mobileRow"
                id="experience"
                title="Professional Experience"
                metaSubtitle={builderSectionMeta(resume, "experience")}
                isOpen={isOpen("experience")}
                onToggle={() => toggleSection("experience")}
                icon="experience"
                orderedSectionIds={orderedBuilderSectionIdList}
                onSectionReorder={reorderBuilderSection}
                activeGuideSection={fabMode === "guide" ? (GUIDE_STEPS[guideStep]?.sectionId ?? null) : null}
                {...dndProps}
              >
                <div data-cvp-highlight="experience" style={{ display: "grid", gap: 10, borderRadius: 8, padding: 2, margin: -2 }}>
                  {resume.experience.length === 0 && (
                    <div className="cvp-ghost-card" aria-hidden="true">
                      <div className="cvp-ghost-line cvp-ghost-line--w60" />
                      <div className="cvp-ghost-line cvp-ghost-line--w80" />
                      <div className="cvp-ghost-line cvp-ghost-line--w40" />
                      <p className="cvp-ghost-card-text">No roles yet. Add your work history below.</p>
                    </div>
                  )}
                  {resume.experience.map((exp, i) => {
                    const period = buildExperiencePeriod(exp) || exp.period || "";
                    const subtitle = [exp.company, exp.location, period].filter(Boolean).join(" · ") || "—";
                    return (
                      <BuilderEntryRow
                        key={i}
                        title={exp.role || "Job title"}
                        subtitle={subtitle}
                        hint={period ? undefined : "Add dates — recruiters check them"}
                        onRowClick={() => setExperienceEditor({ mode: "edit", index: i, draft: { ...EMPTY_EXP, ...exp } })}
                        onMoveUp={() => setResume((r) => ({ ...r, experience: moveArrayItem(r.experience, i, i - 1) }))}
                        onMoveDown={() => setResume((r) => ({ ...r, experience: moveArrayItem(r.experience, i, i + 1) }))}
                        disableUp={i === 0}
                        disableDown={i >= resume.experience.length - 1}
                        onEdit={() => setExperienceEditor({ mode: "edit", index: i, draft: { ...EMPTY_EXP, ...exp } })}
                        onDelete={() => setResume((r) => ({ ...r, experience: r.experience.filter((_, j) => j !== i) }))}
                      />
                    );
                  })}
                  <button type="button" onClick={() => setExperienceEditor({ mode: "add", index: -1, draft: { ...EMPTY_EXP } })} className="cvp-add-row-ghost cvp-builder-add-entry-btn">+ Add a role</button>
                </div>
              </AccordionSection>

              <AccordionSection
                variant="mobileRow"
                id="education"
                title="Education"
                metaSubtitle={builderSectionMeta(resume, "education")}
                isOpen={isOpen("education")}
                onToggle={() => toggleSection("education")}
                icon="education"
                orderedSectionIds={orderedBuilderSectionIdList}
                onSectionReorder={reorderBuilderSection}
                activeGuideSection={fabMode === "guide" ? (GUIDE_STEPS[guideStep]?.sectionId ?? null) : null}
                {...dndProps}
              >
                <div data-cvp-highlight="education" style={{ display: "grid", gap: 10, borderRadius: 8, padding: 2, margin: -2 }}>
                  {resume.education.length === 0 && (
                    <div className="cvp-ghost-card" aria-hidden="true">
                      <div className="cvp-ghost-line cvp-ghost-line--w60" />
                      <div className="cvp-ghost-line cvp-ghost-line--w40" />
                      <p className="cvp-ghost-card-text">No education entries yet.</p>
                    </div>
                  )}
                  {resume.education.map((edu, i) => {
                    const yearLine = buildEducationYearLine(edu) || edu.year || "";
                    const subtitle = [edu.school, edu.fieldOfStudy, yearLine].filter(Boolean).join(" · ") || "—";
                    return (
                      <BuilderEntryRow
                        key={i}
                        title={edu.degree || "Degree"}
                        subtitle={subtitle}
                        onRowClick={() => setEducationEditor({ mode: "edit", index: i, draft: { ...EMPTY_EDU, ...edu } })}
                        onMoveUp={() => setResume((r) => ({ ...r, education: moveArrayItem(r.education, i, i - 1) }))}
                        onMoveDown={() => setResume((r) => ({ ...r, education: moveArrayItem(r.education, i, i + 1) }))}
                        disableUp={i === 0}
                        disableDown={i >= resume.education.length - 1}
                        onEdit={() => setEducationEditor({ mode: "edit", index: i, draft: { ...EMPTY_EDU, ...edu } })}
                        onDelete={() => setResume((r) => ({ ...r, education: r.education.filter((_, j) => j !== i) }))}
                      />
                    );
                  })}
                  <button type="button" onClick={() => setEducationEditor({ mode: "add", index: -1, draft: { ...EMPTY_EDU } })} className="cvp-add-row-ghost cvp-builder-add-entry-btn">+ Add a qualification</button>
                </div>
              </AccordionSection>

              <OptionalBuilderAccordionSections
                resume={resume}
                setResume={setResume}
                filter={(opt) => opt.id === "certifications" && Boolean(resume.builderExtraSectionIds?.includes(opt.id))}
                certificationEditor={certificationEditor}
                setCertificationEditor={setCertificationEditor}
                isOpen={isOpen}
                toggleSection={toggleSection}
                variant="mobileRow"
                orderedSectionIds={orderedBuilderSectionIdList}
                onSectionReorder={reorderBuilderSection}
                activeGuideSection={fabMode === "guide" ? (GUIDE_STEPS[guideStep]?.sectionId ?? null) : null}
                {...dndProps}
              />

              <AccordionSection
                variant="mobileRow"
                id="skills"
                title="Skills"
                metaSubtitle={builderSectionMeta(resume, "skills")}
                isOpen={isOpen("skills")}
                onToggle={() => toggleSection("skills")}
                icon="skills"
                orderedSectionIds={orderedBuilderSectionIdList}
                onSectionReorder={reorderBuilderSection}
                activeGuideSection={fabMode === "guide" ? (GUIDE_STEPS[guideStep]?.sectionId ?? null) : null}
                {...dndProps}
              >
                <SkillsEditorSection
                  resume={resume}
                  setResume={setResume}
                  skillInput={skillInput}
                  setSkillInput={setSkillInput}
                  skillsPasteOpen={skillsPasteOpen}
                  setSkillsPasteOpen={setSkillsPasteOpen}
                  skillsPasteDraft={skillsPasteDraft}
                  setSkillsPasteDraft={setSkillsPasteDraft}
                  jobTitle={resume.title}
                />
                {!technicalSkillsHasAnyChip(resume) ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 10,
                      padding: "12px 14px",
                      marginTop: 10,
                      borderRadius: 12,
                      border: "1px dashed var(--border-strong)",
                      background: "var(--bg)",
                      boxSizing: "border-box",
                    }}
                  >
                    <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.35, flex: 1, minWidth: 0 }}>Have technical or IT skills? Add a Technical Skills section</p>
                    <button
                      type="button"
                      onClick={() => {
                        setTechnicalSkillsFromPrompt(true);
                        setOpenSection("technicalSkills");
                      }}
                      style={{
                        flexShrink: 0,
                        padding: "6px 12px",
                        borderRadius: 8,
                        border: "1px solid var(--border)",
                        background: "var(--bg-elevated)",
                        color: "var(--text-primary)",
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: "pointer",
                        transition: `border-color 150ms ${EASE}, background-color 150ms ${EASE}`,
                      }}
                    >
                      + Add
                    </button>
                  </div>
                ) : null}
                {technicalSkillsFromPrompt && !technicalSkillsHasAnyChip(resume) ? (
                  <div style={{ marginTop: 12, borderRadius: 8, padding: 2, marginLeft: -2, marginRight: -2 }}>
                    <TechnicalSkillsEditor resume={resume} setResume={setResume} jobTitle={resume.title} />
                  </div>
                ) : null}
              </AccordionSection>

              {technicalSkillsHasAnyChip(resume) ? (
                <AccordionSection
                  variant="mobileRow"
                  id="technicalSkills"
                  title="Technical Skills"
                  metaSubtitle={builderSectionMeta(resume, "technicalSkills")}
                  isOpen={isOpen("technicalSkills")}
                  onToggle={() => toggleSection("technicalSkills")}
                  icon="skills"
                  orderedSectionIds={orderedBuilderSectionIdList}
                  onSectionReorder={reorderBuilderSection}
                  activeGuideSection={fabMode === "guide" ? (GUIDE_STEPS[guideStep]?.sectionId ?? null) : null}
                  {...dndProps}
                >
                  <div style={{ borderRadius: 8, padding: 2, margin: -2 }}>
                    <TechnicalSkillsEditor resume={resume} setResume={setResume} jobTitle={resume.title} />
                  </div>
                </AccordionSection>
              ) : null}

              <AccordionSection
                variant="mobileRow"
                id="languages"
                title="Languages"
                metaSubtitle={builderSectionMeta(resume, "languages")}
                isOpen={isOpen("languages")}
                onToggle={() => toggleSection("languages")}
                icon="languages"
                orderedSectionIds={orderedBuilderSectionIdList}
                onSectionReorder={reorderBuilderSection}
                activeGuideSection={fabMode === "guide" ? (GUIDE_STEPS[guideStep]?.sectionId ?? null) : null}
                {...dndProps}
              >
                <div data-cvp-highlight="languages" style={{ display: "grid", gap: 12, borderRadius: 8, padding: 2, margin: -2 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {splitCommaItems(resume.languages).map((lg, li) => (
                      <span key={`${lg}-${li}`} style={CB_UI.chip}>
                        {lg}
                        <button type="button" aria-label={`Remove ${lg}`} onClick={() => setResume(r => ({ ...r, languages: splitCommaItems(r.languages).filter((x) => x !== lg).join(", ") }))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 0, lineHeight: 1 }} onMouseEnter={(e) => { e.currentTarget.style.color = "var(--text-primary)"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-secondary)"; }}>×</button>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <input className="cvp-input" style={{ flex: 1, minWidth: 0 }} placeholder='e.g. English (Fluent)' value={langInput} onChange={e => setLangInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const t = langInput.trim(); if (!t) return; const cur = splitCommaItems(resume.languages); if (cur.includes(t)) return; setResume(r => ({ ...r, languages: [...cur, t].join(", ") })); setLangInput(""); } }} />
                    <button type="button" style={{ ...CB_UI.btn }} onClick={() => { const t = langInput.trim(); if (!t) return; const cur = splitCommaItems(resume.languages); if (cur.includes(t)) return; setResume(r => ({ ...r, languages: [...cur, t].join(", ") })); setLangInput(""); }}>+ Add</button>
                  </div>
                </div>
              </AccordionSection>

              <OptionalBuilderAccordionSections
                resume={resume}
                setResume={setResume}
                filter={(opt) => opt.id === "personalDetails" || (opt.id !== "certifications" && Boolean(resume.builderExtraSectionIds?.includes(opt.id)))}
                certificationEditor={certificationEditor}
                setCertificationEditor={setCertificationEditor}
                isOpen={isOpen}
                toggleSection={toggleSection}
                variant="mobileRow"
                orderedSectionIds={orderedBuilderSectionIdList}
                onSectionReorder={reorderBuilderSection}
                activeGuideSection={fabMode === "guide" ? (GUIDE_STEPS[guideStep]?.sectionId ?? null) : null}
                {...dndProps}
              />
                </div>
                {builderTab === "content" && (
                  <AddSectionChips resume={resume} setResume={setResume} setOpenSection={setOpenSection} onTechnicalSkills={() => { setTechnicalSkillsFromPrompt(true); setOpenSection("technicalSkills"); }} />
                )}
              </>
            )}
            {builderTab === "templates" ? (
            <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden", width: "100%" }}>
              {templatesPanel}
            </div>
          ) : null}
            {builderTab === "ats" && (
              <div style={{ minHeight: 400 }}>
                <ATSChecker
                  resume={resume}
                  isPro={isPro}
                  handleDownload={handleDownload}
                  downloadState={downloadState}
                  onNavigateToContent={() => setBuilderTab("content")}
                />
              </div>
            )}
            {builderTab === "jobmatch" && (
              <div style={{ padding: "0 12px 12px" }}>
                <JobMatch
                  resume={resume}
                  selectedTemplate={selectedTemplate}
                  isPro={isPro}
                  features={profile?.features}
                  onJobDescriptionChange={setJobHasJd}
                  handleDownload={handleDownload}
                  downloadState={downloadState}
                  onNavigateToContent={() => setBuilderTab("content")}
                  onAddSkill={addSkillFromMatch}
                  onRemoveSkill={removeSkillFromMatch}
                />
              </div>
            )}
            {builderTab === "coverletter" && guideCoverLetterPreview}
            {/* Mobile bottom download row removed — sticky
                BuilderActionBar handles Export PDF on mobile too. */}
            {showSavedBridge ? (
              <div
                role="status"
                aria-live="polite"
                style={{
                  position: "fixed",
                  right: 20,
                  bottom: "calc(env(safe-area-inset-bottom, 0px) + 148px)",
                  zIndex: 60,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 14px",
                  background: "var(--bg)",
                  border: "0.5px solid var(--border)",
                  borderRadius: 999,
                  color: "var(--text-primary)",
                  fontSize: 12,
                  fontWeight: 500,
                  letterSpacing: "0.01em",
                  boxShadow: "0 8px 24px rgba(0, 0, 0, 0.6)",
                  pointerEvents: "none",
                  animation: "fabSavedPop 2400ms cubic-bezier(0.4, 0, 0.2, 1) forwards",
                  WebkitFontSmoothing: "antialiased",
                  MozOsxFontSmoothing: "grayscale",
                  transform: "translate3d(0,0,0)",
                  WebkitBackfaceVisibility: "hidden",
                  backfaceVisibility: "hidden",
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                  <path d="M5 13l4 4L19 7" style={{ stroke: "var(--success)" }} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Progress Auto-Saved</span>
              </div>
            ) : null}
            <div style={{ display: fabSheet === "preview" ? "none" : "block" }}>
              <FAB
                ref={fabRef}
                variant="builder"
                activeSection={activeSection}
                tabKey={builderTab}
                atsScore={score}
                setResume={setResume}
                guidedCoachRequestKey={guidedCoachRequestKey}
                contextualSection={contextualSection}
                onGuidedDownload={handleDownload}
                onGuidedOpenPreview={() => {
                  setPreviewTemplateOverride(null);
                  setFabSheet("preview");
                }}
                onGuidedSwitchToTemplatesTab={() => setBuilderTab("templates")}
                onGuidedSwitchToAtsTab={() => setBuilderTab("templates")}
                selectedTemplateId={selectedTemplate?.id}
                resume={resume}
                templatePickPending={templatePickPending}
                templatesInteractKey={templatesInteractKey}
                templateSessionApplyCount={templateSessionApplyCount}
                templateRecommendNames={templateFabRecommendNames}
                onBuilderGuideSheetOpenChange={onBuilderGuideSheetOpenChange}
                onPreviewTemplateDraft={(tpl) => {
                  setPreviewTemplateOverride(tpl);
                  setFabSheet("preview");
                }}
                onApplyTemplateDraft={(tpl) => {
                  setSelectedTemplate(tpl);
                  setBuilderTab("content");
                  setTemplatePickPending(null);
                  setTemplateConfirmOpen(false);
                  setTemplateSessionApplyCount((c) => c + 1);
                  setCvJourney((j) => ({ ...j, templateChosen: true }));
                }}
                onClearTemplatePick={() => {
                  setTemplatePickPending(null);
                  setTemplateConfirmOpen(false);
                }}
                onNavigateToCvSection={(navKey) => {
                  setBuilderTab("content");
                  if (navKey === "personal") {
                    requestAnimationFrame(() => {
                      document.querySelector(".cvp-builder-personal-card")?.scrollIntoView({ behavior: "smooth", block: "start" });
                    });
                  } else {
                    setOpenSection(navKey);
                  }
                }}
                sheetZOverlay={299}
                sheetZSheet={300}
                onOpenCvPreview={() => {
                  setPreviewTemplateOverride(null);
                  setFabSheet("preview");
                }}
                onOpenTemplatePreview={() => {
                  setPreviewTemplateOverride(null);
                  setFabSheet("preview");
                }}
                onNavigateToProAts={navigateToProAtsPage}
                onNavigateToJobMatch={() => setBuilderTab("jobmatch")}
                onNavigateToCoverLetter={() => {
                  writeFabMemory({ hasVisitedCoverLetter: true });
                  runCoverLetterJourneyStep();
                }}
                cvCompletionProgress={cvCompletionProgress}
                fabMode={fabMode}
                guideStep={guideStep}
                currentGuideStep={GUIDE_STEPS[guideStep]}
                activeGuideSection={GUIDE_STEPS[guideStep]?.sectionId ?? null}
                advanceGuideStep={advanceGuideStep}
                retreatGuideStep={retreatGuideStep}
                features={profile?.features}
                isPro={isPro}
                onPostPaymentCoverLetter={onPostPaymentCoverLetter}
                onNavigateToTab={onNavigateToTab}
                navigationSource={navigationSource}
                scanStatus={scanStatus}
              />
            </div>
          </div>

        {/* ONE floating control: the FAB (progress ring + preview action).
            The separate Preview pill doubled it and crowded the bottom. */}
        {fabSheet === "preview" ? (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 100,
              width: "100%",
              height: "100dvh",
              maxHeight: "100dvh",
              background: "var(--bg)",
              opacity: 1,
              transform: previewFadeOut ? "translateY(100%)" : "translateY(0%)",
              transition: "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
              display: "flex",
              flexDirection: "column",
              boxSizing: "border-box",
            }}
          >
            <button
              type="button"
              onClick={closePreview}
              aria-label="Close preview"
              style={{
                position: "fixed",
                top: "calc(8px + env(safe-area-inset-top, 0px))",
                right: 12,
                background: "var(--bg-surface, var(--bg-surface))",
                border: "1px solid var(--border-default, var(--border))",
                borderRadius: "50%",
                width: 44,
                height: 44,
                minHeight: 44,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--text-primary, var(--text-primary))",
                fontSize: 18,
                zIndex: 101,
                cursor: "pointer",
                padding: 0,
              }}
            >
              ✕
            </button>
            {/* Full-fidelity paginated document: fit-to-width A4 sheets,
                pinch + double-tap zoom, page indicator, long-press a
                section to jump to its form card. */}
            <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
              <DocumentSheets
                doc={previewDoc}
                pulse={previewPulse}
                mode="overlay"
                reduce={prefersReducedMotion}
                resetScrollKey={(previewTemplateOverride ?? selectedTemplate)?.id}
                onSectionHold={handleSectionHold}
              />
            </div>
            {pendingSection ? (
              <div
                style={{
                  position: "fixed",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  zIndex: 102,
                  padding: "16px",
                  paddingBottom: "32px",
                  background: "linear-gradient(to top, var(--bg) 60%, transparent)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "10px",
                }}
              >
                <div
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border)",
                    borderRadius: "16px",
                    padding: "16px 20px",
                    width: "100%",
                    maxWidth: "320px",
                    textAlign: "center",
                  }}
                >
                  <p
                    style={{
                      fontSize: "13px",
                      color: "var(--text-secondary)",
                      marginBottom: "4px",
                    }}
                  >
                    ✦ {sectionLabels[pendingSection] || pendingSection}
                  </p>
                  <p
                    style={{
                      fontSize: "15px",
                      color: "var(--text-primary)",
                      fontWeight: "500",
                      marginBottom: "14px",
                    }}
                  >
                    Edit this section?
                  </p>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      style={{
                        flex: 1,
                        padding: "10px",
                        borderRadius: "12px",
                        border: "1px solid var(--border)",
                        background: "transparent",
                        color: "var(--text-secondary)",
                        fontSize: "14px",
                        cursor: "pointer",
                      }}
                    >
                      No
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmEdit}
                      style={{
                        flex: 1,
                        padding: "10px",
                        borderRadius: "12px",
                        border: "none",
                        background: "var(--accent)",
                        color: "var(--accent-contrast)",
                        fontSize: "14px",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      Yes
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {tabTransitioning && transitingToTab && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 500,
              background: "rgba(10,10,10,0.92)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              animation: "fabFadeIn 0.2s ease",
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                border: "2px solid var(--border)",
                borderTop: "2px solid var(--color-accent-bright)",
                borderRadius: "50%",
                animation: "cvpBuilderPdfSpin 0.7s linear infinite",
              }}
            />
            <p
              style={{
                fontSize: 14,
                color: "var(--color-accent-bright)",
                fontWeight: 500,
                margin: 0,
                letterSpacing: "0.02em",
              }}
            >
              {TOLL_PLAZA_MESSAGES[transitingToTab] || "On our way..."}
            </p>
          </div>
        )}

      </div>

      </div>

      <CoverLetterModal
        isOpen={coverLetterOpen}
        onClose={() => setCoverLetterOpen(false)}
        resume={resume}
      />
      <UpgradeModal
        isOpen={upgradeOpen}
        onClose={() => { setUpgradeOpen(false); setUpgradeFeature(null); }}
        feature={upgradeFeature}
      />

      {menuDrawerOpen ? (
        <div className="cvp-builder-drawer-root" style={{ position: "fixed", inset: 0, zIndex: 360 }}>
          <div role="presentation" style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.45)" }} onClick={() => setMenuDrawerOpen(false)} />
          <aside
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: "78%",
              height: "100%",
              maxWidth: "100%",
              /* Floating surface — real glass, per the design pass. */
              background: "var(--builder-glass)",
              backdropFilter: "blur(32px) saturate(1.8)",
              WebkitBackdropFilter: "blur(32px) saturate(1.8)",
              borderLeft: "1px solid var(--builder-glass-border)",
              display: "flex",
              flexDirection: "column",
              boxSizing: "border-box",
              padding: "10px 10px 12px",
              boxShadow: "var(--builder-glass-shadow)",
              minHeight: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", minHeight: 44, marginBottom: 10 }}>
              <button
                type="button"
                onClick={() => {
                  setMenuDrawerOpen(false);
                  navigate(user ? "/dashboard" : "/");
                }}
                style={{
                  border: "none",
                  background: "none",
                  color: "var(--text-primary)",
                  fontSize: 11,
                  cursor: "pointer",
                  padding: "8px 0",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                ← Dashboard
              </button>
              <button type="button" aria-label="Close" onClick={() => setMenuDrawerOpen(false)} style={{ width: 44, height: 44, border: "none", background: "transparent", color: "var(--text-primary)", fontSize: 20, cursor: "pointer" }}>
                ✕
              </button>
            </div>
            {[
              { id: "content", label: "Content" },
              { id: "templates", label: "Templates" },
              { id: "ats", label: "ATS Check" },
              { id: "jobmatch", label: "Job Match" },
            ].map((row) => {
              const act = builderTab === row.id;
              return (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => {
                    if (row.id === "ats") {
                      if (fabMode === "guide") {
                        setBuilderTab("ats");
                      } else {
                        openAtsChecker();
                      }
                      setMenuDrawerOpen(false);
                      return;
                    }
                    setBuilderTab(row.id);
                    setMenuDrawerOpen(false);
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    width: "100%",
                    minHeight: 44,
                    marginBottom: 6,
                    padding: "7px 9px",
                    borderRadius: 8,
                    border: "none",
                    background: "var(--bg-elevated)",
                    color: act ? "var(--text-primary)" : "var(--text-secondary)",
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ stroke: act ? "var(--text-primary)" : "var(--text-muted)" }} strokeWidth="2" aria-hidden>
                    {row.id === "content" ? (
                      <>
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <path d="M14 2v6h6" />
                      </>
                    ) : row.id === "templates" ? (
                      <path d="M4 4h16v16H4z M9 4v16 M4 9h16" />
                    ) : row.id === "ats" ? (
                      <>
                        <circle cx="12" cy="12" r="8" />
                        <circle cx="12" cy="12" r="3" />
                      </>
                    ) : (
                      <>
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </>
                    )}
                  </svg>
                  {row.label}
                </button>
              );
            })}
            <div style={{ height: 1, background: "var(--border)", margin: "10px 0 12px" }} />
            {/* Preview lives in ONE place: the FAB. The drawer duplicate
                that used to sit here is removed on purpose. */}
            <div style={{
              position: 'relative',
              borderRadius: 10,
              width: '100%',
              marginBottom: 8,
              padding: '1.5px',
              background: 'linear-gradient(90deg, var(--bg-elevated) 0%, var(--bg-elevated) 20%, var(--text-secondary) 50%, var(--bg-elevated) 80%, var(--bg-elevated) 100%)',
              backgroundSize: '300% 100%',
              animation: downloadState.status !== 'idle' ? 'none' : 'cvp-dl-shimmer 2.5s linear infinite',
              boxSizing: 'border-box',
            }}>
              <button
                type="button"
                disabled={downloadState.status === 'generating'}
                onClick={() => {
                  setMenuDrawerOpen(false);
                  handleDownload();
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  width: '100%',
                  minHeight: 44,
                  padding: '10px 9px',
                  borderRadius: 9,
                  border: 'none',
                  background: 'var(--bg-surface)',
                  color: (downloadLocked && fabMode !== 'guide' && downloadState.status !== 'generating') ? 'var(--accent)' : 'var(--text-primary)',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: downloadState.status === 'generating' ? 'not-allowed' : 'pointer',
                  transition: 'color 150ms cubic-bezier(0.4,0,0.2,1)',
                  position: 'relative',
                }}
              >
                {downloadState.status === 'generating' ? <BuilderCvPdfSpinner20 /> : null}
                {downloadState.status === 'generating' ? null : (downloadLocked && fabMode !== 'guide') ? (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                )}
                {downloadState.status === 'generating'
                  ? "Generating your CV..."
                  : (downloadLocked && fabMode !== 'guide') ? "Unlock to download" : "Download CV"}
              </button>
            </div>
            <div style={{ flex: 1, minHeight: 8 }} aria-hidden />
            <div style={{ paddingTop: 4 }}>
              <div style={{ background: "var(--bg-elevated)", border: "0.5px solid var(--border-strong)", borderRadius: 8, padding: 8 }}>
                <div style={{ color: "var(--text-secondary)", fontSize: 8, fontWeight: 500, marginBottom: 4 }}>Remove watermark</div>
                <div style={{ color: "var(--text-muted)", fontSize: 7, marginBottom: 8, lineHeight: 1.35 }}>Download HD PDF — upgrade to Pro</div>
                <button
                  type="button"
                  onClick={() => {
                    setMenuDrawerOpen(false);
                    navigate("/pricing");
                  }}
                  style={{
                    width: "100%",
                    minHeight: 36,
                    background: "var(--accent)",
                    color: "var(--accent-contrast)",
                    fontSize: 7.5,
                    fontWeight: 600,
                    border: "none",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  Upgrade →
                </button>
              </div>
            </div>
          </aside>
        </div>
      ) : null}

      {experienceEditor && (
        <div
          role="dialog"
          aria-modal="true"
          className="cvp-glass-modal-overlay cvp-entry-sheet-overlay"
          onClick={askCloseExperienceModal}
        >
          <div
            className="cvp-glass-modal cvp-entry-sheet"
            style={{
              position: "relative",
              maxWidth: 520,
              width: "100%",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {expCloseGuardOpen ? (
              <div
                role="presentation"
                style={{
                  position: "absolute",
                  inset: 0,
                  zIndex: 50,
                  background: "rgba(0,0,0,0.72)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 20,
                  boxSizing: "border-box",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid rgba(217,119,6,0.35)",
                    borderRadius: 12,
                    padding: 20,
                    maxWidth: 360,
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <p style={{ margin: "0 0 16px", fontSize: 14, color: "var(--text-primary)", lineHeight: 1.45 }}>You have unsaved changes. Discard them?</p>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      style={{ ...CB_UI.btn, background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
                      onClick={() => setExpCloseGuardOpen(false)}
                    >
                      Keep editing
                    </button>
                    <button type="button" style={CB_UI.btn} onClick={finalizeCloseExperienceModal}>
                      Discard
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
            <h3 style={{ margin: 0, padding: "16px 20px 12px", fontSize: 17, fontWeight: 600, color: "var(--text-primary)", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
              {experienceEditor.mode === "add" ? "Add experience" : "Edit experience"}
            </h3>
            <div
              ref={expModalBodyRef}
              style={{
                overflowY: "auto",
                flex: 1,
                padding: "16px 20px",
                minHeight: 0,
                boxShadow: expModalScrollShadow ? "inset 0 -20px 20px -10px rgba(0,0,0,0.4)" : "none",
              }}
            >
              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Company name</label>
                  <input className="cvp-input" style={{ marginTop: 4 }} value={experienceEditor.draft.company} onChange={(e) => setExperienceEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, company: e.target.value } } : null))} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Job title</label>
                  <input className="cvp-input" style={{ marginTop: 4 }} value={experienceEditor.draft.role} onChange={(e) => setExperienceEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, role: e.target.value } } : null))} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Start (MM/YYYY)</label>
                    <input
                      id="cvp-exp-start-date"
                      className="cvp-input"
                      style={{ marginTop: 4 }}
                      placeholder="01/2020"
                      value={experienceEditor.draft.startDate}
                      onChange={(e) => {
                        const next = processMmYyyyInput(e.target.value, { allowPresent: false });
                        mmYyyyCursorRef.current = { id: "cvp-exp-start-date", cursor: next.cursor };
                        flushSync(() => {
                          setExperienceDateErrors((er) => ({ ...er, start: next.error }));
                          setExperienceEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, startDate: next.value } } : null));
                        });
                      }}
                      aria-invalid={experienceDateErrors.start ? true : undefined}
                    />
                    {experienceDateErrors.start ? (
                      <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--danger)", lineHeight: 1.35 }}>{experienceDateErrors.start}</p>
                    ) : null}
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>End (MM/YYYY)</label>
                    <input
                      id="cvp-exp-end-date"
                      className="cvp-input"
                      style={{ marginTop: 4 }}
                      placeholder="12/2023"
                      disabled={experienceEditor.draft.present}
                      value={experienceEditor.draft.endDate}
                      onChange={(e) => {
                        const next = processMmYyyyInput(e.target.value, { allowPresent: true });
                        mmYyyyCursorRef.current = { id: "cvp-exp-end-date", cursor: next.cursor };
                        flushSync(() => {
                          setExperienceDateErrors((er) => ({ ...er, end: next.error }));
                          setExperienceEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, endDate: next.value } } : null));
                        });
                      }}
                      aria-invalid={experienceDateErrors.end ? true : undefined}
                    />
                    {experienceDateErrors.end ? (
                      <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--danger)", lineHeight: 1.35 }}>{experienceDateErrors.end}</p>
                    ) : null}
                  </div>
                </div>
                {isExperienceEndBeforeStart(
                  experienceEditor.draft.startDate,
                  experienceEditor.draft.endDate,
                  experienceEditor.draft.present
                ) ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--danger)" }}>
                    <AlertCircle size={11} strokeWidth={1.8} aria-hidden />
                    End date cannot be before start date
                  </div>
                ) : null}
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-secondary)", cursor: "pointer" }}>
                  <input type="checkbox" checked={experienceEditor.draft.present} onChange={(e) => setExperienceEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, present: e.target.checked, endDate: e.target.checked ? "" : ev.draft.endDate } } : null))} />
                  Currently working here
                </label>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Location</label>
                  <input className="cvp-input" style={{ marginTop: 4 }} value={experienceEditor.draft.location} onChange={(e) => setExperienceEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, location: e.target.value } } : null))} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Description</label>
                  <style dangerouslySetInnerHTML={{ __html: CVP_BUILDER_PH_CSS }} />
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      marginTop: 4,
                      marginBottom: 4,
                    }}
                  >
                    {(() => {
                      const TOOLBAR_BTN = {
                        background: "transparent",
                        border: "none",
                        padding: "3px 6px",
                        fontSize: 11,
                        color: "var(--text-secondary)",
                        cursor: "pointer",
                        fontFamily: "inherit",
                        borderRadius: 4,
                      };
                      const setPointsAndCursor = (next, caret) => {
                        setExpModalHighEffortDirty(true);
                        if (String(next || "").trim()) setExpModalBulletWarn(false);
                        setExperienceEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, points: next } } : null));
                        // Restore cursor after React commits.
                        requestAnimationFrame(() => {
                          const el = expDescriptionRef.current;
                          if (!el) return;
                          el.focus();
                          el.setSelectionRange(caret, caret);
                        });
                      };
                      const insertAtCursor = (insert) => {
                        const el = expDescriptionRef.current;
                        const value = String(experienceEditor?.draft?.points || "");
                        const start = el ? el.selectionStart ?? value.length : value.length;
                        const end = el ? el.selectionEnd ?? value.length : value.length;
                        const next = value.slice(0, start) + insert + value.slice(end);
                        setPointsAndCursor(next, start + insert.length);
                      };
                      const handleAddBullet = () => {
                        const el = expDescriptionRef.current;
                        const value = String(experienceEditor?.draft?.points || "");
                        const start = el ? el.selectionStart ?? value.length : value.length;
                        // If cursor is at column 0 of an empty line (or value
                        // is empty), insert "• " inline. Otherwise insert
                        // "\n• " so the new bullet starts on its own line.
                        const before = value.slice(0, start);
                        const atLineStart = before.length === 0 || before.endsWith("\n");
                        const insert = atLineStart ? "• " : "\n• ";
                        insertAtCursor(insert);
                      };
                      const handleClearFormatting = () => {
                        const value = String(experienceEditor?.draft?.points || "");
                        const cleared = clearBulletMarkers(value);
                        const el = expDescriptionRef.current;
                        const caret = el ? Math.min(el.selectionStart ?? cleared.length, cleared.length) : cleared.length;
                        setPointsAndCursor(cleared, caret);
                      };
                      return (
                        <>
                          <button type="button" style={TOOLBAR_BTN} onMouseDown={(e) => e.preventDefault()} onClick={handleAddBullet}>
                            • Add bullet
                          </button>
                          <button type="button" style={TOOLBAR_BTN} onMouseDown={(e) => e.preventDefault()} onClick={() => insertAtCursor("\n")}>
                            ↵ New line
                          </button>
                          <button type="button" style={TOOLBAR_BTN} onMouseDown={(e) => e.preventDefault()} onClick={handleClearFormatting}>
                            Clear formatting
                          </button>
                        </>
                      );
                    })()}
                  </div>
                  <AIWorkingGlow active={expAi.isGenerating} radius={10}>
                    <AutoExpandTextarea
                      ref={expDescriptionRef}
                      className="cvp-builder-ph cvp-textarea"
                      style={{ paddingBottom: 30 }}
                      placeholder={EXP_POINTS_PLACEHOLDER}
                      value={experienceEditor.draft.points}
                      onChange={(e) => {
                        const v = e.target.value;
                        setExpModalHighEffortDirty(true);
                        if (String(v || "").trim()) setExpModalBulletWarn(false);
                        setExperienceEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, points: v } } : null));
                      }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        bottom: 10,
                        right: 12,
                        fontSize: 10,
                        color: "var(--text-muted)",
                        pointerEvents: "none",
                      }}
                    >
                      {String(experienceEditor.draft.points || "").length}
                    </span>
                  </AIWorkingGlow>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      marginTop: 8,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 5, minWidth: 0 }}>
                      <List size={11} strokeWidth={1.8} style={{ color: "var(--text-muted)" }} aria-hidden />
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Each line = one bullet on your CV</span>
                    </div>
                    {experienceHasText && (
                      <button
                        type="button"
                        disabled={expAi.isGenerating}
                        onClick={() => {
                          if (isAiExhausted(aiCreditsRemaining)) {
                            setUpgradeFeature("builder_ai");
                            setUpgradeOpen(true);
                            return;
                          }
                          expImproveOriginalRef.current = String(experienceEditor?.draft?.points || "");
                          expAi.improve({
                            text: String(experienceEditor?.draft?.points || ""),
                            field: "experience",
                            role: String(experienceEditor?.draft?.role || ""),
                            company: String(experienceEditor?.draft?.company || ""),
                            target_role: String(resume?.title || ""),
                            target_market: String(resume?.targetMarket || ""),
                          });
                        }}
                        aria-label={isAiExhausted(aiCreditsRemaining) ? "Upgrade for unlimited AI" : "Improve this description with AI"}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "5px 11px",
                          border: "1px solid rgba(217,119,6,0.45)",
                          borderRadius: 999,
                          background: "rgba(217,119,6,0.12)",
                          color: "var(--accent)",
                          fontSize: 11.5,
                          fontWeight: 600,
                          cursor: expAi.isGenerating ? "default" : "pointer",
                          opacity: expAi.isGenerating ? 0.7 : 1,
                          flexShrink: 0,
                          transition:
                            "background-color 0.16s cubic-bezier(0.4,0,0.2,1), border-color 0.16s cubic-bezier(0.4,0,0.2,1)",
                        }}
                        onMouseEnter={(e) => {
                          if (expAi.isGenerating) return;
                          e.currentTarget.style.background = "rgba(217,119,6,0.22)";
                          e.currentTarget.style.borderColor = "rgba(217,119,6,0.65)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "rgba(217,119,6,0.12)";
                          e.currentTarget.style.borderColor = "rgba(217,119,6,0.45)";
                        }}
                      >
                        {expAi.isGenerating
                          ? <Loader2 size={12} strokeWidth={2.4} style={{ animation: "cvp-ai-spin 0.8s linear infinite" }} aria-hidden />
                          : <Sparkles size={12} strokeWidth={2.4} aria-hidden />}
                        <span>
                          {deriveAiButtonLabel({
                            aiLoading: expAi.isGenerating,
                            creditsRemaining: aiCreditsRemaining,
                            idleLabel: "Improve with AI",
                            loadingLabel: "Improving...",
                          })}
                        </span>
                      </button>
                    )}
                  </div>
                  {expModalBulletWarn ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginTop: 8,
                        padding: "8px 10px",
                        borderRadius: 8,
                        background: "rgba(217,119,6,0.1)",
                        border: "1px solid rgba(217,119,6,0.3)",
                        fontSize: 11,
                        color: "var(--accent-text)",
                      }}
                    >
                      <AlertTriangle size={11} strokeWidth={1.8} aria-hidden />
                      No bullet points added — this may weaken your CV.
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            <div style={{ flexShrink: 0, borderTop: "1px solid var(--border)", padding: "12px 20px 20px", display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" className="cvp-glass-modal-cancel" style={{ ...CB_UI.btn, background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border)" }} onClick={askCloseExperienceModal}>
                Cancel
              </button>
              <button
                type="button"
                style={CB_UI.btn}
                onClick={() => {
                  const { mode, index, draft } = experienceEditor;
                  if (isExperienceEndBeforeStart(draft.startDate, draft.endDate, draft.present)) return;
                  if (!String(draft.points || "").trim()) setExpModalBulletWarn(true);
                  const next = { ...draft, period: buildExperiencePeriod({ ...draft, present: draft.present }) };
                  setResume((r) => {
                    if (mode === "add") return { ...r, experience: [...r.experience, next] };
                    const u = [...r.experience];
                    u[index] = next;
                    return { ...r, experience: u };
                  });
                  setExpModalHighEffortDirty(false);
                  setExpCloseGuardOpen(false);
                  setSavedAtMs(Date.now());
                  setExperienceEditor(null);
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <AtsWelcomeModal
        open={showAtsWelcome}
        fixed={atsWelcomePartition.fixed}
        todo={atsWelcomePartition.todo}
        onReview={reviewAtsWelcome}
        onClose={closeAtsWelcome}
      />

      {atsToast && (
        <div
          role="status"
          style={{
            position: "fixed",
            bottom: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 1100,
            display: "flex",
            alignItems: "center",
            gap: 12,
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            borderRadius: 999,
            padding: "10px 10px 10px 18px",
            fontSize: 13,
            color: "var(--text-primary)",
            fontFamily: "'DM Sans', sans-serif",
            boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
          }}
        >
          <span>{atsToast.text}</span>
          {atsToast.onUndo && (
            <button
              type="button"
              onClick={() => { atsToast.onUndo(); setAtsToast(null); }}
              style={{
                background: "rgba(217,119,6,0.16)",
                border: "1px solid rgba(217,119,6,0.4)",
                color: "var(--color-accent-bright)",
                borderRadius: 999,
                padding: "5px 12px",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Undo
            </button>
          )}
        </div>
      )}

      <AIRewriteModal
        isOpen={!!expAi.options && !!experienceEditor}
        original={expImproveOriginalRef.current}
        options={expAi.options || []}
        creditsRemaining={aiCreditsRemaining}
        onClose={() => expAi.reset()}
        onKeepOriginal={() => expAi.reset()}
        onPick={(newText) => {
          // Replace the WHOLE description. Snapshot the pre-rewrite text so
          // the toast's Undo can restore it exactly.
          const original = expImproveOriginalRef.current;
          setExperienceEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, points: String(newText || "") } } : null));
          setExpModalHighEffortDirty(true);
          setExpModalBulletWarn(false);
          expAi.reset();
          setAtsToast({
            text: "Updated",
            onUndo: () => {
              setExperienceEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, points: original } } : null));
              setExpModalHighEffortDirty(true);
            },
          });
        }}
      />

      {educationEditor && (
        <div
          role="dialog"
          aria-modal="true"
          className="cvp-glass-modal-overlay cvp-entry-sheet-overlay"
          onClick={() => setEducationEditor(null)}
        >
          <div
            className="cvp-glass-modal cvp-entry-sheet"
            style={{ padding: 20, maxWidth: 520, width: "100%", maxHeight: "90vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 600, color: "var(--text-primary)" }}>{educationEditor.mode === "add" ? "Add education" : "Edit education"}</h3>
            {/* Same reusable AIWorkingGlow that wraps the Experience and
                Summary boxes. Education has only structured fields (no
                free-text description) today, so there is nothing to rewrite
                and the ring stays dormant (active=false) — but the wrapper
                is mounted identically, ready to light up the instant a
                description field is added. */}
            <AIWorkingGlow active={false} radius={12}>
            <div style={{ display: "grid", gap: 12 }}>
              <div><label style={{ fontSize: 12, color: "var(--text-secondary)" }}>Institution name</label><input className="cvp-input" style={{ marginTop: 4 }} value={educationEditor.draft.school} onChange={(e) => setEducationEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, school: e.target.value } } : null))} /></div>
              <div><label style={{ fontSize: 12, color: "var(--text-secondary)" }}>Degree / qualification</label><input className="cvp-input" style={{ marginTop: 4 }} value={educationEditor.draft.degree} onChange={(e) => setEducationEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, degree: e.target.value } } : null))} /></div>
              <div><label style={{ fontSize: 12, color: "var(--text-secondary)" }}>Field of study</label><input className="cvp-input" style={{ marginTop: 4 }} value={educationEditor.draft.fieldOfStudy || ""} onChange={(e) => setEducationEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, fieldOfStudy: e.target.value } } : null))} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>Start (MM/YYYY)</label>
                  <input
                    id="cvp-edu-start-date"
                    className="cvp-input"
                    style={{ marginTop: 4 }}
                    placeholder="09/2018"
                    value={educationEditor.draft.startDate || ""}
                    onChange={(e) => {
                      const next = processMmYyyyInput(e.target.value, { allowPresent: false });
                      mmYyyyCursorRef.current = { id: "cvp-edu-start-date", cursor: next.cursor };
                      flushSync(() => {
                        setEducationDateErrors((er) => ({ ...er, start: next.error }));
                        setEducationEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, startDate: next.value } } : null));
                      });
                    }}
                    aria-invalid={educationDateErrors.start ? true : undefined}
                  />
                  {educationDateErrors.start ? (
                    <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--danger)", lineHeight: 1.35 }}>{educationDateErrors.start}</p>
                  ) : null}
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "var(--text-secondary)" }}>End (MM/YYYY)</label>
                  <input
                    id="cvp-edu-end-date"
                    className="cvp-input"
                    style={{ marginTop: 4 }}
                    placeholder="06/2022"
                    value={educationEditor.draft.endDate || ""}
                    onChange={(e) => {
                      const next = processMmYyyyInput(e.target.value, { allowPresent: false });
                      mmYyyyCursorRef.current = { id: "cvp-edu-end-date", cursor: next.cursor };
                      flushSync(() => {
                        setEducationDateErrors((er) => ({ ...er, end: next.error }));
                        setEducationEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, endDate: next.value } } : null));
                      });
                    }}
                    aria-invalid={educationDateErrors.end ? true : undefined}
                  />
                  {educationDateErrors.end ? (
                    <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--danger)", lineHeight: 1.35 }}>{educationDateErrors.end}</p>
                  ) : null}
                </div>
              </div>
              <div><label style={{ fontSize: 12, color: "var(--text-secondary)" }}>Location (optional)</label><input className="cvp-input" style={{ marginTop: 4 }} value={educationEditor.draft.location || ""} onChange={(e) => setEducationEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, location: e.target.value } } : null))} /></div>
            </div>
            </AIWorkingGlow>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
              <button type="button" className="cvp-glass-modal-cancel" style={{ ...CB_UI.btn, background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border)" }} onClick={() => setEducationEditor(null)}>Cancel</button>
              <button
                type="button"
                style={CB_UI.btn}
                onClick={() => {
                  const { mode, index, draft } = educationEditor;
                  const next = { ...draft, year: buildEducationYearLine(draft) };
                  setResume((r) => {
                    if (mode === "add") return { ...r, education: [...r.education, next] };
                    const u = [...r.education];
                    u[index] = next;
                    return { ...r, education: u };
                  });
                  setEducationEditor(null);
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {cvImportPending && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 220,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setCvImportPending(null)}
        >
          <div
            style={{ background: "var(--builder-glass)", backdropFilter: "blur(32px) saturate(1.8)", WebkitBackdropFilter: "blur(32px) saturate(1.8)", border: "1px solid var(--builder-glass-border)", boxShadow: "var(--builder-glass-shadow)", borderRadius: 12, padding: 20, maxWidth: 380, width: "100%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 8px", fontSize: 17, fontWeight: 600, color: "var(--text-primary)" }}>Replace your draft?</h3>
            <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}>
              Importing <strong style={{ color: "var(--text-primary)" }}>{cvImportPending.filename}</strong> will replace what's currently in your builder. This can't be undone.
            </p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button
                type="button"
                style={{ ...CB_UI.btn, background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border)" }}
                onClick={() => setCvImportPending(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                style={CB_UI.btn}
                onClick={() => {
                  const pending = cvImportPending;
                  setCvImportPending(null);
                  if (pending?.cvData) {
                    applyImportedCv(pending.cvData, pending.filename);
                  }
                }}
              >
                Replace
              </button>
            </div>
          </div>
        </div>
      )}

      {userHasEdited && !cvpBannerDismissedStored ? (
        <div
          className="cvp-builder-unsaved-banner"
          style={{
            position: "fixed",
            bottom: 96,
            left: 16,
            right: 16,
            zIndex: 250,
            background: "var(--bg-elevated)",
            border: "1px solid rgba(217,119,6,0.35)",
            borderRadius: 12,
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
            rowGap: 10,
            maxWidth: "100%",
            boxSizing: "border-box",
            boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
          }}
        >
          <AlertTriangle size={13} strokeWidth={1.8} style={{ color: "var(--accent-text)" }} aria-hidden />
          <span
            style={{
              flex: "1 1 120px",
              minWidth: 0,
              fontSize: 12,
              color: "var(--accent-text)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            You have unsaved changes
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, marginLeft: "auto" }}>
            <button
              type="button"
              onClick={() => {
                const snap = lastSavedSnapshotRef.current;
                if (snap) {
                  // Discard is a revert, not a user edit — use the raw
                  // setter so the dirty flag isn't flipped by the revert
                  // itself. We then explicitly clear the flag below.
                  setResumeRaw({
                    ...snap,
                    technicalSkills: normalizeTechnicalSkillsState(snap.technicalSkills),
                  });
                }
                clearCvDraft(draftStorageKey);
                setUserHasEdited(false);
              }}
              style={{
                background: "var(--accent)",
                border: "none",
                color: "var(--text-primary)",
                fontSize: 11,
                fontWeight: 700,
                padding: "6px 12px",
                borderRadius: 8,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Discard
            </button>
            <button
              type="button"
              aria-label="Dismiss unsaved changes notice"
              onClick={() => {
                try {
                  window.localStorage.setItem("cvp_banner_dismissed", "true");
                } catch {
                  /* ignore quota / private mode */
                }
                setCvpBannerDismissedStored(true);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxSizing: "border-box",
                width: isMobile ? 44 : 20,
                height: isMobile ? 44 : 20,
                padding: 0,
                margin: 0,
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-primary)",
                opacity: 0.6,
                flexShrink: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "1";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "0.6";
              }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" style={{ display: "block" }}>
                <path
                  d="M5 5 L15 15 M15 5 L5 15"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>
      ) : null}

      {['synthesizing', 'generating', 'exiting'].includes(downloadState.status) && createPortal(
        <SynthesisOverlay
          resume={resume}
          selectedTemplateName={selectedTemplate?.name}
          atsScore={score}
          isExiting={downloadState.status === 'exiting'}
          onComplete={() => {
            finishGuide();
            void handleDownload({ skipSynthesis: true });
          }}
        />,
        document.body
      )}
      {downloadState.status === 'completed' && createPortal(
        <CompletionScreen
          atsScore={score}
          userName={resume?.name}
          onDashboard={() => {
            dispatch({ type: 'RESET' });
            onBack?.();
          }}
        />,
        document.body
      )}

      <BuilderActionBar
        saving={saving}
        saveStatus={saveStatus}
        isAuthed={!!user?.id}
        downloadStatus={downloadState.status}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onSave={handleSave}
        onExport={handleDownload}
      />
    </div>
  );
}

/* Design row icon square: neutral fill, amber only for the corridor
   block. No blue anywhere in the builder — design rule. */
const ACCORDION_ICON_BOX = {
  width: 34,
  height: 34,
  borderRadius: 9,
  background: "var(--builder-fill)",
  display: "grid",
  placeItems: "center",
  flexShrink: 0,
  boxSizing: "border-box",
};
const ACCORDION_ICON_BOX_ACCENT = {
  ...ACCORDION_ICON_BOX,
  background: "var(--color-accent-soft)",
};

function AccordionSectionLucideIcon({ id, icon }) {
  const size = 16;
  const sw = 1.8;
  /* color rides on a style (not the lucide color prop → SVG stroke attr,
     where var() is invalid). Personal Details gets the amber accent — it
     is the corridor block, the answers a Gulf recruiter filters on. */
  const st = { color: id === "personalDetails" || icon === "personalDetails" ? "var(--accent)" : "var(--text-secondary)" };
  if (id === "technicalSkills") return <Cpu size={size} style={st} strokeWidth={sw} aria-hidden />;
  if (id === "certifications" || icon === "certifications") return <Award size={size} style={st} strokeWidth={sw} aria-hidden />;
  if (id === "personalDetails" || icon === "personalDetails") return <User size={size} style={st} strokeWidth={sw} aria-hidden />;
  if (icon === "summary" || id === "summary") return <FileText size={size} style={st} strokeWidth={sw} aria-hidden />;
  if (icon === "experience" || id === "experience") return <Briefcase size={size} style={st} strokeWidth={sw} aria-hidden />;
  if (icon === "education" || id === "education") return <GraduationCap size={size} style={st} strokeWidth={sw} aria-hidden />;
  if (icon === "languages" || id === "languages") return <Globe size={size} style={st} strokeWidth={sw} aria-hidden />;
  if (icon === "skills" || id === "skills") return <Star size={size} style={st} strokeWidth={sw} aria-hidden />;
  return <FileText size={size} style={st} strokeWidth={sw} aria-hidden />;
}

const ACCORDION_MENU_ITEM = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  width: "100%",
  minHeight: 36,
  padding: "0 10px",
  borderRadius: 8,
  background: "transparent",
  border: "none",
  fontSize: 13,
  fontWeight: 500,
  color: "var(--text-primary)",
  fontFamily: "inherit",
  textAlign: "left",
};

// Accordion row inside .cvp-sections-list — unified list style
function AccordionSection({
  id,
  title,
  metaSubtitle,
  isOpen,
  onToggle,
  icon,
  children,
  variant = "default",
  orderedSectionIds,
  onSectionReorder,
  activeGuideSection = null,
  dragState = null,
  setDragState = null,
  onArmDrag = null,
  isDragArmed = null,
  onSectionDrop = null,
}) {
  const ease = "cubic-bezier(0.4,0,0.2,1)";
  /* Corridor marker — Personal Details reads as the high-value block. */
  const headerBadge = id === "personalDetails" ? "Get called first" : null;
  const headerBadgeEl = headerBadge ? (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        flexShrink: 0,
        height: 20,
        padding: "0 8px",
        borderRadius: 999,
        background: "var(--color-accent-soft)",
        border: "1px solid var(--color-accent-line)",
        color: "var(--accent-text)",
        fontSize: 10.5,
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {headerBadge}
    </span>
  ) : null;
  /* Design row anatomy: the old up/down arrow stack + pencil cluster is
     gone. Reordering lives in a ⋯ overflow menu (the design's own
     pattern); the chevron is the only other control. */
  const [rowMenuOpen, setRowMenuOpen] = useState(false);
  const guideActive = activeGuideSection === `section-${id}`;
  const iconBoxStyle = {
    ...(id === "personalDetails" ? ACCORDION_ICON_BOX_ACCENT : ACCORDION_ICON_BOX),
    ...(guideActive
      ? { background: "rgba(245,158,11,0.16)", animation: "fabGuideEditPulse 1.2s ease-in-out infinite" }
      : null),
  };
  const idx = orderedSectionIds ? orderedSectionIds.indexOf(id) : -1;
  const flexOrder = idx >= 0 ? idx : undefined;
  const canMoveUp = Boolean(onSectionReorder && idx > 0);
  const canMoveDown = Boolean(
    onSectionReorder && orderedSectionIds && idx >= 0 && idx < orderedSectionIds.length - 1
  );

  const sectionMenuEl = onSectionReorder ? (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        aria-label={`${title} options`}
        aria-expanded={rowMenuOpen}
        onClick={(e) => { e.stopPropagation(); setRowMenuOpen((v) => !v); }}
        style={{ width: 28, height: 28, padding: 0, display: "grid", placeItems: "center", background: "transparent", border: "none", borderRadius: 7, color: "var(--text-muted)", cursor: "pointer" }}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden><circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" /></svg>
      </button>
      {rowMenuOpen ? (
        <>
          <div role="presentation" style={{ position: "fixed", inset: 0, zIndex: 39 }} onClick={(e) => { e.stopPropagation(); setRowMenuOpen(false); }} />
          <div role="menu" style={{ position: "absolute", top: 32, right: 0, zIndex: 40, minWidth: 158, padding: 5, borderRadius: 12, background: "var(--builder-glass)", backdropFilter: "blur(20px) saturate(1.5)", WebkitBackdropFilter: "blur(20px) saturate(1.5)", border: "1px solid var(--builder-glass-border)", boxShadow: "var(--builder-glass-shadow)" }}>
            <button role="menuitem" type="button" disabled={!canMoveUp} onClick={(e) => { e.stopPropagation(); setRowMenuOpen(false); if (canMoveUp) onSectionReorder("up"); }} style={{ ...ACCORDION_MENU_ITEM, opacity: canMoveUp ? 1 : 0.4, cursor: canMoveUp ? "pointer" : "not-allowed" }}>
              <ChevronUp size={14} strokeWidth={2} aria-hidden /> Move up
            </button>
            <button role="menuitem" type="button" disabled={!canMoveDown} onClick={(e) => { e.stopPropagation(); setRowMenuOpen(false); if (canMoveDown) onSectionReorder("down"); }} style={{ ...ACCORDION_MENU_ITEM, opacity: canMoveDown ? 1 : 0.4, cursor: canMoveDown ? "pointer" : "not-allowed" }}>
              <ChevronDown size={14} strokeWidth={2} aria-hidden /> Move down
            </button>
          </div>
        </>
      ) : null}
    </div>
  ) : null;

  // Tier 3 — DnD wiring. Active only when all DnD props are present
  // (parent passes them on desktop; mobileRow renders without DnD).
  // dragEnterCounterRef avoids the dragenter/dragleave child-element
  // flicker by counting nested enter/leave pairs.
  const dndEnabled = Boolean(setDragState && onSectionDrop && isDragArmed && onArmDrag);
  const dragEnterCounterRef = useRef(0);
  const isDraggingThis = dndEnabled && dragState?.draggingId === id;
  const isOverThis = dndEnabled && dragState?.overId === id && dragState?.draggingId !== id;
  const dropPos = isOverThis ? dragState?.overPosition : null;

  const handleDragStart = (e) => {
    if (!dndEnabled) return;
    if (!isDragArmed()) {
      e.preventDefault();
      return;
    }
    try {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", id);
    } catch {
      /* some browsers throw on cross-origin iframes — ignore */
    }
    setDragState({ draggingId: id, overId: null, overPosition: null });
  };
  const handleDragEnd = () => {
    if (!dndEnabled) return;
    setDragState({ draggingId: null, overId: null, overPosition: null });
    dragEnterCounterRef.current = 0;
  };
  const handleDragEnter = (e) => {
    if (!dndEnabled || !dragState?.draggingId || dragState.draggingId === id) return;
    e.preventDefault();
    dragEnterCounterRef.current += 1;
    if (dragState.overId !== id) {
      setDragState((s) => ({ ...s, overId: id }));
    }
  };
  const handleDragOver = (e) => {
    if (!dndEnabled || !dragState?.draggingId || dragState.draggingId === id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const rect = e.currentTarget.getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    const pos = e.clientY < mid ? "before" : "after";
    if (dragState.overId !== id || dragState.overPosition !== pos) {
      setDragState((s) => ({ ...s, overId: id, overPosition: pos }));
    }
  };
  const handleDragLeave = () => {
    if (!dndEnabled) return;
    dragEnterCounterRef.current -= 1;
    if (dragEnterCounterRef.current <= 0) {
      dragEnterCounterRef.current = 0;
      setDragState((s) => (s.overId === id ? { ...s, overId: null, overPosition: null } : s));
    }
  };
  const handleDrop = (e) => {
    if (!dndEnabled) return;
    e.preventDefault();
    const fromId = dragState?.draggingId;
    const pos = dragState?.overPosition || "after";
    setDragState({ draggingId: null, overId: null, overPosition: null });
    dragEnterCounterRef.current = 0;
    if (fromId && fromId !== id) onSectionDrop(fromId, id, pos);
  };

  const guideSectionDomId = ["summary", "experience", "education", "skills", "languages"].includes(id) ? `section-${id}` : undefined;

  if (variant === "mobileRow") {
    return (
      <div id={guideSectionDomId} data-cvp-accordion={id} style={{ marginBottom: 5, maxWidth: "100%", order: flexOrder }}>
        <div
          style={{
            display: "flex",
            width: "100%",
            alignItems: "center",
            minWidth: 0,
            gap: 10,
            background: "var(--bg-surface)",
            border: "0.5px solid var(--border)",
            borderRadius: 9,
            padding: "8px 12px",
            minHeight: 56,
            boxSizing: "border-box",
          }}
        >
          <div style={iconBoxStyle}>
            <AccordionSectionLucideIcon id={id} icon={icon} />
          </div>
          <button
            type="button"
            onClick={onToggle}
            style={{
              flex: 1,
              minWidth: 0,
              background: "none",
              border: "none",
              padding: "4px 0",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <div style={{ minWidth: 0, width: "100%" }}>
              <div
                style={{
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  color: "var(--text-primary)",
                  fontSize: 15,
                  fontWeight: 600,
                  letterSpacing: "0.02em",
                }}
              >
                {title}
              </div>
              {metaSubtitle ? (
                <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2, fontWeight: 400 }}>{metaSubtitle}</div>
              ) : null}
            </div>
          </button>
          {headerBadgeEl}
          {sectionMenuEl}
          <button
            type="button"
            aria-expanded={isOpen}
            aria-label={isOpen ? "Collapse section" : "Expand section"}
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            style={{
              background: "none",
              border: "none",
              padding: 4,
              flexShrink: 0,
              cursor: "pointer",
              color: "var(--text-secondary)",
              display: "grid",
              placeItems: "center",
              transition: `transform 300ms ${ease}`,
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            }}
          >
            <ChevronDown size={13} strokeWidth={2} aria-hidden />
          </button>
        </div>
        <div style={{ display: "grid", gridTemplateRows: isOpen ? "1fr" : "0fr", transition: `grid-template-rows 300ms ${ease}` }}>
          <div style={{ overflow: isOpen ? "visible" : "hidden" }}>
            <div
              style={{
                opacity: isOpen ? 1 : 0,
                transition: `opacity 300ms ${ease}`,
                padding: 12,
                background: "var(--bg)",
                border: "0.5px solid var(--border)",
                borderTop: "none",
                borderRadius: "0 0 9px 9px",
              }}
            >
              {children}
            </div>
          </div>
        </div>
      </div>
    );
  }
  const rowClass = `cvp-section-row${isOpen ? " is-open" : ""}${isDraggingThis ? " is-dragging" : ""}`;
  const dropAttr = dropPos ? { "data-drop-pos": dropPos } : {};
  return (
    <div
      id={guideSectionDomId}
      data-cvp-accordion={id}
      className={rowClass}
      style={{ order: flexOrder }}
      draggable={dndEnabled}
      onDragStart={dndEnabled ? handleDragStart : undefined}
      onDragEnd={dndEnabled ? handleDragEnd : undefined}
      onDragEnter={dndEnabled ? handleDragEnter : undefined}
      onDragOver={dndEnabled ? handleDragOver : undefined}
      onDragLeave={dndEnabled ? handleDragLeave : undefined}
      onDrop={dndEnabled ? handleDrop : undefined}
      {...dropAttr}
    >
      <div
        className="cvp-section-row-header"
        style={{
          display: "flex",
          width: "100%",
          alignItems: "center",
          minWidth: 0,
          gap: 12,
          padding: 16,
          background: "transparent",
          transition: `background-color 150ms ${EASE}, border-color 150ms ${EASE}`,
          boxSizing: "border-box",
        }}
      >
        {dndEnabled ? (
          <button
            type="button"
            className="cvp-builder-section-grip"
            aria-label="Drag to reorder section"
            title="Drag to reorder"
            onMouseDown={() => onArmDrag()}
          >
            <GripVertical size={14} strokeWidth={1.8} aria-hidden />
          </button>
        ) : null}
        <div style={iconBoxStyle}>
          <AccordionSectionLucideIcon id={id} icon={icon} />
        </div>
        <button
          type="button"
          onClick={onToggle}
          style={{
            flex: 1,
            minWidth: 0,
            display: "grid",
            gap: 2,
            alignContent: "center",
            justifyItems: "start",
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <span
            style={{
              minWidth: 0,
              width: "100%",
              maxWidth: "100%",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
              fontSize: 15,
              fontWeight: 500,
              color: "var(--text-primary)",
              letterSpacing: "0.02em",
            }}
          >
            {title}
          </span>
          {metaSubtitle ? <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 400 }}>{metaSubtitle}</span> : null}
        </button>
        {headerBadgeEl}
        {sectionMenuEl}
        <button
          type="button"
          aria-expanded={isOpen}
          aria-label={isOpen ? "Collapse section" : "Expand section"}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          style={{
            background: "none",
            border: "none",
            padding: 4,
            flexShrink: 0,
            cursor: "pointer",
            color: "var(--text-secondary)",
            display: "grid",
            placeItems: "center",
            transition: `transform 300ms ${ease}`,
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          <ChevronDown size={13} strokeWidth={2} aria-hidden />
        </button>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateRows: isOpen ? "1fr" : "0fr",
          transition: `grid-template-rows 300ms ${ease}`,
        }}
      >
        <div style={{ overflow: isOpen ? "visible" : "hidden" }}>
          <div
            className="cvp-section-row-content"
            style={{
              opacity: isOpen ? 1 : 0,
              transition: `opacity 300ms ${ease}`,
              padding: 16,
              background: "var(--bg-surface)",
              borderTop: "1px solid var(--border)",
            }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
export default function BuilderPage(props) {
  return (
    <>
      <Helmet>
        <title>Build Your CV Online — ATS-Ready for UAE &amp; GCC Jobs | CVPassport</title>
        <meta name="description" content="Create a Gulf-ready ATS-optimised CV in minutes. Built for Indian expats and job seekers in Dubai, UAE & GCC. Free to start." />
        <meta name="keywords" content="CV builder UAE, ATS CV Dubai, resume builder GCC, CV maker India, ATS optimised CV, job seeker Dubai, expat CV builder, CV templates UAE" />
        {/* App surface — kept out of the index (and out of sitemap.xml)
            so the SPA shell never competes with the marketing pages. */}
        <meta name="robots" content="noindex" />
        <meta property="og:title" content="Build Your CV Online — ATS-Ready for UAE &amp; GCC Jobs | CVPassport" />
        <meta property="og:description" content="Create a Gulf-ready ATS-optimised CV in minutes. Built for Indian expats and job seekers in Dubai, UAE & GCC. Free to start." />
        <meta property="og:url" content="https://www.mycvpassport.com/builder" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="en_AE" />
      </Helmet>
      <ResumeBuilder {...props} />
    </>
  );
}
