/**
 * One-off: measure T8 layout before page.pdf() (screen layout).
 * Local: uses devDependency `puppeteer` (bundled Chromium).
 * Run: node scripts/debug-t8-pdf-heights.js
 */
const puppeteer = require("puppeteer");
const { buildCreativeSidebarTemplate8Html } = require("../api/lib/creativeSidebarTemplate8Html");

const sampleCv = {
  name: "Debug User",
  title: "Engineer",
  email: "a@b.com",
  phone: "+1",
  location: "City",
  willingToRelocate: "Yes",
  summary: "Short summary.",
  experience: [
    {
      company: "Co",
      role: "Role",
      period: "2020–2024",
      points: "Line one.\nLine two.",
    },
  ],
  education: [
    { school: "University", degree: "BSc", year: "2019" },
    { school: "School Two", degree: "More", year: "2018" },
  ],
  technicalSkills: "A, B, C",
  references: "Available upon request. " + "x".repeat(200),
};

/** Long main column (Education + References) vs short sidebar — mirrors user report. */
const tallMainCv = {
  ...sampleCv,
  summary: "x".repeat(500),
  experience: Array.from({ length: 6 }, (_, i) => ({
    company: `Company ${i}`,
    role: "Senior Role",
    period: "2020–2024",
    points: Array.from({ length: 8 }, (_, j) => `Bullet ${j} detail text.`).join("\n"),
  })),
  education: Array.from({ length: 5 }, (_, i) => ({
    school: `University ${i}`,
    degree: "Degree",
    year: "2019",
  })),
  references: "Refs. " + "y".repeat(400),
};

function measure(page) {
  return page.evaluate(() => {
    const m = (el) => {
      if (!el) return null;
      const b = el.getBoundingClientRect();
      const cs = window.getComputedStyle(el);
      return {
        offsetHeight: el.offsetHeight,
        clientHeight: el.clientHeight,
        scrollHeight: el.scrollHeight,
        rectHeight: Math.round(b.height * 100) / 100,
        rectBottom: Math.round(b.bottom * 100) / 100,
        position: cs.position,
        top: cs.top,
        bottom: cs.bottom,
        height: cs.height,
      };
    };
        const root = document.querySelector(".t8-root");
        const side = document.querySelector(".t8-side");
        const main = document.querySelector(".t8-main");
        return {
          t8Root: m(root),
          t8Side: m(side),
          t8Main: m(main),
      body: m(document.body),
      documentElement: m(document.documentElement),
    };
  });
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    channel: "chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  const runCase = async (label, cv) => {
    const html = buildCreativeSidebarTemplate8Html(cv);
    await page.setContent(html, { waitUntil: "load", timeout: 120000 });
    const screen = await measure(page);
    await page.emulateMediaType("print");
    const printMedia = await measure(page);
    await page.emulateMediaType("screen");
    return { label, screen, printMedia };
  };

  const a = await runCase("short sampleCv", sampleCv);
  const b = await runCase("tall main (sidebar short)", tallMainCv);

  console.log(JSON.stringify({ short: a, tall: b }, null, 2));

  await browser.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
