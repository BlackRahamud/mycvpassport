/* Cover letter access reader — UI proof.
   Serves the PRODUCTION build with a stubbed backend and drives the real
   CoverLetterPage for two users who differ ONLY by
   profiles.cover_letter_credits:

     non buyer (0 credits) -> free template preview, locked, Preview badge
     buyer     (1 credit)  -> real generation, full letter, no lock

   Screenshots are READ by eye; the assertions below are on rendered text.

   Usage: node scripts/verify-cover-letter-ui.mjs [outDir] */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";
import { chromium } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
const SUPA = process.env.REACT_APP_SUPABASE_URL;
const REF = new URL(SUPA).hostname.split(".")[0];
const OUT = process.argv[2] || "scripts/.screenshots/cover-letter";
mkdirSync(OUT, { recursive: true });

let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failures += 1;
};

const UID = "22222222-2222-4222-8222-222222222222";
const SESSION = {
  access_token: "stub", refresh_token: "stub", token_type: "bearer",
  expires_in: 3600 * 24 * 30, expires_at: Math.floor(Date.now() / 1000) + 3600 * 24 * 30,
  user: { id: UID, aud: "authenticated", role: "authenticated", email: "buyer@example.com", app_metadata: {}, user_metadata: { full_name: "Junaid Khan" }, created_at: "2026-01-01T00:00:00Z" },
};

const CV_ROW = {
  id: "cv-1", user_id: UID, title: "My CV", updated_at: new Date().toISOString(),
  cv_data: {
    personal: { fullName: "Junaid Khan", jobTitle: "Operations Analyst" },
    name: "Junaid Khan", role: "Operations Analyst",
    summary: "Operations analyst with seven years in logistics and process improvement.",
    skills: "logistics, process improvement, sap, excel",
    experience: [{ title: "Operations Analyst", company: "Gulf Logistics", points: ["Cut dispatch errors by a third"] }],
  },
};

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".txt": "text/plain", ".xml": "text/xml", ".webp": "image/webp", ".woff2": "font/woff2" };
const server = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = join("./build", p);
  const ext = extname(p);
  if (!existsSync(file) || statSync(file).isDirectory()) {
    // Only route EXTENSIONLESS paths to the SPA shell. Falling back for
    // a missing .js would serve HTML with a javascript content-type,
    // which surfaces as "Unexpected token '<'" and hides the real 404.
    if (ext) {
      console.log(`[404] ${p}`);
      res.writeHead(404);
      return res.end();
    }
    file = join("./build", "spa.html");
  }
  try {
    res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
    res.end(readFileSync(file));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(4197, r));

async function stub(context, { credits }) {
  const seen = { aiCalled: false };
  await context.route("**/*", async (route) => {
    const req = route.request();
    const url = new URL(req.url());

    // The cover letter endpoint. A real deployment enforces credits here;
    // this stub only proves the CLIENT reaches it for a buyer and does
    // NOT for a non buyer. Server enforcement is proven separately by
    // scripts/verify-cover-letter-gate.mjs against the real handler.
    if (url.pathname === "/api/ai") {
      seen.aiCalled = true;
      return route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({
          coverLetterBody: "Generated paragraph one.\n\nGenerated paragraph two.\n\nGenerated paragraph three.",
          credits_remaining: 0,
        }),
      });
    }
    if (url.pathname.startsWith("/api/")) return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    if (url.port === "4197") return route.continue();
    if (/posthog|clarity|google|gstatic|doubleclick|vercel/.test(url.hostname)) return route.abort();

    if (req.url().startsWith(SUPA)) {
      if (url.pathname.includes("/auth/v1/user")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSION.user) });
      if (url.pathname.includes("/auth/v1/token")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(SESSION) });
      if (url.pathname.includes("/rest/v1/")) {
        const t = (n) => url.pathname.includes(`/rest/v1/${n}`);
        if (req.method() === "HEAD") return route.fulfill({ status: 200, headers: { "content-range": "0-0/0" }, body: "" });
        if (req.method() !== "GET" || url.pathname.includes("/rpc/")) return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
        if (t("profiles")) {
          const row = {
            id: UID, is_pro: false, plan: "FREE", features: null,
            pro_access_expires_at: null, download_credits: 0,
            cover_letter_credits: credits, full_name: "Junaid Khan",
          };
          // .single()/.maybeSingle() ask for an object, not an array.
          // Returning the wrong shape makes supabase-js error and the
          // app falls back to a default profile with no credits, which
          // silently looked like "the reader does not work".
          const wantsObject = String(req.headers()["accept"] || "").includes("vnd.pgrst.object+json");
          return route.fulfill({
            status: 200, contentType: "application/json",
            body: JSON.stringify(wantsObject ? row : [row]),
          });
        }
        if (t("cvs")) return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([CV_ROW]) });
        return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      }
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" });
    }
    return route.abort();
  });
  return seen;
}

async function run(label, credits) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 1100 }, timezoneId: "Asia/Dubai" });
  const seen = await stub(context, { credits });
  await context.addInitScript(([key, session]) => {
    localStorage.setItem(key, JSON.stringify(session));
    localStorage.setItem("cvp_theme", "dark");
  }, [`sb-${REF}-auth-token`, SESSION]);
  const page = await context.newPage();
  page.on("pageerror", (e) => { console.log("[pageerror]", e.message); failures += 1; });

  await page.goto("http://localhost:4197/cover-letter", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);

  // Fill the three validated fields, then generate.
  // Pick a CV source first — the generate button stays disabled until
  // sourceReady. "Describe yourself" needs no saved-CV selection.
  await page.locator("button", { hasText: "Describe yourself" }).first().click();
  await page.waitForTimeout(400);

  // getByPlaceholder takes a plain string, so placeholders containing
  // double quotes do not have to be escaped into a CSS selector.
  const fill = async (placeholder, value) => {
    const el = page.getByPlaceholder(placeholder, { exact: true }).first();
    if (await el.count()) await el.fill(value);
  };
  await fill("As it should appear on the letter", "Junaid Khan");
  await fill('e.g. "Cashier", "Sales Associate"', "Operations Analyst");
  await fill("Target job title", "Senior Operations Analyst");
  await fill('e.g. "customer service", "sales", "operations"', "process improvement");

  const btn = page.locator("button", { hasText: "Generate My Cover Letter" }).first();
  if (!(await btn.count())) {
    await page.screenshot({ path: join(OUT, `debug-${label}.png`), fullPage: true });
    console.log(`\n[debug] generate button absent for ${label}. Page text:\n`);
    console.log((await page.locator("body").innerText()).slice(0, 1500));
    console.log('\n[debug] buttons on page:', await page.locator("button").allInnerTexts());
    throw new Error("generate button not found");
  }
  await btn.click();
  // Paid path has a deliberate 5s minimum wait before the result renders.
  await page.waitForTimeout(credits > 0 ? 8000 : 1500);

  const body = await page.locator("body").innerText();
  await page.screenshot({ path: join(OUT, `${label}.png`), fullPage: true });
  await context.close();
  return { body, seen };
}

const browser = await chromium.launch();

console.log("=".repeat(70));
console.log("COVER LETTER READER — UI proof (identical users, credits differ)");
console.log("=".repeat(70));
console.log();

const nonBuyer = await run("1-non-buyer-locked", 0);
check(/Preview/.test(nonBuyer.body), "non buyer: letter renders as a locked Preview");
check(!nonBuyer.seen.aiCalled, "non buyer: no model call is made, no spend");
check(
  /Unlock|AED\s*10/i.test(nonBuyer.body),
  "non buyer: an unlock path is offered on screen",
);

const buyer = await run("2-buyer-unlocked", 1);
if (!buyer.seen.aiCalled) {
  console.log("\n[debug] buyer did not reach the endpoint. Page text:\n");
  console.log(buyer.body.slice(0, 1200));
  console.log("\n[debug] profile seen by client:", JSON.stringify(buyer.seen.profile));
}
check(buyer.seen.aiCalled, "buyer: the generation endpoint is reached");
check(/Generated paragraph one/.test(buyer.body), "buyer: the full generated letter is on screen");
check(!/Preview<\/span>/.test(buyer.body) && !/^Preview$/m.test(buyer.body), "buyer: no Preview lock badge");

await browser.close();
server.close();

console.log();
console.log("=".repeat(70));
console.log(failures === 0 ? "UI reader proof passed." : `${failures} check(s) failed.`);
console.log(`Screenshots: ${OUT}`);
process.exitCode = failures === 0 ? 0 : 1;
