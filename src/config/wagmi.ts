import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { mainnet, polygon, arbitrum, base, optimism } from '@reown/appkit/networks';

// WalletConnect Project ID — register at https://cloud.walletconnect.com
export const WC_PROJECT_ID =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'd9390e89fa6f82be32c7b64211d743d4';

export const appkitNetworks = [mainnet, polygon, arbitrum, base, optimism] as const;

export const wagmiAdapter = new WagmiAdapter({
  ssr: true,
  networks: appkitNetworks,
  projectId: WC_PROJECT_ID,
});

export const wagmiConfig = wagmiAdapter.wagmiConfig;

// INQAI Token — ERC-20 asset-backed token on Ethereum mainnet
export const INQAI_TOKEN = {
  name:         'INQUISITIVE',
  symbol:       'INQAI',
  decimals:     18,
  totalSupply:  100_000_000,
  targetPrice:  15,
  presalePrice: 8,
  targetAPY:    0.185,
  targetMCap:   1_500_000_000,
  standard:     'ERC-20',
  address:      '0xB312B6E0842b6D51b15fdB19e62730815C1C7Ce5' as `0x${string}`,
  teamWallet:   '0x4e7d700f7E1c6Eeb5c9426A0297AE0765899E746' as `0x${string}`,
  btcAddress:   'bc1q54tccqs2z3gp74pdatfnfucrzxuv2755fq6cfg',
  solAddress:   '7a2WzumijyGTqALmqoDZd3mvyP2aS7R4GjBdBxMUjRPk',
  paymentTokens: [
    { symbol: 'ETH',  name: 'Ethereum', decimals: 18 },
    { symbol: 'BTC',  name: 'Bitcoin',  decimals: 8 },
    { symbol: 'SOL',  name: 'Solana',   decimals: 9 },
    { symbol: 'USDC', name: 'USD Coin', decimals: 6, address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as `0x${string}` },
  ],
};
