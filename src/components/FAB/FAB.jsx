import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from "react";
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
  bumpFabSessionOpen,
  getProgressCoachData,
  getDownloadGatekeeperData,
  GATEKEEPER_FALLBACK,
  getFabMemory,
} from "./FABLogic";

const FAB_PROGRESS_CIRCUMFERENCE = 2 * Math.PI * 30;

const SECTION_TIPS = {
  summary: [
    "Start with your job title and years of experience. Recruiters read the first line first.",
    "Keep it to 3 lines maximum. Brevity signals confidence.",
    "Avoid 'I am' — start with your title directly. 'Customer service professional with 4 years...'",
  ],
  experience: [
    "Add numbers wherever you can. '30 clients managed' beats 'managed clients' every time.",
    "Start each bullet with an action verb. Led, Built, Managed, Grew, Delivered.",
    "Include the company's industry if it's relevant. Context helps recruiters.",
  ],
  education: [
    "If you graduated recently, put education before experience.",
    "Include your GPA only if it's above 3.5 or equivalent.",
    "Certifications count. Add any relevant courses you've completed.",
  ],
  competencies: [
    "Copy keywords directly from the job description. ATS systems match exact words.",
    "Group skills by type — Technical, Soft Skills, Tools. Easier to scan.",
    "Don't list more than 10 skills. Quality over quantity.",
  ],
  languages: [
    "Fluent means you can work in it. Conversational means you can survive a meeting.",
    "Arabic proficiency is a strong differentiator in UAE roles — include it if applicable.",
    "Never list a language you can't hold a basic conversation in.",
  ],
};

const MILESTONE_BUBBLE_COPY = {
  25: {
    title: "Great start.",
    sub: "Your summary is looking strong — now tell us where you've worked.",
  },
  50: {
    title: "Halfway there.",
    sub: "The hard part is done. Keep going.",
  },
  75: {
    title: "Almost ready.",
    sub: "A few more details and your CV will stand out.",
  },
  100: {
    title: "That's your CV done.",
    sub: "Now let's make sure it gets seen — run your ATS scan.",
  },
};

function fabRingColor(p) {
  const n = p ?? 0;
  if (n >= 100) return "#22C55E";
  if (n >= 90) return "#16A34A";
  if (n >= 80) return "#3B82F6";
  if (n >= 70) return "#60A5FA";
  if (n >= 60) return "#F59E0B";
  if (n >= 50) return "#FBBF24";
  if (n >= 40) return "#F97316";
  if (n >= 30) return "#EF4444";
  if (n >= 20) return "#DC2626";
  if (n >= 10) return "#B91C1C";
  return "#A0A0A0";
}

function fabNormalizeSection(activeSection) {
  if (!activeSection || typeof activeSection !== "string") return "summary";
  const k = activeSection.toLowerCase().trim();
  if (["summary", "experience", "education", "competencies", "languages"].includes(k)) return k;
  return "summary";
}

/** Physical floating button: ring, dot, bounce/flicker, completion ring stub */
export function FABButton({ onClick, showDot, className = "", ariaLabel = "Quick tips", onAnimationEnd }) {
  return (
    <button
      type="button"
      className={`cvp-fab-layer cvp-fab-physical cvp-builder-fab ${className}`.trim()}
      aria-label={ariaLabel}
      onClick={onClick}
      onAnimationEnd={onAnimationEnd}
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
const FAB = forwardRef(function FAB(
  {
    tabKey,
    variant = "route",
    hidden = false,
    atsScore = 0,
    selectedTemplateId,
    resume = null,
    onNavigateToCvSection,
    sheetZOverlay = 200,
    sheetZSheet = 201,
    onOpenCvPreview,
    onOpenTemplatePreview,
    onPreviewCv,
    onNavigateToProAts,
    onNavigateToJobMatch,
    onNavigateToCoverLetter,
    /** Templates tab: pending card selection (for highlight + FAB state 2) */
    templatePickPending = null,
    /** Increment when user taps filter or template card (clears idle timer) */
    templatesInteractKey = 0,
    /** Resets when entering Templates tab; increment when user applies a template this visit */
    templateSessionApplyCount = 0,
    /** Two display names for idle recommendation copy */
    templateRecommendNames = [],
    onPreviewTemplateDraft,
    onApplyTemplateDraft,
    onClearTemplatePick,
    /** Route FAB: failing ATS check labels (ATSChecker → FAB sheet chips) */
    atsChecks = [],
    /** @type {'empty' | 'partial' | 'ready' | 'generated' | 'paywall'} */
    coverLetterState = "empty",
    coverLetterEmptyFieldLabels = [],
    coverLetterOnFocusFirstEmpty,
    coverLetterOnGenerate,
    coverLetterOnDownload,
    coverLetterOnRegenerate,
    walkInCvBuilt = false,
    walkInOnStart,
    walkInOnDownload,
    /** Builder: CV completion % block at top of guide sheet (from useCvProgress) */
    cvCompletionProgress = null,
    /** Builder: active CV section key for timed bulb / tips (e.g. summary, experience) */
    activeSection = null,
    /** Builder: notify when guide/menu sheet open state changes (for idle timer reschedule) */
    onBuilderGuideSheetOpenChange = null,
  },
  ref
) {
  const navigate = useNavigate();
  const [mobile, setMobile] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  /** When `download-only`, FAB sheet shows gatekeeper only (ATSChecker download path). */
  const [sheetLayoutKind, setSheetLayoutKind] = useState("normal");
  const [sheetAtsHigh, setSheetAtsHigh] = useState(false);
  const [sheetTitle, setSheetTitle] = useState("");
  const [sheetPoints, setSheetPoints] = useState([]);
  const [sheetCoach, setSheetCoach] = useState(null);
  const [sheetGate, setSheetGate] = useState(null);
  const [sheetBodySlot, setSheetBodySlot] = useState(null);
  const [sheetFooterSlot, setSheetFooterSlot] = useState(null);
  const [showSheetGotIt, setShowSheetGotIt] = useState(true);
  const [sheetShowProgress, setSheetShowProgress] = useState(true);
  const [sheetShowGate, setSheetShowGate] = useState(true);
  const [sheetCoachPanelsFlag, setSheetCoachPanelsFlag] = useState(true);
  const anchorRef = useRef(null);
  const prevTemplateIdRef = useRef(undefined);
  const [templatesBounce, setTemplatesBounce] = useState(false);
  const [fabExtraClass, setFabExtraClass] = useState("");
  const [tplIdlePulse, setTplIdlePulse] = useState(false);
  const [tplExtPulse, setTplExtPulse] = useState(false);
  const [builderIdlePulse, setBuilderIdlePulse] = useState(false);
  const tplTimersRef = useRef([]);
  const builderGuideSheetNotifySkipRef = useRef(true);
  const atsLandTriggeredRef = useRef(false);
  const tplTabEpochRef = useRef(0);
  const tplIdleEligibleRef = useRef(false);
  const tplExtendedEligibleRef = useRef(false);
  const templateSessionApplyRef = useRef(0);
  templateSessionApplyRef.current = templateSessionApplyCount;

  const idleTimer = useRef(null);
  const [isGhostPulsing, setIsGhostPulsing] = useState(false);

  const progressRingRef = useRef(null);
  const prevProgressRef = useRef(null);
  const shownMilestonesRef = useRef(new Set());
  const bounceTimeoutRef = useRef(null);
  const bubbleDismissTimeoutRef = useRef(null);
  const bulbSectionTimerRef = useRef(null);
  const bulbVisibleTimerRef = useRef(null);
  const tipDismissTimerRef = useRef(null);
  const bulbPostFlickerTimerRef = useRef(null);
  const bulbDimTimerRef = useRef(null);
  const bulbRef = useRef(null);
  const bulbAppearCountRef = useRef(0);
  const tipIndexRef = useRef({});

  const [fabBouncing, setFabBouncing] = useState(false);
  const [isBubbleVisible, setIsBubbleVisible] = useState(false);
  const [bubbleTitle, setBubbleTitle] = useState("");
  const [bubbleSub, setBubbleSub] = useState("");
  const [isBulbVisible, setIsBulbVisible] = useState(false);
  const [isBulbLit, setIsBulbLit] = useState(false);
  const [isBulbFlickering, setIsBulbFlickering] = useState(false);
  const [isTipVisible, setIsTipVisible] = useState(false);
  const [currentTip, setCurrentTip] = useState("");

  const config = getFabTabConfig(tabKey, variant);

  const resetTimer = useCallback(() => {
    clearTimeout(idleTimer.current);
    setIsGhostPulsing(false);
    idleTimer.current = setTimeout(() => {
      setIsGhostPulsing(true);
    }, 15000);
  }, []);

  useEffect(() => {
    resetTimer();
    window.addEventListener("mousedown", resetTimer);
    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("touchstart", resetTimer, { passive: true });
    window.addEventListener("scroll", resetTimer, { passive: true });
    return () => {
      clearTimeout(idleTimer.current);
      window.removeEventListener("mousedown", resetTimer);
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("touchstart", resetTimer);
      window.removeEventListener("scroll", resetTimer);
    };
  }, [resetTimer]);

  useEffect(() => {
    return () => {
      clearTimeout(bounceTimeoutRef.current);
      clearTimeout(bubbleDismissTimeoutRef.current);
      clearTimeout(bulbSectionTimerRef.current);
      clearTimeout(bulbVisibleTimerRef.current);
      /* Unmount: clear latest timer ids from refs */
      // eslint-disable-next-line react-hooks/exhaustive-deps -- refs hold timer ids, not DOM nodes
      clearTimeout(tipDismissTimerRef.current);
      // eslint-disable-next-line react-hooks/exhaustive-deps
      clearTimeout(bulbPostFlickerTimerRef.current);
      // eslint-disable-next-line react-hooks/exhaustive-deps
      clearTimeout(bulbDimTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (variant !== "builder") {
      prevProgressRef.current = null;
    }
  }, [variant]);

  useEffect(() => {
    if (variant !== "builder") return undefined;
    const p = cvCompletionProgress?.percent ?? 0;

    if (prevProgressRef.current === null) {
      prevProgressRef.current = p;
      return undefined;
    }

    const prev = prevProgressRef.current;

    if (!(prev === 0 && p === 0) && p > prev) {
      const prevThreshold = Math.floor(prev / 10);
      const nextThreshold = Math.floor(p / 10);
      if (nextThreshold > prevThreshold) {
        setFabBouncing(true);
        clearTimeout(bounceTimeoutRef.current);
        bounceTimeoutRef.current = setTimeout(() => {
          setFabBouncing(false);
        }, 400);
      }
    }

    let crossedMilestone = null;
    for (const m of [25, 50, 75, 100]) {
      if (prev < m && p >= m && !shownMilestonesRef.current.has(m)) {
        shownMilestonesRef.current.add(m);
        crossedMilestone = m;
      }
    }
    if (crossedMilestone != null) {
      const copy = MILESTONE_BUBBLE_COPY[crossedMilestone];
      if (copy) {
        setBubbleTitle(copy.title);
        setBubbleSub(copy.sub);
        setIsBubbleVisible(true);
        clearTimeout(bubbleDismissTimeoutRef.current);
        bubbleDismissTimeoutRef.current = setTimeout(() => {
          setIsBubbleVisible(false);
        }, 5000);
      }
    }

    prevProgressRef.current = p;
    return undefined;
  }, [cvCompletionProgress, variant]);

  useEffect(() => {
    if (variant !== "builder") return undefined;

    clearTimeout(bulbSectionTimerRef.current);
    clearTimeout(bulbVisibleTimerRef.current);
    setIsBulbVisible(false);
    setIsBulbLit(false);
    setIsBulbFlickering(false);

    if (bulbAppearCountRef.current >= 3) {
      return undefined;
    }

    bulbSectionTimerRef.current = setTimeout(() => {
      if (bulbAppearCountRef.current >= 3) return;
      bulbAppearCountRef.current += 1;
      setIsBulbLit(true);
      setIsBulbFlickering(false);
      setIsBulbVisible(true);
      bulbVisibleTimerRef.current = setTimeout(() => {
        setIsBulbVisible(false);
      }, 8000);
    }, 8000);

    return () => {
      clearTimeout(bulbSectionTimerRef.current);
      clearTimeout(bulbVisibleTimerRef.current);
    };
  }, [activeSection, variant]);

  const clearTplTimers = useCallback(() => {
    tplTimersRef.current.forEach(clearTimeout);
    tplTimersRef.current = [];
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const apply = () => setMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (variant !== "builder" || tabKey !== "templates") {
      clearTplTimers();
      setTplIdlePulse(false);
      setTplExtPulse(false);
      tplIdleEligibleRef.current = false;
      tplExtendedEligibleRef.current = false;
      return undefined;
    }
    tplTabEpochRef.current += 1;
    const epoch = tplTabEpochRef.current;
    tplIdleEligibleRef.current = false;
    tplExtendedEligibleRef.current = false;
    setTplIdlePulse(false);
    setTplExtPulse(false);
    clearTplTimers();
    const tIdle = setTimeout(() => {
      if (tplTabEpochRef.current !== epoch) return;
      tplIdleEligibleRef.current = true;
      setTplIdlePulse(true);
    }, 3000);
    const tExt = setTimeout(() => {
      if (tplTabEpochRef.current !== epoch) return;
      if (templateSessionApplyRef.current !== 0) return;
      tplExtendedEligibleRef.current = true;
      setTplExtPulse(true);
    }, 30000);
    tplTimersRef.current.push(tIdle, tExt);
    return clearTplTimers;
  }, [variant, tabKey, clearTplTimers]);

  useEffect(() => {
    if (variant !== "builder" || tabKey !== "templates") return;
    clearTplTimers();
    tplIdleEligibleRef.current = false;
    setTplIdlePulse(false);
    const epoch = tplTabEpochRef.current;
    const tIdle = setTimeout(() => {
      if (tplTabEpochRef.current !== epoch) return;
      tplIdleEligibleRef.current = true;
      setTplIdlePulse(true);
    }, 3000);
    tplTimersRef.current.push(tIdle);
    return clearTplTimers;
  }, [templatesInteractKey, variant, tabKey, clearTplTimers]);

  useEffect(() => {
    if (!isTipVisible) return undefined;
    const onOutside = (e) => {
      const el = bulbRef.current;
      if (!el || (e.target instanceof Node && el.contains(e.target))) return;
      setIsTipVisible(false);
    };
    document.addEventListener("mousedown", onOutside);
    document.addEventListener("touchstart", onOutside, { passive: true });
    return () => {
      document.removeEventListener("mousedown", onOutside);
      document.removeEventListener("touchstart", onOutside);
    };
  }, [isTipVisible]);

  useEffect(() => {
    if (variant !== "builder" || tabKey !== "templates") return;
    if (templatePickPending) {
      setFabExtraClass("cvp-fab-bounce-once");
      const t = setTimeout(() => setFabExtraClass(""), 450);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [templatePickPending, variant, tabKey]);

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

  const resetSheetLayout = useCallback(() => {
    setSheetBodySlot(null);
    setSheetFooterSlot(null);
    setShowSheetGotIt(true);
    setSheetShowProgress(true);
    setSheetShowGate(true);
    setSheetCoachPanelsFlag(true);
  }, []);

  const closeSheet = useCallback(() => {
    setSheetOpen(false);
    setSheetAtsHigh(false);
    setSheetCoach(null);
    setSheetGate(null);
    setSheetLayoutKind("normal");
    resetSheetLayout();
  }, [resetSheetLayout]);

  const runProAtsNav = useCallback(() => {
    if (onNavigateToProAts) onNavigateToProAts();
    else navigate("/ats");
  }, [navigate, onNavigateToProAts]);

  const openGuideSheet = useCallback(
    (useAtsHigh) => {
      if (!config) return;
      resetSheetLayout();
      setSheetLayoutKind("normal");
      const routeDedicated =
        variant === "route" && ["ats", "cover-letter", "walkin", "account"].includes(tabKey);
      if (useAtsHigh) {
        markAtsFabGuideOpened();
        setSheetTitle(ATS_HIGH_SCORE_GUIDE.title);
        setSheetPoints(ATS_HIGH_SCORE_GUIDE.points);
        setSheetAtsHigh(true);
        setSheetCoach(null);
        if ((variant === "route" && tabKey === "ats") || (variant === "builder" && tabKey === "ats")) {
          setSheetShowProgress(false);
          setSheetShowGate(true);
          getDownloadGatekeeperData()
            .then(setSheetGate)
            .catch(() => setSheetGate({ ...GATEKEEPER_FALLBACK }));
        } else {
          setSheetGate(null);
        }
      } else {
        setSheetTitle(config.title);
        setSheetPoints(config.points);
        setSheetAtsHigh(false);
        if ((routeDedicated && tabKey === "ats") || (variant === "builder" && tabKey === "ats")) {
          setSheetShowProgress(false);
          setSheetShowGate(true);
          setSheetCoach(null);
          setSheetPoints([]);
          getDownloadGatekeeperData()
            .then(setSheetGate)
            .catch(() => setSheetGate({ ...GATEKEEPER_FALLBACK }));
        } else if (routeDedicated && tabKey === "cover-letter") {
          setSheetShowProgress(false);
          setSheetShowGate(false);
          setSheetCoach(null);
          setSheetGate(null);
        } else if (routeDedicated && tabKey === "walkin") {
          setSheetShowProgress(false);
          setSheetShowGate(false);
          setSheetCoach(null);
          setSheetGate(null);
        } else if (routeDedicated && tabKey === "account") {
          setSheetShowProgress(false);
          setSheetShowGate(false);
          setSheetCoach(null);
          getDownloadGatekeeperData()
            .then(setSheetGate)
            .catch(() => setSheetGate({ ...GATEKEEPER_FALLBACK }));
        } else {
          const coach = variant === "builder" && resume ? getProgressCoachData(resume) : getProgressCoachData(null);
          setSheetCoach(coach);
          setSheetGate(null);
          getDownloadGatekeeperData()
            .then(setSheetGate)
            .catch(() => setSheetGate({ ...GATEKEEPER_FALLBACK }));
        }
      }
      setSheetOpen(true);
    },
    [config, variant, resume, resetSheetLayout, tabKey]
  );

  useEffect(() => {
    if (typeof window === "undefined" || window.innerWidth >= 768) return undefined;
    const isAtsTab =
      (variant === "builder" && tabKey === "ats") || (variant === "route" && tabKey === "ats");
    if (!isAtsTab) return undefined;
    if (process.env.NODE_ENV === "development") {
      console.log("[FAB ATS land]", { variant, tabKey, innerWidth: window.innerWidth, sheetOpen });
    }
    if (sheetOpen) {
      atsLandTriggeredRef.current = true;
      return undefined;
    }
    if (atsLandTriggeredRef.current) return undefined;
    let t2;
    const t1 = setTimeout(() => {
      atsLandTriggeredRef.current = true;
      setFabExtraClass("cvp-fab-ats-land-bounce");
      t2 = setTimeout(() => {
        setFabExtraClass("");
        const useAtsHigh = atsScore >= 71 && !readFabSeen("ats");
        openGuideSheet(useAtsHigh);
      }, 300);
    }, 1500);
    return () => {
      clearTimeout(t1);
      if (t2) clearTimeout(t2);
    };
  }, [variant, tabKey, sheetOpen, atsScore, openGuideSheet]);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    if (!mobile || !config || hidden) {
      document.body.classList.remove("cvp-fab-sheet-open");
      return undefined;
    }
    if (sheetOpen) document.body.classList.add("cvp-fab-sheet-open");
    else document.body.classList.remove("cvp-fab-sheet-open");
    return () => document.body.classList.remove("cvp-fab-sheet-open");
  }, [sheetOpen, mobile, config, hidden]);

  useEffect(() => {
    if (variant !== "builder" || typeof onBuilderGuideSheetOpenChange !== "function") return undefined;
    const open = menuOpen || sheetOpen;
    if (builderGuideSheetNotifySkipRef.current) {
      builderGuideSheetNotifySkipRef.current = false;
      return undefined;
    }
    onBuilderGuideSheetOpenChange(open);
    return undefined;
  }, [variant, menuOpen, sheetOpen, onBuilderGuideSheetOpenChange]);

  useImperativeHandle(
    ref,
    () => ({
      async runAtsDownloadGatekeeper() {
        resetSheetLayout();
        setSheetLayoutKind("download-only");
        setSheetTitle("Download");
        setSheetPoints([]);
        setSheetAtsHigh(false);
        setSheetCoach(null);
        setSheetGate(null);
        setSheetCoachPanelsFlag(false);
        setSheetShowProgress(false);
        setSheetShowGate(true);
        setSheetOpen(true);
        setFabExtraClass("cvp-fab-bounce-once");
        const gate = await getDownloadGatekeeperData().catch(() => ({ ...GATEKEEPER_FALLBACK }));
        setSheetGate(gate);
        await new Promise((r) => setTimeout(r, 300));
        setFabExtraClass("");
        return gate;
      },
      openGuideForCurrentTab() {
        if (variant !== "builder") return;
        if (sheetOpen || menuOpen) return;
        const useAtsHigh = tabKey === "ats" && atsScore >= 71 && !readFabSeen("ats");
        openGuideSheet(useAtsHigh);
      },
      triggerBuilderIdlePulse() {
        if (sheetOpen || menuOpen) return;
        setBuilderIdlePulse(true);
      },
      isGuideSheetOpen() {
        return sheetOpen || menuOpen;
      },
    }),
    [resetSheetLayout, variant, tabKey, atsScore, openGuideSheet, sheetOpen, menuOpen]
  );

  const openTemplatesSmartSheet = useCallback(() => {
    const rec = templateRecommendNames.length >= 2 ? templateRecommendNames : ["Modern Emerald", "Dubai Modern"];
    const mem = getFabMemory();
    const lastT = mem.lastTemplateId || "your last template";

    if (templatePickPending) {
      const name = templatePickPending.name || "this template";
      resetSheetLayout();
      setSheetTitle("Template preview");
      setSheetCoachPanelsFlag(false);
      setSheetShowProgress(false);
      setSheetShowGate(false);
      setShowSheetGotIt(false);
      setSheetPoints([]);
      setSheetBodySlot(
        <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary, #A0A0A0)", textAlign: "center", lineHeight: 1.5 }}>
          Want to see how your CV looks in <span style={{ color: "var(--text-primary, #FFF)", fontWeight: 600 }}>{name}</span>?
        </p>
      );
      setSheetFooterSlot(
        <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
          <button
            type="button"
            onClick={() => {
              onPreviewTemplateDraft?.(templatePickPending);
              closeSheet();
            }}
            style={{
              background: "#fff",
              color: "#000",
              borderRadius: 10,
              padding: 12,
              width: "100%",
              fontWeight: 600,
              fontSize: 14,
              border: "none",
              cursor: "pointer",
              minHeight: 44,
            }}
          >
            Preview
          </button>
          <button
            type="button"
            onClick={() => {
              onApplyTemplateDraft?.(templatePickPending);
              closeSheet();
            }}
            style={{
              background: "#1C1C1C",
              color: "#fff",
              borderRadius: 10,
              padding: 12,
              width: "100%",
              fontWeight: 600,
              fontSize: 14,
              border: "1px solid #2A2A2A",
              cursor: "pointer",
              minHeight: 44,
            }}
          >
            Apply it
          </button>
          <button
            type="button"
            onClick={() => {
              onClearTemplatePick?.();
              closeSheet();
            }}
            style={{
              background: "transparent",
              color: "#A0A0A0",
              borderRadius: 10,
              padding: 12,
              width: "100%",
              fontWeight: 500,
              fontSize: 13,
              border: "1px solid #2A2A2A",
              cursor: "pointer",
              minHeight: 44,
            }}
          >
            Keep browsing
          </button>
        </div>
      );
      setSheetOpen(true);
      return;
    }

    if (tplExtendedEligibleRef.current && templateSessionApplyCount === 0) {
      resetSheetLayout();
      setSheetTitle("Your template");
      setSheetCoachPanelsFlag(false);
      setSheetShowProgress(false);
      setSheetShowGate(false);
      setShowSheetGotIt(false);
      setSheetPoints([]);
      setSheetBodySlot(
        <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary, #A0A0A0)", textAlign: "center", lineHeight: 1.5 }}>
          Your current template is <span style={{ color: "var(--text-primary, #FFF)", fontWeight: 600 }}>{lastT}</span>. It&apos;s performing well for your ATS score. Only switch if you want a different look.
        </p>
      );
      setSheetFooterSlot(
        <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
          <button
            type="button"
            onClick={closeSheet}
            style={{
              background: "#fff",
              color: "#000",
              borderRadius: 10,
              padding: 12,
              width: "100%",
              fontWeight: 600,
              fontSize: 14,
              border: "none",
              cursor: "pointer",
              minHeight: 44,
            }}
          >
            Keep current
          </button>
          <button
            type="button"
            onClick={closeSheet}
            style={{
              background: "transparent",
              color: "#A0A0A0",
              borderRadius: 10,
              padding: 12,
              width: "100%",
              fontWeight: 500,
              fontSize: 13,
              border: "1px solid #2A2A2A",
              cursor: "pointer",
              minHeight: 44,
            }}
          >
            Switch anyway
          </button>
        </div>
      );
      setSheetOpen(true);
      return;
    }

    if (tplIdleEligibleRef.current) {
      resetSheetLayout();
      setSheetTitle("Template tips");
      setSheetCoachPanelsFlag(false);
      setSheetShowProgress(false);
      setSheetShowGate(false);
      setShowSheetGotIt(true);
      setSheetPoints([]);
      const a = rec[0] || "Modern Emerald";
      const b = rec[1] || "Dubai Modern";
      setSheetBodySlot(
        <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary, #A0A0A0)", textAlign: "center", lineHeight: 1.5 }}>
          Not sure which template? Based on your ATS score, we recommend <span style={{ color: "var(--text-primary, #FFF)", fontWeight: 600 }}>{a}</span> and{" "}
          <span style={{ color: "var(--text-primary, #FFF)", fontWeight: 600 }}>{b}</span>. Tap one to preview with your CV.
        </p>
      );
      setSheetFooterSlot(
        <button
          type="button"
          onClick={() => {
            closeSheet();
            setTimeout(() => openGuideSheet(false), 0);
          }}
          style={{
            marginTop: 12,
            background: "transparent",
            color: "#A0A0A0",
            borderRadius: 10,
            padding: 12,
            width: "100%",
            fontWeight: 500,
            fontSize: 13,
            border: "1px solid #2A2A2A",
            cursor: "pointer",
            minHeight: 44,
          }}
        >
          Open full guide
        </button>
      );
      setSheetOpen(true);
      return;
    }

    setMenuOpen(true);
  }, [
    templatePickPending,
    templateRecommendNames,
    templateSessionApplyCount,
    closeSheet,
    openGuideSheet,
    onPreviewTemplateDraft,
    onApplyTemplateDraft,
    onClearTemplatePick,
    resetSheetLayout,
  ]);

  const handleMenuPick = useCallback(
    (id) => {
      if (id === "guide") {
        const useAtsHigh =
          variant === "builder" && tabKey === "ats" && atsScore >= 71 && !readFabSeen("ats");
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
    const m = bumpFabSessionOpen();
    if (process.env.NODE_ENV === "development") {
      console.log("[FAB] sessionCount", m.sessionCount);
    }
    setTemplatesBounce(false);
    tplIdleEligibleRef.current = false;
    setTplIdlePulse(false);
    setBuilderIdlePulse(false);
    clearTplTimers();
    if (variant === "builder" && tabKey === "templates") {
      openTemplatesSmartSheet();
      return;
    }
    if (variant === "route" && tabKey === "cover-letter") {
      openGuideSheet(false);
      return;
    }
    setMenuOpen(true);
  }, [variant, tabKey, openTemplatesSmartSheet, openGuideSheet, clearTplTimers]);

  const triggerTipManually = useCallback(() => {
    const section = fabNormalizeSection(activeSection);
    const tips = SECTION_TIPS[section] ?? SECTION_TIPS.summary;
    const idx = tipIndexRef.current[section] ?? 0;
    setCurrentTip(tips[idx % tips.length]);
    tipIndexRef.current = { ...tipIndexRef.current, [section]: idx + 1 };
    setIsTipVisible(true);
    clearTimeout(tipDismissTimerRef.current);
  }, [activeSection]);

  const handleBulbTap = useCallback(() => {
    clearTimeout(bulbVisibleTimerRef.current);
    clearTimeout(tipDismissTimerRef.current);
    clearTimeout(bulbDimTimerRef.current);
    clearTimeout(bulbPostFlickerTimerRef.current);

    setIsBulbFlickering(false);
    setIsBulbLit(true);

    const section = fabNormalizeSection(activeSection);
    const tips = SECTION_TIPS[section] ?? SECTION_TIPS.summary;
    const idx = tipIndexRef.current[section] ?? 0;
    setCurrentTip(tips[idx % tips.length]);
    tipIndexRef.current = { ...tipIndexRef.current, [section]: idx + 1 };

    setIsTipVisible(true);
  }, [activeSection]);

  if (!mobile || !config || hidden) return null;

  const dedicatedRoute =
    sheetLayoutKind === "download-only"
      ? null
      : variant === "route" && ["ats", "cover-letter", "walkin", "account"].includes(tabKey)
        ? tabKey
        : variant === "builder" && tabKey === "ats"
          ? "ats"
          : null;

  const atsAttention = variant === "builder" && shouldShowAtsFabAttention(tabKey, atsScore);
  const fabAnimClass = [
    atsAttention ? "cvp-fab-anim-bounce-flicker" : "",
    templatesBounce && tabKey === "templates" ? "cvp-fab-anim-bounce" : "",
    tplIdlePulse || tplExtPulse ? "cvp-fab-pulse-idle" : "",
    builderIdlePulse ? "fabBuilderIdlePulse-active" : "",
    fabExtraClass,
  ]
    .filter(Boolean)
    .join(" ");

  const dotVisible = shouldShowFabDot(tabKey, false);

  const progress = cvCompletionProgress?.percent ?? 0;
  const ringColor = fabRingColor(cvCompletionProgress?.percent ?? 0);
  const ringOffset = FAB_PROGRESS_CIRCUMFERENCE - (progress / 100) * FAB_PROGRESS_CIRCUMFERENCE;

  return (
    <>
      <div
        ref={anchorRef}
        className={`cvp-fab-layer cvp-fab-sticky-wrap${sheetOpen ? " cvp-fab-sheet-open" : ""}${isGhostPulsing ? " pulse-ghost" : ""}${variant === "builder" && fabBouncing ? " cvp-fab-bouncing" : ""}`}
        style={{ willChange: "transform, opacity" }}
      >
        {variant === "builder" ? (
          <div className="cvp-fab-sticky-wrap--builder">
            <svg
              className="cvp-fab-progress-svg"
              viewBox="0 0 68 68"
              aria-hidden
              style={{
                position: "absolute",
                width: "72px",
                height: "72px",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                pointerEvents: "none",
                zIndex: 1,
                overflow: "visible",
              }}
            >
              <circle cx="34" cy="34" r="30" fill="none" stroke="#2A2A2A" strokeWidth="2" />
              <circle
                ref={progressRingRef}
                className="cvp-fab-progress-ring"
                cx="34"
                cy="34"
                r="30"
                fill="none"
                stroke={ringColor}
                strokeWidth="2"
                strokeDasharray={FAB_PROGRESS_CIRCUMFERENCE}
                strokeDashoffset={ringOffset}
                strokeLinecap="round"
                transform="rotate(-90 34 34)"
              />
            </svg>
            <FABButton
              onClick={onFabActivate}
              showDot={dotVisible}
              className={fabAnimClass}
              onAnimationEnd={(e) => {
                if (e.animationName === "fabPulse") {
                  setTplIdlePulse(false);
                  setTplExtPulse(false);
                }
                if (e.animationName === "fabBuilderIdlePulse") {
                  setBuilderIdlePulse(false);
                }
              }}
            />
            {isBubbleVisible ? (
              <div
                className="cvp-fab-status-bubble"
                style={{
                  position: "absolute",
                  bottom: "60px",
                  right: "56px",
                  zIndex: 9998,
                }}
              >
                <p className="cvp-fab-bubble-title">{bubbleTitle}</p>
                <p className="cvp-fab-bubble-sub">{bubbleSub}</p>
                <div className="cvp-fab-bubble-divider" />
                <p className="cvp-fab-bubble-tip-link" onClick={() => triggerTipManually()}>
                  Feeling stuck? Get a tip →
                </p>
              </div>
            ) : null}
            <div
              ref={bulbRef}
              className="cvp-fab-bulb-cluster"
              style={{
                opacity: isBulbVisible ? 1 : 0,
                pointerEvents: isBulbVisible ? "auto" : "none",
                transition: "opacity 600ms cubic-bezier(0.4, 0, 0.2, 1)",
              }}
            >
              <button
                type="button"
                className={`cvp-fab-bulb${isBulbLit ? " cvp-fab-bulb--lit" : ""}${isBulbFlickering ? " cvp-fab-bulb--flicker" : ""}`}
                onClick={handleBulbTap}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden>
                  <circle cx="10" cy="8.5" r="4" stroke="currentColor" strokeWidth="1.4" />
                  <path
                    d="M8 12.5 Q8 14 10 14 Q12 14 12 12.5"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    fill="none"
                    strokeLinecap="round"
                  />
                  <line x1="8.5" y1="15" x2="11.5" y2="15" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  <line x1="9" y1="16.5" x2="11" y2="16.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
                <svg
                  className="cvp-fab-bulb-rays"
                  width="20"
                  height="20"
                  viewBox="0 0 20 20"
                  fill="none"
                  aria-hidden
                  style={{
                    position: "absolute",
                    inset: 0,
                    opacity: isBulbLit ? 1 : 0,
                    transition: "opacity 300ms cubic-bezier(0.4, 0, 0.2, 1)",
                  }}
                >
                  <line x1="10" y1="3" x2="10" y2="1.5" stroke="#F59E0B" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
                  <line x1="14.5" y1="4.5" x2="15.5" y2="3.5" stroke="#F59E0B" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
                  <line x1="5.5" y1="4.5" x2="4.5" y2="3.5" stroke="#F59E0B" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
                </svg>
              </button>
              {isTipVisible ? (
                <div className="cvp-fab-tip-bubble cvp-fab-tip-bubble--bulb-cluster" style={{ zIndex: 9999 }}>
                  <div className="cvp-fab-tip-header">
                    <span className="cvp-fab-tip-label">TIP</span>
                  </div>
                  <p className="cvp-fab-tip-text">{currentTip}</p>
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <FABButton
            onClick={onFabActivate}
            showDot={dotVisible}
            className={fabAnimClass}
            onAnimationEnd={(e) => {
              if (e.animationName === "fabPulse") {
                setTplIdlePulse(false);
                setTplExtPulse(false);
              }
              if (e.animationName === "fabBuilderIdlePulse") {
                setBuilderIdlePulse(false);
              }
            }}
          />
        )}
      </div>

      <FABMenu open={menuOpen} onClose={() => setMenuOpen(false)} options={config.menuOptions} anchorRef={anchorRef} onSelect={handleMenuPick} />

      <FABSheet
        open={sheetOpen}
        onClose={closeSheet}
        variant={variant}
        tabKey={tabKey}
        sheetLayoutKind={sheetLayoutKind}
        title={sheetTitle}
        points={sheetPoints}
        tabStorageKey={sheetAtsHigh ? "ats" : tabKey}
        proCtaLabel={sheetAtsHigh ? "Check Pro ATS →" : undefined}
        onProCta={sheetAtsHigh ? runProAtsNav : undefined}
        zOverlay={sheetZOverlay}
        zSheet={sheetZSheet}
        showCoachPanels={sheetCoachPanelsFlag}
        showProgressCoach={sheetShowProgress}
        showDownloadGatekeeper={sheetShowGate}
        progressCoach={sheetCoach}
        downloadGatekeeper={sheetGate}
        sheetBodySlot={sheetBodySlot}
        sheetFooterSlot={sheetFooterSlot}
        showGotItButton={showSheetGotIt}
        sheetIntelligence={!sheetBodySlot && sheetCoachPanelsFlag && !sheetAtsHigh && dedicatedRoute == null}
        coverLetterCrossSell={
          variant === "builder" && !sheetBodySlot && sheetCoachPanelsFlag && !sheetAtsHigh && dedicatedRoute == null
        }
        atsScore={typeof atsScore === "number" && Number.isFinite(atsScore) ? atsScore : Number(atsScore) || 0}
        dedicatedRoute={dedicatedRoute}
        atsChecks={Array.isArray(atsChecks) ? atsChecks : []}
        coverLetterState={coverLetterState}
        coverLetterEmptyFieldLabels={coverLetterEmptyFieldLabels}
        coverLetterOnFocusFirstEmpty={coverLetterOnFocusFirstEmpty}
        coverLetterOnGenerate={coverLetterOnGenerate}
        coverLetterOnDownload={coverLetterOnDownload}
        coverLetterOnRegenerate={coverLetterOnRegenerate}
        walkInCvBuilt={walkInCvBuilt}
        walkInOnStart={walkInOnStart}
        walkInOnDownload={walkInOnDownload}
        sheetAtsHigh={sheetAtsHigh}
        cvCompletionProgress={cvCompletionProgress}
        onNavigateToJobMatch={
          onNavigateToJobMatch
            ? () => {
                onNavigateToJobMatch();
                closeSheet();
              }
            : undefined
        }
        onNavigateToCoverLetter={
          onNavigateToCoverLetter
            ? () => {
                onNavigateToCoverLetter();
                closeSheet();
              }
            : undefined
        }
        onProgressCoachNavigate={(key) => {
          onNavigateToCvSection?.(key);
          closeSheet();
        }}
        onNavigateAuth={() => {
          navigate("/auth");
          closeSheet();
        }}
        onNavigatePricing={() => {
          navigate("/pricing");
          closeSheet();
        }}
      />
    </>
  );
});

export default FAB;
