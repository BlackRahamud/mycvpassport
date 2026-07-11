/* Post a Job wizard fixes harness (walkthrough batch 2). Serves the
   PRODUCTION build with a stubbed backend and walks the wizard:
   - salary opens at the AED default band 3,000 to 8,000 (not 50 to 1000)
   - currency switch remaps an UNTOUCHED band (INR 25,000 to 60,000) and
     never overwrites a band the HR has edited
   - experience opens at 1 to 3 (not 18 to 25)
   - the live preview experience stat is BOUND to the slider (updates in
     real time, no hardcoded "Less than 1 Year")
   - the publish button reads "Post job" (no "Hire Now" anywhere) and the
     step rail chip reads "Post"
   - new strings are dash free; 360/393/430 have no horizontal overflow
   Usage: node scripts/verify-postjob-fixes.mjs <outDir> */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";
import { chromium } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
const SUPA = process.env.REACT_APP_SUPABASE_URL;
const REF = new URL(SUPA).hostname.split(".")[0];
const OUT = process.argv[2] || "scripts/.screenshots/postjob-fixes";
mkdirSync(OUT, { recursive: true });

let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? "✓" : "✗ FAIL"} ${label}`);
  if (!ok) failures += 1;
};

const HR_ID = "11111111-1111-4111-8111-111111111111";

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
await new Promise((r) => server.listen(4192, r));

const SESSION = {
  access_token: "stub-access-token", refresh_token: "stub-refresh-token", token_type: "bearer",
  expires_in: 3600 * 24 * 30, expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 * 30,
  user: {
    id: HR_ID, aud: "authenticated", role: "authenticated",
    email: "recruiter@meridianlogistics.example",
    app_metadata: { provider: "email" }, user_metadata: { full_name: "Meridian HR" },
    created_at: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString(), // fresh signup, free tier active
  },
};

async function stubRoutes(context) {
  await context.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const href = req.url();
    if (url.pathname.startsWith("/_vercel")) return route.fulfill({ status: 200, contentType: "text/javascript", body: "" });
    if (url.port === "4192") return route.continue();
    if (/posthog|clarity|google|gstatic|doubleclick|vercel|fonts/.test(url.hostname)) return route.abort();
    if (href.startsWith(SUPA)) {
      if (url.pathname.includes("/auth/v1/user")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSION.user) });
      if (url.pathname.includes("/auth/v1/token")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSION) });
      if (url.pathname.includes("/rest/v1/")) {
        const wantsObject = /vnd\.pgrst\.object/.test(req.headers().accept || "");
        let rows = [];
        if (url.pathname.includes("profiles")) rows = [{ id: HR_ID, user_type: "recruiter", plan: "recruiter", full_name: "Meridian HR", company_name: "Meridian Logistics", work_email: "r@m.example" }];
        if (req.method() !== "GET") return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(wantsObject ? (rows[0] ?? null) : rows) });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    if (url.pathname.startsWith("/api/")) return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    return route.abort();
  });
}

const browser = await chromium.launch();
const shot = (page, name) => page.screenshot({ path: join(OUT, `${name}.png`), fullPage: false });

async function openWizard({ width, height = 950 }) {
  const context = await browser.newContext({ viewport: { width, height } });
  await stubRoutes(context);
  await context.addInitScript(([key, session]) => {
    localStorage.setItem(key, JSON.stringify(session));
    localStorage.setItem("cvp_theme", "light");
  }, [`sb-${REF}-auth-token`, SESSION]);
  const page = await context.newPage();
  page.on("pageerror", (e) => { console.log("[pageerror]", e.message); failures += 1; });
  await page.goto("http://localhost:4192/employer/post", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  return { context, page };
}

async function continueStep(page) {
  await page.locator(".pj-btn--primary", { hasText: "Continue" }).first().click();
  await page.waitForTimeout(900); // step entrance motion
}

async function fillStart(page) {
  await page.locator("#pj-job-title").fill("IT Support Analyst L2");
  await page.locator("#pj-location").fill("Dubai, UAE");
  await continueStep(page);
}

/* ── 1) Desktop walk: all four fixes ─────────────────────────── */
{
  const { context, page } = await openWizard({ width: 1440 });
  check((await page.locator("body").innerText()).includes("Get Started"), "wizard loads on the start step");
  await fillStart(page);

  /* Fix 4: salary defaults */
  const salaryInputs = page.locator(".pj-num:not(.pj-num--compact) input");
  check(await salaryInputs.nth(0).inputValue() === "3000", "salary min opens at 3000 (not 50)");
  check(await salaryInputs.nth(1).inputValue() === "8000", "salary max opens at 8000 (not 1000)");

  /* Currency follow: untouched band remaps, touched band never does.
     Currency is the SegmentedToggle radiogroup (AED / INR / USD). */
  const pickCurrency = async (name) => {
    await page.getByRole("radiogroup", { name: "Salary currency" }).getByRole("radio", { name }).click();
    await page.waitForTimeout(350);
  };
  await pickCurrency("INR");
  check(await salaryInputs.nth(0).inputValue() === "25000", "INR switch remaps untouched min to 25000");
  check(await salaryInputs.nth(1).inputValue() === "60000", "INR switch remaps untouched max to 60000");
  await pickCurrency("AED");
  check(await salaryInputs.nth(0).inputValue() === "3000", "switching back to AED restores the AED band");
  // Touch the band, then switch currency: the HR's numbers must survive.
  await salaryInputs.nth(0).fill("4500");
  await pickCurrency("INR");
  check(await salaryInputs.nth(0).inputValue() === "4500", "an edited band is NEVER overwritten by a currency switch");
  // Back to AED for the rest of the walk.
  await pickCurrency("AED");
  await shot(page, "salary-defaults");
  await continueStep(page);

  /* Fix 1: experience defaults */
  const yrInputs = page.locator(".pj-num--compact input");
  check(await yrInputs.nth(0).inputValue() === "1", "experience min opens at 1 (not 18)");
  check(await yrInputs.nth(1).inputValue() === "3", "experience max opens at 3 (not 25)");

  /* Fix 2: preview bound to the experience field, real time */
  const expStat = page.locator(".pj-stat__value").first();
  check((await expStat.textContent()).trim() === "1 to 3 years", "preview shows the actual default range (1 to 3 years)");
  await yrInputs.nth(1).fill("4");
  await yrInputs.nth(0).fill("2");
  await page.waitForTimeout(400);
  check((await expStat.textContent()).trim() === "2 to 4 years", "preview updates in real time when the slider changes");
  check(!/[–—]|\s-\s|--/.test(await expStat.textContent()), "experience copy is dash free");
  await shot(page, "experience-preview-bound");
  await continueStep(page);

  /* Job Description step -> Hire step */
  await continueStep(page);

  /* Fix 3: publish button copy */
  const primary = page.locator(".pj-btn--primary").last();
  check((await primary.textContent()).trim() === "Post job", 'publish button reads "Post job"');
  const bodyText = await page.locator("body").innerText();
  check(!bodyText.includes("Hire Now"), '"Hire Now" appears nowhere');
  const railLabels = await page.locator(".pj-step__label").allTextContents();
  check(railLabels.includes("Post"), 'step rail final chip reads "Post"');
  check(!railLabels.includes("Hire"), 'step rail no longer says "Hire"');
  await shot(page, "post-job-button");
  await context.close();
}

/* ── 2) Phone widths: defaults hold + no horizontal overflow ──── */
for (const width of [360, 393, 430]) {
  const { context, page } = await openWizard({ width, height: 860 });
  await fillStart(page);
  const salaryInputs = page.locator(".pj-num:not(.pj-num--compact) input");
  check(await salaryInputs.nth(0).inputValue() === "3000", `phone ${width}px: salary default holds`);
  await continueStep(page);
  const yrInputs = page.locator(".pj-num--compact input");
  check(await yrInputs.nth(0).inputValue() === "1", `phone ${width}px: experience default holds`);
  await continueStep(page);
  await continueStep(page);
  check((await page.locator(".pj-btn--primary").last().textContent()).trim() === "Post job", `phone ${width}px: button reads Post job`);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(overflow <= 1, `phone ${width}px: no horizontal overflow (delta ${overflow}px)`);
  if (width === 393) await shot(page, "phone-393-hire-step");
  await context.close();
}

await browser.close();
server.close();
console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
