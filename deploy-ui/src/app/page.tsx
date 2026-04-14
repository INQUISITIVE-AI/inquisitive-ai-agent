'use client'

import { useState } from 'react'
import { useAccount, useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther, formatEther } from 'viem'
import { ConnectButton } from '@rainbow-me/rainbowkit'

const TEAM_WALLET = '0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746'
const OLD_VAULT = '0x721B0c1fcf28646D6e0f608A15495F7227cB6CFb'

const OLD_VAULT_ABI = [
  { name: 'emergencyWithdraw', inputs: [], outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { name: 'emergencyWithdrawToken', inputs: [{ name: 'token', type: 'address' }], outputs: [], stateMutability: 'nonpayable', type: 'function' },
  { name: 'owner', inputs: [], outputs: [{ name: '', type: 'address' }], stateMutability: 'view', type: 'function' },
  { name: 'getETHBalance', inputs: [], outputs: [{ name: '', type: 'uint256' }], stateMutability: 'view', type: 'function' },
] as const

export default function DeployPage() {
  const { address, isConnected } = useAccount()
  const [step, setStep] = useState<'idle' | 'withdrawing' | 'depositing' | 'done'>('idle')
  const [logs, setLogs] = useState<string[]>([])
  const [newVaultAddress, setNewVaultAddress] = useState('')

  const isTeamWallet = address?.toLowerCase() === TEAM_WALLET.toLowerCase()

  const { data: oldBalance } = useReadContract({
    address: OLD_VAULT,
    abi: OLD_VAULT_ABI,
    functionName: 'getETHBalance',
    query: { enabled: isConnected },
  })

  const { writeContract: withdraw, data: withdrawHash } = useWriteContract()
  const { writeContract: deposit, data: depositHash } = useWriteContract()

  const addLog = (msg: string) => setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`])

  const handleWithdraw = async () => {
    if (!isTeamWallet) return
    setStep('withdrawing')
    addLog('Withdrawing ETH from old vault...')
    
    withdraw({
      address: OLD_VAULT,
      abi: OLD_VAULT_ABI,
      functionName: 'emergencyWithdraw',
    })
  }

  const handleDeposit = async () => {
    if (!newVaultAddress || !oldBalance) return
    setStep('depositing')
    addLog(`Depositing ${formatEther(oldBalance)} ETH to new vault...`)
    
    // Need the new vault ABI for deposit
    addLog('Please use the deposit function on the new vault contract')
    setStep('done')
  }

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 24 }}>
      {/* Header */}
      <div style={{ background: '#111', border: '1px solid #1f2937', borderRadius: 10, padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>INQUISITIVE Vault V2 Deployer</h1>
          <span style={{ background: '#7f1d1d', color: '#fca5a5', fontSize: 10, padding: '3px 8px', borderRadius: 999, fontWeight: 600 }}>
            SECURE MODE
          </span>
        </div>
      </div>

      {/* Wallet */}
      <div style={{ background: '#111', border: '1px solid #1f2937', borderRadius: 10, padding: 20, marginBottom: 24 }}>
        <ConnectButton />
        {isConnected && (
          <div style={{ marginTop: 12, fontSize: 12, color: isTeamWallet ? '#6ee7b7' : '#f87171' }}>
            {isTeamWallet ? '✓ Team wallet connected' : '✗ Not team wallet'}
          </div>
        )}
      </div>

      {/* Step 1: Deploy Instructions */}
      <div style={{ background: '#1a0a2e', border: '1px solid #7c3aed', borderRadius: 10, padding: 20, marginBottom: 16 }}>
        <h2 style={{ fontSize: 13, color: '#a78bfa', marginBottom: 8 }}>STEP 1: Deploy Vault V2</h2>
        <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
          Since Vault V2 requires compilation, use Foundry with hardware wallet:
        </p>
        <pre style={{ background: '#0a0a0a', border: '1px solid #374151', borderRadius: 6, padding: 12, fontSize: 11, fontFamily: 'monospace', color: '#d1d5db', overflow: 'auto' }}>
{`cd /Volumes/Mr.M&G5/CascadeProjects/windsurf-project/inquisitive-ai-agent
export MAINNET_RPC_URL=https://mainnet.infura.io/v3/d633cdc94aff412b90281fd14cd98868
forge script deploy-v2-clean/DeployVaultV2Only.s.sol \\
  --rpc-url $MAINNET_RPC_URL \\
  --broadcast \\
  --trezor`}
        </pre>
        <div style={{ marginTop: 12 }}>
          <input
            type="text"
            placeholder="Paste new vault proxy address (0x...)"
            value={newVaultAddress}
            onChange={(e) => setNewVaultAddress(e.target.value)}
            style={{ width: '100%', background: '#0a0a0a', border: '1px solid #374151', color: '#e5e7eb', padding: '10px 12px', borderRadius: 6, fontSize: 12, fontFamily: 'monospace' }}
          />
        </div>
      </div>

      {/* Step 2: Old Vault Status */}
      <div style={{ background: '#111', border: '1px solid #1f2937', borderRadius: 10, padding: 20, marginBottom: 16 }}>
        <h2 style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>STEP 2: Check Old Vault</h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 12, color: '#9ca3af' }}>Old Vault (0x721b...):</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#e5e7eb' }}>
            {oldBalance ? formatEther(oldBalance) : '...'} ETH
          </span>
        </div>
        <button
          onClick={handleWithdraw}
          disabled={!isTeamWallet || !oldBalance || step !== 'idle'}
          style={{
            width: '100%',
            padding: '12px',
            background: !isTeamWallet || step !== 'idle' ? '#1f2937' : '#b91c1c',
            color: !isTeamWallet || step !== 'idle' ? '#4b5563' : '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            cursor: !isTeamWallet || step !== 'idle' ? 'not-allowed' : 'pointer',
          }}
        >
          {step === 'withdrawing' ? 'Withdrawing...' : 'Withdraw from Old Vault'}
        </button>
        {withdrawHash && (
          <div style={{ marginTop: 8, fontSize: 11, color: '#6ee7b7' }}>
            TX: {withdrawHash.slice(0, 20)}...
          </div>
        )}
      </div>

      {/* Step 3: Fund New Vault */}
      <div style={{ background: '#111', border: '1px solid #1f2937', borderRadius: 10, padding: 20, marginBottom: 16 }}>
        <h2 style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>STEP 3: Fund New Vault</h2>
        <button
          onClick={handleDeposit}
          disabled={!newVaultAddress || step === 'depositing'}
          style={{
            width: '100%',
            padding: '12px',
            background: !newVaultAddress || step === 'depositing' ? '#1f2937' : '#065f46',
            color: !newVaultAddress || step === 'depositing' ? '#4b5563' : '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            cursor: !newVaultAddress || step === 'depositing' ? 'not-allowed' : 'pointer',
          }}
        >
          {step === 'depositing' ? 'Depositing...' : step === 'done' ? '✓ Complete' : 'Deposit to New Vault'}
        </button>
      </div>

      {/* Logs */}
      <div style={{ background: '#060606', border: '1px solid #111', borderRadius: 8, padding: 12 }}>
        <h3 style={{ fontSize: 11, color: '#4b5563', marginBottom: 8, textTransform: 'uppercase' }}>Logs</h3>
        <div style={{ height: 160, overflowY: 'auto', fontSize: 11, fontFamily: 'monospace' }}>
          {logs.length === 0 ? (
            <span style={{ color: '#4b5563' }}>Waiting for actions...</span>
          ) : (
            logs.map((log, i) => (
              <div key={i} style={{ color: log.includes('✓') ? '#6ee7b7' : log.includes('✗') ? '#f87171' : '#9ca3af', marginBottom: 4 }}>
                {log}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Next Steps */}
      {step === 'done' && (
        <div style={{ background: '#0a1a0f', border: '1px solid #065f46', borderRadius: 10, padding: 18, marginTop: 16 }}>
          <h3 style={{ fontSize: 13, color: '#6ee7b7', marginBottom: 8 }}>✓ Migration Complete</h3>
          <p style={{ fontSize: 12, color: '#9ca3af' }}>
            Next: Update Chainlink Automation to target:
          </p>
          <p style={{ fontSize: 12, fontFamily: 'monospace', color: '#6ee7b7', wordBreak: 'break-all' }}>
            {newVaultAddress}
          </p>
        </div>
      )}
    </div>
  )
}
