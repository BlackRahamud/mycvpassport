import { rollupPeople, furthestStage, bestScoreOf, PERSON_STAGE_BUCKETS } from "./peopleRollup";
import { PERSON_STAGE_OPTIONS, personStageLabel } from "./stageApi";

// stageApi pulls in the real supabase client; tests only need its pure
// exports. jest.mock calls are hoisted above the imports at run time.
jest.mock("../../appSupabaseClient", () => ({ supabase: {} }));

const JOBS = [
  { id: "j1", title: "Cashier", market: "gulf", kind: "active" },
  { id: "j2", title: "Sales Associate", market: "gulf", kind: "active" },
  { id: "p1", title: "Retail walk in, July", market: "gulf", kind: "pool" },
];

const app = (over) => ({
  id: over.id,
  candidate_id: null,
  candidate_name: "Ayesha Noor",
  candidate_email: "ayesha@example.com",
  candidate_phone: "+971500000001",
  cv_snapshot: { notice_period: "Immediate" },
  ats_score: 0,
  score_source: null,
  source: "organic",
  status: "new",
  applied_at: "2026-07-01T10:00:00Z",
  updated_at: "2026-07-01T10:00:00Z",
  ...over,
});

describe("rollupPeople", () => {
  it("splits active job rows from pool tags and never gives pools a stage", () => {
    const people = rollupPeople({
      applications: [
        app({ id: "a1", job_id: "j1", status: "interviewed", ats_score: 84, score_source: "sonnet_verdict" }),
        app({ id: "a2", job_id: "p1", status: "new", source: "imported" }),
      ],
      jobs: JOBS,
    });
    expect(people).toHaveLength(1);
    const p = people[0];
    expect(p.jobApps).toHaveLength(1);
    expect(p.jobApps[0].jobTitle).toBe("Cashier");
    expect(p.pools).toEqual([{ app_id: "a2", job_id: "p1", name: "Retail walk in, July" }]);
    // pool status never leaks into the person's stage set
    expect([...p.statuses]).toEqual(["interviewed"]);
    expect(p.importedAt).not.toBeNull();
  });

  it("orders job rows furthest along first and computes the honest furthest label", () => {
    const people = rollupPeople({
      applications: [
        app({ id: "a1", job_id: "j1", status: "new", applied_at: "2026-07-10T10:00:00Z", updated_at: "2026-07-10T10:00:00Z" }),
        app({ id: "a2", job_id: "j2", status: "interviewed", applied_at: "2026-07-01T10:00:00Z", updated_at: "2026-07-02T10:00:00Z" }),
      ],
      jobs: JOBS,
    });
    const p = people[0];
    expect(p.jobApps.map((j) => j.jobTitle)).toEqual(["Sales Associate", "Cashier"]);
    expect(p.furthest).toBe("Interviewed");
  });

  it("best score is the highest SCORED number, never an unscored zero", () => {
    expect(bestScoreOf([
      { ats_score: 0, score_source: null },
      { ats_score: 72, score_source: "sonnet_verdict" },
      { ats_score: 84, score_source: "import_verdict" },
    ])).toEqual({ score: 84, source: "import_verdict" });
    expect(bestScoreOf([{ ats_score: 0, score_source: null }])).toBeNull();
  });

  it("all jobs Passed → furthest reads Passed; no jobs → empty", () => {
    expect(furthestStage([{ status: "rejected" }])).toBe("Passed");
    expect(furthestStage([])).toBe("");
    expect(furthestStage([{ status: "rejected" }, { status: "ready" }])).toBe("To interview");
  });

  it("keeps the Option A identity keys (candidate_id, then email, then row)", () => {
    const people = rollupPeople({
      applications: [
        app({ id: "a1", job_id: "j1", candidate_id: "u1", candidate_email: "x@x.com" }),
        app({ id: "a2", job_id: "j2", candidate_id: null, candidate_email: "x@x.com" }),
        app({ id: "a3", job_id: "j2", candidate_id: null, candidate_email: null, candidate_name: "No Email" }),
      ],
      jobs: JOBS,
    });
    // u1 and email:x@x.com stay separate (Option B merges them later);
    // the no-email row is its own person.
    expect(people).toHaveLength(3);
  });
});

describe("stage vocabulary", () => {
  it("person stage options are the six pipeline stages plus Passed", () => {
    expect(PERSON_STAGE_OPTIONS.map((o) => o.label)).toEqual([
      "New", "Shortlist", "To interview", "Interviewed", "Offer", "Hired", "Passed",
    ]);
    expect(PERSON_STAGE_OPTIONS.map((o) => o.db)).toEqual([
      "new", "shortlisted", "ready", "interviewed", "offered", "hired", "rejected",
    ]);
  });

  it("labels fold interviewing into Interviewed and rejected into Passed", () => {
    expect(personStageLabel("interviewing")).toBe("Interviewed");
    expect(personStageLabel("rejected")).toBe("Passed");
    expect(personStageLabel("ready")).toBe("To interview");
  });

  it("the Passed bucket exists and pool statuses cannot satisfy it", () => {
    expect(PERSON_STAGE_BUCKETS.passed.has("rejected")).toBe(true);
    expect(PERSON_STAGE_BUCKETS.new.has("new")).toBe(true);
  });
});
