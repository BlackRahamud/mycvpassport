// =============================================================
// src/lib/jobs/applyToJob.js
//
// The single application writer, shared by the board row (Easy Apply,
// no uploaded file) and the detail apply panel (Easy or a manual CV
// upload). Both paths write identically so the two never drift.
//
// Everything after the applications row is best-effort: a failed file
// upload, HR notification, candidate event, or profile persistence must
// never fail the application itself. The row landing is the promise we
// keep to the candidate; the rest is downstream.
// =============================================================

import { scoreApplicationStopgap } from "../ats/stopgapScorer";
import { builderCvToSnapshot } from "./cvSnapshot";

export async function applyToJob(
  supabase,
  { user, job, visaStatus = "", cvFile = null, cvFilename = "", existingApp = null, isEasyApply = true }
) {
  if (!supabase || !user?.id || !job?.id) return { ok: false, error: "Not ready to send" };

  try {
    const cooldown = new Date();
    cooldown.setDate(cooldown.getDate() + 7);

    const candidateName =
      user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "";
    const candidatePhone = user.user_metadata?.phone || user.user_metadata?.whatsapp || "";

    // Most recent CV blob → stopgap keyword score (Phase 1 rescan will overwrite).
    let cvBlob = null;
    try {
      const { data: cvRow } = await supabase
        .from("cvs")
        .select("cv_data")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      cvBlob = cvRow?.cv_data || null;
    } catch {
      /* best-effort — score with no CV */
    }

    // Reconcile the builder's camelCase cv_data onto the cv_snapshot contract
    // ONCE, here, before it is read by anything. Both the stopgap scorer and
    // the persisted snapshot get the canonical shape, so a board applicant is
    // scored on their real skills/experience/role, not near-blind. See
    // lib/jobs/cvSnapshot.js for the field-by-field mapping.
    const snapshot = cvBlob ? builderCvToSnapshot(cvBlob) : null;

    const scored = scoreApplicationStopgap({ jobRequirements: job.requirements, candidateCv: snapshot });

    // Keep the uploaded file in the private applicant-cvs bucket; the row
    // stores only the path. A failed upload keeps the application (the HR
    // just sees the parsed view). Only write the pointer when we actually
    // uploaded this time, so a reapply that skips the file keeps the prior one.
    let cvFilePath = null;
    if (cvFile) {
      try {
        const ext = (cvFilename.split(".").pop() || "pdf").toLowerCase().replace(/[^a-z0-9]/g, "") || "pdf";
        const path = `${user.id}/${job.id}-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("applicant-cvs")
          .upload(path, cvFile, { upsert: true, contentType: cvFile.type || undefined });
        if (upErr) throw upErr;
        cvFilePath = path;
      } catch {
        /* best-effort — keep the application without the file */
      }
    }

    const appData = {
      candidate_id: user.id,
      job_id: job.id,
      hr_id: job.hr_id,
      cv_snapshot: snapshot,
      ats_score: scored.score,
      match_keywords: scored.match_keywords,
      missing_keywords: scored.missing_keywords,
      score_source: scored.score_source,
      is_visible_to_hr: true,
      cooldown_expires_at: cooldown.toISOString(),
      status: "new",
      candidate_name: candidateName,
      candidate_email: user.email,
      candidate_phone: candidatePhone,
      visa_status: visaStatus,
      applied_at: new Date().toISOString(),
    };
    if (cvFilePath) appData.cv_file_path = cvFilePath;

    // The one write whose failure must surface to the candidate.
    if (existingApp) {
      const { error } = await supabase.from("applications").update(appData).eq("id", existingApp.id);
      if (error) throw error;
    } else {
      const { error } = await supabase.from("applications").insert(appData);
      if (error) throw error;
    }

    // Notify HR — best-effort.
    try {
      await supabase.from("hr_notifications").insert({
        hr_id: job.hr_id,
        candidate_id: user.id,
        job_id: job.id,
        title: `New applicant, ${candidateName}`,
        body: `Applied for ${job.title}`,
        type: "new_application",
      });
    } catch {
      /* best-effort */
    }

    // Candidate event — best-effort.
    try {
      await supabase.from("candidate_events").insert({
        candidate_id: user.id,
        job_id: job.id,
        hr_id: job.hr_id,
        event_type: existingApp ? "reapplied" : "applied",
        metadata: { source: isEasyApply ? "easy_apply" : "manual", visa_status: visaStatus },
      });
    } catch {
      /* best-effort */
    }

    // Persist visa + phone on the candidate profile so the next role is a
    // genuine one tap. Best-effort: silently no-ops until migration 041 adds
    // the columns, so this is safe to ship before the migration lands.
    try {
      const patch = {};
      if (visaStatus) patch.visa_status = visaStatus;
      if (candidatePhone) patch.phone = candidatePhone;
      if (Object.keys(patch).length) await supabase.from("profiles").update(patch).eq("id", user.id);
    } catch {
      /* columns may not exist yet */
    }

    return { ok: true, score: scored.score };
  } catch (err) {
    return { ok: false, error: err?.message || "Could not send, try again" };
  }
}
