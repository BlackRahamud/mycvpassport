/* Candidates tab verification harness (Option A redesign).
   Serves the PRODUCTION build with a stubbed backend, then drives:
   - honest cards: multi job "On 3 jobs · Furthest", single job stage chip,
     imported ink tag + pool tag, Not scored pill
   - Passed filter bucket + selection clears when a filter changes
   - the heart: per job staging on the profile, one menu per job, toast
     with undo, Passed through the shipped reject modal named per job
   - Add to job as a COPY for a pooled person: picker with counts +
     starting stage, pool note, verdict scoring pass fills the score,
     toast undo removes the copy
   - safe bulk bar: Message on WhatsApp / Compare / Add to job / Add to
     pool / Export / Clear, and NO stage mover
   - dash scans on every new surface; overflow audit at 360/393/430/1280
   Usage: node scripts/verify-candidates-tab.mjs <outDir> */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";
import { chromium } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
const SUPA = process.env.REACT_APP_SUPABASE_URL;
const REF = new URL(SUPA).hostname.split(".")[0];
const OUT = process.argv[2] || "scripts/.screenshots/candidates-tab";
mkdirSync(OUT, { recursive: true });

let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? "✓" : "✗ FAIL"} ${label}`);
  if (!ok) failures += 1;
};

/* ── fixtures ─────────────────────────────────────────────────── */
const HR_ID = "11111111-1111-4111-8111-111111111111";
const J = {
  cashier: { id: "10000000-0000-4000-8000-000000000001", title: "Cashier", location: "Al Barsha", market: "gulf", status: "active", kind: "active", description: "Front of house cashier for a busy retail floor.", skills: ["POS systems"], requirements: ["Cash handling"] },
  sales: { id: "10000000-0000-4000-8000-000000000002", title: "Sales Associate", location: "Deira City Centre", market: "gulf", status: "active", kind: "active", description: "Retail sales associate.", skills: [], requirements: [] },
  store: { id: "10000000-0000-4000-8000-000000000003", title: "Store Supervisor", location: "Al Barsha", market: "gulf", status: "active", kind: "active", description: "Supervise the store team.", skills: [], requirements: [] },
  pool: { id: "10000000-0000-4000-8000-000000000009", title: "Retail walk in, July", location: "", market: "gulf", status: "active", kind: "pool", description: "", skills: [], requirements: [] },
};
const JOBS = Object.values(J).map((j) => ({ ...j, hr_id: HR_ID, source: "hr_portal" }));

const verdict77 = {
  verdict: "MAYBE", score: 77,
  two_second_why: [
    "Match: solid retail floor experience with POS systems",
    "Corridor: already in Dubai, can start within a month",
    "Gap: limited supervisory exposure for the bigger roles",
  ],
  whatsapp_cta_template: "Hi, your retail profile stands out for our Cashier role. Are you open to a quick call?",
};

const app = (over) => ({
  candidate_id: null,
  candidate_email: null,
  candidate_phone: null,
  cv_snapshot: {},
  cv_file_path: null,
  ats_score: 0,
  score_source: null,
  source: "organic",
  status: "new",
  match_keywords: [],
  missing_keywords: [],
  ai_verdict: null,
  reject_reason: null,
  added_from: null,
  visa_status: "",
  applied_at: "2026-07-08T10:00:00Z",
  updated_at: "2026-07-08T10:00:00Z",
  hr_id: HR_ID,
  is_visible_to_hr: true,
  ...over,
});

const scored = (score) => ({ ats_score: score, score_source: "sonnet_verdict", ai_verdict: { ...verdict77, score, verdict: score >= 80 ? "STRONG FIT" : "MAYBE" } });

const APPS = [
  // Ayesha: three jobs at three stages
  app({ id: "aaaa0000-0000-4000-8000-000000000001", job_id: J.cashier.id, candidate_id: "ca000000-0000-4000-8000-000000000001", candidate_name: "Ayesha Noor", candidate_email: "ayesha.noor@example.com", candidate_phone: "+971500000001", status: "interviewed", ...scored(84), cv_snapshot: { desired_job: "Retail sales", location: "Bur Dubai", notice_period: "Immediate", skills: ["POS systems", "Visual merchandising", "Customer service"] }, visa_status: "Own visa", updated_at: "2026-07-09T10:00:00Z" }),
  app({ id: "aaaa0000-0000-4000-8000-000000000002", job_id: J.sales.id, candidate_id: "ca000000-0000-4000-8000-000000000001", candidate_name: "Ayesha Noor", candidate_email: "ayesha.noor@example.com", candidate_phone: "+971500000001", status: "shortlisted", ...scored(81), updated_at: "2026-07-05T10:00:00Z" }),
  app({ id: "aaaa0000-0000-4000-8000-000000000003", job_id: J.store.id, candidate_id: "ca000000-0000-4000-8000-000000000001", candidate_name: "Ayesha Noor", candidate_email: "ayesha.noor@example.com", candidate_phone: "+971500000001", status: "new", ...scored(72), applied_at: "2026-07-11T10:00:00Z", updated_at: "2026-07-11T10:00:00Z" }),
  // Hammad: one job, New
  app({ id: "aaaa0000-0000-4000-8000-000000000004", job_id: J.cashier.id, candidate_id: "ca000000-0000-4000-8000-000000000002", candidate_name: "Hammad Hassan", candidate_email: "hammad.h@example.com", candidate_phone: "+971500000002", status: "new", ...scored(88), cv_snapshot: { notice_period: "Immediate", skills: ["POS systems"] } }),
  // Priya: imported, pool only, never scored
  app({ id: "aaaa0000-0000-4000-8000-000000000005", job_id: J.pool.id, candidate_name: "Priya Sharma", candidate_email: "priya.sh@example.com", candidate_phone: "+971500000003", status: "new", source: "imported", applied_at: "2026-07-03T10:00:00Z", updated_at: "2026-07-03T10:00:00Z", cv_snapshot: { desired_job: "Retail sales", location: "Karama, Dubai", notice_period: "1 month", skills: ["POS systems", "Cash handling", "Customer service"] } }),
  // Faisal: one job, To interview
  app({ id: "aaaa0000-0000-4000-8000-000000000006", job_id: J.sales.id, candidate_id: "ca000000-0000-4000-8000-000000000004", candidate_name: "Faisal Khan", candidate_email: "faisal.k@example.com", candidate_phone: "+971500000004", status: "ready", ...scored(80) }),
  // Rohan: one job, Passed
  app({ id: "aaaa0000-0000-4000-8000-000000000007", job_id: J.sales.id, candidate_id: "ca000000-0000-4000-8000-000000000005", candidate_name: "Rohan Mehta", candidate_email: "rohan.m@example.com", candidate_phone: "+971500000005", status: "rejected", reject_reason: "salary_mismatch", ...scored(78) }),
  // Divya: one job plus a pool copy
  app({ id: "aaaa0000-0000-4000-8000-000000000008", job_id: J.cashier.id, candidate_id: "ca000000-0000-4000-8000-000000000006", candidate_name: "Divya Nair", candidate_email: "divya.n@example.com", candidate_phone: "+971500000006", status: "shortlisted", ...scored(82), cv_snapshot: { notice_period: "Immediate" } }),
  app({ id: "aaaa0000-0000-4000-8000-000000000009", job_id: J.pool.id, candidate_id: "ca000000-0000-4000-8000-000000000006", candidate_name: "Divya Nair", candidate_email: "divya.n@example.com", candidate_phone: "+971500000006", status: "new", added_from: "aaaa0000-0000-4000-8000-000000000008" }),
  // Obaid: one organic row (Cashier) plus a removable copy (Sales)
  app({ id: "aaaa0000-0000-4000-8000-000000000010", job_id: J.cashier.id, candidate_id: "ca000000-0000-4000-8000-000000000007", candidate_name: "Obaid M. Khan", candidate_email: "obaid.k@example.com", candidate_phone: "+971500000007", status: "shortlisted", ...scored(75), cv_snapshot: { notice_period: "Immediate" } }),
  app({ id: "aaaa0000-0000-4000-8000-000000000011", job_id: J.sales.id, candidate_id: "ca000000-0000-4000-8000-000000000007", candidate_name: "Obaid M. Khan", candidate_email: "obaid.k@example.com", candidate_phone: "+971500000007", status: "ready", ...scored(74), added_from: "aaaa0000-0000-4000-8000-000000000010" }),
];

/* ── static server ────────────────────────────────────────────── */
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
await new Promise((r) => server.listen(4189, r));

const SESSION = {
  access_token: "stub-access-token",
  refresh_token: "stub-refresh-token",
  token_type: "bearer",
  expires_in: 3600 * 24 * 30,
  expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 * 30,
  user: {
    id: HR_ID, aud: "authenticated", role: "authenticated",
    email: "recruiter@meridianlogistics.example",
    app_metadata: { provider: "email" },
    user_metadata: { full_name: "Meridian HR" },
    created_at: "2026-06-01T00:00:00Z",
  },
};

let rpcCounter = 0;
function pgrest(url, accept) {
  const path = url.pathname;
  const wantsObject = /vnd\.pgrst\.object/.test(accept || "");
  const t = (name) => path.includes(`/rest/v1/${name}`);
  let rows = [];
  if (t("profiles")) rows = [{ user_type: "recruiter", plan: "recruiter", full_name: "Meridian HR" }];
  else if (t("hr_profiles")) rows = [{ company_name: "Meridian Logistics", company_id: "55555555-5555-4555-8555-555555555555" }];
  else if (t("jobs")) rows = JOBS;
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
    /* /api/* is same-origin (port 4189), so it must be intercepted BEFORE
       the static-server continue — otherwise spa.html answers the AI call. */
    if (url.pathname.startsWith("/api/ai")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(verdict77) });
    }
    if (url.pathname.startsWith("/api/")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    if (url.port === "4189") return route.continue();
    if (/posthog|clarity|google|gstatic|doubleclick|vercel|fonts/.test(url.hostname)) return route.abort();
    if (href.startsWith(SUPA)) {
      if (url.pathname.includes("/auth/v1/user")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSION.user) });
      if (url.pathname.includes("/auth/v1/token")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSION) });
      if (url.pathname.includes("/rest/v1/rpc/add_application_to_job")) {
        rpcCounter += 1;
        let wantStatus = "new";
        try { wantStatus = JSON.parse(req.postData() || "{}").p_status || "new"; } catch { /* default */ }
        const id = `bbbb0000-0000-4000-8000-00000000000${rpcCounter}`;
        return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ added: true, id, job_id: "x", status: wantStatus }) });
      }
      if (url.pathname.includes("/rest/v1/")) {
        if (req.method() === "DELETE") {
          // .delete().select('id') expects the deleted rows back — echo the
          // ids the query filtered on.
          const ids = [...url.search.matchAll(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi)].map((m) => m[0]);
          return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(ids.map((id) => ({ id }))) });
        }
        if (req.method() === "PATCH" && url.pathname.includes("applications")) {
          // persistVerdict does .update().select().maybeSingle(); hand back
          // a stored verdict so the scoring pass resolves deterministically.
          return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ai_verdict: verdict77 }) });
        }
        if (req.method() !== "GET" || url.pathname.includes("/rpc/")) {
          return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
        }
        return route.fulfill({ status: 200, contentType: "application/json", body: pgrest(url, req.headers().accept) });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    return route.abort();
  });
}

async function auditOverflow(page, label) {
  const res = await page.evaluate(() => ({
    vw: document.documentElement.clientWidth,
    doc: document.documentElement.scrollWidth,
  }));
  check(res.doc <= res.vw + 1, `${label}: no horizontal overflow (scrollWidth ${res.doc} <= viewport ${res.vw})`);
}
async function dashScan(page, sel, label) {
  const txt = await page.evaluate((s) => {
    const el = document.querySelector(s);
    return el ? el.textContent : null;
  }, sel);
  if (txt === null) { check(false, `${label}: element ${sel} present for dash scan`); return; }
  check(!/[-–—]/.test(txt), `${label}: no dash characters`);
}

const browser = await chromium.launch();
async function newPage({ width }) {
  const context = await browser.newContext({ viewport: { width, height: 950 }, reducedMotion: "reduce" });
  await stubRoutes(context);
  await context.addInitScript(([key, session]) => {
    localStorage.setItem(key, JSON.stringify(session));
    localStorage.setItem("cvp_theme", "light");
  }, [`sb-${REF}-auth-token`, SESSION]);
  const page = await context.newPage();
  page.on("pageerror", (e) => { console.log("[pageerror]", e.message); failures += 1; });
  return { context, page };
}
const shot = (page, name) => page.screenshot({ path: join(OUT, `${name}.png`), fullPage: true });
const URL_CAND = "http://localhost:4189/employer/candidates";

/* ── 1) desktop: cards, filters, profile staging, reject, add to job ── */
{
  const { context, page } = await newPage({ width: 1280 });
  await page.goto(URL_CAND, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  check(await page.getByText("7 people across all your jobs").isVisible(), "desktop: seven people counted");

  /* honest multi job card */
  const ayeshaCard = page.locator(".cand-card", { hasText: "Ayesha Noor" });
  check(await ayeshaCard.getByText("On 3 jobs").isVisible(), "desktop: multi job card says On 3 jobs");
  check(await ayeshaCard.getByText("Furthest: Interviewed").isVisible(), "desktop: furthest stage labeled");
  check((await ayeshaCard.locator(".cand-stagechip").count()) === 0, "desktop: no single stage badge on a multi job person");

  /* single job card */
  const hammadCard = page.locator(".cand-card", { hasText: "Hammad Hassan" });
  check(await hammadCard.getByText("Cashier").isVisible(), "desktop: single job card shows the job");
  check(await hammadCard.locator(".cand-stagechip", { hasText: "New" }).isVisible(), "desktop: single job stage chip");

  /* imported + pooled person */
  const priyaCard = page.locator(".cand-card", { hasText: "Priya Sharma" });
  check(await priyaCard.getByText(/You imported this CV/).isVisible(), "desktop: imported ink tag with date");
  check(await priyaCard.getByText("In pool: Retail walk in, July").isVisible(), "desktop: pool tag");
  check(await priyaCard.getByText("Not scored").isVisible(), "desktop: honest Not scored pill");

  /* passed person keeps a home */
  const rohanCard = page.locator(".cand-card", { hasText: "Rohan Mehta" });
  check(await rohanCard.locator(".cand-stagechip", { hasText: "Passed" }).isVisible(), "desktop: Passed chip on card");

  await dashScan(page, ".cand-list", "desktop card list");
  await shot(page, "desktop-list");

  /* selection clears when a filter changes */
  await page.locator(".cand-rowwrap", { hasText: "Hammad Hassan" }).locator(".cand-check").click();
  await page.waitForTimeout(200);
  check(await page.getByText("1 selected").first().isVisible(), "desktop: person ticked");
  await page.locator(".cand-stagefilter-select button, .cand-stagefilter-select [role=button]").first().click().catch(() => {});
  await page.getByRole("option", { name: "Passed" }).click().catch(async () => {
    // Select fallback: open by aria label
    await page.getByLabel("Stage").click();
    await page.getByRole("option", { name: "Passed" }).click();
  });
  await page.waitForTimeout(400);
  check((await page.locator(".cand-card").count()) === 1, "desktop: Passed filter shows only Rohan");
  check((await page.locator(".cand-bulkbar").count()) === 0, "desktop: selection cleared when the filter changed");
  /* fresh load resets the filters for the rest of the flow */
  await page.goto(URL_CAND, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  /* profile: per job staging, the heart */
  await page.locator(".cand-card", { hasText: "Ayesha Noor" }).click();
  await page.waitForTimeout(500);
  check(await page.getByText("3 jobs, stage each one on purpose").isVisible(), "profile: On these jobs header");
  const rows = page.locator(".cand-jobrow");
  check((await rows.count()) === 3, "profile: three job rows");
  check((await rows.first().locator(".cand-jobrow__title").textContent()) === "Cashier", "profile: furthest job first (Cashier)");
  await dashScan(page, ".cand-detail", "profile");
  await shot(page, "desktop-profile-multi");

  /* stage menu: 7 options, Passed carries a note */
  await rows.first().locator(".cand-stagebtn").click();
  await page.waitForTimeout(250);
  check((await page.locator(".cand-stagemenu__item:not(.cand-stagemenu__item--remove)").count()) === 7, "profile: seven stage options");
  check(await page.getByText("Asks for a reason first").isVisible(), "profile: Passed option carries the note");
  await shot(page, "desktop-stage-menu");

  /* move Cashier only; toast + undo */
  await page.locator(".cand-stagemenu__item", { hasText: "Shortlist" }).first().click();
  await page.waitForTimeout(400);
  check(await page.getByText("Ayesha moved to Shortlist on Cashier. Their other jobs stay where they are.").isVisible(), "profile: per job toast");
  check((await rows.first().locator(".cand-stagebtn").textContent())?.includes("Shortlist"), "profile: Cashier row moved");
  check((await rows.nth(1).locator(".cand-stagebtn").textContent())?.includes("Shortlist"), "profile: Sales row untouched (already Shortlist)");
  await dashScan(page, ".cand-toast", "toast");
  await page.locator(".cand-toast button").click();
  await page.waitForTimeout(400);
  check((await page.locator(".cand-jobrow").first().locator(".cand-stagebtn").textContent())?.includes("Interviewed"), "profile: undo restored Interviewed");

  /* Passed opens the shipped reject modal, named per job */
  await page.locator(".cand-jobrow").first().locator(".cand-stagebtn").click();
  await page.locator(".cand-stagemenu__item--passed").click();
  await page.waitForTimeout(300);
  check(await page.getByText("Pass on Ayesha Noor for Cashier").isVisible(), "reject: modal named per job");
  check(await page.getByText("This only changes Cashier.").isVisible(), "reject: blast radius line");
  check(await page.getByRole("button", { name: "Pass on Cashier" }).isDisabled(), "reject: reason required");
  check((await page.locator(".rjm-reason").count()) === 7, "reject: seven reason codes");
  await dashScan(page, ".rjm-modal", "reject modal");
  await shot(page, "desktop-reject-modal");
  await page.getByRole("radio", { name: "Salary mismatch" }).click();
  await page.getByRole("button", { name: "Pass on Cashier" }).click();
  await page.waitForTimeout(400);
  check((await page.locator(".cand-jobrow", { hasText: "Cashier" }).locator(".cand-stagebtn").textContent())?.includes("Passed"), "reject: Cashier row shows Passed");
  await page.locator(".cand-toast button").click(); // undo, keep fixtures stable
  await page.waitForTimeout(400);

  /* Remove from job: only the copy row offers it; organic rows explain why not */
  await page.locator(".cand-card", { hasText: "Obaid M. Khan" }).click();
  await page.waitForTimeout(500);
  const obaidRows = page.locator(".cand-jobrow");
  check((await obaidRows.count()) === 2, "remove: Obaid is on two jobs");
  check((await obaidRows.first().locator(".cand-jobrow__title").textContent()) === "Sales Associate", "remove: copy row (To interview) sorts first");
  /* organic row: disabled item with the plain reason */
  await obaidRows.nth(1).locator(".cand-stagebtn").click();
  await page.waitForTimeout(250);
  check(await page.locator(".cand-stagemenu__item--remove").isDisabled(), "remove: organic row item disabled");
  check(await page.getByText("Applicants can be passed, not removed").isVisible(), "remove: organic row carries the reason");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  /* copy row: enabled, confirm, toast, undo re-adds at the same stage */
  await obaidRows.first().locator(".cand-stagebtn").click();
  await page.waitForTimeout(250);
  check(!(await page.locator(".cand-stagemenu__item--remove").isDisabled()), "remove: copy row item enabled");
  check(await page.getByText("Takes them off this job only").isVisible(), "remove: copy row item note");
  await dashScan(page, ".cand-stagemenu", "remove: stage menu");
  await page.locator(".cand-stagemenu__item--remove").click();
  await page.waitForTimeout(300);
  check(await page.getByText("Remove Obaid from Sales Associate?").isVisible(), "remove: confirm names person and job");
  check(await page.getByText(/This takes them off this job only/).isVisible(), "remove: confirm blast radius line");
  await dashScan(page, ".rjm-modal", "remove: confirm dialog");
  await shot(page, "desktop-remove-confirm");
  await page.getByRole("button", { name: "Remove", exact: true }).click();
  await page.waitForTimeout(500);
  check(await page.getByText("Removed Obaid from Sales Associate.").isVisible(), "remove: toast");
  check((await page.locator(".cand-jobrow").count()) === 1, "remove: only that job row went away");
  check((await page.locator(".cand-jobrow").first().locator(".cand-jobrow__title").textContent()) === "Cashier", "remove: organic Cashier row untouched");
  await page.locator(".cand-toast button").click(); // undo
  await page.waitForTimeout(600);
  check((await page.locator(".cand-jobrow").count()) === 2, "remove: undo re-added the copy");
  check((await page.locator(".cand-jobrow", { hasText: "Sales Associate" }).locator(".cand-stagebtn").textContent())?.includes("To interview"), "remove: undo restored the same stage");
  await shot(page, "desktop-remove-undone");

  /* pooled person: banner + Add to job as a copy with a scoring pass */
  await page.locator(".cand-card", { hasText: "Priya Sharma" }).click();
  await page.waitForTimeout(500);
  check(await page.getByText(/keep warm pool and is not on a job yet/).isVisible(), "pool profile: banner");
  check((await page.locator(".cand-jobrow").count()) === 0, "pool profile: no stage rows, a pool is not a pipeline");
  await shot(page, "desktop-pool-profile");
  await page.getByRole("button", { name: "Add to job" }).click();
  await page.waitForTimeout(300);
  check(await page.getByText("Add Priya to a job").isVisible(), "add: picker opens");
  check(await page.getByText("4 people on it").first().isVisible(), "add: job rows carry people counts");
  check(await page.getByText(/also stays in your Retail walk in, July pool/).isVisible(), "add: copy semantics note");
  await dashScan(page, ".rjm-modal", "add to job modal");
  await shot(page, "desktop-add-to-job");
  await page.getByRole("radio", { name: /Cashier/ }).click();
  await page.getByRole("button", { name: "Add to Cashier" }).click();
  await page.waitForTimeout(600);
  check(await page.getByText("Priya added to Cashier, starting at New. They stay in your pool too.").isVisible(), "add: honest toast");
  check(await page.getByText("Added by you just now").isVisible(), "add: new job row appears");
  /* the verdict scoring pass fills the number, never left Not scored */
  await page.waitForTimeout(1500);
  check(await page.locator(".cand-jobrow").getByText("77/100").isVisible(), "add: scoring pass wrote a real number");
  await shot(page, "desktop-added-scored");
  /* undo removes the copy, the pool row stays */
  await page.locator(".cand-toast button").click();
  await page.waitForTimeout(500);
  check((await page.locator(".cand-jobrow").count()) === 0, "add: undo removed the copy");
  check(await page.getByText("In pool: Retail walk in, July").first().isVisible(), "add: pool membership survived throughout");

  /* safe bulk bar */
  await page.locator(".cand-rowwrap", { hasText: "Hammad Hassan" }).locator(".cand-check").click();
  await page.locator(".cand-rowwrap", { hasText: "Faisal Khan" }).locator(".cand-check").click();
  await page.waitForTimeout(300);
  check(await page.getByRole("button", { name: "Message on WhatsApp" }).isVisible(), "bulk: WhatsApp action");
  check(await page.getByRole("button", { name: "Compare" }).isVisible(), "bulk: Compare");
  check(await page.getByRole("button", { name: "+ Add to job" }).isVisible(), "bulk: Add to job");
  check(await page.getByRole("button", { name: "Add to pool" }).isVisible(), "bulk: Add to pool");
  check(await page.getByRole("button", { name: "Export" }).isVisible(), "bulk: Export");
  check((await page.getByText(/Move newest/).count()) === 0, "bulk: NO stage mover on this tab");
  await dashScan(page, ".cand-bulkbar", "bulk bar");
  await shot(page, "desktop-bulk-bar");

  /* bulk add to pool */
  await page.getByRole("button", { name: "Add to pool" }).click();
  await page.waitForTimeout(300);
  check(await page.getByText("Add 2 people to a pool").isVisible(), "pool: bulk modal");
  check(await page.getByText("New pool").isVisible(), "pool: inline create option");
  await page.getByRole("radio", { name: /Retail walk in, July/ }).click();
  await page.getByRole("button", { name: "Add to pool" }).last().click();
  await page.waitForTimeout(600);
  check(await page.getByText("2 people added to Retail walk in, July.").isVisible(), "pool: bulk toast");

  await auditOverflow(page, "desktop 1280");
  await context.close();
}

/* ── 2) mobile widths ─────────────────────────────────────────── */
for (const width of [360, 393, 430]) {
  const { context, page } = await newPage({ width });
  await page.goto(URL_CAND, { waitUntil: "networkidle" });
  await page.waitForTimeout(800);

  check(await page.locator(".cand-stagechips").isVisible(), `mobile ${width}: stage chips row`);
  check((await page.locator(".cand-stagefilter-select").isVisible().catch(() => false)) === false, `mobile ${width}: stage select hidden`);
  await page.locator(".cand-stagechips__chip", { hasText: "Passed" }).click();
  await page.waitForTimeout(400);
  check((await page.locator(".cand-card").count()) === 1, `mobile ${width}: Passed chip filters`);
  await page.locator(".cand-stagechips__chip", { hasText: "Any stage" }).click();
  await page.waitForTimeout(400);

  await auditOverflow(page, `mobile ${width} list`);
  await shot(page, `mobile-${width}-list`);

  /* profile stacks; stage control stays a 44px target */
  await page.locator(".cand-card", { hasText: "Ayesha Noor" }).click();
  await page.waitForTimeout(500);
  const btn = page.locator(".cand-jobrow").first().locator(".cand-stagebtn");
  const box = await btn.boundingBox();
  check(!!box && box.height >= 44, `mobile ${width}: stage control is a 44px target (${box ? Math.round(box.height) : "none"}px)`);
  await auditOverflow(page, `mobile ${width} profile`);
  await dashScan(page, ".cand-detail", `mobile ${width} profile`);
  await shot(page, `mobile-${width}-profile`);

  if (width === 393) {
    /* Add to job becomes a bottom sheet */
    await page.locator(".cand-detail__back").click();
    await page.waitForTimeout(300);
    await page.locator(".cand-card", { hasText: "Priya Sharma" }).click();
    await page.waitForTimeout(400);
    await page.getByRole("button", { name: "Add to job" }).click();
    await page.waitForTimeout(300);
    check(await page.locator(".rjm-modal--sheet").isVisible(), "mobile 393: Add to job is a bottom sheet");
    await auditOverflow(page, "mobile 393 with sheet");
    await shot(page, "mobile-393-add-sheet");
  }
  await context.close();
}

await browser.close();
server.close();
console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
