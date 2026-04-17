import React from 'react';

function ApplePayLogo() {
  return (
    <svg width="44" height="20" viewBox="0 0 44 20" aria-label="Apple Pay" role="img">
      <rect width="44" height="20" rx="4" fill="#000" />
      <path
        d="M12.04 7.5c-.28-.35-.76-.65-1.25-.63-.06.58.18 1.14.47 1.48.28.34.74.6 1.21.58.08-.55-.18-1.1-.43-1.43zM14.2 13.8c-.26.38-.51.74-.92.75-.4.01-.53-.24-.99-.24-.46 0-.6.23-.98.25-.4.01-.7-.42-.96-.8-.53-.77-.93-2.17-.38-3.12.27-.47.75-.76 1.27-.77.38-.01.74.26.97.26.23 0 .67-.32 1.13-.27.19.01.73.08 1.08.58-.03.02-.64.38-.63 1.12.01.89.79 1.18.8 1.19-.01.03-.12.42-.39.79z"
        fill="#fff"
      />
      <text
        x="17"
        y="14"
        fill="#fff"
        fontFamily="Arial, sans-serif"
        fontSize="10"
        fontWeight="600"
      >
        Pay
      </text>
    </svg>
  );
}

function ZiinaLogo() {
  return (
    <img
      src="/ziina-logo.png"
      alt="Ziina"
      style={{ height: 16, width: 'auto', display: 'block' }}
    />
  );
}

function VisaLogo() {
  return (
    <svg width="44" height="20" viewBox="0 0 44 20" aria-label="Visa" role="img">
      <rect width="44" height="20" rx="3" fill="#1A1F71" />
      <text
        x="22"
        y="14"
        fill="#fff"
        fontFamily="Arial, sans-serif"
        fontSize="10"
        fontWeight="900"
        textAnchor="middle"
        letterSpacing="1"
      >
        VISA
      </text>
    </svg>
  );
}

function MastercardLogo() {
  return (
    <svg width="44" height="20" viewBox="0 0 44 20" aria-label="Mastercard" role="img">
      <circle cx="17" cy="10" r="7" fill="#EB001B" />
      <circle cx="27" cy="10" r="7" fill="#F79E1B" fillOpacity="0.85" />
    </svg>
  );
}

const pillStyle = {
  background: 'var(--bg-elevated, #1C1C1C)',
  border: '1px solid var(--border-default, #2A2A2A)',
  borderRadius: 'var(--radius-sm, 8px)',
  padding: '6px 10px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  height: 32,
  boxSizing: 'border-box',
};

export default function PaymentTrustBar({ style, align = 'center' }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: align === 'center' ? 'center' : 'flex-start',
        gap: 10,
        ...style,
      }}
    >
      <span
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: 'var(--text-secondary, #A0A0A0)',
        }}
      >
        Secure payments via
      </span>
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
          justifyContent: align === 'center' ? 'center' : 'flex-start',
        }}
      >
        <div style={pillStyle}>
          <ApplePayLogo />
        </div>
        <div style={pillStyle}>
          <ZiinaLogo />
        </div>
        <div style={pillStyle}>
          <VisaLogo />
        </div>
        <div style={pillStyle}>
          <MastercardLogo />
        </div>
      </div>
    </div>
  );
}
