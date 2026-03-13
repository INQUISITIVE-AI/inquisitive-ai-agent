import { http, fallback } from 'viem';
import { WagmiAdapter } from '@reown/appkit-adapter-wagmi';
import { mainnet, polygon, arbitrum, base, optimism } from '@reown/appkit/networks';

// WalletConnect Project ID — register at https://cloud.walletconnect.com
export const WC_PROJECT_ID = 'd9390e89fa6f82be32c7b64211d743d4';

export const appkitNetworks = [mainnet, polygon, arbitrum, base, optimism];

// Explicit fallback transport for Ethereum mainnet — bypasses AppKit's extendCaipNetwork
// which discards custom rpcUrls.default and uses only the Reown RPC for the project ID.
// extendWagmiTransports wraps this with the Reown RPC as additional fallback.
const mainnetTransport = fallback([
  http('https://eth.llamarpc.com'),
  http('https://rpc.ankr.com/eth'),
  http('https://ethereum.publicnode.com'),
  http('https://mainnet.eth.cloudflare.com'),
  http('https://1rpc.io/eth'),
]);

// customRpcUrls feeds into WcHelpersUtil.createNamespaces → rpcMap[chainId].
// Without this, the WalletConnect session rpcMap is set to ONLY the Reown Blockchain
// API URL, so eth_chainId (required before eth_sendTransaction) fails when that
// endpoint is rate-limited/down → UnknownRpcError before any wallet popup appears.
export const wagmiAdapter = new WagmiAdapter({
  ssr: true,
  networks: appkitNetworks,
  projectId: WC_PROJECT_ID,
  transports: {
    [mainnet.id]: mainnetTransport,
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
  vaultAddress: (process.env.NEXT_PUBLIC_VAULT_ADDRESS || '0xaDCFfF8770a162b63693aA84433Ef8B93A35eb52') as `0x${string}`,
  btcAddress:   'bc1q54tccqs2z3gp74pdatfnfucrzxuv2755fq6cfg',
  solAddress:   '7a2WzumijyGTqALmqoDZd3mvyP2aS7R4GjBdBxMUjRPk',
  trxAddress:   'TDSkgbhuMAHChDw6kGCLJmM9v7PPMJgHJA',
  paymentTokens: [
    { symbol: 'ETH',  name: 'Ethereum', decimals: 18 },
    { symbol: 'BTC',  name: 'Bitcoin',  decimals: 8 },
    { symbol: 'SOL',  name: 'Solana',   decimals: 9 },
    { symbol: 'TRX',  name: 'TRON',     decimals: 6 },
    { symbol: 'USDC', name: 'USD Coin', decimals: 6, address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as `0x${string}` },
  ],
};
