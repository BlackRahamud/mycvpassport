import React from 'react';

// 4 static testimonial cards — slots between FeatureCardGrid and
// FoundersNoteSection. No stars, no photos, no carousel.

const TESTIMONIALS = [
  {
    id: 't1',
    name: 'Omar Al Rashidi',
    location: 'Dubai, UAE',
    quote:
      "I applied to 6 companies in one week. Three called me back. I hadn't changed anything except my CV.",
    ring: '#E5B24D',
    bleedRGB: '217,117,6',
  },
  {
    id: 't2',
    name: 'James Mitchell',
    location: 'Abu Dhabi, UAE',
    quote:
      "Didn't expect much but the ATS score alone showed me exactly what was wrong. Fixed it in 20 minutes.",
    ring: '#6FA8FF',
    bleedRGB: '59,130,246',
  },
  {
    id: 't3',
    name: 'Fatima Al Mansoori',
    location: 'Sharjah, UAE',
    quote:
      'Sent the same CV for months with no response. Updated it here, got an interview within 4 days.',
    ring: '#E0604A',
    bleedRGB: '220,38,38',
  },
  {
    id: 't4',
    name: 'Rahul Sengupta',
    location: 'Bangalore → Dubai',
    quote:
      'Every CV I sent before felt like shouting into a void. This one actually got read.',
    ring: '#46C99A',
    bleedRGB: '16,185,129',
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
        .cvp-testimonials-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
        }
        @media (max-width: 768px) {
          .cvp-testimonials-grid { grid-template-columns: 1fr; gap: 16px; }
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
        .cvp-testimonials-location {
          font-size: 12px;
          color: #555555;
          margin: 0;
          font-family: inherit;
        }
      `}</style>

      <div className="cvp-testimonials-inner">
        <div className="cvp-testimonials-grid">
          {TESTIMONIALS.map((t) => (
            <figure
              key={t.id}
              className="cvp-testimonials-card"
              style={{ '--card-ring': t.ring, '--card-bleed': t.bleedRGB }}
            >
              <blockquote className="cvp-testimonials-quote">{t.quote}</blockquote>
              <figcaption className="cvp-testimonials-attribution">
                <p className="cvp-testimonials-name">{t.name}</p>
                <p className="cvp-testimonials-location">{t.location}</p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
