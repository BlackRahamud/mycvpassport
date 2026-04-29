/**
 * POST /api/ai?action=cover_letter|parse_resume|linkedin_headline
 *
 * Single Anthropic-helper router. Was three separate functions
 * (api/cover-letter.js, api/parse-resume.js, api/generate-linkedin-headline.js)
 * — merged to bring the project under the Vercel Hobby 12-function
 * limit. Each branch is the previous handler's logic moved verbatim:
 * same model, same max_tokens, same prompts, same auth posture, same
 * error responses. The only contract change is the URL — frontend
 * callers append ?action=... to the existing URL and are otherwise
 * unchanged.
 *
 * Action lookup precedence: query string first, body field second.
 * Query lets logs and curl invocations show the action without
 * parsing the body.
 *
 * Auth (per-branch — matches the legacy endpoints exactly):
 *   - cover_letter:       no server-side auth (UI gates upstream)
 *   - linkedin_headline:  no server-side auth (free first pass)
 *   - parse_resume:       Bearer JWT + profiles.is_pro = true
 *
 * Required env:
 *   - ANTHROPIC_API_KEY                                 (all branches)
 *   - SUPABASE_URL / REACT_APP_SUPABASE_URL             (parse_resume)
 *   - SUPABASE_ANON_KEY / REACT_APP_SUPABASE_ANON_KEY   (parse_resume)
 */

import { createClient } from '@supabase/supabase-js';

export const config = { maxDuration: 60 };

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

// Shared retry helper. cover_letter used 10000ms backoff in the
// legacy file; linkedin_headline used 8000ms — we accept the override
// so each branch keeps its original retry profile.
async function fetchWithRetry(url, options, attempts = 3, backoff = 10000) {
  for (let i = 0; i < attempts; i++) {
    const response = await fetch(url, options);
    if (response.ok || (response.status !== 529 && response.status !== 429)) {
      return response;
    }
    if (i < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, backoff));
    } else {
      return response;
    }
  }
}

// =====================================================================
// Branch 1 — cover_letter (was api/cover-letter.js)
// =====================================================================

function buildCoverLetterPrompt({ cvData, jobTitle, companyName, jobDescription, date, market }) {
  const exp = Array.isArray(cvData?.experience)
    ? cvData.experience.join('\n')
    : String(cvData?.experience || '');
  const toneLine =
    market === 'India'
      ? 'Tone: formal, traditional Indian corporate style.'
      : 'Tone: confident Gulf corporate style appropriate for UAE/GCC employers.';
  return `
You are an expert cover letter writer. Write ONLY the body of the cover letter as plain text:
- Exactly 3 paragraphs, separated by a single blank line.
- Do NOT include a salutation (no "Dear"), subject line, date, address block, or sign-off (no "Sincerely").
- Professional tone; align closely with the job description.
- ${toneLine}

Today's date (reference only; do not repeat in output): ${date || ''}

Candidate:
Name: ${cvData?.name || ''}
Current/target role: ${cvData?.role || ''}
Summary: ${cvData?.summary || ''}
Skills: ${cvData?.skills || ''}
Experience highlights:
${exp.slice(0, 6000)}

Job title: ${jobTitle || 'Role'}
${(companyName || '').trim() ? `Company: ${(companyName || '').trim()}` : ''}

Job description:
${String(jobDescription || '').slice(0, 8000)}

Output the 3 paragraphs only.
`.trim();
}

async function handleCoverLetter(req, res, body) {
  const { cvData, jobTitle, companyName, jobDescription, date, market } = body;

  if (!cvData || typeof cvData !== 'object') {
    return res.status(400).json({ error: 'Missing cvData.' });
  }
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'AI Engine is not configured. Please try again later.' });
  }

  const prompt = buildCoverLetterPrompt({ cvData, jobTitle, companyName, jobDescription, date, market });

  try {
    const response = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 450,
        system: "CRITICAL: The cover letter body must not exceed 225 words. This is a hard layout constraint to ensure the document fits on one page. Prioritize impact over length. If no company name is provided, do not reference the company name anywhere in the letter. Do not use placeholder text such as 'your company', 'the company', or any generic substitute.",
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    const responseText = await response.text();
    if (!response.ok) {
      return res.status(502).json({ error: 'AI Engine is busy, please try again in a moment.' });
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
    const coverLetterBody = String(raw).trim();
    if (!coverLetterBody) {
      return res.status(502).json({ error: 'Could not generate cover letter. Please try again.' });
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ coverLetterBody });
  } catch (err) {
    console.error('[ai/cover_letter]', err);
    return res.status(502).json({ error: 'AI Engine is busy, please try again in a moment.' });
  }
}

// =====================================================================
// Branch 2 — linkedin_headline (was api/generate-linkedin-headline.js)
// =====================================================================

function buildLinkedInPrompt({ headline, market }) {
  const toneLine =
    market === 'india'
      ? 'Target market: India metros (Bengaluru, Mumbai, Delhi, Hyderabad). Use Indian corporate vocabulary where natural.'
      : 'Target market: Dubai / GCC. Use Gulf-market vocabulary (emirate names, AED salaries, regional employers) where natural.';
  return `
You are an expert LinkedIn headline copywriter for ${market === 'india' ? 'India metros' : 'Dubai / GCC'} recruiters.

Rewrite the following raw LinkedIn headline into EXACTLY three versions. Each must fit in 220 characters.

${toneLine}

Raw input: "${String(headline || '').slice(0, 400)}"

Output STRICT JSON only, no prose, no markdown fences, with these exact keys:
{
  "professional": "clean corporate style — role, years, market signal, seniority",
  "bold": "confident assertive style — outcome-led, numbers-first",
  "storyDriven": "human angle — mission or what drives them, still keyword-dense"
}

Rules:
- Each version must feel distinct in voice.
- Include role, seniority, and a market signal (city or region) in each.
- Do NOT use emoji.
- Do NOT exceed 220 characters per version.
- Return valid JSON only — nothing else.
`.trim();
}

function extractLooseJson(raw) {
  const text = String(raw || '').trim();
  const fenced =
    text.match(/```json\s*([\s\S]*?)\s*```/i) ||
    text.match(/```\s*([\s\S]*?)\s*```/);
  const candidate = fenced ? fenced[1] : text;
  const firstBrace = candidate.indexOf('{');
  const lastBrace = candidate.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1) return null;
  try {
    return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
  } catch {
    return null;
  }
}

async function handleLinkedInHeadline(req, res, body) {
  const headline = String(body.headline || '').trim();
  const market = body.market === 'india' ? 'india' : 'dubai';

  if (!headline) return res.status(400).json({ error: 'Missing headline.' });
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: 'AI Engine is not configured.' });

  try {
    // 8s backoff matches the legacy generate-linkedin-headline.js.
    const response = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system: 'Return only valid JSON with keys professional, bold, storyDriven. No prose, no markdown fences, no commentary.',
        messages: [{ role: 'user', content: buildLinkedInPrompt({ headline, market }) }],
      }),
    }, 3, 8000);

    const responseText = await response.text();
    if (!response.ok) {
      return res.status(502).json({ error: 'AI Engine is busy, please try again.' });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      return res.status(502).json({ error: 'AI Engine returned an unparseable response.' });
    }

    const raw =
      (Array.isArray(data.content) && data.content[0] && data.content[0].text) ||
      data.content ||
      '';

    const parsed = extractLooseJson(raw);
    if (!parsed || !parsed.professional || !parsed.bold || !parsed.storyDriven) {
      return res.status(502).json({ error: 'AI Engine returned an incomplete result. Please retry.' });
    }

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({
      professional: String(parsed.professional).slice(0, 280),
      bold: String(parsed.bold).slice(0, 280),
      storyDriven: String(parsed.storyDriven).slice(0, 280),
      market,
    });
  } catch (err) {
    console.error('[ai/linkedin_headline]', err);
    return res.status(502).json({ error: 'AI Engine is busy, please try again.' });
  }
}

// =====================================================================
// Branch 3 — parse_resume (was api/parse-resume.js)
// =====================================================================

function buildParseResumePrompt(cleanedText) {
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

async function handleParseResume(req, res, body) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized. Please sign in.' });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Server configuration error.' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: { user } = {}, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, is_pro')
    .eq('id', user.id)
    .single();

  // PGRST116 = "no rows" — treat as "no profile yet", which the
  // is_pro check below will reject. Any other error is a real DB
  // failure and we surface it.
  if (profileError && profileError.code !== 'PGRST116') {
    return res.status(500).json({ error: 'Could not verify subscription.' });
  }
  if (!profile || !profile.is_pro) {
    return res.status(403).json({ error: 'Subscription required for premium AI parsing.' });
  }

  const text = String(body.text || '').trim();
  if (!text) return res.status(400).json({ error: 'Missing or empty text in request body.' });
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'AI Engine is not configured. Please try again later.' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1200,
        messages: [{ role: 'user', content: buildParseResumePrompt(text) }],
      }),
    });

    const responseText = await response.text();
    if (!response.ok) {
      return res.status(502).json({ error: 'AI Engine is busy, please try again in a moment.' });
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
    console.error('[ai/parse_resume]', err);
    return res.status(502).json({ error: 'AI Engine is busy, please try again in a moment.' });
  }
}

// =====================================================================
// Router
// =====================================================================

export default async function handler(req, res) {
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

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  // Query string wins over body field — keeps the action visible in
  // logs and curl without inspecting the JSON.
  const queryAction = typeof req.query?.action === 'string' ? req.query.action.trim() : '';
  const action = queryAction || (typeof body.action === 'string' ? body.action.trim() : '');

  switch (action) {
    case 'cover_letter':       return handleCoverLetter(req, res, body);
    case 'linkedin_headline':  return handleLinkedInHeadline(req, res, body);
    case 'parse_resume':       return handleParseResume(req, res, body);
    default:
      return res.status(400).json({
        error: 'Missing or unknown action. Use ?action=cover_letter|linkedin_headline|parse_resume.',
      });
  }
}
