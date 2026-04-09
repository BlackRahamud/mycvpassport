import { useEffect, useMemo, useRef, useState } from "react";
import { validateAnswer, getHintForQuestion, getMaxRetriesForField } from "./FABLogic";

/**
 * GuidedFlow — chat-style CV onboarding coach, lives inside FABSheet.
 *
 * Controlled props (all optional — internal sample data runs by default):
 *   messages           Array<{ id, role:'assistant'|'user', text, ctaBtn?, ctaStyle?:'white'|'outline', ctaId?, score?, complete?, type?, options?, summaryOptions? }>
 *   progressPercent    0–100
 *   inputValue         string (controlled)
 *   onInputChange      (e) => void
 *   onSend             () => void
 *   onSkip             () => void
 *   onExit             () => void
 *   onCtaClick         (ctaId: string) => void
 *   onSelectSummary    (text: string) => void
 *   onSkipSummary      () => void
 *   onSelectBullet     (text: string) => void  — called when user picks a bullet_options tone card
 *   onNudgeSelect      (value: string) => void — called when user taps a nudge_buttons chip
 *   showInput          boolean
 *   inputPlaceholder   string
 *   isTyping           boolean
 *   useSampleData      boolean  — set false to disable internal demo state
 */

const T = {
  bg:      "#0A0A0A",
  surface: "#141414",
  raised:  "#1C1C1C",
  border:  "#2A2A2A",
  border2: "#3A3A3A",
  text:    "#FFFFFF",
  mid:     "#A0A0A0",
  dim:     "#606060",
  mute:    "#484848",
  amber:   "#D97706",
  green:   "#22C55E",
  red:     "#EF4444",
};

/* ─── Ghost typing utility ──────────────────────────────────────────── */

function ghostType(fullText, onChar, onDone, delayMs = 28) {
  let i = 0;
  function step() {
    if (i <= fullText.length) {
      onChar(fullText.slice(0, i));
      i++;
      setTimeout(step, delayMs);
    } else {
      if (onDone) onDone();
    }
  }
  step();
}

/* ─── Sample conversation (Stage 1 + Stage 2) ──────────────────────── */

const SAMPLE_MESSAGES = [
  {
    id: "a1", role: "assistant",
    text: "Hi! I'm your CV guide. I'll help you build a job-ready CV in under 5 minutes.\n\nLet's start — what's your full name?",
  },
  { id: "u1", role: "user", text: "Sara Al Mansouri" },
  {
    id: "a2", role: "assistant",
    text: "Great to meet you, Sara.\n\nWhat is your current job title?",
  },
  { id: "u2", role: "user", text: "Senior Product Designer" },
  {
    id: "a3", role: "assistant",
    text: "And what city are you based in? Are you open to relocation?",
  },
];

const SAMPLE_FOLLOW_UPS = [
  "Perfect. Let's add your most recent work experience.\n\nCompany name?",
  "Your role there?",
  "Start date → end date (or \"Present\")?",
  "Add 2–3 bullet points — what did you achieve in that role?",
  "Strong results. Skills next — list your top 5 (comma-separated).",
  "Almost done. Write a 2–3 line summary. Start with your title and years of experience.",
  {
    text: "Your CV is ready. Now let's make it look the part.",
    ctaBtn: "Choose Your Template →",
    ctaStyle: "white",
    ctaId: "choose-template",
  },
];

/* ─── Sub-components ───────────────────────────────────────────────── */

function SendIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" aria-hidden style={{ display: "block" }}>
      <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AtsRing({ score }) {
  const r = 20;
  const circ = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, score));
  const offset = circ - (p / 100) * circ;
  const col = p >= 85 ? T.green : p >= 60 ? T.amber : T.red;
  return (
    <div style={{ position: "relative", width: 48, height: 48, flexShrink: 0 }}>
      <svg width={48} height={48} viewBox="0 0 48 48" aria-hidden style={{ display: "block" }}>
        <circle cx={24} cy={24} r={r} fill="none" stroke={T.border} strokeWidth={4} />
        <circle
          cx={24} cy={24} r={r} fill="none"
          stroke={col} strokeWidth={4}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 24 24)"
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0, display: "grid",
        placeItems: "center", fontSize: 12, fontWeight: 500, color: col,
      }}>
        {p}
      </div>
    </div>
  );
}

/**
 * AmberTypingDots — 3 pulsing amber dots shown while ghost-typing is active.
 */
function AmberTypingDots() {
  return (
    <>
      <style>{`
        @keyframes gfAmberDot {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
      <div style={{ display: "inline-flex", gap: 4, alignItems: "center", padding: "4px 0" }}>
        {[0, 150, 300].map((delay, i) => (
          <span
            key={i}
            style={{
              display: "block",
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "#D97706",
              animation: `gfAmberDot 900ms ease-in-out infinite`,
              animationDelay: `${delay}ms`,
            }}
          />
        ))}
      </div>
    </>
  );
}

/**
 * BulletOptionsCards — renders 3 tone cards for the experience[0].bullets step.
 * Tapping a card ghost-types the text, then calls onSelectBullet(text).
 */
function BulletOptionsCards({ options, onSelectBullet }) {
  const [typing, setTyping] = useState(null);

  if (!Array.isArray(options) || options.length === 0) return null;

  const isAnyTyping = typing !== null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12, width: "100%" }}>
      {options.map((opt, i) => {
        const isThisTyping = typing === opt.tone;
        return (
          <button
            key={i}
            type="button"
            disabled={isAnyTyping}
            onClick={() => {
              if (isAnyTyping) return;
              setTyping(opt.tone);
              ghostType(
                opt.text,
                () => {},
                () => {
                  onSelectBullet?.(opt.text);
                  setTyping(null);
                },
                28
              );
            }}
            style={{
              display: "block",
              width: "100%",
              background: "#141414",
              border: "1px solid #2A2A2A",
              borderRadius: 12,
              padding: 12,
              cursor: isAnyTyping ? "not-allowed" : "pointer",
              textAlign: "left",
              fontFamily: "inherit",
              WebkitTapHighlightColor: "transparent",
              opacity: isAnyTyping && !isThisTyping ? 0.5 : 1,
              transition: "opacity 200ms ease",
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "#D97706",
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              {opt.tone}
            </div>
            {isThisTyping ? (
              <AmberTypingDots />
            ) : (
              <div
                style={{
                  fontSize: 13,
                  color: "#FFFFFF",
                  lineHeight: 1.5,
                  wordBreak: "break-word",
                  whiteSpace: "pre-wrap",
                }}
              >
                {opt.text}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

/**
 * NudgeButtonsGroup — renders tap chips for message type === "nudge_buttons".
 */
function NudgeButtonsGroup({ options, onNudgeSelect }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!Array.isArray(options) || options.length === 0) return null;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
      {options.map((opt, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onNudgeSelect?.(opt.value)}
          onMouseEnter={() => setHoveredIdx(i)}
          onMouseLeave={() => setHoveredIdx(null)}
          style={{
            background: "#1C1C1C",
            border: `1px solid ${hoveredIdx === i ? "#D97706" : "#2A2A2A"}`,
            borderRadius: 20,
            padding: "8px 16px",
            color: "#FFFFFF",
            fontSize: 13,
            cursor: "pointer",
            fontFamily: "inherit",
            lineHeight: 1.3,
            transition: "border-color 150ms ease",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          {opt.label ?? opt.value}
        </button>
      ))}
    </div>
  );
}

function AssistantBubble({ message, onCtaClick, onSelectSummary, onSkipSummary, onSelectBullet, onNudgeSelect }) {
  const hasCta = Boolean(message.ctaBtn);
  const hasSummaryOptions = Array.isArray(message.summaryOptions) && message.summaryOptions.length > 0;
  const hasBulletOptions = message.type === "bullet_options" && Array.isArray(message.options) && message.options.length > 0;
  const hasNudgeButtons = message.type === "nudge_buttons" && Array.isArray(message.options) && message.options.length > 0;
  const wideContent = hasCta || hasSummaryOptions || hasBulletOptions || hasNudgeButtons;

  return (
    <div style={{
      display: "flex", justifyContent: "flex-start",
      paddingRight: wideContent ? "4%" : "18%",
    }}>
      <div style={{
        width: 6, height: 6, borderRadius: "50%", background: T.amber,
        flexShrink: 0, marginTop: 13, marginRight: 8, alignSelf: "flex-start",
      }} />
      <div style={{
        background: T.raised,
        border: `1px solid ${T.border}`,
        borderRadius: "16px 16px 16px 4px",
        padding: wideContent ? 14 : "11px 14px",
        fontSize: 14, color: T.text, lineHeight: 1.55,
        wordBreak: "break-word", whiteSpace: "pre-wrap",
        width: wideContent ? "100%" : undefined,
      }}>
        {message.score != null && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <AtsRing score={message.score} />
            <span style={{ fontSize: 12, color: T.mid, lineHeight: 1.35 }}>
              {message.score >= 85
                ? "ATS gate: cleared."
                : message.score >= 60
                  ? "Good start — a few gaps to fix."
                  : "Below the ATS cutoff — let's fix this."}
            </span>
          </div>
        )}

        {message.text}

        {/* ── bullet_options: 3 tone cards with ghost typing ── */}
        {hasBulletOptions && (
          <BulletOptionsCards
            options={message.options}
            onSelectBullet={onSelectBullet}
          />
        )}

        {/* ── nudge_buttons: tap chips ── */}
        {hasNudgeButtons && (
          <NudgeButtonsGroup
            options={message.options}
            onNudgeSelect={onNudgeSelect}
          />
        )}

        {/* ── summary options ── */}
        {hasSummaryOptions && (
          <>
            {message.summaryOptions.map((text, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSelectSummary?.(text)}
                style={{
                  display: "block",
                  width: "100%",
                  background: "#1A1A1C",
                  border: "1px solid #333",
                  borderRadius: "12px",
                  padding: "14px",
                  marginBottom: "10px",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: "14px",
                  lineHeight: "1.5",
                  color: "#E0E0E0",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                {text}
              </button>
            ))}
            <button
              type="button"
              onClick={onSkipSummary}
              style={{
                background: "none",
                border: "none",
                color: "#666",
                fontSize: "13px",
                cursor: "pointer",
                padding: "4px 0 12px",
                textDecoration: "underline",
              }}
            >
              Skip for now →
            </button>
          </>
        )}

        {/* ── regular CTA button ── */}
        {hasCta && (
          <button
            type="button"
            onClick={() => onCtaClick?.(message.ctaId)}
            style={{
              display: "block", width: "100%",
              marginTop: 14, padding: "13px 16px",
              borderRadius: 10, fontSize: 14, fontWeight: 500,
              cursor: "pointer", fontFamily: "inherit", lineHeight: 1.3,
              border: message.ctaStyle === "outline" ? `1px solid ${T.border2}` : "none",
              background: message.ctaStyle === "outline" ? "transparent" : T.text,
              color: message.ctaStyle === "outline" ? T.text : "#000",
            }}
          >
            {message.ctaBtn}
          </button>
        )}

        {message.complete && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: T.green, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: T.dim }}>Guide complete</span>
          </div>
        )}
      </div>
    </div>
  );
}

function UserBubble({ text }) {
  return (
    <div style={{ display: "flex", justifyContent: "flex-end", paddingLeft: "18%" }}>
      <div style={{
        background: T.text,
        borderRadius: "16px 16px 4px 16px",
        padding: "11px 14px",
        fontSize: 14, color: "#000", lineHeight: 1.55,
        wordBreak: "break-word", whiteSpace: "pre-wrap",
        minWidth: 48,
      }}>
        {text}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div style={{ display: "flex", justifyContent: "flex-start", paddingRight: "18%" }}>
      <div style={{
        width: 6, height: 6, borderRadius: "50%", background: T.amber,
        flexShrink: 0, marginTop: 14, marginRight: 8, alignSelf: "flex-start", opacity: 0.4,
      }} />
      <div style={{
        background: T.raised, border: `1px solid ${T.border}`,
        borderRadius: "16px 16px 16px 4px",
        padding: "12px 16px", display: "flex", alignItems: "center", gap: 5,
      }}>
        {["0ms", "160ms", "320ms"].map((delay, i) => (
          <span key={i} style={{
            display: "block", width: 5, height: 5,
            borderRadius: "50%", background: T.dim,
            animation: "gfTyping 900ms ease-in-out infinite",
            animationDelay: delay,
          }} />
        ))}
      </div>
    </div>
  );
}

/* ─── Main component ───────────────────────────────────────────────── */

export default function GuidedFlow({
  messages:         messagesProp,
  progressPercent:  progressProp,
  inputValue:       inputValueProp,
  onInputChange,
  onSend,
  onSkip,
  onExit,
  onCtaClick,
  onSelectSummary,
  onSkipSummary,
  onSelectBullet,
  onNudgeSelect,
  showInput:        showInputProp,
  inputPlaceholder: placeholderProp,
  isTyping:         isTypingProp,
  useSampleData = true,
  /** When set (0–10), legacy index for sample/demo flows. */
  currentQuestionIndex,
  /** Guided coach field id (e.g. name, title) — `validateAnswer` uses this with FABLogic. */
  currentFieldId,
}) {
  const [sampleMsgs,     setSampleMsgs]     = useState(SAMPLE_MESSAGES);
  const [sampleProgress, setSampleProgress] = useState(35);
  const [internalInput,  setInternalInput]  = useState("");
  const [internalTyping, setInternalTyping] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [validationExtraMessages, setValidationExtraMessages] = useState([]);
  const followUpIdx = useRef(0);

  const messages = useMemo(
    () => (!useSampleData ? (messagesProp ?? []) : sampleMsgs),
    [useSampleData, messagesProp, sampleMsgs]
  );
  const mergedMessages = useMemo(
    () => [...messages, ...validationExtraMessages],
    [messages, validationExtraMessages]
  );
  const progressPercent  = !useSampleData ? (progressProp   ?? 0)     : sampleProgress;
  const inputValue       = !useSampleData ? (inputValueProp ?? "")    : internalInput;
  const isTyping         = !useSampleData ? (isTypingProp   ?? false) : internalTyping;
  const showInput        = !useSampleData ? (showInputProp  ?? true)  : true;
  const inputPlaceholder = !useSampleData ? (placeholderProp ?? "Type your answer…") : "Type your answer…";

  const scrollRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [mergedMessages, isTyping]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (showInput) setTimeout(() => inputRef.current?.focus(), 120);
  }, [showInput]);

  const handleInternalSend = () => {
    const val = internalInput.trim();
    if (!val) return;
    setSampleMsgs((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", text: val }]);
    setInternalInput("");
    setInternalTyping(true);

    setTimeout(() => {
      const raw = SAMPLE_FOLLOW_UPS[followUpIdx.current] ?? "Let's keep going.";
      followUpIdx.current += 1;
      const asmMsg = typeof raw === "string"
        ? { id: `a-${Date.now()}`, role: "assistant", text: raw }
        : { id: `a-${Date.now()}`, role: "assistant", ...raw };
      setSampleMsgs((prev) => [...prev, asmMsg]);
      setSampleProgress((p) => Math.min(100, p + 8));
      setInternalTyping(false);
    }, 900 + Math.random() * 300);
  };

  const clearControlledInput = () => {
    onInputChange?.({ target: { value: "" } });
  };

  const appendValidationPair = (userText, assistantText) => {
    const t = Date.now();
    setValidationExtraMessages((prev) => [
      ...prev,
      { id: `gf-v-u-${t}`, role: "user", text: userText },
      { id: `gf-v-a-${t}`, role: "assistant", text: assistantText },
    ]);
  };

  const handleSendAnswer = () => {
    if (useSampleData) {
      handleInternalSend();
      return;
    }
    const val = inputValue.trim();
    if (!val) return;

    const fieldId = typeof currentFieldId === "string" && currentFieldId.trim() ? currentFieldId.trim() : null;
    if (!fieldId) {
      setRetryCount(0);
      onSend?.();
      return;
    }

    const result = validateAnswer(fieldId, val);
    const maxR = getMaxRetriesForField(fieldId);

    if (!result.valid) {
      const probeText = result.message ?? "";
      if (retryCount < maxR) {
        appendValidationPair(val, probeText);
        setRetryCount((c) => c + 1);
        clearControlledInput();
        return;
      }
      appendValidationPair(val, getHintForQuestion(fieldId));
      setRetryCount(0);
      clearControlledInput();
      return;
    }

    setRetryCount(0);

    const afterSendExtras = () => {
      if (result.nudge) {
        setTimeout(() => {
          setValidationExtraMessages((prev) => [
            ...prev,
            { id: `gf-v-nudge-${Date.now()}`, role: "assistant", text: result.nudge },
          ]);
        }, 400);
      } else if (result.hookMessage) {
        setTimeout(() => {
          setValidationExtraMessages((prev) => [
            ...prev,
            { id: `gf-v-hook-${Date.now()}`, role: "assistant", text: result.hookMessage },
          ]);
        }, 400);
      }
    };

    onSend?.();
    afterSendExtras();
  };

  const handleInputChange = (e) => {
    if (useSampleData) {
      setInternalInput(e.target.value);
      e.target.style.height = "auto";
      e.target.style.height = Math.min(e.target.scrollHeight, 88) + "px";
    } else {
      onInputChange?.(e);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendAnswer();
    }
  };

  const handleCtaClick = useSampleData ? () => {} : onCtaClick;
  const sendDisabled = !inputValue.trim();
  const clamped = Math.min(100, Math.max(0, progressPercent));

  const outlinedBtn = {
    background: "transparent",
    color: T.mid,
    border: `1px solid ${T.border2}`,
    fontSize: 12,
    padding: "6px 11px",
    borderRadius: 8,
    cursor: "pointer",
    fontFamily: "inherit",
    lineHeight: 1.3,
    whiteSpace: "nowrap",
  };

  return (
    <>
      <style>{`
        @keyframes gfTyping {
          0%,60%,100%{transform:translateY(0);opacity:.4;}
          30%{transform:translateY(-4px);opacity:1;}
        }
      `}</style>

      <div style={{
        display: "flex", flexDirection: "column",
        width: "100%", height: "100%", minHeight: 0,
        background: "transparent",
      }}>

        {/* ── top bar ── */}
        <div style={{ flexShrink: 0, paddingBottom: 12 }}>
          {/* amber progress bar */}
          <div style={{
            width: "100%", height: 2, background: T.raised,
            borderRadius: 999, overflow: "hidden", marginBottom: 12,
          }}>
            <div style={{
              height: "100%", width: `${clamped}%`,
              background: T.amber, borderRadius: 999,
              transition: "width 400ms cubic-bezier(.4,0,.2,1)",
            }} />
          </div>

          {/* exit / skip row */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <button type="button" onClick={useSampleData ? undefined : onExit} style={outlinedBtn}>
              Exit Guide
            </button>
            <button type="button" onClick={useSampleData ? undefined : onSkip} style={outlinedBtn}>
              Skip, I'll do it myself →
            </button>
          </div>
        </div>

        {/* ── messages ── */}
        <div
          ref={scrollRef}
          style={{
            flex: 1, overflowY: "auto", minHeight: 0,
            display: "flex", flexDirection: "column", gap: 10,
            scrollbarWidth: "none", msOverflowStyle: "none",
          }}
        >
          {mergedMessages.map((msg) =>
            msg.role === "user"
              ? <UserBubble key={msg.id} text={msg.text} />
              : (
                <AssistantBubble
                  key={msg.id}
                  message={msg}
                  onCtaClick={handleCtaClick}
                  onSelectSummary={useSampleData ? undefined : onSelectSummary}
                  onSkipSummary={useSampleData ? undefined : onSkipSummary}
                  onSelectBullet={useSampleData ? undefined : onSelectBullet}
                  onNudgeSelect={useSampleData ? undefined : onNudgeSelect}
                />
              )
          )}
          {isTyping && <TypingIndicator />}
          <div style={{ height: 4, flexShrink: 0 }} />
        </div>

        {/* ── input bar ── */}
        {showInput && (
          <div style={{
            flexShrink: 0, paddingTop: 10,
            paddingBottom: "env(safe-area-inset-bottom, 0px)",
          }}>
            <div style={{
              display: "flex", alignItems: "flex-end", gap: 8,
              paddingTop: 8,
              borderTop: `1px solid #1A1A1A`,
            }}>
              <div style={{
                flex: 1,
                background: "#1C1C1C",
                border: "1px solid #2A2A2A",
                borderRadius: 24,
                padding: "10px 16px",
                display: "flex",
                alignItems: "center",
                minHeight: 40,
                overflow: "hidden",
              }}>
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  placeholder={inputPlaceholder}
                  rows={1}
                  style={{
                    width: "100%",
                    border: "none",
                    outline: "none",
                    WebkitAppearance: "none",
                    background: "transparent",
                    boxShadow: "none",
                    resize: "none", color: T.text, fontSize: 16,
                    lineHeight: 1.5, fontFamily: "inherit",
                    minHeight: 22, maxHeight: 88, overflowY: "auto",
                    padding: 0, caretColor: T.text,
                  }}
                />
              </div>
              <button
                type="button"
                onClick={handleSendAnswer}
                disabled={sendDisabled}
                aria-label="Send"
                style={{
                  flexShrink: 0, width: 34, height: 34,
                  borderRadius: "50%", border: "none",
                  background: sendDisabled ? T.border : "#D97706",
                  color:      sendDisabled ? T.mute  : "#000",
                  cursor: sendDisabled ? "not-allowed" : "pointer",
                  display: "grid", placeItems: "center",
                  transition: "background 150ms, color 150ms",
                  padding: 0,
                }}
              >
                <SendIcon />
              </button>
            </div>
          </div>
        )}

      </div>
    </>
  );
}
