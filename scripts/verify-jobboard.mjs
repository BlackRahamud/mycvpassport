/* Candidate job board (/jobs) verification harness. Serves the PRODUCTION
   build with a stubbed backend and drives the real JobBoardPage:

   - browse light + dark (desktop): credibility line + honest count, no
     greeting, no account-manager card, full-width rows, visa pill +
     per-month local-currency salary, verified tick only where earned
   - row inline apply: signed-in candidate with a CV taps Apply → confirm
     expands on the row (CV + match + visa listbox), no navigation
   - zero results: removable filter chips + "Show all N" reassurance
   - mobile 393: glass filter bar; Filters opens the rail as a panel

   Screenshots are READ by eye, not just asserted.

   Usage: node scripts/verify-jobboard.mjs [outDir] */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";
import { chromium } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
const SUPA = process.env.REACT_APP_SUPABASE_URL;
const REF = new URL(SUPA).hostname.split(".")[0];
const OUT = process.argv[2] || "scripts/.screenshots/jobboard";
mkdirSync(OUT, { recursive: true });

let failures = 0;
const check = (ok, label) => { console.log(`${ok ? "✓" : "✗ FAIL"} ${label}`); if (!ok) failures += 1; };

const UID = "22222222-2222-4222-8222-222222222222";
const HR_A = "aaaaaaaa-1111-4111-8111-111111111111";
const HR_B = "bbbbbbbb-2222-4222-8222-222222222222";
const HR_UNVER = "cccccccc-3333-4333-8333-333333333333";
const SESSION = {
  access_token: "stub", refresh_token: "stub", token_type: "bearer",
  expires_in: 3600 * 24 * 30, expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 * 30,
  user: { id: UID, aud: "authenticated", role: "authenticated", email: "candidate@example.com", app_metadata: {}, user_metadata: { full_name: "Junaid Khan" }, created_at: "2026-01-01T00:00:00Z" },
};

const ago = (d) => new Date(Date.now() - d * 86400000).toISOString();
const JOBS = [
  { id: "j1", hr_id: HR_A, source: "hr_portal", status: "active", title: "Senior Cyber Security Analyst", company: "Meridian Digital", department: "Technology", location: "Abu Dhabi, UAE", market: "gulf", job_type: "full-time", salary_min: 22000, salary_max: 30000, currency: "AED", visa_sponsored: true, experience_min: 5, experience_max: 8, requirements: ["SIEM tuning", "Incident response"], perks: ["Family visa", "Annual flight"], posted_at: ago(2), created_at: ago(2) },
  { id: "j2", hr_id: HR_A, source: "hr_portal", status: "active", title: "Duty Manager, Hospitality", company: "Rotana Collection", department: "Hospitality", location: "Dubai, UAE", market: "gulf", job_type: "full-time", salary_min: 9000, salary_max: 12000, currency: "AED", visa_sponsored: true, experience_min: 4, experience_max: 6, requirements: ["Opera PMS"], perks: ["Accommodation"], posted_at: ago(5), created_at: ago(5) },
  { id: "j3", hr_id: HR_B, source: "hr_portal", status: "active", title: "Logistics Coordinator", company: "Aramax Freight", department: "Supply chain", location: "Dubai, UAE", market: "gulf", job_type: "full-time", salary_min: 6500, salary_max: 9000, currency: "AED", visa_sponsored: true, experience_min: 2, experience_max: 4, requirements: ["Incoterms"], perks: ["Medical"], posted_at: ago(8), created_at: ago(8) },
  { id: "j4", hr_id: HR_B, source: "hr_portal", status: "active", title: "Finance Manager", company: "Al Noor Group", department: "Finance", location: "Dubai, UAE", market: "gulf", job_type: "full-time", salary_min: 18000, salary_max: 26000, currency: "AED", visa_sponsored: true, experience_min: 6, experience_max: 9, requirements: ["IFRS", "SAP"], perks: ["Bonus"], posted_at: ago(3), created_at: ago(3) },
  { id: "j5", hr_id: HR_UNVER, source: "hr_portal", status: "active", title: "Sales Executive, FMCG", company: "Gulf Fresh Trading", department: "Sales", location: "Sharjah, UAE", market: "gulf", job_type: "full-time", salary_min: 4500, salary_max: 6000, currency: "AED", visa_sponsored: true, experience_min: 1, experience_max: 3, requirements: ["Retail sales"], perks: ["Commission"], posted_at: ago(24), created_at: ago(24) },
  { id: "j6", hr_id: HR_A, source: "hr_portal", status: "active", title: "Backend Software Engineer", company: "Zenith Labs", department: "Technology", location: "Chennai, India", market: "india", job_type: "full-time", salary_min: 70000, salary_max: 110000, currency: "INR", visa_sponsored: false, experience_min: 3, experience_max: 6, requirements: ["Java", "Go"], perks: ["Hybrid"], posted_at: ago(2), created_at: ago(2) },
  { id: "j7", hr_id: HR_B, source: "hr_portal", status: "active", title: "Guest Relations Executive", company: "Oberon Hotels", department: "Hospitality", location: "New Delhi, India", market: "india", job_type: "full-time", salary_min: 35000, salary_max: 50000, currency: "INR", visa_sponsored: false, experience_min: 1, experience_max: 3, requirements: ["English"], perks: ["Duty meals"], posted_at: ago(11), created_at: ago(11) },
];

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".txt": "text/plain", ".xml": "text/xml", ".webp": "image/webp", ".woff2": "font/woff2" };
const server = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = join("./build", p);
  if (!existsSync(file) || statSync(file).isDirectory()) file = join("./build", "spa.html");
  try { res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" }); res.end(readFileSync(file)); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(4192, r));

function rest(url) {
  const path = url.pathname;
  const t = (n) => path.includes(`/rest/v1/${n}`);
  if (t("profiles")) return JSON.stringify([{ plan: "free", full_name: "Junaid Khan", visa_status: "", phone: "" }]);
  if (t("cvs")) return JSON.stringify([{ cv_data: { skills: ["security", "siem"], experience: [{ title: "Analyst" }] } }]);
  if (t("jobs")) return JSON.stringify(JOBS);
  if (t("hr_profiles")) return JSON.stringify([{ user_id: HR_A, verified: true }, { user_id: HR_B, verified: true }, { user_id: HR_UNVER, verified: false }]);
  if (t("applications")) return JSON.stringify([{ job_id: "j4", cooldown_expires_at: new Date(Date.now() + 5 * 86400000).toISOString() }]);
  return "[]";
}

async function stub(context) {
  await context.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.pathname.startsWith("/api/")) return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    if (url.port === "4192") return route.continue();
    if (/posthog|clarity|google|gstatic|doubleclick|vercel/.test(url.hostname)) return route.abort();
    if (req.url().startsWith(SUPA)) {
      if (url.pathname.includes("/auth/v1/user")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSION.user) });
      if (url.pathname.includes("/auth/v1/token")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSION) });
      if (url.pathname.includes("/rest/v1/")) {
        if (req.method() === "HEAD") return route.fulfill({ status: 200, headers: { "content-range": "*/0" }, body: "" });
        if (req.method() === "POST" || req.method() === "PATCH" || url.pathname.includes("/rpc/")) return route.fulfill({ status: 201, contentType: "application/json", body: "[]" });
        return route.fulfill({ status: 200, contentType: "application/json", body: rest(url) });
      }
      if (url.pathname.includes("/storage/")) return route.fulfill({ status: 200, body: "{}" });
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    return route.abort();
  });
}

async function newPage(browser, { width = 1280, theme = "light" } = {}) {
  const context = await browser.newContext({ viewport: { width, height: 940 }, timezoneId: "Asia/Dubai", deviceScaleFactor: 1 });
  await stub(context);
  await context.addInitScript(([key, session, th]) => {
    localStorage.setItem(key, JSON.stringify(session));
    localStorage.setItem("cvp_theme", th);
    try { if (document.documentElement) document.documentElement.setAttribute("data-theme", th); } catch { /* set before <html> exists; the app applies cvp_theme anyway */ }
  }, [`sb-${REF}-auth-token`, SESSION, theme]);
  const page = await context.newPage();
  page.on("pageerror", (e) => { console.log("[pageerror]", e.message); failures += 1; });
  return { context, page };
}
const shot = (page, name) => page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true });

const browser = await chromium.launch();

/* 1) Browse, light desktop */
{
  const { context, page } = await newPage(browser, { width: 1280, theme: "light" });
  await page.goto("http://localhost:4192/jobs", { waitUntil: "networkidle" });
  await page.waitForSelector(".jb-row", { timeout: 8000 });
  await page.waitForTimeout(500);
  const rows = await page.locator(".jb-row").count();
  check(rows === JOBS.length, `light: ${rows} rows render (expected ${JOBS.length})`);
  const head = (await page.locator(".jb-head__title").textContent()) || "";
  // Honest headline: counts roles, never claims all are "verified" (Gulf Fresh carries no tick).
  check(/\d+ roles? hiring now/.test(head) && !/verified/i.test(head), `light: honest count header ("${head}")`);
  check(await page.locator(".jb-hero__greeting, .jb-hero__contact").count() === 0, "light: no greeting / account-manager card survives");
  const salaryTxt = (await page.locator(".jb-salary").first().textContent()) || "";
  check(/per month/.test(salaryTxt) && !/\$/.test(salaryTxt), `light: salary is per-month local currency ("${salaryTxt}")`);
  const verifiedOnUnver = await page.evaluate(() => {
    const rows = [...document.querySelectorAll(".jb-row")];
    const g = rows.find((r) => r.textContent.includes("Gulf Fresh Trading"));
    return g ? !!g.querySelector(".jb-verified") : null;
  });
  check(verifiedOnUnver === false, "light: unverified employer carries NO tick");
  const inr = await page.evaluate(() => [...document.querySelectorAll(".jb-salary")].some((s) => /1,10,000|70,000 to 1,10,000/.test(s.textContent)));
  check(inr, "light: INR salary groups in lakhs");
  await shot(page, "1-browse-light");
  await context.close();
}

/* 2) Browse, dark desktop */
{
  const { context, page } = await newPage(browser, { width: 1280, theme: "dark" });
  await page.goto("http://localhost:4192/jobs", { waitUntil: "networkidle" });
  await page.waitForSelector(".jb-row", { timeout: 8000 });
  await page.waitForTimeout(500);
  const bg = await page.locator(".jb-root").evaluate((el) => getComputedStyle(el).backgroundColor);
  check(bg === "rgb(19, 16, 25)", `dark: page bg flips to the dark token (${bg})`);
  await shot(page, "2-browse-dark");
  await context.close();
}

/* 3) Row inline apply (Gulf role → visa listbox) */
{
  const { context, page } = await newPage(browser, { width: 1280, theme: "light" });
  await page.goto("http://localhost:4192/jobs", { waitUntil: "networkidle" });
  await page.waitForSelector(".jb-row", { timeout: 8000 });
  await page.locator(".jb-row").first().locator(".jb-apply").click();
  await page.waitForSelector(".jb-confirm", { timeout: 4000 });
  await page.waitForTimeout(300);
  check(await page.locator(".jb-confirm").isVisible(), "row apply: confirm expands in place (no navigation)");
  check(page.url().endsWith("/jobs"), "row apply: still on the board, no page load");
  check(await page.locator(".jb-confirm .vs-trigger").count() === 1, "row apply: visa listbox present for a Gulf role");
  check(await page.locator(".jb-matchchip").count() === 1, "row apply: an ATS match chip shows");
  await shot(page, "3-row-confirm");
  // open the visa listbox to verify the glass menu
  await page.locator(".jb-confirm .vs-trigger").click();
  await page.waitForSelector(".vs-menu", { timeout: 2000 });
  await page.waitForTimeout(200);
  await shot(page, "3b-visa-open");
  await context.close();
}

/* 4) Zero results */
{
  const { context, page } = await newPage(browser, { width: 1280, theme: "light" });
  await page.goto("http://localhost:4192/jobs", { waitUntil: "networkidle" });
  await page.waitForSelector(".jb-row", { timeout: 8000 });
  await page.locator(".jb-rail__search input").fill("zzzznotarealjob");
  await page.waitForSelector(".jb-empty", { timeout: 3000 });
  await page.waitForTimeout(300);
  check(await page.locator(".jb-chip").count() >= 1, "zero: active filters show as removable chips");
  check(await page.locator(".jb-showall").isVisible(), 'zero: "Show all N roles" reassurance present');
  await shot(page, "4-zero-results");
  await context.close();
}

/* 5) Mobile 393 + filters panel */
{
  const { context, page } = await newPage(browser, { width: 393, theme: "light" });
  await page.goto("http://localhost:4192/jobs", { waitUntil: "networkidle" });
  await page.waitForSelector(".jb-row", { timeout: 8000 });
  await page.waitForTimeout(400);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(overflow <= 1, `mobile 393: no horizontal overflow (${overflow}px)`);
  check(await page.locator(".jb-mfilter").isVisible(), "mobile: glass filter bar visible");
  await shot(page, "5-mobile-browse");
  await page.locator(".jb-mfilter__toggle").click();
  await page.waitForSelector(".jb-rail--open", { timeout: 2000 });
  await page.waitForTimeout(300);
  check(await page.locator(".jb-rail--open").isVisible(), "mobile: Filters opens the rail as a panel");
  await shot(page, "6-mobile-filters");
  await context.close();
}

await browser.close();
server.close();
console.log(`\n${failures === 0 ? "✓ all job-board checks passed" : `✗ ${failures} check(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
