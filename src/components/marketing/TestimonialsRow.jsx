import React from 'react';

// 4 static testimonial cards — slots between FeatureCardGrid and
// FoundersNoteSection. No stars, no photos, no carousel.

// May-2026: pill chrome upgraded to the bundle's gradient chip style
// (matches the "+AED 8K/mo lift" pill on the new Arabic 5th card).
// Pill text is unchanged — only the visual style upgraded.
const TESTIMONIALS = [
  {
    id: 't1',
    name: 'Omar Al Rashidi',
    role: 'Senior Sales Manager',
    location: 'Dubai, UAE',
    quote:
      "I'd been applying for 3 months with zero callbacks. Ran my CV through the ATS checker — it scored 31. Fixed what it flagged, rebuilt with CVPassport. Within 10 days I had 3 interviews lined up. Same experience, completely different result.",
    pillText: 'Got interviews',
    pillTone: 'green',
    ring: '#E5B24D',
    bleedRGB: '217,117,6',
  },
  {
    id: 't2',
    name: 'James Mitchell',
    role: 'Finance Analyst',
    location: 'Abu Dhabi, UAE',
    quote:
      "My CV was scoring 23. I thought it was fine & it looked good. The checker showed me I was missing 14 keywords recruiters search for. Fixed it in 20 minutes. Next application got a call the same day.",
    pillText: 'Score: 23 → 91',
    pillTone: 'blue',
    ring: '#6FA8FF',
    bleedRGB: '59,130,246',
  },
  {
    id: 't3',
    name: 'Fatima Al Mansoori',
    role: 'HR Business Partner',
    location: 'Sharjah, UAE',
    quote:
      "7 months sending the same CV. Nothing. A friend told me about CVPassport. I rebuilt my CV in under an hour  it felt tailored to how Gulf recruiters actually think. Got my first interview call 4 days later. I wish I found this earlier.",
    pillText: 'Interview in 4 days',
    pillTone: 'green',
    ring: '#E0604A',
    bleedRGB: '220,38,38',
  },
  {
    id: 't4',
    name: 'Rahul Sengupta',
    role: 'Product Manager',
    location: 'Bangalore → Dubai',
    quote:
      "Moving from Bangalore to Dubai means competing with candidates who know the local market. CVPassport understood that  the templates are built for Gulf employers, not generic Western formats. My CV finally looked like it belonged here.",
    pillText: 'Relocated to Dubai',
    pillTone: 'blue',
    ring: '#46C99A',
    bleedRGB: '16,185,129',
  },
  // 5th card — Arabic testimonial, Fatima A. (Cairo → Dubai). Quote and
  // pill text ported from the design bundle (landing-testimonials.jsx).
  {
    id: 't5',
    name: 'Fatima A.',
    role: 'Marketing Lead',
    location: 'Cairo → Dubai',
    quote:
      'كنت أتقدم لوظائف في دبي لمدة ٤ أشهر بدون أي رد. أعدت بناء سيرتي الذاتية مع CVPassport في ساعة واحدة فقط. حصلت على ٣ مقابلات في الأسبوع الأول، وقبلت عرضاً برفع ٨ آلاف درهم شهرياً عن وظيفتي السابقة. أخيراً، نظام يفهم سوق العمل في الخليج.',
    quoteEn:
      '"Three interviews in one week — after six months of silence. Accepted an offer with an AED 8K/mo lift over my last role."',
    pillText: '+AED 8K/mo lift',
    pillTone: 'green',
    ring: '#6EE7A1',
    bleedRGB: '74,222,128',
    rtl: true,
  },
];

export default function TestimonialsRow() {
  return (
    <section className="cvp-testimonials" aria-label="What job seekers say">
      <style>{`
        @property --tl-angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
        @keyframes tl-spin { to { --tl-angle: 360deg; } }

        .cvp-testimonials {
          padding: 96px 24px;
          background: var(--color-surface-00);
          color: var(--color-text-primary);
          box-sizing: border-box;
        }
        @media (max-width: 768px) {
          .cvp-testimonials { padding: 72px 20px; }
        }
        .cvp-testimonials-inner {
          max-width: 1100px;
          margin: 0 auto;
        }
        .cvp-testimonials-header {
          text-align: center;
          margin: 0 auto 48px;
          max-width: 640px;
        }
        .cvp-testimonials-header-title {
          font-size: 48px;
          font-weight: 510;
          letter-spacing: -1.056px;
          line-height: 1.0;
          color: var(--color-text-primary);
          margin: 0;
          font-family: inherit;
        }
        .cvp-testimonials-header-sub {
          font-size: 17px;
          font-weight: 400;
          letter-spacing: -0.374px;
          line-height: 1.47;
          color: var(--color-text-secondary);
          margin: 16px auto 0;
          max-width: 520px;
          font-family: inherit;
        }
        @media (max-width: 900px) {
          .cvp-testimonials-header-title {
            font-size: 32px;
            letter-spacing: -0.640px;
          }
          .cvp-testimonials-header-sub {
            font-size: 16px;
            letter-spacing: -0.176px;
          }
        }
        /* 3 + 2 layout — top row of 3 cards, bottom row of 2 centered.
           The 4th and 5th cards (one of which is the new Arabic
           testimonial pasted in by the user) span 1.5 cols each on
           wide screens so the bottom row reads as deliberately offset.
           Mobile collapses to a single column.                          */
        .cvp-testimonials-grid {
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          gap: 20px;
        }
        .cvp-testimonials-grid > .cvp-testimonials-card:nth-child(-n+3) {
          grid-column: span 2;
        }
        .cvp-testimonials-grid > .cvp-testimonials-card:nth-child(n+4) {
          grid-column: span 3;
        }
        @media (max-width: 900px) {
          .cvp-testimonials-grid { grid-template-columns: repeat(2, 1fr); }
          .cvp-testimonials-grid > .cvp-testimonials-card:nth-child(-n+3) { grid-column: span 1; }
          .cvp-testimonials-grid > .cvp-testimonials-card:nth-child(n+4) { grid-column: span 1; }
        }
        @media (max-width: 600px) {
          .cvp-testimonials-grid { grid-template-columns: 1fr; gap: 16px; }
          .cvp-testimonials-grid > .cvp-testimonials-card { grid-column: span 1 !important; }
        }
        .cvp-testimonials-card {
          position: relative;
          isolation: isolate;
          overflow: hidden;
          background: #141414;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          font-family: inherit;
          box-sizing: border-box;
          transition: transform 300ms cubic-bezier(0.16,1,0.3,1),
                      box-shadow 300ms cubic-bezier(0.16,1,0.3,1);
        }
        .cvp-testimonials-card::before {
          content: "";
          position: absolute;
          inset: -1px;
          border-radius: 16px;
          padding: 1.5px;
          background: conic-gradient(
            from var(--tl-angle, 0deg),
            transparent 60%,
            var(--card-ring) 84%,
            transparent 100%
          );
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor;
          mask-composite: exclude;
          pointer-events: none;
          animation: tl-spin 5.4s linear infinite;
          filter: drop-shadow(0 0 10px rgba(var(--card-bleed), 0.45));
          transition: filter 300ms cubic-bezier(0.16,1,0.3,1);
          z-index: 1;
        }
        .cvp-testimonials-card::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 16px;
          pointer-events: none;
          background: radial-gradient(
            circle at 20% 20%,
            rgba(var(--card-bleed), 0.06) 0%,
            transparent 55%
          );
          transition: background 300ms cubic-bezier(0.16,1,0.3,1);
          z-index: 0;
        }
        .cvp-testimonials-card:hover {
          transform: translateY(-4px) scale(1.015);
          box-shadow: 0 22px 48px -18px rgba(var(--card-bleed), 0.38);
        }
        .cvp-testimonials-card:hover::before {
          filter: drop-shadow(0 0 18px rgba(var(--card-bleed), 0.75));
        }
        .cvp-testimonials-card:hover::after {
          background: radial-gradient(
            circle at 20% 20%,
            rgba(var(--card-bleed), 0.14) 0%,
            transparent 55%
          );
        }
        /* Pill chip — gradient fill + bold weight + soft shadow,
           ported from the bundle's "+AED 8K/mo lift" pill style
           (.cvp-tt-pill / .cvp-tt-pill-green / -blue) so all 5 cards
           speak the same visual language. */
        .cvp-testimonials-badge {
          position: absolute;
          top: 24px;
          right: 24px;
          z-index: 3;
          display: inline-flex;
          align-items: center;
          height: 26px;
          padding: 0 12px;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: -0.005em;
          line-height: 1;
          border-radius: 999px;
          white-space: nowrap;
          font-family: inherit;
          direction: ltr;
          unicode-bidi: isolate;
          box-shadow: 0 4px 14px -2px rgba(0,0,0,0.45),
                      inset 0 1px 0 rgba(255,255,255,0.18);
        }
        .cvp-testimonials-badge--green {
          background: linear-gradient(180deg, #6EE7A1 0%, #4ADE80 100%);
          color: #08311A;
          border: 1px solid rgba(74,222,128,0.55);
        }
        .cvp-testimonials-badge--blue {
          background: linear-gradient(180deg, #93C5FD 0%, #60A5FA 100%);
          color: #0B2748;
          border: 1px solid rgba(96,165,250,0.55);
        }
        /* RTL Arabic card — pill anchors to the left, quote uses
           Cairo for Arabic legibility, attribution flips. */
        .cvp-testimonials-card.is-rtl { direction: rtl; }
        .cvp-testimonials-card.is-rtl .cvp-testimonials-badge {
          right: auto; left: 24px;
        }
        .cvp-testimonials-card.is-rtl .cvp-testimonials-quote-ar {
          font-family: 'Cairo', 'IBM Plex Sans Arabic', system-ui, sans-serif;
          font-style: normal;
          font-size: 16px;
          line-height: 1.75;
          letter-spacing: 0;
          color: #FFFFFF;
        }
        .cvp-testimonials-card.is-rtl .cvp-testimonials-quote-en {
          direction: ltr;
          font-style: italic;
          font-size: 14px;
          color: #A0A0A0;
          margin-top: 10px;
        }
        .cvp-testimonials-card.is-rtl .cvp-testimonials-attribution {
          text-align: right;
        }
        .cvp-testimonials-card.is-rtl .cvp-testimonials-name,
        .cvp-testimonials-card.is-rtl .cvp-testimonials-role,
        .cvp-testimonials-card.is-rtl .cvp-testimonials-location {
          unicode-bidi: plaintext;
        }
        .cvp-testimonials-stars {
          position: relative;
          z-index: 2;
          color: #EF9F27;
          font-size: 13px;
          letter-spacing: 2px;
          line-height: 1;
          font-family: inherit;
        }
        .cvp-testimonials-quote {
          position: relative;
          z-index: 2;
          font-style: italic;
          font-size: 15px;
          line-height: 1.6;
          color: #A0A0A0;
          margin: 0;
          font-family: inherit;
        }
        .cvp-testimonials-attribution {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding-top: 8px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }
        .cvp-testimonials-name {
          font-size: 14px;
          font-weight: 700;
          color: #FFFFFF;
          margin: 0;
          letter-spacing: -0.01em;
          font-family: inherit;
        }
        .cvp-testimonials-role {
          font-size: 12px;
          color: #555555;
          margin: 0;
          font-family: inherit;
        }
        .cvp-testimonials-location {
          font-size: 12px;
          color: #555555;
          margin: 0;
          font-family: inherit;
        }
      `}</style>

      <div className="cvp-testimonials-inner">
        <header className="cvp-testimonials-header">
          <h2 className="cvp-testimonials-header-title">Real people. Real results.</h2>
          <p className="cvp-testimonials-header-sub">
            67% of our users are based in the UAE — built for the Gulf job market, not adapted for it.
          </p>
        </header>

        <div className="cvp-testimonials-grid">
          {TESTIMONIALS.map((t) => (
            <figure
              key={t.id}
              className={`cvp-testimonials-card${t.rtl ? ' is-rtl' : ''}`}
              style={{ '--card-ring': t.ring, '--card-bleed': t.bleedRGB }}
              dir={t.rtl ? 'rtl' : undefined}
            >
              <span className={`cvp-testimonials-badge cvp-testimonials-badge--${t.pillTone}`}>
                {t.pillText}
              </span>
              <div className="cvp-testimonials-stars" aria-label="5 out of 5 stars">
                ★★★★★
              </div>
              {t.rtl ? (
                <blockquote className="cvp-testimonials-quote">
                  <span className="cvp-testimonials-quote-ar">{t.quote}</span>
                  {t.quoteEn ? (
                    <span className="cvp-testimonials-quote-en" style={{ display: 'block' }}>
                      {t.quoteEn}
                    </span>
                  ) : null}
                </blockquote>
              ) : (
                <blockquote className="cvp-testimonials-quote">{t.quote}</blockquote>
              )}
              <figcaption className="cvp-testimonials-attribution">
                <p className="cvp-testimonials-name">{t.name}</p>
                <p className="cvp-testimonials-role">{t.role}</p>
                <p className="cvp-testimonials-location">{t.location}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
