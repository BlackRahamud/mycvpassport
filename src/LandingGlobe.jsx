export default function LandingGlobe() {
  return (
    <svg viewBox="0 0 505 520" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker
          id="arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto-start-reverse"
        >
          <path
            d="M2 1L8 5L2 9"
            fill="none"
            stroke="context-stroke"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </marker>
        <radialGradient id="globeGrad" cx="42%" cy="38%" r="55%">
          <stop offset="0%" stopColor="#1e1e1e" />
          <stop offset="100%" stopColor="#020202" />
        </radialGradient>
        <clipPath id="globeClip">
          <circle cx="300" cy="255" r="205" />
        </clipPath>
      </defs>

      <circle cx="300" cy="255" r="205" fill="url(#globeGrad)" stroke="#2a2a2a" strokeWidth="1" />

      <g clipPath="url(#globeClip)" fill="#ffffff" opacity="0.45">
        <circle cx="275" cy="148" r="2.5" /><circle cx="290" cy="141" r="2" /><circle cx="282" cy="160" r="2.2" />
        <circle cx="298" cy="153" r="2.5" /><circle cx="268" cy="165" r="2" /><circle cx="305" cy="146" r="2" />
        <circle cx="260" cy="158" r="2" /><circle cx="310" cy="158" r="2.5" />
        <circle cx="350" cy="188" r="2.5" /><circle cx="362" cy="198" r="2" /><circle cx="355" cy="210" r="2.5" />
        <circle cx="368" cy="186" r="2" /><circle cx="342" cy="198" r="2" /><circle cx="360" cy="218" r="2" />
        <circle cx="372" cy="203" r="2.5" /><circle cx="337" cy="208" r="2" />
        <circle cx="275" cy="198" r="2.5" /><circle cx="288" cy="211" r="2" /><circle cx="278" cy="225" r="2.5" />
        <circle cx="292" cy="235" r="2" /><circle cx="268" cy="241" r="2" /><circle cx="283" cy="251" r="2.5" />
        <circle cx="298" cy="258" r="2" /><circle cx="273" cy="265" r="2" /><circle cx="288" cy="276" r="2.5" />
        <circle cx="278" cy="291" r="2" /><circle cx="292" cy="298" r="2" /><circle cx="282" cy="311" r="2.5" />
        <circle cx="395" cy="215" r="2.5" /><circle cx="408" cy="205" r="2" /><circle cx="402" cy="228" r="2.5" />
        <circle cx="418" cy="221" r="2" /><circle cx="390" cy="231" r="2" /><circle cx="412" cy="241" r="2.5" />
        <circle cx="445" cy="173" r="2.5" /><circle cx="458" cy="181" r="2" /><circle cx="450" cy="191" r="2.5" />
        <circle cx="465" cy="168" r="2" /><circle cx="440" cy="185" r="2" />
        <circle cx="245" cy="228" r="2" /><circle cx="238" cy="241" r="2.5" /><circle cx="250" cy="251" r="2" />
      </g>

      <path d="M353 201 Q398 165 405 221" fill="none" stroke="#aaa" strokeWidth="1.3" strokeDasharray="4 3" opacity="0.6" markerEnd="url(#arrow)" />
      <path d="M348 195 Q325 171 310 181" fill="none" stroke="#aaa" strokeWidth="1.3" strokeDasharray="4 3" opacity="0.55" markerEnd="url(#arrow)" />
      <path d="M346 188 Q318 138 294 148" fill="none" stroke="#aaa" strokeWidth="1.3" strokeDasharray="4 3" opacity="0.5" markerEnd="url(#arrow)" />
      <path d="M358 208 Q375 253 365 278" fill="none" stroke="#aaa" strokeWidth="1.3" strokeDasharray="4 3" opacity="0.45" markerEnd="url(#arrow)" />

      <circle cx="353" cy="201" r="5" fill="#fff" />
      <circle cx="408" cy="225" r="4" fill="#fff" opacity="0.8" />
      <circle cx="308" cy="151" r="4" fill="#fff" opacity="0.8" />
      <circle cx="308" cy="183" r="3.5" fill="#fff" opacity="0.75" />
      <circle cx="363" cy="280" r="3.5" fill="#fff" opacity="0.72" />

      <rect x="359" y="191" width="44" height="17" rx="3" fill="#1a1a1a" />
      <rect x="359" y="191" width="44" height="17" rx="3" fill="none" stroke="#444" strokeWidth="0.8" />
      <text x="381" y="203" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="white" fontFamily="sans-serif">DUBAI</text>

      <rect x="414" y="219" width="52" height="17" rx="3" fill="#1a1a1a" />
      <rect x="414" y="219" width="52" height="17" rx="3" fill="none" stroke="#444" strokeWidth="0.8" />
      <text x="440" y="231" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="white" fontFamily="sans-serif">MUMBAI</text>

      <rect x="258" y="141" width="48" height="17" rx="3" fill="#1a1a1a" />
      <rect x="258" y="141" width="48" height="17" rx="3" fill="none" stroke="#444" strokeWidth="0.8" />
      <text x="282" y="153" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="white" fontFamily="sans-serif">LONDON</text>

      <rect x="260" y="175" width="46" height="17" rx="3" fill="#1a1a1a" />
      <rect x="260" y="175" width="46" height="17" rx="3" fill="none" stroke="#444" strokeWidth="0.8" />
      <text x="283" y="187" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="white" fontFamily="sans-serif">RIYADH</text>

      <rect x="320" y="278" width="40" height="17" rx="3" fill="#1a1a1a" />
      <rect x="320" y="278" width="40" height="17" rx="3" fill="none" stroke="#444" strokeWidth="0.8" />
      <text x="340" y="290" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="white" fontFamily="sans-serif">DOHA</text>

      <circle cx="300" cy="255" r="205" fill="none" stroke="#333" strokeWidth="0.8" />
    </svg>
  );
}