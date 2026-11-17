import React from 'react';

// Small fixed link back to the version picker, used by the frozen versions.
export const VersionBack: React.FC = () => (
  <a
    href={location.pathname}
    title="Changer de version"
    style={{
      position: 'fixed', right: 12, bottom: 12, zIndex: 9999, padding: '6px 10px',
      font: '700 11px "Chakra Petch", ui-sans-serif, sans-serif', letterSpacing: '.14em', textTransform: 'uppercase',
      color: '#e8fbff', background: 'rgba(1,6,10,.75)', border: '2px solid #ff3d8b', textDecoration: 'none', opacity: 0.55,
    }}
    onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
    onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.55'; }}
  >
    ◀ Versions
  </a>
);
