import { initialPracticeVoiceState, practiceVoiceReducer } from "./practiceInterviewVoiceMachine";

test("question playback keeps capture inactive until the candidate explicitly starts an answer", () => {
  let state = practiceVoiceReducer(initialPracticeVoiceState, { type: "START" });
  expect(state.phase).toBe("speaking");
  state = practiceVoiceReducer(state, { type: "SPEECH_FINISHED" });
  expect(state.phase).toBe("ready");
  expect(practiceVoiceReducer(state, { type: "SILENCE" })).toBe(state);
  expect(practiceVoiceReducer(state, { type: "START_ANSWER" })).toBe(state);
  state = practiceVoiceReducer(state, { type: "START_ANSWER", answerId: "turn-1" });
  expect(state).toMatchObject({ phase: "listening", answerId: "turn-1" });
});

test("explicit pause and resume preserve the active answer identity", () => {
  const listening = { phase: "listening", answerId: "turn-1", transcript: "kept" };
  const paused = practiceVoiceReducer(listening, { type: "PAUSE", answerId: "turn-1" });
  expect(paused).toMatchObject({ phase: "paused", answerId: "turn-1", transcript: "kept" });
  expect(practiceVoiceReducer(paused, { type: "RESUME", answerId: "another-turn" })).toBe(paused);
  expect(practiceVoiceReducer(paused, { type: "RESUME", answerId: "turn-1" })).toMatchObject({ phase: "listening", answerId: "turn-1" });
});

test("finish gates evaluation until final transcript arrives and stale answer events cannot change a newer turn", () => {
  const listening = { phase: "listening", answerId: "turn-2" };
  expect(practiceVoiceReducer(listening, { type: "FLUX_END_OF_TURN", trigger: "timeout", transcript: "Completed phrase." })).toBe(listening);
  const finalizing = practiceVoiceReducer(listening, { type: "FINISH_ANSWER", answerId: "turn-2" });
  expect(finalizing.phase).toBe("finalizing");
  expect(practiceVoiceReducer(finalizing, { type: "FINISH_ANSWER", answerId: "turn-2" })).toBe(finalizing);
  const evaluating = practiceVoiceReducer(finalizing, { type: "TRANSCRIPT_FINALIZED", answerId: "turn-2" });
  expect(evaluating.phase).toBe("evaluating");
  const newer = { phase: "listening", answerId: "turn-3" };
  expect(practiceVoiceReducer(newer, { type: "EVALUATION_DONE", answerId: "turn-2" })).toBe(newer);
  expect(practiceVoiceReducer(newer, { type: "PAUSE", answerId: "turn-2" })).toBe(newer);
});

test("evaluation and AI playback keep the microphone inactive; each turn starts fresh", () => {
  let state = practiceVoiceReducer(initialPracticeVoiceState, { type: "SUBMIT_TEXT", answerId: "turn-1" });
  expect(state.phase).toBe("evaluating");
  expect(practiceVoiceReducer(state, { type: "START_ANSWER", answerId: "turn-1" })).toBe(state);
  state = practiceVoiceReducer(state, { type: "EVALUATION_DONE", answerId: "turn-1" });
  expect(state.phase).toBe("ready");
  state = practiceVoiceReducer(state, { type: "QUESTION_SPEAK" });
  expect(state.phase).toBe("speaking");
  expect(practiceVoiceReducer(state, { type: "START_ANSWER", answerId: "follow-up-1" })).toBe(state);
  state = practiceVoiceReducer(state, { type: "SPEECH_FINISHED" });
  state = practiceVoiceReducer(state, { type: "START_ANSWER", answerId: "follow-up-1" });
  expect(state).toMatchObject({ phase: "listening", answerId: "follow-up-1" });
});

test("voice errors preserve answer identity and allow explicit retry or finish", () => {
  const failed = practiceVoiceReducer({ phase: "listening", answerId: "turn-1" }, { type: "ERROR", answerId: "turn-1", message: "offline" });
  expect(failed).toMatchObject({ phase: "error", answerId: "turn-1", message: "offline" });
  expect(practiceVoiceReducer(failed, { type: "RESUME", answerId: "turn-1" }).phase).toBe("listening");
  expect(practiceVoiceReducer(failed, { type: "FINISH_ANSWER", answerId: "turn-1" }).phase).toBe("finalizing");
});

test("a failed finalization remains recoverable and never enters evaluation", () => {
  const finalizing = practiceVoiceReducer({ phase: "listening", answerId: "turn-7" }, { type: "FINISH_ANSWER", answerId: "turn-7" });
  const failed = practiceVoiceReducer(finalizing, { type: "ERROR", answerId: "turn-7", message: "final transcript timed out" });
  expect(failed).toMatchObject({ phase: "error", answerId: "turn-7" });
  expect(practiceVoiceReducer(failed, { type: "TRANSCRIPT_FINALIZED", answerId: "turn-7" })).toBe(failed);
});
