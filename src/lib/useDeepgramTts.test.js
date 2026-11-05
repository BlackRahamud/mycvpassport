import { act, renderHook } from "@testing-library/react";
import useDeepgramTts from "./useDeepgramTts";

jest.mock("../appSupabaseClient", () => ({ supabase: { auth: { getSession: jest.fn() } } }));

const { supabase } = require("../appSupabaseClient");
const originalFetch = global.fetch;

const mockSource = () => ({
  connect: jest.fn(),
  disconnect: jest.fn(),
  start: jest.fn(),
  stop: jest.fn(),
  onended: null,
  buffer: null,
});

class MockAudioContext {
  constructor() {
    this.state = "suspended";
    this.destination = {};
    this.sources = [];
    this.resume = jest.fn(async () => { this.state = "running"; });
    this.decodeAudioData = jest.fn(async () => ({ duration: 1 }));
    this.createBufferSource = jest.fn(() => {
      const source = mockSource();
      this.sources.push(source);
      return source;
    });
    this.close = jest.fn(async () => { this.state = "closed"; });
    MockAudioContext.instances.push(this);
  }
}
MockAudioContext.instances = [];

beforeEach(() => {
  supabase.auth.getSession.mockResolvedValue({ data: { session: { access_token: "user-session-token" } } });
  global.AudioContext = MockAudioContext;
  MockAudioContext.instances = [];
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    blob: async () => new Blob(["wav"], { type: "audio/wav" }),
  });
});

afterEach(() => {
  global.fetch = originalFetch;
  delete global.AudioContext;
  jest.restoreAllMocks();
});

test("unlocks Web Audio from the user gesture and plays the fetched Deepgram audio", async () => {
  const onEnded = jest.fn();
  const { result } = renderHook(() => useDeepgramTts());

  let unlocked;
  act(() => { unlocked = result.current.unlock(); });
  await act(async () => { await unlocked; });
  expect(MockAudioContext.instances[0].resume).toHaveBeenCalled();

  await act(async () => { await result.current.speak("Tell me about a project you led.", onEnded); });
  expect(global.fetch).toHaveBeenCalledWith("/api/deepgram-token", expect.objectContaining({
    headers: expect.objectContaining({ Authorization: "Bearer user-session-token" }),
    body: JSON.stringify({ action: "tts", text: "Tell me about a project you led." }),
  }));
  expect(result.current.status).toBe("speaking");
  expect(result.current.error).toBe("");

  const source = MockAudioContext.instances[0].sources[0];
  expect(source.start).toHaveBeenCalledWith(0);
  act(() => source.onended());
  expect(onEnded).toHaveBeenCalledTimes(1);
  expect(result.current.status).toBe("idle");
});

test("reports a playback failure once and allows a later retry", async () => {
  const { result } = renderHook(() => useDeepgramTts());
  await act(async () => { await result.current.unlock(); });

  const context = MockAudioContext.instances[0];
  context.decodeAudioData
    .mockRejectedValueOnce(new Error("decode failed"))
    .mockResolvedValueOnce({ duration: 1 });

  await act(async () => { await result.current.speak("First attempt."); });
  expect(result.current.status).toBe("error");
  expect(result.current.error).toContain("decode failed");

  await act(async () => { await result.current.speak("Retry attempt."); });
  expect(result.current.status).toBe("speaking");
  expect(result.current.error).toBe("");
  expect(context.sources).toHaveLength(1);
  expect(context.sources[0].start).toHaveBeenCalledWith(0);
});

test("cancel stops active playback and invalidates late audio responses", async () => {
  const { result } = renderHook(() => useDeepgramTts());
  await act(async () => { await result.current.unlock(); });
  await act(async () => { await result.current.speak("Approved question."); });

  const source = MockAudioContext.instances[0].sources[0];
  act(() => result.current.cancel());
  expect(source.stop).toHaveBeenCalled();
  expect(result.current.status).toBe("idle");
});
