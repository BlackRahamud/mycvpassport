import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

const TITLE = 'Free CV Builder for Indians Applying to UAE & Gulf Jobs | CVPassport';
const DESC = 'Convert your Indian resume into a UAE-ready ATS-optimised CV instantly. Built for Indians targeting Dubai, Abu Dhabi, Riyadh and GCC jobs — and for Indian domestic job applications too. Free.';
const CANONICAL = 'https://www.mycvpassport.com/india-to-uae';

const TESTIMONIALS = [
  {
    quote: "I was applying to Dubai jobs for 6 months with zero callbacks. A friend told me my CV format was the problem. I rebuilt it on CVPassport in 20 minutes and had 3 interview calls within 2 weeks.",
    author: 'Rahul M.',
    role: 'Software Engineer, relocated from Pune to Dubai',
  },
  {
    quote: "The walk-in CV builder is genuinely useful. I built a one-pager the night before a job fair in Dubai Silicon Oasis and walked out with two follow-up interviews.",
    author: 'Priya S.',
    role: 'HR Executive, Abu Dhabi',
  },
  {
    quote: "I needed a CV that worked for both Gulf applications and Indian ones — I was keeping my options open. CVPassport let me build both from one profile. That saved me a lot of time.",
    author: 'Arun K.',
    role: 'Civil Engineer, applying from Chennai',
  },
];

const FAQS = [
  {
    q: 'Is CVPassport free for Indian users?',
    a: 'Yes, completely free to start. Build your CV, check your ATS score, download your PDF — no payment required to get started.',
  },
  {
    q: 'Does it work for Indian domestic job applications too, not just Gulf?',
    a: 'Yes. CVPassport is built for both markets. Generate a Gulf-optimised version and an India-optimised version from the same profile. Different ATS calibration, same base data.',
  },
  {
    q: "What's the difference between an Indian resume and a UAE CV?",
    a: 'UAE CVs require nationality, visa status, and current location — fields Indian resumes typically leave out. The section order is different, the length standard is stricter (max 2 pages), and the formatting rules are tighter because Gulf ATS systems are less forgiving than Indian ones. CVPassport handles all of this.',
  },
  {
    q: 'Which Gulf job portals does CVPassport optimise for?',
    a: 'Bayt.com, GulfTalent, Naukrigulf, LinkedIn, and direct company portal submissions (which typically run Taleo, Workday, or SAP SuccessFactors as the ATS backend).',
  },
  {
    q: 'Do I need to include a photo on my Gulf CV?',
    a: 'Only if the job posting specifically asks for one, or if you\'re applying for a customer-facing role (hospitality, cabin crew, front desk) where some employers request it. For tech, finance, engineering, and most corporate roles — skip the photo. ATS systems cannot read images and a photo can disrupt parsing.',
  },
  {
    q: 'Can I apply for Saudi Arabia and Qatar jobs using CVPassport?',
    a: 'Yes. The Gulf-standard format and ATS calibration covers UAE, Saudi Arabia, Qatar, Kuwait, Bahrain, and Oman. The personal details requirements are consistent across GCC countries.',
  },
];

export default function IndiaToUaePage() {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <main className="cvp-static-page cvp-i2u">
      <Helmet>
        <title>{TITLE}</title>
        <meta name="description" content={DESC} />
        <link rel="canonical" href={CANONICAL} />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESC} />
        <meta property="og:url" content={CANONICAL} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESC} />
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <style>{`
        .cvp-static-page {
          background: #0A0A0A;
          color: #F5F5F7;
          font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          min-height: 100vh;
          padding: 72px 24px 120px;
          box-sizing: border-box;
        }
        .cvp-static-inner {
          max-width: 820px;
          margin: 0 auto;
        }
        .cvp-static-back {
          font-size: 13px;
          color: #A0A0A0;
          text-decoration: none;
          display: inline-block;
          margin-bottom: 32px;
        }
        .cvp-static-back:hover { color: #FFF; }
        .cvp-i2u-h1 {
          font-size: clamp(32px, 4.4vw, 52px);
          font-weight: 800;
          letter-spacing: -0.02em;
          line-height: 1.1;
          margin: 0 0 16px;
        }
        .cvp-i2u-sub {
          font-size: 18px;
          color: #A0A0A0;
          line-height: 1.6;
          margin: 0 0 48px;
        }
        .cvp-i2u h2 {
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.01em;
          margin: 56px 0 16px;
        }
        .cvp-i2u h3 {
          font-size: 17px;
          font-weight: 700;
          margin: 28px 0 10px;
          color: #FFF;
        }
        .cvp-i2u p {
          font-size: 16px;
          line-height: 1.7;
          color: #CCCCCC;
          margin: 0 0 16px;
        }
        .cvp-i2u ul {
          margin: 0 0 24px;
          padding: 0 0 0 20px;
        }
        .cvp-i2u li {
          font-size: 16px;
          line-height: 1.7;
          color: #CCCCCC;
          margin-bottom: 10px;
        }
        .cvp-i2u strong { color: #FFF; font-weight: 700; }
        .cvp-i2u-checklist {
          list-style: none;
          padding: 0;
          margin: 0 0 24px;
        }
        .cvp-i2u-checklist li {
          padding-left: 28px;
          position: relative;
        }
        .cvp-i2u-checklist li::before {
          content: "✅";
          position: absolute;
          left: 0;
        }
        .cvp-i2u-cards {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
          margin: 24px 0 32px;
        }
        @media (min-width: 768px) {
          .cvp-i2u-cards { grid-template-columns: repeat(3, 1fr); }
        }
        .cvp-i2u-card {
          background: #141414;
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px;
          padding: 24px;
        }
        .cvp-i2u-card-quote {
          font-style: italic;
          font-size: 14px;
          line-height: 1.6;
          color: #E0E0E0;
          margin: 0 0 16px;
        }
        .cvp-i2u-card-author {
          font-size: 13px;
          font-weight: 700;
          color: #FFF;
          margin: 0;
        }
        .cvp-i2u-card-role {
          font-size: 12px;
          color: #777;
          margin: 2px 0 0;
        }
        .cvp-i2u-faq {
          border-top: 1px solid rgba(255,255,255,0.06);
          padding-top: 16px;
          margin-top: 16px;
        }
        .cvp-i2u-faq h3 { margin-top: 0; }
        .cvp-static-cta {
          display: inline-block;
          margin-top: 40px;
          background: #D97706;
          color: #000;
          padding: 14px 28px;
          border-radius: 999px;
          font-size: 15px;
          font-weight: 700;
          text-decoration: none;
          transition: filter 160ms cubic-bezier(0.25,0.46,0.45,0.94);
        }
        .cvp-static-cta:hover { filter: brightness(0.92); }
      `}</style>

      <div className="cvp-static-inner cvp-i2u">
        <Link to="/" className="cvp-static-back">← Back to home</Link>
        <h1 className="cvp-i2u-h1">Applying for UAE or Gulf Jobs from India? Your CV Needs to Change.</h1>
        <p className="cvp-i2u-sub">
          CVPassport converts your Indian resume into a Gulf-ready, ATS-optimised CV in minutes. Also works for Indian domestic job applications.
        </p>

        <h2>The India-to-Gulf Pipeline Is Bigger Than You Think</h2>
        <p>
          Over 4.39 million Indians live in the UAE alone. Across the GCC — Dubai, Abu Dhabi, Riyadh, Doha, Muscat, Kuwait City — that number hits 9 million. Indians are the single largest expat group in the UAE, dominating sectors from IT and finance to healthcare, construction, and hospitality.
        </p>
        <p>
          The opportunity is real. The competition is brutal. And the number one reason qualified Indian professionals don't hear back from Gulf employers isn't their experience — it's their CV format.
        </p>

        <h2>Why Your Indian Resume Gets Rejected Before Anyone Reads It</h2>
        <p>
          Nearly 60% of Gulf companies now use ATS software — Taleo, Workday, SAP SuccessFactors — to filter CVs before a recruiter ever opens one. These systems are calibrated for Gulf market standards. A standard Indian resume format, however well-written, often fails at the parsing stage.
        </p>
        <p>Here's specifically what goes wrong:</p>

        <h3>1. Format issues that break Gulf ATS parsing</h3>
        <p>
          Two-column layouts, tables, text boxes, and graphics are common in Indian resume templates. Gulf ATS systems read documents in a single left-to-right pass — two-column layouts get their content scrambled, tables get skipped, and text boxes are invisible to the parser entirely.
        </p>

        <h3>2. Missing required personal details</h3>
        <p>
          Gulf CVs require nationality, visa status ("Visit Visa", "Employment Visa – Transferable", "Spouse Visa – NOC Available"), and current location. Indian resumes typically omit these. A Gulf recruiter needs this information to assess sponsorship requirements before they'll progress your application.
        </p>

        <h3>3. Wrong section order</h3>
        <p>
          UAE recruiters want: Personal Details → Professional Summary → Work Experience → Education → Skills → Certifications. Indian resumes often lead with an Objective Statement or Career Objective — which UAE recruiters skip or penalise in ATS scoring.
        </p>

        <h3>4. Keyword mismatch</h3>
        <p>
          The job title keywords on Bayt and GulfTalent are different from Naukri and LinkedIn India. "Sales Executive – FMCG" on GulfTalent is not the same as "Business Development Manager" on Naukri. ATS systems score keyword density at 40% of total score — getting this wrong costs you.
        </p>

        <h3>5. CV length</h3>
        <p>
          Experienced Indian professionals often submit 3–4 page CVs. UAE standard is 1 page for under 5 years experience, 2 pages maximum for senior professionals. A 3-page CV signals unfamiliarity with Gulf market norms.
        </p>

        <h2>What CVPassport Does for You</h2>
        <ul className="cvp-i2u-checklist">
          <li>Reformats your CV into Gulf-standard single-column ATS-safe layout</li>
          <li>ATS score checker calibrated for Taleo, Workday, SAP SuccessFactors, Bayt, and GulfTalent</li>
          <li>Prompts you to add the fields Gulf recruiters need (nationality, visa status, current location)</li>
          <li>Strips two-column layouts, tables, and text boxes that break ATS parsing</li>
          <li>Matches section order to UAE recruiter expectations</li>
          <li>Instant PDF download — apply the same day</li>
        </ul>

        <h2>Also Works for Indian Domestic Job Applications</h2>
        <p>
          Already in India and applying locally? CVPassport works for that too. Our templates and ATS checker are calibrated for Indian job portals including Naukri, Shine, and LinkedIn India. Build your profile once, generate a Gulf version and an India version from the same data — no starting from scratch for different markets.
        </p>

        <h2>What Indian Professionals Working in Gulf Say</h2>
        <div className="cvp-i2u-cards">
          {TESTIMONIALS.map((t, i) => (
            <article key={i} className="cvp-i2u-card">
              <p className="cvp-i2u-card-quote">&ldquo;{t.quote}&rdquo;</p>
              <p className="cvp-i2u-card-author">— {t.author}</p>
              <p className="cvp-i2u-card-role">{t.role}</p>
            </article>
          ))}
        </div>

        <h2>Frequently Asked Questions</h2>
        {FAQS.map((f, i) => (
          <div key={i} className="cvp-i2u-faq">
            <h3>{f.q}</h3>
            <p>{f.a}</p>
          </div>
        ))}

        <Link to="/builder" className="cvp-static-cta">Build My Free Gulf CV Now →</Link>
      </div>
    </main>
  );
}
