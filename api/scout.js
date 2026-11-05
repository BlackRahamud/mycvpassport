import { handleScoutMatches } from '../server/scout/matches.js';
import { handleScoutRun } from '../server/scout/run.js';
import { handleScoutTailor } from '../server/scout/tailor.js';
import { handleScoutUniversal } from '../server/scout/universal.js';

export const config = { maxDuration: 60 };

const scoutHandlers = {
  matches: handleScoutMatches,
  run: handleScoutRun,
  tailor: handleScoutTailor,
  universal: handleScoutUniversal,
};

export default async function handler(req, res) {
  const action = req.query?.scout_action;
  const scoutHandler = typeof action === 'string' ? scoutHandlers[action] : null;

  if (!scoutHandler) {
    return res.status(404).json({ ok: false, error: 'Not found' });
  }

  return scoutHandler(req, res);
}
