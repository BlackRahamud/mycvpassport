/**
 * LinkedInOptimizer — /linkedin-optimizer
 *
 * 4-state machine (idle → loading → results → locked). Single OLED ring
 * whose location is keyed by state. Dubai/India toggle swaps currency,
 * copy, and ring hue. Paywall is inline on desktop, sticky sheet on mobile.
 *
 * Props the component self-manages (spec lists them as the public API):
 *   currentStep:  "idle" | "loading" | "results" | "locked"
 *   userStatus:   { isUnlocked: boolean }        // profiles.is_pro OR permissions row
 *   apiResponse:  { professional, bold, storyDriven }  // from /api/generate-linkedin-headline
 *   onOptimize:   () => void    // POSTs { headline, market } and advances state
 *   onUnlock:     () => void    // POSTs to /api/create-ziina-payment, redirects to Ziina
 */

import { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useCvpAuth } from "../useCvpAuth";

// ─── Tokens ───────────────────────────────────────────────────────────────────
const T = {
  bg:       "#0A0A0A",
  surface:  "#141414",
  elevated: "#1C1C1C",
  border:   "#2A2A2A",
  borderHi: "#3A3A3A",
  text:     "#FFFFFF",
  dim:      "#A0A0A0",
  muted:    "#6A6A6A",
  success:  "#4ADE80",
  fail:     "#F87171",
};
const EASE = "cubic-bezier(0.4,0,0.2,1)";
const FONT = "'DM Sans','Inter Tight','Segoe UI',sans-serif";
const MONO = "'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace";

// ─── Market copy ──────────────────────────────────────────────────────────────
const MARKETS = {
  dubai: {
    key: "dubai",
    label: "Dubai · GCC",
    short: "Dubai",
    currency: "AED",
    price: "49",
    placeholder: "Finance Manager | 8 Years GCC | Open to Dubai & Riyadh",
    locationTag: "Dubai, UAE",
    sampleName: "Aisha Khan",
    sampleInit: "AK",
    previewRole: "Senior Finance Manager",
    ringTint: "rgba(255,255,255,0.72)",
    pageGlow: "radial-gradient(ellipse at center, rgba(255,255,255,0.05) 0%, transparent 65%)",
    description: "Paste your current LinkedIn headline. Recruiters in Dubai see what they actually need — seniority, proof, market signal.",
    trustLocked: "SECURED BY ZIINA · NO CARD STORED",
    copy1: "Recruiter Views",
    copy2: "Search Rank",
    copy3: "Keyword Match",
    stat1: "×4.2",
    stat2: "Top 8%",
    stat3: "94/100",
  },
  india: {
    key: "india",
    label: "India · Metros",
    short: "India",
    currency: "₹",
    price: "399",
    placeholder: "Product Manager | 6 Years Fintech | Open to Bengaluru & Mumbai",
    locationTag: "Bengaluru, India",
    sampleName: "Rohan Sharma",
    sampleInit: "RS",
    previewRole: "Senior Product Manager",
    // ~10° warmer white
    ringTint: "rgba(255,247,237,0.72)",
    pageGlow: "radial-gradient(ellipse at center, rgba(255,247,237,0.06) 0%, transparent 65%)",
    description: "Paste your current LinkedIn headline. Recruiters in India see what they actually need — seniority, proof, market signal.",
    trustLocked: "SECURED BY ZIINA · NO CARD STORED",
    copy1: "Recruiter Views",
    copy2: "Search Rank",
    copy3: "Keyword Match",
    stat1: "×3.8",
    stat2: "Top 12%",
    stat3: "92/100",
  },
};

const FAILURE_CHIPS = [
  "No Role Clarity",
  "Low Keyword Density",
  "Missing Location Signal",
  "No Seniority",
  "Passive Voice",
];

const STYLE_DEFS = [
  { key: "professional", label: "Professional", hint: "Clean · Corporate voice" },
  { key: "bold",         label: "Bold",         hint: "Assertive · Outcome-led" },
  { key: "storyDriven",  label: "Story-driven", hint: "Human · Mission-led" },
];

// ─── Keyframes (reused from ATSChecker) ───────────────────────────────────────
const KEYFRAMES = `
@property --lio-angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
@keyframes lio-spin-border { to { --lio-angle: 360deg; } }
@keyframes lio-pulse-soft {
  0%, 100% { opacity: 0.65; }
  50%      { opacity: 1; }
}
@keyframes lio-chip-float {
  0%   { transform: translate3d(0, 0, 0) rotate(0); opacity: 1; }
  100% { transform: translate3d(0, -120px, 0) rotate(-6deg); opacity: 0; }
}
@keyframes lio-char-jitter {
  0%, 100% { transform: translate3d(0, 0, 0); opacity: 1; }
  40%      { transform: translate3d(var(--jx, 0), var(--jy, 0), 0); opacity: 0.55; }
  80%      { transform: translate3d(calc(var(--jx, 0) * -0.6), calc(var(--jy, 0) * -0.4), 0); opacity: 0.3; }
}
@keyframes lio-sheet-rise {
  from { transform: translate3d(0, 100%, 0); }
  to   { transform: translate3d(0, 0, 0); }
}
@keyframes lio-fade-up {
  from { opacity: 0; transform: translate3d(0, 8px, 0); }
  to   { opacity: 1; transform: translate3d(0, 0, 0); }
}
@keyframes lio-price-pulse {
  0%, 100% { text-shadow: 0 0 14px rgba(255,255,255,0.25); }
  50%      { text-shadow: 0 0 26px rgba(255,255,255,0.55); }
}
.lio-mono { font-family: ${MONO}; letter-spacing: 0.16em; text-transform: uppercase; }
.lio-container { width: 100%; max-width: 1180px; margin: 0 auto; padding: 0 24px; box-sizing: border-box; }
.lio-grid-results { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, 1fr); gap: 28px; align-items: start; }
.lio-grid-locked  { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr); gap: 28px; align-items: start; }
.lio-style-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
@media (max-width: 960px) {
  .lio-container { padding: 0 16px; }
  .lio-grid-results, .lio-grid-locked { grid-template-columns: 1fr; gap: 18px; }
}
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
// OLED spinning conic ring that wraps any element. Single reusable pattern —
// the visible "single ring" is achieved by rendering only one active instance.
function OledRing({ intensity = "low", color, active = true, radius = 14, inset = -2, children }) {
  const duration = intensity === "high" ? "1.4s" : "3s";
  const transparentTo = intensity === "high" ? 55 : 65;
  const solidTo = intensity === "high" ? 82 : 80;
  return (
    <span style={{ position: "relative", display: "inline-flex", borderRadius: radius }}>
      {active && (
        <span
          aria-hidden
          style={{
            position: "absolute",
            inset,
            borderRadius: radius,
            padding: 1.5,
            background: `conic-gradient(from var(--lio-angle, 0deg), transparent ${transparentTo}%, ${color} ${solidTo}%, transparent 100%)`,
            WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
            pointerEvents: "none",
            animation: `lio-spin-border ${duration} linear infinite`,
            willChange: "transform",
          }}
        />
      )}
      {children}
    </span>
  );
}

// Big circular ring for the loading "deconstructor canvas."
function RingCanvas({ color, intensity = "high", size = 220 }) {
  return (
    <div style={{ position: "relative", width: size, height: size, filter: "drop-shadow(0 0 18px rgba(255,255,255,0.18))" }}>
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          padding: 2,
          background: `conic-gradient(from var(--lio-angle, 0deg), transparent 55%, ${color} 82%, transparent 100%)`,
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          pointerEvents: "none",
          animation: `lio-spin-border ${intensity === "high" ? "1.4s" : "3s"} linear infinite`,
          willChange: "transform",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 14,
          borderRadius: "50%",
          background: T.bg,
          border: `1px solid ${T.border}`,
        }}
      />
    </div>
  );
}

// ─── IDLE ─────────────────────────────────────────────────────────────────────
function IdleView({ market, headline, setHeadline, onOptimize, canOptimize, errorMsg }) {
  const m = MARKETS[market];
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 28, paddingTop: 40, paddingBottom: 80 }}>
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="lio-mono" style={{ color: T.muted, fontSize: 11 }}>LINKEDIN HEADLINE OPTIMIZER</div>
        <h1 style={{
          margin: 0,
          fontSize: "clamp(34px, 5.4vw, 56px)",
          fontFamily: FONT,
          fontWeight: 700,
          letterSpacing: -1.5,
          lineHeight: 1.05,
          color: T.text,
          WebkitFontSmoothing: "antialiased",
        }}>
          Stop being invisible to recruiters.
        </h1>
        <p style={{ margin: 0, color: T.dim, fontSize: 16, lineHeight: 1.55, maxWidth: 620, alignSelf: "center" }}>
          {m.description}
        </p>
      </div>

      <div style={{ position: "relative", background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ position: "relative" }}>
          <textarea
            value={headline}
            onChange={(e) => setHeadline(e.target.value.slice(0, 220))}
            placeholder={m.placeholder}
            rows={3}
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: T.bg,
              color: T.text,
              border: `1px solid ${T.border}`,
              borderRadius: 12,
              padding: "16px 18px",
              fontSize: 16,
              fontFamily: FONT,
              lineHeight: 1.55,
              resize: "vertical",
              outline: "none",
              minHeight: 84,
              WebkitFontSmoothing: "antialiased",
              transition: `border-color 0.18s ${EASE}`,
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = T.borderHi)}
            onBlur={(e) => (e.currentTarget.style.borderColor = T.border)}
          />
          <div style={{ position: "absolute", bottom: 8, right: 12, fontSize: 11, color: T.muted, fontFamily: MONO, letterSpacing: 0.08 }}>
            {headline.length}/220
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <OledRing intensity="low" color={m.ringTint} active={canOptimize} radius={12} inset={-3}>
            <button
              type="button"
              onClick={onOptimize}
              disabled={!canOptimize}
              style={{
                position: "relative",
                background: canOptimize ? T.text : T.elevated,
                color: canOptimize ? T.bg : T.muted,
                border: "none",
                borderRadius: 12,
                padding: "14px 24px",
                fontSize: 15,
                fontWeight: 700,
                fontFamily: FONT,
                cursor: canOptimize ? "pointer" : "not-allowed",
                minHeight: 48,
                letterSpacing: -0.2,
                WebkitFontSmoothing: "antialiased",
                transition: `background-color 0.2s ${EASE}, color 0.2s ${EASE}, transform 0.15s ${EASE}`,
              }}
              onMouseEnter={(e) => { if (canOptimize) e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
            >
              Optimize →
            </button>
          </OledRing>
        </div>

        {errorMsg ? (
          <div style={{ color: T.fail, fontSize: 13, fontFamily: MONO, letterSpacing: 0.04 }}>
            {errorMsg}
          </div>
        ) : null}
      </div>

      <div className="lio-mono" style={{ color: T.muted, fontSize: 11, textAlign: "center" }}>
        FREE · NO SIGNUP · 3 STYLES RETURNED
      </div>
    </section>
  );
}

// ─── LOADING ──────────────────────────────────────────────────────────────────
function LoadingView({ headline, market }) {
  const m = MARKETS[market];
  const chars = useMemo(() => Array.from(headline || ""), [headline]);
  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 28, paddingTop: 40, paddingBottom: 80, alignItems: "center" }}>
      <div className="lio-mono" style={{ color: T.muted, fontSize: 11 }}>DECONSTRUCTING HEADLINE</div>

      <RingCanvas color={m.ringTint} intensity="high" size={220} />

      <div style={{
        maxWidth: 720,
        width: "100%",
        textAlign: "center",
        fontFamily: FONT,
        fontSize: "clamp(18px, 2.4vw, 22px)",
        lineHeight: 1.5,
        color: T.text,
        minHeight: 56,
        padding: "0 8px",
      }}>
        {chars.map((c, i) => {
          const jx = (((i * 37) % 9) - 4) + "px";
          const jy = (((i * 13) % 7) - 3) + "px";
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                whiteSpace: c === " " ? "pre" : undefined,
                animation: `lio-char-jitter 1.4s ${EASE} ${i * 40}ms infinite`,
                "--jx": jx,
                "--jy": jy,
              }}
            >
              {c}
            </span>
          );
        })}
      </div>

      <div style={{ position: "relative", height: 140, width: "100%", maxWidth: 520, display: "flex", justifyContent: "center" }}>
        {FAILURE_CHIPS.map((chip, i) => (
          <span
            key={chip}
            style={{
              position: "absolute",
              top: 40 + (i % 2) * 18,
              left: `${10 + i * 16}%`,
              background: "rgba(248,113,113,0.08)",
              color: T.fail,
              border: "1px solid rgba(248,113,113,0.3)",
              borderRadius: 999,
              padding: "6px 12px",
              fontSize: 12,
              fontFamily: MONO,
              letterSpacing: 0.08,
              whiteSpace: "nowrap",
              animation: `lio-chip-float 2.6s ${EASE} ${200 + i * 220}ms infinite`,
              willChange: "transform, opacity",
            }}
          >
            {chip}
          </span>
        ))}
      </div>
    </section>
  );
}

// ─── RESULTS ──────────────────────────────────────────────────────────────────
function ResultsView({ apiResponse, selectedStyle, setSelectedStyle, market, userStatus, onSeeMore }) {
  const m = MARKETS[market];
  const [copied, setCopied] = useState(null);
  const copyTimerRef = useRef(null);
  useEffect(() => () => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current); }, []);

  const activeHeadline = (apiResponse && apiResponse[selectedStyle]) || "";

  const doCopy = useCallback((key) => {
    const text = apiResponse?.[key] || "";
    if (!text) return;
    try {
      navigator.clipboard?.writeText(text).catch(() => {});
    } catch { /* noop */ }
    setCopied(key);
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(null), 1600);
  }, [apiResponse]);

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 18, paddingTop: 28, paddingBottom: 72 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div className="lio-mono" style={{ color: T.muted, fontSize: 11 }}>THREE STYLES · TAP TO PREVIEW</div>
        <div className="lio-mono" style={{ color: T.muted, fontSize: 11 }}>TUNED FOR {m.short.toUpperCase()}</div>
      </div>

      <div className="lio-grid-results">
        {/* Preview card */}
        <div style={{
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: 16,
          padding: 20,
          minWidth: 0,
          animation: `lio-fade-up 0.35s ${EASE} both`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: T.elevated,
              border: `1px solid ${T.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: T.text, fontWeight: 700, fontFamily: FONT, fontSize: 18, letterSpacing: 0.5,
            }}>{m.sampleInit}</div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ color: T.text, fontSize: 16, fontWeight: 700, fontFamily: FONT, lineHeight: 1.2 }}>{m.sampleName}</div>
              <div style={{ color: T.dim, fontSize: 12, marginTop: 2, fontFamily: MONO, letterSpacing: 0.06 }}>{m.locationTag}</div>
            </div>
            <span style={{
              background: "rgba(74,222,128,0.1)",
              color: T.success,
              border: "1px solid rgba(74,222,128,0.3)",
              borderRadius: 999,
              padding: "4px 10px",
              fontSize: 10,
              fontFamily: MONO,
              letterSpacing: 0.12,
              whiteSpace: "nowrap",
            }}>OPEN TO WORK</span>
          </div>

          <div style={{
            color: T.text,
            fontSize: 16,
            lineHeight: 1.5,
            fontFamily: FONT,
            minHeight: 72,
            padding: 14,
            background: T.bg,
            border: `1px solid ${T.border}`,
            borderRadius: 12,
            wordBreak: "break-word",
            transition: `opacity 0.22s ${EASE}`,
            WebkitFontSmoothing: "antialiased",
          }} key={selectedStyle}>
            <div style={{ animation: `lio-fade-up 0.28s ${EASE} both` }}>
              {activeHeadline || "—"}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginTop: 14 }}>
            {[[m.copy1, m.stat1], [m.copy2, m.stat2], [m.copy3, m.stat3]].map(([label, stat]) => (
              <div key={label} style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: 10, padding: "10px 12px", minWidth: 0 }}>
                <div style={{ fontSize: 10, color: T.muted, fontFamily: MONO, letterSpacing: 0.12, textTransform: "uppercase" }}>{label}</div>
                <div style={{ fontSize: 15, color: T.text, fontWeight: 700, marginTop: 2, fontFamily: FONT, letterSpacing: -0.3 }}>{stat}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Style cards */}
        <div className="lio-style-grid">
          {STYLE_DEFS.map((s) => {
            const active = selectedStyle === s.key;
            const text = apiResponse?.[s.key] || "";
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setSelectedStyle(s.key)}
                style={{
                  textAlign: "left",
                  background: active ? T.elevated : T.surface,
                  border: `1px solid ${active ? T.borderHi : T.border}`,
                  borderRadius: 14,
                  padding: 16,
                  cursor: "pointer",
                  color: T.text,
                  fontFamily: FONT,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  minWidth: 0,
                  transition: `background-color 0.18s ${EASE}, border-color 0.18s ${EASE}, transform 0.15s ${EASE}`,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                  <div>
                    <div style={{ color: T.text, fontSize: 14, fontWeight: 700, letterSpacing: -0.2 }}>{s.label}</div>
                    <div style={{ color: T.muted, fontSize: 11, fontFamily: MONO, letterSpacing: 0.08, marginTop: 2 }}>{s.hint}</div>
                  </div>
                </div>

                <div style={{ color: T.dim, fontSize: 13, lineHeight: 1.5, wordBreak: "break-word", minHeight: 44 }}>
                  {text || "—"}
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <OledRing intensity="low" color={MARKETS[market].ringTint} active={active} radius={10} inset={-2}>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); doCopy(s.key); }}
                      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); doCopy(s.key); } }}
                      style={{
                        position: "relative",
                        background: T.bg,
                        color: T.text,
                        border: `1px solid ${T.border}`,
                        borderRadius: 10,
                        padding: "8px 14px",
                        fontSize: 12,
                        fontWeight: 700,
                        fontFamily: FONT,
                        cursor: "pointer",
                        letterSpacing: 0.04,
                        display: "inline-flex",
                        alignItems: "center",
                        minHeight: 36,
                        transition: `background-color 0.15s ${EASE}, color 0.15s ${EASE}`,
                      }}
                    >
                      {copied === s.key ? "Copied" : "Copy"}
                    </span>
                  </OledRing>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Below: CTA to reveal About + Experience */}
      <div style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 16,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        alignItems: "flex-start",
      }}>
        <div className="lio-mono" style={{ color: T.muted, fontSize: 11 }}>NEXT · FULL PROFILE REWRITE</div>
        <div style={{ color: T.text, fontSize: 16, fontWeight: 600, fontFamily: FONT, letterSpacing: -0.2 }}>
          {userStatus.isUnlocked
            ? "Your About & Experience rewrites are ready."
            : "Three headline styles are the opener. The profile below them is where recruiters decide."}
        </div>
        <button
          type="button"
          onClick={onSeeMore}
          style={{
            background: "transparent",
            color: T.text,
            border: `1px solid ${T.border}`,
            borderRadius: 10,
            padding: "10px 16px",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: FONT,
            minHeight: 42,
            transition: `border-color 0.15s ${EASE}`,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = T.borderHi)}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = T.border)}
        >
          {userStatus.isUnlocked ? "Show my full profile →" : "Reveal my About & Experience →"}
        </button>
      </div>
    </section>
  );
}

// ─── LOCKED ───────────────────────────────────────────────────────────────────
function LockedView({ market, userStatus, onUnlock, onBackToResults, onUpgrade, payingIntent }) {
  const m = MARKETS[market];
  const isMobile = useIsMobile();

  const blur = !userStatus.isUnlocked;

  // Blurred About / Experience placeholder copy
  const aboutLines = [
    `Rewritten About section for ${m.previewRole} roles in ${m.locationTag}.`,
    "Opens with a role-first hook, keyword-dense second paragraph, and a mission close that reads human.",
    "Built so ATS parses every line and recruiters don't bounce after the first sentence.",
  ];
  const experienceBullets = [
    "Led cross-functional program — reframed as measurable outcome with verb, metric, scope.",
    "Second bullet reworked to front-load the impact number, then the context, then the stakeholder.",
    "Third bullet tuned to the target market's keyword density, not generic corporate filler.",
    "Fourth bullet swaps passive voice for ownership verbs — 'Led', 'Built', 'Shipped', 'Grew'.",
  ];

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 18, paddingTop: 28, paddingBottom: isMobile && blur ? 260 : 80 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={onBackToResults}
          style={{
            background: "transparent",
            color: T.dim,
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            fontFamily: FONT,
            padding: "8px 0",
            minHeight: 40,
          }}
        >
          ← Back to headline styles
        </button>
        <div className="lio-mono" style={{ color: T.muted, fontSize: 11 }}>
          {blur ? "LOCKED · FULL REWRITE" : "UNLOCKED · FULL REWRITE"}
        </div>
      </div>

      <div className="lio-grid-locked">
        {/* About + Experience panels */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
          <PanelBlock title="About" blurred={blur}>
            {aboutLines.map((l, i) => (
              <p key={i} style={{ margin: 0, color: T.text, fontSize: 14, lineHeight: 1.6, fontFamily: FONT }}>{l}</p>
            ))}
          </PanelBlock>

          <PanelBlock title="Experience" blurred={blur}>
            <div style={{ color: T.dim, fontSize: 12, fontFamily: MONO, letterSpacing: 0.08, marginBottom: 6 }}>{m.previewRole.toUpperCase()}</div>
            <ul style={{ margin: 0, padding: "0 0 0 18px", color: T.text, fontSize: 14, lineHeight: 1.6, fontFamily: FONT, display: "flex", flexDirection: "column", gap: 6 }}>
              {experienceBullets.map((b, i) => (<li key={i}>{b}</li>))}
            </ul>
          </PanelBlock>

          <div style={{ color: T.dim, fontSize: 13, fontFamily: FONT, lineHeight: 1.55 }}>
            We've rewritten your experience for <span style={{ color: T.text, fontWeight: 700 }}>{m.locationTag}</span> {m.previewRole} roles. Unlock to reveal.
          </div>
        </div>

        {/* Paywall (desktop only — mobile uses sticky sheet) */}
        {!isMobile && (
          <PaywallPanel
            market={market}
            locked={blur}
            onUnlock={onUnlock}
            onUpgrade={onUpgrade}
            payingIntent={payingIntent}
            variant="inline"
          />
        )}
      </div>

      {/* Mobile sticky sheet */}
      {isMobile && blur && (
        <PaywallPanel
          market={market}
          locked={blur}
          onUnlock={onUnlock}
          onUpgrade={onUpgrade}
          payingIntent={payingIntent}
          variant="sheet"
        />
      )}
    </section>
  );
}

function PanelBlock({ title, blurred, children }) {
  return (
    <div style={{
      position: "relative",
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: 16,
      padding: 18,
      overflow: "hidden",
      minWidth: 0,
    }}>
      <div className="lio-mono" style={{ color: T.muted, fontSize: 11, marginBottom: 10 }}>{title.toUpperCase()}</div>
      <div style={{
        filter: blurred ? "blur(6px)" : "none",
        opacity: blurred ? 0.85 : 1,
        pointerEvents: blurred ? "none" : "auto",
        userSelect: blurred ? "none" : "auto",
        transition: `filter 0.35s ${EASE}, opacity 0.35s ${EASE}`,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}>
        {children}
      </div>
      {blurred && (
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(180deg, rgba(10,10,10,0) 0%, rgba(10,10,10,0.7) 100%)",
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}

function PaywallPanel({ market, locked, onUnlock, onUpgrade, payingIntent, variant }) {
  const m = MARKETS[market];
  const isSheet = variant === "sheet";
  return (
    <div
      style={{
        position: isSheet ? "fixed" : "sticky",
        top: isSheet ? "auto" : 88,
        left: isSheet ? 0 : "auto",
        right: isSheet ? 0 : "auto",
        bottom: isSheet ? 0 : "auto",
        zIndex: isSheet ? 40 : "auto",
        width: "100%",
        boxSizing: "border-box",
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: isSheet ? "16px 16px 0 0" : 16,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        animation: isSheet ? `lio-sheet-rise 0.35s ${EASE} both` : undefined,
        boxShadow: isSheet ? "0 -24px 48px rgba(0,0,0,0.6)" : "none",
        WebkitFontSmoothing: "antialiased",
      }}
    >
      {locked ? (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div className="lio-mono" style={{ color: T.muted, fontSize: 11 }}>ONE-TIME UNLOCK</div>
            <div className="lio-mono" style={{ color: T.muted, fontSize: 11 }}>{m.short.toUpperCase()}</div>
          </div>

          <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
            <OledRing intensity="low" color={m.ringTint} active radius={14} inset={-4}>
              <span style={{
                position: "relative",
                background: T.bg,
                color: T.text,
                border: `1px solid ${T.border}`,
                borderRadius: 14,
                padding: "12px 18px",
                fontFamily: FONT,
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: -0.8,
                animation: `lio-price-pulse 2.6s ${EASE} infinite`,
                display: "inline-flex",
                alignItems: "baseline",
                gap: 6,
              }}>
                <span>{m.currency}</span>
                <span>{m.price}</span>
              </span>
            </OledRing>
            <div style={{ color: T.dim, fontSize: 13, fontFamily: FONT }}>one-time · no subscription</div>
          </div>

          <button
            type="button"
            onClick={onUnlock}
            disabled={payingIntent}
            style={{
              background: T.text,
              color: T.bg,
              border: "none",
              borderRadius: 12,
              padding: "14px 20px",
              fontSize: 15,
              fontWeight: 700,
              fontFamily: FONT,
              cursor: payingIntent ? "wait" : "pointer",
              minHeight: 50,
              letterSpacing: -0.2,
              WebkitFontSmoothing: "antialiased",
              transition: `background-color 0.2s ${EASE}, transform 0.15s ${EASE}`,
            }}
            onMouseEnter={(e) => { if (!payingIntent) e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
          >
            {payingIntent ? "Opening checkout…" : "Unlock My Profile →"}
          </button>

          <button
            type="button"
            onClick={onUpgrade}
            style={{
              background: "transparent",
              color: T.dim,
              border: "none",
              cursor: "pointer",
              fontSize: 13,
              fontFamily: FONT,
              padding: "6px 0",
              textAlign: "left",
              minHeight: 40,
            }}
          >
            or upgrade to <span style={{ color: T.text, textDecoration: "underline", textUnderlineOffset: 3 }}>Active Hunter</span> for unlimited rewrites →
          </button>

          <div className="lio-mono" style={{ color: T.muted, fontSize: 10 }}>
            {m.trustLocked}
          </div>
        </>
      ) : (
        <>
          <div className="lio-mono" style={{ color: T.success, fontSize: 11 }}>PROFILE UNLOCKED</div>
          <div style={{ color: T.text, fontSize: 15, fontFamily: FONT, lineHeight: 1.5 }}>
            Everything above is yours — copy, paste, and ship it to LinkedIn.
          </div>
        </>
      )}
    </div>
  );
}

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useIsMobile(breakpoint = 960) {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(`(max-width: ${breakpoint}px)`).matches;
  });
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mql = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const onChange = (e) => setIsMobile(e.matches);
    try { mql.addEventListener("change", onChange); } catch { mql.addListener(onChange); }
    return () => {
      try { mql.removeEventListener("change", onChange); } catch { mql.removeListener(onChange); }
    };
  }, [breakpoint]);
  return isMobile;
}

// ─── Page shell ───────────────────────────────────────────────────────────────
export default function LinkedInOptimizer() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isPro, authReady } = useCvpAuth();

  const [market, setMarket] = useState("dubai");
  const [headline, setHeadline] = useState("");
  const [currentStep, setCurrentStep] = useState("idle");
  const [apiResponse, setApiResponse] = useState(null);
  const [selectedStyle, setSelectedStyle] = useState("professional");
  const [linkedinUnlocked, setLinkedinUnlocked] = useState(false);
  const [payingIntent, setPayingIntent] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [resuming, setResuming] = useState(false);
  const [resumingFading, setResumingFading] = useState(false);

  const userStatus = useMemo(
    () => ({
      isUnlocked: !!(isPro || linkedinUnlocked),
      isAuthenticated: !!user?.id,
    }),
    [isPro, linkedinUnlocked, user?.id],
  );

  // Refs let the Glovebox timeout read fresh values without re-running the
  // restore effect on every identity change (would double-fire the overlay).
  const onUnlockRef = useRef(null);
  const isUnlockedRef = useRef(userStatus.isUnlocked);

  const m = MARKETS[market];

  // Fetch permissions row on mount / whenever user changes.
  const refetchPermission = useCallback(async () => {
    if (!user?.id) { setLinkedinUnlocked(false); return; }
    try {
      const { data } = await supabase
        .from("permissions")
        .select("status")
        .eq("user_id", user.id)
        .eq("service", "linkedin_optimizer")
        .maybeSingle();
      if (data?.status === "unlocked") setLinkedinUnlocked(true);
    } catch {
      /* non-fatal */
    }
  }, [user?.id]);

  useEffect(() => { refetchPermission(); }, [refetchPermission]);

  // Handle return from Ziina — re-check permissions, clean query params.
  useEffect(() => {
    if (!authReady) return;
    const unlockedParam = searchParams.get("unlocked");
    const cancelledParam = searchParams.get("cancelled");
    if (unlockedParam === "1") {
      (async () => {
        await refetchPermission();
        const next = new URLSearchParams(searchParams);
        next.delete("unlocked");
        setSearchParams(next, { replace: true });
        // Jump straight to the locked panel so the unlock reveal is visible.
        if (apiResponse) setCurrentStep("locked");
      })();
    } else if (cancelledParam === "1") {
      const next = new URLSearchParams(searchParams);
      next.delete("cancelled");
      setSearchParams(next, { replace: true });
    }
  }, [authReady, searchParams, setSearchParams, refetchPermission, apiResponse]);

  const onOptimize = useCallback(async () => {
    const trimmed = headline.trim();
    if (!trimmed || currentStep === "loading") return;
    setErrorMsg(null);
    setCurrentStep("loading");
    const minDelay = new Promise((r) => setTimeout(r, 1400));
    try {
      const [res] = await Promise.all([
        fetch("/api/generate-linkedin-headline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ headline: trimmed, market }),
        }),
        minDelay,
      ]);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Generation failed");
      setApiResponse(data);
      setSelectedStyle("professional");
      setCurrentStep("results");
    } catch (err) {
      setErrorMsg(err?.message || "Something went wrong. Please retry.");
      setCurrentStep("idle");
    }
  }, [headline, market, currentStep]);

  const onUnlock = useCallback(async () => {
    if (payingIntent) return;
    setErrorMsg(null);
    if (!user?.id) {
      // Glovebox: stash the full journey so the post-auth return can restore
      // headline + styles + selected card + payment intent in one shot.
      try {
        const journeyState = {
          path: "/linkedin-optimizer",
          step: currentStep,
          data: { headline, apiResponse, selectedStyle },
          intent: "OPEN_ZIINA",
        };
        sessionStorage.setItem("cvp_pending_journey", JSON.stringify(journeyState));
        localStorage.setItem("postAuthRedirect", "/linkedin-optimizer");
      } catch { /* storage unavailable — still proceed to auth */ }
      navigate("/register");
      return;
    }
    setPayingIntent(true);
    try {
      const res = await fetch("/api/create-ziina-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feature: "linkedinOptimizer", userId: user.id, userEmail: user.email }),
      });
      const data = await res.json().catch(() => ({}));
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      setErrorMsg("Unable to start checkout. Please try again.");
    } catch {
      setErrorMsg("Unable to start checkout. Please try again.");
    } finally {
      setPayingIntent(false);
    }
  }, [user?.id, user?.email, payingIntent, navigate, currentStep, headline, apiResponse, selectedStyle]);

  // Keep refs aligned with latest callback + unlock state so the deferred
  // Glovebox timeout can safely call the current onUnlock and skip the
  // payment if permissions flipped unlocked while the overlay was showing.
  useLayoutEffect(() => { onUnlockRef.current = onUnlock; });
  useLayoutEffect(() => { isUnlockedRef.current = userStatus.isUnlocked; });

  // Glovebox restore — runs when auth flips authenticated. Must be layout
  // effect so restored state paints before the browser composites the next
  // frame (prevents a flash of idle state on return from auth).
  useLayoutEffect(() => {
    if (!userStatus.isAuthenticated) return undefined;
    let saved;
    try { saved = sessionStorage.getItem("cvp_pending_journey"); } catch { return undefined; }
    if (!saved) return undefined;

    let parsed;
    try { parsed = JSON.parse(saved); } catch { /* corrupt */ parsed = null; }
    try { sessionStorage.removeItem("cvp_pending_journey"); } catch { /* noop */ }
    if (!parsed) return undefined;

    const { step, data, intent } = parsed;
    if (data?.headline) setHeadline(data.headline);
    if (data?.apiResponse) setApiResponse(data.apiResponse);
    if (data?.selectedStyle) setSelectedStyle(data.selectedStyle);
    if (step) setCurrentStep(step);

    if (intent === "OPEN_ZIINA" && !userStatus.isUnlocked) {
      setResuming(true);
      setResumingFading(false);
      const fadeTimer = setTimeout(() => setResumingFading(true), 800);
      const fireTimer = setTimeout(() => {
        if (isUnlockedRef.current) return;
        const cb = onUnlockRef.current;
        if (typeof cb === "function") cb();
      }, 1000);
      const cleanupTimer = setTimeout(() => {
        setResuming(false);
        setResumingFading(false);
      }, 2000);
      return () => {
        clearTimeout(fadeTimer);
        clearTimeout(fireTimer);
        clearTimeout(cleanupTimer);
      };
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userStatus.isAuthenticated]);

  const onSeeMore = useCallback(() => setCurrentStep("locked"), []);
  const onBackToResults = useCallback(() => setCurrentStep("results"), []);
  const onUpgrade = useCallback(() => navigate("/pricing"), [navigate]);
  const onBack = useCallback(() => navigate(user ? "/dashboard" : "/"), [navigate, user]);

  return (
    <div style={{
      minHeight: "100vh",
      width: "100%",
      background: T.bg,
      color: T.text,
      fontFamily: FONT,
      WebkitFontSmoothing: "antialiased",
      position: "relative",
      overflowX: "hidden",
    }}>
      <style>{KEYFRAMES}</style>

      {/* Ambient page glow — keyed by market hue */}
      <div aria-hidden style={{
        position: "fixed", top: "-20%", left: "50%", transform: "translateX(-50%)",
        width: 900, height: 520, background: m.pageGlow,
        pointerEvents: "none", zIndex: 0,
      }} />

      <Header market={market} setMarket={setMarket} onBack={onBack} />

      <main className="lio-container" style={{ position: "relative", zIndex: 1 }}>
        {currentStep === "idle" && (
          <IdleView
            market={market}
            headline={headline}
            setHeadline={setHeadline}
            onOptimize={onOptimize}
            canOptimize={headline.trim().length > 0}
            errorMsg={errorMsg}
          />
        )}

        {currentStep === "loading" && (
          <LoadingView headline={headline} market={market} />
        )}

        {currentStep === "results" && apiResponse && (
          <ResultsView
            apiResponse={apiResponse}
            selectedStyle={selectedStyle}
            setSelectedStyle={setSelectedStyle}
            market={market}
            userStatus={userStatus}
            onSeeMore={onSeeMore}
          />
        )}

        {currentStep === "locked" && (
          <LockedView
            market={market}
            userStatus={userStatus}
            onUnlock={onUnlock}
            onBackToResults={onBackToResults}
            onUpgrade={onUpgrade}
            payingIntent={payingIntent}
          />
        )}
      </main>

      {resuming && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            background: "rgba(10,10,10,0.92)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 18,
            opacity: resumingFading ? 0 : 1,
            transition: `opacity 300ms ${EASE}`,
            pointerEvents: resumingFading ? "none" : "auto",
          }}
        >
          <RingCanvas color={m.ringTint} intensity="high" size={96} />
          <div className="lio-mono" style={{ color: T.dim, fontSize: 12 }}>
            RESUMING YOUR CHECKOUT…
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
function Header({ market, setMarket, onBack }) {
  return (
    <header style={{
      position: "sticky",
      top: 0,
      zIndex: 20,
      background: "rgba(10,10,10,0.72)",
      backdropFilter: "blur(14px)",
      WebkitBackdropFilter: "blur(14px)",
      borderBottom: `1px solid ${T.border}`,
    }}>
      <div className="lio-container" style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "12px 24px",
        minHeight: 56,
        boxSizing: "border-box",
      }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            background: "transparent",
            color: T.dim,
            border: "none",
            cursor: "pointer",
            fontSize: 14,
            fontFamily: FONT,
            padding: "6px 0",
            minHeight: 40,
          }}
        >
          ← Back
        </button>

        <MarketToggle market={market} setMarket={setMarket} />
      </div>
    </header>
  );
}

function MarketToggle({ market, setMarket }) {
  return (
    <div
      role="tablist"
      aria-label="Market"
      style={{
        display: "inline-flex",
        background: T.surface,
        border: `1px solid ${T.border}`,
        borderRadius: 999,
        padding: 4,
        gap: 2,
      }}
    >
      {Object.values(MARKETS).map((m) => {
        const active = market === m.key;
        return (
          <button
            key={m.key}
            role="tab"
            aria-selected={active}
            type="button"
            onClick={() => setMarket(m.key)}
            style={{
              background: active ? T.text : "transparent",
              color: active ? T.bg : T.dim,
              border: "none",
              borderRadius: 999,
              padding: "8px 14px",
              fontSize: 12,
              fontWeight: 700,
              fontFamily: FONT,
              cursor: "pointer",
              letterSpacing: 0.04,
              minHeight: 36,
              transition: `background-color 0.2s ${EASE}, color 0.2s ${EASE}`,
            }}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
