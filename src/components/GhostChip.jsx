const GhostChip = ({ children }) => (
  <div
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      fontSize: '12px',
      color: 'transparent',
      transform: 'scale(0.01)',
      transformOrigin: 'top left',
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
    }}
    aria-hidden="true"
  >
    {children}
  </div>
);

export default GhostChip;
