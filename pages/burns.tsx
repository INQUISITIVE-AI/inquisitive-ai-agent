import Head from 'next/head';
import dynamic from 'next/dynamic';
import SiteNav from '../src/components/SiteNav';

const BuybackBurnTracker = dynamic(() => import('../src/components/BuybackBurnTracker'), { ssr: false });

export default function BurnsPage() {
  return (
    <div>
      <Head>
        <title>Buyback & Burn | INQUISITIVE</title>
        <meta name="description" content="Track INQAI token buybacks and burns in real-time. 60% of performance fees fund open-market buybacks. 20% permanently burned. 15% to treasury. 5% auto-funds Chainlink Automation." />
      </Head>
      <div style={{ minHeight: '100vh', background: '#0a0a0b', color: '#f4f4f5', fontFamily: 'Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
        <div className="mesh-bg" />

        {/* Nav */}
        <SiteNav />

        {/* Page header */}
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '20px 28px', position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.3px' }}>Buyback & Burn</h1>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>Live on-chain token supply · 60% buybacks · 20% permanently burned · 15% treasury · 5% Chainlink</span>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '1px 28px 60px', position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', paddingTop: 20 }}>
            <BuybackBurnTracker />
          </div>
        </div>
      </div>
    </div>
  );
}
