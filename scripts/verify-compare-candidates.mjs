/* Compare Candidates harness (design 2a hybrid). Serves the PRODUCTION
   build with a stubbed backend, then on the Candidates CRM:
   - bulk bar: Compare enabled at 2 and 3, disabled at 1 and at 4 with
     the "compare up to 3 at a time" hint
   - compare panel: label rail rows, per column verdict loading (one
     response is deliberately slow), Leading ribbon + Top score on the
     winner ONLY after all columns score, "N behind" on the rest
   - legacy verdict without strengths/gaps falls back to Match/Gap lines
   - Not provided pills for missing visa/notice/experience
   - Shortlist issues a real one row PATCH and flips to done
   - phone widths: label rail pinned while columns scroll; dash scan
   Usage: node scripts/verify-compare-candidates.mjs <outDir> */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";
import { chromium } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
const SUPA = process.env.REACT_APP_SUPABASE_URL;
const REF = new URL(SUPA).hostname.split(".")[0];
const OUT = process.argv[2] || "scripts/.screenshots/compare-candidates";
mkdirSync(OUT, { recursive: true });

let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? "✓" : "✗ FAIL"} ${label}`);
  if (!ok) failures += 1;
};

const HR_ID = "11111111-1111-4111-8111-111111111111";
const JOB = {
  id: "33333333-3333-4333-8333-333333333333",
  title: "Senior Accountant", status: "active", posted_at: "2026-06-20T08:00:00Z",
  created_at: "2026-06-20T08:00:00Z", location: "Dubai, UAE", market: "gulf",
  job_type: "full_time", hr_id: HR_ID, company: "Meridian", department: "Finance",
  skills: ["IFRS", "VAT"], requirements: ["5+ years"], description: "Own the close.",
  screening_questions: [], kind: "active", source: "hr_portal",
};
const app = (n, name, marker, extra) => ({
  id: `44444444-4444-4444-8444-44444444444${n}`,
  job_id: JOB.id,
  candidate_id: `22222222-2222-4222-8222-22222222222${n}`,
  candidate_name: name,
  candidate_email: `${marker}@example.com`,
  candidate_phone: "+971585508782",
  cv_snapshot: { marker, skills: ["Excel"], ...extra?.cv },
  cv_file_path: null,
  ats_score: 50, score_source: "ai", source: "applied", status: "new",
  applied_at: extra?.applied || "2026-07-02T08:00:00Z",
  match_keywords: extra?.matched ?? ["ifrs", "vat", "audit", "sap"],
  missing_keywords: extra?.missing ?? ["oracle fusion", "sox"],
  visa_status: extra?.visa ?? "",
});
const APPS = [
  app(1, "Priya Sharma", "priya", {
    visa: "UAE employment visa",
    cv: { notice_period: "30 days", experience: [{ title: "Finance Manager", company: "Emaar", start_date: "2017", end_date: "Present", present: true }, { title: "Analyst", company: "EY", start_date: "2014", end_date: "2017" }] },
  }),
  app(2, "Ahmed Al Farsi", "ahmed", {
    visa: "Family sponsorship",
    applied: "2026-06-28T08:00:00Z",
    cv: { notice_period: "Immediate", experience: [{ title: "Auditor", company: "KPMG", start_date: "2021", end_date: "Present", present: true }] },
  }),
  app(3, "Rahul Nair", "rahul", {
    applied: "2026-06-25T08:00:00Z",
    matched: ["excel"], missing: ["ifrs", "vat", "sap", "audit"],
    cv: { experience: [{ title: "Accountant", company: "Infosys BPM" }] }, // no years -> Not provided
  }),
  app(4, "Fatima Khan", "fatima", {}),
];

const VERDICTS = {
  priya: { verdict: "STRONG FIT", score: 87, two_second_why: ["Match: nine years of Gulf finance maps onto the JD.", "Corridor: already in Dubai on an employment visa.", "Gap: no Oracle Fusion exposure."], strengths: ["Nine years in Gulf finance teams", "Owns IFRS reporting end to end"], gaps: ["No Oracle Fusion exposure", "SOX experience is light"], whatsapp_cta_template: "Hi Priya" },
  ahmed: { verdict: "MAYBE", score: 72, two_second_why: ["Match: Big 4 audit training fits the rigour bar.", "Corridor: family sponsorship, no transfer needed.", "Gap: only two years after qualifying."], strengths: ["Big 4 audit trained", "Strong VAT background"], gaps: ["Only 2 years after qualifying", "No team leadership yet"], whatsapp_cta_template: "Hi Ahmed" },
  // Legacy shape: NO strengths/gaps arrays — tests the fallback.
  rahul: { verdict: "PASS", score: 46, two_second_why: ["Match: solid AP and AR fundamentals.", "Corridor: needs visa sponsorship from India.", "Gap: no Gulf experience and IFRS is theoretical."], whatsapp_cta_template: "Hi Rahul" },
  fatima: { verdict: "MAYBE", score: 60, two_second_why: ["Match: fine.", "Corridor: fine.", "Gap: fine."], strengths: ["Fine", "Fine"], gaps: ["Fine", "Fine"], whatsapp_cta_template: "Hi" },
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
await new Promise((r) => server.listen(4191, r));

const SESSION = {
  access_token: "stub-access-token", refresh_token: "stub-refresh-token", token_type: "bearer",
  expires_in: 3600 * 24 * 30, expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 * 30,
  user: {
    id: HR_ID, aud: "authenticated", role: "authenticated",
    email: "recruiter@meridianlogistics.example",
    app_metadata: { provider: "email" }, user_metadata: { full_name: "Meridian HR" },
    created_at: "2026-06-01T00:00:00Z",
  },
};

let patchedIds = [];

function pgrest(url, accept) {
  const path = url.pathname;
  const wantsObject = /vnd\.pgrst\.object/.test(accept || "");
  const t = (name) => path.includes(`/rest/v1/${name}`);
  let rows = [];
  if (t("hr_profiles")) rows = [{ company_name: "Meridian", work_email: "r@m.example", company_id: "55555555-5555-4555-8555-555555555555" }];
  else if (t("profiles")) rows = [{ user_type: "recruiter", plan: "recruiter", full_name: "Meridian HR" }];
  else if (t("jobs")) rows = [JOB];
  else if (t("applications")) rows = APPS;
  else rows = [];
  const body = wantsObject ? (rows[0] ?? null) : rows;
  return JSON.stringify(body);
}

async function stubRoutes(context) {
  await context.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const href = req.url();
    if (url.pathname.startsWith("/api/ai") && url.searchParams.get("action") === "candidate_verdict") {
      let marker = "fatima";
      try { marker = JSON.parse(req.postData() || "{}")?.cvSnapshot?.marker || marker; } catch { /* default */ }
      const body = JSON.stringify(VERDICTS[marker] || VERDICTS.fatima);
      // Ahmed is deliberately slow so the per column shimmer is observable.
      if (marker === "ahmed") await new Promise((r) => setTimeout(r, 1600));
      return route.fulfill({ status: 200, contentType: "application/json", body });
    }
    if (url.pathname.startsWith("/_vercel")) return route.fulfill({ status: 200, contentType: "text/javascript", body: "" });
    if (url.port === "4191") return route.continue();
    if (/posthog|clarity|google|gstatic|doubleclick|vercel|fonts/.test(url.hostname)) return route.abort();
    if (href.startsWith(SUPA)) {
      if (url.pathname.includes("/auth/v1/user")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSION.user) });
      if (url.pathname.includes("/auth/v1/token")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSION) });
      if (url.pathname.includes("/rest/v1/")) {
        if (req.method() === "PATCH" && url.pathname.includes("applications")) {
          patchedIds.push(url.searchParams.get("id") || url.search);
          return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
        }
        if (req.method() !== "GET") return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
        return route.fulfill({ status: 200, contentType: "application/json", body: pgrest(url, req.headers().accept) });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    if (url.pathname.startsWith("/api/")) return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    return route.abort();
  });
}

const browser = await chromium.launch();

async function newPage({ width, height = 950 }) {
  const context = await browser.newContext({ viewport: { width, height } });
  await stubRoutes(context);
  await context.addInitScript(([key, session]) => {
    localStorage.setItem(key, JSON.stringify(session));
    localStorage.setItem("cvp_theme", "light");
  }, [`sb-${REF}-auth-token`, SESSION]);
  const page = await context.newPage();
  page.on("pageerror", (e) => { console.log("[pageerror]", e.message); failures += 1; });
  return { context, page };
}

const shot = (page, name) => page.screenshot({ path: join(OUT, `${name}.png`), fullPage: false });
const checkOf = (page, name) => page.locator(`input[aria-label='Select ${name}']`);

/* ── 1) Desktop: gating + full compare flow ───────────────────── */
{
  const { context, page } = await newPage({ width: 1366 });
  await page.goto("http://localhost:4191/employer/candidates", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  // Gating: 1 checked -> disabled; 2 -> enabled; 4 -> disabled + hint.
  await checkOf(page, "Priya Sharma").check();
  await page.waitForTimeout(400);
  const compareBtn = page.getByRole("button", { name: "Compare" });
  check(await compareBtn.isDisabled(), "1 selected: Compare disabled");
  await checkOf(page, "Ahmed Al Farsi").check();
  await page.waitForTimeout(300);
  check(await compareBtn.isEnabled(), "2 selected: Compare enabled");
  await checkOf(page, "Rahul Nair").check();
  await checkOf(page, "Fatima Khan").check();
  await page.waitForTimeout(300);
  check(await compareBtn.isDisabled(), "4 selected: Compare disabled");
  check(await page.getByText("compare up to 3 at a time").isVisible(), "4 selected: cap hint shown");
  await checkOf(page, "Fatima Khan").uncheck();
  await page.waitForTimeout(300);
  check(await compareBtn.isEnabled(), "3 selected: Compare enabled again");

  // Open compare.
  await compareBtn.click();
  await page.waitForTimeout(700);
  const panel = page.locator(".cc-panel");
  check(await panel.isVisible(), "compare panel opens");
  check(await panel.locator(".cc-head__sub").textContent().then((t) => t.includes("Senior Accountant") && t.includes("3 selected")), "header shows job + count");
  for (const label of ["Match score", "Verdict", "Strengths", "Gaps", "Matched keywords", "Missing keywords", "Experience", "Visa status", "Notice period", "Applied"]) {
    check(await panel.locator(".cc-label", { hasText: label }).count() === 1, `label rail has ${label}`);
  }

  // Per column loading: Ahmed slow -> shimmer visible while Priya scored.
  check(await panel.locator(".cc-shimmer").count() > 0, "slow column shows its own shimmer");
  check(await panel.locator(".cc-ribbon").count() === 0, "no Leading ribbon before all columns score");
  await shot(page, "desktop-loading");

  await page.waitForTimeout(2200); // Ahmed lands
  check(await panel.locator(".cc-ribbon", { hasText: "Leading" }).count() === 1, "Leading ribbon on exactly one column");
  check(await panel.locator(".cc-chip--top").count() === 1, "Top score chip on the leader");
  check(await panel.locator(".cc-behind", { hasText: "15 behind" }).isVisible(), "runner up shows 15 behind");
  check(await panel.locator(".cc-behind", { hasText: "41 behind" }).isVisible(), "third shows 41 behind");
  const verdictTexts = await panel.locator(".cc-verdict").allTextContents();
  check(verdictTexts.join("|") === "STRONG MATCH|MAYBE|WEAK MATCH" || verdictTexts.join("|").toLowerCase() === "strong match|maybe|weak match", `verdict chips use scoreBand labels (${verdictTexts.join(", ")})`);
  check(!verdictTexts.some((t) => /^pass$/i.test(t.trim())), "no verdict ever says Pass");

  // Legacy fallback: Rahul has no arrays -> Match/Gap lines render.
  check(await panel.locator(".cc-item", { hasText: "solid AP and AR fundamentals" }).isVisible(), "legacy verdict falls back to Match line strength");
  check(await panel.locator(".cc-item", { hasText: "no Gulf experience and IFRS is theoretical" }).isVisible(), "legacy verdict falls back to Gap line");

  // Stored fields.
  check(await panel.locator(".cc-tally", { hasText: "4 of 6" }).count() === 2, "matched tally 4 of 6 on two columns");
  check(await panel.locator(".cc-pill--none").count() >= 3, "Not provided pills for missing visa/notice/experience");
  check(await panel.locator(".cc-fact strong", { hasText: "12 years" }).isVisible(), "career span derived (2014 to now = 12 years)");
  check(await panel.locator(".cc-fact em", { hasText: "2 roles listed" }).isVisible(), "roles subline");

  // Dash scan on the panel.
  const panelText = await panel.innerText();
  check(!/[–—]|\s-\s|--/.test(panelText), "no dash characters in the compare panel");

  await shot(page, "desktop-compare");

  // Shortlist: real PATCH + done state.
  const firstShortlist = panel.locator(".cc-btn--primary").first();
  await firstShortlist.click();
  await page.waitForTimeout(700);
  check(patchedIds.length === 1, "Shortlist issued exactly one PATCH");
  check(await panel.locator(".cc-btn--primary", { hasText: "Shortlisted" }).count() === 1, "Shortlist flips to done state");

  // View CV opens the overlay above the panel.
  await panel.locator(".cc-btn", { hasText: "View CV" }).first().click();
  await page.waitForTimeout(800);
  check(await page.locator(".cvv-page, .cvv-filecard, [class*='cvv']").first().isVisible().catch(() => false), "View CV opens the CV viewer overlay");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(400);
  check(await panel.isVisible(), "compare panel still open under the viewer");
  await context.close();
}

/* ── 2) Phones: pinned label rail while columns scroll ────────── */
for (const width of [360, 393, 430]) {
  const { context, page } = await newPage({ width, height: 800 });
  await page.goto("http://localhost:4191/employer/candidates", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  for (const nm of ["Priya Sharma", "Ahmed Al Farsi", "Rahul Nair"]) {
    await checkOf(page, nm).check();
  }
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: "Compare" }).click();
  await page.waitForTimeout(2600);
  const panel = page.locator(".cc-panel");
  check(await panel.isVisible(), `phone ${width}px: panel opens`);

  const scroller = panel.locator(".cc-scroll");
  const label = panel.locator(".cc-label", { hasText: "Verdict" });
  const before = await label.boundingBox();
  await scroller.evaluate((el) => { el.scrollLeft = 200; });
  await page.waitForTimeout(300);
  const after = await label.boundingBox();
  check(before && after && Math.abs(before.x - after.x) < 2, `phone ${width}px: label rail pinned while columns scroll (x ${Math.round(before?.x)} to ${Math.round(after?.x)})`);
  const bodyOk = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
  check(bodyOk, `phone ${width}px: page itself has no horizontal overflow`);
  if (width === 393) await shot(page, "phone-393-compare");
  await context.close();
}

await browser.close();
server.close();
console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
