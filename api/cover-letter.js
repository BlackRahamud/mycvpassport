/**
 * Vercel serverless: full cover letter body via Anthropic (paid / unlocked flow).
 * Set ANTHROPIC_API_KEY in project env vars.
 */

export const config = { maxDuration: 60 };

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

async function fetchWithRetry(url, options, attempts = 3, backoff = 10000) {
  for (let i = 0; i < attempts; i++) {
    const response = await fetch(url, options);
    if (response.ok || (response.status !== 529 && response.status !== 429)) {
      return response;
    }
    if (i < attempts - 1) {
      console.log(`Anthropic ${response.status}. Attempt ${i + 1} failed. Retrying in ${backoff}ms...`);
      await new Promise((resolve) => setTimeout(resolve, backoff));
    } else {
      return response;
    }
  }
}

function buildPrompt({ cvData, jobTitle, companyName, jobDescription, date, market }) {
  const exp = Array.isArray(cvData?.experience) ? cvData.experience.join("\n") : String(cvData?.experience || "");
  const toneLine =
    market === "India"
      ? "Tone: formal, traditional Indian corporate style."
      : "Tone: confident Gulf corporate style appropriate for UAE/GCC employers.";
  return `
You are an expert cover letter writer. Write ONLY the body of the cover letter as plain text:
- Exactly 3 paragraphs, separated by a single blank line.
- Do NOT include a salutation (no "Dear"), subject line, date, address block, or sign-off (no "Sincerely").
- Professional tone; align closely with the job description.
- ${toneLine}

Today's date (reference only; do not repeat in output): ${date || ""}

Candidate:
Name: ${cvData?.name || ""}
Current/target role: ${cvData?.role || ""}
Summary: ${cvData?.summary || ""}
Skills: ${cvData?.skills || ""}
Experience highlights:
${exp.slice(0, 6000)}

Job title: ${jobTitle || "Role"}
Company: ${(companyName || "").trim() || "the organisation"}

Job description:
${String(jobDescription || "").slice(0, 8000)}

Output the 3 paragraphs only.
`.trim();
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
  const { cvData, jobTitle, companyName, jobDescription, date, market } = body;

  if (!cvData || typeof cvData !== "object") {
    return res.status(400).json({ error: "Missing cvData." });
  }

  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "AI Engine is not configured. Please try again later." });
  }

  const prompt = buildPrompt({ cvData, jobTitle, companyName, jobDescription, date, market });

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
        max_tokens: 450,
        system: "CRITICAL: The cover letter body must not exceed 225 words. This is a hard layout constraint to ensure the document fits on one page. Prioritize impact over length.",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const responseText = await response.text();

    if (!response.ok) {
      return res.status(502).json({ error: "AI Engine is busy, please try again in a moment." });
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      return res.status(502).json({ error: "AI Engine is busy, please try again in a moment." });
    }

    const raw =
      (Array.isArray(data.content) && data.content[0] && data.content[0].text) ||
      data.content ||
      "";
    const coverLetterBody = String(raw).trim();

    if (!coverLetterBody) {
      return res.status(502).json({ error: "Could not generate cover letter. Please try again." });
    }

    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(200).json({ coverLetterBody });
  } catch (err) {
    console.error("cover-letter", err);
    return res.status(502).json({ error: "AI Engine is busy, please try again in a moment." });
  }
};
