/**
 * Vercel serverless function: Premium resume parsing via Anthropic.
 * Set ANTHROPIC_API_KEY in Vercel project env vars (server-side only).
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

function buildPrompt(cleanedText) {
  return `
You are an institutional-grade resume parsing engine.

Input resume text (already lightly cleaned):
${(cleanedText || '').slice(0, 12000)}

Task:
Return a STRICT JSON object that captures the candidate's profile in three top-level keys:
- "work_experience": an array of objects like
  { "title": string, "company": string, "location": string | null, "start_date": string | null, "end_date": string | null, "bullets": string[] }
- "education": an array of objects like
  { "degree": string | null, "field": string | null, "institution": string, "location": string | null, "graduation_date": string | null }
- "skills": an object like
  { "hard_skills": string[], "soft_skills": string[], "tools": string[] }

Requirements:
- Dates must be human-readable strings (e.g. "Jan 2022" or "Present"), not timestamps.
- If a value is unknown, use null, not an empty string.
- Do not invent jobs or degrees that are clearly not present.
- Do not include any commentary, explanation, or markdown.
- Respond with JSON ONLY, no backticks, no leading text.
`.trim();
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized. Please sign in.' });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Server configuration error.' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, is_pro')
    .eq('id', user.id)
    .single();

  if (profileError && profileError.code !== 'PGRST116') {
    return res.status(500).json({ error: 'Could not verify subscription.' });
  }

  if (!profile || !profile.is_pro) {
    return res.status(403).json({ error: 'Subscription required for premium AI parsing.' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const text = (body.text || '').trim();
  if (!text) {
    return res.status(400).json({ error: 'Missing or empty text in request body.' });
  }

  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'AI Engine is not configured. Please try again later.' });
  }

  const prompt = buildPrompt(text);

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1200,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const responseText = await response.text();

    if (!response.ok) {
      const outOfCredits =
        response.status === 402 ||
        response.status === 429 ||
        /out of credits|insufficient credits|rate limit/i.test(responseText);
      const message = outOfCredits || response.status >= 500
        ? 'AI Engine is busy, please try again in a moment.'
        : 'AI Engine is busy, please try again in a moment.';
      return res.status(502).json({ error: message });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      return res.status(502).json({ error: 'AI Engine is busy, please try again in a moment.' });
    }

    const raw =
      (Array.isArray(data.content) && data.content[0] && data.content[0].text) ||
      data.content ||
      '';
    const jsonString = String(raw).replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(jsonString);

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json(parsed);
  } catch (err) {
    return res.status(502).json({ error: 'AI Engine is busy, please try again in a moment.' });
  }
}
