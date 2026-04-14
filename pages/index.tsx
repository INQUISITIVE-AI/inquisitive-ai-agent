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
  ArrowRight, Coins,
} from 'lucide-react';


const fmtUsd = (n: number) => {
  if (!n) return '$0';
  if (n >= 1e12) return '$' + (n/1e12).toFixed(2) + 'T';
  if (n >= 1e9)  return '$' + (n/1e9).toFixed(2) + 'B';
  if (n >= 1e6)  return '$' + (n/1e6).toFixed(2) + 'M';
  if (n >= 1e3)  return '$' + (n/1e3).toFixed(1) + 'K';
  return '$' + n.toFixed(2);
};
const pct = (n: number) => `${n>=0?'+':''}${(n*100).toFixed(2)}%`;

export default function Home() {
  const router = useRouter();
  const [data, setData]   = useState<any>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [sales, setSales]  = useState<any>(null);

  const load = useCallback(async () => {
    try {
      const [dr, ar, sr] = await Promise.all([
        fetch('/api/inquisitiveAI/dashboard'),
        fetch('/api/inquisitiveAI/assets'),
        fetch('/api/inquisitiveAI/token/sales'),
      ]);
      if (dr.ok) setData(await dr.json());
      if (ar.ok) { const d = await ar.json(); setAssets(d.assets || []); }
      if (sr.ok) setSales(await sr.json());
    } catch {}
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60000);
    return () => clearInterval(t);
  }, [load]);

  const regime    = data?.risk?.regime || 'NEUTRAL';
  const regimeCol = regime === 'BULL' ? '#10b981' : regime === 'BEAR' ? '#ef4444' : '#f59e0b';
  const fg        = data?.risk?.fearGreed;
  const fgColor   = fg ? (fg.value<25?'#ef4444':fg.value<45?'#f97316':fg.value<55?'#f59e0b':fg.value<75?'#84cc16':'#10b981') : '#6b7280';

  const ARCH = [
    {Icon:Brain,    name:'Quantitative AI Engine',  sub:'Five-Engine Decision System',   desc:'Five independent scoring models — Pattern, Reasoning, Portfolio, Learning, and Risk — reach consensus before any position is taken. 70% threshold enforced.', color:'#7c3aed'},
    {Icon:Zap,      name:'Autonomous Execution',    sub:'DeFi Execution Layer',           desc:'Eleven institutional-grade execution strategies deployed autonomously: yield, lending, staking, leveraged exposure, liquidity provision, and more.', color:'#2563eb'},
    {Icon:BarChart3, name:'Performance Analytics',  sub:'Real-Time Risk Attribution',     desc:'Live P&L attribution, Sharpe ratio, drawdown tracking, portfolio heat, and full decision-level transparency across all 66 positions.', color:'#0891b2'},
    {Icon:Shield,   name:'Risk Management System',  sub:'Capital Preservation Layer',     desc:'Hard-coded risk limits: 2% maximum exposure per trade, 6% portfolio heat ceiling, 15% drawdown circuit breaker with automatic halt and emergency pause.', color:'#dc2626'},
    {Icon:Eye,      name:'Market Intelligence',     sub:'Multi-Source Data Infrastructure', desc:'Primary: CoinGecko live API with 30-second refresh across all 66 assets. Macro overlay: Fear & Greed Index, BTC/ETH/SOL regime signals, cross-asset correlation.', color:'#7c3aed'},
  ];

  const TRADES: {Icon: any; name: string; col: string; desc: string}[] = [
    {Icon:TrendingUp,      name:'BUY',      col:'#10b981', desc:'Optimal entry execution. 2% portfolio risk limit. Kelly Criterion position sizing. Minimum 2:1 reward-to-risk ratio.'},
    {Icon:TrendingDown,    name:'SELL',     col:'#ef4444', desc:'Profit harvesting and stop-loss enforcement. Tracks realized P&L and updates portfolio heat on each exit.'},
    {Icon:ArrowLeftRight,  name:'SWAP',     col:'#3b82f6', desc:'Best-route execution via Jupiter (Solana) and 1inch (Ethereum). Maximum 0.3% slippage tolerance.'},
    {Icon:Landmark,        name:'LEND',     col:'#f59e0b', desc:'Deploys capital to Aave V3, Compound, Morpho Blue, and Maple Finance at live APY rates.'},
    {Icon:Leaf,            name:'YIELD',    col:'#84cc16', desc:'Liquidity provision on Uniswap V3. Selects stable, volatile, or leveraged pools based on risk-adjusted return.'},
    {Icon:Coins,           name:'BORROW',   col:'#06b6d4', desc:'Collateral-backed borrowing. Maximum 65% LTV enforced. Health factor floor of 1.5. Spread guard active.'},
    {Icon:RotateCcw,       name:'LOOP',     col:'#8b5cf6', desc:'Recursive yield amplification. Maximum 5x exposure. 80% LTV cap. Health factor monitored continuously.'},
    {Icon:Lock,            name:'STAKE',    col:'#0ea5e9', desc:'Network staking across 27+ protocols including Lido, Jito, Sanctum, Cosmos, and Polkadot.'},
    {Icon:Layers,          name:'MULTIPLY', col:'#f97316', desc:'Leveraged long exposure up to 3x. Calculates liquidation price, daily borrow cost, and break-even move.'},
    {Icon:Gem,             name:'EARN',     col:'#a78bfa', desc:'Automatic strategy selection. Evaluates all available yield options and deploys to the highest risk-adjusted APY.'},
    {Icon:Gift,            name:'REWARDS',  col:'#ec4899', desc:'Claims and auto-compounds protocol rewards across 12+ supported platforms. Reinvests immediately.'},
  ];

  return (
    <>
      <Head>
        <title>INQUISITIVE — Institutional Digital Asset Management</title>
        <meta name="description" content="INQUISITIVE provides institutional-grade digital asset management through the INQAI token, representing proportional ownership in a professionally managed portfolio of 66 digital assets. Advanced AI systems execute continuous portfolio management across 11 strategies. Fixed supply of 100,000,000 tokens." />
      </Head>
      <div className="min-h-screen" style={{background:'#07071a',color:'#fff',fontFamily:'Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif'}}>
        <div className="mesh-bg" />

        {/* NAV */}
        <SiteNav position="fixed" />


        {/* HERO */}
        <section style={{paddingTop:110,paddingBottom:72,paddingLeft:24,paddingRight:24,textAlign:'center',position:'relative',zIndex:1}}>
          <div style={{maxWidth:860,margin:'0 auto'}}>
            <h1 style={{fontSize:'clamp(42px,8vw,80px)',fontWeight:900,letterSpacing:'-2px',lineHeight:1.05,marginBottom:20}}>
              <span className="grad-text">INQUISITIVE</span>
            </h1>
            <div style={{fontSize:'clamp(16px,2.5vw,20px)',color:'rgba(255,255,255,0.55)',fontWeight:600,marginBottom:12,letterSpacing:'-0.2px'}}>
              The First Open, On-Chain AI Fund
            </div>
            <p style={{fontSize:15,color:'rgba(255,255,255,0.4)',maxWidth:580,margin:'0 auto 40px',lineHeight:1.85,fontWeight:400}}>
              INQAI delivers proportional ownership in a professionally managed 66-asset digital portfolio through a single ERC-20 token. Five independent AI engines execute 11 institutional-grade capital deployment strategies around the clock — every signal, weight, and decision published on-chain in real time.
            </p>
            <div style={{display:'flex',justifyContent:'center',marginBottom:60}}>
              <div style={{display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap'}}>
                <button onClick={()=>router.push('/analytics')} style={{padding:'14px 36px',borderRadius:12,background:'linear-gradient(135deg,#7c3aed,#4f46e5)',color:'#fff',fontSize:16,fontWeight:700,cursor:'pointer',border:'1px solid rgba(255,255,255,0.1)',boxShadow:'0 8px 30px rgba(124,58,237,0.4)',transition:'all 0.2s'}}>
                  View Live Dashboard
                </button>
                <button onClick={()=>router.push('/token')} style={{padding:'14px 36px',borderRadius:12,background:'rgba(255,255,255,0.06)',color:'#fff',fontSize:16,fontWeight:700,cursor:'pointer',border:'1px solid rgba(255,255,255,0.12)',transition:'all 0.2s'}}>
                  Token Overview
                </button>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,maxWidth:800,margin:'0 auto'}}>
              {[
                {label:'Tokens Sold', value: sales?.token?.tokensSold > 0 ? Number(sales.token.tokensSold.toFixed(0)).toLocaleString() : (sales ? '0' : '—'), suffix: sales?.token?.tokensSold > 0 ? ' INQAI' : '', color:'#10b981'},
                {label:'7D Return',   value: data?.performance?.return7d !== undefined ? pct(data.performance.return7d) : '—', suffix:'', color: data?.performance?.return7d !== undefined ? (data.performance.return7d >= 0 ? '#10b981' : '#ef4444') : '#6b7280'},
                {label:'Market Cap',  value: sales?.marketCap?.circulatingUSD > 0 ? fmtUsd(sales.marketCap.circulatingUSD) : (sales?.marketCap?.aumUSD > 0 ? fmtUsd(sales.marketCap.aumUSD) : 'Presale'), suffix:'', color:'#a78bfa'},
                {label:'Fear & Greed', value: fg?.value || '—', suffix: fg ? ` — ${fg.valueClassification}` : '', color: fgColor},
              ].map(k=>(
                <div key={k.label} style={{background:'rgba(13,13,32,0.8)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:14,padding:'18px 14px',textAlign:'center',backdropFilter:'blur(12px)'}}>
                  <div style={{fontSize:22,fontWeight:800,color:k.color,fontFamily:'monospace'}}>{k.value}<span style={{fontSize:11,fontWeight:500,color:'rgba(255,255,255,0.3)'}}>{k.suffix}</span></div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.35)',marginTop:4,textTransform:'uppercase',letterSpacing:'0.5px'}}>{k.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ARCHITECTURE */}
        <section style={{padding:'60px 24px',position:'relative',zIndex:1,borderTop:'1px solid rgba(255,255,255,0.04)'}}>
          <div style={{maxWidth:1200,margin:'0 auto'}}>
            <div style={{textAlign:'center',marginBottom:44}}>
              <div style={{fontSize:11,letterSpacing:2,color:'#7c3aed',textTransform:'uppercase',marginBottom:10}}>System Architecture</div>
              <h2 style={{fontSize:30,fontWeight:800,letterSpacing:'-0.5px'}}>Five-Layer Quantitative System</h2>
              <p style={{color:'rgba(255,255,255,0.4)',marginTop:8,fontSize:14}}>Each layer operates independently with dedicated oversight. Designed for institutional-grade reliability.</p>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:12}}>
              {ARCH.map(c=>(
                <div key={c.name} style={{background:'rgba(13,13,32,0.8)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:16,padding:20,backdropFilter:'blur(12px)',transition:'all 0.2s',cursor:'default'}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=c.color+'66';e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.boxShadow=`0 8px 30px ${c.color}22`;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.06)';e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='none';}}>
                  <div style={{marginBottom:12}}><c.Icon size={26} color={c.color} strokeWidth={1.8} /></div>
                  <div style={{fontSize:13,fontWeight:700,color:c.color,marginBottom:2}}>{c.name}</div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.5)',marginBottom:8,fontWeight:600}}>{c.sub}</div>
                  <div style={{fontSize:10,color:'rgba(255,255,255,0.3)',lineHeight:1.6}}>{c.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TRADING FUNCTIONS */}
        <section style={{padding:'40px 24px 64px',position:'relative',zIndex:1,borderTop:'1px solid rgba(255,255,255,0.04)'}}>
          <div style={{maxWidth:1200,margin:'0 auto'}}>
            <div style={{textAlign:'center',marginBottom:40}}>
              <div style={{fontSize:11,letterSpacing:2,color:'#7c3aed',textTransform:'uppercase',marginBottom:10}}>Execution Strategies</div>
              <h2 style={{fontSize:30,fontWeight:800}}>11 Institutional Execution Strategies</h2>
              <p style={{color:'rgba(255,255,255,0.4)',marginTop:8,fontSize:14}}>Eleven capital deployment strategies executed autonomously across DeFi. Token holders gain diversified yield exposure without active management.</p>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:10}}>
              {TRADES.map(f=>(
                <div key={f.name} style={{background:'rgba(13,13,32,0.8)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:14,padding:'16px 14px',cursor:'default',transition:'all 0.2s',backdropFilter:'blur(12px)'}}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor=f.col+'50';e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow=`0 6px 24px ${f.col}18`;}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.06)';e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='none';}}>
                  <div style={{marginBottom:10}}><f.Icon size={22} color={f.col} strokeWidth={1.8} /></div>
                  <div style={{fontSize:13,fontWeight:800,color:f.col,marginBottom:6}}>{f.name}</div>
                  <div style={{fontSize:10,color:'rgba(255,255,255,0.35)',lineHeight:1.6}}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* VALUE PROPOSITION */}
        <section style={{padding:'40px 24px 64px',position:'relative',zIndex:1,borderTop:'1px solid rgba(255,255,255,0.04)'}}>
          <div style={{maxWidth:1200,margin:'0 auto'}}>
            <div style={{textAlign:'center',marginBottom:44}}>
              <div style={{fontSize:11,letterSpacing:2,color:'#7c3aed',textTransform:'uppercase',marginBottom:10}}>Fund Structure</div>
              <h2 style={{fontSize:30,fontWeight:800,letterSpacing:'-0.5px'}}>Institutional Exposure. Zero Operational Overhead.</h2>
              <p style={{fontSize:14,color:'rgba(255,255,255,0.35)',marginTop:8,maxWidth:520,margin:'8px auto 0'}}>
                INQAI delivers diversified exposure across 66 digital assets through a single ERC-20 token — with AI-driven portfolio management, systematic fee-driven value accrual, and full on-chain transparency.
              </p>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:16}}>
              {[
                {Icon:Wallet,     title:'On-Chain Asset Backing',    desc:'Each INQAI token represents verified, proportional ownership in a 66-asset digital portfolio. Underlying valuations are transparent, real-time, and independently verifiable on-chain.',col:'#a78bfa'},
                {Icon:Bot,        title:'Autonomous AI Management',  desc:'Five independent AI models execute eleven capital deployment strategies simultaneously, optimizing risk-adjusted returns across the full 66-asset portfolio without human intervention.',col:'#60a5fa'},
                {Icon:TrendingUp, title:'Structural Value Accrual',   desc:'60% of all protocol fees fund open-market buybacks. 20% is permanently burned. Every fee cycle reduces circulating supply while increasing demand — systematic, not speculative.',col:'#10b981'},
              ].map(c=>(
                <div key={c.title} style={{background:'rgba(13,13,32,0.8)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:20,padding:28,backdropFilter:'blur(12px)'}}>
                  <div style={{marginBottom:16,width:48,height:48,borderRadius:14,background:`rgba(255,255,255,0.05)`,display:'flex',alignItems:'center',justifyContent:'center'}}><c.Icon size={24} color={c.col} strokeWidth={1.8} /></div>
                  <div style={{fontSize:16,fontWeight:800,color:c.col,marginBottom:8}}>{c.title}</div>
                  <p style={{fontSize:13,color:'rgba(255,255,255,0.45)',lineHeight:1.7,margin:0}}>{c.desc}</p>
                </div>
              ))}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16}}>
              {[
                {Icon:Flame,     title:'Deflationary Fee Design',       desc:'Protocol fees drive a continuous burn-and-buyback cycle: 60% to open-market INQAI purchases, 20% permanently removed from supply. Designed for long-term supply contraction.',col:'#f59e0b'},
                {Icon:Shield,    title:'Non-Custodial by Design',        desc:'INQAI tokens are delivered directly to your self-custody wallet at the point of purchase. No third-party custody, no counterparty risk, no permission required to withdraw.',col:'#34d399'},
                {Icon:BarChart3, title:'Complete Decision Transparency',  desc:'Every AI signal, position, allocation weight, and risk metric is published in real time on the Analytics dashboard. No black box. No selective disclosure.',col:'#f97316'},
              ].map(c=>(
                <div key={c.title} style={{background:'rgba(13,13,32,0.8)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:20,padding:28,backdropFilter:'blur(12px)'}}>
                  <div style={{marginBottom:16,width:48,height:48,borderRadius:14,background:`rgba(255,255,255,0.05)`,display:'flex',alignItems:'center',justifyContent:'center'}}><c.Icon size={24} color={c.col} strokeWidth={1.8} /></div>
                  <div style={{fontSize:16,fontWeight:800,color:c.col,marginBottom:8}}>{c.title}</div>
                  <p style={{fontSize:13,color:'rgba(255,255,255,0.45)',lineHeight:1.7,margin:0}}>{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEE STRUCTURE */}
        <section style={{padding:'0 24px 64px',position:'relative',zIndex:1,borderTop:'1px solid rgba(255,255,255,0.04)'}}>
          <div style={{maxWidth:900,margin:'0 auto'}}>
            <div style={{textAlign:'center',marginBottom:40,paddingTop:60}}>
              <div style={{fontSize:11,letterSpacing:2,color:'#7c3aed',textTransform:'uppercase',marginBottom:10}}>Fee Structure</div>
              <h2 style={{fontSize:30,fontWeight:800,letterSpacing:'-0.5px'}}>Performance-Only. No Management Fee.</h2>
              <p style={{color:'rgba(255,255,255,0.4)',marginTop:8,fontSize:14}}>15% on yield generated. Zero AUM fee. No lock-ups, no entry costs, no exit penalties.</p>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,marginBottom:28}}>
              {[
                {label:'Management Fee',  inqai:'0%',    trad:'2.0% annual',  win:true,  note:'No drag on capital while waiting for returns'},
                {label:'Performance Fee', inqai:'15%',   trad:'20% of gains', win:true,  note:'5 percentage points cheaper than hedge fund standard'},
                {label:'Entry / Exit',    inqai:'0%',    trad:'0.1–0.5%',     win:true,  note:'No cost to add or remove capital at any time'},
              ].map(r=>(
                <div key={r.label} style={{background:'rgba(13,13,32,0.8)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:18,padding:24,backdropFilter:'blur(12px)'}}>
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.35)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:12}}>{r.label}</div>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
                    <div><div style={{fontSize:10,color:'#a78bfa',marginBottom:4}}>INQAI</div><div style={{fontSize:22,fontWeight:900,color:'#10b981'}}>{r.inqai}</div></div>
                    <div style={{textAlign:'right'}}><div style={{fontSize:10,color:'rgba(255,255,255,0.3)',marginBottom:4}}>Traditional</div><div style={{fontSize:22,fontWeight:900,color:'rgba(255,255,255,0.3)'}}>{r.trad}</div></div>
                  </div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.3)',lineHeight:1.5}}>{r.note}</div>
                </div>
              ))}
            </div>
            <div style={{background:'rgba(124,58,237,0.07)',border:'1px solid rgba(124,58,237,0.2)',borderRadius:16,padding:'20px 28px',display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:24}}>
              {[
                {label:'Fee Distribution',val:'60 / 20 / 15 / 5',note:'Buybacks · Burns · Treasury · Chainlink'},
                {label:'Fee Trigger',      val:'Yield Only',  note:'No fee until protocol generates yield'},
                {label:'vs Hedge Fund Standard', val:'25pp Lower', note:'15% performance fee versus the 20% industry standard'},
              ].map(s=>(
                <div key={s.label} style={{textAlign:'center'}}>
                  <div style={{fontSize:18,fontWeight:900,color:'#a78bfa',marginBottom:4}}>{s.val}</div>
                  <div style={{fontSize:10,color:'rgba(255,255,255,0.3)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:2}}>{s.label}</div>
                  <div style={{fontSize:11,color:'rgba(255,255,255,0.25)'}}>{s.note}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TRUST BAR */}
        <section style={{padding:'0 24px 0',position:'relative',zIndex:1,borderTop:'1px solid rgba(255,255,255,0.04)'}}>
          <div style={{maxWidth:1200,margin:'0 auto',padding:'24px 0',display:'flex',gap:32,alignItems:'center',justifyContent:'center',flexWrap:'wrap'}}>
            {[
              {label:'ERC-20 · Ethereum Mainnet', sub:'Verified on-chain'},
              {label:'Non-Custodial',              sub:'Self-custody delivery'},
              {label:'66 Assets Under Management', sub:'Live AI signals'},
              {label:'0% Management Fee',          sub:'Performance-only structure'},
              {label:'15% Drawdown Circuit Breaker',sub:'Automated capital protection'},
              {label:'Open Source',                sub:'Auditable codebase'},
            ].map(t=>(
              <div key={t.label} style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{width:5,height:5,borderRadius:'50%',background:'#10b981',display:'inline-block',flexShrink:0}} />
                <div>
                  <div style={{fontSize:12,fontWeight:700,color:'rgba(255,255,255,0.7)'}}>{t.label}</div>
                  <div style={{fontSize:10,color:'rgba(255,255,255,0.3)'}}>{t.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FOOTER */}
        <footer style={{borderTop:'1px solid rgba(255,255,255,0.04)',padding:'40px 24px',position:'relative',zIndex:1}}>
          <div style={{maxWidth:1200,margin:'0 auto'}}>
            <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr',gap:40,marginBottom:32}}>
              <div>
                <div style={{fontWeight:900,fontSize:18,letterSpacing:'-0.5px',color:'#fff',marginBottom:8}}>INQUISITIVE</div>
                <div style={{fontSize:11,color:'rgba(255,255,255,0.3)',lineHeight:1.8,maxWidth:360}}>
                  INQUISITIVE is an autonomous, on-chain AI fund. The INQAI token delivers institutional-grade exposure to a 66-asset digital portfolio — managed by proprietary AI, verified on-chain, and accessible to anyone.
                </div>
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:12}}>Platform</div>
                {[['INQAI Token','/token'],['Portfolio','/analytics'],['Documentation','/help']].map(([l,p])=>(
                  <div key={l} onClick={()=>router.push(p)} style={{fontSize:12,color:'rgba(255,255,255,0.35)',padding:'4px 0',cursor:'pointer',transition:'color 0.15s'}}
                    onMouseOver={e=>(e.currentTarget.style.color='rgba(255,255,255,0.7)')}
                    onMouseOut={e=>(e.currentTarget.style.color='rgba(255,255,255,0.35)')}
                  >{l}</div>
                ))}
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:12}}>Data Sources</div>
                {['CoinGecko (primary prices)','CryptoCompare (price fallback)','Alternative.me (Fear & Greed)','Chainlink (on-chain TWAP)'].map(s=>(
                  <div key={s} style={{fontSize:12,color:'rgba(255,255,255,0.3)',padding:'3px 0'}}>{s}</div>
                ))}
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:12}}>Legal</div>
                {[['Terms of Service','/terms'],['Privacy Policy','/privacy'],['Risk Disclosure','/risk']].map(([l,p])=> (
                  <div key={l} onClick={()=>router.push(p)} style={{fontSize:12,color:'rgba(255,255,255,0.35)',padding:'4px 0',cursor:'pointer',transition:'color 0.15s'}}
                    onMouseOver={e=>(e.currentTarget.style.color='rgba(255,255,255,0.7)')}
                    onMouseOut={e=>(e.currentTarget.style.color='rgba(255,255,255,0.35)')}
                  >{l}</div>
                ))}
              </div>
            </div>
            <div style={{borderTop:'1px solid rgba(255,255,255,0.04)',paddingTop:20,fontSize:10,color:'rgba(255,255,255,0.15)',lineHeight:1.8,textAlign:'center'}}>
              &copy; {new Date().getFullYear()} INQUISITIVE · INQAI: 0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5 · Vault: 0xb99dc519c4373e5017222bbd46f42a4e12a0ec25<br/>
              <strong style={{color:'rgba(255,255,255,0.2)'}}>Risk Disclosure:</strong> Digital assets carry substantial risk including total loss of capital. INQAI is not a guaranteed investment. Past performance is not indicative of future results. Target APY of 18.5% is a projection, not a guarantee. This is not financial advice. Conduct your own due diligence before investing.
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
