interface Props { size?: number; className?: string; }
export default function InqaiLogo({ size = 32, className = '' }: Props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width={size} height={size} className={className} aria-label="INQAI" style={{display:'block',flexShrink:0}}>
      <defs>
        {/* ── BASE COIN GRADIENT ── */}
        <radialGradient id="iq_b" cx="34%" cy="26%" r="88%">
          <stop offset="0%"   stopColor="#7B35E8"/>
          <stop offset="14%"  stopColor="#3D1A8E"/>
          <stop offset="36%"  stopColor="#130640"/>
          <stop offset="65%"  stopColor="#060118"/>
          <stop offset="100%" stopColor="#01000A"/>
        </radialGradient>

        {/* ── PHYSICS-BASED 3D METALLIC LIGHTING ──
             feGaussianBlur on SourceAlpha creates a dome-shaped bump map.
             feSpecularLighting + fePointLight compute real Phong specular.
             feDiffuseLighting computes diffuse (shaded) body.
             Result: genuinely 3D coin surface, not flat gradient overlay. */}
        <filter id="iq_3d" x="-5%" y="-5%" width="110%" height="110%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="14" result="bump"/>
          <feSpecularLighting in="bump" surfaceScale="20" specularConstant="3.5"
            specularExponent="95" lightingColor="#ffffff" result="spec">
            <fePointLight x="58" y="42" z="130"/>
          </feSpecularLighting>
          <feComposite in="spec" in2="SourceAlpha" operator="in" result="specClip"/>
          <feDiffuseLighting in="bump" surfaceScale="12" diffuseConstant="1.1"
            lightingColor="#8B5CF6" result="diff">
            <fePointLight x="58" y="42" z="130"/>
          </feDiffuseLighting>
          <feComposite in="diff" in2="SourceAlpha" operator="in" result="diffClip"/>
          <feBlend in="SourceGraphic" in2="diffClip" mode="multiply" result="lit"/>
          <feBlend in="lit" in2="specClip" mode="screen"/>
        </filter>

        {/* ── METALLIC RIM (8-stop, simulates coin bevel facets) ── */}
        <linearGradient id="iq_rim" x1="10%" y1="3%" x2="90%" y2="97%">
          <stop offset="0%"   stopColor="#FFFFFF" stopOpacity="1.00"/>
          <stop offset="8%"   stopColor="#E9E2FF" stopOpacity="0.95"/>
          <stop offset="22%"  stopColor="#8B5CF6" stopOpacity="0.65"/>
          <stop offset="38%"  stopColor="#18084A" stopOpacity="0.18"/>
          <stop offset="55%"  stopColor="#0C0328" stopOpacity="0.12"/>
          <stop offset="70%"  stopColor="#5B21B6" stopOpacity="0.55"/>
          <stop offset="86%"  stopColor="#9B72FA" stopOpacity="0.90"/>
          <stop offset="100%" stopColor="#EDE9FE" stopOpacity="1.00"/>
        </linearGradient>
        <linearGradient id="iq_rim2" x1="10%" y1="3%" x2="90%" y2="97%">
          <stop offset="0%"   stopColor="#fff" stopOpacity="0.12"/>
          <stop offset="45%"  stopColor="#000" stopOpacity="0.30"/>
          <stop offset="100%" stopColor="#000" stopOpacity="0.00"/>
        </linearGradient>

        {/* ── COMET ARC ── */}
        <linearGradient id="iq_cmt" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#9B72FA" stopOpacity="0"/>
          <stop offset="45%"  stopColor="#C4B5FD" stopOpacity="0.32"/>
          <stop offset="80%"  stopColor="#EDE9FE" stopOpacity="0.78"/>
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="1.00"/>
        </linearGradient>

        {/* ── SIGNAL WAVEFORM — vertical luster (peak=white, base=deep violet) ── */}
        <linearGradient id="iq_sig" x1="0" y1="50" x2="0" y2="150" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#FFFFFF"/>
          <stop offset="16%"  stopColor="#EDE9FE"/>
          <stop offset="48%"  stopColor="#A78BFA"/>
          <stop offset="82%"  stopColor="#5B21B6"/>
          <stop offset="100%" stopColor="#2D1180"/>
        </linearGradient>
        {/* Emboss shadow layer (offset ↘, simulates engraved depth) */}
        <linearGradient id="iq_es" x1="38" y1="104" x2="162" y2="104" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#000000" stopOpacity="0.42"/>
          <stop offset="50%"  stopColor="#020110" stopOpacity="0.58"/>
          <stop offset="100%" stopColor="#000000" stopOpacity="0.36"/>
        </linearGradient>
        {/* Emboss highlight layer (offset ↖, simulates top edge catching light) */}
        <linearGradient id="iq_eh" x1="38" y1="96" x2="162" y2="96" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#EDE9FE" stopOpacity="0.58"/>
          <stop offset="35%"  stopColor="#FFFFFF" stopOpacity="0.88"/>
          <stop offset="65%"  stopColor="#DDD6FE" stopOpacity="0.52"/>
          <stop offset="100%" stopColor="#C4B5FD" stopOpacity="0.32"/>
        </linearGradient>

        {/* ── SHIMMER BAND ── */}
        <linearGradient id="iq_shm" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#fff" stopOpacity="0"/>
          <stop offset="44%"  stopColor="#fff" stopOpacity="0"/>
          <stop offset="50%"  stopColor="#fff" stopOpacity="0.08"/>
          <stop offset="56%"  stopColor="#fff" stopOpacity="0"/>
          <stop offset="100%" stopColor="#fff" stopOpacity="0"/>
        </linearGradient>

        {/* ── UTILITY FILTERS ── */}
        <filter id="iq_gw" x="-55%" y="-55%" width="210%" height="210%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="iq_bl" x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation="13"/>
        </filter>
        <filter id="iq_dt" x="-150%" y="-150%" width="400%" height="400%">
          <feGaussianBlur stdDeviation="5.5"/>
        </filter>
        <clipPath id="iq_cp"><circle cx="100" cy="100" r="93"/></clipPath>
      </defs>

      <style>{`
        .iqA {transform-origin:100px 100px;animation:iqSpin 11s linear infinite}
        .iqGP{animation:iqGP 3.5s ease-in-out infinite}
        .iqSD{stroke-dasharray:282;animation:iqSD 4.5s ease-in-out infinite}
        .iqDB{animation:iqDB 4.5s ease-in-out infinite}
        .iqSW{animation:iqSW 10s ease-in-out 2.2s infinite}
        .iqGL{animation:iqGL 6.5s ease-in-out 1.5s infinite}
        @keyframes iqSpin{to{transform:rotate(360deg)}}
        @keyframes iqGP{0%,100%{opacity:.08}50%{opacity:.52}}
        @keyframes iqSD{0%{stroke-dashoffset:282;opacity:1}50%{stroke-dashoffset:-282;opacity:1}51%{opacity:0;stroke-dashoffset:282}52%{opacity:1}100%{stroke-dashoffset:282}}
        @keyframes iqDB{0%,100%{opacity:1}50%{opacity:.10}}
        @keyframes iqSW{0%{transform:translateX(-225px) skewX(-10deg);opacity:0}12%{opacity:1}88%{opacity:1}100%{transform:translateX(225px) skewX(-10deg);opacity:0}}
        @keyframes iqGL{0%,60%,100%{opacity:0;transform:scale(.08)}68%{opacity:1;transform:scale(1)}74%{opacity:.25;transform:scale(1.6)}80%{opacity:0;transform:scale(.3)}}
      `}</style>

      {/* ── DROP SHADOW ── */}
      <circle cx="100" cy="108" r="88" fill="#0A0030" opacity="0.62" filter="url(#iq_bl)"/>

      {/* ── COIN BODY with physics-based 3D metallic lighting ── */}
      <circle cx="100" cy="100" r="96" fill="url(#iq_b)" filter="url(#iq_3d)"/>

      {/* ── SHIMMER SWEEP ── */}
      <rect className="iqSW" x="-85" y="3" width="140" height="194" fill="url(#iq_shm)" clipPath="url(#iq_cp)"/>

      {/* ── METALLIC RIM (two-pass: gradient + shadow overlay) ── */}
      <circle cx="100" cy="100" r="97.5" fill="none" stroke="url(#iq_rim)"  strokeWidth="7"/>
      <circle cx="100" cy="100" r="97.5" fill="none" stroke="url(#iq_rim2)" strokeWidth="7"/>
      <circle cx="100" cy="100" r="93"   fill="none" stroke="#000000" strokeWidth="2" opacity="0.92"/>

      {/* ── ROTATING COMET ARC ── */}
      <g className="iqA">
        <circle cx="100" cy="100" r="97.5" fill="none" stroke="url(#iq_cmt)"
          strokeWidth="4.5" strokeDasharray="100 530" strokeLinecap="round"/>
      </g>

      {/* ── SIGNAL WAVEFORM — peak y=50, trough y=150 (62% of coin diameter) ── */}
      {/* Outer bloom halo */}
      <path d="M38,100 L68,100 L88,50 L112,150 L132,100 L162,100"
        stroke="#2D1B69" strokeWidth="30" strokeLinecap="round" strokeLinejoin="round" fill="none"
        opacity="0.26" filter="url(#iq_bl)"/>
      {/* Emboss shadow ↘ (+2px offset) */}
      <path d="M38.8,102 L68.8,102 L88.8,52 L112.8,152 L132.8,102 L162.8,102"
        stroke="url(#iq_es)" strokeWidth="12" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.80"/>
      {/* Pulse glow */}
      <path className="iqGP" d="M38,100 L68,100 L88,50 L112,150 L132,100 L162,100"
        stroke="#8B5CF6" strokeWidth="20" strokeLinecap="round" strokeLinejoin="round" fill="none"
        filter="url(#iq_gw)"/>
      {/* Main animated draw stroke */}
      <path className="iqSD" d="M38,100 L68,100 L88,50 L112,150 L132,100 L162,100"
        stroke="url(#iq_sig)" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none"
        filter="url(#iq_gw)"/>
      {/* Emboss highlight ↖ (-2px offset) */}
      <path d="M37.2,98 L67.2,98 L87.2,48 L111.2,148 L131.2,98 L161.2,98"
        stroke="url(#iq_eh)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.65"/>

      {/* ── PEAK DOT ── */}
      <circle cx="88" cy="50" r="20" fill="#3B1F8C" opacity="0.38" filter="url(#iq_bl)"/>
      <circle cx="88" cy="50" r="10" fill="#B09AFD" opacity="0.75" filter="url(#iq_dt)"/>
      <circle className="iqDB" cx="88" cy="50" r="3" fill="#FFFFFF"/>

      {/* ── SPECULAR GLINT SPARKLE (4-point star at light-source catchpoint) ── */}
      <g className="iqGL" style={{transformOrigin:'65px 62px'}}>
        <path d="M65,55 L65.5,61.5 L72,62 L65.5,62.5 L65,69 L64.5,62.5 L58,62 L64.5,61.5 Z"
          fill="#FFFFFF" opacity="0.98" filter="url(#iq_dt)"/>
      </g>
    </svg>
  );
}
