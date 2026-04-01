interface Props { size?: number; className?: string; }
export default function InqaiLogo({ size = 32, className = '' }: Props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width={size} height={size} className={className} aria-label="INQAI" style={{display:'block',flexShrink:0}}>
      <defs>
        {/* ── COIN BODY — deep cosmic purple ── */}
        <radialGradient id="cb" cx="32%" cy="24%" r="90%">
          <stop offset="0%"   stopColor="#A855F7"/>
          <stop offset="8%"   stopColor="#7C3AED"/>
          <stop offset="22%"  stopColor="#4C1D95"/>
          <stop offset="40%"  stopColor="#1E0A4A"/>
          <stop offset="60%"  stopColor="#0A0225"/>
          <stop offset="80%"  stopColor="#050118"/>
          <stop offset="100%" stopColor="#01000A"/>
        </radialGradient>

        {/* ── BROAD 3D DOME — primary specular ellipse ── */}
        <radialGradient id="cs1" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#FFFFFF" stopOpacity="1.00"/>
          <stop offset="28%"  stopColor="#EDE9FE" stopOpacity="0.58"/>
          <stop offset="62%"  stopColor="#8B5CF6" stopOpacity="0.12"/>
          <stop offset="100%" stopColor="#6D28D9" stopOpacity="0.00"/>
        </radialGradient>

        {/* ── MID SPECULAR — secondary dome ── */}
        <radialGradient id="cs2" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#FFFFFF" stopOpacity="1.00"/>
          <stop offset="42%"  stopColor="#F5F0FF" stopOpacity="0.72"/>
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.00"/>
        </radialGradient>

        {/* ── TIGHT HOTSPOT — pinpoint specular ── */}
        <radialGradient id="cs3" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#FFFFFF" stopOpacity="1.00"/>
          <stop offset="38%"  stopColor="#FFFFFF" stopOpacity="0.90"/>
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.00"/>
        </radialGradient>

        {/* ── VIGNETTE — rim depth darkening ── */}
        <radialGradient id="cv" cx="50%" cy="50%" r="50%">
          <stop offset="52%"  stopColor="#000000" stopOpacity="0.00"/>
          <stop offset="78%"  stopColor="#000000" stopOpacity="0.30"/>
          <stop offset="92%"  stopColor="#000000" stopOpacity="0.55"/>
          <stop offset="100%" stopColor="#000000" stopOpacity="0.70"/>
        </radialGradient>

        {/* ── BOTTOM AMBIENT ── */}
        <radialGradient id="ca" cx="52%" cy="70%" r="48%">
          <stop offset="0%"   stopColor="#7C3AED" stopOpacity="0.32"/>
          <stop offset="55%"  stopColor="#4C1D95" stopOpacity="0.12"/>
          <stop offset="100%" stopColor="#1E0A4A" stopOpacity="0.00"/>
        </radialGradient>

        {/* ── INNER DETAIL RING ── */}
        <linearGradient id="cir" x1="5%" y1="3%" x2="95%" y2="97%">
          <stop offset="0%"   stopColor="#DDD6FE" stopOpacity="0.52"/>
          <stop offset="42%"  stopColor="#4C1D95" stopOpacity="0.06"/>
          <stop offset="100%" stopColor="#A78BFA" stopOpacity="0.48"/>
        </linearGradient>

        {/* ── METALLIC RIM — 12-stop precision bevel ── */}
        <linearGradient id="cr" x1="6%" y1="2%" x2="94%" y2="98%">
          <stop offset="0%"   stopColor="#FFFFFF" stopOpacity="1.00"/>
          <stop offset="4%"   stopColor="#F5F0FF" stopOpacity="0.98"/>
          <stop offset="10%"  stopColor="#DDD6FE" stopOpacity="0.88"/>
          <stop offset="20%"  stopColor="#A78BFA" stopOpacity="0.65"/>
          <stop offset="30%"  stopColor="#6D28D9" stopOpacity="0.35"/>
          <stop offset="42%"  stopColor="#110330" stopOpacity="0.10"/>
          <stop offset="52%"  stopColor="#07011A" stopOpacity="0.06"/>
          <stop offset="64%"  stopColor="#3B0D8A" stopOpacity="0.28"/>
          <stop offset="76%"  stopColor="#5B21B6" stopOpacity="0.55"/>
          <stop offset="86%"  stopColor="#A78BFA" stopOpacity="0.85"/>
          <stop offset="95%"  stopColor="#DDD6FE" stopOpacity="0.97"/>
          <stop offset="100%" stopColor="#F5F3FF" stopOpacity="1.00"/>
        </linearGradient>
        <linearGradient id="cr2" x1="10%" y1="3%" x2="90%" y2="97%">
          <stop offset="0%"   stopColor="#fff"    stopOpacity="0.12"/>
          <stop offset="48%"  stopColor="#000"    stopOpacity="0.30"/>
          <stop offset="100%" stopColor="#000"    stopOpacity="0.00"/>
        </linearGradient>

        {/* ── SHIMMER SWEEP ── */}
        <linearGradient id="csh" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#fff" stopOpacity="0"/>
          <stop offset="44%"  stopColor="#fff" stopOpacity="0"/>
          <stop offset="50%"  stopColor="#fff" stopOpacity="0.09"/>
          <stop offset="56%"  stopColor="#fff" stopOpacity="0"/>
          <stop offset="100%" stopColor="#fff" stopOpacity="0"/>
        </linearGradient>

        {/* ── NEURAL-I SYMBOL GRADIENTS ── */}
        <linearGradient id="nig" x1="0" y1="54" x2="0" y2="146" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#FFFFFF"/>
          <stop offset="22%"  stopColor="#F5F0FF"/>
          <stop offset="50%"  stopColor="#C4B5FD"/>
          <stop offset="80%"  stopColor="#7C3AED"/>
          <stop offset="100%" stopColor="#4C1D95"/>
        </linearGradient>

        {/* ── NODE FILL ── */}
        <radialGradient id="ndg" cx="38%" cy="32%" r="62%">
          <stop offset="0%"   stopColor="#FFFFFF" stopOpacity="1"/>
          <stop offset="50%"  stopColor="#DDD6FE" stopOpacity="0.95"/>
          <stop offset="100%" stopColor="#7C3AED" stopOpacity="0.55"/>
        </radialGradient>

        {/* ── COMET ARC ── */}
        <linearGradient id="cca" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#7C3AED" stopOpacity="0.00"/>
          <stop offset="55%"  stopColor="#A78BFA" stopOpacity="0.28"/>
          <stop offset="82%"  stopColor="#DDD6FE" stopOpacity="0.72"/>
          <stop offset="100%" stopColor="#FFFFFF"  stopOpacity="1.00"/>
        </linearGradient>

        {/* ── FILTERS ── */}
        <filter id="gw" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="3.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="bl" x="-110%" y="-110%" width="320%" height="320%">
          <feGaussianBlur stdDeviation="13"/>
        </filter>
        <filter id="dt" x="-130%" y="-130%" width="360%" height="360%">
          <feGaussianBlur stdDeviation="5.5"/>
        </filter>
        <filter id="sb" x="-70%" y="-70%" width="240%" height="240%">
          <feGaussianBlur stdDeviation="7"/>
        </filter>
        <clipPath id="cc"><circle cx="100" cy="100" r="95.5"/></clipPath>
      </defs>

      <style>{`
        .nA{transform-origin:100px 100px;animation:nSpin 18s linear infinite}
        .nB{animation:nPulse 3.4s ease-in-out infinite}
        .nC{animation:nGlow 3.4s ease-in-out infinite}
        .nD{animation:nSW 11s ease-in-out 1.8s infinite}
        .nE{animation:nGL 7s ease-in-out 2s infinite}
        .nF{animation:nFade 2.8s ease-in-out infinite}
        @keyframes nSpin {to{transform:rotate(360deg)}}
        @keyframes nPulse{0%,100%{opacity:.55;transform:scale(.92)}50%{opacity:1;transform:scale(1.08)}}
        @keyframes nGlow {0%,100%{opacity:.40}50%{opacity:.88}}
        @keyframes nSW   {0%{transform:translateX(-240px) skewX(-10deg);opacity:0}10%{opacity:1}90%{opacity:1}100%{transform:translateX(240px) skewX(-10deg);opacity:0}}
        @keyframes nGL   {0%,65%,100%{opacity:0;transform:scale(.06)}72%{opacity:1;transform:scale(1)}78%{opacity:.18;transform:scale(1.8)}84%{opacity:0;transform:scale(.25)}}
        @keyframes nFade {0%,100%{opacity:.35}50%{opacity:.80}}
      `}</style>

      {/* ── DROP SHADOW ── */}
      <circle cx="100" cy="108" r="86" fill="#06001E" opacity="0.72" filter="url(#bl)"/>

      {/* ── COIN BODY ── */}
      <circle cx="100" cy="100" r="96" fill="url(#cb)"/>

      {/* ── BROAD SPECULAR DOME ── */}
      <ellipse cx="68" cy="60" rx="80" ry="62"
        transform="rotate(-22 68 60)"
        fill="url(#cs1)" clipPath="url(#cc)" opacity="0.40"/>

      {/* ── MID SPECULAR ── */}
      <ellipse cx="60" cy="52" rx="46" ry="34"
        transform="rotate(-22 60 52)"
        fill="url(#cs2)" clipPath="url(#cc)" opacity="0.55"/>

      {/* ── TIGHT HOTSPOT ── */}
      <ellipse cx="55" cy="47" rx="20" ry="15"
        transform="rotate(-22 55 47)"
        fill="url(#cs3)" clipPath="url(#cc)" opacity="0.92"/>

      {/* ── VIGNETTE ── */}
      <circle cx="100" cy="100" r="96" fill="url(#cv)"/>

      {/* ── BOTTOM AMBIENT ── */}
      <ellipse cx="128" cy="145" rx="62" ry="46" fill="url(#ca)" clipPath="url(#cc)"/>

      {/* ── INNER DETAIL RING ── */}
      <circle cx="100" cy="100" r="82" fill="none" stroke="url(#cir)" strokeWidth="0.75" opacity="0.65"/>

      {/* ── SHIMMER SWEEP ── */}
      <rect className="nD" x="-90" y="3" width="148" height="194" fill="url(#csh)" clipPath="url(#cc)"/>

      {/* ── ROTATING COMET ARC ── */}
      <g className="nA">
        <circle cx="100" cy="100" r="97" fill="none" stroke="url(#cca)"
          strokeWidth="4.2" strokeDasharray="112 524" strokeLinecap="round"/>
      </g>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ── NEURAL-I SYMBOL — the INQAI brand mark ── */}
      {/* ═══════════════════════════════════════════════════════════════ */}

      {/* --- Connection lines (neural axons) --- */}
      {/* Bloom layer */}
      <g opacity="0.22" filter="url(#bl)">
        <line x1="100" y1="68"  x2="70"  y2="85"  stroke="#8B5CF6" strokeWidth="3.5"/>
        <line x1="100" y1="68"  x2="130" y2="85"  stroke="#8B5CF6" strokeWidth="3.5"/>
        <line x1="100" y1="100" x2="66"  y2="100" stroke="#8B5CF6" strokeWidth="3.5"/>
        <line x1="100" y1="100" x2="134" y2="100" stroke="#8B5CF6" strokeWidth="3.5"/>
        <line x1="100" y1="132" x2="70"  y2="115" stroke="#8B5CF6" strokeWidth="3.5"/>
        <line x1="100" y1="132" x2="130" y2="115" stroke="#8B5CF6" strokeWidth="3.5"/>
      </g>
      {/* Fine lines */}
      <g className="nF" filter="url(#gw)" opacity="0.72">
        <line x1="100" y1="68"  x2="70"  y2="85"  stroke="#C4B5FD" strokeWidth="1.0" strokeLinecap="round"/>
        <line x1="100" y1="68"  x2="130" y2="85"  stroke="#C4B5FD" strokeWidth="1.0" strokeLinecap="round"/>
        <line x1="100" y1="100" x2="66"  y2="100" stroke="#C4B5FD" strokeWidth="1.0" strokeLinecap="round"/>
        <line x1="100" y1="100" x2="134" y2="100" stroke="#C4B5FD" strokeWidth="1.0" strokeLinecap="round"/>
        <line x1="100" y1="132" x2="70"  y2="115" stroke="#C4B5FD" strokeWidth="1.0" strokeLinecap="round"/>
        <line x1="100" y1="132" x2="130" y2="115" stroke="#C4B5FD" strokeWidth="1.0" strokeLinecap="round"/>
      </g>

      {/* --- Outer neural nodes — perfectly symmetric --- */}
      {[{cx:70,cy:85,d:'0s'},{cx:130,cy:85,d:'0.45s'},{cx:66,cy:100,d:'0.9s'},{cx:134,cy:100,d:'1.35s'},{cx:70,cy:115,d:'1.8s'},{cx:130,cy:115,d:'2.25s'}].map((n,i) => (
        <g key={i}>
          <circle cx={n.cx} cy={n.cy} r="9" fill="#1A0446" opacity="0.55"/>
          <circle cx={n.cx} cy={n.cy} r="5.5" fill="url(#ndg)"
            filter="url(#gw)"
            style={{animation:`nPulse 3.4s ease-in-out ${n.d} infinite`,transformOrigin:`${n.cx}px ${n.cy}px`}}/>
        </g>
      ))}

      {/* --- CENTRAL "I" LETTERFORM --- */}
      {/* Outer glow (bloom) */}
      <g filter="url(#sb)" opacity="0.32">
        <rect x="93" y="54" width="14" height="92" rx="7"  fill="#A78BFA"/>
        <rect x="76" y="54" width="48" height="14" rx="7"  fill="#A78BFA"/>
        <rect x="76" y="132" width="48" height="14" rx="7" fill="#A78BFA"/>
      </g>
      {/* Emboss shadow (bottom-right shift) */}
      <g opacity="0.45">
        <rect x="94.5" y="55.5" width="14" height="92" rx="7"  fill="#2D0D72"/>
        <rect x="77.5" y="55.5" width="48" height="14" rx="7"  fill="#2D0D72"/>
        <rect x="77.5" y="133.5" width="48" height="14" rx="7" fill="#2D0D72"/>
      </g>
      {/* Main I-bar — upper crossbar */}
      <rect x="76" y="54" width="48" height="14" rx="7" fill="url(#nig)" filter="url(#gw)"/>
      {/* Main I-bar — lower crossbar */}
      <rect x="76" y="132" width="48" height="14" rx="7" fill="url(#nig)" filter="url(#gw)" opacity="0.88"/>
      {/* Main I-bar — vertical stem */}
      <rect x="93" y="61" width="14" height="78" rx="4" fill="url(#nig)" filter="url(#gw)"/>

      {/* --- CENTER NODE — the I junction / AI core --- */}
      <circle cx="100" cy="100" r="14"  fill="#0E0338" opacity="0.65"/>
      <circle cx="100" cy="100" r="13"  fill="none" stroke="#6D28D9" strokeWidth="0.8" opacity="0.40"/>
      <circle cx="100" cy="100" r="11"  fill="#12044A" opacity="0.72"/>
      <circle cx="100" cy="100" r="10"  fill="none" stroke="#7C3AED" strokeWidth="1.2" opacity="0.60"/>
      <circle cx="100" cy="100" r="7"   fill="url(#ndg)" filter="url(#gw)"
        className="nB" style={{transformOrigin:'100px 100px'}}/>

      {/* ═══════════════════════════════════════════════════════════════ */}

      {/* ── METALLIC RIM (three-pass) ── */}
      <circle cx="100" cy="100" r="97.5" fill="none" stroke="url(#cr)"  strokeWidth="7.5"/>
      <circle cx="100" cy="100" r="97.5" fill="none" stroke="url(#cr2)" strokeWidth="7.5"/>
      <circle cx="100" cy="100" r="93.2" fill="none" stroke="#000" strokeWidth="2.0" opacity="0.92"/>
      <circle cx="100" cy="100" r="91.2" fill="none" stroke="rgba(0,0,0,0.28)" strokeWidth="1.0"/>

      {/* ── SPECULAR GLINT — 4-point star, upper-left ── */}
      <g className="nE" style={{transformOrigin:'62px 61px'}}>
        <path d="M62,54 L62.8,61 L70,61.5 L62.8,62 L62,69 L61.2,62 L54,61.5 L61.2,61 Z"
          fill="#FFFFFF" opacity="0.97" filter="url(#dt)"/>
      </g>
    </svg>
  );
}
