/* eslint-disable react/jsx-pascal-case */
/**
 * LinkedInOptimizer — /linkedin-optimizer
 *
 * Four-step wizard (Headline, Your profile, Assessment, Copy to LinkedIn),
 * ported from the approved "Fresh" Claude Design handoff. Honest copy: no
 * fabricated metrics, no named employers.
 *
 *   Step 1  free anonymous headline check  -> /api/ai?action=linkedin_headline
 *   Step 2  account gate + profile intake  -> extractCvText + /api/ai?action=linkedin_parse
 *   Step 3  deep scan (login required)     -> supabase fn linkedin-optimize
 *   Step 4  guided copy + market-aware paywall (Gulf -> Ziina, India -> Razorpay)
 *
 * Paywall stripping is server-side: locked copy (full About + locked
 * experience bullets) never reaches the client until unlock. Unlock is
 * server-authoritative via the permissions table.
 */

import { useState, useEffect, useRef, useLayoutEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence, MotionConfig } from "framer-motion";
import { supabase } from "../supabaseClient";
import { useCvpAuth } from "../useCvpAuth";
import safeFetch from "../lib/net/safeFetch";
import { extractCvText, CvExtractionError } from "../services/cvExtraction";
import { useGeoContent } from "../hooks/useGeoContent";
import { getPaymentLink } from "../utils/paywall";
import RazorpayPayment from "../components/RazorpayPayment";

const ease = [0.22, 1, 0.36, 1];

// ── Honest copy (ported from li-data; no invented metrics) ──────────────────
const STAT_TILES = [
  "Headline scored on 4 signals",
  "Rewritten to LinkedIn's 220 char limit",
  "Built for Gulf and India search",
  "Impact quantified, not described",
];
const RECRUITER_VOICE =
  "Most recruiters spend only seconds on a profile before deciding whether to read on. A vague headline gets skipped. A specific one gets opened.";
const RECRUITER_ATTRIB = "A hiring lead in Dubai";
const HOW_IT_WORKS = [
  ["Paste your current headline.", "No sign-up, no upload to try it."],
  ["Get three headline rewrites.", "Copy the one that fits, free."],
  ["Add your full profile for a score.", "Free account, then a full assessment."],
  ["Unlock and paste back to LinkedIn.", "Guided, one section at a time."],
];
const SAMPLE_HEADLINES = [
  "Marketing Manager",
  "Finance professional seeking new opportunities",
  "Software Developer, looking for a job",
  "Sales, Dubai",
];
const HEADLINE_TICKER = [
  "Reading your headline",
  "Checking seniority signals",
  "Measuring keyword coverage",
  "Checking location clarity",
  "Drafting the professional rewrite",
  "Drafting the bold rewrite",
];
const SCAN_TICKER = [
  "Reading your profile",
  "Scoring headline signals",
  "Checking impact and metrics",
  "Measuring search visibility",
  "Drafting your rewrite",
];
const FAILURES = ["No role clarity", "Generic", "No seniority", "No location", "No numbers", "Weak verbs"];

// Style metadata for the three headline variants; body text comes from the API.
const STYLE_META = [
  { key: "professional", glyph: "P", name: "Professional", tag: "Credible and precise", chips: ["Seniority", "Scope", "Region fit"] },
  { key: "bold", glyph: "B", name: "Bold", tag: "Stops the scroll", chips: ["Voice", "Specifics", "Intent"] },
  { key: "storyDriven", glyph: "S", name: "Story-driven", tag: "Human and magnetic", chips: ["Narrative", "Focus", "Differentiation"] },
];

const STEPS = [
  { n: 1, k: "Headline" },
  { n: 2, k: "Your profile" },
  { n: 3, k: "Assessment" },
  { n: 4, k: "Copy to LinkedIn" },
];

// Market-aware pricing/provider. Gulf -> Ziina/AED, India -> Razorpay/INR.
function pricingFor(market) {
  return market === "india"
    ? { currency: "INR", amount: "149", provider: "Razorpay" }
    : { currency: "AED", amount: "29", provider: "Ziina" };
}

// ── Hardened edge-function call (deep scan) ─────────────────────────────────
// Direct fetch instead of supabase.functions.invoke: it exposes the real
// status code for plain-language error mapping, and takes an AbortSignal so
// a stalled call can never leave the user on a dead screen.
const OPTIMIZE_FN_URL = `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/linkedin-optimize`;
const OPTIMIZE_TIMEOUT_MS = 75000;

async function callOptimizeFn(body, token) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPTIMIZE_TIMEOUT_MS);
  try {
    const res = await safeFetch(OPTIMIZE_FN_URL, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        apikey: process.env.REACT_APP_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data, timedOut: false };
  } finally {
    clearTimeout(timer);
  }
}

// One automatic retry on transient failure (network drop or a fast 5xx).
// A timeout is NOT auto-retried: the user already waited, show them a
// real error with a Retry button instead of silently doubling the wait.
async function callOptimizeFnWithRetry(body, token) {
  const RETRYABLE = new Set([502, 503, 529]);
  let first;
  try {
    first = await callOptimizeFn(body, token);
    if (first.ok || !RETRYABLE.has(first.status)) return first;
  } catch (err) {
    if (err?.name === "AbortError") return { ok: false, status: 0, data: {}, timedOut: true };
    first = null; // network error → retry below
  }
  await new Promise((r) => setTimeout(r, 1500));
  try {
    return await callOptimizeFn(body, token);
  } catch (err) {
    return { ok: false, status: 0, data: {}, timedOut: err?.name === "AbortError" };
  }
}

// Plain-language mapping: every failure resolves to a message that says
// what happened and what to do next.
function scanErrorText(r) {
  if (r.timedOut) return "The scan took too long to respond. Your profile is safe, retry now.";
  if (r.status === 0) return "We could not reach the scoring service. Check your connection, then retry.";
  if (r.status === 401) return "Your session expired. Sign in again, then retry.";
  if (r.status === 404) return "The scoring service is temporarily unavailable. Please try again in a few minutes.";
  if (r.status === 429) return r.data?.message || "Daily scan limit reached. Try again tomorrow.";
  if (r.status === 402) return r.data?.message || "Daily limit reached. Try again tomorrow.";
  if (r.status === 400) return r.data?.message || "Your profile looked empty. Add a headline, About, or one role, then retry.";
  return "The scan failed on our side. Nothing was lost, retry now.";
}

// Red error panel: title, plain message, and real actions. Used for scan
// and upload failures so no failure is ever an ambiguous amber note.
function ErrorPanel({ title, msg, actions }) {
  return (
    <div className="err-panel" role="alert">
      <div className="ep-head">
        <span className="ep-ic" aria-hidden="true">!</span>
        <span>{title}</span>
      </div>
      <p className="ep-msg">{msg}</p>
      {actions ? <div className="ep-actions">{actions}</div> : null}
    </div>
  );
}

// ── Icons ───────────────────────────────────────────────────────────────────
const Icon = {
  arrow: (p) => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>,
  back: (p) => <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M19 12H5M11 18l-6-6 6-6" /></svg>,
  pencil: (p) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>,
  check: (p) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20 6 9 17l-5-5" /></svg>,
  copy: (p) => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>,
  lock: (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>,
  unlock: (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 7.5-1.5" /></svg>,
  spark: (p) => <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" {...p}><path d="M12 2l1.8 5.6a4 4 0 0 0 2.6 2.6L22 12l-5.6 1.8a4 4 0 0 0-2.6 2.6L12 22l-1.8-5.6a4 4 0 0 0-2.6-2.6L2 12l5.6-1.8a4 4 0 0 0 2.6-2.6Z" /></svg>,
  bolt: (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" {...p}><path d="M13 2 4.5 13.5H11l-1 8.5L19.5 10H13l1-8Z" /></svg>,
  globe: (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" {...p}><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" /></svg>,
  ruler: (p) => <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" {...p}><rect x="3" y="8" width="18" height="8" rx="1.5" /><path d="M7 8v3M11 8v4M15 8v3M19 8v4" /></svg>,
  upload: (p) => <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="M12 3v13M7 8l5-5 5 5" /></svg>,
  user: (p) => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>,
  plus: (p) => <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14" /></svg>,
  trash: (p) => <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M6 6l1 14a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-14" /></svg>,
};

// ── Shared primitives ───────────────────────────────────────────────────────
function scoreColor(v) {
  if (v >= 80) return "var(--green)";
  if (v >= 65) return "var(--blue)";
  if (v >= 45) return "var(--gold2)";
  return "var(--red)";
}

function Counter({ value, max }) {
  const over = value > max;
  return <span className={"counter" + (over ? " over" : "")}>{value}<i>/ {max}</i></span>;
}

// Locked SVG gauge pattern — native rotate(-90 60 60), fixed viewBox. Do not touch.
function Gauge({ value, size = 148, label = "Profile score" }) {
  const C = 2 * Math.PI * 52;
  const off = C * (1 - Math.max(0, Math.min(100, value)) / 100);
  const col = scoreColor(value);
  return (
    <div className="gauge" style={{ width: size, maxWidth: "100%" }}>
      <svg viewBox="0 0 120 120" width="100%" height="auto" style={{ display: "block", aspectRatio: "1 / 1" }}>
        <circle cx="60" cy="60" r="52" fill="none" stroke="var(--track)" strokeWidth="10" />
        <motion.circle cx="60" cy="60" r="52" fill="none" stroke={col} strokeWidth="10" strokeLinecap="round"
          strokeDasharray={C} initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: off }}
          transition={{ duration: 1.05, ease, delay: 0.15 }} transform="rotate(-90 60 60)" />
      </svg>
      <div className="gauge-c">
        <span className="gauge-v" style={{ color: col }}>{value}</span>
        <span className="gauge-l">{label}</span>
      </div>
    </div>
  );
}

function Stepper({ step, maxReached, go }) {
  return (
    <div className="stepper" role="list">
      {STEPS.map((s, i) => {
        const state = s.n < step ? "done" : s.n === step ? "now" : "todo";
        const reachable = s.n <= maxReached;
        return (
          <span key={s.n} style={{ display: "inline-flex", alignItems: "center" }}>
            <button role="listitem" className={"stp " + state} disabled={!reachable} onClick={() => reachable && go(s.n)}>
              <span className="stp-dot">{s.n < step ? <Icon.check /> : s.n}</span>
              <span className="stp-k">{s.k}</span>
            </button>
            {i < STEPS.length - 1 && <span className={"stp-line" + (s.n < step ? " on" : "")} aria-hidden="true" />}
          </span>
        );
      })}
    </div>
  );
}

// ── Step 1: headline check ──────────────────────────────────────────────────
function analyzeHeadline(h) {
  const t = (h || "").trim(), low = t.toLowerCase(), len = t.length;
  const sen = ["senior", "lead", "head", "director", "manager", "vp", "principal", "chief", "founder", "specialist"].find((w) => low.includes(w));
  const locs = ["dubai", "abu dhabi", "riyadh", "doha", "uae", "ksa", "bengaluru", "mumbai", "delhi", "india", "gcc"];
  const loc = locs.find((w) => low.includes(w));
  return {
    len,
    length: !t ? { v: "Waiting", s: "idle" } : len < 50 ? { v: "Too short", s: "warn" } : len > 220 ? { v: "Over limit", s: "warn" } : { v: len + " chars", s: "ok" },
    seniority: !t ? { v: "Waiting", s: "idle" } : sen ? { v: '"' + sen + '"', s: "ok" } : { v: "Not found", s: "warn" },
    location: !t ? { v: "Waiting", s: "idle" } : loc ? { v: loc.replace(/\b\w/g, (c) => c.toUpperCase()), s: "ok" } : { v: "Missing", s: "warn" },
  };
}

function Diag({ icon, label, v, s }) {
  const I = Icon[icon];
  return (
    <div className={"diag " + s}>
      <span className="diag-i"><I /></span>
      <div className="diag-t">
        <span className="diag-l">{label}</span>
        <AnimatePresence mode="wait">
          <motion.span key={v} className="diag-v" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>{v}</motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}

function HeadlineIdle({ profileName, initials, headline, setHeadline, onOptimize, error }) {
  const ref = useRef(null);
  const a = analyzeHeadline(headline);
  useEffect(() => { if (ref.current) ref.current.focus(); }, []);
  return (
    <motion.div key="idle" className="phase" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.35, ease }}>
      <div className="pcard">
        <div className="pcover"><div className="pcover-glow" /></div>
        <div className="pavatar"><span>{initials}</span></div>
        <div className="pbody">
          <div className="pname-row">
            <h3 className="pname">{profileName}</h3>
            <span className="pedit"><Icon.pencil /> Editing headline</span>
          </div>
          <div className="hl-field">
            <div className="hl-top">
              <span className="hl-label">Headline</span>
              <Counter value={a.len} max={220} />
            </div>
            <textarea ref={ref} className="hl-input" spellCheck="false" rows="2" placeholder="e.g. Marketing Manager" value={headline} onChange={(e) => setHeadline(e.target.value)} />
          </div>
          <div className="sample-rail">
            <span className="sr-l">Try</span>
            {SAMPLE_HEADLINES.map((s) => <button key={s} className="chip-btn" onClick={() => setHeadline(s)}>{s}</button>)}
          </div>
        </div>
      </div>

      <div className="diag-grid">
        <Diag icon="ruler" label="Length" v={a.length.v} s={a.length.s} />
        <Diag icon="bolt" label="Seniority signal" v={a.seniority.v} s={a.seniority.s} />
        <Diag icon="globe" label="Location" v={a.location.v} s={a.location.s} />
      </div>

      <div className="cta-row">
        <motion.button className="btn-primary" disabled={!headline.trim()} onClick={onOptimize} whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
          <Icon.spark /> Optimize my headline <Icon.arrow />
        </motion.button>
        <span className="cta-note">Free, no sign-up.</span>
      </div>
      {error ? <div className="li-err">{error}</div> : null}
    </motion.div>
  );
}

// Decorative progress ring used for both the headline and the deep scan.
function Loader({ title, ticker }) {
  const [pct, setPct] = useState(0);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPct((p) => (p >= 95 ? 95 : p + Math.random() * 8 + 3)), 200);
    const tk = setInterval(() => setTick((t) => (t + 1) % ticker.length), 1000);
    return () => { clearInterval(id); clearInterval(tk); };
  }, [ticker.length]);
  return (
    <motion.div key="loading" className="phase load" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
      <div className="orb">
        {[0, 1, 2].map((i) => (
          <motion.span key={i} className="orb-ring" style={{ inset: i * 15 }} animate={{ rotate: i % 2 ? -360 : 360 }} transition={{ duration: 9 - i * 2, repeat: Infinity, ease: "linear" }} />
        ))}
        <motion.span className="orb-arc" animate={{ rotate: 360 }} transition={{ duration: 1.3, repeat: Infinity, ease: "linear" }} />
        <div className="orb-core">
          <span className="orb-lab">Reading</span>
          <span className="orb-pct">{Math.floor(pct)}<i>%</i></span>
        </div>
        {FAILURES.map((f, i) => (
          <motion.span key={f} className="fchip" style={{ left: (16 + (i % 3) * 28) + "%" }}
            initial={{ y: -8, opacity: 0 }} animate={{ y: [-8, 150], opacity: [0, 0.9, 0] }}
            transition={{ duration: 4.4, repeat: Infinity, delay: i * 0.6, ease: "easeIn" }}>{f}</motion.span>
        ))}
      </div>
      <div className="load-txt">
        <p className="load-title">{title}</p>
        <div className="load-ticker">
          <AnimatePresence mode="wait">
            <motion.span key={tick} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }}><Icon.check /> {ticker[tick]}</motion.span>
          </AnimatePresence>
        </div>
        <div className="load-bar"><motion.span animate={{ width: pct + "%" }} transition={{ ease: "linear" }} /></div>
      </div>
    </motion.div>
  );
}

function HeadlineResults({ headline, rewrites, selected, setSelected, onContinue }) {
  const orig = headline.trim() || SAMPLE_HEADLINES[0];
  const [copied, setCopied] = useState(-1);
  const copy = (i) => {
    setSelected(i); setCopied(i);
    try { navigator.clipboard.writeText(rewrites[i].text); } catch (e) { /* noop */ }
    setTimeout(() => setCopied((c) => (c === i ? -1 : c)), 2000);
  };
  return (
    <motion.div key="results" className="phase" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.35, ease }}>
      <div className="res-head">
        <div>
          <span className="eyebrow">Analysis complete</span>
          <h2 className="res-title">Here is what recruiters actually read.</h2>
        </div>
      </div>

      <div className="before">
        <span className="before-tag"><span className="dot" /> Your headline, before</span>
        <p>{orig}</p>
      </div>

      <div className="variants">
        {rewrites.map((v, i) => (
          <motion.div key={v.name} className={"variant" + (selected === i ? " sel" : "")} onClick={() => setSelected(i)}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.08, duration: 0.4, ease }}>
            {selected === i && <span className="sel-bar" aria-hidden="true" />}
            <div className="v-head">
              <span className="v-glyph">{v.glyph}</span>
              <div className="v-meta"><span className="v-name">{v.name}</span><span className="v-tag">{v.tag}</span></div>
              <span className="v-idx">{String(i + 1).padStart(2, "0")} / 03</span>
            </div>
            <p className="v-body">{v.text}</p>
            <div className="v-foot">
              <div className="v-chips">{v.chips.map((c) => <span key={c} className="add-chip"><Icon.check /> {c}</span>)}</div>
              <motion.button className={"copy-btn" + (copied === i ? " done" : "")} onClick={(e) => { e.stopPropagation(); copy(i); }} whileTap={{ scale: 0.96 }}>
                {copied === i ? <><Icon.check /> Copied</> : <><Icon.copy /> Copy</>}
              </motion.button>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.button className="unlock-row" onClick={onContinue} whileHover={{ y: -1 }} whileTap={{ scale: 0.99 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
        <span className="ur-l"><Icon.spark /> Now score your whole profile <i>About, experience, search visibility</i></span>
        <span className="ur-r">Continue <Icon.arrow /></span>
      </motion.button>
    </motion.div>
  );
}

// ── Step 2: account gate + intake + confirm ─────────────────────────────────
function AccountGate({ onCreateAccount }) {
  return (
    <motion.div key="gate" className="phase" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.35, ease }}>
      <div className="gate">
        <span className="eyebrow"><Icon.user /> Free account</span>
        <h2 className="res-title">Create a free account to score your full profile.</h2>
        <p className="gate-sub">Your headline check was free and anonymous. Scoring your whole profile saves a result you can come back to, so it needs a free account. No card required.</p>
        <div className="gate-form">
          <motion.button className="btn-primary wide" onClick={onCreateAccount} whileTap={{ scale: 0.99 }}>
            Create free account <Icon.arrow />
          </motion.button>
        </div>
        <p className="gate-fine">By continuing you agree to the terms. We never post to your LinkedIn.</p>
      </div>
    </motion.div>
  );
}

function emptyExp() { return { role: "", company: "", period: "", description: "" }; }

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Plain-language mapping for the upload/parse path.
function uploadErrorText(status, data) {
  if (status === 401) return "Your session expired. Sign in again, then retry.";
  if (status === 413) return "That file is too large. Use a screenshot under 4 MB, or type your profile in instead.";
  if (status === 400 || status === 422) return data?.message || "We could not read a profile in that file. Try a clearer screenshot, or type it in instead.";
  return "Reading that file failed on our side. Retry, or type your profile in instead.";
}

function ProfileIntake({ onParsed, authHeaders }) {
  const [mode, setMode] = useState("upload"); // upload | manual
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [headline, setHeadline] = useState("");
  const [about, setAbout] = useState("");
  const [exp, setExp] = useState([emptyExp()]);
  const fileRef = useRef(null);
  const lastFileRef = useRef(null);

  const toBlocks = (blocks) => blocks.map((b, i) => ({
    id: b.id || `exp-${i}`, role: b.role || "", company: b.company || "", period: b.duration || b.period || "", description: b.description || "",
  }));

  const onFile = async (f) => {
    if (!f || busy) return;
    lastFileRef.current = f;
    setFileName(f.name);
    setUploadError(null);
    setBusy(true);
    const isImg = /image\//.test(f.type) || /\.(png|jpe?g|webp|heic)$/i.test(f.name);
    try {
      const headers = { "Content-Type": "application/json", ...(await authHeaders()) };
      let payload;
      if (isImg) {
        // Screenshot: read once, send for cheap text extraction, never stored.
        const dataUrl = await fileToBase64(f);
        payload = { imageBase64: dataUrl, imageMediaType: f.type || "image/png" };
      } else {
        // PDF/DOCX: extract text client-side, then structure server-side.
        const extracted = await extractCvText(f);
        payload = { text: extracted.text };
      }
      const res = await safeFetch("/api/ai?action=linkedin_parse", { method: "POST", headers, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.raw_profile) {
        setUploadError(uploadErrorText(res.status, data));
        return;
      }
      const rp = data.raw_profile;
      onParsed({ headline: rp.headline || "", about: rp.about || "", experience: toBlocks(rp.experience_blocks || []), source: (isImg ? "image" : "pdf") });
    } catch (err) {
      // Stay on the upload view and say what happened — never silently
      // switch modes on the user.
      if (err instanceof CvExtractionError) {
        setUploadError(err.hint || "We could not read that file. Retry, or type your profile in instead.");
      } else {
        setUploadError("We could not reach the reading service. Check your connection, then retry.");
      }
    } finally {
      setBusy(false);
    }
  };

  const setExpAt = (i, k, v) => setExp((x) => x.map((e, j) => (j === i ? { ...e, [k]: v } : e)));
  const pasteContinue = () => {
    const rows = exp.filter((e) => e.role || e.company || e.description);
    onParsed({
      headline: headline.trim(),
      about: about.trim(),
      experience: (rows.length ? rows : [emptyExp()]).map((e, i) => ({ id: `exp-${i}`, ...e })),
      source: "paste",
    });
  };

  if (busy) return <Loader title="Reading your profile the way a recruiter skims it." ticker={SCAN_TICKER} />;

  return (
    <motion.div key="intake" className="phase" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.35, ease }}>
      <div className="res-head"><div><span className="eyebrow">Step 2 of 4</span><h2 className="res-title">Add your profile.</h2></div></div>

      {mode === "upload" ? (
        <motion.div key="up" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
          <label className="dropzone big" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files[0]); }}>
            <input ref={fileRef} type="file" accept="application/pdf,.pdf,image/*" hidden onChange={(e) => onFile(e.target.files[0])} />
            <span className="dz-ic"><Icon.upload /></span>
            <span className="dz-t">{fileName ? fileName : "Drop your LinkedIn PDF or a screenshot"}</span>
            <span className="dz-s">Drag and drop, or <b>browse</b>. A PDF export or a screenshot of your profile both work.</span>
          </label>
          <div className="dz-privacy"><Icon.lock /> Your screenshot is deleted after we read it.</div>
          {uploadError ? (
            <ErrorPanel
              title="We could not read your file"
              msg={uploadError}
              actions={
                <>
                  <button className="btn-retry" disabled={!lastFileRef.current || busy} onClick={() => onFile(lastFileRef.current)}>Retry upload</button>
                  <button className="link-btn" onClick={() => { setUploadError(null); setMode("manual"); }}>Type it in instead</button>
                </>
              }
            />
          ) : null}
          <div className="dz-alt"><button className="link-btn" onClick={() => setMode("manual")}>or type it in manually</button></div>
        </motion.div>
      ) : (
        <motion.div key="man" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
          <button className="link-btn back" onClick={() => setMode("upload")}><Icon.back /> Use upload instead</button>
          <div className="form-stack">
            <label className="field">
              <span className="field-l">Headline <Counter value={headline.length} max={220} /></span>
              <textarea className="ta sm" rows="2" value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="Paste your current headline" />
            </label>
            <label className="field">
              <span className="field-l">About</span>
              <textarea className="ta" rows="5" value={about} onChange={(e) => setAbout(e.target.value)} placeholder="Paste your About section" />
            </label>
            <div className="field">
              <span className="field-l">Experience</span>
              <div className="exp-rows">
                {exp.map((e, i) => (
                  <div className="exp-row" key={i}>
                    <input className="er-role" value={e.role} onChange={(ev) => setExpAt(i, "role", ev.target.value)} placeholder="Role" />
                    <input className="er-co" value={e.company} onChange={(ev) => setExpAt(i, "company", ev.target.value)} placeholder="Company" />
                    <input className="er-per" value={e.period} onChange={(ev) => setExpAt(i, "period", ev.target.value)} placeholder="2021 - present" />
                    {exp.length > 1 && <button className="er-del" onClick={() => setExp((x) => x.filter((_, j) => j !== i))} aria-label="Remove role"><Icon.trash /></button>}
                  </div>
                ))}
              </div>
              <button className="add-row" onClick={() => setExp((x) => [...x, emptyExp()])}><Icon.plus /> Add another role</button>
            </div>
          </div>
          <div className="cta-row">
            <motion.button className="btn-primary" onClick={pasteContinue} whileTap={{ scale: 0.99 }}>Review what we read <Icon.arrow /></motion.button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}

function ProfileConfirm({ draft, setDraft, onBack, onAnalyze, busy }) {
  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const setExpAt = (i, k, v) => setDraft((d) => ({ ...d, experience: d.experience.map((e, j) => (j === i ? { ...e, [k]: v } : e)) }));
  return (
    <motion.div key="confirm" className="phase" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.35, ease }}>
      <div className="res-head">
        <div><span className="eyebrow"><Icon.check /> Parsed</span><h2 className="res-title">Does this look right?</h2></div>
        <button className="ghost-btn" onClick={onBack}><Icon.back /> Change input</button>
      </div>
      <p className="confirm-note">We read your upload for text only, then deleted the file. Fix anything below. Nothing is rewritten or scored until you confirm.</p>

      <div className="form-stack">
        <label className="field">
          <span className="field-l">Headline <Counter value={(draft.headline || "").length} max={220} /></span>
          <textarea className="ta sm" rows="2" value={draft.headline} onChange={(e) => set("headline", e.target.value)} />
        </label>
        <label className="field">
          <span className="field-l">About</span>
          <textarea className="ta" rows="5" value={draft.about} onChange={(e) => set("about", e.target.value)} />
        </label>
        <div className="field">
          <span className="field-l">Experience</span>
          <div className="exp-rows">
            {draft.experience.map((e, i) => (
              <div className="exp-row" key={i}>
                <input className="er-role" value={e.role} onChange={(ev) => setExpAt(i, "role", ev.target.value)} placeholder="Role" />
                <input className="er-co" value={e.company} onChange={(ev) => setExpAt(i, "company", ev.target.value)} placeholder="Company" />
                <input className="er-per" value={e.period} onChange={(ev) => setExpAt(i, "period", ev.target.value)} placeholder="Period" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="cta-row">
        <motion.button className="btn-primary" disabled={busy} onClick={onAnalyze} whileHover={{ y: -1 }} whileTap={{ scale: 0.99 }}>
          <Icon.spark /> {busy ? "Analysing your profile..." : "Analyse my profile"} <Icon.arrow />
        </motion.button>
        <span className="cta-note">Full score is free to view.</span>
      </div>
    </motion.div>
  );
}

// ── Step 3: assessment ──────────────────────────────────────────────────────
function GradeBadge({ score, grade }) {
  return <span className="grade" style={{ color: scoreColor(score), borderColor: scoreColor(score) }}>{grade}</span>;
}
function CatBar({ score }) {
  return (
    <div className="catbar"><motion.span className="catbar-f" style={{ background: scoreColor(score), transformOrigin: "left" }}
      initial={{ scaleX: 0 }} animate={{ scaleX: score / 100 }} transition={{ duration: 0.8, ease, delay: 0.2 }} /></div>
  );
}

function Assessment({ result, onContinue }) {
  const sc = result.score || {};
  const cats = [["headline", "Headline"], ["about_narrative", "About narrative"], ["impact_metrics", "Impact and metrics"], ["search_visibility", "Search visibility"]];
  return (
    <motion.div key="assess" className="phase" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.35, ease }}>
      <div className="res-head"><div><span className="eyebrow">Assessment, free to view</span><h2 className="res-title">Your profile, scored.</h2></div></div>

      <div className="assess-top">
        <Gauge value={sc.overall || 0} />
        <div className="assess-sum">
          <p className="assess-line">Here is how a recruiter reads your profile today, and the fixes that close the gap fastest.</p>
          <div className="assess-legend">
            <span><i style={{ background: "var(--green)" }} /> 80+ strong</span>
            <span><i style={{ background: "var(--blue)" }} /> 65+ solid</span>
            <span><i style={{ background: "var(--gold2)" }} /> 45+ weak</span>
            <span><i style={{ background: "var(--red)" }} /> below, urgent</span>
          </div>
        </div>
      </div>

      <div className="cat-grid">
        {cats.map(([key, label], i) => {
          const c = (sc.categories || {})[key] || { score: 0, grade: "-", feedback: "" };
          return (
            <motion.div className="cat-card" key={key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.07, duration: 0.4, ease }}>
              <div className="cat-head"><span className="cat-name">{label}</span><GradeBadge score={c.score} grade={c.grade} /></div>
              <CatBar score={c.score} />
              <p className="cat-fb">{c.feedback}</p>
            </motion.div>
          );
        })}
      </div>

      <div className="fixes">
        <div className="fixes-head"><Icon.bolt /> Top three fixes</div>
        <ol className="fixes-list">
          {(sc.top_three_fixes || []).map((f, i) => (
            <motion.li key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.1, duration: 0.35, ease }}>
              <span className="fx-n">{i + 1}</span><span>{f}</span>
            </motion.li>
          ))}
        </ol>
      </div>

      <motion.button className="unlock-row" onClick={onContinue} whileHover={{ y: -1 }} whileTap={{ scale: 0.99 }}>
        <span className="ur-l"><Icon.spark /> Your rewrite is ready <i>Copy it into LinkedIn, one section at a time</i></span>
        <span className="ur-r">Open copy guide <Icon.arrow /></span>
      </motion.button>
    </motion.div>
  );
}

// ── Step 4: copy wizard + paywall ───────────────────────────────────────────
function Paywall({ pricing, onUnlock, busy }) {
  return (
    <div className="paywall">
      <div className="pw-l">
        <span className="pw-k"><Icon.spark /> One-time unlock</span>
        <div className="pw-t">Unlock the full profile</div>
        <div className="pw-feat"><span>Full About rewrite</span><span>Every experience role</span><span>Yours to keep</span></div>
      </div>
      <div className="pw-r">
        <div className="pw-price"><span className="pw-amt"><sup>{pricing.currency}</sup>{pricing.amount}</span><span className="pw-once">one-time</span></div>
        <motion.button className="btn-gold" onClick={onUnlock} disabled={busy} whileHover={{ y: -1 }} whileTap={{ scale: 0.98 }}>
          <Icon.unlock /> {busy ? "Opening checkout" : `Unlock via ${pricing.provider}`}
        </motion.button>
        <span className="pw-pro">or included in Pro</span>
      </div>
    </div>
  );
}

function LockedPanel({ title, lines = 3, onUnlock, provider }) {
  return (
    <div className="locked">
      <div className="locked-skel" aria-hidden="true">{Array.from({ length: lines }).map((_, i) => <span key={i} className="skl" style={{ width: (92 - i * 14) + "%" }} />)}</div>
      <div className="locked-over">
        <span className="locked-ic"><Icon.lock /></span>
        <div className="locked-t">{title}</div>
        <button className="locked-btn" onClick={onUnlock}><Icon.unlock /> Unlock via {provider}</button>
      </div>
    </div>
  );
}

function CopyBlock({ n, label, per, text, counterMax, done, onCopy }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    try { navigator.clipboard.writeText(text); } catch (e) { /* noop */ }
    setCopied(true); onCopy();
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className={"cblock" + (done ? " done" : "")}>
      <div className="cb-head">
        <span className="cb-n">{done ? <Icon.check /> : n}</span>
        <span className="cb-label">{label}</span>
        {per ? <span className="cb-per">{per}</span> : null}
        {counterMax ? <Counter value={text.length} max={counterMax} /> : null}
      </div>
      <div className="cb-body"><p>{text}</p></div>
      <div className="cb-foot">
        <span className="cb-hint">Paste into the matching LinkedIn edit box.</span>
        <motion.button className={"copy-btn" + (copied ? " done" : "")} onClick={copy} whileTap={{ scale: 0.96 }}>
          {copied ? <><Icon.check /> Copied</> : <><Icon.copy /> Copy</>}
        </motion.button>
      </div>
    </div>
  );
}

function CopyBtnInline({ text, onCopy }) {
  const [c, setC] = useState(false);
  return (
    <motion.button className={"copy-btn" + (c ? " done" : "")} whileTap={{ scale: 0.96 }}
      onClick={() => { try { navigator.clipboard.writeText(text); } catch (e) { /* noop */ } setC(true); onCopy(); setTimeout(() => setC(false), 2000); }}>
      {c ? <><Icon.check /> Copied</> : <><Icon.copy /> Copy preview</>}
    </motion.button>
  );
}

function CopyWizard({ result, pricing, unlocked, onUnlock, unlockBusy, onBack }) {
  const opt = result.optimized || {};
  const expBlocks = opt.experience_blocks || [];
  const sections = ["Intro / headline", "About", ...expBlocks.map((e) => e.role + ", " + e.company)];
  const [done, setDone] = useState({});
  const mark = (i) => setDone((d) => ({ ...d, [i]: true }));
  const total = sections.length;
  const doneCount = Object.keys(done).filter((k) => done[k]).length;

  return (
    <motion.div key="wizard" className="phase" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.35, ease }}>
      <div className="res-head">
        <div><span className="eyebrow">Step 4 of 4</span><h2 className="res-title">Paste it into LinkedIn.</h2></div>
        <button className="ghost-btn" onClick={onBack}><Icon.back /> Back to score</button>
      </div>

      <div className="wizard-grid">
        <aside className="checklist">
          <div className="cl-head">Progress <span>{doneCount} / {total}</span></div>
          <div className="cl-bar"><motion.span style={{ transformOrigin: "left" }} initial={false} animate={{ scaleX: total ? doneCount / total : 0 }} transition={{ duration: 0.4, ease }} /></div>
          <ul className="cl-list">
            {sections.map((s, i) => {
              const hardLocked = i >= 2 && expBlocks[i - 2] && expBlocks[i - 2].is_locked;
              return (
                <li key={i} className={(done[i] ? "on " : "") + (hardLocked ? "lk" : "")}>
                  <span className="cl-dot">{done[i] ? <Icon.check /> : hardLocked ? <Icon.lock /> : i + 1}</span>{s}
                </li>
              );
            })}
          </ul>
        </aside>

        <div className="blocks">
          <CopyBlock n={1} label="Intro, your headline" text={opt.headline || ""} counterMax={220} done={!!done[0]} onCopy={() => mark(0)} />

          {unlocked && opt.about_full ? (
            <CopyBlock n={2} label="About, full rewrite" text={opt.about_full} counterMax={2600} done={!!done[1]} onCopy={() => mark(1)} />
          ) : (
            <div className="cblock">
              <div className="cb-head"><span className="cb-n">2</span><span className="cb-label">About, preview</span><Counter value={(opt.about_preview || "").length} max={2600} /></div>
              <div className="cb-body"><p>{opt.about_preview}</p></div>
              <div className="cb-foot">
                <span className="cb-hint">Free preview. The full four-paragraph About unlocks below.</span>
                <CopyBtnInline text={opt.about_preview || ""} onCopy={() => mark(1)} />
              </div>
              <div className="cb-locked-strip"><LockedPanel title="Full About rewrite, 4 paragraphs" lines={4} onUnlock={onUnlock} provider={pricing.provider} /></div>
            </div>
          )}

          {expBlocks.map((e, i) => {
            const idx = i + 2;
            const locked = e.is_locked;
            if (!locked) {
              const text = (e.optimized_bullets || []).map((b) => "• " + b).join("\n");
              return <CopyBlock key={e.id || i} n={idx + 1} label={"Experience, " + e.role + " at " + e.company} per={e.period} text={text} done={!!done[idx]} onCopy={() => mark(idx)} />;
            }
            return (
              <div className="cblock" key={e.id || i}>
                <div className="cb-head"><span className="cb-n">{idx + 1}</span><span className="cb-label">Experience, {e.role} at {e.company}</span><span className="cb-per">{e.period}</span></div>
                <LockedPanel title="Recruiter-ready bullets" lines={3} onUnlock={onUnlock} provider={pricing.provider} />
              </div>
            );
          })}

          {!unlocked && <Paywall pricing={pricing} onUnlock={onUnlock} busy={unlockBusy} />}
          {unlocked && doneCount === total && (
            <motion.div className="wizard-done" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease }}>
              <Icon.check /> Every section copied. Your LinkedIn profile is updated.
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ── Shell ───────────────────────────────────────────────────────────────────
function TopNav({ name, onReset }) {
  return (
    <div className="li-nav">
      <div className="li-nav-inner">
        <div className="brand">
          <div className="mark">CV</div>
          <div className="brand-txt"><strong>CVPassport</strong><span>LinkedIn Optimizer</span></div>
        </div>
        <div className="nav-r">
          {name && <span className="acct"><span className="acct-av">{name.slice(0, 1).toUpperCase()}</span>{name.split(" ")[0]}</span>}
          <button className="nav-reset" onClick={onReset}>Start over</button>
        </div>
      </div>
    </div>
  );
}

function Sidebar() {
  return (
    <aside className="aside">
      <div className="s-card">
        <div className="s-eye">What this tool does</div>
        <div className="s-tiles">
          {STAT_TILES.map((t) => <div className="s-tile" key={t}><span className="s-tile-i"><Icon.check /></span><span>{t}</span></div>)}
        </div>
      </div>
      <div className="s-card">
        <div className="s-eye">What recruiters tell us</div>
        <p className="s-quote">{RECRUITER_VOICE}</p>
        <div className="s-attr-g">{RECRUITER_ATTRIB}</div>
      </div>
      <div className="s-card">
        <div className="s-eye">How it works</div>
        <div className="s-how">
          {HOW_IT_WORKS.map((s, i) => <div className="s-step" key={i}><span className="s-n">{i + 1}</span><div><b>{s[0]}</b>{s[1]}</div></div>)}
        </div>
      </div>
    </aside>
  );
}

export default function LinkedInOptimizer() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const geo = useGeoContent();
  const { user, isPro, authReady } = useCvpAuth();

  const [step, setStep] = useState(1);
  const [maxReached, setMax] = useState(1);
  const goStep = useCallback((n) => { setStep(n); setMax((m) => Math.max(m, n)); }, []);

  // Market: cheap default from timezone, confirmed by the geo endpoint.
  const [market, setMarket] = useState(geo.isIndia ? "india" : "gulf");
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await safeFetch("/api/razorpay?action=geo");
        const data = await res.json().catch(() => ({}));
        if (!cancelled && data.currency) setMarket(data.currency === "INR" ? "india" : "gulf");
      } catch { /* keep timezone default */ }
    })();
    return () => { cancelled = true; };
  }, []);
  const pricing = pricingFor(market);

  // Step 1 state
  const [hlPhase, setHlPhase] = useState("idle");
  const [headline, setHeadline] = useState("");
  const [selected, setSelected] = useState(0);
  const [rewrites, setRewrites] = useState([]);
  const [hlError, setHlError] = useState(null);

  // Step 2 state
  const [s2, setS2] = useState("gate");
  const [draft, setDraft] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [scanError, setScanError] = useState(null);

  // Result / unlock
  const [result, setResult] = useState(null);
  const [optId, setOptId] = useState(null);
  const [unlocked, setUnlocked] = useState(false);
  const [showRazorpay, setShowRazorpay] = useState(false);
  const [unlockBusy, setUnlockBusy] = useState(false);

  const authHeaders = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, []);

  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || (user?.email ? user.email.split("@")[0] : "");
  const initials = (displayName || "in").slice(0, 2).toUpperCase();

  // Entering step 2 picks the sub-view based on auth.
  useEffect(() => {
    if (step === 2) setS2(!user ? "gate" : draft ? "confirm" : "intake");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, user]);

  // Glovebox: restore after signup returns the user to this page.
  useLayoutEffect(() => {
    if (!user) return;
    let saved;
    try { saved = sessionStorage.getItem("cvp_pending_journey"); } catch { return; }
    if (!saved) return;
    let parsed;
    try { parsed = JSON.parse(saved); } catch { parsed = null; }
    try { sessionStorage.removeItem("cvp_pending_journey"); } catch { /* noop */ }
    if (!parsed || parsed.intent !== "LINKEDIN_SCAN") return;
    if (parsed.headline) setHeadline(parsed.headline);
    setStep(2); setMax((m) => Math.max(m, 2)); setS2("intake");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Re-serve the full result from the server (used after unlock).
  const refetchResult = useCallback(async (id) => {
    if (!id) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) return;
      const r = await callOptimizeFnWithRetry({ mode: "get", id }, token);
      if (r.ok && r.data?.result) {
        setResult(r.data.result);
        setUnlocked(!!r.data.is_unlocked);
      }
    } catch { /* non-fatal */ }
  }, []);

  // Handle return from the Ziina redirect.
  useEffect(() => {
    if (!authReady) return;
    const unlockedParam = searchParams.get("unlocked");
    const cancelledParam = searchParams.get("cancelled");
    if (unlockedParam === "1") {
      (async () => {
        let id = optId;
        try { id = id || sessionStorage.getItem("cvp_li_opt_id"); } catch { /* noop */ }
        if (!id && user) {
          const { data } = await supabase.from("linkedin_optimizations").select("id").eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
          id = data?.id || null;
        }
        if (id) {
          setOptId(id);
          await refetchResult(id);
          setStep(4); setMax((m) => Math.max(m, 4));
        }
        try { sessionStorage.removeItem("cvp_li_opt_id"); } catch { /* noop */ }
        const next = new URLSearchParams(searchParams);
        next.delete("unlocked");
        setSearchParams(next, { replace: true });
      })();
    } else if (cancelledParam === "1") {
      const next = new URLSearchParams(searchParams);
      next.delete("cancelled");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authReady, searchParams]);

  const onOptimizeHeadline = useCallback(async () => {
    const trimmed = headline.trim();
    if (!trimmed || hlPhase === "loading") return;
    setHlError(null);
    setHlPhase("loading");
    const minDelay = new Promise((r) => setTimeout(r, 1300));
    try {
      const [res] = await Promise.all([
        safeFetch("/api/ai?action=linkedin_headline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ headline: trimmed, market: market === "india" ? "india" : "dubai" }),
        }),
        minDelay,
      ]);
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.professional) throw new Error(data.error || "Generation failed");
      setRewrites(STYLE_META.map((m) => ({ ...m, text: data[m.key] || "" })));
      setSelected(0);
      setHlPhase("results");
    } catch (err) {
      setHlError(err?.message || "Something went wrong. Please retry.");
      setHlPhase("idle");
    }
  }, [headline, hlPhase, market]);

  const enterStep2 = useCallback(() => { goStep(2); }, [goStep]);

  const goToRegister = useCallback(() => {
    try {
      sessionStorage.setItem("cvp_pending_journey", JSON.stringify({ path: "/linkedin-optimizer", intent: "LINKEDIN_SCAN", headline }));
      localStorage.setItem("postAuthRedirect", "/linkedin-optimizer");
    } catch { /* storage unavailable, still proceed */ }
    navigate("/register");
  }, [headline, navigate]);

  const runScan = useCallback(async () => {
    if (!draft || analyzing) return;
    setScanError(null);
    setAnalyzing(true);
    const raw_profile = {
      headline: (draft.headline || "").trim(),
      about: (draft.about || "").trim(),
      experience_blocks: (draft.experience || []).map((e, i) => ({
        id: e.id || `exp-${i}`,
        role: (e.role || "").trim(),
        company: (e.company || "").trim(),
        duration: (e.period || "").trim(),
        description: (e.description || "").trim(),
      })),
    };
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) {
      setScanError("Your session expired. Sign in again, then retry.");
      setAnalyzing(false);
      return;
    }
    const r = await callOptimizeFnWithRetry(
      { input_method: draft.source === "paste" ? "paste" : "pdf", target_role: draft.headline || null, market, raw_profile },
      token,
    );
    if (r.ok && r.data?.result) {
      setResult(r.data.result);
      setOptId(r.data.id);
      setUnlocked(!!r.data.is_unlocked);
      setAnalyzing(false);
      goStep(3);
    } else {
      setScanError(scanErrorText(r));
      setAnalyzing(false);
    }
  }, [draft, analyzing, market, goStep]);

  const openZiina = useCallback(async () => {
    setUnlockBusy(true);
    try {
      try { if (optId) sessionStorage.setItem("cvp_li_opt_id", optId); } catch { /* noop */ }
      const url = await getPaymentLink("linkedinOptimizer", user?.id, user?.email);
      if (url) { window.location.href = url; return; }
    } catch { /* fall through */ }
    setUnlockBusy(false);
  }, [optId, user]);

  const handleUnlock = useCallback(() => {
    if (!user) { goToRegister(); return; }
    if (market === "india") { setShowRazorpay(true); return; }
    openZiina();
  }, [user, market, goToRegister, openZiina]);

  const onRazorpaySuccess = useCallback(async () => {
    setShowRazorpay(false);
    setUnlockBusy(false);
    await refetchResult(optId);
  }, [optId, refetchResult]);

  const reset = () => {
    setStep(1); setMax(1); setHlPhase("idle"); setHeadline(""); setSelected(0); setRewrites([]); setHlError(null);
    setS2("gate"); setDraft(null); setAnalyzing(false); setScanError(null);
    setResult(null); setOptId(null); setUnlocked(false); setShowRazorpay(false);
  };

  const effectiveUnlocked = unlocked || isPro || !!(result && result.is_unlocked);

  const stateTag = {
    1: { t: hlPhase === "loading" ? "Reading your headline" : hlPhase === "results" ? "3 rewrites ready" : "Free, no sign-up", c: hlPhase === "loading" ? "busy" : "ok" },
    2: { t: !user ? "Free account" : draft ? "Confirm details" : "Add your profile", c: "ok" },
    3: { t: "Assessment, free", c: "ok" },
    4: { t: effectiveUnlocked ? "Unlocked" : "Preview, unlock for full", c: effectiveUnlocked ? "ok" : "gold" },
  }[step];

  return (
    <MotionConfig reducedMotion="user">
      <Helmet>
        <title>LinkedIn Profile Optimizer for UAE, GCC and India Job Seekers - CVPassport</title>
        <meta name="description" content="Score and rewrite your LinkedIn headline, About, and experience for Gulf and India recruiters. Free headline check, no sign-up." />
        <link rel="canonical" href="https://www.mycvpassport.com/linkedin-optimizer" />
        <meta property="og:title" content="LinkedIn Profile Optimizer - CVPassport" />
        <meta property="og:description" content="Score and rewrite your LinkedIn profile for Gulf and India recruiters. Free to start." />
        <meta property="og:url" content="https://www.mycvpassport.com/linkedin-optimizer" />
        <meta property="og:type" content="website" />
      </Helmet>

      <div className="liopt-root">
        <style>{CSS_TEXT}</style>
        <div className="page">
          <TopNav name={user ? displayName : ""} onReset={reset} />

          {step === 1 && (
            <header className="hero">
              <div className="hero-eyebrow"><span className="pulse" /> Recruiter view</div>
              <h1>Your headline is the first <em>six seconds</em> of your next offer.</h1>
              <p className="hero-sub">Ghosted applications usually are not a skill problem. They are a <b>headline problem</b>, the line that decides whether a recruiter opens you or scrolls past. Paste yours and watch what changes.</p>
              <div className="hero-strip">
                <span><Icon.check /> Free headline check, no sign-up</span>
                <i />
                <span><Icon.check /> Full profile score with a free account</span>
              </div>
            </header>
          )}

          <div className={"stage" + (step === 1 ? "" : " solo")}>
            <div className="canvas">
              <div className="canvas-bar">
                <span className={"state-tag " + stateTag.c}><span className="st-dot" /> {stateTag.t}</span>
                <div className="stepper-wrap"><Stepper step={step} maxReached={maxReached} go={goStep} /></div>
              </div>
              <div className="canvas-body">
                <AnimatePresence mode="wait">
                  {step === 1 && hlPhase === "idle" &&
                    <HeadlineIdle key="s1i" profileName={user ? displayName : "Your name"} initials={initials} headline={headline} setHeadline={setHeadline} onOptimize={onOptimizeHeadline} error={hlError} />}
                  {step === 1 && hlPhase === "loading" &&
                    <Loader key="s1l" title="Checking your headline the way a recruiter skims it." ticker={HEADLINE_TICKER} />}
                  {step === 1 && hlPhase === "results" &&
                    <HeadlineResults key="s1r" headline={headline} rewrites={rewrites} selected={selected} setSelected={setSelected} onContinue={enterStep2} />}

                  {step === 2 && s2 === "gate" &&
                    <AccountGate key="s2g" onCreateAccount={goToRegister} />}
                  {step === 2 && s2 === "intake" && !analyzing &&
                    <ProfileIntake key="s2i" onParsed={(d) => { setDraft(d); setS2("confirm"); }} authHeaders={authHeaders} />}
                  {step === 2 && s2 === "confirm" && draft && !analyzing &&
                    <ProfileConfirm key="s2c" draft={draft} setDraft={setDraft} onBack={() => { setScanError(null); setS2("intake"); }} onAnalyze={runScan} busy={analyzing} />}
                  {step === 2 && analyzing &&
                    <Loader key="s2scan" title="Analysing your profile the way a recruiter screens it." ticker={SCAN_TICKER} />}

                  {step === 3 && result &&
                    <Assessment key="s3" result={result} onContinue={() => goStep(4)} />}

                  {step === 4 && result &&
                    <CopyWizard key="s4" result={result} pricing={pricing} unlocked={effectiveUnlocked} onUnlock={handleUnlock} unlockBusy={unlockBusy} onBack={() => goStep(3)} />}
                </AnimatePresence>

                {scanError && step === 2 && !analyzing && (
                  <ErrorPanel
                    title="The scan did not finish"
                    msg={scanError}
                    actions={<button className="btn-retry" onClick={runScan}>Retry the scan</button>}
                  />
                )}
              </div>
            </div>
            {step === 1 && <Sidebar />}
          </div>

          <footer className="trust">
            <span>Your text stays private</span>
            <span>{pricing.currency} {pricing.amount} one-time, or included in Pro</span>
            <span>Built for the Gulf and India job markets</span>
          </footer>
        </div>

        {showRazorpay && (
          <RazorpayPayment
            service="linkedinOptimizer"
            amountINR={pricing.amount}
            onSuccess={onRazorpaySuccess}
            onFailure={() => { setShowRazorpay(false); setUnlockBusy(false); }}
            onModalOpen={() => {}}
          />
        )}
      </div>
    </MotionConfig>
  );
}

// ── Scoped CSS (ported from the Fresh design; nested under .liopt-root) ──────
const CSS_TEXT = `
.liopt-root{
  --bg:#F4F2EE; --card:#FFFFFF; --card2:#FBFAF8;
  --line:#E3E0DA; --line2:#EEEDE9;
  --ink:#1B1F23; --ink2:#404953; --ink3:#62707C; --ink4:#8A95A0;
  --blue:#0A66C2; --blue-d:#004182; --blue-soft:#E8F0FA;
  --green:#057642; --green-soft:#EAF4EE;
  --gold:#B47B14; --gold2:#E7A33E; --gold-soft:#FBF3E2;
  --red:#B24020; --red-soft:#FBE9E4; --warn:#915907; --warn-soft:#FBF0DD;
  --track:#E6EBE4;
  --shadow:0 1px 2px rgba(0,0,0,.04), 0 4px 14px rgba(20,30,40,.05);
  --shadow-lg:0 2px 6px rgba(0,0,0,.05), 0 18px 50px rgba(20,30,40,.10);
  --ease:cubic-bezier(.22,1,.36,1);
  position:relative;min-height:100vh;
  background:var(--bg);color:var(--ink);
  font-family:"Source Sans 3",-apple-system,BlinkMacSystemFont,system-ui,sans-serif;
  -webkit-font-smoothing:antialiased;font-size:16px;line-height:1.5;
  background-image:radial-gradient(ellipse 70% 40% at 50% -5%, rgba(10,102,194,.05), transparent 60%);

  *,*::before,*::after{box-sizing:border-box}
  button{font-family:inherit}
  input,textarea{font-family:inherit}
  svg{display:block}
  ol,ul{margin:0;padding:0;list-style:none}

  .page{max-width:1180px;margin:0 auto;padding:0 24px 90px}
  @media (max-width:560px){.page{padding:0 14px 64px}}

  .li-err{margin-top:16px;border:1px solid rgba(178,64,32,.45);background:var(--red-soft);color:var(--red);border-radius:10px;padding:11px 14px;font-size:13.5px;font-weight:600}
  .err-panel{margin-top:18px;border:1px solid rgba(178,64,32,.45);background:var(--red-soft);border-radius:12px;padding:16px 18px}
  .ep-head{display:flex;align-items:center;gap:9px;color:var(--red);font-size:15px;font-weight:700}
  .ep-ic{width:20px;height:20px;border-radius:50%;background:var(--red);color:#fff;display:grid;place-items:center;font-size:13px;font-weight:800;flex-shrink:0}
  .ep-msg{margin:8px 0 0;color:var(--ink2);font-size:14px;line-height:1.55}
  .ep-actions{display:flex;align-items:center;gap:14px;margin-top:13px;flex-wrap:wrap}
  .btn-retry{display:inline-flex;align-items:center;gap:7px;border:1px solid var(--red);background:var(--card);color:var(--red);padding:9px 18px;border-radius:999px;font-size:13.5px;font-weight:700;cursor:pointer;transition:background 160ms var(--ease)}
  .btn-retry:hover{background:#F6DCD3}
  .btn-retry:disabled{opacity:.55;cursor:not-allowed}

  .li-nav{position:sticky;top:0;z-index:50;margin:0 -24px;background:rgba(244,242,238,.85);backdrop-filter:blur(14px) saturate(1.4);border-bottom:1px solid var(--line)}
  @media (max-width:560px){.li-nav{margin:0 -14px}}
  .li-nav-inner{max-width:1180px;margin:0 auto;padding:11px 24px;display:flex;align-items:center;justify-content:space-between}
  @media (max-width:560px){.li-nav-inner{padding:10px 14px}}
  .brand{display:flex;align-items:center;gap:11px}
  .brand .mark{width:34px;height:34px;border-radius:9px;background:linear-gradient(150deg,var(--blue),#0A4E96);display:grid;place-items:center;color:#fff;font-weight:700;font-size:13px;box-shadow:0 2px 6px rgba(10,102,194,.3)}
  .brand-txt{display:flex;flex-direction:column;line-height:1.15}
  .brand-txt strong{font-size:15px;font-weight:700;letter-spacing:-.01em}
  .brand-txt span{font-size:11.5px;color:var(--ink4);font-weight:500}
  .nav-r{display:flex;align-items:center;gap:12px}
  .acct{display:inline-flex;align-items:center;gap:7px;font-size:13px;font-weight:600;color:var(--ink2)}
  .acct-av{width:26px;height:26px;border-radius:50%;background:var(--blue);color:#fff;display:grid;place-items:center;font-size:12px;font-weight:700}
  .nav-reset{border:1px solid var(--line);background:var(--card);color:var(--ink3);padding:7px 14px;border-radius:999px;font-size:12.5px;font-weight:600;cursor:pointer}
  .nav-reset:hover{border-color:var(--blue);color:var(--blue)}

  .hero{padding:50px 0 26px;max-width:760px}
  @media (max-width:560px){.hero{padding:30px 0 18px}}
  .hero-eyebrow{display:inline-flex;align-items:center;gap:9px;font-size:12px;font-weight:600;color:var(--ink3);background:var(--card);border:1px solid var(--line);padding:6px 13px;border-radius:999px;box-shadow:var(--shadow)}
  .hero-eyebrow .pulse{width:7px;height:7px;border-radius:50%;background:var(--green);animation:liopt-pulse 2.4s var(--ease) infinite}
  .hero h1{font-size:clamp(32px,5vw,54px);line-height:1.05;letter-spacing:-.025em;font-weight:700;margin:18px 0 0;text-wrap:balance}
  .hero h1 em{font-style:normal;color:var(--blue)}
  .hero-sub{font-size:17.5px;color:var(--ink2);max-width:56ch;margin:16px 0 0;line-height:1.55;text-wrap:pretty}
  .hero-sub b{color:var(--ink);font-weight:600}
  .hero-strip{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-top:20px;font-size:13px;color:var(--ink3)}
  .hero-strip span{display:inline-flex;align-items:center;gap:7px}
  .hero-strip svg{width:14px;height:14px;color:var(--green)}
  .hero-strip i{width:4px;height:4px;border-radius:50%;background:var(--ink4)}

  .stage{display:grid;grid-template-columns:1fr 312px;gap:22px;align-items:start;margin-top:16px}
  .stage.solo{grid-template-columns:1fr;margin-top:26px}
  @media (max-width:920px){.stage{grid-template-columns:1fr}}

  .canvas{background:var(--card);border:1px solid var(--line);border-radius:18px;box-shadow:var(--shadow-lg);overflow:hidden}
  .canvas-bar{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 20px;border-bottom:1px solid var(--line2);background:var(--card2);flex-wrap:wrap}
  .state-tag{display:inline-flex;align-items:center;gap:8px;font-size:12px;font-weight:600;color:var(--ink2);white-space:nowrap}
  .state-tag .st-dot{width:7px;height:7px;border-radius:50%;background:var(--green)}
  .state-tag.busy .st-dot{background:var(--gold2);animation:liopt-blink 1s var(--ease) infinite}
  .state-tag.gold .st-dot{background:var(--gold2)}

  .stepper-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none}
  .stepper-wrap::-webkit-scrollbar{display:none}
  .stepper{display:flex;align-items:center;gap:4px}
  .stp{display:inline-flex;align-items:center;gap:7px;border:none;background:transparent;cursor:pointer;padding:4px 6px;border-radius:8px;color:var(--ink4);white-space:nowrap}
  .stp:disabled{cursor:not-allowed}
  .stp-dot{width:22px;height:22px;border-radius:50%;background:var(--line);color:var(--ink3);display:grid;place-items:center;font-size:12px;font-weight:700;flex-shrink:0}
  .stp-dot svg{width:13px;height:13px}
  .stp-k{font-size:12.5px;font-weight:600}
  .stp.now .stp-dot{background:var(--blue);color:#fff}
  .stp.now .stp-k{color:var(--blue)}
  .stp.done .stp-dot{background:var(--green);color:#fff}
  .stp.done .stp-k{color:var(--ink2)}
  .stp-line{width:18px;height:2px;background:var(--line);border-radius:2px;flex-shrink:0}
  .stp-line.on{background:var(--green)}
  @media (max-width:700px){.stp-k{display:none}.stp-line{width:12px}}

  .canvas-body{padding:26px 30px 30px;position:relative;min-height:520px}
  @media (max-width:560px){.canvas-body{padding:20px 16px 24px;min-height:auto}}
  .phase{position:relative}

  .eyebrow{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--blue)}
  .res-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:20px;flex-wrap:wrap}
  .res-title{font-size:26px;line-height:1.15;letter-spacing:-.02em;font-weight:700;margin:8px 0 0;max-width:20ch}
  @media (max-width:560px){.res-title{font-size:22px}}
  .ghost-btn{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);background:var(--card);color:var(--ink3);padding:8px 13px;border-radius:999px;font-size:12.5px;font-weight:600;cursor:pointer;white-space:nowrap}
  .ghost-btn:hover{border-color:var(--blue);color:var(--blue)}

  .btn-primary{display:inline-flex;align-items:center;gap:9px;background:var(--blue);color:#fff;border:none;padding:13px 22px;border-radius:999px;font-size:15px;font-weight:700;cursor:pointer;box-shadow:0 2px 8px rgba(10,102,194,.32)}
  .btn-primary:hover{background:var(--blue-d)}
  .btn-primary:disabled{opacity:.45;cursor:not-allowed;box-shadow:none}
  .btn-primary svg{width:17px;height:17px}
  .btn-primary.wide{width:100%;justify-content:center;padding:14px}
  .btn-gold{display:inline-flex;align-items:center;gap:8px;background:linear-gradient(180deg,#E7A33E,#C9851F);color:#3a2806;border:none;padding:12px 20px;border-radius:999px;font-size:14.5px;font-weight:700;cursor:pointer;box-shadow:0 2px 8px rgba(180,123,20,.35);white-space:nowrap}
  .btn-gold:disabled{opacity:.6;cursor:not-allowed}
  .btn-gold svg{width:15px;height:15px}
  .cta-row{display:flex;align-items:center;gap:16px;flex-wrap:wrap}
  .cta-note{font-size:13px;color:var(--ink3)}
  .cta-note b{color:var(--ink);font-weight:700}

  .pcard{position:relative;border:1px solid var(--line);border-radius:14px;overflow:hidden;background:var(--card);box-shadow:var(--shadow);margin-bottom:20px}
  .pcover{height:74px;background:linear-gradient(115deg,#0A66C2,#0A4E96 60%,#083A70);position:relative;overflow:hidden}
  .pcover-glow{position:absolute;inset:0;background:radial-gradient(circle at 80% -20%,rgba(255,255,255,.28),transparent 55%),repeating-linear-gradient(110deg,transparent,transparent 22px,rgba(255,255,255,.05) 22px,rgba(255,255,255,.05) 23px)}
  .pavatar{position:absolute;top:28px;left:22px;width:92px;height:92px;border-radius:50%;background:linear-gradient(150deg,#dfe7ef,#c3d2e2);border:4px solid var(--card);display:grid;place-items:center;box-shadow:0 4px 14px rgba(0,0,0,.08);z-index:1}
  .pavatar span{font-size:29px;font-weight:700;color:#5b6b7c}
  .pbody{padding:58px 22px 20px}
  .pname-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
  .pname{font-size:21px;font-weight:700;letter-spacing:-.015em;margin:0}
  .pedit{display:inline-flex;align-items:center;gap:6px;font-size:12px;font-weight:600;color:var(--blue);background:var(--blue-soft);padding:5px 11px;border-radius:999px}
  .pedit svg{width:14px;height:14px}
  @media (max-width:560px){.pavatar{width:80px;height:80px;top:30px}.pbody{padding:52px 18px 18px}}
  .hl-field{position:relative;margin:14px 0 4px;border:1.5px solid var(--blue);border-radius:11px;background:linear-gradient(180deg,#fff,#FAFCFF);padding:12px 14px 10px;box-shadow:0 0 0 4px rgba(10,102,194,.10)}
  .hl-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:5px}
  .hl-label{font-size:11px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:var(--blue)}
  .hl-input{width:100%;border:none;outline:none;background:transparent;resize:none;color:var(--ink);font-size:19px;font-weight:600;line-height:1.32;padding:0}
  .hl-input::placeholder{color:var(--ink4);font-weight:500}
  .sample-rail{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:15px}
  .sample-rail .sr-l{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--ink4)}
  .chip-btn{border:1px solid var(--line);background:var(--card2);color:var(--ink2);padding:6px 12px;border-radius:999px;font-size:13px;font-weight:500;cursor:pointer}
  .chip-btn:hover{border-color:var(--blue);color:var(--blue);background:var(--blue-soft)}

  .counter{font-size:12px;font-weight:700;color:var(--ink3);font-variant-numeric:tabular-nums}
  .counter i{color:var(--ink4);font-style:normal;font-weight:500;margin-left:2px}
  .counter.over{color:var(--warn)}

  .diag-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:22px}
  @media (max-width:560px){.diag-grid{grid-template-columns:1fr}}
  .diag{display:flex;align-items:center;gap:11px;border:1px solid var(--line);border-radius:11px;padding:11px 13px;background:var(--card2)}
  .diag-i{width:30px;height:30px;border-radius:8px;display:grid;place-items:center;color:var(--ink4);background:#F0EEE9;flex-shrink:0}
  .diag-t{display:flex;flex-direction:column;min-width:0}
  .diag-l{font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:var(--ink4)}
  .diag-v{font-size:14px;font-weight:700;color:var(--ink)}
  .diag.ok{border-color:rgba(5,118,66,.3);background:var(--green-soft)}
  .diag.ok .diag-i{color:#fff;background:var(--green)}
  .diag.warn{border-color:rgba(145,89,7,.28);background:var(--warn-soft)}
  .diag.warn .diag-i{color:#fff;background:var(--gold2)}

  .load{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:440px;text-align:center}
  @media (max-width:560px){.load{min-height:380px}}
  .orb{position:relative;width:170px;height:170px;margin-bottom:28px}
  .orb-ring{position:absolute;inset:0;border-radius:50%;border:1.5px solid rgba(10,102,194,.18)}
  .orb-ring:nth-child(2){border-color:rgba(180,123,20,.22)}
  .orb-arc{position:absolute;inset:-6px;border-radius:50%;border:3px solid transparent;border-top-color:var(--blue);border-right-color:rgba(10,102,194,.4)}
  .orb-core{position:absolute;inset:44px;border-radius:50%;background:radial-gradient(circle at 40% 35%,#fff,#EEF4FB);border:1px solid var(--line);display:grid;place-content:center}
  .orb-lab{font-size:10px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--blue)}
  .orb-pct{font-size:31px;font-weight:700;letter-spacing:-.03em;color:var(--ink);font-variant-numeric:tabular-nums;line-height:1}
  .orb-pct i{font-size:15px;color:var(--ink4);font-style:normal;font-weight:600}
  .fchip{position:absolute;top:0;padding:4px 9px;border:1px solid rgba(145,89,7,.25);background:var(--warn-soft);color:var(--warn);border-radius:999px;font-size:10.5px;font-weight:600;white-space:nowrap;pointer-events:none}
  .load-txt{max-width:420px}
  .load-title{font-size:18px;font-weight:600;color:var(--ink);line-height:1.4;margin:0 0 16px}
  .load-ticker{height:22px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;color:var(--blue)}
  .load-ticker span{display:inline-flex;align-items:center;gap:7px}
  .load-ticker svg{width:14px;height:14px}
  .load-bar{height:5px;border-radius:3px;background:var(--line2);margin-top:18px;overflow:hidden}
  .load-bar span{display:block;height:100%;background:linear-gradient(90deg,var(--blue),#3b8de0);border-radius:3px}

  .before{border:1px dashed rgba(145,89,7,.35);background:var(--warn-soft);border-radius:12px;padding:13px 16px;margin-bottom:18px}
  .before-tag{display:inline-flex;align-items:center;gap:7px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--warn);margin-bottom:7px}
  .before-tag .dot{width:5px;height:5px;border-radius:50%;background:var(--gold2)}
  .before p{margin:0;font-size:15.5px;color:var(--ink2);font-style:italic;text-decoration:line-through;text-decoration-color:rgba(145,89,7,.4)}
  .variants{display:flex;flex-direction:column;gap:13px;margin-bottom:18px}
  .variant{position:relative;border:1px solid var(--line);border-radius:14px;padding:17px 19px;background:var(--card);cursor:pointer;box-shadow:var(--shadow);transition:border-color .25s var(--ease),box-shadow .25s var(--ease)}
  .variant:hover{border-color:#C5D4E6}
  .variant.sel{border-color:var(--blue);box-shadow:0 0 0 3px rgba(10,102,194,.12),var(--shadow)}
  .sel-bar{position:absolute;left:-1px;top:16px;bottom:16px;width:3px;border-radius:3px;background:var(--blue)}
  .v-head{display:flex;align-items:center;gap:11px;margin-bottom:11px}
  .v-glyph{width:30px;height:30px;border-radius:8px;background:var(--blue-soft);color:var(--blue);display:grid;place-items:center;font-size:14px;font-weight:700;flex-shrink:0}
  .variant.sel .v-glyph{background:var(--blue);color:#fff}
  .v-meta{display:flex;flex-direction:column;line-height:1.2;flex:1;min-width:0}
  .v-name{font-size:14px;font-weight:700}
  .v-tag{font-size:12px;color:var(--ink3);font-weight:500}
  .v-idx{font-size:11px;font-weight:600;color:var(--ink4);font-variant-numeric:tabular-nums}
  .v-body{margin:0;font-size:16.5px;line-height:1.4;color:var(--ink);text-wrap:pretty}
  .v-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:14px}
  .v-chips{display:flex;gap:6px;flex-wrap:wrap}
  .add-chip{display:inline-flex;align-items:center;gap:4px;font-size:11.5px;font-weight:600;color:var(--green);background:var(--green-soft);border:1px solid rgba(5,118,66,.2);padding:3px 9px;border-radius:999px}
  .add-chip svg{width:12px;height:12px}
  .copy-btn{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);background:var(--card2);color:var(--ink);padding:8px 15px;border-radius:999px;font-size:13px;font-weight:600;cursor:pointer}
  .variant.sel .copy-btn{background:var(--blue);color:#fff;border-color:var(--blue)}
  .copy-btn:hover{border-color:#C5D4E6}
  .copy-btn.done{background:var(--green-soft);color:var(--green);border-color:rgba(5,118,66,.3)}
  .copy-btn svg{width:14px;height:14px}

  .unlock-row{display:flex;align-items:center;justify-content:space-between;gap:14px;width:100%;flex-wrap:wrap;background:linear-gradient(120deg,var(--gold-soft),#FDF8EE);border:1px solid rgba(180,123,20,.3);border-radius:13px;padding:15px 18px;cursor:pointer;text-align:left}
  .ur-l{display:inline-flex;align-items:center;gap:9px;font-size:14px;font-weight:600;color:var(--ink);flex:1;min-width:0}
  .ur-l svg{color:var(--gold2);flex-shrink:0}
  .ur-l i{color:var(--ink3);font-style:normal;font-weight:500}
  .ur-r{display:inline-flex;align-items:center;gap:7px;font-size:14px;font-weight:700;color:var(--gold);white-space:nowrap}

  .gate{max-width:460px;margin:6px auto;text-align:center;padding:10px 0}
  .gate .res-title{margin:10px auto 0;max-width:none}
  .gate-sub{font-size:15px;color:var(--ink2);line-height:1.55;margin:12px 0 22px;text-wrap:pretty}
  .gate-form{display:flex;flex-direction:column;gap:14px;text-align:left}
  .gate-fine{font-size:12px;color:var(--ink4);margin-top:14px;text-align:center}
  .field{display:flex;flex-direction:column;gap:7px}
  .field-l{display:flex;align-items:center;gap:8px;font-size:12.5px;font-weight:700;color:var(--ink2)}
  .ta{border:1px solid var(--line);border-radius:10px;background:var(--card);padding:12px 13px;font-size:15px;color:var(--ink);line-height:1.5;resize:vertical;outline:none;width:100%}
  .ta:focus{border-color:var(--blue);box-shadow:0 0 0 3px rgba(10,102,194,.12)}
  /* Reclaim focus styling from the global amber input:focus !important rule
     (src/index.css). Amber reads as a warning on this LinkedIn-blue surface;
     inputs here focus blue, and the borderless headline field keeps its own
     .hl-field ring instead of an inner glow. */
  .liopt-root input:focus,.liopt-root textarea:focus,.liopt-root select:focus{border-color:var(--blue) !important;box-shadow:0 0 0 3px rgba(10,102,194,.12) !important;outline:none !important}
  .liopt-root .hl-input:focus{border-color:transparent !important;box-shadow:none !important}
  .ta.sm{min-height:54px}
  .form-stack{display:flex;flex-direction:column;gap:18px;margin-bottom:22px}
  .confirm-note{font-size:14px;color:var(--ink3);margin:-8px 0 18px}

  .dropzone{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;border:2px dashed var(--line);border-radius:14px;background:var(--card2);padding:44px 22px;cursor:pointer;transition:border-color .2s var(--ease),background .2s var(--ease)}
  .dropzone.big{padding:60px 22px}
  @media (max-width:560px){.dropzone.big{padding:44px 18px}}
  .dropzone:hover{border-color:var(--blue);background:var(--blue-soft)}
  .dz-ic{width:56px;height:56px;border-radius:14px;background:var(--blue-soft);color:var(--blue);display:grid;place-items:center}
  .dz-t{font-size:17px;font-weight:700;color:var(--ink)}
  .dz-s{font-size:13.5px;color:var(--ink3);max-width:40ch;line-height:1.5}
  .dz-s b{color:var(--blue);font-weight:700}
  .dz-privacy{display:flex;align-items:center;justify-content:center;gap:7px;margin-top:14px;font-size:13px;font-weight:500;color:var(--green)}
  .dz-privacy svg{color:var(--green)}
  .dz-alt{text-align:center;margin-top:14px}
  .link-btn{border:none;background:transparent;color:var(--blue);font-size:14px;font-weight:600;cursor:pointer;text-decoration:underline;text-underline-offset:3px;padding:6px}
  .link-btn:hover{color:var(--blue-d)}
  .link-btn.back{display:inline-flex;align-items:center;gap:6px;text-decoration:none;margin-bottom:16px}
  .link-btn.back svg{width:15px;height:15px}

  .exp-rows{display:flex;flex-direction:column;gap:9px}
  .exp-row{display:grid;grid-template-columns:1.2fr 1fr .9fr auto;gap:8px;align-items:center}
  @media (max-width:560px){.exp-row{grid-template-columns:1fr 1fr;grid-auto-rows:auto}.er-per{grid-column:1 / -1}}
  .exp-row input{border:1px solid var(--line);border-radius:9px;background:var(--card);padding:10px 11px;font-size:14px;color:var(--ink);outline:none;min-width:0}
  .exp-row input:focus{border-color:var(--blue);box-shadow:0 0 0 3px rgba(10,102,194,.10)}
  .er-del{border:1px solid var(--line);background:var(--card);color:var(--ink4);width:38px;height:38px;border-radius:9px;display:grid;place-items:center;cursor:pointer;flex-shrink:0}
  .er-del:hover{border-color:var(--red);color:var(--red)}
  .add-row{display:inline-flex;align-items:center;gap:6px;margin-top:10px;border:1px dashed var(--line);background:transparent;color:var(--blue);padding:9px 14px;border-radius:9px;font-size:13px;font-weight:600;cursor:pointer}
  .add-row:hover{border-color:var(--blue);background:var(--blue-soft)}

  .assess-top{display:flex;align-items:center;gap:26px;margin-bottom:24px;flex-wrap:wrap}
  @media (max-width:560px){.assess-top{gap:16px;justify-content:center;text-align:center}}
  .gauge{position:relative;flex-shrink:0}
  .gauge-c{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center}
  .gauge-v{font-size:40px;font-weight:700;letter-spacing:-.03em;line-height:1;font-variant-numeric:tabular-nums}
  .gauge-l{font-size:10.5px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--ink4);margin-top:3px}
  .assess-sum{flex:1;min-width:240px}
  .assess-line{font-size:16px;color:var(--ink2);line-height:1.55;margin:0 0 14px;text-wrap:pretty}
  .assess-legend{display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--ink3)}
  .assess-legend span{display:inline-flex;align-items:center;gap:6px}
  .assess-legend i{width:8px;height:8px;border-radius:2px}

  .cat-grid{display:grid;grid-template-columns:1fr 1fr;gap:13px;margin-bottom:22px}
  @media (max-width:560px){.cat-grid{grid-template-columns:1fr}}
  .cat-card{border:1px solid var(--line);border-radius:13px;padding:16px 17px;background:var(--card2)}
  .cat-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:11px}
  .cat-name{font-size:14.5px;font-weight:700;color:var(--ink)}
  .grade{font-size:13px;font-weight:800;border:1.5px solid;border-radius:7px;padding:2px 8px;letter-spacing:.01em}
  .catbar{height:6px;border-radius:3px;background:var(--track);overflow:hidden;margin-bottom:11px}
  .catbar-f{display:block;height:100%;width:100%;border-radius:3px}
  .cat-fb{margin:0;font-size:13.5px;color:var(--ink2);line-height:1.5;text-wrap:pretty}

  .fixes{border:1px solid rgba(10,102,194,.25);background:var(--blue-soft);border-radius:14px;padding:18px 20px;margin-bottom:20px}
  .fixes-head{display:flex;align-items:center;gap:8px;font-size:12px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--blue);margin-bottom:14px}
  .fixes-head svg{color:var(--blue)}
  .fixes-list{display:flex;flex-direction:column;gap:12px}
  .fixes-list li{display:flex;align-items:flex-start;gap:12px;font-size:15px;color:var(--ink);line-height:1.5}
  .fx-n{flex-shrink:0;width:24px;height:24px;border-radius:50%;background:var(--blue);color:#fff;display:grid;place-items:center;font-size:13px;font-weight:700}

  .wizard-grid{display:grid;grid-template-columns:220px 1fr;gap:20px;align-items:start}
  @media (max-width:820px){.wizard-grid{grid-template-columns:1fr}}
  .checklist{border:1px solid var(--line);border-radius:13px;padding:16px;background:var(--card2);position:sticky;top:74px}
  @media (max-width:820px){.checklist{position:relative;top:auto}}
  .cl-head{display:flex;align-items:center;justify-content:space-between;font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--ink3);margin-bottom:10px}
  .cl-head span{color:var(--blue)}
  .cl-bar{height:6px;border-radius:3px;background:var(--track);overflow:hidden;margin-bottom:14px}
  .cl-bar span{display:block;height:100%;width:100%;background:var(--green);border-radius:3px}
  .cl-list{display:flex;flex-direction:column;gap:10px}
  .cl-list li{display:flex;align-items:center;gap:10px;font-size:13px;color:var(--ink3);font-weight:500}
  .cl-dot{width:22px;height:22px;border-radius:50%;background:var(--line);color:var(--ink3);display:grid;place-items:center;font-size:11px;font-weight:700;flex-shrink:0}
  .cl-dot svg{width:12px;height:12px}
  .cl-list li.on{color:var(--ink)}
  .cl-list li.on .cl-dot{background:var(--green);color:#fff}
  .cl-list li.lk{color:var(--ink4)}
  .cl-list li.lk .cl-dot{background:var(--gold-soft);color:var(--gold)}

  .blocks{display:flex;flex-direction:column;gap:14px}
  .cblock{border:1px solid var(--line);border-radius:13px;background:var(--card);box-shadow:var(--shadow);overflow:hidden}
  .cblock.done{border-color:rgba(5,118,66,.35)}
  .cb-head{display:flex;align-items:center;gap:10px;padding:13px 16px;border-bottom:1px solid var(--line2);background:var(--card2)}
  .cb-n{width:24px;height:24px;border-radius:50%;background:var(--blue);color:#fff;display:grid;place-items:center;font-size:12px;font-weight:700;flex-shrink:0}
  .cblock.done .cb-n{background:var(--green)}
  .cb-n svg{width:13px;height:13px}
  .cb-label{font-size:14px;font-weight:700;color:var(--ink);flex:1;min-width:0}
  .cb-per{font-size:12px;color:var(--ink4);font-weight:500}
  .cb-body{padding:15px 16px}
  .cb-body p{margin:0;font-size:15px;color:var(--ink);line-height:1.55;white-space:pre-wrap;text-wrap:pretty}
  .cb-foot{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:0 16px 15px}
  .cb-hint{font-size:12.5px;color:var(--ink3)}
  .cb-locked-strip{padding:0 16px 16px}

  .locked{position:relative;margin:0 16px 16px;border:1px solid var(--line);border-radius:11px;overflow:hidden;background:var(--card2);min-height:132px}
  .cblock > .locked{margin:16px}
  .locked-skel{padding:18px;display:flex;flex-direction:column;gap:11px;filter:none}
  .skl{height:11px;border-radius:6px;background:linear-gradient(90deg,#EDEBE6,#F5F3EF,#EDEBE6);background-size:200% 100%;animation:liopt-shimmer 1.6s linear infinite;display:block}
  .locked-over{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:9px;text-align:center;background:linear-gradient(180deg,rgba(251,250,248,.55),rgba(251,250,248,.92))}
  .locked-ic{width:34px;height:34px;border-radius:9px;background:var(--gold-soft);color:var(--gold);display:grid;place-items:center;border:1px solid rgba(180,123,20,.25)}
  .locked-t{font-size:13.5px;font-weight:700;color:var(--ink2)}
  .locked-btn{display:inline-flex;align-items:center;gap:7px;border:1px solid rgba(180,123,20,.4);background:var(--card);color:var(--gold);padding:8px 15px;border-radius:999px;font-size:13px;font-weight:700;cursor:pointer}
  .locked-btn:hover{background:var(--gold-soft)}
  .locked-btn svg{width:14px;height:14px}

  .paywall{display:flex;align-items:center;justify-content:space-between;gap:20px;flex-wrap:wrap;border:1px solid rgba(180,123,20,.35);background:linear-gradient(125deg,var(--gold-soft),#FDF9F0);border-radius:15px;padding:18px 20px;box-shadow:var(--shadow)}
  .pw-l{display:flex;flex-direction:column;gap:6px}
  .pw-k{display:inline-flex;align-items:center;gap:6px;font-size:11.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--gold)}
  .pw-k svg{width:13px;height:13px;color:var(--gold2)}
  .pw-t{font-size:17px;font-weight:700;color:var(--ink)}
  .pw-feat{display:flex;gap:14px;flex-wrap:wrap;margin-top:2px}
  .pw-feat span{position:relative;font-size:12.5px;color:var(--ink3);padding-left:15px}
  .pw-feat span::before{content:"";position:absolute;left:0;top:50%;transform:translateY(-50%);width:5px;height:5px;border-radius:50%;background:var(--green)}
  .pw-r{display:flex;flex-direction:column;align-items:flex-end;gap:7px}
  @media (max-width:560px){.pw-r{align-items:stretch;width:100%}.paywall{gap:14px}}
  .pw-price{display:flex;align-items:baseline;gap:7px}
  .pw-amt{font-size:32px;font-weight:700;letter-spacing:-.03em;color:var(--ink);line-height:1}
  .pw-amt sup{font-size:14px;color:var(--ink3);font-weight:600;vertical-align:super;margin-right:2px}
  .pw-once{font-size:12.5px;color:var(--ink3);font-weight:500}
  .pw-pro{font-size:12px;color:var(--ink4)}

  .wizard-done{display:flex;align-items:center;gap:10px;border:1px solid rgba(5,118,66,.35);background:var(--green-soft);border-radius:13px;padding:15px 18px;font-size:15px;font-weight:600;color:var(--green)}
  .wizard-done svg{color:var(--green)}

  .aside{display:flex;flex-direction:column;gap:16px;position:sticky;top:74px}
  @media (max-width:920px){.aside{position:relative;top:auto}}
  .s-card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:18px;box-shadow:var(--shadow)}
  .s-eye{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--ink4);margin-bottom:12px}
  .s-quote{margin:0;font-size:15px;line-height:1.5;color:var(--ink)}
  .s-attr-g{margin-top:12px;padding-top:12px;border-top:1px solid var(--line2);font-size:12.5px;font-weight:600;color:var(--ink3)}
  .s-tiles{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  .s-tile{display:flex;align-items:flex-start;gap:8px;border:1px solid var(--line2);border-radius:10px;padding:11px 12px;background:var(--card2);font-size:13px;font-weight:600;color:var(--ink);line-height:1.35}
  .s-tile-i{flex-shrink:0;width:20px;height:20px;border-radius:6px;background:var(--green-soft);color:var(--green);display:grid;place-items:center;margin-top:1px}
  .s-tile-i svg{width:12px;height:12px}
  .s-how{display:flex;flex-direction:column}
  .s-step{display:flex;gap:11px;align-items:flex-start;padding:11px 0;border-bottom:1px solid var(--line2);font-size:13px;color:var(--ink3);line-height:1.45}
  .s-step:last-child{border-bottom:none;padding-bottom:0}
  .s-step:first-child{padding-top:0}
  .s-n{flex-shrink:0;width:22px;height:22px;border-radius:50%;background:var(--blue-soft);color:var(--blue);display:grid;place-items:center;font-size:12px;font-weight:700}
  .s-step b{display:block;color:var(--ink);font-weight:600;font-size:13.5px;margin-bottom:1px}

  .trust{display:flex;align-items:center;justify-content:center;gap:24px;flex-wrap:wrap;margin-top:32px;padding-top:22px;border-top:1px solid var(--line);font-size:12.5px;color:var(--ink3)}
  .trust span{display:inline-flex;align-items:center;gap:8px}
  .trust span::before{content:"";width:5px;height:5px;border-radius:50%;background:var(--green)}

  @media (prefers-reduced-motion: reduce){
    *{animation-duration:.001ms !important;animation-iteration-count:1 !important;transition-duration:.001ms !important}
  }
}
@keyframes liopt-pulse{0%{box-shadow:0 0 0 0 rgba(5,118,66,.4)}70%{box-shadow:0 0 0 9px rgba(5,118,66,0)}100%{box-shadow:0 0 0 0 rgba(5,118,66,0)}}
@keyframes liopt-blink{50%{opacity:.35}}
@keyframes liopt-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
`;
