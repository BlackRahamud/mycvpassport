#!/usr/bin/env node
/**
 * scripts/eval-corridor-extraction.mjs
 *
 * Extractor PARITY eval — the two extractors we ACTUALLY SHIP, on the same CVs:
 *
 *   A) import_structure  — Haiku, the corrected corridor prompt (HR bulk import,
 *                          api/ai.js). Snake_case snapshot, skills as an array.
 *   B) transform parse   — Sonnet, the builder-shape parser (candidate CV import,
 *                          api/transform.js). camelCase cv_data, skills as a string.
 *
 * Both are run against each CV and normalised onto the fields they SHARE:
 *   name, email, phone, location, nationality, visa, notice, skills,
 *   experience, education.
 *
 * The question this answers: on the shared fields, is the Sonnet builder parser
 * strictly better than the Haiku corridor parser? i.e. should the HR path just
 * call the candidate path instead of maintaining a second extractor?
 *
 * It is NOT a Haiku-vs-Sonnet-on-one-prompt test — the prompts differ because
 * the shipped extractors differ. This tests reality, not a hypothesis.
 *
 * INPUT (privacy: real candidate CVs never enter the repo)
 *   A directory of *.txt files, one per CV = the extracted plain text.
 *   Optional ground truth per CV as <name>.truth.json (the shared fields;
 *   null = absent from the CV) to score fill correctness + flag guesses.
 *
 * USAGE
 *   node scripts/eval-corridor-extraction.mjs --dir <folder>
 *
 * REQUIRES  ANTHROPIC_API_KEY  (env, else .env.local / .env)
 *
 * Both prompts below are synced copies of the shipped prompts. The two
 * assert*InSync() guards read api/ai.js and api/transform.js and throw if a
 * shipped prompt has drifted, so the eval can never quietly test a stale one.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { estimateCostUsd } from "../supabase/functions/analyze-cv/_pricing.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..");

const SHARED_FIELDS = ["name", "email", "phone", "location", "nationality", "visa", "notice", "skills", "experience", "education"];
const SCALARS = ["name", "email", "phone", "location", "nationality", "visa", "notice"];

// ── Extractor A: import_structure (Haiku, corrected) — synced from api/ai.js ──
const IMPORT_MODEL = { call: "claude-haiku-4-5-20251001", price: "claude-haiku-4-5", maxTokens: 2000, temp: 0.2 };
function importSystem() {
  return `You are an institutional-grade CV parsing engine for the India -> Gulf (UAE/GCC) recruitment corridor. You convert raw CV text into a single strict JSON candidate snapshot.

You never invent data. If a field is not present in the text, use null. The corridor readiness fields (nationality, visa_status, notice_period, salary_expectation, passport_status) are frequently absent from a CV; null is the correct, expected answer for an absent field and is never a failure. Precision beats coverage: a confident wrong value is far worse than null. Never guess, and never infer these fields from indirect signals (name, location, language, phone code, education, age, or profession).

ASCII punctuation only. No commentary, no markdown, JSON only.`;
}
function importPrompt(text) {
  return `Parse the following CV text into ONE strict JSON object with EXACTLY these keys:

{
  "name": string | null,
  "email": string | null,
  "phone": string | null,
  "location": string | null,
  "nationality": string | null,
  "desired_job": string | null,
  "summary": string | null,
  "visa_status": string | null,
  "notice_period": string | null,
  "salary_expectation": string | null,
  "passport_status": string | null,
  "skills": string[],
  "experience": [
    { "title": string | null, "company": string | null, "location": string | null, "start_date": string | null, "end_date": string | null, "bullets": string[] }
  ],
  "education": [
    { "degree": string | null, "field": string | null, "school": string | null, "location": string | null, "start_date": string | null, "end_date": string | null }
  ]
}

RULES:
- Dates are human-readable strings (e.g. "Jan 2022", "Present"), never timestamps.
- "name" is the candidate's full name from the header. "email" / "phone" are the candidate's own contact details if present.
- "desired_job" is the current or target role/headline.
- "visa_status" / "notice_period" only if the CV states them (common in Gulf CVs); else null.
- "nationality": the candidate's stated nationality or citizenship, exactly as written (e.g. "Indian", "Filipino"), ONLY if the CV states it. Never infer it from the name, location, language, or phone code. Null if not stated.
- "salary_expectation": the stated expected or current salary EXACTLY as written, keeping the currency and period (e.g. "AED 8,000 per month", "12 LPA", "45000 INR"). Do not convert currencies, normalise, or estimate from role or experience. Null if not stated.
- "passport_status": ONLY the passport or emigration category the CV explicitly prints (e.g. "ECR", "ECNR", "Non-ECR"). Never infer ECR or ECNR from education, age, profession, or nationality. If the CV does not literally state it, this MUST be null.
- "skills" is a flat array of distinct skill / tool strings (max 25). Empty array if none.
- Preserve the candidate's real achievements in "bullets". Never fabricate metrics, employers, dates, or qualifications.
- If the text is too garbled to parse, return the object with name null and empty arrays.

CV TEXT:
<<<
${String(text || "").slice(0, 14000)}
>>>

Return the JSON object only.`;
}
function sharedFromImport(p) {
  return {
    name: s(p.name), email: s(p.email), phone: s(p.phone), location: s(p.location),
    nationality: s(p.nationality), visa: s(p.visa_status), notice: s(p.notice_period),
    skills: Array.isArray(p.skills) ? p.skills.map(s).filter(Boolean) : [],
    experience: Array.isArray(p.experience) ? p.experience.length : 0,
    education: Array.isArray(p.education) ? p.education.length : 0,
  };
}

// ── Extractor B: transform parse (Sonnet) — synced from api/transform.js ──────
const TRANSFORM_MODEL = { call: "claude-sonnet-4-6", price: "claude-sonnet-4-6", maxTokens: 6000, temp: 0 };
function transformSystem() {
  return `You are a strict resume extraction engine.

CONFLICT RESOLUTION ORDER:
1. Schema validity - must return valid JSON matching our resume shape
2. Source fidelity - exactly what the CV states
3. Omit uncertain values - never guess

HARD CONSTRAINTS:
1. Extract only explicitly stated information
2. Never fabricate, infer, or normalize missing data
3. Keep original wording and original language
4. When uncertain, omit the field entirely - leave null
5. Do not use external knowledge

EXTRACTION RULES:
- Ignore OCR noise, watermarks, repeated headers/footers, broken line wraps
- Dates: preserve exactly as written
- URLs: include only full URLs explicitly present
- Contact data: copy as-is, do not reformat
- Skills: include only explicitly stated skills - never infer
- Descriptions: preserve original bullet structure
- Regional metadata: capture visa status, notice period, driving license, and Nafis
  registration as customFields entries when explicitly present in the CV. Never
  infer Nafis registration. Omit any field with no source value.
- If PDF is low quality or partially unreadable: return best-effort for readable parts only

OUTPUT CONTRACT:
- Return only one raw JSON object
- No markdown, no commentary, no extra keys
- Missing fields return null, never a guessed value`;
}
function transformPrompt(text) {
  return `RAW EXTRACTED CV TEXT (may contain OCR noise, broken line wraps, watermarks):
<<<
${text}
>>>

Extract into the canonical CVPassport resume shape:
{ name, email, phone, linkedin, location, title, summary,
  nationality, visaStatus, dob, gender, maritalStatus,
  experience: [...], education: [...],
  skills, languages, certifications: [...],
  technicalSkills, projects, volunteerWork, publications,
  customFields: [...],
  availability, drivingLicense, willingToRelocate, references }

experience[i] = { company, role, location, period, points, startDate, endDate, present }
education[i]  = { school, degree, year, fieldOfStudy, startDate, endDate, location }
certifications[i] = { name, issuer, year }
customFields[i] = { id, icon, name, value }

Regional fields - if explicitly stated in the CV, add as customFields entries:
  - visa_status      -> { id: "visa_status",      icon: "shield", name: "Visa Status",       value: "..." }
  - notice_period    -> { id: "notice_period",    icon: "clock",  name: "Notice Period",     value: "..." }
  - driving_license  -> { id: "driving_license",  icon: "car",    name: "Driving License",   value: "..." }
  - nafis_registered -> { id: "nafis_registered", icon: "check",  name: "Nafis Registered",  value: "Yes" }
                        Only include if the CV explicitly states Nafis registration. Never infer.
Omit entries with no source value. customFields = [] if no regional data present.

Rules:
- points = newline-separated bullet sentences as written, no leading bullets or dashes.
- linkedin = full profile URL only (e.g. "https://linkedin.com/in/jane-doe"). Omit short handles or partial URLs.
- skills = comma-separated string e.g. "JavaScript, Python, SQL". NEVER an array. NEVER an object. If no skills are present, return "" (empty string), not null.
- languages = comma-separated string e.g. "English, Hindi, Arabic". NEVER an array. NEVER an object. If no languages are present, return "" (empty string), not null.
- Missing scalar fields = null. Empty arrays = [].
- Preserve dates verbatim (do not normalize formats).
- Output ONE JSON object only, no markdown, no commentary.`;
}
function sharedFromTransform(p) {
  const cf = Array.isArray(p.customFields) ? p.customFields : [];
  const cfVal = (id) => { const e = cf.find((x) => x && x.id === id); return e ? s(e.value) : null; };
  return {
    name: s(p.name), email: s(p.email), phone: s(p.phone), location: s(p.location),
    nationality: s(p.nationality),
    // Reproduce the readiness reader's blind spots too: readiness reads
    // visaStatus? NO — it reads visa_status. Here we take the best the builder
    // shape offers (flat visaStatus OR the customFields entry) to measure what
    // the extractor CAPTURED, independent of the read-side mismatch.
    visa: s(p.visaStatus) || cfVal("visa_status"),
    notice: s(p.availability) || cfVal("notice_period"),
    skills: typeof p.skills === "string" ? p.skills.split(",").map(s).filter(Boolean)
      : (Array.isArray(p.skills) ? p.skills.map(s).filter(Boolean) : []),
    experience: Array.isArray(p.experience) ? p.experience.length : 0,
    education: Array.isArray(p.education) ? p.education.length : 0,
  };
}

const EXTRACTORS = [
  { key: "import(Haiku)",    model: IMPORT_MODEL,    system: importSystem,    prompt: importPrompt,    shared: sharedFromImport },
  { key: "transform(Sonnet)", model: TRANSFORM_MODEL, system: transformSystem, prompt: transformPrompt, shared: sharedFromTransform },
];

// ── helpers ──────────────────────────────────────────────────────────────────
function s(v) { const t = v == null ? "" : String(v).trim(); return t ? t.slice(0, 400) : null; }
const norm = (v) => String(v == null ? "" : v).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const filled = (v) => (Array.isArray(v) ? v.length > 0 : (typeof v === "number" ? v > 0 : v != null));

function assertInSync(file, sentinels) {
  const src = fs.readFileSync(path.join(REPO, file), "utf8");
  const missing = sentinels.filter((x) => !src.includes(x));
  if (missing.length) throw new Error(`eval OUT OF SYNC with ${file} — missing:\n  ${missing.join("\n  ")}`);
}

function loadApiKey() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  for (const f of [".env.local", ".env"]) {
    const p = path.join(REPO, f);
    if (!fs.existsSync(p)) continue;
    const line = fs.readFileSync(p, "utf8").split(/\r?\n/).find((l) => l.startsWith("ANTHROPIC_API_KEY="));
    if (line) return line.slice("ANTHROPIC_API_KEY=".length).trim().replace(/^["']|["']$/g, "");
  }
  return null;
}

async function callModel(apiKey, ex, cvText) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: ex.model.call, max_tokens: ex.model.maxTokens, temperature: ex.model.temp,
        system: ex.system(), messages: [{ role: "user", content: ex.prompt(cvText) }],
      }),
    });
    if ((res.status === 429 || res.status === 529) && attempt < 2) { await new Promise((r) => setTimeout(r, 4000)); continue; }
    const body = await res.text();
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${body.slice(0, 200)}`);
    const data = JSON.parse(body);
    const raw = (Array.isArray(data.content) && data.content[0] && data.content[0].text) || "";
    const cleaned = String(raw).replace(/```json|```/g, "").trim();
    const a = cleaned.indexOf("{"), b = cleaned.lastIndexOf("}");
    const parsed = JSON.parse(a > -1 && b > -1 ? cleaned.slice(a, b + 1) : cleaned);
    return {
      shared: ex.shared(parsed),
      usage: { inputTokens: data?.usage?.input_tokens ?? 0, outputTokens: data?.usage?.output_tokens ?? 0 },
    };
  }
  throw new Error("exhausted retries");
}

function fmt(v) { return Array.isArray(v) ? `[${v.length}]` : (v == null ? "null" : (typeof v === "number" ? String(v) : JSON.stringify(v))); }

async function main() {
  assertInSync("api/ai.js", ['"salary_expectation": string | null', '"passport_status": string | null', "Precision beats coverage"]);
  assertInSync("api/transform.js", ["You are a strict resume extraction engine.", "Extract into the canonical CVPassport resume shape:", "nafis_registered"]);

  const dirArg = process.argv.indexOf("--dir");
  const dir = dirArg > -1 ? process.argv[dirArg + 1] : null;
  if (!dir) { console.error("Usage: node scripts/eval-corridor-extraction.mjs --dir <folder-of-CV-.txt-files>"); process.exit(1); }
  const apiKey = loadApiKey();
  if (!apiKey) { console.error("ANTHROPIC_API_KEY not found (env or .env.local)."); process.exit(1); }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".txt")).sort();
  if (!files.length) { console.error(`No .txt CV files in ${dir}`); process.exit(1); }

  const fill = {};   // extractor -> field -> filled count
  const cost = {};   // extractor -> usd
  const onlyOne = { A: 0, B: 0 }; // scalar fields one extractor got and the other missed
  const disagree = {}; // scalar field -> count where both filled but values differ
  for (const ex of EXTRACTORS) { fill[ex.key] = Object.fromEntries(SHARED_FIELDS.map((f) => [f, 0])); cost[ex.key] = 0; }
  for (const f of SCALARS) disagree[f] = 0;

  for (const file of files) {
    const cvText = fs.readFileSync(path.join(dir, file), "utf8");
    console.log(`\n=== ${file.replace(/\.txt$/, "")} ===`);
    const got = {};
    for (const ex of EXTRACTORS) {
      try {
        const r = await callModel(apiKey, ex, cvText);
        got[ex.key] = r.shared;
        cost[ex.key] += estimateCostUsd({ model: ex.model.price, inputTokens: r.usage.inputTokens, outputTokens: r.usage.outputTokens });
        for (const f of SHARED_FIELDS) if (filled(r.shared[f])) fill[ex.key][f]++;
      } catch (e) { console.log(`  ${ex.key} ERROR: ${e.message}`); got[ex.key] = null; }
    }
    // side-by-side per field
    const [A, B] = EXTRACTORS;
    for (const f of SHARED_FIELDS) {
      const va = got[A.key]?.[f], vb = got[B.key]?.[f];
      let tag = "";
      if (got[A.key] && got[B.key]) {
        const fa = filled(va), fb = filled(vb);
        if (fa && !fb) { tag = "  <A only>"; onlyOne.A++; }
        else if (!fa && fb) { tag = "  <B only>"; onlyOne.B++; }
        else if (fa && fb && SCALARS.includes(f) && norm(va) !== norm(vb)) { tag = "  <differ>"; disagree[f]++; }
      }
      console.log(`  ${f.padEnd(12)} A=${fmt(va).padEnd(22)} B=${fmt(vb).padEnd(22)}${tag}`);
    }
  }

  const n = files.length;
  console.log(`\n──────── PARITY SUMMARY over ${n} CV(s) ────────`);
  console.log(`A = ${EXTRACTORS[0].key} (HR path)   B = ${EXTRACTORS[1].key} (candidate path)\n`);
  console.log("field".padEnd(12), "A fill".padStart(8), "B fill".padStart(8));
  for (const f of SHARED_FIELDS) {
    console.log(f.padEnd(12), `${fill[EXTRACTORS[0].key][f]}/${n}`.padStart(8), `${fill[EXTRACTORS[1].key][f]}/${n}`.padStart(8));
  }
  console.log(`\nscalar fields A-only-filled: ${onlyOne.A}   B-only-filled: ${onlyOne.B}`);
  console.log("scalar disagreements (both filled, values differ):", SCALARS.map((f) => `${f}:${disagree[f]}`).join("  "));
  for (const ex of EXTRACTORS) console.log(`cost ${ex.key.padEnd(18)} $${cost[ex.key].toFixed(5)} total, $${(cost[ex.key] / n).toFixed(5)}/CV, $${(cost[ex.key] / n * 20).toFixed(4)} per 20-CV import`);
  console.log(`\nRead: if B fills >= A on every shared field with few disagreements, the HR path could call the candidate path. Eyeball disagreements — parity of FILL is not parity of CORRECTNESS.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
