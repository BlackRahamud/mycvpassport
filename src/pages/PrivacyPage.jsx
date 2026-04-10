import { useState } from "react";

const TOKENS = {
  "--bg-page": "#0A0A0A",
  "--text-primary": "#FFF",
  "--text-secondary": "#A0A0A0",
  "--border-default": "#2A2A2A",
};

function LegalPageLayout({ title, effectiveDate, children }) {
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
          Effective Date: {effectiveDate}
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
const h3 = {
  fontSize: 14,
  fontWeight: 600,
  color: "var(--text-primary)",
  margin: "24px 0 8px",
};
const p = {
  fontSize: 14,
  color: "var(--text-secondary)",
  lineHeight: 1.7,
  margin: "0 0 16px",
};
const link = { color: "#FFF", textDecoration: "underline" };
const divider = { border: "none", borderTop: "1px solid var(--border-default)", margin: "32px 0" };

export default function PrivacyPage() {
  return (
    <LegalPageLayout title="Privacy Policy" effectiveDate="March 31, 2026">
      <h2 style={h2}>Who We Are</h2>
      <p style={p}>
        CVPassport is a platform owned and operated by Junaid Mujtaba Khan, an individual resident of Dubai, UAE. We take your privacy seriously and comply with the UAE Personal Data Protection Law
        (PDPL).
      </p>
      <hr style={divider} />
      <h2 style={h2}>The Data We Collect</h2>
      <p style={p}>
        We collect your name, email, contact details, and professional history as entered by you into our guided fields. For payments, we use secure third-party processors; we do not store your
        credit card numbers.
      </p>
      <hr style={divider} />
      <h2 style={h2}>How We Use It</h2>
      <p style={p}>We use your data to generate your documents and improve our formatting suggestions. We do not sell or share your personal data with advertisers, headhunters, or third-party recruiters.</p>
      <p style={p}>
        As CVPassport evolves, we may introduce features such as a job portal, recruiter matching, or direct application tools. These features will be strictly opt-in; we will never share your
        profile with a recruiter or employer without your explicit consent and a clear action from you to join that specific feature. You will always remain in total control of your data&apos;s
        visibility.
      </p>
      <hr style={divider} />
      <h2 style={h2}>Third-Party Processors</h2>
      <h3 style={h3}>Storage</h3>
      <p style={p}>
        Your data is stored securely using Supabase, hosted on AWS ap-southeast-1 servers located in Singapore. By using the service, you consent to the cross-border transfer of your data for storage
        and processing purposes.
      </p>
      <h3 style={h3}>Payments</h3>
      <p style={p}>All payments are handled by Ziina, our Merchant of Record.</p>
      <h3 style={h3}>Hosting</h3>
      <p style={p}>Our infrastructure is powered by Vercel.</p>
      <hr style={divider} />
      <h2 style={h2}>How We Use Cookies</h2>
      <p style={p}>We use three categories of cookies:</p>
      <h3 style={h3}>Essential (Always On)</h3>
      <p style={p}>Required for secure login, session management, and PDF generation. The site cannot function without these.</p>
      <h3 style={h3}>Analytics (Optional)</h3>
      <p style={p}>Helps us understand which features are most used so we can improve the platform. All data is anonymized.</p>
      <h3 style={h3}>Marketing (Optional)</h3>
      <p style={p}>May be used in the future to show relevant updates. We do not currently sell your data to third-party advertisers.</p>
      <p style={p}>You can manage your cookie preferences at any time via the cookie banner on the site.</p>
      <hr style={divider} />
      <h2 style={h2}>Data Breach Protocol</h2>
      <p style={p}>
        As per UAE PDPL, we are committed to notifying you and the relevant authorities within 72 hours of verifying any data breach, detailing what happened and how we are fixing it.
      </p>
      <hr style={divider} />
      <h2 style={h2}>For Users in India</h2>
      <p style={p}>
        We recognize your rights under India&apos;s Digital Personal Data Protection Act 2023. You may exercise your rights of access, correction, and erasure at any time by contacting{" "}
        <a href="mailto:support@mycvpassport.com" style={link}>
          support@mycvpassport.com
        </a>
        .
      </p>
      <hr style={divider} />
      <h2 style={h2}>Your Rights & Retention</h2>
      <p style={p}>
        You have the right to access, export, or request deletion of your account. Upon account deletion, your personal data and professional history will be permanently removed from our active systems
        and backups within 30 days. To exercise these rights, please use your account settings or email{" "}
        <a href="mailto:support@mycvpassport.com" style={link}>
          support@mycvpassport.com
        </a>
        .
      </p>
    </LegalPageLayout>
  );
}
