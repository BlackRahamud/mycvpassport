jest.mock("@supabase/supabase-js", () => ({ createClient: jest.fn() }));

const { createClient } = require("@supabase/supabase-js");
const originalFetch = global.fetch;
process.env.SUPABASE_URL = "https://supabase.example";
process.env.SUPABASE_ANON_KEY = "anon-test-key";
const handler = require("../../api/deepgram-token").default;

function response() {
  return {
    headers: {},
    statusCode: 200,
    setHeader(name, value) { this.headers[name] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    send(body) { this.body = body; return this; },
  };
}

function request(method = "POST", authorization = "Bearer user-jwt") {
  return { method, headers: { authorization } };
}

async function loadHandler(user = { id: "candidate-token-test" }) {
  createClient.mockReturnValue({ auth: { getUser: jest.fn().mockResolvedValue({ data: { user }, error: null }) } });
  return handler;
}

afterEach(() => {
  delete process.env.DEEPGRAM_API_KEY;
  global.fetch = originalFetch;
  jest.clearAllMocks();
});

test("rejects unauthenticated calls and sets no-store", async () => {
  const handler = await loadHandler();
  const res = response();
  await handler(request("POST", ""), res);
  expect(res.statusCode).toBe(401);
  expect(res.headers["Cache-Control"]).toContain("no-store");
  expect(global.fetch).toBe(originalFetch);
});

test("rejects wrong methods", async () => {
  const handler = await loadHandler();
  const res = response();
  await handler(request("GET"), res);
  expect(res.statusCode).toBe(405);
  expect(res.headers.Allow).toBe("POST");
});

test("handles missing provider key without revealing details", async () => {
  const handler = await loadHandler();
  const res = response();
  await handler(request(), res);
  expect(res.statusCode).toBe(503);
  expect(res.body.error).toMatch(/type your answer/i);
  expect(JSON.stringify(res.body)).not.toContain("anon-test-key");
});

test("returns only a short-lived token and expiry, never the permanent key", async () => {
  const handler = await loadHandler();
  const permanentKey = "deepgram-permanent-test-secret";
  const accessToken = "temporary-jwt-test-token";
  process.env.DEEPGRAM_API_KEY = permanentKey;
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ access_token: accessToken, expires_in: 60 }) });
  const res = response();
  await handler(request(), res);
  expect(res.statusCode).toBe(200);
  expect(res.body).toEqual({ ok: true, access_token: accessToken, expires_in: 60 });
  expect(res.headers["Cache-Control"]).toContain("no-store");
  expect(JSON.stringify(res.body)).not.toContain(permanentKey);
  expect(global.fetch).toHaveBeenCalledWith("https://api.deepgram.com/v1/auth/grant", expect.objectContaining({
    method: "POST",
    headers: expect.objectContaining({ Authorization: `Token ${permanentKey}` }),
    body: JSON.stringify({ ttl_seconds: 60 }),
  }));
});

test("authenticated TTS action proxies exact text to Deepgram and returns audio without exposing the key", async () => {
  const handler = await loadHandler({ id: "candidate-tts-test" });
  const permanentKey = "deepgram-permanent-tts-secret";
  const audio = Buffer.from([82, 73, 70, 70, 1, 2, 3, 4]);
  process.env.DEEPGRAM_API_KEY = permanentKey;
  global.fetch = jest.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => audio.buffer.slice(audio.byteOffset, audio.byteOffset + audio.byteLength) });
  const res = response();
  const req = request();
  req.body = { action: "tts", text: "Tell me about a project you led." };
  await handler(req, res);
  expect(res.statusCode).toBe(200);
  expect(res.headers["Content-Type"]).toBe("audio/wav");
  expect(res.body).toEqual(audio);
  expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining("https://api.deepgram.com/v1/speak?model=aura-2-thalia-en"), expect.objectContaining({
    method: "POST",
    headers: expect.objectContaining({ Authorization: `Token ${permanentKey}`, Accept: "audio/wav" }),
    body: JSON.stringify({ text: "Tell me about a project you led." }),
  }));
});

test("rejects unsupported voice actions and oversized TTS text before provider calls", async () => {
  const handler = await loadHandler({ id: "candidate-invalid-tts-test" });
  process.env.DEEPGRAM_API_KEY = "deepgram-permanent-test-secret";
  const badAction = response();
  const badActionReq = request();
  badActionReq.body = { action: "agent" };
  await handler(badActionReq, badAction);
  expect(badAction.statusCode).toBe(400);
  const oversized = response();
  const oversizedReq = request();
  oversizedReq.body = { action: "tts", text: "x".repeat(1201) };
  await handler(oversizedReq, oversized);
  expect(oversized.statusCode).toBe(400);
  expect(global.fetch).toBe(originalFetch);
});

test("provider failures return safe errors and do not log token material", async () => {
  const handler = await loadHandler();
  process.env.DEEPGRAM_API_KEY = "deepgram-permanent-test-secret";
  global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 403, text: async () => "sensitive provider detail" });
  const log = jest.spyOn(console, "error").mockImplementation(() => {});
  const res = response();
  await handler(request(), res);
  expect(res.statusCode).toBe(502);
  expect(JSON.stringify(res.body)).not.toMatch(/sensitive provider detail|deepgram-permanent/);
  expect(log).not.toHaveBeenCalled();
  log.mockRestore();
});

test("applies a conservative per-user issuance ceiling", async () => {
  const handler = await loadHandler({ id: "candidate-rate-limit-test" });
  process.env.DEEPGRAM_API_KEY = "deepgram-permanent-test-secret";
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ access_token: "short-token", expires_in: 60 }) });
  for (let i = 0; i < 12; i += 1) {
    const res = response();
    await handler(request(), res);
    expect(res.statusCode).toBe(200);
  }
  const limited = response();
  await handler(request(), limited);
  expect(limited.statusCode).toBe(429);
  expect(global.fetch).toHaveBeenCalledTimes(12);
});


