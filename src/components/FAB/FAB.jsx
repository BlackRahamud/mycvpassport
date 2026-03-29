import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "./FAB.css";
import FABMenu from "./FABMenu";
import FABSheet from "./FABSheet";
import { getFabTabConfig, ATS_HIGH_SCORE_GUIDE } from "./FABContent";
import {
  readFabSeen,
  shouldShowAtsFabAttention,
  markAtsFabGuideOpened,
  shouldShowFabDot,
} from "./FABLogic";

/** Physical floating button: ring, dot, bounce/flicker, completion ring stub */
export function FABButton({ onClick, showDot, className = "", ariaLabel = "Quick tips" }) {
  return (
    <button
      type="button"
      className={`cvp-fab-layer cvp-fab-physical cvp-builder-fab ${className}`.trim()}
      aria-label={ariaLabel}
      onClick={onClick}
    >
      <span className="cvp-fab-completion-ring" aria-hidden />
      <span style={{ position: "relative", width: 28, height: 28, display: "grid", placeItems: "center" }}>
        <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden style={{ display: "block" }}>
          <rect x="6" y="4" width="14" height="18" rx="3" fill="none" stroke="#444" strokeWidth="1" />
          <rect
            x="6"
            y="4"
            width="14"
            height="18"
            rx="3"
            fill="none"
            stroke="#fff"
            strokeWidth="1"
            strokeDasharray="11 45"
            strokeLinecap="round"
            className="cvp-fab-spinring"
          />
          <line x1="8" y1="10" x2="20" y2="10" stroke="#fff" strokeWidth="1" />
          <line x1="8" y1="13" x2="16" y2="13" stroke="#444" strokeWidth="1" />
          <line x1="8" y1="16" x2="15" y2="16" stroke="#444" strokeWidth="1" />
          <circle cx="20" cy="20" r="5" fill="#fff" />
          <path d="M17.5 20 L19.5 22 L23 18" fill="none" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        {showDot ? <span className="cvp-fab-dot" /> : null}
      </span>
    </button>
  );
}

/**
 * Mobile FAB: radial menu + guide sheet. Screens pass tabKey and callbacks only.
 */
export default function FAB({
  tabKey,
  variant = "route",
  hidden = false,
  atsScore = 0,
  selectedTemplateId,
  sheetZOverlay = 200,
  sheetZSheet = 201,
  onOpenCvPreview,
  onOpenTemplatePreview,
  onPreviewCv,
  onNavigateToProAts,
}) {
  const navigate = useNavigate();
  const [mobile, setMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetAtsHigh, setSheetAtsHigh] = useState(false);
  const [sheetTitle, setSheetTitle] = useState("");
  const [sheetPoints, setSheetPoints] = useState([]);
  const anchorRef = useRef(null);
  const prevTemplateIdRef = useRef(undefined);
  const [templatesBounce, setTemplatesBounce] = useState(false);

  const config = getFabTabConfig(tabKey, variant);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const apply = () => setMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (variant !== "builder" || tabKey !== "templates") return;
    const prev = prevTemplateIdRef.current;
    if (prev === undefined) {
      prevTemplateIdRef.current = selectedTemplateId;
      return;
    }
    if (prev !== selectedTemplateId) {
      setTemplatesBounce(true);
      prevTemplateIdRef.current = selectedTemplateId;
    }
  }, [selectedTemplateId, variant, tabKey]);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setSheetAtsHigh(false);
  }, []);

  const runProAtsNav = useCallback(() => {
    if (onNavigateToProAts) onNavigateToProAts();
    else navigate("/ats");
  }, [navigate, onNavigateToProAts]);

  const openGuideSheet = useCallback(
    (useAtsHigh) => {
      if (!config) return;
      if (useAtsHigh) {
        markAtsFabGuideOpened();
        setSheetTitle(ATS_HIGH_SCORE_GUIDE.title);
        setSheetPoints(ATS_HIGH_SCORE_GUIDE.points);
        setSheetAtsHigh(true);
      } else {
        setSheetTitle(config.title);
        setSheetPoints(config.points);
        setSheetAtsHigh(false);
      }
      setSheetOpen(true);
    },
    [config]
  );

  const handleMenuPick = useCallback(
    (id) => {
      if (id === "guide") {
        const useAtsHigh =
          variant === "builder" &&
          tabKey === "ats" &&
          atsScore >= 71 &&
          !readFabSeen("ats");
        openGuideSheet(useAtsHigh);
        return;
      }
      if (id === "preview_cv") {
        if (onPreviewCv) onPreviewCv();
        else if (onOpenCvPreview) onOpenCvPreview();
        return;
      }
      if (id === "preview_template") {
        onOpenTemplatePreview?.();
        return;
      }
      if (id === "check_pro_ats") {
        runProAtsNav();
      }
    },
    [atsScore, onOpenCvPreview, onOpenTemplatePreview, onPreviewCv, openGuideSheet, runProAtsNav, tabKey, variant]
  );

  const onFabActivate = useCallback(() => {
    setTemplatesBounce(false);
    setMenuOpen(true);
  }, []);

  if (!mobile || !config || hidden) return null;

  const atsAttention = variant === "builder" && shouldShowAtsFabAttention(tabKey, atsScore);
  const fabAnimClass = atsAttention ? "cvp-fab-anim-bounce-flicker" : templatesBounce && tabKey === "templates" ? "cvp-fab-anim-bounce" : "";

  const dotVisible = shouldShowFabDot(tabKey, false);

  return (
    <>
      <div
        ref={anchorRef}
        className={`cvp-fab-layer cvp-fab-sticky-wrap${variant === "builder" ? " cvp-fab-sticky-wrap--builder" : ""}`}
      >
        <FABButton onClick={onFabActivate} showDot={dotVisible} className={fabAnimClass} />
      </div>

      <FABMenu open={menuOpen} onClose={() => setMenuOpen(false)} options={config.menuOptions} anchorRef={anchorRef} onSelect={handleMenuPick} />

      <FABSheet
        open={sheetOpen}
        onClose={closeSheet}
        title={sheetTitle}
        points={sheetPoints}
        tabStorageKey={sheetAtsHigh ? "ats" : tabKey}
        proCtaLabel={sheetAtsHigh ? "Check Pro ATS →" : undefined}
        onProCta={sheetAtsHigh ? runProAtsNav : undefined}
        zOverlay={sheetZOverlay}
        zSheet={sheetZSheet}
      />
    </>
  );
}
