// =============================================================
// src/components/hr/VerdictCard.jsx
//
// Candidate Verdict — a light, corridor-aware decision card at the top
// of the HR candidate detail (pipeline + Candidates CRM).
//
// ONE VERDICT, ONE NUMBER (migration 036): the verdict is computed once
// per candidate+job and PERSISTED on the applications row (ai_verdict
// jsonb, ats_score synced to its score). Read order everywhere:
//   session Map -> the row's stored ai_verdict -> one Sonnet call, then
//   write back (first-write-wins: UPDATE ... WHERE ai_verdict IS NULL,
//   losers converge on the winner's row). The board card, CRM list badge,
//   drawer ring and Compare all show the same number by construction.
// resolveVerdict() is the single shared loader — CompareCandidates uses
// it too. Pre-036 databases degrade gracefully: the persist step fails
// quietly and behavior is the old session-cache-only one.
//
// Renders: badge (Strong Match / Maybe / Weak Match) + prominent score +
// 3 reasons (Match / Corridor / Gap) + strengths/gaps checklist + the
// matched/missing keyword chips + WhatsApp action.
//
// Backward compatibility: strengths/gaps are OPTIONAL on the response —
// verdicts stored before the arrays existed render exactly as before
// (the Gap line in the 3-reason list carries the risk). Never force a
// re-run for shape differences.
//
// The WhatsApp action hands the verdict's whatsapp_cta_template back to
// the caller (onReachOut) which opens the EXISTING WhatsAppComposer —
// no new WhatsApp path here.
// =============================================================

import { useEffect, useRef, useState } from "react";
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
// Read-only peek for siblings (InterviewKitCard feeds the verdict's "Gap:"
// line into its prompt when the verdict has already been generated).
export function getCachedVerdict(key) { return (key && verdictCache.get(key)) || null; }
// Write path for siblings that fetch the same verdict themselves
// (CompareCandidates loads per column) — one shared cache, one AI call
// per candidate+job across every surface.
export function putCachedVerdict(key, data) { if (key && data) verdictCache.set(key, data); }

// Tone + chip label derive from the SCORE via scoreBand — never from the
// AI's raw verdict string. An 8/100 once wore a "PASS" chip (ambiguous:
// passed-the-screen vs pass-on-them); now text, color and ring always
// agree by construction. See src/lib/ats/scoreBand.js.

/* A verdict (stored or cached) is trustworthy when it carries the fields
   every surface renders. Guards against half-written or legacy rows. */
export function isVerdictShape(v) {
  return Boolean(
    v && typeof v === "object" && !Array.isArray(v)
    && typeof v.score === "number" && v.verdict && Array.isArray(v.two_second_why)
  );
}

async function fetchVerdictFromApi({ cvSnapshot, job, jobId }) {
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
  return out;
}

/* Persist a freshly generated verdict onto its applications row so every
   surface reads the same number. First-write-wins unless force (the
   explicit Regenerate action): the guarded UPDATE only lands on a NULL
   ai_verdict; if another surface won the race we converge on the stored
   winner. ats_score mirrors the verdict score so the list badge and board
   card agree with the ring. Best effort by design — RLS trouble or a
   pre-036 database (no ai_verdict column) returns null and the caller
   keeps the in-session verdict. */
async function persistVerdict({ applicationId, verdict, force }) {
  if (!applicationId) return null;
  try {
    let q = supabase
      .from("applications")
      .update({
        ai_verdict: verdict,
        ats_score: verdict.score,
        score_source: "sonnet_verdict",
        verdict_generated_at: new Date().toISOString(),
      })
      .eq("id", applicationId);
    if (!force) q = q.is("ai_verdict", null);
    const { data, error } = await q.select("ai_verdict").maybeSingle();
    if (error) throw error;
    if (isVerdictShape(data?.ai_verdict)) return data.ai_verdict;
    if (!force) {
      // 0 rows updated: another surface persisted first — read the winner.
      const { data: row } = await supabase
        .from("applications")
        .select("ai_verdict")
        .eq("id", applicationId)
        .maybeSingle();
      if (isVerdictShape(row?.ai_verdict)) return row.ai_verdict;
    }
    return null;
  } catch {
    return null;
  }
}

/* THE single verdict loader, shared by this card and CompareCandidates.
   Read order: session Map -> stored row value -> one Sonnet call + persist.
   onPersisted fires only when a NEW verdict was generated, with the
   canonical (persisted or in-session) object — pages use it to sync their
   local row state so list badges update without a refetch. */
export async function resolveVerdict({
  cacheKey, cvSnapshot, job, jobId, applicationId,
  storedVerdict = null, force = false, onPersisted,
}) {
  if (!force) {
    if (cacheKey && verdictCache.has(cacheKey)) return verdictCache.get(cacheKey);
    if (isVerdictShape(storedVerdict)) {
      if (cacheKey) verdictCache.set(cacheKey, storedVerdict);
      return storedVerdict;
    }
  }
  const out = await fetchVerdictFromApi({ cvSnapshot, job, jobId });
  const canonical = (await persistVerdict({ applicationId, verdict: out, force })) || out;
  if (cacheKey) verdictCache.set(cacheKey, canonical);
  if (onPersisted) onPersisted(canonical);
  return canonical;
}

/* ───────── lazy + cached + persisted verdict fetch ───────── */
function useCandidateVerdict({ cacheKey, cvSnapshot, job, jobId, applicationId, storedVerdict, onPersisted }) {
  const [state, setState] = useState(() =>
    cacheKey && verdictCache.has(cacheKey)
      ? { loading: false, data: verdictCache.get(cacheKey), error: null }
      : { loading: false, data: null, error: null }
  );
  const [nonce, setNonce] = useState(0);
  const onPersistedRef = useRef(onPersisted);
  onPersistedRef.current = onPersisted;
  const retry = () => { if (cacheKey) verdictCache.delete(cacheKey); setNonce((n) => n + 1); };

  useEffect(() => {
    if (!cacheKey) { setState({ loading: false, data: null, error: null }); return undefined; }
    if (verdictCache.has(cacheKey)) {
      setState({ loading: false, data: verdictCache.get(cacheKey), error: null });
      return undefined;
    }
    // Stored verdict renders instantly — no loading flash, no network.
    if (nonce === 0 && isVerdictShape(storedVerdict)) {
      verdictCache.set(cacheKey, storedVerdict);
      setState({ loading: false, data: storedVerdict, error: null });
      return undefined;
    }
    let live = true;
    setState({ loading: true, data: null, error: null });
    (async () => {
      try {
        // nonce > 0 = explicit retry/regenerate: bypass the stored value and
        // overwrite the row so the new number propagates to every surface.
        const out = await resolveVerdict({
          cacheKey, cvSnapshot, job, jobId, applicationId,
          storedVerdict: nonce > 0 ? null : storedVerdict,
          force: nonce > 0,
          onPersisted: (v) => onPersistedRef.current?.(v),
        });
        if (!live) return;
        setState({ loading: false, data: out, error: null });
      } catch (_e) {
        if (!live) return;
        setState({ loading: false, data: null, error: "Couldn't generate the verdict." });
      }
    })();
    return () => { live = false; };
    // cvSnapshot/job/jobId/applicationId/storedVerdict are keyed by cacheKey;
    // depend only on the key (same contract as before 036).
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
const CheckSmIc = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>);
const AlertSmIc = () => (<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><line x1="12" y1="8" x2="12" y2="12.5" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>);

/* ── Strengths / gaps checklist — renders ONLY when the verdict carries
      the arrays (new responses). Old cached verdicts skip it and keep
      their Gap line in the 3-reason list above. ── */
function StrengthsGaps({ strengths, gaps, reduce }) {
  const cols = [
    strengths?.length ? { key: "s", title: "Strengths", cls: "vc-sg__col--strengths", ic: <CheckSmIc />, items: strengths } : null,
    gaps?.length ? { key: "g", title: "Gaps", cls: "vc-sg__col--gaps", ic: <AlertSmIc />, items: gaps } : null,
  ].filter(Boolean);
  if (cols.length === 0) return null;
  return (
    <div className="vc-sg">
      {cols.map((c) => (
        <div className={`vc-sg__col ${c.cls}`} key={c.key}>
          <span className="vc-sg__title">{c.title}</span>
          <ul className="vc-sg__list">
            {c.items.slice(0, 3).map((line, i) => (
              <motion.li
                className="vc-sg__item"
                key={i}
                initial={reduce ? false : { opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, ease: EASE, delay: reduce ? 0 : Math.min(0.05 + i * 0.05, 0.35) }}
              >
                <span className="vc-sg__ic" aria-hidden="true">{c.ic}</span>
                <span className="vc-sg__text">{line}</span>
              </motion.li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

/* ── Keyword chips — always visible under the verdict, no reveal click.
      Mirrors the page-level jpp-match chip styling (see verdictCard.css)
      so the card is self-contained on every surface it mounts. ── */
const CHIP_CAP = 6;
function KeywordChips({ matched, missing }) {
  const [expanded, setExpanded] = useState(false);
  const total = matched.length + missing.length;
  const overflow = matched.length > CHIP_CAP || missing.length > CHIP_CAP;
  const shown = (list) => (expanded ? list : list.slice(0, CHIP_CAP));
  if (total === 0) return null;
  return (
    <div className="vc-kw">
      {matched.length > 0 && (
        <div className="vc-kw__col">
          <span className="vc-kw__label">Matched</span>
          <div className="vc-kw__chips">
            {shown(matched).map((k, i) => (
              <span key={`m-${i}`} className="vc-kw__chip vc-kw__chip--hit">{k}</span>
            ))}
          </div>
        </div>
      )}
      {missing.length > 0 && (
        <div className="vc-kw__col">
          <span className="vc-kw__label">Missing</span>
          <div className="vc-kw__chips">
            {shown(missing).map((k, i) => (
              <span key={`x-${i}`} className="vc-kw__chip vc-kw__chip--miss">{k}</span>
            ))}
          </div>
        </div>
      )}
      {overflow && (
        <button type="button" className="vc-kw__toggle" onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Show fewer" : `Show all ${total}`}
        </button>
      )}
    </div>
  );
}

export default function VerdictCard({ header, hideHeader, cacheKey, cvSnapshot, job, jobId, applicationId, storedVerdict, onVerdictPersisted, onReachOut, matchedKeywords = [], missingKeywords = [] }) {
  const reduce = useReducedMotion();
  const { loading, data, error, retry } = useCandidateVerdict({ cacheKey, cvSnapshot, job, jobId, applicationId, storedVerdict, onPersisted: onVerdictPersisted });

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

          <StrengthsGaps strengths={data.strengths} gaps={data.gaps} reduce={reduce} />

          <KeywordChips matched={matchedKeywords} missing={missingKeywords} />

          <div className="vc-actions">
            <button type="button" className="vc-btn vc-btn--solid" onClick={() => onReachOut && onReachOut(data.whatsapp_cta_template)}>
              <WaIc /> Reach out via WhatsApp
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
