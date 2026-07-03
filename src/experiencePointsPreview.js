/**
 * Experience / achievement text → structured bullets (one per line).
 *
 * THE PROMISE (the editor's own copy): "Each line becomes one bullet."
 * Rules:
 *   1. Every non-empty LINE is one bullet. Plain Enter = new bullet — no
 *      continuation merging (the old merge silently glued the user's
 *      lines into a run-on paragraph, the #1 walkthrough complaint).
 *   2. Leading markers (• - – * 1.) are stripped; templates draw their own.
 *   3. Inline mid-line markers do NOT split. "Built X • Y • Z" stays as
 *      one bullet — a too-long bullet beats a sentence cut in half.
 *   4. format: 'paragraph' only when there is a SINGLE line with no
 *      marker (summary-style prose renders without a leading •);
 *      anything multi-line is a real list.
 *
 * TWIN: src/serverLib/pdfCommon.js#splitExperiencePointsForPreview must
 * split identically — src/experiencePointsPreview.test.js locks the pair.
 */

// Line-leading bullet markers:
//   •  ·  *           — strip even without trailing space (often pasted as "•Built")
//   -  –              — require a trailing space (avoids "-2024", "-3.5%")
//   1. / 1) / 1:      — require a trailing space (avoids "1.5 million users")
const BULLET_LINE = /^\s*(?:[•·*]\s*|[-–]\s+|\d+[.):]\s+)/;

function isBulletLine(line) {
  return BULLET_LINE.test(line);
}

function stripMarker(line) {
  return String(line ?? "").replace(BULLET_LINE, "").trim();
}

/**
 * @param {string|null|undefined} text
 * @returns {{ bullets: string[], format: 'list' | 'paragraph' }}
 */
export function parseExperiencePoints(text) {
  if (text == null || text === "") return { bullets: [], format: "list" };

  let sawAnyMarker = false;
  const bullets = [];

  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    if (isBulletLine(line)) {
      sawAnyMarker = true;
      const stripped = stripMarker(line);
      if (stripped) bullets.push(stripped);
    } else {
      bullets.push(line);
    }
  }

  const format = sawAnyMarker || bullets.length > 1 ? "list" : "paragraph";
  return { bullets, format };
}

/**
 * Strip every line-leading bullet marker from a multi-line string.
 * Used by the "Clear formatting" toolbar action — preserves line structure,
 * just removes the markers themselves.
 */
export function clearBulletMarkers(text) {
  if (text == null) return "";
  return String(text)
    .split(/\r?\n/)
    .map((line) => line.replace(BULLET_LINE, ""))
    .join("\n");
}

/** Back-compat wrapper. Pre-existing callers get just the bullet array. */
export function splitExperiencePointsForPreview(text) {
  return parseExperiencePoints(text).bullets;
}

/**
 * Remove uniform white/empty rows from the bottom of a raster (post–html2canvas).
 * Fixes extra band below content when the DOM height was slightly larger than ink.
 */
export function trimCanvasBottomWhitespace(canvas, whiteThreshold = 240) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const { width, height } = canvas;
  if (width <= 0 || height <= 0) return canvas;

  const imageData = ctx.getImageData(0, 0, width, height);
  const d = imageData.data;

  let bottom = height - 1;
  for (; bottom >= 0; bottom--) {
    let rowHasInk = false;
    for (let x = 0; x < width; x++) {
      const i = (bottom * width + x) * 4;
      const r = d[i];
      const g = d[i + 1];
      const b = d[i + 2];
      const a = d[i + 3];
      if (a < 8) continue;
      if (r < whiteThreshold || g < whiteThreshold || b < whiteThreshold) {
        rowHasInk = true;
        break;
      }
    }
    if (rowHasInk) break;
  }

  const newHeight = Math.max(bottom + 1, 1);
  if (newHeight >= height) return canvas;

  const out = document.createElement("canvas");
  out.width = width;
  out.height = newHeight;
  out.getContext("2d").drawImage(canvas, 0, 0, width, newHeight, 0, 0, width, newHeight);
  return out;
}
