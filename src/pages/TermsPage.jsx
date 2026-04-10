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

export default function TermsPage() {
  return (
    <LegalPageLayout title="Terms of Service" effectiveDate="March 31, 2026">
      <h2 style={h2}>Who We Are</h2>
      <p style={p}>CVPassport is a platform owned and operated by Junaid Mujtaba Khan, an individual resident of Dubai, UAE.</p>
      <hr style={divider} />
      <h2 style={h2}>1. The Service</h2>
      <p style={p}>
        CVPassport is a complete job application system built for two of the world&apos;s most competitive hiring markets — India and the Gulf. For Gulf job seekers, we provide ATS-optimized templates
        engineered specifically for UAE, Saudi, and GCC hiring portals. For the Indian market, we provide formats aligned with Indian corporate hiring standards. Both markets get access to our
        structured CV builder with region-specific sections, an ATS scoring engine, and a cover letter generator.
      </p>
      <h3 style={h3}>ATS Disclaimer</h3>
      <p style={p}>
        ATS Scores are proprietary estimates based on common industry standards and do not guarantee compatibility with every version of every ATS software in existence. Results may vary across
        different employer systems.
      </p>
      <h3 style={h3}>FAB</h3>
      <p style={p}>
        At the core of CVPassport sits FAB, a context-aware assistant. FAB silently reads your session — what you have filled, what you have skipped, how long you have been idle — and adapts in real
        time to nudge you toward completion. FAB is continuously evolving; what you see today is only the beginning of what FAB will become.
      </p>
      <h3 style={h3}>Walk-In Mode</h3>
      <p style={p}>
        Walk-In Mode is a preparation tool only. Users are solely responsible for complying with UAE local laws, building security protocols, and professional conduct during physical job hunts.
        CVPassport accepts no liability for any outcomes arising from in-person job search activities.
      </p>
      <hr style={divider} />
      <h2 style={h2}>2. Refund Policy</h2>
      <p style={p}>
        All payments are strictly non-refundable. By completing payment you acknowledge that CVPassport provides immediate access to digital templates and professional formatting tools. Once access is
        granted no refund will be issued under any circumstances including dissatisfaction with job search outcomes, accidental purchase, or change of mind.
      </p>
      <h3 style={h3}>Our Commitment</h3>
      <p style={p}>
        However — we don&apos;t leave you stuck. If you are unhappy with your CV, reach out to us at{" "}
        <a href="mailto:support@mycvpassport.com" style={link}>
          support@mycvpassport.com
        </a>
        . We will personally review your CV, guide you on improvements, and do everything within our power to help you put your best foot forward. We cannot refund your payment but we will stand behind
        you until you are confident in your application.
      </p>
      <hr style={divider} />
      <h2 style={h2}>3. Anti-Exploitation & Payment Protection</h2>
      <h3 style={h3}>Proof of Delivery</h3>
      <p style={p}>We log every successful PDF download. These server logs serve as final proof of delivery in any payment dispute.</p>
      <h3 style={h3}>Scope of Product</h3>
      <p style={p}>
        A &quot;functional product&quot; is defined as a machine-readable PDF matching your chosen template. Lack of job interviews, visa approvals, or salary outcomes does not constitute a product
        defect and is not grounds for a refund.
      </p>
      <h3 style={h3}>Merchant of Record</h3>
      <p style={p}>
        All transactions are processed via Ziina. When you complete a payment, your bank or card statement will show &apos;Ziina&apos; or &apos;Ziina CVPassport&apos; as the charge
        description.
      </p>
      <h3 style={h3}>Account Abuse</h3>
      <p style={p}>
        Creating multiple accounts to bypass free-tier limits or sharing paid login credentials with third parties is strictly prohibited. We use IP and device fingerprinting to monitor for abuse;
        clusters of accounts identified as abusing the platform will be terminated without notice or refund.
      </p>
      <hr style={divider} />
      <h2 style={h2}>4. Content Responsibility</h2>
      <p style={p}>
        CVPassport provides guided formatting assistance only. All content entered into CVPassport is authored solely by the user. CVPassport takes no responsibility for the accuracy, truthfulness, or
        professional consequences of any user-submitted content.
      </p>
      <hr style={divider} />
      <h2 style={h2}>5. No-Guarantee Disclaimer</h2>
      <p style={p}>
        We make zero promises regarding the number of interview calls, job offers, visa approvals, or specific salary outcomes. The platform is a technical tool, not a recruitment agency.
      </p>
      <hr style={divider} />
      <h2 style={h2}>6. Governing Law</h2>
      <p style={p}>These terms are governed by the laws of the United Arab Emirates. Any disputes shall be settled exclusively in the Courts of Dubai.</p>
    </LegalPageLayout>
  );
}
