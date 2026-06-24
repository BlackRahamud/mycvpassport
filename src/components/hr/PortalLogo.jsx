// =============================================================
// src/components/hr/PortalLogo.jsx
//
// HR Portal logo lockup: chevron icon + "CVPassport" wordmark + a small
// rounded purple "PORTAL" pill. Built fresh (the icon PNG is the only
// asset taken from the design export). Default = light (ink wordmark);
// pass theme="dark" for white-on-dark surfaces.
// =============================================================

import "./portalLogo.css";

export default function PortalLogo({ theme = "light", className = "" }) {
  return (
    <span className={`plogo plogo--${theme}${className ? ` ${className}` : ""}`}>
      <img className="plogo__icon" src="/assets/brand/logo512.png" alt="" aria-hidden="true" />
      <span className="plogo__word">CVPassport</span>
      <span className="plogo__pill">Portal</span>
    </span>
  );
}
