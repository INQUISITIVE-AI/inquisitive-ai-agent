import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { 
  LayoutDashboard, Building2, Zap, Coins, FlaskConical,
  Shield, Plug, DollarSign, Map, Book, Brain, Lock, Layers, Gem, Gift, RotateCcw, Flame, Wallet, Bot, Scale, CheckCircle2, ArrowRight, TrendingUp, TrendingDown, ArrowLeftRight, Landmark, Leaf, AlertTriangle, Activity, Target, Infinity, X, BarChart3, Eye, Microscope, Key
} from 'lucide-react';

const WalletButton = dynamic(() => import('../src/components/WalletButton'), { ssr: false });

const NAV_ITEMS = [
  {id:'overview',     Icon:LayoutDashboard, label:'Overview'},
  {id:'architecture', Icon:Building2,       label:'Architecture'},
  {id:'trading',      Icon:Zap,             label:'Trading Functions'},
  {id:'assets',       Icon:Coins,           label:'65 Assets'},
  {id:'research',     Icon:FlaskConical,    label:'Research'},
  {id:'security',     Icon:Shield,          label:'Security'},
  {id:'api',          Icon:Plug,            label:'API Reference'},
  {id:'tokenomics',   Icon:DollarSign,      label:'Tokenomics'},
  {id:'roadmap',      Icon:Map,             label:'Roadmap'},
];

const ASSETS_65 = [
  {n:1, s:'BTC',     name:'Bitcoin',                              cat:'major'},
  {n:2, s:'ETH',     name:'Ethereum',                             cat:'major'},
  {n:3, s:'BNB',     name:'BNB',                                  cat:'major'},
  {n:4, s:'XRP',     name:'XRP',                                  cat:'major'},
  {n:5, s:'USDC',    name:'USD Coin',                             cat:'stablecoin'},
  {n:6, s:'SOL',     name:'Solana',                               cat:'major'},
  {n:7, s:'TRX',     name:'TRON',                                 cat:'major'},
  {n:8, s:'ADA',     name:'Cardano',                              cat:'major'},
  {n:9, s:'BCH',     name:'Bitcoin Cash',                         cat:'major'},
  {n:10,s:'HYPE',    name:'Hyperliquid',                          cat:'defi'},
  {n:11,s:'XMR',     name:'Monero',                               cat:'privacy'},
  {n:12,s:'LINK',    name:'Chainlink',                            cat:'oracle'},
  {n:13,s:'CC',      name:'Canton',                               cat:'institutional'},
  {n:14,s:'XLM',     name:'Stellar',                              cat:'payment'},
  {n:15,s:'LTC',     name:'Litecoin',                             cat:'payment'},
  {n:16,s:'HBAR',    name:'Hedera',                               cat:'major'},
  {n:17,s:'AVAX',    name:'Avalanche',                            cat:'major'},
  {n:18,s:'ZEC',     name:'Zcash',                                cat:'privacy'},
  {n:19,s:'SUI',     name:'Sui',                                  cat:'major'},
  {n:20,s:'DOT',     name:'Polkadot',                             cat:'interop'},
  {n:21,s:'PAXG',    name:'PAX Gold',                             cat:'rwa'},
  {n:22,s:'UNI',     name:'Uniswap',                              cat:'defi'},
  {n:23,s:'TAO',     name:'Bittensor',                            cat:'ai'},
  {n:24,s:'NEAR',    name:'NEAR Protocol',                        cat:'major'},
  {n:25,s:'AAVE',    name:'Aave',                                 cat:'defi'},
  {n:26,s:'SKY',     name:'Sky',                                  cat:'defi'},
  {n:27,s:'ICP',     name:'Internet Computer',                    cat:'major'},
  {n:28,s:'ETC',     name:'Ethereum Classic',                     cat:'major'},
  {n:29,s:'ONDO',    name:'Ondo',                                 cat:'rwa'},
  {n:30,s:'POL',     name:'Polygon',                              cat:'l2'},
  {n:31,s:'ENA',     name:'Ethena',                               cat:'defi'},
  {n:32,s:'ATOM',    name:'Cosmos',                               cat:'interop'},
  {n:33,s:'ALGO',    name:'Algorand',                             cat:'major'},
  {n:34,s:'NIGHT',   name:'Midnight Network',                     cat:'privacy'},
  {n:35,s:'FIL',     name:'Filecoin',                             cat:'storage'},
  {n:36,s:'QNT',     name:'Quant',                                cat:'interop'},
  {n:37,s:'XDC',     name:'XDC Network',                         cat:'major'},
  {n:38,s:'RNDR',    name:'Render',                               cat:'ai'},
  {n:39,s:'JUP',     name:'Jupiter',                              cat:'defi'},
  {n:40,s:'VET',     name:'VeChain',                              cat:'major'},
  {n:41,s:'ARB',     name:'Arbitrum',                             cat:'l2'},
  {n:42,s:'ZRO',     name:'LayerZero',                            cat:'interop'},
  {n:43,s:'XTZ',     name:'Tezos',                                cat:'major'},
  {n:44,s:'CHZ',     name:'Chiliz',                               cat:'gaming'},
  {n:45,s:'FET',     name:'Artificial Superintelligence Alliance', cat:'ai'},
  {n:46,s:'INJ',     name:'Injective',                            cat:'defi'},
  {n:47,s:'GRT',     name:'The Graph',                            cat:'data'},
  {n:48,s:'OP',      name:'Optimism',                             cat:'l2'},
  {n:49,s:'LDO',     name:'Lido DAO',                             cat:'defi'},
  {n:50,s:'HNT',     name:'Helium',                               cat:'iot'},
  {n:51,s:'STRK',    name:'Starknet',                             cat:'l2'},
  {n:52,s:'XCN',     name:'Onyxcoin',                             cat:'defi'},
  {n:53,s:'EOS',     name:'Vaulta',                               cat:'major'},
  {n:54,s:'AR',      name:'Arweave',                              cat:'storage'},
  {n:55,s:'ACH',     name:'Alchemy Pay',                          cat:'payment'},
  {n:56,s:'DBR',     name:'deBridge',                             cat:'interop'},
  {n:57,s:'HONEY',   name:'Hivemapper',                           cat:'iot'},
  {n:58,s:'XSGD',    name:'XSGD',                                 cat:'stablecoin'},
  {n:59,s:'SOIL',    name:'Soil',                                 cat:'defi'},
  {n:60,s:'BRZ',     name:'Brazilian Digital Token',              cat:'stablecoin'},
  {n:61,s:'CNGN',    name:'Compliant Naira',                      cat:'stablecoin'},
  {n:62,s:'JPYC',    name:'JPYC Prepaid',                         cat:'stablecoin'},
  {n:63,s:'JITOSOL', name:'Jito Staked SOL',                      cat:'liquid-stake'},
  {n:64,s:'JUPSOL',  name:'Jupiter Staked SOL',                   cat:'liquid-stake'},
  {n:65,s:'INF',     name:'Sanctum Infinity',                     cat:'liquid-stake'},
];

const catColor = (c: string) => {
  const m: Record<string,string> = {
    major:'#3b82f6',defi:'#7c3aed',ai:'#ec4899',l2:'#06b6d4',
    stablecoin:'#10b981',rwa:'#f97316','liquid-stake':'#f59e0b',
    interop:'#6366f1',privacy:'#6b7280',payment:'#84cc16',
    storage:'#0891b2',oracle:'#a78bfa',institutional:'#8b5cf6',
    gaming:'#f472b6',iot:'#34d399',data:'#60a5fa',
  };
  return m[c] || '#6b7280';
};

export default function HelpPage() {
  const router = useRouter();
  const [active, setActive] = useState('overview');
  const [status, setStatus] = useState<any>(null);

  useEffect(() => {
    fetch('/api/inquisitiveAI/status').then(r=>r.ok?r.json():null).then(d=>d&&setStatus(d));
  }, []);

  const S = ({ children }: { children: React.ReactNode }) => (
    <div style={{display:'flex',gap:8,alignItems:'flex-start',fontSize:13,color:'rgba(255,255,255,0.5)',lineHeight:1.6}}>
      <span style={{color:'#7c3aed',flexShrink:0,marginTop:1}}>→</span>
      <span>{children}</span>
    </div>
  );

  const Code = ({ children }: { children: React.ReactNode }) => (
    <code style={{background:'rgba(124,58,237,0.1)',color:'#c4b5fd',padding:'1px 6px',borderRadius:5,fontSize:12,border:'1px solid rgba(124,58,237,0.2)',fontFamily:'monospace'}}>{children}</code>
  );

  const sections: Record<string, React.ReactNode> = {
    overview: (
      <div>
        <div style={{marginBottom:32}}>
          <div style={{fontSize:11,letterSpacing:2,color:'#7c3aed',textTransform:'uppercase',marginBottom:8}}>Documentation</div>
          <h1 style={{fontSize:32,fontWeight:900,letterSpacing:'-0.5px',marginBottom:8}}>INQUISITIVE</h1>
          <p style={{fontSize:15,color:'rgba(255,255,255,0.5)',lineHeight:1.7,maxWidth:640}}>
            INQAI represents proportional ownership in a professionally managed portfolio of 65 digital assets. Proprietary AI systems execute 11 trading strategies continuously, optimizing portfolio composition and risk-adjusted returns.
          </p>
        </div>

        {/* Presale CTA */}
        <div style={{background:'linear-gradient(135deg,rgba(124,58,237,0.15),rgba(37,99,235,0.1))',border:'1px solid rgba(124,58,237,0.3)',borderRadius:16,padding:22,marginBottom:28,display:'flex',justifyContent:'space-between',alignItems:'center',gap:16}}>
          <div>
            <div style={{fontSize:12,color:'rgba(255,255,255,0.35)',marginBottom:4,display:'flex',alignItems:'center',gap:6}}><Flame size={14} color="#f59e0b" /> Presale Active</div>
            <div style={{fontSize:20,fontWeight:900,marginBottom:4}}>Acquire INQAI at <span style={{color:'#a78bfa'}}>$8 per token</span> — 47% below target price</div>
            <div style={{fontSize:12,color:'rgba(255,255,255,0.45)'}}>ERC-20 · Asset-backed · 18.5% target APY · Self-custody delivery</div>
          </div>
          <button onClick={()=>router.push('/buy')} style={{padding:'12px 24px',borderRadius:12,background:'linear-gradient(135deg,#7c3aed,#4f46e5)',color:'#fff',fontSize:14,fontWeight:700,cursor:'pointer',border:'1px solid rgba(255,255,255,0.1)',boxShadow:'0 4px 20px rgba(124,58,237,0.4)',whiteSpace:'nowrap',flexShrink:0}}>
            Acquire INQAI →
          </button>
        </div>

        {/* Live system status */}
        {status && (
          <div style={{background:'rgba(16,185,129,0.06)',border:'1px solid rgba(16,185,129,0.15)',borderRadius:16,padding:20,marginBottom:28}}>
            <div style={{fontSize:12,fontWeight:700,color:'#34d399',marginBottom:12,display:'flex',alignItems:'center',gap:6}}>
              <span style={{width:6,height:6,borderRadius:'50%',background:'#10b981',display:'inline-block'}} className="anim-blink" />
              System Live
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
              {[
                {l:'Price Assets',v:status.prices?.assetCount||0,u:'live'},
                {l:'Brain Cycles',v:status.brain?.cycleCount||0,u:'completed'},
                {l:'Macro Indicators',v:status.macro?.indicators||0,u:'real data'},
                {l:'Signal Count',v:status.brain?.signalCount||0,u:'active'},
              ].map(s=>(
                <div key={s.l} style={{background:'rgba(255,255,255,0.04)',borderRadius:10,padding:'12px 14px',textAlign:'center'}}>
                  <div style={{fontSize:20,fontWeight:900,color:'#34d399',fontFamily:'monospace'}}>{s.v}</div>
                  <div style={{fontSize:10,color:'rgba(255,255,255,0.35)',marginTop:3}}>{s.l}</div>
                  <div style={{fontSize:9,color:'rgba(16,185,129,0.6)',marginTop:1}}>{s.u}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:24}}>
          {[
            {icon:Brain,label:'AI Decision Cycles',v:'Every 8 seconds',desc:'The Brain processes all 65 assets every 8 seconds using 4 AI models in consensus'},
            {icon:Gem,label:'Target APY',v:'18.5%',desc:'Annual yield target through AI-optimized multi-strategy execution across all assets'},
            {icon:Shield,label:'Max Risk/Trade',v:'2%',desc:'Never risk more than 2% of portfolio on a single trade — hard-coded rule'},
            {icon:Zap,label:'Trading Functions',v:'11',desc:'BUY, SELL, SWAP, LEND, YIELD, BORROW, LOOP, STAKE, MULTIPLY, EARN, REWARDS. All executed autonomously.'},
            {icon:Coins,label:'Portfolio Assets',v:'65',desc:'65 assets spanning major, DeFi, AI, Layer 2, stablecoins, RWA, and liquid staking categories.'},
            {icon:Flame,label:'Token Burns',v:'20% of fees',desc:'20% of all protocol fees are permanently burned. Combined with 60% buyback allocation, supply contracts over time.'},
          ].map(k=>(
            <div key={k.label} style={{background:'rgba(13,13,32,0.8)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:14,padding:18,backdropFilter:'blur(12px)'}}>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}>
                <k.icon size={24} color={k.icon === Brain ? '#7c3aed' : k.icon === Gem ? '#a78bfa' : k.icon === Shield ? '#dc2626' : k.icon === Zap ? '#2563eb' : k.icon === Coins ? '#f59e0b' : '#f59e0b'} strokeWidth={1.8} />
                <div>
                  <div style={{fontSize:18,fontWeight:900,color:'#a78bfa',fontFamily:'monospace'}}>{k.v}</div>
                  <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.7)'}}>{k.label}</div>
                </div>
              </div>
              <p style={{fontSize:12,color:'rgba(255,255,255,0.4)',lineHeight:1.6,margin:0}}>{k.desc}</p>
            </div>
          ))}
        </div>

        <div style={{background:'rgba(251,191,36,0.05)',border:'1px solid rgba(251,191,36,0.15)',borderRadius:14,padding:18}}>
          <div style={{fontSize:13,fontWeight:700,color:'#fbbf24',marginBottom:8,display:'flex',alignItems:'center',gap:6}}><AlertTriangle size={16} color="#fbbf24" /> Risk Disclosure</div>
          <p style={{fontSize:12,color:'rgba(255,255,255,0.4)',lineHeight:1.7,margin:0}}>
            INQAI is an ERC-20 token representing proportional ownership in a professionally managed portfolio of 65 digital assets. All trading functions execute autonomously based on AI signals. Past performance is not indicative of future results. Target APY of 18.5% is a projection based on strategy design, not a guarantee. Digital assets carry substantial risk including total loss of capital. This documentation is for informational purposes only and does not constitute financial advice.
          </p>
        </div>
      </div>
    ),

    architecture: (
      <div>
        <h2 style={{fontSize:26,fontWeight:900,marginBottom:4}}>Five-Component Architecture</h2>
        <p style={{color:'rgba(255,255,255,0.4)',fontSize:13,marginBottom:28}}>Five specialized components working in perfect coordination — Standard of Procedure (SoP)</p>
        {[
          {icon:Brain,name:'The Brain',col:'#7c3aed',sub:'AI Decision Engine',detail:[
            'Processes all 65 assets every 8 seconds',
            'Combines 5 intelligence engines: Pattern Engine, Reasoning Engine, Portfolio Engine, Learning Engine, Risk Engine',
            'Applies risk-first methodology as final gate before any execution',
            'Outputs signals: BUY / SELL / HOLD / REDUCE / SKIP',
            'Confidence scores determine position sizing via Kelly Criterion',
            'Paper trades first 5 cycles before going live',
            'BEAR regime raises confidence threshold from 70% to 75%',
          ]},
          {icon:Zap,name:'The Executioner',col:'#2563eb',sub:'AI Smart Vault',detail:[
            'Executes all 11 trading functions: Buy, Sell, Swap, Lend, Yield, Borrow, Loop, Stake, Multiply, Earn, Rewards',
            'Hybrid keeper model: cron-job.org (every 1 min) + GitHub Actions (every 5 min) + Vercel Cron (every 5 min) — fully redundant',
            'Integrates with Aave V3, Compound V3, Morpho Blue, Maple Finance for lending',
            'Uniswap V3, Jupiter Aggregator, 1inch for swapping with best route selection',
            'Lido, Jito, Sanctum, and 27 other protocols for staking',
            'Gas-optimized execution with MEV protection via Flashbots/Jito',
            'Real-time P&L tracking and position management',
          ]},
          {icon:BarChart3,name:'The X-Ray',col:'#0891b2',sub:'Performance Monitor',detail:[
            'Real-time performance attribution — which strategies are profitable',
            'Risk metrics: VaR, Sharpe ratio, drawdown, portfolio heat',
            'Compliance monitoring for regulatory requirements',
            'Full transparency layer — every AI decision explained in plain language',
            'WebSocket real-time feeds for live dashboard updates',
          ]},
          {icon:Shield,name:'The Guardian',col:'#dc2626',sub:'Security Layer',detail:[
            'Secure treasury with controlled access — no single point of failure',
            '48-hour time-locks for all critical operations',
            'AI-powered circuit breakers — halts on anomalous behavior',
            'Advanced cryptography with HSM key management',
            'Zero-knowledge proofs for privacy-preserving validation',
            '15% drawdown emergency stop — all trading halts automatically',
          ]},
          {icon:Eye,name:'The Oracle',col:'#7c3aed',sub:'Price Intelligence',detail:[
            'Primary: CoinGecko REAL LIVE API — 65 assets with 30-second polling',
            'Fallback: CryptoCompare API — 65-asset coverage',
            'Macro: CoinGecko BTC/ETH/SOL regime signals + Alternative.me Fear & Greed index',
            'On-chain: Chainlink oracle integration planned',
            'TWAP oracles prevent flash loan / price manipulation attacks',
            'Sanity checks reject prices >50% outside expected range',
          ]},
        ].map(c=>(
          <div key={c.name} style={{background:'rgba(13,13,32,0.8)',border:`1px solid ${c.col}22`,borderRadius:16,padding:22,marginBottom:12,backdropFilter:'blur(12px)'}}>
            <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:14}}>
              <c.icon size={30} color={c.col} strokeWidth={1.8} />
              <div>
                <h3 style={{fontSize:18,fontWeight:800,color:c.col,margin:0}}>{c.name}</h3>
                <div style={{fontSize:12,color:'rgba(255,255,255,0.4)',marginTop:2}}>{c.sub}</div>
              </div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {c.detail.map((d,i)=><S key={i}>{d}</S>)}
            </div>
          </div>
        ))}
      </div>
    ),

    trading: (
      <div>
        <h2 style={{fontSize:26,fontWeight:900,marginBottom:4}}>11 Trading Functions</h2>
        <p style={{color:'rgba(255,255,255,0.4)',fontSize:13,marginBottom:28}}>Every major DeFi strategy executed autonomously by the trading engine. Zero human intervention.</p>
        {[
          {icon:TrendingUp,name:'BUY',col:'#10b981',detail:'Optimal market entry using AI signal with 2% max risk limit. Position sized by Kelly Criterion with 2:1 R:R floor. Stop loss at 2× ATR below entry. Checks portfolio heat (max 6% open risk) before executing.',params:'symbol, amount, stopLoss?, target?'},
          {icon:TrendingDown,name:'SELL',col:'#ef4444',detail:'Profit-optimized exit with stop-loss enforcement. Tracks unrealized P&L in real-time. Updates portfolio heat and drawdown metrics after each exit. Records win/loss for performance attribution.',params:'symbol, amount'},
          {icon:ArrowLeftRight,name:'SWAP',col:'#3b82f6',detail:'Best-route DEX aggregation. Solana assets: routes through Jupiter Aggregator for best price across all Solana DEXs. Ethereum/EVM assets: routes through 1inch or Uniswap V3. Auto-detects chain from asset type. Max 0.3% slippage.',params:'fromSymbol, toSymbol, amount, params.slippage?'},
          {icon:Landmark,name:'LEND',col:'#f59e0b',detail:'Supply assets to lending protocols for yield. Protocol priority: Aave V3 (primary), Compound V3, SparkLend, Morpho Blue, Maple Finance. APY data: USDC ~4.8%, ETH ~1.8%, BTC ~0.25%, Stables ~4.5%. Tracked with position ID for withdrawal.',params:'symbol, amount, params.protocol?'},
          {icon:Leaf,name:'YIELD',col:'#84cc16',detail:'Liquidity provision and yield farming. Three pool types: Stable pools (4.8% APY, low risk, e.g. USDC/BTC), Volatile LP (12% APY, medium risk, e.g. ETH/USDC), Leveraged pools (25% APY, high risk). Risk-adjusted selection based on risk-first methodology.',params:'symbol, amount, params.poolType?'},
          {icon:Coins,name:'BORROW',col:'#0ea5e9',detail:'Capital-efficient borrowing against collateral. Deposit a blue-chip asset (BTC, ETH, SOL) as collateral on Aave V3 or Morpho Blue and borrow stablecoins (USDC, BTC, SOL) at the current market rate. The AI deploys borrowed capital into higher-yield strategies. Borrow APR vs deployment APY spread must be positive. LTV capped at 65% for safety. Health factor always maintained above 1.5.',params:'collateralSymbol, borrowSymbol, amount, params.protocol?, params.ltv?'},
          {icon:Infinity,name:'LOOP',col:'#8b5cf6',detail:'Recursive yield optimization: deposit → borrow against collateral → re-deposit → repeat. Max 5 loops, max 80% LTV per loop. Calculates cumulative APY and health factor before executing. Automatically capped by risk limits. Uses Aave V3 + Morpho as primary protocols.',params:'symbol, amount, params.maxLoops?, params.targetLTV?'},
          {icon:Lock,name:'STAKE',col:'#06b6d4',detail:'Network staking across 27+ protocols with real APY data. ETH → Lido (3.8% APY), SOL → Jito (6.8%), DOT → Polkadot nomination (12%), ATOM → Cosmos delegation (15%), ENA → Ethena sENA (27%), INJ → Injective DAO (11%), NEAR → NEAR Staking (9%), TAO → Bittensor Subnet (12%).',params:'symbol, amount, params.protocol?'},
          {icon:X,name:'MULTIPLY',col:'#f97316',detail:'Leveraged long exposure. Max 3× for major assets (BTC, ETH, SOL), max 2× for DeFi. Calculates liquidation price, daily borrow cost (e.g. 8.5%/yr), and break-even price move. Blocked if portfolio heat ≥ 6%. Maximum leverage enforced by the risk engine.',params:'symbol, amount, params.leverage?'},
          {icon:Gem,name:'EARN',col:'#a78bfa',detail:'Automatic best-strategy selection. Evaluates all available strategies (lending, staking, LP, looping) for the asset and selects the highest risk-adjusted APY. Scoring: APY - (risk_penalty × risk_score). Stakes are prioritized for liquid staking tokens. Non-yieldable assets return trading recommendation.',params:'symbol, amount'},
          {icon:Gift,name:'REWARDS',col:'#ec4899',detail:'Claim + auto-compound protocol rewards. Supported protocols: Aave (stkAAVE rewards), Lido (stETH rebases), Curve (CRV + veCRV), Balancer (BAL + gauge), Jupiter (JUP governance), Injective (INJ staking), Cosmos (ATOM), Polkadot (DOT), Hivemapper (HONEY), The Graph (GRT), Ethena (ENA), Soil (SOIL). Auto-compound reinvests immediately.',params:'symbol, params.autoCompound?'},
        ].map(f=>(
          <div key={f.name} style={{background:'rgba(13,13,32,0.8)',border:`1px solid ${f.col}18`,borderRadius:14,padding:18,marginBottom:10,backdropFilter:'blur(12px)'}}>
            <div style={{display:'flex',alignItems:'flex-start',gap:14}}>
              <f.icon size={26} color={f.col} strokeWidth={1.8} style={{flexShrink:0}} />
              <div style={{flex:1}}>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
                  <h3 style={{fontSize:15,fontWeight:800,color:f.col,margin:0}}>{f.name}</h3>
                  <Code>GET /api/inquisitiveAI/trade</Code>
                </div>
                <p style={{fontSize:12,color:'rgba(255,255,255,0.5)',lineHeight:1.7,marginBottom:8}}>{f.detail}</p>
                <div style={{fontSize:11,color:'rgba(255,255,255,0.3)'}}>Params: <Code>{f.params}</Code></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    ),

    assets: (
      <div>
        <h2 style={{fontSize:26,fontWeight:900,marginBottom:4}}>All 65 Assets</h2>
        <p style={{color:'rgba(255,255,255,0.4)',fontSize:13,marginBottom:20}}>Exact specification — real live prices from CoinGecko API · 30-second polling</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:6}}>
          {ASSETS_65.map(a=>(
            <div key={a.s} style={{background:'rgba(13,13,32,0.8)',border:`1px solid ${catColor(a.cat)}20`,borderRadius:10,padding:'10px 12px',backdropFilter:'blur(12px)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:4}}>
                <span style={{fontSize:11,color:'rgba(255,255,255,0.25)'}}>{a.n}</span>
                <span style={{fontSize:9,padding:'1px 5px',borderRadius:4,background:`${catColor(a.cat)}18`,color:catColor(a.cat),fontWeight:600,textTransform:'capitalize'}}>{a.cat}</span>
              </div>
              <div style={{fontWeight:800,fontSize:14}}>{a.s}</div>
              <div style={{fontSize:10,color:'rgba(255,255,255,0.4)',marginTop:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.name}</div>
            </div>
          ))}
        </div>
      </div>
    ),

    research: (
      <div>
        <h2 style={{fontSize:26,fontWeight:900,marginBottom:4}}>INQUISITIVE Intelligence System</h2>
        <p style={{color:'rgba(255,255,255,0.4)',fontSize:13,marginBottom:28}}>5 AI engines powering every 8-second decision cycle — built by INQUISITIVE</p>
        {[
          {org:'Pattern Engine',badge:'RL · Regime Detection',col:'#3b82f6',icon:'Brain',pts:[
            'Reinforcement learning action-value scoring across all 65 assets simultaneously',
            'Pattern recognition — volume-price relationship analysis in real time',
            'Regime detection: BULL / BEAR / NEUTRAL using multi-factor state space',
            'Q-value scoring: assigns future-state value to every potential trade action',
            'ATH-distance valuation: deep value accumulation when price is far below all-time high',
            'Volume confirmation: confidence-weighted signal filtering',
          ]},
          {org:'Reasoning Engine',badge:'Fundamental · Sentiment',col:'#10b981',icon:'Bot',pts:[
            'Fundamental asset analysis via multi-step logical evaluation',
            'Category-based scoring: AI tokens +5%, RWA tokens +3%, institutional tokens +4%',
            'Sentiment analysis via Fear & Greed index interpretation (extreme = contrarian)',
            'Contrarian logic: Fear & Greed < 30 increases BUY signals (market oversold)',
            'Yield-bearing asset identification: staking/lending adds fundamental value score',
            'Stablecoin logic: skip trading, redirect to lending protocols for safe yield',
          ]},
          {org:'Portfolio Engine',badge:'Optimization · Diversification',col:'#ef4444',icon:'Microscope',pts:[
            'Sharpe-optimized scoring: reward = (alpha - 0.5×beta²×variance)/sqrt(variance)',
            'Correlation-aware diversification: under-represented categories get scoring boost',
            'Market cap tier weighting: mega-cap (>$100B) for stability, small-cap for alpha',
            'Kelly Criterion position sizing with 2% hard risk floor per trade',
            'TWAP execution for large orders to minimize market impact',
            'Multi-factor model: momentum, value, quality, size applied to all 65 assets',
          ]},
          {org:'Learning Engine',badge:'Adaptive · Meta-Cognitive',col:'#f97316',icon:'Activity',pts:[
            'Meta-cognitive self-awareness: monitors own confidence calibration over time',
            '7-day trend analysis for momentum-aware position management',
            'Liquidity quality scoring: $100M 24h volume required for full weight',
            'Continuous learning: performance feedback adjusts future signal weightings',
            'Adaptive thresholds: BEAR regime raises required confidence from 70% to 75%',
            'Plain-language explanation generated for every AI decision made',
          ]},
          {org:'Risk Engine',badge:'Risk Gate',col:'#fbbf24',icon:'Shield',pts:[
            '2% max portfolio risk per trade — hard-coded, cannot be bypassed',
            '6% max portfolio heat across all open positions simultaneously',
            '15% drawdown circuit breaker — all trading halts automatically',
            '2:1 minimum risk-reward ratio required before any position entry',
            'Technical stop loss: 2× ATR below entry point',
            '5-cycle paper trade validation before going live with real capital',
          ]},
        ].map(r=>(
          <div key={r.org} style={{background:'rgba(13,13,32,0.8)',border:`1px solid ${r.col}20`,borderRadius:16,padding:22,marginBottom:12,backdropFilter:'blur(12px)'}}>
            <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:14}}>
              {r.icon === 'Brain' && <Brain size={28} color={r.col} />}
              {r.icon === 'Bot' && <Bot size={28} color={r.col} />}
              {r.icon === 'Microscope' && <Microscope size={28} color={r.col} />}
              {r.icon === 'Activity' && <Activity size={28} color={r.col} />}
              {r.icon === 'Shield' && <Shield size={28} color={r.col} />}
              <div>
                <h3 style={{fontSize:18,fontWeight:800,margin:0}}>{r.org}</h3>
                <span style={{fontSize:11,padding:'2px 8px',borderRadius:100,background:`${r.col}15`,color:r.col,fontWeight:600,border:`1px solid ${r.col}25`}}>{r.badge}</span>
              </div>
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {r.pts.map((p,i)=><S key={i}>{p}</S>)}
            </div>
          </div>
        ))}
      </div>
    ),

    riskMethodology: (
      <div>
        <div style={{background:'rgba(251,191,36,0.06)',border:'1px solid rgba(251,191,36,0.2)',borderRadius:14,padding:18,marginBottom:24}}>
          <div style={{fontSize:14,fontWeight:700,color:'#fbbf24',marginBottom:8}}>Risk-First Methodology</div>
          <p style={{fontSize:12,color:'rgba(255,255,255,0.5)',lineHeight:1.7,margin:0}}>
            This is the risk management backbone of the entire INQAI system. Every AI trade signal must pass through all 8 risk gates before execution. Capital preservation is always prioritized over profit generation.
          </p>
        </div>
        <h2 style={{fontSize:26,fontWeight:900,marginBottom:20}}>8 Risk Gates</h2>
        {[
          {title:'Rule 1: Risk First, Profit Second',col:'#fbbf24',detail:'Capital preservation ALWAYS comes before profit maximization. The first question is never "how much can I make?" but "how much can I lose?" Every trade evaluation begins with risk assessment. If the risk is not acceptable, the trade is skipped regardless of potential profit.'},
          {title:'Rule 2: 2% Max Risk Per Trade',col:'#ef4444',detail:'Never risk more than 2% of total portfolio value on a single trade. Position size is calculated as: (Portfolio × 2%) ÷ (Entry Price - Stop Loss Price). This ensures 50 consecutive losing trades — an impossible streak — cannot wipe out the account. This is a HARD LIMIT.'},
          {title:'Rule 3: 6% Portfolio Heat Maximum',col:'#f97316',detail:'Maximum total open risk across ALL positions simultaneously is 6%. If three 2% risk trades are open, portfolio heat = 6% and NO new trades open until one closes. This prevents correlated drawdown where multiple trades go against you simultaneously.'},
          {title:'Rule 4: 15% Drawdown Circuit Breaker',col:'#dc2626',detail:'If the portfolio drawdown from peak reaches 15%, ALL automated trading halts immediately. Human review is required before trading resumes. This is a non-negotiable circuit breaker. It prevents catastrophic loss during black swan events, flash crashes, or AI misconfidence cycles.'},
          {title:'Rule 5: 2:1 Minimum Risk:Reward',col:'#10b981',detail:'Every trade must offer at least 2× the potential gain vs. the potential loss before entry. If the setup doesn\'t offer a 2:1 ratio, the trade is SKIPPED. This means the win rate only needs to be 34%+ to be profitable. Better setups have 3:1 or even 5:1.'},
          {title:'Rule 6: Technical Stop Loss at 2× ATR',col:'#3b82f6',detail:'Stop losses are placed at technically significant levels — 2 times the Average True Range (ATR) below entry. This is based on real price volatility. It prevents being stopped out by normal market noise while still protecting capital from trending moves against the position.'},
          {title:'Rule 7: Paper Trade Validation',col:'#8b5cf6',detail:'The first 5 AI decision cycles run in paper trade mode — signals are calculated but trades are NOT executed with real capital. This validates that the AI is performing correctly before risking money. Only after 5 validated cycles does the system switch to live execution.'},
          {title:'Rule 8: Decision Transparency',col:'#06b6d4',detail:'Every AI decision must be accompanied by a clear, plain-language explanation. No black boxes. If the system cannot explain why it is taking a trade, it will not take it. The X-Ray component fulfills this with full decision transparency for every trade.'},
        ].map(r=>(
          <div key={r.title} style={{background:'rgba(13,13,32,0.8)',border:`1px solid ${r.col}18`,borderRadius:14,padding:18,marginBottom:10,backdropFilter:'blur(12px)'}}>
            <h3 style={{fontSize:14,fontWeight:800,color:r.col,marginBottom:8}}>{r.title}</h3>
            <p style={{fontSize:12,color:'rgba(255,255,255,0.5)',lineHeight:1.7,margin:0}}>{r.detail}</p>
          </div>
        ))}
      </div>
    ),

    security: (
      <div>
        <h2 style={{fontSize:26,fontWeight:900,marginBottom:4}}>Multi-Layer Security Architecture</h2>
        <p style={{color:'rgba(255,255,255,0.4)',fontSize:13,marginBottom:28}}>Independent security layers at every level. No single point of failure.</p>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          {[
            {icon:'Lock',title:'Secure Treasury',col:'#7c3aed',detail:'Treasury operations with secure access controls and timelock protections for withdrawal operations.'},
          ].map(s=>(
            <div key={s.title} style={{background:'rgba(13,13,32,0.8)',border:`1px solid ${s.col}18`,borderRadius:14,padding:18,backdropFilter:'blur(12px)'}}>
              <div style={{display:'flex',gap:12,alignItems:'flex-start',marginBottom:8}}>
                {s.icon === 'Lock' && <Lock size={24} color={s.col} />}
                <h3 style={{fontSize:14,fontWeight:800,color:s.col,margin:0}}>{s.title}</h3>
              </div>
              <p style={{fontSize:12,color:'rgba(255,255,255,0.5)',lineHeight:1.7,margin:0}}>{s.detail}</p>
            </div>
          ))}
        </div>
      </div>
    ),

    api: (
      <div>
        <h2 style={{fontSize:26,fontWeight:900,marginBottom:4}}>API Reference</h2>
        <p style={{color:'rgba(255,255,255,0.4)',fontSize:13,marginBottom:12}}>
          Production: <Code>https://getinqai.com/api/inquisitiveAI/*</Code> · All endpoints are Next.js API routes
        </p>
        <div style={{background:'rgba(16,185,129,0.05)',border:'1px solid rgba(16,185,129,0.15)',borderRadius:10,padding:'10px 14px',marginBottom:20,fontSize:12,color:'rgba(16,185,129,0.8)'}}>
          All endpoints return real live data. Price data from CoinGecko. Chart history is derived from live CoinGecko price + change fields. Portfolio equity curve reflects actual trading engine state.
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:6}}>
          {[
            {m:'GET', p:'/status',                    d:'Full system status — brain cycles, price feed health, macro indicators, trading stats'},
            {m:'GET', p:'/assets',                    d:'All 65 assets: live price, 24h/7d change, volume, market cap, AI signal + confidence score'},
            {m:'GET', p:'/assets/:symbol',             d:'Single asset — live price + full AI analysis from all 5 engines'},
            {m:'GET', p:'/signals',                   d:'All AI brain signals, top buy opportunities, borrow opportunities, risk assessment, cycle count'},
            {m:'GET', p:'/analyze/:symbol',            d:'Deep analysis: Pattern/Reasoning/Portfolio/Learning engine scores + risk gate result + explanation'},
            {m:'GET', p:'/prices',                    d:'Raw price map for all 65 assets (symbol → price object) from CoinGecko'},
            {m:'GET', p:'/prices/:symbol',             d:'Single asset live price, 24h/7d change, volume, market cap, ATH distance'},
            {m:'GET', p:'/macro',                     d:'Macro indicators: Fear & Greed (Alternative.me) + BTC/ETH/SOL prices (CoinGecko) + market regime'},
            {m:'GET', p:'/portfolio/positions',       d:'All open positions with current price, unrealized P&L, entry price, stop, target'},
            {m:'GET', p:'/portfolio/history',         d:'Closed trade history with P&L per trade — optional ?limit=N query param'},
            {m:'GET', p:'/chart/price/:symbol',       d:'Derived hourly price history for a symbol — ?days=N (default 7). Based on live CoinGecko data.'},
            {m:'GET', p:'/chart/portfolio',           d:'Portfolio equity curve (48-hour window) reflecting trading engine P&L state'},
            {m:'GET', p:'/chart/categories',          d:'Market cap allocation by asset category — used for the donut chart in Analytics'},
            {m:'GET', p:'/initialize',                d:'Re-initialize the AI agent and all services — triggers fresh price + macro fetch'},
          ].map(e=>(
            <div key={e.p} style={{display:'flex',alignItems:'center',gap:12,background:'rgba(13,13,32,0.8)',border:'1px solid rgba(255,255,255,0.05)',borderRadius:10,padding:'10px 14px',backdropFilter:'blur(12px)'}}>
              <span style={{fontSize:10,fontWeight:700,padding:'3px 8px',borderRadius:5,flexShrink:0,background:e.m==='GET'?'rgba(16,185,129,0.15)':'rgba(59,130,246,0.15)',color:e.m==='GET'?'#34d399':'#60a5fa',border:`1px solid ${e.m==='GET'?'rgba(16,185,129,0.25)':'rgba(59,130,246,0.25)'}`}}>{e.m}</span>
              <Code>/api/inquisitiveAI{e.p}</Code>
              <span style={{fontSize:11,color:'rgba(255,255,255,0.4)',flex:1}}>{e.d}</span>
            </div>
          ))}
        </div>
      </div>
    ),

    tokenomics: (
      <div>
        <h2 style={{fontSize:26,fontWeight:900,marginBottom:28}}>INQAI Token Economics</h2>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
          <div style={{background:'rgba(13,13,32,0.8)',border:'1px solid rgba(124,58,237,0.2)',borderRadius:16,padding:22,backdropFilter:'blur(12px)'}}>
            <h3 style={{fontSize:15,fontWeight:700,color:'#a78bfa',marginBottom:16}}>Token Specifications</h3>
            {[
              ['Name','INQUISITIVE'],['Symbol','INQAI'],['Standard','ERC-20'],
              ['Backing','65-Asset Digital Portfolio'],['Network','Ethereum Mainnet'],
              ['Total Supply', `${Number(process.env.NEXT_PUBLIC_TOTAL_SUPPLY || 100000000).toLocaleString()} INQAI`],['Inflation','None — fixed supply'],
              ['Presale Price', `$${process.env.NEXT_PUBLIC_PRESALE_PRICE || '8'}/token`],['Target Price', `$${process.env.NEXT_PUBLIC_TARGET_PRICE || '15'}/token`],
              ['Target Market Cap','$1.5B'],['Target APY', `${((parseFloat(process.env.NEXT_PUBLIC_TARGET_APY || '0.185')) * 100).toFixed(1)}%`],
              ['Performance Fee','15% flat on yields'],
              ['Fee Distribution','60% buybacks · 20% burns · 20% treasury'],
            ].map(([k,v])=>(
              <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:12}}>
                <span style={{color:'rgba(255,255,255,0.4)'}}>{k}</span>
                <span style={{fontWeight:600,color:'#fff'}}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{background:'rgba(13,13,32,0.8)',border:'1px solid rgba(37,99,235,0.2)',borderRadius:16,padding:22,backdropFilter:'blur(12px)'}}>
            <h3 style={{fontSize:15,fontWeight:700,color:'#60a5fa',marginBottom:16}}>Token Distribution</h3>
            {[
              {cat:'Ecosystem Growth',pct:'35%',amt:'35M INQAI',vest:'36 months linear'},
              {cat:'Team & Advisors', pct:'20%',amt:'20M INQAI',vest:'No vesting — held in team address'},
              {cat:'Foundation',      pct:'15%',amt:'15M INQAI',vest:'36 months linear'},
              {cat:'Liquidity',       pct:'15%',amt:'15M INQAI',vest:'No vesting — held in team address'},
              {cat:'Community',       pct:'10%',amt:'10M INQAI',vest:'36 months linear'},
              {cat:'Strategic Reserve',pct:'5%',amt:'5M INQAI', vest:'36 months linear'},
            ].map(t=>(
              <div key={t.cat} style={{marginBottom:10}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                  <span style={{fontSize:12,color:'rgba(255,255,255,0.6)',fontWeight:600}}>{t.cat}</span>
                  <div style={{textAlign:'right'}}>
                    <span style={{fontSize:13,fontWeight:800,color:'#a78bfa'}}>{t.pct}</span>
                    <span style={{fontSize:10,color:'rgba(255,255,255,0.3)',marginLeft:6}}>{t.vest}</span>
                  </div>
                </div>
                <div style={{height:4,borderRadius:2,background:'rgba(255,255,255,0.06)',overflow:'hidden'}}>
                  <div style={{height:'100%',width:t.pct,background:'linear-gradient(90deg,#7c3aed80,#7c3aed)',borderRadius:2}} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{background:'rgba(13,13,32,0.8)',border:'1px solid rgba(16,185,129,0.2)',borderRadius:16,padding:22,backdropFilter:'blur(12px)'}}>
          <h3 style={{fontSize:15,fontWeight:700,color:'#34d399',marginBottom:16}}>Value Accrual Mechanisms</h3>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
            {[
              {icon:Gem,title:'Asset-Backed Ownership',desc:'Each INQAI token represents proportional ownership in a diversified portfolio of 65 digital assets, professionally managed by proprietary AI systems.'},
              {icon:TrendingUp,title:'Portfolio Performance',desc:'Five intelligence engines optimize the 65-asset portfolio continuously across 11 trading strategies, compounding risk-adjusted returns into the underlying backing.'},
              {icon:Flame,title:'Systematic Buybacks + Burns',desc:'60% of all protocol fees are deployed for open-market INQAI buybacks. 20% is permanently burned. Sustained demand against a contracting circulating supply.'},
              {icon:Lock,title:'Staking Rewards',desc:'Token holders earn protocol yield through staking, generating additional returns on top of portfolio performance and fee-driven value accrual.'},
            ].map(v=>(
              <div key={v.title} style={{background:'rgba(16,185,129,0.05)',border:'1px solid rgba(16,185,129,0.12)',borderRadius:12,padding:14}}>
                <v.icon size={24} color="#34d399" strokeWidth={1.8} />
                <div style={{fontSize:13,fontWeight:700,color:'#34d399',marginBottom:6}}>{v.title}</div>
                <p style={{fontSize:11,color:'rgba(255,255,255,0.4)',lineHeight:1.6,margin:0}}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    ),

    roadmap: (
      <div>
        <h2 style={{fontSize:26,fontWeight:900,marginBottom:4}}>Development Roadmap</h2>
        <p style={{color:'rgba(255,255,255,0.4)',fontSize:13,marginBottom:28}}>Five phases from infrastructure to full autonomous portfolio execution. Each phase builds directly on the last. All phases are operational.</p>
        {[
          {
            phase:'Phase 1 — Foundation',
            status:'COMPLETE',
            col:'#10b981',
            detail:'The entire AI brain, trading engine, price feed, macro data layer, REST API, WebSocket broadcaster, and Next.js frontend are fully operational.',
            items:[
              '65-asset portfolio with real live prices via CoinGecko API (30-second polling)',
              'AI Brain: 5 intelligence engines — Pattern, Reasoning, Portfolio, Learning, Risk',
              '11 trading functions — Buy, Sell, Swap, Lend, Yield, Borrow, Loop, Stake, Multiply, Earn, Rewards',
              'MacroData service: Alternative.me Fear & Greed + CoinGecko regime signals (BTC/ETH/SOL)',
              'Full REST API: 18 endpoints covering status, assets, signals, dashboard, macro, prices, portfolio, charts, trade execution',
              'WebSocket real-time broadcaster: pushes price + signal updates to all connected clients every 8 seconds',
              'Next.js 14 frontend: homepage, analytics, buy, docs — all pages complete',
              'Risk engine: 2% per trade / 6% heat / 15% drawdown circuit breaker / 2:1 R:R minimum',
              'Paper trade validation: first 5 cycles paper-only before live execution begins',
            ]
          },
          {
            phase:'Phase 2 — Smart Contracts',
            status:'COMPLETE',
            col:'#10b981',
            detail:'DEPLOYED — Asset-backed vault deployed to mainnet. INQAI token live at 0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5.',
            items:[
              'Smart vault contract deployed — AI trading generates protocol yield distributed via buybacks and rewards',
              'INQAI ERC-20 token deployed — 100M fixed supply at 0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5',
              'Buyback + burn contract — 60% of protocol fees auto-buy INQAI; 20% burned, 20% treasury',
              'Presale contract complete — accepts ETH, BTC, SOL, USDC at $8/INQAI',
              'Chainlink price oracle integrated — on-chain TWAP for all vault valuations',
              'Treasury deployed with secure access controls and timelock protections',
              'Security audit complete — Certora verification + Trail of Bits review',
              'Testnet validation complete — 2-week public testing passed',
              'Mainnet deployment successful — contracts live and operational',
            ]
          },
          {
            phase:'Phase 3 — Live DeFi Execution',
            status:'IN PROGRESS',
            col:'#f59e0b',
            detail:'DEVELOPING — Trading engine being integrated with DeFi protocols. AI brain processing 65 assets.',
            items:[
              'Live Aave V3 lending — active positions with real yield generation',
              'Live Morpho Blue integration — isolated markets with optimized yields',
              'Live Uniswap V3 LP management — concentrated liquidity positions active',
              'Live Jupiter Aggregator — Solana swaps executing across DEXs',
              'Live 1inch / Uniswap V3 — Ethereum swaps with MEV protection',
              'Live Lido staking — ETH → stETH with auto-rebase tracking',
              'Live Jito + Sanctum staking — SOL liquid staking operational',
              'Live Aave V3 borrowing — collateral optimization active',
              'Live recursive looping — yield optimization with health factor guards',
              'Flashbots MEV protection — front-run prevention active',
              'Gas optimisation — batched multicall execution live',
              'On-chain reconciliation — vault accounting verified each cycle',
            ]
          },
          {
            phase:'Phase 4 — Token Launch & Ecosystem',
            status:'IN PROGRESS',
            col:'#f59e0b',
            detail:'DEPLOYING — Token contracts deployed, vesting setup in progress, ecosystem development underway.',
            items:[
              'INQAI public sale complete — token freely tradable on Ethereum mainnet',
              'Uniswap V3 pools — INQAI/USDC and INQAI/ETH liquidity seeded',
              'CEX listings — Tier 2 exchanges active, Tier 1 applications submitted',
              'Analytics dashboard — real-time portfolio value, holdings, APY tracking',
              'Community staking — INQAI staking with enhanced protocol rewards',
              'Referral programme — on-chain referral tracking operational',
              'Ecosystem grants — 10M INQAI fund for integrations ready',
              'Buy page functional — ETH/BTC/SOL/USDC payments working',
              'Holdings display — user portfolio tracking live',
            ]
          },
          {
            phase:'Phase 5 — Advanced AI & Cross-Chain',
            status:'IN PROGRESS',
            col:'#f59e0b',
            detail:'DEVELOPING — Advanced AI metrics and cross-chain bridge integration being implemented.',
            items:[
              'AI metrics dashboard — confidence scores, regime signals visible',
              'Pattern engine — advanced market pattern recognition active',
              'Reasoning engine — multi-factor decision making operational',
              'Portfolio engine — automated rebalancing and optimization',
              'Learning engine — continuous improvement from market data',
              'Risk engine — institutional-grade risk management',
              'Real-time signals — AI trading signals broadcast every 8 seconds',
              'Performance tracking — win rate, profit factor, sharpe ratio live',
              'Market regime detection — bull/bear/sideways identification',
              'Advanced analytics — comprehensive AI performance metrics',
            ]
          },
        ].map(p=>(
          <div key={p.phase} style={{background:'rgba(13,13,32,0.8)',border:`1px solid ${p.col}20`,borderRadius:16,padding:20,marginBottom:12,backdropFilter:'blur(12px)'}}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:8}}>
              <h3 style={{fontSize:16,fontWeight:800,margin:0}}>{p.phase}</h3>
              <span style={{fontSize:10,padding:'3px 10px',borderRadius:100,background:`${p.col}18`,color:p.col,fontWeight:700,border:`1px solid ${p.col}30`}}>{p.status}</span>
            </div>
            <p style={{fontSize:12,color:'rgba(255,255,255,0.45)',lineHeight:1.6,margin:'0 0 12px'}}>{p.detail}</p>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              {p.items.map((item,i)=>(
                <div key={i} style={{display:'flex',alignItems:'flex-start',gap:6,background:'rgba(255,255,255,0.04)',borderRadius:8,padding:'5px 10px',fontSize:11,color:'rgba(255,255,255,0.55)',maxWidth:'100%'}}>
                  <span style={{color:p.col,flexShrink:0}}>✓</span><span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    ),
  };

  return (
    <>
      <Head><title>Docs | INQUISITIVE</title></Head>
      <div style={{minHeight:'100vh',background:'#07071a',color:'#fff',fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif'}}>
        <div className="mesh-bg" />

        {/* Nav */}
        <nav style={{position:'sticky',top:0,zIndex:50,background:'rgba(7,7,26,0.92)',backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(255,255,255,0.05)',height:52,display:'flex',alignItems:'center',padding:'0 20px',gap:10}}>
          <button onClick={()=>router.push('/')} style={{display:'flex',alignItems:'center',gap:9,background:'none',border:'none',cursor:'pointer',marginRight:16,padding:0}}>
            <img src="/inqai-logo.svg" alt="INQAI" style={{width:30,height:30,borderRadius:'50%',flexShrink:0}} />
            <div className="anim-name-pulse" style={{fontWeight:900,fontSize:16,letterSpacing:'-0.4px',color:'#fff',lineHeight:1}}>INQUISITIVE</div>
          </button>
          <div style={{display:'flex',gap:4,flex:1}}>
            {[{l:'Portfolio',p:'/analytics',accent:false},{l:'Docs',p:'/help',accent:true}].map(n=>(
              <button key={n.l} onClick={()=>router.push(n.p)} style={{padding:'5px 12px',borderRadius:7,background:n.accent?'linear-gradient(135deg,#7c3aed,#4f46e5)':'transparent',border:n.accent?'1px solid rgba(255,255,255,0.1)':'none',color:n.accent?'#fff':'rgba(255,255,255,0.45)',fontSize:12,fontWeight:n.accent?700:500,cursor:'pointer',boxShadow:n.accent?'0 2px 10px rgba(124,58,237,0.3)':'none'}}>{n.l}</button>
            ))}
          </div>
          <div style={{marginLeft:'auto'}}>
            <WalletButton label="Connect" />
          </div>
        </nav>

        <div style={{display:'flex',minHeight:'calc(100vh - 52px)',position:'relative',zIndex:1}}>
          {/* Sidebar */}
          <div style={{width:220,flexShrink:0,borderRight:'1px solid rgba(255,255,255,0.05)',background:'rgba(8,8,22,0.7)',padding:'16px 10px',position:'sticky',top:52,height:'calc(100vh - 52px)',overflowY:'auto'}}>
            <div style={{fontSize:10,color:'rgba(255,255,255,0.25)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:12,padding:'0 8px'}}>Documentation</div>
            {NAV_ITEMS.map((n: {id:string; Icon:any; label:string})=>(
              <button key={n.id} onClick={()=>setActive(n.id)} style={{width:'100%',display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:9,background:active===n.id?'rgba(124,58,237,0.15)':'transparent',border:`1px solid ${active===n.id?'rgba(124,58,237,0.25)':'transparent'}`,color:active===n.id?'#a78bfa':'rgba(255,255,255,0.45)',fontSize:12,fontWeight:active===n.id?700:500,cursor:'pointer',textAlign:'left',marginBottom:2,transition:'all 0.15s'}}>
                <n.Icon size={14} strokeWidth={2} />
                <span>{n.label}</span>
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{flex:1,padding:'28px 32px',maxWidth:860,overflowY:'auto'}}>
            {sections[active] || <div style={{color:'rgba(255,255,255,0.3)'}}>Section not found</div>}
          </div>
        </div>
      </div>
    </>
  );
}
