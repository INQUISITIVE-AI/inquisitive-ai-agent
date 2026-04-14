import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import SiteNav from '../src/components/SiteNav';
import {
  Brain, Zap, BarChart3, Shield, Eye,
  TrendingUp, TrendingDown, ArrowLeftRight, Landmark, Leaf,
  RotateCcw, Lock, Layers, Gem, Gift,
  Flame, Building2, Wallet, Bot, Scale, CheckCircle2,
  ArrowRight, Coins, Activity,
} from 'lucide-react';

const fmtUsd = (n: number) => {
  if (!n || isNaN(n)) return '—';
  if (n >= 1e12) return '$' + (n / 1e12).toFixed(2) + 'T';
  if (n >= 1e9)  return '$' + (n / 1e9).toFixed(2)  + 'B';
  if (n >= 1e6)  return '$' + (n / 1e6).toFixed(2)  + 'M';
  if (n >= 1e3)  return '$' + (n / 1e3).toFixed(1)  + 'K';
  return '$' + n.toFixed(2);
};
const pct = (n: number) => `${n >= 0 ? '+' : ''}${(n * 100).toFixed(2)}%`;

export default function Home() {
  const router = useRouter();
  const [data, setData]   = useState<any>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const [dr, ar] = await Promise.all([
        fetch('/api/inquisitiveAI/dashboard'),
        fetch('/api/inquisitiveAI/assets'),
      ]);
      if (dr.ok) setData(await dr.json());
      if (ar.ok) { const d = await ar.json(); setAssets(d.assets || []); }
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  const regime    = data?.risk?.regime || 'NEUTRAL';
  const regimeCol = regime === 'BULL' ? '#10b981' : regime === 'BEAR' ? '#ef4444' : '#f59e0b';
  const fg        = data?.risk?.fearGreed;
  const fgColor   = fg ? (fg.value < 25 ? '#ef4444' : fg.value < 45 ? '#f97316' : fg.value < 55 ? '#f59e0b' : fg.value < 75 ? '#84cc16' : '#10b981') : '#6b7280';
  const return7d  = data?.performance?.return7d;
  const return24h = data?.performance?.return24h;
  const assetCount = assets.length || 66;
  const buys  = data?.aiSignals?.buys ?? 0;
  const sells = data?.aiSignals?.sells ?? 0;
  const navValue = data?.portfolio?.totalValue ?? 100;

  const ARCH = [
    { Icon: Brain,     name: 'Quantitative AI Engine',     sub: 'Five-Engine Decision System',      desc: 'Five independent scoring models — Pattern, Reasoning, Portfolio, Learning, and Risk — reach consensus before any position is taken. 70% threshold enforced.', color: '#7c3aed' },
    { Icon: Zap,       name: 'Autonomous Execution',       sub: 'DeFi Execution Layer',             desc: 'Eleven institutional-grade execution strategies deployed autonomously: yield, lending, staking, leveraged exposure, liquidity provision, and more.', color: '#2563eb' },
    { Icon: BarChart3, name: 'Performance Analytics',      sub: 'Real-Time Risk Attribution',       desc: 'Live P&L attribution, Sharpe ratio, drawdown tracking, portfolio heat, and full decision-level transparency across all 66 positions.', color: '#0891b2' },
    { Icon: Shield,    name: 'Risk Management System',     sub: 'Capital Preservation Layer',       desc: 'Hard-coded risk limits: 2% maximum exposure per trade, 6% portfolio heat ceiling, 15% drawdown circuit breaker with automatic halt and emergency pause.', color: '#dc2626' },
    { Icon: Eye,       name: 'Market Intelligence',        sub: 'Multi-Source Data Infrastructure', desc: 'CoinGecko live API with 30-second refresh across all 66 assets. Macro overlay: Fear & Greed Index, BTC/ETH/SOL regime signals, cross-asset correlation.', color: '#7c3aed' },
  ];

  const TRADES: { Icon: any; name: string; col: string; desc: string }[] = [
    { Icon: TrendingUp,     name: 'BUY',     col: '#10b981', desc: 'Optimal entry execution. 2% portfolio risk limit. Kelly Criterion position sizing. Minimum 2:1 reward-to-risk ratio.' },
    { Icon: TrendingDown,   name: 'SELL',    col: '#ef4444', desc: 'Profit harvesting and stop-loss enforcement. Tracks realized P&L and updates portfolio heat on each exit.' },
    { Icon: ArrowLeftRight, name: 'SWAP',    col: '#3b82f6', desc: 'Best-route execution via Jupiter (Solana) and 1inch (Ethereum). Maximum 0.3% slippage tolerance.' },
    { Icon: Landmark,       name: 'LEND',    col: '#f59e0b', desc: 'Deploys capital to Aave V3, Compound, Morpho Blue, and Maple Finance at live APY rates.' },
    { Icon: Leaf,           name: 'YIELD',   col: '#84cc16', desc: 'Liquidity provision on Uniswap V3. Selects stable, volatile, or leveraged pools based on risk-adjusted return.' },
    { Icon: Coins,          name: 'BORROW',  col: '#06b6d4', desc: 'Collateral-backed borrowing. Maximum 65% LTV enforced. Health factor floor of 1.5. Spread guard active.' },
    { Icon: RotateCcw,      name: 'LOOP',    col: '#8b5cf6', desc: 'Recursive yield amplification. Maximum 5x exposure. 80% LTV cap. Health factor monitored continuously.' },
    { Icon: Lock,           name: 'STAKE',   col: '#0ea5e9', desc: 'Network staking across 27+ protocols including Lido, Jito, Sanctum, Cosmos, and Polkadot.' },
    { Icon: Layers,         name: 'MULTIPLY',col: '#f97316', desc: 'Leveraged long exposure up to 3x. Calculates liquidation price, daily borrow cost, and break-even move.' },
    { Icon: Gem,            name: 'EARN',    col: '#a78bfa', desc: 'Automatic strategy selection. Evaluates all available yield options and deploys to the highest risk-adjusted APY.' },
    { Icon: Gift,           name: 'REWARDS', col: '#ec4899', desc: 'Claims and auto-compounds protocol rewards across 12+ supported platforms. Reinvests immediately.' },
  ];

  // Live stats — show real data, never show "0" in hero
  const heroStats = [
    {
      label: '7D Return',
      value: return7d !== undefined ? pct(return7d) : loaded ? pct(0) : '...',
      color: return7d !== undefined ? (return7d >= 0 ? '#10b981' : '#ef4444') : '#6b7280',
    },
    {
      label: '24H Return',
      value: return24h !== undefined ? pct(return24h) : loaded ? pct(0) : '...',
      color: return24h !== undefined ? (return24h >= 0 ? '#10b981' : '#ef4444') : '#6b7280',
    },
    {
      label: 'Portfolio Index',
      value: loaded ? navValue.toFixed(2) : '...',
      color: navValue >= 100 ? '#10b981' : '#ef4444',
    },
    {
      label: 'Fear & Greed',
      value: fg ? `${fg.value} — ${fg.valueClassification}` : loaded ? '—' : '...',
      color: fgColor,
    },
  ];

  return (
    <>
      <Head>
        <title>INQUISITIVE — The First Open, On-Chain AI Fund</title>
        <meta name="description" content="INQUISITIVE delivers institutional-grade AI portfolio management across 66 digital assets through a single ERC-20 token. Five independent AI engines, 11 execution strategies, fully on-chain and transparent." />
        <meta property="og:title" content="INQUISITIVE — The First Open, On-Chain AI Fund" />
        <meta property="og:description" content="Own 66 assets. Hold one token. AI manages the rest — fully transparent, on-chain, 24/7." />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>
      <div className="min-h-screen" style={{ background: '#07071a', color: '#fff', fontFamily: 'Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif' }}>
        <div className="mesh-bg" />
        <SiteNav position="fixed" />

        {/* ── HERO ── */}
        <section style={{ paddingTop: 110, paddingBottom: 72, paddingLeft: 24, paddingRight: 24, textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: 860, margin: '0 auto' }}>

            {/* Live badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 50, marginBottom: 28, fontSize: 12, fontWeight: 600, color: '#34d399', letterSpacing: '0.3px' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', display: 'inline-block', animation: 'blink-dot 1.5s ease-in-out infinite' }} />
              LIVE · 66 ASSETS · AI MANAGED
            </div>

            <h1 style={{ fontSize: 'clamp(42px,8vw,80px)', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1.05, marginBottom: 20 }}>
              <span className="grad-text">INQUISITIVE</span>
            </h1>

            <div style={{ fontSize: 'clamp(15px,2.2vw,19px)', color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: 12, letterSpacing: '-0.2px' }}>
              The First Open, On-Chain AI Fund
            </div>

            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.38)', maxWidth: 560, margin: '0 auto 40px', lineHeight: 1.85, fontWeight: 400 }}>
              One ERC-20 token. Proportional ownership in a 66-asset portfolio managed by five independent AI engines around the clock — every signal, every weight, every decision verifiable on-chain.
            </p>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 60 }}>
              <button
                onClick={() => router.push('/analytics')}
                style={{ padding: '14px 36px', borderRadius: 12, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 30px rgba(124,58,237,0.4)', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 40px rgba(124,58,237,0.55)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(124,58,237,0.4)'; }}
              >
                View Live Dashboard
              </button>
              <button
                onClick={() => router.push('/buy')}
                style={{ padding: '14px 36px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.12)', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
              >
                Acquire INQAI →
              </button>
            </div>

            {/* Live stats — real portfolio data, no presale garbage */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, maxWidth: 800, margin: '0 auto' }}>
              {heroStats.map(k => (
                <div key={k.label} style={{ background: 'rgba(13,13,32,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '18px 14px', textAlign: 'center', backdropFilter: 'blur(12px)' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: k.color, fontFamily: 'monospace' }}>{k.value}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{k.label}</div>
                </div>
              ))}
            </div>

            {/* AI Signal Pulse — shows the brain is alive */}
            {loaded && (buys > 0 || sells > 0) && (
              <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#34d399' }}>
                  <Activity size={12} />
                  {buys} BUY signals active
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', background: `rgba(${regime === 'BULL' ? '16,185,129' : regime === 'BEAR' ? '239,68,68' : '245,158,11'},0.1)`, border: `1px solid rgba(${regime === 'BULL' ? '16,185,129' : regime === 'BEAR' ? '239,68,68' : '245,158,11'},0.25)`, borderRadius: 8, fontSize: 12, fontWeight: 600, color: regimeCol }}>
                  AI REGIME: {regime}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── ARCHITECTURE ── */}
        <section style={{ padding: '60px 24px', position: 'relative', zIndex: 1, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 44 }}>
              <div style={{ fontSize: 11, letterSpacing: 2, color: '#7c3aed', textTransform: 'uppercase', marginBottom: 10 }}>System Architecture</div>
              <h2 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.5px' }}>Five-Layer Quantitative System</h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: 8, fontSize: 14 }}>Each layer operates independently with dedicated oversight. Designed for institutional-grade reliability.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 12 }}>
              {ARCH.map(c => (
                <div
                  key={c.name}
                  className="card-lift"
                  style={{ background: 'rgba(13,13,32,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: 20, backdropFilter: 'blur(12px)' }}
                >
                  <div style={{ marginBottom: 12 }}><c.Icon size={26} color={c.color} strokeWidth={1.8} /></div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: c.color, marginBottom: 2 }}>{c.name}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 8, fontWeight: 600 }}>{c.sub}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>{c.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── TRADING STRATEGIES ── */}
        <section style={{ padding: '40px 24px 64px', position: 'relative', zIndex: 1, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <div style={{ fontSize: 11, letterSpacing: 2, color: '#7c3aed', textTransform: 'uppercase', marginBottom: 10 }}>Execution Strategies</div>
              <h2 style={{ fontSize: 30, fontWeight: 800 }}>11 Institutional Execution Strategies</h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: 8, fontSize: 14 }}>Deployed autonomously across DeFi. Token holders get diversified yield exposure without active management.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 10 }}>
              {TRADES.map(f => (
                <div
                  key={f.name}
                  className="card-lift"
                  style={{ background: 'rgba(13,13,32,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14, padding: '16px 14px', backdropFilter: 'blur(12px)' }}
                >
                  <div style={{ marginBottom: 10 }}><f.Icon size={22} color={f.col} strokeWidth={1.8} /></div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: f.col, marginBottom: 6 }}>{f.name}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', lineHeight: 1.6 }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── VALUE PROPOSITION ── */}
        <section style={{ padding: '40px 24px 64px', position: 'relative', zIndex: 1, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 44 }}>
              <div style={{ fontSize: 11, letterSpacing: 2, color: '#7c3aed', textTransform: 'uppercase', marginBottom: 10 }}>Fund Structure</div>
              <h2 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.5px' }}>Institutional Exposure. Zero Operational Overhead.</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16, marginBottom: 16 }}>
              {[
                { Icon: Wallet,     title: 'On-Chain Asset Backing',    desc: 'Each INQAI token represents verified, proportional ownership in a 66-asset digital portfolio. Underlying valuations are transparent, real-time, and independently verifiable on-chain.', col: '#a78bfa' },
                { Icon: Bot,        title: 'Autonomous AI Management',  desc: 'Five independent AI models execute eleven capital deployment strategies simultaneously, optimizing risk-adjusted returns across the full 66-asset portfolio without human intervention.', col: '#60a5fa' },
                { Icon: TrendingUp, title: 'Structural Value Accrual',  desc: '60% of all protocol fees fund open-market buybacks. 20% is permanently burned. Every fee cycle reduces circulating supply while increasing demand — systematic, not speculative.', col: '#10b981' },
              ].map(c => (
                <div key={c.title} style={{ background: 'rgba(13,13,32,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: 28, backdropFilter: 'blur(12px)' }}>
                  <div style={{ marginBottom: 16, width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <c.Icon size={24} color={c.col} strokeWidth={1.8} />
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: c.col, marginBottom: 8 }}>{c.title}</div>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, margin: 0 }}>{c.desc}</p>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16 }}>
              {[
                { Icon: Flame,    title: 'Deflationary Fee Design',      desc: 'Protocol fees drive a continuous burn-and-buyback cycle: 60% to open-market INQAI purchases, 20% permanently removed from supply. Designed for long-term supply contraction.', col: '#f59e0b' },
                { Icon: Shield,   title: 'Non-Custodial by Design',      desc: 'INQAI tokens are delivered directly to your self-custody wallet at point of purchase. No third-party custody, no counterparty risk, no permission required to withdraw.', col: '#34d399' },
                { Icon: BarChart3,title: 'Complete Decision Transparency', desc: 'Every AI signal, position, allocation weight, and risk metric is published in real time on the Analytics dashboard. No black box. No selective disclosure.', col: '#f97316' },
              ].map(c => (
                <div key={c.title} style={{ background: 'rgba(13,13,32,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 20, padding: 28, backdropFilter: 'blur(12px)' }}>
                  <div style={{ marginBottom: 16, width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <c.Icon size={24} color={c.col} strokeWidth={1.8} />
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: c.col, marginBottom: 8 }}>{c.title}</div>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, margin: 0 }}>{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEE STRUCTURE ── */}
        <section style={{ padding: '0 24px 64px', position: 'relative', zIndex: 1, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 40, paddingTop: 60 }}>
              <div style={{ fontSize: 11, letterSpacing: 2, color: '#7c3aed', textTransform: 'uppercase', marginBottom: 10 }}>Fee Structure</div>
              <h2 style={{ fontSize: 30, fontWeight: 800, letterSpacing: '-0.5px' }}>Performance-Only. No Management Fee.</h2>
              <p style={{ color: 'rgba(255,255,255,0.4)', marginTop: 8, fontSize: 14 }}>15% on yield generated. Zero AUM fee. No lock-ups, no entry costs, no exit penalties.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16, marginBottom: 28 }}>
              {[
                { label: 'Management Fee',  inqai: '0%',  trad: '2.0% annual',  note: 'No drag on capital while waiting for returns' },
                { label: 'Performance Fee', inqai: '15%', trad: '20% of gains', note: '5 percentage points cheaper than hedge fund standard' },
                { label: 'Entry / Exit',    inqai: '0%',  trad: '0.1–0.5%',     note: 'No cost to add or remove capital at any time' },
              ].map(r => (
                <div key={r.label} style={{ background: 'rgba(13,13,32,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 18, padding: 24, backdropFilter: 'blur(12px)' }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>{r.label}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
                    <div>
                      <div style={{ fontSize: 10, color: '#a78bfa', marginBottom: 4 }}>INQAI</div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: '#10b981' }}>{r.inqai}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>Traditional</div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: 'rgba(255,255,255,0.3)' }}>{r.trad}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', lineHeight: 1.5 }}>{r.note}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA FOOTER ── */}
        <section style={{ padding: '60px 24px 80px', position: 'relative', zIndex: 1, borderTop: '1px solid rgba(255,255,255,0.04)', textAlign: 'center' }}>
          <div style={{ maxWidth: 600, margin: '0 auto' }}>
            <div style={{ fontSize: 11, letterSpacing: 2, color: '#7c3aed', textTransform: 'uppercase', marginBottom: 16 }}>Get Started</div>
            <h2 style={{ fontSize: 34, fontWeight: 900, letterSpacing: '-0.5px', marginBottom: 16 }}>Own the Portfolio.<br />Skip the Complexity.</h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.4)', marginBottom: 36, lineHeight: 1.7 }}>
              One transaction. Proportional ownership across 66 assets, managed 24/7 by AI. No wallets to rebalance. No strategies to monitor. No fees until it performs.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => router.push('/buy')}
                style={{ padding: '16px 44px', borderRadius: 12, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 8px 30px rgba(124,58,237,0.4)', transition: 'all 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}
              >
                Acquire INQAI
              </button>
              <button
                onClick={() => router.push('/analytics')}
                style={{ padding: '16px 44px', borderRadius: 12, background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.12)', transition: 'all 0.2s' }}
              >
                View Dashboard
              </button>
            </div>

            {/* Deployed contracts trust row */}
            <div style={{ marginTop: 48, display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap' }}>
              {[
                { label: '12 Contracts', sub: 'Mainnet deployed' },
                { label: 'MIT License',  sub: 'Open source' },
                { label: 'No Admin Keys', sub: 'Keyless execution' },
                { label: 'Chainlink',    sub: 'Automation + Oracle' },
              ].map(t => (
                <div key={t.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,0.7)' }}>{t.label}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{t.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
