import { createClient } from '@supabase/supabase-js';
import { normalizeResumeText } from './normalizeResumeText';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;
const ANTHROPIC_API_KEY = process.env.REACT_APP_ANTHROPIC_API_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

/**
 * Fetch the current authenticated user together with their profile row.
 * Centralises the `is_pro` flag lookup so the rest of the app can stay simple.
 */
export async function getCurrentUserProfile() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) return { user: null, profile: null, isPro: false };

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, is_pro')
    .eq('id', user.id)
    .single();

  if (profileError && profileError.code !== 'PGRST116') {
    // PGRST116 = row not found; treat as non‑Pro without failing the app
    throw profileError;
  }

  const isPro = !!profile?.is_pro;
  return { user, profile, isPro };
}

/**
 * Premium parsing engine:
 * For Pro users only, reconstructs messy resume text into structured JSON
 * using a high-end LLM (Claude 3.5 Sonnet). Anthropic is only called when
 * the user's profile has is_pro === true, protecting API credits.
 *
 * Returns: structured JSON object on success.
 * Returns: { error: "Subscription required for premium AI parsing." } when not Pro.
 * Throws: user-friendly error when API fails (e.g. out of credits).
 */
export async function parseResumeToStructuredJSON(rawText) {
  const { profile } = await getCurrentUserProfile();

  // Lock: do not call Anthropic unless the user is Pro (subscription required)
  const userIsPro = !!(profile && profile.is_pro);
  if (!userIsPro) {
    return { error: 'Subscription required for premium AI parsing.' };
  }

  // ─── CREDIT GUARD: API call commented out during Painted Door phase ─────────
  // No Anthropic credits are spent. Uncomment when ready to enable premium parsing.
  // if (!ANTHROPIC_API_KEY) {
  //   throw new Error('Anthropic API key is not configured.');
  // }
  // const cleaned = normalizeResumeText(rawText);
  // const prompt = `...`;
  // const response = await fetch('https://api.anthropic.com/v1/messages', { ... });
  // const text = await response.text().catch(() => '');
  // ... parse and return JSON

  return {
    status: 'Coming Soon',
    message: 'UAE-Specific AI Engine is in development. Join the waitlist for early access.',
    work_experience: [],
    education: [],
    skills: { hard_skills: [], soft_skills: [], tools: [] },
  };
}

/**
 * Save an email to the waitlist table (Painted Door / launch list).
 * Run the SQL in supabase/waitlist.sql in Supabase Dashboard if the table does not exist.
 */
export async function joinWaitlist(email) {
  const trimmed = (email || '').trim().toLowerCase();
  if (!trimmed) {
    throw new Error('Please enter a valid email address.');
  }
  const { data, error } = await supabase
    .from('waitlist')
    .insert({ email: trimmed })
    .select('id')
    .single();
  if (error) {
    if (error.code === '23505') {
      return { ok: true, message: 'You are already on the waitlist.' };
    }
    throw error;
  }
  return { ok: true, message: "You're on the list! We'll be in touch soon.", data };
}

