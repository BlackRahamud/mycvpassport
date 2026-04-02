import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, Lock, ChevronDown, Sparkles, Plus, ArrowRight, CheckCircle } from "lucide-react";
import { supabase } from "./supabaseClient";

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

const SCAN_STEPS = [
  "Reading your CV...",
  "Matching against GCC hiring data...",
  "Calculating your Rank Triggers...",
  "Finalising your score...",
];

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

function AnimatedScoreRing({ score, size, strokeWidth, gradientId }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setReady(true)));
    return () => cancelAnimationFrame(id);
  }, []);
  return <ScoreRing score={score} size={size} strokeWidth={strokeWidth} animated={ready} gradientId={gradientId} />;
}

// ─── Chip ─────────────────────────────────────────────────────────────────────
function Chip({ label, variant }) {
  const s = {
    green: { color: T.green, border: `1px solid rgba(74,222,128,0.35)`, background: "rgba(74,222,128,0.07)" },
    amber: { color: T.amber, border: `1px solid ${T.amberBorder}`, background: T.amberDim },
  };
  return (
    <span style={{ ...s[variant], fontSize: 12, fontWeight: 500, padding: "5px 14px", borderRadius: 999, cursor: "default", display: "inline-block", lineHeight: "1.4", transition: "background 0.15s" }}>
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

// ─── Scan animation — spin uses transform: rotate only (no transition: all) ───
function ScanRing() {
  return (
    <div style={{ width: 120, height: 120, position: "relative" }}>
      <svg width="120" height="120" viewBox="0 0 120 120" style={{ animation: "spin 1.5s linear infinite", transformOrigin: "50% 50%" }}>
        <defs>
          <linearGradient id="scan-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="100%" stopColor={T.amber} />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r="48" fill="none" stroke={T.border} strokeWidth="5" />
        <circle cx="60" cy="60" r="48" fill="none" stroke="url(#scan-grad)" strokeWidth="5" strokeLinecap="round" strokeDasharray="301.6" strokeDashoffset="226" />
      </svg>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ATSChecker() {
  const [phase, setPhase] = useState("idle");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [scanStep, setScanStep] = useState(0);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const [isMobile, setIsMobile] = useState(
    window.innerWidth < 768
  );

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

  // ── Scan step cycling (1.5s per message, 4 steps / 6s total) ───────────────
  useEffect(() => {
    if (phase !== "loading") return;
    setScanStep(0);
    const id = setInterval(() => {
      setScanStep((s) => (s >= SCAN_STEPS.length - 1 ? s : s + 1));
    }, 1500);
    return () => clearInterval(id);
  }, [phase]);

  // ── File handling ─────────────────────────────────────────────────────────
  const handleFileSelect = useCallback((file) => {
    if (!file) return;
    const valid = ["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!valid.includes(file.type) && !file.name.match(/\.(pdf|docx)$/i)) { setError("Please upload a PDF or DOCX file."); return; }
    setError(null);
    setUploadedFile(file);
  }, []);

  const onFileChange = useCallback((e) => handleFileSelect(e.target.files[0]), [handleFileSelect]);
  const onDrop = useCallback((e) => { e.preventDefault(); setIsDragging(false); handleFileSelect(e.dataTransfer.files[0]); }, [handleFileSelect]);
  const onDragOver = useCallback((e) => { e.preventDefault(); setIsDragging(true); }, []);
  const onDragLeave = useCallback(() => setIsDragging(false), []);

  // ── Analysis ──────────────────────────────────────────────────────────────
  const handleAnalyze = useCallback(async () => {
    if (!uploadedFile || !jobDescription.trim()) { setError("Please upload your CV and paste a job description."); return; }
    setError(null);
    setPhase("loading");
    const started = Date.now();
    try {
      const userId = user?.id ?? "anon";
      const filePath = `cv-uploads/${userId}/${Date.now()}-${uploadedFile.name}`;
      const { error: uploadError } = await supabase.storage.from("cv-files").upload(filePath, uploadedFile, { upsert: true });
      if (uploadError) throw uploadError;

      const { data, error: fnError } = await supabase.functions.invoke("analyze-cv", { body: { filePath, jobDescription, userId } });
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
    } catch (err) {
      console.error("ATS analysis error:", err);
      setError("Something went wrong. Please try again.");
      setPhase("idle");
    }
  }, [uploadedFile, jobDescription, user]);

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
          Find out why your CV<br />isn&apos;t getting <span style={{ color: "#D97706", fontWeight: 700 }}>callbacks</span>
        </h1>

        <p style={{ fontSize: 16, lineHeight: 1.75, color: T.muted, maxWidth: 480, marginBottom: 36 }}>
          Upload your CV, paste the job description. Get your score in seconds — based on real regional hiring data.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 44 }}>
          {["Upload your CV (PDF or DOCX)", "Paste the target job description", "Get your score + keyword gaps instantly"].map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 15, color: "rgba(255,255,255,0.85)" }}>
              <div style={{ width: 30, height: 30, background: T.amber, borderRadius: "50%", color: "#000", fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</div>
              {s}
            </div>
          ))}
        </div>

        <div
          onClick={() => fileInputRef.current?.click()}
          onDrop={onDrop} onDragOver={onDragOver} onDragLeave={onDragLeave}
          style={{ position: "relative", background: isDragging ? "rgba(217,119,6,0.05)" : uploadedFile ? "rgba(74,222,128,0.04)" : T.surface, border: `1.5px dashed ${isDragging ? T.amber : uploadedFile ? "rgba(74,222,128,0.4)" : T.border}`, borderRadius: 16, padding: "44px 24px", textAlign: "center", cursor: "pointer", marginBottom: 14, overflow: "hidden", transition: "border-color 0.2s, background 0.2s" }}
        >
          <div aria-hidden style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 0%, rgba(217,119,6,0.05) 0%, transparent 70%)", pointerEvents: "none" }} />
          <input ref={fileInputRef} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" style={{ display: "none" }} onChange={onFileChange} />
          <div style={{ width: 52, height: 52, background: uploadedFile ? "rgba(74,222,128,0.1)" : T.amberDim, border: `1px solid ${uploadedFile ? "rgba(74,222,128,0.35)" : T.amberBorder}`, borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
            {uploadedFile ? <CheckCircle size={22} color={T.green} /> : <Upload size={22} color={T.amber} />}
          </div>
          <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 700, color: uploadedFile ? T.green : T.text, marginBottom: 6 }}>
            {uploadedFile ? uploadedFile.name : "Drop your CV here"}
          </div>
          <div style={{ fontSize: 13, color: T.muted }}>
            {uploadedFile ? "File ready · click to replace" : <>or <span style={{ color: T.amber, fontWeight: 500 }}>browse your CV</span></>}
          </div>
          <div style={{ marginTop: 14, fontSize: 11, color: "rgba(160,160,160,0.5)", letterSpacing: 0.5 }}>PDF · DOCX · Max 10MB</div>
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

        {error && (
          <div style={{ color: T.red, fontSize: 13, marginBottom: 12, padding: "10px 16px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10 }}>{error}</div>
        )}

        <button
          onClick={handleAnalyze}
          style={{ width: "100%", background: T.text, color: "#000", border: "none", borderRadius: 12, padding: "18px 24px", fontFamily: "'DM Sans', sans-serif", fontSize: 16, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, letterSpacing: -0.3, transition: "opacity 0.15s, transform 0.15s" }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; e.currentTarget.style.transform = "translateY(-1px)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "translateY(0)"; }}
        >
          Analyze My CV <ArrowRight size={18} />
        </button>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 14, fontSize: 12, color: "rgba(160,160,160,0.6)" }}>
          <Lock size={12} color="rgba(160,160,160,0.5)" />
          Secure processing via Supabase · Your data is never sold
        </div>
      </div>
    );

    return (
      <div ref={outerRef} style={{ background: T.bg, minHeight: "100vh", color: T.text, fontFamily: "'DM Sans', sans-serif", overflow: "hidden", position: "relative", lineHeight: 1.6 }}>
        <div aria-hidden style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
          <div style={{ position: "absolute", top: "-20%", left: "50%", transform: "translateX(-50%)", width: 800, height: 500, background: "radial-gradient(ellipse at center, rgba(217,119,6,0.08) 0%, transparent 70%)" }} />
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
    return (
      <div style={{ background: T.bg, minHeight: "100vh", color: T.text, fontFamily: "'DM Sans', sans-serif", display: "flex", flexDirection: "column", lineHeight: 1.6 }}>
        <Nav />
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, padding: 40 }}>
          <ScanRing />
          <div style={{ color: "#A0A0A0", fontSize: 14, textAlign: "center", maxWidth: 320, lineHeight: 1.5 }}>{SCAN_STEPS[scanStep]}</div>
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
  const missingCount = results?.missingCount ?? 100 - score;

  return (
    <div style={{ background: T.bg, minHeight: "100vh", color: T.text, fontFamily: "'DM Sans', sans-serif", lineHeight: 1.6 }}>
      <style>{`
        @keyframes ats-bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(4px); } }
      `}</style>
      <div aria-hidden style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-10%", left: "50%", transform: "translateX(-50%)", width: 700, height: 400, background: "radial-gradient(ellipse at center, rgba(217,119,6,0.07) 0%, transparent 70%)" }} />
      </div>
      <div style={{ position: "relative", zIndex: 1 }}>
        <Nav back={() => { setPhase("idle"); setResults(null); setUploadedFile(null); setJobDescription(""); }} />

        <div style={{ maxWidth: 640, margin: "0 auto", padding: "52px 28px 100px" }}>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginBottom: 40 }}>
            <div style={{ position: "relative", width: 190, height: 190, marginBottom: 20 }}>
              <AnimatedScoreRing score={score} size={190} strokeWidth={12} gradientId="result-ring-main" />
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 52, fontWeight: 700, lineHeight: 1, letterSpacing: -1, color: T.text }}>{score}</div>
                <div style={{ fontSize: 13, color: T.muted, marginTop: 4 }}>out of 100</div>
              </div>
            </div>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 22, fontWeight: 700, letterSpacing: "-0.5px", marginBottom: 14 }}>{getScoreLabel(score)}</div>
            <div style={{ background: T.amber, color: "#000", fontFamily: "'DM Sans', sans-serif", fontSize: 13, fontWeight: 700, padding: "7px 20px", borderRadius: 999, marginBottom: 14, display: "inline-block" }}>
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
              {visibilityBoosters.map((kw) => <Chip key={kw} label={kw} variant="green" />)}
            </div>
          </div>

          {/* Rank Triggers — unchanged */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: T.amber, marginBottom: 14 }}>
              <Plus size={13} color={T.amber} /> Rank Triggers
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {rankTriggers.map((kw) => <Chip key={kw} label={kw} variant="amber" />)}
            </div>
          </div>

          {/* CVPassport Verified — unchanged */}
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
            <div style={{ background: "rgba(59,130,246,0.12)", border: "1px solid rgba(59,130,246,0.35)", color: "#60A5FA", fontSize: 13, fontWeight: 600, padding: "9px 22px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Sparkles size={13} color="#60A5FA" />
              CVPassport Verified — Top {topPercent}% Ready for GCC {industry}
            </div>
          </div>

          {/* Conversion card — unchanged */}
          <div style={{ background: T.elevated, border: `1px solid ${T.border}`, borderRadius: 20, padding: "32px 28px", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div aria-hidden style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "linear-gradient(90deg, transparent, rgba(59,130,246,0.5), transparent)" }} />
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 18, fontWeight: 700, lineHeight: 1.4, marginBottom: 12 }}>
              You&apos;re missing {missingCount} Rank Triggers for this role
            </div>
            <div style={{ fontSize: 14, color: T.muted, lineHeight: 1.7, marginBottom: 22, maxWidth: 340, marginLeft: "auto", marginRight: "auto" }}>
              Unlock your full gap + AI rewrite suggestions built on real GCC hiring data
            </div>
            <button
              style={{ width: "100%", background: T.text, color: "#000", border: "none", borderRadius: 12, padding: "17px 24px", fontFamily: "'DM Sans', sans-serif", fontSize: 15, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, letterSpacing: -0.3, marginBottom: 14, transition: "opacity 0.15s, transform 0.15s" }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              Unlock Full Analysis <ArrowRight size={16} />
            </button>
            <div style={{ fontSize: 11, color: "rgba(160,160,160,0.5)" }}>Trusted by job seekers across UAE, Saudi Arabia &amp; India</div>
          </div>

          <div style={{ display: "flex", justifyContent: "center", marginTop: 28 }}>
            <div style={{ width: 38, height: 38, background: T.elevated, border: `1px solid ${T.border}`, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", animation: "ats-bounce 2s ease-in-out infinite" }}>
              <ChevronDown size={16} color={T.muted} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
