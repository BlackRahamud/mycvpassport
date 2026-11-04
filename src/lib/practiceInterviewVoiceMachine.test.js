import { initialPracticeVoiceState, practiceVoiceReducer } from "./practiceInterviewVoiceMachine";

test("voice flow requests permission, speaks, then listens", () => {
  let state = practiceVoiceReducer(initialPracticeVoiceState, { type: "START" });
  expect(state.phase).toBe("requesting_permission");
  state = practiceVoiceReducer(state, { type: "PERMISSION_GRANTED" });
  expect(state.phase).toBe("speaking");
  state = practiceVoiceReducer(state, { type: "SPEECH_FINISHED" });
  expect(state.phase).toBe("listening");
});

test("unexpected recognition end restarts while intentional stop does not", () => {
  const restarted = practiceVoiceReducer({ phase: "listening" }, { type: "RECOGNITION_ENDED" });
  expect(restarted).toEqual({ phase: "listening", restarting: true });
  expect(practiceVoiceReducer(restarted, { type: "RECOGNITION_ENDED", intentional: "pause" }).phase).toBe("paused");
  expect(practiceVoiceReducer(restarted, { type: "RECOGNITION_ENDED", intentional: "finish" }).phase).toBe("editing");
});

test("permission and recognition errors enter a usable fallback state", () => {
  expect(practiceVoiceReducer(initialPracticeVoiceState, { type: "PERMISSION_DENIED", message: "Denied" })).toEqual({ phase: "fallback", message: "Denied" });
  expect(practiceVoiceReducer({ phase: "listening" }, { type: "RECOGNITION_ERROR", message: "Unavailable" }).phase).toBe("fallback");
});

test("finish answer requires transcript review before submission", () => {
  let state = practiceVoiceReducer({ phase: "listening" }, { type: "FINISH_ANSWER" });
  expect(state.phase).toBe("finalizing");
  state = practiceVoiceReducer(state, { type: "TRANSCRIPT_READY" });
  expect(state.phase).toBe("editing");
  state = practiceVoiceReducer(state, { type: "SUBMIT" });
  expect(state.phase).toBe("evaluating");
});

test("evaluation can continue voice or return to review", () => {
  expect(practiceVoiceReducer({ phase: "evaluating" }, { type: "EVALUATION_DONE", voiceActive: true }).phase).toBe("speaking");
  expect(practiceVoiceReducer({ phase: "evaluating" }, { type: "EVALUATION_DONE", voiceActive: false }).phase).toBe("review");
  expect(practiceVoiceReducer({ phase: "evaluating" }, { type: "RETRY_READY", voiceActive: true }).phase).toBe("editing");
});
