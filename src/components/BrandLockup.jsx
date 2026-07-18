// =============================================================
// BrandLockup — the candidate-side CVPassport header lockup.
//
// The ONE place the brand mark + wordmark is defined for candidate
// surfaces (builder, dashboard bands, tools). Uses the same icon asset
// as the HR portal header (/assets/brand/logo512.png) so the mark is
// identical product-wide, with the candidate token cascade for the
// wordmark (never the portal --pj-* family).
//
// This exists because four surfaces in a row shipped a hand-styled
// <span>CVPassport</span> text wordmark. Import this instead.
// =============================================================

export default function BrandLockup({ size = 24, className = "" }) {
  return (
    <span
      className={className}
      style={{ display: "inline-flex", alignItems: "center", gap: 7, userSelect: "none", minWidth: 0 }}
    >
      <img
        src="/assets/brand/logo512.png"
        alt=""
        aria-hidden="true"
        style={{ width: size, height: size, borderRadius: 6, flexShrink: 0, display: "block" }}
      />
      <span
        style={{
          fontSize: 16.5,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          lineHeight: 1,
          whiteSpace: "nowrap",
          color: "var(--text-primary)",
        }}
      >
        CVPassport
      </span>
    </span>
  );
}
