/**
 * Experience / achievement text → preview lines.
 * Only splits on newlines — never on "•" mid-sentence (that caused broken bullets).
 */
export function splitExperiencePointsForPreview(text) {
  if (text == null || text === "") return [];
  return String(text)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^•\s*/, ""));
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
