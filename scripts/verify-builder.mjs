/* Builder verification: anon clean slate, personal details in preview,
   custom dropdown (incl. keyboard nav), progress card. */
import { createServer } from "node:http";
import { readFileSync, existsSync, statSync, writeFileSync } from "node:fs";
import { join, extname } from "node:path";
import { createRequire } from "node:module";
import { chromium } from "@playwright/test";

const OUT = process.argv[2];
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".svg": "image/svg+xml" };
const server = createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = join("./build", p);
  if (!existsSync(file) || statSync(file).isDirectory()) file = join("./build", "spa.html");
  try { res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" }); res.end(readFileSync(file)); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(4187, r));

const FULL_CV = {
  name: "Priya Ramachandran Nair", email: "priya.nair@example.com", phone: "+971 55 123 9876",
  linkedin: "linkedin.com/in/priyanair", location: "Abu Dhabi, UAE", title: "Senior Accountant",
  summary: "Chartered accountant with 7 years across UAE audit and reporting.",
  nationality: "Indian", visaStatus: "Employment visa", dob: "12 Mar 1994",
  gender: "Female", maritalStatus: "Married", drivingLicense: "UAE light vehicle",
  skills: "IFRS, Audit, SAP FICO, VAT, Consolidation",
  languages: "English, Malayalam, Hindi",
  experience: [{ company: "Falcon Audit Group", role: "Senior Accountant", period: "2021 – Present", points: "Closed monthly consolidation for 12 entities", startDate: "2021", endDate: "", present: true }],
  education: [{ school: "University of Kerala", degree: "B.Com", year: "2016" }],
  certifications: [], technicalSkills: "", projects: "", volunteerWork: "", publications: "",
  builderExtraSectionIds: ["personalDetails"], customFields: [], availability: "", references: "References available upon request", willingToRelocate: "",
};

const browser = await chromium.launch();

/* 1 — anonymous clean slate */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://localhost:4187/builder", { waitUntil: "networkidle" });
  await page.waitForTimeout(2500);
  const text = await page.locator("body").innerText();
  const clean = !/junaid|connectingjunaidkhan|Dubai, UAE|English, Hindi|Immediately Available/i.test(text);
  const pcts = text.match(/(\d+)%/);
  console.log(`anon clean slate: ${clean ? "✓" : "✗ REAL DATA VISIBLE"} | first %: ${pcts ? pcts[1] : "?"}`);
  await page.screenshot({ path: join(OUT, "builder-anon-clean.png") });
  await page.close();
}

/* 2 — full personal details: preview + dropdown + progress card */
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.addInitScript((cv) => {
    localStorage.setItem("cvp_cv_draft:new:default", JSON.stringify({ version: 2, cv, templateId: 1, resumeId: null, ownerId: null, updatedAt: Date.now() }));
  }, FULL_CV);
  await page.goto("http://localhost:4187/builder", { waitUntil: "networkidle" });
  await page.waitForTimeout(3000);
  const text = await page.locator("body").innerText();
  for (const probe of ["Indian", "Employment visa", "12 Mar 1994", "UAE light vehicle", "Married"]) {
    console.log(`preview has "${probe}": ${text.includes(probe) ? "✓" : "✗ MISSING"}`);
  }
  await page.screenshot({ path: join(OUT, "builder-details-t1.png") });

  // dropdown: open (mouse), screenshot, then keyboard-nav to another template
  const trigger = page.getByRole("button", { name: "CV template" });
  await trigger.click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(OUT, "builder-dropdown-open.png") });
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await page.waitForTimeout(300);
  const name = await trigger.innerText();
  console.log(`keyboard nav selected: "${name.trim()}" (expected Arabia Pro)`);
  await page.keyboard.press("Escape");

  // jump to UAE ATS (19) — different layout family, then screenshot preview
  await trigger.click();
  await page.getByRole("option", { name: /UAE ATS/ }).click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: join(OUT, "builder-details-t19.png") });
  await page.close();
}

/* 3 — PDF path: render two serverLib builders directly with the same CV */
{
  const require2 = createRequire(import.meta.url);
  for (const [mod, fn, tag] of [
    ["./src/serverLib/bannerTemplate1Html.js", null, "t1"],
    ["./src/serverLib/uaeAtsTemplate19Html.js", null, "t19"],
  ]) {
    const m = require2(mod);
    const build = fn ? m[fn] : (m.default || Object.values(m).find((v) => typeof v === "function"));
    const html = build(FULL_CV);
    const misses = ["Indian", "Employment visa", "12 Mar 1994", "Married", "UAE light vehicle"].filter((s) => !html.includes(s));
    console.log(`pdf-html ${tag}: ${misses.length === 0 ? "✓ all details present" : `✗ missing: ${misses.join(", ")}`}`);
    const f = join(OUT, `pdf-${tag}.html`);
    writeFileSync(f, html);
    const p = await browser.newPage({ viewport: { width: 900, height: 1200 } });
    await p.goto(`file://${f.replace(/\\/g, "/")}`);
    await p.waitForTimeout(400);
    await p.screenshot({ path: join(OUT, `pdf-${tag}.png`), fullPage: false });
    await p.close();
  }
}

await browser.close();
server.close();
console.log("done");
