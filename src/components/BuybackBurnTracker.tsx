import React, { useState, useEffect, useCallback } from 'react';
import { useReadContract } from 'wagmi';
import { erc20Abi, formatUnits } from 'viem';
import { Flame, TrendingUp, PiggyBank, Activity, ArrowUpRight, ExternalLink } from 'lucide-react';

const INQAI_ADDR = '0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5' as `0x${string}`;
const DEAD_ADDR  = '0x000000000000000000000000000000000000dEaD' as `0x${string}`;
const DIST_CONTRACT = (process.env.NEXT_PUBLIC_FEE_DISTRIBUTOR || '0x0d6aed33e80bc541904906d73ba4bfe18c730a09') as `0x${string}`;
const DIST_LIVE = DIST_CONTRACT !== '0x0000000000000000000000000000000000000000';

interface FeeData {
  fees: {
    totalCollected: string;
    pendingDistribution: string;
    distributionCount: number;
  };
  distribution: {
    buybacks: { eth: string; percentage: number; destination: string };
    burns:    { eth: string; percentage: number; destination: string };
    treasury: { eth: string; percentage: number; destination: string };
  };
  token: {
    totalSupply: string;
    burned: string;
    circulating: string;
    burnPercentage: number;
  };
}

export default function BuybackBurnTracker() {
  const [data,    setData]    = useState<FeeData | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Live on-chain reads from INQAI token contract ──────────────────────────
  const { data: totalSupplyRaw } = useReadContract({ address: INQAI_ADDR, abi: erc20Abi, functionName: 'totalSupply' });
  const { data: burnedRaw       } = useReadContract({ address: INQAI_ADDR, abi: erc20Abi, functionName: 'balanceOf', args: [DEAD_ADDR] });

  const totalSupplyLive  = totalSupplyRaw ? parseFloat(formatUnits(totalSupplyRaw as bigint, 18)) : 100_000_000;
  const burnedLive       = burnedRaw      ? parseFloat(formatUnits(burnedRaw      as bigint, 18)) : 0;
  const circulatingLive  = totalSupplyLive - burnedLive;
  const burnPctLive      = totalSupplyLive > 0 ? (burnedLive / totalSupplyLive) * 100 : 0;

  const fetchFeeData = useCallback(async () => {
    try {
      const res = await fetch('/api/inquisitiveAI/fees');
      if (!res.ok) return;
      setData(await res.json());
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    fetchFeeData();
    const t = setInterval(fetchFeeData, 60000);
    return () => clearInterval(t);
  }, [fetchFeeData]);

  return (
    <div style={{ fontFamily: 'Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', color: '#f4f4f5' }}>

      {/* ── Token Supply Stats (live on-chain) ────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, marginBottom: 1, background: 'rgba(255,255,255,0.05)' }}>
        {([
          { l: 'Total Supply',   v: (totalSupplyLive / 1e6).toFixed(0) + 'M INQAI',                                          c: '#fff'    },
          { l: 'Circulating',    v: circulatingLive.toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' INQAI',         c: '#60a5fa' },
          { l: 'INQAI Burned',   v: burnedLive.toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' INQAI',              c: '#ef4444' },
          { l: 'Supply Burned',  v: burnPctLive.toFixed(4) + '%',                                                              c: '#f97316' },
        ] as const).map(s => (
          <div key={s.l} style={{ background: '#1a1a1f', padding: '22px 24px' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: s.c, fontFamily: 'monospace', letterSpacing: '-0.5px', marginBottom: 5 }}>{s.v}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700 }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* ── Main Panel ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, background: 'rgba(255,255,255,0.05)' }}>

        {/* LEFT — Fee Distribution */}
        <div style={{ background: '#1a1a1f', padding: '28px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <Activity size={15} color="#ef4444" />
            <span style={{ fontSize: 11, fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Fee Distribution</span>
          </div>

          {/* Distribution rows */}
          {[
            { label: 'Open-Market INQAI Buybacks', pct: 60, color: '#10b981', ethVal: data?.distribution.buybacks.eth },
            { label: 'Permanent Burns',             pct: 20, color: '#ef4444', ethVal: data?.distribution.burns.eth    },
            { label: 'INQAI Staker Rewards',        pct: 15, color: '#3b82f6', ethVal: data?.distribution.treasury.eth },
            { label: 'Chainlink & Operations',      pct: 5,  color: '#f59e0b', ethVal: '0' },
          ].map(r => (
            <div key={r.label} style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 3, height: 14, background: r.color, borderRadius: 2 }} />
                  <span style={{ color: 'rgba(255,255,255,0.65)', fontWeight: 600 }}>{r.label}</span>
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <span style={{ color: r.color, fontWeight: 800, fontFamily: 'monospace' }}>{r.pct}%</span>
                  <span style={{ color: 'rgba(255,255,255,0.35)', fontFamily: 'monospace' }}>{parseFloat(r.ethVal || '0').toFixed(4)} ETH</span>
                </div>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${r.pct}%`, background: r.color, borderRadius: 3, transition: 'width 1s ease' }} />
              </div>
            </div>
          ))}

          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 20, marginTop: 4 }}>
            {[
              { l: 'Total Fees Collected',  v: parseFloat(data?.fees.totalCollected  || '0').toFixed(4) + ' ETH' },
              { l: 'Pending Distribution',  v: parseFloat(data?.fees.pendingDistribution || '0').toFixed(4) + ' ETH' },
              { l: 'Distribution Events',   v: (data?.fees.distributionCount || 0).toLocaleString() },
            ].map(r => (
              <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 13 }}>
                <span style={{ color: 'rgba(255,255,255,0.38)' }}>{r.l}</span>
                <span style={{ color: '#fff', fontWeight: 700, fontFamily: 'monospace' }}>{r.v}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT — Token Supply */}
        <div style={{ background: '#1a1a1f', padding: '28px 32px', borderLeft: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <Flame size={15} color="#ef4444" />
            <span style={{ fontSize: 11, fontWeight: 800, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Token Supply — Live On-Chain</span>
          </div>

          {/* Circulating vs Burned visual */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, fontSize: 12 }}>
              <span style={{ color: 'rgba(255,255,255,0.4)' }}>Circulating supply</span>
              <span style={{ color: '#60a5fa', fontFamily: 'monospace', fontWeight: 700 }}>{((circulatingLive / totalSupplyLive) * 100).toFixed(2)}%</span>
            </div>
            <div style={{ height: 20, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
              <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${(circulatingLive / totalSupplyLive) * 100}%`, background: 'linear-gradient(90deg,#3b82f6,#60a5fa)', borderRadius: 4 }} />
              <div style={{ position: 'absolute', right: 0, top: 0, height: '100%', width: `${burnPctLive}%`, background: 'linear-gradient(90deg,#ef4444,#f97316)', borderRadius: 4 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11 }}>
              <span style={{ color: '#60a5fa' }}>Circulating: {circulatingLive.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
              <span style={{ color: '#ef4444' }}>Burned: {burnedLive.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
            </div>
          </div>

          {[
            { l: 'Total Supply',        v: totalSupplyLive.toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' INQAI', c: '#fff'    },
            { l: 'Circulating Supply',  v: circulatingLive.toLocaleString('en-US',  { maximumFractionDigits: 0 }) + ' INQAI', c: '#60a5fa' },
            { l: 'Burned (dEaD addr)',  v: burnedLive.toLocaleString('en-US',       { maximumFractionDigits: 0 }) + ' INQAI', c: '#ef4444' },
            { l: 'Burn %',              v: burnPctLive.toFixed(4) + '%',                                                       c: '#f97316' },
          ].map(r => (
            <div key={r.l} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 13 }}>
              <span style={{ color: 'rgba(255,255,255,0.38)' }}>{r.l}</span>
              <span style={{ color: r.c, fontWeight: 700, fontFamily: 'monospace' }}>{r.v}</span>
            </div>
          ))}

          <div style={{ marginTop: 20 }}>
            <a href={`https://etherscan.io/token/${INQAI_ADDR}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#60a5fa', textDecoration: 'none', fontWeight: 600 }}>
              View INQAI on Etherscan <ExternalLink size={12} />
            </a>
            <a href={`https://etherscan.io/token/${INQAI_ADDR}?a=${DEAD_ADDR}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#ef4444', textDecoration: 'none', fontWeight: 600, marginTop: 8 }}>
              View burn address <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div style={{ background: '#1a1a1f', marginTop: 1, padding: '14px 32px', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: DIST_LIVE ? '#10b981' : '#f59e0b', boxShadow: `0 0 6px ${DIST_LIVE ? '#10b981' : '#f59e0b'}` }} />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Fee Distributor: {DIST_LIVE ? 'Live' : 'Pending deployment'}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Token supply reads: Live on-chain</span>
        </div>
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.18)', marginLeft: 'auto' }}>15% performance fee · 60% buybacks · 20% burn · 15% stakers · 5% operations</span>
      </div>
    </div>
  );
}
