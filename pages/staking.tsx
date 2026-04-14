import Head from 'next/head';
import { useRouter } from 'next/router';
import { Lock, Zap, TrendingUp, Shield, ExternalLink } from 'lucide-react';
import SiteNav from '../src/components/SiteNav';

const STAKING_ADDR = '0x46625868a36c11310fb988a69100e87519558e59';
const INQAI_TOKEN  = '0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5';

const TIERS = [
  { label: 'Base',         lock: '30 days',  boost: '1.0×', min: '1,000 INQAI' },
  { label: 'Growth',       lock: '90 days',  boost: '1.25×', min: '5,000 INQAI' },
  { label: 'Institutional',lock: '180 days', boost: '1.5×',  min: '25,000 INQAI' },
];

const FEATURES = [
  { Icon: TrendingUp, title: 'Share of Protocol Revenue', desc: '15% of all performance fees are distributed pro-rata to INQAI stakers on every fee cycle.' },
  { Icon: Zap,        title: 'Compounding Reward Boosts', desc: 'Longer lock periods amplify your staking yield — up to 1.5× multiplier for 180-day commitments.' },
  { Icon: Shield,     title: 'Non-Custodial',             desc: 'Your tokens are locked in a verified on-chain contract. No intermediary. Fully self-custody.' },
  { Icon: Lock,       title: 'On-Chain Enforcement',      desc: 'Lock periods and reward distribution are enforced entirely by smart contract logic — no trust required.' },
];

export default function StakingPage() {
  const router = useRouter();
  return (
    <div>
      <Head>
        <title>Staking | INQUISITIVE</title>
        <meta name="description" content="Stake INQAI tokens to earn a share of protocol performance fees. Contract deployed on Ethereum mainnet." />
      </Head>
      <div style={{ minHeight: '100vh', background: '#07071a', color: '#fff', fontFamily: 'Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
        <div className="mesh-bg" />
        <SiteNav />

        {/* Header */}
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '20px 28px', position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: '-0.3px' }}>INQAI Staking</h1>
            <span style={{ fontSize: 12, background: 'rgba(16,185,129,0.12)', color: '#34d399', border: '1px solid rgba(16,185,129,0.25)', borderRadius: 6, padding: '3px 10px', fontWeight: 600 }}>Contract Live</span>
          </div>
        </div>

        <div style={{ padding: '48px 28px 80px', position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>

            {/* Hero */}
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <div style={{ fontSize: 11, letterSpacing: 2, color: '#7c3aed', textTransform: 'uppercase', marginBottom: 10 }}>Protocol Revenue Sharing</div>
              <h2 style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-1px', marginBottom: 14 }}>Stake INQAI. Earn Protocol Revenue.</h2>
              <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', maxWidth: 520, margin: '0 auto 32px', lineHeight: 1.8 }}>
                INQAI stakers receive 15% of all protocol performance fees. Lock duration determines your boost multiplier. Rewards accumulate on every fee cycle — no manual claiming.
              </p>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(13,13,32,0.9)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: '10px 18px', fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
                <span style={{ color: 'rgba(255,255,255,0.25)' }}>Contract</span>
                <span style={{ fontFamily: 'monospace', color: '#a78bfa' }}>{STAKING_ADDR}</span>
                <a href={`https://etherscan.io/address/${STAKING_ADDR}`} target="_blank" rel="noopener noreferrer" style={{ color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center' }}>
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>

            {/* Features */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 40 }}>
              {FEATURES.map(f => (
                <div key={f.title} style={{ background: 'rgba(13,13,32,0.8)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 16, padding: '22px 20px', backdropFilter: 'blur(12px)' }}>
                  <div style={{ marginBottom: 14, width: 40, height: 40, borderRadius: 10, background: 'rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <f.Icon size={20} color="#7c3aed" strokeWidth={1.8} />
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{f.title}</div>
                  <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.7, margin: 0 }}>{f.desc}</p>
                </div>
              ))}
            </div>

            {/* Tiers */}
            <div style={{ marginBottom: 40 }}>
              <div style={{ fontSize: 11, letterSpacing: 2, color: '#7c3aed', textTransform: 'uppercase', marginBottom: 20 }}>Lock Tiers</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
                {TIERS.map((t, i) => (
                  <div key={t.label} style={{ background: 'rgba(13,13,32,0.8)', border: `1px solid ${i === 2 ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.06)'}`, borderRadius: 16, padding: '24px 22px', backdropFilter: 'blur(12px)', position: 'relative' }}>
                    {i === 2 && <div style={{ position: 'absolute', top: -10, right: 18, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 20, letterSpacing: '0.5px' }}>MAX BOOST</div>}
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>{t.label}</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: '#a78bfa', marginBottom: 4 }}>{t.boost}</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 16 }}>yield multiplier</div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Lock: <strong style={{ color: '#fff' }}>{t.lock}</strong></div>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4 }}>Min: <strong style={{ color: '#fff' }}>{t.min}</strong></div>
                  </div>
                ))}
              </div>
            </div>

            {/* UI Status */}
            <div style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(124,58,237,0.18)', borderRadius: 16, padding: '24px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Staking interface launching shortly</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>The staking contract is live on mainnet. The UI is being finalized. You can interact directly via Etherscan in the meantime.</div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                <a href={`https://etherscan.io/address/${STAKING_ADDR}`} target="_blank" rel="noopener noreferrer"
                  style={{ padding: '10px 20px', borderRadius: 9, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  View on Etherscan <ExternalLink size={13} />
                </a>
                <button onClick={() => router.push('/token')}
                  style={{ padding: '10px 20px', borderRadius: 9, background: 'linear-gradient(135deg,#7c3aed,#4f46e5)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  View INQAI Token
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
