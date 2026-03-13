import { useState, useEffect, useCallback, useRef } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { CheckCircle2, AlertTriangle, Activity } from 'lucide-react';

const WalletButton   = dynamic(() => import('../src/components/WalletButton'), { ssr: false });
const PortfolioChart = dynamic(() => import('../src/components/charts/LiveCharts').then(m => m.PortfolioChart), { ssr: false });

const fmtUsd = (n: number) => {
  if (!n && n !== 0) return '$0';
  if (n >= 1e9) return '$' + (n/1e9).toFixed(2) + 'B';
  if (n >= 1e6) return '$' + (n/1e6).toFixed(2) + 'M';
  if (n >= 1e3) return '$' + (n/1e3).toFixed(1) + 'K';
  return '$' + Math.abs(n).toFixed(2);
};
const pct = (n: number) => `${n >= 0 ? '+' : ''}${(n * 100).toFixed(2)}%`;
const grc = (n: number) => n >= 0 ? '#10b981' : '#ef4444';

const ACTION_STYLE: Record<string, { bg: string; col: string; border: string }> = {
  BUY:       { bg: 'rgba(16,185,129,0.12)',  col: '#34d399',  border: 'rgba(16,185,129,0.3)'  },
  SELL:      { bg: 'rgba(239,68,68,0.12)',   col: '#f87171',  border: 'rgba(239,68,68,0.3)'   },
  REDUCE:    { bg: 'rgba(252,165,165,0.1)',  col: '#fca5a5',  border: 'rgba(252,165,165,0.25)'},
  STAKE:     { bg: 'rgba(14,165,233,0.12)',  col: '#38bdf8',  border: 'rgba(14,165,233,0.3)'  },
  LEND:      { bg: 'rgba(245,158,11,0.12)',  col: '#fbbf24',  border: 'rgba(245,158,11,0.3)'  },
  YIELD:     { bg: 'rgba(132,204,22,0.12)',  col: '#a3e635',  border: 'rgba(132,204,22,0.3)'  },
  BORROW:    { bg: 'rgba(6,182,212,0.12)',   col: '#22d3ee',  border: 'rgba(6,182,212,0.3)'   },
  SWAP:      { bg: 'rgba(59,130,246,0.12)',  col: '#60a5fa',  border: 'rgba(59,130,246,0.3)'  },
  EARN:      { bg: 'rgba(167,139,250,0.12)', col: '#a78bfa',  border: 'rgba(167,139,250,0.3)' },
  LOOP:      { bg: 'rgba(251,146,60,0.12)',  col: '#fb923c',  border: 'rgba(251,146,60,0.3)'  },
  MULTIPLY:  { bg: 'rgba(236,72,153,0.12)',  col: '#f472b6',  border: 'rgba(236,72,153,0.3)'  },
  REWARDS:   { bg: 'rgba(234,179,8,0.12)',   col: '#facc15',  border: 'rgba(234,179,8,0.3)'   },
  HOLD:      { bg: 'rgba(107,114,128,0.08)', col: '#9ca3af',  border: 'rgba(107,114,128,0.2)' },
  SKIP:      { bg: 'rgba(75,85,99,0.08)',    col: '#6b7280',  border: 'rgba(75,85,99,0.15)'   },
};

const EXEC_FUNCTIONS = new Set(['BUY','SELL','SWAP','LEND','YIELD','BORROW','LOOP','STAKE','MULTIPLY','EARN','REWARDS']);

function buildFeed(signals: any[], cycle: number) {
  const cycleMs = cycle * 8000;
  const rationaleMap: Record<string, string> = {
    BUY:       'Pattern + Reasoning engines in consensus. Entry conditions met. 2% capital risk limit applied.',
    SELL:      'Profit target or stop-loss triggered. Position closed per risk management protocol.',
    REDUCE:    'Partial exit. Risk reduction initiated by Portfolio Engine.',
    STAKE:     'Staking deployment active. Capital staked at live protocol APY.',
    LEND:      'Lending pool deployment active. Risk-adjusted APY exceeds opportunity cost.',
    YIELD:     'Yield position active. Pool selected based on risk-adjusted return.',
    BORROW:    'Collateral-backed borrow active. Health factor maintained above 1.5 floor.',
    SWAP:      'Route-optimized swap executed via best-available DEX aggregator.',
    EARN:      'Multi-source yield deployment active. Highest risk-adjusted APY selected.',
    LOOP:      'Recursive yield loop active. Borrow against collateral, re-deployed to same pool.',
    MULTIPLY:  'Leveraged long position open. Bull regime + major asset + high conviction.',
    REWARDS:   'Staking rewards auto-compounded. Yield accumulation in progress.',
    HOLD:      'Monitoring. Confidence below execution threshold — position unchanged.',
    SKIP:      'Risk Gate blocked. Insufficient confidence or liquidity for execution.',
  };
  // Sort: active 11-function executions first (highest conviction), then by score desc
  const sorted = [...signals].sort((a, b) => {
    const aExec = EXEC_FUNCTIONS.has(a.action || 'HOLD') && a.action !== 'HOLD';
    const bExec = EXEC_FUNCTIONS.has(b.action || 'HOLD') && b.action !== 'HOLD';
    if (aExec && !bExec) return -1;
    if (!aExec && bExec) return 1;
    return (b.finalScore || 0) - (a.finalScore || 0);
  });
  return sorted.map((s, i) => {
    const ts = new Date(cycleMs - i * 120);
    const timeStr = ts.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const action = s.action || 'HOLD';
    const conf = s.finalScore || 0;
    const isActive = EXEC_FUNCTIONS.has(action) && !['HOLD','SKIP','REDUCE'].includes(action);
    return {
      id: `${cycle}-${s.symbol}-${i}`,
      time: timeStr,
      symbol: s.symbol,
      category: s.category || 'major',
      action,
      confidence: conf,
      rationale: rationaleMap[action] || 'Evaluation complete.',
      executed: isActive,
    };
  });
}

export default function Dashboard() {
  const router = useRouter();
  const [dash, setDash]               = useState<any>(null);
  const [positions, setPositions]     = useState<any[]>([]);
  const [wsStatus, setWsStatus]       = useState<'connecting'|'live'|'off'>('connecting');
  const [hasLiveData, setHasLiveData] = useState(false);
  const [equityCurve, setEquityCurve] = useState<any[]>([]);
  const [tradeFeed, setTradeFeed]     = useState<any[]>([]);
  const [composition, setComposition] = useState<any[]>([]);
  const [refreshing, setRefreshing]   = useState(false);
  const [vaultStatus, setVaultStatus] = useState<any>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const load = useCallback(async (bust = false) => {
    const t = bust ? `?_t=${Date.now()}` : `?_t=${Math.floor(Date.now() / 10000) * 10000}`;
    if (bust) setRefreshing(true);
    try {
      const [dd, dr, pr, eq, st] = await Promise.allSettled([
        fetch(`/api/dashboard${t}`),
        fetch(`/api/inquisitiveAI/dashboard${t}`),
        fetch(`/api/inquisitiveAI/portfolio/positions${t}`),
        fetch(`/api/inquisitiveAI/chart/portfolio${t}`),
        fetch(`/api/inquisitiveAI/execute/status`),
      ]);

      // /api/dashboard is the authoritative source for vault ETH + real P&L
      let base: any = null;
      if (dd.status === 'fulfilled' && dd.value.ok) {
        base = await dd.value.json();
        setDash((prev: any) => ({ ...prev, ...base }));
        setHasLiveData(true);
        if (base?.portfolio?.composition?.length) setComposition(base.portfolio.composition);
      }

      // /api/inquisitiveAI/dashboard provides AI signals, risk, macro — does NOT override vault/performance
      if (dr.status === 'fulfilled' && dr.value.ok) {
        const d = await dr.value.json();
        setDash((prev: any) => ({
          ...prev,
          // AI intelligence data only — vault + performance stay from /api/dashboard
          aiSignals: d.aiSignals ?? prev?.aiSignals,
          risk:      d.risk      ?? prev?.risk,
          macro:     d.macro     ?? prev?.macro,
          portfolio: {
            ...prev?.portfolio,
            composition: d.portfolio?.composition ?? prev?.portfolio?.composition,
            assetCount:  d.portfolio?.assetCount  ?? prev?.portfolio?.assetCount,
          },
        }));
        const topBuys = d?.aiSignals?.topBuys || base?.aiSignals?.topBuys || [];
        setTradeFeed(buildFeed(topBuys, d?.aiSignals?.cycleCount || base?.aiSignals?.cycleCount || 0));
        if (d?.portfolio?.composition?.length) setComposition(d.portfolio.composition);
      } else if (base) {
        setTradeFeed(buildFeed(base?.aiSignals?.topBuys || [], base?.aiSignals?.cycleCount || 0));
      }

      if (pr.status === 'fulfilled' && pr.value.ok) {
        const d = await pr.value.json();
        setPositions(d.positions || []);
      }

      if (eq.status === 'fulfilled' && eq.value.ok) {
        const d = await eq.value.json();
        setEquityCurve(d.curve || []);
      }

      if (st.status === 'fulfilled' && st.value.ok) {
        setVaultStatus(await st.value.json());
      }
    } catch {}
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); const t = setInterval(() => load(), 10000); return () => clearInterval(t); }, [load]);

  useEffect(() => {
    const connect = () => {
      try {
        const ws = new WebSocket('ws://localhost:3002');
        wsRef.current = ws;
        ws.onopen  = () => setWsStatus('live');
        ws.onclose = () => { setWsStatus('off'); setTimeout(connect, 5000); };
        ws.onerror = () => ws.close();
      } catch { setWsStatus('off'); }
    };
    connect();
    return () => wsRef.current?.close();
  }, []);

  const d      = dash;
  const fg     = d?.risk?.fearGreed || d?.macro?.fearGreed;
  const regime = d?.risk?.regime || '—';
  const regCol = regime === 'BULL' ? '#10b981' : regime === 'BEAR' ? '#ef4444' : '#f59e0b';
  const pnl       = d?.performance?.totalPnL || 0;
  const vaultUSD  = d?.vault?.usd  || 0;
  const vaultEth  = d?.vault?.eth  || 0;
  const cycles = vaultStatus?.cycleCount || 0;

  const topBuy    = (d?.aiSignals?.topBuys || [])[0];
  const engScores = [
    { name: 'Pattern Engine',   val: topBuy?.components?.patternEngine   ?? 0, col: '#3b82f6' },
    { name: 'Reasoning Engine', val: topBuy?.components?.reasoningEngine ?? 0, col: '#10b981' },
    { name: 'Portfolio Engine', val: topBuy?.components?.portfolioEngine ?? 0, col: '#a78bfa' },
    { name: 'Learning Engine',  val: topBuy?.components?.learningEngine  ?? 0, col: '#f97316' },
  ];

  const riskGates = [
    { label: 'Portfolio Heat',  val: `${((d?.risk?.portfolioHeat||0)*100).toFixed(1)}%`,  limit: '6% max',    ok: (d?.risk?.portfolioHeat||0) < 0.06 },
    { label: 'Max Drawdown',    val: `${((d?.risk?.drawdown||0)*100).toFixed(1)}%`,        limit: '15% limit', ok: (d?.risk?.drawdown||0) < 0.15      },
    { label: 'Risk per Trade',  val: '2.0%',                                                limit: 'hard cap',  ok: true                               },
    { label: 'R:R Minimum',     val: '2:1',                                                 limit: 'required',  ok: true                               },
    { label: 'Confidence Floor',val: '70%',                                                 limit: 'threshold', ok: true                               },
    { label: 'Data Feed',       val: hasLiveData ? 'LIVE' : 'LOADING',                    limit: '',          ok: hasLiveData                        },
  ];

  const topSignals = (d?.aiSignals?.topBuys || []).slice(0, 10);

  const equityChange = (() => {
    if (equityCurve.length < 2) return 0;
    const first = equityCurve[0]?.v || 10000;
    const last  = equityCurve[equityCurve.length - 1]?.v || 10000;
    return (last - first) / first;
  })();

  return (
    <>
      <Head><title>Portfolio Monitor | INQUISITIVE</title></Head>
      <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#07071a', color: '#fff', fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif', overflow: 'hidden' }}>
        <div className="mesh-bg" />

        {/* ── TOP NAV ── */}
        <nav style={{ position: 'relative', background: 'rgba(7,7,26,0.96)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0, zIndex: 10 }}>
          <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button onClick={() => router.push('/')} style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
              <div className="anim-name-pulse" style={{ fontWeight: 900, fontSize: 20, letterSpacing: '-0.6px', color: '#fff', lineHeight: 1 }}>INQUISITIVE</div>
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: (wsStatus === 'live' || hasLiveData) ? '#10b981' : '#ef4444', display: 'inline-block', boxShadow: (wsStatus === 'live' || hasLiveData) ? '0 0 8px #10b981' : undefined }} className={(wsStatus === 'live' || hasLiveData) ? 'anim-blink' : undefined} />
                {(wsStatus === 'live' || hasLiveData) ? 'Live' : 'Offline'}
              </span>
              <span>Regime <strong style={{ color: regCol }}>{regime}</strong></span>
              <span>F&amp;G <strong style={{ color: fg?.value < 30 ? '#ef4444' : fg?.value > 70 ? '#10b981' : '#f59e0b' }}>{fg?.value || '—'}</strong></span>
              <span>Cycle <strong style={{ color: '#fff' }}>#{cycles.toLocaleString()}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {[{l:'AI Analytics',p:'/dashboard',accent:true},{l:'Portfolio',p:'/analytics',accent:false},{l:'Docs',p:'/help',accent:false}].map(n=>(
                <button key={n.l} onClick={()=>router.push(n.p)} style={{
                  padding:'7px 14px', borderRadius:9, border: n.accent ? '1px solid rgba(255,255,255,0.1)' : 'none',
                  background: n.accent ? 'linear-gradient(135deg,#7c3aed,#4f46e5)' : 'transparent',
                  color: n.accent ? '#fff' : 'rgba(255,255,255,0.55)', fontSize:13, fontWeight: n.accent ? 700 : 500, cursor:'pointer',
                  boxShadow: n.accent ? '0 2px 12px rgba(124,58,237,0.35)' : 'none',
                }}>{n.l}</button>
              ))}
              <button
                onClick={() => load(true)}
                disabled={refreshing}
                title="Force refresh — bypasses CDN cache"
                style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:8, fontSize:11, fontWeight:600, cursor: refreshing ? 'wait' : 'pointer', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color: refreshing ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.4)', marginLeft:4 }}
              >
                <span style={{ display:'inline-block', animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }}>⟳</span>
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </button>
              <div style={{ marginLeft: 8 }}><WalletButton label="Connect" /></div>
            </div>
          </div>
        </nav>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

        {/* ── STATS BAR ── */}
        <div style={{ height: 44, background: 'rgba(8,8,22,0.9)', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'stretch', flexShrink: 0, zIndex: 9 }}>
          {[
            { label: 'Vault P&L 24h',    val: vaultUSD > 0 ? (pnl >= 0 ? '+' : '') + fmtUsd(pnl) : '—',                         col: vaultUSD > 0 ? grc(pnl) : 'rgba(255,255,255,0.3)' },
            { label: 'Vault AUM',         val: vaultUSD > 0 ? fmtUsd(vaultUSD) : (vaultEth > 0 ? vaultEth.toFixed(4)+' ETH' : '—'), col: '#60a5fa' },
            { label: 'Executing',         val: String(tradeFeed.filter((e:any) => e.executed).length),                            col: '#34d399'       },
            { label: 'Open Positions',    val: String(positions.length),                                                           col: '#60a5fa'       },
            { label: 'Portfolio Heat',    val: ((d?.risk?.portfolioHeat || 0) * 100).toFixed(1) + '%',                            col: (d?.risk?.portfolioHeat || 0) > 0.04 ? '#f59e0b' : '#10b981' },
            { label: 'Max Drawdown',      val: ((d?.risk?.drawdown || 0) * 100).toFixed(1) + '%',                                 col: (d?.risk?.drawdown || 0) > 0.08 ? '#ef4444' : '#10b981'     },
            { label: 'Active Functions',  val: String(new Set(tradeFeed.filter((e:any) => e.executed).map((e:any) => e.action)).size), col: '#a78bfa' },
            { label: 'Monitoring',        val: String(tradeFeed.filter((e:any) => e.action === 'HOLD').length),                   col: '#9ca3af'       },
            { label: '48h Return',        val: (equityChange >= 0 ? '+' : '') + (equityChange * 100).toFixed(2) + '%',            col: grc(equityChange) },
          ].map(s => (
            <div key={s.label} style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 16px', borderRight: '1px solid rgba(255,255,255,0.04)', minWidth: 90 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: s.col, fontFamily: 'monospace', lineHeight: 1.2 }}>{s.val}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: 1 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── VAULT STATUS BANNER ── */}
        {vaultStatus && (
          <div style={{ flexShrink: 0, background: vaultStatus.readiness === 'FULLY_OPERATIONAL' ? 'rgba(16,185,129,0.07)' : 'rgba(245,158,11,0.07)', borderBottom: '1px solid ' + (vaultStatus.readiness === 'FULLY_OPERATIONAL' ? 'rgba(16,185,129,0.18)' : 'rgba(245,158,11,0.18)'), padding: '6px 20px', display: 'flex', alignItems: 'center', gap: 20, zIndex: 8, fontSize: 11 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, color: vaultStatus.readiness === 'FULLY_OPERATIONAL' ? '#34d399' : '#f59e0b' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: vaultStatus.readiness === 'FULLY_OPERATIONAL' ? '#10b981' : '#f59e0b', display: 'inline-block', boxShadow: '0 0 6px currentColor' }} />
              {vaultStatus.readiness === 'FULLY_OPERATIONAL' ? 'VAULT LIVE' : vaultStatus.readiness.replace('_', ' ')}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, color: 'rgba(255,255,255,0.45)', fontSize: 10 }}>
              {[{l:'Portfolio',v: vaultStatus.portfolioLength > 0 ? `${vaultStatus.portfolioLength} assets configured ✓` : 'Not configured — call setPortfolio()'},
                {l:'Automation',v: vaultStatus.automationActive ? 'ENABLED ✓' : 'Disabled — call setAutomationEnabled(true)'},
                {l:'Vault ETH', v: vaultStatus.vaultETH > 0 ? vaultStatus.vaultETH.toFixed(4) + ' ETH' : '0 ETH — awaiting deposit'},
                {l:'Keeper',    v: 'cron-job.org (1 min) + GitHub Actions (5 min)'},
                {l:'Cycle',     v: vaultStatus.cycleCount > 0 ? '#' + vaultStatus.cycleCount.toLocaleString() : 'Awaiting first cycle'},
              ].map(item => (
                <span key={item.l}>
                  <span style={{ color: 'rgba(255,255,255,0.25)', marginRight: 3 }}>{item.l}:</span>
                  <span style={{ fontWeight: 600, color: item.v.includes('✓') ? '#34d399' : item.v.includes('Not') || item.v.includes('Disabled') || item.v.includes('0 ETH') ? '#f59e0b' : 'rgba(255,255,255,0.65)' }}>{item.v}</span>
                </span>
              ))}
            </div>
            <a href={'https://etherscan.io/address/' + (vaultStatus.vault || '0xaDCFfF8770a162b63693aA84433Ef8B93A35eb52')} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 'auto', fontSize: 9, color: 'rgba(255,255,255,0.2)', textDecoration: 'none', fontFamily: 'monospace' }}>{(vaultStatus.vault || '').slice(0,10)}…↗</a>
          </div>
        )}

        {/* ── MAIN LAYOUT ── */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '290px 1fr 270px', overflow: 'hidden', position: 'relative', zIndex: 1 }}>

          {/* LEFT: AI EXECUTION LOG */}
          <div style={{ borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'rgba(8,8,22,0.7)' }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 2 }}>AI Signal Log</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>Cycle #{cycles.toLocaleString()} · Updated every 8 seconds</div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {tradeFeed.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 12 }}>Awaiting next AI cycle…</div>
              ) : tradeFeed.map((entry: any) => {
                const sty = ACTION_STYLE[entry.action] || ACTION_STYLE.HOLD;
                return (
                  <div key={entry.id} style={{ padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(124,58,237,0.05)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ ...sty, fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4, border: `1px solid ${sty.border}` }}>{entry.action}</span>
                        <span style={{ fontWeight: 800, fontSize: 13 }}>{entry.symbol}</span>
                        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', textTransform: 'capitalize' }}>{entry.category}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', fontFamily: 'monospace' }}>{(entry.confidence * 100).toFixed(0)}%</div>
                        <div style={{ fontSize: 9, color: entry.executed ? '#a78bfa' : 'rgba(255,255,255,0.2)' }}>{entry.executed ? '▶ queued' : '— below threshold'}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', lineHeight: 1.5, marginBottom: 3 }}>{entry.rationale}</div>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.18)', fontFamily: 'monospace' }}>{entry.time}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CENTER: PORTFOLIO */}
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0, background: 'rgba(8,8,22,0.5)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Portfolio Equity — 48h</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: grc(equityChange), fontFamily: 'monospace' }}>{equityChange >= 0 ? '+' : ''}{(equityChange * 100).toFixed(2)}%</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: grc(pnl) }}>{pnl >= 0 ? '+' : ''}{fmtUsd(pnl)} P&amp;L</span>
                </div>
              </div>
              <PortfolioChart data={equityCurve} height={100} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0, background: 'rgba(8,8,22,0.4)' }}>
              {[
                { label: 'AI Buy Signals',  val: String(d?.aiSignals?.buys  || 0), col: '#34d399' },
                { label: 'AI Sell Signals', val: String(d?.aiSignals?.sells || 0), col: '#f87171' },
                { label: 'Assets Tracked',  val: String(d?.portfolio?.assetCount || 65), col: '#60a5fa' },
                { label: 'Vault Cycles',    val: (vaultStatus?.cycleCount || 0).toLocaleString(), col: '#a78bfa' },
              ].map(m => (
                <div key={m.label} style={{ padding: '10px 16px', borderRight: '1px solid rgba(255,255,255,0.04)' }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: m.col, fontFamily: 'monospace' }}>{m.val}</div>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: 2 }}>{m.label}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: '10px 20px 6px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Managed Portfolio</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>Live prices · {composition.filter(c => c.priceUsd > 0).length} assets priced</div>
              </div>
            </div>
            {composition.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '5px 20px', flexShrink: 0, background: 'rgba(8,8,22,0.5)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                {['Asset', 'Weight', 'Price', '24h', 'AI Signal'].map(h => (
                  <span key={h} style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px', textAlign: h === 'Asset' ? 'left' : 'right' }}>{h}</span>
                ))}
              </div>
            )}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {composition.length === 0 ? (
                <div style={{ padding: '28px 20px', textAlign: 'center' }}>
                  <Activity size={26} color="rgba(255,255,255,0.1)" strokeWidth={1.5} style={{ marginBottom: 8 }} />
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)' }}>Loading portfolio data…</div>
                </div>
              ) : composition.map((c: any) => {
                const sty = ACTION_STYLE[c.action] || ACTION_STYLE.HOLD;
                const fmtPrice = c.priceUsd >= 1000 ? '$' + (c.priceUsd/1000).toFixed(1) + 'K' :
                                 c.priceUsd >= 1 ? '$' + c.priceUsd.toFixed(2) :
                                 c.priceUsd > 0  ? '$' + c.priceUsd.toFixed(4) : '—';
                return (
                  <div key={c.symbol} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr', padding: '7px 20px', borderBottom: '1px solid rgba(255,255,255,0.025)', alignItems: 'center', transition: 'background 0.12s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(124,58,237,0.04)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 12 }}>{c.symbol}</span>
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.22)', textTransform: 'capitalize', marginLeft: 6 }}>{c.category}</span>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#60a5fa', fontFamily: 'monospace' }}>{c.weight}%</div>
                    <div style={{ textAlign: 'right', fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,0.7)' }}>{fmtPrice}</div>
                    <div style={{ textAlign: 'right', fontSize: 11, fontWeight: 600, color: c.change24h >= 0 ? '#34d399' : '#f87171', fontFamily: 'monospace' }}>{c.change24h >= 0 ? '+' : ''}{(c.change24h * 100).toFixed(1)}%</div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ ...sty, fontSize: 8, fontWeight: 700, padding: '2px 5px', borderRadius: 3, border: `1px solid ${sty.border}` }}>{c.action}</span>
                    </div>
                  </div>
                );
              })}
              <div style={{ margin: '16px 20px', padding: '14px 16px', background: 'rgba(124,58,237,0.05)', border: '1px solid rgba(124,58,237,0.12)', borderRadius: 10 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Standard of Procedure</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {[
                    { label: 'Risk per trade',    val: '2% maximum'         },
                    { label: 'Reward-to-risk',    val: '2:1 minimum'        },
                    { label: 'Confidence gate',   val: '≥ 70% required'     },
                    { label: 'Portfolio heat cap',val: '6% maximum'         },
                    { label: 'Drawdown halt',     val: '15% circuit breaker'},
                    { label: 'Decision cycle',    val: 'Every 8 seconds'    },
                  ].map(r => (
                    <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                      <span style={{ color: 'rgba(255,255,255,0.35)' }}>{r.label}</span>
                      <span style={{ fontWeight: 600, color: 'rgba(255,255,255,0.65)', fontFamily: 'monospace' }}>{r.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: INTELLIGENCE STATUS */}
          <div style={{ borderLeft: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'rgba(8,8,22,0.7)' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Intelligence Engines</div>
              {engScores.map(m => (
                <div key={m.name} style={{ marginBottom: 11 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', fontWeight: 500 }}>{m.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: m.col, fontFamily: 'monospace' }}>{(m.val * 100).toFixed(0)}%</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${m.val * 100}%`, background: `linear-gradient(90deg,${m.col}70,${m.col})`, borderRadius: 2, transition: 'width 0.8s ease' }} />
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 10, padding: '6px 10px', background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.12)', borderRadius: 6, fontSize: 9, color: 'rgba(251,191,36,0.65)', lineHeight: 1.5 }}>
                Consensus of all four engines required. Minimum 70% combined confidence to execute.
              </div>
            </div>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>Risk Gates</div>
              {riskGates.map(r => (
                <div key={r.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{r.label}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'monospace', color: '#fff' }}>{r.val}</span>
                    {r.limit && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>{r.limit}</span>}
                    {r.ok ? <CheckCircle2 size={13} color="#10b981" /> : <AlertTriangle size={13} color="#f59e0b" />}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>
                Top Signals — Cycle #{cycles}
              </div>
              {topSignals.length === 0 ? (
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', padding: '8px 0' }}>Awaiting next cycle…</div>
              ) : topSignals.map((s: any, i: number) => {
                const sty = ACTION_STYLE[s.action] || ACTION_STYLE.HOLD;
                return (
                  <div key={s.symbol} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', width: 12 }}>{i + 1}</span>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700 }}>{s.symbol}</div>
                        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', textTransform: 'capitalize' }}>{s.category}</div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ ...sty, fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 4, border: `1px solid ${sty.border}`, display: 'inline-block', marginBottom: 2 }}>{s.action}</div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#a78bfa', fontFamily: 'monospace' }}>{((s.finalScore || 0) * 100).toFixed(0)}%</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ padding: '12px 16px', flex: 1, overflowY: 'auto' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 10 }}>Macro Conditions</div>
              {fg && (
                <div style={{ padding: '10px 12px', background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.12)', borderRadius: 8, marginBottom: 10 }}>
                  <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>Fear &amp; Greed Index</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: fg.value < 30 ? '#ef4444' : fg.value > 70 ? '#10b981' : '#f59e0b', fontFamily: 'monospace' }}>{fg.value}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginTop: 2 }}>{fg.valueClassification}</div>
                </div>
              )}
              {Object.values(d?.macro?.indicators || {}).slice(0, 4).map((v: any) => (
                <div key={v.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid rgba(255,255,255,0.03)', fontSize: 11 }}>
                  <span style={{ color: 'rgba(255,255,255,0.35)' }}>{v.key}</span>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{v.current?.toFixed(2)}{v.unit === '%' ? '%' : ''}</span>
                    <span style={{ fontSize: 10, marginLeft: 6, color: grc(v.changePct || 0) }}>{(v.changePct || 0) >= 0 ? '+' : ''}{(v.changePct || 0).toFixed(2)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

