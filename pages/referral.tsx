import Head from 'next/head';
import dynamic from 'next/dynamic';
import SiteNav from '../src/components/SiteNav';

const ReferralTracker = dynamic(() => import('../src/components/ReferralTracker'), { ssr: false });

export default function ReferralPage() {
  return (
    <div>
      <Head>
        <title>Referral Program | INQUISITIVE</title>
        <meta name="description" content="Earn 5% commission on every referral + 5% bonus for the person you refer. Share your link and earn INQAI tokens." />
      </Head>
      <div style={{ minHeight: '100vh', background: '#0a0a0b', color: '#f4f4f5', fontFamily: 'Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
        <div className="mesh-bg" />

        {/* Nav */}
        <SiteNav />

        {/* Page header */}
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '20px 28px', position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.3px' }}>Referral Program</h1>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Share your link · 5% for you · 5% for them · Paid on-chain automatically</span>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '1px 28px 60px', position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', paddingTop: 20 }}>
            <ReferralTracker />
          </div>
        </div>
      </div>
    </div>
  );
}
