import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Lock, ChevronDown, Sparkles, Plus, ArrowRight, CheckCircle } from "lucide-react";
import { Turnstile } from "@marsidev/react-turnstile";
import { supabase } from "./supabaseClient";
import { getGatekeeperData } from "./services/gatekeeper";
import { extractCvText, CvExtractionError } from "./services/cvExtraction";
import { logEvent } from "./lib/analytics/logEvent";
import CvOnlyResult from "./components/CvOnlyResult";
import UpgradeModal from "./UpgradeModal";

// Sprint #4: Cloudflare Turnstile site key (public). When unset locally
// the widget is skipped entirely and the Edge Function fail-opens in dev.
const TURNSTILE_SITE_KEY = process.env.REACT_APP_TURNSTILE_SITE_KEY || "";
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY || "";

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

// Day 2: stages mirror real pipeline progress. The loadingStage state
// drives currentIdx — no more 1-second timer faking progress.
const STAGE_ORDER = ["extracting", "analysing", "scoring"];

function buildFreeLoadingSteps() {
  return [
    "Extracting your CV text…",
    "Analysing CV against the JD (Haiku 4.5)…",
    "Compiling your scores…",
  ];
}

function buildProLoadingSteps(planName) {
  const p = formatPlanDisplayName(planName);
  return [
    "Extracting your CV text…",
    `Running ${p} analysis (Sonnet 4.6)…`,
    "Compiling your scores…",
  ];
}

// ─── Sample result card — animated OLED version ─────────────────────────────
const SAMPLE_STATES = [
  { score: 42, color: "#F87171", glow: "rgba(248,113,113,0.35)", status: "Needs Improvement", headline: "Below the bar — let\u2019s fix that", pill: "+58 Points within reach", dot: 42, kw: 28, st: 35, ct: 48 },
  { score: 58, color: "#60A5FA", glow: "rgba(96,165,250,0.35)", status: "Getting There", headline: "Making progress — keep going", pill: "+42 Points within reach", dot: 58, kw: 45, st: 52, ct: 62 },
  { score: 70, color: "#FBBF24", glow: "rgba(251,191,36,0.35)", status: "On Track", headline: "Solid ground — almost there", pill: "+30 Points within reach", dot: 70, kw: 62, st: 68, ct: 75 },
  { score: 85, color: "#4ADE80", glow: "rgba(74,222,128,0.35)", status: "Your Foundation is Solid", headline: "Strong — fine-tune for top tier", pill: "+15 Points within reach", dot: 85, kw: 78, st: 82, ct: 90 },
  { score: 94, color: "#22C55E", glow: "rgba(34,197,94,0.4)", status: "Market Ready", headline: "Elite — you\u2019re in the top 6%", pill: "+6 Points within reach", dot: 94, kw: 90, st: 92, ct: 96 },
];
export function SampleResultCard({ isMobile = false, pinnedScore = null }) {
  const pinnedIdx = pinnedScore != null
    ? SAMPLE_STATES.findIndex((state) => state.score === pinnedScore)
    : -1;
  const [idx, setIdx] = useState(pinnedIdx >= 0 ? pinnedIdx : 0);
  useEffect(() => {
    if (pinnedIdx >= 0) return undefined;
    const id = setInterval(() => setIdx((i) => (i + 1) % SAMPLE_STATES.length), 2500);
    return () => clearInterval(id);
  }, [pinnedIdx]);
  const s = SAMPLE_STATES[idx];
  const ringSize = 140;
  const sw = 10;
  const r = (ringSize - sw * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - s.score / 100);
  const subColors = { kw: { num: "#60A5FA", bar: "#1D4ED8" }, st: { num: "#FBBF24", bar: "#B45309" }, ct: { num: "#4ADE80", bar: "#15803D" } };

  return (
    <div style={{ width: isMobile ? "100%" : 380, maxWidth: isMobile ? "100%" : 380, alignSelf: isMobile ? "stretch" : undefined, background: "#0A0A0A", border: "1px solid #1A1A1A", borderRadius: 24, padding: "28px 22px 24px", position: "relative", flexShrink: 0, boxSizing: "border-box", overflow: "hidden" }}>
      <div aria-hidden style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${s.color}66, transparent)`, transition: "background 0.6s" }} />

      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", color: "#333", marginBottom: 20 }}>Sample Result</div>

      {/* Score ring */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 16 }}>
        <div style={{ position: "relative", width: ringSize, height: ringSize, marginBottom: 10, filter: `drop-shadow(0 0 12px ${s.glow})`, transition: "filter 0.3s" }}>
          {/* Spinning conic border — color-reactive, extends outside SVG ring */}
          <div aria-hidden style={{ position: "absolute", inset: -4, borderRadius: "50%", padding: 2, background: `conic-gradient(from var(--ats-angle, 0deg), transparent 60%, ${s.color} 80%, transparent 100%)`, WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)", WebkitMaskComposite: "xor", maskComposite: "exclude", pointerEvents: "none", animation: "ats-spin-border 3s linear infinite" }} />
          <svg width={ringSize} height={ringSize} viewBox={`0 0 ${ringSize} ${ringSize}`} style={{ transform: "rotate(-90deg)", position: "relative" }}>
            <circle cx={ringSize / 2} cy={ringSize / 2} r={r} fill="none" stroke="#1A1A1A" strokeWidth={sw} />
            <circle cx={ringSize / 2} cy={ringSize / 2} r={r} fill="none" stroke={s.color} strokeWidth={sw} strokeLinecap="butt" strokeDasharray={circ} strokeDashoffset={offset} style={{ transition: "stroke-dashoffset 0.8s ease-out, stroke 0.6s" }} />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 52, fontWeight: 800, lineHeight: 1, letterSpacing: -3, color: s.color, transition: "color 0.6s", position: "relative" }}>{s.score}</div>
            <div style={{ fontSize: 9, color: "#444", marginTop: 3, letterSpacing: 1, textTransform: "uppercase", position: "relative" }}>Score</div>
          </div>
        </div>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 700, color: T.text, letterSpacing: "-0.3px", transition: "color 0.3s" }}>{s.status}</div>
        <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>{s.headline}</div>
        <div style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 999, padding: "5px 14px", fontSize: 11, fontWeight: 700, color: T.text, marginTop: 10, display: "inline-block" }}>{s.pill}</div>
      </div>

      {/* Track bar */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ height: 4, borderRadius: 999, background: "linear-gradient(90deg, #EF4444 0%, #F59E0B 45%, #22C55E 100%)", position: "relative", marginBottom: 6 }}>
          <div style={{ position: "absolute", top: "50%", left: `${s.dot}%`, transform: "translate(-50%,-50%)", width: 12, height: 12, borderRadius: "50%", background: "#fff", border: "2px solid #0A0A0A", boxShadow: "0 0 0 2px rgba(255,255,255,0.12), 0 0 8px rgba(255,255,255,0.2)", transition: "left 0.8s ease-out" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#333" }}>
          <span>Needs Work</span><span>On Track</span><span>Market Ready</span>
        </div>
      </div>

      {/* Sub-scores */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 16 }}>
        {[{ v: s.kw, l: "Keywords", c: subColors.kw }, { v: s.st, l: "Structure", c: subColors.st }, { v: s.ct, l: "Content", c: subColors.ct }].map(({ v, l, c }) => (
          <div key={l} style={{ background: "#0F0F0F", border: "1px solid #1A1A1A", borderRadius: 14, padding: "14px 6px 10px", textAlign: "center", position: "relative", overflow: "hidden" }}>
            <div aria-hidden style={{ position: "absolute", inset: 0, borderRadius: 14, background: "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.03) 0%, transparent 70%)", pointerEvents: "none" }} />
            <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1, letterSpacing: "-1px", color: c.num, marginBottom: 6, position: "relative", transition: "color 0.6s" }}>{v}</div>
            <div style={{ height: 2, borderRadius: 999, background: "#1A1A1A", margin: "0 8px 6px", overflow: "hidden", position: "relative" }}>
              <div style={{ height: "100%", borderRadius: 999, background: c.bar, width: `${v}%`, transition: "width 0.8s ease-out" }} />
            </div>
            <div style={{ fontSize: 8, color: "#444", letterSpacing: "1.5px", textTransform: "uppercase", position: "relative" }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Visibility Boosters */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.18)" }}>
            <Sparkles size={10} color="#4ADE80" />
          </div>
          <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "2.5px", textTransform: "uppercase", color: "#4ADE80" }}>Visibility Boosters</span>
          <div style={{ height: 1, flex: 1, background: "linear-gradient(90deg, rgba(34,197,94,0.18), transparent)" }} />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {["Negotiation", "CRM", "Client Relations", "Lead Gen", "Pipeline"].map((k) => (
            <span key={k} style={{ fontSize: 10, fontWeight: 500, padding: "4px 10px", borderRadius: 999, background: "rgba(34,197,94,0.07)", border: "1px solid rgba(34,197,94,0.22)", color: "#4ADE80", position: "relative", overflow: "hidden", display: "inline-block" }}>
              <span aria-hidden style={{ position: "absolute", inset: 0, borderRadius: 999, pointerEvents: "none", background: "radial-gradient(ellipse at 50% 0%, rgba(34,197,94,0.12) 0%, transparent 65%)" }} />
              {k}
            </span>
          ))}
        </div>
      </div>

      {/* Rank Triggers */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.18)" }}>
            <Plus size={10} color="#FCD34D" />
          </div>
          <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: "2.5px", textTransform: "uppercase", color: "#FCD34D" }}>Rank Triggers</span>
          <div style={{ height: 1, flex: 1, background: "linear-gradient(90deg, rgba(251,191,36,0.18), transparent)" }} />
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
          {["RERA Certified", "Off-plan Sales", "KYC", "AML"].map((k) => (
            <span key={k} style={{ fontSize: 10, fontWeight: 500, padding: "4px 10px", borderRadius: 999, background: "rgba(251,191,36,0.06)", border: "1px solid rgba(251,191,36,0.20)", color: "#FCD34D", position: "relative", overflow: "hidden", display: "inline-block" }}>
              <span aria-hidden style={{ position: "absolute", inset: 0, borderRadius: 999, pointerEvents: "none", background: "radial-gradient(ellipse at 50% 0%, rgba(251,191,36,0.10) 0%, transparent 65%)" }} />
              {k}
            </span>
          ))}
        </div>
      </div>

      {/* Verified badge */}
      <div style={{ background: "#0D0D0D", border: "1px solid #1A2A3A", borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(59,130,246,0.10)", border: "1px solid rgba(59,130,246,0.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Sparkles size={12} color="#60A5FA" />
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "#93C5FD", marginBottom: 2 }}>CVPassport Verified</div>
          <div style={{ fontSize: 9, color: "#2D4A6A" }}>Top 15% Ready · GCC Finance</div>
        </div>
      </div>

      {/* Bottom label */}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", color: "rgba(160,160,160,0.3)" }}>
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

export function PremiumScoreCircle({ score }) {
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
    <div style={{ position: "relative", width: 220, height: 220, marginBottom: 20, filter: glowMap[color] || "none", transition: "filter 0.3s" }}>
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
        <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 72, fontWeight: 800, lineHeight: 1, letterSpacing: -4, color, transition: "color 0.15s" }}>
          {display}
        </div>
        <div style={{ fontSize: 11, color: T.muted, marginTop: 4, letterSpacing: 3, textTransform: "uppercase" }}>SCORE</div>
        <div style={{ fontSize: 12, color, marginTop: 2, fontWeight: 600, transition: "color 0.15s" }}>{sublabelMap[color] || ""}</div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ATSChecker({
  onResultsVisible,
  onBack = null,
  resume: resumeProp = {},
  isPro: isProProp = false,
  handleDownload = null,
  downloadState: downloadStateProp = { status: 'idle' },
  onNavigateToContent = null,
} = {}) {
  const hasCv = resumeProp?.name !== "" && resumeProp?.name !== undefined;
  const [phase, setPhase] = useState("idle");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [loadingMeta, setLoadingMeta] = useState(null);
  // Day 2: real pipeline progress — null | "extracting" | "analysing" | "scoring"
  const [loadingStage, setLoadingStage] = useState(null);
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
  const [showPaywall, setShowPaywall] = useState(false);
  // Sprint #4: Turnstile token + per-call quota/spend response
  const [turnstileToken, setTurnstileToken] = useState(null);
  const turnstileRef = useRef(null);
  const [quota, setQuota] = useState(null);
  const [spend, setSpend] = useState(null);
  // JD-nudge sprint: in-place re-scan from CvOnlyResult (no loading-page swap)
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const navigate = useNavigate();

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

  // Day 2: removed the 1-second loadingSeconds timer that used to fake
  // progression. Real stage transitions drive the loading UI now.

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
  // Day 2: real pipeline. Extract CV text client-side → send full text +
  // JD to the analyze-cv Edge Function → render the structured output
  // returned via Anthropic tool_use. No more hardcoded scores, no more
  // base64 truncation, no more 6s artificial delay, no more detectRole
  // regex fallback to sales_real_estate. Persona is inferred by the model.
  //
  // JD-nudge: handleAnalyze accepts an optional { jdOverride, fromNudge }
  // so the CvOnlyResult component can re-run the scan with a freshly
  // pasted JD without forcing a navigation. fromNudge=true skips the
  // staged loading screen (CvOnlyResult shows its own shimmer).
  const handleAnalyze = useCallback(async (overrides) => {
    if (!uploadedFile) { setError("Please upload your CV."); return; }
    setError(null);

    const jdOverride = overrides && typeof overrides.jdOverride === "string" ? overrides.jdOverride : null;
    const fromNudge = !!(overrides && overrides.fromNudge);
    const jdToUse = jdOverride != null ? jdOverride : jobDescription;
    if (jdOverride != null) setJobDescription(jdOverride);

    if (typeof window.gtag === "function") {
      window.gtag("event", "lead_capture", {
        source: "ats_checker",
        from_nudge: fromNudge ? 1 : 0,
      });
    }

    let paidUser = false;
    let planName = "Career Pro";
    if (user?.id) {
      const gate = await getGatekeeperData();
      paidUser = gate.isPaidUser;
      planName = gate.planName || planName;
    }
    const tier = paidUser ? "paid" : "free";

    if (fromNudge) {
      setIsReanalyzing(true);
    } else {
      setPhase("loading");
    }
    setLoadingStage("extracting");

    let cvText = "";
    try {
      const extracted = await extractCvText(uploadedFile);
      cvText = extracted.text;
    } catch (err) {
      if (err instanceof CvExtractionError) {
        setError(err.hint || err.message);
      } else {
        // eslint-disable-next-line no-console
        console.error("ATS extraction error:", err);
        setError("Could not read your file. Try uploading a text-based PDF or DOCX.");
      }
      if (fromNudge) {
        setIsReanalyzing(false);
      } else {
        setPhase("idle");
      }
      return;
    }

    setLoadingStage("analysing");

    try {
      const userId = user?.id ?? "anon";

      // Sprint #4: use plain fetch so we can read the response body on
      // 429 (rate_limited) / 402 (spend_capped) / 403 (turnstile_blocked).
      const response = await fetch(
        `${SUPABASE_URL}/functions/v1/analyze-cv`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            apikey: SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            cvText,
            jobDescription: jdToUse || "",
            userId,
            tier,
            planName,
            turnstileToken,
          }),
        },
      );

      let data = null;
      try {
        data = await response.json();
      } catch {
        // ignore — handled below
      }

      // Reset Turnstile after every attempt so the next try gets a fresh token.
      if (turnstileRef.current && typeof turnstileRef.current.reset === "function") {
        try { turnstileRef.current.reset(); } catch { /* noop */ }
      }
      setTurnstileToken(null);

      if (!response.ok) {
        const friendly =
          (data && data.message) ||
          (response.status === 429
            ? "Daily scan limit reached. Try again tomorrow or upgrade."
            : response.status === 402
              ? "Daily Anthropic spend cap hit. Resets at UTC midnight."
              : response.status === 403
                ? "Captcha verification failed. Reload and try again."
                : "Scoring engine returned an error. Please try again.");
        setError(friendly);
        if (fromNudge) setIsReanalyzing(false);
        else setPhase("idle");
        if (data && data.quota) setQuota(data.quota);
        if (data && data.spend) setSpend(data.spend);
        return;
      }

      if (data && data.error) {
        const friendly = data.message || "Scoring engine returned an error. Please try again.";
        setError(friendly);
        if (fromNudge) setIsReanalyzing(false);
        else setPhase("idle");
        return;
      }

      setLoadingStage("scoring");

      if (user) {
        try {
          await supabase.from("ats_results").insert({
            user_id: user.id,
            score: data.score,
            keywords_score: data.keywordsScore,
            structure_score: data.structureScore,
            content_score: data.contentScore,
            visibility_boosters: data.visibilityBoosters,
            rank_triggers: data.rankTriggers,
            industry: data.industry,
            created_at: new Date().toISOString(),
          });
        } catch (persistErr) {
          // Persistence failure is not fatal for the scan itself.
          // eslint-disable-next-line no-console
          console.warn("ats_results persist failed:", persistErr);
        }
      }

      setResults(data);
      if (data.quota) setQuota(data.quota);
      if (data.spend) setSpend(data.spend);
      setPhase("results");
      onResultsVisible?.(true);

      // JD-nudge analytics: fire when a nudge re-scan flips cv_only → matched.
      if (fromNudge && data?.mode === "matched") {
        logEvent("jd_nudge_converted", {
          score: data.score,
          industry: data.industry,
          seniority: data.seniority,
          jdChars: jdToUse.length,
          model: data.model,
        });
      }
      if (fromNudge) setIsReanalyzing(false);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error("ATS analysis error:", err);
      setError("Something went wrong. Please try again.");
      if (fromNudge) setIsReanalyzing(false);
      else setPhase("idle");
    } finally {
      setLoadingStage(null);
    }
  }, [uploadedFile, jobDescription, user, onResultsVisible, turnstileToken]);

  // JD-nudge: callback handed to CvOnlyResult. Always passes
  // fromNudge:true so the parent knows to skip the staged loader and
  // fire jd_nudge_converted on success.
  const handleNudgeAnalyze = useCallback(
    (jdText) => handleAnalyze({ jdOverride: jdText, fromNudge: true }),
    [handleAnalyze],
  );

  // ── Shared nav ────────────────────────────────────────────────────────────
  const Nav = ({ back }) => (
    <nav style={{ width: "100%", padding: "16px 24px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid rgba(255,255,255,0.05)", flexShrink: 0, boxSizing: "border-box" }}>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          style={{ background: "transparent", border: "none", padding: "6px 8px", color: "#A0A0A0", fontSize: 14, fontWeight: 500, cursor: "pointer", fontFamily: "'DM Sans', sans-serif", flexShrink: 0 }}
        >
          ← Back
        </button>
      )}
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
          <label style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: T.muted, marginBottom: 6, display: "block" }}>Target Job Description</label>
          <div style={{ fontSize: 12, color: T.muted, marginBottom: 10 }}>Paste the full job posting — role, requirements, responsibilities.</div>
          <textarea
            value={jobDescription} onChange={(e) => setJobDescription(e.target.value)}
            placeholder="e.g. We are hiring a Customer Service Executive in Dubai. Requirements: 2+ years experience, fluent English, banking background preferred..."
            style={{ width: "100%", background: T.surface, border: `1.5px solid ${T.border}`, borderRadius: 16, padding: "18px 20px", fontFamily: "'DM Sans', sans-serif", fontSize: 14, color: T.text, resize: "none", height: 130, outline: "none", lineHeight: 1.6, transition: "border-color 0.2s", boxSizing: "border-box" }}
            onFocus={(e) => { e.target.style.borderColor = T.amberBorder; }}
            onBlur={(e) => { e.target.style.borderColor = T.border; }}
          />
          <div style={{ position: "absolute", bottom: 14, right: 16, fontSize: 11, color: "rgba(160,160,160,0.4)", pointerEvents: "none" }}>{jobDescription.length} chars</div>
        </div>
        <div style={{ fontSize: 12, color: T.muted, marginBottom: 16 }}>Tip: Copy directly from LinkedIn, Bayt, or Indeed.</div>

        {error && (
          <div style={{ color: T.red, fontSize: 13, marginBottom: 12, padding: "10px 16px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10 }}>{error}</div>
        )}

        {/* Sprint #4: Turnstile widget — anonymous + free tiers only.
            Paid users skip the captcha (already auth'd + rate-limited). */}
        {!isPro && TURNSTILE_SITE_KEY && (
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 14 }}>
            <Turnstile
              ref={turnstileRef}
              siteKey={TURNSTILE_SITE_KEY}
              onSuccess={(token) => setTurnstileToken(token)}
              onError={() => setTurnstileToken(null)}
              onExpire={() => setTurnstileToken(null)}
              options={{ theme: "dark", size: "normal" }}
            />
          </div>
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
            disabled={!isPro && TURNSTILE_SITE_KEY && !turnstileToken}
            style={{
              width: "100%",
              background: "#0A0A0A",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "18px 24px",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 16,
              fontWeight: 700,
              cursor: !isPro && TURNSTILE_SITE_KEY && !turnstileToken ? "not-allowed" : "pointer",
              opacity: !isPro && TURNSTILE_SITE_KEY && !turnstileToken ? 0.55 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              letterSpacing: -0.3,
              transition: "opacity 0.15s, transform 0.15s",
              position: "relative",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; }}
          >
            Analyze My CV <ArrowRight size={18} />
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 14, fontSize: 12, color: "rgba(160,160,160,0.6)" }}>
          <Lock size={12} color="rgba(160,160,160,0.5)" />
          Secure processing via Supabase · Your data is never sold
        </div>

        {quota && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 8, fontSize: 12, color: T.muted }}>
            {quota.remaining} of {quota.limit} scans remaining today ({quota.tier})
          </div>
        )}
        {spend?.alertThresholdHit && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 6, fontSize: 12, color: T.amber }}>
            ⚠ {Math.round((spend.spentUsdToday / spend.capUsd) * 100)}% of your daily AI budget used (${spend.spentUsdToday.toFixed(2)} of ${spend.capUsd.toFixed(2)})
          </div>
        )}
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
    // Day 2: tie step progression to the real loadingStage state.
    const stageIdx = loadingStage ? STAGE_ORDER.indexOf(loadingStage) : 0;
    const currentIdx = steps.length ? Math.max(0, Math.min(stageIdx, steps.length - 1)) : 0;

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
                  const done = i < currentIdx;
                  const current = i === currentIdx;
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

  // ── RENDER: results — JD-nudge cv_only branch ────────────────────────────
  // The Edge Function returns mode === "cv_only" when the user submitted
  // no JD (or one shorter than 50 chars). CvOnlyResult owns its own
  // animated CTA + locked-preview + shimmer transition; pasting a JD and
  // clicking Analyze re-enters this component via handleNudgeAnalyze and
  // the next response (mode === "matched") falls through to the full
  // result render below.
  if (results?.mode === "cv_only") {
    return (
      <>
        <Nav back={() => { setPhase("idle"); setResults(null); setUploadedFile(null); setJobDescription(""); }} />
        <CvOnlyResult
          result={results}
          onAnalyze={handleNudgeAnalyze}
          isAnalyzing={isReanalyzing}
        />
        {error && (
          <div role="alert" style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", color: T.red, fontSize: 13, padding: "10px 16px", background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 10, backdropFilter: "blur(10px)", WebkitBackdropFilter: "blur(10px)" }}>
            {error}
          </div>
        )}
        {showPaywall && (
          <UpgradeModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} feature="ats" />
        )}
      </>
    );
  }

  // ── RENDER: results — matched ────────────────────────────────────────────
  const score = results?.score ?? 82;
  const keywordsScore = results?.keywordsScore ?? 72;
  const structureScore = results?.structureScore ?? 58;
  const contentScore = results?.contentScore ?? 85;
  const visibilityBoosters = results?.visibilityBoosters ?? ["Negotiation", "CRM", "Client Relations", "Lead Generation", "Sales Pipeline"];
  const rankTriggers = results?.rankTriggers ?? ["RERA Certified", "Off-plan Sales", "KYC", "AML"];
  const industry = results?.industry ?? "Finance";
  const topPercent = results?.topPercent ?? 15;
  const isFreeTier = !isPro;
  const isMonthlyPro = isPro && gatePlanName === "Active Hunter";
  return (
    <>
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
        @keyframes cvp-dl-shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }
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
            <div style={{ fontSize: 12, color: '#444', textAlign: 'center', marginBottom: 16, letterSpacing: '0.3px' }}>Analyzed against real GCC &amp; India hiring data</div>
          </div>

          {/* Gradient bar */}
          <div style={{ marginBottom: 36 }}>
            <div style={{ height: 5, borderRadius: 999, background: 'linear-gradient(90deg, #EF4444 0%, #F59E0B 45%, #22C55E 100%)', position: "relative", marginBottom: 10 }}>
              <div style={{ position: "absolute", top: "50%", left: `${score}%`, transform: "translate(-50%,-50%)", width: 16, height: 16, borderRadius: "50%", background: "#fff", border: "2.5px solid #0A0A0A", boxShadow: "0 0 0 2px rgba(255,255,255,0.15), 0 0 12px rgba(255,255,255,0.25)" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: '#3A3A3A' }}>
              <span>Needs Work</span><span>On Track</span><span>Market Ready</span>
            </div>
          </div>

          {/* Sub-scores */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 36 }}>
            {[
              { value: keywordsScore, label: "Keywords", color: "#60A5FA", barColor: "#1D4ED8" },
              { value: structureScore, label: "Structure", color: "#FBBF24", barColor: "#B45309" },
              { value: contentScore, label: "Content", color: "#4ADE80", barColor: "#15803D" },
            ].map(({ value, label, color, barColor }) => (
              <div key={label} style={{ background: '#0F0F0F', border: '1px solid #1A1A1A', borderRadius: 16, padding: '20px 8px 14px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                <div aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: 16, background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.03) 0%, transparent 70%)', pointerEvents: 'none' }} />
                <div style={{ fontSize: 38, fontWeight: 700, lineHeight: 1, marginBottom: 10, letterSpacing: '-1px', color, position: 'relative' }}>{value}</div>
                <div style={{ height: 2, borderRadius: 999, background: '#1A1A1A', margin: '0 10px 10px', overflow: 'hidden', position: 'relative' }}>
                  <div style={{ height: '100%', borderRadius: 999, background: barColor, width: `${value}%` }} />
                </div>
                <div style={{ fontSize: 10, color: '#444', letterSpacing: '1.5px', textTransform: 'uppercase', position: 'relative' }}>{label}</div>
              </div>
            ))}
          </div>

          {/* Visibility Boosters */}
          <div style={{ marginBottom: 30 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 26, height: 26, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.18)' }}>
                <Sparkles size={12} color="#4ADE80" />
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#4ADE80' }}>Visibility Boosters</span>
              <div style={{ height: 1, flex: 1, background: 'linear-gradient(90deg, rgba(34,197,94,0.18), transparent)' }} />
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {visibilityBoosters.map((kw, i) => (
                <span
                  key={kw}
                  style={{
                    fontSize: 13, fontWeight: 500, padding: '7px 14px', borderRadius: 999,
                    background: 'rgba(34,197,94,0.07)', border: '1px solid rgba(34,197,94,0.22)', color: '#4ADE80',
                    position: 'relative', overflow: 'hidden', display: 'inline-block',
                    opacity: chipsRevealed ? 1 : 0, transform: chipsRevealed ? 'translateY(0)' : 'translateY(20px)',
                    transition: 'opacity 0.4s ease, transform 0.4s ease', transitionDelay: `${i * 50}ms`,
                  }}
                >
                  <span aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: 999, pointerEvents: 'none', background: 'radial-gradient(ellipse at 50% 0%, rgba(34,197,94,0.12) 0%, transparent 65%)' }} />
                  {kw}
                </span>
              ))}
            </div>
          </div>

          {/* Rank Triggers */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
              <div style={{ width: 26, height: 26, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.18)' }}>
                <Plus size={12} color="#FCD34D" />
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2.5px', textTransform: 'uppercase', color: '#FCD34D' }}>Rank Triggers</span>
              <div style={{ height: 1, flex: 1, background: 'linear-gradient(90deg, rgba(251,191,36,0.18), transparent)' }} />
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {rankTriggers.map((kw, i) => (
                <span
                  key={kw}
                  style={{
                    fontSize: 13, fontWeight: 500, padding: '7px 14px', borderRadius: 999,
                    background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.20)', color: '#FCD34D',
                    position: 'relative', overflow: 'hidden', display: 'inline-block',
                    opacity: chipsRevealed ? 1 : 0, transform: chipsRevealed ? 'translateY(0)' : 'translateY(20px)',
                    transition: 'opacity 0.4s ease, transform 0.4s ease', transitionDelay: `${(visibilityBoosters.length + i) * 50}ms`,
                  }}
                >
                  <span aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: 999, pointerEvents: 'none', background: 'radial-gradient(ellipse at 50% 0%, rgba(251,191,36,0.10) 0%, transparent 65%)' }} />
                  {kw}
                </span>
              ))}
            </div>
          </div>

          {/* CVPassport Verified */}
          <div style={{ background: '#0D0D0D', border: '1px solid #1A2A3A', borderRadius: 16, padding: '15px 18px', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(59,130,246,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Sparkles size={15} color="#60A5FA" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#93C5FD', marginBottom: 3 }}>CVPassport Verified</div>
              <div style={{ fontSize: 11, color: '#2D4A6A' }}>Top {topPercent}% Ready · GCC {industry}</div>
            </div>
          </div>

          {/* Conversion card — shown to free users only */}
          {isFreeTier && (
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
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
                    <rect x="3" y="11" width="18" height="11" rx="2"/>
                    <path d="M7 11V7a5 5 0 0110 0v4"/>
                  </svg>
                </div>
              </div>
            </div>

            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', lineHeight: 1.4, marginBottom: 8 }}>
              Your CV was filtered out by the ATS.
            </div>
            <div style={{ fontSize: 13, color: '#666', lineHeight: 1.65, marginBottom: 24, maxWidth: 300, marginLeft: 'auto', marginRight: 'auto' }}>
              {"You\u2019re in the bottom 40% of applicants for this role. Unlock the exact keyword gaps and AI-rewrite suggestions \u2014 analyzed against live UAE & Gulf job listings."}
            </div>

            {/* Unlock button with running border */}
            <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 12, marginBottom: 12 }}>
              <button
                onClick={() => setShowPaywall(true)}
                style={{
                  width: '100%', background: '#0A0A0A', color: '#fff',
                  border: 'none', borderRadius: 12,
                  padding: '16px 24px', fontSize: 15, fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 8, letterSpacing: -0.3,
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
                {'Get to the Top 10% \u2014 AED 29/mo'}
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            </div>

            <div style={{ fontSize: 11, color: '#333' }}>
              Cancel anytime · Instant access · 500+ UAE job seekers
            </div>
          </div>
          )}

          {isMonthlyPro && (
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setShowPaywall(true)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: '6px 4px',
                  color: T.muted,
                  fontSize: 12,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  textDecoration: 'underline',
                  textDecorationColor: 'rgba(160,160,160,0.25)',
                }}
              >
                {"You\u2019re on Active Hunter. Switch to Career Pro annual and save AED 149/yr \u2192"}
              </button>
            </div>
          )}

          {/* Download CV */}
          <div style={{ marginTop: 28 }}>
            <div style={{
              borderRadius: 14, padding: '1.5px',
              background: 'linear-gradient(90deg, #1C1C1C 0%, #1C1C1C 20%, rgba(255,255,255,0.55) 50%, #1C1C1C 80%, #1C1C1C 100%)',
              backgroundSize: '300% 100%',
              animation: 'cvp-dl-shimmer 2.5s linear infinite',
            }}>
              <button
                type="button"
                onClick={() => {
                  if (hasCv && handleDownload) {
                    handleDownload();
                  } else if (onNavigateToContent) {
                    onNavigateToContent();
                  } else {
                    navigate('/dashboard');
                  }
                }}
                disabled={hasCv && downloadStateProp.status !== 'idle'}
                style={{
                  width: '100%', height: 54, borderRadius: 12,
                  border: 'none', background: '#141414', color: '#fff',
                  fontSize: 15, fontWeight: 600, cursor: (hasCv && downloadStateProp.status !== 'idle') ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  fontFamily: 'inherit',
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                <span>{hasCv ? (downloadStateProp.status === 'generating' ? 'Generating your CV...' : 'Download CV') : 'Start Building'}</span>
              </button>
            </div>
            <div style={{ fontSize: 11, color: '#333', textAlign: 'center', marginTop: 10 }}>
              Optimized for Gulf / Indian ATS standards
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
    <UpgradeModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} feature="ats" />
    </>
  );
}
