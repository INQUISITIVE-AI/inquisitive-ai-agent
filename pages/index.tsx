import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import SiteNav from '../src/components/SiteNav';
import {
  Brain, Zap, BarChart3, Shield, Eye,
  TrendingUp, TrendingDown, ArrowLeftRight, Landmark, Leaf,
  RotateCcw, Lock, Layers, Gem, Gift, Coins, ArrowRight,
  CheckCircle2,
} from 'lucide-react';

const pct = (v: number) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(2)}%`;
const grc = (v: number) => v >= 0 ? '#10b981' : '#ef4444';

export default function Home() {
  const router = useRouter();
  const [data,   setData]   = useState<any>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/inquisitiveAI/portfolio/nav');
      if (r.ok) setData(await r.json());
    } catch {}
    setLoaded(true);
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 60_000); return () => clearInterval(t); }, [load]);

  const regime    = data?.ai?.regime        || 'NEUTRAL';
  const regimeCol = regime === 'BULL' ? '#10b981' : regime === 'BEAR' ? '#ef4444' : '#f59e0b';
  const return7d  = data?.token?.return7d   ?? 0;
  const return24h = data?.token?.return24h  ?? 0;
  const nav       = data?.token?.navPerToken ?? 8;
  const fg        = data?.ai?.fearGreed;

  const ENGINES = [
    { Icon: Brain,    name: 'Quantitative AI Engine',  sub: 'Five-Model Consensus',    desc: 'Pattern, Reasoning, Portfolio, Risk, and Learning engines must reach consensus before any position is taken. 70% threshold required in BULL; 75% in BEAR.', color: '#3b82f6' },
    { Icon: Zap,      name: 'Autonomous Execution',    sub: 'DeFi Execution Layer',    desc: 'Eleven institutional strategies deployed autonomously — yield, lending, staking, leveraged exposure, liquidity provision — across all 66 positions.', color: '#3b82f6' },
    { Icon: BarChart3,name: 'Performance Analytics',   sub: 'Risk Attribution',        desc: 'Live P&L attribution, Sharpe ratio, drawdown tracking, and portfolio heat across all positions. Every AI decision explained in plain language.', color: '#3b82f6' },
    { Icon: Shield,   name: 'Risk Management',         sub: 'Capital Preservation',    desc: '2% maximum exposure per trade. 6% portfolio heat ceiling. 15% drawdown circuit breaker with automatic halt and emergency vault pause.', color: '#3b82f6' },
    { Icon: Eye,      name: 'Market Intelligence',     sub: 'Multi-Source Data',       desc: 'CoinGecko live prices refreshed every 30 seconds across all 66 assets. Fear & Greed overlay with BTC/ETH/SOL macro regime signals.', color: '#3b82f6' },
  ];

  const STRATEGIES = [
    { Icon: TrendingUp,     name: 'BUY',      desc: '2% risk limit. Kelly Criterion sizing. 2:1 R:R minimum.' },
    { Icon: TrendingDown,   name: 'SELL',     desc: 'Profit-optimized exit with real-time stop enforcement.' },
    { Icon: ArrowLeftRight, name: 'SWAP',     desc: 'Jupiter (Solana) and 1inch (EVM). 0.3% max slippage.' },
    { Icon: Landmark,       name: 'LEND',     desc: 'Aave V3, Compound, Morpho Blue, Maple Finance.' },
    { Icon: Leaf,           name: 'YIELD',    desc: 'Uniswap V3 LP — stable, volatile, and leveraged pools.' },
    { Icon: Coins,          name: 'BORROW',   desc: 'Max 65% LTV. Health factor floor 1.5. Spread guard active.' },
    { Icon: RotateCcw,      name: 'LOOP',     desc: 'Recursive yield. Max 5 loops. 80% LTV cap per iteration.' },
    { Icon: Lock,           name: 'STAKE',    desc: 'Network staking: Lido, Jito, Cosmos, Polkadot, Ethena.' },
    { Icon: Layers,         name: 'MULTIPLY', desc: 'Leveraged long up to 3×. Liquidation price monitored.' },
    { Icon: Gem,            name: 'EARN',     desc: 'Auto-selects highest risk-adjusted yield per asset.' },
    { Icon: Gift,           name: 'REWARDS',  desc: 'Claims and auto-compounds protocol rewards on 12+ platforms.' },
  ];

  const card: React.CSSProperties = {
    background: '#0d0d0f',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: 12,
    padding: '24px',
    transition: 'border-color 0.2s',
  };

  const label: React.CSSProperties = {
    fontSize: 11, letterSpacing: '2px', color: '#3b82f6',
    textTransform: 'uppercase', fontWeight: 600, marginBottom: 16,
  };

  return (
    <>
      <Head>
        <title>INQUISITIVE — Autonomous On-Chain AI Fund</title>
        <meta name="description" content="The first open, on-chain AI fund. 66-asset portfolio managed by five independent AI engines. ERC-20 token. 0% management fee. Fully verifiable on Ethereum." />
        <meta property="og:title" content="INQUISITIVE — Autonomous On-Chain AI Fund" />
        <meta property="og:description" content="66 digital assets. One ERC-20 token. Five AI engines, zero management fee." />
      </Head>

      <div style={{ background: '#050507', color: '#f1f1f3', fontFamily: 'Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', minHeight: '100vh' }}>
        <div className="mesh-bg" />
        <SiteNav position="fixed" />

        {/* ── HERO ─────────────────────────────────────────────────────── */}
        <section style={{ paddingTop: 180, paddingBottom: 140, paddingLeft: 24, paddingRight: 24, textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: 720, margin: '0 auto' }}>

            <div style={{ fontSize: 11, letterSpacing: '2.5px', color: 'rgba(255,255,255,0.55)', textTransform: 'uppercase', fontWeight: 500, marginBottom: 28, fontFamily: 'JetBrains Mono, monospace' }}>
              Ethereum Mainnet · ERC-20 · {loaded ? `${regime} Regime` : 'Connecting…'}
            </div>

            <h1 style={{ fontSize: 'clamp(2.8rem, 7vw, 4.5rem)', fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.06, marginBottom: 28, color: '#f1f1f3' }}>
              The First Autonomous<br />On-Chain AI Fund
            </h1>

            <p style={{ fontSize: 'clamp(15px, 2vw, 17px)', color: '#a1a1aa', maxWidth: 480, margin: '0 auto 48px', lineHeight: 1.75, fontWeight: 400 }}>
              Five independent AI engines manage a 66-asset digital portfolio through a
              single ERC-20 token — every allocation, signal, and execution fully
              verifiable on Ethereum in real time.
            </p>


            {/* Live data row — pulled from API, no placeholder numbers */}
            {loaded && (
              <div style={{ display: 'flex', gap: 32, justifyContent: 'center', flexWrap: 'wrap', paddingTop: 28, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                {[
                  { label: 'INQAI NAV',   value: `$${nav.toFixed(4)}`,            color: '#93c5fd' },
                  { label: '7D RETURN',   value: pct(return7d),                    color: grc(return7d) },
                  { label: '24H RETURN',  value: pct(return24h),                   color: grc(return24h) },
                  { label: 'AI REGIME',   value: regime,                            color: regimeCol },
                  { label: 'FEAR & GREED',value: fg ? `${fg.value} — ${fg.valueClassification}` : '—', color: '#a1a1aa' },
                ].map(s => (
                  <div key={s.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: s.color, fontFamily: 'JetBrains Mono, monospace' }}>{s.value}</div>
                    <div style={{ fontSize: 10, color: '#71717a', textTransform: 'uppercase', letterSpacing: '1px', marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
        <section style={{ padding: '120px 24px', position: 'relative', zIndex: 1, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 64 }}>
              <div style={label}>Protocol Design</div>
              <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 700, letterSpacing: '-0.025em', marginBottom: 12 }}>Institutional Infrastructure. Transparent Execution.</h2>
              <p style={{ color: '#a1a1aa', fontSize: 15, maxWidth: 440, margin: '0 auto' }}>Three layers of the INQUISITIVE protocol — from capital entry to on-chain settlement.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 2 }}>
              {[
                { n: '01', title: 'Acquire & Hold',          desc: 'Purchase INQAI tokens with ETH, BTC, SOL, TRX, or USDC. Tokens are delivered directly to your self-custody wallet — no platform accounts, no KYC, no lock-ups.' },
                { n: '02', title: 'AI Manages the Portfolio', desc: 'Five independent AI engines analyze all 66 assets every 8 seconds. Consensus signals are submitted on-chain via Chainlink Functions — fully automated, no human discretion.' },
                { n: '03', title: 'On-Chain Settlement',      desc: 'VaultV2 executes trades, harvests yield, and updates positions directly on Ethereum mainnet. Every transaction is publicly verifiable on Etherscan in real time.' },
              ].map((s, i) => (
                <div
                  key={s.n}
                  className="card-lift"
                  style={{ ...card, borderRadius: i === 0 ? '12px 0 0 12px' : i === 2 ? '0 12px 12px 0' : 0, borderRight: i < 2 ? 'none' : undefined }}
                >
                  <div style={{ fontSize: 48, fontWeight: 800, color: 'rgba(59,130,246,0.08)', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1, marginBottom: 20 }}>{s.n}</div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#f1f1f3', marginBottom: 10 }}>{s.title}</h3>
                  <p style={{ fontSize: 13, color: '#a1a1aa', lineHeight: 1.7, margin: 0 }}>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── AI ARCHITECTURE ──────────────────────────────────────────── */}
        <section style={{ padding: '120px 24px', position: 'relative', zIndex: 1, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <div style={label}>System Architecture</div>
              <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 700, letterSpacing: '-0.025em', marginBottom: 12 }}>Five-Layer Quantitative System</h2>
              <p style={{ color: '#a1a1aa', fontSize: 15, maxWidth: 420, margin: '0 auto' }}>Each component operates independently with dedicated oversight. Designed for institutional-grade reliability.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 12 }}>
              {ENGINES.map(e => (
                <div key={e.name} className="card-lift" style={card}>
                  <e.Icon size={20} color={e.color} strokeWidth={1.5} style={{ marginBottom: 14, display: 'block' }} />
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f1f3', marginBottom: 4 }}>{e.name}</div>
                  <div style={{ fontSize: 11, color: '#3b82f6', marginBottom: 10, fontWeight: 500 }}>{e.sub}</div>
                  <div style={{ fontSize: 12, color: '#a1a1aa', lineHeight: 1.65 }}>{e.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── EXECUTION STRATEGIES ─────────────────────────────────────── */}
        <section style={{ padding: '120px 24px', position: 'relative', zIndex: 1, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <div style={label}>Execution Layer</div>
              <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 700, letterSpacing: '-0.025em', marginBottom: 12 }}>11 Institutional Execution Strategies</h2>
              <p style={{ color: '#a1a1aa', fontSize: 15, maxWidth: 440, margin: '0 auto' }}>Deployed autonomously across DeFi protocols. Token holders gain diversified yield exposure without active management.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(175px,1fr))', gap: 10 }}>
              {STRATEGIES.map(s => (
                <div key={s.name} className="card-lift" style={card}>
                  <s.Icon size={18} color="#3b82f6" strokeWidth={1.5} style={{ marginBottom: 12, display: 'block' }} />
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#f1f1f3', marginBottom: 6, fontFamily: 'JetBrains Mono, monospace' }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: '#a1a1aa', lineHeight: 1.65 }}>{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEE STRUCTURE ────────────────────────────────────────────── */}
        <section style={{ padding: '120px 24px', position: 'relative', zIndex: 1, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <div style={label}>Fee Structure</div>
              <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 700, letterSpacing: '-0.025em', marginBottom: 12 }}>Performance-Only. Zero Management Fee.</h2>
              <p style={{ color: '#a1a1aa', fontSize: 15 }}>15% on yield generated. No AUM fee. No entry or exit costs.</p>
            </div>
            <div style={{ ...card, overflow: 'hidden', padding: 0 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '12px 24px' }}>
                {['Fee Type', 'INQUISITIVE', 'Hedge Fund Standard', 'Difference'].map(h => (
                  <div key={h} style={{ fontSize: 10, color: '#52525b', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>{h}</div>
                ))}
              </div>
              {[
                { type: 'Management Fee', inqai: '0%',  std: '2.0% annual',  delta: '−2.0%' },
                { type: 'Performance Fee',inqai: '15%', std: '20% of gains', delta: '−5.0%' },
                { type: 'Entry / Exit',   inqai: '0%',  std: '0.1–0.5%',    delta: '−0.5%' },
                { type: 'Lock-Up Period', inqai: 'None',std: '1–2 years',    delta: 'Full liquidity' },
              ].map((r, i) => (
                <div key={r.type} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', padding: '16px 24px', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.03)' : 'none', alignItems: 'center' }}>
                  <div style={{ fontSize: 13, color: '#a1a1aa' }}>{r.type}</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#10b981', fontFamily: 'JetBrains Mono, monospace' }}>{r.inqai}</div>
                  <div style={{ fontSize: 13, color: '#52525b', fontFamily: 'JetBrains Mono, monospace' }}>{r.std}</div>
                  <div style={{ fontSize: 12, color: '#3b82f6', fontWeight: 600 }}>{r.delta}</div>
                </div>
              ))}
              <div style={{ padding: '14px 24px', background: 'rgba(59,130,246,0.04)', borderTop: '1px solid rgba(59,130,246,0.1)', fontSize: 12, color: '#52525b', lineHeight: 1.6 }}>
                Fee distribution: <strong style={{ color: '#10b981' }}>60%</strong> open-market buybacks ·{' '}
                <strong style={{ color: '#ef4444' }}>20%</strong> permanent burn ·{' '}
                <strong style={{ color: '#f59e0b' }}>15%</strong> staker rewards ·{' '}
                <strong style={{ color: '#6366f1' }}>5%</strong> protocol operations
              </div>
            </div>
          </div>
        </section>

        {/* ── OPEN SOURCE BLOCK ────────────────────────────────────────── */}
        <section style={{ padding: '120px 24px', position: 'relative', zIndex: 1, borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <div style={{ maxWidth: 760, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <div style={label}>Open Source</div>
              <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 700, letterSpacing: '-0.025em', marginBottom: 12 }}>Auditable at Every Layer</h2>
              <p style={{ color: '#71717a', fontSize: 15 }}>Clone the repository. Read the contracts. Run the AI locally. Everything is public.</p>
            </div>
            <div style={{ background: '#080809', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, padding: '24px 28px', fontFamily: 'JetBrains Mono, Fira Code, Menlo, monospace', fontSize: 13, lineHeight: 1.85, color: '#52525b' }}>
              <div><span style={{ color: '#3f3f46' }}>$</span> <span style={{ color: '#f1f1f3' }}>git clone https://github.com/INQUISITIVE-AI/inquisitive-ai-agent.git</span></div>
              <div><span style={{ color: '#3f3f46' }}>$</span> <span style={{ color: '#f1f1f3' }}>cd inquisitive-ai-agent && npm install && npm start</span></div>
              <div style={{ marginTop: 8, color: '#10b981' }}>InquisitiveBrain initialized — 5 engines active</div>
              <div style={{ color: '#10b981' }}>PriceFeed connected — 66 assets @ 30s intervals</div>
              <div style={{ color: '#10b981' }}>VaultV2 oracle ready — submitting signals on-chain</div>
              <div style={{ color: '#3b82f6' }}>Agent running</div>
            </div>
          </div>
        </section>

        {/* ── PROTOCOL TRUST ───────────────────────────────────────────── */}
        <section style={{ padding: '120px 24px', position: 'relative', zIndex: 1, borderTop: '1px solid rgba(255,255,255,0.04)', textAlign: 'center' }}>
          <div style={{ maxWidth: 640, margin: '0 auto' }}>
            <div style={label}>Protocol</div>
            <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 700, letterSpacing: '-0.025em', marginBottom: 16 }}>Built on Verifiable Infrastructure</h2>
            <p style={{ fontSize: 15, color: '#71717a', marginBottom: 48, lineHeight: 1.75 }}>
              Twelve smart contracts deployed and verified on Ethereum mainnet. MIT licensed.
              Autonomous execution via Chainlink Automation — no manual intervention required.
            </p>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 56 }}>
              <button onClick={() => router.push('/buy')} className="btn-primary" style={{ fontSize: 15, padding: '13px 32px' }}>
                Acquire INQAI
              </button>
            </div>

            <div style={{ display: 'flex', gap: 0, justifyContent: 'center', flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 32 }}>
              {[
                { stat: '12', label: 'Contracts', sub: 'Mainnet deployed' },
                { stat: 'MIT', label: 'License', sub: 'Open source' },
                { stat: 'ETH', label: 'Network', sub: 'Ethereum mainnet' },
                { stat: 'CL',  label: 'Chainlink', sub: 'Automation + Oracle' },
              ].map((t, i) => (
                <div key={t.stat} style={{ textAlign: 'center', padding: '0 28px', borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#f1f1f3', fontFamily: 'JetBrains Mono, monospace' }}>{t.stat}</div>
                  <div style={{ fontSize: 11, color: '#71717a', marginTop: 2 }}>{t.label}</div>
                  <div style={{ fontSize: 10, color: '#3f3f46', marginTop: 1 }}>{t.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

      </div>
    </>
  );
}
