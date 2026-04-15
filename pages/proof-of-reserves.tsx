import Head from 'next/head';
import dynamic from 'next/dynamic';
import SiteNav from '../src/components/SiteNav';

const ProofOfReserves = dynamic(() => import('../src/components/ProofOfReserves'), { ssr: false });

export default function ProofOfReservesPage() {
  return (
    <div>
      <Head>
        <title>Proof of Reserves | INQUISITIVE</title>
        <meta name="description" content="Verify INQAI token backing in real-time. Every token is backed by the 66-asset AI-managed portfolio vault. Full on-chain transparency." />
      </Head>
      <div style={{ minHeight: '100vh', background: '#0a0a0b', color: '#f4f4f5', fontFamily: 'Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif' }}>
        <div className="mesh-bg" />

        {/* Nav */}
        <SiteNav />

        {/* Page header */}
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', padding: '20px 28px', position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <h1 style={{ fontSize: 22, fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.3px' }}>Proof of Reserves</h1>
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>100% asset-backed · Live on-chain verification · No fractional reserves</span>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: '1px 28px 60px', position: 'relative', zIndex: 1 }}>
          <div style={{ maxWidth: 1280, margin: '0 auto', paddingTop: 20 }}>
            <ProofOfReserves />
          </div>
        </div>
      </div>
    </div>
  );
}
