/**
 * Prerender.io bot-SSR proxy — runs as a Vercel Edge Function.
 *
 * Flow:
 *   bot request   → vercel.json rewrites this path → function runs
 *                 → function proxies to service.prerender.io → HTML back to bot
 *   human request → vercel.json's second rewrite sends /index.html (SPA)
 *                   — this function never runs for them
 *
 * Every response carries an `x-cvp-prerender` header so a `curl -I` reveals
 * exactly which branch fired. Values:
 *   hit                     — proxied response from Prerender.io
 *   miss:not-bot            — UA didn't match the allowlist
 *   miss:bypass-header      — X-Prerender-Bypass set
 *   miss:api-path           — /api/* never proxied
 *   miss:static-ext         — asset extension, never proxied
 *   miss:loop-guard         — hit the __cvp_spa param a second time
 *   miss:no-token           — PRERENDER_TOKEN env var missing or empty
 *   miss:upstream-5xx       — Prerender returned 5xx, serving SPA instead
 *   miss:exception          — fetch threw (network, parse, etc.)
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

function fallbackToSpa(requestUrl, reason) {
  const u = new URL(requestUrl);
  u.searchParams.set('__cvp_spa', '1');
  return new Response(null, {
    status: 302,
    headers: {
      Location: u.toString(),
      'x-cvp-prerender': `miss:${reason}`,
    },
  });
}

export default async function handler(request) {
  let url;
  try {
    url = new URL(request.url);
  } catch {
    return fallbackToSpa(request.url || 'https://www.mycvpassport.com/', 'bad-url');
  }

  if (url.searchParams.get('__cvp_spa') === '1') {
    return new Response(null, {
      status: 204,
      headers: { 'x-cvp-prerender': 'miss:loop-guard' },
    });
  }

  const ua = (request.headers.get('user-agent') || '').toLowerCase();
  const isBot = BOT_AGENTS.some((bot) => ua.includes(bot));

  if (!isBot) return fallbackToSpa(request.url, 'not-bot');
  if (request.headers.get('x-prerender-bypass')) return fallbackToSpa(request.url, 'bypass-header');
  if (url.pathname.startsWith('/api/')) return fallbackToSpa(request.url, 'api-path');
  if (STATIC_EXT_RE.test(url.pathname)) return fallbackToSpa(request.url, 'static-ext');

  const host = request.headers.get('host') || 'www.mycvpassport.com';
  const token = process.env.PRERENDER_TOKEN;

  if (!token) {
    return fallbackToSpa(request.url, 'no-token');
  }

  const fullTargetUrl = `https://${host}${url.pathname}${url.search}`;
  const prerenderUrl = `https://service.prerender.io/${fullTargetUrl}`;

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

    if (upstream.status >= 500) {
      return fallbackToSpa(request.url, 'upstream-5xx');
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
    return fallbackToSpa(request.url, 'exception');
  }
}
