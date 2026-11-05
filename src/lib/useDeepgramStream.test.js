import { appendFluxTurn, createFluxUrl, isCurrentDeepgramEvent, joinTranscriptSegments, mergePartialTranscript } from "./useDeepgramStream";

jest.mock("../appSupabaseClient", () => ({ supabase: { auth: { getSession: jest.fn() } } }));

test("Deepgram callbacks are accepted only for the active answer and connection generation", () => {
  expect(isCurrentDeepgramEvent("turn-2", 4, "turn-2", 4)).toBe(true);
  expect(isCurrentDeepgramEvent("turn-3", 5, "turn-2", 4)).toBe(false);
  expect(isCurrentDeepgramEvent("turn-2", 5, "turn-2", 4)).toBe(false);
  expect(isCurrentDeepgramEvent(null, 5, "turn-2", 4)).toBe(false);
});

test("connects to Flux V2 with explicit manual-turn configuration", () => {
  const url = new URL(createFluxUrl());
  expect(url.origin + url.pathname).toBe("wss://api.deepgram.com/v2/listen");
  expect(url.searchParams.get("model")).toBe("flux-general-en");
  expect(url.searchParams.get("encoding")).toBe("linear16");
  expect(url.searchParams.get("sample_rate")).toBe("16000");
  expect(url.searchParams.get("eot_threshold")).toBe("1.0");
  expect(url.searchParams.get("eot_timeout_ms")).toBe("60000");
});

test("only Flux EndOfTurn payloads become finalized transcript segments and duplicates are ignored", () => {
  const turn = { type: "TurnInfo", event: "EndOfTurn", turn_index: 1, audio_window_start: 0, audio_window_end: 3, transcript: "I led a team.", trigger: "timeout" };
  let result = appendFluxTurn([], new Set(), { ...turn, event: "Update" });
  expect(result.changed).toBe(false);
  result = appendFluxTurn(result.segments, result.seenTurnIds, turn);
  expect(result).toMatchObject({ segments: ["I led a team."], changed: true });
  const duplicate = appendFluxTurn(result.segments, result.seenTurnIds, turn);
  expect(duplicate.changed).toBe(false);
  expect(joinTranscriptSegments(["I led", "a team."])).toBe("I led a team.");
});

test("partial updates merge across reconnection without repeating overlapping words", () => {
  expect(mergePartialTranscript("I managed a team", "a team of six engineers")).toBe("I managed a team of six engineers");
  expect(mergePartialTranscript("I managed", "the launch")).toBe("I managed the launch");
});
