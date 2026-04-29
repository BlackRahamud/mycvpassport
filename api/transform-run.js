/**
 * POST /api/transform-run
 *
 * Reads a paid transform_sessions row, invokes Claude to rewrite the
 * extracted CV text into CVPassport's canonical Builder shape, and
 * persists cv_data + token usage on the same row. Idempotent on
 * status='transformed' (returns the existing cv_data); allows retry
 * from status='error' so paying users get a second swing; refuses
 * other states with a precise code.
 *
 * Auth:  Authorization: Bearer <user JWT>
 * Body:  { session_id: uuid }
 *
 * Responses:
 *   200 { ok: true, session_id, status: 'transformed', cv_data }
 *   400 missing/malformed session_id, body
 *   401 missing or invalid bearer token
 *   402 session unpaid (status='created' or 'awaiting_payment')
 *   404 session not found OR not owned by user
 *   409 session in flight (status='transforming' AND lock is fresh)
 *   410 session expired (raw_extracted_text wiped by 72h cleanup)
 *   502 Anthropic upstream failed (status flipped to 'error')
 *   500 server / Supabase / unexpected
 *
 * Stale-lock recovery: if status='transforming' AND paid_at is older
 * than 5 minutes, the previous run's Vercel function probably timed
 * out — this caller is allowed to reclaim the lock and retry.
 *
 * Required env:
 *   - SUPABASE_URL                (or REACT_APP_SUPABASE_URL)
 *   - SUPABASE_ANON_KEY           (or REACT_APP_SUPABASE_ANON_KEY)
 *   - SUPABASE_SERVICE_ROLE_KEY
 *   - ANTHROPIC_API_KEY
 *
 * Optional env:
 *   - TRANSFORM_MODEL          default 'claude-sonnet-4-6'
 *   - TRANSFORM_RETAIN_RAW     default '0' — privacy default. The
 *                              raw_extracted_text column is cleared
 *                              after a successful transform. Set to
 *                              '1' to retain (eval / regression mode).
 */

import { createClient } from '@supabase/supabase-js';

export const config = { maxDuration: 60 };

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const TRANSFORM_MODEL = process.env.TRANSFORM_MODEL || 'claude-sonnet-4-6';
// Reduced from 4000 → 3500 to leave headroom against the 60s Vercel
// function timeout. Sonnet 4.6 emitting 4000 tokens at ~50 tok/s
// approaches the limit on long CVs; 3500 keeps p99 latency under 50s.
const TRANSFORM_MAX_TOKENS = 3500;
const TRANSFORM_RETAIN_RAW = (process.env.TRANSFORM_RETAIN_RAW || '0') === '1';
// Stale-transform threshold. If a session has been stuck at
// status='transforming' for longer than this (proxy: paid_at is older
// than this — payments precede the lock by milliseconds), assume the
// previous Vercel function got killed before it could update, and
// allow the next caller to reclaim the lock and retry.
const TRANSFORM_STALE_MS = 5 * 60 * 1000;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Canonical Builder shape — mirrored from src/cvShared.js EMPTY_RESUME /
// EMPTY_EXP / EMPTY_EDU. Inlined here so api/ stays self-contained
// (the existing convention — no api/*.js imports from src/). If
// cvShared.js changes, update these too.
const EMPTY_RESUME = {
  name: '',
  email: '',
  phone: '',
  location: 'Dubai, UAE',
  title: '',
  summary: '',
  nationality: '',
  visaStatus: '',
  dob: '',
  gender: '',
  maritalStatus: '',
  experience: [],
  education: [],
  skills: '',
  languages: 'English, Hindi',
  certifications: [],
  technicalSkills: '',
  projects: '',
  volunteerWork: '',
  publications: '',
  builderExtraSectionIds: [],
  availability: 'Immediately Available',
  drivingLicense: '',
  willingToRelocate: 'Yes',
  references: 'References available upon request',
};

const EMPTY_EXP = {
  company: '',
  role: '',
  location: '',
  period: '',
  points: '',
  startDate: '',
  endDate: '',
  present: false,
};

const EMPTY_EDU = {
  school: '',
  degree: '',
  year: '',
  fieldOfStudy: '',
  startDate: '',
  endDate: '',
  location: '',
};

const SYSTEM_PROMPT = `You are an expert CV editor for the India ↔ UAE/GCC migration corridor.
You rewrite a candidate's existing CV into a regionally-tuned, ATS-optimised CV in CVPassport's canonical JSON shape.
You never invent employers, dates, qualifications, or certifications that aren't in the source.
You sharpen verbs, surface metrics already present, and normalise dates.
Output VALID JSON only — no markdown fences, no commentary.`;

function buildUserPrompt({ text, intake }) {
  return `SOURCE CV TEXT (raw extracted, may be noisy):
<<<
${text}
>>>

REGIONAL INTAKE:
- Target market: ${intake.target_market}
- Target city:   ${intake.target_city}
- Target role:   ${intake.target_role}
- Language pref: ${intake.language_pref}
- Experience:    ${intake.experience_level}

DIRECTIVES (apply ALL):
1. Output ONE JSON object conforming EXACTLY to this canonical shape:
   { name, email, phone, location, title, summary,
     nationality, visaStatus, dob, gender, maritalStatus,
     experience: [...], education: [...],
     skills, languages, certifications: [...],
     technicalSkills, projects, volunteerWork, publications,
     builderExtraSectionIds: [],
     availability, drivingLicense, willingToRelocate, references }
   Use "" for unknown scalar fields. Never null. Never omit a key.

2. experience[i] = { company, role, location, period, points, startDate, endDate, present }.
   points = newline-separated bullet sentences, no leading "•" or "-". Keep 3–5 per role.
   Each bullet grounded in the source text only.

3. education[i] = { school, degree, year, fieldOfStudy, startDate, endDate, location }.

4. certifications[i] = { name, issuer, year }.

5. skills, technicalSkills, languages = comma-separated strings.

6. summary = 3–4 sentences, regionally tuned:
   - Target market 'UAE' or 'GCC': confident Gulf corporate tone, surface visa status if known, mention the target city.
   - Target market 'India': formal Indian corporate tone.

7. Regional fields:
   - 'UAE' / 'GCC': fill nationality, visaStatus, dob, gender, maritalStatus, drivingLicense when present in source. Otherwise "".
   - 'India': leave the Gulf-only fields as "" if not in source.

8. NEVER fabricate. If a field can't be inferred from the source, set "".

9. Output VALID JSON only. No backticks. No leading text. No commentary.`;
}

// Coerces whatever Claude returned into the canonical Builder shape.
// Belt-and-braces — the prompt asks for the exact shape, but a slip on
// any single field would put garbage into the Builder. Backfill scalar
// fields from EMPTY_RESUME, normalise arrays element-by-element, and
// stitch the intake-derived targetMarket/targetCity onto the CV so the
// frontend can drive conditional UI without a re-transform.
function normalizeCvData(raw, intake) {
  const obj = (raw && typeof raw === 'object' && !Array.isArray(raw)) ? raw : {};
  const expArr = Array.isArray(obj.experience) ? obj.experience : [];
  const eduArr = Array.isArray(obj.education) ? obj.education : [];
  const certArr = Array.isArray(obj.certifications) ? obj.certifications : [];

  const merged = { ...EMPTY_RESUME, ...obj };
  merged.experience = expArr.map((e) =>
    ({ ...EMPTY_EXP, ...(e && typeof e === 'object' ? e : {}) })
  );
  merged.education = eduArr.map((e) =>
    ({ ...EMPTY_EDU, ...(e && typeof e === 'object' ? e : {}) })
  );
  merged.certifications = certArr
    .map((c) => {
      if (typeof c === 'string') {
        const n = c.trim();
        return n ? { name: n, issuer: '', year: '' } : null;
      }
      if (!c || typeof c !== 'object') return null;
      const name = String(c.name || '').trim();
      if (!name) return null;
      return {
        name,
        issuer: String(c.issuer || '').trim(),
        year: String(c.year || '').trim(),
      };
    })
    .filter(Boolean);
  merged.builderExtraSectionIds = Array.isArray(obj.builderExtraSectionIds)
    ? obj.builderExtraSectionIds
    : [];

  // Forward-compat additive fields. The current Builder ignores unknown
  // keys; when the frontend pass adds India/Gulf conditional UI these
  // are already on the CV.
  merged.targetMarket = String(intake?.target_market || '');
  merged.targetCity = String(intake?.target_city || '');

  return merged;
}

async function callClaude({ text, intake }) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: TRANSFORM_MODEL,
      max_tokens: TRANSFORM_MAX_TOKENS,
      temperature: 0,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt({ text, intake }) }],
    }),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    const err = new Error(`Anthropic ${r.status}: ${t.slice(0, 300)}`);
    err.code = 'claude_http_' + r.status;
    throw err;
  }
  const data = await r.json();
  const raw = (Array.isArray(data.content) && data.content[0]?.text) || '';
  const cleaned = String(raw).replace(/```json|```/g, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    const err = new Error(`JSON parse failed: ${e.message}`);
    err.code = 'json_parse_failed';
    throw err;
  }
  return {
    parsed,
    usage: {
      tokens_in: data?.usage?.input_tokens ?? null,
      tokens_out: data?.usage?.output_tokens ?? null,
    },
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ ok: false, error: 'Server not configured: Supabase env missing' });
  }
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ ok: false, error: 'Server not configured: ANTHROPIC_API_KEY missing' });
  }

  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ ok: false, error: 'Unauthorized' });

  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: { user } = {}, error: userErr } = await authClient.auth.getUser(token);
  if (userErr || !user) return res.status(401).json({ ok: false, error: 'Invalid session' });

  const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ── Body parse ──────────────────────────────────────────────────────
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  } catch {
    return res.status(400).json({ ok: false, error: 'Invalid JSON body' });
  }
  const sessionId = typeof body.session_id === 'string' ? body.session_id.trim() : '';
  if (!sessionId || !UUID_RE.test(sessionId)) {
    return res.status(400).json({ ok: false, error: 'session_id (uuid) required' });
  }

  // ── Load session ────────────────────────────────────────────────────
  // paid_at powers the stale-transforming check. Session expiry is
  // inferred from raw_extracted_text being null on a paid session
  // (the 72h cleanup wipes the text but leaves the row), so we don't
  // need expires_at here.
  const { data: session, error: loadErr } = await db
    .from('transform_sessions')
    .select('id, user_id, status, intake, raw_extracted_text, cv_data, paid_at')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (loadErr) {
    console.error('[transform-run] session load failed:', JSON.stringify(loadErr));
    return res.status(500).json({ ok: false, error: 'Could not load session' });
  }
  if (!session) {
    return res.status(404).json({ ok: false, error: 'Session not found' });
  }

  // Idempotent fast path — already done.
  if (session.status === 'transformed') {
    return res.status(200).json({
      ok: true,
      session_id: session.id,
      status: 'transformed',
      cv_data: session.cv_data,
    });
  }

  // Stale-lock recovery. If status='transforming' but the lock was
  // taken more than TRANSFORM_STALE_MS ago, assume the previous Vercel
  // function timed out before it could update — let the next caller
  // reclaim. paid_at is set immediately before the lock, so it's a
  // tight proxy for "when did the lock get taken?". Race-tolerant:
  // the conditional UPDATE below is still atomic even if two callers
  // both pass the staleness gate concurrently.
  let canReclaimTransforming = false;
  if (session.status === 'transforming') {
    const paidAt = session.paid_at ? new Date(session.paid_at).getTime() : null;
    const isStale = paidAt && (Date.now() - paidAt) > TRANSFORM_STALE_MS;
    if (!isStale) {
      return res.status(409).json({ ok: false, error: 'Transform already in flight' });
    }
    console.warn('[transform-run] reclaiming stale transforming session', JSON.stringify({
      session_id: sessionId,
      paid_at: session.paid_at,
      age_ms: paidAt ? (Date.now() - paidAt) : null,
    }));
    canReclaimTransforming = true;
  }

  if (session.status === 'created' || session.status === 'awaiting_payment') {
    return res.status(402).json({
      ok: false,
      error: 'Session unpaid',
      status: session.status,
    });
  }
  if (session.status !== 'paid' && session.status !== 'error' && !canReclaimTransforming) {
    return res.status(409).json({ ok: false, error: `Unexpected session status: ${session.status}` });
  }

  // Tighter intake validation — empty object slips through `!session.intake`
  // because !{} === false. Defensive only (transform-upload requires the
  // five keys at insert), but cheap and explicit.
  const intakeOk = session.intake
    && typeof session.intake === 'object'
    && !Array.isArray(session.intake)
    && Object.keys(session.intake).length > 0;
  if (!session.raw_extracted_text || !intakeOk) {
    // If raw text is missing on a paid/error/stale-transforming session,
    // the 72h cleanup wiped it. Surface a clear 410 Gone so the
    // frontend can guide the user back to a fresh upload rather than
    // showing a generic server error.
    const expired = !session.raw_extracted_text
      && (session.status === 'paid' || session.status === 'error' || canReclaimTransforming);
    if (expired) {
      return res.status(410).json({
        ok: false,
        error: 'Session expired. Please upload your CV again.',
        code: 'session_expired',
      });
    }
    return res.status(500).json({ ok: false, error: 'Session is missing source text or intake' });
  }

  // ── Atomic lock: paid|error|stale-transforming → transforming ──────
  // .in('status', allowedFromStatuses) is what makes this safe against
  // a concurrent retry — only one caller flips the row; the other gets
  // 0 rows back and a 409. Also clears any prior error fields so a
  // clean retry doesn't carry stale diagnostics.
  const allowedFromStatuses = ['paid', 'error'];
  if (canReclaimTransforming) allowedFromStatuses.push('transforming');

  const { data: locked, error: lockErr } = await db
    .from('transform_sessions')
    .update({
      status: 'transforming',
      error_code: null,
      error_message: null,
    })
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .in('status', allowedFromStatuses)
    .select('id')
    .maybeSingle();
  if (lockErr) {
    console.error('[transform-run] lock update failed:', JSON.stringify(lockErr));
    return res.status(500).json({ ok: false, error: 'Could not lock session' });
  }
  if (!locked) {
    return res.status(409).json({ ok: false, error: 'Session is no longer ready to run' });
  }

  console.log('[transform-run] starting transform', JSON.stringify({
    session_id: sessionId,
    user_id: user.id,
    model: TRANSFORM_MODEL,
    text_chars: session.raw_extracted_text.length,
    intake_keys: Object.keys(session.intake || {}),
  }));

  // ── Claude round-trip ──────────────────────────────────────────────
  let parsed;
  let usage;
  try {
    const result = await callClaude({
      text: session.raw_extracted_text,
      intake: session.intake,
    });
    parsed = result.parsed;
    usage = result.usage;
  } catch (e) {
    const code = e?.code || 'claude_failed';
    const msg = String(e?.message || e).slice(0, 1000);
    console.error('[transform-run] Claude failed:', code, msg);
    await db
      .from('transform_sessions')
      .update({
        status: 'error',
        error_code: code,
        error_message: msg,
      })
      .eq('id', sessionId);
    return res.status(502).json({
      ok: false,
      error: 'AI transform unavailable',
      code,
    });
  }

  // ── Normalise + persist ────────────────────────────────────────────
  const cv_data = normalizeCvData(parsed, session.intake);

  const updateRow = {
    status: 'transformed',
    cv_data,
    model: TRANSFORM_MODEL,
    tokens_in: usage.tokens_in,
    tokens_out: usage.tokens_out,
    error_code: null,
    error_message: null,
  };
  if (!TRANSFORM_RETAIN_RAW) {
    updateRow.raw_extracted_text = null;
  }

  const { error: saveErr } = await db
    .from('transform_sessions')
    .update(updateRow)
    .eq('id', sessionId);
  if (saveErr) {
    // Result was generated but not persisted — still hand it back so
    // the user's spend isn't wasted. They lose the audit trail, not
    // the CV. Status stays 'transforming' until they retry; that's a
    // known degraded mode the founder can clean up manually if needed.
    console.error('[transform-run] save failed (cv returned anyway):', JSON.stringify(saveErr));
    return res.status(200).json({
      ok: true,
      session_id: sessionId,
      status: 'transformed',
      cv_data,
      warning: 'Transform succeeded but could not be persisted',
    });
  }

  console.log('[transform-run] transform complete', JSON.stringify({
    session_id: sessionId,
    tokens_in: usage.tokens_in,
    tokens_out: usage.tokens_out,
  }));

  return res.status(200).json({
    ok: true,
    session_id: sessionId,
    status: 'transformed',
    cv_data,
  });
}
