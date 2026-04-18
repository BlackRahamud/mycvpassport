export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { feature, userId, userEmail } = req.body;
  if (!feature || !userId) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  const AMOUNTS = {
    coverLetter:       1000,
    expressPass:       4900,
    activeHunter:      2900,
    careerPro:         19900,
    ats:               2900,
    jobMatch:          2900,
    templates:         2900,
    linkedinOptimizer: 4900,
  };

  const amount = AMOUNTS[feature] || 2900;

  // A-la-carte services (non-plan unlocks) route through the permissions table
  // rather than flipping profiles.is_pro. The webhook keys off the suffix on
  // external_reference to decide which path to take.
  const PERMISSION_FEATURES = { linkedinOptimizer: 'linkedin_optimizer' };
  const permissionService = PERMISSION_FEATURES[feature] || null;
  const externalRef = permissionService ? `${userId}|${permissionService}` : userId;

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
        currency_code: 'AED',
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
