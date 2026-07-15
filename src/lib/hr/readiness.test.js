import {
  buildReadiness,
  evaluateScreening,
  flattenScreeningQuestions,
  knockoutSynthesis,
  parseMoney,
  parseNoticeDays,
  missingGaps,
  humanJoin,
} from "./readiness";

describe("parseMoney", () => {
  it("reads plain, comma and k formats", () => {
    expect(parseMoney("AED 9,500")).toBe(9500);
    expect(parseMoney("9.5k")).toBe(9500);
    expect(parseMoney("5500")).toBe(5500);
    expect(parseMoney("")).toBeNull();
    expect(parseMoney("negotiable")).toBeNull();
  });
});

describe("parseNoticeDays", () => {
  it("reads immediate, days, weeks, months", () => {
    expect(parseNoticeDays("Immediate")).toBe(0);
    expect(parseNoticeDays("60 days")).toBe(60);
    expect(parseNoticeDays("2 months")).toBe(60);
    expect(parseNoticeDays("6 weeks")).toBe(42);
    expect(parseNoticeDays("whenever")).toBeNull();
  });
});

describe("humanJoin", () => {
  it("handles none, one, two and many with no Oxford comma", () => {
    expect(humanJoin([])).toBe("");
    expect(humanJoin(["visa status"])).toBe("visa status");
    expect(humanJoin(["visa status", "notice period"])).toBe("visa status and notice period");
    expect(humanJoin(["current location", "visa status", "notice period"]))
      .toBe("current location, visa status and notice period");
  });
  it("drops empty entries", () => {
    expect(humanJoin(["visa status", "", null, "notice period"]))
      .toBe("visa status and notice period");
  });
});

describe("missingGaps", () => {
  const job = { market: "gulf", salary_max: 7000, currency: "AED" };

  it("returns plain phrases only for absent fields, in row order", () => {
    const out = buildReadiness({
      cv: { location: "Deira, Dubai", nationality: "Indian", summary: "ECNR" },
      application: {},
      job,
    });
    // location + nationality known; visa, notice, salary absent.
    expect(missingGaps(out)).toEqual(["visa status", "notice period", "salary expectation"]);
  });

  it("is empty when the CV states everything", () => {
    const out = buildReadiness({
      cv: {
        location: "Deira, Dubai", nationality: "Indian",
        visa_status: "Visit visa", notice_period: "Immediate",
        salary_expectation: "AED 5,500", summary: "ECNR",
      },
      application: {},
      job,
    });
    expect(missingGaps(out)).toEqual([]);
  });

  it("uses a clean phrase for nationality, not the comma label", () => {
    const out = buildReadiness({ cv: {}, application: {}, job });
    expect(missingGaps(out)).toContain("nationality");
    expect(missingGaps(out)).toContain("current location");
  });
});

describe("buildReadiness", () => {
  const job = { market: "gulf", salary_max: 7000, currency: "AED" };

  it("clean in-market candidate reads all ok", () => {
    const out = buildReadiness({
      cv: {
        location: "Deira, Dubai",
        nationality: "Indian",
        visa_status: "Visit visa, 30 days remaining",
        notice_period: "Immediate",
        salary_expectation: "AED 5,500",
        summary: "holds an ECNR passport",
      },
      application: {},
      job,
    });
    expect(out.flagCount).toBe(0);
    expect(out.missingCount).toBe(0);
    expect(out.knockouts).toEqual([]);
    const salary = out.rows.find((r) => r.key === "salary");
    expect(salary.tone).toBe("ok");
    expect(salary.note).toBe("Within budget");
    const passport = out.rows.find((r) => r.key === "passport");
    expect(passport.note).toBe("No emigration clearance needed");
  });

  it("offshore + ECR + over-ceiling salary flags with reasons and a salary knockout", () => {
    const out = buildReadiness({
      cv: {
        location: "Bengaluru, India",
        nationality: "Indian",
        summary: "ECR passport holder",
        notice_period: "60 days",
        salary_expectation: "AED 9,500 plus family medical",
      },
      application: { visa_status: "Needs sponsorship" },
      job,
    });
    const byKey = Object.fromEntries(out.rows.map((r) => [r.key, r]));
    expect(byKey.location.tone).toBe("flag");
    expect(byKey.location.note).toMatch(/relocation/i);
    expect(byKey.passport.tone).toBe("flag");
    expect(byKey.passport.note).toMatch(/emigration clearance/i);
    expect(byKey.visa.tone).toBe("flag");
    expect(byKey.notice.tone).toBe("flag");
    expect(byKey.salary.tone).toBe("flag");
    expect(byKey.salary.note).toBe("Above the AED 7,000 ceiling");
    expect(out.knockouts).toEqual(["salary"]);
    expect(out.flagCount).toBe(5);
  });

  it("missing fields degrade to Not stated, never a crash", () => {
    const out = buildReadiness({ cv: { location: "Sharjah, UAE", notice_period: "1 month" }, application: {}, job });
    const missing = out.rows.filter((r) => r.tone === "missing");
    expect(missing.map((r) => r.key).sort()).toEqual(["passport", "salary", "visa"]);
    missing.forEach((r) => {
      expect(r.value).toBe("Not stated");
      expect(r.note).toBe("Confirm with the candidate");
    });
    expect(out.hasMissing).toBe(true);
    expect(out.knockouts).toEqual([]);
  });

  it("handles a completely empty snapshot", () => {
    const out = buildReadiness({});
    expect(out.rows).toHaveLength(5);
    expect(out.missingCount).toBe(5);
    expect(out.flagCount).toBe(0);
  });
});

describe("screening", () => {
  const grouped = [
    { categoryKey: "background-check", questions: [
      { text: "Willing to work onsite with weekend rotations?", responseType: "yes-no", idealAnswer: "yes", mustHave: true },
      { text: "Do you hold a valid UAE driving license?", responseType: "yes-no", idealAnswer: "yes", mustHave: false },
    ] },
  ];

  it("flattens grouped and flat question shapes", () => {
    expect(flattenScreeningQuestions(grouped)).toHaveLength(2);
    expect(flattenScreeningQuestions([{ text: "Q1" }])).toHaveLength(1);
    expect(flattenScreeningQuestions(null)).toEqual([]);
  });

  it("stored answer status wins; must-have fail is the knockout", () => {
    const { items, failedMustHave } = evaluateScreening(grouped, [
      { answer: "I am looking for remote or hybrid options initially.", status: "fail" },
      { answer: "No, planning to take classes soon.", status: "neutral" },
    ]);
    expect(items[0].status).toBe("fail");
    expect(items[0].note).toMatch(/Fails a stated requirement/);
    expect(items[1].status).toBe("neutral");
    expect(failedMustHave).toBe(items[0]);
  });

  it("derives pass/fail from yes-no answers when no status is stored", () => {
    const { items, failedMustHave } = evaluateScreening(grouped, ["Yes, absolutely.", "No"]);
    expect(items[0].status).toBe("pass");
    expect(items[1].status).toBe("fail");
    expect(items[1].mustHave).toBe(false);
    expect(failedMustHave).toBeNull();
  });

  it("no answers → unanswered, no fake knockout", () => {
    const { items, failedMustHave } = evaluateScreening(grouped, null);
    expect(items.every((it) => it.status === "unanswered")).toBe(true);
    expect(failedMustHave).toBeNull();
  });
});

describe("knockoutSynthesis", () => {
  it("joins parts into one readable line without dashes", () => {
    const line = knockoutSynthesis({
      readiness: { knockouts: ["salary"] },
      screening: { failedMustHave: { question: "x" } },
    });
    expect(line).toBe("Strong on skills, but salary and a screening requirement are knockouts.");
    expect(/[–—]/.test(line)).toBe(false);
  });

  it("null when nothing is a computable knockout", () => {
    expect(knockoutSynthesis({ readiness: { knockouts: [] }, screening: { failedMustHave: null } })).toBeNull();
  });
});
