/**
 * peopleRollup — pure aggregation for the Candidates tab (Option A).
 *
 * Rolls the recruiter's application rows into PEOPLE, the mental model the
 * tab speaks. Everything here is honest about the person vs job split:
 *  - jobApps: one entry per ACTIVE job the person is on, each carrying its
 *    OWN stage and its OWN score. There is no "the person's stage".
 *  - pools: names of the pools holding them (pool rows never carry a stage
 *    in the UI).
 *  - bestScore: the highest scored number across their jobs, shown on the
 *    person card; per job numbers live on the job rows.
 *  - furthest: the furthest non-Passed stage across their jobs, clearly
 *    labeled on multi job cards ("Furthest: Interviewed").
 *
 * Identity is still the Option A key (candidate_id, else email, else the
 * row itself). The person table + dedup work is Option B, later.
 */
import { STAGES, STAGE_BY_DB } from "./stages";

const ts = (s) => { const t = s ? new Date(s).getTime() : 0; return Number.isNaN(t) ? 0 : t; };
const STAGE_ORDER = STAGES.map((s) => s.key);

export function getCv(a) { return a?.cv_snapshot || a?.cv_data || {}; }

/* Availability derived from the candidate's stated notice period (free text
   on the CV). Bucket only when the text is unambiguous; `line` is the
   natural phrase shown on the card. */
export function deriveAvailability(cv) {
  const personal = cv.personal || cv.basics || {};
  const raw = String(cv.notice_period || cv.availability || personal.notice_period || personal.availability || "").toLowerCase();
  if (!raw) return { bucket: "unknown", line: "" };
  if (/(immediate|available now|ready to join|right away|no notice|0\s*day|join now)/.test(raw)) return { bucket: "immediate", line: "immediately available" };
  if (/(1\s*week|one week|7\s*day)/.test(raw)) return { bucket: "soon", line: "1 week notice" };
  if (/(2\s*week|two week|fortnight|10\s*day|15\s*day)/.test(raw)) return { bucket: "soon", line: "2 weeks notice" };
  if (/(1\s*month|one month|30\s*day|4\s*week)/.test(raw)) return { bucket: "soon", line: "1 month notice" };
  if (/(2\s*month|two month|60\s*day)/.test(raw)) return { bucket: "notice", line: "2 months notice" };
  if (/(3\s*month|three month|90\s*day)/.test(raw)) return { bucket: "notice", line: "3 months notice" };
  if (/(6\s*month|six month)/.test(raw)) return { bucket: "notice", line: "6 months notice" };
  return { bucket: "unknown", line: "" };
}

/* Person-level stage filter buckets. A person matches when ANY of their
   ACTIVE job rows sits in the bucket; pool rows never count (a pool is a
   holding list, not a stage). Passed finally has a home. */
export const PERSON_STAGE_BUCKETS = {
  all: null,
  new: new Set(["new", "submitted", "viewed"]),
  shortlist: new Set(["shortlisted"]),
  ready: new Set(["ready"]),
  interviewed: new Set(["interviewed", "interviewing"]),
  offer: new Set(["offered"]),
  hired: new Set(["hired"]),
  passed: new Set(["rejected"]),
};
export const PERSON_STAGE_FILTER_OPTIONS = [
  { key: "all", label: "Any stage" },
  { key: "new", label: "New" },
  { key: "shortlist", label: "Shortlist" },
  { key: "ready", label: "To interview" },
  { key: "interviewed", label: "Interviewed" },
  { key: "offer", label: "Offer" },
  { key: "hired", label: "Hired" },
  { key: "passed", label: "Passed" },
];

/* Furthest non-Passed stage label across a person's jobs. All Passed →
   "Passed"; no jobs → "". */
export function furthestStage(jobApps) {
  const active = (jobApps || []).filter((j) => j.status !== "rejected");
  if (!active.length) return (jobApps || []).length ? "Passed" : "";
  let best = -1;
  active.forEach((j) => {
    const key = STAGE_BY_DB[j.status];
    const idx = key ? STAGE_ORDER.indexOf(key) : 0;
    if (idx > best) best = idx;
  });
  return best >= 0 ? STAGES[best].label : "";
}

/* Highest scored number across rows that were actually scored. */
export function bestScoreOf(apps) {
  let best = null;
  (apps || []).forEach((a) => {
    if (!a.score_source) return; // never scored → not a number
    const n = Number(a.ats_score);
    if (!Number.isNaN(n) && (best == null || n > best.score)) {
      best = { score: n, source: a.score_source };
    }
  });
  return best; // null when nobody scored anything
}

/**
 * rollupPeople({ applications, jobs }) → people sorted newest activity first.
 */
export function rollupPeople({ applications = [], jobs = [] } = {}) {
  const jobMap = new Map(jobs.map((j) => [j.id, j]));
  const byKey = new Map();

  applications.forEach((a) => {
    const key = a.candidate_id
      || (a.candidate_email ? `email:${String(a.candidate_email).toLowerCase()}` : `app:${a.id}`);
    let c = byKey.get(key);
    if (!c) { c = { key, rows: [] }; byKey.set(key, c); }
    c.rows.push(a);
  });

  return [...byKey.values()].map((c) => {
    const rows = c.rows;
    const latest = rows.reduce((best, a) => (ts(a.applied_at) >= ts(best.applied_at) ? a : best), rows[0]);

    const jobApps = [];
    const pools = [];
    rows.forEach((a) => {
      const job = jobMap.get(a.job_id);
      const kind = job?.kind || "active";
      if (kind === "pool") {
        pools.push({ app_id: a.id, job_id: a.job_id, name: job?.title || "Talent pool" });
        return;
      }
      jobApps.push({
        app_id: a.id,
        job_id: a.job_id,
        jobTitle: job?.title || "Untitled role",
        market: job?.market || "gulf",
        status: a.status,
        source: a.source,
        reject_reason: a.reject_reason || null,
        applied_at: a.applied_at,
        updated_at: a.updated_at,
        ats_score: a.ats_score,
        score_source: a.score_source,
        raw: a,
      });
    });

    // Profile order: furthest along first, then most recent movement.
    jobApps.sort((x, y) => {
      const rank = (j) => {
        if (j.status === "rejected") return -1;
        const key = STAGE_BY_DB[j.status];
        return key ? STAGE_ORDER.indexOf(key) : 0;
      };
      return rank(y) - rank(x) || ts(y.updated_at || y.applied_at) - ts(x.updated_at || x.applied_at);
    });

    const importedRows = rows.filter((a) => a.source === "imported");
    const importedAt = importedRows.length
      ? importedRows.reduce((m, a) => Math.min(m, ts(a.applied_at) || m), Infinity)
      : null;

    const best = bestScoreOf(rows);
    const cv = getCv(latest);
    const avail = deriveAvailability(cv);
    const latestAt = rows.reduce((m, a) => Math.max(m, ts(a.updated_at), ts(a.applied_at)), 0);

    return {
      key: c.key,
      record: latest,
      name: latest.candidate_name || "Unnamed candidate",
      email: latest.candidate_email || "",
      phone: latest.candidate_phone || "",
      visa: latest.visa_status || "",
      bestScore: best ? best.score : null,
      bestScoreSource: best ? best.source : null,
      jobApps,
      pools,
      importedAt: importedAt && importedAt !== Infinity ? new Date(importedAt) : null,
      furthest: furthestStage(jobApps),
      markets: new Set(jobApps.map((j) => j.market)),
      statuses: new Set(jobApps.map((j) => j.status)),
      availability: avail.bucket,
      availabilityLine: avail.line,
      latestAt,
    };
  }).sort((x, y) => y.latestAt - x.latestAt);
}
