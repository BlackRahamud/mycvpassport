/* Job Match real-insert harness (trust bug fix). Serves the PRODUCTION
   build with a stubbed backend and a seeded draft CV, then:
   - analyses a banking JD against a CV missing those keywords
   - taps a missing chip and asserts the skill REALLY lands in the CV
     (visible in the builder preview, not just the chip column)
   - asserts the add notice, then taps again and asserts real removal
   - asserts the honest copy (no "adds them for real" promise, button
     says Edit my CV) and scans new strings for dash characters
   Usage: node scripts/verify-jobmatch-insert.mjs <outDir> */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";
import { chromium } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
const SUPA = process.env.REACT_APP_SUPABASE_URL;
const REF = new URL(SUPA).hostname.split(".")[0];
const OUT = process.argv[2] || "scripts/.screenshots/jobmatch-insert";
mkdirSync(OUT, { recursive: true });

let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? "✓" : "✗ FAIL"} ${label}`);
  if (!ok) failures += 1;
};

const USER_ID = "11111111-1111-4111-8111-111111111111";
const CV = {
  name: "Priya Nair", email: "priya@example.com", phone: "+971 55 123 9876",
  location: "Abu Dhabi, UAE", title: "Banking Professional",
  summary: "Banking professional with UAE retail experience.",
  skills: "Excel, Customer Service",
  languages: "English",
  experience: [{ company: "Falcon Bank", role: "Officer", period: "2021 to Present", points: "Handled branch operations", startDate: "2021", endDate: "", present: true }],
  education: [{ school: "University of Kerala", degree: "B.Com", year: "2016" }],
  certifications: [], technicalSkills: "", projects: "", volunteerWork: "", publications: "",
  builderExtraSectionIds: [], customFields: [], availability: "", references: "", willingToRelocate: "",
};
const JD = "We are hiring a retail banking officer in Dubai. The role needs strong kyc and aml knowledge, compliance discipline, credit analysis skills and risk assessment experience. Customer onboarding and loan processing exposure preferred.";

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
await new Promise((r) => server.listen(4188, r));

const SESSION = {
  access_token: "stub-access-token", refresh_token: "stub-refresh-token", token_type: "bearer",
  expires_in: 3600 * 24 * 30, expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 * 30,
  user: {
    id: USER_ID, aud: "authenticated", role: "authenticated",
    email: "priya@example.com",
    app_metadata: { provider: "email" }, user_metadata: { full_name: "Priya Nair" },
    created_at: "2026-06-01T00:00:00Z",
  },
};

async function stubRoutes(context) {
  await context.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const href = req.url();
    if (url.pathname.startsWith("/api/job-match-suggestion")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ additionalMissingKeywords: [], suggestion: "Add two or three high priority missing terms naturally in your summary and latest role bullets." }) });
    }
    // Analytics script has no build file; serving spa.html for it throws.
    if (url.pathname.startsWith("/_vercel")) {
      return route.fulfill({ status: 200, contentType: "text/javascript", body: "" });
    }
    if (url.port === "4188") return route.continue();
    if (/posthog|clarity|google|gstatic|doubleclick|vercel|fonts/.test(url.hostname)) return route.abort();
    if (href.startsWith(SUPA)) {
      if (url.pathname.includes("/auth/v1/user")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSION.user) });
      if (url.pathname.includes("/auth/v1/token")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSION) });
      if (url.pathname.includes("/rest/v1/")) {
        const wantsObject = /vnd\.pgrst\.object/.test(req.headers().accept || "");
        let rows = [];
        if (url.pathname.includes("profiles")) rows = [{ id: USER_ID, user_type: "candidate", is_pro: true, features: { activeHunter: true }, full_name: "Priya Nair", plan: "active_hunter" }];
        else if (url.pathname.includes("resumes")) rows = [];
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
const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
await stubRoutes(context);
await context.addInitScript(([key, session, cv, ownerId]) => {
  localStorage.setItem(key, JSON.stringify(session));
  // Drafts are owner-stamped (shared-machine privacy): ownerId must match
  // the signed-in user or the builder ignores the draft.
  localStorage.setItem("cvp_cv_draft:new:default", JSON.stringify({ version: 2, cv, templateId: 1, resumeId: null, ownerId, updatedAt: Date.now() }));
}, [`sb-${REF}-auth-token`, SESSION, CV, USER_ID]);
const page = await context.newPage();
page.on("pageerror", (e) => { console.log("[pageerror]", e.message); failures += 1; });

await page.goto("http://localhost:4188/builder", { waitUntil: "networkidle" });
await page.waitForTimeout(2500);
check((await page.locator("body").innerText()).includes("Priya Nair"), "seeded draft CV loaded (not the empty placeholder)");

/* 1. Open the Job Match tab and analyse. Both the desktop and mobile
      JobMatch instances mount (CSS hides one) — scope every lookup to
      the first so state stays on one instance. */
await page.getByRole("button", { name: /Job Match/i }).first().click();
await page.waitForTimeout(800);
const jm = page.locator(".cvp-jobmatch-root").first();
const ta = jm.locator("textarea[data-jobmatch-textarea]");
check(await ta.count() === 1, "Job Match tab open, textarea present");
await ta.fill(JD);
await jm.getByRole("button", { name: "Analyse match" }).click();
await page.waitForTimeout(2500);
check(await jm.locator("[data-jobmatch-result]").count() === 1, "analysis result rendered (pro access stub worked)");

/* 2. Honest copy: no false promise, honest button */
const rootText = await jm.innerText();
check(!/adds them for real/i.test(rootText), "old false promise copy is gone");
check(/tap a keyword you actually have to add it to your CV skills/i.test(rootText), "new honest helper copy present");
check(await jm.getByRole("button", { name: "Edit my CV" }).isVisible(), "button says Edit my CV (no fake fix)");
check(await jm.getByRole("button", { name: "Fix my CV" }).count() === 0, "Fix my CV label removed");
const newStrings = rootText.match(/tap a keyword[^\n]*|Edit my CV/g) || [];
check(newStrings.every((s) => !/[–—]|\s-\s|--/.test(s)), "no dash characters in new strings");

/* 3. Tap a missing chip -> REAL insert lands in CV preview */
const missChip = jm.locator("button[title='add to your CV skills']").first();
check(await missChip.isVisible(), "missing chips are tappable with honest tooltip");
const kw = (await missChip.innerText()).trim().toLowerCase();
console.log(`   (tapping "${kw}")`);
await missChip.click();
await page.waitForTimeout(900);
check((await jm.innerText()).includes(`${kw} added to your CV skills`), "add feedback notice shown");
// The builder preview renders resume.skills — the keyword must now be IN
// the CV. The sheet layout pass re-renders asynchronously, so give it a beat.
await page.waitForTimeout(1500);
const previewText1 = (await page.locator(".cvp-builder-preview, .dp-panel-holder").first().innerText().catch(() => "")) || (await page.locator("body").innerText());
check(previewText1.toLowerCase().includes(kw), `"${kw}" is really in the CV preview`);
await page.screenshot({ path: join(OUT, "after-add.png"), fullPage: false });

/* 4. Tap the green chip -> REAL removal */
const addedChip = jm.locator("button[title='remove from your CV skills']").first();
check(await addedChip.isVisible(), "added chip offers removal (undo)");
await addedChip.click();
await page.waitForTimeout(900);
check((await jm.innerText()).includes(`${kw} removed from your CV skills`), "remove feedback notice shown");
await page.waitForTimeout(1500);
const previewText2 = (await page.locator(".cvp-builder-preview, .dp-panel-holder").first().innerText().catch(() => "")) || (await page.locator("body").innerText());
check(!previewText2.toLowerCase().includes(kw), `"${kw}" is really gone from the CV preview`);

/* 5. Content tab shows the skill after re-adding (round trip through the builder) */
await jm.locator("button[title='add to your CV skills']").first().click();
await page.waitForTimeout(600);
await jm.getByRole("button", { name: "Edit my CV" }).click();
await page.waitForTimeout(900);
const bodyText = await page.locator("body").innerText();
check(bodyText.toLowerCase().includes(kw), "Content tab reflects the inserted skill");
await page.screenshot({ path: join(OUT, "content-after-add.png"), fullPage: false });

await browser.close();
server.close();
console.log(failures === 0 ? "\nALL CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
