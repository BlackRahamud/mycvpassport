import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./FAB.css";
import GuidedFlow from "./GuidedFlow";
import { EMPTY_EXP, splitCommaItems } from "../../cvShared";
import { FAB_COVER_LETTER_CROSS_SELL, ATS_FAB_CHIP_TO_NAV_KEY } from "./FABContent";
import {
  writeFabSeen,
  PROGRESS_COACH_LABEL_TO_NAV_KEY,
  getFabMemory,
  writeFabMemory,
  getFabTopGreetingLine,
  getTopNudge,
  TOP_NUDGE_TO_NAV_KEY,
  checkAtsMilestone,
  shouldShowCoverLetterCrossSell,
  getCvpPricingCurrencyCode,
} from "./FABLogic";

/** Guided CV coach — question order and builder field mapping (nested paths use resume shape: period/points). */
const QUESTIONS = [
  { id: "name", text: "What is your full name?", field: "name" },
  { id: "title", text: "What is your current job title?", field: "title" },
  { id: "email", text: "What is your email address?", field: "email" },
  { id: "phone", text: "And your phone number?", field: "phone" },
  { id: "location", text: "Which city are you based in?", field: "location" },
  { id: "exp_company", text: "Let's add your most recent job. Company name?", field: "experience[0].company" },
  { id: "exp_role", text: "Your role there?", field: "experience[0].role" },
  { id: "exp_dates", text: "Start date → end date? (e.g. Jan 2022 – Present)", field: "experience[0].dates" },
  { id: "exp_bullets", text: "Add 2–3 achievements in that role.", field: "experience[0].bullets" },
  { id: "skills", text: "List your top 5 skills (comma-separated).", field: "skills" },
  {
    id: "summary",
    text: "Last one — write a 2–3 line professional summary. Start with your title and years of experience.",
    field: "summary",
  },
];

const GUIDED_PROGRESS_STEP = Math.max(1, Math.round(100 / QUESTIONS.length));

function guidedResumeIsEmptyForCoach(resume) {
  if (!resume || typeof resume !== "object") return false;
  const nameEmpty = !String(resume.name || "").trim();
  const expArr = Array.isArray(resume.experience) ? resume.experience : [];
  const expEmpty = expArr.length === 0;
  return nameEmpty && expEmpty;
}

function nextGuidedMessageId() {
  return `gf-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function parseExpBulletsToPoints(raw) {
  const t = String(raw || "").trim();
  if (!t) return "";
  const byNl = t.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  if (byNl.length > 1) return byNl.join("\n");
  return t
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .join("\n");
}

function applyGuidedFieldToResume(prev, field, processedValue) {
  const next = { ...prev };
  if (field.startsWith("experience[0].")) {
    const ex = [...(Array.isArray(next.experience) ? next.experience : [])];
    while (ex.length < 1) ex.push({ ...EMPTY_EXP });
    const row = { ...EMPTY_EXP, ...ex[0] };
    let key = "company";
    if (field === "experience[0].role") key = "role";
    else if (field === "experience[0].dates") key = "period";
    else if (field === "experience[0].bullets") key = "points";
    ex[0] = { ...row, [key]: processedValue };
    return { ...next, experience: ex };
  }
  if (field === "skills") {
    const arr = Array.isArray(processedValue) ? processedValue : splitCommaItems(String(processedValue || ""));
    return { ...next, skills: arr.filter(Boolean).join(", ") };
  }
  return { ...next, [field]: processedValue };
}

function FabGuideStarIcon({ active }) {
  const fill = active ? "#FBBF24" : "#606060";
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" aria-hidden style={{ display: "block", flexShrink: 0 }}>
      <path
        d="M12 2l2.4 7.2H22l-6 4.6 2.3 7.2L12 17.8l-6.3 3.2 2.3-7.2-6-4.6h7.6L12 2z"
        fill={fill}
        stroke="#3A3A3A"
        strokeWidth={1}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Progress coach ring + label colour by completion band */
export function getRingColour(percent) {
  const p = Math.max(0, Math.min(100, percent));
  if (p <= 40) return "#EF4444";
  if (p <= 70) return "#F59E0B";
  if (p < 100) return "#3B82F6";
  return "#22C55E";
}

export function getAtsScoreStrokeColor(score) {
  const s = Math.round(Math.max(0, Math.min(100, Number(score) || 0)));
  if (s <= 40) return "#EF4444";
  if (s <= 70) return "#F59E0B";
  if (s < 100) return "#3B82F6";
  return "#4CAF50";
}

export function FabSparkIcon({ size = 24, stroke = "#fff" }) {
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none" aria-hidden style={{ display: "block", margin: "0 auto" }}>
      <path
        d="M12 2 L13.5 9.5 L21 11 L13.5 12.5 L12 20 L10.5 12.5 L3 11 L10.5 9.5 Z"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function FabFeatureBulletIcon({ name }) {
  const stroke = "#A0A0A0";
  const sw = 1.5;
  const inner = (() => {
    switch (name) {
      case "doc":
        return (
          <>
            <path d="M4 2h8l4 4v14H4V2z" stroke={stroke} strokeWidth={sw} fill="none" strokeLinejoin="round" />
            <path d="M12 2v4h4" stroke={stroke} strokeWidth={sw} fill="none" strokeLinejoin="round" />
          </>
        );
      case "clock":
        return (
          <>
            <circle cx="12" cy="12" r="9" stroke={stroke} strokeWidth={sw} fill="none" />
            <path d="M12 7v5l3 2" stroke={stroke} strokeWidth={sw} fill="none" strokeLinecap="round" />
          </>
        );
      case "edit":
        return <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" stroke={stroke} strokeWidth={sw} fill="none" strokeLinejoin="round" />;
      case "lightning":
        return <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" stroke={stroke} strokeWidth={sw} fill="none" strokeLinejoin="round" />;
      case "phone":
        return <rect x="7" y="3" width="10" height="18" rx="3" stroke={stroke} strokeWidth={sw} fill="none" />;
      case "check":
        return <path d="M20 6L9 17l-5-5" stroke={stroke} strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
      default:
        return <circle cx="12" cy="12" r="3" stroke={stroke} strokeWidth={sw} fill="none" />;
    }
  })();
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" aria-hidden style={{ flexShrink: 0, marginTop: 2 }}>
      {inner}
    </svg>
  );
}

export function FabFeatureBullets({ items }) {
  if (!items?.length) return null;
  return (
    <div style={{ width: "100%", marginBottom: 8 }}>
      {items.map((row, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
            marginBottom: 10,
          }}
        >
          <FabFeatureBulletIcon name={row.icon} />
          <span style={{ color: "var(--text-secondary, #A0A0A0)", fontSize: 13, lineHeight: 1.4, flex: 1 }}>{row.text}</span>
        </div>
      ))}
    </div>
  );
}

function AtsFabScoreSheetBlock({ score, onJobMatchCta, onCoverLetterCta }) {
  const size = 54;
  const cx = 27;
  const cy = 27;
  const r = 22;
  const strokeW = 4;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, Math.round(Number(score) || 0)));
  const offset = c - (p / 100) * c;

  const { headline, sub } =
    p >= 80
      ? {
          headline: "ATS gate: cleared.",
          sub: "Your CV will be seen. Will it get a response?",
        }
      : p >= 50
        ? {
            headline: "Good start.",
            sub: "Fix these gaps and you'll get seen.",
          }
        : {
            headline: "ATS filters may block this CV.",
            sub: "Let's fix that before you apply.",
          };

  const nextStepStyle = {
    width: 30,
    height: 30,
    borderRadius: "50%",
    background: "#1C1C1C",
    border: "1px solid #2A2A2A",
    boxSizing: "border-box",
    display: "grid",
    placeItems: "center",
    zIndex: 1,
  };

  return (
    <div style={{ width: "100%" }}>
      <div
        className="cvp-ats-fade-up-delay-0"
        style={{ display: "flex", flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 4 }}
      >
        <div style={{ width: size, height: size, flexShrink: 0, position: "relative" }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden style={{ display: "block" }}>
            <circle
              className="cvp-ats-ring-track"
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke="#1A1A1A"
              strokeWidth={strokeW}
            />
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke="#378ADD"
              strokeWidth={strokeW}
              strokeDasharray={c}
              strokeDashoffset={offset}
              strokeLinecap="round"
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          </svg>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "grid",
              placeItems: "center",
              fontSize: 13,
              fontWeight: 500,
              color: "#fff",
            }}
          >
            {p}
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
          <div style={{ fontSize: 16, fontWeight: 500, color: "#fff", lineHeight: 1.25 }}>{headline}</div>
          <div style={{ fontSize: 12, color: "#A0A0A0", marginTop: 3, lineHeight: 1.35 }}>{sub}</div>
        </div>
      </div>

      <div className="cvp-ats-fade-up-delay-1" style={{ position: "relative", marginTop: 18, width: "100%" }}>
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 15,
            height: 1,
            background: "#2A2A2A",
            zIndex: 0,
          }}
        />
        <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", gap: 8, position: "relative", zIndex: 1 }}>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", minWidth: 0 }}>
            <div
              className="cvp-ats-step-pop"
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: "#378ADD",
                display: "grid",
                placeItems: "center",
                zIndex: 1,
              }}
            >
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M20 6L9 17l-5-5"
                  stroke="#fff"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div style={{ marginTop: 8, fontSize: 10, fontWeight: 500, color: "#378ADD" }}>ATS scan</div>
            <div style={{ marginTop: 2, fontSize: 9, color: "#A0A0A0" }}>done</div>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", minWidth: 0 }}>
            <div style={nextStepStyle}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#2A2A2A" }} />
            </div>
            <div style={{ marginTop: 8, fontSize: 10, fontWeight: 500, color: "#A0A0A0" }}>Job match</div>
            <div style={{ marginTop: 2, fontSize: 9, color: "#A0A0A0" }}>next</div>
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", minWidth: 0 }}>
            <div style={nextStepStyle}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#2A2A2A" }} />
            </div>
            <div style={{ marginTop: 8, fontSize: 10, fontWeight: 500, color: "#A0A0A0" }}>Cover letter</div>
            <div style={{ marginTop: 2, fontSize: 9, color: "#A0A0A0" }}>next</div>
          </div>
        </div>
      </div>

      <div className="cvp-ats-fade-up-delay-2" style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 20, width: "100%" }}>
        <button type="button" className="cvp-ats-sheet-cta-btn" onClick={onJobMatchCta}>
          <span>Match to a job description</span>
          <span className="cvp-ats-sheet-cta-arrow" aria-hidden>
            →
          </span>
        </button>
        <button type="button" className="cvp-ats-sheet-cta-btn cvp-ats-sheet-cta-btn--shimmer-delay" onClick={onCoverLetterCta}>
          <span>Generate a cover letter</span>
          <span className="cvp-ats-sheet-cta-arrow" aria-hidden>
            →
          </span>
        </button>
      </div>
    </div>
  );
}

function PointIcon({ type }) {
  const inner = (() => {
    switch (type) {
      case "edit":
        return <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="#fff" strokeWidth="1.2" fill="none" />;
      case "menu":
        return (
          <>
            <circle cx="5" cy="12" r="1" fill="#fff" />
            <circle cx="12" cy="12" r="1" fill="#fff" />
            <circle cx="19" cy="12" r="1" fill="#fff" />
          </>
        );
      case "bolt":
        return <path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z" stroke="#fff" strokeWidth="1.2" fill="none" strokeLinejoin="round" />;
      case "plus":
        return (
          <>
            <path d="M12 5v14M5 12h14" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />
          </>
        );
      case "filter":
        return <path d="M4 6h16M7 12h10M10 18h4" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" />;
      case "target":
        return (
          <>
            <circle cx="12" cy="12" r="8" stroke="#fff" strokeWidth="1.2" fill="none" />
            <circle cx="12" cy="12" r="3" stroke="#fff" strokeWidth="1.2" fill="none" />
          </>
        );
      case "paste":
        return <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v0z" stroke="#fff" strokeWidth="1" fill="none" />;
      case "letter":
        return (
          <>
            <path d="M4 4h16v16H4z" stroke="#fff" strokeWidth="1" fill="none" />
            <path d="M4 8l8 5 8-5" stroke="#fff" strokeWidth="1" fill="none" />
          </>
        );
      case "user":
        return (
          <>
            <path d="M20 21a8 8 0 0 0-16 0" stroke="#fff" strokeWidth="1.2" fill="none" />
            <circle cx="12" cy="7" r="4" stroke="#fff" strokeWidth="1.2" fill="none" />
          </>
        );
      default:
        return <circle cx="12" cy="12" r="3" stroke="#fff" strokeWidth="1.2" fill="none" />;
    }
  })();
  return (
    <div
      style={{
        width: 20,
        height: 20,
        borderRadius: "50%",
        background: "#1C1C1C",
        display: "grid",
        placeItems: "center",
        flexShrink: 0,
      }}
    >
      <svg width={10} height={10} viewBox="0 0 24 24" fill="none" aria-hidden>
        {inner}
      </svg>
    </div>
  );
}

function ProgressCoachRing({ percent }) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, percent));
  const offset = c - (p / 100) * c;
  const strokeCol = getRingColour(p);
  return (
    <div style={{ position: "relative", width: 88, height: 88, margin: "0 auto 12px" }}>
      <svg width={88} height={88} viewBox="0 0 88 88" aria-hidden style={{ display: "block" }}>
        <circle cx={44} cy={44} r={r} fill="none" stroke="#2A2A2A" strokeWidth={8} />
        <circle
          cx={44}
          cy={44}
          r={r}
          fill="none"
          stroke={strokeCol}
          strokeWidth={8}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 44 44)"
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          fontSize: 18,
          fontWeight: 600,
          color: strokeCol,
        }}
      >
        {p}%
      </div>
    </div>
  );
}

const bannerBase = {
  background: "#1C1C1C",
  border: "1px solid var(--border-default, #2A2A2A)",
  borderRadius: 12,
  padding: "12px 16px",
  fontSize: 13,
  color: "var(--text-secondary, #A0A0A0)",
  marginBottom: 12,
  boxSizing: "border-box",
  width: "100%",
};

function DownloadGatekeeperPanel({ downloadGatekeeper, onNavigateAuth, onNavigatePricing }) {
  return (
    <div
      style={{
        width: "100%",
        marginBottom: 16,
        padding: 14,
        boxSizing: "border-box",
        borderRadius: 12,
        background: "var(--bg-elevated, #1C1C1C)",
        border: "1px solid var(--border-default, #2A2A2A)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 400,
          color: "var(--text-secondary, #A0A0A0)",
          textTransform: "none",
          letterSpacing: "normal",
          marginBottom: 10,
          textAlign: "center",
        }}
      >
        Download Status
      </div>
      {downloadGatekeeper == null ? (
        <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary, #A0A0A0)", textAlign: "center" }}>
          Checking download status…
        </p>
      ) : (
        <>
          {downloadGatekeeper.isPaidUser ? (
            <div style={{ textAlign: "center", marginBottom: 8 }}>
              <span
                style={{
                  display: "inline-block",
                  padding: "4px 10px",
                  borderRadius: 8,
                  background: "var(--bg-surface, #141414)",
                  border: "1px solid var(--border-default, #2A2A2A)",
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--text-primary, #FFF)",
                }}
              >
                {downloadGatekeeper.planName}
              </span>
            </div>
          ) : null}
          {downloadGatekeeper.canDownload ? (
            <>
              <p style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 500, color: "var(--text-primary, #FFF)", textAlign: "center" }}>
                You&apos;re clear to download
              </p>
              <div style={{ textAlign: "center", fontSize: 12, color: "var(--text-secondary, #A0A0A0)" }}>
                {Number.isFinite(downloadGatekeeper.downloadsLimit) ? (
                  <span>
                    {downloadGatekeeper.downloadsUsed}/{downloadGatekeeper.downloadsLimit} downloads used
                  </span>
                ) : (
                  <span>Unlimited downloads</span>
                )}
              </div>
            </>
          ) : null}
          {downloadGatekeeper.blockerReason === "limit_reached" ? (
            <div style={{ textAlign: "center" }}>
              <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--text-secondary, #A0A0A0)", lineHeight: 1.45 }}>
                You&apos;ve used your free downloads. Upgrade for unlimited PDFs.
              </p>
              <button
                type="button"
                onClick={() => onNavigatePricing?.()}
                style={{
                  background: "var(--text-primary, #FFF)",
                  color: "#000",
                  borderRadius: 10,
                  padding: "10px 14px",
                  width: "100%",
                  fontWeight: 600,
                  fontSize: 13,
                  border: "1px solid var(--border-default, #2A2A2A)",
                  cursor: "pointer",
                  minHeight: 44,
                }}
              >
                Upgrade to Active Hunter — AED 29/mo
              </button>
            </div>
          ) : null}
          {downloadGatekeeper.blockerReason === "not_signed_in" ? (
            <div style={{ textAlign: "center" }}>
              <p style={{ margin: "0 0 12px", fontSize: 13, color: "var(--text-secondary, #A0A0A0)", lineHeight: 1.45 }}>
                Sign in to continue downloading
              </p>
              <button
                type="button"
                onClick={() => onNavigateAuth?.()}
                style={{
                  background: "var(--text-primary, #FFF)",
                  color: "#000",
                  borderRadius: 10,
                  padding: "10px 14px",
                  width: "100%",
                  fontWeight: 600,
                  fontSize: 13,
                  border: "1px solid var(--border-default, #2A2A2A)",
                  cursor: "pointer",
                  minHeight: 44,
                }}
              >
                Sign in
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

/**
 * Bottom sheet: overlay + panel (spring reveal via keyframes)
 */
export default function FABSheet({
  open,
  onClose,
  variant = "route",
  tabKey = "",
  sheetLayoutKind = "normal",
  title,
  points,
  tabStorageKey,
  onGotIt,
  proCtaLabel,
  onProCta,
  zOverlay = 200,
  zSheet = 201,
  showCoachPanels = true,
  showProgressCoach = true,
  showDownloadGatekeeper = true,
  progressCoach = null,
  downloadGatekeeper = null,
  onProgressCoachNavigate,
  onNavigateAuth,
  onNavigatePricing,
  sheetBodySlot = null,
  sheetFooterSlot = null,
  showGotItButton = true,
  sheetIntelligence = false,
  coverLetterCrossSell = false,
  atsScore = 0,
  onNavigateToCoverLetter,
  /** Builder ATS sheet: switch to Job Match tab without leaving /builder */
  onNavigateToJobMatch,
  /** @type {null | 'ats' | 'cover-letter' | 'walkin' | 'account'} */
  dedicatedRoute = null,
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
  sheetAtsHigh = false,
  /** Builder Content tab: hide download gatekeeper / upgrade until user taps Download CV */
  isOnContentTab = false,
  /** Builder CV completion (thin bar + label + nudge); hides legacy Progress coach when set */
  cvCompletionProgress = null,
  /** Builder: live CV for guided coach field writes */
  resume = null,
  setResume = null,
  /** Increment to open sheet on Guide tab with fresh guided state (e.g. New CV → Guide me) */
  guidedCoachRequestKey = 0,
  /** Builder: trigger PDF download from guided flow */
  onGuidedDownload,
  /** Builder: match “ATS tab” / ATS checker (typically navigates to /ats) */
  onGuidedSwitchToAtsTab,
}) {
  const [celebrationConsumedSession, setCelebrationConsumedSession] = useState(false);
  const [activeCelebration, setActiveCelebration] = useState(null);
  const [postDownloadConsumedSession, setPostDownloadConsumedSession] = useState(false);
  const [activePostDownload, setActivePostDownload] = useState(false);
  const [postDownloadDays, setPostDownloadDays] = useState(0);
  const celebrationShownThisOpenRef = useRef(false);
  const navigate = useNavigate();

  const [builderCoachTab, setBuilderCoachTab] = useState("tips");
  const [guidedMessages, setGuidedMessages] = useState([]);
  const [guidedProgress, setGuidedProgress] = useState(0);
  const [guidedInput, setGuidedInput] = useState("");
  const [guidedTyping, setGuidedTyping] = useState(false);
  const [guidedStep, setGuidedStep] = useState(0);
  const [guidedShowInput, setGuidedShowInput] = useState(true);
  const guidedPostSummaryStageRef = useRef("qa");

  const resetGuidedCoach = useCallback(() => {
    guidedPostSummaryStageRef.current = "qa";
    setGuidedStep(0);
    setGuidedProgress(0);
    setGuidedInput("");
    setGuidedTyping(false);
    setGuidedShowInput(true);
    setGuidedMessages([{ id: nextGuidedMessageId(), role: "assistant", text: QUESTIONS[0].text }]);
  }, []);

  const currentAts = typeof atsScore === "number" && Number.isFinite(atsScore) ? atsScore : Number(atsScore) || 0;

  const showGreetingLine = Boolean(
    sheetIntelligence || (dedicatedRoute && dedicatedRoute !== "cover-letter" && dedicatedRoute !== "walkin")
  );

  const greetingLine = useMemo(() => {
    if (!showGreetingLine) return null;
    return getFabTopGreetingLine(getFabMemory(), progressCoach);
  }, [showGreetingLine, progressCoach]);

  const topNudge = useMemo(() => {
    if (!progressCoach?.missingSections?.length) return null;
    return getTopNudge(progressCoach.missingSections);
  }, [progressCoach?.missingSections]);

  const showCoverNudge = useMemo(() => {
    if (!coverLetterCrossSell || !open || dedicatedRoute === "cover-letter") return false;
    return shouldShowCoverLetterCrossSell(getFabMemory());
  }, [coverLetterCrossSell, dedicatedRoute, open]);

  const checksList = Array.isArray(atsChecks) ? atsChecks.filter(Boolean) : [];
  const failingCount = checksList.length;

  useEffect(() => {
    if (!sheetIntelligence) return;
    if (!open) {
      celebrationShownThisOpenRef.current = false;
      setActiveCelebration(null);
      setActivePostDownload(false);
      return;
    }
    const mem = getFabMemory();
    if (celebrationConsumedSession && (mem.pendingAtsMilestone === 70 || mem.pendingAtsMilestone === 90)) {
      writeFabMemory({ pendingAtsMilestone: null });
    }

    const pending = getFabMemory().pendingAtsMilestone;
    const deltaMilestone = pending == null ? checkAtsMilestone(currentAts, getFabMemory().lastAtsScore) : null;
    const m = pending === 70 || pending === 90 ? pending : deltaMilestone;

    if (m && !celebrationConsumedSession) {
      celebrationShownThisOpenRef.current = true;
      setActiveCelebration(m);
      setCelebrationConsumedSession(true);
      writeFabMemory({ lastAtsScore: currentAts, pendingAtsMilestone: null });
      return;
    }

    const memDl = getFabMemory();
    const dlDays =
      memDl.lastAction === "downloaded" && memDl.lastActionAt
        ? Math.floor((Date.now() - new Date(memDl.lastActionAt).getTime()) / 86400000)
        : 0;
    const showPost = memDl.lastAction === "downloaded" && memDl.lastActionAt && dlDays >= 2;

    if (showPost && !postDownloadConsumedSession && !celebrationShownThisOpenRef.current) {
      setPostDownloadDays(dlDays);
      setActivePostDownload(true);
      setPostDownloadConsumedSession(true);
    }

    const mem2 = getFabMemory();
    if (mem2.lastAtsScore == null && Number.isFinite(currentAts) && currentAts > 0 && !m) {
      writeFabMemory({ lastAtsScore: currentAts });
    }
  }, [open, sheetIntelligence, currentAts, celebrationConsumedSession, postDownloadConsumedSession]);

  const prevGuidedCoachKeyRef = useRef(0);
  useEffect(() => {
    if (variant !== "builder") return;
    if (guidedCoachRequestKey <= 0 || guidedCoachRequestKey === prevGuidedCoachKeyRef.current) return;
    prevGuidedCoachKeyRef.current = guidedCoachRequestKey;
    setBuilderCoachTab("guide");
    resetGuidedCoach();
  }, [guidedCoachRequestKey, variant, resetGuidedCoach]);

  const builderSheetOpenedOnceRef = useRef(false);
  useEffect(() => {
    if (variant !== "builder") return;
    if (!open) {
      builderSheetOpenedOnceRef.current = false;
      return;
    }
    if (resume == null) return;
    if (builderSheetOpenedOnceRef.current) return;
    builderSheetOpenedOnceRef.current = true;
    if (guidedCoachRequestKey > 0) return;
    if (guidedResumeIsEmptyForCoach(resume)) setBuilderCoachTab("guide");
    else setBuilderCoachTab("tips");
  }, [open, variant, resume, guidedCoachRequestKey]);

  useEffect(() => {
    if (!open || variant !== "builder") return;
    if (builderCoachTab !== "guide") return;
    if (guidedMessages.length > 0) return;
    guidedPostSummaryStageRef.current = "qa";
    setGuidedStep(0);
    setGuidedProgress(0);
    setGuidedShowInput(true);
    setGuidedMessages([{ id: nextGuidedMessageId(), role: "assistant", text: QUESTIONS[0].text }]);
  }, [open, variant, builderCoachTab, guidedMessages.length]);

  const handleGuidedInputChange = useCallback((e) => {
    setGuidedInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 88)}px`;
  }, []);

  const handleGuidedSend = useCallback(() => {
    const trimmed = guidedInput.trim();
    if (!trimmed || typeof setResume !== "function") return;
    if (guidedPostSummaryStageRef.current !== "qa") return;
    const q = QUESTIONS[guidedStep];
    if (!q) return;

    setResume((prev) => {
      let processed = trimmed;
      if (q.field === "experience[0].bullets") processed = parseExpBulletsToPoints(trimmed);
      else if (q.field === "skills") processed = splitCommaItems(trimmed).filter(Boolean).join(", ");
      return applyGuidedFieldToResume(prev, q.field, processed);
    });

    setGuidedMessages((prev) => [...prev, { id: nextGuidedMessageId(), role: "user", text: trimmed }]);
    setGuidedInput("");
    setGuidedTyping(true);

    const isLast = guidedStep >= QUESTIONS.length - 1;
    const nextStep = guidedStep + 1;

    window.setTimeout(() => {
      if (isLast) {
        setGuidedMessages((prev) => [
          ...prev,
          {
            id: nextGuidedMessageId(),
            role: "assistant",
            text: "Your CV is ready. Now let's make it look the part.",
            ctaBtn: "Choose Your Template →",
            ctaStyle: "white",
            ctaId: "choose-template",
          },
        ]);
        setGuidedShowInput(false);
        setGuidedProgress((p) => Math.min(100, p + GUIDED_PROGRESS_STEP));
        guidedPostSummaryStageRef.current = "template";
      } else {
        setGuidedMessages((prev) => [
          ...prev,
          { id: nextGuidedMessageId(), role: "assistant", text: QUESTIONS[nextStep].text },
        ]);
        setGuidedStep(nextStep);
        setGuidedProgress((p) => Math.min(100, p + GUIDED_PROGRESS_STEP));
      }
      setGuidedTyping(false);
    }, 800);
  }, [guidedInput, guidedStep, setResume]);

  const handleGuidedCtaClick = useCallback(
    (ctaId) => {
      if (ctaId === "choose-template") {
        navigate("/templates");
        setGuidedMessages((prev) => [
          ...prev,
          {
            id: nextGuidedMessageId(),
            role: "assistant",
            text: "Perfect. Before you download — let's see how recruiters will actually see this CV.",
            ctaBtn: "Run ATS Scan →",
            ctaStyle: "white",
            ctaId: "run-ats",
          },
        ]);
        window.setTimeout(() => onGuidedSwitchToAtsTab?.(), 400);
        guidedPostSummaryStageRef.current = "ats";
        return;
      }
      if (ctaId === "run-ats") {
        const scoreVal = Math.round(currentAts);
        let line = "Let's fix this before you apply.";
        if (scoreVal >= 85) line = "You're in the top 15% of applicants. Recruiters will see you.";
        else if (scoreVal >= 60) line = "Good start. Here's what's holding you back.";
        setGuidedMessages((prev) => [
          ...prev,
          {
            id: nextGuidedMessageId(),
            role: "assistant",
            text: line,
            score: scoreVal,
            ctaBtn: "Test Keyword Match →",
            ctaStyle: "white",
            ctaId: "keyword-match",
          },
        ]);
        guidedPostSummaryStageRef.current = "keyword";
        return;
      }
      if (ctaId === "keyword-match") {
        setGuidedMessages((prev) => [
          ...prev,
          {
            id: nextGuidedMessageId(),
            role: "assistant",
            text: "CVPassport users get 3× more callbacks when their CV is tuned to the job. You're ready.",
            ctaBtn: "Download Your CV →",
            ctaStyle: "white",
            ctaId: "download",
          },
        ]);
        setGuidedShowInput(false);
        guidedPostSummaryStageRef.current = "download";
        return;
      }
      if (ctaId === "download") {
        onGuidedDownload?.();
        setGuidedMessages((prev) => [
          ...prev,
          { id: nextGuidedMessageId(), role: "assistant", text: "Done. Good luck — you've got this.", complete: true },
        ]);
        setGuidedProgress(100);
        guidedPostSummaryStageRef.current = "done";
      }
    },
    [currentAts, navigate, onGuidedDownload, onGuidedSwitchToAtsTab]
  );

  const handleGuidedSkip = useCallback(() => {
    setBuilderCoachTab("tips");
    onGuidedSwitchToAtsTab?.();
  }, [onGuidedSwitchToAtsTab]);

  const handleGuidedExit = useCallback(() => {
    onClose?.();
  }, [onClose]);

  if (!open) return null;

  const hideHeavyChrome =
    sheetLayoutKind === "summary-helper" ||
    sheetLayoutKind === "idle-nudge" ||
    (variant === "builder" && builderCoachTab === "guide");

  const showCelebrationBanner = Boolean(activeCelebration);
  const showPostDownloadBanner = Boolean(activePostDownload) && !showCelebrationBanner;

  const handleGotIt = () => {
    if (tabStorageKey) writeFabSeen(tabStorageKey);
    onGotIt?.();
    onClose();
  };

  const handlePro = () => {
    if (tabStorageKey === "ats") writeFabSeen("ats");
    onProCta?.();
    onClose();
  };

  const handleAtsJobMatchCta = () => {
    if (onNavigateToJobMatch) onNavigateToJobMatch();
    else {
      navigate("/builder", { state: { cvpBuilderTab: "jobmatch" } });
      onClose();
    }
  };

  const handleAtsCoverLetterCta = () => {
    if (onNavigateToCoverLetter) onNavigateToCoverLetter();
    else {
      navigate("/cover-letter");
      onClose();
    }
  };

  const nudgeNavKey = topNudge ? TOP_NUDGE_TO_NAV_KEY[topNudge] : null;

  const hideDefaultGuidePoints =
    Boolean(dedicatedRoute) && !(dedicatedRoute === "ats" && sheetAtsHigh) && !sheetBodySlot;

  const chipBase = {
    border: "1px solid #3A3A3A",
    background: "transparent",
    color: "#FFF",
    fontSize: 12,
    padding: "6px 14px",
    borderRadius: 99,
    display: "inline-flex",
    alignItems: "center",
    fontWeight: 500,
    cursor: "default",
    fontFamily: "inherit",
  };

  const renderAtsChips = () => {
    if (failingCount === 0) return null;
    const shown = checksList.slice(0, 3);
    const more = checksList.length - shown.length;
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", marginTop: 12 }}>
        {shown.map((label) => {
          const navKey = ATS_FAB_CHIP_TO_NAV_KEY[label];
          return (
            <button
              key={label}
              type="button"
              onClick={() => {
                if (navKey && onProgressCoachNavigate) onProgressCoachNavigate(navKey);
              }}
              style={{
                ...chipBase,
                cursor: navKey && onProgressCoachNavigate ? "pointer" : "default",
              }}
            >
              {label}
            </button>
          );
        })}
        {more > 0 ? (
          <span style={{ ...chipBase, border: "1px solid #2A2A2A", color: "var(--text-secondary, #A0A0A0)" }}>+{more} more</span>
        ) : null}
      </div>
    );
  };

  const renderDedicatedCoverLetter = () => {
    if (coverLetterState === "paywall") {
      return (
        <>
          <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--text-secondary, #A0A0A0)", lineHeight: 1.45, textAlign: "center" }}>
            AED 10 for a personalised cover letter that matches your CV. Most hiring managers expect one.
          </p>
          <button
            type="button"
            onClick={() => onNavigatePricing?.()}
            style={{
              width: "100%",
              background: "#fff",
              color: "#000",
              borderRadius: 12,
              padding: 14,
              fontWeight: 600,
              fontSize: 14,
              border: "none",
              cursor: "pointer",
              minHeight: 44,
            }}
          >
            Unlock Cover Letter →
          </button>
        </>
      );
    }
    if (coverLetterState === "empty") {
      return (
        <>
          <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--text-secondary, #A0A0A0)", lineHeight: 1.45, textAlign: "center" }}>
            Fill in your target role and key strength — those two make the biggest difference.
          </p>
          <FabFeatureBullets
            items={[
              { icon: "doc", text: "Custom-written for your CV" },
              { icon: "clock", text: "Done in seconds" },
            ]}
          />
          <button
            type="button"
            onClick={() => {
              coverLetterOnFocusFirstEmpty?.();
              onClose();
            }}
            style={{
              width: "100%",
              marginTop: 8,
              background: "transparent",
              color: "#FFF",
              borderRadius: 12,
              padding: 14,
              fontWeight: 600,
              fontSize: 14,
              border: "1px solid #2A2A2A",
              cursor: "pointer",
              minHeight: 44,
            }}
          >
            Start filling in →
          </button>
        </>
      );
    }
    if (coverLetterState === "partial") {
      return (
        <>
          <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--text-secondary, #A0A0A0)", lineHeight: 1.45, textAlign: "center" }}>
            Almost there — finish filling the fields to generate.
          </p>
          {coverLetterEmptyFieldLabels.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginBottom: 12 }}>
              {coverLetterEmptyFieldLabels.map((lab) => (
                <span
                  key={lab}
                  style={{
                    fontSize: 11,
                    color: "var(--text-secondary, #A0A0A0)",
                    padding: "4px 10px",
                    borderRadius: 99,
                    border: "1px solid #2A2A2A",
                    background: "var(--bg-page, #0A0A0A)",
                  }}
                >
                  {lab}
                </span>
              ))}
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => {
              coverLetterOnFocusFirstEmpty?.();
              onClose();
            }}
            style={{
              width: "100%",
              marginTop: 8,
              background: "transparent",
              color: "#FFF",
              borderRadius: 12,
              padding: 14,
              fontWeight: 600,
              fontSize: 14,
              border: "1px solid #2A2A2A",
              cursor: "pointer",
              minHeight: 44,
            }}
          >
            Continue filling →
          </button>
        </>
      );
    }
    if (coverLetterState === "ready") {
      return (
        <>
          <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--text-secondary, #A0A0A0)", lineHeight: 1.45, textAlign: "center" }}>
            All fields complete. Generate your cover letter now.
          </p>
          <button
            type="button"
            onClick={() => {
              coverLetterOnGenerate?.();
              onClose();
            }}
            style={{
              width: "100%",
              marginTop: 8,
              background: "#fff",
              color: "#000",
              borderRadius: 12,
              padding: 14,
              fontWeight: 600,
              fontSize: 14,
              border: "none",
              cursor: "pointer",
              minHeight: 44,
            }}
          >
            Generate Now
          </button>
        </>
      );
    }
    if (coverLetterState === "generated") {
      return (
        <>
          <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--text-secondary, #A0A0A0)", lineHeight: 1.45, textAlign: "center" }}>
            Happy with it? Download before you leave.
          </p>
          <button
            type="button"
            onClick={() => {
              coverLetterOnDownload?.();
              onClose();
            }}
            style={{
              width: "100%",
              marginTop: 8,
              background: "#fff",
              color: "#000",
              borderRadius: 12,
              padding: 14,
              fontWeight: 600,
              fontSize: 14,
              border: "none",
              cursor: "pointer",
              minHeight: 44,
            }}
          >
            Download →
          </button>
          <button
            type="button"
            onClick={() => {
              coverLetterOnRegenerate?.();
              onClose();
            }}
            style={{
              marginTop: 12,
              width: "100%",
              background: "none",
              border: "none",
              color: "var(--text-secondary, #A0A0A0)",
              fontSize: 13,
              cursor: "pointer",
              padding: 8,
            }}
          >
            Regenerate
          </button>
        </>
      );
    }
    return null;
  };

  const coverLetterTitle =
    coverLetterState === "ready"
      ? "You're ready"
      : coverLetterState === "generated"
        ? "Cover letter ready"
        : "Cover Letter";

  const walkInTitle = walkInCvBuilt ? "CV ready" : "Walk-In Mode";

  const renderDedicatedWalkIn = () => {
    if (walkInCvBuilt) {
      return (
        <>
          <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--text-secondary, #A0A0A0)", lineHeight: 1.45, textAlign: "center" }}>
            Your walk-in CV is built. Download and go.
          </p>
          <button
            type="button"
            onClick={() => {
              walkInOnDownload?.();
              onClose();
            }}
            style={{
              width: "100%",
              marginTop: 8,
              background: "#fff",
              color: "#000",
              borderRadius: 12,
              padding: 14,
              fontWeight: 600,
              fontSize: 14,
              border: "none",
              cursor: "pointer",
              minHeight: 44,
            }}
          >
            Download CV →
          </button>
        </>
      );
    }
    return (
      <>
        <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--text-secondary, #A0A0A0)", lineHeight: 1.45, textAlign: "center" }}>
          Build your CV in 90 seconds — perfect for same-day interviews.
        </p>
        <FabFeatureBullets
          items={[
            { icon: "lightning", text: "Fill 5 fields, download instantly" },
            { icon: "phone", text: "No account needed" },
            { icon: "check", text: "ATS-ready for UAE employers" },
          ]}
        />
        <button
          type="button"
          onClick={() => {
            walkInOnStart?.();
            onClose();
          }}
          style={{
            width: "100%",
            marginTop: 8,
            background: "transparent",
            color: "#FFF",
            borderRadius: 12,
            padding: 14,
            fontWeight: 600,
            fontSize: 14,
            border: "1px solid #2A2A2A",
            cursor: "pointer",
            minHeight: 44,
          }}
        >
          Start Walk-In CV →
        </button>
      </>
    );
  };

  const renderDedicatedAccount = () => {
    const g = downloadGatekeeper;
    if (g == null) {
      return <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary, #A0A0A0)", textAlign: "center" }}>Loading plan…</p>;
    }
    if (g.isPaidUser) {
      return (
        <>
          <div style={{ textAlign: "center", marginBottom: 10 }}>
            <span
              style={{
                display: "inline-block",
                padding: "6px 14px",
                borderRadius: 99,
                background: "#0F6E56",
                color: "#9FE1CB",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {g.planName}
            </span>
          </div>
          <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--text-secondary, #A0A0A0)", lineHeight: 1.45, textAlign: "center" }}>
            Everything is unlocked. You&apos;re all set.
          </p>
          <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary, #A0A0A0)", lineHeight: 1.5, textAlign: "center" }}>
            Unlimited downloads · All templates · Full ATS · Cover Letter
          </p>
        </>
      );
    }
    const lim = Number.isFinite(g.downloadsLimit) ? g.downloadsLimit : 3;
    const used = g.downloadsUsed ?? 0;
    const currency = getCvpPricingCurrencyCode();
    const upgradePriceLine =
      currency === "IN" ? (
        <span style={{ color: "#FFF", fontWeight: 600 }}>₹199/mo</span>
      ) : (
        <span style={{ color: "#FFF", fontWeight: 600 }}>AED 29/mo</span>
      );
    return (
      <>
        <div style={{ textAlign: "center", marginBottom: 10 }}>
          <span
            style={{
              display: "inline-block",
              padding: "6px 14px",
              borderRadius: 99,
              background: "#1C1C1C",
              color: "var(--text-secondary, #A0A0A0)",
              fontSize: 12,
              fontWeight: 600,
              border: "1px solid #2A2A2A",
            }}
          >
            Free
          </span>
        </div>
        <p style={{ margin: "0 0 14px", fontSize: 14, color: "var(--text-secondary, #A0A0A0)", lineHeight: 1.45, textAlign: "center" }}>
          You&apos;ve used {used}/{lim} free downloads.
        </p>
        <div
          style={{
            background: "#1C1C1C",
            border: "1px solid var(--border-default, #2A2A2A)",
            borderRadius: 12,
            padding: 14,
            marginBottom: 12,
            boxSizing: "border-box",
          }}
        >
          <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary, #A0A0A0)", lineHeight: 1.45 }}>
            Upgrade to Active Hunter — unlimited downloads, all templates, ATS + Cover Letter.
          </p>
          <p style={{ margin: "10px 0 0", fontSize: 14 }}>{upgradePriceLine}</p>
        </div>
        <button
          type="button"
          onClick={() => onNavigatePricing?.()}
          style={{
            width: "100%",
            background: "#fff",
            color: "#000",
            borderRadius: 12,
            padding: 14,
            fontWeight: 600,
            fontSize: 14,
            border: "none",
            cursor: "pointer",
            minHeight: 44,
          }}
        >
          Upgrade now →
        </button>
      </>
    );
  };

  const resolvedTitle = (() => {
    if (dedicatedRoute === "cover-letter") return coverLetterTitle;
    if (dedicatedRoute === "walkin") return walkInTitle;
    if (dedicatedRoute === "account") return "Your plan";
    return title;
  })();

  const showBuilderGuidedCoach =
    variant === "builder" && builderCoachTab === "guide" && !sheetBodySlot && sheetLayoutKind === "normal";

  const showDownloadGatekeeperPanel =
    showDownloadGatekeeper &&
    !sheetBodySlot &&
    !showBuilderGuidedCoach &&
    (sheetLayoutKind === "download-only" ||
      (variant === "builder" && tabKey === "content" && !isOnContentTab));

  const showGotItEffective = showGotItButton && !showBuilderGuidedCoach;

  const builderCoachTabChip = {
    flex: 1,
    minHeight: 40,
    borderRadius: 10,
    border: "1px solid #2A2A2A",
    background: "transparent",
    color: "#A0A0A0",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "inherit",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    transition: "background-color 200ms cubic-bezier(0.4,0,0.2,1), color 200ms cubic-bezier(0.4,0,0.2,1), border-color 200ms cubic-bezier(0.4,0,0.2,1)",
  };

  return (
    <>
      <div
        role="presentation"
        className="cvp-fab-layer cvp-fab-sheet-overlay"
        style={{ zIndex: zOverlay }}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="cvp-fab-layer cvp-fab-sheet-panel"
        style={{ zIndex: zSheet }}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="cvp-fab-sheet-drag-handle" aria-hidden />
        <div className="cvp-fab-sheet-main">
        <div className={`cvp-fab-sheet-scroll${showGotItEffective ? "" : " cvp-fab-sheet-scroll--no-sticky-footer"}`}>
          {variant === "builder" && !sheetBodySlot && sheetLayoutKind === "normal" ? (
            <div
              role="tablist"
              aria-label="FAB sheet"
              style={{
                display: "flex",
                gap: 8,
                marginBottom: 14,
                width: "100%",
                flexShrink: 0,
              }}
            >
              <button
                type="button"
                role="tab"
                aria-selected={builderCoachTab === "tips"}
                onClick={() => setBuilderCoachTab("tips")}
                style={{
                  ...builderCoachTabChip,
                  background: builderCoachTab === "tips" ? "#1C1C1C" : "transparent",
                  color: builderCoachTab === "tips" ? "#FFFFFF" : "#A0A0A0",
                  borderColor: builderCoachTab === "tips" ? "#3A3A3A" : "#2A2A2A",
                }}
              >
                Tips
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={builderCoachTab === "guide"}
                onClick={() => setBuilderCoachTab("guide")}
                style={{
                  ...builderCoachTabChip,
                  background: builderCoachTab === "guide" ? "#1C1C1C" : "transparent",
                  color: builderCoachTab === "guide" ? "#FFFFFF" : "#A0A0A0",
                  borderColor: builderCoachTab === "guide" ? "#3A3A3A" : "#2A2A2A",
                }}
              >
                <FabGuideStarIcon active={builderCoachTab === "guide"} />
                Guide
              </button>
            </div>
          ) : null}

          {!hideHeavyChrome && cvCompletionProgress ? (
            <div style={{ width: "100%", marginBottom: 16 }}>
              <div
                style={{
                  width: "100%",
                  height: 3,
                  background: "var(--border-default, #2A2A2A)",
                  borderRadius: 999,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${Math.min(100, Math.max(0, Number(cvCompletionProgress.percent) || 0))}%`,
                    background: cvCompletionProgress.percent === 100 ? "#4CAF50" : "#FFFFFF",
                    borderRadius: 999,
                    transition: "width 400ms cubic-bezier(0.4,0,0.2,1)",
                  }}
                />
              </div>
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: 12,
                  color: "var(--text-secondary, #A0A0A0)",
                  textAlign: "center",
                  lineHeight: 1.35,
                }}
              >
                {cvCompletionProgress.percent === 100
                  ? `${cvCompletionProgress.percent}% · CV ready to send ✓`
                  : `${cvCompletionProgress.percent}% · ${cvCompletionProgress.label}`}
              </p>
              {cvCompletionProgress.missingSections?.length > 0 &&
              cvCompletionProgress.percent < 100 &&
              cvCompletionProgress.topMissingNudge ? (
                <div style={{ textAlign: "center", width: "100%", marginTop: 8 }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "4px 12px",
                      borderRadius: 999,
                      border: "1px solid #F59E0B",
                      background: "transparent",
                      color: "#F59E0B",
                      fontSize: 12,
                      lineHeight: 1.35,
                      boxSizing: "border-box",
                      maxWidth: "100%",
                    }}
                  >
                    {cvCompletionProgress.topMissingNudge}
                  </span>
                </div>
              ) : null}
            </div>
          ) : null}

          {!hideHeavyChrome && greetingLine ? (
            <div
              style={{
                fontSize: 13,
                color: "var(--text-secondary, #A0A0A0)",
                paddingBottom: 8,
                paddingTop: 4,
                textAlign: "center",
                lineHeight: 1.45,
              }}
            >
              {greetingLine}
            </div>
          ) : null}

          {String(resolvedTitle ?? "").trim() ? (
            <div
              style={{
                color: "var(--text-primary, #FFF)",
                fontSize: 18,
                fontWeight: 500,
                marginBottom: 16,
                textAlign: "center",
              }}
            >
              {resolvedTitle}
            </div>
          ) : null}

          {!hideHeavyChrome && sheetIntelligence && showCelebrationBanner ? (
            <div
              style={{
                ...bannerBase,
                border: "1px solid #22C55E",
              }}
            >
              {activeCelebration === 70 ? (
                <p style={{ margin: 0, lineHeight: 1.45 }}>
                  You just crossed 70! Most recruiters use 65 as the cutoff — you&apos;re through the filter.
                </p>
              ) : (
                <p style={{ margin: 0, lineHeight: 1.45 }}>
                  90+ ATS score — you&apos;re in the top tier. Apply with confidence.
                </p>
              )}
            </div>
          ) : null}

          {!hideHeavyChrome && sheetIntelligence && showPostDownloadBanner ? (
            <div style={bannerBase}>
              <p style={{ margin: 0, lineHeight: 1.45 }}>
                You downloaded your CV {postDownloadDays} days ago — did you apply? Update your experience if anything
                changed.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (onProgressCoachNavigate) onProgressCoachNavigate("experience");
                }}
                style={{
                  marginTop: 10,
                  padding: 0,
                  border: "none",
                  background: "none",
                  color: "#FFF",
                  fontSize: 12,
                  cursor: onProgressCoachNavigate ? "pointer" : "default",
                  textDecoration: "underline",
                  fontWeight: 500,
                }}
              >
                Update CV →
              </button>
            </div>
          ) : null}

          {sheetBodySlot ? <div style={{ width: "100%", marginBottom: 16 }}>{sheetBodySlot}</div> : null}

          {dedicatedRoute === "ats" && !showBuilderGuidedCoach ? (
            <div
              style={{
                width: "100%",
                marginBottom: 16,
                padding: 14,
                boxSizing: "border-box",
                borderRadius: 12,
                background: "var(--bg-elevated, #1C1C1C)",
                border: "1px solid var(--border-default, #2A2A2A)",
              }}
            >
              <AtsFabScoreSheetBlock
                score={currentAts}
                onJobMatchCta={handleAtsJobMatchCta}
                onCoverLetterCta={handleAtsCoverLetterCta}
              />
              {renderAtsChips()}
            </div>
          ) : null}

          {showCoachPanels && showProgressCoach && !sheetBodySlot && !dedicatedRoute && !cvCompletionProgress && !showBuilderGuidedCoach ? (
            <div
              style={{
                width: "100%",
                marginBottom: 16,
                padding: 14,
                boxSizing: "border-box",
                borderRadius: 12,
                background: "var(--bg-elevated, #1C1C1C)",
                border: "1px solid var(--border-default, #2A2A2A)",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--text-secondary, #A0A0A0)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  marginBottom: 10,
                  textAlign: "center",
                }}
              >
                Progress coach
              </div>
              {progressCoach && !progressCoach.hasCV ? (
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary, #A0A0A0)", textAlign: "center", lineHeight: 1.45 }}>
                  Start your CV to see progress
                </p>
              ) : progressCoach ? (
                <>
                  <ProgressCoachRing percent={progressCoach.completionPercent} />
                  {progressCoach.completionPercent === 100 ? (
                    <p style={{ margin: "0 0 10px", fontSize: 13, color: "#22C55E", textAlign: "center", fontWeight: 600 }}>
                      All sections complete ✓
                    </p>
                  ) : topNudge ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (nudgeNavKey && onProgressCoachNavigate) onProgressCoachNavigate(nudgeNavKey);
                      }}
                      style={{
                        display: "block",
                        margin: "0 auto 10px",
                        background: "#1C1C1C",
                        border: "1px solid #2A2A2A",
                        fontSize: 12,
                        color: "#FFF",
                        padding: "6px 12px",
                        borderRadius: 20,
                        cursor: onProgressCoachNavigate && nudgeNavKey ? "pointer" : "default",
                        fontWeight: 500,
                      }}
                    >
                      → Add {topNudge} for the biggest ATS boost
                    </button>
                  ) : null}
                  <div style={{ fontSize: 12, color: "var(--text-secondary, #A0A0A0)", textAlign: "center", marginBottom: 10 }}>
                    {progressCoach.completedSections}/{progressCoach.totalSections} sections complete
                  </div>
                  {progressCoach.completionPercent < 100 && progressCoach.missingSections.length > 0 ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                      {progressCoach.missingSections.map((label) => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => {
                            const key = PROGRESS_COACH_LABEL_TO_NAV_KEY[label];
                            if (key) onProgressCoachNavigate?.(key);
                          }}
                          style={{
                            padding: "6px 12px",
                            borderRadius: 999,
                            border: "1px solid var(--border-default, #2A2A2A)",
                            background: "var(--bg-surface, #141414)",
                            color: "var(--text-primary, #FFF)",
                            fontSize: 12,
                            fontWeight: 500,
                            cursor: onProgressCoachNavigate ? "pointer" : "default",
                          }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  ) : progressCoach.completionPercent < 100 ? (
                    <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary, #A0A0A0)", textAlign: "center" }}>
                      All tracked sections look good.
                    </p>
                  ) : null}
                </>
              ) : null}
            </div>
          ) : null}

          {dedicatedRoute === "cover-letter" && !showBuilderGuidedCoach ? (
            <div style={{ width: "100%", marginBottom: 16 }}>{renderDedicatedCoverLetter()}</div>
          ) : null}

          {dedicatedRoute === "walkin" && !showBuilderGuidedCoach ? (
            <div style={{ width: "100%", marginBottom: 16 }}>{renderDedicatedWalkIn()}</div>
          ) : null}

          {dedicatedRoute === "account" && !showBuilderGuidedCoach ? (
            <div style={{ width: "100%", marginBottom: 16 }}>{renderDedicatedAccount()}</div>
          ) : null}

          {showCoverNudge && !showBuilderGuidedCoach ? (
            <div style={{ ...bannerBase, marginBottom: 16 }}>
              <p style={{ margin: 0, lineHeight: 1.45 }}>{FAB_COVER_LETTER_CROSS_SELL.body}</p>
              <button
                type="button"
                onClick={() => {
                  if (onNavigateToCoverLetter) {
                    writeFabMemory({ hasVisitedCoverLetter: true });
                    onNavigateToCoverLetter();
                  }
                }}
                style={{
                  marginTop: 10,
                  padding: 0,
                  border: "none",
                  background: "none",
                  color: "#FFF",
                  fontSize: 12,
                  cursor: onNavigateToCoverLetter ? "pointer" : "default",
                  textDecoration: "underline",
                  fontWeight: 500,
                }}
              >
                {FAB_COVER_LETTER_CROSS_SELL.cta}
              </button>
            </div>
          ) : null}

          {showDownloadGatekeeperPanel ? (
            <DownloadGatekeeperPanel
              downloadGatekeeper={downloadGatekeeper}
              onNavigateAuth={onNavigateAuth}
              onNavigatePricing={onNavigatePricing}
            />
          ) : null}

          {showBuilderGuidedCoach ? (
            <div
              style={{
                width: "100%",
                minHeight: "min(55vh, 420px)",
                maxHeight: "62vh",
                display: "flex",
                flexDirection: "column",
                marginBottom: 8,
                boxSizing: "border-box",
              }}
            >
              <GuidedFlow
                useSampleData={false}
                messages={guidedMessages}
                progressPercent={guidedProgress}
                inputValue={guidedInput}
                onInputChange={handleGuidedInputChange}
                onSend={handleGuidedSend}
                onSkip={handleGuidedSkip}
                onExit={handleGuidedExit}
                onCtaClick={handleGuidedCtaClick}
                showInput={guidedShowInput}
                inputPlaceholder="Type your answer…"
                isTyping={guidedTyping}
              />
            </div>
          ) : null}

          <div>
            {!hideHeavyChrome &&
              !sheetBodySlot &&
              !hideDefaultGuidePoints &&
              !showBuilderGuidedCoach &&
              points.map((row, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: 10,
                    marginBottom: 10,
                    alignItems: "flex-start",
                  }}
                >
                  <PointIcon type={row.icon} />
                  <span style={{ color: "var(--text-secondary, #A0A0A0)", fontSize: 13, lineHeight: 1.45, flex: 1 }}>{row.text}</span>
                </div>
              ))}
          </div>
          {sheetFooterSlot}
          {proCtaLabel && onProCta ? (
            <button
              type="button"
              onClick={handlePro}
              style={{
                background: "#fff",
                color: "#000",
                borderRadius: 10,
                padding: 12,
                width: "100%",
                fontWeight: 500,
                fontSize: 14,
                border: "none",
                cursor: "pointer",
                marginTop: 8,
                minHeight: 44,
              }}
            >
              {proCtaLabel}
            </button>
          ) : null}
        </div>
        {showGotItEffective ? (
          <div
            className={`cvp-fab-sheet-gotit-bar${dedicatedRoute === "ats" ? " cvp-fab-sheet-gotit-bar--ats-ghost" : ""}`}
          >
            <button
              type="button"
              onClick={handleGotIt}
              className={`cvp-fab-sheet-gotit-btn${dedicatedRoute === "ats" ? " cvp-fab-sheet-gotit-btn--ats-ghost" : ""}`}
              style={
                dedicatedRoute === "ats"
                  ? undefined
                  : { background: "#fff", color: "#000", fontWeight: 500, fontSize: 14, border: "none", cursor: "pointer", minHeight: 44 }
              }
            >
              Got it
            </button>
          </div>
        ) : null}
        </div>
      </div>
    </>
  );
}
