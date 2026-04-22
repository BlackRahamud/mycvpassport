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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const expectedSecret = Deno.env.get("ATS_LEAD_WEBHOOK_SECRET");
    if (expectedSecret) {
      const received = req.headers.get("x-webhook-secret");
      if (received !== expectedSecret) {
        console.warn("ats-lead-welcome: unauthorized webhook call");
        return ok({ skipped: "unauthorized" });
      }
    }

    const payload = await req.json().catch(() => null) as
      | { type?: string; table?: string; schema?: string; record?: Record<string, unknown> }
      | null;

    if (!payload || payload.type !== "INSERT" || !payload.record) {
      console.warn("ats-lead-welcome: ignoring non-INSERT or malformed payload", payload?.type);
      return ok({ skipped: "not-an-insert" });
    }

    const record = payload.record as {
      email?: string | null;
      score?: number | null;
      geo_market?: string | null;
      jd_provided?: boolean | null;
    };

    const score = record.score;
    const email = (record.email ?? "").trim();

    if (score === null || score === undefined) {
      console.log("ats-lead-welcome: skipping pre-analysis row (score is null)");
      return ok({ skipped: "pre-analysis" });
    }

    if (!email) {
      console.log("ats-lead-welcome: skipping row with empty email");
      return ok({ skipped: "no-email" });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      console.error("ats-lead-welcome: RESEND_API_KEY not set");
      return ok({ skipped: "missing-api-key" });
    }

    const html = `<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#0A0A0A;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;color:#FFFFFF;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0A0A0A;padding:40px 20px;">
      <tr>
        <td align="center">
          <table role="presentation" width="560" cellspacing="0" cellpadding="0" style="max-width:560px;background:#141414;border:1px solid #2A2A2A;border-radius:16px;padding:40px 32px;">
            <tr>
              <td>
                <h1 style="margin:0 0 12px;font-size:28px;font-weight:700;color:#FFFFFF;line-height:1.2;">Your CV scored ${score}/100</h1>
                <p style="margin:0 0 28px;font-size:15px;color:#A0A0A0;line-height:1.5;">Here are 3 things to fix for UAE jobs:</p>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom:32px;">
                  <tr>
                    <td style="padding:14px 16px;background:#1C1C1C;border:1px solid #2A2A2A;border-radius:10px;font-size:14px;color:#FFFFFF;line-height:1.5;">
                      <strong style="color:#D97706;">1.</strong> Use exact keywords from the job description
                    </td>
                  </tr>
                  <tr><td style="height:10px;line-height:10px;font-size:0;">&nbsp;</td></tr>
                  <tr>
                    <td style="padding:14px 16px;background:#1C1C1C;border:1px solid #2A2A2A;border-radius:10px;font-size:14px;color:#FFFFFF;line-height:1.5;">
                      <strong style="color:#D97706;">2.</strong> Avoid tables and columns &mdash; ATS parsers struggle with them
                    </td>
                  </tr>
                  <tr><td style="height:10px;line-height:10px;font-size:0;">&nbsp;</td></tr>
                  <tr>
                    <td style="padding:14px 16px;background:#1C1C1C;border:1px solid #2A2A2A;border-radius:10px;font-size:14px;color:#FFFFFF;line-height:1.5;">
                      <strong style="color:#D97706;">3.</strong> Add a Skills section with hard skills listed plainly
                    </td>
                  </tr>
                </table>

                <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
                  <tr>
                    <td align="center" style="background:#D97706;border-radius:12px;">
                      <a href="https://mycvpassport.com" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#FFFFFF;text-decoration:none;">Build an ATS-Ready CV Free</a>
                    </td>
                  </tr>
                </table>

                <p style="margin:40px 0 0;font-size:12px;color:#A0A0A0;line-height:1.5;text-align:center;">You received this because you used the free ATS checker at mycvpassport.com. To unsubscribe reply with 'unsubscribe'.</p>
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
        from: "CVPassport <hello@mycvpassport.com>",
        to: email,
        subject: "Your ATS Score is in — here's what to fix",
        html,
      }),
    });

    if (!resendRes.ok) {
      const errText = await resendRes.text().catch(() => "");
      console.error("ats-lead-welcome: Resend send failed", resendRes.status, errText);
      return ok({ skipped: "resend-error", status: resendRes.status });
    }

    const resendBody = await resendRes.json().catch(() => ({}));
    console.log("ats-lead-welcome: sent", { email, score, id: (resendBody as { id?: string }).id });
    return ok({ sent: true, id: (resendBody as { id?: string }).id ?? null });
  } catch (err) {
    console.error("ats-lead-welcome: unhandled error", err instanceof Error ? err.message : err);
    return ok({ skipped: "internal-error" });
  }
});
