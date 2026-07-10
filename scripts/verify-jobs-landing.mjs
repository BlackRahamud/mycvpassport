/* Jobs landing verification harness (greeting header + first-run checklist,
   design 2a). Serves the PRODUCTION build with a stubbed backend (same
   pattern as verify-mobile-polish.mjs), then:
   - populated: time-based greeting, tabs, attention region, jobs table row,
     Insights tab switch
   - first run (zero jobs): Welcome greeting, "Get set up" checklist, Start
     goes to /employer/post, talent pool link goes to /employer/import
   - dash scan on the landing's visible text (no -, en dash, em dash, --)
   - horizontal-overflow audit at 360/393/430 and 1280
   Usage: node scripts/verify-jobs-landing.mjs <outDir> */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";
import { chromium } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
const SUPA = process.env.REACT_APP_SUPABASE_URL;
const REF = new URL(SUPA).hostname.split(".")[0];
const OUT = process.argv[2] || "scripts/.screenshots/jobs-landing";
mkdirSync(OUT, { recursive: true });

let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? "✓" : "✗ FAIL"} ${label}`);
  if (!ok) failures += 1;
};

const HR_ID = "11111111-1111-4111-8111-111111111111";
const JOB = {
  id: "33333333-3333-4333-8333-333333333333",
  title: "IT support L1 Engineer (Dubai onsite)",
  status: "active",
  posted_at: "2026-06-20T08:00:00Z",
  created_at: "2026-06-20T08:00:00Z",
  salary_min: 4000,
  salary_max: 6000,
  currency: "AED",
  hr_id: HR_ID,
  kind: "active",
  source: "hr_portal",
};

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
  access_token: "stub-access-token",
  refresh_token: "stub-refresh-token",
  token_type: "bearer",
  expires_in: 3600 * 24 * 30,
  expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 * 30,
  user: {
    id: HR_ID,
    aud: "authenticated",
    role: "authenticated",
    email: "recruiter@meridianlogistics.example",
    app_metadata: { provider: "email" },
    user_metadata: { full_name: "Meridian HR" },
    created_at: "2026-06-01T00:00:00Z",
  },
};

function pgrest(url, accept, emptyJobs) {
  const path = url.pathname;
  const wantsObject = /vnd\.pgrst\.object/.test(accept || "");
  const t = (name) => path.includes(`/rest/v1/${name}`);
  let rows = [];
  if (t("profiles")) rows = [{ user_type: "recruiter", plan: "recruiter", full_name: "Meridian HR", company_name: "Meridian Logistics", work_email: "recruiter@meridianlogistics.example" }];
  else if (t("hr_profiles")) rows = [{ company_name: "Meridian Logistics", work_email: "recruiter@meridianlogistics.example", company_id: "55555555-5555-4555-8555-555555555555" }];
  else if (t("jobs")) rows = emptyJobs ? [] : [JOB];
  else rows = [];
  const body = wantsObject ? (rows[0] ?? null) : rows;
  return JSON.stringify(body);
}

async function stubRoutes(context, { emptyJobs = false } = {}) {
  await context.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const href = req.url();
    if (url.port === "4183") return route.continue();
    if (/posthog|clarity|google|gstatic|doubleclick|vercel|fonts/.test(url.hostname)) return route.abort();
    if (href.startsWith(SUPA)) {
      if (url.pathname.includes("/auth/v1/user")) {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSION.user) });
      }
      if (url.pathname.includes("/auth/v1/token")) {
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSION) });
      }
      if (url.pathname.includes("/rest/v1/")) {
        if (req.method() === "PATCH" || url.pathname.includes("/rpc/")) {
          return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
        }
        return route.fulfill({ status: 200, contentType: "application/json", body: pgrest(url, req.headers().accept, emptyJobs) });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    if (url.pathname.startsWith("/api/")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
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

async function newPage({ width, emptyJobs = false }) {
  const context = await browser.newContext({ viewport: { width, height: 852 } });
  await stubRoutes(context, { emptyJobs });
  await context.addInitScript(([key, session]) => {
    localStorage.setItem(key, JSON.stringify(session));
    localStorage.setItem("cvp_theme", "light");
  }, [`sb-${REF}-auth-token`, SESSION]);
  const page = await context.newPage();
  page.on("pageerror", (e) => { console.log("[pageerror]", e.message); failures += 1; });
  return { context, page };
}

const shot = (page, name) => page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true });
const WIDTHS = [360, 393, 430, 1280];

/* Dash scan: greeting + onboarding card text must carry no dash of any
   kind (hyphen, en dash, em dash, double hyphen). Scoped to the new
   surfaces, not the whole page (pre-existing strings elsewhere). */
async function dashScan(page, sel, label) {
  const txt = await page.evaluate((s) => {
    const el = document.querySelector(s);
    return el ? el.textContent : null;
  }, sel);
  if (txt === null) { check(false, `${label}: element ${sel} present for dash scan`); return; }
  check(!/[-–—]/.test(txt), `${label}: no dash characters in "${txt.slice(0, 60)}"`);
}

/* ── 1) populated landing ─────────────────────────────────────── */
for (const width of WIDTHS) {
  const { context, page } = await newPage({ width });
  await page.goto("http://localhost:4183/employer/jobs", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const title = await page.locator(".hjl-greet__title").textContent().catch(() => null);
  check(/^Good (morning|afternoon|evening), Meridian$/.test(title || ""), `populated ${width}px: time greeting ("${title}")`);
  const sub = await page.locator(".hjl-greet__sub").textContent().catch(() => null);
  check(/^[A-Z][a-z]+day, \d{1,2} [A-Z][a-z]+$/.test(sub || ""), `populated ${width}px: date subline ("${sub}")`);
  await dashScan(page, ".hjl-greet", `populated ${width}px greeting`);
  check(await page.getByRole("tab", { name: "Jobs" }).isVisible(), `populated ${width}px: Jobs tab present`);
  check(await page.getByRole("tab", { name: "Insights" }).isVisible(), `populated ${width}px: Insights tab present`);
  check(await page.locator(".hjl-trow__title", { hasText: JOB.title }).isVisible(), `populated ${width}px: job row renders`);
  check(await page.locator(".hjl-onboard-card").count() === 0, `populated ${width}px: no setup checklist`);
  await auditOverflow(page, `populated ${width}px`);
  if (width === 1280 || width === 393) {
    await page.getByRole("tab", { name: "Insights" }).click();
    await page.waitForTimeout(600);
    const greetStill = await page.locator(".hjl-greet__title").isVisible();
    check(greetStill, `populated ${width}px: greeting stays visible on Insights tab`);
    await auditOverflow(page, `insights ${width}px`);
  }
  await shot(page, `populated-${width}`);
  await context.close();
}

/* ── 2) first run (zero jobs) ─────────────────────────────────── */
for (const width of WIDTHS) {
  const { context, page } = await newPage({ width, emptyJobs: true });
  await page.goto("http://localhost:4183/employer/jobs", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  const title = await page.locator(".hjl-greet__title").textContent().catch(() => null);
  check(title === "Welcome, Meridian", `first-run ${width}px: Welcome greeting ("${title}")`);
  const sub = await page.locator(".hjl-greet__sub").textContent().catch(() => null);
  check(sub === "Let's get your first role live. It takes about two minutes.", `first-run ${width}px: starter subline`);
  check(await page.locator(".hjl-onboard-card__title", { hasText: "Get set up" }).isVisible(), `first-run ${width}px: Get set up card`);
  check(await page.locator(".hjl-setup").count() === 3, `first-run ${width}px: three steps render`);
  check(await page.locator(".hjl-setup--waiting").count() === 2, `first-run ${width}px: steps 2 and 3 dimmed`);
  await dashScan(page, ".hjl-greet", `first-run ${width}px greeting`);
  await dashScan(page, ".hjl-onboard-card", `first-run ${width}px checklist`);
  await auditOverflow(page, `first-run ${width}px`);
  await shot(page, `first-run-${width}`);
  if (width === 393) {
    await page.locator(".hjl-setup__start").click();
    await page.waitForTimeout(500);
    check(page.url().includes("/employer/post"), `first-run ${width}px: Start goes to post wizard (${page.url()})`);
    await page.goBack({ waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    await page.locator(".hjl-onboard-card__link").click();
    await page.waitForTimeout(500);
    check(page.url().includes("/employer/import"), `first-run ${width}px: pool link goes to import (${page.url()})`);
  }
  await context.close();
}

await browser.close();
server.close();
console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
