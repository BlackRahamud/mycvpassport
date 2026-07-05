import {
  buildProspects,
  classifyCompany,
  detectMarket,
  isGeoBlockedJunk,
  isOutOfLane,
  normalizeCompanyKey,
  prospectsToCsv,
} from './prospects';

const NOW = new Date('2026-07-05T12:00:00Z').getTime();

const job = (over = {}) => ({
  title: 'Sales Executive',
  company: 'Falcon Trading LLC',
  location: 'Dubai, United Arab Emirates',
  apply_url: 'https://example.com/apply/1',
  source_platform: 'JSearch',
  fetched_at: '2026-07-04T09:00:00Z',
  jd_text: 'Sell things.',
  jd_snippet: 'Sell things.',
  ...over,
});

describe('normalizeCompanyKey', () => {
  it('collapses legal-suffix variants onto one key', () => {
    expect(normalizeCompanyKey('Falcon Tech LLC')).toBe('falcon tech');
    expect(normalizeCompanyKey('Falcon Tech L.L.C.')).toBe('falcon tech');
    expect(normalizeCompanyKey('Falcon Tech FZE')).toBe('falcon tech');
    expect(normalizeCompanyKey('Falcon Tech Pvt Ltd')).toBe('falcon tech');
  });

  it('returns empty for blank / null company', () => {
    expect(normalizeCompanyKey('')).toBe('');
    expect(normalizeCompanyKey(null)).toBe('');
    expect(normalizeCompanyKey('LLC')).toBe('');
  });
});

describe('lane + junk filters', () => {
  it('flags frontline roles as out of lane, keeps white-collar', () => {
    expect(isOutOfLane('Registered Nurse')).toBe(true);
    expect(isOutOfLane('Delivery Driver')).toBe(true);
    expect(isOutOfLane('Security Guard - Night Shift')).toBe(true);
    expect(isOutOfLane('MEP Engineer')).toBe(false);
    expect(isOutOfLane('FM Technician')).toBe(false);
    expect(isOutOfLane('Accountant')).toBe(false);
  });

  it('does not false-positive on substrings of clean titles', () => {
    // "cook" must not hit "Cookson", "maid" must not hit "Maidenhead"
    expect(isOutOfLane('Account Manager - Cookson Group')).toBe(false);
    expect(isOutOfLane('Analyst, Maidenhead office')).toBe(false);
  });

  it('detects the Ljbffr geo-block fragment in any URL/JD field', () => {
    expect(isGeoBlockedJunk(job({ apply_url: 'https://x.com/j?ref=%23J-18808-Ljbffr' }))).toBe(true);
    expect(isGeoBlockedJunk(job({ jd_text: 'Great role #J-18808-Ljbffr' }))).toBe(true);
    expect(isGeoBlockedJunk(job())).toBe(false);
  });
});

describe('detectMarket', () => {
  it('maps India, Gulf and other', () => {
    expect(detectMarket('Bengaluru, India')).toBe('india');
    expect(detectMarket('Dubai, United Arab Emirates')).toBe('gulf');
    expect(detectMarket('Riyadh, Saudi Arabia')).toBe('gulf');
    expect(detectMarket('London, UK')).toBe('other');
  });
});

describe('classifyCompany', () => {
  it('flags enterprise on whole words only', () => {
    expect(classifyCompany('ADNOC Distribution').enterprise).toBe(true);
    expect(classifyCompany('Tata Consultancy Services').enterprise).toBe(true);
    // "Westco" contains "stc" as a substring — must NOT flag
    expect(classifyCompany('Westco Trading LLC').enterprise).toBe(false);
  });

  it('flags agencies on stems', () => {
    expect(classifyCompany('Gulf Recruitment Group').agency).toBe(true);
    expect(classifyCompany('Prime Manpower Services').agency).toBe(true);
    expect(classifyCompany('Falcon Trading LLC').agency).toBe(false);
  });
});

describe('buildProspects', () => {
  it('dedupes company variants and counts unique openings', () => {
    const { prospects } = buildProspects([
      job({ company: 'Falcon Tech LLC', title: 'Sales Executive' }),
      job({ company: 'Falcon Tech L.L.C.', title: 'Sales Executive', source_platform: 'Jooble' }),
      job({ company: 'Falcon Tech LLC', title: 'Accountant' }),
    ], { now: NOW });

    expect(prospects).toHaveLength(1);
    const p = prospects[0];
    expect(p.jobCount).toBe(3);
    expect(p.roleCount).toBe(2); // same title+city across sources = 1 opening
    expect(p.sources.sort()).toEqual(['JSearch', 'Jooble']);
  });

  it('ranks India above Gulf, more roles above fewer, enterprise last', () => {
    const { prospects } = buildProspects([
      job({ company: 'Gulf SME One', title: 'Role A' }),
      job({ company: 'Gulf SME One', title: 'Role B' }),
      job({ company: 'Gulf SME One', title: 'Role C' }),
      job({ company: 'India SME', title: 'Role A', location: 'Mumbai, India' }),
      job({ company: 'ADNOC', title: 'Role A' }),
      job({ company: 'Gulf SME Two', title: 'Role A' }),
    ], { now: NOW });

    const order = prospects.map((p) => p.company);
    expect(order[0]).toBe('India SME'); // market beats role count
    expect(order[1]).toBe('Gulf SME One');
    expect(order[2]).toBe('Gulf SME Two');
    expect(order[3]).toBe('ADNOC'); // enterprise sinks
    expect(prospects[3].flags.enterprise).toBe(true);
  });

  it('drops junk with an honest funnel count', () => {
    const { prospects, dropped } = buildProspects([
      job(),
      job({ company: '' }),
      job({ title: 'Registered Nurse', company: 'Hospital Co' }),
      job({ jd_text: '#J-18808-Ljbffr', company: 'Ghost Co' }),
    ], { now: NOW });

    expect(prospects).toHaveLength(1);
    expect(dropped).toEqual({ noCompany: 1, geoBlocked: 1, outOfLane: 1 });
  });

  it('a company hiring in India AND Gulf ranks as India-lane', () => {
    const { prospects } = buildProspects([
      job({ company: 'Corridor Co', title: 'Role A', location: 'Dubai, United Arab Emirates' }),
      job({ company: 'Corridor Co', title: 'Role B', location: 'Kochi, India' }),
    ], { now: NOW });
    expect(prospects[0].market).toBe('india');
  });
});

describe('prospectsToCsv', () => {
  it('escapes commas and quotes, one row per prospect', () => {
    const { prospects } = buildProspects([
      job({ company: 'Comma, Co "Quoted"' }),
    ], { now: NOW });
    const csv = prospectsToCsv(prospects);
    const lines = csv.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('company');
    expect(lines[1]).toContain('"Comma, Co ""Quoted"""');
  });
});
