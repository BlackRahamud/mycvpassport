import { motion, useReducedMotion } from "framer-motion";

/**
 * Segmented pill toggle. Used for:
 *   - Currency 3-way (AED / INR / USD)
 *   - Driving licence 2-way (Yes / No)
 * Renders as horizontal connected pills. Active segment gets the
 * purple primary fill; others stay neutral with hover affordance.
 *
 * Pass options as either string[] or { value, label }[].
 */
export default function SegmentedToggle({ options, value, onChange, ariaLabel, size = "md" }) {
  const reduce = useReducedMotion();
  const opts = options.map((o) => (typeof o === "string" ? { value: o, label: o } : o));
  const heightClass = size === "sm" ? "pj-segtoggle pj-segtoggle--sm" : "pj-segtoggle";
  return (
    <div className={heightClass} role="radiogroup" aria-label={ariaLabel}>
      {opts.map((o) => {
        const active = o.value === value;
        return (
          <motion.button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            className={`pj-segtoggle__btn${active ? " pj-segtoggle__btn--active" : ""}`}
            onClick={() => onChange(o.value)}
            whileTap={reduce ? undefined : { scale: 0.97 }}
            transition={{ duration: 0.16, ease: [0.4, 0, 0.2, 1] }}
          >
            {o.label}
          </motion.button>
        );
      })}
    </div>
  );
}
