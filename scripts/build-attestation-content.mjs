#!/usr/bin/env node
/**
 * Pre-build step: parse every content/attestation/*.yaml and emit a
 * single src/generated/attestation.json that the AttestationPage
 * imports as a regular ES module.
 *
 * Wired to npm run prebuild + prestart so dev + production stay in sync.
 *
 * Filename convention: <from>_to_<to>.yaml  →  key "<from>__<to>"
 *   india_to_uae.yaml  →  india__uae
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const SRC_DIR = join(REPO_ROOT, "content", "attestation");
const OUT_DIR = join(REPO_ROOT, "src", "generated");
const OUT_FILE = join(OUT_DIR, "attestation.json");

const NAME_RE = /^([a-z]+)_to_([a-z]+)\.yaml$/;

function buildIndex() {
  const out = {};
  const errors = [];
  for (const f of readdirSync(SRC_DIR)) {
    if (!f.endsWith(".yaml") && !f.endsWith(".yml")) continue;
    const m = NAME_RE.exec(f);
    if (!m) {
      errors.push(`skip: ${f} does not match <from>_to_<to>.yaml`);
      continue;
    }
    const [, from, to] = m;
    try {
      const data = yaml.load(readFileSync(join(SRC_DIR, f), "utf8"));
      out[`${from}__${to}`] = { from, to, ...data };
    } catch (err) {
      errors.push(`parse fail: ${f} → ${err && err.message ? err.message : err}`);
    }
  }
  return { out, errors };
}

function main() {
  const { out, errors } = buildIndex();
  if (errors.length > 0) {
    for (const e of errors) console.error(`  ${e}`);
    if (Object.keys(out).length === 0) {
      console.error("no attestation files parsed; aborting");
      process.exit(1);
    }
  }
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, JSON.stringify(out, null, 2) + "\n");
  console.log(
    `attestation: wrote ${Object.keys(out).length} country pairs → ${OUT_FILE}`,
  );
}

main();
