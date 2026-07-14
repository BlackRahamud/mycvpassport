// =============================================================
// src/pages/hr/Interviews/InterviewsPage.jsx
//
// The Interviews tab — a time based agenda, never a second pipeline
// (Interviews Tab Canvas 1a to 1h). Route /employer/interviews, inside
// HrShell, reached from the new rail item after Candidates.
//
// One calm scroll, three sections, one obvious action per row:
//  - Today: one primary Start (the only purple button on the page)
//    that opens the live companion; finished rows dim and flip to a
//    quiet Notes.
//  - Upcoming: grouped by day, two quiet actions, Prep (the shipped
//    InterviewKitCard in a sheet) and Reschedule (the shipped
//    ScheduleInterviewModal, prefilled via rescheduleOf).
//  - Past: this week, grouped by job, her scorecard rating as the
//    verdict pill; jobs with 2 or more get one quiet Compare that
//    opens the shipped CompareCandidates.
//
// Glass (surface-glass tokens) on exactly two surfaces here: the
// sticky header and the live now banner. Ordinary rows stay solid.
//
// Motion per Motion principles.md (2a): 350ms row rise with 40ms
// stagger, and the signature open from origin — Start expands a glass
// veil out of the tapped row before the route changes; Prep expands
// the sheet from the tapped button and collapses back on close.
// Reduced motion degrades every move to a plain fade or nothing.
//
// Data: interviews (migration 018 + 039 columns) joined to
// applications and jobs, hr scoped by RLS. Today, Upcoming and Past
// are derived from scheduled_at against a 30 second clock; Past
// verdicts read interviews.rating, scores in Compare read the
// persisted applications.ai_verdict. Pre 039 databases get the same
// page through the legacy column fallback.
// =============================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { supabase } from "../../../appSupabaseClient";
import {
  formatTimeIn, wordForTz, dualTimeParts, hrTimeZone, inferCandidateZone,
} from "../../../lib/hr/interviewTz";
import InterviewKitCard from "../../../components/hr/InterviewKitCard";
import ScheduleInterviewModal from "../../../components/hr/ScheduleInterviewModal";
import CompareCandidates from "../../../components/hr/CompareCandidates";
import "../../../components/hr/surfaceGlass.css";
import "../PostJob/postJob.css";
import "../Jobs/jobPipeline.css";
import "./interviewsPage.css";

const EASE = [0.4, 0, 0.2, 1];
const EASE_CSS = "cubic-bezier(0.4, 0, 0.2, 1)";

const RATING_WORD = { strong_yes: "Strong yes", yes: "Yes", mixed: "Mixed", no: "No" };
const RATING_PILL = {
  strong_yes: { label: "✓✓ Strong yes", tone: "good" },
  yes: { label: "✓ Yes", tone: "good" },
  mixed: { label: "Mixed", tone: "mixed" },
  no: { label: "No", tone: "no" },
};

const APP_COLS = "id, job_id, candidate_id, candidate_name, candidate_email, candidate_phone, cv_snapshot, cv_file_path, ats_score, match_keywords, missing_keywords, ai_verdict, score_source, source, status, applied_at";
const IV_COLS = `id, application_id, job_id, scheduled_at, duration_min, meeting_link, note, status, kit, rating, rating_note, candidate_tz, ics_sequence, candidate_id, applications(${APP_COLS}), jobs(id, title, location, market)`;
const IV_COLS_LEGACY = `id, application_id, job_id, scheduled_at, duration_min, meeting_link, note, status, candidate_id, applications(${APP_COLS}), jobs(id, title, location, market)`;

/* ── small pure helpers ── */

const initialsOf = (name) =>
  (String(name || "?").trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join("") || "?").toUpperCase();

const TINTS = ["green", "purple", "blue", "amber", "gray"];
function tintOf(name) {
  const s = String(name || "");
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) % 997;
  return TINTS[h % TINTS.length];
}

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const sameDay = (a, b) => startOfDay(a).getTime() === startOfDay(b).getTime();

function longDay(d) {
  return `${d.toLocaleDateString("en-GB", { weekday: "long" })} ${d.getDate()} ${d.toLocaleDateString("en-GB", { month: "long" })}`;
}

function cvLocationOf(application) {
  const cv = application?.cv_snapshot || application?.cv_data || {};
  const personal = cv.personal || cv.basics || {};
  return (typeof cv.location === "string" && cv.location.trim())
    || (typeof personal.location === "string" && personal.location.trim())
    || "";
}

/* Candidate zone for a row: the stored invite zone first, then the same
   CV location and job market inference the schedule modal uses. */
function candidateTzOf(iv) {
  if (iv?.candidate_tz) return iv.candidate_tz;
  const { zone } = inferCandidateZone({
    cvLocation: cvLocationOf(iv?.applications),
    jobLocation: [iv?.jobs?.location, iv?.jobs?.market].filter(Boolean).join(", "),
  });
  return zone?.tz || null;
}

/* "2:00 PM Dubai" + "3:30 PM India" (second line only when it differs). */
function timeLinesOf(iv, hrTz) {
  const when = new Date(iv.scheduled_at);
  const p = dualTimeParts({ when, hrTz, candidateTz: candidateTzOf(iv) || hrTz });
  return {
    t1: `${p.hrTime} ${p.hrWord}`,
    t2: p.same ? null : `${p.candTime} ${p.candWord}`,
  };
}

/* Open from origin (Motion principles.md, the signature move): the
   destination expands out of the tapped element. Pure WAAPI so close
   can reverse it; reduced motion gets a plain fade. */
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

export default function InterviewsPage() {
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const hrTz = useMemo(() => hrTimeZone(), []);

  const [user, setUser] = useState(null);
  const [rows, setRows] = useState(null); // null = loading
  const [everCount, setEverCount] = useState(null);
  const [readyCount, setReadyCount] = useState(0);
  const [tick, setTick] = useState(0);
  const [now, setNow] = useState(() => new Date());

  const [prepFor, setPrepFor] = useState(null); // interview row | null
  const [reschedOf, setReschedOf] = useState(null); // interview row | null
  const [compareFor, setCompareFor] = useState(null); // { title, cands } | null
  const [veil, setVeil] = useState(null); // { rect, href } | null

  const prepOriginRef = useRef(null);
  const prepElRef = useRef(null);
  const prepClosingRef = useRef(false);
  const veilRef = useRef(null);

  /* Live now depends on the clock, not on data changes. */
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    let live = true;
    supabase.auth.getUser().then(({ data }) => { if (live) setUser(data?.user || null); });
    return () => { live = false; };
  }, []);

  useEffect(() => {
    if (!user?.id) return undefined;
    let live = true;
    (async () => {
      const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
      let { data, error } = await supabase
        .from("interviews")
        .select(IV_COLS)
        .eq("hr_id", user.id)
        .gte("scheduled_at", since)
        .order("scheduled_at", { ascending: true });
      if (error) {
        // Pre 039 database: the same agenda without the kit columns.
        ({ data } = await supabase
          .from("interviews")
          .select(IV_COLS_LEGACY)
          .eq("hr_id", user.id)
          .gte("scheduled_at", since)
          .order("scheduled_at", { ascending: true }));
      }
      if (!live) return;
      const list = (data || []).filter((iv) => iv.status !== "cancelled");
      setRows(list);

      // Zero interviews in the window: older ones still mean she has
      // used this page, so the invitation shows only on a true zero.
      if (list.length === 0) {
        const { count } = await supabase
          .from("interviews")
          .select("id", { count: "exact", head: true })
          .eq("hr_id", user.id);
        if (live) setEverCount(count || 0);
      } else {
        setEverCount(list.length);
      }

      // The Upcoming empty state names the real To interview count.
      const hasUpcoming = list.some(
        (iv) => iv.status === "scheduled" && new Date(iv.scheduled_at) >= new Date(startOfDay(new Date()).getTime() + 24 * 3600 * 1000),
      );
      if (!hasUpcoming) {
        const { count } = await supabase
          .from("applications")
          .select("id", { count: "exact", head: true })
          .eq("status", "ready");
        if (live) setReadyCount(count || 0);
      }
    })();
    return () => { live = false; };
  }, [user?.id, tick]);

  /* ── Derivations against the clock ── */
  const dayStart = startOfDay(now).getTime();
  const dayEnd = dayStart + 24 * 3600 * 1000;

  const today = useMemo(() => (rows || []).filter((iv) => {
    const t = new Date(iv.scheduled_at).getTime();
    return t >= dayStart && t < dayEnd;
  }), [rows, dayStart, dayEnd]);

  const upcoming = useMemo(() => (rows || []).filter((iv) => {
    const t = new Date(iv.scheduled_at).getTime();
    return t >= dayEnd && iv.status === "scheduled";
  }), [rows, dayEnd]);

  const past = useMemo(() => (rows || [])
    .filter((iv) => iv.status === "completed" || iv.status === "no_show")
    .sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at)), [rows]);

  /* Live or starting within about ten minutes → the glass banner. */
  const liveIv = useMemo(() => today.find((iv) => {
    if (iv.status !== "scheduled") return false;
    const t = new Date(iv.scheduled_at).getTime();
    const end = t + (Number(iv.duration_min) || 30) * 60000;
    return now.getTime() >= t - 10 * 60000 && now.getTime() <= end;
  }), [today, now]);

  const upGroups = useMemo(() => {
    const map = new Map();
    upcoming.forEach((iv) => {
      const d = new Date(iv.scheduled_at);
      const key = startOfDay(d).getTime();
      if (!map.has(key)) map.set(key, { key, date: d, rows: [] });
      map.get(key).rows.push(iv);
    });
    return Array.from(map.values());
  }, [upcoming]);

  const pastGroups = useMemo(() => {
    const map = new Map();
    past.forEach((iv) => {
      const key = iv.job_id || "none";
      if (!map.has(key)) map.set(key, { jobId: key, title: iv.jobs?.title || "This job", rows: [] });
      map.get(key).rows.push(iv);
    });
    return Array.from(map.values());
  }, [past]);

  const remainingToday = today.filter((iv) => iv.status === "scheduled").length;
  const countLine = useMemo(() => {
    const parts = [];
    if (remainingToday > 0) parts.push(`${remainingToday} today`);
    else if (today.length > 0) parts.push("all done for today");
    if (upcoming.length > 0) parts.push(`${upcoming.length} coming up`);
    return parts.join(", ");
  }, [remainingToday, today.length, upcoming.length]);

  const dateLine = useMemo(
    () => longDay(now),
    // The header date only needs to move at midnight, not every 30s tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [dayStart],
  );

  /* The Today empty state names the actual next interview. */
  const nextLine = useMemo(() => {
    const next = upcoming[0];
    if (!next) return "Nothing today.";
    const d = new Date(next.scheduled_at);
    const at = `${formatTimeIn(d, hrTz)} ${wordForTz(hrTz)}`;
    const tomorrow = new Date(dayEnd);
    const dayPart = sameDay(d, tomorrow) ? "tomorrow" : `on ${longDay(d)}`;
    return `Nothing today. Your next interview is ${dayPart} at ${at}.`;
  }, [upcoming, hrTz, dayEnd]);

  /* ── Start, the open from origin veil ── */
  const openCompanion = (iv) => (e) => {
    const href = `/employer/interview/${iv.id}`;
    const anchor = e?.currentTarget?.closest?.(".ivx-row") || e?.currentTarget;
    const rect = anchor?.getBoundingClientRect?.();
    if (reduce || !rect || typeof document.body.animate !== "function") {
      navigate(href);
      return;
    }
    setVeil({ rect, href });
  };

  useEffect(() => {
    if (!veil) return undefined;
    const el = veilRef.current;
    let done = false;
    const go = () => { if (!done) { done = true; navigate(veil.href); } };
    if (!el || typeof el.animate !== "function") { go(); return undefined; }
    const r = el.getBoundingClientRect();
    const o = veil.rect;
    const dx = o.left + o.width / 2 - (r.left + r.width / 2);
    const dy = o.top + o.height / 2 - (r.top + r.height / 2);
    const anim = el.animate([
      {
        transform: `translate(${dx}px, ${dy}px) scale(${Math.max(o.width / r.width, 0.02)}, ${Math.max(o.height / r.height, 0.02)})`,
        opacity: 0.35,
      },
      { transform: "none", opacity: 1 },
    ], { duration: 350, easing: EASE_CSS, fill: "forwards" });
    anim.onfinish = go;
    anim.oncancel = go;
    const safety = setTimeout(go, 600);
    return () => clearTimeout(safety);
  }, [veil, navigate]);

  /* ── Prep sheet: open from origin, collapse back on close ── */
  const openPrep = (iv) => (e) => {
    prepOriginRef.current = e?.currentTarget?.getBoundingClientRect?.() || null;
    prepClosingRef.current = false;
    setPrepFor(iv);
  };

  useEffect(() => {
    if (!prepFor) return;
    playOpenFromOrigin(prepElRef.current, prepOriginRef.current, reduce);
  }, [prepFor, reduce]);

  const closePrep = () => {
    if (prepClosingRef.current) return;
    const el = prepElRef.current;
    if (!el || typeof el.animate !== "function") { setPrepFor(null); return; }
    prepClosingRef.current = true;
    el.style.pointerEvents = "none";
    const scrim = el.parentElement;
    if (scrim) scrim.style.pointerEvents = "none";
    const o = prepOriginRef.current;
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
    const done = () => setPrepFor(null);
    anim.onfinish = done;
    anim.oncancel = done;
  };

  /* Prep sheet keyboard contract: Escape closes, Tab stays inside,
     focus lands on the sheet (same contract as the schedule modal). */
  useEffect(() => {
    if (!prepFor) return undefined;
    const prior = document.activeElement;
    const focusables = () => Array.from(
      prepElRef.current?.querySelectorAll("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])") || [],
    ).filter((el) => !el.disabled && el.getClientRects().length > 0);
    const t = setTimeout(() => { focusables()[0]?.focus(); }, 0);
    const onKey = (e) => {
      if (e.key === "Escape") { e.stopPropagation(); closePrep(); return; }
      if (e.key !== "Tab") return;
      const list = focusables();
      if (!list.length) return;
      const first = list[0];
      const last = list[list.length - 1];
      if (!prepElRef.current?.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      if (prior && typeof prior.focus === "function") prior.focus();
    };
    // closePrep is stable enough for this dialog's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prepFor]);

  /* ── Compare: the shipped component, fed from this job's week ── */
  const compareCandsOf = (groupRows) => {
    const seen = new Set();
    const out = [];
    [...groupRows]
      .sort((a, b) => new Date(b.scheduled_at) - new Date(a.scheduled_at))
      .forEach((iv) => {
        const app = iv.applications;
        if (!app?.id || seen.has(app.id)) return;
        seen.add(app.id);
        const cv = app.cv_snapshot || {};
        out.push({
          key: app.candidate_id || app.candidate_email || app.id,
          name: app.candidate_name || "Candidate",
          email: app.candidate_email || "",
          visa: "",
          skills: Array.isArray(cv.skills) ? cv.skills : [],
          record: app,
          apps: [{ job_id: iv.job_id, jobTitle: iv.jobs?.title || "", status: app.status, kind: "job", app_id: app.id }],
        });
      });
    return out.slice(0, 3);
  };

  /* ── Row pieces ── */

  const rowEntrance = (i) => ({
    initial: reduce ? false : { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.35, ease: EASE, delay: reduce ? 0 : 0.05 + Math.min(i * 0.04, 0.28) },
  });

  const statusOf = (iv) => {
    const t = new Date(iv.scheduled_at).getTime();
    const end = t + (Number(iv.duration_min) || 30) * 60000;
    if (iv.status === "completed") {
      const word = iv.rating && RATING_WORD[iv.rating] ? `, rated ${RATING_WORD[iv.rating]}` : "";
      return { cls: "done", text: `✓ Done${word}`, dot: false };
    }
    if (iv.status === "no_show") return { cls: "done", text: "Did not join", dot: false };
    if (now.getTime() > end) return { cls: "wait", text: "Earlier today", dot: true };
    if (now.getTime() >= t) return { cls: "live", text: "Live now", dot: true };
    if (now.getTime() >= t - 10 * 60000) return { cls: "live", text: "Starting soon", dot: true };
    const mins = Math.max(1, Math.round((t - now.getTime()) / 60000));
    if (mins < 60) return { cls: "wait", text: `In ${mins} ${mins === 1 ? "minute" : "minutes"}`, dot: true };
    const hours = Math.max(1, Math.round(mins / 60));
    return { cls: "wait", text: `In ${hours} ${hours === 1 ? "hour" : "hours"}`, dot: true };
  };

  const identity = (iv, { withStatus = false } = {}) => {
    const app = iv.applications;
    const name = app?.candidate_name || "Candidate";
    const { t1, t2 } = timeLinesOf(iv, hrTz);
    const st = withStatus ? statusOf(iv) : null;
    return (
      <>
        <span className={`ivx-avatar ivx-avatar--${tintOf(name)}`} aria-hidden="true">{initialsOf(name)}</span>
        <span className="ivx-id">
          <span className="ivx-id__name">{name}</span>
          <span className="ivx-id__job">{iv.jobs?.title || ""}</span>
          <span className="ivx-id__time">{t1}{t2 ? `, ${t2}` : ""}</span>
          {st && st.cls === "done" && <span className="ivx-id__job">{st.text}</span>}
        </span>
        <span className="ivx-cell ivx-cell--job">{iv.jobs?.title || ""}</span>
        <span className="ivx-cell ivx-cell--time">
          <span className="ivx-t1">{t1}</span>
          {t2 && <span className="ivx-t2">{t2}</span>}
        </span>
      </>
    );
  };

  const pastPill = (iv) => {
    if (iv.status === "no_show") return <span className="ivx-pill ivx-pill--none">Did not join</span>;
    const v = iv.rating && RATING_PILL[iv.rating];
    if (!v) return <span className="ivx-pill ivx-pill--none">Not rated</span>;
    return <span className={`ivx-pill ivx-pill--${v.tone}`}>{v.label}</span>;
  };

  const pastWhen = (iv) => {
    const d = new Date(iv.scheduled_at);
    const day = sameDay(d, now) ? "Today" : d.toLocaleDateString("en-GB", { weekday: "long" });
    return `${day}, ${formatTimeIn(d, hrTz)} ${wordForTz(hrTz)}`;
  };

  const loading = rows === null;
  const zero = !loading && rows.length === 0 && everCount === 0;
  const prepApp = prepFor?.applications || null;

  return (
    <div className="ivx-root">
      {/* Sticky glass header — surface one of two */}
      <motion.header
        className="ivx-head"
        initial={reduce ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASE }}
      >
        <h1 className="ivx-head__title">Interviews</h1>
        {!loading && !zero && countLine && <span className="ivx-head__count">{countLine}</span>}
        <span className="ivx-head__date">{dateLine}</span>
      </motion.header>

      {loading && <div className="ivx-loading" role="status">Loading your interviews…</div>}

      {zero && (
        <div className="ivx-zero">
          <span className="ivx-zero__mark" aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </span>
          <div className="ivx-zero__title">Your interviews will live here</div>
          <p className="ivx-zero__sub">Schedule one from any candidate and it shows up on this page, today, upcoming, and done.</p>
          <button type="button" className="ivx-btn ivx-btn--ink" onClick={() => navigate("/employer/candidates")}>
            Go to candidates
          </button>
        </div>
      )}

      {!loading && !zero && (
        <div className="ivx-body">
          {/* Live now banner — surface two of two */}
          {liveIv && (
            <motion.div
              className="ivx-live"
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              <span className="ivx-live__dot" aria-hidden="true" />
              <span className="ivx-live__who">
                {new Date(liveIv.scheduled_at) <= now ? "Live now" : "Starting soon"}, {liveIv.applications?.candidate_name || "your candidate"}
              </span>
              <span className="ivx-live__sub">
                {liveIv.jobs?.title ? `${liveIv.jobs.title}, ` : ""}
                {new Date(liveIv.scheduled_at) <= now ? "started" : "starts"} {formatTimeIn(new Date(liveIv.scheduled_at), hrTz)} {wordForTz(hrTz)}
              </span>
              <button type="button" className="ivx-btn ivx-btn--ink" onClick={openCompanion(liveIv)}>
                Open companion
              </button>
            </motion.div>
          )}

          {/* ── Today ── */}
          <section aria-label="Today">
            <div className="ivx-sec__head">
              <h2 className="ivx-sec__title">Today</h2>
              <span className="ivx-sec__sub">
                {today.length > 0 ? `${today.length} ${today.length === 1 ? "interview" : "interviews"}` : ""}
              </span>
            </div>
            {today.length === 0 ? (
              <div className="ivx-empty"><span className="ivx-empty__line">{nextLine}</span></div>
            ) : (
              <div className="ivx-card">
                {today.map((iv, i) => {
                  const finished = iv.status !== "scheduled";
                  const st = statusOf(iv);
                  return (
                    <motion.div key={iv.id} className={`ivx-row ivx-row--today${finished ? " ivx-row--done" : ""}`} {...rowEntrance(i)}>
                      {identity(iv, { withStatus: true })}
                      <span className={`ivx-cell ivx-cell--status ivx-status ivx-status--${st.cls}`}>
                        {st.dot && <span className="ivx-status__dot" aria-hidden="true" />}
                        {st.text}
                      </span>
                      <button
                        type="button"
                        className={`ivx-btn ${finished ? "ivx-btn--quiet" : "ivx-btn--start"}`}
                        onClick={openCompanion(iv)}
                      >
                        {finished ? "Notes" : "Start"}
                      </button>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── Upcoming ── */}
          <section aria-label="Upcoming">
            <div className="ivx-sec__head">
              <h2 className="ivx-sec__title">Upcoming</h2>
              <span className="ivx-sec__sub">{upcoming.length > 0 ? `${upcoming.length} scheduled` : ""}</span>
            </div>
            {upcoming.length === 0 ? (
              <div className="ivx-empty">
                <span className="ivx-empty__line">
                  {readyCount > 0
                    ? `Nothing coming up. ${readyCount} ${readyCount === 1 ? "person is" : "people are"} waiting at To interview.`
                    : "Nothing coming up. Schedule one from any candidate."}
                </span>
                {readyCount > 0 && (
                  <div>
                    <button type="button" className="ivx-btn ivx-btn--ink" onClick={() => navigate("/employer/candidates")}>
                      See who is ready to interview
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="ivx-card">
                {upGroups.map((g, gi) => (
                  <div key={g.key}>
                    <div className={`ivx-grouphead${gi > 0 ? " ivx-grouphead--bordered" : ""}`}>
                      {sameDay(g.date, new Date(dayEnd)) ? `Tomorrow, ${longDay(g.date)}` : longDay(g.date)}
                    </div>
                    {g.rows.map((iv, i) => (
                      <motion.div key={iv.id} className="ivx-row ivx-row--up" {...rowEntrance(gi * 2 + i)}>
                        {identity(iv)}
                        <span className="ivx-acts">
                          <button type="button" className="ivx-btn ivx-btn--quiet" onClick={openPrep(iv)}>Prep</button>
                          <button type="button" className="ivx-btn ivx-btn--quiet" onClick={() => setReschedOf(iv)}>Reschedule</button>
                        </span>
                      </motion.div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Past ── */}
          <section aria-label="Past">
            <div className="ivx-sec__head">
              <h2 className="ivx-sec__title">Past</h2>
              <span className="ivx-sec__sub">{past.length > 0 ? "This week" : ""}</span>
            </div>
            {past.length === 0 ? (
              <div className="ivx-empty">
                <span className="ivx-empty__line">Interviews you finish will land here with your verdict.</span>
              </div>
            ) : (
              <div className="ivx-card">
                {pastGroups.map((g) => {
                  const cands = compareCandsOf(g.rows);
                  return (
                    <div key={g.jobId}>
                      <div className="ivx-grouphead">
                        <span>{g.title}, {g.rows.length} this week</span>
                        {cands.length >= 2 && (
                          <button
                            type="button"
                            className="ivx-btn ivx-btn--quiet"
                            onClick={() => setCompareFor({ title: g.title, cands })}
                          >
                            Compare these {cands.length}
                          </button>
                        )}
                      </div>
                      {g.rows.map((iv, i) => {
                        const name = iv.applications?.candidate_name || "Candidate";
                        return (
                          <motion.div key={iv.id} className="ivx-row ivx-row--past" {...rowEntrance(i)}>
                            <span className={`ivx-avatar ivx-avatar--${tintOf(name)}`} aria-hidden="true">{initialsOf(name)}</span>
                            <span className="ivx-id">
                              <span className="ivx-id__name">{name}</span>
                              <span className="ivx-id__job">{pastWhen(iv)}</span>
                            </span>
                            <span className="ivx-cell ivx-cell--when">{pastWhen(iv)}</span>
                            {pastPill(iv)}
                          </motion.div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* ── Prep kit sheet: the shipped InterviewKitCard, hers to shape ── */}
      {prepFor && (
        <div
          className="ivx-scrim"
          role="dialog"
          aria-modal="true"
          aria-label={`Prep kit, ${prepApp?.candidate_name || "candidate"}`}
          onClick={closePrep}
        >
          <div className="ivx-sheet" ref={prepElRef} onClick={(e) => e.stopPropagation()}>
            <div className="ivx-sheet__head">
              <span className="ivx-sheet__title">Prep kit, {prepApp?.candidate_name || "candidate"}</span>
              <button type="button" className="ivx-sheet__x" aria-label="Close prep kit" onClick={closePrep}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <p className="ivx-sheet__sub">
              {longDay(new Date(prepFor.scheduled_at))}, {timeLinesOf(prepFor, hrTz).t1}
              {timeLinesOf(prepFor, hrTz).t2 ? `, ${timeLinesOf(prepFor, hrTz).t2}` : ""}
            </p>
            <InterviewKitCard
              cacheKey={`${prepApp?.candidate_id || prepApp?.id || prepFor.id}:${prepFor.job_id}`}
              cvSnapshot={prepApp?.cv_snapshot || null}
              jobId={prepFor.job_id}
              candidateName={prepApp?.candidate_name || ""}
              jobTitle={prepFor.jobs?.title || ""}
              hrId={user?.id}
              applicationId={prepFor.application_id}
            />
          </div>
        </div>
      )}

      {/* ── Reschedule: the shipped schedule modal, prefilled ── */}
      <ScheduleInterviewModal
        open={!!reschedOf}
        onClose={() => setReschedOf(null)}
        application={reschedOf?.applications || null}
        job={reschedOf?.jobs ? { id: reschedOf.jobs.id, title: reschedOf.jobs.title, location: reschedOf.jobs.location, market: reschedOf.jobs.market } : null}
        hrId={user?.id}
        hrEmail={user?.email}
        rescheduleOf={reschedOf}
        onScheduled={() => setTick((t) => t + 1)}
      />

      {/* ── Compare: the shipped side by side compare ── */}
      <CompareCandidates
        open={!!compareFor && (compareFor.cands || []).length >= 2}
        onClose={() => setCompareFor(null)}
        candidates={compareFor?.cands || []}
      />

      {/* ── Start veil: the row expanding into the companion ── */}
      {veil && <div className="ivx-veil" ref={veilRef} aria-hidden="true" />}
    </div>
  );
}
