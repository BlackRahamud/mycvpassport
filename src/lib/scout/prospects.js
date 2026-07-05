/**
 * Scout → prospect-list transform.
 *
 * Turns accumulated scout_jobs rows (aggregated listings from JSearch /
 * Jooble / SerpApi / WhatJobs) into a ranked B2B call list of companies
 * hiring right now. This is the "Radar to Real Listings" Step 1-2 engine:
 * pure data transform, no service, no persistence.
 *
 * HARD BOUNDARY: output of this module is outreach intelligence only.
 * It must NEVER be rendered as portal job listings — doing so fakes
 * supply and violates aggregator terms (see Scout plan).
 *
 * All functions are pure; `buildProspects` takes an optional `now` so
 * tests are deterministic.
 */

// Listings carrying the LinkedIn-syndication tracking fragment are
// geo-blocked scrape-of-a-scrape junk — the apply path dead-ends for
// Gulf/India users, and the "company" behind them is unreachable, so
// they are worthless as prospects too.
export const GEO_BLOCK_FRAGMENT = 'j-18808-ljbffr';

// Frontline / blue-collar roles outside the CV-ATS product lane. The
// pitch is ATS scoring on white-collar applicant flow; a company hiring
// only these roles has no use for it. Word-boundary matched against the
// job title. Deliberately conservative — trades vocabulary that overlaps
// white-collar Gulf titles (technician, engineer, operator) stays in.
export const OUT_OF_LANE_NEEDLES = [
  'nurse', 'nursing', 'caregiver', 'nanny', 'babysitter',
  'housemaid', 'maid', 'housekeeping', 'housekeeper', 'cleaner', 'janitor',
  'driver', 'rider', 'courier',
  'security guard', 'watchman', 'lifeguard',
  'waiter', 'waitress', 'barista', 'bartender', 'chef', 'cook', 'steward',
  'kitchen helper', 'labourer', 'laborer', 'loader', 'packer',
  'mason', 'carpenter', 'plumber', 'electrician', 'welder', 'painter',
  'beautician', 'barber', 'gardener', 'tailor',
];

// Enterprise names Talentera & co already own — flagged and sunk to the
// bottom, not dropped, so the founder can still see them behind a toggle.
// Matched as substrings of the normalised company name.
export const ENTERPRISE_NEEDLES = [
  'emirates group', 'emirates nbd', 'etihad airways', 'dp world', 'emaar',
  'majid al futtaim', 'dubai airports', 'adnoc', 'mubadala',
  'first abu dhabi bank', 'abu dhabi islamic bank', 'aramco', 'sabic',
  'neom', 'al rajhi', 'saudi national bank', 'stc',
  'qatarenergy', 'qatargas', 'qatar airways', 'ooredoo', 'qatar rail',
  'petroleum development oman', 'oman air', 'bank muscat', 'omantel',
  'tata consultancy', 'infosys', 'wipro', 'tech mahindra', 'hcl',
  'cognizant', 'capgemini', 'accenture', 'deloitte', 'kpmg', 'pwc',
  'ernst young', 'ibm', 'oracle', 'microsoft', 'google', 'amazon',
];

// Staffing / recruitment intermediaries. Kept in the list (they do buy
// screening tools) but badged and slightly deprioritised versus direct
// SME employers, who are the primary pitch target.
export const AGENCY_NEEDLES = [
  'recruit', 'staffing', 'manpower', 'headhunt', 'outsourc',
  'talent acquisition', 'talent solutions', 'hr solutions', 'placement',
];

const INDIA_NEEDLES = [
  'india', 'bangalore', 'bengaluru', 'mumbai', 'delhi', 'gurgaon',
  'gurugram', 'noida', 'chennai', 'hyderabad', 'pune', 'kolkata',
  'ahmedabad', 'kochi', 'jaipur',
];

const GULF_NEEDLES = [
  'united arab emirates', 'uae', 'dubai', 'abu dhabi', 'sharjah', 'ajman',
  'saudi', 'riyadh', 'jeddah', 'dammam', 'khobar',
  'qatar', 'doha', 'oman', 'muscat', 'kuwait', 'bahrain', 'manama',
];

const LEGAL_SUFFIX_RE = new RegExp(
  '\\b(' + [
    'llc', 'l l c', 'fz llc', 'fz-llc', 'fze', 'fzc', 'fzco', 'dmcc',
    'wll', 'w l l', 'llp', 'plc', 'pvt ltd', 'pvt', 'private limited',
    'ltd', 'limited', 'inc', 'co', 'company',
  ].join('|') + ')\\b',
  'g'
);

// Canonical grouping key: lowercase, punctuation stripped, legal
// suffixes removed — "Falcon Tech LLC" and "Falcon Tech L.L.C." land on
// the same prospect row.
export function normalizeCompanyKey(name) {
  const base = String(name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return base.replace(LEGAL_SUFFIX_RE, ' ').replace(/\s+/g, ' ').trim();
}

export function detectMarket(location) {
  const s = String(location || '').toLowerCase();
  if (INDIA_NEEDLES.some((n) => s.includes(n))) return 'india';
  if (GULF_NEEDLES.some((n) => s.includes(n))) return 'gulf';
  return 'other';
}

const OUT_OF_LANE_RES = OUT_OF_LANE_NEEDLES.map(
  (n) => new RegExp(`\\b${n.replace(/\s+/g, '\\s+')}\\b`, 'i')
);

export function isOutOfLane(title) {
  const t = String(title || '');
  return OUT_OF_LANE_RES.some((re) => re.test(t));
}

export function isGeoBlockedJunk(job) {
  const fields = [job?.apply_url, job?.jd_text, job?.jd_snippet];
  return fields.some(
    (f) => typeof f === 'string' && f.toLowerCase().includes(GEO_BLOCK_FRAGMENT)
  );
}

// Short needles (stc, hcl, ibm) must not substring-match inside longer
// names ("westco" contains "stc"), so enterprise matches on whole words.
// Agency needles are stems on purpose ('recruit' → recruitment/recruiters)
// — anchored at a word start, open-ended after.
const ENTERPRISE_RES = ENTERPRISE_NEEDLES.map((n) => new RegExp(`\\b${n}\\b`));
const AGENCY_RES = AGENCY_NEEDLES.map((n) => new RegExp(`\\b${n}`));

export function classifyCompany(name) {
  const key = normalizeCompanyKey(name);
  return {
    enterprise: ENTERPRISE_RES.some((re) => re.test(key)),
    agency: AGENCY_RES.some((re) => re.test(key)),
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

function scoreProspect(p, now) {
  let score = 0;
  // Market dominates: India first (no permit blocker, Razorpay live),
  // UAE/GCC second, everything else the long tail.
  if (p.market === 'india') score += 200;
  else if (p.market === 'gulf') score += 100;
  // Multiple open roles = active hiring = warmer lead.
  score += Math.min(p.roleCount, 8) * 12;
  // Freshness nudge only — Jooble's stale index means age can't be a gate.
  const ageMs = p.lastSeen ? now - new Date(p.lastSeen).getTime() : Infinity;
  if (ageMs <= 7 * DAY_MS) score += 10;
  else if (ageMs <= 14 * DAY_MS) score += 5;
  if (p.flags.agency) score -= 30;
  // Enterprise sinks below every SME regardless of other signals.
  if (p.flags.enterprise) score -= 1000;
  return score;
}

function signalsFor(p, now) {
  const out = [];
  if (p.roleCount > 1) out.push(`${p.roleCount} open roles`);
  if (p.market === 'india') out.push('India — no permit blocker');
  if (p.market === 'gulf') out.push('UAE/GCC corridor');
  const ageMs = p.lastSeen ? now - new Date(p.lastSeen).getTime() : Infinity;
  if (ageMs <= 7 * DAY_MS) out.push('active this week');
  if (p.flags.agency) out.push('agency');
  if (p.flags.enterprise) out.push('enterprise — Talentera lane');
  return out;
}

/**
 * jobs: scout_jobs rows ({ title, company, location, apply_url,
 * source_platform, fetched_at, jd_text?, jd_snippet? }).
 *
 * Returns { prospects, dropped } where prospects is ranked best-first
 * and dropped is the honest funnel count per filter reason.
 */
export function buildProspects(jobs, { now = Date.now() } = {}) {
  const dropped = { noCompany: 0, geoBlocked: 0, outOfLane: 0 };
  const byCompany = new Map();

  for (const job of Array.isArray(jobs) ? jobs : []) {
    const key = normalizeCompanyKey(job?.company);
    if (!key) { dropped.noCompany += 1; continue; }
    if (isGeoBlockedJunk(job)) { dropped.geoBlocked += 1; continue; }
    if (isOutOfLane(job?.title)) { dropped.outOfLane += 1; continue; }

    let entry = byCompany.get(key);
    if (!entry) {
      entry = {
        key,
        company: job.company,
        roles: new Map(), // roleKey -> { title, location, lastSeen, applyUrl }
        locations: new Set(),
        sources: new Set(),
        lastSeen: null,
        jobCount: 0,
      };
      byCompany.set(key, entry);
    }

    entry.jobCount += 1;
    const title = String(job.title || '').trim();
    const location = String(job.location || '').trim();
    if (location) entry.locations.add(location);
    if (job.source_platform) entry.sources.add(job.source_platform);

    const fetchedAt = job.fetched_at || null;
    if (fetchedAt && (!entry.lastSeen || new Date(fetchedAt) > new Date(entry.lastSeen))) {
      entry.lastSeen = fetchedAt;
    }

    // Same title in the same city across sources/runs is ONE opening.
    const roleKey = `${title.toLowerCase()}|${location.toLowerCase()}`;
    const existing = entry.roles.get(roleKey);
    if (!existing) {
      entry.roles.set(roleKey, {
        title,
        location,
        lastSeen: fetchedAt,
        applyUrl: job.apply_url || '',
      });
    } else if (fetchedAt && (!existing.lastSeen || new Date(fetchedAt) > new Date(existing.lastSeen))) {
      existing.lastSeen = fetchedAt;
    }
  }

  const prospects = [];
  for (const entry of byCompany.values()) {
    const locations = Array.from(entry.locations);
    const markets = new Set(locations.map(detectMarket));
    // A company hiring in India at all is an India-lane prospect even if
    // it also posts Gulf roles — India-first outreach order.
    const market = markets.has('india') ? 'india' : markets.has('gulf') ? 'gulf' : 'other';
    const roles = Array.from(entry.roles.values());
    const p = {
      key: entry.key,
      company: entry.company,
      market,
      roleCount: roles.length,
      jobCount: entry.jobCount,
      roles,
      locations,
      sources: Array.from(entry.sources),
      lastSeen: entry.lastSeen,
      sampleUrl: roles.find((r) => r.applyUrl)?.applyUrl || '',
      flags: classifyCompany(entry.company),
    };
    p.score = scoreProspect(p, now);
    p.signals = signalsFor(p, now);
    prospects.push(p);
  }

  prospects.sort(
    (a, b) => b.score - a.score
      || b.roleCount - a.roleCount
      || (new Date(b.lastSeen || 0) - new Date(a.lastSeen || 0))
      || a.company.localeCompare(b.company)
  );

  return { prospects, dropped };
}

// Flat CSV for taking the call list out of the app (sheet, CRM, phone).
export function prospectsToCsv(prospects) {
  const esc = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = ['rank', 'company', 'market', 'open_roles', 'titles', 'locations', 'sources', 'last_seen', 'flags', 'sample_url'];
  const lines = [header.join(',')];
  prospects.forEach((p, i) => {
    lines.push([
      i + 1,
      esc(p.company),
      p.market,
      p.roleCount,
      esc(p.roles.map((r) => r.title).join(' | ')),
      esc(p.locations.join(' | ')),
      esc(p.sources.join(' | ')),
      p.lastSeen || '',
      esc([p.flags.enterprise && 'enterprise', p.flags.agency && 'agency'].filter(Boolean).join(' | ')),
      esc(p.sampleUrl),
    ].join(','));
  });
  return lines.join('\n');
}
