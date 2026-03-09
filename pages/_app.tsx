import type { AppProps } from 'next/app';
import { WagmiProvider } from 'wagmi';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { createAppKit } from '@reown/appkit/react';
import { wagmiAdapter, wagmiConfig, WC_PROJECT_ID, appkitNetworks } from '../src/config/wagmi';
import '../styles/globals.css';

// Global AppKit initialization flag
let appKitInitialized = false;

function initializeAppKit() {
  if (typeof window !== 'undefined' && !appKitInitialized) {
    console.log('Initializing AppKit with Project ID:', WC_PROJECT_ID);
    console.log('Available networks:', appkitNetworks.length);
    
    try {
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
        // Force Explorer API usage
        enableExplorer: true,
        featuredWalletIds: [], // Empty to force Explorer API
        customWallets: [], // Empty to force Explorer API
      });
      appKitInitialized = true;
      console.log('AppKit initialized successfully');
    } catch (error) {
      console.error('AppKit initialization failed:', error);
    }
  }
}

// Initialize immediately if window is available
if (typeof window !== 'undefined') {
  initializeAppKit();
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
