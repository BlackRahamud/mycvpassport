/**
 * Vercel serverless: 3 LinkedIn headline rewrites via Anthropic.
 * POST { headline: string, market: "dubai" | "india" }
 * → { professional, bold, storyDriven }
 *
 * No auth required — the first pass is free per landing-page promise.
 * Deeper About / Experience rewrites gate behind Ziina (see LinkedInOptimizer.jsx).
 */

export const config = { maxDuration: 30 };

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

async function fetchWithRetry(url, options, attempts = 3, backoff = 8000) {
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

function buildPrompt({ headline, market }) {
  const toneLine =
    market === "india"
      ? "Target market: India metros (Bengaluru, Mumbai, Delhi, Hyderabad). Use Indian corporate vocabulary where natural."
      : "Target market: Dubai / GCC. Use Gulf-market vocabulary (emirate names, AED salaries, regional employers) where natural.";
  return `
You are an expert LinkedIn headline copywriter for ${market === "india" ? "India metros" : "Dubai / GCC"} recruiters.

Rewrite the following raw LinkedIn headline into EXACTLY three versions. Each must fit in 220 characters.

${toneLine}

Raw input: "${String(headline || "").slice(0, 400)}"

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

function extractJson(raw) {
  const text = String(raw || "").trim();
  const fenced = text.match(/```json\s*([\s\S]*?)\s*```/i) || text.match(/```\s*([\s\S]*?)\s*```/);
  const candidate = fenced ? fenced[1] : text;
  const firstBrace = candidate.indexOf("{");
  const lastBrace = candidate.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1) return null;
  try {
    return JSON.parse(candidate.slice(firstBrace, lastBrace + 1));
  } catch {
    return null;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const headline = String(body.headline || "").trim();
  const market = body.market === "india" ? "india" : "dubai";

  if (!headline) {
    return res.status(400).json({ error: "Missing headline." });
  }

  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "AI Engine is not configured." });
  }

  try {
    const response = await fetchWithRetry("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 600,
        system: "Return only valid JSON with keys professional, bold, storyDriven. No prose, no markdown fences, no commentary.",
        messages: [{ role: "user", content: buildPrompt({ headline, market }) }],
      }),
    });

    const responseText = await response.text();

    if (!response.ok) {
      return res.status(502).json({ error: "AI Engine is busy, please try again." });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      return res.status(502).json({ error: "AI Engine returned an unparseable response." });
    }

    const raw =
      (Array.isArray(data.content) && data.content[0] && data.content[0].text) ||
      data.content ||
      "";

    const parsed = extractJson(raw);
    if (!parsed || !parsed.professional || !parsed.bold || !parsed.storyDriven) {
      return res.status(502).json({ error: "AI Engine returned an incomplete result. Please retry." });
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(200).json({
      professional: String(parsed.professional).slice(0, 280),
      bold: String(parsed.bold).slice(0, 280),
      storyDriven: String(parsed.storyDriven).slice(0, 280),
      market,
    });
  } catch (err) {
    console.error("generate-linkedin-headline", err);
    return res.status(502).json({ error: "AI Engine is busy, please try again." });
  }
};
