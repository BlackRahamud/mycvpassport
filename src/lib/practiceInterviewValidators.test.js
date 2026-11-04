import { validatePracticeEvaluation, validatePracticeQuestionSet } from "./practiceInterviewValidators";

test("normalizes question sets and removes invalid multiple choice options", () => {
  const questions = Array.from({ length: 6 }, (_, index) => ({
    category: index === 0 ? "unknown" : "technical",
    question: `Question ${index + 1}`,
    choices: index === 1 ? ["A", "B", "C"] : [],
  }));
  const result = validatePracticeQuestionSet({ questions });
  expect(result).toHaveLength(6);
  expect(result[0].category).toBe("experience");
  expect(result[1].choices).toEqual([]);
  expect(validatePracticeQuestionSet({ questions: [{ question: "only one" }] })).toBeNull();
});

test("bounds evaluation scores and suppresses follow-ups at the limit", () => {
  const base = {
    score: 87.6,
    criteria: { relevance: 8, structure: 3 },
    strengths: ["Specific example"],
    follow_up_needed: true,
    follow_up_question: "What did you measure?",
  };
  const result = validatePracticeEvaluation(base, "Describe a project", { follow_up_count: 1 });
  expect(result.score).toBe(88);
  expect(result.criteria.relevance).toBe(5);
  expect(result.follow_up_needed).toBe(true);
  const capped = validatePracticeEvaluation(base, "Describe a project", { follow_up_count: 2 });
  expect(capped.follow_up_needed).toBe(false);
  expect(capped.follow_up_question).toBeNull();
  expect(validatePracticeEvaluation({ ...base, score: 140 }, "Q", {})).toBeNull();
});
