import React from 'react';

// Amber pill badge used inside MobileNav + DesktopNav. One-accent
// discipline per STYLE_GUIDE § 2.4 — the only place amber appears
// in the nav surface other than CTAs.
//
// label: the literal text to display ('FREE TOOL' | 'NEW' | 'PRO').
//        Pass through item.badge from navItems.js.
export default function NavBadge({ label = 'FREE TOOL' }) {
  const ariaLabel =
    label === 'PRO' ? 'Pro feature — paid plan required'
    : label === 'NEW' ? 'New feature'
    : 'Free tool — no signup required';

  return (
    <span
      aria-label={ariaLabel}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--nav-accent)',
        background: 'var(--nav-accent-subtle)',
        padding: '2px 8px',
        borderRadius: 'var(--nav-radius-sm)',
        fontFamily: 'inherit',
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
}
