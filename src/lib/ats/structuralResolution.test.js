import {
  classifyStructuralGap,
  evaluateStructuralGap,
} from "./structuralResolution";

describe("classifyStructuralGap", () => {
  test.each([
    ["The header reads C O N T A C T with spaced letters", "letter_spacing"],
    ["Section titles use heavy letter-spacing", "letter_spacing"],
    ["Skills are split across two separate sections", "split_skills"],
    ["No contact block / email detected at the top", "missing_contact"],
    ['Body text contains "Page 1 of 2" page markers', "page_break_marker"],
    ["Layout uses a two-column table that parsers mis-read", "tables_columns"],
    ["CV is image-heavy with a scanned photo", "image_or_nontext"],
    ["Uses a decorative script font", "decorative_fonts"],
    ["Inconsistent date format across roles", "date_format"],
    ["KEY METRICS block with unsubstantiated figures", "irrelevant_block"],
    ["Something totally unrecognised about the layout", "unknown"],
  ])("%s → %s", (claim, expected) => {
    expect(classifyStructuralGap(claim)).toBe(expected);
  });
});

describe("evaluateStructuralGap — honest resolution", () => {
  const FULL_CONTACT = { name: "Jane Doe", email: "jane@x.com", phone: "+971 50 000 0000" };

  test("missing_contact: all present → resolved ✓", () => {
    const r = evaluateStructuralGap({ category: "missing_contact" }, { ...FULL_CONTACT });
    expect(r.status).toBe("resolved");
    expect(r.resolved).toBe(true);
  });

  test("missing_contact: missing email → NOT ✓ (focus contact email)", () => {
    const r = evaluateStructuralGap({ category: "missing_contact" }, { name: "Jane", phone: "123" });
    expect(r.status).toBe("action");
    expect(r.resolved).toBe(false);
    expect(r.action).toEqual({ kind: "focus_field", field: "contact", missing: ["email"] });
    expect(r.cta).toBe("Add email");
  });

  test("split_skills: both sections populated → merge action, NOT ✓", () => {
    const r = evaluateStructuralGap({ category: "split_skills" }, { skills: "A, B", technicalSkills: "React, Node" });
    expect(r.status).toBe("action");
    expect(r.action).toEqual({ kind: "merge_skills" });
  });

  test("split_skills: single section → resolved ✓", () => {
    const r = evaluateStructuralGap({ category: "split_skills" }, { skills: "A, B", technicalSkills: "" });
    expect(r.status).toBe("resolved");
  });

  test("page_break_marker: marker still in a bullet → NOT ✓ (remove that line)", () => {
    const cv = { experience: [{ points: "Did X\nPage 1 of 2\nDid Y" }] };
    const r = evaluateStructuralGap({ category: "page_break_marker" }, cv);
    expect(r.status).toBe("action");
    expect(r.action).toMatchObject({ kind: "remove_element", target: { kind: "bullet", expIndex: 0, lineIndex: 1 } });
    expect(r.cta).toBe("Remove line");
  });

  test("page_break_marker: clean content → resolved ✓", () => {
    const r = evaluateStructuralGap({ category: "page_break_marker" }, { summary: "Clean summary." });
    expect(r.status).toBe("resolved");
  });

  test("letter_spacing: spaced letters remain in name → NOT ✓ (focus contact)", () => {
    const r = evaluateStructuralGap({ category: "letter_spacing" }, { name: "J A N E   D O E" });
    expect(r.status).toBe("action");
    expect(r.action).toEqual({ kind: "focus_field", field: "contact" });
  });

  test("letter_spacing: clean → resolved ✓", () => {
    const r = evaluateStructuralGap({ category: "letter_spacing" }, { name: "Jane Doe", summary: "Hello there world." });
    expect(r.status).toBe("resolved");
  });

  test("tables_columns: ATS-safe template → ✓; non-ATS → action; unknown → review", () => {
    expect(evaluateStructuralGap({ category: "tables_columns" }, {}, { templateIsAtsSafe: true }).status).toBe("resolved");
    expect(evaluateStructuralGap({ category: "tables_columns" }, {}, { templateIsAtsSafe: false }).action).toEqual({ kind: "goto_template" });
    expect(evaluateStructuralGap({ category: "tables_columns" }, {}, {}).status).toBe("review");
  });

  test("tables_columns: WITH a recommendation → one-click named switch (gives the answer)", () => {
    const r = evaluateStructuralGap({ category: "tables_columns" }, {}, { templateIsAtsSafe: false, atsRecommendation: { id: 19, name: "UAE ATS" } });
    expect(r.action).toEqual({ kind: "switch_template", templateId: 19 });
    expect(r.cta).toBe("Switch to UAE ATS");
  });

  test("image_or_nontext and decorative_fonts → always resolved (genuinely true of builder output)", () => {
    expect(evaluateStructuralGap({ category: "image_or_nontext" }, {}).status).toBe("resolved");
    expect(evaluateStructuralGap({ category: "decorative_fonts" }, {}).status).toBe("resolved");
  });

  test("date_format: all dated → ✓; missing date → action; no experience → review", () => {
    expect(evaluateStructuralGap({ category: "date_format" }, { experience: [{ startDate: "2020" }, { period: "2021-2022" }] }).status).toBe("resolved");
    expect(evaluateStructuralGap({ category: "date_format" }, { experience: [{ startDate: "2020" }, { role: "x" }] }).status).toBe("action");
    expect(evaluateStructuralGap({ category: "date_format" }, { experience: [] }).status).toBe("review");
  });

  test("unknown → review, never auto-✓", () => {
    const r = evaluateStructuralGap({ category: "unknown" }, { name: "Jane" });
    expect(r.status).toBe("review");
    expect(r.resolved).toBe(false);
  });

  describe("unknown content gap → open the SPECIFIC role (not top of section)", () => {
    test("evidence pins a bullet → open that entry, focus points", () => {
      const cv = {
        experience: [
          { role: "X", company: "Y", points: "Generic duty" },
          { role: "Manager", company: "Globex", points: "Led the regional sales pipeline end to end" },
        ],
      };
      const r = evaluateStructuralGap(
        { category: "unknown", label: "Job descriptions not anchored to employer", evidence: "Led the regional sales pipeline end to end" },
        cv,
      );
      expect(r.action).toMatchObject({ kind: "open_experience", expIndex: 1, focus: "points" });
      expect(r.cta).toBe("Open role");
    });

    test("future-dated role (verified vs today) → open THAT entry, focus the start date", () => {
      const now = new Date("2026-07-15");
      const cv = { experience: [
        { role: "Analyst", company: "A", startDate: "01/2020", endDate: "12/2022" },
        { role: "Senior Analyst", company: "Globex", startDate: "03/2027", endDate: "" },
      ] };
      const r = evaluateStructuralGap(
        { category: "unknown", label: "Future-dated role", evidence: "Senior Analyst Globex 03/2027" },
        cv,
        { now },
      );
      expect(r.action).toMatchObject({ kind: "open_experience", expIndex: 1, focus: "startDate" });
      expect(r.cta).toBe("Fix date");
    });

    test("future-date flag CLEARS once the date is in the past (live re-validation, real current date)", () => {
      const now = new Date("2026-07-15");
      // 10/2025 is nine months in the PAST — must resolve, not stay flagged.
      const cv = { experience: [{ role: "Senior Analyst", company: "Globex", startDate: "10/2025", endDate: "" }] };
      const r = evaluateStructuralGap(
        { category: "unknown", label: "Future-dated employment start", evidence: "current role starting 10/2025" },
        cv,
        { now },
      );
      expect(r.status).toBe("resolved");
      expect(r.action).toBeNull();
    });

    test("unlocatable → falls back to section review (no false precision)", () => {
      const r = evaluateStructuralGap({ category: "unknown", label: "Something vague", evidence: "" }, { experience: [{ role: "A" }] });
      expect(r.action).toEqual({ kind: "focus_field", field: "experience" });
    });
  });

  describe("irrelevant_block (junk → remove, not rewrite)", () => {
    const gap = { category: "irrelevant_block", label: "KEY METRICS block", evidence: "key metrics revenue inflated vanity figures" };

    test("located in a bullet → Remove this", () => {
      const cv = { experience: [{ points: "Led team\nKey metrics: revenue inflated by vanity figures\nShipped" }] };
      const r = evaluateStructuralGap(gap, cv);
      expect(r.status).toBe("action");
      expect(r.action).toMatchObject({ kind: "remove_element", target: { kind: "bullet", expIndex: 0, lineIndex: 1 } });
      expect(r.cta).toBe("Remove this");
    });

    test("located in a core field (summary) → review & edit, NOT a blind delete", () => {
      const cv = { summary: "Key metrics: revenue inflated by vanity figures across the org" };
      const r = evaluateStructuralGap(gap, cv);
      expect(r.status).toBe("action");
      expect(r.action).toEqual({ kind: "focus_field", field: "summary" });
      expect(r.cta).toBe("Review & edit");
    });

    test("genuinely absent from cv_data → resolved ('removed in the clean rebuild')", () => {
      const cv = { name: "Jane", summary: "Senior cloud engineer focused on reliability" };
      const r = evaluateStructuralGap(gap, cv);
      expect(r.status).toBe("resolved");
      expect(r.reason).toMatch(/removed in the clean rebuild/i);
    });

    test("too-vague to locate → review, never a false ✓", () => {
      const r = evaluateStructuralGap({ category: "irrelevant_block", label: "metrics", evidence: "metrics" }, { summary: "metrics here" });
      expect(r.status).toBe("review");
      expect(r.resolved).toBe(false);
    });
  });
});
