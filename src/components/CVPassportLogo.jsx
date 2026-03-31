export default function CVPassportLogo({ height = 40 }) {
  return (
    <svg
      height={height}
      viewBox="0 0 180 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M 8 28 L 16 20 L 8 12"
        stroke="#FFFFFF"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 16 28 L 24 20 L 16 12"
        stroke="#FFFFFF"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.7"
      />
      <path
        d="M 24 28 L 32 20 L 24 12"
        stroke="#FFFFFF"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.4"
      />
      <text
        x="44"
        y="25"
        fill="#FFFFFF"
        fontSize="18"
        fontWeight="600"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        CVPassport
      </text>
    </svg>
  );
}
