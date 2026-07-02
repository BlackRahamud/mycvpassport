import {
  applicantsOverTime,
  stageFunnel,
  medianTimeInStage,
  pipelineTotals,
  formatDuration,
  median,
} from "./pipelineAnalytics";

const NOW = new Date("2026-07-02T15:00:00.000Z");
const day = (offset, hour = "10:00:00") => `2026-${offset}T${hour}.000Z`;

const APPS = [
  { id: "a1", candidate_id: "c1", status: "hired",       applied_at: "2026-06-05T10:00:00.000Z" },
  { id: "a2", candidate_id: "c2", status: "interviewing", applied_at: "2026-06-20T10:00:00.000Z" },
  { id: "a3", candidate_id: "c3", status: "shortlisted", applied_at: "2026-06-20T12:00:00.000Z" },
  { id: "a4", candidate_id: "c4", status: "rejected",    applied_at: "2026-06-28T10:00:00.000Z" },
  { id: "a5", candidate_id: "c5", status: "new",         applied_at: "2026-07-02T08:00:00.000Z" },
  { id: "a6", candidate_id: null, status: "offered",     applied_at: "2026-05-01T10:00:00.000Z" }, // old + no candidate id
];

// c1: applied 5 Jun → shortlisted 7 Jun → interviewing 10 Jun → offered 14 Jun → hired 20 Jun
// c4: applied 28 Jun → interviewed 30 Jun (event) → rejected 1 Jul
const EVENTS = [
  { candidate_id: "c1", event_type: "shortlisted",  created_at: "2026-06-07T10:00:00.000Z" },
  { candidate_id: "c1", event_type: "interviewing", created_at: "2026-06-10T10:00:00.000Z" },
  { candidate_id: "c1", event_type: "offered",      created_at: "2026-06-14T10:00:00.000Z" },
  { candidate_id: "c1", event_type: "hired",        created_at: "2026-06-20T10:00:00.000Z" },
  { candidate_id: "c4", event_type: "interviewed",  created_at: "2026-06-30T10:00:00.000Z" },
  { candidate_id: "c4", event_type: "rejected",     created_at: "2026-07-01T10:00:00.000Z" },
];

describe("applicantsOverTime", () => {
  test("buckets the last 30 days by applied_at, including rejected candidates", () => {
    const rows = applicantsOverTime(APPS, { days: 30, now: NOW });
    expect(rows).toHaveLength(30);
    expect(rows[rows.length - 1]).toEqual({ date: "2026-07-02", count: 1 }); // a5 today
    expect(rows.find((r) => r.date === "2026-06-20").count).toBe(2); // a2 + a3
    expect(rows.find((r) => r.date === "2026-06-28").count).toBe(1); // a4 (rejected still counts as an applicant)
    // In-window: a1 (5 Jun), a2+a3 (20 Jun), a4 (28 Jun), a5 (today) = 5.
    // a6 applied 1 May — outside the 30-day window, not counted anywhere.
    expect(rows.reduce((s, r) => s + r.count, 0)).toBe(5);
  });
});

describe("stageFunnel", () => {
  test("counts entering each stage from history + current status, with drop-off", () => {
    const rows = stageFunnel(APPS, EVENTS);
    // Max reached rank per app: a1 hired(4) · a2 interviewing(2) ·
    // a3 shortlisted(0) · a4 rejected-but-interviewed-via-events(2) ·
    // a5 new(0) · a6 offered(3).
    expect(rows.map((r) => `${r.key}:${r.count}`)).toEqual([
      "applied:6",     // everyone, incl. rejected
      "shortlist:6",   // every app reached at least shortlist
      "ready:4",       // a1, a2, a4, a6
      "interviewed:4", // a1, a2, a4, a6
      "offer:2",       // a1, a6
      "hired:1",       // a1
    ]);
    const hiredRow = rows.find((r) => r.key === "hired");
    expect(hiredRow.dropFromPrev).toBe(50); // 2 → 1
  });

  test("rejected-after-interview still counts as having entered Interviewed (history wins)", () => {
    const rows = stageFunnel(APPS, EVENTS);
    const interviewed = rows.find((r) => r.key === "interviewed");
    // a1 (hired), a2 (interviewing), a4 (interviewed then rejected),
    // a6 (offered implies it passed interviewed) = 4
    expect(interviewed.count).toBe(4);
  });

  test("empty pipeline → zero counts, null drop-offs (no divide-by-zero)", () => {
    const rows = stageFunnel([], []);
    expect(rows.every((r) => r.count === 0)).toBe(true);
    expect(rows.slice(1).every((r) => r.dropFromPrev === null)).toBe(true);
  });
});

describe("medianTimeInStage", () => {
  test("computes medians only from completed intervals", () => {
    const out = medianTimeInStage(APPS, EVENTS);
    // Shortlist completed intervals: c1 = applied 5 Jun → interviewing
    // 10 Jun = 5d (the 7 Jun 'shortlisted' event is the SAME stage as
    // applied, so it does not restart the clock); c4 = 28 → 30 Jun = 2d.
    // Median of [5d, 2d] (even count) = 3.5d.
    expect(out.shortlist.samples).toBe(2);
    expect(out.shortlist.medianMs).toBe(3.5 * 86400000);
    // interviewed stage: c1 (10→14 Jun) completed; c4's interviewed→rejected
    // (30 Jun→1 Jul) also completes on rejection = 2 samples
    expect(out.interviewed.samples).toBe(2);
    expect(out.interviewed.medianMs).toBe(
      Math.round(((4 * 86400000) + (1 * 86400000)) / 2),
    );
  });

  test("sparse stages degrade to null medians, never fake numbers", () => {
    const out = medianTimeInStage(APPS, EVENTS);
    // offer stage: only c1 completed (14→20 Jun) = 1 sample < 2 → null
    expect(out.offer.samples).toBe(1);
    expect(out.offer.medianMs).toBeNull();
    // hired: terminal stage, no completed intervals
    expect(out.hired.medianMs).toBeNull();
  });

  test("no events at all → every stage degrades gracefully", () => {
    const out = medianTimeInStage(APPS, []);
    Object.values(out).forEach((v) => expect(v.medianMs).toBeNull());
  });
});

describe("pipelineTotals", () => {
  test("total / active / rejected / hired", () => {
    expect(pipelineTotals(APPS)).toEqual({ total: 6, active: 4, rejected: 1, hired: 1 });
    expect(pipelineTotals([])).toEqual({ total: 0, active: 0, rejected: 0, hired: 0 });
  });
});

describe("tenant scoping (by construction)", () => {
  test("aggregators consume only the rows passed in — nothing global", () => {
    // The page fetches applications/candidate_events for ONE job through
    // RLS-scoped queries; aggregation over a different tenant's rows is
    // impossible unless those rows were passed in. Prove pure behavior:
    const other = [{ id: "x", candidate_id: "cx", status: "hired", applied_at: day("06-01") }];
    expect(pipelineTotals(other).total).toBe(1);
    expect(pipelineTotals(APPS).total).toBe(6); // unaffected by prior call
  });
});

describe("formatting helpers", () => {
  test("median of even/odd lists", () => {
    expect(median([1, 3])).toBe(2);
    expect(median([1, 2, 9])).toBe(2);
    expect(median([])).toBeNull();
  });
  test("formatDuration compact labels", () => {
    expect(formatDuration(45 * 60000)).toBe("45m");
    expect(formatDuration(6 * 3600000)).toBe("6h");
    expect(formatDuration(2 * 86400000)).toBe("2d");
    expect(formatDuration(2 * 86400000 + 4 * 3600000)).toBe("2d 4h");
    expect(formatDuration(null)).toBeNull();
  });
});
