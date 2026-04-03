interface Props { size?: number; className?: string; }

export default function InqaiLogo({ size = 32, className = '' }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={className}
      aria-label="INQAI"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <defs>
        <radialGradient id="cb" cx="32%" cy="24%" r="90%">
          <stop offset="0%" stopColor="#A855F7" />
          <stop offset="8%" stopColor="#7C3AED" />
          <stop offset="22%" stopColor="#4C1D95" />
          <stop offset="40%" stopColor="#1E0A4A" />
          <stop offset="60%" stopColor="#0A0225" />
          <stop offset="80%" stopColor="#050118" />
          <stop offset="100%" stopColor="#01000A" />
        </radialGradient>
        <linearGradient id="rim" x1="6%" y1="2%" x2="94%" y2="98%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="4%" stopColor="#F5F0FF" stopOpacity="0.98" />
          <stop offset="10%" stopColor="#DDD6FE" stopOpacity="0.88" />
          <stop offset="20%" stopColor="#A78BFA" stopOpacity="0.65" />
          <stop offset="30%" stopColor="#6D28D9" stopOpacity="0.35" />
          <stop offset="42%" stopColor="#110330" stopOpacity="0.1" />
          <stop offset="52%" stopColor="#07011A" stopOpacity="0.06" />
          <stop offset="64%" stopColor="#3B0D8A" stopOpacity="0.28" />
          <stop offset="76%" stopColor="#5B21B6" stopOpacity="0.55" />
          <stop offset="86%" stopColor="#A78BFA" stopOpacity="0.85" />
          <stop offset="95%" stopColor="#DDD6FE" stopOpacity="0.97" />
          <stop offset="100%" stopColor="#F5F3FF" stopOpacity="1" />
        </linearGradient>
        <linearGradient id="sym" x1="0" y1="54" x2="0" y2="146" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="22%" stopColor="#F5F0FF" />
          <stop offset="50%" stopColor="#C4B5FD" />
          <stop offset="80%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#4C1D95" />
        </linearGradient>
        <radialGradient id="ndg" cx="38%" cy="32%" r="62%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="50%" stopColor="#DDD6FE" stopOpacity="0.95" />
          <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.55" />
        </radialGradient>
        <filter id="gw" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="bl" x="-110%" y="-110%" width="320%" height="320%">
          <feGaussianBlur stdDeviation="13" />
        </filter>
      </defs>
      
      <circle cx="100" cy="108" r="86" fill="#06001E" opacity="0.72" filter="url(#bl)" />
      <circle cx="100" cy="100" r="96" fill="url(#cb)" />
      <circle cx="100" cy="100" r="97.5" fill="none" stroke="url(#rim)" strokeWidth="7.5" />
      <circle cx="100" cy="100" r="93.2" fill="none" stroke="#000" strokeWidth="2" opacity="0.92" />
      
      {/* Connection lines */}
      <g opacity="0.22" filter="url(#bl)">
        <line x1="100" y1="68" x2="70" y2="85" stroke="#8B5CF6" strokeWidth="3.5" />
        <line x1="100" y1="68" x2="130" y2="85" stroke="#8B5CF6" strokeWidth="3.5" />
        <line x1="100" y1="100" x2="66" y2="100" stroke="#8B5CF6" strokeWidth="3.5" />
        <line x1="100" y1="100" x2="134" y2="100" stroke="#8B5CF6" strokeWidth="3.5" />
        <line x1="100" y1="132" x2="70" y2="115" stroke="#8B5CF6" strokeWidth="3.5" />
        <line x1="100" y1="132" x2="130" y2="115" stroke="#8B5CF6" strokeWidth="3.5" />
      </g>
      
      {/* Outer nodes */}
      <g><circle cx="70" cy="85" r="9" fill="#1A0446" opacity="0.55" /><circle cx="70" cy="85" r="5.5" fill="url(#ndg)" filter="url(#gw)" /></g>
      <g><circle cx="130" cy="85" r="9" fill="#1A0446" opacity="0.55" /><circle cx="130" cy="85" r="5.5" fill="url(#ndg)" filter="url(#gw)" /></g>
      <g><circle cx="66" cy="100" r="9" fill="#1A0446" opacity="0.55" /><circle cx="66" cy="100" r="5.5" fill="url(#ndg)" filter="url(#gw)" /></g>
      <g><circle cx="134" cy="100" r="9" fill="#1A0446" opacity="0.55" /><circle cx="134" cy="100" r="5.5" fill="url(#ndg)" filter="url(#gw)" /></g>
      <g><circle cx="70" cy="115" r="9" fill="#1A0446" opacity="0.55" /><circle cx="70" cy="115" r="5.5" fill="url(#ndg)" filter="url(#gw)" /></g>
      <g><circle cx="130" cy="115" r="9" fill="#1A0446" opacity="0.55" /><circle cx="130" cy="115" r="5.5" fill="url(#ndg)" filter="url(#gw)" /></g>
      
      {/* Letter I */}
      <g filter="url(#gw)">
        <rect x="76" y="54" width="48" height="14" rx="7" fill="url(#sym)" />
        <rect x="76" y="132" width="48" height="14" rx="7" fill="url(#sym)" />
        <rect x="93" y="61" width="14" height="78" rx="4" fill="url(#sym)" />
      </g>
    </svg>
  );
}
