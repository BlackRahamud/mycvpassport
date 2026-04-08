import { PreviewModernEmerald } from "./Template1ModernEmerald";
import { PreviewTwoCol } from "./Template2DubaiModern";
import { PreviewSidebar } from "./Template3ArabiaPro";
import { PreviewTimeline } from "./Template4ExecutiveGold";
import { PreviewGulfExecutive } from "./Template5GulfExecutive";
import { PreviewBankingFinance } from "./Template6BankingFinance";
import { PreviewCompactPro } from "./Template7CompactPro";
import { PreviewCreativeSidebar } from "./Template8CreativeSidebar";
import { PreviewHospitality } from "./Template9Hospitality";
import { PreviewATSInternational } from "./Template10ATSInternational";
import { PreviewTechITPro } from "./Template11TechITPro";
import { Template12Split } from "./Template12Split";
import { PreviewFinance } from "./Template13Finance";
import { Template14 } from "./Template14";
import { TEMPLATES, cvWithTemplateCertifications } from "./cvShared";

export function ResumePreview({ cv, template, mobileMode = false }) {
  const t = template || TEMPLATES[0];
  const cvT = cvWithTemplateCertifications(cv);
  if (t.layout === "twocol") return <PreviewTwoCol cv={cvT} t={t} mobileMode={mobileMode} />;
  if (t.layout === "sidebar") return <PreviewSidebar cv={cvT} t={t} mobileMode={mobileMode} />;
  if (t.layout === "timeline") return <PreviewTimeline cv={cvT} t={t} mobileMode={mobileMode} />;
  if (t.layout === "gulf-exec") return <PreviewGulfExecutive cv={cvT} t={t} mobileMode={mobileMode} />;
  if (t.layout === "banking") return <PreviewBankingFinance cv={cvT} t={t} mobileMode={mobileMode} />;
  if (t.layout === "compact-pro") return <PreviewCompactPro cv={cvT} t={t} mobileMode={mobileMode} />;
  if (t.layout === "creative") return <PreviewCreativeSidebar cv={cvT} t={t} mobileMode={mobileMode} />;
  if (t.layout === "hospitality") return <PreviewHospitality cv={cvT} t={t} mobileMode={mobileMode} />;
  if (t.layout === "ats-intl") return <PreviewATSInternational cv={cvT} t={t} mobileMode={mobileMode} />;
  if (t.layout === "tech-it") return <PreviewTechITPro cv={cvT} t={t} mobileMode={mobileMode} />;
  if (t.layout === "flat-split") return <Template12Split cv={cvT} mobileMode={mobileMode} />;
  if (t.layout === "finance") return <PreviewFinance cv={cvT} />;
  if (t.layout === "figma-mirror") return <Template14 cv={cvT} mobileMode={mobileMode} />;
  return <PreviewModernEmerald cv={cvT} mobileMode={mobileMode} />;
}

/** A4 page at 96dpi — matches dynamic scale math (containerWidth / 794) */
export const A4_PREVIEW_WIDTH_PX = 794;
export const A4_PREVIEW_HEIGHT_PX = 1123;

export function BuilderA4PreviewScaled({ cv, template, scale, fitRef, padded, previewCardRef, onSectionClick }) {
  const handleSectionTap = (e) => {
    const section = e.target.closest("[data-section]");
    if (section && onSectionClick) {
      if (e.type === "touchend") e.preventDefault();
      onSectionClick(section.getAttribute("data-section"));
    }
  };
  return (
    <div
      ref={fitRef}
      onClick={onSectionClick ? handleSectionTap : undefined}
      onTouchEnd={onSectionClick ? handleSectionTap : undefined}
      style={{
        width: "100%",
        overflow: "hidden",
        position: "relative",
        display: "flex",
        justifyContent: "center",
        boxSizing: "border-box",
        minWidth: 0,
        ...(padded ? { padding: "0 16px" } : {}),
      }}
    >
      <div
        style={{
          width: A4_PREVIEW_WIDTH_PX,
          transformOrigin: "top center",
          transform: `scale(${scale})`,
          willChange: "transform",
          transition: "none",
          marginBottom: `${(scale - 1) * A4_PREVIEW_HEIGHT_PX}px`,
        }}
      >
        <div className="cvp-builder-a4-fit" ref={previewCardRef}>
          <ResumePreview cv={cv} template={template} />
        </div>
      </div>
    </div>
  );
}
