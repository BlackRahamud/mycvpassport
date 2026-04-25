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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[notify-candidate] RESEND_API_KEY missing in env');
    return res.status(500).json({ ok: false, error: 'Email service not configured' });
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

  const html = `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#0F3460;line-height:1.55;background:#ffffff;">
  <p style="font-size:16px;margin:0 0 18px;color:#0F172A;">Hi ${escapeHtml(firstName)},</p>
  <p style="font-size:15px;margin:0 0 18px;color:#0F172A;">
    Great news! Your application for <b style="color:#0F3460;">${escapeHtml(jobTitle)}</b> has been moved to the shortlist.
  </p>
  <p style="font-size:15px;margin:0 0 24px;color:#0F172A;">
    Our team will be in touch shortly with next steps.
  </p>
  <p style="font-size:14px;color:#64748b;margin:32px 0 0;border-top:1px solid #E5E7EB;padding-top:16px;">
    Best regards,<br/>
    The CVPassport HR Team
  </p>
</div>`;

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
