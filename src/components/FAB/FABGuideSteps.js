export const GUIDE_STEPS = [
  {
    id: 1, sectionId: 'section-personal', upsell: false,
    bubbleText: "Let's start with the basics. Fill in your name and contact details.",
    btns: [{ label: 'Next →', style: 'amber' }]
  },
  {
    id: 2, sectionId: 'section-summary', upsell: false,
    bubbleText: "Write 2–3 lines about yourself. Recruiters read this first.",
    btns: [{ label: 'Next →', style: 'amber' }]
  },
  {
    id: 3, sectionId: 'section-experience', upsell: false,
    bubbleText: "Add your work history. Most recent job first.",
    btns: [{ label: 'Next →', style: 'amber' }]
  },
  {
    id: 4, sectionId: 'section-education', upsell: false,
    bubbleText: "Add your degree or highest qualification.",
    btns: [{ label: 'Next →', style: 'amber' }]
  },
  {
    id: 5, sectionId: 'section-skills', upsell: false,
    bubbleText: "Add 5–8 skills. Use keywords from job descriptions.",
    btns: [{ label: 'Next →', style: 'amber' }]
  },
  {
    id: 6, sectionId: 'section-languages', upsell: false,
    bubbleText: "Add languages you speak. English first.",
    btns: [{ label: 'Next →', style: 'amber' }]
  },
  {
    id: 7, sectionId: null, view: 'templates', upsell: true,
    bubbleText: "Pick your template. Pro templates are precision-coded for ATS 85+ — better template, better chance.",
    btns: [
      { label: 'Upgrade for Pro Templates', style: 'amber' },
      { label: 'Continue free', style: 'skip' }
    ]
  },
  {
    id: 8, sectionId: null, view: 'ats', upsell: true,
    bubbleText: "Free ATS check done. Want the real picture? Pro ATS scores you against Dubai/Riyadh hiring standards.",
    btns: [
      { label: 'Run Pro ATS', style: 'amber' },
      { label: 'Skip', style: 'skip' }
    ]
  },
  {
    id: 9, sectionId: null, view: 'download', upsell: true,
    twoPhase: true,
    textPhase1: "Boom! Your CV is downloaded. You're ready to apply.",
    textPhase2: "But wait — want to see what recruiters see when they search for you?",
    btns: [
      { label: 'Yes, show me', style: 'amber' },
      { label: "I'm done", style: 'skip' }
    ]
  },
  {
    id: 10, sectionId: null, view: 'jobmatch', upsell: true,
    bubbleText: "Paste a job description — I'll tell you exactly which keywords you're missing.",
    btns: [
      { label: 'Unlock Job Match', style: 'amber' },
      { label: 'Skip', style: 'skip' }
    ]
  },
  {
    id: 11, sectionId: null, view: 'coverletter', upsell: true,
    bubbleText: "A tailored cover letter doubles your callback rate. Cover Letter: AED 10. Or get Full Pro Pass (Job Match + Pro ATS + All Templates) for AED 25.",
    btns: [
      { label: 'Get Cover Letter', style: 'amber' },
      { label: 'Full Pro Pass — AED 25', style: 'amber' },
      { label: 'Skip', style: 'skip' }
    ]
  }
];
