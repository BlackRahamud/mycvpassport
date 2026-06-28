/**
 * FABGuideSteps.js — Source of truth for the 11-step guide choreography.
 *
 * Each step:
 *   id              {number}      1–11
 *   sectionId       {string|null} DOM id to highlight on the page
 *   onEnter         {string|null} Tab key to navigate to when this step activates
 *   autoAction      {boolean}     Tab should auto-trigger its primary action on arrival
 *   navigationSource {string|null} Passed so destination tab knows it was entered via guide
 *   upsell          {boolean}     Whether this step has a pro upsell
 *   bubbleText      {string}      Primary tooltip message
 *   btns            {Array}       style: 'amber' | 'shimmer' | 'skip'
 *   twoPhase        {boolean}     Step renders in two phases
 *   textPhase1      {string}
 *   textPhase2      {string}
 */

export const GUIDE_STEPS = [
  {
    id: 1,
    sectionId: 'section-personal',
    onEnter: null,
    autoAction: false,
    navigationSource: null,
    upsell: false,
    bubbleText: "Let's start with the basics. Fill in your name and contact details.",
    btns: [{ label: 'Next →', style: 'amber' }]
  },
  {
    id: 2,
    sectionId: 'section-summary',
    onEnter: null,
    autoAction: false,
    navigationSource: null,
    upsell: false,
    bubbleText: "Write 2–3 lines about yourself. Tap Edit to open the field.",
    btns: [{ label: 'Next →', style: 'amber' }]
  },
  {
    id: 3,
    sectionId: 'section-experience',
    onEnter: null,
    autoAction: false,
    navigationSource: null,
    upsell: false,
    bubbleText: "Add your work history. Most recent job first.",
    btns: [{ label: 'Next →', style: 'amber' }]
  },
  {
    id: 4,
    sectionId: 'section-education',
    onEnter: null,
    autoAction: false,
    navigationSource: null,
    upsell: false,
    bubbleText: "Add your degree or highest qualification.",
    btns: [{ label: 'Next →', style: 'amber' }]
  },
  {
    id: 5,
    sectionId: 'section-skills',
    onEnter: null,
    autoAction: false,
    navigationSource: null,
    upsell: false,
    bubbleText: "Add 5–8 skills. Use keywords from job descriptions.",
    btns: [{ label: 'Next →', style: 'amber' }]
  },
  {
    id: 6,
    sectionId: 'section-languages',
    onEnter: null,
    autoAction: false,
    navigationSource: null,
    upsell: false,
    bubbleText: "Add languages you speak. English first.",
    btns: [{ label: 'Next →', style: 'amber' }]
  },
  {
    id: 7,
    sectionId: null,
    onEnter: 'templates',
    autoAction: false,
    navigationSource: 'guide_step_7',
    upsell: true,
    bubbleText: "Your info is in. Now pick a template — this is what recruiters actually see.",
    btns: [
      { label: 'Continue free', style: 'amber' },
      { label: 'Upgrade for Pro Templates', style: 'shimmer' }
    ]
  },
  {
    id: 8,
    sectionId: null,
    onEnter: 'ats',
    autoAction: true,
    navigationSource: 'guide_step_8',
    upsell: true,
    bubbleText: "Running your free ATS scan now. This checks if your CV passes recruiter filters.",
    bubbleTextScored: "Free scan: 12 signals checked. Pro checks 40+ against your target job — and shows every keyword that gets you shortlisted.",
    btns: [
      { label: 'Unlock Pro ATS →', style: 'amber' },
      { label: 'Next: Job Match →', style: 'outlined' }
    ]
  },
  {
    id: 9,
    sectionId: null,
    onEnter: 'jobmatch',
    autoAction: false,
    navigationSource: 'guide_step_9',
    upsell: true,
    bubbleText: "Paste any job description above — I'll score your CV against the role and show you exactly which keywords you're missing.",
    bubbleTextTyping: "Good. Now hit Analyse Match ↑ — I'll show your score in seconds.",
    bubbleTextResult: "You're at {score}%. Unlock Pro Job Match to see all missing keywords + get a rewrite suggestion that hits 90%+.",
    btns: []
  },
  {
    id: 10,
    sectionId: null,
    onEnter: 'coverletter',
    autoAction: false,
    navigationSource: null,
    upsell: true,
    twoPhase: true,
    textPhase1: "Almost there. A cover letter doubles your callback rate.",
    textPhase2: "Cover Letter: AED 10. Or unlock everything — AED 29/mo.",
    btns: [
      { label: 'Get Cover Letter — AED 10', style: 'amber' },
      { label: 'Unlock Everything — AED 29/mo', style: 'shimmer' },
      { label: 'Skip → Download my CV', style: 'skip' }
    ]
  },
  {
    id: 11,
    sectionId: null,
    onEnter: null,
    autoAction: false,
    navigationSource: null,
    upsell: false,
    bubbleText: "Your CV is ready. Download it and start applying.",
    btns: [
      { label: 'Download CV ↓', style: 'amber' },
      { label: 'Skip', style: 'skip' }
    ]
  }
];
