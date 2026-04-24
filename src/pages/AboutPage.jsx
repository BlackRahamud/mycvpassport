import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

const TITLE = 'About CVPassport — ATS CV Builder for UAE, Gulf & India Jobs';
const DESC = 'CVPassport helps job seekers in UAE, India and across the Gulf build ATS-optimised CVs instantly. Built for real job markets. Free to start.';
const CANONICAL = 'https://www.mycvpassport.com/about';

export default function AboutPage() {
  return (
    <main className="cvp-static-page">
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
          max-width: 760px;
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
        .cvp-static-h1 {
          font-size: clamp(36px, 5vw, 56px);
          font-weight: 800;
          letter-spacing: -0.02em;
          line-height: 1.1;
          margin: 0 0 32px;
        }
        .cvp-static-h2 {
          font-size: 24px;
          font-weight: 700;
          letter-spacing: -0.01em;
          margin: 48px 0 16px;
        }
        .cvp-static-body p {
          font-size: 16px;
          line-height: 1.7;
          color: #CCCCCC;
          margin: 0 0 16px;
        }
        .cvp-static-body ul {
          margin: 0 0 24px;
          padding: 0 0 0 20px;
        }
        .cvp-static-body li {
          font-size: 16px;
          line-height: 1.7;
          color: #CCCCCC;
          margin-bottom: 12px;
        }
        .cvp-static-body strong { color: #FFF; font-weight: 700; }
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

      <div className="cvp-static-inner">
        <Link to="/" className="cvp-static-back">← Back to home</Link>
        <h1 className="cvp-static-h1">Built for the Job Markets That Matter Most</h1>

        <div className="cvp-static-body">
          <h2 className="cvp-static-h2">Who We Are</h2>
          <p>
            CVPassport is a free ATS-friendly CV builder built for job seekers in the UAE, the Gulf region, and India.
            We built it because the generic CV tools online don't understand what a Dubai recruiter actually wants,
            what Indian ATS portals like Naukri and Shine filter for, or how to format a clean one-pager for a walk-in
            interview in Abu Dhabi at 8am tomorrow morning.
          </p>
          <p>
            Whether you're in Mumbai targeting a finance role in DIFC, a fresh graduate in Hyderabad chasing Gulf
            opportunities, or a seasoned professional in Dubai ready for your next move — CVPassport gives you the
            tools to build a CV that gets through the filters and in front of a real person.
          </p>

          <h2 className="cvp-static-h2">What We Do</h2>
          <ul>
            <li><strong>ATS Score Checker</strong> — see exactly how your CV scores against the systems UAE and Indian employers actually use (Taleo, Workday, SAP SuccessFactors, Bayt, GulfTalent, Naukri) before you hit send.</li>
            <li><strong>Walk-In CV Builder</strong> — the only tool built specifically for UAE and Gulf walk-in interviews and job fairs. Clean, one-page, ATS-safe, ready to print in minutes.</li>
            <li><strong>Gulf-Optimised Templates</strong> — formats that pass Taleo, Workday and SAP SuccessFactors parsing. Single-column, clean, no tables, no text boxes, no formatting that kills your ATS score.</li>
            <li><strong>India-Ready Templates</strong> — clean ATS-friendly formats tested against Naukri, Shine, and LinkedIn India.</li>
            <li><strong>Instant PDF Download</strong> — no waiting for a human writer. Build, optimise, download, apply — in one session.</li>
          </ul>

          <h2 className="cvp-static-h2">Who It's For</h2>
          <ul>
            <li>Professionals in UAE and GCC ready for their next role.</li>
            <li>Indians applying for jobs in Dubai, Abu Dhabi, Sharjah, Riyadh, Doha, Muscat and beyond.</li>
            <li>Fresh graduates in India targeting Gulf opportunities in engineering, finance, hospitality, IT, and healthcare.</li>
            <li>Experienced professionals in India looking for better opportunities domestically or internationally.</li>
            <li>Anyone applying through Naukri, Bayt, GulfTalent, LinkedIn, or company portals who wants their CV to actually clear the ATS filter.</li>
          </ul>

          <h2 className="cvp-static-h2">Free to Start</h2>
          <p>
            CVPassport is free. Build your CV, check your ATS score, download your PDF. No account needed to start.
          </p>

          <Link to="/builder" className="cvp-static-cta">Build My Free CV →</Link>
        </div>
      </div>
    </main>
  );
}
