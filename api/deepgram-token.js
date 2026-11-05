import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
const TOKEN_URL = "https://api.deepgram.com/v1/auth/grant";
const TTS_URL = "https://api.deepgram.com/v1/speak?model=aura-2-thalia-en&encoding=linear16&sample_rate=24000&container=wav";
const TOKEN_TTL_SECONDS = 60;
const WINDOW_MS = 60_000;
const MAX_ISSUES_PER_WINDOW = 12;

// Best-effort per-instance abuse guard. Vercel may run multiple isolated
// instances, so this is not a global quota or a substitute for provider limits.
const issuanceByUser = new Map();

function setNoStore(res) {
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Pragma", "no-cache");
}

function readBody(req) {
  if (req.body == null) return {};
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body !== "string" || req.body.length > 12_000) return null;
  try { return JSON.parse(req.body || "{}"); } catch { return null; }
}

function allowIssue(userId, now = Date.now()) {
  if (issuanceByUser.size > 500) {
    for (const [id, entry] of issuanceByUser) {
      if (now - entry.startedAt >= WINDOW_MS) issuanceByUser.delete(id);
    }
  }
  const current = issuanceByUser.get(userId);
  if (!current || now - current.startedAt >= WINDOW_MS) {
    issuanceByUser.set(userId, { startedAt: now, count: 1 });
    return true;
  }
  if (current.count >= MAX_ISSUES_PER_WINDOW) return false;
  current.count += 1;
  return true;
}

export default async function handler(req, res) {
  setNoStore(res);
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "Use POST to connect voice." });
  }

  const contentLength = Number(req.headers["content-length"] || 0);
  if (contentLength > 12_000) return res.status(413).json({ ok: false, error: "Request body exceeds the 12 KB limit." });
  const body = readBody(req);
  if (!body) return res.status(400).json({ ok: false, error: "Request body must be valid JSON and under 12 KB." });
  const action = body.action || "stt_token";
  if (action !== "stt_token" && action !== "tts") return res.status(400).json({ ok: false, error: "Unsupported voice action." });
  if (action === "tts" && (typeof body.text !== "string" || !body.text.trim() || body.text.length > 1200)) {
    return res.status(400).json({ ok: false, error: "Question text must contain 1 to 1,200 characters." });
  }

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
  if (!token) return res.status(401).json({ ok: false, error: "Please sign in to use voice interview." });
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return res.status(500).json({ ok: false, error: "Voice connection is not configured." });

  let user;
  try {
    const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: { user: verifiedUser } = {}, error } = await authClient.auth.getUser(token);
    if (error || !verifiedUser) return res.status(401).json({ ok: false, error: "Your sign-in session could not be verified." });
    user = verifiedUser;
  } catch {
    return res.status(401).json({ ok: false, error: "Your sign-in session could not be verified." });
  }

  if (!allowIssue(user.id)) return res.status(429).json({ ok: false, error: "Too many voice connection attempts. Wait a minute and try again." });
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) return res.status(503).json({ ok: false, error: "Voice interview is not configured yet. You can type your answer instead." });

  try {
    if (action === "tts") {
      const upstream = await fetch(TTS_URL, {
        method: "POST",
        headers: {
          Authorization: `Token ${apiKey}`,
          "Content-Type": "application/json",
          Accept: "audio/wav",
        },
        body: JSON.stringify({ text: body.text.trim() }),
        cache: "no-store",
      });
      if (!upstream.ok) return res.status(502).json({ ok: false, error: "Question audio could not be generated. Read the question and continue when ready." });
      const audio = Buffer.from(await upstream.arrayBuffer());
      if (!audio.length || audio.length > 12 * 1024 * 1024) return res.status(502).json({ ok: false, error: "Question audio was unavailable. Read the question and continue when ready." });
      res.setHeader("Content-Type", "audio/wav");
      res.setHeader("Content-Length", String(audio.length));
      return res.status(200).send(audio);
    }
    const upstream = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ttl_seconds: TOKEN_TTL_SECONDS }),
      cache: "no-store",
    });
    if (!upstream.ok) return res.status(502).json({ ok: false, error: "Voice connection could not be authorized. You can type your answer instead." });
    const payload = await upstream.json();
    if (typeof payload?.access_token !== "string" || !payload.access_token) {
      return res.status(502).json({ ok: false, error: "Voice connection could not be authorized. You can type your answer instead." });
    }
    return res.status(200).json({ ok: true, access_token: payload.access_token, expires_in: Number(payload.expires_in) || TOKEN_TTL_SECONDS });
  } catch {
    return res.status(502).json({ ok: false, error: "Voice connection could not be authorized. You can type your answer instead." });
  }
}

export { allowIssue, issuanceByUser };
