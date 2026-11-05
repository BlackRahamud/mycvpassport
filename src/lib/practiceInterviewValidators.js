export function boundedPracticeText(value, max) {
  return String(value || "").trim().slice(0, max);
}

export const PRACTICE_INTERVIEW_PHRASE_LIBRARY = Object.freeze({
  neutral: [
    "Hmm, interesting.",
    "I see.",
    "That's interesting. Tell me more.",
    "Right, I understand.",
    "Interesting perspective.",
    "Okay, I follow.",
    "That's an interesting point.",
  ],
  probing: [
    "Let's go a little deeper into that.",
    "Could you walk me through your thinking?",
    "What was your personal contribution?",
    "What happened next?",
    "Could you expand on that?",
    "What led you to that decision?",
    "What did you learn from that experience?",
  ],
  clarification: [
    "Could you be a little more specific?",
    "Can you give me a practical example?",
    "I want to understand that a little better.",
    "What do you mean by that in practical terms?",
    "Could you explain that another way?",
  ],
  challenging: [
    "What if things hadn't gone according to plan?",
    "How would you respond if someone challenged that approach?",
    "Are there any other ways you could have handled that situation?",
    "What would you do differently with the benefit of hindsight?",
    "How would you handle that if you had fewer resources?",
  ],
  transition: [
    "Alright, let's move on.",
    "I'd like to explore another area.",
    "Let's switch gears for a moment.",
    "Let me ask you about a different situation.",
    "I'd like to take that in a slightly different direction.",
  ],
});

const approvedPracticePhrases = new Set(Object.values(PRACTICE_INTERVIEW_PHRASE_LIBRARY).flat());

export function validatePracticeConversationalPhrase(value) {
  const phrase = boundedPracticeText(value, 140);
  return approvedPracticePhrases.has(phrase) ? phrase : null;
}

export function validatePracticeConversationalResponse(value) {
  const response = boundedPracticeText(value, 240).replace(/\s+/g, " ");
  if (!response || response.length < 8 || /\b(score|scored|grade|graded|excellent answer|poor answer|weak answer|strong answer|you passed|you failed)\b/i.test(response)) return null;
  if (/[<>\u0000-\u001F]/.test(response)) return null;
  return response;
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
