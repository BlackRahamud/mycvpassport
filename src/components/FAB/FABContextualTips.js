/**
 * FABContextualTips — Rule-based contextual assistant tips.
 *
 * Takes the user's current builder context and returns a single actionable tip
 * tailored to where they are and what they've filled so far. UAE / GCC market
 * slant: visa readiness, Gulf-relevant keywords, Arabic as a differentiator,
 * WhatsApp-first recruiter norms, banking / compliance credentials.
 *
 * Keep copy short — tips sit above the FAB menu, not in a full-screen sheet.
 * Two lines max. Lead with the action, then the reason.
 */

const normalizeSection = (raw) => {
  if (!raw) return null;
  const s = String(raw).toLowerCase().replace(/^section-/, "");
  if (s.startsWith("person")) return "personal";
  if (s.startsWith("summar")) return "summary";
  if (s.startsWith("exper")) return "experience";
  if (s.startsWith("educat")) return "education";
  if (s.startsWith("skill")) return "skills";
  if (s.startsWith("lang")) return "languages";
  if (s.startsWith("cert")) return "certifications";
  return null;
};

const SECTION_TIPS = {
  personal: {
    headline: "Make recruiters reach you",
    body: "Add a WhatsApp-ready number with country code (+971 or +91). Gulf recruiters prefer WhatsApp for first contact.",
  },
  summary: {
    headline: "Lead with your Gulf-relevant credential",
    body: "Two or three lines. Name your strongest asset first — years in industry, PMP / SAP / AWS, or prior UAE experience.",
  },
  experience: {
    headline: "Quantify every role",
    body: "Numbers pass ATS and land with Gulf HR. 'Led team of 12' or 'Managed AED 2M budget' beats a paragraph of duties.",
  },
  education: {
    headline: "Put highest degree first",
    body: "Match institution name to what's on your certificate — Gulf employers verify before onboarding.",
  },
  skills: {
    headline: "Mirror the job description",
    body: "Pull 5–8 skills directly from target JDs. ATS filters on exact wording — synonyms get dropped.",
  },
  languages: {
    headline: "Arabic is a differentiator",
    body: "English first. If you read or speak any Arabic, list it — even 'Basic' helps for Dubai, Abu Dhabi and Riyadh roles.",
  },
  certifications: {
    headline: "Pin Gulf-recognised certs up top",
    body: "PMP, SAP, AWS, CFA, AML / KYC — these are the ones Gulf HR filters on. Put them above internal awards.",
  },
};

const TAB_TIPS = {
  templates: {
    headline: "Templates tuned for Gulf ATS",
    body: "Your content carries over when you switch. Pick one that matches how senior the target role is.",
  },
  ats: {
    headline: "Fix red items first",
    body: "They drop your score most. Free scan checks 12 signals — Pro runs 40+ against a specific job description.",
  },
  jobmatch: {
    headline: "Paste the full JD",
    body: "More context sharpens the keyword gap. Include the 'about the company' section — ATS rules look there too.",
  },
  coverletter: {
    headline: "Name the role in line one",
    body: "Gulf HR skim cover letters for specificity. Mention the company and job title in your opener.",
  },
};

const progressTip = (percent, missingSections = []) => {
  const p = Number(percent) || 0;
  const top = missingSections[0];
  if (p < 25) {
    return {
      headline: "Start with Experience",
      body: "It's the heaviest-weighted section (20%) — fills your score fastest and ATS ranks on it first.",
    };
  }
  if (p < 60 && top) {
    return {
      headline: `Add ${top.toLowerCase()} next`,
      body: `Missing: ${missingSections.slice(0, 3).join(", ")}. Gulf ATS systems flag incomplete CVs before a human sees them.`,
    };
  }
  if (p < 90) {
    return {
      headline: "Tighten, then run ATS Check",
      body: "You're close. Fill any remaining section and run ATS Check to catch keyword gaps before you send.",
    };
  }
  return {
    headline: "Your CV is ready — test it",
    body: "Paste a target job into Job Match. If score is below 70%, the JD has keywords your CV is missing.",
  };
};

/**
 * @param {{
 *   activeSection?: string | null,
 *   tabKey?: string | null,
 *   cvCompletionProgress?: { percent?: number, missingSections?: string[] } | null,
 * }} ctx
 * @returns {{ headline: string, body: string } | null}
 */
export function getContextualTip(ctx = {}) {
  const { activeSection, tabKey, cvCompletionProgress } = ctx;

  if (tabKey && tabKey !== "content") {
    const t = TAB_TIPS[tabKey];
    if (t) return t;
  }

  const section = normalizeSection(activeSection);
  if (section && SECTION_TIPS[section]) return SECTION_TIPS[section];

  const percent = cvCompletionProgress?.percent ?? 0;
  const missing = cvCompletionProgress?.missingSections ?? [];
  return progressTip(percent, missing);
}

export const __TESTING__ = { normalizeSection, SECTION_TIPS, TAB_TIPS, progressTip };
