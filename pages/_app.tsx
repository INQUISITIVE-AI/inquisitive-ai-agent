import type { AppProps } from 'next/app';
import { useEffect } from 'react';
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
      description: 'The first open, on-chain AI fund',
      url:         'https://getinqai.com',
      icons:       ['https://getinqai.com/inqai-logo.svg'],
    },
    features: {
      analytics: false,
      email:     false,
      socials:   false,
      onramp:    false,
      swaps:     false,
    },
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

// Scroll-reveal — the only animation pattern we keep
function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.12 }
    );
    const elements = document.querySelectorAll('.fade-up');
    elements.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  });
}

function ScrollRevealProvider({ children }: { children: React.ReactNode }) {
  useScrollReveal();
  return <>{children}</>;
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <ScrollRevealProvider>
          <Component {...pageProps} />
        </ScrollRevealProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
