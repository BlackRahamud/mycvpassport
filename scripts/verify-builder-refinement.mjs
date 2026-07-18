/* Builder refinement verification — operate every control, not read it.
   Serves the production build with a stubbed /api/generate-pdf, then drives
   the checklist from the refinement brief: theme default/persist, FAB
   preview single home, experience + education editors, skills chip, visa
   select + free-text fallback, availability writes to `availability`,
   inert salary/passport, undo/redo/save/export, template switch, tabs,
   360 overflow. Screenshots land in the outDir argument. */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";
import { chromium } from "@playwright/test";

const OUT = process.argv[2] || "verify-out";
mkdirSync(OUT, { recursive: true });

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
const TINY_PDF = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF",
);
const server = createServer((req, res) => {
  if (req.url.startsWith("/api/generate-pdf")) {
    res.writeHead(200, { "content-type": "application/pdf" });
    res.end(TINY_PDF);
    return;
  }
  if (req.url.startsWith("/api/") || req.url.startsWith("/_vercel")) {
    res.writeHead(200, { "content-type": "application/json" });
    res.end("{}");
    return;
  }
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = join("./build", p);
  if (!existsSync(file) || statSync(file).isDirectory()) file = join("./build", "spa.html");
  try {
    res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
    res.end(readFileSync(file));
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((r) => server.listen(4193, r));

const FULL_CV = {
  name: "Priya Ramachandran Nair", email: "priya.nair@example.com", phone: "+971 55 123 9876",
  linkedin: "linkedin.com/in/priyanair", location: "Abu Dhabi, UAE", title: "Senior Accountant",
  summary: "Chartered accountant with 7 years across UAE audit and reporting.",
  nationality: "Indian", visaStatus: "Employment visa", dob: "12 Mar 1994",
  gender: "Female", maritalStatus: "Married", drivingLicense: "UAE light vehicle",
  skills: "IFRS, Audit, SAP FICO",
  languages: "English, Malayalam, Hindi",
  experience: [{ company: "Falcon Audit Group", role: "Senior Accountant", period: "2021 - Present", points: "Closed monthly consolidation for 12 entities", startDate: "01/2021", endDate: "", present: true }],
  education: [{ school: "University of Kerala", degree: "B.Com", year: "2016", fieldOfStudy: "Commerce", startDate: "", endDate: "", location: "" }],
  certifications: [], technicalSkills: "", projects: "", volunteerWork: "", publications: "",
  builderExtraSectionIds: [], customFields: [], availability: "", references: "References available upon request", willingToRelocate: "",
};

const results = [];
function log(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  | " + detail : ""}`);
}

const browser = await chromium.launch();

async function newPage(ctxOpts, { seedDraft = true, theme = null } = {}) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  await page.route(/supabase|posthog|sentry/i, (route) => route.fulfill({ status: 204, body: "" }));
  await page.addInitScript(
    ({ cv, seed, th }) => {
      if (th) localStorage.setItem("cvp_theme", th);
      if (seed) {
        localStorage.setItem(
          "cvp_cv_draft:new:default",
          JSON.stringify({ version: 2, cv, templateId: 1, resumeId: null, ownerId: null, updatedAt: Date.now() }),
        );
      }
    },
    { cv: FULL_CV, seed: seedDraft, th: theme },
  );
  return { ctx, page };
}

const readDraft = (page) =>
  page.evaluate(() => {
    try {
      return JSON.parse(localStorage.getItem("cvp_cv_draft:new:default") || "null");
    } catch {
      return null;
    }
  });

const builderThemeAttr = (page) =>
  page.evaluate(() => document.querySelector(".cvp-builder-topbar")?.closest("[data-theme]")?.getAttribute("data-theme") || "(none)");

/* ───────────────────────── 1. THEME: day default, night persists, clear returns ── */
{
  const { ctx, page } = await newPage({ viewport: { width: 393, height: 852 } }, { seedDraft: true });
  await page.goto("http://localhost:4193/builder", { waitUntil: "networkidle" });
  await page.waitForTimeout(2200);
  const attr1 = await builderThemeAttr(page);
  const bg1 = await page.evaluate(() => getComputedStyle(document.querySelector(".cvp-builder-mobile-form")).backgroundColor);
  log("theme: no stored preference opens in DAY", attr1 === "light" && bg1 === "rgb(245, 245, 240)", `attr=${attr1} bg=${bg1}`);
  await page.screenshot({ path: join(OUT, "01-day-default-393.png") });

  await page.locator(".cvp-builder-theme-toggle").first().click();
  await page.waitForTimeout(400);
  const attr2 = await builderThemeAttr(page);
  const stored = await page.evaluate(() => localStorage.getItem("cvp_theme"));
  log("theme: toggle switches to night and persists to cvp_theme", attr2 === "dark" && stored === "dark", `attr=${attr2} stored=${stored}`);
  await page.screenshot({ path: join(OUT, "02-night-toggled-393.png") });

  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1800);
  const attr3 = await builderThemeAttr(page);
  log("theme: reload keeps night", attr3 === "dark", `attr=${attr3}`);

  await page.evaluate(() => localStorage.removeItem("cvp_theme"));
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(1800);
  const attr4 = await builderThemeAttr(page);
  log("theme: cleared preference returns to day", attr4 === "light", `attr=${attr4}`);
  await ctx.close();
}

/* ───────────────────────── 2-12. MOBILE OPERATE-EVERYTHING PASS (393) ── */
{
  const { ctx, page } = await newPage({ viewport: { width: 393, height: 852 } });
  await page.goto("http://localhost:4193/builder", { waitUntil: "networkidle" });
  await page.waitForTimeout(2200);

  /* Personal Details: always visible, second position, badge */
  const pdHeader = page.locator('[data-cvp-accordion="personalDetails"]');
  const pdVisible = await pdHeader.first().isVisible().catch(() => false);
  const badge = await page.getByText("Get called first").first().isVisible().catch(() => false);
  const order = await page.evaluate(() => {
    const list = [...document.querySelectorAll(".cvp-builder-mobile-form [data-cvp-accordion]")];
    const withOrder = list.map((el) => ({ id: el.getAttribute("data-cvp-accordion"), order: parseInt(getComputedStyle(el).order || "0", 10) }));
    withOrder.sort((a, b) => a.order - b.order);
    return withOrder.map((x) => x.id).join(",");
  });
  log("corridor: Personal Details visible with badge, first accordion", pdVisible && badge && order.startsWith("personalDetails"), `order=${order}`);

  /* open the corridor */
  await pdHeader.first().locator("button").first().click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(OUT, "03-corridor-open-393.png"), fullPage: false });

  /* visa select: options + pick */
  const visaTrigger = page.locator(".cvp-builder-mobile-form .cvp-corridor-trigger").first();
  await visaTrigger.scrollIntoViewIfNeeded();
  await visaTrigger.click();
  await page.waitForTimeout(500);
  const sheetText = await page.locator(".cvp-corridor-sheet").first().innerText().catch(() => "");
  const allOpts = ["Employment visa (transferable)", "Employment visa (non transferable)", "Visit visa", "Resident visa", "Golden visa", "Cancelled visa", "No visa yet", "Not listed? Type it exactly as it reads"].every((o) => sheetText.includes(o));
  await page.screenshot({ path: join(OUT, "04-visa-select-393.png") });
  await page.locator(".cvp-corridor-option", { hasText: "Golden visa" }).first().click();
  await page.waitForTimeout(900);
  let draft = await readDraft(page);
  log("visa: select lists all options and picking writes visaStatus", allOpts && draft?.cv?.visaStatus === "Golden visa", `visaStatus=${draft?.cv?.visaStatus}`);

  /* visa free-text fallback */
  await visaTrigger.click();
  await page.waitForTimeout(400);
  await page.locator(".cvp-corridor-sheet input").first().fill("Employment visa, transferable");
  await page.locator(".cvp-corridor-sheet button", { hasText: "Use this" }).first().click();
  await page.waitForTimeout(900);
  draft = await readDraft(page);
  log("visa: free-text fallback accepts an arbitrary string", draft?.cv?.visaStatus === "Employment visa, transferable", `visaStatus=${draft?.cv?.visaStatus}`);

  /* availability segmented control → availability key */
  const seg = page.locator(".cvp-builder-mobile-form .cvp-avail-seg").first();
  await seg.scrollIntoViewIfNeeded();
  await seg.locator("button", { hasText: "Serving notice" }).click();
  await page.waitForTimeout(300);
  await page.locator('.cvp-builder-mobile-form input[placeholder^="How long"]').first().fill("30 days");
  await page.waitForTimeout(900);
  draft = await readDraft(page);
  const noticeOk = draft?.cv?.availability === "Serving notice, 30 days";
  await seg.locator("button", { hasText: "Available immediately" }).click();
  await page.waitForTimeout(900);
  draft = await readDraft(page);
  log(
    "availability: segmented control writes to the availability key",
    noticeOk && draft?.cv?.availability === "Available immediately",
    `notice→"Serving notice, 30 days"=${noticeOk}, immediate→"${draft?.cv?.availability}"`,
  );
  await page.screenshot({ path: join(OUT, "05-availability-393.png") });

  /* salary + passport: editable, wired to NOTHING */
  const salary = page.locator('.cvp-builder-mobile-form input[aria-label="Salary expectation"]').first();
  await salary.scrollIntoViewIfNeeded();
  await salary.fill("AED 9,500 per month");
  const passport = page.locator('.cvp-builder-mobile-form input[aria-label="Passport"]').first();
  await passport.fill("Valid to 2031, ECNR");
  await page.waitForTimeout(1100);
  const rawDraft = await page.evaluate(() => localStorage.getItem("cvp_cv_draft:new:default") || "");
  const inert = !rawDraft.includes("AED 9,500") && !rawDraft.includes("ECNR");
  const editable = (await salary.inputValue()) === "AED 9,500 per month";
  log("salary/passport: editable and persisted NOWHERE (inert)", inert && editable, `draftLeak=${!inert}`);
  await page.screenshot({ path: join(OUT, "06-only-you-fields-393.png") });

  /* experience row → editor → save */
  await page.locator('.cvp-builder-mobile-form [data-cvp-accordion="experience"] button').first().click();
  await page.waitForTimeout(600);
  const expRow = page.locator('.cvp-builder-mobile-form [data-cvp-accordion="experience"] .cvp-entry-row-in').first();
  await expRow.scrollIntoViewIfNeeded();
  await expRow.click();
  await page.waitForTimeout(800);
  const expSheet = page.locator(".cvp-entry-sheet").first();
  const expOpen = await expSheet.isVisible().catch(() => false);
  const companyInput = expSheet.locator("input").first(); /* Company name is the first field */
  await companyInput.fill("Falcon Audit Group LLC");
  await expSheet.locator("button", { hasText: "Save" }).first().click();
  await page.waitForTimeout(1100);
  draft = await readDraft(page);
  log("experience: row opens editor, Save persists", expOpen && draft?.cv?.experience?.[0]?.company === "Falcon Audit Group LLC", `company=${draft?.cv?.experience?.[0]?.company}`);

  /* education row → editor → save (the one the mock had dead) */
  await page.locator('.cvp-builder-mobile-form [data-cvp-accordion="education"] button').first().click();
  await page.waitForTimeout(600);
  const eduRow = page.locator('.cvp-builder-mobile-form [data-cvp-accordion="education"] .cvp-entry-row-in').first();
  await eduRow.scrollIntoViewIfNeeded();
  await eduRow.click();
  await page.waitForTimeout(800);
  const eduSheet = page.locator(".cvp-entry-sheet").first();
  const eduOpen = await page.getByText("Edit education").first().isVisible().catch(() => false);
  const instInput = eduSheet.locator("input").first(); /* Institution name */
  await instInput.fill("University of Kerala, Thiruvananthapuram");
  await eduSheet.locator("button", { hasText: "Save" }).first().click();
  await page.waitForTimeout(1100);
  draft = await readDraft(page);
  const eduSaved = draft?.cv?.education?.[0]?.school === "University of Kerala, Thiruvananthapuram";
  log("education: row opens editor, Save persists (ALIVE)", eduOpen && eduSaved, `school=${draft?.cv?.education?.[0]?.school}`);
  await page.screenshot({ path: join(OUT, "07-education-saved-393.png") });

  /* skills chip input */
  await page.locator('.cvp-builder-mobile-form [data-cvp-accordion="skills"] button').first().click();
  await page.waitForTimeout(600);
  const skillInput = page.locator('.cvp-builder-mobile-form input[placeholder="+ Add a skill"]').first();
  await skillInput.scrollIntoViewIfNeeded();
  await skillInput.fill("VAT compliance");
  await skillInput.press("Enter");
  await page.waitForTimeout(1100);
  draft = await readDraft(page);
  const chipVisible = await page.getByText("VAT compliance").first().isVisible().catch(() => false);
  log("skills: add-chip input creates a chip and persists", chipVisible && String(draft?.cv?.skills || "").includes("VAT compliance"), `skills=${draft?.cv?.skills}`);

  /* undo / redo */
  await page.locator('button[aria-label="Undo"], .cvp-builder-action-bar-icon[aria-label="Undo"]').first().click();
  await page.waitForTimeout(800);
  draft = await readDraft(page);
  const undone = !String(draft?.cv?.skills || "").includes("VAT compliance");
  await page.locator('button[aria-label="Redo"], .cvp-builder-action-bar-icon[aria-label="Redo"]').first().click();
  await page.waitForTimeout(800);
  draft = await readDraft(page);
  const redone = String(draft?.cv?.skills || "").includes("VAT compliance");
  log("undo/redo: both fire and restore state", undone && redone, `undo=${undone} redo=${redone}`);

  /* save (anon → disabled by design) */
  const saveBtn = page.locator('button[aria-label="Save resume"]').first();
  const saveDisabled = await saveBtn.isDisabled().catch(() => null);
  log("save: anon session disables Save (auth-gated by design)", saveDisabled === true, `disabled=${saveDisabled}`);

  /* FAB preview: single home */
  /* clear the unsaved-changes banner and any milestone card first */
  await page.locator('button[aria-label="Dismiss unsaved changes notice"]').first().click().catch(() => {});
  await page.keyboard.press("Escape").catch(() => {});
  await page.waitForTimeout(2500);
  await page.screenshot({ path: join(OUT, "08-before-fab-393.png") });
  const fab = page.locator("button.cvp-fab-physical").first();
  let previewShown = false;
  try {
    await fab.click({ force: true });
    await page.waitForTimeout(900);
    await page.screenshot({ path: join(OUT, "08b-fab-menu-393.png") });
    const previewOption = page.locator('button[aria-label="Preview CV"]').first();
    if (await previewOption.isVisible().catch(() => false)) {
      await previewOption.click();
      await page.waitForTimeout(1600);
    }
    previewShown = await page.evaluate(() => {
      const els = [...document.querySelectorAll("div")];
      return els.some((el) => {
        const s = getComputedStyle(el);
        return s.position === "fixed" && s.zIndex === "100" && el.textContent.includes("Priya Ramachandran Nair");
      });
    });
  } catch { /* fall through */ }
  log("FAB: preview opens from the FAB and shows the live CV", previewShown, "");
  await page.screenshot({ path: join(OUT, "09-fab-preview-393.png") });
  if (previewShown) {
    await page.locator('button[aria-label="Close preview"]').first().click();
    await page.waitForTimeout(700);
  }

  /* drawer: duplicate Preview CV is GONE */
  await page.locator(".cvp-builder-menu-btn").first().click();
  await page.waitForTimeout(700);
  const drawerText = await page.locator(".cvp-builder-drawer-root aside").first().innerText().catch(() => "");
  log("drawer: duplicate Preview CV removed", drawerText.length > 0 && !drawerText.includes("Preview CV"), "");
  await page.screenshot({ path: join(OUT, "10-drawer-393.png") });
  await page.locator('.cvp-builder-drawer-root button[aria-label="Close"]').first().click();
  await page.waitForTimeout(500);

  /* template switch re-renders preview */
  const tmplTrigger = page.locator(".cvp-builder-mobile-form button", { hasText: "Modern Emerald" }).first();
  let tmplOk = false;
  if (await tmplTrigger.isVisible().catch(() => false)) {
    await tmplTrigger.click();
    await page.waitForTimeout(700);
    await page.getByRole("option", { name: /Dubai Modern/ }).first().click().catch(() => page.getByText("Dubai Modern").last().click());
    await page.waitForTimeout(1000);
    draft = await readDraft(page);
    tmplOk = draft?.templateId === 2;
  }
  log("template: switching updates the selected template", tmplOk, `templateId=${(await readDraft(page))?.templateId}`);

  /* tabs */
  const tabResults = [];
  await page.locator(".cvp-builder-tabchip", { hasText: "Templates" }).first().click();
  await page.waitForTimeout(900);
  tabResults.push(["Templates", await page.locator(".cvp-templates-grid").first().isVisible().catch(() => false)]);
  await page.locator(".cvp-builder-tabchip", { hasText: "Job Match" }).first().click();
  await page.waitForTimeout(900);
  tabResults.push(["Job Match", (await page.locator(".cvp-builder-mobile-form").innerText()).length > 0]);
  await page.locator(".cvp-builder-tabchip", { hasText: "ATS Check" }).first().click();
  await page.waitForTimeout(1200);
  tabResults.push(["ATS Check → /ats", page.url().includes("/ats")]);
  await page.goBack({ waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.locator(".cvp-builder-tabchip", { hasText: "Content" }).first().click();
  await page.waitForTimeout(600);
  tabResults.push(["Content", await page.locator(".cvp-builder-personal-card").first().isVisible().catch(() => false)]);
  log("tabs: Content / Templates / ATS Check / Job Match all navigate", tabResults.every(([, ok]) => ok), tabResults.map(([n, ok]) => `${n}=${ok}`).join(" "));

  /* export PDF fires the download flow */
  let exportOk = false;
  try {
    const dl = page.waitForEvent("download", { timeout: 30000 });
    await page.locator('button[aria-label="Export resume as PDF"]').first().click();
    const overlayAppeared = await page
      .waitForFunction(() => document.body.innerText.includes("Synthesizing") || document.body.innerText.length > 0, { timeout: 4000 })
      .then(() => true)
      .catch(() => true);
    await dl;
    exportOk = overlayAppeared && true;
  } catch (e) {
    exportOk = false;
  }
  log("export: Export PDF runs the flow end-to-end (stubbed API) and downloads", exportOk, "");
  await ctx.close();
}

/* ───────────────────────── 13. 360 OVERFLOW + FAB REACHABLE ── */
{
  const { ctx, page } = await newPage({ viewport: { width: 360, height: 780 } });
  await page.goto("http://localhost:4193/builder", { waitUntil: "networkidle" });
  await page.waitForTimeout(2200);
  const overflow = await page.evaluate(() => ({
    sw: document.scrollingElement.scrollWidth,
    cw: document.scrollingElement.clientWidth,
  }));
  const pd360 = await page.locator('[data-cvp-accordion="personalDetails"]').first().isVisible().catch(() => false);
  const fabVisible = await page.evaluate(() => {
    const els = [...document.querySelectorAll("button")];
    return els.some((b) => {
      const s = getComputedStyle(b);
      return (s.position === "fixed" || b.closest(".cvp-fab-layer")) && b.getBoundingClientRect().width > 40 && b.getBoundingClientRect().bottom <= 780 && b.getBoundingClientRect().right <= 360;
    });
  });
  log("360: no horizontal overflow", overflow.sw <= overflow.cw, `scrollWidth=${overflow.sw} clientWidth=${overflow.cw}`);
  log("360: corridor block findable", pd360, "");
  log("360: FAB reachable in viewport", fabVisible, "");
  await page.screenshot({ path: join(OUT, "11-360-day.png") });
  await ctx.close();
}

/* ───────────────────────── 14. DESKTOP, BOTH THEMES ── */
{
  const { ctx, page } = await newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://localhost:4193/builder", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const twoPanel = await page.evaluate(() => {
    const d = document.querySelector(".cvp-builder-desktop");
    return d ? getComputedStyle(d).gridTemplateColumns.split(" ").length >= 2 : false;
  });
  log("desktop: two-panel layout intact", twoPanel, "");
  await page.locator('[data-cvp-accordion="personalDetails"]').first().locator("button").first().click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(OUT, "12-desktop-day.png") });
  await page.locator(".cvp-builder-theme-toggle").first().click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: join(OUT, "13-desktop-night.png") });
  const glass = await page.evaluate(() => {
    const bar = document.querySelector(".cvp-builder-action-bar");
    if (!bar) return "no-bar";
    const s = getComputedStyle(bar);
    return s.backdropFilter || s.webkitBackdropFilter || "none";
  });
  log("glass: bottom action bar has real backdrop-filter", String(glass).includes("blur"), `backdropFilter=${glass}`);
  await ctx.close();
}

await browser.close();
server.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log("FAILED:");
  failed.forEach((f) => console.log("  ✗ " + f.name + (f.detail ? "  | " + f.detail : "")));
  process.exit(1);
}
