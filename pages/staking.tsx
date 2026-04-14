import Head from 'next/head';
import SiteNav from '../src/components/SiteNav';

export default function StakingPage() {
  return (
    <div>
      <Head>
        <title>Staking | INQUISITIVE</title>
        <meta name="description" content="INQAI staking coming soon." />
      </Head>
      <div style={{ minHeight: '100vh', background: '#07071a', color: '#fff', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
        <div className="mesh-bg" />

        {/* Nav */}
        <SiteNav />

        {/* Page header */}
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '20px 28px', position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: 1280, margin: '0 auto' }}>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.3px' }}>Staking</h1>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '40px 28px', position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 20 }}>🔒</div>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 12 }}>Coming Soon</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', maxWidth: 500, margin: '0 auto' }}>
              INQAI staking is under development. Staking contract deployment pending.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
