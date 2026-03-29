import { getFabMemory, reorderFabMenuOptions } from "./FABLogic";

/** @typedef {{ id: string, label: string, icon: 'info' | 'eye' | 'spark' | 'arrow', primary?: boolean }} FabMenuOption */

/** @typedef {{ title: string, points: { icon: string, text: string }[], menuOptions: FabMenuOption[] }} FabTabConfig */

/** Live FAB data layer: ./FABLogic.js (also `export *` from ./index.js). */

/** Builder FAB cross-sell (paired with FABLogic.shouldShowCoverLetterCrossSell) */
export const FAB_COVER_LETTER_CROSS_SELL = {
  body: "Your CV is strong. Pair it with a cover letter — takes 2 minutes.",
  cta: "Write one now →",
};

export const ATS_HIGH_SCORE_GUIDE = {
  title: "Your score looks good — but are you 100% sure?",
  points: [
    { icon: "target", text: "Free scan checks 12 signals" },
    { icon: "filter", text: "Pro scan checks 40+ recruiter signals" },
    { icon: "edit", text: "ATS systems vary across every company" },
  ],
};

/** Builder tab sheets (content, templates, ats, jobmatch) */
const BUILDER_GUIDES = {
  content: {
    title: "Building your content",
    points: [
      { icon: "edit", text: "Tap Edit on any section to expand and fill it" },
      { icon: "edit", text: "Your CV updates live as you type" },
      { icon: "plus", text: "Add sections using the + button at the bottom" },
    ],
  },
  templates: {
    title: "Choosing a template",
    points: [
      { icon: "filter", text: "Browse by category using the filter pills" },
      { icon: "edit", text: "Free templates apply instantly" },
      { icon: "target", text: "Pro templates unlock with an upgrade" },
    ],
  },
  ats: {
    title: "Your ATS score",
    points: [
      { icon: "target", text: "ATS systems scan your CV before humans see it" },
      { icon: "edit", text: "Fix red items first for the biggest score jump" },
      { icon: "filter", text: "Pro scan checks 40+ signals vs our free 12" },
    ],
  },
  jobmatch: {
    title: "Job Match",
    points: [
      { icon: "paste", text: "Paste a job description in the field below" },
      { icon: "target", text: "We match it against your CV instantly" },
      { icon: "edit", text: "Shows your gaps and strengths for that role" },
    ],
  },
};

/** Route-level sheets */
const ROUTE_GUIDES = {
  mycvs: {
    title: "Managing your CVs",
    points: [
      { icon: "edit", text: "Tap any CV card to open and edit it" },
      { icon: "menu", text: "Use ⋯ menu for rename, duplicate, delete" },
      { icon: "bolt", text: "Walk-In mode builds a CV in 90 seconds" },
    ],
  },
  account: {
    title: "Your account",
    points: [
      { icon: "user", text: "Manage your plan and billing here" },
      { icon: "edit", text: "View your download history" },
      { icon: "target", text: "Upgrade to Pro for unlimited templates" },
    ],
  },
  ats: {
    title: "Your ATS score",
    points: [
      { icon: "target", text: "ATS systems scan your CV before humans see it" },
      { icon: "edit", text: "Fix red items first for the biggest score jump" },
      { icon: "filter", text: "Pro scan checks 40+ signals vs our free 12" },
    ],
  },
  "cover-letter": {
    title: "Cover Letter",
    points: [
      { icon: "letter", text: "We write it based on your CV + job details" },
      { icon: "edit", text: "Fill the fields and generate in seconds" },
      { icon: "edit", text: "Edit the output before downloading" },
    ],
  },
  walkin: {
    title: "Walk-In Mode",
    points: [
      { icon: "bolt", text: "Fill 3 fields — CV generated in 90 seconds" },
      { icon: "user", text: "No account needed" },
      { icon: "target", text: "Perfect for same-day walk-in interviews" },
    ],
  },
};

/** @type {Record<string, FabMenuOption[]>} */
const ROUTE_MENU_OPTIONS = {
  mycvs: [{ id: "guide", label: "Guide", icon: "info", primary: true }],
  account: [{ id: "guide", label: "Guide", icon: "spark", primary: true }],
  ats: [
    { id: "check_pro_ats", label: "Check Pro ATS", icon: "arrow", primary: true },
    { id: "guide", label: "Guide", icon: "spark" },
  ],
  "cover-letter": [{ id: "guide", label: "Guide", icon: "spark", primary: true }],
  walkin: [{ id: "guide", label: "Guide", icon: "spark", primary: true }],
};

/** @type {Record<string, FabMenuOption[]>} */
const BUILDER_MENU_OPTIONS = {
  content: [
    { id: "preview_cv", label: "Preview CV", icon: "eye", primary: true },
    { id: "guide", label: "Guide", icon: "spark" },
  ],
  templates: [
    { id: "preview_template", label: "Preview template", icon: "eye", primary: true },
    { id: "guide", label: "Guide", icon: "spark" },
  ],
  ats: [
    { id: "check_pro_ats", label: "Check Pro ATS", icon: "arrow", primary: true },
    { id: "guide", label: "Guide", icon: "spark" },
  ],
  jobmatch: [
    { id: "preview_cv", label: "Preview CV", icon: "eye", primary: true },
    { id: "guide", label: "Guide", icon: "spark" },
  ],
};

/**
 * @param {string} tabKey
 * @param {'route' | 'builder'} variant
 * @returns {FabTabConfig | null}
 */
export function getFabTabConfig(tabKey, variant) {
  const guides = variant === "builder" ? BUILDER_GUIDES : ROUTE_GUIDES;
  const menus = variant === "builder" ? BUILDER_MENU_OPTIONS : ROUTE_MENU_OPTIONS;
  const base = guides[tabKey];
  const menuOptions = menus[tabKey];
  if (!base || !menuOptions) return null;
  return {
    title: base.title,
    points: base.points,
    menuOptions: reorderFabMenuOptions(menuOptions, getFabMemory()),
  };
}

export { BUILDER_GUIDES, ROUTE_GUIDES };
