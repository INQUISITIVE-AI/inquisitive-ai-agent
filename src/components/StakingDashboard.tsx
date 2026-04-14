import React, { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { erc20Abi, formatUnits, parseUnits, getAddress } from 'viem';
import { Lock, TrendingUp, Gift, Clock, Wallet, ExternalLink, CheckCircle, RefreshCw } from 'lucide-react';

// Validate and checksum addresses to prevent 'Address is invalid' errors
function safeAddress(addr: string | undefined): `0x${string}` {
  if (!addr || addr === '0x0000000000000000000000000000000000000000') return '0x0000000000000000000000000000000000000000';
  try {
    // Remove any quotes or whitespace
    const clean = addr.replace(/["']/g, '').trim();
    // Validate it's a proper Ethereum address and checksum it
    return getAddress(clean.toLowerCase());
  } catch {
    console.error('Invalid staking address:', addr);
    return '0x0000000000000000000000000000000000000000';
  }
}

const STAKING_ADDR_RAW = process.env.NEXT_PUBLIC_STAKING_CONTRACT;
const STAKING_ADDR = safeAddress(STAKING_ADDR_RAW);
const INQAI_ADDR   = '0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5' as `0x${string}`;
const CONTRACT_LIVE = STAKING_ADDR !== '0x0000000000000000000000000000000000000000';

const STAKING_ABI = [
  { name: 'stake',         type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'amount', type: 'uint256' }], outputs: [] },
  { name: 'unstake',       type: 'function', stateMutability: 'nonpayable', inputs: [], outputs: [] },
  // claimRewards removed - rewards auto-distributed via FeeDistributor
  { name: 'getStakeInfo',  type: 'function', stateMutability: 'view',
    inputs:  [{ name: 'user', type: 'address' }],
    outputs: [
      { name: 'amount',        type: 'uint256' },
      { name: 'startTime',     type: 'uint256' },
      { name: 'lockEndTime',   type: 'uint256' },
      { name: 'pendingReward', type: 'uint256' },
      { name: 'canUnstake',    type: 'bool'    },
    ]},
] as const;

interface GlobalStats {
  totalStaked: string;
  totalStakers: number;
  apy: number;
  totalRewards: string;
  stakingRatio: number;
}

function fmtInqai(val: string | undefined): string {
  const n = parseFloat(val || '0');
  if (!n) return '0';
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return 'Unlocked';
  const d = Math.floor(ms / 86400000);
  const h = Math.floor((ms % 86400000) / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h remaining`;
  if (h > 0) return `${h}h ${m}m remaining`;
  return `${m}m remaining`;
}

export default function StakingDashboard() {
  const { address, isConnected } = useAccount();
  const { open } = useAppKit();

  const [globalStats,   setGlobalStats]   = useState<GlobalStats | null>(null);
  const [stakeAmount,   setStakeAmount]   = useState('');
  const [statsLoading,  setStatsLoading]  = useState(true);
  const [txStep,        setTxStep]        = useState<'idle' | 'approving' | 'staking' | 'unstaking'>('idle');
  const [txError,       setTxError]       = useState<string | null>(null);
  const [txSuccess,     setTxSuccess]     = useState<string | null>(null);
  const [confirmedHash, setConfirmedHash] = useState<`0x${string}` | undefined>();
  const [now,           setNow]           = useState(Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/inquisitiveAI/staking');
      if (!res.ok) return;
      const d = await res.json();
      setGlobalStats({
        totalStaked:  d.global.totalStaked,
        totalStakers: d.global.totalStakers,
        apy:          d.global.apy,
        totalRewards: d.global.totalRewardsDistributed,
        stakingRatio: d.global.stakingRatio,
      });
    } catch {}
    finally { setStatsLoading(false); }
  }, []);

  useEffect(() => {
    fetchStats();
    const t = setInterval(fetchStats, 30000);
    return () => clearInterval(t);
  }, [fetchStats]);

  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: INQAI_ADDR,
    abi:     erc20Abi,
    functionName: 'balanceOf',
    args:    address ? [address] : undefined,
    query:   { enabled: !!address },
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: INQAI_ADDR,
    abi:     erc20Abi,
    functionName: 'allowance',
    args:    address && CONTRACT_LIVE ? [address, STAKING_ADDR] : undefined,
    query:   { enabled: !!address && CONTRACT_LIVE },
  });

  const { data: stakeInfo, refetch: refetchStake } = useReadContract({
    address:      CONTRACT_LIVE ? STAKING_ADDR : undefined,
    abi:          STAKING_ABI,
    functionName: 'getStakeInfo',
    args:         address ? [address] : undefined,
    query:        { enabled: !!address && CONTRACT_LIVE },
  });

  const { writeContractAsync: writeApprove } = useWriteContract();
  const { writeContractAsync: writeStake   } = useWriteContract();
  const { writeContractAsync: writeUnstake } = useWriteContract();
  // Rewards auto-distributed via FeeDistributor - no manual claiming needed

  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({ hash: confirmedHash });

  useEffect(() => {
    if (txConfirmed) {
      setTxSuccess('Transaction confirmed.');
      setTxStep('idle');
      refetchBalance();
      refetchAllowance();
      refetchStake();
      fetchStats();
      setTimeout(() => setTxSuccess(null), 8000);
    }
  }, [txConfirmed]);

  const balanceFmt   = balance ? formatUnits(balance as bigint, 18) : '0';
  const allowanceBig = (allowance as bigint | undefined) ?? 0n;
  const stakeAmtBig  = stakeAmount ? (() => { try { return parseUnits(stakeAmount, 18); } catch { return 0n; } })() : 0n;
  const needsApproval = CONTRACT_LIVE && stakeAmtBig > 0n && allowanceBig < stakeAmtBig;

  const userStaked    = stakeInfo ? formatUnits((stakeInfo as any)[0] as bigint, 18) : '0';
  const lockEndMs     = stakeInfo ? Number((stakeInfo as any)[2]) * 1000 : 0;
  const pendingReward = stakeInfo ? formatUnits((stakeInfo as any)[3] as bigint, 18) : '0';
  const canUnstake    = stakeInfo ? (stakeInfo as any)[4] as boolean : false;
  const msUntilUnlock = lockEndMs > now ? lockEndMs - now : 0;

  const isTxPending = txStep !== 'idle';

  const runTx = async (step: typeof txStep, fn: () => Promise<`0x${string}`>) => {
    setTxError(null);
    setTxStep(step);
    try {
      const hash = await fn();
      setConfirmedHash(hash);
    } catch (e: any) {
      const msg: string = e.shortMessage || e.message || '';
      setTxError(msg.toLowerCase().includes('rejected') || e.code === 4001 ? 'Transaction cancelled.' : msg.slice(0, 140));
      setTxStep('idle');
    }
  };

  const handleApprove = () => runTx('approving', () => writeApprove({ address: INQAI_ADDR, abi: erc20Abi, functionName: 'approve', args: [STAKING_ADDR, stakeAmtBig] }));
  const handleStake   = () => runTx('staking',   () => writeStake({ address: STAKING_ADDR, abi: STAKING_ABI, functionName: 'stake',  args: [stakeAmtBig] }));
  const handleUnstake = () => runTx('unstaking', () => writeUnstake({ address: STAKING_ADDR, abi: STAKING_ABI, functionName: 'unstake', args: [] }));
  // handleClaim removed - rewards auto-distributed via FeeDistributor

  const calcRow = (factor: number) => {
    if (!globalStats?.apy || !stakeAmount || !parseFloat(stakeAmount)) return '—';
    return (parseFloat(stakeAmount) * globalStats.apy / 100 * factor).toLocaleString('en-US', { maximumFractionDigits: 2 });
  };

  const S: React.CSSProperties = { fontFamily: 'system-ui,-apple-system,sans-serif', color: '#fff' };

  return (
    <div style={S}>

      {/* ── Stats Row ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 1, marginBottom: 1, background: 'rgba(255,255,255,0.05)' }}>
        {([
          { l: 'Total Staked',  v: statsLoading ? '…' : fmtInqai(globalStats?.totalStaked) + ' INQAI',              c: '#10b981' },
          { l: 'Current APY',   v: statsLoading ? '…' : (CONTRACT_LIVE ? (globalStats?.apy?.toFixed(1) ?? '0.0') : '—') + '%', c: '#10b981' },
          { l: 'Stakers',       v: statsLoading ? '…' : (globalStats?.totalStakers || 0).toLocaleString(),          c: '#a78bfa' },
          { l: 'Supply Staked', v: statsLoading ? '…' : (globalStats?.stakingRatio?.toFixed(1) ?? '0.0') + '%',     c: '#60a5fa' },
          { l: 'Rewards Paid',  v: statsLoading ? '…' : fmtInqai(globalStats?.totalRewards) + ' INQAI',             c: '#f59e0b' },
        ] as const).map(s => (
          <div key={s.l} style={{ background: 'rgba(13,13,32,0.97)', padding: '22px 24px' }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: s.c, fontFamily: 'monospace', letterSpacing: '-0.5px', marginBottom: 5 }}>{s.v}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* ── Main Panel ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'rgba(255,255,255,0.05)' }}>

        {/* LEFT — Stake Interface */}
        <div style={{ background: 'rgba(13,13,32,0.97)', padding: '32px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <Lock size={15} color="#10b981" />
            <span style={{ fontSize: 11, fontWeight: 800, color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Stake INQAI</span>
          </div>

          {!isConnected ? (
            <>
              <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, lineHeight: 1.7, marginBottom: 24 }}>
                Connect your wallet to stake INQAI and earn 60% of all protocol performance fees, distributed proportionally to all stakers.
              </p>
              <button onClick={() => open()} style={{ width: '100%', padding: '14px', borderRadius: 8, cursor: 'pointer', background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <Wallet size={15} /> Connect Wallet
              </button>
            </>
          ) : !CONTRACT_LIVE ? (
            <>
              <div style={{ background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.18)', borderRadius: 8, padding: '18px 20px', marginBottom: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#a78bfa', marginBottom: 6 }}>Staking Contract — Pending Deployment</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.65 }}>
                  The staking contract deploys at INQAI token launch. Set <code style={{ color: '#a78bfa', fontSize: 11 }}>NEXT_PUBLIC_STAKING_CONTRACT</code> once live to activate full staking UI.
                </div>
              </div>
              <div style={{ padding: '14px 16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Your INQAI Balance</div>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', fontFamily: 'monospace' }}>{parseFloat(balanceFmt).toLocaleString('en-US', { maximumFractionDigits: 2 })} INQAI</div>
              </div>
            </>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>Amount</label>
                <button onClick={() => setStakeAmount(parseFloat(balanceFmt).toString())} style={{ fontSize: 11, color: '#60a5fa', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                  Max: {parseFloat(balanceFmt).toLocaleString('en-US', { maximumFractionDigits: 2 })} INQAI
                </button>
              </div>
              <div style={{ position: 'relative', marginBottom: 14 }}>
                <input type="number" value={stakeAmount} onChange={e => setStakeAmount(e.target.value)} placeholder="0.00" style={{ width: '100%', padding: '14px 64px 14px 16px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 18, fontWeight: 700, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' }} />
                <span style={{ position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: 700 }}>INQAI</span>
              </div>

              {stakeAmount && parseFloat(stakeAmount) > 0 && (
                <div style={{ marginBottom: 14, padding: '10px 14px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.12)', borderRadius: 6, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>Est. yearly return @ {globalStats?.apy?.toFixed(1)}% APY</span>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>+{calcRow(1)} INQAI</span>
                </div>
              )}

              {needsApproval ? (
                <button onClick={handleApprove} disabled={isTxPending} style={{ width: '100%', padding: '13px', borderRadius: 8, cursor: isTxPending ? 'not-allowed' : 'pointer', background: isTxPending ? 'rgba(124,58,237,0.35)' : 'linear-gradient(135deg,#7c3aed,#4f46e5)', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700 }}>
                  {txStep === 'approving' ? '⏳ Approving…' : '✓ Approve INQAI'}
                </button>
              ) : (
                <button onClick={handleStake} disabled={isTxPending || !stakeAmount || parseFloat(stakeAmount) <= 0} style={{ width: '100%', padding: '13px', borderRadius: 8, cursor: (!stakeAmount || parseFloat(stakeAmount) <= 0 || isTxPending) ? 'not-allowed' : 'pointer', background: (!stakeAmount || parseFloat(stakeAmount) <= 0 || isTxPending) ? 'rgba(16,185,129,0.25)' : '#10b981', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700 }}>
                  {txStep === 'staking' ? '⏳ Staking…' : 'Stake INQAI'}
                </button>
              )}

              {txError   && <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 6, fontSize: 12, color: '#f87171' }}>{txError}</div>}
              {txSuccess && <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)', borderRadius: 6, fontSize: 12, color: '#10b981', display: 'flex', alignItems: 'center', gap: 8 }}><CheckCircle size={13} /> {txSuccess}{confirmedHash && <a href={`https://etherscan.io/tx/${confirmedHash}`} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', marginLeft: 4, display: 'flex' }}><ExternalLink size={11} /></a>}</div>}

              <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(255,255,255,0.02)', borderRadius: 6, fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                <span>Lock period: <strong style={{ color: 'rgba(255,255,255,0.6)' }}>30 days</strong></span>
                <span>Reward fee: <strong style={{ color: 'rgba(255,255,255,0.6)' }}>None</strong></span>
              </div>
            </>
          )}
        </div>

        {/* RIGHT — Your Position */}
        <div style={{ background: 'rgba(13,13,32,0.97)', padding: '32px 32px', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <Wallet size={15} color="#60a5fa" />
            <span style={{ fontSize: 11, fontWeight: 800, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Your Position</span>
          </div>

          {!isConnected ? (
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, lineHeight: 1.7 }}>Connect wallet to view your staking position, pending rewards, and unlock timer.</p>
          ) : !CONTRACT_LIVE ? (
            <div>
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Protocol Fee Allocation</div>
                <div style={{ fontSize: 40, fontWeight: 900, color: '#10b981', fontFamily: 'monospace' }}>60%</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 4 }}>of all performance fees go to stakers</div>
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 18 }}>
                {[
                  { l: 'Reward mechanism',  v: 'FeeDistributor auto-buybacks'    },
                  { l: 'Distribution',      v: 'Proportional to stake size'      },
                  { l: 'Automation',        v: 'Chainlink Automation — zero key' },
                  { l: 'Lock period',       v: '30 days from stake date'         },
                  { l: 'Performance fee',   v: '15% of vault gains (60%→stakers)' },
                ].map(r => (
                  <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 13 }}>
                    <span style={{ color: 'rgba(255,255,255,0.38)' }}>{r.l}</span>
                    <span style={{ color: '#fff', fontWeight: 600 }}>{r.v}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : parseFloat(userStaked) > 0 ? (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div style={{ padding: '16px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.12)', borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>Staked</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', fontFamily: 'monospace' }}>{parseFloat(userStaked).toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>INQAI</div>
                </div>
                <div style={{ padding: '16px', background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.12)', borderRadius: 8 }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 5 }}>Lifetime Rewards</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#a78bfa', fontFamily: 'monospace' }}>{parseFloat(pendingReward).toLocaleString('en-US', { maximumFractionDigits: 4 })}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>INQAI auto-received</div>
                </div>
              </div>

              <div style={{ padding: '12px 16px', background: canUnstake ? 'rgba(16,185,129,0.06)' : 'rgba(245,158,11,0.06)', border: `1px solid ${canUnstake ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)'}`, borderRadius: 8, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Clock size={13} color={canUnstake ? '#10b981' : '#f59e0b'} />
                  <span style={{ fontSize: 13, color: canUnstake ? '#10b981' : '#f59e0b', fontWeight: 700 }}>{canUnstake ? 'Unlocked' : 'Lock Active'}</span>
                </div>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>{formatCountdown(msUntilUnlock)}</span>
              </div>

              {/* Autonomous model: rewards auto-distributed via FeeDistributor buybacks */}
              <button onClick={handleUnstake} disabled={!canUnstake || isTxPending} style={{ width: '100%', padding: '12px', borderRadius: 8, cursor: (!canUnstake || isTxPending) ? 'not-allowed' : 'pointer', background: (!canUnstake || isTxPending) ? 'rgba(239,68,68,0.18)' : '#ef4444', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700 }}>
                {txStep === 'unstaking' ? '⏳ Unstaking…' : 'Unstake All'}
              </button>
              <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.12)', borderRadius: 6, fontSize: 11, color: '#10b981', textAlign: 'center' }}>
                ✓ Rewards auto-distributed via FeeDistributor buybacks
              </div>

              {txError   && <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.18)', borderRadius: 6, fontSize: 12, color: '#f87171' }}>{txError}</div>}
              {txSuccess && <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(16,185,129,0.07)', border: '1px solid rgba(16,185,129,0.18)', borderRadius: 6, fontSize: 12, color: '#10b981', display: 'flex', alignItems: 'center', gap: 8 }}><CheckCircle size={13} /> {txSuccess}{confirmedHash && <a href={`https://etherscan.io/tx/${confirmedHash}`} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', marginLeft: 4, display: 'flex' }}><ExternalLink size={11} /></a>}</div>}
            </>
          ) : (
            <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 13, lineHeight: 1.7 }}>You have no active staking position. Enter an amount on the left and stake INQAI to start earning protocol fees.</p>
          )}
        </div>
      </div>

      {/* ── Rewards Calculator ─────────────────────────────────────────────── */}
      <div style={{ background: 'rgba(13,13,32,0.97)', marginTop: 1, padding: '28px 32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <TrendingUp size={15} color="#a78bfa" />
          <span style={{ fontSize: 11, fontWeight: 800, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Rewards Calculator</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 24, alignItems: 'start' }}>
          <div>
            <label style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 8 }}>Stake Amount (INQAI)</label>
            <input type="number" value={stakeAmount} onChange={e => setStakeAmount(e.target.value)} placeholder="Enter amount…" style={{ width: '100%', padding: '11px 14px', borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#fff', fontSize: 14, fontFamily: 'monospace', outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            {([['Daily', 1/365], ['Monthly', 1/12], ['Yearly', 1]] as const).map(([label, f]) => (
              <div key={label} style={{ padding: '16px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 8 }}>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#10b981', fontFamily: 'monospace' }}>+{calcRow(f)}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>INQAI</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div style={{ background: 'rgba(13,13,32,0.97)', marginTop: 1, padding: '14px 32px', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: CONTRACT_LIVE ? '#10b981' : '#f59e0b', boxShadow: `0 0 6px ${CONTRACT_LIVE ? '#10b981' : '#f59e0b'}` }} />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Staking: {CONTRACT_LIVE ? 'Live' : 'Pending deployment'}</span>
        </div>
        {CONTRACT_LIVE && <a href={`https://etherscan.io/address/${STAKING_ADDR}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#60a5fa', fontFamily: 'monospace', textDecoration: 'none' }}>{STAKING_ADDR.slice(0,6)}…{STAKING_ADDR.slice(-4)} <ExternalLink size={10} /></a>}
        <a href={`https://etherscan.io/token/${INQAI_ADDR}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#60a5fa', fontFamily: 'monospace', textDecoration: 'none' }}>INQAI: {INQAI_ADDR.slice(0,6)}…{INQAI_ADDR.slice(-4)} <ExternalLink size={10} /></a>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)', marginLeft: 'auto' }}>Powered by Chainlink Automation · No private keys</span>
      </div>
    </div>
  );
}
