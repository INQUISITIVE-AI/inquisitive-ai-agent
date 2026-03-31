import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import {
  Brain, Zap, BarChart3, Shield, Eye,
  TrendingUp, TrendingDown, ArrowLeftRight, Landmark, Leaf,
  RotateCcw, Lock, Layers, Gem, Gift,
  Flame, Building2, Wallet, Bot, Scale, CheckCircle2,
  ArrowRight, Coins,
} from 'lucide-react';

const WalletButton = dynamic(() => import('../src/components/WalletButton'), { ssr: false });

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

  const load = useCallback(async () => {
    try {
      const [dr, ar] = await Promise.all([
        fetch('/api/inquisitiveAI/dashboard'),
        fetch('/api/inquisitiveAI/assets'),
      ]);
      if (dr.ok) setData(await dr.json());
      if (ar.ok) { const d = await ar.json(); setAssets(d.assets || []); }
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
    {Icon:Brain,    name:'The Brain',       sub:'AI Scoring Engine',   desc:'Five-engine consensus: Pattern, Reasoning, Portfolio, Learning, and Risk. Minimum 70% agreement required to execute.', color:'#7c3aed'},
    {Icon:Zap,      name:'The Executioner', sub:'Execution Engine',     desc:'Eleven discrete trading functions — BUY, SELL, SWAP, LEND, YIELD, BORROW, LOOP, STAKE, MULTIPLY, EARN, REWARDS.', color:'#2563eb'},
    {Icon:BarChart3, name:'The X-Ray',      sub:'Performance Monitor',  desc:'Real-time P&L attribution, risk metrics, drawdown tracking, and full AI decision transparency.', color:'#0891b2'},
    {Icon:Shield,   name:'The Guardian',    sub:'Security Layer',       desc:'48-hour timelocks on all critical operations. AI circuit breakers. 15% drawdown emergency halt.', color:'#dc2626'},
    {Icon:Eye,      name:'The Oracle',      sub:'Price Intelligence',   desc:'Primary: CoinGecko with 30-second polling. Fallback: CryptoCompare. Macro: Alternative.me Fear & Greed + BTC/ETH regime signals.', color:'#7c3aed'},
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
        <meta name="description" content="INQUISITIVE provides institutional-grade digital asset management through the INQAI token, representing proportional ownership in a professionally managed portfolio of 65 digital assets. Advanced AI systems execute continuous portfolio management across 11 strategies. Fixed supply of 100,000,000 tokens." />
      </Head>
      <div className="min-h-screen" style={{background:'#07071a',color:'#fff',fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif'}}>
        <div className="mesh-bg" />

        {/* NAV */}
        <nav style={{position:'fixed',top:0,left:0,right:0,zIndex:100,background:'rgba(7,7,26,0.9)',backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
          <div style={{maxWidth:1400,margin:'0 auto',padding:'0 24px',height:60,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <button onClick={()=>router.push('/')} style={{display:'flex',alignItems:'center',gap:10,background:'none',border:'none',cursor:'pointer',padding:0,marginLeft:-8}}>
              <img src="/inqai-logo.svg" alt="INQAI" style={{width:34,height:34,borderRadius:'50%',flexShrink:0}} />
              <div className="anim-name-pulse" style={{fontWeight:900,fontSize:20,letterSpacing:'-0.6px',color:'#fff',lineHeight:1}}>INQUISITIVE</div>
            </button>
            <div style={{display:'flex',alignItems:'center',gap:6}}>
              {[{l:'Portfolio',p:'/analytics',accent:true},{l:'Docs',p:'/help',accent:false}].map(n=>(
                <button key={n.l} onClick={()=>router.push(n.p)} style={{
                  padding:'7px 14px',borderRadius:9,border:n.accent?'1px solid rgba(255,255,255,0.1)':'none',
                  background:n.accent?'linear-gradient(135deg,#7c3aed,#4f46e5)':'transparent',
                  color:n.accent?'#fff':'rgba(255,255,255,0.55)',fontSize:13,fontWeight:n.accent?700:500,cursor:'pointer',
                  boxShadow:n.accent?'0 2px 12px rgba(124,58,237,0.35)':'none',
                }}>{n.l}</button>
              ))}
              <div style={{marginLeft:8}}><WalletButton label="Connect" /></div>
            </div>
          </div>
        </nav>


        {/* HERO */}
        <section style={{paddingTop:110,paddingBottom:72,paddingLeft:24,paddingRight:24,textAlign:'center',position:'relative',zIndex:1}}>
          <div style={{maxWidth:860,margin:'0 auto'}}>
            <h1 style={{fontSize:'clamp(42px,8vw,80px)',fontWeight:900,letterSpacing:'-2px',lineHeight:1.05,marginBottom:20}}>
              <span className="grad-text">INQUISITIVE</span>
            </h1>
            <div style={{fontSize:'clamp(16px,2.5vw,22px)',color:'rgba(255,255,255,0.5)',fontWeight:500,marginBottom:12}}>
              Institutional Digital Asset Management
            </div>
            <p style={{fontSize:15,color:'rgba(255,255,255,0.35)',maxWidth:600,margin:'0 auto 40px',lineHeight:1.8}}>
              INQAI is an ERC-20 token representing proportional ownership in a professionally managed portfolio of 65 digital assets. Proprietary AI systems execute portfolio management continuously across 11 discrete strategies. Fixed supply of 100,000,000 tokens.
            </p>
            <div style={{display:'flex',justifyContent:'center',marginBottom:60}}>
              <button onClick={()=>router.push('/buy')} style={{padding:'14px 36px',borderRadius:12,background:'linear-gradient(135deg,#7c3aed,#4f46e5)',color:'#fff',fontSize:16,fontWeight:700,cursor:'pointer',border:'1px solid rgba(255,255,255,0.1)',boxShadow:'0 8px 30px rgba(124,58,237,0.4)',transition:'all 0.2s'}}>
                Acquire INQAI
              </button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12,maxWidth:800,margin:'0 auto'}}>
              {[
                {label:'Managed Assets', value: assets.length || 65, suffix:' / 65',  color:'#a78bfa'},
                {label:'7D Return',     value: data?.performance?.return7d !== undefined ? pct(data.performance.return7d) : '—', suffix:'', color: data?.performance?.return7d !== undefined ? (data.performance.return7d >= 0 ? '#10b981' : '#ef4444') : '#6b7280'},
                {label:'Market Regime',  value: regime,              suffix:'',        color: regimeCol},
                {label:'Fear & Greed',   value: fg?.value || '—',    suffix: fg ? ` — ${fg.valueClassification}` : '', color: fgColor},
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
              <div style={{fontSize:11,letterSpacing:2,color:'#7c3aed',textTransform:'uppercase',marginBottom:10}}>How It Works</div>
              <h2 style={{fontSize:30,fontWeight:800,letterSpacing:'-0.5px'}}>Five-Component Architecture</h2>
              <p style={{color:'rgba(255,255,255,0.4)',marginTop:8,fontSize:14}}>Each component operates independently. No single point of failure.</p>
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
              <div style={{fontSize:11,letterSpacing:2,color:'#7c3aed',textTransform:'uppercase',marginBottom:10}}>Execution Engine</div>
              <h2 style={{fontSize:30,fontWeight:800}}>11 Execution Functions</h2>
              <p style={{color:'rgba(255,255,255,0.4)',marginTop:8,fontSize:14}}>Eleven discrete DeFi execution functions — the AI agent executes these on your behalf 24/7. You hold the token, the AI does the rest.</p>
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
              <div style={{fontSize:11,letterSpacing:2,color:'#7c3aed',textTransform:'uppercase',marginBottom:10}}>Token Design</div>
              <h2 style={{fontSize:30,fontWeight:800,letterSpacing:'-0.5px'}}>Proportional Ownership. Continuous Management.</h2>
              <p style={{fontSize:14,color:'rgba(255,255,255,0.35)',marginTop:8,maxWidth:520,margin:'8px auto 0'}}>
                INQAI provides diversified exposure to 65 digital assets through a single ERC-20 token, with AI-managed rebalancing and systematic fee-driven value accrual.
              </p>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:16}}>
              {[
                {Icon:Wallet,     title:'Asset-Backed Ownership',   desc:'Each INQAI token represents proportional ownership in a professionally managed portfolio of 65 digital assets. Real underlying assets. Transparent on-chain valuation.',col:'#a78bfa'},
                {Icon:Bot,        title:'AI Portfolio Management',   desc:'Five intelligence engines execute eleven trading strategies continuously, optimizing portfolio composition and risk-adjusted returns across all 65 assets.',col:'#60a5fa'},
                {Icon:TrendingUp, title:'Value Accrual Mechanisms',  desc:'Portfolio performance, systematic buybacks representing 60% of protocol fees, permanent burns of 20% of fees, and compounding protocol revenue.',col:'#10b981'},
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
                {Icon:Flame,     title:'Systematic Buybacks and Burns', desc:'60% of all protocol fees are deployed for open-market INQAI buybacks. 20% is permanently burned, reducing circulating supply over time.',col:'#f59e0b'},
                {Icon:Shield,    title:'Non-Custodial Architecture',     desc:'INQAI tokens are delivered directly to your self-custody wallet. No exchange custody, no counterparty exposure, no intermediary.',col:'#34d399'},
                {Icon:BarChart3, title:'Full Operational Transparency',   desc:'The Analytics dashboard provides real-time access to every AI trade decision, position, portfolio composition, and live risk metric.',col:'#f97316'},
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
              <h2 style={{fontSize:30,fontWeight:800,letterSpacing:'-0.5px'}}>Transparent Fee Structure</h2>
              <p style={{color:'rgba(255,255,255,0.4)',marginTop:8,fontSize:14}}>15% performance fee on yield. Zero management fee. No entry or exit costs.</p>
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
                {label:'Fee Distribution',val:'60 / 20 / 20',note:'Buybacks · Burns · Treasury'},
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
              {label:'ERC-20 Standard', sub:'Ethereum Mainnet'},
              {label:'Non-Custodial',   sub:'Self-Custody Only'},
              {label:'65 Live Assets',  sub:'Real-Time AI Management'},
              {label:'Live Data',       sub:'CoinGecko · CryptoCompare'},
              {label:'0% Mgmt Fee',     sub:'Performance-Only Structure'},
              {label:'Circuit Breakers',sub:'15% Drawdown Protection'},
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
            <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr',gap:40,marginBottom:32}}>
              <div>
                <div className="anim-name-pulse" style={{fontWeight:900,fontSize:18,letterSpacing:'-0.5px',color:'#fff',marginBottom:8}}>INQUISITIVE</div>
                <div style={{fontSize:11,color:'rgba(255,255,255,0.3)',lineHeight:1.8,maxWidth:360}}>
                  INQAI is an ERC-20 token representing proportional ownership in a professionally managed portfolio of 65 digital assets. Proprietary AI systems execute portfolio management continuously. Fixed supply of 100,000,000 tokens.
                </div>
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'1px',marginBottom:12}}>Platform</div>
                {[['Acquire INQAI','/buy'],['Portfolio','/analytics'],['Documentation','/help']].map(([l,p])=>(
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
            </div>
            <div style={{borderTop:'1px solid rgba(255,255,255,0.04)',paddingTop:20,fontSize:10,color:'rgba(255,255,255,0.15)',lineHeight:1.8,textAlign:'center'}}>
              &copy; {new Date().getFullYear()} INQUISITIVE · INQAI token address: 0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5<br/>
              <strong style={{color:'rgba(255,255,255,0.2)'}}>Risk Disclosure:</strong> Digital assets carry substantial risk including total loss of capital. INQAI is not a guaranteed investment. Past performance is not indicative of future results. Target APY of 18.5% is a projection, not a guarantee. This is not financial advice. Conduct your own due diligence before investing.
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
