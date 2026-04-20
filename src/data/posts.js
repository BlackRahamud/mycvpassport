/**
 * Blog posts for CVPassport.
 *
 * Single source of truth — imported by both src/pages/BlogPage.jsx (the index
 * grid) and src/pages/BlogPostPage.jsx (individual article routed at
 * /blog/:slug). To add a post, append an object here; the slug is derived
 * from the title automatically.
 */

export function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const rawPosts = [
  {
    title: "Should You Put Passport Details on Your UAE CV?",
    author: "@CVPassportTeam",
    date: "Monday, 3 Feb 2026",
    readTime: "4 min read",
    category: "UAE Jobs",
    excerpt: "Most Indian professionals make this mistake on their UAE CV. Here's what ATS systems actually want.",
    badges: [{ label: "UAE Jobs", tone: "purple" }, { label: "ATS Tips", tone: "blue" }],
    image: "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800",
    body: [
      { type: "p", text: "Most Indian professionals applying for jobs in Dubai make the same mistake within the first 10 seconds of building their CV — they copy their Indian bio-data format and paste it into a UAE application. Passport number included. This single decision can get your CV flagged, ignored, or worse, put your identity at risk." },
      { type: "p", text: "The UAE job market moves fast. Recruiters at Emirates NBD, ADNOC, and Majid Al Futtaim receive hundreds of applications daily. They are not reading your passport number — they are scanning your professional value. Here is exactly what to include and what to leave out." },
      { type: "h2", text: "Why Indian Professionals Include Passport Details (And Why It Backfires)" },
      { type: "p", text: "In India, the bio-data tradition treats a passport number as a trust signal — proof that you are ready to travel and join immediately. In the UAE, this logic works against you. Recruiters in Dubai and Abu Dhabi consider your passport number to be sensitive Personal Identifiable Information (PII). Sharing it on a document uploaded to job portals like Bayt, LinkedIn, or GulfTalent exposes you to identity theft risk." },
      { type: "p", text: "Top-tier firms and multinational corporations operating in the GCC only request government ID details at two stages: the offer letter stage or the security clearance stage. Before that, your passport number adds zero value and several risks." },
      { type: "h2", text: "The One Situation Where Visa Status Matters (Do This Instead)" },
      { type: "p", text: "There is exactly one scenario where your document status should appear on your UAE CV: if you are currently on a Visit Visa or a recently cancelled visa and need to signal immediate availability for a visa transfer. Even then, never write the passport number itself. Instead, add a single clean line in your header: Visa Status: Visit Visa — Available Immediately." },
      { type: "quote", text: "Your CV is a marketing document, not a legal one. Save the passport number for the HR onboarding form, not the public job board." },
      { type: "p", text: "If a recruiter or agency requests a passport copy before a confirmed interview, treat it as a red flag. Legitimate UAE employers only need this document once they have expressed a clear hiring intent or are processing your entry permit for a final interview." },
      { type: "h2", text: "What to Include Above the Fold on a UAE CV" },
      { type: "p", text: "Replace the space wasted on passport details with information that actually moves the needle. The three most important administrative details for any Indian expat applying in the UAE are: your current location (Dubai, UAE or Mumbai, India — Willing to Relocate), your visa status (Employment Visa — Transferable, or Visit Visa), and your notice period (Immediate or 30 Days)." },
      { type: "p", text: "Adding your LinkedIn URL or a link to your professional portfolio in this space provides far more value. ATS systems used by UAE recruiters can parse these links and verify your professional identity without exposing your government-issued ID prematurely. This is the difference between a CV that passes the first filter and one that does not." },
      { type: "h2", text: "ATS Systems in the UAE Read Your Header First" },
      { type: "p", text: "Applicant Tracking Systems used by large GCC employers — Taleo, Workday, SAP SuccessFactors — parse the top 30% of your CV first. This means your name, location, visa status, and professional title are what the algorithm reads before anything else. If this section is cluttered with passport numbers, date of birth, or father's name, the parser loses confidence in your document and your match score drops." },
      { type: "p", text: "CVPassport's ATS Checker scans your CV header exactly the way Gulf ATS systems do. It tells you within 60 seconds whether your opening section is clean, parseable, and optimised for the UAE market — before you hit submit on a single application." },
    ],
  },
  {
    title: "ATS Score Guide for GCC Jobs: What Recruiters See",
    author: "@CVPassportTeam",
    date: "Wednesday, 12 Feb 2026",
    readTime: "6 min read",
    category: "ATS",
    excerpt: "We scanned 500 CVs through UAE ATS systems. Here's exactly what kills your score.",
    badges: [{ label: "ATS", tone: "purple" }, { label: "Research", tone: "pink" }],
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800",
    body: [
      { type: "p", text: "You applied to 50 jobs in Dubai. You got zero callbacks. Your experience is solid. Your skills are relevant. So what is actually happening? The answer, in almost every case, is your ATS score. Before a single human recruiter at Emirates Group, Aldar Properties, or First Abu Dhabi Bank opens your file, an algorithm has already ranked you against every other candidate — and quietly moved you to the bottom of the pile." },
      { type: "p", text: "Understanding how ATS scoring works in the GCC is not optional for Indian expats applying from abroad. It is the difference between getting interviews and getting silence." },
      { type: "h2", text: "What Recruiters Actually See When You Apply" },
      { type: "p", text: "When a UAE recruiter opens their hiring dashboard, they do not see a list of names. They see a ranked list of match percentages. An ATS system like Taleo or Workday assigns a score to your CV based on how precisely your document aligns with the job description. In the GCC, recruiters typically only open CVs with a score of 80% or above. If your formatting is broken or your keywords are missing, your score can drop to 40% — making you invisible before anyone has read a single line." },
      { type: "p", text: "UAE ATS systems also run \"knockout filters\" for location and visa status. If the system cannot identify your current location as UAE or GCC, it may automatically disqualify you before the score is even calculated. This is why Indian professionals applying from India need to be especially precise about how their header information is formatted." },
      { type: "h2", text: "The 85-95% Green Zone: Your Real Target" },
      { type: "p", text: "Many job seekers make the mistake of chasing a 100% match score. A perfect score can actually raise flags with human recruiters — it suggests keyword stuffing rather than genuine experience. Your real target is the Green Zone: 85% to 95%. This range tells the algorithm you are a strong match and tells the human recruiter your CV reads naturally." },
      { type: "quote", text: "An ATS score is not a grade of your talent. It is a measure of your CV's readability against a specific algorithm. Optimise the document, not the experience." },
      { type: "p", text: "Keyword density is the primary driver of your score. Repeating \"Project Manager\" forty times triggers spam filters. Instead, use natural variations: \"led cross-functional teams,\" \"delivered project milestones,\" \"stakeholder reporting.\" GCC-specific terms like \"VAT Compliance,\" \"ADNOC-approved,\" or \"Bilingual Arabic-English environment\" carry additional weight in regional ATS systems." },
      { type: "h2", text: "Why Indian CV Formats Break GCC Parsers" },
      { type: "p", text: "The most common reason Indian professionals score below 50% on UAE ATS systems is not missing keywords — it is broken formatting. Standard Indian bio-data layouts use tables, text boxes, columns, and embedded images. When an ATS parser encounters these elements, it cannot extract the text correctly. The result is a score of zero regardless of your qualifications." },
      { type: "p", text: "A UAE-optimised CV uses a single-column layout, standard section headings (Work Experience, Education, Skills — not \"My Journey\" or \"Professional Portfolio\"), and ATS-safe fonts like Arial, Calibri, or Georgia at 10-12pt. No graphics. No icons next to skills. No progress bars showing expertise levels. These elements look impressive to humans but are invisible or harmful to parsers." },
      { type: "h2", text: "Gulf-Specific Keywords That Boost Your Score" },
      { type: "p", text: "Beyond technical skills, GCC ATS systems are tuned to recognise regional business language. Even if you are applying from India, weaving in phrases like \"international standards compliance,\" \"multicultural team leadership,\" \"GCC market knowledge,\" and \"cross-border stakeholder management\" significantly improves your match rate for UAE roles." },
      { type: "p", text: "For finance roles, add \"IFRS compliance\" and \"Central Bank UAE regulations.\" For HR roles, include \"Emiratisation awareness\" and \"WPS payroll.\" For sales and business development, reference \"B2B enterprise sales UAE\" and \"channel partner management GCC.\" These are the hidden keywords that separate candidates who understand the market from those who do not." },
    ],
  },
  {
    title: "Salary Switcher: AED to INR — What Your Offer Really Means",
    author: "@CVPassportTeam",
    date: "Sunday, 22 Feb 2026",
    readTime: "5 min read",
    category: "Salary",
    excerpt: "Before you accept that AED 8,000 offer, run these numbers.",
    badges: [{ label: "Salary", tone: "green" }, { label: "UAE", tone: "purple" }],
    image: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?w=800",
  },
  {
    title: "How to Beat the LinkedIn ATS in 2026",
    author: "@CVPassportTeam",
    date: "Friday, 6 Mar 2026",
    readTime: "5 min read",
    category: "LinkedIn",
    excerpt: "LinkedIn's algorithm is different from job portal ATS. Here's how to optimise for both.",
    badges: [{ label: "LinkedIn", tone: "blue" }, { label: "ATS", tone: "purple" }],
    image: "https://images.unsplash.com/photo-1611944212129-29977ae1398c?w=800",
  },
  {
    title: "Banking Jobs in UAE: What ADIB and FAB Actually Want",
    author: "@CVPassportTeam",
    date: "Tuesday, 17 Mar 2026",
    readTime: "7 min read",
    category: "Banking",
    excerpt: "Applied to 6 UAE banks. Here's what I learned about their hiring process.",
    badges: [{ label: "Banking", tone: "slate" }, { label: "UAE Jobs", tone: "purple" }],
    image: "https://images.unsplash.com/photo-1541354329998-f4d9a9f9297f?w=800",
  },
  {
    title: "Walk-In Interview Guide: Dubai 2026",
    author: "@CVPassportTeam",
    date: "Saturday, 28 Mar 2026",
    readTime: "5 min read",
    category: "Interviews",
    excerpt: "Walk-in interviews are still a thing in Dubai. Here's how to show up and stand out.",
    badges: [{ label: "Interviews", tone: "orange" }, { label: "Dubai", tone: "purple" }],
    image: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800",
  },
  {
    title: "Cover Letter for UAE Jobs: What Works in 2026",
    author: "@CVPassportTeam",
    date: "Wednesday, 1 Apr 2026",
    readTime: "4 min read",
    category: "Cover Letter",
    excerpt: "UAE recruiters read cover letters differently. This template gets responses.",
    badges: [{ label: "Cover Letter", tone: "pink" }, { label: "UAE", tone: "purple" }],
    image: "https://images.unsplash.com/photo-1455849318743-b2233052fcff?w=800",
  },
  {
    title: "Indian CV vs UAE CV: Key Differences",
    author: "@CVPassportTeam",
    date: "Sunday, 12 Apr 2026",
    readTime: "6 min read",
    category: "CV Tips",
    excerpt: "Your Indian CV format will get rejected in the UAE. Here's exactly what to change.",
    badges: [{ label: "CV Tips", tone: "green" }, { label: "India", tone: "purple" }],
    image: "https://images.unsplash.com/photo-1586282391129-76a6df230234?w=800",
    body: [
      { type: "p", text: "A CV that got you shortlisted at a top firm in Bengaluru or Mumbai will likely get you rejected in Dubai. This is not about your experience — it is about format, framing, and professional expectations. The UAE job market is shaped by a blend of British corporate standards, American performance culture, and local Arab business etiquette. The result is a \"GCC Standard\" CV that looks, reads, and is structured fundamentally differently from the Indian bio-data format most professionals are trained to produce." },
      { type: "p", text: "If you are making the move to the Gulf — or applying from India for roles in Dubai, Abu Dhabi, Riyadh, or Doha — here are the differences that matter most." },
      { type: "h2", text: "Length: From 4 Pages to 2 Pages Maximum" },
      { type: "p", text: "In India, a 4-page CV signals thoroughness. In the UAE, it signals poor editing. GCC recruiters spend an average of 6 seconds on initial CV screening. If they see a fourth page, they do not read it — they close the file. A UAE-standard CV is strictly 2 pages, regardless of how many years of experience you have." },
      { type: "p", text: "This means cutting everything that does not directly prove your value for the specific role. School-level academic achievements, personal interests, references \"available on request,\" and projects from more than 10 years ago are the first to go. What stays is recent, relevant, and results-driven." },
      { type: "h2", text: "Structure: Professional Summary First, Not Personal Details" },
      { type: "p", text: "The traditional Indian bio-data opens with personal details: name, date of birth, father's name, marital status, religion, and languages. A UAE CV opens with a 3-line Professional Summary that answers one question: why should we hire you for this specific role? This is placed immediately below your name and contact details — no personal information, no photographs." },
      { type: "quote", text: "In the Gulf, your availability is often as important as your ability. Clear visa status on a UAE CV is the ultimate trust signal for a recruiter deciding between two equally qualified candidates." },
      { type: "p", text: "The second section is Core Competencies — 8 to 12 skill keywords in a simple two-column list. This section is specifically designed for ATS parsing. It ensures that your most important keywords appear near the top of the document where parsers assign higher weight." },
      { type: "h2", text: "The Visa and Location Header — Unique to UAE Applications" },
      { type: "p", text: "The single most important structural difference between an Indian CV and a UAE CV is the administrative header. In India, your city is a minor detail. In the UAE, your current location and visa status are the first things a recruiter looks for — often before they read your job title. A clear header line that reads \"Currently in Dubai | Employment Visa — Transferable | Available in 30 Days\" can be the deciding factor in whether you get called for a face-to-face interview." },
      { type: "p", text: "If you are applying from India, state it clearly: \"Based in Mumbai, India | Available to Relocate Immediately.\" Ambiguity about your location costs you interviews, especially for roles that require a walk-in interview or a quick start date." },
      { type: "h2", text: "Achievements Over Responsibilities: The Critical Language Shift" },
      { type: "p", text: "Indian CVs are written in the language of responsibility: \"Responsible for managing the sales team.\" UAE CVs are written in the language of achievement: \"Led a 12-person sales team to exceed quarterly targets by 34% in the UAE North region.\" This is not just stylistic — it is the difference between a CV that passes and one that gets shortlisted." },
      { type: "p", text: "Every bullet point under your work experience should follow the formula: Action Verb + Specific Achievement + Measurable Result. Replace \"Lakhs\" and \"Crores\" with USD or AED equivalents. Replace \"handled\" and \"assisted\" with \"led,\" \"delivered,\" \"grew,\" and \"reduced.\" Replace vague descriptions with numbers: percentages, team sizes, revenue figures, timelines." },
      { type: "p", text: "CVPassport's template engine is built specifically for this conversion. It takes your Indian work experience and restructures it into UAE-standard achievement language automatically — so you can apply with confidence to roles in Dubai, Abu Dhabi, and across the GCC without starting from scratch." },
    ],
  },
  {
    title: "GCC Job Market 2026: Where the Opportunities Are",
    author: "@CVPassportTeam",
    date: "Friday, 18 Apr 2026",
    readTime: "8 min read",
    category: "GCC",
    excerpt: "Saudi, Qatar, Bahrain — which GCC market is hottest for Indian professionals right now.",
    badges: [{ label: "GCC", tone: "blue" }, { label: "Career", tone: "purple" }],
    image: "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800",
  },
];

const posts = rawPosts.map((p) => ({ ...p, slug: slugify(p.title) }));

export default posts;
