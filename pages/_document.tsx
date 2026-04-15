import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Favicon */}
        <link rel="icon" type="image/svg+xml" href="/inqai-logo.svg" />
        <link rel="icon" type="image/x-icon" href="/inqai-logo.svg" />
        <link rel="shortcut icon" href="/inqai-logo.svg" />
        <link rel="apple-touch-icon" sizes="180x180" href="/inqai-logo.svg" />
        <link rel="mask-icon" href="/inqai-logo.svg" color="#3b82f6" />

        {/* PWA */}
        <link rel="manifest" href="/site.webmanifest" />

        {/* Theme */}
        <meta name="theme-color" content="#0a0a0b" />
        <meta name="msapplication-TileColor" content="#0a0a0b" />

        {/* Fonts — Inter + JetBrains Mono */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />

        {/* Canonical */}
        <link rel="canonical" href="https://getinqai.com" />

        {/* Open Graph */}
        <meta property="og:type"         content="website" />
        <meta property="og:url"          content="https://getinqai.com" />
        <meta property="og:site_name"    content="INQUISITIVE" />
        <meta property="og:title"        content="INQUISITIVE — The First Open, On-Chain AI Fund" />
        <meta property="og:description"  content="Own 66 digital assets through a single ERC-20 token. Five independent AI engines, 11 execution strategies, 0% management fee, fully on-chain." />
        <meta property="og:image"        content="https://getinqai.com/api/og" />
        <meta property="og:image:width"  content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt"    content="INQUISITIVE — The First Open, On-Chain AI Fund" />

        {/* Twitter */}
        <meta name="twitter:card"        content="summary_large_image" />
        <meta name="twitter:title"       content="INQUISITIVE — The First Open, On-Chain AI Fund" />
        <meta name="twitter:description" content="66-asset AI-managed portfolio. 0% management fee. On-chain execution via Chainlink. Self-custody." />
        <meta name="twitter:image"       content="https://getinqai.com/api/og" />
        <meta name="twitter:image:alt"   content="INQUISITIVE — The First Open, On-Chain AI Fund" />

        {/* SEO */}
        <meta name="robots" content="index, follow" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
