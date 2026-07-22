/**
 * /api/admin?action=ping|grant_access|set_plan|suspend|unsuspend|audit_query
 *
 * Single owner-gated admin endpoint. Multiplexed via ?action= (same pattern
 * as api/razorpay.js) to stay within the Vercel Hobby serverless-function
 * budget — this is the 12th and final serverless function.
 *
 * Auth: Bearer Supabase JWT, verified server-side and gated to the owner
 * email (ADMIN_OWNER_EMAIL, defaulting to the founder). The gate is
 * structured (resolveAdminRole) so more roles can be added later without
 * touching call sites; today it is owner-or-nothing.
 *
 * Every write action is audited by src/lib/admin/adminCore.js. All logic
 * lives in that dependency-injected module; this file only wires
 * auth → service client → dispatch → response.
 */

import { createClient } from '@supabase/supabase-js';
import {
  resolveAdminRole,
  grantAccess,
  setPlan,
  suspendAccount,
  unsuspendAccount,
  queryAudit,
  DEFAULT_OWNER_EMAIL,
} from '../src/lib/admin/adminCore.js';

export const config = { api: { bodyParser: false } };

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.REACT_APP_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OWNER_EMAIL = process.env.ADMIN_OWNER_EMAIL || DEFAULT_OWNER_EMAIL;

const db = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk.toString(); });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

// Owner gate — verifies the caller's Supabase session and confirms the owner
// role. Sends the response itself on failure and returns null.
async function requireOwner(req, res) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY || !db) {
    res.status(500).json({ error: 'Server not configured' });
    return null;
  }
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: { user } = {}, error } = await authClient.auth.getUser(token);
  if (error || !user) {
    res.status(401).json({ error: 'Invalid session' });
    return null;
  }
  const role = resolveAdminRole(user, OWNER_EMAIL);
  if (role !== 'owner') {
    res.status(403).json({ error: 'Forbidden' });
    return null;
  }
  return { id: user.id, email: user.email, role };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const actor = await requireOwner(req, res);
  if (!actor) return; // response already sent by the gate

  const raw = await getRawBody(req);
  let body = {};
  if (raw) {
    try { body = JSON.parse(raw); } catch { body = {}; }
  }
  const action = String(req.query?.action || body.action || '');

  try {
    switch (action) {
      case 'ping':
        return res.status(200).json({ ok: true, role: actor.role, email: actor.email });
      case 'grant_access':
        return res.status(200).json(await grantAccess(db, { ...body, actor }));
      case 'set_plan':
        return res.status(200).json(await setPlan(db, { ...body, actor }));
      case 'suspend':
        return res.status(200).json(await suspendAccount(db, { ...body, actor, ownerEmail: OWNER_EMAIL }));
      case 'unsuspend':
        return res.status(200).json(await unsuspendAccount(db, { ...body, actor }));
      case 'audit_query':
        return res.status(200).json(await queryAudit(db, body));
      default:
        return res.status(400).json({ error: 'Invalid or missing action' });
    }
  } catch (e) {
    console.error('[admin] handler error', { action, error: e?.message || String(e) });
    return res.status(500).json({ ok: false, error: e?.message || 'Internal error' });
  }
}
