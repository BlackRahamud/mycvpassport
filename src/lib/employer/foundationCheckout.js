import { getPaymentLink } from "../../utils/paywall";
import { supabase } from "../../appSupabaseClient";
import safeFetch from "../net/safeFetch";

/**
 * Foundation checkout handoff.
 *
 * The canvas draws an inline card form. We do not and must not collect a
 * card number: both gateways are hosted checkouts, and putting a PAN in
 * our own DOM is a PCI problem rather than a styling choice. So the
 * upgrade sheet is built as drawn and this module performs the handoff
 * at the moment the user commits.
 *
 * One currency per visitor, decided by IP upstream in useFoundationPrice:
 *   AED -> Ziina, via getPaymentLink('hrFoundation'), which mints the
 *          signed tier:foundation:AED:<uuid> reference the webhook reads.
 *   INR -> Razorpay, via the existing order path with plan 'foundation'.
 *
 * Both land on grant_hr_foundation in the webhook, which is idempotent
 * through the payments.payment_intent_id unique index. Neither is a
 * subscription. There is no auto renew and nothing here implies one.
 *
 * IMPORTANT: never window.open after an await. Popup blockers eat it.
 * Both paths assign window.location.href instead, which survives.
 */

const RZP_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

function loadRazorpay() {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = RZP_SCRIPT;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

/**
 * Start the Foundation purchase. Returns { ok } or { ok:false, error }.
 * `currency` must come from useFoundationPrice so the charge matches the
 * price the visitor was shown.
 */
export async function startFoundationCheckout({ currency, user }) {
  if (currency === "AED") {
    const url = await getPaymentLink("hrFoundation", user?.id, user?.email);
    if (!url) return { ok: false, error: "Could not start checkout. Please try again." };
    window.location.href = url;
    return { ok: true };
  }

  // INR: create a server-priced order, then open Razorpay checkout.
  try {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess?.session?.access_token;
    if (!token) return { ok: false, error: "Please sign in to continue." };

    const res = await safeFetch("/api/razorpay?action=order", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      // Amount and currency are NEVER sent from here. The server prices
      // 'foundation' from tierConfig and the webhook re-checks it.
      body: JSON.stringify({ plan: "foundation" }),
    });
    const order = await res.json().catch(() => ({}));
    if (!res.ok || !order?.orderId) {
      return { ok: false, error: order?.error || "Could not start checkout. Please try again." };
    }

    const loaded = await loadRazorpay();
    if (!loaded || !window.Razorpay) {
      return { ok: false, error: "Could not reach the payment provider. Please try again." };
    }

    const rzp = new window.Razorpay({
      key: process.env.REACT_APP_RAZORPAY_KEY_ID,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: "CVPassport for employers",
      description: "Foundation, one payment to continue",
      prefill: { email: user?.email || "" },
      notes: { plan: "foundation", userId: user?.id || "" },
      theme: { color: "#7C3AED" },
      handler: () => {
        // The webhook is the source of truth for activation. Send the
        // buyer somewhere honest while it lands rather than claiming
        // success from the client.
        window.location.href = "/employer/jobs?upgraded=1";
      },
    });
    rzp.open();
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e?.message || "Could not start checkout. Please try again." };
  }
}
