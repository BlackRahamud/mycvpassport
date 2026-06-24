// =============================================================
// src/components/hr/HrWelcomeRing.jsx
//
// Decorative one-shot welcome animation for the HR portal: the chevron
// icon centred while a thin purple ring sweeps once (~1.5s), then the
// overlay fades to reveal the portal. Built fresh (no showcase HTML
// copied). Once per browser session (sessionStorage). Skipped entirely
// for prefers-reduced-motion. Purely decorative — pointer-events:none,
// self-removing, and if anything throws the portal renders normally.
// =============================================================

import { useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import "./hrWelcomeRing.css";

const SEEN_KEY = "hr_welcome_ring_shown";

export default function HrWelcomeRing() {
  const reduce = useReducedMotion();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (reduce) return undefined;
    let seen = true;
    try { seen = !!(window.sessionStorage && window.sessionStorage.getItem(SEEN_KEY)); } catch { seen = true; }
    if (seen) return undefined;
    try { window.sessionStorage.setItem(SEEN_KEY, "1"); } catch { /* private mode — show once, don't persist */ }
    setShow(true);
    const t = setTimeout(() => setShow(false), 1950); // ring 1.5s + fade 0.4s
    return () => clearTimeout(t);
  }, [reduce]);

  if (!show) return null;

  return (
    <div className="hwr-overlay" aria-hidden="true">
      <div className="hwr-stage">
        <svg className="hwr-ring" viewBox="0 0 120 120" width="120" height="120">
          <circle cx="60" cy="60" r="54" />
        </svg>
        <img className="hwr-icon" src="/assets/brand/logo512.png" alt="" />
      </div>
    </div>
  );
}
