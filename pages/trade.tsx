import React, { useState, useEffect } from 'react';

export default function TradeTrigger() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/inquisitiveAI/execute/auto');
      const data = await res.json();
      setStatus(data);
    } catch (err) {
      console.error('Failed to fetch status:', err);
    }
  };

  // Direct browser call to MetaMask
  const triggerTrade = async () => {
    setLoading(true);
    setError(null);
    setTxHash(null);
    
    try {
      // @ts-ignore - ethereum is injected by MetaMask
      if (!window.ethereum) {
        throw new Error('MetaMask not installed. Please install MetaMask.');
      }

      // @ts-ignore
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please connect MetaMask.');
      }

      const vaultAddress = '0x721b0c1fcf28646d6e0f608a15495f7227cb6cfb';
      
      // Encode performUpkeep(bytes) with empty bytes
      // Function signature: 0x4585e33b (performUpkeep(bytes))
      // Empty bytes: 0x (0x20 offset + 0x00 length)
      const data = '0x4585e33b00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000';

      // @ts-ignore
      const txHash = await window.ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: accounts[0],
          to: vaultAddress,
          data: data,
          value: '0x0', // 0 ETH
        }],
      });

      setTxHash(txHash);
      
      // Wait a bit then refresh status
      setTimeout(fetchStatus, 5000);
      
    } catch (err: any) {
      console.error('Trigger error:', err);
      setError(err.message || err.code || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const readyToTrade = status?.vault?.checkUpkeep === true && 
                       status?.vault?.automationEnabled === true &&
                       status?.vault?.ethBalance > 0.005;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a1a', color: '#fff', fontFamily: 'system-ui, sans-serif', padding: 40 }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <h1 style={{ fontSize: 28, marginBottom: 10 }}>🚀 Trigger AI Trade</h1>
        
        {status && (
          <div style={{ 
            background: readyToTrade ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', 
            border: `1px solid ${readyToTrade ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`, 
            borderRadius: 16, 
            padding: 20,
            marginBottom: 30 
          }}>
            <h3 style={{ marginBottom: 15, color: readyToTrade ? '#22c55e' : '#ef4444' }}>
              {readyToTrade ? '✅ Ready to Trade' : '❌ Not Ready'}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: 14 }}>
              <div>checkUpkeep: {status.vault?.checkUpkeep ? '✅ TRUE' : '❌ FALSE'}</div>
              <div>Automation: {status.vault?.automationEnabled ? '✅ ON' : '❌ OFF'}</div>
              <div>Vault ETH: {status.vault?.ethBalance?.toFixed(4)} ETH</div>
              <div>Portfolio: {status.vault?.portfolioLength || 0} assets</div>
              <div>Cycles: {status.vault?.cycleCount || 0}</div>
              <div>Status: {status.status}</div>
            </div>
          </div>
        )}

        <button
          onClick={triggerTrade}
          disabled={loading}
          style={{
            width: '100%',
            padding: 20,
            fontSize: 18,
            fontWeight: 700,
            background: loading ? 'rgba(255,255,255,0.1)' : '#f59e0b',
            color: '#000',
            border: 'none',
            borderRadius: 12,
            cursor: loading ? 'not-allowed' : 'pointer',
            marginBottom: 20,
          }}
        >
          {loading ? 'Executing...' : '🚀 Trigger performUpkeep()'}
        </button>

        {error && (
          <div style={{ 
            background: 'rgba(239,68,68,0.1)', 
            border: '1px solid rgba(239,68,68,0.3)', 
            borderRadius: 16, 
            padding: 20 
          }}>
            <h3 style={{ marginBottom: 10, color: '#ef4444' }}>❌ Error</h3>
            <p style={{ color: '#ef4444' }}>{error}</p>
          </div>
        )}

        {txHash && (
          <div style={{ 
            background: 'rgba(34,197,94,0.1)', 
            border: '1px solid rgba(34,197,94,0.3)', 
            borderRadius: 16, 
            padding: 20 
          }}>
            <h3 style={{ marginBottom: 10, color: '#22c55e' }}>✅ Transaction Sent</h3>
            <p style={{ color: '#22c55e', wordBreak: 'break-all' }}>{txHash}</p>
            <a 
              href={`https://etherscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#818cf8', fontSize: 12, textDecoration: 'underline' }}
            >
              View on Etherscan →
            </a>
          </div>
        )}

        <div style={{ marginTop: 30, padding: 20, background: 'rgba(99,102,241,0.1)', borderRadius: 12 }}>
          <h3 style={{ marginBottom: 10, color: '#818cf8' }}>ℹ️ What This Does</h3>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
            This calls the <code>performUpkeep()</code> function on the vault contract.
            If everything is configured correctly, this will:
          </p>
          <ul style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6, marginTop: 10 }}>
            <li>Buy portfolio assets using vault ETH</li>
            <li>Increase cycle count from {status?.vault?.cycleCount || 0} to {(status?.vault?.cycleCount || 0) + 1}</li>
            <li>Start the autonomous trading cycle</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
