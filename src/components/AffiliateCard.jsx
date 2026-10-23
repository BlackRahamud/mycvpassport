// src/components/AffiliateCard.jsx
import React from 'react';
import { AFFILIATE_LINKS } from '../config/affiliates';

export const WiseBanner = ({ sourceLocation = 'general' }) => {
  const wiseData = AFFILIATE_LINKS.WISE;

  const handleClick = () => {
    try {
      if (window.posthog) {
        window.posthog.capture('affiliate_click', {
          partner: 'wise',
          location: sourceLocation,
        });
      }
    } catch (e) {
      // tracking must never block the link
    }
  };

  return (
    <div
      style={{
        background: 'rgba(18, 24, 38, 0.8)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        padding: '20px',
        marginTop: '20px',
        marginBottom: '20px',
        color: '#fff',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
        <span
          style={{
            fontSize: '12px',
            background: '#0D9488',
            color: '#fff',
            padding: '2px 8px',
            borderRadius: '4px',
            fontWeight: 'bold',
          }}
        >
          EXPAT & RELOCATION TOOL
        </span>
      </div>
      <h4 style={{ margin: '0 0 6px 0', fontSize: '16px', fontWeight: '600', color: '#F3F4F6' }}>
        {wiseData.headline}
      </h4>
      <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: '#9CA3AF', lineHeight: '1.4' }}>
        {wiseData.description}
      </p>
      <a
        href={wiseData.url}
        target="_blank"
        rel="sponsored noopener noreferrer"
        onClick={handleClick}
        style={{
          display: 'inline-block',
          background: '#D97706',
          color: '#000',
          padding: '8px 16px',
          borderRadius: '6px',
          fontWeight: 'bold',
          fontSize: '13px',
          textDecoration: 'none',
        }}
      >
        {wiseData.cta} &rarr;
      </a>
      <p style={{ margin: '10px 0 0', fontSize: '11px', color: '#6B7280' }}>
        Affiliate link: we may earn a commission at no extra cost to you.
      </p>
    </div>
  );
};