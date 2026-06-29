/**
 * Role-aware skill quick-picks for the Post-a-Job wizard.
 *
 * Calls POST /api/ai?action=suggest_skills (which caches by normalized job
 * title in query_cache, 30-day TTL). Returns 8 chip strings, or a small
 * GENERIC set on any failure — never the old hardcoded dev stack, so a
 * hospitality role never sees React/Ruby again.
 */

import { supabase } from "../appSupabaseClient";
import safeFetch from "../lib/net/safeFetch";

// Role-neutral fallback when the AI call fails or the user has no job title.
export const GENERIC_SKILLS = [
  "Communication",
  "Teamwork",
  "Problem Solving",
  "Time Management",
  "Customer Service",
  "Attention to Detail",
  "Adaptability",
  "Organization",
];

/**
 * @param {string} jobTitle
 * @param {{ signal?: AbortSignal }} [opts]
 * @returns {Promise<{ skills: string[], fallback: boolean }>}
 */
export async function suggestSkills(jobTitle, opts = {}) {
  const title = (jobTitle || "").trim();
  if (!title) return { skills: GENERIC_SKILLS, fallback: true };

  try {
    const { data: { session } = {} } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return { skills: GENERIC_SKILLS, fallback: true };

    const res = await safeFetch("/api/ai?action=suggest_skills", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ jobTitle: title }),
      signal: opts.signal,
    });
    const data = await res.json().catch(() => ({}));
    const skills = Array.isArray(data.skills)
      ? data.skills.map((s) => String(s).trim()).filter(Boolean).slice(0, 8)
      : [];
    if (!res.ok || skills.length === 0) return { skills: GENERIC_SKILLS, fallback: true };
    return { skills, fallback: false };
  } catch {
    return { skills: GENERIC_SKILLS, fallback: true };
  }
}
