import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

// Source of truth:
//   /2-LIBRARY/Motion_Atoms/card-hover-lift/motion.json v1.1 (2026-04-21)
//
// Values mirrored here so the component doesn't import JSON at runtime.
// If motion.json is updated, refresh this block and bump the @version.
// Default variant = Linear's snap (300/25/0.5). Primary variant = same
// lift + micro-scale 1.01 + softened spring (280/24/0.5).
//
// Fallback duration/easing (for CSS-transition consumers — this
// component uses Framer Motion, so they're documented only):
//   default: 160ms cubic-bezier(0.25, 0.46, 0.45, 0.94)
//   primary: 180ms cubic-bezier(0.25, 0.46, 0.45, 0.94)
const MOTION_SPECS = {
  default: {
    y: -4,
    scale: 1.0,
    spring: { type: 'spring', stiffness: 300, damping: 25, mass: 0.5 },
  },
  primary: {
    y: -4,
    scale: 1.01,
    spring: { type: 'spring', stiffness: 280, damping: 24, mass: 0.5 },
  },
};

const REDUCED_TRANSITION = { duration: 0.01 };

// Wraps children in a hover-lift motion wrapper.
//
// Does:
//   - Animates transform on hover (y lift + scale for primary).
//   - Uses Framer Motion's whileHover + spring.
//   - Honours prefers-reduced-motion via useReducedMotion() — lift
//     and scale disabled; transition collapses to 10ms. Consumer cards
//     may still change border-color via their own @media
//     (prefers-reduced-motion: reduce) override.
//   - Applies will-change: transform and transform: translateZ(0) on
//     the wrapper for hardware acceleration.
//
// Does NOT:
//   - Apply any card styling. No background, padding, typography,
//     radius, or border. Those belong to the consumer component
//     (Round 2's FeatureCard.jsx).
//
// Round-2 hook points:
//   - data-card-hover-lift="default|primary" on the wrapper — CSS
//     selectors like [data-card-hover-lift="primary"]:hover .border
//     can drive the variant's border-color transition.
export default function CardHoverLift({
  variant = 'default',
  children,
  style,
  className,
  ...rest
}) {
  const spec = MOTION_SPECS[variant] || MOTION_SPECS.default;
  const reduce = useReducedMotion();

  const whileHover = reduce ? undefined : { y: spec.y, scale: spec.scale };
  const transition = reduce ? REDUCED_TRANSITION : spec.spring;

  return (
    <motion.div
      data-card-hover-lift={variant}
      className={className}
      whileHover={whileHover}
      transition={transition}
      style={{
        willChange: 'transform',
        transform: 'translateZ(0)',
        ...style,
      }}
      {...rest}
    >
      {children}
    </motion.div>
  );
}
