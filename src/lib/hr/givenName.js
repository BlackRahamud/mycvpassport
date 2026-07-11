// givenName — the ONE first-name resolver for every HR surface.
//
// Walkthrough bug: "Md Sharik Nasir Khan" rendered as "Message MD" while the
// WhatsApp body correctly said "Hi Sharik" — two different name rules inside
// one modal. Md/Mohd style honorific abbreviations are extremely common
// across the India to Gulf corridor and are almost never the name a person
// goes by.
//
// Rules:
// - Abbreviated honorifics (md, mohd, muhd, mohd., etc.) are ALWAYS skipped
//   when another name token follows.
// - Full forms (Mohammed, Muhammad, Mohamed, Mohammad, Mohamad) are skipped
//   ONLY when at least two more tokens follow ("Mohammed Sharik Khan" ->
//   Sharik) — with a single surname ("Mohammed Al-Balushi") Mohammed IS the
//   given name and stays.
// - Courtesy titles (mr, mrs, ms, dr, eng, engr) are always skipped too.

const ALWAYS_SKIP = new Set(["md", "mohd", "muhd", "mhd", "mr", "mrs", "ms", "dr", "eng", "engr", "shk"]);
const SKIP_WHEN_LONG = new Set(["mohammed", "muhammad", "mohamed", "mohammad", "mohamad"]);

export default function givenName(full, fallback = "there") {
  const tokens = String(full || "").trim().split(/\s+/).filter(Boolean);
  if (!tokens.length) return fallback;
  let i = 0;
  while (i < tokens.length - 1) {
    const t = tokens[i].toLowerCase().replace(/\.+$/, "");
    if (ALWAYS_SKIP.has(t)) { i += 1; continue; }
    if (SKIP_WHEN_LONG.has(t) && tokens.length - i >= 3) { i += 1; continue; }
    break;
  }
  return tokens[i] || fallback;
}
