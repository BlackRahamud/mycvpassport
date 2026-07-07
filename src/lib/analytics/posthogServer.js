// Server-side PostHog capture over the raw HTTP ingestion API.
//
// Used by the payment webhooks (api/ziina-webhook.js, api/razorpay.js) to
// fire `purchase_completed` where ad-blockers can't eat it. No SDK — a
// single fetch keeps the api/ bundle small and works on Vercel Node 18+.
//
// distinct_id MUST be the Supabase auth user id — that's what the browser
// side identifies with (identifyPostHog in useCvpAuth.js), so client and
// server events stitch into one funnel per person.
//
// Best-effort by contract: never throws, never blocks the caller's
// business logic. Key resolution falls back to the client build key so no
// new Vercel env var is required (REACT_APP_* vars are visible to
// serverless functions on the same project).

export async function capturePostHogServer(distinctId, event, properties) {
  try {
    const key =
      process.env.POSTHOG_API_KEY || process.env.REACT_APP_POSTHOG_KEY;
    if (!key || !distinctId || !event) return;
    const host = (
      process.env.POSTHOG_HOST ||
      process.env.REACT_APP_POSTHOG_HOST ||
      'https://eu.i.posthog.com'
    ).replace(/\/+$/, '');
    const res = await fetch(`${host}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: key,
        event,
        distinct_id: String(distinctId),
        properties: properties && typeof properties === 'object' ? properties : {},
        timestamp: new Date().toISOString(),
      }),
    });
    if (!res.ok) {
      console.error('[posthog-server] capture rejected', { event, status: res.status });
    }
  } catch (e) {
    console.error('[posthog-server] capture failed', { event, error: e?.message || String(e) });
  }
}
