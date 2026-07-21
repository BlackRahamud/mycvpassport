import { useEffect, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useFoundationPrice } from "../../lib/employer/useFoundationPrice";
import "./surfaceGlass.css";
import "./trialNudge.css";

/**
 * Sections D and D2 — trial state and the three nudges.
 *
 * Three moments across the 30 days, fired from the REAL days left in
 * hr_my_entitlement, never from a signup date:
 *   early  around day 7   a warm check in
 *   late   around day 25   five days left
 *   final  around day 29   last day of full access
 *
 * Each fires ONCE per employer. Dismissing collapses to a quiet chip
 * that reopens on demand, so a recruiter is never trapped and never
 * nagged twice for the same moment.
 *
 * Glass, because these float over portal context. The inline status chip
 * (TrialStatusChip below) is SOLID, because it sits on the page.
 *
 * DEVICE TIME. daysLeft is derived in the browser from a UTC instant, and
 * the end date renders with toLocaleDateString using the viewer's own
 * locale and zone. No timezone string is stored or transported.
 */

const EASE = [0.4, 0, 0.2, 1];

/* Thresholds in DAYS LEFT on a 30 day trial:
   day 7 -> 23 left, day 25 -> 5 left, day 29 -> 1 left. */
function variantFor(daysLeft) {
  if (daysLeft == null) return null;
  if (daysLeft <= 1) return "final";
  if (daysLeft <= 5) return "late";
  if (daysLeft <= 24) return "early";
  return null;
}

const ClockIc = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
  </svg>
);

/** Days left ring, matches the canvas: a thin violet arc that fills. */
function DaysRing({ daysLeft, total = 30, reduce }) {
  const size = 54, sw = 4;
  const r = (size - sw * 2) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, (daysLeft || 0) / total));
  return (
    <div className="tn-ring" aria-hidden="true">
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(124,58,237,.18)" strokeWidth={sw} />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="#7C3AED" strokeWidth={sw} strokeLinecap="round"
          strokeDasharray={circ}
          initial={reduce ? { strokeDashoffset: circ - circ * pct } : { strokeDashoffset: circ }}
          animate={{ strokeDashoffset: circ - circ * pct }}
          transition={{ duration: 0.9, ease: EASE }}
        />
      </svg>
      <div className="tn-ring__c">
        <span className="tn-ring__n">{daysLeft}</span>
        <span className="tn-ring__l">days left</span>
      </div>
    </div>
  );
}

/** D — the quiet, permanent status chip. Solid: it sits on the page. */
export function TrialStatusChip({ ent }) {
  if (!ent?.loaded || ent.status !== "trial" || ent.daysLeft == null) return null;
  const label = ent.daysLeft === 1 ? "1 day left" : `${ent.daysLeft} days left`;
  return (
    <span className="tn-chip">
      <span className="tn-chip__dot" aria-hidden="true" />
      Foundation trial · {label}
    </span>
  );
}

export default function TrialNudge({ ent, onUpgrade, stats }) {
  const reduce = useReducedMotion();
  const price = useFoundationPrice();
  const [state, setState] = useState("hidden"); // hidden | open | collapsed
  const [variant, setVariant] = useState(null);

  const userKey = ent?.userKey || "self";

  useEffect(() => {
    if (!ent?.loaded || ent.status !== "trial") return;
    const v = variantFor(ent.daysLeft);
    if (!v) return;
    const key = `hr_trial_nudge:${userKey}:${v}`;
    try {
      if (localStorage.getItem(key)) return; // this moment already had its turn
      localStorage.setItem(key, "1");
    } catch { /* private mode: show it, just do not remember */ }
    setVariant(v);
    setState("open");
  }, [ent, userKey]);

  if (state === "hidden" || !variant) return null;

  const days = ent.daysLeft;
  const daysLabel = days === 1 ? "1 day left" : `${days} days left`;
  // Device time, the recruiter's own clock.
  const endLabel = ent.periodEnd
    ? new Date(ent.periodEnd).toLocaleDateString(undefined, { day: "numeric", month: "long" })
    : null;

  if (state === "collapsed") {
    return (
      <button type="button" className="tn-collapsed" onClick={() => setState("open")}>
        <span className="tn-collapsed__ic" aria-hidden="true"><ClockIc /></span>
        <span className="tn-collapsed__txt">
          <span className="tn-collapsed__t">Trial · {daysLabel}</span>
          <span className="tn-collapsed__s">Reminders paused. Reopen any time.</span>
        </span>
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="m18 15-6-6-6 6" /></svg>
      </button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        className={`tn tn--${variant}`}
        role="status"
        initial={reduce ? false : { opacity: 0, y: 14, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduce ? { opacity: 1 } : { opacity: 0, y: 8 }}
        transition={{ duration: 0.42, ease: EASE }}
      >
        <button type="button" className="tn__x" aria-label="Dismiss" onClick={() => setState("collapsed")}>
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>

        {variant === "early" && (
          <>
            <div className="tn__kicker">Your first week</div>
            <h3 className="tn__h">You are off to a strong start</h3>
            {/* Only real numbers. A tile with nothing behind it is omitted
                rather than shown as a zero that reads like a bug. */}
            {(stats?.jobs != null || stats?.candidates != null) && (
              <div className="tn__tiles">
                {stats?.jobs != null && (
                  <div className="tn__tile"><b>{stats.jobs}</b><span>jobs posted</span></div>
                )}
                {stats?.candidates != null && (
                  <div className="tn__tile"><b>{stats.candidates}</b><span>candidates in your pipeline</span></div>
                )}
              </div>
            )}
            <p className="tn__foot">{daysLabel} in your trial, in your time.</p>
          </>
        )}

        {variant === "late" && (
          <div className="tn__row">
            <DaysRing daysLeft={days} reduce={reduce} />
            <div className="tn__rowbody">
              <div className="tn__kicker">Trial ending soon</div>
              <h3 className="tn__h">{daysLabel} in your trial</h3>
              <div className="tn__cols">
                <div className="tn__col">
                  <div className="tn__colhead">Stays on free</div>
                  <div>1 active job</div>
                  <div>a basic candidate score</div>
                </div>
                <div className="tn__col tn__col--warm">
                  <div className="tn__colhead">Pauses when it ends</div>
                  <div>full evaluation</div>
                  <div>up to 3 active jobs</div>
                  <div>employer analytics</div>
                </div>
              </div>
              <button type="button" className="tn__cta" onClick={onUpgrade}>
                {price.resolved ? `Continue on Foundation, ${price.amountLabel} per month` : "Continue on Foundation"}
              </button>
              <button type="button" className="tn__later" onClick={() => setState("collapsed")}>Remind me later</button>
            </div>
          </div>
        )}

        {variant === "final" && (
          <div className="tn__row">
            <DaysRing daysLeft={Math.max(days, 0)} reduce={reduce} />
            <div className="tn__rowbody">
              <div className="tn__kicker">Last day</div>
              <h3 className="tn__h">Today is your last day of full access</h3>
              <p className="tn__body">
                Continue on Foundation to keep full evaluation and up to 3 active jobs.
                You keep a free account either way{endLabel ? `, it ends on ${endLabel}` : ""}.
              </p>
              <button type="button" className="tn__cta" onClick={onUpgrade}>
                Continue on Foundation and keep everything
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
