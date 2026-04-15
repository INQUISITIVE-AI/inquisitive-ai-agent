import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import SiteNav from '../src/components/SiteNav';
import {
  Brain, Zap, BarChart3, Shield, Eye,
  TrendingUp, TrendingDown, ArrowLeftRight, Landmark, Leaf,
  RotateCcw, Lock, Layers, Gem, Gift, Coins, Activity,
} from 'lucide-react';

const pct = (n: number) => `${n >= 0 ? '+' : ''}${(n * 100).toFixed(2)}%`;

// Accent color — one, consistent
const ACCENT = '#3b82f6';

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
  const fgColor   = fg
    ? (fg.value < 25 ? '#ef4444' : fg.value < 45 ? '#f97316' : fg.value < 55 ? '#f59e0b' : fg.value < 75 ? '#84cc16' : '#10b981')
    : '#71717a';
  const return7d  = data?.performance?.return7d;
  const return24h = data?.performance?.return24h;
  const navValue  = data?.portfolio?.totalValue ?? 100;
  const buys      = data?.aiSignals?.buys ?? 0;
  const sells     = data?.aiSignals?.sells ?? 0;

  const ARCH = [
    { Icon: Brain,     name: 'Quantitative AI Engine',  sub: 'Five-Engine Decision System',      desc: 'Five independent scoring models — Pattern, Reasoning, Portfolio, Learning, and Risk — reach consensus before any position is taken. 70% threshold enforced.', color: ACCENT },
    { Icon: Zap,       name: 'Autonomous Execution',    sub: 'DeFi Execution Layer',             desc: 'Eleven institutional-grade execution strategies deployed autonomously: yield, lending, staking, leveraged exposure, liquidity provision, and more.', color: ACCENT },
    { Icon: BarChart3, name: 'Performance Analytics',   sub: 'Real-Time Risk Attribution',       desc: 'Live P&L attribution, Sharpe ratio, drawdown tracking, portfolio heat, and full decision-level transparency across all 66 positions.', color: ACCENT },
    { Icon: Shield,    name: 'Risk Management System',  sub: 'Capital Preservation Layer',       desc: 'Hard-coded risk limits: 2% maximum exposure per trade, 6% portfolio heat ceiling, 15% drawdown circuit breaker with automatic halt and emergency pause.', color: ACCENT },
    { Icon: Eye,       name: 'Market Intelligence',     sub: 'Multi-Source Data Infrastructure', desc: 'CoinGecko live API with 30-second refresh across all 66 assets. Macro overlay: Fear & Greed Index, BTC/ETH/SOL regime signals, cross-asset correlation.', color: ACCENT },
  ];

  const TRADES = [
    { Icon: TrendingUp,     name: 'BUY',      desc: 'Optimal entry execution. 2% portfolio risk limit. Kelly Criterion position sizing. Minimum 2:1 reward-to-risk ratio.' },
    { Icon: TrendingDown,   name: 'SELL',     desc: 'Profit harvesting and stop-loss enforcement. Tracks realized P&L and updates portfolio heat on each exit.' },
    { Icon: ArrowLeftRight, name: 'SWAP',     desc: 'Best-route execution via Jupiter (Solana) and 1inch (Ethereum). Maximum 0.3% slippage tolerance.' },
    { Icon: Landmark,       name: 'LEND',     desc: 'Deploys capital to Aave V3, Compound, Morpho Blue, and Maple Finance at live APY rates.' },
    { Icon: Leaf,           name: 'YIELD',    desc: 'Liquidity provision on Uniswap V3. Selects stable, volatile, or leveraged pools based on risk-adjusted return.' },
    { Icon: Coins,          name: 'BORROW',   desc: 'Collateral-backed borrowing. Maximum 65% LTV enforced. Health factor floor of 1.5. Spread guard active.' },
    { Icon: RotateCcw,      name: 'LOOP',     desc: 'Recursive yield amplification. Maximum 5x exposure. 80% LTV cap. Health factor monitored continuously.' },
    { Icon: Lock,           name: 'STAKE',    desc: 'Network staking across 27+ protocols including Lido, Jito, Sanctum, Cosmos, and Polkadot.' },
    { Icon: Layers,         name: 'MULTIPLY', desc: 'Leveraged long exposure up to 3x. Calculates liquidation price, daily borrow cost, and break-even move.' },
    { Icon: Gem,            name: 'EARN',     desc: 'Automatic strategy selection. Evaluates all available yield options and deploys to the highest risk-adjusted APY.' },
    { Icon: Gift,           name: 'REWARDS',  desc: 'Claims and auto-compounds protocol rewards across 12+ supported platforms. Reinvests immediately.' },
  ];

  const heroStats = [
    {
      label: '7D Return',
      value: return7d !== undefined ? pct(return7d) : loaded ? pct(0) : '...',
      color: return7d !== undefined ? (return7d >= 0 ? '#10b981' : '#ef4444') : '#71717a',
    },
    {
      label: '24H Return',
      value: return24h !== undefined ? pct(return24h) : loaded ? pct(0) : '...',
      color: return24h !== undefined ? (return24h >= 0 ? '#10b981' : '#ef4444') : '#71717a',
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

  const sectionStyle: React.CSSProperties = {
    padding: '120px 24px',
    position: 'relative',
    zIndex: 1,
    borderTop: '1px solid rgba(255,255,255,0.04)',
  };

  const sectionInner: React.CSSProperties = {
    maxWidth: 1200,
    margin: '0 auto',
  };

  const sectionLabel: React.CSSProperties = {
    fontSize: 11,
    letterSpacing: '2px',
    color: ACCENT,
    textTransform: 'uppercase',
    marginBottom: 12,
    fontWeight: 500,
  };

  const cardStyle: React.CSSProperties = {
    background: '#111113',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: 12,
    padding: 24,
  };

  return (
    <>
      <Head>
        <title>INQUISITIVE — The First Open, On-Chain AI Fund</title>
        <meta name="description" content="INQUISITIVE delivers institutional-grade AI portfolio management across 66 digital assets through a single ERC-20 token. Five independent AI engines, 11 execution strategies, fully on-chain and transparent." />
        <meta property="og:title" content="INQUISITIVE — The First Open, On-Chain AI Fund" />
        <meta property="og:description" content="Own 66 assets. Hold one token. AI manages the rest — fully transparent, on-chain, 24/7." />
        <meta name="twitter:card" content="summary_large_image" />
      </Head>

      <div style={{ background: '#0a0a0b', color: '#f4f4f5', fontFamily: 'Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', minHeight: '100vh' }}>
        <div className="mesh-bg" />
        <SiteNav position="fixed" />

        {/* ── HERO ── */}
        <section style={{ paddingTop: 140, paddingBottom: 120, paddingLeft: 24, paddingRight: 24, textAlign: 'center', position: 'relative', zIndex: 1 }}>
          {/* Single subtle glow */}
          <div style={{
            position: 'absolute', width: 600, height: 600,
            background: 'radial-gradient(circle, rgba(59,130,246,0.07) 0%, transparent 70%)',
            top: -200, left: '50%', transform: 'translateX(-50%)',
            pointerEvents: 'none',
          }} />

          <div style={{ maxWidth: 760, margin: '0 auto', position: 'relative' }}>
            {/* Live badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 14px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: 6, marginBottom: 36, fontSize: 11, fontWeight: 500, color: '#93c5fd', letterSpacing: '0.5px' }}>
              <span className="live-dot" />
              LIVE · 66 ASSETS · AI MANAGED
            </div>

            {/* Headline — plain, no gradient */}
            <h1 style={{ fontSize: 'clamp(2.6rem, 7vw, 4rem)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.08, marginBottom: 24, color: '#f4f4f5' }}>
              The First Open,<br />On-Chain AI Fund
            </h1>

            <p style={{ fontSize: 'clamp(15px, 2vw, 17px)', color: '#71717a', maxWidth: 520, margin: '0 auto 48px', lineHeight: 1.75, fontWeight: 400 }}>
              One ERC-20 token. Proportional ownership in a 66-asset portfolio managed by
              five independent AI engines around the clock — every signal, weight, and
              decision verifiable on-chain in real time.
            </p>

            {/* CTAs — clear hierarchy */}
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 72 }}>
              <button
                onClick={() => router.push('/analytics')}
                className="btn-primary"
                style={{ fontSize: 15 }}
              >
                View Live Dashboard
              </button>
              <button
                onClick={() => router.push('/help')}
                className="btn-secondary"
                style={{ fontSize: 15 }}
              >
                Read the Docs
              </button>
            </div>

            {/* Live stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, maxWidth: 760, margin: '0 auto' }} className="responsive-grid-4">
              {heroStats.map(k => (
                <div key={k.label} style={{ ...cardStyle, padding: '18px 14px', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: k.color, fontFamily: 'monospace', marginBottom: 4 }}>{k.value}</div>
                  <div style={{ fontSize: 11, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{k.label}</div>
                </div>
              ))}
            </div>

            {/* AI signal pulse */}
            {loaded && (buys > 0 || sells > 0) && (
              <div style={{ marginTop: 20, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 6, fontSize: 12, fontWeight: 500, color: '#34d399' }}>
                  <Activity size={12} />
                  {buys} BUY signals active
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 14px', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.15)', borderRadius: 6, fontSize: 12, fontWeight: 500, color: '#93c5fd' }}>
                  AI REGIME: {regime}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── ARCHITECTURE ── */}
        <section style={sectionStyle}>
          <div style={sectionInner}>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <div style={sectionLabel}>System Architecture</div>
              <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 12 }}>Five-Layer Quantitative System</h2>
              <p style={{ color: '#71717a', fontSize: 15, maxWidth: 480, margin: '0 auto' }}>Each layer operates independently with dedicated oversight. Designed for institutional-grade reliability.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16 }}>
              {ARCH.map(c => (
                <div key={c.name} className="card-lift" style={cardStyle}>
                  <div style={{ marginBottom: 16 }}><c.Icon size={22} color={c.color} strokeWidth={1.5} /></div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#f4f4f5', marginBottom: 4 }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: '#52525b', marginBottom: 10, fontWeight: 500 }}>{c.sub}</div>
                  <div style={{ fontSize: 12, color: '#71717a', lineHeight: 1.65 }}>{c.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── TRADING STRATEGIES ── */}
        <section style={sectionStyle}>
          <div style={sectionInner}>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <div style={sectionLabel}>Execution Strategies</div>
              <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 12 }}>11 Institutional Execution Strategies</h2>
              <p style={{ color: '#71717a', fontSize: 15, maxWidth: 480, margin: '0 auto' }}>Deployed autonomously across DeFi. Token holders gain diversified yield exposure without active management.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
              {TRADES.map(f => (
                <div key={f.name} className="card-lift" style={cardStyle}>
                  <div style={{ marginBottom: 12 }}><f.Icon size={20} color={ACCENT} strokeWidth={1.5} /></div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#f4f4f5', marginBottom: 8 }}>{f.name}</div>
                  <div style={{ fontSize: 12, color: '#71717a', lineHeight: 1.65 }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── VALUE PROPOSITION ── */}
        <section style={sectionStyle}>
          <div style={sectionInner}>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <div style={sectionLabel}>Fund Structure</div>
              <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 12 }}>Institutional Exposure. Zero Overhead.</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16 }}>
              {[
                { title: 'On-Chain Asset Backing',       desc: 'Each INQAI token represents verified, proportional ownership in a 66-asset digital portfolio. Valuations are transparent, real-time, and independently verifiable on-chain.' },
                { title: 'Autonomous AI Management',     desc: 'Five independent AI models execute eleven capital deployment strategies simultaneously, optimizing risk-adjusted returns across the full 66-asset portfolio.' },
                { title: 'Structural Value Accrual',     desc: 'Protocol revenue is split 60% to open-market INQAI buybacks, 20% permanent burn, 15% to stakers, and 5% to protocol operations — every fee cycle reduces supply while rewarding holders.' },
                { title: 'Staker Revenue Sharing',       desc: '15% of all performance fees are distributed pro-rata to INQAI stakers. Longer lock periods amplify your share via a boost multiplier — up to 1.5× for 180-day commitments.' },
                { title: 'Non-Custodial by Design',      desc: 'INQAI tokens are delivered directly to your self-custody wallet at the point of purchase. No third-party custody, no counterparty risk.' },
                { title: 'Complete Decision Transparency', desc: 'Every AI signal, position, allocation weight, and risk metric is published in real time on the Analytics dashboard. No black box.' },
              ].map(v => (
                <div key={v.title} className="card-lift" style={cardStyle}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#f4f4f5', marginBottom: 10 }}>{v.title}</div>
                  <div style={{ fontSize: 13, color: '#71717a', lineHeight: 1.7 }}>{v.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEE STRUCTURE ── */}
        <section style={sectionStyle}>
          <div style={sectionInner}>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <div style={sectionLabel}>Fee Structure</div>
              <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 12 }}>Performance-Only. No Management Fee.</h2>
              <p style={{ color: '#71717a', fontSize: 15 }}>15% on yield generated. Zero AUM fee. No lock-ups, no entry costs, no exit penalties.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16 }}>
              {[
                { label: 'Management Fee',  inqai: '0%',  trad: '2.0% annual',  note: 'No drag on capital while waiting for returns' },
                { label: 'Performance Fee', inqai: '15%', trad: '20% of gains', note: '5 percentage points cheaper than hedge fund standard' },
                { label: 'Entry / Exit',    inqai: '0%',  trad: '0.1–0.5%',     note: 'No cost to add or remove capital at any time' },
              ].map(r => (
                <div key={r.label} style={cardStyle}>
                  <div style={{ fontSize: 11, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16 }}>{r.label}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 11, color: ACCENT, marginBottom: 4, fontWeight: 500 }}>INQAI</div>
                      <div style={{ fontSize: 26, fontWeight: 700, color: '#10b981', letterSpacing: '-0.02em' }}>{r.inqai}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 11, color: '#52525b', marginBottom: 4 }}>Traditional</div>
                      <div style={{ fontSize: 18, fontWeight: 600, color: '#52525b' }}>{r.trad}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: '#71717a', lineHeight: 1.6 }}>{r.note}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CLI / Code Block ── */}
        <section style={sectionStyle}>
          <div style={{ ...sectionInner, maxWidth: 760 }}>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <div style={sectionLabel}>Open Source</div>
              <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2rem)', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 12 }}>This is Real Software</h2>
              <p style={{ color: '#71717a', fontSize: 15 }}>Clone it. Audit it. Run it yourself.</p>
            </div>
            <div style={{ background: '#0d0d0f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '24px 28px', fontFamily: 'JetBrains Mono, Fira Code, Menlo, monospace', fontSize: 13, lineHeight: 1.8, color: '#71717a' }}>
              <div style={{ marginBottom: 4 }}><span style={{ color: '#52525b' }}>$</span> <span style={{ color: '#f4f4f5' }}>git clone https://github.com/INQUISITIVE-AI/inquisitive-ai-agent.git</span></div>
              <div style={{ marginBottom: 4 }}><span style={{ color: '#52525b' }}>$</span> <span style={{ color: '#f4f4f5' }}>cd inquisitive-ai-agent</span></div>
              <div style={{ marginBottom: 16 }}><span style={{ color: '#52525b' }}>$</span> <span style={{ color: '#f4f4f5' }}>npm install && npm start</span></div>
              <div style={{ color: '#10b981' }}>✓ InquisitiveBrain initialized</div>
              <div style={{ color: '#10b981' }}>✓ PriceFeed connected — 66 assets</div>
              <div style={{ color: '#10b981' }}>✓ Vault strategies loaded</div>
              <div style={{ color: '#93c5fd' }}>→ Agent running on port 3000</div>
            </div>
          </div>
        </section>

        {/* ── CTA FOOTER ── */}
        <section style={{ ...sectionStyle, textAlign: 'center' }}>
          <div style={{ maxWidth: 560, margin: '0 auto' }}>
            <div style={sectionLabel}>Get Started</div>
            <h2 style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 16 }}>Own the Portfolio.<br />Skip the Complexity.</h2>
            <p style={{ fontSize: 15, color: '#71717a', marginBottom: 40, lineHeight: 1.75 }}>
              One transaction. 66 assets managed 24/7 by AI. No rebalancing. No strategies to monitor. No fees until it performs.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 56 }}>
              <button onClick={() => router.push('/analytics')} className="btn-primary" style={{ fontSize: 15, padding: '13px 32px' }}>
                View Dashboard
              </button>
              <button onClick={() => router.push('/help')} className="btn-secondary" style={{ fontSize: 15, padding: '13px 32px' }}>
                Read the Docs
              </button>
            </div>

            {/* Trust row */}
            <div style={{ display: 'flex', gap: 32, justifyContent: 'center', flexWrap: 'wrap' }}>
              {[
                { label: '12 Contracts',  sub: 'Mainnet deployed' },
                { label: 'MIT License',   sub: 'Open source' },
                { label: 'Verified On-Chain', sub: 'Etherscan verified' },
                { label: 'Chainlink',     sub: 'Automation + Oracle' },
              ].map(t => (
                <div key={t.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#a1a1aa' }}>{t.label}</div>
                  <div style={{ fontSize: 11, color: '#52525b', marginTop: 2 }}>{t.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

      </div>
    </>
  );
}
