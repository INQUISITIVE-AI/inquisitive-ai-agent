import React from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import InqaiLogo from './InqaiLogo';

const WalletButton = dynamic(() => import('./WalletButton'), { ssr: false });

const LINKS = [
  { l: 'Dashboard',  p: '/analytics'         },
  { l: 'INQAI Token',p: '/token'             },
  { l: 'Staking',    p: '/staking'           },
  { l: 'Reserves',   p: '/proof-of-reserves' },
  { l: 'Burns',      p: '/burns'             },
  { l: 'Documentation', p: '/help'           },
];
const BUY_PATH = '/buy';

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
      background: 'rgba(7,7,26,0.98)',
      backdropFilter: 'blur(24px)',
      WebkitBackdropFilter: 'blur(24px)',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      height: 64,
      display: 'flex',
      alignItems: 'center',
      padding: '0 28px',
      gap: 4,
      fontFamily: 'Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    }}>
      <button
        onClick={() => router.push('/')}
        style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', marginRight: 28, padding: 0, flexShrink: 0 }}
      >
        <InqaiLogo size={28} />
        <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.3px', color: '#fff', lineHeight: 1 }}>INQUISITIVE</span>
      </button>

      <div style={{ display: 'flex', gap: 1, flex: 1 }}>
        {LINKS.map(n => {
          const isActive = router.pathname === n.p || router.pathname.startsWith(n.p + '/');
          return (
            <button
              key={n.l}
              onClick={() => router.push(n.p)}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: isActive ? 600 : 400,
                background: 'transparent',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.42)',
                border: '1px solid transparent',
                transition: 'color 0.15s',
                lineHeight: 1,
                letterSpacing: '-0.1px',
              }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'rgba(255,255,255,0.42)'; }}
            >
              {n.l}
            </button>
          );
        })}
      </div>

      {right && <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8, flexShrink: 0 }}>{right}</div>}

      <button
        onClick={() => router.push(BUY_PATH)}
        style={{
          padding: '8px 18px',
          borderRadius: 8,
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 700,
          background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
          color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 2px 10px rgba(124,58,237,0.3)',
          transition: 'all 0.15s',
          marginRight: 8,
          letterSpacing: '-0.1px',
          flexShrink: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 18px rgba(124,58,237,0.5)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 10px rgba(124,58,237,0.3)'; e.currentTarget.style.transform = 'none'; }}
      >
        Acquire INQAI
      </button>

      <WalletButton />
    </nav>
  );
}
