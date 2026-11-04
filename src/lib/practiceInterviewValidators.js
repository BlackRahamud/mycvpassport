export function boundedPracticeText(value, max) {
  return String(value || "").trim().slice(0, max);
}

export function validatePracticeQuestionSet(value) {
  if (!Array.isArray(value?.questions)) return null;
  const allowed = new Set(["technical", "experience", "behavioral", "situational", "motivation"]);
  const result = value.questions.slice(0, 8).map((q, i) => {
    const question = boundedPracticeText(q?.question, 500);
    if (!question) return null;
    const category = allowed.has(q?.category) ? q.category : "experience";
    const choices = Array.isArray(q?.choices)
      ? q.choices.map((choice) => boundedPracticeText(choice, 180)).filter(Boolean).slice(0, 4)
      : [];
    return { question_id: `q${i + 1}`, category, question, choices: choices.length === 4 ? choices : [] };
  }).filter(Boolean);
  return result.length >= 5 ? result : null;
}

export function validatePracticeEvaluation(value, question, turn) {
  const score = Number(value?.score);
  if (!Number.isFinite(score) || score < 0 || score > 100) return null;
  const list = (items) => Array.isArray(items) ? items.map((item) => boundedPracticeText(item, 300)).filter(Boolean).slice(0, 5) : [];
  const criteria = {};
  for (const key of ["relevance", "structure", "specificity", "clarity", "completeness", "accuracy"]) {
    const rating = value?.criteria?.[key];
    criteria[key] = rating == null ? null : (Number.isFinite(Number(rating)) ? Math.max(0, Math.min(5, Number(rating))) : null);
  }
  const followUpQuestion = boundedPracticeText(value?.follow_up_question, 500);
  const followUpNeeded = Boolean(value?.follow_up_needed && followUpQuestion && Number(turn?.follow_up_count || 0) < 2);
  return {
    score: Math.round(score),
    criteria,
    strengths: list(value?.strengths),
    improvements: list(value?.improvements),
    missing_evidence: list(value?.missing_evidence),
    suggested_answer: boundedPracticeText(value?.suggested_answer, 2400),
    follow_up_needed: followUpNeeded,
    follow_up_question: followUpNeeded ? followUpQuestion : null,
    follow_up_reason: followUpNeeded ? boundedPracticeText(value?.follow_up_reason, 300) : null,
    question: boundedPracticeText(question, 500),
  };
}
