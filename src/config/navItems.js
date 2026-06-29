// Shared nav data — consumed by MobileNav and DesktopNav.
// Route whitelist: every href below must resolve to a mounted route in App.js.
// Section ordering is locked by the Freebie-First rule in COWORK.md:
// FREE TOOLS must be first, BUILD CV second, EXPLORE third. Do not reorder.
//
// Each item is rich: `icon` (key resolved by NavIcon.jsx → lucide-react),
// `desc` (one short muted line), optional `badge` (FREE TOOL / PRO / NEW),
// and auth/pro gating. Each section ends with a `seeAll` accent link.

export const NAV_SECTIONS = [
  {
    id: 'free-tools',
    label: 'Free Tools',
    seeAll: { label: 'See all free tools', href: '/tools' },
    items: [
      { label: 'Gulf Career Intelligence', href: '/gulf-career',        icon: 'globe',    desc: 'Salary & hiring insights for the Gulf',  badge: 'FREE TOOL', requiresAuth: false },
      { label: 'ATS CV Checker',           href: '/ats',                icon: 'scan',     desc: 'Scan your CV against recruiter filters', badge: 'FREE TOOL', requiresAuth: false },
      { label: 'All Free Tools',           href: '/tools',              icon: 'grid',     desc: 'Everything, no signup needed',           badge: 'FREE TOOL', requiresAuth: false },
      { label: 'Salary Switcher',          href: '/salary-switcher',    icon: 'swap',     desc: 'Compare pay across roles & regions',     badge: 'FREE TOOL', requiresAuth: false },
      { label: 'LinkedIn Optimizer',       href: '/linkedin-optimizer', icon: 'linkedin', desc: 'Polish your profile to get noticed',     badge: 'FREE TOOL', requiresAuth: false },
    ],
  },
  {
    id: 'build-cv',
    label: 'Build CV',
    seeAll: { label: 'See all templates', href: '/templates' },
    items: [
      { label: 'Create New CV', href: '/builder',   icon: 'filePlus', desc: 'Start the guided builder',        requiresAuth: false },
      { label: 'Templates',     href: '/templates', icon: 'template', desc: 'ATS-ready designs to start from', requiresAuth: false },
      { label: 'My CVs',        href: '/dashboard', icon: 'folder',   desc: 'Your saved CVs',                  requiresAuth: true  },
    ],
  },
  {
    id: 'explore',
    label: 'Explore',
    seeAll: { label: 'Browse all jobs', href: '/jobs' },
    items: [
      // Pro-gated: nav renderer redirects logged-out + non-pro users to /pricing.
      { label: 'Job Scout',   href: '/scout',   icon: 'sparkles',  desc: 'AI finds jobs matching your CV', badge: 'PRO', requiresPro: true },
      { label: 'Browse Jobs', href: '/jobs',    icon: 'briefcase', desc: 'Live Gulf openings',             badge: 'NEW', requiresAuth: false },
      { label: 'Blog',        href: '/blog',    icon: 'book',      desc: 'Career advice & resume tips',                  requiresAuth: false },
      { label: 'Pricing',     href: '/pricing', icon: 'tag',       desc: "Plans & what's included",                      requiresAuth: false },
    ],
  },
];

export const FREEBIE_BANNER_COPY = 'All free tools work without signup.';
