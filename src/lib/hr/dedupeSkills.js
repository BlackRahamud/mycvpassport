// dedupeSkills — collapse noisy overlapping skill chips.
//
// Walkthrough polish item: parsed CVs produce chips like "Manage Engine"
// AND "Manage Engine Service Desk" side by side. A chip that is wholly
// contained inside another chip (case-insensitive, word-boundary safe via
// simple substring on normalised text) adds no information, so the shorter
// one is dropped and the most specific label wins.
export default function dedupeSkills(list) {
  const items = (Array.isArray(list) ? list : []).map((s) => String(s || "").trim()).filter(Boolean);
  const norm = items.map((s) => s.toLowerCase().replace(/\s+/g, " "));
  return items.filter((_, i) =>
    !norm.some((other, j) => j !== i && other.includes(norm[i]) && other.length > norm[i].length)
  );
}
