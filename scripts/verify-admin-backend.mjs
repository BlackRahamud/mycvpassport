// ============================================================================
// scripts/verify-admin-backend.mjs
//
// Exercises the admin Command Center backend logic (src/lib/admin/adminCore.js)
// against a fake, call-recording Supabase client — no live DB, no creds. This
// proves the real code paths: owner-gating decision, grant routing (existing
// user vs new-email pending grant, candidate vs HR), owner-protected suspend,
// and that every write emits an audit row.
//
// Run: node scripts/verify-admin-backend.mjs
// ============================================================================

import {
  resolveAdminRole,
  grantAccess,
  setPlan,
  suspendAccount,
  unsuspendAccount,
} from '../src/lib/admin/adminCore.js';

const OWNER = 'connectingjunaidkhan@gmail.com';
const ACTOR = { id: 'admin-1', email: OWNER };

// ── Fake Supabase client. Records every mutating op + rpc, and returns
// canned responses configured per table. Chain shapes match exactly what
// adminCore uses: select().eq().maybeSingle(), update().eq(), insert(),
// upsert(), rpc(), and awaited select().order().limit().
class FakeBuilder {
  constructor(db, table) {
    this.db = db; this.table = table; this.op = 'select'; this.filters = {}; this.payload = null;
  }
  select() { this.op = 'select'; return this; }
  eq(c, v) { this.filters[c] = v; return this; }
  order() { return this; }
  limit() { return this; }
  update(p) { this.op = 'update'; this.payload = p; return this; }
  insert(p) {
    this.db.calls.push({ table: this.table, op: 'insert', payload: p });
    return Promise.resolve({ data: p, error: this.db.res(this.table)?.insertError ?? null });
  }
  upsert(p, opts) {
    this.db.calls.push({ table: this.table, op: 'upsert', payload: p, opts });
    return Promise.resolve({ data: p, error: this.db.res(this.table)?.upsertError ?? null });
  }
  maybeSingle() {
    return Promise.resolve({ data: this.db.res(this.table)?.single ?? null, error: this.db.res(this.table)?.singleError ?? null });
  }
  single() { return this.maybeSingle(); }
  // Thenable: an awaited chain that never hit a terminal (update().eq(), or
  // a bare select().order().limit()).
  then(resolve, reject) {
    if (this.op === 'update') {
      this.db.calls.push({ table: this.table, op: 'update', payload: this.payload, filters: this.filters });
      return Promise.resolve({ data: null, error: this.db.res(this.table)?.updateError ?? null }).then(resolve, reject);
    }
    return Promise.resolve({ data: this.db.res(this.table)?.list ?? [], error: null }).then(resolve, reject);
  }
}
class FakeDb {
  constructor(responses = {}) { this.responses = responses; this.calls = []; this.rpcs = []; }
  res(table) { return this.responses[table]; }
  from(table) { return new FakeBuilder(this, table); }
  rpc(name, args) {
    this.rpcs.push({ name, args });
    return Promise.resolve({ data: this.responses.rpc?.[name] ?? null, error: this.responses.rpcError?.[name] ?? null });
  }
}

// ── Tiny assertion harness
let passed = 0, failed = 0;
const fails = [];
function check(name, cond) {
  if (cond) { passed += 1; console.log(`  ✓ ${name}`); }
  else { failed += 1; fails.push(name); console.log(`  ✗ ${name}`); }
}
const audits = (db) => db.calls.filter((c) => c.table === 'audit_log' && c.op === 'insert');
const updates = (db, table) => db.calls.filter((c) => c.table === table && c.op === 'update');

async function run() {
  console.log('\nAdmin backend verification\n');

  // ── 1. Owner gate decision
  console.log('1. Owner gate (resolveAdminRole)');
  check('owner email resolves to owner', resolveAdminRole({ email: OWNER }) === 'owner');
  check('owner match is case-insensitive', resolveAdminRole({ email: OWNER.toUpperCase() }) === 'owner');
  check('non-owner resolves to null (rejected)', resolveAdminRole({ email: 'someone@else.com' }) === null);
  check('missing user resolves to null', resolveAdminRole(null) === null);

  // ── 2. Grant to an EXISTING candidate user
  console.log('\n2. grant_access — existing candidate user');
  {
    const db = new FakeDb({ profiles: { single: { id: 'u1', email: 'user@x.com', plan: 'FREE', pro_access_expires_at: null, account_status: 'active' } } });
    const r = await grantAccess(db, { actor: ACTOR, email: 'user@x.com', portal: 'candidate', plan: 'CAREER_PRO', accessKind: 'duration', durationDays: 365 });
    const up = updates(db, 'profiles')[0];
    check('result ok + applied immediately', r.ok && r.applied === 'immediate' && r.user_id === 'u1');
    check('profiles updated to CAREER_PRO', up?.payload?.plan === 'CAREER_PRO');
    check('pro_access_expires_at set (~365d out)', !!up?.payload?.pro_access_expires_at && new Date(up.payload.pro_access_expires_at) > new Date());
    check('is_pro cache set true', up?.payload?.is_pro === true);
    check('wrote an audit row (grant_access)', audits(db).some((a) => a.payload.action === 'grant_access'));
  }

  // ── 3. Grant to a NEW email → pending grant
  console.log('\n3. grant_access — new email (no account) → pending');
  {
    const db = new FakeDb({ profiles: { single: null } });
    const r = await grantAccess(db, { actor: ACTOR, email: 'New@X.com', portal: 'candidate', plan: 'ACTIVE_HUNTER', accessKind: 'duration', durationDays: 30 });
    const pend = db.calls.find((c) => c.table === 'pending_grants' && c.op === 'upsert');
    check('result ok + applied pending', r.ok && r.applied === 'pending');
    check('pending_grants upsert written', !!pend);
    check('email lowercased in pending row', pend?.payload?.email === 'new@x.com');
    check('pending row carries plan + portal', pend?.payload?.plan === 'ACTIVE_HUNTER' && pend?.payload?.portal === 'candidate');
    check('wrote an audit row', audits(db).some((a) => a.payload.action === 'grant_access' && a.payload.metadata?.applied === 'pending'));
  }

  // ── 4. Grant HR Foundation to an existing user (RPC path)
  console.log('\n4. grant_access — HR Foundation (existing user)');
  {
    const db = new FakeDb({ profiles: { single: { id: 'h1', email: 'hr@x.com', plan: 'FREE', pro_access_expires_at: null, account_status: 'active' } } });
    const r = await grantAccess(db, { actor: ACTOR, email: 'hr@x.com', portal: 'hr', plan: 'foundation', accessKind: 'duration', durationDays: 30 });
    const rpc = db.rpcs.find((c) => c.name === 'grant_hr_foundation');
    check('result ok', r.ok && r.applied === 'immediate');
    check('grant_hr_foundation RPC called for the user', rpc?.args?.p_user_id === 'h1' && rpc?.args?.p_days === 30);
    check('no candidate profiles.plan write on HR grant', updates(db, 'profiles').length === 0);
    check('wrote an audit row (portal hr)', audits(db).some((a) => a.payload.action === 'grant_access' && a.payload.portal === 'hr'));
  }

  // ── 5. Invalid inputs rejected
  console.log('\n5. validation');
  {
    const db = new FakeDb({ profiles: { single: null } });
    const badPortal = await grantAccess(db, { actor: ACTOR, email: 'a@b.com', portal: 'nope', plan: 'CAREER_PRO' });
    const badPlan = await grantAccess(db, { actor: ACTOR, email: 'a@b.com', portal: 'candidate', plan: 'MADE_UP' });
    const noEmail = await grantAccess(db, { actor: ACTOR, email: '', portal: 'candidate', plan: 'CAREER_PRO' });
    check('invalid portal rejected', badPortal.ok === false && badPortal.reason === 'invalid_portal');
    check('invalid plan rejected', badPlan.ok === false && badPlan.reason === 'invalid_plan');
    check('missing email rejected', noEmail.ok === false && noEmail.reason === 'email_required');
    check('rejections write nothing', db.calls.length === 0 && db.rpcs.length === 0);
  }

  // ── 6. Suspend the OWNER → must be refused (no self-lockout)
  console.log('\n6. suspend — owner is protected');
  {
    const db = new FakeDb({ profiles: { single: { id: 'o1', email: OWNER, account_status: 'active' } } });
    const r = await suspendAccount(db, { actor: ACTOR, email: OWNER, reason: 'test' });
    check('owner suspend refused', r.ok === false && r.reason === 'cannot_suspend_owner');
    check('no profiles write on refused suspend', updates(db, 'profiles').length === 0);
    check('no audit row on refused suspend', audits(db).length === 0);
  }

  // ── 7. Suspend + unsuspend a normal user
  console.log('\n7. suspend / unsuspend — normal user');
  {
    const db = new FakeDb({ profiles: { single: { id: 'u9', email: 'bad@x.com', account_status: 'active' } } });
    const s = await suspendAccount(db, { actor: ACTOR, email: 'bad@x.com', reason: 'spam', message: 'Contact support.' });
    const up = updates(db, 'profiles')[0];
    check('suspend ok', s.ok === true);
    check('account_status set to suspended', up?.payload?.account_status === 'suspended');
    check('suspend reason + message recorded', up?.payload?.suspended_reason === 'spam' && !!up?.payload?.suspended_message);
    check('wrote an audit row (suspend)', audits(db).some((a) => a.payload.action === 'suspend'));

    const db2 = new FakeDb({ profiles: { single: { id: 'u9', email: 'bad@x.com', account_status: 'suspended' } } });
    const u = await unsuspendAccount(db2, { actor: ACTOR, email: 'bad@x.com' });
    const up2 = updates(db2, 'profiles')[0];
    check('unsuspend ok', u.ok === true);
    check('account_status back to active + fields cleared', up2?.payload?.account_status === 'active' && up2?.payload?.suspended_message === null);
    check('wrote an audit row (unsuspend)', audits(db2).some((a) => a.payload.action === 'unsuspend'));
  }

  // ── 8. set_plan requires an existing user
  console.log('\n8. set_plan — missing user rejected');
  {
    const db = new FakeDb({ profiles: { single: null } });
    const r = await setPlan(db, { actor: ACTOR, email: 'ghost@x.com', portal: 'candidate', plan: 'CAREER_PRO', accessKind: 'permanent' });
    check('set_plan on unknown user rejected', r.ok === false && r.reason === 'user_not_found');
  }

  console.log(`\n${'='.repeat(48)}`);
  console.log(`  ${passed} passed, ${failed} failed`);
  if (failed) { console.log('  FAILED:', fails.join(', ')); }
  console.log(`${'='.repeat(48)}\n`);
  process.exit(failed ? 1 : 0);
}

run().catch((e) => { console.error('harness error:', e); process.exit(1); });
