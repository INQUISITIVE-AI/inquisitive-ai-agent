import { useState, useEffect, useCallback, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import dynamic from 'next/dynamic';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { waitForTransactionReceipt } from '@wagmi/core';
import { erc20Abi, parseUnits, isAddress } from 'viem';

import {
  Brain, DollarSign, Target, Flame, Bot, TrendingUp, TrendingDown,
  Scale, Wallet, Layers, Activity, BarChart3, Zap, Shield, AlertTriangle, Clock,
} from 'lucide-react';
import { INQAI_TOKEN, wagmiConfig } from '../src/config/wagmi';
import SiteNav from '../src/components/SiteNav';


const VAULT_ADDR = (process.env.NEXT_PUBLIC_VAULT_ADDRESS || '0xb99dc519c4373e5017222bbd46f42a4e12a0ec25') as `0x${string}`;
const VAULT_ABI = [
  { name:'performUpkeep',        type:'function', stateMutability:'nonpayable', inputs:[{name:'performData',type:'bytes'}], outputs:[] },
  { name:'getPortfolioLength',   type:'function', stateMutability:'view',      inputs:[],                             outputs:[{name:'',type:'uint256'}] },
  { name:'getETHBalance',        type:'function', stateMutability:'view',      inputs:[],                             outputs:[{name:'',type:'uint256'}] },
  { name:'automationEnabled',    type:'function', stateMutability:'view',      inputs:[],                             outputs:[{name:'',type:'bool'}] },
  { name:'cycleCount',           type:'function', stateMutability:'view',      inputs:[],                             outputs:[{name:'',type:'uint256'}] },
  { name:'owner',                type:'function', stateMutability:'view',      inputs:[],                             outputs:[{name:'',type:'address'}] },
] as const;

// PHASE1: 32 ETH-mainnet ERC-20s — per CMC watchlist
const PHASE1_TOKENS:  `0x${string}`[] = ['0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599','0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84','0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48','0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9','0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984','0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32','0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1','0x45804880De22913dAFE09f4980848ECE6EcbAf78','0xe28b3B32B6c345A34Ff64674606124Dd5Aceca30','0x57e114B691Db790C35207b2e685D4A43181e6061','0x455e53CBB86018Ac2B8092FdCd39d8444aFFC3F6','0xaea46A60368A7bD060eec7DF8CBa43b7EF41Ad85','0x6De037ef9aD2725EB40118Bb1702EBb27e4Aeb24','0x514910771AF9Ca656af840dff83E8264EcF986CA','0xfAbA6f8e4a5E8Ab82F62fe7C39859FA577269BE3','0xc944E90C64B2c07662A292be6244BDf05Cda44a7','0x56072C95FAA701256059aa122697B133aDEd9279','0xCa14007Eff0dB1f8135f4C25B34De49AB0d42766','0x4a220E6096B25EADb88358cb44068A3248254675','0x6985884C4392D348587B19cb9eAAf157F13271cd','0x3506424F91fD33084466F402d5D97f05F8e3b4AF','0x4E15361FD6b4BB609Fa63C81A2be19d873717870','0xdBe2C93A4e82a177617F4a43Ee1A69c69Ee8e7E6','0x70e8dE73cE538DA2bEEd35d14187F6959a8ecA96','0x420412E765BFa6d85aaaC94b4f7b708C89be2e2B','0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB','0x77E06c9eCCf2E797fd462A92B6D7642EF85b0A44','0x85F17Cf997934a597031b2E18a9aB6ebD4B9f6a4','0x8D983cb9388EaC77af0474fA441C4815500Cb7BB','0xa2cd3d43c775978a96bdbf12d733d5a1ed94fb18','0x54991328Ab43c7D5d31C19d1B9fa048E77B5cd16','0x17CDB2a01e7a34CbB3DD4b83260B05d0274C8dab'];
const PHASE1_WEIGHTS: bigint[] = [3419n,2244n,585n,390n,390n,292n,292n,292n,195n,195n,195n,195n,195n,195n,195n,97n,97n,97n,48n,48n,48n,19n,19n,19n,19n,19n,48n,48n,48n,19n,19n,19n];
const PHASE1_FEES:    number[]  = [3000,100,500,3000,3000,3000,3000,3000,3000,3000,3000,3000,3000,3000,3000,3000,3000,3000,3000,3000,3000,3000,3000,3000,3000,3000,3000,3000,3000,3000,3000,3000];

const PortfolioChart = dynamic(() => import('../src/components/charts/LiveCharts').then(m => m.PortfolioChart), { ssr: false });
const CategoryDonut  = dynamic(() => import('../src/components/charts/LiveCharts').then(m => m.CategoryDonut),  { ssr: false });
const ConfidenceRing = dynamic(() => import('../src/components/charts/LiveCharts').then(m => m.ConfidenceRing), { ssr: false });

// ── Formatters ───────────────────────────────────────────────────────────────
const fmtUsd = (n: number) => {
  if (n === null || n === undefined || isNaN(n) || n === 0) return '—';
  if (n >= 1e9)  return '$' + (n/1e9).toFixed(2)  + 'B';
  if (n >= 1e6)  return '$' + (n/1e6).toFixed(2)  + 'M';
  if (n >= 1e3)  return '$' + (n/1e3).toFixed(1)  + 'K';
  return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const fmtPrice = (n: number) => {
  if (!n || isNaN(n)) return '—';
  if (n >= 1000) return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (n >= 1)    return '$' + n.toFixed(4);
  if (n >= 0.01) return '$' + n.toFixed(6);
  return '$' + n.toPrecision(4);
};
const fmtN = (n: number, d = 2) => n?.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) ?? '—';
const pct  = (n: number) => `${n >= 0 ? '+' : ''}${(n * 100).toFixed(2)}%`;
const grc  = (n: number) => n >= 0 ? '#10b981' : '#ef4444';


const ACTION_COL: Record<string, string> = {
  BUY: '#10b981', SELL: '#ef4444', REDUCE: '#f87171',
  STAKE: '#38bdf8', LEND: '#fbbf24', YIELD: '#a3e635',
  BORROW: '#22d3ee', SWAP: '#60a5fa', EARN: '#93c5fd',
  LOOP: '#fb923c', MULTIPLY: '#f472b6', REWARDS: '#facc15',
  HOLD: '#6b7280', SKIP: '#4b5563',
};

export default function AnalyticsPage() {
  const router = useRouter();
  const { address } = useAccount();
  const [nav,       setNav]      = useState<any>(null);
  const [equity,    setEquity]   = useState<any[]>([]);
  const [cats,      setCats]     = useState<any[]>([]);
  const [queue,     setQueue]    = useState<any>(null);
  const [monitor,   setMonitor]  = useState<any>(null);
  const [sysStatus, setSysStatus]= useState<any>(null);
  const [loading,   setLoading]  = useState(true);
  const [refreshing,setRefreshing]= useState(false);
  const [tab,       setTab]      = useState<'portfolio'|'fees'>('portfolio');
  const [purchases, setPurchases]= useState<any[]>([]);
  const [vesting,   setVesting]  = useState<any>(null);
  const [sendOpen,  setSendOpen] = useState(false);
  const [sendTo,    setSendTo]   = useState('');
  const [sendAmt,   setSendAmt]  = useState('');
  const [sendError, setSendError]= useState<string | null>(null);

  const { writeContractAsync: writeSendAsync, isPending: isSending } = useWriteContract();
  const { writeContractAsync: writeAdminAsync } = useWriteContract();
  const [sendHash, setSendHash] = useState<`0x${string}` | undefined>();
  const { isSuccess: sendConfirmed } = useWaitForTransactionReceipt({ hash: sendHash });
  const [triggerHash, setTriggerHash] = useState<`0x${string}` | undefined>();
  const { isSuccess: triggerConfirmed } = useWaitForTransactionReceipt({ hash: triggerHash });
  const [triggering, setTriggering] = useState(false);

  // ── Vault on-chain state (live reads, no private key) ─────────────────────
  const { data: vaultPortfolioLen } = useReadContract({
    address: VAULT_ADDR, abi: VAULT_ABI, functionName: 'getPortfolioLength',
    chainId: 1, query: { refetchInterval: 30000 },
  });
  const { data: vaultEthBal } = useReadContract({
    address: VAULT_ADDR, abi: VAULT_ABI, functionName: 'getETHBalance',
    chainId: 1, query: { refetchInterval: 30000 },
  });
  const { data: automationEnabledData } = useReadContract({
    address: VAULT_ADDR, abi: VAULT_ABI, functionName: 'automationEnabled',
    chainId: 1, query: { refetchInterval: 30000 },
  });
  const { data: vaultCycleCount } = useReadContract({
    address: VAULT_ADDR, abi: VAULT_ABI, functionName: 'cycleCount',
    chainId: 1, query: { refetchInterval: 30000 },
  });
  const { data: vaultOwnerAddr } = useReadContract({
    address: VAULT_ADDR, abi: VAULT_ABI, functionName: 'owner',
    chainId: 1, query: { refetchInterval: 60000 },
  });
  const vaultEthOnChain = vaultEthBal ? Number(vaultEthBal) / 1e18 : 0;
  const isVaultOwner = !!(address && vaultOwnerAddr && address.toLowerCase() === (vaultOwnerAddr as string).toLowerCase());
  const portfolioOnChain= vaultPortfolioLen ? Number(vaultPortfolioLen) : 0;
  const automationOn    = automationEnabledData === true;
  const cyclesOnChain   = vaultCycleCount ? Number(vaultCycleCount) : 0;

  
  const activeVault = VAULT_ADDR;

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

  const load = useCallback(async (bust = false) => {
    const t = bust ? `?_t=${Date.now()}` : `?_t=${Math.floor(Date.now() / 60000) * 60000}`;
    if (bust) setRefreshing(true);

    const safe = async (url: string) => {
      try { const r = await fetch(url); return r.ok ? r.json() : null; } catch { return null; }
    };

    // Fire all fetches simultaneously — update each state slice the moment its response arrives.
    // Do NOT await all before updating; NAV/positions must not wait for slow Etherscan calls.
    const navP     = safe(`/api/inquisitiveAI/portfolio/nav${t}`)
                       .then(d => { if (d) setNav(d); });
    const chartP   = safe(`/api/inquisitiveAI/chart/portfolio${t}`)
                       .then(d => { if (d?.curve) setEquity(d.curve); });
    const catP     = safe(`/api/inquisitiveAI/chart/categories${t}`)
                       .then(d => { if (d?.categories) setCats(d.categories); });
    const queueP   = safe(`/api/inquisitiveAI/execute/queue${t}`)
                       .then(d => { if (d) setQueue(d); });
    const monitorP = safe(`/api/inquisitiveAI/execute/monitor${t}`)
                       .then(d => { if (d) setMonitor(d); });
    const statusP  = safe(`/api/inquisitiveAI/execute/status${t}`)
                       .then(d => { if (d) setSysStatus(d); });
    const vestingP = safe(`/api/inquisitiveAI/token/vesting${t}`)
                       .then(d => { if (d) setVesting(d); });

    // setLoading(false) as soon as NAV arrives — the most critical data
    navP.then(() => setLoading(false));

    // setRefreshing(false) once all complete
    Promise.allSettled([navP, chartP, catP, queueP, monitorP, statusP, vestingP])
      .then(() => setRefreshing(false));
  }, []);
  useEffect(() => { load(); const t = setInterval(() => load(), 60000); return () => clearInterval(t); }, [load]);

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
  const totalEthUSD   = (treasury.vaultEth ?? 0) * (treasury.ethPrice ?? 3200);
  const vaultAddress  = treasury.vaultAddress  || VAULT_ADDR;
  const isOnChainNAV  = navSource === 'on-chain-aum';
  // Tokens committed estimate: circulating supply from on-chain (post-airdrop) OR vault AUM ÷ presale price (pre-airdrop)
  const tokensCommitted = circulatingSupply > 0
    ? circulatingSupply
    : aumUSD > 0 ? Math.floor(aumUSD / INQAI_TOKEN.presalePrice) : 0;

  const localHolding     = purchases.reduce((s, p) => s + (p.amount    || 0), 0);
  const totalUsdInvested = purchases.reduce((s, p) => s + (p.usdAmount || 0), 0);
  // Show actual on-chain balance for all wallets including vault owner (team allocation)
  const totalInqai       = localHolding > 0 ? localHolding : onChainBalance;
  const effInvested      = totalUsdInvested > 0 ? totalUsdInvested : 0; // only real purchases — no synthetic cost basis
  const currentValue     = totalInqai * navPerToken;
  const totalPnL         = currentValue - effInvested;
  const roiPct           = effInvested > 0 ? totalPnL / effInvested : 0;
  const hasHoldings      = effInvested > 0 || onChainBalance > 0;
  const holdingSource    = onChainBalance > 0 ? 'on-chain' : purchases.length > 0 ? 'presale' : isOnChainNAV ? 'on-chain-nav' : 'live NAV';

  const backingAssets = useMemo(() => positions.slice(0, 12).map(p => ({
    ...p,
    myUsd:    effInvested > 0 ? effInvested * (p.allocPct / 100) : p.baseAllocUsd,
    myPnl24h: effInvested > 0 ? effInvested * (p.allocPct / 100) * p.change24h : p.pnl24h,
  })), [positions, effInvested]);


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

  const chartData   = equity.length ? equity : userEquity;
  const handleSend = async () => {
    setSendError(null);
    if (!isAddress(sendTo)) { setSendError('Invalid recipient address.'); return; }
    const amt = parseFloat(sendAmt);
    if (!amt || amt <= 0) { setSendError('Enter a valid amount.'); return; }
    const spendable = onChainBalance > 0 ? onChainBalance : totalInqai;
    if (onChainBalance === 0 && totalInqai > 0) {
      setSendError('Your INQAI tokens are pending airdrop delivery. Once they arrive on-chain you can send them.'); return;
    }
    if (onChainBalance === 0) { setSendError('No on-chain INQAI balance found.'); return; }
    if (amt > spendable) { setSendError(`Amount exceeds your balance of ${fmtN(spendable, 4)} INQAI.`); return; }
    try {
      const hash = await writeSendAsync({
        address:      INQAI_TOKEN.address,
        abi:          erc20Abi,
        functionName: 'transfer',
        args:         [sendTo as `0x${string}`, parseUnits(sendAmt, 18)],
        chainId:      1,
      });
      setSendHash(hash);
    } catch (e: any) {
      const msg: string = e.shortMessage || e.message || '';
      if (msg.toLowerCase().includes('rejected') || e.code === 4001) {
        setSendError('Transaction rejected.');
      } else {
        setSendError(msg || 'Transfer failed. Please try again.');
      }
    }
  };

  const ACTIVE_SIGS = ['BUY','STAKE','LEND','YIELD','BORROW','LOOP','MULTIPLY','EARN','REWARDS','SWAP'];
  const topSignals  = positions.filter(p => ACTIVE_SIGS.includes(p.action)).slice(0, 8);
  const dispValue   = hasHoldings ? currentValue : navPerToken;

  // Manual trigger for first trade - owner only
  const triggerUpkeep = async () => {
    if (!isVaultOwner) return;
    setTriggering(true);
    try {
      const h = await writeAdminAsync({
        address: VAULT_ADDR, abi: VAULT_ABI, functionName: 'performUpkeep',
        args: ['0x'], chainId: 1,
      });
      setTriggerHash(h);
    } catch (e: any) {
      console.error('Trigger failed:', e);
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div>
      <Head>
        <title>Analytics | INQUISITIVE</title>
        <meta name="description" content="INQAI AI-managed portfolio — live NAV, 66-asset backing, real-time AI signals." />
      </Head>
      <div style={{ minHeight:'100vh', background:'#0a0a0b', color:'#fff' }}>
        <div className="mesh-bg" />

        {/* NAV */}
        <SiteNav right={<>
          <div style={{ display:'flex', gap:14, alignItems:'center' }}>
            <div style={{ textAlign:'right' }}><div style={{ fontSize:10, color:'rgba(255,255,255,0.3)' }}>INQAI NAV</div><div style={{ fontSize:13, fontWeight:800, color:'#93c5fd', fontFamily:'monospace' }}>${navPerToken.toFixed(4)}</div></div>
            <div style={{ textAlign:'right' }}><div style={{ fontSize:10, color:'rgba(255,255,255,0.3)' }}>7D</div><div style={{ fontSize:13, fontWeight:700, color:grc(return7d), fontFamily:'monospace' }}>{pct(return7d)}</div></div>
            <div style={{ width:1, height:28, background:'rgba(255,255,255,0.08)', flexShrink:0 }} />
          </div>
          <button onClick={() => load(true)} disabled={refreshing} title="Force refresh" style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:8, fontSize:11, fontWeight:600, cursor: refreshing ? 'wait' : 'pointer', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color: refreshing ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.45)', transition:'all 0.2s' }}>
            <span style={{ display:'inline-block', animation: refreshing ? 'spin 0.8s linear infinite' : 'none', fontSize:13 }}>⟳</span>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        </>} />
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

        <div style={{ padding:'24px 24px 80px', position:'relative', zIndex:1 }}>
          <div style={{ maxWidth:1320, margin:'0 auto' }}>

            {/* Header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
              <div>
                <div style={{ fontSize:20, fontWeight:900, color:'#fff', marginBottom:4 }}>Portfolio Analytics</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,0.35)' }}>{address?address.slice(0,8)+'…'+address.slice(-6)+' · ':''}AI managing 66 assets · 8-second cycles · {navSource}</div>
              </div>
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                <div style={{ width:8, height:8, borderRadius:9, background:'#10b981', boxShadow:'0 0 8px #10b981' }} />
                <span style={{ fontSize:12, color:'#10b981', fontWeight:700 }}>LIVE · {!nav ? 'Connecting…' : cyclesOnChain > 0 ? `Cycle #${cyclesOnChain.toLocaleString()}` : '66 assets · live'}</span>
                {isOnChainNAV && (
                  <span style={{ fontSize:10, padding:'2px 8px', borderRadius:100, background:'rgba(16,185,129,0.12)', color:'#34d399', border:'1px solid rgba(16,185,129,0.25)', fontWeight:700 }}>
                    ON-CHAIN NAV · {fmtUsd(aumUSD)} AUM
                  </span>
                )}
              </div>
            </div>

            {/* KPI Row — always shows real vault metrics, not deployer token holdings */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:24 }}>
              {([
                { label:'Vault AUM',   val: aumUSD > 0 ? fmtUsd(aumUSD) : (treasury.vaultEth??0) > 0 ? (treasury.vaultEth??0).toFixed(4)+' ETH' : '—', sub: aumUSD > 0 ? `${(treasury.vaultEth??0).toFixed(4)} ETH · ${isOnChainNAV?'on-chain':'basket-weighted'}` : 'Awaiting deposit', col:'#60a5fa', icon:'dollar' },
                { label:'7D Return',   val:pct(return7d),    sub:'66-asset weighted basket',                     col:grc(return7d),  icon:'target' },
                { label:'24H Return',  val:pct(return24h),   sub:`${(winRate*100).toFixed(0)}% assets up today`, col:grc(return24h), icon:'trend'  },
                { label:'Portfolio Index', val: nav?.token?.portfolioIndex ? nav.token.portfolioIndex.toFixed(2) : '—', sub:'Base 100 · 7-day basket performance', col: nav?.token?.portfolioIndex ? (nav.token.portfolioIndex >= 100 ? '#10b981' : '#ef4444') : '#6b7280', icon:'flame' },
                { label:'AI Regime',   val:regime,            sub:`Risk ${(riskScore*100).toFixed(0)}% · F&G ${fg}`,col:regimeCol,   icon:'bot'    },
              ] as any[]).map(m => (
                <div key={m.label} style={{ background:'rgba(17,17,19,0.85)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:16, padding:'16px 14px', backdropFilter:'blur(12px)', textAlign:'center' }}>
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
              {['portfolio','fees'].map(t => (
                <button key={t} onClick={() => setTab(t as any)} style={{ padding:'10px 18px', fontSize:13, fontWeight:tab===t?700:500, cursor:'pointer', background:'none', border:'none', borderBottom:`2px solid ${tab===t?'#3b82f6':'transparent'}`, color:tab===t?'#93c5fd':'rgba(255,255,255,0.4)', transition:'all 0.15s' }}>
                  {t==='portfolio'?'Portfolio':'Fee Flow'}
                </button>
              ))}
            </div>

            {/* ── PORTFOLIO TAB ── */}
            {tab === 'portfolio' && (
              <div style={{ display:'grid', gridTemplateColumns:'2fr 1.1fr', gap:20 }}>
                <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

                  {/* Equity chart */}
                  <div style={{ background:'rgba(17,17,19,0.85)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:20, padding:'22px', backdropFilter:'blur(12px)' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                      <div>
                        <h3 style={{ fontSize:14, fontWeight:700, color:'rgba(255,255,255,0.8)', margin:0 }}>Portfolio Performance</h3>
                        <div style={{ fontSize:11, color:'rgba(255,255,255,0.3)', marginTop:2 }}>{hasHoldings?`Your value · ${fmtUsd(currentValue)}`:'66-asset weighted index · base $100'}</div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontSize:16, fontWeight:900, fontFamily:'monospace', color:grc(return7d) }}>{pct(return7d)}</div>
                        <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)' }}>7D return</div>
                      </div>
                    </div>
                    <PortfolioChart data={chartData} height={200} />
                    <div style={{ display:'flex', justifyContent:'space-between', marginTop:10, fontSize:11, color:'rgba(255,255,255,0.3)' }}>
                      <span>24H: <span style={{ color:grc(return24h), fontWeight:700 }}>{pct(return24h)}</span></span>
                      <span>NAV: <span style={{ color:'#93c5fd', fontWeight:700 }}>${navPerToken.toFixed(4)}</span></span>
                      <span>Target: <span style={{ color:'#10b981', fontWeight:700 }}>${INQAI_TOKEN.targetPrice}</span></span>
                    </div>
                  </div>

                  {/* Holdings */}
                  <div style={{ background:'rgba(17,17,19,0.85)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:20, padding:'22px', backdropFilter:'blur(12px)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                      <Wallet size={16} color="#93c5fd" />
                      <h3 style={{ fontSize:14, fontWeight:700, color:'rgba(255,255,255,0.8)', margin:0 }}>Your INQAI Holdings</h3>
                      {onChainBalance > 0 && localHolding > 0 && onChainBalance <= localHolding * 2 + 5 && <span style={{ fontSize:9, padding:'2px 7px', borderRadius:100, background:'rgba(16,185,129,0.15)', color:'#34d399', border:'1px solid rgba(16,185,129,0.25)' }}>ON-CHAIN</span>}
                      {purchases.length > 0 && onChainBalance === 0 && <span style={{ fontSize:9, padding:'2px 7px', borderRadius:100, background:'rgba(59,130,246,0.15)', color:'#93c5fd', border:'1px solid rgba(59,130,246,0.25)' }}>PRESALE</span>}
                    </div>
                    {!hasHoldings ? (
                      <div style={{ textAlign:'center', padding:'20px 0' }}>
                        <div style={{ fontSize:13, color:'rgba(255,255,255,0.35)', marginBottom:12 }}>{address?'No INQAI holdings detected — connect to a wallet that holds INQAI, or buy below.':'Connect wallet to view your holdings.'}</div>
                        <div style={{ textAlign:'center', marginTop:16 }}>
                          <button onClick={() => router.push('/buy')} style={{ padding:'10px 20px', borderRadius:10, background:'#3b82f6', color:'#fff', border:'none', cursor:'pointer', fontSize:13, fontWeight:700 }}>Acquire INQAI</button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:12 }}>
                          {[
                            { l:'Token Balance',   v:fmtN(totalInqai,4)+' INQAI', c:'#93c5fd' },
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
                            { l:'7D Portfolio',  v:pct(return7d),              sub:'66-asset AI basket' },
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
                            <span style={{ color:'#93c5fd', fontWeight:600 }}>{p.amount?.toLocaleString()} INQAI</span>
                            <span style={{ color:'rgba(255,255,255,0.4)' }}>for {fmtUsd(p.usdAmount)}</span>
                            <span style={{ color:'rgba(255,255,255,0.25)', fontSize:10 }}>{new Date(p.timestamp).toLocaleDateString()}</span>
                          </div>
                        ))}
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:14 }}>
                          <button
                            onClick={() => { setSendOpen(true); setSendError(null); setSendTo(''); setSendAmt(''); setSendHash(undefined); }}
                            style={{ padding:'10px', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', background:'rgba(59,130,246,0.12)', border:'1px solid rgba(59,130,246,0.35)', color:'#93c5fd', transition:'all 0.2s' }}
                          >Send INQAI →</button>
                          <button
                            onClick={() => router.push('/buy')}
                            style={{ padding:'10px', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', background:'#3b82f6', border:'1px solid rgba(255,255,255,0.1)', color:'#fff' }}
                          >Acquire More</button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* On-chain treasury card */}
                  <div style={{ background:'rgba(17,17,19,0.85)', border:`1px solid ${isOnChainNAV?'rgba(16,185,129,0.25)':'rgba(255,255,255,0.06)'}`, borderRadius:20, padding:'22px', backdropFilter:'blur(12px)' }}>
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
                        { l:'ETH in Vault',       v: (treasury.vaultEth??0).toFixed(4)+' ETH',   c:'#60a5fa' },
                        { l:'Tokens Sold',        v: tokensCommitted > 0 ? fmtN(tokensCommitted,0)+' INQAI' : 'Pending', c:'#93c5fd' },
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
                  </div>

                  
                  {/* Portfolio backing */}
                  <div style={{ background:'rgba(17,17,19,0.85)', border:'1px solid rgba(59,130,246,0.18)', borderRadius:20, padding:'22px', backdropFilter:'blur(12px)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                      <Layers size={16} color="#93c5fd" />
                      <h3 style={{ fontSize:14, fontWeight:700, color:'rgba(255,255,255,0.8)', margin:0 }}>Your Portfolio Backing</h3>
                      <div style={{ marginLeft:'auto', fontSize:10, color:'rgba(255,255,255,0.3)', fontFamily:'monospace' }}>{effInvested>0?fmtUsd(effInvested)+' → 66 assets':'$'+INQAI_TOKEN.presalePrice+'/token → 66 assets'}</div>
                    </div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,0.28)', marginBottom:12, lineHeight:1.6 }}>
                      The AI deploys {effInvested>0?'your investment':'each $'+INQAI_TOKEN.presalePrice+' INQAI token'} across 66 assets. Bar width = relative weight, colour = live AI signal.
                    </div>
                    <div style={{ display:'grid', gridTemplateColumns:'54px 1fr 70px 58px 62px', gap:6, marginBottom:6, fontSize:9, color:'rgba(255,255,255,0.3)', padding:'0 2px' }}>
                      <span>Asset</span><span>Allocation</span><span style={{textAlign:'right'}}>My USD</span><span style={{textAlign:'right'}}>24H</span><span style={{textAlign:'right'}}>Signal</span>
                    </div>
                    {backingAssets.map((a:any) => (
                      <div key={a.symbol} style={{ display:'grid', gridTemplateColumns:'54px 1fr 70px 58px 62px', gap:6, alignItems:'center', marginBottom:5 }}>
                        <span style={{ fontWeight:800, fontSize:11, color:'#fff' }}>{a.symbol}</span>
                        <div style={{ position:'relative', height:5, background:'rgba(255,255,255,0.06)', borderRadius:3, overflow:'hidden' }}>
                          <div style={{ position:'absolute', left:0, top:0, height:'100%', borderRadius:3, width:`${Math.min((a.weight/(backingAssets[0]?.weight||1))*100,100)}%`, background:ACTION_COL[a.action]||'#3b82f6' }} />
                        </div>
                        <div style={{ fontSize:11, fontWeight:700, color:'#10b981', fontFamily:'monospace', textAlign:'right' }}>{fmtUsd(a.myUsd)}</div>
                        <div style={{ fontSize:10, fontFamily:'monospace', textAlign:'right', color:grc(a.change24h) }}>{pct(a.change24h)}</div>
                        <div style={{ fontSize:9, padding:'1px 5px', borderRadius:100, textAlign:'center', background:`${ACTION_COL[a.action]||'#3b82f6'}20`, color:ACTION_COL[a.action]||'#3b82f6', border:`1px solid ${ACTION_COL[a.action]||'#3b82f6'}40`, fontWeight:700 }}>{a.action}</div>
                      </div>
                    ))}
                    <div style={{ marginTop:10, padding:'7px 10px', background:'rgba(59,130,246,0.07)', border:'1px solid rgba(59,130,246,0.18)', borderRadius:8, fontSize:10, color:'rgba(255,255,255,0.35)', lineHeight:1.7 }}>
                      AI re-evaluates all 66 assets every 8 seconds. Showing top 12 by weight.
                    </div>
                  </div>
                </div>

                <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                  <div style={{ background:'rgba(17,17,19,0.85)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:20, padding:'22px', backdropFilter:'blur(12px)' }}>
                    <h3 style={{ fontSize:14, fontWeight:700, color:'rgba(255,255,255,0.8)', marginBottom:14 }}>Allocation by Category</h3>
                    <CategoryDonut data={cats} size={180} />
                  </div>
                  <div style={{ background:'rgba(17,17,19,0.85)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:20, padding:'22px', backdropFilter:'blur(12px)' }}>
                    <h3 style={{ fontSize:14, fontWeight:700, color:'rgba(255,255,255,0.8)', marginBottom:14 }}>Live Metrics</h3>
                    {[
                      { l:'INQAI NAV',      v:'$'+navPerToken.toFixed(4) },
                      { l:'7D Return',      v:pct(return7d),              c:grc(return7d) },
                      { l:'24H Return',     v:pct(return24h),             c:grc(return24h) },
                      { l:'Win Rate',       v:(winRate*100).toFixed(1)+'%' },
                      { l:'Active Signals', v:String(buys),               c:'#10b981' },
                      { l:'Reduce/Exit',    v:String(sells),              c:'#ef4444' },
                      { l:'Active Assets',  v:String(nav?.portfolio?.assetCount??'—') },
                      { l:'Vault Cycles',   v:(cyclesOnChain||0).toLocaleString() },
                    ].map((r:any) => (
                      <div key={r.l} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ fontSize:12, color:'rgba(255,255,255,0.4)' }}>{r.l}</span>
                        <span style={{ fontSize:13, fontWeight:700, fontFamily:'monospace', color:r.c||'#fff' }}>{r.v}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ background:'rgba(17,17,19,0.85)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:20, padding:'22px', backdropFilter:'blur(12px)' }}>
                    <h3 style={{ fontSize:14, fontWeight:700, color:'rgba(255,255,255,0.8)', marginBottom:14 }}>AI Strategy</h3>
                    {(cats.length > 0
                      ? cats.slice(0,6).map((cat:any,i:number) => ({
                          l: ({major:'Core BTC·ETH·SOL',defi:'DeFi & Protocols',stablecoin:'Stablecoins & RWA',l2:'L2 & Interop','liquid-stake':'Liquid Staking',ai:'AI Tokens',rwa:'Real World Assets'} as any)[cat.category] || cat.category,
                          p: Math.round(cat.pct),
                          c: (['#3b82f6','#3b82f6','#10b981','#0ea5e9','#f59e0b','#93c5fd'] as string[])[i] || '#6b7280',
                        }))
                      : [
                          { l:'Core BTC·ETH·SOL', p:38, c:'#3b82f6' },
                          { l:'DeFi & Protocols',  p:20, c:'#3b82f6' },
                          { l:'Stablecoins & RWA', p:12, c:'#10b981' },
                          { l:'L2 & Interop',      p:12, c:'#0ea5e9' },
                          { l:'Liquid Staking',    p:10, c:'#f59e0b' },
                          { l:'Other',             p: 8, c:'#6b7280' },
                        ]
                    ).map(s => (
                      <div key={s.l} style={{ marginBottom:10 }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}><span style={{ fontSize:11, fontWeight:600 }}>{s.l}</span><span style={{ fontSize:11, fontWeight:800, color:s.c, fontFamily:'monospace' }}>{s.p}%</span></div>
                        <div style={{ height:4, background:'rgba(255,255,255,0.05)', borderRadius:2, overflow:'hidden' }}><div style={{ height:'100%', width:`${s.p*2.5}%`, background:s.c, borderRadius:2 }} /></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── FEES TAB ── */}
            {tab === 'fees' && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
                <div style={{ background:'rgba(17,17,19,0.85)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:20, padding:'24px', backdropFilter:'blur(12px)' }}>
                  <h3 style={{ fontSize:14, fontWeight:700, color:'rgba(255,255,255,0.8)', marginBottom:18 }}>Fee Structure</h3>
                  <div style={{ padding:'14px', background:'rgba(59,130,246,0.07)', border:'1px solid rgba(59,130,246,0.18)', borderRadius:12, marginBottom:14 }}>
                    <div style={{ fontSize:12, fontWeight:700, marginBottom:4 }}>Performance Fee: 15% of yields</div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', lineHeight:1.7 }}>No management fee · No deposit fee · No withdrawal fee. Only charged on positive portfolio yield.</div>
                    <div style={{ fontSize:16, fontWeight:900, color:'#93c5fd', fontFamily:'monospace', marginTop:8 }}>{fmtUsd(Math.max(0,hasHoldings?totalPnL*0.15:0))}</div>
                    <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', marginTop:2 }}>Estimated YTD fee on your holdings</div>
                  </div>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', lineHeight:1.8 }}>
                    15% performance fee is distributed:<br/>
                    <strong style={{color:'#10b981'}}>60%</strong> → Open-market INQAI buybacks (buy pressure)<br/>
                    <strong style={{color:'#ef4444'}}>20%</strong> → Permanent token burns (deflationary)<br/>
                    <strong style={{color:'#f59e0b'}}>15%</strong> → Treasury (development &amp; security reserves)<br/>
                    <strong style={{color:'#6366f1'}}>5%</strong> → Chainlink Automation (keeps AI running)
                  </div>
                </div>
                <div style={{ background:'rgba(17,17,19,0.85)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:20, padding:'24px', backdropFilter:'blur(12px)' }}>
                  <h3 style={{ fontSize:14, fontWeight:700, color:'rgba(255,255,255,0.8)', marginBottom:18 }}>Fee Allocation</h3>
                  {(() => {
                    const totalFees = Math.max(0, hasHoldings ? totalPnL * 0.15 : 0);
                    return [
                      { l:'Buybacks (60%)',   v:totalFees*0.60, p:60, c:'#10b981', d:'INQAI bought on open market → creates buy pressure' },
                      { l:'Burns (20%)',      v:totalFees*0.20, p:20, c:'#ef4444', d:'INQAI permanently destroyed → reduces supply' },
                      { l:'Treasury (15%)',  v:totalFees*0.15, p:15, c:'#f59e0b', d:'Protocol reserves for development & security' },
                      { l:'Chainlink (5%)',  v:totalFees*0.05, p:5,  c:'#6366f1', d:'Auto-funds Chainlink Automation — keeps AI running forever' },
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
                <div style={{ gridColumn:'1 / -1', background:'rgba(17,17,19,0.85)', border:'1px solid rgba(59,130,246,0.15)', borderRadius:20, padding:'24px', backdropFilter:'blur(12px)' }}>
                  <h3 style={{ fontSize:14, fontWeight:700, color:'rgba(255,255,255,0.8)', marginBottom:18 }}>Tokenomics</h3>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
                    {[
                      { l:'Total Supply',  v:Number(process.env.NEXT_PUBLIC_TOTAL_SUPPLY||100000000).toLocaleString(), sub:'Fixed · never changes',      c:'#fff',    i:'flame' },
                      { l:'Presale Price', v:'$'+INQAI_TOKEN.presalePrice.toFixed(2),                                sub:`${(((INQAI_TOKEN.targetPrice/INQAI_TOKEN.presalePrice)-1)*100).toFixed(0)}% below target`, c:'#93c5fd', i:'price' },
                      { l:'Target Price',  v:'$'+INQAI_TOKEN.targetPrice.toFixed(2),                                sub:'Based on portfolio + fees',  c:'#10b981', i:'target' },
                      { l:'Target APY',    v:(INQAI_TOKEN.targetAPY*100).toFixed(1)+'%',                            sub:'Multi-strategy AI yield',    c:'#f59e0b', i:'apy' },
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
                        <div style={{ fontSize:9, color:'rgba(255,255,255,0.3)', marginTop:2 }}>{t.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Send INQAI Modal ── */}
      {sendOpen && (
        <div style={{ position:'fixed', inset:0, zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.75)', backdropFilter:'blur(6px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setSendOpen(false); }}
        >
          <div style={{ background:'#111113', border:'1px solid rgba(59,130,246,0.35)', borderRadius:20, padding:'28px 24px', width:'100%', maxWidth:420, margin:'0 16px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
              <h3 style={{ fontSize:16, fontWeight:800, margin:0 }}>Send INQAI</h3>
              <button onClick={() => setSendOpen(false)} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.4)', fontSize:20, cursor:'pointer', lineHeight:1 }}>×</button>
            </div>

            {sendConfirmed ? (
              <div style={{ textAlign:'center', padding:'16px 0' }}>
                <div style={{ fontSize:32, marginBottom:8 }}>✓</div>
                <div style={{ fontSize:14, fontWeight:700, color:'#10b981', marginBottom:6 }}>Transfer confirmed!</div>
                <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginBottom:16 }}>
                  {sendAmt} INQAI sent to {sendTo.slice(0,8)}…{sendTo.slice(-6)}
                </div>
                {sendHash && (
                  <a href={`https://etherscan.io/tx/${sendHash}`} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize:11, color:'#6ee7b7', display:'block', marginBottom:14 }}>
                    View on Etherscan ↗
                  </a>
                )}
                <button onClick={() => setSendOpen(false)}
                  style={{ padding:'9px 20px', borderRadius:10, background:'#3b82f6', color:'#fff', border:'none', cursor:'pointer', fontSize:13, fontWeight:700 }}>
                  Done
                </button>
              </div>
            ) : (
              <>
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginBottom:6 }}>Recipient address</div>
                  <input
                    value={sendTo} onChange={e => setSendTo(e.target.value)}
                    placeholder="0x…"
                    style={{ width:'100%', padding:'10px 12px', borderRadius:10, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', fontSize:13, fontFamily:'monospace', outline:'none', boxSizing:'border-box' }}
                  />
                </div>
                <div style={{ marginBottom:18 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <span style={{ fontSize:11, color:'rgba(255,255,255,0.4)' }}>Amount (INQAI)</span>
                    <button onClick={() => setSendAmt((onChainBalance > 0 ? onChainBalance : totalInqai).toFixed(4))}
                      style={{ fontSize:10, background:'none', border:'none', color:'#93c5fd', cursor:'pointer', padding:0 }}>
                      Max: {fmtN(onChainBalance > 0 ? onChainBalance : totalInqai, 4)}
                    </button>
                  </div>
                  <input
                    value={sendAmt} onChange={e => setSendAmt(e.target.value)}
                    placeholder="0.0"
                    type="number" min="0"
                    style={{ width:'100%', padding:'10px 12px', borderRadius:10, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', fontSize:13, outline:'none', boxSizing:'border-box' }}
                  />
                </div>

                {sendError && (
                  <div style={{ padding:'9px 12px', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.2)', borderRadius:8, fontSize:12, color:'#f87171', marginBottom:14 }}>
                    {sendError}
                  </div>
                )}

                {isSending && !sendConfirmed && !sendError && (
                  <div style={{ padding:'9px 12px', background:'rgba(59,130,246,0.07)', border:'1px solid rgba(59,130,246,0.2)', borderRadius:8, fontSize:12, color:'#93c5fd', marginBottom:14 }}>
                    Confirm in your wallet…
                  </div>
                )}

                {sendHash && !sendConfirmed && (
                  <div style={{ padding:'9px 12px', background:'rgba(16,185,129,0.07)', border:'1px solid rgba(16,185,129,0.2)', borderRadius:8, fontSize:12, color:'#6ee7b7', marginBottom:14 }}>
                    Broadcast — waiting for confirmation…
                  </div>
                )}

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                  <button onClick={() => setSendOpen(false)}
                    style={{ padding:'11px', borderRadius:10, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.5)', fontSize:13, fontWeight:600, cursor:'pointer' }}>
                    Cancel
                  </button>
                  <button onClick={handleSend} disabled={isSending}
                    style={{ padding:'11px', borderRadius:10, background: isSending ? 'rgba(59,130,246,0.25)' : '#3b82f6', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', fontSize:13, fontWeight:700, cursor: isSending ? 'wait' : 'pointer' }}>
                    {isSending ? 'Sending…' : 'Confirm Send'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
