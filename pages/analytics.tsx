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
import InqaiLogo from '../src/components/InqaiLogo';


const VAULT_ADDR = (process.env.NEXT_PUBLIC_VAULT_ADDRESS || '0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb') as `0x${string}`;
const VAULT_ABI = [
  { name:'checkUpkeep',          type:'function', stateMutability:'view',      inputs:[{name:'',type:'bytes'}],        outputs:[{name:'upkeepNeeded',type:'bool'},{name:'performData',type:'bytes'}] },
  { name:'performUpkeep',        type:'function', stateMutability:'nonpayable', inputs:[{name:'performData',type:'bytes'}], outputs:[] },
  { name:'getPortfolioLength',   type:'function', stateMutability:'view',      inputs:[],                             outputs:[{name:'',type:'uint256'}] },
  { name:'getETHBalance',        type:'function', stateMutability:'view',      inputs:[],                             outputs:[{name:'',type:'uint256'}] },
  { name:'automationEnabled',    type:'function', stateMutability:'view',      inputs:[],                             outputs:[{name:'',type:'bool'}] },
  { name:'cycleCount',           type:'function', stateMutability:'view',      inputs:[],                             outputs:[{name:'',type:'uint256'}] },
  { name:'owner',                type:'function', stateMutability:'view',      inputs:[],                             outputs:[{name:'',type:'address'}] },
  { name:'setPortfolio',         type:'function', stateMutability:'nonpayable', inputs:[{name:'_tokens',type:'address[]'},{name:'_weights',type:'uint256[]'},{name:'_fees',type:'uint24[]'}], outputs:[] },
  { name:'setAutomationEnabled', type:'function', stateMutability:'nonpayable', inputs:[{name:'_enabled',type:'bool'}], outputs:[] },
  { name:'collectFees',          type:'function', stateMutability:'nonpayable', inputs:[{name:'token',type:'address'},{name:'amount',type:'uint256'}], outputs:[] },
] as const;

// PHASE1: 32 ETH-mainnet ERC-20s — per CMC watchlist
const PHASE1_TOKENS:  `0x${string}`[] = ['0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599','0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84','0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48','0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9','0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984','0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32','0xB50721BCf8d664c30412Cfbc6cf7a15145234ad1','0x45804880De22913dAFE09f4980848ECE6EcbAf78','0xe28b3B32B6c345A34Ff64674606124Dd5Aceca30','0x57e114B691Db790C35207b2e685D4A43181e6061','0x455e53CBB86018Ac2B8092FdCd39d8444aFFC3F6','0xaea46A60368A7bD060eec7DF8CBa43b7EF41Ad85','0x6De037ef9aD2725EB40118Bb1702EBb27e4Aeb24','0x514910771AF9Ca656af840dff83E8264EcF986CA','0xfAbA6f8e4a5E8Ab82F62fe7C39859FA577269BE3','0xc944E90C64B2c07662A292be6244BDf05Cda44a7','0x56072C95FAA701256059aa122697B133aDEd9279','0xCa14007Eff0dB1f8135f4C25B34De49AB0d42766','0x4a220E6096B25EADb88358cb44068A3248254675','0x6985884C4392D348587B19cb9eAAf157F13271cd','0x3506424F91fD33084466F402d5D97f05F8e3b4AF','0x4E15361FD6b4BB609Fa63C81A2be19d873717870','0xdBe2C93A4e82a177617F4a43Ee1A69c69Ee8e7E6','0x70e8dE73cE538DA2bEEd35d14187F6959a8ecA96','0x420412E765BFa6d85aaaC94b4f7b708C89be2e2B','0x431D5dfF03120AFA4bDf332c61A6e1766eF37BDB','0x77E06c9eCCf2E797fd462A92B6D7642EF85b0A44','0x85F17Cf997934a597031b2E18a9aB6ebD4B9f6a4','0x8D983cb9388EaC77af0474fA441C4815500Cb7BB','0xa2cd3d43c775978a96bdbf12d733d5a1ed94fb18','0x54991328Ab43c7D5d31C19d1B9fa048E77B5cd16','0x17CDB2a01e7a34CbB3DD4b83260B05d0274C8dab'];
const PHASE1_WEIGHTS: bigint[] = [3419n,2244n,585n,390n,390n,292n,292n,292n,195n,195n,195n,195n,195n,195n,195n,97n,97n,97n,48n,48n,48n,19n,19n,19n,19n,19n,48n,48n,48n,19n,19n,19n];
const PHASE1_FEES:    number[]  = [3000,100,500,3000,3000,3000,3000,3000,3000,3000,3000,3000,3000,3000,3000,3000,3000,3000,3000,3000,3000,3000,3000,3000,3000,3000,3000,3000,3000,3000,3000,3000];

const WalletButton   = dynamic(() => import('../src/components/WalletButton'),  { ssr: false });
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

const NAV_LINKS = [
  { l: 'Portfolio', p: '/analytics', accent: true  },
  { l: 'Docs',      p: '/help',      accent: false },
];

const ACTION_COL: Record<string, string> = {
  BUY: '#10b981', SELL: '#ef4444', REDUCE: '#f87171',
  STAKE: '#38bdf8', LEND: '#fbbf24', YIELD: '#a3e635',
  BORROW: '#22d3ee', SWAP: '#60a5fa', EARN: '#a78bfa',
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
  const [tab,       setTab]      = useState<'portfolio'|'ai'|'positions'|'execution'|'fees'>('portfolio');
  const [posFilter, setPosFilter]= useState<string>('all');
  const [purchases, setPurchases]= useState<any[]>([]);
  const [vesting,   setVesting]  = useState<any>(null);
  const [sendOpen,  setSendOpen] = useState(false);
  const [sendTo,    setSendTo]   = useState('');
  const [sendAmt,   setSendAmt]  = useState('');
  const [sendError, setSendError]= useState<string | null>(null);
  const [setupStatus, setSetupStatus] = useState<any>(null);
  const [runningSetup, setRunningSetup] = useState(false);
  const [setupStep,   setSetupStep]   = useState<string>('');
  const [autoStatus,  setAutoStatus]  = useState<any>(null);
  const [triggerHash, setTriggerHash] = useState<`0x${string}` | undefined>();
  const [triggerErr,  setTriggerErr]  = useState<string | null>(null);
  const [triggering,  setTriggering]  = useState(false);
  const [withdrawHash, setWithdrawHash] = useState<`0x${string}` | undefined>();
  const [withdrawErr,  setWithdrawErr]  = useState<string | null>(null);
  const [withdrawing,  setWithdrawing]  = useState(false);

  const runSetup = async () => {
    setRunningSetup(true);
    setSetupStep('');
    try {
      const r = await fetch('/api/inquisitiveAI/execute/setup', { method: 'GET' });
      const d = await r.json();
      setSetupStatus(d);
      if (d.status === 'SETUP_COMPLETE') load(true);
    } catch (e: any) {
      setSetupStatus({ status: 'ERROR', error: e.message });
    } finally {
      setRunningSetup(false);
    }
  };

  const setupFromWallet = async () => {
    setRunningSetup(true);
    setSetupStep('Confirm setPortfolio() in MetaMask…');
    try {
      const h1 = await writeAdminAsync({
        address: VAULT_ADDR, abi: VAULT_ABI, functionName: 'setPortfolio',
        args: [PHASE1_TOKENS, PHASE1_WEIGHTS, PHASE1_FEES], chainId: 1,
      });
      setSetupStep('setPortfolio broadcast — waiting for on-chain confirmation…');
      await waitForTransactionReceipt(wagmiConfig, { hash: h1 });
      setSetupStep('Confirm setAutomationEnabled(true) in MetaMask…');
      const h2 = await writeAdminAsync({
        address: VAULT_ADDR, abi: VAULT_ABI, functionName: 'setAutomationEnabled',
        args: [true], chainId: 1,
      });
      setSetupStep('setAutomationEnabled broadcast — confirming…');
      await waitForTransactionReceipt(wagmiConfig, { hash: h2 });
      setSetupStep('Done! Portfolio configured on-chain. Reloading…');
      setSetupStatus({ status: 'SETUP_COMPLETE', message: `setPortfolio tx: ${h1} · setAutomationEnabled tx: ${h2}` });
      load(true);
    } catch (e: any) {
      const msg: string = e.shortMessage || e.message || '';
      const isRejected = msg.toLowerCase().includes('rejected') || e.code === 4001;
      setSetupStep('');
      setSetupStatus({ status: 'ERROR', message: isRejected ? 'Transaction rejected.' : msg });
    } finally {
      setRunningSetup(false);
    }
  };

  const { writeContractAsync: writeSendAsync, isPending: isSending } = useWriteContract();
  const { writeContractAsync: writeAdminAsync } = useWriteContract();
  const [sendHash, setSendHash] = useState<`0x${string}` | undefined>();
  const { isSuccess: sendConfirmed } = useWaitForTransactionReceipt({ hash: sendHash });
  const { isSuccess: triggerConfirmed } = useWaitForTransactionReceipt({ hash: triggerHash });
  const { isSuccess: withdrawConfirmed } = useWaitForTransactionReceipt({ hash: withdrawHash });

  const withdrawVault = async () => {
    if (!vaultEthBal || vaultEthBal === 0n) return;
    setWithdrawErr(null);
    setWithdrawing(true);
    try {
      const h = await writeAdminAsync({
        address: VAULT_ADDR, abi: VAULT_ABI, functionName: 'collectFees',
        args: ['0x0000000000000000000000000000000000000000', vaultEthBal], chainId: 1,
      });
      setWithdrawHash(h);
    } catch (e: any) {
      const msg: string = e.shortMessage || e.message || '';
      setWithdrawErr(msg.toLowerCase().includes('rejected') || e.code === 4001 ? 'Rejected in wallet.' : (msg || 'Withdraw failed.'));
    } finally {
      setWithdrawing(false);
    }
  };

  const triggerUpkeep = async () => {
    setTriggerErr(null);
    setTriggering(true);
    try {
      const h = await writeAdminAsync({
        address: VAULT_ADDR, abi: VAULT_ABI, functionName: 'performUpkeep',
        args: ['0x'], chainId: 1,
      });
      setTriggerHash(h);
    } catch (e: any) {
      const msg: string = e.shortMessage || e.message || '';
      setTriggerErr(msg.toLowerCase().includes('rejected') || e.code === 4001 ? 'Rejected.' : (msg || 'Trigger failed.'));
    } finally {
      setTriggering(false);
    }
  };

  // ── Vault on-chain state (live reads, no private key) ─────────────────────
  const { data: checkUpkeepData } = useReadContract({
    address: VAULT_ADDR, abi: VAULT_ABI, functionName: 'checkUpkeep',
    args: ['0x'], chainId: 1, query: { refetchInterval: 30000 },
  });
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
  const isVaultOwner = !!(address && vaultOwnerAddr && address.toLowerCase() === (vaultOwnerAddr as string).toLowerCase());

  const vaultEthOnChain = vaultEthBal ? Number(vaultEthBal) / 1e18 : 0;
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
    const autoP    = safe(`/api/inquisitiveAI/execute/auto${t}`)
                       .then(d => { if (d) setAutoStatus(d); });
    const statusP  = safe(`/api/inquisitiveAI/execute/status${t}`)
                       .then(d => { if (d) setSysStatus(d); });
    const vestingP = safe(`/api/inquisitiveAI/token/vesting${t}`)
                       .then(d => { if (d) setVesting(d); });

    // setLoading(false) as soon as NAV arrives — the most critical data
    navP.then(() => setLoading(false));

    // setRefreshing(false) once all complete
    Promise.allSettled([navP, chartP, catP, queueP, monitorP, statusP, autoP, vestingP])
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
  // Presale: use localStorage. Delivered on-chain: fall back to onChainBalance (but never for deployer — deployer balance is 100M)
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
  const filteredPos = useMemo(() => {
    if (posFilter === 'all')  return positions;
    if (posFilter === 'buy')  return positions.filter(p => ACTIVE_SIGS.includes(p.action));
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
          <button onClick={() => router.push('/')} style={{ display:'flex', alignItems:'center', gap:9, background:'none', border:'none', cursor:'pointer', marginRight:24, padding:0 }}>
            <InqaiLogo size={32} />
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
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            title="Force refresh — bypasses CDN cache"
            style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', borderRadius:8, fontSize:11, fontWeight:600, cursor: refreshing ? 'wait' : 'pointer', background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)', color: refreshing ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.45)', transition:'all 0.2s', marginRight:8 }}
          >
            <span style={{ display:'inline-block', animation: refreshing ? 'spin 0.8s linear infinite' : 'none', fontSize:13 }}>⟳</span>
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
          <WalletButton label="Connect Wallet" />
        </nav>
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
                { label:'7D Return',   val:pct(return7d),    sub:'65-asset weighted basket',                     col:grc(return7d),  icon:'target' },
                { label:'24H Return',  val:pct(return24h),   sub:`${(winRate*100).toFixed(0)}% assets up today`, col:grc(return24h), icon:'trend'  },
                { label:'Portfolio Index', val: nav?.token?.portfolioIndex ? nav.token.portfolioIndex.toFixed(2) : '—', sub:'Base 100 · 7-day basket performance', col: nav?.token?.portfolioIndex ? (nav.token.portfolioIndex >= 100 ? '#10b981' : '#ef4444') : '#6b7280', icon:'flame' },
                { label:'AI Regime',   val:regime,            sub:`Risk ${(riskScore*100).toFixed(0)}% · F&G ${fg}`,col:regimeCol,   icon:'bot'    },
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
              {(['portfolio','ai','positions','execution','fees'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{ padding:'10px 18px', fontSize:13, fontWeight:tab===t?700:500, cursor:'pointer', background:'none', border:'none', borderBottom:`2px solid ${tab===t?'#7c3aed':'transparent'}`, color:tab===t?'#a78bfa':'rgba(255,255,255,0.4)', transition:'all 0.15s', position:'relative' }}>
                  {{portfolio:'Portfolio',ai:'AI Activity',positions:`Positions (${positions.length})`,execution:'Execution',fees:'Fee Flow'}[t as string]}
                  {t==='execution'&&!automationOn&&<span style={{position:'absolute',top:6,right:6,width:6,height:6,borderRadius:'50%',background:'#f59e0b',display:'block'}}/>}
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
                      {onChainBalance > 0 && localHolding > 0 && onChainBalance <= localHolding * 2 + 5 && <span style={{ fontSize:9, padding:'2px 7px', borderRadius:100, background:'rgba(16,185,129,0.15)', color:'#34d399', border:'1px solid rgba(16,185,129,0.25)' }}>ON-CHAIN</span>}
                      {purchases.length > 0 && onChainBalance === 0 && <span style={{ fontSize:9, padding:'2px 7px', borderRadius:100, background:'rgba(124,58,237,0.15)', color:'#a78bfa', border:'1px solid rgba(124,58,237,0.25)' }}>PRESALE</span>}
                    </div>
                    {!hasHoldings && isVaultOwner && vaultEthOnChain > 0 ? (
                      <div style={{ padding:'4px 0' }}>
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:12 }}>
                          {[
                            { l:'Vault ETH',     v:vaultEthOnChain.toFixed(4)+' ETH', c:'#60a5fa' },
                            { l:'Vault Value',   v:fmtUsd(vaultEthOnChain*(nav?.treasury?.ethPrice??2000)), c:'#10b981' },
                            { l:'7D Portfolio',  v:pct(return7d), c:grc(return7d) },
                          ].map(s => (
                            <div key={s.l} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:10, padding:'10px 12px' }}>
                              <div style={{ fontSize:10, color:'rgba(255,255,255,0.35)', marginBottom:3 }}>{s.l}</div>
                              <div style={{ fontSize:14, fontWeight:800, color:s.c, fontFamily:'monospace' }}>{s.v}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{ padding:'10px 12px', background:'rgba(96,165,250,0.06)', border:'1px solid rgba(96,165,250,0.2)', borderRadius:10, fontSize:11, color:'rgba(255,255,255,0.5)', lineHeight:1.6, marginBottom:12 }}>
                          You are the vault owner. Your ETH is in the portfolio vault and managed by the AI system across all 65 assets. INQAI token holdings reflect presale purchases — buy below to get a tokenized position.
                        </div>
                        <button onClick={() => router.push('/buy')} style={{ width:'100%', padding:'10px', borderRadius:10, background:'linear-gradient(135deg,#7c3aed,#4f46e5)', color:'#fff', border:'none', cursor:'pointer', fontSize:13, fontWeight:700 }}>Buy INQAI at $8</button>
                      </div>
                    ) : !hasHoldings ? (
                      <div style={{ textAlign:'center', padding:'20px 0' }}>
                        <div style={{ fontSize:13, color:'rgba(255,255,255,0.35)', marginBottom:12 }}>{address?'No INQAI holdings detected — connect to a wallet that holds INQAI, or buy below.':'Connect wallet to view your holdings.'}</div>
                        <div style={{ textAlign:'center', marginTop:16 }}>
                          <button onClick={() => router.push('/buy')} style={{ padding:'10px 20px', borderRadius:10, background:'linear-gradient(135deg,#7c3aed,#4f46e5)', color:'#fff', border:'none', cursor:'pointer', fontSize:13, fontWeight:700 }}>Buy INQAI at $8</button>
                        </div>
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
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:14 }}>
                          <button
                            onClick={() => { setSendOpen(true); setSendError(null); setSendTo(''); setSendAmt(''); setSendHash(undefined); }}
                            style={{ padding:'10px', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', background:'rgba(124,58,237,0.12)', border:'1px solid rgba(124,58,237,0.35)', color:'#a78bfa', transition:'all 0.2s' }}
                          >Send INQAI →</button>
                          <button
                            onClick={() => router.push('/buy')}
                            style={{ padding:'10px', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', background:'linear-gradient(135deg,#7c3aed,#4f46e5)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff' }}
                          >Acquire More</button>
                        </div>
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
                        { l:'ETH in Vault',       v: (treasury.vaultEth??0).toFixed(4)+' ETH',   c:'#60a5fa' },
                        { l:'Tokens Sold',        v: tokensCommitted > 0 ? fmtN(tokensCommitted,0)+' INQAI' : 'Pending', c:'#a78bfa' },
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
                  <div style={{ background:'rgba(13,13,32,0.85)', border:'1px solid rgba(124,58,237,0.18)', borderRadius:20, padding:'22px', backdropFilter:'blur(12px)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                      <Layers size={16} color="#a78bfa" />
                      <h3 style={{ fontSize:14, fontWeight:700, color:'rgba(255,255,255,0.8)', margin:0 }}>Your Portfolio Backing</h3>
                      <div style={{ marginLeft:'auto', fontSize:10, color:'rgba(255,255,255,0.3)', fontFamily:'monospace' }}>{effInvested>0?fmtUsd(effInvested)+' → 65 assets':'$'+INQAI_TOKEN.presalePrice+'/token → 65 assets'}</div>
                    </div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,0.28)', marginBottom:12, lineHeight:1.6 }}>
                      The AI deploys {effInvested>0?'your investment':'each $'+INQAI_TOKEN.presalePrice+' INQAI token'} across 65 assets. Bar width = relative weight, colour = live AI signal.
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
                  <div style={{ background:'rgba(13,13,32,0.85)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:20, padding:'22px', backdropFilter:'blur(12px)' }}>
                    <h3 style={{ fontSize:14, fontWeight:700, color:'rgba(255,255,255,0.8)', marginBottom:14 }}>AI Strategy</h3>
                    {(cats.length > 0
                      ? cats.slice(0,6).map((cat:any,i:number) => ({
                          l: ({major:'Core BTC·ETH·SOL',defi:'DeFi & Protocols',stablecoin:'Stablecoins & RWA',l2:'L2 & Interop','liquid-stake':'Liquid Staking',ai:'AI Tokens',rwa:'Real World Assets'} as any)[cat.category] || cat.category,
                          p: Math.round(cat.pct),
                          c: (['#3b82f6','#7c3aed','#10b981','#0ea5e9','#f59e0b','#a78bfa'] as string[])[i] || '#6b7280',
                        }))
                      : [
                          { l:'Core BTC·ETH·SOL', p:38, c:'#3b82f6' },
                          { l:'DeFi & Protocols',  p:20, c:'#7c3aed' },
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

            {/* ── AI ACTIVITY TAB ── */}
            {tab === 'ai' && (
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
                <div style={{ background:'rgba(13,13,32,0.85)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:20, padding:'24px', backdropFilter:'blur(12px)' }}>
                  <h3 style={{ fontSize:14, fontWeight:700, color:'rgba(255,255,255,0.8)', marginBottom:18 }}>AI Agent Live Metrics</h3>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                    {([
                      { l:'Brain Cycles', v:cyclesOnChain.toLocaleString(), c:'#a78bfa', i:'brain' },
                      { l:'Buy Actions',  v:buys,   c:'#10b981', i:'up' },
                      { l:'Sell Actions', v:sells,  c:'#ef4444', i:'down' },
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
                        { l:'Pattern',   v:c.patternEngine  ||0, c:'#3b82f6' },
                        { l:'Reasoning', v:c.reasoningEngine||0, c:'#10b981' },
                        { l:'Portfolio', v:c.portfolioEngine||0, c:'#ef4444' },
                        { l:'Learning',  v:c.learningEngine ||0, c:'#f97316' },
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
                  <h3 style={{ fontSize:14, fontWeight:700, color:'rgba(255,255,255,0.8)', marginBottom:14 }}>Top AI Signals — Cycle #{cyclesOnChain.toLocaleString()}</h3>
                  {topSignals.length > 0 ? (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10 }}>
                      {topSignals.map((s:any) => (
                        <div key={s.symbol} style={{ padding:'12px 14px', background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.05)', borderRadius:12 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                            <span style={{ fontWeight:800, fontSize:14 }}>{s.symbol}</span>
                            <span style={{ fontSize:9, padding:'2px 7px', borderRadius:100, background:`${ACTION_COL[s.action]||'#7c3aed'}20`, color:ACTION_COL[s.action]||'#7c3aed', border:`1px solid ${ACTION_COL[s.action]||'#7c3aed'}40`, fontWeight:700 }}>{s.action}</span>
                          </div>
                          <div style={{ fontFamily:'monospace', fontSize:16, fontWeight:900, color:'#a78bfa' }}>{(s.confidence*100).toFixed(0)}%</div>
                          <div style={{ fontSize:10, color:'rgba(255,255,255,0.35)', marginTop:2 }}>AI confidence · {fmtPrice(s.priceUsd)}</div>
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
                      <span style={{ textAlign:'right', fontSize:11, fontFamily:'monospace' }}>{fmtPrice(p.priceUsd)}</span>
                      <span style={{ textAlign:'right', fontSize:11, fontFamily:'monospace', color:grc(p.change24h) }}>{pct(p.change24h)}</span>
                      <span style={{ textAlign:'right', fontSize:11, fontFamily:'monospace', color:grc(p.change7d) }}>{pct(p.change7d)}</span>
                      <span style={{ textAlign:'right', fontSize:11, fontFamily:'monospace', color:'rgba(255,255,255,0.6)' }}>{p.weight}%</span>
                      <span style={{ textAlign:'right', fontSize:11, fontFamily:'monospace', color:'#10b981' }}>{fmtUsd(p.baseAllocUsd)}</span>
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

            {/* ── EXECUTION TAB ── */}
            {tab === 'execution' && (() => {
              const ss = sysStatus;
              const rPct   = ss?.readinessPct ?? 0;
              const rState = ss?.readiness    ?? 'NOT_DEPLOYED';
              const isLive = rState === 'FULLY_OPERATIONAL';
              const rColor = isLive ? '#10b981' : rPct >= 60 ? '#f59e0b' : '#ef4444';
              return (
              <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

                
                
                {/* System status header */}
                <div style={{ background: isLive?'rgba(16,185,129,0.06)':'rgba(13,13,32,0.85)', border:`1px solid ${rColor}30`, borderRadius:20, padding:'24px', backdropFilter:'blur(12px)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:18 }}>
                    <Activity size={22} color={rColor} />
                    <div>
                      <h3 style={{ fontSize:16, fontWeight:800, color:'#fff', margin:0 }}>Autonomous Execution Engine — 65 Assets</h3>
                      <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', marginTop:2 }}>Zero private keys · Chainlink Automation every 60s · Uniswap V3 + deBridge DLN · No human intervention</div>
                    </div>
                    <div style={{ marginLeft:'auto', textAlign:'right' }}>
                      <div style={{ fontSize:11, padding:'4px 12px', borderRadius:100, background:`${rColor}18`, color:rColor, border:`1px solid ${rColor}40`, fontWeight:800, display:'inline-block' }}>
                        {rState.replace(/_/g,' ')}
                      </div>
                      <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', marginTop:4 }}>{rPct}% ready</div>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div style={{ background:'rgba(255,255,255,0.06)', borderRadius:100, height:6, marginBottom:18 }}>
                    <div style={{ width:`${rPct}%`, height:'100%', borderRadius:100, background:`linear-gradient(90deg, ${rColor}, ${rColor}90)`, transition:'width 0.6s ease' }} />
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
                    {[
                      { l:'Vault ETH',      v: vaultEthOnChain.toFixed(4)+' ETH',                                                         c:'#60a5fa' },
                      { l:'Portfolio',      v: portfolioOnChain ? `${monitor?.architecture?.ethDirect??27} ETH + ${monitor?.architecture?.bridgeLive??13} BRIDGE + ${monitor?.architecture?.bridgeTracked??25} stETH` : (ss?.portfolioLength ? ss.portfolioLength+' assets' : 'Not set'), c: portfolioOnChain ? '#10b981':'#f59e0b' },
                      { l:'Automation',     v: automationOn ? 'ACTIVE' : (ss?.automationActive ? 'ACTIVE' : 'DISABLED'),                   c: (automationOn||ss?.automationActive) ? '#10b981':'#ef4444' },
                      { l:'Cycles run',     v: (cyclesOnChain || ss?.cycleCount || 0).toString(),                                         c:'#a78bfa' },
                    ].map(s => (
                      <div key={s.l} style={{ background:'rgba(255,255,255,0.04)', borderRadius:12, padding:'12px' }}>
                        <div style={{ fontSize:10, color:'rgba(255,255,255,0.35)', marginBottom:3 }}>{s.l}</div>
                        <div style={{ fontSize:14, fontWeight:800, color:s.c, fontFamily:'monospace' }}>{s.v}</div>
                      </div>
                    ))}
                  </div>
                </div>


                {/* ── VAULT ON-CHAIN STATUS — vault is fully configured per documentation ── */}
                <div style={{ background:'rgba(13,13,32,0.85)', border:'1px solid rgba(99,102,241,0.25)', borderRadius:20, padding:'24px', backdropFilter:'blur(12px)' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:18 }}>
                    <Zap size={18} color="#818cf8" />
                    <h3 style={{ fontSize:14, fontWeight:800, color:'#fff', margin:0 }}>Vault Configuration Status</h3>
                    <span style={{ marginLeft:'auto', fontSize:9, padding:'2px 8px', borderRadius:100, background:'rgba(16,185,129,0.12)', color:'#34d399', border:'1px solid rgba(16,185,129,0.3)', fontWeight:700 }}>FULLY CONFIGURED ON-CHAIN</span>
                  </div>

                  {/* 4 configuration steps — all already done per docs */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:20 }}>
                    {[
                      { title:'Vault Deployed', detail:`InquisitiveVaultUpdated · ${VAULT_ADDR.slice(0,10)}…${VAULT_ADDR.slice(-6)}`, done:true },
                      { title:'setPortfolio()', detail:'26 ETH-mainnet ERC-20s configured · Uniswap V3 · on-chain', done:true },
                      { title:'setPhase2Registry()', detail:'13 cross-chain deBridge DLN targets configured · on-chain', done:true },
                      { title:'setAutomationEnabled(true)', detail:'Vault will execute on every Chainlink keeper call · on-chain', done:true },
                    ].map((s, i) => (
                      <div key={i} style={{ display:'flex', gap:10, padding:'10px 12px', background:'rgba(16,185,129,0.05)', border:'1px solid rgba(16,185,129,0.18)', borderRadius:12 }}>
                        <div style={{ width:20, height:20, borderRadius:'50%', background:'#10b981', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:10, fontWeight:800, color:'#fff' }}>✓</div>
                        <div>
                          <div style={{ fontSize:12, fontWeight:700, color:'#6ee7b7', marginBottom:2 }}>{s.title}</div>
                          <div style={{ fontSize:10, color:'rgba(255,255,255,0.35)', lineHeight:1.5 }}>{s.detail}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* THE ONE MISSING STEP — fund Chainlink Automation with LINK */}
                  {isVaultOwner && (
                  <div style={{ background:'rgba(251,191,36,0.06)', border:'2px solid rgba(251,191,36,0.3)', borderRadius:14, padding:'18px 20px', marginBottom:16 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                      <AlertTriangle size={16} color="#fbbf24" />
                      <div style={{ fontSize:13, fontWeight:800, color:'#fbbf24' }}>Only Step Remaining: Fund Chainlink Automation with LINK</div>
                    </div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,0.55)', lineHeight:1.8, marginBottom:14 }}>
                      Chainlink Automation calls <code style={{color:'#a78bfa'}}>performUpkeep()</code> on-chain every 60 seconds — zero private keys, zero servers. 
                      Costs ~1 LINK/month (~$15). Once funded, every ETH deposit is automatically deployed across all 65 assets.
                    </div>
                    <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:14 }}>
                      {[
                        ['1', 'Go to', 'https://automation.chain.link', 'automation.chain.link'],
                        ['2', 'Connect MetaMask (team wallet)', null, null],
                        ['3', 'Register New Upkeep → Custom Logic', null, null],
                        ['4', `Contract address: ${VAULT_ADDR}`, null, null],
                        ['5', 'Gas limit: 5,000,000', null, null],
                        ['6', 'Fund with LINK tokens (minimum 1 LINK)', null, null],
                        ['7', 'Confirm in MetaMask — execution begins automatically', null, null],
                      ].map(([n, text, href, linkLabel]) => (
                        <div key={n} style={{ display:'flex', gap:8, alignItems:'flex-start' }}>
                          <span style={{ fontSize:11, color:'#fbbf24', fontWeight:800, minWidth:16, flexShrink:0 }}>{n}.</span>
                          <span style={{ fontSize:11, color:'rgba(255,255,255,0.6)' }}>
                            {text}{href && <> <a href={href} target="_blank" rel="noopener noreferrer" style={{color:'#818cf8', textDecoration:'underline'}}>{linkLabel}</a></>}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div style={{ display:'flex', gap:10 }}>
                      <a href="https://automation.chain.link" target="_blank" rel="noopener noreferrer"
                        style={{ flex:1, display:'block', padding:'11px', borderRadius:12, background:'linear-gradient(135deg,#6366f1,#4f46e5)', color:'#fff', border:'1px solid rgba(255,255,255,0.1)', fontSize:13, fontWeight:800, textAlign:'center', textDecoration:'none', boxShadow:'0 4px 16px rgba(99,102,241,0.4)' }}>
                        Register at automation.chain.link →
                      </a>
                      <a href={`https://etherscan.io/address/${VAULT_ADDR}`} target="_blank" rel="noopener noreferrer"
                        style={{ padding:'11px 16px', borderRadius:12, background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.1)', color:'rgba(255,255,255,0.6)', fontSize:12, fontWeight:600, textDecoration:'none', display:'flex', alignItems:'center', whiteSpace:'nowrap' }}>
                        View Vault ↗
                      </a>
                    </div>
                  </div>
                  )}

                  <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)', lineHeight:1.8, padding:'10px 14px', background:'rgba(255,255,255,0.03)', borderRadius:10 }}>
                    <strong style={{color:'rgba(255,255,255,0.4)'}}>Architecture:</strong> Chainlink nodes call <code style={{color:'#a78bfa'}}>performUpkeep()</code> when vault balance ≥ 0.005 ETH.
                    Zero private keys. ETH is split: 26 assets via Uniswap V3 · 13 cross-chain via deBridge DLN · 25 held as Lido stETH.
                    Identical to Yearn, Compound, and Aave keeper architecture.
                  </div>
                </div>

                {/* Architecture explanation + Chainlink CTA */}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
                  <div style={{ background:'rgba(13,13,32,0.85)', border:'1px solid rgba(99,102,241,0.2)', borderRadius:20, padding:'22px', backdropFilter:'blur(12px)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                      <Zap size={16} color="#6366f1" />
                      <h3 style={{ fontSize:14, fontWeight:700, color:'rgba(255,255,255,0.8)', margin:0 }}>Chainlink Automation</h3>
                      <span style={{ marginLeft:'auto', fontSize:9, padding:'2px 7px', borderRadius:100, background:'rgba(99,102,241,0.12)', color:'#818cf8', border:'1px solid rgba(99,102,241,0.25)', fontWeight:700 }}>FULLY KEYLESS</span>
                    </div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,0.4)', lineHeight:1.8, marginBottom:14 }}>
                      Chainlink nodes call <code style={{color:'#a78bfa'}}>performUpkeep()</code> on-chain every 60 seconds.
                      <strong style={{color:'#fff'}}> Zero private keys anywhere</strong> — identical to Yearn, Compound, Aave keeper architecture.
                      Costs ~1 LINK/month (~$15).
                    </div>
                    {[['1','Go to automation.chain.link'],['2','Connect MetaMask (deployer wallet)'],['3','New Upkeep → Custom Logic'],['4','Paste vault address → Fund 1 LINK'],['5','Done — runs autonomously forever']].map(([n,t]) => (
                      <div key={n} style={{ display:'flex', gap:8, alignItems:'flex-start', marginBottom:5 }}>
                        <span style={{ fontSize:10, color:'#6366f1', fontWeight:800, minWidth:14 }}>{n}.</span>
                        <span style={{ fontSize:11, color:'rgba(255,255,255,0.5)' }}>{t}</span>
                      </div>
                    ))}
                    <a href="https://automation.chain.link" target="_blank" rel="noopener noreferrer" style={{ display:'block', marginTop:14, padding:'9px 14px', borderRadius:10, background:'rgba(99,102,241,0.1)', border:'1px solid rgba(99,102,241,0.25)', color:'#818cf8', fontSize:12, fontWeight:700, textAlign:'center', textDecoration:'none' }}>
                      Register at automation.chain.link ↗
                    </a>
                  </div>

                  <div style={{ background:'rgba(13,13,32,0.85)', border:'1px solid rgba(255,255,255,0.07)', borderRadius:20, padding:'22px', backdropFilter:'blur(12px)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                      <Activity size={16} color="#10b981" />
                      <h3 style={{ fontSize:14, fontWeight:700, color:'rgba(255,255,255,0.8)', margin:0 }}>Recent Executions</h3>
                    </div>
                    {ss?.recentTrades?.length > 0 ? (
                      ss.recentTrades.map((t: any, i: number) => (
                        <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                          <div>
                            <div style={{ fontSize:11, fontWeight:700, color:'#10b981' }}>Cycle #{t.cycle}</div>
                            <div style={{ fontSize:10, color:'rgba(255,255,255,0.3)' }}>Block {t.block}</div>
                          </div>
                          <a href={`https://etherscan.io/tx/${t.txHash}`} target="_blank" rel="noopener noreferrer" style={{ fontSize:10, color:'#60a5fa', textDecoration:'none' }}>Etherscan ↗</a>
                        </div>
                      ))
                    ) : (
                      <div style={{ textAlign:'center', padding:'24px 0' }}>
                        <div style={{ fontSize:13, color:'rgba(255,255,255,0.3)', marginBottom:6 }}>No executions yet</div>
                        <div style={{ fontSize:10, color:'rgba(255,255,255,0.18)', lineHeight:1.8 }}>
                          Once vault is deployed + Chainlink registered,<br/>every ETH deposit is autonomously allocated<br/>across all 65 assets — {monitor?.architecture?.ethDirect??27} via Uniswap V3,<br/>{monitor?.architecture?.bridgeLive??13} via deBridge DLN (Solana/BSC/Avalanche/Optimism/TRON),<br/>{monitor?.architecture?.bridgeTracked??25} held as Lido stETH earning yield.
                        </div>
                      </div>
                    )}
                    {ss?.lastDeployIso && (
                      <div style={{ marginTop:12, padding:'8px', background:'rgba(16,185,129,0.06)', borderRadius:8, fontSize:10, color:'rgba(255,255,255,0.4)' }}>
                        Last deploy: {new Date(ss.lastDeployIso).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>

                {/* Next action callout */}
                {ss?.nextAction && !isLive && (
                  <div style={{ background:'rgba(251,191,36,0.06)', border:'1px solid rgba(251,191,36,0.2)', borderRadius:16, padding:'16px 20px', display:'flex', alignItems:'center', gap:12 }}>
                    <AlertTriangle size={16} color="#fbbf24" style={{ flexShrink:0 }} />
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color:'#fbbf24', marginBottom:3 }}>Next Required Step</div>
                      <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)', lineHeight:1.6 }}>{ss.nextAction}</div>
                    </div>
                  </div>
                )}

                {/* Full 65-asset allocation plan */}
                {monitor?.allocation?.plan && monitor.allocation.plan.length > 0 && (
                  <div style={{ background:'rgba(13,13,32,0.85)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:20, padding:'22px', backdropFilter:'blur(12px)' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                      <BarChart3 size={16} color="#a78bfa" />
                      <h3 style={{ fontSize:14, fontWeight:700, color:'rgba(255,255,255,0.8)', margin:0 }}>
                        Full 65-Asset Allocation — Live AI Signals
                      </h3>
                      <span style={{ marginLeft:'auto', fontSize:10, color:'rgba(255,255,255,0.35)' }}>
                        {monitor.allocation.plan.length} assets · {monitor.allocation.plan.filter((t:any) => t.executionMode === 'ETH-DIRECT').length} ETH-direct · {monitor.allocation.plan.filter((t:any) => t.executionMode === 'BRIDGE').length} bridge
                      </span>
                    </div>
                    {/* Architecture summary chips */}
                    <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
                      {[
                        { label:'ETH-DIRECT',  n: monitor?.architecture?.ethDirect    ?? 27, c:'#10b981', bg:'rgba(16,185,129,0.08)', border:'rgba(16,185,129,0.25)', desc:'Uniswap V3 swaps · ETH-mainnet' },
                        { label:'BRIDGE LIVE', n: monitor?.architecture?.bridgeLive   ?? 13, c:'#6366f1', bg:'rgba(99,102,241,0.08)', border:'rgba(99,102,241,0.25)', desc:'deBridge DLN · 5 chains' },
                        { label:'stETH YIELD', n: monitor?.architecture?.bridgeTracked ?? 25, c:'#f59e0b', bg:'rgba(245,158,11,0.06)', border:'rgba(245,158,11,0.2)',  desc:'Lido stETH · native price' },
                      ].map(chip => (
                        <div key={chip.label} style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 10px', borderRadius:100, background:chip.bg, border:`1px solid ${chip.border}` }}>
                          <span style={{ fontSize:10, fontWeight:800, color:chip.c }}>{chip.n} {chip.label}</span>
                          <span style={{ fontSize:9, color:'rgba(255,255,255,0.35)' }}>{chip.desc}</span>
                        </div>
                      ))}
                    </div>
                    {/* Column headers */}
                    <div style={{ display:'grid', gridTemplateColumns:'58px 1fr 70px 60px 64px 64px 70px', gap:4, padding:'6px 0', borderBottom:'1px solid rgba(255,255,255,0.06)', fontSize:9, color:'rgba(255,255,255,0.3)', fontWeight:700, textTransform:'uppercase' }}>
                      <span>Asset</span>
                      <span>Name / Execution</span>
                      <span style={{textAlign:'center'}}>Mode</span>
                      <span style={{textAlign:'right'}}>Wt%</span>
                      <span style={{textAlign:'right'}}>Signal</span>
                      <span style={{textAlign:'right'}}>Score</span>
                      <span style={{textAlign:'right'}}>Chain</span>
                    </div>
                    {monitor.allocation.plan.map((t: any) => {
                      const isEthDirect  = t.executionMode === 'ETH-DIRECT';
                      const isBridgeLive = !isEthDirect && t.bridgeLive;
                      const chainLabel   = (t.nativeChain || 'Unknown').replace('Ethereum','ETH').replace('BNB Chain','BSC').replace('Bitcoin Cash','BCH');
                      const badgeColor   = isEthDirect ? '#34d399' : isBridgeLive ? '#818cf8' : '#f59e0b';
                      const badgeBg      = isEthDirect ? 'rgba(16,185,129,0.12)' : isBridgeLive ? 'rgba(99,102,241,0.1)' : 'rgba(245,158,11,0.08)';
                      const badgeBorder  = isEthDirect ? 'rgba(16,185,129,0.3)'  : isBridgeLive ? 'rgba(99,102,241,0.25)' : 'rgba(245,158,11,0.2)';
                      const badgeLabel   = isEthDirect ? 'ETH' : isBridgeLive ? 'BRIDGE' : 'TRACKED';
                      return (
                        <div key={t.symbol} style={{ display:'grid', gridTemplateColumns:'58px 1fr 70px 60px 64px 64px 70px', gap:4, padding:'6px 0', borderBottom:'1px solid rgba(255,255,255,0.025)', alignItems:'center' }}>
                          <span style={{ fontWeight:800, fontSize:12, color:'#fff' }}>{t.symbol}</span>
                          <div>
                            <div style={{ fontSize:10, color:'rgba(255,255,255,0.5)', lineHeight:1.3 }}>{t.name}</div>
                            <div style={{ fontSize:8, color: isEthDirect ? 'rgba(16,185,129,0.6)' : isBridgeLive ? 'rgba(99,102,241,0.6)' : 'rgba(245,158,11,0.5)', lineHeight:1.2, marginTop:1 }}>{t.bridgeProtocol}</div>
                          </div>
                          <div style={{ display:'flex', justifyContent:'center' }}>
                            <span style={{ fontSize:8, padding:'1px 5px', borderRadius:100, fontWeight:800,
                              background: badgeBg, color: badgeColor, border: `1px solid ${badgeBorder}` }}>
                              {badgeLabel}
                            </span>
                          </div>
                          <span style={{ textAlign:'right', fontSize:10, fontFamily:'monospace', color:'rgba(255,255,255,0.45)' }}>{t.allocPct?.toFixed(2)}%</span>
                          <div style={{ display:'flex', justifyContent:'flex-end' }}>
                            <span style={{ fontSize:8, padding:'1px 5px', borderRadius:100,
                              background:`${ACTION_COL[t.aiAction]||'#7c3aed'}18`,
                              color: ACTION_COL[t.aiAction]||'#a78bfa',
                              border:`1px solid ${ACTION_COL[t.aiAction]||'#7c3aed'}35`, fontWeight:700 }}>
                              {t.aiAction}
                            </span>
                          </div>
                          <span style={{ textAlign:'right', fontSize:10, fontFamily:'monospace', color: (t.confidence??0)>=0.7?'#10b981':(t.confidence??0)>=0.5?'#f59e0b':'rgba(255,255,255,0.35)' }}>
                            {((t.confidence??0)*100).toFixed(0)}%
                          </span>
                          <span style={{ textAlign:'right', fontSize:9, color: isEthDirect ? '#34d399' : '#818cf8', fontFamily:'monospace' }}>
                            {chainLabel}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              );
            })()}

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
                      { l:'Total Supply',  v:Number(process.env.NEXT_PUBLIC_TOTAL_SUPPLY||100000000).toLocaleString(), sub:'Fixed · never changes',      c:'#fff',    i:'flame' },
                      { l:'Presale Price', v:'$'+INQAI_TOKEN.presalePrice.toFixed(2),                                sub:`${(((INQAI_TOKEN.targetPrice/INQAI_TOKEN.presalePrice)-1)*100).toFixed(0)}% below target`, c:'#a78bfa', i:'price' },
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
                        <div style={{ fontSize:10, color:'rgba(255,255,255,0.25)', marginTop:2 }}>{t.sub}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── VESTING STATUS CARD ── */}
                <div style={{ gridColumn:'1 / -1', background:'rgba(13,13,32,0.85)', border:'1px solid rgba(245,158,11,0.2)', borderRadius:20, padding:'24px', backdropFilter:'blur(12px)', marginTop:8 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
                    <Clock size={18} color={vesting?.color || '#f59e0b'} />
                    <h3 style={{ fontSize:14, fontWeight:700, color:'rgba(255,255,255,0.8)', margin:0 }}>Team Vesting Status</h3>
                    <span style={{ marginLeft:'auto', fontSize:10, padding:'3px 10px', borderRadius:100, background:(vesting?.color||'#f59e0b')+'15', color:vesting?.color||'#f59e0b', border:'1px solid '+(vesting?.color||'#f59e0b')+'40', fontWeight:700 }}>
                      {vesting?.statusLabel || 'Loading…'}
                    </span>
                  </div>

                  <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:16 }}>
                    <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:'12px' }}>
                      <div style={{ fontSize:10, color:'rgba(255,255,255,0.35)', marginBottom:4 }}>Team Allocation</div>
                      <div style={{ fontSize:15, fontWeight:800, color:'#a78bfa', fontFamily:'monospace' }}>{vesting?.team?.totalAllocation?.toLocaleString() || '20,000,000'} INQAI</div>
                      <div style={{ fontSize:9, color:'rgba(255,255,255,0.25)', marginTop:2 }}>20% of total supply</div>
                    </div>
                    <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:'12px' }}>
                      <div style={{ fontSize:10, color:'rgba(255,255,255,0.35)', marginBottom:4 }}>Vested So Far</div>
                      <div style={{ fontSize:15, fontWeight:800, color:'#10b981', fontFamily:'monospace' }}>{vesting?.vested?.tokens?.toLocaleString() || '0'} INQAI</div>
                      <div style={{ fontSize:9, color:'rgba(255,255,255,0.25)', marginTop:2 }}>{vesting?.vested?.pct?.toFixed(2) || '0.00'}% of allocation</div>
                    </div>
                    <div style={{ background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.06)', borderRadius:12, padding:'12px' }}>
                      <div style={{ fontSize:10, color:'rgba(255,255,255,0.35)', marginBottom:4 }}>Locked</div>
                      <div style={{ fontSize:15, fontWeight:800, color:'#f59e0b', fontFamily:'monospace' }}>{vesting?.vested?.locked?.toLocaleString() || '20,000,000'} INQAI</div>
                      <div style={{ fontSize:9, color:'rgba(255,255,255,0.25)', marginTop:2 }}>{(100 - (vesting?.vested?.pct || 0)).toFixed(2)}% remaining</div>
                    </div>
                  </div>

                  <div style={{ background:'rgba(251,191,36,0.05)', border:'1px solid rgba(251,191,36,0.15)', borderRadius:12, padding:'14px 16px' }}>
                    <div style={{ fontSize:12, fontWeight:600, color:'#fbbf24', marginBottom:10 }}>Deployment Progress</div>
                    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                      {(vesting?.deploymentSteps || [
                        {step:1, done:true, title:'INQAI Token Deployed', detail:'Contract live at 0xB312…'},
                        {step:2, done:false, title:'Vesting Contract Deployed', detail:'Pending deployment'},
                        {step:3, done:false, title:'Vesting Contract Funded', detail:'Transfer 20M INQAI to vesting'},
                        {step:4, done:false, title:'3-Month Cliff Reached', detail:'Linear vesting begins'}
                      ]).map((s:any) => (
                        <div key={s.step} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                          <div style={{ width:18, height:18, borderRadius:'50%', background:s.done?'#10b981':'rgba(255,255,255,0.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:10, fontWeight:800, color:s.done?'#fff':'rgba(255,255,255,0.3)' }}>
                            {s.done ? '✓' : s.step}
                          </div>
                          <div style={{ flex:1 }}>
                            <div style={{ fontSize:12, fontWeight:s.done?600:500, color:s.done?'#6ee7b7':'rgba(255,255,255,0.6)' }}>{s.title}</div>
                            <div style={{ fontSize:10, color:'rgba(255,255,255,0.35)', marginTop:1 }}>{s.detail}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {!vesting?.contract?.deployed && (
                    <div style={{ marginTop:14, padding:'12px 14px', background:'rgba(124,58,237,0.06)', border:'1px solid rgba(124,58,237,0.2)', borderRadius:10, fontSize:11, color:'rgba(255,255,255,0.5)', lineHeight:1.7 }}>
                      <strong style={{ color:'#a78bfa' }}>Next step:</strong> Deploy <code style={{color:'#fbbf24'}}>TeamVesting.sol</code> via Remix or Hardhat. Set beneficiary to team wallet. Transfer 20M INQAI to the vesting contract to start the 3-month cliff.
                    </div>
                  )}
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
          <div style={{ background:'#0d0d20', border:'1px solid rgba(124,58,237,0.35)', borderRadius:20, padding:'28px 24px', width:'100%', maxWidth:420, margin:'0 16px' }}>
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
                  style={{ padding:'9px 20px', borderRadius:10, background:'linear-gradient(135deg,#7c3aed,#4f46e5)', color:'#fff', border:'none', cursor:'pointer', fontSize:13, fontWeight:700 }}>
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
                      style={{ fontSize:10, background:'none', border:'none', color:'#a78bfa', cursor:'pointer', padding:0 }}>
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
                  <div style={{ padding:'9px 12px', background:'rgba(124,58,237,0.07)', border:'1px solid rgba(124,58,237,0.2)', borderRadius:8, fontSize:12, color:'#a78bfa', marginBottom:14 }}>
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
                    style={{ padding:'11px', borderRadius:10, background: isSending ? 'rgba(124,58,237,0.25)' : 'linear-gradient(135deg,#7c3aed,#4f46e5)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', fontSize:13, fontWeight:700, cursor: isSending ? 'wait' : 'pointer' }}>
                    {isSending ? 'Sending…' : 'Confirm Send'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
