import { useState, useEffect, useRef, memo, useMemo, Fragment } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { TEMPLATES, isCvDataEmptyForTemplateApply, EMPTY_RESUME, EMPTY_EXP } from "../cvShared";
import { ResumePreview, A4_PREVIEW_WIDTH_PX } from "../ResumePreview";

/** Preview when user has no saved CV data (standalone /templates + empty builder). */
const TEMPLATE_PREVIEW_DUMMY_CV = {
  ...EMPTY_RESUME,
  name: "Ahmed Al Mansouri",
  title: "Customer Service Officer",
  email: "ahmed.almansouri@email.com",
  phone: "+971 50 234 5678",
  location: "Dubai, UAE",
  nationality: "Emirati",
  availability: "Immediately Available",
  languages: "Arabic (Native) · English (Fluent)",
  summary:
    "Customer-focused professional with 6 years of experience delivering exceptional service in UAE banking and hospitality sectors. Proven track record in client relationship management, complaint resolution, and cross-selling financial products. Bilingual in Arabic and English with strong knowledge of UAE compliance standards.",
  experience: [
    {
      ...EMPTY_EXP,
      company: "Emirates NBD",
      role: "Customer Service Officer",
      location: "Dubai",
      period: "Jan 2021 – Present",
      points:
        "Managed daily interactions with 80+ customers across teller and service desk functions\nAchieved 96% customer satisfaction score for 3 consecutive quarters\nProcessed account openings, loan applications, and KYC documentation\nTrained 4 new joiners on CRM systems and service protocols",
    },
    {
      ...EMPTY_EXP,
      company: "Marriott Hotels",
      role: "Customer Relations Executive",
      location: "Abu Dhabi",
      period: "Mar 2018 – Dec 2020",
      points:
        "Handled VIP guest relations and resolved escalated complaints within SLA\nCoordinated with 6 departments to deliver seamless guest experiences\nRecognised as Employee of the Month twice in 2019",
    },
    {
      ...EMPTY_EXP,
      company: "Etisalat",
      role: "Customer Service Representative",
      location: "Dubai",
      period: "Jun 2016 – Feb 2018",
      points:
        "Resolved 50+ daily inbound queries via phone, email, and walk-in\nUpsold service packages achieving 118% of quarterly sales target",
    },
  ],
  education: [
    {
      school: "American University of Sharjah",
      degree: "Bachelor of Business Administration",
      year: "2016",
      fieldOfStudy: "Business Administration",
      startDate: "2012",
      endDate: "2016",
      location: "Sharjah, UAE",
    },
  ],
  certifications: [
    { name: "Certified Customer Experience Professional (CCXP)", issuer: "CXPA", year: "2022" },
    { name: "AML Awareness Certificate", issuer: "UAE Central Bank", year: "2021" },
  ],
  skills: "Customer Service · CRM · MS Office · Stakeholder Communication · KYC · AML Awareness · Complaint Resolution · Cross-selling · Arabic · English",
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

/** IDs of POPULAR templates that get the amber glow border treatment. */
const AMBER_GLOW_IDS = new Set([3, 4, 5]);

/** Scroll sections — each template appears exactly once, no duplicates. */
const SCROLL_SECTIONS = [
  { key: "popular",  label: "POPULAR",  desc: "Engineered for GCC shortlists. ATS-optimised, recruiter-tested.",         ids: [1, 2, 3, 4, 5] },
  { key: "simple",   label: "SIMPLE",   desc: "Clean, minimal layouts that let your experience speak.",                   ids: [6, 7] },
  { key: "modern",   label: "MODERN",   desc: "Contemporary designs for competitive, fast-moving industries.",            ids: [8, 9, 10] },
  { key: "creative", label: "CREATIVE", desc: "Bold formats for roles where presentation signals capability.",            ids: [11, 12, 13, 14] },
];

/**
 * CvTemplateThumb — shared scaled CV preview.
 *
 * Measures its own container width via ResizeObserver, computes scale to fill
 * that width at full A4 height (794 × 1123px), and exposes the exact height
 * via an inline style so the parent card height tracks the content naturally.
 *
 * Surfaces: Builder Templates tab · /templates page · FAB Step 7 · Landing carousel.
 * One fix propagates everywhere automatically.
 */
export const CvTemplateThumb = memo(function CvTemplateThumb({ resume, template }) {
  const scaleOuterRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const el = scaleOuterRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width;
      if (w == null || w < 1) return;
      setContainerWidth((prev) => (Math.abs(prev - w) < 0.5 ? prev : w));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // scale = cardWidth / A4_WIDTH — scales the 794px A4 down to the card width
  const scale = useMemo(() => {
    if (containerWidth <= 0) return 0;
    return containerWidth / A4_PREVIEW_WIDTH_PX;
  }, [containerWidth]);

  // thumbHeight = A4_WIDTH × A4_RATIO × scale = cardWidth × 1.4142
  // Set as inline style so card height flows from content, not CSS padding tricks.
  const thumbHeight = useMemo(() => {
    if (containerWidth <= 0) return null;
    return Math.round(containerWidth * 1.4142);
  }, [containerWidth]);

  return (
    <div
      ref={scaleOuterRef}
      className="cvp-templates-card-thumb-scale-outer"
      style={thumbHeight != null ? { height: thumbHeight } : undefined}
    >
      {scale > 0 && (
        <div
          className="cvp-templates-card-thumb-scale-inner"
          style={{ transform: `scale(${scale})` }}
        >
          <ResumePreview cv={resume} template={template} />
        </div>
      )}
    </div>
  );
});

const BuilderTemplateGridCard = memo(function BuilderTemplateGridCard({ template: t, isSelected, sheetHighlight, resume, onPick, cardRef }) {
  const tierLabel = templateTierMarketingLabel(t);
  const tierPill = templateTierPillColors(tierLabel);
  const atsBadge = templateAtsBadgeText(t);
  const borderStyle = sheetHighlight ? "2px solid rgba(255,255,255,0.8)" : isSelected ? "1px solid #FFFFFF" : "0.5px solid #2A2A2A";
  const amberGlow = AMBER_GLOW_IDS.has(t.id);

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
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        textAlign: "left",
        boxSizing: "border-box",
        transition: "transform 200ms cubic-bezier(0.4,0,0.2,1), box-shadow 200ms cubic-bezier(0.4,0,0.2,1)",
        ...(amberGlow ? { boxShadow: "0 0 0 1.5px #D97706, 0 0 16px rgba(217,119,6,0.45)" } : {}),
      }}
    >
      <div className="cvp-templates-card-thumb">
        <CvTemplateThumb resume={resume} template={t} />
      </div>
      {/* Card footer: name + tier pill + ATS badge */}
      <div className="cvp-templates-card-footer">
        <div className="cvp-templates-card-footer-row">
          <span className="cvp-templates-card-name">{t.name}</span>
          <span
            style={{
              fontSize: 8,
              padding: "2px 6px",
              borderRadius: 4,
              fontWeight: 700,
              letterSpacing: "0.05em",
              flexShrink: 0,
              textTransform: "uppercase",
              ...tierPill,
            }}
          >
            {tierLabel}
          </span>
        </div>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            background: "#0F2A1A",
            color: "#4ADE80",
            borderRadius: 4,
            padding: "2px 6px",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.04em",
            alignSelf: "flex-start",
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
  const [bannerExpanded, setBannerExpanded] = useState(false);
  const [previewBounceKey, setPreviewBounceKey] = useState(0);

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

  const closePreviewModal = () => {
    onConfirmOpenChange(false);
    onPendingTemplateChange(null);
    document.body.style.overflow = "";
    document.body.style.touchAction = "";
  };

  const previewCv = isCvDataEmptyForTemplateApply(resume) ? TEMPLATE_PREVIEW_DUMMY_CV : resume;

  return (
    <div
      className="cvp-builder-templates-tab-root"
      style={{ width: "100%", maxWidth: "100%", overflow: "visible", boxSizing: "border-box", display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
    >
      {/* ATS Banner — always visible at top */}
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

      {/* Single scrollable area — all sections stacked vertically */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
        {SCROLL_SECTIONS.map((section) => {
          const sectionTemplates = TEMPLATES.filter((t) => section.ids.includes(t.id));
          return (
            <Fragment key={section.key}>
              {/* Section divider heading + descriptor */}
              <div style={{ padding: "16px 12px 6px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ flex: 1, height: 0.5, background: "#2A2A2A" }} />
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 600,
                      color: "#484848",
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {section.label}
                  </span>
                  <div style={{ flex: 1, height: 0.5, background: "#2A2A2A" }} />
                </div>
                {section.desc ? (
                  <p
                    style={{
                      margin: "5px 0 0",
                      fontSize: 10,
                      fontWeight: 400,
                      color: "#3E3E3E",
                      textAlign: "center",
                      letterSpacing: "0.01em",
                      lineHeight: 1.4,
                    }}
                  >
                    {section.desc}
                  </p>
                ) : null}
              </div>
              {/* 2-column grid — overflow visible so cards aren't clipped within scroll */}
              <div className="cvp-templates-grid" style={{ overflowY: "visible", flex: "none" }}>
                {sectionTemplates.map((t) => (
                  <BuilderTemplateGridCard
                    key={t.id}
                    template={t}
                    isSelected={selectedTemplate?.id === t.id}
                    sheetHighlight={confirmOpen && pendingTemplate?.id === t.id}
                    resume={previewCv}
                    onPick={(tpl) => {
                      onTemplatesFabInteract?.();
                      onPendingTemplateChange(tpl);
                      onConfirmOpenChange(true);
                    }}
                  />
                ))}
              </div>
            </Fragment>
          );
        })}

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
              onMouseEnter={(ev) => { ev.currentTarget.style.opacity = "0.92"; }}
              onMouseLeave={(ev) => { ev.currentTarget.style.opacity = "1"; }}
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

        <div style={{ padding: "16px 10px 24px", textAlign: "center" }}>
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

      {/* Preview modal portal */}
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
    </div>
  );
}
export { BuilderTemplatesTab };
export default function TemplatesPage(props) {
  return <BuilderTemplatesTab {...props} />;
}
