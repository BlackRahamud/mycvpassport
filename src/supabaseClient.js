import { createClient } from '@supabase/supabase-js';
import { normalizeResumeText } from './normalizeResumeText';

const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
  },
});

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
    .select('id, is_pro, ats_scans_used')
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
 * Premium parsing engine (Pro users only).
 * Calls the serverless API at /api/ai?action=parse_resume; Anthropic is invoked only server-side.
 * Returns: structured JSON on success, or { error: "..." } when not Pro / on API failure.
 */
export async function parseResumeToStructuredJSON(rawText) {
  const { profile } = await getCurrentUserProfile();

  const userIsPro = !!(profile && profile.is_pro);
  if (!userIsPro) {
    return { error: 'Subscription required for premium AI parsing.' };
  }

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    return { error: 'Please sign in to use premium parsing.' };
  }

  const cleaned = normalizeResumeText(rawText);

  const base = typeof window !== 'undefined' && window.location?.origin
    ? window.location.origin
    : '';
  const res = await fetch(`${base}/api/ai?action=parse_resume`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ text: cleaned }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = data.error || 'AI Engine is busy, please try again in a moment.';
    throw new Error(message);
  }

  return data;
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

