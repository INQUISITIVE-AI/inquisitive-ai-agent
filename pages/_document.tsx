import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="icon" type="image/svg+xml" href="/inqai-logo.svg" />
        <link rel="shortcut icon" href="/inqai-logo.svg" />
        <meta name="theme-color" content="#0A041C" />
        <meta property="og:image" content="https://getinqai.com/inqai-logo.svg" />
        <meta name="twitter:image" content="https://getinqai.com/inqai-logo.svg" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
