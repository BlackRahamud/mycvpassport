/**
 * Loads the legacy free-tier scoring data and detectRole regex from
 * src/ without adding a transpiler dependency.
 *
 * src/data/skillSuggestions.js and src/utils/detectRole.js use ESM
 * syntax under a CRA package.json that does NOT set "type": "module".
 * Node can't natively import them. We read source as text, strip the
 * import / export keywords, and execute via `new Function(...)` in an
 * isolated scope. This is acceptable for an offline eval harness
 * running against trusted in-repo source.
 *
 * If skillSuggestions or detectRole grow imports beyond the current
 * shape, update the strip rules here.
 */

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..", "..");

export function loadLegacySkillSuggestions() {
  const filePath = join(REPO_ROOT, "src", "data", "skillSuggestions.js");
  const raw = readFileSync(filePath, "utf8");

  // Drop the trailing ESM export and replace with a return.
  const code = raw.replace(/export\s+default\s+skillSuggestions\s*;?\s*$/m, "return skillSuggestions;");

  // eslint-disable-next-line no-new-func
  const fn = new Function(code);
  return fn();
}

export function loadLegacyDetectRole() {
  const filePath = join(REPO_ROOT, "src", "utils", "detectRole.js");
  const raw = readFileSync(filePath, "utf8");

  // Strip imports (we only need detectRole — no transitive runtime needs).
  // Strip export keyword from function declarations.
  // Append a return for the function we want.
  const code =
    raw
      .replace(/^import\s+[^\n]+;?\s*$/gm, "")
      .replace(/export\s+function\s+/g, "function ") +
    "\nreturn detectRole;";

  // eslint-disable-next-line no-new-func
  const fn = new Function(code);
  return fn();
}

export function readPaidPromptSource() {
  const filePath = join(REPO_ROOT, "supabase", "functions", "analyze-cv", "index.ts");
  return readFileSync(filePath, "utf8");
}
