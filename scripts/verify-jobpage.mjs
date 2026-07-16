/* Job detail + apply (/jobs/:id) verification harness. Serves the
   PRODUCTION build with a stubbed backend and drives the real JobPage
   money-screen through every state:

   - decide: Easy Apply (signed in + CV) / Upload (no CV) / Sign in
     (signed out); the ATS promise sits at the decision point
   - easy confirm → send → "You are in the pipeline" + score card
   - already applied: calm confirmation, no accidental reapply
   - send failure: the sheet stays, every value kept, plain Retry
   - India role: no visa question, "nothing else needed"
   - verified badge only when earned; no view_count anywhere

   Screenshots are READ by eye.

   Usage: node scripts/verify-jobpage.mjs [outDir] */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";
import { chromium } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
const SUPA = process.env.REACT_APP_SUPABASE_URL;
const REF = new URL(SUPA).hostname.split(".")[0];
const OUT = process.argv[2] || "scripts/.screenshots/jobpage";
mkdirSync(OUT, { recursive: true });

let failures = 0;
const check = (ok, label) => { console.log(`${ok ? "✓" : "✗ FAIL"} ${label}`); if (!ok) failures += 1; };

const UID = "22222222-2222-4222-8222-222222222222";
const HR = "aaaaaaaa-1111-4111-8111-111111111111";
const JOB_ID = "job-1111";
const SESSION = {
  access_token: "stub", refresh_token: "stub", token_type: "bearer",
  expires_in: 3600 * 24 * 30, expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 * 30,
  user: { id: UID, aud: "authenticated", role: "authenticated", email: "junaid.khan@example.com", app_metadata: {}, user_metadata: { full_name: "Junaid Khan" }, created_at: "2026-01-01T00:00:00Z" },
};
const ago = (d) => new Date(Date.now() - d * 86400000).toISOString();

function jobRow(market) {
  return {
    id: JOB_ID, hr_id: HR, source: "hr_portal", status: "active",
    title: market === "india" ? "Backend Software Engineer" : "Senior Cyber Security Analyst",
    company: market === "india" ? "Zenith Labs" : "Meridian Digital",
    department: "Technology", location: market === "india" ? "Chennai, India" : "Al Maryah Island, Abu Dhabi",
    market, job_type: "full-time",
    salary_min: market === "india" ? 70000 : 22000, salary_max: market === "india" ? 110000 : 30000,
    currency: market === "india" ? "INR" : "AED", visa_sponsored: market !== "india",
    experience_min: 5, experience_max: 8, view_count: 137,
    description: "Lead threat detection and incident response for a national digital services provider. You will own the SOC playbooks and mentor two analysts.",
    requirements: ["5 to 8 years in security operations", "CISSP or equivalent", "AWS and Azure security controls"],
    perks: ["Family visa sponsored", "Annual flight home", "Medical for dependents", "30 days leave"],
    posted_at: ago(2), created_at: ago(2),
  };
}

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".txt": "text/plain", ".xml": "text/xml", ".webp": "image/webp", ".woff2": "font/woff2" };
const server = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = join("./build", p);
  if (!existsSync(file) || statSync(file).isDirectory()) file = join("./build", "spa.html");
  try { res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" }); res.end(readFileSync(file)); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(4193, r));

async function stub(context, opts) {
  const { hasCv = true, applied = false, failSend = false, market = "gulf", verified = true } = opts;
  const captured = [];
  await context.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    if (url.pathname.startsWith("/api/")) return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    if (url.port === "4193") return route.continue();
    if (/posthog|clarity|google|gstatic|doubleclick|vercel/.test(url.hostname)) return route.abort();
    if (req.url().startsWith(SUPA)) {
      if (url.pathname.includes("/auth/v1/user")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSION.user) });
      if (url.pathname.includes("/auth/v1/token")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSION) });
      if (url.pathname.includes("/storage/")) return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
      if (url.pathname.includes("/rest/v1/")) {
        const t = (n) => url.pathname.includes(`/rest/v1/${n}`);
        if (req.method() === "HEAD") {
          // jobs count (openRoles) via head → content-range total.
          return route.fulfill({ status: 200, headers: { "content-range": "0-2/3", "access-control-expose-headers": "content-range" }, body: "" });
        }
        if (t("applications") && (req.method() === "POST" || req.method() === "PATCH")) {
          captured.push("apply");
          if (failSend) return route.fulfill({ status: 500, contentType: "application/json", body: '{"message":"row level security"}' });
          return route.fulfill({ status: 201, contentType: "application/json", body: "[]" });
        }
        if (req.method() === "POST" || req.method() === "PATCH" || url.pathname.includes("/rpc/")) return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
        // GETs
        if (t("profiles")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ plan: "free", full_name: "Junaid Khan", visa_status: "", phone: "" }]) });
        if (t("cvs")) return route.fulfill({ status: 200, contentType: "application/json", body: hasCv ? JSON.stringify([{ cv_data: { skills: ["security", "siem", "incident response"], experience: [{ title: "Analyst" }] } }]) : "[]" });
        if (t("hr_public_profiles")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ verified, company_name: market === "india" ? "Zenith Labs" : "Meridian Digital" }]) });
        if (t("jobs")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([jobRow(market)]) });
        if (t("applications")) return route.fulfill({ status: 200, contentType: "application/json", body: applied ? JSON.stringify([{ id: "app-1", cooldown_expires_at: new Date(Date.now() + 5 * 86400000).toISOString(), applied_at: ago(2) }]) : "[]" });
        return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    return route.abort();
  });
  return captured;
}

async function newPage(browser, opts = {}) {
  const { width = 1280, theme = "light", signedIn = true } = opts;
  const context = await browser.newContext({ viewport: { width, height: 1000 }, timezoneId: "Asia/Dubai" });
  const captured = await stub(context, opts);
  await context.addInitScript(([key, session, th, si]) => {
    if (si) localStorage.setItem(key, JSON.stringify(session));
    localStorage.setItem("cvp_theme", th);
    try { if (document.documentElement) document.documentElement.setAttribute("data-theme", th); } catch { /* early */ }
  }, [`sb-${REF}-auth-token`, SESSION, theme, signedIn]);
  const page = await context.newPage();
  page.on("pageerror", (e) => { console.log("[pageerror]", e.message); failures += 1; });
  return { context, page, captured };
}
const shot = (page, name) => page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true });
const URL_ = `http://localhost:4193/jobs/${JOB_ID}`;

const browser = await chromium.launch();

/* 1) Decide + Easy Apply → confirm → send → pipeline (gulf, signed-in, CV) */
{
  const { context, page } = await newPage(browser, { theme: "light" });
  await page.goto(URL_, { waitUntil: "networkidle" });
  await page.waitForSelector(".jp-title", { timeout: 8000 });
  await page.waitForTimeout(400);
  check(await page.locator(".jp-verified-badge").isVisible(), "detail: verified badge shows for a verified employer");
  check(!/\b0 views|\bviews\b/i.test(await page.locator(".jp-page").innerText()), "detail: no view_count anywhere");
  check(/per month/.test(await page.locator(".jp-chip--salary").innerText()), "detail: salary per month, local currency");
  check(await page.locator(".jp-promise").isVisible(), "detail: ATS promise sits at the decision point");
  check(await page.locator(".jp-primary", { hasText: "Apply with your CVPassport CV" }).isVisible(), "decide: Easy Apply is the primary for a signed-in candidate with a CV");
  await shot(page, "1-decide-easy");

  await page.locator(".jp-primary").click();
  await page.waitForSelector(".jp-panel__title", { timeout: 3000 });
  check((await page.locator(".jp-panel__title").innerText()).includes("Send to"), "easy: confirm sheet opens (Send to company)");
  check(await page.locator(".jb-matchchip").isVisible(), "easy: match chip shown before send");
  await shot(page, "2-easy-confirm");

  // pick visa (glass listbox), then send
  await page.locator(".jp-field .vs-trigger").click();
  await page.waitForSelector(".vs-menu");
  await page.locator(".vs-opt").nth(1).click(); // Own visa or residency
  await page.locator(".jp-primary", { hasText: "Send application" }).click();
  await page.waitForSelector(".jp-sent__title", { timeout: 4000 });
  check((await page.locator(".jp-sent__title").innerText()).includes("pipeline"), "sent: You are in the pipeline");
  const sub = await page.locator(".jp-sent").innerText();
  check(/WhatsApp/.test(sub) && /3 working days/.test(sub), "sent: reply promise (WhatsApp/email, 3 working days)");
  check(await page.locator(".jp-conv").isVisible(), "sent: ATS score conversion card");
  await shot(page, "3-sent");
  await context.close();
}

/* 2) No CV path */
{
  const { context, page } = await newPage(browser, { theme: "light", hasCv: false });
  await page.goto(URL_, { waitUntil: "networkidle" });
  await page.waitForSelector(".jp-title", { timeout: 8000 });
  await page.waitForTimeout(300);
  check((await page.locator(".jp-primary").innerText()).includes("Upload your CV"), "no-cv: primary is Upload your CV to apply");
  await shot(page, "4-no-cv");
  await context.close();
}

/* 3) Signed out */
{
  const { context, page } = await newPage(browser, { theme: "light", signedIn: false });
  await page.goto(URL_, { waitUntil: "networkidle" });
  await page.waitForSelector(".jp-title", { timeout: 8000 });
  await page.waitForTimeout(300);
  check((await page.locator(".jp-primary").innerText()).includes("Sign in to apply"), "signed-out: primary is Sign in to apply in one tap");
  await shot(page, "5-signed-out");
  await context.close();
}

/* 4) Already applied */
{
  const { context, page } = await newPage(browser, { theme: "light", applied: true });
  await page.goto(URL_, { waitUntil: "networkidle" });
  await page.waitForSelector(".jp-applied__title", { timeout: 8000 });
  await page.waitForTimeout(300);
  check((await page.locator(".jp-applied__title").innerText()).includes("already applied"), "applied: calm You already applied panel");
  check(await page.locator(".jp-primary").count() === 0, "applied: no apply button to press by accident");
  await shot(page, "6-already-applied");
  await context.close();
}

/* 5) Send failure keeps input */
{
  const { context, page } = await newPage(browser, { theme: "light", failSend: true });
  await page.goto(URL_, { waitUntil: "networkidle" });
  await page.waitForSelector(".jp-title", { timeout: 8000 });
  await page.locator(".jp-primary").click();
  await page.waitForSelector(".jp-panel__title", { timeout: 3000 });
  await page.locator(".jp-field .vs-trigger").click();
  await page.waitForSelector(".vs-menu");
  await page.locator(".vs-opt").nth(1).click();
  const chosen = await page.locator(".jp-field .vs-value").innerText();
  await page.locator(".jp-primary", { hasText: "Send application" }).click();
  await page.waitForSelector(".jp-err", { timeout: 4000 });
  check(await page.locator(".jp-err").isVisible(), "fail: honest inline error, no false confirmation");
  check((await page.locator(".jp-field .vs-value").innerText()) === chosen, "fail: the visa selection is kept");
  check(/Try again/.test(await page.locator(".jp-primary").innerText()), "fail: primary offers a plain Try again");
  check(await page.locator(".jp-sent__title").count() === 0, "fail: not moved to the sent state");
  await shot(page, "7-send-failure");
  await context.close();
}

/* 6) India role: no visa question */
{
  const { context, page } = await newPage(browser, { theme: "light", market: "india" });
  await page.goto(URL_, { waitUntil: "networkidle" });
  await page.waitForSelector(".jp-title", { timeout: 8000 });
  check(await page.locator(".jp-chip--visa").count() === 0, "india: no visa sponsored chip");
  await page.locator(".jp-primary").click();
  await page.waitForSelector(".jp-panel__title", { timeout: 3000 });
  check(await page.locator(".jp-novisa").isVisible(), 'india: "nothing else needed" instead of a visa question');
  check(await page.locator(".jp-field .vs-trigger").count() === 0, "india: no visa picker");
  await shot(page, "8-india-confirm");
  await context.close();
}

/* 7) Dark + mobile */
{
  const { context, page } = await newPage(browser, { theme: "dark" });
  await page.goto(URL_, { waitUntil: "networkidle" });
  await page.waitForSelector(".jp-title", { timeout: 8000 });
  await page.waitForTimeout(300);
  const bg = await page.locator(".jb-root").evaluate((el) => getComputedStyle(el).backgroundColor);
  check(bg === "rgb(19, 16, 25)", `dark: page bg flips to dark token (${bg})`);
  await shot(page, "9-detail-dark");
  await context.close();
}
{
  const { context, page } = await newPage(browser, { width: 393, theme: "light" });
  await page.goto(URL_, { waitUntil: "networkidle" });
  await page.waitForSelector(".jp-title", { timeout: 8000 });
  await page.waitForTimeout(300);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(overflow <= 1, `mobile 393: no horizontal overflow (${overflow}px)`);
  await shot(page, "10-detail-mobile");
  await context.close();
}

await browser.close();
server.close();
console.log(`\n${failures === 0 ? "✓ all job-detail checks passed" : `✗ ${failures} check(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
