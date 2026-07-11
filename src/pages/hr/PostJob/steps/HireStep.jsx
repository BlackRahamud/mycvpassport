import { motion, useReducedMotion } from "framer-motion";
import PhoneInput from "../components/PhoneInput";

export default function HireStep({ value, onChange, onHire, onBack, submitting = false, errorMessage = null }) {
  const reduce = useReducedMotion();
  const set = (patch) => onChange({ ...value, ...patch });

  const containerVariants = { initial: {}, animate: { transition: { staggerChildren: 0.07, delayChildren: 0.06 } } };
  const item = reduce
    ? { initial: { opacity: 1 }, animate: { opacity: 1 } }
    : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } } };

  const consentSubscription = !!value.consentSubscription;
  const consentTerms        = !!value.consentTerms;
  const canHire = consentSubscription && consentTerms && !submitting;

  return (
    <motion.div variants={containerVariants} initial="initial" animate="animate" style={{ display: "flex", flexDirection: "column", flex: 1 }}>
      <motion.h1 className="pj-hire-h1" variants={item}>Great news! You qualify to match.</motion.h1>

      <motion.p
        variants={item}
        style={{ fontSize: 13.5, color: "var(--pj-text-soft)", lineHeight: 1.6, margin: 0 }}
      >
        <b style={{ color: "var(--pj-text)" }}>What happens next:</b> Our dedicated staffing team will reach out to you to share qualified leads, and gather further information if necessary. Only pay when you make a hire.
      </motion.p>

      <motion.div className="pj-field" variants={item} style={{ marginTop: 22, marginBottom: 4 }}>
        <span className="pj-label">Contact phone <span className="pj-label-hint">(optional — for candidate questions)</span></span>
        <PhoneInput
          countryCode={value.hrPhoneCountryCode || "+971"}
          number={value.hrPhone || ""}
          onChange={({ countryCode, number }) => set({ hrPhoneCountryCode: countryCode, hrPhone: number })}
        />
      </motion.div>

      <motion.div className="pj-consent-list" variants={item}>
        <label className="pj-consent">
          <span style={{ position: "relative", display: "inline-flex" }}>
            <input
              type="checkbox"
              className="pj-checkbox-input"
              checked={consentSubscription}
              onChange={(e) => set({ consentSubscription: e.target.checked })}
              style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
            />
            <span className="pj-checkbox__box" aria-hidden />
          </span>
          <p className="pj-consent__text">
            Unless otherwise agreed in your subscription agreement, you agree that all Covered Offers accepted outside the subscription term will be invoiced a Success Fee equal to 15% of Candidate&rsquo;s first-year base salary, with Contractors at $6,000 for the first 6 months, and $12,000 for 12 months.
          </p>
        </label>

        <label className="pj-consent">
          <span style={{ position: "relative", display: "inline-flex" }}>
            <input
              type="checkbox"
              checked={consentTerms}
              onChange={(e) => set({ consentTerms: e.target.checked })}
              style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
            />
            <span className="pj-checkbox__box" aria-hidden />
          </span>
          <p className="pj-consent__text">
            By Clicking &lsquo;Confirm&rsquo; you are agreeing to CVPassport&rsquo;s <span className="pj-link">Terms of Service</span>, <span className="pj-link">Privacy Policy</span>, and agree to reach out to candidates you see on CVPassport only through CVPassport&rsquo;s provided contact information.
          </p>
        </label>
      </motion.div>

      <motion.p className="pj-hire-foot" variants={item}>
        *If candidate is removed within 90 days of making a hire, get credit awards another hire at equivalent Subscription product.
      </motion.p>

      {errorMessage && (
        <motion.div
          variants={item}
          role="alert"
          style={{
            marginTop: 14,
            padding: "10px 14px",
            background: "#FEF2F2",
            border: "1px solid #FECACA",
            borderRadius: 8,
            color: "#991B1B",
            fontSize: 12.5,
            lineHeight: 1.5,
          }}
        >
          {errorMessage}
        </motion.div>
      )}

      <motion.div className="pj-actions" variants={item}>
        <motion.button type="button" className="pj-btn pj-btn--ghost" onClick={onBack} disabled={submitting}
          whileHover={(reduce || submitting) ? undefined : { y: -1 }} whileTap={(reduce || submitting) ? undefined : { scale: 0.985 }}
          transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}>Previous</motion.button>
        <motion.button
          type="button"
          className="pj-btn pj-btn--primary"
          onClick={onHire}
          disabled={!canHire}
          style={{ opacity: canHire ? 1 : 0.55, cursor: canHire ? "pointer" : "not-allowed" }}
          whileHover={(reduce || !canHire) ? undefined : { y: -1 }}
          whileTap={(reduce || !canHire) ? undefined : { scale: 0.985 }}
          transition={{ duration: 0.18, ease: [0.4, 0, 0.2, 1] }}
        >
          {submitting ? "Posting…" : "Post job"}
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
