import {
  ZIINA_FEATURE_TO_TIER,
  getServerAmount,
  getAlaCarteAmount,
  alaCarteServiceFor,
} from '../src/config/tierConfig.js';
import { encodePaymentRef, gatewayCurrencyError, isUuid } from '../src/lib/payments/paymentRef.js';

// Ziina is the AED rail. Declared as a constant and validated against the
// gateway policy below rather than inlined at the request body, so that
// adding a second currency to this endpoint is a deliberate edit in one
// place and not a literal someone forgets to change in three.
const ZIINA_CURRENCY = 'AED';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // userEmail is still accepted in the request body by existing callers
  // (paywall.js sends it) but is not needed here — the webhook resolves
  // the buyer's email from profiles at grant time.
  const { feature, userId } = req.body || {};
  if (!feature || !userId) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  // The reference we hand Ziina must carry a uuid, because the webhook
  // uses it as the user id it grants against. Reject early rather than
  // build a reference the webhook will later be unable to act on.
  if (!isUuid(userId)) {
    return res.status(400).json({ error: 'Invalid userId' });
  }

  const policyError = gatewayCurrencyError('ziina', ZIINA_CURRENCY);
  if (policyError) {
    console.error('[create-ziina-payment] gateway currency policy', { policyError });
    return res.status(500).json({ error: 'Payment gateway misconfigured' });
  }

  // Resolve the feature to exactly one product, and price it from the
  // single table. A feature that is neither a tier nor a known
  // a-la-carte item is rejected — there is no default amount any more.
  // The old `A_LA_CARTE_FILS[feature] || DEFAULT_FILS` fallback meant an
  // unknown feature key silently charged 2900 fils and then produced a
  // payment the webhook could not identify.
  const tierSlug = ZIINA_FEATURE_TO_TIER[feature];
  let amount;
  let externalRef;

  if (tierSlug) {
    amount = getServerAmount(tierSlug, ZIINA_CURRENCY);
    if (!amount) {
      return res.status(400).json({ error: 'Plan not available in this currency' });
    }
    externalRef = encodePaymentRef({
      kind: 'tier',
      id: tierSlug,
      currency: ZIINA_CURRENCY,
      userId,
    });
  } else {
    const service = alaCarteServiceFor(feature);
    amount = getAlaCarteAmount(feature, ZIINA_CURRENCY);
    if (!service || !amount) {
      return res.status(400).json({ error: 'Unknown feature' });
    }
    externalRef = encodePaymentRef({
      kind: 'svc',
      id: service,
      currency: ZIINA_CURRENCY,
      userId,
    });
  }

  const successRedirect = feature === 'linkedinOptimizer'
    ? `https://mycvpassport.com/linkedin-optimizer?unlocked=1`
    : `https://mycvpassport.com/payment-success?feature=${feature}&uid=${userId}`;
  const cancelRedirect = feature === 'linkedinOptimizer'
    ? `https://mycvpassport.com/linkedin-optimizer?cancelled=1`
    : `https://mycvpassport.com/pricing`;

  try {
    const response = await fetch('https://api-v2.ziina.com/api/payment_intent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.ZIINA_API_TOKEN}`,
      },
      body: JSON.stringify({
        amount,
        currency_code: ZIINA_CURRENCY,
        message: `CVPassport - ${feature}`,
        success_url: successRedirect,
        cancel_url: cancelRedirect,
        external_reference: externalRef,
        test: false,
      }),
    });

    const data = await response.json();
    if (!response.ok) return res.status(500).json({ error: data });
    return res.status(200).json({ url: data.redirect_url });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
