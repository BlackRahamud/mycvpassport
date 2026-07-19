/**
 * verify-interview-email.mjs — the interview email, asserted and rendered.
 *
 *   node scripts/verify-interview-email.mjs [outDir]
 *
 * Two jobs:
 *   1. Assert the things a candidate must never see and the things they
 *      must always see. The headline invariant: a raw IANA zone name
 *      ("Asia/Calcutta") cannot reach a candidate on ANY path, including
 *      a hostile or stale client that posts one in whenLabel.
 *   2. Render every state to <outDir> so they can be opened, and mailed
 *      to a real Gmail and Outlook inbox, which is where warm tints,
 *      hairlines and Georgia actually get judged.
 *
 * Exits non-zero on the first failed assertion.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { buildInterviewEmail } from '../api/notify-candidate.js';

const outDir = process.argv[2] || 'output/interview-email';
mkdirSync(outDir, { recursive: true });

let failures = 0;
const ok = (name) => console.log(`  ok   ${name}`);
const fail = (name, detail) => { failures += 1; console.error(`  FAIL ${name}\n       ${detail}`); };
const assert = (cond, name, detail) => (cond ? ok(name) : fail(name, detail));

// "Region/City" — the shape that must never appear in candidate-facing text.
const IANA = /(Asia|Europe|America|Africa|Australia|Pacific|Indian|Atlantic)\/[A-Za-z_]+/;

const BASE = {
  candidateEmail: 'rohan@example.com',
  candidateName: 'Rohan Mehta',
  jobTitle: 'Backend Software Engineer',
  scheduledAt: '2026-07-14T11:00:00.000Z', // 3:00 PM Dubai, 4:30 PM India
  durationMin: 30,
  interviewId: 'iv-1',
  sequence: 0,
  hrEmail: 'aisha@example.com',
  hrName: 'Aisha Rahman',
  hrCompany: 'Injazat',
  hrTz: 'Asia/Dubai',
  candidateTz: 'Asia/Kolkata',
  meetingLink: 'https://meet.google.com/mub-jdyw-beu',
  note: 'Please have your portfolio and a photo ID ready.',
};

const CASES = [
  { file: 'scheduled-online.html', kind: 'interview', body: BASE, label: 'Scheduled, online' },
  {
    file: 'scheduled-inperson.html',
    kind: 'interview',
    label: 'Scheduled, in person',
    body: {
      ...BASE,
      meetingLink: '',
      interviewType: 'in_person',
      location: 'Injazat headquarters',
      address: 'Al Maryah Island, Abu Dhabi',
      dressCode: 'Business formal',
      note: 'Ask for the front desk on arrival, they will bring you up.',
    },
  },
  {
    file: 'rescheduled.html',
    kind: 'interview_reschedule',
    label: 'Rescheduled',
    body: { ...BASE, scheduledAt: '2026-07-15T13:00:00.000Z', durationMin: 45, sequence: 1, note: 'Same panel as before, no new preparation needed.' },
  },
  { file: 'cancelled.html', kind: 'interview_cancel', label: 'Cancelled', body: { ...BASE, note: '' } },
  {
    file: 'fallback-single-zone.html',
    kind: 'interview',
    label: 'Single zone fallback',
    body: { ...BASE, hrTz: 'Asia/Kolkata', candidateTz: '', scheduledAt: '2026-07-13T05:30:00.000Z' },
  },
  {
    file: 'no-signature.html',
    kind: 'interview',
    label: 'No stored HR name',
    body: { ...BASE, hrName: '', hrCompany: '' },
  },
];

console.log('\nRendering states');
const built = new Map();
for (const c of CASES) {
  const r = buildInterviewEmail(c.body, c.kind);
  if (!r.ok) { fail(c.label, `builder rejected: ${r.error}`); continue; }
  built.set(c.file, r);
  writeFileSync(join(outDir, c.file), r.html, 'utf8');
  writeFileSync(join(outDir, c.file.replace(/\.html$/, '.txt')), r.text, 'utf8');
  writeFileSync(join(outDir, c.file.replace(/\.html$/, '.ics')), r.ics, 'utf8');
  console.log(`  ${c.label} → ${c.file} (when: ${r.when})`);
}

console.log('\nThe corridor line, the flagship content');
{
  const r = built.get('scheduled-online.html');
  assert(r.when === 'Tue 14 Jul, 3:00 PM Dubai, 4:30 PM India', 'dual zone line reads both sides',
    `got "${r.when}"`);

  const single = built.get('fallback-single-zone.html');
  assert(single.when === 'Mon 13 Jul, 11:00 AM India', 'single zone fallback stays human',
    `got "${single.when}"`);

  // Same wall clock in both zones reads once, not twice.
  const same = buildInterviewEmail({ ...BASE, candidateTz: 'Asia/Dubai' }, 'interview');
  assert(same.when === 'Tue 14 Jul, 3:00 PM Dubai', 'identical zones collapse to one time',
    `got "${same.when}"`);

  // A late slot that lands on the next day for the candidate carries its
  // day: 23:00 in Dubai is already 00:30 the following morning in India.
  const flip = buildInterviewEmail(
    { ...BASE, scheduledAt: '2026-07-14T19:00:00.000Z', hrTz: 'Asia/Dubai', candidateTz: 'Asia/Kolkata' },
    'interview',
  );
  assert(/on \w{3} \d+ \w{3}$/.test(flip.when), 'a day flip carries the candidate day', `got "${flip.when}"`);
}

console.log('\nNo raw IANA zone can reach a candidate');
{
  // Every rendered state.
  for (const [file, r] of built) {
    assert(!IANA.test(r.when), `${file}: when-line is free of a zone id`, `got "${r.when}"`);
    assert(!IANA.test(r.text), `${file}: plain text is free of a zone id`, 'found a Region/City token');
  }

  // The live bug, replayed: a stale client posts the old pre-corridor
  // label and no zones at all. The server must refuse to print it.
  const stale = buildInterviewEmail({
    ...BASE,
    hrTz: undefined,
    candidateTz: undefined,
    whenLabel: 'Mon, Jul 13, 2026, 11:00 AM (Asia/Calcutta)',
    dualTimeLine: '',
  }, 'interview');
  assert(!IANA.test(stale.when), 'a stale client label is rejected, not printed', `got "${stale.when}"`);
  assert(!IANA.test(stale.html), 'a stale client label never lands in the HTML', 'found a Region/City token');
  assert(stale.when.length > 0, 'the rejected label still leaves a readable line', `got "${stale.when}"`);
  console.log(`       stale payload degraded to: "${stale.when}"`);

  // No zone information whatsoever still produces words, never an id.
  const bare = buildInterviewEmail({ ...BASE, hrTz: '', candidateTz: '', whenLabel: '', dualTimeLine: '' }, 'interview');
  assert(!IANA.test(bare.when) && /GMT$/.test(bare.when), 'no zone at all falls back to a spelled GMT line',
    `got "${bare.when}"`);
}

console.log('\nStates say what they are');
{
  const c = built.get('cancelled.html');
  assert(c.subject === 'Interview cancelled, Backend Software Engineer', 'cancelled subject', c.subject);
  assert(/has been cancelled/.test(c.html), 'cancelled banner text present', 'missing');
  // Loud, not calm: a solid fill, not the pale tint the calm states use.
  assert(/bgcolor="#9E4A39"/.test(c.html), 'cancelled banner is a solid fill', 'expected the loud band');
  assert(/Was scheduled for/.test(c.html), 'cancelled reframes the time as past', 'missing');
  assert(!/Join the interview/.test(c.html), 'cancelled carries no action button', 'found a button');
  assert(/removes the entry from your calendar/.test(c.text), 'cancelled ics line in text', 'missing');
  assert(/METHOD:CANCEL/.test(c.ics) && /STATUS:CANCELLED/.test(c.ics), 'cancelled ics cancels', 'missing');

  const r = built.get('rescheduled.html');
  assert(r.subject === 'Interview rescheduled, Backend Software Engineer', 'rescheduled subject', r.subject);
  assert(/has a new time/.test(r.html), 'rescheduled banner', 'missing');
  assert(/SEQUENCE:1/.test(r.ics), 'rescheduled bumps the ics sequence', 'missing');

  const s = built.get('scheduled-online.html');
  assert(s.subject === 'Interview scheduled, Backend Software Engineer', 'scheduled subject', s.subject);
  assert(/Join the interview/.test(s.html), 'online state offers the Join button', 'missing');
  assert(/METHOD:REQUEST/.test(s.ics), 'scheduled ics requests', 'missing');
}

console.log('\nIn person renders as a place, not a link');
{
  const p = built.get('scheduled-inperson.html');
  assert(/Injazat headquarters/.test(p.html), 'venue rendered', 'missing');
  assert(/Al Maryah Island, Abu Dhabi/.test(p.html), 'address rendered', 'missing');
  assert(/Business formal/.test(p.html), 'dress code rendered', 'missing');
  assert(/View on map/.test(p.html), 'in person offers the map button', 'missing');
  assert(!/Join the interview/.test(p.html), 'in person offers no join button', 'found one');
  assert(/LOCATION:Injazat headquarters/.test(p.ics), 'ics carries the venue, not a link', 'missing');
  assert(/Location: Injazat headquarters/.test(p.text), 'plain text carries the venue', 'missing');
}

console.log('\nThe signature signs as the human, with no empty rows');
{
  const s = built.get('scheduled-online.html');
  assert(/Aisha Rahman/.test(s.html), 'recruiter name in the signature', 'missing');
  assert(/Injazat/.test(s.html), 'company in the signature', 'missing');
  assert(/reach Aisha directly/.test(s.html), 'reply promise names her', 'missing');
  assert(/Scheduled with CVPassport/.test(s.html), 'CVPassport recedes to the footer', 'missing');
  // Title, phone and photo are not stored: nothing may render for them.
  assert(!/pending/i.test(s.html), 'no pending placeholder ships', 'found one');
  assert(!/(Talent Acquisition|\+971)/.test(s.html), 'no invented title or phone', 'found one');

  const n = built.get('no-signature.html');
  assert(/The CVPassport HR Team/.test(n.html), 'no stored name degrades to the team', 'missing');
  assert(!/undefined|null/.test(n.html), 'no undefined leaks into the signature', 'found one');
}

console.log('\nEmail-safe envelope');
{
  for (const [file, r] of built) {
    const h = r.html;
    assert(!/<style[\s>]/i.test(h), `${file}: no <style> block`, 'found one');
    assert(!/\sclass=/.test(h), `${file}: no classes`, 'found one');
    assert(!/display:\s*flex|display:\s*grid/i.test(h), `${file}: no flex or grid`, 'found one');
    assert(!/<svg/i.test(h), `${file}: no SVG`, 'found one');
    assert(!/data:(image|application)/i.test(h), `${file}: no data URIs`, 'found one');
    assert(!/backdrop-filter|filter:\s*blur|position:\s*(absolute|fixed)/i.test(h), `${file}: no blur or positioning`, 'found one');
    assert(!/linear-gradient|radial-gradient/i.test(h), `${file}: no gradients`, 'found one');
    assert(!/@media|@import/i.test(h), `${file}: no at-rules`, 'found one');

    // Fonts: system stack plus Georgia, nothing that needs downloading.
    const fonts = [...h.matchAll(/font-family:([^;"]+)/g)].map((m) => m[1]);
    const badFont = fonts.find((f) => !/Georgia|-apple-system/.test(f));
    assert(!badFont, `${file}: only system fonts and Georgia`, `found "${badFont}"`);

    // Images: explicit dimensions, alt text, absolute https.
    for (const img of h.match(/<img[^>]*>/g) || []) {
      assert(/\swidth="\d+"/.test(img) && /\sheight="\d+"/.test(img), `${file}: img has width and height`, img);
      assert(/\salt="[^"]+"/.test(img), `${file}: img has alt text`, img);
      assert(/src="https:\/\//.test(img), `${file}: img is absolute https`, img);
    }

    // Every coloured band carries a bgcolor attribute for Outlook.
    assert((h.match(/bgcolor="/g) || []).length >= 4, `${file}: bands carry bgcolor for Outlook`, 'too few');
  }
}

console.log('\nCopy rules');
{
  for (const [file, r] of built) {
    const copy = r.text;
    assert(!/[—–]|&mdash;|&ndash;/.test(copy + r.html), `${file}: no dashes in copy`, 'found an em or en dash');
    assert(!/\b(best|#1|most powerful|guaranteed)\b/i.test(copy.replace(/Best regards/g, '')),
      `${file}: no superlatives`, 'found one');
  }
}

console.log('\nPlain text stays in step with the HTML');
{
  for (const [file, r] of built) {
    assert(r.text.includes(r.when), `${file}: text carries the same when-line`, 'out of sync');
    assert(/Scheduled with CVPassport/.test(r.text), `${file}: text carries the footer`, 'missing');
    const wantsJoin = /Join the interview/.test(r.html);
    assert(wantsJoin === /Join link:/.test(r.text), `${file}: join link parity`, 'html and text disagree');
  }
}

console.log(`\n${failures ? `${failures} assertion(s) failed` : 'All assertions passed'}`);
console.log(`Rendered to ${outDir}\n`);
process.exit(failures ? 1 : 0);
