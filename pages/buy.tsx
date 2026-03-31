import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { useAccount, useBalance, useSendTransaction, useWriteContract, useDisconnect } from 'wagmi';
import { parseEther, parseUnits, erc20Abi } from 'viem';
import { mainnet } from 'wagmi/chains';
import { INQAI_TOKEN } from '../src/config/wagmi';
import { Lock, CheckCircle2, Loader, Shield, ExternalLink, AlertTriangle } from 'lucide-react';
import InqaiLogo from '../src/components/InqaiLogo';

const OpenWalletButton = dynamic(() => import('../src/components/OpenWalletButton'), { ssr: false, loading: () => null });
const WalletButton     = dynamic(() => import('../src/components/WalletButton'),     { ssr: false, loading: () => null });

const fmtUsd = (n: number) => {
  if (!n) return '$0';
  if (n >= 1e6) return '$' + (n/1e6).toFixed(2) + 'M';
  if (n >= 1e3) return '$' + (n/1e3).toFixed(1) + 'K';
  return '$' + n.toFixed(2);
};

const NAV_LINKS = [
  { l: 'Portfolio', p: '/analytics', accent: false },
  { l: 'Docs',      p: '/help',      accent: false },
];

export default function BuyPage() {
  const router = useRouter();
  const { address, isConnected, chain } = useAccount();
  const [payToken, setPayToken]     = useState<'ETH' | 'BTC' | 'SOL' | 'TRX' | 'USDC'>('ETH');
  const [usdAmount, setUsdAmount]   = useState('1000');
  const [isBuying, setIsBuying]     = useState(false);
  const [txHash, setTxHash]         = useState<string | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [showReconnect, setShowReconnect] = useState(false);
  const [step, setStep]             = useState<1|2|3>(1);
  const [ethPrice, setEthPrice]         = useState<number>(3200);
  const [btcPrice, setBtcPrice]         = useState<number>(85000);
  const [solPrice, setSolPrice]         = useState<number>(140);
  const [trxPrice, setTrxPrice]         = useState<number>(0.25);
  const [showManual, setShowManual]     = useState(false);
  const [chargeId, setChargeId]         = useState<string | null>(null);
  const [chargeAddress, setChargeAddress] = useState<string | null>(null);
  const [chargeAmount, setChargeAmount] = useState<string | null>(null);
  const [chargeExpiry, setChargeExpiry] = useState<string | null>(null);
  const [chargeStatus, setChargeStatus] = useState<'pending'|'confirmed'|'expired'|'failed' | null>(null);
  const [chargeCheckParams, setChargeCheckParams] = useState<{ since: number; expectedAmount: string; currency: string } | null>(null);
  const [copied, setCopied]             = useState(false);

  const { sendTransactionAsync }    = useSendTransaction();
  const { writeContractAsync }      = useWriteContract();
  const { disconnect }              = useDisconnect();

  useEffect(() => {
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum,bitcoin,solana,tron&vs_currencies=usd')
      .then(r => r.json())
      .then(d => {
        if (d?.ethereum?.usd) setEthPrice(d.ethereum.usd);
        if (d?.bitcoin?.usd)  setBtcPrice(d.bitcoin.usd);
        if (d?.solana?.usd)   setSolPrice(d.solana.usd);
        if (d?.tron?.usd)     setTrxPrice(d.tron.usd);
      })
      .catch(() => {});
  }, []);

  const { data: ethBal }  = useBalance({ address, chainId: mainnet.id });
  const { data: wbtcBal } = useBalance({ address, token: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', chainId: mainnet.id });
  const { data: usdcBal } = useBalance({ address, token: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', chainId: mainnet.id });

  const balMap: Record<string, string> = {
    ETH:  ethBal  ? parseFloat(ethBal.formatted).toFixed(4)  : '—',
    BTC:  wbtcBal ? parseFloat(wbtcBal.formatted).toFixed(6) : '—',
    SOL:  '—',
    TRX:  '—',
    USDC: usdcBal ? parseFloat(usdcBal.formatted).toFixed(2) : '—',
  };

  const usd = parseFloat(usdAmount) || 0;
  const inqaiAmt = (usd / INQAI_TOKEN.presalePrice).toFixed(2);
  const targetVal = (parseFloat(inqaiAmt) * INQAI_TOKEN.targetPrice).toFixed(2);
  const discount  = Math.round((1 - INQAI_TOKEN.presalePrice / INQAI_TOKEN.targetPrice) * 100);

  useEffect(() => {
    if (isConnected) setStep(s => s === 1 ? 2 : s);
  }, [isConnected]);

  const payAmount  = payToken === 'BTC'
    ? (usd / btcPrice).toFixed(8)
    : payToken === 'SOL' ? (usd / solPrice).toFixed(4)
    : payToken === 'TRX' ? (usd / trxPrice).toFixed(2) : '0';

  useEffect(() => {
    if (!chargeId || chargeStatus === 'confirmed' || chargeStatus === 'expired' || chargeStatus === 'failed') return;
    // Check expiry
    const expiryMs = chargeExpiry ? new Date(chargeExpiry).getTime() : 0;
    const poll = setInterval(async () => {
      if (expiryMs && Date.now() > expiryMs) {
        setChargeStatus('expired');
        clearInterval(poll);
        return;
      }
      try {
        const params = chargeCheckParams
          ? `&currency=${chargeCheckParams.currency}&amount=${chargeCheckParams.expectedAmount}&since=${chargeCheckParams.since}`
          : '';
        const r = await fetch(`/api/payment/check-charge?id=${chargeId}${params}`);
        const d = await r.json();
        if (d.status === 'confirmed') {
          try {
            const existing = JSON.parse(localStorage.getItem('inqai_purchases') || '[]');
            existing.push({ chargeId, timestamp: Date.now(), amount: parseFloat(inqaiAmt), usdAmount: usd, payToken, address, price: INQAI_TOKEN.presalePrice });
            localStorage.setItem('inqai_purchases', JSON.stringify(existing));
          } catch {}
          setChargeStatus('confirmed'); setStep(3); clearInterval(poll);
        }
        if (d.status === 'expired' || d.status === 'failed') { setChargeStatus(d.status); clearInterval(poll); }
      } catch {}
    }, 15000);
    return () => clearInterval(poll);
  }, [chargeId, chargeStatus, chargeCheckParams, chargeExpiry]);

  const withTimeout = <T,>(p: Promise<T>, ms = 120_000): Promise<T> =>
    Promise.race([p, new Promise<never>((_, rej) =>
      setTimeout(() => rej(new Error('Wallet request timed out. Open your wallet app and try again.')), ms)
    )]);

  const handleBuy = async () => {
    setError(null);
    setShowReconnect(false);
    setIsBuying(true);

    if (usd < 10) { setError('Minimum purchase is $10'); setIsBuying(false); return; }

    if (payToken === 'BTC' || payToken === 'SOL' || payToken === 'TRX') {
      try {
        const r = await fetch('/api/payment/create-charge', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ usdAmount: usd, inqaiAmount: inqaiAmt, payToken, walletAddress: address }),
        });
        const data = await r.json();
        if (!r.ok) throw new Error(data.error || 'Failed to create payment address');
        setChargeId(data.chargeId);
        setChargeAddress(data.address);
        setChargeAmount(data.amount);
        setChargeExpiry(data.expiresAt);
        setChargeCheckParams(data.checkParams || null);
        setChargeStatus('pending');
        setShowManual(true);
      } catch (e: any) {
        setError(e.message || 'Failed to create payment address.');
      } finally {
        setIsBuying(false);
      }
      return;
    }

    // ETH/USDC require WalletConnect on Ethereum Mainnet
    if (chain?.id !== mainnet.id) {
      setError('Switch to Ethereum Mainnet in your wallet to continue.');
      setIsBuying(false);
      return;
    }

    try {
      let hash: `0x${string}`;
      // ETH and USDC go directly to the vault contract (receive() payable).
      // When vault.balance >= MIN_DEPLOY, checkUpkeep() returns true and
      // Chainlink/keeper calls performUpkeep() to deploy across all 65 assets.
      const recipient = INQAI_TOKEN.vaultAddress;
      if (payToken === 'ETH') {
        hash = await withTimeout(sendTransactionAsync({
          to:    recipient,
          value: parseEther((usd / ethPrice).toFixed(18)),
        }));
      } else {
        // USDC
        hash = await withTimeout(writeContractAsync({
          address:      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as `0x${string}`,
          abi:          erc20Abi,
          functionName: 'transfer',
          args:         [recipient, parseUnits(usd.toFixed(6), 6)],
          gas:          65000n,
        }));
      }
      setTxHash(hash);
      const existing = JSON.parse(localStorage.getItem('inqai_purchases') || '[]');
      existing.push({ txHash: hash, timestamp: Date.now(), amount: parseFloat(inqaiAmt), usdAmount: usd, payToken, address, price: INQAI_TOKEN.presalePrice });
      localStorage.setItem('inqai_purchases', JSON.stringify(existing));
      setStep(3);
    } catch (e: any) {
      console.error('Purchase error:', e);
      // Walk error chain for UnknownRpcError
      let cur = e;
      let isRpcError = false;
      while (cur) {
        if (cur.name === 'UnknownRpcError' || String(cur.message).toLowerCase().includes('unknown rpc')) {
          isRpcError = true; break;
        }
        cur = cur.cause;
      }
      const msg: string = e.shortMessage || e.message || '';
      if (msg.toLowerCase().includes('rejected') || msg.toLowerCase().includes('denied') || e.code === 4001) {
        setError('Transaction rejected. Please try again.');
      } else if (msg.toLowerCase().includes('insufficient')) {
        setError('Insufficient balance to cover the amount and gas fees.');
      } else if (isRpcError || e.name === 'UnknownRpcError') {
        setError('Wallet session issue — disconnect and reconnect your wallet to create a fresh session.');
        setShowReconnect(true);
      } else if (msg) {
        setError(msg);
      } else {
        setError('Transaction failed. Please try again.');
      }
    } finally {
      setIsBuying(false);
    }
  };

  const PRESETS = ['100', '500', '1000', '5000', '10000'];

  return (
    <>
      <Head>
        <title>Acquire INQAI | INQUISITIVE</title>
        <meta name="description" content={`Acquire INQAI — proportional ownership in a professionally managed portfolio of 65 digital assets. $${INQAI_TOKEN.presalePrice} presale price. ${Number(process.env.NEXT_PUBLIC_TOTAL_SUPPLY||100000000).toLocaleString()} fixed supply. Self-custody.`} />
      </Head>

      <div style={{ minHeight: '100vh', background: '#07071a', color: '#fff', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' }}>
        <div className="mesh-bg" />

        {/* NAV */}
        <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(7,7,26,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.05)', height: 60, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 8 }}>
          <button onClick={() => router.push('/')} style={{ display: 'flex', alignItems: 'center', gap: 9, background: 'none', border: 'none', cursor: 'pointer', marginRight: 24, padding: 0 }}>
            <InqaiLogo size={32} />
            <div className="anim-name-pulse" style={{ fontWeight: 900, fontSize: 18, letterSpacing: '-0.5px', color: '#fff', lineHeight: 1 }}>INQUISITIVE</div>
          </button>
          <div style={{ display: 'flex', gap: 3, flex: 1 }}>
            {NAV_LINKS.map(n => (
              <button key={n.l} onClick={() => router.push(n.p)} style={{
                padding: '6px 14px', borderRadius: 9, cursor: 'pointer', fontSize: 13, fontWeight: n.accent ? 700 : 500,
                background: n.accent ? 'linear-gradient(135deg,#7c3aed,#4f46e5)' : 'transparent',
                color: n.accent ? '#fff' : 'rgba(255,255,255,0.5)',
                border: n.accent ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent',
                boxShadow: n.accent ? '0 2px 12px rgba(124,58,237,0.35)' : 'none',
              }}>{n.l}</button>
            ))}
          </div>
          <WalletButton label="Connect" />
        </nav>

        {/* PAGE CONTENT */}
        <div style={{ padding: '56px 24px 80px', position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '480px 1fr', gap: 32, alignItems: 'start' }}>

            {/* LEFT — PURCHASE CARD */}
            <div>
              {/* Header */}
              <div style={{ marginBottom: 28 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 100, padding: '5px 14px', marginBottom: 16, fontSize: 12, color: '#c4b5fd' }}>
                  <span className="anim-blink" style={{ width: 5, height: 5, borderRadius: '50%', background: '#7c3aed', display: 'inline-block' }} />
                  Presale Active
                </div>
                <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 8, lineHeight: 1.1 }}>
                  Acquire <span className="grad-text">INQAI</span>
                </h1>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7 }}>
                  Presale price <strong style={{ color: '#a78bfa' }}>${INQAI_TOKEN.presalePrice}</strong> per token. Target listing price <strong style={{ color: '#fff' }}>${INQAI_TOKEN.targetPrice}</strong>. Tokens delivered to your self-custody wallet.
                </p>
              </div>


              {/* Main card */}
              <div style={{ background: 'rgba(13,13,32,0.85)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 22, padding: '28px 26px', backdropFilter: 'blur(20px)', boxShadow: '0 0 60px rgba(124,58,237,0.06)' }}>

                {/* STEP 1 — Connect */}
                {!isConnected && (
                  <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}><Lock size={44} color="#7c3aed" strokeWidth={1.5} /></div>
                    <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Connect Your Wallet</h3>
                    <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', marginBottom: 26, lineHeight: 1.7 }}>
                      Connect your wallet to proceed. INQAI tokens are delivered directly to your wallet address. Non-custodial. No intermediary holds your assets.
                    </p>
                    <OpenWalletButton
                      style={{
                        width: '100%', padding: '14px', borderRadius: 14, fontSize: 15, fontWeight: 800,
                        background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff',
                        border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
                        boxShadow: '0 6px 24px rgba(124,58,237,0.45)', letterSpacing: '-0.2px',
                      }}
                    >
                      Connect Wallet
                    </OpenWalletButton>
                    <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 12 }}>
                      WalletConnect · 530+ mobile wallets supported
                    </p>
                  </div>
                )}

                {/* STEP 2 — Configure */}
                {isConnected && step !== 3 && (
                  <div>
                    {/* Wallet pill */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22, padding: '10px 14px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="anim-blink" style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
                        <span style={{ fontSize: 12, color: '#6ee7b7', fontWeight: 600 }}>Wallet connected</span>
                      </div>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>
                        {address ? address.slice(0,6) + '...' + address.slice(-4) : ''}
                      </span>
                    </div>

                    {/* Payment token selector */}
                    <div style={{ marginBottom: 22 }}>
                      <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10, display: 'block' }}>Pay with</label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 8 }}>
                        {(['ETH','BTC','SOL','TRX','USDC'] as const).map(tok => (
                          <button
                            key={tok}
                            onClick={() => setPayToken(tok)}
                            style={{
                              padding: '10px 8px', borderRadius: 12, cursor: 'pointer', textAlign: 'center',
                              border: `1px solid ${payToken === tok ? 'rgba(124,58,237,0.5)' : 'rgba(255,255,255,0.07)'}`,
                              background: payToken === tok ? 'rgba(124,58,237,0.15)' : 'rgba(255,255,255,0.03)',
                              transition: 'all 0.15s',
                            }}
                          >
                            <div style={{ fontWeight: 800, fontSize: 13, color: payToken === tok ? '#a78bfa' : 'rgba(255,255,255,0.7)' }}>{tok}</div>
                            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{balMap[tok]}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* USD amount */}
                    <div style={{ marginBottom: 20 }}>
                      <label style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10, display: 'block' }}>Amount (USD)</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)', fontSize: 16, fontWeight: 700 }}>$</span>
                        <input
                          type="number"
                          value={usdAmount}
                          onChange={e => setUsdAmount(e.target.value)}
                          min="10"
                          style={{
                            width: '100%', padding: '13px 14px 13px 28px', borderRadius: 12,
                            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                            color: '#fff', fontSize: 18, fontWeight: 700, outline: 'none', boxSizing: 'border-box',
                          }}
                          onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.5)'}
                          onBlur={e  => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                        {PRESETS.map(p => (
                          <button
                            key={p}
                            onClick={() => setUsdAmount(p)}
                            style={{
                              flex: 1, padding: '5px 0', borderRadius: 8, fontSize: 11, cursor: 'pointer',
                              background: usdAmount === p ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.04)',
                              border: `1px solid ${usdAmount === p ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.07)'}`,
                              color: usdAmount === p ? '#a78bfa' : 'rgba(255,255,255,0.4)',
                              fontWeight: 600,
                            }}
                          >${p}</button>
                        ))}
                      </div>
                    </div>

                    {/* Receive breakdown */}
                    <div style={{ background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.18)', borderRadius: 14, padding: '16px 18px', marginBottom: 22 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>You receive</span>
                        <span style={{ fontSize: 22, fontWeight: 900, color: '#a78bfa', fontFamily: 'monospace' }}>
                          {inqaiAmt} <span style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.4)' }}>INQAI</span>
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                        <span>At target price (${INQAI_TOKEN.targetPrice}):</span>
                        <span style={{ color: '#10b981', fontWeight: 700 }}>${parseFloat(targetVal).toLocaleString()}</span>
                      </div>
                      <div style={{ marginTop: 8, padding: '6px 10px', background: 'rgba(16,185,129,0.06)', borderRadius: 8, fontSize: 11, color: '#6ee7b7', textAlign: 'center' }}>
                        At target price: ${(parseFloat(targetVal) - usd).toLocaleString()} projected appreciation ({discount}% above presale)
                      </div>
                    </div>

                    {/* Error */}
                    {error && (
                      <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
                        <span style={{ fontSize: 12, color: '#f87171', display: 'block', lineHeight: 1.6 }}>{error}</span>
                        {showReconnect && (
                          <button
                            onClick={() => { setError(null); setShowReconnect(false); disconnect(); }}
                            style={{ marginTop: 10, padding: '6px 14px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171' }}
                          >
                            Disconnect Wallet
                          </button>
                        )}
                      </div>
                    )}

                    {/* Chain warning */}
                    {isConnected && chain?.id !== mainnet.id && (
                      <div style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 10, padding: '10px 14px', marginBottom: 16 }}>
                        <span style={{ fontSize: 12, color: '#fbbf24' }}>Switch to Ethereum Mainnet to complete purchase</span>
                      </div>
                    )}

                    {/* BTC / SOL — NOWPayments unique address panel */}
                    {showManual && (payToken === 'BTC' || payToken === 'SOL' || payToken === 'TRX') && (
                      <div style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 14, padding: '18px', marginBottom: 18 }}>
                        {chargeStatus === 'confirmed' ? (
                          <div style={{ textAlign: 'center', padding: '8px 0' }}>
                            <CheckCircle2 size={32} color="#10b981" strokeWidth={1.5} style={{ marginBottom: 8 }} />
                            <div style={{ fontSize: 13, color: '#6ee7b7', fontWeight: 700 }}>Payment Confirmed!</div>
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{inqaiAmt} INQAI delivered instantly to your wallet.</div>
                          </div>
                        ) : chargeStatus === 'expired' ? (
                          <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: 12, color: '#f87171', marginBottom: 8 }}>Address expired. Generate a new one.</div>
                            <button onClick={() => { setShowManual(false); setChargeId(null); setChargeAddress(null); setChargeStatus(null); setChargeCheckParams(null); }} style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, color: '#f87171', fontSize: 11, padding: '5px 14px', cursor: 'pointer' }}>Generate New Address</button>
                          </div>
                        ) : (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                              <div style={{ fontSize: 12, color: '#6ee7b7', fontWeight: 700 }}>Send exactly {chargeAmount || payAmount} {payToken}</div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>
                                <span className="anim-blink" style={{ width: 5, height: 5, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
                                Awaiting payment
                              </div>
                            </div>
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>You receive: <strong style={{ color: '#a78bfa' }}>{inqaiAmt} INQAI</strong></div>
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Unique {payToken} Payment Address</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
                              <span style={{ fontSize: 11, color: '#fff', fontFamily: 'monospace', wordBreak: 'break-all', flex: 1 }}>{chargeAddress || '…'}</span>
                              <button onClick={() => { if (chargeAddress) { navigator.clipboard.writeText(chargeAddress); setCopied(true); setTimeout(() => setCopied(false), 2000); } }} style={{ background: copied ? 'rgba(16,185,129,0.2)' : 'rgba(124,58,237,0.3)', border: `1px solid ${copied ? 'rgba(16,185,129,0.4)' : 'rgba(124,58,237,0.4)'}`, borderRadius: 6, color: copied ? '#6ee7b7' : '#a78bfa', fontSize: 10, padding: '4px 8px', cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s' }}>{copied ? '✓ Copied' : 'Copy'}</button>
                            </div>
                            {chargeExpiry && (
                              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginBottom: 8 }}>Address expires: {new Date(chargeExpiry).toLocaleTimeString()}</div>
                            )}
                            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', lineHeight: 1.7, padding: '8px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: 8 }}>
                              This address is <strong style={{ color: 'rgba(255,255,255,0.5)' }}>unique to your purchase</strong>. Send the exact amount above. Payment is detected automatically. INQAI tokens delivered instantly.
                            </div>
                            <button onClick={() => { setShowManual(false); setChargeId(null); setChargeAddress(null); setChargeStatus(null); setChargeCheckParams(null); }} style={{ marginTop: 10, background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'rgba(255,255,255,0.4)', fontSize: 11, padding: '5px 12px', cursor: 'pointer' }}>← Back</button>
                          </>
                        )}
                      </div>
                    )}

                    {/* Buy button */}
                    <button
                      onClick={handleBuy}
                      disabled={isBuying}
                      style={{
                        width: '100%', padding: '14px', borderRadius: 14, fontSize: 16, fontWeight: 800,
                        background: isBuying ? 'rgba(124,58,237,0.25)' : 'linear-gradient(135deg,#7c3aed,#4f46e5)',
                        color: '#fff', border: '1px solid rgba(255,255,255,0.1)', cursor: isBuying ? 'wait' : 'pointer',
                        boxShadow: isBuying ? 'none' : '0 6px 24px rgba(124,58,237,0.45)',
                        transition: 'all 0.2s', letterSpacing: '-0.2px',
                      }}
                    >
                      {isBuying ? (
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                          <Loader size={14} color="#fff" strokeWidth={2} />
                          Confirm in wallet app… (cancel anytime)
                        </span>
                      ) : `Confirm Purchase — ${inqaiAmt} INQAI`}
                    </button>
                    {isBuying && (
                      <div style={{ textAlign: 'center', marginTop: 10 }}>
                        <button
                          onClick={() => setIsBuying(false)}
                          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.3)', fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}
                        >Cancel</button>
                      </div>
                    )}

                    <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: 10 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                        <AlertTriangle size={12} color="#fbbf24" style={{ flexShrink: 0, marginTop: 1 }} />
                        <p style={{ margin: 0, fontSize: 10, color: 'rgba(255,255,255,0.3)', lineHeight: 1.7 }}>
                          <strong style={{ color: 'rgba(255,255,255,0.4)' }}>Risk Disclosure:</strong> Digital assets carry substantial risk including total loss of capital. Target APY of {(INQAI_TOKEN.targetAPY*100).toFixed(1)}% is a projection based on AI strategy backtesting, not a guarantee. Past performance does not guarantee future results. Minimum $10. This is not financial advice.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3 — Success */}
                {step === 3 && (
                  <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                    <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}><CheckCircle2 size={52} color="#10b981" strokeWidth={1.5} /></div>
                    <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>
                      {txHash ? 'Transaction Confirmed' : 'Payment Confirmed'}
                    </h3>
                    <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', marginBottom: 20 }}>
                      {txHash ? (
                        <><strong style={{ color: '#a78bfa' }}>{inqaiAmt} INQAI</strong> delivered instantly to your wallet.</>
                      ) : (
                        <><strong style={{ color: '#a78bfa' }}>{payToken}</strong> payment detected on-chain. <strong style={{ color: '#a78bfa' }}>{inqaiAmt} INQAI</strong> delivered instantly.</>
                      )}
                    </p>
                    {txHash ? (
                      <>
                        <div style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)', borderRadius: 12, padding: '12px 16px', marginBottom: 16, textAlign: 'left' }}>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Transaction Hash</div>
                          <div style={{ fontSize: 11, color: '#6ee7b7', fontFamily: 'monospace', wordBreak: 'break-all' }}>{txHash}</div>
                        </div>
                        <a href={`https://etherscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#6ee7b7', textDecoration: 'none', marginBottom: 16 }}>
                          <ExternalLink size={12} /> View on Etherscan
                        </a>
                      </>
                    ) : (
                      <div style={{ background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)', borderRadius: 12, padding: '14px 16px', marginBottom: 16, textAlign: 'left' }}>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.7 }}>
                          Your {payToken} payment of <strong style={{ color: '#6ee7b7' }}>{chargeAmount} {payToken}</strong> has been confirmed.
                          <br />INQAI tokens delivered instantly to your registered wallet.
                          <br /><span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>Payment ID: {chargeId}</span>
                        </div>
                      </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <button
                        onClick={() => router.push('/analytics')}
                        style={{
                          padding: '12px', borderRadius: 12, fontSize: 14, fontWeight: 700,
                          background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff',
                          border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer',
                          boxShadow: '0 4px 16px rgba(124,58,237,0.35)',
                        }}
                      >View Holdings →</button>
                      <button
                        onClick={() => { setStep(2); setTxHash(null); }}
                        style={{
                          padding: '12px', borderRadius: 12, fontSize: 14, fontWeight: 600,
                          background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)',
                          border: '1px solid rgba(255,255,255,0.08)', cursor: 'pointer',
                        }}
                      >Acquire More</button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT — INFO PANEL */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Tokenomics */}
              <div style={{ background: 'rgba(13,13,32,0.8)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 20, padding: '24px', backdropFilter: 'blur(12px)' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 18, color: 'rgba(255,255,255,0.7)' }}>Token Specifications</h3>
                {[
                  { label: 'Presale Price',  val: `$${INQAI_TOKEN.presalePrice}`,                   col: '#a78bfa' },
                  { label: 'Target Price',   val: `$${INQAI_TOKEN.targetPrice}`,                    col: '#fff'    },
                  { label: 'Target APY',     val: `${(INQAI_TOKEN.targetAPY * 100).toFixed(1)}%`,   col: '#10b981' },
                  { label: 'Total Supply',   val: Number(process.env.NEXT_PUBLIC_TOTAL_SUPPLY||100000000).toLocaleString(), col: '#fff' },
                  { label: 'Token Standard', val: 'ERC-20',                                         col: '#60a5fa' },
                  { label: 'Backing',        val: '65 Digital Assets',                              col: '#60a5fa' },
                  { label: 'Target MCap',    val: '$1.5B',                                          col: '#f59e0b' },
                ].map(r => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{r.label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: r.col, fontFamily: 'monospace' }}>{r.val}</span>
                  </div>
                ))}
              {/* Contract Address */}
              <div style={{ marginTop: 12, padding: '10px 14px', background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 12 }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>Contract Address (Ethereum Mainnet)</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <div style={{ fontSize: 11, color: '#6ee7b7', fontFamily: 'monospace', wordBreak: 'break-all' }}>{INQAI_TOKEN.address}</div>
                  <a href={`https://etherscan.io/token/${INQAI_TOKEN.address}`} target="_blank" rel="noopener noreferrer" style={{ color: '#6ee7b7', flexShrink: 0 }}><ExternalLink size={12} /></a>
                </div>
              </div>
              </div>

              {/* Security + Audit Status */}
              <div style={{ background: 'rgba(13,13,32,0.8)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 20, padding: '24px', backdropFilter: 'blur(12px)' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 18, color: 'rgba(255,255,255,0.7)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Shield size={14} color="#10b981" /> Security Architecture
                </h3>
                {[
                  { label: 'Self-Custody',       status: 'ACTIVE',  detail: 'Tokens delivered directly to your wallet. No exchange or intermediary.' },
                  { label: '48h Timelocks',       status: 'ACTIVE',  detail: 'All critical contract operations require 48-hour delay.' },
                  { label: 'Circuit Breakers',    status: 'ACTIVE',  detail: '15% drawdown halt. All trading stops automatically.' },
                  { label: 'AI Risk Controls',    status: 'ACTIVE',  detail: '2% max per trade. 6% max portfolio heat. 2:1 R:R floor.' },
                  { label: 'Smart Contract Audit',status: 'PENDING', detail: 'Independent security audit in progress. Trail of Bits engaged.' },
                ].map(s => (
                  <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>{s.label}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', lineHeight: 1.5, marginTop: 2 }}>{s.detail}</div>
                    </div>
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 100, flexShrink: 0, marginLeft: 12,
                      background: s.status === 'ACTIVE' ? 'rgba(16,185,129,0.12)' : 'rgba(251,191,36,0.1)',
                      color: s.status === 'ACTIVE' ? '#10b981' : '#fbbf24',
                      border: `1px solid ${s.status === 'ACTIVE' ? 'rgba(16,185,129,0.25)' : 'rgba(251,191,36,0.2)'}`,
                    }}>{s.status}</span>
                  </div>
                ))}
              </div>

              {/* How it works */}
              <div style={{ background: 'rgba(13,13,32,0.8)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 20, padding: '24px', backdropFilter: 'blur(12px)' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 18, color: 'rgba(255,255,255,0.7)' }}>How INQAI Works</h3>
                {[
                  { n: '01', t: 'Acquire INQAI',              d: `Purchase at the $${INQAI_TOKEN.presalePrice} presale price. Tokens are delivered directly to your self-custody wallet. No intermediary.` },
                  { n: '02', t: 'ETH Deployed Across 65 Assets', d: 'Your ETH payment is received by the vault. The AI keeper automatically triggers performUpkeep() — diversifying across 26 Uniswap V3 swaps, 13 deBridge cross-chain bridges (including TRON for TRX), and 25 Lido stETH positions.' },
                  { n: '03', t: 'Proportional Asset-Backed Ownership', d: 'Each INQAI token represents proportional ownership in the underlying 65-asset portfolio. Live NAV is calculated from native CoinGecko prices — zero proxy disconnect.' },
                  { n: '04', t: 'Compounding Value Accrual',   d: '60% of all protocol fees are deployed for open-market buybacks. 20% is permanently burned. Circulating supply contracts over time.' },
                ].map(item => (
                  <div key={item.n} style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 8, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: '#a78bfa', flexShrink: 0, marginTop: 2 }}>{item.n}</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 3 }}>{item.t}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6 }}>{item.d}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Payment tokens */}
              <div style={{ background: 'rgba(13,13,32,0.8)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 20, padding: '24px', backdropFilter: 'blur(12px)' }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: 'rgba(255,255,255,0.7)' }}>Accepted Payment</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
                  {INQAI_TOKEN.paymentTokens.map(t => (
                    <div key={t.symbol} style={{ padding: '10px 14px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{t.symbol}</div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>{t.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
