const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

function buildPrompt({ cvData, jobTitle, companyName, date }) {
  return `
You are an expert cover letter writer.

Create a professional classic cover letter body (do not include header/contact block; only paragraphs between "Dear Hiring Manager," and "Yours sincerely,").

Inputs:
- Candidate Name: ${cvData?.name || ""}
- Current Role: ${cvData?.role || ""}
- Summary: ${cvData?.summary || ""}
- Skills: ${cvData?.skills || ""}
- Experience Highlights: ${Array.isArray(cvData?.experience) ? cvData.experience.join(" | ") : ""}
- Target Job Title: ${jobTitle || ""}
- Company Name: ${companyName || ""}
- Date: ${date || ""}

Requirements:
1) Opening: candidate intro + target job title.
2) Middle: include 2-3 key achievements grounded in the provided experience/skills.
3) Closing: interview call to action and availability.
4) Tone: concise, confident, professional.
5) Max 220 words.

Return strict JSON only:
{
  "coverLetterBody": "..."
}
No markdown, no extra keys.
`.trim();
}

module.exports = async function handler(req, res) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (!ANTHROPIC_API_KEY) return res.status(500).json({ error: "AI Engine is not configured." });

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
  const cvData = body.cvData || {};
  const jobTitle = String(body.jobTitle || "").trim();
  const companyName = String(body.companyName || "").trim();
  const date = String(body.date || "").trim();

  if (!jobTitle) return res.status(400).json({ error: "Job title is required." });

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
        max_tokens: 700,
        messages: [
          {
            role: "user",
            content: buildPrompt({ cvData, jobTitle, companyName, date }),
          },
        ],
      }),
    });

    const rawText = await response.text();
    if (!response.ok) return res.status(502).json({ error: "AI Engine is busy, please try again in a moment." });

    let outer;
    try {
      outer = JSON.parse(rawText);
    } catch {
      return res.status(502).json({ error: "AI Engine is busy, please try again in a moment." });
    }

    const text = (Array.isArray(outer.content) && outer.content[0] && outer.content[0].text) || "";
    const jsonString = String(text).replace(/```json|```/g, "").trim();
    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      return res.status(502).json({ error: "AI Engine is busy, please try again in a moment." });
    }

    const coverLetterBody = String(parsed?.coverLetterBody || "").trim();
    if (!coverLetterBody) return res.status(502).json({ error: "AI Engine returned an empty response." });
    return res.status(200).json({ coverLetterBody });
  } catch {
    return res.status(502).json({ error: "AI Engine is busy, please try again in a moment." });
  }
};
