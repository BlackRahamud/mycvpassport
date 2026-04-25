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
