import HrPricing from "../Pricing/HrPricing";

/* The 10-listing / free-trial cap now lands on the Enterprise pricing
   screen (contact-sales) instead of a dead-end wall. PostJobPage still
   renders this at the cap; the body is the shared HrPricing surface so
   the cap moment and /hr/pricing stay identical. daysSinceSignup is no
   longer surfaced (the screen is the same regardless of timing). */
export default function PostJobExpiredPaywall() {
  return <HrPricing />;
}
