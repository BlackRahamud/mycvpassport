/* Gates E1 and E2, on screen.
   Renders the REAL /employer/jobs against a stubbed backend in three
   entitlement states and screenshots each. The 046 jobs trigger is
   already enforcing this cap in production, so this is the designed
   state for a rule that is live, and it has been unproven visually.

   States:
     free-at-limit   1 of 1 on free  -> banner + upgrade CTA
     foundation-room 1 of 3          -> no banner at all
     grandfathered   7 of 7 baseline -> real ceiling copy, NO upsell,
                                        because telling someone holding
                                        7 jobs that free allows 1 is a lie

   Screenshots are READ by eye.
   Usage: node scripts/verify-gate-e2.mjs [outDir] */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";
import { chromium } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
const SUPA = process.env.REACT_APP_SUPABASE_URL;
const REF = new URL(SUPA).hostname.split(".")[0];
const OUT = process.argv[2] || "scripts/.screenshots/gate-e2";
mkdirSync(OUT, { recursive: true });

let failures = 0;
const check = (ok, label, detail) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (detail) console.log(`      ${detail}`);
  if (!ok) failures += 1;
};

const HR_ID = "11111111-1111-4111-8111-111111111111";
const SESSION = {
  access_token: "stub", refresh_token: "stub", token_type: "bearer",
  expires_in: 3600 * 24 * 30, expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 * 30,
  user: { id: HR_ID, aud: "authenticated", role: "authenticated",
          email: "recruiter@meridianlogistics.example",
          app_metadata: { provider: "email" }, user_metadata: { full_name: "Meridian HR" },
          created_at: "2026-06-01T00:00:00Z" },
};

const job = (i) => ({
  id: `job-${i}`, hr_id: HR_ID, source: "hr_portal", kind: "active", status: "active",
  title: i === 1 ? "IT Support Analyst L2" : `Cashier, branch ${i}`,
  company: "Meridian Logistics", location: "Dubai",
  posted_at: new Date(Date.now() - i * 86400000).toISOString(),
  created_at: new Date(Date.now() - i * 86400000).toISOString(),
  salary_min: 3000, salary_max: 8000, currency: "AED", market: "gulf",
});

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".woff2": "font/woff2" };
const server = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = join("./build", p);
  const ext = extname(p);
  if (!existsSync(file) || statSync(file).isDirectory()) {
    if (ext) { res.writeHead(404); return res.end(); }
    file = join("./build", "spa.html");
  }
  try { res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" }); res.end(readFileSync(file)); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(4203, r));

const browser = await chromium.launch();

async function run(label, { plan, status, activeJobs, allowedLimit, baseline, jobCount, daysLeft = 12 }) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1100 } });
  await context.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const accept = req.headers()["accept"] || "";
    if (url.pathname.startsWith("/api/")) return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    if (url.port === "4203") return route.continue();
    if (/posthog|clarity|google|gstatic|doubleclick|vercel|fonts/.test(url.hostname)) return route.abort();
    if (!req.url().startsWith(SUPA)) return route.abort();

    if (url.pathname.includes("/auth/v1/user")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSION.user) });
    }
    if (url.pathname.includes("/auth/v1/token")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSION) });
    }
    // The entitlement RPC. Shape mirrors 046's hr_my_entitlement():
    // one row of plan, status, period_end, limits, baseline, active_jobs.
    if (url.pathname.includes("/rest/v1/rpc/hr_my_entitlement")) {
      return route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify([{
          plan, status,
          // daysLeft is derived with Math.ceil, so land just UNDER the
          // whole day. Padding over it (+1h) rounds 5 up to 6 and fires
          // the wrong nudge, which is what failed here first time.
          period_end: status === "trial" ? new Date(Date.now() + daysLeft * 86400000 - 3600000).toISOString() : null,
          limits: { active_jobs: allowedLimit, ai_evaluation: plan === "foundation", analytics: plan === "foundation" },
          baseline, active_jobs: activeJobs,
        }]),
      });
    }
    if (url.pathname.includes("/rest/v1/rpc/")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: "null" });
    }
    if (req.method() === "HEAD") {
      return route.fulfill({ status: 200, headers: { "content-range": `0-0/${jobCount}`, "access-control-expose-headers": "content-range" }, body: "" });
    }
    if (url.pathname.includes("/rest/v1/")) {
      const wantsObject = /vnd\.pgrst\.object/.test(accept);
      const t = (n) => url.pathname.includes(`/rest/v1/${n}`);
      let rows = [];
      if (t("profiles") && !t("hr_profiles")) rows = [{ user_type: "recruiter", plan: "recruiter", full_name: "Meridian HR", company_name: "Meridian Logistics", work_email: "recruiter@meridianlogistics.example" }];
      else if (t("hr_profiles")) rows = [{ company_name: "Meridian Logistics", work_email: "recruiter@meridianlogistics.example", company_id: "55555555-5555-4555-8555-555555555555" }];
      else if (t("jobs")) rows = Array.from({ length: jobCount }, (_, i) => job(i + 1));
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(wantsObject ? (rows[0] ?? null) : rows) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });

  await context.addInitScript(([k, s]) => {
    localStorage.setItem(k, JSON.stringify(s));
    localStorage.setItem("cvp_theme", "light");
    localStorage.setItem("hr_welcome_ring_shown", "1");
  }, [`sb-${REF}-auth-token`, SESSION]);

  const page = await context.newPage();
  page.on("pageerror", (e) => { console.log("[pageerror]", e.message); failures += 1; });
  await page.goto("http://localhost:4203/employer/jobs", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);

  const banner = page.locator(".jlb");
  const chip = page.locator(".jlb-count");
  const hasBanner = (await banner.count()) > 0;
  const chipText = hasBanner || (await chip.count()) ? await chip.innerText().catch(() => "") : "";

  await page.screenshot({ path: join(OUT, `${label}.png`), fullPage: false });

  return { page, context, banner, hasBanner, chipText };
}

console.log("=".repeat(70));
console.log("GATES E1 and E2 — rendered");
console.log("=".repeat(70));

/* 1. Free employer at the limit: the designed gate state. */
{
  const r = await run("1-free-at-limit", { plan: "free", status: "active", activeJobs: 1, allowedLimit: 1, baseline: 0, jobCount: 1 });
  check(r.hasBanner, "free at limit: banner is shown");
  const text = r.hasBanner ? await r.banner.innerText() : "";
  check(/reached your active job limit/i.test(text), "free at limit: states the limit is reached", text.split("\n")[0]);
  check(/Free allows 1 active job/.test(text), "free at limit: names the free allowance");
  check(/Upgrade to Foundation/.test(text), "free at limit: offers the upgrade");
  check(/1 of 1 active on free/.test(r.chipText), "free at limit: counter chip reads correctly", r.chipText);
  // Assert on rendered CONTENT, not on a guessed class name. The jobs
  // render as table rows here, and a class-shaped guess passed nothing
  // while the page was in fact correct.
  const pageText = await r.page.locator("body").innerText();
  check(/IT Support Analyst L2/.test(pageText), "free at limit: the existing job stays visible, the gate does not block it");
  check(/View applicants/.test(pageText), "free at limit: the existing job stays actionable");
  await r.context.close();
}

/* 2. Foundation with room: no gate at all. */
{
  const r = await run("2-foundation-room", { plan: "foundation", status: "active", activeJobs: 1, allowedLimit: 3, baseline: 0, jobCount: 1 });
  check(!r.hasBanner, "foundation with room: no banner");
  check(/1 of 3 active on Foundation/.test(r.chipText), "foundation with room: counter reads 1 of 3", r.chipText);
  await r.context.close();
}

/* 3. Grandfathered: above the plan limit via the 046 baseline. */
{
  const r = await run("3-grandfathered", { plan: "free", status: "active", activeJobs: 7, allowedLimit: 1, baseline: 7, jobCount: 7 });
  check(r.hasBanner, "grandfathered: banner is shown");
  const text = r.hasBanner ? await r.banner.innerText() : "";
  check(/7 active jobs/.test(text), "grandfathered: copy uses the real ceiling, not the plan limit", text.split("\n").pop());
  check(!/Free allows 1 active job/.test(text), "grandfathered: does NOT claim free allows 1");
  check(!/Upgrade to Foundation/.test(text), "grandfathered: no upsell, there is nothing to sell");
  check(/7 of 7 active on free/.test(r.chipText), "grandfathered: counter reads 7 of 7", r.chipText);
  await r.context.close();
}

/* 4. Gate E1: the trial has lapsed. The sheet must present itself once,
      and must NOT present again on a reload, because the free account is
      a state the employer is allowed to remain in. */
{
  const r = await run("4-trial-ended", { plan: "free", status: "expired", activeJobs: 1, allowedLimit: 1, baseline: 0, jobCount: 1 });
  const sheet = r.page.locator(".fus-sheet");
  const shown = (await sheet.count()) > 0;
  check(shown, "trial ended: the upgrade sheet presents itself");

  if (shown) {
    const t = await sheet.innerText();
    await sheet.screenshot({ path: join(OUT, "4-trial-ended-sheet.png") });
    check(/Your trial has ended/.test(t), "trial ended: heading is the E1 copy");
    check(/your work is safe/i.test(t), "trial ended: says the work is safe, not a scolding wall");
    check(/Continue on Foundation, (AED|₹)/.test(t), "trial ended: CTA carries the price", t.split("\n").find((l) => /Continue on Foundation/.test(l)));
    check(/Stay on the free account for now/.test(t), "trial ended: an honest way out is offered");
    check(!/card number|cvc|expiry/i.test(t), "trial ended: collects no card details");
  }

  // Reload in the SAME context, so localStorage persists.
  await r.page.reload({ waitUntil: "networkidle" });
  await r.page.waitForTimeout(1200);
  const again = (await r.page.locator(".fus-sheet").count()) > 0;
  check(!again, "trial ended: does not present again on reload, no nagging");
  await r.page.screenshot({ path: join(OUT, "5-trial-ended-after-reload.png") });
  await r.context.close();
}

/* ── Sections D and D2: trial state and the three nudges ────────────
   Each nudge is keyed to REAL days left, and each fires once. The runs
   below use a fresh context per moment, which is what a first sighting
   looks like; the dismissal test then proves it collapses rather than
   traps. */
const MOMENTS = [
  { label: "6-nudge-early", daysLeft: 23, want: /off to a strong start/i, name: "early, around day 7" },
  { label: "7-nudge-late", daysLeft: 5, want: /5 days left in your trial/i, name: "late, five days left" },
  { label: "8-nudge-final", daysLeft: 1, want: /last day of full access/i, name: "final, last day" },
];

for (const m of MOMENTS) {
  const r = await run(m.label, {
    plan: "foundation", status: "trial", activeJobs: 1, allowedLimit: 3,
    baseline: 0, jobCount: 1, daysLeft: m.daysLeft,
  });
  const nudge = r.page.locator(".tn");
  const up = (await nudge.count()) > 0;
  check(up, `${m.name}: the nudge appears`);
  if (up) {
    const t = await nudge.innerText();
    await nudge.screenshot({ path: join(OUT, `${m.label}.png`) });
    check(m.want.test(t), `${m.name}: carries its own copy`, t.split("\n").slice(0, 3).join(" / "));
    check(!/[–—]/.test(t), `${m.name}: no dash characters`);
  }
  // D, the permanent status chip, is present at every moment.
  const chip = r.page.locator(".tn-chip");
  check((await chip.count()) > 0, `${m.name}: trial status chip is shown`,
    await chip.innerText().catch(() => ""));
  await r.context.close();
}

/* Dismissal collapses to the quiet chip, never traps. */
{
  const r = await run("9-nudge-dismissed", {
    plan: "foundation", status: "trial", activeJobs: 1, allowedLimit: 3,
    baseline: 0, jobCount: 1, daysLeft: 5,
  });
  await r.page.locator(".tn__x").click();
  await r.page.waitForTimeout(500);
  const collapsed = r.page.locator(".tn-collapsed");
  const ok = (await collapsed.count()) > 0;
  check(ok, "dismissed: collapses to the quiet chip");
  if (ok) {
    check(/Reminders paused/.test(await collapsed.innerText()), "dismissed: says reminders are paused, and reopens");
    await collapsed.screenshot({ path: join(OUT, "9-nudge-dismissed.png") });
    await collapsed.click();
    await r.page.waitForTimeout(400);
    check((await r.page.locator(".tn").count()) > 0, "dismissed: reopens on demand, never trapped");
  }
  await r.context.close();
}

/* A trial that is not near a moment must stay quiet. */
{
  const r = await run("10-nudge-quiet", {
    plan: "foundation", status: "trial", activeJobs: 1, allowedLimit: 3,
    baseline: 0, jobCount: 1, daysLeft: 28,
  });
  check((await r.page.locator(".tn").count()) === 0, "day 2 of the trial: no nudge, nothing to say yet");
  check((await r.page.locator(".tn-chip").count()) > 0, "day 2 of the trial: the quiet status chip still shows");
  await r.context.close();
}

await browser.close();
server.close();
console.log(`\n${failures === 0 ? "Gates E1 and E2, and the trial nudges, render correctly." : `${failures} check(s) failed.`}`);
console.log(`Screenshots: ${OUT}`);
process.exitCode = failures === 0 ? 0 : 1;
