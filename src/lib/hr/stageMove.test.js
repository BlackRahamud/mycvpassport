import { buildStageMoveWrites } from "./stageMove";
import { STAGES, STAGE_BY_DB, STAGE_DROP_STATUS } from "./stages";

const APP = {
  id: "app-1",
  job_id: "job-1",
  candidate_id: "cand-1",
  status: "shortlisted",
  candidate_name: "Rahul Sharma",
};
const NOW = new Date("2026-07-02T12:00:00.000Z");

describe("buildStageMoveWrites — one write path for list AND kanban", () => {
  test("status update + candidate_events payload match the historical shape", () => {
    const w = buildStageMoveWrites({ app: APP, newStatus: "interviewed", hrId: "hr-1", now: NOW });
    expect(w.statusUpdate).toEqual({ status: "interviewed", updated_at: "2026-07-02T12:00:00.000Z" });
    expect(w.event).toEqual({
      candidate_id: "cand-1",
      job_id: "job-1",
      hr_id: "hr-1",
      event_type: "interviewed",
      metadata: { previous_status: "shortlisted", source: "hr_pipeline" },
    });
  });

  test("kanban drop and list advance produce IDENTICAL writes for the same move", () => {
    // List path: advance button writes stageDef.advanceTo.
    const listWrite = buildStageMoveWrites({ app: APP, newStatus: "interviewed", hrId: "hr-1", now: NOW });
    // Kanban path: dropping into the 'interviewed' column writes
    // STAGE_DROP_STATUS.interviewed.
    const kanbanWrite = buildStageMoveWrites({
      app: APP, newStatus: STAGE_DROP_STATUS.interviewed, hrId: "hr-1", now: NOW,
    });
    expect(kanbanWrite).toEqual(listWrite);
  });

  test("no candidate_id or no hrId → no history event (status write only)", () => {
    expect(buildStageMoveWrites({ app: { ...APP, candidate_id: null }, newStatus: "hired", hrId: "hr-1", now: NOW }).event).toBeNull();
    expect(buildStageMoveWrites({ app: APP, newStatus: "hired", hrId: null, now: NOW }).event).toBeNull();
  });
});

describe("stage config invariants", () => {
  test("every stage has a drop status, and it maps back to that stage", () => {
    STAGES.forEach((s) => {
      const drop = STAGE_DROP_STATUS[s.key];
      expect(drop).toBeTruthy();
      expect(STAGE_BY_DB[drop]).toBe(s.key);
    });
  });

  test("every advanceTo target is a known DB status of some stage", () => {
    STAGES.filter((s) => s.advanceTo).forEach((s) => {
      expect(STAGE_BY_DB[s.advanceTo]).toBeTruthy();
    });
  });
});
