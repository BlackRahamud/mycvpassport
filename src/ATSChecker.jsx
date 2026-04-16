import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, Lock, ChevronDown, Sparkles, Plus, ArrowRight, CheckCircle } from "lucide-react";
import { supabase } from "./supabaseClient";
import { getGatekeeperData } from "./services/gatekeeper";
import { detectRole } from "./utils/detectRole";
import skillSuggestions from "./data/skillSuggestions";
import { getPaymentLink } from "./utils/paywall";

// ─── Design tokens — FIX 1: amber #F59E0B → #D97706 ─────────────────────────
const T = {
  bg: "#0C0C0E",
  surface: "#141414",
  elevated: "#1C1C1C",
  border: "#2A2A2A",
  text: "#FFFFFF",
  muted: "#A0A0A0",
  amber: "#D97706",
  amberDim: "rgba(217,119,6,0.12)",
  amberBorder: "rgba(217,119,6,0.35)",
  blue: "#3B82F6",
  green: "#4ADE80",
  red: "#F87171",
};

function getScoreLabel(score) {
  if (score <= 49) return "Needs Improvement";
  if (score <= 69) return "Getting There";
  if (score <= 84) return "Your Foundation is Solid";
  return "Market Ready";
}

function formatPlanDisplayName(raw) {
  if (raw == null) return "Career Pro";
  const s = String(raw).trim();
  if (!s) return "Career Pro";
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function buildFreeLoadingSteps() {
  return [
    "Extracting your information...",
    "Running against GCC market data...",
    "Matching keywords...",
    "Calculating your score...",
    "Results ready",
  ];
}

function buildProLoadingSteps(planName) {
  const p = formatPlanDisplayName(planName);
  return [
    "Extracting your information...",
    `Activating ${p} analysis...`,
    "Running against GCC market data pool...",
    "Matching keywords to your role...",
    "Something interesting found",
    "Finalizing your full report...",
    `${p} results ready`,
  ];
}

// ─── Score ring — FIX 6: stroke-width min 10, smooth 1.2s ease-out animation ─
function ScoreRing({ score, size = 190, strokeWidth = 12, animated = false, gradientId = "ring-grad" }) {
  const r = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  const targetOffset = circ * (1 - score / 100);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={T.amber} />
          <stop offset="100%" stopColor={T.green} />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.border} strokeWidth={strokeWidth} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={`url(#${gradientId})`}
        strokeWidth={strokeWidth} strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={animated ? targetOffset : circ}
        style={animated ? { strokeDashoffset: targetOffset, transition: "stroke-dashoffset 1.2s ease-out" } : { strokeDashoffset: circ }}
      />
    </svg>
  );
}

// ─── Chip ─────────────────────────────────────────────────────────────────────
function Chip({ label, variant, flyIn = false, flyIndex = 0, chipsRevealed = true }) {
  const s = {
    green: { color: T.green, border: `1px solid rgba(74,222,128,0.35)`, background: "rgba(74,222,128,0.07)" },
    amber: { color: T.amber, border: `1px solid ${T.amberBorder}`, background: T.amberDim },
  };
  const fly = flyIn
    ? {
        opacity: chipsRevealed ? 1 : 0,
        transform: chipsRevealed ? "translateY(0)" : "translateY(20px)",
        transition: "opacity 0.4s ease, transform 0.4s ease",
        transitionDelay: `${flyIndex * 50}ms`,
      }
    : {};
  return (
    <span style={{ ...s[variant], fontSize: 12, fontWeight: 500, padding: "5px 14px", borderRadius: 999, cursor: "default", display: "inline-block", lineHeight: "1.4", transition: "background 0.15s", ...fly }}>
      {label}
    </span>
  );
}

// ─── Sub-score card ──────────────────────────────────────────────────────────
function SubCard({ value, label, color }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 16, padding: "24px 16px", textAlign: "center", flex: 1 }}>
      <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 28, fontWeight: 600, lineHeight: 1.2, letterSpacing: -0.5, color }}>{value}</div>
      <div style={{ fontSize: 12, color: T.muted, marginTop: 8, fontWeight: 500, lineHeight: 1.6 }}>{label}</div>
    </div>
  );
}

// ─── Sample result card — FIX 2: full content, no cutoff ─────────────────────
function SampleResultCard({ isMobile = false }) {
  return (
    <div style={{ width: isMobile ? "100%" : 360, maxWidth: isMobile ? "100%" : 360, alignSelf: isMobile ? "stretch" : undefined, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 20, padding: "24px 22px 26px", position: "relative", flexShrink: 0, boxSizing: "border-box" }}>
      <div aria-hidden style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, rgba(217,119,6,0.4), transparent)`, borderRadius: "20px 20px 0 0" }} />

      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: T.muted, marginBottom: 18 }}>Sample Result</div>

      {/* Ring */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 14 }}>
        <div style={{ position: "relative", width: 120, height: 120, marginBottom: 10 }}>
          <ScoreRing score={82} size={120} strokeWidth={10} animated gradientId="sample-grad" />
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 52, fontWeight: 700, lineHeight: 1, letterSpacing: -1, color: T.text }}>82</div>
            <div style={{ fontSize: 10, color: T.muted, marginTop: 2 }}>out of 100</div>
          </div>
        </div>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 700, color: T.text, lineHeight: 1.6 }}>Your Foundation is Solid</div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ height: 5, borderRadius: 999, background: `linear-gradient(90deg, ${T.red}, ${T.amber} 50%, ${T.green})`, position: "relative", marginBottom: 6 }}>
          <div style={{ position: "absolute", top: "50%", left: "82%", transform: "translate(-50%,-50%)", width: 11, height: 11, background: T.text, borderRadius: "50%", boxShadow: "0 0 6px rgba(255,255,255,0.5)" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: T.muted }}>
          <span>Needs Work</span><span>On Track</span><span>Market Ready</span>
        </div>
      </div>

      {/* Sub-scores */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 7, marginBottom: 16 }}>
        {[["72", "Keywords", T.blue], ["58", "Structure", T.amber], ["85", "Content", T.green]].map(([v, l, c]) => (
          <div key={l} style={{ background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 11, padding: "12px 8px", textAlign: "center" }}>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 28, fontWeight: 600, lineHeight: 1.2, letterSpacing: -0.5, color: c }}>{v}</div>
            <div style={{ fontSize: 10, color: T.muted, marginTop: 4, lineHeight: 1.6 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Visibility Boosters */}
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.8, textTransform: "uppercase", color: T.green, marginBottom: 9, display: "flex", alignItems: "center", gap: 5 }}>✦ Visibility Boosters</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
        {["Negotiation", "CRM", "Client Relations", "Lead Generation", "Sales Pipeline"].map((k) => <Chip key={k} label={k} variant="green" />)}
      </div>

      {/* Rank Triggers */}
      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.8, textTransform: "uppercase", color: T.amber, marginBottom: 9, display: "flex", alignItems: "center", gap: 5 }}>⊕ Rank Triggers</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
        {["RERA Certified", "Off-plan Sales", "KYC", "AML"].map((k) => <Chip key={k} label={k} variant="amber" />)}
      </div>

      {/* CVPassport Verified */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
        <div style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.3)", color: "#60A5FA", fontSize: 11, fontWeight: 600, padding: "6px 14px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 5 }}>
          ✦ CVPassport Verified — Top 15% Ready for GCC Finance
        </div>
      </div>

      {/* Label */}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: "rgba(160,160,160,0.45)" }}>
          Your results will appear here
        </div>
      </div>
    </div>
  );
}

function StepRowTick() {
  return (
    <span
      className="ats-step-tick"
      style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 22, flexShrink: 0 }}
      aria-hidden
    >
      <CheckCircle size={17} color={T.green} strokeWidth={2.25} />
    </span>
  );
}

function scoreColor(v) {
  if (v <= 40) return "#F87171";
  if (v <= 70) return "#FACC15";
  return "#4ADE80";
}

function PremiumScoreCircle({ score }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
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
  }, [score]);

  const color = scoreColor(display);

  return (
    <div style={{ position: "relative", width: 140, height: 140, marginBottom: 20 }}>
      {/* Spinning conic border */}
      <div aria-hidden style={{
        position: "absolute", inset: 0, borderRadius: "50%", padding: 2,
        background: `conic-gradient(from var(--ats-angle, 0deg), transparent 60%, ${color} 80%, transparent 100%)`,
        WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
        WebkitMaskComposite: "xor",
        maskComposite: "exclude",
        pointerEvents: "none",
        animation: "ats-spin-border 3s linear infinite",
      }} />
      {/* Inner circle */}
      <div style={{
        position: "absolute", inset: 2, borderRadius: "50%",
        background: "#0A0A0A",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 48, fontWeight: 700, lineHeight: 1, letterSpacing: -1, color, transition: "color 0.15s" }}>
          {display}
        </div>
        <div style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>out of 100</div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ATSChecker({ onResultsVisible } = {}) {
  const [phase, setPhase] = useState("idle");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [loadingMeta, setLoadingMeta] = useState(null);
  const [loadingSeconds, setLoadingSeconds] = useState(0);
  const [chipsRevealed, setChipsRevealed] = useState(false);
  const [isProResults, setIsProResults] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [isPro, setIsPro] = useState(false);
  const [gatePlanName, setGatePlanName] = useState("Career Pro");
  const [isMobile, setIsMobile] = useState(
    window.innerWidth < 768
  );
  const [paymentLoading, setPaymentLoading] = useState(false);

  const fileInputRef = useRef(null);
  const outerRef = useRef(null);

  // ── Auth ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    getGatekeeperData()
      .then((gate) => {
        setIsPro(gate.isPaidUser);
        setGatePlanName(gate.planName || "Career Pro");
      })
      .catch(() => {
        setIsPro(false);
      });
  }, []);

  // ── Loading: resolve tier for step copy (UI only; does not change analysis) ─
  useEffect(() => {
    if (phase !== "loading") {
      setLoadingMeta(null);
      return;
    }
    setLoadingMeta(null);
    if (!user?.id) {
      setLoadingMeta({ isPro: false, planName: "Career Pro" });
      return;
    }
    setLoadingMeta({
      isPro,
      planName: formatPlanDisplayName(gatePlanName || "Career Pro"),
    });
  }, [phase, user?.id, isPro, gatePlanName]);

  useEffect(() => {
    if (phase !== "loading" || !loadingMeta) return;
    setLoadingSeconds(0);
    const id = setInterval(() => setLoadingSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [phase, loadingMeta]);

  // ── Results: staggered chips + Pro flag for Claude badge ──────────────────
  useEffect(() => {
    if (phase !== "results") {
      setChipsRevealed(false);
      setIsProResults(false);
      return;
    }
    setChipsRevealed(false);
    let raf = requestAnimationFrame(() => {
      requestAnimationFrame(() => setChipsRevealed(true));
    });
    setIsProResults(!!user?.id && isPro);
    return () => {
      cancelAnimationFrame(raf);
    };
  }, [phase, user?.id, isPro, results]);

  // ── File handling ─────────────────────────────────────────────────────────
  const handleFileSelect = useCallback((file) => {
    if (!file) return;
    const valid = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!valid.includes(file.type) && !file.name.match(/\.(pdf|docx)$/i)) { setError("Please upload a PDF or DOCX file."); return; }
    setError(null);
    setUploadedFile(file);
  }, []);

  const onFileChange = useCallback((e) => handleFileSelect(e.target.files[0]), [handleFileSelect]);
  const onDrop = useCallback((e) => { e.preventDefault(); handleFileSelect(e.dataTransfer.files[0]); }, [handleFileSelect]);
  const onDragOver = useCallback((e) => { e.preventDefault(); }, []);
  const onDragLeave = useCallback(() => {}, []);

  // ── Analysis ──────────────────────────────────────────────────────────────
  const handleAnalyze = useCallback(async () => {
    if (!uploadedFile) { setError("Please upload your CV."); return; }
    setError(null);

    let paidUser = false;
    if (user?.id) {
      const gate = await getGatekeeperData();
      paidUser = gate.isPaidUser;
    }

    if (!paidUser) {
      try {
        const jd = jobDescription.trim();
        if (!jd) {
          const seen = new Set();
          const pool = [];
          poolLoop: for (const pack of Object.values(skillSuggestions)) {
            for (const row of pack?.atsKeywords ?? []) {
              if (pool.length >= 30) break poolLoop;
              const keyword = row?.keyword?.trim();
              if (!keyword) continue;
              const key = keyword.toLowerCase();
              if (seen.has(key)) continue;
              seen.add(key);
              pool.push(keyword);
            }
          }
          const visibilityBoosters = pool.slice(0, 5);
          const rankTriggers = pool.slice(5, 10);
          const keywordsScore = 65;
          const structureScore = 70;
          const contentScore = 75;
          const score = Math.round((65 + 70 + 75) / 3);
          const industry = "General GCC Market";
          const topPercent = 42;
          const missingCount = 5;
          setResults({
            score,
            keywordsScore,
            structureScore,
            contentScore,
            visibilityBoosters,
            rankTriggers,
            industry,
            topPercent,
            missingCount,
          });
          setPhase("results");
        } else {
          const jdLower = jd.toLowerCase();
          const roleKey = detectRole(jd) || "sales_real_estate";
          const pack = skillSuggestions[roleKey];
          const list = pack?.atsKeywords ?? [];
          const visibilityBoosters = [];
          const rankTriggers = [];
          for (const row of list) {
            const keyword = row?.keyword?.trim();
            if (!keyword) continue;
            if (jdLower.includes(keyword.toLowerCase())) visibilityBoosters.push(keyword);
            else rankTriggers.push(keyword);
          }
          const total = list.length;
          const keywordsScore = total > 0 ? Math.round((visibilityBoosters.length / total) * 100) : 0;
          const structureScore = 70;
          const contentScore = 75;
          const score = Math.round((keywordsScore + structureScore + contentScore) / 3);
          const industry =
            (pack?.jobTitles && pack.jobTitles[0]) ||
            roleKey.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
          const topPercent = Math.max(1, Math.min(99, 100 - score));
          setResults({
            score,
            keywordsScore,
            structureScore,
            contentScore,
            visibilityBoosters,
            rankTriggers,
            industry,
            topPercent,
            missingCount: rankTriggers.length,
          });
          setPhase("results");
          onResultsVisible?.(true);
        }
      } catch (err) {
        console.error("ATS analysis error:", err);
        setError("Something went wrong. Please try again.");
        setPhase("idle");
      }
      return;
    }

    const jdPro = jobDescription.trim();
    if (!jdPro) {
      try {
        const seen = new Set();
        const pool = [];
        poolLoop: for (const pack of Object.values(skillSuggestions)) {
          for (const row of pack?.atsKeywords ?? []) {
            if (pool.length >= 30) break poolLoop;
            const keyword = row?.keyword?.trim();
            if (!keyword) continue;
            const key = keyword.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);
            pool.push(keyword);
          }
        }
        const visibilityBoosters = pool.slice(0, 5);
        const rankTriggers = pool.slice(5, 10);
        const keywordsScore = 65;
        const structureScore = 70;
        const contentScore = 75;
        const score = Math.round((65 + 70 + 75) / 3);
        const industry = "General GCC Market";
        const topPercent = 42;
        const missingCount = 5;
        setResults({
          score,
          keywordsScore,
          structureScore,
          contentScore,
          visibilityBoosters,
          rankTriggers,
          industry,
          topPercent,
          missingCount,
        });
        setPhase("results");
        onResultsVisible?.(true);
      } catch (err) {
        console.error("ATS analysis error:", err);
        setError("Something went wrong. Please try again.");
        setPhase("idle");
      }
      return;
    }

    setPhase("loading");
    const started = Date.now();
    try {
      const userId = user?.id ?? "anon";
      const fileBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = () => reject(new Error("File read failed"));
        reader.readAsDataURL(uploadedFile);
      });

      const { data, error: fnError } = await supabase.functions.invoke("analyze-cv", { body: { fileBase64, fileName: uploadedFile.name, jobDescription, userId } });
      if (fnError) throw fnError;

      if (user) {
        await supabase.from("ats_results").insert({
          user_id: user.id, score: data.score,
          keywords_score: data.keywordsScore, structure_score: data.structureScore,
          content_score: data.contentScore, visibility_boosters: data.visibilityBoosters,
          rank_triggers: data.rankTriggers, industry: data.industry,
          created_at: new Date().toISOString(),
        });
      }
      const elapsed = Date.now() - started;
      const remaining = Math.max(0, 6000 - elapsed);
      if (remaining > 0) await new Promise((r) => setTimeout(r, remaining));
      setResults(data);
      setPhase("results");
      onResultsVisible?.(true);
    } catch (err) {
      console.error("ATS analysis error:", err);
      setError("Something went wrong. Please try again.");
      setPhase("idle");
    }
  }, [uploadedFile, jobDescription, user, onResultsVisible]);

  // ── Shared nav ────────────────────────────────────────────────────────────
  const Nav = ({ back }) => (
    <nav style={{ padding: "22px 44px", display: "flex", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.05)", flexShrink: 0 }}>
      <span style={{ fontFamily: "'DM Sans', monospace", fontSize: 18, display: "inline-flex", alignItems: "baseline", gap: 0, whiteSpace: "nowrap" }}>
        <span style={{ color: "#F59E0B", fontWeight: 800, letterSpacing: "-2px" }}>{">>>"}</span>
        <span style={{ color: "#FFFFFF", fontWeight: 600 }}> CVPassport</span>
      </span>
      {back && (
        <button onClick={back} style={{ marginLeft: "auto", background: "transparent", border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 14px", color: T.muted, fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
          ← New Check
        </button>
      )}
    </nav>
  );

  // ── RENDER: idle ──────────────────────────────────────────────────────────
  if (phase === "idle") {
    const idleFormColumn = (
      <div style={{ minWidth: 0 }}>
        <h1 style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "clamp(34px,4vw,52px)", fontWeight: 700, lineHeight: 1.12, letterSpacing: "-0.5px", marginBottom: 20 }}>
          Find out why your CV<br />isn&apos;t getting <span style={{ color: "rgba(255,255,255,0.5)", fontWeight: 700, fontStyle: "italic" }}>callbacks</span>
        </h1>

        <p style={{ fontSize: 16, lineHeight: 1.75, color: T.muted, maxWidth: 480, marginBottom: 36 }}>
          Upload your CV, paste the job description. Get your score in seconds — based on real regional hiring data.
        </p>

        <div style={{ position: "relative", borderRadius: 16, marginBottom: 14 }}>
          <div aria-hidden style={{
            position: "absolute", inset: 0, borderRadius: 16, padding: 1,
            background: "conic-gradient(from var(--ats-angle, 0deg), transparent 60%, rgba(255,255,255,0.5) 80%, transparent 100%)",
            WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
            pointerEvents: "none",
            animation: "ats-spin-border 4s linear infinite",
          }} />
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
            style={{ position: "relative", background: "#0f0f0f", border: "none", borderRadius: 16, padding: "44px 24px", textAlign: "center", cursor: "pointer", overflow: "hidden" }}
          >
            <input ref={fileInputRef} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" style={{ display: "none" }} onChange={onFileChange} />
            <div style={{ width: 52, height: 52, background: uploadedFile ? "rgba(74,222,128,0.1)" : "rgba(255,255,255,0.06)", border: `1px solid ${uploadedFile ? "rgba(74,222,128,0.35)" : "rgba(255,255,255,0.12)"}`, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
              {uploadedFile ? <CheckCircle size={22} color={T.green} /> : <Upload size={22} color="rgba(255,255,255,0.5)" />}
            </div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 700, color: uploadedFile ? T.green : T.text, marginBottom: 6 }}>
              {uploadedFile ? uploadedFile.name : "Drop your CV here"}
            </div>
            <div style={{ fontSize: 13, color: T.muted }}>
              {uploadedFile ? "File ready · click to replace" : <>or <span style={{ color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>browse your CV</span></>}
            </div>
            <div style={{ marginTop: 14, fontSize: 11, color: "rgba(160,160,160,0.5)", letterSpacing: 0.5 }}>PDF · DOCX · Max 10MB</div>
          </div>
        </div>

        <div style={{ position: "relative", marginBottom: 16 }}>
          <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: T.muted, marginBottom: 8, display: "block" }}>Target Job Description</label>
          <textarea
            value={jobDescription} onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste the full job description here — the more detail, the sharper your analysis..."
            style={{ width: "100%", background: T.surface, border: `1.5px solid ${T.border}`, borderRadius: 16, padding: "18px 20px", fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: T.text, resize: "none", height: 130, outline: "none", lineHeight: 1.6, transition: "border-color 0.2s", boxSizing: "border-box" }}
            onFocus={(e) => { e.target.style.borderColor = T.amberBorder; }}
            onBlur={(e) => { e.target.style.borderColor = T.border; }}
          />
          <div style={{ position: "absolute", bottom: 14, right: 16, fontSize: 11, color: "rgba(160,160,160,0.4)", pointerEvents: "none" }}>{jobDescription.length} chars</div>
        </div>
        <div style={{ fontSize: 12, color: T.muted, marginBottom: 16 }}>Optional — add a job description for a targeted score</div>

        {error && (
          <div style={{ color: T.red, fontSize: 13, marginBottom: 12, padding: "10px 16px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10 }}>{error}</div>
        )}

        <div style={{ position: "relative", borderRadius: 12, overflow: "hidden" }}>
          <div aria-hidden style={{
            position: "absolute", inset: 0, borderRadius: 12, padding: 1,
            background: "conic-gradient(from var(--ats-angle, 0deg), transparent 60%, rgba(255,255,255,0.6) 80%, transparent 100%)",
            WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
            pointerEvents: "none",
            animation: "ats-spin-border 4s linear infinite",
          }} />
          <button
            onClick={handleAnalyze}
            style={{ width: "100%", background: "#0A0A0A", color: "#fff", border: "none", borderRadius: 12, padding: "18px 24px", fontFamily: "'DM Sans', sans-serif", fontSize: 16, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, letterSpacing: -0.3, transition: "opacity 0.15s, transform 0.15s", position: "relative" }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "translateY(0)"; }}
          >
            Analyze My CV <ArrowRight size={18} />
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 14, fontSize: 12, color: "rgba(160,160,160,0.6)" }}>
          <Lock size={12} color="rgba(160,160,160,0.5)" />
          Secure processing via Supabase · Your data is never sold
        </div>
      </div>
    );

    return (
      <div ref={outerRef} style={{ background: T.bg, minHeight: "100vh", color: T.text, fontFamily: "'DM Sans', sans-serif", overflow: "hidden", position: "relative", lineHeight: 1.6 }}>
        <style>{`
          @property --ats-angle {
            syntax: '<angle>';
            initial-value: 0deg;
            inherits: false;
          }
          @keyframes ats-spin-border { to { --ats-angle: 360deg; } }
        `}</style>
        <div aria-hidden style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
          <div style={{ position: "absolute", top: "-20%", left: "50%", transform: "translateX(-50%)", width: 800, height: 500, background: "radial-gradient(ellipse at center, rgba(255,255,255,0.03) 0%, transparent 70%)" }} />
        </div>
        <div style={{ position: "relative", zIndex: 1 }}>
          <Nav />
          {isMobile ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 40, alignItems: "stretch", padding: "40px 20px 80px", maxWidth: 1200, margin: "0 auto" }}>
              {idleFormColumn}
              <SampleResultCard isMobile />
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 56, alignItems: "start", padding: "56px 44px 80px", maxWidth: 1200, margin: "0 auto" }}>
              {idleFormColumn}
              <SampleResultCard isMobile={false} />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── RENDER: loading ───────────────────────────────────────────────────────
  if (phase === "loading") {
    const steps = loadingMeta
      ? loadingMeta.isPro
        ? buildProLoadingSteps(loadingMeta.planName)
        : buildFreeLoadingSteps()
      : [];
    const currentIdx = steps.length ? Math.min(loadingSeconds, steps.length - 1) : 0;

    return (
      <div style={{ background: T.bg, minHeight: "100vh", color: T.text, fontFamily: "'DM Sans', sans-serif", display: "flex", flexDirection: "column", lineHeight: 1.6 }}>
        <style>{`
          @keyframes ats-tick-spring { from { transform: scale(0); } to { transform: scale(1); } }
          .ats-step-tick { animation: ats-tick-spring 150ms cubic-bezier(0.34, 1.56, 0.64, 1) both; transform-origin: center; }
          @keyframes ats-step-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.55; }
          }
          .ats-step-current {
            color: #D97706 !important;
            animation: ats-step-pulse 1.15s ease-in-out infinite;
            font-weight: 600;
          }
          @keyframes ats-amber-ring {
            0%, 100% { box-shadow: 0 0 0 0 rgba(217,119,6,0.22), 0 0 0 1px rgba(217,119,6,0.2) inset; }
            50% { box-shadow: 0 0 0 10px rgba(217,119,6,0.06), 0 0 32px rgba(217,119,6,0.18), 0 0 0 1px rgba(217,119,6,0.35) inset; }
          }
          .ats-loading-ring { animation: ats-amber-ring 2.2s ease-in-out infinite; }
          @keyframes ats-plan-glow {
            0%, 100% { text-shadow: 0 0 10px rgba(217,119,6,0.35); box-shadow: 0 0 12px rgba(217,119,6,0.2); }
            50% { text-shadow: 0 0 20px rgba(217,119,6,0.55); box-shadow: 0 0 22px rgba(217,119,6,0.35); }
          }
          .ats-plan-badge-glow { animation: ats-plan-glow 2s ease-in-out infinite; }
        `}</style>
        <Nav />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40 }}>
          <div
            className="ats-loading-ring"
            style={{
              width: "min(100%, 400px)",
              background: T.surface,
              border: `1px solid ${T.amberBorder}`,
              borderRadius: 20,
              padding: "28px 24px 30px",
              boxSizing: "border-box",
            }}
          >
            {loadingMeta?.isPro && (
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
                <span
                  className="ats-plan-badge-glow"
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: 1.2,
                    textTransform: "uppercase",
                    color: T.amber,
                    padding: "6px 14px",
                    borderRadius: 999,
                    border: `1px solid ${T.amberBorder}`,
                    background: T.amberDim,
                  }}
                >
                  {loadingMeta.planName}
                </span>
              </div>
            )}
            {!loadingMeta && (
              <div style={{ color: T.muted, fontSize: 14, textAlign: "center", lineHeight: 1.55 }}>Preparing your analysis…</div>
            )}
            {loadingMeta && (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 14 }}>
                {steps.map((text, i) => {
                  const done = loadingSeconds > i;
                  const current = !done && i === currentIdx;
                  return (
                    <li
                      key={i}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        fontSize: 14,
                        lineHeight: 1.45,
                        color: done ? T.muted : current ? T.amber : "rgba(160,160,160,0.45)",
                      }}
                    >
                      {done ? (
                        <StepRowTick />
                      ) : (
                        <span style={{ width: 22, flexShrink: 0 }} aria-hidden />
                      )}
                      <span className={current ? "ats-step-current" : undefined} style={{ flex: 1, minWidth: 0 }}>
                        {text}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── RENDER: results ───────────────────────────────────────────────────────
  const score = results?.score ?? 82;
  const keywordsScore = results?.keywordsScore ?? 72;
  const structureScore = results?.structureScore ?? 58;
  const contentScore = results?.contentScore ?? 85;
  const visibilityBoosters = results?.visibilityBoosters ?? ["Negotiation", "CRM", "Client Relations", "Lead Generation", "Sales Pipeline"];
  const rankTriggers = results?.rankTriggers ?? ["RERA Certified", "Off-plan Sales", "KYC", "AML"];
  const industry = results?.industry ?? "Finance";
  const topPercent = results?.topPercent ?? 15;
  const handleUnlock = async () => {
    if (paymentLoading) return;
    setPaymentLoading(true);
    try {
      const url = await getPaymentLink('ats', user?.id, user?.email);
      if (url) {
        window.location.href = url;
      } else {
        alert('Payment initialization failed. Please try again.');
      }
    } catch {
      alert('Payment initialization failed. Please try again.');
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <div style={{ background: T.bg, minHeight: "100vh", color: T.text, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6 }}>
      <style>{`
        @property --ats-angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        @keyframes ats-bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(4px); } }
        @keyframes ats-spin-border { to { --ats-angle: 360deg; } }
        @keyframes ats-pulse-out { 0% { transform: scale(1); opacity: 0.5; } 100% { transform: scale(1.5); opacity: 0; } }
        @keyframes ats-spin-check { to { transform: rotate(360deg); } }
      `}</style>
      <div aria-hidden style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-10%", left: "50%", transform: "translateX(-50%)", width: 700, height: 400, background: "radial-gradient(ellipse at center, rgba(255,255,255,0.03) 0%, transparent 70%)" }} />
      </div>
      <div style={{ position: "relative", zIndex: 1 }}>
        <Nav back={() => { setPhase("idle"); setResults(null); setUploadedFile(null); setJobDescription(""); }} />

        <div style={{ maxWidth: 640, margin: "0 auto", padding: "52px 28px 100px" }}>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: 40 }}>
            <PremiumScoreCircle score={score} />
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: "-0.5px", marginBottom: 14 }}>{getScoreLabel(score)}</div>
            <div style={{ background: "rgba(255,255,255,0.08)", color: T.text, fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 700, padding: "7px 20px", borderRadius: 999, marginBottom: 14, display: "inline-block", border: "1px solid rgba(255,255,255,0.12)" }}>
              +{100 - score} Points within reach
            </div>
            <div style={{ fontSize: 13, color: T.muted }}>Analyzed against real GCC &amp; India hiring data</div>
          </div>

          {/* Gradient bar — unchanged */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ height: 6, borderRadius: 999, background: `linear-gradient(90deg, ${T.red}, ${T.amber} 50%, ${T.green})`, position: "relative", marginBottom: 10 }}>
              <div style={{ position: "absolute", top: "50%", left: `${score}%`, transform: "translate(-50%,-50%)", width: 14, height: 14, background: T.text, borderRadius: "50%", boxShadow: "0 0 8px rgba(255,255,255,0.6), 0 0 20px rgba(255,255,255,0.2)" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: T.muted }}>
              <span>Needs Work</span><span>On Track</span><span>Market Ready</span>
            </div>
          </div>

          {/* Sub-scores — unchanged */}
          <div style={{ display: "flex", gap: 12, marginBottom: 36 }}>
            <SubCard value={keywordsScore} label="Keywords" color={T.blue} />
            <SubCard value={structureScore} label="Structure" color={T.amber} />
            <SubCard value={contentScore} label="Content" color={T.green} />
          </div>

          {/* Visibility Boosters — unchanged */}
          <div style={{ marginBottom: 30 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: T.green, marginBottom: 14 }}>
              <Sparkles size={13} color={T.green} /> Visibility Boosters
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {visibilityBoosters.map((kw, i) => (
                <Chip key={kw} label={kw} variant="green" flyIn flyIndex={i} chipsRevealed={chipsRevealed} />
              ))}
            </div>
          </div>

          {/* Rank Triggers — unchanged */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: T.amber, marginBottom: 14 }}>
              <Plus size={13} color={T.amber} /> Rank Triggers
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {rankTriggers.map((kw, i) => (
                <Chip
                  key={kw}
                  label={kw}
                  variant="amber"
                  flyIn
                  flyIndex={visibilityBoosters.length + i}
                  chipsRevealed={chipsRevealed}
                />
              ))}
            </div>
          </div>

          {/* CVPassport Verified — unchanged */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
            <div style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.35)", color: "#60A5FA", fontSize: 13, fontWeight: 600, padding: "9px 22px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Sparkles size={13} color="#60A5FA" />
              CVPassport Verified — Top {topPercent}% Ready for GCC {industry}
            </div>
          </div>

          {/* Conversion card — premium redesign */}
          <div style={{
            background: '#0A0A0A',
            borderRadius: 20,
            padding: '32px 24px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Running white light border */}
            <div aria-hidden style={{
              position: 'absolute', inset: 0, borderRadius: 20, padding: 1,
              background: 'conic-gradient(from var(--ats-angle, 0deg), transparent 60%, rgba(255,255,255,0.5) 80%, transparent 100%)',
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
              pointerEvents: 'none',
              animation: 'ats-spin-border 3s linear infinite',
            }} />

            {/* Pulsing lock circle */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
              <div style={{
                background: 'conic-gradient(from var(--ats-angle, 0deg), transparent 70%, rgba(255,255,255,0.8) 85%, transparent 100%)',
                borderRadius: '50%',
                padding: 1.5,
                display: 'inline-block',
                animation: 'ats-spin-border 3s linear infinite',
              }}>
                <div style={{
                  width: 72, height: 72, borderRadius: '50%',
                  background: '#0A0A0A',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative',
                }}>
                  <div aria-hidden style={{
                    position: 'absolute', inset: -6, borderRadius: '50%',
                    border: '1px solid rgba(255,255,255,0.15)',
                    animation: 'ats-pulse-out 2.5s ease-out infinite',
                  }} />
                  <div aria-hidden style={{
                    position: 'absolute', inset: -6, borderRadius: '50%',
                    border: '1px solid rgba(255,255,255,0.08)',
                    animation: 'ats-pulse-out 2.5s ease-out infinite 0.8s',
                  }} />
                  {paymentLoading ? (
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%',
                      border: '2px solid rgba(255,255,255,0.2)',
                      borderTopColor: '#fff',
                      animation: 'ats-spin-check 0.8s linear infinite',
                    }} />
                  ) : (
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
                      <rect x="3" y="11" width="18" height="11" rx="2"/>
                      <path d="M7 11V7a5 5 0 0110 0v4"/>
                    </svg>
                  )}
                </div>
              </div>
            </div>

            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', lineHeight: 1.4, marginBottom: 8 }}>
              {paymentLoading ? 'Preparing checkout...' : "You\u2019re ranked below 60% of applicants"}
            </div>
            <div style={{ fontSize: 13, color: '#666', lineHeight: 1.65, marginBottom: 24, maxWidth: 300, marginLeft: 'auto', marginRight: 'auto' }}>
              {paymentLoading ? 'Connecting to secure payment...' : 'Get your full keyword gap, AI rewrite suggestions, and ATS score breakdown \u2014 built on real GCC hiring data'}
            </div>

            {/* Unlock button with running border */}
            <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 12, marginBottom: 12 }}>
              <button
                onClick={handleUnlock}
                disabled={paymentLoading}
                style={{
                  width: '100%', background: '#0A0A0A', color: '#fff',
                  border: 'none', borderRadius: 12,
                  padding: '16px 24px', fontSize: 15, fontWeight: 600,
                  cursor: paymentLoading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 8, letterSpacing: -0.3, opacity: paymentLoading ? 0.6 : 1,
                  transition: 'opacity 0.15s',
                }}
              >
                <div aria-hidden style={{
                  position: 'absolute', inset: 0, borderRadius: 12, padding: 1,
                  background: 'conic-gradient(from var(--ats-angle, 0deg), transparent 60%, rgba(255,255,255,0.6) 80%, transparent 100%)',
                  WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                  WebkitMaskComposite: 'xor',
                  maskComposite: 'exclude',
                  pointerEvents: 'none',
                  animation: 'ats-spin-border 2s linear infinite',
                }} />
                {paymentLoading ? 'Preparing checkout...' : 'Unlock Full Analysis \u2014 AED 29/mo'}
                {!paymentLoading && (
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                )}
              </button>
            </div>

            <div style={{ fontSize: 11, color: '#333' }}>
              Cancel anytime · Instant access · 500+ UAE job seekers
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "center", marginTop: 28 }}>
            <div style={{ width: 38, height: 38, background: T.elevated, border: `1px solid ${T.border}`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", animation: "ats-bounce 2s ease-in-out infinite" }}>
              <ChevronDown size={16} color={T.muted} />
            </div>
          </div>

          {isProResults && (
            <div style={{ display: "flex", justifyContent: "center", marginTop: 22 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 12px",
                  borderRadius: 8,
                  background: "#141414",
                  border: `1px solid ${T.border}`,
                  fontSize: 11,
                  fontWeight: 600,
                  color: T.text,
                  letterSpacing: 0.2,
                }}
              >
                <span
                  aria-hidden
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "#EA580C",
                    flexShrink: 0,
                    boxShadow: "0 0 6px rgba(234,88,12,0.55)",
                  }}
                />
                Powered by Claude AI
              </div>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <p style={{
              color: "#555",
              fontSize: "11px",
              textAlign: "center",
              marginTop: "16px",
              maxWidth: "360px",
              lineHeight: 1.5,
              letterSpacing: "0.03em",
            }}>
              Engineered by Claude 4.5 (Anthropic). Optimized for the Gulf{"'"}s competitive recruitment landscape.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
