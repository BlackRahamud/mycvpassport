/**
 * verify-cover-letter-gate.mjs — server-side enforcement proof.
 *
 * Runs the REAL api/ai.js handler (action=cover_letter). Supabase is a
 * local HTTP stub whose two RPCs reproduce the exact SQL semantics from
 * migration 044 — consume returns NULL when the counter is at zero (the
 * `> 0` guard matching no rows), grant increments. Anthropic is
 * intercepted so no live model call is made and so a failure can be
 * forced on demand to prove the refund path.
 *
 * This proves the gate cannot be bypassed from the client, and that a
 * second generation on a one credit purchase is actually refused.
 *
 * Run: node scripts/verify-cover-letter-gate.mjs
 */

import http from 'node:http';

const BUYER = 'aaaaaaaa-1111-2222-3333-444444444444';
const BROKE = 'bbbbbbbb-1111-2222-3333-444444444444';
const PRO   = 'cccccccc-1111-2222-3333-444444444444';

const TOKENS = { tok_buyer: BUYER, tok_broke: BROKE, tok_pro: PRO };

// In-memory profiles table.
const db = {
  [BUYER]: { is_pro: false, pro_access_expires_at: null, cover_letter_credits: 1 },
  [BROKE]: { is_pro: false, pro_access_expires_at: null, cover_letter_credits: 0 },
  [PRO]:   { is_pro: true,  pro_access_expires_at: null, cover_letter_credits: 0 },
};

let anthropicShouldFail = false;

// ── Supabase stub ────────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  let raw = '';
  req.on('data', (c) => { raw += c; });
  req.on('end', () => {
    const send = (code, obj) => {
      res.writeHead(code, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(obj));
    };
    const url = req.url || '';
    const auth = String(req.headers.authorization || '');
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;

    // GoTrue getUser
    if (url.startsWith('/auth/v1/user')) {
      const uid = TOKENS[token];
      if (!uid) return send(401, { message: 'invalid token' });
      return send(200, { id: uid, aud: 'authenticated', email: `${uid}@test.local` });
    }

    // profiles select
    if (url.startsWith('/rest/v1/profiles')) {
      const m = url.match(/id=eq\.([0-9a-f-]+)/i);
      const row = m ? db[m[1]] : null;
      const wantsObject = String(req.headers.accept || '').includes('vnd.pgrst.object+json');
      if (!row) return send(200, wantsObject ? null : []);
      const out = { ...row };
      return send(200, wantsObject ? out : [out]);
    }

    // RPCs — mirror migration 044 semantics exactly.
    if (url.includes('/rpc/consume_cover_letter_credit')) {
      const { p_user_id } = JSON.parse(raw || '{}');
      const row = db[p_user_id];
      if (!row || row.cover_letter_credits <= 0) return send(200, null); // no rows matched
      row.cover_letter_credits -= 1;
      return send(200, row.cover_letter_credits);
    }
    if (url.includes('/rpc/grant_cover_letter_credits')) {
      const { p_user_id, p_credits } = JSON.parse(raw || '{}');
      const row = db[p_user_id];
      if (!row) return send(200, null);
      row.cover_letter_credits += p_credits;
      return send(200, row.cover_letter_credits);
    }

    return send(200, []);
  });
});

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const STUB = `http://127.0.0.1:${server.address().port}`;

process.env.SUPABASE_URL = STUB;
process.env.SUPABASE_ANON_KEY = 'test_anon';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_service';
process.env.ANTHROPIC_API_KEY = 'test_anthropic_key';

// Intercept Anthropic only; everything else goes to the real fetch.
const realFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const u = typeof input === 'string' ? input : input?.url || '';
  if (u.includes('api.anthropic.com')) {
    if (anthropicShouldFail) {
      return new Response('upstream boom', { status: 500 });
    }
    return new Response(
      JSON.stringify({ content: [{ text: 'Paragraph one.\n\nParagraph two.\n\nParagraph three.' }] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }
  return realFetch(input, init);
};

const handler = (await import('../api/ai.js')).default;

function call(token, body = {}) {
  const req = {
    method: 'POST',
    query: { action: 'cover_letter' },
    headers: token ? { authorization: `Bearer ${token}` } : {},
    body: { cvData: { name: 'Test User', role: 'Analyst' }, jobTitle: 'Analyst', ...body },
  };
  const out = { statusCode: null, payload: null };
  const res = {
    status(c) { out.statusCode = c; return res; },
    json(o) { out.payload = o; return res; },
    end() { return res; },
    setHeader() { return res; },
  };
  return handler(req, res).then(() => out);
}

const results = [];
function check(name, cond, detail) {
  results.push({ name, pass: cond });
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}`);
  console.log(`      ${detail}`);
}

console.log('='.repeat(70));
console.log('COVER LETTER GATE — real handler, migration 044 semantics');
console.log('='.repeat(70));
console.log();

// 1. Unauthenticated
let r = await call(null);
check(
  'no session is refused, model never called',
  r.statusCode === 401 && !r.payload?.coverLetterBody,
  `status ${r.statusCode}, error "${r.payload?.error}"`,
);

// 2. Non-buyer with zero credits
r = await call('tok_broke');
check(
  'non buyer with zero credits stays locked',
  r.statusCode === 402 && !r.payload?.coverLetterBody && db[BROKE].cover_letter_credits === 0,
  `status ${r.statusCode}, credits ${db[BROKE].cover_letter_credits}, error "${r.payload?.error}"`,
);

// 3. Buyer, first generation
const beforeBuy = db[BUYER].cover_letter_credits;
r = await call('tok_buyer');
check(
  'buyer with one credit gets a letter and the credit is spent',
  r.statusCode === 200 && !!r.payload?.coverLetterBody && db[BUYER].cover_letter_credits === beforeBuy - 1,
  `status ${r.statusCode}, credits ${beforeBuy} -> ${db[BUYER].cover_letter_credits}, remaining reported ${r.payload?.credits_remaining}`,
);

// 4. Same buyer, second generation — the consumable proof
r = await call('tok_buyer');
check(
  'second generation on a one credit purchase is blocked',
  r.statusCode === 402 && !r.payload?.coverLetterBody && db[BUYER].cover_letter_credits === 0,
  `status ${r.statusCode}, credits ${db[BUYER].cover_letter_credits}, error "${r.payload?.error}"`,
);

// 5. Pro user is unmetered
const proBefore = db[PRO].cover_letter_credits;
r = await call('tok_pro');
check(
  'pro user generates without spending a credit',
  r.statusCode === 200 && !!r.payload?.coverLetterBody && db[PRO].cover_letter_credits === proBefore,
  `status ${r.statusCode}, credits unchanged at ${db[PRO].cover_letter_credits}, remaining reported ${r.payload?.credits_remaining}`,
);

// 6. Refund on upstream failure
db[BUYER].cover_letter_credits = 1;
anthropicShouldFail = true;
r = await call('tok_buyer');
check(
  'failed generation refunds the credit',
  r.statusCode === 502 && db[BUYER].cover_letter_credits === 1,
  `status ${r.statusCode}, credits back to ${db[BUYER].cover_letter_credits}`,
);
anthropicShouldFail = false;

// 7. Spoofed client cannot mint access
r = await call('tok_broke', { is_pro: true, cover_letter_credits: 99, hasAccess: true });
check(
  'client supplied access fields are ignored by the server',
  r.statusCode === 402 && !r.payload?.coverLetterBody,
  `status ${r.statusCode} despite body claiming is_pro and 99 credits`,
);

console.log();
console.log('='.repeat(70));
const failed = results.filter((x) => !x.pass);
console.log(`${results.length - failed.length}/${results.length} passed`);
if (failed.length) {
  failed.forEach((f) => console.log(`  FAILED: ${f.name}`));
  process.exitCode = 1;
} else {
  console.log('Cover letter gate is server authoritative and correctly consumable.');
  process.exitCode = 0;
}
server.close();
