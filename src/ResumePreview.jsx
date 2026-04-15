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
  return <PreviewModernEmerald cv={cvT} mobileMode={mobileMode} />;
}

/** A4 page at 96dpi — matches dynamic scale math (containerWidth / 794) */
export const A4_PREVIEW_WIDTH_PX = 794;
export const A4_PREVIEW_HEIGHT_PX = 1123;

export function BuilderA4PreviewScaled({ cv, template, scale, fitRef, padded, previewCardRef, onSectionHold, pendingSection, pageCount = 1 }) {
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
        height: "100%",
        overflowY: "auto",
        overflowX: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        background: "#0A0A0A",
        padding: "32px 0 50px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "24px",
          width: "794px",
          position: "relative",
          transform: `scale(${scale})`,
          transformOrigin: "top center",
        }}
      >
        {Array.from({ length: pageCount || 1 }).map((_, index) => (
          <div
            key={index}
            style={{
              width: "794px",
              height: "1123px",
              background: "#ffffff",
              position: "relative",
              overflow: "hidden",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(-${index * 1123}px)`,
              }}
            >
              <div className="cvp-builder-a4-fit" ref={index === 0 ? previewCardRef : null}>
                <ResumePreview cv={cv} template={template} />
              </div>
            </div>
            <div style={{
              position: "absolute",
              bottom: "12px",
              right: "20px",
              fontSize: "10px",
              color: "#999999",
              pointerEvents: "none",
              fontFamily: "sans-serif",
              zIndex: 10,
            }}>
              Page {index + 1} of {pageCount || 1}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
