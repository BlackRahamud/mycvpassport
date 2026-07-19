/**
 * Vercel serverless: send a transactional shortlist email via Resend.
 *
 * POST /api/notify-candidate
 * body: { applicationId, candidateEmail, candidateName, jobTitle }
 *
 * Requires RESEND_API_KEY in Vercel project env vars. Returns:
 *   200 { ok: true,  id }      — accepted by Resend
 *   400 { ok: false, error }   — bad request payload
 *   500 { ok: false, error }   — env not configured / Resend SDK threw
 *   502 { ok: false, error }   — Resend rejected the send
 *
 * The HR-side caller treats any !ok response as "email failed" and shows
 * a yellow toast; status update is never blocked.
 */

import { Resend } from 'resend';

export const config = { maxDuration: 15 };

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// ── iCalendar (.ics) helpers — interview invite attachment ──────────
function icsStamp(d) {
  // UTC basic format: YYYYMMDDTHHMMSSZ
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}
function icsEscape(s) {
  return String(s || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}
/**
 * A real invite, not just a file: stable UID per interview
 * (interview-<id>@mycvpassport.com) + SEQUENCE so reschedules and cancels
 * update the SAME calendar entry, ORGANIZER + ATTENDEE lines so Outlook
 * and Google render Accept/Decline instead of a dead attachment.
 * method: 'REQUEST' (schedule + reschedule) | 'CANCEL'.
 */
function buildIcs({ start, durationMin, summary, description, location, uid, sequence = 0, method = 'REQUEST', organizerName, organizerEmail, attendees = [] }) {
  const end = new Date(start.getTime() + (Number(durationMin) || 30) * 60000);
  const cancelled = method === 'CANCEL';
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CVPassport//Interview//EN',
    'CALSCALE:GREGORIAN',
    `METHOD:${method}`,
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `SEQUENCE:${Number(sequence) || 0}`,
    `DTSTAMP:${icsStamp(new Date())}`,
    `DTSTART:${icsStamp(start)}`,
    `DTEND:${icsStamp(end)}`,
    `SUMMARY:${icsEscape(summary)}`,
    description ? `DESCRIPTION:${icsEscape(description)}` : null,
    location ? `LOCATION:${icsEscape(location)}` : null,
    organizerEmail ? `ORGANIZER;CN=${icsEscape(organizerName || 'CVPassport HR')}:mailto:${organizerEmail}` : null,
    ...attendees
      .filter((a) => a && a.email)
      .map((a) => `ATTENDEE;CN=${icsEscape(a.name || a.email)};ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${a.email}`),
    `STATUS:${cancelled ? 'CANCELLED' : 'CONFIRMED'}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean);
  return lines.join('\r\n');
}

// ── Corridor timezones, server side ─────────────────────────────────
// A deliberate twin of the word list in src/lib/hr/interviewTz.js. The
// client sends its own rendering of the when-line, but the server never
// trusts it: a raw IANA name once reached a candidate ("Mon, Jul 13,
// 2026, 11:00 AM (Asia/Calcutta)") from a build that predates the
// corridor rewrite, and a stale open portal tab can still post that
// shape today. So the line is rebuilt here from the instant plus the two
// zone names, and the client string is only ever a sanitised fallback.
// Keep these words in sync with CORRIDOR_ZONES in interviewTz.js.
const ZONE_WORDS = {
  'Asia/Kolkata': 'India',
  'Asia/Calcutta': 'India',
  'Asia/Dubai': 'Dubai',
  'Asia/Riyadh': 'Saudi Arabia',
  'Asia/Qatar': 'Qatar',
  'Asia/Muscat': 'Oman',
  'Asia/Bahrain': 'Bahrain',
  'Asia/Kuwait': 'Kuwait',
};

// "Region/City" — the shape that must never reach a candidate.
const IANA_SHAPE = /[A-Za-z]+\/[A-Za-z_]+/;

/** Corridor word, else the city segment in words. Never "Region/City". */
function zoneWord(tz) {
  if (!tz) return '';
  if (ZONE_WORDS[tz]) return ZONE_WORDS[tz];
  const city = String(tz).split('/').pop() || '';
  return city.replace(/_/g, ' ').trim();
}

function timeIn(date, tz) {
  try {
    return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: tz }).format(date);
  } catch { return null; }
}
function dayIn(date, tz) {
  try {
    return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: tz }).format(date);
  } catch { return null; }
}

/**
 * The when-line, rebuilt from the instant and the two zones:
 *   "Tue 14 Jul, 3:00 PM Dubai, 4:30 PM India"  — both zones read
 *   "Mon 13 Jul, 11:00 AM India"                — only one zone reads
 * Returns null when neither zone reads, so the caller can fall back.
 */
function buildWhenLine({ start, hrTz, candidateTz }) {
  const hDay = hrTz ? dayIn(start, hrTz) : null;
  const hTime = hrTz ? timeIn(start, hrTz) : null;
  const cDay = candidateTz ? dayIn(start, candidateTz) : null;
  const cTime = candidateTz ? timeIn(start, candidateTz) : null;
  const hWord = zoneWord(hrTz);
  const cWord = zoneWord(candidateTz);

  if (hDay && hTime && hWord && cDay && cTime && cWord) {
    // Same wall clock in both zones reads as one time, not a repeat.
    if (hTime === cTime && hDay === cDay) return `${hDay}, ${hTime} ${hWord}`;
    const candSide = hDay === cDay ? `${cTime} ${cWord}` : `${cTime} ${cWord} on ${cDay}`;
    return `${hDay}, ${hTime} ${hWord}, ${candSide}`;
  }
  // One zone only — the single-zone variant the design accounts for.
  const day = cDay || hDay;
  const time = cTime || hTime;
  const word = cDay ? cWord : hWord;
  if (day && time && word) return `${day}, ${time} ${word}`;
  if (day && time) return `${day}, ${time}`;
  return null;
}

/** Last resort when no zone reads at all: human, spelled, never an id. */
function utcWhenLine(start) {
  const d = dayIn(start, 'UTC');
  const t = timeIn(start, 'UTC');
  return d && t ? `${d}, ${t} GMT` : '';
}

/** A client-rendered line is usable only if it carries no IANA name. */
function safeClientLine(whenLabel, dualTimeLine) {
  const s = [whenLabel, dualTimeLine].filter(Boolean).join(', ').trim();
  if (!s) return '';
  return IANA_SHAPE.test(s) ? '' : s;
}

// ── Interview emails (schedule / reschedule / cancel, with .ics) ────
// kind: 'interview' | 'interview_reschedule' | 'interview_cancel'.
// The UID is stable per interview (interview-<interviewId>@mycvpassport.com)
// and `sequence` (interviews.ics_sequence) bumps on every change, so the
// candidate's calendar updates in place instead of growing duplicates.
// hrEmail lands as reply-to + a copy to the HR (her own calendar entry).
// Pure: everything the send needs, nothing that touches the network, so
// scripts/verify-interview-email.mjs can render and assert every state.
export function buildInterviewEmail(body, kind = 'interview') {
  const {
    candidateEmail, candidateName, jobTitle, scheduledAt, durationMin,
    meetingLink, note, whenLabel, dualTimeLine, interviewId, sequence,
    hrEmail, hrName, hrCompany, hrTz, candidateTz,
    location, address, dressCode, interviewType,
  } = body;
  if (!candidateEmail || !jobTitle || !scheduledAt) {
    return { ok: false, error: 'Missing candidateEmail, jobTitle or scheduledAt' };
  }
  const start = new Date(scheduledAt);
  if (Number.isNaN(start.getTime())) {
    return { ok: false, error: 'Invalid scheduledAt' };
  }
  const cancel = kind === 'interview_cancel';
  const reschedule = kind === 'interview_reschedule';
  const dur = Number(durationMin) || 30;
  const firstName = String(candidateName || '').split(' ')[0] || 'there';

  // Rebuilt here first, the client's own string only as a sanitised
  // fallback, a spelled GMT line as the floor. No path prints an IANA id.
  const when = buildWhenLine({ start, hrTz, candidateTz })
    || safeClientLine(whenLabel, dualTimeLine)
    || utcWhenLine(start);

  // In person when it is declared, or inferable from a venue with no link.
  const venue = String(location || '').trim();
  const venueAddress = String(address || '').trim();
  const dress = String(dressCode || '').trim();
  const link = String(meetingLink || '').trim();
  const inPerson = interviewType === 'in_person' || (!link && Boolean(venue || venueAddress));
  const mapHref = (venueAddress || venue)
    ? `https://maps.google.com/?q=${encodeURIComponent(venueAddress || venue)}`
    : '';

  // The signature signs as the human when we have her name; the company
  // line and the reply promise only appear when they are real. Nothing
  // renders an empty row (title, phone and photo are not stored yet).
  const signerName = String(hrName || '').trim();
  const signerCompany = String(hrCompany || '').trim();
  const signerFirst = signerName ? signerName.split(' ')[0] : '';
  const subject = cancel
    ? `Interview cancelled, ${jobTitle}`
    : reschedule
      ? `Interview rescheduled, ${jobTitle}`
      : `Interview scheduled, ${jobTitle}`;
  const banner = cancel
    ? 'Your interview has been cancelled'
    : reschedule
      ? 'Your interview has a new time'
      : 'Your interview is scheduled';

  const ics = buildIcs({
    start,
    durationMin: dur,
    summary: `Interview: ${jobTitle}`,
    description: [note, link ? `Join: ${link}` : ''].filter(Boolean).join('\n') || `Interview for ${jobTitle}`,
    // A venue beats a link in the calendar entry: it is what the
    // candidate needs to navigate to on the day.
    location: [venue, venueAddress].filter(Boolean).join(', ') || link || '',
    uid: interviewId
      ? `interview-${interviewId}@mycvpassport.com`
      : `${start.getTime()}-${Math.round(Math.random() * 1e9)}@mycvpassport.com`,
    sequence: Number(sequence) || 0,
    method: cancel ? 'CANCEL' : 'REQUEST',
    organizerName: hrName || 'CVPassport HR',
    organizerEmail: 'hr@mycvpassport.com',
    attendees: [
      { name: candidateName, email: candidateEmail },
      hrEmail ? { name: hrName, email: hrEmail } : null,
    ].filter(Boolean),
  });
  const icsB64 = Buffer.from(ics, 'utf8').toString('base64');

  const lede = cancel
    ? `Your interview for ${jobTitle} has been cancelled. If a new time is picked you will receive a fresh invite.`
    : reschedule
      ? `Your interview for ${jobTitle} has moved to a new time. The attached invite updates the entry already on your calendar.`
      : `Your interview for ${jobTitle} has been scheduled. The attached calendar invite holds the exact time in your timezone.`;

  const icsLine = cancel
    ? 'The attached calendar file removes the entry from your calendar.'
    : 'A calendar invite is attached. Add it to your calendar so you do not miss it.';

  // A cancelled interview reads differently: the time is what the
  // interview WAS, not what it is.
  const whenLabelText = cancel ? 'Was scheduled for' : 'When';

  // Plain text alternate, kept in step with the HTML below.
  const signOffText = signerName
    ? [`Best regards,`, signerName, signerCompany || null,
      hrEmail ? `Reply to this email to reach ${signerFirst} directly.` : null].filter(Boolean).join('\n')
    : 'Best regards,\nThe CVPassport HR Team';

  const text = `Hi ${firstName},

${lede}

${whenLabelText}: ${when}
Duration: ${dur} minutes${!cancel && link ? `\nJoin link: ${link}` : ''}${inPerson && venue ? `\nLocation: ${venue}` : ''}${inPerson && venueAddress ? `\nAddress: ${venueAddress}` : ''}${inPerson && dress ? `\nDress code: ${dress}` : ''}${note ? `\nNote: ${note}` : ''}

${icsLine}

${signOffText}

Scheduled with CVPassport. mycvpassport.com`;

  /* ── The email, in what an inbox actually renders ──────────────────
     Tables and inline styles only, no <style> block, no classes, no web
     fonts (Georgia is the one serif installed everywhere), no flex, no
     SVG, no data URIs. Every colour is a solid fill with a bgcolor
     attribute beside it so Outlook, which drops CSS backgrounds on some
     elements, still paints the band. border-radius squares off in
     Outlook by design, so nothing meaningful rests on it. */
  const SERIF = "Georgia,'Times New Roman',serif";
  const SANS = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
  const LABEL = 'font-size:11px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;color:#8B8578;';

  // Scheduled and rescheduled wear the calm tinted band the design asks
  // for. Cancelled does not: a candidate skimming on a phone has to see
  // that the interview is off, so it gets a solid fill, white ink and a
  // larger size. Elegance for the calm states, no ambiguity for this one.
  const bannerBg = cancel ? '#9E4A39' : reschedule ? '#F4EAD6' : '#E7EEE3';
  const bannerInk = cancel ? '#FFFFFF' : reschedule ? '#855618' : '#3E5A44';
  const bannerDot = cancel ? '#FFFFFF' : reschedule ? '#B0752B' : '#4F6B57';
  const bannerSize = cancel ? '15px' : '13px';

  const panelRow = (label, valueHtml, topGap) =>
    `<div style="${LABEL}margin:${topGap ? '20px' : '0'} 0 6px;">${label}</div>${valueHtml}`;

  const rows = [
    `<div style="${LABEL}margin:0 0 9px;">${escapeHtml(whenLabelText)}</div>
     <div style="font-family:${SERIF};font-size:24px;font-weight:700;line-height:1.32;color:#23221E;">${escapeHtml(when)}</div>`,
    panelRow('Duration', `<div style="font-size:15px;font-weight:600;color:#2E2C27;">${dur} minutes</div>`, true),
    !cancel && link && !inPerson
      ? panelRow('Join link', `<div style="font-size:14px;"><a href="${escapeHtml(link)}" style="color:#C05F3C;text-decoration:none;word-break:break-all;">${escapeHtml(link)}</a></div>`, true)
      : '',
    inPerson && venue
      ? panelRow('Location', `<div style="font-size:15px;font-weight:600;color:#2E2C27;">${escapeHtml(venue)}</div>${venueAddress ? `<div style="font-size:14px;line-height:1.5;color:#46443E;margin-top:2px;">${escapeHtml(venueAddress)}</div>` : ''}`, true)
      : (inPerson && venueAddress
        ? panelRow('Location', `<div style="font-size:14px;line-height:1.5;color:#46443E;">${escapeHtml(venueAddress)}</div>`, true)
        : ''),
    inPerson && dress
      ? panelRow('Dress code', `<div style="font-size:14px;color:#46443E;">${escapeHtml(dress)}</div>`, true)
      : '',
    note
      ? panelRow('Note', `<div style="font-size:14px;line-height:1.6;color:#46443E;">${escapeHtml(note)}</div>`, true)
      : '',
  ].filter(Boolean).join('\n            ');

  // One action, never two, and none at all on a cancellation.
  const action = cancel
    ? null
    : inPerson
      ? (mapHref ? { href: mapHref, label: 'View on map &rarr;' } : null)
      : (link ? { href: link, label: 'Join the interview &rarr;' } : null);

  const signatureHtml = signerName
    ? `<p style="margin:0 0 12px;font-size:14px;color:#46443E;">Best regards,</p>
        <p style="margin:0;font-family:${SERIF};font-size:18px;font-weight:700;color:#23221E;">${escapeHtml(signerName)}</p>
        ${signerCompany ? `<p style="margin:3px 0 0;font-size:14px;color:#78756B;">${escapeHtml(signerCompany)}</p>` : ''}
        ${hrEmail ? `<p style="margin:13px 0 0;font-size:12px;color:#A8A296;">Reply to this email to reach ${escapeHtml(signerFirst)} directly.</p>` : ''}`
    : `<p style="margin:0 0 12px;font-size:14px;color:#46443E;">Best regards,</p>
        <p style="margin:0;font-family:${SERIF};font-size:18px;font-weight:700;color:#23221E;">The CVPassport HR Team</p>`;

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>${escapeHtml(banner)}</title></head>
<body style="margin:0;padding:0;background:#EFECE3;font-family:${SANS};">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#EFECE3" style="background:#EFECE3;"><tr><td align="center" style="padding:40px 12px 56px;">
    <table width="580" cellpadding="0" cellspacing="0" border="0" bgcolor="#FFFFFF" style="max-width:580px;width:100%;background:#FFFFFF;border:1px solid #E9E3D6;border-radius:12px;">

      <tr><td align="center" bgcolor="#F6F3EB" style="background:#F6F3EB;border-bottom:1px solid #E9E3D6;padding:26px 40px;border-radius:12px 12px 0 0;">
        <table cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="padding-right:13px;"><img src="https://www.mycvpassport.com/logo512.png" width="40" height="40" alt="CVPassport" style="display:block;width:40px;height:40px;border:0;outline:none;text-decoration:none;"/></td>
          <td style="font-family:${SERIF};font-size:22px;font-weight:700;letter-spacing:-0.2px;color:#23221E;">CVPassport</td>
        </tr></table>
      </td></tr>

      <tr><td align="center" bgcolor="${bannerBg}" style="background:${bannerBg};padding:12px 40px;">
        <table cellpadding="0" cellspacing="0" border="0"><tr>
          <td width="8" style="width:8px;"><div style="width:8px;height:8px;background:${bannerDot};border-radius:8px;font-size:0;line-height:8px;">&nbsp;</div></td>
          <td style="padding-left:8px;color:${bannerInk};font-size:${bannerSize};font-weight:700;letter-spacing:0.2px;">${escapeHtml(banner)}</td>
        </tr></table>
      </td></tr>

      <tr><td style="padding:36px 44px 30px;">
        <p style="margin:0 0 16px;font-family:${SERIF};font-size:19px;font-weight:400;color:#23221E;">Hi ${escapeHtml(firstName)},</p>
        <p style="margin:0 0 28px;font-size:15px;line-height:1.7;color:#46443E;">${escapeHtml(lede)}</p>

        <table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F6F3EB" style="background:#F6F3EB;border:1px solid #EBE5D8;border-radius:10px;margin:0 0 28px;">
          <tr><td style="padding:24px 26px;">
            ${rows}
          </td></tr>
        </table>

        ${action ? `<table cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 26px;"><tr><td align="center" bgcolor="#C05F3C" style="background:#C05F3C;border-radius:8px;"><a href="${escapeHtml(action.href)}" style="display:inline-block;padding:15px 42px;font-family:${SANS};font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;">${action.label}</a></td></tr></table>` : ''}

        <p style="margin:0;font-size:13px;line-height:1.65;color:#8B8578;">${escapeHtml(icsLine)}</p>
      </td></tr>

      <tr><td style="padding:0 44px;"><div style="border-top:1px solid #EBE5D8;font-size:0;line-height:0;">&nbsp;</div></td></tr>

      <tr><td style="padding:24px 44px 8px;">
        ${signatureHtml}
      </td></tr>

      <tr><td style="padding:18px 44px 30px;">
        <div style="border-top:1px solid #EEE9DD;padding-top:15px;">
          <p style="margin:0;font-size:11px;line-height:1.55;color:#B4AE9F;">Scheduled with CVPassport. &copy; ${new Date().getFullYear()} CVPassport, <a href="https://www.mycvpassport.com" style="color:#B4AE9F;text-decoration:none;">mycvpassport.com</a></p>
        </div>
      </td></tr>

    </table>
  </td></tr></table>
</body></html>`;

  return { ok: true, subject, html, text, ics, icsB64, cancel, when, candidateEmail, hrEmail };
}

async function sendInterviewEmail(res, apiKey, body, kind = 'interview') {
  const built = buildInterviewEmail(body, kind);
  if (!built.ok) return res.status(400).json({ ok: false, error: built.error });
  const { subject, html, text, icsB64, cancel, candidateEmail, hrEmail } = built;

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: 'CVPassport HR <hr@mycvpassport.com>',
      to: [candidateEmail],
      // Her own copy: the same invite lands on the HR's calendar too.
      ...(hrEmail ? { cc: [hrEmail] } : {}),
      // Replies go to the human, not the noreply void.
      ...(hrEmail ? { replyTo: hrEmail } : {}),
      subject,
      text,
      html,
      attachments: [{
        filename: 'interview.ics',
        content: icsB64,
        contentType: `text/calendar; method=${cancel ? 'CANCEL' : 'REQUEST'}; charset=UTF-8`,
      }],
    });
    if (error) {
      console.error('[notify-candidate/interview] Resend rejected:', error);
      return res.status(502).json({ ok: false, error: error.message || 'Resend send failed' });
    }
    return res.status(200).json({ ok: true, id: data?.id });
  } catch (e) {
    console.error('[notify-candidate/interview] threw:', e);
    return res.status(500).json({ ok: false, error: e?.message || 'Send failed' });
  }
}

// ── Portal feedback notification (founder-facing) ───────────────────
// The feedback ROW is already persisted by the client before this fires.
// This is only the notification, so it never blocks the submission — the
// client ignores the result. Carries her words, her identity, the route,
// and a session replay link when present. No candidate PII: `body` is her
// own words and the identity is her own (the feedback contract).
async function sendFeedbackEmail(res, apiKey, body) {
  const {
    feedbackBody, route, sessionId, userEmail, userName, userId,
  } = body;
  const text = String(feedbackBody || '').trim();
  if (!text) {
    return res.status(400).json({ ok: false, error: 'Missing feedback body' });
  }

  const to = process.env.FEEDBACK_NOTIFY_EMAIL || 'connectingjunaidkhan@gmail.com';
  const who = userName || userEmail || 'An HR';
  const replayUrl = sessionId
    ? `https://eu.posthog.com/project/166982/replay/${encodeURIComponent(sessionId)}`
    : '';
  const subject = `New feedback from ${who}`;

  const metaLines = [
    userName ? `From: ${userName}` : null,
    userEmail ? `Email: ${userEmail}` : null,
    userId ? `User id: ${userId}` : null,
    route ? `Route: ${route}` : null,
    replayUrl ? `Session replay: ${replayUrl}` : 'Session replay: not available',
  ].filter(Boolean);

  const plain = `${text}

---
${metaLines.join('\n')}`;

  const html = `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>New feedback</title></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:40px 0;"><tr><td align="center">
    <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
      <tr><td style="background:#14131F;padding:26px 40px;">
        <div style="font-size:13px;color:#B9B9C6;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:6px;">CVPassport &middot; Portal feedback</div>
        <div style="font-size:18px;font-weight:700;color:#ffffff;">${escapeHtml(who)} sent feedback</div>
      </td></tr>
      <tr><td style="padding:32px 40px 8px;">
        <div style="font-size:16px;line-height:1.65;color:#14131F;white-space:pre-wrap;">${escapeHtml(text)}</div>
      </td></tr>
      <tr><td style="padding:24px 40px 8px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#F6F6F9;border:1px solid #E7E7EE;border-radius:10px;">
          <tr><td style="padding:16px 20px;font-size:13px;color:#4B4A5E;line-height:1.9;">
            ${userName ? `<div><strong style="color:#14131F;">From</strong> ${escapeHtml(userName)}</div>` : ''}
            ${userEmail ? `<div><strong style="color:#14131F;">Email</strong> <a href="mailto:${escapeHtml(userEmail)}" style="color:#7C3AED;text-decoration:none;">${escapeHtml(userEmail)}</a></div>` : ''}
            ${userId ? `<div><strong style="color:#14131F;">User id</strong> ${escapeHtml(userId)}</div>` : ''}
            ${route ? `<div><strong style="color:#14131F;">Route</strong> ${escapeHtml(route)}</div>` : ''}
          </td></tr>
        </table>
      </td></tr>
      ${replayUrl ? `<tr><td style="padding:12px 40px 36px;">
        <a href="${escapeHtml(replayUrl)}" style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:600;color:#ffffff;background:#7C3AED;border-radius:10px;text-decoration:none;">Watch the session replay &rarr;</a>
      </td></tr>` : '<tr><td style="padding:0 40px 36px;"></td></tr>'}
    </table>
  </td></tr></table>
</body></html>`;

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: 'CVPassport Feedback <hr@mycvpassport.com>',
      to: [to],
      // Replies go straight back to the HR who wrote it (an unpromised
      // reply that arrives is a delight).
      ...(userEmail ? { replyTo: userEmail } : {}),
      subject,
      text: plain,
      html,
    });
    if (error) {
      console.error('[notify-candidate/feedback] Resend rejected:', error);
      return res.status(502).json({ ok: false, error: error.message || 'Resend send failed' });
    }
    return res.status(200).json({ ok: true, id: data?.id });
  } catch (e) {
    console.error('[notify-candidate/feedback] threw:', e);
    return res.status(500).json({ ok: false, error: e?.message || 'Send failed' });
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[notify-candidate] RESEND_API_KEY missing in env');
    return res.status(500).json({ ok: false, error: 'Email service not configured' });
  }

  // Interview emails (schedule / reschedule / cancel, with .ics) and the
  // portal feedback notification are distinct branches; the default/no-type
  // path remains the original shortlist email verbatim.
  const bodyType = (req.body || {}).type;
  if (bodyType === 'interview' || bodyType === 'interview_reschedule' || bodyType === 'interview_cancel') {
    return sendInterviewEmail(res, apiKey, req.body || {}, bodyType);
  }
  if (bodyType === 'feedback') {
    return sendFeedbackEmail(res, apiKey, req.body || {});
  }

  const { candidateEmail, candidateName, jobTitle } = req.body || {};
  if (!candidateEmail || !jobTitle) {
    return res.status(400).json({ ok: false, error: 'Missing candidateEmail or jobTitle' });
  }

  const firstName = String(candidateName || '').split(' ')[0] || 'there';
  const subject = `You've been shortlisted for ${jobTitle} at CVPassport`;

  const text = `Hi ${firstName},

Great news! Your application for ${jobTitle} has been moved to the shortlist.
Our team will be in touch shortly with next steps.

Best regards,
The CVPassport HR Team`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>You've been shortlisted!</title></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:40px 0;">
    <tr><td align="center">
      <table width="580" cellpadding="0" cellspacing="0" style="max-width:580px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">

        <!-- Header banner -->
        <tr>
          <td style="background:linear-gradient(135deg,#0F3460 0%,#1a4a7a 100%);padding:32px 40px;text-align:center;">
            <div style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">CV<span style="color:#38bdf8;">Passport</span></div>
            <div style="font-size:11px;color:#94c8e8;letter-spacing:2px;margin-top:4px;text-transform:uppercase;">HR Portal</div>
          </td>
        </tr>

        <!-- Green congrats bar -->
        <tr>
          <td style="background:#16a34a;padding:14px 40px;text-align:center;">
            <span style="color:#ffffff;font-size:13px;font-weight:600;letter-spacing:0.5px;">🎉 &nbsp;Congratulations — You've been shortlisted!</span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 32px;">
            <p style="margin:0 0 20px;font-size:16px;color:#0F172A;font-weight:600;">Hi ${escapeHtml(firstName)},</p>
            <p style="margin:0 0 16px;font-size:15px;color:#334155;line-height:1.65;">
              Great news! After reviewing your application, we're pleased to let you know that you have been <strong style="color:#0F3460;">shortlisted</strong> for the following role:
            </p>

            <!-- Job card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;border:1px solid #E2E8F0;border-left:4px solid #0F3460;border-radius:8px;margin:24px 0;">
              <tr>
                <td style="padding:20px 24px;">
                  <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Position</div>
                  <div style="font-size:18px;font-weight:700;color:#0F3460;">${escapeHtml(jobTitle)}</div>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 28px;font-size:15px;color:#334155;line-height:1.65;">
              Our hiring team will be reaching out shortly with the next steps in the process. Please keep an eye on your inbox.
            </p>

            <!-- CTA Button -->
            <table cellpadding="0" cellspacing="0" style="margin:0 auto 8px;">
              <tr>
                <td style="background:#0F3460;border-radius:8px;text-align:center;">
                  <a href="https://www.mycvpassport.com" style="display:inline-block;padding:14px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;letter-spacing:0.3px;">Visit CVPassport &rarr;</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Divider -->
        <tr><td style="padding:0 40px;"><div style="border-top:1px solid #E5E7EB;"></div></td></tr>

        <!-- Footer -->
        <tr>
          <td style="padding:24px 40px 32px;text-align:center;">
            <p style="margin:0 0 8px;font-size:13px;color:#64748b;line-height:1.6;">
              Best regards,<br/>
              <strong style="color:#0F3460;">The CVPassport HR Team</strong>
            </p>
            <p style="margin:12px 0 0;font-size:11px;color:#94a3b8;">
              You're receiving this email because you applied via CVPassport.<br/>
              &copy; ${new Date().getFullYear()} CVPassport &mdash; <a href="https://www.mycvpassport.com" style="color:#0F3460;text-decoration:none;">mycvpassport.com</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from: 'CVPassport HR <hr@mycvpassport.com>',
      to: [candidateEmail],
      subject,
      text,
      html,
    });
    if (error) {
      console.error('[notify-candidate] Resend rejected:', error);
      return res.status(502).json({ ok: false, error: error.message || 'Resend send failed' });
    }
    return res.status(200).json({ ok: true, id: data?.id });
  } catch (e) {
    console.error('[notify-candidate] threw:', e);
    return res.status(500).json({ ok: false, error: e?.message || 'Send failed' });
  }
}
