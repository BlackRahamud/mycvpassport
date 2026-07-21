import { usePaymentGeo } from "../../hooks/usePaymentGeo";
import { TIERS, getDisplayPrice } from "../../config/tierConfig";

/**
 * Foundation price for the visitor's market. ONE currency per visitor.
 *
 * Geo comes from usePaymentGeo, which reads Vercel's edge IP country, not
 * the device locale or timezone. That distinction is the whole point on
 * this product: an Indian expat in Dubai carries an India-locale, IST
 * phone and must still see AED, because that is where they actually are
 * and which processor can charge them.
 *
 * Both numbers are read from tierConfig. 999 INR and 99 AED are two
 * decided prices, and 1499 / 149 are two decided anchors. Nothing here
 * converts one into the other, at runtime or otherwise.
 *
 * `resolved` is false until the geo call settles. Callers should hold the
 * price rather than render a default and swap it, so a visitor never sees
 * the wrong currency flash.
 */

const REGION_NAME = { AED: "the Gulf", INR: "India" };

function formatAmount(currency, value) {
  if (value == null) return null;
  // en-IN grouping so 1499 reads 1,499 in both markets.
  const n = new Intl.NumberFormat("en-IN").format(value);
  return currency === "AED" ? `AED ${n}` : `₹${n}`;
}

export function useFoundationPrice() {
  const geo = usePaymentGeo();
  const currency = geo.currency === "AED" ? "AED" : "INR";

  const amount = getDisplayPrice("foundation", currency);
  const anchor = TIERS.foundation?.anchor_prices?.[currency] ?? null;

  return {
    resolved: geo.resolved,
    country: geo.country,
    currency,
    processor: geo.processor,           // Ziina for AED, Razorpay for INR
    amount,                             // 99 | 999
    anchor,                             // 149 | 1499
    amountLabel: formatAmount(currency, amount),
    anchorLabel: formatAmount(currency, anchor),
    regionName: REGION_NAME[currency],
  };
}
