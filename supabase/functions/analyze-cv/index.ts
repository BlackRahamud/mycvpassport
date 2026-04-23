import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { fileBase64, fileName, jobDescription, userId } = await req.json();

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");

  const prompt = `You are an ATS expert for GCC and India job markets.
Analyze this CV against the job description and return ONLY valid JSON.

Job Description: ${jobDescription || "General GCC market"}

CV File: ${fileName}
CV Content (base64): ${fileBase64?.substring(0, 500)}...

Return this exact JSON:
{
  "score": <number 0-100>,
  "keywordsScore": <number 0-100>,
  "structureScore": <number 0-100>,
  "contentScore": <number 0-100>,
  "visibilityBoosters": [<up to 8 keyword strings found>],
  "rankTriggers": [<up to 8 keyword strings missing>],
  "industry": "<detected industry>",
  "topPercent": <number>,
  "missingCount": <number>
}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicKey!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const ai = await response.json();
  const text = ai.content[0].text;
  const clean = text.replace(/```json|```/g, "").trim();
  const data = JSON.parse(clean);

  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});