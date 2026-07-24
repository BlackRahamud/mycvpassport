/**
 * Build-time prerender — runs as postbuild, so every deploy ships real
 * static HTML for every sitemap URL. Crawlers (and view-source) get the
 * full page; React hydrates on top (src/index.js already has the
 * hydration branch).
 *
 * Flow:
 *   1. Save the pristine SPA shell as build/spa.html (the vercel.json SPA
 *      fallback rewrite points at it — app routes stay client-rendered).
 *   2. Serve build/ locally, render every URL in build/sitemap.xml with
 *      headless Chromium, and write the snapshot to build/<route>/index.html
 *      ("/" overwrites build/index.html).
 *   3. HARD GATE: the build FAILS if any snapshot is missing an <h1> or
 *      still contains the "You need to enable JavaScript" shell text — a
 *      silent prerender failure must never reach production again.
 *
 * Browsers — dual path, because Vercel's Amazon Linux build image lacks
 * chromium's shared libraries (libnspr4.so — first deploy failed exactly
 * there, caught by the gate):
 *   linux (Vercel build): puppeteer-core (already a dependency) driving
 *     @sparticuz/chromium, the Amazon-Linux-compiled build this repo
 *     already trusts at runtime in api/generate-pdf.js.
 *   win/mac (local + Husky): Playwright's chromium (devDependency);
 *     PLAYWRIGHT_BROWSERS_PATH=0 keeps the binary inside node_modules.
 */
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const buildDir = join(root, "build");
const PORT = 4173;
const FORBIDDEN = "You need to enable JavaScript";

process.env.PLAYWRIGHT_BROWSERS_PATH = "0";

const MIME = {
  ".html": "text/html", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg",
  ".svg": "image/svg+xml", ".ico": "image/x-icon", ".xml": "application/xml",
  ".txt": "text/plain", ".woff": "font/woff", ".woff2": "font/woff2",
  ".webp": "image/webp", ".map": "application/json",
};

function routesFromSitemap() {
  const xml = readFileSync(join(buildDir, "sitemap.xml"), "utf8");
  return [...xml.matchAll(/<loc>https:\/\/www\.mycvpassport\.com([^<]*)<\/loc>/g)]
    .map((m) => m[1] || "/");
}

function startServer(shellHtml) {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const urlPath = decodeURIComponent(new URL(req.url, "http://x").pathname);
      const filePath = join(buildDir, urlPath.replace(/^\/+/, ""));
      try {
        const data = readFileSync(filePath);
        res.writeHead(200, { "content-type": MIME[extname(filePath)] || "application/octet-stream" });
        res.end(data);
      } catch {
        // SPA fallback — always the pristine shell, never a snapshot.
        res.writeHead(200, { "content-type": "text/html" });
        res.end(shellHtml);
      }
    });
    server.listen(PORT, () => resolve(server));
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Returns a puppeteer-or-playwright Page — the two APIs align for
 * everything this script uses (goto/evaluate/content), except the
 * networkidle waitUntil name, normalized here.
 */
async function launchPage() {
  if (process.platform === "linux") {
    const chromium = (await import("@sparticuz/chromium")).default;
    const puppeteer = (await import("puppeteer-core")).default;
    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
    const page = await browser.newPage();
    return { browser, page, idle: "networkidle0" };
  }
  let pw;
  try {
    pw = await import("playwright");
    const browser = await pw.chromium.launch();
    const page = await (await browser.newContext()).newPage();
    return { browser, page, idle: "networkidle" };
  } catch {
    console.log("prerender: installing chromium (first build on this cache)…");
    const r = spawnSync("npx", ["playwright", "install", "chromium"], {
      stdio: "inherit", shell: true, env: process.env,
    });
    if (r.status !== 0) throw new Error("playwright install chromium failed");
    pw = await import("playwright");
    const browser = await pw.chromium.launch();
    const page = await (await browser.newContext()).newPage();
    return { browser, page, idle: "networkidle" };
  }
}

const shell = readFileSync(join(buildDir, "index.html"), "utf8");
writeFileSync(join(buildDir, "spa.html"), shell);

const routes = routesFromSitemap();
console.log(`prerender: ${routes.length} routes from sitemap.xml`);

const server = await startServer(shell);
const { browser, page, idle } = await launchPage();

// Mark the prerender pass so client code can skip prerender-only behaviour.
// Critical for the launch-offer modal: it auto-opens ~1s after load, and this
// prerenderer waits idle + 1.5s — without this flag the modal renders into the
// snapshot as dead, handler-less HTML that can never be closed. Set before any
// page script runs, on every navigation. puppeteer and Playwright name this
// differently, so support both.
const markPrerender = () => { window.__CVP_PRERENDER__ = true; };
if (typeof page.evaluateOnNewDocument === "function") {
  await page.evaluateOnNewDocument(markPrerender); // puppeteer-core
} else if (typeof page.addInitScript === "function") {
  await page.addInitScript(markPrerender); // Playwright
}

const failures = [];
for (const route of routes) {
  await page.goto(`http://localhost:${PORT}${route}`, { waitUntil: idle, timeout: 60000 });
  // Let Helmet, lazy chunks and first-paint effects settle.
  await sleep(1500);
  await page.evaluate(() => {
    // Prerendered pages carry their content without JS — the shell's
    // noscript warning is obsolete and would trip the gate below.
    document.querySelectorAll("noscript").forEach((n) => n.remove());
    // Helmet APPENDS its meta description; the static shell one would sit
    // first in <head> and win with Google. Drop the static duplicate when
    // a Helmet-managed one exists.
    const helmetDesc = document.querySelector('meta[name="description"][data-rh]');
    if (helmetDesc) {
      document
        .querySelectorAll('meta[name="description"]:not([data-rh])')
        .forEach((n) => n.remove());
    }
  });
  const html = await page.content();

  // ── Deploy gate ──
  const problems = [];
  if (!/<h1[\s>]/i.test(html)) problems.push("missing <h1>");
  if (html.includes(FORBIDDEN)) problems.push(`contains "${FORBIDDEN}"`);
  if (problems.length) {
    failures.push(`${route}: ${problems.join(", ")}`);
    continue; // don't write a known-bad snapshot
  }

  const outFile = route === "/"
    ? join(buildDir, "index.html")
    : join(buildDir, route.replace(/^\/+/, ""), "index.html");
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, "<!DOCTYPE html>" + html.replace(/^<!DOCTYPE html>/i, ""));
  console.log(`prerender: ✓ ${route}`);
}

await browser.close();
server.close();

if (failures.length) {
  console.error("\nprerender GATE FAILED — deploy blocked:");
  failures.forEach((f) => console.error(`  ✗ ${f}`));
  process.exit(1);
}
console.log(`prerender: all ${routes.length} routes passed the gate`);
