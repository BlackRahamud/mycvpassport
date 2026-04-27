#!/usr/bin/env node
/**
 * ATS scan eval runner.
 *
 * Loads fixtures, builds the new (Day 2) prompt for each, and gates
 * Phase 1 PRs on:
 *   1. Adversarial variance — different CVs → different prompts (structural)
 *   2. Paid prompt integrity — CV text is in the prompt (structural)
 *   3. Field accuracy — model returns plausible industry+seniority (behavioral, gated on ANTHROPIC_API_KEY)
 *   4. Score band — model score lands in the persona band (behavioral, gated on ANTHROPIC_API_KEY)
 *
 *   npm run eval:scan
 *
 * Exit code:
 *   0 — all required invariants pass (structural always; behavioral if API key present)
 *   1 — one or more failed
 *
 * Behavioral metrics SKIP cleanly without an API key — they don't fail
 * the run. Set ANTHROPIC_API_KEY locally to gate on them. Set EVAL_FULL=1
 * to run the full 30-fixture behavioral sweep instead of the cheap 10.
 *
 * Writes a baseline JSON to evals/scan/baseline/<date>-baseline.json.
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { computeAdversarial } from "./metrics/adversarial.mjs";
import { computeFieldAccuracy } from "./metrics/fieldAccuracy.mjs";
import { computeScoreBand } from "./metrics/scoreBand.mjs";
import { computePaidPromptIntegrity } from "./metrics/paidPromptIntegrity.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = join(__dirname, "fixtures");
const BASELINE_DIR = join(__dirname, "baseline");

function loadFixtures() {
  if (!existsSync(FIXTURES_DIR)) {
    throw new Error(`fixtures dir missing: ${FIXTURES_DIR}`);
  }
  const files = readdirSync(FIXTURES_DIR).filter((f) => f.endsWith(".json")).sort();
  if (files.length === 0) {
    throw new Error(`no fixtures found in ${FIXTURES_DIR}`);
  }
  return files.map((f) => {
    const raw = readFileSync(join(FIXTURES_DIR, f), "utf8");
    try {
      return JSON.parse(raw);
    } catch (err) {
      throw new Error(`failed to parse ${f}: ${err.message}`);
    }
  });
}

function pad(s, n) {
  return String(s).padEnd(n);
}

function fmtPct(rate) {
  if (rate == null || Number.isNaN(rate)) return "—";
  return `${(rate * 100).toFixed(1)}%`;
}

function tag(state) {
  if (state === "skip") return "SKIP";
  return state ? "PASS" : "FAIL";
}

function formatSummary(summary) {
  const lines = [];
  lines.push("");
  lines.push("=".repeat(78));
  lines.push("  ATS scan eval — Day 2 (real pipeline)");
  lines.push("=".repeat(78));
  lines.push(`  generated: ${summary.generatedAt}`);
  lines.push(`  fixtures:  ${summary.totalFixtures}`);
  lines.push("");
  lines.push("  Invariants");
  lines.push("  " + "-".repeat(74));
  for (const m of summary.invariants) {
    lines.push(`  ${pad(m.name, 28)} ${pad(m.metric, 28)} ${tag(m.state)}`);
    if (m.detail) {
      for (const d of m.detail.split("\n")) lines.push(`      ${d}`);
    }
  }
  lines.push("");
  lines.push("  Required invariants: " + tag(summary.requiredPass));
  if (summary.behavioralRan) {
    lines.push("  Behavioral invariants: " + tag(summary.behavioralPass));
  } else {
    lines.push("  Behavioral invariants: SKIP (set ANTHROPIC_API_KEY to run)");
  }
  lines.push("=".repeat(78));
  lines.push("");
  return lines.join("\n");
}

async function main() {
  const fixtures = loadFixtures();

  const adversarial = computeAdversarial(fixtures);
  const paidPrompt = computePaidPromptIntegrity(fixtures);
  const fieldAccuracy = await computeFieldAccuracy(fixtures);
  const scoreBand = await computeScoreBand(fixtures);

  const requiredPass = adversarial.pass && paidPrompt.pass;
  const behavioralRan = !fieldAccuracy.skipped && !scoreBand.skipped;
  const behavioralPass = behavioralRan ? fieldAccuracy.pass && scoreBand.pass : null;

  const invariants = [
    {
      name: "Adversarial variance",
      metric: `${adversarial.groupsWithVariance}/${adversarial.totalGroups} JD groups`,
      state: adversarial.pass,
      detail: adversarial.pass
        ? null
        : "Same JD → different CVs produce identical prompts. Prompt builder ignores CV text.",
    },
    {
      name: "Paid prompt integrity",
      metric: `${paidPrompt.passed}/${paidPrompt.total} prompts contain CV`,
      state: paidPrompt.pass,
      detail: paidPrompt.failureReason ?? null,
    },
    {
      name: "Field accuracy",
      metric: fieldAccuracy.skipped
        ? "behavioral (gated)"
        : `${fmtPct(fieldAccuracy.rate)}  (${fieldAccuracy.passed}/${fieldAccuracy.sampled})`,
      state: fieldAccuracy.skipped ? "skip" : fieldAccuracy.pass,
      detail: fieldAccuracy.skipped ? fieldAccuracy.reason : fieldAccuracy.note,
    },
    {
      name: "Score band hit rate",
      metric: scoreBand.skipped
        ? "behavioral (gated)"
        : `${fmtPct(scoreBand.rate)}  (${scoreBand.passed}/${scoreBand.sampled})`,
      state: scoreBand.skipped ? "skip" : scoreBand.pass,
      detail: scoreBand.skipped ? scoreBand.reason : scoreBand.note,
    },
  ];

  const summary = {
    generatedAt: new Date().toISOString(),
    totalFixtures: fixtures.length,
    invariants,
    requiredPass,
    behavioralRan,
    behavioralPass,
    overallPass: requiredPass && (behavioralPass !== false),
    details: {
      adversarial,
      paidPromptIntegrity: paidPrompt,
      fieldAccuracy,
      scoreBand,
    },
  };

  mkdirSync(BASELINE_DIR, { recursive: true });
  const dateSlug = new Date().toISOString().slice(0, 10);
  const baselineFile = join(BASELINE_DIR, `${dateSlug}-day2.json`);
  writeFileSync(baselineFile, JSON.stringify(summary, null, 2));

  process.stdout.write(formatSummary(summary));
  process.stdout.write(`baseline saved: ${baselineFile}\n\n`);

  process.exit(summary.overallPass ? 0 : 1);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("eval runner failed:", err);
  process.exit(1);
});
