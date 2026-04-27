#!/usr/bin/env node
/**
 * Smoke test for the deployed analyze-cv Edge Function.
 *
 * Reads SUPABASE_URL + ANON_KEY from .env.local, picks a representative
 * fixture (default: 06-gulf-expat-swe-dubai), POSTs to the live function,
 * and asserts:
 *   - HTTP 200 with the expected response shape
 *   - reasons[] has 5 entries with claim + evidence + weight
 *   - at least 2 reasons quote a CV-specific phrase verbatim
 *
 * Usage:
 *   node scripts/verify-analyze-cv-deploy.mjs
 *   FIXTURE=11-india-bfsi-mumbai node scripts/verify-analyze-cv-deploy.mjs
 *   TIER=paid node scripts/verify-analyze-cv-deploy.mjs
 *
 * Exit 0 on PASS, 1 on FAIL.
 */

import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");

function loadDotenv(file) {
  const out = {};
  if (!existsSync(join(REPO_ROOT, file))) return out;
  const raw = readFileSync(join(REPO_ROOT, file), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = /^([A-Z_][A-Z0-9_]*)=(.*)$/.exec(trimmed);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

const env = { ...loadDotenv(".env"), ...loadDotenv(".env.local") };
const SUPABASE_URL = env.REACT_APP_SUPABASE_URL || env.SUPABASE_URL;
const ANON_KEY = env.REACT_APP_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !ANON_KEY) {
  console.error("FAIL: missing REACT_APP_SUPABASE_URL or REACT_APP_SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}

const fixtureSlug = process.env.FIXTURE || "06-gulf-expat-swe-dubai";
const tier = process.env.TIER || "free";
const fixturePath = join(REPO_ROOT, "evals", "scan", "fixtures", `${fixtureSlug}.json`);
if (!existsSync(fixturePath)) {
  console.error(`FAIL: fixture not found: ${fixturePath}`);
  process.exit(1);
}
const fixture = JSON.parse(readFileSync(fixturePath, "utf8"));

console.log("=".repeat(72));
console.log(`  analyze-cv live verification`);
console.log("=".repeat(72));
console.log(`  fixture: ${fixture.id}`);
console.log(`  label:   ${fixture.label}`);
console.log(`  tier:    ${tier}  (${tier === "paid" ? "Sonnet 4.6" : "Haiku 4.5"})`);
console.log(`  url:     ${SUPABASE_URL}/functions/v1/analyze-cv`);
console.log("");
console.log("POSTing…");

const startedAt = Date.now();
let res;
try {
  res = await fetch(`${SUPABASE_URL}/functions/v1/analyze-cv`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ANON_KEY}`,
      apikey: ANON_KEY,
    },
    body: JSON.stringify({
      cvText: fixture.cv,
      jobDescription: fixture.jd,
      userId: "verify-deploy",
      tier,
    }),
  });
} catch (err) {
  console.error(`FAIL: network error: ${err && err.message ? err.message : err}`);
  process.exit(1);
}

const elapsed = ((Date.now() - startedAt) / 1000).toFixed(1);

if (!res.ok) {
  const body = await res.text();
  console.error(`FAIL: HTTP ${res.status} after ${elapsed}s\n${body.slice(0, 800)}`);
  process.exit(1);
}

let data;
try {
  data = await res.json();
} catch (err) {
  console.error(`FAIL: response was not JSON: ${err && err.message ? err.message : err}`);
  process.exit(1);
}

console.log(`HTTP 200 in ${elapsed}s`);
console.log("");
console.log("Result:");
console.log(`  score:     ${data.score}  (top ${data.topPercent ?? "?"}%)`);
console.log(`  sub:       keywords ${data.keywordsScore} | structure ${data.structureScore} | content ${data.contentScore}`);
console.log(`  industry:  ${data.industry}`);
console.log(`  seniority: ${data.seniority}`);
console.log(`  model:     ${data.model}`);
console.log(`  usage:     ${JSON.stringify(data.usage)}`);
console.log(`  missingJd: ${data.missingJd}`);

const issues = [];
if (typeof data.score !== "number") issues.push("score is not a number");
if (!Array.isArray(data.reasons) || data.reasons.length !== 5) {
  issues.push(`reasons should have 5 entries, got ${Array.isArray(data.reasons) ? data.reasons.length : typeof data.reasons}`);
}
if (!Array.isArray(data.missingSkills) || data.missingSkills.length === 0) {
  issues.push("missingSkills is empty");
}
if (!data.atsFlags || typeof data.atsFlags !== "object") {
  issues.push("atsFlags missing or wrong type");
}
if (!data.confidence || typeof data.confidence !== "object") {
  issues.push("confidence missing or wrong type");
}

if (issues.length > 0) {
  console.error("");
  console.error("FAIL: response shape issues:");
  for (const i of issues) console.error(`  - ${i}`);
  process.exit(1);
}

console.log("");
console.log("Reasons:");
for (const [i, r] of data.reasons.entries()) {
  console.log(`  ${i + 1}. [${r.weight}] ${r.claim}`);
  console.log(`     evidence: "${r.evidence}"`);
}

// CV-specific keywords for fixture 06 (Indian SWE in Dubai)
// For other fixtures, fall back to a heuristic: extract candidate-distinctive
// phrases from the CV (proper nouns, not common words).
const FIXTURE_KEYWORDS = {
  "06-gulf-expat-swe-dubai": [
    "Careem",
    "Infosys",
    "NIT Trichy",
    "AWS",
    "Lambda",
    "DynamoDB",
    "Kafka",
    "Java Spring",
    "PostgreSQL",
    "Tamil",
    "Malayalam",
    "Hindi",
    "Dubai",
    "CKAD",
    "Solutions Architect",
  ],
};

const keywords = FIXTURE_KEYWORDS[fixtureSlug] ?? deriveKeywords(fixture.cv);

const lowerEvidence = data.reasons.map((r) => String(r.evidence || "").toLowerCase());
const hits = new Set();
for (const k of keywords) {
  if (lowerEvidence.some((e) => e.includes(k.toLowerCase()))) hits.add(k);
}

console.log("");
console.log(`Verbatim CV quotes in evidence: ${hits.size} distinct keywords`);
if (hits.size > 0) console.log(`  matched: ${[...hits].join(", ")}`);

if (hits.size < 2) {
  console.error("");
  console.error("FAIL: fewer than 2 distinct CV-specific quotes in reasons[].evidence.");
  console.error("       This looks like generic boilerplate — the smoking gun is NOT fixed.");
  process.exit(1);
}

console.log("");
console.log("PASS: response quotes the CV.  Smoking gun is fixed in production.");
// Don't process.exit(0) — Node-on-Windows asserts on libuv cleanup when
// fetch keepalive sockets are still pending. Let the event loop drain
// naturally; default exit code is 0.

function deriveKeywords(cvText) {
  // Loose heuristic for fixtures we don't have a curated keyword list for:
  // pick capitalized words that aren't English stop-noise.
  const stop = new Set([
    "EDUCATION", "EXPERIENCE", "LANGUAGES", "CERTS", "SKILLS",
    "BSc", "MSc", "BCom", "BBA", "MBA", "BTech", "MTech", "Diploma",
    "English", "Arabic", "Hindi",
  ]);
  const tokens = (cvText.match(/[A-Z][A-Za-z0-9&-]{3,}/g) || []).filter((t) => !stop.has(t));
  return [...new Set(tokens)].slice(0, 20);
}
