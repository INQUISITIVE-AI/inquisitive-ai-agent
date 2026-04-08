import React from 'react';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import InqaiLogo from './InqaiLogo';

const WalletButton = dynamic(() => import('./WalletButton'), { ssr: false });

const LINKS = [
  { l: 'Portfolio', p: '/analytics'         },
  { l: 'Staking',   p: '/staking'           },
  { l: 'Referral',  p: '/referral'          },
  { l: 'Reserves',  p: '/proof-of-reserves' },
  { l: 'Burns',     p: '/burns'             },
  { l: 'Docs',      p: '/help'              },
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
      background: 'rgba(7,7,26,0.97)',
      backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      height: 60,
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      gap: 8,
    }}>
      <button
        onClick={() => router.push('/')}
        style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'none', border: 'none', cursor: 'pointer', marginRight: 20, padding: 0, flexShrink: 0 }}
      >
        <InqaiLogo size={30} />
        <span style={{ fontWeight: 900, fontSize: 17, letterSpacing: '-0.5px', color: '#fff', lineHeight: 1 }}>INQUISITIVE</span>
      </button>

      <div style={{ display: 'flex', gap: 2, flex: 1 }}>
        {LINKS.map(n => (
          <button
            key={n.l}
            onClick={() => router.push(n.p)}
            style={{
              padding: '6px 13px',
              borderRadius: 7,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: router.pathname === n.p ? 700 : 500,
              background: router.pathname === n.p ? 'linear-gradient(135deg,#7c3aed,#4f46e5)' : 'transparent',
              color: router.pathname === n.p ? '#fff' : 'rgba(255,255,255,0.45)',
              border: router.pathname === n.p ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
              transition: 'all 0.15s',
              lineHeight: 1,
            }}
          >
            {n.l}
          </button>
        ))}
      </div>

      {right && <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 8, flexShrink: 0 }}>{right}</div>}

      <WalletButton />
    </nav>
  );
}
