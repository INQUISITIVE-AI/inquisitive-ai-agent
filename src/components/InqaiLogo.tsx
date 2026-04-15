import { useId } from 'react';

interface Props { size?: number; className?: string; }

export default function InqaiLogo({ size = 32, className = '' }: Props) {
  const uid = useId().replace(/:/g, '');
  const id  = (s: string) => `${uid}${s}`;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 400 400"
      width={size}
      height={size}
      className={className}
      aria-label="INQAI"
      shapeRendering="geometricPrecision"
      textRendering="geometricPrecision"
      imageRendering="optimizeQuality"
      style={{ 
        display: 'block', 
        flexShrink: 0,
        imageRendering: '-webkit-optimize-contrast',
        backfaceVisibility: 'hidden',
        transform: 'translateZ(0)'
      }}
    >
      <defs>
        {/* High-precision radial gradient for crystal ball */}
        <radialGradient id={id('cb')} cx="32%" cy="24%" r="90%" gradientUnits="objectBoundingBox">
          <stop offset="0%" stopColor="#A855F7" />
          <stop offset="6%" stopColor="#9333EA" />
          <stop offset="12%" stopColor="#7C3AED" />
          <stop offset="20%" stopColor="#5B21B6" />
          <stop offset="30%" stopColor="#4C1D95" />
          <stop offset="40%" stopColor="#2E1065" />
          <stop offset="52%" stopColor="#1E0A4A" />
          <stop offset="65%" stopColor="#0A0225" />
          <stop offset="78%" stopColor="#050118" />
          <stop offset="90%" stopColor="#02010A" />
          <stop offset="100%" stopColor="#010005" />
        </radialGradient>
        
        {/* Ultra-sharp rim gradient with high-precision stops */}
        <linearGradient id={id('rim')} x1="4%" y1="1%" x2="96%" y2="99%" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="2%" stopColor="#FAF5FF" stopOpacity="0.995" />
          <stop offset="5%" stopColor="#F5F0FF" stopOpacity="0.98" />
          <stop offset="10%" stopColor="#EDE9FE" stopOpacity="0.92" />
          <stop offset="16%" stopColor="#DDD6FE" stopOpacity="0.85" />
          <stop offset="24%" stopColor="#C4B5FD" stopOpacity="0.72" />
          <stop offset="32%" stopColor="#A78BFA" stopOpacity="0.58" />
          <stop offset="40%" stopColor="#8B5CF6" stopOpacity="0.42" />
          <stop offset="48%" stopColor="#6D28D9" stopOpacity="0.28" />
          <stop offset="56%" stopColor="#4C1D95" stopOpacity="0.18" />
          <stop offset="64%" stopColor="#2E1065" stopOpacity="0.12" />
          <stop offset="72%" stopColor="#5B21B6" stopOpacity="0.38" />
          <stop offset="80%" stopColor="#7C3AED" stopOpacity="0.62" />
          <stop offset="88%" stopColor="#A78BFA" stopOpacity="0.88" />
          <stop offset="95%" stopColor="#DDD6FE" stopOpacity="0.975" />
          <stop offset="98%" stopColor="#F5F3FF" stopOpacity="0.995" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="1" />
        </linearGradient>
        
        {/* Symbol gradient - sharp vertical */}
        <linearGradient id={id('sym')} x1="200" y1="108" x2="200" y2="292" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="8%" stopColor="#FAF5FF" />
          <stop offset="18%" stopColor="#F5F0FF" />
          <stop offset="32%" stopColor="#E9E4FF" />
          <stop offset="50%" stopColor="#C4B5FD" />
          <stop offset="68%" stopColor="#A78BFA" />
          <stop offset="82%" stopColor="#7C3AED" />
          <stop offset="100%" stopColor="#5B21B6" />
        </linearGradient>
        
        {/* Node dot gradient */}
        <radialGradient id={id('ndg')} cx="40%" cy="35%" r="60%" gradientUnits="objectBoundingBox">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
          <stop offset="25%" stopColor="#F5F0FF" stopOpacity="0.98" />
          <stop offset="55%" stopColor="#DDD6FE" stopOpacity="0.92" />
          <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.65" />
        </radialGradient>
        
        {/* High-quality glow filter */}
        <filter id={id('gw')} x="-60%" y="-60%" width="220%" height="220%" colorInterpolationFilters="sRGB">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur1" />
          <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur2" />
          <feMerge result="merged">
            <feMergeNode in="blur2" />
            <feMergeNode in="blur1" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        
        {/* Shadow blur */}
        <filter id={id('bl')} x="-100%" y="-100%" width="300%" height="300%" colorInterpolationFilters="sRGB">
          <feGaussianBlur stdDeviation="18" />
        </filter>
        
        {/* Sharp symbol filter */}
        <filter id={id('sharp')} x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
          <feComponentTransfer>
            <feFuncA type="linear" slope="1.2" intercept="0" />
          </feComponentTransfer>
        </filter>
      </defs>

      {/* High-precision shadow */}
      <ellipse cx="200" cy="218" rx="172" ry="168" fill="#06001E" opacity="0.68" filter={`url(#${id('bl')})`} />
      
      {/* Main crystal ball body */}
      <circle cx="200" cy="200" r="192" fill={`url(#${id('cb')})`} shapeRendering="geometricPrecision" />
      
      {/* Ultra-sharp rim */}
      <circle 
        cx="200" 
        cy="200" 
        r="195" 
        fill="none" 
        stroke={`url(#${id('rim')})`} 
        strokeWidth="10"
        vectorEffect="non-scaling-stroke"
        shapeRendering="geometricPrecision"
      />
      
      {/* Inner dark rim for depth */}
      <circle 
        cx="200" 
        cy="200" 
        r="186.4" 
        fill="none" 
        stroke="#000000" 
        strokeWidth="2.5" 
        opacity="0.88"
        vectorEffect="non-scaling-stroke"
        shapeRendering="geometricPrecision"
      />

      {/* Connection lines - subtle network */}
      <g opacity="0.18" filter={`url(#${id('bl')})`}>
        <line x1="200" y1="136" x2="140" y2="170" stroke="#8B5CF6" strokeWidth="5" strokeLinecap="round" />
        <line x1="200" y1="136" x2="260" y2="170" stroke="#8B5CF6" strokeWidth="5" strokeLinecap="round" />
        <line x1="200" y1="200" x2="132" y2="200" stroke="#8B5CF6" strokeWidth="5" strokeLinecap="round" />
        <line x1="200" y1="200" x2="268" y2="200" stroke="#8B5CF6" strokeWidth="5" strokeLinecap="round" />
        <line x1="200" y1="264" x2="140" y2="230" stroke="#8B5CF6" strokeWidth="5" strokeLinecap="round" />
        <line x1="200" y1="264" x2="260" y2="230" stroke="#8B5CF6" strokeWidth="5" strokeLinecap="round" />
      </g>

      {/* Node dots - 6 surrounding nodes */}
      <g>
        <circle cx="140" cy="170" r="18" fill="#1A0446" opacity="0.5" />
        <circle cx="140" cy="170" r="11" fill={`url(#${id('ndg')})`} filter={`url(#${id('gw')})`} />
      </g>
      <g>
        <circle cx="260" cy="170" r="18" fill="#1A0446" opacity="0.5" />
        <circle cx="260" cy="170" r="11" fill={`url(#${id('ndg')})`} filter={`url(#${id('gw')})`} />
      </g>
      <g>
        <circle cx="132" cy="200" r="18" fill="#1A0446" opacity="0.5" />
        <circle cx="132" cy="200" r="11" fill={`url(#${id('ndg')})`} filter={`url(#${id('gw')})`} />
      </g>
      <g>
        <circle cx="268" cy="200" r="18" fill="#1A0446" opacity="0.5" />
        <circle cx="268" cy="200" r="11" fill={`url(#${id('ndg')})`} filter={`url(#${id('gw')})`} />
      </g>
      <g>
        <circle cx="140" cy="230" r="18" fill="#1A0446" opacity="0.5" />
        <circle cx="140" cy="230" r="11" fill={`url(#${id('ndg')})`} filter={`url(#${id('gw')})`} />
      </g>
      <g>
        <circle cx="260" cy="230" r="18" fill="#1A0446" opacity="0.5" />
        <circle cx="260" cy="230" r="11" fill={`url(#${id('ndg')})`} filter={`url(#${id('gw')})`} />
      </g>

      {/* Central I symbol - sharp high-res render */}
      <g filter={`url(#${id('gw')})`} shapeRendering="geometricPrecision">
        <rect x="152" y="108" width="96" height="28" rx="14" fill={`url(#${id('sym')})`} />
        <rect x="152" y="264" width="96" height="28" rx="14" fill={`url(#${id('sym')})`} />
        <rect x="186" y="122" width="28" height="156" rx="8" fill={`url(#${id('sym')})`} />
      </g>
    </svg>
  );
}
