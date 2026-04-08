import { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { useAccount, useBalance, useReadContract, useWriteContract } from 'wagmi';
import { mainnet } from 'wagmi/chains';
import { formatEther } from 'viem';
import { Shield, Wallet, ArrowDown, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';

import SiteNav from '../src/components/SiteNav';

const OpenWalletButton = dynamic(() => import('../src/components/OpenWalletButton'), { ssr: false, loading: () => null });

const VAULT_ADDR  = (process.env.NEXT_PUBLIC_VAULT_ADDRESS || '0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb') as `0x${string}`;
const TEAM_WALLET = '0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746' as `0x${string}`;

const VAULT_ABI = [
  { name: 'owner',       type: 'function', stateMutability: 'view',       inputs: [], outputs: [{ name: '', type: 'address' }] },
  { name: 'collectFees', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'token', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [] },
] as const;

export default function WithdrawPage() {
  const router = useRouter();
  const { address, isConnected, chain } = useAccount();
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  const [error,  setError]  = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const { data: vaultBalData, refetch: refetchBal } = useBalance({
    address: VAULT_ADDR,
    chainId: mainnet.id,
  });

  const { data: vaultOwner } = useReadContract({
    address: VAULT_ADDR,
    abi:     VAULT_ABI,
    functionName: 'owner',
    chainId: mainnet.id,
  });

  const { writeContractAsync } = useWriteContract();

  const vaultEth   = vaultBalData ? parseFloat(formatEther(vaultBalData.value)) : 0;
  const isOwner    = address && vaultOwner && address.toLowerCase() === (vaultOwner as string).toLowerCase();
  const wrongChain = isConnected && chain?.id !== mainnet.id;

  const withdraw = async () => {
    if (!vaultBalData || vaultBalData.value === 0n) return;
    setError(null);
    setSending(true);
    try {
      const hash = await writeContractAsync({
        address:      VAULT_ADDR,
        abi:          VAULT_ABI,
        functionName: 'collectFees',
        args:         ['0x0000000000000000000000000000000000000000', vaultBalData.value],
        chainId:      mainnet.id,
      });
      setTxHash(hash);
      setTimeout(() => refetchBal(), 8000);
    } catch (e: any) {
      setError(e.shortMessage || e.message || 'Transaction failed');
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Head>
        <title>Withdraw ETH | INQUISITIVE</title>
      </Head>
      <div style={{ minHeight: '100vh', background: '#07071a', color: '#fff', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' }}>
        <div className="mesh-bg" />

        {/* NAV */}
        <SiteNav />

        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px 24px', position: 'relative', zIndex: 1 }}>
          <div style={{ width: '100%', maxWidth: 520 }}>

            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: 36 }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: 16, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)', marginBottom: 16 }}>
                <Shield size={26} color="#f87171" strokeWidth={1.8} />
              </div>
              <h1 style={{ fontSize: 26, fontWeight: 900, marginBottom: 8, letterSpacing: '-0.5px' }}>Withdraw Vault ETH</h1>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7 }}>
                Owner-only. Sends all ETH from the vault contract to the team wallet.
              </p>
            </div>

            {/* Main card */}
            <div style={{ background: 'rgba(13,13,32,0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 22, padding: '28px 26px', backdropFilter: 'blur(20px)' }}>

              {/* Connect prompt */}
              {!isConnected && (
                <div style={{ textAlign: 'center', padding: '20px 0 8px' }}>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', marginBottom: 20 }}>Connect the vault owner wallet to proceed.</p>
                  <OpenWalletButton style={{ width: '100%', padding: '13px', borderRadius: 12, fontSize: 15, fontWeight: 800, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer', boxShadow: '0 4px 20px rgba(124,58,237,0.4)' }}>
                    Connect Wallet
                  </OpenWalletButton>
                </div>
              )}

              {/* Wrong chain */}
              {isConnected && wrongChain && (
                <div style={{ padding: '14px 16px', background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 12, fontSize: 13, color: '#fbbf24' }}>
                  Switch to <strong>Ethereum Mainnet</strong> in your wallet to continue.
                </div>
              )}

              {/* Not owner */}
              {isConnected && !wrongChain && !isOwner && (
                <div style={{ padding: '14px 16px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, fontSize: 13, color: '#f87171', lineHeight: 1.6 }}>
                  <strong>Not the vault owner.</strong><br />
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Connected: {address?.slice(0,10)}…{address?.slice(-6)}</span><br />
                  <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>Owner: {vaultOwner ? `${(vaultOwner as string).slice(0,10)}…${(vaultOwner as string).slice(-6)}` : 'Loading…'}</span>
                </div>
              )}

              {/* Owner connected */}
              {isConnected && !wrongChain && isOwner && (
                <div>
                  {/* Flow diagram */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 24 }}>
                    {/* From */}
                    <div style={{ padding: '14px 16px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px 12px 0 0' }}>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>From — Vault Contract</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <code style={{ fontSize: 11, color: '#f87171', fontFamily: 'monospace' }}>{VAULT_ADDR.slice(0,10)}…{VAULT_ADDR.slice(-6)}</code>
                        <a href={`https://etherscan.io/address/${VAULT_ADDR}`} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, textDecoration: 'none' }}>Etherscan <ExternalLink size={10} /></a>
                      </div>
                      <div style={{ marginTop: 10, display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ fontSize: 28, fontWeight: 900, color: '#f87171', fontFamily: 'monospace' }}>{vaultEth.toFixed(6)}</span>
                        <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>ETH</span>
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>Available balance</div>
                    </div>

                    {/* Arrow */}
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0', background: 'rgba(255,255,255,0.02)', borderLeft: '1px solid rgba(255,255,255,0.08)', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
                      <ArrowDown size={18} color="rgba(255,255,255,0.2)" />
                    </div>

                    {/* To */}
                    <div style={{ padding: '14px 16px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '0 0 12px 12px' }}>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>To — Team Wallet</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <code style={{ fontSize: 11, color: '#34d399', fontFamily: 'monospace' }}>{TEAM_WALLET.slice(0,10)}…{TEAM_WALLET.slice(-6)}</code>
                        <a href={`https://etherscan.io/address/${TEAM_WALLET}`} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, textDecoration: 'none' }}>Etherscan <ExternalLink size={10} /></a>
                      </div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 6 }}>collectFees(address(0), vaultBalance) → payable(owner)</div>
                    </div>
                  </div>

                  {/* Error */}
                  {error && (
                    <div style={{ display: 'flex', gap: 8, padding: '12px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, marginBottom: 16 }}>
                      <AlertTriangle size={14} color="#f87171" style={{ flexShrink: 0, marginTop: 1 }} />
                      <span style={{ fontSize: 12, color: '#f87171', lineHeight: 1.6 }}>{error}</span>
                    </div>
                  )}

                  {/* Success */}
                  {txHash && (
                    <div style={{ display: 'flex', gap: 8, padding: '12px 14px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 10, marginBottom: 16 }}>
                      <CheckCircle2 size={14} color="#34d399" style={{ flexShrink: 0, marginTop: 1 }} />
                      <div style={{ fontSize: 12, color: '#6ee7b7', lineHeight: 1.6 }}>
                        <strong>Withdrawal sent!</strong>{' '}
                        <a href={`https://etherscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer" style={{ color: '#34d399' }}>View on Etherscan ↗</a>
                      </div>
                    </div>
                  )}

                  {/* Withdraw button */}
                  {!txHash ? (
                    <button
                      onClick={withdraw}
                      disabled={sending || vaultEth === 0}
                      style={{
                        width: '100%', padding: '14px', borderRadius: 13, fontSize: 15, fontWeight: 800,
                        background: sending || vaultEth === 0 ? 'rgba(239,68,68,0.15)' : 'linear-gradient(135deg,rgba(239,68,68,0.8),rgba(185,28,28,0.9))',
                        border: '1px solid rgba(239,68,68,0.4)', color: '#fff', cursor: sending || vaultEth === 0 ? 'not-allowed' : 'pointer',
                        boxShadow: sending || vaultEth === 0 ? 'none' : '0 4px 20px rgba(239,68,68,0.3)',
                        transition: 'all 0.2s',
                      }}
                    >
                      {sending ? 'Confirm in wallet…' : vaultEth === 0 ? 'No ETH in vault' : `Withdraw ${vaultEth.toFixed(6)} ETH to Team Wallet`}
                    </button>
                  ) : (
                    <button
                      onClick={() => { setTxHash(null); setError(null); refetchBal(); }}
                      style={{ width: '100%', padding: '12px', borderRadius: 12, fontSize: 13, fontWeight: 700, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}
                    >
                      Refresh Balance
                    </button>
                  )}

                  {/* Info */}
                  <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 10, fontSize: 10, color: 'rgba(255,255,255,0.3)', lineHeight: 1.7 }}>
                    Calls <code style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10 }}>collectFees(address(0), balance)</code> on the vault contract. ETH is transferred to <code style={{ color: 'rgba(255,255,255,0.45)', fontSize: 10 }}>owner</code> which is the team wallet. Owner-only function.
                  </div>
                </div>
              )}
            </div>

            {/* Connected wallet info */}
            {isConnected && (
              <div style={{ marginTop: 12, textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>
                Connected: {address?.slice(0,6)}…{address?.slice(-4)}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
