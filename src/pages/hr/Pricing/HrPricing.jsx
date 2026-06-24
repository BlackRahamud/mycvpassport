import { motion, useReducedMotion } from "framer-motion";
import { HR_SALES } from "../../../utils/paywall";
import "../PostJob/postJob.css"; // --pj-* tokens + pj-btn / pj-wordmark
import "./hrPricing.css";

/* Contact-sales only — no price, no Ziina/payment link. Both CTAs read
   from the single HR_SALES config in paywall.js. */
const WA_TEXT = "Hi, I'm interested in CVPassport for hiring — can you share Enterprise pricing?";
const MAIL_SUBJECT = "CVPassport Enterprise — pricing request";
const MAIL_BODY = "Hi, I'd like to learn about CVPassport Enterprise pricing for our hiring team.";

const waHref = `https://wa.me/${HR_SALES.whatsapp}?text=${encodeURIComponent(WA_TEXT)}`;
const mailHref = `mailto:${HR_SALES.email}?subject=${encodeURIComponent(MAIL_SUBJECT)}&body=${encodeURIComponent(MAIL_BODY)}`;

/* Feature/process claims only (marketing rules: no superlatives, no
   stats). Each line maps to something actually built in the portal. */
const INCLUDED = [
  "Unlimited job posts",
  "Candidate pipeline with stage tracking",
  "Cross-job candidate database (CRM)",
  "Hiring insights and analytics",
  "WhatsApp candidate outreach",
  "ATS match scoring on every applicant",
];

const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
const WhatsAppIcon = () => (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.978-.607zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
  </svg>
);
const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-10 5L2 7" />
  </svg>
);

export default function HrPricing() {
  const reduce = useReducedMotion();
  const item = reduce
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } } };

  return (
    <div className="hrp-root">
      <main className="hrp-main">
        <motion.div
          className="hrp-card"
          initial="initial"
          animate="animate"
          transition={{ staggerChildren: 0.07, delayChildren: 0.04 }}
        >
          <motion.span className="hrp-eyebrow" variants={item}>Enterprise</motion.span>

          <motion.h1 className="hrp-title" variants={item}>
            One plan. Your whole hiring pipeline.
          </motion.h1>

          <motion.p className="hrp-lede" variants={item}>
            ATS-engineered hiring for recruiting teams across the UAE, GCC, and India — posting,
            pipeline, candidate database, and analytics in one portal.
          </motion.p>

          <motion.ul className="hrp-list" variants={item}>
            {INCLUDED.map((f) => (
              <li key={f} className="hrp-list__item">
                <span className="hrp-check"><CheckIcon /></span>
                {f}
              </li>
            ))}
          </motion.ul>

          <motion.p className="hrp-contact-label" variants={item}>Contact us for pricing</motion.p>

          <motion.div className="hrp-ctas" variants={item}>
            <motion.a
              className="pj-btn pj-btn--primary hrp-cta"
              href={waHref}
              target="_blank"
              rel="noreferrer noopener"
              whileHover={reduce ? undefined : { y: -1 }}
              whileTap={reduce ? undefined : { scale: 0.985 }}
              transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            >
              <WhatsAppIcon /> Chat on WhatsApp
            </motion.a>
            <motion.a
              className="pj-btn pj-btn--ghost hrp-cta"
              href={mailHref}
              whileHover={reduce ? undefined : { y: -1 }}
              whileTap={reduce ? undefined : { scale: 0.985 }}
              transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
            >
              <MailIcon /> Email us
            </motion.a>
          </motion.div>

          <motion.p className="hrp-foot" variants={item}>
            We'll tailor a plan to your team and market. No card required to talk.
          </motion.p>
        </motion.div>
      </main>
    </div>
  );
}
