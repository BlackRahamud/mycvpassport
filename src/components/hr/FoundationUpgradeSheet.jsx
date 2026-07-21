import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { useFoundationPrice } from "../../lib/employer/useFoundationPrice";
import { startFoundationCheckout } from "../../lib/employer/foundationCheckout";
import "./surfaceGlass.css";
import "./foundationUpgradeSheet.css";

/**
 * Foundation upgrade sheet, Section F of the pricing canvas.
 *
 * Glass, because it is a floating surface. The pricing card on the page
 * is solid; this one hovers over portal context, so it earns the glass.
 *
 * The canvas draws an inline card form beside this sheet. We do not
 * collect card numbers: both gateways are hosted checkouts and a PAN in
 * our DOM is a PCI problem, not a styling choice. The commit button hands
 * off to the gateway the visitor's currency implies, which is why the
 * footnote names the processor. Everything up to that moment is as drawn.
 *
 * One payment. No auto renew, and nothing here implies one.
 */

const EASE = [0.4, 0, 0.2, 1];

const CheckIc = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

export default function FoundationUpgradeSheet({ open, onClose, user, heading, blurb, ctaLabel }) {
  const reduce = useReducedMotion();
  const price = useFoundationPrice();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const closeRef = useRef(null);

  useEffect(() => {
    if (!open) { setError(null); setBusy(false); return undefined; }
    const onKey = (e) => { if (e.key === "Escape" && !busy) onClose?.(); };
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  const commit = async () => {
    if (busy || !price.resolved) return;
    setBusy(true);
    setError(null);
    const res = await startFoundationCheckout({ currency: price.currency, user });
    // On success the browser is already navigating (Ziina) or the gateway
    // modal is open (Razorpay), so we deliberately stay busy rather than
    // flicking the button back to idle under a leaving page.
    if (!res?.ok) { setError(res?.error || "Could not start checkout. Please try again."); setBusy(false); }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fus-scrim"
          role="dialog"
          aria-modal="true"
          aria-label="Upgrade to Foundation"
          onClick={() => !busy && onClose?.()}
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 0.22, ease: EASE }}
        >
          <motion.div
            className="fus-sheet"
            onClick={(e) => e.stopPropagation()}
            initial={reduce ? false : { y: 18, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={reduce ? { opacity: 1 } : { y: 12, scale: 0.985, opacity: 0 }}
            transition={{ duration: 0.3, ease: EASE }}
          >
            <button ref={closeRef} type="button" className="fus-close" onClick={() => !busy && onClose?.()} aria-label="Close">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>

            <div className="fus-top">
              <span className="fus-eyebrow">Foundation</span>
              <span className="fus-rate"><span className="fus-rate__dot" aria-hidden="true" />Founding rate</span>
            </div>

            <h2 className="fus-h2">{heading || "Upgrade to Foundation"}</h2>
            {blurb && <p className="fus-blurb">{blurb}</p>}

            <div className="fus-pricerow">
              {price.resolved ? (
                <>
                  {price.anchorLabel && <s className="fus-struck">{price.anchorLabel}</s>}
                  <span className="fus-amount">{price.amountLabel}</span>
                </>
              ) : (
                <span className="fus-amount fus-amount--holding" aria-hidden="true">&nbsp;</span>
              )}
            </div>
            <div className="fus-per">per month</div>

            <ul className="fus-list">
              <li><span className="fus-tick"><CheckIc /></span>Up to 3 active jobs</li>
              <li><span className="fus-tick"><CheckIc /></span>Full candidate evaluation</li>
              <li><span className="fus-tick"><CheckIc /></span>Employer analytics and one recruiter login</li>
            </ul>

            <button type="button" className="fus-cta" onClick={commit} disabled={busy || !price.resolved}>
              {busy
                ? "Opening checkout"
                : (ctaLabel
                    ? ctaLabel(price)          // gate E1 wants the price in the button
                    : "Upgrade to Foundation and continue")}
            </button>

            {price.resolved && (
              <p className="fus-note">
                One payment of {price.amountLabel} to continue for now. No automatic renewal.
              </p>
            )}
            {price.resolved && (
              <p className="fus-gateway">
                Secured by {price.processor}, no automatic renewal
              </p>
            )}

            {error && <p className="fus-err" role="alert">{error}</p>}

            <button type="button" className="fus-stay" onClick={() => !busy && onClose?.()}>
              Stay on the free account for now
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
