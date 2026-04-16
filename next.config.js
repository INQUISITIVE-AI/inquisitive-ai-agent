/** @type {import('next').NextConfig} */
const ORIGINS = (process.env.CORS_ORIGINS || 'https://getinqai.com,https://www.getinqai.com,https://app.getinqai.com')
  .split(',').map(s => s.trim()).filter(Boolean);

const nextConfig = {
  typescript: { ignoreBuildErrors: false },
  eslint:     { ignoreDuringBuilds: false },
  reactStrictMode: true,
  transpilePackages: [
    '@reown/appkit',
    '@reown/appkit-adapter-wagmi',
    '@reown/appkit-common',
    '@reown/appkit-controllers',
    '@reown/appkit-wallet',
    '@walletconnect/universal-provider',
  ],
  async redirects() {
    return [{ source: '/dashboard', destination: '/analytics', permanent: true }];
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
          { key: 'Access-Control-Allow-Origin', value: ORIGINS[0] || 'https://getinqai.com' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
          { key: 'Vary', value: 'Origin' },
        ],
      },
    ];
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = { ...config.resolve.fallback, fs: false, net: false, tls: false };
    }
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': false,
      'viem/_esm/chains/definitions/zksyncLocalHyperchain': false,
      'viem/_esm/chains/definitions/zksyncLocalHyperchainL1': false,
    };
    return config;
  },
};
module.exports = nextConfig;
