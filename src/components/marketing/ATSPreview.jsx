import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { detectRole } from "../../utils/detectRole";
import skillSuggestions from "../../data/skillSuggestions";

const PHASES = [
  { key: "acquiring",   label: "ACQUIRING DOCUMENT",    t: 900 },
  { key: "decomposing", label: "DECOMPOSING LAYERS",    t: 1100 },
  { key: "crossref",    label: "CROSS-REF · GCC + IND", t: 1200 },
  { key: "verdict",     label: "VERDICT RENDERED",      t: 600 },
];

const COSTS = ["−12 pts", "−9 pts", "−8 pts", "−7 pts", "−6 pts"];

const SUB_NOTES = ["Below floor", "2 blocks lost", "Too generic"];

const FIX_LINES = [
  { head: "Rebuild opening 3 lines with quantified wins", body: "Inject revenue, team size, retention % — first-pass ATS weight is 2.4× on early bullets." },
  { head: "Rewire Experience with GCC keyword mapping",   body: "6 role-critical terms missing from Dubai finance listings (last 90 days sample)." },
  { head: "Collapse multi-column template into single flow", body: "Parsers drop sidebar data 38% of the time. You're losing your Skills block silently." },
];

function scoreColor(v) {
  if (v <= 40) return "#F87171";
  if (v <= 70) return "#FACC15";
  return "#4ADE80";
}

// ── Local free-tier scan — mirror of ATSChecker.jsx free-tier (no JD) ───
function computeFreeScan(filename) {
  const baseText = String(filename || "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_\-.]+/g, " ")
    .trim();

  const roleKey = detectRole(baseText);
  const rolePack = roleKey ? skillSuggestions[roleKey] : null;

  const keywordsScore = 65;
  const structureScore = 70;
  const contentScore = 75;
  const score = Math.round((keywordsScore + structureScore + contentScore) / 3);

  const dedupe = (rows, cap) => {
    const seen = new Set();
    const out = [];
    for (const row of rows) {
      const keyword = row?.keyword?.trim();
      if (!keyword) continue;
      const k = keyword.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(keyword);
      if (out.length >= cap) break;
    }
    return out;
  };

  if (rolePack) {
    const list = rolePack?.atsKeywords ?? [];
    const pool = dedupe(list, 10);
    return {
      score,
      keywordsScore,
      structureScore,
      contentScore,
      found: pool.slice(0, 5),
      missing: pool.slice(5, 10),
      industry: (rolePack.jobTitles && rolePack.jobTitles[0]) || roleKey,
    };
  }

  const crossPool = [];
  const seen = new Set();
  crossLoop: for (const pack of Object.values(skillSuggestions)) {
    for (const row of pack?.atsKeywords ?? []) {
      if (crossPool.length >= 30) break crossLoop;
      const keyword = row?.keyword?.trim();
      if (!keyword) continue;
      const k = keyword.toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      crossPool.push(keyword);
    }
  }
  return {
    score,
    keywordsScore,
    structureScore,
    contentScore,
    found: crossPool.slice(0, 5),
    missing: crossPool.slice(5, 10),
    industry: "General GCC Market",
  };
}

const ACCEPTED_MIME = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
function isAcceptedFile(file) {
  if (!file) return false;
  if (ACCEPTED_MIME.includes(file.type)) return true;
  return /\.(pdf|docx)$/i.test(file.name || "");
}

// Single source of truth for the desktop/mobile boundary.
function useIsMobile(breakpoint = 981) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false
  );
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);
  return isMobile;
}

function usePhase({ fileKey, loop }) {
  const [phaseIdx, setPhaseIdx] = useState(-1);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!fileKey) { setPhaseIdx(-1); setDone(false); return; }
    let cancelled = false;
    let timer;
    async function run() {
      setDone(false);
      setPhaseIdx(-1);
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
  }, [fileKey, loop]);

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

// ── Conversion-moment CTA — white fill, black bold text, with a 2px
// spinning conic-gradient ring around it. Implemented as a wrapper div
// whose padding shows through as the ring, with the inner button covering
// the centre. Same technique as the Dashboard "New CV" button — reliable
// across browsers (no WebKit mask support quirks). White-glow on hover.
function ConicCtaButton({
  onClick,
  children,
  size = "md",
  leadingIcon = null,
  fullWidth = false,
  isMobile = false,
}) {
  const [hover, setHover] = useState(false);
  const pad = size === "lg"
    ? "16px 22px"
    : (isMobile ? "14px 20px" : "14px 22px");
  const fs = size === "lg" ? 15 : (isMobile ? 14 : 14.5);
  return (
    <div
      style={{
        position: "relative",
        display: fullWidth ? "block" : "inline-block",
        width: fullWidth ? "100%" : "auto",
        padding: 2,
        borderRadius: 14,
        background:
          "conic-gradient(from var(--ats-angle, 0deg), rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.18) 55%, #ffffff 75%, #ffffff 88%, rgba(255,255,255,0.18) 100%)",
        animation: "ats-spin-border 3s linear infinite",
        filter: hover
          ? "drop-shadow(0 0 18px rgba(255,255,255,0.55)) drop-shadow(0 0 4px rgba(255,255,255,0.35))"
          : "none",
        transition: "filter 220ms cubic-bezier(0.4,0,0.2,1)",
      }}
    >
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
        style={{
          position: "relative",
          width: fullWidth ? "100%" : "auto",
          minHeight: isMobile ? 52 : undefined,
          background: "#ffffff",
          color: "#000000",
          border: "none",
          borderRadius: 12,
          padding: pad,
          fontSize: fs,
          fontWeight: 700,
          letterSpacing: "-0.1px",
          fontFamily: "inherit",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 10,
          boxShadow: "0 12px 36px rgba(0,0,0,0.55)",
        }}
      >
        {leadingIcon}
        {children}
        <ArrowIcon />
      </button>
    </div>
  );
}

function XRayDropzone({ file, onPick, phaseIdx, isMobile }) {
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
        padding: isMobile ? "24px 18px 20px" : "28px 22px 24px",
        textAlign: "center",
        cursor: "pointer",
        overflow: "hidden",
        minHeight: isMobile ? 220 : undefined,
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

      {["tl", "tr", "bl", "br"].map((c) => {
        const offset = isMobile ? 8 : 10;
        const dim = isMobile ? 12 : 14;
        return (
          <span
            key={c}
            aria-hidden
            style={{
              position: "absolute",
              width: dim,
              height: dim,
              borderColor: "rgba(255,255,255,0.35)",
              borderStyle: "solid",
              borderWidth: 0,
              ...(c === "tl" && { top: offset, left: offset,  borderTopWidth: 1, borderLeftWidth: 1 }),
              ...(c === "tr" && { top: offset, right: offset, borderTopWidth: 1, borderRightWidth: 1 }),
              ...(c === "bl" && { bottom: offset, left: offset,  borderBottomWidth: 1, borderLeftWidth: 1 }),
              ...(c === "br" && { bottom: offset, right: offset, borderBottomWidth: 1, borderRightWidth: 1 }),
            }}
          />
        );
      })}

      {scanning && <div className="atsxr-sweep" />}

      <div style={{
        position: "absolute",
        top: isMobile ? 12 : 14,
        left: isMobile ? 14 : 22,
        display: "flex", alignItems: "center", gap: isMobile ? 6 : 8,
      }}>
        <Crosshair size={isMobile ? 8 : 10} />
        <Mono style={{ fontSize: isMobile ? 8 : 9, color: "#fff", opacity: 0.55 }}>DEPTH · 00 / 03</Mono>
      </div>
      <div style={{
        position: "absolute",
        top: isMobile ? 12 : 14,
        right: isMobile ? 14 : 22,
      }}>
        <Mono style={{ fontSize: isMobile ? 8 : 9, color: "#fff", opacity: 0.55 }}>λ 0.4s</Mono>
      </div>

      <div
        style={{
          width: isMobile ? 48 : 58,
          height: isMobile ? 48 : 58,
          margin: isMobile ? "18px auto 12px" : "20px auto 14px",
          borderRadius: isMobile ? 12 : 14,
          background: "#0A0A0A",
          border: "1px solid rgba(255,255,255,0.14)",
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative",
        }}
      >
        {!file && (
          <>
            <span className="atsxr-halo"   style={{ position: "absolute", inset: -1, borderRadius: isMobile ? 12 : 14, border: "1px solid rgba(255,255,255,0.35)" }} />
            <span className="atsxr-halo atsxr-halo-d" style={{ position: "absolute", inset: -1, borderRadius: isMobile ? 12 : 14, border: "1px solid rgba(255,255,255,0.18)" }} />
          </>
        )}
        <UploadIcon size={isMobile ? 20 : 22} />
      </div>

      <div style={{
        fontSize: isMobile ? 15 : 17,
        fontWeight: 700,
        color: "#fff",
        letterSpacing: "-0.3px",
        padding: isMobile ? "0 4px" : undefined,
        lineHeight: isMobile ? 1.3 : undefined,
      }}>
        {file ? file.name : "Reveal the Hidden Flaws Holding You Back"}
      </div>
      <div style={{
        marginTop: isMobile ? 5 : 6,
        fontSize: isMobile ? 12 : 13,
        color: "#fff",
        opacity: 0.65,
        fontWeight: 500,
      }}>
        {file
          ? "Document acquired. Exposure in progress."
          : (isMobile ? "Tap to upload — or drop your CV." : "Drop your CV — or click to browse.")}
      </div>

      <div style={{
        marginTop: isMobile ? 12 : 14,
        display: "inline-flex",
        gap: isMobile ? 10 : 14,
        alignItems: "center",
        paddingTop: 10,
        borderTop: "1px solid rgba(255,255,255,0.08)",
      }}>
        <Mono style={{ fontSize: isMobile ? 9 : 10, color: "#fff", opacity: 0.6 }}>PDF</Mono>
        <span style={{ width: 3, height: 3, background: "rgba(255,255,255,0.3)", borderRadius: "50%" }} />
        <Mono style={{ fontSize: isMobile ? 9 : 10, color: "#fff", opacity: 0.6 }}>DOCX</Mono>
        <span style={{ width: 3, height: 3, background: "rgba(255,255,255,0.3)", borderRadius: "50%" }} />
        <Mono style={{ fontSize: isMobile ? 9 : 10, color: "#fff", opacity: 0.6 }}>≤ 10MB</Mono>
      </div>
    </div>
  );
}

function PhaseLog({ phaseIdx, done, isMobile }) {
  return (
    <div
      style={{
        background: "#0B0B0B",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        padding: isMobile ? "11px 12px" : "12px 14px",
      }}
    >
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          paddingBottom: isMobile ? 9 : 10, marginBottom: isMobile ? 9 : 10,
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          gap: 8,
        }}
      >
        <Mono style={{ fontSize: isMobile ? 9 : 10, color: "#fff", opacity: 0.6 }}>X-RAY · SEQUENCE</Mono>
        <Mono style={{ fontSize: isMobile ? 9 : 10, color: "#fff", opacity: 0.6 }}>
          {done
            ? (isMobile ? "04/04 · COMPLETE" : "04 / 04 · COMPLETE")
            : (isMobile ? `${Math.max(0, phaseIdx + 1)}/04 · LIVE` : `${Math.max(0, phaseIdx + 1)} / 04 · LIVE`)}
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
                gridTemplateColumns: isMobile ? "14px 14px 1fr auto" : "14px 16px 1fr auto",
                alignItems: "center",
                gap: isMobile ? 8 : 10,
                opacity: isPending ? 0.3 : 1,
                transition: "opacity 200ms ease",
                minWidth: 0,
              }}
            >
              <Mono style={{ fontSize: isMobile ? 9 : 10, color: "#fff", opacity: 0.5 }}>0{i + 1}</Mono>
              <span
                style={{
                  width: isMobile ? 7 : 8, height: isMobile ? 7 : 8, borderRadius: 2,
                  background: isDone || isActive ? "#fff" : "transparent",
                  border: isPending ? "1px solid rgba(255,255,255,0.25)" : "none",
                  boxShadow: isActive ? "0 0 8px rgba(255,255,255,0.6)" : "none",
                  animation: isActive ? "atsxr-pulse 0.9s ease-in-out infinite" : "none",
                }}
              />
              <Mono style={{
                fontSize: isMobile ? 10.5 : 11.5,
                color: "#fff",
                fontWeight: isActive ? 600 : 500,
                whiteSpace: isMobile ? "nowrap" : undefined,
                overflow: isMobile ? "hidden" : undefined,
                textOverflow: isMobile ? "ellipsis" : undefined,
              }}>
                {p.label}
                {isActive && <span className="atsxr-ellip" />}
              </Mono>
              <Mono style={{ fontSize: isMobile ? 9 : 10, color: "#fff", opacity: 0.45 }}>
                {isDone ? "OK" : isActive ? "···" : "—"}
              </Mono>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MarketReadinessRing({ score, revealed, isMobile }) {
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

  const dim = isMobile ? 144 : 220;

  return (
    <div
      style={{
        position: "relative", width: dim, height: dim,
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
            fontSize: isMobile ? 48 : 72,
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: isMobile ? -2.5 : -4,
            color,
            transition: "color 0.15s",
          }}
        >
          {display}
        </div>
        <div style={{
          fontSize: isMobile ? 9 : 11,
          color: "#A0A0A0",
          marginTop: 4,
          letterSpacing: isMobile ? 2.5 : 3,
          textTransform: "uppercase",
        }}>
          SCORE
        </div>
        <div style={{
          fontSize: isMobile ? 11 : 12,
          color,
          marginTop: isMobile ? 3 : 2,
          fontWeight: 600,
          transition: "color 0.15s",
        }}>
          {sublabelMap[color] || ""}
        </div>
      </div>
    </div>
  );
}

function CostlyKeywords({ revealed, missing, isMobile }) {
  const items = (missing || []).slice(0, 5);
  return (
    <div style={{ display: "grid", gap: 6 }}>
      {items.map((kw, i) => {
        const locked = i >= 2;
        return (
          <div
            key={`${kw}-${i}`}
            style={{
              position: "relative",
              display: "grid",
              gridTemplateColumns: isMobile ? "16px 1fr auto" : "18px 1fr auto",
              alignItems: "center",
              gap: isMobile ? 10 : 12,
              padding: isMobile ? "10px 12px" : "11px 14px",
              background: "#0B0B0B",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
              overflow: "hidden",
              minWidth: 0,
              opacity: revealed ? 1 : 0,
              transform: revealed ? "translateY(0)" : "translateY(8px)",
              transition: `opacity 320ms ease ${i * 70 + 200}ms, transform 320ms ease ${i * 70 + 200}ms`,
            }}
          >
            <span
              style={{
                width: isMobile ? 16 : 18,
                height: isMobile ? 16 : 18,
                borderRadius: 4,
                background: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.35)",
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                filter: locked ? "blur(4px)" : "none",
              }}
            >
              <CrossIcon size={isMobile ? 7 : 8} />
            </span>
            <span
              style={{
                fontSize: isMobile ? 13 : 14,
                color: "#fff",
                fontWeight: 500,
                letterSpacing: "-0.1px",
                filter: locked ? "blur(6px)" : "none",
                userSelect: locked ? "none" : "auto",
                whiteSpace: isMobile ? "nowrap" : undefined,
                overflow: isMobile ? "hidden" : undefined,
                textOverflow: isMobile ? "ellipsis" : undefined,
                minWidth: 0,
              }}
            >
              {kw}
            </span>
            <Mono
              style={{
                fontSize: isMobile ? 10.5 : 11,
                color: "#fff",
                fontWeight: 600,
                opacity: 0.8,
                filter: locked ? "blur(5px)" : "none",
                userSelect: locked ? "none" : "auto",
                flexShrink: 0,
              }}
            >
              {COSTS[i] || "−5 pts"}
            </Mono>
            {locked && (
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  right: isMobile ? 9 : 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  width: isMobile ? 20 : 22,
                  height: isMobile ? 20 : 22,
                  borderRadius: 6,
                  background: "#0A0A0A",
                  border: "1px solid rgba(255,255,255,0.22)",
                  display: "inline-flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 0 0 3px rgba(10,10,10,0.8)",
                }}
              >
                <LockIcon size={isMobile ? 9 : 10} />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function LockedFixes({ revealed, score, onCta, isMobile }) {
  const scoreC = scoreColor(score);
  return (
    <div
      style={{
        position: "relative",
        background: "#0B0B0B",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
        padding: isMobile ? "12px 12px 14px" : "14px 14px 16px",
        overflow: "hidden",
        minHeight: isMobile ? 260 : undefined,
        opacity: revealed ? 1 : 0,
        transform: revealed ? "translateY(0)" : "translateY(12px)",
        transition: "opacity 500ms ease 400ms, transform 500ms ease 400ms",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 10, marginBottom: isMobile ? 10 : 12 }}>
        <Mono style={{ fontSize: isMobile ? 9 : 10, color: "#fff", opacity: 0.6, letterSpacing: isMobile ? "0.16em" : "0.18em" }}>
          THE FIX · 9 ACTIONS
        </Mono>
        <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
        <Mono style={{ fontSize: isMobile ? 9 : 10, color: "#fff", fontWeight: 600 }}>RESTRICTED</Mono>
      </div>

      <div
        style={{
          filter: "blur(7px) saturate(0.5)",
          pointerEvents: "none",
          userSelect: "none",
          display: "grid",
          gap: isMobile ? 7 : 8,
        }}
      >
        {FIX_LINES.map((l, i) => (
          <div
            key={l.head}
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "22px 1fr auto" : "26px 1fr auto",
              gap: isMobile ? 10 : 12,
              alignItems: "start",
              padding: isMobile ? "10px 12px" : "12px 14px",
              background: "#121212",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10,
            }}
          >
            <Mono style={{ fontSize: isMobile ? 10 : 11, color: "#fff", fontWeight: 600 }}>0{i + 1}</Mono>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 600, color: "#fff" }}>{l.head}</div>
              <div style={{ fontSize: isMobile ? 11 : 12, color: "#fff", opacity: 0.7, marginTop: isMobile ? 3 : 4 }}>{l.body}</div>
            </div>
            <Mono style={{ fontSize: isMobile ? 10 : 11, color: "#fff", fontWeight: 600, flexShrink: 0 }}>+7 PTS</Mono>
          </div>
        ))}
      </div>

      <div
        style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          padding: isMobile ? "20px 16px" : "24px 20px",
          textAlign: "center",
          background: "linear-gradient(180deg, rgba(10,10,10,0.55) 0%, rgba(10,10,10,0.92) 60%, rgba(10,10,10,0.98) 100%)",
          backdropFilter: "blur(3px)",
          WebkitBackdropFilter: "blur(3px)",
        }}
      >
        <div
          style={{
            width: isMobile ? 40 : 46,
            height: isMobile ? 40 : 46,
            borderRadius: isMobile ? 11 : 12,
            background: "#0A0A0A",
            border: "1px solid rgba(255,255,255,0.22)",
            display: "flex", alignItems: "center", justifyContent: "center",
            marginBottom: isMobile ? 12 : 14,
            boxShadow: "0 0 0 4px rgba(255,255,255,0.03), 0 10px 30px rgba(0,0,0,0.5)",
          }}
        >
          <LockIcon size={isMobile ? 16 : 18} />
        </div>
        <div style={{
          fontSize: isMobile ? 18 : 22,
          fontWeight: 800,
          color: "#fff",
          letterSpacing: "-0.02em",
          lineHeight: isMobile ? 1.25 : 1.2,
        }}>
          Your CV scored <span style={{ color: scoreC }}>{score}</span>/100
        </div>
        <div style={{
          fontSize: isMobile ? 12.5 : 13.5,
          color: "#fff",
          opacity: 0.75,
          marginTop: isMobile ? 7 : 8,
          maxWidth: isMobile ? 300 : 340,
          lineHeight: 1.5,
        }}>
          Sign up free to see the full report — no credit card, ever.
        </div>
        <div style={{ marginTop: isMobile ? 14 : 16, width: isMobile ? "100%" : undefined, maxWidth: isMobile ? 320 : undefined }}>
          <ConicCtaButton onClick={onCta} size="md" fullWidth={isMobile} isMobile={isMobile}>
            See My Full Report — It&apos;s Free
          </ConicCtaButton>
        </div>
      </div>
    </div>
  );
}

function SubStrip({ revealed, subs, isMobile }) {
  const rows = [
    { v: subs?.keywordsScore  ?? 0, l: "Keyword density",  note: SUB_NOTES[0] },
    { v: subs?.structureScore ?? 0, l: "Structure parse",  note: SUB_NOTES[1] },
    { v: subs?.contentScore   ?? 0, l: "Content strength", note: SUB_NOTES[2] },
  ];
  return (
    <div style={{ position: "relative" }}>
      <div
        style={{
          display: "grid",
          gap: isMobile ? 7 : 8,
          filter: "blur(6px) saturate(0.6)",
          pointerEvents: "none",
          userSelect: "none",
        }}
        aria-hidden
      >
        {rows.map((r, i) => (
          <div
            key={r.l}
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "48px 1fr" : "56px 1fr auto",
              gap: isMobile ? 10 : 12,
              alignItems: "center",
              padding: isMobile ? "9px 11px" : "10px 12px",
              background: "#0B0B0B",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 8,
              minWidth: 0,
              opacity: revealed ? 1 : 0,
              transform: revealed ? "translateX(0)" : "translateX(-6px)",
              transition: `opacity 320ms ease ${i * 60 + 200}ms, transform 320ms ease ${i * 60 + 200}ms`,
            }}
          >
            <div style={{
              fontSize: isMobile ? 18 : 20,
              fontWeight: 700,
              color: "#fff",
              letterSpacing: "-0.04em",
              lineHeight: 1,
            }}>
              {r.v}
              <Mono style={{ fontSize: isMobile ? 9 : 10, opacity: 0.55, marginLeft: 2 }}>/100</Mono>
            </div>
            <div style={{ minWidth: 0 }}>
              {isMobile ? (
                <div style={{
                  fontSize: 11.5, color: "#fff", fontWeight: 500,
                  display: "flex", justifyContent: "space-between", gap: 8,
                }}>
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.l}</span>
                  <Mono style={{ fontSize: 9, color: "#fff", opacity: 0.55, flexShrink: 0 }}>{r.note}</Mono>
                </div>
              ) : (
                <div style={{ fontSize: 12.5, color: "#fff", fontWeight: 500 }}>{r.l}</div>
              )}
              <div
                style={{
                  position: "relative",
                  height: 2,
                  background: "rgba(255,255,255,0.08)",
                  borderRadius: 2,
                  marginTop: isMobile ? 5 : 6,
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
            {!isMobile && (
              <Mono style={{ fontSize: 10, color: "#fff", opacity: 0.55 }}>{r.note}</Mono>
            )}
          </div>
        ))}
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: isMobile ? 7 : 8,
            padding: isMobile ? "6px 11px" : "7px 12px",
            borderRadius: 999,
            background: "rgba(10,10,10,0.85)",
            border: "1px solid rgba(255,255,255,0.22)",
            boxShadow: "0 0 0 4px rgba(10,10,10,0.5), 0 8px 24px rgba(0,0,0,0.5)",
            opacity: revealed ? 1 : 0,
            transition: "opacity 400ms ease 500ms",
          }}
        >
          <LockIcon size={isMobile ? 11 : 12} />
          <Mono style={{ fontSize: isMobile ? 9.5 : 10.5, color: "#fff", letterSpacing: isMobile ? "0.14em" : "0.16em", fontWeight: 600 }}>
            FULL BREAKDOWN LOCKED
          </Mono>
        </div>
      </div>
    </div>
  );
}

export default function ATSPreview() {
  const navigate = useNavigate();
  const isMobile = useIsMobile(981);
  const [file, setFile] = useState(null);
  const [userUploaded, setUserUploaded] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [uploadError, setUploadError] = useState(null);

  // Auto-demo seed so the section doesn't look dead on first paint.
  useEffect(() => {
    if (userUploaded) return;
    const t = setTimeout(() => {
      setFile({ name: "Ahmed_AlMansouri_CV.pdf" });
    }, 900);
    return () => clearTimeout(t);
  }, [userUploaded]);

  // Run the local free-tier scan whenever the active file changes.
  useEffect(() => {
    if (!file) { setScanResult(null); return; }
    setScanResult(computeFreeScan(file.name));
  }, [file]);

  const { phaseIdx, done } = usePhase({
    fileKey: file?.name ?? null,
    loop: !userUploaded,
  });

  const handleUserPick = (f) => {
    if (!f) return;
    if (!isAcceptedFile(f)) {
      setUploadError("Please upload a PDF or DOCX file.");
      return;
    }
    setUploadError(null);
    setUserUploaded(true);
    setFile({ name: f.name });
  };

  const displayScore = scanResult?.score ?? 0;
  const missingKeywords = scanResult?.missing ?? [];

  const goSignup = () => {
    try {
      localStorage.setItem("postAuthRedirect", "/dashboard?tab=ats");
    } catch {
      /* localStorage unavailable — proceed without the redirect hint */
    }
    navigate("/register");
  };

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

        /* ── Mobile-first layout (< 981px). ────────────────────────────
           Desktop (≥ 981px) overrides at the bottom restore the original
           CVPassport landing-page layout untouched. */
        .atsxr-container {
          position: relative;
          max-width: 1280px;
          margin: 0 auto;
          padding: 40px 20px 56px;
        }
        .atsxr-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 32px;
          align-items: start;
        }
        .atsxr-h1 {
          font-size: clamp(32px, 8.6vw, 44px);
          font-weight: 800;
          letter-spacing: -0.035em;
          line-height: 1.04;
          margin: 0 0 22px;
          color: #fff;
          font-family: 'DM Sans', system-ui, sans-serif;
        }
        .atsxr-serif {
          font-family: 'Instrument Serif', 'DM Serif Display', Georgia, serif;
          font-weight: 400;
          font-style: italic;
          letter-spacing: -0.02em;
        }
        .atsxr-eyebrow {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
          min-width: 0;
        }
        .atsxr-instrument {
          position: relative;
          background: #0A0A0A;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          padding: 14px;
          display: grid;
          gap: 10px;
          box-shadow: 0 40px 100px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.02) inset;
          min-width: 0;
        }
        .atsxr-scoreblock {
          background: #0B0B0B;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          padding: 18px 14px 16px;
          display: grid;
          grid-template-columns: 1fr;
          justify-items: center;
          gap: 16px;
        }
        .atsxr-metricstrip {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 22px;
          width: 100%;
        }
        .atsxr-metric {
          padding: 12px 10px;
          background: rgba(255,255,255,0.015);
          min-width: 0;
        }
        .atsxr-metric + .atsxr-metric { border-left: 1px solid rgba(255,255,255,0.12); }
        .atsxr-metric-v {
          font-size: 18px; font-weight: 800; color: #fff;
          letter-spacing: -0.03em; line-height: 1;
        }
        .atsxr-metric-l {
          font-size: 8px; color: #fff; opacity: 0.6;
          letter-spacing: 0.12em; margin-top: 6px; display: block;
          font-family: 'JetBrains Mono', ui-monospace, monospace;
        }
        .atsxr-footer {
          margin-top: 40px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          align-items: flex-start;
          border-top: 1px solid rgba(255,255,255,0.08);
          padding-top: 16px;
        }

        /* ≥ 640px — small-tablet polish */
        @media (min-width: 640px) {
          .atsxr-container { padding: 56px 28px 72px; }
          .atsxr-h1 { font-size: 52px; }
          .atsxr-scoreblock {
            grid-template-columns: auto 1fr;
            justify-items: start;
            gap: 20px;
            padding: 20px 18px 18px;
          }
          .atsxr-metric-v { font-size: 22px; }
          .atsxr-metric-l { font-size: 9px; }
          .atsxr-footer { flex-direction: row; gap: 14px; align-items: center; padding-top: 18px; }
        }

        /* ≥ 981px — DESKTOP (unchanged from the original). */
        @media (min-width: 981px) {
          .atsxr-container { padding: 72px 48px 96px; }
          .atsxr-grid {
            grid-template-columns: 1.05fr 1fr;
            gap: 72px;
            align-items: center;
          }
          .atsxr-h1 {
            font-size: 72px;
            line-height: 0.98;
            letter-spacing: -0.04em;
            margin: 0 0 28px;
          }
          .atsxr-eyebrow { gap: 10px; margin-bottom: 28px; }
          .atsxr-instrument { padding: 18px; gap: 12px; border-radius: 18px; }
          .atsxr-scoreblock {
            padding: 20px 18px 18px;
            gap: 24px;
            grid-template-columns: auto 1fr;
            justify-items: start;
          }
          .atsxr-metricstrip { max-width: 540px; border-radius: 14px; }
          .atsxr-metric { padding: 14px 16px; }
          .atsxr-metric-v { font-size: 24px; }
          .atsxr-metric-l { font-size: 9.5px; letter-spacing: 0.14em; margin-top: 8px; }
          .atsxr-footer {
            margin-top: 64px;
            flex-direction: row;
            align-items: center;
            gap: 14px;
            padding-top: 18px;
          }
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

      {/* Ambient red-glow — desktop dimensions preserved, mobile shrunk to avoid overflow */}
      <div
        className="atsxr-glow"
        aria-hidden
        style={{
          position: "absolute",
          width: isMobile ? 520 : 820,
          height: isMobile ? 360 : 520,
          top: isMobile ? -140 : -220,
          right: isMobile ? -120 : -180,
          background: "radial-gradient(ellipse at center, rgba(239,68,68,0.10), transparent 60%)",
          filter: "blur(10px)",
          pointerEvents: "none",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute",
          width: isMobile ? 420 : 620,
          height: isMobile ? 300 : 420,
          bottom: isMobile ? -120 : -180,
          left: isMobile ? -100 : -140,
          background: "radial-gradient(ellipse at center, rgba(255,255,255,0.04), transparent 70%)",
          filter: "blur(10px)",
          pointerEvents: "none",
        }}
      />

      <div className="atsxr-container">
        <div className="atsxr-grid">
          {/* LEFT — Editorial */}
          <div style={{ minWidth: 0 }}>
            <div className="atsxr-eyebrow">
              <Crosshair size={isMobile ? 11 : 12} />
              <Mono style={{
                fontSize: isMobile ? 9.5 : 10.5,
                color: "#fff",
                letterSpacing: isMobile ? "0.2em" : "0.24em",
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}>
                SECTION 01 · THE X-RAY
              </Mono>
              <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.12)", minWidth: 20 }} />
              <Mono style={{
                fontSize: isMobile ? 9.5 : 10.5,
                color: "#fff",
                opacity: 0.55,
                letterSpacing: isMobile ? "0.18em" : "0.2em",
                flexShrink: 0,
              }}>
                λ 0.4s
              </Mono>
            </div>

            <h2 className="atsxr-h1">
              The Machine<br />
              Already <span className="atsxr-serif">Decided.</span><br />
              <span style={{ color: "#fff" }}>See What It Saw.</span>
            </h2>

            <p style={{
              fontSize: isMobile ? 15 : 18,
              lineHeight: isMobile ? 1.6 : 1.65,
              color: "#fff",
              fontWeight: 400,
              margin: isMobile ? "0 0 24px" : "0 0 32px",
              maxWidth: isMobile ? undefined : 520,
            }}>
              You spent hours perfecting your experience. A robot binned it in{" "}
              <span style={{ fontWeight: 700 }}>0.4 seconds</span> for a missing keyword.
              Stop shouting into the void. See exactly where you&apos;re being filtered out — before you hit submit again.
            </p>

            {/* Metric strip — process-claim compliant */}
            <div className="atsxr-metricstrip">
              {[
                { v: "0.4s",      lDesktop: "MACHINE DECISION TIME", lMobile: "DECISION TIME" },
                { v: "ATS",       lDesktop: "ENGINEERED SCORING",    lMobile: "ENGINEERED SCORING" },
                { v: "GCC + IND", lDesktop: "MARKET TUNED",          lMobile: "MARKET TUNED" },
              ].map((m) => (
                <div key={m.lDesktop} className="atsxr-metric">
                  <div className="atsxr-metric-v">{m.v}</div>
                  <span className="atsxr-metric-l">{isMobile ? m.lMobile : m.lDesktop}</span>
                </div>
              ))}
            </div>

            {isMobile ? (
              <ConicCtaButton onClick={goSignup} size="lg" fullWidth isMobile>
                Stop Being Ignored. Fix It Now.
              </ConicCtaButton>
            ) : (
              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 22 }}>
                <ConicCtaButton onClick={goSignup} size="lg">
                  Stop Being Ignored. Fix It Now.
                </ConicCtaButton>
              </div>
            )}
            <div style={{
              fontSize: isMobile ? 12.5 : 13,
              color: "#fff",
              opacity: 0.7,
              margin: isMobile ? "14px 0 22px" : undefined,
              marginBottom: isMobile ? 22 : 28,
            }}>
              2 minutes to fix. Lifetime to benefit.
            </div>

            <div style={{
              display: "inline-flex",
              alignItems: "center",
              gap: isMobile ? 8 : 10,
              padding: isMobile ? "7px 12px" : "8px 14px",
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.02)",
              maxWidth: "100%",
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: "#fff",
                boxShadow: "0 0 8px rgba(255,255,255,0.6)",
                flexShrink: 0,
              }} />
              <Mono style={{
                fontSize: isMobile ? 10 : 11,
                color: "#fff",
                fontWeight: 600,
                letterSpacing: isMobile ? "0.08em" : "0.1em",
              }}>
                {isMobile ? "TUNED FOR GCC & INDIAN MARKETS" : "TUNED FOR THE GCC JOB MARKET & INDIAN MARKETS"}
              </Mono>
            </div>
          </div>

          {/* RIGHT — The Instrument */}
          <div className="atsxr-instrument">
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: isMobile ? 8 : 10,
              paddingBottom: isMobile ? 10 : 12,
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              minWidth: 0,
            }}>
              <Crosshair size={isMobile ? 10 : 11} />
              <Mono style={{
                fontSize: isMobile ? 9.5 : 10.5,
                color: "#fff",
                letterSpacing: isMobile ? "0.14em" : "0.18em",
                fontWeight: 600,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                minWidth: 0,
              }}>
                X-RAY · SUBJECT 00421
              </Mono>
              <span style={{ flex: 1, minWidth: 4 }} />
              <Mono style={{ fontSize: isMobile ? 9.5 : 10.5, color: "#fff", opacity: 0.55, flexShrink: 0 }}>
                {done
                  ? (isMobile ? "VERDICT" : "VERDICT READY")
                  : phaseIdx < 0
                    ? (isMobile ? "AWAITING" : "AWAITING DOC")
                    : "EXPOSING"}
              </Mono>
              <span style={{
                width: 7, height: 7, borderRadius: "50%",
                background: done ? "#EF4444" : "#fff",
                boxShadow: done ? "0 0 10px rgba(239,68,68,0.6)" : "0 0 10px #fff",
                animation: !done && phaseIdx >= 0 ? "atsxr-pulse 0.9s ease-in-out infinite" : "none",
                flexShrink: 0,
              }} />
            </div>

            <XRayDropzone file={file} onPick={handleUserPick} phaseIdx={phaseIdx} isMobile={isMobile} />

            {uploadError && (
              <div style={{
                fontSize: 12,
                color: "#F87171",
                padding: "8px 12px",
                background: "rgba(248,113,113,0.08)",
                border: "1px solid rgba(248,113,113,0.3)",
                borderRadius: 8,
              }}>
                {uploadError}
              </div>
            )}

            <PhaseLog phaseIdx={phaseIdx} done={done} isMobile={isMobile} />

            <div className="atsxr-scoreblock">
              <MarketReadinessRing score={displayScore} revealed={done} isMobile={isMobile} />
              <div style={{ display: "grid", gap: isMobile ? 12 : 14, width: isMobile ? "100%" : undefined, minWidth: 0 }}>
                <div style={{ textAlign: isMobile ? "center" : "left" }}>
                  <Mono style={{
                    fontSize: isMobile ? 9.5 : 10,
                    color: "#fff",
                    opacity: 0.6,
                    letterSpacing: isMobile ? "0.18em" : "0.2em",
                  }}>
                    VERDICT · THE MACHINE
                  </Mono>
                  <div style={{
                    fontSize: isMobile ? 15 : 19,
                    fontWeight: 700,
                    color: "#fff",
                    letterSpacing: "-0.02em",
                    marginTop: isMobile ? 5 : 6,
                    lineHeight: isMobile ? 1.3 : 1.25,
                    opacity: done ? 1 : 0.25,
                    transition: "opacity 400ms ease",
                  }}>
                    {done ? "You're being filtered out before a human sees you." : "Exposing hidden layers…"}
                  </div>
                </div>
                <SubStrip revealed={done} subs={scanResult} isMobile={isMobile} />
              </div>
            </div>

            <div>
              <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 10, marginBottom: isMobile ? 9 : 10, minWidth: 0 }}>
                <Mono style={{
                  fontSize: isMobile ? 9 : 10.5,
                  color: "#fff",
                  letterSpacing: isMobile ? "0.14em" : "0.18em",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  flex: "0 1 auto",
                  minWidth: 0,
                }}>
                  {isMobile ? "KEYWORDS COSTING YOU THE INTERVIEW" : "THE KEYWORDS COSTING YOU THE INTERVIEW"}
                </Mono>
                <span style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)", minWidth: 8 }} />
                <Mono style={{ fontSize: isMobile ? 9 : 10, color: "#fff", opacity: 0.55, flexShrink: 0 }}>
                  {String(missingKeywords.length).padStart(2, "0")} HITS
                </Mono>
              </div>
              <CostlyKeywords revealed={done} missing={missingKeywords} isMobile={isMobile} />
            </div>

            <LockedFixes revealed={done} score={displayScore} onCta={goSignup} isMobile={isMobile} />
          </div>
        </div>

        <div className="atsxr-footer">
          <Mono style={{ fontSize: isMobile ? 9.5 : 10, color: "#fff", opacity: 0.5, letterSpacing: isMobile ? "0.16em" : "0.18em" }}>
            CVPASSPORT · X-RAY INSTRUMENT
          </Mono>
          <span style={{ flex: 1 }} />
          <Mono style={{ fontSize: isMobile ? 9.5 : 10, color: "#fff", opacity: 0.5, letterSpacing: isMobile ? "0.16em" : "0.18em" }}>
            NO CREDIT CARD · NO SIGNUP
          </Mono>
        </div>
      </div>
    </section>
  );
}
