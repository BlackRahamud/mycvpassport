/**
 * Payment reference encoding — the explicit product-identity channel.
 *
 * WHY THIS EXISTS
 * Ziina's webhook payload gives us `external_reference` as the only field
 * we control end to end, and it is covered by the HMAC over the raw body,
 * so whatever we put in it arrives signed. Before this module the field
 * carried a bare user id, which meant the webhook had to guess WHICH
 * product was bought by looking at the amount. Two prices that happen to
 * collide then become the same product, and an amount that matches
 * nothing used to fall through to a free Active Hunter grant.
 *
 * Product identity is now stated, never inferred. The amount is used only
 * to CHECK the stated identity, never to discover it.
 *
 * Shapes:
 *   tier:<slug>:<currency>:<userId>     paid tier  → profiles.plan path
 *   svc:<service>:<currency>:<userId>   a-la-carte → permissions path
 *   transform:<uuid>                    per-session transform payment
 *
 * Currency travels inside the reference because we cannot rely on every
 * gateway echoing its own currency field back in the webhook body. When a
 * gateway DOES echo one, the caller cross-checks the two and rejects on
 * mismatch — see assertCurrencyMatch.
 */

export const TIER_PREFIX = 'tier:';
export const SERVICE_PREFIX = 'svc:';
export const TRANSFORM_PREFIX = 'transform:';

export const KNOWN_CURRENCIES = new Set(['AED', 'INR']);

// Which currencies each gateway is actually configured to charge in.
// Ziina is the AED rail, Razorpay the INR rail. This is a code-level
// assertion of a merchant-account fact: if either account is later
// enabled for a second currency, widen the set here deliberately rather
// than letting a stray currency string through.
export const GATEWAY_CURRENCIES = {
  ziina: new Set(['AED']),
  razorpay: new Set(['INR']),
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(v) {
  return UUID_RE.test(String(v || ''));
}

/**
 * Build the reference string handed to the gateway at checkout creation.
 * Throws on invalid input — a malformed reference must never reach a
 * gateway, because the webhook would then be unable to identify the sale.
 */
export function encodePaymentRef({ kind, id, currency, userId }) {
  if (kind !== 'tier' && kind !== 'svc') {
    throw new Error(`encodePaymentRef: unknown kind "${kind}"`);
  }
  if (!id || String(id).includes(':')) {
    throw new Error(`encodePaymentRef: invalid id "${id}"`);
  }
  if (!KNOWN_CURRENCIES.has(currency)) {
    throw new Error(`encodePaymentRef: unknown currency "${currency}"`);
  }
  if (!isUuid(userId)) {
    throw new Error('encodePaymentRef: userId must be a uuid');
  }
  const prefix = kind === 'tier' ? TIER_PREFIX : SERVICE_PREFIX;
  return `${prefix}${id}:${currency}:${userId}`;
}

/**
 * Parse a reference coming back from a gateway webhook.
 *
 * Returns one of:
 *   { kind: 'tier',      slug, currency, userId }
 *   { kind: 'svc',       service, currency, userId }
 *   { kind: 'transform', sessionId }
 *   { kind: 'legacy',    raw }   pre-migration reference, NOT identifiable
 *   null                          structurally invalid
 *
 * 'legacy' is returned rather than throwing so the caller can log and
 * reconcile a real payment by hand instead of pretending it understood
 * one. A legacy reference must never grant anything.
 */
export function decodePaymentRef(ref) {
  const raw = String(ref || '');
  if (!raw) return null;

  if (raw.startsWith(TRANSFORM_PREFIX)) {
    const sessionId = raw.slice(TRANSFORM_PREFIX.length);
    if (!isUuid(sessionId)) return null;
    return { kind: 'transform', sessionId };
  }

  const isTier = raw.startsWith(TIER_PREFIX);
  const isSvc = raw.startsWith(SERVICE_PREFIX);

  if (isTier || isSvc) {
    const prefix = isTier ? TIER_PREFIX : SERVICE_PREFIX;
    const parts = raw.slice(prefix.length).split(':');
    if (parts.length !== 3) return null;
    const [id, currency, userId] = parts;
    if (!id) return null;
    if (!KNOWN_CURRENCIES.has(currency)) return null;
    if (!isUuid(userId)) return null;
    return isTier
      ? { kind: 'tier', slug: id, currency, userId }
      : { kind: 'svc', service: id, currency, userId };
  }

  // Anything else is a reference written by the pre-migration code: a
  // bare user id, or "userId|service". Identifiable only by amount,
  // which is exactly what we no longer do.
  return { kind: 'legacy', raw };
}

/**
 * Gateway/currency policy check. Returns null when fine, else a reason.
 */
export function gatewayCurrencyError(gateway, currency) {
  const allowed = GATEWAY_CURRENCIES[gateway];
  if (!allowed) return `unknown gateway "${gateway}"`;
  if (!KNOWN_CURRENCIES.has(currency)) return `unknown currency "${currency}"`;
  if (!allowed.has(currency)) return `${gateway} is not configured for ${currency}`;
  return null;
}

/**
 * Cross-check a currency the gateway reported against the one we encoded.
 * `reported` may legitimately be absent (not every gateway echoes it); an
 * absent value is not an error, a CONFLICTING value is.
 */
export function assertCurrencyMatch(expected, reported) {
  if (reported == null || reported === '') return null;
  const got = String(reported).toUpperCase();
  if (got !== expected) {
    return `currency mismatch: reference says ${expected}, gateway reported ${got}`;
  }
  return null;
}
