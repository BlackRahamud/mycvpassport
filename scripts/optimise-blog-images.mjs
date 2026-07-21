/* Blog image optimiser.
   Source art is 2400px wide and 1.4 to 1.8 MB per file, which is far too
   heavy to ship. This resizes and recompresses through Chromium's canvas,
   so no image dependency is added to the project for a one off job.

   Heroes are emitted at 1200x630, the Open Graph standard, which also
   happens to match the source 1.905 aspect exactly, so nothing is
   cropped or stretched. Supporting art is emitted at 1200x800.

   JPEG is what ships. WebP is written alongside only so the two can be
   compared, and is deleted after: og:image stays JPEG because WebP
   support in social crawlers is still inconsistent, and a share preview
   that fails to render is worse than a slightly larger file.

   Usage: node scripts/optimise-blog-images.mjs */
import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync, statSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SRC = "C:/Users/Junaid Khan/Downloads";
const OUT = "public/assets/blog";
mkdirSync(OUT, { recursive: true });

const JOBS = [
  { in: "candidate-hero.png", out: "ai-cv-builder-2026-hero", w: 1200, h: 630 },
  { in: "candidate-supporting.png", out: "ai-cv-builder-2026-checklist", w: 1200, h: 800 },
  { in: "hr-hero.png", out: "ai-in-recruitment-2026-hero", w: 1200, h: 630 },
  { in: "hr-supporting.png", out: "ai-in-recruitment-2026-split", w: 1200, h: 800 },
];

const browser = await chromium.launch();
const page = await browser.newPage();

for (const j of JOBS) {
  // Passed as a data URL rather than file://: a page on about:blank is
  // not allowed to read local files, which fails as EncodingError.
  const url = `data:image/png;base64,${readFileSync(join(SRC, j.in)).toString("base64")}`;
  const encoded = await page.evaluate(
    async ([src, w, h]) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const ctx = c.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, w, h);
      return {
        jpeg: c.toDataURL("image/jpeg", 0.84),
        webp: c.toDataURL("image/webp", 0.86),
        natural: `${img.naturalWidth}x${img.naturalHeight}`,
      };
    },
    [url, j.w, j.h],
  );

  const write = (dataUrl, ext) => {
    const b = Buffer.from(dataUrl.split(",")[1], "base64");
    const p = join(OUT, `${j.out}.${ext}`);
    writeFileSync(p, b);
    return { p, kb: (statSync(p).size / 1024).toFixed(0) };
  };
  const jpg = write(encoded.jpeg, "jpg");
  const wep = write(encoded.webp, "webp");
  console.log(`${j.in.padEnd(26)} ${encoded.natural} -> ${j.w}x${j.h}   jpg ${jpg.kb}kB   webp ${wep.kb}kB`);
}

await browser.close();
