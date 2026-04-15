import { useRouter } from 'next/router';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';

interface NavProps {
  activePage?: 'home' | 'buy' | 'analytics' | 'dashboard' | 'token' | 'help';
}

export default function Nav({ activePage }: NavProps) {
  const router = useRouter();
  const { address, isConnected } = useAccount();

  const links = [
    { label: 'Buy Token',  path: '/buy',       id: 'buy',       accent: true },
    { label: 'Analytics',  path: '/analytics', id: 'analytics', accent: false },
    { label: 'AI Terminal',path: '/dashboard', id: 'dashboard', accent: false },
    { label: 'Docs',       path: '/help',      id: 'help',      accent: false },
  ];

  return (
    <nav style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'rgba(7,7,26,0.92)', backdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.05)',
      height: 60, display: 'flex', alignItems: 'center', padding: '0 24px',
    }}>
      {/* Logo */}
      <button onClick={() => router.push('/')} style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'none', border: 'none', cursor: 'pointer', marginRight: 32,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <div className="anim-name-pulse" style={{ fontWeight: 900, fontSize: 18, letterSpacing: '-0.5px', color: '#fff', lineHeight: 1 }}>INQUISITIVE</div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: '2px', textTransform: 'uppercase', marginTop: 3 }}>INQAI</div>
        </div>
      </button>

      {/* Nav links */}
      <div style={{ display: 'flex', gap: 4, flex: 1 }}>
        {links.map(l => (
          l.accent ? (
            <button key={l.id} onClick={() => router.push(l.path)} style={{
              padding: '7px 18px', borderRadius: 9,
              background: '#3b82f6',
              color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              border: '1px solid rgba(255,255,255,0.1)',
              boxShadow: activePage === l.id ? '0 4px 20px rgba(59,130,246,0.5)' : '0 2px 10px rgba(59,130,246,0.3)',
              transition: 'all 0.2s',
            }}>
              {l.label}
            </button>
          ) : (
            <button key={l.id} onClick={() => router.push(l.path)} style={{
              padding: '7px 14px', borderRadius: 8,
              background: activePage === l.id ? 'rgba(59,130,246,0.15)' : 'transparent',
              border: `1px solid ${activePage === l.id ? 'rgba(59,130,246,0.3)' : 'transparent'}`,
              color: activePage === l.id ? '#93c5fd' : 'rgba(255,255,255,0.5)',
              fontSize: 13, fontWeight: activePage === l.id ? 600 : 500,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
              onMouseEnter={e => { if (activePage !== l.id) { e.currentTarget.style.color = '#fff'; } }}
              onMouseLeave={e => { if (activePage !== l.id) { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; } }}>
              {l.label}
            </button>
          )
        ))}
      </div>

      {/* Wallet */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {isConnected && address && (
          <div style={{
            fontSize: 11, color: 'rgba(16,185,129,0.8)',
            background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: 100, padding: '3px 10px',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            {address.slice(0, 6)}...{address.slice(-4)}
          </div>
        )}
        <ConnectButton
          accountStatus="avatar"
          chainStatus="icon"
          showBalance={false}
          label="Connect Wallet"
        />
      </div>
    </nav>
  );
}
