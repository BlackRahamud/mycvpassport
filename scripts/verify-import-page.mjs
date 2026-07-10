/* Verification harness for /employer/import (rail-level bulk CV import).
   Serves the PRODUCTION build with a stubbed backend (same pattern as
   verify-mobile-polish.mjs) and checks, at 360px and 1280px:
   - the 5-tab bottom bar / rail carries the Import entry (no overflow)
   - the one-question picker: jobs listed, talent-pool card, pool form
   - picking a job / creating a pool opens BulkCvImport with the right name
   - zero-jobs guidance path (pool card, never a dead end)
   Usage: node scripts/verify-import-page.mjs <outDir> */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";
import { chromium } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
const SUPA = process.env.REACT_APP_SUPABASE_URL;
const REF = new URL(SUPA).hostname.split(".")[0];
const OUT = process.argv[2] || "scripts/.screenshots/import-page";
mkdirSync(OUT, { recursive: true });

let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? "✓" : "✗ FAIL"} ${label}`);
  if (!ok) failures += 1;
};

const HR_ID = "11111111-1111-4111-8111-111111111111";
const JOBS = [
  {
    id: "33333333-3333-4333-8333-333333333333",
    title: "IT support L1 Engineer (Dubai onsite)",
    status: "active", market: "gulf", kind: "standard", hr_id: HR_ID,
    source: "hr_portal", company: "Meridian Logistics", location: "Dubai",
    skills: ["Windows"], requirements: ["2+ years"], description: "First-line support.",
    created_at: "2026-06-20T08:00:00Z", posted_at: "2026-06-20T08:00:00Z",
  },
  {
    id: "33333333-3333-4333-8333-333333333334",
    title: "Ready to deploy", status: "active", market: "india", kind: "pool",
    hr_id: HR_ID, source: "hr_portal", company: "", location: "",
    skills: [], requirements: [], description: "",
    created_at: "2026-06-22T08:00:00Z", posted_at: "2026-06-22T08:00:00Z",
  },
];

let jobsMode = "some"; // "some" | "none"

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".txt": "text/plain", ".xml": "text/xml", ".webp": "image/webp", ".woff2": "font/woff2" };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = join("./build", p);
  if (!existsSync(file) || statSync(file).isDirectory()) file = join("./build", "spa.html");
  try {
    res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
    res.end(readFileSync(file));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(4183, r));

const SESSION = {
  access_token: "stub-access-token", refresh_token: "stub-refresh-token",
  token_type: "bearer", expires_in: 3600 * 24 * 30,
  expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 * 30,
  user: {
    id: HR_ID, aud: "authenticated", role: "authenticated",
    email: "recruiter@meridianlogistics.example",
    app_metadata: { provider: "email" }, user_metadata: { full_name: "Meridian HR" },
    created_at: "2026-06-01T00:00:00Z",
  },
};

function pgrest(url, accept) {
  const path = url.pathname;
  const wantsObject = /vnd\.pgrst\.object/.test(accept || "");
  const t = (name) => path.includes(`/rest/v1/${name}`);
  let rows = [];
  if (t("hr_profiles")) rows = [{ company_name: "Meridian Logistics", work_email: "recruiter@meridianlogistics.example", company_id: "55555555-5555-4555-8555-555555555555" }];
  else if (t("profiles")) rows = [{ user_type: "recruiter", plan: "recruiter", full_name: "Meridian HR", company_name: "Meridian Logistics", work_email: "recruiter@meridianlogistics.example" }];
  else if (t("jobs")) rows = jobsMode === "some" ? JOBS : [];
  else if (t("applications")) rows = [];
  else rows = [];
  return JSON.stringify(wantsObject ? (rows[0] ?? null) : rows);
}

async function stubRoutes(context) {
  await context.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const href = req.url();
    if (url.port === "4183") return route.continue();
    if (/posthog|clarity|google|gstatic|doubleclick|vercel|fonts/.test(url.hostname)) return route.abort();
    if (href.startsWith(SUPA)) {
      if (url.pathname.includes("/auth/v1/user")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSION.user) });
      if (url.pathname.includes("/auth/v1/token")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSION) });
      if (url.pathname.includes("/rest/v1/")) return route.fulfill({ status: 200, contentType: "application/json", body: pgrest(url, req.headers().accept) });
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    if (url.pathname.startsWith("/api/")) return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    return route.abort();
  });
}

async function auditOverflow(page, label) {
  const res = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const doc = document.documentElement.scrollWidth;
    return { vw, doc };
  });
  check(res.doc <= res.vw + 1, `${label}: no horizontal overflow (scrollWidth ${res.doc} <= viewport ${res.vw})`);
}

const browser = await chromium.launch();

async function newPage(width, height = 852) {
  const context = await browser.newContext({ viewport: { width, height } });
  await stubRoutes(context);
  await context.addInitScript(([key, session]) => {
    localStorage.setItem(key, JSON.stringify(session));
    localStorage.setItem("cvp_theme", "light");
    sessionStorage.setItem("hr_welcome_ring_shown", "1"); // skip the intro overlay so screenshots show the page
  }, [`sb-${REF}-auth-token`, SESSION]);
  const page = await context.newPage();
  page.on("pageerror", (e) => console.log("[pageerror]", e.message));
  return { context, page };
}
const shot = (page, name) => page.screenshot({ path: join(OUT, `${name}.png`), fullPage: false });

/* ── 1) mobile 360: rail item + page + full picker flow ── */
{
  const { context, page } = await newPage(360);
  await page.goto("http://localhost:4183/employer/jobs", { waitUntil: "networkidle" });
  const importTab = page.locator(".hrs-navitem", { hasText: "Import" });
  check(await importTab.count() === 1, "360px: bottom bar has an Import tab");
  await auditOverflow(page, "360px jobs list (5-tab bar)");
  await shot(page, "360-jobs-bottombar");
  await importTab.click();
  await page.waitForURL("**/employer/import");
  await page.waitForTimeout(600);
  check(await page.locator(".imp-head__title").innerText() === "Import CVs", "360px: /employer/import renders");
  check(await page.locator(".itp-job").count() === 2, "360px: both jobs listed");
  check((await page.locator(".itp-label").innerText()).toLowerCase().includes("job or pool"), "360px: section label acknowledges pools");
  check(await page.locator(".itp-create").count() === 1, "360px: Create a talent pool card present");
  await auditOverflow(page, "360px import page");
  await shot(page, "360-import-picker");

  // pick a job → importer opens for that job
  await page.locator(".itp-job").first().click();
  await page.waitForTimeout(500);
  check(await page.locator(".bci-panel").count() === 1, "360px: picking a job opens the importer");
  const sub = await page.locator(".bci-sub").innerText();
  check(sub.includes("IT support L1 Engineer"), "360px: importer names the chosen job");
  await auditOverflow(page, "360px importer open");
  await shot(page, "360-importer-job");
  await page.locator(".bci-close").click();
  await page.waitForTimeout(400);

  // pool path → form → importer named after the pool
  await page.locator(".itp-create").click();
  await page.locator(".itp-form__input").fill("Sales candidates");
  await shot(page, "360-pool-form");
  const go = page.locator(".itp-form__go");
  check(await go.isEnabled(), "360px: Create and add CVs enabled once named");
  await go.click();
  await page.waitForTimeout(500);
  const sub2 = await page.locator(".bci-sub").innerText();
  check(sub2.includes("Sales candidates"), "360px: importer names the new pool");
  await shot(page, "360-importer-pool");
  await context.close();
}

/* ── 2) mobile 360: zero jobs — pool card is the guided path ── */
{
  jobsMode = "none";
  const { context, page } = await newPage(360);
  await page.goto("http://localhost:4183/employer/import", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  check(await page.locator(".itp-job").count() === 0, "360px zero-jobs: no job rows");
  check(await page.locator(".itp-empty").count() === 1, "360px zero-jobs: guidance line shown");
  check(await page.locator(".itp-create").count() === 1, "360px zero-jobs: pool card is the path");
  await auditOverflow(page, "360px zero-jobs import page");
  await shot(page, "360-import-zero-jobs");
  await context.close();
  jobsMode = "some";
}

/* ── 3) Candidates page: "Add candidate" now uses the shared picker ── */
{
  const { context, page } = await newPage(393);
  await page.goto("http://localhost:4183/employer/candidates", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.locator(".cand-add").click();
  await page.waitForTimeout(400);
  check(await page.locator(".itp-modal").count() === 1, "candidates 393px: Add candidate opens the shared picker modal");
  check(await page.locator(".itp-job").count() === 2, "candidates 393px: modal lists both jobs");
  await shot(page, "393-candidates-add-modal");
  await page.locator(".itp-job").first().click();
  await page.waitForTimeout(500);
  check(await page.locator(".bci-panel").count() === 1, "candidates 393px: picking a job opens the importer");
  await context.close();
}

/* ── 4) desktop 1280: rail item active state + page ── */
{
  const { context, page } = await newPage(1280, 800);
  await page.goto("http://localhost:4183/employer/import", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const active = page.locator(".hrs-navitem--active");
  check((await active.innerText()).includes("Import"), "1280px: rail highlights Import as active");
  check(await page.locator(".itp-job").count() === 2, "1280px: jobs listed");
  await auditOverflow(page, "1280px import page");
  await shot(page, "1280-import-picker");
  await context.close();
}

await browser.close();
server.close();
console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
