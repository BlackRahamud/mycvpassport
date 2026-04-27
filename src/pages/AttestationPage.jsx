import React, { useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import attestationData from "../generated/attestation.json";

const SITE = "https://www.mycvpassport.com";

const COUNTRIES_OF_EDUCATION = [{ code: "india", label: "India" }];

const TARGET_COUNTRIES = [
  { code: "uae", label: "United Arab Emirates", short: "UAE" },
  { code: "ksa", label: "Saudi Arabia", short: "KSA" },
  { code: "qatar", label: "Qatar", short: "Qatar" },
  { code: "oman", label: "Oman", short: "Oman" },
  { code: "bahrain", label: "Bahrain", short: "Bahrain" },
  { code: "kuwait", label: "Kuwait", short: "Kuwait" },
];

const DOC_TYPES = [
  { code: "educational", label: "Educational certificate", key: "educational_certificates" },
  { code: "personal", label: "Personal certificate (marriage / birth / etc.)", key: "personal_certificates" },
  { code: "commercial", label: "Commercial certificate", key: "commercial_certificates" },
];

// ── Design tokens ──────────────────────────────────────────────────────────
const T = {
  bg: "#0A0A0A",
  surface: "#141414",
  elevated: "#1C1C1C",
  border: "#2A2A2A",
  text: "#FFFFFF",
  muted: "#A0A0A0",
  amber: "#D97706",
  amberBorder: "rgba(217,119,6,0.35)",
  amberDim: "rgba(217,119,6,0.12)",
  green: "#1D9E75",
  blue: "#378ADD",
};

const S = {
  page: {
    minHeight: "100vh",
    background: T.bg,
    color: T.text,
    fontFamily: "'DM Sans', 'Outfit', 'Segoe UI', sans-serif",
    lineHeight: 1.6,
  },
  inner: {
    maxWidth: 880,
    margin: "0 auto",
    padding: "32px 20px 80px",
    boxSizing: "border-box",
  },
  back: {
    display: "inline-block",
    marginBottom: 16,
    color: T.muted,
    textDecoration: "none",
    fontSize: 14,
  },
  h1: { fontSize: 36, lineHeight: 1.15, fontWeight: 700, margin: "8px 0 12px" },
  intro: { color: T.muted, fontSize: 16, marginBottom: 28, maxWidth: 640 },
  controls: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 12,
    background: T.surface,
    padding: 18,
    borderRadius: 14,
    border: `1px solid ${T.border}`,
    marginBottom: 24,
  },
  label: { display: "block", color: T.muted, fontSize: 12, marginBottom: 6, letterSpacing: 0.4, textTransform: "uppercase", fontWeight: 600 },
  select: {
    width: "100%",
    padding: "12px 14px",
    background: T.elevated,
    color: T.text,
    border: `1px solid ${T.border}`,
    borderRadius: 8,
    fontSize: 15,
    fontFamily: "inherit",
    appearance: "none",
    cursor: "pointer",
  },
  stubBanner: {
    background: T.amberDim,
    border: `1px solid ${T.amberBorder}`,
    color: T.amber,
    padding: "12px 16px",
    borderRadius: 10,
    fontSize: 14,
    marginBottom: 24,
  },
  sectionTitle: { fontSize: 22, fontWeight: 700, margin: "28px 0 12px" },
  keyFact: {
    background: T.surface,
    border: `1px solid ${T.border}`,
    padding: "14px 16px",
    borderRadius: 10,
    color: T.muted,
    fontSize: 14,
    marginBottom: 24,
    whiteSpace: "pre-wrap",
  },
  routeCard: {
    background: T.surface,
    border: `1px solid ${T.border}`,
    borderRadius: 14,
    padding: "20px 22px",
    marginBottom: 16,
  },
  routeHeading: { display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  routeName: { fontSize: 18, fontWeight: 700 },
  routeBadge: { fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: T.green, fontWeight: 700 },
  stepList: { listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 },
  stepItem: {
    background: T.elevated,
    border: `1px solid ${T.border}`,
    borderRadius: 10,
    padding: "14px 16px",
    display: "grid",
    gridTemplateColumns: "32px 1fr",
    gap: 14,
    alignItems: "start",
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 8,
    background: T.amberDim,
    color: T.amber,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 14,
  },
  stepName: { fontSize: 15, fontWeight: 600, marginBottom: 4 },
  stepAuth: { fontSize: 13, color: T.muted, marginBottom: 8 },
  stepMeta: { display: "flex", gap: 14, fontSize: 12, color: T.muted, flexWrap: "wrap" },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 14,
    paddingTop: 14,
    borderTop: `1px solid ${T.border}`,
    fontSize: 14,
  },
  totalLabel: { color: T.muted },
  totalValue: { color: T.text, fontWeight: 700 },
  altCard: {
    background: T.surface,
    border: `1px dashed ${T.border}`,
    borderRadius: 12,
    padding: "16px 18px",
    marginBottom: 16,
  },
  altLabel: { fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: T.muted, fontWeight: 700, marginBottom: 6 },
  cta: {
    display: "block",
    background: T.surface,
    border: `1px solid ${T.amberBorder}`,
    padding: "16px 18px",
    borderRadius: 12,
    color: T.text,
    textDecoration: "none",
    marginBottom: 12,
    transition: "background 200ms cubic-bezier(0.4,0,0.2,1), border-color 200ms cubic-bezier(0.4,0,0.2,1)",
  },
  ctaTitle: { fontSize: 16, fontWeight: 700, marginBottom: 4 },
  ctaSub: { color: T.muted, fontSize: 13 },
};

function findData(fromCode, toCode) {
  return attestationData[`${fromCode}__${toCode}`] ?? null;
}

function fmtDays(d) {
  if (d == null) return "—";
  if (typeof d === "number") return `${d} day${d === 1 ? "" : "s"}`;
  if (Array.isArray(d) && d.length === 2) return `${d[0]}–${d[1]} days`;
  return String(d);
}

function fmtFeesInr(range) {
  if (range == null) return "—";
  if (typeof range === "number") return `₹${range.toLocaleString("en-IN")}`;
  if (Array.isArray(range) && range.length === 2) {
    return `₹${range[0].toLocaleString("en-IN")}–${range[1].toLocaleString("en-IN")}`;
  }
  return "—";
}

function fmtDestFees(step) {
  // Steps land destination-side may use fees_aed / fees_sar / etc.
  for (const key of Object.keys(step)) {
    if (key.startsWith("fees_") && key !== "fees_inr" && step[key] != null) {
      const cur = key.replace("fees_", "").toUpperCase();
      const v = step[key];
      if (Array.isArray(v) && v.length === 2) return `${cur} ${v[0]}–${v[1]}`;
      if (typeof v === "number") return `${cur} ${v}`;
    }
  }
  return null;
}

export default function AttestationPage() {
  const [from, setFrom] = useState("india");
  const [to, setTo] = useState("uae");
  const [docType, setDocType] = useState("educational");

  const data = findData(from, to);
  const docMeta = DOC_TYPES.find((d) => d.code === docType) ?? DOC_TYPES[0];
  const docData = data?.document_types?.[docMeta.key] ?? null;
  const isStub = data?.status === "stub";

  const targetMeta = TARGET_COUNTRIES.find((c) => c.code === to);
  const fromMeta = COUNTRIES_OF_EDUCATION.find((c) => c.code === from);

  const title = `${docMeta.label} attestation: ${fromMeta.label} → ${targetMeta.label} | mycvpassport`;
  const description = isStub
    ? `Step-by-step ${docMeta.label.toLowerCase()} attestation chain from ${fromMeta.label} to ${targetMeta.label}. Authorities and order are confirmed; fees and turnaround days are pending validation.`
    : `Step-by-step ${docMeta.label.toLowerCase()} attestation chain from ${fromMeta.label} to ${targetMeta.label}. Notary → SDM → MEA → embassy → MOFA, with current INR fees and turnaround days per step.`;
  const canonical = `${SITE}/attestation`;

  const howToSchema = useMemo(() => {
    const fast = docData?.fastest_route;
    if (!fast?.steps?.length) return null;
    return {
      "@context": "https://schema.org",
      "@type": "HowTo",
      name: `${docMeta.label} attestation: ${fromMeta.label} to ${targetMeta.label}`,
      description,
      ...(typeof fast.total_days === "number" ? { totalTime: `P${fast.total_days}D` } : {}),
      ...(typeof fast.total_fees_inr === "number"
        ? {
            estimatedCost: {
              "@type": "MonetaryAmount",
              currency: "INR",
              value: fast.total_fees_inr,
            },
          }
        : {}),
      step: fast.steps.map((s) => ({
        "@type": "HowToStep",
        position: s.step,
        name: s.name,
        text: `Authority: ${s.authority}. ${s.notes ?? ""}`.trim(),
        ...(s.link ? { url: s.link } : {}),
      })),
    };
  }, [docData, docMeta.label, fromMeta.label, targetMeta.label, description]);

  return (
    <main style={S.page}>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonical} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
        {howToSchema && (
          <script type="application/ld+json">{JSON.stringify(howToSchema)}</script>
        )}
      </Helmet>

      <div style={S.inner}>
        <Link to="/" style={S.back}>
          ← Home
        </Link>
        <h1 style={S.h1}>Attestation roadmap</h1>
        <p style={S.intro}>
          Document attestation chain from {fromMeta.label} to your target Gulf country. Authorities,
          official fees, and realistic turnaround days at each step. No agent markup, no hidden
          surprises — links to government sources where available.
        </p>

        <div style={S.controls}>
          <div>
            <label htmlFor="from" style={S.label}>
              Country of education
            </label>
            <select
              id="from"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              style={S.select}
            >
              {COUNTRIES_OF_EDUCATION.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="to" style={S.label}>
              Target Gulf country
            </label>
            <select id="to" value={to} onChange={(e) => setTo(e.target.value)} style={S.select}>
              {TARGET_COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="doc" style={S.label}>
              Document type
            </label>
            <select
              id="doc"
              value={docType}
              onChange={(e) => setDocType(e.target.value)}
              style={S.select}
            >
              {DOC_TYPES.map((d) => (
                <option key={d.code} value={d.code}>
                  {d.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {isStub && (
          <div style={S.stubBanner}>
            ⚠ Fees and turnaround days for {targetMeta.label} are pending validation. The
            authorities and step order below are confirmed; numbers will firm up shortly. India →
            UAE has full validated data — switch the target to UAE for the complete picture.
          </div>
        )}

        {data?.key_fact && (
          <>
            <h2 style={S.sectionTitle}>Key fact</h2>
            <div style={S.keyFact}>{data.key_fact.trim()}</div>
          </>
        )}

        {docData?.fastest_route?.steps?.length ? (
          <>
            <h2 style={S.sectionTitle}>SDM route — fastest</h2>
            <section style={S.routeCard}>
              <div style={S.routeHeading}>
                <div style={S.routeName}>{docData.fastest_route.name}</div>
                <div style={S.routeBadge}>Recommended</div>
              </div>
              <ol style={S.stepList}>
                {docData.fastest_route.steps.map((step) => {
                  const destFees = fmtDestFees(step);
                  return (
                    <li key={step.step} style={S.stepItem}>
                      <div style={S.stepNum}>{step.step}</div>
                      <div>
                        <div style={S.stepName}>{step.name}</div>
                        <div style={S.stepAuth}>{step.authority}</div>
                        <div style={S.stepMeta}>
                          <span>⏱ {fmtDays(step.days)}</span>
                          {step.fees_inr != null && <span>💰 {fmtFeesInr(step.fees_inr)}</span>}
                          {destFees && <span>💰 {destFees}</span>}
                          {step.location && <span>📍 {step.location}</span>}
                          {step.link && (
                            <a
                              href={step.link}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: T.blue }}
                            >
                              Official ↗
                            </a>
                          )}
                        </div>
                        {step.notes && (
                          <div style={{ ...S.stepMeta, marginTop: 6, color: T.muted }}>
                            {step.notes}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
              <div style={S.totalRow}>
                <span style={S.totalLabel}>Total time</span>
                <span style={S.totalValue}>{fmtDays(docData.fastest_route.total_days)}</span>
              </div>
              <div style={S.totalRow}>
                <span style={S.totalLabel}>Total fees (India side)</span>
                <span style={S.totalValue}>
                  {docData.fastest_route.total_fees_inr != null
                    ? `₹${docData.fastest_route.total_fees_inr.toLocaleString("en-IN")}`
                    : "—"}
                </span>
              </div>
            </section>

            {docData.alternative_route && (
              <section style={S.altCard}>
                <div style={S.altLabel}>Alternative</div>
                <div style={S.routeName}>{docData.alternative_route.name}</div>
                <div style={{ color: T.muted, fontSize: 14, marginTop: 6 }}>
                  ⏱ {fmtDays(docData.alternative_route.total_days)}
                  {docData.alternative_route.notes ? ` — ${docData.alternative_route.notes}` : ""}
                </div>
              </section>
            )}

            {data.private_agency_markup_inr && (
              <p style={{ color: T.muted, fontSize: 13, marginTop: 8 }}>
                Private agency markup (typical): {fmtFeesInr(data.private_agency_markup_inr)}.
                Going direct via SDM/MEA is the cheapest legitimate route.
              </p>
            )}
          </>
        ) : (
          <p style={{ color: T.muted, fontSize: 14 }}>
            No data yet for {docMeta.label.toLowerCase()} from {fromMeta.label} to{" "}
            {targetMeta.label}. Try a different document type.
          </p>
        )}

        <h2 style={S.sectionTitle}>Next step</h2>
        <Link to="/ats" style={S.cta}>
          <div style={S.ctaTitle}>Score your CV against a Gulf job →</div>
          <div style={S.ctaSub}>
            Free ATS scan calibrated for {targetMeta.label} hiring practices.
          </div>
        </Link>
        <Link to="/salary-switcher" style={S.cta}>
          <div style={S.ctaTitle}>Translate ₹ CTC into a Gulf package →</div>
          <div style={S.ctaSub}>
            Basic + housing + transport + EOSB. See what an offer is really worth.
          </div>
        </Link>
        <Link to="/india-to-uae" style={S.cta}>
          <div style={S.ctaTitle}>India → UAE CV guide →</div>
          <div style={S.ctaSub}>What changes between an Indian resume and a Gulf-ready CV.</div>
        </Link>
      </div>
    </main>
  );
}
