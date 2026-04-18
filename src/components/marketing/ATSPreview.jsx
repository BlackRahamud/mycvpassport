import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";

const PHASES = [
  { key: "acquiring",   label: "ACQUIRING DOCUMENT",    t: 900 },
  { key: "decomposing", label: "DECOMPOSING LAYERS",    t: 1100 },
  { key: "crossref",    label: "CROSS-REF · GCC + IND", t: 1200 },
  { key: "verdict",     label: "VERDICT RENDERED",      t: 600 },
];

const MISSING = [
  { kw: "Stakeholder Management", cost: "−12 pts" },
  { kw: "Power BI",               cost: "−9 pts"  },
  { kw: "SAP S/4HANA",            cost: "−8 pts"  },
  { kw: "Revenue Forecasting",    cost: "−7 pts"  },
  { kw: "Vendor Negotiation",     cost: "−6 pts"  },
  { kw: "Arabic (conversational)", cost: "−5 pts" },
];

const FIX_LINES = [
  { head: "Rebuild opening 3 lines with quantified wins", body: "Inject revenue, team size, retention % — first-pass ATS weight is 2.4× on early bullets." },
  { head: "Rewire Experience with GCC keyword mapping",   body: "6 role-critical terms missing from Dubai finance listings (last 90 days sample)." },
  { head: "Collapse multi-column template into single flow", body: "Parsers drop sidebar data 38% of the time. You're losing your Skills block silently." },
];

const SUB_ROWS = [
  { v: 38, l: "Keyword density",  note: "Below floor"   },
  { v: 52, l: "Structure parse",  note: "2 blocks lost" },
  { v: 61, l: "Content strength", note: "Too generic"   },
];

function scoreColor(v) {
  if (v <= 40) return "#F87171";
  if (v <= 70) return "#FACC15";
  return "#4ADE80";
}

function usePhase({ hasFile, loop }) {
  const [phaseIdx, setPhaseIdx] = useState(-1);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!hasFile) { setPhaseIdx(-1); setDone(false); return; }
    let cancelled = false;
    let timer;
    async function run() {
      setDone(false);
      for (let i = 0; i < PHASES.length; i++) {
        if (cancelled) return;
        setPhaseIdx(i);
        // eslint-disable-next-line no-await-in-loop, no-loop-func
        await new Promise((r) => { timer = setTimeout(r, PHASES[i].t); });
      }
      if (cancelled) return;
      setDone(true);
      if (loop) {
        timer = setTimeout(() => {
          if (!cancelled) { setPhaseIdx(-1); setDone(false); run(); }
        }, 5400);
      }
    }
    run();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [hasFile, loop]);

  return { phaseIdx, done };
}

function Mono({ children, style, ...rest }) {
  return (
    <span
      style={{ fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace", letterSpacing: "0.06em", ...style }}
      {...rest}
    >
      {children}
    </span>
  );
}

function Crosshair({ size = 10 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10" style={{ display: "block" }}>
      <line x1="5" y1="0" x2="5" y2="10" stroke="#fff" strokeWidth="0.6" />
      <line x1="0" y1="5" x2="10" y2="5" stroke="#fff" strokeWidth="0.6" />
    </svg>
  );
}

function UploadIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function LockIcon({ size = 14, color = "#fff" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0110 0v4" />
    </svg>
  );
}

function CrossIcon({ size = 10 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function ArrowIcon({ size = 14, color = "#000" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}

function XRayDropzone({ file, onPick, phaseIdx }) {
  const inputRef = useRef(null);
  const scanning = phaseIdx >= 0 && phaseIdx < PHASES.length - 1;
  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const f = e.dataTransfer.files?.[0];
        if (f) onPick({ name: f.name });
      }}
      style={{
        position: "relative",
        background: "#0B0B0B",
        border: `1.5px dashed ${file ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.22)"}`,
        borderRadius: 16,
        padding: "28px 22px 24px",
        textAlign: "center",
        cursor: "pointer",
        overflow: "hidden",
        transition: "border-color 300ms ease",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.docx"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick({ name: f.name });
        }}
      />

      {["tl", "tr", "bl", "br"].map((c) => (
        <span
          key={c}
          aria-hidden
          style={{
            position: "absolute",
            width: 14,
            height: 14,
            borderColor: "rgba(255,255,255,0.35)",
            borderStyle: "solid",
            borderWidth: 0,
            ...(c === "tl" && { top: 10, left: 10,  borderTopWidth: 1, borderLeftWidth: 1 }),
            ...(c === "tr" && { top: 10, right: 10, borderTopWidth: 1, borderRightWidth: 1 }),
            ...(c === "bl" && { bottom: 10, left: 10,  borderBottomWidth: 1, borderLeftWidth: 1 }),
            ...(c === "br" && { bottom: 10, right: 10, borderBottomWidth: 1, borderRightWidth: 1 }),
          }}
        />
      ))}

      {scanning && <div className="atsxr-sweep" />}

      <div style={{ position: "absolute", top: 14, left: 22, display: "flex", alignItems: "center", gap: 8 }}>
        <Crosshair />
        <Mono style={{ fontSize: 9, color: "#fff", opacity: 0.55 }}>DEPTH · 00 / 03</Mono>
      </div>
      <div style={{ position: "absolute", top: 14, right: 22 }}>
        <Mono style={{ fontSize: 9, color: "#fff", opacity: 0.55 }}>λ 0.4s</Mono>
      </div>

      <div
        style={{
          width: 58, height: 58, margin: "20px auto 14px",
          borderRadius: 14,
          background: "#0A0A0A",
          border: "1px solid rgba(255,255,255,0.14)",
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative",
        }}
      >
        {!file && (
          <>
            <span className="atsxr-halo"   style={{ position: "absolute", inset: -1, borderRadius: 14, border: "1px solid rgba(255,255,255,0.35)" }} />
            <span className="atsxr-halo atsxr-halo-d" style={{ position: "absolute", inset: -1, borderRadius: 14, border: "1px solid rgba(255,255,255,0.18)" }} />
          </>
        )}
        <UploadIcon size={22} />
      </div>

      <div style={{ fontSize: 17, fontWeight: 700, color: "#fff", letterSpacing: "-0.3px" }}>
        {file ? file.name : "Reveal the Hidden Flaws Holding You Back"}
      </div>
      <div style={{ marginTop: 6, fontSize: 13, color: "#fff", opacity: 0.65, fontWeight: 500 }}>
        {file ? "Document acquired. Exposure in progress." : "Drop your CV — or click to browse."}
      </div>

      <div style={{ marginTop: 14, display: "inline-flex", gap: 14, alignItems: "center", paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <Mono style={{ fontSize: 10, color: "#fff", opacity: 0.6 }}>PDF</Mono>
        <span style={{ width: 3, height: 3, background: "rgba(255,255,255,0.3)", borderRadius: "50%" }} />
        <Mono style={{ fontSize: 10, color: "#fff", opacity: 0.6 }}>DOCX</Mono>
        <span style={{ width: 3, height: 3, background: "rgba(255,255,255,0.3)", borderRadius: "50%" }} />
        <Mono style={{ fontSize: 10, color: "#fff", opacity: 0.6 }}>≤ 10MB</Mono>
      </div>
    </div>
  );
}

function PhaseLog({ phaseIdx, done }) {
  return (
    <div
      style={{
        background: "#0B0B0B",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        padding: "12px 14px",
      }}
    >
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          paddingBottom: 10, marginBottom: 10,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <Mono style={{ fontSize: 10, color: "#fff", opacity: 0.6 }}>X-RAY · SEQUENCE</Mono>
        <Mono style={{ fontSize: 10, color: "#fff", opacity: 0.6 }}>
          {done ? "04 / 04 · COMPLETE" : `${Math.max(0, phaseIdx + 1)} / 04 · LIVE`}
        </Mono>
      </div>

      <div style={{ display: "grid", gap: 5 }}>
        {PHASES.map((p, i) => {
          const isDone = done || i < phaseIdx;
          const isActive = !done && i === phaseIdx;
          const isPending = !isDone && !isActive;
          return (
            <div
              key={p.key}
              style={{
                display: "grid",
                gridTemplateColumns: "14px 16px 1fr auto",
                alignItems: "center",
                gap: 10,
                opacity: isPending ? 0.3 : 1,
                transition: "opacity 200ms ease",
              }}
            >
              <Mono style={{ fontSize: 10, color: "#fff", opacity: 0.5 }}>0{i + 1}</Mono>
              <span
                style={{
                  width: 8, height: 8, borderRadius: 2,
                  background: isDone || isActive ? "#fff" : "transparent",
                  border: isPending ? "1px solid rgba(255,255,255,0.25)" : "none",
                  boxShadow: isActive ? "0 0 8px rgba(255,255,255,0.6)" : "none",
                  animation: isActive ? "atsxr-pulse 0.9s ease-in-out infinite" : "none",
                }}
              />
              <Mono style={{ fontSize: 11.5, color: "#fff", fontWeight: isActive ? 600 : 500 }}>
                {p.label}
                {isActive && <span className="atsxr-ellip" />}
              </Mono>
              <Mono style={{ fontSize: 10, color: "#fff", opacity: 0.45 }}>
                {isDone ? "OK" : isActive ? "···" : "—"}
              </Mono>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MarketReadinessRing({ score, revealed }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    if (!revealed) { setDisplay(0); return; }
    let cancelled = false;
    let raf = 0;
    setDisplay(0);
    const duration = 1500;
    let start = null;
    const easeOutCubic = (t) => 1 - (1 - t) ** 3;
    const step = (now) => {
      if (cancelled) return;
      if (start == null) start = now;
      const t = Math.min(1, (now - start) / duration);
      setDisplay(Math.round(easeOutCubic(t) * score));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => { cancelled = true; cancelAnimationFrame(raf); };
  }, [score, revealed]);

  const color = scoreColor(display);
  const glowMap = {
    "#F87171": "drop-shadow(0 0 12px rgba(248,113,113,0.4))",
    "#FACC15": "drop-shadow(0 0 12px rgba(250,204,21,0.4))",
    "#4ADE80": "drop-shadow(0 0 12px rgba(74,222,128,0.4))",
  };
  const sublabelMap = {
    "#F87171": "Needs work",
    "#FACC15": "On track",
    "#4ADE80": "Market ready",
  };

  return (
    <div
      style={{
        position: "relative", width: 220, height: 220,
        filter: revealed ? (glowMap[color] || "none") : "none",
        transition: "filter 0.3s",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute", inset: 0, borderRadius: "50%", padding: 2,
          background: `conic-gradient(from var(--ats-angle, 0deg), transparent 60%, ${color} 80%, transparent 100%)`,
          WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
          pointerEvents: "none",
          animation: "ats-spin-border 3s linear infinite",
        }}
      />
      <div
        style={{
          position: "absolute", inset: 2, borderRadius: "50%",
          background: "#0A0A0A",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        }}
      >
        <div
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 72, fontWeight: 800, lineHeight: 1,
            letterSpacing: -4, color, transition: "color 0.15s",
          }}
        >
          {display}
        </div>
        <div style={{ fontSize: 11, color: "#A0A0A0", marginTop: 4, letterSpacing: 3, textTransform: "uppercase" }}>
          SCORE
        </div>
        <div style={{ fontSize: 12, color, marginTop: 2, fontWeight: 600, transition: "color 0.15s" }}>
          {sublabelMap[color] || ""}
        </div>
      </div>
    </div>
  );
}

function CostlyKeywords({ revealed }) {
  return (
    <div style={{ display: "grid", gap: 6 }}>
      {MISSING.map((m, i) => (
        <div
          key={m.kw}
          style={{
            display: "grid",
            gridTemplateColumns: "18px 1fr auto",
            alignItems: "center",
            gap: 12,
            padding: "11px 14px",
            background: "#0B0B0B",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 8,
            opacity: revealed ? 1 : 0,
            transform: revealed ? "translateY(0)" : "translateY(8px)",
            transition: `opacity 320ms ease ${i * 70 + 200}ms, transform 320ms ease ${i * 70 + 200}ms`,
          }}
        >
          <span
            style={{
              width: 18, height: 18, borderRadius: 4,
              background: "rgba(239,68,68,0.12)",
              border: "1px solid rgba(239,68,68,0.35)",
              display: "inline-flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <CrossIcon size={8} />
          </span>
          <span style={{ fontSize: 14, color: "#fff", fontWeight: 500, letterSpacing: "-0.1px" }}>{m.kw}</span>
          <Mono style={{ fontSize: 11, color: "#fff", fontWeight: 600, opacity: 0.8 }}>{m.cost}</Mono>
        </div>
      ))}
    </div>
  );
}

function LockedFixes({ revealed }) {
  return (
    <div
      style={{
        position: "relative",
        background: "#0B0B0B",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
        padding: "14px 14px 16px",
        overflow: "hidden",
        opacity: revealed ? 1 : 0,
        transform: revealed ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 500ms ease 400ms, transform 500ms ease 400ms",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <Mono style={{ fontSize: 10, color: "#fff", opacity: 0.6, letterSpacing: "0.18em" }}>
          THE FIX · 9 ACTIONS
        </Mono>
        <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
        <Mono style={{ fontSize: 10, color: "#fff", fontWeight: 600 }}>RESTRICTED</Mono>
      </div>

      <div
        style={{
          filter: "blur(7px) saturate(0.5)",
          pointerEvents: "none",
          userSelect: "none",
          display: "grid",
          gap: 8,
        }}
      >
        {FIX_LINES.map((l, i) => (
          <div
            key={l.head}
            style={{
              display: "grid",
              gridTemplateColumns: "26px 1fr auto",
              gap: 12,
              alignItems: "start",
              padding: "12px 14px",
              background: "#121212",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10,
            }}
          >
            <Mono style={{ fontSize: 11, color: "#fff", fontWeight: 600 }}>0{i + 1}</Mono>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{l.head}</div>
              <div style={{ fontSize: 12, color: "#fff", opacity: 0.7, marginTop: 4 }}>{l.body}</div>
            </div>
            <Mono style={{ fontSize: 11, color: "#fff", fontWeight: 600 }}>+7 PTS</Mono>
          </div>
        ))}
      </div>

      <div
        style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: 20, textAlign: "center",
          background: "linear-gradient(180deg, rgba(10,10,10,0.55) 0%, rgba(10,10,10,0.92) 70%, rgba(10,10,10,0.98) 100%)",
          backdropFilter: "blur(3px)",
          WebkitBackdropFilter: "blur(3px)",
        }}
      >
        <div
          style={{
            width: 46, height: 46, borderRadius: 12,
            background: "#0A0A0A",
            border: "1px solid rgba(255,255,255,0.22)",
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: 12,
            boxShadow: "0 0 0 4px rgba(255,255,255,0.03), 0 10px 30px rgba(0,0,0,0.5)",
          }}
        >
          <LockIcon size={18} />
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", letterSpacing: "-0.3px" }}>
          9 fixes waiting behind this wall
        </div>
        <div style={{ fontSize: 13, color: "#fff", opacity: 0.7, marginTop: 6, maxWidth: 320, lineHeight: 1.5 }}>
          The exact rewrites that turn a binned CV into a callback. Unlock to see what the machine wants.
        </div>
      </div>
    </div>
  );
}

function SubStrip({ revealed }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {SUB_ROWS.map((r, i) => (
        <div
          key={r.l}
          style={{
            display: "grid",
            gridTemplateColumns: "56px 1fr auto",
            gap: 12,
            alignItems: "center",
            padding: "10px 12px",
            background: "#0B0B0B",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 8,
            opacity: revealed ? 1 : 0,
            transform: revealed ? "translateX(0)" : "translateX(-6px)",
            transition: `opacity 320ms ease ${i * 60 + 200}ms, transform 320ms ease ${i * 60 + 200}ms`,
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 700, color: "#fff", letterSpacing: "-0.04em", lineHeight: 1 }}>
            {r.v}
            <Mono style={{ fontSize: 10, opacity: 0.55, marginLeft: 2 }}>/100</Mono>
          </div>
          <div>
            <div style={{ fontSize: 12.5, color: "#fff", fontWeight: 500 }}>{r.l}</div>
            <div
              style={{
                position: "relative",
                height: 2,
                background: "rgba(255,255,255,0.08)",
                borderRadius: 2,
                marginTop: 6,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  width: revealed ? `${r.v}%` : 0,
                  background: "linear-gradient(90deg, #EF4444, #F5B544)",
                  transition: `width 900ms ease ${i * 80 + 400}ms`,
                }}
              />
            </div>
          </div>
          <Mono style={{ fontSize: 10, color: "#fff", opacity: 0.55 }}>{r.note}</Mono>
        </div>
      ))}
    </div>
  );
}

export default function ATSPreview() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const gaugeScore = 47;

  useEffect(() => {
    const t = setTimeout(() => setFile({ name: "Ahmed_AlMansouri_CV.pdf" }), 900);
    return () => clearTimeout(t);
  }, []);

  const { phaseIdx, done } = usePhase({ hasFile: !!file, loop: true });

  const goSignup = () => navigate("/signup");

  return (
    <section
      aria-label="ATS X-Ray preview"
      style={{
        position: "relative",
        background: "#0A0A0A",
        overflow: "hidden",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <style>{`
        @property --ats-angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        @keyframes ats-spin-border { to { --ats-angle: 360deg; } }

        @keyframes atsxr-sweep {
          0%   { top: 0%;   opacity: 0.8; }
          50%  { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
        .atsxr-sweep {
          position: absolute; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.8), transparent);
          box-shadow: 0 0 16px rgba(255,255,255,0.5);
          animation: atsxr-sweep 1.6s ease-in-out infinite;
          pointer-events: none;
          z-index: 2;
        }
        @keyframes atsxr-halo {
          0%   { transform: scale(1);    opacity: 0.6; }
          100% { transform: scale(1.55); opacity: 0;   }
        }
        .atsxr-halo   { animation: atsxr-halo 2.4s ease-out infinite; }
        .atsxr-halo-d { animation-delay: 1.2s; }

        @keyframes atsxr-pulse {
          0%, 100% { opacity: 1;    transform: scale(1);    }
          50%      { opacity: 0.55; transform: scale(1.15); }
        }

        @keyframes atsxr-ellip {
          0%   { content: ""; }
          33%  { content: "."; }
          66%  { content: ".."; }
          100% { content: "..."; }
        }
        .atsxr-ellip::after {
          content: "";
          display: inline-block;
          width: 14px;
          text-align: left;
          animation: atsxr-ellip 1.2s steps(4) infinite;
          margin-left: 2px;
        }

        @keyframes atsxr-drift {
          0%, 100% { transform: translate(0, 0);    }
          50%      { transform: translate(8px, -6px); }
        }
        .atsxr-glow { animation: atsxr-drift 16s ease-in-out infinite; }

        .atsxr-container {
          position: relative;
          max-width: 1280px;
          margin: 0 auto;
          padding: 72px 48px 96px;
        }
        .atsxr-grid {
          display: grid;
          grid-template-columns: 1.05fr 1fr;
          gap: 72px;
          align-items: center;
        }
        .atsxr-h1 {
          font-size: 72px;
          font-weight: 800;
          letter-spacing: -0.04em;
          line-height: 0.98;
          margin: 0 0 28px;
          color: #fff;
          font-family: 'DM Sans', system-ui, sans-serif;
        }
        .atsxr-serif {
          font-family: 'Instrument Serif', 'DM Serif Display', Georgia, serif;
          font-weight: 400;
          font-style: italic;
          letter-spacing: -0.02em;
        }
        @media (max-width: 980px) {
          .atsxr-container { padding: 40px 20px 64px; }
          .atsxr-grid { grid-template-columns: 1fr; gap: 44px; }
          .atsxr-h1 { font-size: 44px; line-height: 1.04; }
        }
      `}</style>

      {/* Lab grid backdrop */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse at 50% 40%, rgba(0,0,0,1) 20%, rgba(0,0,0,0) 75%)",
          WebkitMaskImage: "radial-gradient(ellipse at 50% 40%, rgba(0,0,0,1) 20%, rgba(0,0,0,0) 75%)",
        }}
      />

      {/* Ambient red-glow */}
      <div
        className="atsxr-glow"
        aria-hidden
        style={{
          position: "absolute",
          width: 820,
          height: 520,
          top: -220,
          right: -180,
          background: "radial-gradient(ellipse at center, rgba(239,68,68,0.10), transparent 60%)",
          filter: "blur(10px)",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          width: 620,
          height: 420,
          bottom: -180,
          left: -140,
          background: "radial-gradient(ellipse at center, rgba(255,255,255,0.04), transparent 70%)",
          filter: "blur(10px)",
          pointerEvents: "none",
        }}
      />

      <div className="atsxr-container">
        <div className="atsxr-grid">
          {/* LEFT — Editorial */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
              <Crosshair size={12} />
              <Mono style={{ fontSize: 10.5, color: "#fff", letterSpacing: "0.24em", fontWeight: 600 }}>
                SECTION 01 · THE X-RAY
              </Mono>
              <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.12)" }} />
              <Mono style={{ fontSize: 10.5, color: "#fff", opacity: 0.55, letterSpacing: "0.2em" }}>λ 0.4s</Mono>
            </div>

            <h2 className="atsxr-h1">
              The Machine<br />
              Already <span className="atsxr-serif">Decided.</span><br />
              <span style={{ color: "#fff" }}>See What It Saw.</span>
            </h2>

            <p style={{
              fontSize: 18,
              lineHeight: 1.65,
              color: "#fff",
              fontWeight: 400,
              margin: "0 0 32px",
              maxWidth: 520,
            }}>
              You spent hours perfecting your experience. A robot binned it in{" "}
              <span style={{ fontWeight: 700 }}>0.4 seconds</span> for a missing keyword.
              Stop shouting into the void. See exactly where you're being filtered out — before you hit submit again.
            </p>

            {/* Metric strip — process-claim compliant */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 14,
              overflow: "hidden",
              marginBottom: 28,
              maxWidth: 540,
            }}>
              {[
                { v: "0.4s",      l: "MACHINE DECISION TIME" },
                { v: "ATS",       l: "ENGINEERED SCORING"    },
                { v: "GCC + IND", l: "MARKET TUNED"          },
              ].map((m, i) => (
                <div
                  key={m.l}
                  style={{
                    padding: "14px 16px",
                    borderRight: i < 2 ? "1px solid rgba(255,255,255,0.12)" : "none",
                    background: "rgba(255,255,255,0.015)",
                  }}
                >
                  <div style={{ fontSize: 24, fontWeight: 800, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1 }}>
                    {m.v}
                  </div>
                  <Mono style={{ fontSize: 9.5, color: "#fff", opacity: 0.6, letterSpacing: "0.14em", marginTop: 8, display: "block" }}>
                    {m.l}
                  </Mono>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 22 }}>
              <button
                type="button"
                onClick={goSignup}
                style={{
                  background: "#fff",
                  color: "#000",
                  border: "none",
                  borderRadius: 12,
                  padding: "16px 22px",
                  fontSize: 15,
                  fontWeight: 700,
                  letterSpacing: "-0.1px",
                  fontFamily: "inherit",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 10,
                  boxShadow: "0 0 0 1px rgba(255,255,255,0.12), 0 10px 30px rgba(0,0,0,0.4)",
                  transition: "transform 150ms ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
              >
                Stop Being Ignored. Fix It Now.
                <ArrowIcon />
              </button>
            </div>
            <div style={{ fontSize: 13, color: "#fff", opacity: 0.7, marginBottom: 28 }}>
              2 minutes to fix. Lifetime to benefit.
            </div>

            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 14px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.02)",
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: "#fff",
                boxShadow: "0 0 8px rgba(255,255,255,0.6)",
              }} />
              <Mono style={{ fontSize: 11, color: "#fff", fontWeight: 600, letterSpacing: "0.1em" }}>
                TUNED FOR THE GCC JOB MARKET &amp; INDIAN MARKETS
              </Mono>
            </div>
          </div>

          {/* RIGHT — The Instrument */}
          <div style={{
            position: "relative",
            background: "#0A0A0A",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 18,
            padding: 18,
            display: "grid",
            gap: 12,
            boxShadow: "0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.02) inset",
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              paddingBottom: 12,
              borderBottom: "1px solid rgba(255,255,255,0.08)",
            }}>
              <Crosshair size={11} />
              <Mono style={{ fontSize: 10.5, color: "#fff", letterSpacing: "0.18em", fontWeight: 600 }}>
                X-RAY · SUBJECT 00421
              </Mono>
              <span style={{ flex: 1 }} />
              <Mono style={{ fontSize: 10.5, color: "#fff", opacity: 0.55 }}>
                {done ? "VERDICT READY" : phaseIdx < 0 ? "AWAITING DOC" : "EXPOSING"}
              </Mono>
              <span style={{
                width: 7, height: 7, borderRadius: "50%",
                background: done ? "#EF4444" : "#fff",
                boxShadow: done ? "0 0 10px rgba(239,68,68,0.6)" : "0 0 10px #fff",
                animation: !done && phaseIdx >= 0 ? "atsxr-pulse 0.9s ease-in-out infinite" : "none",
              }} />
            </div>

            <XRayDropzone file={file} onPick={setFile} phaseIdx={phaseIdx} />

            <PhaseLog phaseIdx={phaseIdx} done={done} />

            <div style={{
              background: "#0B0B0B",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 14,
              padding: "20px 18px 18px",
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: 24,
              alignItems: "center",
            }}>
              <MarketReadinessRing score={gaugeScore} revealed={done} />
              <div style={{ display: "grid", gap: 14 }}>
                <div>
                  <Mono style={{ fontSize: 10, color: "#fff", opacity: 0.6, letterSpacing: "0.2em" }}>
                    VERDICT · THE MACHINE
                  </Mono>
                  <div style={{
                    fontSize: 19,
                    fontWeight: 700,
                    color: "#fff",
                    letterSpacing: "-0.02em",
                    marginTop: 6,
                    lineHeight: 1.25,
                    opacity: done ? 1 : 0.25,
                    transition: "opacity 400ms ease",
                  }}>
                    {done ? "You're being filtered out before a human sees you." : "Exposing hidden layers…"}
                  </div>
                </div>
                <SubStrip revealed={done} />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <Mono style={{ fontSize: 10.5, color: "#fff", letterSpacing: "0.18em", fontWeight: 600 }}>
                  THE KEYWORDS COSTING YOU THE INTERVIEW
                </Mono>
                <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
                <Mono style={{ fontSize: 10, color: "#fff", opacity: 0.55 }}>06 HITS</Mono>
              </div>
              <CostlyKeywords revealed={done} />
            </div>

            <LockedFixes revealed={done} />

            <button
              type="button"
              onClick={goSignup}
              style={{
                position: "relative",
                background: "#fff",
                color: "#000",
                border: "none",
                borderRadius: 12,
                padding: "16px 18px",
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: "-0.1px",
                fontFamily: "inherit",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                boxShadow: "0 0 0 1px rgba(255,255,255,0.14), 0 12px 36px rgba(0,0,0,0.55)",
                overflow: "hidden",
                transition: "opacity 150ms ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.92"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
            >
              <LockIcon size={15} color="#000" />
              Stop Being Ignored. Fix It Now.
              <ArrowIcon />
            </button>

            <div style={{ textAlign: "center", marginTop: -2 }}>
              <Mono style={{ fontSize: 10.5, color: "#fff", opacity: 0.7, letterSpacing: "0.14em" }}>
                2 MINUTES TO FIX · LIFETIME TO BENEFIT
              </Mono>
            </div>
          </div>
        </div>

        <div style={{
          marginTop: 64,
          display: "flex",
          alignItems: "center",
          gap: 14,
          borderTop: "1px solid rgba(255,255,255,0.08)",
          paddingTop: 18,
        }}>
          <Mono style={{ fontSize: 10, color: "#fff", opacity: 0.5, letterSpacing: "0.18em" }}>
            CVPASSPORT · X-RAY INSTRUMENT
          </Mono>
          <span style={{ flex: 1 }} />
          <Mono style={{ fontSize: 10, color: "#fff", opacity: 0.5, letterSpacing: "0.18em" }}>
            NO CREDIT CARD · NO SIGNUP
          </Mono>
        </div>
      </div>
    </section>
  );
}
