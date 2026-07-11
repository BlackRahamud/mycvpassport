import { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { hasFeatureAccess, getPaymentLink } from "./utils/paywall";
import { useGeoContent } from "./hooks/useGeoContent";
import { supabase } from "./appSupabaseClient";
import safeFetch from "./lib/net/safeFetch";

const EASE = [0.4, 0, 0.2, 1];

function technicalSkillsGroupsForTemplate(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((g) => g.chips?.length > 0);
  const chips = raw.split("|").map((s) => s.trim()).filter(Boolean);
  if (!chips.length) return [];
  return [{ category: "Technical Skills", chips }];
}

const BANK_FILE = "/cvpassport_keywords.json";

const TEMPLATE_KEY_MAP = {
  banking: "banking_finance",
  finance: "banking_finance",
  "tech-it": "tech_it_pro",
  "gulf-exec": "gulf_executive",
  hospitality: "hospitality",
  "compact-pro": "compact_pro",
  creative: "creative_sidebar",
  "ats-intl": "ats_international",
};

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function keywordToList(raw) {
  if (Array.isArray(raw)) return raw.map((x) => String(x).trim()).filter(Boolean);
  if (raw && typeof raw === "object") {
    const values = Object.values(raw).flatMap((v) => (Array.isArray(v) ? v : []));
    return values.map((x) => String(x).trim()).filter(Boolean);
  }
  return [];
}

function detectTemplateKey(template) {
  if (!template) return "banking_finance";
  const layout = String(template.layout || "").toLowerCase();
  const mapped = TEMPLATE_KEY_MAP[layout];
  if (mapped) return mapped;
  const name = String(template.name || "").toLowerCase();
  if (name.includes("tech") && name.includes("pro")) return "tech_it_pro";
  if (name.includes("tech")) return "tech_it";
  if (name.includes("bank") || name.includes("finance")) return "banking_finance";
  return "banking_finance";
}

function buildCvText(resume) {
  const techGroups = technicalSkillsGroupsForTemplate(resume?.technicalSkills);
  const technicalSkillsText = techGroups.map((g) => g.chips.join(" ")).join(" ");
  const exp = Array.isArray(resume?.experience)
    ? resume.experience.map((e) => [e?.role, e?.company, e?.location, e?.points, e?.period].filter(Boolean).join(" ")).join(" ")
    : "";
  const edu = Array.isArray(resume?.education)
    ? resume.education.map((e) => [e?.degree, e?.school, e?.fieldOfStudy, e?.year].filter(Boolean).join(" ")).join(" ")
    : "";
  const certs = Array.isArray(resume?.certifications)
    ? resume.certifications.map((c) => [c?.name, c?.issuer, c?.year].filter(Boolean).join(" ")).join(" ")
    : String(resume?.certifications || "");

  return normalizeText(
    [resume?.name, resume?.title, resume?.summary, resume?.skills, technicalSkillsText, resume?.languages, resume?.projects, resume?.volunteerWork, resume?.publications, exp, edu, certs]
      .filter(Boolean)
      .join(" ")
  );
}

/* djb2 string hash — keys the sessionStorage AI-result cache (the candidate
   side twin of the recruiter verdictCache). Not cryptographic, just stable. */
function hashKey(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return `${h.toString(36)}-${s.length}`;
}

/* Keyword-bank scoring. Was the primary engine; demoted to the graceful
   fallback when the candidate_match AI call is unavailable (offline, 502,
   monthly cap). Same pool formula as before, minus the dead enrichment
   endpoint this file used to call. */
async function bankScore({ jd, templateKey, resume }) {
  const response = await fetch(BANK_FILE, { cache: "no-store" });
  if (!response.ok) throw new Error("Keyword bank file not found.");
  const bank = await response.json();
  const templateBank = keywordToList(bank?.[templateKey]);
  if (!templateBank.length) throw new Error(`No keyword bank found for ${templateKey}.`);

  const cvText = buildCvText(resume);
  const relevant = templateBank.filter((kw) => jd.includes(normalizeText(kw)));
  const pool = relevant.length ? relevant : templateBank;
  const matched = pool.filter((kw) => cvText.includes(normalizeText(kw)));
  const missing = pool.filter((kw) => !cvText.includes(normalizeText(kw)));

  return {
    source: "bank",
    score: pool.length
      ? Math.max(0, Math.min(100, Math.round(((pool.length - missing.length) / pool.length) * 100)))
      : 0,
    matched: matched.slice(0, 40),
    missing: missing.slice(0, 40),
    suggestion: "Add 2 to 3 high priority missing terms naturally in your summary and latest role bullets.",
    poolSize: pool.length,
    missingTotal: missing.length,
  };
}

/** Count unique words >4 chars in text */
function countKeywords(text) {
  if (!text || !text.trim()) return 0;
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 4);
  return new Set(words).size;
}

/* ─── Theme palette (day default, both fully styled) ─── */
const PALETTE = {
  light: {
    bg: "#F4F6F9", panel: "rgba(255,255,255,0.78)", panelSolid: "#FFFFFF", inset: "#F6F7F9",
    border: "rgba(15,17,21,0.08)", borderStrong: "rgba(15,17,21,0.14)",
    textPrimary: "#0F1115", textSecondary: "#5B616E", textMuted: "#8A909C",
    amber: "#D97706", amberSoft: "rgba(217,119,6,0.10)", amberBorder: "rgba(217,119,6,0.30)", onAmber: "#FFFFFF",
    green: "#059669", greenSoft: "rgba(5,150,105,0.10)", greenBorder: "rgba(5,150,105,0.28)",
    red: "#DC2626", redSoft: "rgba(220,38,38,0.07)", redBorder: "rgba(220,38,38,0.22)",
    ringTrack: "#E7EAEF", zone: "rgba(5,150,105,0.18)",
    aurora1: "rgba(217,119,6,0.10)", aurora2: "rgba(5,150,105,0.09)",
    glassBg: "rgba(255,255,255,0.66)", glassBorder: "rgba(255,255,255,0.7)", overlay: "rgba(244,246,249,0.55)",
    shadow: "0 18px 50px -28px rgba(15,17,21,0.35)",
  },
  dark: {
    bg: "#0A0A0A", panel: "rgba(20,20,20,0.72)", panelSolid: "#121212", inset: "#161616",
    border: "rgba(255,255,255,0.08)", borderStrong: "rgba(255,255,255,0.16)",
    textPrimary: "#FFFFFF", textSecondary: "#A0A0A0", textMuted: "#6B6B6B",
    amber: "#F59E0B", amberSoft: "rgba(245,158,11,0.12)", amberBorder: "rgba(245,158,11,0.32)", onAmber: "#0A0A0A",
    green: "#10B981", greenSoft: "rgba(16,185,129,0.12)", greenBorder: "rgba(16,185,129,0.30)",
    red: "#EF4444", redSoft: "rgba(239,68,68,0.10)", redBorder: "rgba(239,68,68,0.26)",
    ringTrack: "#242424", zone: "rgba(16,185,129,0.22)",
    aurora1: "rgba(245,158,11,0.14)", aurora2: "rgba(16,185,129,0.10)",
    glassBg: "rgba(18,18,18,0.6)", glassBorder: "rgba(255,255,255,0.08)", overlay: "rgba(10,10,10,0.5)",
    shadow: "0 18px 50px -28px rgba(0,0,0,0.7)",
  },
};

function scoreColor(t, s) {
  if (s >= 80) return t.green;
  if (s >= 60) return t.amber;
  return t.red;
}
function verdict(s) {
  if (s >= 80) return "Strong match";
  if (s >= 60) return "Good, close the gap";
  return "Needs work";
}

/* ─── Icons (inline, monotone) ─── */
const Ic = (p) => ({ width: p.size || 18, height: p.size || 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: p.sw || 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true });
const IconSun = (p) => (<svg {...Ic({ size: p.size, sw: 2 })}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>);
const IconMoon = (p) => (<svg {...Ic({ size: p.size, sw: 2 })}><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>);
const IconBulb = (p) => (<svg {...Ic({ size: p.size })}><path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.2 1 2V18h6v-1.3c0-.8.4-1.5 1-2A7 7 0 0 0 12 2z" /></svg>);
const IconCheck = (p) => (<svg {...Ic({ size: p.size, sw: 2.4 })}><path d="M20 6 9 17l-5-5" /></svg>);
const IconPlus = (p) => (<svg {...Ic({ size: p.size, sw: 2.4 })}><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>);
const IconDownload = (p) => (<svg {...Ic({ size: p.size, sw: 2 })}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>);
const IconLock = (p) => (<svg {...Ic({ size: p.size })}><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>);
const IconSpark = (p) => (<svg {...Ic({ size: p.size })}><path d="M12 3l1.9 4.6L18.5 9l-4.6 1.4L12 15l-1.9-4.6L5.5 9l4.6-1.4L12 3z" /></svg>);
const IconArrow = (p) => (<svg {...Ic({ size: p.size, sw: 2.2 })}><path d="M5 12h13M13 6l6 6-6 6" /></svg>);

/* ─── Cinematic score gauge with shortlist zone ─── */
function Gauge({ score, color, t, reduce }) {
  const size = 196, stroke = 14, r = (size - stroke) / 2 - 6;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const progressOffset = c - (pct / 100) * c;
  // shortlist zone arc from 80 to 100 (last 20% of the circle)
  const zoneLen = 0.2 * c;
  const tickAngle = -90 + (80 / 100) * 360; // 80% position
  const tickRad = (tickAngle * Math.PI) / 180;
  const cx = size / 2, cy = size / 2;
  const t1 = { x: cx + (r - stroke / 2 - 3) * Math.cos(tickRad), y: cy + (r - stroke / 2 - 3) * Math.sin(tickRad) };
  const t2 = { x: cx + (r + stroke / 2 + 3) * Math.cos(tickRad), y: cy + (r + stroke / 2 + 3) * Math.sin(tickRad) };
  return (
    <div style={{ position: "relative", width: size, height: size, margin: "0 auto" }}>
      {/* glow blob (box-shadow style, no drop-shadow) */}
      <div aria-hidden style={{ position: "absolute", inset: 18, borderRadius: "50%", background: `radial-gradient(circle, ${color}22 0%, transparent 68%)`, filter: "blur(2px)" }} />
      <svg width={size} height={size} style={{ position: "relative" }}>
        <defs>
          <linearGradient id="jm-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={t.amber} />
            <stop offset="100%" stopColor={t.green} />
          </linearGradient>
        </defs>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={t.ringTrack} strokeWidth={stroke} />
        {/* shortlist zone */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={t.zone} strokeWidth={stroke}
          strokeDasharray={`${zoneLen} ${c - zoneLen}`} strokeDashoffset={-(0.8 * c)} transform={`rotate(-90 ${cx} ${cy})`} strokeLinecap="butt" />
        {/* 80 tick */}
        <line x1={t1.x} y1={t1.y} x2={t2.x} y2={t2.y} stroke={t.green} strokeWidth="2" strokeLinecap="round" opacity="0.7" />
        {/* progress */}
        <motion.circle cx={cx} cy={cy} r={r} fill="none" stroke="url(#jm-grad)" strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} transform={`rotate(-90 ${cx} ${cy})`}
          initial={reduce ? false : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: progressOffset }}
          transition={{ duration: reduce ? 0 : 0.9, ease: EASE }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 52, fontWeight: 800, letterSpacing: "-2px", lineHeight: 1, color }}>{Math.round(score)}</div>
        <div style={{ fontSize: 11, color: t.textMuted, marginTop: 4, fontWeight: 500 }}>out of 100</div>
      </div>
    </div>
  );
}

/* count-up hook honouring reduced motion */
function useCountUp(target, reduce) {
  const [val, setVal] = useState(target);
  const ref = useRef(target);
  useEffect(() => {
    if (reduce) { ref.current = target; setVal(target); return undefined; }
    const from = ref.current; const dur = 700; const start = performance.now();
    let raf;
    const tick = (now) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = Math.round(from + (target - from) * eased);
      ref.current = v; setVal(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, reduce]);
  return val;
}

/* ─── Keyword chip ─── */
function KwChip({ k, kind, t, reduce, onClick, real = false }) {
  // "matched" and "added" both mean the keyword is in the CV now —
  // green, check icon, and (for added) a tap removes it.
  const matched = kind !== "missing";
  const tappable = Boolean(onClick);
  const tipAdd = real ? "add to your CV skills" : "add to preview";
  const tipRemove = real ? "remove from your CV skills" : "remove from preview";
  return (
    <motion.button
      type="button"
      layout={!reduce}
      layoutId={tappable || kind === "added" ? `kw-${k}` : undefined}
      onClick={onClick || undefined}
      initial={reduce ? false : { opacity: 0, scale: 0.86 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.86 }}
      whileTap={reduce || !tappable ? undefined : { scale: 0.94 }}
      transition={{ duration: reduce ? 0 : 0.26, ease: EASE }}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 999,
        border: `1px solid ${matched ? t.greenBorder : t.redBorder}`,
        background: matched ? t.greenSoft : t.redSoft,
        color: matched ? t.green : t.red,
        fontSize: 12.5, fontWeight: 600, cursor: tappable ? "pointer" : "default",
        font: "inherit", fontFamily: "inherit", lineHeight: 1,
      }}
      title={tappable ? (matched ? tipRemove : tipAdd) : undefined}
    >
      <span style={{ display: "inline-flex" }}>{matched ? <IconCheck size={13} /> : <IconPlus size={13} />}</span>
      {k}
    </motion.button>
  );
}

function Skeleton({ h, w = "100%", r = 12, t }) {
  return <div style={{ height: h, width: w, borderRadius: r, background: t.inset, position: "relative", overflow: "hidden" }} className="jm-shimmer" />;
}

/* ─── Empty-state radar illustration (original inline SVG, no image) ─────────
   A calm sonar motif: faint grid rings, slow amber sweep, pulse pings, a
   scatter of slate applicant dots, and one amber dot near the centre that
   glows (the user standing out). Transform and opacity only; when reduced
   motion is on it renders the static composition with the sweep at rest. */
const APPLICANT_DOTS = [
  { x: 54, y: 66 }, { x: 150, y: 58 }, { x: 168, y: 120 }, { x: 60, y: 142 },
  { x: 132, y: 156 }, { x: 38, y: 104 }, { x: 120, y: 40 }, { x: 86, y: 168 },
];
const USER_DOT = { x: 122, y: 86 };
function RadarIllustration({ t, reduce }) {
  const sweep = (
    <>
      <rect x="0" y="0" width="200" height="200" fill="none" />
      <path d="M100 100 L100 14 A86 86 0 0 1 165 49 Z" fill="url(#jm-sweep)" />
      <line x1="100" y1="100" x2="100" y2="14" stroke={t.amber} strokeWidth="1.6" strokeLinecap="round" opacity="0.75" />
    </>
  );
  return (
    <svg width="168" height="168" viewBox="0 0 200 200" role="img" aria-label="radar scanning illustration">
      <defs>
        <linearGradient id="jm-sweep" x1="100" y1="100" x2="100" y2="14" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={t.amber} stopOpacity="0" />
          <stop offset="100%" stopColor={t.amber} stopOpacity="0.22" />
        </linearGradient>
      </defs>
      {/* grid rings + crosshair */}
      {[86, 58, 30].map((r) => <circle key={r} cx="100" cy="100" r={r} fill="none" stroke={t.border} strokeWidth="1.4" />)}
      <line x1="14" y1="100" x2="186" y2="100" stroke={t.border} strokeWidth="1" opacity="0.6" />
      <line x1="100" y1="14" x2="100" y2="186" stroke={t.border} strokeWidth="1" opacity="0.6" />
      {/* pulse pings */}
      {(reduce ? [] : [0, 1, 2]).map((i) => (
        <motion.circle key={i} cx="100" cy="100" r="20" fill="none" stroke={t.amber} strokeWidth="1.4"
          initial={{ scale: 0.3, opacity: 0.5 }}
          animate={{ scale: [0.3, 1.95], opacity: [0.5, 0] }}
          transition={{ duration: 3.4, repeat: Infinity, ease: "easeOut", delay: i * 1.13 }}
          style={{ transformOrigin: "100px 100px" }} />
      ))}
      {/* sweep */}
      {reduce ? (
        <g transform="rotate(40 100 100)">{sweep}</g>
      ) : (
        <motion.g animate={{ rotate: 360 }} transition={{ duration: 7, repeat: Infinity, ease: "linear" }} style={{ transformOrigin: "100px 100px" }}>
          {sweep}
        </motion.g>
      )}
      {/* applicant dots (slate) */}
      {APPLICANT_DOTS.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r="2.4" fill={t.textMuted} opacity="0.5" />)}
      {/* user dot (amber, glowing) */}
      <circle cx={USER_DOT.x} cy={USER_DOT.y} r="7" fill={t.amberSoft} />
      <motion.circle cx={USER_DOT.x} cy={USER_DOT.y} r="3.6" fill={t.amber}
        animate={reduce ? undefined : { opacity: [0.7, 1, 0.7], scale: [1, 1.15, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: `${USER_DOT.x}px ${USER_DOT.y}px` }} />
      {/* centre core */}
      <circle cx="100" cy="100" r="3" fill={t.amber} />
    </svg>
  );
}

/* ─── Main component ─── */
export default function JobMatch({
  resume,
  selectedTemplate,
  isPro = false,
  features = null,
  onJobDescriptionChange,
  handleDownload = null,
  downloadState = { status: "idle" },
  onNavigateToContent = null,
  onAddSkill = null,
  onRemoveSkill = null,
}) {
  const reduce = useReducedMotion();
  const hasCv = Boolean(resume?.name && String(resume.name).trim());
  const dlBusy = downloadState?.status === "generating";

  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("cvp-dash-theme") || "light"; } catch { return "light"; }
  });
  useEffect(() => {
    try { localStorage.setItem("cvp-dash-theme", theme); } catch { /* storage unavailable */ }
  }, [theme]);
  const t = PALETTE[theme] || PALETTE.light;

  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  // Tapped missing keywords. When onAddSkill is wired (the builder), a tap
  // REALLY inserts the skill into the CV; this set tracks which chips came
  // from Job Match so the score and the undo path stay in sync.
  const [added, setAdded] = useState(() => new Set());
  const [skillNotice, setSkillNotice] = useState(""); // transient add/remove feedback
  const noticeTimer = useRef(null);
  useEffect(() => () => clearTimeout(noticeTimer.current), []);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallDismissed, setPaywallDismissed] = useState(false);
  const templateKey = useMemo(() => detectTemplateKey(selectedTemplate), [selectedTemplate]);
  const geo = useGeoContent();
  const isIndia = geo?.isIndia ?? false;

  const keywordCount = useMemo(() => countKeywords(jobDescription), [jobDescription]);

  const hasAccess = useMemo(
    () => hasFeatureAccess({ is_pro: isPro, features }, "activeHunter"),
    [isPro, features]
  );

  const inFlightRef = useRef(false);

  useEffect(() => {
    onJobDescriptionChange?.(jobDescription.trim().length >= 40);
  }, [jobDescription, onJobDescriptionChange]);

  const handleAnalyse = useCallback(async () => {
    if (inFlightRef.current) return;
    if (!hasAccess) {
      setShowPaywall(true);
      setPaywallDismissed(false); // re-arm the paywall each time a free user tries
      return;
    }
    const jd = normalizeText(jobDescription);
    if (!jd) {
      setError("Paste a job description to continue.");
      return;
    }

    inFlightRef.current = true;
    setLoading(true);
    setError("");
    setResult(null);
    setAdded(new Set());
    setShowPaywall(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError("Sign in to use Job Match.");
        return;
      }

      // Session cache: same CV + same JD is instant and free. The key
      // includes the CV text, so inserting skills and re-analysing is a
      // genuinely new call by construction.
      const cacheKey = `jm-ai-${hashKey(`${buildCvText(resume)}::${jd}`)}`;
      try {
        const hit = sessionStorage.getItem(cacheKey);
        if (hit) {
          const parsed = JSON.parse(hit);
          if (parsed && Number.isFinite(parsed.score)) { setResult(parsed); return; }
        }
      } catch { /* storage unavailable, run live */ }

      // Primary engine: the same Sonnet rubric the recruiter verdict runs.
      // One scoring brain, both sides of the product.
      let notice = "";
      try {
        const aiRes = await safeFetch("/api/ai?action=candidate_match", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ cvSnapshot: resume, jobDescription: jobDescription.trim() }),
        });
        if (aiRes.ok) {
          const data = await aiRes.json();
          const score = Math.max(0, Math.min(100, Math.round(Number(data?.score))));
          if (Number.isFinite(score) && Array.isArray(data?.matched)) {
            const aiResult = {
              source: "ai",
              score,
              matched: data.matched.map((k) => String(k).trim()).filter(Boolean).slice(0, 40),
              missing: (Array.isArray(data.missing) ? data.missing : []).map((k) => String(k).trim()).filter(Boolean).slice(0, 40),
              suggestion: String(data?.suggestion || "").trim() || "Weave the missing capabilities you genuinely have into your summary and latest role bullets.",
            };
            setResult(aiResult);
            try { sessionStorage.setItem(cacheKey, JSON.stringify(aiResult)); } catch { /* storage full, skip */ }
            return;
          }
          notice = "AI engine unavailable right now. This score is a keyword estimate.";
        } else if (aiRes.status === 402) {
          notice = "You used all your AI analyses for this month. This score is a keyword estimate.";
        } else {
          notice = "AI engine unavailable right now. This score is a keyword estimate.";
        }
      } catch {
        notice = "AI engine unavailable right now. This score is a keyword estimate.";
      }

      // Honest fallback: the old keyword bank, clearly labeled as an
      // estimate. Never an empty pane, never a silent mystery score.
      const fallback = await bankScore({ jd, templateKey, resume });
      setResult({ ...fallback, notice });
    } catch (e) {
      setError(e.message || "Analysis failed.");
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, [hasAccess, jobDescription, templateKey, resume]);

  const handleUpgradeClick = useCallback(async () => {
    const url = await getPaymentLink("jobMatch");
    if (url) window.location.href = url;
    else alert("Payment could not start. Please try again in a moment.");
  }, []);

  /* ── Live score after chip taps.
        Bank result: the pool formula IS the engine, so the climb is exact.
        AI result: there is no client formula that reproduces Sonnet, so the
        climb is a labeled ESTIMATE (proportional share of the gap to 100,
        capped at 99). The confirmed number comes from the next analyse. ── */
  const projected = useMemo(() => {
    if (!result) return 0;
    if (result.source === "ai") {
      if (!added.size) return result.score;
      const missingCount = result.missing.length || 1;
      const est = result.score + Math.round((100 - result.score) * (Math.min(added.size, missingCount) / missingCount));
      return Math.min(99, Math.max(result.score, est));
    }
    const poolSize = result.poolSize || 0;
    if (!poolSize) return result.score;
    const total = result.missingTotal ?? result.missing.length;
    const projMissing = Math.max(0, total - added.size);
    return Math.max(0, Math.min(100, Math.round(((poolSize - projMissing) / poolSize) * 100)));
  }, [result, added]);

  // Estimate mode: an AI score has been locally projected past its
  // confirmed value. Drives the "estimated" label + the re-analyse nudge.
  const isEstimate = Boolean(result && result.source === "ai" && added.size > 0);

  const display = useCountUp(result ? projected : 0, reduce);
  const dispColor = scoreColor(t, display);
  const inZone = projected >= 80;
  const gap = Math.max(0, 80 - projected);

  // Real inserts when the builder wires the handlers (both call sites do).
  const realInsert = Boolean(onAddSkill && onRemoveSkill);

  const flashNotice = (msg) => {
    setSkillNotice(msg);
    clearTimeout(noticeTimer.current);
    noticeTimer.current = setTimeout(() => setSkillNotice(""), 2600);
  };

  const toggleAdd = (k) => {
    const removing = added.has(k);
    if (realInsert) {
      if (removing) { onRemoveSkill(k); flashNotice(`${k} removed from your CV skills`); }
      else { onAddSkill(k); flashNotice(`${k} added to your CV skills`); }
    }
    setAdded((prev) => {
      const n = new Set(prev);
      if (removing) n.delete(k); else n.add(k);
      return n;
    });
  };

  const removeAllAdded = () => {
    if (realInsert) {
      added.forEach((k) => onRemoveSkill(k));
      if (added.size > 0) flashNotice("all added keywords removed from your CV skills");
    }
    setAdded(new Set());
  };

  const matchedNow = result ? [...result.matched, ...result.missing.filter((k) => added.has(k))] : [];
  const missingNow = result ? result.missing.filter((k) => !added.has(k)) : [];

  const ctaPrice = isIndia ? "₹199 per month" : "AED 29 per month";

  /* ── Subcomponents for the right pane ── */
  const panelStyle = {
    background: t.panel, backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)",
    border: `1px solid ${t.border}`, borderRadius: 20, boxShadow: t.shadow,
  };

  const ResultBody = result ? (
    <motion.div
      data-jobmatch-result="true" data-jobmatch-score={result.score}
      initial={reduce ? false : "hidden"} animate="show"
      variants={{ show: { transition: { staggerChildren: reduce ? 0 : 0.06, delayChildren: reduce ? 0 : 0.15 } } }}
      style={{ display: "grid", gap: 22 }}
    >
      {/* gauge + verdict + shortlist gap */}
      <motion.div variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }} transition={{ duration: 0.4, ease: EASE }} style={{ display: "grid", gap: 12, justifyItems: "center" }}>
        <Gauge score={display} color={dispColor} t={t} reduce={reduce} />
        <div style={{ fontSize: 17, fontWeight: 700, color: dispColor }}>{verdict(projected)}</div>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 12px", borderRadius: 999,
          background: inZone ? t.greenSoft : t.amberSoft, border: `1px solid ${inZone ? t.greenBorder : t.amberBorder}`,
          color: inZone ? t.green : t.amber, fontSize: 12.5, fontWeight: 600,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: inZone ? t.green : t.amber }} />
          {inZone ? "you are in the shortlist zone" : `you are ${gap} ${gap === 1 ? "point" : "points"} from the shortlist zone`}
        </div>
        <div style={{ fontSize: 11.5, color: t.textMuted }}>recruiters usually shortlist 80 and above</div>

        {/* honest source badge: bank fallback ran instead of the AI engine */}
        {result.notice ? (
          <div role="status" style={{
            display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 12px", borderRadius: 10,
            background: t.amberSoft, border: `1px solid ${t.amberBorder}`, color: t.textSecondary,
            fontSize: 12, fontWeight: 500, lineHeight: 1.45, maxWidth: 340, textAlign: "left",
          }}>
            {result.notice}
          </div>
        ) : null}

        {/* estimate mode: AI score projected past its confirmed value */}
        <AnimatePresence>
          {isEstimate ? (
            <motion.div
              key="estimate-nudge"
              role="status" aria-live="polite"
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0 : 0.3, ease: EASE }}
              style={{
                display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                padding: "10px 14px", borderRadius: 12,
                background: t.amberSoft, border: `1px solid ${t.amberBorder}`, maxWidth: 340,
              }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: t.amber, textTransform: "uppercase", letterSpacing: "0.4px" }}>
                estimated score
              </div>
              <div style={{ fontSize: 12.5, color: t.textSecondary, lineHeight: 1.5, textAlign: "center" }}>
                you added skills to your CV. analyse again to confirm your new score.
              </div>
              <button type="button" onClick={handleAnalyse} disabled={loading}
                style={{
                  border: "none", background: "transparent", color: t.amber, fontWeight: 700,
                  fontSize: 12.5, cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit",
                  padding: "4px 8px", textDecoration: "underline", textUnderlineOffset: 3,
                }}>
                Analyse again
              </button>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </motion.div>

      {/* match / gap counts */}
      <motion.div variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }} transition={{ duration: 0.4, ease: EASE }}
        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 26 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: t.green }}>{matchedNow.length}</div>
          <div style={{ fontSize: 12, color: t.textSecondary, marginTop: 2 }}>matched</div>
        </div>
        <div style={{ width: 1, height: 34, background: t.border }} />
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: missingNow.length ? t.red : t.green }}>{missingNow.length}</div>
          <div style={{ fontSize: 12, color: t.textSecondary, marginTop: 2 }}>missing</div>
        </div>
      </motion.div>

      {/* matched column */}
      <motion.div variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }} transition={{ duration: 0.4, ease: EASE }} style={{ display: "grid", gap: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary }}>Matched keywords</div>
        <motion.div layout={!reduce} style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <AnimatePresence mode="popLayout" initial={false}>
            {matchedNow.length ? matchedNow.map((k) => (
              <KwChip key={`m-${k}`} k={k} t={t} reduce={reduce} real={realInsert}
                kind={added.has(k) ? "added" : "matched"}
                onClick={added.has(k) ? () => toggleAdd(k) : undefined} />
            )) : <span style={{ color: t.textMuted, fontSize: 13 }}>No matches yet.</span>}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      {/* missing column (interactive) */}
      <motion.div variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }} transition={{ duration: 0.4, ease: EASE }} style={{ display: "grid", gap: 8 }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary }}>Missing keywords</div>
          {added.size > 0 ? (
            <button type="button" onClick={removeAllAdded} style={{ border: "none", background: "transparent", color: t.textMuted, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", padding: 0 }}>{realInsert ? "remove all added" : "reset preview"}</button>
          ) : null}
        </div>
        <div style={{ fontSize: 12, color: t.textSecondary, marginBottom: 2 }}>
          {realInsert
            ? "tap a keyword you actually have to add it to your CV skills. it saves with your CV, tap again to remove."
            : "tap a keyword to preview your score climbing."}
        </div>
        <AnimatePresence>
          {skillNotice ? (
            <motion.div
              role="status"
              aria-live="polite"
              initial={reduce ? false : { opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: EASE }}
              style={{ fontSize: 12, fontWeight: 600, color: t.green, marginBottom: 2 }}
            >
              {skillNotice}
            </motion.div>
          ) : null}
        </AnimatePresence>
        <motion.div layout={!reduce} style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <AnimatePresence mode="popLayout" initial={false}>
            {missingNow.length ? missingNow.map((k) => (
              <KwChip key={`x-${k}`} k={k} t={t} reduce={reduce} real={realInsert} kind="missing" onClick={() => toggleAdd(k)} />
            )) : <span style={{ color: t.green, fontSize: 13, fontWeight: 600 }}>nothing missing, you are fully covered.</span>}
          </AnimatePresence>
        </motion.div>
      </motion.div>

      {/* coach suggestion */}
      <motion.div variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }} transition={{ duration: 0.4, ease: EASE }}
        style={{ display: "flex", gap: 12, padding: 16, borderRadius: 16, background: t.amberSoft, border: `1px solid ${t.amberBorder}` }}>
        <span style={{ width: 34, height: 34, flexShrink: 0, borderRadius: 10, display: "grid", placeItems: "center", background: t.amberSoft, color: t.amber }}><IconBulb size={18} /></span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: t.textPrimary, marginBottom: 3 }}>Improvement tip</div>
          <div style={{ fontSize: 13, color: t.textSecondary, lineHeight: 1.55 }}>{result.suggestion}</div>
        </div>
      </motion.div>

      {/* CTAs */}
      <motion.div variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }} transition={{ duration: 0.4, ease: EASE }}
        style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        {/* Honest label: this opens the editor so the user can weave the
            missing terms into their summary and bullets (per the tip).
            Real keyword inserts happen on the chips above, per tap. */}
        <button type="button" onClick={() => onNavigateToContent?.()}
          style={{ flex: "1 1 150px", height: 48, borderRadius: 12, border: "none", background: t.amber, color: t.onAmber, fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
          Edit my CV <IconArrow size={16} />
        </button>
        <button type="button"
          onClick={() => { if (hasCv && handleDownload) handleDownload(); else if (onNavigateToContent) onNavigateToContent(); }}
          disabled={hasCv && dlBusy}
          style={{ flex: "1 1 150px", height: 48, borderRadius: 12, border: `1px solid ${t.borderStrong}`, background: "transparent", color: t.textPrimary, fontWeight: 600, fontSize: 14, cursor: (hasCv && dlBusy) ? "not-allowed" : "pointer", fontFamily: "inherit", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <IconDownload size={16} /> {hasCv ? (dlBusy ? "Generating..." : "Download CV") : "Start building"}
        </button>
      </motion.div>
    </motion.div>
  ) : null;

  return (
    <div className="cvp-jobmatch-root" data-theme={theme} style={{ position: "relative", background: t.bg, color: t.textPrimary, borderRadius: 20, padding: 16, overflow: "hidden", transition: `background 200ms cubic-bezier(0.4,0,0.2,1), color 200ms cubic-bezier(0.4,0,0.2,1)` }}>
      {/* aurora background */}
      <div aria-hidden style={{ position: "absolute", top: -120, right: -80, width: 320, height: 320, borderRadius: "50%", background: `radial-gradient(circle, ${t.aurora1} 0%, transparent 70%)`, pointerEvents: "none" }} />
      <div aria-hidden style={{ position: "absolute", bottom: -140, left: -100, width: 360, height: 360, borderRadius: "50%", background: `radial-gradient(circle, ${t.aurora2} 0%, transparent 70%)`, pointerEvents: "none" }} />

      {/* theme toggle */}
      <div style={{ position: "relative", display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        <button type="button" onClick={() => setTheme(theme === "light" ? "dark" : "light")} aria-label="Switch theme"
          style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${t.border}`, background: t.panelSolid, color: t.textSecondary, cursor: "pointer", display: "grid", placeItems: "center" }}>
          {theme === "light" ? <IconSun size={17} /> : <IconMoon size={17} />}
        </button>
      </div>

      <div className="jm-grid" style={{ position: "relative", display: "grid", gap: 18, gridTemplateColumns: "1fr", alignItems: "start" }}>
        {/* ── Left: input ── */}
        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <h2 style={{ margin: 0, color: t.textPrimary, fontWeight: 800, fontSize: "clamp(24px, 5vw, 32px)", lineHeight: 1.12, letterSpacing: "-0.6px" }}>
              10,000 applicants. one shortlist. be on it.
            </h2>
            <p style={{ margin: "10px 0 0", color: t.textSecondary, fontSize: 13.5, lineHeight: 1.55 }}>
              engineered for the ATS systems global recruiters use across the Gulf, Europe and India.
            </p>
          </div>

          <div style={{ ...panelStyle, padding: 16 }}>
            <textarea
              data-jobmatch-textarea="true"
              autoComplete="off"
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description here"
              rows={10}
              style={{
                width: "100%", minHeight: 220, background: t.inset, color: t.textPrimary,
                border: `1px solid ${jobDescription.trim() ? t.amberBorder : t.border}`, borderRadius: 14,
                padding: 14, fontSize: 14, lineHeight: 1.55, resize: "vertical", fontFamily: "inherit",
                boxSizing: "border-box", outline: "none", transition: `border-color 180ms cubic-bezier(0.4,0,0.2,1)`,
              }}
            />
            <div style={{ color: t.textMuted, fontSize: 12, paddingTop: 10 }}>
              {keywordCount > 0 ? `${keywordCount} keywords detected` : "paste a job description to begin"}
            </div>
          </div>

          <motion.button
            type="button" onClick={handleAnalyse} disabled={loading || !jobDescription.trim()}
            whileTap={reduce || loading || !jobDescription.trim() ? undefined : { scale: 0.985 }}
            style={{
              border: "none", borderRadius: 14, height: 54, background: t.amber, color: t.onAmber,
              fontWeight: 700, fontSize: 15, fontFamily: "inherit",
              cursor: (loading || !jobDescription.trim()) ? "not-allowed" : "pointer", width: "100%",
              opacity: (!jobDescription.trim() && !loading) ? 0.45 : 1,
              display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: `opacity 200ms cubic-bezier(0.4,0,0.2,1)`,
            }}>
            {loading ? <>analysing<motion.span animate={reduce ? undefined : { opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}>...</motion.span></> : "Analyse match"}
          </motion.button>
          {error ? <div role="status" style={{ color: t.red, fontSize: 13 }}>{error}</div> : null}
        </div>

        {/* ── Right: living result ── */}
        <div style={{ ...panelStyle, padding: "clamp(18px, 4vw, 26px)", minHeight: 420, position: "relative", overflow: "hidden" }}>
          <AnimatePresence mode="wait" initial={false}>
            {/* paywall */}
            {showPaywall && !hasAccess && !paywallDismissed ? (
              <motion.div key="paywall" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} style={{ position: "relative" }}>
                {/* blurred living result behind */}
                <div aria-hidden style={{ filter: "blur(7px)", opacity: 0.55, pointerEvents: "none", display: "grid", gap: 20, justifyItems: "center" }}>
                  <Gauge score={72} color={t.amber} t={t} reduce />
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                    {[80, 64, 96, 72].map((w, i) => <span key={i} style={{ width: w, height: 30, borderRadius: 999, background: t.greenSoft, border: `1px solid ${t.greenBorder}` }} />)}
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
                    {[90, 70, 84].map((w, i) => <span key={i} style={{ width: w, height: 30, borderRadius: 999, background: t.redSoft, border: `1px solid ${t.redBorder}` }} />)}
                  </div>
                </div>
                {/* glass lock card */}
                <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", padding: 8, background: t.overlay, borderRadius: 18 }}>
                  <div style={{ width: "100%", maxWidth: 320, textAlign: "center", padding: 24, borderRadius: 18, background: t.glassBg, backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", border: `1px solid ${t.glassBorder}`, boxShadow: t.shadow }}>
                    <span style={{ width: 56, height: 56, margin: "0 auto 14px", borderRadius: "50%", display: "grid", placeItems: "center", background: t.amberSoft, color: t.amber }}><IconLock size={28} /></span>
                    <div style={{ fontSize: 20, fontWeight: 800, color: t.textPrimary, marginBottom: 6, letterSpacing: "-0.3px" }}>see your real match score</div>
                    <div style={{ fontSize: 13, color: t.textSecondary, marginBottom: 16, lineHeight: 1.5 }}>get instant feedback on every job description you apply to.</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: t.amber, marginBottom: 14 }}>unlock job match, {ctaPrice}</div>
                    <button type="button" onClick={handleUpgradeClick} style={{ width: "100%", height: 50, borderRadius: 12, border: "none", background: t.amber, color: t.onAmber, fontWeight: 700, fontSize: 14.5, cursor: "pointer", fontFamily: "inherit", marginBottom: 8, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7 }}><IconSpark size={16} /> Upgrade to Pro</button>
                    <button type="button" onClick={() => { setShowPaywall(false); setPaywallDismissed(true); }} style={{ width: "100%", height: 38, borderRadius: 10, border: "none", background: "transparent", color: t.textMuted, fontWeight: 600, fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>maybe later</button>
                  </div>
                </div>
              </motion.div>
            ) : loading ? (
              /* loading shimmer, no spinner */
              <motion.div key="loading" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} style={{ display: "grid", gap: 22, justifyItems: "center" }}>
                <Skeleton h={196} w={196} r={999} t={t} />
                <Skeleton h={20} w={150} r={8} t={t} />
                <div style={{ display: "flex", gap: 26 }}>
                  <Skeleton h={52} w={70} r={12} t={t} />
                  <Skeleton h={52} w={70} r={12} t={t} />
                </div>
                <div style={{ width: "100%", display: "grid", gap: 10 }}>
                  <Skeleton h={14} w="40%" r={6} t={t} />
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {[110, 90, 130, 80].map((w, i) => <Skeleton key={i} h={32} w={w} r={999} t={t} />)}
                  </div>
                </div>
                <div style={{ width: "100%", display: "grid", gap: 10 }}>
                  <Skeleton h={14} w="40%" r={6} t={t} />
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {[120, 84, 100].map((w, i) => <Skeleton key={i} h={32} w={w} r={999} t={t} />)}
                  </div>
                </div>
              </motion.div>
            ) : result ? (
              <motion.div key="result" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                {ResultBody}
              </motion.div>
            ) : (
              /* empty selling state */
              <motion.div key="empty" initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35, ease: EASE }}
                style={{ minHeight: 380, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: 16, padding: "20px 8px" }}>
                <RadarIllustration t={t} reduce={reduce} />
                <div style={{ fontSize: 19, fontWeight: 800, color: t.textPrimary, maxWidth: 340, lineHeight: 1.3, letterSpacing: "-0.3px" }}>
                  when a global firm posts in Dubai, hundreds apply within hours
                </div>
                <div style={{ fontSize: 13.5, color: t.textSecondary, maxWidth: 320, lineHeight: 1.55 }}>
                  paste their job description and see exactly where your CV stands.
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <style>{`
        @keyframes jm-shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
        .jm-shimmer::after { content: ""; position: absolute; inset: 0; transform: translateX(-100%);
          background: linear-gradient(90deg, transparent, ${t.borderStrong}, transparent); animation: jm-shimmer 1.4s ease infinite; }
        .cvp-jobmatch-root textarea::placeholder { color: ${t.textMuted}; }
        @media (min-width: 880px) { .cvp-jobmatch-root .jm-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1.04fr); gap: 22px; } }
        @media (prefers-reduced-motion: reduce) { .jm-shimmer::after { animation: none; } }
      `}</style>
    </div>
  );
}
