import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Viewport for mobile */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        
        {/* Favicon — all browsers */}
        <link rel="icon" type="image/svg+xml" href="/inqai-logo.svg" />
        <link rel="icon" type="image/x-icon" href="/inqai-logo.svg" />
        <link rel="shortcut icon" href="/inqai-logo.svg" />
        <link rel="apple-touch-icon" sizes="180x180" href="/inqai-logo.svg" />
        <link rel="mask-icon" href="/inqai-logo.svg" color="#7C3AED" />
        
        {/* PWA Manifest */}
        <link rel="manifest" href="/site.webmanifest" />
        
        {/* Theme Color */}
        <meta name="theme-color" content="#0A041C" />
        <meta name="msapplication-TileColor" content="#0A041C" />
        
        {/* Inter font — institutional-grade typography */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />

        {/* Canonical URL */}
        <link rel="canonical" href="https://getinqai.com" />
        
        {/* Open Graph */}
        <meta property="og:type"        content="website" />
        <meta property="og:url"         content="https://getinqai.com" />
        <meta property="og:site_name"   content="INQUISITIVE" />
        <meta property="og:title"       content="INQUISITIVE | AI-Managed 66-Asset Crypto Portfolio" />
        <meta property="og:description" content="Proportional ownership in 66 professionally managed digital assets. $8/INQAI presale. 18.5% target APY. AI executes autonomously on-chain via Chainlink Automation. Self-custody." />
        <meta property="og:image"       content="https://getinqai.com/api/og" />
        <meta property="og:image:width"  content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt"    content="INQUISITIVE — AI-Managed Crypto Portfolio" />

        {/* Twitter / X Card */}
        <meta name="twitter:card"        content="summary_large_image" />
        <meta name="twitter:title"       content="INQUISITIVE | AI-Managed Crypto Portfolio" />
        <meta name="twitter:description" content="66-asset AI-managed portfolio. $8/INQAI presale. 18.5% APY. On-chain execution via Chainlink. Self-custody." />
        <meta name="twitter:image"       content="https://getinqai.com/api/og" />
        <meta name="twitter:image:alt"   content="INQUISITIVE — AI-Managed Crypto Portfolio" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
