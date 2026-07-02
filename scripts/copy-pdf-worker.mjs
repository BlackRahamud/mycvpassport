// Copies the pdf.js worker that matches the installed pdfjs-dist into
// public/ so the CV viewer can load it from a same-origin URL.
//
// Why not `new URL('pdfjs-dist/build/pdf.worker.min.js', import.meta.url)`:
// import.meta doesn't survive Jest's CJS transform (CRA), so any component
// containing it becomes untestable. A build-time copy keeps the component
// plain and guarantees the worker version always matches the installed lib.
//
// Runs in prestart + prebuild. public/pdf.worker.min.js is gitignored.
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

const require = createRequire(import.meta.url);
const workerSrc = require.resolve("pdfjs-dist/build/pdf.worker.min.js");
const dest = join(process.cwd(), "public", "pdf.worker.min.js");
mkdirSync(dirname(dest), { recursive: true });
copyFileSync(workerSrc, dest);
console.log(`pdf-worker: copied ${workerSrc.split("node_modules")[1]} → public/pdf.worker.min.js`);
