import { useEffect } from 'react';
import { useAppKit } from '@reown/appkit/react';
import { ApiController } from '@reown/appkit-controllers';
import { useAccount, useDisconnect } from 'wagmi';
import { Wallet } from 'lucide-react';

interface WalletButtonProps {
  label?: string;
}

export default function WalletButton({ label = 'Connect Wallet' }: WalletButtonProps) {
  const { open } = useAppKit();
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  useEffect(() => {
    ApiController.prefetch().then(() => {
      (ApiController.state as any).recommended = [];
      (ApiController.state as any).featured    = [];
    });
  }, []);

  if (isConnected && address) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '6px 14px', borderRadius: 10,
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: '#e5e7eb', fontSize: 13, fontWeight: 600,
        }}>
          <span style={{
            width: 7, height: 7, borderRadius: '50%',
            background: '#10b981', display: 'inline-block',
            boxShadow: '0 0 8px #10b981', flexShrink: 0,
          }} />
          {address.slice(0, 6)}...{address.slice(-4)}
        </div>
        <button
          onClick={() => disconnect()}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 10, color: 'rgba(255,255,255,0.3)', padding: '1px 6px',
            borderRadius: 6, transition: 'color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.3)')}
        >
          disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => open()}
      style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '7px 18px', borderRadius: 10,
        cursor: 'pointer',
        background: 'linear-gradient(135deg,#7c3aed,#4f46e5)',
        border: '1px solid rgba(255,255,255,0.1)',
        color: '#fff', fontSize: 13, fontWeight: 700,
        boxShadow: '0 2px 12px rgba(124,58,237,0.35)',
        transition: 'all 0.15s',
      }}
    >
      <Wallet size={14} strokeWidth={2.5} />
      {label}
    </button>
  );
}
