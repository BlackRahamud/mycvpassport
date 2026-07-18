import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

/*
 * Accepted-payment marks for the Ziina (AED) checkout. The SVGs are the real
 * brand files pulled from a maintained payment-logos library (datatrans/
 * payment-logos), served from /public/payment and NEVER recoloured — a
 * recoloured Visa or Mastercard reads as fake. Each mark keeps its own brand
 * colours on a shared neutral white tile so the strip reads as one set.
 *
 * Only the methods the product takes through Ziina are shown (Visa,
 * Mastercard, Apple Pay, Google Pay). UPI is a Razorpay/INR method and is
 * deliberately absent here.
 */
const MARKS = [
  { src: '/payment/visa.svg', alt: 'Visa' },
  { src: '/payment/mastercard.svg', alt: 'Mastercard' },
  { src: '/payment/apple-pay.svg', alt: 'Apple Pay' },
  { src: '/payment/google-pay.svg', alt: 'Google Pay' },
];

const EASE = [0.4, 0, 0.2, 1];

export default function PaymentTrustBar({ style, align = 'center', label = 'Secure payments via' }) {
  const reduce = useReducedMotion();
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: align === 'center' ? 'center' : 'flex-start',
        gap: 12,
        ...style,
      }}
    >
      {label ? (
        <span
          style={{
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: 'var(--text-secondary, #A0A0A0)',
          }}
        >
          {label}
        </span>
      ) : null}
      {/* On-scroll staggered reveal — 40ms between marks, ease out. Reduced
          motion skips the reveal entirely and paints them in place. */}
      <motion.div
        initial={reduce ? false : 'hidden'}
        whileInView={reduce ? undefined : 'show'}
        viewport={{ once: true, amount: 0.6 }}
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
          justifyContent: align === 'center' ? 'center' : 'flex-start',
        }}
      >
        {MARKS.map((m) => (
          <motion.span
            key={m.alt}
            variants={{
              hidden: { opacity: 0, y: 8 },
              show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: EASE } },
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 34,
              padding: '0 10px',
              borderRadius: 8,
              background: '#FFFFFF',
              border: '1px solid var(--border, #2A2A2A)',
              boxShadow: '0 1px 2px rgba(16,15,12,0.06)',
              boxSizing: 'border-box',
            }}
          >
            <img src={m.src} alt={m.alt} style={{ height: 22, width: 'auto', display: 'block' }} />
          </motion.span>
        ))}
      </motion.div>
    </div>
  );
}
