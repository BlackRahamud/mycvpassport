/* Gate E3, server side. The browser gate is not the gate.
   Calls the REAL api/ai.js candidate_verdict handler with a stubbed
   Supabase and asserts it refuses a free employer even when the request
   bypasses the UI entirely, which is the only way the paywall is real.

   Also asserts the deliberate fail-open: if the entitlement lookup
   errors, a paying customer must not be blocked by a database blip.

   Run: node scripts/verify-verdict-server-gate.mjs */
import http from 'node:http';
import { pathToFileURL } from 'node:url';

const UID = 'aaaaaaaa-1111-2222-3333-444444444444';
let mode = 'free';
let anthropicCalls = 0;

const server = http.createServer((req, res) => {
  let raw = '';
  req.on('data', (c) => { raw += c; });
  req.on('end', () => {
    const send = (code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
    const url = req.url || '';
    if (url.startsWith('/auth/v1/user')) {
      return send(200, { id: UID, aud: 'authenticated', email: 'hr@test.local' });
    }
    if (url.includes('/rpc/hr_effective_entitlement')) {
      if (mode === 'error') return send(500, { message: 'boom' });
      const ai = mode === 'foundation';
      return send(200, [{
        plan: ai ? 'foundation' : 'free', status: 'active', period_end: null,
        limits: { active_jobs: ai ? 3 : 1, ai_evaluation: ai, analytics: ai },
        baseline: 0,
      }]);
    }
    return send(200, []);
  });
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const STUB = `http://127.0.0.1:${server.address().port}`;

process.env.SUPABASE_URL = STUB;
process.env.SUPABASE_ANON_KEY = 'anon';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
process.env.ANTHROPIC_API_KEY = 'test';

const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const u = typeof input === 'string' ? input : input?.url || '';
  if (u.includes('api.anthropic.com')) {
    anthropicCalls += 1;
    return new Response(JSON.stringify({ content: [{ text: JSON.stringify({
      verdict: 'STRONG FIT', score: 84,
      two_second_why: ['a', 'b', 'c'], whatsapp_cta_template: 'hi',
    }) }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }
  return realFetch(input, init);
};

const handler = (await import(pathToFileURL(process.cwd() + '/api/ai.js').href)).default;

function call(withToken = true) {
  const req = {
    method: 'POST', query: { action: 'candidate_verdict' },
    headers: withToken ? { authorization: 'Bearer tok' } : {},
    body: { cvSnapshot: { skills: ['windows'] }, job: { title: 'IT support', description: 'x' } },
  };
  const out = { statusCode: null, payload: null };
  const res = {
    status(c) { out.statusCode = c; return res; },
    json(o) { out.payload = o; return res; },
    end() { return res; }, setHeader() { return res; },
  };
  return handler(req, res).then(() => out);
}

let failures = 0;
const check = (ok, label, detail) => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}`);
  if (detail) console.log(`      ${detail}`);
  if (!ok) failures += 1;
};

console.log('='.repeat(66));
console.log('GATE E3 SERVER SIDE — the paywall without the browser');
console.log('='.repeat(66));

mode = 'free'; anthropicCalls = 0;
let r = await call();
check(r.statusCode === 402, 'free employer is refused even bypassing the UI', `status ${r.statusCode}, "${r.payload?.error}"`);
check(anthropicCalls === 0, 'free employer costs ZERO Sonnet calls', `anthropic calls = ${anthropicCalls}`);
check(r.payload?.action === 'upgrade', 'refusal points at the upgrade');

mode = 'foundation'; anthropicCalls = 0;
r = await call();
check(r.statusCode === 200, 'foundation employer is served', `status ${r.statusCode}`);
check(anthropicCalls === 1, 'foundation employer costs exactly one Sonnet call', `anthropic calls = ${anthropicCalls}`);

mode = 'error'; anthropicCalls = 0;
r = await call();
check(r.statusCode === 200, 'entitlement lookup failure FAILS OPEN, a paying customer is not blocked by a blip', `status ${r.statusCode}`);

mode = 'free'; anthropicCalls = 0;
r = await call(false);
check(r.statusCode === 401, 'no token is still rejected', `status ${r.statusCode}`);
check(anthropicCalls === 0, 'unauthenticated costs nothing');

server.close();
console.log(`\n${failures === 0 ? 'The paywall is real: it holds without the browser.' : `${failures} check(s) failed.`}`);
process.exitCode = failures === 0 ? 0 : 1;
