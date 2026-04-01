import React, { useState, useEffect } from 'react';
import { Lock, TrendingUp, Gift, Clock, Wallet, AlertCircle } from 'lucide-react';

// ── Staking Dashboard UI Component ─────────────────────────────────────────
// INQAI staking with rewards distribution

interface StakingStats {
  totalStaked: string;
  totalStakers: number;
  apy: number;
  totalRewards: string;
  stakingRatio: number;
  userStaked?: string;
  userRewards?: string;
  lockEndTime?: number;
  canUnstake?: boolean;
}

export default function StakingDashboard() {
  const [stats, setStats] = useState<StakingStats | null>(null);
  const [stakeAmount, setStakeAmount] = useState('1000');
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);

  // Fetch staking stats
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/inquisitiveAI/staking');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setStats({
        totalStaked: data.global.totalStaked,
        totalStakers: data.global.totalStakers,
        apy: data.global.apy,
        totalRewards: data.global.totalRewardsDistributed,
        stakingRatio: data.global.stakingRatio,
        userStaked: data.user?.stakedAmount,
        userRewards: data.user?.pendingReward,
        lockEndTime: data.user?.lockEndTime,
        canUnstake: data.user?.canUnstake
      });
    } catch (err) {
      console.error('Failed to fetch staking stats:', err);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const estimatedDailyReward = stats?.apy && stakeAmount
    ? (parseFloat(stakeAmount) * stats.apy / 100 / 365).toFixed(2)
    : '0';

  const estimatedMonthlyReward = stats?.apy && stakeAmount
    ? (parseFloat(stakeAmount) * stats.apy / 100 / 12).toFixed(2)
    : '0';

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(13,13,32,0.95) 0%, rgba(22,40,30,0.9) 100%)',
      border: '1px solid rgba(16,185,129,0.3)',
      borderRadius: 24,
      padding: 32,
      backdropFilter: 'blur(20px)',
      maxWidth: 800,
      margin: '0 auto'
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 12,
          background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
          padding: '12px 24px',
          borderRadius: 50,
          marginBottom: 16
        }}>
          <Lock size={24} color="white" />
          <span style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>
            INQAI Staking
          </span>
        </div>
        
        <h2 style={{ fontSize: 28, fontWeight: 800, color: 'white', margin: '0 0 8px' }}>
          Earn Protocol Rewards
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0 }}>
          Stake INQAI to earn 60% of protocol fees — auto-compounded
        </p>
      </div>

      {/* APY Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(52,211,153,0.1))',
        border: '1px solid rgba(16,185,129,0.3)',
        borderRadius: 16,
        padding: 24,
        textAlign: 'center',
        marginBottom: 32
      }}>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>
          Current APY
        </div>
        <div style={{ fontSize: 48, fontWeight: 800, color: '#10b981' }}>
          {stats?.apy?.toFixed(1) || '20.0'}%
        </div>
        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>
          Rewards distributed from protocol buybacks
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 16,
        marginBottom: 32
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          padding: 20,
          borderRadius: 12,
          textAlign: 'center'
        }}>
          <Wallet size={20} color="#10b981" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>
            {parseFloat(stats?.totalStaked || '0').toLocaleString(undefined, {maximumFractionDigits: 0})}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Total Staked</div>
        </div>
        
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          padding: 20,
          borderRadius: 12,
          textAlign: 'center'
        }}>
          <TrendingUp size={20} color="#34d399" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>
            {stats?.totalStakers || 0}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Stakers</div>
        </div>
        
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          padding: 20,
          borderRadius: 12,
          textAlign: 'center'
        }}>
          <Gift size={20} color="#a78bfa" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>
            {parseFloat(stats?.totalRewards || '0').toLocaleString(undefined, {maximumFractionDigits: 0})}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Rewards Paid</div>
        </div>
        
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          padding: 20,
          borderRadius: 12,
          textAlign: 'center'
        }}>
          <Lock size={20} color="#f59e0b" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 18, fontWeight: 700, color: 'white' }}>
            {stats?.stakingRatio?.toFixed(1) || '0'}%
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Supply Staked</div>
        </div>
      </div>

      {/* Calculator */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 16,
        padding: 24,
        marginBottom: 24
      }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'white', margin: '0 0 16px' }}>
          Rewards Calculator
        </h3>
        
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', color: 'rgba(255,255,255,0.6)', marginBottom: 8, fontSize: 14 }}>
            Stake Amount (INQAI)
          </label>
          <input
            type="number"
            value={stakeAmount}
            onChange={(e) => setStakeAmount(e.target.value)}
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              color: 'white',
              fontSize: 16
            }}
          />
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12
        }}>
          <div style={{ textAlign: 'center', padding: 12, background: 'rgba(16,185,129,0.1)', borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Daily</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#10b981' }}>+{estimatedDailyReward}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>INQAI</div>
          </div>
          <div style={{ textAlign: 'center', padding: 12, background: 'rgba(16,185,129,0.1)', borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Monthly</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#10b981' }}>+{estimatedMonthlyReward}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>INQAI</div>
          </div>
          <div style={{ textAlign: 'center', padding: 12, background: 'rgba(16,185,129,0.1)', borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Yearly</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#10b981' }}>+{(parseFloat(estimatedMonthlyReward) * 12).toFixed(0)}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>INQAI</div>
          </div>
        </div>
      </div>

      {/* User Position */}
      {stats?.userStaked && parseFloat(stats.userStaked) > 0 && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(52,211,153,0.05))',
          border: '1px solid rgba(16,185,129,0.3)',
          borderRadius: 16,
          padding: 24,
          marginBottom: 24
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#10b981', margin: '0 0 16px' }}>
            Your Position
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
            marginBottom: 16
          }}>
            <div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Staked</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'white' }}>
                {parseFloat(stats.userStaked).toFixed(2)} INQAI
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Pending Rewards</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#10b981' }}>
                {parseFloat(stats.userRewards || '0').toFixed(2)} INQAI
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Lock Status</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: stats.canUnstake ? '#10b981' : '#f59e0b' }}>
                {stats.canUnstake ? 'Unlocked' : '7-day lock active'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <button
              disabled={!stats.canUnstake}
              style={{
                flex: 1,
                padding: '12px 24px',
                background: stats.canUnstake ? '#ef4444' : 'rgba(239,68,68,0.3)',
                border: 'none',
                borderRadius: 8,
                color: 'white',
                fontWeight: 700,
                cursor: stats.canUnstake ? 'pointer' : 'not-allowed'
              }}
            >
              Unstake
            </button>
            <button
              style={{
                flex: 1,
                padding: '12px 24px',
                background: '#10b981',
                border: 'none',
                borderRadius: 8,
                color: 'white',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Claim Rewards
            </button>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div style={{
        background: 'rgba(16,185,129,0.1)',
        border: '1px solid rgba(16,185,129,0.3)',
        borderRadius: 12,
        padding: 16,
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start'
      }}>
        <AlertCircle size={20} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
          <strong style={{ color: '#10b981' }}>How it works:</strong><br />
          • 60% of protocol fees buy INQAI on the open market<br />
          • Rewards auto-distribute to stakers proportionally<br />
          • 7-day lock period prevents manipulation<br />
          • Rewards auto-compound — no manual claiming needed
        </div>
      </div>
    </div>
  );
}
