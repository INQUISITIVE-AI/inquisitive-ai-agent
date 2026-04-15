import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { Rocket, Users, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react';

// ── Liquidity Launcher UI Component ─────────────────────────────────────────
// Community-funded presale with $10K auto-launch threshold

const LAUNCHER_CONTRACT = process.env.NEXT_PUBLIC_LAUNCHER_CONTRACT || '';
const TEAM_WALLET = '0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746';

const LAUNCHER_ABI = [
  'function deposit() payable',
  'function getUsdValue(uint256 ethAmount) view returns (uint256)',
  'function canLaunch() view returns (bool)',
  'function launchProgress() view returns (uint256)',
  'function totalEthRaised() view returns (uint256)',
  'function totalUsdValue() view returns (uint256)',
  'function launched() view returns (bool)',
  'function poolAddress() view returns (address)',
  'function getBuyerInfo(address buyer) view returns (uint256 ethContributed, uint256 usdValue, uint256 inqaiShare, bool hasClaimed)',
  'function claim()',
  'event Deposited(address indexed buyer, uint256 ethAmount, uint256 usdValue)',
  'event LaunchTriggered(uint256 ethAmount, uint256 inqaiAmount, address pool)'
];

interface LauncherStats {
  totalEthRaised: string;
  totalUsdValue: string;
  progress: number;
  canLaunch: boolean;
  launched: boolean;
  poolAddress: string;
  buyerCount: number;
}

interface UserStats {
  contributed: string;
  usdValue: string;
  inqaiShare: string;
  canClaim: boolean;
}

export default function LiquidityLauncher() {
  const [stats, setStats] = useState<LauncherStats | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [depositAmount, setDepositAmount] = useState('0.1');
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState('');

  // Connect wallet
  const connectWallet = async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      alert('Please install MetaMask');
      return;
    }
    
    try {
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const accounts = await provider.send('eth_requestAccounts', []);
      setAddress(accounts[0]);
      setConnected(true);
    } catch (err) {
      console.error('Connection failed:', err);
    }
  };

  // Fetch launcher stats
  const fetchStats = async () => {
    if (!LAUNCHER_CONTRACT) return;
    
    try {
      const provider = new ethers.JsonRpcProvider('https://eth-mainnet.g.alchemy.com/v2/demo');
      const launcher = new ethers.Contract(LAUNCHER_CONTRACT, LAUNCHER_ABI, provider);
      
      const [totalEth, totalUsd, progress, canLaunch, launched, pool] = await Promise.all([
        launcher.totalEthRaised().catch(() => 0n),
        launcher.totalUsdValue().catch(() => 0n),
        launcher.launchProgress().catch(() => 0n),
        launcher.canLaunch().catch(() => false),
        launcher.launched().catch(() => false),
        launcher.poolAddress().catch(() => '0x0000000000000000000000000000000000000000')
      ]);

      setStats({
        totalEthRaised: ethers.formatEther(totalEth),
        totalUsdValue: ethers.formatUnits(totalUsd, 18),
        progress: Number(progress),
        canLaunch,
        launched,
        poolAddress: pool,
        buyerCount: 0 // Would need separate query
      });
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  };

  // Fetch user stats
  const fetchUserStats = async () => {
    if (!LAUNCHER_CONTRACT || !address) return;
    
    try {
      const provider = new ethers.JsonRpcProvider('https://eth-mainnet.g.alchemy.com/v2/demo');
      const launcher = new ethers.Contract(LAUNCHER_CONTRACT, LAUNCHER_ABI, provider);
      
      const [info] = await Promise.all([
        launcher.getBuyerInfo(address).catch(() => [0n, 0n, 0n, false])
      ]);

      setUserStats({
        contributed: ethers.formatEther(info[0]),
        usdValue: ethers.formatUnits(info[1], 18),
        inqaiShare: ethers.formatUnits(info[2], 18),
        canClaim: info[0] > 0n && !info[3]
      });
    } catch (err) {
      console.error('Failed to fetch user stats:', err);
    }
  };

  // Deposit ETH
  const deposit = async () => {
    if (!LAUNCHER_CONTRACT || !connected) return;
    
    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();
      const launcher = new ethers.Contract(LAUNCHER_CONTRACT, LAUNCHER_ABI, signer);
      
      const tx = await launcher.deposit({
        value: ethers.parseEther(depositAmount)
      });
      
      await tx.wait();
      fetchStats();
      fetchUserStats();
    } catch (err) {
      console.error('Deposit failed:', err);
      alert('Deposit failed: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // Claim INQAI
  const claim = async () => {
    if (!LAUNCHER_CONTRACT || !connected) return;
    
    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum as any);
      const signer = await provider.getSigner();
      const launcher = new ethers.Contract(LAUNCHER_CONTRACT, LAUNCHER_ABI, signer);
      
      const tx = await launcher.claim();
      await tx.wait();
      
      fetchUserStats();
      alert('INQAI claimed successfully!');
    } catch (err) {
      console.error('Claim failed:', err);
      alert('Claim failed: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (connected) {
      fetchUserStats();
    }
  }, [connected, address]);

  const progressPercent = stats?.progress || 0;
  const targetUsd = 10000;
  const raisedUsd = parseFloat(stats?.totalUsdValue || '0');

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(17,17,19,0.95) 0%, rgba(37,24,64,0.9) 100%)',
      border: '1px solid rgba(59,130,246,0.3)',
      borderRadius: 24,
      padding: 32,
      backdropFilter: 'blur(20px)',
      maxWidth: 600,
      margin: '0 auto'
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 12,
          background: 'linear-gradient(135deg, #3b82f6 0%, #a855f7 100%)',
          padding: '12px 24px',
          borderRadius: 50,
          marginBottom: 16
        }}>
          <Rocket size={24} color="white" />
          <span style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>
            Community Liquidity Launch
          </span>
        </div>
        
        <h2 style={{ fontSize: 28, fontWeight: 800, color: 'white', margin: '0 0 8px' }}>
          $10K → Uniswap V3
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0 }}>
          When $10,000 is raised, the INQAI/ETH pool auto-launches
        </p>
      </div>

      {/* Progress Bar */}
      <div style={{ marginBottom: 32 }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 8,
          fontSize: 14,
          color: 'rgba(255,255,255,0.6)'
        }}>
          <span>${raisedUsd.toLocaleString()} raised</span>
          <span>${targetUsd.toLocaleString()} target</span>
        </div>
        
        <div style={{
          height: 12,
          background: 'rgba(255,255,255,0.1)',
          borderRadius: 6,
          overflow: 'hidden'
        }}>
          <div style={{
            height: '100%',
            width: `${Math.min(progressPercent, 100)}%`,
            background: 'linear-gradient(90deg, #3b82f6, #a855f7)',
            borderRadius: 6,
            transition: 'width 0.5s ease'
          }} />
        </div>
        
        <div style={{
          textAlign: 'center',
          marginTop: 12,
          fontSize: 24,
          fontWeight: 800,
          color: '#a855f7'
        }}>
          {progressPercent.toFixed(1)}%
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 16,
        marginBottom: 32
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          padding: 16,
          borderRadius: 12,
          textAlign: 'center'
        }}>
          <TrendingUp size={20} color="#a855f7" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 20, fontWeight: 700, color: 'white' }}>
            {parseFloat(stats?.totalEthRaised || '0').toFixed(2)} ETH
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Raised</div>
        </div>
        
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          padding: 16,
          borderRadius: 12,
          textAlign: 'center'
        }}>
          <Users size={20} color="#10b981" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 20, fontWeight: 700, color: 'white' }}>
            ${raisedUsd.toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>USD Value</div>
        </div>
        
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          padding: 16,
          borderRadius: 12,
          textAlign: 'center'
        }}>
          <Clock size={20} color="#f59e0b" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 20, fontWeight: 700, color: 'white' }}>
            {stats?.launched ? 'Live' : 'Pending'}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Status</div>
        </div>
      </div>

      {/* User Section */}
      {!connected ? (
        <button
          onClick={connectWallet}
          style={{
            width: '100%',
            padding: '16px 24px',
            background: 'linear-gradient(135deg, #3b82f6, #a855f7)',
            border: 'none',
            borderRadius: 12,
            color: 'white',
            fontSize: 16,
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          Connect Wallet to Participate
        </button>
      ) : stats?.launched ? (
        <div>
          {userStats && parseFloat(userStats.contributed) > 0 && (
            <div style={{
              background: 'rgba(16,185,129,0.1)',
              border: '1px solid rgba(16,185,129,0.3)',
              padding: 20,
              borderRadius: 12,
              marginBottom: 16
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <CheckCircle size={20} color="#10b981" />
                <span style={{ color: '#10b981', fontWeight: 700 }}>Pool Launched!</span>
              </div>
              <p style={{ color: 'rgba(255,255,255,0.7)', margin: '0 0 16px', fontSize: 14 }}>
                You contributed {parseFloat(userStats.contributed).toFixed(4)} ETH 
                (${parseFloat(userStats.usdValue).toFixed(2)}). 
                Your INQAI share: {parseFloat(userStats.inqaiShare).toFixed(2)} INQAI
              </p>
              {userStats.canClaim && (
                <button
                  onClick={claim}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px 24px',
                    background: '#10b981',
                    border: 'none',
                    borderRadius: 8,
                    color: 'white',
                    fontWeight: 700,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.7 : 1
                  }}
                >
                  {loading ? 'Claiming...' : 'Claim Your INQAI'}
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <div>
          {/* Deposit Form */}
          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', marginBottom: 8, fontSize: 14 }}>
              ETH Amount to Deposit
            </label>
            <div style={{ display: 'flex', gap: 12 }}>
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                step="0.01"
                min="0.01"
                style={{
                  flex: 1,
                  padding: '16px',
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 12,
                  color: 'white',
                  fontSize: 18,
                  fontWeight: 700
                }}
              />
              <button
                onClick={deposit}
                disabled={loading || parseFloat(depositAmount) <= 0}
                style={{
                  padding: '16px 32px',
                  background: 'linear-gradient(135deg, #3b82f6, #a855f7)',
                  border: 'none',
                  borderRadius: 12,
                  color: 'white',
                  fontSize: 16,
                  fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading || parseFloat(depositAmount) <= 0 ? 0.7 : 1
                }}
              >
                {loading ? 'Depositing...' : 'Deposit ETH'}
              </button>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 8 }}>
              Min: 0.01 ETH | You receive INQAI at $8/token when pool launches
            </p>
          </div>

          {/* User contribution */}
          {userStats && parseFloat(userStats.contributed) > 0 && (
            <div style={{
              background: 'rgba(59,130,246,0.1)',
              border: '1px solid rgba(59,130,246,0.3)',
              padding: 16,
              borderRadius: 12,
              marginBottom: 16
            }}>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 4 }}>
                Your Contribution
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'white' }}>
                {parseFloat(userStats.contributed).toFixed(4)} ETH
              </div>
              <div style={{ fontSize: 14, color: '#a855f7' }}>
                Estimated: {parseFloat(userStats.inqaiShare).toFixed(2)} INQAI
              </div>
            </div>
          )}
        </div>
      )}

      {/* Info Box */}
      <div style={{
        background: 'rgba(245,158,11,0.1)',
        border: '1px solid rgba(245,158,11,0.3)',
        borderRadius: 12,
        padding: 16,
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start'
      }}>
        <AlertCircle size={20} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
          <strong style={{ color: '#f59e0b' }}>How it works:</strong><br />
          1. Community deposits ETH to reach $10K<br />
          2. Contract auto-creates INQAI/ETH pool on Uniswap V3<br />
          3. Contributors claim INQAI proportional to deposit<br />
          4. Trading begins immediately — no team intervention
        </div>
      </div>
    </div>
  );
}
