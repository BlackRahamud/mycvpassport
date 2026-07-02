/**
 * Gradient-text safety gate — runs in postbuild, fails the build on violation.
 *
 * Why this exists: gradient/shimmer text uses `background-clip: text` +
 * `-webkit-text-fill-color: transparent`. If the clip half goes missing
 * (unprefixed-only CSS, a `background:` shorthand reset, an old browser),
 * the gradient paints as a full BOX and the transparent text vanishes into
 * it — a solid rectangle where a headline should be. This shipped once
 * (reduced-motion overrides used `background: <color>`, which resets
 * background-clip to border-box). This script makes the pattern structurally
 * safe so it can't recur.
 *
 * Almost all gradient text in this app lives in inline <style> template
 * strings inside JSX, which NEVER pass through PostCSS/autoprefixer — the
 * build toolchain cannot add prefixes there. So the rules are enforced at
 * the source level AND re-verified on the built output:
 *
 * Source rules (src/**):
 *   1. Any style block using `background-clip: text` must, in the same file,
 *      also contain `-webkit-background-clip`, `-webkit-text-fill-color`,
 *      and an `@supports` guard (fallback = solid readable color).
 *   2. Any inline-style `backgroundClip: "text"` must be paired with
 *      `WebkitBackgroundClip` and `WebkitTextFillColor`.
 *   3. Inside a `prefers-reduced-motion` block, never re-declare the
 *      `background:` shorthand on a rule set — freeze with `animation: none`
 *      instead (the shorthand resets background-clip and paints a box).
 *
 * Build rules (build/static/css + prerendered build/**.html):
 *   4. Any built CSS or prerendered HTML containing `background-clip:text`
 *      must also contain `-webkit-background-clip` and
 *      `-webkit-text-fill-color`. JS chunks are deliberately NOT scanned:
 *      vendor libraries can embed the string in non-style code (mammoth's
 *      docx style-map broke the Vercel deploy this way), and bundling
 *      never rewrites our template strings anyway — the source rules plus
 *      the prerendered-HTML scan (which contains our serialized runtime
 *      <style> tags for every prerendered route) cover the real output.
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = process.cwd();
const failures = [];

function walk(dir, exts, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (name === "node_modules" || name === ".git") continue;
      walk(p, exts, out);
    } else if (exts.some((e) => name.endsWith(e))) {
      out.push(p);
    }
  }
  return out;
}

const rel = (p) => relative(ROOT, p).replace(/\\/g, "/");

// ---- Source rules ---------------------------------------------------------
for (const file of walk(join(ROOT, "src"), [".js", ".jsx", ".css"])) {
  const css = readFileSync(file, "utf8");
  const usesKebabClip = /(?<!-webkit-)background-clip\s*:\s*text/.test(css);
  const usesCamelClip = /backgroundClip\s*:\s*["']text["']/.test(css);

  if (usesKebabClip) {
    if (!/-webkit-background-clip\s*:\s*text/.test(css))
      failures.push(`${rel(file)}: background-clip:text without -webkit-background-clip`);
    if (!/-webkit-text-fill-color/.test(css))
      failures.push(`${rel(file)}: background-clip:text without -webkit-text-fill-color`);
    if (!/@supports[^{]*background-clip\s*:\s*text/.test(css))
      failures.push(`${rel(file)}: background-clip:text without an @supports guard + solid fallback`);
  }
  if (usesCamelClip) {
    if (!/WebkitBackgroundClip\s*:\s*["']text["']/.test(css))
      failures.push(`${rel(file)}: inline backgroundClip:"text" without WebkitBackgroundClip`);
    if (!/WebkitTextFillColor/.test(css))
      failures.push(`${rel(file)}: inline backgroundClip:"text" without WebkitTextFillColor`);
  }

  // Rule 3: no `background:` shorthand inside prefers-reduced-motion blocks
  // in any file that also uses clipped text.
  if (usesKebabClip) {
    const rmBlocks = [];
    const rmRe = /@media[^{]*prefers-reduced-motion[^{]*\{/g;
    let m;
    while ((m = rmRe.exec(css))) {
      // Walk braces from the block's opening `{` to its matching close.
      let depth = 1;
      let i = m.index + m[0].length;
      while (i < css.length && depth > 0) {
        if (css[i] === "{") depth++;
        else if (css[i] === "}") depth--;
        i++;
      }
      rmBlocks.push(css.slice(m.index, i));
    }
    for (const block of rmBlocks) {
      if (/[{;]\s*background\s*:/.test(block)) {
        failures.push(
          `${rel(file)}: \`background:\` shorthand inside a prefers-reduced-motion block — ` +
            `this resets background-clip:text and paints a solid rectangle. Use \`animation: none\` only.`
        );
      }
    }
  }
}

// ---- Build rules ----------------------------------------------------------
const buildDir = join(ROOT, "build");
if (existsSync(buildDir)) {
  const builtFiles = [
    ...(existsSync(join(buildDir, "static")) ? walk(join(buildDir, "static"), [".css"]) : []),
    ...walk(buildDir, [".html"]),
  ];
  for (const file of builtFiles) {
    const txt = readFileSync(file, "utf8");
    if (/(?<!-webkit-)background-clip\s*:\s*text/.test(txt)) {
      if (!/-webkit-background-clip\s*:\s*text/.test(txt))
        failures.push(`${rel(file)} (built): background-clip:text without -webkit-background-clip`);
      if (!/-webkit-text-fill-color/.test(txt))
        failures.push(`${rel(file)} (built): background-clip:text without -webkit-text-fill-color`);
    }
  }
} else {
  console.log("[check-gradient-text] no build/ directory — source rules only.");
}

if (failures.length) {
  console.error(`\n[check-gradient-text] FAILED — ${failures.length} violation(s):\n`);
  for (const f of failures) console.error("  ✗ " + f);
  console.error(
    "\nRequired pattern:\n" +
      "  .x { color: <solid token>; }  /* fallback */\n" +
      "  @supports (-webkit-background-clip: text) or (background-clip: text) {\n" +
      "    .x { background: <gradient>; -webkit-background-clip: text;\n" +
      "         background-clip: text; -webkit-text-fill-color: transparent; }\n" +
      "  }\n"
  );
  process.exit(1);
}
console.log("[check-gradient-text] OK — all gradient-text usages are guarded and prefixed.");
