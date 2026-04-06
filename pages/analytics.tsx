import { useState } from 'react';
import Head from 'next/head';
import dynamic from 'next/dynamic';

const WalletButton = dynamic(() => import('../src/components/WalletButton'), { ssr: false });

export default function AnalyticsPage() {
  return (
    <div>
      <Head>
        <title>Analytics | INQUISITIVE</title>
        <meta name="description" content="INQAI AI-managed portfolio - 66 assets" />
      </Head>
      <div style={{ minHeight: '100vh', background: '#07071a', color: '#fff' }}>
        <h1>Analytics Page - Under Maintenance</h1>
        <WalletButton />
      </div>
    </div>
  );
}
