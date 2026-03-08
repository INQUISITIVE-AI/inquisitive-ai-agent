import type { AppProps } from 'next/app';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createAppKit } from '@reown/appkit/react';
import { wagmiAdapter, wagmiConfig, WC_PROJECT_ID, appkitNetworks } from '../src/config/wagmi';
import '../styles/globals.css';

if (typeof window !== 'undefined') {
  createAppKit({
    adapters:       [wagmiAdapter],
    projectId:      WC_PROJECT_ID,
    networks:       appkitNetworks,
    defaultNetwork: appkitNetworks[0],
    metadata: {
      name:        'INQUISITIVE',
      description: 'AI-powered cryptocurrency portfolio platform',
      url:         'https://getinqai.com',
      icons:       ['https://getinqai.com/logo.png'],
    },
    features: {
      analytics: false,
      email:     false,
      socials:   false,
      onramp:    false,
      swaps:     false,
    },
    featuredWalletIds: [
      'c57ca95b47569778a828d19178114f4db188b89b4b5460b7d807d2e3b54a2e6f',
      '4622a2b2d6af1c9844944291e5e7351a6aa24cd7b23099efac1b2fd875da31a0',
      '1ae92b26df02f0abca6304df07debccd18262fdf5fe82daa81593582dac9a369',
      'fd20dc426fb37566d803205b19bbc1d4096b248ac04548e3cfb6b3a38bd033aa',
      '19177a98252e07ddfc9af2083ba8e07ef627cb6103467ffebb3f8f4205fd7927',
      'ecc4036f814562b41a5268adc86270fba1365471402006302e70169465b7ac18',
      'e9ff15be73584489ca4a66f4d7c1d2a147f3f34e7b17ab5b5b7f36cf54a39dd7',
      '225affb176778569276e484e1b92637ad061b01e13a048a35f06b60a9e0955bc',
    ],
    customWallets: [
      {
        id:           'metamask',
        name:         'MetaMask',
        homepage:     'https://metamask.io',
        image_url:    'https://metamask.io/images/metamask-logo.png',
        mobile_link:  'metamask://',
        desktop_link: 'https://metamask.io/download/',
      },
      {
        id:           'trust',
        name:         'Trust Wallet',
        homepage:     'https://trustwallet.com',
        image_url:    'https://trustwallet.com/assets/images/media/assets/TWT.png',
        mobile_link:  'trust://',
        app_store:    'https://apps.apple.com/app/trust-crypto-bitcoin-wallet/id1288339409',
        play_store:   'https://play.google.com/store/apps/details?id=com.wallet.crypto.trustapp',
      },
      {
        id:           'rainbow',
        name:         'Rainbow',
        homepage:     'https://rainbow.me',
        image_url:    'https://rainbow.me/favicon.ico',
        mobile_link:  'rainbow://',
        app_store:    'https://apps.apple.com/app/rainbow-ethereum-wallet/id1457119021',
        play_store:   'https://play.google.com/store/apps/details?id=me.rainbow',
      },
      {
        id:           'coinbase',
        name:         'Coinbase Wallet',
        homepage:     'https://www.coinbase.com/wallet',
        image_url:    'https://www.coinbase.com/img/favicon/apple-touch-icon.png',
        mobile_link:  'cbwallet://',
        webapp_link:  'https://keys.coinbase.com',
        app_store:    'https://apps.apple.com/app/coinbase-wallet-store-crypto/id1278383455',
        play_store:   'https://play.google.com/store/apps/details?id=org.toshi',
      },
      {
        id:           'ledger',
        name:         'Ledger Live',
        homepage:     'https://www.ledger.com/ledger-live',
        image_url:    'https://www.ledger.com/favicon.ico',
        mobile_link:  'ledgerlive://',
        desktop_link: 'ledgerlive://',
        app_store:    'https://apps.apple.com/app/ledger-live-web3-wallet/id1361671700',
        play_store:   'https://play.google.com/store/apps/details?id=com.ledger.live',
      },
      {
        id:           'exodus',
        name:         'Exodus',
        homepage:     'https://www.exodus.com',
        image_url:    'https://www.exodus.com/favicon.ico',
        mobile_link:  'exodus://',
        app_store:    'https://apps.apple.com/app/exodus-crypto-bitcoin-wallet/id1414384820',
        play_store:   'https://play.google.com/store/apps/details?id=exodusmovement.exodus',
      },
    ],
  });
}

const queryClient = new QueryClient();

export default function App({ Component, pageProps }: AppProps) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <Component {...pageProps} />
      </QueryClientProvider>
    </WagmiProvider>
  );
}
