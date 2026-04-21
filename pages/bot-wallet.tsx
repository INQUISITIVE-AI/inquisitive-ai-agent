// ── INQUISITIVE — Bot Wallet Generator ────────────────────────────────────────
// Generates a fresh Ethereum keypair entirely client-side (viem's privateKeyToAccount
// uses @noble/secp256k1, runs in the browser, no network calls). The private key
// is displayed once so the user can paste it into Vercel as the
// INQUISITIVE_BOT_PRIVATE_KEY env var. After that, the hourly Vercel Cron will
// submit submitSignalsBatch() on schedule, and trades execute autonomously.

import { useState } from 'react';
import Head from 'next/head';

// Dynamic import at call time so SSR doesn't try to bundle secp256k1
async function generate(): Promise<{ privateKey: `0x${string}`; address: `0x${string}` }> {
  const viemAccounts = await import('viem/accounts');
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  // Ensure the key is in the valid secp256k1 range (effectively always true)
  const pk = ('0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')) as `0x${string}`;
  const account = viemAccounts.privateKeyToAccount(pk);
  return { privateKey: pk, address: account.address as `0x${string}` };
}

const VAULT = '0xb99dc519c4373e5017222bbd46f42a4e12a0ec25';

export default function BotWallet() {
  const [wallet, setWallet] = useState<{ privateKey: string; address: string } | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState<'' | 'addr' | 'pk'>('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function handleGenerate() {
    setBusy(true); setErr(null);
    try {
      const w = await generate();
      setWallet(w);
      setRevealed(false);
    } catch (e: any) {
      setErr(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }

  function copy(text: string, kind: 'addr' | 'pk') {
    navigator.clipboard.writeText(text);
    setCopied(kind);
    setTimeout(() => setCopied(''), 1800);
  }

  return (
    <>
      <Head>
        <title>INQUISITIVE — Bot Wallet Generator</title>
        <meta httpEquiv="Cache-Control" content="no-store, no-cache, must-revalidate" />
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <div style={styles.page}>
        <div style={styles.card}>
          <h1 style={styles.h1}>INQUISITIVE — Bot Wallet Generator</h1>
          <p style={styles.sub}>
            Generates a fresh Ethereum keypair entirely in your browser. Nothing is sent anywhere.
            The private key goes into Vercel as <code style={styles.code}>INQUISITIVE_BOT_PRIVATE_KEY</code>,
            the address becomes the vault's new <code style={styles.code}>aiOracle</code>.
          </p>

          <div style={{ ...styles.alert, background: '#13282a', borderColor: '#065f46', color: '#6ee7b7' }}>
            <strong>Safe to use.</strong> The key is generated with <code style={styles.codeInline}>crypto.getRandomValues</code>{' '}
            and the address derived locally via <code style={styles.codeInline}>viem/accounts</code>. It never leaves this page —
            view source to verify.
          </div>

          {!wallet && (
            <button style={styles.btnPrimary} onClick={handleGenerate} disabled={busy}>
              {busy ? 'Generating…' : 'Generate a Bot Wallet'}
            </button>
          )}

          {err && <div style={styles.alertErr}>Error: {err}</div>}

          {wallet && (
            <>
              <div style={styles.row}>
                <div style={styles.rowLabel}>Address (safe to share — put in <code style={styles.code}>setAIOracle()</code>)</div>
                <div style={styles.rowValue}>
                  <code style={styles.mono}>{wallet.address}</code>
                  <button style={styles.btnMini} onClick={() => copy(wallet.address, 'addr')}>
                    {copied === 'addr' ? 'Copied ✓' : 'Copy'}
                  </button>
                </div>
              </div>

              <div style={styles.row}>
                <div style={styles.rowLabel}>
                  Private key (SECRET — paste into Vercel env var <code style={styles.code}>INQUISITIVE_BOT_PRIVATE_KEY</code>)
                </div>
                <div style={styles.rowValue}>
                  {revealed ? (
                    <code style={{ ...styles.mono, color: '#fcd34d' }}>{wallet.privateKey}</code>
                  ) : (
                    <code style={{ ...styles.mono, color: '#6b7280' }}>{'•'.repeat(64)}</code>
                  )}
                  <button style={styles.btnMini} onClick={() => setRevealed(v => !v)}>
                    {revealed ? 'Hide' : 'Reveal'}
                  </button>
                  <button style={styles.btnMini} onClick={() => copy(wallet.privateKey, 'pk')}>
                    {copied === 'pk' ? 'Copied ✓' : 'Copy'}
                  </button>
                </div>
              </div>

              <div style={styles.checklist}>
                <div style={styles.checklistH}>Next — 4 one-time actions to make trades autonomous</div>
                <ol style={styles.ol}>
                  <li>
                    Copy the <strong>private key</strong> above →{' '}
                    <a style={styles.link} href="https://vercel.com/dashboard" target="_blank" rel="noreferrer">Vercel Dashboard</a> →
                    the <code style={styles.code}>inquisitive-ai-agent</code> project → Settings → Environment Variables →
                    add <code style={styles.code}>INQUISITIVE_BOT_PRIVATE_KEY</code> (Production).
                  </li>
                  <li>
                    In the same Vercel env-var section, add (optional but recommended) <code style={styles.code}>CRON_SECRET</code>{' '}
                    with any random string so manual invocations are gated.
                  </li>
                  <li>
                    Open <a style={styles.link} href="/vault-setup.html">/vault-setup.html</a> → card 3 →
                    paste the <strong>address</strong> above and click{' '}
                    <code style={styles.code}>setAIOracle</code>. Confirm on your Trezor.
                  </li>
                  <li>
                    Send <strong>~0.01 ETH</strong> to the address above (covers ~100 hourly cron runs of gas).
                    Any wallet — MetaMask / Rabby / ledger / exchange — will work.
                  </li>
                </ol>
                <div style={styles.checklistFooter}>
                  Once Vercel redeploys (automatic on the next commit, or manual in Dashboard → Deployments → Redeploy), the
                  hourly cron <code style={styles.code}>/api/inquisitiveAI/cron/submit-signals</code> fires at :17 past every
                  hour and pushes AI signals on-chain. Chainlink Automation's existing upkeep on vault{' '}
                  <code style={styles.code}>{VAULT.slice(0, 10)}…{VAULT.slice(-4)}</code> picks them up and
                  executes Uniswap V3 swaps. <strong>Zero ongoing input from you.</strong>
                </div>
              </div>

              <button
                style={{ ...styles.btnPrimary, background: '#1f2937', marginTop: 18 }}
                onClick={() => { setWallet(null); setRevealed(false); }}
              >
                Generate a different wallet (this will replace the one above — copy it first!)
              </button>
            </>
          )}
        </div>

        <div style={styles.footer}>
          <a style={styles.link} href="/vault-setup.html">← back to vault setup</a>
          {' · '}
          <a style={styles.link} href="/api/inquisitiveAI/cron/submit-signals">view cron endpoint</a>
          {' · '}
          <a style={styles.link} href="/api/inquisitiveAI/cron/oracle">view ai signals</a>
        </div>
      </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#080808',
    color: '#e5e7eb',
    padding: 24,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  card: {
    maxWidth: 780,
    margin: '0 auto',
    background: '#111',
    border: '1px solid #1f2937',
    borderRadius: 12,
    padding: 26,
  },
  h1: { fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 4 },
  sub: { fontSize: 13, color: '#9ca3af', marginBottom: 20, lineHeight: 1.55 },
  alert: { fontSize: 12, padding: 10, border: '1px solid', borderRadius: 8, marginBottom: 18, lineHeight: 1.5 },
  alertErr: { fontSize: 12, padding: 10, border: '1px solid #7f1d1d', borderRadius: 8, background: '#1e0c0c', color: '#fca5a5', marginTop: 12 },
  btnPrimary: {
    display: 'block', width: '100%', padding: 14, border: 'none', borderRadius: 8,
    background: '#6d28d9', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer',
  },
  btnMini: {
    padding: '6px 10px', border: '1px solid #374151', borderRadius: 5,
    background: '#1f2937', color: '#e5e7eb', fontSize: 11, fontWeight: 600, cursor: 'pointer',
  },
  row: { marginTop: 18 },
  rowLabel: { fontSize: 11, color: '#9ca3af', marginBottom: 6 },
  rowValue: { display: 'flex', alignItems: 'center', gap: 8, background: '#060606', border: '1px solid #1f2937', borderRadius: 6, padding: 10 },
  mono: { fontFamily: 'monospace', fontSize: 13, color: '#e5e7eb', wordBreak: 'break-all', flex: 1 },
  code: { background: '#0a0a0a', padding: '2px 6px', borderRadius: 4, fontSize: 11, color: '#fcd34d' },
  codeInline: { background: '#0a0a0a', padding: '1px 4px', borderRadius: 3, fontSize: 11, color: '#6ee7b7' },
  checklist: { marginTop: 22, padding: 16, background: '#0c0c0c', border: '1px solid #1f2937', borderRadius: 8 },
  checklistH: { fontSize: 12, fontWeight: 700, color: '#c4b5fd', textTransform: 'uppercase', letterSpacing: 0.06, marginBottom: 12 },
  ol: { paddingLeft: 20, fontSize: 12.5, lineHeight: 1.7, color: '#d1d5db' },
  checklistFooter: { fontSize: 11.5, color: '#9ca3af', marginTop: 12, lineHeight: 1.65 },
  link: { color: '#6ee7b7', textDecoration: 'none', borderBottom: '1px dashed #065f46' },
  footer: { textAlign: 'center', marginTop: 20, fontSize: 11, color: '#6b7280' },
};
