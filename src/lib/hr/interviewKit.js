/**
 * Interview kit persistence — the kit lives on the interview row
 * (interviews.kit jsonb, migration 039) so nothing dies on refresh, and
 * her question bank lives in interview_question_sets, one set per
 * (hr, job): "Save these as my set for <role>".
 *
 * Kit shape (owned here — the migration comment points at this file):
 *   { questions: [{ id, category, question, listen_for, source }],
 *     asked:   { [questionId]: true },
 *     notes:   { [questionId]: "text" },
 *     generated_at: iso | null }
 *
 * source: 'ai' | 'yours'. Her own questions carry category 'yours', show
 * the purple "Your question" chip, and have no listen_for line. Regenerate
 * replaces ONLY source 'ai' questions, never hers.
 *
 * All mutators are pure (kit in, new kit out); the two save functions are
 * the only writes.
 */
import { supabase } from "../../appSupabaseClient";
import safeFetch from "../net/safeFetch";

export function newQuestionId() {
  try {
    return crypto.randomUUID();
  } catch {
    return `q-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  }
}

export const KIT_CATEGORY_LABELS = {
  technical: "Technical",
  experience: "Experience",
  corridor: "Corridor",
  behavioral: "Behavioral",
  yours: "Your question",
};

export function emptyKit() {
  return { questions: [], asked: {}, notes: {}, generated_at: null };
}

/** Coerce whatever is stored into the kit contract; null stays null. */
export function normalizeKit(raw) {
  if (!raw || typeof raw !== "object") return null;
  const questions = Array.isArray(raw.questions)
    ? raw.questions
        .filter((q) => q && typeof q.question === "string" && q.question.trim())
        .map((q) => ({
          id: q.id || newQuestionId(),
          category: KIT_CATEGORY_LABELS[q.category] ? q.category : (q.source === "yours" ? "yours" : "experience"),
          question: q.question.trim(),
          listen_for: typeof q.listen_for === "string" ? q.listen_for.trim() : "",
          source: q.source === "yours" ? "yours" : "ai",
        }))
    : [];
  return {
    questions,
    asked: raw.asked && typeof raw.asked === "object" ? { ...raw.asked } : {},
    notes: raw.notes && typeof raw.notes === "object" ? { ...raw.notes } : {},
    generated_at: raw.generated_at || null,
  };
}

/** AI response questions → kit questions (tagged, id stamped). */
export function questionsFromAi(aiQuestions) {
  return (Array.isArray(aiQuestions) ? aiQuestions : []).map((q) => ({
    id: newQuestionId(),
    category: q.category || "experience",
    question: q.question,
    listen_for: q.listen_for || "",
    source: "ai",
  }));
}

/** A brand new kit from an AI generation (or a saved set preload). */
export function kitFromQuestions(questions, { generatedAt = new Date().toISOString() } = {}) {
  return { questions, asked: {}, notes: {}, generated_at: generatedAt };
}

/* ── Pure mutators ── */

export function toggleAsked(kit, questionId) {
  const asked = { ...kit.asked };
  if (asked[questionId]) delete asked[questionId];
  else asked[questionId] = true;
  return { ...kit, asked };
}

export function setQuestionNote(kit, questionId, text) {
  const notes = { ...kit.notes };
  if (text && text.trim()) notes[questionId] = text;
  else delete notes[questionId];
  return { ...kit, notes };
}

export function addOwnQuestion(kit, text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return kit;
  const q = { id: newQuestionId(), category: "yours", question: trimmed, listen_for: "", source: "yours" };
  return { ...kit, questions: [...kit.questions, q] };
}

export function updateQuestionText(kit, questionId, text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return kit;
  return {
    ...kit,
    questions: kit.questions.map((q) => (q.id === questionId ? { ...q, question: trimmed } : q)),
  };
}

export function removeQuestion(kit, questionId) {
  const asked = { ...kit.asked };
  const notes = { ...kit.notes };
  delete asked[questionId];
  delete notes[questionId];
  return { ...kit, questions: kit.questions.filter((q) => q.id !== questionId), asked, notes };
}

/**
 * Regenerate: the fresh AI questions land first, her own questions keep
 * their relative order after them. Asked flags and notes survive for the
 * questions that survive (hers); the replaced AI questions drop theirs.
 */
export function replaceAiQuestions(kit, freshAiQuestions) {
  const hers = kit.questions.filter((q) => q.source === "yours");
  const keepIds = new Set(hers.map((q) => q.id));
  const asked = {};
  const notes = {};
  Object.keys(kit.asked).forEach((id) => { if (keepIds.has(id)) asked[id] = true; });
  Object.keys(kit.notes).forEach((id) => { if (keepIds.has(id)) notes[id] = kit.notes[id]; });
  return {
    questions: [...freshAiQuestions, ...hers],
    asked,
    notes,
    generated_at: new Date().toISOString(),
  };
}

export function askedCount(kit) {
  if (!kit) return 0;
  const ids = new Set(kit.questions.map((q) => q.id));
  return Object.keys(kit.asked).filter((id) => ids.has(id)).length;
}

/* ── Persistence ── */

/** Write the kit to its interview row. Best-effort callers may ignore errors. */
export async function saveKit(interviewId, kit) {
  if (!interviewId) return { ok: false, error: new Error("interviewId is required") };
  const { error } = await supabase.from("interviews").update({ kit }).eq("id", interviewId);
  return error ? { ok: false, error } : { ok: true };
}

/** Her saved set for a job, or null. Returns kit-shaped questions. */
export async function loadRoleSet(hrId, jobId) {
  if (!hrId || !jobId) return null;
  const { data } = await supabase
    .from("interview_question_sets")
    .select("questions")
    .eq("hr_id", hrId)
    .eq("job_id", jobId)
    .maybeSingle();
  const questions = Array.isArray(data?.questions) ? data.questions : null;
  if (!questions || !questions.length) return null;
  return normalizeKit({ questions }).questions;
}

/** "Save these as my set for <role>": upsert the current question list. */
export async function saveRoleSet(hrId, jobId, questions) {
  if (!hrId || !jobId) return { ok: false, error: new Error("hrId and jobId are required") };
  const { error } = await supabase
    .from("interview_question_sets")
    .upsert(
      { hr_id: hrId, job_id: jobId, questions, updated_at: new Date().toISOString() },
      { onConflict: "hr_id,job_id" },
    );
  return error ? { ok: false, error } : { ok: true };
}

/**
 * The one AI call, shared by the prep card and the companion.
 * Base generation is Haiku and free; `tailored: true` is the explicit
 * regenerate, Sonnet plus 1 shared-pool credit (server enforces).
 * Resolves the full job from jobId when the caller only had a stub.
 * → { ok: true, questions } (kit-shaped) | { ok: false, error, capped? }
 */
export async function generateKitQuestions({ cvSnapshot, job, jobId, verdictGap, tailored = false }) {
  let fullJob = job;
  if ((!fullJob || fullJob.description == null) && jobId) {
    const { data: jrow } = await supabase
      .from("jobs")
      .select("title, description, skills, requirements")
      .eq("id", jobId)
      .maybeSingle();
    if (jrow) fullJob = jrow;
  }
  const { data: { session } = {} } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) return { ok: false, error: "Please sign in again." };
  try {
    const res = await safeFetch("/api/ai?action=interview_kit", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        cvSnapshot: cvSnapshot || null,
        job: {
          title: fullJob?.title || "",
          description: fullJob?.description || "",
          skills: fullJob?.skills || [],
          requirements: fullJob?.requirements || [],
        },
        verdictGap: verdictGap || "",
        tailored,
      }),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok || !Array.isArray(out.questions) || out.questions.length === 0) {
      return {
        ok: false,
        capped: res.status === 402,
        error: out.error || "The questions could not be generated. Please try again.",
      };
    }
    return { ok: true, questions: questionsFromAi(out.questions) };
  } catch {
    return { ok: false, error: "The questions could not be generated. Please try again." };
  }
}

/**
 * The latest interview row for an application (the kit's home).
 * Prefers the most recent by scheduled_at; returns null when none.
 */
const INTERVIEW_COLUMNS = "id, application_id, job_id, scheduled_at, duration_min, meeting_link, note, status, kit, rating, rating_note, candidate_tz, ics_sequence, candidate_id";
const INTERVIEW_COLUMNS_LEGACY = "id, application_id, job_id, scheduled_at, duration_min, meeting_link, note, status, candidate_id";

/** One interview row by id (RLS scopes to the owning HR). */
export async function loadInterviewById(interviewId) {
  if (!interviewId) return null;
  const { data, error } = await supabase
    .from("interviews")
    .select(INTERVIEW_COLUMNS)
    .eq("id", interviewId)
    .maybeSingle();
  if (!error) return data || null;
  // Pre-039 database: retry without the kit columns.
  const { data: legacy } = await supabase
    .from("interviews")
    .select(INTERVIEW_COLUMNS_LEGACY)
    .eq("id", interviewId)
    .maybeSingle();
  return legacy || null;
}

export async function loadLatestInterview(hrId, applicationId) {
  if (!hrId || !applicationId) return null;
  const { data, error } = await supabase
    .from("interviews")
    .select("id, application_id, job_id, scheduled_at, duration_min, meeting_link, note, status, kit, rating, rating_note, candidate_tz, ics_sequence, candidate_id")
    .eq("hr_id", hrId)
    .eq("application_id", applicationId)
    .order("scheduled_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!error) return data || null;
  // Pre-039 database: retry without the kit columns.
  const { data: legacy } = await supabase
    .from("interviews")
    .select("id, application_id, job_id, scheduled_at, duration_min, meeting_link, note, status, candidate_id")
    .eq("hr_id", hrId)
    .eq("application_id", applicationId)
    .order("scheduled_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return legacy || null;
}
