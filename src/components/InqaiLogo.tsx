interface Props { size?: number; className?: string; }
export default function InqaiLogo({ size = 32, className = '' }: Props) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width={size} height={size} className={className} aria-label="INQAI" style={{display:'block',flexShrink:0}}>
      <defs>
        {/* ── COIN BODY ── */}
        <radialGradient id="iq_b" cx="33%" cy="25%" r="88%">
          <stop offset="0%"   stopColor="#6B2FD9"/>
          <stop offset="12%"  stopColor="#38178A"/>
          <stop offset="32%"  stopColor="#180948"/>
          <stop offset="58%"  stopColor="#07021C"/>
          <stop offset="100%" stopColor="#02010B"/>
        </radialGradient>
        {/* broad specular – soft bloom top-left */}
        <radialGradient id="iq_s1" cx="30%" cy="22%" r="52%">
          <stop offset="0%"   stopColor="#fff"    stopOpacity="0.38"/>
          <stop offset="28%"  stopColor="#DDD6FE"  stopOpacity="0.14"/>
          <stop offset="62%"  stopColor="#7C3AED"  stopOpacity="0.03"/>
          <stop offset="100%" stopColor="#4C1D95"  stopOpacity="0"/>
        </radialGradient>
        {/* tight hot-spot – pure white pinpoint */}
        <radialGradient id="iq_s2" cx="26%" cy="18%" r="20%">
          <stop offset="0%"   stopColor="#fff"    stopOpacity="0.82"/>
          <stop offset="38%"  stopColor="#fff"    stopOpacity="0.22"/>
          <stop offset="100%" stopColor="#fff"    stopOpacity="0"/>
        </radialGradient>
        {/* ambient counter-light bottom-right */}
        <radialGradient id="iq_a" cx="80%" cy="84%" r="36%">
          <stop offset="0%"   stopColor="#5B21B6" stopOpacity="0.20"/>
          <stop offset="100%" stopColor="#1E0A5A" stopOpacity="0"/>
        </radialGradient>
        {/* ── 8-STOP METALLIC RIM ── */}
        <linearGradient id="iq_r1" x1="12%" y1="3%" x2="88%" y2="97%">
          <stop offset="0%"   stopColor="#F5F3FF" stopOpacity="1.00"/>
          <stop offset="9%"   stopColor="#C4B5FD" stopOpacity="0.90"/>
          <stop offset="22%"  stopColor="#7C3AED" stopOpacity="0.58"/>
          <stop offset="38%"  stopColor="#1E0A5A" stopOpacity="0.18"/>
          <stop offset="54%"  stopColor="#1E0A5A" stopOpacity="0.14"/>
          <stop offset="70%"  stopColor="#6D28D9" stopOpacity="0.60"/>
          <stop offset="86%"  stopColor="#A78BFA" stopOpacity="0.90"/>
          <stop offset="100%" stopColor="#EDE9FE" stopOpacity="1.00"/>
        </linearGradient>
        {/* shadow overlay on rim */}
        <linearGradient id="iq_r2" x1="12%" y1="3%" x2="88%" y2="97%">
          <stop offset="0%"   stopColor="#fff" stopOpacity="0.08"/>
          <stop offset="50%"  stopColor="#000" stopOpacity="0.28"/>
          <stop offset="100%" stopColor="#000" stopOpacity="0.00"/>
        </linearGradient>
        {/* ── COMET ARC ── */}
        <linearGradient id="iq_c" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#8B5CF6" stopOpacity="0"/>
          <stop offset="50%"  stopColor="#C4B5FD" stopOpacity="0.35"/>
          <stop offset="80%"  stopColor="#EDE9FE" stopOpacity="0.75"/>
          <stop offset="100%" stopColor="#fff"    stopOpacity="1.00"/>
        </linearGradient>
        {/* ── SIGNAL WAVEFORM ── */}
        {/* vertical luster gradient */}
        <linearGradient id="iq_sg" x1="0" y1="60" x2="0" y2="140" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#fff"/>
          <stop offset="18%"  stopColor="#EDE9FE"/>
          <stop offset="52%"  stopColor="#A78BFA"/>
          <stop offset="100%" stopColor="#4C1D95"/>
        </linearGradient>
        {/* emboss shadow (dark, offset ↘) */}
        <linearGradient id="iq_es" x1="44" y1="102" x2="156" y2="102" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#000"    stopOpacity="0.38"/>
          <stop offset="50%"  stopColor="#04011A"  stopOpacity="0.52"/>
          <stop offset="100%" stopColor="#000"    stopOpacity="0.32"/>
        </linearGradient>
        {/* emboss highlight (bright, offset ↖) */}
        <linearGradient id="iq_eh" x1="44" y1="98" x2="156" y2="98" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#EDE9FE"  stopOpacity="0.52"/>
          <stop offset="42%"  stopColor="#fff"    stopOpacity="0.72"/>
          <stop offset="72%"  stopColor="#C4B5FD"  stopOpacity="0.42"/>
          <stop offset="100%" stopColor="#A78BFA"  stopOpacity="0.28"/>
        </linearGradient>
        {/* ── SHIMMER BAND ── */}
        <linearGradient id="iq_sh" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="#fff" stopOpacity="0"/>
          <stop offset="44%"  stopColor="#fff" stopOpacity="0"/>
          <stop offset="50%"  stopColor="#fff" stopOpacity="0.072"/>
          <stop offset="56%"  stopColor="#fff" stopOpacity="0"/>
          <stop offset="100%" stopColor="#fff" stopOpacity="0"/>
        </linearGradient>
        {/* ── FILTERS ── */}
        <filter id="iq_gw" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="4.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <filter id="iq_bl" x="-110%" y="-110%" width="320%" height="320%">
          <feGaussianBlur stdDeviation="11"/>
        </filter>
        <filter id="iq_dt" x="-140%" y="-140%" width="380%" height="380%">
          <feGaussianBlur stdDeviation="4.8"/>
        </filter>
        <clipPath id="iq_cp"><circle cx="100" cy="100" r="93"/></clipPath>
      </defs>

      <style>{`
        .iqR {transform-origin:100px 100px;animation:iqSpin 11s linear infinite}
        .iqGP{animation:iqGP 3.4s ease-in-out infinite}
        .iqSD{stroke-dasharray:258;animation:iqSD 4.2s ease-in-out infinite}
        .iqDB{animation:iqDB 4.2s ease-in-out infinite}
        .iqSW{animation:iqSW 10s ease-in-out 2s infinite}
        .iqGL{animation:iqGL 6s ease-in-out 1.2s infinite}
        @keyframes iqSpin{to{transform:rotate(360deg)}}
        @keyframes iqGP{0%,100%{opacity:.10}50%{opacity:.50}}
        @keyframes iqSD{0%{stroke-dashoffset:258;opacity:1}50%{stroke-dashoffset:-258;opacity:1}51%{opacity:0;stroke-dashoffset:258}52%{opacity:1}100%{stroke-dashoffset:258}}
        @keyframes iqDB{0%,100%{opacity:1}50%{opacity:.12}}
        @keyframes iqSW{0%{transform:translateX(-220px) skewX(-10deg);opacity:0}12%{opacity:1}88%{opacity:1}100%{transform:translateX(220px) skewX(-10deg);opacity:0}}
        @keyframes iqGL{0%,62%,100%{opacity:0;transform:scale(.1)}70%{opacity:1;transform:scale(1)}76%{opacity:.3;transform:scale(1.5)}82%{opacity:0;transform:scale(.3)}}
      `}</style>

      {/* drop shadow */}
      <circle cx="100" cy="105" r="90" fill="#10005C" opacity="0.48" filter="url(#iq_bl)"/>

      {/* coin body – 4 gradient layers */}
      <circle cx="100" cy="100" r="97" fill="url(#iq_b)"/>
      <circle cx="100" cy="100" r="97" fill="url(#iq_a)"/>
      <circle cx="100" cy="100" r="97" fill="url(#iq_s1)"/>
      <circle cx="100" cy="100" r="97" fill="url(#iq_s2)"/>

      {/* shimmer sweep */}
      <rect className="iqSW" x="-88" y="3" width="140" height="194" fill="url(#iq_sh)" clipPath="url(#iq_cp)"/>

      {/* metallic rim – two passes */}
      <circle cx="100" cy="100" r="98"   fill="none" stroke="url(#iq_r1)" strokeWidth="6"/>
      <circle cx="100" cy="100" r="98"   fill="none" stroke="url(#iq_r2)" strokeWidth="6"/>
      <circle cx="100" cy="100" r="94.5" fill="none" stroke="#000"        strokeWidth="1.8" opacity="0.88"/>

      {/* rotating comet arc */}
      <g className="iqR">
        <circle cx="100" cy="100" r="98" fill="none" stroke="url(#iq_c)" strokeWidth="4.2" strokeDasharray="92 524" strokeLinecap="round"/>
      </g>

      {/* ── SIGNAL WAVEFORM ── */}
      {/* outer bloom */}
      <path d="M44,100 L72,100 L88,60 L112,140 L128,100 L156,100"
        stroke="#2D1B69" strokeWidth="26" strokeLinecap="round" strokeLinejoin="round" fill="none"
        opacity="0.22" filter="url(#iq_bl)"/>
      {/* emboss shadow ↘ */}
      <path d="M44.8,101.5 L72.8,101.5 L88.8,61.5 L112.8,141.5 L128.8,101.5 L156.8,101.5"
        stroke="url(#iq_es)" strokeWidth="9.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.72"/>
      {/* pulse glow */}
      <path className="iqGP" d="M44,100 L72,100 L88,60 L112,140 L128,100 L156,100"
        stroke="#7C3AED" strokeWidth="15" strokeLinecap="round" strokeLinejoin="round" fill="none"
        filter="url(#iq_gw)"/>
      {/* animated draw stroke */}
      <path className="iqSD" d="M44,100 L72,100 L88,60 L112,140 L128,100 L156,100"
        stroke="url(#iq_sg)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none"
        filter="url(#iq_gw)"/>
      {/* emboss highlight ↖ */}
      <path d="M43.2,98.5 L71.2,98.5 L87.2,58.5 L111.2,138.5 L127.2,98.5 L155.2,98.5"
        stroke="url(#iq_eh)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.58"/>

      {/* ── PEAK DOT ── */}
      <circle cx="88" cy="60" r="16"  fill="#4C1D95" opacity="0.32" filter="url(#iq_bl)"/>
      <circle cx="88" cy="60" r="8"   fill="#A78BFA"  opacity="0.68" filter="url(#iq_dt)"/>
      <circle className="iqDB" cx="88" cy="60" r="2.6" fill="#fff"/>

      {/* specular catchlight glint (4-point star) */}
      <g className="iqGL" style={{transformOrigin:'68px 65px'}}>
        <path d="M68,59 L68.5,64 L74,64.5 L68.5,65 L68,70 L67.5,65 L62,64.5 L67.5,64 Z"
          fill="#fff" opacity="0.96" filter="url(#iq_dt)"/>
      </g>
    </svg>
  );
}
