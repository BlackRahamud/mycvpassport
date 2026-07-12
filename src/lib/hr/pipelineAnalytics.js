/**
 * Per-job pipeline analytics — pure aggregation over rows the page has
 * ALREADY fetched through RLS-scoped queries (applications +
 * candidate_events for one job owned by the signed-in recruiter).
 * Nothing here fetches; tenant isolation is inherited from the caller's
 * queries and enforced server-side by RLS.
 *
 * Honesty rules: medians come only from COMPLETED stage intervals with
 * enough samples; sparse data degrades to null ("Not enough data yet"),
 * never a faked number.
 */
import { STAGES, STAGE_BY_DB } from "./stages";

const DAY_MS = 86400000;
const STAGE_ORDER = STAGES.map((s) => s.key);

export function stageRankOfStatus(status) {
  const key = STAGE_BY_DB[status];
  return key ? STAGE_ORDER.indexOf(key) : -1; // 'rejected' & unknown → -1
}

const toDayKey = (d) => {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

/* 1) Applicants over time — one bucket per day for the last `days` days,
      counted from applied_at (application volume, independent of the
      candidate's current stage, so rejected applicants still count). */
export function applicantsOverTime(apps, { days = 30, now = new Date() } = {}) {
  const buckets = [];
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (let i = days - 1; i >= 0; i--) {
    buckets.push({ date: toDayKey(new Date(startOfToday.getTime() - i * DAY_MS)), count: 0 });
  }
  const byKey = new Map(buckets.map((b) => [b.date, b]));
  (apps || []).forEach((a) => {
    if (!a.applied_at) return;
    const d = new Date(a.applied_at);
    if (Number.isNaN(d.getTime())) return;
    const b = byKey.get(toDayKey(d));
    if (b) b.count += 1;
  });
  return buckets;
}

/* Highest stage a candidate has reached: max of current status rank and
   any candidate_events rank (history survives later rejection, so a
   candidate rejected after interview still counts as having entered
   Interviewed). */
function maxRankByApp(apps, events) {
  const eventsByCandidate = new Map();
  (events || []).forEach((e) => {
    const r = stageRankOfStatus(e.event_type);
    if (r < 0 || !e.candidate_id) return;
    const cur = eventsByCandidate.get(e.candidate_id);
    if (cur === undefined || r > cur) eventsByCandidate.set(e.candidate_id, r);
  });
  return (apps || []).map((a) => {
    const statusRank = stageRankOfStatus(a.status);
    const eventRank = a.candidate_id != null ? eventsByCandidate.get(a.candidate_id) : undefined;
    return Math.max(statusRank, eventRank === undefined ? -1 : eventRank);
  });
}

/* 2) Stage funnel — count of candidates who ENTERED each stage, with %
      drop-off from the previous step. "Applied" (everyone, including
      rejected) is the funnel base. */
export function stageFunnel(apps, events = []) {
  const ranks = maxRankByApp(apps, events);
  const rows = [{ key: "applied", label: "Applied", count: (apps || []).length, dropFromPrev: null }];
  STAGES.forEach((s, idx) => {
    const count = ranks.filter((r) => r >= idx).length;
    const prev = rows[rows.length - 1].count;
    rows.push({
      key: s.key,
      label: s.label,
      count,
      dropFromPrev: prev > 0 ? Math.round((1 - count / prev) * 100) : null,
    });
  });
  return rows;
}

/* 3) Median time-in-stage — durations between entering a stage and
      entering any LATER stage (or being rejected), from candidate_events
      timestamps; applied_at seeds the New (entry stage) interval. Open intervals
      (candidate still sitting in the stage) are excluded — only real,
      completed dwell times count. */
export function medianTimeInStage(apps, events = []) {
  const eventsByCandidate = new Map();
  (events || []).forEach((e) => {
    if (!e.candidate_id || !e.created_at) return;
    const list = eventsByCandidate.get(e.candidate_id) || [];
    list.push(e);
    eventsByCandidate.set(e.candidate_id, list);
  });

  const durations = STAGE_ORDER.reduce((m, k) => ({ ...m, [k]: [] }), {});

  (apps || []).forEach((a) => {
    if (!a.candidate_id) return;
    const chain = [];
    if (a.applied_at && !Number.isNaN(new Date(a.applied_at).getTime())) {
      chain.push({ rank: 0, t: new Date(a.applied_at).getTime(), rejected: false });
    }
    (eventsByCandidate.get(a.candidate_id) || []).forEach((e) => {
      const t = new Date(e.created_at).getTime();
      if (Number.isNaN(t)) return;
      const rank = stageRankOfStatus(e.event_type);
      if (rank >= 0) chain.push({ rank, t, rejected: false });
      else if (e.event_type === "rejected") chain.push({ rank: -1, t, rejected: true });
    });
    chain.sort((x, y) => x.t - y.t);

    let currentRank = null;
    let enteredAt = null;
    chain.forEach((step) => {
      if (step.rejected) {
        if (currentRank !== null && enteredAt !== null) {
          durations[STAGE_ORDER[currentRank]].push(step.t - enteredAt);
        }
        currentRank = null;
        enteredAt = null;
        return;
      }
      if (currentRank === null) {
        currentRank = step.rank;
        enteredAt = step.t;
        return;
      }
      if (step.rank > currentRank) {
        durations[STAGE_ORDER[currentRank]].push(step.t - enteredAt);
        currentRank = step.rank;
        enteredAt = step.t;
      }
      // backwards moves restart the clock in the earlier stage
      else if (step.rank < currentRank) {
        currentRank = step.rank;
        enteredAt = step.t;
      }
    });
    // whatever stage the chain ends in is an OPEN interval — excluded.
  });

  const out = {};
  STAGE_ORDER.forEach((k) => {
    const list = durations[k].filter((ms) => ms >= 0).sort((a, b) => a - b);
    out[k] = list.length >= 2
      ? { medianMs: median(list), samples: list.length }
      : { medianMs: null, samples: list.length };
  });
  return out;
}

export function median(sortedList) {
  if (!sortedList.length) return null;
  const mid = Math.floor(sortedList.length / 2);
  return sortedList.length % 2
    ? sortedList[mid]
    : Math.round((sortedList[mid - 1] + sortedList[mid]) / 2);
}

/* 4) Totals row. */
export function pipelineTotals(apps) {
  const list = apps || [];
  const rejected = list.filter((a) => a.status === "rejected").length;
  const hired = list.filter((a) => a.status === "hired").length;
  return {
    total: list.length,
    active: list.length - rejected - hired,
    rejected,
    hired,
  };
}

/* "2d 4h" / "6h" / "45m" — compact dwell-time label. */
export function formatDuration(ms) {
  if (ms == null) return null;
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  const remH = hours % 24;
  return remH ? `${days}d ${remH}h` : `${days}d`;
}
