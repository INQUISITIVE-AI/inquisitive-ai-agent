import type { AppProps } from 'next/app';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createAppKit } from '@reown/appkit/react';
import { wagmiAdapter, wagmiConfig, WC_PROJECT_ID, appkitNetworks } from '../src/config/wagmi';
import type { AppKitNetwork } from '@reown/appkit/networks';
import '../styles/globals.css';

if (typeof window !== 'undefined') {
  createAppKit({
    adapters:       [wagmiAdapter],
    projectId:      WC_PROJECT_ID,
    networks:       appkitNetworks as unknown as [AppKitNetwork, ...AppKitNetwork[]],
    defaultNetwork: appkitNetworks[0],
    allWallets:     'SHOW',
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
    // Ensure WalletConnect session uses reliable RPC URLs
    customRpcUrls: {
      'eip155:1': [
        { url: 'https://eth.llamarpc.com' },
        { url: 'https://rpc.ankr.com/eth' },
        { url: 'https://ethereum.publicnode.com' },
        { url: 'https://mainnet.eth.cloudflare.com' },
      ],
    },
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
