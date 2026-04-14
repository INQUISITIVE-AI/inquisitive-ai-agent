import Head from 'next/head';
import dynamic from 'next/dynamic';
import SiteNav from '../src/components/SiteNav';

const StakingDashboard = dynamic(() => import('../src/components/StakingDashboard'), { ssr: false });

export default function StakingPage() {
  return (
    <div>
      <Head>
        <title>Stake INQAI | INQUISITIVE</title>
        <meta name="description" content="Stake INQAI tokens and earn yield from the 66-asset AI portfolio. 60% of performance fees go to stakers via buybacks." />
      </Head>
      <div style={{ minHeight: '100vh', background: '#07071a', color: '#fff', fontFamily: 'system-ui,-apple-system,sans-serif' }}>
        <div className="mesh-bg" />

        {/* Nav */}
        <SiteNav />

        {/* Page header */}
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '20px 28px', position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.3px' }}>Stake INQAI</h1>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Earn 60% of protocol fees · 30-day lock · Auto-distributed via FeeDistributor</span>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '1px 28px 60px', position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', paddingTop: 20 }}>
            <StakingDashboard />
          </div>
        </div>
      </div>
    </div>
  );
}
