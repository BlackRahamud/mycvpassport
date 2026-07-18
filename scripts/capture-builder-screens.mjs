/* Pixel pass: screenshot every builder screen + editor sheet, both themes.
   Usage: node scripts/capture-builder-screens.mjs <outDir> */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";
import { chromium } from "@playwright/test";

const OUT = process.argv[2] || "shots";
mkdirSync(OUT, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".png": "image/png", ".svg": "image/svg+xml" };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = join("./build", p);
  if (!existsSync(file) || statSync(file).isDirectory()) file = join("./build", "spa.html");
  try { res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" }); res.end(readFileSync(file)); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(4205, r));

const FULL_CV = {
  name: "Rahul Menon", email: "rahul.menon@gmail.com", phone: "+91 98470 12345",
  linkedin: "linkedin.com/in/rahulmenon", location: "Kochi, Kerala, India", title: "Guest Relations Supervisor",
  summary: "Hospitality supervisor with six years in five star front office and guest relations.",
  nationality: "Indian", visaStatus: "Visit visa", dob: "14 Mar 1994",
  gender: "Male", maritalStatus: "Married", drivingLicense: "India LMV",
  skills: "Front office operations, Guest relations, Opera PMS",
  languages: "English, Malayalam, Hindi",
  experience: [
    { company: "The Leela, Kochi", role: "Guest Relations Supervisor", period: "2021 - Present", points: "Led a front office team of nine across three shifts.", startDate: "01/2021", endDate: "", present: true },
    { company: "Taj Malabar, Kochi", role: "Front Office Executive", period: "2018 - 2021", points: "Handled check in and check out on Opera PMS.", startDate: "06/2018", endDate: "12/2020", present: false },
  ],
  education: [{ school: "Mahatma Gandhi University", degree: "BA Hospitality Management", year: "2018", fieldOfStudy: "Hospitality", startDate: "", endDate: "", location: "" }],
  certifications: [], technicalSkills: "", projects: "", volunteerWork: "", publications: "",
  builderExtraSectionIds: [], customFields: [], availability: "Serving notice, 30 days", references: "References available upon request", willingToRelocate: "Yes",
};

const browser = await chromium.launch();
async function shoot(name, theme, viewport, actions, { seed = true } = {}) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  await page.route(/supabase|posthog/i, (r) => r.fulfill({ status: 204, body: "" }));
  await page.addInitScript(({ cv, th, s }) => {
    localStorage.setItem("cvp_theme", th);
    if (s) localStorage.setItem("cvp_cv_draft:new:default", JSON.stringify({ version: 2, cv, templateId: 1, resumeId: null, ownerId: null, updatedAt: Date.now() }));
  }, { cv: FULL_CV, th: theme, s: seed });
  await page.goto("http://localhost:4205/builder", { waitUntil: "networkidle" });
  await page.waitForTimeout(2200);
  try { await actions?.(page); } catch (e) { console.log(name, "action error:", e.message.slice(0, 120)); }
  await page.screenshot({ path: join(OUT, `${name}-${theme}.png`) });
  await ctx.close();
  console.log("shot", name, theme);
}

for (const theme of ["light", "dark"]) {
  await shoot("s1-arrival", theme, { width: 393, height: 852 }, null, { seed: false });
  await shoot("s2-filled", theme, { width: 393, height: 852 }, null);
  await shoot("s3-corridor", theme, { width: 393, height: 852 }, async (page) => {
    await page.locator('.cvp-builder-mobile-form [data-cvp-accordion="personalDetails"] button').first().click();
    await page.waitForTimeout(600);
  });
  await shoot("s4-exp-editor", theme, { width: 393, height: 852 }, async (page) => {
    await page.locator('.cvp-builder-mobile-form [data-cvp-accordion="experience"] button').first().click();
    await page.waitForTimeout(500);
    await page.locator('.cvp-builder-mobile-form button', { hasText: "+ Add a role" }).first().click();
    await page.waitForTimeout(900);
  });
  await shoot("s5-edu-editor", theme, { width: 393, height: 852 }, async (page) => {
    await page.locator('.cvp-builder-mobile-form [data-cvp-accordion="education"] button').first().click();
    await page.waitForTimeout(500);
    await page.locator('.cvp-builder-mobile-form button', { hasText: "+ Add a qualification" }).first().click();
    await page.waitForTimeout(900);
  });
  await shoot("s6-sections-scroll", theme, { width: 393, height: 852 }, async (page) => {
    await page.locator(".cvp-builder-mobile-form").evaluate((el) => { el.scrollTop = el.scrollHeight; });
    await page.waitForTimeout(600);
  });
  await shoot("s7-desktop", theme, { width: 1440, height: 900 }, async (page) => {
    await page.locator('[data-cvp-accordion="personalDetails"]').first().locator("button").first().click();
    await page.waitForTimeout(700);
  });
  await shoot("s8-entry-menu", theme, { width: 393, height: 852 }, async (page) => {
    await page.locator('.cvp-builder-mobile-form [data-cvp-accordion="experience"] button').first().click();
    await page.waitForTimeout(500);
    const row = page.locator('.cvp-builder-mobile-form [data-cvp-accordion="experience"] .cvp-entry-row-in').first();
    await row.scrollIntoViewIfNeeded();
    await row.locator("button[aria-label$='options']").first().click();
    await page.waitForTimeout(500);
  });
}
await browser.close();
server.close();
console.log("done");
