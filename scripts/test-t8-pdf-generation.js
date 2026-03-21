/**
 * Generates T8 PDF with same options as api/generate-pdf.js (local Chrome).
 * Run: node scripts/test-t8-pdf-generation.js
 */
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const { buildCreativeSidebarTemplate8Html } = require("../src/serverLib/creativeSidebarTemplate8Html");
const { drawT8SidebarStripeOnPdf } = require("../src/serverLib/pdfDrawT8SidebarStripe");

const tallMainCv = {
  name: "PDF Test",
  title: "Engineer",
  email: "a@b.com",
  willingToRelocate: "Yes",
  summary: "Summary.",
  experience: Array.from({ length: 4 }, (_, i) => ({
    company: `Company ${i}`,
    role: "Role",
    period: "2020–2024",
    points: Array.from({ length: 6 }, (_, j) => `Line ${j}.`).join("\n"),
  })),
  education: Array.from({ length: 4 }, (_, i) => ({
    school: `School ${i}`,
    degree: "BSc",
    year: "2019",
  })),
  references: "Available upon request.",
};

async function main() {
  const html = buildCreativeSidebarTemplate8Html(tallMainCv);
  const browser = await puppeteer.launch({
    headless: true,
    channel: "chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "load", timeout: 120000 });

  let pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    preferCSSPageSize: true,
    omitBackground: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" },
  });

  await browser.close();

  pdfBuffer = await drawT8SidebarStripeOnPdf(pdfBuffer);

  const out = path.join(__dirname, "t8-pdf-test-output.pdf");
  fs.writeFileSync(out, pdfBuffer);
  console.log("OK: wrote", out, "bytes:", pdfBuffer.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
