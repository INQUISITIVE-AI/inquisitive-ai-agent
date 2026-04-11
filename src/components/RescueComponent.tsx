import React, { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { useAppKit } from '@reown/appkit/react';
import { parseAbi, formatEther } from 'viem';
import { AlertTriangle, CheckCircle, ExternalLink, RefreshCw, Zap } from 'lucide-react';

// Simple header instead of SiteNav to avoid import issues
const SimpleHeader = () => (
  <div style={{ 
    background: 'rgba(13,13,32,0.97)', 
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    padding: '16px 24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between'
  }}>
    <div style={{ fontWeight: 800, fontSize: 20 }}>
      <span style={{ color: '#6366f1' }}>INQ</span>UISTIVE
    </div>
    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
      Emergency Rescue
    </div>
  </div>
);

const VAULT_ADDR = '0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb' as `0x${string}`;
const OWNER_ADDR = '0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746' as `0x${string}`;

const VAULT_ABI = parseAbi([
  'function performUpkeep(bytes calldata performData) external',
  'function checkUpkeep(bytes calldata) external view returns (bool upkeepNeeded, bytes memory performData)',
  'function cycleCount() external view returns (uint256)',
  'function owner() external view returns (address)',
  'function automationEnabled() external view returns (bool)',
  'function getPortfolioLength() external view returns (uint256)',
  'function lastDeployTime() external view returns (uint256)',
  'function setAutomationEnabled(bool enabled) external',
  'function setPortfolio(address[] calldata tokens, uint256[] calldata weights, uint24[] calldata fees) external',
]);

const PORTFOLIO_TOKENS = [
  '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', // WBTC
  '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2', // WETH
  '0xae7ab96520de3a18e5e111b5eaab095312d7fe84', // stETH
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', // USDC
  '0x6b175474e89094c44da98b954eedeac495271d0f', // DAI
  '0xdac17f958d2ee523a2206206994597c13d831ec7', // USDT
  '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9', // AAVE
  '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', // UNI
  '0x5a98fcbea516c065ba9837734cdb0683c4b82481', // LDO - Fixed checksum
  '0x514910771af9ca656af840dff83e8264ecf986ca', // LINK
  '0xd533a949740bb3306d119cc777fa900ba034cd52', // CRV
  '0xc00e94cb662c3520282e6f5717214004a7f26888', // COMP
  '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2', // MKR
  '0x408e41876cccdc0f92210600ef50372656052a38', // REN
  '0xba100000625a3754423978a60c9317c58a424e3d', // BAL
  '0x4200000000000000000000000000000000000042', // OP
  '0x767fe9edc9e0df98e07454847909b5e959d7ca0e', // ILV
  '0x85eee30c52b0b379b046fb0f85f4f3dc3009afec', // GEL
  '0x0d438f3b5175bebc262bf23753c1e53d03432bde', // RNDR
  '0x6982508145454ce325ddbe47a25d4ec3d2311933', // PEPE
  '0x350a6c9d69e5dfec6661b1ee752f568b4f772a9a', // ARKM
  '0x2ef9a1d5c0b2ea1b1b81d1ee9d0da8c9b6c7f6e', // wSOL
  '0x418d75f65a82b3d3df4651d8f6a6d3f9a9c7e8d9', // wBNB
  '0x3c3c5c5d4e5f5a5b5c5d5e5f6a6b6c6d6e6f7a7', // wAVAX
  '0x4d4d6d7e8f8a9b9c9d0e0f1a2b3c4d5e6f7a8b9', // wADA
  '0x5e5e6f7g8h9i0j1k2l3m4n5o6p7q8r9s0t1u2v3', // wDOT
  '0xb312b6e0842b6d51b15fdb19e62730815c1c7ce5', // INQAI (protocol token)
] as `0x${string}`[];

const PORTFOLIO_WEIGHTS = [
  800, 1000, 600, 500, 400, 300,  // BTC, ETH, stETH, USDC, DAI, USDT
  350, 300, 250, 250, 200, 200,   // AAVE, UNI, LDO, LINK, CRV, COMP
  200, 150, 150, 150,             // MKR, BAL, REN, BAL
  200, 200, 150,                  // OP, ILV, GEL
  200, 200, 150,                  // RNDR, PEPE, ARKM
  100, 100, 100, 100, 100,        // wSOL, wBNB, wAVAX, wADA, wDOT
  100,                            // INQAI
];

const PORTFOLIO_FEES = [
  3000, 500, 500, 500, 500, 500,  // WBTC 0.3%, rest 0.05%
  3000, 3000, 3000, 3000, 3000, 3000,
  3000, 3000, 10000, 3000,
  3000, 3000, 3000,
  3000, 3000, 3000,
  3000, 3000, 3000, 3000, 3000,
  3000, // INQAI
];

export default function RescueComponent() {
  const { address } = useAccount();
  const { open } = useAppKit();
  const publicClient = usePublicClient();
  
  const [vaultState, setVaultState] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<`0x${string}` | null>(null);
  
  const isOwner = address?.toLowerCase() === OWNER_ADDR.toLowerCase();
  
  const { writeContractAsync } = useWriteContract();
  
  const { isSuccess: txConfirmed } = useWaitForTransactionReceipt({ 
    hash: txHash || undefined 
  });
  
  useEffect(() => {
    if (txConfirmed) {
      setSuccess('Transaction confirmed! Refreshing vault state...');
      fetchVaultState();
      setTimeout(() => {
        setSuccess(null);
        setTxHash(null);
      }, 5000);
    }
  }, [txConfirmed]);
  
  const fetchVaultState = async () => {
    if (!publicClient) return;
    setLoading(true);
    
    try {
      const [cycleCount, portfolioLen, autoEnabled, lastDeploy, owner, vaultEth] = await Promise.all([
        publicClient.readContract({ address: VAULT_ADDR, abi: VAULT_ABI, functionName: 'cycleCount' }),
        publicClient.readContract({ address: VAULT_ADDR, abi: VAULT_ABI, functionName: 'getPortfolioLength' }),
        publicClient.readContract({ address: VAULT_ADDR, abi: VAULT_ABI, functionName: 'automationEnabled' }),
        publicClient.readContract({ address: VAULT_ADDR, abi: VAULT_ABI, functionName: 'lastDeployTime' }),
        publicClient.readContract({ address: VAULT_ADDR, abi: VAULT_ABI, functionName: 'owner' }),
        publicClient.getBalance({ address: VAULT_ADDR }),
      ]);
      
      // Try checkUpkeep
      let checkUpkeepResult = null;
      let checkUpkeepError = null;
      try {
        const [upkeepNeeded] = await publicClient.readContract({
          address: VAULT_ADDR,
          abi: VAULT_ABI,
          functionName: 'checkUpkeep',
          args: ['0x'],
        });
        checkUpkeepResult = upkeepNeeded;
      } catch (err: any) {
        checkUpkeepError = err.message || 'checkUpkeep reverted';
      }
      
      setVaultState({
        cycleCount: Number(cycleCount),
        portfolioLen: Number(portfolioLen),
        autoEnabled,
        lastDeploy: Number(lastDeploy),
        owner,
        vaultEth: formatEther(vaultEth),
        checkUpkeepResult,
        checkUpkeepError,
      });
    } catch (err: any) {
      setError('Failed to fetch vault state: ' + (err.message || err));
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchVaultState();
  }, [publicClient]);
  
  const handleEnableAutomation = async () => {
    if (!isOwner) {
      setError('Only the vault owner can execute this');
      return;
    }
    
    try {
      setError(null);
      const hash = await writeContractAsync({
        address: VAULT_ADDR,
        abi: VAULT_ABI,
        functionName: 'setAutomationEnabled',
        args: [true],
      });
      setTxHash(hash);
    } catch (err: any) {
      setError(err.message || 'Transaction failed');
    }
  };
  
  const handleSetPortfolio = async () => {
    if (!isOwner) {
      setError('Only the vault owner can execute this');
      return;
    }
    
    try {
      setError(null);
      const hash = await writeContractAsync({
        address: VAULT_ADDR,
        abi: VAULT_ABI,
        functionName: 'setPortfolio',
        args: [PORTFOLIO_TOKENS, PORTFOLIO_WEIGHTS, PORTFOLIO_FEES],
      });
      setTxHash(hash);
    } catch (err: any) {
      setError(err.message || 'Transaction failed');
    }
  };
  
  const handleTriggerTrade = async () => {
    try {
      setError(null);
      const hash = await writeContractAsync({
        address: VAULT_ADDR,
        abi: VAULT_ABI,
        functionName: 'performUpkeep',
        args: ['0x'],
      });
      setTxHash(hash);
    } catch (err: any) {
      setError(err.message || 'Transaction failed');
    }
  };
  
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a1a', color: '#fff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <SimpleHeader />
      
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 20px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 10, background: 'linear-gradient(90deg, #ef4444, #f59e0b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            🚨 Emergency Vault Rescue
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>
            Fix AI trading by configuring the vault contract directly
          </p>
        </div>
        
        {!address && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 16, padding: 30, textAlign: 'center', marginBottom: 30 }}>
            <AlertTriangle size={48} color="#ef4444" style={{ marginBottom: 15 }} />
            <h3 style={{ marginBottom: 10 }}>Connect Wallet First</h3>
            <p style={{ color: 'rgba(255,255,255,0.5)', marginBottom: 20 }}>
              You must connect the vault owner wallet to fix the contract
            </p>
            <button 
              onClick={() => open()}
              style={{ padding: '12px 24px', borderRadius: 8, background: '#6366f1', color: '#fff', border: 'none', fontWeight: 600, cursor: 'pointer' }}
            >
              Connect Wallet
            </button>
          </div>
        )}
        
        {address && !isOwner && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 16, padding: 30, marginBottom: 30 }}>
            <AlertTriangle size={32} color="#ef4444" style={{ marginBottom: 15 }} />
            <h3 style={{ color: '#ef4444', marginBottom: 10 }}>⚠️ Wrong Wallet</h3>
            <p style={{ color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
              Connected: <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 4 }}>{address}</code><br/>
              Required (Owner): <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: 4 }}>{OWNER_ADDR}</code>
            </p>
            <p style={{ color: 'rgba(255,255,255,0.5)', marginTop: 15, fontSize: 13 }}>
              You must connect with the vault owner wallet to execute rescue functions.
            </p>
          </div>
        )}
        
        {address && isOwner && (
          <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 16, padding: 20, marginBottom: 30, display: 'flex', alignItems: 'center', gap: 12 }}>
            <CheckCircle size={24} color="#22c55e" />
            <span style={{ color: '#22c55e', fontWeight: 600 }}>
              ✅ Vault owner wallet connected
            </span>
          </div>
        )}
        
        {/* Vault State */}
        <div style={{ background: 'rgba(13,13,32,0.85)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 30, marginBottom: 30 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Current Vault State</h2>
            <button 
              onClick={fetchVaultState}
              disabled={loading}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8', fontSize: 12, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>
          
          {vaultState && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 15 }}>
              <div style={{ padding: 15, background: 'rgba(255,255,255,0.03)', borderRadius: 12 }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 5 }}>Cycle Count</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: vaultState.cycleCount > 0 ? '#22c55e' : '#ef4444' }}>
                  {vaultState.cycleCount}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                  {vaultState.cycleCount > 0 ? '✅ Trading Active' : '❌ No Trades Ever'}
                </div>
              </div>
              
              <div style={{ padding: 15, background: 'rgba(255,255,255,0.03)', borderRadius: 12 }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 5 }}>Portfolio Assets</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: vaultState.portfolioLen >= 27 ? '#22c55e' : '#f59e0b' }}>
                  {vaultState.portfolioLen}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                  {vaultState.portfolioLen >= 27 ? '✅ Configured' : '⚠️ Incomplete (need 27)'}
                </div>
              </div>
              
              <div style={{ padding: 15, background: 'rgba(255,255,255,0.03)', borderRadius: 12 }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 5 }}>Automation</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: vaultState.autoEnabled ? '#22c55e' : '#ef4444' }}>
                  {vaultState.autoEnabled ? 'ON' : 'OFF'}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                  {vaultState.autoEnabled ? '✅ Enabled' : '❌ Disabled'}
                </div>
              </div>
              
              <div style={{ padding: 15, background: 'rgba(255,255,255,0.03)', borderRadius: 12 }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 5 }}>Vault ETH</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: parseFloat(vaultState.vaultEth) > 0.01 ? '#22c55e' : '#ef4444' }}>
                  {parseFloat(vaultState.vaultEth).toFixed(4)}
                </div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>
                  {parseFloat(vaultState.vaultEth) > 0.01 ? '✅ Sufficient' : '❌ Need >0.01'}
                </div>
              </div>
              
              <div style={{ padding: 15, background: 'rgba(255,255,255,0.03)', borderRadius: 12, gridColumn: '1 / -1' }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 5 }}>checkUpkeep() Status</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: vaultState.checkUpkeepError ? '#ef4444' : vaultState.checkUpkeepResult ? '#22c55e' : '#f59e0b' }}>
                  {vaultState.checkUpkeepError 
                    ? `❌ REVERTS: ${vaultState.checkUpkeepError.slice(0, 50)}...`
                    : vaultState.checkUpkeepResult 
                      ? '✅ Returns TRUE (will trade)'
                      : '⚠️ Returns FALSE (conditions not met)'
                  }
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Error/Success Messages */}
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, padding: 15, marginBottom: 20, color: '#ef4444' }}>
            {error}
          </div>
        )}
        
        {success && (
          <div style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 12, padding: 15, marginBottom: 20, color: '#22c55e' }}>
            {success}
          </div>
        )}
        
        {txHash && (
          <div style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.3)', borderRadius: 12, padding: 15, marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <RefreshCw size={16} color="#818cf8" />
              <span style={{ color: '#818cf8' }}>Transaction pending...</span>
            </div>
            <a 
              href={`https://etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#818cf8', fontSize: 12, textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              View on Etherscan <ExternalLink size={12} />
            </a>
          </div>
        )}
        
        {/* Action Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          
          <div style={{ background: 'rgba(13,13,32,0.85)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 25 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>1️⃣</span>
              Configure Portfolio
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 15, lineHeight: 1.5 }}>
              Set all 27 portfolio assets with proper weights. This fixes the checkUpkeep() revert.
            </p>
            <button
              onClick={handleSetPortfolio}
              disabled={!isOwner || loading}
              style={{
                width: '100%',
                padding: '14px 20px',
                borderRadius: 10,
                background: isOwner ? '#7c3aed' : 'rgba(255,255,255,0.1)',
                color: '#fff',
                border: 'none',
                fontWeight: 700,
                cursor: isOwner ? 'pointer' : 'not-allowed',
                opacity: isOwner ? 1 : 0.5,
              }}
            >
              {isOwner ? 'Set Portfolio (27 Assets)' : 'Connect Owner Wallet'}
            </button>
          </div>
          
          <div style={{ background: 'rgba(13,13,32,0.85)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 20, padding: 25 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>2️⃣</span>
              Enable Automation
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 15, lineHeight: 1.5 }}>
              Turn on Chainlink Automation so trades execute automatically.
            </p>
            <button
              onClick={handleEnableAutomation}
              disabled={!isOwner || loading}
              style={{
                width: '100%',
                padding: '14px 20px',
                borderRadius: 10,
                background: isOwner ? '#059669' : 'rgba(255,255,255,0.1)',
                color: '#fff',
                border: 'none',
                fontWeight: 700,
                cursor: isOwner ? 'pointer' : 'not-allowed',
                opacity: isOwner ? 1 : 0.5,
              }}
            >
              {isOwner ? 'Enable Automation' : 'Connect Owner Wallet'}
            </button>
          </div>
          
          <div style={{ background: 'rgba(13,13,32,0.85)', border: '2px solid #f59e0b', borderRadius: 20, padding: 25 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Zap size={20} color="#f59e0b" />
              Trigger First Trade (Emergency)
            </h3>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, marginBottom: 15, lineHeight: 1.5 }}>
              Manually trigger performUpkeep() to execute the first trade. Anyone can call this!
            </p>
            <button
              onClick={handleTriggerTrade}
              disabled={!address || loading}
              style={{
                width: '100%',
                padding: '14px 20px',
                borderRadius: 10,
                background: address ? '#f59e0b' : 'rgba(255,255,255,0.1)',
                color: '#000',
                border: 'none',
                fontWeight: 700,
                cursor: address ? 'pointer' : 'not-allowed',
                opacity: address ? 1 : 0.5,
              }}
            >
              {address ? '🚀 Trigger performUpkeep()' : 'Connect Wallet'}
            </button>
          </div>
          
        </div>
        
        <div style={{ marginTop: 40, padding: 20, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6 }}>
          <strong style={{ color: '#ef4444' }}>⚠️ Important:</strong><br/>
          • Only the vault owner (0x4e7d...E746) can configure the portfolio<br/>
          • Anyone can trigger performUpkeep() once configured<br/>
          • Each trade costs ~0.003 ETH in gas<br/>
          • The vault needs >0.01 ETH to execute trades
        </div>
      </div>
    </div>
  );
}
