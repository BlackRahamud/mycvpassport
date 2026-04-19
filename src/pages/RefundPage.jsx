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
const p = {
  fontSize: 14,
  color: "var(--text-secondary)",
  lineHeight: 1.7,
  margin: "0 0 16px",
};
const link = { color: "#FFF", textDecoration: "underline" };
const divider = { border: "none", borderTop: "1px solid var(--border-default)", margin: "32px 0" };

export default function RefundPage() {
  return (
    <LegalPageLayout title="Refund Policy" effectiveDate="March 31, 2026">
      <h2 style={h2}>No-Refund Policy</h2>
      <p style={p}>
        All payments made to CVPassport are strictly non-refundable. By completing payment you acknowledge that CVPassport provides immediate access to digital templates, ATS tooling, and professional
        formatting utilities. Once access has been granted no refund will be issued under any circumstances, including dissatisfaction with job search outcomes, accidental purchase, or change of mind.
      </p>
      <hr style={divider} />
      <h2 style={h2}>Our Commitment To You</h2>
      <p style={p}>
        We don&apos;t leave you stuck. If you are unhappy with your CV, cover letter, or ATS results, reach out to us at{" "}
        <a href="mailto:support@mycvpassport.com" style={link}>
          support@mycvpassport.com
        </a>
        . We will personally review your document, guide you on improvements, and do everything within our power to help you put your best foot forward. We cannot refund your payment but we will stand
        behind you until you are confident in your application.
      </p>
      <hr style={divider} />
      <h2 style={h2}>Proof of Delivery</h2>
      <p style={p}>
        We log every successful PDF download and every completed ATS or cover letter generation. These server logs serve as final proof of delivery in any payment dispute raised with Ziina, your bank,
        or your card issuer.
      </p>
      <hr style={divider} />
      <h2 style={h2}>Scope of Product</h2>
      <p style={p}>
        A &quot;functional product&quot; is defined as a machine-readable PDF matching your chosen template, a generated cover letter, or a completed ATS score report. Lack of job interviews, visa
        approvals, or salary outcomes does not constitute a product defect and is not grounds for a refund.
      </p>
      <hr style={divider} />
      <h2 style={h2}>Merchant of Record</h2>
      <p style={p}>
        All transactions are processed via Ziina. When you complete a payment, your bank or card statement will show &apos;Ziina&apos; or &apos;Ziina CVPassport&apos; as the charge description.
        Chargebacks filed without first contacting{" "}
        <a href="mailto:support@mycvpassport.com" style={link}>
          support@mycvpassport.com
        </a>{" "}
        will be contested using our delivery logs.
      </p>
      <hr style={divider} />
      <h2 style={h2}>Account Abuse</h2>
      <p style={p}>
        Creating multiple accounts to bypass free-tier limits or sharing paid login credentials with third parties is strictly prohibited. We use IP and device fingerprinting to monitor for abuse;
        clusters of accounts identified as abusing the platform will be terminated without notice or refund.
      </p>
      <hr style={divider} />
      <h2 style={h2}>Governing Law</h2>
      <p style={p}>This policy is governed by the laws of the United Arab Emirates. Any disputes shall be settled exclusively in the Courts of Dubai.</p>
      <hr style={divider} />
      <h2 style={h2}>Contact</h2>
      <p style={p}>
        Questions about this policy? Email{" "}
        <a href="mailto:support@mycvpassport.com" style={link}>
          support@mycvpassport.com
        </a>
        .
      </p>
    </LegalPageLayout>
  );
}
