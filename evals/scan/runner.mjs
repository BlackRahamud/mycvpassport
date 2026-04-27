#!/usr/bin/env node
/**
 * ATS scan eval runner.
 *
 * Loads fixtures, runs the CURRENT free-tier scoring logic against each,
 * structurally checks the CURRENT paid-tier prompt, and reports four
 * invariants.
 *
 *   npm run eval:scan
 *
 * Exit code:
 *   0 — all four invariants pass
 *   1 — one or more failed (current state on main as of 2026-04-27)
 *
 * Writes a baseline JSON to evals/scan/baseline/<date>-baseline.json.
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { runFreeScan } from "./scoring/currentFree.mjs";
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
  const files = readdirSync(FIXTURES_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort();
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

function tag(pass) {
  return pass ? "PASS" : "FAIL";
}

function formatSummary(summary) {
  const lines = [];
  lines.push("");
  lines.push("=".repeat(78));
  lines.push("  ATS scan eval — failing baseline (Phase 1 hard gate)");
  lines.push("=".repeat(78));
  lines.push(`  generated: ${summary.generatedAt}`);
  lines.push(`  fixtures:  ${summary.totalFixtures}`);
  lines.push("");
  lines.push("  Invariants");
  lines.push("  " + "-".repeat(74));
  for (const m of summary.invariants) {
    lines.push(`  ${pad(m.name, 28)} ${pad(m.metric, 24)} ${tag(m.pass)}`);
    if (m.detail) {
      for (const d of m.detail.split("\n")) lines.push(`      ${d}`);
    }
  }
  lines.push("");
  lines.push("  Overall: " + tag(summary.overallPass));
  lines.push("=".repeat(78));
  lines.push("");
  return lines.join("\n");
}

function main() {
  const fixtures = loadFixtures();

  const adversarial = computeAdversarial(fixtures, runFreeScan);
  const fieldAccuracy = computeFieldAccuracy(fixtures, runFreeScan);
  const scoreBand = computeScoreBand(fixtures, runFreeScan);
  const paidPrompt = computePaidPromptIntegrity(fixtures);

  const overallPass =
    adversarial.pass && fieldAccuracy.pass && scoreBand.pass && paidPrompt.pass;

  const invariants = [
    {
      name: "Adversarial variance",
      metric: `${adversarial.groupsWithVariance}/${adversarial.totalGroups} JD groups`,
      pass: adversarial.pass,
      detail: adversarial.pass
        ? null
        : "Same JD → different CVs produce identical output. Free-tier scoring is a pure function of JD; CV bytes are ignored.",
    },
    {
      name: "Field accuracy",
      metric: `${fmtPct(fieldAccuracy.rate)}  (${fieldAccuracy.silentFallbacks} silent fallbacks)`,
      pass: fieldAccuracy.pass,
      detail:
        fieldAccuracy.silentFallbacks > 0
          ? `${fieldAccuracy.silentFallbacks} fixtures silently fell back to "sales_real_estate" (detectRole did not recognise the JD).`
          : null,
    },
    {
      name: "Score band hit rate",
      metric: `${fmtPct(scoreBand.rate)}  (${scoreBand.hit}/${scoreBand.totalLabelled})`,
      pass: scoreBand.pass,
      detail: null,
    },
    {
      name: "Paid prompt integrity",
      metric: `${paidPrompt.passed}/${paidPrompt.total} prompts contain CV`,
      pass: paidPrompt.pass,
      detail:
        paidPrompt.sampleFailure?.failureReason ?? null,
    },
  ];

  const summary = {
    generatedAt: new Date().toISOString(),
    totalFixtures: fixtures.length,
    invariants,
    overallPass,
    details: {
      adversarial,
      fieldAccuracy,
      scoreBand,
      paidPromptIntegrity: paidPrompt,
    },
  };

  mkdirSync(BASELINE_DIR, { recursive: true });
  const dateSlug = new Date().toISOString().slice(0, 10);
  const baselineFile = join(BASELINE_DIR, `${dateSlug}-baseline.json`);
  writeFileSync(baselineFile, JSON.stringify(summary, null, 2));

  process.stdout.write(formatSummary(summary));
  process.stdout.write(`baseline saved: ${baselineFile}\n\n`);

  process.exit(overallPass ? 0 : 1);
}

main();
