/**
 * Experience description → PDF: split on newlines and •, wrap with splitTextToSize.
 * Does not change maxWidth values — pass the same width already used per layout.
 */
export function renderPdfExperiencePoints(doc, rawText, x, startY, maxWidth, lineHeight, bottomY, topYOnNewPage) {
  const text = String(rawText ?? "");
  if (!text.trim()) return startY;

  let y = startY;

  const drawLines = (lines) => {
    lines.forEach((line) => {
      if (y + lineHeight > bottomY) {
        doc.addPage();
        y = topYOnNewPage;
      }
      doc.text(line, x, y);
      y += lineHeight;
    });
  };

  if (!/[•\n]/.test(text)) {
    const wrapped = doc.splitTextToSize(text.trim(), maxWidth);
    drawLines(wrapped);
    return y;
  }

  const parts = text.split(/\n|•/).map((l) => l.trim()).filter(Boolean);
  if (parts.length === 0) return y;
  parts.forEach((part, i) => {
    const display = i === 0 ? part : `• ${part}`;
    const wrapped = doc.splitTextToSize(display, maxWidth);
    drawLines(wrapped);
  });
  return y;
}
