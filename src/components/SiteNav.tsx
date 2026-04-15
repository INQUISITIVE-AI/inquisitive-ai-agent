import React from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import InqaiLogo from './InqaiLogo';

const WalletButton = dynamic(() => import('./WalletButton'), { ssr: false });

// 4 nav items max — clean, credible, not a token sale page
const LINKS = [
  { l: 'Dashboard',     p: '/analytics'         },
  { l: 'Docs',          p: '/help'              },
  { l: 'Reserves',      p: '/proof-of-reserves' },
  { l: 'Burns',         p: '/burns'             },
];

interface SiteNavProps {
  position?: 'sticky' | 'fixed';
  right?: React.ReactNode;
}

export default function SiteNav({ position = 'sticky', right }: SiteNavProps) {
  const router = useRouter();
  return (
    <nav style={{
      position,
      top: 0,
      left:  position === 'fixed' ? 0 : undefined,
      right: position === 'fixed' ? 0 : undefined,
      zIndex: 100,
      background: 'rgba(10,10,11,0.95)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      height: 60,
      display: 'flex',
      alignItems: 'center',
      padding: '0 28px',
      gap: 4,
      fontFamily: 'Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    }}>
      {/* Logo */}
      <button
        onClick={() => router.push('/')}
        style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', marginRight: 32, padding: 0, flexShrink: 0 }}
      >
        <InqaiLogo size={26} />
        <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: '-0.3px', color: '#f4f4f5', lineHeight: 1 }}>INQUISITIVE</span>
      </button>

      {/* Nav links */}
      <div style={{ display: 'flex', gap: 2, flex: 1 }}>
        {LINKS.map(n => {
          const isActive = router.pathname === n.p || router.pathname.startsWith(n.p + '/');
          return (
            <button
              key={n.l}
              onClick={() => router.push(n.p)}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: isActive ? 500 : 400,
                background: 'transparent',
                color: isActive ? '#f4f4f5' : '#71717a',
                border: 'none',
                transition: 'color 0.15s',
                lineHeight: 1,
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = '#a1a1aa'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = '#71717a'; }}
            >
              {n.l}
            </button>
          );
        })}
      </div>

      {right && <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8, flexShrink: 0 }}>{right}</div>}

      {/* Ghost CTA — "Launch App" not "Buy Token" */}
      <button
        onClick={() => router.push('/analytics')}
        style={{
          padding: '7px 16px',
          borderRadius: 8,
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 500,
          background: 'transparent',
          color: '#f4f4f5',
          border: '1px solid rgba(255,255,255,0.12)',
          transition: 'border-color 0.2s',
          marginRight: 8,
          flexShrink: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; }}
      >
        Launch App
      </button>

      <WalletButton />
    </nav>
  );
}
