import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence, animate } from "framer-motion";
import { STAGES } from "../../../lib/hr/stages";
import {
  applicantsOverTime,
  stageFunnel,
  medianTimeInStage,
  pipelineTotals,
  formatDuration,
} from "../../../lib/hr/pipelineAnalytics";
import "./pipelineAnalytics.css";

/*
 * Per-job mini-analytics strip. Pure presentation over the aggregators
 * in src/lib/hr/pipelineAnalytics.js — the page passes in the SAME
 * RLS-scoped rows it already fetched, nothing here talks to the network.
 * Motion: one-time reveals (count-ups, bar grow-ins, funnel cascade),
 * all transform/opacity, all disabled under reduced motion.
 */

const EASE = [0.4, 0, 0.2, 1];

function CountUp({ value, reduce }) {
  const [display, setDisplay] = useState(reduce ? value : 0);
  useEffect(() => {
    if (reduce) { setDisplay(value); return undefined; }
    const controls = animate(0, value, {
      duration: 0.7,
      ease: EASE,
      onUpdate: (v) => setDisplay(Math.round(v)),
    });
    return () => controls.stop();
  }, [value, reduce]);
  return <span className="jpp-an__num">{display}</span>;
}

function TotalsRow({ totals, reduce }) {
  const items = [
    { key: "total", label: "Applicants", value: totals.total },
    { key: "active", label: "Active", value: totals.active },
    { key: "rejected", label: "Rejected", value: totals.rejected },
    { key: "hired", label: "Hired", value: totals.hired, accent: true },
  ];
  return (
    <div className="jpp-an__totals" role="group" aria-label="Pipeline totals">
      {items.map((it) => (
        <div key={it.key} className={`jpp-an__total${it.accent ? " jpp-an__total--accent" : ""}`}>
          <CountUp value={it.value} reduce={reduce} />
          <span className="jpp-an__total-label">{it.label}</span>
        </div>
      ))}
    </div>
  );
}

/* 30-day applicants — SVG bars that grow in once with a slight stagger. */
function VolumeChart({ series, reduce }) {
  const max = Math.max(1, ...series.map((s) => s.count));
  const total = series.reduce((s, r) => s + r.count, 0);
  const BAR_W = 6;
  const GAP = 2.4;
  const H = 44;
  const width = series.length * (BAR_W + GAP);
  return (
    <div className="jpp-an__block">
      <div className="jpp-an__block-head">
        <span>Applicants · last 30 days</span>
        <strong>{total}</strong>
      </div>
      {total === 0 ? (
        <p className="jpp-an__sparse">No applications in the last 30 days.</p>
      ) : (
        <svg
          className="jpp-an__vol"
          viewBox={`0 0 ${width} ${H}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={`${total} applications over the last 30 days`}
        >
          {series.map((s, i) => {
            const h = Math.max(s.count > 0 ? 3 : 1.5, (s.count / max) * (H - 4));
            return (
              <motion.rect
                key={s.date}
                className={s.count > 0 ? "jpp-an__bar" : "jpp-an__bar jpp-an__bar--zero"}
                x={i * (BAR_W + GAP)}
                y={H - h}
                width={BAR_W}
                height={h}
                rx={1.5}
                initial={reduce ? false : { scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.4, ease: EASE, delay: reduce ? 0 : i * 0.012 }}
                style={{ transformBox: "fill-box", transformOrigin: "bottom" }}
              >
                <title>{`${s.date}: ${s.count} application${s.count === 1 ? "" : "s"}`}</title>
              </motion.rect>
            );
          })}
        </svg>
      )}
    </div>
  );
}

/* Conversion funnel — rows cascade in, bars scale from the left. */
function Funnel({ rows, reduce }) {
  const base = Math.max(1, rows[0]?.count || 0);
  return (
    <div className="jpp-an__block">
      <div className="jpp-an__block-head"><span>Stage conversion</span></div>
      <div className="jpp-an__funnel">
        {rows.map((r, i) => (
          <motion.div
            key={r.key}
            className="jpp-an__frow"
            initial={reduce ? false : { opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, ease: EASE, delay: reduce ? 0 : i * 0.06 }}
            title={`${r.label}: ${r.count} entered${r.dropFromPrev != null ? ` · ${r.dropFromPrev}% drop-off from previous` : ""}`}
          >
            <span className="jpp-an__flabel">{r.label}</span>
            <span className="jpp-an__ftrack">
              <motion.span
                className="jpp-an__ffill"
                style={{ opacity: 0.95 - i * 0.11, transformOrigin: "left" }}
                initial={reduce ? false : { scaleX: 0 }}
                animate={{ scaleX: Math.max(r.count / base, r.count > 0 ? 0.04 : 0) }}
                transition={{ duration: 0.5, ease: EASE, delay: reduce ? 0 : 0.08 + i * 0.06 }}
              />
            </span>
            <span className="jpp-an__fcount">{r.count}</span>
            <span className="jpp-an__fdrop">
              {r.dropFromPrev != null && r.dropFromPrev > 0 ? `−${r.dropFromPrev}%` : ""}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

/* Median time-in-stage chips — sparse stages say so, never fake it. */
function DwellChips({ dwell }) {
  return (
    <div className="jpp-an__block">
      <div className="jpp-an__block-head"><span>Median time in stage</span></div>
      <div className="jpp-an__dwell">
        {STAGES.filter((s) => s.key !== "hired").map((s) => {
          const d = dwell[s.key];
          const label = formatDuration(d?.medianMs);
          return (
            <span
              key={s.key}
              className={`jpp-an__chip${label ? "" : " jpp-an__chip--sparse"}`}
              title={label
                ? `${s.label}: median ${label} across ${d.samples} completed moves`
                : `${s.label}: not enough data yet (needs at least 2 completed moves)`}
            >
              {s.label}
              <strong>{label || "not enough data yet"}</strong>
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function AnalyticsSkeleton() {
  return (
    <section className="jpp-an" aria-hidden>
      <div className="jpp-an__grid">
        <div className="jpp-an__totals">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="jpp-an__total"><span className="jpp-an__skel jpp-an__skel--num" /><span className="jpp-an__skel jpp-an__skel--label" /></div>
          ))}
        </div>
        <div className="jpp-an__block"><span className="jpp-an__skel jpp-an__skel--chart" /></div>
        <div className="jpp-an__block"><span className="jpp-an__skel jpp-an__skel--chart" /></div>
      </div>
    </section>
  );
}

export default function PipelineAnalytics({ apps, events, reduce }) {
  const [open, setOpen] = useState(true);
  const loading = apps === null || events === null;

  const data = useMemo(() => {
    if (loading) return null;
    return {
      series: applicantsOverTime(apps),
      funnel: stageFunnel(apps, events),
      dwell: medianTimeInStage(apps, events),
      totals: pipelineTotals(apps),
    };
  }, [apps, events, loading]);

  if (loading) return <AnalyticsSkeleton />;

  return (
    <section className="jpp-an" aria-label="Job insights">
      <button
        type="button"
        className="jpp-an__toggle"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span>Insights</span>
        <motion.span
          className="jpp-an__chev"
          animate={{ rotate: open ? 0 : -90 }}
          transition={reduce ? { duration: 0 } : { duration: 0.2, ease: EASE }}
          aria-hidden
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="an-body"
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
            transition={{ duration: 0.26, ease: EASE }}
            style={{ overflow: "hidden" }}
          >
            <div className="jpp-an__grid">
              <TotalsRow totals={data.totals} reduce={reduce} />
              <VolumeChart series={data.series} reduce={reduce} />
              <Funnel rows={data.funnel} reduce={reduce} />
              <DwellChips dwell={data.dwell} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
