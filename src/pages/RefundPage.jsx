import { useState } from "react";

const TOKENS = {
  "--bg-page": "#0A0A0A",
  "--text-primary": "#FFF",
  "--text-secondary": "#A0A0A0",
  "--border-default": "#2A2A2A",
};

function LegalPageLayout({ title, lastUpdated, children }) {
  const [backHover, setBackHover] = useState(false);
  return (
    <div
      style={{
        ...TOKENS,
        minHeight: "100vh",
        backgroundColor: "var(--bg-page)",
        fontFamily: "'Outfit','Segoe UI',sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 740,
          margin: "0 auto",
          padding: "80px 24px",
        }}
      >
        <a
          href="/"
          style={{
            fontSize: 13,
            color: backHover ? "#FFF" : "var(--text-secondary)",
            textDecoration: "none",
            transition: "color 150ms ease",
            marginBottom: 48,
            display: "inline-block",
          }}
          onMouseEnter={() => setBackHover(true)}
          onMouseLeave={() => setBackHover(false)}
        >
          ← CVPassport
        </a>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: "var(--text-primary)",
            margin: "0 0 8px",
            lineHeight: 1.2,
          }}
        >
          {title}
        </h1>
        <p
          style={{
            fontSize: 13,
            color: "var(--text-secondary)",
            margin: "0 0 48px",
          }}
        >
          Last Updated: {lastUpdated}
        </p>
        {children}
        <footer
          style={{
            marginTop: 64,
            borderTop: "1px solid var(--border-default)",
            paddingTop: 24,
            fontSize: 13,
            color: "var(--text-secondary)",
          }}
        >
          © 2026 CVPassport · Operated by Junaid Mujtaba Khan, Dubai, UAE
        </footer>
      </div>
    </div>
  );
}

const h2 = {
  fontSize: 16,
  fontWeight: 600,
  color: "var(--text-primary)",
  margin: "40px 0 12px",
};
const p = {
  fontSize: 14,
  color: "var(--text-secondary)",
  lineHeight: 1.7,
  margin: "0 0 16px",
};
const bullet = {
  ...p,
  paddingLeft: 18,
  position: "relative",
};
const bulletLabel = { color: "var(--text-primary)", fontWeight: 600 };
const link = { color: "#FFF", textDecoration: "underline" };
const divider = { border: "none", borderTop: "1px solid var(--border-default)", margin: "32px 0" };

export default function RefundPage() {
  return (
    <LegalPageLayout title="Refund Policy" lastUpdated="April 20, 2026">
      <p style={p}>
        At MyCVPassport, we want you to be confident in your career journey. Since our platform provides instant access to premium digital tools and downloadable assets, our policy is designed to be
        fair to both our users and our mission.
      </p>
      <hr style={divider} />
      <h2 style={h2}>1. Career Pro (Annual Subscription)</h2>
      <p style={bullet}>
        <span style={{ position: "absolute", left: 0 }}>•</span>
        <span style={bulletLabel}>14-Day Money-Back Guarantee:</span> If you are not satisfied with your Annual Subscription, you are eligible for a full refund within 14 days of your original purchase
        date.
      </p>
      <p style={bullet}>
        <span style={{ position: "absolute", left: 0 }}>•</span>
        <span style={bulletLabel}>After 14 Days:</span> Annual payments are non-refundable. You will continue to have premium access until the end of your billing cycle, and no further charges will be
        made.
      </p>
      <hr style={divider} />
      <h2 style={h2}>2. One-Time Purchases &amp; Monthly Plans</h2>
      <p style={bullet}>
        <span style={{ position: "absolute", left: 0 }}>•</span>
        <span style={bulletLabel}>Express Pass (One-Time):</span> Due to the nature of digital downloads, the Express Pass is non-refundable once a CV has been generated or downloaded.
      </p>
      <p style={bullet}>
        <span style={{ position: "absolute", left: 0 }}>•</span>
        <span style={bulletLabel}>Active Hunter (Monthly):</span> Monthly subscriptions are non-refundable. You may cancel at any time to prevent future billing, and you will retain access until the
        end of the current 30-day period.
      </p>
      <hr style={divider} />
      <h2 style={h2}>3. How to Request a Refund</h2>
      <p style={p}>
        Email{" "}
        <a href="mailto:support@mycvpassport.com" style={link}>
          support@mycvpassport.com
        </a>{" "}
        with: your account email, receipt or transaction ID, and a brief note on why the service didn&apos;t meet your needs. Refunds are processed within 5–10 business days depending on your payment
        provider.
      </p>
    </LegalPageLayout>
  );
}
