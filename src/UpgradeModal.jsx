import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { getPaymentLink } from "./utils/paywall";
import { usePaymentGeo } from "./hooks/usePaymentGeo";
import { getDisplayPrice, A_LA_CARTE } from "./config/tierConfig";
import UpgradeOfferModal from "./components/UpgradeOfferModal";

// Thin layer: decides WHICH offer to show (by feature + visitor geo), reads
// prices from tierConfig, and hands checkout to /pricing. The visuals live in
// components/UpgradeOfferModal.
//   India  -> Express Pass (one time)       -> /pricing?resume=express
//   Gulf   -> Active Hunter (30 days)       -> /pricing?resume=hunter
//   coverLetter -> AED a-la-carte via Ziina (unchanged path)
export default function UpgradeModal({ isOpen, onClose, feature, score = null, missingKeywords = [] }) {
  const navigate = useNavigate();
  const geo = usePaymentGeo();
  const [busy, setBusy] = useState(false);

  const isCoverLetter = feature === "coverLetter";
  const isIndia = geo.currency !== "AED";

  // Projected score uses the same rule as AtsGapsActionCard.
  const gaps = Array.isArray(missingKeywords) ? missingKeywords.slice(0, 3) : [];
  const projected = typeof score === "number" && gaps.length > 0 ? Math.min(score + gaps.length * 10, 95) : null;

  let offer;
  if (isCoverLetter) {
    offer = {
      planName: "Cover Letter",
      price: `AED ${A_LA_CARTE.coverLetter?.prices?.AED}`,
      priceNote: "one-time payment",
      perks: ["One tailored cover letter", "Secure payment"],
      ctaLabel: `Get my cover letter, AED ${A_LA_CARTE.coverLetter?.prices?.AED}`,
      processor: "Ziina",
    };
  } else if (!geo.resolved) {
    offer = { planName: "Premium", price: "", priceNote: "", perks: [], ctaLabel: "Unlock premium", processor: "" };
  } else if (isIndia) {
    const p = getDisplayPrice("express_pass", "INR");
    offer = {
      planName: "Express Pass",
      price: `₹${p}`,
      priceNote: "one-time payment",
      perks: ["No subscription", "3 premium PDF downloads", "Secure payment"],
      ctaLabel: `Unlock my CV, ₹${p}`,
      processor: "Razorpay",
    };
  } else {
    const p = getDisplayPrice("active_hunter", "AED");
    offer = {
      planName: "Active Hunter",
      price: `AED ${p}`,
      priceNote: "30 days, one-time payment",
      perks: ["No auto-renewal", "Unlimited downloads", "Secure payment"],
      ctaLabel: `Unlock for 30 days, AED ${p}`,
      processor: "Ziina",
    };
  }

  const isBuilderAi = feature === "builder_ai";
  const headline = isBuilderAi ? "You've hit your AI rewrites limit this month" : null;
  const lede = isBuilderAi ? "Upgrade for a higher monthly limit on AI rewrites, and tailor every section of your CV." : null;

  const handleUpgrade = async () => {
    if (busy) return;
    if (isCoverLetter) {
      setBusy(true);
      try {
        const url = await getPaymentLink(feature);
        if (url) { window.location.href = url; return; }
      } finally {
        setBusy(false);
      }
      return;
    }
    // /pricing owns auth, INR/Razorpay vs AED/Ziina routing and analytics,
    // and resumes checkout on arrival.
    onClose?.();
    navigate(isIndia ? "/pricing?resume=express" : "/pricing?resume=hunter");
  };

  return (
    <UpgradeOfferModal
      open={!!isOpen}
      onClose={onClose}
      onUpgrade={handleUpgrade}
      loading={busy}
      disabled={!isCoverLetter && !geo.resolved}
      score={feature === "ats" ? score : null}
      projectedScore={feature === "ats" ? projected : null}
      missingKeywords={feature === "ats" ? gaps : []}
      headline={headline}
      lede={lede}
      {...offer}
    />
  );
}
