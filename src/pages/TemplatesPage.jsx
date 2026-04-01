import { useState, useEffect, useRef, memo, useMemo, Fragment } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { TEMPLATES, TEMPLATE_FILTER_IDS, isCvDataEmptyForTemplateApply, EMPTY_RESUME, EMPTY_EXP } from "../cvShared";
import { ResumePreview, A4_PREVIEW_WIDTH_PX } from "../ResumePreview";

/** Preview when user has no saved CV data (standalone /templates + empty builder). */
const TEMPLATE_PREVIEW_DUMMY_CV = {
  ...EMPTY_RESUME,
  name: "Ahmed Al Mansouri",
  title: "Customer Service Officer",
  summary: "Customer-focused professional with experience in retail banking and client service excellence across the UAE.",
  experience: [
    {
      ...EMPTY_EXP,
      company: "Emirates NBD",
      role: "Customer Service Officer",
      location: "Dubai",
      period: "2020 — Present",
      points: "Handled daily client inquiries; maintained high satisfaction scores and accurate transaction records.",
    },
  ],
  education: [
    {
      school: "American University of Sharjah",
      degree: "BBA",
      year: "2015",
      fieldOfStudy: "",
      startDate: "",
      endDate: "",
      location: "",
    },
  ],
  skills: "Customer Service, CRM, MS Office, Stakeholder Communication",
};

function templateTierMarketingLabel(t) {
  if (t.tier === "free") return "FREE";
  if (t.id === 4 || t.id === 5) return "POPULAR";
  return "PREMIUM";
}

function templateTierPillColors(label) {
  if (label === "FREE") return { background: "#1D9E75", color: "#fff" };
  if (label === "POPULAR") return { background: "#EF9F27", color: "#412402" };
  return { background: "#2A2A2A", color: "#FFFFFF" };
}

function templateAtsBadgeText(t) {
  if (t.id >= 1 && t.id <= 3) return "ATS 70+";
  return "ATS 85+";
}

const BuilderTemplateGridCard = memo(function BuilderTemplateGridCard({ template: t, isSelected, sheetHighlight, resume, onPick, cardRef }) {
  const thumbScaleOuterRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const tierLabel = templateTierMarketingLabel(t);
  const tierPill = templateTierPillColors(tierLabel);
  const atsBadge = templateAtsBadgeText(t);
  const borderStyle = sheetHighlight ? "2px solid rgba(255,255,255,0.8)" : isSelected ? "1px solid #FFFFFF" : "0.5px solid #2A2A2A";

  useEffect(() => {
    const el = thumbScaleOuterRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width;
      if (w == null || w < 1) return;
      setContainerWidth((prev) => (Math.abs(prev - w) < 0.5 ? prev : w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const scale = useMemo(() => {
    const w = containerWidth > 0 ? containerWidth : A4_PREVIEW_WIDTH_PX;
    return w / A4_PREVIEW_WIDTH_PX;
  }, [containerWidth]);

  return (
    <button
      ref={cardRef}
      type="button"
      onClick={() => onPick(t)}
      className="cvp-templates-card"
      style={{
        position: "relative",
        width: "100%",
        height: "auto",
        padding: 0,
        margin: 0,
        border: borderStyle,
        borderRadius: 12,
        background: "#141414",
        cursor: "pointer",
        overflow: "visible",
        display: "block",
        textAlign: "left",
        boxSizing: "border-box",
      }}
    >
      <div className="cvp-templates-card-thumb">
        <div className="cvp-templates-card-thumb-inner">
          <div ref={thumbScaleOuterRef} className="cvp-templates-card-thumb-scale-outer">
            <div
              className="cvp-templates-card-thumb-scale-inner"
              style={{
                transform: `scale(${scale})`,
              }}
            >
              <ResumePreview cv={resume} template={t} />
            </div>
          </div>
        </div>
      </div>
      <div className="cvp-templates-card-label">
        <span className="cvp-templates-card-name">{t.name}</span>
      </div>
      <div
        style={{
          position: "absolute",
          top: 5,
          left: 5,
          display: "flex",
          alignItems: "center",
          gap: 6,
          flexWrap: "wrap",
          maxWidth: "calc(100% - 10px)",
          pointerEvents: "none",
        }}
      >
        <span
          style={{
            fontSize: 6.5,
            padding: "2px 5px",
            borderRadius: 5,
            fontWeight: 600,
            ...tierPill,
          }}
        >
          {tierLabel}
        </span>
        <span
          style={{
            background: "#0F2A1A",
            color: "#4ADE80",
            borderRadius: 99,
            padding: "3px 8px",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.3px",
          }}
        >
          {atsBadge}
        </span>
      </div>
    </button>
  );
});

function BuilderTemplatesTab({
  resume,
  selectedTemplate,
  onApplyTemplate: _onApplyTemplate,
  onApplyTemplateAndGoToContent,
  pendingTemplate,
  confirmOpen,
  onPendingTemplateChange,
  onConfirmOpenChange,
  onTemplatesFabInteract,
  showAtsJourneyPrompt = false,
  onAtsJourneyNavigate,
  onAtsJourneySkipDownload,
}) {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("popular");
  const [bannerExpanded, setBannerExpanded] = useState(false);
  const [previewBounceKey, setPreviewBounceKey] = useState(0);
  const prevFilterRef = useRef(null);
  const cardRefs = useRef(new Map());
  const ids = TEMPLATE_FILTER_IDS[filter] || TEMPLATE_FILTER_IDS.popular;
  const list = TEMPLATES.filter((t) => ids.includes(t.id));

  useEffect(() => {
    const prev = prevFilterRef.current;
    prevFilterRef.current = filter;
    if (prev === null) return;
    if (prev === filter) return;
    const activeIds = TEMPLATE_FILTER_IDS[filter] || TEMPLATE_FILTER_IDS.popular;
    const sid = selectedTemplate?.id;
    if (sid == null || !activeIds.includes(sid)) return;
    const el = cardRefs.current.get(sid);
    if (el) {
      requestAnimationFrame(() => {
        el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
      });
    }
  }, [filter, selectedTemplate?.id]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const open = confirmOpen && pendingTemplate != null;
    if (open) {
      document.body.classList.add("cvp-templates-preview-modal-open");
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    } else {
      document.body.classList.remove("cvp-templates-preview-modal-open");
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    }
    return () => {
      document.body.classList.remove("cvp-templates-preview-modal-open");
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    };
  }, [confirmOpen, pendingTemplate]);

  useEffect(() => {
    if (confirmOpen && pendingTemplate != null) setPreviewBounceKey((k) => k + 1);
  }, [confirmOpen, pendingTemplate]);

  useEffect(() => {
    if (filter !== "popular") setBannerExpanded(false);
  }, [filter]);

  const closePreviewModal = () => {
    onConfirmOpenChange(false);
    onPendingTemplateChange(null);
    document.body.style.overflow = "";
    document.body.style.touchAction = "";
  };

  const previewCv = isCvDataEmptyForTemplateApply(resume) ? TEMPLATE_PREVIEW_DUMMY_CV : resume;

  const pills = [
    { id: "popular", label: "Popular" },
    { id: "simple", label: "Simple" },
    { id: "modern", label: "Modern" },
    { id: "creative", label: "Creative" },
  ];

  return (
    <div
      className="cvp-builder-templates-tab-root"
      style={{ width: "100%", maxWidth: "100%", overflow: "visible", boxSizing: "border-box", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
    >
      <div
        className="cvp-templates-pills"
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          WebkitOverflowScrolling: "touch",
          padding: "0 12px 12px",
          margin: 0,
          flexWrap: "nowrap",
          maxWidth: "100%",
          flexShrink: 0,
        }}
      >
        {pills.map((p) => {
          const on = filter === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onTemplatesFabInteract?.();
                setFilter(p.id);
              }}
              style={{
                flex: "0 0 auto",
                background: on ? "#fff" : "#1C1C1C",
                color: on ? "#000" : "#666",
                fontSize: 8,
                padding: "4px 9px",
                borderRadius: 12,
                border: on ? "0.5px solid #fff" : "0.5px solid #2A2A2A",
                cursor: "pointer",
                whiteSpace: "nowrap",
                minHeight: 28,
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>
      {filter === "popular" ? (
        <div className="cvp-templates-ats-banner">
          <svg
            width={22}
            height={22}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
            className="cvp-templates-ats-banner-shield"
          >
            <path
              d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"
              stroke="#14B8A6"
              strokeWidth={1.8}
            />
            <path d="M9 12l2 2 4-4" stroke="#14B8A6" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="cvp-templates-ats-banner-text">
            <p className="cvp-templates-ats-banner-headline">Engineered for the Shortlist.</p>
            <div
              className={
                bannerExpanded
                  ? "cvp-templates-ats-banner-expand-wrap cvp-templates-ats-banner-expand-wrap--expanded"
                  : "cvp-templates-ats-banner-expand-wrap cvp-templates-ats-banner-expand-wrap--collapsed"
              }
            >
              <div className="cvp-templates-ats-banner-body-clip">
                <p className="cvp-templates-ats-banner-body">
                  A great-looking CV means nothing if a recruiter&apos;s system can&apos;t read it. Every template is precision-coded for maximum ATS
                  readability — recruiter-approved layouts that clear filters with zero errors. That&apos;s the format sorted. Next, run your CV through our{" "}
                  <span
                    role="button"
                    tabIndex={0}
                    className="cvp-templates-ats-banner-link"
                    onClick={() => navigate("/ats")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        navigate("/ats");
                      }
                    }}
                  >
                    ATS Checker
                  </span>{" "}
                  — it scores your content against the actual job description, flags what&apos;s missing, and tells you exactly what to fix before you apply.
                  {bannerExpanded ? (
                    <>
                      {" "}
                      <span
                        role="button"
                        tabIndex={0}
                        className="cvp-templates-ats-banner-read-inline"
                        onClick={() => setBannerExpanded(false)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setBannerExpanded(false);
                          }
                        }}
                      >
                        Show less ↑
                      </span>
                    </>
                  ) : null}
                </p>
              </div>
              {!bannerExpanded ? (
                <span
                  role="button"
                  tabIndex={0}
                  className="cvp-templates-ats-banner-read-inline"
                  onClick={() => setBannerExpanded(true)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setBannerExpanded(true);
                    }
                  }}
                >
                  Read more →
                </span>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
      <div className="cvp-templates-grid">
        {list.map((t) => (
          <BuilderTemplateGridCard
            key={t.id}
            template={t}
            isSelected={selectedTemplate?.id === t.id}
            sheetHighlight={confirmOpen && pendingTemplate?.id === t.id}
            resume={resume}
            onPick={(tpl) => {
              onTemplatesFabInteract?.();
              onPendingTemplateChange(tpl);
              onConfirmOpenChange(true);
            }}
            cardRef={(el) => {
              if (el) cardRefs.current.set(t.id, el);
              else cardRefs.current.delete(t.id);
            }}
          />
        ))}
      </div>
      {confirmOpen && pendingTemplate && typeof document !== "undefined"
        ? createPortal(
            <Fragment key={pendingTemplate?.id}>
              <div role="presentation" className="cvp-templates-preview-backdrop" onClick={closePreviewModal} />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="cvp-templates-preview-title"
                className="cvp-templates-preview-root"
              >
                <div className="cvp-templates-preview-header">
                  <h2 id="cvp-templates-preview-title" className="cvp-templates-preview-title">
                    {pendingTemplate.name}
                  </h2>
                  <button type="button" className="cvp-templates-preview-close" onClick={closePreviewModal} aria-label="Close">
                    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" aria-hidden>
                      <path d="M18 6L6 18M6 6l12 12" stroke="#FFF" strokeWidth={2} strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
                <div
                  className="cvp-templates-preview-scroll"
                  onClick={(e) => {
                    if (e.target === e.currentTarget) closePreviewModal();
                  }}
                >
                  <div className="cvp-templates-preview-cv-wrap" onClick={(e) => e.stopPropagation()}>
                    <ResumePreview cv={previewCv} template={pendingTemplate} />
                  </div>
                </div>
                <div className="cvp-templates-preview-cta">
                  <button
                    type="button"
                    key={previewBounceKey}
                    className="cvp-templates-preview-use-btn"
                    onClick={() => {
                      onApplyTemplateAndGoToContent(pendingTemplate);
                      closePreviewModal();
                    }}
                  >
                    Use This Template
                  </button>
                </div>
              </div>
            </Fragment>,
            document.body,
          )
        : null}
      {showAtsJourneyPrompt ? (
        <div
          style={{
            marginTop: 12,
            marginLeft: 10,
            marginRight: 10,
            padding: 14,
            borderRadius: 12,
            border: "1px solid #2A2A2A",
            background: "#141414",
            display: "grid",
            gap: 10,
            flexShrink: 0,
          }}
        >
          <p style={{ margin: 0, fontSize: 13, color: "#E5E5E5", lineHeight: 1.4 }}>Template locked. Now check your ATS score.</p>
          <button
            type="button"
            onClick={() => onAtsJourneyNavigate?.()}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "none",
              background: "#FFFFFF",
              color: "#000000",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              transition: "opacity 150ms cubic-bezier(0.4,0,0.2,1)",
            }}
            onMouseEnter={(ev) => {
              ev.currentTarget.style.opacity = "0.92";
            }}
            onMouseLeave={(ev) => {
              ev.currentTarget.style.opacity = "1";
            }}
          >
            Check ATS Score →
          </button>
          <button
            type="button"
            onClick={() => onAtsJourneySkipDownload?.()}
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
      <div style={{ padding: "16px 10px 8px", textAlign: "center" }}>
        <button
          type="button"
          onClick={() => navigate("/pricing")}
          style={{
            background: "transparent",
            border: "none",
            color: "#666",
            fontSize: 10,
            textDecoration: "underline",
            cursor: "pointer",
          }}
        >
          Remove watermark — upgrade to Pro
        </button>
      </div>
    </div>
  );
}
export { BuilderTemplatesTab };
export default function TemplatesPage(props) {
  return <BuilderTemplatesTab {...props} />;
}
