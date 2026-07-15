/**
 * stageApi — the LOCKED stage-move API for people surfaces.
 *
 * Every stage write goes through setApplicationStage and REQUIRES the exact
 * application id. There is deliberately no "move this person" entry point:
 * a person can be on several jobs at once, and any API that resolves a
 * person to an application (newest, best, whatever) will eventually write
 * the wrong job's stage from a stale client. Callers must already know
 * WHICH job's row they are moving.
 *
 * Writes mirror the pipeline's path: applications.status (+ updated_at),
 * the 037 reject columns when passing (with a status-only retry for a
 * database that has not run 037), and a best-effort candidate_events row.
 */
import { supabase } from "../../appSupabaseClient";
import { STAGES, STAGE_DROP_STATUS } from "./stages";
import { buildStageMoveWrites } from "./stageMove";
import { trackHr } from "../analytics/hrEvents";

/* The person-facing stage list on the Candidates tab: the six pipeline
   stages plus Passed. `db` is the canonical status written when the stage
   is chosen (same map the kanban drop uses); display labels come from
   stages.js so a rename there flows here automatically. */
export const PERSON_STAGE_OPTIONS = [
  ...STAGES.map((s) => ({ key: s.key, label: s.label, db: STAGE_DROP_STATUS[s.key] })),
  { key: "passed", label: "Passed", db: "rejected" },
];

/* status string → display label ("interviewing" folds into Interviewed). */
export function personStageLabel(status) {
  if (status === "rejected") return "Passed";
  const stage = STAGES.find((s) => s.dbValues.includes(status));
  return stage ? stage.label : (status ? String(status) : "Not set");
}

/**
 * setApplicationStage({ applicationId, newStatus, app, hrId, rejectReason })
 * → { ok, degraded?, error? }
 *
 * applicationId is REQUIRED and is the only row that can move.
 * app is the current row (for optimistic-revert data + the events payload).
 * rejectReason (a rejectReasons.js code) is required when newStatus is
 * 'rejected' by the calling UI (the modal enforces it); here it is written
 * best-effort with a pre-037 fallback.
 */
export async function setApplicationStage({ applicationId, newStatus, app, hrId, rejectReason = null }) {
  if (!applicationId) return { ok: false, error: new Error("applicationId is required") };
  if (!newStatus) return { ok: false, error: new Error("newStatus is required") };

  const writes = buildStageMoveWrites({ app, newStatus, hrId });
  const iso = writes.statusUpdate.updated_at;
  const base = writes.statusUpdate;
  const full = newStatus === "rejected"
    ? {
        ...base,
        reject_reason: rejectReason,
        rejected_at: iso,
        reject_notify_at: new Date(new Date(iso).getTime() + 24 * 3600 * 1000).toISOString(),
      }
    : (app?.status === "rejected"
      // Leaving Passed clears the reject bookkeeping (mirror of ReviewMode undo).
      ? { ...base, reject_reason: null, rejected_at: null, reject_notify_at: null }
      : base);

  let { error } = await supabase.from("applications").update(full).eq("id", applicationId);
  let degraded = false;
  if (error && /column|schema cache/i.test(error.message || "")) {
    ({ error } = await supabase.from("applications").update(base).eq("id", applicationId));
    degraded = true;
  }
  if (error) return { ok: false, error };

  if (writes.event) {
    supabase.from("candidate_events").insert(writes.event).then(
      () => {},
      (e) => console.warn("[stageApi] event insert failed:", e?.message || e), // eslint-disable-line no-console
    );
  }
  // Raw db statuses are the fixed stage enum. Covers every people surface
  // (Candidates, companion, schedule). The kanban writes its own path
  // (JobPipelinePage.updateStatus) and fires there.
  trackHr("hr_candidate_stage_changed", { from_stage: app?.status || null, to_stage: newStatus });
  return { ok: true, degraded, updatedAt: iso };
}
