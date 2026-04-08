import { useState, useEffect, useCallback, useRef, useMemo, useLayoutEffect, Fragment } from "react";
import { flushSync } from "react-dom";
import { useNavigate, useLocation } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  Award,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Cpu,
  FileText,
  Globe,
  GraduationCap,
  GripVertical,
  Lightbulb,
  List,
  Pencil,
  Star,
  Trash2,
  X,
} from "lucide-react";
import JobMatch from "../JobMatch";
import CoverLetterModal from "../CoverLetterModal";
import UpgradeModal from "../UpgradeModal";
import { FAB } from "../components/FAB";
import { writeFabMemory } from "../components/FAB/FABLogic";
import { saveResume } from "../resumeDb";
import { downloadResumeFromPreview } from "../downloadResumeFromPreview";
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
  splitCommaItems,
  buildExperiencePeriod,
  buildEducationYearLine,
  builderAtsScore,
} from "../cvShared";
import { getRoleSuggestions } from "../utils/detectRole";
import { CB_UI, S } from "../builderStyles";
import { ResumePreview, BuilderA4PreviewScaled, A4_PREVIEW_WIDTH_PX, A4_PREVIEW_HEIGHT_PX } from "../ResumePreview";
import { useCvProgress, SECTIONS as CV_PROGRESS_SECTIONS } from "../hooks/useCvProgress";

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
            background: "rgba(59,130,246,0.06)",
            border: "1px dashed rgba(59,130,246,0.45)",
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
              <Lightbulb size={11} strokeWidth={1.8} color="#60A5FA" aria-hidden />
              <span style={{ fontSize: 11, color: "#60A5FA", fontWeight: 600 }}>Suggested certifications — not on your CV yet</span>
            </span>
            <button
              type="button"
              title="Dismiss suggestions"
              onClick={() => setCertSuggestionsDismissed(true)}
              style={{
                background: "none",
                border: "none",
                color: "#A0A0A0",
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
                    border: "1px dashed rgba(59,130,246,0.4)",
                    color: "#60A5FA",
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
        <p style={{ fontSize: 13, color: "#A0A0A0", margin: 0 }}>No certifications yet. Add one below.</p>
      )}
      {list.map((c, i) =>
        inlineNameEdit && inlineNameEdit.index === i ? (
          <div
            key={i}
            style={{
              background: "#1C1C1C",
              border: "1px solid #2A2A2A",
              borderRadius: 10,
              padding: "12px 16px",
              marginBottom: 8,
            }}
          >
            <div style={{ display: "grid", gap: 8 }}>
              <input
                style={{ ...CB_UI.input, marginTop: 0, minHeight: undefined }}
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
                  style={{ ...CB_UI.btn, background: "transparent", color: "#A0A0A0", border: "1px solid #2A2A2A" }}
                  onClick={() => setInlineNameEdit(null)}
                >
                  Cancel
                </button>
              </div>
              {c.issuer ? <div style={{ fontSize: 12, color: "#A0A0A0", marginTop: 2 }}>{c.issuer}</div> : null}
              {c.year ? <div style={{ fontSize: 12, color: "#A0A0A0", marginTop: 2 }}>{c.year}</div> : null}
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
        <div style={{ background: "#141414", border: "1px solid #2A2A2A", borderRadius: 8, padding: 16, display: "grid", gap: 10 }}>
          <div>
            <label style={{ fontSize: 12, color: "#A0A0A0", display: "block", marginBottom: 4 }}>Name</label>
            <input
              style={{ ...CB_UI.input, marginTop: 0, minHeight: undefined }}
              placeholder="Certification name"
              value={certificationEditor.draft.name}
              onChange={(e) => setCertificationEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, name: e.target.value } } : null))}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "#A0A0A0", display: "block", marginBottom: 4 }}>Issuer</label>
            <input
              style={{ ...CB_UI.input, marginTop: 0, minHeight: undefined }}
              placeholder="Issuing organisation (optional)"
              value={certificationEditor.draft.issuer}
              onChange={(e) => setCertificationEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, issuer: e.target.value } } : null))}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "#A0A0A0", display: "block", marginBottom: 4 }}>Date issued (MM/YYYY)</label>
            <input
              ref={certYearInputRef}
              style={{
                ...CB_UI.input,
                marginTop: 0,
                minHeight: undefined,
                borderColor: certYearError ? "#EF4444" : undefined,
                transition: "border-color 200ms cubic-bezier(0.4,0,0.2,1)",
              }}
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
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "#EF4444", lineHeight: 1.35 }}>{certYearError}</p>
            ) : null}
          </div>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <button type="button" style={{ ...CB_UI.btn, background: "transparent", color: "#A0A0A0", border: "1px solid #2A2A2A" }} onClick={() => setCertificationEditor(null)}>Cancel</button>
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
        className="cvp-builder-add-entry-btn"
        style={{ ...CB_UI.btn, width: "100%", display: "block", marginBottom: 8 }}
        onClick={() => setCertificationEditor({ mode: "add", index: -1, draft: { ...EMPTY_CERT } })}
      >
        + Add Certification
      </button>
      <button
        type="button"
        style={{ ...CB_UI.btn, alignSelf: "flex-start", background: "transparent", color: "#A0A0A0", border: "1px solid #2A2A2A" }}
        onClick={onRemoveSection}
      >
        Remove section
      </button>
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
      ) : (
        <div data-cvp-highlight={opt.id} style={{ display: "grid", gap: 8, borderRadius: 8, padding: 2, margin: -2 }}>
          {opt.multiline ? (
            <>
              <div style={{ position: "relative", width: "100%" }}>
                <style dangerouslySetInnerHTML={{ __html: CVP_BUILDER_PH_CSS }} />
                <textarea
                  className="cvp-builder-ph"
                  style={BUILDER_DESCR_TEXTAREA}
                  placeholder={opt.label}
                  value={resume[opt.field] || ""}
                  onChange={(e) => setResume((r) => ({ ...r, [opt.field]: e.target.value }))}
                  onFocus={(e) => {
                    e.target.style.borderColor = "rgba(59,130,246,0.45)";
                    e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.08)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "#2A2A2A";
                    e.target.style.boxShadow = "none";
                  }}
                />
                <span
                  style={{
                    position: "absolute",
                    bottom: 10,
                    right: 12,
                    fontSize: 10,
                    color: "#444",
                    pointerEvents: "none",
                  }}
                >
                  {(resume[opt.field] || "").length}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <List size={11} strokeWidth={1.8} color="#555" aria-hidden />
                <span style={{ fontSize: 11, color: "#555" }}>Each line = one bullet on your CV</span>
              </div>
            </>
          ) : (
            <input
              style={{ ...CB_UI.input, minHeight: undefined }}
              value={resume[opt.field] || ""}
              onChange={(e) => setResume((r) => ({ ...r, [opt.field]: e.target.value }))}
            />
          )}
          <button
            type="button"
            style={{ ...CB_UI.btn, alignSelf: "flex-start", background: "transparent", color: "#A0A0A0", border: "1px solid #2A2A2A" }}
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
  border: "1px solid #2A2A2A",
  background: "#1C1C1C",
  color: "#FFFFFF",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "inherit",
};

const BUILDER_SHEET_SURFACE = {
  background: "#141414",
  border: "1px solid #2A2A2A",
  borderRadius: 16,
};

const CVP_BUILDER_PH_CSS = ".cvp-builder-ph::placeholder{color:rgba(255,255,255,0.22);font-style:italic}";

const BUILDER_SKILL_INPUT_BASE = {
  background: "#141414",
  border: "1px solid #2A2A2A",
  borderRadius: 12,
  color: "#fff",
  fontSize: 13,
  padding: "11px 14px",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

/** Inline "+ Add" next to skill inputs — layout/size from `.cvp-builder-skill-add-btn` in index.css */
const BUILDER_SKILL_ADD_BTN = {
  background: "#fff",
  border: "none",
  color: "#000",
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "inherit",
};

const BUILDER_DESCR_TEXTAREA = {
  minHeight: 130,
  background: "#141414",
  border: "1px solid #2A2A2A",
  borderRadius: 14,
  color: "#fff",
  fontSize: 13,
  lineHeight: 1.7,
  padding: "13px 14px",
  paddingBottom: 30,
  outline: "none",
  resize: "vertical",
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

const EXP_POINTS_PLACEHOLDER =
  "• Each line becomes one bullet on your CV\n• Keep it action-first: Managed, Built, Resolved…\n• Aim for 3–5 strong bullets";

const BUILDER_TECH_CHIP = {
  display: "inline-flex",
  alignItems: "center",
  gap: 4,
  background: "rgba(59,130,246,0.12)",
  border: "1px solid rgba(59,130,246,0.3)",
  color: "#93C5FD",
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
  color: "#60A5FA",
  background: "none",
  border: "none",
  padding: 0,
  lineHeight: 1,
  fontFamily: "inherit",
};

const BUILDER_TECH_SKILL_COUNT_BADGE = {
  fontSize: 10,
  color: "#60A5FA",
  background: "rgba(59,130,246,0.12)",
  border: "1px solid rgba(59,130,246,0.25)",
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
          stroke="rgba(255,255,255,0.9)"
          strokeWidth="2"
          strokeDasharray="12 40"
          strokeLinecap="round"
        />
      </svg>
    </>
  );
}

function ClipboardIconThin({ size = 16, color = "#FFFFFF" }) {
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

function ProfessionalSummaryField({ summary, onChange, saveSuccessTick = 0 }) {
  const [clearAsk, setClearAsk] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setIsDirty(false);
  }, [saveSuccessTick]);

  return (
    <div style={{ position: "relative" }}>
      <style dangerouslySetInnerHTML={{ __html: CVP_BUILDER_PH_CSS }} />
      <div style={{ position: "relative", width: "100%" }}>
        <textarea
          className="cvp-builder-ph"
          style={BUILDER_DESCR_TEXTAREA}
          placeholder="2–3 lines on your strengths, focus, and what you bring to the role…"
          value={summary}
          onChange={(e) => {
            setIsDirty(true);
            onChange(e.target.value);
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "rgba(59,130,246,0.45)";
            e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.08)";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "#2A2A2A";
            e.target.style.boxShadow = "none";
          }}
          data-cvp-summary-dirty={isDirty ? "1" : "0"}
        />
        <span
          style={{
            position: "absolute",
            bottom: 10,
            right: 12,
            fontSize: 10,
            color: "#444",
            pointerEvents: "none",
          }}
        >
          {String(summary || "").length}
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8 }}>
        <List size={11} strokeWidth={1.8} color="#555" aria-hidden />
        <span style={{ fontSize: 11, color: "#555" }}>Keep it to 2–3 sentences — recruiters scan this first</span>
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
          <span style={{ fontSize: 12, color: "#FFFFFF", fontWeight: 500 }}>Clear summary?</span>
          <button
            type="button"
            style={{ background: "none", border: "none", padding: 0, color: "#FFFFFF", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            onClick={() => {
              onChange("");
              setClearAsk(false);
            }}
          >
            Yes
          </button>
          <button
            type="button"
            style={{ background: "none", border: "none", padding: 0, color: "#A0A0A0", fontSize: 12, cursor: "pointer" }}
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
            color: "#FFFFFF",
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
              style={{
                ...CB_UI.input,
                minHeight: 120,
                resize: "vertical",
                fontSize: 14,
              }}
              placeholder="Paste skills separated by commas e.g. Problem-Solving, Communication, Teamwork"
              value={skillsPasteDraft}
              onChange={(e) => setSkillsPasteDraft(e.target.value)}
            />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                style={{ background: "none", border: "none", color: "#A0A0A0", fontSize: 14, cursor: "pointer", padding: "8px 4px" }}
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
            className="cvp-builder-ph cvp-skills-skill-input"
            style={{ ...BUILDER_SKILL_INPUT_BASE }}
            placeholder="Add a skill…"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addSkillsFromInput();
              }
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "rgba(59,130,246,0.45)";
              e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.08)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "#2A2A2A";
              e.target.style.boxShadow = "none";
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
          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6, fontSize: 11, color: "#60A5FA" }}>
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
              background: "rgba(59,130,246,0.06)",
              border: "1px dashed rgba(59,130,246,0.45)",
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
                <Lightbulb size={11} strokeWidth={1.8} color="#60A5FA" aria-hidden />
                <span style={{ fontSize: 11, color: "#60A5FA", fontWeight: 600 }}>Suggestions — not on your CV yet</span>
              </span>
              <button
                type="button"
                title="Dismiss suggestions"
                onClick={() => setSuggestionsDismissed(true)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#A0A0A0",
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
                      border: "1px dashed rgba(59,130,246,0.4)",
                      color: "#60A5FA",
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
    return [{ category: "Technical Skills", chips: ts.split("|").map((s) => s.trim()).filter(Boolean) }];
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
const BUILDER_SECTION_DEFAULT_ORDER = [
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
  const ids = ["summary", "experience", "education"];
  if (extra.includes("certifications")) ids.push("certifications");
  ids.push("skills");
  if (technicalSkillsHasAnyChip(resume)) ids.push("technicalSkills");
  ids.push("languages");
  for (const opt of OPTIONAL_BUILDER_SECTIONS) {
    if (opt.id !== "certifications" && extra.includes(opt.id)) ids.push(opt.id);
  }
  return ids;
}

function resolveOrderedBuilderSectionIds(resume) {
  const visible = builderVisibleSectionIds(resume);
  const visibleSet = new Set(visible);
  const saved = Array.isArray(resume.builderSectionOrder) ? resume.builderSectionOrder : [];
  const ordered = [];
  const seen = new Set();
  for (const id of saved) {
    if (visibleSet.has(id)) {
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

/** @param {{ title: string, subtitle: string, onRowClick: () => void, onMoveUp: () => void, onMoveDown: () => void, disableUp: boolean, disableDown: boolean, onEdit: () => void, onDelete: () => void }} props */
function BuilderEntryRow({ title, subtitle, onRowClick, onMoveUp, onMoveDown, disableUp, disableDown, onEdit, onDelete }) {
  const iconBtn = {
    background: "none",
    border: "none",
    color: "#A0A0A0",
    cursor: "pointer",
    padding: 4,
    borderRadius: 6,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 32,
    minHeight: 32,
  };
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
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        background: "#1C1C1C",
        border: "1px solid #2A2A2A",
        borderRadius: 10,
        padding: "10px 12px",
        cursor: "pointer",
        minHeight: 44,
        boxSizing: "border-box",
      }}
    >
      <span style={{ color: "#A0A0A0", flexShrink: 0, display: "flex", pointerEvents: "none" }} aria-hidden>
        <GripVertical size={14} strokeWidth={1.8} />
      </span>
      <div style={{ flex: 1, minWidth: 0, pointerEvents: "none" }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "#FFFFFF",
            whiteSpace: "normal",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "#A0A0A0",
            whiteSpace: "normal",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {subtitle}
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          <button
            type="button"
            title="Move up"
            disabled={disableUp}
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp();
            }}
            style={{
              ...iconBtn,
              opacity: disableUp ? 0.35 : 1,
              cursor: disableUp ? "not-allowed" : "pointer",
              padding: "1px 3px",
              minWidth: 24,
              minHeight: 20,
            }}
          >
            <ChevronUp size={10} strokeWidth={2.5} aria-hidden />
          </button>
          <button
            type="button"
            title="Move down"
            disabled={disableDown}
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown();
            }}
            style={{
              ...iconBtn,
              opacity: disableDown ? 0.35 : 1,
              cursor: disableDown ? "not-allowed" : "pointer",
              padding: "1px 3px",
              minWidth: 24,
              minHeight: 20,
            }}
          >
            <ChevronDown size={10} strokeWidth={2.5} aria-hidden />
          </button>
        </div>
        <button
          type="button"
          title="Edit"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          style={iconBtn}
        >
          <Pencil size={13} strokeWidth={1.8} aria-hidden />
        </button>
        <button
          type="button"
          title="Delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          style={iconBtn}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#F87171";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "#A0A0A0";
          }}
        >
          <Trash2 size={14} strokeWidth={1.8} aria-hidden />
        </button>
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
          <strong key={i} style={{ color: "#FFFFFF", fontWeight: 700 }}>
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
  el.style.backgroundColor = "#2A2A2A";
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      el.style.backgroundColor = "#1C1C1C";
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
              style={{
                ...CB_UI.input,
                minHeight: 140,
                resize: "vertical",
                fontSize: 14,
              }}
              readOnly={pastePreview != null}
              placeholder='Paste your skills here, one category per line e.g. IT Support Tools: ManageEngine, RDP'
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
            />
            {pastePreview && pastePreview.warn ? (
              <p style={{ fontSize: 12, color: "#CA8A04", margin: 0 }}>{pastePreview.warn}</p>
            ) : null}
            {pastePreview && pastePreview.kind === "category" && (pastePreview.chips || []).length > 0 ? (
              <div style={{ fontSize: 12, color: "#A0A0A0", lineHeight: 1.4 }}>
                {(pastePreview.chips || []).join(" · ")}
              </div>
            ) : null}
            {pastePreview && pastePreview.kind === "global" && pastePreview.rows.length > 0 ? (
              <div style={{ overflowY: "auto", maxHeight: 200, display: "grid", gap: 8 }}>
                {pastePreview.rows.map((row, ri) => (
                  <div key={`${row.category}-${ri}`} style={{ fontSize: 12, color: "#A0A0A0", lineHeight: 1.4 }}>
                    <span style={{ color: "#FFFFFF", fontWeight: 600 }}>{row.category}</span>
                    {row.chips.length > 0 ? `: ${row.chips.join(", ")}` : ""}
                  </div>
                ))}
              </div>
            ) : null}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" }}>
              <button
                type="button"
                style={{ background: "none", border: "none", color: "#A0A0A0", fontSize: 14, cursor: "pointer", padding: "8px 4px" }}
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
            style={{ ...CB_UI.input, minHeight: undefined, flex: "1 1 160px" }}
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
        {groups.length >= 20 ? <p style={{ fontSize: 12, color: "#CA8A04", margin: 0 }}>Maximum 20 categories.</p> : null}

      {groups.map((g, i) => {
        const chipList = skillsArrayForChipRender(g.chips);
        return (
        <div
          key={i}
          style={{
            background: "#1C1C1C",
            border: "1px solid #2A2A2A",
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
              style={{ color: "#A0A0A0", cursor: "grab", flexShrink: 0, display: "flex", touchAction: "none" }}
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
                color: "#FFFFFF",
                fontSize: 12,
                fontWeight: 600,
                outline: "none",
                padding: "2px 0",
                fontFamily: "inherit",
              }}
              onFocus={(e) => {
                e.target.style.borderBottomColor = "rgba(59,130,246,0.35)";
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
              style={{ background: "none", border: "none", cursor: "pointer", color: "#A0A0A0", padding: 4, display: "flex" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#F87171";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#A0A0A0";
              }}
            >
              <Trash2 size={14} strokeWidth={1.8} aria-hidden />
            </button>
          </div>
          {chipList.length === 0 ? (
            <p style={{ fontSize: 12, color: "#F87171", margin: "0 0 8px" }}>
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
              className="cvp-builder-ph cvp-skills-skill-input"
              style={{ ...BUILDER_SKILL_INPUT_BASE }}
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
              onFocus={(e) => {
                e.target.style.borderColor = "rgba(59,130,246,0.45)";
                e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.08)";
              }}
              onBlur={(e) => {
                e.target.style.borderColor = "#2A2A2A";
                e.target.style.boxShadow = "none";
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
              background: "rgba(59,130,246,0.06)",
              border: "1px dashed rgba(59,130,246,0.45)",
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
                <Lightbulb size={11} strokeWidth={1.8} color="#60A5FA" aria-hidden />
                <span style={{ fontSize: 11, color: "#60A5FA", fontWeight: 600 }}>Suggested categories — not on your CV yet</span>
              </span>
              <button
                type="button"
                title="Dismiss suggestions"
                onClick={() => setSuggestedCategoriesDismissed(true)}
                style={{ background: "none", border: "none", color: "#A0A0A0", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }}
              >
                <X size={13} strokeWidth={2} aria-hidden />
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {suggestRows.map((cat) => {
                const added = isSuggestedCategoryAdded(cat);
                return (
                  <div key={cat.category} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <span style={{ fontSize: 12, color: "#A0A0A0" }}>{cat.category}</span>
                    <button
                      type="button"
                      disabled={added || groups.length >= 20}
                      onClick={() => addSuggestedCategory(cat)}
                      style={{
                        background: "#1C1C1C",
                        border: added ? "1px solid #4ADE80" : "1px solid #2A2A2A",
                        color: added ? "#4ADE80" : "#FFFFFF",
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

        {groups.length === 0 ? <p style={{ fontSize: 13, color: "#A0A0A0", margin: 0 }}>Add a category, then add skills as chips.</p> : null}
      </div>
    </>
  );
}

function ResumeBuilder({
  user,
  onBack,
  initialResume,
  initialResumeId,
  initialTemplateId,
  isPro = false,
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const isNew = !!searchParams.get("new");
  const isGuided = searchParams.get("guide") === "true";
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES.find(t => t.id === initialTemplateId) || TEMPLATES[0]);
  const [downloadPhase, setDownloadPhase] = useState("idle");
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [resumeId, setResumeId] = useState(initialResumeId || null);
  const [resume, setResume] = useState(() => {
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
  const [guidedCoachRequestKey, setGuidedCoachRequestKey] = useState(0);
  const [openSection, setOpenSection] = useState(null);
  const [activeSection, setActiveSection] = useState(null);
  const [menuDrawerOpen, setMenuDrawerOpen] = useState(false);
  const [fabSheet, setFabSheet] = useState(null);
  const [previewFadeOut, setPreviewFadeOut] = useState(false);
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
  const [addSectionPickerOpen, setAddSectionPickerOpen] = useState(false);
  const cvFinderPanelRef = useRef(null);
  const cvFinderToggleRef = useRef(null);
  const cvFinderInputRef = useRef(null);
  const previewScrollRef = useRef(null);
  const mobilePreviewScrollRef = useRef(null);
  const desktopPreviewFitRef = useRef(null);
  const desktopPreviewOuterRef = useRef(null);
  const mobilePreviewFitRef = useRef(null);
  const desktopCvPreviewRef = useRef(null);
  const mobileCvPreviewRef = useRef(null);
  const [desktopPreviewContainerWidth, setDesktopPreviewContainerWidth] = useState(0);
  const [mobilePreviewContainerWidth, setMobilePreviewContainerWidth] = useState(0);

  const desktopPreviewScale = useMemo(() => {
    if (!desktopPreviewContainerWidth) return 0.6;
    return Math.min(desktopPreviewContainerWidth / 794, 0.85);
  }, [desktopPreviewContainerWidth]);

  const mobilePreviewScale = useMemo(() => {
    if (!mobilePreviewContainerWidth) return 1;
    return mobilePreviewContainerWidth / A4_PREVIEW_WIDTH_PX;
  }, [mobilePreviewContainerWidth]);
  const [coverLetterOpen, setCoverLetterOpen] = useState(false);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [templatePickPending, setTemplatePickPending] = useState(null);
  const [templateConfirmOpen, setTemplateConfirmOpen] = useState(false);
  const [previewTemplateOverride, setPreviewTemplateOverride] = useState(null);
  const [templatesInteractKey, setTemplatesInteractKey] = useState(0);
  const [templateSessionApplyCount, setTemplateSessionApplyCount] = useState(0);
  const [cvJourney, setCvJourney] = useState({ templateChosen: false, atsChecked: false, coverLetterSeen: false });
  const openAtsChecker = useCallback(() => {
    setCvJourney((j) => (j.atsChecked ? j : { ...j, atsChecked: true }));
    navigate("/ats");
  }, [navigate]);
  const [technicalSkillsFromPrompt, setTechnicalSkillsFromPrompt] = useState(false);
  const fabRef = useRef(null);
  const hasOpenedGuide = useRef(false);
  const builderRootRef = useRef(null);
  const builderIdleT15Ref = useRef(null);
  const builderIdleT25Ref = useRef(null);
  const fabSheetRef = useRef(fabSheet);
  fabSheetRef.current = fabSheet;
  const scheduleBuilderIdleRef = useRef(() => {});
  const prevBuilderTabRef = useRef(null);
  const cvCompletionProgress = useCvProgress(resume);
  const [pdfTargetPages, setPdfTargetPages] = useState(2);
  const [savedAtMs, setSavedAtMs] = useState(null);
  const [savedBadgeLabel, setSavedBadgeLabel] = useState(null);
  const lastSavedSnapshotRef = useRef(null);
  const [showUnsavedBanner, setShowUnsavedBanner] = useState(false);
  const [cvpBannerDismissedStored, setCvpBannerDismissedStored] = useState(
    () => typeof window !== "undefined" && window.localStorage.getItem("cvp_banner_dismissed") === "true"
  );
  const [progressTooltipOpen, setProgressTooltipOpen] = useState(false);
  const progressRingWrapRef = useRef(null);
  const progressRingWrapMobileRef = useRef(null);
  const expModalBodyRef = useRef(null);
  const [expModalScrollShadow, setExpModalScrollShadow] = useState(false);
  const [expModalBulletWarn, setExpModalBulletWarn] = useState(false);
  const [expModalHighEffortDirty, setExpModalHighEffortDirty] = useState(false);
  const [expCloseGuardOpen, setExpCloseGuardOpen] = useState(false);
  const [saveSuccessTick, setSaveSuccessTick] = useState(0);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'templates') setBuilderTab('templates');
  }, []);

  useEffect(() => {
    if (isGuided && !hasOpenedGuide.current) {
      hasOpenedGuide.current = true;
      setGuidedCoachRequestKey((k) => k + 1);
      const id = setTimeout(() => {
        fabRef.current?.openGuidedCoachSheet?.();
      }, 500);
      return () => clearTimeout(id);
    }
  }, [isGuided]);

  useEffect(() => {
    if (lastSavedSnapshotRef.current == null) {
      lastSavedSnapshotRef.current = snapshotResumeForDiscard(resume);
      return;
    }
    setShowUnsavedBanner(JSON.stringify(resume) !== JSON.stringify(lastSavedSnapshotRef.current));
  }, [resume]);

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
    if (!progressTooltipOpen) return;
    const close = (e) => {
      const a = progressRingWrapRef.current?.contains(e.target);
      const b = progressRingWrapMobileRef.current?.contains(e.target);
      if (!a && !b) setProgressTooltipOpen(false);
    };
    const t = window.setTimeout(() => document.addEventListener("click", close), 10);
    return () => {
      clearTimeout(t);
      document.removeEventListener("click", close);
    };
  }, [progressTooltipOpen]);

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
    }
  }, [builderTab]);

  useEffect(() => {
    if (technicalSkillsHasAnyChip({ technicalSkills: resume.technicalSkills })) setTechnicalSkillsFromPrompt(false);
  }, [resume.technicalSkills]);

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
    if (!dirty) return;
    navigate(location.pathname, { replace: true, state: Object.keys(next).length ? next : undefined });
  }, [location.state, location.pathname, navigate]);

  useEffect(() => {
    if (isMobile) return undefined;
    const el = desktopPreviewOuterRef.current;
    if (!el) return undefined;
    const apply = (width) => {
      if (width == null || width < 1) return;
      setDesktopPreviewContainerWidth((prev) => (Math.abs(prev - width) < 1 ? prev : width));
    };
    const ro = new ResizeObserver((entries) => {
      apply(entries[0]?.contentRect?.width);
    });
    ro.observe(el);
    apply(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, [isMobile]);

  useEffect(() => {
    if (fabSheet !== "preview") return;
    const el = mobilePreviewFitRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width == null || width < 1) return;
      setMobilePreviewContainerWidth((prev) => (Math.abs(prev - width) < 1 ? prev : width));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fabSheet]);

  useEffect(() => {
    previewScrollRef.current?.scrollTo(0, 0);
    mobilePreviewScrollRef.current?.scrollTo(0, 0);
  }, [selectedTemplate?.id]);

  useEffect(() => {
    writeFabMemory({ lastTabVisited: builderTab });
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

  useEffect(() => {
    const full = fabSheet === "preview" || previewFadeOut;
    if (full) document.body.classList.add("cvp-builder-full-preview");
    else document.body.classList.remove("cvp-builder-full-preview");
    return () => document.body.classList.remove("cvp-builder-full-preview");
  }, [fabSheet, previewFadeOut]);

  const set = (k, v) => setResume(r => ({ ...r, [k]: v }));

  const orderedBuilderSectionIdList = useMemo(() => resolveOrderedBuilderSectionIds(resume), [resume]);

  const reorderBuilderSection = useCallback((sectionId, direction) => {
    setResume((r) => applyBuilderSectionReorder(r, sectionId, direction));
  }, []);

  const score = builderAtsScore(resume);

  const templateFabRecommendNames = useMemo(() => {
    if (score >= 70) return TEMPLATES.filter((t) => t.tier === "premium").slice(0, 2).map((t) => t.name);
    return TEMPLATES.filter((t) => t.tier === "free").slice(0, 2).map((t) => t.name);
  }, [score]);

  const cvJourneyChrome = cvCompletionProgress.percent >= 100;
  const journeyStepActive = !cvJourney.templateChosen ? 1 : !cvJourney.atsChecked ? 2 : !cvJourney.coverLetterSeen ? 3 : 4;

  const handleSave = useCallback(async () => {
    if (!user?.id) return;
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
      setShowUnsavedBanner(false);
      setSavedAtMs(Date.now());
      setSaveSuccessTick((t) => t + 1);
      setTimeout(() => setSaveStatus(null), 3000);
      // TODO: wire cv_edited on section save — writeFabMemory({ lastAction: "cv_edited", lastActionAt: new Date().toISOString() })
    } catch(e) {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus(null), 3000);
    } finally {
      setSaving(false);
    }
  }, [user, resume, selectedTemplate, resumeId]);

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

  const handleDownload = async () => {
    if (downloadPhase === "loading") return;
    if (isMobile && fabRef.current?.runAtsDownloadGatekeeper) {
      const gate = await fabRef.current.runAtsDownloadGatekeeper();
      if (!gate?.canDownload) return;
    }
    if (downloadUiTimerRef.current != null) {
      clearTimeout(downloadUiTimerRef.current);
      downloadUiTimerRef.current = null;
    }
    setDownloadPhase("loading");
    const spinMs = 2000 + Math.floor(Math.random() * 1001);
    try {
      await new Promise((r) => setTimeout(r, spinMs));
      if (user?.id) await handleSave();
      await new Promise((r) => setTimeout(r, 500));
      const el = isMobile ? mobileCvPreviewRef.current : desktopCvPreviewRef.current;
      if (!el) throw new Error("Preview not ready");
      await downloadResumeFromPreview(resume, el, { maxPages: pdfTargetPages });
      writeFabMemory({
        lastAction: "downloaded",
        lastActionAt: new Date().toISOString(),
        lastTemplateId: selectedTemplate?.id != null ? `T${selectedTemplate.id}` : null,
      });
      setDownloadPhase("success");
      if (downloadUiTimerRef.current != null) clearTimeout(downloadUiTimerRef.current);
      downloadUiTimerRef.current = window.setTimeout(() => {
        downloadUiTimerRef.current = null;
        setDownloadPhase("idle");
      }, 2000);
    } catch (e) {
      console.error(e);
      setDownloadPhase("error");
      if (downloadUiTimerRef.current != null) clearTimeout(downloadUiTimerRef.current);
      downloadUiTimerRef.current = window.setTimeout(() => {
        downloadUiTimerRef.current = null;
        setDownloadPhase("idle");
      }, 3000);
    }
  };

  const templatesPanel = (
    <BuilderTemplatesTab
      resume={resume}
      selectedTemplate={selectedTemplate}
      onApplyTemplate={setSelectedTemplate}
      onApplyTemplateAndGoToContent={(tpl) => {
        setSelectedTemplate(tpl);
        setBuilderTab("content");
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
    setPreviewFadeOut(true);
    setTimeout(() => {
      setFabSheet(null);
      setPreviewFadeOut(false);
      setPreviewTemplateOverride(null);
    }, 300);
  }, []);

  const handleContextualEdit = useCallback(
    (sectionName) => {
      const validSections = ["summary", "experience", "education", "competencies", "languages"];
      if (validSections.includes(sectionName)) {
        setOpenSection(sectionName);
      }
      setGuidedCoachRequestKey((prev) => prev + 1);
      closePreview();
    },
    [closePreview]
  );

  const handleOpenCoverLetter = () => {
    if (!isPro) {
      setUpgradeOpen(true);
      return;
    }
    setCoverLetterOpen(true);
  };

  const runCoverLetterJourneyStep = useCallback(() => {
    setCvJourney((j) => ({ ...j, coverLetterSeen: true }));
    setBuilderTab("jobmatch");
    if (isPro) setCoverLetterOpen(true);
    else setUpgradeOpen(true);
  }, [isPro]);

  const isOpen = (id) => openSection === id;
  const toggleSection = (id) => setOpenSection(s => s === id ? null : id);

  const downloadLoading = downloadPhase === "loading";

  const builderExtraSectionIds = resume.builderExtraSectionIds || [];
  const allOptionalSectionsAdded = OPTIONAL_BUILDER_SECTIONS.every((s) => builderExtraSectionIds.includes(s.id));
  const addSectionPickerRows = useMemo(() => {
    const ids = resume.builderExtraSectionIds ?? [];
    const nav = (id, label) => ({ kind: "nav", id, label });
    const optionalNotAdded = OPTIONAL_BUILDER_SECTIONS.filter((s) => !ids.includes(s.id));
    const certRow = optionalNotAdded.find((s) => s.id === "certifications");
    const restOpt = optionalNotAdded.filter((s) => s.id !== "certifications");
    const rows = [
      nav("summary", "Professional Summary"),
      nav("experience", "Professional Experience"),
      nav("education", "Education"),
    ];
    if (certRow) rows.push({ kind: "optional", ...certRow });
    rows.push(
      nav("skills", "Skills"),
      nav("languages", "Languages"),
      nav("technicalSkills", "Technical Skills"),
    );
    restOpt.forEach((s) => rows.push({ kind: "optional", ...s }));
    return rows;
  }, [resume.builderExtraSectionIds]);

  return (
    <div
      ref={builderRootRef}
      style={{
        minHeight: "100vh",
        height: "100vh",
        width: "100%",
        maxWidth: "100vw",
        overflowX: "hidden",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-page)",
        color: "var(--text-primary)",
        fontFamily: "'DM Sans',sans-serif",
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
          background: "#0A0A0A",
          borderBottom: "1px solid #2A2A2A",
          display: "flex",
          flexDirection: "column",
          alignItems: "stretch",
          padding: 0,
        }}
      >
        <style dangerouslySetInnerHTML={{ __html: ".cvp-cv-finder-input::placeholder{color:rgba(255,255,255,.55)}" }} />
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
            <button type="button" onClick={onBack} aria-label="Back" className="cvp-builder-back" style={{ width: 44, height: 44, minWidth: 44, minHeight: 44, padding: 0, borderRadius: 8, border: "none", background: "transparent", color: "#A0A0A0", cursor: "pointer", display: "grid", placeItems: "center", transition: `color 150ms ${EASE}` }} onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "#A0A0A0"; }}>
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
                      openAtsChecker();
                      return;
                    }
                    setBuilderTab(tab);
                  }}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: "none",
                    background: builderTab === tab ? "#1C1C1C" : "transparent",
                    color: builderTab === tab ? "#FFFFFF" : "#A0A0A0",
                    fontWeight: builderTab === tab ? 600 : 500,
                    fontSize: 14,
                    cursor: "pointer",
                    whiteSpace: "normal",
                    flex: "0 0 auto",
                    transition: `background-color 150ms ${EASE}, color 150ms ${EASE}`,
                  }}
                >
                  {tab === "content" ? "Content" : tab === "templates" ? "Templates" : tab === "ats" ? "ATS Check" : "Job Match"}
                </button>
              ))}
            </div>
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
                color: "#FFFFFF",
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
                color: "#A0A0A0",
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
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <select value={selectedTemplate?.id} onChange={e => setSelectedTemplate(TEMPLATES.find(t => t.id === Number(e.target.value)) || TEMPLATES[0])} className="cvp-builder-topbar-template" style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #2A2A2A", background: "#141414", color: "#FFFFFF", fontSize: 13, cursor: "pointer", minWidth: 0 }}>
              {TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <button type="button" onClick={handleSave} disabled={saving} className="cvp-builder-topbar-save" style={{ padding: "10px 18px", borderRadius: 8, border: "1px solid #2A2A2A", background: "transparent", color: "#A0A0A0", fontSize: 14, cursor: saving ? "not-allowed" : "pointer", transition: `border-color 150ms ${EASE}, color 150ms ${EASE}` }} onMouseEnter={(e) => { if (!saving) { e.currentTarget.style.borderColor = "#FFFFFF"; e.currentTarget.style.color = "#FFFFFF"; } }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2A2A"; e.currentTarget.style.color = "#A0A0A0"; }}>
              {saving ? "Saving..." : saveStatus === "saved" ? "Saved" : "Save"}
            </button>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloadLoading}
                className="cvp-builder-topbar-download"
                style={{
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: downloadLoading ? "1px solid #2A2A2A" : "none",
                  background: downloadLoading ? "#1C1C1C" : "#FFFFFF",
                  color: downloadLoading ? "#FFFFFF" : "#000000",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: downloadLoading ? "not-allowed" : "pointer",
                  transition: `opacity 150ms ${EASE}, background-color 150ms ${EASE}, color 150ms ${EASE}`,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  minWidth: 0,
                }}
                onMouseEnter={(e) => {
                  if (!downloadLoading) e.currentTarget.style.opacity = "0.9";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "1";
                }}
              >
                {downloadLoading ? (
                  <>
                    <BuilderCvPdfSpinner20 />
                    <span>Generating your CV...</span>
                  </>
                ) : null}
                {downloadPhase === "idle" ? <span>Download CV</span> : null}
                {downloadPhase === "success" ? (
                  <>
                    <span style={{ color: "#22C55E", fontSize: 16, lineHeight: 1 }} aria-hidden>
                      ✓
                    </span>
                    <span>Download CV</span>
                  </>
                ) : null}
                {downloadPhase === "error" ? (
                  <>
                    <span>Download CV</span>
                    <span style={{ color: "#EF4444", fontSize: 12, fontWeight: 600 }}>Failed, try again</span>
                  </>
                ) : null}
              </button>
              {downloadLoading ? (
                <p style={{ fontSize: "12px", color: "#A0A0A0", textAlign: "center", marginTop: "8px" }}>
                  Optimizing for Gulf/Indian ATS standards... almost there
                </p>
              ) : null}
            </div>
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
              borderTop: "1px solid #1A1A1A",
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
                    <span style={{ color: "#3A3A3A", fontSize: 10, userSelect: "none" }} aria-hidden>
                      →
                    </span>
                  ) : null}
                  <span style={{ fontSize: 10, fontWeight: on ? 700 : 500, color: on ? "#FFFFFF" : "#666666" }}>{label}</span>
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
                border: "1px solid #2A2A2A",
                background: "#1C1C1C",
                color: "#FFFFFF",
                fontSize: 14,
                outline: "none",
              }}
            />
            {cvFinderQuery.trim() ? (
              <>
                <div style={{ fontSize: 11, color: "#888888" }}>
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
                        border: "1px solid #2A2A2A",
                        background: "#141414",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontSize: 10, color: "#888888", marginBottom: 4 }}>{m.sectionLabel}</div>
                      <div style={{ fontSize: 13, color: "#A0A0A0", lineHeight: 1.35 }}>
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
      {/* Desktop: split 380px | 1fr from 768px up — layout in index.css */}
      {!isMobile ? (
      <div className={`cvp-builder-desktop desktop-preview-panel${builderTab === 'jobmatch' ? ' cvp-jobmatch-active' : ''}${builderTab === 'templates' ? ' cvp-templates-active' : ''}`} style={{ minHeight: 'calc(100vh - 56px)', height: 'auto' }}>
        {/* Left panel — Editor */}
        <aside
          className="cvp-builder-left"
          style={{ width: "100%", minWidth: 0, alignSelf: "start" }}
        >
          {builderTab === "content" && (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  flexWrap: "wrap",
                  padding: "16px 0 12px",
                  borderBottom: "1px solid #2A2A2A",
                  marginBottom: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, fontWeight: 500, color: "#FFF" }}>CVPassport</span>
                  {savedBadgeLabel ? (
                    <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#4ADE80", opacity: 0.85 }}>
                      <span style={{ width: 6, height: 6, background: "#4ADE80", borderRadius: "50%", flexShrink: 0 }} aria-hidden />
                      {savedBadgeLabel}
                    </span>
                  ) : null}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", background: "#1C1C1C", border: "1px solid #2A2A2A", borderRadius: 8, overflow: "hidden", fontSize: 11 }}>
                    <button
                      type="button"
                      onClick={() => setPdfTargetPages(1)}
                      style={{
                        border: "none",
                        background: pdfTargetPages === 1 ? "#3B82F6" : "transparent",
                        color: pdfTargetPages === 1 ? "#FFFFFF" : "#A0A0A0",
                        fontSize: 11,
                        fontWeight: pdfTargetPages === 1 ? 600 : 500,
                        padding: "5px 10px",
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      1 pg
                    </button>
                    <button
                      type="button"
                      onClick={() => setPdfTargetPages(2)}
                      style={{
                        border: "none",
                        background: pdfTargetPages === 2 ? "#3B82F6" : "transparent",
                        color: pdfTargetPages === 2 ? "#FFFFFF" : "#A0A0A0",
                        fontSize: 11,
                        fontWeight: pdfTargetPages === 2 ? 600 : 500,
                        padding: "5px 10px",
                        cursor: "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      2 pg
                    </button>
                  </div>
                  <div ref={progressRingWrapRef} style={{ position: "relative", display: "inline-flex" }}>
                    <button
                      type="button"
                      aria-label="CV completion breakdown"
                      onClick={() => setProgressTooltipOpen((v) => !v)}
                      style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "block", lineHeight: 0 }}
                    >
                      <svg width={42} height={42} viewBox="0 0 42 42" style={{ transform: "rotate(-90deg)" }} aria-hidden>
                        <circle cx="21" cy="21" r="17" fill="none" stroke="#2A2A2A" strokeWidth="3" />
                        <circle
                          cx="21"
                          cy="21"
                          r="17"
                          fill="none"
                          stroke="#3B82F6"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeDasharray="106.8"
                          strokeDashoffset={106.8 - (106.8 * Math.min(100, Math.max(0, cvCompletionProgress.percent))) / 100}
                          style={{ transition: "stroke-dashoffset 0.45s ease" }}
                        />
                      </svg>
                      <span
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 9,
                          fontWeight: 700,
                          color: "#60A5FA",
                          pointerEvents: "none",
                        }}
                      >
                        {Math.round(cvCompletionProgress.percent)}%
                      </span>
                    </button>
                    {progressTooltipOpen ? (
                      <div
                        style={{
                          position: "absolute",
                          bottom: "calc(100% + 10px)",
                          right: 0,
                          background: "#1C1C1C",
                          border: "1px solid #2A2A2A",
                          borderRadius: 12,
                          padding: 12,
                          width: 200,
                          zIndex: 120,
                          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                        }}
                      >
                        <div style={{ fontSize: 11, fontWeight: 600, color: "#60A5FA", marginBottom: 8 }}>CV Completion</div>
                        {CV_PROGRESS_SECTIONS.map((sec) => {
                          const ok = sec.isComplete(resume);
                          const skillCount = splitCommaItems(resume.skills).length;
                          const needSkills = Math.max(0, 3 - skillCount);
                          const warnContent = !ok && sec.id === "skills" && needSkills > 0 ? String(needSkills) : !ok ? "!" : "✓";
                          return (
                            <div
                              key={sec.id}
                              style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#A0A0A0", padding: "3px 0" }}
                            >
                              <span
                                style={{
                                  width: 14,
                                  height: 14,
                                  borderRadius: "50%",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: 8,
                                  flexShrink: 0,
                                  background: ok ? "rgba(74,222,128,0.15)" : "rgba(59,130,246,0.12)",
                                  color: ok ? "#4ADE80" : "#3B82F6",
                                }}
                              >
                                {ok ? "✓" : warnContent}
                              </span>
                              {sec.completedLabel}
                            </div>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* Personal info card — always visible */}
              <div className="cvp-builder-personal-card" style={{ background: "#141414", border: "1px solid #2A2A2A", borderRadius: 16, padding: 16, position: "relative" }}>
                <button type="button" aria-label="Edit" style={{ position: "absolute", top: 12, right: 12, width: 32, height: 32, borderRadius: 999, border: "1px solid #2A2A2A", background: "#1C1C1C", color: "#A0A0A0", cursor: "pointer", display: "grid", placeItems: "center" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                </button>
                <div style={{ display: "grid", gap: 10 }}>
                  <input style={{ ...S.input, background: "#1C1C1C", border: "1px solid #2A2A2A", color: "#FFF" }} placeholder="Full name" value={resume.name} onChange={e=>set("name",e.target.value)} />
                  <input style={{ ...S.input, background: "#1C1C1C", border: "1px solid #2A2A2A", color: "#FFF" }} placeholder="Job title" value={resume.title} onChange={e=>set("title",e.target.value)} />
                  <input style={{ ...S.input, background: "#1C1C1C", border: "1px solid #2A2A2A", color: "#FFF" }} placeholder="Email" value={resume.email} onChange={e=>set("email",e.target.value)} />
                  <input style={{ ...S.input, background: "#1C1C1C", border: "1px solid #2A2A2A", color: "#FFF" }} placeholder="Phone" value={resume.phone} onChange={e=>set("phone",e.target.value)} />
                  <input style={{ ...S.input, background: "#1C1C1C", border: "1px solid #2A2A2A", color: "#FFF" }} placeholder="Location" value={resume.location} onChange={e=>set("location",e.target.value)} />
                </div>
              </div>

              {cvJourneyChrome && !cvJourney.templateChosen ? (
                <div style={{ marginBottom: 16, padding: 14, borderRadius: 12, border: "1px solid #2A2A2A", background: "#141414", display: "grid", gap: 10 }}>
                  <p style={{ margin: 0, fontSize: 14, color: "#E5E5E5", lineHeight: 1.45 }}>Your CV is ready. Now let&apos;s make it shine.</p>
                  <button
                    type="button"
                    onClick={() => setBuilderTab("templates")}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: "none",
                      background: "#FFFFFF",
                      color: "#000000",
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
                      color: "#666666",
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
                <div style={{ marginBottom: 16, padding: 14, borderRadius: 12, border: "1px solid #2A2A2A", background: "#141414", display: "grid", gap: 10 }}>
                  <p style={{ margin: 0, fontSize: 13, color: "#A0A0A0", lineHeight: 1.4 }}>Export your CV as PDF when you&apos;re ready.</p>
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={downloadLoading}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: "none",
                      background: downloadLoading ? "#1C1C1C" : "#FFFFFF",
                      color: downloadLoading ? "#FFFFFF" : "#000000",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: downloadLoading ? "not-allowed" : "pointer",
                      transition: `opacity 150ms ${EASE}, background-color 150ms ${EASE}, color 150ms ${EASE}`,
                    }}
                  >
                    Download Your CV
                  </button>
                </div>
              ) : null}

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
              >
                <div data-cvp-highlight="summary" style={{ borderRadius: 8, padding: 2, margin: -2 }}>
                  <ProfessionalSummaryField summary={resume.summary} onChange={(v) => set("summary", v)} saveSuccessTick={saveSuccessTick} />
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
              >
                <div data-cvp-highlight="experience" style={{ display: "grid", gap: 10, borderRadius: 8, padding: 2, margin: -2 }}>
                  {resume.experience.length === 0 && (
                    <p style={{ fontSize: 13, color: "#A0A0A0", margin: 0 }}>No roles yet. Add your work history below.</p>
                  )}
                  {resume.experience.map((exp, i) => {
                    const period = buildExperiencePeriod(exp) || exp.period || "";
                    const subtitle = [exp.company, exp.location, period].filter(Boolean).join(" · ") || "—";
                    return (
                      <BuilderEntryRow
                        key={i}
                        title={exp.role || "Job title"}
                        subtitle={subtitle}
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
                  <button type="button" onClick={() => setExperienceEditor({ mode: "add", index: -1, draft: { ...EMPTY_EXP } })} className="cvp-builder-add-entry-btn" style={{ ...CB_UI.btn }}>+ Add Experience</button>
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
              >
                <div data-cvp-highlight="education" style={{ display: "grid", gap: 10, borderRadius: 8, padding: 2, margin: -2 }}>
                  {resume.education.length === 0 && (
                    <p style={{ fontSize: 13, color: "#A0A0A0", margin: 0 }}>No education entries yet.</p>
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
                  <button type="button" onClick={() => setEducationEditor({ mode: "add", index: -1, draft: { ...EMPTY_EDU } })} className="cvp-builder-add-entry-btn" style={{ ...CB_UI.btn }}>+ Add Education</button>
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
                      border: "1px dashed #333333",
                      background: "#0A0A0A",
                      boxSizing: "border-box",
                    }}
                  >
                    <p style={{ margin: 0, fontSize: 12, color: "#A0A0A0", lineHeight: 1.35, flex: 1, minWidth: 0 }}>Have technical or IT skills? Add a Technical Skills section</p>
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
                        border: "1px solid #2A2A2A",
                        background: "#1C1C1C",
                        color: "#FFFFFF",
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
              >
                <div data-cvp-highlight="languages" style={{ display: "grid", gap: 12, borderRadius: 8, padding: 2, margin: -2 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {splitCommaItems(resume.languages).map((lg, li) => (
                      <span key={`${lg}-${li}`} style={CB_UI.chip}>
                        {lg}
                        <button type="button" aria-label={`Remove ${lg}`} onClick={() => setResume(r => ({ ...r, languages: splitCommaItems(r.languages).filter((x) => x !== lg).join(", ") }))} style={{ background: "none", border: "none", cursor: "pointer", color: "#A0A0A0", padding: 0, lineHeight: 1 }} onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "#A0A0A0"; }}>×</button>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <input style={{ ...CB_UI.input, flex: 1, minWidth: 0, minHeight: undefined }} placeholder='e.g. English (Fluent)' value={langInput} onChange={e => setLangInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const t = langInput.trim(); if (!t) return; const cur = splitCommaItems(resume.languages); if (cur.includes(t)) return; setResume(r => ({ ...r, languages: [...cur, t].join(", ") })); setLangInput(""); } }} />
                    <button type="button" style={{ ...CB_UI.btn }} onClick={() => { const t = langInput.trim(); if (!t) return; const cur = splitCommaItems(resume.languages); if (cur.includes(t)) return; setResume(r => ({ ...r, languages: [...cur, t].join(", ") })); setLangInput(""); }}>+ Add</button>
                  </div>
                </div>
              </AccordionSection>

              <OptionalBuilderAccordionSections
                resume={resume}
                setResume={setResume}
                filter={(opt) => opt.id !== "certifications" && Boolean(resume.builderExtraSectionIds?.includes(opt.id))}
                certificationEditor={certificationEditor}
                setCertificationEditor={setCertificationEditor}
                isOpen={isOpen}
                toggleSection={toggleSection}
                orderedSectionIds={orderedBuilderSectionIdList}
                onSectionReorder={reorderBuilderSection}
              />
              </div>

              {builderTab === "content" && (
                <button type="button" onClick={() => setAddSectionPickerOpen(true)} className="cvp-builder-add-section" style={{ width: "100%", height: 44, padding: 0, borderRadius: 12, border: "1px dashed #333333", background: "transparent", color: "#A0A0A0", fontWeight: 500, fontSize: 14, cursor: "pointer", transition: `border-color 150ms ${EASE}, color 150ms ${EASE}` }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#FFFFFF"; e.currentTarget.style.color = "#FFFFFF"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#333333"; e.currentTarget.style.color = "#A0A0A0"; }}>+ Add section</button>
              )}
            </>
          )}
          {builderTab === "templates" ? (
            <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden", width: "100%" }}>
              {templatesPanel}
            </div>
          ) : null}
          {builderTab === "jobmatch" && (
            <div style={{ display: "grid", gap: 12 }}>
              <button
                type="button"
                onClick={handleOpenCoverLetter}
                style={{
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: "1px solid #2A2A2A",
                  background: "transparent",
                  color: "#FFFFFF",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: `border-color 150ms ${EASE}`,
                  justifySelf: "start",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#FFFFFF"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2A2A"; }}
              >
                Get Cover Letter
              </button>
              <JobMatch resume={resume} selectedTemplate={selectedTemplate} isPro={isPro} onJobDescriptionChange={setJobHasJd} />
            </div>
          )}
        </aside>

        {/* Right panel — Live Preview; scale = containerWidth/794 (RO on outer wrapper only) */}
        <div className="cvp-builder-preview" ref={previewScrollRef}>
          <div
            ref={desktopPreviewOuterRef}
            style={{
              width: "100%",
              maxWidth: "794px",
              margin: "0 auto",
              minWidth: 0,
              overflow: "hidden",
              height: `${A4_PREVIEW_HEIGHT_PX * desktopPreviewScale}px`,
              boxSizing: "border-box",
              display: "flex",
              justifyContent: "center",
              alignItems: "flex-start",
            }}
          >
            <BuilderA4PreviewScaled
              cv={resume}
              template={selectedTemplate}
              scale={desktopPreviewScale}
              fitRef={desktopPreviewFitRef}
              padded={false}
              previewCardRef={desktopCvPreviewRef}
            />
          </div>
        </div>
      </div>
      ) : null}

      {/* Mobile: single column (default until viewport is at least 768px) */}
      <div
        className="cvp-builder-mobile"
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
        }}
      >
          <div className={`cvp-builder-mobile-form${builderTab === "templates" ? " cvp-builder-mobile-form--templates" : ""}`}>
            {builderTab === "content" && (
              <>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    flexWrap: "wrap",
                    padding: "12px 12px 10px",
                    borderBottom: "1px solid #2A2A2A",
                    marginBottom: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: 18, fontWeight: 500, color: "#FFF" }}>CVPassport</span>
                    {savedBadgeLabel ? (
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#4ADE80", opacity: 0.85 }}>
                        <span style={{ width: 6, height: 6, background: "#4ADE80", borderRadius: "50%", flexShrink: 0 }} aria-hidden />
                        {savedBadgeLabel}
                      </span>
                    ) : null}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", background: "#1C1C1C", border: "1px solid #2A2A2A", borderRadius: 8, overflow: "hidden", fontSize: 11 }}>
                      <button
                        type="button"
                        onClick={() => setPdfTargetPages(1)}
                        style={{
                          border: "none",
                          background: pdfTargetPages === 1 ? "#3B82F6" : "transparent",
                          color: pdfTargetPages === 1 ? "#FFFFFF" : "#A0A0A0",
                          fontSize: 11,
                          fontWeight: pdfTargetPages === 1 ? 600 : 500,
                          padding: "5px 10px",
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        1 pg
                      </button>
                      <button
                        type="button"
                        onClick={() => setPdfTargetPages(2)}
                        style={{
                          border: "none",
                          background: pdfTargetPages === 2 ? "#3B82F6" : "transparent",
                          color: pdfTargetPages === 2 ? "#FFFFFF" : "#A0A0A0",
                          fontSize: 11,
                          fontWeight: pdfTargetPages === 2 ? 600 : 500,
                          padding: "5px 10px",
                          cursor: "pointer",
                          fontFamily: "inherit",
                        }}
                      >
                        2 pg
                      </button>
                    </div>
                    <div ref={progressRingWrapMobileRef} style={{ position: "relative", display: "inline-flex" }}>
                      <button
                        type="button"
                        aria-label="CV completion breakdown"
                        onClick={() => setProgressTooltipOpen((v) => !v)}
                        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "block", lineHeight: 0 }}
                      >
                        <svg width={42} height={42} viewBox="0 0 42 42" style={{ transform: "rotate(-90deg)" }} aria-hidden>
                          <circle cx="21" cy="21" r="17" fill="none" stroke="#2A2A2A" strokeWidth="3" />
                          <circle
                            cx="21"
                            cy="21"
                            r="17"
                            fill="none"
                            stroke="#3B82F6"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeDasharray="106.8"
                            strokeDashoffset={106.8 - (106.8 * Math.min(100, Math.max(0, cvCompletionProgress.percent))) / 100}
                            style={{ transition: "stroke-dashoffset 0.45s ease" }}
                          />
                        </svg>
                        <span
                          style={{
                            position: "absolute",
                            inset: 0,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 9,
                            fontWeight: 700,
                            color: "#60A5FA",
                            pointerEvents: "none",
                          }}
                        >
                          {Math.round(cvCompletionProgress.percent)}%
                        </span>
                      </button>
                      {progressTooltipOpen ? (
                        <div
                          style={{
                            position: "absolute",
                            bottom: "calc(100% + 10px)",
                            right: 0,
                            background: "#1C1C1C",
                            border: "1px solid #2A2A2A",
                            borderRadius: 12,
                            padding: 12,
                            width: 200,
                            zIndex: 120,
                            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                          }}
                        >
                          <div style={{ fontSize: 11, fontWeight: 600, color: "#60A5FA", marginBottom: 8 }}>CV Completion</div>
                          {CV_PROGRESS_SECTIONS.map((sec) => {
                            const ok = sec.isComplete(resume);
                            const skillCount = splitCommaItems(resume.skills).length;
                            const needSkills = Math.max(0, 3 - skillCount);
                            const warnContent = !ok && sec.id === "skills" && needSkills > 0 ? String(needSkills) : !ok ? "!" : "✓";
                            return (
                              <div
                                key={`m-${sec.id}`}
                                style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#A0A0A0", padding: "3px 0" }}
                              >
                                <span
                                  style={{
                                    width: 14,
                                    height: 14,
                                    borderRadius: "50%",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: 8,
                                    flexShrink: 0,
                                    background: ok ? "rgba(74,222,128,0.15)" : "rgba(59,130,246,0.12)",
                                    color: ok ? "#4ADE80" : "#3B82F6",
                                  }}
                                >
                                  {ok ? "✓" : warnContent}
                                </span>
                                {sec.completedLabel}
                              </div>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="cvp-builder-personal-card" style={{ background: "#141414", border: "1px solid #2A2A2A", borderRadius: 16, padding: 16, position: "relative" }}>
                  <div style={{ display: "grid", gap: 10 }}>
                    <input style={{ ...S.input, background: "#1C1C1C", border: "1px solid #2A2A2A", color: "#FFF" }} placeholder="Full name" value={resume.name} onChange={e=>set("name",e.target.value)} />
                    <input style={{ ...S.input, background: "#1C1C1C", border: "1px solid #2A2A2A", color: "#FFF" }} placeholder="Job title" value={resume.title} onChange={e=>set("title",e.target.value)} />
                    <input style={{ ...S.input, background: "#1C1C1C", border: "1px solid #2A2A2A", color: "#FFF" }} placeholder="Email" value={resume.email} onChange={e=>set("email",e.target.value)} />
                    <input style={{ ...S.input, background: "#1C1C1C", border: "1px solid #2A2A2A", color: "#FFF" }} placeholder="Phone" value={resume.phone} onChange={e=>set("phone",e.target.value)} />
                    <input style={{ ...S.input, background: "#1C1C1C", border: "1px solid #2A2A2A", color: "#FFF" }} placeholder="Location" value={resume.location} onChange={e=>set("location",e.target.value)} />
                  </div>
                </div>
                {cvJourneyChrome && !cvJourney.templateChosen ? (
                  <div style={{ margin: "0 12px 12px", padding: 14, borderRadius: 12, border: "1px solid #2A2A2A", background: "#141414", display: "grid", gap: 10 }}>
                    <p style={{ margin: 0, fontSize: 14, color: "#E5E5E5", lineHeight: 1.45 }}>Your CV is ready. Now let&apos;s make it shine.</p>
                    <button
                      type="button"
                      onClick={() => setBuilderTab("templates")}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 8,
                        border: "none",
                        background: "#FFFFFF",
                        color: "#000000",
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
                        color: "#666666",
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
                  <div style={{ margin: "0 12px 12px", padding: 14, borderRadius: 12, border: "1px solid #2A2A2A", background: "#141414", display: "grid", gap: 10 }}>
                    <p style={{ margin: 0, fontSize: 13, color: "#A0A0A0", lineHeight: 1.4 }}>Export your CV as PDF when you&apos;re ready.</p>
                    <button
                      type="button"
                      onClick={handleDownload}
                      disabled={downloadLoading}
                      style={{
                        padding: "10px 14px",
                        borderRadius: 8,
                        border: "none",
                        background: downloadLoading ? "#1C1C1C" : "#FFFFFF",
                        color: downloadLoading ? "#FFFFFF" : "#000000",
                        fontSize: 14,
                        fontWeight: 600,
                        cursor: downloadLoading ? "not-allowed" : "pointer",
                        transition: `opacity 150ms ${EASE}, background-color 150ms ${EASE}, color 150ms ${EASE}`,
                      }}
                    >
                      Download Your CV
                    </button>
                  </div>
                ) : null}
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
              >
                <div data-cvp-highlight="summary" style={{ borderRadius: 8, padding: 2, margin: -2 }}>
                  <ProfessionalSummaryField summary={resume.summary} onChange={(v) => set("summary", v)} saveSuccessTick={saveSuccessTick} />
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
              >
                <div data-cvp-highlight="experience" style={{ display: "grid", gap: 10, borderRadius: 8, padding: 2, margin: -2 }}>
                  {resume.experience.length === 0 && (
                    <p style={{ fontSize: 13, color: "#A0A0A0", margin: 0 }}>No roles yet. Add your work history below.</p>
                  )}
                  {resume.experience.map((exp, i) => {
                    const period = buildExperiencePeriod(exp) || exp.period || "";
                    const subtitle = [exp.company, exp.location, period].filter(Boolean).join(" · ") || "—";
                    return (
                      <BuilderEntryRow
                        key={i}
                        title={exp.role || "Job title"}
                        subtitle={subtitle}
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
                  <button type="button" onClick={() => setExperienceEditor({ mode: "add", index: -1, draft: { ...EMPTY_EXP } })} className="cvp-builder-add-entry-btn" style={{ ...CB_UI.btn }}>+ Add Experience</button>
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
              >
                <div data-cvp-highlight="education" style={{ display: "grid", gap: 10, borderRadius: 8, padding: 2, margin: -2 }}>
                  {resume.education.length === 0 && (
                    <p style={{ fontSize: 13, color: "#A0A0A0", margin: 0 }}>No education entries yet.</p>
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
                  <button type="button" onClick={() => setEducationEditor({ mode: "add", index: -1, draft: { ...EMPTY_EDU } })} className="cvp-builder-add-entry-btn" style={{ ...CB_UI.btn }}>+ Add Education</button>
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
                      border: "1px dashed #333333",
                      background: "#0A0A0A",
                      boxSizing: "border-box",
                    }}
                  >
                    <p style={{ margin: 0, fontSize: 12, color: "#A0A0A0", lineHeight: 1.35, flex: 1, minWidth: 0 }}>Have technical or IT skills? Add a Technical Skills section</p>
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
                        border: "1px solid #2A2A2A",
                        background: "#1C1C1C",
                        color: "#FFFFFF",
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
              >
                <div data-cvp-highlight="languages" style={{ display: "grid", gap: 12, borderRadius: 8, padding: 2, margin: -2 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {splitCommaItems(resume.languages).map((lg, li) => (
                      <span key={`${lg}-${li}`} style={CB_UI.chip}>
                        {lg}
                        <button type="button" aria-label={`Remove ${lg}`} onClick={() => setResume(r => ({ ...r, languages: splitCommaItems(r.languages).filter((x) => x !== lg).join(", ") }))} style={{ background: "none", border: "none", cursor: "pointer", color: "#A0A0A0", padding: 0, lineHeight: 1 }} onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "#A0A0A0"; }}>×</button>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <input style={{ ...CB_UI.input, flex: 1, minWidth: 0, minHeight: undefined }} placeholder='e.g. English (Fluent)' value={langInput} onChange={e => setLangInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const t = langInput.trim(); if (!t) return; const cur = splitCommaItems(resume.languages); if (cur.includes(t)) return; setResume(r => ({ ...r, languages: [...cur, t].join(", ") })); setLangInput(""); } }} />
                    <button type="button" style={{ ...CB_UI.btn }} onClick={() => { const t = langInput.trim(); if (!t) return; const cur = splitCommaItems(resume.languages); if (cur.includes(t)) return; setResume(r => ({ ...r, languages: [...cur, t].join(", ") })); setLangInput(""); }}>+ Add</button>
                  </div>
                </div>
              </AccordionSection>

              <OptionalBuilderAccordionSections
                resume={resume}
                setResume={setResume}
                filter={(opt) => opt.id !== "certifications" && Boolean(resume.builderExtraSectionIds?.includes(opt.id))}
                certificationEditor={certificationEditor}
                setCertificationEditor={setCertificationEditor}
                isOpen={isOpen}
                toggleSection={toggleSection}
                variant="mobileRow"
                orderedSectionIds={orderedBuilderSectionIdList}
                onSectionReorder={reorderBuilderSection}
              />
                </div>
                {builderTab === "content" && (
                  <button type="button" onClick={() => setAddSectionPickerOpen(true)} className="cvp-builder-add-section" style={{ width: "100%", height: 44, padding: 0, borderRadius: 12, border: "1px dashed #333333", background: "transparent", color: "#A0A0A0", fontWeight: 500, fontSize: 14, cursor: "pointer", transition: `border-color 150ms ${EASE}, color 150ms ${EASE}` }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#FFFFFF"; e.currentTarget.style.color = "#FFFFFF"; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#333333"; e.currentTarget.style.color = "#A0A0A0"; }}>+ Add section</button>
                )}
              </>
            )}
            {builderTab === "templates" ? (
            <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden", width: "100%" }}>
              {templatesPanel}
            </div>
          ) : null}
            {builderTab === "jobmatch" && (
              <div style={{ display: "grid", gap: 12, padding: "0 12px 12px" }}>
                <button
                  type="button"
                  onClick={handleOpenCoverLetter}
                  style={{
                    padding: "10px 16px",
                    borderRadius: 8,
                    border: "1px solid #2A2A2A",
                    background: "transparent",
                    color: "#FFFFFF",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: `border-color 150ms ${EASE}`,
                    justifySelf: "start",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#FFFFFF"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2A2A"; }}
                >
                  Get Cover Letter
                </button>
                <JobMatch resume={resume} selectedTemplate={selectedTemplate} isPro={isPro} onJobDescriptionChange={setJobHasJd} />
              </div>
            )}
            <div className="cvp-builder-mobile-download-row" style={{ padding: "12px 10px 88px", marginTop: "auto" }}>
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloadLoading}
                style={{
                  width: "calc(100% - 20px)",
                  margin: "0 10px",
                  boxSizing: "border-box",
                  minHeight: 44,
                  padding: "10px 12px",
                  borderRadius: 9,
                  border: downloadLoading ? "1px solid #2A2A2A" : "none",
                  background: downloadLoading ? "#1C1C1C" : "#FFFFFF",
                  color: downloadLoading ? "#FFFFFF" : "#000000",
                  fontSize: downloadLoading ? 10 : 8.5,
                  fontWeight: 600,
                  cursor: downloadLoading ? "not-allowed" : "pointer",
                  opacity: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  flexWrap: "wrap",
                  transition: `background-color 150ms ${EASE}, color 150ms ${EASE}`,
                }}
              >
                {downloadLoading ? (
                  <>
                    <BuilderCvPdfSpinner20 />
                    <span>Generating your CV...</span>
                  </>
                ) : null}
                {downloadPhase === "idle" ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    <span>Download CV</span>
                  </>
                ) : null}
                {downloadPhase === "success" ? (
                  <>
                    <span style={{ color: "#22C55E", fontSize: 14, lineHeight: 1 }} aria-hidden>
                      ✓
                    </span>
                    <span>Download CV</span>
                  </>
                ) : null}
                {downloadPhase === "error" ? (
                  <>
                    <span>Download CV</span>
                    <span style={{ color: "#EF4444", fontSize: 9, fontWeight: 600 }}>Failed, try again</span>
                  </>
                ) : null}
              </button>
            </div>
            {fabSheet !== "preview" ? (
              <FAB
                ref={fabRef}
                variant="builder"
                activeSection={activeSection}
                tabKey={builderTab}
                atsScore={score}
                setResume={setResume}
                guidedCoachRequestKey={guidedCoachRequestKey}
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
              />
            ) : null}
          </div>

        <div className="cvp-builder-mobile-hidden-capture" aria-hidden style={{ position: "absolute", left: -9999, top: 0, width: 794, height: 1, overflow: "hidden", opacity: 0, pointerEvents: "none", zIndex: -1 }}>
          <div ref={mobileCvPreviewRef} className="cvp-builder-a4-fit" style={{ width: 794 }}>
            <ResumePreview cv={resume} template={selectedTemplate} mobileMode />
          </div>
        </div>

        {fabSheet === "preview" ? (
          <div
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 100,
              width: "100%",
              height: "100dvh",
              maxHeight: "100dvh",
              background: "#111111",
              opacity: previewFadeOut ? 0 : 1,
              transition: "opacity 0.3s ease",
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
                top: 16,
                right: 16,
                background: "#141414",
                border: "1px solid #333",
                borderRadius: "50%",
                width: 40,
                height: 40,
                minHeight: 44,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                fontSize: 18,
                zIndex: 101,
                cursor: "pointer",
                padding: 0,
              }}
            >
              ✕
            </button>
            <div
              ref={mobilePreviewScrollRef}
              style={{
                flex: 1,
                width: "100%",
                minHeight: 0,
                overflowY: "auto",
                overflowX: "hidden",
                paddingTop: 56,
                paddingLeft: 0,
                paddingRight: 0,
                paddingBottom: 16,
                WebkitOverflowScrolling: "touch",
                boxSizing: "border-box",
              }}
            >
              <BuilderA4PreviewScaled
                cv={resume}
                template={previewTemplateOverride ?? selectedTemplate}
                scale={mobilePreviewScale}
                fitRef={mobilePreviewFitRef}
                padded={false}
                onSectionClick={handleContextualEdit}
              />
            </div>
          </div>
        ) : null}

      </div>

      </div>

      <CoverLetterModal
        isOpen={coverLetterOpen}
        onClose={() => setCoverLetterOpen(false)}
        resume={resume}
      />
      <UpgradeModal isOpen={upgradeOpen} onClose={() => setUpgradeOpen(false)} />

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
              background: "#141414",
              display: "flex",
              flexDirection: "column",
              boxSizing: "border-box",
              padding: "10px 10px 12px",
              boxShadow: "-8px 0 32px rgba(0,0,0,0.35)",
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
                  color: "#fff",
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
              <button type="button" aria-label="Close" onClick={() => setMenuDrawerOpen(false)} style={{ width: 44, height: 44, border: "none", background: "transparent", color: "#fff", fontSize: 20, cursor: "pointer" }}>
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
                      openAtsChecker();
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
                    background: "#1C1C1C",
                    color: act ? "#fff" : "#A0A0A0",
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={act ? "#fff" : "#555"} strokeWidth="2" aria-hidden>
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
            <div style={{ height: 1, background: "#2A2A2A", margin: "10px 0 12px" }} />
            <button
              type="button"
              onClick={() => {
                setMenuDrawerOpen(false);
                setFabSheet("preview");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                width: "100%",
                minHeight: 44,
                marginBottom: 8,
                padding: "10px 9px",
                borderRadius: 8,
                border: "0.5px solid #2A2A2A",
                background: "#1C1C1C",
                color: "#fff",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" aria-hidden>
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Preview CV
            </button>
            <button
              type="button"
              disabled={downloadLoading}
              onClick={() => {
                setMenuDrawerOpen(false);
                handleDownload();
              }}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                width: "100%",
                minHeight: 44,
                marginBottom: 8,
                padding: "10px 9px",
                borderRadius: 8,
                border: downloadLoading ? "1px solid #2A2A2A" : "none",
                background: downloadLoading ? "#1C1C1C" : "#fff",
                color: downloadLoading ? "#fff" : "#000",
                fontSize: 12,
                fontWeight: 500,
                cursor: downloadLoading ? "not-allowed" : "pointer",
                transition: `background-color 150ms ${EASE}, color 150ms ${EASE}`,
              }}
            >
              {downloadLoading ? <BuilderCvPdfSpinner20 /> : null}
              {downloadLoading ? null : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              )}
              {downloadLoading ? "Generating your CV..." : "Download CV"}
            </button>
            <div style={{ flex: 1, minHeight: 8 }} aria-hidden />
            <div style={{ paddingTop: 4 }}>
              <div style={{ background: "#1C1C1C", border: "0.5px solid #333", borderRadius: 8, padding: 8 }}>
                <div style={{ color: "#ccc", fontSize: 8, fontWeight: 500, marginBottom: 4 }}>Remove watermark</div>
                <div style={{ color: "#555", fontSize: 7, marginBottom: 8, lineHeight: 1.35 }}>Download HD PDF — upgrade to Pro</div>
                <button
                  type="button"
                  onClick={() => {
                    setMenuDrawerOpen(false);
                    navigate("/pricing");
                  }}
                  style={{
                    width: "100%",
                    minHeight: 36,
                    background: "#fff",
                    color: "#000",
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
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={askCloseExperienceModal}
        >
          <div
            style={{
              position: "relative",
              background: "#1C1C1C",
              border: "1px solid #2A2A2A",
              borderRadius: 12,
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
                    background: "#1C1C1C",
                    border: "1px solid rgba(59,130,246,0.35)",
                    borderRadius: 12,
                    padding: 20,
                    maxWidth: 360,
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <p style={{ margin: "0 0 16px", fontSize: 14, color: "#fff", lineHeight: 1.45 }}>You have unsaved changes. Discard them?</p>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      style={{ ...CB_UI.btn, background: "transparent", color: "#A0A0A0", border: "1px solid #2A2A2A" }}
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
            <h3 style={{ margin: 0, padding: "16px 20px 12px", fontSize: 17, fontWeight: 600, color: "#FFF", borderBottom: "1px solid #2A2A2A", flexShrink: 0 }}>
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
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#A0A0A0", textTransform: "uppercase", letterSpacing: "0.05em" }}>Company name</label>
                  <input style={{ ...CB_UI.input, marginTop: 4, minHeight: undefined }} value={experienceEditor.draft.company} onChange={(e) => setExperienceEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, company: e.target.value } } : null))} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#A0A0A0", textTransform: "uppercase", letterSpacing: "0.05em" }}>Job title</label>
                  <input style={{ ...CB_UI.input, marginTop: 4, minHeight: undefined }} value={experienceEditor.draft.role} onChange={(e) => setExperienceEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, role: e.target.value } } : null))} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "#A0A0A0", textTransform: "uppercase", letterSpacing: "0.05em" }}>Start (MM/YYYY)</label>
                    <input
                      id="cvp-exp-start-date"
                      style={{
                        ...CB_UI.input,
                        marginTop: 4,
                        minHeight: undefined,
                        borderColor: experienceDateErrors.start ? "#EF4444" : undefined,
                        transition: "border-color 200ms cubic-bezier(0.4,0,0.2,1)",
                      }}
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
                      <p style={{ margin: "6px 0 0", fontSize: 11, color: "#EF4444", lineHeight: 1.35 }}>{experienceDateErrors.start}</p>
                    ) : null}
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: "#A0A0A0", textTransform: "uppercase", letterSpacing: "0.05em" }}>End (MM/YYYY)</label>
                    <input
                      id="cvp-exp-end-date"
                      style={{
                        ...CB_UI.input,
                        marginTop: 4,
                        minHeight: undefined,
                        borderColor: experienceDateErrors.end ? "#EF4444" : undefined,
                        transition: "border-color 200ms cubic-bezier(0.4,0,0.2,1)",
                      }}
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
                      <p style={{ margin: "6px 0 0", fontSize: 11, color: "#EF4444", lineHeight: 1.35 }}>{experienceDateErrors.end}</p>
                    ) : null}
                  </div>
                </div>
                {isExperienceEndBeforeStart(
                  experienceEditor.draft.startDate,
                  experienceEditor.draft.endDate,
                  experienceEditor.draft.present
                ) ? (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#F87171" }}>
                    <AlertCircle size={11} strokeWidth={1.8} aria-hidden />
                    End date cannot be before start date
                  </div>
                ) : null}
                <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#A0A0A0", cursor: "pointer" }}>
                  <input type="checkbox" checked={experienceEditor.draft.present} onChange={(e) => setExperienceEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, present: e.target.checked, endDate: e.target.checked ? "" : ev.draft.endDate } } : null))} />
                  Currently working here
                </label>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#A0A0A0", textTransform: "uppercase", letterSpacing: "0.05em" }}>Location</label>
                  <input style={{ ...CB_UI.input, marginTop: 4, minHeight: undefined }} value={experienceEditor.draft.location} onChange={(e) => setExperienceEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, location: e.target.value } } : null))} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "#A0A0A0", textTransform: "uppercase", letterSpacing: "0.05em" }}>Description</label>
                  <style dangerouslySetInnerHTML={{ __html: CVP_BUILDER_PH_CSS }} />
                  <div style={{ position: "relative", width: "100%", marginTop: 4 }}>
                    <textarea
                      className="cvp-builder-ph"
                      style={BUILDER_DESCR_TEXTAREA}
                      placeholder={EXP_POINTS_PLACEHOLDER}
                      value={experienceEditor.draft.points}
                      onChange={(e) => {
                        const v = e.target.value;
                        setExpModalHighEffortDirty(true);
                        if (String(v || "").trim()) setExpModalBulletWarn(false);
                        setExperienceEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, points: v } } : null));
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "rgba(59,130,246,0.45)";
                        e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.08)";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = "#2A2A2A";
                        e.target.style.boxShadow = "none";
                      }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        bottom: 10,
                        right: 12,
                        fontSize: 10,
                        color: "#444",
                        pointerEvents: "none",
                      }}
                    >
                      {String(experienceEditor.draft.points || "").length}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8 }}>
                    <List size={11} strokeWidth={1.8} color="#555" aria-hidden />
                    <span style={{ fontSize: 11, color: "#555" }}>Each line = one bullet on your CV</span>
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
                        background: "rgba(59,130,246,0.1)",
                        border: "1px solid rgba(59,130,246,0.3)",
                        fontSize: 11,
                        color: "#60A5FA",
                      }}
                    >
                      <AlertTriangle size={11} strokeWidth={1.8} aria-hidden />
                      No bullet points added — this may weaken your CV.
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
            <div style={{ flexShrink: 0, borderTop: "1px solid #2A2A2A", padding: "12px 20px 20px", display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" style={{ ...CB_UI.btn, background: "transparent", color: "#A0A0A0", border: "1px solid #2A2A2A" }} onClick={askCloseExperienceModal}>
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

      {educationEditor && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setEducationEditor(null)}
        >
          <div
            style={{ background: "#141414", border: "1px solid #2A2A2A", borderRadius: 12, padding: 20, maxWidth: 520, width: "100%", maxHeight: "90vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 600, color: "#FFF" }}>{educationEditor.mode === "add" ? "Add education" : "Edit education"}</h3>
            <div style={{ display: "grid", gap: 12 }}>
              <div><label style={{ fontSize: 12, color: "#A0A0A0" }}>Institution name</label><input style={{ ...CB_UI.input, marginTop: 4, minHeight: undefined }} value={educationEditor.draft.school} onChange={(e) => setEducationEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, school: e.target.value } } : null))} /></div>
              <div><label style={{ fontSize: 12, color: "#A0A0A0" }}>Degree / qualification</label><input style={{ ...CB_UI.input, marginTop: 4, minHeight: undefined }} value={educationEditor.draft.degree} onChange={(e) => setEducationEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, degree: e.target.value } } : null))} /></div>
              <div><label style={{ fontSize: 12, color: "#A0A0A0" }}>Field of study</label><input style={{ ...CB_UI.input, marginTop: 4, minHeight: undefined }} value={educationEditor.draft.fieldOfStudy || ""} onChange={(e) => setEducationEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, fieldOfStudy: e.target.value } } : null))} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div>
                  <label style={{ fontSize: 12, color: "#A0A0A0" }}>Start (MM/YYYY)</label>
                  <input
                    id="cvp-edu-start-date"
                    style={{
                      ...CB_UI.input,
                      marginTop: 4,
                      minHeight: undefined,
                      borderColor: educationDateErrors.start ? "#EF4444" : undefined,
                      transition: "border-color 200ms cubic-bezier(0.4,0,0.2,1)",
                    }}
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
                    <p style={{ margin: "6px 0 0", fontSize: 11, color: "#EF4444", lineHeight: 1.35 }}>{educationDateErrors.start}</p>
                  ) : null}
                </div>
                <div>
                  <label style={{ fontSize: 12, color: "#A0A0A0" }}>End (MM/YYYY)</label>
                  <input
                    id="cvp-edu-end-date"
                    style={{
                      ...CB_UI.input,
                      marginTop: 4,
                      minHeight: undefined,
                      borderColor: educationDateErrors.end ? "#EF4444" : undefined,
                      transition: "border-color 200ms cubic-bezier(0.4,0,0.2,1)",
                    }}
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
                    <p style={{ margin: "6px 0 0", fontSize: 11, color: "#EF4444", lineHeight: 1.35 }}>{educationDateErrors.end}</p>
                  ) : null}
                </div>
              </div>
              <div><label style={{ fontSize: 12, color: "#A0A0A0" }}>Location (optional)</label><input style={{ ...CB_UI.input, marginTop: 4, minHeight: undefined }} value={educationEditor.draft.location || ""} onChange={(e) => setEducationEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, location: e.target.value } } : null))} /></div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
              <button type="button" style={{ ...CB_UI.btn, background: "transparent", color: "#A0A0A0", border: "1px solid #2A2A2A" }} onClick={() => setEducationEditor(null)}>Cancel</button>
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

      {addSectionPickerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 200,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setAddSectionPickerOpen(false)}
        >
          <div
            style={{ background: "#141414", border: "1px solid #2A2A2A", borderRadius: 12, padding: 20, maxWidth: 400, width: "100%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 12px", fontSize: 17, fontWeight: 600, color: "#FFF" }}>Add optional section</h3>
            <p style={{ fontSize: 13, color: "#A0A0A0", margin: "0 0 16px" }}>Choose a section to add to your CV.</p>
            <div style={{ display: "grid", gap: 8, maxHeight: "55vh", overflowY: "auto" }}>
              {addSectionPickerRows.map((row) => (
                <button
                  key={row.kind === "nav" ? `nav-${row.id}` : row.id}
                  type="button"
                  style={{ ...CB_UI.btn, width: "100%", textAlign: "left" }}
                  onClick={() => {
                    if (row.kind === "nav") {
                      setOpenSection(row.id);
                      setAddSectionPickerOpen(false);
                      return;
                    }
                    setResume((r) => ({
                      ...r,
                      builderExtraSectionIds: [...new Set([...(r.builderExtraSectionIds || []), row.id])],
                    }));
                    setOpenSection(row.id);
                    setAddSectionPickerOpen(false);
                  }}
                >
                  {row.kind === "nav" ? row.label : `+ ${row.label}`}
                </button>
              ))}
              {addSectionPickerRows.length === 0 ? (
                <p style={{ fontSize: 13, color: "#A0A0A0", margin: 0 }}>
                  {allOptionalSectionsAdded ? "All optional sections have been added." : "No sections available."}
                </p>
              ) : null}
            </div>
            <button type="button" style={{ ...CB_UI.btn, marginTop: 16, width: "100%", background: "transparent", color: "#A0A0A0", border: "1px solid #2A2A2A" }} onClick={() => setAddSectionPickerOpen(false)}>Close</button>
          </div>
        </div>
      )}

      {showUnsavedBanner && !cvpBannerDismissedStored ? (
        <div
          className="cvp-builder-unsaved-banner"
          style={{
            position: "fixed",
            bottom: 96,
            left: 16,
            right: 16,
            zIndex: 250,
            background: "#1C1C1C",
            border: "1px solid rgba(59,130,246,0.35)",
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
          <AlertTriangle size={13} strokeWidth={1.8} color="#60A5FA" aria-hidden />
          <span
            style={{
              flex: "1 1 120px",
              minWidth: 0,
              fontSize: 12,
              color: "#60A5FA",
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
                  setResume({
                    ...snap,
                    technicalSkills: normalizeTechnicalSkillsState(snap.technicalSkills),
                  });
                }
                setShowUnsavedBanner(false);
              }}
              style={{
                background: "#3B82F6",
                border: "none",
                color: "#fff",
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
                color: "#fff",
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
    </div>
  );
}

const ACCORDION_ICON_BOX = {
  width: 32,
  height: 32,
  borderRadius: 8,
  background: "rgba(59,130,246,0.08)",
  border: "1px solid rgba(59,130,246,0.15)",
  display: "grid",
  placeItems: "center",
  flexShrink: 0,
  boxSizing: "border-box",
};

function AccordionSectionLucideIcon({ id, icon }) {
  const size = 16;
  const stroke = "#60A5FA";
  const sw = 1.8;
  if (id === "technicalSkills") return <Cpu size={size} color={stroke} strokeWidth={sw} aria-hidden />;
  if (id === "certifications" || icon === "certifications") return <Award size={size} color={stroke} strokeWidth={sw} aria-hidden />;
  if (icon === "summary" || id === "summary") return <FileText size={size} color={stroke} strokeWidth={sw} aria-hidden />;
  if (icon === "experience" || id === "experience") return <Briefcase size={size} color={stroke} strokeWidth={sw} aria-hidden />;
  if (icon === "education" || id === "education") return <GraduationCap size={size} color={stroke} strokeWidth={sw} aria-hidden />;
  if (icon === "languages" || id === "languages") return <Globe size={size} color={stroke} strokeWidth={sw} aria-hidden />;
  if (icon === "skills" || id === "skills") return <Star size={size} color={stroke} strokeWidth={sw} aria-hidden />;
  return <FileText size={size} color={stroke} strokeWidth={sw} aria-hidden />;
}

const ACCORDION_REORDER_BTN = {
  background: "none",
  border: "none",
  padding: 4,
  display: "grid",
  placeItems: "center",
  flexShrink: 0,
  cursor: "pointer",
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
}) {
  const ease = "cubic-bezier(0.4,0,0.2,1)";
  const idx = orderedSectionIds ? orderedSectionIds.indexOf(id) : -1;
  const flexOrder = idx >= 0 ? idx : undefined;
  const canMoveUp = Boolean(onSectionReorder && idx > 0);
  const canMoveDown = Boolean(
    onSectionReorder && orderedSectionIds && idx >= 0 && idx < orderedSectionIds.length - 1
  );

  const reorderUp = (e) => {
    e.stopPropagation();
    if (canMoveUp) onSectionReorder("up");
  };
  const reorderDown = (e) => {
    e.stopPropagation();
    if (canMoveDown) onSectionReorder("down");
  };

  if (variant === "mobileRow") {
    return (
      <div data-cvp-accordion={id} style={{ marginBottom: 5, maxWidth: "100%", order: flexOrder }}>
        <div
          style={{
            display: "flex",
            width: "100%",
            alignItems: "center",
            minWidth: 0,
            gap: 10,
            background: "#141414",
            border: "0.5px solid #2A2A2A",
            borderRadius: 9,
            padding: "8px 12px",
            minHeight: 56,
            boxSizing: "border-box",
          }}
        >
          <div style={ACCORDION_ICON_BOX}>
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
                  color: "#FFFFFF",
                  fontSize: 15,
                  fontWeight: 600,
                  letterSpacing: "0.02em",
                }}
              >
                {title}
              </div>
              {metaSubtitle ? (
                <div style={{ fontSize: 12, color: "#A0A0A0", marginTop: 2, fontWeight: 400 }}>{metaSubtitle}</div>
              ) : null}
            </div>
          </button>
          {onSectionReorder ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 0, flexShrink: 0 }}>
              <button
                type="button"
                aria-label="Move section up"
                disabled={!canMoveUp}
                onClick={reorderUp}
                style={{
                  ...ACCORDION_REORDER_BTN,
                  color: canMoveUp ? "var(--text-secondary, #A0A0A0)" : "#444444",
                  opacity: canMoveUp ? 1 : 0.35,
                  cursor: canMoveUp ? "pointer" : "not-allowed",
                }}
              >
                <ChevronUp size={10} strokeWidth={2} aria-hidden />
              </button>
              <button
                type="button"
                aria-label="Move section down"
                disabled={!canMoveDown}
                onClick={reorderDown}
                style={{
                  ...ACCORDION_REORDER_BTN,
                  color: canMoveDown ? "var(--text-secondary, #A0A0A0)" : "#444444",
                  opacity: canMoveDown ? 1 : 0.35,
                  cursor: canMoveDown ? "pointer" : "not-allowed",
                }}
              >
                <ChevronDown size={10} strokeWidth={2} aria-hidden />
              </button>
            </div>
          ) : null}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            style={{
              backgroundColor: "#FFFFFF",
              color: "#000000",
              border: "none",
              borderRadius: 8,
              padding: "6px 14px",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              letterSpacing: "0.01em",
              flexShrink: 0,
            }}
          >
            Edit
          </button>
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
              color: "#A0A0A0",
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
                background: "#0A0A0A",
                border: "0.5px solid #2A2A2A",
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
  return (
    <div data-cvp-accordion={id} className={`cvp-section-row${isOpen ? " is-open" : ""}`} style={{ order: flexOrder }}>
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
          border: "none",
          borderLeft: isOpen ? "2px solid #FFFFFF" : "2px solid transparent",
          transition: `background-color 150ms ${EASE}, border-color 150ms ${EASE}`,
          boxSizing: "border-box",
        }}
      >
        <div style={ACCORDION_ICON_BOX}>
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
              color: "#FFFFFF",
              letterSpacing: "0.02em",
            }}
          >
            {title}
          </span>
          {metaSubtitle ? <span style={{ fontSize: 12, color: "#A0A0A0", fontWeight: 400 }}>{metaSubtitle}</span> : null}
        </button>
        {onSectionReorder ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 0, flexShrink: 0 }}>
            <button
              type="button"
              aria-label="Move section up"
              disabled={!canMoveUp}
              onClick={reorderUp}
              style={{
                ...ACCORDION_REORDER_BTN,
                color: canMoveUp ? "var(--text-secondary, #A0A0A0)" : "#444444",
                opacity: canMoveUp ? 1 : 0.35,
                cursor: canMoveUp ? "pointer" : "not-allowed",
              }}
            >
              <ChevronUp size={10} strokeWidth={2} aria-hidden />
            </button>
            <button
              type="button"
              aria-label="Move section down"
              disabled={!canMoveDown}
              onClick={reorderDown}
              style={{
                ...ACCORDION_REORDER_BTN,
                color: canMoveDown ? "var(--text-secondary, #A0A0A0)" : "#444444",
                opacity: canMoveDown ? 1 : 0.35,
                cursor: canMoveDown ? "pointer" : "not-allowed",
              }}
            >
              <ChevronDown size={10} strokeWidth={2} aria-hidden />
            </button>
          </div>
        ) : null}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          style={{
            flexShrink: 0,
            backgroundColor: "#FFFFFF",
            color: "#000000",
            border: "none",
            borderRadius: 12,
            padding: "6px 14px",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
            letterSpacing: "0.01em",
          }}
        >
          Edit
        </button>
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
            color: "#A0A0A0",
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
              background: "#141414",
              borderTop: "1px solid #2A2A2A",
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
  return <ResumeBuilder {...props} />;
}
