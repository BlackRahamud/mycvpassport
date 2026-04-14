import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

/* ─── (CV_PROFILES and TEMPLATE_CHIPS removed — Step01Phone now uses static data + FAB animation) ─── */

/* ─── Phone Shell ─────────────────────────────────────────────────── */
function PhoneShell({ children, glow }) {
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      {glow && (
        <div
          style={{
            position: "absolute",
            inset: "-60px",
            background:
              "radial-gradient(ellipse at 50% 60%, rgba(13,61,56,0.55) 0%, transparent 70%)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
      )}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: 280,
          height: 560,
          background: "#1A1A1A",
          border: "1.5px solid #2A2A2A",
          borderRadius: 40,
          overflow: "hidden",
          boxShadow:
            "0 32px 80px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(255,255,255,0.04) inset, 0 1px 0 rgba(255,255,255,0.08) inset",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Speaker notch */}
        <div
          style={{
            position: "absolute",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            width: 52,
            height: 5,
            background: "#2A2A2A",
            borderRadius: 99,
            zIndex: 10,
          }}
        />
        {/* Camera dot */}
        <div
          style={{
            position: "absolute",
            top: 13,
            left: "calc(50% + 34px)",
            transform: "translateX(-50%)",
            width: 7,
            height: 7,
            background: "#222",
            borderRadius: "50%",
            border: "1px solid #333",
            zIndex: 10,
          }}
        />
        {/* Status bar */}
        <div
          style={{
            height: 28,
            minHeight: 28,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "space-between",
            padding: "0 18px 4px",
            fontSize: 8,
            color: "#666",
            fontFamily: "monospace",
            zIndex: 5,
            background: "transparent",
          }}
        >
          <span>9:41</span>
          <span style={{ letterSpacing: 2 }}>|||</span>
        </div>
        {/* Screen */}
        <div
          style={{
            flex: 1,
            overflow: "hidden",
            position: "relative",
            background: "#141414",
          }}
        >
          {children}
        </div>
        {/* Home bar */}
        <div
          style={{
            height: 18,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#141414",
          }}
        >
          <div
            style={{
              width: 60,
              height: 3,
              background: "#2E2E2E",
              borderRadius: 99,
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* ─── Step 01: Static CV + FAB guide animation ──────────────────────── */
function Step01Phone() {
  const [fabPhase, setFabPhase] = useState(0);
  const [typedText, setTypedText] = useState("");
  const timersRef = useRef([]);
  const intervalRef = useRef(null);

  const FULL_NAME = "Ahmed Al Mansouri";

  useEffect(() => {
    const clearAll = () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    const addTimer = (fn, ms) => {
      const id = setTimeout(fn, ms);
      timersRef.current.push(id);
      return id;
    };

    clearAll();
    setTypedText("");

    // Phase 0: FAB bouncing (0–2500ms)
    addTimer(() => setFabPhase(1), 2500);

    // Phase 1: Sheet slides up (2500ms), wait 500ms then type
    addTimer(() => {
      setFabPhase(2);
      let charIndex = 0;
      intervalRef.current = setInterval(() => {
        charIndex++;
        if (charIndex <= FULL_NAME.length) {
          setTypedText(FULL_NAME.slice(0, charIndex));
        } else {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }, 60);
    }, 3000);

    // Phase 3: Typing done, pause
    addTimer(() => setFabPhase(3), 4200);

    // Phase 4: Sheet slides down
    addTimer(() => setFabPhase(4), 5500);

    // Reset: loop
    addTimer(() => {
      setFabPhase(0);
      setTypedText("");
    }, 7000);

    return clearAll;
  }, [fabPhase === 0 ? fabPhase : undefined]); // eslint-disable-line react-hooks/exhaustive-deps

  const sheetVisible = fabPhase >= 1 && fabPhase <= 3;
  const overlayVisible = fabPhase >= 1 && fabPhase <= 3;

  return (
    <PhoneShell>
      <style>{`
        @keyframes hiw-fab-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-4px); }
        }
        @keyframes hiw-fab-pulse {
          0% { box-shadow: 0 0 0 0 rgba(217,119,6,0.4); }
          100% { box-shadow: 0 0 0 10px rgba(217,119,6,0); }
        }
        @keyframes hiw-cursor-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          background: "#fff",
        }}
      >
        {/* Static CV — Ahmed Al Mansouri */}
        <div
          style={{
            flex: 1,
            overflow: "hidden",
            padding: "10px 12px 4px",
            fontFamily: "'Georgia', serif",
            background: "#fff",
          }}
        >
          {/* Header Band */}
          <div
            style={{
              background: "#1A3A5C",
              padding: "8px 10px 7px",
              marginBottom: 8,
              borderRadius: 3,
            }}
          >
            <div
              style={{
                fontSize: 10.5,
                fontWeight: 700,
                color: "#fff",
                letterSpacing: 0.3,
                lineHeight: 1.2,
              }}
            >
              Ahmed Al Mansouri
            </div>
            <div
              style={{
                fontSize: 6.5,
                color: "rgba(255,255,255,0.8)",
                marginTop: 1.5,
                letterSpacing: 0.5,
              }}
            >
              Senior Operations Manager &middot; Emirates NBD
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
              {["Dubai, UAE", "ahmed@email.com", "+971 50 000 0000"].map(
                (t) => (
                  <span
                    key={t}
                    style={{
                      fontSize: 5,
                      color: "#fff",
                      background: "rgba(255,255,255,0.15)",
                      padding: "1.5px 4px",
                      borderRadius: 2,
                    }}
                  >
                    {t}
                  </span>
                )
              )}
            </div>
          </div>

          {/* Professional Summary — grey bars */}
          <SectionBlock label="Professional Summary" accent="#c9a84c">
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <div
                style={{
                  height: 4,
                  background: "#e0e0e0",
                  borderRadius: 2,
                  width: "100%",
                }}
              />
              <div
                style={{
                  height: 4,
                  background: "#e0e0e0",
                  borderRadius: 2,
                  width: "75%",
                }}
              />
            </div>
          </SectionBlock>

          {/* Experience — role + bullet bars */}
          <SectionBlock label="Experience" accent="#c9a84c">
            <div
              style={{ fontSize: 5.5, fontWeight: 700, color: "#222", marginBottom: 3 }}
            >
              Senior Operations Manager
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2.5, marginLeft: 6 }}>
              <div
                style={{
                  height: 3.5,
                  background: "#e8e8e8",
                  borderRadius: 2,
                  width: "90%",
                }}
              />
              <div
                style={{
                  height: 3.5,
                  background: "#e8e8e8",
                  borderRadius: 2,
                  width: "70%",
                }}
              />
            </div>
          </SectionBlock>

          {/* Key Skills — 3 chips */}
          <SectionBlock label="Key Skills" accent="#c9a84c">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
              {["Operations", "Risk Management", "Lean Six Sigma"].map((s) => (
                <span
                  key={s}
                  style={{
                    fontSize: 4.5,
                    background: "#f5f5f5",
                    border: "0.5px solid #e0e0e0",
                    color: "#555",
                    padding: "2px 5px",
                    borderRadius: 3,
                  }}
                >
                  {s}
                </span>
              ))}
            </div>
          </SectionBlock>
        </div>
      </div>

      {/* Dark overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          opacity: overlayVisible ? 1 : 0,
          transition: "opacity 0.3s ease",
          pointerEvents: "none",
          zIndex: 5,
        }}
      />

      {/* FAB Button */}
      <div
        style={{
          position: "absolute",
          bottom: sheetVisible ? 76 : 16,
          right: 16,
          zIndex: 8,
          width: 44,
          height: 44,
          borderRadius: "50%",
          background: "#D97706",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          animation:
            fabPhase === 0
              ? "hiw-fab-bounce 1.5s ease-in-out infinite, hiw-fab-pulse 2s infinite"
              : "none",
          transition: "bottom 0.4s cubic-bezier(0.34,1.56,0.64,1)",
          boxShadow:
            fabPhase === 0
              ? undefined
              : "0 4px 12px rgba(0,0,0,0.3)",
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
        </svg>
      </div>

      {/* Bottom Sheet */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "65%",
          background: "#141414",
          borderRadius: "20px 20px 0 0",
          zIndex: 7,
          transform: sheetVisible ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.4s cubic-bezier(0.34,1.56,0.64,1)",
          display: "flex",
          flexDirection: "column",
          padding: "0 16px 16px",
        }}
      >
        {/* Drag handle */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "12px 0 16px",
          }}
        >
          <div
            style={{
              width: 36,
              height: 4,
              background: "#2A2A2A",
              borderRadius: 2,
            }}
          />
        </div>

        {/* Step label */}
        <div
          style={{
            fontSize: 9,
            color: "#D97706",
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontWeight: 700,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          STEP 1 OF 11 &mdash;&mdash;
        </div>

        {/* Question */}
        <div
          style={{
            fontSize: 14,
            color: "#fff",
            fontWeight: 600,
            marginTop: 8,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          What&rsquo;s your full name?
        </div>

        {/* Input field */}
        <div style={{ marginTop: 16, position: "relative" }}>
          <div
            style={{
              background: "#1C1C1C",
              border: "1.5px solid #D97706",
              borderRadius: 8,
              padding: "10px 44px 10px 12px",
              width: "100%",
              boxSizing: "border-box",
              minHeight: 38,
              display: "flex",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: 11,
                color: typedText ? "#e8e8e8" : "#555",
                fontFamily: "system-ui, sans-serif",
              }}
            >
              {typedText || "Type here..."}
            </span>
            {fabPhase >= 2 && fabPhase <= 3 && (
              <span
                style={{
                  display: "inline-block",
                  width: 1,
                  height: 12,
                  background: "#D97706",
                  marginLeft: 1,
                  animation: "hiw-cursor-blink 1s steps(1) infinite",
                }}
              />
            )}
          </div>
          {/* Send button */}
          <div
            style={{
              position: "absolute",
              right: 4,
              top: "50%",
              transform: "translateY(-50%)",
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "#D97706",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#fff"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}

function SectionBlock({ label, accent, children }) {
  return (
    <div style={{ marginBottom: 7 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          marginBottom: 3,
        }}
      >
        <span
          style={{
            fontSize: 6,
            fontWeight: 700,
            color: "#1a2e1a",
            textTransform: "uppercase",
            letterSpacing: 0.8,
          }}
        >
          {label}
        </span>
        <div
          style={{ flex: 1, height: 0.5, background: accent, opacity: 0.6 }}
        />
      </div>
      {children}
    </div>
  );
}

/* ─── Step 02: Fill-in form with green glowing field ─────────────────── */
function Step02Phone() {
  return (
    <PhoneShell>
      <style>{`
        @keyframes hiw-field-pulse {
          0%, 100% { box-shadow: 0 0 0 2px rgba(29,158,117,0.3); }
          50% { box-shadow: 0 0 0 2px rgba(29,158,117,0.08); }
        }
      `}</style>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          background: "#141414",
          padding: "12px 14px 8px",
        }}
      >
        {/* Progress */}
        <div style={{ marginBottom: 12 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 5,
            }}
          >
            <span
              style={{
                fontSize: 6,
                color: "#555",
                letterSpacing: 1,
                textTransform: "uppercase",
              }}
            >
              Step 2 of 5 &middot; Personal Info
            </span>
            <span style={{ fontSize: 6, color: "#1D9E75" }}>40%</span>
          </div>
          <div
            style={{
              height: 2.5,
              background: "#222",
              borderRadius: 99,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: "40%",
                height: "100%",
                background: "#1D9E75",
                borderRadius: 99,
              }}
            />
          </div>
        </div>

        {/* Fields */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            flex: 1,
            minHeight: 0,
          }}
        >
          {/* Active field — Full Name */}
          <div>
            <div
              style={{
                fontSize: 5.5,
                color: "#1D9E75",
                marginBottom: 3,
                letterSpacing: 0.4,
              }}
            >
              Full Name
            </div>
            <div
              style={{
                background: "#1C1C1C",
                border: "1px solid #1D9E75",
                borderRadius: 8,
                padding: "7px 9px",
                animation: "hiw-field-pulse 1.5s ease-in-out infinite",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: 7, color: "#e8e8e8" }}>
                Ahmed Al Mansouri
              </span>
              <span
                style={{
                  display: "inline-block",
                  width: 1,
                  height: 9,
                  background: "#1D9E75",
                  borderRadius: 1,
                  animation: "blink 1s steps(1) infinite",
                }}
              />
            </div>
          </div>

          {/* Normal fields */}
          {[
            { label: "Job Title", value: "Senior Operations Manager" },
            { label: "Current Company", value: "Emirates NBD" },
          ].map((f) => (
            <div key={f.label}>
              <div
                style={{
                  fontSize: 5.5,
                  color: "#555",
                  marginBottom: 3,
                  letterSpacing: 0.4,
                }}
              >
                {f.label}
              </div>
              <div
                style={{
                  background: "#181818",
                  border: "1px solid #252525",
                  borderRadius: 8,
                  padding: "7px 9px",
                }}
              >
                <span style={{ fontSize: 7, color: "#888" }}>{f.value}</span>
              </div>
            </div>
          ))}

          {/* CV section preview bars */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              gap: 4,
              padding: "8px 0",
            }}
          >
            {[
              { color: "#378ADD", width: "85%" },
              { color: "#1D9E75", width: "70%" },
              { color: "#6366F1", width: "55%" },
              { color: "#D97706", width: "40%" },
            ].map((bar, i) => (
              <div
                key={i}
                style={{
                  height: 3,
                  width: bar.width,
                  background: bar.color,
                  borderRadius: 2,
                  opacity: 0.5,
                }}
              />
            ))}
          </div>

          {/* Continue Button */}
          <button
            style={{
              width: "100%",
              background: "#fff",
              border: "none",
              borderRadius: 10,
              padding: "9px 0",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
            }}
          >
            <span
              style={{
                fontSize: 8,
                fontWeight: 700,
                color: "#0A0A0A",
                letterSpacing: 0.3,
              }}
            >
              Continue
            </span>
            <span
              style={{ fontSize: 9, color: "#0A0A0A", fontWeight: 700 }}
            >
              &rarr;
            </span>
          </button>
        </div>
      </div>
    </PhoneShell>
  );
}

/* ─── Step 03: ATS score + download ──────────────────────────────────── */
function Step03Phone() {
  const score = 84;
  const radius = 42;
  const circ = 2 * Math.PI * radius;
  const dash = (score / 100) * circ;

  const rows = [
    { icon: "\u2713", label: "Keywords matched", value: "Pass", ok: true },
    { icon: "\u2713", label: "Format clean", value: "Pass", ok: true },
    {
      icon: "\u2713",
      label: "Section order correct",
      value: "Pass",
      ok: true,
    },
    {
      icon: "\u26A0",
      label: "Add measurable achievements",
      value: "Improve",
      ok: false,
    },
  ];

  return (
    <PhoneShell glow>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          background: "#141414",
          padding: "10px 14px 8px",
          alignItems: "stretch",
        }}
      >
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 6 }}>
          <div
            style={{
              fontSize: 6,
              color: "#555",
              letterSpacing: 1.2,
              textTransform: "uppercase",
              marginBottom: 2,
            }}
          >
            ATS Score
          </div>
          <div
            style={{
              fontSize: 5.5,
              color: "#1D9E75",
              letterSpacing: 0.5,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            Gulf Market Ready &#x2713;
          </div>
        </div>

        {/* Score Ring */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: 12,
          }}
        >
          <div style={{ position: "relative", width: 100, height: 100 }}>
            <svg
              width={100}
              height={100}
              viewBox="0 0 100 100"
              style={{ transform: "rotate(-90deg)" }}
            >
              <defs>
                <linearGradient
                  id="hiw-score-grad"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor="#1D9E75" />
                  <stop offset="100%" stopColor="#378ADD" />
                </linearGradient>
                <filter id="hiw-glow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <circle
                cx={50}
                cy={50}
                r={radius}
                fill="none"
                stroke="#1e1e1e"
                strokeWidth={6}
              />
              <circle
                cx={50}
                cy={50}
                r={radius}
                fill="none"
                stroke="url(#hiw-score-grad)"
                strokeWidth={9}
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeLinecap="round"
                opacity={0.15}
                filter="url(#hiw-glow)"
              />
              <circle
                cx={50}
                cy={50}
                r={radius}
                fill="none"
                stroke="url(#hiw-score-grad)"
                strokeWidth={6}
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeLinecap="round"
              />
            </svg>
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: "#fff",
                  lineHeight: 1,
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                {score}
              </span>
              <span style={{ fontSize: 5, color: "#555", marginTop: 1 }}>
                / 100
              </span>
            </div>
          </div>
        </div>

        {/* Data rows */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 5,
            marginBottom: 10,
          }}
        >
          {rows.map((r, i) => (
            <div
              key={i}
              style={{
                background: "#191919",
                border: `1px solid ${r.ok ? "#1e2e1e" : "#2e2318"}`,
                borderRadius: 7,
                padding: "6px 9px",
                display: "flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              <span
                style={{
                  fontSize: 7,
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  background: r.ok
                    ? "rgba(29,158,117,0.12)"
                    : "rgba(251,191,36,0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: r.ok ? "#1D9E75" : "#FBBF24",
                  flexShrink: 0,
                  lineHeight: 1,
                }}
              >
                {r.icon}
              </span>
              <span style={{ fontSize: 5.5, color: "#ccc", flex: 1 }}>
                {r.label}
              </span>
              <span
                style={{
                  fontSize: 5,
                  color: r.ok ? "#1D9E75" : "#FBBF24",
                  background: r.ok
                    ? "rgba(29,158,117,0.08)"
                    : "rgba(251,191,36,0.08)",
                  padding: "1.5px 5px",
                  borderRadius: 4,
                  fontWeight: 600,
                  letterSpacing: 0.3,
                }}
              >
                {r.value}
              </span>
            </div>
          ))}
        </div>

        {/* Download Button */}
        <button
          style={{
            width: "100%",
            background: "#fff",
            border: "none",
            borderRadius: 10,
            padding: "8px 0",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
            boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
            marginTop: "auto",
          }}
        >
          <span
            style={{
              fontSize: 8,
              fontWeight: 700,
              color: "#0A0A0A",
              letterSpacing: 0.3,
            }}
          >
            Download PDF
          </span>
          <svg width={9} height={9} viewBox="0 0 12 12" fill="none">
            <path
              d="M6 1v7M3 5.5l3 3 3-3M2 10h8"
              stroke="#0A0A0A"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </PhoneShell>
  );
}

/* ─── Step layout ────────────────────────────────────────────────────── */
const STEPS = [
  {
    number: "01",
    title: "Choose from Gulf-ready templates",
    description:
      "Professionally designed for UAE, KSA, and GCC hiring managers. ATS-optimised layouts that clear automated screening systems.",
    Phone: Step01Phone,
  },
  {
    number: "02",
    title: "Fill in 5 minutes",
    description:
      "Smart prompts guide every section. Paste your existing CV or start fresh — our assistant fills gaps and suggests Gulf-market phrasing.",
    Phone: Step02Phone,
  },
  {
    number: "03",
    title: "Download. Apply. Get hired.",
    description:
      "Instant ATS analysis scores your CV against real Gulf job postings. One-click PDF export, ready to attach and send.",
    Phone: Step03Phone,
  },
];

/* ─── Main Section ───────────────────────────────────────────────────── */
export default function HowItWorks() {
  const navigate = useNavigate();
  const sectionRef = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      style={{
        background: "#0A0A0A",
        padding: "80px 20px 100px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        @keyframes hiw-pulse-dot {
          0%, 100% { opacity: 1; box-shadow: 0 0 6px #34C97A; }
          50% { opacity: 0.5; box-shadow: 0 0 2px #34C97A; }
        }

        .hiw-desktop-layout {
          display: none;
        }
        .hiw-mobile-layout {
          display: flex;
          flex-direction: column;
          gap: 64px;
          align-items: center;
        }

        @media (min-width: 1024px) {
          .hiw-desktop-layout {
            display: flex;
            flex-direction: column;
            gap: 80px;
            max-width: 1100px;
            margin: 0 auto;
            position: relative;
          }
          .hiw-mobile-layout {
            display: none;
          }
          .hiw-desktop-layout::before {
            content: '';
            position: absolute;
            left: 23px;
            top: 0;
            bottom: 0;
            width: 2px;
            background: linear-gradient(to bottom, #D97706, #1D9E75);
          }
          .hiw-step-row {
            display: grid;
            grid-template-columns: 56px 1fr;
            gap: 48px;
            align-items: start;
          }
          .hiw-step-number {
            width: 48px;
            height: 48px;
            border-radius: 50%;
            background: #111;
            border: 1.5px solid #2A2A2A;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 16px;
            font-weight: 800;
            color: #A0A0A0;
            font-family: system-ui, monospace;
            position: relative;
            z-index: 2;
          }
          .hiw-step-row:first-child .hiw-step-number {
            border-color: #D97706;
            color: #D97706;
            box-shadow: 0 0 12px rgba(217,119,6,0.3);
          }
          .hiw-step-body {
            display: grid;
            grid-template-columns: 1fr 320px;
            gap: 48px;
            align-items: center;
          }
          .hiw-step-text {
            max-width: 480px;
          }
        }
      `}</style>

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 64 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "#141414",
            border: "1px solid #222",
            borderRadius: 99,
            padding: "5px 14px",
            marginBottom: 18,
          }}
        >
          <div
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "#34C97A",
              animation: "hiw-pulse-dot 2s ease-in-out infinite",
            }}
          />
          <span
            style={{
              fontSize: 11,
              color: "#555",
              letterSpacing: 1.2,
              textTransform: "uppercase",
            }}
          >
            How It Works
          </span>
        </div>

        <h2
          style={{
            margin: "0 0 14px",
            fontSize: "clamp(28px, 6vw, 42px)",
            fontWeight: 700,
            color: "#FFFFFF",
            letterSpacing: -1,
            lineHeight: 1.1,
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          Your Gulf career,
          <br />
          launched in minutes.
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: 15,
            color: "#444",
            maxWidth: 400,
            lineHeight: 1.7,
            marginInline: "auto",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
        >
          Three steps. No fluff. A CV that gets past ATS and lands
          interviews.
        </p>
      </div>

      {/* Desktop layout: vertical numbered steps with connector line */}
      <div className="hiw-desktop-layout">
        {STEPS.map((step, i) => (
          <div
            key={step.number}
            className="hiw-step-row"
            style={{
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(40px)",
              transition: `opacity 0.7s ease ${i * 0.2}s, transform 0.7s ease ${i * 0.2}s`,
            }}
          >
            <div className="hiw-step-number">{step.number}</div>
            <div className="hiw-step-body">
              <div className="hiw-step-text">
                <h3
                  style={{
                    margin: "0 0 12px",
                    fontSize: 24,
                    fontWeight: 700,
                    color: "#f0f0f0",
                    letterSpacing: -0.4,
                    lineHeight: 1.25,
                    fontFamily: "'Georgia', 'Times New Roman', serif",
                  }}
                >
                  {step.title}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: 15,
                    color: "#555",
                    lineHeight: 1.65,
                    fontFamily: "system-ui, -apple-system, sans-serif",
                  }}
                >
                  {step.description}
                </p>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <step.Phone />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Mobile layout: stacked cards (preserves existing mobile experience) */}
      <div className="hiw-mobile-layout">
        {STEPS.map((step, i) => (
          <div
            key={step.number}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 28,
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0)" : "translateY(40px)",
              transition: `opacity 0.7s ease ${i * 0.18}s, transform 0.7s ease ${i * 0.18}s`,
            }}
          >
            <div style={{ position: "relative" }}>
              <step.Phone />
              <div
                style={{
                  position: "absolute",
                  top: -10,
                  left: -10,
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "#1C1C1C",
                  border: "1px solid #2A2A2A",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 9,
                  fontWeight: 800,
                  color: "#A0A0A0",
                  fontFamily: "system-ui, monospace",
                  letterSpacing: -0.5,
                }}
              >
                {step.number}
              </div>
            </div>
            <div style={{ textAlign: "center", maxWidth: 260 }}>
              <h3
                style={{
                  margin: "0 0 8px",
                  fontSize: 17,
                  fontWeight: 700,
                  color: "#f0f0f0",
                  letterSpacing: -0.4,
                  lineHeight: 1.25,
                  fontFamily: "'Georgia', 'Times New Roman', serif",
                }}
              >
                {step.title}
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: 13,
                  color: "#555",
                  lineHeight: 1.65,
                  fontFamily: "system-ui, -apple-system, sans-serif",
                }}
              >
                {step.description}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom CTA */}
      <div style={{ textAlign: "center", marginTop: 72 }}>
        <button
          type="button"
          onClick={() => navigate('/auth')}
          style={{
            background: "#34C97A",
            color: "#0A0A0A",
            border: "none",
            borderRadius: 12,
            padding: "14px 36px",
            fontSize: 14,
            fontWeight: 700,
            cursor: "pointer",
            letterSpacing: 0.3,
            boxShadow:
              "0 0 40px rgba(52,201,122,0.2), 0 4px 16px rgba(0,0,0,0.4)",
            transition:
              "transform 0.15s cubic-bezier(0.4,0,0.2,1), box-shadow 0.15s cubic-bezier(0.4,0,0.2,1)",
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = "translateY(-2px)";
            e.target.style.boxShadow =
              "0 0 60px rgba(52,201,122,0.3), 0 8px 24px rgba(0,0,0,0.5)";
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = "translateY(0)";
            e.target.style.boxShadow =
              "0 0 40px rgba(52,201,122,0.2), 0 4px 16px rgba(0,0,0,0.4)";
          }}
        >
          Build My Gulf CV &mdash; It&rsquo;s Free &rarr;
        </button>
        <div style={{ marginTop: 12, fontSize: 12, color: "#3a3a3a" }}>
          No credit card &middot; Takes 5 minutes &middot; Download instantly
        </div>
      </div>
    </section>
  );
}
