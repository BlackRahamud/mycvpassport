export const initialPracticeVoiceState = { phase: "ready" };

export function practiceVoiceReducer(state, event) {
  switch (event.type) {
    case "START": return { phase: "requesting_permission" };
    case "PERMISSION_GRANTED": return { phase: "speaking" };
    case "PERMISSION_DENIED": return { phase: "fallback", message: event.message };
    case "SPEECH_FINISHED": return { phase: "listening" };
    case "SPEECH_FAILED": return { phase: event.canListen ? "listening" : "fallback", message: event.message };
    case "RECOGNITION_ENDED":
      if (event.intentional === "finish") return { phase: "editing" };
      if (event.intentional === "pause") return { phase: "paused" };
      return { phase: "listening", restarting: true };
    case "RECOGNITION_ERROR": return { phase: "fallback", message: event.message };
    case "PAUSE": return { phase: "paused" };
    case "RESUME": return { phase: "listening" };
    case "FINISH_ANSWER": return { phase: "finalizing" };
    case "TRANSCRIPT_READY": return { phase: "editing" };
    case "SUBMIT": return { phase: "evaluating" };
    case "EVALUATION_DONE": return { phase: event.voiceActive ? "speaking" : "review" };
    case "RETRY_READY": return { phase: event.voiceActive ? "editing" : "ready" };
    case "END": return { phase: "ended" };
    case "RESET": return initialPracticeVoiceState;
    default: return state;
  }
}
