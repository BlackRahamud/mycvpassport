/**
 * Prerender.io bot-SSR proxy — runs as a Vercel Edge Function.
 *
 * Flow:
 *   bot request   → vercel.json rewrites this path → function runs
 *                 → function proxies to service.prerender.io → HTML back to bot
 *   human request → vercel.json's second rewrite sends /index.html (SPA)
 *                   — this function never runs for them
 *
 * Defence in depth: the function re-validates the UA in JS. If for some
 * reason a non-bot reaches the function, or the bypass header / query
 * param is set, or Prerender.io fails, it responds with a 302 redirect
 * to the same URL + `__cvp_spa=1` so vercel.json's SPA-fallback rewrite
 * serves /index.html. The site never breaks.
 */

export const config = { runtime: 'edge' };

const BOT_AGENTS = [
  'googlebot', 'google-inspectiontool', 'google page speed',
  'developers.google.com/+/web/snippet', 'yahoo! slurp',
  'bingbot', 'bingpreview', 'yandex', 'baiduspider',
  'facebookexternalhit', 'twitterbot', 'rogerbot',
  'linkedinbot', 'embedly', 'quora link preview',
  'showyoubot', 'outbrain', 'pinterest', 'slackbot',
  'vkshare', 'w3c_validator', 'redditbot', 'applebot',
  'whatsapp', 'flipboard', 'tumblr', 'bitlybot',
  'skypeuripreview', 'nuzzel', 'discordbot', 'qwantify',
  'pinterestbot', 'bitrix link preview', 'chrome-lighthouse',
  'telegrambot', 'ia_archiver', 'screaming frog',
  'ahrefsbot', 'semrushbot', 'mj12bot', 'dotbot',
  'chatgpt-user', 'gptbot', 'claudebot', 'anthropic-ai',
];

const STATIC_EXT_RE = /\.(?:js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|map|json|xml|txt)$/i;

function fallbackToSpa(requestUrl) {
  const u = new URL(requestUrl);
  u.searchParams.set('__cvp_spa', '1');
  return Response.redirect(u.toString(), 302);
}

export default async function handler(request) {
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return fallbackToSpa(request.url || 'https://www.mycvpassport.com/');
  }

  // Loop guard — if we've already redirected with the bypass param,
  // the vercel.json rewrite should have skipped us. If it didn't, bail.
  if (url.searchParams.get('__cvp_spa') === '1') {
    return new Response(null, { status: 204 });
  }

  const ua = (request.headers.get('user-agent') || '').toLowerCase();
  const isBot = BOT_AGENTS.some((bot) => ua.includes(bot));

  // Skip conditions — all hand control back to the SPA rewrite.
  if (!isBot) return fallbackToSpa(request.url);
  if (request.headers.get('x-prerender-bypass')) return fallbackToSpa(request.url);
  if (url.pathname.startsWith('/api/')) return fallbackToSpa(request.url);
  if (STATIC_EXT_RE.test(url.pathname)) return fallbackToSpa(request.url);

  const host = request.headers.get('host') || 'www.mycvpassport.com';
  const fullTargetUrl = `https://${host}${url.pathname}${url.search}`;
  const prerenderUrl = `https://service.prerender.io/${fullTargetUrl}`;
  const token = process.env.PRERENDER_TOKEN;

  if (!token) {
    return fallbackToSpa(request.url);
  }

  try {
    const upstream = await fetch(prerenderUrl, {
      method: 'GET',
      headers: {
        'X-Prerender-Token': token,
        'X-Prerender-Host': host,
        'X-Prerender-Forwarded-For':
          request.headers.get('x-forwarded-for') ||
          request.headers.get('x-real-ip') ||
          '',
        'User-Agent': request.headers.get('user-agent') || '',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    if (!upstream.ok && upstream.status >= 500) {
      return fallbackToSpa(request.url);
    }

    const html = await upstream.text();
    return new Response(html, {
      status: upstream.status,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'public, max-age=600, s-maxage=3600',
        'x-cvp-prerender': 'hit',
      },
    });
  } catch {
    return fallbackToSpa(request.url);
  }
}
