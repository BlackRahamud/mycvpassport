// =============================================================
// src/components/hr/VerdictCard.jsx
//
// Candidate Verdict — a light, corridor-aware decision card at the top
// of the HR candidate detail (pipeline + Candidates CRM). It calls the
// new /api/ai?action=candidate_verdict semantic matcher (lazy, on
// open), caches per candidate+job in session memory, and renders:
//   badge (STRONG FIT / MAYBE / PASS) + prominent score + 3 reasons
//   (Match / Corridor / Gap) + two actions (view full analysis, reach
//   out via WhatsApp).
//
// The WhatsApp action hands the verdict's whatsapp_cta_template back to
// the caller (onReachOut) which opens the EXISTING WhatsAppComposer —
// no new WhatsApp path here.
// =============================================================

import { useEffect, useState } from "react";
import { motion, useReducedMotion, useMotionValue, useTransform, animate } from "framer-motion";
import { supabase } from "../../appSupabaseClient";
import safeFetch from "../../lib/net/safeFetch";
import { scoreBand, BAND_LABELS, BAND_TONES } from "../../lib/ats/scoreBand";
import "./verdictCard.css";

const EASE = [0.4, 0, 0.2, 1];

/* Verdict score ring — house ScoreRing visual (track + progress arc,
   rotate -90, round cap) but Framer-driven: the stroke fills 0 -> score
   and the centre number counts up on mount; colour-coded by verdict band.
   Hover = scale + a soft same-colour glow (box-shadow, via CSS). All
   motion is gated by useReducedMotion. */
function VerdictRing({ score, tone, reduce }) {
  const size = 92;
  const strokeWidth = 6;
  const radius = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * radius;
  const colorVar = tone === "strong" ? "var(--vc-green)" : tone === "pass" ? "var(--vc-red)" : "var(--vc-amber)";

  const progress = useMotionValue(reduce ? score : 0);
  const dashoffset = useTransform(progress, (v) => circ - (circ * Math.max(0, Math.min(100, v))) / 100);
  const [display, setDisplay] = useState(reduce ? score : 0);

  useEffect(() => {
    if (reduce) { progress.set(score); setDisplay(score); return undefined; }
    const controls = animate(progress, score, {
      duration: 0.9,
      ease: EASE,
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
    // progress is a stable MotionValue; depend only on score/reduce.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score, reduce]);

  return (
    <motion.div
      className={`vc-ring vc-ring--${tone}`}
      whileHover={reduce ? undefined : { scale: 1.03 }}
      transition={{ duration: 0.2, ease: EASE }}
    >
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--pj-border)" strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circ}
          style={{ stroke: colorVar, strokeDashoffset: dashoffset }}
        />
      </svg>
      <div className="vc-ring__center">
        <span className="vc-ring__num" style={{ color: colorVar }}>{display}</span>
        <span className="vc-ring__sub">/100</span>
      </div>
    </motion.div>
  );
}

// Session memory: `${candidateId}:${jobId}` -> verdict. Keeps the AI call
// from re-firing every time the HR clicks back onto a candidate.
const verdictCache = new Map();
export function clearVerdictCache() { verdictCache.clear(); }

// Tone + chip label derive from the SCORE via scoreBand — never from the
// AI's raw verdict string. An 8/100 once wore a "PASS" chip (ambiguous:
// passed-the-screen vs pass-on-them); now text, color and ring always
// agree by construction. See src/lib/ats/scoreBand.js.

/* ───────── lazy + cached verdict fetch ───────── */
function useCandidateVerdict({ cacheKey, cvSnapshot, job, jobId }) {
  const [state, setState] = useState(() =>
    cacheKey && verdictCache.has(cacheKey)
      ? { loading: false, data: verdictCache.get(cacheKey), error: null }
      : { loading: false, data: null, error: null }
  );
  const [nonce, setNonce] = useState(0);
  const retry = () => { if (cacheKey) verdictCache.delete(cacheKey); setNonce((n) => n + 1); };

  useEffect(() => {
    if (!cacheKey) { setState({ loading: false, data: null, error: null }); return undefined; }
    if (verdictCache.has(cacheKey)) {
      setState({ loading: false, data: verdictCache.get(cacheKey), error: null });
      return undefined;
    }
    let live = true;
    setState({ loading: true, data: null, error: null });
    (async () => {
      try {
        // Resolve the full job (description/skills/requirements) if the
        // caller only had a jobId (the Candidates page case).
        let fullJob = job;
        if ((!fullJob || fullJob.description == null) && jobId) {
          const { data: jrow } = await supabase
            .from("jobs")
            .select("title, description, skills, requirements")
            .eq("id", jobId)
            .maybeSingle();
          if (jrow) fullJob = jrow;
        }
        const { data: { session } = {} } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) throw new Error("auth");
        const res = await safeFetch("/api/ai?action=candidate_verdict", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            cvSnapshot: cvSnapshot || null,
            job: {
              title: fullJob?.title || "",
              description: fullJob?.description || "",
              skills: fullJob?.skills || [],
              requirements: fullJob?.requirements || [],
            },
          }),
        });
        const out = await res.json().catch(() => ({}));
        if (!res.ok || !out.verdict) throw new Error(out.error || "failed");
        if (!live) return;
        verdictCache.set(cacheKey, out);
        setState({ loading: false, data: out, error: null });
      } catch (_e) {
        if (!live) return;
        setState({ loading: false, data: null, error: "Couldn't generate the verdict." });
      }
    })();
    return () => { live = false; };
    // cvSnapshot/job/jobId are keyed by cacheKey; depend only on the key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, nonce]);

  return { ...state, retry };
}

/* ───────── icons ───────── */
const PinIc = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>);
const BadgeIc = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 12l2 2 4-4" /><path d="M12 3l1.9 1.4 2.3-.3 1 2.1 2.1 1-.3 2.3L21.6 14l-1.6 1.7.3 2.3-2.1 1-1 2.1-2.3-.3L12 21.6l-1.9-1.4-2.3.3-1-2.1-2.1-1 .3-2.3L2.4 12l1.6-1.7-.3-2.3 2.1-1 1-2.1 2.3.3z" /></svg>);
const ClockIc = () => (<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>);
const RefreshIc = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></svg>);
const WaIc = () => (<svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" /></svg>);

export default function VerdictCard({ header, hideHeader, cacheKey, cvSnapshot, job, jobId, onReachOut, onViewAnalysis }) {
  const reduce = useReducedMotion();
  const { loading, data, error, retry } = useCandidateVerdict({ cacheKey, cvSnapshot, job, jobId });

  const name = header?.name || "Candidate";
  const role = header?.role || "";
  const anchors = [
    header?.location && { ic: <PinIc />, text: header.location },
    header?.visa && { ic: <BadgeIc />, text: header.visa },
    header?.availability && { ic: <ClockIc />, text: header.availability },
  ].filter(Boolean);

  const band = data ? scoreBand(data.score, "ai_verdict") : "mid";
  const tone = BAND_TONES[band];

  return (
    <motion.div
      className="vc-card"
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
    >
      {!hideHeader && (
        <div className="vc-head">
          <h3 className="vc-head__name">{name}</h3>
          {role && <p className="vc-head__role">{role}</p>}
          {anchors.length > 0 && (
            <div className="vc-anchors">
              {anchors.map((a, i) => (
                <span className="vc-anchor" key={i} title={a.text}>{a.ic} <span className="vc-anchor__txt">{a.text}</span></span>
              ))}
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="vc-body vc-loading" aria-live="polite">
          <span className="vc-loading__pulse" aria-hidden="true" />
          <span className="vc-loading__text">Reading this CV against the role…</span>
        </div>
      )}

      {!loading && error && (
        <div className="vc-body vc-error">
          <span className="vc-error__text">{error}</span>
          <button type="button" className="vc-retry" onClick={retry}><RefreshIc /> Try again</button>
        </div>
      )}

      {!loading && !error && data && (
        <div className="vc-body">
          <div className="vc-verdict">
            <span className={`vc-badge vc-badge--${tone}`}>{BAND_LABELS[band]}</span>
            <VerdictRing score={data.score} tone={tone} reduce={reduce} />
          </div>

          <ul className="vc-why">
            {data.two_second_why.slice(0, 3).map((line, i) => (
              <li className="vc-why__item" key={i}>
                <span className={`vc-dot vc-dot--${i === 0 ? "match" : i === 1 ? "corridor" : "gap"}`} aria-hidden="true" />
                <span className="vc-why__text">{line}</span>
              </li>
            ))}
          </ul>

          <div className="vc-actions">
            {/* Only render when the caller supplies a handler — i.e. there is
                keyword content to reveal. Without this the button dead-clicks
                for candidates whose scan produced no match/missing keywords. */}
            {onViewAnalysis && (
              <button type="button" className="vc-btn vc-btn--ghost" onClick={onViewAnalysis}>
                View full fit analysis
              </button>
            )}
            <button type="button" className="vc-btn vc-btn--solid" onClick={() => onReachOut && onReachOut(data.whatsapp_cta_template)}>
              <WaIc /> Reach out via WhatsApp
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
