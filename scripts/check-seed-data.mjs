#!/usr/bin/env node
/**
 * Seed-data sanity check.
 *
 * Walks content/ and ats_profiles/, parses every .yaml / .yml file
 * with js-yaml, and reports which (if any) failed. Exits non-zero on
 * any parse failure so CI can gate on it.
 *
 *   npm run seed:check
 */

import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, dirname, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const TARGETS = ["content", "ats_profiles"];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (extname(p) === ".yaml" || extname(p) === ".yml") out.push(p);
  }
  return out;
}

const failures = [];
const passes = [];

for (const target of TARGETS) {
  const dir = join(REPO_ROOT, target);
  if (!existsSync(dir)) continue;
  for (const file of walk(dir)) {
    const rel = relative(REPO_ROOT, file).replace(/\\/g, "/");
    try {
      const raw = readFileSync(file, "utf8");
      yaml.load(raw);
      passes.push(rel);
    } catch (err) {
      failures.push({ file: rel, message: err.message });
    }
  }
}

console.log("");
console.log("=".repeat(78));
console.log("  Seed data sanity check");
console.log("=".repeat(78));
for (const p of passes) console.log(`  PASS  ${p}`);
for (const f of failures) console.log(`  FAIL  ${f.file}\n        ${f.message.split("\n")[0]}`);
console.log("");
console.log(`  ${passes.length}/${passes.length + failures.length} YAML files parsed successfully`);
console.log("=".repeat(78));
console.log("");

process.exit(failures.length ? 1 : 0);
