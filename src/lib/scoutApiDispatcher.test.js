import handler from '../../api/scout.js';
import { handleScoutMatches } from '../../server/scout/matches.js';
import { handleScoutRun } from '../../server/scout/run.js';
import { handleScoutTailor } from '../../server/scout/tailor.js';
import { handleScoutUniversal } from '../../server/scout/universal.js';
const fs = require('fs');
const path = require('path');

jest.mock('../../server/scout/matches.js', () => ({ handleScoutMatches: jest.fn() }));
jest.mock('../../server/scout/run.js', () => ({ handleScoutRun: jest.fn() }));
jest.mock('../../server/scout/tailor.js', () => ({ handleScoutTailor: jest.fn() }));
jest.mock('../../server/scout/universal.js', () => ({ handleScoutUniversal: jest.fn() }));

const cases = [
  ['matches', 'GET', handleScoutMatches],
  ['run', 'POST', handleScoutRun],
  ['tailor', 'POST', handleScoutTailor],
  ['universal', 'POST', handleScoutUniversal],
];

describe('Scout API dispatcher', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test.each(cases)('delegates %s requests without changing request fields', async (action, method, scoutHandler) => {
    const req = {
      method,
      query: { scout_action: action, status: 'saved', limit: '17' },
      headers: { authorization: 'Bearer candidate-jwt' },
      body: { match_id: 'sample-match', marker: action },
    };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    const expected = { status: 'sent-through' };
    scoutHandler.mockResolvedValue(expected);

    await expect(handler(req, res)).resolves.toBe(expected);
    expect(scoutHandler).toHaveBeenCalledTimes(1);
    expect(scoutHandler).toHaveBeenCalledWith(req, res);
  });

  test('returns a 404 for an unknown operation', async () => {
    const req = { method: 'GET', query: { scout_action: 'unknown' } };
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ ok: false, error: 'Not found' });
    for (const [, , scoutHandler] of cases) {
      expect(scoutHandler).not.toHaveBeenCalled();
    }
  });

  test('Vercel rewrites each original public URL to the shared dispatcher', () => {
    const configPath = path.resolve(__dirname, '../../vercel.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const rewrites = new Map(config.rewrites.map(({ source, destination }) => [source, destination]));

    expect(rewrites.get('/api/scout-matches')).toBe('/api/scout?scout_action=matches');
    expect(rewrites.get('/api/scout-run')).toBe('/api/scout?scout_action=run');
    expect(rewrites.get('/api/scout-tailor')).toBe('/api/scout?scout_action=tailor');
    expect(rewrites.get('/api/scout-universal')).toBe('/api/scout?scout_action=universal');
  });

  test('the Vercel deployment ignore excludes the old Scout function paths', () => {
    const ignorePath = path.resolve(__dirname, '../../.vercelignore');
    const ignoredPaths = fs.readFileSync(ignorePath, 'utf8').split(/\r?\n/);

    expect(ignoredPaths).toEqual(expect.arrayContaining([
      'api/scout-matches.js',
      'api/scout-run.js',
      'api/scout-tailor.js',
      'api/scout-universal.js',
    ]));
  });
});
