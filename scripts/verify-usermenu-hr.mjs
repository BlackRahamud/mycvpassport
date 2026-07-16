/* HR account-chip verification harness. Serves the PRODUCTION build with a
   stubbed backend (same pattern as verify-feedback.mjs), opens the UserMenu
   popover on the HR Jobs landing, and proves the Settings routing fix:

   - Settings item is GONE (no HR settings destination exists; it used to
     point at /account, the candidate account page, ejecting her from the
     portal)
   - the candidate plan line is GONE (the chip was reading profiles.plan,
     the jobseeker plan, which is meaningless in the employer portal)
   - Switch to Candidate, Help & Support, and Log out all remain
   - no orphaned / doubled divider is left where Settings + plan were

   Screenshots are read by eye, not just asserted.

   Usage: node scripts/verify-usermenu-hr.mjs [outDir] */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";
import { chromium } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
const SUPA = process.env.REACT_APP_SUPABASE_URL;
const REF = new URL(SUPA).hostname.split(".")[0];
const OUT = process.argv[2] || "scripts/.screenshots/usermenu-hr";
mkdirSync(OUT, { recursive: true });

let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? "✓" : "✗ FAIL"} ${label}`);
  if (!ok) failures += 1;
};

const HR_ID = "11111111-1111-4111-8111-111111111111";
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

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".txt": "text/plain", ".xml": "text/xml", ".webp": "image/webp", ".woff2": "font/woff2" };
const server = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = join("./build", p);
  if (!existsSync(file) || statSync(file).isDirectory()) file = join("./build", "spa.html");
  try {
    res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
    res.end(readFileSync(file));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(4191, r));

// profiles carries a candidate plan on purpose: the pre-fix chip surfaced it.
function pgrest(url) {
  const path = url.pathname;
  const t = (name) => path.includes(`/rest/v1/${name}`);
  let rows = [];
  if (t("profiles")) rows = [{ user_type: "recruiter", plan: "career-pro", full_name: "Meridian HR", company_name: "Meridian Logistics", work_email: "recruiter@meridianlogistics.example" }];
  else if (t("hr_profiles")) rows = [{ company_name: "Meridian Logistics", work_email: "recruiter@meridianlogistics.example", company_id: "55555555-5555-4555-8555-555555555555" }];
  else rows = [];
  return JSON.stringify(rows);
}

async function stubRoutes(context) {
  await context.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const href = req.url();
    if (url.pathname.startsWith("/api/")) return route.fulfill({ status: 200, contentType: "application/json", body: '{"ok":true}' });
    if (url.port === "4191") return route.continue();
    if (/posthog|clarity|google|gstatic|doubleclick|vercel|fonts/.test(url.hostname)) return route.abort();
    if (href.startsWith(SUPA)) {
      if (url.pathname.includes("/auth/v1/user")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSION.user) });
      if (url.pathname.includes("/auth/v1/token")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSION) });
      if (url.pathname.includes("/rest/v1/")) {
        const method = req.method();
        if (method === "HEAD") return route.fulfill({ status: 200, contentType: "application/json", headers: { "content-range": "*/0", "access-control-expose-headers": "content-range" }, body: "" });
        if (method === "PATCH" || method === "POST" || url.pathname.includes("/rpc/")) return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
        return route.fulfill({ status: 200, contentType: "application/json", body: pgrest(url) });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    return route.abort();
  });
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, timezoneId: "Asia/Dubai" });
await stubRoutes(context);
await context.addInitScript(([key, session, hrId]) => {
  localStorage.setItem(key, JSON.stringify(session));
  localStorage.setItem("cvp_theme", "light");
  sessionStorage.setItem("hr_welcome_ring_shown", "1");
}, [`sb-${REF}-auth-token`, SESSION, HR_ID]);
const page = await context.newPage();
page.on("pageerror", (e) => { console.log("[pageerror]", e.message); failures += 1; });

await page.goto("http://localhost:4191/employer/jobs", { waitUntil: "networkidle" });
await page.waitForSelector(".um-trigger", { timeout: 8000 });
const trigger = page.locator(".um-trigger:visible").first();
await trigger.click();
await page.waitForSelector(".um-popover", { timeout: 4000 });
await page.waitForTimeout(400);

// The visible menu items, in order.
const items = await page.locator(".um-popover .um-item").allTextContents();
const norm = items.map((s) => s.replace(/\s+/g, " ").trim());
console.log("  popover items:", JSON.stringify(norm));

check(!norm.some((s) => /Settings/i.test(s)), "Settings item is gone (no HR settings destination)");
check(await page.locator(".um-popover .um-plan").count() === 0, "candidate plan line is gone from the HR chip");
check(norm.some((s) => /Switch to Candidate/i.test(s)), "Switch to Candidate remains");
check(norm.some((s) => /Help & ?Support/i.test(s)), "Help & Support remains");
check(norm.some((s) => /Log out/i.test(s)), "Log out remains");

// No doubled divider where the plan block + Settings used to sit: count the
// dividers and confirm none are adjacent siblings.
const dividerRun = await page.locator(".um-popover").evaluate((el) => {
  const kids = [...el.children];
  let maxRun = 0, run = 0;
  for (const k of kids) {
    if (k.classList.contains("um-divider")) { run += 1; maxRun = Math.max(maxRun, run); }
    else run = 0;
  }
  return maxRun;
});
check(dividerRun <= 1, `no doubled divider left behind (max adjacent run ${dividerRun})`);

await page.screenshot({ path: join(OUT, "hr-account-popover.png") });

await browser.close();
server.close();
console.log(`\n${failures === 0 ? "✓ all HR account-chip checks passed" : `✗ ${failures} check(s) failed`}`);
process.exit(failures === 0 ? 0 : 1);
