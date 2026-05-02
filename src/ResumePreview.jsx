import { useRef } from "react";
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
import { PreviewSlateCarbon } from "./Template15";
import { PreviewCrimsonEdge } from "./Template16";
import { PreviewForestPro } from "./Template17";
import { PreviewMidnightGold } from "./Template18";
import { PreviewUAEATS } from "./components/templates/UAEATSTemplate";
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
  if (t.layout === "slate-carbon") return <PreviewSlateCarbon cv={cvT} mobileMode={mobileMode} />;
  if (t.layout === "crimson-edge") return <PreviewCrimsonEdge cv={cvT} mobileMode={mobileMode} />;
  if (t.layout === "forest-pro") return <PreviewForestPro cv={cvT} mobileMode={mobileMode} />;
  if (t.layout === "midnight-gold") return <PreviewMidnightGold cv={cvT} mobileMode={mobileMode} />;
  if (t.layout === "uae-ats") return <PreviewUAEATS cv={cvT} t={t} mobileMode={mobileMode} />;
  return <PreviewModernEmerald cv={cvT} mobileMode={mobileMode} />;
}

/** A4 page at 96dpi — matches dynamic scale math (containerWidth / 794) */
export const A4_PREVIEW_WIDTH_PX = 794;
export const A4_PREVIEW_HEIGHT_PX = 1123;

export function BuilderA4PreviewScaled({ cv, template, scale, fitRef, padded, previewCardRef, onSectionHold, pendingSection }) {
  const longPressTimer = useRef(null);
  const touchMoved = useRef(false);
  const touchStartPos = useRef({ x: 0, y: 0 });

  const handleTouchStart = (e) => {
    touchMoved.current = false;
    touchStartPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    const target = e.target.closest("[data-section]");
    if (!target || !onSectionHold) return;
    longPressTimer.current = setTimeout(() => {
      if (!touchMoved.current) {
        onSectionHold(target.getAttribute("data-section"));
      }
    }, 500);
  };

  const handleTouchMove = () => {
    touchMoved.current = true;
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  return (
    <div
      ref={fitRef}
      data-pending-section={pendingSection || ""}
      onTouchStart={onSectionHold ? handleTouchStart : undefined}
      onTouchMove={onSectionHold ? handleTouchMove : undefined}
      onTouchEnd={onSectionHold ? handleTouchEnd : undefined}
      style={{
        width: "100%",
        overflowX: "hidden",
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
        }}
      >
        <div className="cvp-builder-a4-fit" ref={previewCardRef}>
          <ResumePreview cv={cv} template={template} />
        </div>
      </div>
    </div>
  );
}
