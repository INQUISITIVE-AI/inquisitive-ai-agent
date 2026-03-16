import { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { Lock, DollarSign, Wheat, Infinity, Gem } from 'lucide-react';

const WalletButton = dynamic(() => import('../src/components/WalletButton'), { ssr: false });

const fmtUsd = (n: number) => {
  if (!n) return '$0';
  if (n >= 1e12) return '$' + (n/1e12).toFixed(2) + 'T';
  if (n >= 1e9)  return '$' + (n/1e9).toFixed(2) + 'B';
  if (n >= 1e6)  return '$' + (n/1e6).toFixed(2) + 'M';
  if (n >= 1e3)  return '$' + (n/1e3).toFixed(1) + 'K';
  return '$' + n.toFixed(2);
};
const fmtP = (n: number, d = 2) => n?.toLocaleString('en-US', {minimumFractionDigits:d,maximumFractionDigits:d}) ?? '0';
const pct = (n: number) => `${n>=0?'+':''}${(n*100).toFixed(2)}%`;
const grc = (n: number) => n >= 0 ? '#10b981' : '#ef4444';
const sigStyle = (s: string) => {
  const m: Record<string,{bg:string;col:string;br:string}> = {
    BUY:      {bg:'rgba(16,185,129,0.12)', col:'#34d399',br:'rgba(16,185,129,0.3)'},
    SELL:     {bg:'rgba(239,68,68,0.12)',  col:'#f87171',br:'rgba(239,68,68,0.3)'},
    REDUCE:   {bg:'rgba(252,165,165,0.08)',col:'#fca5a5',br:'rgba(252,165,165,0.2)'},
    STAKE:    {bg:'rgba(14,165,233,0.12)', col:'#38bdf8',br:'rgba(14,165,233,0.3)'},
    LEND:     {bg:'rgba(245,158,11,0.12)', col:'#fbbf24',br:'rgba(245,158,11,0.3)'},
    YIELD:    {bg:'rgba(132,204,22,0.12)', col:'#a3e635',br:'rgba(132,204,22,0.3)'},
    BORROW:   {bg:'rgba(6,182,212,0.12)',  col:'#22d3ee',br:'rgba(6,182,212,0.3)'},
    SWAP:     {bg:'rgba(59,130,246,0.12)', col:'#60a5fa',br:'rgba(59,130,246,0.3)'},
    EARN:     {bg:'rgba(167,139,250,0.12)',col:'#a78bfa',br:'rgba(167,139,250,0.3)'},
    LOOP:     {bg:'rgba(251,146,60,0.12)', col:'#fb923c',br:'rgba(251,146,60,0.3)'},
    MULTIPLY: {bg:'rgba(236,72,153,0.12)', col:'#f472b6',br:'rgba(236,72,153,0.3)'},
    REWARDS:  {bg:'rgba(234,179,8,0.12)',  col:'#facc15',br:'rgba(234,179,8,0.3)'},
    HOLD:     {bg:'rgba(107,114,128,0.08)',col:'#9ca3af',br:'rgba(107,114,128,0.2)'},
    SKIP:     {bg:'rgba(75,85,99,0.08)',   col:'#6b7280',br:'rgba(75,85,99,0.15)'},
  };
  return m[s] || m.HOLD;
};
const catCol = (c: string) => {
  const m: Record<string,string> = {
    major:'#3b82f6',defi:'#7c3aed',ai:'#ec4899',l2:'#06b6d4',
    stablecoin:'#10b981',rwa:'#f97316','liquid-stake':'#f59e0b',
    interop:'#6366f1',privacy:'#6b7280',payment:'#84cc16',
    storage:'#0891b2',oracle:'#a78bfa',institutional:'#8b5cf6',
    gaming:'#f472b6',iot:'#34d399',data:'#60a5fa',
  };
  return m[c] || '#6b7280';
};

const STAKING_APYS: Record<string,{apy:number;proto:string}> = {
  ETH:{apy:3.8,proto:'Lido (stETH)'}, SOL:{apy:6.8,proto:'Jito (JitoSOL)'},
  BNB:{apy:3.5,proto:'BNB Beacon'},  ADA:{apy:3.5,proto:'Cardano Staking'},
  DOT:{apy:12,proto:'Polkadot NOM'}, ATOM:{apy:15,proto:'Cosmos Del.'},
  NEAR:{apy:9,proto:'NEAR Staking'}, INJ:{apy:11,proto:'Injective DAO'},
  JUP:{apy:8,proto:'Jupiter DAO'},   TAO:{apy:12,proto:'Bittensor Subnet'},
  ENA:{apy:27,proto:'Ethena sENA'},  LINK:{apy:4.5,proto:'CL Safety Mod.'},
  GRT:{apy:9,proto:'The Graph Idx'}, AAVE:{apy:6.8,proto:'Aave Safety Mod.'},
  ALGO:{apy:5.5,proto:'Algo Gov.'},  HBAR:{apy:6.5,proto:'Hedera Staking'},
  STRK:{apy:4.5,proto:'Starknet'},   XTZ:{apy:5.8,proto:'Tezos Baking'},
  TRX:{apy:4.8,proto:'TRON Energy'}, VET:{apy:3.2,proto:'VTHO Gen.'},
  EOS:{apy:4.5,proto:'Vaulta'},      FET:{apy:7,proto:'ASI Staking'},
  JITOSOL:{apy:7.2,proto:'Jito LS'}, JUPSOL:{apy:7,proto:'Jupiter LS'},
  INF:{apy:7.5,proto:'Sanctum Inf.'},SOIL:{apy:12,proto:'Soil Finance'},
  HONEY:{apy:8,proto:'Hivemapper'},  POL:{apy:5.5,proto:'Polygon Staking'},
  HNT:{apy:6.8,proto:'Helium Mining'},
};

export default function TokenPage() {
  const router = useRouter();
  const { asset: qa } = router.query;

  const [assets, setAssets]     = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [toast, setToast]       = useState<any>(null);
  const [tab, setTab]           = useState<'analysis'|'yield'|'details'>('analysis');
  const [search, setSearch]     = useState('');
  const [catF, setCatF]         = useState('all');
  const [sortBy, setSortBy]     = useState<'mktcap'|'apy'|'signal'|'change'>('mktcap');

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/inquisitiveAI/assets');
      if (r.ok) { const d = await r.json(); setAssets(d.assets || []); }
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); const t = setInterval(load, 60000); return () => clearInterval(t); }, [load]);

  useEffect(() => {
    if (qa && assets.length) {
      const f = assets.find(a => a.symbol === String(qa).toUpperCase());
      if (f) selectAsset(f);
    }
  }, [qa, assets]);

  const selectAsset = async (asset: any) => {
    setSelected(asset);
    setAnalysis(null);
    setTab('analysis');
    try {
      const r = await fetch(`/api/inquisitiveAI/analyze/${asset.symbol}`);
      if (r.ok) setAnalysis(await r.json());
    } catch {}
  };

  const executeTrade = async (action: string, sym: string) => {
    try {
      const res = await fetch('/api/inquisitiveAI/trade', {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ action, symbol: sym, amount: 1000 }),
      });
      const data = await res.json();
      setToast({ ...data, action, symbol: sym });
      setTimeout(() => setToast(null), 5000);
    } catch {}
  };

  const cats = ['all', ...Array.from(new Set(assets.map(a=>a.category))).sort()];

  const sorted = [...assets]
    .filter(a => (catF==='all'||a.category===catF) && (search===''||a.symbol.toLowerCase().includes(search.toLowerCase())||a.name.toLowerCase().includes(search.toLowerCase())))
    .sort((a,b) => {
      if (sortBy==='change') return (b.change24h||0)-(a.change24h||0);
      if (sortBy==='apy')    { const ga=STAKING_APYS[a.symbol]?.apy||0; const gb=STAKING_APYS[b.symbol]?.apy||0; return gb-ga; }
      if (sortBy==='signal') return (b.confidence||0)-(a.confidence||0);
      return (b.marketCap||0)-(a.marketCap||0);
    });

  // Stats
  const totalMCap = assets.reduce((s,a)=>s+(a.marketCap||0),0);
  const avgChange = assets.length ? assets.reduce((s,a)=>s+(a.change24h||0),0)/assets.length : 0;
  const stakeable = assets.filter(a=>a.stakeable).length;
  const lendable  = assets.filter(a=>a.lendable).length;
  const yieldable = assets.filter(a=>a.yieldable).length;
  const buys      = assets.filter(a=>a.signal==='BUY').length;

  const stk = selected && STAKING_APYS[selected.symbol];
  const lendApy = selected?.lendable ? ({USDC:4.8,ETH:1.8,BTC:0.25,SOL:6.8} as any)[selected.symbol] || 1.5 : null;

  return (
    <>
      <Head><title>Portfolio — 65 Backed Assets | INQUISITIVE</title></Head>
      <div style={{minHeight:'100vh',background:'#07071a',color:'#fff',fontFamily:'-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif'}}>
        <div className="mesh-bg" />

        {/* NAV */}
        <nav style={{position:'sticky',top:0,zIndex:50,background:'rgba(7,7,26,0.92)',backdropFilter:'blur(20px)',borderBottom:'1px solid rgba(255,255,255,0.05)',height:52,display:'flex',alignItems:'center',padding:'0 20px',gap:12}}>
          <button onClick={()=>router.push('/')} style={{display:'flex',flexDirection:'column',alignItems:'flex-start',background:'none',border:'none',cursor:'pointer',marginRight:16,padding:0}}>
            <div className="anim-name-pulse" style={{fontWeight:900,fontSize:16,letterSpacing:'-0.4px',color:'#fff',lineHeight:1}}>INQUISITIVE</div>
            <div style={{fontSize:8,color:'rgba(255,255,255,0.35)',letterSpacing:'2px',textTransform:'uppercase',marginTop:2}}>INQAI</div>
          </button>
          <div style={{display:'flex',gap:4,flex:1}}>
            {[{l:'Portfolio',p:'/analytics',accent:false},{l:'Token',p:'/token',accent:true},{l:'Docs',p:'/help',accent:false}].map(n=>(
              <button key={n.l} onClick={()=>router.push(n.p)} style={{padding:'5px 12px',borderRadius:7,background:n.accent?'linear-gradient(135deg,#7c3aed,#4f46e5)':'transparent',border:n.accent?'1px solid rgba(255,255,255,0.1)':'none',color:n.accent?'#fff':'rgba(255,255,255,0.45)',fontSize:12,fontWeight:n.accent?700:500,cursor:'pointer',boxShadow:n.accent?'0 2px 10px rgba(124,58,237,0.3)':'none'}}>{n.l}</button>
            ))}
          </div>
          <div style={{marginLeft:'auto',display:'flex',gap:8,alignItems:'center'}}>
            <span style={{fontSize:11,padding:'3px 10px',borderRadius:100,background:'rgba(16,185,129,0.08)',color:'#6ee7b7',border:'1px solid rgba(16,185,129,0.15)'}}>
              <span style={{width:5,height:5,borderRadius:'50%',background:'#10b981',display:'inline-block',marginRight:5}} className="anim-blink" />
              {assets.length} / 65 live
            </span>
            <WalletButton label="Connect" />
          </div>
        </nav>

        {/* HERO STATS */}
        <div style={{padding:'20px 20px 0',position:'relative',zIndex:1}}>
          <div style={{maxWidth:1400,margin:'0 auto'}}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:8,marginBottom:20}}>
              {[
                {label:'Total Assets',    val:`${assets.length}/65`,  col:'#a78bfa'},
                {label:'Total MCap',      val:fmtUsd(totalMCap),     col:'#60a5fa'},
                {label:'Avg 24h Change',  val:pct(avgChange),         col:grc(avgChange)},
                {label:'AI Buy Signals',  val:buys+' assets',         col:'#34d399'},
                {label:'Stakeable',       val:stakeable+' assets',    col:'#f59e0b'},
                {label:'Best APY',        val:'27% ENA',              col:'#10b981'},
              ].map(s=>(
                <div key={s.label} style={{background:'rgba(13,13,32,0.8)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:12,padding:'12px 16px',backdropFilter:'blur(12px)'}}>
                  <div style={{fontSize:16,fontWeight:800,color:s.col,fontFamily:'monospace'}}>{s.val}</div>
                  <div style={{fontSize:10,color:'rgba(255,255,255,0.35)',marginTop:3,textTransform:'uppercase',letterSpacing:'0.5px'}}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* MAIN LAYOUT */}
        <div style={{display:'flex',height:'calc(100vh - 140px)',position:'relative',zIndex:1}}>

          {/* LEFT — Asset List */}
          <div style={{width:320,flexShrink:0,borderRight:'1px solid rgba(255,255,255,0.05)',display:'flex',flexDirection:'column',background:'rgba(8,8,22,0.7)',height:'100%',overflow:'hidden'}}>
            {/* Filters */}
            <div style={{padding:'12px 14px',borderBottom:'1px solid rgba(255,255,255,0.05)',flexShrink:0}}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search 65 assets..."
                style={{width:'100%',padding:'8px 12px',borderRadius:9,background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.08)',color:'#fff',fontSize:12,outline:'none',boxSizing:'border-box',marginBottom:8}} />
              <div style={{display:'flex',gap:4,overflowX:'auto',marginBottom:6}}>
                {cats.slice(0,8).map(c=>(
                  <button key={c} onClick={()=>setCatF(c)} style={{padding:'4px 9px',borderRadius:6,background:catF===c?'rgba(124,58,237,0.25)':'rgba(255,255,255,0.04)',border:`1px solid ${catF===c?'rgba(124,58,237,0.4)':'transparent'}`,color:catF===c?'#a78bfa':'rgba(255,255,255,0.4)',fontSize:10,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap',transition:'all 0.15s',textTransform:'capitalize'}}>{c}</button>
                ))}
              </div>
              <div style={{display:'flex',gap:3}}>
                {(['mktcap','change','apy','signal'] as const).map(s=>(
                  <button key={s} onClick={()=>setSortBy(s)} style={{flex:1,padding:'4px',borderRadius:5,background:sortBy===s?'rgba(255,255,255,0.1)':'transparent',border:'none',color:sortBy===s?'#fff':'rgba(255,255,255,0.3)',fontSize:9,fontWeight:600,cursor:'pointer',textTransform:'capitalize'}}>{s==='mktcap'?'MCap':s==='change'?'24h%':s==='apy'?'APY':'Signal'}</button>
                ))}
              </div>
            </div>

            {/* Asset list */}
            <div style={{flex:1,overflowY:'auto'}}>
              {loading ? (
                <div style={{textAlign:'center',padding:40,color:'rgba(255,255,255,0.3)'}}>
                  <div className="animate-spin" style={{width:24,height:24,border:'2px solid #7c3aed',borderTopColor:'transparent',borderRadius:'50%',margin:'0 auto 12px'}} />
                  <div style={{fontSize:12}}>Loading live prices...</div>
                </div>
              ) : sorted.map(asset => {
                const ss = sigStyle(asset.signal||'HOLD');
                const sk = STAKING_APYS[asset.symbol];
                const isSelected = selected?.symbol === asset.symbol;
                return (
                  <div key={asset.symbol} onClick={()=>selectAsset(asset)}
                    style={{padding:'10px 14px',borderBottom:'1px solid rgba(255,255,255,0.03)',cursor:'pointer',transition:'all 0.15s',borderLeft:`3px solid ${isSelected?catCol(asset.category):'transparent'}`,background:isSelected?`rgba(${catCol(asset.category).slice(1).match(/.{2}/g)?.map(h=>parseInt(h,16)).join(',')||'124,58,237'},0.08)`:'transparent'}}
                    onMouseEnter={e=>{if(!isSelected){e.currentTarget.style.background='rgba(124,58,237,0.05)';e.currentTarget.style.borderLeftColor='rgba(124,58,237,0.3)';}}}
                    onMouseLeave={e=>{if(!isSelected){e.currentTarget.style.background='transparent';e.currentTarget.style.borderLeftColor='transparent';}}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:4}}>
                      <div style={{display:'flex',alignItems:'center',gap:8}}>
                        <div>
                          <span style={{fontWeight:800,fontSize:13}}>{asset.symbol}</span>
                          <span style={{marginLeft:6,fontSize:9,padding:'1px 5px',borderRadius:4,background:`${catCol(asset.category)}20`,color:catCol(asset.category)}}>{asset.category}</span>
                        </div>
                      </div>
                      <span style={{...ss,padding:'2px 7px',borderRadius:5,fontSize:9,fontWeight:700,border:`1px solid ${ss.br}`}}>{asset.signal||'—'}</span>
                    </div>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <div>
                        <div style={{fontFamily:'monospace',fontSize:12,fontWeight:700}}>${asset.priceUsd>=1?fmtP(asset.priceUsd,2):fmtP(asset.priceUsd,4)}</div>
                        <div style={{fontSize:9,color:'rgba(255,255,255,0.3)',marginTop:1}}>{fmtUsd(asset.marketCap||0)} MCap</div>
                      </div>
                      <div style={{textAlign:'right'}}>
                        <div style={{fontSize:11,fontWeight:600,color:grc(asset.change24h||0)}}>{pct(asset.change24h||0)}</div>
                        {sk && <div style={{fontSize:9,color:'#10b981',marginTop:1}}>{sk.apy}% APY</div>}
                      </div>
                    </div>
                  </div>
                );
              })}
              {sorted.length===0 && !loading && <div style={{textAlign:'center',padding:24,fontSize:12,color:'rgba(255,255,255,0.2)'}}>No assets match</div>}
            </div>
          </div>

          {/* RIGHT — Detail Panel */}
          <div style={{flex:1,overflowY:'auto',padding:'0'}}>
            {!selected ? (
              /* Portfolio Overview */
              <div style={{padding:24}}>
                <h2 style={{fontSize:24,fontWeight:800,marginBottom:4}}>INQAI Portfolio — 65 Assets</h2>
                <p style={{color:'rgba(255,255,255,0.4)',fontSize:13,marginBottom:24}}>Select any asset from the left panel for detailed analysis</p>

                {/* Category grid */}
                <h3 style={{fontSize:14,fontWeight:700,color:'rgba(255,255,255,0.6)',marginBottom:12,textTransform:'uppercase',letterSpacing:'0.5px'}}>Portfolio by Category</h3>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:10,marginBottom:28}}>
                  {Array.from(new Set(assets.map(a=>a.category))).sort().map(cat=>{
                    const catAssets = assets.filter(a=>a.category===cat);
                    const catMCap   = catAssets.reduce((s,a)=>s+(a.marketCap||0),0);
                    const catBuys   = catAssets.filter(a=>a.signal==='BUY').length;
                    return (
                      <div key={cat} onClick={()=>setCatF(cat)} style={{background:'rgba(13,13,32,0.8)',border:`1px solid ${catCol(cat)}22`,borderRadius:12,padding:'14px 16px',cursor:'pointer',transition:'all 0.2s',backdropFilter:'blur(12px)'}}
                        onMouseEnter={e=>{e.currentTarget.style.borderColor=catCol(cat)+'55';e.currentTarget.style.transform='translateY(-2px)';}}
                        onMouseLeave={e=>{e.currentTarget.style.borderColor=catCol(cat)+'22';e.currentTarget.style.transform='none';}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
                          <span style={{fontSize:12,fontWeight:700,textTransform:'capitalize',color:catCol(cat)}}>{cat}</span>
                          <span style={{fontSize:18,fontWeight:900,color:'#fff'}}>{catAssets.length}</span>
                        </div>
                        <div style={{fontSize:12,fontWeight:700,color:'rgba(255,255,255,0.7)'}}>{fmtUsd(catMCap)}</div>
                        <div style={{fontSize:10,color:'rgba(255,255,255,0.3)',marginTop:2}}>{catBuys} AI buys · {catAssets.map(a=>a.symbol).join(', ').slice(0,30)}...</div>
                      </div>
                    );
                  })}
                </div>

                {/* Top assets grid */}
                <h3 style={{fontSize:14,fontWeight:700,color:'rgba(255,255,255,0.6)',marginBottom:12,textTransform:'uppercase',letterSpacing:'0.5px'}}>All {assets.length} Assets</h3>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:8}}>
                  {assets.map(a=>{
                    const ss = sigStyle(a.signal||'HOLD');
                    return (
                      <div key={a.symbol} onClick={()=>selectAsset(a)} style={{background:'rgba(13,13,32,0.8)',border:'1px solid rgba(255,255,255,0.05)',borderRadius:12,padding:'12px 14px',cursor:'pointer',transition:'all 0.15s',backdropFilter:'blur(12px)'}}
                        onMouseEnter={e=>{e.currentTarget.style.borderColor='rgba(124,58,237,0.3)';e.currentTarget.style.transform='translateY(-1px)';}}
                        onMouseLeave={e=>{e.currentTarget.style.borderColor='rgba(255,255,255,0.05)';e.currentTarget.style.transform='none';}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:6}}>
                          <span style={{fontWeight:800,fontSize:14}}>{a.symbol}</span>
                          <span style={{...ss,fontSize:9,padding:'1px 5px',borderRadius:4,fontWeight:700,border:`1px solid ${ss.br}`}}>{a.signal||'—'}</span>
                        </div>
                        <div style={{fontFamily:'monospace',fontSize:12,fontWeight:700,marginBottom:3}}>
                          ${a.priceUsd>=1?fmtP(a.priceUsd,2):fmtP(a.priceUsd,4)}
                        </div>
                        <div style={{fontSize:11,color:grc(a.change24h||0),fontWeight:600}}>{pct(a.change24h||0)}</div>
                        <div style={{fontSize:9,color:'rgba(255,255,255,0.25)',marginTop:2}}>{fmtUsd(a.marketCap||0)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Asset Detail */
              <div>
                {/* Asset header */}
                <div style={{padding:'20px 24px 0',borderBottom:'1px solid rgba(255,255,255,0.05)',background:'rgba(8,8,22,0.5)',flexShrink:0,position:'sticky',top:0,zIndex:5,backdropFilter:'blur(20px)'}}>
                  <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:16}}>
                    <div style={{display:'flex',alignItems:'center',gap:16}}>
                      <div style={{width:52,height:52,borderRadius:'50%',background:`linear-gradient(135deg,${catCol(selected.category)}33,${catCol(selected.category)}11)`,border:`2px solid ${catCol(selected.category)}44`,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:14,color:catCol(selected.category)}}>
                        {selected.symbol.slice(0,2)}
                      </div>
                      <div>
                        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:3}}>
                          <h1 style={{fontSize:26,fontWeight:900,margin:0}}>{selected.symbol}</h1>
                          <span style={{fontSize:11,padding:'3px 10px',borderRadius:100,background:`${catCol(selected.category)}20`,color:catCol(selected.category),fontWeight:700,textTransform:'capitalize'}}>{selected.category}</span>
                          {selected.signal && (
                            <span style={{...sigStyle(selected.signal),fontSize:11,padding:'3px 10px',borderRadius:100,fontWeight:700,border:`1px solid ${sigStyle(selected.signal).br}`}}>{selected.signal}</span>
                          )}
                        </div>
                        <div style={{fontSize:13,color:'rgba(255,255,255,0.4)'}}>{selected.name}</div>
                      </div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontSize:28,fontWeight:900,fontFamily:'monospace'}}>
                        ${selected.priceUsd>=1?fmtP(selected.priceUsd,2):fmtP(selected.priceUsd,6)}
                      </div>
                      <div style={{fontSize:15,fontWeight:700,color:grc(selected.change24h||0)}}>{pct(selected.change24h||0)} 24h</div>
                    </div>
                  </div>
                  {/* Metrics strip */}
                  <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:10,marginBottom:14}}>
                    {[
                      {l:'Market Cap',v:fmtUsd(selected.marketCap||0)},
                      {l:'Volume 24h', v:fmtUsd(selected.volume24h||0)},
                      {l:'7d Change',  v:pct(selected.change7d||0), col:grc(selected.change7d||0)},
                      {l:'High 24h',   v:'$'+(selected.high24h>=1?fmtP(selected.high24h,2):fmtP(selected.high24h,4))},
                      {l:'Low 24h',    v:'$'+(selected.low24h>=1?fmtP(selected.low24h,2):fmtP(selected.low24h,4))},
                      {l:'Weight',     v:(selected.weight||0).toFixed(1)+'%'},
                    ].map(m=>(
                      <div key={m.l} style={{background:'rgba(255,255,255,0.04)',borderRadius:9,padding:'8px 10px',textAlign:'center'}}>
                        <div style={{fontSize:13,fontWeight:700,color:m.col||'#fff',fontFamily:'monospace'}}>{m.v}</div>
                        <div style={{fontSize:9,color:'rgba(255,255,255,0.3)',marginTop:2,textTransform:'uppercase',letterSpacing:'0.3px'}}>{m.l}</div>
                      </div>
                    ))}
                  </div>
                  {/* Capability badges */}
                  <div style={{display:'flex',gap:6,paddingBottom:14}}>
                    {selected.yieldable && <span style={{fontSize:10,padding:'3px 10px',borderRadius:100,background:'rgba(16,185,129,0.1)',color:'#34d399',border:'1px solid rgba(16,185,129,0.2)',fontWeight:600}}>Yield</span>}
                    {selected.stakeable && <span style={{fontSize:10,padding:'3px 10px',borderRadius:100,background:'rgba(59,130,246,0.1)',color:'#60a5fa',border:'1px solid rgba(59,130,246,0.2)',fontWeight:600}}>Stake</span>}
                    {selected.lendable  && <span style={{fontSize:10,padding:'3px 10px',borderRadius:100,background:'rgba(245,158,11,0.1)',color:'#fbbf24',border:'1px solid rgba(245,158,11,0.2)',fontWeight:600}}>Lend</span>}
                    {stk && <span style={{fontSize:10,padding:'3px 10px',borderRadius:100,background:'rgba(16,185,129,0.08)',color:'#10b981',border:'1px solid rgba(16,185,129,0.15)',fontWeight:600}}>{stk.apy}% Staking APY</span>}
                    {!selected.yieldable && !selected.stakeable && !selected.lendable && <span style={{fontSize:10,padding:'3px 10px',borderRadius:100,background:'rgba(107,114,128,0.1)',color:'#9ca3af',border:'1px solid rgba(107,114,128,0.2)',fontWeight:600}}>Hold / Trade Only</span>}
                  </div>
                  {/* Tab bar */}
                  <div style={{display:'flex',gap:0,marginTop:-4}}>
                    {(['analysis','yield','details'] as const).map(t=>(
                      <button key={t} onClick={()=>setTab(t)} style={{padding:'10px 20px',background:'transparent',border:'none',borderBottom:`2px solid ${tab===t?'#7c3aed':'transparent'}`,color:tab===t?'#a78bfa':'rgba(255,255,255,0.4)',fontSize:13,fontWeight:600,cursor:'pointer',textTransform:'capitalize',transition:'all 0.15s'}}>{t}</button>
                    ))}
                  </div>
                </div>

                {/* Tab content */}
                <div style={{padding:24}}>
                  {tab === 'analysis' && (
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                      {/* AI Score */}
                      <div style={{background:'rgba(13,13,32,0.8)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:16,padding:20,backdropFilter:'blur(12px)'}}>
                        <h3 style={{fontSize:13,fontWeight:700,marginBottom:16,color:'rgba(255,255,255,0.7)',textTransform:'uppercase',letterSpacing:'0.5px'}}>AI Research Scores</h3>
                        {analysis?.signal ? (
                          <>
                            {[
                              {name:'Pattern Engine',  col:'#3b82f6',val:analysis.signal.components?.patternEngine||0},
                              {name:'Reasoning Engine',col:'#10b981',val:analysis.signal.components?.reasoningEngine||0},
                              {name:'Portfolio Engine',col:'#ef4444',val:analysis.signal.components?.portfolioEngine||0},
                              {name:'Learning Engine', col:'#f97316',val:analysis.signal.components?.learningEngine||0},
                            ].map(m=>(
                              <div key={m.name} style={{marginBottom:14}}>
                                <div style={{display:'flex',justifyContent:'space-between',marginBottom:5}}>
                                  <span style={{fontSize:12,color:'rgba(255,255,255,0.55)',fontWeight:600}}>{m.name}</span>
                                  <span style={{fontSize:13,fontWeight:800,color:m.col,fontFamily:'monospace'}}>{(m.val*100).toFixed(1)}%</span>
                                </div>
                                <div style={{height:5,borderRadius:3,background:'rgba(255,255,255,0.06)',overflow:'hidden'}}>
                                  <div style={{height:'100%',width:`${m.val*100}%`,background:`linear-gradient(90deg,${m.col}70,${m.col})`,borderRadius:3,transition:'width 0.9s cubic-bezier(0.4,0,0.2,1)'}} />
                                </div>
                              </div>
                            ))}
                            <div style={{padding:'12px 14px',background:'rgba(124,58,237,0.08)',border:'1px solid rgba(124,58,237,0.18)',borderRadius:10,marginTop:4,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                              <div>
                                <div style={{fontSize:10,color:'rgba(255,255,255,0.4)',textTransform:'uppercase',letterSpacing:'0.5px'}}>Final Score</div>
                                <div style={{fontSize:22,fontWeight:900,color:'#a78bfa',fontFamily:'monospace'}}>{(analysis.signal.finalScore*100).toFixed(1)}%</div>
                              </div>
                              <div style={{...sigStyle(analysis.signal.action),padding:'6px 14px',borderRadius:8,fontWeight:800,fontSize:14,border:`1px solid ${sigStyle(analysis.signal.action).br}`}}>
                                {analysis.signal.action}
                              </div>
                            </div>
                          </>
                        ) : (
                          <div style={{textAlign:'center',padding:20,color:'rgba(255,255,255,0.3)'}}>
                            <div className="animate-spin" style={{width:20,height:20,border:'2px solid #7c3aed',borderTopColor:'transparent',borderRadius:'50%',margin:'0 auto 8px'}} />
                            Loading analysis...
                          </div>
                        )}
                      </div>

                      {/* Risk Gate */}
                      <div style={{background:'rgba(13,13,32,0.8)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:16,padding:20,backdropFilter:'blur(12px)'}}>
                        <h3 style={{fontSize:13,fontWeight:700,marginBottom:16,color:'rgba(255,255,255,0.7)',textTransform:'uppercase',letterSpacing:'0.5px'}}>Risk Gate</h3>
                        {analysis?.signal?.riskGate ? (
                          <>
                            <div style={{padding:'12px 14px',background:analysis.signal.riskGate.pass?'rgba(16,185,129,0.08)':'rgba(239,68,68,0.08)',border:`1px solid ${analysis.signal.riskGate.pass?'rgba(16,185,129,0.2)':'rgba(239,68,68,0.2)'}`,borderRadius:10,marginBottom:14,display:'flex',alignItems:'center',gap:10}}>
                              <span style={{fontSize:20,color:analysis.signal.riskGate.pass?'#34d399':'#f87171'}}>{analysis.signal.riskGate.pass?'✓':'✗'}</span>
                              <div>
                                <div style={{fontWeight:700,fontSize:13,color:analysis.signal.riskGate.pass?'#34d399':'#f87171'}}>
                                  {analysis.signal.riskGate.pass?'PASSED all risk gates':'BLOCKED by risk gate'}
                                </div>
                                <div style={{fontSize:10,color:'rgba(255,255,255,0.4)',marginTop:2}}>Risk-Reward: {(analysis.signal.riskGate.riskReward||0).toFixed(2)}:1 (min 2:1)</div>
                              </div>
                            </div>
                            <div style={{display:'flex',flexDirection:'column',gap:6}}>
                              {(analysis.signal.reasons||[]).slice(0,5).map((r:string,i:number)=>(
                                <div key={i} style={{display:'flex',gap:8,fontSize:11,color:'rgba(255,255,255,0.45)',lineHeight:1.5}}>
                                  <span style={{color:'#7c3aed',flexShrink:0,marginTop:1}}>→</span>
                                  <span>{r}</span>
                                </div>
                              ))}
                            </div>
                            {analysis.signal.riskGate.pass && (
                              <div style={{marginTop:14,padding:'10px 12px',background:'rgba(124,58,237,0.07)',border:'1px solid rgba(124,58,237,0.15)',borderRadius:8,fontSize:11,color:'rgba(255,255,255,0.5)',lineHeight:1.6}}>
                                <strong style={{color:'#a78bfa'}}>Entry plan:</strong> Stop @ {((analysis.signal.riskGate?.stopLoss||0)).toFixed?.(4)||'—'} · Target @ {(analysis.signal.riskGate?.target||0).toFixed?.(4)||'—'} · Max 2% portfolio risk
                              </div>
                            )}
                          </>
                        ) : <div style={{color:'rgba(255,255,255,0.3)',fontSize:12}}>Loading risk analysis...</div>}
                      </div>

                      {/* Macro Context */}
                      <div style={{background:'rgba(13,13,32,0.8)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:16,padding:20,backdropFilter:'blur(12px)'}}>
                        <h3 style={{fontSize:13,fontWeight:700,marginBottom:14,color:'rgba(255,255,255,0.7)',textTransform:'uppercase',letterSpacing:'0.5px'}}>Macro Context</h3>
                        {analysis?.macro ? (
                          <>
                            <div style={{display:'flex',gap:10,marginBottom:12}}>
                              <div style={{padding:'10px 14px',background:`rgba(${analysis.macro.regime==='BULL'?'16,185,129':analysis.macro.regime==='BEAR'?'239,68,68':'245,158,11'},0.08)`,border:`1px solid rgba(${analysis.macro.regime==='BULL'?'16,185,129':analysis.macro.regime==='BEAR'?'239,68,68':'245,158,11'},0.2)`,borderRadius:10,flex:1,textAlign:'center'}}>
                                <div style={{fontSize:11,color:'rgba(255,255,255,0.4)',marginBottom:4}}>Regime</div>
                                <div style={{fontSize:18,fontWeight:900,color:analysis.macro.regime==='BULL'?'#34d399':analysis.macro.regime==='BEAR'?'#f87171':'#fbbf24'}}>{analysis.macro.regime}</div>
                              </div>
                              <div style={{padding:'10px 14px',background:'rgba(124,58,237,0.08)',border:'1px solid rgba(124,58,237,0.15)',borderRadius:10,flex:1,textAlign:'center'}}>
                                <div style={{fontSize:11,color:'rgba(255,255,255,0.4)',marginBottom:4}}>Risk Score</div>
                                <div style={{fontSize:18,fontWeight:900,color:'#a78bfa',fontFamily:'monospace'}}>{((analysis.macro.riskScore||0.5)*100).toFixed(0)}%</div>
                              </div>
                            </div>
                            {(analysis.macro.signals||[]).slice(0,3).map((s:any,i:number)=>(
                              <div key={i} style={{padding:'7px 10px',marginBottom:4,background:'rgba(255,255,255,0.04)',borderRadius:8,fontSize:11,color:'rgba(255,255,255,0.5)'}}>
                                <strong style={{color:'#a78bfa'}}>{s.signal}:</strong> {s.desc}
                              </div>
                            ))}
                          </>
                        ) : <div style={{color:'rgba(255,255,255,0.3)',fontSize:12}}>Loading macro...</div>}
                      </div>

                      {/* Fear & Greed */}
                      {analysis?.fearGreed && (
                        <div style={{background:'rgba(13,13,32,0.8)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:16,padding:20,backdropFilter:'blur(12px)'}}>
                          <h3 style={{fontSize:13,fontWeight:700,marginBottom:14,color:'rgba(255,255,255,0.7)',textTransform:'uppercase',letterSpacing:'0.5px'}}>Fear & Greed</h3>
                          <div style={{textAlign:'center',padding:'10px 0'}}>
                            <div style={{fontSize:60,fontWeight:900,fontFamily:'monospace',color:analysis.fearGreed.value<25?'#ef4444':analysis.fearGreed.value<45?'#f97316':analysis.fearGreed.value<55?'#f59e0b':analysis.fearGreed.value<75?'#84cc16':'#10b981'}}>{analysis.fearGreed.value}</div>
                            <div style={{fontSize:16,fontWeight:700,color:'rgba(255,255,255,0.6)',marginTop:4}}>{analysis.fearGreed.valueClassification}</div>
                            <div style={{fontSize:11,color:'rgba(255,255,255,0.25)',marginTop:8}}>Source: Alternative.me REAL API</div>
                            {analysis.fearGreed.value < 25 && (
                              <div style={{marginTop:12,padding:'8px 12px',background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.15)',borderRadius:8,fontSize:11,color:'#6ee7b7'}}>
                                Extreme fear = potential contrarian accumulation zone
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}


                  {tab === 'yield' && (
                    <div>
                      <h3 style={{fontSize:16,fontWeight:700,marginBottom:16}}>Yield Opportunities for {selected.symbol}</h3>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:12}}>
                        {[
                          stk && {type:'STAKE',icon:'Lock',proto:stk.proto,apy:stk.apy,risk:'LOW',col:'#10b981',desc:`Earn ${stk.apy}% APY staking ${selected.symbol}. Receive liquid staking derivative.`},
                          lendApy && {type:'LEND',icon:'DollarSign',proto:'Aave V3 / Compound',apy:lendApy,risk:'LOW',col:'#f59e0b',desc:`Supply to lending pool at ${lendApy}% APY. Withdraw anytime.`},
                          selected.yieldable && {type:'YIELD',icon:'Wheat',proto:'Uniswap V3 LP',apy:12.0,risk:'MEDIUM',col:'#84cc16',desc:`Provide liquidity to earn swap fees + rewards. IL risk.`},
                          selected.lendable && {type:'LOOP',icon:'Infinity',proto:'Aave Recursive',apy:(stk?.apy||lendApy||4)*2.8,risk:'MEDIUM',col:'#8b5cf6',desc:`Recursive lend-borrow for amplified yield. Max 5 loops.`},
                          {type:'EARN',icon:'Gem',proto:'Best Auto-Select',apy:Math.max(stk?.apy||0,lendApy||0,selected.yieldable?12:0)||3,risk:'LOW',col:'#a78bfa',desc:'Auto-selects best risk-adjusted APY across all protocols.'},
                        ].filter(Boolean).map((y:any,i)=>(
                          <div key={i} style={{background:'rgba(13,13,32,0.8)',border:`1px solid ${y.col}22`,borderRadius:16,padding:18,backdropFilter:'blur(12px)'}}>
                            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                              {y.icon === 'Lock' && <Lock size={24} color={y.col} />}
                              {y.icon === 'DollarSign' && <DollarSign size={24} color={y.col} />}
                              {y.icon === 'Wheat' && <Wheat size={24} color={y.col} />}
                              {y.icon === 'Infinity' && <Infinity size={24} color={y.col} />}
                              {y.icon === 'Gem' && <Gem size={24} color={y.col} />}
                              <div>
                                <div style={{fontWeight:700,fontSize:14,color:y.col}}>{y.type}</div>
                                <div style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>{y.proto}</div>
                              </div>
                            </div>
                            <div style={{fontSize:28,fontWeight:900,color:y.col,fontFamily:'monospace',marginBottom:4}}>
                              {y.apy.toFixed(1)}<span style={{fontSize:14,fontWeight:600}}>% APY</span>
                            </div>
                            <div style={{fontSize:10,padding:'2px 8px',display:'inline-block',borderRadius:100,background:`${y.col}15`,color:y.col,border:`1px solid ${y.col}30`,fontWeight:600,marginBottom:8}}>Risk: {y.risk}</div>
                            <p style={{fontSize:11,color:'rgba(255,255,255,0.4)',lineHeight:1.6,marginBottom:14}}>{y.desc}</p>
                            <div style={{fontSize:11,color:'rgba(255,255,255,0.3)',marginBottom:12,padding:'8px 10px',background:'rgba(255,255,255,0.03)',borderRadius:8}}>
                              $10k → <strong style={{color:y.col}}>${(10000*(1+y.apy/100)).toFixed(0)}</strong>/yr · ${(10000*y.apy/100/365).toFixed(2)}/day
                            </div>
                            <button onClick={()=>executeTrade(y.type, selected.symbol)} style={{width:'100%',padding:'9px',borderRadius:9,background:`${y.col}18`,color:y.col,border:`1px solid ${y.col}35`,fontSize:12,fontWeight:700,cursor:'pointer',transition:'all 0.15s'}}
                              onMouseEnter={e=>e.currentTarget.style.background=`${y.col}30`}
                              onMouseLeave={e=>e.currentTarget.style.background=`${y.col}18`}>
                              Execute {y.type}
                            </button>
                          </div>
                        ))}
                        {!selected.yieldable && !selected.stakeable && !selected.lendable && (
                          <div style={{background:'rgba(13,13,32,0.8)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:16,padding:20,color:'rgba(255,255,255,0.4)',fontSize:13}}>
                            {selected.symbol} does not support yield strategies. Consider BUY for price exposure.
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {tab === 'details' && (
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                      <div style={{background:'rgba(13,13,32,0.8)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:16,padding:20,backdropFilter:'blur(12px)'}}>
                        <h3 style={{fontSize:13,fontWeight:700,marginBottom:14,color:'rgba(255,255,255,0.6)',textTransform:'uppercase',letterSpacing:'0.5px'}}>Asset Details</h3>
                        {[
                          ['Symbol', selected.symbol],
                          ['Name', selected.name],
                          ['Category', selected.category],
                          ['Price USD', '$' + (selected.priceUsd>=1?fmtP(selected.priceUsd,2):fmtP(selected.priceUsd,6))],
                          ['Market Cap', fmtUsd(selected.marketCap||0)],
                          ['Volume 24h', fmtUsd(selected.volume24h||0)],
                          ['24h Change', pct(selected.change24h||0)],
                          ['7d Change', pct(selected.change7d||0)],
                          ['High 24h', '$' + (selected.high24h>=1?fmtP(selected.high24h,2):fmtP(selected.high24h,4))],
                          ['Low 24h', '$' + (selected.low24h>=1?fmtP(selected.low24h,2):fmtP(selected.low24h,4))],
                          ['Portfolio Weight', (selected.weight||0).toFixed(1) + '%'],
                          ['Yieldable', selected.yieldable?'Yes':'No'],
                          ['Stakeable', selected.stakeable?'Yes':'No'],
                          ['Lendable', selected.lendable?'Yes':'No'],
                        ].map(([k,v])=>(
                          <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:12}}>
                            <span style={{color:'rgba(255,255,255,0.4)'}}>{k}</span>
                            <span style={{fontWeight:600,color:'#fff'}}>{v}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{background:'rgba(13,13,32,0.8)',border:'1px solid rgba(255,255,255,0.06)',borderRadius:16,padding:20,backdropFilter:'blur(12px)'}}>
                        <h3 style={{fontSize:13,fontWeight:700,marginBottom:14,color:'rgba(255,255,255,0.6)',textTransform:'uppercase',letterSpacing:'0.5px'}}>AI Signal Summary</h3>
                        {analysis?.signal ? (
                          <>
                            {[
                              ['Action', analysis.signal.action],
                              ['Final Score', (analysis.signal.finalScore*100).toFixed(1)+'%'],
                              ['Raw Score', (analysis.signal.rawScore*100).toFixed(1)+'%'],
                              ['Pattern', (analysis.signal.components?.patternEngine*100||0).toFixed(1)+'%'],
                              ['Reasoning', (analysis.signal.components?.reasoningEngine*100||0).toFixed(1)+'%'],
                              ['Portfolio', (analysis.signal.components?.portfolioEngine*100||0).toFixed(1)+'%'],
                              ['Learning', (analysis.signal.components?.learningEngine*100||0).toFixed(1)+'%'],
                              ['Risk Gate', analysis.signal.riskGate?.pass?'PASS':'BLOCK'],
                              ['Risk:Reward', (analysis.signal.riskGate?.riskReward||0).toFixed(2)+':1'],
                            ].map(([k,v])=>(
                              <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,0.04)',fontSize:12}}>
                                <span style={{color:'rgba(255,255,255,0.4)'}}>{k}</span>
                                <span style={{fontWeight:700,color:'#fff'}}>{v}</span>
                              </div>
                            ))}
                          </>
                        ) : <div style={{color:'rgba(255,255,255,0.3)',fontSize:12}}>Loading...</div>}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div style={{position:'fixed',bottom:24,right:24,zIndex:300,background:'#0d0d20',border:`1px solid ${toast.success?'rgba(16,185,129,0.3)':'rgba(239,68,68,0.3)'}`,borderRadius:14,padding:'16px 20px',maxWidth:340,boxShadow:'0 8px 40px rgba(0,0,0,0.5)',backdropFilter:'blur(16px)'}}>
            <div style={{display:'flex',gap:12,alignItems:'flex-start'}}>
              <span style={{fontSize:18,color:toast.success?'#34d399':'#f87171'}}>{toast.success?'✓':'✗'}</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:700,fontSize:13,color:toast.success?'#34d399':'#f87171',marginBottom:4}}>
                  {toast.success?`${toast.action} Executed`:'Failed'}
                </div>
                {toast.trade?.apy && <div style={{fontSize:11,color:'rgba(255,255,255,0.5)'}}>APY: {(toast.trade.apy*100).toFixed(1)}% via {toast.trade.protocol}</div>}
                {toast.reason && <div style={{fontSize:11,color:'#fca5a5'}}>{toast.reason}</div>}
              </div>
              <button onClick={()=>setToast(null)} style={{background:'none',border:'none',color:'rgba(255,255,255,0.4)',cursor:'pointer',fontSize:18}}>×</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
