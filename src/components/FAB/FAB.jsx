import { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import "./FAB.css";
import FABMenu from "./FABMenu";
import FABSheet, { FabSparkIcon } from "./FABSheet";
import FABMilestonePopup from "./FABMilestonePopup";
import { getFabTabConfig, ATS_HIGH_SCORE_GUIDE } from "./FABContent";
import { computeCvProgress } from "../../hooks/useCvProgress";
import { splitCommaItems } from "../../cvShared";
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
  writeFabMemory,
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

const MILESTONE_COPY = {
  0: "Welcome. Let's build your standout CV. Start with your Summary.",
  20: "Good start. Fill in your experience next.",
  40: "Halfway there. Add your skills.",
  60: "Looking strong. Education next.",
  80: "Almost done. One section left.",
  90: "So close. Final push.",
  100: "CV complete. Download it now. ✓",
};

function fabRingColor(p) {
  const n = p ?? 0;
  if (n >= 100) return "#22C55E";
  if (n >= 90) return "#16A34A";
  if (n >= 80) return "#D97706";
  if (n >= 70) return "#F59E0B";
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

const IDLE_NUDGE_COOLDOWN_MS = 5 * 60 * 1000;
const MAX_IDLE_AUTO_POP_PER_SESSION = 3;

/** Insert into builder summary textarea (controlled input — native setter + input event). */
function insertSummaryIntoBuilder(text) {
  if (typeof document === "undefined") return;
  const ta = document.querySelector('[data-cvp-highlight="summary"] textarea');
  if (!ta || !(ta instanceof HTMLTextAreaElement)) return;
  const desc = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value");
  if (desc?.set) desc.set.call(ta, text);
  else ta.value = text;
  ta.dispatchEvent(new Event("input", { bubbles: true }));
}

function skillsCountFromResume(resume) {
  const skills = resume?.skills;
  return Array.isArray(skills) ? skills.length : splitCommaItems(typeof skills === "string" ? skills : "").length;
}

function hasExperienceForSummaryHelper(resume) {
  const ex = resume?.experience;
  if (!Array.isArray(ex) || ex.length === 0) return false;
  return ex.some((e) => String(e?.role ?? e?.company ?? "").trim().length > 0);
}

function hasSkillsForSummaryHelper(resume) {
  return skillsCountFromResume(resume) >= 3;
}

function inferYearsFromExperience(experience) {
  if (!Array.isArray(experience) || experience.length === 0) return 2;
  return Math.max(1, Math.min(30, experience.length * 2));
}

function buildTemplateSummaryLines(resume) {
  const ex = Array.isArray(resume?.experience) ? resume.experience : [];
  const first = ex[0] || {};
  const jobTitle = String(resume?.title || first.role || "Professional").trim() || "Professional";
  const yearsExp = inferYearsFromExperience(ex);
  const skillsList = splitCommaItems(String(resume?.skills || ""));
  const top = skillsList.slice(0, 3);
  const topSkills =
    top.length >= 2
      ? `${top.slice(0, -1).join(", ")} and ${top[top.length - 1]}`
      : top[0] || "your field";
  const skills = skillsList.length ? skillsList.join(", ") : topSkills;
  const targetRole = String(resume?.title || first.role || "new").trim() || "new";
  const location = String(resume?.location || "Dubai, UAE").trim() || "Dubai, UAE";
  const line1 = `${jobTitle} with ${yearsExp} years of experience in ${topSkills}.`;
  const line2 = `Skilled in ${skills}.`;
  const line3 = `Currently seeking a ${targetRole} role in ${location}.`;
  return `${line1}\n${line2}\n${line3}`;
}

/**
 * @returns {{ kind: string, message: string, ctaLabel: string, navKey: string | null, atsCta?: boolean } | null}
 */
function pickContentIdleNudge(resume) {
  if (resume == null || typeof resume !== "object") return null;
  const progress = computeCvProgress(resume);
  const summaryEmpty = String(resume.summary ?? "").trim().length === 0;
  const noExp = !Array.isArray(resume.experience) || resume.experience.length === 0;
  const skillsWeak = skillsCountFromResume(resume) < 3;

  if (summaryEmpty) {
    return {
      kind: "nudge-summary",
      message: "Your summary is missing — it's the first thing recruiters read",
      ctaLabel: "Add summary",
      navKey: "summary",
    };
  }
  if (noExp) {
    return {
      kind: "nudge-experience",
      message: "Add your work experience to strengthen your CV",
      ctaLabel: "Add experience",
      navKey: "experience",
    };
  }
  if (skillsWeak) {
    return {
      kind: "nudge-skills",
      message: "Add skills to pass ATS filters",
      ctaLabel: "Add skills",
      navKey: "skills",
    };
  }
  if (progress.percent >= 80) {
    return {
      kind: "nudge-ats",
      message: "Almost done! Check your ATS score",
      ctaLabel: "View ATS score",
      navKey: null,
      atsCta: true,
    };
  }
  return null;
}

function cvHasSomeFilledContent(resume) {
  if (resume == null || typeof resume !== "object") return false;
  const p = computeCvProgress(resume);
  if (p.percent > 0) return true;
  const s = String(resume.summary ?? "").trim();
  if (s.length > 0) return true;
  if (Array.isArray(resume.experience) && resume.experience.length > 0) return true;
  if (skillsCountFromResume(resume) > 0) return true;
  return false;
}

const SUMMARY_TIP_CHIPS = [
  "Start with your job title + years of experience",
  "Add your top 2-3 skills",
  "End with what you're looking for",
];

function FabSummaryHelperBody({
  onInsertTip,
  onWriteForMe,
  writeForMeMessage,
  previewText,
  onUseThis,
  onEditFirst,
}) {
  const chipStyle = {
    border: "1px solid #3A3A3A",
    background: "transparent",
    color: "#FFF",
    fontSize: 12,
    padding: "8px 12px",
    borderRadius: 99,
    display: "block",
    width: "100%",
    textAlign: "left",
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "inherit",
    lineHeight: 1.35,
    transition: "border-color 200ms cubic-bezier(0.4, 0, 0.2, 1), background-color 200ms cubic-bezier(0.4, 0, 0.2, 1)",
  };

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {SUMMARY_TIP_CHIPS.map((tip) => (
          <button key={tip} type="button" onClick={() => onInsertTip(tip)} style={chipStyle}>
            {tip}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onWriteForMe}
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
        Write for me
      </button>
      {writeForMeMessage ? (
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary, #A0A0A0)", lineHeight: 1.45, textAlign: "center" }}>
          {writeForMeMessage}
        </p>
      ) : null}
      {previewText ? (
        <div
          style={{
            background: "#1C1C1C",
            border: "1px solid var(--border-default, #2A2A2A)",
            borderRadius: 12,
            padding: 12,
            boxSizing: "border-box",
          }}
        >
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--text-primary, #FFF)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
            {previewText}
          </p>
          <div style={{ display: "grid", gap: 8 }}>
            <button
              type="button"
              onClick={onUseThis}
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
              Use this
            </button>
            <button
              type="button"
              onClick={onEditFirst}
              style={{
                background: "transparent",
                color: "#FFF",
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
              Edit first
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
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
    /** Builder: update CV from guided coach */
    setResume = null,
    /** Builder: bump to reset/open guided coach (e.g. New CV → Guide me) */
    guidedCoachRequestKey = 0,
    fabMode = "assistant",
    guideStep = 0,
    currentGuideStep = null,
    advanceGuideStep = () => {},
    /** Builder: section tapped from preview — append contextual coach message */
    contextualSection = null,
    /** Builder: PDF download from guided flow */
    onGuidedDownload = null,
    /** Builder: open CV preview from guided flow */
    onGuidedOpenPreview = null,
    /** Builder: switch to Templates tab from guided flow */
    onGuidedSwitchToTemplatesTab = null,
    /** Builder: ATS checker route (guided flow “ATS tab”) */
    onGuidedSwitchToAtsTab = null,
    onNavigateToTab = null,
    retreatGuideStep = () => {},
    activeGuideSection = null,
    navigationSource = null,
    scanStatus = "idle",
    features = null,
    isPro = false,
    onPostPaymentCoverLetter = null,
    /** ATS tab: trigger free scan using existing resume data (builder context) */
    onFabFreeScan = null,
    /** ATS tab: trigger pro analysis with job description */
    onFabProScan = null,
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
  const [summaryWriteMsg, setSummaryWriteMsg] = useState(null);
  const [summaryPreview, setSummaryPreview] = useState(null);
  const [idleNudgePayload, setIdleNudgePayload] = useState(null);
  const idleAutoPopCountRef = useRef(0);
  const lastIdlePopDismissAtRef = useRef({});
  const idleNudgeKindRef = useRef(null);
  const summaryOpenedFromAutoRef = useRef(false);
  const sheetLayoutKindRef = useRef("normal");
  const anchorRef = useRef(null);
  const prevTemplateIdRef = useRef(undefined);
  const [templatesBounce, setTemplatesBounce] = useState(false);
  const [fabExtraClass, setFabExtraClass] = useState("");
  const [tplIdlePulse, setTplIdlePulse] = useState(false);
  const [tplExtPulse, setTplExtPulse] = useState(false);
  const [builderIdlePulse, setBuilderIdlePulse] = useState(false);
  const tplTimersRef = useRef([]);
  const guidedFlowRecentlyClosedRef = useRef(false);
  const guidedPostSummaryStageSyncRef = useRef("qa");
  const builderGuideSheetNotifySkipRef = useRef(true);
  const atsLandTriggeredRef = useRef(false);
  const tplTabEpochRef = useRef(0);
  const tplIdleEligibleRef = useRef(false);
  const tplExtendedEligibleRef = useRef(false);
  const templateSessionApplyRef = useRef(0);
  templateSessionApplyRef.current = templateSessionApplyCount;

  const idleTimer = useRef(null);
  const [isGhostPulsing, setIsGhostPulsing] = useState(false);
  const [isStandby, setIsStandby] = useState(false);
  const ghostPulseKillArmedRef = useRef(false);

  const progressRingRef = useRef(null);
  const prevProgressRef = useRef(null);
  const prevRingColorRef = useRef(null);
  const [fabRingClickClass, setFabRingClickClass] = useState("");
  const [fabVictoryClass, setFabVictoryClass] = useState("");
  const [milestoneMessage, setMilestoneMessage] = useState(null);
  const [milestoneVisible, setMilestoneVisible] = useState(false);
  const [bulbEntrance, setBulbEntrance] = useState(false);
  const bounceTimeoutRef = useRef(null);
  const bulbSectionTimerRef = useRef(null);
  const bulbVisibleTimerRef = useRef(null);
  const tipDismissTimerRef = useRef(null);
  const bulbPostFlickerTimerRef = useRef(null);
  const bulbDimTimerRef = useRef(null);
  const bulbRef = useRef(null);
  const bulbAppearCountRef = useRef(0);
  const tipIndexRef = useRef({});

  const [fabBouncing, setFabBouncing] = useState(false);
  const [isBulbVisible, setIsBulbVisible] = useState(false);
  const [isBulbLit, setIsBulbLit] = useState(false);
  const [isBulbFlickering, setIsBulbFlickering] = useState(false);
  const [isTipVisible, setIsTipVisible] = useState(false);
  const [currentTip, setCurrentTip] = useState("");

  // FIX 2 — Keyboard awareness: shrink FAB when soft keyboard opens
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const baseViewportHeightRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const vv = window.visualViewport;
    const onVpResize = () => {
      if (baseViewportHeightRef.current === null) baseViewportHeightRef.current = vv.height;
      const shrinkage = baseViewportHeightRef.current - vv.height;
      const isOpen = shrinkage > 100;
      setKeyboardOpen(isOpen);
      // Sync body class so tab bar CSS can react globally
      document.body.classList.toggle("cvp-keyboard-open", isOpen);
    };
    baseViewportHeightRef.current = vv.height;
    vv.addEventListener("resize", onVpResize);
    return () => {
      vv.removeEventListener("resize", onVpResize);
      document.body.classList.remove("cvp-keyboard-open");
    };
  }, []);

  // FIX 3 — Tab entrance animation class
  const prevTabKeyRef = useRef(tabKey);
  const [tabEnterClass, setTabEnterClass] = useState("");
  useEffect(() => {
    if (prevTabKeyRef.current === tabKey) return;
    prevTabKeyRef.current = tabKey;
    setTabEnterClass("cvp-fab-tab-enter");
    const t = setTimeout(() => setTabEnterClass(""), 500);
    return () => clearTimeout(t);
  }, [tabKey]);

  const config = getFabTabConfig(tabKey, variant);

  useEffect(() => {
    sheetLayoutKindRef.current = sheetLayoutKind;
  }, [sheetLayoutKind]);

  const resetTimer = useCallback(() => {
    clearTimeout(idleTimer.current);
    ghostPulseKillArmedRef.current = false;
    setIsGhostPulsing(false);
    const delayMs = variant === "builder" ? 45000 : 15000;
    idleTimer.current = setTimeout(() => {
      if (typeof document !== "undefined") {
        const el = document.activeElement;
        const tag = el?.tagName?.toUpperCase();
        if (tag === "INPUT" || tag === "TEXTAREA") {
          resetTimer();
          return;
        }
      }
      if (variant === "builder" && tabKey === "content") {
        resetTimer();
        return;
      }
      setIsGhostPulsing(true);
    }, delayMs);
  }, [variant, tabKey]);

  useEffect(() => {
    if (variant !== "builder" && !window.location.pathname.startsWith("/builder")) return;
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
  }, [resetTimer, variant]);

  useEffect(() => {
    if (isGhostPulsing) ghostPulseKillArmedRef.current = true;
  }, [isGhostPulsing]);

  useEffect(() => {
    const killGhostOnce = () => {
      if (!ghostPulseKillArmedRef.current) return;
      ghostPulseKillArmedRef.current = false;
      setIsGhostPulsing(false);
    };
    document.addEventListener("mousedown", killGhostOnce, { passive: true });
    document.addEventListener("touchstart", killGhostOnce, { passive: true });
    document.addEventListener("keydown", killGhostOnce, { passive: true });
    return () => {
      document.removeEventListener("mousedown", killGhostOnce);
      document.removeEventListener("touchstart", killGhostOnce);
      document.removeEventListener("keydown", killGhostOnce);
    };
  }, []);

  useEffect(() => {
    const onCvDownloaded = () => {
      setFabVictoryClass("fab--victory");
      window.setTimeout(() => setFabVictoryClass(""), 600);
    };
    window.addEventListener("cvp-fab-cv-downloaded", onCvDownloaded);
    return () => window.removeEventListener("cvp-fab-cv-downloaded", onCvDownloaded);
  }, []);

  useEffect(() => {
    return () => {
      clearTimeout(bounceTimeoutRef.current);
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
      prevRingColorRef.current = null;
    }
  }, [variant]);

  useEffect(() => {
    if (variant !== "builder") return undefined;
    const p = cvCompletionProgress?.percent ?? 0;

    if (prevProgressRef.current === null) {
      prevProgressRef.current = p;
      if (p === 0) {
        const mem = getFabMemory();
        if (!mem.firstVisitDone) {
          setMilestoneMessage(MILESTONE_COPY[0]);
          setMilestoneVisible(true);
          writeFabMemory({ firstVisitDone: true });
        }
      }
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

    for (const m of [20, 40, 60, 80, 90, 100]) {
      if (prev < m && p >= m) {
        setMilestoneMessage(MILESTONE_COPY[m]);
        setMilestoneVisible(true);
      }
    }

    prevProgressRef.current = p;
    return undefined;
  }, [cvCompletionProgress, variant]);

  useEffect(() => {
    if (variant !== "builder") return undefined;
    const p = cvCompletionProgress?.percent ?? 0;
    const c = fabRingColor(p);
    if (prevRingColorRef.current === null) {
      prevRingColorRef.current = c;
      return undefined;
    }
    if (c !== prevRingColorRef.current) {
      prevRingColorRef.current = c;
      setFabRingClickClass("fab-ring--click");
      const t = window.setTimeout(() => setFabRingClickClass(""), 120);
      return () => clearTimeout(t);
    }
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
      setBulbEntrance(true);
      window.setTimeout(() => setBulbEntrance(false), 300);
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
      if (
        (bulbRef.current && bulbRef.current.contains(e.target)) ||
        (anchorRef.current && anchorRef.current.contains(e.target))
      ) return;
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
    setSummaryWriteMsg(null);
    setSummaryPreview(null);
    setIdleNudgePayload(null);
  }, []);

  const closeSheet = useCallback(() => {
    const layout = sheetLayoutKindRef.current;
    if (layout === "idle-nudge" && idleNudgeKindRef.current) {
      lastIdlePopDismissAtRef.current[idleNudgeKindRef.current] = Date.now();
    }
    if (layout === "summary-helper" && summaryOpenedFromAutoRef.current) {
      lastIdlePopDismissAtRef.current["summary-helper-idle"] = Date.now();
    }
    idleNudgeKindRef.current = null;
    summaryOpenedFromAutoRef.current = false;
    setSheetOpen(false);
    setSheetAtsHigh(false);
    setSheetCoach(null);
    setSheetGate(null);
    setSheetLayoutKind("normal");
    resetSheetLayout();
  }, [resetSheetLayout]);

  const handleFabSheetClose = useCallback(() => {
    if (guidedPostSummaryStageSyncRef.current === "done" || guidedCoachRequestKey > 0) {
      guidedFlowRecentlyClosedRef.current = true;
      setTimeout(() => {
        guidedFlowRecentlyClosedRef.current = false;
      }, 300000);
    }
    closeSheet();
  }, [guidedCoachRequestKey, closeSheet]);

  const runProAtsNav = useCallback(() => {
    if (onNavigateToProAts) onNavigateToProAts();
    else navigate("/ats");
  }, [navigate, onNavigateToProAts]);

  const sheetOpenRef = useRef(false);
  const menuOpenRef = useRef(false);
  useEffect(() => {
    sheetOpenRef.current = sheetOpen;
  }, [sheetOpen]);
  useEffect(() => {
    menuOpenRef.current = menuOpen;
  }, [menuOpen]);

  const isIdleCooldownClear = useCallback((kind) => {
    const t = lastIdlePopDismissAtRef.current[kind];
    if (t == null) return true;
    return Date.now() - t >= IDLE_NUDGE_COOLDOWN_MS;
  }, []);

  const openSummaryHelperSheet = useCallback(
    (opts = {}) => {
      if (guidedFlowRecentlyClosedRef.current) return false;
      const fromAutoIdle = opts.fromAutoIdle === true;
      if (sheetOpenRef.current || menuOpenRef.current) return false;
      if (fromAutoIdle) {
        if (idleAutoPopCountRef.current >= MAX_IDLE_AUTO_POP_PER_SESSION) return false;
        if (!isIdleCooldownClear("summary-helper-idle")) return false;
        idleAutoPopCountRef.current += 1;
      }
      summaryOpenedFromAutoRef.current = fromAutoIdle;
      resetSheetLayout();
      setSheetLayoutKind("summary-helper");
      setSheetTitle("Writing your summary?");
      setSheetPoints([]);
      setSheetAtsHigh(false);
      setSheetCoach(null);
      setSheetCoachPanelsFlag(false);
      setSheetShowProgress(false);
      setSheetShowGate(false);
      setSheetGate(null);
      setShowSheetGotIt(true);
      setSheetOpen(true);
      return true;
    },
    [resetSheetLayout, isIdleCooldownClear]
  );

  const tryOpenBuilderContentIdleAutoSheet = useCallback(() => {
    if (variant !== "builder" || tabKey !== "content") return false;
    if (fabMode === "guide") return false;
    if (sheetOpenRef.current || menuOpenRef.current) return false;
    if (typeof document !== "undefined") {
      const el = document.activeElement;
      const tag = el?.tagName?.toUpperCase();
      if (tag === "INPUT" || tag === "TEXTAREA") return false;
    }
    if (!cvHasSomeFilledContent(resume)) return false;

    const section = fabNormalizeSection(activeSection);
    if (section === "summary") {
      return openSummaryHelperSheet({ fromAutoIdle: true });
    }

    if (idleAutoPopCountRef.current >= MAX_IDLE_AUTO_POP_PER_SESSION) return false;

    const nudge = pickContentIdleNudge(resume);
    if (!nudge) return false;
    if (!isIdleCooldownClear(nudge.kind)) return false;

    idleAutoPopCountRef.current += 1;
    idleNudgeKindRef.current = nudge.kind;
    resetSheetLayout();
    setSheetLayoutKind("idle-nudge");
    setSheetTitle("");
    setSheetPoints([]);
    setSheetAtsHigh(false);
    setSheetCoach(null);
    setSheetCoachPanelsFlag(false);
    setSheetShowProgress(false);
    setSheetShowGate(false);
    setSheetGate(null);
    setIdleNudgePayload(nudge);
    setShowSheetGotIt(true);
    setSheetOpen(true);
    return true;
  }, [variant, tabKey, fabMode, resume, activeSection, resetSheetLayout, isIdleCooldownClear, openSummaryHelperSheet]);

  const onSummaryInsertTip = useCallback((tip) => {
    if (typeof document === "undefined") return;
    const ta = document.querySelector('[data-cvp-highlight="summary"] textarea');
    const cur = ta && ta instanceof HTMLTextAreaElement ? String(ta.value || "").trim() : "";
    insertSummaryIntoBuilder(cur ? `${cur}\n\n${tip}` : tip);
  }, []);

  const onSummaryWriteForMe = useCallback(() => {
    if (!hasExperienceForSummaryHelper(resume) || !hasSkillsForSummaryHelper(resume)) {
      setSummaryWriteMsg("Fill in your experience and skills first for a better summary");
      setSummaryPreview(null);
      return;
    }
    setSummaryWriteMsg(null);
    setSummaryPreview(buildTemplateSummaryLines(resume));
  }, [resume]);

  const onSummaryUseThis = useCallback(() => {
    if (!summaryPreview) return;
    insertSummaryIntoBuilder(summaryPreview);
    closeSheet();
  }, [summaryPreview, closeSheet]);

  const onSummaryEditFirst = useCallback(() => {
    if (!summaryPreview) return;
    insertSummaryIntoBuilder(summaryPreview);
    onNavigateToCvSection?.("summary");
    closeSheet();
  }, [summaryPreview, onNavigateToCvSection, closeSheet]);

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
          const skipGateFetch = variant === "builder" && tabKey === "content";
          if (!skipGateFetch) {
            getDownloadGatekeeperData()
              .then(setSheetGate)
              .catch(() => setSheetGate({ ...GATEKEEPER_FALLBACK }));
          }
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
        if (sheetOpenRef.current || menuOpenRef.current) return;
        if (variant === "builder" && tabKey === "content") {
          tryOpenBuilderContentIdleAutoSheet();
          return;
        }
        setBuilderIdlePulse(true);
      },
      isGuideSheetOpen() {
        return sheetOpen || menuOpen;
      },
      openGuidedCoachSheet() {
        if (variant !== "builder") return;
        guidedFlowRecentlyClosedRef.current = false;
        openGuideSheet(false);
      },
      setStandby(val) {
        setIsStandby(val);
      },
    }),
    [resetSheetLayout, variant, tabKey, atsScore, openGuideSheet, sheetOpen, menuOpen, tryOpenBuilderContentIdleAutoSheet, setIsStandby]
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

  const dismissMilestonePopup = useCallback(() => setMilestoneVisible(false), []);
  const clearMilestoneMessageAfterExit = useCallback(() => setMilestoneMessage(null), []);

  useEffect(() => {
    if (variant === "builder" && fabMode === "guide") closeSheet();
  }, [variant, fabMode, closeSheet]);

  const onFabActivate = useCallback(() => {
    if (variant === "builder" && fabMode === "guide") return;
    const m = bumpFabSessionOpen();
    if (process.env.NODE_ENV === "development") {
      console.log("[FAB] sessionCount", m.sessionCount);
    }
    setTemplatesBounce(false);
    tplIdleEligibleRef.current = false;
    setTplIdlePulse(false);
    setBuilderIdlePulse(false);
    clearTplTimers();
    if (variant === "builder" && tabKey === "content" && fabNormalizeSection(activeSection) === "summary") {
      openSummaryHelperSheet({ fromAutoIdle: false });
      return;
    }
    if (variant === "builder" && tabKey === "templates") {
      openTemplatesSmartSheet();
      return;
    }
    if (variant === "route" && tabKey === "cover-letter") {
      openGuideSheet(false);
      return;
    }
    setMenuOpen(true);
  }, [variant, tabKey, activeSection, fabMode, openTemplatesSmartSheet, openGuideSheet, openSummaryHelperSheet, clearTplTimers]);

  const effectiveSheetBodySlot = useMemo(() => {
    if (sheetLayoutKind === "summary-helper") {
      return (
        <FabSummaryHelperBody
          onInsertTip={onSummaryInsertTip}
          onWriteForMe={onSummaryWriteForMe}
          writeForMeMessage={summaryWriteMsg}
          previewText={summaryPreview}
          onUseThis={onSummaryUseThis}
          onEditFirst={onSummaryEditFirst}
        />
      );
    }
    if (sheetLayoutKind === "idle-nudge" && idleNudgePayload) {
      const nudge = idleNudgePayload;
      return (
        <div style={{ textAlign: "center", width: "100%" }}>
          <FabSparkIcon size={28} stroke="#fff" />
          <p style={{ margin: "12px 0 16px", fontSize: 14, color: "var(--text-secondary, #A0A0A0)", lineHeight: 1.45 }}>
            {nudge.message}
          </p>
          <button
            type="button"
            onClick={() => {
              closeSheet();
              if (nudge.atsCta) runProAtsNav();
              else if (nudge.navKey) onNavigateToCvSection?.(nudge.navKey);
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
            {nudge.ctaLabel}
          </button>
        </div>
      );
    }
    return sheetBodySlot;
  }, [
    sheetLayoutKind,
    summaryWriteMsg,
    summaryPreview,
    sheetBodySlot,
    idleNudgePayload,
    onSummaryInsertTip,
    onSummaryWriteForMe,
    onSummaryUseThis,
    onSummaryEditFirst,
    runProAtsNav,
    onNavigateToCvSection,
    closeSheet,
  ]);

  const compactCoachHide = sheetLayoutKind === "summary-helper" || sheetLayoutKind === "idle-nudge";

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

  if (!mobile || hidden) return null;
  if (!config && fabMode !== "guide") return null;

  if (isStandby) return (
    <AnimatePresence>
      <motion.div
        layoutId="cv-pilot-fab"
        animate={{ scale: [1, 1.3, 1] }}
        transition={{ 
          repeat: Infinity, 
          duration: 1.5, 
          ease: "easeInOut" 
        }}
        style={{
          width: 12,
          height: 12,
          borderRadius: "50%",
          background: "#D97706",
          position: "fixed",
          bottom: 24,
          right: 24,
          zIndex: 9999,
        }}
      />
    </AnimatePresence>
  );

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
      <motion.div
        ref={anchorRef}
        layoutId="cv-pilot-fab"
        layout
        className={[
          "cvp-fab-layer",
          "cvp-fab-sticky-wrap",
          sheetOpen ? "cvp-fab-sheet-open" : "",
          isGhostPulsing ? "pulse-ghost" : "",
          variant === "builder" && fabBouncing ? "cvp-fab-bouncing" : "",
          fabVictoryClass,
          keyboardOpen ? "cvp-fab--kb-open" : "",
          tabEnterClass,
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ willChange: "transform" }}
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
                transform: "translate(-50%, -50%) translateZ(0)",
                pointerEvents: "none",
                zIndex: 1,
                overflow: "visible",
                willChange: "transform",
              }}
            >
              <circle cx="34" cy="34" r="30" fill="none" stroke="#2A2A2A" strokeWidth="2" />
              <g transform="rotate(-90 34 34)">
                <circle
                  ref={progressRingRef}
                  className={`cvp-fab-progress-ring${fabRingClickClass ? ` ${fabRingClickClass}` : ""}`.trim()}
                  cx="34"
                  cy="34"
                  r="30"
                  fill="none"
                  stroke={ringColor}
                  strokeWidth="2"
                  strokeDasharray={FAB_PROGRESS_CIRCUMFERENCE}
                  strokeDashoffset={ringOffset}
                  strokeLinecap="round"
                  style={{ transformOrigin: "34px 34px" }}
                />
              </g>
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
            <div
              className="cvp-fab-progress-pct"
              aria-hidden
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                zIndex: 3,
                pointerEvents: "none",
                fontSize: 11,
                fontWeight: 700,
                color: "#FFFFFF",
                lineHeight: 1,
                textShadow: "0 0 3px #000000, 0 0 5px #000000",
              }}
            >
              {Math.min(100, Math.max(0, Math.round(Number(progress) || 0)))}%
            </div>
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
                className={`cvp-fab-bulb${isBulbLit ? " cvp-fab-bulb--lit" : ""}${isBulbFlickering ? " cvp-fab-bulb--flicker" : ""}${bulbEntrance ? " cvp-fab-bulb--entrance" : ""}`.trim()}
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
      </motion.div>

      {variant === "builder" ? (
        <FABMilestonePopup
          message={milestoneMessage}
          visible={milestoneVisible}
          onDismiss={dismissMilestonePopup}
          onExitComplete={clearMilestoneMessageAfterExit}
        />
      ) : null}

      <FABMenu open={menuOpen} onClose={() => setMenuOpen(false)} options={config.menuOptions} anchorRef={anchorRef} onSelect={handleMenuPick} />

      <FABSheet
        open={fabMode === "guide" ? false : sheetOpen}
        onClose={handleFabSheetClose}
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
        sheetBodySlot={effectiveSheetBodySlot}
        sheetFooterSlot={sheetFooterSlot}
        showGotItButton={showSheetGotIt}
        sheetIntelligence={
          !compactCoachHide && !sheetBodySlot && sheetCoachPanelsFlag && !sheetAtsHigh && dedicatedRoute == null
        }
        isOnContentTab={variant === "builder" && tabKey === "content"}
        coverLetterCrossSell={
          variant === "builder" &&
          tabKey !== "content" &&
          !sheetBodySlot &&
          sheetCoachPanelsFlag &&
          !sheetAtsHigh &&
          dedicatedRoute == null
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
        resume={resume}
        setResume={setResume}
        guidedCoachRequestKey={guidedCoachRequestKey}
        contextualSection={contextualSection}
        onGuidedDownload={onGuidedDownload}
        onGuidedOpenPreview={onGuidedOpenPreview}
        onGuidedSwitchToTemplatesTab={onGuidedSwitchToTemplatesTab}
        onGuidedSwitchToAtsTab={onGuidedSwitchToAtsTab}
        onNavigateToTab={onNavigateToTab}
        retreatGuideStep={retreatGuideStep}
        activeGuideSection={activeGuideSection}
        navigationSource={navigationSource}
        scanStatus={scanStatus}
        guidedPostSummaryStageSyncRef={guidedPostSummaryStageSyncRef}
        fabMode={fabMode}
        guideStep={guideStep}
        currentGuideStep={currentGuideStep}
        advanceGuideStep={advanceGuideStep}
        features={features}
        isPro={isPro}
        onPostPaymentCoverLetter={onPostPaymentCoverLetter}
        onFabFreeScan={onFabFreeScan}
        onFabProScan={onFabProScan}
      />
    </>
  );
});

export default FAB;
