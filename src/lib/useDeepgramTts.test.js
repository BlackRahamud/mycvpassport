import { act, renderHook } from "@testing-library/react";
import useDeepgramTts from "./useDeepgramTts";

jest.mock("../appSupabaseClient", () => ({ supabase: { auth: { getSession: jest.fn() } } }));

const { supabase } = require("../appSupabaseClient");
const originalFetch = global.fetch;

class MockAudio {
  constructor(src) { this.src = src; this.pause = jest.fn(); this.load = jest.fn(); this.play = jest.fn().mockResolvedValue(undefined); MockAudio.instances.push(this); }
  removeAttribute(name) { this[name] = ""; }
}
MockAudio.instances = [];

beforeEach(() => {
  supabase.auth.getSession.mockResolvedValue({ data: { session: { access_token: "user-session-token" } } });
  global.Audio = MockAudio;
  MockAudio.instances = [];
  global.fetch = jest.fn().mockResolvedValue({ ok: true, blob: async () => new Blob(["wav"], { type: "audio/wav" }) });
  Object.defineProperty(URL, "createObjectURL", { configurable: true, value: jest.fn(() => "blob:question-audio") });
  Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: jest.fn() });
});

afterEach(() => {
  global.fetch = originalFetch;
  jest.restoreAllMocks();
});

test("authenticates exact approved question text, plays audio and cleans it up after playback", async () => {
  const onEnded = jest.fn();
  const { result } = renderHook(() => useDeepgramTts());
  await act(async () => { await result.current.speak("Tell me about a project you led.", onEnded); });
  expect(global.fetch).toHaveBeenCalledWith("/api/deepgram-token", expect.objectContaining({
    headers: expect.objectContaining({ Authorization: "Bearer user-session-token" }),
    body: JSON.stringify({ action: "tts", text: "Tell me about a project you led." }),
  }));
  expect(result.current.status).toBe("speaking");
  expect(result.current.error).toBe("");
  // The active media object is owned by the hook and its ended event returns the UI to idle.
  const media = MockAudio.instances[0];
  act(() => media.onended());
  expect(onEnded).toHaveBeenCalledTimes(1);
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:question-audio");
});

test("cancel and unmount stop playback and revoke the temporary object URL", async () => {
  const { result, unmount } = renderHook(() => useDeepgramTts());
  await act(async () => { await result.current.speak("Approved question."); });
  const media = MockAudio.instances[0];
  act(() => result.current.cancel());
  expect(media.pause).toHaveBeenCalled();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:question-audio");
  unmount();
});
