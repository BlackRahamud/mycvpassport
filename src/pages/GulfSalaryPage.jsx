import React from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import GulfBillboardCard from '../components/landing/GulfBillboardCard';

// Standalone home for the Salary Intelligence billboard ("There is a salary
// in the Gulf with your name on it" + AED 28-42K + Get My Gulf Intelligence
// Report CTA). Moved off the landing page in the May-2026 restructure;
// linked from the footer Free-tools subgroup. The card itself navigates to
// /gulf-career where the calculator/report flow lives.
export default function GulfSalaryPage() {
  return (
    <>
      <Helmet>
        <title>Gulf Salary Intelligence — CVPassport</title>
        <meta
          name="description"
          content="See what you're worth in Dubai, Riyadh and Doha. Free, instant Gulf salary band check from CVPassport."
        />
        <link rel="canonical" href="https://www.mycvpassport.com/gulf-salary" />
      </Helmet>

      <div
        style={{
          background: 'var(--color-surface-00, #0A0A0A)',
          color: 'var(--color-text-primary, #FFFFFF)',
          minHeight: '100vh',
          fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        <div style={{ padding: '16px 24px' }}>
          <Link
            to="/"
            style={{
              fontSize: 13,
              color: 'rgba(255,255,255,0.65)',
              textDecoration: 'none',
            }}
          >
            ← Back
          </Link>
        </div>

        <GulfBillboardCard />
      </div>
    </>
  );
}
