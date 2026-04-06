const TONE_LIBRARY = {
  confused: [
    /how/i, /what/i, /meaning/i, /explain/i, /understand/i,
    /bhai/i, /yaar/i, /no idea/i, /\?/, /not sure/i,
    /which one/i, /don't understand/i, /what you mean/i,
    /tell me how/i, /not knowing/i,
  ],
  frustrated: [
    /too much/i, /hard/i, /annoying/i, /stop/i, /long/i,
    /uff/i, /enough/i, /waste/i, /hate/i, /tired/i,
    /boring/i, /leaving/i, /pointless/i, /too many/i,
    /bhai stop/i, /too much work/i,
  ],
  lazy: [
    /^idk$/i, /^skip$/i, /^na$/i, /^none$/i, /^later$/i,
    /^ok$/i, /^\.\.\.$/i, /^no$/i, /^choro$/i, /^bas$/i,
    /^thike$/i, /^baad mein$/i, /^fine$/i, /^maybe$/i,
  ],
};

export const TONE_REPLIES = {
  confused: [
    "No worries! For this part, most people just put something like — {example}. Does that help?",
    "Let me simplify — I just need {example}. Take your time.",
    "Totally fine to be unsure. Here's what works: {example}. Try that?",
  ],
  frustrated: [
    "I hear you — we're actually almost done! Just a couple more and your CV is ready.",
    "Deep breath! This part is what gets you the interview call. Want to skip it for now and come back?",
    "Hang in there — you're doing great. Let's keep it short and move on.",
  ],
  lazy: [
    "Give me just one keyword and I'll work with it!",
    "No problem — I've noted that for now. You can polish it later in the builder.",
    "Short and sweet works too. Drop whatever comes to mind.",
  ],
  normal: null,
};

export const QUESTION_EXAMPLES = {
  name: "Junaid Khan",
  title: "Sales Manager – Real Estate",
  email: "yourname@gmail.com",
  phone: "+971 50 123 4567",
  location: "Dubai, UAE",
  "experience[0].company": "Warson Real Estate",
  "experience[0].role": "Senior Sales Executive",
  "experience[0].dates": "Jan 2022 – Present",
  "experience[0].bullets": "Closed 15+ deals worth AED 2M in 6 months",
  skills: "Negotiation, CRM, Client Management, Sales, Communication",
  summary: "Sales professional with 3+ years in UAE real estate, skilled in client acquisition and deal closing.",
};

/**
 * detectTone(input, wordCount?)
 * Returns: "confused" | "frustrated" | "lazy" | "normal"
 */
export const detectTone = (input) => {
  const text = input.trim().toLowerCase();
  const words = text.split(/\s+/);

  // False positive guard: "help with X" is normal, "help" alone is confused
  if (text === "help" || text === "help me") return "confused";
  if (text.includes("help") && words.length > 3) return "normal";

  // Short string lazy check (≤2 words, exact match)
  if (words.length <= 2) {
    if (TONE_LIBRARY.lazy.some((r) => r.test(text))) return "lazy";
  }

  const scores = { confused: 0, frustrated: 0, lazy: 0 };

  Object.keys(TONE_LIBRARY).forEach((tone) => {
    TONE_LIBRARY[tone].forEach((regex) => {
      if (regex.test(text)) scores[tone] += 1;
    });
  });

  // Long rambling = higher frustration signal
  if (text.length > 100 && scores.frustrated > 0) scores.frustrated += 1;

  const maxScore = Math.max(scores.confused, scores.frustrated, scores.lazy);
  if (maxScore === 0) return "normal";

  return Object.keys(scores).find((key) => scores[key] === maxScore);
};

/**
 * getToneReply(tone, field)
 * Returns a reply string with {example} filled from QUESTION_EXAMPLES
 */
export const getToneReply = (tone, field) => {
  const replies = TONE_REPLIES[tone];
  if (!replies) return null;
  const template = replies[Math.floor(Math.random() * replies.length)];
  const example = QUESTION_EXAMPLES[field] || "";
  return template.replace("{example}", example);
};
