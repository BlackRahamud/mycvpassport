export const initialPracticeVoiceState = { phase: "ready", answerId: null, message: "" };

const withPhase = (state, phase, extra = {}) => ({ ...state, ...extra, phase });
const isCurrentAnswer = (state, event) => !event.answerId || event.answerId === state.answerId;

export function practiceVoiceReducer(state, event) {
  switch (event.type) {
    case "START":
      return state.phase === "ready" || state.phase === "error"
        ? withPhase(state, "speaking", { message: "" }) : state;
    case "QUESTION_SPEAK":
      return state.phase === "ready" || state.phase === "speaking" || state.phase === "error"
        ? withPhase(state, "speaking", { answerId: null, message: "" }) : state;
    case "SPEECH_FINISHED":
      return state.phase === "speaking" ? withPhase(state, "ready") : state;
    case "SPEECH_FAILED":
      return state.phase === "speaking" ? withPhase(state, "ready", { message: event.message || "Read the question and start when you're ready." }) : state;
    case "START_ANSWER":
      return state.phase === "ready" && event.answerId
        ? withPhase(state, "listening", { answerId: event.answerId, message: "" }) : state;
    case "PAUSE":
      return state.phase === "listening" && isCurrentAnswer(state, event)
        ? withPhase(state, "paused") : state;
    case "RESUME":
      return (state.phase === "paused" || state.phase === "error") && isCurrentAnswer(state, event)
        ? withPhase(state, "listening", { message: "" }) : state;
    case "FINISH_ANSWER":
      return (state.phase === "listening" || state.phase === "paused" || state.phase === "error") && isCurrentAnswer(state, event)
        ? withPhase(state, "finalizing") : state;
    case "TRANSCRIPT_FINALIZED":
      return state.phase === "finalizing" && isCurrentAnswer(state, event)
        ? withPhase(state, "evaluating", { message: "" }) : state;
    case "SUBMIT_TEXT":
      return (state.phase === "ready" || state.phase === "error")
        ? withPhase(state, "evaluating", { answerId: event.answerId || null, message: "" }) : state;
    case "EVALUATION_DONE":
      return state.phase === "evaluating" && isCurrentAnswer(state, event)
        ? withPhase(state, "ready", { answerId: null, message: "" }) : state;
    case "ERROR":
      return state.phase === "ended" ? state : withPhase(state, "error", { message: event.message || "Voice is unavailable. You can type your answer instead." });
    case "END":
      return withPhase(state, "ended", { answerId: null, message: "" });
    case "RESET":
      return initialPracticeVoiceState;
    default:
      return state;
  }
}
