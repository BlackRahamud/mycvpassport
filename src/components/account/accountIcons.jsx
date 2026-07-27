/* Icons for the account surfaces — traced from the approved design file
   "Account Sheet.dc.html" path-for-path, so the sheet and the popover
   carry the same glyphs the design does. */

export const AcctIconHome = (p) => (
  <svg width={p.size || 17} height={p.size || 17} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 10.5L12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" />
  </svg>
);

export const AcctIconGrid = (p) => (
  <svg width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
    <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
  </svg>
);

export const AcctIconCard = (p) => (
  <svg width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="2" y="5" width="20" height="14" rx="3" /><path d="M2 10h20" />
  </svg>
);

export const AcctIconHelp = (p) => (
  <svg width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.7" />
    <path d="M12 17h.01" />
  </svg>
);

export const AcctIconSignOut = (p) => (
  <svg width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M15 17l5-5-5-5" /><path d="M20 12H9" /><path d="M12 3H5v18h7" />
  </svg>
);

export const AcctIconChevRight = (p) => (
  <svg className={p.className} width={p.size || 16} height={p.size || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M9 6l6 6-6 6" />
  </svg>
);

export const AcctIconChevLeft = (p) => (
  <svg width={p.size || 15} height={p.size || 15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M15 6l-6 6 6 6" />
  </svg>
);

export const AcctIconClose = (p) => (
  <svg width={p.size || 14} height={p.size || 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <path d="M18 6L6 18" /><path d="M6 6l12 12" />
  </svg>
);

export const AcctIconTick = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1D9E75" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

export const AcctIconArrowRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M5 12h14" /><path d="M12 5l7 7-7 7" />
  </svg>
);
