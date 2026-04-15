import { useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { mainnet } from "wagmi/chains";
import { erc20Abi, isAddress, parseUnits, formatUnits } from "viem";
import { INQAI_TOKEN } from "../src/config/wagmi";
import SiteNav from '../src/components/SiteNav';

const WalletButton = dynamic(() => import('../src/components/WalletButton'), { ssr: false });

export default function SendPage() {
  const router = useRouter();
  const { address, isConnected, chain } = useAccount();
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const [sending, setSending] = useState(false);

  const { data: balRaw } = useReadContract({
    address: INQAI_TOKEN.address, abi: erc20Abi, functionName: "balanceOf",
    args: address ? [address] : undefined, chainId: mainnet.id,
    query: { enabled: !!address, refetchInterval: 30000 },
  });
  const { writeContractAsync } = useWriteContract();
  const { isSuccess: confirmed } = useWaitForTransactionReceipt({ hash: txHash });

  const balance    = balRaw ? parseFloat(formatUnits(balRaw as bigint, 18)) : 0;
  const wrongChain = isConnected && chain?.id !== mainnet.id;

  const handleSend = async () => {
    setError(null);
    if (!to || !isAddress(to)) { setError("Enter a valid Ethereum address."); return; }
    const amt = parseFloat(amount);
    if (!amount || isNaN(amt) || amt <= 0) { setError("Enter a valid amount."); return; }
    if (amt > balance) { setError("Amount exceeds your INQAI balance."); return; }
    setSending(true);
    try {
      const hash = await writeContractAsync({
        address: INQAI_TOKEN.address, abi: erc20Abi, functionName: "transfer",
        args: [to as `0x${string}`, parseUnits(amount, 18)], chainId: mainnet.id,
      });
      setTxHash(hash);
    } catch (e: any) {
      const msg: string = e.shortMessage || e.message || "";
      setError(msg.toLowerCase().includes("rejected") || e.code === 4001 ? "Rejected." : (msg || "Transfer failed."));
    } finally { setSending(false); }
  };

  return (
    <>
      <Head><title>Send INQAI | INQUISITIVE</title></Head>
      <div style={{ minHeight:"100vh", background:"#0a0a0b", color:"#fff", fontFamily:"system-ui,sans-serif" }}>
        <SiteNav />
        <div style={{ display:"flex", justifyContent:"center", padding:"60px 24px" }}>
          <div style={{ width:"100%", maxWidth:420 }}>
            <div style={{ textAlign:"center", marginBottom:28 }}>
              <h1 style={{ fontSize:24, fontWeight:900, marginBottom:6 }}>Send INQAI</h1>
              <p style={{ fontSize:13, color:"rgba(255,255,255,0.4)" }}>Transfer INQAI tokens to any Ethereum address.</p>
            </div>
            <div style={{ background:"rgba(17,17,19,0.9)", border:"1px solid rgba(59,130,246,0.2)", borderRadius:22, padding:"26px 24px" }}>
              {!isConnected && (
                <div style={{ textAlign:"center", padding:"12px 0" }}>
                  <p style={{ fontSize:13, color:"rgba(255,255,255,0.4)", marginBottom:18 }}>Connect your wallet to send INQAI.</p>
                  <WalletButton label="Connect Wallet" />
                </div>
              )}
              {isConnected && wrongChain && (
                <p style={{ padding:"12px 14px", background:"rgba(251,191,36,0.07)", border:"1px solid rgba(251,191,36,0.2)", borderRadius:10, fontSize:13, color:"#fbbf24" }}>
                  Switch to <strong>Ethereum Mainnet</strong>.
                </p>
              )}
              {confirmed && txHash && (
                <div style={{ textAlign:"center", padding:"16px 0" }}>
                  <div style={{ fontSize:17, fontWeight:800, marginBottom:8, color:"#10b981" }}>Sent!</div>
                  <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)", marginBottom:16 }}>{parseFloat(amount).toLocaleString()} INQAI to {to.slice(0,8)}…{to.slice(-6)}</div>
                  <a href={`https://etherscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer" style={{ color:"#34d399", fontSize:12, fontWeight:700 }}>View on Etherscan ↗</a>
                  <br /><br />
                  <button onClick={() => { setTxHash(undefined); setTo(""); setAmount(""); }} style={{ padding:"8px 20px", borderRadius:9, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", color:"rgba(255,255,255,0.5)", fontSize:13, cursor:"pointer" }}>Send Again</button>
                </div>
              )}
              {isConnected && !wrongChain && !confirmed && (
                <div>
                  <div style={{ display:"flex", justifyContent:"space-between", padding:"8px 12px", background:"rgba(59,130,246,0.07)", border:"1px solid rgba(59,130,246,0.18)", borderRadius:9, marginBottom:18 }}>
                    <span style={{ fontSize:12, color:"rgba(255,255,255,0.4)" }}>Balance</span>
                    <span style={{ fontSize:13, fontWeight:800, color:"#93c5fd", fontFamily:"monospace" }}>{balance > 0 ? balance.toLocaleString("en-US",{maximumFractionDigits:4}) : "0"} INQAI</span>
                  </div>
                  <div style={{ padding:"10px 13px", background:"rgba(251,191,36,0.07)", border:"1px solid rgba(251,191,36,0.22)", borderRadius:10, marginBottom:14, fontSize:12, color:"#fbbf24", lineHeight:1.6 }}>
                    <strong>⚠ INQAI is an ERC-20 token on Ethereum Mainnet.</strong> Recipient must be an Ethereum address starting with <code style={{background:"rgba(0,0,0,0.3)",padding:"1px 5px",borderRadius:4}}>0x</code>. Do <strong>not</strong> enter a Bitcoin, Solana, or other non-ETH address — tokens sent to the wrong chain address are permanently lost.
                  </div>
                  <div style={{ marginBottom:14 }}>
                    <label style={{ fontSize:10, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6, display:"block" }}>Recipient Ethereum Address</label>
                    <input type="text" value={to} onChange={e => setTo(e.target.value)} placeholder="0x..." style={{ width:"100%", padding:"11px 13px", borderRadius:10, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", color:"#fff", fontSize:13, outline:"none", boxSizing:"border-box", fontFamily:"monospace" }} />
                  </div>
                  <div style={{ marginBottom:18 }}>
                    <label style={{ fontSize:10, color:"rgba(255,255,255,0.35)", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:6, display:"block" }}>Amount</label>
                    <div style={{ display:"flex", gap:8 }}>
                      <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" min="0" style={{ flex:1, padding:"11px 13px", borderRadius:10, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", color:"#fff", fontSize:16, fontWeight:700, outline:"none", boxSizing:"border-box" }} />
                      <button onClick={() => setAmount(balance.toFixed(4))} style={{ padding:"0 14px", borderRadius:9, background:"rgba(59,130,246,0.2)", border:"1px solid rgba(59,130,246,0.35)", color:"#93c5fd", fontSize:11, fontWeight:700, cursor:"pointer" }}>MAX</button>
                    </div>
                  </div>
                  {error && (
                    <div style={{ padding:"10px 13px", background:"rgba(239,68,68,0.08)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:9, marginBottom:14 }}>
                      <span style={{ fontSize:12, color:"#f87171" }}>{error}</span>
                    </div>
                  )}
                  <button onClick={handleSend} disabled={sending || balance === 0} style={{ width:"100%", padding:"13px", borderRadius:12, fontSize:15, fontWeight:800, background: sending ? "rgba(59,130,246,0.3)" : "#3b82f6", border:"1px solid rgba(255,255,255,0.1)", color:"#fff", cursor: sending || balance === 0 ? "not-allowed" : "pointer", boxShadow: sending ? "none" : "0 4px 20px rgba(59,130,246,0.4)" }}>
                    {sending ? "Confirm in wallet…" : balance === 0 ? "No INQAI balance" : "Send INQAI"}
                  </button>
                </div>
              )}
            </div>
            {isConnected && <div style={{ marginTop:10, textAlign:"center", fontSize:11, color:"rgba(255,255,255,0.25)" }}>{address?.slice(0,6)}…{address?.slice(-4)}</div>}
          </div>
        </div>
      </div>
    </>
  );
}
