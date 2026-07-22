// =============================================================
// src/components/hr/fab/FabAssistant.jsx
//
// Fab — the guided assistant layer over the HR portal (HrShell).
// Phase one: the overlay only, not the persisted stateful map.
//
// Fab is the same helper persona as the candidate side, wearing violet
// here. It is DETERMINISTIC, not a chatbot: there is no AI backend for
// it. Every surface reads the real portal structure and every control
// navigates a real route or opens the real feedback modal. The text
// input is a search and command launcher over real actions and help
// topics, never an open chat.
//
// Ported faithfully from the Claude Design file "Fab Assistant Layer".
// Modes: idle | welcome | tour | help | launcher | panel | complete.
//
// Feedback is folded in: the standalone PortalFeedback pill is retired
// in HrShell so Fab's orb is the only floating control in the corner.
// Fab renders PortalFeedback in controlled mode (affordance hidden) and
// opens it from "Send feedback" in the panel footer and the launcher —
// same logic, same modal, same destination, only the entry point moves.
//
// First run is gated on an existing new-user signal (no jobs posted yet)
// plus a client-only localStorage dismissal, so no DB migration is added.
// =============================================================

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { useReducedMotion } from "framer-motion";
import { supabase } from "../../../appSupabaseClient";
import PortalFeedback from "../PortalFeedback";
import "../../../pages/hr/PostJob/postJob.css"; // :root --pj-* tokens
import "../surfaceGlass.css"; // --surface-glass-* tokens
import "./fab.css";

const SEEN_KEY = "cvp_fab_welcomed";
const IDLE_MS = 45000;

// Real routes for every section (the rail's destinations).
const ROUTES = {
  jobs: "/employer/jobs",
  candidates: "/employer/candidates",
  interviews: "/employer/interviews",
  import: "/employer/import",
  post: "/employer/post",
  plans: "/employer/pricing",
};

// Which rail key owns a given pathname (so help anchors to the live item).
function sectionForPath(path) {
  if (path.startsWith("/employer/candidates")) return "candidates";
  if (path.startsWith("/employer/interviews")) return "interviews";
  if (path.startsWith("/employer/import")) return "import";
  if (path.startsWith("/employer/post")) return "post";
  if (path.startsWith("/employer/pricing")) return "plans";
  return "jobs"; // /employer/jobs and pipelines
}

// Per-section calm help + suggestions. Every suggestion and CTA points at
// a real route key. No dashes, sentence case, no exclamation.
const SECTION = {
  jobs: {
    help: "Jobs is your home base. Each role holds its own pipeline, from new applicants through to hired.",
    cta: { label: "Post a role", to: "post" },
    sug: [{ label: "Post a new role", to: "post" }, { label: "Open your candidates", to: "candidates" }, { label: "Import people from a file", to: "import" }],
  },
  candidates: {
    help: "Candidates gathers everyone across your roles in one place, with their score and stage.",
    cta: { label: "Import more people", to: "import" },
    sug: [{ label: "Import more people", to: "import" }, { label: "See your jobs", to: "jobs" }, { label: "Today's interviews", to: "interviews" }],
  },
  interviews: {
    help: "Interviews keeps today in view. The interview kit builds the questions and a scorecard for each one.",
    cta: { label: "See all candidates", to: "candidates" },
    sug: [{ label: "See all candidates", to: "candidates" }, { label: "Back to jobs", to: "jobs" }, { label: "Post a role", to: "post" }],
  },
  import: {
    help: "Import brings your own candidates in from a file or pasted emails, then scores them against a role.",
    cta: { label: "See imported candidates", to: "candidates" },
    sug: [{ label: "See imported candidates", to: "candidates" }, { label: "Back to jobs", to: "jobs" }, { label: "Post a role", to: "post" }],
  },
  post: {
    help: "Post a job walks you through five calm steps. Fab can help once the title is set.",
    cta: { label: "See your jobs", to: "jobs" },
    sug: [{ label: "See your jobs", to: "jobs" }, { label: "Import instead", to: "import" }, { label: "Compare plans", to: "plans" }],
  },
  plans: {
    help: "Free covers one live job and a keyword score. Foundation unlocks full AI evaluation and up to three roles.",
    cta: { label: "Post a job", to: "post" },
    sug: [{ label: "Post a job", to: "post" }, { label: "Import candidates", to: "import" }, { label: "Send feedback", action: "feedback" }],
  },
};

const SECTION_TITLE = { jobs: "Jobs", candidates: "Candidates", interviews: "Interviews", import: "Import", post: "Post a job", plans: "Plans" };

// Tour: four steps, each spotlighting a real rail item (spot === a rail key,
// or null for the centered intro). Anchored to live elements at render time.
const TOUR = [
  { step: "Step 1 of 4", title: "Welcome to your hiring portal", body: "I run a quick tour and step in when a section needs explaining. No chat, just a guide.", spot: null },
  { step: "Step 2 of 4", title: "Jobs is your home base", body: "Every open role and its pipeline lives here. Most of your day starts on this screen.", spot: "jobs" },
  { step: "Step 3 of 4", title: "Post a role in a guided flow", body: "Five calm steps to a live job. Fab nudges you if a step gets tricky.", spot: "post" },
  { step: "Step 4 of 4", title: "Your people and your day", body: "Candidates holds your pipeline. Interviews keeps today and the interview kit in one place.", spot: "candidates" },
];

// Command launcher content. Actions navigate a real route or open feedback;
// help topics open a calm explanation with a jump to the real surface.
const ACTIONS = [
  { label: "Post a job", hint: "Open the guided flow", to: "post" },
  { label: "Import candidates", hint: "From a file or email", to: "import" },
  { label: "Review new applicants", hint: "Open your pipeline", to: "candidates" },
  { label: "Open the interview kit", hint: "Today's interviews", to: "interviews" },
  { label: "See plans and Foundation", hint: "Pricing and tiers", to: "plans" },
  { label: "Take the tour", hint: "A quick guided walkthrough", action: "tour" },
  { label: "Send feedback", hint: "Share an idea or a bug", action: "feedback" },
];
const HELP_TOPICS = [
  { label: "How AI evaluation works", hint: "Scoring and verdicts", body: "Applicants are scored against your job description. Free plans see a keyword score. Foundation unlocks full AI evaluation.", cta: { label: "See plans", to: "plans" } },
  { label: "What the interview kit does", hint: "Questions and scorecard", body: "The interview kit builds tailored questions and a scorecard for each interview, so every conversation stays consistent.", cta: { label: "Open interviews", to: "interviews" } },
  { label: "Free and Foundation tiers", hint: "What each unlocks", body: "Free covers one live job and a keyword score. Foundation unlocks full AI evaluation and up to three roles.", cta: { label: "Compare tiers", to: "plans" } },
];

const HOW_IT_WORKS = [
  ["Jobs", "your open roles and their pipelines"],
  ["Candidates", "everyone in your pipeline in one place"],
  ["Interviews", "today's agenda and the interview kit"],
  ["Import", "bring people in from a file or email"],
  ["Post a job", "a guided flow in five calm steps"],
  ["Plans", "what each tier includes"],
];

function SparkIcon({ size = 18 }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="var(--pj-primary)" aria-hidden="true"><path d="M12 2.5l1.9 5.1a3 3 0 0 0 1.8 1.8L20.8 11l-5.1 1.9a3 3 0 0 0-1.8 1.8L12 19.8l-1.9-5.1a3 3 0 0 0-1.8-1.8L3.2 11l5.1-1.9a3 3 0 0 0 1.8-1.8z" /></svg>;
}
function SearchIcon() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--pj-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>;
}
function ChevronIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--pj-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6" /></svg>;
}
function CloseIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>;
}

export default function FabAssistant() {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const location = useLocation();
  const section = sectionForPath(location.pathname);

  const [mode, setMode] = useState("idle"); // idle|welcome|tour|help|launcher|panel|complete
  const [tourStep, setTourStep] = useState(0);
  const [query, setQuery] = useState("");
  const [help, setHelp] = useState(null); // { title, body, cta } for the help card
  const [fbOpen, setFbOpen] = useState(false);
  const [hasHint, setHasHint] = useState(false);
  const [anchor, setAnchor] = useState(null); // live rect of the spotlighted rail item

  const searchRef = useRef(null);
  const idleRef = useRef(null);

  // ---- First run: new user (no jobs) and not dismissed → offer the welcome.
  useEffect(() => {
    let live = true;
    let seen = false;
    try { seen = window.localStorage?.getItem(SEEN_KEY) === "1"; } catch { /* ignore */ }
    if (seen) return undefined;
    (async () => {
      try {
        const { data: { user } = {} } = await supabase.auth.getUser();
        if (!live || !user?.id) return;
        const { count, error } = await supabase
          .from("jobs")
          .select("id", { count: "exact", head: true })
          .eq("hr_id", user.id)
          .eq("source", "hr_portal");
        if (!live || error) return;
        if ((count || 0) === 0) {
          setHasHint(true);
          const t = setTimeout(() => { if (live) setMode((m) => (m === "idle" ? "welcome" : m)); }, 1100);
          return () => clearTimeout(t);
        }
      } catch { /* offline: stay quiet */ }
    })();
    return () => { live = false; };
  }, []);

  const markSeen = useCallback(() => {
    try { window.localStorage?.setItem(SEEN_KEY, "1"); } catch { /* ignore */ }
    setHasHint(false);
  }, []);

  // ---- Navigation / actions. Every CTA runs through here → real route or
  // the real feedback modal. Nothing is a dead button.
  const openFeedback = useCallback(() => {
    setMode("idle");
    setQuery("");
    setHasHint(false);
    setFbOpen(true);
  }, []);

  const go = useCallback((target) => {
    if (!target) return;
    if (target.action === "feedback") { openFeedback(); return; }
    if (target.action === "tour") { setTourStep(0); setHasHint(false); setMode("tour"); return; }
    const key = target.to || target;
    const route = ROUTES[key] || key;
    setMode("idle");
    setQuery("");
    setHasHint(false);
    navigate(route);
  }, [navigate, openFeedback]);

  const goIdle = useCallback(() => { setMode("idle"); setQuery(""); }, []);
  const openLauncher = useCallback(() => { setMode("launcher"); setQuery(""); }, []);
  const startTour = useCallback(() => { setTourStep(0); setMode("tour"); setHasHint(false); }, []);
  const showHelpFor = useCallback((content) => { setHelp(content); setMode("help"); }, []);

  const toggleOrb = useCallback(() => {
    setMode((m) => (m === "panel" ? "idle" : "panel"));
    setHasHint(false);
  }, []);

  // ---- Command K opens the launcher anywhere; Escape closes overlays.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setMode((m) => (m === "launcher" ? "idle" : "launcher"));
        setQuery("");
        return;
      }
      if (e.key === "Escape" && mode !== "idle") {
        e.stopPropagation();
        goIdle();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [mode, goIdle]);

  // Focus the launcher input when it opens.
  useEffect(() => {
    if (mode !== "launcher") return;
    const t = setTimeout(() => searchRef.current?.focus(), 40);
    return () => clearTimeout(t);
  }, [mode]);

  // ---- Long idle → a calm, dismissible hint on the orb (never a wall).
  useEffect(() => {
    if (mode !== "idle") return undefined;
    const reset = () => {
      clearTimeout(idleRef.current);
      idleRef.current = setTimeout(() => setHasHint(true), IDLE_MS);
    };
    reset();
    const evs = ["pointerdown", "keydown"];
    evs.forEach((ev) => window.addEventListener(ev, reset, { passive: true }));
    return () => {
      clearTimeout(idleRef.current);
      evs.forEach((ev) => window.removeEventListener(ev, reset));
    };
  }, [mode]);

  // ---- Anchor the tour/help spotlight to the LIVE rail item, tracking
  // resize and scroll so it never drifts to a fixed offset.
  const spotKey = mode === "tour" ? TOUR[tourStep]?.spot : (mode === "help" ? section : null);
  useLayoutEffect(() => {
    if (!spotKey) { setAnchor(null); return undefined; }
    const measure = () => {
      const el = document.querySelector(`[data-fab-key="${spotKey}"]`);
      setAnchor(el ? el.getBoundingClientRect() : null);
    };
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [spotKey, tourStep, mode]);

  const isDesktop = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(min-width: 720px)").matches;

  // Orb shows in idle/panel/help/complete — but never while the feedback
  // panel is open (they share the bottom-right corner and would overlap).
  // On mobile the main panel is a full bottom sheet, so the orb hides behind
  // it (the header X is the close control) rather than poking over its corner.
  const showOrb = !fbOpen && (mode === "idle" || mode === "help" || mode === "complete" || (mode === "panel" && isDesktop));

  // Place a corner/anchored card near the live rail item. Desktop: to the
  // right of the left rail, tracking the live element. Mobile: return no
  // inline position so the safe-area sheet geometry in fab.css owns it (the
  // tour is a bottom sheet, help a top sheet — never a fixed desktop width).
  const anchoredStyle = () => {
    if (!isDesktop) return undefined;
    if (!anchor) return { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
    const top = Math.min(Math.max(anchor.top - 6, 12), (typeof window !== "undefined" ? window.innerHeight : 800) - 220);
    return { left: `${anchor.right + 16}px`, top: `${top}px` };
  };

  const q = query.toLowerCase().trim();
  const match = (it) => !q || it.label.toLowerCase().includes(q) || it.hint.toLowerCase().includes(q);
  const actionsF = ACTIONS.filter(match);
  const helpF = HELP_TOPICS.filter(match);

  const tour = TOUR[tourStep] || TOUR[0];
  const isLast = tourStep >= TOUR.length - 1;

  return createPortal(
    <div className="fab-root" data-rm={reduce ? "on" : "off"}>
      {/* ── Spotlight (tour + anchored help): a scrim with a hole over the
           live rail item, revealing it un-dimmed with a violet ring. ── */}
      {(mode === "tour" || (mode === "help" && anchor)) && anchor && (
        <div
          className="fab-spot"
          style={{ left: `${anchor.left - 6}px`, top: `${anchor.top - 6}px`, width: `${anchor.width + 12}px`, height: `${anchor.height + 12}px` }}
          aria-hidden="true"
        />
      )}
      {/* Intro tour step (no spotlight) and welcome use a full scrim. */}
      {(mode === "welcome" || (mode === "tour" && !anchor)) && <div className="fab-scrim" onClick={mode === "welcome" ? goIdle : undefined} aria-hidden="true" />}

      {/* ── Welcome ── */}
      {mode === "welcome" && (
        <div className="fab-card fab-welcome rm" role="dialog" aria-label="Welcome to your hiring portal">
          <div className="fab-glow" aria-hidden="true" />
          <div className="fab-welcome__in">
            <span className="fab-badge" aria-hidden="true"><SparkIcon size={26} /></span>
            <h3>Welcome to your hiring portal</h3>
            <p>I am Fab, your guide. I can show you around in about a minute, or you can dive in and call me whenever you need a hand.</p>
            <div className="fab-row">
              <button type="button" className="fab-btn fab-btn--primary" onClick={() => { markSeen(); startTour(); }}>Take the tour</button>
              <button type="button" className="fab-btn fab-btn--ghost" onClick={() => { markSeen(); goIdle(); }}>Explore on my own</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Tour coach ── */}
      {mode === "tour" && (
        <div className="fab-card fab-coach rm" style={anchoredStyle()} role="dialog" aria-label={tour.title}>
          <div className="fab-glow" aria-hidden="true" />
          <div className="fab-coach__in">
            <div className="fab-coach__head">
              <span className="fab-step">{tour.step}</span>
              <button type="button" className="fab-skip" onClick={() => { markSeen(); goIdle(); }}>Skip</button>
            </div>
            <p className="fab-coach__title">{tour.title}</p>
            <p className="fab-coach__body">{tour.body}</p>
            <div className="fab-coach__foot">
              <div className="fab-dots">
                {TOUR.map((_, i) => <span key={i} className={`fab-dot${i === tourStep ? " fab-dot--on" : ""}`} />)}
              </div>
              <div className="fab-row fab-row--tight">
                {tourStep > 0 && <button type="button" className="fab-btn fab-btn--ghost fab-btn--sm" onClick={() => setTourStep((s) => Math.max(0, s - 1))}>Back</button>}
                <button
                  type="button"
                  className="fab-btn fab-btn--primary fab-btn--sm"
                  onClick={() => { if (isLast) { markSeen(); setMode("complete"); } else { setTourStep((s) => s + 1); } }}
                >
                  {isLast ? "Done" : "Next"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Contextual help card ── */}
      {mode === "help" && help && (
        <div className="fab-card fab-help rm" style={anchoredStyle()} role="dialog" aria-label="Fab help">
          <div className="fab-glow" aria-hidden="true" />
          <div className="fab-help__in">
            <div className="fab-help__head">
              <span className="fab-mini" aria-hidden="true"><SparkIcon size={14} /></span>
              <span className="fab-mini__name">Fab</span>
            </div>
            {help.title && <p className="fab-help__title">{help.title}</p>}
            <p className="fab-help__body">{help.body}</p>
            <div className="fab-row fab-row--tight">
              {help.cta && <button type="button" className="fab-btn fab-btn--primary fab-btn--sm" onClick={() => go(help.cta)}>{help.cta.label}</button>}
              <button type="button" className="fab-btn fab-btn--ghost fab-btn--sm" onClick={goIdle}>Got it</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Command launcher ── */}
      {mode === "launcher" && (
        <>
          <div className="fab-scrim fab-scrim--launcher" onClick={goIdle} aria-hidden="true" />
          <div className="fab-card fab-launcher rm" role="dialog" aria-label="Search actions and help">
            <div className="fab-glow" aria-hidden="true" />
            <div className="fab-launcher__in">
              <div className="fab-launcher__search">
                <SearchIcon />
                <input
                  ref={searchRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Type to find an action or a help topic"
                  aria-label="Type to find an action or a help topic"
                />
                <span className="fab-kbd">esc</span>
              </div>
              <div className="fab-launcher__list">
                {actionsF.length > 0 && <p className="fab-grouplabel">Actions</p>}
                {actionsF.map((a) => (
                  <button key={a.label} type="button" className="fab-cmd" onClick={() => go(a)}>
                    <span className="fab-cmd__icon fab-cmd__icon--action" aria-hidden="true"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2L3 14h9l-1 8 10-12h-9z" /></svg></span>
                    <span className="fab-cmd__text"><span className="fab-cmd__label">{a.label}</span><span className="fab-cmd__hint">{a.hint}</span></span>
                    <ChevronIcon />
                  </button>
                ))}
                {helpF.length > 0 && <p className="fab-grouplabel">Help topics</p>}
                {helpF.map((h) => (
                  <button key={h.label} type="button" className="fab-cmd" onClick={() => showHelpFor({ title: h.label, body: h.body, cta: h.cta })}>
                    <span className="fab-cmd__icon fab-cmd__icon--help" aria-hidden="true"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg></span>
                    <span className="fab-cmd__text"><span className="fab-cmd__label">{h.label}</span><span className="fab-cmd__hint">{h.hint}</span></span>
                    <ChevronIcon />
                  </button>
                ))}
                {actionsF.length === 0 && helpF.length === 0 && (
                  <p className="fab-launcher__empty">Nothing matches that. Try a section name like jobs or plans.</p>
                )}
              </div>
              <div className="fab-launcher__foot">Type to find, then jump. Fab is a guide, not a chat.</div>
            </div>
          </div>
        </>
      )}

      {/* ── Panel ── */}
      {mode === "panel" && (
        <div className="fab-card fab-panel rm" role="dialog" aria-label="Fab, your guide">
          <div className="fab-glow" aria-hidden="true" />
          <div className="fab-panel__head">
            <span className="fab-mini" aria-hidden="true"><SparkIcon size={18} /></span>
            <div className="fab-panel__id">
              <p className="fab-panel__name">Fab</p>
              <p className="fab-panel__role"><span className="fab-livedot rm" aria-hidden="true" /> your guide</p>
            </div>
            <button type="button" className="fab-iconbtn" onClick={goIdle} aria-label="Close Fab"><CloseIcon /></button>
          </div>
          <div className="fab-panel__body">
            <p className="fab-panel__ctx">On this screen: {SECTION_TITLE[section]}</p>
            <p className="fab-panel__sub">Jump to what you need next.</p>
            <button type="button" className="fab-tourlink" onClick={startTour}>
              <SparkIcon size={14} />
              <span>Take a quick tour</span>
              <ChevronIcon />
            </button>
            <div className="fab-suggests">
              {SECTION[section].sug.map((s) => (
                <button key={s.label} type="button" className="fab-suggest" onClick={() => go(s)}>
                  <span className="fab-suggest__dot" aria-hidden="true" />
                  <span className="fab-suggest__label">{s.label}</span>
                  <ChevronIcon />
                </button>
              ))}
            </div>
            <p className="fab-grouplabel fab-grouplabel--flush">How the portal works</p>
            <div className="fab-how">
              {HOW_IT_WORKS.map(([k, v]) => (
                <p key={k} className="fab-how__row"><b>{k}</b> {v}</p>
              ))}
            </div>
          </div>
          <div className="fab-panel__foot">
            <button type="button" className="fab-footbtn" onClick={openLauncher}>
              <SearchIcon />
              <span>Search actions and help</span>
              <span className="fab-kbd">⌘K</span>
            </button>
            <button type="button" className="fab-footbtn fab-footbtn--feedback" onClick={openFeedback}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--pj-muted)" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.6-.8L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 17 0z" /></svg>
              <span>Send feedback</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Completion ── */}
      {mode === "complete" && (
        <div className="fab-card fab-complete rm" role="dialog" aria-label="You are set">
          <div className="fab-glow" aria-hidden="true" />
          <div className="fab-complete__in">
            <div className="fab-complete__head">
              <span className="fab-check" aria-hidden="true"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg></span>
              <p className="fab-complete__title">You are set</p>
            </div>
            <p className="fab-complete__body">I am here in the corner whenever you need a hand. Press the orb, or open search to jump anywhere in the portal.</p>
            <div className="fab-row fab-row--tight">
              <button type="button" className="fab-btn fab-btn--primary fab-btn--grow" onClick={openLauncher}>Open search</button>
              <button type="button" className="fab-btn fab-btn--ghost fab-btn--sm" onClick={goIdle}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* ── The orb (idle / panel / help / complete) ── */}
      {showOrb && (
        <button type="button" className="fab-orb rm" onClick={toggleOrb} aria-label="Open Fab, the portal guide">
          <span className="fab-orb__halo rm" aria-hidden="true" />
          <SparkIcon size={26} />
          {hasHint && <span className="fab-orb__pulse rm" aria-hidden="true" />}
        </button>
      )}

      {/* Feedback, reused verbatim in controlled mode (affordance hidden). */}
      <PortalFeedback hideAffordance controlledOpen={fbOpen} onControlledClose={() => setFbOpen(false)} />
    </div>,
    document.body,
  );
}
