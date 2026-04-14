import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./FAB.css";
import GuidedFlow from "./GuidedFlow";
import { EMPTY_EXP, splitCommaItems } from "../../cvShared";
import {
  isHelpless,
  isNameIncomplete,
  isVagueTitle,
  isCommaMissing,
  isAllSoftSkills,
  isExperienceDump,
  isNonsense,
} from "../../data/fabDetect";
import {
  normalizeAllCaps,
  parseSkillsString,
  parseDateRange,
  reframeArchitect,
  reframeRainmaker,
  reframeArtisan,
} from "../../data/fabParse";
// eslint-disable-next-line no-unused-vars -- QUESTION_EXAMPLES: fabTone public API (examples live in getToneReply)
import { detectTone, getToneReply, QUESTION_EXAMPLES } from "../../data/fabTone";
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
import { cleanAnswer, detectMultiAnswer } from "./FABValidationData";
import { getPaymentLink, hasFeatureAccess } from "../../utils/paywall";
import skillSuggestions from "../../data/skillSuggestions";
import { detectRole } from "../../utils/detectRole";

function usePrevious(value) {
  const ref = useRef();
  useEffect(() => { ref.current = value; });
  return ref.current;
}

/** Guided CV coach — question order and builder field mapping (nested paths use resume shape: period/points). */
const QUESTIONS = [
  { id: "name", text: "What is your full name?", field: "name" },
  { id: "title", text: "What is your current job title?", field: "title" },
  { id: "email", text: "What is your email address?", field: "email" },
  { id: "phone", text: "And your phone number?", field: "phone" },
  { id: "location", text: "Which city are you based in?", field: "location" },
  { id: "exp_company", text: "What's the name of your current or last company?", field: "experience[0].company" },
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

const GUIDED_FIELD_LABELS = {
  name: "name",
  title: "job title",
  email: "email",
  phone: "phone number",
  location: "city",
  exp_company: "company",
  exp_role: "role",
  exp_dates: "dates",
  exp_bullets: "achievements",
  skills: "skills",
  summary: "summary",
};

function isPositiveConfirmation(text) {
  const s = String(text || "")
    .trim()
    .toLowerCase();
  if (!s) return false;
  if (/^(yes|y|ok|okay|sure|yep|yeah|fine|correct|right|👍|perfect)$/.test(s)) return true;
  if (s.startsWith("looks good") || s.includes("all good")) return true;
  return false;
}

function getGuidedFieldValueFromResume(resume, fieldId) {
  if (!resume || typeof resume !== "object") return "";
  if (fieldId === "languages") return String(resume.languages || "").trim();
  const q = QUESTIONS.find((x) => x.id === fieldId);
  if (!q) return "";
  if (q.field.startsWith("experience[0].")) {
    const ex = Array.isArray(resume.experience) ? resume.experience[0] : null;
    if (!ex) return "";
    if (q.field === "experience[0].company") return String(ex.company || "").trim();
    if (q.field === "experience[0].role") return String(ex.role || "").trim();
    if (q.field === "experience[0].dates") return String(ex.period || ex.startDate || "").trim();
    if (q.field === "experience[0].bullets") return String(ex.points || "").trim();
  }
  if (q.field === "skills") return String(resume.skills || "").trim();
  if (q.field === "languages") return String(resume.languages || "").trim();
  return String(resume[q.field] ?? "").trim();
}

function isGuidedFieldEmptyForExtras(resume, fieldId) {
  return !getGuidedFieldValueFromResume(resume, fieldId);
}

function buildExtrasConfirmQueue(appliedKeys) {
  return QUESTIONS.map((q) => q.id).filter((id) => appliedKeys.includes(id));
}

/** Apply detectMultiAnswer extras; returns { next, appliedKeys }. */
function applyGuidedExtrasToResume(prev, extras) {
  let next = prev && typeof prev === "object" ? { ...prev } : {};
  const appliedKeys = [];
  for (const [key, val] of Object.entries(extras || {})) {
    if (val == null || String(val).trim() === "") continue;
    if (!isGuidedFieldEmptyForExtras(next, key)) continue;
    if (key === "languages") {
      next = { ...next, languages: String(val) };
      appliedKeys.push(key);
      continue;
    }
    if (key === "exp_dates") {
      const parsed = parseDateRange(String(val));
      const experience = [...(Array.isArray(next.experience) ? next.experience : [])];
      if (!experience[0]) experience[0] = { ...EMPTY_EXP };
      experience[0] = {
        ...experience[0],
        startDate: parsed.startDate,
        endDate: parsed.endDate,
        present: parsed.present,
        period: `${parsed.startDate} – ${parsed.endDate}`,
      };
      next = { ...next, experience };
      appliedKeys.push(key);
      continue;
    }
    const q = QUESTIONS.find((x) => x.id === key);
    if (!q) continue;
    next = applyGuidedFieldToResume(next, q.field, val);
    appliedKeys.push(key);
  }
  return { next, appliedKeys };
}

/** Normalizes cleaned answer for resume write (matches guided coach field handling). */
function buildProcessedGuidedValue(q, cleanedAnswer, rawTrimmed) {
  let processed = cleanedAnswer;
  if (q.field === "name") {
    processed = cleanedAnswer
      .trim()
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  } else if (q.field === "title") {
    processed = normalizeAllCaps(cleanedAnswer);
  } else if (q.field === "skills") {
    processed = parseSkillsString(cleanedAnswer);
  } else if (q.field === "location") {
    const loc = cleanedAnswer.trim().toLowerCase();
    if (loc === "dubai") processed = "Dubai, UAE";
    else if (loc === "abu dhabi") processed = "Abu Dhabi, UAE";
    else if (loc === "sharjah") processed = "Sharjah, UAE";
    else if (loc === "ajman") processed = "Ajman, UAE";
    else if (loc === "mumbai") processed = "Mumbai, India";
    else if (loc === "delhi" || loc === "new delhi") processed = "New Delhi, India";
    else if (loc === "bangalore" || loc === "bengaluru") processed = "Bangalore, India";
    else if (loc === "hyderabad") processed = "Hyderabad, India";
    else if (loc === "chennai") processed = "Chennai, India";
    else if (loc === "kolkata") processed = "Kolkata, India";
    else if (loc === "pune") processed = "Pune, India";
    else {
      processed = cleanedAnswer.trim().replace(/\b\w/g, (l) => l.toUpperCase());
    }
  } else if (q.field === "phone") {
    processed = cleanedAnswer.replace(/\s+/g, " ").trim();
    if (!processed.startsWith("+")) processed = "+" + processed;
  }
  return processed;
}

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

function applyGuidedFieldToResume(prev, field, processedValue) {
  const next = { ...prev };
  if (field.startsWith("experience[0].")) {
    if (field === "experience[0].dates") return next;
    const ex = [...(Array.isArray(next.experience) ? next.experience : [])];
    while (ex.length < 1) ex.push({ ...EMPTY_EXP });
    const row = { ...EMPTY_EXP, ...ex[0] };
    let key = "company";
    if (field === "experience[0].role") key = "role";
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

/** Progress coach ring + label colour by completion band — no blue, ever */
export function getRingColour(percent) {
  const p = Math.max(0, Math.min(100, percent));
  if (p <= 40) return "#EF4444";
  if (p <= 70) return "#F59E0B";
  if (p < 100) return "#D97706";
  return "#22C55E";
}

export function getAtsScoreStrokeColor(score) {
  const s = Math.round(Math.max(0, Math.min(100, Number(score) || 0)));
  if (s <= 40) return "#EF4444";
  if (s <= 70) return "#F59E0B";
  if (s < 100) return "#D97706";
  return "#22C55E";
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
        <div style={{ width: size, height: size, flexShrink: 0, position: "relative", willChange: "transform", transform: "translateZ(0)" }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden style={{ display: "block", willChange: "transform" }}>
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
              stroke={getAtsScoreStrokeColor(p)}
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
                background: "#D97706",
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
            <div style={{ marginTop: 8, fontSize: 10, fontWeight: 500, color: "#D97706" }}>ATS scan</div>
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
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  window.open(getPaymentLink("activeHunter"), "_blank");
                }}
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
  /** Builder: match "ATS tab" / ATS checker (typically navigates to /ats) */
  onGuidedSwitchToAtsTab,
  /** Builder: open CV preview from guided flow */
  onGuidedOpenPreview = null,
  /** Builder: switch to Templates tab from guided flow */
  onGuidedSwitchToTemplatesTab = null,
  /** Builder: sync guided post-summary stage for parent (e.g. idle summary sheet guard) */
  guidedPostSummaryStageSyncRef = null,
  /** Builder: section from preview tap — append one contextual message without reset */
  contextualSection = null,
  fabMode = "assistant",
  guideStep = 0,
  currentGuideStep = null,
  advanceGuideStep = () => {},
  retreatGuideStep = () => {},
  activeGuideSection: _activeGuideSection = null,
  onNavigateToTab = null,
  navigationSource = null,
  scanStatus = "idle",
  features = null,
  isPro = false,
  onPostPaymentCoverLetter = null,
  /** ATS tab FAB: trigger free scan using existing resume data (builder context) */
  onFabFreeScan = null,
  /** ATS tab FAB: trigger pro analysis using existing resume + job description */
  onFabProScan = null,
}) {
  const [fabAtsJd, setFabAtsJd] = useState("");
  const [celebrationConsumedSession, setCelebrationConsumedSession] = useState(false);
  const [activeCelebration, setActiveCelebration] = useState(null);
  const [postDownloadConsumedSession, setPostDownloadConsumedSession] = useState(false);
  const [activePostDownload, setActivePostDownload] = useState(false);
  const [postDownloadDays, setPostDownloadDays] = useState(0);
  const celebrationShownThisOpenRef = useRef(false);
  const navigate = useNavigate();

  const [isCelebrating, setIsCelebrating] = useState(false);
  const [isCelebratingExpress, setIsCelebratingExpress] = useState(false);
  const [isCelebratingHunter, setIsCelebratingHunter] = useState(false);
  const [isCelebratingPro, setIsCelebratingPro] = useState(false);
  const prevFeatures = usePrevious(features);

  useEffect(() => {
    if (!prevFeatures?.coverLetter && features?.coverLetter) {
      setIsCelebrating(true);
      onPostPaymentCoverLetter?.();
      const timer = setTimeout(() => setIsCelebrating(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [features?.coverLetter, prevFeatures?.coverLetter, onPostPaymentCoverLetter]);

  useEffect(() => {
    if (!prevFeatures?.expressPass && features?.expressPass) {
      setIsCelebratingExpress(true);
      const timer = setTimeout(() => setIsCelebratingExpress(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [features?.expressPass, prevFeatures?.expressPass]);

  useEffect(() => {
    if (!prevFeatures?.activeHunter && features?.activeHunter) {
      setIsCelebratingHunter(true);
      onPostPaymentCoverLetter?.();
      const timer = setTimeout(() => setIsCelebratingHunter(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [features?.activeHunter, prevFeatures?.activeHunter, onPostPaymentCoverLetter]);

  useEffect(() => {
    if (!prevFeatures?.careerPro && features?.careerPro) {
      setIsCelebratingPro(true);
      onPostPaymentCoverLetter?.();
      const timer = setTimeout(() => setIsCelebratingPro(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [features?.careerPro, prevFeatures?.careerPro, onPostPaymentCoverLetter]);

  const [builderCoachTab, setBuilderCoachTab] = useState("tips");
  const [guidedMessages, setGuidedMessages] = useState([]);
  const [guidedProgress, setGuidedProgress] = useState(0);
  const [guidedInput, setGuidedInput] = useState("");
  const [guidedTyping, setGuidedTyping] = useState(false);
  const [guidedStep, setGuidedStep] = useState(0);
  const guidedStepRef = useRef(0);
  const [guidedShowInput, setGuidedShowInput] = useState(true);
  const guidedPostSummaryStageRef = useRef("qa");
  const nudgedStepsRef = useRef(new Set());
  const [guidedPendingConfirm, setGuidedPendingConfirm] = useState(null);
  const guidedExtrasConfirmQueueRef = useRef([]);
  const lastExtrasSnapshotRef = useRef({});
  const [guideNinePhase, setGuideNinePhase] = useState(1);
  const [tooltipCoords, setTooltipCoords] = useState({ top: null, bottom: 90, right: 20 });
  // Step 8 ATS micro-flow: idle | scanning | scored | pro-jd
  const [step8Phase, setStep8Phase] = useState("idle");
  const [step8Result, setStep8Result] = useState(null);
  const [step8Jd, setStep8Jd] = useState("");
  // Step 9 Job Match sub-states: idle | typing | result
  const [step9Phase, setStep9Phase] = useState("idle");
  const [step9Score, setStep9Score] = useState(null);

  const resetGuidedCoach = useCallback(() => {
    guidedPostSummaryStageRef.current = "qa";
    if (guidedPostSummaryStageSyncRef) guidedPostSummaryStageSyncRef.current = "qa";
    setGuidedPendingConfirm(null);
    guidedExtrasConfirmQueueRef.current = [];
    lastExtrasSnapshotRef.current = {};
    setGuidedStep(0);
    guidedStepRef.current = 0;
    setGuidedProgress(0);
    setGuidedInput("");
    setGuidedTyping(false);
    setGuidedShowInput(false);
    setGuidedMessages([
      {
        id: nextGuidedMessageId(),
        role: "assistant",
        text: "Hey! I'm your CV Coach on CVPassport.",
      },
    ]);
    setTimeout(() => {
      setGuidedMessages((prev) => [
        ...prev,
        {
          id: nextGuidedMessageId(),
          role: "assistant",
          text: "Whatever you type here gets filled into your CV automatically — no forms, just a quick chat.",
        },
      ]);
    }, 800);
    setTimeout(() => {
      setGuidedMessages((prev) => [
        ...prev,
        {
          id: nextGuidedMessageId(),
          role: "assistant",
          text: "Ready? Let's start with the basics.",
        },
      ]);
    }, 1600);
    setTimeout(() => {
      setGuidedMessages((prev) => [
        ...prev,
        {
          id: nextGuidedMessageId(),
          role: "assistant",
          text: QUESTIONS[0].text,
        },
      ]);
      setGuidedShowInput(true);
    }, 2400);
  }, [guidedPostSummaryStageSyncRef]);

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
    if (guidedPostSummaryStageSyncRef) guidedPostSummaryStageSyncRef.current = "qa";
    setGuidedPendingConfirm(null);
    guidedExtrasConfirmQueueRef.current = [];
    lastExtrasSnapshotRef.current = {};
    setGuidedStep(0);
    guidedStepRef.current = 0;
    setGuidedProgress(0);
    setGuidedShowInput(false);
    setGuidedMessages([
      {
        id: nextGuidedMessageId(),
        role: "assistant",
        text: "Hey! I'm your CV Coach on CVPassport.",
      },
    ]);
    setTimeout(() => {
      setGuidedMessages((prev) => [
        ...prev,
        {
          id: nextGuidedMessageId(),
          role: "assistant",
          text: "Whatever you type here gets filled into your CV automatically — no forms, just a quick chat.",
        },
      ]);
    }, 800);
    setTimeout(() => {
      setGuidedMessages((prev) => [
        ...prev,
        {
          id: nextGuidedMessageId(),
          role: "assistant",
          text: "Ready? Let's start with the basics.",
        },
      ]);
    }, 1600);
    setTimeout(() => {
      setGuidedMessages((prev) => [
        ...prev,
        {
          id: nextGuidedMessageId(),
          role: "assistant",
          text: QUESTIONS[0].text,
        },
      ]);
      setGuidedShowInput(true);
    }, 2400);
  }, [open, variant, builderCoachTab, guidedMessages.length, guidedPostSummaryStageSyncRef]);

  const prevContextualSectionRef = useRef(null);
  useEffect(() => {
    if (!contextualSection) return;
    if (contextualSection === prevContextualSectionRef.current) return;
    prevContextualSectionRef.current = contextualSection;
    const sectionLabels = {
      summary: "Summary",
      experience: "Work History",
      education: "Education",
      competencies: "Skills",
      languages: "Languages",
    };
    const label = sectionLabels[contextualSection] || contextualSection;
    setGuidedMessages((prev) => [
      ...prev,
      {
        id: nextGuidedMessageId(),
        role: "assistant",
        text: `I can see you want to work on your ${label} section. Let's make it stronger — what would you like to change?`,
      },
    ]);
    setBuilderCoachTab("guide");
    setGuidedShowInput(true);
  }, [contextualSection]);

  const handleGuidedInputChange = useCallback((e) => {
    setGuidedInput(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 88)}px`;
  }, []);

  const handleGuidedSend = useCallback((textFromNudge) => {
    const trimmed =
      textFromNudge !== undefined && textFromNudge !== null
        ? String(textFromNudge).trim()
        : guidedInput.trim();
    if (!trimmed || typeof setResume !== "function") return;

    if (isNonsense(trimmed)) {
      setGuidedMessages((prev) => [
        ...prev,
        { id: nextGuidedMessageId(), role: "user", text: trimmed },
        {
          id: nextGuidedMessageId(),
          role: "assistant",
          text: "That doesn't look right — can you try again? Even a rough answer works.",
        },
      ]);
      setGuidedInput("");
      return;
    }

    const WRITE_FOR_ME_PHRASES = [
      "write for me",
      "write it for me",
      "you write",
      "write it",
      "generate",
      "create for me",
      "make it for me",
      "do it for me",
    ];
    const isWriteForMe =
      guidedStepRef.current === QUESTIONS.length - 1 &&
      WRITE_FOR_ME_PHRASES.some((p) => trimmed.toLowerCase().includes(p));

    if (isWriteForMe) {
      const title =
        resume?.experience?.[0]?.role ||
        resume?.experience?.[0]?.title ||
        resume?.title ||
        "Professional";
      const company = resume?.experience?.[0]?.company || "";
      const rawSkillsStr = resume?.skills || "";
      const rawSkills =
        typeof rawSkillsStr === "string" && rawSkillsStr.trim()
          ? splitCommaItems(rawSkillsStr)
          : [];
      const skills = rawSkills.slice(0, 3).join(", ") || "key skills";
      const location = resume?.location || "";
      const summaryOptions = [
        `${title} with hands-on experience${company ? ` at ${company}` : ""}, skilled in ${skills}.`,
        `Motivated ${title}${location ? ` based in ${location}` : ""}, bringing expertise in ${skills}.`,
        `Dedicated ${title}${company ? ` from ${company}` : ""} with a strong foundation in ${skills} and a drive to deliver results.`,
      ];
      setGuidedMessages((prev) => [
        ...prev,
        { id: nextGuidedMessageId(), role: "user", text: trimmed },
        {
          id: nextGuidedMessageId(),
          role: "assistant",
          text: "Done — I wrote 3 versions from your info. Pick the one that fits:",
          summaryOptions,
        },
      ]);
      setGuidedInput("");
      return;
    }

    if (isHelpless(trimmed)) {
      const tone = detectTone(trimmed);
      const currentField = QUESTIONS[guidedStepRef.current]?.field || "";
      const isSummaryQuestion = guidedStepRef.current === QUESTIONS.length - 1;
      if (isSummaryQuestion) {
        const title =
          resume?.experience?.[0]?.role ||
          resume?.experience?.[0]?.title ||
          resume?.title ||
          "Professional";
        const company = resume?.experience?.[0]?.company || "";
        const rawSkillsStr = resume?.skills || "";
        const rawSkills =
          typeof rawSkillsStr === "string" && rawSkillsStr.trim()
            ? splitCommaItems(rawSkillsStr)
            : [];
        const skills = rawSkills.slice(0, 3).join(", ") || "key skills";
        const location = resume?.location || "";

        const summaryOptions = [
          `${title} with hands-on experience${company ? ` at ${company}` : ""}, skilled in ${skills}.`,
          `Motivated ${title}${location ? ` based in ${location}` : ""}, bringing expertise in ${skills}.`,
          `Dedicated ${title}${company ? ` from ${company}` : ""} with a strong foundation in ${skills} and a drive to deliver results.`,
        ];

        const toneIntro = {
          frustrated: "I hear you — we're almost done! I wrote 3 options from your info. Pick one:",
          confused: "Let me help — here are 3 versions based on what you told me. Pick one:",
          lazy: "No problem — here are 3 ready-made options. Just tap one:",
          normal: "No worries — I wrote 3 options based on what you told me. Pick one:",
        };

        setGuidedMessages((prev) => [
          ...prev,
          { id: nextGuidedMessageId(), role: "user", text: trimmed },
          {
            id: nextGuidedMessageId(),
            role: "assistant",
            text: toneIntro[tone] || toneIntro.normal,
            summaryOptions,
          },
        ]);
        setGuidedInput("");
        return;
      }

      const toneReply = getToneReply(tone, currentField);
      const fallbackReply =
        "No problem — I've left that blank for now. You can tap any section in the builder to fill it in manually later.";

      setGuidedMessages((prev) => [
        ...prev,
        { id: nextGuidedMessageId(), role: "user", text: trimmed },
        {
          id: nextGuidedMessageId(),
          role: "assistant",
          text: toneReply || fallbackReply,
        },
      ]);
      setGuidedInput("");
      setGuidedStep((s) => {
        const next = s + 1;
        guidedStepRef.current = next;
        if (next < QUESTIONS.length) {
          setTimeout(() => {
            setGuidedMessages((prev) => [
              ...prev,
              { id: nextGuidedMessageId(), role: "assistant", text: QUESTIONS[next].text },
            ]);
            setGuidedTyping(false);
          }, 800);
        }
        return next;
      });
      return;
    }

    if (guidedPostSummaryStageRef.current !== "qa") return;

    const showNextGuidedAfterStep = (completedStepIndex) => {
      const nextStep = completedStepIndex + 1;
      if (nextStep >= QUESTIONS.length) return;
      const nextId = QUESTIONS[nextStep].id;
      if (
        guidedExtrasConfirmQueueRef.current.length > 0 &&
        guidedExtrasConfirmQueueRef.current[0] === nextId
      ) {
        guidedExtrasConfirmQueueRef.current.shift();
        const label = GUIDED_FIELD_LABELS[nextId] || nextId;
        const snap =
          lastExtrasSnapshotRef.current[nextId] != null
            ? String(lastExtrasSnapshotRef.current[nextId])
            : "";
        setGuidedPendingConfirm({ stepIndex: nextStep, fieldId: nextId });
        setGuidedMessages((prev) => [
          ...prev,
          {
            id: nextGuidedMessageId(),
            role: "assistant",
            text: `I've already noted your ${label} as ${snap} — looks good? Or type to correct it.`,
          },
        ]);
        setGuidedStep(nextStep);
        guidedStepRef.current = nextStep;
        setGuidedProgress((p) => Math.min(100, p + GUIDED_PROGRESS_STEP));
        return;
      }
      setGuidedMessages((prev) => [
        ...prev,
        { id: nextGuidedMessageId(), role: "assistant", text: QUESTIONS[nextStep].text },
      ]);
      setGuidedStep(nextStep);
      guidedStepRef.current = nextStep;
      setGuidedProgress((p) => Math.min(100, p + GUIDED_PROGRESS_STEP));
    };

    if (guidedPendingConfirm) {
      const p = guidedPendingConfirm;
      setGuidedMessages((prev) => [...prev, { id: nextGuidedMessageId(), role: "user", text: trimmed }]);
      setGuidedInput("");
      if (isPositiveConfirmation(trimmed)) {
        setGuidedPendingConfirm(null);
        setGuidedTyping(true);
        window.setTimeout(() => {
          showNextGuidedAfterStep(p.stepIndex);
          setGuidedTyping(false);
        }, 800);
        return;
      }
      const qConf = QUESTIONS.find((x) => x.id === p.fieldId);
      if (!qConf) {
        setGuidedPendingConfirm(null);
        return;
      }
      const cleaned = cleanAnswer(p.fieldId, trimmed);
      if (qConf.field === "experience[0].dates") {
        const parsed = parseDateRange(cleaned);
        setResume((prev) => {
          const experience = [...(prev.experience || [])];
          if (!experience[0]) experience[0] = { ...EMPTY_EXP };
          experience[0] = {
            ...experience[0],
            startDate: parsed.startDate,
            endDate: parsed.endDate,
            present: parsed.present,
            period: `${parsed.startDate} – ${parsed.endDate}`,
          };
          return { ...prev, experience };
        });
      } else {
        const processedConf = buildProcessedGuidedValue(qConf, cleaned, trimmed);
        setResume((prev) => applyGuidedFieldToResume(prev, qConf.field, processedConf));
      }
      setGuidedPendingConfirm(null);
      setGuidedTyping(true);
      window.setTimeout(() => {
        showNextGuidedAfterStep(p.stepIndex);
        setGuidedTyping(false);
      }, 800);
      return;
    }

    const q = QUESTIONS[guidedStepRef.current];
    if (!q) return;

    const advanceGuidedStep = () => {
      showNextGuidedAfterStep(guidedStepRef.current);
    };

    const alreadyNudged = nudgedStepsRef.current.has(guidedStepRef.current);

    if (q.field === "name" && !alreadyNudged && isNameIncomplete(trimmed)) {
      nudgedStepsRef.current.add(guidedStepRef.current);
      setGuidedMessages((prev) => [
        ...prev,
        { id: nextGuidedMessageId(), role: "user", text: trimmed },
        {
          id: nextGuidedMessageId(),
          role: "assistant",
          text: "Could you add your last name too? Full name helps recruiters find you in HR systems.",
        },
      ]);
      setGuidedInput("");
      return;
    }

    if (q.field === "title" && !alreadyNudged && isVagueTitle(trimmed)) {
      nudgedStepsRef.current.add(guidedStepRef.current);
      setGuidedMessages((prev) => [
        ...prev,
        { id: nextGuidedMessageId(), role: "user", text: trimmed },
        {
          id: nextGuidedMessageId(),
          role: "assistant",
          text: `Got it. Can you be more specific? Instead of "${trimmed}", try something like "Sales Manager – Real Estate" or "Customer Service Officer".`,
        },
      ]);
      setGuidedInput("");
      return;
    }

    if (q.field === "experience[0].company" && !alreadyNudged && isExperienceDump(trimmed)) {
      nudgedStepsRef.current.add(guidedStepRef.current);
      setGuidedMessages((prev) => [
        ...prev,
        { id: nextGuidedMessageId(), role: "user", text: trimmed },
        {
          id: nextGuidedMessageId(),
          role: "assistant",
          text: "Let's take it one step at a time — just the company name here. We'll add your role and dates in the next questions.",
        },
      ]);
      setGuidedInput("");
      return;
    }

    if (q.field === "experience[0].dates" && !alreadyNudged && /^\d{4}$/.test(trimmed.trim())) {
      nudgedStepsRef.current.add(guidedStepRef.current);
      setGuidedMessages((prev) => [
        ...prev,
        { id: nextGuidedMessageId(), role: "user", text: trimmed },
        {
          id: nextGuidedMessageId(),
          role: "assistant",
          text: "Almost! Could you add the month too? e.g. Jan 2022 – Present. If unsure, an estimate is fine.",
        },
      ]);
      setGuidedInput("");
      return;
    }

    // ── experience[0].bullets: show 3 tone cards instead of writing immediately ──
    if (q.field === "experience[0].bullets") {
      const extras = detectMultiAnswer(q.id, trimmed);
      lastExtrasSnapshotRef.current = { ...extras };
      setResume((prev) => {
        const { next, appliedKeys } = applyGuidedExtrasToResume(prev, extras);
        guidedExtrasConfirmQueueRef.current = buildExtrasConfirmQueue(appliedKeys);
        return next;
      });
      const cleanedBullets = cleanAnswer("exp_bullets", trimmed);
      setGuidedMessages((prev) => [
        ...prev,
        { id: nextGuidedMessageId(), role: "user", text: trimmed },
        {
          id: nextGuidedMessageId(),
          role: "assistant",
          type: "bullet_options",
          text: "Pick the version that sounds most like you:",
          options: [
            { tone: "Architect", text: reframeArchitect(cleanedBullets) },
            { tone: "Rainmaker", text: reframeRainmaker(cleanedBullets) },
            { tone: "Artisan", text: reframeArtisan(cleanedBullets) },
          ],
        },
      ]);
      setGuidedInput("");
      // Do NOT advance step or call setResume — handled by handleSelectBullet
      return;
    }

    if (q.field === "skills" && !alreadyNudged) {
      const parsed = parseSkillsString(trimmed)
        .split(", ")
        .filter(Boolean);
      if (isCommaMissing(trimmed) || isAllSoftSkills(parsed)) {
        nudgedStepsRef.current.add(guidedStepRef.current);
        setGuidedMessages((prev) => [
          ...prev,
          { id: nextGuidedMessageId(), role: "user", text: trimmed },
          {
            id: nextGuidedMessageId(),
            role: "assistant",
            text: "Good start! Can you add 2-3 hard skills too? Think tools, software, or industry-specific skills you use daily.",
          },
        ]);
        setGuidedInput("");
        return;
      }
    }

    const fieldId = q.id;
    const cleanedAnswer = cleanAnswer(fieldId, trimmed);
    const extras = detectMultiAnswer(fieldId, trimmed);
    lastExtrasSnapshotRef.current = { ...extras };

    let processed = buildProcessedGuidedValue(q, cleanedAnswer, trimmed);

    if (q.field === "name") {
      processed = cleanedAnswer
        .trim()
        .toLowerCase()
        .replace(/\b\w/g, (l) => l.toUpperCase());
    }

    if (q.field === "title") {
      processed = normalizeAllCaps(cleanedAnswer);
    }

    if (q.field === "experience[0].dates") {
      const parsed = parseDateRange(cleanedAnswer);
      setResume((prev) => {
        const { next, appliedKeys } = applyGuidedExtrasToResume(prev, extras);
        guidedExtrasConfirmQueueRef.current = buildExtrasConfirmQueue(appliedKeys);
        const experience = [...(next.experience || [])];
        if (!experience[0]) experience[0] = { ...EMPTY_EXP };
        experience[0] = {
          ...experience[0],
          startDate: parsed.startDate,
          endDate: parsed.endDate,
          present: parsed.present,
          period: `${parsed.startDate} – ${parsed.endDate}`,
        };
        return { ...next, experience };
      });
      setGuidedMessages((prev) => [...prev, { id: nextGuidedMessageId(), role: "user", text: trimmed }]);
      setGuidedInput("");
      setGuidedTyping(true);
      window.setTimeout(() => {
        advanceGuidedStep();
        setGuidedTyping(false);
      }, 800);
      return;
    }

    if (q.field === "skills") {
      processed = parseSkillsString(cleanedAnswer);
    }

    setResume((prev) => {
      const { next, appliedKeys } = applyGuidedExtrasToResume(prev, extras);
      guidedExtrasConfirmQueueRef.current = buildExtrasConfirmQueue(appliedKeys);
      return applyGuidedFieldToResume(next, q.field, processed);
    });

    setGuidedMessages((prev) => [...prev, { id: nextGuidedMessageId(), role: "user", text: trimmed }]);
    setGuidedInput("");
    setGuidedTyping(true);

    const isLast = guidedStepRef.current >= QUESTIONS.length - 1;

    window.setTimeout(() => {
      if (isLast) {
        setGuidedMessages((prev) => [
          ...prev,
          {
            id: nextGuidedMessageId(),
            role: "assistant",
            text: "Your CV is ready. Let's make it look the part.",
            ctaBtn: "Preview My Draft",
            ctaStyle: "white",
            ctaId: "preview-draft",
          },
        ]);
        window.setTimeout(() => {
          setGuidedMessages((prev) => [
            ...prev,
            {
              id: nextGuidedMessageId(),
              role: "assistant",
              text: "Want to pick a different design first?",
              ctaBtn: "Browse Templates",
              ctaStyle: "outline",
              ctaId: "pick-template",
            },
          ]);
        }, 1400);
        setGuidedShowInput(false);
        setGuidedProgress((p) => Math.min(100, p + GUIDED_PROGRESS_STEP));
        guidedPostSummaryStageRef.current = "template";
        if (guidedPostSummaryStageSyncRef) guidedPostSummaryStageSyncRef.current = "template";
      } else {
        const nextStep = guidedStepRef.current + 1;
        if (nextStep === QUESTIONS.length - 1) {
          setGuidedMessages((prev) => [
            ...prev,
            {
              id: nextGuidedMessageId(),
              role: "assistant",
              text: "Almost done! Want me to write your professional summary from what you've told me?",
              ctaBtn: "Write it for me",
              ctaStyle: "white",
              ctaId: "summary-auto",
            },
          ]);
          window.setTimeout(() => {
            setGuidedMessages((prev) => [
              ...prev,
              {
                id: nextGuidedMessageId(),
                role: "assistant",
                text: "Or you can write your own.",
                ctaBtn: "I'll write it myself",
                ctaStyle: "outline",
                ctaId: "summary-manual",
              },
            ]);
          }, 800);
          setGuidedStep(QUESTIONS.length - 1);
          guidedStepRef.current = QUESTIONS.length - 1;
          setGuidedShowInput(false);
          setGuidedProgress((p) => Math.min(100, p + GUIDED_PROGRESS_STEP));
        } else {
          advanceGuidedStep();
        }
      }
      setGuidedTyping(false);
    }, 800);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- guidedStep reads use guidedStepRef; resume omitted from deps intentionally
  }, [guidedInput, setResume, guidedPostSummaryStageSyncRef]);

  /**
   * handleSelectBullet — called from GuidedFlow when user taps one of the 3 tone cards.
   * Applies the chosen bullet to the resume, pushes a confirmation message, and advances the step.
   */
  const handleSelectBullet = useCallback(
    (bulletText) => {
      if (typeof setResume !== "function") return;

      // Write to resume
      setResume((prev) => applyGuidedFieldToResume(prev, "experience[0].bullets", bulletText));

      // Confirmation + next question
      const nextStep = guidedStepRef.current + 1;
      setGuidedMessages((prev) => [
        ...prev,
        {
          id: nextGuidedMessageId(),
          role: "assistant",
          text: "Good choice. Let's keep going.",
        },
      ]);

      setGuidedStep(nextStep);
      guidedStepRef.current = nextStep;
      setGuidedProgress((p) => Math.min(100, p + GUIDED_PROGRESS_STEP));

      if (nextStep < QUESTIONS.length) {
        window.setTimeout(() => {
          setGuidedMessages((prev) => [
            ...prev,
            {
              id: nextGuidedMessageId(),
              role: "assistant",
              text: QUESTIONS[nextStep].text,
            },
          ]);
        }, 600);
      }
    },
    [setResume]
  );

  const handleNudgeSelect = useCallback(
    (value) => {
      setGuidedInput(value);
      window.setTimeout(() => {
        handleGuidedSend(value);
      }, 100);
    },
    [handleGuidedSend]
  );

  const handleSelectSummary = useCallback(
    (text) => {
      guidedPostSummaryStageRef.current = "template";
      if (guidedPostSummaryStageSyncRef) guidedPostSummaryStageSyncRef.current = "template";
      setResume((prev) => ({ ...prev, summary: text }));
      setGuidedMessages((prev) => [
        ...prev,
        { id: nextGuidedMessageId(), role: "user", text },
        {
          id: nextGuidedMessageId(),
          role: "assistant",
          text: "Your CV is ready. Let's make it look the part.",
          ctaBtn: "Preview My Draft",
          ctaStyle: "white",
          ctaId: "preview-draft",
        },
      ]);
      setGuidedStep(QUESTIONS.length);
      guidedStepRef.current = QUESTIONS.length;
      setGuidedProgress(100);
      window.setTimeout(() => {
        setGuidedMessages((prev) => [
          ...prev,
          {
            id: nextGuidedMessageId(),
            role: "assistant",
            text: "Want to pick a different design first?",
            ctaBtn: "Browse Templates",
            ctaStyle: "outline",
            ctaId: "pick-template",
          },
        ]);
      }, 1400);
    },
    [setResume, guidedPostSummaryStageSyncRef]
  );

  const handleSkipSummary = useCallback(() => {
    guidedPostSummaryStageRef.current = "template";
    if (guidedPostSummaryStageSyncRef) guidedPostSummaryStageSyncRef.current = "template";
    setGuidedMessages((prev) => [
      ...prev,
      {
        id: nextGuidedMessageId(),
        role: "assistant",
        text: "Your CV is ready. Let's make it look the part.",
        ctaBtn: "Preview My Draft",
        ctaStyle: "white",
        ctaId: "preview-draft",
      },
    ]);
    setGuidedStep(QUESTIONS.length);
    guidedStepRef.current = QUESTIONS.length;
    setGuidedProgress(100);
    window.setTimeout(() => {
      setGuidedMessages((prev) => [
        ...prev,
        {
          id: nextGuidedMessageId(),
          role: "assistant",
          text: "Want to pick a different design first?",
          ctaBtn: "Browse Templates",
          ctaStyle: "outline",
          ctaId: "pick-template",
        },
      ]);
    }, 1400);
  }, [guidedPostSummaryStageSyncRef]);

  const handleGuidedCtaClick = useCallback(
    (ctaId) => {
      if (ctaId === "summary-auto") {
        const title =
          resume?.experience?.[0]?.role ||
          resume?.experience?.[0]?.title ||
          resume?.title ||
          "Professional";
        const company = resume?.experience?.[0]?.company || "";
        const rawSkillsStr = resume?.skills || "";
        const rawSkills =
          typeof rawSkillsStr === "string" && rawSkillsStr.trim()
            ? splitCommaItems(rawSkillsStr)
            : [];
        const skills = rawSkills.slice(0, 3).join(", ") || "key skills";
        const location = resume?.location || "";
        const summaryOptions = [
          `${title} with hands-on experience${company ? ` at ${company}` : ""}, skilled in ${skills}.`,
          `Motivated ${title}${location ? ` based in ${location}` : ""}, bringing expertise in ${skills}.`,
          `Dedicated ${title}${company ? ` from ${company}` : ""} with a strong foundation in ${skills} and a drive to deliver results.`,
        ];
        setGuidedMessages((prev) => [
          ...prev,
          {
            id: nextGuidedMessageId(),
            role: "assistant",
            text: "Done — I wrote 3 versions from your info. Pick the one that fits:",
            summaryOptions,
          },
        ]);
        return;
      }
      if (ctaId === "summary-manual") {
        setGuidedShowInput(true);
        setGuidedMessages((prev) => [
          ...prev,
          {
            id: nextGuidedMessageId(),
            role: "assistant",
            text: "Go ahead — write a 2–3 line summary starting with your title and years of experience.",
          },
        ]);
        return;
      }
      if (ctaId === "preview-draft") {
        onClose?.();
        setTimeout(() => {
          onGuidedOpenPreview?.();
        }, 300);
        return;
      }
      if (ctaId === "pick-template") {
        onClose?.();
        setTimeout(() => (onGuidedSwitchToTemplatesTab ?? onGuidedSwitchToAtsTab)?.(), 600);
        return;
      }
      if (ctaId === "download") {
        onGuidedDownload?.();
        setGuidedMessages((prev) => [
          ...prev,
          {
            id: nextGuidedMessageId(),
            role: "assistant",
            text: "Done. Good luck — you've got this.",
            complete: true,
          },
        ]);
        setGuidedProgress(100);
        guidedPostSummaryStageRef.current = "done";
        if (guidedPostSummaryStageSyncRef) guidedPostSummaryStageSyncRef.current = "done";
      }
    },
    [
      onClose,
      onGuidedDownload,
      onGuidedOpenPreview,
      onGuidedSwitchToAtsTab,
      onGuidedSwitchToTemplatesTab,
      guidedPostSummaryStageSyncRef,
      resume,
      setGuidedMessages,
      setGuidedShowInput,
    ]
  );

  const handleGuidedSkip = useCallback(() => {
    setBuilderCoachTab("tips");
    onGuidedSwitchToAtsTab?.();
  }, [onGuidedSwitchToAtsTab]);

  const handleGuidedExit = useCallback(() => {
    onClose?.();
  }, [onClose]);

  useEffect(() => {
    if (variant !== "builder" || fabMode !== "guide" || !currentGuideStep) return;
    if (!currentGuideStep.onEnter || !onNavigateToTab) return;
    onNavigateToTab(currentGuideStep.onEnter);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onEnter once per guide step id; onNavigateToTab stable from parent
  }, [currentGuideStep?.id, variant, fabMode]);

  /* Guide tooltip coords — always anchored left of the FAB, never based on DOM section position.
     This makes the bubble feel like one organism with the FAB (Apple Watch complication style).
     The FAB sits at right:20px / bottom:80px+safe-area. We place the bubble flush left of the ring. */
  useEffect(() => {
    if (fabMode !== "guide" || !currentGuideStep) return;
    // Fixed: always anchor to FAB — right:20 + 56px FAB + 16px gap = right:92
    setTooltipCoords({ top: null, bottom: 90, right: 92 });
  }, [guideStep, fabMode, currentGuideStep]);

  useEffect(() => {
    if (variant !== "builder" || fabMode !== "guide" || !currentGuideStep?.twoPhase) return;
    setGuideNinePhase(1);
    const t = setTimeout(() => setGuideNinePhase(2), 2500);
    return () => clearTimeout(t);
  }, [variant, fabMode, guideStep, currentGuideStep?.id, currentGuideStep?.twoPhase]);

  // Reset step 8 & 9 micro-flow whenever the guide step changes
  useEffect(() => {
    setStep8Result(null);
    setStep8Jd("");
    setStep9Phase("idle");
    setStep9Score(null);
    // Auto-trigger free scan when entering step 8
    if (currentGuideStep?.id === 8 && currentGuideStep?.autoAction) {
      setStep8Phase("scanning");
    } else {
      setStep8Phase("idle");
    }
  }, [guideStep, currentGuideStep?.id, currentGuideStep?.autoAction]);

  const computeStep8FreeScan = useCallback(() => {
    const cv = resume || {};
    const parts = [
      String(cv.title || ""),
      String(cv.summary || ""),
      String(cv.skills || ""),
      ...(Array.isArray(cv.experience)
        ? cv.experience.flatMap((e) => [String(e?.role || ""), String(e?.company || ""), String(e?.points || "")])
        : []),
    ];
    const cvText = parts.join(" ").toLowerCase();
    const roleKey = detectRole(cv.title || "") || "sales_real_estate";
    const pack = skillSuggestions[roleKey] || skillSuggestions.sales_real_estate;
    const list = pack?.atsKeywords ?? [];
    const found = [];
    const missing = [];
    for (const row of list) {
      const kw = row?.keyword?.trim();
      if (!kw) continue;
      if (cvText.includes(kw.toLowerCase())) found.push(kw);
      else missing.push(kw);
    }
    if (found.length + missing.length === 0) {
      const seen = new Set();
      for (const p of Object.values(skillSuggestions)) {
        for (const row of p?.atsKeywords ?? []) {
          const kw = row?.keyword?.trim();
          if (!kw) continue;
          const k = kw.toLowerCase();
          if (seen.has(k)) continue;
          seen.add(k);
          if (cvText.includes(k)) found.push(kw);
          else missing.push(kw);
          if (found.length + missing.length >= 20) break;
        }
      }
    }
    const total = found.length + missing.length;
    const kwScore = total > 0 ? Math.round((found.length / total) * 100) : 52;
    const hasSummary = String(cv.summary || "").trim().length > 20;
    const hasExp = Array.isArray(cv.experience) && cv.experience.some((e) => String(e?.role || "").trim());
    const hasSkills = String(cv.skills || "").trim().length > 0;
    const structScore = 52 + (hasSummary ? 10 : 0) + (hasExp ? 10 : 0) + (hasSkills ? 10 : 0);
    const contentScore = hasSummary && hasExp ? 72 : 56;
    const raw = Math.round((kwScore + structScore + contentScore) / 3);
    return {
      score: Math.max(42, Math.min(84, raw)),
      visibilityBoosters: found.slice(0, 4),
      rankTriggers: missing.slice(0, 4),
      industry: pack?.jobTitles?.[0] || "General GCC Market",
    };
  }, [resume]);

  // Auto-complete scan when in scanning phase
  useEffect(() => {
    if (step8Phase !== "scanning") return;
    const t = setTimeout(() => {
      const result = computeStep8FreeScan();
      setStep8Result(result);
      setStep8Phase("scored");
    }, 1800);
    return () => clearTimeout(t);
  }, [step8Phase, computeStep8FreeScan]);

  const handleStep8FreeScan = useCallback(() => {
    setStep8Phase("scanning");
  }, []);

  // Step 9: watch Job Match textarea for content changes + result rendering
  useEffect(() => {
    if (variant !== "builder" || fabMode !== "guide" || currentGuideStep?.id !== 9) return;
    const checkJobMatchState = () => {
      // Check for result first
      const resultEl = document.querySelector('[data-jobmatch-result]');
      if (resultEl) {
        const scoreText = resultEl.getAttribute('data-jobmatch-score');
        const parsedScore = scoreText ? parseInt(scoreText, 10) : NaN;
        setStep9Phase("result");
        setStep9Score(!isNaN(parsedScore) ? parsedScore : null);
        return;
      }
      // Check for textarea content
      const ta = document.querySelector('[data-jobmatch-textarea]');
      if (ta && ta.value && ta.value.trim().length > 0) {
        setStep9Phase("typing");
      } else {
        setStep9Phase("idle");
      }
    };
    // Poll periodically since we can't easily attach listeners to elements we don't own
    const interval = setInterval(checkJobMatchState, 500);
    checkJobMatchState();
    return () => clearInterval(interval);
  }, [variant, fabMode, currentGuideStep?.id]);

  if (variant === "builder" && fabMode === "guide" && currentGuideStep) {
    const step = currentGuideStep;
    const hideFabGuideButtons = step.twoPhase === true && guideNinePhase === 1;
    // Dynamic bubble text for step 8 (ATS sub-states) and step 9 (Job Match sub-states)
    let bodyText;
    if (step.id === 8) {
      bodyText = (step8Phase === "scored" || step8Phase === "pro-jd")
        ? step.bubbleTextScored || step.bubbleText
        : step.bubbleText;
    } else if (step.id === 9) {
      if (step9Phase === "result") {
        bodyText = step9Score != null && step.bubbleTextResult
          ? step.bubbleTextResult.replace("{score}", String(step9Score))
          : "Results locked. Upgrade to see your full match score and every missing keyword.";
      } else if (step9Phase === "typing" && step.bubbleTextTyping) {
        bodyText = step.bubbleTextTyping;
      } else {
        bodyText = step.bubbleText;
      }
    } else if (step.twoPhase === true) {
      bodyText = guideNinePhase === 1 ? step.textPhase1 : step.textPhase2;
    } else {
      bodyText = step.bubbleText;
    }
    return (
      <div
        style={{
          position: "fixed",
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)",
          right: tooltipCoords.right,
          zIndex: 100,
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-end",
          gap: "0",
        }}
      >
        <style
          dangerouslySetInnerHTML={{
            __html: `
  @keyframes fabShimmerBorder {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  @keyframes step8StepIn {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes step8RingFill {
    from { stroke-dashoffset: var(--ring-circ); }
    to   { stroke-dashoffset: var(--ring-offset); }
  }
  @keyframes step8ChipIn {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`,
          }}
        />
        {/* Bubble — anchored left of FAB, grows from it like an Apple Watch complication */}
        <div
          key={guideStep}
          style={{
            background: "#1C1C1C",
            border: `1px solid ${step.upsell ? "#F59E0B" : "rgba(255,255,255,0.12)"}`,
            borderRadius: "12px",
            padding: "12px 14px",
            maxWidth: (step.id === 8 && (step8Phase === "scored" || step8Phase === "pro-jd")) || (step.id === 9 && step9Phase === "result") ? "288px" : "220px",
            minWidth: "180px",
            animation: "fabFadeIn 0.3s cubic-bezier(0.4,0,0.2,1)",
            boxShadow: "0 4px 24px rgba(0,0,0,0.5)",
            flexShrink: 0,
            opacity: 0.85,
          }}
        >
          {/* Step counter pill */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            marginBottom: 7,
          }}>
            <div style={{
              fontSize: "9px",
              fontWeight: 700,
              color: "#F59E0B",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}>
              Step {step.id} of 11
            </div>
            {/* mini progress track */}
            <div style={{
              width: 36,
              height: 3,
              background: "#2A2A2A",
              borderRadius: 99,
              overflow: "hidden",
            }}>
              <div style={{
                width: `${(step.id / 11) * 100}%`,
                height: "100%",
                background: "#D97706",
                borderRadius: 99,
                transition: "width 400ms cubic-bezier(0.4,0,0.2,1)",
              }} />
            </div>
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "#fff",
              lineHeight: 1.55,
              ...(step.twoPhase === true && guideNinePhase === 2 ? { animation: "fabFadeIn 0.3s ease" } : {}),
            }}
          >
            {bodyText}
          </div>
          {/* ── Step 8: ATS micro-flow ─────────────────────────────────── */}
          {step.id === 8 ? (
            <div style={{ marginTop: 10 }}>
              {/* Phase: idle — two entry buttons */}
              {step8Phase === "idle" && (
                <>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    {/* See my score — amber, fires local databank scan */}
                    <button
                      type="button"
                      onClick={handleStep8FreeScan}
                      style={{
                        background: "#D97706",
                        color: "#000",
                        border: "none",
                        borderRadius: 8,
                        padding: "6px 14px",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        minHeight: 32,
                      }}
                    >
                      See my score
                    </button>
                    {/* Run Pro ATS — shimmer, shows JD input */}
                    <button
                      type="button"
                      onClick={() => setStep8Phase("pro-jd")}
                      style={{
                        background: "transparent",
                        color: "#fff",
                        borderRadius: 8,
                        padding: "6px 14px",
                        fontSize: 11,
                        fontWeight: 600,
                        cursor: "pointer",
                        fontFamily: "inherit",
                        position: "relative",
                        overflow: "hidden",
                        border: "none",
                        minHeight: 32,
                      }}
                    >
                      <span
                        style={{
                          position: "absolute",
                          inset: 0,
                          borderRadius: 8,
                          padding: "1px",
                          background: "linear-gradient(90deg,#2A2A2A,#fff,#2A2A2A)",
                          WebkitMask: "linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0)",
                          WebkitMaskComposite: "xor",
                          backgroundSize: "200% 100%",
                          animation: "fabShimmerBorder 2s linear infinite",
                        }}
                      />
                      Run Pro ATS
                    </button>
                  </div>
                  {guideStep > 0 && (
                    <button
                      type="button"
                      onClick={retreatGuideStep}
                      style={{ background: "none", border: "none", color: "#606060", fontSize: 10, cursor: "pointer", fontFamily: "inherit", padding: "4px 0", marginTop: 4, display: "block" }}
                    >
                      ← Back
                    </button>
                  )}
                </>
              )}

              {/* Phase: scanning — 4 sequential steps */}
              {step8Phase === "scanning" && (
                <div style={{ paddingTop: 4 }}>
                  {["Extracting your CV...", "Running GCC market data...", "Matching keywords...", "Computing score..."].map((label, i) => (
                    <div
                      key={label}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 7,
                        marginBottom: 7,
                        opacity: 0,
                        animation: `step8StepIn 0.35s cubic-bezier(0.4,0,0.2,1) ${i * 400}ms forwards`,
                      }}
                    >
                      <div
                        style={{
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          background: "rgba(217,119,6,0.15)",
                          border: "1px solid rgba(217,119,6,0.5)",
                          display: "grid",
                          placeItems: "center",
                          flexShrink: 0,
                        }}
                      >
                        <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#D97706" }} />
                      </div>
                      <span style={{ fontSize: 10, color: "#A0A0A0", lineHeight: 1.3 }}>{label}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Phase: scored — score reveal + upsell */}
              {step8Phase === "scored" && step8Result && (() => {
                const { score, visibilityBoosters, rankTriggers, industry } = step8Result;
                const r = 22;
                const circ = 2 * Math.PI * r;
                const offset = circ * (1 - score / 100);
                const scoreColor = score >= 80 ? "#22C55E" : score >= 60 ? "#D97706" : "#EF4444";
                const headline = score >= 80 ? "Strong foundation." : score >= 60 ? "Getting there." : "Room to grow.";
                return (
                  <div style={{ animation: "fabFadeIn 0.4s cubic-bezier(0.4,0,0.2,1)" }}>
                    {/* Score ring row + download icon */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                      <div style={{ position: "relative", width: 52, height: 52, flexShrink: 0 }}>
                        <svg width={52} height={52} viewBox="0 0 52 52" aria-hidden style={{ display: "block" }}>
                          <circle cx={26} cy={26} r={r} fill="none" stroke="#1A1A1A" strokeWidth={5} />
                          <circle
                            cx={26} cy={26} r={r} fill="none"
                            stroke={scoreColor} strokeWidth={5}
                            strokeLinecap="round"
                            strokeDasharray={circ}
                            strokeDashoffset={offset}
                            transform="rotate(-90 26 26)"
                            style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)" }}
                          />
                        </svg>
                        <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", fontSize: 13, fontWeight: 700, color: scoreColor }}>
                          {score}
                        </div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", lineHeight: 1.3 }}>{headline}</div>
                        <div style={{ fontSize: 10, color: "#A0A0A0", marginTop: 2 }}>{industry}</div>
                      </div>
                      {/* Download icon button */}
                      <button
                        type="button"
                        onClick={() => onGuidedDownload?.()}
                        style={{
                          width: 32, height: 32, flexShrink: 0,
                          background: "rgba(217,119,6,0.1)",
                          border: "1px solid rgba(217,119,6,0.3)",
                          borderRadius: 8,
                          display: "grid", placeItems: "center",
                          cursor: "pointer", padding: 0,
                        }}
                        aria-label="Download CV"
                      >
                        <svg width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden>
                          <line x1="8" y1="2" x2="8" y2="10.5" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
                          <polyline points="4.5,8 8,11.5 11.5,8" fill="none" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          <line x1="3" y1="14" x2="13" y2="14" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      </button>
                    </div>

                    {/* Visibility Boosters */}
                    {visibilityBoosters.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: "#4ADE80", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 5 }}>
                          ✦ Found in your CV
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {visibilityBoosters.slice(0, 3).map((kw, i) => (
                            <span
                              key={kw}
                              style={{
                                fontSize: 10, padding: "3px 8px", borderRadius: 999,
                                background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.3)", color: "#4ADE80",
                                opacity: 0,
                                animation: `step8ChipIn 0.3s ease ${i * 80}ms forwards`,
                              }}
                            >{kw}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Rank Triggers */}
                    {rankTriggers.length > 0 && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: "#D97706", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 5 }}>
                          ⊕ Add these to rank higher
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {rankTriggers.slice(0, 3).map((kw, i) => (
                            <span
                              key={kw}
                              style={{
                                fontSize: 10, padding: "3px 8px", borderRadius: 999,
                                background: "rgba(217,119,6,0.1)", border: "1px solid rgba(217,119,6,0.3)", color: "#D97706",
                                opacity: 0,
                                animation: `step8ChipIn 0.3s ease ${(visibilityBoosters.length + i) * 80}ms forwards`,
                              }}
                            >{kw}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* CTAs: Unlock Pro ATS (amber) + Next: Job Match (outlined) */}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                      <button
                        type="button"
                        onClick={() => {
                          if (isPro) setStep8Phase("pro-jd");
                          else window.open(getPaymentLink("ats"), "_blank");
                        }}
                        style={{
                          background: "#D97706",
                          color: "#000",
                          border: "none",
                          borderRadius: 8,
                          padding: "6px 14px",
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: "pointer",
                          fontFamily: "inherit",
                          minHeight: 32,
                        }}
                      >
                        {isPro ? "Run Pro ATS →" : "Unlock Pro ATS →"}
                      </button>
                      <button
                        type="button"
                        onClick={advanceGuideStep}
                        style={{
                          background: "transparent",
                          color: "#D97706",
                          border: "1.5px solid #D97706",
                          borderRadius: 8,
                          padding: "6px 14px",
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: "pointer",
                          fontFamily: "inherit",
                          minHeight: 32,
                        }}
                      >
                        Next: Job Match →
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* Phase: pro-jd — job description input */}
              {step8Phase === "pro-jd" && (
                <div style={{ animation: "fabFadeIn 0.3s cubic-bezier(0.4,0,0.2,1)" }}>
                  <p style={{ margin: "0 0 8px", fontSize: 10, color: "#A0A0A0", lineHeight: 1.5 }}>
                    Paste the job description — I'll map every keyword against your CV.
                  </p>
                  <textarea
                    value={step8Jd}
                    onChange={(e) => setStep8Jd(e.target.value)}
                    placeholder="Paste job description here..."
                    rows={4}
                    style={{
                      width: "100%",
                      fontSize: 16,
                      fontFamily: "inherit",
                      background: "#141414",
                      border: "1px solid #2A2A2A",
                      borderRadius: 8,
                      color: "#fff",
                      padding: "8px 10px",
                      resize: "none",
                      outline: "none",
                      boxSizing: "border-box",
                      lineHeight: 1.45,
                      caretColor: "#D97706",
                    }}
                    onFocus={(e) => { e.target.style.borderColor = "#D97706"; }}
                    onBlur={(e) => { e.target.style.borderColor = "#2A2A2A"; }}
                  />
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button
                      type="button"
                      onClick={() => {
                        if (!step8Jd.trim()) return;
                        if (isPro) {
                          onFabProScan?.(step8Jd);
                          advanceGuideStep();
                        } else {
                          window.open(getPaymentLink("ats"), "_blank");
                        }
                      }}
                      style={{
                        flex: 1,
                        background: step8Jd.trim() ? "#D97706" : "#2A2A2A",
                        color: step8Jd.trim() ? "#000" : "#606060",
                        border: "none",
                        borderRadius: 8,
                        padding: "7px 14px",
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: step8Jd.trim() ? "pointer" : "not-allowed",
                        fontFamily: "inherit",
                        minHeight: 32,
                        transition: "background 200ms cubic-bezier(0.4,0,0.2,1), color 200ms cubic-bezier(0.4,0,0.2,1)",
                      }}
                    >
                      {isPro ? "Analyze now →" : "Unlock Pro →"}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setStep8Phase(step8Result ? "scored" : "idle")}
                    style={{ background: "none", border: "none", color: "#606060", fontSize: 10, cursor: "pointer", fontFamily: "inherit", padding: "4px 0", marginTop: 4, display: "block" }}
                  >
                    ← Back
                  </button>
                </div>
              )}
            </div>
          ) : step.id === 9 ? (
            /* ── Step 9: Job Match — zero CTAs in idle/typing, CTAs only in result ── */
            <div style={{ marginTop: 10 }}>
              {step9Phase === "idle" && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {guideStep > 0 && (
                    <button type="button" onClick={retreatGuideStep}
                      style={{ background: "none", border: "none", color: "#606060", fontSize: 10, cursor: "pointer", fontFamily: "inherit", padding: "4px 0" }}>
                      ← Back
                    </button>
                  )}
                </div>
              )}
              {step9Phase === "typing" && null}
              {step9Phase === "result" && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", animation: "fabFadeIn 0.3s ease" }}>
                  <button type="button"
                    onClick={() => {
                      if (!isPro) window.open(getPaymentLink("activeHunter"), "_blank");
                    }}
                    style={{
                      background: "#D97706", color: "#000", border: "none", borderRadius: 8,
                      padding: "6px 14px", fontSize: 11, fontWeight: 700,
                      cursor: "pointer", fontFamily: "inherit", minHeight: 32,
                    }}>
                    Unlock Job Match →
                  </button>
                  <button type="button" onClick={advanceGuideStep}
                    style={{
                      background: "transparent", color: "#D97706",
                      border: "1.5px solid #D97706", borderRadius: 8,
                      padding: "6px 14px", fontSize: 11, fontWeight: 600,
                      cursor: "pointer", fontFamily: "inherit", minHeight: 32,
                    }}>
                    Next: Cover Letter →
                  </button>
                </div>
              )}
            </div>
          ) : step.id === 10 && !hideFabGuideButtons ? (
            /* ── Step 10: Cover Letter pitch — Ziina payment CTAs ── */
            <div
              style={{
                display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap", alignItems: "center",
                ...(step.twoPhase === true && guideNinePhase === 2 ? { animation: "fabFadeIn 0.3s ease" } : {}),
              }}
            >
              <button type="button"
                onClick={() => window.open(getPaymentLink("coverLetter"), "_blank")}
                style={{
                  background: "#D97706", color: "#000", border: "none", borderRadius: 8,
                  padding: "6px 14px", fontSize: 11, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit", minHeight: 32,
                }}>
                Get Cover Letter — AED 10
              </button>
              <button type="button"
                onClick={() => window.open(getPaymentLink("activeHunter"), "_blank")}
                style={{
                  background: "transparent", color: "#fff", borderRadius: 8,
                  padding: "6px 14px", fontSize: 11, fontWeight: 600,
                  cursor: "pointer", fontFamily: "inherit",
                  position: "relative", overflow: "hidden", border: "none", minHeight: 32,
                }}>
                <span style={{
                  position: "absolute", inset: 0, borderRadius: 8, padding: "1px",
                  background: "linear-gradient(90deg,#2A2A2A,#fff,#2A2A2A)",
                  WebkitMask: "linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0)",
                  WebkitMaskComposite: "xor",
                  backgroundSize: "200% 100%",
                  animation: "fabShimmerBorder 2s linear infinite",
                }} />
                Unlock Everything — AED 29/mo
              </button>
              <button type="button" onClick={advanceGuideStep}
                style={{
                  background: "none", border: "none", color: "#606060",
                  fontSize: 10, cursor: "pointer", fontFamily: "inherit", padding: "4px 6px",
                }}>
                Skip → Download my CV
              </button>
            </div>
          ) : step.id === 11 ? (
            /* ── Step 11: Download — finishGuide on either CTA ── */
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10, alignItems: "center" }}>
              <button type="button"
                onClick={() => {
                  onGuidedDownload?.();
                  localStorage.setItem('hasCompletedGuide', 'true');
                  advanceGuideStep();
                }}
                style={{
                  background: "#D97706", color: "#000", border: "none", borderRadius: 8,
                  padding: "6px 14px", fontSize: 11, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit", minHeight: 32,
                }}>
                Download CV ↓
              </button>
              <button type="button"
                onClick={() => {
                  localStorage.setItem('hasCompletedGuide', 'true');
                  advanceGuideStep();
                }}
                style={{
                  background: "none", border: "none", color: "#606060",
                  fontSize: 10, cursor: "pointer", fontFamily: "inherit", padding: "4px 6px",
                }}>
                Skip
              </button>
            </div>
          ) : !hideFabGuideButtons ? (
            /* ── All other steps — standard buttons ────────────────────── */
            <div
              style={{
                display: "flex",
                gap: "8px",
                marginTop: "10px",
                flexWrap: "wrap",
                alignItems: "center",
                ...(step.twoPhase === true && guideNinePhase === 2 ? { animation: "fabFadeIn 0.3s ease" } : {}),
              }}
            >
              {step.btns.map((btn, i) =>
                btn.style === "skip" ? (
                  <button
                    key={i}
                    type="button"
                    onClick={advanceGuideStep}
                    style={{
                      background: "none",
                      border: "none",
                      color: "#606060",
                      fontSize: "10px",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      padding: "4px 6px",
                    }}
                  >
                    {btn.label}
                  </button>
                ) : btn.style === "shimmer" ? (
                  <button
                    key={i}
                    type="button"
                    onClick={advanceGuideStep}
                    style={{
                      background: "transparent",
                      color: "#fff",
                      borderRadius: "8px",
                      padding: "6px 14px",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      position: "relative",
                      overflow: "hidden",
                      border: "none",
                    }}
                  >
                    <span
                      style={{
                        position: "absolute",
                        inset: 0,
                        borderRadius: "8px",
                        padding: "1px",
                        background: "linear-gradient(90deg,#2A2A2A,#fff,#2A2A2A)",
                        WebkitMask: "linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0)",
                        WebkitMaskComposite: "xor",
                        backgroundSize: "200% 100%",
                        animation: "fabShimmerBorder 2s linear infinite",
                      }}
                    />
                    {btn.label}
                  </button>
                ) : btn.style === "outlined" ? (
                  <button
                    key={i}
                    type="button"
                    onClick={advanceGuideStep}
                    style={{
                      background: "transparent",
                      color: "#D97706",
                      border: "1.5px solid #D97706",
                      borderRadius: "8px",
                      padding: "6px 14px",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {btn.label}
                  </button>
                ) : (
                  <button
                    key={i}
                    type="button"
                    onClick={advanceGuideStep}
                    style={{
                      background: "#F59E0B",
                      color: "#000",
                      border: "none",
                      borderRadius: "8px",
                      padding: "6px 14px",
                      fontSize: "11px",
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {btn.label}
                  </button>
                )
              )}
              {guideStep > 0 && (
                <button
                  type="button"
                  onClick={retreatGuideStep}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#606060",
                    fontSize: "10px",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    padding: "4px 6px",
                    marginLeft: "auto",
                  }}
                >
                  ← Back
                </button>
              )}
            </div>
          ) : null}
        </div>
        {/* Arrow tail — points right, connecting bubble to FAB */}
        <div style={{
          alignSelf: "flex-end",
          marginBottom: 14,
          width: 0,
          height: 0,
          borderTop: "6px solid transparent",
          borderBottom: "6px solid transparent",
          borderLeft: "7px solid rgba(255,255,255,0.12)",
          flexShrink: 0,
        }} />
      </div>
    );
  }

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

  const handlePro = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (tabStorageKey === "ats") writeFabSeen("ats");
    window.open(getPaymentLink("ats"), "_blank");
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
      const hasAccess = hasFeatureAccess({ is_pro: isPro, features }, 'coverLetter');
      return (
        <>
          <p style={{ margin: "0 0 12px", fontSize: 14, color: "var(--text-secondary, #A0A0A0)", lineHeight: 1.45, textAlign: "center" }}>
            AED 10 for a personalised cover letter that matches your CV. Most hiring managers expect one.
          </p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (!hasAccess) {
                window.open(getPaymentLink("coverLetter"), "_blank");
                return;
              }
            }}
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
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            window.open(getPaymentLink("activeHunter"), "_blank");
          }}
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

          {isCelebrating ? (
            <div
              style={{
                width: "100%",
                marginBottom: 16,
                padding: 14,
                boxSizing: "border-box",
                borderRadius: 12,
                background: "#1C1C1C",
                border: "1px solid #F59E0B",
                textAlign: "center",
                animation: "fabFadeIn 0.3s ease",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#F59E0B",
                  lineHeight: 1.45,
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              >
                Payment confirmed! Generating your Cover Letter now...
              </p>
            </div>
          ) : null}

          {isCelebratingExpress ? (
            <div
              style={{
                width: "100%",
                marginBottom: 16,
                padding: 14,
                boxSizing: "border-box",
                borderRadius: 12,
                background: "#1C1C1C",
                border: "1px solid #F59E0B",
                textAlign: "center",
                animation: "fabFadeIn 0.3s ease",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#F59E0B",
                  lineHeight: 1.45,
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              >
                Express Pass unlocked! You can now download unlimited PDFs.
              </p>
            </div>
          ) : null}

          {isCelebratingHunter ? (
            <div
              style={{
                width: "100%",
                marginBottom: 16,
                padding: 14,
                boxSizing: "border-box",
                borderRadius: 12,
                background: "#1C1C1C",
                border: "1px solid #F59E0B",
                textAlign: "center",
                animation: "fabFadeIn 0.3s ease",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#F59E0B",
                  lineHeight: 1.45,
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              >
                Active Hunter unlocked! All features are now live.
              </p>
            </div>
          ) : null}

          {isCelebratingPro ? (
            <div
              style={{
                width: "100%",
                marginBottom: 16,
                padding: 14,
                boxSizing: "border-box",
                borderRadius: 12,
                background: "#1C1C1C",
                border: "1px solid #F59E0B",
                textAlign: "center",
                animation: "fabFadeIn 0.3s ease",
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#F59E0B",
                  lineHeight: 1.45,
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              >
                Career Pro unlocked! You're now on our best plan.
              </p>
            </div>
          ) : null}

          {sheetBodySlot ? <div style={{ width: "100%", marginBottom: 16 }}>{sheetBodySlot}</div> : null}

          {dedicatedRoute === "ats" && !showBuilderGuidedCoach ? (
            <div style={{ width: "100%", marginBottom: 16 }}>
              {/* ATS Scan Trigger — FAB primary path */}
              {(onFabFreeScan || onFabProScan) ? (
                <div
                  style={{
                    padding: 14,
                    boxSizing: "border-box",
                    borderRadius: 12,
                    background: "var(--bg-elevated, #1C1C1C)",
                    border: "1px solid var(--border-default, #2A2A2A)",
                    marginBottom: 12,
                  }}
                >
                  <textarea
                    value={fabAtsJd}
                    onChange={(e) => setFabAtsJd(e.target.value)}
                    placeholder="Paste job description for deeper analysis..."
                    rows={3}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      background: "#141414",
                      border: "1px solid #2A2A2A",
                      borderRadius: 16,
                      padding: "12px 14px",
                      color: "#fff",
                      fontSize: 14,
                      fontFamily: "inherit",
                      resize: "none",
                      lineHeight: 1.45,
                      marginBottom: 10,
                      display: "block",
                    }}
                    onFocus={(e) => { e.target.style.borderColor = "rgba(245,158,11,0.35)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "#2A2A2A"; }}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    {onFabFreeScan ? (
                      <button
                        type="button"
                        onClick={() => { onFabFreeScan(fabAtsJd); onClose(); }}
                        style={{
                          flex: 1,
                          background: "#D97706",
                          color: "#000",
                          border: "none",
                          borderRadius: 10,
                          padding: "12px 8px",
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: "pointer",
                          fontFamily: "inherit",
                          minHeight: 44,
                        }}
                      >
                        Free Scan
                      </button>
                    ) : null}
                    {onFabProScan ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (!isPro) {
                            navigate("/pricing");
                            onClose();
                            return;
                          }
                          if (!fabAtsJd.trim()) return;
                          onFabProScan(fabAtsJd);
                          onClose();
                        }}
                        style={{
                          flex: 1,
                          background: "transparent",
                          color: isPro ? "#D97706" : "#A0A0A0",
                          border: `1px solid ${isPro ? "#D97706" : "#2A2A2A"}`,
                          borderRadius: 10,
                          padding: "12px 8px",
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: "pointer",
                          fontFamily: "inherit",
                          minHeight: 44,
                          opacity: !isPro || !fabAtsJd.trim() ? 0.7 : 1,
                        }}
                        title={!isPro ? "Upgrade to Pro" : !fabAtsJd.trim() ? "Add a job description first" : undefined}
                      >
                        {isPro ? "Pro Analysis" : "Pro ✦"}
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {/* ATS Score block — shows after scan has results */}
              {currentAts > 0 ? (
                <div
                  style={{
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
              ) : !onFabFreeScan && !onFabProScan ? (
                <div
                  style={{
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
                currentQuestionIndex={Math.min(10, guidedStep)}
                currentFieldId={
                  guidedPendingConfirm?.fieldId ??
                  QUESTIONS[Math.min(Math.max(0, guidedStep), QUESTIONS.length - 1)]?.id
                }
                messages={guidedMessages}
                progressPercent={guidedProgress}
                inputValue={guidedInput}
                onInputChange={handleGuidedInputChange}
                onSend={handleGuidedSend}
                onSkip={handleGuidedSkip}
                onExit={handleGuidedExit}
                onCtaClick={handleGuidedCtaClick}
                onSelectSummary={handleSelectSummary}
                onSkipSummary={handleSkipSummary}
                onSelectBullet={handleSelectBullet}
                onNudgeSelect={handleNudgeSelect}
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
