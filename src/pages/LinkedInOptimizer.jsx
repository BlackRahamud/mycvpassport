/**
 * LinkedInOptimizer — /linkedin-optimizer
 *
 * Visual layer rebuilt from the Claude Design handoff
 * (LinkedIn Optimizer Page.html, editorial + OLED theatre).
 *
 * Business logic is unchanged: same 4-state machine, same Glovebox
 * restore, same Supabase permissions check, same Ziina checkout,
 * same Dubai/India market toggle.
 *
 * Props the component self-manages (public API for future reuse):
 *   currentStep  : "idle" | "loading" | "results" | "locked"
 *   userStatus   : { isUnlocked: boolean, isAuthenticated: boolean }
 *   apiResponse  : { professional, bold, storyDriven }
 *   onOptimize   : POST /api/ai?action=linkedin_headline
 *   onUnlock     : POST /api/create-ziina-payment → Ziina redirect
 */

import { useState, useEffect, useLayoutEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { supabase } from "../supabaseClient";
import { useCvpAuth } from "../useCvpAuth";
import safeFetch from "../lib/net/safeFetch";

// ─── Market config ────────────────────────────────────────────────────────────
// Copy + paywall pricing labels keyed to the Dubai / India toggle.
const MARKETS = {
  dubai: {
    key: "dubai",
    toggleLabel: "Dubai",
    recruiterCopy: "a Dubai recruiter",
    samples: [
      "Marketing Manager",
      "Finance professional seeking new opportunities",
      "Software Developer | Looking for a job",
      "Sales — Dubai",
    ],
    priceSup: "AED",
    priceAmt: "49",
    payLabel: "Ziina",
    lockedName: "Layla Al-Mansouri",
    lockedRole: "Senior Marketing Manager · Dubai",
  },
  india: {
    key: "india",
    toggleLabel: "India",
    recruiterCopy: "a Bengaluru recruiter",
    samples: [
      "Product Manager — seeking opportunities",
      "Full Stack Developer",
      "Data Analyst | Open to work",
      "Business Analyst at Current Company",
    ],
    priceSup: "₹",
    priceAmt: "999",
    payLabel: "UPI",
    lockedName: "Arjun Iyer",
    lockedRole: "Senior Product Manager · Bengaluru",
  },
};

// Style metadata for the 3 variant cards. Body text comes from apiResponse.
const STYLES = [
  { key: "professional", glyph: "P", name: "Professional", tag: "Credible & precise",      chips: ["seniority", "scale proof", "region fit"] },
  { key: "bold",         glyph: "B", name: "Bold",         tag: "Recruiter-stop-scroll",   chips: ["voice", "numbers", "signal"] },
  { key: "storyDriven",  glyph: "S", name: "Story-driven", tag: "Human & magnetic",        chips: ["narrative", "intent", "specificity"] },
];

const TICKER_MSGS = [
  "Parsing headline",
  "Matching against GCC recruiter screens",
  "Measuring keyword density",
  "Scoring seniority signals",
  "Detecting location clarity",
  "Running A/B against 4,812 profiles",
  "Drafting Professional variant",
  "Drafting Bold variant",
];

const FAILURES = [
  "NO ROLE CLARITY", "GENERIC", "NO SENIORITY", "NO LOCATION", "MISSING NUMBERS",
  "KEYWORD DEAD", "WEAK VERBS", "NO DIFFERENTIATION",
];

const LOCKED_LOREM =
  "Leading regional marketing for a fintech scaling across the UAE and KSA. Former growth lead at Careem. Built cross-border campaigns that delivered AED 40M in attributable revenue and scaled a team of eight across three markets. Specializes in D2C funnels, retention loops, and attribution across fragmented channels.";

// ─── Diagnostics (pure JS — no backend) ───────────────────────────────────────
const SENIORITY_WORDS = ["senior", "lead", "head", "director", "manager", "vp", "principal", "chief", "founder"];
const LOCATION_WORDS = ["dubai", "abu dhabi", "riyadh", "doha", "uae", "ksa", "bengaluru", "mumbai", "delhi", "india", "gcc"];

function diagnose(headline) {
  const h = (headline || "").trim();
  const low = h.toLowerCase();

  const len = h.length;
  let length;
  if (len === 0) length = { state: "idle", value: "—" };
  else if (len < 60) length = { state: "warn", value: "Too short" };
  else if (len > 220) length = { state: "warn", value: "Over limit" };
  else length = { state: "on", value: `${len} chars · clean` };

  let seniority;
  if (!h) seniority = { state: "idle", value: "—" };
  else {
    const match = SENIORITY_WORDS.find((w) => low.includes(w));
    seniority = match
      ? { state: "on", value: `"${match}" detected` }
      : { state: "warn", value: "Not found" };
  }

  let location;
  if (!h) location = { state: "idle", value: "—" };
  else {
    const match = LOCATION_WORDS.find((w) => low.includes(w));
    location = match
      ? { state: "on", value: match.replace(/\b\w/g, (c) => c.toUpperCase()) }
      : { state: "warn", value: "Missing" };
  }

  return { length, seniority, location };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function StepHeader({ step, tag, variant = "ready" }) {
  return (
    <div className="lio-canvas-header">
      <span className={`lio-state-tag ${variant === "busy" ? "busy" : variant === "lock" ? "lock" : ""}`}>
        <span className="lio-tick" />
        {tag}
      </span>
      <div className="lio-step-rail">
        <b>Step {step}</b> / 4
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`lio-seg ${i < step ? "on" : ""}`} />
        ))}
      </div>
    </div>
  );
}

// ─── IDLE ─────────────────────────────────────────────────────────────────────
function IdleView({ market, headline, setHeadline, onOptimize, canOptimize, errorMsg }) {
  const m = MARKETS[market];
  const diag = useMemo(() => diagnose(headline), [headline]);
  return (
    <>
      <StepHeader step={1} tag="Awaiting input" />
      <div className="lio-idle-head">
        <span className="lio-num">01</span>
        <h2 className="lio-idle-title">Paste the headline on your profile today.</h2>
      </div>

      <div className="lio-input-shell">
        <div className="lio-input-inner">
          <div className="lio-input-label">
            <span className="lio-mono lio-input-mono">Current headline</span>
            <span className="lio-counter">
              <b>{headline.length}</b> / 220
            </span>
          </div>
          <textarea
            className="lio-headline"
            value={headline}
            onChange={(e) => setHeadline(e.target.value.slice(0, 220))}
            placeholder="e.g. Marketing Manager"
            spellCheck={false}
            rows={3}
          />
        </div>
      </div>

      <div className="lio-sample-rail">
        <span className="lio-sample-ttl">try</span>
        {m.samples.map((s) => (
          <button key={s} type="button" onClick={() => setHeadline(s)}>{s}</button>
        ))}
      </div>

      <div className="lio-diagnostics">
        <Diag label="Length"           state={diag.length.state}    value={diag.length.value} />
        <Diag label="Seniority signal" state={diag.seniority.state} value={diag.seniority.value} />
        <Diag label="Location"         state={diag.location.state}  value={diag.location.value} />
      </div>

      <div className="lio-cta-row">
        <button
          type="button"
          className="lio-ring-btn"
          disabled={!canOptimize}
          onClick={onOptimize}
        >
          <span>Optimize my headline</span>
          <span className="lio-arrow">→</span>
        </button>
        <span className="lio-cta-note">Free · no sign-up · <b>takes 4 seconds</b></span>
      </div>

      {errorMsg ? <div className="lio-err">{errorMsg}</div> : null}
    </>
  );
}

function Diag({ label, state, value }) {
  const cls = state === "on" ? "on" : state === "warn" ? "warn" : "";
  return (
    <div className={`lio-diag ${cls}`}>
      <div className="lio-diag-ring" />
      <div>
        <div className="lio-diag-lab">{label}</div>
        <div className="lio-diag-val">{value}</div>
      </div>
    </div>
  );
}

// ─── LOADING ──────────────────────────────────────────────────────────────────
function LoadingView() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const start = performance.now();
    let raf;
    const tick = (now) => {
      const elapsed = now - start;
      const v = Math.min(100, Math.round((elapsed / 2200) * 100));
      setPct(v);
      if (v < 100) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <>
      <StepHeader step={2} tag="Screening — 4,812 recruiter profiles" variant="busy" />
      <div className="lio-loader-wrap">
        <div className="lio-orb">
          <div className="lio-halo" />
          <div className="lio-halo" />
          <div className="lio-halo" />
          <div className="lio-ring-spin" />
          <div className="lio-core">
            <div className="lio-mono lio-core-mono">Scanning</div>
            <div className="lio-pct">{pct}%</div>
          </div>
          {FAILURES.map((f, i) => {
            const x = (((i * 37) % 21) - 10) * 11;
            const delay = (i * 0.6).toFixed(2);
            return (
              <div
                key={f}
                className="lio-chip-fall"
                style={{ left: `calc(50% + ${x}px)`, top: 0, animationDelay: `${delay}s` }}
              >
                {f}
              </div>
            );
          })}
        </div>
        <div className="lio-loader-status">
          <div className="lio-loader-title">
            Running your headline through the recruiter screens that rejected 47 others this week.
          </div>
          <div className="lio-ticker">
            <div className="lio-ticker-track">
              {TICKER_MSGS.concat(TICKER_MSGS).map((m, i) => (
                <div key={i}>{m}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── RESULTS ──────────────────────────────────────────────────────────────────
function ResultsView({ headline, apiResponse, selectedStyle, setSelectedStyle, onSeeMore, market }) {
  const m = MARKETS[market];
  const [copied, setCopied] = useState(null);
  const copyTimerRef = useRef(null);
  useEffect(() => () => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current); }, []);

  const displayOriginal = (headline && headline.trim()) || m.samples[0];

  const doCopy = useCallback((key) => {
    const text = apiResponse?.[key] || "";
    setSelectedStyle(key);
    setCopied(key);
    try { navigator.clipboard?.writeText(text).catch(() => {}); } catch { /* noop */ }
    if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(null), 1600);
  }, [apiResponse, setSelectedStyle]);

  return (
    <>
      <StepHeader step={3} tag="3 rewrites · 1 unlock left" />
      <div className="lio-results-head">
        <h2 className="lio-results-h2">Here's what they <em>actually</em> read.</h2>
        <div className="lio-score">
          <div className="lio-score-d">A</div>
          <div>
            <div className="lio-score-lab">Optimized score</div>
            <div className="lio-score-val">92 / 100</div>
          </div>
        </div>
      </div>

      <div className="lio-orig">
        <div className="lio-orig-tag">Your headline — the problem</div>
        <p>&ldquo;{displayOriginal}&rdquo;</p>
      </div>

      <div className="lio-variants">
        {STYLES.map((s, i) => {
          const text = apiResponse?.[s.key] || "";
          const selected = selectedStyle === s.key;
          return (
            <div
              key={s.key}
              role="button"
              tabIndex={0}
              className={`lio-variant ${selected ? "selected" : ""}`}
              onClick={() => setSelectedStyle(s.key)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedStyle(s.key); } }}
            >
              <div className="lio-variant-head">
                <div className="lio-variant-style">
                  <div className="lio-variant-glyph">{s.glyph}</div>
                  <div>
                    <div className="lio-variant-name">{s.name}</div>
                    <div className="lio-variant-tagline">{s.tag}</div>
                  </div>
                </div>
                <span className="lio-variant-num">0{i + 1} / 03</span>
              </div>
              <div className="lio-variant-body">{text || "—"}</div>
              <div className="lio-variant-foot">
                <div className="lio-chips">
                  {s.chips.map((c) => <span key={c} className="lio-chip">{c}</span>)}
                </div>
                <button
                  type="button"
                  className={`lio-copy-btn ${copied === s.key ? "done" : ""}`}
                  onClick={(e) => { e.stopPropagation(); doCopy(s.key); }}
                >
                  <span>{copied === s.key ? "Copied" : "Copy"}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="lio-results-foot">
        <span className="lio-mono lio-results-foot-mono">
          Want the full profile rewrite? About · Experience · Skills
        </span>
        <button type="button" className="lio-copy-btn lio-results-foot-cta" onClick={onSeeMore}>
          Unlock full profile →
        </button>
      </div>
    </>
  );
}

// ─── LOCKED ───────────────────────────────────────────────────────────────────
function LockedView({ market, userStatus, onUnlock, onBackToResults, onUpgrade, payingIntent }) {
  const m = MARKETS[market];
  const isUnlocked = userStatus.isUnlocked;

  return (
    <>
      <StepHeader
        step={4}
        tag={isUnlocked ? "Unlocked — full profile ready" : "Locked — payment required"}
        variant={isUnlocked ? "ready" : "lock"}
      />

      <div className="lio-results-head" style={{ marginBottom: 20 }}>
        <h2 className="lio-results-h2">
          {isUnlocked ? "Your full rewrite is ready." : "One step from the full rewrite."}
        </h2>
        <div className="lio-score lio-score-lock">
          <div className="lio-score-d lio-score-d-lock">★</div>
          <div>
            <div className="lio-score-lab">Full profile</div>
            <div className="lio-score-val lio-score-val-lock">About + Experience + Skills</div>
          </div>
        </div>
      </div>

      <div className="lio-locked">
        <div className="lio-lk-head">
          <div>
            <div className="lio-lk-name">{m.lockedName}</div>
            <div className="lio-mono lio-lk-role">{m.lockedRole}</div>
          </div>
          <span className="lio-lk-tag">{isUnlocked ? "★ unlocked" : "★ preview blurred"}</span>
        </div>
        <BlurBlock stamp="About" text={LOCKED_LOREM} blurred={!isUnlocked} />
        <BlurBlock stamp="Experience · 1 of 4" text={LOCKED_LOREM} blurred={!isUnlocked} />
        <BlurBlock stamp="Experience · 2 of 4" text={LOCKED_LOREM} blurred={!isUnlocked} />
      </div>

      {isUnlocked ? (
        <div className="lio-unlocked-foot">
          <span className="lio-mono lio-unlocked-mono">Full rewrite delivered to your inbox within 60 seconds.</span>
          <button type="button" className="lio-copy-btn" onClick={onBackToResults}>← Back to styles</button>
        </div>
      ) : (
        <>
          <div className="lio-price">
            <div className="lio-price-what">
              <span className="lio-mono lio-price-mono">Express Pass · one-time</span>
              <div className="lio-price-title">Unlock the full LinkedIn rewrite</div>
            </div>
            <div className="lio-price-amt">
              <sup>{m.priceSup}</sup>{m.priceAmt}
            </div>
            <button type="button" className="lio-pay-btn" disabled={payingIntent} onClick={onUnlock}>
              <span>{payingIntent ? "Redirecting…" : `Pay via ${m.payLabel}`}</span>
              <span>→</span>
            </button>
          </div>

          <div className="lio-price-trust">
            <span>• No subscription</span>
            <span>• Refund within 7 days</span>
            <span>• Works in 120s</span>
          </div>

          <button type="button" className="lio-upgrade" onClick={onUpgrade}>
            or upgrade to <b>Active Hunter</b> for unlimited rewrites →
          </button>
        </>
      )}
    </>
  );
}

function BlurBlock({ stamp, text, blurred }) {
  return (
    <div className="lio-blur-block">
      <span className="lio-blur-stamp">{stamp}</span>
      <p style={blurred ? undefined : { filter: "none", userSelect: "auto", pointerEvents: "auto", color: "#fff" }}>
        {text}
      </p>
    </div>
  );
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
        safeFetch("/api/ai?action=linkedin_headline", {
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
      const res = await safeFetch("/api/create-ziina-payment", {
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

  const m = MARKETS[market];

  return (
    <>
      <Helmet>
        <title>LinkedIn Profile Optimizer for UAE &amp; GCC Job Seekers — CVPassport</title>
        <meta name="description" content="Generate a LinkedIn About section built for UAE & GCC recruiters. AI-powered, Gulf job market ready. Free to start." />
        <meta name="keywords" content="CV builder UAE, ATS CV Dubai, resume builder GCC, CV maker India, ATS optimised CV, job seeker Dubai, expat CV builder, CV templates UAE" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://mycvpassport.com/linkedin-optimizer" />
        <meta property="og:title" content="LinkedIn Profile Optimizer for UAE &amp; GCC Job Seekers — CVPassport" />
        <meta property="og:description" content="Generate a LinkedIn About section built for UAE & GCC recruiters. AI-powered, Gulf job market ready. Free to start." />
        <meta property="og:url" content="https://mycvpassport.com/linkedin-optimizer" />
        <meta property="og:type" content="website" />
        <meta property="og:locale" content="en_AE" />
      </Helmet>
    <div className="lio-root">
      <style>{CSS_TEXT}</style>
      <div className="lio-field" aria-hidden />

      <div className="lio-page">
        {/* Topbar */}
        <div className="lio-top">
          <button type="button" className="lio-brand" onClick={onBack}>
            <div className="lio-mark">CV</div>
            <div className="lio-brand-text">
              <div className="lio-brand-name">CVPassport</div>
              <div className="lio-mono lio-brand-sub">LinkedIn Optimizer</div>
            </div>
          </button>
          <div className="lio-market">
            {Object.values(MARKETS).map((mk) => (
              <button
                key={mk.key}
                type="button"
                className={market === mk.key ? "on" : ""}
                onClick={() => setMarket(mk.key)}
              >
                {mk.toggleLabel}
              </button>
            ))}
          </div>
        </div>

        {/* Editorial header */}
        <div className="lio-hdr">
          <div className="lio-eyebrow">
            <span className="lio-eyebrow-pulse" />
            <span>Screening — recruiter view · now</span>
          </div>
          <h1 className="lio-h1">
            Your headline is <em>the first six seconds</em> of your next offer.
          </h1>
          <p className="lio-sub">
            Ghosted applications usually aren't a skill problem. They're a <span className="lio-hl">headline problem</span> — three lines of text that decide whether <span className="lio-hl">{m.recruiterCopy}</span> opens you or scrolls past. Paste yours; watch what changes.
          </p>
          <div className="lio-strip">
            <span className="lio-mono">Trained on <b>4,812</b> GCC · IN recruiter screens</span>
            <span className="lio-strip-dot" />
            <span className="lio-mono">Avg. uplift <b className="lio-good">+4.2× profile views</b></span>
            <span className="lio-strip-dot" />
            <span className="lio-mono">Last optimized <b className="lio-dim">2m ago</b> · Riyadh</span>
          </div>
        </div>

        {/* Stage */}
        <div className="lio-stage">
          <div className="lio-canvas">
            <div className="lio-corners">
              <span className="tl" /><span className="tr" /><span className="bl" /><span className="br" />
            </div>
            <div className="lio-canvas-body lio-state-mount" key={currentStep}>
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
              {currentStep === "loading" && <LoadingView />}
              {currentStep === "results" && apiResponse && (
                <ResultsView
                  market={market}
                  headline={headline}
                  apiResponse={apiResponse}
                  selectedStyle={selectedStyle}
                  setSelectedStyle={setSelectedStyle}
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
            </div>
          </div>

          {/* Aside */}
          <aside className="lio-aside">
            <div className="lio-card">
              <div className="lio-card-eye"><span className="lio-card-eye-d" /> Recruiter voice</div>
              <div className="lio-recruiter-quote">
                I get 800 applications a week. A strong headline takes me two seconds to respect. A weak one — I never open the profile.
              </div>
              <div className="lio-recruiter-attr">
                <div className="lio-av">NA</div>
                <div>
                  <div className="lio-who">Nadia Al-Mansouri</div>
                  <div className="lio-mono lio-role">Talent Lead · Emirates NBD</div>
                </div>
              </div>
            </div>

            <div className="lio-card">
              <div className="lio-card-eye"><span className="lio-card-eye-d" /> What changes</div>
              <div className="lio-stats">
                <div><b>+4.2×</b><span>Profile views</span></div>
                <div><b>+68%</b><span>InMail replies</span></div>
                <div><b>11.8k</b><span>Headlines fixed</span></div>
                <div><b>6s</b><span>Median read</span></div>
              </div>
            </div>

            <div className="lio-card">
              <div className="lio-card-eye"><span className="lio-card-eye-d" /> How it works</div>
              <div className="lio-how">
                <div className="lio-how-step">
                  <div className="lio-how-n">1</div>
                  <div><b>Paste your current headline.</b>No sign-up, no CV upload.</div>
                </div>
                <div className="lio-how-step">
                  <div className="lio-how-n">2</div>
                  <div><b>We scan it against 4,812 recruiter screens.</b>The ones that got replies and the ones that didn't.</div>
                </div>
                <div className="lio-how-step">
                  <div className="lio-how-n">3</div>
                  <div><b>Get 3 rewrites, one unlocked.</b>Active Hunter unlocks the full profile rewrite.</div>
                </div>
              </div>
            </div>
          </aside>
        </div>

        <div className="lio-trust">
          <span className="lio-trust-item lio-trust-claude">
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                fill="#FFFFFF"
                d="M5.6 17.5L11 6.5h2L18.4 17.5h-2.1l-1.3-2.7H9l-1.3 2.7H5.6zm4.1-4.4h4.6L12 8.4l-2.3 4.7z"
              />
            </svg>
            <span>POWERED BY ANTHROPIC CLAUDE</span>
          </span>
          <span className="lio-trust-item">
            <svg width="14" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span>PRIVATE — YOUR TEXT NEVER TRAINS ANY AI MODEL</span>
          </span>
          <span className="lio-trust-item lio-trust-pay">
            <svg width="32" height="18" viewBox="0 0 44 20" aria-label="Apple Pay" role="img">
              <rect width="44" height="20" rx="4" fill="#FFFFFF" />
              <path
                d="M12.04 7.5c-.28-.35-.76-.65-1.25-.63-.06.58.18 1.14.47 1.48.28.34.74.6 1.21.58.08-.55-.18-1.1-.43-1.43zM14.2 13.8c-.26.38-.51.74-.92.75-.4.01-.53-.24-.99-.24-.46 0-.6.23-.98.25-.4.01-.7-.42-.96-.8-.53-.77-.93-2.17-.38-3.12.27-.47.75-.76 1.27-.77.38-.01.74.26.97.26.23 0 .67-.32 1.13-.27.19.01.73.08 1.08.58-.03.02-.64.38-.63 1.12.01.89.79 1.18.8 1.19-.01.03-.12.42-.39.79z"
                fill="#000"
              />
              <text x="17" y="14" fill="#000" fontFamily="Arial, sans-serif" fontSize="10" fontWeight="600">Pay</text>
            </svg>
            <img src="/ziina-logo.png" alt="Ziina" style={{ height: 18, width: "auto", display: "block" }} />
            <svg width="32" height="18" viewBox="0 0 44 20" aria-label="Visa" role="img">
              <rect width="44" height="20" rx="3" fill="#1A1F71" />
              <text x="22" y="14" fill="#fff" fontFamily="Arial, sans-serif" fontSize="10" fontWeight="900" textAnchor="middle" letterSpacing="1">VISA</text>
            </svg>
            <svg width="32" height="18" viewBox="0 0 44 20" aria-label="Mastercard" role="img">
              <circle cx="17" cy="10" r="7" fill="#EB001B" />
              <circle cx="27" cy="10" r="7" fill="#F79E1B" fillOpacity="0.85" />
            </svg>
            <svg width="32" height="18" viewBox="0 0 44 20" aria-label="Google Pay" role="img">
              <rect width="44" height="20" rx="4" fill="#FFFFFF" />
              <text x="22" y="14" fill="#5F6368" fontFamily="Arial, sans-serif" fontSize="9" fontWeight="700" textAnchor="middle">G Pay</text>
            </svg>
            <svg width="36" height="18" viewBox="0 0 48 20" aria-label="UPI" role="img">
              <rect width="48" height="20" rx="3" fill="#FFFFFF" />
              <text x="24" y="14" fill="#0F2C5C" fontFamily="Arial, sans-serif" fontSize="10" fontWeight="800" textAnchor="middle" letterSpacing="1">UPI</text>
            </svg>
          </span>
        </div>
      </div>

      {resuming && (
        <div
          role="status"
          aria-live="polite"
          className="lio-resume"
          style={{ opacity: resumingFading ? 0 : 1, pointerEvents: resumingFading ? "none" : "auto" }}
        >
          <div className="lio-resume-orb">
            <div className="lio-ring-spin" />
            <div className="lio-resume-core">…</div>
          </div>
          <div className="lio-mono lio-resume-label">RESUMING YOUR CHECKOUT…</div>
        </div>
      )}
    </div>
    </>
  );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS_TEXT = `
/* Root tokens — editorial OLED */
.lio-root {
  --bg:#0A0A0A; --surf:#141414; --surf2:#1A1A1A; --hi:#242424;
  --line:rgba(255,255,255,.08); --line2:rgba(255,255,255,.04);
  --text:#FFFFFF; --dim:#A0A0A0; --mute:#6A6A6A;
  --good:#7FE3A1; --goodBg:rgba(127,227,161,.08);
  --warn:#F0C674; --warnBg:rgba(240,198,116,.08);
  --bad:#E0604A; --badBg:rgba(224,96,74,.08);
  --cool:#8FB6E8; --coolBg:rgba(143,182,232,.08);
  --gold:#D4A657;
  --ease:cubic-bezier(0.4,0,0.2,1);
  position: relative;
  min-height: 100vh;
  width: 100%;
  background: var(--bg);
  color: var(--text);
  font-family: "DM Sans", system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
  overflow-x: hidden;
}
.lio-root *, .lio-root *:before, .lio-root *:after { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
.lio-root button { font-family: inherit; }

.lio-mono { font-family: "JetBrains Mono", ui-monospace, Menlo, Consolas, monospace; letter-spacing: .06em; }
.lio-good { color: var(--good); }
.lio-dim { color: var(--dim); }

.lio-page { max-width: 1240px; margin: 0 auto; padding: 32px 24px 120px; position: relative; }

.lio-field { position: fixed; inset: 0; pointer-events: none; z-index: 0; }
.lio-field:before {
  content: ""; position: absolute; inset: 0;
  background:
    radial-gradient(ellipse 80% 50% at 50% -10%, rgba(143,182,232,.07), transparent 70%),
    radial-gradient(ellipse 60% 40% at 50% 110%, rgba(212,166,87,.05), transparent 70%);
}
.lio-field:after {
  content: ""; position: absolute; inset: 0; opacity: .28;
  background-image:
    linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px);
  background-size: 64px 64px;
  mask-image: radial-gradient(ellipse 80% 60% at 50% 40%, #000 40%, transparent 75%);
  -webkit-mask-image: radial-gradient(ellipse 80% 60% at 50% 40%, #000 40%, transparent 75%);
}

/* Topbar */
.lio-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 48px; position: relative; z-index: 2; gap: 12px; flex-wrap: wrap; }
.lio-brand { display: flex; align-items: center; gap: 10px; background: transparent; border: none; color: inherit; cursor: pointer; padding: 4px; border-radius: 10px; text-align: left; transition: background-color .2s var(--ease); }
.lio-brand:hover { background: rgba(255,255,255,.04); }
.lio-mark { width: 28px; height: 28px; border-radius: 8px; background: linear-gradient(180deg,#fff,#d4d4d4); display: grid; place-items: center; color: #0A0A0A; font-weight: 700; font-size: 12px; }
.lio-brand-name { font-size: 14px; font-weight: 600; }
.lio-brand-sub { font-size: 9px; color: var(--mute); letter-spacing: .18em; text-transform: uppercase; }
.lio-market { display: inline-flex; padding: 4px; background: var(--surf); border: 1px solid var(--line); border-radius: 999px; gap: 2px; }
.lio-market button { border: none; background: transparent; color: var(--dim); padding: 6px 14px; border-radius: 999px; font-size: 12px; font-weight: 600; cursor: pointer; transition: background-color .2s var(--ease), color .2s var(--ease); letter-spacing: .02em; }
.lio-market button.on { background: #fff; color: #0A0A0A; }

/* Editorial header */
.lio-hdr { position: relative; z-index: 2; margin-bottom: 40px; }
.lio-eyebrow { font-size: 11px; color: var(--mute); letter-spacing: .18em; text-transform: uppercase; font-family: "JetBrains Mono", ui-monospace, monospace; display: inline-flex; align-items: center; gap: 10px; }
.lio-eyebrow-pulse { width: 6px; height: 6px; border-radius: 50%; background: var(--good); box-shadow: 0 0 0 0 rgba(127,227,161,.6); animation: lio-pulse 2.2s var(--ease) infinite; }
@keyframes lio-pulse { 0%{box-shadow:0 0 0 0 rgba(127,227,161,.5)} 70%{box-shadow:0 0 0 12px rgba(127,227,161,0)} 100%{box-shadow:0 0 0 0 rgba(127,227,161,0)} }
.lio-h1 { font-family: "Fraunces", Georgia, serif; font-weight: 500; font-size: clamp(40px, 6vw, 72px); line-height: 1; letter-spacing: -.035em; margin: 16px 0 0; max-width: 14ch; }
.lio-h1 em { font-style: italic; color: var(--gold); font-weight: 400; }
.lio-sub { font-size: 16px; color: var(--dim); max-width: 52ch; margin-top: 18px; line-height: 1.5; text-wrap: pretty; }
.lio-hl { color: var(--text); font-weight: 500; }

.lio-strip { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; margin-top: 28px; padding-top: 20px; border-top: 1px solid var(--line2); font-size: 11px; color: var(--mute); }
.lio-strip b { color: var(--text); }
.lio-strip-dot { display: inline-block; width: 4px; height: 4px; border-radius: 50%; background: var(--mute); margin: 0 4px; }

/* Stage */
.lio-stage { position: relative; z-index: 2; margin-top: 48px; display: grid; grid-template-columns: minmax(0, 1fr) 320px; gap: 24px; align-items: start; }
@media (max-width: 900px) { .lio-stage { grid-template-columns: 1fr; } }

/* Canvas */
.lio-canvas { position: relative; background: linear-gradient(180deg, var(--surf), #0E0E0E); border: 1px solid var(--line); border-radius: 20px; overflow: hidden; min-height: 560px; min-width: 0; }
.lio-canvas:before { content: ""; position: absolute; inset: 0; pointer-events: none; border-radius: 20px; background: radial-gradient(ellipse 70% 30% at 50% 0%, rgba(255,255,255,.05), transparent 60%); }
.lio-canvas:after { content: ""; position: absolute; top: -1px; left: -40%; width: 40%; height: 2px; background: linear-gradient(90deg, transparent, rgba(255,255,255,.6), transparent); animation: lio-beam 7s linear infinite; }
@keyframes lio-beam { 0% { left: -40%; } 100% { left: 140%; } }
.lio-corners { position: absolute; inset: 14px; pointer-events: none; }
.lio-corners span { position: absolute; width: 12px; height: 12px; border-color: rgba(255,255,255,.18); border-style: solid; border-width: 0; }
.lio-corners .tl { top: 0; left: 0; border-top-width: 1px; border-left-width: 1px; }
.lio-corners .tr { top: 0; right: 0; border-top-width: 1px; border-right-width: 1px; }
.lio-corners .bl { bottom: 0; left: 0; border-bottom-width: 1px; border-left-width: 1px; }
.lio-corners .br { bottom: 0; right: 0; border-bottom-width: 1px; border-right-width: 1px; }
.lio-canvas-body { padding: 36px 36px 40px; position: relative; z-index: 1; }
@media (max-width: 600px) { .lio-canvas-body { padding: 24px 20px 28px; } }

.lio-canvas-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 28px; gap: 16px; flex-wrap: wrap; }
.lio-state-tag { display: inline-flex; align-items: center; gap: 8px; padding: 5px 10px; border: 1px solid var(--line); border-radius: 999px; background: rgba(255,255,255,.02); font-size: 10px; color: var(--dim); font-family: "JetBrains Mono", ui-monospace, monospace; letter-spacing: .14em; text-transform: uppercase; }
.lio-tick { width: 5px; height: 5px; border-radius: 50%; background: var(--good); box-shadow: 0 0 8px var(--good); }
.lio-state-tag.busy .lio-tick { background: var(--warn); box-shadow: 0 0 8px var(--warn); animation: lio-blink .9s var(--ease) infinite; }
.lio-state-tag.lock .lio-tick { background: var(--gold); box-shadow: 0 0 8px var(--gold); }
@keyframes lio-blink { 50% { opacity: .3; } }

.lio-step-rail { display: inline-flex; gap: 6px; align-items: center; font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 10px; color: var(--mute); letter-spacing: .1em; text-transform: uppercase; }
.lio-step-rail b { color: var(--text); font-weight: 600; }
.lio-seg { width: 18px; height: 2px; background: var(--line); }
.lio-seg.on { background: #fff; }

/* IDLE */
.lio-idle-head { display: flex; align-items: baseline; gap: 14px; margin-bottom: 16px; flex-wrap: wrap; }
.lio-num { font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 11px; color: var(--gold); letter-spacing: .2em; }
.lio-idle-title { font-family: "Fraunces", serif; font-weight: 500; font-size: 26px; letter-spacing: -.02em; margin: 0; }

.lio-input-shell { position: relative; border-radius: 14px; padding: 2px; background: linear-gradient(135deg, rgba(255,255,255,.14), rgba(255,255,255,.02) 40%, rgba(212,166,87,.18)); }
.lio-input-inner { background: linear-gradient(180deg, #0E0E0E, #0A0A0A); border-radius: 12px; padding: 18px 18px 14px; position: relative; overflow: hidden; }
.lio-input-inner:after { content: ""; position: absolute; inset: 0; background: radial-gradient(ellipse 120% 60% at 50% 0%, rgba(143,182,232,.05), transparent 60%); pointer-events: none; }
.lio-input-label { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.lio-input-mono { font-size: 10px; color: var(--mute); letter-spacing: .18em; text-transform: uppercase; }
.lio-counter { font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 10px; color: var(--mute); font-variant-numeric: tabular-nums; }
.lio-counter b { color: var(--dim); font-weight: 600; }
.lio-headline { width: 100%; background: transparent; border: none; outline: none; color: var(--text); font-family: "Fraunces", Georgia, serif; font-weight: 400; font-size: clamp(22px, 3vw, 30px); line-height: 1.3; letter-spacing: -.015em; resize: none; min-height: 96px; padding: 0; margin: 0; }
.lio-headline::placeholder { color: var(--mute); font-style: italic; }

.lio-sample-rail { display: flex; gap: 8px; margin-top: 16px; flex-wrap: wrap; }
.lio-sample-rail button { border: 1px solid var(--line); background: rgba(255,255,255,.02); color: var(--dim); padding: 6px 12px; border-radius: 999px; font-size: 12px; cursor: pointer; transition: border-color .2s var(--ease), color .2s var(--ease), background-color .2s var(--ease); }
.lio-sample-rail button:hover { color: var(--text); border-color: rgba(255,255,255,.2); background: rgba(255,255,255,.05); }
.lio-sample-ttl { font-size: 10px; color: var(--mute); letter-spacing: .16em; text-transform: uppercase; font-family: "JetBrains Mono", ui-monospace, monospace; align-self: center; margin-right: 4px; }

/* Diagnostics */
.lio-diagnostics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 20px 0 24px; }
@media (max-width: 560px) { .lio-diagnostics { grid-template-columns: 1fr; } }
.lio-diag { border: 1px solid var(--line); border-radius: 10px; padding: 12px 14px; background: rgba(255,255,255,.015); display: flex; align-items: center; gap: 12px; transition: border-color .3s var(--ease), background-color .3s var(--ease); }
.lio-diag-ring { width: 28px; height: 28px; border-radius: 50%; border: 2px solid var(--line); position: relative; flex-shrink: 0; }
.lio-diag-ring:before { content: ""; position: absolute; inset: -2px; border-radius: 50%; border: 2px solid transparent; border-top-color: var(--good); opacity: 0; transition: opacity .3s var(--ease); animation: lio-spin 1.6s linear infinite; }
.lio-diag.on { border-color: rgba(127,227,161,.3); background: var(--goodBg); }
.lio-diag.on .lio-diag-ring { border-color: rgba(127,227,161,.3); }
.lio-diag.on .lio-diag-ring:before { opacity: 1; }
.lio-diag.warn { border-color: rgba(240,198,116,.3); background: var(--warnBg); }
.lio-diag.warn .lio-diag-ring { border-color: rgba(240,198,116,.3); }
.lio-diag.warn .lio-diag-ring:before { border-top-color: var(--warn); opacity: 1; }
.lio-diag-lab { font-size: 10px; color: var(--mute); letter-spacing: .14em; text-transform: uppercase; font-family: "JetBrains Mono", ui-monospace, monospace; }
.lio-diag-val { font-size: 13px; color: var(--text); font-weight: 500; margin-top: 2px; }
@keyframes lio-spin { to { transform: rotate(360deg); } }

/* CTA */
.lio-cta-row { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; margin-top: 8px; }
.lio-ring-btn { position: relative; display: inline-flex; align-items: center; gap: 10px; padding: 14px 28px 14px 24px; background: #fff; color: #0A0A0A; border: none; border-radius: 999px; font-weight: 600; font-size: 14px; cursor: pointer; overflow: visible; transition: transform .2s var(--ease), opacity .2s var(--ease); min-height: 48px; }
.lio-ring-btn:hover:not(:disabled) { transform: translateY(-1px); }
.lio-ring-btn:disabled { opacity: .5; cursor: not-allowed; }
.lio-ring-btn:before { content: ""; position: absolute; inset: -4px; border-radius: 999px; padding: 2px; background: conic-gradient(from 0deg, transparent 0deg, #fff 60deg, transparent 180deg, rgba(212,166,87,.8) 260deg, transparent 360deg); -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude; animation: lio-spin 3.2s linear infinite; opacity: .9; }
.lio-arrow { display: inline-block; transition: transform .3s var(--ease); }
.lio-ring-btn:hover:not(:disabled) .lio-arrow { transform: translateX(3px); }
.lio-cta-note { font-size: 11px; color: var(--mute); font-family: "JetBrains Mono", ui-monospace, monospace; letter-spacing: .1em; text-transform: uppercase; }
.lio-cta-note b { color: var(--dim); font-weight: 600; }

.lio-err { margin-top: 14px; font-size: 12px; color: var(--bad); font-family: "JetBrains Mono", ui-monospace, monospace; letter-spacing: .06em; }

/* LOADING */
.lio-loader-wrap { display: flex; flex-direction: column; align-items: center; padding: 40px 0 20px; min-height: 380px; justify-content: center; }
.lio-orb { position: relative; width: 200px; height: 200px; margin-bottom: 32px; }
.lio-halo { position: absolute; inset: 0; border-radius: 50%; border: 1px solid rgba(255,255,255,.1); animation: lio-float 6s var(--ease) infinite; }
.lio-halo:nth-child(2) { inset: 12px; animation-duration: 4.5s; animation-direction: reverse; border-color: rgba(212,166,87,.2); }
.lio-halo:nth-child(3) { inset: 28px; border-color: rgba(143,182,232,.18); }
@keyframes lio-float { 0%,100% { transform: scale(1); opacity: .5; } 50% { transform: scale(1.04); opacity: 1; } }
.lio-ring-spin { position: absolute; inset: -8px; border-radius: 50%; padding: 2px; background: conic-gradient(from 0deg, transparent 0deg, #fff 40deg, rgba(212,166,87,.9) 90deg, transparent 180deg, #8FB6E8 270deg, transparent 360deg); -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude; animation: lio-spin 1.4s linear infinite; }
.lio-core { position: absolute; inset: 48px; border-radius: 50%; background: radial-gradient(circle at 40% 35%, rgba(255,255,255,.2), rgba(212,166,87,.1) 40%, transparent 70%); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); display: grid; place-items: center; }
.lio-core-mono { font-size: 9px; color: var(--gold); letter-spacing: .24em; text-transform: uppercase; }
.lio-pct { font-family: "Fraunces", serif; font-size: 32px; font-weight: 500; letter-spacing: -.03em; font-variant-numeric: tabular-nums; margin-top: 2px; }
.lio-loader-status { text-align: center; max-width: 420px; }
.lio-loader-title { font-family: "Fraunces", serif; font-size: 22px; font-weight: 500; letter-spacing: -.01em; margin-bottom: 12px; }
.lio-ticker { height: 22px; position: relative; overflow: hidden; font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 11px; color: var(--dim); letter-spacing: .1em; text-transform: uppercase; }
.lio-ticker-track { position: absolute; inset: 0; display: flex; flex-direction: column; gap: 4px; animation: lio-ticker 12s steps(8) infinite; }
.lio-ticker-track > div { height: 22px; display: flex; align-items: center; gap: 8px; justify-content: center; }
.lio-ticker-track > div:before { content: "\\203A"; color: var(--gold); }
@keyframes lio-ticker { to { transform: translateY(-192px); } }
.lio-chip-fall { position: absolute; padding: 4px 10px; border: 1px solid rgba(224,96,74,.3); background: rgba(224,96,74,.06); color: var(--bad); border-radius: 999px; font-size: 10px; font-family: "JetBrains Mono", ui-monospace, monospace; letter-spacing: .08em; text-transform: uppercase; white-space: nowrap; animation: lio-drift 5s var(--ease) infinite; }
@keyframes lio-drift { 0% { transform: translateY(0) rotate(-4deg); opacity: 0; } 15% { opacity: .9; } 60% { opacity: .6; } 100% { transform: translateY(140px) rotate(8deg); opacity: 0; } }

/* RESULTS */
.lio-results-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; margin-bottom: 8px; flex-wrap: wrap; }
.lio-results-h2 { font-family: "Fraunces", serif; font-weight: 500; font-size: 26px; letter-spacing: -.02em; margin: 0; }
.lio-results-h2 em { font-style: italic; color: var(--gold); }
.lio-score { display: flex; align-items: center; gap: 14px; padding: 8px 16px 8px 10px; border: 1px solid rgba(127,227,161,.25); background: var(--goodBg); border-radius: 999px; }
.lio-score-d { width: 30px; height: 30px; border-radius: 50%; border: 2px solid var(--good); display: grid; place-items: center; font-family: "Fraunces", serif; font-weight: 600; font-size: 14px; }
.lio-score-lab { font-size: 10px; color: var(--mute); font-family: "JetBrains Mono", ui-monospace, monospace; letter-spacing: .14em; text-transform: uppercase; }
.lio-score-val { font-size: 14px; font-weight: 600; color: var(--good); }
.lio-score-lock { border-color: rgba(212,166,87,.3); background: rgba(212,166,87,.06); }
.lio-score-d-lock { border-color: var(--gold); color: var(--gold); }
.lio-score-val-lock { color: var(--gold); }

.lio-orig { margin: 18px 0 24px; padding: 16px 18px; border: 1px dashed rgba(224,96,74,.3); border-radius: 12px; background: rgba(224,96,74,.04); }
.lio-orig-tag { display: inline-flex; align-items: center; gap: 6px; font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 10px; color: var(--bad); letter-spacing: .14em; text-transform: uppercase; margin-bottom: 8px; }
.lio-orig-tag:before { content: ""; display: inline-block; width: 4px; height: 4px; border-radius: 50%; background: var(--bad); }
.lio-orig p { margin: 0; font-family: "Fraunces", serif; font-size: 16px; color: var(--dim); line-height: 1.4; font-style: italic; text-decoration: line-through; text-decoration-color: rgba(224,96,74,.3); text-decoration-thickness: 1px; }

.lio-variants { display: grid; gap: 14px; margin-bottom: 24px; }
.lio-variant { position: relative; border: 1px solid var(--line); border-radius: 14px; padding: 20px 22px; background: linear-gradient(180deg, rgba(255,255,255,.02), transparent); cursor: pointer; transition: border-color .25s var(--ease), transform .25s var(--ease), background-color .25s var(--ease); min-width: 0; }
.lio-variant:hover { border-color: rgba(255,255,255,.18); transform: translateY(-1px); }
.lio-variant.selected { border-color: rgba(212,166,87,.4); background: linear-gradient(180deg, rgba(212,166,87,.04), transparent); }
.lio-variant.selected:before { content: ""; position: absolute; top: -1px; left: 16px; right: 16px; height: 2px; background: linear-gradient(90deg, transparent, var(--gold), transparent); }
.lio-variant-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; gap: 12px; flex-wrap: wrap; }
.lio-variant-style { display: flex; align-items: center; gap: 10px; }
.lio-variant-glyph { width: 22px; height: 22px; border-radius: 6px; border: 1px solid var(--line); display: grid; place-items: center; font-family: "Fraunces", serif; font-size: 12px; font-weight: 600; color: var(--gold); }
.lio-variant.selected .lio-variant-glyph { border-color: var(--gold); background: rgba(212,166,87,.08); }
.lio-variant-name { font-size: 12px; font-weight: 600; letter-spacing: .02em; }
.lio-variant-tagline { font-size: 11px; color: var(--mute); font-family: "JetBrains Mono", ui-monospace, monospace; letter-spacing: .08em; text-transform: uppercase; }
.lio-variant-num { font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 10px; color: var(--mute); letter-spacing: .12em; }
.lio-variant-body { font-family: "Fraunces", serif; font-size: 19px; line-height: 1.35; letter-spacing: -.01em; color: var(--text); text-wrap: pretty; word-break: break-word; }
.lio-variant-foot { display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap; align-items: center; justify-content: space-between; }
.lio-chips { display: flex; gap: 6px; flex-wrap: wrap; }
.lio-chip { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 999px; font-size: 10px; font-family: "JetBrains Mono", ui-monospace, monospace; letter-spacing: .06em; text-transform: uppercase; background: rgba(127,227,161,.08); color: var(--good); border: 1px solid rgba(127,227,161,.2); }
.lio-chip:before { content: "+"; font-weight: 700; }

.lio-copy-btn { position: relative; display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; background: rgba(255,255,255,.04); border: 1px solid var(--line); color: var(--text); border-radius: 999px; font-size: 12px; font-weight: 500; cursor: pointer; transition: background-color .2s var(--ease), border-color .2s var(--ease); }
.lio-copy-btn:hover { background: rgba(255,255,255,.08); border-color: rgba(255,255,255,.2); }
.lio-variant.selected .lio-copy-btn { background: #fff; color: #0A0A0A; border-color: #fff; }
.lio-variant.selected .lio-copy-btn:before { content: ""; position: absolute; inset: -3px; border-radius: 999px; padding: 1.5px; background: conic-gradient(from 0deg, transparent, rgba(212,166,87,.8), transparent 180deg, #fff, transparent 360deg); -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude; animation: lio-spin 2.2s linear infinite; }
.lio-copy-btn.done { background: var(--goodBg); color: var(--good); border-color: rgba(127,227,161,.3); }

.lio-results-foot { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; padding-top: 8px; border-top: 1px solid var(--line2); }
.lio-results-foot-mono { font-size: 11px; color: var(--mute); letter-spacing: .1em; text-transform: uppercase; }
.lio-results-foot-cta { background: transparent; }

/* LOCKED */
.lio-locked { position: relative; margin-top: 8px; padding: 22px; border: 1px solid var(--line); border-radius: 14px; background: radial-gradient(ellipse 80% 50% at 50% 0%, rgba(212,166,87,.05), transparent 70%), var(--surf2); }
.lio-lk-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; gap: 12px; flex-wrap: wrap; }
.lio-lk-name { font-family: "Fraunces", serif; font-size: 18px; font-weight: 500; letter-spacing: -.01em; }
.lio-lk-role { font-size: 11px; color: var(--mute); letter-spacing: .08em; margin-top: 2px; }
.lio-lk-tag { font-size: 10px; color: var(--gold); font-family: "JetBrains Mono", ui-monospace, monospace; letter-spacing: .14em; text-transform: uppercase; }
.lio-blur-block { position: relative; padding: 14px 16px; border-left: 2px solid var(--gold); background: rgba(255,255,255,.015); border-radius: 0 8px 8px 0; margin-bottom: 8px; min-height: 72px; overflow: hidden; }
.lio-blur-block p { margin: 0; font-size: 13px; color: var(--dim); line-height: 1.55; filter: blur(4px); user-select: none; pointer-events: none; transition: filter .4s var(--ease), color .4s var(--ease); }
.lio-blur-stamp { position: absolute; top: 10px; right: 10px; font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 9px; color: var(--gold); letter-spacing: .14em; text-transform: uppercase; background: rgba(212,166,87,.08); border: 1px solid rgba(212,166,87,.2); padding: 2px 6px; border-radius: 4px; }

.lio-price { margin-top: 20px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; padding: 18px 20px; border: 1px solid rgba(212,166,87,.3); background: linear-gradient(135deg, rgba(212,166,87,.08), rgba(212,166,87,.02)); border-radius: 14px; position: relative; overflow: hidden; }
.lio-price:before { content: ""; position: absolute; top: -1px; left: -40%; width: 40%; height: 2px; background: linear-gradient(90deg, transparent, var(--gold), transparent); animation: lio-beam 4.5s linear infinite; }
.lio-price-what { display: flex; flex-direction: column; gap: 4px; }
.lio-price-mono { font-size: 10px; color: var(--gold); letter-spacing: .16em; text-transform: uppercase; }
.lio-price-title { font-family: "Fraunces", serif; font-size: 18px; font-weight: 500; letter-spacing: -.01em; }
.lio-price-amt { font-family: "Fraunces", serif; font-size: 36px; font-weight: 500; letter-spacing: -.025em; }
.lio-price-amt sup { font-size: 16px; color: var(--dim); font-weight: 400; margin-right: 4px; vertical-align: top; line-height: 1.8; }
.lio-pay-btn { position: relative; display: inline-flex; align-items: center; gap: 10px; padding: 14px 26px; background: var(--gold); color: #0A0A0A; border: none; border-radius: 999px; font-weight: 700; font-size: 14px; cursor: pointer; overflow: visible; transition: transform .2s var(--ease), opacity .2s var(--ease); min-height: 48px; }
.lio-pay-btn:hover:not(:disabled) { transform: translateY(-1px); }
.lio-pay-btn:disabled { opacity: .7; cursor: wait; }
.lio-pay-btn:before { content: ""; position: absolute; inset: -4px; border-radius: 999px; padding: 2px; background: conic-gradient(from 0deg, transparent 0deg, #fff 40deg, var(--gold) 120deg, transparent 200deg, #fff 300deg, transparent 360deg); -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude; animation: lio-spin 2.8s linear infinite; }

.lio-price-trust { margin-top: 14px; display: flex; gap: 16px; flex-wrap: wrap; font-size: 11px; color: var(--mute); font-family: "JetBrains Mono", ui-monospace, monospace; letter-spacing: .08em; text-transform: uppercase; }
.lio-upgrade { margin-top: 14px; background: transparent; border: none; color: var(--dim); font-size: 12px; cursor: pointer; padding: 6px 0; font-family: inherit; }
.lio-upgrade b { color: var(--text); text-decoration: underline; text-underline-offset: 3px; }
.lio-unlocked-foot { margin-top: 20px; display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; padding-top: 14px; border-top: 1px solid var(--line2); }
.lio-unlocked-mono { font-size: 11px; color: var(--good); letter-spacing: .08em; text-transform: uppercase; }

/* Aside */
.lio-aside { position: sticky; top: 24px; display: flex; flex-direction: column; gap: 16px; min-width: 0; }
@media (max-width: 900px) { .lio-aside { position: relative; top: auto; } }
.lio-card { border: 1px solid var(--line); border-radius: 14px; padding: 18px; background: var(--surf); position: relative; overflow: hidden; }
.lio-card-eye { font-size: 10px; color: var(--mute); letter-spacing: .16em; text-transform: uppercase; font-family: "JetBrains Mono", ui-monospace, monospace; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
.lio-card-eye-d { width: 4px; height: 4px; border-radius: 50%; background: var(--gold); }
.lio-recruiter-quote { font-family: "Fraunces", serif; font-size: 16px; line-height: 1.4; letter-spacing: -.005em; color: var(--text); font-style: italic; }
.lio-recruiter-quote:before { content: "\\201C"; font-size: 40px; color: var(--gold); line-height: .6; margin-right: 2px; vertical-align: -6px; font-style: normal; }
.lio-recruiter-attr { margin-top: 14px; display: flex; align-items: center; gap: 10px; }
.lio-av { width: 32px; height: 32px; border-radius: 50%; background: radial-gradient(circle at 30% 30%, #c9a368, #6e4d1f); border: 1px solid rgba(255,255,255,.1); flex-shrink: 0; display: grid; place-items: center; font-family: "Fraunces", serif; font-weight: 600; font-size: 12px; color: #1a1004; }
.lio-who { font-size: 12px; font-weight: 500; }
.lio-role { font-size: 10px; color: var(--mute); letter-spacing: .08em; text-transform: uppercase; }
.lio-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.lio-stats div { padding: 12px; border: 1px solid var(--line); border-radius: 10px; }
.lio-stats b { display: block; font-family: "Fraunces", serif; font-size: 22px; font-weight: 500; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
.lio-stats span { font-size: 10px; color: var(--mute); letter-spacing: .1em; text-transform: uppercase; font-family: "JetBrains Mono", ui-monospace, monospace; }
.lio-how { display: flex; flex-direction: column; gap: 10px; }
.lio-how-step { display: flex; gap: 12px; align-items: flex-start; padding: 10px 0; border-bottom: 1px solid var(--line2); font-size: 13px; color: var(--dim); line-height: 1.45; }
.lio-how-step:last-child { border-bottom: none; }
.lio-how-n { flex-shrink: 0; width: 22px; height: 22px; border-radius: 50%; border: 1px solid var(--line); display: grid; place-items: center; font-family: "JetBrains Mono", ui-monospace, monospace; font-size: 11px; font-weight: 600; color: var(--gold); }
.lio-how-step b { color: var(--text); font-weight: 600; display: block; font-size: 13px; margin-bottom: 2px; }

/* Trust */
.lio-trust { margin-top: 40px; padding: 14px 32px; background: rgba(255,255,255,0.04); border-top: 1px solid rgba(255,255,255,0.1); border-bottom: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; font-size: 13px; font-weight: 600; color: #FFFFFF; font-family: "JetBrains Mono", ui-monospace, monospace; letter-spacing: 0.08em; text-transform: uppercase; position: relative; z-index: 2; }
.lio-trust .lio-trust-item { display: inline-flex; align-items: center; gap: 8px; color: #FFFFFF; }
.lio-trust .lio-trust-claude { text-shadow: 0 0 12px rgba(255,255,255,0.3); }
.lio-trust .lio-trust-pay { gap: 10px; }
.lio-trust .lio-trust-pay svg, .lio-trust .lio-trust-pay img { display: block; }

/* State mount transition */
.lio-state-mount { animation: lio-mount .5s var(--ease) both; }
@keyframes lio-mount { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

/* Resume overlay (Glovebox) */
.lio-resume { position: fixed; inset: 0; z-index: 100; background: rgba(10,10,10,0.94); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 22px; transition: opacity 300ms var(--ease); }
.lio-resume-orb { position: relative; width: 96px; height: 96px; }
.lio-resume-core { position: absolute; inset: 14px; border-radius: 50%; background: #0A0A0A; border: 1px solid var(--line); display: grid; place-items: center; color: var(--gold); }
.lio-resume-label { font-size: 12px; color: var(--dim); letter-spacing: .16em; text-transform: uppercase; }
`;
