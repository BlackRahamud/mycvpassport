// Text normalization utility for resume content
// - Standardizes bullet characters
// - Flattens excessive whitespace
// - Strips problematic non-ASCII control/hidden characters

export function normalizeResumeText(input) {
  if (!input) return "";

  let text = String(input);

  // Replace common non-standard bullet characters with a simple hyphen
  // (covers circles, squares, arrows and similar glyphs)
  text = text.replace(/[●•▪▫■□◆◇▶►➤➔➣➢➧➨➝➞➟]/g, "-");

  // Remove non-ASCII control / hidden characters that can confuse parsers
  // Keep standard printable ASCII plus newlines and tabs
  // eslint-disable-next-line no-control-regex
  text = text.replace(/[^\x09\x0A\x0D\x20-\x7E]/g, "");

  // Normalize all remaining whitespace (spaces, tabs, newlines) to single spaces
  text = text.replace(/\s+/g, " ");

  return text.trim();
}

