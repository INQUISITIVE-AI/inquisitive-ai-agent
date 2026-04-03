interface Props { size?: number; className?: string; }

export default function InqaiLogo({ size = 32, className = '' }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      aria-label="INQAI"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <defs>
        {/* Coin body gradient */}
        <radialGradient id="coinGrad" cx="30%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#A855F7" />
          <stop offset="40%" stopColor="#7C3AED" />
          <stop offset="80%" stopColor="#4C1D95" />
          <stop offset="100%" stopColor="#1E0A4A" />
        </radialGradient>

        {/* Metallic rim gradient */}
        <linearGradient id="rimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
          <stop offset="25%" stopColor="#A78BFA" stopOpacity="0.6" />
          <stop offset="50%" stopColor="#6D28D9" stopOpacity="0.3" />
          <stop offset="75%" stopColor="#A78BFA" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.9" />
        </linearGradient>

        {/* I letter gradient */}
        <linearGradient id="letterGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="50%" stopColor="#DDD6FE" />
          <stop offset="100%" stopColor="#A78BFA" />
        </linearGradient>

        {/* Glow filter */}
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Drop shadow */}
      <circle cx="52" cy="54" r="44" fill="#000000" opacity="0.3" />

      {/* Coin body */}
      <circle cx="50" cy="50" r="46" fill="url(#coinGrad)" />

      {/* Vignette overlay */}
      <circle cx="50" cy="50" r="46" fill="url(#vignette)" opacity="0.4" />
      <radialGradient id="vignette" cx="50%" cy="50%" r="50%">
        <stop offset="60%" stopColor="#000000" stopOpacity="0" />
        <stop offset="100%" stopColor="#000000" stopOpacity="0.5" />
      </radialGradient>

      {/* Metallic rim */}
      <circle cx="50" cy="50" r="46" fill="none" stroke="url(#rimGrad)" strokeWidth="3" />

      {/* Inner ring */}
      <circle cx="50" cy="50" r="40" fill="none" stroke="#A78BFA" strokeWidth="0.5" opacity="0.5" />

      {/* Letter "I" */}
      <g filter="url(#glow)">
        {/* Vertical stem */}
        <rect x="45" y="28" width="10" height="44" rx="2" fill="url(#letterGrad)" />
        {/* Top serif */}
        <rect x="38" y="28" width="24" height="6" rx="2" fill="url(#letterGrad)" />
        {/* Bottom serif */}
        <rect x="38" y="66" width="24" height="6" rx="2" fill="url(#letterGrad)" />
      </g>

      {/* Subtle shine */}
      <ellipse cx="35" cy="30" rx="15" ry="10" fill="#FFFFFF" opacity="0.15" transform="rotate(-30 35 30)" />
    </svg>
  );
}
