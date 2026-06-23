import { locateGapInCv, isRemovableRef } from "./locateGap";

describe("locateGapInCv", () => {
  test("locates evidence in the exact bullet line (removable)", () => {
    const cv = {
      experience: [
        { points: "Led the team\nKey metrics: revenue inflated by vanity figures\nShipped v2" },
      ],
    };
    const { ref, score } = locateGapInCv({ evidence: "key metrics revenue inflated vanity" }, cv);
    expect(ref).toMatchObject({ kind: "bullet", expIndex: 0, lineIndex: 1 });
    expect(score).toBeGreaterThanOrEqual(0.6);
    expect(isRemovableRef(ref)).toBe(true);
  });

  test("locates evidence in a custom field (removable)", () => {
    const cv = { customFields: [{ id: "cf1", name: "Key Metrics", value: "revenue grew 500 percent market leading" }] };
    const { ref } = locateGapInCv({ evidence: "key metrics revenue market leading" }, cv);
    expect(ref).toMatchObject({ kind: "customField", customFieldId: "cf1" });
    expect(isRemovableRef(ref)).toBe(true);
  });

  test("evidence in a core field (summary) is located but NOT removable", () => {
    const cv = { summary: "Key metrics: revenue inflated by vanity figures across the board" };
    const { ref } = locateGapInCv({ evidence: "key metrics revenue inflated vanity" }, cv);
    expect(ref).toMatchObject({ kind: "field", field: "summary" });
    expect(isRemovableRef(ref)).toBe(false);
  });

  test("locates an entry by its date (dates now in the header candidate)", () => {
    const cv = {
      experience: [
        { role: "Analyst", company: "Acme", startDate: "Jan 2019", endDate: "Dec 2020", points: "Did things" },
        { role: "Senior Analyst", company: "Globex", startDate: "Jan 2021", endDate: "Oct 2025", points: "More" },
      ],
    };
    const { ref } = locateGapInCv({ evidence: "Senior Analyst Globex Oct 2025" }, cv);
    expect(ref).toMatchObject({ kind: "field", field: "experience", expIndex: 1 });
  });

  test("genuinely absent → ref null, low score", () => {
    const cv = { name: "Jane", summary: "Senior cloud engineer focused on reliability" };
    const { ref, score } = locateGapInCv({ evidence: "key metrics revenue inflated vanity" }, cv);
    expect(ref).toBeNull();
    expect(score).toBeLessThan(0.3);
  });

  test("too-vague evidence (<2 tokens) → ref null", () => {
    const cv = { summary: "metrics everywhere in this metrics summary" };
    const { ref, probeTokenCount } = locateGapInCv({ evidence: "metrics" }, cv);
    expect(ref).toBeNull();
    expect(probeTokenCount).toBe(1);
  });
});
