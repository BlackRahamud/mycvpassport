/**
 * Popup-blocker gate for the employer portal.
 *
 * window.open fired AFTER an await (fetch a signed URL, then open) runs
 * outside the user's click gesture, so every browser except the
 * developer's trusted setup silently blocks it — the classic
 * "View CV works on my machine, does nothing on the customer's". The
 * dead ViewOriginalCv.jsx shipped exactly this and was deleted.
 *
 * This gate scans the employer-portal source and asserts window.open
 * appears ONLY at the known call sites, each verified to run
 * synchronously inside a click handler. Adding a new window.open fails
 * the test until the call site is reviewed and listed here — prefer a
 * plain <a> (download / target=_blank), which always carries the
 * gesture, or open synchronously and set location when the URL arrives.
 */
const fs = require("fs");
const path = require("path");

const SCAN_ROOTS = ["src/components/hr", "src/pages/hr"];

// file (repo-relative, forward slashes) -> expected occurrence count.
const ALLOWED = {
  // buildWaLink is synchronous string building; open runs inside onClick.
  "src/components/hr/BulkActions.jsx": 1,
  "src/components/hr/WhatsAppComposer.jsx": 1,
  // Float fallback (no Document PiP): the sized popup opens directly in
  // the Float button's onClick, before any await — reviewed.
  "src/components/hr/InterviewCompanion.jsx": 1,
};

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, out);
    else if (/\.(jsx?|tsx?)$/.test(name) && !/\.test\./.test(name)) out.push(p);
  }
  return out;
}

test("window.open in the employer portal only at reviewed synchronous-gesture call sites", () => {
  const found = {};
  SCAN_ROOTS.forEach((root) => {
    const abs = path.join(process.cwd(), root);
    if (!fs.existsSync(abs)) return;
    walk(abs).forEach((file) => {
      const rel = path.relative(process.cwd(), file).replace(/\\/g, "/");
      const count = (fs.readFileSync(file, "utf8").match(/window\.open\s*\(/g) || []).length;
      if (count > 0) found[rel] = count;
    });
  });
  expect(found).toEqual(ALLOWED);
});
