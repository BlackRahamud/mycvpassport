/**
 * Builds the prompt that the PAID tier sends to Anthropic, mirroring
 * supabase/functions/analyze-cv/index.ts:17-36 exactly.
 *
 * The smoking gun: only `fileBase64?.substring(0, 500)` is included.
 * This module's `containsCvText()` exposes that as a checkable invariant.
 *
 * No actual API call is made — that would burn tokens proving a defect
 * we already understand. The structural test is sufficient to gate CI.
 */

export function buildLegacyPaidPrompt({ fileBase64, fileName, jobDescription }) {
  return `You are an ATS expert for GCC and India job markets.
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
}

/**
 * Build the legacy paid prompt for a fixture, then check whether a
 * recognisable CV-content fingerprint survived into the prompt.
 *
 * Two checks:
 *   1. raw CV text appears in the prompt verbatim (it never will — the
 *      CV is sent base64-encoded).
 *   2. base64 of the CV, decoded, recovers the full CV (it can't —
 *      the substring(0, 500) truncates to ~375 raw bytes).
 */
export function checkPaidPromptIntegrity(fixture) {
  const cv = String(fixture.cv ?? "");
  const fileBase64 = Buffer.from(cv, "utf8").toString("base64");
  const prompt = buildLegacyPaidPrompt({
    fileBase64,
    fileName: "cv.pdf",
    jobDescription: fixture.jd,
  });

  const cvFingerprint = cv.slice(50, 130);
  const promptContainsRawCv = cvFingerprint.length > 0 && prompt.includes(cvFingerprint);

  const truncatedB64 = fileBase64.substring(0, 500);
  let decodedTruncated = "";
  try {
    decodedTruncated = Buffer.from(truncatedB64, "base64").toString("utf8");
  } catch {
    decodedTruncated = "";
  }
  const decodedCoversFullCv = decodedTruncated.length >= cv.length;

  return {
    cvLength: cv.length,
    base64Length: fileBase64.length,
    base64SentLength: truncatedB64.length,
    decodedSentLength: decodedTruncated.length,
    promptLength: prompt.length,
    promptContainsRawCv,
    decodedCoversFullCv,
    pass: promptContainsRawCv || decodedCoversFullCv,
    failureReason:
      promptContainsRawCv || decodedCoversFullCv
        ? null
        : "supabase/functions/analyze-cv/index.ts:23 sends only fileBase64.substring(0, 500); the model never sees the full CV text",
  };
}
