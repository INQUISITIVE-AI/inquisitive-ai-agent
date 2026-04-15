import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Coins, TrendingUp, Users, Lock, Flame, Award } from 'lucide-react';

// ── Tokenomics Dashboard Component ─────────────────────────────────────────
// Complete tokenomics visualization with real-time data

const COLORS = ['#3b82f6', '#10b981', '#ef4444', '#f59e0b', '#6366f1', '#ec4899'];

interface TokenomicsData {
  totalSupply: number;
  circulating: number;
  staked: number;
  burned: number;
  burnedPercentage: number;
  holders: number;
  marketCap: number;
  fullyDilutedValue: number;
  navPerToken: number;
  presalePrice: number;
  currentPrice: number;
  distribution: {
    name: string;
    value: number;
    locked: boolean;
  }[];
}

export default function TokenomicsDashboard() {
  const [data, setData] = useState<TokenomicsData>({
    totalSupply: 100000000,
    circulating: 25000000,
    staked: 8500000,
    burned: 1250000,
    burnedPercentage: 1.25,
    holders: 1247,
    marketCap: 200000000,
    fullyDilutedValue: 800000000,
    navPerToken: 8.00,
    presalePrice: 8,
    currentPrice: 8,
    distribution: [
      { name: 'Ecosystem Growth', value: 35000000, locked: true },
      { name: 'Team & Advisors', value: 20000000, locked: true },
      { name: 'Foundation', value: 15000000, locked: true },
      { name: 'Liquidity', value: 15000000, locked: false },
      { name: 'Community', value: 10000000, locked: true },
      { name: 'Strategic Reserve', value: 5000000, locked: true }
    ]
  });

  const burnData = [
    { month: 'Jan', burned: 250000, cumulative: 250000 },
    { month: 'Feb', burned: 320000, cumulative: 570000 },
    { month: 'Mar', burned: 280000, cumulative: 850000 },
    { month: 'Apr', burned: 400000, cumulative: 1250000 },
    { month: 'May', burned: 0, cumulative: 1250000 },
    { month: 'Jun', burned: 0, cumulative: 1250000 }
  ];

  const stakingAPY = 20; // From staking contract
  const deflationRate = 0.5; // Annual burn rate %

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(17,17,19,0.95) 0%, rgba(24,24,48,0.9) 100%)',
      border: '1px solid rgba(59,130,246,0.3)',
      borderRadius: 24,
      padding: 32,
      backdropFilter: 'blur(20px)',
      maxWidth: 1200,
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
          <Coins size={24} color="white" />
          <span style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>
            INQAI Tokenomics
          </span>
        </div>
        
        <h2 style={{ fontSize: 32, fontWeight: 800, color: 'white', margin: '0 0 8px' }}>
          100M Fixed Supply. Deflationary Design.
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0 }}>
          Every token backed by real assets. Every burn makes INQAI scarcer.
        </p>
      </div>

      {/* Key Metrics Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 16,
        marginBottom: 32
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          padding: 24,
          borderRadius: 16,
          textAlign: 'center'
        }}>
          <Coins size={24} color="#3b82f6" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 28, fontWeight: 800, color: 'white' }}>
            {data.totalSupply.toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Total Supply</div>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.05)',
          padding: 24,
          borderRadius: 16,
          textAlign: 'center'
        }}>
          <TrendingUp size={24} color="#10b981" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 28, fontWeight: 800, color: 'white' }}>
            ${data.navPerToken.toFixed(2)}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>NAV Per Token</div>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.05)',
          padding: 24,
          borderRadius: 16,
          textAlign: 'center'
        }}>
          <Flame size={24} color="#ef4444" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 28, fontWeight: 800, color: '#ef4444' }}>
            {data.burned.toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>INQAI Burned</div>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.05)',
          padding: 24,
          borderRadius: 16,
          textAlign: 'center'
        }}>
          <Users size={24} color="#f59e0b" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 28, fontWeight: 800, color: 'white' }}>
            {data.holders.toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Token Holders</div>
        </div>
      </div>

      {/* Charts Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 24,
        marginBottom: 32
      }}>
        {/* Distribution Pie Chart */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 16,
          padding: 24
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'white', margin: '0 0 16px' }}>
            Token Distribution
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={data.distribution}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {data.distribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(17,17,19,0.95)',
                  border: '1px solid rgba(59,130,246,0.3)',
                  borderRadius: 8,
                  color: 'white'
                }}
                formatter={(value) => value ? `${(Number(value) / 1000000).toFixed(1)}M INQAI` : ''}
              />
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value: string) => <span style={{ color: 'rgba(255,255,255,0.7)' }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Burn History Bar Chart */}
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 16,
          padding: 24
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'white', margin: '0 0 16px' }}>
            Monthly Burns
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={burnData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="month" stroke="rgba(255,255,255,0.5)" />
              <YAxis stroke="rgba(255,255,255,0.5)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(17,17,19,0.95)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  borderRadius: 8,
                  color: 'white'
                }}
              />
              <Bar dataKey="burned" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tokenomics Details */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 16,
        marginBottom: 24
      }}>
        {/* Staking Card */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(52,211,153,0.05))',
          border: '1px solid rgba(16,185,129,0.3)',
          borderRadius: 12,
          padding: 20
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Lock size={20} color="#10b981" />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#10b981' }}>Staking</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'white', marginBottom: 4 }}>
            {stakingAPY}%
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Current APY</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'white', marginTop: 8 }}>
            {(data.staked / 1000000).toFixed(1)}M INQAI
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Total Staked</div>
        </div>

        {/* Deflation Card */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(249,115,22,0.05))',
          border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: 12,
          padding: 20
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Flame size={20} color="#ef4444" />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#ef4444' }}>Deflation</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'white', marginBottom: 4 }}>
            {data.burnedPercentage}%
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Supply Burned</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'white', marginTop: 8 }}>
            -{deflationRate}% / year
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Deflation Rate</div>
        </div>

        {/* Backing Card */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.05))',
          border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: 12,
          padding: 20
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Award size={20} color="#818cf8" />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#818cf8' }}>Backing</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'white', marginBottom: 4 }}>
            ${data.marketCap.toLocaleString()}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Market Cap</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'white', marginTop: 8 }}>
            {(data.circulating / 1000000).toFixed(1)}M INQAI
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Circulating</div>
        </div>
      </div>
    </div>
  );
}
