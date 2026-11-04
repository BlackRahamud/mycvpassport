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
    throw new Error("Interview practice data is unavailable. Refresh the page and try again.");
  }
  if (["42501", "PGRST301", "PGRST302"].includes(error.code)) {
    throw new Error("Your access to this interview could not be verified. Refresh and sign in again.");
  }
  if (["23514", "22P02"].includes(error.code)) {
    throw new Error("Some interview details are invalid. Review your answer and try again.");
  }
  throw new Error(operation === "create session"
    ? "Your interview setup could not be saved. Your details are still here; please retry."
    : "We couldn't load or update this interview. Your saved answers are unchanged; please retry.");
}

export async function callPracticeAI(payload) {
  const { data: { session } = {} } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Please sign in again.");
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timeout = controller ? window.setTimeout(() => controller.abort(), 65000) : null;
  try {
    const response = await safeFetch("/api/ai?action=practice_interview", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(payload),
      ...(controller ? { signal: controller.signal } : {}),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.error || "The interview service is temporarily unavailable.");
    return result;
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("This request timed out. Your answer may already be saved; retry safely to continue.");
    }
    if (error instanceof TypeError) {
      throw new Error("The connection was interrupted. Your answer may already be saved; check the interview before retrying.");
    }
    throw error;
  } finally {
    if (timeout !== null) window.clearTimeout(timeout);
  }
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
