/**
 * Single source of truth for what a stage move WRITES. Both pipeline
 * views (stage list and kanban) build their persistence payloads here,
 * so history (candidate_events), notifications and RLS behavior are
 * identical no matter which surface moved the candidate.
 *
 * Pure — timestamps injected for testability. RLS note: these payloads
 * are written with the signed-in recruiter's client; applications UPDATE
 * and candidate_events INSERT policies scope by hr_id = auth.uid(), so
 * tenant isolation is enforced server-side regardless of this code.
 */
export function buildStageMoveWrites({ app, newStatus, hrId, now = new Date() }) {
  const iso = now.toISOString();
  return {
    statusUpdate: { status: newStatus, updated_at: iso },
    event:
      app?.candidate_id && hrId
        ? {
            candidate_id: app.candidate_id,
            job_id: app.job_id,
            hr_id: hrId,
            event_type: newStatus,
            metadata: { previous_status: app.status, source: "hr_pipeline" },
          }
        : null,
  };
}
