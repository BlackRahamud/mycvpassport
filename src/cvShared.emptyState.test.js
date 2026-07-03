/**
 * Empty means empty — a fresh anonymous builder session must contain no
 * real-looking values in ANY section. Locks:
 *   1. EMPTY_RESUME is blank everywhere (the only allowed non-empty
 *      string is the generic references line; the languages "English,
 *      Hindi" regression is exactly what this catches).
 *   2. scrubLegacyDraftPrefills clears the OLD defaults out of persisted
 *      drafts written by earlier builds — verbatim matches only.
 */
import { EMPTY_RESUME, scrubLegacyDraftPrefills } from "./cvShared";

describe("EMPTY_RESUME is empty in every section", () => {
  const ALLOWED_NON_EMPTY = new Set(["references"]);
  const CASES = Object.entries(EMPTY_RESUME).filter(([key]) => !ALLOWED_NON_EMPTY.has(key));

  test.each(CASES)("%s starts empty", (key, value) => {
    const expected = Array.isArray(value) ? [] : "";
    expect(value).toEqual(expected);
  });

  test("no field carries the removed prefills", () => {
    const serialized = JSON.stringify(EMPTY_RESUME).toLowerCase();
    for (const leak of ["english", "hindi", "dubai", "uae", "immediately", "junaid"]) {
      expect(serialized).not.toContain(leak);
    }
  });
});

describe("scrubLegacyDraftPrefills (stale localStorage drafts)", () => {
  test("clears the exact legacy defaults", () => {
    const scrubbed = scrubLegacyDraftPrefills({
      languages: "English, Hindi",
      location: "Dubai, UAE",
      availability: "Immediately Available",
      willingToRelocate: "Yes",
      name: "Real Person",
    });
    expect(scrubbed.languages).toBe("");
    expect(scrubbed.location).toBe("");
    expect(scrubbed.availability).toBe("");
    expect(scrubbed.willingToRelocate).toBe("");
    expect(scrubbed.name).toBe("Real Person");
  });

  test("never touches genuinely-typed values", () => {
    const cv = {
      languages: "English, Hindi, Malayalam",
      location: "Dubai",
      availability: "Available from August",
      willingToRelocate: "Yes — GCC wide",
    };
    expect(scrubLegacyDraftPrefills(cv)).toBe(cv); // unchanged, same reference
  });

  test("handles null/garbage without throwing", () => {
    expect(scrubLegacyDraftPrefills(null)).toBe(null);
    expect(scrubLegacyDraftPrefills(undefined)).toBe(undefined);
  });
});
