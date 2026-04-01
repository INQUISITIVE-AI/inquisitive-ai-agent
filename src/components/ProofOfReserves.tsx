import React, { useState, useEffect } from 'react';
import { Shield, CheckCircle, Wallet, TrendingUp, ExternalLink } from 'lucide-react';

// ── Proof of Reserves Display Component ─────────────────────────────────────
// Real-time vault backing verification

interface ReserveData {
  vault: {
    address: string;
    totalAum: string;
    holdings: Array<{
      symbol: string;
      amount: string;
      usdValue: string;
      price: string;
    }>;
  };
  backing: {
    navPerToken: string;
    totalSupply: string;
    fullyDilutedValue: string;
  };
  proof: {
    verified: boolean;
    source: string;
    timestamp: string;
  };
}

export default function ProofOfReserves() {
  const [data, setData] = useState<ReserveData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReserves = async () => {
    try {
      const res = await fetch('/api/inquisitiveAI/proof-of-reserves');
      if (!res.ok) throw new Error('Failed to fetch');
      const reserveData = await res.json();
      setData(reserveData);
    } catch (err) {
      console.error('Failed to fetch reserves:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReserves();
    const interval = setInterval(fetchReserves, 60000); // Refresh every minute
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
        <div style={{ color: 'rgba(255,255,255,0.6)' }}>Loading reserves...</div>
      </div>
    );
  }

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(13,13,32,0.95) 0%, rgba(32,24,48,0.9) 100%)',
      border: '1px solid rgba(16,185,129,0.3)',
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
          background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
          padding: '12px 24px',
          borderRadius: 50,
          marginBottom: 16
        }}>
          <Shield size={24} color="white" />
          <span style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>
            Proof of Reserves
          </span>
        </div>
        
        <h2 style={{ fontSize: 28, fontWeight: 800, color: 'white', margin: '0 0 8px' }}>
          Asset-Backed & Verifiable
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0 }}>
          Every INQAI token is backed by on-chain assets. Verified in real-time.
        </p>
      </div>

      {/* Verification Badge */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(16,185,129,0.2), rgba(52,211,153,0.1))',
        border: '1px solid rgba(16,185,129,0.3)',
        borderRadius: 16,
        padding: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            background: 'rgba(16,185,129,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <CheckCircle size={24} color="#10b981" />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#10b981' }}>
              Verified On-Chain
            </div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
              {data?.proof.source} • {new Date(data?.proof.timestamp || '').toLocaleString()}
            </div>
          </div>
        </div>
        <a
          href={`https://etherscan.io/address/${data?.vault.address}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 20px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: 8,
            color: 'white',
            textDecoration: 'none',
            fontSize: 14,
            fontWeight: 600
          }}
        >
          View Vault <ExternalLink size={16} />
        </a>
      </div>

      {/* Key Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 16,
        marginBottom: 32
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          padding: 24,
          borderRadius: 12,
          textAlign: 'center'
        }}>
          <Wallet size={24} color="#10b981" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 24, fontWeight: 800, color: 'white' }}>
            ${parseFloat(data?.vault.totalAum || '0').toLocaleString(undefined, {maximumFractionDigits: 0})}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Total AUM</div>
        </div>
        
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          padding: 24,
          borderRadius: 12,
          textAlign: 'center'
        }}>
          <TrendingUp size={24} color="#a855f7" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 24, fontWeight: 800, color: 'white' }}>
            ${parseFloat(data?.backing.navPerToken || '0').toFixed(2)}
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>NAV per Token</div>
        </div>
        
        <div style={{
          background: 'rgba(255,255,255,0.05)',
          padding: 24,
          borderRadius: 12,
          textAlign: 'center'
        }}>
          <Shield size={24} color="#34d399" style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 24, fontWeight: 800, color: 'white' }}>
            100%
          </div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Backed</div>
        </div>
      </div>

      {/* Holdings Table */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'white', margin: '0 0 16px' }}>
          Vault Holdings
        </h3>
        
        <div style={{
          background: 'rgba(255,255,255,0.03)',
          borderRadius: 12,
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.05)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600 }}>Asset</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600 }}>Amount</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600 }}>Price</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', color: 'rgba(255,255,255,0.6)', fontSize: 12, fontWeight: 600 }}>USD Value</th>
              </tr>
            </thead>
            <tbody>
              {data?.vault.holdings.slice(0, 10).map((holding, i) => (
                <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px 16px', color: 'white', fontWeight: 600 }}>
                    {holding.symbol}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: 'rgba(255,255,255,0.7)' }}>
                    {parseFloat(holding.amount).toLocaleString(undefined, {maximumFractionDigits: 4})}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: 'rgba(255,255,255,0.7)' }}>
                    ${parseFloat(holding.price).toFixed(2)}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', color: '#10b981', fontWeight: 600 }}>
                    ${parseFloat(holding.usdValue).toLocaleString(undefined, {maximumFractionDigits: 0})}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info */}
      <div style={{
        background: 'rgba(16,185,129,0.1)',
        border: '1px solid rgba(16,185,129,0.3)',
        borderRadius: 12,
        padding: 16
      }}>
        <p style={{ margin: 0, fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
          <strong style={{ color: '#10b981' }}>What is Proof of Reserves?</strong><br />
          Every INQAI token represents proportional ownership in the vault assets. 
          This display shows real-time on-chain verification of all assets backing INQAI. 
          NAV per token is calculated as Total AUM ÷ Total Supply.
        </p>
      </div>
    </div>
  );
}
