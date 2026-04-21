// Shared nav data — consumed by MobileNav and DesktopNav.
// Route whitelist: every href below must resolve to a mounted route in App.js.
// Section ordering is locked by the Freebie-First rule in COWORK.md:
// FREE TOOLS must be first, BUILD CV second, EXPLORE third. Do not reorder.

export const NAV_SECTIONS = [
  {
    id: 'free-tools',
    label: 'Free Tools',
    items: [
      { label: 'ATS CV Checker',    href: '/ats',                badge: 'FREE TOOL', requiresAuth: false },
      { label: 'All Free Tools',    href: '/tools',              badge: 'FREE TOOL', requiresAuth: false },
      { label: 'Salary Switcher',   href: '/salary-switcher',    badge: 'FREE TOOL', requiresAuth: false },
      { label: 'LinkedIn Optimizer',href: '/linkedin-optimizer', badge: 'FREE TOOL', requiresAuth: false },
    ],
  },
  {
    id: 'build-cv',
    label: 'Build CV',
    items: [
      { label: 'Create New CV', href: '/builder',   requiresAuth: false },
      { label: 'Templates',     href: '/templates', requiresAuth: false },
      { label: 'My CVs',        href: '/dashboard', requiresAuth: true  },
    ],
  },
  {
    id: 'explore',
    label: 'Explore',
    items: [
      { label: 'Blog',    href: '/blog',    requiresAuth: false },
      { label: 'Pricing', href: '/pricing', requiresAuth: false },
    ],
  },
];

export const FREEBIE_BANNER_COPY = 'All free tools work without signup.';
