import { useState, useEffect, useRef } from "react";

const S = {
  root: {
    background: "#0A0A0A",
    minHeight: "100vh",
    fontFamily: "system-ui, -apple-system, sans-serif",
    color: "#FFFFFF",
    padding: "0 0 48px",
  },
  header: {
    background: "#111111",
    borderBottom: "1px solid #1E1E1E",
    padding: "0 24px",
    height: "44px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  logo: {
    fontFamily: "monospace",
    fontSize: "13px",
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: "0.02em",
  },
  headerRight: {
    fontFamily: "monospace",
    fontSize: "10px",
    color: "#404040",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },
  container: {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "32px 24px 0",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "24px",
  },
  panel: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
  },
  panelLabel: {
    fontSize: "10px",
    color: "#525252",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    fontWeight: "500",
  },
  surface: {
    background: "#141414",
    border: "1px solid #2A2A2A",
    borderRadius: "8px",
  },
  elevated: {
    background: "#1C1C1C",
    border: "1px solid #2A2A2A",
    borderRadius: "8px",
  },
};

function CVSkeleton({ scanning }) {
  return (
    <div style={{
      ...S.surface,
      padding: "20px 18px 16px",
      position: "relative",
      overflow: "hidden",
      flex: 1,
    }}>
      {scanning && <div className="laser-line" />}
      <div style={{ width: "52%", height: "9px", background: "#2A2A2A", borderRadius: "3px", marginBottom: "6px" }} />
      <div style={{ width: "34%", height: "6px", background: "#1E1E1E", borderRadius: "3px", marginBottom: "18px" }} />
      <div style={{ height: "1px", background: "#1E1E1E", marginBottom: "14px" }} />
      <SkSection />
      {[[80], [64], [74]].map(([w], i) => (
        <div key={i} style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "7px" }}>
          <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#252525", flexShrink: 0 }} />
          <div style={{ height: "5px", width: `${w}%`, background: "#1E1E1E", borderRadius: "3px" }} />
        </div>
      ))}
      <SkSection style={{ marginTop: "14px" }} />
      {[[68], [54]].map(([w], i) => (
        <div key={i} style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "7px" }}>
          <div style={{ width: "5px", height: "5px", borderRadius: "50%", background: "#252525", flexShrink: 0 }} />
          <div style={{ height: "5px", width: `${w}%`, background: "#1E1E1E", borderRadius: "3px" }} />
        </div>
      ))}
      <SkSection style={{ marginTop: "14px" }} />
      <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
        {[46, 58, 40, 52].map((w, i) => (
          <div key={i} style={{ height: "14px", width: `${w}px`, borderRadius: "3px", background: "#1E1E1E" }} />
        ))}
      </div>
      <div style={{
        position: "absolute", bottom: "10px", right: "12px",
        fontFamily: "monospace", fontSize: "9px", color: "#333333",
      }}>
        resume_v3.pdf
      </div>
    </div>
  );
}

function SkSection({ style }) {
  return (
    <div style={{ width: "26%", height: "6px", background: "#242424", borderRadius: "3px", marginBottom: "9px", ...style }} />
  );
}

function ScanButton({ onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: "100%",
        padding: "11px 16px",
        background: disabled ? "#1A1A1A" : "#2563EB",
        color: disabled ? "#404040" : "#FFFFFF",
        border: `1px solid ${disabled ? "#2A2A2A" : "#2563EB"}`,
        borderRadius: "6px",
        fontSize: "13px",
        fontWeight: "600",
        cursor: disabled ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        letterSpacing: "0.01em",
        transition: "background 0.15s ease, color 0.15s ease, border-color 0.15s ease",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <ScanIcon color={disabled ? "#404040" : "#FFFFFF"} />
      Check ATS Score
    </button>
  );
}

function ScanIcon({ color }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round">
      <rect x="2" y="2" width="4" height="3" rx="1" />
      <rect x="10" y="2" width="4" height="3" rx="1" />
      <rect x="2" y="11" width="4" height="3" rx="1" />
      <rect x="10" y="11" width="4" height="3" rx="1" />
      <line x1="2" y1="8" x2="14" y2="8" />
    </svg>
  );
}

function IdleRight() {
  return (
    <div style={{
      flex: 1,
      border: "1px dashed #2A2A2A",
      borderRadius: "8px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "340px",
      background: "#0E0E0E",
    }}>
      <p style={{ fontSize: "12px", color: "#383838", textAlign: "center", lineHeight: "1.6", maxWidth: "180px", margin: 0 }}>
        Run a scan to see your<br />ATS analysis
      </p>
    </div>
  );
}

const STEPS = [
  "Extracting",
  "Loading",
  "Complete",
];

function ScanningRight({ onComplete }) {
  const [stepStates, setStepStates] = useState([null, null, null]);
  const called = useRef(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      await delay(400);
      if (cancelled) return;
      setStepStates(["active", null, null]);
      await delay(1000);
      if (cancelled) return;
      setStepStates(["done", null, null]);
      await delay(400);
      if (cancelled) return;
      setStepStates(["done", "active", null]);
      await delay(1000);
      if (cancelled) return;
      setStepStates(["done", "done", null]);
      await delay(400);
      if (cancelled) return;
      setStepStates(["done", "done", "done"]);
      await delay(600);
      if (cancelled) return;
      if (!called.current) {
        called.current = true;
        onComplete();
      }
    }
    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ flex: 1, ...S.surface, padding: "20px 18px", display: "flex", flexDirection: "column", gap: "10px", minHeight: "340px" }}>
      <div style={{ fontSize: "10px", color: "#525252", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: "500", marginBottom: "4px" }}>
        Scan progress
      </div>
      {STEPS.map((label, i) => {
        const state = stepStates[i];
        if (state === null) return null;
        const isDone = state === "done";
        const isLast = i === 2;
        const text = isDone ? `${label} ✓` : (isLast ? "Complete ✓" : `${label}...`);
        return (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              width: "6px", height: "6px", borderRadius: "50%", flexShrink: 0,
              background: isDone ? "#2563EB" : "#3B82F6",
              boxShadow: isDone ? "none" : "0 0 6px #3B82F6",
            }} />
            <span style={{
              fontSize: "13px",
              color: isDone ? "#A0A0A0" : "#FFFFFF",
              fontFamily: "monospace",
            }}>{text}</span>
            {!isDone && (
              <span style={{ marginLeft: "auto", display: "flex", gap: "3px" }}>
                {[0, 1, 2].map(j => (
                  <span key={j} className={`blink-dot blink-dot-${j}`} style={{
                    display: "inline-block", width: "4px", height: "4px",
                    borderRadius: "50%", background: "#2563EB",
                  }} />
                ))}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ScoreRing({ score, size = 108 }) {
  const [display, setDisplay] = useState(0);
  const radius = 45;
  const circ = 2 * Math.PI * radius;
  const progress = display / 100;
  const offset = circ * (1 - progress);

  useEffect(() => {
    const duration = 1200;
    const start = performance.now();
    function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
    function tick(now) {
      const t = Math.min((now - start) / duration, 1);
      setDisplay(Math.round(easeOut(t) * score));
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }, [score]);

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox="0 0 108 108" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="54" cy="54" r={radius} fill="none" stroke="#1C1C1C" strokeWidth="8" />
        <circle
          cx="54" cy="54" r={radius} fill="none"
          stroke="#2563EB" strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "none" }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: "2px",
      }}>
        <span style={{ fontSize: "26px", fontWeight: "600", lineHeight: "1", color: "#FFFFFF" }}>{display}</span>
        <span style={{ fontSize: "10px", color: "#525252", fontFamily: "monospace" }}>/ 100</span>
      </div>
    </div>
  );
}

function matchLevel(score) {
  if (score < 50) return { label: "Needs Work", color: "#EF4444" };
  if (score < 75) return { label: "Good",       color: "#F59E0B" };
  return                 { label: "Strong",      color: "#22C55E" };
}

function StatCard({ label, value, valueColor }) {
  return (
    <div style={{
      flex: 1, ...S.elevated,
      padding: "10px 12px",
    }}>
      <div style={{ fontSize: "9px", color: "#525252", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "5px" }}>{label}</div>
      <div style={{ fontSize: "14px", fontWeight: "600", color: valueColor || "#FFFFFF" }}>{value}</div>
    </div>
  );
}

function KeywordChip({ keyword, found }) {
  return (
    <span
      style={{
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize: "11px",
        fontWeight: 500,
        padding: "5px 10px",
        borderRadius: "6px",
        letterSpacing: "0.02em",
        background: found ? "#166534" : "#991B1B",
        color: "#FFFFFF",
        flexShrink: 0,
        maxWidth: "100%",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}
      title={keyword}
    >
      {keyword}
    </span>
  );
}

function LockIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#A0A0A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

const FREE_MISSING_VISIBLE = 7;

function ResultsRight({ atsScore, keywords, isPaidUser, onUnlock }) {
  const level = matchLevel(atsScore);
  const foundList = keywords.filter((k) => k.found);
  const missingAll = keywords.filter((k) => !k.found);
  const foundCount = foundList.length;
  const totalKw = keywords.length;
  const missingShown = isPaidUser ? missingAll : missingAll.slice(0, FREE_MISSING_VISIBLE);
  const missingHiddenCount = isPaidUser ? 0 : Math.max(0, missingAll.length - FREE_MISSING_VISIBLE);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ ...S.surface, padding: "18px 18px 16px" }}>
        <div style={{ display: "flex", gap: "16px", alignItems: "center", marginBottom: "10px" }}>
          <ScoreRing score={atsScore} />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
            <StatCard label="Match Level" value={level.label} valueColor={level.color} />
            <StatCard label="Keywords Found" value={`${foundCount} of ${totalKw || 0}`} />
          </div>
        </div>
        <p
          style={{
            margin: 0,
            fontSize: "12px",
            lineHeight: 1.45,
            color: "#A0A0A0",
            fontWeight: 400,
          }}
        >
          Results reflect GCC &amp; India market requirements
        </p>
      </div>

      <div style={{ ...S.surface, overflow: "hidden", padding: "12px 14px 14px" }}>
        <div style={{
          paddingBottom: "10px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{ fontSize: "10px", color: "#525252", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: "500" }}>
            Keyword Match
          </span>
          <span style={{ fontFamily: "monospace", fontSize: "10px", color: "#383838" }}>
            {totalKw} keywords
          </span>
        </div>

        {foundList.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
            {foundList.map((k, i) => (
              <KeywordChip key={`f-${i}`} keyword={k.keyword} found />
            ))}
          </div>
        )}

        {missingShown.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: !isPaidUser ? "12px" : 0 }}>
            {missingShown.map((k, i) => (
              <KeywordChip key={`m-${i}`} keyword={k.keyword} found={false} />
            ))}
          </div>
        )}

        {!isPaidUser && (
          <div
            style={{
              padding: "16px 14px",
              borderRadius: "12px",
              border: "1px solid rgba(255,255,255,0.08)",
              background: "rgba(28,28,28,0.65)",
              backdropFilter: "blur(14px)",
              WebkitBackdropFilter: "blur(14px)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
              textAlign: "center",
            }}
          >
            <LockIcon />
            <p style={{ margin: 0, fontSize: "13px", lineHeight: 1.45, color: "#D1D5DB", fontWeight: 400 }}>
              See your full keyword gap + AI-powered rewrite suggestions
              {missingHiddenCount > 0 ? (
                <span style={{ display: "block", marginTop: "6px", fontSize: "11px", color: "#737373" }}>
                  +{missingHiddenCount} more missing keywords on Pro
                </span>
              ) : null}
            </p>
            <button
              type="button"
              onClick={onUnlock}
              style={{
                width: "100%", padding: "10px 16px",
                background: "#2563EB", color: "#FFFFFF",
                border: "1px solid #2563EB", borderRadius: "8px",
                fontSize: "13px", fontWeight: 600,
                cursor: "pointer", letterSpacing: "0.01em",
                fontFamily: "system-ui, -apple-system, sans-serif",
              }}
            >
              Upgrade
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

export default function ATSScanner({
  cvName = "Ahmed Al Mansouri",
  cvJobTitle = "Sales Manager",
  atsScore = 73,
  keywords = [
    { keyword: "Project Management", found: true },
    { keyword: "Python",             found: true },
    { keyword: "Data Analysis",      found: true },
    { keyword: "Agile / Scrum",      found: false },
    { keyword: "Machine Learning",   found: false },
    { keyword: "REST APIs",          found: true },
    { keyword: "Stakeholder Comms",  found: false },
    { keyword: "SQL / PostgreSQL",   found: true },
  ],
  isPaidUser = false,
  onUnlock = () => {},
  autoStartScanOnMount = false,
  onScanComplete,
}) {
  const [phase, setPhase] = useState("idle");
  const didAutoStart = useRef(false);

  useEffect(() => {
    if (!autoStartScanOnMount || didAutoStart.current) return;
    didAutoStart.current = true;
    setPhase("scanning");
  }, [autoStartScanOnMount]);

  function handleScan() {
    if (phase !== "idle") return;
    setPhase("scanning");
  }

  function handleScanComplete() {
    setPhase("results");
    onScanComplete?.();
  }

  const isScanning = phase === "scanning";
  const isResults  = phase === "results";

  return (
    <>
      <style>{`
        .laser-line {
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: #2563EB;
          box-shadow: 0 0 8px #2563EB;
          animation: laser-sweep 1.5s linear forwards;
          z-index: 2;
        }
        @keyframes laser-sweep {
          from { top: 0; }
          to   { top: 100%; }
        }
        .blink-dot   { opacity: 0.2; animation: blink 1s infinite; }
        .blink-dot-0 { animation-delay: 0s; }
        .blink-dot-1 { animation-delay: 0.2s; }
        .blink-dot-2 { animation-delay: 0.4s; }
        @keyframes blink {
          0%, 100% { opacity: 0.2; }
          50%       { opacity: 1; }
        }
        @media (max-width: 768px) {
          .ats-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={S.root}>
        <div style={S.header}>
          <span style={S.logo}>&gt;&gt;&gt; CVPassport</span>
          <span style={S.headerRight}>ATS Scanner</span>
        </div>

        <div style={S.container}>
          <div className="ats-grid" style={S.grid}>

            {/* LEFT PANEL */}
            <div style={S.panel}>
              <div style={S.panelLabel}>Your document</div>

              <CVSkeleton scanning={isScanning} />

              {phase === "idle" && (
                <p style={{
                  margin: "0", fontSize: "11px", color: "#383838",
                  textAlign: "center", lineHeight: "1.6",
                }}>
                  Your name and role will appear here once scanning begins
                </p>
              )}

              {(isScanning || isResults) && (
                <p style={{ margin: "0", fontSize: "12px", color: "#A0A0A0", lineHeight: "1.5" }}>
                  <span style={{ color: "#525252", fontSize: "10px", fontFamily: "monospace", letterSpacing: "0.04em" }}>Scanning: </span>
                  {cvName}
                  <span style={{ color: "#525252" }}> · </span>
                  {cvJobTitle}
                </p>
              )}

              <ScanButton onClick={handleScan} disabled={phase !== "idle"} />

              <div style={{
                display: "flex", gap: "8px",
              }}>
                {[
                  { label: "Job Title", value: cvJobTitle },
                  { label: "Target Role", value: "Senior " + cvJobTitle.split(" ")[0] },
                ].map((item, i) => (
                  <div key={i} style={{
                    flex: 1, ...S.surface, padding: "10px 12px",
                  }}>
                    <div style={{ fontSize: "9px", color: "#525252", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "4px" }}>
                      {item.label}
                    </div>
                    <div style={{ fontSize: "12px", color: "#A0A0A0" }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT PANEL */}
            <div style={{ ...S.panel, minHeight: "340px" }}>
              <div style={S.panelLabel}>ATS analysis</div>

              {phase === "idle" && <IdleRight />}

              {isScanning && (
                <ScanningRight onComplete={handleScanComplete} />
              )}

              {isResults && (
                <ResultsRight
                  atsScore={atsScore}
                  keywords={keywords}
                  isPaidUser={isPaidUser}
                  onUnlock={onUnlock}
                />
              )}
            </div>

          </div>
        </div>
      </div>
    </>
  );
}
