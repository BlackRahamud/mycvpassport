import { useEffect, useRef, useState } from "react";
import { supabase } from "../supabaseClient";
import safeFetch from "../lib/net/safeFetch";
import { logEvent } from "../lib/analytics/logEvent";

const CHECKOUT_SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";

function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Window unavailable"));
      return;
    }
    if (window.Razorpay) {
      resolve(window.Razorpay);
      return;
    }
    const existing = document.querySelector(`script[src="${CHECKOUT_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(window.Razorpay));
      existing.addEventListener("error", () => reject(new Error("Failed to load Razorpay")));
      return;
    }
    const script = document.createElement("script");
    script.src = CHECKOUT_SCRIPT;
    script.async = true;
    script.onload = () => resolve(window.Razorpay);
    script.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.body.appendChild(script);
  });
}

// Charges either a subscription `plan` (tier slug) OR a one-time
// a-la-carte `service` (feature key, e.g. "linkedinOptimizer"). Exactly
// one should be passed. The server derives amount + currency; the client
// only identifies which product.
export default function RazorpayPayment({ plan, service, amountINR, onSuccess, onFailure, onModalOpen }) {
  const startedRef = useRef(false);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    let cancelled = false;

    async function startCheckout() {
      // Mounting this component is the result of an upgrade-CTA click on
      // the INR path — the Ziina/AED twin fires the same event inside
      // getPaymentLink (src/utils/paywall.js).
      logEvent("upgrade_clicked", {
        plan: plan || service,
        price: amountINR ?? null,
        currency: "INR",
        gateway: "razorpay",
        cta_location: typeof window !== "undefined" ? window.location.pathname : null,
      });
      try {
        const keyId = process.env.REACT_APP_RAZORPAY_KEY_ID;
        if (!keyId) {
          throw new Error("Payment gateway not configured");
        }

        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        const user = session?.user;
        if (!token || !user) {
          throw new Error("Please sign in to continue");
        }

        const orderRes = await safeFetch("/api/razorpay?action=order", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          // Server derives amount + currency — client only identifies the
          // product (plan or a-la-carte service). amountINR is still
          // received as a prop for display/analytics but never transmitted.
          body: JSON.stringify(service ? { service } : { plan }),
        });

        const orderData = await orderRes.json().catch(() => ({}));
        if (!orderRes.ok) {
          throw new Error(orderData.error || "Failed to create order");
        }

        const Razorpay = await loadRazorpayScript();
        if (cancelled) return;

        const displayName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          (user.email ? user.email.split("@")[0] : "");

        const rzp = new Razorpay({
          key: keyId,
          amount: orderData.amount,
          currency: orderData.currency,
          name: "CVPassport",
          description: service
            ? "CVPassport — LinkedIn Optimizer"
            : `CVPassport — ${plan.replace(/_/g, " ")}`,
          order_id: orderData.orderId,
          prefill: {
            email: user.email || "",
            name: displayName,
          },
          theme: { color: "#ffffff" },
          handler: async (response) => {
            try {
              const verifyRes = await safeFetch("/api/razorpay?action=verify", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(
                  service
                    ? {
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature,
                        userId: user.id,
                        service,
                      }
                    : {
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature,
                        userId: user.id,
                        plan,
                      }
                ),
              });
              const verifyData = await verifyRes.json().catch(() => ({}));
              if (!verifyRes.ok || !verifyData.success) {
                throw new Error(verifyData.error || "Payment verification failed");
              }
              if (onSuccess) onSuccess();
            } catch (err) {
              if (onFailure) onFailure(err?.message || "Payment verification failed");
            }
          },
          modal: {
            ondismiss: () => {
              if (onFailure) onFailure("Payment cancelled");
            },
          },
        });

        rzp.on("payment.failed", (resp) => {
          const msg = resp?.error?.description || "Payment failed";
          if (onFailure) onFailure(msg);
        });

        if (onModalOpen) onModalOpen();
        setBusy(false);
        // Razorpay modal is about to open with a real server-derived order
        // — the INR equivalent of redirecting to Ziina's hosted page.
        logEvent("checkout_started", {
          plan: plan || service,
          price: Number(orderData.amount) / 100,
          currency: orderData.currency || "INR",
          gateway: "razorpay",
          cta_location: typeof window !== "undefined" ? window.location.pathname : null,
        });
        rzp.open();
      } catch (err) {
        if (!cancelled && onFailure) {
          onFailure(err?.message || "Could not start checkout");
        }
        setBusy(false);
      }
    }

    startCheckout();

    return () => {
      cancelled = true;
    };
  }, [plan, service, amountINR, onSuccess, onFailure, onModalOpen]);

  if (!busy) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10001,
        pointerEvents: "none",
      }}
    />
  );
}
