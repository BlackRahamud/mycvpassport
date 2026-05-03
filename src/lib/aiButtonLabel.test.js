import { deriveAiButtonLabel, isAiExhausted } from "./aiButtonLabel";

describe("deriveAiButtonLabel — Summary button (idleLabel 'Write with AI')", () => {
  const base = { idleLabel: "Write with AI", loadingLabel: "Writing..." };

  test("paid tier (creditsRemaining = null) shows no counter", () => {
    expect(
      deriveAiButtonLabel({ ...base, aiLoading: false, creditsRemaining: null })
    ).toBe("Write with AI");
  });

  test("free tier with 2 credits shows '2 free left'", () => {
    expect(
      deriveAiButtonLabel({ ...base, aiLoading: false, creditsRemaining: 2 })
    ).toBe("Write with AI (2 free left)");
  });

  test("free tier with 1 credit shows '1 free left'", () => {
    expect(
      deriveAiButtonLabel({ ...base, aiLoading: false, creditsRemaining: 1 })
    ).toBe("Write with AI (1 free left)");
  });

  test("free tier exhausted (creditsRemaining = 0) shows upgrade CTA, not the verb", () => {
    expect(
      deriveAiButtonLabel({ ...base, aiLoading: false, creditsRemaining: 0 })
    ).toBe("Upgrade for unlimited AI");
  });

  test("aiLoading wins over credit state", () => {
    expect(
      deriveAiButtonLabel({ ...base, aiLoading: true, creditsRemaining: 1 })
    ).toBe("Writing...");
  });

  test("aiLoading without a loadingLabel falls through to credit-state copy", () => {
    expect(
      deriveAiButtonLabel({
        idleLabel: "Write with AI",
        aiLoading: true,
        creditsRemaining: 2,
      })
    ).toBe("Write with AI (2 free left)");
  });
});

describe("deriveAiButtonLabel — Experience 'Improve with AI' entry", () => {
  test("free tier, 1 left → '(1 free left)' with the right verb", () => {
    expect(
      deriveAiButtonLabel({
        idleLabel: "Improve with AI",
        aiLoading: false,
        creditsRemaining: 1,
      })
    ).toBe("Improve with AI (1 free left)");
  });

  test("free tier exhausted → upgrade CTA regardless of verb", () => {
    expect(
      deriveAiButtonLabel({
        idleLabel: "Improve with AI",
        aiLoading: false,
        creditsRemaining: 0,
      })
    ).toBe("Upgrade for unlimited AI");
  });
});

describe("isAiExhausted", () => {
  test("0 means exhausted", () => {
    expect(isAiExhausted(0)).toBe(true);
  });

  test("1 and 2 mean credits available", () => {
    expect(isAiExhausted(1)).toBe(false);
    expect(isAiExhausted(2)).toBe(false);
  });

  test("null (paid tier) is never exhausted", () => {
    expect(isAiExhausted(null)).toBe(false);
  });

  test("undefined is never exhausted", () => {
    expect(isAiExhausted(undefined)).toBe(false);
  });
});
