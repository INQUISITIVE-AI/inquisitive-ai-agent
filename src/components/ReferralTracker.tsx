import React, { useState, useEffect } from 'react';
import { Users, Share2, Gift, Copy, CheckCircle, TrendingUp } from 'lucide-react';

// ── Referral Tracker UI Component ─────────────────────────────────────────
// Viral growth engine with 5% + 5% bonus structure

interface ReferralStats {
  totalReferrers: number;
  bonusPool: string;
  estimatedBonusPerEth: {
    referrer: string;
    referee: string;
  };
  isReferrer?: boolean;
  hasReferrer?: boolean;
  referralCount?: number;
  totalVolumeEth?: string;
  totalBonusEarned?: string;
  referralCode?: string;
}

export default function ReferralTracker() {
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referralInput, setReferralInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState('');

  // Fetch referral stats
  const fetchStats = async () => {
    try {
      const url = address 
        ? `/api/inquisitiveAI/referral?address=${address}`
        : '/api/inquisitiveAI/referral';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      
      setStats({
        totalReferrers: data.global.totalReferrers,
        bonusPool: data.global.bonusPool,
        estimatedBonusPerEth: data.global.estimatedBonusPerEth,
        isReferrer: data.user?.isReferrer,
        hasReferrer: data.user?.hasReferrer,
        referralCount: data.user?.referralCount,
        totalVolumeEth: data.user?.totalVolumeEth,
        totalBonusEarned: data.user?.totalBonusEarned,
        referralCode: data.user?.referralCode
      });
    } catch (err) {
      console.error('Failed to fetch referral stats:', err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [address]);

  const copyReferralCode = () => {
    if (stats?.referralCode) {
      navigator.clipboard.writeText(stats.referralCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(13,13,32,0.95) 0%, rgba(24,24,48,0.9) 100%)',
      border: '1px solid rgba(99,102,241,0.3)',
      borderRadius: 24,
      padding: 32,
      backdropFilter: 'blur(20px)',
      maxWidth: 700,
      margin: '0 auto'
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 12,
          background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
          padding: '12px 24px',
          borderRadius: 50,
          marginBottom: 16
        }}>
          <Users size={24} color="white" />
          <span style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>
            Referral Program
          </span>
        </div>
        
        <h2 style={{ fontSize: 28, fontWeight: 800, color: 'white', margin: '0 0 8px' }}>
          Share & Earn Together
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0 }}>
          Both you and your friends get 5% bonus INQAI on every purchase
        </p>
      </div>

      {/* Bonus Structure */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 16,
        marginBottom: 32
      }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.1))',
          border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: 16,
          padding: 24,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 48, fontWeight: 800, color: '#818cf8', marginBottom: 8 }}>
            5%
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'white', marginBottom: 4 }}>
            You Earn
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
            When friends buy using your code
          </div>
        </div>

        <div style={{
          background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(52,211,153,0.1))',
          border: '1px solid rgba(16,185,129,0.3)',
          borderRadius: 16,
          padding: 24,
          textAlign: 'center'
        }}>
          <div style={{ fontSize: 48, fontWeight: 800, color: '#34d399', marginBottom: 8 }}>
            5%
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'white', marginBottom: 4 }}>
            They Earn
          </div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
            Bonus on their first purchase
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-around',
        marginBottom: 32,
        padding: '20px 0',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'white' }}>
            {stats?.totalReferrers || 0}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Total Referrers</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#818cf8' }}>
            {parseFloat(stats?.bonusPool || '0').toFixed(0)} INQAI
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Bonus Pool</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: '#34d399' }}>
            ~{parseFloat(stats?.estimatedBonusPerEth?.referrer || '0').toFixed(0)}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>INQAI per 1 ETH</div>
        </div>
      </div>

      {/* User Referral Section */}
      {stats?.referralCode ? (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'white', margin: '0 0 16px' }}>
            Your Referral Code
          </h3>
          
          <div style={{
            display: 'flex',
            gap: 12,
            marginBottom: 16
          }}>
            <div style={{
              flex: 1,
              padding: '16px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              fontFamily: 'monospace',
              fontSize: 14,
              color: 'white',
              wordBreak: 'break-all'
            }}>
              {stats.referralCode}
            </div>
            <button
              onClick={copyReferralCode}
              style={{
                padding: '16px',
                background: copied ? '#10b981' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {copied ? <CheckCircle size={20} color="white" /> : <Copy size={20} color="white" />}
            </button>
          </div>

          <div style={{
            display: 'flex',
            gap: 12
          }}>
            <button
              onClick={() => {
                const text = `Buy INQAI at $8 and get 5% bonus! Use my referral: ${stats.referralCode}\n\nhttps://inquisitive.ai/buy`;
                navigator.clipboard.writeText(text);
                alert('Share message copied!');
              }}
              style={{
                flex: 1,
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #1da1f2, #0d8bd9)',
                border: 'none',
                borderRadius: 8,
                color: 'white',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}
            >
              <Share2 size={16} />
              Copy Share Text
            </button>
          </div>
        </div>
      ) : (
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 12,
          padding: 24,
          textAlign: 'center',
          marginBottom: 24
        }}>
          <p style={{ color: 'rgba(255,255,255,0.6)', margin: '0 0 16px' }}>
            Connect your wallet to get your unique referral code
          </p>
          <button
            onClick={() => setAddress('0x1234...')}
            style={{
              padding: '12px 32px',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              border: 'none',
              borderRadius: 8,
              color: 'white',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Connect Wallet
          </button>
        </div>
      )}

      {/* User Stats */}
      {stats?.isReferrer && (
        <div style={{
          background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.05))',
          border: '1px solid rgba(99,102,241,0.3)',
          borderRadius: 16,
          padding: 24,
          marginBottom: 24
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#818cf8', margin: '0 0 16px' }}>
            Your Referral Performance
          </h3>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16
          }}>
            <div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Friends Referred</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'white' }}>
                {stats.referralCount || 0}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Volume Generated</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'white' }}>
                {parseFloat(stats.totalVolumeEth || '0').toFixed(2)} ETH
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Total Bonus Earned</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: '#34d399' }}>
                {parseFloat(stats.totalBonusEarned || '0').toFixed(2)} INQAI
              </div>
            </div>
          </div>
        </div>
      )}

      {/* How It Works */}
      <div style={{
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 12,
        padding: 20
      }}>
        <h3 style={{ fontSize: 14, fontWeight: 700, color: 'white', margin: '0 0 16px' }}>
          How It Works
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { icon: Share2, text: 'Share your unique referral code with friends' },
            { icon: Gift, text: 'They get 5% bonus INQAI on their first purchase' },
            { icon: TrendingUp, text: 'You earn 5% bonus INQAI on their purchase amount' },
            { icon: CheckCircle, text: 'Bonuses paid automatically when they claim' }
          ].map((step, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                background: 'rgba(99,102,241,0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <step.icon size={16} color="#818cf8" />
              </div>
              <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
                {step.text}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
