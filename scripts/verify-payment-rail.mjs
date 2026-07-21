/**
 * verify-payment-rail.mjs — proof harness for the payment rail fix.
 *
 * This does NOT reimplement the webhook logic. It imports the real
 * api/ziina-webhook.js and api/razorpay.js handlers, points supabase-js
 * at a local stub over real HTTP, signs real HMAC bodies with real
 * secrets, and records every write the handlers attempt.
 *
 * A scenario "granted" if the handler touched any access-granting
 * surface: permissions upsert, extend_pro_access, grant_download_credits,
 * or a profiles PATCH. That is the thing we actually care about — a
 * rejection that still writes a grant would pass a status-code check and
 * fail the business requirement.
 *
 * Run: node scripts/verify-payment-rail.mjs
 */

import http from 'node:http';
import crypto from 'node:crypto';
import { Readable } from 'node:stream';

const ZIINA_SECRET = 'test_ziina_secret';
const RAZORPAY_SECRET_WH = 'test_razorpay_secret';
const USER = '11111111-2222-3333-4444-555555555555';

// ── Supabase stub ────────────────────────────────────────────────────
let requests = [];

const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    requests.push({ method: req.method, url: req.url, body });
    const wantsObject = String(req.headers.accept || '').includes('vnd.pgrst.object+json');

    // next_invoice_number returns a string; everything else that reads
    // returns "no row" so the handlers take their fresh-processing path.
    if (req.url.includes('/rpc/next_invoice_number')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify('RCP-TEST-2026-0001'));
    }
    if (req.url.includes('/rpc/')) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(null));
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify(wantsObject ? null : []));
  });
});

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const STUB = `http://127.0.0.1:${port}`;

// ── Env must be set BEFORE importing the handlers (module-scope client) ──
process.env.NEXT_PUBLIC_SUPABASE_URL = STUB;
process.env.SUPABASE_URL = STUB;
process.env.SUPABASE_ANON_KEY = 'test_anon';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_service_role';
process.env.ZIINA_WEBHOOK_SECRET = ZIINA_SECRET;
process.env.RAZORPAY_WEBHOOK_SECRET = RAZORPAY_SECRET_WH;
delete process.env.POSTHOG_API_KEY;
delete process.env.REACT_APP_POSTHOG_KEY;

const ziinaHandler = (await import('../api/ziina-webhook.js')).default;
const razorpayHandler = (await import('../api/razorpay.js')).default;

// ── req/res mocks ────────────────────────────────────────────────────
function makeReq(rawBody, headers, query = {}) {
  const stream = Readable.from([Buffer.from(rawBody)]);
  stream.method = 'POST';
  stream.headers = headers;
  stream.query = query;
  return stream;
}

function makeRes() {
  const out = { statusCode: null, payload: null };
  const res = {
    status(code) { out.statusCode = code; return res; },
    json(obj) { out.payload = obj; return res; },
    end() { return res; },
    setHeader() { return res; },
  };
  return { res, out };
}

const GRANT_MARKERS = [
  { m: 'POST', u: '/rest/v1/permissions' },
  { m: 'POST', u: '/rpc/extend_pro_access' },
  { m: 'POST', u: '/rpc/grant_download_credits' },
  // Cover letter is a consumable (migration 044): the purchase grants a
  // credit via RPC rather than writing a permanent permissions row.
  { m: 'POST', u: '/rpc/grant_cover_letter_credits' },
  { m: 'PATCH', u: '/rest/v1/profiles' },
];

function grantsIn(reqs) {
  return reqs.filter((r) =>
    GRANT_MARKERS.some((g) => r.method === g.m && r.url.includes(g.u)),
  );
}

function paymentsRows(reqs) {
  return reqs
    .filter((r) => r.method === 'POST' && r.url.includes('/rest/v1/payments'))
    .map((r) => { try { return JSON.parse(r.body); } catch { return r.body; } });
}

// ── Runner ───────────────────────────────────────────────────────────
const results = [];

async function run(name, expect, invoke) {
  requests = [];
  const { res, out } = makeRes();
  try {
    await invoke(res);
  } catch (e) {
    out.statusCode = out.statusCode ?? `THREW: ${e.message}`;
  }
  const grants = grantsIn(requests);
  const pays = paymentsRows(requests);
  const currencies = [...new Set(pays.map((p) => p?.currency).filter(Boolean))];

  const statusOk = out.statusCode === expect.status;
  const grantOk = expect.granted === (grants.length > 0);
  const currencyOk = expect.currency
    ? currencies.length === 1 && currencies[0] === expect.currency
    : true;
  const pass = statusOk && grantOk && currencyOk;

  results.push({ name, pass });
  console.log(`\n${pass ? 'PASS' : 'FAIL'}  ${name}`);
  console.log(`      status    ${out.statusCode}   (expected ${expect.status})`);
  console.log(`      granted   ${grants.length > 0}   (expected ${expect.granted})`);
  if (grants.length) console.log(`      grantOps  ${grants.map((g) => `${g.method} ${g.url.split('?')[0]}`).join(', ')}`);
  if (expect.currency) console.log(`      currency  ${currencies.join(',') || 'none'}   (expected ${expect.currency})`);
  if (out.payload?.error) console.log(`      reason    ${out.payload.error}`);
}

function ziina(payload) {
  const raw = JSON.stringify(payload);
  const sig = crypto.createHmac('sha256', ZIINA_SECRET).update(raw).digest('hex');
  return (res) => ziinaHandler(makeReq(raw, { 'x-ziina-signature': sig }), res);
}

function razorpay(payment) {
  const raw = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: payment } } });
  const sig = crypto.createHmac('sha256', RAZORPAY_SECRET_WH).update(raw).digest('hex');
  return (res) => razorpayHandler(
    makeReq(raw, { 'x-razorpay-signature': sig }, { action: 'webhook' }),
    res,
  );
}

console.log('='.repeat(70));
console.log('PAYMENT RAIL VERIFICATION — real handlers, stubbed Supabase');
console.log('='.repeat(70));

console.log('\n--- Condition 1: unknown product rejects, grants nothing ---');

// The exact P0. Old code: bare-uuid ref + unmapped amount 2900 fils fell
// through to `|| { plan: 'active_hunter' }` and granted a 30-day pass.
await run(
  'ziina: legacy bare-uuid reference, unmapped amount 2900 (the old P0 fallback)',
  { status: 400, granted: false },
  ziina({ status: 'completed', amount: 2900, external_reference: USER, payment_intent_id: 'pi_legacy' }),
);

await run(
  'ziina: valid tier reference but amount matches no price (9999)',
  { status: 400, granted: false },
  ziina({ status: 'completed', amount: 9999, external_reference: `tier:active_hunter:AED:${USER}`, payment_intent_id: 'pi_badamt' }),
);

await run(
  'ziina: unknown tier slug in reference',
  { status: 400, granted: false },
  ziina({ status: 'completed', amount: 4500, external_reference: `tier:foundation_hr:AED:${USER}`, payment_intent_id: 'pi_badslug' }),
);

console.log('\n--- Condition 3: wrong currency rejects, grants nothing ---');

await run(
  'ziina: reference claims INR on the AED-only rail',
  { status: 400, granted: false },
  ziina({ status: 'completed', amount: 34900, external_reference: `tier:active_hunter:INR:${USER}`, payment_intent_id: 'pi_inr_on_ziina' }),
);

await run(
  'ziina: reference says AED but gateway reports INR',
  { status: 400, granted: false },
  ziina({ status: 'completed', amount: 2900, currency_code: 'INR', external_reference: `tier:active_hunter:AED:${USER}`, payment_intent_id: 'pi_conflict' }),
);

await run(
  'razorpay: payment charged in AED on the INR-only rail',
  { status: 400, granted: false },
  razorpay({ id: 'pay_aed', amount: 99900, currency: 'AED', order_id: 'ord_1', notes: { userId: USER, plan: 'career_pro', currency: 'INR' } }),
);

await run(
  'razorpay: amount does not match the claimed plan price',
  { status: 400, granted: false },
  razorpay({ id: 'pay_badamt', amount: 100, currency: 'INR', order_id: 'ord_2', notes: { userId: USER, plan: 'career_pro', currency: 'INR' } }),
);

console.log('\n--- Condition 2: valid payments identified by explicit plan id ---');

await run(
  'ziina: valid AED tier, active_hunter at 2900 fils',
  { status: 200, granted: true, currency: 'AED' },
  ziina({ status: 'completed', amount: 2900, currency_code: 'AED', external_reference: `tier:active_hunter:AED:${USER}`, payment_intent_id: 'pi_ok_aed' }),
);

await run(
  'razorpay: valid INR tier, career_pro at 99900 paise',
  { status: 200, granted: true, currency: 'INR' },
  razorpay({ id: 'pay_ok_inr', amount: 99900, currency: 'INR', order_id: 'ord_3', notes: { userId: USER, plan: 'career_pro', currency: 'INR' } }),
);

await run(
  'ziina: valid AED a-la-carte, cover letter at 1000 fils (used to 500 and grant nothing)',
  { status: 200, granted: true, currency: 'AED' },
  ziina({ status: 'completed', amount: 1000, currency_code: 'AED', external_reference: `svc:cover_letter:AED:${USER}`, payment_intent_id: 'pi_ok_cl' }),
);

// ── Summary ──────────────────────────────────────────────────────────
server.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${'='.repeat(70)}`);
console.log(`${results.length - failed.length}/${results.length} passed`);
if (failed.length) {
  failed.forEach((f) => console.log(`  FAILED: ${f.name}`));
  process.exitCode = 1;
} else {
  console.log('All payment rail conditions hold.');
  process.exitCode = 0;
}
// Deliberately not process.exit() — an abrupt exit while supabase-js
// still holds keep-alive sockets trips a libuv assertion on Windows.
// Letting the loop drain keeps the harness output clean.
server.unref();
