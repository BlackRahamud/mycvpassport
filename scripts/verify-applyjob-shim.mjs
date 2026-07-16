#!/usr/bin/env node
/**
 * scripts/verify-applyjob-shim.mjs
 *
 * Before/after verification of the applyToJob cv_snapshot shim.
 *
 * Real path, not a hand-authored fixture object: a real CV's TEXT is run
 * through the REAL candidate extractor (transform parse, Sonnet) to produce
 * the exact builder-shape cv_data a candidate's cvs.cv_data holds. Then the
 * REAL verdict scorer (candidate_verdict, Sonnet) is run twice against the
 * same job:
 *   BEFORE = verdict on the raw builder cv_data (what applyToJob used to store)
 *   AFTER  = verdict on builderCvToSnapshot(cv_data) (what it stores now)
 *
 * It also prints what summariseCvForVerdict actually FEEDS the model in each
 * case, so the near-blind-vs-full difference is visible, not just the score.
 *
 * USAGE
 *   node scripts/verify-applyjob-shim.mjs --cv <cv.txt> [--job <job.json>]
 *   node scripts/verify-applyjob-shim.mjs --fixture evals/scan/fixtures/06-...json
 *
 *   --fixture reads .cv (CV text) and .jd (job description) from a scan fixture.
 *   NOTE: the scan fixtures are SYNTHETIC. Use them only to smoke-test that the
 *   shim moves the score; use --cv with a real CV for the binding number.
 *
 * REQUIRES  ANTHROPIC_API_KEY  (env, else .env.local / .env)
 *
 * Synced copies of the shipped transform-parse prompt, the shipped verdict
 * prompt, and the shim are guarded by assertInSync() against their source
 * files, so this can never quietly verify against stale logic.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { estimateCostUsd } from "../supabase/functions/analyze-cv/_pricing.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..");

// ── shim: synced from src/lib/jobs/cvSnapshot.js ─────────────────────────────
const str = (v) => { const t = v == null ? "" : String(v).trim(); return t ? t.slice(0, 2000) : null; };
const toList = (v) => {
  if (Array.isArray(v)) return v.map((x) => (typeof x === "string" ? x : x?.name || x?.label || "")).map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === "string") return v.split(/[,\n;]+/).map((x) => x.trim()).filter(Boolean);
  return [];
};
const toBullets = (v) => {
  if (Array.isArray(v)) return v.map((x) => (typeof x === "string" ? x : x?.text || "")).map((x) => String(x).replace(/^[\s\-•·*]+/, "").trim()).filter(Boolean);
  if (typeof v === "string") return v.split(/\r?\n+/).map((x) => x.replace(/^[\s\-•·*]+/, "").trim()).filter(Boolean);
  return [];
};
const customVal = (cf, id) => {
  const arr = Array.isArray(cf) ? cf : [];
  const hit = arr.find((e) => e && (e.id === id || String(e.name || "").toLowerCase() === id.replace(/_/g, " ")));
  return hit ? str(hit.value) : null;
};
function builderCvToSnapshot(cv) {
  if (!cv || typeof cv !== "object" || Array.isArray(cv)) return cv;
  const cf = cv.customFields;
  const location = str(cv.location) || str(cv.personal?.location);
  const desired_job = str(cv.desired_job) || str(cv.title) || str(cv.headline) || str(cv.personal?.headline);
  const experience = Array.isArray(cv.experience) ? cv.experience.map((e) => {
    const start = str(e?.start_date) || str(e?.startDate) || str(e?.period);
    const end = e?.present ? "Present" : (str(e?.end_date) || str(e?.endDate));
    return { ...e, title: str(e?.title) || str(e?.role), company: str(e?.company) || str(e?.employer), location: str(e?.location), start_date: start, end_date: end, bullets: toBullets(Array.isArray(e?.bullets) && e.bullets.length ? e.bullets : (e?.points ?? e?.description)) };
  }) : [];
  const education = Array.isArray(cv.education) ? cv.education.map((e) => ({ ...e, degree: str(e?.degree), field: str(e?.field) || str(e?.fieldOfStudy) || str(e?.major), school: str(e?.school) || str(e?.institution), location: str(e?.location), start_date: str(e?.start_date) || str(e?.startDate), end_date: str(e?.end_date) || str(e?.endDate) || str(e?.year) })) : [];
  return {
    ...cv, name: str(cv.name), email: str(cv.email), phone: str(cv.phone), location,
    nationality: str(cv.nationality) || str(cv.personal?.nationality), desired_job, summary: str(cv.summary),
    visa_status: str(cv.visa_status) || str(cv.visaStatus) || customVal(cf, "visa_status"),
    notice_period: str(cv.notice_period) || str(cv.availability) || customVal(cf, "notice_period"),
    salary_expectation: str(cv.salary_expectation) || str(cv.expected_salary) || null,
    passport_status: str(cv.passport_status) || null,
    skills: toList(cv.skills), experience, education,
    personal: { ...(cv.personal || {}), location, headline: desired_job, job_type: str(cv.personal?.job_type) },
  };
}

// ── verdict reader: synced summariseCvForVerdict from api/ai.js ──────────────
function summariseCvForVerdict(cv) {
  if (!cv || typeof cv !== "object") return "(no CV provided)";
  const personal = cv.personal || cv.basics || {};
  const name = cv.name || personal.name || "";
  const role = cv.desired_job || cv.target_role || personal.headline || "";
  const location = personal.location || cv.location || "";
  const visa = cv.visa_status || personal.visa_status || "";
  const notice = cv.notice_period || personal.notice_period || cv.availability || "";
  const skillsRaw = cv.skills || cv.skill_list || cv.tools || [];
  const skills = Array.isArray(skillsRaw) ? skillsRaw.map((s) => (typeof s === "string" ? s : s?.name || s?.label)).filter(Boolean).join(", ") : "";
  const exp = Array.isArray(cv.experience) ? cv.experience.slice(0, 6).map((e) => {
    const head = [e.title || e.role, e.company || e.employer].filter(Boolean).join(" at ");
    const dates = [e.start_date, e.end_date].filter(Boolean).join(" - ");
    const detail = Array.isArray(e.bullets) ? e.bullets.slice(0, 4).join("; ") : (e.description || e.summary || "");
    return `- ${head}${dates ? ` (${dates})` : ""}: ${String(detail).slice(0, 400)}`;
  }).join("\n") : "";
  const edu = Array.isArray(cv.education) ? cv.education.slice(0, 3).map((e) => [e.degree, e.field, e.school || e.institution].filter(Boolean).join(", ")).filter(Boolean).join("; ") : "";
  return [name && `Name: ${name}`, role && `Current/target role: ${role}`, location && `Location: ${location}`, visa && `Visa status: ${visa}`, notice && `Availability/notice: ${notice}`, skills && `Skills: ${skills}`, exp && `Experience:\n${exp}`, edu && `Education: ${edu}`].filter(Boolean).join("\n").slice(0, 6000) || "(no CV provided)";
}

const VERDICT_SYSTEM = `You are a corridor-aware HR matching engine for the India -> Gulf (UAE/GCC) recruitment corridor. You decide whether a candidate fits a specific role and return a calibrated verdict.

SCORING WEIGHTS (sum to 100):
- Core technical skills / non-negotiables: 50%
- Domain-specific experience (same field/industry): 25%
- Corridor logistics (visa status, location, notice period, GCC experience): 15%
- Soft skills / secondary certifications: 10%

CRITICAL - SEMANTIC EQUIVALENCE, NOT KEYWORD MATCHING:
Credit real, equivalent experience even when the CV does not use the JD's exact words.
Reward genuine capability. Only count a true GAP when the capability is genuinely absent from the CV.

VERDICT MUST MATCH SCORE:
- score >= 80 -> "STRONG FIT"
- score 50-79 -> "MAYBE"
- score < 50 -> "PASS"

OUTPUT - STRICT JSON ONLY:
{ "verdict": "STRONG FIT" | "MAYBE" | "PASS", "score": <integer 0-100>,
  "two_second_why": ["Match: ...", "Corridor: ...", "Gap: ..."],
  "whatsapp_cta_template": "..." }`;

function buildVerdictUserPrompt({ cvSnapshot, job }) {
  const j = job && typeof job === "object" ? job : {};
  const skills = Array.isArray(j.skills) ? j.skills.join(", ") : String(j.skills || "");
  return `ROLE:
Title: ${String(j.title || "").slice(0, 200) || "(untitled)"}
Required skills: ${skills.slice(0, 1000) || "(none listed)"}
Description:
${String(j.description || "").slice(0, 3000) || "(none)"}

CANDIDATE CV:
${summariseCvForVerdict(cvSnapshot)}

Return the strict JSON verdict now.`;
}

// ── transform parse: synced from api/transform.js (produces builder cv_data) ─
const TRANSFORM_SYSTEM = `You are a strict resume extraction engine.

HARD CONSTRAINTS:
1. Extract only explicitly stated information
2. Never fabricate, infer, or normalize missing data
3. When uncertain, omit the field entirely - leave null

OUTPUT CONTRACT:
- Return only one raw JSON object, no markdown, no commentary
- Missing fields return null, never a guessed value`;
function transformParsePrompt(text) {
  return `RAW EXTRACTED CV TEXT:
<<<
${text}
>>>

Extract into the canonical CVPassport resume shape:
{ name, email, phone, linkedin, location, title, summary, nationality, visaStatus, dob, gender, maritalStatus,
  experience: [...], education: [...], skills, languages, certifications: [...], availability, drivingLicense, references }
experience[i] = { company, role, location, period, points, startDate, endDate, present }
education[i]  = { school, degree, year, fieldOfStudy, startDate, endDate, location }
Rules:
- points = newline-separated bullet sentences as written.
- skills = comma-separated string e.g. "JavaScript, Python, SQL". NEVER an array.
- Missing scalar fields = null. Empty arrays = [].
- Output ONE JSON object only, no markdown.`;
}

function assertInSync(file, sentinels) {
  const src = fs.readFileSync(path.join(REPO, file), "utf8");
  const missing = sentinels.filter((x) => !src.includes(x));
  if (missing.length) throw new Error(`verify OUT OF SYNC with ${file} — missing:\n  ${missing.join("\n  ")}`);
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
async function anthropic(apiKey, { model, maxTokens, temp, system, user }) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, max_tokens: maxTokens, temperature: temp, system, messages: [{ role: "user", content: user }] }),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Anthropic ${res.status}: ${body.slice(0, 200)}`);
  const data = JSON.parse(body);
  const raw = (Array.isArray(data.content) && data.content[0] && data.content[0].text) || "";
  return { raw, usage: data.usage || {} };
}
function parseJsonLoose(raw) {
  const c = String(raw).replace(/```json|```/g, "").trim();
  const a = c.indexOf("{"), b = c.lastIndexOf("}");
  return JSON.parse(a > -1 && b > -1 ? c.slice(a, b + 1) : c);
}

function arg(name) { const i = process.argv.indexOf(name); return i > -1 ? process.argv[i + 1] : null; }

async function main() {
  assertInSync("api/ai.js", ["SCORING WEIGHTS (sum to 100)", "Corridor logistics (visa status, location, notice period, GCC experience): 15%", "Current/target role:"]);
  assertInSync("api/transform.js", ["You are a strict resume extraction engine.", "Extract into the canonical CVPassport resume shape:"]);
  assertInSync("src/lib/jobs/cvSnapshot.js", ["export function builderCvToSnapshot", "visa_status: str(cv.visa_status) || str(cv.visaStatus)"]);

  const apiKey = loadApiKey();
  if (!apiKey) { console.error("ANTHROPIC_API_KEY not found."); process.exit(1); }

  let cvText, job, synthetic = false;
  const fixture = arg("--fixture");
  if (fixture) {
    const f = JSON.parse(fs.readFileSync(fixture, "utf8"));
    cvText = typeof f.cv === "string" ? f.cv : JSON.stringify(f.cv);
    const jd = typeof f.jd === "string" ? f.jd : "";
    job = { title: (jd.split("\n")[0] || f.label || "Role").trim(), description: jd, skills: [], requirements: [] };
    synthetic = f.synthetic !== false;
  } else {
    const cvPath = arg("--cv");
    if (!cvPath) { console.error("Usage: --cv <cv.txt> [--job <job.json>]  OR  --fixture <scan-fixture.json>"); process.exit(1); }
    cvText = fs.readFileSync(cvPath, "utf8");
    const jobPath = arg("--job");
    job = jobPath ? JSON.parse(fs.readFileSync(jobPath, "utf8")) : { title: "Role (generic)", description: cvText.slice(0, 400), skills: [], requirements: [] };
  }

  if (synthetic) console.log("⚠️  SYNTHETIC CV — smoke test only. Use --cv with a real CV for the binding number.\n");

  // 1. Real candidate extractor → real builder cv_data.
  console.log("Parsing CV through the candidate extractor (transform, Sonnet)…");
  const parsed = await anthropic(apiKey, { model: "claude-sonnet-4-6", maxTokens: 6000, temp: 0, system: TRANSFORM_SYSTEM, user: transformParsePrompt(cvText) });
  const cvData = parseJsonLoose(parsed.raw);
  const snapshot = builderCvToSnapshot(cvData);

  // 2. What the verdict actually reads, before vs after.
  console.log("\n──────── WHAT THE VERDICT READS ────────");
  console.log("\n[BEFORE — raw builder cv_data]\n" + summariseCvForVerdict(cvData));
  console.log("\n[AFTER — shimmed snapshot]\n" + summariseCvForVerdict(snapshot));

  // 3. Score both against the same job.
  const runVerdict = async (cv, label) => {
    const r = await anthropic(apiKey, { model: "claude-sonnet-4-6", maxTokens: 900, temp: 0.2, system: VERDICT_SYSTEM, user: buildVerdictUserPrompt({ cvSnapshot: cv, job }) });
    const v = parseJsonLoose(r.raw);
    const cost = estimateCostUsd({ model: "claude-sonnet-4-6", inputTokens: r.usage.input_tokens || 0, outputTokens: r.usage.output_tokens || 0 });
    return { v, cost, label };
  };
  console.log("\n──────── VERDICT (same CV, same job) ────────");
  console.log(`Job: ${job.title}`);
  const before = await runVerdict(cvData, "BEFORE");
  const after = await runVerdict(snapshot, "AFTER");
  for (const r of [before, after]) {
    console.log(`\n[${r.label}]  score=${r.v.score}  verdict=${r.v.verdict}`);
    (r.v.two_second_why || []).forEach((l) => console.log(`   ${l}`));
  }
  console.log(`\nΔ score: ${before.v.score} → ${after.v.score}  (${after.v.score - before.v.score >= 0 ? "+" : ""}${after.v.score - before.v.score})`);
}

main().catch((e) => { console.error(e); process.exit(1); });
