import { supabase } from "../appSupabaseClient";
import safeFetch from "./net/safeFetch";

function raisePracticeError(error, operation) {
  if (!error) return;
  console.error(`[candidate-practice] ${operation} failed`, {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
  });
  const technical = `${error.message || ""} ${error.details || ""}`;
  if (/schema cache|could not find the table|relation .* does not exist|column .* does not exist/i.test(technical)) {
    throw new Error("Interview practice is not available yet. Please try again later.");
  }
  throw new Error("We couldn't save or load your interview just now. Please try again.");
}

export async function callPracticeAI(payload) {
  const { data: { session } = {} } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Please sign in again.");
  const response = await safeFetch("/api/ai?action=practice_interview", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) throw new Error(result.error || "The interview service is temporarily unavailable.");
  return result;
}

export async function createPracticeSession({ candidateId, roleTitle, jobDescription, cvText, mode, difficulty, category }) {
  const { data, error } = await supabase.from("practice_sessions").insert({
    candidate_id: candidateId, role_title: roleTitle.trim(), job_description: jobDescription.trim(),
    cv_text: cvText.trim(), mode, difficulty, category,
  }).select("id").single();
  if (error) raisePracticeError(error, "create session");
  return data;
}

export async function loadPracticeSession(sessionId) {
  const { data, error } = await supabase.from("practice_sessions").select("*").eq("id", sessionId).maybeSingle();
  if (error) raisePracticeError(error, "load session");
  return data || null;
}

export async function loadPracticeTurns(sessionId) {
  const { data, error } = await supabase.from("practice_turns").select("*").eq("session_id", sessionId).order("position");
  if (error) raisePracticeError(error, "load turns");
  return data || [];
}

export async function loadPracticeSessions(candidateId) {
  const { data, error } = await supabase.from("practice_sessions").select("id, role_title, mode, difficulty, category, status, report, created_at, completed_at").eq("candidate_id", candidateId).order("created_at", { ascending: false }).limit(50);
  if (error) raisePracticeError(error, "load sessions");
  return data || [];
}

export async function deletePracticeSession(sessionId) {
  const { error } = await supabase.from("practice_sessions").delete().eq("id", sessionId);
  if (error) raisePracticeError(error, "delete session");
}
