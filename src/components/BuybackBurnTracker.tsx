import React, { useState, useEffect } from 'react';
import { Flame, TrendingUp, PiggyBank, Activity, ArrowUpRight } from 'lucide-react';

// ── Buyback & Burn Tracker UI Component ─────────────────────────────────────
// Real-time fee distribution tracking

interface FeeData {
  fees: {
    totalCollected: string;
    pendingDistribution: string;
    distributionCount: number;
  };
  distribution: {
    buybacks: {
      eth: string;
      percentage: number;
      destination: string;
    };
    burns: {
      eth: string;
      percentage: number;
      destination: string;
    };
    treasury: {
      eth: string;
      percentage: number;
      destination: string;
    };
  };
  token: {
    totalSupply: string;
    burned: string;
    circulating: string;
    burnPercentage: number;
  };
}

export default function BuybackBurnTracker() {
  const [data, setData] = useState<FeeData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchFeeData = async () => {
    try {
      const res = await fetch('/api/inquisitiveAI/fees');
      if (!res.ok) throw new Error('Failed to fetch');
      const feeData = await res.json();
      setData(feeData);
    } catch (err) {
      console.error('Failed to fetch fee data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeeData();
    const interval = setInterval(fetchFeeData, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div style={{
        background: 'rgba(13,13,32,0.8)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 24,
        padding: 32,
        textAlign: 'center'
      }}>
        <div style={{ color: 'rgba(255,255,255,0.6)' }}>Loading fee data...</div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(13,13,32,0.95) 0%, rgba(48,24,24,0.9) 100%)',
      border: '1px solid rgba(239,68,68,0.3)',
      borderRadius: 24,
      padding: 32,
      backdropFilter: 'blur(20px)',
      maxWidth: 900,
      margin: '0 auto'
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 12,
          background: 'linear-gradient(135deg, #ef4444 0%, #f97316 100%)',
          padding: '12px 24px',
          borderRadius: 50,
          marginBottom: 16
        }}>
          <Flame size={24} color="white" />
          <span style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>
            Buyback & Burn Tracker
          </span>
        </div>
        
        <h2 style={{ fontSize: 28, fontWeight: 800, color: 'white', margin: '0 0 8px' }}>
          Deflationary Value Accrual
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0 }}>
          60% buybacks for stakers • 20% permanently burned • 20% treasury
        </p>
      </div>

      {/* Distribution Breakdown */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 16,
        marginBottom: 32
      }}>
        {/* Buybacks */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(52,211,153,0.1))',
          border: '1px solid rgba(16,185,129,0.3)',
          borderRadius: 16,
          padding: 24,
          textAlign: 'center'
        }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            background: 'rgba(16,185,129,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px'
          }}>
            <TrendingUp size={24} color="#10b981" />
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#10b981' }}>
            60%
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'white', marginBottom: 4 }}>
            Buybacks
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
            To Staking Rewards
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#10b981', marginTop: 8 }}>
            {parseFloat(data?.distribution.buybacks.eth || '0').toFixed(2)} ETH
          </div>
        </div>

        {/* Burns */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(249,115,22,0.1))',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 16,
          padding: 24,
          textAlign: 'center'
        }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            background: 'rgba(239,68,68,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px'
          }}>
            <Flame size={24} color="#ef4444" />
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#ef4444' }}>
            20%
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'white', marginBottom: 4 }}>
            Burned
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
            Permanently Removed
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#ef4444', marginTop: 8 }}>
            {parseFloat(data?.distribution.burns.eth || '0').toFixed(2)} ETH
          </div>
        </div>

        {/* Treasury */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.1))',
          border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: 16,
          padding: 24,
          textAlign: 'center'
        }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            background: 'rgba(99,102,241,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px'
          }}>
            <PiggyBank size={24} color="#818cf8" />
          </div>
          <div style={{ fontSize: 32, fontWeight: 800, color: '#818cf8' }}>
            20%
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'white', marginBottom: 4 }}>
            Treasury
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
            Operations
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#818cf8', marginTop: 8 }}>
            {parseFloat(data?.distribution.treasury.eth || '0').toFixed(2)} ETH
          </div>
        </div>
      </div>

      {/* Stats Row */}
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
          <Activity size={20} color="#ef4444" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 20, fontWeight: 700, color: 'white' }}>
            {parseFloat(data?.fees.totalCollected || '0').toFixed(2)} ETH
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Total Fees</div>
        </div>
        
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          padding: 20,
          borderRadius: 12,
          textAlign: 'center'
        }}>
          <ArrowUpRight size={20} color="#f97316" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 20, fontWeight: 700, color: 'white' }}>
            {data?.fees.distributionCount || 0}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Distributions</div>
        </div>
        
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          padding: 20,
          borderRadius: 12,
          textAlign: 'center'
        }}>
          <Flame size={20} color="#ef4444" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 20, fontWeight: 700, color: '#ef4444' }}>
            {parseFloat(data?.token.burned || '0').toLocaleString(undefined, {maximumFractionDigits: 0})}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>INQAI Burned</div>
        </div>
        
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          padding: 20,
          borderRadius: 12,
          textAlign: 'center'
        }}>
          <TrendingUp size={20} color="#10b981" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 20, fontWeight: 700, color: '#10b981' }}>
            {data?.token.burnPercentage.toFixed(2) || '0'}%
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Supply Burned</div>
        </div>
      </div>

      {/* Progress Bars */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'white', margin: '0 0 16px' }}>
          Fee Distribution Progress
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Buybacks Bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
              <span style={{ color: '#10b981' }}>Buybacks to Stakers (60%)</span>
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>
                {parseFloat(data?.distribution.buybacks.eth || '0').toFixed(2)} ETH
              </span>
            </div>
            <div style={{
              height: 8,
              background: 'rgba(255,255,255,0.1)',
              borderRadius: 4,
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: '60%',
                background: '#10b981',
                borderRadius: 4
              }} />
            </div>
          </div>

          {/* Burns Bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
              <span style={{ color: '#ef4444' }}>Permanently Burned (20%)</span>
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>
                {parseFloat(data?.distribution.burns.eth || '0').toFixed(2)} ETH
              </span>
            </div>
            <div style={{
              height: 8,
              background: 'rgba(255,255,255,0.1)',
              borderRadius: 4,
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: '20%',
                background: '#ef4444',
                borderRadius: 4
              }} />
            </div>
          </div>

          {/* Treasury Bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
              <span style={{ color: '#818cf8' }}>Treasury (20%)</span>
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>
                {parseFloat(data?.distribution.treasury.eth || '0').toFixed(2)} ETH
              </span>
            </div>
            <div style={{
              height: 8,
              background: 'rgba(255,255,255,0.1)',
              borderRadius: 4,
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                width: '20%',
                background: '#818cf8',
                borderRadius: 4
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* Info */}
      <div style={{
        background: 'rgba(239,68,68,0.1)',
        border: '1px solid rgba(239,68,68,0.3)',
        borderRadius: 12,
        padding: 16
      }}>
        <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
          <strong style={{ color: '#ef4444' }}>Deflationary Mechanics:</strong><br />
          Protocol fees are automatically distributed: 60% buys INQAI for staker rewards, 
          20% is permanently burned (reducing supply forever), 20% funds ongoing operations. 
          This creates sustained buy pressure while making INQAI increasingly scarce.
        </p>
      </div>
    </div>
  );
}
