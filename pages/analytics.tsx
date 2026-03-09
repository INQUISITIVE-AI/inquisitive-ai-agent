import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { useAccount } from 'wagmi';
import { BarChart3, Brain, DollarSign, Target, Flame, Bot, TrendingUp, TrendingDown, Scale, Wallet } from 'lucide-react';

const WalletButton   = dynamic(() => import('../src/components/WalletButton'),  { ssr: false });
const PortfolioChart = dynamic(() => import('../src/components/charts/LiveCharts').then(m => m.PortfolioChart), { ssr: false });
const CategoryDonut  = dynamic(() => import('../src/components/charts/LiveCharts').then(m => m.CategoryDonut),  { ssr: false });
const ConfidenceRing = dynamic(() => import('../src/components/charts/LiveCharts').then(m => m.ConfidenceRing), { ssr: false });

const INQAI_TOKEN = { presalePrice: 8, targetPrice: 15 }; // Simplified config

const fmtUsd = (n: number) => {
  if (!n && n !== 0) return '—';
  if (n >= 1e9)  return '$' + (n/1e9).toFixed(2)  + 'B';
  if (n >= 1e6)  return '$' + (n/1e6).toFixed(2)  + 'M';
  if (n >= 1e3)  return '$' + (n/1e3).toFixed(1)  + 'K';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const fmtN = (n: number, d = 2) => n?.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) ?? '—';
const pct  = (n: number) => `${n >= 0 ? '+' : ''}${(n * 100).toFixed(2)}%`;
const grc  = (n: number) => n >= 0 ? '#10b981' : '#ef4444';

const NAV_LINKS = [
  { l: 'AI Analytics', p: '/dashboard', accent: false },
  { l: 'Portfolio',    p: '/analytics', accent: true  },
  { l: 'Docs',         p: '/help',      accent: false },
];

export default function AnalyticsPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const [data, setData]         = useState<any>(null);
  const [equity, setEquity]     = useState<any[]>([]);
  const [categories, setCats]   = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setTab]     = useState<'overview' | 'ai' | 'fees'>('overview');
  const [timeframe, setTimeframe] = useState<'24H' | '7D' | '30D' | 'All'>('7D');
  const [purchases, setPurchases] = useState<any[]>([]);

  // Load purchases from localStorage
  useEffect(() => {
    if (address) {
      const userPurchases = JSON.parse(localStorage.getItem('inqai_purchases') || '[]')
        .filter((p: any) => p.address?.toLowerCase() === address.toLowerCase());
      setPurchases(userPurchases);
    }
  }, [address]);

  const load = useCallback(async () => {
    try {
      const [dd, dr, er, cr] = await Promise.allSettled([
        fetch('/api/dashboard'),
        fetch('/api/inquisitiveAI/dashboard'),
        fetch('/api/inquisitiveAI/chart/portfolio'),
        fetch('/api/inquisitiveAI/chart/categories'),
      ]);

      // Parse fallback once and reuse (avoids double-read bug)
      let fallback: any = null;
      if (dd.status === 'fulfilled' && dd.value.ok) {
        fallback = await dd.value.json();
        setData((prev: any) => ({ ...prev, ...fallback, aiSignals: { ...prev?.aiSignals, ...fallback.aiSignals } }));
      }

      // Secondary endpoint merges — preserve existing signals if secondary has empty topBuys
      if (dr.status === 'fulfilled' && dr.value.ok) {
        const d = await dr.value.json();
        setData((prev: any) => ({ ...prev, ...d, aiSignals: { ...prev?.aiSignals, ...d.aiSignals } }));
      }

      if (er.status === 'fulfilled' && er.value.ok) {
        const d = await er.value.json();
        setEquity(d.curve || []);
      }
      if (cr.status === 'fulfilled' && cr.value.ok) {
        const d = await cr.value.json();
        setCats(d.categories || []);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);

  const regime   = data?.risk?.regime || '—';
  const fg       = data?.risk?.fearGreed?.value ?? data?.macro?.fearGreed?.value ?? '—';
  const fgLabel  = data?.risk?.fearGreed?.valueClassification || data?.macro?.fearGreed?.valueClassification || '';
  const cycles   = data?.aiSignals?.cycleCount || 0;
  const buys     = data?.aiSignals?.buys   || 0;
  const sells    = data?.aiSignals?.sells  || 0;
  const topBuys  = data?.aiSignals?.topBuys || [];
  const riskScore = data?.risk?.riskScore || 0;
  const regimeCol = regime === 'BULL' ? '#10b981' : regime === 'BEAR' ? '#ef4444' : '#f59e0b';

  const portfolioValue = data?.portfolio?.totalValue || 0;
  const totalPnL  = data?.performance?.totalPnL || 0;
  const roiPct    = portfolioValue > 0 && totalPnL !== 0 ? totalPnL / (portfolioValue - totalPnL) : 0;
  
  // Calculate user's INQAI holdings
  const totalInqaiHolding = purchases.reduce((sum, p) => sum + p.amount, 0);
  const totalUsdInvested = purchases.reduce((sum, p) => sum + p.usdAmount, 0);
  const currentValue = totalInqaiHolding * INQAI_TOKEN.presalePrice; // Using presale price for now

  // ── MAIN ANALYTICS ─────────────────────────────────────────
  return (
    <>
      <Head>
        <title>Analytics | INQUISITIVE</title>
        <meta name="description" content="INQAI token holder analytics — portfolio performance, AI agent activity, fee distribution, and real-time market data." />
      </Head>
      <div style={{ minHeight: '100vh', background: '#07071a', color: '#fff', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' }}>
        <div className="mesh-bg" />

        {/* NAV */}
        <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(7,7,26,0.92)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.05)', height: 60, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 8 }}>
          <button onClick={() => router.push('/')} style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', marginRight: 24, padding: 0 }}>
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
          <div style={{ marginLeft: 'auto' }}>
            <WalletButton label="Connect Wallet" />
          </div>
        </nav>

        <div style={{ padding: '28px 24px 80px', position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>

            {/* Page header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 4 }}>Analytics</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
                  {address ? address.slice(0,8) + '...' + address.slice(-6) + ' · ' : ''}
                  Token Value · Self-Custodied
                </div>
              </div>
            </div>

            {/* KPI row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 24 }}>
              {[
                { icon: 'vault', label: 'Portfolio Value',   val: fmtUsd(portfolioValue),   sub: `${(data?.portfolio?.assetCount||0)} assets backed`, col: '#60a5fa' },
                { icon: 'target', label: 'Total P&L',        val: fmtUsd(totalPnL),         sub: totalPnL !== 0 ? pct(roiPct) + ' ROI' : 'Accumulating', col: grc(totalPnL) },
                { icon: 'target', label: 'Win Rate',         val: `${((data?.performance?.winRate||0)*100).toFixed(1)}%`, sub: `${data?.performance?.totalTrades||0} trades`, col: '#a78bfa' },
                { icon: 'flame', label: 'Target APY',       val: '18.5%',                  sub: 'AI multi-strategy', col: '#f59e0b' },
                { icon: 'bot', label: 'AI Regime',        val: regime,                   sub: `Risk score: ${(riskScore*100).toFixed(0)}%`, col: regimeCol },
              ].map(m => (
                <div key={m.label} style={{ background: 'rgba(13,13,32,0.8)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 16, padding: '18px 16px', backdropFilter: 'blur(12px)' }}>
                  <div style={{ marginBottom: 8, display:'flex', justifyContent:'center' }}>
                    {m.icon==='vault'&&<DollarSign size={22} color={m.col} strokeWidth={2} />}
                    {m.icon==='target'&&<Target size={22} color={m.col} strokeWidth={2} />}
                    {m.icon==='flame'&&<Flame size={22} color={m.col} strokeWidth={2} />}
                    {m.icon==='bot'&&<Bot size={22} color={m.col} strokeWidth={2} />}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: m.col, fontFamily: 'monospace', lineHeight: 1.2 }}>{m.val}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>{m.label}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', marginTop: 2 }}>{m.sub}</div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 0 }}>
              {(['overview','ai','fees'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    padding: '10px 20px', fontSize: 13, fontWeight: activeTab === t ? 700 : 500, cursor: 'pointer',
                    background: 'none', border: 'none', borderBottom: `2px solid ${activeTab === t ? '#7c3aed' : 'transparent'}`,
                    color: activeTab === t ? '#a78bfa' : 'rgba(255,255,255,0.4)', transition: 'all 0.15s',
                    textTransform: 'capitalize',
                  }}
                >
                  {{ overview: 'Overview', ai: 'AI Activity', fees: 'Fee Flow' }[t]}
                </button>
              ))}
            </div>

            {/* ── TAB: OVERVIEW ── */}
            {activeTab === 'overview' && (
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.1fr', gap: 20 }}>
                {/* Left column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                  {/* Equity curve */}
                  <div style={{ background: 'rgba(13,13,32,0.8)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 20, padding: '22px', backdropFilter: 'blur(12px)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.75)' }}>Portfolio Performance</h3>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {(['24H','7D','30D','All'] as const).map(r => (
                          <button 
                            key={r} 
                            onClick={() => setTimeframe(r)}
                            style={{
                              padding: '3px 10px', borderRadius: 7, fontSize: 10, fontWeight: 600, cursor: 'pointer',
                              background: r === timeframe ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.04)',
                              border: `1px solid ${r === timeframe ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.07)'}`,
                              color: r === timeframe ? '#a78bfa' : 'rgba(255,255,255,0.35)',
                              transition: 'all 0.2s',
                            }}
                          >{r}</button>
                        ))}
                      </div>
                    </div>
                    <PortfolioChart data={equity} height={200} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
                      <span>Token value: {fmtUsd(portfolioValue)}</span>
                      <span style={{ color: grc(totalPnL), fontWeight: 700 }}>P&L: {fmtUsd(totalPnL)}{totalPnL !== 0 ? ` (${pct(roiPct)})` : ''}</span>
                    </div>
                  </div>

                  {/* User Holdings */}
                  <div style={{ background: 'rgba(13,13,32,0.8)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 20, padding: '22px', backdropFilter: 'blur(12px)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                      <Wallet size={18} color="#a78bfa" strokeWidth={1.8} />
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.75)' }}>Your INQAI Holdings</h3>
                    </div>
                    {purchases.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '20px', color: 'rgba(255,255,255,0.35)' }}>
                        <div style={{ fontSize: 12 }}>No INQAI tokens yet</div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                          <div style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 12, padding: '12px' }}>
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Total Tokens</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: '#a78bfa' }}>{totalInqaiHolding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                          </div>
                          <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: '12px' }}>
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Current Value</div>
                            <div style={{ fontSize: 18, fontWeight: 800, color: '#10b981' }}>{fmtUsd(currentValue)}</div>
                          </div>
                        </div>
                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginBottom: 8 }}>Recent Purchases</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          {purchases.slice(-3).reverse().map((p, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, fontSize: 11 }}>
                              <div>
                                <span style={{ color: '#a78bfa', fontWeight: 600 }}>{p.amount.toLocaleString()} INQAI</span>
                                <span style={{ color: 'rgba(255,255,255,0.35)', marginLeft: 8 }}>for {fmtUsd(p.usdAmount)}</span>
                              </div>
                              <div style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>
                                {new Date(p.timestamp).toLocaleDateString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Strategy breakdown */}
                  <div style={{ background: 'rgba(13,13,32,0.8)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 20, padding: '22px', backdropFilter: 'blur(12px)' }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.75)', marginBottom: 16 }}>AI Strategy Deployment</h3>
                    {[
                      { label: 'Core Holdings (BTC·ETH·SOL)', pct: 38, col: '#3b82f6',  detail: 'Blue-chip accumulation — low risk, high conviction' },
                      { label: 'DeFi & AI Protocols',          pct: 20, col: '#7c3aed',  detail: 'High-growth sector exposure with staking yield' },
                      { label: 'Lending & Borrowing',          pct: 14, col: '#0ea5e9',  detail: 'Aave V3 / Morpho Blue — earn spread on collateral' },
                      { label: 'Liquid Staking',               pct: 10, col: '#f59e0b',  detail: 'JitoSOL, JUPSOL — auto-compounding SOL yield' },
                      { label: 'Layer 2 & Interop',            pct: 10, col: '#06b6d4',  detail: 'ARB, OP, STRK, ZRO — scaling infrastructure' },
                      { label: 'Stablecoins & RWA',            pct: 8,  col: '#10b981',  detail: 'USDC, PAXG, ONDO — capital preservation base' },
                    ].map(s => (
                      <div key={s.label} style={{ marginBottom: 14 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                          <span style={{ fontSize: 12, fontWeight: 600 }}>{s.label}</span>
                          <span style={{ fontSize: 12, fontWeight: 800, color: s.col, fontFamily: 'monospace' }}>{s.pct}%</span>
                        </div>
                        <div style={{ height: 5, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${s.pct * 2.5}%`, background: s.col, borderRadius: 3, transition: 'width 0.8s ease' }} />
                        </div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>{s.detail}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {/* Category donut */}
                  <div style={{ background: 'rgba(13,13,32,0.8)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 20, padding: '22px', backdropFilter: 'blur(12px)' }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.75)', marginBottom: 16 }}>Market Allocation</h3>
                    <CategoryDonut data={categories} size={180} />
                  </div>

                  {/* Equity summary */}
                  <div style={{ background: 'rgba(13,13,32,0.8)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 20, padding: '22px', backdropFilter: 'blur(12px)' }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.75)', marginBottom: 16 }}>Performance Summary</h3>
                    {[
                      { label: 'Total Trades',   val: String(data?.performance?.totalTrades || 0) },
                      { label: 'Win Rate',        val: `${((data?.performance?.winRate||0)*100).toFixed(1)}%` },
                      { label: 'Avg Win',         val: fmtUsd(data?.performance?.avgWin || 0) },
                      { label: 'Avg Loss',        val: fmtUsd(data?.performance?.avgLoss || 0) },
                      { label: 'Portfolio Heat',  val: `${((data?.risk?.portfolioHeat||0)*100).toFixed(1)}%` },
                      { label: 'Max Drawdown',    val: `${((data?.risk?.drawdown||0)*100).toFixed(1)}%` },
                    ].map(r => (
                      <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{r.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'monospace' }}>{r.val}</span>
                      </div>
                    ))}
                    <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 10 }}>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>Total P&L</div>
                      <div style={{ fontSize: 16, fontWeight: 900, color: grc(totalPnL), fontFamily: 'monospace' }}>{fmtUsd(totalPnL)}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ── TAB: AI ACTIVITY ── */}
            {activeTab === 'ai' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Live metrics */}
                <div style={{ background: 'rgba(13,13,32,0.8)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 20, padding: '24px', backdropFilter: 'blur(12px)' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.75)', marginBottom: 20 }}>AI Agent Live Metrics</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
                    {[
                      { label: 'Brain Cycles', val: cycles.toLocaleString(), col: '#a78bfa', icon: 'brain' },
                      { label: 'Buy Signals',  val: buys,   col: '#10b981', icon: 'up' },
                      { label: 'Sell Signals', val: sells,  col: '#ef4444', icon: 'down' },
                      { label: 'Regime',       val: regime, col: regimeCol, icon: regime==='BULL'?'up':regime==='BEAR'?'down':'scale' },
                      { label: 'Fear & Greed', val: fg,     col: typeof fg==='number'&&fg<30?'#ef4444':typeof fg==='number'&&fg>70?'#10b981':'#f59e0b', icon: 'brain' },
                      { label: 'Active Assets',val: data?.portfolio?.assetCount||65, col: '#60a5fa', icon: 'target' },
                    ].map(m => (
                      <div key={m.label} style={{ textAlign: 'center', padding: '16px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12 }}>
                        <div style={{ marginBottom: 6, display:'flex', justifyContent:'center' }}>
                          {m.icon==='brain'&&<Brain size={22} color={m.col} strokeWidth={1.8} />}
                          {m.icon==='up'&&<TrendingUp size={22} color={m.col} strokeWidth={1.8} />}
                          {m.icon==='down'&&<TrendingDown size={22} color={m.col} strokeWidth={1.8} />}
                          {m.icon==='scale'&&<Scale size={22} color={m.col} strokeWidth={1.8} />}
                          {m.icon==='target'&&<Target size={22} color={m.col} strokeWidth={1.8} />}
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 900, color: m.col, fontFamily: 'monospace' }}>{m.val}</div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 3 }}>{m.label}</div>
                      </div>
                    ))}
                  </div>
                  {fgLabel && (
                    <div style={{ marginTop: 14, padding: '8px 14px', background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.15)', borderRadius: 10, fontSize: 12, color: '#fbbf24', textAlign: 'center' }}>
                      Market Sentiment: <strong>{fgLabel}</strong>
                    </div>
                  )}
                </div>

                {/* AI confidence rings */}
                <div style={{ background: 'rgba(13,13,32,0.8)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 20, padding: '24px', backdropFilter: 'blur(12px)' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.75)', marginBottom: 20 }}>Intelligence Engine Confidence</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 20, placeItems: 'center' }}>
                    {(() => {
                      const comps = topBuys[0]?.components || {};
                      return [
                        { label: 'Pattern',   val: comps.patternEngine   || 0.72, col: '#3b82f6' },
                        { label: 'Reasoning', val: comps.reasoningEngine || 0.68, col: '#10b981' },
                        { label: 'Portfolio', val: comps.portfolioEngine || 0.65, col: '#ef4444' },
                        { label: 'Learning',  val: comps.learningEngine  || 0.70, col: '#f97316' },
                      ];
                    })().map(m => (
                      <div key={m.label} style={{ textAlign: 'center' }}>
                        <ConfidenceRing value={m.val} color={m.col} label={m.label} size={80} />
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop: 18, padding: '10px 14px', background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.18)', borderRadius: 10, fontSize: 11, color: 'rgba(251,191,36,0.8)', textAlign: 'center' }}>
                    Minimum 70% confidence required to execute a trade
                  </div>
                </div>

                {/* Top AI signals */}
                <div style={{ background: 'rgba(13,13,32,0.8)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 20, padding: '24px', backdropFilter: 'blur(12px)', gridColumn: '1 / -1' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.75)', marginBottom: 16 }}>Top AI Signals — Cycle #{cycles}</h3>
                  {topBuys.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                      {topBuys.slice(0, 8).map((s: any, i: number) => (
                        <div key={s.symbol} style={{ padding: '12px 14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontWeight: 800, fontSize: 14 }}>{s.symbol}</span>
                            <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 100, background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.2)', fontWeight: 700 }}>{s.action}</span>
                          </div>
                          <div style={{ fontFamily: 'monospace', fontSize: 16, fontWeight: 900, color: '#a78bfa' }}>{(s.finalScore*100).toFixed(0)}%</div>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>AI confidence score</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '30px', color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
                      Waiting for next AI cycle...
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── TAB: FEES ── */}
            {activeTab === 'fees' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                {/* Fee breakdown */}
                <div style={{ background: 'rgba(13,13,32,0.8)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 20, padding: '24px', backdropFilter: 'blur(12px)' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.75)', marginBottom: 20 }}>Fee Summary (YTD)</h3>
                  {[
                    { label: 'Performance Fee (15% flat on yields)', val: Math.max(0, totalPnL) * 0.15, col: '#a78bfa', desc: '15% of all yields — no management fee, no deposit/withdrawal fee' },
                  ].map(f => (
                    <div key={f.label} style={{ padding: '14px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 12, marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700 }}>{f.label}</div>
                          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{f.desc}</div>
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 900, color: f.col, fontFamily: 'monospace' }}>{fmtUsd(f.val)}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Fee allocation */}
                <div style={{ background: 'rgba(13,13,32,0.8)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 20, padding: '24px', backdropFilter: 'blur(12px)' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.75)', marginBottom: 20 }}>Fee Allocation</h3>
                  {(() => {
                    const totalFees = Math.max(0, totalPnL) * 0.15;
                    return [
                      { label: 'Buybacks (60%)',  val: totalFees * 0.60, col: '#10b981', pct: 60, desc: 'INQAI bought on open market → creates buy pressure' },
                      { label: 'Burns (20%)',     val: totalFees * 0.20, col: '#ef4444', pct: 20, desc: 'INQAI permanently destroyed → reduces supply' },
                      { label: 'Treasury (20%)', val: totalFees * 0.20, col: '#f59e0b', pct: 20, desc: 'Protocol reserves for development & security' },
                    ];
                  })().map(f => (
                    <div key={f.label} style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <div>
                          <span style={{ fontSize: 12, fontWeight: 700 }}>{f.label}</span>
                          <span style={{ marginLeft: 8, fontSize: 14, fontWeight: 900, color: f.col, fontFamily: 'monospace' }}>{fmtUsd(f.val)}</span>
                        </div>
                      </div>
                      <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${f.pct}%`, background: f.col, borderRadius: 2, transition: 'width 0.8s ease' }} />
                      </div>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 4 }}>{f.desc}</div>
                    </div>
                  ))}
                </div>

                {/* Tokenomics summary */}
                <div style={{ gridColumn: '1 / -1', background: 'rgba(13,13,32,0.8)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 20, padding: '24px', backdropFilter: 'blur(12px)' }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: 'rgba(255,255,255,0.75)', marginBottom: 20 }}>Tokenomics at a Glance</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
                    {[
                      { icon: 'supply', label: 'Total Supply',   val: '100,000,000', sub: 'Fixed — never changes',    col: '#fff'    },
                      { icon: 'price',  label: 'Presale Price',  val: '$8.00',       sub: '47% below target',          col: '#a78bfa' },
                      { icon: 'target', label: 'Target Price',   val: '$15.00',      sub: '$1.5B target market cap',  col: '#60a5fa' },
                      { icon: 'apy',    label: 'Target APY',     val: '18.5%',       sub: 'AI-managed multi-strategy', col: '#10b981' },
                    ].map(t => (
                      <div key={t.label} style={{ textAlign: 'center', padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: 14, border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ marginBottom: 8, display:'flex', justifyContent:'center' }}>
                          {t.icon==='supply'&&<Flame size={28} color={t.col} strokeWidth={1.5} />}
                          {t.icon==='price'&&<DollarSign size={28} color={t.col} strokeWidth={1.5} />}
                          {t.icon==='target'&&<Target size={28} color={t.col} strokeWidth={1.5} />}
                          {t.icon==='apy'&&<TrendingUp size={28} color={t.col} strokeWidth={1.5} />}
                        </div>
                        <div style={{ fontSize: 18, fontWeight: 900, color: t.col, fontFamily: 'monospace' }}>{t.val}</div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginTop: 3 }}>{t.label}</div>
                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>{t.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
