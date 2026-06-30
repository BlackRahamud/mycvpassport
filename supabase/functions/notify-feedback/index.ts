// =============================================================
// notify-feedback Edge Function
//
// Fires on every insert into public.candidate_feedback and emails the founder
// a copy via Resend. Triggered by a Supabase Database Webhook
// (Database -> Webhooks in the dashboard), not from SQL, so the function URL
// and secret stay out of the schema.
//
// Dashboard webhook setup (one time):
//   - Table: public.candidate_feedback, Events: Insert
//   - Type: Supabase Edge Function -> notify-feedback
//   - HTTP header: x-webhook-secret: <value of FEEDBACK_WEBHOOK_SECRET>
//
// Function secrets (set via `supabase secrets set`, never committed):
//   - RESEND_API_KEY          shared Resend key (already used by other funcs)
//   - FEEDBACK_WEBHOOK_SECRET  shared secret the webhook sends; verified here
//   - FEEDBACK_NOTIFY_TO       founder inbox the digest is sent to
//
// Security: verifies the webhook secret before doing anything; only reacts to
// INSERT payloads; never echoes secrets; degrades quietly (always 200 so the
// webhook is not retried in a loop) and logs skips for observability.
// =============================================================
import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-webhook-secret",
};

const ok = (body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SENTIMENT_LABEL: Record<string, string> = {
  positive: "Good",
  neutral: "Okay",
  negative: "Not great",
};

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const expectedSecret = Deno.env.get("FEEDBACK_WEBHOOK_SECRET");
    if (expectedSecret) {
      const received = req.headers.get("x-webhook-secret");
      if (received !== expectedSecret) {
        console.warn("notify-feedback: unauthorized webhook call");
        return ok({ skipped: "unauthorized" });
      }
    }

    const payload = await req.json().catch(() => null) as
      | { type?: string; record?: Record<string, unknown> }
      | null;

    if (!payload || payload.type !== "INSERT" || !payload.record) {
      console.warn("notify-feedback: ignoring non-INSERT or malformed payload", payload?.type);
      return ok({ skipped: "not-an-insert" });
    }

    const record = payload.record as {
      id?: string | null;
      user_id?: string | null;
      message?: string | null;
      sentiment?: string | null;
      context?: string | null;
      page?: string | null;
      created_at?: string | null;
    };

    const message = (record.message ?? "").trim();
    if (!message) {
      console.log("notify-feedback: skipping row with empty message");
      return ok({ skipped: "empty-message" });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    const notifyTo = (Deno.env.get("FEEDBACK_NOTIFY_TO") ?? "").trim();
    if (!resendKey) {
      console.error("notify-feedback: RESEND_API_KEY not set");
      return ok({ skipped: "missing-api-key" });
    }
    if (!notifyTo) {
      console.error("notify-feedback: FEEDBACK_NOTIFY_TO not set");
      return ok({ skipped: "missing-recipient" });
    }

    const sentiment = record.sentiment ? (SENTIMENT_LABEL[record.sentiment] ?? record.sentiment) : "—";
    const context = (record.context ?? "").trim() || "—";
    const page = (record.page ?? "").trim() || "—";

    const row = (label: string, value: string) => `
      <tr>
        <td style="padding:10px 14px;background:#1C1C1C;border:1px solid #2A2A2A;border-radius:10px;font-size:13px;color:#A0A0A0;line-height:1.5;">
          <span style="color:#D97706;font-weight:600;">${esc(label)}</span><br/>
          <span style="color:#FFFFFF;">${esc(value)}</span>
        </td>
      </tr>
      <tr><td style="height:8px;line-height:8px;font-size:0;">&nbsp;</td></tr>`;

    const html = `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#0A0A0A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;color:#FFFFFF;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0A0A0A;padding:40px 20px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#141414;border:1px solid #2A2A2A;border-radius:16px;padding:32px;">
            <tr>
              <td>
                <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#FFFFFF;line-height:1.2;">New dashboard feedback</h1>
                <p style="margin:0 0 24px;font-size:14px;color:#A0A0A0;line-height:1.5;">Sentiment: <strong style="color:#FFFFFF;">${esc(sentiment)}</strong></p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  ${row("Message", message)}
                  ${row("Was trying to", context)}
                  ${row("Page", page)}
                  ${row("User id", record.user_id ?? "—")}
                  ${row("Submitted", record.created_at ?? "—")}
                </table>
                <p style="margin:24px 0 0;font-size:12px;color:#555;line-height:1.5;">Sent by notify-feedback. Look the user up by id in Supabase; the table is insert-own under RLS.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "CVPassport <noreply@mycvpassport.com>",
        to: notifyTo,
        subject: `Dashboard feedback (${sentiment})`,
        html,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text().catch(() => "");
      console.error("notify-feedback: Resend send failed", resendRes.status, errText);
      return ok({ skipped: "resend-error", status: resendRes.status });
    }

    const resendBody = await resendRes.json().catch(() => ({}));
    console.log("notify-feedback: sent", { id: (resendBody as { id?: string }).id });
    return ok({ sent: true, id: (resendBody as { id?: string }).id ?? null });
  } catch (err) {
    console.error("notify-feedback: unhandled error", err instanceof Error ? err.message : err);
    return ok({ skipped: "internal-error" });
  }
});
