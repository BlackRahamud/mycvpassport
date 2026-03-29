import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import JobMatch from "../JobMatch";
import CoverLetterModal from "../CoverLetterModal";
import UpgradeModal from "../UpgradeModal";
import { FAB } from "../components/FAB";
import { writeFabMemory } from "../components/FAB/FABLogic";
import { supabase } from "../appSupabaseClient";
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
  builderAtsBreakdown,
} from "../cvShared";
import { CB_UI, S } from "../builderStyles";
import { ResumePreview, BuilderA4PreviewScaled, A4_PREVIEW_WIDTH_PX } from "../ResumePreview";
import { CoverLetterSpinnerArrow } from "./CoverLetterPage";
import { useCvProgress } from "../hooks/useCvProgress";

function BuilderAtsPassFailIcon({ pass }) {
  const fill = pass ? "#22C55E" : "#EF4444";
  return (
    <svg width={22} height={22} viewBox="0 0 22 22" aria-hidden style={{ flexShrink: 0 }}>
      <circle cx={11} cy={11} r={11} fill={fill} />
      {pass ? (
        <path d="M5 11 L9 15 L17 7" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <>
          <path d="M6 6 L16 16" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" />
          <path d="M16 6 L6 16" fill="none" stroke="#fff" strokeWidth={2} strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}

function BuilderAtsTabContent({ resume }) {
  const score = builderAtsScore(resume);
  const breakdown = builderAtsBreakdown(resume);
  const pct = Math.max(0, Math.min(100, score));
  const r = 40.5;
  const c = 2 * Math.PI * r;
  const arcLen = (pct / 100) * c;
  const dashActive = `${arcLen} ${c}`;
  let singleStroke = "#E24B4A";
  if (pct >= 41 && pct < 71) singleStroke = "#EF9F27";
  if (pct >= 71) singleStroke = "#1D9E75";
  return (
    <div style={{ padding: "0 12px 16px", maxWidth: "100%", overflow: "hidden", boxSizing: "border-box" }}>
      <style>{`
        @keyframes cvpAtsFlicker { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 16 }}>
        <div style={{ position: "relative", width: 88, height: 88 }}>
          <svg width="88" height="88" viewBox="0 0 88 88" aria-hidden>
            <circle cx="44" cy="44" r={r} fill="none" stroke="#1C1C1C" strokeWidth="7" />
            {pct >= 71 ? (
              <>
                <circle
                  cx="44"
                  cy="44"
                  r={r}
                  fill="none"
                  stroke="#1D9E75"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={dashActive}
                  transform="rotate(-90 44 44)"
                />
                <circle
                  cx="44"
                  cy="44"
                  r={r}
                  fill="none"
                  stroke="#EF9F27"
                  strokeWidth="7"
                  strokeLinecap="round"
                  strokeDasharray={dashActive}
                  transform="rotate(-90 44 44)"
                  style={{ animation: "cvpAtsFlicker 0.9s ease-in-out infinite" }}
                />
              </>
            ) : (
              <circle
                cx="44"
                cy="44"
                r={r}
                fill="none"
                stroke={singleStroke}
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={dashActive}
                transform="rotate(-90 44 44)"
              />
            )}
          </svg>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <span style={{ fontSize: 20, fontWeight: 500, color: "#fff", lineHeight: 1 }}>{pct}</span>
            <span style={{ fontSize: 7, color: "#666", marginTop: 2 }}>ATS Score</span>
          </div>
        </div>
        <div style={{ color: "#666", fontSize: 8.5, marginTop: 5, textAlign: "center" }}>ATS Readiness Score</div>
      </div>
      <div style={{ marginTop: 12 }}>
        {breakdown.map((row, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "6px 0",
              borderBottom: "0.5px solid #1A1A1A",
            }}
          >
            <BuilderAtsPassFailIcon pass={row.pass} />
            <span style={{ color: "#aaa", fontSize: 8, lineHeight: 1.35 }}>{row.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CertificationsBuilderSection({ resume, setResume, certificationEditor, setCertificationEditor, onRemoveSection }) {
  const list = normalizeCertificationsArray(resume.certifications);
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {list.length === 0 && !certificationEditor && (
        <p style={{ fontSize: 13, color: "#A0A0A0", margin: 0 }}>No certifications yet. Add one below.</p>
      )}
      {list.map((c, i) => (
        <div
          key={i}
          style={{
            background: "#1C1C1C",
            border: "1px solid #2A2A2A",
            borderRadius: 8,
            padding: "12px 16px",
            marginBottom: 8,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <button
            type="button"
            onClick={() => setCertificationEditor({ mode: "edit", index: i, draft: { ...EMPTY_CERT, ...c } })}
            style={{ flex: 1, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", color: "#FFFFFF", minWidth: 0 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#FFFFFF" }}>{c.name || "Certification"}</div>
                {c.issuer ? <div style={{ fontSize: 12, color: "#A0A0A0", marginTop: 2 }}>{c.issuer}</div> : null}
              </div>
              {c.year ? (
                <span style={{ fontSize: 12, color: "#A0A0A0", flexShrink: 0, textAlign: "right" }}>{c.year}</span>
              ) : (
                <span style={{ width: 0, flexShrink: 0 }} />
              )}
            </div>
          </button>
          <button
            type="button"
            aria-label="Delete certification"
            onClick={(e) => {
              e.stopPropagation();
              setResume((r) => ({
                ...r,
                certifications: normalizeCertificationsArray(r.certifications).filter((_, j) => j !== i),
              }));
            }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#A0A0A0", padding: 4, flexShrink: 0 }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#A0A0A0"; }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>
          </button>
        </div>
      ))}
      {certificationEditor && (
        <div style={{ background: "#141414", border: "1px solid #2A2A2A", borderRadius: 8, padding: 16, display: "grid", gap: 10 }}>
          <div>
            <label style={{ fontSize: 12, color: "#A0A0A0", display: "block", marginBottom: 4 }}>Name</label>
            <input
              style={{ ...CB_UI.input, marginTop: 0 }}
              placeholder="Certification name"
              value={certificationEditor.draft.name}
              onChange={(e) => setCertificationEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, name: e.target.value } } : null))}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "#A0A0A0", display: "block", marginBottom: 4 }}>Issuer</label>
            <input
              style={{ ...CB_UI.input, marginTop: 0 }}
              placeholder="Issuing organisation (optional)"
              value={certificationEditor.draft.issuer}
              onChange={(e) => setCertificationEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, issuer: e.target.value } } : null))}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: "#A0A0A0", display: "block", marginBottom: 4 }}>Year</label>
            <input
              style={{ ...CB_UI.input, marginTop: 0 }}
              placeholder="Year (optional)"
              value={certificationEditor.draft.year}
              onChange={(e) => setCertificationEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, year: e.target.value } } : null))}
            />
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
function ResumeBuilder({ user, onBack, initialResume, initialResumeId, initialTemplateId, isPro = false }) {
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES.find(t => t.id === initialTemplateId) || TEMPLATES[0]);
  const [downloading, setDownloading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(null);
  const [resumeId, setResumeId] = useState(initialResumeId || null);
  const [resume, setResume] = useState(() =>
    normalizeResumeForBuilder(initialResume || { ...EMPTY_RESUME, name: user?.name || "", email: user?.email || "" })
  );
  const [builderTab, setBuilderTab] = useState("content");
  const [openSection, setOpenSection] = useState(null);
  const [menuDrawerOpen, setMenuDrawerOpen] = useState(false);
  const [fabSheet, setFabSheet] = useState(null);
  const [previewFadeOut, setPreviewFadeOut] = useState(false);
  const [, setJobHasJd] = useState(false);
  const [experienceEditor, setExperienceEditor] = useState(null);
  const [educationEditor, setEducationEditor] = useState(null);
  const [certificationEditor, setCertificationEditor] = useState(null);
  const [skillInput, setSkillInput] = useState("");
  const [langInput, setLangInput] = useState("");
  const [addSectionPickerOpen, setAddSectionPickerOpen] = useState(false);
  const previewScrollRef = useRef(null);
  const mobilePreviewScrollRef = useRef(null);
  const desktopPreviewFitRef = useRef(null);
  const mobilePreviewFitRef = useRef(null);
  const desktopCvPreviewRef = useRef(null);
  const mobileCvPreviewRef = useRef(null);
  const [desktopPreviewContainerWidth, setDesktopPreviewContainerWidth] = useState(0);
  const [mobilePreviewContainerWidth, setMobilePreviewContainerWidth] = useState(0);

  const desktopPreviewScale = useMemo(() => {
    if (!desktopPreviewContainerWidth) return 1;
    return desktopPreviewContainerWidth / A4_PREVIEW_WIDTH_PX;
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
  const fabRef = useRef(null);
  const prevBuilderTabRef = useRef(null);
  const cvCompletionProgress = useCvProgress(resume);

  useEffect(() => {
    const prev = prevBuilderTabRef.current;
    prevBuilderTabRef.current = builderTab;
    if (builderTab === "templates" && prev != null && prev !== "templates") {
      setTemplateSessionApplyCount(0);
    }
  }, [builderTab]);

  useEffect(() => {
    const el = desktopPreviewFitRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width == null || width < 1) return;
      setDesktopPreviewContainerWidth((prev) => {
        if (Math.abs(prev - width) < 1) return prev;
        return width;
      });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

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

  useEffect(() => {
    const full = fabSheet === "preview" || previewFadeOut;
    if (full) document.body.classList.add("cvp-builder-full-preview");
    else document.body.classList.remove("cvp-builder-full-preview");
    return () => document.body.classList.remove("cvp-builder-full-preview");
  }, [fabSheet, previewFadeOut]);

  const set = (k, v) => setResume(r => ({ ...r, [k]: v }));

  const score = builderAtsScore(resume);

  const templateFabRecommendNames = useMemo(() => {
    if (score >= 70) return TEMPLATES.filter((t) => t.tier === "premium").slice(0, 2).map((t) => t.name);
    return TEMPLATES.filter((t) => t.tier === "free").slice(0, 2).map((t) => t.name);
  }, [score]);

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
      }}
      pendingTemplate={templatePickPending}
      confirmOpen={templateConfirmOpen}
      onPendingTemplateChange={setTemplatePickPending}
      onConfirmOpenChange={setTemplateConfirmOpen}
      onTemplatesFabInteract={() => setTemplatesInteractKey((k) => k + 1)}
    />
  );

  const handleSave = useCallback(async () => {
    if (!user?.id) return;
    setSaving(true);
    try {
      const saved = await saveResume(user.id, resume, selectedTemplate.id, resumeId);
      if (supabase) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error } = await supabase
            .from('cvs')
            .insert([{ user_id: user.id }]);
          if (error) console.error('Error tracking CV creation:', error);
        }
      }
      setResumeId(saved.id);
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(null), 3000);
      // TODO: wire cv_edited on section save — writeFabMemory({ lastAction: "cv_edited", lastActionAt: new Date().toISOString() })
    } catch(e) {
      setSaveStatus("error");
      setTimeout(() => setSaveStatus(null), 3000);
    } finally {
      setSaving(false);
    }
  }, [user, resume, selectedTemplate, resumeId]);

  const handleDownload = async () => {
    const isMobileViewport = window.matchMedia("(max-width: 767px)").matches;
    if (isMobileViewport && builderTab === "ats" && fabRef.current?.runAtsDownloadGatekeeper) {
      const gate = await fabRef.current.runAtsDownloadGatekeeper();
      if (!gate?.canDownload) return;
    }
    setDownloading(true);
    const spinMs = 2000 + Math.floor(Math.random() * 1001);
    try {
      await new Promise((r) => setTimeout(r, spinMs));
      if (user?.id) await handleSave();
      await new Promise((r) => setTimeout(r, 500));
      const el = isMobileViewport ? mobileCvPreviewRef.current : desktopCvPreviewRef.current;
      if (!el) throw new Error("Preview not ready");
      await downloadResumeFromPreview(resume, el);
      writeFabMemory({
        lastAction: "downloaded",
        lastActionAt: new Date().toISOString(),
        lastTemplateId: selectedTemplate?.id != null ? `T${selectedTemplate.id}` : null,
      });
    } catch (e) {
      alert("PDF error: " + e.message);
    } finally {
      setDownloading(false);
    }
  };

  const navigateToProAtsPage = useCallback(() => {
    navigate("/ats");
    setFabSheet(null);
  }, [navigate]);

  const closePreview = useCallback(() => {
    setPreviewFadeOut(true);
    setTimeout(() => {
      setFabSheet(null);
      setPreviewFadeOut(false);
      setPreviewTemplateOverride(null);
    }, 300);
  }, []);

  const handleOpenCoverLetter = () => {
    if (!isPro) {
      setUpgradeOpen(true);
      return;
    }
    setCoverLetterOpen(true);
  };

  const isOpen = (id) => openSection === id;
  const toggleSection = (id) => setOpenSection(s => s === id ? null : id);

  const builderExtraSectionIds = resume.builderExtraSectionIds || [];
  const availableOptionalSections = OPTIONAL_BUILDER_SECTIONS.filter((s) => !builderExtraSectionIds.includes(s.id));
  const allOptionalSectionsAdded = OPTIONAL_BUILDER_SECTIONS.every((s) => builderExtraSectionIds.includes(s.id));

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-page)", color: "var(--text-primary)", fontFamily: "'DM Sans',sans-serif" }}>
      {/* Top nav bar — 56px, Download = only primary */}
      <header
        className="cvp-builder-topbar"
        style={{
          flexShrink: 0,
          height: 56,
          position: "sticky",
          top: 0,
          zIndex: 100,
          background: "#0A0A0A",
          borderBottom: "1px solid #2A2A2A",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 24px",
          flexWrap: "wrap",
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
                onClick={() => setBuilderTab(tab)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "none",
                  background: builderTab === tab ? "#1C1C1C" : "transparent",
                  color: builderTab === tab ? "#FFFFFF" : "#A0A0A0",
                  fontWeight: builderTab === tab ? 600 : 500,
                  fontSize: 14,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  flex: "0 0 auto",
                  transition: `background-color 150ms ${EASE}, color 150ms ${EASE}`,
                }}
              >
                {tab === "content" ? "Content" : tab === "templates" ? "Templates" : tab === "ats" ? "ATS Check" : "Job Match"}
              </button>
            ))}
          </div>
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
          <select value={selectedTemplate?.id} onChange={e => setSelectedTemplate(TEMPLATES.find(t => t.id === Number(e.target.value)) || TEMPLATES[0])} className="cvp-builder-topbar-template" style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #2A2A2A", background: "#141414", color: "#FFFFFF", fontSize: 13, cursor: "pointer", minWidth: 140 }}>
            {TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
          <button type="button" onClick={handleSave} disabled={saving} className="cvp-builder-topbar-save" style={{ padding: "10px 18px", borderRadius: 8, border: "1px solid #2A2A2A", background: "transparent", color: "#A0A0A0", fontSize: 14, cursor: saving ? "not-allowed" : "pointer", transition: `border-color 150ms ${EASE}, color 150ms ${EASE}` }} onMouseEnter={(e) => { if (!saving) { e.currentTarget.style.borderColor = "#FFFFFF"; e.currentTarget.style.color = "#FFFFFF"; } }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2A2A2A"; e.currentTarget.style.color = "#A0A0A0"; }}>
            {saving ? "Saving..." : saveStatus === "saved" ? "Saved" : "Save"}
          </button>
          <button type="button" onClick={handleDownload} disabled={downloading} className="cvp-builder-topbar-download" style={{ padding: "10px 16px", borderRadius: 8, border: "none", background: "#FFFFFF", color: "#000000", fontSize: 14, fontWeight: 600, cursor: downloading ? "not-allowed" : "pointer", transition: `opacity 150ms ${EASE}`, display: "inline-flex", alignItems: "center", gap: 8 }} onMouseEnter={(e) => { if (!downloading) e.currentTarget.style.opacity = "0.9"; }} onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}>
            {downloading ? (
              <>
                <span style={{ display: "inline-flex", transform: "scale(0.42)", transformOrigin: "center" }}>
                  <CoverLetterSpinnerArrow size={44} />
                </span>
                Preparing...
              </>
            ) : (
              "Download"
            )}
          </button>
        </div>
      </header>

      {/* Desktop: split 380px | 1fr — layout in index.css */}
      <div className="cvp-builder-desktop">
        {/* Left panel — Editor */}
        <aside className="cvp-builder-left">
          {builderTab === "content" && (
            <>
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

              <div className="cvp-sections-list">
              <AccordionSection id="summary" title="Professional Summary" isOpen={isOpen("summary")} onToggle={() => toggleSection("summary")} icon="summary">
                <div>
                  <textarea style={{ ...CB_UI.input, height: 100, resize: "vertical" }} placeholder="2–3 lines summary..." value={resume.summary} onChange={e=>set("summary",e.target.value)} />
                </div>
              </AccordionSection>

              <AccordionSection id="experience" title="Professional Experience" isOpen={isOpen("experience")} onToggle={() => toggleSection("experience")} icon="experience">
                <div style={{ display: "grid", gap: 10 }}>
                  {resume.experience.length === 0 && (
                    <p style={{ fontSize: 13, color: "#A0A0A0", margin: 0 }}>No roles yet. Add your work history below.</p>
                  )}
                  {resume.experience.map((exp, i) => (
                    <div key={i} style={{ ...CB_UI.card, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <button type="button" onClick={() => setExperienceEditor({ mode: "edit", index: i, draft: { ...EMPTY_EXP, ...exp } })} style={{ flex: 1, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", color: "#FFFFFF", minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{exp.role || "Job title"}</div>
                        <div style={{ fontSize: 13, color: "#A0A0A0" }}>{exp.company || "Company"}{exp.location ? ` · ${exp.location}` : ""}</div>
                        <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>{buildExperiencePeriod(exp) || exp.period || "Dates"}</div>
                      </button>
                      <button type="button" aria-label="Delete experience" onClick={(e) => { e.stopPropagation(); setResume(r => ({ ...r, experience: r.experience.filter((_, j) => j !== i) })); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#A0A0A0", padding: 4 }} onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "#A0A0A0"; }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setExperienceEditor({ mode: "add", index: -1, draft: { ...EMPTY_EXP } })} className="cvp-builder-add-entry-btn" style={{ ...CB_UI.btn }}>+ Add Experience</button>
                </div>
              </AccordionSection>

              <AccordionSection id="education" title="Education" isOpen={isOpen("education")} onToggle={() => toggleSection("education")} icon="education">
                <div style={{ display: "grid", gap: 10 }}>
                  {resume.education.length === 0 && (
                    <p style={{ fontSize: 13, color: "#A0A0A0", margin: 0 }}>No education entries yet.</p>
                  )}
                  {resume.education.map((edu, i) => (
                    <div key={i} style={{ ...CB_UI.card, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <button type="button" onClick={() => setEducationEditor({ mode: "edit", index: i, draft: { ...EMPTY_EDU, ...edu } })} style={{ flex: 1, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", color: "#FFFFFF", minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{edu.degree || "Degree"}</div>
                        <div style={{ fontSize: 13, color: "#A0A0A0" }}>{edu.school || "Institution"}</div>
                        {edu.fieldOfStudy ? <div style={{ fontSize: 12, color: "#888" }}>{edu.fieldOfStudy}</div> : null}
                        <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>{buildEducationYearLine(edu) || edu.year || ""}</div>
                      </button>
                      <button type="button" aria-label="Delete education" onClick={(e) => { e.stopPropagation(); setResume(r => ({ ...r, education: r.education.filter((_, j) => j !== i) })); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#A0A0A0", padding: 4 }} onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "#A0A0A0"; }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setEducationEditor({ mode: "add", index: -1, draft: { ...EMPTY_EDU } })} className="cvp-builder-add-entry-btn" style={{ ...CB_UI.btn }}>+ Add Education</button>
                </div>
              </AccordionSection>

              <AccordionSection id="skills" title="Core Competencies" isOpen={isOpen("skills")} onToggle={() => toggleSection("skills")} icon="skills">
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {splitCommaItems(resume.skills).map((sk, si) => (
                      <span key={`${sk}-${si}`} style={CB_UI.chip}>
                        {sk}
                        <button type="button" aria-label={`Remove ${sk}`} onClick={() => setResume(r => ({ ...r, skills: splitCommaItems(r.skills).filter((x) => x !== sk).join(", ") }))} style={{ background: "none", border: "none", cursor: "pointer", color: "#A0A0A0", padding: 0, lineHeight: 1 }} onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "#A0A0A0"; }}>×</button>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    <input style={{ ...CB_UI.input }} placeholder="Add a skill" value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const t = skillInput.trim(); if (!t) return; const cur = splitCommaItems(resume.skills); if (cur.includes(t)) return; setResume(r => ({ ...r, skills: [...cur, t].join(", ") })); setSkillInput(""); } }} />
                    <button type="button" className="cvp-builder-add-entry-btn" style={{ ...CB_UI.btn }} onClick={() => { const t = skillInput.trim(); if (!t) return; const cur = splitCommaItems(resume.skills); if (cur.includes(t)) return; setResume(r => ({ ...r, skills: [...cur, t].join(", ") })); setSkillInput(""); }}>+ Add</button>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "#A0A0A0", display: "block", marginBottom: 6 }}>Technical skills</label>
                    <input style={CB_UI.input} placeholder="e.g. Python, SQL" value={resume.technicalSkills} onChange={e=>set("technicalSkills",e.target.value)} />
                  </div>
                </div>
              </AccordionSection>

              <AccordionSection id="languages" title="Languages" isOpen={isOpen("languages")} onToggle={() => toggleSection("languages")} icon="languages">
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {splitCommaItems(resume.languages).map((lg, li) => (
                      <span key={`${lg}-${li}`} style={CB_UI.chip}>
                        {lg}
                        <button type="button" aria-label={`Remove ${lg}`} onClick={() => setResume(r => ({ ...r, languages: splitCommaItems(r.languages).filter((x) => x !== lg).join(", ") }))} style={{ background: "none", border: "none", cursor: "pointer", color: "#A0A0A0", padding: 0, lineHeight: 1 }} onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "#A0A0A0"; }}>×</button>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <input style={{ ...CB_UI.input, flex: 1, minWidth: 120 }} placeholder='e.g. English (Fluent)' value={langInput} onChange={e => setLangInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const t = langInput.trim(); if (!t) return; const cur = splitCommaItems(resume.languages); if (cur.includes(t)) return; setResume(r => ({ ...r, languages: [...cur, t].join(", ") })); setLangInput(""); } }} />
                    <button type="button" style={{ ...CB_UI.btn }} onClick={() => { const t = langInput.trim(); if (!t) return; const cur = splitCommaItems(resume.languages); if (cur.includes(t)) return; setResume(r => ({ ...r, languages: [...cur, t].join(", ") })); setLangInput(""); }}>+ Add</button>
                  </div>
                </div>
              </AccordionSection>

              {OPTIONAL_BUILDER_SECTIONS.filter((opt) => resume.builderExtraSectionIds?.includes(opt.id)).map((opt) => (
                <AccordionSection key={opt.id} id={opt.id} title={opt.label} isOpen={isOpen(opt.id)} onToggle={() => toggleSection(opt.id)} icon={opt.id}>
                  {opt.id === "certifications" ? (
                    <CertificationsBuilderSection
                      resume={resume}
                      setResume={setResume}
                      certificationEditor={certificationEditor}
                      setCertificationEditor={setCertificationEditor}
                      onRemoveSection={() => {
                        setCertificationEditor(null);
                        setResume((r) => ({ ...r, builderExtraSectionIds: (r.builderExtraSectionIds || []).filter((x) => x !== opt.id) }));
                      }}
                    />
                  ) : (
                    <div style={{ display: "grid", gap: 8 }}>
                      {opt.multiline ? (
                        <textarea style={{ ...CB_UI.input, minHeight: 100, resize: "vertical" }} placeholder={opt.label} value={resume[opt.field] || ""} onChange={(e) => setResume((r) => ({ ...r, [opt.field]: e.target.value }))} />
                      ) : (
                        <input style={CB_UI.input} value={resume[opt.field] || ""} onChange={(e) => setResume((r) => ({ ...r, [opt.field]: e.target.value }))} />
                      )}
                      <button type="button" style={{ ...CB_UI.btn, alignSelf: "flex-start", background: "transparent", color: "#A0A0A0", border: "1px solid #2A2A2A" }} onClick={() => setResume((r) => ({ ...r, builderExtraSectionIds: (r.builderExtraSectionIds || []).filter((x) => x !== opt.id) }))}>Remove section</button>
                    </div>
                  )}
                </AccordionSection>
              ))}
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
          {builderTab === "ats" && <BuilderAtsTabContent resume={resume} />}
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

        {/* Right panel — Live Preview; scale-to-fit (794px A4) */}
        <div className="cvp-builder-preview" ref={previewScrollRef}>
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

      {/* Mobile: single column */}
      <div className="cvp-builder-mobile" style={{ display: "none", flexDirection: "column", flex: 1, minHeight: 0, position: "relative", maxWidth: "100vw", overflowX: "hidden", overflowY: "visible" }}>
          <div className={`cvp-builder-mobile-form${builderTab === "templates" ? " cvp-builder-mobile-form--templates" : ""}`}>
            {builderTab === "content" && (
              <>
                <div className="cvp-builder-personal-card" style={{ background: "#141414", border: "1px solid #2A2A2A", borderRadius: 16, padding: 16, position: "relative" }}>
                  <div style={{ display: "grid", gap: 10 }}>
                    <input style={{ ...S.input, background: "#1C1C1C", border: "1px solid #2A2A2A", color: "#FFF" }} placeholder="Full name" value={resume.name} onChange={e=>set("name",e.target.value)} />
                    <input style={{ ...S.input, background: "#1C1C1C", border: "1px solid #2A2A2A", color: "#FFF" }} placeholder="Job title" value={resume.title} onChange={e=>set("title",e.target.value)} />
                    <input style={{ ...S.input, background: "#1C1C1C", border: "1px solid #2A2A2A", color: "#FFF" }} placeholder="Email" value={resume.email} onChange={e=>set("email",e.target.value)} />
                    <input style={{ ...S.input, background: "#1C1C1C", border: "1px solid #2A2A2A", color: "#FFF" }} placeholder="Phone" value={resume.phone} onChange={e=>set("phone",e.target.value)} />
                    <input style={{ ...S.input, background: "#1C1C1C", border: "1px solid #2A2A2A", color: "#FFF" }} placeholder="Location" value={resume.location} onChange={e=>set("location",e.target.value)} />
                  </div>
                </div>
                <div className="cvp-mobile-section-rows" style={{ display: "flex", flexDirection: "column", maxWidth: "100%" }}>
              <AccordionSection variant="mobileRow" id="summary" title="Professional Summary" isOpen={isOpen("summary")} onToggle={() => toggleSection("summary")} icon="summary">
                <div>
                  <textarea style={{ ...CB_UI.input, height: 100, resize: "vertical" }} placeholder="2–3 lines summary..." value={resume.summary} onChange={e=>set("summary",e.target.value)} />
                </div>
              </AccordionSection>

              <AccordionSection variant="mobileRow" id="experience" title="Professional Experience" isOpen={isOpen("experience")} onToggle={() => toggleSection("experience")} icon="experience">
                <div style={{ display: "grid", gap: 10 }}>
                  {resume.experience.length === 0 && (
                    <p style={{ fontSize: 13, color: "#A0A0A0", margin: 0 }}>No roles yet. Add your work history below.</p>
                  )}
                  {resume.experience.map((exp, i) => (
                    <div key={i} style={{ ...CB_UI.card, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <button type="button" onClick={() => setExperienceEditor({ mode: "edit", index: i, draft: { ...EMPTY_EXP, ...exp } })} style={{ flex: 1, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", color: "#FFFFFF", minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{exp.role || "Job title"}</div>
                        <div style={{ fontSize: 13, color: "#A0A0A0" }}>{exp.company || "Company"}{exp.location ? ` · ${exp.location}` : ""}</div>
                        <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>{buildExperiencePeriod(exp) || exp.period || "Dates"}</div>
                      </button>
                      <button type="button" aria-label="Delete experience" onClick={(e) => { e.stopPropagation(); setResume(r => ({ ...r, experience: r.experience.filter((_, j) => j !== i) })); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#A0A0A0", padding: 4 }} onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "#A0A0A0"; }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setExperienceEditor({ mode: "add", index: -1, draft: { ...EMPTY_EXP } })} className="cvp-builder-add-entry-btn" style={{ ...CB_UI.btn }}>+ Add Experience</button>
                </div>
              </AccordionSection>

              <AccordionSection variant="mobileRow" id="education" title="Education" isOpen={isOpen("education")} onToggle={() => toggleSection("education")} icon="education">
                <div style={{ display: "grid", gap: 10 }}>
                  {resume.education.length === 0 && (
                    <p style={{ fontSize: 13, color: "#A0A0A0", margin: 0 }}>No education entries yet.</p>
                  )}
                  {resume.education.map((edu, i) => (
                    <div key={i} style={{ ...CB_UI.card, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <button type="button" onClick={() => setEducationEditor({ mode: "edit", index: i, draft: { ...EMPTY_EDU, ...edu } })} style={{ flex: 1, background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left", color: "#FFFFFF", minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{edu.degree || "Degree"}</div>
                        <div style={{ fontSize: 13, color: "#A0A0A0" }}>{edu.school || "Institution"}</div>
                        {edu.fieldOfStudy ? <div style={{ fontSize: 12, color: "#888" }}>{edu.fieldOfStudy}</div> : null}
                        <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>{buildEducationYearLine(edu) || edu.year || ""}</div>
                      </button>
                      <button type="button" aria-label="Delete education" onClick={(e) => { e.stopPropagation(); setResume(r => ({ ...r, education: r.education.filter((_, j) => j !== i) })); }} style={{ background: "none", border: "none", cursor: "pointer", color: "#A0A0A0", padding: 4 }} onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "#A0A0A0"; }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" /></svg>
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setEducationEditor({ mode: "add", index: -1, draft: { ...EMPTY_EDU } })} className="cvp-builder-add-entry-btn" style={{ ...CB_UI.btn }}>+ Add Education</button>
                </div>
              </AccordionSection>

              <AccordionSection variant="mobileRow" id="skills" title="Core Competencies" isOpen={isOpen("skills")} onToggle={() => toggleSection("skills")} icon="skills">
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {splitCommaItems(resume.skills).map((sk, si) => (
                      <span key={`${sk}-${si}`} style={CB_UI.chip}>
                        {sk}
                        <button type="button" aria-label={`Remove ${sk}`} onClick={() => setResume(r => ({ ...r, skills: splitCommaItems(r.skills).filter((x) => x !== sk).join(", ") }))} style={{ background: "none", border: "none", cursor: "pointer", color: "#A0A0A0", padding: 0, lineHeight: 1 }} onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "#A0A0A0"; }}>×</button>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    <input style={{ ...CB_UI.input }} placeholder="Add a skill" value={skillInput} onChange={e => setSkillInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const t = skillInput.trim(); if (!t) return; const cur = splitCommaItems(resume.skills); if (cur.includes(t)) return; setResume(r => ({ ...r, skills: [...cur, t].join(", ") })); setSkillInput(""); } }} />
                    <button type="button" className="cvp-builder-add-entry-btn" style={{ ...CB_UI.btn }} onClick={() => { const t = skillInput.trim(); if (!t) return; const cur = splitCommaItems(resume.skills); if (cur.includes(t)) return; setResume(r => ({ ...r, skills: [...cur, t].join(", ") })); setSkillInput(""); }}>+ Add</button>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: "#A0A0A0", display: "block", marginBottom: 6 }}>Technical skills</label>
                    <input style={CB_UI.input} placeholder="e.g. Python, SQL" value={resume.technicalSkills} onChange={e=>set("technicalSkills",e.target.value)} />
                  </div>
                </div>
              </AccordionSection>

              <AccordionSection variant="mobileRow" id="languages" title="Languages" isOpen={isOpen("languages")} onToggle={() => toggleSection("languages")} icon="languages">
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {splitCommaItems(resume.languages).map((lg, li) => (
                      <span key={`${lg}-${li}`} style={CB_UI.chip}>
                        {lg}
                        <button type="button" aria-label={`Remove ${lg}`} onClick={() => setResume(r => ({ ...r, languages: splitCommaItems(r.languages).filter((x) => x !== lg).join(", ") }))} style={{ background: "none", border: "none", cursor: "pointer", color: "#A0A0A0", padding: 0, lineHeight: 1 }} onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; }} onMouseLeave={(e) => { e.currentTarget.style.color = "#A0A0A0"; }}>×</button>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <input style={{ ...CB_UI.input, flex: 1, minWidth: 120 }} placeholder='e.g. English (Fluent)' value={langInput} onChange={e => setLangInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); const t = langInput.trim(); if (!t) return; const cur = splitCommaItems(resume.languages); if (cur.includes(t)) return; setResume(r => ({ ...r, languages: [...cur, t].join(", ") })); setLangInput(""); } }} />
                    <button type="button" style={{ ...CB_UI.btn }} onClick={() => { const t = langInput.trim(); if (!t) return; const cur = splitCommaItems(resume.languages); if (cur.includes(t)) return; setResume(r => ({ ...r, languages: [...cur, t].join(", ") })); setLangInput(""); }}>+ Add</button>
                  </div>
                </div>
              </AccordionSection>

              {OPTIONAL_BUILDER_SECTIONS.filter((opt) => resume.builderExtraSectionIds?.includes(opt.id)).map((opt) => (
                <AccordionSection key={opt.id} variant="mobileRow" id={opt.id} title={opt.label} isOpen={isOpen(opt.id)} onToggle={() => toggleSection(opt.id)} icon={opt.id}>
                  {opt.id === "certifications" ? (
                    <CertificationsBuilderSection
                      resume={resume}
                      setResume={setResume}
                      certificationEditor={certificationEditor}
                      setCertificationEditor={setCertificationEditor}
                      onRemoveSection={() => {
                        setCertificationEditor(null);
                        setResume((r) => ({ ...r, builderExtraSectionIds: (r.builderExtraSectionIds || []).filter((x) => x !== opt.id) }));
                      }}
                    />
                  ) : (
                    <div style={{ display: "grid", gap: 8 }}>
                      {opt.multiline ? (
                        <textarea style={{ ...CB_UI.input, minHeight: 100, resize: "vertical" }} placeholder={opt.label} value={resume[opt.field] || ""} onChange={(e) => setResume((r) => ({ ...r, [opt.field]: e.target.value }))} />
                      ) : (
                        <input style={CB_UI.input} value={resume[opt.field] || ""} onChange={(e) => setResume((r) => ({ ...r, [opt.field]: e.target.value }))} />
                      )}
                      <button type="button" style={{ ...CB_UI.btn, alignSelf: "flex-start", background: "transparent", color: "#A0A0A0", border: "1px solid #2A2A2A" }} onClick={() => setResume((r) => ({ ...r, builderExtraSectionIds: (r.builderExtraSectionIds || []).filter((x) => x !== opt.id) }))}>Remove section</button>
                    </div>
                  )}
                </AccordionSection>
              ))}
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
            {builderTab === "ats" && <BuilderAtsTabContent resume={resume} />}
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
                disabled={downloading}
                style={{
                  width: "calc(100% - 20px)",
                  margin: "0 10px",
                  boxSizing: "border-box",
                  minHeight: 44,
                  padding: "10px 12px",
                  borderRadius: 9,
                  border: "none",
                  background: "#FFFFFF",
                  color: "#000000",
                  fontSize: 8.5,
                  fontWeight: 600,
                  cursor: downloading ? "not-allowed" : "pointer",
                  opacity: downloading ? 0.7 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                {downloading ? "Preparing…" : "Download CV"}
              </button>
            </div>
            {fabSheet !== "preview" ? (
              <FAB
                ref={fabRef}
                variant="builder"
                tabKey={builderTab}
                atsScore={score}
                selectedTemplateId={selectedTemplate?.id}
                resume={resume}
                templatePickPending={templatePickPending}
                templatesInteractKey={templatesInteractKey}
                templateSessionApplyCount={templateSessionApplyCount}
                templateRecommendNames={templateFabRecommendNames}
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
                onNavigateToCoverLetter={() => {
                  writeFabMemory({ hasVisitedCoverLetter: true });
                  navigate("/cover-letter");
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
              />
            </div>
          </div>
        ) : null}

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
                border: "none",
                background: "#fff",
                color: "#000",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download CV
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
          onClick={() => setExperienceEditor(null)}
        >
          <div
            style={{ background: "#141414", border: "1px solid #2A2A2A", borderRadius: 12, padding: 20, maxWidth: 520, width: "100%", maxHeight: "90vh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: "0 0 16px", fontSize: 17, fontWeight: 600, color: "#FFF" }}>{experienceEditor.mode === "add" ? "Add experience" : "Edit experience"}</h3>
            <div style={{ display: "grid", gap: 12 }}>
              <div><label style={{ fontSize: 12, color: "#A0A0A0" }}>Company name</label><input style={{ ...CB_UI.input, marginTop: 4 }} value={experienceEditor.draft.company} onChange={(e) => setExperienceEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, company: e.target.value } } : null))} /></div>
              <div><label style={{ fontSize: 12, color: "#A0A0A0" }}>Job title</label><input style={{ ...CB_UI.input, marginTop: 4 }} value={experienceEditor.draft.role} onChange={(e) => setExperienceEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, role: e.target.value } } : null))} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div><label style={{ fontSize: 12, color: "#A0A0A0" }}>Start (MM/YYYY)</label><input style={{ ...CB_UI.input, marginTop: 4 }} placeholder="01/2020" value={experienceEditor.draft.startDate} onChange={(e) => setExperienceEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, startDate: e.target.value } } : null))} /></div>
                <div><label style={{ fontSize: 12, color: "#A0A0A0" }}>End (MM/YYYY)</label><input style={{ ...CB_UI.input, marginTop: 4 }} placeholder="12/2023" disabled={experienceEditor.draft.present} value={experienceEditor.draft.endDate} onChange={(e) => setExperienceEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, endDate: e.target.value } } : null))} /></div>
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#FFF", cursor: "pointer" }}>
                <input type="checkbox" checked={experienceEditor.draft.present} onChange={(e) => setExperienceEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, present: e.target.checked, endDate: e.target.checked ? "" : ev.draft.endDate } } : null))} />
                Present (current role)
              </label>
              <div><label style={{ fontSize: 12, color: "#A0A0A0" }}>Location (City, Country)</label><input style={{ ...CB_UI.input, marginTop: 4 }} value={experienceEditor.draft.location} onChange={(e) => setExperienceEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, location: e.target.value } } : null))} /></div>
              <div><label style={{ fontSize: 12, color: "#A0A0A0" }}>Description (bullet points, one per line)</label><textarea style={{ ...CB_UI.input, marginTop: 4, minHeight: 100, resize: "vertical" }} value={experienceEditor.draft.points} onChange={(e) => setExperienceEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, points: e.target.value } } : null))} /></div>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 20 }}>
              <button type="button" style={{ ...CB_UI.btn, background: "transparent", color: "#A0A0A0", border: "1px solid #2A2A2A" }} onClick={() => setExperienceEditor(null)}>Cancel</button>
              <button
                type="button"
                style={CB_UI.btn}
                onClick={() => {
                  const { mode, index, draft } = experienceEditor;
                  const next = { ...draft, period: buildExperiencePeriod({ ...draft, present: draft.present }) };
                  setResume((r) => {
                    if (mode === "add") return { ...r, experience: [...r.experience, next] };
                    const u = [...r.experience];
                    u[index] = next;
                    return { ...r, experience: u };
                  });
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
              <div><label style={{ fontSize: 12, color: "#A0A0A0" }}>Institution name</label><input style={{ ...CB_UI.input, marginTop: 4 }} value={educationEditor.draft.school} onChange={(e) => setEducationEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, school: e.target.value } } : null))} /></div>
              <div><label style={{ fontSize: 12, color: "#A0A0A0" }}>Degree / qualification</label><input style={{ ...CB_UI.input, marginTop: 4 }} value={educationEditor.draft.degree} onChange={(e) => setEducationEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, degree: e.target.value } } : null))} /></div>
              <div><label style={{ fontSize: 12, color: "#A0A0A0" }}>Field of study</label><input style={{ ...CB_UI.input, marginTop: 4 }} value={educationEditor.draft.fieldOfStudy || ""} onChange={(e) => setEducationEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, fieldOfStudy: e.target.value } } : null))} /></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div><label style={{ fontSize: 12, color: "#A0A0A0" }}>Start (MM/YYYY)</label><input style={{ ...CB_UI.input, marginTop: 4 }} value={educationEditor.draft.startDate || ""} onChange={(e) => setEducationEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, startDate: e.target.value } } : null))} /></div>
                <div><label style={{ fontSize: 12, color: "#A0A0A0" }}>End (MM/YYYY)</label><input style={{ ...CB_UI.input, marginTop: 4 }} value={educationEditor.draft.endDate || ""} onChange={(e) => setEducationEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, endDate: e.target.value } } : null))} /></div>
              </div>
              <div><label style={{ fontSize: 12, color: "#A0A0A0" }}>Location (optional)</label><input style={{ ...CB_UI.input, marginTop: 4 }} value={educationEditor.draft.location || ""} onChange={(e) => setEducationEditor((ev) => (ev ? { ...ev, draft: { ...ev.draft, location: e.target.value } } : null))} /></div>
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
              {availableOptionalSections.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  style={{ ...CB_UI.btn, width: "100%", textAlign: "left" }}
                  onClick={() => {
                    setResume((r) => ({
                      ...r,
                      builderExtraSectionIds: [...new Set([...(r.builderExtraSectionIds || []), opt.id])],
                    }));
                    setOpenSection(opt.id);
                  }}
                >
                  + {opt.label}
                </button>
              ))}
              {availableOptionalSections.length === 0 && (
                <p style={{ fontSize: 13, color: "#A0A0A0", margin: 0 }}>
                  {allOptionalSectionsAdded ? "All optional sections have been added." : "No sections available."}
                </p>
              )}
            </div>
            <button type="button" style={{ ...CB_UI.btn, marginTop: 16, width: "100%", background: "transparent", color: "#A0A0A0", border: "1px solid #2A2A2A" }} onClick={() => setAddSectionPickerOpen(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}

function AccordionSectionIcon({ icon, size = 16, stroke = "currentColor" }) {
  const sw = size >= 14 ? 2 : 1.5;
  const s = size;
  return (
    <span style={{ width: s, height: s, display: "grid", placeItems: "center", flexShrink: 0 }}>
      {icon === "summary" && <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M16 13H8" /><path d="M16 17H8" /></svg>}
      {icon === "experience" && <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw}><path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>}
      {icon === "education" && <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw}><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c3 3 9 3 12 0v-5" /></svg>}
      {icon === "skills" && <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw}><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>}
      {icon === "languages" && <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw}><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>}
      {icon === "certifications" && <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw}><path d="M12 15l-2 2 2 2 2-2-2-2z" /><path d="M4 4h16v16H4z" /></svg>}
      {icon === "projects" && <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw}><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>}
      {icon === "volunteer" && <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>}
      {icon === "publications" && <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw}><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>}
    </span>
  );
}

// Accordion row inside .cvp-sections-list — unified list style
function AccordionSection({ id, title, isOpen, onToggle, icon, children, variant = "default" }) {
  const ease = "cubic-bezier(0.4,0,0.2,1)";
  if (variant === "mobileRow") {
    return (
      <div style={{ marginBottom: 5, maxWidth: "100%" }}>
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onToggle();
            }
          }}
          onClick={onToggle}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "#141414",
            border: "0.5px solid #2A2A2A",
            borderRadius: 9,
            padding: "8px 10px",
            cursor: "pointer",
            minHeight: 44,
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <div style={{ width: 22, height: 22, background: "#1C1C1C", borderRadius: 6, display: "grid", placeItems: "center", flexShrink: 0 }}>
            <AccordionSectionIcon icon={icon} size={12} stroke="#888" />
          </div>
          <span style={{ flex: 1, color: "#fff", fontSize: 10, fontWeight: 500, textAlign: "left", minWidth: 0 }}>{title}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            style={{
              background: "#1C1C1C",
              color: "#777",
              fontSize: 7,
              padding: "3px 6px",
              border: "0.5px solid #2A2A2A",
              borderRadius: 5,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            Edit
          </button>
          <span style={{ color: "#444", fontSize: 14, flexShrink: 0, lineHeight: 1 }} aria-hidden>›</span>
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
    <div className={`cvp-section-row${isOpen ? " is-open" : ""}`}>
      <button
        type="button"
        onClick={onToggle}
        className="cvp-section-row-header"
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: 16,
          border: "none",
          background: "transparent",
          cursor: "pointer",
          textAlign: "left",
          borderLeft: isOpen ? "2px solid #FFFFFF" : "2px solid transparent",
          transition: `background-color 150ms ${EASE}, border-color 150ms ${EASE}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
          <span style={{ width: 16, height: 16, display: "grid", placeItems: "center", color: "#A0A0A0", flexShrink: 0 }}>
            <AccordionSectionIcon icon={icon} size={16} stroke="currentColor" />
          </span>
          <span style={{ fontSize: 15, fontWeight: 500, color: "#FFFFFF", letterSpacing: "0.02em" }}>{title}</span>
        </div>
        <span style={{ color: "#A0A0A0", display: "grid", placeItems: "center", transition: `transform 300ms ${ease}`, transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6" /></svg>
        </span>
      </button>
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
