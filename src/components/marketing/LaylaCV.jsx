import React from 'react';

// Static CV page — Layla Al-Hashimi. Restored from the hero's previous
// inline mockup (pre W18 hero dual-tablet rewrite). Rendered on white
// "paper" so it reads as a document when mounted inside a dark TabletFrame.
// No animation. No logic. Pure markup.
//
// Swap-in note: when a Figma kit export (SVG/PNG) lands in public/img/,
// replace the <div className="cvp-laylacv-paper"> body with <img src=... />.

export default function LaylaCV() {
  const ink = 'var(--color-surface-00)';
  const inkMuted = 'var(--color-surface-02)';

  const sectionLabel = {
    fontSize: 7,
    fontWeight: 700,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    color: inkMuted,
    opacity: 0.72,
    margin: '0 0 4px',
    fontFamily: 'inherit',
  };
  const entryTitle = {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: '-0.005em',
    lineHeight: 1.3,
    color: ink,
    margin: 0,
    fontFamily: 'inherit',
  };
  const entryMeta = {
    fontSize: 7.5,
    lineHeight: 1.3,
    color: inkMuted,
    opacity: 0.7,
    margin: '1px 0 2px',
    fontFamily: 'inherit',
  };
  const entryBody = {
    fontSize: 8,
    lineHeight: 1.4,
    color: ink,
    margin: 0,
    fontFamily: 'inherit',
  };

  return (
    <div className="cvp-laylacv">
      <style>{`
        .cvp-laylacv {
          width: 100%;
          height: 100%;
          display: flex;
          padding: 10px;
          box-sizing: border-box;
        }
        .cvp-laylacv-paper {
          flex: 1;
          background: var(--color-text-primary);
          border-radius: 8px;
          padding: 22px 20px;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          gap: 10px;
          overflow: hidden;
          box-shadow: 0 1px 2px rgba(0,0,0,0.2), 0 6px 16px rgba(0,0,0,0.35);
        }
      `}</style>

      <div className="cvp-laylacv-paper">
        {/* Header — avatar + identity stack */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div
            aria-hidden="true"
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #F3C178 0%, #D97706 100%)',
              color: '#0A0A0A',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '-0.01em',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'inherit',
              flexShrink: 0,
            }}
          >
            LA
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h3
              style={{
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: '-0.01em',
                lineHeight: 1.1,
                color: ink,
                margin: 0,
                fontFamily: 'inherit',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              Layla Al-Hashimi
            </h3>
            <p
              style={{
                fontSize: 8,
                fontWeight: 500,
                lineHeight: 1.3,
                color: ink,
                margin: '2px 0 0',
                fontFamily: 'inherit',
              }}
            >
              Senior Marketing Manager <span style={{ color: inkMuted, opacity: 0.6 }}>|</span> MENA &amp; GCC
            </p>
            <p
              style={{
                fontSize: 7.5,
                fontWeight: 400,
                lineHeight: 1.3,
                color: inkMuted,
                opacity: 0.7,
                margin: '1px 0 0',
                fontFamily: 'inherit',
              }}
            >
              Dubai, UAE
            </p>
          </div>
        </div>

        <div style={{ height: 1, background: inkMuted, opacity: 0.1 }} />

        <div>
          <p style={sectionLabel}>Summary</p>
          <p style={{ ...entryBody, fontWeight: 500 }}>
            8 years scaling Gulf-market brands through data-driven omnichannel growth across UAE and KSA.
          </p>
        </div>

        <div>
          <p style={sectionLabel}>Experience</p>
          <div style={{ marginBottom: 8 }}>
            <p style={entryTitle}>Head of Marketing · MENA Digital Group</p>
            <p style={entryMeta}>Dubai, UAE · 2022 – Present</p>
            <p style={entryBody}>
              Drove AED 8M revenue lift and 340% organic growth via programmatic paid media and full-funnel SEO.
            </p>
          </div>
          <div>
            <p style={entryTitle}>Marketing Manager · UAE Retail Group</p>
            <p style={entryMeta}>Dubai, UAE · 2018 – 2022</p>
            <p style={entryBody}>
              Delivered AED 2M YoY growth across 6 regional retail lines; launched two brands into KSA.
            </p>
          </div>
        </div>

        <div>
          <p style={sectionLabel}>Skills</p>
          <p style={{ ...entryBody, fontSize: 7.5, lineHeight: 1.5 }}>
            Omnichannel Strategy · Programmatic Advertising · MENA Market Penetration · Brand Positioning · Stakeholder Management · ROI-Driven Growth
          </p>
        </div>

        <div style={{ marginTop: 'auto' }}>
          <p style={sectionLabel}>Languages</p>
          <p style={{ ...entryBody, fontSize: 7.5 }}>
            English (Fluent) · Arabic (Native)
          </p>
        </div>
      </div>
    </div>
  );
}
