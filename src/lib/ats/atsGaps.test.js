import {
  buildStructuralGaps,
  normalizeAtsGaps,
  gapsFromLegacyParam,
  sortGapsByWeight,
  partitionGapsByResolution,
} from "./atsGaps";

describe("buildStructuralGaps", () => {
  test("from structureIssues: classifies, carries weight + evidence, tags structural", () => {
    const results = {
      structureIssues: [
        { claim: "Header reads C O N T A C T with spaced letters", evidence: "C O N T A C T", weight: "high" },
        { claim: "Skills split across two sections", weight: "medium" },
      ],
    };
    const gaps = buildStructuralGaps(results);
    expect(gaps).toHaveLength(2);
    expect(gaps[0]).toMatchObject({ type: "structural", category: "letter_spacing", weight: "high", evidence: "C O N T A C T" });
    expect(gaps[1]).toMatchObject({ type: "structural", category: "split_skills", weight: "medium" });
    expect(gaps[0].id).toBeTruthy();
  });

  test("from atsFlags: contact/tables/image/font negatives become gaps", () => {
    const results = {
      atsFlags: { hasContactBlock: false, hasTablesOrColumns: true, imageHeavy: true, fontIssues: true },
    };
    const cats = buildStructuralGaps(results).map((g) => g.category).sort();
    expect(cats).toEqual(["decorative_fonts", "image_or_nontext", "missing_contact", "tables_columns"]);
  });

  test("atsFlags positives (good CV) produce no gaps", () => {
    const results = {
      atsFlags: { hasContactBlock: true, hasTablesOrColumns: false, imageHeavy: false, fontIssues: false },
    };
    expect(buildStructuralGaps(results)).toHaveLength(0);
  });

  test("dedupes same category+label across sources", () => {
    const results = {
      structureIssues: [{ claim: "No clear contact block detected", weight: "high" }],
      atsFlags: { hasContactBlock: false },
    };
    const gaps = buildStructuralGaps(results);
    expect(gaps.filter((g) => g.category === "missing_contact")).toHaveLength(1);
  });

  test("empty / missing input → []", () => {
    expect(buildStructuralGaps(undefined)).toEqual([]);
    expect(buildStructuralGaps({})).toEqual([]);
  });
});

describe("normalizeAtsGaps", () => {
  test("keeps valid typed gaps, drops garbage", () => {
    const out = normalizeAtsGaps([
      { id: "a", type: "structural", category: "missing_contact", weight: "high", label: "X" },
      { nope: true },
      null,
      { label: "Y", category: "split_skills" },
    ]);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ id: "a", type: "structural", label: "X" });
    expect(out[1]).toMatchObject({ type: "structural", category: "split_skills", weight: "medium" });
  });

  test("non-array → []", () => {
    expect(normalizeAtsGaps(null)).toEqual([]);
    expect(normalizeAtsGaps("x")).toEqual([]);
  });
});

describe("gapsFromLegacyParam", () => {
  test("comma list → untyped review chips", () => {
    const out = gapsFromLegacyParam("Weak%20bullets,No metrics");
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ category: "unknown", label: "Weak bullets", type: "structural" });
    expect(out[1].label).toBe("No metrics");
  });

  test("empty → []", () => {
    expect(gapsFromLegacyParam("")).toEqual([]);
    expect(gapsFromLegacyParam(null)).toEqual([]);
  });
});

describe("partitionGapsByResolution", () => {
  const gaps = [
    { id: "g1", type: "structural", category: "missing_contact", weight: "high", label: "Add contact" },
    { id: "g2", type: "structural", category: "split_skills", weight: "medium", label: "Skills split" },
    { id: "g3", type: "structural", category: "image_or_nontext", weight: "low", label: "Images" },
    { id: "c1", type: "content", category: "keyword", weight: "high", label: "Add RERA" },
  ];

  test("splits resolved vs todo honestly, ignores content gaps (Phase A)", () => {
    const resume = {
      name: "Jane",
      email: "j@x.com",
      phone: "123",
      skills: "A, B",
      technicalSkills: "React", // both populated → split_skills NOT resolved
    };
    const { fixed, todo } = partitionGapsByResolution(gaps, resume, { templateIsAtsSafe: true });
    const fixedCats = fixed.map((e) => e.gap.category).sort();
    expect(fixedCats).toEqual(["image_or_nontext", "missing_contact"]); // both genuinely resolved
    expect(todo.map((e) => e.gap.category)).toEqual(["split_skills"]); // needs merge
    // content gap c1 excluded from both (structural-only in Phase A)
    expect([...fixed, ...todo].some((e) => e.gap.type === "content")).toBe(false);
  });

  test("todo is sorted high→low weight", () => {
    const resume = { skills: "A", technicalSkills: "B" }; // missing contact + split skills both unresolved
    const { todo } = partitionGapsByResolution(gaps, resume, { templateIsAtsSafe: true });
    // missing_contact (high) before split_skills (medium)
    expect(todo.map((e) => e.gap.category)).toEqual(["missing_contact", "split_skills"]);
  });
});

describe("sortGapsByWeight", () => {
  test("high before medium before low; stable, non-mutating", () => {
    const input = [
      { id: "1", weight: "low" },
      { id: "2", weight: "high" },
      { id: "3", weight: "medium" },
    ];
    const out = sortGapsByWeight(input);
    expect(out.map((g) => g.id)).toEqual(["2", "3", "1"]);
    expect(input.map((g) => g.id)).toEqual(["1", "2", "3"]); // original untouched
  });
});
