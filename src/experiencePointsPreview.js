/**
 * Experience / achievement text → preview bullet strings (one per bullet).
 *
 * 1) Newlines that are NOT a new bullet (line doesn't start with • / - / *) merge
 *    into the previous bullet — fixes accidental line breaks mid-sentence.
 * 2) Inline " • " segments split into separate bullets — fixes one-line bullet lists.
 */

function stripLeadingBulletToken(s) {
  return String(s ?? "")
    .replace(/^\s*[-•*]\s*/, "")
    .trim();
}

function isNewBulletLine(line) {
  return /^\s*[-•*]/.test(line);
}

function mergeContinuationLines(lines) {
  if (lines.length === 0) return [];
  const blocks = [];
  let cur = stripLeadingBulletToken(lines[0]);

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (isNewBulletLine(line)) {
      blocks.push(cur);
      cur = stripLeadingBulletToken(line);
    } else {
      cur = `${cur} ${stripLeadingBulletToken(line)}`.trim();
    }
  }
  blocks.push(cur);
  return blocks;
}

function splitInlineBulletSegments(block) {
  const t = String(block ?? "").trim();
  if (!t) return [];
  return t
    .split(/\s*•\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function splitExperiencePointsForPreview(text) {
  if (text == null || text === "") return [];

  const rawLines = String(text)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (rawLines.length === 0) return [];

  const mergedBlocks = mergeContinuationLines(rawLines);
  const out = [];
  for (const block of mergedBlocks) {
    out.push(...splitInlineBulletSegments(block));
  }

  return out.map((s) => s.replace(/^•\s*/, "").trim()).filter(Boolean);
}

/**
 * Remove uniform white/empty rows from the bottom of a raster (post–html2canvas).
 * Fixes extra band below content when the DOM height was slightly larger than ink.
 */
export function trimCanvasBottomWhitespace(canvas, whiteThreshold = 248) {
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

/**
 * html2canvas onclone: normalize font stack on the *cloned* iframe DOM so raster text
 * metrics match a single web-safe stack (reduces line-break drift vs live preview).
 */
export function normalizeFontsForHtml2canvasClone(clonedDoc, clonedRoot) {
  const view = clonedDoc.defaultView;
  if (!view || !clonedRoot) return;

  const tags = new Set([
    "P", "SPAN", "DIV", "LI", "TD", "TH",
    "H1", "H2", "H3", "H4", "H5", "H6",
    "LABEL", "A", "STRONG", "EM", "B", "I",
  ]);

  clonedRoot.querySelectorAll("*").forEach((node) => {
    if (node.nodeType !== 1) return;
    const el = /** @type {HTMLElement} */ (node);
    if (!tags.has(el.tagName)) return;
    const cs = view.getComputedStyle(el);
    el.style.fontFamily = "Arial, Helvetica, sans-serif";
    el.style.fontSize = cs.fontSize;
    el.style.lineHeight = cs.lineHeight;
    el.style.fontWeight = cs.fontWeight;
    el.style.fontStyle = cs.fontStyle;
    el.style.letterSpacing = "0px";
  });
}
