import React, { useState, useEffect } from 'react';

export default function RescueSimple() {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [vaultState, setVaultState] = useState<any>(null);

  useEffect(() => {
    // Simple fetch to check vault state
    fetchVaultState();
  }, []);

  const fetchVaultState = async () => {
    try {
      const response = await fetch('/api/inquisitiveAI/execute/auto');
      const data = await response.json();
      setVaultState(data);
      setStatus('ready');
    } catch (err) {
      setStatus('error');
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a1a', color: '#fff', fontFamily: 'system-ui, sans-serif', padding: '40px 20px' }}>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <h1 style={{ fontSize: 28, marginBottom: 10, color: '#ef4444' }}>🚨 Emergency Vault Fix</h1>
        <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: 30 }}>
          The AI is not trading because the vault contract needs configuration.
        </p>

        {status === 'loading' && (
          <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
            Loading vault state...
          </div>
        )}

        {status === 'error' && (
          <div style={{ padding: 20, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 12, marginBottom: 20 }}>
            Failed to load vault state. Try refreshing.
          </div>
        )}

        {status === 'ready' && vaultState && (
          <div style={{ background: 'rgba(13,13,32,0.85)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24, marginBottom: 30 }}>
            <h2 style={{ fontSize: 18, marginBottom: 20 }}>Current Status</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 15 }}>
              <div style={{ padding: 15, background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Cycle Count</div>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: vaultState.cycleCount > 0 ? '#22c55e' : '#ef4444' }}>
                  {vaultState.cycleCount || 0}
                </div>
              </div>
              <div style={{ padding: 15, background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Vault ETH</div>
                <div style={{ fontSize: 24, fontWeight: 'bold', color: vaultState.vault?.ethBalance > 0.01 ? '#22c55e' : '#ef4444' }}>
                  {(vaultState.vault?.ethBalance || 0).toFixed(4)}
                </div>
              </div>
              <div style={{ padding: 15, background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Status</div>
                <div style={{ fontSize: 16, fontWeight: 'bold', color: '#f59e0b' }}>
                  {vaultState.status || 'UNKNOWN'}
                </div>
              </div>
              <div style={{ padding: 15, background: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Automation</div>
                <div style={{ fontSize: 16, fontWeight: 'bold', color: vaultState.vault?.automationEnabled ? '#22c55e' : '#ef4444' }}>
                  {vaultState.vault?.automationEnabled ? 'ENABLED' : 'DISABLED'}
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ background: 'rgba(13,13,32,0.85)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: 24, marginBottom: 30 }}>
          <h2 style={{ fontSize: 18, marginBottom: 15 }}>🔧 How to Fix (Manual Steps)</h2>
          
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, color: '#a78bfa', marginBottom: 10 }}>Step 1: Configure Portfolio</h3>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginBottom: 10 }}>
              The vault needs 27 assets configured. Go to Etherscan and call setPortfolio:
            </p>
            <a 
              href="https://etherscan.io/address/0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb#writeContract"
              target="_blank"
              rel="noopener noreferrer"
              style={{ 
                display: 'inline-block',
                padding: '10px 16px', 
                background: '#6366f1', 
                color: '#fff', 
                borderRadius: 8,
                textDecoration: 'none',
                fontSize: 14,
                fontWeight: 600
              }}
            >
              Open Etherscan Write Contract →
            </a>
          </div>

          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, color: '#a78bfa', marginBottom: 10 }}>Step 2: Trigger First Trade</h3>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginBottom: 10 }}>
              After configuring, call performUpkeep manually:
            </p>
            <code style={{ 
              display: 'block',
              padding: 12, 
              background: 'rgba(0,0,0,0.3)', 
              borderRadius: 8,
              fontSize: 12,
              fontFamily: 'monospace',
              color: 'rgba(255,255,255,0.8)',
              marginBottom: 10
            }}>
              Function: performUpkeep(bytes)<br/>
              Input: 0x<br/>
              Value: 0 ETH
            </code>
          </div>

          <div>
            <h3 style={{ fontSize: 14, color: '#a78bfa', marginBottom: 10 }}>Step 3: Fund Chainlink</h3>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
              Register at <a href="https://automation.chain.link" target="_blank" rel="noopener noreferrer" style={{ color: '#818cf8' }}>automation.chain.link</a> and fund with LINK tokens for autonomous trading.
            </p>
          </div>
        </div>

        <div style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 16, padding: 24 }}>
          <h2 style={{ fontSize: 16, marginBottom: 10, color: '#f59e0b' }}>⚡ Emergency: Use Node Script</h2>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, marginBottom: 15 }}>
            Run this from your terminal with your private key:
          </p>
          <code style={{ 
            display: 'block',
            padding: 12, 
            background: 'rgba(0,0,0,0.3)', 
            borderRadius: 8,
            fontSize: 11,
            fontFamily: 'monospace',
            color: 'rgba(255,255,255,0.8)',
            overflow: 'auto'
          }}>
            {`export PRIVATE_KEY="0xYOUR_KEY"
export MAINNET_RPC_URL="https://mainnet.infura.io/v3/YOUR_KEY"
node trigger-trade.mjs`}
          </code>
        </div>

        <div style={{ marginTop: 30, padding: 20, background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 12, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
          <strong style={{ color: '#ef4444' }}>Why isn't this automated?</strong><br/>
          The vault contract requires the owner's private key to configure assets. 
          This is a security feature — only the owner can change the portfolio. 
          Once configured, anyone can trigger trades, but the initial setup requires owner permission.
        </div>
      </div>
    </div>
  );
}
