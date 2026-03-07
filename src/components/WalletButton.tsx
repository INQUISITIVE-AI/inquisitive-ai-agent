import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Wallet } from 'lucide-react';

interface WalletButtonProps {
  label?: string;
}

export default function WalletButton({ label = 'Connect Wallet' }: WalletButtonProps) {
  const { address, isConnected, isConnecting } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <button
        onClick={() => disconnect()}
        title="Disconnect"
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '6px 14px', borderRadius: 10, cursor: 'pointer',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: '#e5e7eb', fontSize: 13, fontWeight: 600,
          transition: 'all 0.15s',
        }}
      >
        <span style={{
          width: 7, height: 7, borderRadius: '50%',
          background: '#10b981', display: 'inline-block',
          boxShadow: '0 0 8px #10b981', flexShrink: 0,
        }} />
        {address.slice(0, 6)}...{address.slice(-4)}
      </button>
    );
  }

  const loading = isPending || isConnecting;

  return (
    <button
      onClick={() => {
        const wc = connectors[0];
        if (wc) connect({ connector: wc });
      }}
      disabled={loading}
      style={{
        display: 'flex', alignItems: 'center', gap: 7,
        padding: '7px 18px', borderRadius: 10,
        cursor: loading ? 'wait' : 'pointer',
        background: loading ? 'rgba(124,58,237,0.4)' : 'linear-gradient(135deg,#7c3aed,#4f46e5)',
        border: '1px solid rgba(255,255,255,0.1)',
        color: '#fff', fontSize: 13, fontWeight: 700,
        boxShadow: loading ? 'none' : '0 2px 12px rgba(124,58,237,0.35)',
        opacity: loading ? 0.7 : 1,
        transition: 'all 0.15s',
      }}
    >
      <Wallet size={14} strokeWidth={2.5} />
      {loading ? 'Connecting…' : label}
    </button>
  );
}
