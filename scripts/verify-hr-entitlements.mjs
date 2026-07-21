/**
 * verify-hr-entitlements.mjs — Foundation on the payment rail.
 *
 * Runs the REAL api/ziina-webhook.js and api/razorpay.js handlers against
 * a stubbed Supabase, and asserts on which grant RPC each one calls.
 *
 * The four things this proves:
 *   1. A Foundation payment activates HR entitlement.
 *   2. It NEVER calls extend_pro_access, i.e. a paying employer is not
 *      handed a candidate pro pass.
 *   3. A candidate tier NEVER calls grant_hr_foundation, the reverse leak.
 *   4. INR 999 Foundation and INR 999 career_pro are the SAME AMOUNT and
 *      are still told apart, because identity comes from the signed
 *      reference and order notes, never from the price.
 *   5. A retry of the same payment intent does not grant twice.
 *
 * The PL/pgSQL side (job cap trigger, lazy expiry, backfill) cannot be
 * exercised here: there is no local Postgres. See
 * scripts/verify-hr-entitlements.sql for that half.
 *
 * Run: node scripts/verify-hr-entitlements.mjs
 */

import http from 'node:http';
import crypto from 'node:crypto';
import { Readable } from 'node:stream';
import { pathToFileURL } from 'node:url';

const ZIINA_SECRET = 'test_ziina_secret';
const RZP_SECRET = 'test_razorpay_secret';
const USER = '11111111-2222-3333-4444-555555555555';

let rpcCalls = [];
let paymentsHasRow = false;

const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    const send = (code, obj) => {
      res.writeHead(code, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(obj));
    };
    const url = req.url || '';
    const wantsObject = String(req.headers.accept || '').includes('vnd.pgrst.object+json');

    if (url.includes('/rpc/')) {
      const name = url.split('/rpc/')[1].split('?')[0];
      let args = {};
      try { args = JSON.parse(body || '{}'); } catch { /* noop */ }
      rpcCalls.push({ name, args });
      if (name === 'grant_hr_foundation') return send(200, '2026-08-20T00:00:00.000Z');
      if (name === 'next_invoice_number') return send(200, 'RCP-TEST-2026-0001');
      return send(200, null);
    }

    // Idempotency lookup. Only the retry scenario has an existing row.
    if (url.includes('/rest/v1/payments') && req.method === 'GET') {
      const row = paymentsHasRow ? { id: 1 } : null;
      return send(200, wantsObject ? row : (row ? [row] : []));
    }
    if (url.includes('/rest/v1/payments')) return send(201, []);

    return send(200, wantsObject ? null : []);
  });
});

await new Promise((r) => server.listen(0, '127.0.0.1', r));
const STUB = `http://127.0.0.1:${server.address().port}`;

process.env.NEXT_PUBLIC_SUPABASE_URL = STUB;
process.env.SUPABASE_URL = STUB;
process.env.SUPABASE_ANON_KEY = 'test_anon';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test_service_role';
process.env.ZIINA_WEBHOOK_SECRET = ZIINA_SECRET;
process.env.RAZORPAY_WEBHOOK_SECRET = RZP_SECRET;
delete process.env.POSTHOG_API_KEY;
delete process.env.REACT_APP_POSTHOG_KEY;

const root = process.cwd();
const ziinaHandler = (await import(pathToFileURL(root + '/api/ziina-webhook.js').href)).default;
const razorpayHandler = (await import(pathToFileURL(root + '/api/razorpay.js').href)).default;
const { getServerAmount } = await import(pathToFileURL(root + '/src/config/tierConfig.js').href);

function makeReq(raw, headers, query = {}) {
  const s = Readable.from([Buffer.from(raw)]);
  s.method = 'POST'; s.headers = headers; s.query = query;
  return s;
}
function makeRes() {
  const out = { statusCode: null, payload: null };
  const res = {
    status(c) { out.statusCode = c; return res; },
    json(o) { out.payload = o; return res; },
    end() { return res; }, setHeader() { return res; },
  };
  return { res, out };
}
function ziina(payload) {
  const raw = JSON.stringify(payload);
  const sig = crypto.createHmac('sha256', ZIINA_SECRET).update(raw).digest('hex');
  return (res) => ziinaHandler(makeReq(raw, { 'x-ziina-signature': sig }), res);
}
function razorpay(payment) {
  const raw = JSON.stringify({ event: 'payment.captured', payload: { payment: { entity: payment } } });
  const sig = crypto.createHmac('sha256', RZP_SECRET).update(raw).digest('hex');
  return (res) => razorpayHandler(makeReq(raw, { 'x-razorpay-signature': sig }, { action: 'webhook' }), res);
}

const results = [];
async function run(name, invoke, expect) {
  rpcCalls = [];
  const { res, out } = makeRes();
  await invoke(res);
  const called = (n) => rpcCalls.some((c) => c.name === n);
  const hrGrant = rpcCalls.find((c) => c.name === 'grant_hr_foundation');

  const checks = {
    status: out.statusCode === expect.status,
    hrGrant: called('grant_hr_foundation') === expect.hrGrant,
    candidateGrant: called('extend_pro_access') === expect.candidateGrant,
  };
  if (expect.days != null) checks.days = hrGrant?.args?.p_days === expect.days;
  if (expect.source) checks.source = hrGrant?.args?.p_source === expect.source;

  const pass = Object.values(checks).every(Boolean);
  results.push({ name, pass });
  console.log(`\n${pass ? 'PASS' : 'FAIL'}  ${name}`);
  console.log(`      status              ${out.statusCode} (want ${expect.status})`);
  console.log(`      grant_hr_foundation ${called('grant_hr_foundation')} (want ${expect.hrGrant})`);
  console.log(`      extend_pro_access   ${called('extend_pro_access')} (want ${expect.candidateGrant})`);
  if (hrGrant) console.log(`      args                days=${hrGrant.args.p_days} source=${hrGrant.args.p_source}`);
  if (out.payload?.error) console.log(`      error               ${out.payload.error}`);
}

console.log('='.repeat(70));
console.log('HR ENTITLEMENT ON THE PAYMENT RAIL — real handlers');
console.log('='.repeat(70));
console.log(`\nfoundation AED = ${getServerAmount('foundation', 'AED')} fils`);
console.log(`foundation INR = ${getServerAmount('foundation', 'INR')} paise`);
console.log(`career_pro INR = ${getServerAmount('career_pro', 'INR')} paise   <-- same number, different product`);

paymentsHasRow = false;
await run(
  'ziina: Foundation AED 99 activates HR entitlement, no candidate grant',
  ziina({ status: 'completed', amount: getServerAmount('foundation', 'AED'), currency_code: 'AED',
    external_reference: `tier:foundation:AED:${USER}`, payment_intent_id: 'pi_found_aed' }),
  { status: 200, hrGrant: true, candidateGrant: false, days: 30, source: 'ziina' },
);

await run(
  'razorpay: Foundation INR 999 activates HR entitlement, no candidate grant',
  razorpay({ id: 'pay_found_inr', amount: getServerAmount('foundation', 'INR'), currency: 'INR',
    order_id: 'ord_f', notes: { userId: USER, plan: 'foundation', currency: 'INR' } }),
  { status: 200, hrGrant: true, candidateGrant: false, days: 30, source: 'razorpay' },
);

await run(
  'razorpay: career_pro INR 999, SAME amount, still routes to the candidate grant',
  razorpay({ id: 'pay_cp_inr', amount: getServerAmount('career_pro', 'INR'), currency: 'INR',
    order_id: 'ord_c', notes: { userId: USER, plan: 'career_pro', currency: 'INR' } }),
  { status: 200, hrGrant: false, candidateGrant: true },
);

await run(
  'ziina: candidate Active Hunter does NOT touch HR entitlement',
  ziina({ status: 'completed', amount: getServerAmount('active_hunter', 'AED'), currency_code: 'AED',
    external_reference: `tier:active_hunter:AED:${USER}`, payment_intent_id: 'pi_ah' }),
  { status: 200, hrGrant: false, candidateGrant: true },
);

// Retry: the payments row now exists, so the webhook must short-circuit
// before any grant. This is the existing payment_intent_id guard, which
// is only real because of the unique index added in 045.
paymentsHasRow = true;
await run(
  'ziina: RETRY of the same Foundation payment grants nothing twice',
  ziina({ status: 'completed', amount: getServerAmount('foundation', 'AED'), currency_code: 'AED',
    external_reference: `tier:foundation:AED:${USER}`, payment_intent_id: 'pi_found_aed' }),
  { status: 200, hrGrant: false, candidateGrant: false },
);

server.close();
const failed = results.filter((r) => !r.pass);
console.log(`\n${'='.repeat(70)}`);
console.log(`${results.length - failed.length}/${results.length} passed`);
if (failed.length) {
  failed.forEach((f) => console.log(`  FAILED: ${f.name}`));
  process.exitCode = 1;
} else {
  console.log('Foundation activates, cross-audience leaks are closed, retries do not double grant.');
  process.exitCode = 0;
}
