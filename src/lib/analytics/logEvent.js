// Unified triple-write analytics helper.
//
// logEvent(eventType, metadata?, options?) fans out to three sinks in
// parallel — Supabase (candidate_events), PostHog (capture), and
// Microsoft Clarity (custom tag). Each sink has its own try/catch so a
// failure in one never blocks the others. All calls are fire-and-forget;
// the helper returns void synchronously.
//
// Triple-write architecture: candidate_events (Supabase, authed-only due
// to RLS), PostHog (all users), Clarity custom tag (all users). The three
// sinks are independent — failure or skip in one does not block the others.

import { supabase } from "../../appSupabaseClient";
import { trackPostHog } from "./posthog";
import { tagClarity } from "./clarity";
import { currentAuthUserId } from "./authState";

export function logEvent(eventType, metadata, options) {
  if (!eventType || typeof eventType !== "string") return;
  const meta = metadata && typeof metadata === "object" ? metadata : null;
  const explicitUserId = options && Object.prototype.hasOwnProperty.call(options, "userId")
    ? options.userId
    : undefined;
  const candidateId = explicitUserId !== undefined ? explicitUserId : currentAuthUserId();

  // (a) Supabase candidate_events — gated on a real authed user.
  // Anon writes to candidate_events are blocked by RLS (42501). For events
  // where candidateId is null, we skip the Supabase write — PostHog and
  // Clarity still receive the event, which is sufficient for our funnel
  // analysis. This avoids opening an attack surface (anon-writable table).
  // `candidateId != null` (loose equality) intentionally catches both
  // null and undefined; any string UUID passes.
  try {
    if (supabase && candidateId != null) {
      supabase
        .from("candidate_events")
        .insert({
          event_type: eventType,
          candidate_id: candidateId,
          metadata: meta,
        })
        .then(({ error }) => {
          if (error) console.warn("[logEvent] supabase insert failed", error);
        });
    }
  } catch (e) {
    console.warn("[logEvent] supabase write threw", e);
  }

  try { trackPostHog(eventType, meta || undefined); } catch (e) { console.warn("[logEvent] posthog threw", e); }
  try { tagClarity(eventType); } catch (e) { console.warn("[logEvent] clarity threw", e); }
}
