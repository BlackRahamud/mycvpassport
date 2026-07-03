/* Builder UX walkthrough — the five frictions, verified end to end.
   Fresh anon session → clean slate (incl. legacy-draft scrub) → one-click
   progress CTA opens the experience editor → preview stays visible and
   LIVE-updates while typing two bullet lines → bullets render → autosave
   indicator speaks → no template-dropdown ghost after Esc → dates hint.
   Usage: node scripts/verify-builder-ux.mjs <outDir>                    */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";
import { chromium } from "@playwright/test";

const OUT = process.argv[2] || "scripts/.screenshots/builder-ux";
mkdirSync(OUT, { recursive: true });

let failures = 0;
const check = (ok, label) => {
  console.log(`${ok ? "✓" : "✗ FAIL"} ${label}`);
  if (!ok) failures += 1;
};

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = join("./build", p);
  if (!existsSync(file) || statSync(file).isDirectory()) file = join("./build", "spa.html");
  try { res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" }); res.end(readFileSync(file)); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(4197, r));

const browser = await chromium.launch();
const shot = (page, name) => page.screenshot({ path: join(OUT, `${name}.png`) });

/* ── 1) fresh anon clean slate + legacy-draft scrub ───────────── */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://localhost:4197/builder", { waitUntil: "networkidle" });
  await page.waitForTimeout(2200);
  const text = await page.locator("body").innerText();
  check(!/English, Hindi/i.test(text), "fresh anon: no languages prefill anywhere");
  check(!/Dubai, UAE/.test(text), "fresh anon: no location prefill");
  await page.close();

  // stale draft written by an old build → scrubbed on read
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => {
    localStorage.setItem("cvp_cv_draft:new:default", JSON.stringify({
      version: 2,
      cv: { name: "", email: "", phone: "", linkedin: "", location: "Dubai, UAE", title: "", summary: "", nationality: "", visaStatus: "", dob: "", gender: "", maritalStatus: "", experience: [], education: [], skills: "", languages: "English, Hindi", certifications: [], technicalSkills: "", projects: "", volunteerWork: "", publications: "", builderExtraSectionIds: [], customFields: [], availability: "", drivingLicense: "", willingToRelocate: "", references: "References available upon request" },
      templateId: 1, resumeId: null, ownerId: null, updatedAt: Date.now(),
    }));
  });
  const page2 = await ctx.newPage();
  await page2.goto("http://localhost:4197/builder", { waitUntil: "networkidle" });
  await page2.waitForTimeout(2200);
  const text2 = await page2.locator("body").innerText();
  check(!/English, Hindi/i.test(text2), "stale legacy draft: languages prefill scrubbed on read");
  await ctx.close();
}

/* ── 2) the walkthrough: CTA → editor beside live preview → bullets ── */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://localhost:4197/builder", { waitUntil: "networkidle" });
  await page.waitForTimeout(2200);

  // fill contact
  await page.locator(".cvp-builder-desktop input:visible").first().fill("Aisha Verma");
  await page.waitForTimeout(300);

  // autosave indicator speaks after an edit
  await page.waitForTimeout(1200);
  const stripText = await page.locator(".cvp-builder-desktop").innerText();
  check(/Saving…|Saved just now|Saved/.test(stripText), "autosave indicator visible after editing");

  // one-click CTA: "Add experience →" opens the editor
  await page.getByRole("button", { name: /Add experience/ }).first().click();
  await page.waitForTimeout(900);
  const sheet = page.locator(".cvp-entry-sheet");
  check(await sheet.isVisible(), "progress CTA opens the experience editor in ONE click");

  // the editor is a side sheet — the live preview stays visible
  const sheetBox = await sheet.boundingBox();
  const previewBox = await page.locator(".dp-panel-holder").boundingBox();
  check(
    !!sheetBox && !!previewBox && sheetBox.x + sheetBox.width <= previewBox.x + 8,
    `editor leaves the preview visible (sheet right ${sheetBox && Math.round(sheetBox.x + sheetBox.width)}, preview left ${previewBox && Math.round(previewBox.x)})`,
  );
  await shot(page, "editor-beside-preview");

  // type role + two description lines → preview live-updates BEFORE save
  await sheet.getByLabel(/company/i).or(sheet.locator("input").first()).first().fill("Falcon Audit Group");
  const inputs = sheet.locator("input");
  await inputs.nth(1).fill("Senior Accountant");
  const desc = sheet.locator("textarea").first();
  await desc.fill("Closed monthly consolidation for twelve entities\nCut close cycle from nine to four days");
  await page.waitForTimeout(1400); // debounce + rebuild
  const liveBullets = await page.evaluate(() => {
    const slice = document.querySelector(".dp-panel-holder .dp-slice");
    const t = slice ? slice.textContent : "";
    return {
      hasFirst: t.includes("Closed monthly consolidation for twelve entities"),
      hasSecond: t.includes("Cut close cycle from nine to four days"),
      runOn: t.includes("twelve entities Cut close cycle"),
    };
  });
  check(liveBullets.hasFirst && liveBullets.hasSecond, "preview LIVE-updates with draft text while typing (before Save)");
  check(!liveBullets.runOn, "two Enter-separated lines stay two bullets (no run-on merge)");
  await shot(page, "live-typing-two-bullets");

  // save → bullets persist as separate lines with markers
  await sheet.getByRole("button", { name: /^Save/ }).first().click();
  await page.waitForTimeout(1200);
  const savedState = await page.evaluate(() => {
    const slice = document.querySelector(".dp-panel-holder .dp-slice");
    const t = slice ? slice.textContent : "";
    return {
      hasFirst: t.includes("Closed monthly consolidation for twelve entities"),
      hasSecond: t.includes("Cut close cycle from nine to four days"),
      runOn: t.includes("twelve entities Cut close cycle"),
      bulletGlyphs: (t.match(/•/g) || []).length,
    };
  });
  check(savedState.hasFirst && savedState.hasSecond && !savedState.runOn, "after Save: two separate bullets in the document");
  check(savedState.bulletGlyphs >= 2, `after Save: real bullet markers rendered (${savedState.bulletGlyphs})`);

  // dates hint chip on the dateless saved entry
  const hint = page.locator(".cvp-hint-chip", { hasText: /Add dates/ });
  check(await hint.first().isVisible().catch(() => false), "dateless entry shows the quiet 'Add dates' hint chip");
  await shot(page, "saved-entry-dates-hint");

  // template dropdown: no ghost after Esc (incl. Esc mid-entrance)
  for (const delay of [400, 60]) {
    await page.getByRole("button", { name: "CV template" }).click();
    await page.waitForTimeout(delay);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(450);
    const remnants = await page.locator("[role='listbox'][aria-label='CV templates']").count();
    check(remnants === 0, `template dropdown fully unmounts after Esc (${delay}ms open)`);
  }
  await shot(page, "after-esc-no-ghost");
  await page.close();
}

await browser.close();
server.close();
console.log(failures === 0 ? "\nALL BUILDER-UX CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
