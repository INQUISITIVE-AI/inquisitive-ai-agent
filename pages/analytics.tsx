import { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { useAccount, useReadContract } from 'wagmi';
import { erc20Abi } from 'viem';
import {
  Brain, DollarSign, Target, Flame, Bot, TrendingUp, TrendingDown,
  Scale, Wallet, Layers, Activity, BarChart3, Zap, Shield,
} from 'lucide-react';
import { INQAI_TOKEN } from '../src/config/wagmi';

const WalletButton   = dynamic(() => import('../src/components/WalletButton'),  { ssr: false });
const PortfolioChart = dynamic(() => import('../src/components/charts/LiveCharts').then(m => m.PortfolioChart), { ssr: false });
const CategoryDonut  = dynamic(() => import('../src/components/charts/LiveCharts').then(m => m.CategoryDonut),  { ssr: false });
const ConfidenceRing = dynamic(() => import('../src/components/charts/LiveCharts').then(m => m.ConfidenceRing), { ssr: false });

// ── Formatters ───────────────────────────────────────────────────────────────
const fmtUsd = (n: number) => {
  if (n === null || n === undefined || isNaN(n)) return '—';
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

const ACTION_COL: Record<string, string> = {
  BUY: '#10b981', ACCUMULATE: '#34d399', SELL: '#ef4444',
  REDUCE: '#f87171', HOLD: '#a78bfa', SKIP: '#6b7280',
};

export default function AnalyticsPage() {
  const router = useRouter();
  const { address } = useAccount();
  const [nav,       setNav]      = useState<any>(null);
  const [equity,    setEquity]   = useState<any[]>([]);
  const [cats,      setCats]     = useState<any[]>([]);
  const [queue,     setQueue]    = useState<any>(null);
  const [monitor,   setMonitor]  = useState<any>(null);
  const [loading,   setLoading]  = useState(true);
  const [tab,       setTab]      = useState<'portfolio'|'ai'|'positions'|'execute'|'fees'>('portfolio');
  const [posFilter, setPosFilter]= useState<string>('all');
  const [purchases, setPurchases]= useState<any[]>([]);

  // On-chain INQAI balance — source of truth once tokens are delivered
  const { data: onChainRaw } = useReadContract({
    address:      INQAI_TOKEN.address,
    abi:          erc20Abi,
    functionName: 'balanceOf',
    args:         address ? [address] : undefined,
    chainId:      1,
    query:        { enabled: !!address },
  });
  const onChainBalance = onChainRaw ? Number(onChainRaw) / 1e18 : 0;

  // Presale purchases from localStorage (valid until on-chain delivery)
  useEffect(() => {
    if (!address) return;
    const all: any[] = JSON.parse(localStorage.getItem('inqai_purchases') || '[]');
    setPurchases(all.filter(p => p.address?.toLowerCase() === address.toLowerCase()));
  }, [address]);

  const load = useCallback(async () => {
    try {
      const [navRes, chartRes, catRes, queueRes, monitorRes] = await Promise.allSettled([
        fetch('/api/inquisitiveAI/portfolio/nav'),
        fetch('/api/inquisitiveAI/chart/portfolio'),
        fetch('/api/inquisitiveAI/chart/categories'),
        fetch('/api/inquisitiveAI/execute/queue'),
        fetch('/api/inquisitiveAI/execute/monitor'),
      ]);
      if (navRes.status    === 'fulfilled' && navRes.value.ok)    setNav(await navRes.value.json());
      if (chartRes.status  === 'fulfilled' && chartRes.value.ok)  { const d = await chartRes.value.json();   setEquity(d.curve || []); }
      if (catRes.status    === 'fulfilled' && catRes.value.ok)    { const d = await catRes.value.json();     setCats(d.categories || []); }
      if (queueRes.status  === 'fulfilled' && queueRes.value.ok)  setQueue(await queueRes.value.json());
      if (monitorRes.status=== 'fulfilled' && monitorRes.value.ok)setMonitor(await monitorRes.value.json());
    } catch {}
    setLoading(false);
  }, []);
  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [load]);

  const navPerToken       = nav?.token?.navPerToken       ?? INQAI_TOKEN.presalePrice;
  const navSource         = nav?.token?.navSource          ?? 'connecting';
  const return7d          = nav?.token?.return7d           ?? 0;
  const return24h         = nav?.token?.return24h          ?? 0;
  const circulatingSupply = nav?.token?.circulatingSupply  ?? 0;
  const regime            = nav?.ai?.regime                || '—';
  const fg                = nav?.ai?.fearGreed?.value      ?? '—';
  const fgLabel           = nav?.ai?.fearGreed?.valueClassification || '';
  const cycles            = nav?.ai?.cycleCount            ?? 0;
  const buys              = nav?.ai?.buys                  ?? 0;
  const sells             = nav?.ai?.sells                 ?? 0;
  const riskScore         = nav?.ai?.riskScore             ?? 0;
  const winRate           = nav?.portfolio?.winRate        ?? 0;
  const regimeCol         = regime === 'BULL' ? '#10b981' : regime === 'BEAR' ? '#ef4444' : '#f59e0b';
  const positions: any[]  = nav?.positions ?? [];

  // Real on-chain treasury data
  const treasury      = nav?.treasury ?? {} as any;
  const aumUSD        = treasury.aumUSD        ?? 0;
  const totalEthUSD   = (treasury.totalEth ?? 0) * (treasury.ethPrice ?? 3200);
  const vaultAddress  = treasury.vaultAddress  || INQAI_TOKEN.teamWallet;
  const isOnChainNAV  = navSource === 'on-chain-aum';

  const localHolding     = purchases.reduce((s, p) => s + (p.amount    || 0), 0);
  const totalUsdInvested = purchases.reduce((s, p) => s + (p.usdAmount || 0), 0);
  const totalInqai       = onChainBalance > 0 ? onChainBalance : localHolding;
  const effInvested      = onChainBalance > 0 ? onChainBalance * INQAI_TOKEN.presalePrice : totalUsdInvested;
  const currentValue     = totalInqai * navPerToken;
  const totalPnL         = currentValue - effInvested;
  const roiPct           = effInvested > 0 ? totalPnL / effInvested : 0;
  const hasHoldings      = totalInqai > 0 || effInvested > 0;
  const holdingSource    = onChainBalance > 0 ? 'on-chain' : purchases.length > 0 ? 'presale' : isOnChainNAV ? 'on-chain-nav' : 'live NAV';

  const backingAssets = useMemo(() => positions.slice(0, 12).map(p => ({
    ...p,
    myUsd:    effInvested > 0 ? effInvested * (p.allocPct / 100) : p.usdPerToken,
    myPnl24h: effInvested > 0 ? effInvested * (p.allocPct / 100) * p.change24h : p.pnl24h,
  })), [positions, effInvested]);

  const globalEquity = useMemo(() => {
    if (!return7d) return [];
    const now = Date.now(); const start = now - 7 * 24 * 3600_000;
    const prior = return7d - (return24h ?? 0);
    return Array.from({ length: 8 }, (_, i) => ({
      v: parseFloat((100 * (1 + (i < 7 ? prior * (i / 6) : return7d))).toFixed(4)),
      ts: new Date(start + i * 24 * 3600_000).toLocaleDateString(),
    }));
  }, [return7d, return24h]);

  const userEquity = useMemo(() => {
    if (!purchases.length || effInvested <= 0) return [];
    const sorted = [...purchases].sort((a, b) => a.timestamp - b.timestamp);
    const first = sorted[0].timestamp; const now = Date.now(); const span = now - first;
    const step = Math.max(3600000, Math.floor(span / 60));
    const pts: { v: number; ts: string }[] = [];
    let cum = 0; let pi = 0;
    for (let t = first; t <= now + step; t += step) {
      while (pi < sorted.length && sorted[pi].timestamp <= t) { cum += sorted[pi].amount; pi++; }
      const prog  = span > 0 ? Math.min((t - first) / span, 1) : 1;
      const price = INQAI_TOKEN.presalePrice + (navPerToken - INQAI_TOKEN.presalePrice) * prog;
      pts.push({ v: parseFloat((cum * price).toFixed(2)), ts: new Date(t).toLocaleDateString() });
    }
    return pts;
  }, [purchases, navPerToken]);

  const chartData   = equity.length ? equity : userEquity.length ? userEquity : globalEquity;
  const topSignals  = positions.filter(p => p.action === 'BUY' || p.action === 'ACCUMULATE').slice(0, 8);
  const dispValue   = hasHoldings ? currentValue : navPerToken;
  const filteredPos = useMemo(() => {
    if (posFilter === 'all')  return positions;
    if (posFilter === 'buy')  return positions.filter(p => p.action === 'BUY' || p.action === 'ACCUMULATE');
    if (posFilter === 'sell') return positions.filter(p => p.action === 'SELL' || p.action === 'REDUCE');
    return positions.filter(p => p.category === posFilter);
  }, [positions, posFilter]);

  return (
    <>
      <Head>
        <title>Analytics | INQUISITIVE</title>
        <meta name="description" content="INQAI AI-managed portfolio — live NAV, 65-asset backing, real-time AI signals." />
      </Head>
      <div style={{ minHeight:'100vh', background:'#07071a', color:'#fff', fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' }}>
        <div className="mesh-bg" />

        {/* NAV */}
        <nav style={{ position:'sticky', top:0, zIndex:100, background:'rgba(7,7,26,0.94)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(255,255,255,0.05)', height:60, display:'flex', alignItems:'center', padding:'0 24px', gap:8 }}>
          <button onClick={() => router.push('/')} style={{ display:'flex', alignItems:'center', background:'none', border:'none', cursor:'pointer', marginRight:24, padding:0 }}>
            <div className="anim-name-pulse" style={{ fontWeight:900, fontSize:18, letterSpacing:'-0.5px', color:'#fff' }}>INQUISITIVE</div>
          </button>
          <div style={{ display:'flex', gap:3, flex:1 }}>
            {NAV_LINKS.map(n => (
              <button key={n.l} onClick={() => router.push(n.p)} style={{ padding:'6px 14px', borderRadius:9, cursor:'pointer', fontSize:13, fontWeight:n.accent?700:500, background:n.accent?'linear-gradient(135deg,#7c3aed,#4f46e5)':'transparent', color:n.accent?'#fff':'rgba(255,255,255,0.5)', border:n.accent?'1px solid rgba(255,255,255,0.1)':'1px solid transparent' }}>{n.l}</button>
            ))}
          </div>
          <div style={{ display:'flex', gap:16, alignItems:'center', marginRight:8 }}>
            <div style={{ textAlign:'right' }}><div style={{ fontSize:10, color:'rgba(255,255,255,0.3)' }}>INQAI NAV</div><div style={{ fontSize:13, fontWeight:800, color:'#a78bfa', fontFamily:'monospace' }}>${navPerToken.toFixed(4)}</div></div>
            <div style={{ textAlign:'right' }}><div style={{ fontSize:10, color:'rgba(255,255,255,0.3)' }}>7D</div><div style={{ fontSize:13, fontWeight:700, color:grc(return7d), fontFamily:'monospace' }}>{pct(return7d)}</div></div>
            <div style={{ width:1, height:28, background:'rgba(255,255,255,0.08)' }} />
          </div>
          <WalletButton label="Connect Wallet" />
        </nav>

        <div style={{ padding:'24px 24px 80px', position:'relative', zIndex:1 }}>
          <div style={{ maxWidth:1320, margin:'0 auto' }}>

            {/* Header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
              <div>
                <div style={{ fontSize:20, fontWeight:900, color:'#fff', marginBottom:4 }}>Portfolio Analytics</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.35)' }}>{address?address.slice(0,8)+'…'+address.slice(-6)+' · ':''}AI managing 65 assets · 8-second cycles · {navSource}</div>
              </div>
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                <div style={{ width:8, height:8, borderRadius:9, background:'#10b981', boxShadow:'0 0 8px #10b981' }} />
                <span style={{ fontSize:12, color:'#10b981', fontWeight:700 }}>LIVE · {cycles ? `Cycle #${cycles.toLocaleString()}` : 'Connecting…'}</span>
                {isOnChainNAV && (
                  <span style={{ fontSize:10, padding:'2px 8px', borderRadius:100, background:'rgba(16,185,129,0.12)', color:'#34d399', border:'1px solid rgba(16,185,129,0.25)', fontWeight:700 }}>
                    ON-CHAIN NAV · {fmtUsd(aumUSD)} AUM
                  </span>
                )}
              </div>
            </div>

            {/* KPI Row */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:24 }}>
              {([
                { label:hasHoldings?'Your Portfolio':'INQAI NAV', val:fmtUsd(dispValue), sub:hasHoldings?`${totalInqai.toFixed(4)} INQAI · ${holdingSource}`:`Per token · ${isOnChainNAV?'real AUM':'basket'}`, col:'#60a5fa', icon:'dollar' },
                { label:hasHoldings?'Total P&L':'7D Return',       val:hasHoldings?fmtUsd(totalPnL):pct(return7d), sub:hasHoldings?`${pct(roiPct)} ROI vs $${INQAI_TOKEN.presalePrice} presale`:'65-asset weighted basket', col:grc(hasHoldings?totalPnL:return7d), icon:'target' },
                { label:'24H Return',  val:pct(return24h),   sub:`${(winRate*100).toFixed(0)}% assets up today`,  col:grc(return24h), icon:'trend' },
                { label:'Target APY',  val:'18.5%',           sub:'Staking · Lending · LP · Yield',               col:'#f59e0b',      icon:'flame' },
                { label:'AI Regime',   val:regime,            sub:`Risk ${(riskScore*100).toFixed(0)}% · F&G ${fg}`,col:regimeCol,    icon:'bot'   },
              ] as any[]).map(m => (
                <div key={m.label} style={{ background:'rgba(13,13,32,0.85)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:16, padding:'16px 14px', backdropFilter:'blur(12px)', textAlign:'center' }}>
                  <div style={{ marginBottom:6, display:'flex', justifyContent:'center' }}>
                    {m.icon==='dollar'&&<DollarSign  size={20} color={m.col} />}
                    {m.icon==='target'&&<Target       size={20} color={m.col} />}
                    {m.icon==='trend' &&<TrendingUp   size={20} color={m.col} />}
                    {m.icon==='flame' &&<Flame        size={20} color={m.col} />}
                    {m.icon==='bot'   &&<Bot          size={20} color={m.col} />}
                  </div>
                  <div style={{ fontSize:18, fontWeight:900, color:m.col, fontFamily:'monospace', lineHeight:1.2 }}>{m.val}</div>
                  <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', marginTop:3 }}>{m.label}</div>
                  <div style={{ fontSize:9, color:'rgba(255,255,255,0.2)', marginTop:2, lineHeight:1.4 }}>{m.sub}</div>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div style={{ display:'flex', gap:2, marginBottom:20, borderBottom:'1px solid rgba(255,255,255,0.06)', flexWrap:'wrap' }}>
              {(['portfolio','ai','positions','execute','fees'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{ padding:'10px 18px', fontSize:13, fontWeight:tab===t?700:500, cursor:'pointer', background:'none', border:'none', borderBottom:`2px solid ${tab===t?'#7c3aed':'transparent'}`, color:tab===t?'#a78bfa':'rgba(255,255,255,0.4)', transition:'all 0.15s' }}>
                  {{portfolio:'Portfolio',ai:'AI Activity',positions:`Positions (${positions.length})`,execute:'Execution Engine',fees:'Fee Flow'}[t]}
                  {t==='execute' && (monitor?.status==='READY_TO_DEPLOY') && <span style={{ marginLeft:6, width:7, height:7, borderRadius:9, background:'#10b981', display:'inline-block', boxShadow:'0 0 6px #10b981' }} />}
                </button>
              ))}
            </div>

            {/* ── PORTFOLIO TAB ── */}
            {tab === 'portfolio' && (
              <div style={{ display:'grid', gridTemplateColumns:'2fr 1.1fr', gap:20 }}>
                <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

                  {/* Equity chart */}
                  <div style={{ background:'rgba(13,13,32,0.85)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:20, padding:'22px', backdropFilter:'blur(12px)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                      <div>
                        <h3 style={{ fontSize:14, fontWeight:700, color:'rgba(255,255,255,0.8)', margin:0 }}>Portfolio Performance</h3>
                        <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', marginTop:2 }}>{hasHoldings?`Your value · ${fmtUsd(currentValue)}`:'65-asset weighted index · base $100'}</div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontSize:16, fontWeight:900, fontFamily:'monospace', color:grc(return7d) }}>{pct(return7d)}</div>
                        <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)' }}>7D return</div>
                      </div>
                    </div>
                    <PortfolioChart data={chartData} height={200} />
                    <div style={{ display:'flex', justifyContent:'space-between', marginTop:10, fontSize:11, color:'rgba(255,255,255,0.3)' }}>
                      <span>24H: <span style={{ color:grc(return24h), fontWeight:700 }}>{pct(return24h)}</span></span>
                      <span>NAV: <span style={{ color:'#a78bfa', fontWeight:700 }}>${navPerToken.toFixed(4)}</span></span>
                      <span>Target: <span style={{ color:'#10b981', fontWeight:700 }}>${INQAI_TOKEN.targetPrice}</span></span>
                    </div>
                  </div>

                  {/* Holdings */}
                  <div style={{ background:'rgba(13,13,32,0.85)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:20, padding:'22px', backdropFilter:'blur(12px)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                      <Wallet size={16} color="#a78bfa" />
                      <h3 style={{ fontSize:14, fontWeight:700, color:'rgba(255,255,255,0.8)', margin:0 }}>Your INQAI Holdings</h3>
                      {onChainBalance > 0 && <span style={{ fontSize:9, padding:'2px 7px', borderRadius:100, background:'rgba(16,185,129,0.15)', color:'#34d399', border:'1px solid rgba(16,185,129,0.25)' }}>ON-CHAIN</span>}
                      {purchases.length > 0 && onChainBalance === 0 && <span style={{ fontSize:9, padding:'2px 7px', borderRadius:100, background:'rgba(124,58,237,0.15)', color:'#a78bfa', border:'1px solid rgba(124,58,237,0.25)' }}>PRESALE</span>}
                    </div>
                    {!hasHoldings ? (
                      <div style={{ textAlign:'center', padding:'20px 0' }}>
                        <div style={{ fontSize:13, color:'rgba(255,255,255,0.35)', marginBottom:12 }}>{address?'No INQAI holdings found for this wallet.':'Connect wallet to view your holdings.'}</div>
                        <button onClick={() => router.push('/buy')} style={{ padding:'10px 20px', borderRadius:10, background:'linear-gradient(135deg,#7c3aed,#4f46e5)', color:'#fff', border:'none', cursor:'pointer', fontSize:13, fontWeight:700 }}>Buy INQAI at $8</button>
                      </div>
                    ) : (
                      <div>
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:12 }}>
                          {[
                            { l:'Token Balance',   v:fmtN(totalInqai,4)+' INQAI', c:'#a78bfa' },
                            { l:'Current Value',   v:fmtUsd(currentValue),         c:'#10b981' },
                            { l:'P&L vs Presale',  v:(totalPnL>=0?'+':'')+fmtUsd(totalPnL), c:grc(totalPnL) },
                          ].map(s => (
                            <div key={s.l} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, padding:'10px 12px' }}>
                              <div style={{ fontSize:10, color:'rgba(255,255,255,0.35)', marginBottom:3 }}>{s.l}</div>
                              <div style={{ fontSize:14, fontWeight:800, color:s.c, fontFamily:'monospace' }}>{s.v}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:14 }}>
                          {[
                            { l:'INQAI NAV',     v:'$'+navPerToken.toFixed(4), sub:'Presale: $'+INQAI_TOKEN.presalePrice },
                            { l:'7D Portfolio',  v:pct(return7d),              sub:'65-asset AI basket' },
                          ].map(s => (
                            <div key={s.l} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:10, padding:'10px 12px' }}>
                              <div style={{ fontSize:10, color:'rgba(255,255,255,0.35)', marginBottom:2 }}>{s.l}</div>
                              <div style={{ fontSize:14, fontWeight:700, fontFamily:'monospace', color:'#fff' }}>{s.v}</div>
                              <div style={{ fontSize:9, color:'rgba(255,255,255,0.25)', marginTop:2 }}>{s.sub}</div>
                            </div>
                          ))}
                        </div>
                        {purchases.slice(-3).reverse().map((p, i) => (
                          <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 10px', background:'rgba(255,255,255,0.03)', borderRadius:8, fontSize:11, marginBottom:4 }}>
                            <span style={{ color:'#a78bfa', fontWeight:600 }}>{p.amount?.toLocaleString()} INQAI</span>
                            <span style={{ color:'rgba(255,255,255,0.4)' }}>for {fmtUsd(p.usdAmount)}</span>
                            <span style={{ color:'rgba(255,255,255,0.25)', fontSize:10 }}>{new Date(p.timestamp).toLocaleDateString()}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* On-chain treasury card */}
                  <div style={{ background:'rgba(13,13,32,0.85)', border:`1px solid ${isOnChainNAV?'rgba(16,185,129,0.25)':'rgba(255,255,255,0.06)'}`, borderRadius:20, padding:'22px', backdropFilter:'blur(12px)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                      <Shield size={16} color={isOnChainNAV?'#10b981':'#6b7280'} />
                      <h3 style={{ fontSize:14, fontWeight:700, color:'rgba(255,255,255,0.8)', margin:0 }}>On-Chain Treasury</h3>
                      <span style={{ marginLeft:'auto', fontSize:9, padding:'2px 7px', borderRadius:100, background:isOnChainNAV?'rgba(16,185,129,0.12)':'rgba(255,255,255,0.05)', color:isOnChainNAV?'#34d399':'rgba(255,255,255,0.35)', border:`1px solid ${isOnChainNAV?'rgba(16,185,129,0.25)':'rgba(255,255,255,0.1)'}`, fontWeight:700 }}>
                        {isOnChainNAV ? 'NAV FROM REAL AUM' : 'BASKET-WEIGHTED NAV'}
                      </span>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginBottom:12 }}>
                      {[
                        { l:'Total AUM',         v: fmtUsd(aumUSD),                             c:'#10b981' },
                        { l:'ETH in Vault',       v: (treasury.totalEth??0).toFixed(4)+' ETH',   c:'#60a5fa' },
                        { l:'Tokens Sold',        v: circulatingSupply > 0 ? fmtN(circulatingSupply,0)+' INQAI' : 'Pending', c:'#a78bfa' },
                      ].map(s => (
                        <div key={s.l} style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:10, padding:'10px 12px' }}>
                          <div style={{ fontSize:10, color:'rgba(255,255,255,0.35)', marginBottom:2 }}>{s.l}</div>
                          <div style={{ fontSize:13, fontWeight:800, color:s.c, fontFamily:'monospace' }}>{s.v}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:6, fontSize:11 }}>
                      {[
                        { l:'Vault Contract',  v:vaultAddress,                                      href:`https://etherscan.io/address/${vaultAddress}` },
                        { l:'INQAI Token',     v:INQAI_TOKEN.address,                               href:`https://etherscan.io/token/${INQAI_TOKEN.address}` },
                        { l:'AI Strategy Mgr', v:'0x8431173FA9594B43E226D907E26EF68cD6B6542D',     href:'https://etherscan.io/address/0x8431173FA9594B43E226D907E26EF68cD6B6542D' },
                      ].map(s => (
                        <div key={s.l} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 8px', background:'rgba(255,255,255,0.02)', borderRadius:8 }}>
                          <span style={{ color:'rgba(255,255,255,0.4)', fontSize:10 }}>{s.l}</span>
                          <a href={s.href} target="_blank" rel="noopener noreferrer" style={{ color:'#60a5fa', fontFamily:'monospace', fontSize:10, textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}>
                            {s.v.slice(0,10)}…{s.v.slice(-6)}
                          </a>
                        </div>
                      ))}
                    </div>
                    {!isOnChainNAV && aumUSD === 0 && (
                      <div style={{ marginTop:10, padding:'7px 10px', background:'rgba(124,58,237,0.07)', border:'1px solid rgba(124,58,237,0.15)', borderRadius:8, fontSize:10, color:'rgba(255,255,255,0.4)', lineHeight:1.7 }}>
                        NAV is currently basket-weighted (live CoinGecko data). Once ETH deposits are made to the vault contract, NAV switches to real AUM/supply calculation automatically.
                      </div>
                    )}
                  </div>

                  {/* Portfolio backing */}
                  <div style={{ background:'rgba(13,13,32,0.85)', border:'1px solid rgba(124,58,237,0.18)', borderRadius:20, padding:'22px', backdropFilter:'blur(12px)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                      <Layers size={16} color="#a78bfa" />
                      <h3 style={{ fontSize:14, fontWeight:700, color:'rgba(255,255,255,0.8)', margin:0 }}>Your Portfolio Backing</h3>
                      <div style={{ marginLeft:'auto', fontSize:10, color:'rgba(255,255,255,0.3)', fontFamily:'monospace' }}>{effInvested>0?fmtUsd(effInvested)+' → 65 assets':'$8/token → 65 assets'}</div>
                    </div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,0.28)', marginBottom:12, lineHeight:1.6 }}>
                      The AI deploys {effInvested>0?'your investment':'each $8 INQAI token'} across 65 assets. Bar width = relative weight, colour = live AI signal.
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'54px 1fr 70px 58px 62px', gap:6, marginBottom:6, fontSize:9, color:'rgba(255,255,255,0.3)', padding:'0 2px' }}>
                      <span>Asset</span><span>Allocation</span><span style={{textAlign:'right'}}>My USD</span><span style={{textAlign:'right'}}>24H</span><span style={{textAlign:'right'}}>Signal</span>
                    </div>
                    {backingAssets.map((a:any) => (
                      <div key={a.symbol} style={{ display:'grid', gridTemplateColumns:'54px 1fr 70px 58px 62px', gap:6, alignItems:'center', marginBottom:5 }}>
                        <span style={{ fontWeight:800, fontSize:11, color:'#fff' }}>{a.symbol}</span>
                        <div style={{ position:'relative', height:5, background:'rgba(255,255,255,0.06)', borderRadius:3, overflow:'hidden' }}>
                          <div style={{ position:'absolute', left:0, top:0, height:'100%', borderRadius:3, width:`${Math.min((a.weight/(backingAssets[0]?.weight||1))*100,100)}%`, background:ACTION_COL[a.action]||'#7c3aed' }} />
                        </div>
                        <div style={{ fontSize:11, fontWeight:700, color:'#10b981', fontFamily:'monospace', textAlign:'right' }}>{fmtUsd(a.myUsd)}</div>
                        <div style={{ fontSize:10, fontFamily:'monospace', textAlign:'right', color:grc(a.change24h) }}>{pct(a.change24h)}</div>
                        <div style={{ fontSize:9, padding:'1px 5px', borderRadius:100, textAlign:'center', background:`${ACTION_COL[a.action]||'#7c3aed'}20`, color:ACTION_COL[a.action]||'#7c3aed', border:`1px solid ${ACTION_COL[a.action]||'#7c3aed'}40`, fontWeight:700 }}>{a.action}</div>
                      </div>
                    ))}
                    <div style={{ marginTop:10, padding:'7px 10px', background:'rgba(124,58,237,0.07)', border:'1px solid rgba(124,58,237,0.18)', borderRadius:8, fontSize:10, color:'rgba(255,255,255,0.35)', lineHeight:1.7 }}>
                      AI re-evaluates all 65 assets every 8 seconds. Showing top 12 by weight. View all in the Positions tab.
                    </div>
                  </div>
                </div>

                <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                  <div style={{ background:'rgba(13,13,32,0.85)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:20, padding:'22px', backdropFilter:'blur(12px)' }}>
                    <h3 style={{ fontSize:14, fontWeight:700, color:'rgba(255,255,255,0.8)', marginBottom:14 }}>Allocation by Category</h3>
                    <CategoryDonut data={cats} size={180} />
                  </div>
                  <div style={{ background:'rgba(13,13,32,0.85)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:20, padding:'22px', backdropFilter:'blur(12px)' }}>
                    <h3 style={{ fontSize:14, fontWeight:700, color:'rgba(255,255,255,0.8)', marginBottom:14 }}>Live Metrics</h3>
                    {[
                      { l:'INQAI NAV',      v:'$'+navPerToken.toFixed(4) },
                      { l:'7D Return',      v:pct(return7d),              c:grc(return7d) },
                      { l:'24H Return',     v:pct(return24h),             c:grc(return24h) },
                      { l:'Win Rate',       v:(winRate*100).toFixed(1)+'%' },
                      { l:'Buy Signals',    v:String(buys),               c:'#10b981' },
                      { l:'Sell Signals',   v:String(sells),              c:'#ef4444' },
                      { l:'Active Assets',  v:String(nav?.portfolio?.assetCount??'—') },
                      { l:'Brain Cycles',   v:cycles.toLocaleString() },
                    ].map((r:any) => (
                      <div key={r.l} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ fontSize:12, color:'rgba(255,255,255,0.4)' }}>{r.l}</span>
                        <span style={{ fontSize:13, fontWeight:700, fontFamily:'monospace', color:r.c||'#fff' }}>{r.v}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ background:'rgba(13,13,32,0.85)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:20, padding:'22px', backdropFilter:'blur(12px)' }}>
                    <h3 style={{ fontSize:14, fontWeight:700, color:'rgba(255,255,255,0.8)', marginBottom:14 }}>AI Strategy</h3>
                    {[
                      { l:'Core BTC·ETH·SOL', p:38, c:'#3b82f6' },
                      { l:'DeFi & AI',         p:20, c:'#7c3aed' },
                      { l:'Stablecoins & RWA', p:12, c:'#10b981' },
                      { l:'L2 & Interop',      p:12, c:'#0ea5e9' },
                      { l:'Liquid Staking',    p:10, c:'#f59e0b' },
                      { l:'Other',             p: 8, c:'#6b7280' },
                    ].map(s => (
                      <div key={s.l} style={{ marginBottom:10 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}><span style={{ fontSize:11, fontWeight:600 }}>{s.l}</span><span style={{ fontSize:11, fontWeight:800, color:s.c, fontFamily:'monospace' }}>{s.p}%</span></div>
                        <div style={{ height:4, background:'rgba(255,255,255,0.05)', borderRadius:2, overflow:'hidden' }}><div style={{ height:'100%', width:`${s.p*2.5}%`, background:s.c, borderRadius:2 }} /></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── AI ACTIVITY TAB ── */}
            {tab === 'ai' && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
                <div style={{ background:'rgba(13,13,32,0.85)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:20, padding:'24px', backdropFilter:'blur(12px)' }}>
                  <h3 style={{ fontSize:14, fontWeight:700, color:'rgba(255,255,255,0.8)', marginBottom:18 }}>AI Agent Live Metrics</h3>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                    {([
                      { l:'Brain Cycles', v:cycles.toLocaleString(), c:'#a78bfa', i:'brain' },
                      { l:'Buy Signals',  v:buys,   c:'#10b981', i:'up' },
                      { l:'Sell Signals', v:sells,  c:'#ef4444', i:'down' },
                      { l:'Regime',       v:regime, c:regimeCol, i:regime==='BULL'?'up':regime==='BEAR'?'down':'scale' },
                      { l:'Fear & Greed', v:fg,     c:typeof fg==='number'&&fg<30?'#ef4444':typeof fg==='number'&&fg>70?'#10b981':'#f59e0b', i:'brain' },
                      { l:'Assets Live',  v:nav?.portfolio?.assetCount??65, c:'#60a5fa', i:'target' },
                    ] as any[]).map(m => (
                      <div key={m.l} style={{ textAlign:'center', padding:'14px 10px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:12 }}>
                        <div style={{ marginBottom:5, display:'flex', justifyContent:'center' }}>
                          {m.i==='brain' &&<Brain      size={20} color={m.c} />}
                          {m.i==='up'    &&<TrendingUp size={20} color={m.c} />}
                          {m.i==='down'  &&<TrendingDown size={20} color={m.c} />}
                          {m.i==='scale' &&<Scale      size={20} color={m.c} />}
                          {m.i==='target'&&<Target     size={20} color={m.c} />}
                        </div>
                        <div style={{ fontSize:18, fontWeight:900, color:m.c, fontFamily:'monospace' }}>{m.v}</div>
                        <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', marginTop:3 }}>{m.l}</div>
                      </div>
                    ))}
                  </div>
                  {fgLabel && <div style={{ marginTop:14, padding:'8px 14px', background:'rgba(251,191,36,0.06)', border:'1px solid rgba(251,191,36,0.15)', borderRadius:10, fontSize:12, color:'#fbbf24', textAlign:'center' }}>Market Sentiment: <strong>{fgLabel}</strong></div>}
                </div>
                <div style={{ background:'rgba(13,13,32,0.85)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:20, padding:'24px', backdropFilter:'blur(12px)' }}>
                  <h3 style={{ fontSize:14, fontWeight:700, color:'rgba(255,255,255,0.8)', marginBottom:18 }}>Intelligence Engine Confidence</h3>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:20, placeItems:'center' }}>
                    {(() => {
                      const c = topSignals[0]?.components || {};
                      return [
                        { l:'Pattern',   v:c.patternEngine  ||0.72, c:'#3b82f6' },
                        { l:'Reasoning', v:c.reasoningEngine||0.68, c:'#10b981' },
                        { l:'Portfolio', v:c.portfolioEngine||0.65, c:'#ef4444' },
                        { l:'Learning',  v:c.learningEngine ||0.70, c:'#f97316' },
                      ];
                    })().map(m => (
                      <div key={m.l} style={{ textAlign:'center' }}>
                        <ConfidenceRing value={m.v} color={m.c} label={m.l} size={80} />
                      </div>
                    ))}
                  </div>
                  <div style={{ marginTop:18, padding:'10px 14px', background:'rgba(251,191,36,0.07)', border:'1px solid rgba(251,191,36,0.18)', borderRadius:10, fontSize:11, color:'rgba(251,191,36,0.8)', textAlign:'center' }}>
                    70% minimum confidence required to execute · BEAR regime raises to 75%
                  </div>
                </div>
                <div style={{ background:'rgba(13,13,32,0.85)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:20, padding:'24px', backdropFilter:'blur(12px)', gridColumn:'1 / -1' }}>
                  <h3 style={{ fontSize:14, fontWeight:700, color:'rgba(255,255,255,0.8)', marginBottom:14 }}>Top AI Signals — Cycle #{cycles.toLocaleString()}</h3>
                  {topSignals.length > 0 ? (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
                      {topSignals.map((s:any) => (
                        <div key={s.symbol} style={{ padding:'12px 14px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:12 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                            <span style={{ fontWeight:800, fontSize:14 }}>{s.symbol}</span>
                            <span style={{ fontSize:9, padding:'2px 7px', borderRadius:100, background:`${ACTION_COL[s.action]||'#7c3aed'}20`, color:ACTION_COL[s.action]||'#7c3aed', border:`1px solid ${ACTION_COL[s.action]||'#7c3aed'}40`, fontWeight:700 }}>{s.action}</span>
                          </div>
                          <div style={{ fontFamily:'monospace', fontSize:16, fontWeight:900, color:'#a78bfa' }}>{(s.confidence*100).toFixed(0)}%</div>
                          <div style={{ fontSize:10, color:'rgba(255,255,255,0.35)', marginTop:2 }}>AI confidence · ${s.priceUsd?.toFixed(2)}</div>
                          <div style={{ fontSize:10, color:grc(s.change24h), marginTop:2, fontFamily:'monospace' }}>{pct(s.change24h)} 24h</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign:'center', padding:'30px', color:'rgba(255,255,255,0.3)', fontSize:13 }}>Loading AI signals…</div>
                  )}
                </div>
              </div>
            )}

            {/* ── POSITIONS TAB ── */}
            {tab === 'positions' && (
              <div>
                <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
                  {['all','buy','sell','major','defi','ai','l2','stablecoin','rwa','liquid-stake'].map(f => (
                    <button key={f} onClick={() => setPosFilter(f)} style={{ padding:'5px 12px', borderRadius:8, fontSize:11, fontWeight:600, cursor:'pointer', border:`1px solid ${posFilter===f?'rgba(124,58,237,0.5)':'rgba(255,255,255,0.1)'}`, background:posFilter===f?'rgba(124,58,237,0.15)':'rgba(255,255,255,0.03)', color:posFilter===f?'#a78bfa':'rgba(255,255,255,0.5)' }}>
                      {f.toUpperCase()}
                    </button>
                  ))}
                  <div style={{ marginLeft:'auto', fontSize:12, color:'rgba(255,255,255,0.35)', alignSelf:'center' }}>{filteredPos.length} assets</div>
                </div>
                <div style={{ background:'rgba(13,13,32,0.85)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:20, overflow:'hidden', backdropFilter:'blur(12px)' }}>
                  <div style={{ display:'grid', gridTemplateColumns:'60px 1fr 70px 70px 70px 75px 80px 80px 70px', gap:8, padding:'12px 16px', borderBottom:'1px solid rgba(255,255,255,0.06)', fontSize:10, color:'rgba(255,255,255,0.35)', fontWeight:700, textTransform:'uppercase' }}>
                    <span>Symbol</span><span>Name</span><span style={{textAlign:'right'}}>Price</span><span style={{textAlign:'right'}}>24H</span><span style={{textAlign:'right'}}>7D</span><span style={{textAlign:'right'}}>Weight</span><span style={{textAlign:'right'}}>$/Token</span><span style={{textAlign:'right'}}>Confidence</span><span style={{textAlign:'right'}}>Signal</span>
                  </div>
                  {filteredPos.map((p:any, i:number) => (
                    <div key={p.symbol} style={{ display:'grid', gridTemplateColumns:'60px 1fr 70px 70px 70px 75px 80px 80px 70px', gap:8, padding:'10px 16px', borderBottom:'1px solid rgba(255,255,255,0.04)', background:i%2===0?'transparent':'rgba(255,255,255,0.01)', alignItems:'center' }}>
                      <span style={{ fontWeight:800, fontSize:12 }}>{p.symbol}</span>
                      <span style={{ fontSize:11, color:'rgba(255,255,255,0.55)' }}>{p.name}</span>
                      <span style={{ textAlign:'right', fontSize:11, fontFamily:'monospace' }}>${p.priceUsd?.toLocaleString('en-US',{maximumFractionDigits:4})}</span>
                      <span style={{ textAlign:'right', fontSize:11, fontFamily:'monospace', color:grc(p.change24h) }}>{pct(p.change24h)}</span>
                      <span style={{ textAlign:'right', fontSize:11, fontFamily:'monospace', color:grc(p.change7d) }}>{pct(p.change7d)}</span>
                      <span style={{ textAlign:'right', fontSize:11, fontFamily:'monospace', color:'rgba(255,255,255,0.6)' }}>{p.weight}%</span>
                      <span style={{ textAlign:'right', fontSize:11, fontFamily:'monospace', color:'#10b981' }}>{fmtUsd(p.usdPerToken)}</span>
                      <div style={{ display:'flex', justifyContent:'flex-end' }}>
                        <div style={{ height:4, width:60, background:'rgba(255,255,255,0.06)', borderRadius:2, overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${(p.confidence||0)*100}%`, background:`${ACTION_COL[p.action]||'#7c3aed'}`, borderRadius:2 }} />
                        </div>
                      </div>
                      <div style={{ display:'flex', justifyContent:'flex-end' }}>
                        <span style={{ fontSize:9, padding:'2px 6px', borderRadius:100, background:`${ACTION_COL[p.action]||'#7c3aed'}20`, color:ACTION_COL[p.action]||'#7c3aed', border:`1px solid ${ACTION_COL[p.action]||'#7c3aed'}40`, fontWeight:700 }}>{p.action}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── EXECUTION ENGINE TAB ── */}
            {tab === 'execute' && (
              <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

                {/* Status banner */}
                <div style={{ background: monitor?.status==='READY_TO_DEPLOY'?'rgba(16,185,129,0.08)':'rgba(13,13,32,0.85)', border:`1px solid ${monitor?.status==='READY_TO_DEPLOY'?'rgba(16,185,129,0.3)':'rgba(255,255,255,0.06)'}`, borderRadius:20, padding:'22px', backdropFilter:'blur(12px)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
                    <Activity size={20} color={monitor?.status==='READY_TO_DEPLOY'?'#10b981':'#6b7280'} />
                    <h3 style={{ fontSize:16, fontWeight:800, color:'#fff', margin:0 }}>AI Execution Engine</h3>
                    <span style={{ marginLeft:'auto', fontSize:10, padding:'3px 10px', borderRadius:100, background:monitor?.status==='READY_TO_DEPLOY'?'rgba(16,185,129,0.15)':'rgba(251,191,36,0.1)', color:monitor?.status==='READY_TO_DEPLOY'?'#34d399':'#fbbf24', border:`1px solid ${monitor?.status==='READY_TO_DEPLOY'?'rgba(16,185,129,0.3)':'rgba(251,191,36,0.25)'}`, fontWeight:700 }}>
                      {monitor?.status || 'MONITORING'}
                    </span>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
                    {[
                      { l:'Vault ETH',     v:(queue?.summary?.vaultEth??0).toFixed(4)+' ETH',       c:'#60a5fa' },
                      { l:'Deployer ETH',  v:(queue?.summary?.deployerEth??0).toFixed(4)+' ETH',    c:'#60a5fa' },
                      { l:'Total AUM',     v:fmtUsd(queue?.summary?.aumUSD??0),                     c:'#10b981' },
                      { l:'Deployment',    v:(queue?.summary?.deploymentPct??0).toFixed(1)+'%',     c:'#a78bfa' },
                    ].map(s => (
                      <div key={s.l} style={{ background:'rgba(255,255,255,0.04)', borderRadius:12, padding:'12px' }}>
                        <div style={{ fontSize:10, color:'rgba(255,255,255,0.4)', marginBottom:3 }}>{s.l}</div>
                        <div style={{ fontSize:15, fontWeight:800, color:s.c, fontFamily:'monospace' }}>{s.v}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
                  {/* Gelato setup */}
                  <div style={{ background:'rgba(13,13,32,0.85)', border:`1px solid ${queue?.gelatoSetup?.configured?'rgba(16,185,129,0.25)':'rgba(251,191,36,0.2)'}`, borderRadius:20, padding:'22px', backdropFilter:'blur(12px)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                      <Zap size={16} color={queue?.gelatoSetup?.configured?'#10b981':'#f59e0b'} />
                      <h3 style={{ fontSize:14, fontWeight:700, color:'rgba(255,255,255,0.8)', margin:0 }}>Gelato Relay</h3>
                      <span style={{ marginLeft:'auto', fontSize:9, padding:'2px 7px', borderRadius:100, background:queue?.gelatoSetup?.configured?'rgba(16,185,129,0.12)':'rgba(251,191,36,0.1)', color:queue?.gelatoSetup?.configured?'#34d399':'#fbbf24', fontWeight:700, border:'1px solid currentColor' }}>
                        {queue?.gelatoSetup?.configured?'CONFIGURED':'SETUP REQUIRED'}
                      </span>
                    </div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginBottom:12, lineHeight:1.7 }}>
                      Executes trades via Gelato's relay network. <strong style={{color:'#fff'}}>No private key needed</strong> — institutional grade. Just an API key.
                    </div>
                    {(queue?.gelatoSetup?.instructions || []).map((s: string, i: number) => (
                      <div key={i} style={{ display:'flex', gap:8, alignItems:'flex-start', marginBottom:6 }}>
                        <span style={{ fontSize:10, color:'#7c3aed', fontWeight:800, minWidth:16 }}>{i+1}.</span>
                        <span style={{ fontSize:11, color:'rgba(255,255,255,0.5)', lineHeight:1.5 }}>{s}</span>
                      </div>
                    ))}
                    <a href="https://app.gelato.network" target="_blank" rel="noopener noreferrer" style={{ display:'block', marginTop:12, padding:'8px 14px', borderRadius:10, background:'rgba(251,191,36,0.1)', border:'1px solid rgba(251,191,36,0.2)', color:'#fbbf24', fontSize:11, fontWeight:700, textAlign:'center', textDecoration:'none' }}>
                      Get Gelato API Key → app.gelato.network
                    </a>
                  </div>

                  {/* Chainlink Automation setup */}
                  <div style={{ background:'rgba(13,13,32,0.85)', border:'1px solid rgba(99,102,241,0.25)', borderRadius:20, padding:'22px', backdropFilter:'blur(12px)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                      <Shield size={16} color="#6366f1" />
                      <h3 style={{ fontSize:14, fontWeight:700, color:'rgba(255,255,255,0.8)', margin:0 }}>Chainlink Automation</h3>
                      <span style={{ marginLeft:'auto', fontSize:9, padding:'2px 7px', borderRadius:100, background:'rgba(99,102,241,0.12)', color:'#818cf8', fontWeight:700, border:'1px solid rgba(99,102,241,0.25)' }}>READY TO REGISTER</span>
                    </div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginBottom:12, lineHeight:1.7 }}>
                      <strong style={{color:'#fff'}}>Fully on-chain automation</strong> — vault implements <code style={{color:'#a78bfa'}}>checkUpkeep</code> + <code style={{color:'#a78bfa'}}>performUpkeep</code>. Chainlink executes when funds arrive. Fund with LINK only.
                    </div>
                    {(queue?.chainlinkSetup?.instructions || []).map((s: string, i: number) => (
                      <div key={i} style={{ display:'flex', gap:8, alignItems:'flex-start', marginBottom:6 }}>
                        <span style={{ fontSize:10, color:'#6366f1', fontWeight:800, minWidth:16 }}>{i+1}.</span>
                        <span style={{ fontSize:11, color:'rgba(255,255,255,0.5)', lineHeight:1.5 }}>{s.replace(queue?.summary?.vaultAddress||'','').replace('0x506F…853Fa','')}{s.includes(queue?.summary?.vaultAddress||'X')&&<a href={`https://automation.chain.link`} style={{color:'#818cf8'}} target="_blank" rel="noopener noreferrer">{(queue?.summary?.vaultAddress||'').slice(0,8)}…</a>}</span>
                      </div>
                    ))}
                    <a href="https://automation.chain.link" target="_blank" rel="noopener noreferrer" style={{ display:'block', marginTop:12, padding:'8px 14px', borderRadius:10, background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.2)', color:'#818cf8', fontSize:11, fontWeight:700, textAlign:'center', textDecoration:'none' }}>
                      Register Upkeep → automation.chain.link
                    </a>
                  </div>
                </div>

                {/* Allocation plan */}
                {monitor?.allocation?.plan && monitor.allocation.plan.length > 0 && (
                  <div style={{ background:'rgba(13,13,32,0.85)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:20, padding:'22px', backdropFilter:'blur(12px)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                      <BarChart3 size={16} color="#a78bfa" />
                      <h3 style={{ fontSize:14, fontWeight:700, color:'rgba(255,255,255,0.8)', margin:0 }}>AI Allocation Plan</h3>
                      <span style={{ marginLeft:'auto', fontSize:11, color:'rgba(255,255,255,0.4)' }}>
                        {monitor.allocation.readyTrades} trades · {fmtUsd(monitor.allocation.totalDeployUSD)} to deploy
                      </span>
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'60px 1fr 60px 70px 70px 70px 70px', gap:6, padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,0.06)', fontSize:9, color:'rgba(255,255,255,0.35)', fontWeight:700, textTransform:'uppercase' }}>
                      <span>Asset</span><span>Name</span><span style={{textAlign:'right'}}>Weight</span><span style={{textAlign:'right'}}>USD</span><span style={{textAlign:'right'}}>ETH</span><span style={{textAlign:'right'}}>Signal</span><span style={{textAlign:'right'}}>Status</span>
                    </div>
                    {monitor.allocation.plan.slice(0,20).map((t: any) => (
                      <div key={t.symbol} style={{ display:'grid', gridTemplateColumns:'60px 1fr 60px 70px 70px 70px 70px', gap:6, padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,0.03)', alignItems:'center' }}>
                        <span style={{ fontWeight:800, fontSize:12 }}>{t.symbol}</span>
                        <span style={{ fontSize:10, color:'rgba(255,255,255,0.5)' }}>{t.name}</span>
                        <span style={{ textAlign:'right', fontSize:11, fontFamily:'monospace', color:'rgba(255,255,255,0.5)' }}>{t.weight}%</span>
                        <span style={{ textAlign:'right', fontSize:11, fontFamily:'monospace', color:'#10b981' }}>{fmtUsd(t.usdValue)}</span>
                        <span style={{ textAlign:'right', fontSize:10, fontFamily:'monospace', color:'rgba(255,255,255,0.5)' }}>{t.ethToSpend.toFixed(4)}</span>
                        <div style={{ display:'flex', justifyContent:'flex-end' }}>
                          <span style={{ fontSize:9, padding:'1px 6px', borderRadius:100, background:`${ACTION_COL[t.aiAction]||'#7c3aed'}20`, color:ACTION_COL[t.aiAction]||'#7c3aed', border:`1px solid ${ACTION_COL[t.aiAction]||'#7c3aed'}40`, fontWeight:700 }}>{t.aiAction}</span>
                        </div>
                        <div style={{ display:'flex', justifyContent:'flex-end' }}>
                          <span style={{ fontSize:9, padding:'1px 6px', borderRadius:100, fontWeight:700, background:t.canExecute?'rgba(16,185,129,0.1)':'rgba(251,191,36,0.1)', color:t.canExecute?'#34d399':'#fbbf24', border:`1px solid ${t.canExecute?'rgba(16,185,129,0.25)':'rgba(251,191,36,0.25)'}` }}>
                            {t.canExecute?'READY':'WAITING'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Recent deposits and executions */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
                  <div style={{ background:'rgba(13,13,32,0.85)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:20, padding:'22px', backdropFilter:'blur(12px)' }}>
                    <h3 style={{ fontSize:14, fontWeight:700, color:'rgba(255,255,255,0.8)', marginBottom:14 }}>Recent Deposits</h3>
                    {queue?.deposits?.length > 0 ? (
                      queue.deposits.slice(0,5).map((d: any, i: number) => (
                        <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                          <div>
                            <div style={{ fontSize:12, fontWeight:700, color:'#10b981' }}>+{d.ethAmount.toFixed(4)} ETH</div>
                            <div style={{ fontSize:10, color:'rgba(255,255,255,0.35)' }}>{fmtUsd(d.usdValue)} · {new Date(d.timestamp).toLocaleDateString()}</div>
                          </div>
                          <a href={d.etherscan} target="_blank" rel="noopener noreferrer" style={{ fontSize:10, color:'#60a5fa', textDecoration:'none' }}>Etherscan ↗</a>
                        </div>
                      ))
                    ) : (
                      <div style={{ textAlign:'center', padding:'20px', color:'rgba(255,255,255,0.3)', fontSize:12 }}>
                        <div style={{ marginBottom:8 }}>Monitoring wallet for deposits…</div>
                        <div style={{ fontSize:10, fontFamily:'monospace', color:'rgba(255,255,255,0.2)' }}>{(queue?.summary?.deployerAddress||'').slice(0,14)}…</div>
                      </div>
                    )}
                  </div>
                  <div style={{ background:'rgba(13,13,32,0.85)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:20, padding:'22px', backdropFilter:'blur(12px)' }}>
                    <h3 style={{ fontSize:14, fontWeight:700, color:'rgba(255,255,255,0.8)', marginBottom:14 }}>Token Positions (On-Chain)</h3>
                    {queue?.tokenPositions?.length > 0 ? (
                      queue.tokenPositions.slice(0,5).map((t: any, i: number) => (
                        <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                          <div>
                            <div style={{ fontSize:12, fontWeight:700, color:'#a78bfa' }}>{t.symbol}</div>
                            <div style={{ fontSize:10, color:'rgba(255,255,255,0.35)' }}>{t.amount.toLocaleString('en-US',{maximumFractionDigits:4})}</div>
                          </div>
                          <a href={t.etherscan} target="_blank" rel="noopener noreferrer" style={{ fontSize:10, color:'#60a5fa', textDecoration:'none' }}>Etherscan ↗</a>
                        </div>
                      ))
                    ) : (
                      <div style={{ textAlign:'center', padding:'20px', color:'rgba(255,255,255,0.3)', fontSize:12 }}>
                        <div style={{ marginBottom:8 }}>No on-chain positions yet</div>
                        <div style={{ fontSize:10, color:'rgba(255,255,255,0.2)' }}>Positions appear here once Gelato or Chainlink executes the first trade</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── FEES TAB ── */}
            {tab === 'fees' && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
                <div style={{ background:'rgba(13,13,32,0.85)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:20, padding:'24px', backdropFilter:'blur(12px)' }}>
                  <h3 style={{ fontSize:14, fontWeight:700, color:'rgba(255,255,255,0.8)', marginBottom:18 }}>Fee Structure</h3>
                  <div style={{ padding:'14px', background:'rgba(124,58,237,0.07)', border:'1px solid rgba(124,58,237,0.18)', borderRadius:12, marginBottom:14 }}>
                    <div style={{ fontSize:12, fontWeight:700, marginBottom:4 }}>Performance Fee: 15% of yields</div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', lineHeight:1.7 }}>No management fee · No deposit fee · No withdrawal fee. Only charged on positive portfolio yield.</div>
                    <div style={{ fontSize:16, fontWeight:900, color:'#a78bfa', fontFamily:'monospace', marginTop:8 }}>{fmtUsd(Math.max(0,hasHoldings?totalPnL*0.15:0))}</div>
                    <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', marginTop:2 }}>Estimated YTD fee on your holdings</div>
                  </div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', lineHeight:1.8 }}>
                    15% performance fee is distributed:<br/>
                    <strong style={{color:'#10b981'}}>60%</strong> → Open-market INQAI buybacks (buy pressure)<br/>
                    <strong style={{color:'#ef4444'}}>20%</strong> → Permanent token burns (deflationary)<br/>
                    <strong style={{color:'#f59e0b'}}>20%</strong> → Treasury (development &amp; security reserves)
                  </div>
                </div>
                <div style={{ background:'rgba(13,13,32,0.85)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:20, padding:'24px', backdropFilter:'blur(12px)' }}>
                  <h3 style={{ fontSize:14, fontWeight:700, color:'rgba(255,255,255,0.8)', marginBottom:18 }}>Fee Allocation</h3>
                  {(() => {
                    const totalFees = Math.max(0, hasHoldings ? totalPnL * 0.15 : 0);
                    return [
                      { l:'Buybacks (60%)',  v:totalFees*0.6, p:60, c:'#10b981', d:'INQAI bought on open market → creates buy pressure' },
                      { l:'Burns (20%)',     v:totalFees*0.2, p:20, c:'#ef4444', d:'INQAI permanently destroyed → reduces supply' },
                      { l:'Treasury (20%)', v:totalFees*0.2, p:20, c:'#f59e0b', d:'Protocol reserves for development & security' },
                    ];
                  })().map(f => (
                    <div key={f.l} style={{ marginBottom:16 }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                        <span style={{ fontSize:12, fontWeight:700 }}>{f.l}</span>
                        <span style={{ fontSize:14, fontWeight:900, color:f.c, fontFamily:'monospace' }}>{fmtUsd(f.v)}</span>
                      </div>
                      <div style={{ height:4, background:'rgba(255,255,255,0.06)', borderRadius:2, overflow:'hidden', marginBottom:4 }}><div style={{ height:'100%', width:`${f.p}%`, background:f.c, borderRadius:2 }} /></div>
                      <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)' }}>{f.d}</div>
                    </div>
                  ))}
                </div>
                <div style={{ gridColumn:'1 / -1', background:'rgba(13,13,32,0.85)', border:'1px solid rgba(124,58,237,0.15)', borderRadius:20, padding:'24px', backdropFilter:'blur(12px)' }}>
                  <h3 style={{ fontSize:14, fontWeight:700, color:'rgba(255,255,255,0.8)', marginBottom:18 }}>Tokenomics</h3>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
                    {[
                      { l:'Total Supply',  v:'100,000,000',       sub:'Fixed · never changes',       c:'#fff',    i:'flame' },
                      { l:'Presale Price', v:'$8.00',              sub:'47% below $15 target',        c:'#a78bfa', i:'price' },
                      { l:'Target Price',  v:'$15.00',             sub:'Based on portfolio + fees',   c:'#10b981', i:'target' },
                      { l:'Target APY',    v:'18.5%',              sub:'Multi-strategy AI yield',     c:'#f59e0b', i:'apy' },
                    ].map(t => (
                      <div key={t.l} style={{ textAlign:'center', padding:'20px 16px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:14 }}>
                        <div style={{ marginBottom:8, display:'flex', justifyContent:'center' }}>
                          {t.i==='flame' &&<Flame      size={28} color={t.c} strokeWidth={1.5} />}
                          {t.i==='price' &&<DollarSign size={28} color={t.c} strokeWidth={1.5} />}
                          {t.i==='target'&&<Target     size={28} color={t.c} strokeWidth={1.5} />}
                          {t.i==='apy'   &&<TrendingUp size={28} color={t.c} strokeWidth={1.5} />}
                        </div>
                        <div style={{ fontSize:18, fontWeight:900, color:t.c, fontFamily:'monospace' }}>{t.v}</div>
                        <div style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.6)', marginTop:3 }}>{t.l}</div>
                        <div style={{ fontSize:10, color:'rgba(255,255,255,0.25)', marginTop:2 }}>{t.sub}</div>
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
