const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

function buildPrompt({ unmatchedKeywords, jobDescription, cvSummary }) {
  return `
You are a precise resume keyword analyst.

Input:
- Unmatched keywords from local keyword bank: ${JSON.stringify(unmatchedKeywords || [])}
- Job description: ${(jobDescription || "").slice(0, 6000)}
- CV summary: ${(cvSummary || "").slice(0, 1200)}

Task:
1) Suggest up to 8 additional missing keywords that are strongly implied by the job description and not already in the unmatched keyword list.
2) Write exactly one short improvement suggestion sentence (max 24 words) for the candidate.

Output must be strict JSON with exactly:
{
  "additionalMissingKeywords": ["..."],
  "suggestion": "..."
}
No markdown. No extra keys.
`.trim();
}

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const unmatchedKeywords = Array.isArray(body.unmatchedKeywords) ? body.unmatchedKeywords : [];
  const jobDescription = String(body.jobDescription || "").trim();
  const cvSummary = String(body.cvSummary || "").trim();

  if (!jobDescription) return res.status(400).json({ error: "jobDescription is required" });
  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: "AI Engine is not configured." });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 500,
        messages: [{ role: "user", content: buildPrompt({ unmatchedKeywords, jobDescription, cvSummary }) }],
      }),
    });

    const text = await response.text();
    if (!response.ok) return res.status(502).json({ error: "AI Engine is busy, please try again in a moment." });

    let parsedOuter;
    try {
      parsedOuter = JSON.parse(text);
    } catch {
      return res.status(502).json({ error: "AI Engine is busy, please try again in a moment." });
    }

    const raw = (Array.isArray(parsedOuter.content) && parsedOuter.content[0] && parsedOuter.content[0].text) || "";
    const jsonString = String(raw).replace(/```json|```/g, "").trim();

    let payload;
    try {
      payload = JSON.parse(jsonString);
    } catch {
      return res.status(502).json({ error: "AI Engine is busy, please try again in a moment." });
    }

    const additionalMissingKeywords = Array.isArray(payload.additionalMissingKeywords)
      ? payload.additionalMissingKeywords.map((k) => String(k).trim()).filter(Boolean)
      : [];
    const suggestion = String(payload.suggestion || "").trim();

    return res.status(200).json({ additionalMissingKeywords, suggestion });
  } catch {
    return res.status(502).json({ error: "AI Engine is busy, please try again in a moment." });
  }
};
