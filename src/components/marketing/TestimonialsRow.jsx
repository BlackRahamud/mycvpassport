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
  },
  {
    id: 't2',
    name: 'James Mitchell',
    location: 'Abu Dhabi, UAE',
    quote:
      "Didn't expect much but the ATS score alone showed me exactly what was wrong. Fixed it in 20 minutes.",
  },
  {
    id: 't3',
    name: 'Fatima Al Mansoori',
    location: 'Sharjah, UAE',
    quote:
      'Sent the same CV for months with no response. Updated it here, got an interview within 4 days.',
  },
  {
    id: 't4',
    name: 'Rahul Sengupta',
    location: 'Bangalore → Dubai',
    quote:
      'Every CV I sent before felt like shouting into a void. This one actually got read.',
  },
];

export default function TestimonialsRow() {
  return (
    <section className="cvp-testimonials" aria-label="What job seekers say">
      <style>{`
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
          background: #141414;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 16px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          font-family: inherit;
          box-sizing: border-box;
        }
        .cvp-testimonials-quote {
          font-style: italic;
          font-size: 15px;
          line-height: 1.6;
          color: #A0A0A0;
          margin: 0;
          font-family: inherit;
        }
        .cvp-testimonials-attribution {
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
            <figure key={t.id} className="cvp-testimonials-card">
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
