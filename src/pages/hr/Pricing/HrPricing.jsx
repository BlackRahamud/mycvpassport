// =============================================================
// src/pages/hr/Pricing/HrPricing.jsx
//
// The pricing page as a product led journey (Pricing Canvas 1a/1b).
// Route unchanged, /employer/pricing, inside HrShell. Replaces the
// boxed plan card: the page walks the hiring journey top to bottom
// and attaches a token faithful static glimpse of the real portal UI
// to each value. The plan and CTA are a calm anchor at the bottom;
// the talent team is one quiet line under it, never a tier.
//
// The glimpses are deliberate static recreations in the portal's own
// token language (styling references: InterviewsToday / InterviewsPage
// rows, ScoreRing, VerdictCard pills, the pipeline stage cards, the
// float companion) — never a live embed of the real components.
//
// One interaction, the get started sheet: "Post your first job"
// expands the sheet out of the tapped button (open from origin,
// Motion principles.md) and collapses back on close. Options: post a
// job, import CVs, or the human path on WhatsApp. Sales contact stays
// the single HR_SALES config in paywall.js.
//
// Motion 2a: scroll reveals per section (350ms rise, 40ms stagger in
// the hero), hover 150ms, press 100ms. Reduced motion collapses every
// move to instant or a plain fade.
// =============================================================

import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, useReducedMotion } from "framer-motion";
import { HR_SALES } from "../../../utils/paywall";
import { useFoundationPrice } from "../../../lib/employer/useFoundationPrice";
import FoundationUpgradeSheet from "../../../components/hr/FoundationUpgradeSheet";
import { supabase } from "../../../appSupabaseClient";
import "../../../components/hr/surfaceGlass.css";
import "../PostJob/postJob.css"; // --pj-* tokens + pj-btn
import "./hrPricing.css";

const EASE = [0.4, 0, 0.2, 1];
const EASE_CSS = "cubic-bezier(0.4, 0, 0.2, 1)";

const WA_TEXT = "Hi, I'm interested in CVPassport for hiring. Can you share pricing for our team?";
const WA_TALENT_TEXT = "Hi, I'd like hands on help from the CVPassport talent team with sourcing and screening.";
const MAIL_SUBJECT = "CVPassport pricing request";
const MAIL_BODY = "Hi, I'd like to learn about CVPassport pricing for our hiring team.";

const waHref = `https://wa.me/${HR_SALES.whatsapp}?text=${encodeURIComponent(WA_TEXT)}`;
const waTalentHref = `https://wa.me/${HR_SALES.whatsapp}?text=${encodeURIComponent(WA_TALENT_TEXT)}`;
const mailHref = `mailto:${HR_SALES.email}?subject=${encodeURIComponent(MAIL_SUBJECT)}&body=${encodeURIComponent(MAIL_BODY)}`;

/* Cluster copy — feature and process claims only, sentence case, and
   never "CRM": the database is one shared candidate history. */
const CLUSTERS = [
  {
    num: "01",
    label: "Post and source",
    head: "Get roles live and every CV turned into a profile for you.",
    points: [
      "Unlimited job posts",
      "Bulk CV import, we read every CV and build the candidate profiles for you",
      "Global talent pools for CVs not tied to a job yet",
    ],
  },
  {
    num: "02",
    label: "Screen and rank",
    head: "See who fits before you spend a minute reading.",
    points: [
      "Match scoring on every applicant, strong, maybe or weak",
      "AI evaluations with a clear verdict and the reasons behind it",
      "One shared candidate history across every job",
    ],
  },
  {
    num: "03",
    label: "Interview",
    badge: "the part no one else has",
    head: "The interview, handled from invite to decision.",
    points: [
      "One tap scheduling with dual timezone invites for India and the Gulf",
      "Interview questions written from each candidate's own CV, with what a good answer sounds like",
      "A live companion that floats over your call",
      "Scorecards that move the candidate along by themselves",
      "Compare the people you interviewed this week, side by side",
    ],
  },
  {
    num: "04",
    label: "Reach out and decide",
    head: "Talk to candidates and move them forward, all in one place.",
    points: [
      "Prefilled WhatsApp and email outreach",
      "A visual pipeline with stage tracking on every job",
      "Hiring insights and analytics",
    ],
  },
];

/* ── icons ── */
const CheckIc = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const ArrowIc = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);
const ChevronIc = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m9 6 6 6-6 6" />
  </svg>
);
const CloseIc = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 6 6 18M6 6l12 12" />
  </svg>
);
const PlusIc = () => (
  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
);
const UploadIc = ({ size = 19 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5-5 5 5M12 5v12" />
  </svg>
);
const WaIc = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-.607z" />
  </svg>
);

/* Open from origin (Motion principles.md): the sheet expands out of
   the tapped button, reversed on close. Same WAAPI pattern as the
   Interviews tab; reduced motion gets a plain fade. */
function playOpenFromOrigin(el, origin, reduce) {
  if (!el || typeof el.animate !== "function") return;
  if (reduce || !origin) {
    el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 150, easing: "ease-out" });
    return;
  }
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return;
  const dx = origin.left + origin.width / 2 - (r.left + r.width / 2);
  const dy = origin.top + origin.height / 2 - (r.top + r.height / 2);
  const sx = Math.max(origin.width / r.width, 0.05);
  const sy = Math.max(origin.height / r.height, 0.05);
  el.animate([
    { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, opacity: 0.3 },
    { transform: "none", opacity: 1 },
  ], { duration: 350, easing: EASE_CSS });
}

/* ── Static glimpses, token faithful recreations of the real UI ── */

function AgendaGlimpse() {
  return (
    <div className="hpx-glimpse">
      <span className="hpx-live-chip">
        <span className="hpx-live-chip__dot" aria-hidden="true" />
        Live now
      </span>
      <div className="hpx-card" aria-hidden="true">
        <div className="hpx-kicker">Today, 2 interviews</div>
        <div className="hpx-agenda-row hpx-agenda-row--live">
          <span className="hpx-avatar hpx-avatar--green">FK</span>
          <div className="hpx-agenda-row__who">
            <div className="hpx-name">Faisal Khan</div>
            <div className="hpx-sub">IT Support Analyst L2</div>
          </div>
          <div className="hpx-agenda-row__time">
            <div className="hpx-t1">2:00 PM <span>Dubai</span></div>
            <div className="hpx-t2">3:30 PM India</div>
          </div>
          <span className="hpx-chip-btn hpx-chip-btn--primary">Start</span>
        </div>
        <div className="hpx-agenda-row">
          <span className="hpx-avatar hpx-avatar--purple">DN</span>
          <div className="hpx-agenda-row__who">
            <div className="hpx-name">Divya Nair</div>
            <div className="hpx-sub">Cashier</div>
          </div>
          <div className="hpx-agenda-row__time">
            <div className="hpx-t1">5:00 PM <span>Dubai</span></div>
            <div className="hpx-t2">6:30 PM India</div>
          </div>
          <span className="hpx-chip-btn hpx-chip-btn--ghost">Start</span>
        </div>
      </div>
    </div>
  );
}

function ImportGlimpse() {
  return (
    <div className="hpx-card" aria-hidden="true">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="hpx-kicker">Bulk CV import</span>
        <span className="hpx-import__meter">28 of 30 read</span>
      </div>
      <div className="hpx-drop">
        <span className="hpx-drop__ic"><UploadIc size={18} /></span>
        <div style={{ minWidth: 0 }}>
          <div className="hpx-drop__title">Drop a folder of CVs</div>
          <div className="hpx-sub">We read each one and build the profile.</div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        <div className="hpx-read-row">
          <span className="hpx-read-row__mini">RM</span>
          <div className="hpx-read-row__body">
            <div className="hpx-read-row__name">Rohan Mehta</div>
            <div className="hpx-bar hpx-bar--done"><span /></div>
          </div>
          <span className="hpx-read-row__state hpx-read-row__state--done">Profile ready</span>
        </div>
        <div className="hpx-read-row">
          <span className="hpx-read-row__mini">AK</span>
          <div className="hpx-read-row__body">
            <div className="hpx-read-row__name">Aisha Khan</div>
            <div className="hpx-bar hpx-bar--reading"><span /></div>
          </div>
          <span className="hpx-read-row__state hpx-read-row__state--reading">Reading</span>
        </div>
      </div>
    </div>
  );
}

function ScoreGlimpse() {
  const circ = 2 * Math.PI * 32;
  return (
    <div className="hpx-card" style={{ padding: 20, gap: 16 }} aria-hidden="true">
      <div className="hpx-score">
        <div className="hpx-ring">
          <svg width="78" height="78" viewBox="0 0 78 78" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="39" cy="39" r="32" fill="none" stroke="var(--hpx-input)" strokeWidth="8" />
            <circle cx="39" cy="39" r="32" fill="none" stroke="var(--hpx-success)" strokeWidth="8" strokeLinecap="round" strokeDasharray={`${(circ * 0.86).toFixed(0)} ${circ.toFixed(0)}`} />
          </svg>
          <div className="hpx-ring__num">86</div>
        </div>
        <div style={{ minWidth: 0 }}>
          <span className="hpx-verdict-pill"><CheckIc size={11} />Strong match</span>
          <div className="hpx-name" style={{ fontSize: 15, marginTop: 8 }}>Rohan Mehta</div>
          <div className="hpx-sub" style={{ fontSize: 12.5 }}>IT Support Analyst L2</div>
        </div>
      </div>
      <div className="hpx-why">
        <div className="hpx-kicker" style={{ fontSize: 11 }}>Why</div>
        <div className="hpx-why__line">7 years on service desk in Dubai, ITIL certified, and a clean visa and notice window for the role.</div>
      </div>
      <div className="hpx-bands">
        <span className="hpx-band hpx-band--strong">Strong 12</span>
        <span className="hpx-band hpx-band--maybe">Maybe 9</span>
        <span className="hpx-band hpx-band--weak">Weak 7</span>
      </div>
    </div>
  );
}

function CompanionGlimpse() {
  return (
    <div className="hpx-call" aria-hidden="true">
      <div className="hpx-call__peer">
        <span className="hpx-call__avatar">FK</span>
      </div>
      <div className="hpx-call__label">Your call</div>
      <div className="hpx-companion">
        <div className="hpx-companion__head">
          <span className="hpx-companion__title">Companion</span>
          <span className="hpx-companion__meter">1 of 3</span>
        </div>
        <div className="hpx-q">
          <span className="hpx-q__chip">Technical</span>
          <div className="hpx-q__text">Walk me through how you would handle a user who cannot connect to the office VPN.</div>
        </div>
        <div className="hpx-companion__foot">
          <span className="hpx-companion__listen">Good answer, checks basics first</span>
          <span className="hpx-companion__asked">Mark asked</span>
        </div>
      </div>
    </div>
  );
}

function PipelineGlimpse() {
  return (
    <div className="hpx-card" aria-hidden="true">
      <div className="hpx-kicker" style={{ marginBottom: 1 }}>Pipeline, IT Support Analyst L2</div>
      <div className="hpx-pipe">
        <div className="hpx-pipe__col">
          <div className="hpx-pipe__head">Screening<span>6</span></div>
          <div className="hpx-pipe__card">Aisha K.</div>
          <div className="hpx-pipe__card">Sanjay P.</div>
        </div>
        <div className="hpx-pipe__col">
          <div className="hpx-pipe__head">Interview<span>3</span></div>
          <div className="hpx-pipe__card hpx-pipe__card--active">Faisal K.</div>
          <div className="hpx-pipe__card">Divya N.</div>
        </div>
        <div className="hpx-pipe__col">
          <div className="hpx-pipe__head">Offer<span>1</span></div>
          <div className="hpx-pipe__card hpx-pipe__card--offer">Rohan M.</div>
        </div>
      </div>
      <div className="hpx-wa-row">
        <span style={{ color: "var(--hpx-wa)", display: "inline-flex" }}><WaIc size={18} /></span>
        <span>Prefilled, ready to send to Faisal on WhatsApp.</span>
      </div>
    </div>
  );
}

export default function HrPricing() {
  const reduce = useReducedMotion();
  const navigate = useNavigate();

  const [sheet, setSheet] = useState(false);
  const sheetOriginRef = useRef(null);
  const sheetElRef = useRef(null);
  const sheetClosingRef = useRef(false);

  // One currency per visitor, by IP. Held until resolved so the price
  // never renders in the wrong currency and then swaps.
  const price = useFoundationPrice();
  const [checkoutError, setCheckoutError] = useState(null);
  const [upgrade, setUpgrade] = useState(false);
  const [viewer, setViewer] = useState(null);

  // Who is looking. A signed-in recruiter can buy; a prospect can only
  // start a trial, because there is nothing to attach a purchase to yet.
  useEffect(() => {
    let live = true;
    supabase.auth.getUser()
      .then(({ data }) => { if (live) setViewer(data?.user || null); })
      .catch(() => { if (live) setViewer(null); });
    return () => { live = false; };
  }, []);

  /**
   * Start 30 day free trial.
   *
   * The trial is NOT created here. Migration 046 seeds it server side
   * from a trigger on hr_profiles insert, so signing up IS starting the
   * trial and there is no way to end up signed up without one. A
   * recruiter who already has an account goes straight to the portal.
   */
  const startTrial = async () => {
    setCheckoutError(null);
    try {
      const { data } = await supabase.auth.getUser();
      const uid = data?.user?.id;
      if (!uid) { navigate("/employer/signup"); return; }
      const { data: hp } = await supabase
        .from("hr_profiles").select("user_id").eq("user_id", uid).maybeSingle();
      navigate(hp ? "/employer/jobs" : "/employer/onboarding");
    } catch {
      navigate("/employer/signup");
    }
  };

  const openSheet = (e) => {
    sheetOriginRef.current = e?.currentTarget?.getBoundingClientRect?.() || null;
    sheetClosingRef.current = false;
    setSheet(true);
  };

  useEffect(() => {
    if (!sheet) return;
    playOpenFromOrigin(sheetElRef.current, sheetOriginRef.current, reduce);
  }, [sheet, reduce]);

  const closeSheet = (after) => {
    if (sheetClosingRef.current) return;
    const el = sheetElRef.current;
    const done = () => { setSheet(false); if (after) after(); };
    if (!el || typeof el.animate !== "function") { done(); return; }
    sheetClosingRef.current = true;
    el.style.pointerEvents = "none";
    const scrim = el.parentElement;
    if (scrim) scrim.style.pointerEvents = "none";
    const o = sheetOriginRef.current;
    let anim;
    if (reduce || !o) {
      anim = el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 150, easing: "ease-out", fill: "forwards" });
    } else {
      const r = el.getBoundingClientRect();
      const dx = o.left + o.width / 2 - (r.left + r.width / 2);
      const dy = o.top + o.height / 2 - (r.top + r.height / 2);
      anim = el.animate([
        { transform: "none", opacity: 1 },
        {
          transform: `translate(${dx}px, ${dy}px) scale(${Math.max(o.width / r.width, 0.05)}, ${Math.max(o.height / r.height, 0.05)})`,
          opacity: 0.2,
        },
      ], { duration: 350, easing: EASE_CSS, fill: "forwards" });
    }
    if (scrim && typeof scrim.animate === "function") {
      scrim.animate([{ opacity: 1 }, { opacity: 0 }], { duration: reduce ? 150 : 300, easing: "ease-out", fill: "forwards" });
    }
    anim.onfinish = done;
    anim.oncancel = done;
  };

  /* Sheet keyboard contract: Escape closes, Tab stays inside, focus
     lands on the first option (the schedule modal's contract). */
  useEffect(() => {
    if (!sheet) return undefined;
    const prior = document.activeElement;
    const focusables = () => Array.from(
      sheetElRef.current?.querySelectorAll("button, [href], [tabindex]:not([tabindex='-1'])") || [],
    ).filter((el) => !el.disabled && el.getClientRects().length > 0);
    const t = setTimeout(() => { focusables()[0]?.focus(); }, 0);
    const onKey = (e) => {
      if (e.key === "Escape") { e.stopPropagation(); closeSheet(); return; }
      if (e.key !== "Tab") return;
      const list = focusables();
      if (!list.length) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (!sheetElRef.current?.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      if (prior && typeof prior.focus === "function") prior.focus();
    };
    // closeSheet is stable enough for this dialog's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheet]);

  /* Scroll reveal, Motion 2a: each section rises once as it enters. */
  const reveal = (delay = 0) => ({
    initial: reduce ? false : { opacity: 0, y: 14 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.14 },
    transition: { duration: 0.35, ease: EASE, delay: reduce ? 0 : delay },
  });

  const glimpses = [<ImportGlimpse key="g1" />, <ScoreGlimpse key="g2" />, <CompanionGlimpse key="g3" />, <PipelineGlimpse key="g4" />];

  return (
    <div className="hpx-root">
      <Helmet><title>Plans · CVPassport</title></Helmet>

      {/* Sticky glass header */}
      <header className="hpx-head">
        {/* pj-wordmark: the shell hides this on desktop where the rail
            already carries the brand; mobile keeps it (house rule). */}
        <span className="hpx-head__brand pj-wordmark">CVPassport<span> for employers</span></span>
        <a className="hpx-head__talk" href={waHref} target="_blank" rel="noreferrer noopener">Talk to us</a>
      </header>

      <main className="hpx-main">
        {/* ── Hero ── */}
        <section className="hpx-hero" aria-label="Plans">
          <div className="hpx-hero__copy">
            <motion.span className="hpx-eyebrow" {...reveal(0)}>Plans</motion.span>
            <motion.h1 className="hpx-h1" {...reveal(0.04)}>Your whole hiring, in one calm portal.</motion.h1>
            <motion.p className="hpx-lede" {...reveal(0.08)}>
              See the software do the work before you pay for it. Post, source, screen, interview,
              and decide, all in one place built for recruiting teams across the UAE, GCC, and India.
            </motion.p>
            <motion.div className="hpx-cta-row" {...reveal(0.12)}>
              <button type="button" className="pj-btn pj-btn--primary hpx-btn-lg" onClick={openSheet}>
                Post your first job <ArrowIc />
              </button>
              <span className="hpx-cta-note">Free to start, no card needed.</span>
            </motion.div>

            {/* Price affordance. The showcase below does the selling, but a
                visitor should not have to scroll the whole page to learn
                what it costs. One currency, theirs, decided by IP. Held
                until geo resolves so the number never flashes and swaps. */}
            <motion.a
              className="hpx-priceline"
              href="#foundation"
              onClick={(e) => { e.preventDefault(); document.getElementById("foundation")?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }); }}
              {...reveal(0.16)}
            >
              {price.resolved ? (
                <>
                  <span className="hpx-priceline__from">From <b>{price.amountLabel}</b> per month</span>
                  <span className="hpx-priceline__dot" aria-hidden="true" />
                  <span className="hpx-priceline__free">start free for 30 days</span>
                  <ChevronIc />
                </>
              ) : (
                <span className="hpx-priceline__from">Pricing</span>
              )}
            </motion.a>
          </div>
          <motion.div style={{ flex: "1 1 400px", minWidth: 300 }} {...reveal(0.16)}>
            <AgendaGlimpse />
          </motion.div>
        </section>

        {/* ── Journey intro ── */}
        <motion.section className="hpx-journey" {...reveal(0)}>
          <div className="hpx-journey__eyebrow">The whole journey</div>
          <h2 className="hpx-h2">Everything from a job post to a hire, in one flow.</h2>
        </motion.section>

        {/* ── Four clusters ── */}
        {CLUSTERS.map((c, i) => (
          <section className="hpx-cluster" key={c.num} aria-label={c.label}>
            <motion.div className="hpx-cluster__copy" {...reveal(0)} style={{ order: 0 }}>
              <div className="hpx-cluster__tag">
                <span className="hpx-cluster__num">{c.num}</span>
                <span className="hpx-cluster__label">{c.label}</span>
                {c.badge && <span className="hpx-cluster__badge">{c.badge}</span>}
              </div>
              <h3 className="hpx-h3">{c.head}</h3>
              <ul className="hpx-points">
                {c.points.map((p) => (
                  <li key={p}><span className="hpx-tick"><CheckIc /></span>{p}</li>
                ))}
              </ul>
            </motion.div>
            <motion.div style={{ flex: "1 1 380px", minWidth: 300 }} {...reveal(0.06)}>
              {glimpses[i]}
            </motion.div>
          </section>
        ))}

        {/* ── The close. The showcase above sells; this ends on a real
             price and a trial instead of talk to us. Scale is still a
             conversation, but it is now the column beside the price
             rather than the whole ending. ── */}
        <motion.section className="hpx-anchor" id="foundation" aria-label="Foundation plan" {...reveal(0)}>
          <span className="hpx-eyebrow" style={{ alignSelf: "center" }}>Plans</span>
          <h2 className="hpx-anchor__h2">One plan, priced for founding members.</h2>
          <p className="hpx-anchor__lede">
            Everything you need to hire well, at one honest price. Start free for 30 days,
            then keep going on Foundation whenever you are ready.
          </p>

          <div className="hpx-fnd">
            {/* Foundation card, focal */}
            <div className="hpx-fnd__card">
              <div className="hpx-fnd__top">
                <div>
                  <div className="hpx-fnd__name">Foundation</div>
                  <div className="hpx-fnd__sub">Everything to run your hiring</div>
                </div>
                <span className="hpx-fnd__rate"><span className="hpx-fnd__rate-dot" aria-hidden="true" />Founding member rate</span>
              </div>

              <div className="hpx-fnd__pricerow">
                {price.resolved ? (
                  <>
                    {price.anchorLabel && <s className="hpx-fnd__struck">{price.anchorLabel}</s>}
                    <span className="hpx-fnd__amount">{price.amountLabel}</span>
                  </>
                ) : (
                  <span className="hpx-fnd__amount hpx-fnd__amount--holding" aria-hidden="true">&nbsp;</span>
                )}
              </div>
              <div className="hpx-fnd__per">per month</div>
              <p className="hpx-fnd__region">
                {price.resolved
                  ? `Shown for ${price.regionName}, prices are set by your region and never converted.`
                  : "Loading the price for your region."}
              </p>

              <ul className="hpx-fnd__list">
                <li><span className="hpx-tick"><CheckIc /></span>Up to <b>3 active jobs</b></li>
                <li><span className="hpx-tick"><CheckIc /></span><b>Full candidate evaluation</b> on every applicant</li>
                <li><span className="hpx-tick"><CheckIc /></span>Employer analytics</li>
                <li><span className="hpx-tick"><CheckIc /></span>One recruiter login</li>
              </ul>

              <button
                type="button"
                className="pj-btn pj-btn--primary hpx-btn-lg hpx-fnd__cta"
                onClick={startTrial}
              >
                Start 30 day free trial <ArrowIc />
              </button>
              <p className="hpx-fnd__note">No card needed, and when your trial ends you keep a free account.</p>

              {/* Buy now, for a recruiter who already has an account. A
                  prospect sees only the trial; there is nothing to buy
                  before you have somewhere to put it. */}
              {viewer && (
                <button type="button" className="hpx-fnd__buy" onClick={() => setUpgrade(true)}>
                  Already have an account? Upgrade to Foundation
                </button>
              )}

              {checkoutError && <p className="hpx-fnd__err" role="alert">{checkoutError}</p>}
            </div>

            {/* Right column: scale, then the free account */}
            <div className="hpx-fnd__side">
              <div className="hpx-fnd__panel">
                <div className="hpx-fnd__panel-kicker">Hiring at scale</div>
                <p className="hpx-fnd__panel-body">
                  More recruiters, higher volume, or an agency running many roles.
                  We shape a plan around your team.
                </p>
                <a className="hpx-fnd__talk" href={waHref} target="_blank" rel="noreferrer noopener">
                  Talk to us <ArrowIc />
                </a>
                <p className="hpx-fnd__panel-mail">
                  Prefer email? <a href={mailHref}>{HR_SALES.email}</a>
                </p>
              </div>

              <div className="hpx-fnd__panel hpx-fnd__panel--quiet">
                <div className="hpx-fnd__panel-kicker">The free account, always</div>
                <p className="hpx-fnd__panel-body">
                  If you do not upgrade, you keep a permanent free account. One active job
                  and a basic candidate score, with no time limit. The trial simply shows
                  you the full picture first.
                </p>
              </div>
            </div>
          </div>

          <p className="hpx-talent">
            Want hands on help? The CVPassport talent team can source and screen candidates
            for you. <a href={waTalentHref} target="_blank" rel="noreferrer noopener">Talk to us.</a>
          </p>
        </motion.section>
      </main>

      <FoundationUpgradeSheet
        open={upgrade}
        onClose={() => setUpgrade(false)}
        user={viewer}
        heading="Upgrade to Foundation"
        blurb="Keep the full evaluation and up to 3 active jobs."
      />

      {/* ── The get started sheet, opens from origin ── */}
      {sheet && (
        <div className="hpx-scrim" role="dialog" aria-modal="true" aria-label="Start the way that suits you" onClick={() => closeSheet()}>
          <div className="hpx-sheet" ref={sheetElRef} onClick={(e) => e.stopPropagation()}>
            <div className="hpx-sheet__head">
              <div>
                <h3 className="hpx-sheet__title">Start the way that suits you</h3>
                <p className="hpx-sheet__sub">No card needed. You can switch paths any time.</p>
              </div>
              <button type="button" className="hpx-sheet__x" aria-label="Close" onClick={() => closeSheet()}>
                <CloseIc />
              </button>
            </div>
            <div className="hpx-sheet__opts">
              <button type="button" className="hpx-opt" onClick={() => closeSheet(() => navigate("/employer/post"))}>
                <span className="hpx-opt__ic"><PlusIc /></span>
                <span className="hpx-opt__body">
                  <span className="hpx-opt__title">Post a job now</span>
                  <span className="hpx-opt__sub">Publish a role and start receiving applicants.</span>
                </span>
                <span className="hpx-opt__arrow"><ChevronIc /></span>
              </button>
              <button type="button" className="hpx-opt" onClick={() => closeSheet(() => navigate("/employer/import"))}>
                <span className="hpx-opt__ic"><UploadIc /></span>
                <span className="hpx-opt__body">
                  <span className="hpx-opt__title">Import your CVs</span>
                  <span className="hpx-opt__sub">Drop a folder and we match them to your jobs.</span>
                </span>
                <span className="hpx-opt__arrow"><ChevronIc /></span>
              </button>
              <a className="hpx-opt" href={waHref} target="_blank" rel="noreferrer noopener" onClick={() => closeSheet()}>
                <span className="hpx-opt__ic"><WaIc size={19} /></span>
                <span className="hpx-opt__body">
                  <span className="hpx-opt__title">Talk to us first</span>
                  <span className="hpx-opt__sub">Ask anything on WhatsApp before you begin.</span>
                </span>
                <span className="hpx-opt__arrow"><ChevronIc /></span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
